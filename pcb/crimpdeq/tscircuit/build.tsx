import React from "react"
import assert from "node:assert/strict"
import { Circuit } from "@tscircuit/core"
import * as schemas from "circuit-json"
import type { AnyCircuitElement } from "circuit-json"
import Crimpdeq, { netAlias } from "./Crimpdeq"
import { parts } from "./parts"
import { footprints } from "./footprints"
import { routing } from "./routing"
import { board } from "./board"
import { nets } from "./nets"
import { transform } from "./geometry"
import type { Part, Pad, Point, Footprint, SExpr } from "./types"

// Dynamic Circuit JSON records are schema-validated before they leave this module.
type Element = Record<string, any>
const sub=(a:SExpr[],k:string)=>a.find((v):v is SExpr[]=>Array.isArray(v)&&v[0]===k)
const center=(e:Element):Point=>e.shape==="polygon"?{x:(Math.min(...e.points.map((p:Point)=>p.x))+Math.max(...e.points.map((p:Point)=>p.x)))/2,y:(Math.min(...e.points.map((p:Point)=>p.y))+Math.max(...e.points.map((p:Point)=>p.y)))/2}:{x:e.x,y:e.y}
const close=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y)<1e-6

/** Complete native TypeScript build; no KiCad parser or source file is used here.
 * The electrical model is compiled by tscircuit. Fixed routes/fills and repeat-pad
 * identities are then added using resolved source IDs, never guessed ID numbers.
 */
