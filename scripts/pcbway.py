# Generate PCBWay assembly files from dist/index/circuit.json:
#   dist/fab/pcbway_bom.csv       BOM grouped by manufacturer part number
#   dist/fab/pcbway_centroid.csv  pick-and-place (mm, origin = board center)
# Usage: python3 scripts/pcbway.py
import csv, json, os
from collections import defaultdict

cj = json.load(open("dist/index/circuit.json"))
os.makedirs("dist/fab", exist_ok=True)

# MPN -> (manufacturer, package, description)
PARTS = {
    "ESP32-C3-MINI-1-N4": ("Espressif Systems", "Module 13.2x16.6mm", "ESP32-C3 WiFi/BLE module, 4MB flash, PCB antenna"),
    "ADS1220IRVAR": ("Texas Instruments", "VQFN-16 3.5x3.5mm", "24-bit delta-sigma ADC, SPI"),
    "MCP73831T-2ACI/OT": ("Microchip Technology", "SOT-23-5", "Li-ion charger, 4.2V"),
    "MAX17048G+T10": ("Analog Devices (Maxim)", "TDFN-8 2x2mm", "1-cell fuel gauge, I2C"),
    "SY8088IAAC": ("Silergy", "SOT-23-5", "1A 1.5MHz sync buck"),
    "DMG3415U-7": ("Diodes Incorporated", "SOT-23", "P-MOSFET 20V 4A"),
    "B5819WS": ("MCC (B5819WS-TP) or equivalent", "SOD-323", "Schottky 40V 1A"),
    "LESD5D5.0CT1G": ("LRC (Leshan Radio)", "SOD-523", "ESD protection 5V"),
    "LESD8D3.3CAT5G": ("LRC (Leshan Radio)", "SOD-882", "ESD protection 3.3V bidirectional"),
    "XL-2121RGBC-2812B": ("XINGLIGHT", "2.1x2.1mm 4-pin", "RGB LED, WS2812 protocol"),
    "FTC252012S2R2MBCA": ("FH (Guangdong Fenghua)", "2520 (1008)", "Power inductor 2.2uH 3A 55mOhm"),
    "TYPE-C-31-M-12": ("Korean Hroparts Elec (HRO)", "USB-C 16P SMD + 4 THT shell", "USB-C 2.0 receptacle"),
    "KT-0603R": ("Hubei KENTO Elec", "0603", "LED red"),
    "0402CG220J500NT": ("FH (Guangdong Fenghua)", "0402", "22pF 50V C0G 5%"),
    "CL05B103KB5NNNC": ("Samsung Electro-Mechanics", "0402", "10nF 50V X7R 10%"),
    "GRM1555C1E103JE01D": ("Murata", "0402", "10nF 25V C0G 5%"),
    "GRM1555C1H102JA01D": ("Murata", "0402", "1nF 50V C0G 5%"),
    "BLM15HG102SN1D": ("Murata", "0402", "Ferrite bead 1kOhm@100MHz GHz-band 250mA"),
    "CL05B104KO5NNNC": ("Samsung Electro-Mechanics", "0402", "100nF 16V X7R 10%"),
    "CL05A105KA5NQNC": ("Samsung Electro-Mechanics", "0402", "1uF 25V X5R 10%"),
    "CL10A475KO8NNNC": ("Samsung Electro-Mechanics", "0603", "4.7uF 16V X5R 10%"),
    "CL10A106KP8NNNC": ("Samsung Electro-Mechanics", "0603", "10uF 10V X5R 10%"),
    "CL21A106KAYNNNE": ("Samsung Electro-Mechanics", "0805", "10uF 25V X5R 10%"),
}
for mpn, value in [("0402WGF0000TCE", "0R"), ("0402WGF100JTCE", "10R"), ("0402WGF1001TCE", "1k"),
                   ("0402WGF4701TCE", "4.7k"), ("0402WGF5101TCE", "5.1k"), ("0402WGF1002TCE", "10k"),
                   ("0402WGF2212TCE", "22.1k"), ("0402WGF1003TCE", "100k")]:
    PARTS[mpn] = ("UNI-ROYAL", "0402", f"Resistor {value} 1% 62.5mW")
NOTES = {mpn: "Equivalent substitute OK (same value, package, rating)"
         for mpn, (_, _, desc) in PARTS.items()
         if desc.startswith(("Resistor", "LED red")) or mpn.startswith(("CL", "0402CG"))}
NOTES["FTC252012S2R2MBCA"] = "Substitute only with 2.2uH 2520, Isat >= 2A, DCR <= 100mOhm"
NOTES["GRM1555C1E103JE01D"] = "C0G/NP0 only (no X7R/X5R): 10nF 0402, >= 16V"
NOTES["GRM1555C1H102JA01D"] = "C0G/NP0 only (no X7R/X5R): 1nF 0402, >= 16V"
NOTES["0402CG220J500NT"] = "C0G/NP0 only (no X7R/X5R): 22pF 0402, >= 16V"
NOTES["BLM15HG102SN1D"] = "Substitute only with a GHz-band 0402 ferrite bead, 1kOhm@100MHz, >= 200mA"
NOTES["B5819WS"] = "Any B5819WS in SOD-323; cathode per silkscreen band"

source = {e["source_component_id"]: e for e in cj if e["type"] == "source_component"}
# Stitching vias also get a pcb_component, without a source component
placed = [e for e in cj if e["type"] == "pcb_component" and not e.get("do_not_place")
          and e["source_component_id"] in source]

groups = defaultdict(list)
for pc in placed:
    sc = source[pc["source_component_id"]]
    groups[sc["manufacturer_part_number"]].append((sc, pc))

has_tht = {e["pcb_component_id"] for e in cj if e["type"] == "pcb_plated_hole" and e.get("pcb_component_id")}

with open("dist/fab/pcbway_bom.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["Item #", "Designator", "Qty", "Manufacturer", "Mfg Part #", "Description / Value",
                "Package/Footprint", "Type", "Side", "Supplier Part # (LCSC)", "Notes"])
    for item, (mpn, members) in enumerate(sorted(groups.items(), key=lambda g: g[1][0][0]["name"]), 1):
        if mpn not in PARTS:
            raise SystemExit(f"no PCBWay BOM data for {mpn}")
        manufacturer, package, description = PARTS[mpn]
        names = sorted((sc["name"] for sc, _ in members), key=lambda n: (n.rstrip("0123456789"), int(n[len(n.rstrip("0123456789")):])))
        sides = sorted({pc["layer"].capitalize() for _, pc in members})
        lcsc = sorted({x for sc, _ in members for x in (sc.get("supplier_part_numbers") or {}).get("lcsc", [])})
        tht = any(pc["pcb_component_id"] in has_tht for _, pc in members)
        w.writerow([item, ",".join(names), len(members), manufacturer, mpn, description, package,
                    "SMD+THT" if tht else "SMD", "/".join(sides), ",".join(lcsc),
                    NOTES.get(mpn, "")])

with open("dist/fab/pcbway_centroid.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["Designator", "Mfg Part #", "Mid X (mm)", "Mid Y (mm)", "Layer", "Rotation"])
    for pc in sorted(placed, key=lambda p: source[p["source_component_id"]]["name"]):
        sc = source[pc["source_component_id"]]
        w.writerow([sc["name"], sc["manufacturer_part_number"], f"{pc['center']['x']:.3f}",
                    f"{pc['center']['y']:.3f}", pc["layer"].capitalize(), f"{pc['rotation'] % 360:g}"])

print(f"BOM: {len(groups)} lines, {len(placed)} placements -> dist/fab/pcbway_bom.csv, pcbway_centroid.csv")
