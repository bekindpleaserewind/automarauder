# AutoMarauder

**AutoMarauder** is a suite of shared libraries and scripts for automating the [Marauder firmware](https://github.com/justcallmekoko/ESP32Marauder) on the Flipper Zero. It is developed in TypeScript and built for the [mJS JavaScript engine](https://github.com/cesanta/mjs) running on [Momentum firmware](https://github.com/Next-Flip/Momentum-Firmware), allowing you to interact with Marauder directly from the Flipper Zero UI — without manually issuing serial commands.

---

## Overview

The AutoMarauder suite is organized into a shared library and a collection of application scripts that depend on it. Each component lives in its own directory and has its own `README.md` with full build and deployment instructions.

| Component | Type | Description |
|---|---|---|
| [AutoMarauder Shared Library](#automarauder-shared-library) | Library | Core runtime modules required by all AutoMarauder scripts |
| [AutoMarauder AP Info](#automarauder-ap-info) | Script | Scan and inspect nearby WiFi access points |

---

## Requirements

All components share the following base requirements:

- [Node.js](https://nodejs.org/) ≥ 18
- A Flipper Zero running [Momentum firmware](https://github.com/Next-Flip/Momentum-Firmware) with the `@next-flip/fz-sdk-mntm` SDK
- A Flipper Zero WiFi dev board flashed with [Marauder firmware](https://github.com/justcallmekoko/ESP32Marauder)
- The **AutoMarauder Shared Library** installed on the Flipper Zero (see below)

---

## Components

### AutoMarauder Shared Library

The shared library is the foundation of the AutoMarauder suite. It provides the core runtime modules that all AutoMarauder scripts load at startup via the mJS `load()` mechanism:

- **Utils** — General utility helpers
- **Serial** — Serial communication with the Marauder firmware
- **View** — Navigation and UI view management
- **Wifi** — WiFi access point scanning and control

> **The shared library must be installed to the Flipper Zero before any AutoMarauder script will run.** See the `README.md` in the shared library directory for full build and installation instructions.

---

### AutoMarauder AP Info

A Flipper Zero script that provides WiFi access point scanning via Marauder, letting you browse discovered SSIDs and inspect detailed per-AP information (BSSID, RSSI, security type, frame counts, stations, EAPOL) — all from the Flipper Zero UI.

See the `README.md` in the AP Info directory for full build and deployment instructions.

---

## Getting Started

1. **Clone the repository**

```bash
git clone https://github.com/bekindpleaserewind/automarauder.git
cd automarauder
```

2. **Build and install the AutoMarauder Shared Library first** — all scripts depend on it. Refer to the shared library `README.md` for instructions.

3. **Build and deploy the script(s) you want to use.** Each script directory contains its own `README.md` with `npm run build` and `npm run start` instructions.

---

## Related

- [Momentum Firmware](https://github.com/Next-Flip/Momentum-Firmware)
- [ESP32 Marauder](https://github.com/justcallmekoko/ESP32Marauder)
- [mJS JavaScript Engine](https://github.com/cesanta/mjs)

---

## License

MIT