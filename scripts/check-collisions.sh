#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

scad_file="$repo_root/case/collision_check.scad"

if [[ ! -f "$scad_file" ]]; then
    echo "Missing collision check file: $scad_file" >&2
    exit 1
fi

if ! command -v openscad >/dev/null 2>&1; then
    echo "openscad not found in PATH" >&2
    exit 1
fi

openscad_cmd=(openscad)
if [[ -z "${DISPLAY:-}" ]] && command -v xvfb-run >/dev/null 2>&1; then
    openscad_cmd=(xvfb-run -a openscad)
fi

check_mode() {
    local mode="$1"
    local expected="$2"
    local log_file="$tmp_dir/${mode}.log"
    local out_file="$tmp_dir/${mode}.stl"
    local result

    if "${openscad_cmd[@]}" -D "mode=\"${mode}\"" -o "$out_file" "$scad_file" >"$log_file" 2>&1; then
        result="nonempty"
    else
        if grep -q "Current top level object is empty" "$log_file"; then
            result="empty"
        else
            echo "openscad error for mode=$mode" >&2
            tail -n 50 "$log_file" >&2 || true
            exit 1
        fi
    fi

    printf '%-28s %s (expected %s)\n' "$mode" "$result" "$expected"
    if [[ "$result" != "$expected" ]]; then
        echo "Collision check failed for mode=$mode" >&2
        exit 1
    fi
}

echo "Running collision matrix with: ${openscad_cmd[*]}"

# Pairwise checks
check_mode main_lid nonempty
check_mode main_loadcell nonempty
check_mode main_battery empty
check_mode main_pcb nonempty
check_mode main_switch empty
check_mode lid_loadcell empty
check_mode lid_battery empty
check_mode lid_pcb empty
check_mode lid_switch empty
check_mode loadcell_battery empty
check_mode loadcell_pcb empty
check_mode loadcell_switch empty
check_mode battery_pcb empty
check_mode battery_switch empty
check_mode pcb_switch empty

# Epsilon probes to verify "nonempty" cases above are contact-only
check_mode main_lid_eps_up empty
check_mode main_loadcell_eps_z_plus empty
check_mode main_pcb_eps_y_plus nonempty
check_mode main_pcb_eps_yz_plus empty
check_mode battery_pcb_eps_z_plus empty

# Aggregate checks
check_mode main_components nonempty
check_mode lid_components empty

echo "Collision checks passed."
