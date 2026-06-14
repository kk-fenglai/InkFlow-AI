"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

export function useCredits() {
  const { data: session, status, update } = useSession();
  const [credits, setCredits] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    if (status !== "authenticated") {
      setCredits(0);
      return;
    }
    setSyncing(true);
    try {
      const res = await fetch("/api/credits");
      const data = await res.json();
      if (data.authenticated) {
        setCredits(data.credits);
        await update();
      }
    } catch {
      setCredits(session?.user?.credits ?? 0);
    } finally {
      setSyncing(false);
    }
  }, [status, session?.user?.credits, update]);

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      setCredits(0);
      return;
    }

    const userId = session?.user?.id;
    if (!userId) return;

    setCredits(session?.user?.credits ?? 0);

    let cancelled = false;
    const sessionCredits = session?.user?.credits ?? 0;
    (async () => {
      try {
        const res = await fetch("/api/credits");
        const data = await res.json();
        if (!cancelled && data.authenticated) {
          setCredits(data.credits);
          if (data.credits !== sessionCredits) {
            await update();
          }
        }
      } catch {
        /* keep session value */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status, session?.user?.id, session?.user?.credits, update]);

  useEffect(() => {
    if (status !== "authenticated") return;

    const onFocus = () => {
      void refresh();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [status, refresh]);

  return {
    credits,
    authenticated: status === "authenticated",
    /** True only while NextAuth is resolving — not during background credit sync. */
    loading: status === "loading",
    syncing,
    refresh,
  };
}
