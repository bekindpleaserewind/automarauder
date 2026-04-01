interface WifiApInfoObj {
    essid: string;
    bssid: string;
    channel: string;
    rssi: string;
    frames: string;
    stations: string;
    eapol: string;
    security: string;
    selected: string;
};

let Wifi = {
    ACTIVE_DEAUTH: 1000,
    DISABLE_DEAUTH: 1100,
    apListByIndex: [],
    apListBySSID: {},
    index: -1,
    selected: false,
    rebooting: false,
    rebootTimeout: 5,
    callback: null,
    running: true,
    timerFunc: null,

    setIndex: function(index: number) {
        Wifi.index = index;
    },

    getRebootTimeout: function() {
        return(Wifi.rebootTimeout);
    },

    setRebootTimeout: function(timeout: number) {
        Wifi.rebootTimeout = timeout;
    },

    listAps: function() {
        Wifi.apListBySSID = {};
        Wifi.apListByIndex = [];

        Serial.open();
        Serial.write("list -a");

        let data: string = Serial.expect("list -a");
        let lines: string[] = Utils.splitByNewLine(data);

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
                        Wifi.apListByIndex[index] = {
                            index: index,
                            channel: channel,
                            ssid: ssid,
                        };

                        Wifi.apListBySSID[ssid] = Wifi.apListByIndex[index];
                    }
                }
            }
        }

        Serial.close();
    },

    info: function() {
        if(Wifi.index < 0) {
            return(false);
        }

        Serial.open();
        Serial.write("info -a " + Wifi.index.toString());

        let data: string = Serial.expect("info -a " + Wifi.index.toString());
        let lines: string[] = Utils.splitByNewLine(data);

        let essid = lines[1].slice(lines[1].indexOf('ESSID: ')+7);
        let bssid = lines[2].slice(lines[2].indexOf('BSSID: ')+7);
        let channel = lines[3].slice(lines[3].indexOf('Channel: ')+9);
        let rssi = lines[4].slice(lines[4].indexOf('RSSI: ')+6);
        let frames = lines[5].slice(lines[5].indexOf('Frames: ')+8);
        let stations = lines[6].slice(lines[6].indexOf('Stations: ')+10);
        let eapol = lines[8].slice(lines[8].indexOf('EAPOL: ')+7);
        let security = lines[9].slice(lines[9].indexOf('Security: ')+10);
        let selected = lines[10].slice(lines[10].indexOf('Selected: ')+10);

        let obj: WifiApInfoObj = {
            essid: essid,
            bssid: bssid,
            channel: channel,
            rssi: rssi,
            frames: frames,
            stations: stations,
            eapol: eapol,
            security: security,
            selected: selected,
        };

        Serial.close();
        return(obj);
    },

    scanAps: function() {
        Serial.open();
        Serial.write("scanap");
        Serial.expect("scanap");
        Serial.close();
    },

    stopScanAps: function() {
        Serial.open();
        Serial.write("stopscan");
        Serial.expect("stopscan");
        Serial.close();
    },

    getApsBySSID: function() {
        return(Wifi.apListBySSID);
    },

    getApsByIndex: function() {
        return(Wifi.apListByIndex);
    },

    selectAp: function(index: number) {
        if(Wifi.selected) {
            Wifi.unselectAp();
        }

        Wifi.setIndex(index);
        Serial.open();

        for(let i = 0; i < Wifi.apListByIndex.length; i++) {
            if(Wifi.apListByIndex[i].index === index) {
                Serial.write("select -a " + Wifi.index.toString());
                let data = Serial.expect("select -a");
                if(data.indexOf('1 selected') >= 0) { 
                    Wifi.selected = true;
                }
            }
        }
    },

    unselectAp: function() {
        Serial.open();

        if(Wifi.selected) {
            Serial.write("select -a " + Wifi.index.toString());
            let data = Serial.expect("select -a");
            if(data.indexOf('1 unselected') >= 0) {
                Wifi.selected = false;
                Wifi.index = -1;
            }
        }
    },

    cloneApMac: function() {
        Serial.write("cloneapmac -a " + Wifi.index.toString());
        let data = Serial.expect("cloneapmac -a");
    },

    stopSniffPMKID: function() {
        Wifi.stopScanAps();
        Wifi.running = false;
    },

    startSniffPMKID: function(deauth: number) {
        Wifi.running = true;
        Serial.open();
        if(deauth === Wifi.ACTIVE_DEAUTH) {
            Serial.write('sniffpmkid -c ' + Wifi.apListByIndex[Wifi.index].channel.toString() + ' -d -l');
        } else {
            Serial.write('sniffpmkid -c ' + Wifi.apListByIndex[Wifi.index].channel.toString() + ' -l');
        }
        Serial.close();
    },

    reboot: function() {
        if(!Wifi.rebooting) {
            Serial.open();
            Serial.write("reboot");
            Wifi.index = -1;
            Wifi.selected = false;
            Wifi.rebooting = false;
        }
    }
};