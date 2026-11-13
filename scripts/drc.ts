// Run each @tscircuit/checks PCB check separately so one crashing check
// (e.g. the copper-pour boolean op) cannot hide the results of the others.
// Usage: bun scripts/drc.ts [--json] [circuit.json]
//   --json prints {errors: [{check, type, message, center}], crashed: [check]}
import { readFileSync } from "node:fs"
import * as checks from "@tscircuit/checks"
import { GND_PLANE_REGIONS } from "../lib/gndPlane"

const json = process.argv.includes("--json")
const file = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "dist/index/circuit.json"
const circuitJson = JSON.parse(readFileSync(file, "utf8"))
const log = (line: string) => {
  if (!json) console.log(line)
}
type Point = { x: number; y: number }
const errors: { check: string; type: string; message: string; center?: Point }[] = []

// Error location: its own center, else the first pad/port/via it references
const positions = new Map<string, Point>()
for (const e of circuitJson)
  for (const idKey of ["pcb_port_id", "pcb_via_id", "pcb_smtpad_id", "pcb_plated_hole_id"])
    if (e.type === idKey.slice(0, -3) && typeof e.x === "number") positions.set(e[idKey], { x: e.x, y: e.y })
const locate = (e: any): Point | undefined => {
  if (e.center) return e.center
  const ids = [
    ...(e.pcb_port_ids ?? []),
    ...(e.pcb_pad_ids ?? []),
    e.pcb_via_id,
    e.pcb_port_id,
    ...String(e.message ?? "").match(/pcb_(?:via|port)_\d+/g) ?? [],
  ]
  for (const id of ids) if (id && positions.has(id)) return positions.get(id)
}
const crashed: string[] = []

const pcbChecks = [
  "checkEachPcbPortConnectedToPcbTraces",
  "checkSourceTracesHavePcbTraces",
  "checkEachPcbTraceNonOverlapping",
  "checkCopperPourShorts",
  "checkPadTraceClearance",
  "checkViaTraceClearance",
  "checkViaPadClearance",
  "checkPadPadClearance",
  "checkSameNetViaSpacing",
  "checkDifferentNetViaSpacing",
  "checkTracesAreContiguous",
  "checkPcbTracesOutOfBoard",
  "checkViasOffBoard",
  "checkViasInPads",
  "checkHoleTraceClearance",
  "checkDanglingTraces",
  "checkPcbTraceSelfShorts",
  "checkCopperToBoardEdgeClearance",
  "checkPcbCopperOverKeepout",
  "checkPcbCourtyardOverKeepout",
  "checkPcbComponentOverlap",
  "checkPcbComponentsOutOfBoard",
  "checkConnectorAccessibleOrientation",
] as const

// The board sets isViaInPadAllowed for C13's 3V3 via (index.circuit.tsx), which
// turns checkViasInPads off; run it without that flag and allow only these pads
const VIA_IN_PAD_ALLOWED = new Set(["C13.pin1"])

let failures = 0

// Every netlist-connected source port must have a PCB port (pad). Some schematic
// props (e.g. schPinArrangement on standard connectors) silently drop pads.
{
  const connected = new Set<string>()
  for (const e of circuitJson)
    if (e.type === "source_trace")
      for (const id of e.connected_source_port_ids ?? []) connected.add(id)
  const withPad = new Set(
    circuitJson.filter((e: any) => e.type === "pcb_port").map((e: any) => e.source_port_id),
  )
  const names = new Map(
    circuitJson
      .filter((e: any) => e.type === "source_component")
      .map((e: any) => [e.source_component_id, e.name]),
  )
  // Multi-pad pins (module center pad, connector shell) attach copper by port hint
  const componentOfPcb = new Map(
    circuitJson
      .filter((e: any) => e.type === "pcb_component")
      .map((e: any) => [e.pcb_component_id, e.source_component_id]),
  )
  const padHints = new Set<string>()
  for (const e of circuitJson)
    if ((e.type === "pcb_smtpad" || e.type === "pcb_plated_hole") && e.port_hints)
      for (const hint of e.port_hints)
        padHints.add(`${componentOfPcb.get(e.pcb_component_id)}:${hint}`)
  const hasPadByHint = (port: any) =>
    [port.name, ...(port.port_hints ?? [])].some((hint: string) =>
      padHints.has(`${port.source_component_id}:${hint}`),
    )
  const missing = circuitJson.filter(
    (e: any) =>
      e.type === "source_port" &&
      connected.has(e.source_port_id) &&
      !withPad.has(e.source_port_id) &&
      !hasPadByHint(e),
  )
  failures += missing.length
  log(`${missing.length ? "FAIL" : "ok  "} connectedPortsHavePads: ${missing.length} errors`)
  for (const e of missing) {
    const message = `${names.get(e.source_component_id)}.${e.name} has no PCB pad`
    errors.push({ check: "connectedPortsHavePads", type: "missing_pad", message })
  }
  for (const e of errors.slice(0, 8)) log(`       - ${e.message}`)
}
// Custom checks: report in the same format as the @tscircuit/checks ones
type Issue = { type: string; message: string; center?: Point }
const report = (check: string, issues: Issue[]) => {
  failures += issues.length
  errors.push(...issues.map((e) => ({ check, ...e })))
  log(`${issues.length ? "FAIL" : "ok  "} ${check}: ${issues.length} errors`)
  for (const e of issues.slice(0, 8)) log(`       - ${e.message}`)
}

