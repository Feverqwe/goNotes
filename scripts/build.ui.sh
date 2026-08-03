#!/usr/bin/env sh

set -e

source "$(dirname $0)/_variables.sh"

rm -r assets/www
mkdir -p assets/www

cd ./notes-ui
npm run release
