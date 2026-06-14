"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useCredits } from "@/hooks/useCredits";
import { trackEvent } from "@/lib/analytics";
import { CREDIT_COST, SES_DISCLAIMER } from "@/lib/constants";
import { clearSignDraft, getSignDraft } from "@/lib/sign-draft";
import {
  base64ToBlob,
  triggerDownloadBlob,
} from "@/lib/sign-client";

const PdfSignaturePlacer = dynamic(
  () => import("@/components/PdfSignaturePlacer"),
  {
    ssr: false,
    loading: () => (
      <p className="font-body-md text-body-md text-on-surface-variant py-xxl text-center">
        Loading document…
      </p>
    ),
  },
);

export default function SignPlacePage() {
  const { status } = useSession();
  const router = useRouter();
  const { credits, authenticated, refresh } = useCredits();

  const [draft, setDraft] = useState(() => getSignDraft());
  const [pageIndex, setPageIndex] = useState(0);
  const [pageInput, setPageInput] = useState("1");

  const [posX, setPosX] = useState(72);
  const [posY, setPosY] = useState(120);
  const [sigWidth, setSigWidth] = useState(160);
  const [sigHeight, setSigHeight] = useState(60);
  const [signaturePlaced, setSignaturePlaced] = useState(false);
  const [sesAccepted, setSesAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!getSignDraft()) {
      router.replace("/sign");
      return;
    }
    setDraft(getSignDraft());
  }, [router]);

  useEffect(() => {
    setSignaturePlaced(false);
    setPageInput(String(pageIndex + 1));
  }, [pageIndex]);

  if (status === "loading" || !draft) {
    return (
      <main className="flex-grow grid place-items-center py-xxl text-on-surface-variant">
        Loading…
      </main>
    );
  }

  function applyPageNumber(raw: string) {
    if (!draft) return;
    setPageInput(raw);
    const n = Number.parseInt(raw, 10);
    if (Number.isNaN(n)) return;
    const clamped = Math.min(draft.pageCount, Math.max(1, n));
    setPageIndex(clamped - 1);
    setPageInput(String(clamped));
  }

  function goToPage(delta: number) {
    if (!draft) return;
    const next = Math.min(draft.pageCount, Math.max(1, pageIndex + 1 + delta));
    setPageIndex(next - 1);
  }

  async function signDocument() {
    if (!draft) return;
    if (status !== "authenticated") {
      setMsg("Sign in to sign documents.");
      return;
    }
    if (!signaturePlaced) {
      setMsg("Click on the document to place your signature.");
      return;
    }
    if (!sesAccepted) {
      setMsg("Accept the SES disclaimer to continue.");
      return;
    }
    if (credits < CREDIT_COST.SIGN_PDF) {
      setMsg(`Need ${CREDIT_COST.SIGN_PDF} credit. Buy credits on Pricing.`);
      return;
    }

    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/sign/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pdfBase64: draft.pdfBase64,
          signaturePngBase64: draft.signaturePngBase64,
          pageIndex,
          x: posX,
          y: posY,
          width: sigWidth,
          height: sigHeight,
          fileName: draft.fileName,
          sesAccepted: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error ?? "Signing failed.");
        return;
      }

      const blob = base64ToBlob(data.pdfBase64, "application/pdf");
      triggerDownloadBlob(blob, data.fileName ?? "signed.pdf");
      trackEvent("sign_pdf", { fileName: draft.fileName });
      refresh();
      clearSignDraft();
      setMsg(`Signed — ${CREDIT_COST.SIGN_PDF} credit used. Download started.`);
    } catch {
      setMsg("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex-grow w-full min-h-[calc(100vh-8rem)] flex flex-col">
      <header className="sticky top-[57px] z-30 bg-background/95 backdrop-blur border-b border-outline-variant/30">
        <div className="mx-auto flex max-w-[960px] flex-wrap items-center justify-between gap-sm px-md py-md sm:gap-md sm:px-lg">
          <div className="flex items-center gap-md flex-wrap">
            <Link
              href="/sign"
              className="font-label-md text-label-md text-on-surface-variant hover:text-tertiary"
            >
              ← Back
            </Link>
            <h1 className="font-headline-sm text-headline-sm text-on-surface">
              Place signature
            </h1>
          </div>

          <div className="flex items-center gap-sm flex-wrap">
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              Page
            </span>
            <button
              type="button"
              aria-label="Previous page"
              disabled={pageIndex <= 0}
              onClick={() => goToPage(-1)}
              className="w-8 h-8 rounded border border-outline-variant/50 disabled:opacity-40 hover:border-tertiary"
            >
              −
            </button>
            <input
              type="number"
              min={1}
              max={draft.pageCount}
              value={pageInput}
              onChange={(e) => applyPageNumber(e.target.value)}
              onBlur={() => applyPageNumber(pageInput)}
              className="w-16 text-center p-xs rounded border border-outline-variant/50 bg-surface-container-lowest font-label-md tabular-nums"
            />
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              / {draft.pageCount}
            </span>
            <button
              type="button"
              aria-label="Next page"
              disabled={pageIndex >= draft.pageCount - 1}
              onClick={() => goToPage(1)}
              className="w-8 h-8 rounded border border-outline-variant/50 disabled:opacity-40 hover:border-tertiary"
            >
              +
            </button>
          </div>
        </div>
      </header>

      <div className="flex-grow px-md py-md sm:px-lg sm:py-lg">
        <div className="max-w-[960px] mx-auto">
          <PdfSignaturePlacer
            variant="full"
            pdfBase64={draft.pdfBase64}
            pageIndex={pageIndex}
            signaturePreviewUrl={draft.signaturePreviewUrl}
            posX={posX}
            posY={posY}
            sigWidth={sigWidth}
            sigHeight={sigHeight}
            placed={signaturePlaced}
            onPlacementChange={({ x, y, placed }) => {
              setPosX(x);
              setPosY(y);
              setSignaturePlaced(placed);
            }}
            onSizeChange={({ width, height }) => {
              setSigWidth(width);
              setSigHeight(height);
            }}
            onPageSize={() => {
              /* page metrics handled internally */
            }}
          />
        </div>
      </div>

      <footer className="border-t border-outline-variant/30 bg-surface-container-low">
        <div className="mx-auto max-w-[960px] space-y-md px-md py-md sm:px-lg sm:py-lg">
          <div className="p-md rounded-lg border border-outline-variant/30 bg-surface-container">
            <p className="font-body-md text-body-md text-on-surface-variant mb-sm">
              {SES_DISCLAIMER}
            </p>
            <label className="flex items-start gap-sm font-body-md text-body-md cursor-pointer">
              <input
                type="checkbox"
                checked={sesAccepted}
                onChange={(e) => setSesAccepted(e.target.checked)}
                className="mt-1"
              />
              <span>I understand this is a Simple Electronic Signature (SES).</span>
            </label>
          </div>

          <button
            type="button"
            disabled={busy || !authenticated}
            onClick={() => void signDocument()}
            className="w-full py-md bg-tertiary text-on-tertiary rounded font-label-md hover:bg-tertiary/90 disabled:opacity-50 transition-colors"
          >
            {busy
              ? "Signing…"
              : `Sign & download (${CREDIT_COST.SIGN_PDF} cr)`}
          </button>

          {authenticated && (
            <p className="font-label-sm text-label-sm text-on-surface-variant text-center">
              Balance: {credits} credits
            </p>
          )}

          {msg && (
            <p
              className={`font-body-md text-body-md text-center ${
                msg.startsWith("Signed") ? "text-tertiary" : "text-error"
              }`}
            >
              {msg}
            </p>
          )}
        </div>
      </footer>
    </main>
  );
}
