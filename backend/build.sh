#!/usr/bin/env bash
set -e

echo "[build] Installing Python dependencies..."
pip install -r requirements.txt

echo "[build] Build complete."
