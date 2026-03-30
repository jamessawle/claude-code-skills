#!/usr/bin/env bash
set -euo pipefail

MARKETPLACE_ROOT="${1:?Usage: validate.sh <path-to-marketplace-root>}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ ! -f "$MARKETPLACE_ROOT/.claude-plugin/marketplace.json" ]; then
  echo "Error: $MARKETPLACE_ROOT/.claude-plugin/marketplace.json not found"
  exit 1
fi

echo "=== Marketplace structure validation ==="
node "$SCRIPT_DIR/scripts/validate.mjs" "$MARKETPLACE_ROOT"
