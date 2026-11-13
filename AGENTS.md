# Agent guidelines

tscircuit design of the crimpdeq board (ADS1220 variant). See `README.md` for the
design and `.agents/skills/tscircuit/` for general tscircuit usage. The rules
below override the skill where they conflict.

## Tooling

- `tsci`, `bun` and TypeScript 5 are project-local: run through `npm run …` or
  `node_modules/.bin`. TypeScript 7 breaks `tsci`.
- Dependencies are pinned exactly (`package.json` + `bun.lock`); install with
  `bun install --frozen-lockfile`. Upgrading tscircuit can change routing and
  break `scripts/patch-viewer.mjs` and `scripts/patch-core.mjs`: re-run the
  search and verify afterwards.
- `npm install` runs `scripts/patch-viewer.mjs`, which patches the browser
  viewer's hover labels, and `scripts/patch-core.mjs`, which makes core give
  vias in fixed traces all layers (unpatched, they are blind/buried and other
  layers' copper covers their drill). If either fails after a tscircuit update,
  update its patterns.

## Verification

- A change is done only when `npm run verify` passes: netlist baseline,
  placement, schematic placement, build, per-check DRC and gerber shorts.
- Do not trust the built-in DRC or `tsci build` alone. They missed real shorts
  and via-to-pad violations on this board; `scripts/drc.ts` and
  `tsci check shorts` catch them.
- Connectivity changes: update the baseline with
  `python3 scripts/netlist.py --update` only after reviewing the diff.
- Routing is deterministic for a given design and tool versions.
  `scripts/routing.py` fails `verify` when routed copper changes; accept a new
  routing with `--update` only after the rest of `verify` passes.
- Check that edits to schematic props do not drop PCB pads.
  `schPinArrangement` on a `standard="usb_c"` connector silently removed them;
  `scripts/drc.ts` (`connectedPortsHavePads`) guards this.

## Layout and routing

- All copper is fixed (README, Routing): hand-written traces in
  `index.circuit.tsx` and generated ones in `lib/handRoutes.ts`. After a change to
  placement, footprints or hand-written traces, run `scripts/handroute.sh`, then
  `npm run verify` and `python3 scripts/routing.py --update`. Do not edit
  `lib/handRoutes.ts` by hand.
- Schematic-only edits (`schX`, `displayName`, sections) and 3D model offsets
  do not change routing; confirm that the routed traces are unchanged.
- Design rules target PCBWay 4-layer: 5/5 mil, 0.3/0.5 mm vias, 0.3 mm copper
  to edge, 1.6 mm board. 6/6 mil with 0.6 mm vias did not route at this size.
- `USB_OVERHANG` is limited to ~1.2 mm by the USB-C front shell-leg slots.
- The autorouter routes nothing now. Its output differs between macOS arm64 and
  Linux x64, and `npm run search` re-rolls it; both matter only if nets are left
  to it again (then accept routings on macOS).
- Hand-routed traces: use a non-empty `pcbPath` (`pcbPath={[".X > .pin"]}`, the
  `to` port, for a straight line), not `pcbStraightLine`, which attaches clipped
  ends to top-side U1 pads. Core fixes only traces with a non-empty `pcbPath`; the
  router treated `pcbPath={[]}` traces as soft and routed across them.
- A fixed trace to a power-to-ground capacitor longer than 1 mm makes core skip
  autorouting and fail the build: set `maxDecouplingTraceLength` on the capacitor.
- GND plane regions (`lib/gndPlane.ts`) reserve inner2 under the buck, the ADC
  and the USB pair's inner1 run, and inner1 under its top-side run; reserving
  all of inner2 left the board unroutable. The USB pair is hand-routed;
  `scripts/drc.ts` (`usbPair`) checks its layers and length match.
- The board autorouter is `lib/gndPlaneRouter.ts`, the stock solver with GND
  left to the pours and those pours detached from GND (see README);
  `GND_ROUTER_SKIP=1` turns it off. After a tscircuit upgrade, check that it still
  matches core's solver choice and options.
- GND pads connect through the pours: after hand-routing, check that none is
  boxed in (`checkEachPcbPortConnectedToPcbTraces` lists every GND pad when one
  is isolated).

## Working with the dev server

- `tsci dev` watches the whole project and crashes when a file it saw is
  deleted. Create temporary files (variants, snapshots, unzipped exports)
  outside the project, or restart the server afterwards.
- Put hard time limits on builds with `kill -9` (`scripts/search.py` does);
  Bun ignores `SIGALRM`, and some layouts hang after routing.

## Manufacturing

- Fabrication and assembly are at PCBWay: identify parts by manufacturer part
  number (`manufacturerPartNumber`); LCSC codes are sourcing hints only.
- Regenerate `dist/fab/` with `npm run fab` after any design change.
