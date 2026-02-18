//
// Main enclosure part (base body)
// - USB-C opening
// - load-cell notch retention pins
// - load-cell eye access holes
// - corner threaded pilot holes for M2.5x10 screws
//

use <assembly.scad>

$fn = 96;

/*** Assembly dimensions (mm) ***/
// Load cell
lc_L = 80;
lc_W = 40;
lc_T = 5;

eye_d = 17;
eye_edge_start = 6;
eye_center_offset = eye_edge_start + eye_d / 2;

notch_d = 6;
notch_xA = 20;
notch_xB = 60;

// Battery + PCB stack
bat_T = 7;
pcb_L = 64;
pcb_T = 5;

usb_w = 9;
usb_h = 3.2;
usb_inset = 3.2;

// Switch (KCD11)
switch_w = 15;
switch_d = 13;
switch_h = 10;

/*** Stack gaps from assembly.scad ***/
// Load cell -> battery -> PCB vertical spacing
loadcell_to_battery_gap = 0;
battery_to_pcb_gap = 0;

/*** Enclosure parameters ***/
wall_t = 3;
floor_t = 3;

clear_x = 0.8;
rear_clear = 0.8;
front_clear = 2.0;
top_clear = 2;

eye_access_clear = 1.0;
notch_pin_clear = 0.2;
notch_pin_embed = 0.4;
notch_pin_top_clear = 1.0;
u_cutout_clear = 2.0;

loadcell_guide_clear = 0.3;
loadcell_guide_t = 1.8;
loadcell_guide_h = lc_T + 1.5;

usb_clear_x = 1.2;
usb_clear_z = 1.2;

screw_post_d = 6.5;
screw_thread_d = 2.15; // pilot for M2.5 thread-forming screws in plastic
screw_thread_depth = 7.0; // for M2.5x10 with ~3 mm lid thickness
screw_thread_tip_clear = 1.0;
screw_corner_inset = wall_t + 4;

switch_clear = 0.4;
switch_hole_w = 15; // KCD11 panel opening width (X), horizontal orientation
switch_hole_h = 10; // KCD11 panel opening height (Z), horizontal orientation

show_assembly = true;

/*** Derived placement ***/
inner_x_min = -lc_L / 2 - clear_x;
inner_x_max = lc_L / 2 + clear_x;

inner_y_min = -pcb_L / 2 - rear_clear;
usb_front_y = pcb_L / 2; // connector flush with PCB edge (no overhang)
inner_y_max = usb_front_y + front_clear;

inner_z_min = -lc_T / 2;
// Top of stacked electronics (battery + PCB) used to size enclosure height.
pcb_top_z = lc_T / 2 + loadcell_to_battery_gap + bat_T + battery_to_pcb_gap + pcb_T;
inner_z_max = pcb_top_z + top_clear;

outer_x_min = inner_x_min - wall_t;
outer_x_max = inner_x_max + wall_t;
outer_y_min = inner_y_min - wall_t;
outer_y_max = inner_y_max + wall_t;
outer_z_min = inner_z_min - floor_t;
outer_z_max = inner_z_max;

eye_x1 = -lc_L / 2 + eye_center_offset;
eye_x2 = lc_L / 2 - eye_center_offset;
eye_access_d = eye_d + eye_access_clear;
u_cutout_z_d = eye_access_d + 2 * u_cutout_clear;
u_cutout_z_r = u_cutout_z_d / 2;
u_cutout_y_span = lc_W;

notch_x1 = -lc_L / 2 + notch_xA;
notch_x2 = -lc_L / 2 + notch_xB;
notch_y1 = -lc_W / 2;
notch_y2 = lc_W / 2;
notch_pin_d = notch_d - notch_pin_clear;
notch_pin_h = outer_z_max - inner_z_min + notch_pin_embed - notch_pin_top_clear;

pcb_center_z = lc_T / 2 + loadcell_to_battery_gap + bat_T + battery_to_pcb_gap + pcb_T / 2;
usb_center_z = pcb_center_z + (pcb_T / 2 + usb_h / 2 - usb_inset);

screw_x1 = outer_x_min + screw_corner_inset;
screw_x2 = outer_x_max - screw_corner_inset;
screw_y1 = outer_y_min + screw_corner_inset;
screw_y2 = outer_y_max - screw_corner_inset;

