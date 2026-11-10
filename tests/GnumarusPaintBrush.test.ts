import { describe, expect, it } from "vitest";
import {
  clampBrushFlow,
  clampBrushHardness,
  clampBrushSpacing,
  clampPaintFuzzy,
  clampPaintDualScale,
  clampPaintDualStrength,
  clampPaintGrainScale,
  clampPaintGrainStrength,
  DEFAULT_BRUSH_FLOW,
  DEFAULT_BRUSH_HARDNESS,
  DEFAULT_BRUSH_SPACING,
  DEFAULT_PAINT_DUAL_SCALE,
  DEFAULT_PAINT_DUAL_STRENGTH,
  DEFAULT_PAINT_FUZZY,
  DEFAULT_PAINT_GRAIN_SCALE,
  DEFAULT_PAINT_GRAIN_STRENGTH,
  applyPaintDualTip,
  evalPressureCurve,
  hashDabRandom,
  parsePressureCurve,
  paintDabFuzzyAlpha,
  paintDabFuzzyOffset,
  paintDabFuzzySize,
  paintGrainFactor,
  paintGrainValue,
  paintSoftDab,
  paintTipImageFromRgba,
  parseBrushTipKind,
  samplePaintTipAlpha,
  softTipCoverage,
  strokeDabPositions,
  type GnumarusPaintTipImage,
} from "../src/canvas/GnumarusPaintBrush";

function tipOf(alpha: number[]): GnumarusPaintTipImage {
  return { width: 2, height: 2, alpha: Uint8Array.from(alpha) };
}

