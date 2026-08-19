#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PORT="${PORT:-23456}"
OMNIROUTE_DATA_DIR="${DATA_DIR:-$HOME/.omniroute}"

echo "=========================================="
echo " OmniRoute Test Server Launcher (:23456)  "
echo "=========================================="
echo "[rebuild-test-server] Target port: $PORT"
echo "[rebuild-test-server] Data directory: $OMNIROUTE_DATA_DIR"

# 1. Clean up any existing process listening on port 23456
echo "[rebuild-test-server] Stopping any existing process on port $PORT..."
if command -v fuser >/dev/null 2>&1; then
  fuser -k -9 "${PORT}/tcp" 2>/dev/null || true
fi
if command -v lsof >/dev/null 2>&1; then
  PID=$(lsof -t -i:"${PORT}" 2>/dev/null || true)
  if [ -n "$PID" ]; then
    echo "[rebuild-test-server] Killing PID $PID on port $PORT..."
    kill -9 $PID 2>/dev/null || true
  fi
fi

# 2. Check and restore latest database backup if available
BACKUP_DIR="${OMNIROUTE_DATA_DIR}/db_backups"
DB_FILE="${OMNIROUTE_DATA_DIR}/storage.sqlite"

if [ -d "$BACKUP_DIR" ]; then
  LATEST_BACKUP=$(ls -t "${BACKUP_DIR}"/*.sqlite 2>/dev/null | head -n 1 || true)
  if [ -n "$LATEST_BACKUP" ] && [ -f "$LATEST_BACKUP" ]; then
    echo "[rebuild-test-server] Found latest backup: $LATEST_BACKUP"
    echo "[rebuild-test-server] Restoring latest backup to $DB_FILE..."
    cp "$LATEST_BACKUP" "$DB_FILE"
    echo "[rebuild-test-server] Backup restored successfully."
  fi
else
  echo "[rebuild-test-server] No backup directory found at $BACKUP_DIR; using existing DB."
fi

# 3. Export environment and launch Next.js dev server
export PORT="$PORT"
export DATA_DIR="$OMNIROUTE_DATA_DIR"
export TURBOPACK=0

echo "=========================================="
echo " Launching dev server on http://0.0.0.0:${PORT} "
echo " Press Ctrl+C to stop. "
echo "=========================================="

exec node --max-old-space-size=8192 scripts/dev/run-next.mjs dev
