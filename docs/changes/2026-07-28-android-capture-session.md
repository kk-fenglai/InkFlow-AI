# Change notes — 2026-07-27/28 session (Android parity + prod deploy repair)

This session's changes, recorded for the knowledge graph.

## Showcase backgrounds on Android

The Android Studio screen gained the website's "Showcase background" feature.
`ShowcaseBackgrounds.kt` ports the four web presets (Parchment, Linen, Marble,
Studio card) from `src/lib/signature-backgrounds.ts` as native Canvas drawings,
carrying the same SVG data URLs so a background saved from Android renders
identically in the web library. `drawShowcaseBackground` mirrors the web
`drawBackgroundLayer` math (opacity 0-100, cover/contain, centered).
`decodeShowcaseUpload` re-encodes user photos as JPEG under the 800 KB budget.
`SignatureHero`, `renderSignatureFontBitmap`, and `SignatureFontArt` all accept
the background layer, so preview, Share PNG, and Save to Library agree.

## Studio saves directly from settings

"Render Final Ink" (the paid `/api/generate` step) was removed from
`StudioScreen.kt`. `ApiClient.saveSignatureFromSettings` now posts the studio
settings (text, baseId, sliders, background fields) to `/api/signatures`; the
server builds the stroke payload and charges only the 1-credit cloud-save fee.
Share PNG renders locally for free. `StudioState.strokeData` and `shareBitmap`
were removed.

## SES removal

The "I accept the Simple Electronic Signature (SES) disclaimer" checkbox was
removed from `SignPdfScreen.kt` (the API client already sends
`sesAccepted: true`), and the Pricing row was renamed to "Sign PDF". The
visible `InkFlow SES · timestamp · signer` caption on signed PDFs came from an
old deployed version of `src/lib/pdf-sign.ts`; the code removal already existed
in commit b544204 and reached production once deploys were repaired.

## Production deploy repair

Vercel production deploys had been failing for a day on Prisma error P3009:
migration `20250717120000_apple_original_transaction_id` was recorded as failed
in the production Neon database because `prisma db push` had previously synced
the schema directly (local `.env` points at prod). Fixed by marking the three
stuck migrations applied (`prisma migrate resolve --applied`) and filling gaps
with idempotent SQL (`scripts/ensure-pending-migrations.sql`,
`scripts/ensure-apple-index.sql`). `prisma migrate deploy` is clean; production
now runs current main.

## Launcher icon redesign

`ic_launcher_foreground.xml` was redrawn twice: first a rounded nib + gold
swash, then (per feedback: less rounded, more signature-artistic) a faceted
angular nib tilted 28 degrees into writing posture finishing a sharp
calligraphic swash. `ic_launcher_monochrome.xml` adds Android 13 themed-icon
support. Colors stay on the Heritage Editorial palette (cream #FEF9EF, ink
#1D1C16, gold #775A19).

## Photo-capture signature extraction

`InkExtract.kt` is a Kotlin port of the web pixel pipeline in
`src/lib/ink-refine.ts`: luminance histogram stats (`computeStats`), slider
auto-derivation (`analyze`), threshold/smoothing/binarize extraction
(`process`), bounding-box trim, and PNG data-URL encoding under the 3.5 MB
captured cap. `CaptureScreen.kt` (route "capture", pushed from a Library
"Extract from Photo" button) shoots via `TakePicture` + FileProvider or picks
from the gallery, previews the extracted ink, and saves through
`ApiClient.saveCapturedSignature` (`kind: "captured"`, 1 credit).
`StrokeDataDto` gained `kind`/`capturedImage`; Library previews and the Sign
PDF picker render captured entries as images via
`ShowcaseBackgrounds.resolveBackgroundBitmap`, and signing stamps the captured
PNG directly.

## Distribution

The debug APK was shared for testing by copying it to the OneDrive-synced
`InkFlow-Android-Release` folder (`inkflow-native-1.0.0-test-20260728.apk`).
All work was committed on `fix/studio-hydration-english-only-tune` and merged
to `main` (commits 6335b35, a673b77, e1aef38).
