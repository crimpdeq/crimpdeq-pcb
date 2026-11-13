// Fabrication fixes applied to a copy of circuit.json before the Gerber export,
// and checks on the result. Core (pinned) gets two things wrong for this board:
//
// - Solder paste: it only pastes rect/rotated_rect/circle pads (the ADS1220
//   pill pads got none), sizes every aperture at 70 % of each pad dimension,
//   and pastes every plated hole on both sides. Here paste is regenerated:
//   1:1 on normal pads, 50-60 % on thermal pads, top-only pin-in-paste on the
//   USB-C shell legs, none on the wire pads.
// - GND pours: they are clipped around traces without dropping what ends up
//   floating, including lobes joined only by hairline necks that do not survive
//   etching. Pour copper not reachable from GND through copper at least the
//   minimum trace width wide is cleared (as extra pour holes).
// - Pad rotation: rounded rotated_rect pads are flashed with a %LR load
//   rotation, which some CAM tools and viewers ignore (U6's SOT-23-5 pads would
//   then overlap). Pads at multiples of 90 degrees become unrotated pads with
//   their size swapped; `npm run fab` fails if any %LR is left.
//
// Usage: bun scripts/fab-json.ts [in.json] [out.json]
//   without out.json it applies the fixes in memory and only checks the result
//   (used by `npm run verify`)
import { readFileSync, writeFileSync } from "node:fs"

const [input = "dist/index/circuit.json", output] = process.argv.slice(2)
const cj: any[] = JSON.parse(readFileSync(input, "utf8"))

const MIN_TRACE_WIDTH = 0.127
const LAYERS = ["top", "inner1", "inner2", "bottom"]
// Thermal pads: component -> pad port hints, and paste panes [columns, rows, area fraction]
const THERMAL: Record<string, { hints: string[]; panes: [number, number, number] }> = {
  // ESP32-C3-MINI-1 EPAD: nine 1.45 mm squares, each already one pane of the grid
  U1: { hints: ["pin49", "pin54", "pin55", "pin56", "pin57", "pin58", "pin59", "pin60", "pin61"], panes: [1, 1, 0.6] },
  // ADS1220 2.1 mm EP: 2 x 2 windowpanes
  U3: { hints: ["thermalpad"], panes: [2, 2, 0.55] },
  // MAX17048 1.2 x 0.8 mm EP: too small for windowpanes with a printable web
  U5: { hints: ["thermalpad"], panes: [1, 1, 0.6] },
}
// Through-hole parts soldered pin-in-paste from the top in the top reflow
const PIN_IN_PASTE = new Set(["J2"])

const names = new Map<string, string>()
{
  const source = new Map(
    cj.filter((e) => e.type === "source_component").map((e) => [e.source_component_id, e.name]),
  )
  for (const e of cj)
    if (e.type === "pcb_component" && source.has(e.source_component_id))
      names.set(e.pcb_component_id, source.get(e.source_component_id))
}
const padName = (e: any) => `${names.get(e.pcb_component_id) ?? "?"}.${e.port_hints?.[0] ?? e.pcb_smtpad_id}`
const failures: string[] = []

// ---------------------------------------------------------------- pad rotation
let unrotated = 0
for (const e of cj) {
  if (e.type !== "pcb_smtpad" || e.shape !== "rotated_rect" || !e.ccw_rotation) continue
  const rot = ((e.ccw_rotation % 360) + 360) % 360
  if (rot % 90) continue
  if (rot % 180) [e.width, e.height] = [e.height, e.width]
  e.ccw_rotation = 0
  unrotated++
}

// ---------------------------------------------------------------- GND pours
const RES = 0.02 // mm per raster cell
const ERODE = Math.round(MIN_TRACE_WIDTH / 2 / RES)
const MIN_AREA = 0.05 // mm2; floating specks below this are ignored by the check
const gnd = cj.find((e) => e.type === "source_net" && e.name === "GND")?.source_net_id

