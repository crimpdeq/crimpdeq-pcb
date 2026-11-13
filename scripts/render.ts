// Render dist/index/circuit.json to high-resolution PNGs for layout review.
// Usage: bun scripts/render.ts [circuit.json] [outDir]
import { readFileSync, mkdirSync, writeFileSync } from "node:fs"
import {
  convertCircuitJsonToPcbSvg,
  convertCircuitJsonToSchematicSvg,
} from "circuit-to-svg"
import { Resvg } from "@resvg/resvg-js"

const input = process.argv[2] ?? "dist/index/circuit.json"
const outDir = process.argv[3] ?? "dist/render"
const circuitJson = JSON.parse(readFileSync(input, "utf8"))
mkdirSync(outDir, { recursive: true })

const toPng = (svg: string, file: string, width: number) => {
  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    background: "#000",
  })
    .render()
    .asPng()
  writeFileSync(`${outDir}/${file}`, png)
}

for (const layer of ["top", "bottom"] as const) {
  const svg = convertCircuitJsonToPcbSvg(circuitJson, {
    layer,
    showCourtyards: true,
    shouldDrawErrors: true,
    shouldDrawRatsNest: true,
    matchBoardAspectRatio: true,
    width: 1000,
    height: 1600,
  })
  toPng(svg, `pcb-${layer}.png`, 1000)
}

const allSvg = convertCircuitJsonToPcbSvg(circuitJson, {
  showCourtyards: false,
  shouldDrawErrors: true,
  matchBoardAspectRatio: true,
  width: 1000,
  height: 1600,
})
toPng(allSvg, "pcb-all.png", 1000)

toPng(convertCircuitJsonToSchematicSvg(circuitJson), "schematic.png", 2400)
console.log(`Rendered to ${outDir}`)

// Optional zoomed top-copper view: ZOOM="minX,minY,maxX,maxY"
if (process.env.ZOOM) {
  const [minX, minY, maxX, maxY] = process.env.ZOOM.split(",").map(Number)
  for (const layer of ["top", "bottom"] as const) {
    const svg = convertCircuitJsonToPcbSvg(circuitJson, {
      layer,
      shouldDrawErrors: false,
      viewport: { minX, minY, maxX, maxY },
      width: 1200,
      height: Math.round((1200 * (maxY - minY)) / (maxX - minX)),
    })
    toPng(svg, `zoom-${layer}.png`, 1200)
  }
}
