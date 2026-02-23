//
// Lid enclosure part
// - corner screw holes aligned with enclosure_main.scad
// - U cutouts aligned with main part for load-cell hole access
// - load-cell vertical hold-down features
//

include <dimensions.scad>

$fn = 96;

/*** Enclosure parameters ***/
wall_t = 3;
lid_t = 3;
corner_r = 6;

eye_access_clear = 1.0;
u_cutout_clear = 2.0;

loadcell_hold_down_clear = 0.3;
loadcell_hold_down_w = 22.6;
loadcell_hold_down_d = 8;
// Center shifted inward so widened hold-downs stay inside the main cavity side walls.
loadcell_hold_down_edge_offset = 11.6;
loadcell_hold_down_y_offset = 8;

screw_clear_d = 2.8; // clearance for M2.5 screws
screw_head_d = 5.2; // typical M2.5 button/pan head clearance
screw_head_recess = 1.8; // recess depth so heads do not protrude

// Alignment tabs (underside) that register in the main cavity.
// Intentionally only on front/rear walls so the side U-access zone stays clear.
align_lip_enable = true;
align_lip_h = 1.2;
align_lip_t = 1.0;
align_lip_clear = 0.4; // extra fit margin for print tolerances / elephant foot
align_lip_front_back_len = 24;

// Battery anti-slip tabs on lid underside (engage battery front corners when assembled).
// Placed outside PCB width so they can extend down without colliding with the PCB.
battery_front_stop_enable = true;
battery_front_stop_t = 1.2;
battery_front_stop_w = 3.0;
battery_front_stop_x_inset = 0.5;
battery_front_stop_y_clear = 0.3;
battery_front_stop_z_overlap = bat_T / 2; // reach about mid battery thickness

led_view_d = 2.6;

brand_text = "Crimpdeq";
brand_font = "Inter:style=Bold";
brand_size = 9.5;
brand_depth = 0.8;

/*** Derived placement ***/
inner_x_min = -lc_L / 2 - clear_x;
inner_x_max = lc_L / 2 + clear_x;

inner_y_min = -pcb_L / 2 - rear_clear;
usb_front_y = pcb_L / 2; // connector flush with PCB edge (no overhang)
inner_y_max = usb_front_y + front_clear;

loadcell_center_z = loadcell_lift;
loadcell_top_z = loadcell_center_z + lc_T / 2;
pcb_top_z = loadcell_top_z + loadcell_to_battery_gap + bat_T + battery_to_pcb_gap + pcb_T;
inner_z_max = pcb_top_z + top_clear;

outer_x_min = inner_x_min - wall_t;
outer_x_max = inner_x_max + wall_t;
outer_y_min = inner_y_min - wall_t;
outer_y_max = inner_y_max + wall_t;
outer_z_max = inner_z_max;

lid_z_min = outer_z_max;
lid_z_max = lid_z_min + lid_t;
brand_y = 0; // centered between U cutouts

hold_down_target_z = loadcell_top_z + loadcell_hold_down_clear;
hold_down_h = lid_z_min - hold_down_target_z;
hold_down_x = lc_L / 2 - loadcell_hold_down_edge_offset;

eye_x1 = -lc_L / 2 + eye_center_offset;
eye_x2 = lc_L / 2 - eye_center_offset;
eye_access_d = eye_d + eye_access_clear;
u_cutout_z_d = eye_access_d + 2 * u_cutout_clear;
u_cutout_z_r = u_cutout_z_d / 2;
u_cutout_y_span = lc_W;

pcb_y_offset = front_clear - pcb_front_gap;
battery_y_offset = inner_y_min + battery_rear_gap + bat_L / 2;
battery_top_z = loadcell_top_z + loadcell_to_battery_gap + bat_T;
battery_front_y = battery_y_offset + bat_L / 2;

screw_x1 = outer_x_min + screw_corner_inset;
screw_x2 = outer_x_max - screw_corner_inset;
screw_y1 = outer_y_min + screw_corner_inset;
screw_y2 = outer_y_max - screw_corner_inset;
head_recess_depth = max(0, min(screw_head_recess, lid_t - 0.6));
align_lip_h_eff = align_lip_enable ? max(0, min(align_lip_h, top_clear - 0.4)) : 0;
battery_front_stop_x = bat_W / 2 - battery_front_stop_x_inset - battery_front_stop_w / 2;
battery_front_stop_y = battery_front_y + battery_front_stop_y_clear + battery_front_stop_t / 2;
battery_front_stop_h = battery_front_stop_enable
    ? max(0, lid_z_min - (battery_top_z - battery_front_stop_z_overlap))
    : 0;
