import type { InductorProps } from "@tscircuit/props"

export const FTC252012S2R2MBCA = (props: Omit<InductorProps, "inductance">) => {
  return (
    <inductor
      inductance="2.2uH"
      supplierPartNumbers={{
  "lcsc": [
    "C5832372"
  ]
}}
      manufacturerPartNumber="FTC252012S2R2MBCA"
      footprint="smdpads2_p2mm_pw0.8mm_ph2.2mm"
      cadModel={{
        objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C5832372.obj?uuid=bd419dc2b18d482e9f41c983f2e133d1",
        stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C5832372.step?uuid=bd419dc2b18d482e9f41c983f2e133d1",
        pcbRotationOffset: 0,
        modelOriginPosition: { x: -0.000012699999956566899, y: 0, z: -1.16 },
      }}
      {...props}
    />
  )
}