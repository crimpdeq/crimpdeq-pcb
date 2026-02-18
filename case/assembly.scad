//
// Crimpdeq assembly: load cell + battery + PCB
// Units: mm
//

use <load_cell.scad>
use <battery.scad>
use <pcb.scad>

$fn = 96;

// Local placement dimensions (kept here to avoid coupling to source files).
lc_T = 5;

bat_T = 7;
pcb_T = 5;
bat_L = 50;
pcb_L = 64;

loadcell_to_battery_gap = 0;
battery_to_pcb_gap = 0;
battery_align_side = -1; // 1: align to +Y PCB edge, -1: align to -Y edge
battery_y_offset = battery_align_side * (pcb_L - bat_L) / 2;

module loadcell_model() {
    color("silver")
        linear_extrude(height = lc_T, center = true)
            loadcell_2d();
}

module full_assembly() {
    loadcell_model();

    // Battery laying flat on top of the load cell.
    translate([0, battery_y_offset, lc_T/2 + loadcell_to_battery_gap + bat_T/2])
        battery_model(rounded = true);

    // PCB laying flat on top of the battery.
    translate([0, 0, lc_T/2 + loadcell_to_battery_gap + bat_T + battery_to_pcb_gap + pcb_T/2])
        pcb_model(show_usb = true);
}

full_assembly();