describe("GnumarusPaintBrush", () => {
  it("parses the tip kind, defaulting to pixel", () => {
    expect(parseBrushTipKind("soft")).toBe("soft");
    expect(parseBrushTipKind("image")).toBe("image");
    expect(parseBrushTipKind("pixel")).toBe("pixel");
    expect(parseBrushTipKind("fancy")).toBe("pixel");
    expect(parseBrushTipKind(undefined)).toBe("pixel");
  });

  it("clamps hardness and spacing to their ranges", () => {
    expect(clampBrushHardness(0.5)).toBe(0.5);
    expect(clampBrushHardness(-1)).toBe(0);
    expect(clampBrushHardness(2)).toBe(1);
    expect(clampBrushHardness(Number.NaN)).toBe(DEFAULT_BRUSH_HARDNESS);
    expect(clampBrushSpacing(0.15)).toBe(0.15);
    expect(clampBrushSpacing(0)).toBe(0.05);
    expect(clampBrushSpacing(9)).toBe(4);
    expect(clampBrushSpacing(Number.NaN)).toBe(DEFAULT_BRUSH_SPACING);
  });

  it("softTipCoverage is solid in the core and falls off to the rim", () => {
    expect(softTipCoverage(0, 0, 0.5)).toBe(1);
    expect(softTipCoverage(2, 0, 0.5)).toBe(0);
    expect(softTipCoverage(1, 0, 1)).toBe(0);
    const mid = softTipCoverage(0.75, 0, 0.5);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
    expect(softTipCoverage(0.9, 0, 0.5)).toBeLessThan(mid);
    // Hardness 1 keeps a solid core out to the rim.
    expect(softTipCoverage(0.99, 0, 1)).toBe(1);
  });

  it("builds image tips from luminance and samples nearest", () => {
    const buffer = new Uint8ClampedArray([
      255, 255, 255, 255, 0, 0, 0, 255, 255, 0, 0, 255, 0, 0, 255, 255,
    ]);
    const tip = paintTipImageFromRgba(buffer, 2, 2);
    expect(tip?.width).toBe(2);
    expect(tip?.height).toBe(2);
    expect(tip === null ? [] : Array.from(tip.alpha)).toEqual([255, 0, 76, 29]);
    expect(paintTipImageFromRgba(new Uint8ClampedArray(3), 2, 2)).toBeNull();
    expect(paintTipImageFromRgba(new Uint8ClampedArray(16), 0, 2)).toBeNull();
    if (tip !== null) {
      expect(samplePaintTipAlpha(tip, -1, -1)).toBeCloseTo(1, 5);
      expect(samplePaintTipAlpha(tip, 0, -1)).toBeCloseTo(0, 5);
    }
  });

  it("strokeDabPositions spaces dabs by diameter fraction with carry", () => {    const first = strokeDabPositions(0, 0, 10, 0, 10, 0.5, 0, true);
    expect(first.positions.map((p) => p.x)).toEqual([0, 5, 10]);
    expect(first.carryOut).toBeCloseTo(0, 9);
    // Carry shifts the next segment so density stays even.
    const second = strokeDabPositions(10, 0, 14, 0, 10, 0.5, 2, false);
    expect(second.positions.map((p) => p.x)).toEqual([13]);
    expect(second.carryOut).toBeCloseTo(1, 9);
    // Degenerate segments still stamp once at the origin.
    const dot = strokeDabPositions(4, 4, 4, 4, 8, 0.15, 0, true);
    expect(dot.positions).toEqual([{ x: 4, y: 4 }]);
  });

  it("paintSoftDab fades edges and honors the tip mask", () => {
    const soft = new Uint8ClampedArray(16 * 16 * 4);
    paintSoftDab(soft, 16, 16, 8, 8, 8, "soft", 0.5, null, { r: 255, g: 0, b: 0, a: 255 }, 1);
    const center = soft[(8 * 16 + 8) * 4 + 3] ?? 0;
    const edge = soft[(4 * 16 + 8) * 4 + 3] ?? 0;
    expect(center).toBe(255);
    expect(edge).toBeGreaterThanOrEqual(0);
    expect(edge).toBeLessThan(center);
    // Opaque blacks in the tip block paint; whites let it through.
    const masked = new Uint8ClampedArray(16 * 16 * 4);
    paintSoftDab(
      masked, 16, 16, 8, 8, 8, "image", 1, tipOf([255, 0, 0, 255]),
      { r: 255, g: 0, b: 0, a: 255 }, 1,
    );
    const maskedCenter = masked[(8 * 16 + 8) * 4 + 3] ?? 0;
    expect(maskedCenter).toBeLessThanOrEqual(center);
    // A null image tip paints nothing, and pixel kind is a no-op here.
    const empty = new Uint8ClampedArray(16 * 16 * 4);
    paintSoftDab(empty, 16, 16, 8, 8, 8, "image", 1, null, { r: 255, g: 0, b: 0, a: 255 }, 1);
    expect(Array.from(empty).every((v) => v === 0)).toBe(true);
    const pixel = new Uint8ClampedArray(16 * 16 * 4);
    paintSoftDab(pixel, 16, 16, 8, 8, 8, "pixel", 1, null, { r: 255, g: 0, b: 0, a: 255 }, 1);
    expect(Array.from(pixel).every((v) => v === 0)).toBe(true);
  });

  it("clamps flow, fuzzy and grain settings", () => {
    expect(clampBrushFlow(1)).toBe(1);
    expect(clampBrushFlow(0)).toBe(0.01);
    expect(clampBrushFlow(9)).toBe(1);
    expect(clampBrushFlow(Number.NaN)).toBe(DEFAULT_BRUSH_FLOW);
    expect(clampPaintFuzzy(0.5)).toBe(0.5);
    expect(clampPaintFuzzy(-1)).toBe(0);
    expect(clampPaintFuzzy(2)).toBe(1);
    expect(clampPaintFuzzy(Number.NaN)).toBe(DEFAULT_PAINT_FUZZY);
    expect(clampPaintGrainStrength(0.4)).toBe(0.4);
    expect(clampPaintGrainStrength(3)).toBe(1);
    expect(clampPaintGrainStrength(Number.NaN)).toBe(DEFAULT_PAINT_GRAIN_STRENGTH);
    expect(clampPaintGrainScale(8)).toBe(8);
    expect(clampPaintGrainScale(1)).toBe(2);
    expect(clampPaintGrainScale(200)).toBe(64);
    expect(clampPaintGrainScale(Number.NaN)).toBe(DEFAULT_PAINT_GRAIN_SCALE);
  });

  it("hashDabRandom is deterministic and uniform in 0..1", () => {
    expect(hashDabRandom(7, 42)).toBe(hashDabRandom(7, 42));
    expect(hashDabRandom(7, 42)).not.toBe(hashDabRandom(7, 43));
    expect(hashDabRandom(7, 42)).not.toBe(hashDabRandom(8, 42));
    for (let i = 0; i < 50; i += 1) {
      const v = hashDabRandom(3, i);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("fuzzy jitter stays bounded and off means identity", () => {
    const off = { fuzzy: 0, seed: 5, dabIndex: 9, grainStrength: 0, grainScale: 8, grainSeed: 5 };
    expect(paintDabFuzzyAlpha(off)).toBe(1);
    expect(paintDabFuzzySize(off, 12)).toBe(12);
    expect(paintDabFuzzyOffset(off, 12)).toEqual({ x: 0, y: 0 });
    const on = { ...off, fuzzy: 1 };
    expect(paintDabFuzzyAlpha(on)).toBeGreaterThanOrEqual(0.25);
    expect(paintDabFuzzyAlpha(on)).toBeLessThanOrEqual(1);
    expect(paintDabFuzzySize(on, 12)).toBeGreaterThanOrEqual(6);
    expect(paintDabFuzzySize(on, 12)).toBeLessThanOrEqual(18);
    const offset = paintDabFuzzyOffset(on, 12);
    expect(Math.abs(offset.x)).toBeLessThanOrEqual(3);
    expect(Math.abs(offset.y)).toBeLessThanOrEqual(3);
  });

  it("paper grain is anchored, smooth and strength-gated", () => {
    expect(paintGrainValue(10, 10, 8, 3)).toBe(paintGrainValue(10, 10, 8, 3));
    expect(paintGrainValue(10, 10, 8, 3)).not.toBe(paintGrainValue(40, 40, 8, 3));
    for (const [x, y] of [[0, 0], [5, 9], [33, 21]] as Array<[number, number]>) {
      const v = paintGrainValue(x, y, 8, 3);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    const off = { fuzzy: 0, seed: 1, dabIndex: 0, grainStrength: 0, grainScale: 8, grainSeed: 1 };
    expect(paintGrainFactor(off, 10, 10)).toBe(1);
    const on = { ...off, grainStrength: 1 };
    expect(paintGrainFactor(on, 10, 10)).toBe(paintGrainValue(10, 10, 8, 1));
  });

  it("grain reduces dab alpha without touching the core logic", () => {    const red = { r: 255, g: 0, b: 0, a: 255 };
    const plain = new Uint8ClampedArray(32 * 32 * 4);
    paintSoftDab(plain, 32, 32, 16, 16, 16, "soft", 1, null, red, 1);
    const grained = new Uint8ClampedArray(32 * 32 * 4);
    const jitter = {
      fuzzy: 0, seed: 11, dabIndex: 0, grainStrength: 1, grainScale: 2, grainSeed: 11,
    };
    paintSoftDab(grained, 32, 32, 16, 16, 16, "soft", 1, null, red, 1, undefined, "normal", jitter);
    const plainAlpha = plain[(16 * 32 + 16) * 4 + 3] ?? 0;
    const grainedAlpha = grained[(16 * 32 + 16) * 4 + 3] ?? 0;
    expect(plainAlpha).toBe(255);
    expect(grainedAlpha).toBeGreaterThan(0);
    expect(grainedAlpha).toBeLessThanOrEqual(255);
    expect(Array.from(grained)).not.toEqual(Array.from(plain));
  });

  it("pressure curves map 0..1 with linear/soft/firm response", () => {
    expect(parsePressureCurve("soft")).toBe("soft");
    expect(parsePressureCurve("firm")).toBe("firm");
    expect(parsePressureCurve("linear")).toBe("linear");
    expect(parsePressureCurve("wobbly")).toBe("linear");
    expect(parsePressureCurve(undefined)).toBe("linear");
    expect(evalPressureCurve("linear", 0.5)).toBeCloseTo(0.5, 9);
    expect(evalPressureCurve("soft", 0.25)).toBeCloseTo(0.5, 9);
    expect(evalPressureCurve("firm", 0.5)).toBeCloseTo(0.25, 9);
    expect(evalPressureCurve("soft", 0)).toBe(0);
    expect(evalPressureCurve("firm", 1)).toBe(1);
    expect(evalPressureCurve("linear", -2)).toBe(0);
    expect(evalPressureCurve("linear", 9)).toBe(1);
    expect(evalPressureCurve("soft", Number.NaN)).toBe(1);
  });

  it("dual tip masks the primary coverage", () => {
    const white = tipOf([255, 255, 255, 255]);
    const black = tipOf([0, 0, 0, 0]);
    expect(applyPaintDualTip(0.8, null, 0, 0)).toBe(0.8);
    expect(applyPaintDualTip(0.8, { tip: white, scale: 1, strength: 1 }, 0, 0)).toBeCloseTo(0.8, 9);
    expect(applyPaintDualTip(0.8, { tip: black, scale: 1, strength: 1 }, 0, 0)).toBe(0);
    expect(applyPaintDualTip(0.8, { tip: black, scale: 1, strength: 0 }, 0, 0)).toBeCloseTo(0.8, 9);
    expect(applyPaintDualTip(0.8, { tip: black, scale: 1, strength: 0.5 }, 0, 0)).toBeCloseTo(0.4, 9);
    expect(clampPaintDualScale(0)).toBe(0.25);
    expect(clampPaintDualScale(9)).toBe(4);
    expect(clampPaintDualScale(Number.NaN)).toBe(DEFAULT_PAINT_DUAL_SCALE);
    expect(clampPaintDualStrength(2)).toBe(1);
    expect(clampPaintDualStrength(-1)).toBe(0);
    expect(clampPaintDualStrength(Number.NaN)).toBe(DEFAULT_PAINT_DUAL_STRENGTH);
  });

  it("dual tip blocks paintSoftDab at full strength", () => {
    const red = { r: 255, g: 0, b: 0, a: 255 };
    const black = tipOf([0, 0, 0, 0]);
    const blocked = new Uint8ClampedArray(16 * 16 * 4);
    paintSoftDab(
      blocked, 16, 16, 8, 8, 12, "soft", 1, null, red, 1,
      undefined, "normal", undefined, { tip: black, scale: 1, strength: 1 },
    );
    expect(Array.from(blocked).every((v) => v === 0)).toBe(true);
  });
});
