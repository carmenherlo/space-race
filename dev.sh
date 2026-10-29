#!/usr/bin/env bash
# Development server: the app run from your files on this computer, with the
# missionboard conda environment active. Code changes (CSS, JS, Python) show up on reload.
#
# Usage: bash dev.sh   → http://localhost:8101/
#   the games from content/, your avatars and voice from data/
set -euo pipefail
cd "$(dirname "$0")"

case "${1:-}" in
  "") ;;
  -h | --help)
    sed -n '2,6p' "$0" | sed 's/^# \{0,1\}//'
    exit 0
    ;;
  *)
    echo "Unknown option: $1 (see: bash dev.sh --help)" >&2
    exit 1
    ;;
esac

port=8101
export SPACE_RACE_AVATARS=data/avatars
export SPACE_RACE_CACHE="${TMPDIR:-/tmp}/space-race-dev-cache"
export SPACE_RACE_VOICE_MODEL=data/voices/es_ES-sharvard-medium.onnx  # optional

# Address of this computer on the home network, so a tablet can open it too.
lan_ip=$(hostname -I 2>/dev/null | awk '{print $1}')
echo "Open http://localhost:$port/ (from a tablet: http://${lan_ip:-<this computer>}:$port/)"
# 0.0.0.0: reachable from the home network, not only from this computer.
exec uvicorn app.main:app --reload --host 0.0.0.0 --port "$port"
