import sys
from pathlib import Path

import pcbnew


if len(sys.argv) != 2:
    raise SystemExit("usage: verify.py BOARD")

repo_root = Path(__file__).resolve().parents[2]
orig_path = repo_root / "pcb/designs/crimpdeq-v2/crimpdeq.kicad_pcb"
test_path = Path(sys.argv[1])

def pad_map(path):
    b = pcbnew.LoadBoard(str(path))
    m = {}
    physical_count = 0
    conflicts = []
    for f in b.GetFootprints():
        ref = f.GetReference()
        for p in f.Pads():
            physical_count += 1
            key = (ref, p.GetPadName())
            net_name = p.GetNetname()
            if key in m and m[key] != net_name:
                conflicts.append((key, m[key], net_name))
            m[key] = net_name
    return m, b, physical_count, conflicts

om, ob, orig_physical, orig_conflicts = pad_map(orig_path)
tm, tb, test_physical, test_conflicts = pad_map(test_path)

missing = [k for k in om if k not in tm]
extra = [k for k in tm if k not in om]
changed = [(k, om[k], tm[k]) for k in om if k in tm and om[k] != tm[k]]

print(f"orig pads: {len(om)}  test pads: {len(tm)}")
print(f"orig physical pads: {orig_physical}  test physical pads: {test_physical}")
print(f"missing: {len(missing)}  extra: {len(extra)}  changed nets: {len(changed)}")
for k in missing[:10]: print("  MISSING", k)
for k in extra[:10]: print("  EXTRA", k)
for c in changed[:20]: print("  CHANGED", c)

front = sum(1 for f in tb.GetFootprints() if f.GetLayer()==pcbnew.F_Cu)
back = sum(1 for f in tb.GetFootprints() if f.GetLayer()==pcbnew.B_Cu)
print(f"footprints: {front+back} total, front={front}, back={back}")

failed = bool(
    missing
    or extra
    or changed
    or orig_conflicts
    or test_conflicts
    or len(list(ob.GetFootprints())) != len(list(tb.GetFootprints()))
    or orig_physical != test_physical
)
if failed:
    if orig_conflicts:
        print("baseline conflicting duplicate pad identities:", orig_conflicts[:5])
    if test_conflicts:
        print("test conflicting duplicate pad identities:", test_conflicts[:5])
    raise SystemExit(1)
