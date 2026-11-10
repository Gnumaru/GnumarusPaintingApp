/**
 * Krita/PhotoCraft-inspired paint-dab helpers (reimplemented from scratch).
 *
 * Pixel-art mode keeps using the binary stamps in GnumarusPixelBuffer
 * untouched. These helpers power the `soft` and `image` tip kinds: a round
 * tip with adjustable hardness falloff, grayscale image tips used as a
 * tintable alpha mask, and a spacing walker with a fractional carry so fast
 * strokes keep even dab density instead of dense per-pixel stamping.
 *
 * All functions are pure (no WebGL, no DOM) and safe to unit test.
 */
import {
  blendPixelCoverage,
  type GnumarusBlendMode,
  type GnumarusChannelLock,
  type GnumarusRgba,
} from "./GnumarusPixelBuffer";

/** Paint tip kind: binary pixel stamps, soft round, or image alpha mask. */
export type GnumarusBrushTipKind = "pixel" | "soft" | "image";

/** Parse a tip kind, defaulting to pixel for missing or invalid input. */
export function parseBrushTipKind(value: unknown): GnumarusBrushTipKind {
  if (value === "soft" || value === "image") {
    return value;
  }
  return "pixel";
}

/** Hardness 0..1 (1 = hard edge, 0 = fully soft). Default 0.5. */
export const DEFAULT_BRUSH_HARDNESS = 0.5;

export function clampBrushHardness(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_BRUSH_HARDNESS;
  }
  return Math.min(1, Math.max(0, value));
}

/** Dab spacing as a fraction of the tip diameter (0.05..4). Default 0.15. */
export const DEFAULT_BRUSH_SPACING = 0.15;
export const GNUMARUS_MIN_BRUSH_SPACING = 0.05;
export const GNUMARUS_MAX_BRUSH_SPACING = 4;

export function clampBrushSpacing(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_BRUSH_SPACING;
  }
  return Math.min(GNUMARUS_MAX_BRUSH_SPACING, Math.max(GNUMARUS_MIN_BRUSH_SPACING, value));
}

/** Grayscale alpha mask used as a tintable brush tip. */
export interface GnumarusPaintTipImage {
  width: number;
  height: number;
  /** One alpha byte 0..255 per texel, row-major. */
  alpha: Uint8Array;
}

/**
 * Build an image tip from RGBA pixels: the mask is the luminance
 * (white paints fully, black paints nothing), so any grayscale drawing
 * works as a tip regardless of its own alpha channel.
 */
export function paintTipImageFromRgba(
  buffer: Uint8ClampedArray,
  width: number,
  height: number,
): GnumarusPaintTipImage | null {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    return null;
  }
  if (buffer.length !== width * height * 4) {
    return null;
  }
  const alpha = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i += 1) {
    const r = buffer[i * 4] ?? 0;
    const g = buffer[i * 4 + 1] ?? 0;
    const b = buffer[i * 4 + 2] ?? 0;
    alpha[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }
  return { width, height, alpha };
}

/** Nearest-neighbor alpha lookup with u,v normalized to -1..1. */
export function samplePaintTipAlpha(tip: GnumarusPaintTipImage, u: number, v: number): number {
  const tx = Math.min(tip.width - 1, Math.max(0, Math.floor(((u + 1) / 2) * tip.width)));
  const ty = Math.min(tip.height - 1, Math.max(0, Math.floor(((v + 1) / 2) * tip.height)));
  return (tip.alpha[ty * tip.width + tx] ?? 0) / 255;
}

/**
 * Soft-round tip coverage for a normalized offset (u,v in -1..1).
 * Solid core out to `hardness`, then a cosine falloff to the rim,
 * so hardness 1 matches the hard disk and hardness 0 is fully soft.
 */
export function softTipCoverage(u: number, v: number, hardness: number): number {
  const hard = clampBrushHardness(hardness);
  const r = Math.sqrt(u * u + v * v);
  if (!(r < 1)) {
    return 0;
  }
  const core = hard;
  if (r <= core) {
    return 1;
  }
  const span = 1 - core;
  if (!(span > 0)) {
    return 0;
  }
  const t = (r - core) / span;
  return 0.5 * (1 + Math.cos(Math.PI * t));
}

/** Dab slot along a stroke segment. */
export interface GnumarusDabPosition {
  x: number;
  y: number;
}

