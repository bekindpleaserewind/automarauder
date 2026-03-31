declare var eventLoop: typeof import("@next-flip/fz-sdk-mntm/event_loop");

let ScanAP = {
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
    channelInfoOneshot: null,
    info: null as any,

    init: function() {
        // place holder
    },

    setTimeout: function(timeout: number) {
        ScanAP.timeout = timeout;
    },

    start: function() {
        if(Serial.isOpen()) {
            Serial.close();
        }

        if(!ScanAP.running) {
            ScanAP.running = true;

            if(ScanAP.startOneshot) {
                ScanAP.startOneshot.cancel();
                ScanAP.startOneshot = null;
            }

            Wifi.scanAps();

            ScanAP.startOneshot = eventLoop.subscribe(eventLoop.timer("oneshot", ScanAP.timeout * 1000), function(sub) {
                if(ScanAP.running) {
                    Wifi.stopScanAps();
                    ScanAP.running = false;
                    ScanAP.getInfo();
                }
            }, eventLoop);
        }
    },

    stop: function() {
        if(ScanAP.running) {
            Wifi.stopScanAps();
            ScanAP.running = false;
        }
    },

    getInfo: function() {
        if(!ScanAP.running) {
            ScanAP.ssidList = [];

            if(ScanAP.channelInfoOneshot) {
                ScanAP.channelInfoOneshot.cancel();
                ScanAP.channelInfoOneshot = null;
            }

            Wifi.listAps()
            ScanAP.apsByIndex = Wifi.getApsByIndex();
            ScanAP.apsBySSID = Wifi.getApsBySSID();

            for(let ssid in ScanAP.apsBySSID) {
                ScanAP.ssidList.push(ssid);
            }
            ScanAP.ssidList = Utils.removeListDups(ScanAP.ssidList);

            if(Serial.isOpen()) {
                Serial.close();
            }

            ScanAP.displaySSIDs();
        }
    },

    displaySSIDs: function() {
        if(ScanAP.ssidList.length > 0) {
            View.getView("scan_ap_show_ssid_list").setChildren(ScanAP.ssidList);

            View.subscribe("scan_ap_show_ssid_list", "chosen", function(sub, index: number) {
                ScanAP.selectedSsid = ScanAP.ssidList[index];
                Wifi.selectAp(ScanAP.apsBySSID[ScanAP.selectedSsid].index);

                View.subscribe("scan_ap_options", "chosen", function(sub, index: number) {
                    if(index === 0) {
                        if(View.hasView("scan_ap_information")) {
                            print("Has scan_ap_information");
                            ScanAP.info = Wifi.info();

                            View.getView("scan_ap_information_essid").set("text", ScanAP.info.essid);
                            View.getView("scan_ap_information_bssid").set("text", ScanAP.info.bssid);
                            View.getView("scan_ap_information_rssi").set("text", ScanAP.info.rssi);
                            View.getView("scan_ap_information_security").set("text", ScanAP.info.security);
                            View.getView("scan_ap_information_selected").set("text", ScanAP.info.selected);
                            View.getView("scan_ap_information_frames").set("text", ScanAP.info.frames);
                            View.getView("scan_ap_information_stations").set("text", ScanAP.info.stations);
                            View.getView("scan_ap_information_eapol").set("text", ScanAP.info.eapol);

                            View.getView("scan_ap_information").setChildren([
                                "   ESSID: " + ScanAP.info.essid,
                                "   BSSID: " + ScanAP.info.bssid,
                                "    RSSI: " + ScanAP.info.rssi,
                                "Security: " + ScanAP.info.security,
                                "Selected: " + ScanAP.info.selected,
                                "  Frames: " + ScanAP.info.frames,
                                "Stations: " + ScanAP.info.stations,
                                "   EAPOL: " + ScanAP.info.eapol,
                            ]);


                            View.show("scan_ap_information");
                        }
                    } else if(index === 1) {
                        if(!View.isSubscribed("scan_ap_mac_spoofing_enable")) {
                            View.subscribe("scan_ap_mac_spoofing_enable", "input", function(sub, button: string, _gui) {
                                if(button === "right") {
                                    View.show("loading");
                                    Wifi.reboot();
                                    View.timer(Wifi.getRebootTimeout() * 1000, function(sub) {
                                        View.show("scan_ap_mac_spoofing_status_disabled");
                                    });
                                } else if(button === "center") {
                                    View.show("scan_ap_options");
                                } else if(button === "left") {
                                    Wifi.cloneApMac();
                                    View.show("scan_ap_mac_spoof_success")
                                }
                            });
                        }

                        View.getView("scan_ap_mac_spoofing_enable").set("text", ScanAP.selectedSsid)
                        View.show("scan_ap_mac_spoofing_enable");
                    }
                });

                View.show("scan_ap_options");
            });

            View.show("scan_ap_show_ssid_list");
        } else {
            View.show("scan_ap_not_found");
        }
    },
};