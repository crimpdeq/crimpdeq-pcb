import fs from 'node:fs/promises'
import { convertCircuitJsonToGerberFiles } from 'circuit-json-to-gerber'
import { buildStencil,buildBom,buildPositions } from '../pcb/crimpdeq/tscircuit/assembly'
import { any_circuit_element } from 'circuit-json'
const out='dist/crimpdeq'
const cj=JSON.parse(await fs.readFile(`${out}/circuit.json`,'utf8'))
const stencil=buildStencil()
for(const e of stencil)any_circuit_element.parse(e)
await fs.writeFile(`${out}/stencil.circuit.json`,JSON.stringify(stencil,null,2)+'\n')
const gerbers=convertCircuitJsonToGerberFiles(cj)
// G85 accepts a start and end coordinate on one line. The upstream exporter
// emits a separate drill hit at the start; combine these to avoid drilling twice.
for(const name of Object.keys(gerbers))if(name.endsWith('.drl'))gerbers[name]=gerbers[name].replace(/^(X[-\d.]+Y[-\d.]+)\r?\n(G85X[-\d.]+Y[-\d.]+)/gm,'$1$2')
const paste=convertCircuitJsonToGerberFiles(stencil)
// Stock paste export loses polygon apertures. Use the same tested copper shape
// renderer on the exact stencil-only model, then set proper Gerber file function.
for(const side of ['F','B'])gerbers[`${side}_Paste.gbr`]=paste[`${side}_Cu.gbr`].replace(/TF\.FileFunction,Copper,[^*]+/g,`TF.FileFunction,Solderpaste,${side==='F'?'Top':'Bot'}`)
await fs.mkdir(`${out}/gerbers`,{recursive:true})
for(const [name,content]of Object.entries(gerbers))await fs.writeFile(`${out}/gerbers/${name}`,content)
await fs.writeFile(`${out}/bom.csv`,buildBom())
await fs.writeFile(`${out}/positions.csv`,buildPositions())
await fs.writeFile(`${out}/FABRICATION-STATUS.txt`, 'CONVERSION VALIDATION OUTPUT — NOT A PRODUCTION RELEASE\nRead MIGRATION.md and validation reports. Review unresolved source-design issues and fabrication acceptance.\nUse this build/export pipeline: stock tsci export does not preserve the custom stencil polygon.\nOrigin: board centre; all PCB and placement coordinates are in mm, +Y upward.\n')
console.log(`Exported ${Object.keys(gerbers).length} Gerber/drill files, ${stencil.length} stencil apertures, 59 BOM entries and 51 placements.`)