/**
 * Walk a segment emitting dab positions every `spacing` diameters.
 * `carry` is the leftover distance since the previous dab (0 at stroke
 * start with `emitStart`, which stamps the segment origin). Returns the
 * positions and the leftover carry for the next segment, so density stays
 * even across pointer events no matter how the OS chunks motion.
 */
export function strokeDabPositions(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  diameter: number,
  spacing: number,
  carry: number,
  emitStart: boolean,
): { positions: GnumarusDabPosition[]; carryOut: number } {
  const safeDiameter = Number.isFinite(diameter) && diameter > 0 ? diameter : 1;
  const step = Math.max(0.5, safeDiameter * clampBrushSpacing(spacing));
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const safeCarry = Number.isFinite(carry) && carry >= 0 ? Math.min(carry, step) : 0;
  const positions: GnumarusDabPosition[] = [];
  let next = emitStart ? 0 : step - safeCarry;
  let lastEmitted = -1;
  while (next <= dist + 1e-9) {
    const t = dist > 1e-9 ? next / dist : 0;
    positions.push({ x: x0 + dx * t, y: y0 + dy * t });
    lastEmitted = next;
    next += step;
  }
  const carryOut = lastEmitted < 0 ? safeCarry + dist : dist - lastEmitted;
  return { positions, carryOut };
}

/**
 * Stamp one soft/image dab: per-pixel coverage (falloff x tip mask) scaled
 * by `alpha`, composited with the active blend mode and channel locks.
 * A null image tip paints nothing (rather than falling back to round).
 */
export function paintSoftDab(  buffer: Uint8ClampedArray,
  width: number,
  height: number,
  centerX: number,
  centerY: number,
  diameter: number,
  tip: GnumarusBrushTipKind,
  hardness: number,
  tipImage: GnumarusPaintTipImage | null,
  color: GnumarusRgba,
  alpha: number,
  locked: GnumarusChannelLock | undefined = undefined,
  blend: GnumarusBlendMode = "normal",
  jitter?: GnumarusPaintDabJitter,
  dual?: GnumarusPaintDualTip | null,
): void {
  if (!(diameter > 0) || !(alpha > 0)) {
    return;
  }
  if (tip === "pixel") {
    return;
  }
  if (tip === "image" && tipImage === null) {
    return;
  }
  const radius = diameter / 2;
  const reach = Math.ceil(radius) + 1;
  const minX = Math.floor(centerX - reach);
  const maxX = Math.ceil(centerX + reach);
  const minY = Math.floor(centerY - reach);
  const maxY = Math.ceil(centerY + reach);
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const u = radius > 1e-9 ? (x + 0.5 - centerX) / radius : 0;
      const v = radius > 1e-9 ? (y + 0.5 - centerY) / radius : 0;
      let coverage = softTipCoverage(u, v, hardness);
      if (coverage <= 0) {
        continue;
      }
      if (tip === "image" && tipImage !== null) {
        coverage *= samplePaintTipAlpha(tipImage, u, v);
        if (coverage <= 0) {
          continue;
        }
      }
      if (jitter !== undefined) {
        coverage *= paintGrainFactor(jitter, x, y);
        if (coverage <= 0) {
          continue;
        }
      }
      coverage = applyPaintDualTip(coverage, dual ?? null, u, v);
      if (coverage <= 0) {
        continue;
      }
      blendPixelCoverage(buffer, width, height, x, y, color, coverage * alpha, locked, blend);
    }
  }
}

/**
 * Rasterize one soft/image dab into a byte coverage mask with max (union)
 * semantics: overlapping dabs never accumulate, so the mask can be applied
 * once at the stroke opacity ceiling (flow builds toward it dab by dab).
 * The mask holds 0..255 per pixel; `alpha` scales the dab contribution.
 */
