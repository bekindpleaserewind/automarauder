// import modules
// caution: `eventLoop` HAS to be imported before `gui`, and `gui` HAS to be
// imported before any `gui` submodules.
import * as eventLoop from "@next-flip/fz-sdk-mntm/event_loop";
import * as gui from "@next-flip/fz-sdk-mntm/gui";
import * as dialog from "@next-flip/fz-sdk-mntm/gui/dialog";
import * as textInput from "@next-flip/fz-sdk-mntm/gui/text_input";
import * as submenu from "@next-flip/fz-sdk-mntm/gui/submenu";
import * as serial from "@next-flip/fz-sdk-mntm/serial";

//////////////////////
// Global variables //
//////////////////////

// Serial
let serial_port_open: boolean = false;

// ScanAP
export interface scanApInfoObj {
    ssid: string;
    channels: number[];
    view: Object;
}

export interface scanApSsidToChannelObj {
    ssid: string;
    channels: number[];
}

let scanApTimeout: number = 5;
let scanApRunning: boolean = false;
let scanApOneshot: eventLoop.Subscription = null;
let scanApChannelInfoOneshot: eventLoop.Subscription = null;
let scanApNoResultSubscription: eventLoop.Subscription = null;
let scanApDynamicShowSubscription: eventLoop.Subscription = null;
let scanApSsidInfo: string[] = [];
let scanApSsidList: string[] = [];
let scanApSsidObjects = {};
let scanApDisplayChannelInfoSubs: Object[] = [];

// System
let backButtonEvents: eventLoop.Subscription = null;
let new_views: any[] = [];

// Core
const views = {
    root: submenu.makeWith({}, [
        "Scanning",
        "Deauth Sniff PMKID",
        "Configure"
    ]),
    configure: submenu.makeWith({}, [
        "Random MAC Spoofing",
    ]),
    scan_ap_confirm: dialog.makeWith({
        header: "Scan Access Points",
        text: "Scan for APs",
        center: "Start",
    }),
    scan_ap_start: dialog.makeWith({
        header: "Scanning",
        text: "Scanning for APs...",
        center: "Stop",
    }),
    scan_ap_dynamic_show: null,
    scan_ap_configure: textInput.makeWith({
        minLength: 1,
        maxLength: 4,
        header: "Scan AP Timeout",
        defaultText: "5",
        defaultTextClear: false,
    }),
    scan_ap_no_results: dialog.makeWith({
        text: "No Access Points Found",
        center: "Back",
    }),
    deauth_sniff_pmkid_confirm: dialog.makeWith({
        header: "Deauth and Sniff PMKID",
        text: "Deauth clients and sniff PMKID.",
        center: "Start"
    }),
    deauth_sniff_pmkid_start: dialog.makeWith({
        header: "Deauth and sniff PMKID",
        text: "Sending deauth and sniffing...",
        center: "Stop",
    }),
};

///////////////
// Functions //
///////////////

// Serial
function serial_open() {
    serial.setup("usart", 115200);
    serial_port_open = true;
}

function serial_read() {
    let c = serial.readAny();
    let data = c;

    while(c && c.length > 0) {
        c = serial.readAny();
        if(c) {
            data = data + c;
        }
    }

    return(data);
}

function serial_expect(pattern) : string {
    let data: string;
    if(serial.expect(pattern) === 0) {
        data = serial_read();
    }
    return(data);
}

function serial_write(str) {
    serial.write(str + "\n");
}

function serial_close() {
    serial.end();
    serial_port_open = false;
}

// ScanAP
function scanApStart() {
    if(serial_port_open) {
        serial_close();
    }

    if(!scanApRunning) {
        scanApRunning = true;

        if(scanApOneshot) {
            scanApOneshot.cancel();
            scanApOneshot = null;
        }

        serial_open()
        serial_write("scanap")

        scanApOneshot = eventLoop.subscribe(eventLoop.timer("oneshot", scanApTimeout * 1000), function(sub) {
            if(scanApRunning) {
                scanApStop();
                scanApGetChannelInfo();
            }
        }, eventLoop);
    }
}

function scanApStop() {
    if(scanApRunning && serial_port_open) {
        serial_write("stopscan");
        scanApRunning = false;
    }
}

