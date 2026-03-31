import * as loadingView from "@next-flip/fz-sdk-mntm/gui/loading";
import * as dialog from "@next-flip/fz-sdk-mntm/gui/dialog";
import * as textInput from "@next-flip/fz-sdk-mntm/gui/text_input";
import * as submenu from "@next-flip/fz-sdk-mntm/gui/submenu";

function factory() {
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
        ScanAP.stop();
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
        ScanAP.stop();
    });

    View.addView("scan_ap_options", "scan_ap_show_ssid_list", submenu.makeWith({}, [
        "Information",
        "MAC Spoofing",
    ]), null);

    View.addView("scan_ap_mac_spoofing_enable", "scan_ap_options", dialog.makeWith({
        header: "MAC Spoofing",
        text: "",
        left: "Enable",
        right: "Reset",
        center: "Back",
    }), null);

    View.addView("scan_ap_information", "scan_ap_show_ssid_list", submenu.makeWith({}, []), null);

    View.addView("scan_ap_mac_spoof_success", "scan_ap_mac_spoofing_enable", dialog.makeWith({
        text: "Spoof MAC Success!",
        center: "Back",
    }), null);

    View.addView("scan_ap_mac_spoofing_status_disabled", "scan_ap_mac_spoofing_enable", dialog.makeWith({
        header: "Successful!",
        text: "Marauder was Reset",
        center: "Back",
    }), null);

    View.addView("root_reset", "root", dialog.makeWith({
        header: "Successful!",
        text: "Marauder was Reset",
        center: "Back",
    }), null);

    View.addView("scan_ap_not_found", "scan_ap_confirm", dialog.makeWith({
        text: "Access Point Not Found",
        center: "Back",
    }), null);

    View.addView("scan_ap_show_ssid_list", "scan_ap_confirm", submenu.makeWith({}, []), null);

    View.addView("scan_ap_information_essid", "scan_ap_information", dialog.makeWith({text: "", center: "Back"}), null);
    View.addView("scan_ap_information_bssid", "scan_ap_information", dialog.makeWith({text: "", center: "Back"}), null);
    View.addView("scan_ap_information_rssi", "scan_ap_information", dialog.makeWith({text: "", center: "Back"}), null);
    View.addView("scan_ap_information_security", "scan_ap_information", dialog.makeWith({text: "", center: "Back"}), null);
    View.addView("scan_ap_information_selected", "scan_ap_information", dialog.makeWith({text: "", center: "Back"}), null);
    View.addView("scan_ap_information_frames", "scan_ap_information", dialog.makeWith({text: "", center: "Back"}), null);
    View.addView("scan_ap_information_stations", "scan_ap_information", dialog.makeWith({text: "", center: "Back"}), null);
    View.addView("scan_ap_information_eapol", "scan_ap_information", dialog.makeWith({text: "", center: "Back"}), null);

    View.addView("loading", null, loadingView.make(), null);
}