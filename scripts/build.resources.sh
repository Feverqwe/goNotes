#!/usr/bin/env sh

set -e

source "$(dirname $0)/_variables.sh"

pushd ./notes-ui
source ~/.nvm/nvm.sh
nvm use
npm run release
popd

cd assets
go get github.com/jteeuwen/go-bindata/...
go install github.com/jteeuwen/go-bindata/...
~/go/bin/go-bindata ./www ./www/icons
sed 's/package main/package assets/g' ./bindata.go > ./bindata_.go
mv ./bindata_.go ./bindata.go
