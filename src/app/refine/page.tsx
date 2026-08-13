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
import { useCredits } from "@/hooks/useCredits";
import {
  generateAiPhotoSignature,
  redesignAiPhotoSignature,
  saveCapturedSignature,
} from "@/lib/signature-api";
import {
  AI_PHOTO_STYLES,
  DEFAULT_AI_PHOTO_STYLE_ID,
} from "@/lib/ai-photo-styles";
import { SHOWCASE_PRESETS } from "@/lib/signature-backgrounds";
import { CREDIT_COST } from "@/lib/constants";

/** Flag photos that aren't clean black-ink-on-white-paper for best extraction. */
function captureQualityWarning(stats: ImageStats): string {
  const contrast = stats.paperLuminance - stats.inkLuminance;
  if (stats.paperLuminance < 165) {
    return "Background looks dim — photograph black ink on white paper in bright, even light.";
  }
  if (stats.darkPixelRatio > 0.55) {
    return "Too much of the frame is dark — crop closer to the signature on white paper.";
  }
  if (contrast < 45) {
    return "Low contrast — use a darker pen and brighter light so the strokes stand out.";
  }
  return "";
}

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

const AI_WAIT_MESSAGES = [
  "Sending your request to the AI artist…",
  "Drawing the strokes…",
  "Inking the details…",
  "Almost there — polishing the curves…",
];