function scanApGetChannelInfo() {
    if(!scanApRunning && serial_port_open) {
        // clear buffer
        serial_read();

        // send command
        serial_write("list -a");

        if(scanApChannelInfoOneshot) {
            scanApChannelInfoOneshot.cancel();
            scanApChannelInfoOneshot = null;
        }

        // process results after 2 seconds to ensure data is buffered
        scanApChannelInfoOneshot = eventLoop.subscribe(eventLoop.timer("oneshot", 2000), function(sub) {
            let data: string = serial_expect("list -a");
            let lines: string[] = splitByNewLine(data);
            let tmp_aps: string[] = [];
            let tmp_all_ssids: string[] = [];

            // init 2.4 GHz
            for(let i = 0; i < 14; i++) {
                tmp_aps[i] = [];
            }

            // pull out channel and ssid from each line
            for(let i = 0; i < lines.length; i++) {
                let start: number = lines[i].indexOf(']');

                if(start !== -1) {
                    let line: string = lines[i].slice(++start);
                    let c: number = line.indexOf(']');
                    let channel: number = parseInt(line.slice(4, c));
                    c += 2;

                    line = line.slice(c);
                    c = line.indexOf(' ');
                    let ssid: string = line.slice(0, ++c);

                    tmp_aps[channel].push(ssid);
                    tmp_all_ssids.push(ssid);
                }
            }

            // build list of ssid to channels mappings
            scanApSsidInfo = [];

            for(let channel = 0; channel < tmp_aps.length; channel++) {
                let first = true;
                let ssids: string[] = removeListDups(tmp_aps[channel]);

                for(let ssid_index = 0; ssid_index < ssids.length; ssid_index++) {
                    if(first) {
                        scanApSsidInfo[ssids[ssid_index]] = [channel];
                    } else {
                        scanApSsidInfo[ssids[ssid_index]].push(channel);
                    }
                }

                first = false;
            }

            scanApSsidObjects = [];

            for(let ssid in scanApSsidInfo) {
                let channels: number[] = scanApSsidInfo[ssid];
                let channel_string: string = '';
                let first: boolean = true;

                for(let i = 0; i < channels.length; i++) {
                    if(first) {
                        channel_string = channels[i].toString();
                        first = false;
                    } else {
                        channel_string = channel_string + ", " + channels[i].toString();
                    }
                }

                let obj: scanApInfoObj = {
                    channels: channels,
                    ssid: ssid,
                    view: dialog.makeWith({
                        text: "SSID: " + ssid + "\nChannels: " + channel_string,
                        center: "Okay",
                    }), 
                };

                scanApSsidObjects[ssid] = obj;
            }

            // save a master list of ssids found during this scan
            scanApSsidList = removeListDups(tmp_all_ssids);

            serial_close();

            scanApDisplayChannelInfo();
        }, eventLoop);
    }
}

function scanApDisplayChannelInfo() {
    views.scan_ap_dynamic_show = submenu.makeWith({}, scanApSsidList);

    // Reset information views for each SSID
    if(scanApDisplayChannelInfoSubs.length > 0) {
        for(let index = 0; index < scanApDisplayChannelInfoSubs.length; index++) {
            scanApDisplayChannelInfoSubs[index].cancel();
        }
        scanApDisplayChannelInfoSubs = [];
    }

    // Build information views for each SSID
    new_views = [];

    for(let ssid in scanApSsidObjects) {
        new_views.push([scanApSsidObjects[ssid].view, views.scan_ap_dynamic_show])
        let sub = eventLoop.subscribe(scanApSsidObjects[ssid].view.input, function(subscription, button: string, _gui) {
            if(button === "center") {
                scanApStop();
                if(serial_port_open) {
                    serial_close();
                }
                gui.viewDispatcher.switchTo(views.scan_ap_dynamic_show);
            }
        }, eventLoop);
        scanApDisplayChannelInfoSubs.push(sub);
    }

    configureBackButton();

    if(scanApSsidList.length === 0) {
        if(scanApNoResultSubscription) {
            scanApNoResultSubscription.cancel();
            scanApNoResultSubscription = null;
        }
        scanApNoResultSubscription = eventLoop.subscribe(views.scan_ap_no_results.input, function(subscription, button, _gui) {
            if(button === "center") {
                scanApStop()
                if(serial_port_open) {
                    serial_close();
                }
                gui.viewDispatcher.switchTo(views.scan_ap_confirm);
            }
        }, eventLoop);
        gui.viewDispatcher.switchTo(views.scan_ap_no_results);
    } else {
        scanApDynamicShowSubscription = eventLoop.subscribe(views.scan_ap_dynamic_show.chosen, function(sub, index: number, eventLoop) {
            let ssid = scanApSsidList[index];
            gui.viewDispatcher.switchTo(scanApSsidObjects[ssid].view)
        }, eventLoop);

        gui.viewDispatcher.switchTo(views.scan_ap_dynamic_show);
    }
}

// Deauthed PMKID sniffing
function deauth_sniff_pmkid_start() {
    print("TBD")
}

function deauth_sniff_pmkid_stop() {
    print("TBD")
}

// Utilities
function splitByNewLine(str: string): string[] {
    const lines: string[] = [];
    let start = 0;
    
    let nextNewline = str.indexOf('\r\n');
    
    while (nextNewline !== -1) {
        lines.push(str.slice(start, nextNewline));
        start = nextNewline + 1;
        nextNewline = str.indexOf('\r\n', start);
    }
    
    lines.push(str.slice(start));
    return lines;
}

