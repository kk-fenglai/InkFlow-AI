#!/bin/bash
# Run on macOS to generate Xcode project and open it.
set -euo pipefail
cd "$(dirname "$0")"

if [[ -f scripts/prepare-icons.sh ]]; then
  bash scripts/prepare-icons.sh || true
fi

if ! command -v xcodegen &>/dev/null; then
  echo "Installing XcodeGen via Homebrew..."
  brew install xcodegen
fi

xcodegen generate
echo ""
echo "✓ Generated InkFlowAI.xcodeproj"
echo ""
echo "Next steps:"
echo "  1. open InkFlowAI.xcodeproj"
echo "  2. Select your Team in Signing & Capabilities"
echo "  3. StoreKit: InkFlowAI.storekit is wired for Debug runs"
echo "  4. Product → Run (⌘R)"
echo ""
open InkFlowAI.xcodeproj
