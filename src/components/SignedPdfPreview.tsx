"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type PdfDoc = Awaited<
  ReturnType<Awaited<typeof import("pdfjs-dist")>["getDocument"]>["promise"]
>;

async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist");
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  }
  return pdfjs;
}

export interface SignedPdfPreviewProps {
  pdfBase64: string;
  /** Page to open on — the one that was just signed. */
  initialPage?: number;
  maxWidth?: number;
}

/** Read-only render of a finished PDF, with page navigation. */
export default function SignedPdfPreview({
  pdfBase64,
  initialPage = 0,
  maxWidth = 760,
}: SignedPdfPreviewProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfRef = useRef<PdfDoc | null>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);

  const [pageIndex, setPageIndex] = useState(initialPage);
  const [pageCount, setPageCount] = useState(1);
  const [ready, setReady] = useState(false);

  const renderPage = useCallback(async () => {
    const pdf = pdfRef.current;
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!pdf || !canvas || !wrap) return;

    renderTaskRef.current?.cancel();
    try {
      const page = await pdf.getPage(pageIndex + 1);
      const base = page.getViewport({ scale: 1 });
      const width = Math.min(wrap.clientWidth || maxWidth, maxWidth);
      const viewport = page.getViewport({ scale: width / base.width });
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const task = page.render({ canvasContext: ctx, viewport, canvas });
      renderTaskRef.current = task;
      await task.promise;
      setReady(true);
    } catch (e) {
      const err = e as { name?: string };
      if (err.name !== "RenderingCancelledException") console.error(e);
    }
  }, [pageIndex, maxWidth]);

  useEffect(() => {
    let cancelled = false;
    pdfRef.current = null;
    setReady(false);

    void (async () => {
      const pdfjs = await loadPdfJs();
      if (cancelled) return;
      const bytes = Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0));
      const pdf = await pdfjs.getDocument({ data: bytes }).promise;
      if (cancelled) return;
      pdfRef.current = pdf;
      setPageCount(pdf.numPages);
      setPageIndex((prev) => Math.min(prev, pdf.numPages - 1));
      await renderPage();
    })();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
      pdfRef.current = null;
    };
  }, [pdfBase64, renderPage]);

  useEffect(() => {
    void renderPage();
  }, [renderPage]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => void renderPage());
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [renderPage]);

  return (
    <div className="space-y-sm">
      <div
        ref={wrapRef}
        className="relative mx-auto w-full rounded border border-outline-variant/30 bg-surface-container-lowest overflow-hidden shadow-sm"
        style={{ maxWidth }}
      >
        <canvas
          ref={canvasRef}
          className="block w-full h-auto"
          role="img"
          aria-label="Signed document preview"
        />
        {!ready && (
          <p className="absolute inset-0 grid place-items-center font-body-md text-body-md text-on-surface-variant">
            Rendering preview…
          </p>
        )}
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-sm">
          <button
            type="button"
            aria-label="Previous page"
            disabled={pageIndex <= 0}
            onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
            className="w-8 h-8 rounded border border-outline-variant/50 disabled:opacity-40 hover:border-tertiary"
          >
            −
          </button>
          <span className="font-label-sm text-label-sm text-on-surface-variant tabular-nums">
            Page {pageIndex + 1} / {pageCount}
          </span>
          <button
            type="button"
            aria-label="Next page"
            disabled={pageIndex >= pageCount - 1}
            onClick={() => setPageIndex((p) => Math.min(pageCount - 1, p + 1))}
            className="w-8 h-8 rounded border border-outline-variant/50 disabled:opacity-40 hover:border-tertiary"
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}
