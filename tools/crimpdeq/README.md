# Crimpdeq Verification Tooling

PR CI and releases both run `check.py` in the KiCad 10 container. It runs schematic ERC,
PCB DRC with an in-memory zone refill and schematic parity, and `verify.py`. Error-level
violations, tool failures, missing or malformed reports, and failed design invariants fail
the job. Warnings remain non-blocking and are counted in the summary. The scripts do not
save or modify the design files.

To run the same checks locally, use KiCad 10's `kicad-cli` on PATH and a Python that imports
`pcbnew`:

```sh
python3 tools/crimpdeq/check.py
```

JSON reports, command logs, and `summary.md` are written to `reports/` (or `--output DIR`).
CI uploads these diagnostics even when a check fails. The report/runner regression tests
need only Python's standard library:

```sh
python3 -m unittest discover -s tools/crimpdeq/tests -v
```

`verify.py` compares every connected named pad against the corrected golden netlist, including
U1 ground pins 37–53 and R20/R21/R22. It also checks the component set, outline, L2 plane
usage, GND stitching, critical-route limits, and cable-pad placement. The ADC checks cover
C12's selected 1206 part, R23–R26 values and sourcing fields, split SPI nets, source proximity,
and the dedicated DRDY no-connect. Digital tracks and vias on every layer—including the
`ADS_*` nets—must stay outside the AIN and cable-signal copper envelopes, each guarded by
0.20 mm. These geometry checks do not qualify ADC noise or prove ground-plane coverage.

Run it from the repository root with a Python that imports `pcbnew`: `python3` on Linux, or
KiCad's bundled Python on macOS:

```sh
PY=python3  # macOS: /Applications/KiCad/KiCad.app/Contents/Frameworks/Python.framework/Versions/3.9/bin/python3
$PY tools/crimpdeq/verify.py pcb/crimpdeq/crimpdeq.kicad_pcb
```
