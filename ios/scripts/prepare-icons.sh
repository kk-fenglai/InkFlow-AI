#!/bin/bash
# Copy web store icon into iOS AppIcon asset (run on Mac from repo root or ios/).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/public/icons/icon-store-512.png"
DEST="$ROOT/ios/InkFlowAI/Resources/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png"

if [[ ! -f "$SRC" ]]; then
  echo "Missing source icon: $SRC"
  exit 1
fi

mkdir -p "$(dirname "$DEST")"

if command -v sips &>/dev/null; then
  sips -z 1024 1024 "$SRC" --out "$DEST" >/dev/null
  echo "✓ Wrote $DEST (1024×1024 via sips)"
else
  cp "$SRC" "$DEST"
  echo "⚠ Copied $SRC → $DEST (install sips/macOS to upscale to 1024×1024)"
fi

echo "Regenerate Xcode project: cd ios && xcodegen generate"
