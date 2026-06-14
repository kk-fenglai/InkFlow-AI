"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  analyzeRefineStats,
  computeImageStats,
  processInkPixels,
  traceToSvgPath,
  type ImageStats,
} from "@/lib/ink-refine";
import { downloadCanvasPng } from "@/lib/canvas-export";

const STEPS = [
  {
    n: 1,
    title: "Capture",
    body: "Photograph your handwriting on unlined paper in well-lit conditions.",
    accent: false,
  },
  {
    n: 2,
    title: "Process",
    body: "Our engine cleans background noise and isolates strokes for crisp edges.",
    accent: false,
  },
  {
    n: 3,
    title: "Deploy",
    body: "Export as a transparent PNG for immediate use in any document.",
    accent: true,
  },
];

const INK_COLORS = ["#1d1c16", "#3a2e1a", "#1f3a64", "#5a1422"];

export default function RefinePage() {
  const [sourceImg, setSourceImg] = useState<HTMLImageElement | null>(null);
  const [threshold, setThreshold] = useState(60);
  const [smoothing, setSmoothing] = useState(35);
  const [refineStrength, setRefineStrength] = useState(50);
  const [rotation, setRotation] = useState(0);
  const [inkColor, setInkColor] = useState(INK_COLORS[0]);
  const [transparentBg, setTransparentBg] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [imageStats, setImageStats] = useState<ImageStats | null>(null);

  const outputRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        setSourceImg(img);
        const probe = document.createElement("canvas");
        probe.width = img.naturalWidth;
        probe.height = img.naturalHeight;
        const pctx = probe.getContext("2d");
        if (pctx) {
          pctx.drawImage(img, 0, 0);
          const { data } = pctx.getImageData(0, 0, probe.width, probe.height);
          const stats = computeImageStats(data, probe.width, probe.height);
          setImageStats(stats);
          const suggested = analyzeRefineStats(stats);
          setThreshold(suggested.threshold);
          setSmoothing(suggested.smoothing);
          setRefineStrength(suggested.refineStrength);
          setInkColor(suggested.inkColor);
          setStatusMsg(suggested.aiNote);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }, []);

  // Re-process whenever the source or any control changes.
  useEffect(() => {
    const canvas = outputRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    if (!sourceImg) {
      canvas.width = 800;
      canvas.height = 600;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    // Fit the source within a max bounding box, accounting for rotation.
    const maxDim = 1000;
    const swapped = rotation % 180 !== 0;
    const srcW = sourceImg.naturalWidth;
    const srcH = sourceImg.naturalHeight;
    const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
    const w = Math.round(srcW * scale);
    const h = Math.round(srcH * scale);

    canvas.width = swapped ? h : w;
    canvas.height = swapped ? w : h;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(sourceImg, -w / 2, -h / 2, w, h);
    ctx.restore();

    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const processed = processInkPixels(data, canvas.width, canvas.height, {
      threshold,
      smoothing,
      inkColor,
      transparentBg,
      refineStrength,
    });
    const out = ctx.createImageData(canvas.width, canvas.height);
    out.data.set(processed);
    ctx.putImageData(out, 0, 0);
  }, [
    sourceImg,
    threshold,
    smoothing,
    refineStrength,
    rotation,
    inkColor,
    transparentBg,
  ]);

  function saveCanvas(watermark: boolean, filename: string) {
    const canvas = outputRef.current;
    if (!canvas || !sourceImg) return;
    downloadCanvasPng(canvas, filename, { watermark });
  }

  function exportPng() {
    if (!sourceImg) return;
    saveCanvas(false, "refined-signature.png");
    setStatusMsg("Transparent PNG saved — Refinement is free.");
  }

  return (
    <main className="page-main flex flex-col gap-lg sm:gap-xxl">
      <header className="text-center max-w-2xl mx-auto space-y-md">
        <div className="inline-flex items-center gap-xs px-sm py-xs bg-tertiary/10 rounded-full border border-tertiary/20 mb-sm">
          <span className="material-symbols-outlined filled text-tertiary text-[16px]">
            auto_awesome
          </span>
          <span className="font-label-sm text-label-sm text-tertiary uppercase tracking-widest">
            Artisan Edition
          </span>
        </div>
        <h1 className="font-display-lg text-display-lg text-on-surface">
          Refinement Workbench
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          Elevate your raw, handwritten gestures into crisp, clean marks ready
          for professional digital application.
        </p>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-lg lg:gap-xl items-start">
        {/* Upload studio */}
        <div className="flex flex-col gap-md">
          <div className="flex items-center justify-between border-b border-surface-variant pb-sm">
            <h2 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-sm">
              <span className="material-symbols-outlined text-outline">
                photo_camera
              </span>
              Upload Studio
            </h2>
            <span className="font-label-sm text-label-sm text-outline-variant uppercase tracking-widest">
              Source Material
            </span>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file) loadFile(file);
            }}
            className={`relative w-full aspect-[4/3] rounded bg-surface-container-high overflow-hidden group cursor-pointer flex flex-col items-center justify-center transition-all border ${
              dragOver
                ? "border-tertiary border-2"
                : "border-outline-variant/50 hover:border-tertiary/50"
            }`}
          >
            {sourceImg ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sourceImg.src}
                  alt="Uploaded handwriting source"
                  className="absolute inset-0 w-full h-full object-contain"
                />
                <div className="absolute inset-0 bg-on-surface/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                  <div className="bg-surface/90 px-md py-sm rounded shadow-sm border border-outline-variant/30 flex items-center gap-sm">
                    <span className="material-symbols-outlined text-on-surface">
                      upload
                    </span>
                    <span className="font-label-md text-label-md text-on-surface">
                      Replace Image
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Design sample shown as an example until the user uploads. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/refine-source.png"
                  alt="A top-down view of an artist's desk with a cursive signature on cream paper and a vintage fountain pen."
                  className="absolute inset-0 w-full h-full object-cover opacity-90 sepia-[.2] contrast-125"
                />
                <span className="absolute top-sm left-sm font-label-sm text-label-sm uppercase tracking-widest text-on-surface/70 bg-surface/70 backdrop-blur-sm px-sm py-xs rounded">
                  Example
                </span>
                <div className="absolute inset-0 bg-on-surface/20 flex items-center justify-center backdrop-blur-[1px]">
                  <div className="text-center px-lg">
                    <span className="material-symbols-outlined text-surface text-[48px]">
                      cloud_upload
                    </span>
                    <p className="font-body-md text-body-md text-surface mt-sm">
                      Drag &amp; drop a photo of your signature, or click to
                      browse.
                    </p>
                    <p className="font-label-sm text-label-sm text-surface/80 mt-xs">
                      PNG · JPG · processed entirely in your browser
                    </p>
                  </div>
                </div>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) loadFile(file);
              }}
            />
          </div>

          {/* Adjustment controls */}
          <div className="p-md bg-surface-container-low rounded border border-surface-variant flex flex-col gap-md">
            <Control
              label="Ink Threshold"
              value={threshold}
              onChange={setThreshold}
            />
            <Control
              label="Edge Smoothing"
              value={smoothing}
              onChange={setSmoothing}
            />
            <Control
              label="Refine Strength"
              value={refineStrength}
              onChange={setRefineStrength}
            />
            <div className="flex flex-wrap gap-sm items-center justify-between">
              <div className="flex items-center gap-sm">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">
                  Ink
                </span>
                {INK_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setInkColor(c)}
                    aria-label={`ink ${c}`}
                    className={`w-6 h-6 rounded-full border-2 ${
                      inkColor === c
                        ? "border-tertiary scale-110"
                        : "border-outline-variant/40"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="py-sm px-md border border-outline-variant rounded font-label-sm text-label-sm text-on-surface-variant hover:bg-surface-container-high transition-colors flex items-center gap-xs"
              >
                <span className="material-symbols-outlined text-[18px]">
                  rotate_right
                </span>
                Rotate
              </button>
            </div>
          </div>
        </div>

        {/* AI masterpiece output */}
        <div className="flex flex-col gap-md">
          <div className="flex items-center justify-between border-b border-surface-variant pb-sm">
            <h2 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-sm">
              <span className="material-symbols-outlined text-tertiary">
                draw
              </span>
              Refined Output
            </h2>
            <button
              type="button"
              onClick={() => setTransparentBg((v) => !v)}
              className="font-label-sm text-label-sm text-tertiary uppercase tracking-widest hover:underline underline-offset-4"
            >
              {transparentBg ? "Transparent" : "White BG"}
            </button>
          </div>

          <div
            className={`relative w-full aspect-[4/3] rounded border border-surface-variant artisan-shadow overflow-hidden flex items-center justify-center ${
              transparentBg ? "checker" : "bg-[#fdfbf7]"
            }`}
          >
            <canvas
              ref={outputRef}
              className={`max-w-full max-h-full object-contain ${
                sourceImg ? "" : "hidden"
              }`}
            />
            {!sourceImg && (
              <>
                {/* Design sample of a refined, vectorized signature. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/refine-output.png"
                  alt="A crisp, black ink signature on a pristine white background, resembling a high-quality vector graphic."
                  className="absolute inset-0 w-full h-full object-contain mix-blend-multiply opacity-90 contrast-200 grayscale pointer-events-none"
                />
                <span className="absolute top-sm left-sm font-label-sm text-label-sm uppercase tracking-widest text-on-surface/60 bg-surface/70 backdrop-blur-sm px-sm py-xs rounded">
                  Example result
                </span>
              </>
            )}
            {sourceImg && (
              <div className="absolute bottom-md right-md flex items-center gap-xs text-on-surface-variant/60">
                <span className="material-symbols-outlined text-[16px]">
                  check_circle
                </span>
                <span className="font-label-sm text-label-sm">Refined</span>
              </div>
            )}
          </div>

          <div className="p-md bg-primary-container rounded border border-surface-variant flex flex-col gap-md">
            <p className="font-body-md text-body-md text-on-surface-variant text-center">
              {sourceImg
                ? "Your signature is ready for professional use."
                : "Upload a photo to begin refining."}
            </p>
            <button
              type="button"
              disabled={!sourceImg}
              onClick={exportPng}
              className="py-md px-sm bg-tertiary text-on-tertiary rounded font-label-md text-label-md hover:bg-tertiary/90 transition-colors flex justify-center items-center gap-sm artisan-shadow disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[20px]">
                image
              </span>
              Save Transparent PNG
            </button>
            <p className="font-label-sm text-label-sm text-center text-on-surface-variant">
              Free — processed in your browser
            </p>
            <button
              type="button"
              disabled={!sourceImg}
              onClick={() => {
                const canvas = outputRef.current;
                if (!canvas) return;
                const ctx = canvas.getContext("2d");
                if (!ctx) return;
                const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const path = traceToSvgPath(data, canvas.width, canvas.height);
                const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}"><path d="${path}" fill="none" stroke="${inkColor}" stroke-width="2" stroke-linecap="round"/></svg>`;
                const blob = new Blob([svg], { type: "image/svg+xml" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "refined-signature.svg";
                a.click();
                URL.revokeObjectURL(url);
                setStatusMsg("SVG vector trace exported.");
              }}
              className="py-sm border border-outline-variant rounded font-label-sm text-label-sm text-on-surface-variant hover:bg-surface-container-high"
            >
              Export SVG trace (free)
            </button>
            {statusMsg && (
              <p className="font-label-sm text-label-sm text-center text-on-surface-variant">
                {statusMsg}{" "}
                <Link href="/login" className="text-tertiary underline">
                  Sign in
                </Link>
                {" · "}
                <Link href="/pricing" className="text-tertiary underline">
                  Pricing
                </Link>
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="max-w-3xl mx-auto w-full pt-xl border-t border-outline-variant/30">
        <h3 className="font-headline-sm text-headline-sm text-on-surface mb-lg text-center">
          The Refinement Process
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="flex flex-col items-center text-center gap-sm"
            >
              <div
                className={`w-12 h-12 rounded-full border flex items-center justify-center ${
                  s.accent
                    ? "border-tertiary/30 text-tertiary bg-tertiary/5"
                    : "border-outline-variant text-on-surface-variant bg-surface-container"
                }`}
              >
                <span className="font-headline-sm text-headline-sm">{s.n}</span>
              </div>
              <h4 className="font-label-md text-label-md text-on-surface uppercase tracking-widest">
                {s.title}
              </h4>
              <p className="font-body-md text-body-md text-on-surface-variant">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <style jsx>{`
        .checker {
          background-image: linear-gradient(45deg, #e7e2d9 25%, transparent 25%),
            linear-gradient(-45deg, #e7e2d9 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #e7e2d9 75%),
            linear-gradient(-45deg, transparent 75%, #e7e2d9 75%);
          background-size: 20px 20px;
          background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
          background-color: #fdfbf7;
        }
      `}</style>
    </main>
  );
}

function Control({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-xs">
      <div className="flex justify-between items-center">
        <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">
          {label}
        </label>
        <span className="font-body-md text-body-md text-on-surface">
          {value}%
        </span>
      </div>
      <input
        className="w-full"
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
