#!/usr/bin/env bash
set -euo pipefail

DIST="dist"
ZIP_NAME="gmail-ai-copilot-v0.2.0.zip"
mkdir -p "${DIST}"

# Exclude git and dist and scripts from the package to keep it clean
zip -r "${DIST}/${ZIP_NAME}" . \
  -x "*.git*" \
  -x "dist/*" \
  -x "scripts/*"

echo "Packed extension at ${DIST}/${ZIP_NAME}"
