// Grid router that writes the fixed routes in lib/handRoutes.ts. It connects the
// nets listed in scripts/handroute.json one link at a time (pad to pad), in that
// order, on a 0.05 mm grid over all four layers: 0.127 mm clearance to other
// nets, vias 0.15 mm from pads, through vias that block every layer, clear of
// keepouts, NPTH holes (0.2 mm) and the inner-layer GND regions of lib/gndPlane.ts.
// Paths are straightened where the clearance allows. Run scripts/handroute.sh,
// which builds the board without these routes and without the autorouter first.
// Usage: bun scripts/handroute.ts circuit.json scripts/handroute.json lib/handRoutes.ts
//   task: { net, width, from?: ".X > .pin" (route from this pad's group), single?: true }
import { readFileSync, writeFileSync } from "node:fs"
import { GND_PLANE_REGIONS } from "../lib/gndPlane"

const [cjFile, tasksFile, outFile] = process.argv.slice(2)
const cj: any[] = JSON.parse(readFileSync(cjFile, "utf8"))
const tasks: any[] = JSON.parse(readFileSync(tasksFile, "utf8"))

const LAYERS = ["top", "inner1", "inner2", "bottom"]
const G = 0.05
const X0 = -8.5, Y0 = -15.75
const NX = Math.round(17 / G) + 1, NY = Math.round(31.5 / G) + 1, N = NX * NY
const CLR = 0.127, MARGIN = 0.04, VIA_R = 0.25, VIA_PAD_CLR = 0.15, HOLE_CLR = 0.2, EDGE = 0.35
const cx = (i: number) => X0 + i * G, cy = (j: number) => Y0 + j * G
const ix = (x: number) => Math.round((x - X0) / G), iy = (y: number) => Math.round((y - Y0) / G)
const idx = (l: number, i: number, j: number) => l * N + j * NX + i

// ---- nets: union source ports and nets through source traces ----
const byType = (t: string) => cj.filter((e) => e.type === t)
const comp = new Map(byType("source_component").map((e) => [e.source_component_id, e.name]))
const sp = new Map(byType("source_port").map((e) => [e.source_port_id, e]))
const pp = new Map(byType("pcb_port").map((e) => [e.pcb_port_id, e]))
const pcomp = new Map(byType("pcb_component").map((e) => [e.pcb_component_id, e]))
const plated = new Set(byType("pcb_plated_hole").map((e) => e.pcb_port_id))
const parent = new Map<string, string>()
const find = (a: string): string => {
  let r = a
  while (parent.has(r) && parent.get(r) !== r) r = parent.get(r)!
  parent.set(a, r)
  return r
}
const union = (a: string, b: string) => parent.set(find(a), find(b))
for (const t of byType("source_trace")) {
  const ids = [...t.connected_source_port_ids, ...(t.connected_source_net_ids ?? [])]
  for (const i of ids.slice(1)) union(ids[0], i)
}
const rootName = new Map(byType("source_net").map((e) => [find(e.source_net_id), e.name]))
const portNet = (pid?: string) => {
  const p: any = pid && pp.get(pid)
  return p ? rootName.get(find(p.source_port_id)) ?? `port:${pid}` : undefined
}
const portLabel = (pid: string) => {
  const s: any = sp.get((pp.get(pid) as any).source_port_id)
  return `.${comp.get(s.source_component_id)} > .${s.name}`
}

