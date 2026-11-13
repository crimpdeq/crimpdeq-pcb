import { Fragment } from "react"
import type { ConnectorProps } from "@tscircuit/props"

type SilkLayer = "top" | "bottom"
type SilkOffsets = Partial<Record<SilkLayer, [number, number]>>
type WirePad = { label: string; silk: string; silkOffsets?: SilkOffsets }

/**
 * Vertical column of plated wire-solder pads, pin1 at the top. Each pad gets a
 * silkscreen label on every layer in `silk.offsets`, at that offset [x, y] from
 * the pad (a pad's `silkOffsets` override it). Labels run along the column, where the pad pitch leaves more room
 * than the gap beside the pads. Bare pads, so they are excluded from assembly.
 */
export const WirePads = ({
  pads,
  pitch = 2.2,
  silk,
  ...props
}: Omit<ConnectorProps, "pinLabels" | "footprint"> & {
  pads: WirePad[]
  pitch?: number
  silk: { fontSize: number; offsets: SilkOffsets }
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
          {pads.flatMap((pad, i) =>
            Object.entries({ ...silk.offsets, ...pad.silkOffsets }).map(([layer, [dx, dy]]) => (
              <Fragment key={`${pad.label}-${layer}`}>
                <silkscreentext
                  text={pad.silk}
                  layer={layer as SilkLayer}
                  pcbX={dx}
                  pcbY={top - i * pitch + dy}
                  pcbRotation={90}
                  anchorAlignment="center"
                  fontSize={silk.fontSize}
                  // Printed even where the board hides silkscreen text
                  pcbSx={{ "& silkscreentext": { visibility: "visible" } }}
                />
              </Fragment>
            )),
          )}
        </footprint>
      }
    />
  )
}
