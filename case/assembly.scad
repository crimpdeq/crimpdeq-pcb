//
// Crimpdeq assembly: load cell + battery + PCB
// Units: mm
//

use <load_cell.scad>
use <battery.scad>
use <pcb.scad>

$fn = 96;

// Local placement dimensions (kept here to avoid coupling to source files).
lc_L = 80;
lc_T = 4;

bat_T = 7;
pcb_T = 5;
bat_L = 50;
pcb_L = 64;

loadcell_to_battery_gap = 0;
battery_to_pcb_gap = 0;
battery_align_side = -1; // 1: align to +Y PCB edge, -1: align to -Y edge
battery_y_offset = battery_align_side * (pcb_L - bat_L) / 2;
front_clear = 2.0;
switch_clear = 0.4;

// Switch block (W x D x H).
// Switch (KCD11 10X15mm)
// sw_W = 15;
// sw_D = 13;
// sw_H = 10;
// Switch (KCD1 15X20mm)
sw_W = 12;
sw_D = 15;
sw_H = 17;
sw_rot_y = 90;
sw_h_eff = (abs(sw_rot_y) % 180 == 90) ? sw_W : sw_H;

sw_x = 0;
sw_y = pcb_L/2 + front_clear - sw_D/2 - switch_clear;
sw_z = -lc_T/2 + sw_h_eff/2; // sit on enclosure floor plane

module loadcell_model() {
    color("silver")
        linear_extrude(height = lc_T, center = true)
            loadcell_2d();
}

module switch_model() {
    color("red")
        rotate([0, sw_rot_y, 0])
            cube([sw_W, sw_D, sw_H], center = true);
}

module full_assembly() {
    loadcell_model();

    // Battery laying flat on top of the load cell.
    translate([0, battery_y_offset, lc_T/2 + loadcell_to_battery_gap + bat_T/2])
        battery_model(rounded = true);

    // PCB laying flat on top of the battery.
    translate([0, 0, lc_T/2 + loadcell_to_battery_gap + bat_T + battery_to_pcb_gap + pcb_T/2])
        pcb_model(show_usb = true);

    // Side switch inside enclosure.
    translate([sw_x, sw_y, sw_z])
        switch_model();
}

full_assembly();
