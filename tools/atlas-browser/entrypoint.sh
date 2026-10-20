#!/bin/sh
set -eu
test "$#" -eq 1
exec /atlas-network-deny /usr/local/bin/node22 /atlas/tests/atlas/isolated-browser.mjs /candidate /manifest.json "$1" /evidence "$(/usr/local/bin/node22 -p 'require("/atlas/tools/atlas-browser/node_modules/playwright").chromium.executablePath()')" /atlas/tools/atlas-browser/node_modules/playwright /evidence/engine-provenance.json
