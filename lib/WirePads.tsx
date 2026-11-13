import { Fragment } from "react"
import type { ConnectorProps } from "@tscircuit/props"

type WirePad = { label: string; silk: string }

/**
 * Vertical column of plated wire-solder pads, pin1 at the top. Each pad gets a
 * silkscreen label on `silkLayers` (both sides by default), offset horizontally
 * by `silkOffsetX`. Bare pads, so they are excluded from assembly.
 */
export const WirePads = ({
  pads,
  pitch = 2.2,
  silkOffsetX = 1.6,
  silkLayers = ["top", "bottom"],
  ...props
}: Omit<ConnectorProps, "pinLabels" | "footprint"> & {
  pads: WirePad[]
  pitch?: number
  silkOffsetX?: number
  silkLayers?: ("top" | "bottom")[]
}) => {
  const top = ((pads.length - 1) * pitch) / 2
  const pinLabels = Object.fromEntries(
    pads.map((pad, i) => [`pin${i + 1}`, pad.label]),
  )

  return (
    <connector
      doNotPlace
      {...props}
      pinLabels={pinLabels}
      footprint={
        <footprint insertionDirection="from_above">
          {pads.map((pad, i) => (
            <Fragment key={pad.label}>
              <platedhole
                portHints={[`pin${i + 1}`]}
                shape="circle"
                holeDiameter="0.8mm"
                outerDiameter="1.5mm"
                pcbX={0}
                pcbY={top - i * pitch}
              />
            </Fragment>
          ))}
          {/* 0.1 mm around the pads: J3 leaves room for FB1/FB2 next to J2 */}
          <courtyardrect
            pcbX={0}
            pcbY={0}
            width={1.7}
            height={(pads.length - 1) * pitch + 1.7}
          />
          {pads.map((pad, i) => (
            <Fragment key={`${pad.label}-silk`}>
              <silkscreentext
                text={pad.silk}
                layers={silkLayers}
                pcbX={silkOffsetX}
                pcbY={top - i * pitch}
                anchorAlignment="center"
                fontSize="0.7mm"
              />
            </Fragment>
          ))}
        </footprint>
      }
    />
  )
}
