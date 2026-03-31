# AutoMarauder Shared Library

The AutoMarauder Shared Library is the core runtime foundation for the [AutoMarauder](https://github.com/bekindpleaserewind/automarauder) suite. It provides the shared modules required by all AutoMarauder scripts running on the Flipper Zero mJS JavaScript engine.

---

## Overview

All AutoMarauder scripts depend on this library and load its modules at runtime via the mJS `load()` mechanism. The library **must be built and installed to the Flipper Zero before any AutoMarauder script will run.**

### Modules

| Module | Description |
|---|---|
| `Utils` | General utility helpers |
| `Serial` | Serial communication with the Marauder firmware |
| `View` | Navigation and UI view management |
| `Wifi` | WiFi access point scanning and control |

---

## Prerequisites

- [Node.js](https://nodejs.org/) ≥ 18
- A Flipper Zero running [Momentum firmware](https://github.com/Next-Flip/Momentum-Firmware) with the `@next-flip/fz-sdk-mntm` SDK
- A Flipper Zero WiFi dev board flashed with [Marauder firmware](https://github.com/justcallmekoko/ESP32Marauder)

---

## Build & Installation

### 1. Install dependencies

```bash
npm install
```

### 2. Apply the SDK patch

> ⚠️ **This step is required.** There is a known issue with the bundled `sdk.js` in `@next-flip/fz-sdk-mntm` that requires it to be replaced with the patched version included in this repository. This prerequisite will be removed in a future release.

Copy the patched `sdk.js` over the one installed by npm:

```bash
cp contrib/sdk.js node_modules/@next-flip/fz-sdk-mntm/sdk.js
```

### 3. Build the library

```bash
npm run build
```

### 4. Connect your Flipper Zero

Connect your Flipper Zero via USB if you have not already done so.

### 5. Create the library directory on the device

```bash
npm run mkdir
```

This creates the `/ext/apps/Scripts/AutoMarauder/lib/` directory on the Flipper Zero's SD card.

### 6. Upload the library to the device

```bash
npm run upload
```

This transfers the compiled library modules to the Flipper Zero. Once complete, the shared library is ready for use by any AutoMarauder script.

---

## TypeScript Definitions

When you run `npm run build`, TypeScript definition files (`.d.ts`) are generated in `dist/`. These must be copied into the `lib/` directory of any AutoMarauder script that depends on this library before building that script:

```bash
cp /path/to/lib/dist/*.d.ts /path/to/script/lib/
```

See the individual script `README.md` files for details.

---

## Related

- [AutoMarauder](https://github.com/bekindpleaserewind/automarauder) — The full AutoMarauder suite
- [Momentum Firmware](https://github.com/Next-Flip/Momentum-Firmware)
- [ESP32 Marauder](https://github.com/justcallmekoko/ESP32Marauder)
- [mJS JavaScript Engine](https://github.com/cesanta/mjs)

---

## License

MIT