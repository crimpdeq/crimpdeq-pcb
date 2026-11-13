// Render per-side assembly drawings from dist/index/circuit.json.
// `tsci export -f assembly-svg` ignores --layer and overlays both sides, so each
// side is filtered here; the bottom is mirrored, as seen looking at the bottom.
// Usage: bun scripts/assembly.ts [circuit.json] [outDir]
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { convertCircuitJsonToAssemblySvg } from "circuit-to-svg"

const input = process.argv[2] ?? "dist/index/circuit.json"
const outDir = process.argv[3] ?? "dist/fab"
const circuitJson: any[] = JSON.parse(readFileSync(input, "utf8"))
mkdirSync(outDir, { recursive: true })

const WIDTH = 800
const CAPTION_HEIGHT = 40
const board = circuitJson.find((e) => e.type === "pcb_board")
// The renderer adds 1 mm around the board
const height = Math.round((WIDTH * (board.height + 2)) / (board.width + 2)) + CAPTION_HEIGHT

// The renderer marks the component's first port: make it pin 1, or the cathode of diodes
const sourcePorts = new Map(
  circuitJson.filter((e) => e.type === "source_port").map((p) => [p.source_port_id, p]),
)
const markerRank = (port: any) => {
  const hints: string[] = sourcePorts.get(port.source_port_id)?.port_hints ?? []
  if (hints.includes("cathode")) return 0
  if (hints.includes("anode")) return 2
  return hints.includes("1") ? 1 : 2
}

const CAPTIONS = {
  top: "TOP side (viewed from top)",
  bottom: "BOTTOM side (mirrored, viewed from bottom)",
}

for (const side of ["top", "bottom"] as const) {
  const mirror = side === "bottom"
  const mx = (x: number) => (mirror ? -x : x)
  const components = new Set(
    circuitJson
      .filter((e) => e.type === "pcb_component" && e.layer === side)
      .map((c) => c.pcb_component_id),
  )
  const kept = circuitJson.filter((e) => {
    if (e.type === "pcb_component") return components.has(e.pcb_component_id)
    if (e.type === "pcb_smtpad") return e.layer === side
    // Holes go through the board: keep them on both sides as landmarks
    return !e.type.startsWith("pcb_") || ["pcb_board", "pcb_hole", "pcb_plated_hole"].includes(e.type)
  })
  const ports = circuitJson
    .filter((e) => e.type === "pcb_port" && components.has(e.pcb_component_id))
    .sort((a, b) => markerRank(a) - markerRank(b))
  const sideJson = structuredClone([...kept, ...ports])

  for (const e of sideJson) {
    if (e.type === "pcb_board") {
      e.center.x = mx(e.center.x)
      for (const p of e.outline ?? []) p.x = mx(p.x)
    } else if (e.type === "pcb_component") {
      e.center.x = mx(e.center.x)
      // width/height already span the rotated footprint; the renderer would
      // rotate the pin-1 marker a second time
      e.rotation = 0
    } else if (e.type.startsWith("pcb_")) {
      if (typeof e.x === "number") e.x = mx(e.x)
      for (const p of e.points ?? []) p.x = mx(p.x)
      if (mirror && e.ccw_rotation) e.ccw_rotation = -e.ccw_rotation
      // The renderer skips rotated pills (U3's QFN pads)
      if (e.type === "pcb_smtpad" && e.shape === "rotated_pill") e.shape = "rotated_rect"
    }
  }

  const svg = convertCircuitJsonToAssemblySvg(sideJson, { width: WIDTH, height }).replace(
    "</svg>",
    `<text x="${WIDTH / 2}" y="${CAPTION_HEIGHT / 2 + 8}" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="bold">${CAPTIONS[side]}</text></svg>`,
  )
  writeFileSync(`${outDir}/assembly-${side}.svg`, svg)
}
console.log(`Assembly drawings written to ${outDir}`)
