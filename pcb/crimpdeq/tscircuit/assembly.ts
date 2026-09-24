import type { AnyCircuitElement } from "circuit-json"
import { parts } from "./parts"
import { footprints } from "./footprints"
import { board } from "./board"
import type { Part, Footprint } from "./types"
import { transform } from "./geometry"

/** Complete stencil geometry, expressed as Circuit JSON pad primitives because
 * the pinned solder-paste schema cannot represent the custom U1 polygon.
 * Copper-layer output from this model is relabelled as paste by export.ts.
 * This is generated from authored pad definitions, not copied KiCad Gerbers.
 */
export function buildStencil():AnyCircuitElement[] {
 const out:AnyCircuitElement[]=[]
 for(const part of parts as Part[])for(const p of (footprints as Record<string,Footprint>)[part.ref].pads){
  if(!p.layers.some(l=>l.endsWith(".Paste")))continue
  const pos=transform(part,p),rotation=(part.rotation+p.rotation)%360
  const base={type:"pcb_smtpad" as const,pcb_smtpad_id:`stencil_${p.id}`,layer:part.layer,is_covered_with_solder_mask:true}
  if(p.shape==="custom"){
   if(p.pasteMargin!==0)throw Error(`Unsupported polygon offset for ${part.ref}.${p.number}; author an exact stencil polygon`)
   const a=p.rotation*Math.PI/180
   out.push({...base,shape:"polygon",points:p.polygon!.map(q=>transform(part,{x:p.x+q.x*Math.cos(a)-q.y*Math.sin(a),y:p.y+q.x*Math.sin(a)+q.y*Math.cos(a)}))})
  }else{
   // KiCad paste-only pads already are the aperture: their paste margin
   // is not applied again (D3 would otherwise be shrunk twice).
   const margin=p.layers.some(l=>l.endsWith(".Cu"))?p.pasteMargin:0
   const width=p.width+2*margin,height=p.height+2*margin,corner_radius=Math.max(0,p.radius+margin)
   if(rotation%90===0)out.push({...base,...pos,shape:"rect",width:rotation%180===0?width:height,height:rotation%180===0?height:width,corner_radius})
   else out.push({...base,...pos,shape:"rotated_rect",width,height,corner_radius,ccw_rotation:rotation})
  }
 }
 return out
}
const csv=(rows:(string|number)[][])=>rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n')+'\n'
export function buildBom():string {
 return csv([['Designator','Value','Footprint','Manufacturer Part Number','LCSC Part Number','Assembly'],...parts.map(p=>[p.ref,p.value,p.footprint,p.mpn,p.lcsc,p.dnp?'Do Not Place':'Fitted'])])
}
export function buildPositions():string {
 // Same reviewed assembly orientation corrections as the original generator.
 // New board-centred origin matches the rewritten Gerbers (not old KiCad origin).
 const offsets:Record<string,number>={U3:270,U6:180}
 return csv([['Designator','Mid X','Mid Y','Rotation','Layer'],...parts.filter(p=>!p.dnp).map(p=>{
  let rotation=p.layer==='bottom'?180-p.rotation:p.rotation+(offsets[p.ref]??0)
  rotation=(rotation%360+360)%360
  // Original explicit connector body centroid 147,-78.535 in Gerber frame.
  const x=p.ref==='J2'?147-board.sourceOrigin.x:p.x
  const y=p.ref==='J2'?-78.535+board.sourceOrigin.y:p.y
  return [p.ref,x.toFixed(4),y.toFixed(4),rotation.toFixed(2),p.layer]
 })])
}
