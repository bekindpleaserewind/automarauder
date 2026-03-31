#!/bin/bash
npx npm run build && \
npx npm run post ./dist/src/util.js && \
npx npm run post ./dist/src/serial.js && \
npx npm run post ./dist/src/view.js && \
npx npm run post ./dist/src/wifi.js && \

npx npm run mkdir /ext/apps/Scripts/AutoMarauder/lib ./dist/src/util.js util.js && \

npx npm run upload /ext/apps/Scripts/AutoMarauder/lib ./dist/src/util.js util.js && \
npx npm run upload /ext/apps/Scripts/AutoMarauder/lib ./dist/src/serial.js serial.js && \
npx npm run upload /ext/apps/Scripts/AutoMarauder/lib ./dist/src/view.js view.js && \
npx npm run upload /ext/apps/Scripts/AutoMarauder/lib ./dist/src/wifi.js wifi.js