// ---- copper and other obstacles ----
type Shape = {
  net: string
  layers: string[]
  kind: "rect" | "circle" | "seg"
  x?: number; y?: number; w?: number; h?: number; r?: number
  ax?: number; ay?: number; bx?: number; by?: number
  port?: string
  smd?: boolean
  via?: boolean
}
const shapes: Shape[] = []
for (const e of byType("pcb_smtpad")) {
  let [w, h] = [e.width ?? e.radius * 2, e.height ?? e.radius * 2]
  if (e.ccw_rotation === 90 || e.ccw_rotation === 270) [w, h] = [h, w]
  shapes.push({ net: portNet(e.pcb_port_id) ?? `nc:${e.pcb_smtpad_id}`, layers: [e.layer], kind: "rect", x: e.x, y: e.y, w, h, port: e.pcb_port_id, smd: true })
}
for (const e of byType("pcb_plated_hole")) {
  const [w, h] = [e.outer_width ?? e.outer_diameter, e.outer_height ?? e.outer_diameter]
  shapes.push({ net: portNet(e.pcb_port_id) ?? `nc:${e.pcb_plated_hole_id}`, layers: LAYERS, kind: "rect", x: e.x, y: e.y, w, h, r: Math.min(w, h) / 2, port: e.pcb_port_id })
}
for (const e of byType("pcb_hole"))
  shapes.push({ net: "hole", layers: LAYERS, kind: "circle", x: e.x, y: e.y, r: e.hole_diameter / 2 + HOLE_CLR - CLR })
const traceNet = (t: any) => {
  for (const q of t.route) {
    const n = portNet(q.start_pcb_port_id ?? q.end_pcb_port_id)
    if (n) return n
  }
  return "?"
}
const viaNet = new Map<string, string>()
for (const t of byType("pcb_trace")) {
  for (const q of t.route) if (q.route_type === "via") viaNet.set(`${q.x.toFixed(3)},${q.y.toFixed(3)}`, traceNet(t))
  for (let i = 1; i < t.route.length; i++) {
    const [a, b] = [t.route[i - 1], t.route[i]]
    if (a.route_type === "wire" && b.route_type === "wire" && a.layer === b.layer)
      shapes.push({ net: traceNet(t), layers: [a.layer], kind: "seg", ax: a.x, ay: a.y, bx: b.x, by: b.y, r: a.width / 2 })
  }
}
// standalone vias are the GND stitching vias
for (const v of byType("pcb_via"))
  shapes.push({ net: viaNet.get(`${v.x.toFixed(3)},${v.y.toFixed(3)}`) ?? "GND", layers: LAYERS, kind: "circle", x: v.x, y: v.y, r: v.outer_diameter / 2, via: true })
for (const k of byType("pcb_keepout")) {
  // the circular keepouts (J3 E+/E-) only keep the GND pour out: traces may pass, vias may not
  if (k.shape === "rect") shapes.push({ net: "keepout", layers: k.layers, kind: "rect", x: k.center.x, y: k.center.y, w: k.width, h: k.height })
  else shapes.push({ net: "keepout-traces-ok", layers: k.layers, kind: "circle", x: k.center.x, y: k.center.y, r: k.radius })
}
for (const { layer, outline: pts } of Object.values(GND_PLANE_REGIONS)) {
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y)
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  shapes.push({ net: "gnd-plane", layers: [layer], kind: "rect", x: (x0 + x1) / 2, y: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 })
}

// signed distance from a point to a shape's edge
const dist = (s: Shape, x: number, y: number) => {
  if (s.kind === "circle") return Math.hypot(x - s.x!, y - s.y!) - s.r!
  if (s.kind === "seg") {
    const [dx, dy] = [s.bx! - s.ax!, s.by! - s.ay!]
    const L = dx * dx + dy * dy
    const t = L ? Math.max(0, Math.min(1, ((x - s.ax!) * dx + (y - s.ay!) * dy) / L)) : 0
    return Math.hypot(x - s.ax! - t * dx, y - s.ay! - t * dy) - s.r!
  }
  if (s.r) {
    // stadium: oval plated hole
    const qx = Math.max(Math.abs(x - s.x!) - (s.w! / 2 - s.r), 0)
    const qy = Math.max(Math.abs(y - s.y!) - (s.h! / 2 - s.r), 0)
    return Math.hypot(qx, qy) - s.r
  }
  const qx = Math.abs(x - s.x!) - s.w! / 2, qy = Math.abs(y - s.y!) - s.h! / 2
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0)
}
const bbox = (s: Shape) =>
  s.kind === "seg"
    ? [Math.min(s.ax!, s.bx!) - s.r!, Math.max(s.ax!, s.bx!) + s.r!, Math.min(s.ay!, s.by!) - s.r!, Math.max(s.ay!, s.by!) + s.r!]
    : s.kind === "circle"
      ? [s.x! - s.r!, s.x! + s.r!, s.y! - s.r!, s.y! + s.r!]
      : [s.x! - s.w! / 2, s.x! + s.w! / 2, s.y! - s.h! / 2, s.y! + s.h! / 2]