switch_x = 0;
switch_y = inner_y_max - switch_d / 2 - switch_clear;
switch_z = inner_z_min + switch_h / 2;

module block(min_v, max_v) {
    translate(min_v) cube(max_v - min_v, center = false);
}

module notch_pin(x, y) {
    translate([x, y, inner_z_min + notch_pin_h / 2 - notch_pin_embed])
        cylinder(d = notch_pin_d, h = notch_pin_h, center = true);
}

module loadcell_side_guides() {
    guide_y = lc_W / 2 + loadcell_guide_clear + loadcell_guide_t / 2;
    guide_z = inner_z_min + loadcell_guide_h / 2;

    translate([0,  guide_y, guide_z])
        cube([lc_L, loadcell_guide_t, loadcell_guide_h], center = true);
    translate([0, -guide_y, guide_z])
        cube([lc_L, loadcell_guide_t, loadcell_guide_h], center = true);
}

module corner_thread_holes(d, z_top, depth) {
    hole_h = depth + 0.2;
    hole_z = z_top - depth / 2 + 0.1;
    translate([screw_x1, screw_y1, hole_z]) cylinder(d = d, h = hole_h, center = true);
    translate([screw_x1, screw_y2, hole_z]) cylinder(d = d, h = hole_h, center = true);
    translate([screw_x2, screw_y1, hole_z]) cylinder(d = d, h = hole_h, center = true);
    translate([screw_x2, screw_y2, hole_z]) cylinder(d = d, h = hole_h, center = true);
}

module corner_screw_posts(d, z0, z1) {
    post_h = z1 - z0;
    post_z = (z0 + z1) / 2;
    translate([screw_x1, screw_y1, post_z]) cylinder(d = d, h = post_h, center = true);
    translate([screw_x1, screw_y2, post_z]) cylinder(d = d, h = post_h, center = true);
    translate([screw_x2, screw_y1, post_z]) cylinder(d = d, h = post_h, center = true);
    translate([screw_x2, screw_y2, post_z]) cylinder(d = d, h = post_h, center = true);
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

module main_part() {
    difference() {
        union() {
            difference() {
                block(
                    [outer_x_min, outer_y_min, outer_z_min],
                    [outer_x_max, outer_y_max, outer_z_max]
                );
                block(
                    [inner_x_min, inner_y_min, inner_z_min],
                    [inner_x_max, inner_y_max, outer_z_max + 0.1]
                );
            }

            notch_pin(notch_x1, notch_y1);
            notch_pin(notch_x1, notch_y2);
            notch_pin(notch_x2, notch_y1);
            notch_pin(notch_x2, notch_y2);
            // Load cell anti-movement guides.
            loadcell_side_guides();

            // Internal cylindrical bosses for screw engagement.
            corner_screw_posts(screw_post_d, outer_z_min, outer_z_max);
        }

        corner_thread_holes(
            screw_thread_d,
            outer_z_max,
            min(
                screw_thread_depth,
                (outer_z_max - outer_z_min) - screw_thread_tip_clear
            )
        );

        translate([eye_x1, 0, outer_z_min - 0.1])
            cylinder(d = eye_access_d, h = floor_t + 0.3, center = false);
        translate([eye_x2, 0, outer_z_min - 0.1])
            cylinder(d = eye_access_d, h = floor_t + 0.3, center = false);

        // U-shape side access for load-cell eye holes.
        eye_u_cutout(eye_x1, open_left = true);
        eye_u_cutout(eye_x2, open_left = false);

        // Internal cavity for side switch (KCD11, 15x10 face, 13 depth).
        translate([switch_x, switch_y, switch_z])
            cube(
                [switch_w + 2 * switch_clear, switch_d + 2 * switch_clear, switch_h + 2 * switch_clear],
                center = true
            );

        // Side opening for switch face (15x10 mm) on +Y wall (USB side).
        translate([switch_x, inner_y_max + wall_t / 2, switch_z])
            cube([switch_hole_w, wall_t + 0.3, switch_hole_h], center = true);

        translate([0, inner_y_max + wall_t / 2, usb_center_z])
            cube([usb_w + 2 * usb_clear_x, wall_t + 0.3, usb_h + 2 * usb_clear_z], center = true);
    }
}

main_part();
if (show_assembly) {
    %full_assembly();
}