/** Style picker entry from /api/ai-styles (built-ins + admin uploads). */
interface CatalogStyle {
  id: string;
  name: string;
  blurb: string;
  thumb: string;
}

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
  const [captureWarning, setCaptureWarning] = useState("");
  const [saving, setSaving] = useState(false);
  const [aiName, setAiName] = useState("");
  const [aiCustom, setAiCustom] = useState("");
  const [styleId, setStyleId] = useState<string>(DEFAULT_AI_PHOTO_STYLE_ID);
  const [catalogStyles, setCatalogStyles] = useState<CatalogStyle[]>(() =>
    AI_PHOTO_STYLES.map((s) => ({
      id: s.id,
      name: s.name,
      blurb: s.blurb,
      thumb: s.thumb,
    })),
  );
  const [showStylePreview, setShowStylePreview] = useState(false);
  const [aiBusy, setAiBusy] = useState<"style" | "redesign" | null>(null);
  const [aiMsg, setAiMsg] = useState("");
  const [aiWaitStep, setAiWaitStep] = useState(0);
  const [showcaseBgId, setShowcaseBgId] = useState<string | null>(null);
  const [bgOpacity, setBgOpacity] = useState(100);

  const { authenticated, refresh } = useCredits();

  const selectedStyle = catalogStyles.find((s) => s.id === styleId);

  // Refresh the catalog so admin-uploaded styles appear without a redeploy;
  // the built-in list above renders instantly and stays if the fetch fails.
  useEffect(() => {
    fetch("/api/ai-styles")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.styles) && d.styles.length) setCatalogStyles(d.styles);
      })
      .catch(() => {});
  }, []);
  const showcaseBg = SHOWCASE_PRESETS.find((p) => p.id === showcaseBgId) ?? null;

  const outputRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Step the waiting copy forward while an AI generation is in flight.
  useEffect(() => {
    if (!aiBusy) return;
    setAiWaitStep(0);
    const t = setInterval(() => setAiWaitStep((s) => s + 1), 4000);
    return () => clearInterval(t);
  }, [aiBusy]);

  // `source` gates the capture-quality hints: they coach the user on
  // photographing ink on paper, so they are meaningless — and wrong — for a
  // synthetic AI image, which has no pen, paper, or lighting to fix.
  const loadFromDataUrl = useCallback((dataUrl: string, source: "photo" | "ai" = "photo") => {
    const img = new Image();
    img.onload = () => {
      setSourceImg(img);
      // Stats are computed on a downscaled copy — a 12MP camera photo would
      // otherwise build and sort a 12M-element luminance array on the UI thread.
      const probeMax = 1000;
      const probeScale = Math.min(
        1,
        probeMax / Math.max(img.naturalWidth, img.naturalHeight),
      );
      const probe = document.createElement("canvas");
      probe.width = Math.max(1, Math.round(img.naturalWidth * probeScale));
      probe.height = Math.max(1, Math.round(img.naturalHeight * probeScale));
      const pctx = probe.getContext("2d");
      if (pctx) {
        pctx.drawImage(img, 0, 0, probe.width, probe.height);
        const { data } = pctx.getImageData(0, 0, probe.width, probe.height);
        const stats = computeImageStats(data, probe.width, probe.height);
        setImageStats(stats);
        const suggested = analyzeRefineStats(stats);
        setThreshold(suggested.threshold);
        setSmoothing(suggested.smoothing);
        setRefineStrength(suggested.refineStrength);
        setInkColor(suggested.inkColor);
        setStatusMsg(suggested.aiNote);
        setCaptureWarning(
          source === "photo" ? captureQualityWarning(stats) : "",
        );
      }
    };
    img.src = dataUrl;
  }, []);

  const loadFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => loadFromDataUrl(reader.result as string);
      reader.readAsDataURL(file);
    },
    [loadFromDataUrl],
  );

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
      // A showcase background needs the ink on a transparent canvas above it.
      transparentBg: showcaseBg !== null || transparentBg,
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
    showcaseBg,
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

  /** Render the extracted signature onto a transparent canvas. */
  function buildTransparentCanvas(): HTMLCanvasElement | null {
    if (!sourceImg) return null;

    const maxDim = 1000;
    const swapped = rotation % 180 !== 0;
    const srcW = sourceImg.naturalWidth;
    const srcH = sourceImg.naturalHeight;
    const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
    const w = Math.round(srcW * scale);
    const h = Math.round(srcH * scale);

    const canvas = document.createElement("canvas");
    canvas.width = swapped ? h : w;
    canvas.height = swapped ? w : h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(sourceImg, -w / 2, -h / 2, w, h);
    ctx.restore();

    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const processed = processInkPixels(data, canvas.width, canvas.height, {
      threshold,
      smoothing,
      inkColor,
      transparentBg: true,
      refineStrength,
    });
    const out = ctx.createImageData(canvas.width, canvas.height);
    out.data.set(processed);
    ctx.putImageData(out, 0, 0);

    return canvas;
  }

  /** Transparent PNG data of the extracted signature for cloud saving. */
  function buildTransparentPng(): {
    dataUrl: string;
    width: number;
    height: number;
  } | null {
    const canvas = buildTransparentCanvas();
    if (!canvas) return null;
    return {
      dataUrl: canvas.toDataURL("image/png"),
      width: canvas.width,
      height: canvas.height,
    };
  }

  /** Compose the signature over the chosen showcase background and download. */
  async function exportShowcase() {
    if (!sourceImg || !showcaseBg) return;
    const sig = buildTransparentCanvas();
    if (!sig) return;

    const bg = new Image();
    try {
      await new Promise<void>((resolve, reject) => {
        bg.onload = () => resolve();
        bg.onerror = () => reject(new Error("background failed to load"));
        bg.src = showcaseBg.dataUrl;
      });
    } catch {
      setStatusMsg("Could not load the background — try another one.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 600;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Match the preview: background at the chosen opacity over a paper-white base.
    ctx.fillStyle = "#fdfbf7";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = bgOpacity / 100;
    ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
    const scale = Math.min(
      (canvas.width * 0.8) / sig.width,
      (canvas.height * 0.7) / sig.height,
    );
    const w = sig.width * scale;
    const h = sig.height * scale;
    ctx.drawImage(sig, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);

    downloadCanvasPng(canvas, "signature-showcase.png", { watermark: false });
    setStatusMsg("Showcase PNG saved — ready to share your signature.");
  }

  /** Downscaled JPEG of the current source photo for the redesign API. */
  function sourceToDataUrl(maxDim = 1024): string | null {
    if (!sourceImg) return null;
    const scale = Math.min(
      1,
      maxDim / Math.max(sourceImg.naturalWidth, sourceImg.naturalHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(sourceImg.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(sourceImg.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    // Flatten transparency onto white — JPEG has no alpha channel.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(sourceImg, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.9);
  }

  function aiErrorText(result: { error?: string; code?: string }): string {
    if (result.code === "INSUFFICIENT_CREDITS") {
      return "Not enough credits — AI Autograph costs 1 credit per generation.";
    }
    if (result.code === "UNAUTHORIZED") {
      return "Sign in to use the AI Autograph.";
    }
    return result.error ?? "Generation failed. Please try again.";
  }

  /** Way 1 — AI-redesign the uploaded signature photo. */
  async function redesignWithAi() {
    if (!sourceImg || aiBusy) return;
    if (!authenticated) {
      setAiMsg("Sign in to use the AI Autograph.");
      return;
    }
    const image = sourceToDataUrl();
    if (!image) {
      setAiMsg("Could not read the current photo — try re-uploading.");
      return;
    }

    setAiBusy("redesign");
    setAiMsg("AI is redesigning your signature…");
    const result = await redesignAiPhotoSignature(image);
    setAiBusy(null);

    if (result.ok && result.image) {
      void refresh();
      loadFromDataUrl(result.image, "ai");
      setAiMsg("Redesign ready (1 credit) — tune the extraction below.");
      return;
    }
    setAiMsg(aiErrorText(result));
  }

  /** Way 1 — generate an autograph of the typed name in the chosen style. */
  async function generateFromStyle() {
    const name = aiName.trim();
    if (name.length < 2 || aiBusy) return;
    if (!authenticated) {
      setAiMsg("Sign in to use the AI Autograph.");
      return;
    }

    setAiBusy("style");
    setAiMsg("Generating your AI autograph…");
    const result = await generateAiPhotoSignature(
      name,
      styleId,
      aiCustom.trim() || undefined,
    );
    setAiBusy(null);

    if (result.ok && result.image) {
      void refresh();
      loadFromDataUrl(result.image, "ai");
      setAiMsg("AI autograph ready (1 credit) — tune the extraction below.");
      return;
    }
    setAiMsg(aiErrorText(result));
  }

  async function saveToCloud() {
    if (!sourceImg || saving) return;
    if (!authenticated) {
      setStatusMsg("Sign in to save this signature to your cloud library.");
      return;
    }

    const png = buildTransparentPng();
    if (!png) {
      setStatusMsg("Could not process the image — try re-uploading.");
      return;
    }

    const suggested =
      window.prompt("Name this signature", "Handwritten signature") ?? "";
    const name = suggested.trim();
    if (!name) return;

    setSaving(true);
    setStatusMsg("Saving to your cloud library…");
    const result = await saveCapturedSignature({
      name,
      capturedImage: png.dataUrl,
      canvasWidth: png.width,
      canvasHeight: png.height,
    });
    setSaving(false);

    if (result.ok) {
      void refresh();
      setStatusMsg(
        `Saved “${name}” to your cloud library (1 credit). View it in Library.`,
      );
      return;
    }

    if (result.code === "INSUFFICIENT_CREDITS") {
      setStatusMsg("Not enough credits — saving a signature costs 1 credit.");
    } else if (result.code === "UNAUTHORIZED") {
      setStatusMsg("Sign in to save this signature to your cloud library.");
    } else {
      setStatusMsg(result.error ?? "Save failed. Please try again.");
    }
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
            ) : showStylePreview && selectedStyle ? (
              <>
                {/* Selected AI Autograph style previewed until the user uploads. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedStyle.thumb}
                  alt={`${selectedStyle.name} signature style preview`}
                  className="absolute inset-0 w-full h-full object-contain bg-white"
                />
                <span className="absolute top-sm left-sm font-label-sm text-label-sm uppercase tracking-widest text-on-surface/70 bg-surface/70 backdrop-blur-sm px-sm py-xs rounded">
                  Style preview · {selectedStyle.name}
                </span>
                <span className="absolute bottom-sm left-sm font-label-sm text-label-sm text-on-surface/70 bg-surface/70 backdrop-blur-sm px-sm py-xs rounded">
                  {selectedStyle.blurb} — type a name below and Generate
                </span>
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
            {aiBusy && (
              <div
                onClick={(e) => e.stopPropagation()}
                role="status"
                aria-live="polite"
                className="absolute inset-0 z-10 bg-surface/85 backdrop-blur-sm flex flex-col items-center justify-center gap-md cursor-default px-lg text-center"
              >
                <span className="material-symbols-outlined filled text-tertiary text-[52px] ai-wait-pen">
                  stylus_note
                </span>
                <p className="font-label-md text-label-md text-on-surface">
                  {
                    AI_WAIT_MESSAGES[
                      Math.min(aiWaitStep, AI_WAIT_MESSAGES.length - 1)
                    ]
                  }
                </p>
                <div className="w-2/3 h-1.5 bg-outline-variant/30 rounded-full overflow-hidden">
                  <div className="ai-wait-bar h-full w-2/5 bg-tertiary rounded-full" />
                </div>
                <p className="font-label-sm text-label-sm text-on-surface-variant">
                  AI generation usually takes 10–30 seconds
                </p>
              </div>
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
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) loadFile(file);
              }}
            />
          </div>

          {/* Capture / upload actions + white-paper guidance */}
          <div className="flex flex-col gap-sm">
            <div className="flex gap-sm">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  cameraInputRef.current?.click();
                }}
                className="flex-1 py-sm px-md bg-tertiary text-on-tertiary rounded font-label-md text-label-md hover:bg-tertiary/90 transition-colors flex justify-center items-center gap-xs"
              >
                <span className="material-symbols-outlined text-[18px]">
                  photo_camera
                </span>
                Take Photo
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-sm px-md border border-outline-variant rounded font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-high transition-colors flex justify-center items-center gap-xs"
              >
                <span className="material-symbols-outlined text-[18px]">
                  upload
                </span>
                Upload
              </button>
            </div>
            <p className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-xs">
              <span className="material-symbols-outlined text-[16px] text-tertiary">
                lightbulb
              </span>
              For best results, use black ink on plain white paper.
            </p>
            {captureWarning && (
              <p className="font-label-sm text-label-sm text-error flex items-center gap-xs">
                <span className="material-symbols-outlined text-[16px]">
                  warning
                </span>
                {captureWarning}
              </p>
            )}
          </div>

          {/* AI Autograph — two ways: redesign the photo, or generate from a style */}
          <div className="p-md bg-surface-container-low rounded border border-surface-variant flex flex-col gap-md">
            <div className="flex items-center justify-between">
              <h3 className="font-label-md text-label-md text-on-surface flex items-center gap-xs">
                <span className="material-symbols-outlined text-[18px] text-tertiary">
                  auto_awesome
                </span>
                AI Autograph
              </h3>
              <span className="font-label-sm text-label-sm text-outline-variant uppercase tracking-widest">
                1 credit / generation
              </span>
            </div>

            {/* Way 1 — generate from a style template */}
            <div className="flex flex-col gap-sm border-b border-surface-variant pb-md">
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                <span className="text-tertiary font-medium">Way 1 · Generate.</span>{" "}
                Pick a signature template, type a name, and AI writes it in that
                style.
              </p>
              {/* Template showcase — uncropped previews so every style reads clearly */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-sm max-h-[420px] overflow-y-auto pr-xs">
                {catalogStyles.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setStyleId(s.id);
                      setShowStylePreview(true);
                    }}
                    title={`${s.name} — ${s.blurb}`}
                    className={`relative aspect-[2/1] rounded overflow-hidden border-2 bg-white transition-all ${
                      styleId === s.id
                        ? "border-tertiary"
                        : "border-outline-variant/40 hover:border-tertiary/50"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={s.thumb}
                      alt={s.name}
                      className="absolute inset-0 w-full h-full object-contain p-xs"
                    />
                    <span
                      className={`absolute bottom-0 inset-x-0 px-xs py-[2px] font-label-sm text-label-sm truncate text-center ${
                        styleId === s.id
                          ? "bg-tertiary text-on-tertiary"
                          : "bg-surface/85 text-on-surface-variant"
                      }`}
                    >
                      {s.name}
                    </span>
                  </button>
                ))}
              </div>
              <p className="font-label-sm text-label-sm text-outline-variant">
                Style: {selectedStyle?.name} — tap a template to preview it
                large above
              </p>
              <div className="flex gap-sm">
                <input
                  value={aiName}
                  onChange={(e) => setAiName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void generateFromStyle();
                  }}
                  maxLength={40}
                  placeholder="e.g. Davin"
                  className="flex-1 min-w-0 py-sm px-md bg-surface rounded border border-outline-variant/50 font-body-md text-body-md text-on-surface placeholder:text-outline-variant focus:outline-none focus:border-tertiary"
                />
                <button
                  type="button"
                  onClick={() => void generateFromStyle()}
                  disabled={aiBusy !== null || aiName.trim().length < 2}
                  className="py-sm px-md bg-tertiary text-on-tertiary rounded font-label-md text-label-md hover:bg-tertiary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-xs"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {aiBusy === "style" ? "hourglass_top" : "draw"}
                  </span>
                  {aiBusy === "style" ? "Generating…" : "Generate"}
                </button>
              </div>
            </div>

            {/* Way 2 — redesign the uploaded photo */}
            <div className="flex flex-col gap-sm">
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                <span className="text-tertiary font-medium">Way 2 · Redesign.</span>{" "}
                Upload or photograph your signature above, then let AI redraw it
                as a refined, elegant version of itself.
              </p>
              <button
                type="button"
                onClick={() => void redesignWithAi()}
                disabled={!sourceImg || aiBusy !== null}
                className="self-start py-sm px-md bg-tertiary text-on-tertiary rounded font-label-md text-label-md hover:bg-tertiary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-xs"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {aiBusy === "redesign" ? "hourglass_top" : "magic_button"}
                </span>
                {aiBusy === "redesign" ? "Redesigning…" : "AI Redesign This Photo"}
              </button>
            </div>

            {aiMsg && (
              <p
                className="font-label-sm text-label-sm text-on-surface-variant bg-surface rounded px-sm py-xs"
                role="status"
              >
                {aiMsg}
              </p>
            )}
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
              showcaseBg || !transparentBg ? "bg-[#fdfbf7]" : "checker"
            }`}
          >
            {showcaseBg && (
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  backgroundImage: `url("${showcaseBg.dataUrl}")`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  opacity: bgOpacity / 100,
                }}
              />
            )}
            <canvas
              ref={outputRef}
              className={`relative max-w-full max-h-full object-contain ${
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

          {/* Free-text AI instructions applied to the next Way 1 generation */}
          <div className="flex gap-sm">
            <input
              value={aiCustom}
              onChange={(e) => setAiCustom(e.target.value)}
              maxLength={200}
              placeholder="Optional AI instructions — e.g. thicker strokes, bigger flourish, more slant"
              className="flex-1 min-w-0 py-sm px-md bg-surface rounded border border-outline-variant/50 font-body-md text-body-md text-on-surface placeholder:text-outline-variant focus:outline-none focus:border-tertiary"
            />
            <button
              type="button"
              onClick={() => void generateFromStyle()}
              disabled={aiBusy !== null || aiName.trim().length < 2}
              className="py-sm px-md bg-tertiary text-on-tertiary rounded font-label-md text-label-md hover:bg-tertiary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-xs shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">
                {aiBusy === "style" ? "hourglass_top" : "autorenew"}
              </span>
              {aiBusy === "style" ? "Generating…" : "Regenerate"}
            </button>
          </div>

          {/* Showcase backgrounds — present the signature on a styled ground */}
          <div className="flex items-center gap-sm flex-wrap">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">
              Background
            </span>
            <button
              type="button"
              onClick={() => setShowcaseBgId(null)}
              className={`h-9 px-sm rounded border-2 font-label-sm text-label-sm text-on-surface-variant transition-all ${
                showcaseBg === null
                  ? "border-tertiary"
                  : "border-outline-variant/40 hover:border-tertiary/50"
              }`}
            >
              None
            </button>
            {SHOWCASE_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setShowcaseBgId(p.id)}
                title={p.name}
                className={`relative w-16 h-9 rounded overflow-hidden border-2 transition-all ${
                  showcaseBgId === p.id
                    ? "border-tertiary scale-[1.05]"
                    : "border-outline-variant/40 hover:border-tertiary/50"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.dataUrl}
                  alt={p.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </button>
            ))}
            {showcaseBg && (
              <div className="flex items-center gap-sm flex-1 min-w-[180px]">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">
                  Opacity
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={bgOpacity}
                  onChange={(e) => setBgOpacity(Number(e.target.value))}
                  className="flex-1 min-w-0"
                />
                <span className="font-body-md text-body-md text-on-surface w-10 text-right">
                  {bgOpacity}%
                </span>
              </div>
            )}
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
            {showcaseBg && (
              <button
                type="button"
                disabled={!sourceImg}
                onClick={() => void exportShowcase()}
                className="py-md px-sm bg-secondary text-on-secondary rounded font-label-md text-label-md hover:bg-secondary/90 transition-colors flex justify-center items-center gap-sm artisan-shadow disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[20px]">
                  wallpaper
                </span>
                Save Showcase PNG · {showcaseBg.name}
              </button>
            )}
            <button
              type="button"
              disabled={!sourceImg || saving}
              onClick={() => void saveToCloud()}
              className="py-md px-sm bg-primary text-on-primary rounded font-label-md text-label-md hover:bg-primary/90 transition-colors flex justify-center items-center gap-sm artisan-shadow disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[20px]">
                cloud_upload
              </span>
              {saving ? "Saving…" : "Save to Cloud Library"}
            </button>
            <p className="font-label-sm text-label-sm text-center text-on-surface-variant">
              {authenticated
                ? `Stores the extracted signature in your library · ${CREDIT_COST.SAVE_SIGNATURE} credit`
                : "Sign in to save · 1 credit"}
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
                {!authenticated && (
                  <>
                    <Link href="/login" className="text-tertiary underline">
                      Sign in
                    </Link>
                    {" · "}
                  </>
                )}
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
        .ai-wait-pen {
          animation: aiWaitWrite 1.6s ease-in-out infinite;
        }
        @keyframes aiWaitWrite {
          0%,
          100% {
            transform: translate(-8px, 0) rotate(-6deg);
          }
          50% {
            transform: translate(8px, -4px) rotate(8deg);
          }
        }
        .ai-wait-bar {
          animation: aiWaitSlide 1.3s ease-in-out infinite;
        }
        @keyframes aiWaitSlide {
          0% {
            transform: translateX(-110%);
          }
          100% {
            transform: translateX(280%);
          }
        }
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
