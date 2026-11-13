import type { ChipProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["DIN"],
  pin2: ["VDD"],
  pin3: ["DO"],
  pin4: ["GND"]
} as const

const pinAttributes = {
  pin2: {requiresPower: true},
  pin4: {requiresGround: true}
} as const

export const XL_2121RGBC_2812B = (props: ChipProps<typeof pinLabels>) => {
  return (
    <chip
      pinLabels={pinLabels}
      pinAttributes={pinAttributes}
      supplierPartNumbers={{
  "lcsc": [
    "C5349957"
  ]
}}
      manufacturerPartNumber="XL-2121RGBC-2812B"
      footprint="dfn4_p1mm_w2.5899mm_pw0.6mm_pl0.85mm_pin1location(rightside,bottom)"
      
      {...props}
    />
  )
}