const cells = (s: Shape, pad: number, each: (i: number, j: number) => void) => {
  const [a, b, c, d] = bbox(s)
  for (let j = Math.max(0, iy(c - pad) - 1); j <= Math.min(NY - 1, iy(d + pad) + 1); j++)
    for (let i = Math.max(0, ix(a - pad) - 1); i <= Math.min(NX - 1, ix(b + pad) + 1); i++)
      if (dist(s, cx(i), cy(j)) < pad) each(i, j)
}

// cells where a trace centerline (block) or a via center (viaBlock) of this net may not go
const masks = (net: string, w: number) => {
  const block = new Uint8Array(4 * N), viaBlock = new Uint8Array(N)
  for (const s of shapes) {
    const same = s.net === net
    if (!same && s.net !== "keepout-traces-ok" && !(s.net === "gnd-plane" && net === "GND")) {
      const layers = s.layers.map((l) => LAYERS.indexOf(l))
      cells(s, CLR + w / 2 + MARGIN, (i, j) => layers.forEach((l) => (block[idx(l, i, j)] = 1)))
    }
    if (s.net === "gnd-plane" || (same && !s.smd && !s.via && !s.port)) continue
    const r = VIA_R + MARGIN + (s.via ? CLR : s.port ? (same ? 0.05 : VIA_PAD_CLR) : CLR)
    cells(s, r, (i, j) => (viaBlock[j * NX + i] = 1))
  }
  for (let j = 0; j < NY; j++)
    for (let i = 0; i < NX; i++) {
      const [x, y] = [Math.abs(cx(i)), Math.abs(cy(j))]
      if (x > 8.5 - EDGE - w / 2 - MARGIN || y > 15.75 - EDGE - w / 2 - MARGIN) for (let l = 0; l < 4; l++) block[idx(l, i, j)] = 1
      if (x > 8.5 - EDGE - VIA_R - MARGIN || y > 15.75 - EDGE - VIA_R - MARGIN) viaBlock[j * NX + i] = 1
    }
  return { block, viaBlock }
}

// ---- pad groups already joined by traces ----
const groupOf = new Map<string, string>()
const gfind = (a: string): string => {
  let r = a
  while (groupOf.has(r) && groupOf.get(r) !== r) r = groupOf.get(r)!
  groupOf.set(a, r)
  return r
}
const gunion = (a: string, b: string) => groupOf.set(gfind(a), gfind(b))
for (const t of byType("pcb_trace")) {
  const ends = t.route.map((q: any) => q.start_pcb_port_id ?? q.end_pcb_port_id).filter(Boolean)
  for (const e of ends.slice(1)) gunion(ends[0], e)
}

