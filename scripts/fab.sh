#!/bin/bash
# Build the PCBWay order package from dist/index/circuit.json into dist/fab/:
#   pcbway_gerbers.zip (Gerbers + drills), pcbway_bom.csv, pcbway_centroid.csv,
#   assembly-top.svg / assembly-bottom.svg (bottom mirrored, viewed from the bottom)
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$PWD/node_modules/.bin:$PATH"
out="$PWD/dist/fab"
# Stage outside the project: `tsci dev` watches it and crashes on files that vanish
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$out" "$tmp/gerbers" "$tmp/fab"

# Solder paste and floating GND pour fixes (scripts/fab-json.ts); the exporter
# only takes a file named circuit.json
bun scripts/fab-json.ts dist/index/circuit.json "$tmp/fab/circuit.json"
# The exporter's pick-and-place rotation notes refer to the JLCPCB parts database; unused here
tsci export "$tmp/fab/circuit.json" -f gerbers -o "$tmp/tscircuit.zip" 2>&1 |
  grep -v "jlcpcb pick-and-place rotation\|^Exported to" || true
unzip -q "$tmp/tscircuit.zip" -d "$tmp/gerbers"
# The Fab layers are assembly outlines (the assembly drawings carry them), not fab data
rm -f "$tmp/gerbers/bom.csv" "$tmp/gerbers/pick_and_place.csv" "$tmp/gerbers/F_Fab.gbr" "$tmp/gerbers/B_Fab.gbr"
# Some CAM tools and viewers ignore %LR (load rotation); fab-json.ts unrotates the pads
if grep -l '%LR' "$tmp/gerbers"/*.gbr; then
  echo "fab: the Gerbers above use %LR load rotation" >&2
  exit 1
fi
# Name the drill files by plating, as KiCad does
mv "$tmp/gerbers/drill-L1-L4.drl" "$tmp/gerbers/drill-PTH.drl"
mv "$tmp/gerbers/drill_npth.drl" "$tmp/gerbers/drill-NPTH.drl"
# A standard 4-layer order has through holes only (scripts/patch-core.mjs)
if ls "$tmp/gerbers"/drill-L*.drl 2>/dev/null; then
  echo "fab: blind/buried via drill files above; every via must be a through via" >&2
  exit 1
fi
# The exporter writes each slot (J2's shell legs) as its start hit on one line and
# `G85` plus its end on the next; GerbView reads that as one route through the
# following holes. Join them into the standard one-line `X..Y..G85X..Y..` slot.
for f in "$tmp/gerbers"/drill-*.drl; do
  awk 'prev != "" { if (/^G85/) { print prev $0; prev = ""; next } print prev; prev = "" }
       /^X[-0-9.]+Y[-0-9.]+$/ { prev = $0; next } { print }
       END { if (prev != "") print prev }' "$f" > "$f.tmp"
  mv "$f.tmp" "$f"
done
if grep -n '^G85' "$tmp/gerbers"/drill-*.drl; then
  echo "fab: slots above have no start point on their line" >&2
  exit 1
fi
(cd "$tmp/gerbers" && zip -q "$tmp/pcbway_gerbers.zip" ./*)
mv "$tmp/pcbway_gerbers.zip" "$out/pcbway_gerbers.zip"

python3 scripts/pcbway.py
bun scripts/assembly.ts dist/index/circuit.json "$out" > /dev/null
ls -1 "$out"
