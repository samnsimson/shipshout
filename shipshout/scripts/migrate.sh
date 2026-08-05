#!/usr/bin/env sh
set -e
cd "$(dirname "$0")/.."
bunx nx build database
bunx typeorm migration:run -d libs/data/database/dist/lib/data-source.js
