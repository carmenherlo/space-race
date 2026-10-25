#!/usr/bin/env bash
# Development server: the app run from your files on this computer, with the
# missionboard conda environment active. Code changes (CSS, JS, Python) show up on reload.
#
# Usage: bash dev.sh [--example]
#   (no options)  your games and avatars in data/games  → http://localhost:8001/
#   --example     the example games (no board picture)  → http://localhost:8002/
set -euo pipefail
cd "$(dirname "$0")"

port=8001
export SPACE_RACE_GAMES=data/games
case "${1:-}" in
  "") ;;
  --example)
    export SPACE_RACE_GAMES=examples/games
    port=8002
    ;;
  -h | --help)
    sed -n '2,7p' "$0" | sed 's/^# \{0,1\}//'
    exit 0
    ;;
  *)
    echo "Unknown option: $1 (see: bash dev.sh --help)" >&2
    exit 1
    ;;
esac
export SPACE_RACE_CACHE="${TMPDIR:-/tmp}/space-race-dev-cache"
export SPACE_RACE_VOICE_MODEL=data/voices/es_ES-sharvard-medium.onnx  # optional

echo "Games: $SPACE_RACE_GAMES"
# Address of this computer on the home network, so a tablet can open it too.
lan_ip=$(hostname -I 2>/dev/null | awk '{print $1}')
echo "Open http://localhost:$port/ (from a tablet: http://${lan_ip:-<this computer>}:$port/)"
# 0.0.0.0: reachable from the home network, not only from this computer.
exec uvicorn app.main:app --reload --host 0.0.0.0 --port "$port"
