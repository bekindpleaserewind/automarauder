import * as eventLoop from "@next-flip/fz-sdk-mntm/event_loop";
import * as gui from "@next-flip/fz-sdk-mntm/gui";
import * as loadingView from "@next-flip/fz-sdk-mntm/gui/loading";
import * as dialog from "@next-flip/fz-sdk-mntm/gui/dialog";
import * as textInput from "@next-flip/fz-sdk-mntm/gui/text_input";
import * as submenu from "@next-flip/fz-sdk-mntm/gui/submenu";
import * as serial from "@next-flip/fz-sdk-mntm/serial";

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

let CHANNELS: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

let UtilitiesClass = {
    init: function() {
        _utility.self = this;
    },

    trim: function(str: string) {
        let start: number = 0;
        let end: number = str.length - 1;

        while(start <= end) {
            let c: string = str.slice(start, start + 1);
            if(c === ' ' || c === '\r' || c === '\n' || c === '\t') {
                start++;
            } else {
                break;
            }
        }

        while(end >= start) {
            let c:string = str.slice(end, end + 1);
            if(c === ' ' || c === '\r' || c === '\n' || c === '\t') {
                end--;
            } else {
                break;
            }
        }

        return str.slice(start, end + 1);
    },

    splitByNewLine: function(str: string): string[] {
        const lines: string[] = [];
        let start = 0;
        
        let nextNewline = str.indexOf('\r\n');
        
        while (nextNewline !== -1) {
            lines.push(str.slice(start, nextNewline));
            start = nextNewline + 2;
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
    },

    getObjectProp: function(obj: any, key: string): any {
        for(let k in obj) {
            if(k === key) {
                return obj[k];
            }
        }
        return null;
    },
};

let ViewClass = {
    init: function() {
        this._timer = null;
        this._navMap = {};

        this._back = eventLoop.subscribe(gui.viewDispatcher.navigation, function(sub, item) {
            const currentView = _view.current();
            if(currentView) {
                if(_view._navMap[currentView].back !== null) {
                    if(_view._navMap[currentView].callback !== null) {
                        _view._navMap[currentView].callback();
                    }
                    _view.show(_view._navMap[currentView].back);
                } else {
                    return;
                }
            }
        }, eventLoop);
    },

    addView: function(source: string, back: string, view: Object, callback: Function) {
        this._navMap[source] = {
            source: source,
            back: back,
            view: view,
            backView: null,
            callback: callback,
            connected: callback ? true : false,
            subscription: null,
            subscribed: false,
        }
        return(this._navMap[source].view);
    },

    getView: function(source: string) {
        let view = this.hasView(source);
        return(view);
    },

    hasView: function(source: string) {
        for(let view in this._navMap) {
            if(source === view) {
                return(this._navMap[source].view);
            }
        }
        return(false);
    },

    subscribe: function(source: string, type: string, callback: any) {
        if(this._navMap[source].subscribed) {
            this._navMap[source].subscription.cancel();
            this._navMap[source].subscription = null;
            this._navMap[source].subscribed = false;
        }

        let contract = _utility.getObjectProp(this._navMap[source].view, type)

        if(contract) {
            this._navMap[source].subscription = eventLoop.subscribe(contract, callback);
            this._navMap[source].subscribed = true;
        }
    },

    isSubscribed: function(source: string): boolean {
       return(this._navMap[source].subscribed);
    },

    remove: function(source: string) {
        if(this._navMap[source].subscribed) {
            this._navMap[source].subscription.cancel();
            this._navMap[source].subscription = null;
            this._navMap[source].subscribed = false;
            return(true);
        }
        return(false);
    },

    // Resolve the key for the current view by iterating the
    // nav map and matching against the actual view objects.
    // Required because mJS can't do reverse object lookups.
    current: function(): string {
        let current = gui.viewDispatcher.currentView;

        for(let key in this._navMap) {
            if(this._navMap[key].view === current) {
                return key;
            }
        }

        return null;
    },

    show: function(source: string) {
        if(this._navMap[source].view !== null) {
            gui.viewDispatcher.switchTo(this._navMap[source].view);
        }
    },

    timer: function(timeout: number, callback: any) {
        if(this._timer) {
            this._timer.cancel();
            this._timer = null;
        }
        this._timer = eventLoop.subscribe(eventLoop.timer("oneshot", timeout), callback);
    },
};

let SerialClass = {
    init: function() {
        _serial.self = this;
        this.serial_is_open = false;
    },

    open: function() {
        serial.setup("usart", 115200);
        this.serial_is_open = true;
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

    expect: function(pattern: string) : string {
        let data: string;
        if(serial.expect(pattern) === 0) {
            data = this.read();
        }
        return(data);
    },

    write: function(str: string) {
        if(!this.isOpen()) {
            this.open();
        }
        serial.write(str + "\n");
    },

    close: function() {
        serial.end();
        this.serial_is_open = false;
    },

    isOpen: function() {
        return(this.serial_is_open);
    }
};

let WifiClass = {
    init: function() {
        _wifi.self = this;
        this.serial = _serial;
        this.utility = _utility;
        this.apListByIndex = [];
        this.apListBySSID = {};

        this.index = -1;
        this.selected = false;

        this.rebooting = false;
        this.rebootTimeout = 5;
    },

    setIndex: function(index: number) {
        this.index = index;
    },

    getRebootTimeout: function() {
        return(this.rebootTimeout);
    },

    setRebootTimeout: function(timeout: number) {
        this.rebootTimeout = timeout;
    },

    checkAndOpenSerial: function() {
        if(!this.serial.isOpen()) {
            this.serial.open();
        }
    },

    checkAndCloseSerial: function() {
        if(this.serial.isOpen()) {
            this.serial.close();
        }
    },

    listAps: function() {
        this.apListBySSID = {};
        this.apListByIndex = [];

        this.checkAndOpenSerial();
        this.serial.write("list -a");

        let data: string = this.serial.expect("list -a");
        let lines: string[] = this.utility.splitByNewLine(data);

        for(let i = 1; i < lines.length-2; i++) {
            let line = lines[i].slice(1, lines[i].length);
            if(line.length > 0) {
                let index = parseInt(line.slice(0, line.indexOf(']')));

                let s = line.slice(line.indexOf('CH:')+3, line.length);
                let channel: number = parseInt(s.slice(0, line.indexOf(']')));

                if(channel > 0) {
                    let ssid: string = line.slice(line.indexOf('] ') + 2, line.length);
                    ssid = ssid.slice(0, ssid.indexOf(' -'));

                    if(ssid) {
                        this.apListByIndex[index] = {
                            index: index,
                            channel: channel,
                            ssid: ssid,
                        };

                        this.apListBySSID[ssid] = this.apListByIndex[index];
                    }
                }
            }
        }

        this.checkAndCloseSerial();
    },

    scanAps: function() {
        this.checkAndOpenSerial();
        this.serial.write("scanap");
        this.serial.expect("scanap");
        this.checkAndCloseSerial();
    },

    stopScanAps: function() {
        this.checkAndOpenSerial();
        this.serial.write("stopscan");
        this.serial.expect("stopscan");
        this.checkAndCloseSerial();
    },

    getApsBySSID: function() {
        return(this.apListBySSID);
    },

    getApsByIndex: function() {
        return(this.apListByIndex);
    },

    selectAp: function(index: number) {
        if(this.selected) {
            this.unselectAp();
        }

        this.setIndex(index);
        this.checkAndOpenSerial();

        for(let i = 0; i < this.apListByIndex.length; i++) {
            if(this.apListByIndex[i].index === index) {
                this.serial.write("select -a " + this.index.toString());
                let data = this.serial.expect("select -a");
                if(data.indexOf('1 selected') >= 0) { 
                    this.selected = true;
                }
            }
        }
    },

    unselectAp: function() {
        this.checkAndOpenSerial();

        if(this.selected) {
            this.serial.write("select -a " + this.index.toString());
            let data = this.serial.expect("select -a");
            if(data.indexOf('1 unselected') >= 0) {
                this.selected = false;
                this.index = -1;
            }
        }
    },

    cloneApMac: function() {
        this.serial.write("cloneapmac -a " + this.index.toString());
        let data = this.serial.expect("cloneapmac -a");
    },

    reboot: function() {
        if(!this.rebooting) {
            this.checkAndOpenSerial();
            this.serial.write("reboot");
            this.index = -1;
            this.selected = false;
            this.rebooting = false;
        }
    }
}

let ScanAPClass = {
    init: function() {
        _scanap.self = this;

        this.utility = _utility;
        this.serial = _serial;
        this.wifi = _wifi;

        this.running = false;
        this.timeout = 5;

        this.newViews = [];

        this.apsByIndex = [];
        this.apsBySSID = {};

        this.selectedSsid = null;
        this.ssidList = [];
        this.ssidObjects = {};
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

            this.wifi.scanAps();

            this.startOneshot = eventLoop.subscribe(eventLoop.timer("oneshot", this.timeout * 1000), function(sub) {
                if(_scanap.running) {
                    _wifi.stopScanAps();
                    _scanap.running = false;
                    _scanap.self.getInfo();
                }
            }, eventLoop);
        }
    },

    stop: function() {
        if(this.running) {
            _wifi.stopScanAps();
            this.running = false;
        }
    },

    getInfo: function() {
        if(!_scanap.running) {
            this.ssidList = [];

            if(this.channelInfoOneshot) {
                this.channelInfoOneshot.cancel();
                this.channelInfoOneshot = null;
            }

            this.wifi.listAps()
            this.apsByIndex = this.wifi.getApsByIndex();
            this.apsBySSID = this.wifi.getApsBySSID();

            for(let ssid in this.apsBySSID) {
                this.ssidList.push(ssid);
            }
            this.ssidList = this.utility.removeListDups(_scanap.self.ssidList);

            if(this.serial.isOpen()) {
                this.serial.close();
            }

            this.displaySSIDs();
        }
    },

    displaySSIDs: function() {
        if(_scanap.ssidList.length > 0) {
            _view.getView("scan_ap_show_ssid_list").setChildren(_scanap.ssidList);

            _view.subscribe("scan_ap_show_ssid_list", "chosen", function(sub, index: number) {
                _scanap.selectedSsid = _scanap.ssidList[index];

                _view.subscribe("scan_ap_options", "chosen", function(sub, index: number) {
                    if(index === 0) {
                        if(!_view.isSubscribed("scan_ap_mac_spoofing_enable")) {
                            _view.subscribe("scan_ap_mac_spoofing_enable", "input", function(sub, button: string, _gui) {
                                if(button === "right") {
                                    _view.show("loading");
                                    _wifi.reboot();
                                    _view.timer(_wifi.getRebootTimeout() * 1000, function(sub) {
                                        _view.show("scan_ap_mac_spoofing_status_disabled");
                                    });
                                } else if(button === "center") {
                                    _view.show("scan_ap_options");
                                } else if(button === "left") {
                                    _wifi.selectAp(_scanap.apsBySSID[_scanap.selectedSsid].index);
                                    _wifi.cloneApMac();
                                    _view.show("scan_ap_mac_spoof_success")
                                }
                            });
                        }

                        _view.getView("scan_ap_mac_spoofing_enable").set("text", _scanap.selectedSsid)
                        _view.show("scan_ap_mac_spoofing_enable");
                    }
                }, eventLoop);

                _view.show("scan_ap_options");
            });

            _view.show("scan_ap_show_ssid_list");
        } else {
            _view.show("scan_ap_not_found");
        }
    },
};

let _serial = (Object as any).create(SerialClass);
_serial.init();

let _utility = (Object as any).create(UtilitiesClass);
_utility.init();

let _view = (Object as any).create(ViewClass);
_view.init();

let _wifi = (Object as any).create(WifiClass);
_wifi.init();

let _scanap = (Object as any).create(ScanAPClass);
_scanap.init();

_view.addView("quit", null, dialog.makeWith({
    header: "Automarauder",
    text: "Are you sure you want to quit?",
    left: "Exit",
    right: "Stay",
}), null);

_view.addView("root", "quit", submenu.makeWith({}, [
    "Scanning",
    "Configure",
    "Reset",
]), null);

_view.addView("configure", "root", submenu.makeWith({}, [
    "Scanning Timeout",
]), function() {
    _scanap.stop();
});

_view.addView("scan_ap_timeout_configure", "configure", textInput.makeWith({
    minLength: 1,
    maxLength: 4,
    header: "Scan AP Timeout",
    defaultText: "5",
    defaultTextClear: false,
}), null);

_view.addView("scan_ap_confirm", "root", dialog.makeWith({
    header: "Scan Access Points",
    text: "Scan for APs",
    center: "Start",
}), null);

_view.addView("scan_ap_start", "scan_ap_confirm", dialog.makeWith({
    header: "Scanning",
    text: "Scanning for APs...",
    center: "Stop",
}), function() {
    _scanap.stop();
});

_view.addView("scan_ap_options", "scan_ap_show_ssid_list", submenu.makeWith({}, [
    "MAC Spoofing",
]), null);

_view.addView("scan_ap_mac_spoofing_enable", "scan_ap_options", dialog.makeWith({
    header: "MAC Spoofing",
    text: "",
    left: "Enable",
    right: "Reset",
    center: "Back",
}), null);

_view.addView("scan_ap_mac_spoof_success", "scan_ap_mac_spoofing_enable", dialog.makeWith({
    text: "Spoof MAC Success!",
    center: "Back",
}), null);

_view.addView("scan_ap_mac_spoofing_status_disabled", "scan_ap_mac_spoofing_enable", dialog.makeWith({
    header: "Successful!",
    text: "Marauder was Reset",
    center: "Back",
}), null);

_view.addView("root_reset", "root", dialog.makeWith({
    header: "Successful!",
    text: "Marauder was Reset",
    center: "Back",
}), null);

_view.addView("scan_ap_not_found", "scan_ap_confirm", dialog.makeWith({
    text: "Access Point Not Found",
    center: "Back",
}), null);

_view.addView("scan_ap_show_ssid_list", "scan_ap_confirm", submenu.makeWith({}, []), null);

_view.addView("loading", null, loadingView.make(), null);

/*
_view.addView("scan_ap_no_results", "scan_ap_confirm", "scan_ap_confirm", dialog.makeWith({
    text: "No Access Points Found",
    center: "Back",
}), null);

_view.addView("mac_spoof_root", null, "scan_ap_options", submenu.makeWith({}, [
    "Station Address",
    "Access Point Address",
]), null);

_view.addView("mac_spoof_configure_station", null, null, null, null);
_view.addView("mac_spoof_configure_ap", null, null, null, null);
_view.addView("scan_ap_mac_spoofing_enable", null, null, null, null);
_view.addView("scan_ap_show_ssid_list", null, null, null, null);
*/

// Subscriptions for views

/*
// start
_view.subscribe("scan_ap_start", "input", function(sub, button,) {
    if(button === "center") {
        _scanap.stop();
        _view.show("scan_ap_confirm");
    }
});
*/

_view.subscribe("quit", "input", function(sub, button) {
    if(button === "right") {
        _view.show("root");
    } else if(button === "left") {
        eventLoop.stop();
    }
});

_view.subscribe("configure", "chosen", function(sub, index, eventLoop) {
    if(index === 0) {
        _view.show("scan_ap_timeout_configure");
    }
});

_view.subscribe("scan_ap_timeout_configure", "input", function(sub, item) {
    _scanap.timeout = parseInt(item);
    _view.show("configure");
});

_view.subscribe("scan_ap_confirm", "input", function(sub, button) {
    if(button === "center") {
        _view.show("scan_ap_start");
        _scanap.start();
    }
});

_view.subscribe("scan_ap_mac_spoof_success", "input", function(sub, button) {
    if(button === "center") {
        _view.show("scan_ap_mac_spoofing_enable");
    }
});

_view.subscribe("scan_ap_start", "input", function(sub, button) {
    if(button === "center") {
        _view.show("scan_ap_confirm");
        _scanap.stop();
    }
});

_view.subscribe("scan_ap_mac_spoofing_status_disabled", "input", function(sub, button: string, _gui) {
    if(button === "center") {
        _view.show('scan_ap_confirm');
    }
});

_view.subscribe("scan_ap_not_found", "input", function(sub, button) {
    if(button === "center") {
        _view.show("scan_ap_confirm");
    }
});

_view.subscribe("root_reset", "input", function(sub, button: string, _gui) {
    if(button === "center") {
        _view.show('root');
    }
});

// Main view
_view.subscribe("root", "chosen", function(sub, index) {
    if(index === 0) {
        _view.show("scan_ap_confirm");
    } else if(index === 1) {
        _view.show("configure");
    } else if(index === 2) {
        _view.show("loading");
        _wifi.reboot();
        _view.timer(_wifi.getRebootTimeout() * 1000, function(sub) {
            _view.show("root_reset");
        });
    }
});

// start app
_view.show("root");
eventLoop.run()

