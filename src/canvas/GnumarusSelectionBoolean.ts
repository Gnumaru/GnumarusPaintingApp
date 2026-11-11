/**
 * Pure rectangle + mask helpers for rectangular-selection boolean ops.
 * Rectangles use exclusive-max bounds (`minX <= x < maxX`), matching the
 * cut semantics; masks are row-major bytes (`0` = out, `255` = in).
 */

/** Exclusive-max integer rectangle. */
export interface GnumarusSelectionRect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Normalize two corners to an exclusive-max rect (unclamped). */
export function normalizeSelectionRect(x0: number, y0: number, x1: number, y1: number): GnumarusSelectionRect {
  return {
    minX: Math.min(x0, x1),
    minY: Math.min(y0, y1),
    maxX: Math.max(x0, x1) + 1,
    maxY: Math.max(y0, y1) + 1,
  };
}

/** True when the rect covers no pixels. */
export function isEmptySelectionRect(rect: GnumarusSelectionRect): boolean {
  return rect.minX >= rect.maxX || rect.minY >= rect.maxY;
}

/** Clamp a rect into `[0, width) x [0, height)`; null when nothing remains. */
export function clampSelectionRect(
  rect: GnumarusSelectionRect,
  width: number,
  height: number,
): GnumarusSelectionRect | null {
  const clamped = {
    minX: Math.max(0, rect.minX),
    minY: Math.max(0, rect.minY),
    maxX: Math.min(width, rect.maxX),
    maxY: Math.min(height, rect.maxY),
  };
  return isEmptySelectionRect(clamped) ? null : clamped;
}

/** Overlap of two rects; null when disjoint. */
export function intersectSelectionRects(
  a: GnumarusSelectionRect,
  b: GnumarusSelectionRect,
): GnumarusSelectionRect | null {
  const overlap = {
    minX: Math.max(a.minX, b.minX),
    minY: Math.max(a.minY, b.minY),
    maxX: Math.min(a.maxX, b.maxX),
    maxY: Math.min(a.maxY, b.maxY),
  };
  return isEmptySelectionRect(overlap) ? null : overlap;
}

/** Smallest rect containing both inputs. */
export function unionSelectionBox(a: GnumarusSelectionRect, b: GnumarusSelectionRect): GnumarusSelectionRect {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  };
}

/** Count set mask bytes. */
export function countSelectionMask(mask: Uint8Array): number {
  let count = 0;
  for (let i = 0; i < mask.length; i += 1) {
    if ((mask[i] ?? 0) !== 0) {
      count += 1;
    }
  }
  return count;
}

/**
 * Tight exclusive-max box around the set mask bits, in mask-local coords;
 * null when no bit is set.
 */
export function selectionMaskBox(mask: Uint8Array, width: number, height: number): GnumarusSelectionRect | null {
  if (mask.length !== width * height) {
    return null;
  }
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if ((mask[y * width + x] ?? 0) === 0) {
        continue;
      }
      if (x < minX) {
        minX = x;
      }
      if (y < minY) {
        minY = y;
      }
      if (x + 1 > maxX) {
        maxX = x + 1;
      }
      if (y + 1 > maxY) {
        maxY = y + 1;
      }
    }
  }
  const box = { minX, minY, maxX, maxY };
  return isEmptySelectionRect(box) ? null : box;
}
