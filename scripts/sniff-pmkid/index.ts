import * as eventLoop from "@next-flip/fz-sdk-mntm/event_loop";
import * as gui from "@next-flip/fz-sdk-mntm/gui";  // this import is required before loading gui/loading
import * as loadingView from "@next-flip/fz-sdk-mntm/gui/loading";
import * as dialog from "@next-flip/fz-sdk-mntm/gui/dialog";
import * as textInput from "@next-flip/fz-sdk-mntm/gui/text_input";
import * as textBox from "@next-flip/fz-sdk-mntm/gui/text_box";
import * as submenu from "@next-flip/fz-sdk-mntm/gui/submenu";
import * as serial from "@next-flip/fz-sdk-mntm/serial";

// this is a hack so modules gets imported with the esbuild run
let ___gui = gui;
let ___serial = serial;
let ___eventLoop = eventLoop;

load("/ext/apps/Scripts/Automarauder/lib/util.js");
load("/ext/apps/Scripts/Automarauder/lib/serial.js");
load("/ext/apps/Scripts/Automarauder/lib/view.js");
load("/ext/apps/Scripts/Automarauder/lib/wifi.js");

View.init();

interface SniffStatsObject {
    data: string;
    channel: string;
    beacon: string;
    req: string;
    res: string;
    deauth: string;
    eapol: string;
    complete: string;
    rssi: string;
};

let App = {
    running: false,
    timeout: 5,
    newViews: [],
    apsByIndex: [],
    apsBySSID: {},
    selectedSsid: null,
    ssidList: [],
    ssidObjects: {},
    noResultSubscription: null,
    startOneshot: null,
    info: null as any,
    first: true,

    setTimeout: function(timeout: number) {
        App.timeout = timeout;
    },

    start: function() {
        if(!App.running) {
            App.running = true;

            if(App.startOneshot) {
                App.startOneshot.cancel();
                App.startOneshot = null;
            }

            Wifi.scanAps();

            App.startOneshot = eventLoop.subscribe(eventLoop.timer("oneshot", App.timeout * 1000), function(sub) {
                if(App.running) {
                    Wifi.stopScanAps();
                    App.running = false;
                    App.getInfo();
                }
            }, eventLoop);
        }
    },

    stop: function() {
        if(App.running) {
            Wifi.stopScanAps();
            App.running = false;
        }
    },

    getInfo: function() {
        if(!App.running) {
            App.ssidList = [];

            Wifi.listAps()
            App.apsByIndex = Wifi.getApsByIndex();
            App.apsBySSID = Wifi.getApsBySSID();

            for(let ssid in App.apsBySSID) {
                App.ssidList.push(ssid);
            }

            App.ssidList = Utils.removeListDups(App.ssidList);
            App.displaySSIDs();
        }
    },

    displaySSIDs: function() {
        if(App.ssidList.length > 0) {
            View.getView("scan_ap_show_ssid_list").setChildren(App.ssidList);
            View.show("scan_ap_show_ssid_list");
        } else {
            View.show("scan_ap_not_found");
        }
    },
    
    handler: function(data: string) {
        //
    },
};

View.addView("quit", null, dialog.makeWith({
    header: "Automarauder",
    text: "Are you sure you want to quit?",
    left: "Exit",
    right: "Stay",
}), null);

View.addView("root", "quit", submenu.makeWith({}, [
    "Scanning",
    "Configure",
    "Reset",
]), null);

View.addView("configure", "root", submenu.makeWith({}, [
    "Scanning Timeout",
]), function() {
    App.stop();
});

View.addView("scan_ap_timeout_configure", "configure", textInput.makeWith({
    minLength: 1,
    maxLength: 4,
    header: "Scan AP Timeout",
    defaultText: "5",
    defaultTextClear: false,
}), null);

View.addView("scan_ap_confirm", "root", dialog.makeWith({
    header: "Scan Access Points",
    text: "Scan for APs",
    center: "Start",
}), null);

View.addView("scan_ap_start", "scan_ap_confirm", dialog.makeWith({
    header: "Scanning",
    text: "Scanning for APs...",
    center: "Stop",
}), function() {
    App.stop();
});

View.addView("scan_ap_options", "scan_ap_show_ssid_list", submenu.makeWith({}, [
    "Sniff PMKID",
]), null);

View.addView("root_reset", "root", dialog.makeWith({
    header: "Successful!",
    text: "Marauder was Reset",
    center: "Back",
}), null);

View.addView("scan_ap_not_found", "scan_ap_confirm", dialog.makeWith({
    text: "Access Point Not Found",
    center: "Back",
}), null);

View.addView("sniff_pmkid_status", "sniff_pmkid_confirm", submenu.makeWith({}, []), function() {
    Wifi.stopSniffPMKID();
    View.show("sniff_pmkid_confirm");
});

View.addView("scan_ap_show_ssid_list", "scan_ap_confirm", submenu.makeWith({}, []), null);

View.addView("sniff_pmkid_confirm", "scan_ap_options", dialog.makeWith({
    text: "PMKID Sniffing",
    left: "Enable",
    center: "Back",
    right: "Disable",
}), null);

View.addView("loading", null, loadingView.make(), null);

View.subscribe("quit", "input", function(sub, button) {
    if(button === "right") {
        View.show("root");
    } else if(button === "left") {
        eventLoop.stop();
    }
});

View.subscribe("configure", "chosen", function(sub, index, eventLoop) {
    if(index === 0) {
        View.show("scan_ap_timeout_configure");
    }
});

View.subscribe("scan_ap_timeout_configure", "input", function(sub, item) {
    App.setTimeout(parseInt(item));
    View.show("configure");
});

View.subscribe("scan_ap_confirm", "input", function(sub, button) {
    if(button === "center") {
        View.show("scan_ap_start");
        App.start();
    }
});

View.subscribe("scan_ap_start", "input", function(sub, button) {
    if(button === "center") {
        View.show("scan_ap_confirm");
        App.stop();
    }
});

View.subscribe("scan_ap_not_found", "input", function(sub, button) {
    if(button === "center") {
        View.show("scan_ap_confirm");
    }
});

View.subscribe("sniff_pmkid_confirm", "input", function(sub, button) {
    if(button === "left") {
        Wifi.startSniffPMKID();
    } else if(button === "right") {
        Wifi.stopSniffPMKID();
    } else {
        View.show('scan_ap_options');
    }
});

View.subscribe("scan_ap_show_ssid_list", "chosen", function(sub, index: number) {
    App.selectedSsid = App.ssidList[index];
    Wifi.selectAp(App.apsBySSID[App.selectedSsid].index);
    View.show("scan_ap_options");
});

View.subscribe("scan_ap_options", "chosen", function(sub, index: number) {
    if(index === 0) {
        View.show("sniff_pmkid_confirm");
    }
});

View.subscribe("root_reset", "input", function(sub, button: string, _gui) {
    if(button === "center") {
        View.show('root');
    }
});

View.subscribe("root", "chosen", function(sub, index) {
    if(index === 0) {
        View.show("scan_ap_confirm");
    } else if(index === 1) {
        View.show("configure");
    } else if(index === 2) {
        View.show("loading");
        Wifi.reboot();
        View.timer(Wifi.getRebootTimeout() * 1000, function(sub) {
            View.show("root_reset");
        });
    }
});

View.show("root");
eventLoop.run()