function removeListDups(list: string[]) {
    let found: boolean = false;
    let out: string[] = [];

    for(let i = 0; i < list.length; i++) {
        let tmp: string = list[i];
        found = false;

        for(let t = 0; t < out.length; t++) {
            if(tmp === out[t]) {
                found = true;
                break;
            }
        }

        if(!found) {
            out.push(tmp);
        }
    }

    return(out);
}

// system
function configureBackButton() {
    if(backButtonEvents) {
        backButtonEvents.cancel();
        backButtonEvents = null;
    }

    backButtonEvents = eventLoop.subscribe(gui.viewDispatcher.navigation, function(_sub, _item, eventLoop) {
        let found = false

        for(let i = 0; i < new_views.length; i++) {
            if(gui.viewDispatcher.currentView === new_views[i][0]) {
                found = true
                gui.viewDispatcher.switchTo(new_views[i][1]);
            }
        }

        // run globals
        if(!found) {
            if(
                gui.viewDispatcher.currentView === views.configure ||
                gui.viewDispatcher.currentView === views.scan_ap_confirm || 
                gui.viewDispatcher.currentView === views.deauth_sniff_pmkid_confirm 
            ) {
                scanApStop();
                if(serial_port_open) {
                    serial_close();
                }
                gui.viewDispatcher.switchTo(views.root);
            } else if(gui.viewDispatcher.currentView === views.scan_ap_configure) {
                gui.viewDispatcher.switchTo(views.configure);
            } else if(gui.viewDispatcher.currentView === views.scan_ap_start) {
                scanApStop();
                if(serial_port_open) {
                    serial_close();
                }
                gui.viewDispatcher.switchTo(views.scan_ap_confirm); 
            } else if(gui.viewDispatcher.currentView === views.deauth_sniff_pmkid_start) {
                deauth_sniff_pmkid_stop();
                gui.viewDispatcher.switchTo(views.deauth_sniff_pmkid_confirm);
            } else if(gui.viewDispatcher.currentView === views.scan_ap_dynamic_show) {
                gui.viewDispatcher.switchTo(views.scan_ap_confirm);
            } else if(gui.viewDispatcher.currentView === views.scan_ap_no_results) {
                scanApStop();
                if(serial_port_open) {
                    serial_close();
                }
                gui.viewDispatcher.switchTo(views.scan_ap_confirm);
            } else {
                eventLoop.stop();
            }
        }
    }, eventLoop);
}

///////////////////////////
// ScanAP                //
///////////////////////////
// Scan for APs and list //
///////////////////////////

// confirm
eventLoop.subscribe(views.scan_ap_confirm.input, function(subscription, button, _gui) {
    if(button === "center") {
        gui.viewDispatcher.switchTo(views.scan_ap_start);
        scanApStart();
    }
}, eventLoop);


// start
eventLoop.subscribe(views.scan_ap_start.input, function(sub, button, _gui) {
    if(button === "center") {
        scanApStop();
        if(serial_port_open) {
            serial_close();
        }
        gui.viewDispatcher.switchTo(views.scan_ap_confirm);
    }
}, eventLoop);

////////////////////////////
// Deauth and sniff PMKID //
////////////////////////////

// start
eventLoop.subscribe(views.deauth_sniff_pmkid_confirm.input, function(subscription, button, _gui) {
    if(button === "center") {
        deauth_sniff_pmkid_start();
        gui.viewDispatcher.switchTo(views.deauth_sniff_pmkid_start);
    }
}, eventLoop);

// stop
eventLoop.subscribe(views.deauth_sniff_pmkid_start.input, function(sub, button, _gui) {
    if(button === "center") {
        deauth_sniff_pmkid_stop();
        gui.viewDispatcher.switchTo(views.deauth_sniff_pmkid_confirm);
    }
}, eventLoop);

///////////////
// Configure //
///////////////

eventLoop.subscribe(views.configure.chosen, function(sub, index, eventLoop) {
    if(index === 0) {
        print("TBD");
    } else if(index == 1) {
        gui.viewDispatcher.switchTo(views.scan_ap_configure);
    }
}, eventLoop);

eventLoop.subscribe(views.scan_ap_configure.input, function(sub, str) {
    gui.viewDispatcher.switchTo(views.configure);
});

// main
configureBackButton();

eventLoop.subscribe(views.root.chosen, function (subscription, index, eventLoop) {
    if(index === 0) {
        gui.viewDispatcher.switchTo(views.scan_ap_confirm);
    } else if(index === 1) {
        gui.viewDispatcher.switchTo(views.deauth_sniff_pmkid_confirm);
    } else if(index === 2) {
        gui.viewDispatcher.switchTo(views.configure);
    }
}, eventLoop);

// Handle back button presses for various menus

// run app
gui.viewDispatcher.switchTo(views.root);
eventLoop.run();
