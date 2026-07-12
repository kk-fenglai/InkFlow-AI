# InkFlow AI — iOS (SwiftUI)

Native iOS client. **Open on a Mac with Xcode 15+.**

## Quick start (Mac)

```bash
cd ios
chmod +x setup-mac.sh
./setup-mac.sh
```

This installs [XcodeGen](https://github.com/yonaskolb/XcodeGen) (via Homebrew), generates `InkFlowAI.xcodeproj`, and opens Xcode.

### Manual setup

```bash
brew install xcodegen
cd ios
xcodegen generate
open InkFlowAI.xcodeproj
```

1. **Signing**: Target → Signing & Capabilities → select your **Team**
2. **Bundle ID**: `com.inkflow.ai` (must match App Store Connect)
3. **Run**: ⌘R on simulator or device

## What's included (v0.2)

| Tab | Status |
|-----|--------|
| Login / Register | ✅ API connected |
| Forgot password | ✅ Email reset link |
| Studio | ✅ Generate, preview, save to library, share PNG |
| Cloud Library | ✅ List & delete saved signatures |
| Refine | ✅ Photo upload + free ink analysis |
| Sign PDF | ✅ Pick PDF, place signature, SES sign (1 credit), share |
| Account | ✅ Credits, IAP, delete account, sign out |
| Pricing | ✅ StoreKit 2 UI (needs App Store Connect products) |

## API

Production: `https://signaturegeneratorai.vercel.app`

### Local backend

In Xcode: **Product → Scheme → Edit Scheme → Run → Arguments → Environment Variables**

```
INKFLOW_API_BASE = http://localhost:3000
```

Run `npm run dev` on your Mac and set `MOBILE_CORS_ORIGINS=*` in `.env`.

## StoreKit testing

1. App Store Connect → create IAP products (IDs in `StoreManager.swift`)
2. Xcode → **File → New → StoreKit Configuration File** for sandbox testing without Connect
3. Server must have matching `APPLE_IAP_*` env vars on Vercel

## Project structure

```
ios/
  project.yml          # XcodeGen spec
  setup-mac.sh         # One-command Mac setup
  InkFlowAI/
    App/               # Entry, tabs, root
    Core/              # API, auth, StoreKit, design tokens
    Features/          # Auth, Studio, Account, Pricing, …
```

## Roadmap

See [docs/IOS_APP_STORE_PLAN.md](../docs/IOS_APP_STORE_PLAN.md).
