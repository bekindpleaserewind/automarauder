#!/bin/bash

sed -i 's/void 0/undefined/g' $1
sed -i 's/^Object.defineProperty(exports.*$//g' $1
sed -i 's/^let .* = undefined.*$//' $1
sed -i 's/^import .*$//g' $1
#sed -i 's/^const .* require.*$//g' $1

grep -n "void \|__commonJS\|__export\|__defProp\|=>" $1 && echo "⚠ mJS incompatible patterns found (void)" \
  || echo "✅ Bundle looks clean (void)"
grep -n "^Object\\.defineProperty(exports.*$" $1 && echo "⚠ mJS incompatible patterns found (Object.defineProperty)" \
  || echo "✅ Bundle looks clean (Object.defineProperty)"
grep -n "^exports\\." $1 && echo "⚠ mJS incompatible patterns found (exports)" \
  || echo "✅ Bundle looks clean (exports)"