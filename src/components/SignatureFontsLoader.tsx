"use client";

import { useEffect } from "react";
import { ensureSignatureFonts } from "@/lib/signature-fonts-client";

/**
 * Eagerly loads the signature preview fonts on Studio routes, where the whole
 * template grid renders at once. Elsewhere the faces are pulled on demand by
 * `ensureFontReady` in sign-client.
 */
export default function SignatureFontsLoader() {
  useEffect(() => {
    void ensureSignatureFonts();
  }, []);

  return null;
}
