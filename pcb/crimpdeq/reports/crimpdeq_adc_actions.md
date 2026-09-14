# ADC, SPI, and component actions

## Implemented design changes

C12 is Murata **GRM31C5C2A104JA01L**, LCSC **C405303** — 100 nF, C0G, ±5%, 100 V, 1206. The R7/R8 network and 100 nF value are unchanged. Its package and sourcing fields separate it from the C11/C19 bypass-cap group. Evidence: [Murata reference sheet](https://search.murata.co.jp/Ceramy/image/img/A01X/G101/ENG/GRM31C5C2A104JA01-01A.pdf) and [C405303 listing](https://www.lcsc.com/product-detail/C405303.html).

Four 47 Ω, 1%, 0402 resistors use UNI-ROYAL **0402WGF470JTCE**, LCSC **C25118**: R23 SCLK, R24 MOSI, and R25 CS are at their U1 source escapes; R26 is at the U3.15 DOUT source escape. Dedicated DRDY remains NC. Evidence: [C25118 listing](https://www.lcsc.com/product-detail/C25118.html) and [TI ADS1220 datasheet](https://www.ti.com/lit/ds/symlink/ads1220.pdf), section 9.1.1.

The saved PCB has zero error-level DRC violations, zero unconnected items, and zero schematic-parity findings. The repository verifier checks the selected MPNs, footprints, split SPI nets, source proximity, DRDY state, and exclusion of all `ADS_*` digital copper from the analog-input corridor. The assembly BOM groups R23–R26 together and emits C12 separately.

## Pending prototype qualification

The expected damping benefit is lower digital edge ringing and interference; ADC resolution improvement is not established by layout checks. Measure shorted-input and bridge-simulator noise, drift, settling, and input excursions across USB, radio TX, LED, charging, and load states. Verify SPI mode 1, reset/register readback, external reference, gain/rate, headroom, calibration, polarity, and settling. Capture SPI edges at the source and ADC ends and confirm timing margins with the populated 47 Ω resistors.
