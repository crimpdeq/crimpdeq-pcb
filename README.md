# Crimpdeq PCB

KiCad PCB design for Crimpdeq. See the [Crimpdeq book](https://crimpdeq.com/) for more details on the project!

## PCB

Complete PCB designs are stored under [`pcb/designs/`](pcb/designs/):

- `crimpdeq-v2/` is the original two-layer design (`23 x 63.8 mm`), based on the [Rust ESP Board](https://github.com/esp-rs/esp-rust-board). This design removes unused sensors from the original board and adds the necessary components for this project. It remains the frozen electrical reference used to verify derived designs.
- `25x26_4layer_led_antenna_back/` is a compact 4-layer redesign (`25 x 26 mm`, ~56% smaller board area than `crimpdeq-v2`) with the antenna and status LED both moved to the back and USB/HX711 kept on the front. It is electrically identical to `crimpdeq-v2` (same BOM and netlist).

Shared footprints and datasheets remain under `pcb/libraries/` and `pcb/datasheets/`.
See `pcb/designs/README.md` for the design-version policy and package contents.

![PCB](assets/pcb_v1.png)

The PCB was sponsored by [PCBWay](https://www.pcbway.com/), thank you! Working with them was incredibly easy and fast, and the resulting boards are high quality.

[![PCBWay](assets/PCBWay.png)](https://www.pcbway.com/)


## License

This repository is source-available for personal and educational use only.

Commercial manufacture, sale of PCBs, sale of 3D-printed cases, kits, or assembled Crimpdeq devices requires prior written permission.
