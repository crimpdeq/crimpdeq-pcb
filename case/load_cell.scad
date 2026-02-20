//
// Load cell 2D profile (top view)
// Units: mm
//

include <dimensions.scad>

$fn = 96;

// Derived hole centers
eye_x1 = eye_center_offset;
eye_x2 = lc_L - eye_center_offset;

module loadcell_2d() {
    difference() {
        // Main rectangle (centered)
        translate([-lc_L/2, -lc_W/2])
            square([lc_L, lc_W]);

        // Eye holes
        translate([-lc_L/2 + eye_x1, 0])
            circle(d=eye_d);

        translate([-lc_L/2 + eye_x2, 0])
            circle(d=eye_d);

        // Side notches (top side)
        translate([-lc_L/2 + notch_xA,  lc_W/2])
            circle(d=notch_d);

        translate([-lc_L/2 + notch_xB,  lc_W/2])
            circle(d=notch_d);

        // Side notches (bottom side)
        translate([-lc_L/2 + notch_xA, -lc_W/2])
            circle(d=notch_d);

        translate([-lc_L/2 + notch_xB, -lc_W/2])
            circle(d=notch_d);
    }
}

// Render the load cell plane
loadcell_2d();
