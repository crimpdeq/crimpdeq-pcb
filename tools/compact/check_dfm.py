#!/usr/bin/env python3
"""Check compact-board silk clearances and via tenting."""

import math
import sys

import pcbnew


FUNCTIONAL_LABELS = {"A-", "A+", "B+", "SW", "E+", "E-"}
MIN_SILK_CLEARANCE_MM = 0.20
MIN_TEXT_HEIGHT_MM = 0.80
MIN_COPPER_CLEARANCE_MM = 0.20
MIN_JLC_THT_TO_PAD_CLEARANCE_MM = 2.03

# Pair-level records mapped from JLCDFM's `via2pad` category. JLC names every
# 1.50 mm cable PTH `r59.0551`, so pad identity comes from the measurement
# coordinates rather than the aperture name. Include J2.S4 explicitly: KiCad
# classifies it as PTH, while JLC includes it in the same analysis category.
JLC_THT_TO_PAD_PAIRS = (
    ("front", "J4", "1", "R8", "1"),
    ("front", "J4", "1", "R8", "2"),
    ("front", "J4", "2", "R7", "1"),
    ("front", "J4", "2", "R7", "2"),
    ("front", "J4", "2", "J2", "S2"),
    ("back", "J4", "2", "J2", "S2"),
    ("front", "J3", "2", "R1", "2"),
    ("front", "J3", "2", "C18", "2"),
    ("front", "J4", "4", "J2", "S4"),
    ("front", "J4", "4", "U5", "8"),
    ("back", "J4", "4", "J2", "S4"),
    ("back", "J4", "4", "Q2", "3"),
    ("back", "J3", "2", "R13", "1"),
    ("back", "J3", "2", "R13", "2"),
)


def mm(value):
    return value / 1_000_000


def shape_distance_mm(first, second):
    first_point = pcbnew.VECTOR2I()
    second_point = pcbnew.VECTOR2I()
    first.NearestPoints(second, first_point, second_point)
    return math.hypot(
        first_point.x - second_point.x,
        first_point.y - second_point.y,
    ) / 1_000_000


def functional_texts(board):
    for footprint in board.GetFootprints():
        for item in footprint.GraphicalItems():
            if (
                isinstance(item, pcbnew.PCB_TEXT)
                and item.GetLayer() == pcbnew.F_SilkS
                and item.IsVisible()
                and item.GetText() in FUNCTIONAL_LABELS
            ):
                yield item


def find_pad(footprints, reference, number):
    matches = [
        pad for pad in footprints[reference].Pads() if pad.GetNumber() == number
    ]
    if len(matches) != 1:
        raise ValueError(f"expected one pad {reference}.{number}, found {len(matches)}")
    return matches[0]


