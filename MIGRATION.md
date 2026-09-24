# tscircuit migration

The complete electrical circuit and fixed PCB layout are authored in TypeScript at
`pcb/crimpdeq/tscircuit/`. The starting point is
`fix/usb-signal-integrity` at `bce600d8b4f116cb037551a16675d72108a5ebd5`.
No intended electrical, component, placement, routing or copper-fill changes were made.
The original KiCad files remain an independent reference and native DRC/ ERC project.

## Build and inspect

Use Node 24, npm, and Python 3.10 or later:

```sh
npm ci
npm test
```

`npm test` typechecks the authoring code, compiles the circuit, compares it with the
original PCB, records tscircuit diagnostics, generates validation exports and tests
that the independent verifier rejects deliberately corrupted designs. This is an
**equivalence test, not a fabrication-release gate**. The diagnostic report can
contain findings even when equivalence passes. No findings are removed or waived.

Outputs are in `dist/crimpdeq/`:

- `circuit.json`: complete four-layer board and electrical model.
- `top.svg`, `bottom.svg`, `inner1.svg`, `inner2.svg`: layer previews; bottom is
  viewed through the board from above, so its printing appears mirrored.
- `schematic.svg`: native tscircuit schematic using labelled generic IC symbols.
- `diagnostics.json`: native compilation diagnostics before fixed routing is added.
- `tscircuit-checks.json`: checks rerun on the complete final board.
- `gerbers/`: four copper layers, mask, paste, legend, edge cuts and plated/unplated drills.
- `stencil.circuit.json`: all 204 stencil apertures, including the custom polygon.
- `bom.csv`: 59 individual reference entries, including eight Do Not Place cable pads.
- `positions.csv`: 51 fitted parts, with reviewed assembly rotation/centroid corrections.

For independent CAM comparison:

```sh
python3 -m pip install -r scripts/requirements-cam.txt
npm run verify:cam
python3 scripts/verify-assembly.py
```

The CAM verifier downloads a specific original release attachment and validates its
SHA-256 before reading it. Alternatively, supply an original Gerber directory with
`python3 scripts/verify-cam.py --baseline /path/to/gerber`. The comparison checks all
four copper layers and both mask and paste layers after translating the coordinate
origin. It uses a 1 micrometre coordinate grid and accepts at most 0.00001 square
millimetres of symmetric-difference area per layer to accommodate numeric/arc
representation residue. Paste area compares exactly in the migration validation.
The independent assembly checker parses the PCB/schematic and the original assembly
correction tables. Its optional `--reference-package` also compares the original
release BOM/CPL and drills.

## Native tscircuit workflow

`index.circuit.tsx` and `tscircuit.config.json` provide the standard component/net
entrypoint. Use `npm run tsci -- check netlist index.circuit.tsx` to inspect it.
For the entire fixed routed board, first run `npm run build` and then:

```sh
npm run check:native
```

This runs native netlist, schematic-placement, placement and shorts checks, keeping
logs and debug artifacts in `dist/crimpdeq/native-checks/`. The wrapper examines
reported issues as well as exit codes: this pinned CLI sometimes returns zero even
when it printed findings. Its shorts engine uses the pinned bundled implementation,
not a freshly downloaded version. `check:native` deliberately exits nonzero when
unresolved placement/schematic findings remain; it is not an alias for `npm test`.
Read `VALIDATION.md` for the classified findings. The explicit Node+tsx launcher
avoids resolution problems in the pinned CLI's bare-Node launcher.

## Editing the circuit

