# tscircuit refactor

The refactor keeps the reviewed electrical connections and manufacturing geometry
while replacing per-instance data dumps with shared, editable definitions.

## Guidance used

Read the official [tscircuit skill](https://github.com/tscircuit/skill) at commit
`857018c4e9eeb6f6b86e6d0a6974b7be9f06e31d`, including `SKILL.md`, `SYNTAX.md`,
`WORKFLOW.md`, `FOOTPRINTS.md`, `CLI.md`, and the pre-export checklist. The documented
[custom footprint primitives](https://docs.tscircuit.com/elements/footprint) and
schematic-section guidance inform the implementation.

Applied recommendations:

- A default-exported native board and standard `index.circuit.tsx` entrypoint.
- A reusable typed component renderer, explicit pin labels/attributes and pinned
  supplier selections.
- Native `<connector>` semantics for J2, retaining its exact existing USB footprint.
- Nine functional schematic sections with explicit positions and labelled nets.
- Shared package geometry; standard passives use parameterized two-terminal pad
  builders. No generic footprint defaults replace reviewed pad dimensions.
- Native netlist, schematic-placement, placement and all-layer shorts checks in
  addition to the independent source and CAM comparisons.

## Source organization

`devices.ts` contains shared part specifications and physical pin roles. `parts.ts`
places those devices and assigns nets by physical pin number; its factory rejects
missing or extra pins. `nets.ts` derives membership from that single source.

`footprint-library.ts` defines 20 pad layouts and 35 shared drawing layouts.
`footprints.ts` instantiates them on the correct side with original pad/drawing
identities. The factory checks template keys and identity counts. It retains custom
ESP32 ground geometry, USB shell slots and paste-only apertures explicitly.
Non-rendered fabrication artwork, hidden properties and unused metadata remain in
the original KiCad reference rather than being duplicated into executable source.

`routing.ts` groups tracks by net, layer and width, and vias by shared dimensions.
Each row retains its original UUID and exact endpoints. `board.ts` holds constraints
and references the nine saved contours in `copper.ts`. Contours are literal `[x,y]`
coordinate pairs in millimetres: no vertex rounding, decimation, encoding or
compression is used. All saved geometry is included in the token measurement.

`geometry.ts` shares coordinate transformations between the board and stencil
builders, so assembly generation no longer imports the entire compiler. The
obsolete one-time importer and unused reference manifest were removed; the
independent checker still parses the original KiCad source directly.

The full routed build remains `npm run build`; the native entrypoint alone is for
component/net authoring. The explicit finalization and stencil export preserve
features that the stock pipeline does not represent exactly. Do not substitute
plain `tsci export` for the documented build/export pipeline.

## Token measurement

Run:

```sh
python3 -m pip install -r scripts/requirements-tokens.txt
npm run tokens
```

The result is `dist/crimpdeq/token-comparison.json`, using `o200k_base`. It includes
all TypeScript and any JSON design data under `pcb/crimpdeq/tscircuit/`, including
fixed copper contours. Entry/build/export scripts are reported separately.
Dependencies, lockfiles, generated outputs, documentation and validation scripts
are excluded consistently with the original comparison. The initial conversion
was measured at commit `39aaae3`. The final comparison is:

| Implementation | Design-source tokens | Change from initial tscircuit |
| --- | ---: | ---: |
| Original KiCad | 576,536 | — |
| Initial tscircuit conversion | 665,274 | — |
| Refactored tscircuit | 265,663 | −60.07% |

The refactored design is also 53.92% smaller than the original KiCad source under
this tokenizer. Its entry/build/export scripts add 876 tokens, reported separately.

Most remaining tokens describe the saved copper contours. Regenerating those
contours with a different fill engine might make the source smaller, but that would
be a physical design change requiring a separate verification cycle.

## Validation and remaining findings

`npm test` and the CAM/assembly comparisons verify retained geometry and electrical
identity. `npm run check:native` retains raw native reports and returns nonzero for
remaining findings. See `VALIDATION.md` for classified limitations and release scope.

CI gates native netlist and shorts checks. Placement advice is a separate,
explicitly advisory step because it reports fixed board-edge geometry, routing
optimization suggestions and schematic heuristics discussed in `VALIDATION.md`.
Its reports remain in the uploaded validation artifact. No keepouts or diagnostics
are removed to make a checker appear clean.
