#!/usr/bin/env python3
"""Create the unrouted 25 x 26 mm compact placement and Specctra DSN."""

import re
import sys

import pcbnew

from common import ensure_distinct_paths, validate_frozen_design


X0 = 127.45
Y0 = 52.40
X1 = 152.45
Y1 = 78.40

ANTENNA_KEEPOUT = (134.80, Y0, 148.70, 53.40)
ANALOG_VIA_KEEPOUT = (128.00, 70.80, 137.40, 77.90)
EDGE_KEEPOUTS = (
    (X0, Y0, X0 + 0.50, Y1),
    (X1 - 0.50, Y0, X1, Y1),
    (X0, Y0, X1, Y0 + 0.50),
    (X0, Y1 - 0.50, X1, Y1),
)


PLACEMENTS = {
    # RF and LED remain together on the back at the antenna edge.
    "U1": (141.80, 55.50, 180, "B"),
    "D4": (130.50, 56.50, 90, "B"),
    # Front power section.
    "U6": (133.20, 61.00, 270, "F"),
    "C17": (141.00, 56.00, 0, "F"),
    "R14": (140.20, 64.00, 0, "F"),
    "R15": (144.00, 56.80, 0, "F"),
    "R16": (145.80, 56.00, 90, "F"),
    "L1": (138.00, 61.00, 0, "F"),
    "C16": (142.50, 61.00, 0, "F"),
    # Rotate the HX711 so its analog inputs face the bottom-left cable pads.
    "U3": (133.50, 68.50, 0, "F"),
    "C11": (138.65, 65.50, 90, "F"),
    "C12": (131.25, 74.50, 180, "F"),
    "R7": (135.80, 74.50, 0, "F"),
    "R8": (128.80, 73.50, 270, "F"),
    # Edge connectors.
    "J2": (143.50, 76.70, 0, "F"),
    "J3": (151.20, 55.75, 0, "F"),
    "J4": (140.00, 70.00, 0, "F"),
    # Move the USB/protection and battery components into the shorter body.
    "D7": (140.50, 68.20, 0, "F"),
    "D9": (146.00, 65.50, 0, "F"),
    "D10": (143.50, 68.20, 0, "F"),
    "D8": (149.80, 64.00, 90, "F"),
    "Q2": (150.50, 68.09, -90, "B"),
    "D2": (150.90, 63.70, 90, "B"),
    "C5": (140.00, 68.50, 90, "B"),
    "C6": (145.20, 68.60, 90, "B"),
    "C9": (137.80, 66.00, 0, "B"),
    "C15": (147.00, 60.20, 90, "F"),
    "R17": (143.50, 65.80, 0, "B"),
    "R18": (146.00, 66.00, 0, "B"),
    "R19": (141.00, 66.00, 0, "B"),
    "R9": (145.50, 63.50, 0, "F"),
    "C18": (151.00, 60.60, 90, "F"),
    "U5": (149.70, 68.20, 0, "F"),
    "D1": (134.80, 66.00, 90, "B"),
    "Q1": (130.50, 69.50, 0, "B"),
    "R2": (128.90, 61.10, 0, "B"),
    "R3": (132.00, 65.30, 0, "B"),
    "C3": (128.80, 63.00, 90, "B"),
    "R1": (149.10, 59.75, 0, "F"),
    "R13": (151.00, 60.10, 0, "B"),
}


def fm(value):
    return pcbnew.FromMM(value)


def point(x, y):
    return pcbnew.VECTOR2I(fm(x), fm(y))


def set_side(footprint, side):
    target = pcbnew.F_Cu if side == "F" else pcbnew.B_Cu
    if footprint.GetLayer() != target:
        footprint.Flip(footprint.GetPosition(), True)


def set_edge_outline(board):
    for drawing in board.GetDrawings():
        if drawing.GetLayer() == pcbnew.Edge_Cuts:
            board.RemoveNative(drawing)
    outline = [(X0, Y0), (X1, Y0), (X1, Y1), (X0, Y1)]
    for start, end in zip(outline, outline[1:] + outline[:1]):
        line = pcbnew.PCB_SHAPE(board)
        line.SetShape(pcbnew.SHAPE_T_SEGMENT)
        line.SetLayer(pcbnew.Edge_Cuts)
        line.SetWidth(fm(0.05))
        line.SetStart(point(*start))
        line.SetEnd(point(*end))
        board.Add(line)


