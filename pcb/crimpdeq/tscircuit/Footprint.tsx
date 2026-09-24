import React from "react"
import type { Footprint as FootprintDefinition, Pad, Point, SExpr } from "./types"

const child=(s:SExpr[],k:string)=>s.find((v):v is SExpr[]=>Array.isArray(v)&&v[0]===k)
const number=(v:SExpr|undefined)=>Number(v)
function rotate(p:Point, deg:number):Point { const a=deg*Math.PI/180; return {x:p.x*Math.cos(a)-p.y*Math.sin(a),y:p.x*Math.sin(a)+p.y*Math.cos(a)} }
function NativePad({pad:p}:{pad:Pad}) {
  if (!p.layers.some(l=>l.endsWith(".Cu"))) return null // stencil-only apertures are emitted explicitly by the build
  const hints=p.pin ? [p.pin] : undefined
  if(p.kind==="np_thru_hole") return <hole name={p.id} pcbX={p.x} pcbY={p.y} diameter={Number(p.drill![0])} />
  if(p.kind==="thru_hole") {
    if(p.shape==="circle") return <platedhole name={p.id} portHints={hints} pcbX={p.x} pcbY={p.y} shape="circle" holeDiameter={Number(p.drill![0])} outerDiameter={p.width} />
    return <platedhole name={p.id} portHints={hints} pcbX={p.x} pcbY={p.y} shape="pill" holeWidth={Number(p.drill![1])} holeHeight={Number(p.drill![2])} outerWidth={p.width} outerHeight={p.height} pcbRotation={p.rotation}/>
  }
  // Core defaults to a 30% stencil reduction. Disable that automatic aperture:
  // build.ts adds the reviewed aperture geometry, including separate U5/D3 windows.
  const common={name:p.id,portHints:hints,pcbX:p.x,pcbY:p.y,solderPasteMargin:-100,solderMaskMargin:0}
  if(p.shape==="custom") {
    const points=p.polygon!.map(q=>{const a=rotate(q,p.rotation);return {x:a.x+p.x,y:a.y+p.y}})
    return <smtpad name={p.id} portHints={hints} shape="polygon" points={points} solderPasteMargin={-100} solderMaskMargin={0}/>
  }
  if(p.shape==="circle") return <smtpad {...common} shape="circle" radius={p.width/2}/>
  if(p.rotation%180===0) return <smtpad {...common} shape="rect" width={p.width} height={p.height} cornerRadius={p.radius}/>
  if(p.rotation%90===0) return <smtpad {...common} shape="rect" width={p.height} height={p.width} cornerRadius={p.radius}/>
  return <smtpad {...common} shape="rotated_rect" width={p.width} height={p.height} cornerRadius={p.radius} ccwRotation={p.rotation}/>
}
function Graphic({g}:{g:SExpr[]}) {
  const layer=child(g,"layer")?.[1]
  const xy=(key:string):Point=>{const v=child(g,key)!;return {x:number(v[1]),y:-number(v[2])}}
  if(typeof layer!=="string")return null
  if(layer.endsWith("CrtYd")&&g[0]==="fp_rect"){
    const a=xy("start"),b=xy("end")
    return <courtyardrect pcbX={(a.x+b.x)/2} pcbY={(a.y+b.y)/2} width={Math.abs(a.x-b.x)} height={Math.abs(a.y-b.y)} />
  }
  if(layer.endsWith("CrtYd")&&g[0]==="fp_line"){
    // The complete original courtyard segments remain in authoring data;
    // a path is emitted in the final Circuit JSON by build.ts.
    return null
  }
  if(!layer.endsWith("SilkS"))return null
  const stroke=child(g,"stroke"),w=number(stroke&&child(stroke,"width")?.[1])||0.12
  if(g[0]==="fp_line")return <silkscreenpath route={[xy("start"),xy("end")]} strokeWidth={w}/>
  if(g[0]==="fp_rect"){
    const a=xy("start"),b=xy("end");return <silkscreenpath route={[a,{x:b.x,y:a.y},b,{x:a.x,y:b.y},a]} strokeWidth={w}/>
  }
  if(g[0]==="fp_circle"){
    const a=xy("center"),b=xy("end");return <silkscreencircle pcbX={a.x} pcbY={a.y} radius={Math.hypot(a.x-b.x,a.y-b.y)} strokeWidth={w}/>
  }
  return null
}
export function ExactFootprint({definition}:{definition:FootprintDefinition}) {
  return <footprint originalLayer={definition.originalLayer}>
    {definition.pads.map((p,i)=><NativePad key={p.id} pad={p.number && definition.pads.slice(0,i).some(q=>q.number===p.number) ? {...p,pin:null} : p}/>)}
    {definition.graphics.map((g,i)=><Graphic key={i} g={g}/>)}
  </footprint>
}
