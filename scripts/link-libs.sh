#!/bin/sh
# Links the built libraries into node_modules so the demo app (and anything else
# running from compiled output) resolves them by package name.
set -e

. ./scripts/libs.sh

mkdir -p ./node_modules/@nestjslatam

for LIB in $LIBS; do
  NAME=$(node -p "require('./libs/$LIB/package.json').name.split('/')[1]")
  ln -sfn "../../dist/libs/$LIB" "./node_modules/@nestjslatam/$NAME"
done
