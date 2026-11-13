// Make the browser viewer's hover labels use the component displayName:
//   PCB pad hover  "U3.SCLK" -> "U3 - ADS1220.SCLK"
//   3D model hover "U3"      -> "U3 - ADS1220"
// `tsci dev` serves the project's tscircuit/dist/browser.min.js, so this edits
// that file in place. Runs on postinstall; safe to run repeatedly.
// `scripts/site.sh` passes the static site's standalone.min.js as the argument.
import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

const file =
  process.argv[2] ??
  fileURLToPath(
    new URL("../node_modules/tscircuit/dist/browser.min.js", import.meta.url),
  )

const patches = [
  {
    name: "PCB pad hover",
    original: /!(\w)\.name\.includes\("unnamed_"\)\?\1\.name:null/g,
    applied: /!(\w)\.name\.includes\("unnamed_"\)\?\(\1\.display_name\?\?\1\.name\):null/,
    replace: (_, v) => `!${v}.name.includes("unnamed_")?(${v}.display_name??${v}.name):null`,
  },
  {
    name: "3D model hover",
    original:
      /(?<![\w$])([\w$]{1,8})\((\w)\)\.source_component\.getUsing\(\{source_component_id:(\w)\.source_component_id\}\)\?\.name,/g,
    applied: /\(\(q\)=>q\?\.display_name\?\?q\?\.name\)\(/,
    replace: (_, fn, cj, cad) =>
      `((q)=>q?.display_name??q?.name)(${fn}(${cj}).source_component.getUsing({source_component_id:${cad}.source_component_id})),`,
  },
]

let source = readFileSync(file, "utf8")
let changed = false
for (const patch of patches) {
  if (patch.applied.test(source)) {
    console.log(`patch-viewer: ${patch.name} already applied`)
    continue
  }
  const matches = source.match(patch.original) ?? []
  if (matches.length !== 1) {
    console.error(
      `patch-viewer: ${patch.name}: expected 1 match in ${file}, found ${matches.length}; ` +
        "the viewer code changed, update scripts/patch-viewer.mjs",
    )
    process.exit(1)
  }
  source = source.replace(patch.original, patch.replace)
  changed = true
  console.log(`patch-viewer: ${patch.name} now uses displayName`)
}
if (changed) writeFileSync(file, source)
