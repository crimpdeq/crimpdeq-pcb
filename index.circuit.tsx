import { ADS1220IRVAR } from "./imports/ADS1220IRVAR"
import { B5819WS } from "./imports/B5819WS"
import { DMG3415U_7 } from "./imports/DMG3415U_7"
import { FTC252012S2R2MBCA } from "./imports/FTC252012S2R2MBCA"
import { ESP32_C3_MINI_1_N4 } from "./imports/ESP32_C3_MINI_1_N4"
import { LESD5D5_0CT1G } from "./imports/LESD5D5_0CT1G"
import { LESD8D3_3CAT5G } from "./imports/LESD8D3_3CAT5G"
import { MAX17048G_T10 } from "./imports/MAX17048G_T10"
import { MCP73831T_2ACI_OT } from "./imports/MCP73831T_2ACI_OT"
import { SY8088IAAC } from "./imports/SY8088IAAC"
import { TYPE_C_31_M_12 } from "./imports/TYPE_C_31_M_12"
import { XL_2121RGBC_2812B } from "./imports/XL_2121RGBC_2812B"
import { WirePads } from "./lib/WirePads"
import { GND_PLANE_REGIONS } from "./lib/gndPlane"
import { gndPlaneAutorouter } from "./lib/gndPlaneRouter"
import { HAND_ROUTES } from "./lib/handRoutes"

// ESP32-C3-MINI-1 footprint origin is the pad-array center; the antenna
// region spans y = +5.6..+11.0 from it.
const U1_Y = 4.4

// Board outline: 17 x 25.75 mm, antenna at +Y. The board ends where the antenna
// starts, so the antenna overhangs it (Espressif: place the PCB antenna outside
// the base board, cut off any board under it); U1's top pads end 0.3 mm from
// the edge. Coordinates keep the origin of the earlier 31.5 mm board, whose
// top edge was at the antenna tip.
const W = 17
const BOTTOM = -15.75
const TOP = U1_Y + 5.6
const L = TOP - BOTTOM
const CENTER_Y = (TOP + BOTTOM) / 2

// Routing keepout band along the board edges
const EDGE_BAND = 0.35

// USB-C receptacle front face sits 5.39 mm below the footprint origin. It
// overhangs the board edge so the plug reaches it through the case wall; the
// front shell-leg slots limit this to ~1.2 mm (0.5 mm of board around them).
const USB_OVERHANG = 1.0
const J2_Y = BOTTOM + 5.39 - USB_OVERHANG

// Passive parts: manufacturer part number + distributor code (LCSC) for PCBWay sourcing
const PARTS = {
  R0: { mpn: "0402WGF0000TCE", lcsc: "C17168" },
  R10: { mpn: "0402WGF100JTCE", lcsc: "C25077" },
  R1k: { mpn: "0402WGF1001TCE", lcsc: "C11702" },
  R4k7: { mpn: "0402WGF4701TCE", lcsc: "C25900" },
  R5k1: { mpn: "0402WGF5101TCE", lcsc: "C25905" },
  R10k: { mpn: "0402WGF1002TCE", lcsc: "C25744" },
  R22k1: { mpn: "0402WGF2212TCE", lcsc: "C43473" },
  R100k: { mpn: "0402WGF1003TCE", lcsc: "C25741" },
  C22p: { mpn: "0402CG220J500NT", lcsc: "C1555" },
  C10n: { mpn: "CL05B103KB5NNNC", lcsc: "C15195" },
  C10n_C0G: { mpn: "GRM1555C1E103JE01D", lcsc: "C3855387" },
  C1n_C0G: { mpn: "GRM1555C1H102JA01D", lcsc: "C76947" },
  C100n: { mpn: "CL05B104KO5NNNC", lcsc: "C1525" },
  C1u: { mpn: "CL05A105KA5NQNC", lcsc: "C52923" },
  C4u7_0603: { mpn: "CL10A475KO8NNNC", lcsc: "C19666" },
  C10u_0603: { mpn: "CL10A106KP8NNNC", lcsc: "C19702" },
  C10u_0805: { mpn: "CL21A106KAYNNNE", lcsc: "C15850" },
  LED_RED_0603: { mpn: "KT-0603R", lcsc: "C2286" },
  // GHz-band ferrite bead: 1 kOhm at 100 MHz, 250 mA, 1.1 Ohm DC
  FB_GHZ: { mpn: "BLM15HG102SN1D", lcsc: "C76889" },
}

const part = ({ mpn, lcsc }: { mpn: string; lcsc: string }) => ({
  manufacturerPartNumber: mpn,
  supplierPartNumbers: { lcsc: [lcsc] },
})

// <trace pcbPath> points are in the frame of the first port's component;
// convert board coordinates given that component's center and rotation.
// A point with a layer pair is a via between those layers.
type Layer = "top" | "inner1" | "inner2" | "bottom"
const boardPath = (
  [cx, cy, rotation]: [number, number, number],
  points: ([number, number] | [number, number, Layer, Layer])[],
) => {
  const a = (-rotation * Math.PI) / 180
  return points.map(([x, y, fromLayer, toLayer]) => ({
    x: (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a),
    y: (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a),
    ...(fromLayer && toLayer ? { via: true, fromLayer, toLayer } : {}),
  }))
}

// GND stitching vias [x, y]: U1 EPAD grid (thermal and RF return; at the corners
// where four squares meet, since the router fails on vias inside pads), the
// ADS1220 bypass and AVSS returns, the buck, the USB pair's via pair, the bottom
// pour between D2 and U5, and the board edges. Vias next to a GND pad (C9, C18)
// touch it with their ring; their drill stays off the pad.
const GND_VIAS: [number, number][] = [
  [-0.9875, 3.4125], [0.9875, 3.4125], [-0.9875, 5.3875], [0.9875, 5.3875],
  [-3.53, 1.7], [-2.05, 1.4], [-3.2, -5.5],
  [3.95, 6.4], [3.95, 7.65],
  [5.25, -3.5], [3.55, -1.45],
  [-7.5, 7.75], [-6.9, 2.5], [-4.7, -11.9], [-5.5, -14.5],
  [7.5, 3], [7.5, 0.5], [7.3, -1], [7.5, -3], [7.5, -6.5], [5.5, -9.5], [5.5, -13],
  [-2, -11.5], [2, -11.5], [0, -10.6], [-0.5, -4.4], [-4, -8], [4.5, -8],
]

// Bottom-side recovery pads (TP1-TP3), in a row under U1
const TEST_PAD_Y = 4.6
const TEST_PADS = [
  { name: "TP1", label: "EN", net: "net.CHIP_PU", x: -6.0 },
  { name: "TP2", label: "GND", net: "net.GND", x: -4.5 },
  { name: "TP3", label: "BOOT", net: "net.BOOT", x: -3.0 },
]

// Overrides the board's hidden silkscreen text
const VISIBLE_SILK = { "& silkscreentext": { visibility: "visible" } } as const

const esp32GndPins = [
  "GND1", "GND2", "GND3", "GND4", "GND5", "GND6", "GND7", "GND8", "GND9",
  "GND10", "GND11", "GND12", "GND13", "GND14", "GND15", "GND16", "GND17",
  "GND18", "GND19", "GND20", "GND21", "GND22", "GND23", "GND24", "GND25",
  "GND26", "GND27", "GND28", "GND29", "GND30",
] as const

