/**
 * Pure per-dab retouch math (shading, blur/sharpen, recolor, jumble).
 * No DOM or WebGL: the engine samples buffers and writes results back,
 * so every helper is deterministic and unit-tested. Colors are 0..255
 * `{ r, g, b, a }` records like the rest of the paint pipeline.
 */
import { hslToRgb01, rgb01ToHsl } from "../color/GnumarusColorModels";
import type { GnumarusRgba } from "../canvas/GnumarusPixelBuffer";

export type GnumarusShadeMode = "lighten" | "darken" | "hue";
export type GnumarusBlurMode = "blur" | "sharpen";

/** Parse a shading mode, defaulting to lighten. */
export function parseShadeMode(value: unknown): GnumarusShadeMode {
  return value === "darken" ? "darken" : value === "hue" ? "hue" : "lighten";
}

/** Parse a blur mode, defaulting to blur. */
export function parseBlurMode(value: unknown): GnumarusBlurMode {
  return value === "sharpen" ? "sharpen" : "blur";
}

function clampByte(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)));
}

/**
 * Lighten toward white, darken toward black, or rotate the hue toward the
 * paint color. `amount` is 0..1 (0 leaves the pixel alone). Alpha is kept.
 */
export function shadePixelColor(
  pixel: GnumarusRgba,
  paint: GnumarusRgba,
  mode: GnumarusShadeMode,
  amount: number,
): GnumarusRgba {
  const strength = Number.isFinite(amount) ? Math.min(1, Math.max(0, amount)) : 0;
  if (mode === "lighten") {
    return {
      r: clampByte(pixel.r + (255 - pixel.r) * strength),
      g: clampByte(pixel.g + (255 - pixel.g) * strength),
      b: clampByte(pixel.b + (255 - pixel.b) * strength),
      a: pixel.a,
    };
  }
  if (mode === "darken") {
    return {
      r: clampByte(pixel.r * (1 - strength)),
      g: clampByte(pixel.g * (1 - strength)),
      b: clampByte(pixel.b * (1 - strength)),
      a: pixel.a,
    };
  }
  const from = rgb01ToHsl(pixel.r / 255, pixel.g / 255, pixel.b / 255);
  const target = rgb01ToHsl(paint.r / 255, paint.g / 255, paint.b / 255);
  let delta = target.h - from.h;
  if (delta > 180) {
    delta -= 360;
  } else if (delta < -180) {
    delta += 360;
  }
  const moved = hslToRgb01(from.h + delta * strength, target.s, from.l);
  return {
    r: clampByte(moved.r * 255),
    g: clampByte(moved.g * 255),
    b: clampByte(moved.b * 255),
    a: pixel.a,
  };
}

/** Box-average of the neighborhood (radius 0 reads the pixel itself). */
export function blurAverageColor(
  buffer: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  radius: number,
): GnumarusRgba | null {
  const r = Math.max(0, Math.floor(radius));
  if (x < 0 || y < 0 || x >= width || y >= height) {
    return null;
  }
  let count = 0;
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let aSum = 0;
  for (let oy = -r; oy <= r; oy += 1) {
    for (let ox = -r; ox <= r; ox += 1) {
      const sx = x + ox;
      const sy = y + oy;
      if (sx < 0 || sy < 0 || sx >= width || sy >= height) {
        continue;
      }
      const i = (sy * width + sx) * 4;
      rSum += buffer[i] as number;
      gSum += buffer[i + 1] as number;
      bSum += buffer[i + 2] as number;
      aSum += buffer[i + 3] as number;
      count += 1;
    }
  }
  if (count === 0) {
    return null;
  }
  return {
    r: Math.round(rSum / count),
    g: Math.round(gSum / count),
    b: Math.round(bSum / count),
    a: Math.round(aSum / count),
  };
}

/** Unsharp response: push away from the local average by `strength`. */
export function sharpenAround(original: GnumarusRgba, blurred: GnumarusRgba, strength: number): GnumarusRgba {
  const k = Number.isFinite(strength) ? Math.min(1, Math.max(0, strength)) : 0;
  return {
    r: clampByte(original.r + (original.r - blurred.r) * k),
    g: clampByte(original.g + (original.g - blurred.g) * k),
    b: clampByte(original.b + (original.b - blurred.b) * k),
    a: original.a,
  };
}

function channelDistance(a: number, b: number): number {
  return Math.abs(a - b) / 255;
}

/**
 * Recolor toward the paint hue/saturation, keeping the pixel luminosity.
 * Returns null when the pixel is farther than `tolerance` (0..1) on any
 * channel, so only similar colors are repainted.
 */
export function recolorTowardPaint(
  pixel: GnumarusRgba,
  paint: GnumarusRgba,
  tolerance: number,
): GnumarusRgba | null {
  const limit = Number.isFinite(tolerance) ? Math.min(1, Math.max(0, tolerance)) : 0;
  if (
    channelDistance(pixel.r, paint.r) > limit ||
    channelDistance(pixel.g, paint.g) > limit ||
    channelDistance(pixel.b, paint.b) > limit
  ) {
    return null;
  }
  const from = rgb01ToHsl(pixel.r / 255, pixel.g / 255, pixel.b / 255);
  const target = rgb01ToHsl(paint.r / 255, paint.g / 255, paint.b / 255);
  const moved = hslToRgb01(target.h, target.s, from.l);
  return {
    r: clampByte(moved.r * 255),
    g: clampByte(moved.g * 255),
    b: clampByte(moved.b * 255),
    a: pixel.a,
  };
}

/** Random in-disc offset for the jumble dab (unit randoms keep it testable). */
export function jumbleOffset(radius: number, first: number, second: number): { dx: number; dy: number } {
  const r = Math.max(0, radius);
  const angle = first * Math.PI * 2;
  const distance = Math.sqrt(second) * r;
  return { dx: Math.round(Math.cos(angle) * distance), dy: Math.round(Math.sin(angle) * distance) };
}
