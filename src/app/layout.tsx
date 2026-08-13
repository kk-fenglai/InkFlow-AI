import type { Metadata, Viewport } from "next";
import { Libre_Caslon_Text, Hanken_Grotesk } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import Providers from "@/components/Providers";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import CookieConsent from "@/components/CookieConsent";
import { consentDefaultsScript } from "@/lib/consent";

const MATERIAL_SYMBOLS =
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap";

/** Google Ads (gtag.js). Lives in the root layout, so it loads on every page. */
const GOOGLE_ADS_ID = "AW-18340546644";

const libreCaslon = Libre_Caslon_Text({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-libre-caslon",
  display: "swap",
});

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  display: "swap",
});

export const metadata: Metadata = {
  title: "InkFlow AI – Artisan Edition",
  description:
    "Craft a signature that carries the weight, texture, and undeniable presence of traditional ink on paper. An AI artistic signature studio.",
  applicationName: "InkFlow AI",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "InkFlow AI",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fef9ef",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`light bg-background ${libreCaslon.variable} ${hanken.variable}`}
    >
      <head>
        <link rel="stylesheet" href={MATERIAL_SYMBOLS} />
        {/* Must execute before gtag.js, or Google may set an advertising
            cookie before the visitor has answered the banner. */}
        <Script
          id="google-consent-defaults"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: consentDefaultsScript() }}
        />
      </head>
      <body className="bg-background text-on-background min-h-screen flex flex-col font-body-md antialiased selection:bg-tertiary-fixed selection:text-on-tertiary-fixed">
        <Providers>
          <NavBar />
          <div className="flex-grow flex flex-col">{children}</div>
          <Footer />
        </Providers>
        <ServiceWorkerRegister />
        <CookieConsent />
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-tag" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GOOGLE_ADS_ID}');`}
        </Script>
      </body>
    </html>
  );
}
