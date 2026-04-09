#!/usr/bin/env python3

import argparse
import csv
import re
from collections import OrderedDict
from pathlib import Path


TRUTHY_DNP = {"1", "true", "yes", "y", "x", "dnp", "do not populate", "fitted=no"}
FALSY_DNP = {"", "0", "false", "no", "n"}


def normalize_header(name: str) -> str:
    return name.lstrip("\ufeff").strip().lower().replace("_", " ")


def get_field(row: dict, *names: str) -> str:
    for wanted in names:
        wanted_norm = normalize_header(wanted)
        for key, value in row.items():
            if normalize_header(key) == wanted_norm:
                return (value or "").strip()
    return ""


def is_dnp(value: str) -> bool:
    normalized = value.strip().lower()
    if normalized in FALSY_DNP:
        return False
    if normalized in TRUTHY_DNP:
        return True
    return bool(normalized)


def split_references(value: str) -> list[str]:
    if not value.strip():
        return []
    return [part.strip() for part in value.split(",") if part.strip()]


def ref_sort_key(ref: str):
    return ref.strip()


def normalize_footprint(footprint: str) -> str:
    suffix = footprint.split(":")[-1].strip()
    metric_match = re.match(r"^[A-Za-z]+_(\d{4})_\d+Metric(?:_.*)?$", suffix)
    if metric_match:
        return metric_match.group(1)
    return suffix


def normalize_note(note: str) -> str:
    return re.sub(r"\s+", " ", note or "").strip()


def parse_quantity(row: dict, references: list[str]) -> int:
    qty = get_field(row, "Quantity", "Qty")
    if qty:
        try:
            return int(qty)
        except ValueError:
            pass
    return max(len(references), 1)


def main() -> int:
    parser = argparse.ArgumentParser(description="Convert a KiCad BOM into grouped assembly BOM format.")
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    grouped = OrderedDict()

    with args.input.open("r", encoding="utf-8-sig", newline="") as infile:
        reader = csv.DictReader(infile)
        for row in reader:
            references = split_references(get_field(row, "Reference", "Designator"))
            value = get_field(row, "Value")
            footprint = normalize_footprint(get_field(row, "Footprint"))
            lcsc = get_field(row, "LCSC Part #", "LCSC")
            note = normalize_note(get_field(row, "Assembly Note", "AssemblyNote"))
            dnp = get_field(row, "DNP")

            if is_dnp(dnp):
                continue

            key = (footprint, value, lcsc, note)
            if key not in grouped:
                grouped[key] = {
                    "refs": [],
                    "quantity": 0,
                    "notes": [],
                }

            grouped[key]["refs"].extend(references)
            grouped[key]["quantity"] += parse_quantity(row, references)
            if note and note not in grouped[key]["notes"]:
                grouped[key]["notes"].append(note)

    rows = []
    for (footprint, value, lcsc, note), data in grouped.items():
        refs = sorted(dict.fromkeys(data["refs"]), key=ref_sort_key)
        notes = data["notes"] or ([note] if note else [])
        rows.append(
            {
                "Designator": ", ".join(refs),
                "Footprint": footprint,
                "Quantity": str(data["quantity"] or len(refs) or 1),
                "Value": value,
                "LCSC Part #": lcsc,
                "Assembly Note": " | ".join(notes),
                "_sort_refs": refs,
            }
        )

    rows.sort(key=lambda row: ref_sort_key(row["_sort_refs"][0]) if row["_sort_refs"] else ("", 0, ""))

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8", newline="") as outfile:
        fieldnames = ["Designator", "Footprint", "Quantity", "Value", "LCSC Part #", "Assembly Note"]
        writer = csv.DictWriter(outfile, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            row.pop("_sort_refs", None)
            writer.writerow(row)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