// The router sometimes narrows a trace below the board minimum (e.g. stubs into
// polygon pads); the built-in checks do not look at widths
const MIN_TRACE_WIDTH = 0.127
{
  const issues: Issue[] = []
  for (const t of circuitJson.filter((e: any) => e.type === "pcb_trace"))
    for (const p of t.route)
      if (p.route_type === "wire" && p.width < MIN_TRACE_WIDTH - 1e-6) {
        issues.push({
          type: "trace_too_narrow",
          message: `${t.pcb_trace_id} is ${p.width} mm wide at (${p.x.toFixed(2)}, ${p.y.toFixed(2)}) on ${p.layer}`,
          center: { x: p.x, y: p.y },
        })
        break
      }
  report("minTraceWidth", issues)
}

// Solid GND regions on the inner layers (lib/gndPlane.ts): no copper from other nets.
// The unbroken pours keep the router out; this guards against that changing.
{
  const netNames = new Map(
    circuitJson.filter((e: any) => e.type === "source_net").map((e: any) => [e.source_net_id, e.name]),
  )
  const traceNet = new Map(
    circuitJson
      .filter((e: any) => e.type === "source_trace")
      .map((e: any) => [e.source_trace_id, netNames.get(e.connected_source_net_ids?.[0])]),
  )
  const inside = ({ x, y }: Point, poly: Point[]) => {
    let hit = false
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++)
      if (poly[i].y > y !== poly[j].y > y && x < poly[i].x + ((y - poly[i].y) * (poly[j].x - poly[i].x)) / (poly[j].y - poly[i].y))
        hit = !hit
    return hit
  }
  // closest points of segments pq and uv (distance 0 if they cross)
  const closest = (p: Point, q: Point, u: Point, v: Point) => {
    const onSeg = (a: Point, b: Point, c: Point) => {
      const [dx, dy] = [b.x - a.x, b.y - a.y]
      const L = dx * dx + dy * dy
      const t = L ? Math.max(0, Math.min(1, ((c.x - a.x) * dx + (c.y - a.y) * dy) / L)) : 0
      return { x: a.x + t * dx, y: a.y + t * dy }
    }
    const cross = (a: Point, b: Point, c: Point) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
    if (cross(p, q, u) * cross(p, q, v) < 0 && cross(u, v, p) * cross(u, v, q) < 0) {
      const t = cross(u, v, p) / (cross(u, v, p) - cross(u, v, q))
      const x = { x: p.x + t * (q.x - p.x), y: p.y + t * (q.y - p.y) }
      return { d: 0, at: x }
    }
    const pairs = [[onSeg(p, q, u), u], [onSeg(p, q, v), v], [p, onSeg(u, v, p)], [q, onSeg(u, v, q)]]
    return pairs
      .map(([a, b]) => ({ d: Math.hypot(a.x - b.x, a.y - b.y), at: a }))
      .reduce((m, c) => (c.d < m.d ? c : m))
  }
  const issues: Issue[] = []
  for (const t of circuitJson.filter((e: any) => e.type === "pcb_trace")) {
    const net = traceNet.get(t.source_trace_id)
    if (net === "GND") continue
    search: for (let k = 1; k < t.route.length; k++) {
      const [a, b] = [t.route[k - 1], t.route[k]]
      if (a.route_type !== "wire" || b.route_type !== "wire") continue
      // copper overlaps the region: an end inside, or the edge within half a width
      for (const [region, { layer, outline: poly }] of Object.entries(GND_PLANE_REGIONS)) {
        if (a.layer !== layer) continue
        let hit: Point | undefined = inside(a, poly) ? a : inside(b, poly) ? b : undefined
        for (let i = 0, j = poly.length - 1; !hit && i < poly.length; j = i++) {
          const c = closest(a, b, poly[j], poly[i])
          if (c.d < a.width / 2) hit = c.at
        }
        if (hit) {
          issues.push({
            type: "trace_in_gnd_plane",
            message: `${t.pcb_trace_id} (${net ?? "?"}) runs on ${layer} through the ${region} GND plane at (${hit.x.toFixed(2)}, ${hit.y.toFixed(2)})`,
            center: { x: hit.x, y: hit.y },
          })
          break search
        }
      }
    }
  }
  report("gndPlaneRegions", issues)
}

