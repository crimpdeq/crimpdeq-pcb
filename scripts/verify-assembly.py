#!/usr/bin/env python3
"""Check exported drills, BOM and placements against original KiCad sources.

Uses only Python's standard library. Optionally also compare the independently
exported original manufacturing package with --reference-package PATH.
Preserving assembly conventions is not vendor approval of component orientation.
"""
import argparse
import ast
import csv
import importlib.util
import json
import math
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('geometry_verifier', ROOT / 'scripts/verify-geometry.py')
g = importlib.util.module_from_spec(spec)
spec.loader.exec_module(g)


def literal_assignment(path, name):
    for node in ast.parse(path.read_text()).body:
        if isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id == name for t in node.targets):
            return ast.literal_eval(node.value)
    raise ValueError(f'{name} missing from {path}')


def properties(obj):
    return {p[1]: p[2] for p in g.nodes(obj, 'property')}


def rows(path):
    with path.open(encoding='utf-8-sig', newline='') as stream:
        return list(csv.DictReader(stream))


def read_drill(path, offset=(0, 0)):
    """Read this project's explicit-decimal absolute metric Excellon subset.

    Every standalone XY is a hit; G85 is a slot. Deliberately do not hide
    redundant start-point drilling. Unsupported operations fail closed.
    """
    text = path.read_text()
    if not re.search(r'^METRIC\s*$', text, re.M) or not re.search(r'^G90\s*$', text, re.M):
        raise ValueError(f'{path}: expected absolute metric drill file')
    tools, current, pos, ops = {}, None, None, []
    def coords(s):
        m = re.fullmatch(r'X(-?\d+\.\d+)Y(-?\d+\.\d+)', s)
        if not m:
            raise ValueError(f'{path}: unsupported coordinate {s!r}')
        return (float(m[1])+offset[0], float(m[2])+offset[1])
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith(';') or line in {'M48', 'FMAT,2', 'METRIC', '%', 'G90', 'G05', 'M30'}:
            continue
        m = re.fullmatch(r'T(\d+)C([\d.]+)', line)
        if m:
            tools[int(m[1])] = float(m[2]); continue
        m = re.fullmatch(r'T(\d+)', line)
        if m:
            current = int(m[1]); continue
        if current not in tools:
            raise ValueError(f'{path}: undefined drill tool')
        if 'G85' in line:
            start, end = line.split('G85')
            start = coords(start) if start else pos
            if start is None:
                raise ValueError(f'{path}: slot without start')
            pos = coords(end)
            ops.append(('slot', tools[current], *sorted([start, pos])))
        elif line.startswith('X'):
            pos = coords(line)
            ops.append(('hole', tools[current], pos))
        else:
            raise ValueError(f'{path}: unsupported command {line!r}')
    return ops


def original_drills(board):
    plated, nonplated = [], []
    for via in g.nodes(board, 'via'):
        plated.append(('hole', float(g.val(via, 'drill')), g.transform(g.xy(via))))
    for fp in g.nodes(board, 'footprint'):
        for pad in g.nodes(fp, 'pad'):
            if not g.nodes(pad, 'drill'):
                continue
            drill = g.values(pad, 'drill')
            if any(isinstance(d, list) for d in drill):
                raise ValueError('Drill offsets are unsupported by this independent verifier')
            center = g.transform(g.pad_center(fp, pad))
            destination = nonplated if pad[2] == 'np_thru_hole' else plated
            if drill[0] == 'oval':
                width, height = map(float, drill[1:3])
                radius = abs(height-width)/2
                angle = math.radians(g.angle(pad))
                vx, vy = (math.sin(angle)*radius, -math.cos(angle)*radius) if height >= width else (math.cos(angle)*radius, math.sin(angle)*radius)
                ends = sorted([(center[0]+vx, center[1]+vy), (center[0]-vx, center[1]-vy)])
                destination.append(('slot', min(width,height), *ends))
            else:
                destination.append(('hole', float(drill[0]), center))
    return plated, nonplated


