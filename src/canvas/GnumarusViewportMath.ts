export interface GnumarusViewportState {
  zoom: number;
  panX: number;
  panY: number;
}

export interface GnumarusRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Map a client (CSS pixel) point to image pixel coordinates.
 * The image is centered in the container plus pan offset, each image
 * pixel covers `zoom` CSS pixels. Returns null when outside the image.
 */
export function screenToImagePixel(
  clientX: number,
  clientY: number,
  rect: GnumarusRect,
  imageWidth: number,
  imageHeight: number,
  viewport: GnumarusViewportState,
): { x: number; y: number } | null {
  if (viewport.zoom <= 0 || rect.width <= 0 || rect.height <= 0) {
    return null;
  }
  const centerX = rect.left + rect.width / 2 + viewport.panX;
  const centerY = rect.top + rect.height / 2 + viewport.panY;
  const x = Math.floor((clientX - centerX) / viewport.zoom + imageWidth / 2);
  const y = Math.floor((clientY - centerY) / viewport.zoom + imageHeight / 2);
  if (x < 0 || y < 0 || x >= imageWidth || y >= imageHeight) {
    return null;
  }
  return { x, y };
}

export function clampZoom(zoom: number): number {
  if (Number.isNaN(zoom)) {
    return 1;
  }
  return Math.min(64, Math.max(0.5, zoom));
}
