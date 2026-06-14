"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import {
  loadBackgroundImage,
  renderSignature,
  type SignatureSettings,
} from "@/lib/signature";

interface Props {
  settings: SignatureSettings;
  className?: string;
}

export interface SignatureCanvasHandle {
  getCanvas: () => HTMLCanvasElement | null;
}

/**
 * Responsive canvas that re-renders the signature whenever settings change,
 * the element resizes, or the web-fonts finish loading.
 */
const SignatureCanvas = forwardRef<SignatureCanvasHandle, Props>(
  function SignatureCanvas({ settings, className }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useImperativeHandle(ref, () => ({
      getCanvas: () => canvasRef.current,
    }));

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      let cancelled = false;

      const draw = async () => {
        let bg: HTMLImageElement | null = null;
        if (settings.backgroundImage) {
          try {
            bg = await loadBackgroundImage(settings.backgroundImage);
          } catch {
            bg = null;
          }
        }
        if (cancelled || !canvasRef.current) return;
        renderSignature(canvasRef.current, settings, bg);
      };

      void draw();

      if (typeof document !== "undefined" && "fonts" in document) {
        document.fonts.ready
          .then(() => {
            if (!cancelled && canvasRef.current) void draw();
          })
          .catch(() => {});
      }

      const ro = new ResizeObserver(() => {
        void draw();
      });
      ro.observe(canvas);
      return () => {
        cancelled = true;
        ro.disconnect();
      };
    }, [settings]);

    return <canvas ref={canvasRef} className={className} />;
  },
);

export default SignatureCanvas;
