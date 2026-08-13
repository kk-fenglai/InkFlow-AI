/** Shared contract between the pre-gtag consent defaults and the banner UI. */

export const CONSENT_STORAGE_KEY = "inkflow-ad-consent";

/** Consent Mode v2 signals. The two `ad_*` ones are the v2 additions. */
export const CONSENT_SIGNALS = [
  "ad_storage",
  "ad_user_data",
  "ad_personalization",
  "analytics_storage",
] as const;

/**
 * EEA + UK + Switzerland — where advertising cookies need opt-in consent.
 * Google resolves the visitor's region itself, so no geo lookup is needed on
 * our side; visitors elsewhere keep the granted default until they opt out.
 */
export const CONSENT_REQUIRED_REGIONS = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
  "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
  "SI", "ES", "SE", "IS", "LI", "NO", "GB", "CH",
];

/**
 * Runs before gtag.js so Google never sets an advertising cookie ahead of the
 * visitor's choice. Inlined into the document head via next/script.
 */
export function consentDefaultsScript(): string {
  const denied = Object.fromEntries(CONSENT_SIGNALS.map((s) => [s, "denied"]));
  const granted = Object.fromEntries(
    CONSENT_SIGNALS.map((s) => [s, "granted"]),
  );

  return `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', ${JSON.stringify({
    ...denied,
    region: CONSENT_REQUIRED_REGIONS,
    wait_for_update: 500,
  })});
gtag('consent', 'default', ${JSON.stringify(granted)});
try {
  var choice = localStorage.getItem(${JSON.stringify(CONSENT_STORAGE_KEY)});
  if (choice === 'granted') gtag('consent', 'update', ${JSON.stringify(granted)});
  else if (choice === 'denied') gtag('consent', 'update', ${JSON.stringify(denied)});
} catch (e) {}`;
}
