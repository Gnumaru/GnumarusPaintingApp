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
import { wrapLayerPixel, type GnumarusWrapMode } from "./GnumarusViewportMath";

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

/**
 * Pre-rendered radial falloff table (idea from Krita's KisDabCache, which
 * caches each dab so huge brushes reuse it instead of recomputing falloff
 * per pixel per dab). 257 entries over r in [0,1] using the exact same
 * cosine formula as `softTipCoverage`; lookup with linear interpolation
 * matches it within ~0.002 while avoiding a cos() per pixel. Keyed by
 * hardness quantized to 1/64.
 */
const GNUMARUS_SOFT_LUT_SIZE = 257;
const gnumarusSoftLutCache = new Map<number, Float32Array>();

export function softCoverageLut(hardness: number): Float32Array {
  const key = Math.round(clampBrushHardness(hardness) * 64);
  const cached = gnumarusSoftLutCache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const hard = key / 64;
  const lut = new Float32Array(GNUMARUS_SOFT_LUT_SIZE);
  for (let i = 0; i < GNUMARUS_SOFT_LUT_SIZE; i += 1) {
    const r = i / (GNUMARUS_SOFT_LUT_SIZE - 1);
    if (!(r < 1)) {
      lut[i] = 0;
    } else if (r <= hard) {
      lut[i] = 1;
    } else {
      const span = 1 - hard;
      if (!(span > 0)) {
        lut[i] = 0;
      } else {
        const t = (r - hard) / span;
        lut[i] = 0.5 * (1 + Math.cos(Math.PI * t));
      }
    }
  }
  if (gnumarusSoftLutCache.size > 128) {
    gnumarusSoftLutCache.clear();
  }
  gnumarusSoftLutCache.set(key, lut);
  return lut;
}

