import type { ChipProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["CLK"],
  pin2: ["DGND"],
  pin3: ["AVSS"],
  pin4: ["AIN3", "REFN1"],
  pin5: ["AIN2"],
  pin6: ["REFN0"],
  pin7: ["REFP0"],
  pin8: ["AIN1"],
  pin9: ["AIN0", "REFP1"],
  pin10: ["AVDD"],
  pin11: ["DVDD"],
  pin12: ["N_DRDY"],
  pin13: ["DOUT", "DOUT_DRDY"],
  pin14: ["DIN"],
  pin15: ["SCLK"],
  pin16: ["N_CS"],
  pin17: ["EP"]
} as const

const pinAttributes = {
  pin2: { requiresGround: true },
  pin3: { requiresGround: true },
  pin5: { doNotConnect: true },
  pin10: { requiresPower: true },
  pin11: { requiresPower: true },
  pin17: { requiresGround: true },
} as const

const footprinterPinLabels = {
  ...pinLabels,
  "pin17": [...pinLabels["pin17"], "thermalpad"],
} as const

export const ADS1220IRVAR = (props: ChipProps<typeof pinLabels>) => {
  return (
    <chip
      pinLabels={footprinterPinLabels}
      pinAttributes={pinAttributes}
      supplierPartNumbers={{
  "lcsc": [
    "C2651338"
  ]
}}
      manufacturerPartNumber="ADS1220IRVAR"
      footprint="qfn16_thermalpad2.1mmx2.1mm_pillpads_h4.34mm_pw0.28mm_pl0.82mm_pin1location(bottomside,left)"
      cadModel={{
        objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C2651338.obj?uuid=b971549606df466cb844ddff3ea6f088",
        stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C2651338.step?uuid=b971549606df466cb844ddff3ea6f088",
        pcbRotationOffset: 0,
        modelOriginPosition: { x: 0.000012699999999199463, y: -0.000012699999999199463, z: -1 },
      }}
      {...props}
    />
  )
}