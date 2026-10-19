# Crimpdeq PCB

KiCad PCB design for Crimpdeq. See the [Crimpdeq book](https://book.crimpdeq.com/) for assembly,
flashing, and calibration.

## PCB

The single canonical design is stored under [`pcb/crimpdeq/`](pcb/crimpdeq/). It is a
30 x 30 mm four-layer board with an ADS1220 24-bit load-cell ADC, a MAX17048 fuel gauge, an
RGB status LED, and charging while switched off. The load-cell pads (`E-`, `A-`, `A+`, `E+`)
sit on one edge, away from the antenna; the battery and switch pads (`B-`, `B+`, `SW+`, `SW-`)
sit on the edge next to the USB-C connector.

![PCB V3 front and back](assets/pcb_v3_pinout.png)

A V3 board with the load cell and battery wired:

![PCB V3 wired to the load cell and battery](assets/pcb_v3_wired.jpg)

Shared footprints are under `libraries/`; datasheets remain under `pcb/datasheets/`.

## Revisions

Use the [firmware](https://github.com/crimpdeq/crimpdeq-firmware) and
[case](https://github.com/crimpdeq/crimpdeq-case) releases in the row for your PCB revision.
From V2 on, the PCB, firmware, and case share the major version; V1 uses firmware and case
`v0.4.0`.

| PCB revision | PCB release                                                            | ADC     | Firmware                                                                      | Case                                                                      |
| ------------ | ---------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| V3 (current) | [`v3.0.0`](https://github.com/crimpdeq/crimpdeq-pcb/releases/tag/v3.0.0) | ADS1220 | [`v3.0.0`](https://github.com/crimpdeq/crimpdeq-firmware/releases/tag/v3.0.0) | [`v3.1.0`](https://github.com/crimpdeq/crimpdeq-case/releases/tag/v3.1.0) |
| V2           | [`v2.0.0`](https://github.com/crimpdeq/crimpdeq-pcb/releases/tag/v2.0.0) | HX711   | [`v2.1.0`](https://github.com/crimpdeq/crimpdeq-firmware/releases/tag/v2.1.0) | [`v2.0.0`](https://github.com/crimpdeq/crimpdeq-case/releases/tag/v2.0.0) |
| V1           | [`v1.0.1`](https://github.com/crimpdeq/crimpdeq-pcb/releases/tag/v1.0.1) | HX711   | [`v0.4.0`](https://github.com/crimpdeq/crimpdeq-firmware/releases/tag/v0.4.0) | [`v0.4.0`](https://github.com/crimpdeq/crimpdeq-case/releases/tag/v0.4.0) |

Each release includes the schematic and layout PDFs, `gerber.zip`, `bom.csv`, and
`position.csv`. The book explains [how to order the board](https://book.crimpdeq.com/assembly/crimpdeq/pcb.html#how-to-manufacture)
and the [wiring for each revision](https://book.crimpdeq.com/assembly/crimpdeq/index.html).

The PCB was sponsored by [PCBWay](https://www.pcbway.com/), thank you! Working with them was incredibly easy and fast, and the resulting boards are high quality.

[![PCBWay](assets/PCBWay.png)](https://www.pcbway.com/)

## License

This repository is source-available for personal and educational use only.

Commercial manufacture, sale of PCBs, sale of 3D-printed cases, kits, or assembled Crimpdeq devices requires prior written permission.