export function stampPaintDabCoverage(
  mask: Uint8Array,
  width: number,
  height: number,
  centerX: number,
  centerY: number,
  diameter: number,
  tip: GnumarusBrushTipKind,
  hardness: number,
  tipImage: GnumarusPaintTipImage | null,
  alpha: number,
  jitter?: GnumarusPaintDabJitter,
  dual?: GnumarusPaintDualTip | null,
): void {
  if (!(diameter > 0) || !(alpha > 0)) {
    return;
  }
  if (tip === "pixel") {
    return;
  }
  if (tip === "image" && tipImage === null) {
    return;
  }
  if (mask.length !== width * height) {
    return;
  }
  const radius = diameter / 2;
  const reach = Math.ceil(radius) + 1;
  const minX = Math.floor(centerX - reach);
  const maxX = Math.ceil(centerX + reach);
  const minY = Math.floor(centerY - reach);
  const maxY = Math.ceil(centerY + reach);
  for (let y = minY; y <= maxY; y += 1) {
    if (y < 0 || y >= height) {
      continue;
    }
    for (let x = minX; x <= maxX; x += 1) {
      if (x < 0 || x >= width) {
        continue;
      }
      const u = radius > 1e-9 ? (x + 0.5 - centerX) / radius : 0;
      const v = radius > 1e-9 ? (y + 0.5 - centerY) / radius : 0;
      let coverage = softTipCoverage(u, v, hardness);
      if (coverage <= 0) {
        continue;
      }
      if (tip === "image" && tipImage !== null) {
        coverage *= samplePaintTipAlpha(tipImage, u, v);
        if (coverage <= 0) {
          continue;
        }
      }
      if (jitter !== undefined) {
        coverage *= paintGrainFactor(jitter, x, y);
        if (coverage <= 0) {
          continue;
        }
      }
      coverage = applyPaintDualTip(coverage, dual ?? null, u, v);
      if (coverage <= 0) {
        continue;
      }
      const at = y * width + x;
      const stamped = Math.round(Math.min(1, coverage * alpha) * 255);
      if (stamped > (mask[at] ?? 0)) {
        mask[at] = stamped;
      }
    }
  }
}

/** Per-dab flow (0.01..1): fraction of the tip applied per dab. Default 1. */
export const DEFAULT_BRUSH_FLOW = 1;

export function clampBrushFlow(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_BRUSH_FLOW;
  }
  return Math.min(1, Math.max(0.01, value));
}

/** Fuzzy jitter amount (0..1). Default 0 (off). */
export const DEFAULT_PAINT_FUZZY = 0;

export function clampPaintFuzzy(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_PAINT_FUZZY;
  }
  return Math.min(1, Math.max(0, value));
}

/** Paper grain strength (0..1) and cell size in px (2..64). Defaults off, 8px. */
export const DEFAULT_PAINT_GRAIN_STRENGTH = 0;
export const DEFAULT_PAINT_GRAIN_SCALE = 8;

export function clampPaintGrainStrength(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_PAINT_GRAIN_STRENGTH;
  }
  return Math.min(1, Math.max(0, value));
}

export function clampPaintGrainScale(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_PAINT_GRAIN_SCALE;
  }
  return Math.min(64, Math.max(2, Math.floor(value)));
}

/**
 * Deterministic 0..1 hash of a seed plus dab index (integer mix, no RNG
 * state): the same stroke replays identically, which keeps undo/redo and
 * tests stable while every dab still varies.
 */
