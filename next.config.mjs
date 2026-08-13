/** @type {import('next').NextConfig} */

/**
 * Content Security Policy.
 *
 * 'unsafe-inline' is unavoidable here: Next.js injects inline bootstrap/flight
 * scripts, and the Studio sets per-template `style={{ fontFamily }}` inline.
 * External origins are limited to Google Fonts and the Google Ads tag: the
 * pdf.js worker is served from public/pdf and AI images arrive as data: URLs.
 *
 * The gtag hosts below are what Google Ads conversion tracking actually
 * touches — googletagmanager serves gtag.js, googleadservices and doubleclick
 * serve the conversion script, and the doubleclick/googlesyndication/google
 * hosts receive the pixels. Drop any of them and the tag fails silently: the
 * page looks fine and conversions simply never arrive.
 */

/**
 * Remarketing pixels are sent to the visitor's local Google domain
 * (google.fr, google.de, …), which CSP cannot wildcard — `*.google.com` does
 * not cover `google.fr`. Countries missing from this list still record
 * conversions; only their remarketing audience signal is lost.
 */
const GOOGLE_CCTLDS = [
  "com", "co.uk", "ie", "de", "fr", "es", "it", "nl", "be", "at", "ch",
  "pt", "pl", "cz", "sk", "hu", "ro", "bg", "hr", "si", "gr", "se", "no",
  "dk", "fi", "ee", "lv", "lt", "lu", "com.mt", "com.cy", "is",
  "ca", "com.au", "co.nz", "co.jp", "co.kr", "com.sg", "com.hk", "com.tw",
  "com.br", "com.mx", "co.in",
];
const GOOGLE_DOMAINS = GOOGLE_CCTLDS.map((tld) => `https://www.google.${tld}`).join(" ");

const GOOGLE_TAG_HOSTS = {
  script:
    "https://www.googletagmanager.com https://www.googleadservices.com https://*.doubleclick.net https://*.googlesyndication.com",
  connect: `https://*.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com https://*.doubleclick.net https://*.googlesyndication.com ${GOOGLE_DOMAINS}`,
  img: `https://*.googletagmanager.com https://*.google-analytics.com https://*.doubleclick.net https://*.googlesyndication.com ${GOOGLE_DOMAINS}`,
  frame: "https://*.doubleclick.net https://www.googletagmanager.com",
};

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  `script-src 'self' 'unsafe-inline' ${GOOGLE_TAG_HOSTS.script}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  `img-src 'self' data: blob: ${GOOGLE_TAG_HOSTS.img}`,
  `connect-src 'self' ${GOOGLE_TAG_HOSTS.connect}`,
  `frame-src ${GOOGLE_TAG_HOSTS.frame}`,
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
];

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["pdfjs-dist"],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