/** Lookup radial coverage from a LUT (r >= 0; returns 0 past the rim). */
export function softLutCoverage(lut: Float32Array, r: number): number {
  if (!(r < 1)) {
    return 0;
  }
  const scaled = r * (lut.length - 1);
  const i0 = Math.floor(scaled);
  const frac = scaled - i0;
  const a = lut[i0] ?? 0;
  if (!(frac > 0)) {
    return a;
  }
  const b = lut[Math.min(lut.length - 1, i0 + 1)] ?? 0;
  return a + (b - a) * frac;
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
  tipAngle = 0,
  smudge?: GnumarusPaintSmudge | null,
  wrap: GnumarusWrapMode = "off",
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
  let dabColor = color;
  let dabAlpha = alpha;
  const smudgeRate = smudge === undefined || smudge === null ? 0 : clampPaintSmudgeRate(smudge.rate);
  if (smudgeRate > 0 && smudge !== undefined && smudge !== null) {
    let px = Math.round(centerX);
    let py = Math.round(centerY);
    if (wrap !== "off") {
      const wrapped = wrapLayerPixel(px, py, width, height, wrap);
      if (wrapped !== null) {
        px = wrapped.x;
        py = wrapped.y;
      }
    }
    px = Math.min(width - 1, Math.max(0, px));
    py = Math.min(height - 1, Math.max(0, py));
    const at = (py * width + px) * 4;
    const pickup: GnumarusRgba = {
      r: buffer[at] ?? 0,
      g: buffer[at + 1] ?? 0,
      b: buffer[at + 2] ?? 0,
      a: buffer[at + 3] ?? 0,
    };
    dabColor = smudgeMixColor(pickup, color, smudge.wet);
    dabAlpha = smudgeDabAlpha(alpha, smudgeRate);
  }
  const radius = diameter / 2;
  const radiusInv = radius > 1e-9 ? 1 / radius : 0;
  const reach = Math.ceil(radius) + 1;
  const minX = Math.floor(centerX - reach);
  const maxX = Math.ceil(centerX + reach);
  const minY = Math.floor(centerY - reach);
  const maxY = Math.ceil(centerY + reach);
  const useImage = tip === "image";
  const hasGrain = jitter !== undefined && clampPaintGrainStrength(jitter.grainStrength) > 0;
  const hasDual = dual !== undefined && dual !== null;
  const hasAngle = Math.abs(tipAngle) > 1e-9;
  const cosA = hasAngle ? Math.cos(tipAngle) : 1;
  const sinA = hasAngle ? Math.sin(tipAngle) : 0;
  const hardClamped = clampBrushHardness(hardness);
  const isHardDisk = !useImage && hardClamped >= 1 - 1e-9;
  const lut = useImage || isHardDisk ? null : softCoverageLut(hardness);
  const dualScale = hasDual && dual !== undefined && dual !== null ? clampPaintDualScale(dual.scale) : 1;
  const dualStrength = hasDual && dual !== undefined && dual !== null ? clampPaintDualStrength(dual.strength) : 0;
  const dualTip = hasDual && dual !== undefined && dual !== null ? dual.tip : null;
  const useWrap = wrap !== "off";
  const simpleBlit =
    !useWrap && !useImage && !hasGrain && !hasDual && !hasAngle &&
    (smudge === undefined || smudge === null) && blend === "normal" &&
    (locked === undefined || (locked.r !== true && locked.g !== true && locked.b !== true && locked.a !== true));
  if (simpleBlit) {
    const rC = dabColor.r | 0;
    const gC = dabColor.g | 0;
    const bC = dabColor.b | 0;
    const aC = dabColor.a | 0;
    const x0 = Math.max(0, minX);
    const x1 = Math.min(width - 1, maxX);
    const y0 = Math.max(0, minY);
    const y1 = Math.min(height - 1, maxY);
    for (let y = y0; y <= y1; y += 1) {
      const v = (y + 0.5 - centerY) * radiusInv;
      const row = y * width * 4;
      for (let x = x0; x <= x1; x += 1) {
        const u = (x + 0.5 - centerX) * radiusInv;
        const q = u * u + v * v;
        if (!(q < 1)) {
          continue;
        }
        let coverage: number;
        if (isHardDisk) {
          coverage = 1;
        } else if (lut !== null) {
          coverage = softLutCoverage(lut, Math.sqrt(q));
        } else {
          coverage = softTipCoverage(u, v, hardness);
        }
        if (coverage <= 0) {
          continue;
        }
        const covA = coverage * dabAlpha;
        if (!(covA > 0)) {
          continue;
        }
        const i = row + x * 4;
        const srcA = (aC / 255) * covA;
        if (!(srcA > 0)) {
          continue;
        }
        const dstA = (buffer[i + 3] ?? 0) / 255;
        const outA = srcA + dstA * (1 - srcA);
        if (!(outA > 0)) {
          continue;
        }
        const inv = dstA * (1 - srcA);
        buffer[i] = Math.round((rC * srcA + (buffer[i] ?? 0) * inv) / outA);
        buffer[i + 1] = Math.round((gC * srcA + (buffer[i + 1] ?? 0) * inv) / outA);
        buffer[i + 2] = Math.round((bC * srcA + (buffer[i + 2] ?? 0) * inv) / outA);
        buffer[i + 3] = Math.round(outA * 255);
      }
    }
    return;
  }
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      let gx = x;
      let gy = y;
      if (useWrap) {
        const wrapped = wrapLayerPixel(x, y, width, height, wrap);
        if (wrapped === null) {
          continue;
        }
        gx = wrapped.x;
        gy = wrapped.y;
      }
      const u = (x + 0.5 - centerX) * radiusInv;
      const v = (y + 0.5 - centerY) * radiusInv;
      const q = u * u + v * v;
      if (!(q < 1)) {
        continue;
      }
      let coverage: number;
      if (isHardDisk) {
        coverage = 1;
      } else if (lut !== null) {
        coverage = softLutCoverage(lut, Math.sqrt(q));
      } else {
        coverage = softTipCoverage(u, v, hardness);
      }
      if (coverage <= 0) {
        continue;
      }
      let lu = u;
      let lv = v;
      if (hasAngle) {
        lu = u * cosA + v * sinA;
        lv = v * cosA - u * sinA;
      }
      if (useImage && tipImage !== null) {
        coverage *= samplePaintTipAlpha(tipImage, lu, lv);
        if (coverage <= 0) {
          continue;
        }
      }
      if (hasGrain && jitter !== undefined) {
        coverage *= paintGrainFactor(jitter, gx, gy);
        if (coverage <= 0) {
          continue;
        }
      }
      if (hasDual && dualTip !== null) {
        const sampled = samplePaintTipAlpha(dualTip, lu / dualScale, lv / dualScale);
        coverage *= 1 - dualStrength * (1 - sampled);
        if (coverage <= 0) {
          continue;
        }
      }
      blendPixelCoverage(buffer, width, height, gx, gy, dabColor, coverage * dabAlpha, locked, blend);
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
  tipAngle = 0,
  wrap: GnumarusWrapMode = "off",
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
  const radiusInv = radius > 1e-9 ? 1 / radius : 0;
  const reach = Math.ceil(radius) + 1;
  const minX = Math.floor(centerX - reach);
  const maxX = Math.ceil(centerX + reach);
  const minY = Math.floor(centerY - reach);
  const maxY = Math.ceil(centerY + reach);
  const useImage = tip === "image";
  const hasGrain = jitter !== undefined && clampPaintGrainStrength(jitter.grainStrength) > 0;
  const hasDual = dual !== undefined && dual !== null;
  const hasAngle = Math.abs(tipAngle) > 1e-9;
  const cosA = hasAngle ? Math.cos(tipAngle) : 1;
  const sinA = hasAngle ? Math.sin(tipAngle) : 0;
  const hardClamped = clampBrushHardness(hardness);
  const isHardDisk = !useImage && hardClamped >= 1 - 1e-9;
  const lut = useImage || isHardDisk ? null : softCoverageLut(hardness);
  const dualScale = hasDual && dual !== undefined && dual !== null ? clampPaintDualScale(dual.scale) : 1;
  const dualStrength = hasDual && dual !== undefined && dual !== null ? clampPaintDualStrength(dual.strength) : 0;
  const dualTip = hasDual && dual !== undefined && dual !== null ? dual.tip : null;
  const useWrap = wrap !== "off";
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      let gx = x;
      let gy = y;
      if (useWrap) {
        const wrapped = wrapLayerPixel(x, y, width, height, wrap);
        if (wrapped === null) {
          continue;
        }
        gx = wrapped.x;
        gy = wrapped.y;
      } else if (x < 0 || x >= width || y < 0 || y >= height) {
        continue;
      }
      const u = (x + 0.5 - centerX) * radiusInv;
      const v = (y + 0.5 - centerY) * radiusInv;
      const q = u * u + v * v;
      if (!(q < 1)) {
        continue;
      }
      let coverage: number;
      if (isHardDisk) {
        coverage = 1;
      } else if (lut !== null) {
        coverage = softLutCoverage(lut, Math.sqrt(q));
      } else {
        coverage = softTipCoverage(u, v, hardness);
      }
      if (coverage <= 0) {
        continue;
      }
      let lu = u;
      let lv = v;
      if (hasAngle) {
        lu = u * cosA + v * sinA;
        lv = v * cosA - u * sinA;
      }
      if (useImage && tipImage !== null) {
        coverage *= samplePaintTipAlpha(tipImage, lu, lv);
        if (coverage <= 0) {
          continue;
        }
      }
      if (hasGrain && jitter !== undefined) {
        coverage *= paintGrainFactor(jitter, gx, gy);
        if (coverage <= 0) {
          continue;
        }
      }
      if (hasDual && dualTip !== null) {
        const sampled = samplePaintTipAlpha(dualTip, lu / dualScale, lv / dualScale);
        coverage *= 1 - dualStrength * (1 - sampled);
        if (coverage <= 0) {
          continue;
        }
      }
      const at = gy * width + gx;
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

/** Symmetry mode: mirror paint across canvas axes. */
export type GnumarusSymmetryMode = "off" | "mirror-x" | "mirror-y" | "both";

/** Parse a symmetry mode, defaulting to off. */
export function parseSymmetryMode(value: unknown): GnumarusSymmetryMode {
  if (value === "mirror-x" || value === "mirror-y" || value === "both") {
    return value;
  }
  return "off";
}

/**
 * Extra endpoint sets for one segment under symmetry: mirror-x flips
 * left-right, mirror-y flips up-down, both adds all three mirrors.
 * Coordinates mirror around (`2 * axis - v`, rounded to whole pixels).
 */
export function mirrorSegmentEndsOnAxis(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  axisX: number,
  axisY: number,
  mode: GnumarusSymmetryMode,
): Array<{ x0: number; y0: number; x1: number; y1: number }> {
  const mirrors: Array<{ x0: number; y0: number; x1: number; y1: number }> = [];
  const mirrorX = (v: number): number => Math.round(2 * axisX - v);
  const mirrorY = (v: number): number => Math.round(2 * axisY - v);
  if (mode === "mirror-x" || mode === "both") {
    mirrors.push({ x0: mirrorX(x0), y0, x1: mirrorX(x1), y1 });
  }
  if (mode === "mirror-y" || mode === "both") {
    mirrors.push({ x0, y0: mirrorY(y0), x1, y1: mirrorY(y1) });
  }
  if (mode === "both") {
    mirrors.push({ x0: mirrorX(x0), y0: mirrorY(y0), x1: mirrorX(x1), y1: mirrorY(y1) });
  }
  return mirrors;
}

/**
 * Extra endpoint sets for one segment under symmetry: mirror-x flips
 * left-right, mirror-y flips up-down, both adds all three mirrors.
 * Coordinates mirror around the texture center (`size - 1 - v`).
 */
export function mirrorSegmentEnds(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  width: number,
  height: number,
  mode: GnumarusSymmetryMode,
): Array<{ x0: number; y0: number; x1: number; y1: number }> {
  return mirrorSegmentEndsOnAxis(x0, y0, x1, y1, (width - 1) / 2, (height - 1) / 2, mode);
}

/** Airbrush rate in dabs per second (0..20). Default 0 (off). */
export const DEFAULT_AIRBRUSH_RATE = 0;
export const GNUMARUS_MAX_AIRBRUSH_RATE = 20;

export function clampAirbrushRate(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_AIRBRUSH_RATE;
  }
  return Math.min(GNUMARUS_MAX_AIRBRUSH_RATE, Math.max(0, value));
}

