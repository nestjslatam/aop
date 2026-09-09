#!/bin/sh
# Builds every publishable library into libs/<lib>/dist, in dependency order.
set -e

. ./scripts/libs.sh

for LIB in $LIBS; do
  echo "building @nestjslatam/$LIB"
  rm -rf "./libs/$LIB/dist" "./libs/$LIB/tsconfig.lib.tsbuildinfo"
  ./node_modules/.bin/tsc -p "./libs/$LIB/tsconfig.lib.json"
done
