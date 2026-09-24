# Crimpdeq PCB

PCB design for Crimpdeq, with native tscircuit authoring and the original KiCad reference. See the [Crimpdeq book](https://crimpdeq.com/) for more details on the project!

## tscircuit

The converted design is in [`pcb/crimpdeq/tscircuit/`](pcb/crimpdeq/tscircuit/).
Run `npm ci` and `npm test` using Node 24 and Python 3.10+.
See [MIGRATION.md](MIGRATION.md) for the full build/export workflow and
[VALIDATION.md](VALIDATION.md) for the verification results and limits.
The refactor uses shared package/device definitions and functional schematic sections.
See [REFACTOR.md](REFACTOR.md) for the design decisions and token comparison.
The conversion preserves the original circuit; it is not a fabrication approval.

## PCB

The single canonical design is stored under [`pcb/crimpdeq/`](pcb/crimpdeq/). It is a
30 x 30 mm four-layer board with corrected ESP32 module grounding, hardware I²C/alert
pull-ups, improved ground stitching and power/analog bypass placement, and load-cell cable
pads grouped away from the antenna.

Shared footprints are under `libraries/`; datasheets remain under `pcb/datasheets/`.

![PCB](assets/pcb_v1.png)

The PCB was sponsored by [PCBWay](https://www.pcbway.com/), thank you! Working with them was incredibly easy and fast, and the resulting boards are high quality.

[![PCBWay](assets/PCBWay.png)](https://www.pcbway.com/)


## License

This repository is source-available for personal and educational use only.

Commercial manufacture, sale of PCBs, sale of 3D-printed cases, kits, or assembled Crimpdeq devices requires prior written permission.