type Box = [number, number, number, number]
const anchors: Record<string, Box[]> = Object.fromEntries(LAYERS.map((l) => [l, []]))
{
  const gndPorts = new Set<string>()
  for (const e of cj)
    if (e.type === "source_trace" && e.connected_source_net_ids?.includes(gnd))
      for (const id of e.connected_source_port_ids) gndPorts.add(id)
  const portSource = new Map<string, string>(
    cj.filter((e) => e.type === "pcb_port").map((e) => [e.pcb_port_id, e.source_port_id]),
  )
  const isGnd = (e: any) => gndPorts.has(portSource.get(e.pcb_port_id) ?? "")
  const onGndTrace = (e: any) => String(e.pcb_trace_id ?? "").startsWith(`${gnd}_`)
  for (const e of cj) {
    if (e.type === "pcb_smtpad" && isGnd(e)) {
      let [w, h] = [(e.width ?? 2 * (e.radius ?? 0)) / 3, (e.height ?? 2 * (e.radius ?? 0)) / 3]
      if ((e.ccw_rotation ?? 0) % 180) [w, h] = [h, w]
      anchors[e.layer].push([e.x - w, e.y - h, e.x + w, e.y + h])
    } else if (e.type === "pcb_plated_hole" && isGnd(e)) {
      for (const l of e.layers) anchors[l].push([e.x - 0.1, e.y - 0.1, e.x + 0.1, e.y + 0.1])
    } else if (e.type === "pcb_trace" && onGndTrace(e)) {
      for (const p of e.route) {
        // through_pad: a layer change through a plated hole or via, at p.start
        const { x, y } = p.route_type === "through_pad" ? p.start : p
        for (const l of p.route_type === "wire" ? [p.layer] : LAYERS) anchors[l].push([x, y, x, y])
      }
    } else if (e.type === "pcb_via" && (e.source_net_id === gnd || onGndTrace(e))) {
      // source_net_id: the <via connectsTo="net.GND"> stitching vias
      for (const l of e.layers ?? LAYERS) anchors[l].push([e.x, e.y, e.x, e.y])
    }
  }
}

type Grid = { x0: number; y0: number; nx: number; ny: number }
const board = cj.find((e) => e.type === "pcb_board")
const g: Grid = {
  x0: board.center.x - board.width / 2 - 2 * RES,
  y0: board.center.y - board.height / 2 - 2 * RES,
  nx: Math.ceil(board.width / RES) + 4,
  ny: Math.ceil(board.height / RES) + 4,
}
const poursOn = (layer: string) =>
  cj.filter((e) => e.type === "pcb_copper_pour" && e.source_net_id === gnd && e.layer === layer)

// Pour copper of a layer as the Gerber draws it: each piece's outer ring, then
// its holes in clear polarity (so holes also clear earlier, overlapping pieces)
const rasterize = (layer: string) => {
  const cells = new Uint8Array(g.nx * g.ny)
  const ringRows = (ring: any[], value: number) => {
    const ys = ring.map((p) => p.y)
    const j0 = Math.max(0, Math.floor((Math.min(...ys) - g.y0) / RES))
    const j1 = Math.min(g.ny - 1, Math.ceil((Math.max(...ys) - g.y0) / RES))
    for (let j = j0; j <= j1; j++) {
      const y = g.y0 + (j + 0.5) * RES
      const cross: number[] = []
      for (let k = 0; k < ring.length; k++) {
        const [a, b] = [ring[k], ring[(k + 1) % ring.length]]
        if (a.y > y !== b.y > y) cross.push(a.x + ((y - a.y) * (b.x - a.x)) / (b.y - a.y))
      }
      cross.sort((a, b) => a - b)
      for (let k = 0; k + 1 < cross.length; k += 2) {
        const i0 = Math.max(0, Math.round((cross[k] - g.x0) / RES))
        const i1 = Math.min(g.nx, Math.round((cross[k + 1] - g.x0) / RES))
        if (i1 > i0) cells.fill(value, j * g.nx + i0, j * g.nx + i1)
      }
    }
  }
  for (const pour of poursOn(layer)) {
    ringRows(pour.brep_shape.outer_ring.vertices, 1)
    for (const hole of pour.brep_shape.inner_rings ?? []) ringRows(hole.vertices, 0)
  }
  return cells
}

