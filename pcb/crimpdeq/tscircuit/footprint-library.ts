/** Exact, reusable package geometry. Distances are mm; pad coordinates use +Y up.
 * Generic footprinter package defaults are deliberately avoided: these dimensions
 * reproduce the reviewed land patterns, stencil windows and connector slots.
 * KiCad Fab drawing/property metadata stays in the archived .kicad_pcb; it is not
 * required by the native build. All rendered silk/courtyard and keepouts remain.
 */
import type { Footprint, Pad, SExpr } from "./types"
type Side = "top" | "bottom"
type PadTemplate = Omit<Pad, "id">
// Explicit columns: number, logical pin, kind, shape, x, y, width, height,
// rotation, corner radius, layers (@ = owning side), paste margin, drill, polygon.
type PadRow = [string,string|null,string,string,number,number,number,number,number,number,string[],number,string[]|null,Pad["polygon"]?]
function padRows(rows:PadRow[]):PadTemplate[] {
 return rows.map(([number,pin,kind,shape,x,y,width,height,rotation,radius,layers,pasteMargin,drill,polygon])=>({number,pin,kind,shape,x,y,width,height,rotation,radius,layers,pasteMargin,drill,...(polygon?{polygon}:{})}))
}
/** Symmetric two-terminal land pattern; explicit dimensions, no package defaults. */
function twoTerminalSmd(halfPitch:number,width:number,height:number,radius:number,layers:string[],rotation=0,shape="roundrect"):PadTemplate[] {
 return [-halfPitch,halfPitch].map((x,i)=>({number:String(i+1),pin:`pin${i+1}`,kind:"smd",shape,x,y:0,width,height,rotation,radius,layers,pasteMargin:0,drill:null}))
}
const surface=(layer:string,side:Side)=>layer.startsWith("@.")?`${side==="top"?"F":"B"}.${layer.slice(2)}`:layer