/**
 * Timed dabs owed for held-pointer airbrush: rate dabs per second with a
 * fractional carry so slow rates still emit whole dabs on schedule.
 */
export function airbrushDabsDue(
  elapsedMs: number,
  ratePerSec: number,
  carry: number,
): { count: number; carryOut: number } {
  const rate = clampAirbrushRate(ratePerSec);
  if (rate <= 0 || !(elapsedMs > 0)) {
    return { count: 0, carryOut: Number.isFinite(carry) && carry >= 0 ? carry : 0 };
  }
  const total = (elapsedMs / 1000) * rate + (Number.isFinite(carry) && carry >= 0 ? carry : 0);
  const count = Math.floor(total + 1e-9);
  return { count, carryOut: total - count };
}

/** Generic 0..1 dynamics amount (tilt size, speed fade). Default 0 (off). */
export const DEFAULT_PAINT_DYNAMICS_AMOUNT = 0;

export function clampPaintDynamicsAmount(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_PAINT_DYNAMICS_AMOUNT;
  }
  return Math.min(1, Math.max(0, value));
}

/** Pointer tilt reading: magnitude 0..1 plus azimuth direction. */
export interface GnumarusPointerTilt {
  magnitude: number;
  azimuth: number;
}

/** Normalize raw tilt degrees (-90..90 per axis) to magnitude/azimuth. */
export function normalizePointerTilt(tiltX: number, tiltY: number): GnumarusPointerTilt {
  const x = Number.isFinite(tiltX) ? tiltX : 0;
  const y = Number.isFinite(tiltY) ? tiltY : 0;
  return {
    magnitude: Math.min(1, Math.sqrt(x * x + y * y) / 90),
    azimuth: Math.atan2(y, x),
  };
}

