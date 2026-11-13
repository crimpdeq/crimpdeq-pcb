// Make vias in fixed traces (non-empty pcbPath) through vias. tscircuit core
// gives them only the layers they join (getViaSpanLayers), which exports
// blind/buried drill files and leaves the other layers' copper, the GND pours
// included, over the drill. Autorouted vias already span all layers unless the
// board sets allowBlindAndBuriedVias; this applies the same rule to fixed
// traces. Runs on postinstall; safe to run repeatedly.
import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

const file = fileURLToPath(new URL("../node_modules/@tscircuit/core/dist/index.js", import.meta.url))

const original = `        layers: getViaSpanLayers({
          fromLayer,
          toLayer,
          layerCount: subcircuit._getSubcircuitLayerCount()
        }),`
const applied = `        layers: getAutoroutedViaLayers({
          fromLayer,
          toLayer,
          layerCount: subcircuit._getSubcircuitLayerCount(),
          allowBlindAndBuriedVias: db2.pcb_board.get(trace._getBoard()?.pcb_board_id)?.allow_blind_and_buried_vias ?? false
        }),`

let source = readFileSync(file, "utf8")
if (source.includes(applied)) {
  console.log("patch-core: fixed-trace vias already span all layers")
} else {
  const matches = source.split(original).length - 1
  if (matches !== 1) {
    console.error(
      `patch-core: expected 1 match in ${file}, found ${matches}; ` +
        "the core code changed, update scripts/patch-core.mjs",
    )
    process.exit(1)
  }
  writeFileSync(file, source.replace(original, applied))
  console.log("patch-core: fixed-trace vias now span all layers")
}
