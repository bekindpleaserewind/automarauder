// import modules
// caution: `eventLoop` HAS to be imported before `gui`, and `gui` HAS to be
// imported before any `gui` submodules.
import * as eventLoop from "@next-flip/fz-sdk-mntm/event_loop";
import * as gui from "@next-flip/fz-sdk-mntm/gui";
import * as dialog from "@next-flip/fz-sdk-mntm/gui/dialog";
import * as textInput from "@next-flip/fz-sdk-mntm/gui/text_input";
import * as submenu from "@next-flip/fz-sdk-mntm/gui/submenu";
import * as serial from "@next-flip/fz-sdk-mntm/serial";

// Interfaces
export interface ScanAPInfo {
    ssid: string;
    channels: number[];
    view: Object;
}

export interface ScanAPSsidToChannelObj {
    ssid: string;
    channels: number[];
}

export interface ScanAPApInfoObj {
    essid: string;
    bssid: string;
    channel: number;
    rssi: number;
    frames: number;
    stations: number;
    security: string;
}

/////////////
// Classes //
/////////////

// Utility Library
let UtilitiesClass = {
    splitByNewLine: function(str: string): string[] {
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
    },

    removeListDups: function(list: string[]) {
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
};

// System Library
let SystemClass = {
    init: function() {
        this.views = {};
        this.serial = _serial;
        this.scanap = _scanap;

        this.newViews = [];
        this.events = null;
    },

    setupBackButtons: function() {
        if(this.events) {
            this.events.cancel();
            this.events = null;
        }

        this.events = eventLoop.subscribe(gui.viewDispatcher.navigation, function(_sub, _item, eventLoop) {
            let found = false

            for(let i = 0; i < this.newViews.length; i++) {
                if(gui.viewDispatcher.currentView === this.newViews[i][0]) {
                    found = true
                    gui.viewDispatcher.switchTo(this.newViews[i][1]);
                }
            }

            // run globals
            if(!found) {
                if(
                    gui.viewDispatcher.currentView === this.views.getView("configure") ||
                    gui.viewDispatcher.currentView === this.views.getView("scan_ap_confirm") || 
                    gui.viewDispatcher.currentView === this.views.getView("deauth_sniff_pmkid_confirm") 
                ) {
                    this.scanap.stop();
                    if(this.serial.isOpen()) {
                        this.serial.close();
                    }
                    gui.viewDispatcher.switchTo(this.views.getView("root"));
                } else if(gui.viewDispatcher.currentView === this.views.getView("scan_ap_configure")) {
                    gui.viewDispatcher.switchTo(this.views.getView("configure"));
                } else if(gui.viewDispatcher.currentView === this.views.getView("scan_ap_start")) {
                    this.scanap.stop();
                    if(this.serial.isOpen()) {
                        this.serial.close();
                    }
                    gui.viewDispatcher.switchTo(this.views.getView("scan_ap_confirm")); 
                } else if(gui.viewDispatcher.currentView === this.views.getView("deauth_sniff_pmkid_start")) {
                    deauth_sniff_pmkid_stop();
                    gui.viewDispatcher.switchTo(this.views.getView("deauth_sniff_pmkid_confirm"));
                } else if(gui.viewDispatcher.currentView === this.views.scan_ap_show_ssid_list) {
                    gui.viewDispatcher.switchTo(this.views.scan_ap_confirm);
                } else if(gui.viewDispatcher.currentView === this.views.scan_ap_no_results) {
                    this.scanap.stop();
                    if(this.serial.isOpen()) {
                        this.serial.close();
                    }
                    gui.viewDispatcher.switchTo(this.views.scan_ap_confirm);
                } else {
                    eventLoop.stop();
                }
            }
        }, eventLoop);
    },

    setupViews: function(views: {}) {
        this.views = views;
    },

    getViewByObject: function<T, K extends keyof T>(obj: T, key: K): T[K] {
        return(obj[key]);
    },

    getView: function(key: string) {
        return(this.getViewByObject(this.views, key))
    },

    setView: function(key: string, view: Object) {
        this.views[key] = view;
    },
};

// Serial Library
let SerialClass = {
    init: function() {
        this.open = false;
    },

    open: function() {
        serial.setup("usart", 115200);
        this.open = true;
    },

    read: function() {
        let c = serial.readAny();
        let data = c;

        while(c && c.length > 0) {
            c = serial.readAny();
            if(c) {
                data = data + c;
            }
        }

        return(data);
    },

    expect: function(pattern) : string {
        let data: string;
        if(serial.expect(pattern) === 0) {
            data = this.read();
        }
        return(data);
    },

    write: function(str) {
        serial.write(str + "\n");
    },

    close: function() {
        serial.end();
        this.open = false;
    },

    isOpen: function() {
        return(this.open);
    }
};

// ScanAP Library
let ScanAPClass = {
    init: function() {
        this.utility = _utility;
        this.serial = _serial
        this.system = _system

        this.running = false
        this.timeout = 5;

        this.selectedSsid = null;
        this.ssidList = [];
        this.ssidObjects = {}
        this.displayChannelInfoSubs = {};
        this.noResultSubscription = null;

        this.startOneshot = null;
        this.channelInfoOneshot = null;
    },

    setTimeout: function(timeout: number) {
        this.timeout = timeout;
    },

    start: function() {
        if(this.serial.isOpen()) {
            this.serial.close();
        }

        if(!this.running) {
            this.running = true;

            if(this.startOneshot) {
                this.startOneshot.cancel();
                this.startOneshot = null;
            }

            this.serial.open()
            this.serial.write("scanap")

            this.startOneshot = eventLoop.subscribe(eventLoop.timer("oneshot", this.timeout * 1000), function(sub) {
                if(this.running) {
                    this.stop();
                    this.getInfo();
                }
            }, eventLoop);
        }
    },

    stop: function() {
        if(this.running && this.serial.isOpen()) {
            this.serial.write("stopscan");
            this.running = false;
        }
    },

    getApInfo: function(index: string) {
        if(!this.serial.isOpen()) {
            this.serial.open();
        }

        this.serial.write("info -a " + index);

        let data: string = this.serial.expect("info -a");
        let lines: string[] = this.utility.splitByNewLine(data);
        let info: ScanAPApInfoObj;

        for(let i = 0; i < lines.length; i++) {
            if(lines[i].indexOf('ESSID: ') >= 0) {
                // Get ESSID
                info.essid = lines[i].slice(7, );
            }

            let start: number = lines[i].indexOf()
        }
    },

    getInfo: function() {
        if(!this.running && this.serial.isOpen()) {
            // clear buffer
            this.serial.read();

            // send command
            this.serial.write("list -a");

            if(this.channelInfoOneshot) {
                this.channelInfoOneshot.cancel();
                this.channelInfoOneshot = null;
            }

            // process results after 2 seconds to ensure data is buffered
            this.channelInfoOneshot = eventLoop.subscribe(eventLoop.timer("oneshot", 2000), function(sub) {
                let data: string = this.serial.expect("list -a");
                let lines: string[] = this.utility.splitByNewLine(data);
                let tmp_aps: string[] = [];
                let tmp_all_ssids: string[] = [];

                // init 2.4 GHz
                for(let i = 0; i < 14; i++) {
                    tmp_aps[i] = [];
                }

                // pull out channel and ssid from each line
                for(let i = 0; i < lines.length; i++) {
                    let start: number = lines[i].indexOf(']');
                    let index = lines[i].slice(1, start);

                    if(start !== -1) {
                        let line: string = lines[i].slice(++start);
                        let c: number = line.indexOf(']');
                        let channel: number = parseInt(line.slice(4, c));
                        c += 2;

                        line = line.slice(c);
                        c = line.indexOf(' ');
                        let ssid: string = line.slice(0, ++c);

                        tmp_aps[channel].push({
                            ssid: ssid,
                            index: index,
                        });

                        tmp_all_ssids.push(ssid);
                    }
                }

                // build list of ssid to channels mappings
                let ssidInfo = [];

                for(let channel = 0; channel < tmp_aps.length; channel++) {
                    let first = true;
                    let ssids: string[] = this.utility.removeListDups(tmp_aps[channel]);

                    for(let ssid_index = 0; ssid_index < ssids.length; ssid_index++) {
                        if(first) {
                            ssidInfo[ssids[ssid_index].ssid] = [channel];
                        } else {
                            ssidInfo[ssids[ssid_index].ssid].push(channel);
                        }
                    }

                    first = false;
                }

                this.ssidObjects = {};

                for(let ssid in ssidInfo) {
                    let channels: number[] = ssidInfo[ssid];
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

                    let obj: ScanAPInfo = {
                        channels: channels,
                        ssid: ssid,
                        view: dialog.makeWith({
                            text: "SSID: " + ssid + "\nChannels: " + channel_string,
                            center: "Okay",
                        }), 
                    };

                    this.ssidObjects[ssid] = [obj];
                }

                // save a master list of ssids found during this scan
                this.ssidList = this.utility.removeListDups(tmp_all_ssids);

                this.serial.close();

                //scanApDisplayChannelInfo();
                print("Displaying SSIDs");
                this.displaySSIDs();
            }, eventLoop);
        }
    },

    displaySSIDs: function() {
        // Displays the list of APs scanned
        this.system.setView("scan_ap_show_ssid_list", submenu.makeWith({}, this.ssidList));

        // process chosen ssid from list of discovered APs
        eventLoop.subscribe(this.system.getView("scan_ap_show_ssid_list").chosen, function(sub, item) {
            this.selectedSsid = item;
            gui.viewDispatcher.switchTo(this.system.getView("views.scan_ap_options"));
        }, eventLoop);

        // process chosen ssid option
        eventLoop.subscribe(this.system.getView("scan_ap_options").chosen, function(sub, item) {});
        gui.viewDispatcher.switchTo(this.system.getView("scan_ap_show_ssid_list"));
    },

    displayChannelInfo: function() {
        // Reset information views for each SSID
        for(let ssid in this.displayChannelInfoSubs) {
            this.displayChannelInfoSubs[ssid].cancel();
        }
        this.displayChannelInfoSubs = {};

        // Build information views for each SSID
        this.newViews = [];

        for(let ssid in this.ssidObjects) {
            this.newViews.push([this.ssidObjects[ssid][0].view, this.system.getView("scan_ap_options")])
            let sub = eventLoop.subscribe(this.ssidObjects[ssid][0].view.input, function(subscription, button: string, _gui) {
                if(button === "center") {
                    this.stop();
                    if(this.serial.isOpen()) {
                        this.serial.close();
                    }

                    // we do this elsewhere now
                    // need to figure out what to replace with
                    //gui.viewDispatcher.switchTo(_system.views.scan_ap_show_ssid_list);
                }
            }, eventLoop);
            this.displayChannelInfoSubs[ssid] = sub;
        }

        this.system.setupBackButton();

        if(this.ssidList.length === 0) {
            if(this.noResultSubscription) {
                this.noResultSubscription.cancel();
                this.noResultSubscription = null;
            }
            this.noResultSubscription = eventLoop.subscribe(this.system.getView("scan_ap_no_results").input, function(subscription, button, _gui) {
                if(button === "center") {
                    this.stop()
                    if(this.serial.isOpen()) {
                        this.serial.close();
                    }
                    gui.viewDispatcher.switchTo(this.system.getView("scan_ap_confirm"));
                }
            }, eventLoop);
            gui.viewDispatcher.switchTo(this.system.getView("scan_ap_no_results"));
        } else {
            /*
            scanApOptionsSubscription = eventLoop.subscribe(_system.views.scan_ap_options.chosen, function(sub, index) {
                if(index === 0) {
                    gui.viewDispatcher.switchTo(scanApSsidObjects[this.selectedSsid][0].view)
                } else if(index == 1) {
                    
                }
            })
            */

            // we do this elsewhere now
            // figure out what to replace this with
        /*
            scanApDynamicShowSubscription = eventLoop.subscribe(_system.views.scan_ap_show_ssid_list.chosen, function(sub, index: number, eventLoop) {
                let ssid = scanApSsidList[index];
                this.selectedSsid = ssid;
                //gui.viewDispatcher.switchTo(scanApSsidObjects[ssid][0].view)
                gui.viewDispatcher.switchTo(_system.views.scan_ap_options);
            }, eventLoop);
            gui.viewDispatcher.switchTo(_system.views.scan_ap_show_ssid_list);
            */
        }
    },
};

// Deauthed PMKID sniffing
function deauth_sniff_pmkid_start() {
    print("TBD")
}

function deauth_sniff_pmkid_stop() {
    print("TBD")
}


//////////
// Main //
//////////

//////////////////////
// Global variables //
//////////////////////

// Objects
let _utility = (Object as any).create.bind(UtilitiesClass);
let _system = (Object as any).create.bind(SystemClass);
let _serial = (Object as any).create.bind(SerialClass);
let _scanap = (Object as any).create.bind(ScanAPClass);

// ScanAP Library
let scanApDynamicShowSubscription: eventLoop.Subscription = null;
let scanApOptionsSubscription: eventLoop.Subscription = null;

///////////////////////////
// ScanAP                //
///////////////////////////
// Scan for APs and list //
///////////////////////////

// confirm
eventLoop.subscribe(_system.getView("scan_ap_confirm").input, function(subscription, button, _gui) {
    if(button === "center") {
        gui.viewDispatcher.switchTo(_system.getView("scan_ap_start"));
        _scanap.start();
    }
}, eventLoop);

// start
eventLoop.subscribe(_system.getView("scan_ap_start").input, function(sub, button, _gui) {
    if(button === "center") {
        _scanap.stop();
        if(_serial.isOpen()) {
            _serial.close();
        }
        gui.viewDispatcher.switchTo(_system.getView("scan_ap_confirm"));
    }
}, eventLoop);

////////////////////////////
// Deauth and sniff PMKID //
////////////////////////////

// start
eventLoop.subscribe(_system.getView("deauth_sniff_pmkid_confirm").input, function(subscription, button, _gui) {
    if(button === "center") {
        deauth_sniff_pmkid_start();
        gui.viewDispatcher.switchTo(_system.getView("deauth_sniff_pmkid_start"));
    }
}, eventLoop);

// stop
eventLoop.subscribe(_system.getView("deauth_sniff_pmkid_start").input, function(sub, button, _gui) {
    if(button === "center") {
        deauth_sniff_pmkid_stop();
        gui.viewDispatcher.switchTo(_system.getView("deauth_sniff_pmkid_confirm"));
    }
}, eventLoop);

///////////////
// Configure //
///////////////

// root configure menu 
eventLoop.subscribe(_system.getView("configure").chosen, function(sub, index, eventLoop) {
    if(index === 0) {
        print("TBD");
    } else if(index === 1) {
        gui.viewDispatcher.switchTo(_system.getView("scan_ap_configure"));
    } else if(index === 2) {
        gui.viewDispatcher.switchTo(_system.getView("mac_spoof_root"));
    }
}, eventLoop);

// mac spoofing
/*
eventLoop.subscribe(_system.views.mac_spoof_root.chosen, function(sub, index, eventLoop) {
    if(index === 0) {
        _system.views.mac_spoof_configure_station = textInput.makeWith({
            minLength: 17,
            maxLength: 17,
            header: "MAC Address",
            defaultText: "5",
            defaultTextClear: false,
    } else if(index === 1) {
        print("configure ap")
    }
}, eventLoop);
*/

eventLoop.subscribe(_system.getView("scan_ap_configure").input, function(sub, str) {
    gui.viewDispatcher.switchTo(_system.getView("configure"));
});

_system.setupViews({
    root: submenu.makeWith({}, [
        "Scanning",
        "Deauth Sniff PMKID",
        "Configure"
    ]),
    configure: submenu.makeWith({}, [
        "MAC Address Spoofing",
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
    scan_ap_show_ssid_list: null,
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
    scan_ap_options: submenu.makeWith({}, [
        "Information",
        "MAC Spoofing",
    ]),
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
    mac_spoof_root: submenu.makeWith({}, [
        "Station Address",
        "Access Point Address",
    ]),
    mac_spoof_configure_station: null,
    mac_spoof_configure_ap: null,
});

_system.configureBackButton();

eventLoop.subscribe(_system.getView("root").chosen, function (subscription, index, eventLoop) {
    if(index === 0) {
        gui.viewDispatcher.switchTo(_system.getView("scan_ap_confirm"));
    } else if(index === 1) {
        gui.viewDispatcher.switchTo(_system.getview("deauth_sniff_pmkid_confirm"));
    } else if(index === 2) {
        gui.viewDispatcher.switchTo(_system.getView("configure"));
    }
}, eventLoop);

// Handle back button presses for various menus

// run app
gui.viewDispatcher.switchTo(_system.getView("root"));
eventLoop.run();
