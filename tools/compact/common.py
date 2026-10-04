"""Frozen-design validation shared by compact-board reproduction scripts."""

from pathlib import Path

import pcbnew


EXPECTED_REFS = frozenset(
    "C1 C2 C3 C4 C5 C6 C9 C10 C11 C12 C15 C16 C17 C18 "
    "D1 D2 D3 D4 D7 D8 D9 D10 J2 J3 J4 L1 Q1 Q2 "
    "R1 R2 R3 R5 R6 R7 R8 R9 R13 R14 R15 R16 R17 R18 R19 "
    "U1 U2 U3 U5 U6".split()
)
EXPECTED_NAMED_PADS = 197
EXPECTED_PHYSICAL_PADS = 210
REFERENCE_BOARD = (
    Path(__file__).resolve().parents[2]
    / "pcb/designs/crimpdeq-v2/crimpdeq.kicad_pcb"
)


def pad_net_map(board):
    mapping = {}
    physical_count = 0
    for footprint in board.GetFootprints():
        reference = footprint.GetReference()
        for pad in footprint.Pads():
            physical_count += 1
            key = (reference, pad.GetPadName())
            net_name = pad.GetNetname()
            if key in mapping and mapping[key] != net_name:
                raise ValueError(
                    f"duplicate pad identity {reference}.{pad.GetPadName()} has conflicting nets"
                )
            mapping[key] = net_name
    return mapping, physical_count


def validate_frozen_design(board, label):
    references = {footprint.GetReference() for footprint in board.GetFootprints()}
    if references != EXPECTED_REFS:
        missing = sorted(EXPECTED_REFS - references)
        extra = sorted(references - EXPECTED_REFS)
        raise ValueError(f"{label}: unexpected footprints; missing={missing}, extra={extra}")

    mapping, physical_count = pad_net_map(board)
    if len(mapping) != EXPECTED_NAMED_PADS or physical_count != EXPECTED_PHYSICAL_PADS:
        raise ValueError(
            f"{label}: expected {EXPECTED_NAMED_PADS} named/{EXPECTED_PHYSICAL_PADS} "
            f"physical pads, found {len(mapping)}/{physical_count}"
        )

    reference = pcbnew.LoadBoard(str(REFERENCE_BOARD))
    reference_mapping, reference_physical_count = pad_net_map(reference)
    if reference_physical_count != EXPECTED_PHYSICAL_PADS or mapping != reference_mapping:
        missing = sorted(reference_mapping.keys() - mapping.keys())
        extra = sorted(mapping.keys() - reference_mapping.keys())
        changed = sorted(
            (key, reference_mapping[key], mapping[key])
            for key in reference_mapping.keys() & mapping.keys()
            if reference_mapping[key] != mapping[key]
        )
        raise ValueError(
            f"{label}: electrical baseline mismatch; missing={missing[:5]}, "
            f"extra={extra[:5]}, changed={changed[:5]}"
        )


def ensure_distinct_paths(input_path, output_path):
    if Path(input_path).resolve() == Path(output_path).resolve():
        raise ValueError("input and output board paths must be different")
