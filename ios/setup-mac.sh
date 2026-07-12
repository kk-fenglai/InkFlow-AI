#!/bin/bash
# Run on macOS to generate Xcode project and open it.
set -euo pipefail
cd "$(dirname "$0")"

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
echo "  3. Add StoreKit Configuration file for local IAP testing (optional)"
echo "  4. Product → Run (⌘R)"
echo ""
open InkFlowAI.xcodeproj
