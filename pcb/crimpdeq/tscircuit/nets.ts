import { parts } from './parts'

/** Derive the net membership once from physical pin assignments in parts.ts. */
export const nets: Record<string,string[]> = {}
for (const part of parts) {
  for (const pin of part.pins) {
    if (pin.net !== null) (nets[pin.net] ??= []).push(`${part.ref}.${pin.number}`)
  }
}
