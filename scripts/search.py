# Re-roll autorouting until the board routes clean.
#
# Builds variants of index.circuit.tsx, each with one passive nudged by 0.05 mm,
# in a scratch directory outside the project (so `tsci dev` never sees them).
# Each round starts from the best variant so far and nudges the passives nearest
# its remaining DRC errors and shorts; once every single nudge of the best has
# been tried, it nudges random pairs. Stops at the first variant with a clean
# DRC, no shorts and a clean placement check.
#
# Usage: python3 scripts/search.py [--adopt] [--jobs 8] [--rounds 4] [--timeout 300] [--seed 0]
#   --adopt  copy the clean variant into index.circuit.tsx
import argparse, hashlib, json, math, os, random, re, shutil, subprocess, sys, tempfile, threading, time
from concurrent.futures import ThreadPoolExecutor, as_completed

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BIN = os.path.join(ROOT, "node_modules", ".bin")
ENV = dict(os.environ, PATH=f"{BIN}:{os.environ['PATH']}")
STEP = 0.05
MOVABLE = re.compile(r"^[RC]\d+$")

ap = argparse.ArgumentParser()
ap.add_argument("--adopt", action="store_true")
ap.add_argument("--jobs", type=int, default=8)
ap.add_argument("--rounds", type=int, default=4)
ap.add_argument("--timeout", type=int, default=300, help="seconds per build before it is killed")
ap.add_argument("--keep", action="store_true", help="keep the scratch directory")
ap.add_argument("--seed", type=int, default=0, help="seed for the random nudges (retry a stuck search)")
ap.add_argument("--base", default=os.path.join(ROOT, "index.circuit.tsx"), help="design to start from")
args = ap.parse_args()

scratch = tempfile.mkdtemp(prefix="crimpdeq-search-")
os.symlink(os.path.join(ROOT, "node_modules"), os.path.join(scratch, "node_modules"))
for d in ("imports", "lib", "scripts"):
    shutil.copytree(os.path.join(ROOT, d), os.path.join(scratch, d))
for f in ("package.json", "tsconfig.json", "tscircuit.config.json"):
    shutil.copy(os.path.join(ROOT, f), scratch)

stop = threading.Event()
running = set()
lock = threading.Lock()


