export interface GnumarusRgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface GnumarusChannelLock {
  r: boolean;
  g: boolean;
  b: boolean;
  a: boolean;
}

export const GNUMARUS_UNLOCKED_CHANNELS: GnumarusChannelLock = {
  r: false,
  g: false,
  b: false,
  a: false,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Parse a channel lock, defaulting to all unlocked for missing or invalid input. */
export function parseChannelLock(value: unknown): GnumarusChannelLock {
  if (!isRecord(value)) {
    return { ...GNUMARUS_UNLOCKED_CHANNELS };
  }
  return {
    r: value["r"] === true,
    g: value["g"] === true,
    b: value["b"] === true,
    a: value["a"] === true,
  };
}

export function areAllChannelsUnlocked(locked: GnumarusChannelLock): boolean {
  return locked.r !== true && locked.g !== true && locked.b !== true && locked.a !== true;
}

export function createPixelBuffer(width: number, height: number): Uint8ClampedArray {
  return new Uint8ClampedArray(width * height * 4);
}

export const GNUMARUS_MIN_LAYER_DIM = 1;
export const GNUMARUS_MAX_LAYER_DIM = 1024;

export function clampLayerDim(value: number): number {
  if (!Number.isFinite(value)) {
    return GNUMARUS_MIN_LAYER_DIM;
  }
  return Math.min(GNUMARUS_MAX_LAYER_DIM, Math.max(GNUMARUS_MIN_LAYER_DIM, Math.floor(value)));
}

/**
 * Resize a pixel buffer preserving the top-left content.
 * Larger dimensions expand right and down with transparent pixels.
 * Smaller dimensions crop excess right and below.
 */
export function resizePixelBuffer(
  buffer: Uint8ClampedArray,
  oldWidth: number,
  oldHeight: number,
  newWidth: number,
  newHeight: number,
): Uint8ClampedArray {
  const next = new Uint8ClampedArray(newWidth * newHeight * 4);
  const copyWidth = Math.min(oldWidth, newWidth);
  const copyHeight = Math.min(oldHeight, newHeight);
  for (let y = 0; y < copyHeight; y += 1) {
    const src = (y * oldWidth) * 4;
    const dst = (y * newWidth) * 4;
    next.set(buffer.subarray(src, src + copyWidth * 4), dst);
  }
  return next;
}

export function clearPixelBuffer(buffer: Uint8ClampedArray, locked: GnumarusChannelLock | undefined = undefined): void {
  if (locked === undefined || areAllChannelsUnlocked(locked)) {
    buffer.fill(0);
    return;
  }
  for (let i = 0; i < buffer.length; i += 4) {
    if (locked.r !== true) {
      buffer[i] = 0;
    }
    if (locked.g !== true) {
      buffer[i + 1] = 0;
    }
    if (locked.b !== true) {
      buffer[i + 2] = 0;
    }
    if (locked.a !== true) {
      buffer[i + 3] = 0;
    }
  }
}

export function setPixel(
  buffer: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  color: GnumarusRgba,
  locked: GnumarusChannelLock | undefined = undefined,
): boolean {
  if (x < 0 || y < 0 || x >= width || y >= height) {
    return false;
  }
  const i = (y * width + x) * 4;
  if (locked === undefined || areAllChannelsUnlocked(locked)) {
    buffer[i] = color.r;
    buffer[i + 1] = color.g;
    buffer[i + 2] = color.b;
    buffer[i + 3] = color.a;
    return true;
  }
  if (locked.r !== true) {
    buffer[i] = color.r;
  }
  if (locked.g !== true) {
    buffer[i + 1] = color.g;
  }
  if (locked.b !== true) {
    buffer[i + 2] = color.b;
  }
  if (locked.a !== true) {
    buffer[i + 3] = color.a;
  }
  return true;
}

export function getPixel(
  buffer: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
): GnumarusRgba | null {
  if (x < 0 || y < 0 || x >= width || y >= height) {
    return null;
  }
  const i = (y * width + x) * 4;
  return { r: buffer[i], g: buffer[i + 1], b: buffer[i + 2], a: buffer[i + 3] };
}

/** Bresenham line with solid pixels, no anti-aliasing (pixel-art pencil). */
export function drawPixelLine(
  buffer: Uint8ClampedArray,
  width: number,
  height: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: GnumarusRgba,
  locked: GnumarusChannelLock | undefined = undefined,
): void {
  let x = x0;
  let y = y0;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  for (;;) {
    setPixel(buffer, width, height, x, y, color, locked);
    if (x === x1 && y === y1) {
      break;
    }
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}

/** Per-pixel straight-alpha source-over: src[srcIndex..] over dst[dstIndex..]. */
export function compositePixelOver(
  dst: Uint8ClampedArray,
  dstIndex: number,
  src: Uint8ClampedArray,
  srcIndex: number,
  opacity: number,
  dstLocked: GnumarusChannelLock | undefined = undefined,
): void {
  const srcA = (src[srcIndex + 3] / 255) * opacity;
  if (srcA <= 0) {
    return;
  }
  const dstA = dst[dstIndex + 3] / 255;
  const outA = srcA + dstA * (1 - srcA);
  const inv = dstA * (1 - srcA);
  if (dstLocked === undefined || areAllChannelsUnlocked(dstLocked)) {
    dst[dstIndex] = Math.round((src[srcIndex] * srcA + dst[dstIndex] * inv) / outA);
    dst[dstIndex + 1] = Math.round((src[srcIndex + 1] * srcA + dst[dstIndex + 1] * inv) / outA);
    dst[dstIndex + 2] = Math.round((src[srcIndex + 2] * srcA + dst[dstIndex + 2] * inv) / outA);
    dst[dstIndex + 3] = Math.round(outA * 255);
    return;
  }
  const outR = Math.round((src[srcIndex] * srcA + dst[dstIndex] * inv) / outA);
  const outG = Math.round((src[srcIndex + 1] * srcA + dst[dstIndex + 1] * inv) / outA);
  const outB = Math.round((src[srcIndex + 2] * srcA + dst[dstIndex + 2] * inv) / outA);
  const outAlpha = Math.round(outA * 255);
  if (dstLocked.r !== true) {
    dst[dstIndex] = outR;
  }
  if (dstLocked.g !== true) {
    dst[dstIndex + 1] = outG;
  }
  if (dstLocked.b !== true) {
    dst[dstIndex + 2] = outB;
  }
  if (dstLocked.a !== true) {
    dst[dstIndex + 3] = outAlpha;
  }
}

/** Source-over composite of `src` onto `dst` in place, both same-size straight-alpha buffers. */
export function compositeOver(
  dst: Uint8ClampedArray,
  src: Uint8ClampedArray,
  width: number,
  height: number,
  opacity: number,
  dstLocked: GnumarusChannelLock | undefined = undefined,
): void {
  const count = width * height;
  for (let i = 0; i < count; i += 1) {
    compositePixelOver(dst, i * 4, src, i * 4, opacity, dstLocked);
  }
}

export function parseHexColor(hex: string): GnumarusRgba | null {
  const normalized = hex.trim().toLowerCase();
  const shortMatch = /^#([0-9a-f]{3})$/.exec(normalized);
  if (shortMatch !== null) {
    const digits = shortMatch[1];
    return {
      r: Number.parseInt(digits[0] + digits[0], 16),
      g: Number.parseInt(digits[1] + digits[1], 16),
      b: Number.parseInt(digits[2] + digits[2], 16),
      a: 255,
    };
  }
  const longMatch = /^#([0-9a-f]{6})$/.exec(normalized);
  if (longMatch !== null) {
    const digits = longMatch[1];
    return {
      r: Number.parseInt(digits.slice(0, 2), 16),
      g: Number.parseInt(digits.slice(2, 4), 16),
      b: Number.parseInt(digits.slice(4, 6), 16),
      a: 255,
    };
  }
  return null;
}
