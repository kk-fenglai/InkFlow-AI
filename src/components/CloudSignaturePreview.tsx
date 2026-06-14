"use client";

import { useEffect, useState } from "react";
import type { SavedSignature } from "@/lib/signature-library";
import { settingsToPngDataUrl } from "@/lib/sign-client";

interface Props {
  signature: SavedSignature;
  className?: string;
  alt?: string;
}

/** Renders a saved cloud signature as a PNG preview (client only). */
export default function CloudSignaturePreview({
  signature,
  className = "",
  alt,
}: Props) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void settingsToPngDataUrl(
      signature.strokeData.settings,
      signature.strokeData.width,
      signature.strokeData.height,
    ).then((url) => {
      if (!cancelled) setSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [signature]);

  if (!src) {
    return (
      <div
        className={`animate-pulse bg-surface-container rounded ${className}`}
        aria-hidden
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt ?? signature.name}
      draggable={false}
      className={`object-contain mix-blend-multiply ${className}`}
    />
  );
}
