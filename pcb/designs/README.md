# PCB Designs

Each child directory is a complete, independently identifiable PCB design. The directory owns
its KiCad source, board-specific rules, assembly files, Gerber archive, renders, validation
reports, and a README.

| Directory | Status | Outline | Purpose |
|---|---|---:|---|
| `25x26_4layer_led_antenna_back/` | Production reference | 25.00 x 26.00 mm | Compact 4-layer redesign; HX711 load-cell ADC |
| `crimpdeq-v2/` | Reference | 23.00 x 63.80 mm | Original v2 source and electrical baseline |

## Versioning Policy

- A significant mechanical or layout change creates a new directory under `pcb/designs/`.
- Significant changes include board-outline changes, major placement/routing reorganization,
  stackup changes, connector-edge changes, and other changes that affect fabrication or fit.
- Minor corrections to documentation or generated artifacts remain in the existing directory.
- Never overwrite or delete an older design when introducing a materially different one.
- The current design is identified in this README and `agents.md`; do not create a generic
  moving alias or duplicate as the source of truth.
- Directory names encode the exact nominal dimensions using `p` as the decimal separator,
  followed by the distinguishing stackup and placement characteristics.

Derived layouts of a production reference must preserve that reference's BOM and electrical
connectivity.
