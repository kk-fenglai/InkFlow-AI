"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PDFDocument } from "pdf-lib";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useCredits } from "@/hooks/useCredits";
import { CREDIT_COST } from "@/lib/constants";
import { fetchCloudSignatures } from "@/lib/signature-api";
import type { SavedSignature } from "@/lib/signature-library";
import { setSignDraft } from "@/lib/sign-draft";
import {
  dataUrlToBase64,
  fileToBase64,
  settingsToPngDataUrl,
} from "@/lib/sign-client";

export default function SignSetupPage() {
  const { status } = useSession();
  const router = useRouter();
  const { authenticated } = useCredits();

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);

  const [signatures, setSignatures] = useState<SavedSignature[]>([]);
  const [selectedSigId, setSelectedSigId] = useState<string | null>(null);
  const [signaturePngBase64, setSignaturePngBase64] = useState<string | null>(
    null,
  );
  const [uploadSigPreview, setUploadSigPreview] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const selectedSig = useMemo(
    () => signatures.find((s) => s.id === selectedSigId) ?? null,
    [signatures, selectedSigId],
  );

  const signaturePreviewUrl = useMemo(() => {
    if (uploadSigPreview) return uploadSigPreview;
    if (signaturePngBase64) {
      return `data:image/png;base64,${signaturePngBase64}`;
    }
    return null;
  }, [uploadSigPreview, signaturePngBase64]);

  useEffect(() => {
    if (!authenticated) return;
    fetchCloudSignatures().then((r) => {
      if (r.ok) {
        setSignatures(r.signatures);
        setSelectedSigId(r.signatures[0]?.id ?? null);
      }
    });
  }, [authenticated]);

  useEffect(() => {
    if (!selectedSig) return;
    void settingsToPngDataUrl(
      selectedSig.strokeData.settings,
      selectedSig.strokeData.width,
      selectedSig.strokeData.height,
    ).then((url) => setSignaturePngBase64(dataUrlToBase64(url)));
  }, [selectedSig]);

  const onPdfPick = useCallback(async (file: File | null) => {
    setPdfFile(file);
    setPdfBase64(null);
    setPageCount(0);
    if (!file) return;

    if (file.type !== "application/pdf") {
      setMsg("Please upload a PDF file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setMsg("PDF must be under 10 MB.");
      return;
    }

    setMsg("");
    const b64 = await fileToBase64(file);
    setPdfBase64(b64);

    try {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      setPageCount(doc.getPageCount());
    } catch {
      setMsg("Could not read PDF. Try another file.");
    }
  }, []);

  async function onSignatureUpload(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMsg("Signature must be a PNG or JPG image.");
      return;
    }
    setSelectedSigId(null);
    const b64 = await fileToBase64(file);
    setSignaturePngBase64(b64);
    setUploadSigPreview(URL.createObjectURL(file));
    setMsg("");
  }

  function continueToPlace() {
    if (status !== "authenticated") {
      setMsg("Sign in to sign documents.");
      return;
    }
    if (!pdfBase64 || !signaturePngBase64 || !signaturePreviewUrl) {
      setMsg("Upload a PDF and choose a signature.");
      return;
    }
    if (pageCount < 1) {
      setMsg("Could not read PDF page count.");
      return;
    }

    setSignDraft({
      pdfBase64,
      fileName: pdfFile?.name ?? "document.pdf",
      pageCount,
      signaturePngBase64,
      signaturePreviewUrl,
    });
    router.push("/sign/place");
  }

  if (status === "loading") {
    return (
      <main className="flex-grow grid place-items-center py-xxl text-on-surface-variant">
        Loading…
      </main>
    );
  }

  return (
    <main className="page-main">
      <header className="max-w-2xl mb-xl">
        <span className="inline-block px-sm py-xs bg-tertiary/10 text-tertiary font-label-sm text-label-sm uppercase tracking-widest rounded border border-tertiary/20 mb-md">
          Document signing
        </span>
        <h1 className="font-display-lg text-display-lg-mobile sm:text-display-lg text-on-surface mb-md">
          Sign PDF with SES
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          Upload your document and signature, then open the placement workspace
          to click where you want to sign.{" "}
          <strong className="text-on-surface">
            {CREDIT_COST.SIGN_PDF} credit
          </strong>{" "}
          per signed export.
        </p>
      </header>

      {status !== "authenticated" && (
        <div className="mb-xl p-lg bg-surface-container border border-outline-variant/30 rounded-xl text-center">
          <p className="font-body-md text-body-md text-on-surface-variant mb-md">
            Sign in to use PDF signing and your cloud signature library.
          </p>
          <Link
            href="/login?callbackUrl=/sign"
            className="inline-block px-lg py-md bg-tertiary text-on-tertiary rounded font-label-md"
          >
            Sign in
          </Link>
        </div>
      )}

      <div className="max-w-xl mx-auto space-y-lg">
        <div className="p-lg bg-surface-container-low border border-outline-variant/30 rounded-xl">
          <h2 className="font-headline-sm text-headline-sm text-on-surface mb-md">
            1. Upload PDF
          </h2>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => void onPdfPick(e.target.files?.[0] ?? null)}
            className="font-body-md text-body-md w-full"
          />
          {pdfFile && pageCount > 0 && (
            <p className="font-label-sm text-label-sm text-tertiary mt-sm">
              {pdfFile.name} · {pageCount} page{pageCount === 1 ? "" : "s"}
            </p>
          )}
        </div>

        <div className="p-lg bg-surface-container-low border border-outline-variant/30 rounded-xl">
          <h2 className="font-headline-sm text-headline-sm text-on-surface mb-md">
            2. Choose signature
          </h2>
          {signatures.length > 0 ? (
            <select
              value={selectedSigId ?? ""}
              onChange={(e) => {
                setSelectedSigId(e.target.value || null);
                setUploadSigPreview(null);
              }}
              className="w-full p-sm rounded border border-outline-variant/50 bg-surface-container-lowest font-body-md mb-md"
            >
              {signatures.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          ) : (
            <p className="font-body-md text-body-md text-on-surface-variant mb-md">
              No cloud signatures yet.{" "}
              <Link href="/studio" className="text-tertiary underline">
                Create one in Studio
              </Link>{" "}
              or upload an image below.
            </p>
          )}
          <label className="font-label-sm text-label-sm text-on-surface-variant block mb-xs">
            Or upload signature image
          </label>
          <input
            type="file"
            accept="image/png,image/jpeg"
            onChange={(e) => void onSignatureUpload(e.target.files?.[0] ?? null)}
            className="font-body-md w-full"
          />
          {signaturePreviewUrl && (
            <img
              src={signaturePreviewUrl}
              alt="Signature preview"
              className="mt-md max-h-24 object-contain"
            />
          )}
        </div>

        <button
          type="button"
          disabled={!authenticated || !pdfBase64 || !signaturePngBase64}
          onClick={continueToPlace}
          className="w-full py-md bg-tertiary text-on-tertiary rounded font-label-md hover:bg-tertiary/90 disabled:opacity-50 transition-colors"
        >
          Continue to placement →
        </button>

        {msg && (
          <p className="font-body-md text-body-md text-error text-center">{msg}</p>
        )}
      </div>
    </main>
  );
}
