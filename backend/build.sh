#!/usr/bin/env bash
set -e

echo "[build] Updating apt package lists..."
apt-get update -qq

echo "[build] Installing Tesseract OCR engine + English language data..."
apt-get install -y --no-install-recommends tesseract-ocr tesseract-ocr-eng

echo "[build] Tesseract version: $(tesseract --version 2>&1 | head -1)"
echo "[build] Tesseract binary location: $(which tesseract)"

echo "[build] Installing Python dependencies..."
pip install -r requirements.txt

echo "[build] Build complete."
