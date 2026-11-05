export interface GnumarusRgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export function createPixelBuffer(width: number, height: number): Uint8ClampedArray {
  return new Uint8ClampedArray(width * height * 4);
}

export function clearPixelBuffer(buffer: Uint8ClampedArray): void {
  buffer.fill(0);
}

export function setPixel(
  buffer: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  color: GnumarusRgba,
): boolean {
  if (x < 0 || y < 0 || x >= width || y >= height) {
    return false;
  }
  const i = (y * width + x) * 4;
  buffer[i] = color.r;
  buffer[i + 1] = color.g;
  buffer[i + 2] = color.b;
  buffer[i + 3] = color.a;
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
): void {
  let x = x0;
  let y = y0;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  for (;;) {
    setPixel(buffer, width, height, x, y, color);
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
