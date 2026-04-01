#!/bin/bash

for script in $@
do
    echo "$script"
    sed -i 's/void 0/undefined/g' $script 
    sed -i 's/^Object.defineProperty(exports.*$//g' $script
    sed -i 's/^let .* = undefined.*$//' $script
    sed -i 's/^import .*$//g' $script 
    sed -i 's/^;$//g' $script

    grep -n "void \|__commonJS\|__export\|__defProp\|=>" $script && echo "⚠ mJS incompatible patterns found (void)" || echo "✅ Bundle looks clean (void)"
    grep -n "^Object\\.defineProperty(exports.*$" $script && echo "⚠ mJS incompatible patterns found (Object.defineProperty)" || echo "✅ Bundle looks clean (Object.defineProperty)"
    grep -n "^exports\\." $script && echo "⚠ mJS incompatible patterns found (exports)" || echo "✅ Bundle looks clean (exports)"
done 
