//
// PCB model with USB-C connector
// Units: mm
//

$fn = 64;

/*** PCB PARAMETERS ***/
pcb_L = 64;   // 6.4 cm (long axis)
pcb_W = 24;   // 2.4 cm
pcb_T = 5;    // 0.5 cm thickness

// USB-C connector (simplified envelope)
usb_w = 9;    // width of connector housing
usb_h = 3.2;  // height of connector housing
usb_d = 7;    // depth of connector housing (how far it sticks out)
usb_inset = 3.2; // how much connector is embedded into PCB from top face

// LED placement
led_from_left = 5;
led_from_usb_side = 15;
led_w = 1.6;
led_l = 0.8;
led_h = 0.8;
led_rot_z = 90;

module pcb_model(show_usb=true) {
    assert(usb_inset >= 0 && usb_inset <= pcb_T, "usb_inset must be between 0 and pcb_T");

    usb_x = 0;
    usb_y = pcb_L/2 - usb_d/2;               // flush to PCB edge (no overhang)
    usb_z = pcb_T/2 + usb_h/2 - usb_inset;   // recessed into PCB by usb_inset

    pcb_usb_pocket_z = pcb_T/2 - usb_inset/2;
    led_x = pcb_W/2 - led_from_left;
    led_y = pcb_L/2 - led_from_usb_side;
    led_z = pcb_T/2 + led_h/2;

    union() {

        // PCB body (centered)
        color("green")
            difference() {
                cube([pcb_W, pcb_L, pcb_T], center=true);

                if (show_usb && usb_inset > 0) {
                    translate([usb_x, usb_y, pcb_usb_pocket_z])
                        cube([usb_w, usb_d, usb_inset + 0.02], center=true);
                }
            }

        // USB-C connector block
        if (show_usb) {
            translate([
                usb_x,
                usb_y,
                usb_z
            ])
            color("silver")
                cube([usb_w, usb_d, usb_h], center=true);
        }

        // LED envelope on PCB top side.
        translate([led_x, led_y, led_z])
            color("yellow")
                rotate([0, 0, led_rot_z])
                    cube([led_w, led_l, led_h], center = true);
    }
}

// Render PCB
pcb_model();