// Square erosion (keep cells with copper >= r cells away along both axes) and dilation
const morph = (src: Uint8Array, r: number, erode: boolean) => {
  const pass = (a: Uint8Array, count: number, len: number, idx: (line: number, i: number) => number) => {
    const out = new Uint8Array(a.length)
    const run = new Int32Array(len)
    for (let line = 0; line < count; line++) {
      if (erode) {
        let n = 0
        for (let i = 0; i < len; i++) run[i] = n = a[idx(line, i)] ? n + 1 : 0
        n = 0
        for (let i = len - 1; i >= 0; i--) {
          n = a[idx(line, i)] ? n + 1 : 0
          out[idx(line, i)] = run[i] > r && n > r ? 1 : 0
        }
      } else {
        // distances live in an Int32Array, so no Infinity sentinels
        let last = -2 * len
        for (let i = 0; i < len; i++) {
          if (a[idx(line, i)]) last = i
          run[i] = i - last
        }
        last = 3 * len
        for (let i = len - 1; i >= 0; i--) {
          if (a[idx(line, i)]) last = i
          out[idx(line, i)] = run[i] <= r || last - i <= r ? 1 : 0
        }
      }
    }
    return out
  }
  const rows = pass(src, g.ny, g.nx, (j, i) => j * g.nx + i)
  return pass(rows, g.nx, g.ny, (i, j) => j * g.nx + i)
}

const NEIGHBOURS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]
// Label the eroded copper; returns labels, region sizes and the labels a GND anchor reaches
const regions = (layer: string, eroded: Uint8Array) => {
  const label = new Int32Array(eroded.length)
  const sizes: number[] = [0]
  for (let start = 0; start < eroded.length; start++) {
    if (!eroded[start] || label[start]) continue
    const n = sizes.length
    const queue = [start]
    label[start] = n
    for (let q = 0; q < queue.length; q++) {
      const c = queue[q]
      // 8-connected: diagonal eroded cells overlap by about the minimum width
      const i = c % g.nx
      for (const [di, dj] of NEIGHBOURS) {
        const e = c + dj * g.nx + di
        if (i + di >= 0 && i + di < g.nx && e >= 0 && e < eroded.length && eroded[e] && !label[e]) {
          label[e] = n
          queue.push(e)
        }
      }
    }
    sizes.push(queue.length)
  }
  const anchored = new Set<number>()
  for (const [bx0, by0, bx1, by1] of anchors[layer])
    for (let j = Math.floor((by0 - g.y0) / RES); j <= Math.floor((by1 - g.y0) / RES); j++)
      for (let i = Math.floor((bx0 - g.x0) / RES); i <= Math.floor((bx1 - g.x0) / RES); i++)
        if (i >= 0 && i < g.nx && j >= 0 && j < g.ny && label[j * g.nx + i]) anchored.add(label[j * g.nx + i])
  return { label, sizes, anchored }
}

const floating = (layer: string) => {
  const { label, sizes, anchored } = regions(layer, morph(rasterize(layer), ERODE, true))
  const out: { area: number; x: number; y: number }[] = []
  const sum = sizes.map(() => [0, 0])
  for (let c = 0; c < label.length; c++)
    if (label[c]) {
      sum[label[c]][0] += c % g.nx
      sum[label[c]][1] += Math.floor(c / g.nx)
    }
  for (let n = 1; n < sizes.length; n++) {
    const area = sizes[n] * RES * RES
    if (anchored.has(n) || area < MIN_AREA) continue
    out.push({ area, x: g.x0 + (sum[n][0] / sizes[n] + 0.5) * RES, y: g.y0 + (sum[n][1] / sizes[n] + 0.5) * RES })
  }
  return out
}

