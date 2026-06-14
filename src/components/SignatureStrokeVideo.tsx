"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { SignatureStrokeData } from "@/lib/stroke-data";
import { inkLessonDuration } from "@/lib/ink-stroke-paths";
import { drawInkVideoFrame } from "@/lib/stroke-player";
import { useInkLessonAssets } from "@/hooks/useInkLessonAssets";
import SignatureFontsLoader from "@/components/SignatureFontsLoader";

const SPEEDS = [0.75, 1, 1.25, 1.5] as const;

interface SignatureStrokeVideoProps {
  strokeData: SignatureStrokeData;
  autoPlay?: boolean;
  loop?: boolean;
  className?: string;
}

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `0:${s.toString().padStart(2, "0")}`;
}

export default function SignatureStrokeVideo({
  strokeData,
  autoPlay = true,
  loop = true,
  className = "",
}: SignatureStrokeVideoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const progressRef = useRef(0);
  const playingRef = useRef(autoPlay);
  const lastTickRef = useRef<number | null>(null);

  const { assets, loading, error } = useInkLessonAssets(strokeData);
  const duration = assets
    ? inkLessonDuration(assets.strokes)
    : 4;
  const [playing, setPlaying] = useState(autoPlay);
  const [progress, setProgress] = useState(0);
  const [speedIdx, setSpeedIdx] = useState(1);

  const speed = SPEEDS[speedIdx];
  const aspectRatio = `${strokeData.width} / ${strokeData.height}`;
  const ready = !!assets && assets.strokes.length > 0;

  const paint = useCallback(
    (value: number) => {
      const canvas = canvasRef.current;
      if (!canvas || !assets) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w <= 0 || h <= 0) return;

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      drawInkVideoFrame(
        ctx,
        w,
        h,
        assets,
        strokeData.width,
        strokeData.height,
        value,
      );
    },
    [assets, strokeData.width, strokeData.height],
  );

  const stopLoop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    lastTickRef.current = null;
  }, []);

  const tick = useCallback(
    (now: number) => {
      if (!playingRef.current) return;

      if (lastTickRef.current == null) lastTickRef.current = now;
      const dt = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;

      let next = progressRef.current + (dt * speed) / duration;
      if (next >= 1) {
        if (loop) {
          next = next % 1;
        } else {
          next = 1;
          playingRef.current = false;
          setPlaying(false);
        }
      }

      progressRef.current = next;
      setProgress(next);
      paint(next);

      if (playingRef.current) {
        rafRef.current = requestAnimationFrame(tick);
      }
    },
    [duration, loop, paint, speed],
  );

  const startLoop = useCallback(() => {
    stopLoop();
    rafRef.current = requestAnimationFrame(tick);
  }, [stopLoop, tick]);

  useEffect(() => {
    progressRef.current = 0;
    setProgress(0);
    playingRef.current = autoPlay;
    setPlaying(autoPlay);
    if (ready) paint(0);
    if (autoPlay && ready) startLoop();
    else stopLoop();
    return stopLoop;
  }, [strokeData, autoPlay, paint, startLoop, stopLoop, ready]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !ready) return;

    const ro = new ResizeObserver(() => {
      paint(progressRef.current);
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [paint, ready]);

  useEffect(() => {
    playingRef.current = playing;
    if (playing && ready) startLoop();
    else stopLoop();
  }, [playing, startLoop, stopLoop, speed, ready]);

  function togglePlay() {
    setPlaying((p) => !p);
  }

  function restart() {
    progressRef.current = 0;
    setProgress(0);
    paint(0);
    playingRef.current = true;
    setPlaying(true);
  }

  function onScrub(value: number) {
    const clamped = Math.max(0, Math.min(1, value));
    progressRef.current = clamped;
    setProgress(clamped);
    paint(clamped);
  }

  return (
    <div
      className={`overflow-hidden rounded-lg border border-outline-variant/40 bg-[#1a1814] shadow-lg ${className}`}
    >
      <SignatureFontsLoader />
      <div
        className="relative w-full bg-[#fdfbf7]"
        style={{ aspectRatio }}
      >
        {(loading || !ready) && !error && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#fdfbf7]">
            <p className="font-label-sm text-label-sm text-on-surface-variant">
              Analyzing stroke order…
            </p>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#fdfbf7] p-md text-center">
            <p className="font-label-sm text-label-sm text-on-surface-variant">
              {error}
            </p>
          </div>
        )}
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      </div>

      <div className="flex flex-wrap items-center gap-xs bg-[#1a1814] px-sm py-sm text-[#f5f0e6] sm:gap-sm">
        <button
          type="button"
          onClick={togglePlay}
          disabled={!ready}
          className="rounded p-xs hover:bg-white/10 disabled:opacity-40"
          aria-label={playing ? "Pause" : "Play"}
        >
          <span className="material-symbols-outlined text-[22px]">
            {playing ? "pause" : "play_arrow"}
          </span>
        </button>
        <button
          type="button"
          onClick={restart}
          disabled={!ready}
          className="rounded p-xs hover:bg-white/10 disabled:opacity-40"
          aria-label="Restart"
        >
          <span className="material-symbols-outlined text-[20px]">replay</span>
        </button>

        <span className="font-label-sm text-[11px] tabular-nums text-white/70">
          {formatTime(progress * duration)} / {formatTime(duration)}
        </span>

        <input
          type="range"
          min={0}
          max={1000}
          value={Math.round(progress * 1000)}
          onChange={(e) => onScrub(Number(e.target.value) / 1000)}
          disabled={!ready}
          className="min-w-0 flex-1 accent-tertiary disabled:opacity-40 sm:min-w-[120px]"
          aria-label="Playback progress"
        />

        <label className="flex items-center gap-xs font-label-sm text-[11px] text-white/70">
          Speed
          <select
            value={speedIdx}
            onChange={(e) => setSpeedIdx(Number(e.target.value))}
            className="rounded border border-white/20 bg-transparent px-xs py-[2px] text-[11px] text-white"
          >
            {SPEEDS.map((s, i) => (
              <option key={s} value={i} className="text-black">
                {s}x
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
