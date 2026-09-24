/** Reproduce endpoint-inference diagnostics without changing the design or checks.
 * @tscircuit/checks 0.0.208 infers endpoint pad membership without a layer test.
 * All raw diagnostics remain in the report. No result is waived or suppressed.
 */
import fs from "node:fs/promises"
import { createHash } from "node:crypto"
import { createRequire } from "node:module"
import path from "node:path"
import assert from "node:assert/strict"
import type { AnyCircuitElement } from "circuit-json"
import { runAllChecks, checkEachPcbPortConnectedToPcbTraces } from "@tscircuit/checks"
import { getFullConnectivityMapFromCircuitJson } from "circuit-json-to-connectivity-map"

type RecordElement = Record<string, any>
const input = process.argv[2] ?? "dist/crimpdeq/circuit.json"
const output = process.argv[3] ?? "dist/crimpdeq/checker-analysis.json"
const bytes = await fs.readFile(input)
const original = JSON.parse(bytes.toString()) as AnyCircuitElement[]
const before = getFullConnectivityMapFromCircuitJson(original)
const records = original as RecordElement[]
const ports = new Map(records.filter(e => e.type === "pcb_port").map(e => [e.pcb_port_id, e]))
const traces = new Map(records.filter(e => e.type === "pcb_trace").map(e => [e.pcb_trace_id, e]))
const nets = records.filter(e => e.type === "source_net")
const namesByRoot = new Map<string, string[]>()
for (const n of nets) {
  const root = before.getNetConnectedToId(n.source_net_id)
  if (root) namesByRoot.set(root, [...(namesByRoot.get(root) ?? []), n.name])
}
const names = (id: string): string[] => namesByRoot.get(before.getNetConnectedToId(id) ?? "") ?? []

// runAllChecks mutates its input to add inferred endpoint IDs. It receives a
// disposable structured clone, never the persisted Circuit JSON or source.
const checked = structuredClone(original)
const rawDiagnostics = await runAllChecks(checked)
const addedEndpointAssociations: RecordElement[] = []
for (const t of checked as RecordElement[]) {
  if (t.type !== "pcb_trace") continue
  const old = traces.get(t.pcb_trace_id)!
  for (const [pointIndex, p] of t.route.entries()) {
    for (const field of ["start_pcb_port_id", "end_pcb_port_id"] as const) {
      if (!p[field] || p[field] === old.route[pointIndex]?.[field]) continue
      const port = ports.get(p[field])
      const traceRoot = before.getNetConnectedToId(t.pcb_trace_id)
      const portRoot = before.getNetConnectedToId(p[field])
      const hasLayerMismatch = !!port && !port.layers.includes(p.layer)
      const hasNetMismatch = traceRoot !== undefined && portRoot !== undefined && traceRoot !== portRoot
      addedEndpointAssociations.push({
        pcbTraceId: t.pcb_trace_id, pointIndex, field, pcbPortId: p[field],
        x: p.x, y: p.y, traceLayer: p.layer, portLayers: port?.layers ?? [],
        traceNetNames: names(t.pcb_trace_id), portNetNames: names(p[field]),
        hasLayerMismatch, hasNetMismatch,
        reason: hasLayerMismatch ? "Inferred pad is on a different copper layer" :
          hasNetMismatch ? "Inferred pad belongs to a different original electrical net" : null,
      })
    }
  }
}
const invalidAssociations = addedEndpointAssociations.filter(e => e.hasLayerMismatch || e.hasNetMismatch)
const after = getFullConnectivityMapFromCircuitJson(checked)
const afterGroups = new Map<string, string[]>()
for (const n of nets) {
  const root = after.getNetConnectedToId(n.source_net_id)
  if (root) afterGroups.set(root, [...(afterGroups.get(root) ?? []), n.name])
}
const mergedNetGroups = [...afterGroups.values()].filter(group => {
  const priorRoots = new Set(group.map(name => before.getNetConnectedToId(nets.find(n => n.name === name)!.source_net_id)))
  return priorRoots.size > 1
})

