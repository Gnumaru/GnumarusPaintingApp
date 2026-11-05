export interface GnumarusViewTransform {
  zoom: number;
  panX: number;
  panY: number;
  /** Canvas rotation in radians, clockwise-positive on screen. */
  rotation: number;
  flipX: boolean;
  flipY: boolean;
}

export interface GnumarusRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Map a client (CSS pixel) point to image pixel coordinates.
 * The image is centered in the container plus pan offset, rotated
 * clockwise by `rotation` around its center, optionally mirrored,
 * with each image pixel covering `zoom` CSS pixels.
 * Returns null when outside the image.
 */
export function screenToImagePixel(
  clientX: number,
  clientY: number,
  rect: GnumarusRect,
  imageWidth: number,
  imageHeight: number,
  view: GnumarusViewTransform,
): { x: number; y: number } | null {
  if (view.zoom <= 0 || rect.width <= 0 || rect.height <= 0) {
    return null;
  }
  const centerX = rect.left + rect.width / 2 + view.panX;
  const centerY = rect.top + rect.height / 2 + view.panY;
  const dx = clientX - centerX;
  const dy = clientY - centerY;
  const cos = Math.cos(view.rotation);
  const sin = Math.sin(view.rotation);
  const ux = (cos * dx + sin * dy) / view.zoom;
  const uy = (-sin * dx + cos * dy) / view.zoom;
  const qx = ux / (view.flipX ? -1 : 1);
  const qy = uy / (view.flipY ? -1 : 1);
  const x = Math.floor(qx + imageWidth / 2);
  const y = Math.floor(qy + imageHeight / 2);
  if (x < 0 || y < 0 || x >= imageWidth || y >= imageHeight) {
    return null;
  }
  return { x, y };
}

/**
 * Map an image pixel to its center position in client (CSS pixel)
 * coordinates. Exact inverse of `screenToImagePixel` for the
 * un-floored position.
 */
export function imageToScreenPixel(
  imageX: number,
  imageY: number,
  rect: GnumarusRect,
  imageWidth: number,
  imageHeight: number,
  view: GnumarusViewTransform,
): { x: number; y: number } {
  const centerX = rect.left + rect.width / 2 + view.panX;
  const centerY = rect.top + rect.height / 2 + view.panY;
  const qx = imageX + 0.5 - imageWidth / 2;
  const qy = imageY + 0.5 - imageHeight / 2;
  const ux = qx * (view.flipX ? -1 : 1) * view.zoom;
  const uy = qy * (view.flipY ? -1 : 1) * view.zoom;
  const cos = Math.cos(view.rotation);
  const sin = Math.sin(view.rotation);
  return {
    x: centerX + cos * ux - sin * uy,
    y: centerY + sin * ux + cos * uy,
  };
}

export function clampZoom(zoom: number): number {
  if (Number.isNaN(zoom)) {
    return 1;
  }
  return Math.min(64, Math.max(0.5, zoom));
}

/** Normalize radians to (-PI, PI]. */
export function normalizeRotation(radians: number): number {
  const twoPi = Math.PI * 2;
  let result = radians % twoPi;
  if (result <= -Math.PI) {
    result += twoPi;
  } else if (result > Math.PI) {
    result -= twoPi;
  }
  return result;
}
