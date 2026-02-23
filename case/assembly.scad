//
// Crimpdeq assembly: load cell + battery + PCB
// Units: mm
//

use <load_cell.scad>
use <battery.scad>
use <pcb.scad>
include <dimensions.scad>

$fn = 96;

battery_y_offset = -pcb_L / 2 - rear_clear + battery_rear_gap + bat_L / 2;
pcb_y_offset = front_clear - pcb_front_gap;
loadcell_center_z = loadcell_lift;
loadcell_top_z = loadcell_center_z + lc_T / 2;
switch_h_eff = (abs(switch_rot_y) % 180 == 90) ? switch_w : switch_h;
switch_x = 0;
switch_y = pcb_L / 2 + front_clear - switch_d / 2 - switch_clear;
switch_z = -lc_T / 2 + switch_h_eff / 2; // sit on enclosure floor plane

loadcell_y_max = lc_W / 2;
switch_y_min = switch_y - switch_d / 2;
switch_top_z = switch_z + switch_h_eff / 2;
pcb_bottom_z = loadcell_top_z + loadcell_to_battery_gap + bat_T + battery_to_pcb_gap;

assert(switch_y_min >= loadcell_y_max,
    str("Switch overlaps load cell by ", loadcell_y_max - switch_y_min, " mm (Y)."));
assert(switch_top_z <= pcb_bottom_z,
    str("Switch overlaps PCB by ", switch_top_z - pcb_bottom_z, " mm (Z)."));

module loadcell_model() {
    color("silver")
        linear_extrude(height = lc_T, center = true)
            loadcell_2d();
}

module switch_model() {
    color("red")
        rotate([0, switch_rot_y, 0])
            cube([switch_w, switch_d, switch_h], center = true);
}

module full_assembly(show_pcb = true) {
    translate([0, 0, loadcell_center_z])
        loadcell_model();

    // Battery laying flat on top of the load cell.
    translate([0, battery_y_offset, loadcell_top_z + loadcell_to_battery_gap + bat_T/2])
        battery_model(rounded = true);

    if (show_pcb)
        // PCB laying flat on top of the battery.
        translate([0, pcb_y_offset, loadcell_top_z + loadcell_to_battery_gap + bat_T + battery_to_pcb_gap + pcb_T/2])
            pcb_model(show_usb = true);

    // Side switch inside enclosure.
    translate([switch_x, switch_y, switch_z])
        switch_model();
}

full_assembly();
