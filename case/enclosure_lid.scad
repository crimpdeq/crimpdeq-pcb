//
// Lid enclosure part
// - corner screw holes aligned with enclosure_main.scad
// - U cutouts aligned with main part for load-cell hole access
//

$fn = 96;

/*** Assembly dimensions (mm) ***/
lc_L = 80;
lc_W = 40;
lc_T = 5;
bat_T = 7;
pcb_L = 64;
pcb_T = 5;
eye_d = 17;
eye_edge_start = 6;
eye_center_offset = eye_edge_start + eye_d / 2;

/*** Stack gaps from assembly.scad ***/
loadcell_to_battery_gap = 0;
battery_to_pcb_gap = 0;

/*** Enclosure parameters ***/
wall_t = 3;
lid_t = 3;

clear_x = 0.8;
rear_clear = 0.8;
front_clear = 0.8;
top_clear = 2;

eye_access_clear = 1.0;
u_cutout_clear = 2.0;

screw_clear_d = 2.8; // clearance for M2.5 screws
screw_corner_inset = wall_t + 4;

/*** Derived placement ***/
inner_x_min = -lc_L / 2 - clear_x;
inner_x_max = lc_L / 2 + clear_x;

inner_y_min = -pcb_L / 2 - rear_clear;
usb_front_y = pcb_L / 2; // connector flush with PCB edge (no overhang)
inner_y_max = usb_front_y + front_clear;

pcb_top_z = lc_T / 2 + loadcell_to_battery_gap + bat_T + battery_to_pcb_gap + pcb_T;
inner_z_max = pcb_top_z + top_clear;

outer_x_min = inner_x_min - wall_t;
outer_x_max = inner_x_max + wall_t;
outer_y_min = inner_y_min - wall_t;
outer_y_max = inner_y_max + wall_t;
outer_z_max = inner_z_max;

lid_z_min = outer_z_max;
lid_z_max = lid_z_min + lid_t;

eye_x1 = -lc_L / 2 + eye_center_offset;
eye_x2 = lc_L / 2 - eye_center_offset;
eye_access_d = eye_d + eye_access_clear;
u_cutout_z_d = eye_access_d + 2 * u_cutout_clear;
u_cutout_z_r = u_cutout_z_d / 2;
u_cutout_y_span = lc_W;

screw_x1 = outer_x_min + screw_corner_inset;
screw_x2 = outer_x_max - screw_corner_inset;
screw_y1 = outer_y_min + screw_corner_inset;
screw_y2 = outer_y_max - screw_corner_inset;

module block(min_v, max_v) {
    translate(min_v) cube(max_v - min_v, center = false);
}

module corner_holes(d, z0, z1) {
    hole_h = z1 - z0 + 0.2;
    hole_z = (z0 + z1) / 2;
    translate([screw_x1, screw_y1, hole_z]) cylinder(d = d, h = hole_h, center = true);
    translate([screw_x1, screw_y2, hole_z]) cylinder(d = d, h = hole_h, center = true);
    translate([screw_x2, screw_y1, hole_z]) cylinder(d = d, h = hole_h, center = true);
    translate([screw_x2, screw_y2, hole_z]) cylinder(d = d, h = hole_h, center = true);
}

module eye_u_cutout(eye_x, open_left = true) {
    linear_extrude(height = u_cutout_y_span, center = true)
        union() {
            translate([eye_x, 0])
                circle(d = u_cutout_z_d);

            if (open_left) {
                translate([outer_x_min - 0.2, -u_cutout_z_r])
                    square([eye_x - (outer_x_min - 0.2), u_cutout_z_d]);
            } else {
                translate([eye_x, -u_cutout_z_r])
                    square([(outer_x_max + 0.2) - eye_x, u_cutout_z_d]);
            }
        }
}

module lid_part() {
    difference() {
        block(
            [outer_x_min, outer_y_min, lid_z_min],
            [outer_x_max, outer_y_max, lid_z_max]
        );
        corner_holes(screw_clear_d, lid_z_min, lid_z_max);
        eye_u_cutout(eye_x1, open_left = true);
        eye_u_cutout(eye_x2, open_left = false);
    }
}

lid_part();
