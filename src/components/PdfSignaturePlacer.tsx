"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  pdfRectToScreen,
  placementFromClick,
  resizeSignatureFromBottomLeft,
  resizeSignatureFromHandle,
  type ResizeHandle,
  screenToPdfPoint,
} from "@/lib/pdf-coords";

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

export interface PdfSignaturePlacerProps {
  pdfBase64: string;
  pageIndex: number;
  signaturePreviewUrl: string | null;
  posX: number;
  posY: number;
  sigWidth: number;
  sigHeight: number;
  placed: boolean;
  variant?: "compact" | "full";
  onPlacementChange: (next: {
    x: number;
    y: number;
    placed: boolean;
  }) => void;
  onSizeChange: (next: { width: number; height: number }) => void;
  onPageSize: (size: { width: number; height: number }) => void;
}

export default function PdfSignaturePlacer({
  pdfBase64,
  pageIndex,
  signaturePreviewUrl,
  posX,
  posY,
  sigWidth,
  sigHeight,
  placed,
  variant = "compact",
  onPlacementChange,
  onSizeChange,
  onPageSize,
}: PdfSignaturePlacerProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfRef = useRef<PdfDoc | null>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);

  const [pageWidth, setPageWidth] = useState(612);
  const [pageHeight, setPageHeight] = useState(792);
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [rendering, setRendering] = useState(false);

  const dragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const resizeRef = useRef<{
    handle: ResizeHandle;
    startX: number;
    startY: number;
    originW: number;
    originH: number;
    originX: number;
    originY: number;
  } | null>(null);

  const RESIZE_HANDLES: Array<{
    handle: ResizeHandle;
    className: string;
    cursor: string;
    label: string;
  }> = [
    {
      handle: "nw",
      className: "top-0 left-0 -translate-x-1/2 -translate-y-1/2",
      cursor: "cursor-nw-resize",
      label: "Resize top left",
    },
    {
      handle: "n",
      className: "top-0 left-1/2 -translate-x-1/2 -translate-y-1/2",
      cursor: "cursor-n-resize",
      label: "Resize top",
    },
    {
      handle: "ne",
      className: "top-0 right-0 translate-x-1/2 -translate-y-1/2",
      cursor: "cursor-ne-resize",
      label: "Resize top right",
    },
    {
      handle: "w",
      className: "top-1/2 left-0 -translate-x-1/2 -translate-y-1/2",
      cursor: "cursor-w-resize",
      label: "Resize left",
    },
    {
      handle: "e",
      className: "top-1/2 right-0 translate-x-1/2 -translate-y-1/2",
      cursor: "cursor-e-resize",
      label: "Resize right",
    },
    {
      handle: "sw",
      className: "bottom-0 left-0 -translate-x-1/2 translate-y-1/2",
      cursor: "cursor-sw-resize",
      label: "Resize bottom left",
    },
    {
      handle: "s",
      className: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2",
      cursor: "cursor-s-resize",
      label: "Resize bottom",
    },
    {
      handle: "se",
      className: "bottom-0 right-0 translate-x-1/2 translate-y-1/2",
      cursor: "cursor-se-resize",
      label: "Resize bottom right",
    },
  ];

  const renderPage = useCallback(async () => {
    const pdf = pdfRef.current;
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!pdf || !canvas || !wrap) return;

    setRendering(true);
    renderTaskRef.current?.cancel();

    try {
      const page = await pdf.getPage(pageIndex + 1);
      const baseViewport = page.getViewport({ scale: 1 });
      const pw = baseViewport.width;
      const ph = baseViewport.height;
      setPageWidth(pw);
      setPageHeight(ph);
      onPageSize({ width: pw, height: ph });

      const maxWidth =
        variant === "full"
          ? Math.min(wrap.clientWidth || 900, 920)
          : wrap.clientWidth || 640;
      const scale = maxWidth / pw;
      const viewport = page.getViewport({ scale });
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      setDisplaySize({ width: viewport.width, height: viewport.height });

      const task = page.render({ canvasContext: ctx, viewport, canvas });
      renderTaskRef.current = task;
      await task.promise;
    } catch (e) {
      const err = e as { name?: string };
      if (err.name !== "RenderingCancelledException") {
        console.error(e);
      }
    } finally {
      setRendering(false);
    }
  }, [pageIndex, onPageSize, variant]);

  useEffect(() => {
    let cancelled = false;
    pdfRef.current = null;

    void (async () => {
      const pdfjs = await loadPdfJs();
      if (cancelled) return;
      const bytes = Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0));
      const pdf = await pdfjs.getDocument({ data: bytes }).promise;
      if (cancelled) return;
      pdfRef.current = pdf;
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

  const placeAtPointer = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas || !signaturePreviewUrl) return;
      const rect = canvas.getBoundingClientRect();
      const click = screenToPdfPoint(
        clientX,
        clientY,
        rect,
        pageWidth,
        pageHeight,
      );
      const next = placementFromClick(
        click.x,
        click.y,
        sigWidth,
        sigHeight,
        pageWidth,
        pageHeight,
      );
      onPlacementChange({ ...next, placed: true });
    },
    [
      signaturePreviewUrl,
      pageWidth,
      pageHeight,
      sigWidth,
      sigHeight,
      onPlacementChange,
    ],
  );

  const onCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!signaturePreviewUrl) return;
    if (dragRef.current || resizeRef.current) return;
    placeAtPointer(e.clientX, e.clientY);
  };

  const onMovePointer = (e: React.PointerEvent<HTMLElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    const drag = dragRef.current;
    if (drag) {
      const dx = ((e.clientX - drag.startX) / rect.width) * pageWidth;
      const dy = -((e.clientY - drag.startY) / rect.height) * pageHeight;
      const next = placementFromClick(
        drag.originX + dx + sigWidth / 2,
        drag.originY + dy + sigHeight / 2,
        sigWidth,
        sigHeight,
        pageWidth,
        pageHeight,
      );
      onPlacementChange({ ...next, placed: true });
      return;
    }

    const resize = resizeRef.current;
    if (resize) {
      const dw = ((e.clientX - resize.startX) / rect.width) * pageWidth;
      const dh = -((e.clientY - resize.startY) / rect.height) * pageHeight;
      const next = resizeSignatureFromHandle(
        resize.handle,
        resize.originX,
        resize.originY,
        resize.originW,
        resize.originH,
        dw,
        dh,
        pageWidth,
        pageHeight,
      );
      onPlacementChange({
        x: next.x,
        y: next.y,
        placed: true,
      });
      onSizeChange({ width: next.width, height: next.height });
    }
  };

  const onOverlayPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!placed) return;
    if ((e.target as HTMLElement).dataset.handle === "resize") return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: posX,
      originY: posY,
    };
  };

  const onResizePointerDown =
    (handle: ResizeHandle) => (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!placed) return;
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      resizeRef.current = {
        handle,
        startX: e.clientX,
        startY: e.clientY,
        originW: sigWidth,
        originH: sigHeight,
        originX: posX,
        originY: posY,
      };
    };

  const onPointerUp = (e: React.PointerEvent<HTMLElement>) => {
    if (dragRef.current || resizeRef.current) {
      dragRef.current = null;
      resizeRef.current = null;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    }
  };

  const onOverlayWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!placed) return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.06 : 0.94;
    const next = resizeSignatureFromBottomLeft(
      posX,
      posY,
      sigWidth * factor,
      sigHeight * factor,
      pageWidth,
      pageHeight,
    );
    onPlacementChange({ x: next.x, y: next.y, placed: true });
    onSizeChange({ width: next.width, height: next.height });
  };

  const overlay =
    placed && signaturePreviewUrl && displaySize.width > 0
      ? pdfRectToScreen(
          posX,
          posY,
          sigWidth,
          sigHeight,
          pageWidth,
          pageHeight,
          displaySize.width,
          displaySize.height,
        )
      : null;

  const isFull = variant === "full";

  return (
    <div className={isFull ? "space-y-md" : "space-y-sm"}>
      <div
        ref={wrapRef}
        className={`relative mx-auto rounded border border-outline-variant/30 bg-surface-container-lowest overflow-hidden shadow-sm ${
          isFull ? "max-w-[920px] w-full" : "w-full"
        }`}
      >
        <canvas
          ref={canvasRef}
          onClick={onCanvasClick}
          className={`block w-full h-auto ${
            signaturePreviewUrl ? "cursor-crosshair" : "cursor-not-allowed"
          }`}
          role="img"
          aria-label="PDF page preview"
        />

        {overlay && (
          <div
            role="presentation"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={onOverlayPointerDown}
            onPointerMove={onMovePointer}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onWheel={onOverlayWheel}
            className="absolute border-2 border-tertiary bg-tertiary/10 cursor-grab active:cursor-grabbing touch-none"
            style={{
              left: overlay.left,
              top: overlay.top,
              width: overlay.width,
              height: overlay.height,
            }}
          >
            <img
              src={signaturePreviewUrl ?? ""}
              alt=""
              draggable={false}
              className="w-full h-full object-contain pointer-events-none select-none"
            />
            {RESIZE_HANDLES.map(({ handle, className, cursor, label }) => (
              <button
                key={handle}
                type="button"
                data-handle="resize"
                aria-label={label}
                onPointerDown={onResizePointerDown(handle)}
                onPointerMove={onMovePointer}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                className={`absolute w-4 h-4 rounded-full bg-tertiary border-2 border-surface shadow touch-none ${className} ${cursor}`}
              />
            ))}
          </div>
        )}

        {signaturePreviewUrl && !placed && !rendering && (
          <div className="absolute bottom-0 inset-x-0 px-md py-sm bg-on-surface/75 text-surface text-center pointer-events-none">
            <p className="font-label-sm text-label-sm">
              Click to place · drag to move · drag edges or corners to resize · scroll to scale
            </p>
          </div>
        )}
      </div>

      {placed && (
        <p className="font-label-sm text-label-sm text-tertiary text-center">
          Drag to move · pull any edge or corner to resize · scroll on the signature to
          scale · click elsewhere to reposition
        </p>
      )}
    </div>
  );
}
