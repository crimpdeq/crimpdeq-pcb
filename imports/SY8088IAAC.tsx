import type { ChipProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["EN"],
  pin2: ["GND"],
  pin3: ["LX"],
  pin4: ["IN"],
  pin5: ["FB"]
} as const

const pinAttributes = {
  pin2: {requiresGround: true}
} as const

export const SY8088IAAC = (props: ChipProps<typeof pinLabels>) => {
  return (
    <chip
      pinLabels={pinLabels}
      pinAttributes={pinAttributes}
      supplierPartNumbers={{
  "lcsc": [
    "C479072"
  ]
}}
      manufacturerPartNumber="SY8088IAAC"
      footprint="dfn6_missing(5)_p0.95mm_w3.47mm_pw0.49mm_pl1.16mm_pin1location(leftside,bottom)"
      cadModel={{
        objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C479072.obj?uuid=460193f9bf2d42e58cf3c2f675b07dc6",
        stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C479072.step?uuid=460193f9bf2d42e58cf3c2f675b07dc6",
        pcbRotationOffset: 90,
        modelOriginPosition: { x: 0.004489450000050965, y: 0.000012700000070253736, z: -0.049083 },
      }}
      {...props}
    />
  )
}