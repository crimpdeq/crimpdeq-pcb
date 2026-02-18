//
// Load cell 2D profile (top view)
// Units: mm
//

$fn = 96;

// Load cell overall dimensions
lc_L = 80;     // length (8.0 cm)
lc_W = 40;     // width  (4.0 cm)

// Main eye holes
eye_d = 17;    // diameter
eye_edge_start = 6;  // hole boundary starts 6 mm from edge
eye_center_offset = eye_edge_start + eye_d/2;

eye_x1 = eye_center_offset;
eye_x2 = lc_L - eye_center_offset;

// Side notches
notch_d = 6;
notch_r = notch_d/2;

// Notch centers along length
notch_xA = 20; // 2.0 cm from one end
notch_xB = 60; // 2.0 cm from the other end

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
