#!/bin/bash
# Regenerate lib/handRoutes.ts: build the board without those routes and without
# the autorouter (GND_ROUTER_SKIP), then route the nets in scripts/handroute.json
# with scripts/handroute.ts. Run after any change to placement or to the other
# hand-routed traces, then npm run verify and python3 scripts/routing.py --update.
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$PWD/node_modules/.bin:$PATH"
scratch=$(mktemp -d)
cp lib/handRoutes.ts "$scratch/handRoutes.ts"
# Until the new routes are written, any exit restores the previous ones
done=0
trap '[ "$done" = 1 ] || cp "$scratch/handRoutes.ts" lib/handRoutes.ts; rm -rf "$scratch"' EXIT
trap 'exit 130' INT TERM

echo "export const HAND_ROUTES: any[] = []" > lib/handRoutes.ts
rm -f dist/index/circuit.json
# Hard time limit: Bun ignores SIGALRM and some builds hang after routing
GND_ROUTER_SKIP=1 tsci build index.circuit.tsx --ignore-warnings > "$scratch/build.log" 2>&1 &
pid=$!
(sleep 600 && kill -9 "$pid" 2>/dev/null) &
watchdog=$!
wait "$pid" || true
{ kill "$watchdog" && wait "$watchdog"; } 2>/dev/null || true
[ -s dist/index/circuit.json ] || { echo "handroute: build failed" >&2; exit 1; }
cp dist/index/circuit.json "$scratch/unrouted.json"
bun scripts/handroute.ts "$scratch/unrouted.json" scripts/handroute.json "$scratch/handRoutes.new.ts" || {
  echo "handroute: some nets did not route; lib/handRoutes.ts unchanged" >&2
  exit 1
}
cp "$scratch/handRoutes.new.ts" lib/handRoutes.ts
done=1
