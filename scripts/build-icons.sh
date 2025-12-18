#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   scripts/build-icons.sh assets/icon-source.png
# Generates PNG icons into icons/ directory at sizes: 16, 24, 32, 48, 128
# Requires macOS 'sips' or 'ImageMagick' 'convert'.

SRC="${1:-assets/icon-source.png}"
OUT_DIR="icons"
mkdir -p "${OUT_DIR}"

if command -v sips >/dev/null 2>&1; then
  for size in 16 24 32 48 128; do
    sips -s format png -z "${size}" "${size}" "${SRC}" --out "${OUT_DIR}/icon${size}.png" >/dev/null
    echo "Generated ${OUT_DIR}/icon${size}.png"
  done
elif command -v convert >/dev/null 2>&1; then
  for size in 16 24 32 48 128; do
    convert "${SRC}" -resize ${size}x${size} "${OUT_DIR}/icon${size}.png"
    echo "Generated ${OUT_DIR}/icon${size}.png"
  done
else
  echo "Neither 'sips' nor 'convert' found. Please install ImageMagick or use macOS sips."
  exit 1
fi

echo "All icons generated in ${OUT_DIR}/"
