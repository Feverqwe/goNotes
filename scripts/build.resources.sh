#!/usr/bin/env sh

set -e

source "$(dirname $0)/_variables.sh"

cd ./notes-ui
source ~/.nvm/nvm.sh
nvm use
npm run release
