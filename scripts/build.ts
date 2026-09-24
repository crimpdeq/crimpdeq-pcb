import fs from 'node:fs/promises'
import { buildCrimpdeq } from '../pcb/crimpdeq/tscircuit/build'
import { convertCircuitJsonToPcbSvg,convertCircuitJsonToSchematicSvg } from 'circuit-to-svg'
const out='dist/crimpdeq'
await fs.mkdir(out,{recursive:true})
const {circuitJson,diagnostics}=await buildCrimpdeq()
await fs.writeFile(`${out}/circuit.json`,JSON.stringify(circuitJson,null,2)+'\n')
await fs.writeFile(`${out}/diagnostics.json`,JSON.stringify(diagnostics,null,2)+'\n')
for(const layer of ['top','inner1','inner2','bottom'] as const)await fs.writeFile(`${out}/${layer}.svg`,convertCircuitJsonToPcbSvg(circuitJson,{layer,width:1000,height:1000,shouldDrawRatsNest:false,showSolderPaste:false}))
await fs.writeFile(`${out}/schematic.svg`,convertCircuitJsonToSchematicSvg(circuitJson,{width:1800,height:1200}))
console.log(`Built ${circuitJson.filter(e=>e.type==='source_component').length} components, ${circuitJson.filter(e=>e.type==='pcb_trace').length} fixed segments; ${diagnostics.length} recorded diagnostics.`)
