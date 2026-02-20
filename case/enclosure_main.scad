//
// Main enclosure part (base body)
// - USB-C opening
// - load-cell notch retention pins
// - load-cell eye access holes
// - corner threaded pilot holes for M2.5x10 screws
//

include <dimensions.scad>
use <assembly.scad>
use <enclosure_lid.scad>

$fn = 96;

/*** Enclosure parameters ***/
wall_t = 3;
floor_t = 3;
corner_r = 6;

eye_access_clear = 1.0;
notch_pin_clear = 0.2;
notch_pin_embed = 0.4;
notch_pin_top_clear = 1.0;
u_cutout_clear = 2.0;
loadcell_notch_guide_len = 7.5;
loadcell_notch_guide_w = 1.0;
loadcell_notch_guide_h = 4;
loadcell_notch_guide_clear = 0.2;

usb_clear_x = 1.2;
usb_clear_z = 1.2;
usb_hole_extra_w = 1.5;
usb_hole_h = 8.0;

screw_post_d = 6.5;
screw_thread_d = 2.15; // pilot for M2.5 thread-forming screws in plastic
screw_thread_depth = 7.0; // for M2.5x10 with ~3 mm lid thickness
screw_thread_tip_clear = 1.0;
screw_corner_inset = wall_t + 4;

switch_hole_w = (abs(switch_rot_y) % 180 == 90) ? switch_h : switch_w;
switch_hole_h = (abs(switch_rot_y) % 180 == 90) ? switch_w : switch_h;
switch_usb_gap = 0.6;

brand_text = "Crimpdeq";
brand_font = "Inter:style=Bold";
brand_size = 9.5;
brand_depth = 0.8;

// Parameters
show_assembly = true;
show_lid_preview = true;
lid_preview_z_offset = 0; // mm (1.5 cm above main part)
lid_preview_alpha = 0.8; // higher alpha = more opaque

/*** Derived placement ***/
inner_x_min = -lc_L / 2 - clear_x;
inner_x_max = lc_L / 2 + clear_x;

inner_y_min = -pcb_L / 2 - rear_clear;
usb_front_y = pcb_L / 2; // connector flush with PCB edge (no overhang)
inner_y_max = usb_front_y + front_clear;
brand_y = 0; // centered between U cutouts

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
inner_corner_r = max(0, corner_r - wall_t);

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
notch_pin_d = max(0.2, notch_d - notch_pin_clear);
notch_pin_h = 6;

pcb_center_z = lc_T / 2 + loadcell_to_battery_gap + bat_T + battery_to_pcb_gap + pcb_T / 2;
usb_center_z = pcb_center_z + (pcb_T / 2 + usb_h / 2 - usb_inset);
usb_hole_w = usb_w + 2 * usb_clear_x + usb_hole_extra_w;

screw_x1 = outer_x_min + screw_corner_inset;
screw_x2 = outer_x_max - screw_corner_inset;
screw_y1 = outer_y_min + screw_corner_inset;
screw_y2 = outer_y_max - screw_corner_inset;
max_thread_depth = max(0, (outer_z_max - outer_z_min) - screw_thread_tip_clear);
thread_depth = min(screw_thread_depth, max_thread_depth);

switch_x = 0;
switch_y = inner_y_max - switch_d / 2 - switch_clear;
switch_h_eff = (abs(switch_rot_y) % 180 == 90) ? switch_w : switch_h;
switch_z = inner_z_min + switch_h_eff / 2;
switch_hole_z_min = outer_z_min + switch_hole_h / 2;
switch_hole_z_pref = max(switch_z, switch_hole_z_min);
switch_hole_z_max = usb_center_z - usb_hole_h / 2 - switch_usb_gap - switch_hole_h / 2;
switch_hole_z = max(switch_hole_z_min, min(switch_hole_z_pref, switch_hole_z_max));
switch_y_min = switch_y - switch_d / 2;
loadcell_y_max = lc_W / 2;
switch_top_z = switch_z + switch_h_eff / 2;
pcb_bottom_z = lc_T / 2 + loadcell_to_battery_gap + bat_T + battery_to_pcb_gap;
switch_hole_usb_gap = usb_center_z - usb_hole_h / 2 - (switch_hole_z + switch_hole_h / 2);

assert(switch_y_min >= loadcell_y_max,
    str("Switch overlaps load cell by ", loadcell_y_max - switch_y_min, " mm (Y)."));
assert(switch_top_z <= pcb_bottom_z,
    str("Switch overlaps PCB by ", switch_top_z - pcb_bottom_z, " mm (Z)."));
assert(switch_hole_z_min <= switch_hole_z_max,
    "Switch opening cannot fit below USB opening without overlap.");
assert(switch_hole_usb_gap >= switch_usb_gap - 0.001,
    str("Switch/USB opening gap too small: ", switch_hole_usb_gap, " mm."));

module rounded_rect_2d(x_min, x_max, y_min, y_max, r) {
    w = x_max - x_min;
    h = y_max - y_min;
    rr = max(0, min(r, min(w, h) / 2 - 0.01));
    if (rr > 0) {
        translate([x_min + rr, y_min + rr])
            offset(r = rr)
                square([w - 2 * rr, h - 2 * rr], center = false);
    } else {
        translate([x_min, y_min])
            square([w, h], center = false);
    }
}