let clearedArea = 0
let clearedLayers = 0
{
  for (const layer of LAYERS) {
    const pours = poursOn(layer)
    if (!pours.length) continue
    const copper = rasterize(layer)
    const { label, anchored } = regions(layer, morph(copper, ERODE, true))
    // keep the opening of the anchored regions (plus a cell for raster noise), clear the rest
    const keep = new Uint8Array(copper.length)
    for (let c = 0; c < label.length; c++) keep[c] = anchored.has(label[c]) ? 1 : 0
    const kept = morph(keep, ERODE + 1, false)
    // clear runs, merged down rows into rectangles
    const open = new Map<string, number>() // "i0,i1" -> first row
    const holes: any[] = []
    const emit = (i0: number, i1: number, j0: number, j1: number) => {
      const [xa, xb] = [g.x0 + i0 * RES, g.x0 + i1 * RES]
      const [ya, yb] = [g.y0 + j0 * RES, g.y0 + j1 * RES]
      holes.push({ vertices: [{ x: xa, y: ya }, { x: xb, y: ya }, { x: xb, y: yb }, { x: xa, y: yb }] })
      clearedArea += (i1 - i0) * (j1 - j0) * RES * RES
    }
    for (let j = 0; j <= g.ny; j++) {
      const runs = new Set<string>()
      for (let i = 0; j < g.ny && i < g.nx; i++) {
        if (!copper[j * g.nx + i] || kept[j * g.nx + i]) continue
        let k = i
        while (k < g.nx && copper[j * g.nx + k] && !kept[j * g.nx + k]) k++
        runs.add(`${i},${k}`)
        i = k
      }
      for (const [key, j0] of open)
        if (!runs.has(key)) {
          const [i0, i1] = key.split(",").map(Number)
          emit(i0, i1, j0, j)
          open.delete(key)
        }
      for (const key of runs) if (!open.has(key)) open.set(key, j)
    }
    if (holes.length) {
      // the layer's last pour is drawn last, so its holes clear all of the layer's pours
      const last = pours[pours.length - 1]
      last.brep_shape.inner_rings = [...(last.brep_shape.inner_rings ?? []), ...holes]
      clearedLayers++
    }
  }
}
for (const layer of LAYERS)
  for (const f of floating(layer))
    failures.push(`${f.area.toFixed(2)} mm2 of ${layer} GND pour at (${f.x.toFixed(2)}, ${f.y.toFixed(2)}) is not connected to GND`)

// ---------------------------------------------------------------- solder paste
// Axis-aligned size of a pad after its rotation (only multiples of 90 degrees occur)
const padSize = (e: any): [number, number] => {
  const rot = ((e.ccw_rotation ?? 0) % 180 + 180) % 180
  if (rot % 90) throw new Error(`${padName(e)}: paste for ${e.ccw_rotation} degree pads is not supported`)
  const [w, h] = e.shape === "circle" ? [2 * e.radius, 2 * e.radius] : [e.width, e.height]
  return rot === 90 ? [h, w] : [w, h]
}
const isPill = (e: any) => e.shape === "pill" || e.shape === "rotated_pill"
const thermal = (e: any) => THERMAL[names.get(e.pcb_component_id) ?? ""]?.hints.some((h) => e.port_hints?.includes(h))

