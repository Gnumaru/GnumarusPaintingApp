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

/**
 * 4-way flood fill of the contiguous region holding the exact start pixel
 * RGBA value. Writes `color` with the same channel-lock masking as `setPixel`.
 * Returns the number of region pixels visited (0 when out of bounds or when
 * the region already holds `color`). Uses a `Uint8Array` visited mask plus an
 * explicit stack so large fills never recurse and RAM stays proportional to
 * the image (one byte per pixel plus frontier).
 */
export function floodFill(
  buffer: Uint8ClampedArray,
  width: number,
  height: number,
  startX: number,
  startY: number,
  color: GnumarusRgba,
  locked: GnumarusChannelLock | undefined = undefined,
): number {
  if (!Number.isInteger(startX) || !Number.isInteger(startY)) {
    return 0;
  }
  if (startX < 0 || startY < 0 || startX >= width || startY >= height) {
    return 0;
  }
  if (width < 1 || height < 1) {
    return 0;
  }
  const startIndex = (startY * width + startX) * 4;
  const targetR = buffer[startIndex];
  const targetG = buffer[startIndex + 1];
  const targetB = buffer[startIndex + 2];
  const targetA = buffer[startIndex + 3];
  if (targetR === color.r && targetG === color.g && targetB === color.b && targetA === color.a) {
    return 0;
  }
  const visited = new Uint8Array(width * height);
  const stack: number[] = [startY * width + startX];
  visited[startY * width + startX] = 1;
  let filled = 0;
  while (stack.length > 0) {
    const index = stack.pop();
    if (index === undefined) {
      break;
    }
    const x = index % width;
    const y = Math.floor(index / width);
    const i = index * 4;
    if (buffer[i] !== targetR || buffer[i + 1] !== targetG || buffer[i + 2] !== targetB || buffer[i + 3] !== targetA) {
      continue;
    }
    setPixel(buffer, width, height, x, y, color, locked);
    filled += 1;
    if (x > 0) {
      const neighbor = index - 1;
      if (visited[neighbor] !== 1) {
        visited[neighbor] = 1;
        stack.push(neighbor);
      }
    }
    if (x + 1 < width) {
      const neighbor = index + 1;
      if (visited[neighbor] !== 1) {
        visited[neighbor] = 1;
        stack.push(neighbor);
      }
    }
    if (y > 0) {
      const neighbor = index - width;
      if (visited[neighbor] !== 1) {
        visited[neighbor] = 1;
        stack.push(neighbor);
      }
    }
    if (y + 1 < height) {
      const neighbor = index + width;
      if (visited[neighbor] !== 1) {
        visited[neighbor] = 1;
        stack.push(neighbor);
      }
    }
  }
  return filled;
}

export type GnumarusBrushShape = "square" | "circle";

export const GNUMARUS_MIN_BRUSH_SIZE = 1;
export const GNUMARUS_MAX_BRUSH_SIZE = 64;
export const GNUMARUS_MIN_BRUSH_SIZE_FLOAT = 0.1;

/** Clamp a brush size to the supported integer range 1..64. */
export function clampBrushSize(value: number): number {
  if (!Number.isFinite(value)) {
    return GNUMARUS_MIN_BRUSH_SIZE;
  }
  return Math.min(GNUMARUS_MAX_BRUSH_SIZE, Math.max(GNUMARUS_MIN_BRUSH_SIZE, Math.floor(value)));
}

/** Clamp a brush/line width to the supported float range 0.1..64 (no rounding). */
export function clampBrushSizeFloat(value: number): number {
  if (!Number.isFinite(value)) {
    return GNUMARUS_MIN_BRUSH_SIZE;
  }
  return Math.min(GNUMARUS_MAX_BRUSH_SIZE, Math.max(GNUMARUS_MIN_BRUSH_SIZE_FLOAT, value));
}

/** Round a float width to the nearest integer for non-anti-aliased painting (min 1, max 64). */
export function roundBrushSizeForAliased(value: number): number {
  if (!Number.isFinite(value)) {
    return GNUMARUS_MIN_BRUSH_SIZE;
  }
  return Math.min(GNUMARUS_MAX_BRUSH_SIZE, Math.max(GNUMARUS_MIN_BRUSH_SIZE, Math.round(value)));
}

