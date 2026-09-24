#!/usr/bin/env python3
"""Independently compare built Circuit JSON with the original KiCad PCB.

No generated migration manifest is trusted. Distances are millimetres. This is
an equivalence check, not native KiCad DRC or electrical qualification.
"""
import argparse
import collections
import json
import math
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
LAYERS = {"F.Cu": "top", "In1.Cu": "inner1", "In2.Cu": "inner2", "B.Cu": "bottom"}
TOL = 1e-6
CX, CY = 142.45, 67.4


def parse(text):
    stack, out = [], []
    for token in re.findall(r'"(?:\\.|[^"\\])*"|[()]|[^\s()]+', text):
        if token == "(":
            stack.append(out)
            out = []
        elif token == ")":
            parent = stack.pop()
            parent.append(out)
            out = parent
        else:
            out.append(json.loads(token) if token.startswith('"') else token)
    if stack or len(out) != 1:
        raise ValueError("Malformed KiCad S-expression")
    return out[0]


def nodes(obj, key):
    return [v for v in obj if isinstance(v, list) and v and v[0] == key]


def values(obj, key, default=None):
    return next(iter(nodes(obj, key)), [key, default])[1:]


def val(obj, key, default=None):
    return values(obj, key, default)[0]


def xy(obj, key="at"):
    return tuple(map(float, values(obj, key)[:2]))


def angle(obj):
    at = values(obj, "at")
    return float(at[2]) if len(at) > 2 else 0.0


def transform(point):
    return point[0] - CX, CY - point[1]


def rotate_kicad(point, degrees):
    a = math.radians(degrees)
    return (point[0] * math.cos(a) + point[1] * math.sin(a),
            -point[0] * math.sin(a) + point[1] * math.cos(a))


def pad_center(footprint, pad):
    x, y = rotate_kicad(xy(pad), angle(footprint))
    fx, fy = xy(footprint)
    return fx + x, fy + y


def close(a, b):
    try:
        return abs(float(a) - float(b)) <= TOL
    except (TypeError, ValueError):
        return False


def point_close(a, b):
    return len(a) == len(b) == 2 and all(close(x, y) for x, y in zip(a, b))


def point_of(obj):
    return obj.get("x"), obj.get("y")


def ring(points):
    """Canonical closed ring, invariant to starting vertex and winding."""
    pts = []
    for p in points:
        p = tuple(round(float(v), 6) for v in p)
        if not pts or p != pts[-1]:
            pts.append(p)
    if len(pts) > 1 and pts[0] == pts[-1]:
        pts.pop()
    if not pts:
        return ()
    def canonical(seq):
        smallest = min(seq)
        return min(tuple(seq[i:] + seq[:i]) for i, p in enumerate(seq) if p == smallest)
    return min(canonical(pts), canonical(list(reversed(pts))))


def cj_ring(obj):
    if obj.get("shape") == "polygon":
        return ring([point_of(p) for p in obj.get("points", [])])
    if obj.get("shape") == "outline":
        return ring([point_of(p) for p in obj.get("outline", [])])
    if obj.get("shape") == "rect":
        x, y = point_of(obj.get("center", {}))
        w, h = obj.get("width", 0) / 2, obj.get("height", 0) / 2
        return ring([(x-w, y-h), (x+w, y-h), (x+w, y+h), (x-w, y+h)])
    if obj.get("shape") == "brep":
        return ring([point_of(p) for p in obj.get("brep_shape", {}).get("outer_ring", {}).get("vertices", [])])
    return ()


class UnionFind:
    def __init__(self):
        self.parents = {}

    def find(self, key):
        self.parents.setdefault(key, key)
        if self.parents[key] != key:
            self.parents[key] = self.find(self.parents[key])
        return self.parents[key]

    def join(self, a, b):
        self.parents[self.find(a)] = self.find(b)