let pasteCount = 0
{
  const pads = cj.filter((e) => e.type === "pcb_smtpad")
  const holes = cj.filter((e) => e.type === "pcb_plated_hole")
  const paste: any[] = []
  const add = (e: any) => paste.push({ type: "pcb_solder_paste", pcb_solder_paste_id: `pcb_solder_paste_${paste.length}`, ...e })
  for (const pad of pads) {
    if (pad.is_covered_with_solder_mask) continue
    if (pad.shape === "polygon") throw new Error(`${padName(pad)}: polygon pads need paste; use a rect pad`)
    const [w, h] = padSize(pad)
    const base = { layer: pad.layer, pcb_smtpad_id: pad.pcb_smtpad_id, subcircuit_id: pad.subcircuit_id }
    const spec = THERMAL[names.get(pad.pcb_component_id) ?? ""]
    if (thermal(pad)) {
      const [cols, rows, fraction] = spec.panes
      const k = Math.sqrt(fraction)
      for (let c = 0; c < cols; c++)
        for (let r = 0; r < rows; r++)
          add({
            ...base,
            shape: "rect",
            x: pad.x + (c + 0.5 - cols / 2) * (w / cols),
            y: pad.y + (r + 0.5 - rows / 2) * (h / rows),
            width: (w / cols) * k,
            height: (h / rows) * k,
          })
    } else if (pad.shape === "circle") {
      add({ ...base, shape: "circle", x: pad.x, y: pad.y, radius: pad.radius })
    } else {
      add({ ...base, shape: isPill(pad) ? "pill" : "rect", x: pad.x, y: pad.y, width: w, height: h })
    }
  }
  for (const hole of holes) {
    if (!PIN_IN_PASTE.has(names.get(hole.pcb_component_id) ?? "")) continue
    const [w, h] = hole.shape === "circle" ? [hole.outer_diameter, hole.outer_diameter] : padSize({ ...hole, width: hole.outer_width, height: hole.outer_height })
    add({ layer: "top", shape: hole.shape === "circle" ? "circle" : "pill", x: hole.x, y: hole.y, width: w, height: h, radius: w / 2, subcircuit_id: hole.subcircuit_id })
  }
  pasteCount = paste.length
  cj.splice(0, cj.length, ...cj.filter((e) => e.type !== "pcb_solder_paste"), ...paste)
}

// Every exposed SMT pad has paste on its own layer (1:1, or 50-70 % on thermal
// pads); no plated hole has paste, except top-side pin-in-paste on the listed parts
{
  const paste = cj.filter((e) => e.type === "pcb_solder_paste")
  const pasteArea = (p: any) =>
    p.shape === "circle" ? Math.PI * p.radius ** 2
    : p.shape === "pill" ? p.width * p.height - (1 - Math.PI / 4) * Math.min(p.width, p.height) ** 2
    : p.width * p.height
  const within = (p: any, x: number, y: number, w: number, h: number) =>
    Math.abs(p.x - x) <= w / 2 + 1e-6 && Math.abs(p.y - y) <= h / 2 + 1e-6
  for (const pad of cj.filter((e) => e.type === "pcb_smtpad" && !e.is_covered_with_solder_mask)) {
    const [w, h] = pad.shape === "polygon" ? [0, 0] : padSize(pad)
    const area = pasteArea({ shape: isPill(pad) ? "pill" : pad.shape, radius: pad.radius, width: w, height: h })
    const ratio = paste.filter((p) => p.layer === pad.layer && within(p, pad.x, pad.y, w, h))
      .reduce((s, p) => s + pasteArea(p), 0) / (area || 1)
    const [lo, hi] = thermal(pad) ? [0.5, 0.7] : [0.95, 1.05]
    if (ratio < lo || ratio > hi)
      failures.push(`${padName(pad)} (${pad.layer}) has paste over ${(ratio * 100).toFixed(0)} % of its area, expected ${lo * 100}-${hi * 100} %`)
  }
  for (const hole of cj.filter((e) => e.type === "pcb_plated_hole")) {
    const w = hole.outer_width ?? hole.outer_diameter
    const h = hole.outer_height ?? hole.outer_diameter
    for (const p of paste.filter((p) => within(p, hole.x, hole.y, w, h))) {
      const name = names.get(hole.pcb_component_id) ?? "?"
      if (p.layer === "top" && PIN_IN_PASTE.has(name)) continue
      failures.push(`${name} plated hole at (${hole.x.toFixed(2)}, ${hole.y.toFixed(2)}) has ${p.layer} paste`)
    }
  }
}

if (output) writeFileSync(output, JSON.stringify(cj))
console.log(
  `paste: ${pasteCount} apertures; cleared ${clearedArea.toFixed(2)} mm2 of floating GND pour on ${clearedLayers} layers; ` +
    `unrotated ${unrotated} pads`,
)
for (const f of failures.slice(0, 20)) console.log(`FAIL ${f}`)
if (failures.length > 20) console.log(`... ${failures.length - 20} more`)
console.log(failures.length ? `${failures.length} fab problems` : "fab copper and paste ok")
process.exit(failures.length ? 1 : 0)
