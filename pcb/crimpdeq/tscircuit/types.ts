export type Layer = "top" | "inner1" | "inner2" | "bottom"
export type Point = { x: number; y: number }
export type SExpr = string | SExpr[]
export interface Pin { number: string; key: string; label: string; electricalType: string; net: string | null }
export interface Part extends Point {
  ref: string; value: string; footprint: string; rotation: number; layer: "top" | "bottom"
  schX: number; schY: number; schRotation: number; dnp: boolean; mpn: string; lcsc: string; datasheet: string; pins: Pin[]
}
export interface Pad extends Point {
  id: string; number: string; pin: string | null; kind: string; shape: string
  width: number; height: number; rotation: number; radius: number; layers: string[]
  pasteMargin: number; drill: string[] | null; polygon?: Point[]
}
export interface Footprint { pads: Pad[]; graphics: SExpr[][]; originalLayer: "top" | "bottom"; metadata: Record<string,string>; zones: SExpr[][] }
export interface Segment { id: string; net: string; layer: Layer; width: number; start: Point; end: Point }
export interface Via extends Point { id: string; net: string; diameter: number; drill: number; layers: Layer[]; tented: string[] }
export interface Routing { segments: Segment[]; vias: Via[] }
export interface Zone { id: string; name: string; net: string | null; layers: Layer[]; outlines: Point[][]; fills: {layer: Layer; points: Point[]}[]; settings: SExpr[][] }
export interface BoardDefinition { width: number; height: number; thickness: number; layers: Layer[]; sourceOrigin: Point; outline: Point[]; setup: SExpr[]; texts: SExpr[][]; zones: Zone[] }
