import type { Part } from "./types"
import { devices } from "./devices"

type Placement = readonly [x: number, y: number, rotation: number, layer: "top"|"bottom"]
type SchematicOrigin = readonly [x: number, y: number, rotation: number]

/** Net keys are physical pin numbers. Missing, extra and accidental NC pins fail. */
function place(ref: string, device: keyof typeof devices, at: Placement, nets: Record<string,string|null>, originalSchematic: SchematicOrigin, dnp = false): Part {
  const spec = devices[device]
  const expected = spec.pins.map(pin => pin[0])
  if (expected.length !== Object.keys(nets).length || expected.some(pin => !(pin in nets))) {
    throw new Error(`${ref}: net map must include exactly the package pin numbers`)
  }
  return {
    ...spec, ref, x: at[0], y: at[1], rotation: at[2], layer: at[3], dnp,
    schX: originalSchematic[0], schY: originalSchematic[1], schRotation: originalSchematic[2],
    pins: spec.pins.map(([number,label,electricalType],i) => ({number,label,electricalType,key:`pin${i+1}`,net:nets[number]})),
  }
}

// ref, device, [PCB x/y/rotation/side], physical-pin nets, original schematic origin, DNP
// null is an intentional no-connect. New schematic layout is in schematic.ts.
export const parts: Part[] = [
  place("C1", "C_0402_1uF_16V", [8.95,7.6,90,"bottom"], {"1":"+3V3","2":"GND"}, [-14.094666667,0.654666667,0]),
  place("C2", "C_0402_100nF_10V", [7.55,7.6,0,"bottom"], {"1":"+3V3","2":"GND"}, [-13.078666667,0.654666667,0]),
  place("C3", "C_0402_1uF_16V", [8.95,9.6,90,"bottom"], {"1":"CHIP_PU","2":"GND"}, [-12.909333333,7.089333333,0]),
  place("C4", "C_0402_10nF_10V", [-11.65,13.48,90,"top"], {"1":"+3V3","2":"GND"}, [-12.062666667,0.654666667,0]),
  place("C5", "C_0603_4_7uF_16V", [-8.35,7.2,90,"bottom"], {"1":"GND","2":"VBUS"}, [2.5,8.782666667,270]),
  place("C6", "C_0603_4_7uF_16V", [-10.45,1.6,90,"bottom"], {"1":"+BATT","2":"GND"}, [5.548,6.750666667,0]),
  place("C9", "C_0603_10uF", [-13.45,3.6,90,"top"], {"1":"+3V3","2":"GND"}, [-14.094666667,-4.086666667,0]),
  place("C10", "C_0603_10uF", [-8.05,-5.5,180,"bottom"], {"1":"+3V3","2":"GND"}, [-12.401333333,-4.086666667,0]),
  place("C11", "C_0603_0_1uF", [-1.65,-1.7,0,"top"], {"1":"+3V3","2":"GND"}, [-10.708,-4.086666667,0]),
  place("C12", "C_1206_0_1uF", [-5.25,-6,180,"top"], {"1":"Net-(U3-AIN0)","2":"Net-(U3-AIN1)"}, [-13.248,-7.981333333,0]),
  place("C15", "C_0805_10uF_16V", [-8.85,7.7,-90,"top"], {"1":"VSYS","2":"GND"}, [8.426666667,0.993333333,0]),
  place("C16", "C_0603_22pF_50V", [-3.3,7.7,90,"top"], {"1":"+3V3","2":"Net-(U6-FB)"}, [16.046666667,0.993333333,0]),
  place("C17", "C_0805_10uF_16V", [2.75,12.04,0,"top"], {"1":"+3V3","2":"GND"}, [17.74,0.993333333,0]),
  place("C18", "C_0402_100nF_10V", [12.55,-0.4,90,"top"], {"1":"+BATT","2":"GND"}, [-1.902666667,-3.070666667,0]),
  place("C19", "C_0603_0_1uF", [-2.15,-0.2,0,"top"], {"1":"+3V3","2":"GND"}, [-9.014666667,-4.086666667,0]),
  place("D1", "LED", [-7.65,1.4,90,"bottom"], {"1":"Net-(D1-K)","2":"VBUS"}, [4.532,5.904,270]),
  place("D2", "B5819W", [12.55,3.7,90,"bottom"], {"1":"VSYS","2":"VBUS"}, [-0.209333333,-9.336,180]),
  place("D3", "LESD8D3_3CAT5G", [-10.85,11.4,180,"top"], {"1":"+3V3","2":"GND"}, [-15.28,0.316,270]),
  place("D4", "WS2812B_V6", [-11.95,10.9,90,"bottom"], {"1":"+3V3","2":null,"3":"GND","4":"Net-(D4-DIN)"}, [0.976,1.84,0]),
  place("D7", "LESD5D5_0CT1G", [1.55,-6.1,0,"top"], {"1":"USB_D-","2":"GND"}, [12.66,6.073333333,270]),
  place("D8", "B5819W", [11.55,3.4,90,"top"], {"1":"VBUS","2":"Net-(D8-A)"}, [14.014666667,9.968,180]),
  place("D9", "LESD5D5_0CT1G", [11.05,-6.1,0,"top"], {"1":"Net-(D8-A)","2":"GND"}, [14.014666667,9.121333333,0]),
  place("D10", "LESD5D5_0CT1G", [4.55,-6.1,0,"top"], {"1":"USB_D+","2":"GND"}, [14.014666667,6.073333333,270]),
  place("J2", "USB4105_GF_A", [4.55,-13.3,0,"top"], {"A1_B12":"GND","A4_B9":"Net-(D8-A)","A5":"Net-(J2-CC1)","A6":"USB_D+","A7":"USB_D-","A8":null,"B1_A12":"GND","B4_A9":"Net-(D8-A)","B5":"Net-(J2-CC2)","B6":"USB_D+","B7":"USB_D-","B8":null,"S1":"Net-(J2-SHELL_GND-PadS1)","S2":"Net-(J2-SHELL_GND-PadS1)","S3":"Net-(J2-SHELL_GND-PadS1)","S4":"Net-(J2-SHELL_GND-PadS1)"}, [9.781333333,6.750666667,0]),
  place("J5", "PAD_B_MINUS", [13.75,-6.1,0,"top"], {"1":"GND"}, [10.12,-2.732,0], true),
  place("J6", "PAD_SW_PLUS", [13.75,-11.15,0,"top"], {"1":"+BATT"}, [10.12,-5.78,0], true),
  place("J7", "PAD_B_PLUS", [13.75,-8.6,0,"top"], {"1":"+BATT"}, [10.12,-3.578666667,0], true),
  place("J8", "PAD_SW_MINUS", [13.75,-13.7,0,"top"], {"1":"SW_BATT"}, [10.12,-4.764,0], true),
  place("J9", "PAD_A_PLUS", [-8.05,-13.7,0,"top"], {"1":"A+"}, [13.506666667,-2.732,0], true),
  place("J10", "PAD_A_MINUS", [-10.85,-13.7,0,"top"], {"1":"A-"}, [13.506666667,-3.578666667,0], true),
  place("J11", "PAD_E_PLUS", [-5.25,-13.7,0,"top"], {"1":"+3V3"}, [13.506666667,-4.594666667,0], true),
  place("J12", "PAD_E_MINUS", [-13.65,-13.7,0,"top"], {"1":"GND"}, [13.506666667,-5.610666667,0], true),
  place("L1", "SPH4018H2R2MT_2_2uH_2_2A", [-1.65,12.04,0,"top"], {"1":"Buck_Coil","2":"+3V3"}, [13.337333333,1.670666667,90]),
  place("Q2", "DMG3415U_7", [12.55,-0.8,-90,"bottom"], {"1":"VBUS","2":"VSYS","3":"SW_BATT"}, [0.806666667,-8.489333333,0]),
  place("R1", "R_0402_10kR_1", [7.55,9.6,0,"bottom"], {"1":"+3V3","2":"CHIP_PU"}, [-12.909333333,8.613333333,0]),
  place("R2", "R_0402_10kR_1", [-13.45,3.6,-90,"bottom"], {"1":"GND","2":"Net-(U2-PROG)"}, [-0.886666667,6.750666667,90]),
  place("R3", "R_0402_1kR_1", [-13.45,1.1,0,"bottom"], {"1":"Net-(U2-STAT)","2":"Net-(D1-K)"}, [3.685333333,6.750666667,90]),
  place("R7", "R_0402_100R_1", [-4.475,-8.4,-90,"top"], {"1":"Net-(U3-AIN0)","2":"A+"}, [-14.433333333,-7.473333333,270]),
  place("R8", "R_0402_100R_1", [-6.025,-8.4,-90,"top"], {"1":"Net-(U3-AIN1)","2":"A-"}, [-14.433333333,-8.489333333,270]),
  place("R9", "R_0402_100kR_1", [3.05,3.9,0,"top"], {"1":"VBUS","2":"GND"}, [-1.225333333,-10.352,0]),
  place("R13", "R_0402_0R_1", [4.55,2.9,0,"bottom"], {"1":"IO2_LED","2":"Net-(D4-DIN)"}, [-0.717333333,1.84,90]),
  place("R14", "R_0402_10kR_1", [-2.25,3.4,0,"top"], {"1":"VSYS","2":"ENABLE"}, [9.612,0.993333333,0]),
  place("R15", "R_0402_100kR_1", [-5.05,7.7,90,"top"], {"1":"+3V3","2":"Net-(U6-FB)"}, [13.845333333,0.993333333,0]),
  place("R16", "R_0402_22k1R_1", [-1.8,7.7,-90,"top"], {"1":"Net-(U6-FB)","2":"GND"}, [13.845333333,-0.022666667,0]),
  place("R17", "R_0402_0R_1", [4.55,-3.1,0,"bottom"], {"1":"Net-(J2-SHELL_GND-PadS1)","2":"GND"}, [11.474666667,3.533333333,90]),
  place("R18", "R_0402_5k1R_1", [7.55,-4.6,0,"bottom"], {"1":"Net-(J2-CC2)","2":"GND"}, [16.554666667,7.766666667,0]),
  place("R19", "R_0402_5k1R_1", [1.55,-4.6,0,"bottom"], {"1":"Net-(J2-CC1)","2":"GND"}, [17.909333333,7.766666667,0]),
  place("R20", "R_0402_10kR_1", [7.05,-1.6,0,"top"], {"1":"IO6_SCL","2":"+3V3"}, [6.564,-2.224,90]),
  place("R21", "R_0402_10kR_1", [7.05,-3.6,0,"top"], {"1":"IO7_SDA","2":"+3V3"}, [6.564,-3.070666667,90]),
  place("R22", "R_0402_10kR_1", [7.05,-5.6,0,"top"], {"1":"IO10_ALRT","2":"+3V3"}, [6.564,-4.086666667,90]),
  place("R23", "R_0402_47R_1", [-2.35,4.5,180,"top"], {"1":"IO5_SCK","2":"ADS_SCLK"}, [-7.829333333,-10.521333333,90]),
  place("R24", "R_0402_47R_1", [-0.65,2.7,0,"bottom"], {"1":"IO4_MOSI","2":"ADS_DIN"}, [-7.829333333,-11.537333333,90]),
  place("R25", "R_0402_47R_1", [5.25,9,180,"top"], {"1":"IO3_CS","2":"ADS_CS"}, [-7.829333333,-12.553333333,90]),
  place("R26", "R_0402_47R_1", [-5.25,1.300001,0,"bottom"], {"1":"ADS_DOUT","2":"IO1_MISO"}, [-7.829333333,-13.569333333,270]),
  place("U1", "ESP32_C3_MINI_1", [-0.65,11.9,180,"bottom"], {"1":"GND","2":"GND","3":"+3V3","4":null,"5":"IO2_LED","6":"IO3_CS","7":null,"8":"CHIP_PU","9":null,"10":null,"11":"GND","12":null,"13":"IO1_MISO","14":"GND","15":null,"16":"IO10_ALRT","17":null,"18":"IO4_MOSI","19":"IO5_SCK","20":"IO6_SCL","21":"IO7_SDA","22":null,"23":null,"24":null,"25":null,"26":"USB_D-","27":"USB_D+","28":null,"29":null,"30":null,"31":null,"32":null,"33":null,"34":null,"35":null,"36":"GND","37":"GND","38":"GND","39":"GND","40":"GND","41":"GND","42":"GND","43":"GND","44":"GND","45":"GND","46":"GND","47":"GND","48":"GND","49":"GND","50":"GND","51":"GND","52":"GND","53":"GND"}, [-7.321333333,4.888,0]),
  place("U2", "MCP73831T_2ACI_OT", [-10.95,5.2,-90,"bottom"], {"1":"Net-(U2-STAT)","2":"GND","3":"+BATT","4":"VBUS","5":"Net-(U2-PROG)"}, [1.484,7.089333333,0]),
  place("U3", "ADS1220IPWR", [-8.25,-1.1,0,"top"], {"1":"ADS_SCLK","2":"ADS_CS","3":"GND","4":"GND","5":"GND","6":null,"7":null,"8":"GND","9":"+3V3","10":"Net-(U3-AIN1)","11":"Net-(U3-AIN0)","12":"+3V3","13":"+3V3","14":null,"15":"ADS_DOUT","16":"ADS_DIN"}, [-7.66,-6.965333333,0]),
  place("U5", "MAX17048G_T10", [11.05,-2.6,180,"top"], {"1":"GND","2":"+BATT","3":"+BATT","4":"GND","5":"IO10_ALRT","6":"GND","7":"IO6_SCL","8":"IO7_SDA","9":"GND"}, [1.314666667,-2.901333333,0]),
  place("U6", "SY8088", [-5.95,10.9,-90,"top"], {"1":"ENABLE","2":"GND","3":"Buck_Coil","4":"VSYS","5":"Net-(U6-FB)"}, [11.474666667,0.824,0]),
]
