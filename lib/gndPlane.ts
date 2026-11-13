// Regions where an inner layer is a solid GND plane: the routers may not route
// other nets there (vias still pass). Rectangles only (scripts/handroute.ts
// uses their bounding boxes). Used by index.circuit.tsx (unbroken pours) and
// scripts/drc.ts (check).
type Point = { x: number; y: number }
const rect = (x0: number, y0: number, x1: number, y1: number): Point[] => [
  { x: x0, y: y0 },
  { x: x1, y: y0 },
  { x: x1, y: y1 },
  { x: x0, y: y1 },
]

export const GND_PLANE_REGIONS: Record<string, { layer: "inner1" | "inner2"; outline: Point[] }> = {
  // inner2 is the plane next to the bottom side, which carries the buck and the
  // ADS1220 front end. Reserving all of inner2 left the board unroutable, so the
  // rest of the layer still carries traces.
  // U6, L1, C15, C17 and the feedback divider
  buck: { layer: "inner2", outline: rect(0.4, 2.2, 8.1, 9.7) },
  // U3, its bypass capacitors and the load cell input filter
  adc: { layer: "inner2", outline: rect(-8.1, -5.6, -0.6, 1.6) },
  // Return planes of the USB pair (index.circuit.tsx): inner2 under its inner1
  // run, up from the ESD diodes and east to the vias below U1, and inner1 under
  // its top-side run to IO18/IO19
  usbFanout: { layer: "inner2", outline: rect(-1.1, -7.6, 2.2, -5.8) },
  usbColumn: { layer: "inner2", outline: rect(0.6, -5.8, 1.9, -3.6) },
  usbEast: { layer: "inner2", outline: rect(0.6, -3.6, 6.4, -1.9) },
  usbTop: { layer: "inner1", outline: rect(6.0, -2.0, 7.3, 2.4) },
}
