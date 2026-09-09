#!/bin/sh
# Builds every publishable library into dist/libs/<lib> and links them locally.
set -e

. ./scripts/libs.sh

for LIB in $LIBS; do
  echo "building @nestjslatam/$LIB"
  rm -rf "./dist/libs/$LIB"
  ./node_modules/.bin/tsc -p "./libs/$LIB/tsconfig.lib.json"
  sh ./scripts/copy-lib.sh "$LIB"
done

sh ./scripts/link-libs.sh
