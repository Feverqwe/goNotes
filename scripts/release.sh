#!/usr/bin/env sh

set -e

go run scripts/version/version.go up

source "$(dirname $0)/_variables.sh"

git add scripts/_variables.sh
git add main.go
git commit -m "v$VERSION"
git push

go run scripts/version/version.go tag
git push origin "v$VERSION"
