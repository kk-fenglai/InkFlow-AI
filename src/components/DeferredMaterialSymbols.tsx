"use client";

import { useEffect } from "react";

const MATERIAL_SYMBOLS =
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap";

let injected = false;

/** Defers icon font so first paint is not blocked by Google Fonts CSS. */
export default function DeferredMaterialSymbols() {
  useEffect(() => {
    if (injected) return;
    injected = true;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = MATERIAL_SYMBOLS;
    link.media = "print";
    link.onload = () => {
      link.media = "all";
    };
    document.head.appendChild(link);
  }, []);

  return null;
}
