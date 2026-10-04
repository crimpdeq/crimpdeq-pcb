# JLCDFM `tht to smd` Mapping

JLCDFM labels each 1.50 mm J3/J4 cable PTH as `r59.0551`. The aperture label is
not a unique object ID; the exact cable pad is identified from the layer and
measurement-segment coordinates.

The table maps every danger finding present before the DFM finishing pass. Distances are
KiCad copper-edge shape measurements; JLCDFM can round or measure the rendered
Gerber aperture slightly differently. The final Gerber upload was verified in
JLCDFM with warnings only and no danger findings.

| Layer | Cable PTH | Other pad | Before (mm) | After (mm) | Resolution |
|---|---|---|---:|---:|---|
| Front | J3.2 E- | R1.2 | 1.359 | 2.064 | Rotate/move R1 locally |
| Front | J3.2 E- | C18.2 | 1.990 | 2.090 | Move C18 0.10 mm |
| Front | J4.1 A- | R8.2 | 0.518 | 2.164 | Move R8 toward U3 |
| Front | J4.1 A- | R8.1 | 1.496 | 3.173 | Move R8 toward U3 |
| Front | J4.2 A+ | R7.1 | 0.624 | 2.389 | Move R7 toward U3 |
| Front | J4.2 A+ | R7.2 | 1.581 | 3.135 | Move R7 toward U3 |
| Front | J4.4 SW | J2.S4 | 1.855 | 2.105 | Move J2 left 0.25 mm |
| Back | J4.4 SW | J2.S4 | 1.855 | 2.105 | Move J2 left 0.25 mm |
| Back | J4.4 SW | Q2.3 | 1.150 | 2.135 | Move Q2 up 0.91 mm and J4.4 down 0.10 mm |

Additional final boundary checks:

| Layer | Cable PTH | Other pad | Final (mm) |
|---|---|---|---:|
| Back | J3.2 E- | R13.2 | 2.035 |
| Back | J3.2 E- | R13.1 | 2.086 |
| Front | J4.4 SW | U5.8 | 2.780 |

The `tools/compact/check_dfm.py` regression audit enforces a nominal `2.03 mm`
KiCad-shape boundary for the mapped JLC pairs. It includes J2.S4 explicitly
because KiCad classifies the USB shell slot as PTH while JLCDFM includes it in
`via2pad` analysis. This regression check does not replace release-Gerber upload:
the final JLCDFM result remains the authority for category membership and rounding.