export function hashDabRandom(seed: number, index: number): number {
  let h = (Math.floor(seed) | 0) ^ Math.imul(Math.floor(index) | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Per-dab dynamics bundle: fuzzy jitter plus anchored paper grain. */
export interface GnumarusPaintDabJitter {
  fuzzy: number;
  seed: number;
  dabIndex: number;
  grainStrength: number;
  grainScale: number;
  grainSeed: number;
}

/** Fuzzy alpha multiplier for one dab: up to 75% alpha loss at full fuzzy. */
export function paintDabFuzzyAlpha(jitter: GnumarusPaintDabJitter): number {
  const fuzzy = clampPaintFuzzy(jitter.fuzzy);
  if (fuzzy <= 0) {
    return 1;
  }
  return 1 - fuzzy * 0.75 * hashDabRandom(jitter.seed, jitter.dabIndex * 2 + 1);
}

/** Fuzzy diameter for one dab: up to +/-50% at full fuzzy. */
export function paintDabFuzzySize(jitter: GnumarusPaintDabJitter, diameter: number): number {
  const fuzzy = clampPaintFuzzy(jitter.fuzzy);
  if (fuzzy <= 0 || !(diameter > 0)) {
    return diameter;
  }
  return Math.max(0.5, diameter * (1 + fuzzy * (hashDabRandom(jitter.seed, jitter.dabIndex * 2) - 0.5)));
}

/** Fuzzy center offset for one dab: up to a quarter diameter per axis. */
export function paintDabFuzzyOffset(
  jitter: GnumarusPaintDabJitter,
  diameter: number,
): { x: number; y: number } {
  const fuzzy = clampPaintFuzzy(jitter.fuzzy);
  if (fuzzy <= 0 || !(diameter > 0)) {
    return { x: 0, y: 0 };
  }
  const reach = fuzzy * diameter * 0.25;
  return {
    x: (hashDabRandom(jitter.seed, jitter.dabIndex * 2 + 2) - 0.5) * 2 * reach,
    y: (hashDabRandom(jitter.seed, jitter.dabIndex * 2 + 3) - 0.5) * 2 * reach,
  };
}

/**
 * Paper grain at an absolute pixel: smooth value noise (0..1) from a hashed
 * lattice, so the texture stays anchored to the canvas while dabs move.
 */
export function paintGrainValue(x: number, y: number, scale: number, seed: number): number {
  const cell = clampPaintGrainScale(scale);
  const gx = x / cell;
  const gy = y / cell;
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const fx = gx - x0;
  const fy = gy - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const lattice = (ix: number, iy: number): number =>
    hashDabRandom(seed, ix * 73856093 + iy * 19349663);
  const a = lattice(x0, y0);
  const b = lattice(x0 + 1, y0);
  const c = lattice(x0, y0 + 1);
  const d = lattice(x0 + 1, y0 + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/** Grain multiplier for one pixel: strength blends toward the grain value. */
export function paintGrainFactor(
  jitter: GnumarusPaintDabJitter,
  x: number,
  y: number,
): number {
  const strength = clampPaintGrainStrength(jitter.grainStrength);
  if (strength <= 0) {
    return 1;
  }
  return 1 - strength * (1 - paintGrainValue(x, y, jitter.grainScale, jitter.grainSeed));
}

/** Pressure curve preset: how pen pressure maps to size/alpha gain. */
export type GnumarusPressureCurve = "linear" | "soft" | "firm";

/** Parse a pressure curve, defaulting to linear for missing or invalid input. */
export function parsePressureCurve(value: unknown): GnumarusPressureCurve {
  if (value === "soft" || value === "firm") {
    return value;
  }
  return "linear";
}

/**
 * Evaluate a pressure curve at 0..1 pressure. Linear is identity; soft
 * answers early (square root, gentle touches paint more); firm answers
 * late (square, only hard presses reach full size/alpha).
 */
export function evalPressureCurve(curve: GnumarusPressureCurve, pressure: number): number {
  const p = Number.isFinite(pressure) ? Math.min(1, Math.max(0, pressure)) : 1;
  if (curve === "soft") {
    return Math.sqrt(p);
  }
  if (curve === "firm") {
    return p * p;
  }
  return p;
}

/** Second image tip masking the first (dual brush). */
export interface GnumarusPaintDualTip {
  tip: GnumarusPaintTipImage;
  /** Relative size multiplier (0.25..4). */
  scale: number;
  /** Mask strength (0..1). */
  strength: number;
}

export const DEFAULT_PAINT_DUAL_SCALE = 1;
export const DEFAULT_PAINT_DUAL_STRENGTH = 1;

export function clampPaintDualScale(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_PAINT_DUAL_SCALE;
  }
  return Math.min(4, Math.max(0.25, value));
}

export function clampPaintDualStrength(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_PAINT_DUAL_STRENGTH;
  }
  return Math.min(1, Math.max(0, value));
}

/**
 * Mask dab coverage by the dual tip sampled at a relatively scaled offset:
 * full strength replaces the coverage with the dual mask (black blocks,
 * white passes), zero strength keeps the primary tip alone.
 */
export function applyPaintDualTip(
  coverage: number,
  dual: GnumarusPaintDualTip | null,
  u: number,
  v: number,
): number {
  if (!(coverage > 0) || dual === null) {
    return coverage;
  }
  const scale = clampPaintDualScale(dual.scale);
  const sampled = samplePaintTipAlpha(dual.tip, u / scale, v / scale);
  const strength = clampPaintDualStrength(dual.strength);
  return coverage * (1 - strength * (1 - sampled));
}
