# Release verification and prototype actions

After any approved source edit, reopen the canonical project, refill zones, inspect affected copper and artwork, and run all-severity ERC, DRC with schematic parity, and `tools/crimpdeq/verify.py`. Record ignored checks, effective clearances, warnings, source hashes, and output hashes in a dated release manifest.

The D4 DIN dangling-track finding is closed. Fresh all-severity DRC identified segment `4e46c557-e838-4274-bf20-cfee8c8d323d` as the sole dangling item; it was removed without recursive deletion. After refill and save, DRC reports zero dangling-copper findings, zero errors, zero unconnected items, and zero schematic-parity findings. Preserve this disposition and investigate any newly introduced dangling object independently rather than deleting recursively.

Define numerical limits before calling tests pass: rail droop/ripple, settling, ADC input-referred noise and drift, USB reliability, LED behavior, temperature, and transient/injection limits. Record firmware revision, fixture, settings, and captures.

Test power startup/back-power, USB orientations and reconnects, LED envelope/timing, physical cable and connector fit, hidden joints, enclosure clearance, and antenna performance with the final battery and enclosure. Reconcile stale DFM dimensions, placement counts, GND-via counts, and obsolete HX711 wording at release.
