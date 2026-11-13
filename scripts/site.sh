#!/bin/bash
# Build the static viewer site into dist/site/ (index.html, standalone.min.js,
# index/circuit.json); `--deploy` uploads it to Cloudflare Pages, served at
# https://tscircuit.crimpdeq.com
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$PWD/node_modules/.bin:$PATH"
out="$PWD/dist/site"

# Hard time limit: Bun ignores SIGALRM and some builds hang after routing
tsci build --site index.circuit.tsx &
pid=$!
(sleep 900 && kill -9 "$pid" 2>/dev/null) &
watchdog=$!
status=0
wait "$pid" || status=$?
{ kill "$watchdog" && wait "$watchdog"; } 2>/dev/null || true
[ "$status" -eq 0 ] || { echo "site: tsci build failed ($status)" >&2; exit "$status"; }
# Publish only the accepted routing (scripts/routing.expected.json)
python3 scripts/routing.py

rm -rf "$out"
mkdir -p "$out/index"
mv dist/index.html dist/standalone.min.js "$out/"
cp dist/index/circuit.json "$out/index/"
# Same displayName hover labels as `tsci dev`
node scripts/patch-viewer.mjs "$out/standalone.min.js"

if [ "${1:-}" = "--deploy" ]; then
  npx --yes wrangler@4.142.0 pages deploy "$out" \
    --project-name crimpdeq-tscircuit --branch main --commit-dirty=true
fi
