//
// Battery model (simple envelope)
// Units: mm
//

$fn = 64;

/*** BATTERY PARAMETERS ***/
bat_L = 50;   // length (long axis, Y) = 5.0 cm
bat_W = 34;   // width  (X) = 3.4 cm
bat_T = 7;    // thickness/height (Z) = 0.7 cm

// Optional: small corner rounding for nicer preview (set to 0 for plain cube)
bat_corner_r = 2;

module battery_model(rounded=true) {

    if (!rounded || bat_corner_r <= 0) {
        // Simple rectangular block
        color("gray")
            cube([bat_W, bat_L, bat_T], center=true);
    } else {
        // Rounded rectangular block (slower but nicer)
        color("gray")
        minkowski() {
            cube([bat_W - 2*bat_corner_r,
                  bat_L - 2*bat_corner_r,
                  bat_T - 2*bat_corner_r], center=true);
            sphere(r=bat_corner_r);
        }
    }
}

// Render battery
battery_model(rounded=true);
