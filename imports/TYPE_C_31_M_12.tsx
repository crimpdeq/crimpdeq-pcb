import type { ConnectorProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["EH2", "SHELL2"],
  pin2: ["EH1", "SHELL1"],
  pin3: ["EH4", "SHELL4"],
  pin4: ["EH3", "SHELL3"],
  pin5: ["B8","SBU2"],
  pin6: ["A5","CC1"],
  pin7: ["B7","DN2","DM2"],
  pin8: ["A6","DP1"],
  pin9: ["A7","DN1","DM1"],
  pin10: ["B6","DP2"],
  pin11: ["A8","SBU1"],
  pin12: ["B5","CC2"],
  pin13: ["A1B12","GND1"],
  pin14: ["B1A12","GND2"],
  pin15: ["B4A9","VBUS1"],
  pin16: ["A4B9","VBUS2"]
} as const

const pinAttributes = {
  pin5: { doNotConnect: true },
  pin11: { doNotConnect: true },
} as const

export const TYPE_C_31_M_12 = (props: Omit<ConnectorProps, "pinLabels">) => {
  return (
    <connector
      pinLabels={pinLabels}
      pinAttributes={pinAttributes}
      supplierPartNumbers={{
  "lcsc": [
    "C165948"
  ]
}}
      manufacturerPartNumber="TYPE-C-31-M-12"
      footprint={<footprint insertionDirection="from_bottom">
        <hole pcbX="-2.899918mm" pcbY="0.9055672mm" diameter="0.5999988mm" />
<hole pcbX="2.899918mm" pcbY="0.9055672mm" diameter="0.5999988mm" />
<platedhole  portHints={["pin2"]} pcbX="4.325112mm" pcbY="-2.7741308mm" holeWidth="0.7999984mm" holeHeight="1.3999972mm" outerWidth="1.1999976mm" outerHeight="1.7999964mm" shape="pill" />
<platedhole  portHints={["pin1"]} pcbX="4.325112mm" pcbY="1.4056932mm" holeWidth="0.7999984mm" holeHeight="1.5999968mm" outerWidth="1.1999976mm" outerHeight="1.999996mm" shape="pill" />
<platedhole  portHints={["pin4"]} pcbX="-4.325112mm" pcbY="1.4056932mm" holeWidth="0.7999984mm" holeHeight="1.5999968mm" outerWidth="1.1999976mm" outerHeight="1.999996mm" shape="pill" />
<platedhole  portHints={["pin3"]} pcbX="-4.325112mm" pcbY="-2.7741308mm" holeWidth="0.7999984mm" holeHeight="1.3999972mm" outerWidth="1.1999976mm" outerHeight="1.7999964mm" shape="pill" />
<smtpad portHints={["pin5"]} pcbX="-1.75006mm" pcbY="2.1740432mm" width="0.2999994mm" height="1.2999974mm" shape="rect" />
<smtpad portHints={["pin6"]} pcbX="-1.249934mm" pcbY="2.1740432mm" width="0.2999994mm" height="1.2999974mm" shape="rect" />
<smtpad portHints={["pin7"]} pcbX="-0.750062mm" pcbY="2.1740432mm" width="0.2999994mm" height="1.2999974mm" shape="rect" />
<smtpad portHints={["pin8"]} pcbX="-0.249936mm" pcbY="2.1740432mm" width="0.2999994mm" height="1.2999974mm" shape="rect" />
<smtpad portHints={["pin9"]} pcbX="0.249936mm" pcbY="2.1740432mm" width="0.2999994mm" height="1.2999974mm" shape="rect" />
<smtpad portHints={["pin10"]} pcbX="0.750062mm" pcbY="2.1740432mm" width="0.2999994mm" height="1.2999974mm" shape="rect" />
<smtpad portHints={["pin11"]} pcbX="1.24968mm" pcbY="2.1740432mm" width="0.2999994mm" height="1.2999974mm" shape="rect" />
<smtpad portHints={["pin12"]} pcbX="1.75006mm" pcbY="2.1740432mm" width="0.2999994mm" height="1.2999974mm" shape="rect" />
<smtpad portHints={["pin13"]} pcbX="-3.199955mm" pcbY="2.174043mm" width="0.5999734mm" height="1.300175mm" shape="rect" />
<smtpad portHints={["pin14"]} pcbX="3.200006mm" pcbY="2.174145mm" width="0.6000242mm" height="1.299972mm" shape="rect" />
<smtpad portHints={["pin15"]} pcbX="2.40016mm" pcbY="2.174145mm" width="0.6000242mm" height="1.299972mm" shape="rect" />
<smtpad portHints={["pin16"]} pcbX="-2.399957mm" pcbY="2.17398mm" width="0.5999734mm" height="1.299997mm" shape="rect" />
<silkscreenpath route={[{"x":-4.4689776000000165,"y":-1.6757585999999947},{"x":-4.4689776000000165,"y":0.18715359999987413}]} />
<silkscreenpath route={[{"x":4.471009600000116,"y":-5.394140800000059},{"x":-4.4689776000000165,"y":-5.394140800000059},{"x":-4.4689776000000165,"y":-3.91283820000001}]} />
<silkscreenpath route={[{"x":4.471009600000116,"y":-1.676114200000029},{"x":4.471009600000116,"y":0.18750920000002225}]} />
<silkscreenpath route={[{"x":4.471009600000116,"y":-5.394140800000059},{"x":4.471009600000116,"y":-3.912482600000203}]} />
<silkscreentext text="{NAME}" pcbX="0.002794mm" pcbY="3.8286012mm" anchorAlignment="center" fontSize="1mm" />
<courtyardoutline outline={[{"x":-5.174805999999876,"y":3.0786011999998664},{"x":5.180394000000092,"y":3.0786011999998664},{"x":5.180394000000092,"y":-5.650998800000025},{"x":-5.174805999999876,"y":-5.650998800000025},{"x":-5.174805999999876,"y":3.0786011999998664}]} />
      </footprint>}
      
      cadModel={{
        objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C165948.obj?uuid=617b05f9bba7410b96c001093d8189e4",
        stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C165948.step?uuid=617b05f9bba7410b96c001093d8189e4",
        pcbRotationOffset: 180,
        // EasyEDA's exact import put the 2.75 mm y offset on z, floating the model;
        // seating plane is z = 0 and the front face lands on the footprint's y = -5.39
        modelOriginPosition: { x: 0, y: -2.75, z: 0 },
      
      }}
      
      {...props}
    />
  )
}