def run(cmd, timeout):
    """Run in the scratch dir; SIGKILL on timeout or when the search stops."""
    p = subprocess.Popen(cmd, cwd=scratch, env=ENV, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    with lock:
        running.add(p)
    try:
        out, _ = p.communicate(timeout=timeout)
        return p.returncode, out
    except subprocess.TimeoutExpired:
        p.kill()
        p.communicate()
        return None, ""
    finally:
        with lock:
            running.discard(p)


def nudge(source, ref, dx, dy):
    m = re.search(r'name="%s"\n(.*?)\n\s+/>' % ref, source, re.S)
    body = m.group(1)
    body = re.sub(r"pcbX=\{(-?[\d.]+)\}", lambda k: f"pcbX={{{round(float(k.group(1)) + dx, 3)}}}", body, count=1)
    body = re.sub(r"pcbY=\{(-?[\d.]+)\}", lambda k: f"pcbY={{{round(float(k.group(1)) + dy, 3)}}}", body, count=1)
    return source[: m.start(1)] + body + source[m.end(1):]


def evaluate(name, source):
    """Build one variant and return its score, error locations and part positions."""
    if stop.is_set():
        return None
    with open(os.path.join(scratch, f"{name}.circuit.tsx"), "w") as f:
        f.write(source)
    t0 = time.time()
    code, out = run(["tsci", "build", f"{name}.circuit.tsx", "--ignore-warnings",
                     "--autorouter-timeout", f"{args.timeout}s"], args.timeout + 60)
    cj_path = os.path.join(scratch, "dist", name, "circuit.json")
    result = {"name": name, "source": source, "seconds": round(time.time() - t0)}
    if stop.is_set():
        return None
    if code is None or not os.path.exists(cj_path):
        return {**result, "score": math.inf, "summary": "build failed or timed out", "points": []}
    # An unrouted board has fewer DRC errors than a routed one: never prefer it
    if "Autorouting was skipped" in out or re.search(r"phase \d+/\d+ error after", out):
        return {**result, "score": math.inf, "summary": "not routed (placement error or router failure)", "points": []}
    _, drc_out = run(["bun", "scripts/drc.ts", "--json", cj_path], 120)
    try:
        drc = json.loads(drc_out.strip().splitlines()[-1])
    except (ValueError, IndexError):
        drc = {"errors": [{"center": None}] * 999, "crashed": ["drc.ts"]}
    _, shorts_out = run(["tsci", "check", "shorts", cj_path], 120)
    shorts = [(float(x), float(y)) for x, y in re.findall(r"short at x=(-?[\d.]+)mm y=(-?[\d.]+)mm", shorts_out)]
    # checkCopperPourShorts sometimes crashes; the gerber shorts check covers it
    crashed = [c for c in drc["crashed"] if c != "checkCopperPourShorts"]
    points = [(e["center"]["x"], e["center"]["y"]) for e in drc["errors"] if e.get("center")] + shorts
    cj = json.load(open(cj_path))
    names = {e["source_component_id"]: e["name"] for e in cj if e["type"] == "source_component"}
    parts = {names[e["source_component_id"]]: (e["center"]["x"], e["center"]["y"])
             for e in cj if e["type"] == "pcb_component" and e["source_component_id"] in names}
    errors = len(drc["errors"]) + 10 * len(crashed)
    return {**result, "score": errors + 3 * len(shorts), "points": points, "parts": parts,
            "summary": f"{len(drc['errors'])} DRC errors, {len(shorts)} shorts" + (f", crashed {crashed}" if crashed else "")}


def placement_ok(name):
    code, out = run(["tsci", "check", "placement", f"{name}.circuit.tsx"], 300)
    return code == 0 and "Errors: 0" in out


def parts_from_source(source):
    parts = {}
    for m in re.finditer(r'name="([RC]\d+)"\n(.*?)\n\s+/>', source, re.S):
        x = re.search(r"pcbX=\{(-?[\d.]+)\}", m.group(2))
        y = re.search(r"pcbY=\{(-?[\d.]+)\}", m.group(2))
        if x and y:
            parts[m.group(1)] = (float(x.group(1)), float(y.group(1)))
    return parts


def label(n, dx, dy):
    return f"{n}{'+' if dx + dy > 0 else '-'}{'x' if dx else 'y'}"


def candidates(best, tried, count, rng):
    """Nudges of passives nearest the best variant's errors, then random ones,
    then random pairs once every single nudge of the best has been tried."""
    parts = best.get("parts") or parts_from_source(best["source"])
    parts = {n: p for n, p in parts.items() if MOVABLE.match(n)}
    ranked = []
    for x, y in best.get("points", []):
        ranked += sorted(parts, key=lambda n: math.hypot(parts[n][0] - x, parts[n][1] - y))[:3]
    ranked = list(dict.fromkeys(ranked))
    moves = [(n, dx, dy) for n in ranked for dx, dy in ((STEP, 0), (-STEP, 0), (0, STEP), (0, -STEP))]
    pool = [(n, dx, dy) for n in sorted(parts) for dx, dy in ((STEP, 0), (-STEP, 0), (0, STEP), (0, -STEP))]
    rng.shuffle(pool)
    out = []
    for n, dx, dy in moves + pool:
        src = nudge(best["source"], n, dx, dy)
        h = hashlib.md5(src.encode()).hexdigest()
        if h not in tried:
            tried.add(h)
            out.append((label(n, dx, dy), src))
        if len(out) == count:
            break
    for _ in range(1000 * count):
        if len(out) == count:
            break
        (n1, dx1, dy1), (n2, dx2, dy2) = rng.sample(pool, 2)
        if n1 == n2:
            continue
        src = nudge(nudge(best["source"], n1, dx1, dy1), n2, dx2, dy2)
        h = hashlib.md5(src.encode()).hexdigest()
        if h not in tried:
            tried.add(h)
            out.append((f"{label(n1, dx1, dy1)}_{label(n2, dx2, dy2)}", src))
    return out


def main():
    rng = random.Random(args.seed)
    base_src = open(args.base).read()
    tried = {hashlib.md5(base_src.encode()).hexdigest()}
    best = {"name": "base", "source": base_src, "score": math.inf, "points": [], "parts": {}}
    batch = [("base", base_src)]
    clean = None
    for rnd in range(1, args.rounds + 1):
        batch += candidates(best, tried, args.jobs - len(batch), rng)
        print(f"round {rnd}: {len(batch)} variants from {best['name']}", flush=True)
        with ThreadPoolExecutor(args.jobs) as pool:
            futures = [pool.submit(evaluate, f"r{rnd}_{label}", src) for label, src in batch]
            for fut in as_completed(futures):
                r = fut.result()
                if r is None:
                    continue
                print(f"  {r['name']:<22} {r['summary']} ({r['seconds']}s)", flush=True)
                if r["score"] < best["score"]:
                    best = r
                if r["score"] == 0 and clean is None and placement_ok(r["name"]):
                    clean = r
                    stop.set()
                    with lock:
                        for p in list(running):
                            p.kill()
        if clean:
            break
        batch = []
    return clean, best


try:
    clean, best = main()
    if not clean:
        print(f"no clean variant; best was {best['name']}: {best.get('summary')}")
        sys.exit(1)
    print(f"clean variant: {clean['name']}")
    if args.adopt:
        with open(os.path.join(ROOT, "index.circuit.tsx"), "w") as f:
            f.write(clean["source"])
        print("adopted into index.circuit.tsx; next: npm run verify, then python3 scripts/routing.py --update")
    else:
        kept = os.path.join(tempfile.gettempdir(), "crimpdeq-clean.circuit.tsx")
        shutil.copy(os.path.join(scratch, f"{clean['name']}.circuit.tsx"), kept)
        print(f"saved to {kept}; rerun with --adopt or copy it over index.circuit.tsx")
finally:
    if not args.keep:
        shutil.rmtree(scratch, ignore_errors=True)
