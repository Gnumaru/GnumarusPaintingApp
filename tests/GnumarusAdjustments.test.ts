import { describe, expect, it } from "vitest";
import {
  adjustChannel,
  adjustPixel,
  clampAdjustLevels,
  contrastFactor,
  invertPixel,
} from "../src/color/GnumarusAdjustments";

describe("GnumarusAdjustments", () => {
  it("clamps adjustment levels", () => {
    expect(clampAdjustLevels({})).toEqual({ brightness: 0, contrast: 0, posterize: 0 });
    expect(clampAdjustLevels({ brightness: 500, contrast: -500, posterize: 1 })).toEqual({
      brightness: 100,
      contrast: -100,
      posterize: 2,
    });
    expect(clampAdjustLevels({ posterize: 0 })).toMatchObject({ posterize: 0 });
  });

  it("matches the classic contrast curve at the extremes", () => {
    expect(contrastFactor(0)).toBeCloseTo(1, 9);
    expect(contrastFactor(100)).toBeCloseTo((259 * 355) / (255 * 159), 6);
    expect(contrastFactor(-100)).toBeCloseTo((259 * 155) / (255 * 359), 6);
  });

  it("adjusts channels with brightness, contrast and posterize", () => {
    const flat = { brightness: 0, contrast: 0, posterize: 0 };
    expect(adjustChannel(100, flat)).toBe(100);
    expect(adjustChannel(100, { brightness: 100, contrast: 0, posterize: 0 })).toBe(255);
    expect(adjustChannel(100, { brightness: -100, contrast: 0, posterize: 0 })).toBe(0);
    expect(adjustChannel(0, { brightness: 0, contrast: 100, posterize: 0 })).toBe(0);
    expect(adjustChannel(255, { brightness: 0, contrast: 100, posterize: 0 })).toBe(255);
    expect(adjustChannel(100, { brightness: 0, contrast: 0, posterize: 2 })).toBeLessThanOrEqual(255);
    expect([0, 255]).toContain(adjustChannel(100, { brightness: 0, contrast: 0, posterize: 2 }));
    const kept = adjustPixel(10, 20, 30, 40, flat);
    expect(kept).toEqual([10, 20, 30, 40]);
  });

  it("inverts RGB keeping alpha", () => {
    expect(invertPixel(0, 0, 0, 255)).toEqual([255, 255, 255, 255]);
    expect(invertPixel(255, 128, 0, 0)).toEqual([0, 127, 255, 0]);
  });
});