class Heap {
  k: number[] = []
  v: number[] = []
  get size() { return this.k.length }
  push(key: number, val: number) {
    const { k, v } = this
    let i = k.length
    k.push(key); v.push(val)
    while (i > 0) {
      const p = (i - 1) >> 1
      if (k[p] <= key) break
      k[i] = k[p]; v[i] = v[p]; i = p
    }
    k[i] = key; v[i] = val
  }
  pop() {
    const { k, v } = this
    const top = v[0], lk = k.pop()!, lv = v.pop()!
    if (k.length) {
      let i = 0
      for (;;) {
        let c = 2 * i + 1
        if (c >= k.length) break
        if (c + 1 < k.length && k[c + 1] < k[c]) c++
        if (k[c] >= lk) break
        k[i] = k[c]; v[i] = v[c]; i = c
      }
      k[i] = lk; v[i] = lv
    }
    return top
  }
}
const clear = (block: Uint8Array, l: number, a: P, b: P) => {
  const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / (G / 2)))
  for (let k = 0; k <= n; k++) if (block[idx(l, ix(a.x + ((b.x - a.x) * k) / n), iy(a.y + ((b.y - a.y) * k) / n))]) return false
  return true
}
type P = { x: number; y: number; l: number }
const STEPS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]]
const VIA_COST = 30 // grid steps (1.5 mm)

const routes: any[] = []
let failed = 0
for (const task of tasks) {
  const { net, width: w } = task
  for (let link = 0; ; link++) {
    const groups = new Map<string, string[]>()
    for (const p of byType("pcb_port").filter((p) => portNet(p.pcb_port_id) === net))
      groups.set(gfind(p.pcb_port_id), [...(groups.get(gfind(p.pcb_port_id)) ?? []), p.pcb_port_id])
    if (groups.size <= 1 || (task.single && link > 0)) break
    const sorted = [...groups.values()].sort((a, b) => a.length - b.length)
    const src = new Set(sorted.find((g) => g.some((p) => portLabel(p) === task.from)) ?? sorted[0])
    const { block, viaBlock } = masks(net, w)
    // Dijkstra from the source group's pads to any other pad of the net
    const cost = new Float64Array(4 * N).fill(Infinity), prev = new Int32Array(4 * N).fill(-1)
    const target = new Int32Array(4 * N).fill(-1)
    const ports: string[] = []
    const heap = new Heap()
    for (const s of shapes.filter((s) => s.port && s.net === net)) {
      const pi = ports.push(s.port!) - 1
      const layers = s.layers.map((l) => LAYERS.indexOf(l))
      cells(s, -0.02, (i, j) => {
        for (const l of layers) {
          const id = idx(l, i, j)
          block[id] = 0
          if (src.has(s.port!)) { cost[id] = 0; prev[id] = -2 - pi; heap.push(0, id) }
          else target[id] = pi
        }
      })
    }
    let found = -1
    while (heap.size) {
      const id = heap.pop()
      if (target[id] >= 0) { found = id; break }
      const l = Math.floor(id / N), rem = id % N, j = Math.floor(rem / NX), i = rem % NX
      for (const [di, dj, c] of STEPS) {
        const [ni, nj] = [i + di, j + dj]
        if (ni < 0 || nj < 0 || ni >= NX || nj >= NY) continue
        const nid = idx(l, ni, nj)
        if (!block[nid] && cost[id] + c < cost[nid]) { cost[nid] = cost[id] + c; prev[nid] = id; heap.push(cost[nid], nid) }
      }
      if (!viaBlock[rem])
        for (let nl = 0; nl < 4; nl++) {
          const nid = idx(nl, i, j)
          if (nl !== l && !block[nid] && cost[id] + VIA_COST < cost[nid]) { cost[nid] = cost[id] + VIA_COST; prev[nid] = id; heap.push(cost[nid], nid) }
        }
    }
    if (found < 0) {
      console.log(`FAIL ${net} from ${[...src].map(portLabel).join(", ")}`)
      failed++
      break
    }
    const path: number[] = []
    let cur = found
    for (; cur >= 0; cur = prev[cur]) path.push(cur)
    path.reverse()
    const [startPort, endPort] = [ports[-2 - cur], ports[target[found]]]
    // per-layer runs, straightened, joined by vias
    const runs: P[][] = []
    for (const id of path) {
      const rem = id % N
      const p = { x: cx(rem % NX), y: cy(Math.floor(rem / NX)), l: Math.floor(id / N) }
      if (runs.length && runs[runs.length - 1][0].l === p.l) runs[runs.length - 1].push(p)
      else runs.push([p])
    }
    const points: any[] = []
    for (const [ri, run] of runs.entries()) {
      const kept = [run[0]]
      for (let a = 0; a < run.length - 1; ) {
        let b = run.length - 1
        while (b > a + 1 && !clear(block, run[0].l, run[a], run[b])) b--
        kept.push(run[b])
        a = b
      }
      for (const [m, p] of kept.entries()) {
        if (m && p.x === kept[m - 1].x && p.y === kept[m - 1].y) continue
        if (m) shapes.push({ net, layers: [LAYERS[p.l]], kind: "seg", ax: kept[m - 1].x, ay: kept[m - 1].y, bx: p.x, by: p.y, r: w / 2 })
        points.push([+p.x.toFixed(3), +p.y.toFixed(3)])
      }
      if (ri < runs.length - 1) {
        const p = kept[kept.length - 1]
        points.push([+p.x.toFixed(3), +p.y.toFixed(3), LAYERS[p.l], LAYERS[runs[ri + 1][0].l]])
        shapes.push({ net, layers: LAYERS, kind: "circle", x: p.x, y: p.y, r: VIA_R, via: true })
      }
    }
    // pcbPath wants point, via, point at a layer change
    const full: any[] = []
    for (const p of points) {
      full.push(p)
      if (p.length === 4) full.push([p[0], p[1]])
    }
    // core starts a trace from a plated hole on the top layer: start from the other end
    let [from, to, pts] = [startPort, endPort, full]
    if (plated.has(from) && runs[0][0].l !== 0) {
      ;[from, to] = [endPort, startPort]
      pts = full.reverse().map((p) => (p.length === 4 ? [p[0], p[1], p[3], p[2]] : p))
    }
    const c: any = pcomp.get((pp.get(from) as any).pcb_component_id)
    routes.push({ from: portLabel(from), to: portLabel(to), width: w, frame: [c.center.x, c.center.y, c.rotation ?? 0], points: pts })
    console.log(`${net}: ${portLabel(from)} -> ${portLabel(to)}, ${pts.filter((p) => p.length === 4).length} vias`)
    gunion(startPort, endPort)
  }
}

