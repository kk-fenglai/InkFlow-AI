import type { Metadata, Viewport } from "next";
import { Libre_Caslon_Text, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import Providers from "@/components/Providers";

const MATERIAL_SYMBOLS =
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap";

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
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
      </head>
      <body className="bg-background text-on-background min-h-screen flex flex-col font-body-md antialiased selection:bg-tertiary-fixed selection:text-on-tertiary-fixed">
        <Providers>
          <NavBar />
          <div className="flex-grow flex flex-col">{children}</div>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
