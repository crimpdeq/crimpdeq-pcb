#!/usr/bin/env python3
"""Run the same KiCad and design-invariant checks for PRs and releases."""

import argparse
from collections import Counter
import json
from pathlib import Path
import subprocess
import sys


ROOT = Path(__file__).resolve().parents[2]
DESIGN = ROOT / "pcb" / "crimpdeq"


def report_counts(path, kind, source):
    """Reject missing/incomplete reports before interpreting their severities."""
    report = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(report, dict):
        raise ValueError("report must be a JSON object")
    if report.get("$schema") != f"https://schemas.kicad.org/{kind}.v1.json":
        raise ValueError(f"expected a KiCad {kind.upper()} v1 report")
    if report.get("source") != source.name:
        raise ValueError(f"report does not describe {source.name}")
    severities = report.get("included_severities")
    if not isinstance(severities, list) or "error" not in severities:
        raise ValueError("report did not include error-level checks")

    def violation_list(container, key):
        values = container.get(key) if isinstance(container, dict) else None
        if not isinstance(values, list):
            raise ValueError(f"missing or invalid {key} list")
        return values

    if kind == "erc":
        sheets = violation_list(report, "sheets")
        if not sheets:
            raise ValueError("ERC report contains no sheets")
        violations = [v for sheet in sheets for v in violation_list(sheet, "violations")]
    else:
        violations = [
            v
            for key in ("violations", "unconnected_items", "schematic_parity")
            for v in violation_list(report, key)
        ]

    counts = Counter()
    for violation in violations:
        severity = violation.get("severity") if isinstance(violation, dict) else None
        if not isinstance(severity, str) or severity not in {"error", "warning"}:
            raise ValueError("missing or invalid violation severity")
        counts[severity] += 1
    return counts


def run_logged(command, log):
    try:
        result = subprocess.run(
            command, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            text=True, errors="replace", check=False,
        )
        output, status = result.stdout, result.returncode
    except OSError as error:
        output, status = f"{error}\n", 127
    log.write_text(output, encoding="utf-8")
    print(output, end="", flush=True)
    return status


def check_rules(kind, source, output):
    report = output / f"{kind}.json"
    # A failed invocation must not reuse a report from an earlier run.
    report.unlink(missing_ok=True)
    command = [
        "kicad-cli", "sch" if kind == "erc" else "pcb", kind,
        "--format", "json", "--severity-error", "--severity-warning",
        "--exit-code-violations", "--output", str(report),
    ]
    if kind == "drc":
        # Refill in memory; never pass --save-board to CI validation.
        command.extend(["--refill-zones", "--schematic-parity"])
    status = run_logged(command + [str(source)], output / f"{kind}.log")
    if status not in {0, 5}:  # KiCad returns 5 for reported violations, including warnings.
        raise ValueError(f"kicad-cli failed with exit code {status}")
    counts = report_counts(report, kind, source)
    if status == 5 and not sum(counts.values()):
        raise ValueError("kicad-cli reported violations but the report contains none")
    if counts["error"]:
        raise ValueError(f"{counts['error']} error-level violation(s); see {report.name}")
    return f"0 errors, {counts['warning']} warning(s)"


def check_invariants(output):
    status = run_logged(
        [sys.executable, str(ROOT / "tools/crimpdeq/verify.py"),
         str(DESIGN / "crimpdeq.kicad_pcb")],
        output / "verify.log",
    )
    if status:
        raise ValueError(f"design verifier failed with exit code {status}; see verify.log")
    return "passed"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "reports")
    args = parser.parse_args()
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    results = []
    checks = (
        ("Schematic ERC", lambda: check_rules("erc", DESIGN / "crimpdeq.kicad_sch", output)),
        ("PCB DRC and schematic parity", lambda: check_rules("drc", DESIGN / "crimpdeq.kicad_pcb", output)),
        ("Design invariants", lambda: check_invariants(output)),
    )
    for label, check in checks:
        try:
            detail = check()
            results.append((label, True, detail))
        except (OSError, ValueError) as error:
            results.append((label, False, str(error)))
        print(f"{label}: {'PASS' if results[-1][1] else 'FAIL'} — {results[-1][2]}", flush=True)

    summary = "## PCB validation\n\n" + "\n".join(
        f"- {'PASS' if passed else 'FAIL'} — {label}: {detail}"
        for label, passed, detail in results
    ) + "\n"
    (output / "summary.md").write_text(summary, encoding="utf-8")
    return 0 if all(passed for _, passed, _ in results) else 1


if __name__ == "__main__":
    sys.exit(main())