def main():
    if len(sys.argv) != 2:
        raise SystemExit("usage: check_dfm.py BOARD")

    board = pcbnew.LoadBoard(sys.argv[1])
    footprints = {
        footprint.GetReference(): footprint for footprint in board.GetFootprints()
    }
    pads = [
        (footprint.GetReference(), pad)
        for footprint in board.GetFootprints()
        for pad in footprint.Pads()
        if pad.IsOnLayer(pcbnew.F_Cu)
    ]
    drilled_holes = [
        (f"{footprint.GetReference()}.{pad.GetNumber()}", pad.GetEffectiveHoleShape())
        for footprint in board.GetFootprints()
        for pad in footprint.Pads()
        if pad.HasHole()
    ]
    vias = [track for track in board.GetTracks() if isinstance(track, pcbnew.PCB_VIA)]
    drilled_holes.extend(
        (f"via:{via.GetNetname()}", via.GetEffectiveHoleShape()) for via in vias
    )

    labels = list(functional_texts(board))
    found = {label.GetText() for label in labels}
    errors = []
    if found != FUNCTIONAL_LABELS or len(labels) != len(FUNCTIONAL_LABELS):
        errors.append(
            f"functional labels mismatch: expected {sorted(FUNCTIONAL_LABELS)}, "
            f"found {sorted(found)} ({len(labels)} items)"
        )

    unexpected_silk = []
    for footprint in board.GetFootprints():
        for field in footprint.GetFields():
            if (
                field.GetLayer() in {pcbnew.F_SilkS, pcbnew.B_SilkS}
                and field.IsVisible()
            ):
                unexpected_silk.append(f"{footprint.GetReference()} field {field.GetName()}")
        for item in footprint.GraphicalItems():
            if item.GetLayer() not in {pcbnew.F_SilkS, pcbnew.B_SilkS}:
                continue
            if (
                isinstance(item, pcbnew.PCB_TEXT)
                and item.IsVisible()
                and item.GetText() in FUNCTIONAL_LABELS
            ):
                continue
            unexpected_silk.append(f"{footprint.GetReference()} {item.GetClass()}")
    for item in board.GetDrawings():
        if item.GetLayer() in {pcbnew.F_SilkS, pcbnew.B_SilkS}:
            unexpected_silk.append(f"board {item.GetClass()}")
    if unexpected_silk:
        errors.append(
            f"production silkscreen contains {len(unexpected_silk)} non-functional items: "
            + ", ".join(unexpected_silk[:10])
        )

    for label in sorted(labels, key=lambda item: item.GetText()):
        text_shape = label.GetEffectiveShape(pcbnew.F_SilkS)
        nearest_pad = min(
            (
                shape_distance_mm(text_shape, pad.GetEffectiveShape(pcbnew.F_Cu)),
                f"{reference}.{pad.GetNumber()}",
            )
            for reference, pad in pads
        )
        nearest_hole = min(
            (shape_distance_mm(text_shape, shape), name)
            for name, shape in drilled_holes
        )
        height = mm(label.GetTextHeight())
        print(
            f"{label.GetText():>2}: height={height:.2f} mm, "
            f"pad={nearest_pad[0]:.3f} mm ({nearest_pad[1]}), "
            f"hole={nearest_hole[0]:.3f} mm ({nearest_hole[1]})"
        )
        if height + 1e-6 < MIN_TEXT_HEIGHT_MM:
            errors.append(f"{label.GetText()} text height is {height:.3f} mm")
        if nearest_pad[0] + 1e-6 < MIN_SILK_CLEARANCE_MM:
            errors.append(
                f"{label.GetText()} is {nearest_pad[0]:.3f} mm from {nearest_pad[1]}"
            )
        if nearest_hole[0] + 1e-6 < MIN_SILK_CLEARANCE_MM:
            errors.append(
                f"{label.GetText()} is {nearest_hole[0]:.3f} mm from {nearest_hole[1]}"
            )

    untented = [
        via
        for via in vias
        if not via.IsTented(pcbnew.F_Mask) or not via.IsTented(pcbnew.B_Mask)
    ]
    print(f"vias: {len(vias)} total, {len(vias) - len(untented)} tented on both faces")
    if untented:
        errors.append(f"{len(untented)} vias are not tented on both faces")

    cable_pads = [
        (footprint.GetReference(), pad)
        for footprint in board.GetFootprints()
        if footprint.GetReference() in {"J3", "J4"}
        for pad in footprint.Pads()
    ]
    print("cable-pad to SMD copper clearances:")
    for layer, layer_name in ((pcbnew.F_Cu, "front"), (pcbnew.B_Cu, "back")):
        smd_pads = [
            (footprint.GetReference(), pad)
            for footprint in board.GetFootprints()
            for pad in footprint.Pads()
            if pad.GetAttribute() != pcbnew.PAD_ATTRIB_PTH and pad.IsOnLayer(layer)
        ]
        for reference, cable_pad in cable_pads:
            nearest = min(
                (
                    shape_distance_mm(
                        cable_pad.GetEffectiveShape(layer),
                        smd_pad.GetEffectiveShape(layer),
                    ),
                    f"{smd_reference}.{smd_pad.GetNumber()}",
                )
                for smd_reference, smd_pad in smd_pads
            )
            print(
                f"  {layer_name} {reference}.{cable_pad.GetNumber()}: "
                f"{nearest[0]:.3f} mm ({nearest[1]})"
            )
            if nearest[0] + 1e-6 < MIN_COPPER_CLEARANCE_MM:
                errors.append(
                    f"{layer_name} {reference}.{cable_pad.GetNumber()} is "
                    f"{nearest[0]:.3f} mm from {nearest[1]}"
                )

    layers = {"front": pcbnew.F_Cu, "back": pcbnew.B_Cu}
    print("JLCDFM mapped cable-PTH to pad clearances:")
    for layer_name, cable_ref, cable_num, other_ref, other_num in JLC_THT_TO_PAD_PAIRS:
        layer = layers[layer_name]
        cable_pad = find_pad(footprints, cable_ref, cable_num)
        other_pad = find_pad(footprints, other_ref, other_num)
        clearance = shape_distance_mm(
            cable_pad.GetEffectiveShape(layer), other_pad.GetEffectiveShape(layer)
        )
        pair = f"{layer_name} {cable_ref}.{cable_num} to {other_ref}.{other_num}"
        print(f"  {pair}: {clearance:.3f} mm")
        if clearance + 1e-6 < MIN_JLC_THT_TO_PAD_CLEARANCE_MM:
            errors.append(
                f"{pair} is {clearance:.3f} mm; "
                f"JLC danger threshold is {MIN_JLC_THT_TO_PAD_CLEARANCE_MM:.2f} mm"
            )

    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        raise SystemExit(1)
    print("compact DFM audit passed")


if __name__ == "__main__":
    main()