/** Parse a brush shape, defaulting to square for missing or invalid input. */
export function parseBrushShape(value: unknown): GnumarusBrushShape {
  return value === "circle" ? "circle" : "square";
}

/**
 * Stamp a solid brush tip centered near (centerX, centerY).
 * Square paints the full size x size box; circle paints the disk mask
 * (squared distance from the box center within (size/2)^2 - 0.5, floored at 0,
 * so 1px is one pixel, 2px is 2x2, 3px is a plus, 4px cuts corners, and so on).
 * The box top-left is (center - floor((size-1)/2)). Out-of-bounds pixels are skipped.
 */
export function drawBrushStamp(
  buffer: Uint8ClampedArray,
  width: number,
  height: number,
  centerX: number,
  centerY: number,
  size: number,
  shape: GnumarusBrushShape,
  color: GnumarusRgba,
  locked: GnumarusChannelLock | undefined = undefined,
): void {
  const tip = clampBrushSize(size);
  const anchor = Math.floor((tip - 1) / 2);
  const left = centerX - anchor;
  const top = centerY - anchor;
  if (shape === "square") {
    for (let dy = 0; dy < tip; dy += 1) {
      for (let dx = 0; dx < tip; dx += 1) {
        setPixel(buffer, width, height, left + dx, top + dy, color, locked);
      }
    }
    return;
  }
  const center = (tip - 1) / 2;
  const threshold = Math.max(0, (tip * tip) / 4 - 0.5);
  for (let dy = 0; dy < tip; dy += 1) {
    for (let dx = 0; dx < tip; dx += 1) {
      const distSquared = (dx - center) * (dx - center) + (dy - center) * (dy - center);
      if (distSquared <= threshold + 1e-9) {
        setPixel(buffer, width, height, left + dx, top + dy, color, locked);
      }
    }
  }
}

/**
 * Brush stroke along a Bresenham path, stamping the tip at every path pixel.
 * Preserves the 1px pencil path exactly when size is 1 (either shape).
 */
