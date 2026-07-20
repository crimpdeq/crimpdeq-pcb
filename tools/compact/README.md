# Compact 25 x 26 mm Board Tooling

Reproduction scripts for
`pcb/designs/25x26_4layer_led_antenna_back/25x26_4layer_led_antenna_back.kicad_pcb`.

The input electrical/layout baseline is the retained
`pcb/designs/26p25x35_4layer_led_antenna_back/26p25x35_4layer_led_antenna_back.kicad_pcb`.

- `prepare_compact.py`: applies placement, the rectangular 25 x 26 mm outline, cable-pad
  positions, antenna/analog/edge router keepouts, and exports a Specctra DSN.
- `postroute_compact.py`: deterministic local C11 and IO7-via cleanup after SES import.
- `finalize_compact.py`: adds the antenna and analog rule areas, four copper pours, and
  positions the six cable labels.
- `check_dfm.py`: verifies the six functional labels have at least 0.20 mm clearance from
  top-side pads and drilled holes, use 0.80 mm text, every routing via is tented on both faces,
  and the pair-level JLCDFM cable-PTH findings meet the 2.03 mm danger threshold. The mapped
  list includes USB shell pad J2.S4 even though KiCad classifies it as PTH.

The ESP32 antenna body overhangs the top edge while its castellated pad row remains fully
supported. The USB-C body overhangs the bottom edge by 1 mm; all connector copper remains
inside the rectangular PCB.

Use headless FreeRouting exactly as documented in `../4layer/README.md`, then run the standard
connectivity comparison and KiCad DRC. The final expected result is 197/197 pads, zero changed
nets, zero DRC violations, and zero unconnected items.

Run the compact DFM audit with KiCad's bundled Python:

```sh
PY=/Applications/KiCad/KiCad.app/Contents/Frameworks/Python.framework/Versions/3.9/bin/python3
$PY tools/compact/check_dfm.py \
  pcb/designs/25x26_4layer_led_antenna_back/25x26_4layer_led_antenna_back.kicad_pcb
```

The accepted DFM finish moves R7/R8/C12 toward U3, clears J3.2 around R1/C18, moves the
D2/Q2 power pair locally, shifts J2 left 0.25 mm, and moves J4.4 down 0.10 mm. The USB data
route lengths are unchanged; only the CC1 via follows the connector shift. JLCDFM reports
warnings only for the resulting Gerbers.

The board-specific `.kicad_dru` file is required when checking a scratch output because it
contains the USB4105-GF-A pad-to-NPTH clearance rule. Copy it beside the scratch board using the
same basename before running DRC, for example:

```sh
cp pcb/designs/25x26_4layer_led_antenna_back/25x26_4layer_led_antenna_back.kicad_dru \
  /tmp/pcbcompact/review_final.kicad_dru
kicad-cli pcb drc --refill-zones --severity-error \
  --output /tmp/pcbcompact/review_final_drc.txt \
  /tmp/pcbcompact/review_final.kicad_pcb
```
