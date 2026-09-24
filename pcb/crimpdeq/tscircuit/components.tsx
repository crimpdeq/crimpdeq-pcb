import React from "react";
import type { PinAttributeMap } from "@tscircuit/props";
import { footprints } from "./footprints";
import { ExactFootprint } from "./Footprint";
import { schematicPlacement, schematicStyle } from "./schematic";
import type { Part, Pin } from "./types";

// Preserve the schematic's declared electrical roles without inventing a
// voltage, a firmware-selected GPIO mode, or an active-device simulation model.
function pinAttributes(pin: Pin): PinAttributeMap {
	const ground =
		pin.net === "GND" ||
		/^(?:GND|VSS|AVSS|DGND|AGND|SHELL_GND)$/.test(pin.label);
	switch (pin.electricalType) {
		case "input":
			return { isInput: true };
		case "output":
			return { isOutput: true };
		case "bidirectional":
			return { isBidirectional: true };
		case "tri_state":
			return { isOutput: true, canUseTriState: true, isUsingTriState: true };
		case "passive":
			return { isPassive: true };
		case "open_collector":
			return {
				isOutput: true,
				canUseOpenCollector: true,
				isUsingOpenCollector: true,
			};
		case "open_emitter":
			return {
				isOutput: true,
				canUseOpenEmitter: true,
				isUsingOpenEmitter: true,
			};
		case "power_in":
			return ground ? { requiresGround: true } : { requiresPower: true };
		case "power_out":
			return ground ? { providesGround: true } : { providesPower: true };
		case "no_connect":
			return { doNotConnect: true };
		// KiCad's free/unspecified pins remain unspecified so checks can report them.
		default:
			return {};
	}
}
export function NativePart({ part: p }: { part: Part }) {
	const pinLabels = Object.fromEntries(
		p.pins.map((pin) => [
			pin.key,
			[`${pin.label}_${pin.number}`.replace(/[^A-Za-z0-9_]/g, "_")],
		]),
	);
	const common = {
		name: p.ref,
		displayName: `${p.ref} ${p.value}`,
		manufacturerPartNumber: p.mpn || p.value,
		pinAttributes: Object.fromEntries(
			p.pins.map((pin) => [pin.key, pinAttributes(pin)]),
		),
		supplierPartNumbers: p.lcsc
			? { lcsc: [p.lcsc], jlcpcb: [p.lcsc] }
			: undefined,
		pcbX: p.x,
		pcbY: p.y,
		pcbRotation: p.rotation,
		layer: p.layer,
		doNotPlace: p.dnp,
		allowOffBoard: p.ref === "U1" || p.ref === "J2",
		...schematicPlacement(p.ref),
		...schematicStyle(p.ref),
		footprint: (
			<ExactFootprint
				definition={footprints[p.ref as keyof typeof footprints]}
			/>
		),
		pcbStyle: { silkscreenTextVisibility: "hidden" as const },
	};
	// Numbered pin identity is explicit even for asymmetric/alternate footprints.
	// IC/diode/transistor symbols use labelled boxes to avoid library polarity assumptions.
	if (p.ref.startsWith("R")) {
		const resistance = p.value.startsWith("22k1")
			? 22100
			: p.value.startsWith("5k1")
				? 5100
				: parseFloat(p.value) * (p.value.includes("k") ? 1000 : 1);
		return <resistor {...common} resistance={resistance} />;
	}
	if (p.ref.startsWith("C"))
		return (
			<capacitor
				{...common}
				schOrientation="vertical"
				capacitance={p.value.split(" ")[0]}
			/>
		);
	if (p.ref.startsWith("L")) return <inductor {...common} inductance="2.2uH" />;
	const symbol = {
		...common,
		pinLabels,
		pcbPinLabels: Object.fromEntries(
			p.pins.map((pin) => [pin.key, pin.number]),
		),
		noConnect: p.pins.filter((pin) => !pin.net).map((pin) => pin.key),
		// Match the native default 0.2-unit pin pitch without excess box padding.
		schHeight: Math.max(0.4, (Math.ceil(p.pins.length / 2) - 1) * 0.2),
	};
	if (p.ref.startsWith("D") && p.pins.length === 2) {
		const topPin = p.ref === "D1" ? 2 : 1;
		const bottomPin = p.ref === "D1" ? 1 : 2;
		return (
			<chip
				{...symbol}
				schRotation={0}
				schHeight={1.6}
				schPinArrangement={{
					topSide: { pins: [topPin], direction: "left-to-right" },
					bottomSide: { pins: [bottomPin], direction: "left-to-right" },
				}}
			/>
		);
	}
	// Keep the reviewed 16-pin USB footprint and every physical pin alias.
	// A standard connector footprint must not replace this board's geometry.
	if (p.ref === "J2") return <connector {...symbol} />;
	return <chip {...symbol} />;
}