/** Tilt-size gain: dabs grow up to 2x at full tilt with amount 1. */
export function paintTiltSizeGain(magnitude: number, amount: number): number {
  const mag = Number.isFinite(magnitude) ? Math.min(1, Math.max(0, magnitude)) : 0;
  return 1 + clampPaintDynamicsAmount(amount) * mag;
}

/** Instantaneous stroke speed 0..1 from layer-space travel (saturates at 3 px/ms). */
export function strokeSpeedNorm(distancePx: number, dtMs: number): number {
  if (!(distancePx > 0) || !(dtMs > 0)) {
    return 0;
  }
  return Math.min(1, distancePx / dtMs / 3);
}

/** Smooth a velocity reading with an exponential moving average (tau 120ms). */
export function smoothStrokeVelocity(previous: number, instantaneous: number, dtMs: number): number {
  const prev = Number.isFinite(previous) ? Math.min(1, Math.max(0, previous)) : 0;
  const inst = Number.isFinite(instantaneous) ? Math.min(1, Math.max(0, instantaneous)) : 0;
  if (!(dtMs > 0)) {
    return inst;
  }
  const alpha = 1 - Math.exp(-dtMs / 120);
  return prev + (inst - prev) * alpha;
}

/** Speed-fade flow multiplier: fast strokes lose up to `fade` of flow. */
export function paintSpeedFlowGain(velocity: number, fade: number): number {
  const vel = Number.isFinite(velocity) ? Math.min(1, Math.max(0, velocity)) : 0;
  return 1 - clampPaintDynamicsAmount(fade) * vel;
}

