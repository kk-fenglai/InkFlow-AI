"use client";

import { useEffect } from "react";

/**
 * Registers the PWA service worker (public/sw.js) once on the client.
 * Required for the site to be an installable PWA, which in turn lets the
 * Android TWA wrapper (Bubblewrap) treat it as a trusted web app.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* registration failures are non-fatal for the site */
      });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