export async function buildCrimpdeq():Promise<{circuitJson:AnyCircuitElement[]; diagnostics:Element[]}> {
 const circuit=new Circuit()
 circuit.add(<Crimpdeq/>)
 await circuit.renderUntilSettled()
 const compiled=circuit.getCircuitJson() as Element[]
 const diagnostics=compiled.filter(e=>e.error_type||e.warning_type||e.type.endsWith("_error")||e.type.endsWith("_warning"))
 const fatal=diagnostics.filter(e=>e.type.endsWith("_error")||e.error_type&&!e.type.endsWith("_warning"))
 assert.equal(fatal.length,0,`Native tscircuit errors: ${JSON.stringify(fatal)}`)
 // Stencil dimensions and repeat-pad ports are explicitly authored below. Remove
 // only these generated representations, not diagnostics or electrical checks.
 const cj=compiled.filter(e=>!["pcb_solder_paste","pcb_port"].includes(e.type)&&!e.type.startsWith("pcb_courtyard_"))
 const subcircuit_id=cj.find(e=>e.type==="source_group")!.subcircuit_id
 const scByRef=new Map(cj.filter(e=>e.type==="source_component").map(e=>[e.name,e]))
 const pcByRef=new Map(cj.filter(e=>e.type==="pcb_component").map(e=>[cj.find(s=>s.source_component_id===e.source_component_id&&s.type==="source_component")!.name,e]))
 const sourceByPhysical=new Map<string,Element>()
 for(const p of parts as Part[]) {
   const sc=scByRef.get(p.ref)!;const pc=pcByRef.get(p.ref)!
   // Explicit authoring placement is the original footprint origin, not an
   // asymmetrical pad-bounding-box centroid (notably J2 and U1).
   pc.center={x:p.x,y:p.y}
   for(const pin of p.pins) {
    const found=cj.filter(e=>e.type==="source_port"&&e.source_component_id===sc.source_component_id&&e.port_hints?.includes(pin.key))
    assert.equal(found.length,1,`${p.ref}.${pin.number}: ambiguous logical pin`)
    const sp=found[0];sp.port_hints=[...new Set([...sp.port_hints,`kicad:${pin.number}`])]
    sourceByPhysical.set(`${p.ref}.${pin.number}`,sp)
   }
   for(const pad of (footprints as Record<string,Footprint>)[p.ref].pads) {
    if(!pad.number||!pad.layers.some(l=>l.endsWith(".Cu")))continue
    const global=transform(p,pad)
    const matches=cj.filter(e=>["pcb_smtpad","pcb_plated_hole"].includes(e.type)&&e.pcb_component_id===pc.pcb_component_id&&close(center(e),global))
    assert.equal(matches.length,1,`${p.ref}.${pad.number}: physical pad is not unique at ${JSON.stringify(global)}`)
    const geom=matches[0],sp=sourceByPhysical.get(`${p.ref}.${pad.number}`)!
    const pcb_port_id=`port_${pad.id}`
    geom.pcb_port_id=pcb_port_id
    geom.port_hints=[`kicad:${pad.number}`,pad.number]
    cj.push({type:"pcb_port",pcb_port_id,pcb_component_id:pc.pcb_component_id,source_port_id:sp.source_port_id,...global,layers:pad.kind==="thru_hole"?board.layers:[p.layer],subcircuit_id})
   }
 }
 const netIds=new Map<string,string>(),traceIds=new Map<string,string>()
 for(const [name,members] of Object.entries(nets)) {
   const n=cj.find(e=>e.type==="source_net"&&e.name===netAlias(name))!
   assert(n,`Missing net ${name}`)
   n.name=name;n.is_ground=name==="GND";netIds.set(name,n.source_net_id)
   const source_trace_id=`routed_${netAlias(name)}`;traceIds.set(name,source_trace_id)
   cj.push({type:"source_trace",source_trace_id,connected_source_port_ids:members.map(m=>sourceByPhysical.get(m)!.source_port_id),connected_source_net_ids:[n.source_net_id],subcircuit_id})
 }
 for(const s of routing.segments) cj.push({type:"pcb_trace",pcb_trace_id:`trace_${s.id}`,source_trace_id:traceIds.get(s.net),subcircuit_id,route:[s.start,s.end].map(p=>({route_type:"wire",...p,width:s.width,layer:s.layer}))})
 for(const v of routing.vias) cj.push({type:"pcb_via",pcb_via_id:`via_${v.id}`,source_net_id:netIds.get(v.net),source_trace_id:traceIds.get(v.net),...{x:v.x,y:v.y},layers:v.layers,outer_diameter:v.diameter,hole_diameter:v.drill,tented_on_top:((v.tented as string[]).includes("front")||sub(sub(board.setup,"tenting")??[],"front")?.[1]==="yes"),tented_on_bottom:((v.tented as string[]).includes("back")||sub(sub(board.setup,"tenting")??[],"back")?.[1]==="yes"),subcircuit_id})
 for(const z of board.zones) {
  for(const [i,f] of z.fills.entries())cj.push({type:"pcb_copper_pour",pcb_copper_pour_id:`pour_${z.id}_${i}`,layer:f.layer,source_net_id:netIds.get(z.net!),shape:"polygon",points:f.points,covered_with_solder_mask:true,subcircuit_id})
  if(z.settings.some(s=>s[0]==="keepout")) {
    // CJ keepouts cannot express KiCad's separate tracks/vias/pads prohibitions.
    // Keep exact boundary/layers here; the original permissions remain in board.ts.
    for(const [i,outline] of z.outlines.entries())cj.push({type:"pcb_keepout",pcb_keepout_id:`keepout_${z.id}${i?`_${i}`:""}`,shape:"outline",outline,layers:z.layers,stroke_width:0,description:z.name,subcircuit_id})
  }
 }
 // Footprint-owned keepouts in a placed KiCad PCB use board-global coordinates.
 for(const p of parts as Part[])for(const z of (footprints as Record<string,Footprint>)[p.ref].zones){
  const pts=sub(sub(z,"polygon")!,"pts")!.slice(1) as SExpr[][]
  const outline=pts.map(q=>({x:Number(q[1])-board.sourceOrigin.x,y:board.sourceOrigin.y-Number(q[2])}))
  const layerMap:Record<string,string>={"F.Cu":"top","B.Cu":"bottom","In1.Cu":"inner1","In2.Cu":"inner2"}
  cj.push({type:"pcb_keepout",pcb_keepout_id:`keepout_${sub(z,"uuid")![1]}`,shape:"outline",outline,layers:sub(z,"layers")!.slice(1).map(l=>layerMap[String(l)]),stroke_width:0,description:String(sub(z,"name")?.[1]??""),subcircuit_id})
 }
 // Native footprint graphics on originalLayer=bottom retain their default top
 // layer. Bind them to the authored component side before adding board labels.
 for(const e of cj)if(e.type.startsWith("pcb_silkscreen_")) {
  const owner=parts.find(p=>pcByRef.get(p.ref)?.pcb_component_id===e.pcb_component_id)
  if(owner)e.layer=owner.layer
 }
 const originalNames=Object.fromEntries(Object.keys(nets).map(n=>[netAlias(n),n]))
 for(const e of cj)if(["schematic_text","schematic_net_label"].includes(e.type)&&originalNames[e.text])e.text=originalNames[e.text]
 // Retain board wiring labels. Native font shapes differ cosmetically from KiCad.
 for(const t of board.texts){
  const layer=String(sub(t,"layer")?.[1]);if(!layer.endsWith("SilkS"))continue
  const at=sub(t,"at")!,effects=sub(t,"effects")!,font=sub(effects,"font")!,size=sub(font,"size")!
  cj.push({type:"pcb_silkscreen_text",pcb_silkscreen_text_id:`text_${sub(t,"uuid")![1]}`,pcb_component_id:pcByRef.get("U1")!.pcb_component_id,text:t[1],font:"tscircuit2024",font_size:Number(size[1]),ccw_rotation:Number(at[3]??0),layer:layer.startsWith("B")?"bottom":"top",is_mirrored:sub(effects,"justify")?.includes("mirror")??false,anchor_alignment:"center",anchor_position:{x:Number(at[1])-board.sourceOrigin.x,y:board.sourceOrigin.y-Number(at[2])},subcircuit_id})
 }
 // Import every original footprint courtyard edge as an explicit path.
 for(const p of parts as Part[]) {
  const def=(footprints as Record<string,Footprint>)[p.ref],pc=pcByRef.get(p.ref)!
  for(const g of def.graphics) {
   const layer=String(sub(g,"layer")?.[1]),id=String(sub(g,"uuid")?.[1])
   const pt=(key:string)=>{const v=sub(g,key)!;return {x:Number(v[1]),y:-Number(v[2])}}
   if(layer.endsWith("CrtYd")&&g[0]==="fp_rect"){
    const a=pt("start"),b=pt("end")
    cj.push({type:"pcb_courtyard_outline",pcb_courtyard_outline_id:`courtyard_${id}`,pcb_component_id:pc.pcb_component_id,layer:p.layer,outline:[a,{x:b.x,y:a.y},b,{x:a.x,y:b.y},a].map(q=>transform(p,q)),subcircuit_id})
   }
   if(layer.endsWith("CrtYd")&&g[0]==="fp_circle"){
    const a=pt("center"),b=pt("end")
    cj.push({type:"pcb_courtyard_circle",pcb_courtyard_circle_id:`courtyard_${id}`,pcb_component_id:pc.pcb_component_id,layer:p.layer,center:transform(p,a),radius:Math.hypot(a.x-b.x,a.y-b.y),subcircuit_id})
   }
   if(layer.endsWith("SilkS")&&(g[0]==="property"||g[0]==="fp_text")&&!g.includes("hide")&&sub(g,"hide")?.[1]!=="yes"){
    const effects=sub(g,"effects")??[],font=sub(effects,"font")??[],size=sub(font,"size")??["size","1","1"],at=sub(g,"at")!
    if(!effects.includes("hide"))cj.push({type:"pcb_silkscreen_text",pcb_silkscreen_text_id:`silk_text_${id}`,pcb_component_id:pc.pcb_component_id,layer:p.layer,text:g[2],font:"tscircuit2024",font_size:Number(size[1]),ccw_rotation:Number(at[3]??0),anchor_alignment:"center",anchor_position:transform(p,pt("at")),is_mirrored:sub(effects,"justify")?.includes("mirror")??false,subcircuit_id})
   }
   if(layer.endsWith("SilkS")&&g[0]==="fp_poly"){
    const vertices=(sub(g,"pts")!.slice(1) as SExpr[][]).map(q=>transform(p,{x:Number(q[1]),y:-Number(q[2])}))
    if(sub(g,"fill")?.[1]==="yes")cj.push({type:"pcb_silkscreen_graphic",pcb_silkscreen_graphic_id:`silk_${id}`,pcb_component_id:pc.pcb_component_id,layer:p.layer,shape:"brep",brep_shape:{outer_ring:{vertices},inner_rings:[]},subcircuit_id})
    const w=Number(sub(sub(g,"stroke")??[],"width")?.[1]??0)
    if(w)cj.push({type:"pcb_silkscreen_path",pcb_silkscreen_path_id:`silk_outline_${id}`,pcb_component_id:pc.pcb_component_id,layer:p.layer,route:[...vertices,vertices[0]],stroke_width:w,subcircuit_id})
   }
  }
  const lines=def.graphics.filter(g=>g[0]==="fp_line"&&String(sub(g,"layer")?.[1]).endsWith("CrtYd"))
  if(lines.length) {
   // KiCad courtyards are closed polygons, usually four consecutive segments.
   const route:Point[]=[];const remaining=lines.map(g=>({a:sub(g,"start")!,b:sub(g,"end")!})).map(g=>({a:{x:Number(g.a[1]),y:-Number(g.a[2])},b:{x:Number(g.b[1]),y:-Number(g.b[2])}}))
   const first=remaining.shift()!;route.push(first.a,first.b)
   while(remaining.length){const at=route.at(-1)!;const i=remaining.findIndex(s=>close(s.a,at)||close(s.b,at));assert(i>=0,`${p.ref} open courtyard`);const s=remaining.splice(i,1)[0];route.push(close(s.a,at)?s.b:s.a)}
   cj.push({type:"pcb_courtyard_outline",pcb_courtyard_outline_id:`courtyard_${p.ref}`,pcb_component_id:pc.pcb_component_id,layer:p.layer,outline:route.map(q=>transform(p,q)),subcircuit_id})
  }
 }
 // Stencil data is generated as native supported shapes. Rounded rectangles are
 // exactly a union of two rectangles and four circles. The custom U1 polygon is
 // retained in the aperture manifest and emitted as a Gerber region by export.ts.
 for(const p of parts as Part[]) {
  const pc=pcByRef.get(p.ref)!
  for(const pad of (footprints as Record<string,Footprint>)[p.ref].pads) {
   if(!pad.layers.some(l=>l.endsWith(".Paste")))continue
   if(pad.shape==="custom")continue
   const pos=transform(p,pad),rot=(p.rotation+pad.rotation)%360
   const margin=pad.layers.some(l=>l.endsWith(".Cu"))?pad.pasteMargin:0
   const w=pad.width+2*margin,h=pad.height+2*margin,r=Math.max(0,pad.radius+margin)
   const add=(shape:Element,suffix:string)=>cj.push({type:"pcb_solder_paste",pcb_solder_paste_id:`paste_${pad.id}_${suffix}`,layer:p.layer,pcb_component_id:pc.pcb_component_id,subcircuit_id,...shape})
   const rect=(width:number,height:number,x=pos.x,y=pos.y)=>rot%90===0 ? ({shape:"rect",x,y,width:rot%180===0?width:height,height:rot%180===0?height:width}) : ({shape:"rotated_rect",x,y,width,height,ccw_rotation:rot})
   if(r===0)add(rect(w,h),"rect")
   else {
    if(w>2*r)add(rect(w-2*r,h),"center_x")
    if(h>2*r)add(rect(w,h-2*r),"center_y")
    const a=rot*Math.PI/180
    for(const [i,dx] of [-w/2+r,w/2-r].entries())for(const [j,dy] of [-h/2+r,h/2-r].entries())add({shape:"circle",x:pos.x+dx*Math.cos(a)-dy*Math.sin(a),y:pos.y+dx*Math.sin(a)+dy*Math.cos(a),radius:r},`${i}_${j}`)
   }
  }
 }
 // Validate without stripping fields: a schema success is required for every item.
 for(const e of cj){
  if(e.type==="pcb_component")for(const k of ["display_offset_x","display_offset_y"])if(typeof e[k]==="number")e[k]=`${e[k]}mm`
  const schema=(schemas as Record<string,any>)[e.type]??schemas.any_circuit_element
  const result=schema.safeParse(e);assert(result.success,`${e.type}: ${JSON.stringify(result.success?null:result.error.issues).slice(0,1800)}`)
 }
 return {circuitJson:cj as AnyCircuitElement[],diagnostics}
}
