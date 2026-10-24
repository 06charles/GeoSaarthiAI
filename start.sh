#!/usr/bin/env bash

# GeoSaarthi AI - macOS / Linux One-Click Launcher
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "======================================================="
echo "   GeoSaarthi AI — macOS / Linux One-Click Launcher   "
echo "======================================================="

# Verify Node.js
if ! command -v node >/dev/null 2>&1; then
    echo "Error: Node.js is not installed or not in PATH."
    echo "Please install Node.js (v18+) from https://nodejs.org"
    exit 1
fi

# Verify dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing project dependencies..."
    npm install
fi

# Launch unified runtime and web application
exec node "$SCRIPT_DIR/scripts/start-all.js"
