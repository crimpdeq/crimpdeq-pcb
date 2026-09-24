# Migration validation

Validated 2026-09-24 against the KiCad source at
`bce600d8b4f116cb037551a16675d72108a5ebd5` on `fix/usb-signal-integrity`.
The simplified implementation is on local branch `refactor/tscircuit`; its
pre-refactor baseline is commit `39aaae3` on `feat/tscircuit`. The tests establish migration
equivalence; this document is not a fabrication approval or hardware guarantee.

| Check | Observed result |
| --- | --- |
| TypeScript and native compilation | Pass; no native compilation errors |
| Independent PCB and schematic comparison | 11,611 assertions pass |
| Physical geometry | 213 copper pads, 544 tracks, 69 vias, nine saved filled polygons, three keepouts match |
| Pin identity and metadata | Connectivity and physical pin numbers retained; chip labels checked against original schematic symbols |
| Courtyards and reference printing | All 59 courtyards and six visible footprint references match source geometry/side/text |
| Deliberate-defect regression tests | All 16 corruptions rejected, including swapped MAX17048 pin label |
| Assembly comparison | 848 assertions pass against source and original package: 59 BOM entries, 51 fitted placements, 81 plated drill/slot operations, two NPTH |
| Four copper layers | Symmetric-difference areas ≤ 0.000000279 mm² after origin alignment; pass 0.00001 mm² tolerance |
| Both solder-mask layers | Difference ≤ 0.00000000817 mm²; pass |
| Both stencil layers | Zero area difference; all 204 apertures retained |
| Native CLI netlist | Pass; zero errors and warnings |
| Native CLI four-layer Gerber shorts check | Pass; no shorts detected by the pinned bundled engine |
| Final stock tscircuit checks | Findings remain; see below |
| Fresh KiCad ERC/DRC, zone refill, fabricator DFM, hardware tests | Not performed in this environment |

The independent verifier reads the original KiCad files directly, rather than trusting
the migration manifest. The CAM comparison parses the actual generated Gerbers and
the immutable reviewed release. Its downloaded ZIP is pinned to SHA-256
`04a550f106794759ea77e9052ce06560362f5513abd1621cf5e8ad5018f52799`.
Numeric residues arise at sub-micrometre arc/grid boundaries. Silkscreen typography,
schematic artwork and 3D models are not asserted to match visually.

## Findings retained in the final checker report

The full `@tscircuit/checks@0.0.208` report contains:

| Finding | Count | Investigation |
| --- | ---: | --- |
| Copper/component over keepout | 8 | Original analog region is a via-only keepout; the stock representation treats it as general copper exclusion |
| Trace over/near keepout | 18 | 16 overlap and two clearance reports; original object-specific permissions must be applied |
| PCB port not connected | 23 | Reproducible checker endpoint-inference defect; same public port/pour check reports zero errors when given the original logical connectivity map |
| Missing pad connection | 27 | Retained; checker-inferred net contamination can affect these reports, but each is not independently waived |
| Underspecified component pins | 16 | Generic component representation/limited attribute checking; original schematic pin roles are preserved |
| Missing power/ground pins | 8 + 8 | Generic diode/transistor/connector chip symbols are assumed to need supply pins by the checker |

`scripts/diagnose-checker.ts` demonstrates that endpoint inference adds **89
cross-layer pad associations**, including **75 associations between different
original logical nets**. Example: a USB D+ segment on inner2 is assigned to an
unrelated +3V3 surface pad directly above it. These are mutations made by the
checker to its own input in memory. The checks receive disposable copies; this
mutation is never written into the saved circuit or CAM exports.

The report retains every raw finding and the control experiment. Nothing is
silently suppressed, the package is not patched, and the control experiment is not
presented as independent physical DRC. A successful `npm test` means the conversion
and corruption-detection tests pass, not that this stock checker has zero findings.

## Native CLI placement reports after refactoring

The official CLI now runs through the explicit Node+tsx launcher. Native netlist
and all-four-layer Gerber shorts checks pass. Reports are retained under
`dist/crimpdeq/native-checks/`. The wrapper parses reported findings because the
CLI does not consistently signal netlist/schematic issues with a nonzero exit code.

The PCB placement analysis still reports two board-edge overhangs and four rotation
optimization suggestions (D7, D8, R9, R13). U1/J2 intentionally sit at board edges;
the analyzer's component-box estimate uses the normalized footprint origin with
asymmetric native bounds, so it is not an independent body/courtyard measurement.
All actual pad and courtyard geometry matches the original. Following its rotation
suggestions would change the existing routed, polarized-component layout; this
source refactor deliberately preserves it. The CLI's separate placement DRC count
is zero errors, with two existing connector insertion-direction warnings. The raw
placement command still exits nonzero and is not reported as a pass.

Schematic-only orientation, size and padding suggestions were addressed in the
functional-section layout, resolving 57 of the initial 60 findings. The three
remaining heuristic reports are documented in the final
native log: D2 is a B5819W diode, not a crystal, and the global decoupling-bank
heuristic groups capacitors belonging to different ICs and functional sections.
Those flags are retained rather than moving correctly grouped parts to satisfy the
heuristic. Native placement advice therefore remains an explicit CI advisory step;
netlist and shorts are blocking gates. CI workflow changes were authored locally;
no remote workflow execution is claimed.

## Migration defects caught and corrected

- Wrong bottom-side courtyard/silk defaults and a lost C18 courtyard rotation.
- Stale PCB pin descriptions: MAX17048 SCL/SDA labels, ADC pin functions and ESP32
  pin roles now come from embedded schematic symbols, with no net changes.
- Lost custom/repeated pads, paste-only apertures and polygon stencil geometry in
  stock importer/export paths; these use explicit definitions and the tested pipeline.
- Double application of D3 paste-only aperture margin and missing global via tenting.
- Asymmetric footprint bounding-box centres substituted for original placement origins.
- Redundant Excellon slot-start drill hits; now one G85 operation per original slot.

## Release decision

The original circuit's electrical risks remain unchanged. LED supply margin, I²C
rise time, low-battery power behaviour, USB performance, analog noise, antenna
performance, recovery access and component/connector sourcing still require the
source review and appropriate physical validation. The smallest annular rings and
assembly orientations still require manufacturer acceptance.

Use the supplied tscircuit build/export pipeline for evaluation. Do not treat its
validation outputs, a clean TypeScript build or matching copper geometry as an
unconditional instruction to manufacture. Read `MIGRATION.md` before editing or
using these outputs for a release.