def verify(board, circuit, schematic=None):
    errors, checks = [], collections.Counter()
    def check(condition, message):
        checks["assertions"] += 1
        if not condition:
            errors.append(message)
    def number(actual, expected, context):
        check(close(actual, expected), f"{context}: expected {expected}, got {actual}")
    def position(actual, expected, context):
        check(point_close(actual, expected), f"{context}: expected {expected}, got {actual}")

    by_type = collections.defaultdict(list)
    ids = {}
    for e in circuit:
        by_type[e["type"]].append(e)
        key = e.get(e["type"] + "_id")
        if key:
            check(key not in ids, f"Duplicate Circuit JSON ID: {key}")
            ids[key] = e
    components = {e["source_component_id"]: e for e in by_type["source_component"]}
    pcb_components = {e["pcb_component_id"]: e for e in by_type["pcb_component"]}
    source_ports = {e["source_port_id"]: e for e in by_type["source_port"]}
    pcb_ports = {e["pcb_port_id"]: e for e in by_type["pcb_port"]}
    source_nets = {e["source_net_id"]: e for e in by_type["source_net"]}
    uf = UnionFind()
    for e in by_type["source_trace"]:
        members = [e["source_trace_id"]] + e.get("connected_source_port_ids", []) + e.get("connected_source_net_ids", [])
        for other in members[1:]:
            uf.join(members[0], other)
    names_by_root = collections.defaultdict(set)
    for key, e in source_nets.items():
        names_by_root[uf.find(key)].add(e.get("name"))
    def net_names(e):
        names = set()
        for field in ("source_net_id", "source_trace_id", "source_port_id"):
            if e.get(field):
                names.update(names_by_root[uf.find(e[field])])
        port = pcb_ports.get(e.get("pcb_port_id"), {})
        if port.get("source_port_id"):
            names.update(names_by_root[uf.find(port["source_port_id"])])
        return names
    def check_net(e, expected, label):
        actual = net_names(e)
        if not expected or expected.startswith("unconnected-"):
            check(not actual or actual == {expected}, f"{label}: intentionally unconnected pad is connected to {sorted(actual)}")
        else:
            check(actual == {expected}, f"{label}: expected net {expected}, got {sorted(actual)}")

    footprints = {next(p[2] for p in nodes(f, "property") if p[1] == "Reference"): f for f in nodes(board, "footprint")}
    check(collections.Counter(e.get("name") for e in components.values()) == collections.Counter(footprints.keys()), "Source component references differ from original PCB")
    check(len(pcb_components) == len(footprints), "PCB component count differs from original PCB")
    physical_types = ("pcb_smtpad", "pcb_plated_hole", "pcb_hole")
    geometries = [e for kind in physical_types for e in by_type[kind]]
    used = set()
    expected_counts = collections.Counter()
    expected_logical = {}

    for ref, f in footprints.items():
        pcs = [p for p in pcb_components.values() if components.get(p.get("source_component_id"), {}).get("name") == ref]
        check(len(pcs) == 1, f"{ref}: expected exactly one PCB component")
        if len(pcs) != 1:
            continue
        pc = pcs[0]
        position(point_of(pc.get("center", {})), transform(xy(f)), f"{ref} component center")
        check(pc.get("layer") == LAYERS[val(f, "layer")], f"{ref}: wrong component side")
        dnp_expected = ref in {f"J{i}" for i in range(5, 13)}
        check(bool(pc.get("do_not_place")) == dnp_expected, f"{ref}: DNP state differs")
        for index, p in enumerate(nodes(f, "pad")):
            layers = values(p, "layers")
            if p[2] == "np_thru_hole":
                kind = "pcb_hole"
            elif p[2] == "thru_hole":
                kind = "pcb_plated_hole"
            elif any(x in layers for x in ("*.Cu", *LAYERS)):
                kind = "pcb_smtpad"
            else:
                checks["paste_only_source_pads"] += 1
                continue
            expected_counts[kind] += 1
            label = f"{ref}.{p[1] or 'NPTH'}[{index}]"
            expected_pos = transform(pad_center(f, p))
            polygon = None
            if p[3] == "custom":
                primitives = nodes(p, "primitives")
                polygons = nodes(primitives[0], "gr_poly") if primitives else []
                check(len(polygons) == 1, f"{label}: verifier supports one custom polygon; extend it for new geometry")
                if polygons:
                    px, py = pad_center(f, p)
                    polygon = []
                    for v in nodes(nodes(polygons[0], "pts")[0], "xy"):
                        dx, dy = rotate_kicad(tuple(map(float, v[1:])), angle(p))
                        polygon.append(transform((px+dx, py+dy)))
            candidates = [g for g in by_type[kind] if g.get("pcb_component_id") == pc["pcb_component_id"] and id(g) not in used and ((polygon is not None and g.get("shape") == "polygon" and cj_ring(g) == ring(polygon)) or (polygon is None and point_close(point_of(g), expected_pos)))]
            check(len(candidates) == 1, f"{label}: expected one matching physical pad, got {len(candidates)}")
            if len(candidates) != 1:
                continue
            g = candidates[0]
            used.add(id(g))
            if p[1]:
                source_port = source_ports.get(pcb_ports.get(g.get("pcb_port_id"), {}).get("source_port_id"), {})
                check("kicad:" + p[1] in source_port.get("port_hints", []), f"{label}: physical pad identity missing/wrong in source port hints")
                check(source_port.get("source_component_id") == pc.get("source_component_id"), f"{label}: source port belongs to wrong component")
                expected_net = values(p, "net")[-1]
                check_net(g, expected_net, label)
                expected_logical[(ref, p[1])] = expected_net
            if kind == "pcb_smtpad":
                expected_layer = next(LAYERS[x] for x in layers if x in LAYERS)
                check(g.get("layer") == expected_layer, f"{label}: wrong copper layer")
            if kind == "pcb_hole":
                check(g.get("hole_shape") == "circle", f"{label}: NPTH shape changed")
                number(g.get("hole_diameter"), float(val(p, "drill")), label + " hole diameter")
                continue
            w, h = xy(p, "size")
            turns = angle(p) / 90
            check(close(turns, round(turns)), f"{label}: non-orthogonal pad needs explicit verifier support")
            if round(turns) % 2:
                w, h = h, w
            if kind == "pcb_smtpad":
                if polygon is not None:
                    check(cj_ring(g) == ring(polygon), f"{label}: custom copper polygon changed")
                else:
                    check(g.get("shape") in ("rect", "rotated_rect"), f"{label}: unexpected SMT shape {g.get('shape')}")
                    gw, gh = g.get("width"), g.get("height")
                    grot = g.get("ccw_rotation", 0)
                    check(close(grot / 90, round(grot / 90)), f"{label}: unexpected non-orthogonal output pad")
                    if round(grot / 90) % 2:
                        gw, gh = gh, gw
                    number(gw, w, label + " copper width")
                    number(gh, h, label + " copper height")
                    radius = min(xy(p, "size")) * float(val(p, "roundrect_rratio", 0))
                    number(g.get("corner_radius", g.get("rect_border_radius", 0)) or 0, radius, label + " corner radius")
            elif kind == "pcb_plated_hole":
                check(set(g.get("layers", [])) == set(LAYERS.values()), f"{label}: plated pad missing copper layers")
                drill = values(p, "drill")
                if drill[0] == "oval":
                    check(g.get("shape") == "pill", f"{label}: plated slot shape changed")
                    dw, dh = map(float, drill[1:3])
                    if round(turns) % 2:
                        dw, dh = dh, dw
                    gw, gh = g.get("outer_width"), g.get("outer_height")
                    gdw, gdh = g.get("hole_width"), g.get("hole_height")
                    grot = g.get("ccw_rotation", 0)
                    check(close(grot / 90, round(grot / 90)), f"{label}: unexpected slot rotation")
                    if round(grot / 90) % 2:
                        gw, gh, gdw, gdh = gh, gw, gdh, gdw
                    for got, want, suffix in [(gw,w,"copper width"),(gh,h,"copper height"),(gdw,dw,"slot width"),(gdh,dh,"slot height")]:
                        number(got, want, label + " " + suffix)
                else:
                    check(g.get("shape") == "circle", f"{label}: plated circular pad shape changed")
                    number(g.get("outer_diameter"), w, label + " copper diameter")
                    number(g.get("hole_diameter"), float(drill[0]), label + " drill diameter")
            checks["physical_copper_pads"] += 1
    for kind, count in expected_counts.items():
        check(len(by_type[kind]) == count, f"{kind}: expected {count}, got {len(by_type[kind])}")
    check(len(used) == len(geometries), "Unmatched or extra physical pad/hole geometry")
    checks["logical_connected_pads"] = sum(bool(n) and not n.startswith("unconnected-") for n in expected_logical.values())

    segments = nodes(board, "segment")
    check(len(by_type["pcb_trace"]) == len(segments), "PCB trace count differs from original segment count")
    for seg in segments:
        key = "trace_" + val(seg, "uuid")
        e = ids.get(key)
        check(e is not None and e.get("type") == "pcb_trace", f"Missing original segment {key}")
        if not e:
            continue
        route = e.get("route", [])
        check(len(route) == 2 and all(p.get("route_type") == "wire" for p in route), f"{key}: expected exact two-point segment")
        if len(route) != 2:
            continue
        a, b = transform(xy(seg, "start")), transform(xy(seg, "end"))
        got = [point_of(p) for p in route]
        check((point_close(got[0], a) and point_close(got[1], b)) or (point_close(got[1], a) and point_close(got[0], b)), f"{key}: segment coordinates changed")
        for p in route:
            number(p.get("width"), float(val(seg, "width")), key + " trace width")
            check(p.get("layer") == LAYERS[val(seg, "layer")], f"{key}: trace layer changed")
        check_net(e, values(seg, "net")[-1], key)
    checks["segments"] = len(segments)

    vias = nodes(board, "via")
    check(len(by_type["pcb_via"]) == len(vias), "Via count differs from original PCB")
    for via in vias:
        key = "via_" + val(via, "uuid")
        e = ids.get(key)
        check(e is not None and e.get("type") == "pcb_via", f"Missing original via {key}")
        if not e:
            continue
        position(point_of(e), transform(xy(via)), key + " position")
        number(e.get("outer_diameter"), float(val(via, "size")), key + " diameter")
        number(e.get("hole_diameter"), float(val(via, "drill")), key + " drill")
        check(set(e.get("layers", [])) == set(LAYERS.values()), f"{key}: via layer span changed")
        check_net(e, values(via, "net")[-1], key)
    checks["vias"] = len(vias)

    fills, keepouts = 0, 0
    # Placed footprint-owned zone coordinates in .kicad_pcb are also global;
    # applying the footprint placement a second time would move the antenna
    # exclusion off the board. Include those zones, not just board children.
    all_zones = nodes(board, "zone") + [z for f in footprints.values() for z in nodes(f, "zone")]
    for z in all_zones:
        if nodes(z, "keepout"):
            keepouts += 1
            key = "keepout_" + val(z, "uuid")
            e = ids.get(key)
            check(e is not None and e.get("type") == "pcb_keepout", f"Missing keepout {key}")
            if e:
                polys = nodes(z, "polygon")
                check(len(polys) == 1, f"{key}: verifier requires one keepout polygon")
                if polys:
                    expected = ring([transform(tuple(map(float, v[1:]))) for v in nodes(nodes(polys[0], "pts")[0], "xy")])
                    check(cj_ring(e) == expected, f"{key}: keepout boundary changed")
                source_layers = values(z, "layers") if nodes(z, "layers") else values(z, "layer")
                check(set(e.get("layers", [])) == {LAYERS[l] for l in source_layers}, f"{key}: keepout layers changed")
                check(not e.get("warning_only", False), f"{key}: mandatory keepout became advisory")
                restrictions = nodes(z, "keepout")[0]
                if val(restrictions, "tracks") == "not_allowed":
                    check(not e.get("allow_traces", False), f"{key}: forbidden trace crossings became allowed")
                if val(restrictions, "footprints") == "not_allowed":
                    check(not e.get("allow_placements", False), f"{key}: forbidden component placements became allowed")
        for i, p in enumerate(nodes(z, "filled_polygon")):
            fills += 1
            key = f"pour_{val(z, 'uuid')}_{i}"
            e = ids.get(key)
            check(e is not None and e.get("type") == "pcb_copper_pour", f"Missing fill polygon {key}")
            if not e:
                continue
            expected = ring([transform(tuple(map(float, v[1:]))) for v in nodes(nodes(p, "pts")[0], "xy")])
            check(e.get("shape") == "polygon", f"{key}: saved polygon representation changed; inspect contour/hole topology")
            check(cj_ring(e) == expected, f"{key}: saved filled copper boundary changed")
            check(e.get("layer") == LAYERS[val(p, "layer")], f"{key}: fill layer changed")
            check_net(e, values(z, "net")[-1], key)
    check(len(by_type["pcb_copper_pour"]) == fills, "Extra or missing filled copper polygons")
    check(len(by_type["pcb_keepout"]) == keepouts, "Extra or missing board/footprint keepouts")
    checks["filled_polygons"], checks["keepouts"] = fills, keepouts
    boards = by_type["pcb_board"]
    check(len(boards) == 1, "Expected one PCB board")
    if boards:
        number(boards[0].get("width"), 30, "Board width")
        number(boards[0].get("height"), 30, "Board height")
        number(boards[0].get("thickness"), float(val(nodes(board, "general")[0], "thickness")), "Board thickness")
        check(boards[0].get("num_layers") == 4, "Board copper layer count changed")
        position(point_of(boards[0].get("center", {})), (0, 0), "Board center")
        edges = [g for g in nodes(board, "gr_line") if val(g, "layer") == "Edge.Cuts"]
        original_edges = collections.Counter(tuple(sorted((tuple(round(v, 6) for v in transform(xy(g, "start"))), tuple(round(v, 6) for v in transform(xy(g, "end")))))) for g in edges)
        outline = [point_of(p) for p in boards[0].get("outline", [])]
        if len(outline) > 1 and point_close(outline[0], outline[-1]):
            outline.pop()
        output_edges = collections.Counter(tuple(sorted((tuple(round(float(v), 6) for v in p), tuple(round(float(v), 6) for v in outline[(i+1) % len(outline)])))) for i, p in enumerate(outline))
        check(bool(original_edges) and original_edges == output_edges, "Board outline edges differ from original KiCad Edge.Cuts")
    # Courtyards are checked as edge multisets, independent of path starting
    # vertex or direction, with circles compared analytically.
    court_total = 0
    visible_text_ids = set()
    def edge_key(a, b):
        return tuple(sorted(tuple(round(float(v), 6) for v in pt) for pt in (a, b)))
    for ref, fp in footprints.items():
        pcs = [p for p in pcb_components.values() if components.get(p.get("source_component_id"), {}).get("name") == ref]
        if len(pcs) != 1:
            continue
        pc = pcs[0]
        def local_point(point):
            dx, dy = rotate_kicad(point, angle(fp))
            fx, fy = xy(fp)
            return transform((fx + dx, fy + dy))
        expected_edges, expected_circles = [], []
        for graphic in fp:
            if not isinstance(graphic, list) or not graphic:
                continue
            layer = str(val(graphic, "layer", ""))
            if layer.endswith(".CrtYd"):
                check(layer[0] == str(val(fp, "layer"))[0], f"{ref}: original courtyard is on a different component side")
                if graphic[0] == "fp_line":
                    expected_edges.append(edge_key(local_point(xy(graphic, "start")), local_point(xy(graphic, "end"))))
                elif graphic[0] == "fp_rect":
                    a, b = xy(graphic, "start"), xy(graphic, "end")
                    corners = [a, (b[0], a[1]), b, (a[0], b[1]), a]
                    expected_edges.extend(edge_key(local_point(a), local_point(b)) for a, b in zip(corners, corners[1:]))
                elif graphic[0] == "fp_circle":
                    a, b = xy(graphic, "center"), xy(graphic, "end")
                    expected_circles.append((local_point(a), math.dist(a, b)))
                else:
                    check(False, f"{ref}: unsupported courtyard primitive {graphic[0]}; extend verifier")
            if layer.endswith(".SilkS") and graphic[0] in ("property", "fp_text"):
                effects = nodes(graphic, "effects")[0] if nodes(graphic, "effects") else []
                if "hide" in graphic or val(graphic, "hide") == "yes" or "hide" in effects:
                    continue
                key = "silk_text_" + str(val(graphic, "uuid"))
                visible_text_ids.add(key)
                text = ids.get(key, {})
                check(text.get("type") == "pcb_silkscreen_text", f"{ref}: missing visible footprint text {key}")
                check(text.get("text") == graphic[2], f"{ref}: visible footprint text changed")
                check(text.get("pcb_component_id") == pc["pcb_component_id"], f"{ref}: visible text assigned to wrong component")
                check(text.get("layer") == ("bottom" if layer.startswith("B") else "top"), f"{ref}: visible text side changed")
                position(point_of(text.get("anchor_position", {})), local_point(xy(graphic)), f"{ref}: visible text position")
                number(text.get("ccw_rotation"), angle(graphic), f"{ref}: visible text rotation")
                check(bool(text.get("is_mirrored")) == ("mirror" in values(effects, "justify", "")), f"{ref}: visible text mirror state changed")
        courts = [e for kind in ("pcb_courtyard_outline", "pcb_courtyard_circle", "pcb_courtyard_rect") for e in by_type[kind] if e.get("pcb_component_id") == pc["pcb_component_id"]]
        court_total += len(courts)
        actual_edges, actual_circles = [], []
        for court in courts:
            check(court.get("layer") == pc.get("layer"), f"{ref}: courtyard layer changed")
            if court["type"] == "pcb_courtyard_outline":
                points = [point_of(p) for p in court.get("outline", [])]
                check(len(points) >= 4 and point_close(points[0], points[-1]), f"{ref}: courtyard outline is not closed")
                actual_edges.extend(edge_key(a,b) for a,b in zip(points, points[1:]))
            elif court["type"] == "pcb_courtyard_circle":
                actual_circles.append((point_of(court.get("center", {})), court.get("radius")))
            else:
                check(False, f"{ref}: unexpected courtyard output shape")
        check(collections.Counter(actual_edges) == collections.Counter(expected_edges), f"{ref}: courtyard outline geometry changed")
        check(len(actual_circles) == len(expected_circles), f"{ref}: courtyard circle count changed")
        for center, radius in expected_circles:
            check(sum(point_close(center, ac) and close(radius, ar) for ac, ar in actual_circles) == 1, f"{ref}: courtyard circle geometry changed")
    check(court_total == sum(len(by_type[k]) for k in ("pcb_courtyard_outline", "pcb_courtyard_circle", "pcb_courtyard_rect")), "Unexpected courtyard without original component")
    actual_text_ids = {e["pcb_silkscreen_text_id"] for e in by_type["pcb_silkscreen_text"] if e["pcb_silkscreen_text_id"].startswith("silk_text_")}
    check(actual_text_ids == visible_text_ids, "Visible footprint text set differs from original")
    checks["courtyards"] = court_total
    checks["visible_footprint_texts"] = len(visible_text_ids)

    # Physical PCB labels can be stale after a symbol replacement. The original
    # schematic's embedded symbols are the independent authority for pin names.
    # R/C/L use native primitive port names; every labelled chip is checked.
    if schematic is None:
        schematic = parse((ROOT / "pcb/crimpdeq/crimpdeq.kicad_sch").read_text())
    libraries = {s[1]: s for s in nodes(nodes(schematic, "lib_symbols")[0], "symbol")}
    symbols = {next(p[2] for p in nodes(s, "property") if p[1] == "Reference"): s for s in nodes(schematic, "symbol")}
    for port in source_ports.values():
        ref = components.get(port.get("source_component_id"), {}).get("name", "")
        if ref.startswith(("R", "C", "L")):
            continue
        symbol = symbols.get(ref)
        check(symbol is not None, f"{ref}: missing original schematic symbol for port-label verification")
        if symbol is None:
            continue
        lib = libraries.get(val(symbol, "lib_id"), [])
        pin_names = {val(pin, "number"): val(pin, "name") for unit in nodes(lib, "symbol") for pin in nodes(unit, "pin")}
        for hint in port.get("port_hints", []):
            if not hint.startswith("kicad:"):
                continue
            number = hint[6:]
            check(number in pin_names, f"{ref}.{number}: pin missing from original schematic symbol")
            if number in pin_names:
                expected_name = re.sub(r"[^A-Za-z0-9_]", "_", pin_names[number] + "_" + number)
                check(port.get("name") == expected_name, f"{ref}.{number}: source-port label {port.get('name')!r} differs from schematic {expected_name!r}")
    return {"passed": not errors, "tolerance_mm": TOL, "checks": dict(checks), "errors": errors,
            "limitations": ["Does not replace native KiCad DRC, ERC, fabrication DFM or hardware tests.",
                            "Paste/mask artwork and zone refill parameters require separate verification."]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("circuit", nargs="?", type=pathlib.Path, default=ROOT / "dist/crimpdeq/circuit.json")
    parser.add_argument("--source", type=pathlib.Path, default=ROOT / "pcb/crimpdeq/crimpdeq.kicad_pcb")
    args = parser.parse_args()
    try:
        report = verify(parse(args.source.read_text()), json.loads(args.circuit.read_text()), parse(args.source.with_suffix(".kicad_sch").read_text()))
    except Exception as exc:
        print(json.dumps({"passed": False, "errors": [f"Verification could not complete: {type(exc).__name__}: {exc}"]}, indent=2))
        return 2
    print(json.dumps(report, indent=2))
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    sys.exit(main())
