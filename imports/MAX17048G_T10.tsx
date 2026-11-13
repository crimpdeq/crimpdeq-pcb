import type { ChipProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["CTG"],
  pin2: ["CELL"],
  pin3: ["VDD"],
  pin4: ["GND"],
  pin5: ["N_ALRT"],
  pin6: ["QSTRT"],
  pin7: ["SCL"],
  pin8: ["SDA"],
  pin9: ["EP"]
} as const

const pinAttributes = {
  pin3: {requiresPower: true},
  pin4: {requiresGround: true}
} as const

const footprinterPinLabels = {
  ...pinLabels,
  "pin9": [...pinLabels["pin9"], "thermalpad"],
} as const

export const MAX17048G_T10 = (props: ChipProps<typeof pinLabels>) => {
  return (
    <chip
      pinLabels={footprinterPinLabels}
      pinAttributes={pinAttributes}
      supplierPartNumbers={{
  "lcsc": [
    "C2682616"
  ]
}}
      manufacturerPartNumber="MAX17048G+T10"
      footprint="dfn8_thermalpad0.8mmx1.2mm_p0.5mm_w2.3mm_pw0.28mm_pl0.42mm_pin1location(leftside,bottom)"
      cadModel={{
        objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C2682616.obj?uuid=9f88ab37f18741bd85a157cdee617c79",
        stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C2682616.step?uuid=9f88ab37f18741bd85a157cdee617c79",
        pcbRotationOffset: 0,
        modelOriginPosition: { x: 0, y: 0.000012700000013410317, z: -0.02 },
      }}
      {...props}
    />
  )
}