def compact_j4(footprint):
    positions = {
        "1": (129.50, 77.15),  # A-
        "2": (133.00, 77.15),  # A+
        "3": (151.20, 75.00),  # B+
        "4": (151.20, 72.60),  # SW
    }
    for pad in footprint.Pads():
        pad.SetPosition(point(*positions[pad.GetNumber()]))


def compact_j3(footprint):
    positions = {
        "1": (151.20, 54.50),  # E+
        "2": (151.20, 57.00),  # E-
    }
    for pad in footprint.Pads():
        pad.SetPosition(point(*positions[pad.GetNumber()]))


def inject_dsn_constraints(path):
    with open(path, encoding="utf-8") as source:
        data = source.read()
    data, layer_changes = re.subn(
        r"(\(layer In1\.Cu\s*\(type )signal(\))", r"\1power\2", data
    )
    if layer_changes != 1:
        raise ValueError(f"expected one In1.Cu layer declaration, changed {layer_changes}")

    def polygon(kind, layer, box):
        x0, y0, x1, y1 = box
        um = lambda value: int(round(value * 1000))
        coords = [um(x0), -um(y0), um(x1), -um(y0), um(x1), -um(y1), um(x0), -um(y1), um(x0), -um(y0)]
        return f'      ({kind} "" (polygon {layer} 0  {" ".join(str(v) for v in coords)}))\n'

    constraints = ""
    layers = ["F.Cu", "In1.Cu", "In2.Cu", "B.Cu"]
    for layer in layers:
        constraints += polygon("keepout", layer, ANTENNA_KEEPOUT)
        constraints += polygon("via_keepout", layer, ANALOG_VIA_KEEPOUT)
        for edge_keepout in EDGE_KEEPOUTS:
            constraints += polygon("keepout", layer, edge_keepout)
    marker = '    (via "Via'
    if data.count(marker) != 1:
        raise ValueError(f"expected one DSN via marker, found {data.count(marker)}")
    data = data.replace(marker, constraints + marker, 1)

    # Keep the USB data nets in their own routing class so the autorouter treats
    # them as a pair and avoids the large length mismatch of an unconstrained run.
    class_start = data.index("    (class kicad_default")
    wiring_start = data.index("  (wiring", class_start)
    classes = data[class_start:wiring_start]
    if classes.count(" USB_D+") != 1 or classes.count(' "USB_D-"') != 1:
        raise ValueError("USB_D+ and USB_D- must each occur once in the default DSN class")
    classes = classes.replace(" USB_D+", "").replace(' "USB_D-"', "")
    usb_class = '''    (class usb_matched USB_D+ "USB_D-"
      (circuit
        (use_via "Via[0-3]_600:300_um")
        (length 20000 24000)
      )
      (rule
        (width 200)
        (clearance 200)
      )
    )
'''
    data = data[:class_start] + classes + usb_class + data[wiring_start:]
    with open(path, "w", encoding="utf-8") as output:
        output.write(data)


def main():
    if len(sys.argv) != 4:
        raise SystemExit("usage: prepare_compact.py INPUT_BOARD OUTPUT_BOARD OUTPUT_DSN")
    input_board, output_board, output_dsn = sys.argv[1:]
    ensure_distinct_paths(input_board, output_board)
    board = pcbnew.LoadBoard(input_board)
    validate_frozen_design(board, "compact input")

    for track in list(board.GetTracks()):
        board.RemoveNative(track)
    for zone in list(board.Zones()):
        board.RemoveNative(zone)

    set_edge_outline(board)
    footprints = {fp.GetReference(): fp for fp in board.GetFootprints()}
    for reference, (x, y, rotation, side) in PLACEMENTS.items():
        footprint = footprints[reference]
        set_side(footprint, side)
        footprint.SetPosition(point(x, y))
        footprint.SetOrientationDegrees(rotation)
    compact_j4(footprints["J4"])
    compact_j3(footprints["J3"])
    validate_frozen_design(board, "compact placed board")

    board.BuildListOfNets()
    pcbnew.SaveBoard(output_board, board)
    if not pcbnew.ExportSpecctraDSN(board, output_dsn):
        raise SystemExit("Specctra DSN export failed")
    inject_dsn_constraints(output_dsn)
    print(f"saved {output_board}")
    print(f"saved {output_dsn}")
    print(f"outline {X1 - X0:.2f} x {Y1 - Y0:.2f} mm")


if __name__ == "__main__":
    main()
