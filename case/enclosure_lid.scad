//
// Lid enclosure part
// - corner screw holes aligned with enclosure_main.scad
// - U cutouts aligned with main part for load-cell hole access
// - load-cell vertical hold-down features
//

$fn = 96;

/*** Assembly dimensions (mm) ***/
lc_L = 80;
lc_W = 40;
lc_T = 5;
bat_T = 7;
bat_W = 34;
bat_L = 50;
pcb_L = 64;
pcb_W = 24;
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
front_clear = 2.0;
top_clear = 2;

eye_access_clear = 1.0;
u_cutout_clear = 2.0;

loadcell_hold_down_clear = 0.2;
loadcell_hold_down_w = 9;
loadcell_hold_down_d = 8;
loadcell_hold_down_edge_offset = 6;
loadcell_hold_down_y_offset = 8;

guide_rail_clear = 0.35;
guide_rail_t = 1.8;
pcb_guide_engage_h = 1.0;
battery_guide_engage_h = 1.0;

screw_clear_d = 2.8; // clearance for M2.5 screws
screw_head_d = 5.2; // typical M2.5 button/pan head clearance
screw_head_recess = 1.8; // recess depth so heads do not protrude
screw_corner_inset = wall_t + 4;

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

pcb_top_z = lc_T / 2 + loadcell_to_battery_gap + bat_T + battery_to_pcb_gap + pcb_T;
inner_z_max = pcb_top_z + top_clear;
battery_top_z = lc_T / 2 + loadcell_to_battery_gap + bat_T;

outer_x_min = inner_x_min - wall_t;
outer_x_max = inner_x_max + wall_t;
outer_y_min = inner_y_min - wall_t;
outer_y_max = inner_y_max + wall_t;
outer_z_max = inner_z_max;

lid_z_min = outer_z_max;
lid_z_max = lid_z_min + lid_t;
brand_y = 0; // centered between U cutouts

loadcell_top_z = lc_T / 2;
hold_down_target_z = loadcell_top_z + loadcell_hold_down_clear;
hold_down_h = lid_z_min - hold_down_target_z;

eye_x1 = -lc_L / 2 + eye_center_offset;
eye_x2 = lc_L / 2 - eye_center_offset;
eye_access_d = eye_d + eye_access_clear;
u_cutout_z_d = eye_access_d + 2 * u_cutout_clear;
u_cutout_z_r = u_cutout_z_d / 2;
u_cutout_y_span = lc_W;

battery_align_side = -1;
battery_y_offset = battery_align_side * (pcb_L - bat_L) / 2;

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

module corner_head_recesses(d, depth) {
    recess_h = depth + 0.2;
    recess_z = lid_z_max - depth / 2 + 0.1;
    translate([screw_x1, screw_y1, recess_z]) cylinder(d = d, h = recess_h, center = true);
    translate([screw_x1, screw_y2, recess_z]) cylinder(d = d, h = recess_h, center = true);
    translate([screw_x2, screw_y1, recess_z]) cylinder(d = d, h = recess_h, center = true);
    translate([screw_x2, screw_y2, recess_z]) cylinder(d = d, h = recess_h, center = true);
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
    hold_down_x = lc_L / 2 - loadcell_hold_down_edge_offset;
    hold_down_z = hold_down_target_z + hold_down_h / 2;

    // Center pair
    translate([ hold_down_x, 0, hold_down_z])
        cube([loadcell_hold_down_w, loadcell_hold_down_d, hold_down_h], center = true);
    translate([-hold_down_x, 0, hold_down_z])
        cube([loadcell_hold_down_w, loadcell_hold_down_d, hold_down_h], center = true);

    // Offset pairs
    translate([ hold_down_x,  loadcell_hold_down_y_offset, hold_down_z])
        cube([loadcell_hold_down_w, loadcell_hold_down_d, hold_down_h], center = true);
    translate([ hold_down_x, -loadcell_hold_down_y_offset, hold_down_z])
        cube([loadcell_hold_down_w, loadcell_hold_down_d, hold_down_h], center = true);
    translate([-hold_down_x,  loadcell_hold_down_y_offset, hold_down_z])
        cube([loadcell_hold_down_w, loadcell_hold_down_d, hold_down_h], center = true);
    translate([-hold_down_x, -loadcell_hold_down_y_offset, hold_down_z])
        cube([loadcell_hold_down_w, loadcell_hold_down_d, hold_down_h], center = true);
}

module component_side_rails(comp_w, comp_l, comp_y, comp_top_z, engage_h) {
    rail_h = lid_z_min - (comp_top_z - engage_h);
    if (rail_h > 0) {
        rail_z = lid_z_min - rail_h / 2;
        rail_x = comp_w / 2 + guide_rail_clear + guide_rail_t / 2;
        translate([ rail_x, comp_y, rail_z])
            cube([guide_rail_t, comp_l, rail_h], center = true);
        translate([-rail_x, comp_y, rail_z])
            cube([guide_rail_t, comp_l, rail_h], center = true);
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
            block(
                [outer_x_min, outer_y_min, lid_z_min],
                [outer_x_max, outer_y_max, lid_z_max]
            );
            if (hold_down_h > 0) {
                loadcell_hold_downs();
            }
            // Lateral confinement for PCB and battery.
            component_side_rails(pcb_W, pcb_L, 0, pcb_top_z, pcb_guide_engage_h);
            component_side_rails(bat_W, bat_L, battery_y_offset, battery_top_z, battery_guide_engage_h);
        }
        corner_holes(screw_clear_d, lid_z_min, lid_z_max);
        corner_head_recesses(screw_head_d, min(screw_head_recess, lid_t - 0.6));
        eye_u_cutout(eye_x1, open_left = true);
        eye_u_cutout(eye_x2, open_left = false);
        // Brand engraving on outer top face.
        brand_engrave_lid();
    }
}

lid_part();