export function drawBrushLine(
  buffer: Uint8ClampedArray,
  width: number,
  height: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  size: number,
  shape: GnumarusBrushShape,
  color: GnumarusRgba,
  locked: GnumarusChannelLock | undefined = undefined,
): void {
  const tip = clampBrushSize(size);
  if (tip <= 1) {
    drawPixelLine(buffer, width, height, x0, y0, x1, y1, color, locked);
    return;
  }
  let x = x0;
  let y = y0;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  for (;;) {
    drawBrushStamp(buffer, width, height, x, y, tip, shape, color, locked);
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

/** Blend one pixel toward `color` by `coverage` (0..1), honoring channel locks. */
function blendPixelCoverage(
  buffer: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  color: GnumarusRgba,
  coverage: number,
  locked: GnumarusChannelLock | undefined = undefined,
): void {
  if (!(coverage > 0)) {
    return;
  }
  if (x < 0 || y < 0 || x >= width || y >= height) {
    return;
  }
  const clamped = Math.min(1, Math.max(0, coverage));
  if (clamped >= 1) {
    setPixel(buffer, width, height, x, y, color, locked);
    return;
  }
  const i = (y * width + x) * 4;
  const inv = 1 - clamped;
  if (locked === undefined || areAllChannelsUnlocked(locked)) {
    buffer[i] = Math.round(buffer[i] * inv + color.r * clamped);
    buffer[i + 1] = Math.round(buffer[i + 1] * inv + color.g * clamped);
    buffer[i + 2] = Math.round(buffer[i + 2] * inv + color.b * clamped);
    buffer[i + 3] = Math.round(buffer[i + 3] * inv + color.a * clamped);
    return;
  }
  if (locked.r !== true) {
    buffer[i] = Math.round(buffer[i] * inv + color.r * clamped);
  }
  if (locked.g !== true) {
    buffer[i + 1] = Math.round(buffer[i + 1] * inv + color.g * clamped);
  }
  if (locked.b !== true) {
    buffer[i + 2] = Math.round(buffer[i + 2] * inv + color.b * clamped);
  }
  if (locked.a !== true) {
    buffer[i + 3] = Math.round(buffer[i + 3] * inv + color.a * clamped);
  }
}

/**
 * Straight segment with thickness, end shape and optional anti-aliasing.
 * Without anti-aliasing this stamps the brush tip along the Bresenham path
 * (1px falls back to the exact pencil line). With anti-aliasing, coverage is
 * computed per pixel from the distance to the segment: round (`circle`) uses
 * Euclidean distance with semicircular caps, flat (`square`) uses a butt-cap
 * rectangle with a 1px feather on edges and ends. Partial pixels are blended
 * toward the fill color honoring channel locks.
 */
export function drawLineSegment(
  buffer: Uint8ClampedArray,
  width: number,
  height: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  lineWidth: number,
  shape: GnumarusBrushShape,
  antialiased: boolean,
  color: GnumarusRgba,
  locked: GnumarusChannelLock | undefined = undefined,
): void {
  const thick = antialiased ? clampBrushSizeFloat(lineWidth) : roundBrushSizeForAliased(lineWidth);
  if (!antialiased) {
    if (thick <= 1) {
      drawPixelLine(buffer, width, height, x0, y0, x1, y1, color, locked);
    } else {
      drawBrushLine(buffer, width, height, x0, y0, x1, y1, thick, shape, color, locked);
    }
    return;
  }
  const half = thick / 2;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (!(length > 1e-9)) {
    if (shape === "square") {
      const reach = half + 0.5;
      const minX = Math.floor(x0 - reach);
      const maxX = Math.ceil(x0 + reach);
      const minY = Math.floor(y0 - reach);
      const maxY = Math.ceil(y0 + reach);
      for (let y = minY; y <= maxY; y += 1) {
        for (let x = minX; x <= maxX; x += 1) {
          const cx = Math.min(1, Math.max(0, half + 0.5 - Math.abs(x - x0)));
          const cy = Math.min(1, Math.max(0, half + 0.5 - Math.abs(y - y0)));
          blendPixelCoverage(buffer, width, height, x, y, color, Math.min(cx, cy), locked);
        }
      }
    } else {
      const radius = Math.max(0, half + 0.5);
      const minX = Math.floor(x0 - radius);
      const maxX = Math.ceil(x0 + radius);
      const minY = Math.floor(y0 - radius);
      const maxY = Math.ceil(y0 + radius);
      for (let y = minY; y <= maxY; y += 1) {
        for (let x = minX; x <= maxX; x += 1) {
          const dist = Math.sqrt((x - x0) * (x - x0) + (y - y0) * (y - y0));
          blendPixelCoverage(buffer, width, height, x, y, color, half + 0.5 - dist, locked);
        }
      }
    }
    return;
  }
  const ux = dx / length;
  const uy = dy / length;
  const pad = half + 1;
  const minX = Math.max(0, Math.floor(Math.min(x0, x1) - pad));
  const maxX = Math.min(width - 1, Math.ceil(Math.max(x0, x1) + pad));
  const minY = Math.max(0, Math.floor(Math.min(y0, y1) - pad));
  const maxY = Math.min(height - 1, Math.ceil(Math.max(y0, y1) + pad));
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const relX = x - x0;
      const relY = y - y0;
      const along = relX * ux + relY * uy;
      const perp = Math.abs(relX * uy - relY * ux);
      let coverage: number;
      if (shape === "circle") {
        const clamped = Math.min(length, Math.max(0, along));
        const cx = x0 + ux * clamped;
        const cy = y0 + uy * clamped;
        const dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
        coverage = half + 0.5 - dist;
      } else {
        const perpCoverage = half + 0.5 - perp;
        if (perpCoverage <= 0) {
          continue;
        }
        let endFade = 1;
        if (along < 0) {
          endFade = 1 + along;
        } else if (along > length) {
          endFade = 1 - (along - length);
        }
        if (endFade <= 0) {
          continue;
        }
        coverage = perpCoverage < endFade ? perpCoverage : endFade;
      }
      blendPixelCoverage(buffer, width, height, x, y, color, coverage, locked);
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
  const longMatch = /^#([0-9a-f]{6})([0-9a-f]{2})?$/.exec(normalized);
  if (longMatch !== null) {
    const digits = longMatch[1];
    const alphaPair = longMatch[2];
    if (digits === undefined) {
      return null;
    }
    return {
      r: Number.parseInt(digits.slice(0, 2), 16),
      g: Number.parseInt(digits.slice(2, 4), 16),
      b: Number.parseInt(digits.slice(4, 6), 16),
      a: alphaPair === undefined ? 255 : Number.parseInt(alphaPair, 16),
    };
  }
  return null;
}
