#!/usr/bin/env sh

set -e

source "$(dirname $0)/_variables.sh"

pushd ./notes-ui
source ~/.nvm/nvm.sh
nvm use
npm run release
popd
