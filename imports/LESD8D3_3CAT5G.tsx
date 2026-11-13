import type { ChipProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["pin1"],
  pin2: ["pin2"]
} as const

const pinAttributes = {
  pin2: { requiresGround: true },
} as const

export const LESD8D3_3CAT5G = (props: ChipProps<typeof pinLabels>) => {
  return (
    <chip
      pinLabels={pinLabels}
      pinAttributes={pinAttributes}
      symbol={
        <symbol>
          <schematicpath points={[{ x: -0.15, y: -0.12 }, { x: 0.15, y: -0.12 }, { x: 0, y: 0.12 }, { x: -0.15, y: -0.12 }]} strokeColor="#880000" />
          <schematicpath points={[{ x: -0.2, y: 0.17 }, { x: -0.15, y: 0.12 }, { x: 0.15, y: 0.12 }, { x: 0.2, y: 0.07 }]} strokeColor="#880000" />
          <schematicpath points={[{ x: 0, y: 0.12 }, { x: 0, y: 0.3 }]} strokeColor="#880000" />
          <schematicpath points={[{ x: 0, y: -0.12 }, { x: 0, y: -0.3 }]} strokeColor="#880000" />
          <port name="pin1" pinNumber={1} aliases={["1"]} direction="up" schX={0} schY={0.5} schStemLength={0.2} />
          <port name="pin2" pinNumber={2} aliases={["2"]} direction="down" schX={0} schY={-0.5} schStemLength={0.2} />
          <schematictext text={props.displayName ?? "{NAME}"} schX={0.25} schY={0} fontSize={0.18} anchor="left" />
        </symbol>
      }
      supplierPartNumbers={{
  "lcsc": [
    "C172409"
  ]
}}
      manufacturerPartNumber="LESD8D3.3CAT5G"
      footprint="smdpads2_p0.65mm_pw0.3mm_ph0.6mm"
      cadModel={{
        objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C172409.obj?uuid=877c93dfeb5e4f11ae5e8fd64a11302d",
        stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C172409.step?uuid=877c93dfeb5e4f11ae5e8fd64a11302d",
        pcbRotationOffset: 0,
        modelOriginPosition: { x: -0.00012700000000620548, y: 0.00005000000001420535, z: 0 },
      }}
      {...props}
    />
  )
}