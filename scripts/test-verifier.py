#!/usr/bin/env python3
"""Regression-test the independent verifier with deliberate in-memory defects.

Does not modify Circuit JSON or design files. Every mutation must be rejected;
a passing baseline is required so unrelated errors cannot mask a broken test.
"""
import copy
import importlib.util
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('geometry_verifier', ROOT / 'scripts/verify-geometry.py')
g = importlib.util.module_from_spec(spec)
spec.loader.exec_module(g)


def main():
    board = g.parse((ROOT / 'pcb/crimpdeq/crimpdeq.kicad_pcb').read_text())
    original = json.loads((ROOT / 'dist/crimpdeq/circuit.json').read_text())
    baseline = g.verify(board, original)
    if not baseline['passed']:
        print(json.dumps({'passed': False, 'error': 'Baseline must pass before mutation tests', 'baseline': baseline}, indent=2))
        return 1
    cases = [
        ('SMT width', 'pcb_smtpad', lambda e: e.update(width=e['width']+.01)),
        ('SMT corner radius', 'pcb_smtpad', lambda e: e.update(corner_radius=e.get('corner_radius',0)+.01)),
        ('Physical pin identity', 'source_port', lambda e: e.update(port_hints=[h for h in e['port_hints'] if not h.startswith('kicad:')])),
        ('Via drill', 'pcb_via', lambda e: e.update(hole_diameter=e['hole_diameter']+.01)),
        ('Via layer span', 'pcb_via', lambda e: e.update(layers=['top','bottom'])),
        ('Net identity', 'source_net', lambda e: e.update(name='WRONG_NET')),
        ('Keepout layers', 'pcb_keepout', lambda e: e.update(layers=['top'])),
        ('Plated slot width', 'pcb_plated_hole', lambda e: e.update(hole_width=e['hole_width']+.01)),
        ('Component side', 'pcb_component', lambda e: e.update(layer='top' if e['layer']=='bottom' else 'bottom')),
        ('Trace route', 'pcb_trace', lambda e: e['route'][0].update(x=e['route'][0]['x']+.01)),
        ('Filled copper polygon', 'pcb_copper_pour', lambda e: e['points'][0].update(x=e['points'][0]['x']+.01)),
        ('Courtyard dimensions', 'pcb_courtyard_outline', lambda e: e['outline'][1].update(x=e['outline'][1]['x']+.01)),
        ('Courtyard circle radius', 'pcb_courtyard_circle', lambda e: e.update(radius=e['radius']+.01)),
        ('Courtyard layer', 'pcb_courtyard_outline', lambda e: e.update(layer='top' if e['layer']=='bottom' else 'bottom')),
    ]
    results = []
    for label, kind, mutate in cases:
        circuit = copy.deepcopy(original)
        element = next(e for e in circuit if e['type']==kind)
        mutate(element)
        report = g.verify(board, circuit)
        results.append({'mutation': label, 'rejected': not report['passed'], 'diagnostic_count': len(report['errors'])})
    # Regression guard for stale physical PCB pin labels: the MAX17048 symbol
    # declares pin 7 SCL and pin 8 SDA; source metadata must agree with it.
    circuit = copy.deepcopy(original)
    u5 = next(e['source_component_id'] for e in circuit if e['type']=='source_component' and e['name']=='U5')
    port = next(e for e in circuit if e['type']=='source_port' and e['source_component_id']==u5 and 'kicad:7' in e['port_hints'])
    port['name'] = 'SDA_7'
    report = g.verify(board, circuit)
    results.append({'mutation': 'Stale MAX17048 pin label', 'rejected': not report['passed'], 'diagnostic_count': len(report['errors'])})
    circuit = copy.deepcopy(original)
    text = next(e for e in circuit if e['type']=='pcb_silkscreen_text' and e['pcb_silkscreen_text_id'].startswith('silk_text_'))
    text['anchor_position']['x'] += .01
    report = g.verify(board, circuit)
    results.append({'mutation': 'Visible footprint reference position', 'rejected': not report['passed'], 'diagnostic_count': len(report['errors'])})
    passed = all(r['rejected'] for r in results)
    print(json.dumps({'passed': passed, 'baseline_assertions': baseline['checks']['assertions'], 'mutation_tests': results}, indent=2))
    return 0 if passed else 1

if __name__ == '__main__':
    sys.exit(main())
