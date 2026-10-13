#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 3 ]; then
  echo "usage: $0 <input-bom.csv> <schematic.kicad_sch> <output-bom.csv>" >&2
  exit 1
fi

input_bom="$1"
schematic="$2"
output_bom="$3"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

python3 "$script_dir/format-bom.py" \
  --allow-missing-lcsc \
  --schematic "$schematic" \
  "$input_bom" \
  "$output_bom"
