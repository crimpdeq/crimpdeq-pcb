import type { ChipProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["pin1"],
  pin2: ["pin2"]
} as const

const pinAttributes = {
  pin2: { requiresGround: true },
} as const

export const LESD5D5_0CT1G = (props: ChipProps<typeof pinLabels>) => {
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
    "C383211"
  ]
}}
      manufacturerPartNumber="LESD5D5.0CT1G"
      footprint="smdpads2_p1.4999mm_pw0.6mm_ph0.4mm"
      cadModel={{
        objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C383211.obj?uuid=1c55af31f47d4d9db45f00e5a148cdf3",
        stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C383211.step?uuid=1c55af31f47d4d9db45f00e5a148cdf3",
        pcbRotationOffset: 0,
        modelOriginPosition: { x: -0.2132400000000142, y: -0.010919000000014195, z: -0.71 },
      }}
      {...props}
    />
  )
}