// Trace ends as "R1.pin2" names
const sourceNames = new Map(
  circuitJson.filter((e: any) => e.type === "source_component").map((e: any) => [e.source_component_id, e.name]),
)
const sourcePorts = new Map(circuitJson.filter((e: any) => e.type === "source_port").map((e: any) => [e.source_port_id, e]))
const pcbPorts = new Map(circuitJson.filter((e: any) => e.type === "pcb_port").map((e: any) => [e.pcb_port_id, e]))
const portName = (id: string) => {
  const sp: any = sourcePorts.get((pcbPorts.get(id) as any)?.source_port_id)
  return sp ? `${sourceNames.get(sp.source_component_id)}.${sp.name}` : id
}
const traceEnds = (t: any): string[] =>
  t.route.flatMap((p: any) => [p.start_pcb_port_id, p.end_pcb_port_id]).filter(Boolean).map(portName)

// 3V3 supply topology. The router joins each pad to its nearest same-net pad, so
// placement decides where currents flow; every re-route can change it. The RGB
// LED link (R24) must reach the buck without passing the ADS1220 supply pins or
// their bypass capacitors (LED PWM current off AVDD/DVDD). The buck -> ESP32
// 3V3 path is hand-routed at 0.4 mm up to C1; the router narrows V3_3 below its
// 0.25 mm width, so at most MAX_NARROW_3V3 mm of the path may be narrower.
{
  type Edge = { to: string; narrow: number; wide: number; vias: number }
  const graph = new Map<string, Edge[]>()
  for (const t of circuitJson.filter((e: any) => e.type === "pcb_trace")) {
    const ends = traceEnds(t)
    if (ends.length !== 2) continue
    let [narrow, wide] = [0, 0]
    for (let k = 1; k < t.route.length; k++) {
      const [a, b] = [t.route[k - 1], t.route[k]]
      if (a.route_type !== "wire" || b.route_type !== "wire") continue
      const length = Math.hypot(b.x - a.x, b.y - a.y)
      if (Math.min(a.width, b.width) < 0.25 - 1e-6) narrow += length
      else wide += length
    }
    const vias = t.route.filter((p: any) => p.route_type === "via").length
    for (const [a, b] of [ends, [...ends].reverse()])
      graph.set(a, [...(graph.get(a) ?? []), { to: b, narrow, wide, vias }])
  }
  const path = (from: string, to: string) => {
    const prev = new Map<string, [string, Edge] | null>([[from, null]])
    const queue = [from]
    for (let q = 0; q < queue.length && !prev.has(to); q++)
      for (const e of graph.get(queue[q]) ?? [])
        if (!prev.has(e.to)) {
          prev.set(e.to, [queue[q], e])
          queue.push(e.to)
        }
    const nodes = [to]
    const edges: Edge[] = []
    for (let step = prev.get(to); step; step = prev.get(step[0])) {
      nodes.unshift(step[0])
      edges.push(step[1])
    }
    return prev.has(to) ? { nodes, edges } : undefined
  }
  const issues: Issue[] = []
  const led = path("L1.pin2", "R24.pin1")
  const adcSupply = ["U3.AVDD", "U3.DVDD", "C11.pin1", "C13.pin1"]
  if (!led || led.nodes.some((n) => adcSupply.includes(n)))
    issues.push({ type: "led_supply_via_adc", message: `LED supply path: ${led?.nodes.join(" -> ") ?? "none"}` })
  const mcu = path("L1.pin2", "U1.3V3")
  const sum = (key: "narrow" | "wide" | "vias") => mcu?.edges.reduce((s, e) => s + e[key], 0) ?? NaN
  const MAX_NARROW_3V3 = 3
  if (!mcu || !(sum("narrow") <= MAX_NARROW_3V3))
    issues.push({
      type: "narrow_3v3_path",
      message: `buck -> U1 3V3: ${mcu ? `${sum("narrow").toFixed(1)} mm below 0.25 mm (max ${MAX_NARROW_3V3})` : "no path"}`,
    })
  report("supplyTopology", issues)
  log(
    `       buck -> U1 3V3: ${sum("narrow").toFixed(1)} mm below 0.25 mm, ${sum("wide").toFixed(1)} mm at 0.25 mm or wider, ${sum("vias")} vias`,
  )
}

