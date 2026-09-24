#!/usr/bin/env python3
"""Count all authored design source, including fixed copper data, with o200k_base.

The initial conversion baseline was measured at 39aaae3 using the same encoding
and file scope. Dependency packages, lockfiles, outputs, docs and verification
scripts are not design-source tokens. No geometry data is excluded or compressed.
"""
import json
from pathlib import Path
import tiktoken

ROOT = Path(__file__).resolve().parents[1]
encoding = tiktoken.get_encoding('o200k_base')

def count(files):
    return [{'file': str(p.relative_to(ROOT)),
             'tokens': len(encoding.encode(p.read_text(), disallowed_special=()))}
            for p in sorted(files)]

def total(rows):
    return sum(row['tokens'] for row in rows)

design = ROOT / 'pcb/crimpdeq'
tscircuit = count(p for p in (design / 'tscircuit').rglob('*') if p.suffix in ('.ts','.tsx','.json'))
kicad = count(design / f'crimpdeq.{suffix}' for suffix in ('kicad_pcb','kicad_sch','kicad_pro','kicad_dru'))
initial = 665274
current = total(tscircuit)
report = {
    'encoding': 'o200k_base',
    'scope': 'All tscircuit design TS/TSX/JSON, including every saved copper vertex; four canonical KiCad project files.',
    'initial_tscircuit_commit': '39aaae3',
    'initial_tscircuit_tokens': initial,
    'refactored_tscircuit_tokens': current,
    'kicad_tokens': total(kicad),
    'reduction_from_initial_percent': round(100*(1-current/initial),2),
    'reduction_from_kicad_percent': round(100*(1-current/total(kicad)),2),
    'tscircuit_files': tscircuit,
    'kicad_files': kicad,
    'additional_entry_build_export_files': count(ROOT / p for p in ('index.circuit.tsx','scripts/build.ts','scripts/export.ts')),
}
out = ROOT / 'dist/crimpdeq/token-comparison.json'
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(report, indent=2)+'\n')
print(json.dumps(report, indent=2))
