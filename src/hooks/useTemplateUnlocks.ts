"use client";

import { useCallback, useEffect, useState } from "react";
import type { ArtistBaseId } from "@/lib/signature";

export function useTemplateUnlocks() {
  const [unlocked, setUnlocked] = useState<ArtistBaseId[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/templates");
      const data = await res.json();
      if (res.ok && Array.isArray(data.unlocked)) {
        setUnlocked(data.unlocked);
      }
    } catch {
      setUnlocked([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isUnlocked = useCallback(
    (id: ArtistBaseId, tier: "free" | "premium") =>
      tier === "free" || unlocked.includes(id),
    [unlocked],
  );

  const unlockTemplate = useCallback(
    async (baseId: ArtistBaseId): Promise<{
      ok: boolean;
      error?: string;
      code?: string;
      creditsRemaining?: number;
    }> => {
      const res = await fetch("/api/templates/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseId }),
      });
      const data = await res.json();
      if (!res.ok) {
        return {
          ok: false,
          error: data.error,
          code: data.code ?? (res.status === 401 ? "UNAUTHORIZED" : undefined),
        };
      }
      setUnlocked((prev) =>
        prev.includes(baseId) ? prev : [...prev, baseId],
      );
      return {
        ok: true,
        creditsRemaining: data.creditsRemaining,
      };
    },
    [],
  );

  return { unlocked, loading, refresh, isUnlocked, unlockTemplate };
}
