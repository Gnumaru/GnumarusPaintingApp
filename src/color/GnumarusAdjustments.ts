import {
  clampHue,
  hslToRgb01,
  linearToSrgbByte,
  linearSrgbToOkhsl,
  okhslToLinearSrgb,
  rgb01ToHsl,
  srgbByteToLinear,
} from "./GnumarusColorModels";

/**
 * Per-pixel color adjustments (brightness/contrast/posterize/invert).
 * Pure math on 0..255 bytes; the engine applies the chosen mapping to the
 * current cell texture in one undoable step.
 */
export interface GnumarusAdjustLevels {
  /** Brightness shift in -100..100 (added after contrast). */
  brightness: number;
  /** Contrast amount in -100..100 (0 is identity). */
  contrast: number;
  /** Posterize levels 2..255, or 0/null to skip posterization. */
  posterize: number;
}

export function clampAdjustLevels(levels: { brightness?: unknown; contrast?: unknown; posterize?: unknown }): GnumarusAdjustLevels {
  const num = (value: unknown, fallback: number): number => (typeof value === "number" && Number.isFinite(value) ? value : fallback);
  return {
    brightness: Math.min(100, Math.max(-100, Math.round(num(levels.brightness, 0)))),
    contrast: Math.min(100, Math.max(-100, Math.round(num(levels.contrast, 0)))),
    posterize: num(levels.posterize, 0) === 0 ? 0 : Math.min(255, Math.max(2, Math.round(num(levels.posterize, 0)))),
  };
}

function clampByte(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)));
}

/** Contrast factor matching the classic (259 * (c + 255)) / (255 * (259 - c)) curve. */
export function contrastFactor(amount: number): number {
  const clamped = Math.min(100, Math.max(-100, amount));
  return (259 * (clamped + 255)) / (255 * (259 - clamped));
}

/** Map one channel through brightness/contrast/posterize. */
export function adjustChannel(value: number, levels: GnumarusAdjustLevels): number {
  const factor = contrastFactor(levels.contrast);
  let out = factor * (value - 128) + 128 + (levels.brightness * 255) / 100;
  if (levels.posterize >= 2) {
    out = (Math.round((out / 255) * (levels.posterize - 1)) / (levels.posterize - 1)) * 255;
  }
  return clampByte(out);
}

/** Map one RGBA pixel through brightness/contrast/posterize (alpha kept). */
export function adjustPixel(
  r: number,
  g: number,
  b: number,
  a: number,
  levels: GnumarusAdjustLevels,
): [number, number, number, number] {
  return [adjustChannel(r, levels), adjustChannel(g, levels), adjustChannel(b, levels), Math.round(a)];
}

/** Invert RGB channels (alpha kept). */
export function invertPixel(r: number, g: number, b: number, a: number): [number, number, number, number] {
  return [255 - Math.round(r), 255 - Math.round(g), 255 - Math.round(b), Math.round(a)];
}

/** HSL adjustment color model: traditional HSL or perceptual OKHSL. */
export type GnumarusHslAdjustModel = "hsl" | "okhsl";

/** Parse an HSL adjustment model, defaulting to traditional HSL. */
export function parseHslAdjustModel(value: unknown): GnumarusHslAdjustModel {
  return value === "okhsl" ? "okhsl" : "hsl";
}

/** HSL adjustment mode: absolute offsets or percent-of-value offsets. */
export type GnumarusHslAdjustMode = "additive" | "proportional";

/** Parse an HSL adjustment mode, defaulting to additive. */
export function parseHslAdjustMode(value: unknown): GnumarusHslAdjustMode {
  return value === "proportional" ? "proportional" : "additive";
}

/** HSL slider levels: hue -180..180, the rest -100..100 (0 is identity). */
export interface GnumarusHslAdjustLevels {
  /** Hue offset in degrees (wraps at 360). */
  hue: number;
  /** Saturation offset in percent points (classic and perceptual scales alike). */
  saturation: number;
  /** Lightness offset in percent points. */
  lightness: number;
  /** Alpha offset in absolute 0..255 units. */
  alpha: number;
}

/** Clamp HSL slider levels to integers (hue -180..180, the rest -100..100). */
export function clampHslAdjustLevels(levels: {
  hue?: unknown;
  saturation?: unknown;
  lightness?: unknown;
  alpha?: unknown;
}): GnumarusHslAdjustLevels {
  const ranged = (value: unknown, min: number, max: number): number => {
    const n = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : 0;
    return Math.min(max, Math.max(min, n));
  };
  return {
    hue: ranged(levels.hue, -180, 180),
    saturation: ranged(levels.saturation, -100, 100),
    lightness: ranged(levels.lightness, -100, 100),
    alpha: ranged(levels.alpha, -100, 100),
  };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Shift one 0..1 component by a -100..100 slider: additive sums the
 * percent points exactly (`0.05 + 14` points), proportional adds that
 * percent of the value itself (`0.20 + 10%` is `0.22`; zeros stay zero).
 */
function shiftHslComponent(value: number, slider: number, mode: GnumarusHslAdjustMode): number {
  if (mode === "proportional") {
    return clamp01(value + (value * slider) / 100);
  }
  return clamp01(value + slider / 100);
}

/**
 * Map one RGBA pixel through hue/saturation/lightness/alpha offsets in
 * the chosen model and mode (alpha channel kept linear, units 0..255).
 * Traditional HSL works in sRGB directly; OKHSL goes through linear
 * light so equal slider steps look perceptually even.
 */
export function adjustPixelHsl(
  r: number,
  g: number,
  b: number,
  a: number,
  levels: GnumarusHslAdjustLevels,
  model: GnumarusHslAdjustModel,
  mode: GnumarusHslAdjustMode,
): [number, number, number, number] {
  let h: number;
  let s: number;
  let l: number;
  if (model === "okhsl") {
    const hsl = linearSrgbToOkhsl(srgbByteToLinear(r), srgbByteToLinear(g), srgbByteToLinear(b));
    h = hsl.h;
    s = hsl.s;
    l = hsl.l;
  } else {
    const hsl = rgb01ToHsl(
      Math.min(255, Math.max(0, r)) / 255,
      Math.min(255, Math.max(0, g)) / 255,
      Math.min(255, Math.max(0, b)) / 255,
    );
    h = hsl.h;
    s = hsl.s;
    l = hsl.l;
  }
  const nextH =
    mode === "proportional" ? (((h + (h * levels.hue) / 100) % 360) + 360) % 360 : clampHue(h + levels.hue);
  const nextS = shiftHslComponent(s, levels.saturation, mode);
  const nextL = shiftHslComponent(l, levels.lightness, mode);
  let outR: number;
  let outG: number;
  let outB: number;
  if (model === "okhsl") {
    const linear = okhslToLinearSrgb(nextH, nextS, nextL);
    outR = linearToSrgbByte(linear.r);
    outG = linearToSrgbByte(linear.g);
    outB = linearToSrgbByte(linear.b);
  } else {
    const rgb = hslToRgb01(nextH, nextS, nextL);
    outR = Math.round(clamp01(rgb.r) * 255);
    outG = Math.round(clamp01(rgb.g) * 255);
    outB = Math.round(clamp01(rgb.b) * 255);
  }
  const nextA =
    mode === "proportional"
      ? Math.min(255, Math.max(0, Math.round(a + (a * levels.alpha) / 100)))
      : Math.min(255, Math.max(0, Math.round(a + levels.alpha)));
  return [outR, outG, outB, nextA];
}