export const padLayouts = {
  capacitor0402: twoTerminalSmd(0.48, 0.56, 0.62, 0.14, ["@.Cu", "@.Mask", "@.Paste"], 0, "roundrect"),
  capacitor0603: twoTerminalSmd(0.775, 0.9, 0.95, 0.225, ["@.Cu", "@.Mask", "@.Paste"], 0, "roundrect"),
  capacitor1206: twoTerminalSmd(1.475, 1.15, 1.8, 0.24999965, ["@.Cu", "@.Mask", "@.Paste"], 0, "roundrect"),
  capacitor0805: twoTerminalSmd(0.95, 1, 1.45, 0.25, ["@.Cu", "@.Mask", "@.Paste"], 0, "roundrect"),
  led0603: twoTerminalSmd(0.7875, 0.875, 0.95, 0.21875, ["@.Cu", "@.Mask", "@.Paste"], 0, "roundrect"),
  sod123_rot90: twoTerminalSmd(1.65, 0.9, 1.2, 0.225, ["@.Cu", "@.Mask", "@.Paste"], 90, "roundrect"),
  sod882_splitPaste: padRows([
    ["", null, "smd", "roundrect", -0.35, 0, 0.3, 0.6, 0, 0.05, ["@.Paste"], -0.05, null],
    ["", null, "smd", "roundrect", 0.35, 0, 0.3, 0.6, 0, 0.05, ["@.Paste"], -0.05, null],
    ["1", "pin1", "smd", "roundrect", -0.35, 0, 0.4, 0.7, 0, 0.05, ["@.Cu", "@.Mask"], -0.05, null],
    ["2", "pin2", "smd", "roundrect", 0.35, 0, 0.4, 0.7, 0, 0.05, ["@.Cu", "@.Mask"], -0.05, null],
  ]),
  ws2812b_plcc4: padRows([
    ["1", "pin1", "smd", "roundrect", -2.45, -1.65, 1.5, 0.9, 0, 0.09, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["2", "pin2", "smd", "roundrect", -2.45, 1.65, 1.5, 0.9, 0, 0.09, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["3", "pin3", "smd", "roundrect", 2.45, 1.65, 1.5, 0.9, 0, 0.09, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["4", "pin4", "smd", "roundrect", 2.45, -1.65, 1.5, 0.9, 0, 0.09, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
  ]),
  sod523_rot180: twoTerminalSmd(0.7, 0.6, 0.7, 0.15, ["@.Cu", "@.Mask", "@.Paste"], 180, "roundrect"),
  sod123: twoTerminalSmd(1.65, 0.9, 1.2, 0.225, ["@.Cu", "@.Mask", "@.Paste"], 0, "roundrect"),
  gctUsb4105: padRows([
    ["", null, "np_thru_hole", "circle", -2.89, 3.68, 0.65, 0.65, 0, 0, ["*.Cu", "*.Mask"], 0, ["0.65"]],
    ["", null, "np_thru_hole", "circle", 2.89, 3.68, 0.65, 0.65, 0, 0, ["*.Cu", "*.Mask"], 0, ["0.65"]],
    ["A1_B12", "pin1", "smd", "rect", -3.2, 4.755, 0.6, 1.15, 0, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["A4_B9", "pin2", "smd", "rect", -2.4, 4.755, 0.6, 1.15, 0, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["A5", "pin3", "smd", "rect", -1.25, 4.755, 0.3, 1.15, 0, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["A6", "pin4", "smd", "rect", -0.25, 4.755, 0.3, 1.15, 0, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["A7", "pin5", "smd", "rect", 0.25, 4.755, 0.3, 1.15, 0, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["A8", "pin6", "smd", "rect", 1.25, 4.755, 0.3, 1.15, 0, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["B1_A12", "pin7", "smd", "rect", 3.2, 4.755, 0.6, 1.15, 0, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["B4_A9", "pin8", "smd", "rect", 2.4, 4.755, 0.6, 1.15, 0, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["B5", "pin9", "smd", "rect", 1.75, 4.755, 0.3, 1.15, 0, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["B6", "pin10", "smd", "rect", 0.75, 4.755, 0.3, 1.15, 0, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["B7", "pin11", "smd", "rect", -0.75, 4.755, 0.3, 1.15, 0, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["B8", "pin12", "smd", "rect", -1.75, 4.755, 0.3, 1.15, 0, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["S1", "pin13", "thru_hole", "oval", -4.32, 4.18, 1.05, 2.1, 0, 0, ["*.Cu", "*.Mask"], 0, ["oval", "0.65", "1.7"]],
    ["S2", "pin14", "thru_hole", "oval", -4.32, 0, 1, 2, 0, 0, ["*.Cu", "*.Mask"], 0, ["oval", "0.65", "1.4"]],
    ["S3", "pin15", "thru_hole", "oval", 4.32, 0, 1, 2, 0, 0, ["*.Cu", "*.Mask"], 0, ["oval", "0.65", "1.4"]],
    ["S4", "pin16", "thru_hole", "oval", 4.32, 4.18, 1.05, 2.1, 0, 0, ["*.Cu", "*.Mask"], 0, ["oval", "0.65", "1.7"]],
  ]),
  testpoint1_5mm_drill0_7mm: padRows([
    ["1", "pin1", "thru_hole", "circle", 0, 0, 1.5, 1.5, 0, 0, ["*.Cu", "*.Mask"], 0, ["0.7"]],
  ]),
  bournsSrn4018: twoTerminalSmd(1.525, 1.5, 3.6, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, "rect"),
  sot23: padRows([
    ["1", "pin1", "smd", "roundrect", -0.9375, -0.95, 1.475, 0.6, 0, 0.15, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["2", "pin2", "smd", "roundrect", -0.9375, 0.95, 1.475, 0.6, 0, 0.15, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["3", "pin3", "smd", "roundrect", 0.9375, 0, 1.475, 0.6, 0, 0.15, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
  ]),
  resistor0402: twoTerminalSmd(0.51, 0.54, 0.64, 0.135, ["@.Cu", "@.Mask", "@.Paste"], 0, "roundrect"),
  esp32c3Mini1: padRows([
    ["1", "pin1", "smd", "rect", -5.9, -1.3, 0.4, 0.8, 270, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["2", "pin2", "smd", "rect", -5.9, -0.5, 0.4, 0.8, 270, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["3", "pin3", "smd", "rect", -5.9, 0.3, 0.4, 0.8, 270, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["4", "pin4", "smd", "rect", -5.9, 1.1, 0.4, 0.8, 270, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["5", "pin5", "smd", "rect", -5.9, 1.9, 0.4, 0.8, 270, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["6", "pin6", "smd", "rect", -5.9, 2.7, 0.4, 0.8, 270, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["7", "pin7", "smd", "rect", -5.9, 3.5, 0.4, 0.8, 270, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["8", "pin8", "smd", "rect", -5.9, 4.3, 0.4, 0.8, 270, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["9", "pin9", "smd", "rect", -5.9, 5.1, 0.4, 0.8, 270, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["10", "pin10", "smd", "rect", -5.9, 5.9, 0.4, 0.8, 270, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["11", "pin11", "smd", "rect", -5.9, 6.7, 0.4, 0.8, 270, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["12", "pin12", "smd", "rect", -4.8, 7.6, 0.4, 0.8, 0, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["13", "pin13", "smd", "rect", -4, 7.6, 0.4, 0.8, 0, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["14", "pin14", "smd", "rect", -3.2, 7.6, 0.4, 0.8, 0, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["15", "pin15", "smd", "rect", -2.4, 7.6, 0.4, 0.8, 0, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["16", "pin16", "smd", "rect", -1.6, 7.6, 0.4, 0.8, 0, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["17", "pin17", "smd", "rect", -0.8, 7.6, 0.4, 0.8, 0, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["18", "pin18", "smd", "rect", 0, 7.6, 0.4, 0.8, 0, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["19", "pin19", "smd", "rect", 0.8, 7.6, 0.4, 0.8, 0, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["20", "pin20", "smd", "rect", 1.6, 7.6, 0.4, 0.8, 0, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["21", "pin21", "smd", "rect", 2.4, 7.6, 0.4, 0.8, 0, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["22", "pin22", "smd", "rect", 3.2, 7.6, 0.4, 0.8, 0, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["23", "pin23", "smd", "rect", 4, 7.6, 0.4, 0.8, 0, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["24", "pin24", "smd", "rect", 4.8, 7.6, 0.4, 0.8, 0, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["25", "pin25", "smd", "rect", 5.9, 6.7, 0.4, 0.8, 270, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["26", "pin26", "smd", "rect", 5.9, 5.9, 0.4, 0.8, 270, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["27", "pin27", "smd", "rect", 5.9, 5.1, 0.4, 0.8, 270, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["28", "pin28", "smd", "rect", 5.9, 4.3, 0.4, 0.8, 270, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["29", "pin29", "smd", "rect", 5.9, 3.5, 0.4, 0.8, 270, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["30", "pin30", "smd", "rect", 5.9, 2.7, 0.4, 0.8, 270, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["31", "pin31", "smd", "rect", 5.9, 1.9, 0.4, 0.8, 270, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["32", "pin32", "smd", "rect", 5.9, 1.1, 0.4, 0.8, 270, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["33", "pin33", "smd", "rect", 5.9, 0.3, 0.4, 0.8, 270, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["34", "pin34", "smd", "rect", 5.9, -0.5, 0.4, 0.8, 270, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["35", "pin35", "smd", "rect", 5.9, -1.3, 0.4, 0.8, 270, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["36", "pin36", "smd", "rect", 4.8, -2.2, 0.4, 0.8, 0, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["37", "pin37", "smd", "rect", 4, -2.2, 0.4, 0.8, 0, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["38", "pin38", "smd", "rect", 3.2, -2.2, 0.4, 0.8, 0, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["39", "pin39", "smd", "rect", 2.4, -2.2, 0.4, 0.8, 0, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["40", "pin40", "smd", "rect", 1.6, -2.2, 0.4, 0.8, 0, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["41", "pin41", "smd", "rect", 0.8, -2.2, 0.4, 0.8, 0, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["42", "pin42", "smd", "rect", 0, -2.2, 0.4, 0.8, 0, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["43", "pin43", "smd", "rect", -0.8, -2.2, 0.4, 0.8, 0, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["44", "pin44", "smd", "rect", -1.6, -2.2, 0.4, 0.8, 0, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["45", "pin45", "smd", "rect", -2.4, -2.2, 0.4, 0.8, 0, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["46", "pin46", "smd", "rect", -3.2, -2.2, 0.4, 0.8, 0, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["47", "pin47", "smd", "rect", -4, -2.2, 0.4, 0.8, 0, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["48", "pin48", "smd", "rect", -4.8, -2.2, 0.4, 0.8, 0, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["49", "pin49", "smd", "rect", -1.975, 4.675, 1.45, 1.45, 270, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["49", "pin49", "smd", "rect", -1.975, 2.7, 1.45, 1.45, 270, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["49", "pin49", "smd", "custom", -1.975, 0.725, 0.8, 0.8, 0, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null, [{"x": 0.725, "y": 0.725}, {"x": -0.725, "y": 0.725}, {"x": -0.725, "y": -0.125}, {"x": -0.125, "y": -0.725}, {"x": 0.725, "y": -0.725}]],
    ["49", "pin49", "smd", "rect", 0, 4.675, 1.45, 1.45, 270, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["49", "pin49", "smd", "rect", 0, 2.7, 1.45, 1.45, 270, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["49", "pin49", "smd", "rect", 0, 0.725, 1.45, 1.45, 270, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["49", "pin49", "smd", "rect", 1.975, 4.675, 1.45, 1.45, 270, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["49", "pin49", "smd", "rect", 1.975, 2.7, 1.45, 1.45, 270, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["49", "pin49", "smd", "rect", 1.975, 0.725, 1.45, 1.45, 270, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["50", "pin50", "smd", "rect", 5.95, -2.25, 0.7, 0.7, 270, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["51", "pin51", "smd", "rect", 5.95, 7.65, 0.7, 0.7, 270, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["52", "pin52", "smd", "rect", -5.95, 7.65, 0.7, 0.7, 270, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["53", "pin53", "smd", "rect", -5.95, -2.25, 0.7, 0.7, 270, 0, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
  ]),
  mcp73831_sot23_5: padRows([
    ["1", "pin1", "smd", "roundrect", -1.1375, -0.95, 1.325, 0.6, 0, 0.15, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["2", "pin2", "smd", "roundrect", -1.1375, 0, 1.325, 0.6, 0, 0.15, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["3", "pin3", "smd", "roundrect", -1.1375, 0.95, 1.325, 0.6, 0, 0.15, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["4", "pin4", "smd", "roundrect", 1.1375, 0.95, 1.325, 0.6, 0, 0.15, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["5", "pin5", "smd", "roundrect", 1.1375, -0.95, 1.325, 0.6, 0, 0.15, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
  ]),
  tssop16_pitch0_65mm: padRows([
    ["1", "pin1", "smd", "roundrect", -2.8625, 2.275, 1.475, 0.4, 0, 0.1, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["2", "pin2", "smd", "roundrect", -2.8625, 1.625, 1.475, 0.4, 0, 0.1, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["3", "pin3", "smd", "roundrect", -2.8625, 0.975, 1.475, 0.4, 0, 0.1, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["4", "pin4", "smd", "roundrect", -2.8625, 0.325, 1.475, 0.4, 0, 0.1, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["5", "pin5", "smd", "roundrect", -2.8625, -0.325, 1.475, 0.4, 0, 0.1, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["6", "pin6", "smd", "roundrect", -2.8625, -0.975, 1.475, 0.4, 0, 0.1, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["7", "pin7", "smd", "roundrect", -2.8625, -1.625, 1.475, 0.4, 0, 0.1, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["8", "pin8", "smd", "roundrect", -2.8625, -2.275, 1.475, 0.4, 0, 0.1, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["9", "pin9", "smd", "roundrect", 2.8625, -2.275, 1.475, 0.4, 0, 0.1, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["10", "pin10", "smd", "roundrect", 2.8625, -1.625, 1.475, 0.4, 0, 0.1, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["11", "pin11", "smd", "roundrect", 2.8625, -0.975, 1.475, 0.4, 0, 0.1, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["12", "pin12", "smd", "roundrect", 2.8625, -0.325, 1.475, 0.4, 0, 0.1, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["13", "pin13", "smd", "roundrect", 2.8625, 0.325, 1.475, 0.4, 0, 0.1, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["14", "pin14", "smd", "roundrect", 2.8625, 0.975, 1.475, 0.4, 0, 0.1, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["15", "pin15", "smd", "roundrect", 2.8625, 1.625, 1.475, 0.4, 0, 0.1, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["16", "pin16", "smd", "roundrect", 2.8625, 2.275, 1.475, 0.4, 0, 0.1, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
  ]),
  tdfn8_2x2mm_ep0_8x1_2mm: padRows([
    ["", null, "smd", "roundrect", -0.2, 0.3, 0.32, 0.48, 0, 0.08, ["@.Paste"], 0, null],
    ["", null, "smd", "roundrect", -0.2, -0.3, 0.32, 0.48, 0, 0.08, ["@.Paste"], 0, null],
    ["", null, "smd", "roundrect", 0.2, 0.3, 0.32, 0.48, 0, 0.08, ["@.Paste"], 0, null],
    ["", null, "smd", "roundrect", 0.2, -0.3, 0.32, 0.48, 0, 0.08, ["@.Paste"], 0, null],
    ["1", "pin1", "smd", "roundrect", -0.9875, 0.75, 0.775, 0.25, 0, 0.0625, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["2", "pin2", "smd", "roundrect", -0.9875, 0.25, 0.775, 0.25, 0, 0.0625, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["3", "pin3", "smd", "roundrect", -0.9875, -0.25, 0.775, 0.25, 0, 0.0625, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["4", "pin4", "smd", "roundrect", -0.9875, -0.75, 0.775, 0.25, 0, 0.0625, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["5", "pin5", "smd", "roundrect", 0.9875, -0.75, 0.775, 0.25, 0, 0.0625, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["6", "pin6", "smd", "roundrect", 0.9875, -0.25, 0.775, 0.25, 0, 0.0625, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["7", "pin7", "smd", "roundrect", 0.9875, 0.25, 0.775, 0.25, 0, 0.0625, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["8", "pin8", "smd", "roundrect", 0.9875, 0.75, 0.775, 0.25, 0, 0.0625, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["9", "pin9", "smd", "rect", 0, 0, 0.8, 1.2, 0, 0, ["@.Cu", "@.Mask"], 0, null],
  ]),
  sy8088_sot23_5: padRows([
    ["1", "pin1", "smd", "roundrect", -1.1375, 0.95, 1.325, 0.6, 180, 0.15, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["2", "pin2", "smd", "roundrect", -1.1375, 0, 1.325, 0.6, 180, 0.15, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["3", "pin3", "smd", "roundrect", -1.1375, -0.95, 1.325, 0.6, 180, 0.15, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["4", "pin4", "smd", "roundrect", 1.1375, -0.95, 1.325, 0.6, 180, 0.15, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
    ["5", "pin5", "smd", "roundrect", 1.1375, 0.95, 1.325, 0.6, 180, 0.15, ["@.Cu", "@.Mask", "@.Paste"], 0, null],
  ]),
} satisfies Record<string,PadTemplate[]>

// Shared local drawing geometry. Keep string coordinates verbatim for provenance.
export const drawingLayouts = {
  capacitor0402_drawing_variant1: [
    ["fp_line", ["start", "0.91", "-0.46"], ["end", "-0.91", "-0.46"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-0.91", "-0.46"], ["end", "-0.91", "0.46"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "0.91", "0.46"], ["end", "0.91", "-0.46"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-0.91", "0.46"], ["end", "0.91", "0.46"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
  ],
  capacitor0402_drawing_variant2: [
    ["fp_line", ["start", "-0.91", "-0.46"], ["end", "-0.91", "0.46"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-0.91", "0.46"], ["end", "0.91", "0.46"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "0.91", "-0.46"], ["end", "-0.91", "-0.46"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "0.91", "0.46"], ["end", "0.91", "-0.46"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
  ],
  capacitor0402_drawing_variant3: [
    ["fp_line", ["start", "0.91", "-0.46"], ["end", "0.91", "0.46"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-0.91", "-0.46"], ["end", "0.91", "-0.46"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "0.91", "0.46"], ["end", "-0.91", "0.46"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-0.91", "0.46"], ["end", "-0.91", "-0.46"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
  ],
  capacitor0603_drawing_variant1: [
    ["fp_line", ["start", "1.48", "-0.73"], ["end", "1.48", "0.73"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-1.48", "-0.73"], ["end", "1.48", "-0.73"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "1.48", "0.73"], ["end", "-1.48", "0.73"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-1.48", "0.73"], ["end", "-1.48", "-0.73"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
  ],
  capacitor0603_drawing_variant2: [
    ["fp_line", ["start", "1.48", "-0.73"], ["end", "-1.48", "-0.73"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-1.48", "-0.73"], ["end", "-1.48", "0.73"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "1.48", "0.73"], ["end", "1.48", "-0.73"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-1.48", "0.73"], ["end", "1.48", "0.73"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
  ],
  capacitor0603_drawing_variant3: [
    ["fp_line", ["start", "1.48", "0.73"], ["end", "-1.48", "0.73"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "1.48", "-0.73"], ["end", "1.48", "0.73"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-1.48", "0.73"], ["end", "-1.48", "-0.73"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-1.48", "-0.73"], ["end", "1.48", "-0.73"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
  ],
  capacitor0603_drawing_variant4: [
    ["fp_line", ["start", "-0.14058", "-0.51"], ["end", "0.14058", "-0.51"], ["stroke", ["width", "0.12"], ["type", "solid"]], ["layer", "@.SilkS"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-0.14058", "0.51"], ["end", "0.14058", "0.51"], ["stroke", ["width", "0.12"], ["type", "solid"]], ["layer", "@.SilkS"], ["uuid", "@uuid"]],
    ["fp_rect", ["start", "-1.48", "-0.73"], ["end", "1.48", "0.73"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["fill", "no"], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["property", "Reference", "C11", ["at", "0", "1.43", "0"], ["layer", "@.SilkS"], ["uuid", "@uuid"], ["effects", ["font", ["size", "1", "1"], ["thickness", "0.15"]]]],
  ],
  capacitor1206_drawing: [
    ["fp_line", ["start", "-0.711252", "0.91"], ["end", "0.711252", "0.91"], ["stroke", ["width", "0.12"], ["type", "solid"]], ["layer", "@.SilkS"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-0.711252", "-0.91"], ["end", "0.711252", "-0.91"], ["stroke", ["width", "0.12"], ["type", "solid"]], ["layer", "@.SilkS"], ["uuid", "@uuid"]],
    ["fp_rect", ["start", "-2.3", "-1.15"], ["end", "2.3", "1.15"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["fill", "no"], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
  ],
  capacitor0805_drawing_variant1: [
    ["fp_line", ["start", "-1.7", "0.98"], ["end", "1.7", "0.98"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "1.7", "0.98"], ["end", "1.7", "-0.98"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-1.7", "-0.98"], ["end", "-1.7", "0.98"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "1.7", "-0.98"], ["end", "-1.7", "-0.98"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
  ],
  capacitor0805_drawing_variant2: [
    ["fp_line", ["start", "-1.7", "-0.98"], ["end", "-1.7", "0.98"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-1.7", "0.98"], ["end", "1.7", "0.98"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "1.7", "-0.98"], ["end", "-1.7", "-0.98"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "1.7", "0.98"], ["end", "1.7", "-0.98"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
  ],
  capacitor0402_drawing_variant4: [
    ["fp_rect", ["start", "-0.91", "0.46"], ["end", "0.91", "-0.46"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["fill", "no"], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
  ],
  capacitor0603_drawing_variant5: [
    ["fp_line", ["start", "-0.14058", "-0.51"], ["end", "0.14058", "-0.51"], ["stroke", ["width", "0.12"], ["type", "solid"]], ["layer", "@.SilkS"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-0.14058", "0.51"], ["end", "0.14058", "0.51"], ["stroke", ["width", "0.12"], ["type", "solid"]], ["layer", "@.SilkS"], ["uuid", "@uuid"]],
    ["fp_rect", ["start", "-1.48", "-0.73"], ["end", "1.48", "0.73"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["fill", "no"], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["property", "Reference", "C19", ["at", "0", "-1.43", "0"], ["layer", "@.SilkS"], ["uuid", "@uuid"], ["effects", ["font", ["size", "1", "1"], ["thickness", "0.15"]]]],
  ],
  sod123_drawing: [
    ["fp_line", ["start", "2.35", "-1.15"], ["end", "2.35", "1.15"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-2.35", "-1.15"], ["end", "2.35", "-1.15"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-2.35", "-1.15"], ["end", "-2.35", "1.15"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "2.35", "1.15"], ["end", "-2.35", "1.15"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
  ],
  sod882_drawing: [
    ["fp_line", ["start", "0.8", "0.6"], ["end", "-0.8", "0.6"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "0.8", "-0.6"], ["end", "0.8", "0.6"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-0.8", "-0.6"], ["end", "0.8", "-0.6"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-0.8", "-0.6"], ["end", "-0.8", "0.6"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
  ],
  ws2812b_plcc4_drawing: [
    ["fp_line", ["start", "3.45", "-2.75"], ["end", "3.45", "2.75"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-3.45", "-2.75"], ["end", "3.45", "-2.75"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "3.45", "2.75"], ["end", "-3.45", "2.75"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-3.45", "2.75"], ["end", "-3.45", "-2.75"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
  ],
  sod523_drawing: [
    ["fp_line", ["start", "-1.25", "-0.7"], ["end", "-1.25", "0.7"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-1.25", "0.7"], ["end", "1.25", "0.7"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "1.25", "-0.7"], ["end", "-1.25", "-0.7"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "1.25", "0.7"], ["end", "1.25", "-0.7"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
  ],
  gctUsb4105_drawing: [
    ["fp_line", ["start", "-5.1", "-5.58"], ["end", "-5.1", "2.85"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-5.1", "2.85"], ["end", "5.1", "2.85"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "5.1", "-5.58"], ["end", "-5.1", "-5.58"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "5.1", "2.85"], ["end", "5.1", "-5.58"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
  ],
  testpoint1_5mm_drawing: [
    ["fp_circle", ["center", "0", "0"], ["end", "0", "0.95"], ["stroke", ["width", "0.12"], ["type", "solid"]], ["fill", "no"], ["layer", "@.SilkS"], ["uuid", "@uuid"]],
    ["fp_circle", ["center", "0", "0"], ["end", "1.25", "0"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["fill", "no"], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
  ],
  bournsSrn4018_drawing: [
    ["fp_line", ["start", "-2.53", "-2.25"], ["end", "2.53", "-2.25"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-2.53", "2.25"], ["end", "-2.53", "-2.25"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-2.53", "2.25"], ["end", "2.53", "2.25"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "2.53", "2.25"], ["end", "2.53", "-2.25"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
  ],
  sot23_drawing: [
    ["fp_line", ["start", "-1.92", "1.7"], ["end", "-1.92", "-1.7"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "1.92", "1.7"], ["end", "-1.92", "1.7"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-1.92", "-1.7"], ["end", "1.92", "-1.7"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "1.92", "-1.7"], ["end", "1.92", "1.7"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
  ],
  resistor0402_drawing_variant1: [
    ["fp_line", ["start", "-0.93", "-0.47"], ["end", "0.93", "-0.47"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-0.93", "0.47"], ["end", "-0.93", "-0.47"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "0.93", "-0.47"], ["end", "0.93", "0.47"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "0.93", "0.47"], ["end", "-0.93", "0.47"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
  ],
  resistor0402_drawing_variant2: [
    ["fp_line", ["start", "-0.93", "0.47"], ["end", "-0.93", "-0.47"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "0.93", "0.47"], ["end", "-0.93", "0.47"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-0.93", "-0.47"], ["end", "0.93", "-0.47"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "0.93", "-0.47"], ["end", "0.93", "0.47"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
  ],
  resistor0402_drawing_variant3: [
    ["fp_line", ["start", "-0.93", "0.47"], ["end", "0.93", "0.47"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "0.93", "0.47"], ["end", "0.93", "-0.47"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-0.93", "-0.47"], ["end", "-0.93", "0.47"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "0.93", "-0.47"], ["end", "-0.93", "-0.47"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
  ],
  resistor0402_drawing_variant4: [
    ["fp_line", ["start", "-0.93", "-0.47"], ["end", "-0.93", "0.47"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-0.93", "0.47"], ["end", "0.93", "0.47"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "0.93", "-0.47"], ["end", "-0.93", "-0.47"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "0.93", "0.47"], ["end", "0.93", "-0.47"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
  ],
  resistor0402_drawing_variant5: [
    ["fp_rect", ["start", "-0.93", "-0.47"], ["end", "0.93", "0.47"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["fill", "no"], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
  ],
  resistor0402_drawing_variant6: [
    ["fp_line", ["start", "0.93", "-0.47"], ["end", "-0.93", "-0.47"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-0.93", "-0.47"], ["end", "-0.93", "0.47"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "0.93", "0.47"], ["end", "0.93", "-0.47"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-0.93", "0.47"], ["end", "0.93", "0.47"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
  ],
  resistor0402_drawing_variant7: [
    ["fp_line", ["start", "-0.153641", "-0.38"], ["end", "0.153641", "-0.38"], ["stroke", ["width", "0.12"], ["type", "solid"]], ["layer", "@.SilkS"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-0.153641", "0.38"], ["end", "0.153641", "0.38"], ["stroke", ["width", "0.12"], ["type", "solid"]], ["layer", "@.SilkS"], ["uuid", "@uuid"]],
    ["fp_rect", ["start", "-0.93", "-0.47"], ["end", "0.93", "0.47"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["fill", "no"], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["property", "Reference", "R20", ["at", "0", "-1.17", "0"], ["layer", "@.SilkS"], ["uuid", "@uuid"], ["effects", ["font", ["size", "1", "1"], ["thickness", "0.15"]]]],
  ],
  resistor0402_drawing_variant8: [
    ["fp_line", ["start", "-0.153641", "-0.38"], ["end", "0.153641", "-0.38"], ["stroke", ["width", "0.12"], ["type", "solid"]], ["layer", "@.SilkS"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-0.153641", "0.38"], ["end", "0.153641", "0.38"], ["stroke", ["width", "0.12"], ["type", "solid"]], ["layer", "@.SilkS"], ["uuid", "@uuid"]],
    ["fp_rect", ["start", "-0.93", "-0.47"], ["end", "0.93", "0.47"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["fill", "no"], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["property", "Reference", "R21", ["at", "-3", "-2", "0"], ["layer", "@.SilkS"], ["uuid", "@uuid"], ["effects", ["font", ["size", "1", "1"], ["thickness", "0.15"]]]],
  ],
  resistor0402_drawing_variant9: [
    ["fp_line", ["start", "-0.153641", "-0.38"], ["end", "0.153641", "-0.38"], ["stroke", ["width", "0.12"], ["type", "solid"]], ["layer", "@.SilkS"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-0.153641", "0.38"], ["end", "0.153641", "0.38"], ["stroke", ["width", "0.12"], ["type", "solid"]], ["layer", "@.SilkS"], ["uuid", "@uuid"]],
    ["fp_rect", ["start", "-0.93", "-0.47"], ["end", "0.93", "0.47"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["fill", "no"], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["property", "Reference", "R22", ["at", "2.2", "-0.85", "0"], ["layer", "@.SilkS"], ["uuid", "@uuid"], ["effects", ["font", ["size", "1", "1"], ["thickness", "0.15"]]]],
  ],
  resistor0402_drawing_variant10: [
    ["fp_line", ["start", "-0.153641", "0.38"], ["end", "0.153641", "0.38"], ["stroke", ["width", "0.12"], ["type", "solid"]], ["layer", "@.SilkS"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-0.153641", "-0.38"], ["end", "0.153641", "-0.38"], ["stroke", ["width", "0.12"], ["type", "solid"]], ["layer", "@.SilkS"], ["uuid", "@uuid"]],
    ["fp_rect", ["start", "-0.93", "-0.47"], ["end", "0.93", "0.47"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["fill", "no"], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
  ],
  resistor0402_drawing_variant11: [
    ["fp_line", ["start", "-0.153641", "-0.38"], ["end", "0.153641", "-0.38"], ["stroke", ["width", "0.12"], ["type", "solid"]], ["layer", "@.SilkS"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-0.153641", "0.38"], ["end", "0.153641", "0.38"], ["stroke", ["width", "0.12"], ["type", "solid"]], ["layer", "@.SilkS"], ["uuid", "@uuid"]],
    ["fp_rect", ["start", "-0.93", "0.47"], ["end", "0.93", "-0.47"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["fill", "no"], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
  ],
  esp32c3Mini1_drawing: [
    ["fp_line", ["start", "6.8", "8.5"], ["end", "6.8", "-8.5"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "6.8", "-8.5"], ["end", "-6.8", "-8.5"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-6.8", "8.5"], ["end", "6.8", "8.5"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-6.8", "-8.5"], ["end", "-6.8", "8.5"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
  ],
  sot23_5_drawing: [
    ["fp_line", ["start", "-2.05", "1.7"], ["end", "-2.05", "-1.7"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "2.05", "1.7"], ["end", "-2.05", "1.7"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-2.05", "-1.7"], ["end", "2.05", "-1.7"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "2.05", "-1.7"], ["end", "2.05", "1.7"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
  ],
  tssop16_drawing: [
    ["fp_line", ["start", "-2.31", "-2.735"], ["end", "2.31", "-2.735"], ["stroke", ["width", "0.12"], ["type", "solid"]], ["layer", "@.SilkS"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "2.31", "2.735"], ["end", "-2.31", "2.735"], ["stroke", ["width", "0.12"], ["type", "solid"]], ["layer", "@.SilkS"], ["uuid", "@uuid"]],
    ["fp_poly", ["pts", ["xy", "-3.86", "-2.28"], ["xy", "-4.19", "-2.04"], ["xy", "-4.19", "-2.52"]], ["stroke", ["width", "0.12"], ["type", "solid"]], ["fill", "yes"], ["layer", "@.SilkS"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-3.85", "-2.73"], ["end", "-2.45", "-2.73"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-3.85", "2.73"], ["end", "-3.85", "-2.73"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-2.45", "-2.75"], ["end", "2.45", "-2.75"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-2.45", "-2.73"], ["end", "-2.45", "-2.75"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-2.45", "2.73"], ["end", "-3.85", "2.73"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-2.45", "2.75"], ["end", "-2.45", "2.73"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "2.45", "-2.75"], ["end", "2.45", "-2.73"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "2.45", "-2.73"], ["end", "3.85", "-2.73"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "2.45", "2.73"], ["end", "2.45", "2.75"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "2.45", "2.75"], ["end", "-2.45", "2.75"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "3.85", "-2.73"], ["end", "3.85", "2.73"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "3.85", "2.73"], ["end", "2.45", "2.73"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["property", "Reference", "U3", ["at", "0", "-4.2", "0"], ["layer", "@.SilkS"], ["uuid", "@uuid"], ["effects", ["font", ["size", "1", "1"], ["thickness", "0.15"]]]],
  ],
  tdfn8_drawing: [
    ["fp_line", ["start", "1.63", "1.13"], ["end", "1.25", "1.13"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "1.63", "-1.13"], ["end", "1.63", "1.13"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "1.25", "1.25"], ["end", "-1.25", "1.25"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "1.25", "1.13"], ["end", "1.25", "1.25"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "1.25", "-1.13"], ["end", "1.63", "-1.13"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "1.25", "-1.25"], ["end", "1.25", "-1.13"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-1.25", "1.25"], ["end", "-1.25", "1.13"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-1.25", "1.13"], ["end", "-1.63", "1.13"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-1.25", "-1.13"], ["end", "-1.25", "-1.25"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-1.25", "-1.25"], ["end", "1.25", "-1.25"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-1.63", "1.13"], ["end", "-1.63", "-1.13"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
    ["fp_line", ["start", "-1.63", "-1.13"], ["end", "-1.25", "-1.13"], ["stroke", ["width", "0.05"], ["type", "solid"]], ["layer", "@.CrtYd"], ["uuid", "@uuid"]],
  ],
} satisfies Record<string,SExpr[][]>

/** Bind reviewed package geometry to stable instance identities and board side. */
export function instantiateFootprint(side:Side,padLayout:keyof typeof padLayouts,drawingLayout:keyof typeof drawingLayouts,padIds:string[],drawingIds:string[],zones:SExpr[][]=[]):Footprint {
 const templates=padLayouts[padLayout],drawings=drawingLayouts[drawingLayout]
 if(!templates||!drawings)throw new Error(`Unknown footprint layout: ${padLayout}/${drawingLayout}`)
 if(templates.length!==padIds.length||drawings.length!==drawingIds.length)throw new Error(`Footprint identity count mismatch: ${padLayout}/${drawingLayout}`)
 const pads=templates.map((pad,i)=>({...structuredClone(pad),id:padIds[i],layers:pad.layers.map(l=>surface(l,side))}))
 const graphics=drawings.map((drawing,i)=>{
  const expand=(v:SExpr):SExpr=>Array.isArray(v)?v.map(expand):v==="@uuid"?drawingIds[i]:surface(v,side)
  return drawing.map(expand)
 })
 return {pads,graphics,originalLayer:side,metadata:{},zones:structuredClone(zones)}
}