/** Tip rotation mode: none, or follow the stroke direction. */
export type GnumarusTipAngleMode = "none" | "direction";

/** Parse a tip rotation mode, defaulting to none. */
export function parseTipAngleMode(value: unknown): GnumarusTipAngleMode {
  return value === "direction" ? "direction" : "none";
}

/** Rotate a normalized tip offset by -angle (dab space into tip space). */
export function rotateDabUV(u: number, v: number, angle: number): { u: number; v: number } {
  if (!(Math.abs(angle) > 1e-9)) {
    return { u, v };
  }
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { u: u * c + v * s, v: v * c - u * s };
}

/** Blend two angles along the shortest arc (t 0 keeps prev, 1 takes next). */
export function blendDabAngle(previous: number, next: number, t: number): number {
  const clamped = Number.isFinite(t) ? Math.min(1, Math.max(0, t)) : 1;
  let delta = next - previous;
  while (delta > Math.PI) {
    delta -= Math.PI * 2;
  }
  while (delta < -Math.PI) {
    delta += Math.PI * 2;
  }
  return previous + delta * clamped;
}

/** Dry/wet smear dynamics: pick up canvas paint into the dab. */
export interface GnumarusPaintSmudge {
  /** Smear strength 0..1 (0 disables pickup). */
  rate: number;
  /** How much brush color mixes into the picked-up paint (0 = dry). */
  wet: number;
}

export const DEFAULT_PAINT_SMUDGE_RATE = 0;
export const DEFAULT_PAINT_SMUDGE_WET = 0;

export function clampPaintSmudgeRate(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_PAINT_SMUDGE_RATE;
  }
  return Math.min(1, Math.max(0, value));
}

export function clampPaintSmudgeWet(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_PAINT_SMUDGE_WET;
  }
  return Math.min(1, Math.max(0, value));
}

/** Mix picked-up paint with the brush color by wetness (straight alpha). */
export function smudgeMixColor(pickup: GnumarusRgba, brush: GnumarusRgba, wet: number): GnumarusRgba {
  const w = clampPaintSmudgeWet(wet);
  return {
    r: Math.round(pickup.r + (brush.r - pickup.r) * w),
    g: Math.round(pickup.g + (brush.g - pickup.g) * w),
    b: Math.round(pickup.b + (brush.b - pickup.b) * w),
    a: Math.round(pickup.a + (brush.a - pickup.a) * w),
  };
}

/** Effective dab factor with smear: pickup boosts weak flows toward full. */
export function smudgeDabAlpha(alpha: number, rate: number): number {
  const r = clampPaintSmudgeRate(rate);
  if (r <= 0) {
    return alpha;
  }
  const a = Number.isFinite(alpha) ? Math.min(1, Math.max(0, alpha)) : 0;
  return Math.min(1, a + r * (1 - a));
}