// Every via is a through via: the board is ordered as a standard 4-layer stackup,
// so a blind/buried via would be drilled through copper of other layers.
// scripts/patch-core.mjs makes core give vias in fixed traces all layers.
{
  const layerCount = circuitJson.find((e: any) => e.type === "pcb_board")?.num_layers ?? 4
  const issues: Issue[] = circuitJson
    .filter((e: any) => e.type === "pcb_via" && (e.layers ?? []).length !== layerCount)
    .map((e: any) => ({
      type: "via_not_through",
      message: `${e.pcb_via_id} at (${e.x.toFixed(2)}, ${e.y.toFixed(2)}) spans ${(e.layers ?? []).join("-")}`,
      center: { x: e.x, y: e.y },
    }))
  report("throughVias", issues)
}

// USB D-/D+ pair (index.circuit.tsx): from the ESD diodes to U1 on the same
// layers through the same number of vias, with matched lengths
{
  const MAX_USB_SKEW = 0.5 // mm
  const run = (from: string, to: string) => {
    const t = circuitJson.find((e: any) => e.type === "pcb_trace" && traceEnds(e).sort().join() === [from, to].sort().join())
    if (!t) return undefined
    let length = 0
    const layers: string[] = []
    for (let k = 1; k < t.route.length; k++) {
      const [a, b] = [t.route[k - 1], t.route[k]]
      if (a.route_type === "wire" && b.route_type === "wire") length += Math.hypot(b.x - a.x, b.y - a.y)
      if (b.route_type === "wire" && layers.at(-1) !== b.layer) layers.push(b.layer)
    }
    return { length, layers: layers.join(" > ") }
  }
  const dm = run("D7.pin1", "U1.IO18")
  const dp = run("D10.pin1", "U1.IO19")
  const issues: Issue[] = []
  if (!dm || !dp) issues.push({ type: "usb_pair_missing", message: "no D7 -> U1.IO18 or D10 -> U1.IO19 trace" })
  else {
    if (dm.layers !== dp.layers)
      issues.push({ type: "usb_pair_layers", message: `D- runs on ${dm.layers}, D+ on ${dp.layers}` })
    if (Math.abs(dm.length - dp.length) > MAX_USB_SKEW)
      issues.push({
        type: "usb_pair_skew",
        message: `D- ${dm.length.toFixed(2)} mm, D+ ${dp.length.toFixed(2)} mm (max difference ${MAX_USB_SKEW} mm)`,
      })
  }
  report("usbPair", issues)
  if (dm && dp) log(`       D- ${dm.length.toFixed(2)} mm, D+ ${dp.length.toFixed(2)} mm on ${dm.layers}`)
}

for (const name of pcbChecks) {
  const fn = (checks as any)[name]
  if (typeof fn !== "function") {
    log(`?? ${name}: not exported`)
    continue
  }
  try {
    const input = structuredClone(circuitJson)
    if (name === "checkViasInPads")
      for (const e of input) if (e.type === "pcb_board") delete e.is_via_in_pad_allowed
    const result = await fn(input)
    const issues = (Array.isArray(result) ? result : []).filter(
      (e: any) =>
        !String(e.type).endsWith("_warning") &&
        !(name === "checkViasInPads" && VIA_IN_PAD_ALLOWED.has(String(e.message).match(/ pad (\S+) at /)?.[1] ?? "")),
    )
    const warnings = (Array.isArray(result) ? result : []).filter((e: any) =>
      String(e.type).endsWith("_warning"),
    )
    failures += issues.length
    for (const e of issues)
      errors.push({ check: name, type: e.type, message: e.message, center: locate(e) })
    log(
      `${issues.length ? "FAIL" : "ok  "} ${name}: ${issues.length} errors, ${warnings.length} warnings`,
    )
    for (const e of [...issues, ...warnings].slice(0, 8)) {
      log(`       - ${e.type}: ${e.message}`)
    }
  } catch (err) {
    crashed.push(name)
    log(`CRASH ${name}: ${(err as Error).message}`)
  }
}
if (json) console.log(JSON.stringify({ errors, crashed }))
// A crashed check proves nothing; checkCopperPourShorts crashes are covered by `tsci check shorts`
const crashNote = crashed.length ? ` (not run, crashed: ${crashed.join(", ")})` : ""
log(failures ? `\n${failures} DRC errors${crashNote}` : `\nDRC clean${crashNote}`)
process.exit(failures ? 1 : 0)
