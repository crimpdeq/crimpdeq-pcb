# Compare the current netlist against the reviewed baseline (scripts/netlist.expected.json).
# Guards against silent connectivity loss (e.g. schPinArrangement dropping connector pins).
# Usage: python3 scripts/netlist.py [--update]
import json, os, re, subprocess, sys

BASELINE = "scripts/netlist.expected.json"
env = dict(os.environ, PATH=f"{os.getcwd()}/node_modules/.bin:{os.environ['PATH']}")
out = subprocess.run(["tsci", "check", "netlist", "index.circuit.tsx"],
                     capture_output=True, text=True, env=env).stdout

nets, current = {}, None
for line in out.splitlines():
    m = re.match(r"NET: (\S+)", line)
    if m:
        current = m.group(1)
        nets[current] = []
    elif current and line.startswith("  - "):
        nets[current].append(" ".join(line.split()[1:3]))
nets = {k: sorted(v) for k, v in sorted(nets.items())}

if "--update" in sys.argv:
    json.dump(nets, open(BASELINE, "w"), indent=1)
    print(f"baseline updated: {len(nets)} nets")
    sys.exit(0)

expected = json.load(open(BASELINE))
diff = False
for name in sorted(set(expected) | set(nets)):
    a, b = set(expected.get(name, [])), set(nets.get(name, []))
    if a != b:
        diff = True
        print(f"{name}: missing {sorted(a - b)} extra {sorted(b - a)}")
print("netlist matches baseline" if not diff else "NETLIST CHANGED")
sys.exit(1 if diff else 0)
