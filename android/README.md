# InkFlow AI — Native Android (Kotlin + Jetpack Compose)

Real native client (not a TWA / WebView shell). Shares the same Vercel API as iOS and the website.

## Open in Android Studio

1. **File → Open** → select this `android/` folder  
2. Wait for Gradle sync  
3. Run on emulator or device (▶)

Package ID: `com.inkflow.ai`  
Debug builds use `com.inkflow.ai.debug`

## Build debug APK (CLI)

```bash
cd android
./gradlew assembleDebug
```

APK output:

```
app/build/outputs/apk/debug/app-debug.apk
```

Install:

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

## Features (v1.1 — Heritage Editorial UI)

UI follows the Heritage Editorial design system (warm cream surfaces, Source Serif 4
headlines, Inter labels, hairline borders — see `ui/Theme.kt`, `ui/Type.kt`,
`ui/Components.kt`, and `core/DesignTokens.kt`).

| Screen | Status |
|--------|--------|
| Login / Register / Forgot password | Connected to `/api/mobile/*` and `/api/auth/forgot-password` |
| Studio | Templates, sliders, generate, save, share PNG |
| Refine | Gallery/camera upload → `/api/refine` handwriting analysis |
| Sign PDF | Pick PDF, drag signature placement, SES → `/api/sign/pdf` (1 credit), save/share |
| Library | List & delete cloud signatures |
| Account | Credits, delete account, sign out |
| Pricing | Google Play Billing → `/api/google/verify-purchase` |

## API

Production: `https://signaturegeneratorai.vercel.app`

Override at build time in `app/build.gradle.kts` → `buildConfigField("API_BASE_URL", ...)`.

## Google Play Billing setup

Product IDs (must match Play Console):

- `com.inkflow.ai.credits.20`
- `com.inkflow.ai.credits.50`
- `com.inkflow.ai.credits.120`
- `com.inkflow.ai.pro.monthly`

Server env (Vercel) — see root `.env.example`:

- `GOOGLE_PLAY_PACKAGE_NAME=com.inkflow.ai`
- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON=...`
- Dev only: `GOOGLE_PLAY_SKIP_VERIFY=true` (never in production)

See [docs/ANDROID_PLAY_GUIDE.md](../docs/ANDROID_PLAY_GUIDE.md).

## Project layout

```
android/
  app/src/main/java/com/inkflow/ai/
    app/          # MainActivity
    core/         # ApiClient, Auth, Billing, Models
    features/     # auth, studio, library, account, pricing
    ui/           # Theme, navigation
```
