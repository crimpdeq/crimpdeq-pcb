# USB signal-integrity closure plan

**Baseline:** 2026-09-14, commit `a3a5ed62917bc1322eca5cb9b43c9590eba220e1`, board SHA-256 `74922bd11fa5efb4348634c66b636389f028992be1e059c9124dfd914acbd9d5`.

## Current status

The USB interface is electrically connected and passes the available digital checks, but it is not impedance- or hardware-qualified. The saved board does not define dielectric materials or thicknesses, so its 0.20 mm track width and varying pair spacing cannot establish 90 ohm differential impedance.

Current planar shortest paths, excluding via barrels and separating the ESD shunts, are:

| Endpoint | USB_D+ | USB_D- | D- minus D+ |
|---|---:|---:|---:|
| U1 to J2 A-side pads | 35.1643 mm | 35.8137 mm | +0.6494 mm |
| U1 to J2 B-side pads | 35.7343 mm | 33.0597 mm | -2.6746 mm |
| ESD shunt from route tap to suppressor pad | 0.9189 mm | 1.4079 mm | not an endpoint path |

The previously reported 3.6374/0.3134 mm differences incorrectly included the 2.988 mm D- ESD branch in the connector path. They must not be used as tuning targets. Even the corrected planar figures are geometry evidence, not qualification limits: they exclude via propagation and do not represent impedance discontinuities, return-path quality, or USB-C contact stubs.

Baseline checks:

- ERC, error severity: **0 errors**.
- DRC, error severity: **0 errors**, **0 unconnected items**; 41 lower-severity board findings remain outside this focused action.
- `tools/crimpdeq/verify.py`: **PASS**, including the USB overlap and ADS1220 corridor guards.
- Both nets use three through vias and 0.20 mm tracks on B.Cu, In2.Cu, and F.Cu.
- L2/In1.Cu remains the intended continuous reference and signal-free plane.

## Blocking fabrication input

Send the following with the actual PCBWay quote or order number:

> For this 30 x 30 mm, four-layer Crimpdeq board, please provide the exact proposed finished production stackup rather than a generic capability table. State total board thickness and tolerance; each core/prepreg material and pressed dielectric thickness; Dk/Df with frequency and test method; base and finished copper thickness/tolerance for L1-L4; and solder-mask thickness/Dk assumptions. USB_D+/- is routed on F.Cu, L3/In2.Cu, and B.Cu with 0.20 mm tracks, primarily referenced to the uninterrupted L2/In1.Cu GND plane. Please assess the supplied routing, including its actual varying spacing, layer transitions, USB-C duplicate-pad branches, and TVS branches. Provide the required width/spacing on each used layer for 90 ohm differential impedance, the guaranteed impedance tolerance, and any required geometry changes. State whether same-panel coupon testing is available, its geometry/location, test method, reporting format, and tolerance. Do not alter the design without approval.

Record the response, quote/order identifier, and resulting stackup in this report before changing USB width or spacing. A generic website stackup is insufficient evidence for the ordered construction.

## Decision and implementation gates

1. **Stackup gate:** obtain and record the manufacturer data above.
2. **Electrical target gate:** approve the manufacturer-supported width/gap and impedance tolerance. Define any skew limit from an explicit timing budget or applicable requirement; do not treat the current path differences as specification limits.
3. **Routing review:** model the complete U1-to-J2 route, including via barrels, connector pad ties, ESD taps, spacing changes, and reference-plane transitions. Preserve the ADS1220 exclusion corridor, the signal-free L2 plane, antenna keepout, and unrelated routing.
4. **Minimum justified edit:** only then retune width/spacing and transitions. Prefer consistent coupling and short uncoupled sections over decorative meanders. Do not length-match aggregate copper totals that include branches.
5. **Digital closure:** refill zones, inspect all affected layers, and rerun ERC, DRC with schematic parity, and `tools/crimpdeq/verify.py`. Record before/after endpoint and branch paths using the same method.
6. **Fabrication closure:** archive PCBWay's impedance calculation and coupon/test result for the fabricated lot.
7. **Hardware closure:** test both plug orientations, repeated enumeration/reconnect, sustained traffic, representative hosts and cables, simultaneous radio/LED/charging activity, waveform quality against the applicable USB full-speed mask, and the intended ESD test plan. Define sample count, duration, equipment, firmware revision, and pass/fail limits before testing.

## Present disposition

No USB copper retune is approved yet. The current board may be suitable for USB 2.0 full speed, but ERC/DRC, planar length matching, and successful enumeration cannot prove controlled impedance, waveform margin, or ESD performance. The next external action is the PCBWay stackup/impedance response; the next design action is a route review against that response.

Reference: [Espressif ESP32-C3 PCB guidance](https://docs.espressif.com/projects/esp-hardware-design-guidelines/en/latest/esp32c3/pcb-layout-design.html).
