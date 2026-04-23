#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

python3 "$SCRIPT_DIR/pluto_runner.py" &
PLUTO_PID=$!

cleanup() {
	kill "$PLUTO_PID" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

python3 "$SCRIPT_DIR/cors_server.py"