import type { Part, Point } from './types'

/** Millimetre coordinate pairs keep saved contours readable without object boilerplate. */
export function points(rows: readonly (readonly [x: number, y: number])[]): Point[] {
  return rows.map(([x,y]) => ({x,y}))
}

/** Local footprint coordinates to the board frame; rotation is counterclockwise. */
export function transform(part: Pick<Part,'x'|'y'|'rotation'>, point: Point): Point {
  const angle = part.rotation * Math.PI / 180
  return {
    x: part.x + point.x * Math.cos(angle) - point.y * Math.sin(angle),
    y: part.y + point.x * Math.sin(angle) + point.y * Math.cos(angle),
  }
}
