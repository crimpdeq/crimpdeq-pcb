#!/usr/bin/env python3
"""Apply deterministic local cleanup after importing the autorouter session."""

import sys

import pcbnew

from common import ensure_distinct_paths, validate_frozen_design


def fm(value):
    return pcbnew.FromMM(value)


def move_footprint_with_attached_track_ends(board, reference, dx_mm, dy_mm):
    footprint = board.FindFootprintByReference(reference)
    if footprint is None:
        raise ValueError(f"footprint {reference} not found")

    def key(position):
        return (position.x, position.y)

    old_pad_positions = {key(pad.GetPosition()): pad.GetNetCode() for pad in footprint.Pads()}
    delta = pcbnew.VECTOR2I(fm(dx_mm), fm(dy_mm))
    footprint.SetPosition(footprint.GetPosition() + delta)

    moved_connections = 0
    connected_pad_positions = set()
    for track in board.GetTracks():
        if isinstance(track, pcbnew.PCB_VIA):
            position = track.GetPosition()
            position_key = key(position)
            if old_pad_positions.get(position_key) == track.GetNetCode():
                connected_pad_positions.add(position_key)
                track.SetPosition(position + delta)
                moved_connections += 1
            continue
        start = track.GetStart()
        end = track.GetEnd()
        start_key = key(start)
        end_key = key(end)
        if old_pad_positions.get(start_key) == track.GetNetCode():
            connected_pad_positions.add(start_key)
            track.SetStart(start + delta)
            moved_connections += 1
        if old_pad_positions.get(end_key) == track.GetNetCode():
            connected_pad_positions.add(end_key)
            track.SetEnd(end + delta)
            moved_connections += 1
    if moved_connections == 0:
        raise ValueError(f"no routed connections found at {reference} pad centers")
    missing_connections = set(old_pad_positions) - connected_pad_positions
    if missing_connections:
        raise ValueError(
            f"not every {reference} pad had a routed center endpoint: {missing_connections}"
        )


def move_via_with_attached_track_ends(board, net_name, x_mm, y_mm, dx_mm, dy_mm):
    candidates = [
        track for track in board.GetTracks()
        if isinstance(track, pcbnew.PCB_VIA)
        and track.GetNetname() == net_name
        and abs(pcbnew.ToMM(track.GetPosition().x) - x_mm) < 0.02
        and abs(pcbnew.ToMM(track.GetPosition().y) - y_mm) < 0.02
    ]
    if len(candidates) != 1:
        raise ValueError(
            f"expected one {net_name} via near ({x_mm}, {y_mm}), found {len(candidates)}"
        )
    via = candidates[0]
    old_position = via.GetPosition()
    delta = pcbnew.VECTOR2I(fm(dx_mm), fm(dy_mm))
    new_position = old_position + delta
    via.SetPosition(new_position)
    moved_connections = 0
    for track in board.GetTracks():
        if track is via or isinstance(track, pcbnew.PCB_VIA):
            continue
        if track.GetNetCode() != via.GetNetCode():
            continue
        if track.GetStart() == old_position:
            track.SetStart(new_position)
            moved_connections += 1
        if track.GetEnd() == old_position:
            track.SetEnd(new_position)
            moved_connections += 1
    if moved_connections == 0:
        raise ValueError(f"selected {net_name} via has no attached track endpoints")


def main():
    if len(sys.argv) != 3:
        raise SystemExit("usage: postroute_compact.py INPUT_BOARD OUTPUT_BOARD")
    ensure_distinct_paths(sys.argv[1], sys.argv[2])
    board = pcbnew.LoadBoard(sys.argv[1])
    validate_frozen_design(board, "post-route input")
    move_footprint_with_attached_track_ends(board, "C11", -0.13, -0.04)
    move_via_with_attached_track_ends(board, "IO7_SCL", 137.6718, 64.6474, -0.20, 0.0)
    validate_frozen_design(board, "post-route output")
    pcbnew.SaveBoard(sys.argv[2], board)
    print(f"saved {sys.argv[2]}")


if __name__ == "__main__":
    main()
