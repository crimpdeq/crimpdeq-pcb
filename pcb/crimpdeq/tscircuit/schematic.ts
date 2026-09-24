/** Schematic-only placement. Coordinates never feed the physical PCB model. */
type LocatedPart = readonly [reference: string, x: number, y: number];
interface FunctionalSection {
	name: string;
	displayName: string;
	origin: readonly [x: number, y: number];
	parts: readonly LocatedPart[];
}

export const schematicSections = [
	{
		name: "controller",
		displayName: "ESP32-C3 and reset",
		origin: [0, 0],
		parts: [
			["U1", 0, 0],
			["C1", -9, -9],
			["C2", -3, -9],
			["C3", 3, -9],
			["R1", 9, -9],
		],
	},
	{
		name: "usb",
		displayName: "USB-C and ESD protection",
		origin: [38, 0],
		parts: [
			["J2", 0, 0],
			["D7", -8, -6],
			["D10", 0, -6],
			["D9", 8, -6],
			["R19", -8, -10],
			["R18", 0, -10],
			["R17", 8, -10],
			["D8", 0, -14],
		],
	},
	{
		name: "adc",
		displayName: "ADS1220 and SPI termination",
		origin: [76, 0],
		parts: [
			["U3", 0, 0],
			["C9", -8, -5],
			["C10", 0, -5],
			["C11", 8, -5],
			["C19", -8, -9],
			["R23", 0, -9],
			["R24", 8, -9],
			["R25", -4, -13],
			["R26", 4, -13],
		],
	},
	{
		name: "charger",
		displayName: "Battery charging",
		origin: [0, -27],
		parts: [
			["U2", 0, 0],
			["C5", -8, -5],
			["C6", 0, -5],
			["R2", 8, -5],
			["D1", -4, -9],
			["R3", 4, -9],
		],
	},
	{
		name: "power_path",
		displayName: "Battery switch and load sharing",
		origin: [38, -27],
		parts: [
			["Q2", 0, 0],
			["D2", -6, -5],
			["R9", 6, -5],
			["J5", -9, -10],
			["J7", -3, -10],
			["J6", 3, -10],
			["J8", 9, -10],
		],
	},
	{
		name: "bridge",
		displayName: "Load-cell cable and input filter",
		origin: [76, -27],
		parts: [
			["R7", -4, 0],
			["R8", 4, 0],
			["C12", 0, -4],
			["J9", -9, -8],
			["J10", -3, -8],
			["J11", 3, -8],
			["J12", 9, -8],
		],
	},
	{
		name: "regulator",
		displayName: "3.3 V buck regulator",
		origin: [0, -51],
		parts: [
			["U6", 0, 0],
			["L1", 8, 0],
			["C15", -8, -5],
			["C17", 0, -5],
			["C16", 8, -5],
			["R14", -8, -9],
			["R15", 0, -9],
			["R16", 8, -9],
			["C4", -4, -13],
			["D3", 4, -13],
		],
	},
	{
		name: "gauge",
		displayName: "Battery fuel gauge and I2C",
		origin: [38, -51],
		parts: [
			["U5", 0, 0],
			["C18", -8, -5],
			["R20", 0, -5],
			["R21", 8, -5],
			["R22", 0, -9],
		],
	},
	{
		name: "indicator",
		displayName: "RGB status indicator",
		origin: [76, -51],
		parts: [
			["D4", 0, 0],
			["R13", 0, -5],
		],
	},
] satisfies readonly FunctionalSection[];

export interface SchematicPlacement {
	schSectionName: string;
	schX: number;
	schY: number;
}

const placementByReference = new Map<string, SchematicPlacement>();
for (const section of schematicSections) {
	for (const [reference, x, y] of section.parts) {
		if (placementByReference.has(reference))
			throw new Error(`Duplicate schematic placement: ${reference}`);
		placementByReference.set(reference, {
			schSectionName: section.name,
			schX: section.origin[0] + x,
			schY: section.origin[1] + y,
		});
	}
}

export function schematicPlacement(reference: string): SchematicPlacement {
	const placement = placementByReference.get(reference);
	if (!placement) throw new Error(`Missing schematic placement: ${reference}`);
	return placement;
}

// Schematic-only presentation: supply above, ground below; no PCB rotation.
const rotations: Record<string, number> = {
	C5: 180,
	R1: -90,
	R2: 90,
	R9: -90,
	R14: -90,
	R15: -90,
	R16: -90,
	R17: -90,
	R18: -90,
	R19: -90,
	R20: 90,
	R21: 90,
	R22: 90,
};

// Compact boxes sized to the visible pin labels, retaining a small inner gap.
const widths: Record<string, number> = {
	D1: 1.74,
	D2: 1.74,
	D3: 1.93,
	D4: 2.22,
	D7: 1.93,
	D8: 1.74,
	D9: 1.93,
	D10: 1.93,
	J2: 3.26,
	Q2: 1.74,
	U1: 5.26,
	U2: 2.31,
	U3: 3.74,
	U5: 2.69,
	U6: 2.03,
};

export function schematicStyle(reference: string) {
	return {
		schRotation: rotations[reference] ?? 0,
		schWidth: widths[reference],
	};
}
