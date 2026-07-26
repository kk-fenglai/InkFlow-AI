"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import {
  deleteCloudDocument,
  fetchCloudDocument,
  fetchCloudDocuments,
  formatByteSize,
  type CloudDocument,
} from "@/lib/documents-api";
import { base64ToBlob, triggerDownloadBlob } from "@/lib/sign-client";

const SignedPdfPreview = dynamic(() => import("@/components/SignedPdfPreview"), {
  ssr: false,
  loading: () => (
    <p className="font-body-md text-body-md text-on-surface-variant py-lg text-center">
      Loading document…
    </p>
  ),
});

function formatSavedAt(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

export default function CloudDocumentsPanel({
  authenticated,
}: {
  authenticated: boolean;
}) {
  const [documents, setDocuments] = useState<CloudDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [openId, setOpenId] = useState<string | null>(null);
  const [openPdf, setOpenPdf] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!authenticated) {
      setDocuments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await fetchCloudDocuments();
    if (res.ok) {
      setDocuments(res.documents);
      setMsg("");
    } else {
      setDocuments([]);
      setMsg(res.error ?? "Could not load your documents.");
    }
    setLoading(false);
  }, [authenticated]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function openDocument(doc: CloudDocument) {
    if (openId === doc.id) {
      setOpenId(null);
      setOpenPdf(null);
      return;
    }
    setBusyId(doc.id);
    const res = await fetchCloudDocument(doc.id);
    setBusyId(null);
    if (!res.ok || !res.document) {
      setMsg(res.error ?? "Could not open document.");
      return;
    }
    setOpenId(doc.id);
    setOpenPdf(res.document.pdfBase64);
  }

  async function downloadDocument(doc: CloudDocument) {
    setBusyId(doc.id);
    const res = await fetchCloudDocument(doc.id);
    setBusyId(null);
    if (!res.ok || !res.document) {
      setMsg(res.error ?? "Could not download document.");
      return;
    }
    triggerDownloadBlob(
      base64ToBlob(res.document.pdfBase64, "application/pdf"),
      doc.fileName,
    );
  }

  async function removeDocument(doc: CloudDocument) {
    if (!window.confirm(`Delete “${doc.fileName}” from your cloud library?`)) {
      return;
    }
    setBusyId(doc.id);
    const res = await deleteCloudDocument(doc.id);
    setBusyId(null);
    if (!res.ok) {
      setMsg(res.error ?? "Delete failed.");
      return;
    }
    if (openId === doc.id) {
      setOpenId(null);
      setOpenPdf(null);
    }
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    setMsg(`Removed “${doc.fileName}”.`);
  }

  if (!authenticated) {
    return (
      <div className="p-xl bg-surface-container border border-outline-variant/30 rounded-xl text-center max-w-lg">
        <p className="font-body-md text-body-md text-on-surface-variant mb-md">
          Sign in to view the documents you signed.
        </p>
        <Link
          href="/login?callbackUrl=/library"
          className="inline-block px-lg py-md bg-tertiary text-on-tertiary rounded font-label-md"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <p className="font-body-md text-on-surface-variant">Loading documents…</p>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center p-xl bg-surface-container-low rounded-xl border border-outline-variant/30 max-w-lg">
        <span className="material-symbols-outlined text-on-surface-variant/50 text-[48px] mb-md block">
          picture_as_pdf
        </span>
        <p className="font-body-lg text-body-lg text-on-surface-variant mb-md">
          No signed documents yet.
        </p>
        <p className="font-body-md text-body-md text-on-surface-variant mb-lg">
          After signing a PDF you can keep a copy here — free, no extra credit.
        </p>
        <Link
          href="/sign"
          className="inline-flex items-center gap-sm px-md py-sm bg-tertiary text-on-tertiary rounded font-label-md"
        >
          Sign a PDF
        </Link>
        {msg && (
          <p className="font-body-md text-body-md text-error mt-md">{msg}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-md">
      <div className="flex items-center justify-between">
        <h2 className="font-headline-sm text-headline-sm text-on-surface">
          Signed documents
        </h2>
        <span className="font-label-sm text-label-sm text-on-surface-variant">
          {documents.length} saved
        </span>
      </div>

      <ul className="space-y-md">
        {documents.map((doc) => (
          <li
            key={doc.id}
            className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-md"
          >
            <div className="flex flex-wrap items-start justify-between gap-md">
              <div className="min-w-0">
                <p className="font-label-md text-label-md text-on-surface break-all">
                  {doc.fileName}
                </p>
                <p className="font-label-sm text-label-sm text-on-surface-variant mt-xs">
                  {formatSavedAt(doc.savedAt)} · {doc.pageCount} page
                  {doc.pageCount === 1 ? "" : "s"} ·{" "}
                  {formatByteSize(doc.byteSize)}
                </p>
              </div>

              <div className="flex flex-wrap gap-sm">
                <button
                  type="button"
                  disabled={busyId === doc.id}
                  onClick={() => void openDocument(doc)}
                  className="px-md py-xs rounded border border-outline-variant/60 font-label-sm hover:border-tertiary disabled:opacity-50"
                >
                  {openId === doc.id ? "Hide" : "Preview"}
                </button>
                <button
                  type="button"
                  disabled={busyId === doc.id}
                  onClick={() => void downloadDocument(doc)}
                  className="px-md py-xs rounded bg-tertiary text-on-tertiary font-label-sm hover:bg-tertiary/90 disabled:opacity-50"
                >
                  Download
                </button>
                <button
                  type="button"
                  disabled={busyId === doc.id}
                  onClick={() => void removeDocument(doc)}
                  className="px-md py-xs rounded border border-error/30 text-error font-label-sm hover:bg-error/5 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>

            {openId === doc.id && openPdf && (
              <div className="mt-md">
                <SignedPdfPreview pdfBase64={openPdf} maxWidth={640} />
              </div>
            )}
          </li>
        ))}
      </ul>

      {msg && (
        <p className="font-body-md text-body-md text-on-surface-variant text-center">
          {msg}
        </p>
      )}
    </div>
  );
}
