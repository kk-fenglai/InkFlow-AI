"use client";

import { useEffect } from "react";
import { SIGNATURE_FONTS_STYLESHEET } from "@/lib/signature-fonts-url";

let injected = false;

function ensurePreconnect() {
  if (document.querySelector('link[data-inkflow-preconnect="gfonts"]')) return;
  const api = document.createElement("link");
  api.rel = "preconnect";
  api.href = "https://fonts.googleapis.com";
  api.dataset.inkflowPreconnect = "gfonts";
  document.head.appendChild(api);

  const static_ = document.createElement("link");
  static_.rel = "preconnect";
  static_.href = "https://fonts.gstatic.com";
  static_.crossOrigin = "";
  document.head.appendChild(static_);
}

/** Loads ~50 signature preview fonts only where Studio renders templates. */
export default function SignatureFontsLoader() {
  useEffect(() => {
    if (injected) return;
    injected = true;
    ensurePreconnect();

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = SIGNATURE_FONTS_STYLESHEET;
    link.media = "print";
    link.onload = () => {
      link.media = "all";
    };
    document.head.appendChild(link);
  }, []);

  return null;
}
