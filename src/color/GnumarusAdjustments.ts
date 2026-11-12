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