led_x = pcb_W / 2 - led_from_left;
led_y = pcb_y_offset + pcb_L / 2 - led_from_usb_side;

assert(!battery_front_stop_enable || battery_front_stop_w > 0,
    "battery_front_stop_w must be > 0.");
assert(hold_down_x + loadcell_hold_down_w / 2 <= inner_x_max + 0.001,
    str("Load-cell hold-downs overlap main side wall by ",
        hold_down_x + loadcell_hold_down_w / 2 - inner_x_max, " mm (X)."));
assert(hold_down_x - loadcell_hold_down_w / 2 >= bat_W / 2 - 0.001,
    str("Load-cell hold-downs overlap battery by ",
        bat_W / 2 - (hold_down_x - loadcell_hold_down_w / 2), " mm (X)."));
assert(!battery_front_stop_enable || battery_front_stop_h <= 0
    || battery_front_stop_x - battery_front_stop_w / 2 >= pcb_W / 2 + 0.2,
    "Battery front stop tabs must stay outside PCB width.");

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

module each_corner(z_pos) {
    for (x = [screw_x1, screw_x2])
        for (y = [screw_y1, screw_y2])
            translate([x, y, z_pos])
                children();
}

module corner_holes(d, z0, z1) {
    hole_h = z1 - z0 + 0.2;
    if (hole_h > 0) {
        hole_z = (z0 + z1) / 2;
        each_corner(hole_z)
            cylinder(d = d, h = hole_h, center = true);
    }
}

module corner_head_recesses(d, depth) {
    if (depth > 0) {
        recess_h = depth + 0.2;
        recess_z = lid_z_max - depth / 2 + 0.1;
        each_corner(recess_z)
            cylinder(d = d, h = recess_h, center = true);
    }
}

module led_view_hole() {
    translate([led_x, led_y, lid_z_min - 0.1])
        cylinder(d = led_view_d, h = lid_t + 0.3, center = false);
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

module loadcell_hold_downs() {
    hold_down_z = hold_down_target_z + hold_down_h / 2;

    for (x_sign = [-1, 1])
        // Keep the center open so the load-cell eye holes remain fully accessible.
        for (y_off = [-loadcell_hold_down_y_offset, loadcell_hold_down_y_offset])
            translate([x_sign * hold_down_x, y_off, hold_down_z])
                cube([loadcell_hold_down_w, loadcell_hold_down_d, hold_down_h], center = true);
}

module lid_alignment_lips() {
    lip_h = align_lip_h_eff;
    if (lip_h > 0 && align_lip_t > 0) {
        lip_z = lid_z_min - lip_h / 2;

        // Front/rear tabs locate the lid without adding geometry in the side U-access zone.
        for (y_sign = [-1, 1]) {
            y_pos = (y_sign > 0)
                ? inner_y_max - align_lip_clear - align_lip_t / 2
                : inner_y_min + align_lip_clear + align_lip_t / 2;

            translate([0, y_pos, lip_z])
                cube([align_lip_front_back_len, align_lip_t, lip_h], center = true);
        }
    }
}

module battery_front_stops() {
    if (battery_front_stop_h > 0 && battery_front_stop_t > 0 && battery_front_stop_w > 0) {
        stop_z = lid_z_min - battery_front_stop_h / 2;

        for (x_sign = [-1, 1])
            translate([x_sign * battery_front_stop_x, battery_front_stop_y, stop_z])
                cube([battery_front_stop_w, battery_front_stop_t, battery_front_stop_h], center = true);
    }
}

module brand_engrave_lid() {
    // Carved on outer top face (same plane as load cell), horizontal and centered.
    translate([0, brand_y, lid_z_max - brand_depth - 0.1])
        linear_extrude(height = brand_depth + 0.2, center = false)
            rotate([0, 0, 90])
                text(brand_text, size = brand_size, font = brand_font, halign = "center", valign = "center");
}

module lid_part() {
    difference() {
        union() {
            rounded_block_xy(
                [outer_x_min, outer_y_min, lid_z_min],
                [outer_x_max, outer_y_max, lid_z_max],
                corner_r
            );
            lid_alignment_lips();
            battery_front_stops();
            if (hold_down_h > 0) {
                loadcell_hold_downs();
            }
        }
        corner_holes(screw_clear_d, lid_z_min - align_lip_h_eff, lid_z_max);
        corner_head_recesses(screw_head_d, head_recess_depth);
        led_view_hole();
        translate([0, 0, lid_z_min]) eye_u_cutout(eye_x1, open_left = true);
        translate([0, 0, lid_z_min]) eye_u_cutout(eye_x2, open_left = false);
        // Brand engraving on outer top face.
        brand_engrave_lid();
    }
}

lid_part();
