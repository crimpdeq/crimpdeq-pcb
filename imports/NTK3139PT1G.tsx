import type { ChipProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["G"],
  pin2: ["S"],
  pin3: ["D"]
} as const

export const NTK3139PT1G = (props: ChipProps<typeof pinLabels>) => {
  return (
    <chip
      pinLabels={pinLabels}
      symbol={
        <symbol>
          <port name="pin2" pinNumber={2} aliases={["S"]} direction="down" schX={0} schY={-0.4} schStemLength={0.2} />
          <port name="pin1" pinNumber={1} aliases={["G"]} direction="left" schX={-0.4} schY={0} schStemLength={0.16} />
          <port name="pin3" pinNumber={3} aliases={["D"]} direction="up" schX={0} schY={0.4} schStemLength={0.2} />
          <schematicpath points={[{"x":0.26,"y":-0.06},{"x":0.24,"y":-0.06},{"x":0.16,"y":-0.06},{"x":0.14,"y":-0.06}]} strokeColor="#880000" />
          <schematicpath points={[{"x":-0.2,"y":-0.18},{"x":-0.2,"y":-0.1}]} strokeColor="#880000" />
          <schematicpath points={[{"x":-0.2,"y":-0.04},{"x":-0.2,"y":0.04}]} strokeColor="#880000" />
          <schematicpath points={[{"x":-0.2,"y":0.18},{"x":-0.2,"y":0.1}]} strokeColor="#880000" />
          <schematicpath points={[{"x":-0.24,"y":0.18},{"x":-0.24,"y":-0.18}]} strokeColor="#880000" />
          <schematicpath points={[{"x":0,"y":-0.14},{"x":-0.2,"y":-0.14}]} strokeColor="#880000" />
          <schematicpath points={[{"x":-0.2,"y":0},{"x":0,"y":0},{"x":0,"y":-0.2},{"x":0.2,"y":-0.2},{"x":0.2,"y":-0.06}]} strokeColor="#880000" />
          <schematicpath points={[{"x":-0.2,"y":0.14},{"x":0,"y":0.14},{"x":0,"y":0.2},{"x":0.2,"y":0.2},{"x":0.2,"y":0.04}]} strokeColor="#880000" />
          <schematicpath points={[{"x":0.2,"y":-0.06},{"x":0.14,"y":0.04},{"x":0.26,"y":0.04},{"x":0.2,"y":-0.06}]} strokeColor="#880000" />
          <schematicpath points={[{"x":0,"y":0},{"x":-0.12,"y":0.04},{"x":-0.12,"y":-0.04},{"x":0,"y":0}]} strokeColor="#880000" isFilled fillColor="#FEFEFE" />
          <schematicpath points={[{"x":-0.34,"y":-0.22},{"x":-0.4,"y":-0.12},{"x":-0.28,"y":-0.12},{"x":-0.34,"y":-0.22}]} strokeColor="#880000" />
          <schematicpath points={[{"x":-0.34,"y":0},{"x":-0.34,"y":-0.16},{"x":-0.34,"y":-0.24},{"x":-0.34,"y":-0.36},{"x":0,"y":-0.36}]} strokeColor="#880000" />
          <schematicpath points={[{"x":-0.34,"y":-0.22},{"x":-0.4,"y":-0.32},{"x":-0.28,"y":-0.32},{"x":-0.34,"y":-0.22}]} strokeColor="#880000" />
          <schematicpath points={[{"x":-0.28,"y":-0.2},{"x":-0.3,"y":-0.22},{"x":-0.38,"y":-0.22},{"x":-0.4,"y":-0.24}]} strokeColor="#880000" />
          <schematictext text={props.displayName ?? "{NAME}"} schX={0.3} schY={0.35} fontSize={0.18} anchor="left" />
        </symbol>
      }
      supplierPartNumbers={{
  "lcsc": [
    "C236246"
  ]
}}
      manufacturerPartNumber="NTK3139PT1G"
      footprint={<footprint>
        <smtpad portHints={["pin1"]} pcbX="0.499999mm" pcbY="-0.40005mm" width="0.5207mm" height="0.4699mm" shape="rect" />
<smtpad portHints={["pin2"]} pcbX="0.499999mm" pcbY="0.40005mm" width="0.5207mm" height="0.4699mm" shape="rect" />
<smtpad portHints={["pin3"]} pcbX="-0.499999mm" pcbY="0mm" width="0.5207mm" height="0.5207mm" shape="rect" />
<silkscreenpath route={[{"x":-0.39999919999999634,"y":-0.4404868000000022},{"x":-0.39999919999999634,"y":-0.5999987999999945},{"x":0.05941060000000675,"y":-0.5999987999999945}]} />
<silkscreenpath route={[{"x":-0.39999919999999634,"y":0.5999987999999945},{"x":-0.39999919999999634,"y":0.4404868000000164}]} />
<silkscreenpath route={[{"x":-0.39999919999999634,"y":0.5999987999999945},{"x":0.05941060000000675,"y":0.5999987999999945}]} />
<silkscreencircle pcbX="0.4299966mm" pcbY="-0.8999982mm" radius="0.0750062mm" />
<silkscreentext text="{NAME}" pcbX="0.170053mm" pcbY="1.62738mm" anchorAlignment="center" fontSize="1mm" />
<courtyardoutline outline={[{"x":-1.010349000000005,"y":0.8850000000000051},{"x":1.010349000000005,"y":0.8850000000000051},{"x":1.010349000000005,"y":-0.8850000000000051},{"x":-1.010349000000005,"y":-0.8850000000000051},{"x":-1.010349000000005,"y":0.8850000000000051}]} />
      </footprint>}
      cadModel={{
        objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C236246.obj?uuid=68188f8082144610b58dbe133e9323ff",
        stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C236246.step?uuid=68188f8082144610b58dbe133e9323ff",
        pcbRotationOffset: 180,
        modelOriginPosition: { x: -0.0001015999999935957, y: 0, z: 0 },
      }}
      {...props}
    />
  )
}