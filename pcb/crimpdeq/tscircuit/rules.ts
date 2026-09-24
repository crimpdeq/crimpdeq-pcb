/** Effective Default netclass and board rules of the pinned KiCad project. */
export const routingRules = {
 minTraceWidth: 0.2,
 minViaHoleDiameter: 0.3,
 minViaPadDiameter: 0.5,
 minViaHoleEdgeToViaHoleEdgeClearance: 0.25,
 minPlatedHoleDrillEdgeToDrillEdgeClearance: 0.25,
 minTraceToPadEdgeClearance: 0.2,
 minPadEdgeToPadEdgeClearance: 0.2,
 minViaEdgeToPadEdgeClearance: 0.2,
 minBoardEdgeClearance: 0.5,
} as const
/** These source rules have no equivalent board prop in the pinned core.
 * They remain release checks; they are not waived by successful TS compilation. */
export const additionalRules = {
 minAnnularRing: 0.1,
 minHoleToCopperClearance: 0.25,
 connectorInternalHoleToCopperClearance: { reference: "J2", clearance: 0.15 },
 minSolderMaskToCopperClearance: 0.005,
 minResolvedThermalSpokes: 2,
 minSilkClearance: 0.2,
 minTextHeight: 0.8,
 minTextThickness: 0.08,
 maximumGeometryError: 0.005,
 nominalViaPadDiameter: 0.6,
 nominalViaHoleDiameter: 0.3,
 differentialTraceWidth: 0.2,
 differentialGap: 0.25,
 differentialViaGap: 0.25,
} as const
