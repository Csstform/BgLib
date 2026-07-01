#!/usr/bin/env bash
# Run the standalone Next.js server (after `npm run build`).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .next/standalone/server.js ]]; then
  echo "Missing .next/standalone/server.js — run: npm run build" >&2
  exit 1
fi

# Load .env.local without bash interpreting < > etc.
load_env_file() {
  local file="$1"
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ "$line" =~ ^[[:space:]]*$ ]] && continue
    if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
      key="${BASH_REMATCH[1]}"
      val="${BASH_REMATCH[2]}"
      val="${val#"${val%%[![:space:]]*}"}"
      val="${val%"${val##*[![:space:]]}"}"
      if [[ "$val" == \"*\" && "$val" == *\" ]]; then val="${val:1:-1}"; fi
      if [[ "$val" == \'*\' && "$val" == *\' ]]; then val="${val:1:-1}"; fi
      export "$key=$val"
    fi
  done < "$file"
}

# Load env for manual runs (systemd injects these via EnvironmentFile)
if [[ -f .env.local ]]; then
  set -a
  load_env_file .env.local
  set +a
fi

if [[ -z "${NEXT_PUBLIC_SUPABASE_URL:-}" || -z "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}" ]]; then
  echo "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local" >&2
  exit 1
fi

cp -r public .next/standalone/public
mkdir -p .next/standalone/.next
cp -r .next/static .next/standalone/.next/static

export HOSTNAME="${BIND_HOST:-0.0.0.0}"
export PORT="${PORT:-3000}"

echo "Starting BgLib on http://${HOSTNAME}:${PORT}"
exec node .next/standalone/server.js
