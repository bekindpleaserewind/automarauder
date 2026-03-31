# AutoMarauder AP MAC Spoof

The AutoMarauder AP MAC Spoof program is developed in Typescript and built for the mJS JavaScript engine on the Flipper Zero that provides WiFi access point MAC address spoofing via the [Marauder firmware](https://github.com/justcallmekoko/ESP32Marauder) on a Flipper Zero WiFi dev board.

AutoMarauder AP MAC Spoof lets you scan nearby WiFi access points, browse discovered SSIDs, and spoof the MAC address of a selected access point, all from the Flipper Zero UI. without the need to manually interact with Marauder directly.

---

## Prerequisites

- [Node.js](https://nodejs.org/) ≥ 18
- A Flipper Zero running [Momentum firmware](https://github.com/Next-Flip/Momentum-Firmware) with the `@next-flip/fz-sdk-mntm` SDK
- A Flipper Zero WiFi dev board flashed with [Marauder firmware](https://github.com/justcallmekoko/ESP32Marauder)
- The **AutoMarauder Shared Library** installed on the Flipper Zero (see below)

---

## Dependency: AutoMarauder Shared Library

AutoMarauder AP MAC Spoof depends on the **AutoMarauder Shared Library**, which provides the runtime modules loaded at startup:

| Module | Path on device |
|---|---|
| `Utils` | `/ext/apps/Scripts/AutoMarauder/lib/util.js` |
| `Serial` | `/ext/apps/Scripts/AutoMarauder/lib/serial.js` |
| `View` | `/ext/apps/Scripts/AutoMarauder/lib/view.js` |
| `Wifi` | `/ext/apps/Scripts/AutoMarauder/lib/wifi.js` |

These libraries **must be installed to the Flipper Zero separately** before running AutoMarauder AP MAC Spoof. The application loads them at runtime using mJS `load()` calls and will crash on startup if any of them are missing.

Refer to the **AutoMarauder Shared Library `README.md`** for full instructions on how to build and install the shared library to your device.

### TypeScript Definitions

To compile AutoMarauder AP MAC Spoof, the TypeScript type definitions for the shared library must be present locally. Copy them from the built library output into this project's `lib/` directory:

```bash
cp "/path/to/lib/dist/src/"*.d.ts ./lib/
```

> These `.d.ts` files are generated when you build the AutoMarauder Shared Library. They are not bundled with this AutoMarauder script and must be copied manually before running the build.

---

## Installation

Install project dependencies:

```bash
npm install
```

---

## Building

Compile and bundle the application for the mJS runtime:

```bash
npm run build
```

This produces a bundled `index.js` in the output directory, post-processed to be compatible with the mJS engine's restrictions (no closures, no `class`/`new`, no arrow functions).

---

## Uploading to the Flipper Zero

Deploy the built application to your connected Flipper Zero over USB:

```bash
npm run start
```

This transfers the bundled script and any supporting assets to the correct location on the device's SD card.

> Make sure your Flipper Zero is connected via USB and that the shared library files are already installed before running this command.

---

## Project Structure

```
.
├── index.ts          # Main application entry point
├── lib/              # TypeScript definitions for AutoMarauder Shared Library (copied from /path/to/lib/dist/src/)
│   ├── util.d.ts
│   ├── serial.d.ts
│   ├── view.d.ts
│   └── wifi.d.ts
├── package.json
├── fz-sdk.config.json5  # Configuration file for @next-flip/fz-sdk-mntm
└── tsconfig.json
```

---

## Features

- **AP Scanning** — Scan for nearby WiFi access points with a configurable timeout
- **SSID Browser** — Browse discovered SSIDs in a scrollable list
- **MAC Spoofing** — Spoof the MAC address of a selected access point
- **Scan Timeout Configuration** — Adjust the scan duration from the Configure menu
- **Marauder Reset** — Reboot the Marauder firmware from within the app
- **Navigation** — Full back-navigation support across all views

---

## Related

- [AutoMarauder Shared Library](https://github.com/bekindpleaserewind/automarauder) — Shared runtime library (see its `README.md` for build and install instructions)
- [Momentum Firmware](https://github.com/Next-Flip/Momentum-Firmware)
- [ESP32 Marauder](https://github.com/justcallmekoko/ESP32Marauder)

---

## License

MIT