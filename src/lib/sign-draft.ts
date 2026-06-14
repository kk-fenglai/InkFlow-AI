export interface SignDraft {
  pdfBase64: string;
  fileName: string;
  pageCount: number;
  signaturePngBase64: string;
  signaturePreviewUrl: string;
}

let draft: SignDraft | null = null;

export function setSignDraft(next: SignDraft): void {
  draft = next;
}

export function getSignDraft(): SignDraft | null {
  return draft;
}

export function clearSignDraft(): void {
  draft = null;
}
