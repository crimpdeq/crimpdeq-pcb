# Crimpdeq PCB — ADS1220 variant (tscircuit)

tscircuit port of [crimpdeq-pcb v2.0.0](https://github.com/crimpdeq/crimpdeq-pcb/tree/v2.0.0)
with the HX711 replaced by a TI ADS1220 24-bit ADC.

- Board: 17 × 31.5 mm, 4 layers, components on both sides (v2.0.0: 23 × 63.8 mm, 2 layers)
- Top: ESP32-C3-MINI-1 (antenna at the board edge, copper keepout on all layers),
  USB-C (TYPE-C-31-M-12, flush with the opposite edge), USB ESD, both LEDs, load cell
  ferrites (FB1, FB2)
- Bottom: charger, power path, 3V3 buck, MAX17048, ADS1220 and passives
- Stackup: GND pour on every layer; inner2 (next to the bottom side) is a solid GND
  plane under the buck, the ADS1220 front end and the USB pair's inner1 run, and inner1
  under its top-side run (`lib/gndPlane.ts`); signals run on the other layers and the
  rest of the inner layers. GND stitching vias at the module EPAD, the ADS1220 bypass
  capacitors and AVSS, the buck, the USB pair's vias and the board edges
- Design rules (PCBWay): 5/5 mil track/space, vias 0.3 mm drill / 0.5 mm pad,
  0.3 mm copper-to-edge

## ADS1220 hookup

| ADS1220 | Net |
| --- | --- |
| AVDD, DVDD | 3V3 |
| REFP0 | load cell E+: 3V3 through 10 Ω (R22), 1 µF to GND (C14) |
| REFN0, AIN3/REFN1 | load cell E−, switched to AVSS by the internal low-side switch |
| AVSS, DGND, CLK, EP | GND |
| SCLK / DIN / DOUT/DRDY / CS | GPIO5 / GPIO4 / GPIO1 / GPIO3, CS pulled up to 3V3 (100 kΩ) |
| DRDY | GPIO0 |
| AIN0 / AIN1 | load cell S+ / S− through a GHz ferrite (FB1/FB2, at J3) and 1 kΩ each, 10 nF C0G differential (~8 kHz), 22 pF and 1 nF C0G to GND each |
| AIN2 | not connected |

The bridge is powered only while the low-side switch is closed: firmware must set
`PSW = 1` (config register 2), which closes the switch on START/SYNC and opens it on
POWERDOWN. REFP0 and REFN0 sense the bridge on both sides, so the reference stays
ratiometric across R22 and the switch.

Wire pads: J3 `E+ S+ S- E-` (E+ = filtered 3V3, E− = low-side switch), J4 `SW- SW+ B+ B-` (SW+ = B+, SW− = power-path input).
v2.0.0 names these the other way round: its `SW+` pad is the power-path input and `VBAT` is the battery.
J3's labels are on the bottom side only: FB1/FB2 sit next to its pads on the top side.

## Changes vs v2.0.0 beyond the ADC

- HX711 support parts (Q1, R5, R6, C11 VBG) removed; ADS1220 decoupling added.
- Load cell excitation switched off in power-down by the ADS1220 low-side switch
  (v2.0.0 turns the HX711 E+ regulator off instead).
- Smaller, equivalent parts: L1 FTC252012S2R2MBCA (2520, 2.2 µH, 3 A), D2/D8 B5819WS (SOD-323).
- RGB LED: XL-2121RGBC-2812B (2 × 2 mm, WS2812 protocol). Its datasheet gives
  3.0–5.5 V only as the supply limit and full function at 4.5–5.5 V, so at 3.3 V
  blue and green may be dim; the WS2812B-5050 (3.7–5.3 V) was also run at 3.3 V.
- Added: 4.7 kΩ I2C pull-ups (MAX17048), 100 nF at the RGB LED, a battery GND pad (B−).
- ADS1220 100 nF bypass capacitors (C11, C13) 0.5 mm from AVDD/DVDD, with GND vias at
  their GND pads; 3V3 reaches their pads before the pins (from the 3V3 trunk through C13).
- RGB LED fed through a 0 Ω link (R24) whose 3V3 side doesn't run along the ADS1220
  supply path (`scripts/drc.ts` checks this).
- USB-C shield tied directly to GND (R17 0 Ω removed).
- 3V3 buck laid out after the SY8088 layout notes, with its power copper routed by hand:
  C15's GND pad lines up with the gap between FB and IN, so a 0.8 mm strap reaches
  the GND pin under the package; C17's GND pad joins C15's; LX reaches L1 in 0.7 mm;
  the feedback divider sits at the FB pin and senses 3V3 at C17.
- 3V3 from C17 to the ESP32 decoupling (D3, C4, C2, C1, C9) is a 0.4 mm hand-routed
  trunk (v2.0.0 used up to 0.61 mm).
- ESD diode and receptacle GND pads are tied by hand to the J2 GND pins, the shell legs
  and (D7) a via.
- USB D-/D+ run as a pair (0.15 mm at 0.3 mm pitch) from the ESD diodes to IO18/IO19:
  on inner1 over a solid inner2 GND region, then through a via pair below U1 and on the
  top side over a solid inner1 region. The lengths differ by 0.3 mm; `scripts/drc.ts`
  (`usbPair`) checks that both run on the same layers within 0.5 mm. No impedance
  control is ordered: at USB full speed (12 Mbit/s) these 16 mm are electrically short.
- Download-mode recovery: bottom-side pads under U1, EN (TP1), GND (TP2) and BOOT
  (TP3, IO9), 1.5 mm apart. Hold BOOT to GND and tap EN to GND (tweezers bridge
  neighbouring pads). With the battery switch off, plugging USB in is a power-on
  reset, so holding BOOT while plugging in does the same. A 10 kΩ pull-up (R25)
  holds IO8 high, which download mode needs.
- RF filtering of the load cell inputs against BLE TX pickup (#23): on the KiCad
  revision-3 board, BLE transmissions add spikes of up to 0.98 kg that enter at AIN0/AIN1.
  Each input has, between its 1 kΩ resistor and the pin, 22 pF C0G to GND (self-resonant
  near 2.4 GHz; C20, C21) and 1 nF C0G common-mode to GND (C22, C23, a tenth of C12),
  and S+/S− have GHz ferrites (BLM15HG102SN1D, FB1, FB2) at J3. Vias can't go under
  U1's left pad column, so AIN0's capacitors return to C11's GND via and AIN1's to U1's
  GND20 pad (C21, through a via) and C3's GND pad (C23). S+/S− run side by side on
  inner1, 0.35 mm apart from beside U3 down to the ferrites.
- The buck EN pull-up (R14) gets VSYS from U6.IN over inner1: on the bottom side the GND
  strap, U6 and L1 close U6.IN off from the feedback divider column.
- All copper is fixed (see Routing): hand-written traces for the buck, the 3V3 trunk,
  the USB and ESD fan-out, the charger signals, U5's I2C and alert, the ADS1220 fan-out,
  front end and supply, the load cell lines and the RGB LED corner; generated routes
  for the other nets.

## Verify

```sh
bun install --frozen-lockfile   # exact tool versions from bun.lock
npm run verify   # netlist + routing baselines, placement, schematic, build, per-check DRC,
                 # gerber shorts, fab paste and copper
npm run fab      # PCBWay package in dist/fab/
```

`scripts/drc.ts` runs every PCB check individually because the built-in DRC
aborts when its copper-pour check crashes, and adds minimum trace width, inner-layer
GND plane, 3V3 supply topology (at most 3 mm of the buck -> U1 3V3 path below
0.25 mm), USB pair and through-via checks. The board sets `isViaInPadAllowed` for C13's 3V3 via,
the only via whose drill overlaps a pad (there is no room for it between C13's pads);
`scripts/drc.ts` runs `checkViasInPads` without that flag and fails any other via in
a pad.
`scripts/netlist.py` and `scripts/routing.py` compare
connectivity and routed copper against `scripts/netlist.expected.json` and
`scripts/routing.expected.json`.

`scripts/fab-json.ts` fixes the paste and GND pours in the copy of `circuit.json`
that `npm run fab` exports, and checks the result: tscircuit leaves pill and
polygon pads without paste, shrinks all paste to 49 % of the pad area, pastes
every plated hole on both sides, and leaves floating pour copper. It also
unrotates the pads at multiples of 90° (size swapped): tscircuit flashes rounded
rotated pads with a `%LR` load rotation that some CAM tools ignore, and `npm run fab`
fails if any `%LR` is left.

Every via is a through via: the board is ordered as a standard 4-layer stackup.
tscircuit core gives vias in fixed traces (non-empty `pcbPath`) only the layers they
join, which exports blind/buried drill files with GND pour over their drill on the
other layers; `scripts/patch-core.mjs` (run on install) gives them all layers, as
core already does for autorouted vias. `scripts/drc.ts` (`throughVias`) fails on
any via that doesn't span all layers, and `npm run fab` fails on any drill file
besides `drill-PTH.drl` and `drill-NPTH.drl`.

`npm run fab` also joins each slot (J2's shell legs) onto one `X..Y..G85X..Y..`
line: the exporter puts the start hit and `G85` on separate lines, which GerbView
reads as one route through the following holes, and `npm run fab` fails if a `G85`
line is left without its start. The zip leaves out `F_Fab.gbr` and `B_Fab.gbr`
(assembly outlines, which the assembly drawings carry).

## Online viewer

<https://tscircuit.crimpdeq.com> serves the PCB, schematic and 3D viewer as a
static site on Cloudflare Pages (project `crimpdeq-tscircuit`).
`.github/workflows/site.yml` rebuilds and deploys it on every push to `main`
(repository secret `CLOUDFLARE_API_TOKEN`, Cloudflare Pages: Edit). Both the
workflow and `npm run site` refuse to publish a routing that differs from
`scripts/routing.expected.json`.

```sh
npm run site          # static site in dist/site/
npm run site:deploy   # build and upload it (needs `npx wrangler login`)
```

## PCBWay order

`dist/fab/` contains `pcbway_gerbers.zip` (Gerbers + drills), `pcbway_bom.csv`
(grouped by manufacturer part number, with LCSC codes as sourcing hints and
substitution notes), `pcbway_centroid.csv` (mm, origin at the board center) and
top/bottom assembly drawings from `scripts/assembly.ts` (bottom mirrored, as seen
from below; the corner triangle marks pin 1, or the cathode of diodes and LEDs).

`.github/workflows/release.yml` builds the same package on every published GitHub
release, after `npm run verify` passes, and attaches it to the release as
`crimpdeq-tscircuit-<tag>-*` with a `SHA256SUMS` file. Pull requests that change
the fab scripts and manual runs only build it, as a workflow artifact.

Quote settings: 4 layers, 17 × 31.5 mm, 1.6 mm FR-4, min track/spacing 5/5 mil,
min hole 0.3 mm, assembly on both sides. The centroid rotations come from
tscircuit; ask PCBWay to confirm orientation against the assembly drawings.

Assembly notes for PCBWay:

- Reflow the bottom side first; the top carries the heavy parts (U1, J2).
- J2's four shell legs are pin-in-paste in the top reflow: top paste over the leg
  pads, none on the bottom.
- The J3/J4 wire pads have no paste; the load cell and battery wires are
  hand-soldered afterwards.
- Paste is 1:1 on normal pads and 50–60 % on the thermal pads (U1 EPAD, U3 and
  U5 exposed pads).

## Routing

All copper is fixed; the autorouter has nothing left to route.

- GND is left to the GND pours on all four layers and the stitching vias.
  `lib/gndPlaneRouter.ts` removes it from the autorouter input, and
  `checkEachPcbPortConnectedToPcbTraces` fails if any GND pad ends up on its own
  copper island (a pad boxed in by other traces needs a via or a trace of its own,
  as C14's and U1.GND4's do).
- Traces with a layout intent are written by hand in `index.circuit.tsx` (see the
  design changes above).
- The other nets (VSYS, VBUS, VBAT, the rest of 3V3, the SPI clock and data, CS,
  LED data, CHIP_PU, BOOT) are generated into `lib/handRoutes.ts` by
  `scripts/handroute.sh`. It builds the board without them and without the
  autorouter (`GND_ROUTER_SKIP=1`), then `scripts/handroute.ts` routes the nets in
  `scripts/handroute.json`, in that order, on a 0.05 mm grid over the four layers:
  0.127 mm to other nets, vias 0.15 mm from pads, through vias that block every
  layer, and the GND plane regions kept clear.

After a change to placement, footprints or the hand-written traces:

```sh
scripts/handroute.sh             # regenerates lib/handRoutes.ts
npm run verify                   # fails on the routing baseline: expected
python3 scripts/routing.py --update && npm run verify
```

If a net doesn't route, `scripts/handroute.sh` fails and leaves `lib/handRoutes.ts`
unchanged: move it earlier in `scripts/handroute.json` (earlier nets get the room) or
change the hand-written traces around it.

Hand-written traces are `<trace>` elements with a non-empty `pcbPath`
(`pcbPath={[toPort]}` for a straight line between pad centers): core fixes only
those, and the autorouter routed across `pcbPath={[]}` ones. `pcbStraightLine` ends
traces at the pad edge, and tscircuit then attaches the end to whichever pad covers
that point on any layer (here U1's pads on the top side). Core limits traces to a
power-to-ground capacitor to 1 mm and skips autorouting (and fails the build) if a
fixed trace is longer; capacitors with longer fixed traces set
`maxDecouplingTraceLength`.

The tscircuit autorouter is deterministic, but at this density it left via-to-pad
violations and shorts that its own DRC misses, routed across fixed traces, and placed
vias it checked on only some of the layers they cross. `scripts/search.py` (nudges
passives until the board routes clean) and its output depending on the platform
(macOS arm64 against Linux x64) only matter again if nets are left to it.
`lib/gndPlaneRouter.ts` keeps it in place: the stock solver with GND removed and the
`unbroken` inner-layer GND pours detached from GND, so they only keep other nets out.
Attached, the router escaped nearby GND pads into the pour with vias whose clearance
it checked only between the pad and pour layers; built as through vias, they landed
on pads on the other side (L1, C16, C17, C11, C12). Routing on only three layers (all
of inner2 reserved) left the board unroutable.

## Prompting AI agents

Agents follow `AGENTS.md` and the vendored tscircuit skill. tscircuit's
[prompting guide](https://docs.tscircuit.com/guides/circuit-generation/generating-circuit-boards-with-ai)
is written for new boards; a prompt for a change to this one should state:

- Goal: the change and why.
- Scope: the parts, nets or board area, by reference designator or net name.
- Parts: the manufacturer part number of new or changed parts.
- Side effects: whether placement, routed copper or connectivity may change, and whether
  to regenerate `dist/fab/`.
- Done: `npm run verify` passes, plus anything to inspect (PCB image, DRC result).

```text
<Change> because <reason>.
Affected: <reference designators, nets or board area>.
New parts: <manufacturer part number> (LCSC <code> as a sourcing hint).
May change: <placement | hand-written traces | generated routes | netlist | dist/fab/>.
Keep fixed: <parts or traces that must not move or reroute>.
Done when npm run verify passes; show the netlist and routing diffs before
updating their baselines.
```

## License

This repository is source-available for personal and educational use only.

Commercial manufacture, sale of PCBs, sale of 3D-printed cases, kits, or assembled Crimpdeq devices requires prior written permission.

The vendored tscircuit skill in `.agents/skills/tscircuit/` keeps its own MIT license.
