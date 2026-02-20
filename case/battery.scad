//
// Battery model (simple envelope)
// Units: mm
//

include <dimensions.scad>

$fn = 64;

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
