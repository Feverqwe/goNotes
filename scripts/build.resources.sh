#!/usr/bin/env sh

set -e

source "$(dirname $0)/_variables.sh"

cd ./notes-ui
npm run release
