#!/bin/bash
# Regenerate 4-layer Option B noroute board + DSN with In1 reserved + keepouts
set -euo pipefail
# Override PY with the KiCad-bundled Python interpreter for your OS if it differs.
PY="${PY:-/Applications/KiCad/KiCad.app/Contents/Frameworks/Python.framework/Versions/3.9/bin/python3}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
if [ "$#" -lt 1 ] || [ "$#" -gt 2 ]; then
  echo "usage: $0 BASELINE_BOARD [WORKDIR]" >&2
  exit 2
fi
BASELINE="$1"
WORKDIR="${2:-/tmp/pcbwork}"
mkdir -p "$WORKDIR"
cd "$REPO_ROOT"
"$PY" "$SCRIPT_DIR/place_4l.py" \
  "$BASELINE" \
  "$SCRIPT_DIR/moves_B.json" \
  "$WORKDIR/optB4_noroute.kicad_pcb" \
  "$WORKDIR/optB4.dsn" 0.2 2>/dev/null
WORKDIR="$WORKDIR" "$PY" - << 'EOF'
import os
import re
from pathlib import Path

p = Path(os.environ["WORKDIR"]) / "optB4.dsn"
s = p.read_text()
# reserve In1 as GND plane (no signal routing)
s, layer_changes = re.subn(r"(\(layer In1\.Cu\s*\(type )signal(\))", r"\1power\2", s)
if layer_changes != 1:
    raise SystemExit(f"expected one In1.Cu declaration, changed {layer_changes}")
def poly(kind,layer,x0,y0,x1,y1):
    pts=f"{x0} {y0}  {x1} {y0}  {x1} {y1}  {x0} {y1}  {x0} {y0}"
    return f'      ({kind} "" (polygon {layer} 0  {pts}))\n'
ins=""
# antenna keepout (no copper/track/via) all layers
for L in ["F.Cu","In1.Cu","In2.Cu","B.Cu"]:
    ins+=poly("keepout",L,134800,-46400,148700,-53400)
# tight analog via-keepout under HX711 INA+/INA- region (keep L2 GND solid; no vias)
for L in ["F.Cu","In1.Cu","In2.Cu","B.Cu"]:
    ins+=poly("via_keepout",L,136000,-68500,141000,-73500)
marker = '    (via "Via'
if s.count(marker) != 1:
    raise SystemExit(f"expected one DSN via marker, found {s.count(marker)}")
i=s.index(marker); s=s[:i]+ins+s[i:]
p.write_text(s)
print("DSN prepared: In1 reserved, antenna keepout + tight analog via-keepout injected")
EOF
grep -cE "keepout" "$WORKDIR/optB4.dsn" | xargs echo "keepout lines:"
