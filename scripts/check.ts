import fs from 'node:fs/promises'
import {runAllChecks} from '@tscircuit/checks'
const out='dist/crimpdeq'
const circuit=JSON.parse(await fs.readFile(`${out}/circuit.json`,'utf8'))
const findings=await runAllChecks(circuit)
await fs.writeFile(`${out}/tscircuit-checks.json`,JSON.stringify(findings,null,2)+'\n')
const counts:Record<string,number>={}
for(const finding of findings)counts[finding.type]=(counts[finding.type]??0)+1
console.log('Full tscircuit diagnostic report (not a fabrication pass):',counts)
if(findings.length)console.log('Findings are retained in dist/crimpdeq/tscircuit-checks.json. Read MIGRATION.md for scope and limitations.')