const fmt = (p: any[]) => (p.length === 4 ? `[${p[0]}, ${p[1]}, "${p[2]}", "${p[3]}"]` : `[${p[0]}, ${p[1]}]`)
const body = routes.map((r) => {
  const lines: string[] = []
  let line = "    points: ["
  for (const p of r.points.map(fmt)) {
    if (line.length + p.length > 92) { lines.push(line.trimEnd()); line = "      " }
    line += `${p}, `
  }
  lines.push(`${line.replace(/, $/, "")}],`)
  return [
    "  {",
    `    from: "${r.from}",`,
    `    to: "${r.to}",`,
    `    width: ${r.width},`,
    `    frame: [${r.frame.map((v: number) => +v.toFixed(4)).join(", ")}],`,
    ...lines,
    "  },",
  ].join("\n")
})
writeFileSync(
  outFile,
  `// Fixed routes for the nets the board autorouter used to route. Generated by
// scripts/handroute.sh (scripts/handroute.ts, tasks in scripts/handroute.json);
// do not edit by hand. Points are board coordinates, a point with a layer pair
// is a via; frame is the from-port component's center and rotation.
type Layer = "top" | "inner1" | "inner2" | "bottom"
export const HAND_ROUTES: {
  from: string
  to: string
  width: number
  frame: [number, number, number]
  points: ([number, number] | [number, number, Layer, Layer])[]
}[] = [
${body.join("\n")}
]
`,
)
process.exit(failed ? 1 : 0)
