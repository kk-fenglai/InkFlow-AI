"use client";

import { useEffect, useState } from "react";
import type { SignatureStrokeData } from "@/lib/stroke-data";
import {
  buildInkLessonAssetsFromStrokeData,
  type InkLessonAssets,
} from "@/lib/ink-stroke-paths";

export function useInkLessonAssets(strokeData: SignatureStrokeData | undefined) {
  const [assets, setAssets] = useState<InkLessonAssets | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!strokeData) {
      setAssets(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void buildInkLessonAssetsFromStrokeData(strokeData)
      .then((result) => {
        if (cancelled) return;
        if (result.strokes.length === 0) {
          setError("Could not derive stroke paths for this signature.");
        }
        setAssets(result);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Failed to analyze signature strokes.");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    strokeData?.width,
    strokeData?.height,
    strokeData?.settings.baseId,
    strokeData?.settings.text,
    strokeData?.settings.fluidity,
    strokeData?.settings.rhythm,
    strokeData?.settings.pressure,
    strokeData?.settings.slant,
    strokeData?.settings.size,
    strokeData?.settings.inkColor,
    strokeData?.settings.backgroundImage,
  ]);

  return { assets, loading, error };
}
