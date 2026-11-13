import type { DiodeProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["anode","pos"],
  pin2: ["cathode","neg"]
} as const

export const B5819WS = (props: DiodeProps) => {
  const { name = "D1", ...restProps } = props

  return (
    <diode
      name={name}
      pinLabels={pinLabels}
      supplierPartNumbers={{
  "lcsc": [
    "C7420331"
  ]
}}
      manufacturerPartNumber="B5819WS"
      footprint={<footprint>
        <smtpad portHints={["pin1","anode","pos"]} pcbX="-1.039876mm" pcbY="0mm" width="0.7800086mm" height="0.499999mm" shape="rect" />
<smtpad portHints={["pin2","cathode","neg"]} pcbX="1.039876mm" pcbY="0mm" width="0.7800086mm" height="0.499999mm" shape="rect" />
<silkscreenpath route={[{"x":-0.9261856000000108,"y":-0.4301489999999859},{"x":-0.9261856000000108,"y":-0.7012940000000043}]} />
<silkscreenpath route={[{"x":-0.9261856000000108,"y":0.7011924000000107},{"x":-0.9261856000000108,"y":0.4301490000000001}]} />
<silkscreenpath route={[{"x":-0.9261856000000108,"y":0.7011924000000107},{"x":0.926210999999995,"y":0.7011924000000107}]} />
<silkscreenpath route={[{"x":-0.926084000000003,"y":-0.7012940000000043},{"x":0.9263380000000012,"y":-0.7012940000000043}]} />
<silkscreenpath route={[{"x":0.42141140000001087,"y":0.7011924000000107},{"x":0.42141140000001087,"y":-0.7011923999999965}]} />
<silkscreentext text="{NAME}" pcbX="0.0127mm" pcbY="1.7874mm" anchorAlignment="center" fontSize="1mm" />
<fabricationnotepath route={[{"x":-1.113993199999996,"y":-0.08300719999999728},{"x":-1.113993199999996,"y":0.06700519999999699},{"x":-1.113993199999996,"y":0.06700519999999699},{"x":-0.5139944000000014,"y":0.06700519999999699},{"x":-0.5139944000000014,"y":0.06700519999999699},{"x":-0.5139944000000014,"y":-0.08300719999999728},{"x":-1.113993199999996,"y":-0.08300719999999728}]} strokeWidth="0.254mm" />
<fabricationnotepath route={[{"x":1.3159994000000097,"y":-0.07500619999999003},{"x":1.3159994000000097,"y":0.07500620000000424},{"x":1.3159994000000097,"y":0.07500620000000424},{"x":0.716000600000001,"y":0.07500620000000424},{"x":0.716000600000001,"y":0.07500620000000424},{"x":0.716000600000001,"y":-0.07500619999999003},{"x":1.3159994000000097,"y":-0.07500619999999003}]} strokeWidth="0.254mm" />
<fabricationnotepath route={[{"x":-0.8889999999999958,"y":-0.5079999999999956},{"x":-0.8889999999999958,"y":0.4919980000000095},{"x":-0.8889999999999958,"y":0.4919980000000095},{"x":-0.7389876000000015,"y":0.4919980000000095},{"x":-0.7389876000000015,"y":0.4919980000000095},{"x":-0.7389876000000015,"y":-0.5079999999999956},{"x":-0.8889999999999958,"y":-0.5079999999999956}]} strokeWidth="0.254mm" />
<courtyardoutline outline={[{"x":-1.6724000000000103,"y":1.0374000000000052},{"x":1.6978000000000009,"y":1.0374000000000052},{"x":1.6978000000000009,"y":-1.0119999999999862},{"x":-1.6724000000000103,"y":-1.0119999999999862},{"x":-1.6724000000000103,"y":1.0374000000000052}]} />
      </footprint>}
      cadModel={{
        objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C7420331.obj?uuid=b0e9999aadcd493d83877471dcbb85ca",
        stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C7420331.step?uuid=b0e9999aadcd493d83877471dcbb85ca",
        pcbRotationOffset: 180,
        modelOriginPosition: { x: 0.000012699999999199463, y: 0, z: -0.5 },
      }}
      {...restProps}
    />
  )
}