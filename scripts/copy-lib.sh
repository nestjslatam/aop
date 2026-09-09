#!/bin/sh
# Copies the package metadata next to the compiled output of one library.
set -e

LIB="$1"

if [ -z "$LIB" ]; then
  echo "usage: copy-lib.sh <lib-folder>" >&2
  exit 1
fi

cp "./libs/$LIB/package.json" "./dist/libs/$LIB"
cp "./libs/$LIB/README.md" "./dist/libs/$LIB"
cp "./libs/$LIB/LICENSE" "./dist/libs/$LIB"