export default ({ pours = true }: { pours?: boolean }) => (
  <board
    width={W}
    height={L}
    outlineOffsetY={CENTER_Y}
    layers={4}
    autorouter={{ algorithmFn: gndPlaneAutorouter }}
    thickness="1.6mm"
    doubleSidedAssembly
    borderRadius={1}
    // PCBWay 4-layer rules: 5/5 mil track/space, 0.3 mm drill / 0.5 mm vias
    minTraceWidth="0.127mm"
    nominalTraceWidth="0.15mm"
    minTraceToPadEdgeClearance="0.127mm"
    minBoardEdgeClearance="0.3mm"
    minViaEdgeToPadEdgeClearance="0.2mm"
    minViaHoleDiameter="0.3mm"
    minViaPadDiameter="0.5mm"
    // Only C13's 3V3 via overlaps a pad; scripts/drc.ts fails any other
    isViaInPadAllowed
    // No reference designators: at this size they are illegible. Only the
    // J3/J4 wire pad labels (lib/WirePads.tsx) and the EN/GND/BOOT labels.
    pcbStyle={{ viaPadDiameter: "0.5mm", viaHoleDiameter: "0.3mm", silkscreenTextVisibility: "hidden" }}
  >
    <net name="GND" isGroundNet />
    <net name="V3_3" isPowerNet nominalTraceWidth="0.25mm" />
    <net name="V3_3_LED" isPowerNet nominalTraceWidth="0.25mm" />
    <net name="LC_EP" nominalTraceWidth="0.25mm" />
    <net name="LC_EN" />
    <net name="VBUS_IN" isPowerNet nominalTraceWidth="0.3mm" />
    <net name="VBUS" isPowerNet nominalTraceWidth="0.3mm" />
    <net name="VSYS" isPowerNet nominalTraceWidth="0.3mm" />
    <net name="VBAT" isPowerNet nominalTraceWidth="0.3mm" />
    <net name="SW_BATT" isPowerNet nominalTraceWidth="0.3mm" />
    <net name="BUCK_LX" nominalTraceWidth="0.3mm" />

    <schematicsection name="usb" displayName="USB-C input + ESD" />
    <schematicsection name="charger" displayName="Li-ion charger" />
    <schematicsection name="pwrpath" displayName="USB / battery power path" />
    <schematicsection name="buck" displayName="3V3 buck" />
    <schematicsection name="mcu" displayName="ESP32-C3-MINI-1" />
    <schematicsection name="led" displayName="Indicators" />
    <schematicsection name="fuel" displayName="MAX17048 fuel gauge" />
    <schematicsection name="adc" displayName="ADS1220 load cell ADC" />
    <schematicsection name="decoupling" displayName="Decoupling (3V3 / VBAT)" />

    {/* ---------------- USB-C input ---------------- */}
    <TYPE_C_31_M_12
      name="J2"
      displayName="J2 - USB-C"
      pcbX={0}
      pcbY={J2_Y}
      schSectionName="usb"
      schX={-30}
      schY={10}
      connections={{
        VBUS1: "net.VBUS_IN",
        VBUS2: "net.VBUS_IN",
        GND1: "net.GND",
        GND2: "net.GND",
        SHELL1: "net.GND",
        SHELL2: "net.GND",
        SHELL3: "net.GND",
        SHELL4: "net.GND",
        CC1: "net.CC1",
        CC2: "net.CC2",
        DP1: "net.USB_DP",
        DP2: "net.USB_DP",
        DM1: "net.USB_DM",
        DM2: "net.USB_DM",
      }}
    />
    <resistor
      name="R19"
      resistance="5.1k"
      footprint="0402"
      {...part(PARTS.R5k1)}
      layer="bottom"
      pcbX={-2.5}
      pcbY={-7.9}
      pcbRotation={270}
      schSectionName="usb"
      schX={-21.5}
      schY={8.5}
      schRotation={-90}
      connections={{ pin1: "net.CC1", pin2: "net.GND" }}
    />
    <resistor
      name="R18"
      resistance="5.1k"
      footprint="0402"
      {...part(PARTS.R5k1)}
      layer="bottom"
      pcbX={2.5}
      pcbY={-7.9}
      pcbRotation={270}
      schSectionName="usb"
      schX={-20}
      schY={8.5}
      schRotation={-90}
      connections={{ pin1: "net.CC2", pin2: "net.GND" }}
    />
    <LESD5D5_0CT1G
      name="D9"
      displayName="D9 - LESD5D5.0"
      pcbX={-2.6}
      pcbY={-6.603}
      pcbRotation={180}
      schSectionName="usb"
      schX={-27.5}
      schY={7.5}
      connections={{ pin1: "net.VBUS_IN", pin2: "net.GND" }}
    />
    <LESD5D5_0CT1G
      name="D7"
      displayName="D7 - LESD5D5.0"
      pcbX={0.0}
      pcbY={-6.603}
      schSectionName="usb"
      schX={-25.5}
      schY={7.5}
      connections={{ pin1: "net.USB_DM", pin2: "net.GND" }}
    />
    <LESD5D5_0CT1G
      name="D10"
      displayName="D10 - LESD5D5.0"
      pcbX={2.6}
      pcbY={-6.603}
      schSectionName="usb"
      schX={-23.5}
      schY={7.5}
      connections={{ pin1: "net.USB_DP", pin2: "net.GND" }}
    />
    {/* ESD and receptacle GND returns by hand: D9/D10 to the J2 GND pins and
        the shell legs, D7 on the bottom to D10, around the D+ via (VBUS_IN and
        the USB lines box D7's GND pad in on the top side) */}
    <trace from=".D9 > .pin2" to=".J2 > .A1B12" thickness="0.25mm" pcbPath={[".J2 > .A1B12"]} />
    <trace from=".D10 > .pin2" to=".J2 > .B1A12" thickness="0.25mm" pcbPath={[".J2 > .B1A12"]} />
    <trace from=".J2 > .A1B12" to=".J2 > .EH3" thickness="0.25mm" pcbPath={[".J2 > .EH3"]} />
    <trace from=".J2 > .B1A12" to=".J2 > .EH2" thickness="0.25mm" pcbPath={[".J2 > .EH2"]} />
    <trace
      from=".D7 > .pin2"
      to=".D10 > .pin2"
      thickness="0.25mm"
      pcbPath={[
        ...boardPath([0, -6.603, 0], [
          [0.75, -7.3], [0.75, -7.3, "top", "bottom"], [0.75, -7.3],
          [1.1, -6.7], [3.0, -6.7],
          [3.35, -7.4], [3.35, -7.4, "bottom", "top"], [3.35, -7.4],
        ]),
        ".D10 > .pin2",
      ]}
    />
    {/* USB by hand. CC1/CC2: a via above each pin to its pull-down. D-: B7
        and A7 meet at D7; D+: A6 and B6 meet through two vias, then B6 to D10.
        From the ESD diodes D-/D+ run as a pair (0.15 mm at 0.3 mm pitch) on
        inner1 (VBUS_IN closes the top side) up and east to a via pair below
        U1's right pad column (U5 takes the bottom beside IO18/IO19), then on the
        top side to the pins; solid GND under both runs (lib/gndPlane.ts). Going
        up first leaves VBAT a way south on inner1; the lengths differ by 0.3 mm. */}
    <trace
      from=".J2 > .A5"
      to=".R19 > .pin1"
      pcbPath={[...boardPath([0, J2_Y, 0], [[-1.25, -8.05], [-1.25, -8.05, "top", "bottom"], [-1.25, -8.05]]), ".R19 > .pin1"]}
    />
    <trace
      from=".J2 > .B5"
      to=".R18 > .pin1"
      pcbPath={[...boardPath([0, J2_Y, 0], [[1.75, -8.05], [1.75, -8.05, "top", "bottom"], [1.75, -8.05]]), ".R18 > .pin1"]}
    />
    <trace from=".J2 > .B7" to=".D7 > .pin1" pcbPath={[".D7 > .pin1"]} />
    <trace
      from=".J2 > .A7"
      to=".D7 > .pin1"
      pcbPath={[...boardPath([0, J2_Y, 0], [[0.25, -7.6], [-0.45, -7.05]]), ".D7 > .pin1"]}
    />
    <trace
      from=".D7 > .pin1"
      to=".U1 > .IO18"
      thickness="0.15mm"
      pcbPath={[
        ...boardPath([0, -6.603, 0], [
          [-0.75, -7.25], [-0.75, -7.25, "top", "inner1"], [-0.75, -7.25],
          [-0.1, -6.6], [0.6, -6.6], [1.1, -6.1], [1.1, -3.05], [1.55, -2.6],
          [5.6, -2.6], [5.95, -2.25], [5.95, -2.25, "inner1", "top"], [5.95, -2.25],
          [6.505, -1.695], [6.505, 1.2],
        ]),
        ".U1 > .IO18",
      ]}
    />
    <trace
      from=".J2 > .A6"
      to=".J2 > .B6"
      pcbPath={[
        ...boardPath([0, J2_Y, 0], [
          [-0.25, -8.05], [-0.25, -8.05, "top", "bottom"], [-0.25, -8.05],
          [0.75, -8.05], [0.75, -8.05, "bottom", "top"], [0.75, -8.05],
        ]),
        ".J2 > .B6",
      ]}
    />
    <trace
      from=".J2 > .B6"
      to=".D10 > .pin1"
      pcbPath={[...boardPath([0, J2_Y, 0], [[0.75, -8.05], [1.25, -7.6], [1.85, -7.2]]), ".D10 > .pin1"]}
    />
    <trace
      from=".D10 > .pin1"
      to=".U1 > .IO19"
      thickness="0.15mm"
      pcbPath={[
        ...boardPath([2.6, -6.603, 0], [
          [1.7, -7.2], [1.7, -7.2, "top", "inner1"], [1.7, -7.2],
          [1.4, -6.9], [1.4, -3.174], [1.674, -2.9], [5.35, -2.9], [5.45, -3.0],
          [5.95, -3.0], [5.95, -3.0, "inner1", "top"], [5.95, -3.0],
          [6.805, -2.145], [6.805, 2.0],
        ]),
        ".U1 > .IO19",
      ]}
    />
    {/* VBUS_IN on the top side, clear of J2's locating holes (the router passed
        them at 0.035 mm): A4B9 to the ESD diode, over the ESD diodes to B4A9
        (between D10 and its GND return) and on to D8 */}
    <trace
      from=".J2 > .A4B9"
      to=".D9 > .pin1"
      thickness="0.3mm"
      pcbPath={[...boardPath([0, J2_Y, 0], [[-2.4, -8.3], [-1.85, -7.2]]), ".D9 > .pin1"]}
    />
    <trace
      from=".D9 > .pin1"
      to=".J2 > .B4A9"
      thickness="0.3mm"
      pcbPath={[...boardPath([-2.6, -6.603, 180], [[-1.85, -5.9], [2.6, -5.9], [2.6, -8.4]]), ".J2 > .B4A9"]}
    />
    <trace
      from=".J2 > .B4A9"
      to=".D8 > .anode"
      thickness="0.3mm"
      pcbPath={[...boardPath([0, J2_Y, 0], [[2.6, -8.4], [2.6, -5.9], [5.0, -5.9]]), ".D8 > .anode"]}
    />
    {/* Reverse/backfeed blocking between the USB connector and VBUS */}
    <B5819WS
      name="D8"
      displayName="D8 - B5819WS"
      pcbX={6.55}
      pcbY={-5.628}
      schSectionName="usb"
      schX={-25.5}
      schY={11.5}
      schRotation={-90}
      connections={{ anode: "net.VBUS_IN", cathode: "net.VBUS" }}
    />

    {/* ---------------- Li-ion charger ---------------- */}
    <MCP73831T_2ACI_OT
      name="U2"
      displayName="U2 - MCP73831"
      schHeight={0.6}
      layer="bottom"
      pcbX={-1.7}
      pcbY={-13.85}
      pcbRotation={90}
      schSectionName="charger"
      schX={-11.5}
      schY={10}
      connections={{
        VDD: "net.VBUS",
        VSS: "net.GND",
        VBAT: "net.VBAT",
        PROG: "net.CHG_PROG",
        STAT: "net.CHG_STAT",
      }}
    />
    <capacitor
      name="C5"
      // charger input: also the VBUS link to Q2 and U2 (lib/handRoutes.ts)
      maxDecouplingTraceLength="12mm"
      capacitance="4.7uF"
      maxVoltageRating="16V"
      footprint="0603"
      {...part(PARTS.C4u7_0603)}
      layer="bottom"
      pcbX={0.0}
      pcbY={-9.45}
      schSectionName="charger"
      schX={-15.5}
      schY={10}
      schRotation={-90}
      connections={{ pin1: "net.VBUS", pin2: "net.GND" }}
    />
    <capacitor
      name="C6"
      capacitance="4.7uF"
      maxVoltageRating="16V"
      footprint="0603"
      {...part(PARTS.C4u7_0603)}
      layer="bottom"
      // also the VBAT junction to the battery pad (hand-routed, 8.2 mm); core
      // otherwise limits capacitor traces to 1 mm and skips autorouting
      maxDecouplingTraceLength="9mm"
      pcbX={1.8}
      pcbY={-14.8}
      pcbRotation={180}
      schSectionName="fuel"
      schX={0}
      schY={-8.5}
      schRotation={-90}
      connections={{ pin1: "net.VBAT", pin2: "net.GND" }}
    />
    {/* 4.7k PROG -> 213 mA charge current (1000 V / R_PROG) */}
    <resistor
      name="R2"
      resistance="4.7k"
      footprint="0402"
      {...part(PARTS.R4k7)}
      layer="bottom"
      pcbX={1.2}
      pcbY={-12.9}
      pcbRotation={90}
      schSectionName="charger"
      schX={-7.5}
      schY={9.5}
      schRotation={-90}
      connections={{ pin1: "net.CHG_PROG", pin2: "net.GND" }}
    />
    <resistor
      name="R3"
      resistance="1k"
      footprint="0402"
      {...part(PARTS.R1k)}
      layer="bottom"
      pcbX={2.3}
      pcbY={-12.9}
      pcbRotation={90}
      schSectionName="charger"
      schX={-12.5}
      schY={7}
      schRotation={0}
      connections={{ pin1: "net.CHG_STAT", pin2: "net.CHG_LED_K" }}
    />
    {/* led0603 closes the silkscreen outline at the cathode, as assemblers expect;
        plain 0603 closes it at pin 1, the anode */}
    <led
      name="D1"
      displayName="D1 - Charge LED"
      color="red"
      footprint="led0603"
      {...part(PARTS.LED_RED_0603)}
      pcbX={4.1}
      pcbY={-3.403}
      pcbRotation={90}
      schSectionName="charger"
      schX={-15}
      schY={6}
      schRotation={-90}
      connections={{ anode: "net.VBUS", cathode: "net.CHG_LED_K" }}
    />
    <WirePads
      name="J4"
      displayName="J4 - Battery"
      schSectionName="charger"
      schX={-7}
      schY={6}
      // Switch wires on their own pads; SW+ next to B+ keeps the VBAT link short
      pads={[
        { label: "SW_N", silk: "SW-" },
        { label: "SW_P", silk: "SW+" },
        { label: "BAT_P", silk: "B+" },
        { label: "BAT_N", silk: "B-" },
      ]}
      silkOffsetX={-1.6}
      pcbX={7.0}
      pcbY={-11.1}
      connections={{
        SW_N: "net.SW_BATT",
        SW_P: "net.VBAT",
        BAT_P: "net.VBAT",
        BAT_N: "net.GND",
      }}
    />

    {/* VBAT from the battery pad to the charger output by hand: 0.2 mm through
        the gap between R2/R3 and C6's GND pad (the router put a via 0.03 mm
        from that pad), then between J2's EH1 and EH2 shell-leg slots */}
    <trace
      from=".C6 > .pin1"
      to=".J4 > .pin3"
      thickness="0.2mm"
      pcbPath={[...boardPath([1.8, -14.8, 180], [[1.2, -14.05], [3.3, -14.05], [3.3, -12.5], [6.0, -12.3]]), ".J4 > .pin3"]}
    />
    <trace from=".C6 > .pin1" to=".U2 > .VBAT" thickness="0.3mm" pcbPath={[".U2 > .VBAT"]} />
    <trace from=".J4 > .pin2" to=".J4 > .pin3" thickness="0.3mm" pcbPath={[".J4 > .pin3"]} />

    {/* Charger signals by hand: PROG above U2's pins to R2, STAT between R2's
        pads to R3, and the charge LED cathode from R3 up the bottom (between
        J2's locating hole and EH2 slot, then between R9 and Q2) to D1 */}
    <trace
      from=".U2 > .PROG"
      to=".R2 > .pin1"
      pcbPath={[...boardPath([-1.7, -13.85, 90], [[-2.86, -12.2], [0.95, -12.2]]), ".R2 > .pin1"]}
    />
    <trace
      from=".U2 > .STAT"
      to=".R3 > .pin1"
      thickness="0.127mm"
      pcbPath={[...boardPath([-1.7, -13.85, 90], [[2.3, -12.9]]), ".R3 > .pin1"]}
    />
    <trace
      from=".R3 > .pin2"
      to=".D1 > .pin2"
      thickness="0.127mm"
      pcbPath={[
        ...boardPath([2.3, -12.9, 90], [
          [2.9, -13.41], [2.9, -11.9], [3.465, -11.2], [3.465, -9.0], [4.05, -8.3],
          [4.05, -2.5], [4.1, -1.9], [4.1, -1.9, "bottom", "top"], [4.1, -1.9],
        ]),
        ".D1 > .pin2",
      ]}
    />
    <trace
      from=".Q2 > .pin3"
      to=".J4 > .pin1"
      thickness="0.3mm"
      pcbPath={[...boardPath([5.9, -5.406, 0], [[6.85, -6.0], [6.85, -7.2]]), ".J4 > .pin1"]}
    />

    {/* ---------------- Power path ---------------- */}
    <B5819WS
      name="D2"
      displayName="D2 - B5819WS"
      layer="bottom"
      pcbX={1.6}
      pcbY={-3.678}
      schSectionName="pwrpath"
      schX={1}
      schY={11}
      schRotation={90}
      connections={{ anode: "net.VBUS", cathode: "net.VSYS" }}
    />
    {/* Battery -> VSYS switch, turned off while VBUS is present */}
    <DMG3415U_7
      name="Q2"
      displayName="Q2 - DMG3415U"
      layer="bottom"
      pcbX={5.9}
      pcbY={-5.406}
      schSectionName="pwrpath"
      schX={5}
      schY={9}
      connections={{ G: "net.VBUS", S: "net.VSYS", D: "net.SW_BATT" }}
    />
    <resistor
      name="R9"
      resistance="100k"
      footprint="0402"
      {...part(PARTS.R100k)}
      layer="bottom"
      pcbX={3.5}
      pcbY={-6.337}
      pcbRotation={90}
      schSectionName="pwrpath"
      schX={1}
      schY={7.5}
      schRotation={-90}
      connections={{ pin1: "net.VBUS", pin2: "net.GND" }}
    />
    <capacitor
      name="C15"
      capacitance="10uF"
      maxVoltageRating="25V"
      footprint="0805"
      {...part(PARTS.C10u_0805)}
      layer="bottom"
      pcbX={4.863}
      pcbY={4.68}
      schSectionName="pwrpath"
      schX={9}
      schY={9}
      schRotation={-90}
      connections={{ pin1: "net.VSYS", pin2: "net.GND" }}
    />

    {/* ---------------- 3V3 buck ---------------- */}
    <SY8088IAAC
      name="U6"
      displayName="U6 - SY8088"
      schHeight={0.6}
      layer="bottom"
      pcbX={3.95}
      pcbY={7.65}
      pcbRotation={180}
      schSectionName="buck"
      schX={18}
      schY={10}
      connections={{
        IN: "net.VSYS",
        EN: "net.BUCK_EN",
        GND: "net.GND",
        LX: "net.BUCK_LX",
        FB: "net.BUCK_FB",
      }}
    />
    <resistor
      name="R14"
      resistance="10k"
      footprint="0402"
      {...part(PARTS.R10k)}
      layer="bottom"
      pcbX={1.35}
      pcbY={9.22}
      pcbRotation={180}
      schSectionName="buck"
      schX={14.5}
      schY={11.5}
      schRotation={-90}
      connections={{ pin1: "net.VSYS", pin2: "net.BUCK_EN" }}
    />
    <FTC252012S2R2MBCA
      name="L1"
      layer="bottom"
      pcbX={6.97}
      pcbY={7.805}
      pcbRotation={90}
      schSectionName="buck"
      schX={22}
      schY={10.8}
      schRotation={0}
      connections={{ pin1: "net.BUCK_LX", pin2: "net.V3_3" }}
    />
    {/* VOUT = 0.6 V * (1 + 100k / 22.1k) = 3.31 V */}
    <resistor
      name="R15"
      resistance="100k"
      footprint="0402"
      {...part(PARTS.R100k)}
      layer="bottom"
      pcbX={1.35}
      pcbY={6.34}
      pcbRotation={180}
      schSectionName="buck"
      schX={25}
      schY={9}
      schRotation={-90}
      connections={{ pin1: "net.V3_3", pin2: "net.BUCK_FB" }}
    />
    <capacitor
      name="C16"
      capacitance="22pF"
      footprint="0402"
      {...part(PARTS.C22p)}
      layer="bottom"
      pcbX={1.35}
      pcbY={7.3}
      pcbRotation={180}
      schSectionName="buck"
      schX={26.5}
      schY={9}
      schRotation={-90}
      connections={{ pin1: "net.V3_3", pin2: "net.BUCK_FB" }}
    />
    <resistor
      name="R16"
      resistance="22.1k"
      footprint="0402"
      {...part(PARTS.R22k1)}
      layer="bottom"
      pcbX={1.35}
      pcbY={8.26}
      pcbRotation={0}
      schSectionName="buck"
      schX={25}
      schY={6.5}
      schRotation={-90}
      connections={{ pin1: "net.BUCK_FB", pin2: "net.GND" }}
    />
    <capacitor
      name="C17"
      capacitance="10uF"
      maxVoltageRating="25V"
      footprint="0805"
      {...part(PARTS.C10u_0805)}
      layer="bottom"
      pcbX={2.23}
      pcbY={3.85}
      pcbRotation={270}
      schSectionName="decoupling"
      schX={-15.0}
      schY={-17.5}
      schRotation={-90}
      connections={{ pin1: "net.V3_3", pin2: "net.GND" }}
    />
    {/* Buck power copper, routed by hand (SY8088 layout notes). Input loop: C15
        sits at IN, and its GND pad lines up with the gap between FB and IN, so a
        0.8 mm bottom-layer strap reaches the GND pin under the package, with
        two GND vias on it. C17's GND pad joins C15's, and LX reaches L1 in 0.7 mm. */}
    <trace from=".C15 > .pin2" to=".U6 > .GND" thickness="0.8mm" pcbPath={[".U6 > .GND"]} />
    <trace from=".C17 > .pin2" to=".C15 > .pin2" thickness="0.8mm" pcbPath={[".C15 > .pin2"]} />
    <trace from=".C15 > .pin1" to=".U6 > .IN" thickness="0.5mm" pcbPath={[".U6 > .IN"]} />
    <trace from=".U6 > .LX" to=".L1 > .pin1" thickness="0.6mm" pcbPath={[".L1 > .pin1"]} />
    {/* L1 -> C17 around C15, and the 3V3 trunk from C17 along the ESP32
        decoupling (D3, C4, C2, C1, C9 at U1 3V3) */}
    <trace
      from=".L1 > .pin2"
      to=".C17 > .pin1"
      thickness="0.4mm"
      pcbPath={boardPath([6.97, 7.805, 90], [[6.8, 6.5], [6.8, 3.35], [3.2, 3.35]])}
    />
    <trace
      from=".C17 > .pin1"
      to=".D3 > .pin1"
      thickness="0.4mm"
      pcbPath={boardPath([2.23, 3.85, 270], [[1.8, 2.6], [-2.0, 2.6], [-2.0, 8.675]])}
    />
    <trace from=".D3 > .pin1" to=".C4 > .pin1" thickness="0.4mm" pcbPath={[".C4 > .pin1"]} />
    <trace from=".C4 > .pin1" to=".C2 > .pin1" thickness="0.4mm" pcbPath={[".C2 > .pin1"]} />
    <trace from=".C2 > .pin1" to=".C1 > .pin1" thickness="0.4mm" pcbPath={[".C1 > .pin1"]} />
    <trace from=".C1 > .pin1" to=".C9 > .pin1" thickness="0.4mm" pcbPath={[".C9 > .pin1"]} />
    {/* Feedback: divider at the FB pin, sensing 3V3 at C17 */}
    <trace
      from=".R15 > .pin1"
      to=".C17 > .pin1"
      thickness="0.15mm"
      pcbPath={boardPath([1.35, 6.34, 180], [[0.45, 6.0], [0.45, 2.95]])}
    />
    <trace from=".C16 > .pin1" to=".R15 > .pin1" thickness="0.15mm" pcbPath={[".R15 > .pin1"]} />
    <trace from=".R15 > .pin2" to=".U6 > .FB" thickness="0.15mm" pcbPath={[".U6 > .FB"]} />
    <trace from=".C16 > .pin2" to=".R15 > .pin2" thickness="0.15mm" pcbPath={[".R15 > .pin2"]} />
    <trace from=".R16 > .pin1" to=".C16 > .pin2" thickness="0.15mm" pcbPath={[".C16 > .pin2"]} />
    <trace from=".R14 > .pin2" to=".U6 > .EN" thickness="0.15mm" pcbPath={[".U6 > .EN"]} />
    {/* EN pull-up supply: the bottom layer around U6.IN is closed by the GND
        strap, U6 and L1, so VSYS reaches R14 on inner1 */}
    <trace
      from=".U6 > .IN"
      to=".R14 > .pin1"
      thickness="0.15mm"
      pcbPath={boardPath([3.95, 7.65, 180], [
        [4.85, 5.75], [4.85, 5.75, "bottom", "inner1"], [4.85, 5.75],
        [1.6, 5.75], [0.05, 7.3],
        [0.05, 8.0], [0.05, 8.0, "inner1", "bottom"], [0.05, 8.0],
        [0.05, 8.9],
      ])}
    />

    {/* ---------------- ESP32-C3 ---------------- */}
    <ESP32_C3_MINI_1_N4
      name="U1"
      displayName="U1 - ESP32-C3-MINI-1"
      schHeight={6.2}
      pcbX={0}
      pcbY={U1_Y}
      schSectionName="mcu"
      schX={-23}
      schY={-10}
      connections={{
        "3V3": "net.V3_3",
        EN: "net.CHIP_PU",
        IO0: "net.ADC_DRDY",
        IO1: "net.ADC_DOUT",
        IO2: "net.LED_DATA",
        IO3: "net.ADC_CS",
        IO4: "net.ADC_DIN",
        IO5: "net.ADC_SCLK",
        IO6: "net.I2C_SDA",
        IO7: "net.I2C_SCL",
        IO8: "net.IO8_PU",
        IO9: "net.BOOT",
        IO10: "net.FG_ALRT",
        IO18: "net.USB_DM",
        IO19: "net.USB_DP",
        ...Object.fromEntries(esp32GndPins.map((pin) => [pin, "net.GND"])),
      }}
    />
    <capacitor
      name="C9"
      // also the 3V3 link to U1.3V3 (lib/handRoutes.ts)
      maxDecouplingTraceLength="5mm"
      capacitance="10uF"
      footprint="0603"
      {...part(PARTS.C10u_0603)}
      layer="bottom"
      pcbX={-7.4}
      pcbY={8.0}
      pcbRotation={90}
      schSectionName="decoupling"
      schX={-13.75}
      schY={-17.5}
      schRotation={-90}
      connections={{ pin1: "net.V3_3", pin2: "net.GND" }}
    />
    <capacitor
      name="C1"
      capacitance="1uF"
      footprint="0402"
      {...part(PARTS.C1u)}
      layer="bottom"
      pcbX={-6.0}
      pcbY={8.15}
      pcbRotation={90}
      schSectionName="decoupling"
      schX={-12.5}
      schY={-17.5}
      schRotation={-90}
      connections={{ pin1: "net.V3_3", pin2: "net.GND" }}
    />
    <capacitor
      name="C2"
      capacitance="100nF"
      footprint="0402"
      {...part(PARTS.C100n)}
      layer="bottom"
      pcbX={-4.9}
      pcbY={8.15}
      pcbRotation={90}
      schSectionName="decoupling"
      schX={-11.25}
      schY={-17.5}
      schRotation={-90}
      connections={{ pin1: "net.V3_3", pin2: "net.GND" }}
    />
    <capacitor
      name="C4"
      capacitance="10nF"
      footprint="0402"
      {...part(PARTS.C10n)}
      layer="bottom"
      pcbX={-3.8}
      pcbY={8.15}
      pcbRotation={90}
      schSectionName="decoupling"
      schX={-15.0}
      schY={-19.1}
      schRotation={-90}
      connections={{ pin1: "net.V3_3", pin2: "net.GND" }}
    />
    <LESD8D3_3CAT5G
      name="D3"
      displayName="D3 - LESD8D3.3"
      layer="bottom"
      pcbX={-2.7}
      pcbY={8.35}
      pcbRotation={90}
      schSectionName="mcu"
      schX={-30}
      schY={-13.5}
      connections={{ pin1: "net.V3_3", pin2: "net.GND" }}
    />
    <resistor
      name="R1"
      resistance="10k"
      footprint="0402"
      {...part(PARTS.R10k)}
      layer="bottom"
      pcbX={-7.4}
      pcbY={5.0}
      pcbRotation={90}
      schSectionName="mcu"
      schX={-30}
      schY={-6.5}
      schRotation={-90}
      connections={{ pin1: "net.V3_3", pin2: "net.CHIP_PU" }}
    />
    <capacitor
      name="C3"
      capacitance="1uF"
      footprint="0402"
      {...part(PARTS.C1u)}
      layer="bottom"
      pcbX={-7.4}
      pcbY={3.0}
      pcbRotation={90}
      schSectionName="mcu"
      schX={-30}
      schY={-10}
      schRotation={-90}
      connections={{ pin1: "net.CHIP_PU", pin2: "net.GND" }}
    />
    {/* Download boot needs IO8 high while IO9 is low (ESP32-C3 strapping) */}
    <resistor
      name="R25"
      resistance="10k"
      footprint="0402"
      {...part(PARTS.R10k)}
      pcbX={2.8}
      pcbY={-2.5}
      pcbRotation={90}
      schSectionName="mcu"
      schX={-17.5}
      schY={-6.5}
      schRotation={-90}
      connections={{ pin1: "net.V3_3", pin2: "net.IO8_PU" }}
    />
    {/* 3V3 from R24: the USB pair on inner1 below R25 leaves no room for a via */}
    <trace from=".R25 > .pin1" to=".R24 > .pin1" thickness="0.25mm" pcbPath={[".R24 > .pin1"]} />
    <trace from=".R25 > .pin2" to=".U1 > .IO8" thickness="0.15mm" pcbPath={[".U1 > .IO8"]} />
    {/* Recovery pads on the bottom, under U1: hold BOOT (IO9) to GND and tap
        EN to GND to enter download mode. Bare pads, 1.5 mm apart, so tweezers
        bridge GND to either neighbour. */}
    {TEST_PADS.map(({ name, net, x }, i) => (
      <testpoint
        key={name}
        name={name}
        footprintVariant="pad"
        padShape="circle"
        padDiameter="1mm"
        doNotPlace
        layer="bottom"
        pcbX={x}
        pcbY={TEST_PAD_Y}
        schSectionName="mcu"
        schX={-15}
        schY={-7 - 1.5 * i}
        connections={{ pin1: net }}
      />
    ))}
    {TEST_PADS.map(({ label, x }) => (
      <silkscreentext
        text={label}
        layer="bottom"
        pcbX={x}
        pcbY={TEST_PAD_Y - 0.9}
        anchorAlignment="center"
        fontSize="0.5mm"
        pcbSx={VISIBLE_SILK}
      />
    ))}
    <trace from=".TP1 > .pin1" to=".R1 > .pin2" thickness="0.15mm" pcbPath={[".R1 > .pin2"]} />

    {/* ---------------- Indicators ---------------- */}
    <resistor
      name="R13"
      resistance="0"
      footprint="0402"
      {...part(PARTS.R0)}
      layer="bottom"
      pcbX={-4.3}
      pcbY={-6.869}
      schSectionName="led"
      schX={-11}
      schY={-6}
      schRotation={0}
      connections={{ pin1: "net.LED_DATA", pin2: "net.LED_DIN" }}
    />
    <XL_2121RGBC_2812B
      name="D4"
      displayName="D4 - RGB LED"
      pcbX={-6.4}
      pcbY={-3.279}
      schSectionName="led"
      schX={-7.5}
      schY={-6}
      connections={{ DIN: "net.LED_DIN", VDD: "net.V3_3_LED", GND: "net.GND" }}
    />
    {/* LED supply link: its 3V3 pad is nearer C10 than any U3 supply pad, so the
        router joins it at the bulk capacitor and the LED PWM current stays off
        the U3 AVDD/DVDD path */}
    <resistor
      name="R24"
      resistance="0"
      footprint="0402"
      {...part(PARTS.R0)}
      pcbX={0.8}
      pcbY={-2.15}
      pcbRotation={180}
      schSectionName="led"
      schX={-9}
      schY={-3.5}
      schRotation={-90}
      connections={{ pin1: "net.V3_3", pin2: "net.V3_3_LED" }}
    />
    <capacitor
      name="C19"
      capacitance="100nF"
      footprint="0402"
      {...part(PARTS.C100n)}
      // also the LED supply links from D4.VDD and R24 (up to 10 mm); core
      // otherwise limits capacitor traces to 1 mm and skips autorouting
      maxDecouplingTraceLength="11mm"
      pcbX={-6.3}
      pcbY={-5.256}
      pcbRotation={180}
      schSectionName="led"
      schX={-6}
      schY={-3.5}
      schRotation={-90}
      connections={{ pin1: "net.V3_3_LED", pin2: "net.GND" }}
    />

    {/* ---------------- Fuel gauge ---------------- */}
    <MAX17048G_T10
      name="U5"
      displayName="U5 - MAX17048"
      schHeight={1}
      layer="bottom"
      pcbX={6.3}
      pcbY={0.75}
      schSectionName="fuel"
      schX={4}
      schY={-8}
      connections={{
        CTG: "net.GND",
        CELL: "net.VBAT",
        VDD: "net.VBAT",
        GND: "net.GND",
        EP: "net.GND",
        QSTRT: "net.GND",
        N_ALRT: "net.FG_ALRT",
        SCL: "net.I2C_SCL",
        SDA: "net.I2C_SDA",
      }}
    />
    <capacitor
      name="C18"
      // also the VBAT link to the battery pad (lib/handRoutes.ts)
      maxDecouplingTraceLength="12mm"
      capacitance="100nF"
      footprint="0402"
      {...part(PARTS.C100n)}
      layer="bottom"
      pcbX={6.3}
      pcbY={-1.15}
      pcbRotation={180}
      schSectionName="fuel"
      schX={1.2}
      schY={-8.5}
      schRotation={-90}
      connections={{ pin1: "net.VBAT", pin2: "net.GND" }}
    />
    <resistor
      name="R20"
      resistance="4.7k"
      footprint="0402"
      {...part(PARTS.R4k7)}
      layer="bottom"
      pcbX={3.4}
      pcbY={1.2}
      pcbRotation={270}
      schSectionName="fuel"
      schX={8.5}
      schY={-5.5}
      schRotation={-90}
      connections={{ pin1: "net.V3_3", pin2: "net.I2C_SDA" }}
    />
    <resistor
      name="R21"
      resistance="4.7k"
      footprint="0402"
      {...part(PARTS.R4k7)}
      layer="bottom"
      pcbX={4.45}
      pcbY={1.2}
      pcbRotation={270}
      schSectionName="fuel"
      schX={10}
      schY={-5.5}
      schRotation={-90}
      connections={{ pin1: "net.V3_3", pin2: "net.I2C_SCL" }}
    />
    {/* I2C by hand: U5 to its pull-up below the 3V3 trunk, then a via on that
        trace and the top side under U1 to IO7 (SCL) and IO6 (SDA) */}
    <trace
      from=".U5 > .SCL"
      to=".R21 > .pin2"
      pcbPath={boardPath([6.3, 0.75, 0], [[6.55, 2.25], [4.45, 2.25]])}
    />
    <trace
      from=".R21 > .pin2"
      to=".U1 > .IO7"
      pcbPath={boardPath([4.45, 1.2, 270], [
        [4.45, 2.25], [4.45, 2.25, "bottom", "top"], [4.45, 2.25],
        [3.8, 0.35], [2.4, 0.35],
      ])}
    />
    <trace
      from=".U5 > .SDA"
      to=".R20 > .pin2"
      pcbPath={boardPath([6.3, 0.75, 0], [[7.05, 2.7], [3.4, 2.7]])}
    />
    <trace
      from=".R20 > .pin2"
      to=".U1 > .IO6"
      pcbPath={boardPath([3.4, 1.2, 270], [
        [3.4, 2.25], [3.4, 2.25, "bottom", "top"], [3.4, 2.25],
        [3.4, 1.3], [1.6, 0.7],
      ])}
    />
    <trace from=".U5 > .QSTRT" to=".U5 > .EP" pcbPath={[".U5 > .EP"]} />
    {/* U5's GND pins to its CTG pin, which reaches the pour: the alert, I2C and
        pull-up traces around U5 left them a GND island in some routings */}
    <trace
      from=".U5 > .GND"
      to=".U5 > .EP"
      pcbPath={[...boardPath([6.3, 0.75, 0], [[5.55, 0.25]]), ".U5 > .EP"]}
    />
    <trace
      from=".U5 > .EP"
      to=".U5 > .CTG"
      pcbPath={[...boardPath([6.3, 0.75, 0], [[6.95, 0.4]]), ".U5 > .CTG"]}
    />
    {/* Fuel gauge alert to U1.IO10: under the pull-ups, then inner1 below U1's
        pad row and up between IO10 and the DRDY via */}
    <trace
      from=".U5 > .N_ALRT"
      to=".U1 > .IO10"
      pcbPath={boardPath([6.3, 0.75, 0], [
        [5.12, 1.26], [5.12, -0.9],
        [5.0, -1.4], [5.0, -1.4, "bottom", "inner1"], [5.0, -1.4],
        [4.6, -1.0], [-0.8, -1.0],
        [-1.25, 0.4], [-1.25, 0.4, "inner1", "top"], [-1.25, 0.4],
      ])}
    />

    {/* ---------------- ADS1220 load cell ADC ---------------- */}
    <ADS1220IRVAR
      name="U3"
      displayName="U3 - ADS1220"
      schHeight={1.8}
      layer="bottom"
      pcbX={-3.2}
      pcbY={-2.88}
      schSectionName="adc"
      schX={24.5}
      schY={-8}
      connections={{
        CLK: "net.GND",
        DGND: "net.GND",
        AVSS: "net.GND",
        EP: "net.GND",
        // Bridge low side on the internal low-side switch (PSW); REFN0 senses
        // it above the switch so the reference stays ratiometric
        AIN3: "net.LC_EN",
        REFN0: "net.LC_EN",
        REFP0: "net.LC_EP",
        AVDD: "net.V3_3",
        DVDD: "net.V3_3",
        AIN0: "net.ADC_AIN0",
        AIN1: "net.ADC_AIN1",
        SCLK: "net.ADC_SCLK",
        DIN: "net.ADC_DIN",
        DOUT: "net.ADC_DOUT",
        N_DRDY: "net.ADC_DRDY",
        N_CS: "net.ADC_CS",
      }}
    />
    {/* AVDD/DVDD bypass 0.5 mm from pins 10/11 (datasheet 9.4.1): the 3V3 feed
        passes their pads before reaching the pins (hand-routed below) */}
    <capacitor
      name="C11"
      capacitance="100nF"
      footprint="0402"
      {...part(PARTS.C100n)}
      layer="bottom"
      pcbX={-3.53}
      pcbY={0.48}
      pcbRotation={270}
      schSectionName="decoupling"
      schX={-12.5}
      schY={-19.1}
      schRotation={-90}
      connections={{ pin1: "net.V3_3", pin2: "net.GND" }}
    />
    <capacitor
      name="C13"
      capacitance="100nF"
      footprint="0402"
      {...part(PARTS.C100n)}
      layer="bottom"
      pcbX={-2.57}
      pcbY={0.48}
      pcbRotation={270}
      schSectionName="decoupling"
      schX={-11.25}
      schY={-19.1}
      schRotation={-90}
      connections={{ pin1: "net.V3_3", pin2: "net.GND" }}
    />
    <capacitor
      name="C10"
      capacitance="10uF"
      footprint="0603"
      {...part(PARTS.C10u_0603)}
      layer="bottom"
      pcbX={-0.6}
      pcbY={1.7}
      schSectionName="decoupling"
      schX={-13.75}
      schY={-20.7}
      schRotation={-90}
      connections={{ pin1: "net.V3_3", pin2: "net.GND" }}
    />
    {/* Bridge excitation and REFP0 share one node, RC-filtered from 3V3 */}
    <resistor
      name="R22"
      resistance="10"
      footprint="0402"
      {...part(PARTS.R10)}
      layer="bottom"
      pcbX={-7.32}
      pcbY={-2.88}
      pcbRotation={270}
      schSectionName="adc"
      schX={18}
      schY={-11.5}
      schRotation={-90}
      connections={{ pin1: "net.V3_3", pin2: "net.LC_EP" }}
    />
    <capacitor
      name="C14"
      capacitance="1uF"
      footprint="0402"
      {...part(PARTS.C1u)}
      layer="bottom"
      pcbX={-6.37}
      pcbY={-2.88}
      pcbRotation={90}
      schSectionName="adc"
      schX={20}
      schY={-12.5}
      schRotation={-90}
      connections={{ pin1: "net.LC_EP", pin2: "net.GND" }}
    />
    {/* Keeps the ADC deselected while the ESP32-C3 boots or sleeps */}
    <resistor
      name="R23"
      resistance="100k"
      footprint="0402"
      {...part(PARTS.R100k)}
      layer="bottom"
      pcbX={-1.9}
      pcbY={-5.85}
      schSectionName="adc"
      schX={29}
      schY={-5.5}
      schRotation={-90}
      connections={{ pin1: "net.ADC_CS", pin2: "net.V3_3" }}
    />
    {/* Input RC filter: 1k + 1k + 10nF C0G differential (~8 kHz); C0G because
        X7R is piezoelectric and TI asks for C0G here. BLE TX couples into the
        inputs (crimpdeq-tscircuit#23), so each input also has 22 pF C0G (self-resonant near
        2.4 GHz) and 1 nF C0G common-mode to GND between its resistor and the
        pin, and a GHz ferrite at J3. AIN1: pin, C21, C12, R8 (C23 at R8);
        AIN0: pin, C12, C20, C22, R7. */}
    <resistor
      name="R7"
      resistance="1k"
      footprint="0402"
      {...part(PARTS.R1k)}
      layer="bottom"
      pcbX={-4.6}
      pcbY={3.03}
      pcbRotation={180}
      schSectionName="adc"
      schX={18}
      schY={-7}
      schRotation={0}
      connections={{ pin1: "net.ADC_AIN0", pin2: "net.LC_SP" }}
    />
    <resistor
      name="R8"
      resistance="1k"
      footprint="0402"
      {...part(PARTS.R1k)}
      layer="bottom"
      pcbX={-7.0}
      pcbY={0.1}
      schSectionName="adc"
      schX={18}
      schY={-9}
      schRotation={180}
      connections={{ pin1: "net.ADC_AIN1", pin2: "net.LC_SN" }}
    />
    <capacitor
      name="C12"
      capacitance="10nF"
      footprint="0402"
      {...part(PARTS.C10n_C0G)}
      layer="bottom"
      pcbX={-5.0}
      pcbY={0.1}
      schSectionName="adc"
      schX={20}
      schY={-8}
      schRotation={90}
      connections={{ pin1: "net.ADC_AIN0", pin2: "net.ADC_AIN1" }}
    />
    {/* RF and common-mode capacitors (crimpdeq-tscircuit#23). Vias can't go under U1's left pad
        column, so the AIN0 pair returns to C11's GND pad and via, C21 through a
        via to U1's GND20 pad and C23 to C3's GND pad. */}
    <capacitor
      name="C20"
      capacitance="22pF"
      footprint="0402"
      {...part(PARTS.C22p)}
      layer="bottom"
      pcbX={-4.95}
      pcbY={1.1}
      pcbRotation={180}
      schSectionName="adc"
      schX={20.5}
      schY={-4.5}
      schRotation={-90}
      connections={{ pin1: "net.ADC_AIN0", pin2: "net.GND" }}
    />
    <capacitor
      name="C22"
      capacitance="1nF"
      footprint="0402"
      {...part(PARTS.C1n_C0G)}
      layer="bottom"
      pcbX={-4.95}
      pcbY={2.06}
      pcbRotation={180}
      schSectionName="adc"
      schX={21.75}
      schY={-4.5}
      schRotation={-90}
      connections={{ pin1: "net.ADC_AIN0", pin2: "net.GND" }}
    />
    <capacitor
      name="C21"
      capacitance="22pF"
      footprint="0402"
      {...part(PARTS.C22p)}
      layer="bottom"
      pcbX={-6.6}
      pcbY={-0.95}
      schSectionName="adc"
      schX={23}
      schY={-4.5}
      schRotation={-90}
      connections={{ pin1: "net.ADC_AIN1", pin2: "net.GND" }}
    />
    <capacitor
      name="C23"
      capacitance="1nF"
      footprint="0402"
      {...part(PARTS.C1n_C0G)}
      layer="bottom"
      pcbX={-7.0}
      pcbY={1.1}
      schSectionName="adc"
      schX={24.25}
      schY={-4.5}
      schRotation={-90}
      connections={{ pin1: "net.ADC_AIN1", pin2: "net.GND" }}
    />
    <WirePads
      name="J3"
      displayName="J3 - Load cell"
      schSectionName="adc"
      schX={14}
      schY={-8}
      pads={[
        { label: "E_P", silk: "E+" },
        { label: "S_P", silk: "S+" },
        { label: "S_N", silk: "S-" },
        { label: "E_N", silk: "E-" },
      ]}
      silkOffsetX={1.6}
      // FB1/FB2 sit beside the pads on the top side
      silkLayers={["bottom"]}
      pcbX={-7.0}
      pcbY={-10.55}
      connections={{
        E_P: "net.LC_EP",
        S_P: "net.LC_SP_J3",
        S_N: "net.LC_SN_J3",
        E_N: "net.LC_EN",
      }}
    />
    {/* GHz ferrites in the signal lines at the cable entry (crimpdeq-tscircuit#23), on the top
        side between J3 and J2's shell-leg slot */}
    <chip
      name="FB1"
      footprint="0402"
      {...part(PARTS.FB_GHZ)}
      pinLabels={{ pin1: "pin1", pin2: "pin2" }}
      pcbX={-5.66}
      pcbY={-9.45}
      pcbRotation={90}
      schSectionName="adc"
      schX={16.5}
      schY={-5.5}
      connections={{ pin1: "net.LC_SP_J3", pin2: "net.LC_SP" }}
    />
    <chip
      name="FB2"
      footprint="0402"
      {...part(PARTS.FB_GHZ)}
      pinLabels={{ pin1: "pin1", pin2: "pin2" }}
      pcbX={-5.66}
      pcbY={-11.65}
      pcbRotation={270}
      schSectionName="adc"
      schX={16.5}
      schY={-10.5}
      connections={{ pin1: "net.LC_SN_J3", pin2: "net.LC_SN" }}
    />
    {/* Load cell lines to J3 by hand, laid out so they don't cross: E- on the
        bottom right of the E+, S+ and S- holes, E+ on inner1 down x = -6.4, and
        S+/S- as a pair on inner1 (0.35 mm apart from x = -5.3) to the
        ferrites, S- passing west of the S+ via */}
    <trace
      from=".R22 > .pin2"
      to=".J3 > .pin1"
      thickness="0.25mm"
      pcbPath={boardPath([-7.32, -2.88, 270], [
        [-6.9, -1.85], [-6.9, -1.85, "bottom", "inner1"], [-6.9, -1.85],
        [-6.4, -2.4], [-6.4, -6.4],
      ])}
    />
    <trace from=".J3 > .pin2" to=".FB1 > .pin1" pcbPath={[...boardPath([-7, -10.55, 0], [[-6.1, -9.96]]), ".FB1 > .pin1"]} />
    <trace
      from=".FB1 > .pin2"
      to=".R7 > .pin2"
      pcbPath={[
        ...boardPath([-5.66, -9.45, 90], [
          [-5.66, -8.5], [-5.5, -8.2], [-5.5, -8.2, "top", "inner1"], [-5.5, -8.2],
          [-5.3, -7.4], [-5.3, -1.1], [-4.95, -0.75], [-4.95, 2.8],
          [-4.09, 3.65], [-4.09, 3.65, "inner1", "bottom"], [-4.09, 3.65],
        ]),
        ".R7 > .pin2",
      ]}
    />
    <trace from=".J3 > .pin3" to=".FB2 > .pin1" pcbPath={[...boardPath([-7, -10.55, 0], [[-6.1, -11.14]]), ".FB2 > .pin1"]} />
    <trace
      from=".FB2 > .pin2"
      to=".R8 > .pin2"
      pcbPath={[
        ...boardPath([-5.66, -11.65, 270], [
          [-5.66, -12.6], [-5.5, -12.9], [-5.5, -12.9, "top", "inner1"], [-5.5, -12.9],
          [-5.6, -12.4], [-5.6, -9.0], [-6.0, -8.6], [-6.0, -7.75], [-5.65, -7.3],
          [-5.65, -1.45], [-6.25, -0.85], [-7.4, -0.85],
          [-7.85, -0.4], [-7.85, -0.4, "inner1", "bottom"], [-7.85, -0.4],
        ]),
        ".R8 > .pin2",
      ]}
    />
    <trace
      from=".U3 > .REFN0"
      to=".J3 > .pin4"
      pcbPath={boardPath([-3.2, -2.88, 0], [[-5.55, -3.13], [-5.55, -5.05], [-6.0, -5.5], [-6.0, -13.2]])}
    />
    {/* ADS1220 fan-out by hand (DIN, SCLK and CS to U1 are in
        lib/handRoutes.ts). DOUT: a via right of U3 (its top and inner layers are
        kept out) and inner1 above the keepout to IO1; DRDY: over U1's bottom pad
        row under the module, left of FG_ALRT. Front end: AIN0/AIN1 to the
        filter, REFP0 to C14/R22, AIN3 to REFN0 around the lower-left corner. */}
    <trace
      from=".U3 > .DOUT"
      to=".U1 > .IO1"
      pcbPath={boardPath([-3.2, -2.88, 0], [
        [-0.95, -1.6], [-0.95, -1.6, "bottom", "inner1"], [-0.95, -1.6],
        [-1.25, -1.3], [-4.6, -1.3],
        [-4.65, -1.36], [-4.65, -1.36, "inner1", "top"], [-4.65, -1.36],
      ])}
    />
    <trace
      from=".U3 > .N_DRDY"
      to=".U1 > .IO0"
      pcbPath={boardPath([-3.2, -2.88, 0], [
        [-1.9, -0.77], [-1.9, 0.5], [-1.9, 0.5, "bottom", "top"], [-1.9, 0.5],
        [-2.2, 0.9], [-4.8, 0.9],
      ])}
    />
    <trace
      from=".U3 > .N_CS"
      to=".R23 > .pin1"
      pcbPath={boardPath([-3.2, -2.88, 0], [[-1.0, -3.9], [-1.0, -5.5]])}
    />
    <trace
      from=".U3 > .AIN0"
      to=".C12 > .pin1"
      pcbPath={boardPath([-3.2, -2.88, 0], [[-3.95, -0.6], [-4.49, -0.22]])}
    />
    <trace
      from=".C12 > .pin1"
      to=".C20 > .pin1"
      pcbPath={[...boardPath([-5.0, 0.1, 0], [[-4.49, 0.5], [-5.46, 0.8]]), ".C20 > .pin1"]}
    />
    <trace from=".C20 > .pin1" to=".C22 > .pin1" pcbPath={[".C22 > .pin1"]} />
    <trace
      from=".C22 > .pin1"
      to=".R7 > .pin1"
      pcbPath={[...boardPath([-4.95, 2.06, 180], [[-5.11, 2.45]]), ".R7 > .pin1"]}
    />
    <trace from=".C22 > .pin2" to=".C20 > .pin2" thickness="0.25mm" pcbPath={[".C20 > .pin2"]} />
    <trace from=".C20 > .pin2" to=".C11 > .pin2" thickness="0.25mm" pcbPath={[".C11 > .pin2"]} />
    {/* AVDD/DVDD: to their bypass capacitors, which are joined, and from C13
        through a via in its 3V3 pad and inner1 to the 3V3 trunk at (-2, 2.6).
        AIN0, DRDY and the GND pads of C11/C13 close this corner on the bottom;
        off the pad, the via fits only between the capacitors and U3, where 3V3
        would reach the pins first. It is the board's only via in a pad.
        maxLength overrides core's automatic 1 mm limit for 100 nF bypass
        traces, which skips autorouting when a hand-routed one exceeds it. */}
    <trace
      from=".U3 > .AVDD"
      to=".C11 > .pin1"
      thickness="0.25mm"
      maxLength="1.5mm"
      pcbPath={[".C11 > .pin1"]}
    />
    <trace
      from=".U3 > .DVDD"
      to=".C13 > .pin1"
      thickness="0.25mm"
      maxLength="1.5mm"
      pcbPath={[...boardPath([-3.2, -2.88, 0], [[-2.95, -0.55]]), ".C13 > .pin1"]}
    />
    <trace from=".C11 > .pin1" to=".C13 > .pin1" thickness="0.25mm" pcbPath={[".C13 > .pin1"]} />
    <trace
      from=".C13 > .pin1"
      to=".C17 > .pin1"
      thickness="0.25mm"
      maxLength="12mm"
      pcbPath={boardPath([-2.57, 0.48, 270], [
        [-2.57, 0.3], [-2.57, 0.3, "bottom", "inner1"], [-2.57, 0.3],
        [-3.0, 1.0], [-3.0, 2.25],
        [-3.3, 2.6], [-3.3, 2.6, "inner1", "bottom"], [-3.3, 2.6],
        [-2.0, 2.6], [1.8, 2.6],
      ])}
    />
    <trace
      from=".U3 > .AIN1"
      to=".C21 > .pin1"
      pcbPath={[...boardPath([-3.2, -2.88, 0], [[-5.51, -1.6], [-5.75, -1.35], [-6.09, -1.35]]), ".C21 > .pin1"]}
    />
    <trace
      from=".C21 > .pin1"
      to=".C12 > .pin2"
      pcbPath={[...boardPath([-6.6, -0.95, 0], [[-5.51, -0.4]]), ".C12 > .pin2"]}
    />
    <trace from=".C12 > .pin2" to=".R8 > .pin1" pcbPath={[".R8 > .pin1"]} />
    <trace from=".R8 > .pin1" to=".C23 > .pin1" pcbPath={[".C23 > .pin1"]} />
    {/* C21's GND through a via to U1's GND20 pad on the top side; C23's to C3's */}
    <trace
      from=".C21 > .pin2"
      to=".U1 > .GND20"
      thickness="0.25mm"
      pcbPath={[
        ...boardPath([-6.6, -0.95, 0], [[-7.75, -1.6], [-7.75, -1.6, "bottom", "top"], [-7.75, -1.6]]),
        ".U1 > .GND20",
      ]}
    />
    <trace from=".C23 > .pin2" to=".C3 > .pin2" thickness="0.25mm" pcbPath={[".C3 > .pin2"]} />
    <trace
      from=".U3 > .REFP0"
      to=".C14 > .pin1"
      thickness="0.25mm"
      pcbPath={boardPath([-3.2, -2.88, 0], [[-5.4, -2.63]])}
    />
    <trace from=".C14 > .pin1" to=".R22 > .pin2" thickness="0.25mm" pcbPath={[".R22 > .pin2"]} />
    {/* RGB LED corner by hand: its supply between D4's pad columns down to C19,
        and the data from R13 through a via and up D4's right side (the
        router shorted the two here). */}
    <trace
      from=".D4 > .VDD"
      to=".C19 > .pin1"
      thickness="0.25mm"
      pcbPath={[...boardPath([-6.4, -3.279, 0], [[-6.4, -2.78], [-6.4, -4.6]]), ".C19 > .pin1"]}
    />
    <trace
      from=".R13 > .pin2"
      to=".D4 > .DIN"
      pcbPath={[
        ...boardPath([-4.3, -6.869, 0], [
          [-4.81, -6.2], [-4.81, -6.2, "bottom", "top"], [-4.81, -6.2],
          [-4.85, -4.9], [-4.85, -3.78],
        ]),
        ".D4 > .DIN",
      ]}
    />
    {/* C14's GND pad is boxed in by LC_EP: a via at (-7, -4.75), which also
        stitches the GND planes there and touches C19's GND pad, to D4's GND pad */}
    <trace
      from=".C14 > .pin2"
      to=".D4 > .GND"
      pcbPath={boardPath([-6.37, -2.88, 90], [
        [-7.0, -4.2], [-7.0, -4.75], [-7.0, -4.75, "bottom", "top"], [-7.0, -4.75],
        [-7.0, -4.3],
      ])}
    />
    <trace
      from=".U3 > .AIN3"
      to=".U3 > .REFN0"
      pcbPath={boardPath([-3.2, -2.88, 0], [[-3.95, -5.05], [-5.55, -5.05], [-5.55, -3.13]])}
    />

    {/* Generated fixed routes for the remaining nets (lib/handRoutes.ts) */}
    {HAND_ROUTES.map((r) => (
      <trace
        from={r.from}
        to={r.to}
        thickness={`${r.width}mm`}
        pcbPath={[...boardPath(r.frame, r.points), r.to]}
      />
    ))}

    {/* ---------------- Layout constraints ---------------- */}
    {/* Keep routed copper off the board edges (router under-applies edge clearance).
        None along the top edge: U1's pads reach into the band there. */}
    <keepout
      shape="rect"
      pcbX={-W / 2 + EDGE_BAND / 2}
      pcbY={CENTER_Y}
      width={EDGE_BAND}
      height={L}
      layers={["top", "inner1", "inner2", "bottom"]}
      allowPlacements
    />
    <keepout
      shape="rect"
      pcbX={W / 2 - EDGE_BAND / 2}
      pcbY={CENTER_Y}
      width={EDGE_BAND}
      height={L}
      layers={["top", "inner1", "inner2", "bottom"]}
      allowPlacements
    />
    <keepout
      shape="rect"
      pcbX={0}
      pcbY={BOTTOM + EDGE_BAND / 2}
      width={W}
      height={EDGE_BAND}
      layers={["top", "inner1", "inner2", "bottom"]}
      allowPlacements
    />
    {/* No vias from other nets onto the ADS1220 thermal pad from the top side */}
    <keepout
      shape="rect"
      pcbX={-3.2}
      pcbY={-2.88}
      width={2.6}
      height={2.6}
      layers={["top", "inner1", "inner2"]}
    />
    {/* ...nor onto its CLK/DGND/AVSS/AIN3 pins: the router checks a via only
        on the layers it joins, and its inner1 -> top vias landed on AVSS */}
    <keepout
      shape="rect"
      pcbX={-3.2}
      pcbY={-4.6}
      width={2.0}
      height={0.9}
      layers={["top", "inner1", "inner2"]}
    />
    {/* Keep the GND pour clear of the E+ and E- wire pads */}
    <keepout
      shape="circle"
      radius={1.0}
      pcbX={-7.0}
      pcbY={-7.25}
      layers={["top", "inner1", "inner2", "bottom"]}
      allowTraces
      allowPlacements
    />
    <keepout
      shape="circle"
      radius={1.0}
      pcbX={-7.0}
      pcbY={-13.85}
      layers={["top", "inner1", "inner2", "bottom"]}
      allowTraces
      allowPlacements
    />
    {/* GND stitching: the router only adds vias where a trace changes layer */}
    {GND_VIAS.map(([x, y]) => (
      <via key={`${x},${y}`} pcbX={x} pcbY={y} connectsTo="net.GND" />
    ))}
    {pours && (
      <>
        <copperpour connectsTo="net.GND" layer="inner1" clearance="0.2mm" boardEdgeMargin="0.35mm" />
        <copperpour connectsTo="net.GND" layer="inner2" clearance="0.2mm" boardEdgeMargin="0.35mm" />
        {/* Solid GND under the buck, the ADC and the USB pair: routing is kept out */}
        {Object.values(GND_PLANE_REGIONS).map(({ layer, outline }) => (
          <copperpour connectsTo="net.GND" layer={layer} clearance="0.2mm" outline={outline} unbroken />
        ))}
        <copperpour connectsTo="net.GND" layer="top" clearance="0.2mm" boardEdgeMargin="0.35mm" />
        <copperpour connectsTo="net.GND" layer="bottom" clearance="0.2mm" boardEdgeMargin="0.35mm" />
      </>
    )}
  </board>
)