module rounded_block_xy(min_v, max_v, r) {
    translate([0, 0, min_v[2]])
        linear_extrude(height = max_v[2] - min_v[2], center = false)
            rounded_rect_2d(min_v[0], max_v[0], min_v[1], max_v[1], r);
}

module notch_pin(x, y) {
    translate([x, y, inner_z_min + notch_pin_h / 2 - notch_pin_embed])
        cylinder(d = notch_pin_d, h = notch_pin_h, center = true);
}

module notch_pins() {
    for (y = [notch_y1, notch_y2])
        notch_pin(notch_x2, y);
}

module loadcell_notch_guides() {
    guide_z = inner_z_min + loadcell_notch_guide_h / 2;
    guide_x = notch_x2 - loadcell_notch_guide_len / 2;
    guide_bottom_y = notch_y1 - loadcell_notch_guide_clear - loadcell_notch_guide_w / 2;
    guide_top_y = notch_y2 + loadcell_notch_guide_clear + loadcell_notch_guide_w / 2;

    translate([guide_x, guide_bottom_y, guide_z])
        cube([loadcell_notch_guide_len, loadcell_notch_guide_w, loadcell_notch_guide_h], center = true);
    translate([guide_x, guide_top_y, guide_z])
        cube([loadcell_notch_guide_len, loadcell_notch_guide_w, loadcell_notch_guide_h], center = true);
}

module each_corner(z_pos) {
    for (x = [screw_x1, screw_x2])
        for (y = [screw_y1, screw_y2])
            translate([x, y, z_pos])
                children();
}

module corner_thread_holes(d, z_top, depth) {
    if (depth > 0) {
        hole_h = depth + 0.2;
        hole_z = z_top - depth / 2 + 0.1;
        each_corner(hole_z)
            cylinder(d = d, h = hole_h, center = true);
    }
}

module corner_screw_posts(d, z0, z1) {
    post_h = z1 - z0;
    if (post_h > 0) {
        post_z = (z0 + z1) / 2;
        each_corner(post_z)
            cylinder(d = d, h = post_h, center = true);
    }
}

module eye_access_holes() {
    for (eye_x = [eye_x1, eye_x2])
        translate([eye_x, 0, outer_z_min - 0.1])
            cylinder(d = eye_access_d, h = floor_t + 0.3, center = false);
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

module brand_engrave_main() {
    // Carved on outer bottom face (same plane as load cell), horizontal and centered.
    translate([0, brand_y, outer_z_min - 0.1])
        linear_extrude(height = brand_depth + 0.2, center = false)
            // Mirrored so it reads correctly when viewed from outside.
            mirror([1, 0, 0])
                rotate([0, 0, 90])
                    text(brand_text, size = brand_size, font = brand_font, halign = "center", valign = "center");
}

module main_part() {
    difference() {
        union() {
            difference() {
                rounded_block_xy(
                    [outer_x_min, outer_y_min, outer_z_min],
                    [outer_x_max, outer_y_max, outer_z_max],
                    corner_r
                );
                rounded_block_xy(
                    [inner_x_min, inner_y_min, inner_z_min],
                    [inner_x_max, inner_y_max, outer_z_max + 0.1],
                    inner_corner_r
                );
            }

            notch_pins();
            loadcell_notch_guides();

            // Internal cylindrical bosses for screw engagement.
            corner_screw_posts(screw_post_d, outer_z_min, outer_z_max);
        }

        corner_thread_holes(screw_thread_d, outer_z_max, thread_depth);

        eye_access_holes();

        // U-shape side access for load-cell eye holes.
        eye_u_cutout(eye_x1, open_left = true);
        eye_u_cutout(eye_x2, open_left = false);

        // Internal cavity for side switch (KCD11, 10x15 face).
        translate([switch_x, switch_y, switch_z])
            rotate([0, switch_rot_y, 0])
                cube(
                    [switch_w + 2 * switch_clear, switch_d + 2 * switch_clear, switch_h + 2 * switch_clear],
                    center = true
                );

        // Side opening for switch face on +Y wall (USB side).
        translate([switch_x, inner_y_max + wall_t / 2, switch_hole_z])
            cube([switch_hole_w, wall_t + 0.3, switch_hole_h], center = true);

        translate([0, inner_y_max + wall_t / 2, usb_center_z])
            cube([usb_hole_w, wall_t + 0.3, usb_hole_h], center = true);

        // Brand engraving on outer bottom face.
        brand_engrave_main();
    }
}

main_part();
if (show_assembly) {
    %full_assembly();
}
if (show_lid_preview) {
    translate([0, 0, lid_preview_z_offset]) {
        // In preview, show lid with configurable opacity. For renders/exports, keep it as %.
        if ($preview) {
            color([0.8, 0.8, 0.8, lid_preview_alpha]) lid_part();
        } else {
            %lid_part();
        }
    }
}
