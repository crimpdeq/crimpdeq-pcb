#!/usr/bin/env python3
"""Run pinned native tscircuit CLI checks without hiding diagnostics.

Netlist requires a TSX entry; the other checks inspect complete prebuilt output.
The CLI prints netlist/schematic findings without consistently setting exit status,
so this wrapper also examines their reports. Full logs and debug artifacts remain
in dist/crimpdeq/native-checks. This does not replace independent geometry/CAM checks.
"""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
CLI = ROOT / 'node_modules/@tscircuit/cli/dist/cli/main.js'
CHECKS = ['netlist', 'schematic-placement', 'placement', 'shorts']


def schematic_issue_count(output):
    """Return issue count, or None for malformed/unrecognized CLI output.

    Position metadata is informational. Only children of issue containers are
    findings. Parse the complete output, so diagnostic text cannot be discarded.
    """
    try:
        root = ET.fromstring('<Report>' + output + '</Report>')
    except ET.ParseError:
        return None
    allowed = {
        'Report': {'SchematicBoxPositions', 'SchematicPlacementIssues', 'SchematicSheet'},
        'SchematicSheet': {'SchematicBoxPositions', 'SchematicPlacementIssues'},
        'SchematicBoxPositions': {'SchematicBoxPlacement'},
        'SchematicBoxPlacement': set(),
    }
    count = 0
    def visit(node):
        nonlocal count
        if (node.text or '').strip() or (node.tail or '').strip():
            return False
        if node.tag == 'SchematicPlacementIssues':
            count += len(node)
            return True
        if node.tag not in allowed:
            return False
        return all(child.tag in allowed[node.tag] and visit(child) for child in node)
    return count if visit(root) else None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--entry', type=Path, default=ROOT / 'index.circuit.tsx')
    parser.add_argument('--circuit', type=Path, default=ROOT / 'dist/crimpdeq/circuit.json')
    parser.add_argument('--output', type=Path, default=ROOT / 'dist/crimpdeq/native-checks')
    parser.add_argument('--checks', nargs='+', choices=CHECKS, default=CHECKS,
                        help='Run only selected checks; omitted means all four')
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    environment = dict(os.environ, TSCI_TEST_MODE='true')
    # The official launcher uses Bun or tsx. Explicit node+tsx selects the
    # installed runtime without fetching dependencies or silently using globals.
    prefix = ['node', '--import', str(ROOT / 'node_modules/tsx/dist/loader.mjs'), str(CLI)]
    results = []
    for check in args.checks:
        source = args.entry if check == 'netlist' else args.circuit
        command = prefix + ['check', check, str(source.resolve())]
        logfile = args.output / f'{check}.log'
        try:
            run = subprocess.run(command, cwd=args.output, env=environment, text=True,
                                 stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=300)
            output, status = run.stdout, run.returncode
        except subprocess.TimeoutExpired as exc:
            output = exc.stdout or ''
            if isinstance(output, bytes):
                output = output.decode(errors='replace')
            output += '\nNative check timed out after 300 seconds.\n'
            status = 124
        logfile.write_text(output)
        parsed_errors = None
        if check in ('netlist', 'placement'):
            match = re.search(r'^Errors:\s*(\d+)\s*$', output, re.M)
            parsed_errors = int(match[1]) if match else None
            passed = status == 0 and parsed_errors == 0
        elif check == 'schematic-placement':
            parsed_errors = schematic_issue_count(output)
            passed = status == 0 and parsed_errors == 0
        else:
            passed = status == 0 and bool(re.search(r'^No shorts detected in ', output, re.M))
        result = {'check': check, 'passed': passed, 'exit_code': status,
                  'reported_errors': parsed_errors, 'log': str(logfile), 'command': command}
        results.append(result)
        print(json.dumps(result), flush=True)
    report = {'passed': all(r['passed'] for r in results),
              'all_checks_run': set(args.checks) == set(CHECKS),
              'shorts_engine': 'pinned CLI bundled package (TSCI_TEST_MODE=true)', 'checks': results}
    (args.output / 'report.json').write_text(json.dumps(report, indent=2)+'\n')
    return 0 if report['passed'] else 1

if __name__ == '__main__':
    sys.exit(main())
