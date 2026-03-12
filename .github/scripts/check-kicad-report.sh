#!/usr/bin/env bash
set -euo pipefail

report_path=${1:?usage: check-kicad-report.sh <report-path> [label]}
label=${2:-KiCad check}

if [[ ! -f "$report_path" ]]; then
  echo "::error title=${label} report missing::Expected report at '$report_path', but it was not created."
  exit 1
fi

if grep -Eq '^[[:space:]]*[^[:space:]].*; error$' "$report_path" || grep -Eq '^[[:space:]]*; error$' "$report_path"; then
  echo "::error title=${label} failed::Found error-level violations in '$report_path'."
  echo "--- ${label} report preview ---"
  sed -n '1,120p' "$report_path"
  exit 1
fi

if grep -Eq '^[[:space:]]*[^[:space:]].*; warning$' "$report_path" || grep -Eq '^[[:space:]]*; warning$' "$report_path"; then
  echo "${label}: warning-level violations present, but no error-level violations were found."
else
  echo "${label}: no violations found."
fi
