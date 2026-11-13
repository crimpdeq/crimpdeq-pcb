import type { ChipProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["G"],
  pin2: ["S"],
  pin3: ["D"]
} as const

export const DMG3415U_7 = (props: ChipProps<typeof pinLabels>) => {
  return (
    <chip
      pinLabels={pinLabels}
      symbol={
        <symbol>
          <schematicpath points={[{"x":0,"y":0},{"x":-0.12,"y":-0.04},{"x":-0.12,"y":0.04},{"x":0,"y":0}]} strokeColor="#880000" isFilled fillColor="#880000" />
          <schematicpath points={[{"x":0.2,"y":-0.06},{"x":0.14,"y":0.04},{"x":0.26,"y":0.04},{"x":0.2,"y":-0.06}]} strokeColor="#880000" isFilled fillColor="#880000" />
          <schematicpath points={[{"x":-0.2,"y":0.14},{"x":0,"y":0.14},{"x":0,"y":0.2},{"x":0.2,"y":0.2},{"x":0.2,"y":0.04}]} strokeColor="#880000" />
          <schematicpath points={[{"x":-0.2,"y":0},{"x":0,"y":0},{"x":0,"y":-0.2},{"x":0.2,"y":-0.2},{"x":0.2,"y":-0.06}]} strokeColor="#880000" />
          <schematicpath points={[{"x":0,"y":-0.14},{"x":-0.2,"y":-0.14}]} strokeColor="#880000" />
          <schematicpath points={[{"x":-0.24,"y":0.18},{"x":-0.24,"y":-0.18}]} strokeColor="#880000" />
          <schematicpath points={[{"x":-0.2,"y":0.18},{"x":-0.2,"y":0.1}]} strokeColor="#880000" />
          <schematicpath points={[{"x":-0.2,"y":-0.04},{"x":-0.2,"y":0.04}]} strokeColor="#880000" />
          <schematicpath points={[{"x":-0.2,"y":-0.18},{"x":-0.2,"y":-0.1}]} strokeColor="#880000" />
          <schematicpath points={[{"x":-0.4,"y":0},{"x":-0.24,"y":0}]} strokeColor="#880000" />
          <schematicpath points={[{"x":0.28,"y":-0.06},{"x":0.24,"y":-0.06},{"x":0.16,"y":-0.06},{"x":0.12,"y":-0.06}]} strokeColor="#880000" />
          <port name="pin3" pinNumber={3} aliases={["D"]} direction="up" schX={0} schY={0.4} schStemLength={0.2} />
          <port name="pin1" pinNumber={1} aliases={["G"]} direction="left" schX={-0.7} schY={0} schStemLength={0.2} />
          <port name="pin2" pinNumber={2} aliases={["S"]} direction="down" schX={0} schY={-0.6} schStemLength={0.4} />
          <schematicpath points={[{"x":-0.33,"y":-0.3},{"x":-0.23,"y":-0.36},{"x":-0.23,"y":-0.24},{"x":-0.33,"y":-0.3}]} strokeColor="#880000" isFilled fillColor="#880000" />
          <schematicpath points={[{"x":-0.35,"y":-0.3},{"x":-0.45,"y":-0.24},{"x":-0.45,"y":-0.36},{"x":-0.35,"y":-0.3}]} strokeColor="#880000" isFilled fillColor="#880000" />
          <schematicpath points={[{"x":-0.34,"y":-0.3},{"x":-0.34,"y":-0.26},{"x":-0.36,"y":-0.24}]} strokeColor="#660000" />
          <schematicpath points={[{"x":-0.34,"y":-0.3},{"x":-0.34,"y":-0.34},{"x":-0.32,"y":-0.36}]} strokeColor="#660000" />
          <schematicpath points={[{"x":-0.5,"y":0},{"x":-0.5,"y":-0.3},{"x":-0.46,"y":-0.3}]} strokeColor="#660000" />
          <schematicpath points={[{"x":-0.22,"y":-0.3},{"x":0,"y":-0.3}]} strokeColor="#660000" />
          <schematicpath points={[{"x":-0.5,"y":0},{"x":-0.4,"y":0}]} strokeColor="#660000" />
          <schematictext text={props.displayName ?? "{NAME}"} schX={0.3} schY={0.35} fontSize={0.18} anchor="left" />
        </symbol>
      }
      supplierPartNumbers={{
  "lcsc": [
    "C96616"
  ]
}}
      manufacturerPartNumber="DMG3415U-7"
      footprint="sot23w_p1.1mm_pw0.53mm_pl1.04mm_pin1location(rightside,bottom)"
      cadModel={{
        objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C96616.obj?uuid=cefd4596db214da394d9632b2b88f8f2",
        stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C96616.step?uuid=cefd4596db214da394d9632b2b88f8f2",
        pcbRotationOffset: 90,
        modelOriginPosition: { x: -0.000012700000070253736, y: 0, z: 0 },
      }}
      {...props}
    />
  )
}