// Public-API control experiment: keep original logical net ownership while
// running the same port/pour check. This is not a separate DRC engine or a
// physical-geometry proof. It isolates the effect of endpoint inference on
// logical ownership. Keep both outcomes; neither replaces rawDiagnostics.
const controlClone = structuredClone(original)
const controlPortDiagnostics = checkEachPcbPortConnectedToPcbTraces(controlClone, { connMap: before })
const ordinaryPortDiagnostics = rawDiagnostics.filter(e => e.type === "pcb_port_not_connected_error")
const countBy = (items: RecordElement[], key: (e: RecordElement) => string) => {
  const result: Record<string, number> = {}
  for (const e of items) { const k = key(e); result[k] = (result[k] ?? 0) + 1 }
  return result
}
const traceDiagnostics = rawDiagnostics.filter(e => e.type === "pcb_trace_error") as RecordElement[]
const traceCause = (e: RecordElement): string => {
  const message = String(e.message ?? "")
  if (message.includes("pcb_keepout") && message.includes("overlaps")) return "keepout_overlap"
  if (message.includes("pcb_keepout") && message.includes("too close")) return "keepout_clearance"
  if (message.includes("missing a connection")) return "reported_missing_pad_connection"
  return "other_requires_review"
}
const require = createRequire(import.meta.url)
const packageFile = path.resolve(path.dirname(require.resolve("@tscircuit/checks")), "../package.json")
const checkerVersion = JSON.parse(await fs.readFile(packageFile, "utf8")).version as string
assert.equal((await fs.readFile(input)).equals(bytes), true, "Input changed while checker diagnosis ran; rerun against a settled build")
await fs.mkdir(path.dirname(output), { recursive: true })
await fs.writeFile(output, JSON.stringify({
  input, inputSha256: createHash("sha256").update(bytes).digest("hex"),
  checkerPackage: "@tscircuit/checks", checkerVersion,
  investigatedVersion: "0.0.208",
  investigatedImplementation: "dist/index.js: addStartAndEndPortIdsIfMissing / findPortIdOverlappingPoint",
  diagnosis: "Endpoint inference selects overlapping pads without filtering copper layer in the investigated checker version. Comparing original net ownership identifies resulting invalid associations. Changes occur only in a disposable clone.",
  rawDiagnosticCounts: countBy(rawDiagnostics as RecordElement[], e => e.type),
  traceDiagnosticCounts: countBy(traceDiagnostics, traceCause),
  totalAddedEndpointAssociations: addedEndpointAssociations.length,
  invalidEndpointAssociationCount: invalidAssociations.length,
  wrongLayerAssociationCount: invalidAssociations.filter(e => e.hasLayerMismatch).length,
  wrongNetAssociationCount: invalidAssociations.filter(e => e.hasNetMismatch).length,
  mergedOriginalNetGroupsAfterInference: mergedNetGroups,
  portConnectivityControlExperiment: {
    explanation: "Same public port/pour checker, fresh input clone, original logical connectivity map supplied explicitly. This isolates logical-net contamination; it is not independent physical DRC and does not waive raw findings.",
    ordinaryErrorCount: ordinaryPortDiagnostics.length,
    originalLogicalMapErrorCount: controlPortDiagnostics.length,
    controlDiagnostics: controlPortDiagnostics,
  },
  classificationLimits: [
    "Keepout-overlap/clearance findings must be compared with the original per-object keepout permissions; generic Circuit JSON keepouts cannot express every KiCad permission.",
    "Reported missing-pad connections are retained. Endpoint-inference contamination can affect them, but counts alone do not establish that every missing connection is false.",
    "Physical connectivity must be established separately from final copper geometry or exported Gerbers.",
  ],
  invalidEndpointAssociations: invalidAssociations,
  traceDiagnosticsByCause: Object.fromEntries([...new Set(traceDiagnostics.map(traceCause))].map(cause => [cause, traceDiagnostics.filter(e => traceCause(e) === cause)])),
  rawDiagnostics,
}, null, 2) + "\n")
console.log(JSON.stringify({ checkerVersion, invalidEndpointAssociations: invalidAssociations.length,
  wrongLayerAssociations: invalidAssociations.filter(e => e.hasLayerMismatch).length,
  wrongNetAssociations: invalidAssociations.filter(e => e.hasNetMismatch).length,
  traceDiagnosticCounts: countBy(traceDiagnostics, traceCause),
  ordinaryPortErrors: ordinaryPortDiagnostics.length, controlPortErrors: controlPortDiagnostics.length, output }))
