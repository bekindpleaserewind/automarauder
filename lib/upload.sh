#!/bin/bash

AUTOMARAUDER_DIR="/ext/apps/Scripts/AutoMarauder/lib"
DIST_DIR="dist"

D=$(pwd)

cd $DIST_DIR
for script in $(ls *.js)
do
    cd $D
    node node_modules/@next-flip/fz-sdk-mntm/sdk.js upload "$AUTOMARAUDER_DIR" "$DIST_DIR/$script" "$script"
    pwd
    cd $DIST_DIR

done

cd $D
exit 0
