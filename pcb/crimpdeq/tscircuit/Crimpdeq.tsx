import React from "react";
import { parts } from "./parts";
import { nets } from "./nets";
import { board } from "./board";
import { routingRules } from "./rules";
import { NativePart } from "./components";
import { schematicSections } from "./schematic";

// Selector-safe aliases; build.ts restores the exact fabrication net names.
export const netAlias = (name: string) => `N${Object.keys(nets).indexOf(name)}`;

/** Native component/connection model with functional schematic sections.
 * buildCrimpdeq() preserves the reviewed multilayer routes, fills and stencil. */
export default function Crimpdeq() {
	return (
		<board
			name="Crimpdeq"
			width={board.width}
			height={board.height}
			thickness={board.thickness}
			layers={4}
			outline={board.outline}
			{...routingRules}
			routingDisabled
			automaticPoursEnabled={false}
			schTraceAutoLabelEnabled
			schMaxTraceDistance={2}
		>
			{schematicSections.map((section) => (
				<React.Fragment key={section.name}>
					<schematicsection
						name={section.name}
						displayName={section.displayName}
					/>
				</React.Fragment>
			))}
			{Object.keys(nets).map((name) => (
				<React.Fragment key={name}>
					<net name={netAlias(name)} />
				</React.Fragment>
			))}
			{parts.map((part) => (
				<NativePart key={part.ref} part={part} />
			))}
			{/* A connected native netlabel creates the pin-to-net source trace and its
        schematic label together. Do not duplicate it with another trace. */}
			{parts.flatMap((part) =>
				part.pins
					.filter((pin) => pin.net)
					.map((pin) => (
						<React.Fragment key={`${part.ref}.${pin.number}`}>
							<netlabel
								net={netAlias(pin.net!)}
								connectsTo={`.${part.ref} > .${pin.key}`}
							/>
						</React.Fragment>
					)),
			)}
		</board>
	);
}