| File | Purpose |
| --- | --- |
| `Crimpdeq.tsx`, `components.tsx` | Board composition and reusable typed native components |
| `schematic.ts` | Nine functional schematic sections with explicit placements |
| `devices.ts`, `parts.ts` | Shared device definitions and per-reference placement/physical-pin net maps |
| `nets.ts` | Net membership derived from part pins; no duplicate wiring table |
| `footprint-library.ts`, `footprints.ts`, `Footprint.tsx` | Shared exact package builders, instances and native footprint renderer |
| `routing.ts` | Tracks grouped by net/layer/width and vias grouped by common properties |
| `board.ts`, `copper.ts` | Board constraints, keepout permissions and exact saved copper contours |
| `rules.ts` | Mapped tscircuit design rules and additional source rules |
| `build.tsx` | Compile native components; resolve IDs; add fixed routing, fills and graphics |
| `assembly.ts` | Exact stencil model, BOM and reviewed assembly placements |

For a complete board, use `await buildCrimpdeq()` from `index.ts`. Rendering only
`<Crimpdeq />` produces the native component/net stage, **not** the final routed board.
Use `npm run build` followed by `npm run export`; plain `tsci export` does not run
this fixed-routing/stencil pipeline. The build does not read or import KiCad files.
The one-time importer and unused migration manifest were removed during refactoring.
Their historical versions remain at commit `39aaae3`; they must not overwrite the
new shared definitions. The build remains completely independent of KiCad.

Tracks and saved copper fills are fixed data. Moving a component or changing a net
requires updating the affected routing and refilling copper before release; a build
will not silently autoroute or regenerate saved fills. The equivalence tests are
intentionally expected to fail after an intentional physical redesign until its
independent reference and qualification are updated.

All PCB distances are millimetres, with the origin at the board centre and positive
Y upward: `(x, y) = (KiCadX - 142.45, 67.4 - KiCadY)`. Assembly coordinates use that
same origin, with the original reviewed side/rotation corrections retained. J2's
placement uses its reviewed body centroid, not its footprint origin.

## Scope and qualification limits

The migration preserves 59 components, 36 connected nets, 205 logical pins, 213 copper
pads, 544 track segments, 69 vias, nine saved copper polygons and three keepouts.
Pin roles come from the embedded schematic symbols rather than stale PCB pad metadata.
Every custom pad, repeated ESP32 ground pad, USB shell slot, paste-only aperture and
via tenting setting is represented explicitly. Top/bottom courtyard and silk transforms
are corrected against the original footprint geometry. Gerber export also combines
G85 slot start/end coordinates to avoid redundant drill operations.

The generated schematic uses native labelled boxes for ICs, diodes, MOSFETs and
connectors. J2 uses the native `<connector>` element with its exact existing footprint.
Original symbol artwork and sheet annotations are available in the
retained KiCad schematic; they are not visually reproduced. Board legend wording
and geometry are retained, but tscircuit uses a different text font. Original 3D
models and mechanical files remain in the repository; native generic CAD previews
are not qualified representations of the assembled board.

The pinned tscircuit checker does not express every KiCad rule. In particular, the
analog **via-only** keepout is represented by its exact outline but is interpreted
as a general copper keepout by stock checks. The original per-object permissions
remain in `board.ts`. Do not remove that keepout to obtain a clean report. Some
source checks also assume every generic chip has supply pins, including diodes and
connectors. The pinned checker also incorrectly infers some PCB trace endpoints on other copper layers; `checker-analysis.json` reproduces this without mutating the saved board. Full final diagnostics are retained for inspection. See
`VALIDATION.md` for the actual observed result and remaining checker findings.

No live KiCad/Konnect session, fresh native KiCad ERC/DRC with zone refill, physical
prototype testing, signal-integrity simulation, or manufacturer DFM approval was
performed for this migration. Area equality proves that the conversion has retained
the checked artwork; it does not prove the original design will work in hardware.

The earlier source-design review's unresolved issues remain: WS2812B supply margin,
I²C rise time with 10 kΩ pull-ups, low-battery power behaviour, USB and analog noise
performance, recovery-pin access, component/connector sourcing and manufacturer
acceptance of the smallest annular rings. This conversion does not repair or waive
those concerns. The original `release.yml` workflow still releases the KiCad design;
it is not a tscircuit production-release workflow. Validation exports are explicitly
marked **not a production release**.
