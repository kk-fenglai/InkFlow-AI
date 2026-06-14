/** Convert pointer position on the rendered page to PDF points (origin bottom-left). */
export function screenToPdfPoint(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  pageWidth: number,
  pageHeight: number,
): { x: number; y: number } {
  const relX = (clientX - rect.left) / rect.width;
  const relY = (clientY - rect.top) / rect.height;
  return {
    x: relX * pageWidth,
    y: pageHeight - relY * pageHeight,
  };
}

/** PDF bottom-left anchor + size → overlay box in screen pixels (top-left origin). */
export function pdfRectToScreen(
  posX: number,
  posY: number,
  sigWidth: number,
  sigHeight: number,
  pageWidth: number,
  pageHeight: number,
  displayWidth: number,
  displayHeight: number,
): { left: number; top: number; width: number; height: number } {
  return {
    left: (posX / pageWidth) * displayWidth,
    top: displayHeight - ((posY + sigHeight) / pageHeight) * displayHeight,
    width: (sigWidth / pageWidth) * displayWidth,
    height: (sigHeight / pageHeight) * displayHeight,
  };
}

export function clampSignaturePlacement(
  posX: number,
  posY: number,
  sigWidth: number,
  sigHeight: number,
  pageWidth: number,
  pageHeight: number,
): { x: number; y: number } {
  return {
    x: Math.max(0, Math.min(pageWidth - sigWidth, posX)),
    y: Math.max(0, Math.min(pageHeight - sigHeight, posY)),
  };
}

/** Center signature on the clicked PDF point. */
export function placementFromClick(
  clickX: number,
  clickY: number,
  sigWidth: number,
  sigHeight: number,
  pageWidth: number,
  pageHeight: number,
): { x: number; y: number } {
  return clampSignaturePlacement(
    clickX - sigWidth / 2,
    clickY - sigHeight / 2,
    sigWidth,
    sigHeight,
    pageWidth,
    pageHeight,
  );
}

export function clampSignatureSize(
  width: number,
  height: number,
  pageWidth: number,
  pageHeight: number,
): { width: number; height: number } {
  return {
    width: Math.min(pageWidth * 0.95, Math.max(24, width)),
    height: Math.min(pageHeight * 0.6, Math.max(12, height)),
  };
}

export type ResizeHandle =
  | "nw"
  | "n"
  | "ne"
  | "w"
  | "e"
  | "sw"
  | "s"
  | "se";

function clampSignatureRect(
  posX: number,
  posY: number,
  width: number,
  height: number,
  pageWidth: number,
  pageHeight: number,
): { x: number; y: number; width: number; height: number } {
  const size = clampSignatureSize(width, height, pageWidth, pageHeight);
  const maxX = pageWidth - size.width;
  const maxY = pageHeight - size.height;
  return {
    x: Math.max(0, Math.min(maxX, posX)),
    y: Math.max(0, Math.min(maxY, posY)),
    width: size.width,
    height: size.height,
  };
}

/** Keep bottom-left anchor fixed while resizing. */
export function resizeSignatureFromBottomLeft(
  posX: number,
  posY: number,
  width: number,
  height: number,
  pageWidth: number,
  pageHeight: number,
): { x: number; y: number; width: number; height: number } {
  return clampSignatureRect(posX, posY, width, height, pageWidth, pageHeight);
}

/** Resize from any edge or corner handle. dw/dh are PDF-point deltas (dh positive = up). */
export function resizeSignatureFromHandle(
  handle: ResizeHandle,
  originX: number,
  originY: number,
  originW: number,
  originH: number,
  dw: number,
  dh: number,
  pageWidth: number,
  pageHeight: number,
): { x: number; y: number; width: number; height: number } {
  const right = originX + originW;
  const top = originY + originH;

  let x = originX;
  let y = originY;
  let width = originW;
  let height = originH;

  switch (handle) {
    case "nw":
      x = originX + dw;
      y = originY;
      width = originW - dw;
      height = originH + dh;
      break;
    case "n":
      y = originY;
      width = originW;
      height = originH + dh;
      break;
    case "ne":
      y = originY;
      width = originW + dw;
      height = originH + dh;
      break;
    case "w":
      x = originX + dw;
      width = originW - dw;
      height = originH;
      break;
    case "e":
      width = originW + dw;
      height = originH;
      break;
    case "sw":
      x = originX + dw;
      width = originW - dw;
      height = originH - dh;
      y = top - height;
      break;
    case "s":
      width = originW;
      height = originH - dh;
      y = top - height;
      break;
    case "se":
      width = originW + dw;
      height = originH - dh;
      y = top - height;
      break;
  }

  return clampSignatureRect(x, y, width, height, pageWidth, pageHeight);
}
