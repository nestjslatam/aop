#!/bin/sh
# Publishes every built library, in dependency order.
set -e

. ./scripts/libs.sh

for LIB in $LIBS; do
  echo "publishing @nestjslatam/$LIB"
  (cd "./dist/libs/$LIB" && npm publish --access public)
done
