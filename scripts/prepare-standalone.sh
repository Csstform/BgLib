#!/usr/bin/env bash
# Copy static assets into the Next.js standalone output (run after `npm run build`).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .next/standalone/server.js ]]; then
  echo "Missing .next/standalone/server.js — run: npm run build" >&2
  exit 1
fi

cp -r public .next/standalone/public
mkdir -p .next/standalone/.next
cp -r .next/static .next/standalone/.next/static

echo "Standalone bundle ready at .next/standalone/"
