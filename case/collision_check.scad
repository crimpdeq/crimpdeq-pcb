// Collision/overlap checks for enclosure and assembly parts.
// Use with: openscad -D 'mode="main_lid"' -o /tmp/out.stl case/collision_check.scad

use <enclosure_main.scad>
use <enclosure_lid.scad>
use <load_cell.scad>
use <battery.scad>
use <pcb.scad>
include <dimensions.scad>

$fn = 64;

// Override from CLI with -D 'mode="..."'
mode = "main_lid";

battery_y_offset = -pcb_L / 2 - rear_clear + battery_rear_gap + bat_L / 2;
pcb_y_offset = front_clear - pcb_front_gap;
loadcell_center_z = loadcell_lift;
loadcell_top_z = loadcell_center_z + lc_T / 2;
switch_h_eff = (abs(switch_rot_y) % 180 == 90) ? switch_w : switch_h;
switch_x = 0;
switch_y = pcb_L / 2 + front_clear - switch_d / 2 - switch_clear;
switch_z = -lc_T / 2 + switch_h_eff / 2;

module asm_loadcell() {
    translate([0, 0, loadcell_center_z])
        linear_extrude(height = lc_T, center = true)
            loadcell_2d();
}

module asm_battery() {
    translate([0, battery_y_offset, loadcell_top_z + loadcell_to_battery_gap + bat_T / 2])
        battery_model(rounded = true);
}

module asm_pcb() {
    translate([0, pcb_y_offset, loadcell_top_z + loadcell_to_battery_gap + bat_T + battery_to_pcb_gap + pcb_T / 2])
        pcb_model(show_usb = true);
}

module asm_switch() {
    translate([switch_x, switch_y, switch_z])
        rotate([0, switch_rot_y, 0])
            cube([switch_w, switch_d, switch_h], center = true);
}

module asm_all() {
    union() {
        asm_loadcell();
        asm_battery();
        asm_pcb();
        asm_switch();
    }
}

if (mode == "main_lid") {
    intersection() { main_part(); lid_part(); }
} else if (mode == "main_lid_eps_up") {
    intersection() { main_part(); translate([0, 0, 0.01]) lid_part(); }
} else if (mode == "main_components") {
    intersection() { main_part(); asm_all(); }
} else if (mode == "main_loadcell") {
    intersection() { main_part(); asm_loadcell(); }
} else if (mode == "main_loadcell_eps_z_plus") {
    intersection() { main_part(); translate([0, 0, 0.05]) asm_loadcell(); }
} else if (mode == "main_battery") {
    intersection() { main_part(); asm_battery(); }
} else if (mode == "main_pcb") {
    intersection() { main_part(); asm_pcb(); }
} else if (mode == "main_pcb_eps_y_plus") {
    intersection() { main_part(); translate([0, 0.05, 0]) asm_pcb(); }
} else if (mode == "main_pcb_eps_yz_plus") {
    intersection() { main_part(); translate([0, 0.05, 0.05]) asm_pcb(); }
} else if (mode == "main_switch") {
    intersection() { main_part(); asm_switch(); }
} else if (mode == "lid_components") {
    intersection() { lid_part(); asm_all(); }
} else if (mode == "lid_loadcell") {
    intersection() { lid_part(); asm_loadcell(); }
} else if (mode == "lid_battery") {
    intersection() { lid_part(); asm_battery(); }
} else if (mode == "lid_pcb") {
    intersection() { lid_part(); asm_pcb(); }
} else if (mode == "lid_switch") {
    intersection() { lid_part(); asm_switch(); }
} else if (mode == "loadcell_battery") {
    intersection() { asm_loadcell(); asm_battery(); }
} else if (mode == "loadcell_pcb") {
    intersection() { asm_loadcell(); asm_pcb(); }
} else if (mode == "loadcell_switch") {
    intersection() { asm_loadcell(); asm_switch(); }
} else if (mode == "battery_pcb") {
    intersection() { asm_battery(); asm_pcb(); }
} else if (mode == "battery_pcb_eps_z_plus") {
    intersection() { asm_battery(); translate([0, 0, 0.05]) asm_pcb(); }
} else if (mode == "battery_switch") {
    intersection() { asm_battery(); asm_switch(); }
} else if (mode == "pcb_switch") {
    intersection() { asm_pcb(); asm_switch(); }
} else {
    echo(str("Unknown mode: ", mode));
}
