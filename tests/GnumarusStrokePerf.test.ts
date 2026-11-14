import { describe, expect, it } from "vitest";
import {
  applyCoverageMask,
  createPixelBuffer,
  drawLineSegment,
  stampSegmentCoverage,
} from "../src/canvas/GnumarusPixelBuffer";
import {
  softCoverageLut,
  softLutCoverage,
  softTipCoverage,
  strokeDabPositions,
} from "../src/canvas/GnumarusPaintBrush";

/**
 * Large-brush stroke performance (1920x1080, 512px hard tip).
 * Ideas borrowed from Krita (distance-based dab spacing, dab cache,
 * dirty-rect compositing) and reimplemented here; these tests pin the
 * behavior: fast, solid, curved strokes keep their shape.
 */
describe("large brush stroke", () => {
  const W = 1920;
  const H = 1080;
  const black = { r: 0, g: 0, b: 0, a: 255 };
  const unlocked = { r: false, g: false, b: false, a: false };

  it("paints a 512px straight stroke quickly and solid", () => {
    const buf = createPixelBuffer(W, H);
    const t0 = performance.now();
    drawLineSegment(buf, W, H, 500, 400, 700, 420, 512, "circle", false, black, unlocked, "normal", "off", 2048);
    const elapsed = performance.now() - t0;
    // Old per-pixel stamping needed ~1500ms here; spaced dabs need ~50ms.
    expect(elapsed).toBeLessThan(1000);
    const alphaAt = (x: number, y: number): number => buf[(y * W + x) * 4 + 3] ?? 0;
    // Endpoints and the middle of the segment are fully covered.
    expect(alphaAt(500, 400)).toBe(255);
    expect(alphaAt(700, 420)).toBe(255);
    expect(alphaAt(600, 410)).toBe(255);
    // Well inside the 512px disk the stroke is solid across its width.
    expect(alphaAt(600, 300)).toBe(255);
    expect(alphaAt(600, 520)).toBe(255);
  });

  it("keeps intermediate curve points instead of collapsing to endpoints", () => {
    const buf = createPixelBuffer(W, H);
    // A "C" polyline through B: with coalesced events dropped only A->C
    // would paint and B would stay empty; walking every sub-segment paints B.
    drawLineSegment(buf, W, H, 800, 300, 600, 400, 128, "circle", false, black, unlocked, "normal", "off", 2048);
    drawLineSegment(buf, W, H, 600, 400, 800, 500, 128, "circle", false, black, unlocked, "normal", "off", 2048);
    const alphaAt = (x: number, y: number): number => buf[(y * W + x) * 4 + 3] ?? 0;
    expect(alphaAt(600, 400)).toBe(255);
    expect(alphaAt(800, 300)).toBe(255);
    expect(alphaAt(800, 500)).toBe(255);
  });

  it("emits few spaced dabs for a large tip instead of per-pixel stamps", () => {
    const { positions } = strokeDabPositions(500, 400, 700, 420, 512, 0.15, 0, true);
    // 201 Bresenham steps collapse to a handful of spaced dabs.
    expect(positions.length).toBeGreaterThan(0);
    expect(positions.length).toBeLessThanOrEqual(6);
  });

  it("small tips keep dense legacy stamping (solid thin lines)", () => {
    const buf = createPixelBuffer(8, 8);
    drawLineSegment(buf, 8, 8, 0, 3, 7, 3, 3, "square", false, { r: 255, g: 0, b: 0, a: 255 });
    for (let x = 0; x < 8; x += 1) {
      expect(buf[(3 * 8 + x) * 4 + 3] ?? 0).toBe(255);
    }
  });

  it("dirty-rect mask apply matches the full-layer apply", () => {
    const mask = new Uint8Array(W * H);
    stampSegmentCoverage(mask, W, H, 500, 400, 700, 420, 512, "circle", false, "off", 2048);
    const full = createPixelBuffer(W, H);
    applyCoverageMask(full, mask, W, H, black, "normal", unlocked);
    const partial = createPixelBuffer(W, H);
    applyCoverageMask(partial, mask, W, H, black, "normal", unlocked, {
      left: 200,
      top: 100,
      width: 800,
      height: 800,
    });
    expect(Array.from(partial)).toEqual(Array.from(full));
  });

  it("soft LUT matches the cosine falloff", () => {
    for (const hardness of [0, 0.25, 0.5, 0.75]) {
      const lut = softCoverageLut(hardness);
      for (let i = 0; i < 20; i += 1) {
        const r = i / 20;
        const u = r / Math.SQRT2;
        const v = r / Math.SQRT2;
        expect(Math.abs(softLutCoverage(lut, r) - softTipCoverage(u, v, hardness))).toBeLessThan(0.02);
      }
    }
    // Hardness 1 is a hard disk: fully covered inside, empty at the rim.
    const hard = softCoverageLut(1);
    expect(softLutCoverage(hard, 0)).toBe(1);
    expect(softLutCoverage(hard, 0.5)).toBe(1);
    expect(softLutCoverage(hard, 1)).toBe(0);
    expect(softLutCoverage(hard, 1.5)).toBe(0);
  });
});