def verify(out, reference=None):
    errors, checks = [], 0
    def check(condition, message):
        nonlocal checks
        checks += 1
        if not condition:
            errors.append(message)
    def close(a, b, tolerance=0.000051):
        return abs(float(a)-float(b)) <= tolerance
    def compare_operations(actual, expected, label, tolerance):
        check(len(actual) == len(expected), f'{label}: operation count {len(actual)} != {len(expected)}')
        remaining = list(actual)
        for op in expected:
            candidates = [i for i, act in enumerate(remaining) if act[0] == op[0] and close(act[1], op[1], 1e-6) and all(close(x,y,tolerance) for ap,bp in zip(act[2:],op[2:]) for x,y in zip(ap,bp))]
            check(len(candidates) == 1, f'{label}: expected one matching operation for {op}, got {len(candidates)}')
            if candidates:
                remaining.pop(candidates[0])
        check(not remaining, f'{label}: {len(remaining)} unexpected/redundant operations: {remaining[:8]}')

    design = ROOT / 'pcb/crimpdeq'
    board = g.parse((design / 'crimpdeq.kicad_pcb').read_text())
    schematic = g.parse((design / 'crimpdeq.kicad_sch').read_text())
    fps = {properties(fp)['Reference']: fp for fp in g.nodes(board, 'footprint')}
    symbols = {properties(s).get('Reference'): properties(s) for s in g.nodes(schematic, 'symbol')}
    bom = rows(out / 'bom.csv')
    placements = rows(out / 'positions.csv')
    bom_map = {r['Designator']: r for r in bom}
    cpl_map = {r['Designator']: r for r in placements}
    dnp = {f'J{i}' for i in range(5,13)}
    fitted = set(fps)-dnp
    check(len(bom_map) == len(bom), 'Duplicate BOM references')
    check(set(bom_map) == set(fps), 'BOM references differ from original PCB')
    check(len(cpl_map) == len(placements), 'Duplicate placement references')
    check(set(cpl_map) == fitted, 'Placement references differ from original fitted set')
    override = literal_assignment(design / 'assembly/_gen_bom.py', 'OVERRIDES')
    offsets = literal_assignment(design / 'assembly/_gen_cpl.py', 'TOP_ROTATION_OFFSETS')
    positions = literal_assignment(design / 'assembly/_gen_cpl.py', 'POSITION_OVERRIDES')
    for ref, fp in fps.items():
        p = properties(fp)
        if ref in bom_map:
            row = bom_map[ref]
            check(row['Value'] == p['Value'], f'{ref}: BOM value changed')
            check(row['Footprint'] == fp[1], f'{ref}: BOM footprint changed')
            check(row['Assembly'] == ('Do Not Place' if ref in dnp else 'Fitted'), f'{ref}: BOM assembly status changed')
            expected_lcsc = override.get(ref, symbols.get(ref, {}).get('LCSC', ''))
            check(row['LCSC Part Number'] == expected_lcsc, f'{ref}: LCSC changed: {row["LCSC Part Number"]} != {expected_lcsc}')
            check(row['Manufacturer Part Number'] == symbols.get(ref, {}).get('MPN', ''), f'{ref}: manufacturer part number changed')
        if ref in cpl_map:
            row = cpl_map[ref]
            side = 'bottom' if g.val(fp, 'layer') == 'B.Cu' else 'top'
            angle = g.angle(fp)
            rotation = ((180-angle) if side == 'bottom' else angle+offsets.get(ref,0)) % 360
            x,y = g.transform(g.xy(fp))
            if ref in positions:
                x,y = positions[ref][0]-g.CX, positions[ref][1]+g.CY
            check(row['Layer'] == side, f'{ref}: placement side changed')
            check(close(float(row['Mid X']),x) and close(float(row['Mid Y']),y), f'{ref}: placement center changed')
            check(abs((float(row['Rotation'])-rotation+180)%360-180) <= .00001, f'{ref}: placement rotation changed')
    expected_pth, expected_npth = original_drills(board)
    pth = read_drill(out / 'gerbers/drill-L1-L4.drl')
    npth = read_drill(out / 'gerbers/drill_npth.drl')
    compare_operations(pth, expected_pth, 'PTH versus source PCB', .000051)
    compare_operations(npth, expected_npth, 'NPTH versus source PCB', .000051)
    if reference:
        old_pth = read_drill(reference / 'gerber/crimpdeq-PTH.drl', (-g.CX,g.CY))
        old_npth = read_drill(reference / 'gerber/crimpdeq-NPTH.drl', (-g.CX,g.CY))
        compare_operations(pth, old_pth, 'PTH versus original package', .000551)
        compare_operations(npth, old_npth, 'NPTH versus original package', .000551)
        old_bom = {ref.strip(): row for row in rows(reference / 'bom.csv') for ref in row['Designator'].split(',')}
        old_cpl = {row['Designator']: row for row in rows(reference / 'position.csv')}
        check(set(old_bom) == set(bom_map), 'Original package BOM reference set changed')
        check(set(old_cpl) == set(cpl_map), 'Original package CPL reference set changed')
        for ref in set(old_bom) & set(bom_map):
            old, new = old_bom[ref], bom_map[ref]
            check(old['Value'] == new['Value'] and old['Footprint'] == new['Footprint'].split(':')[-1] and old['MPN'] == new['LCSC Part Number'], f'{ref}: original package BOM changed')
            check((old['Notes'] == 'Do Not Place') == (new['Assembly'] == 'Do Not Place'), f'{ref}: original package DNP changed')
        for ref in set(old_cpl) & set(cpl_map):
            old, new = old_cpl[ref], cpl_map[ref]
            check(old['Layer'] == new['Layer'] and close(old['Rotation'],new['Rotation']), f'{ref}: original package side/rotation changed')
            check(close(float(old['Mid X'])-g.CX,new['Mid X']) and close(float(old['Mid Y'])+g.CY,new['Mid Y']), f'{ref}: original package placement moved')
    return {'passed': not errors, 'assertions': checks, 'counts': {'bom': len(bom), 'fitted_placements': len(placements), 'top_placements': sum(r['Layer']=='top' for r in placements), 'bottom_placements': sum(r['Layer']=='bottom' for r in placements), 'plated_drill_operations': len(pth), 'nonplated_drill_operations': len(npth)}, 'reference_package_compared': bool(reference), 'errors': errors, 'limitations': ['Checks migration equivalence; does not establish supplier part identity, assembly orientation acceptance or fabrication approval.', 'Original package drill coordinates have 0.001 mm resolution; comparison allows 0.000551 mm. Source PCB comparison allows 0.000051 mm for output rounding.']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT / 'dist/crimpdeq')
    parser.add_argument('--reference-package', type=Path)
    args = parser.parse_args()
    try:
        report = verify(args.output, args.reference_package)
    except Exception as exc:
        print(json.dumps({'passed': False, 'errors': [f'{type(exc).__name__}: {exc}']}, indent=2))
        return 2
    print(json.dumps(report, indent=2))
    return 0 if report['passed'] else 1

if __name__ == '__main__':
    sys.exit(main())
