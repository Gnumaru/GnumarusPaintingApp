import { describe, expect, it } from "vitest";
import {
  adjustChannel,
  adjustPixel,
  adjustPixelHsl,
  clampAdjustLevels,
  clampHslAdjustLevels,
  contrastFactor,
  invertPixel,
  parseHslAdjustMode,
  parseHslAdjustModel,
} from "../src/color/GnumarusAdjustments";
import { hslToRgb01, rgb01ToHsl } from "../src/color/GnumarusColorModels";

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

  it("clamps HSL levels and parses model/mode", () => {
    expect(clampHslAdjustLevels({})).toEqual({ hue: 0, saturation: 0, lightness: 0, alpha: 0 });
    expect(clampHslAdjustLevels({ hue: 500, saturation: -500, lightness: 12.6, alpha: Number.NaN })).toEqual({
      hue: 180,
      saturation: -100,
      lightness: 13,
      alpha: 0,
    });
    expect(clampHslAdjustLevels({ hue: -500 })).toMatchObject({ hue: -180 });
    expect(parseHslAdjustModel("okhsl")).toBe("okhsl");
    expect(parseHslAdjustModel("hsl")).toBe("hsl");
    expect(parseHslAdjustModel("nope")).toBe("hsl");
    expect(parseHslAdjustModel(undefined)).toBe("hsl");
    expect(parseHslAdjustMode("proportional")).toBe("proportional");
    expect(parseHslAdjustMode("additive")).toBe("additive");
    expect(parseHslAdjustMode("nope")).toBe("additive");
  });

  it("keeps zero HSL offsets as identity in both models and modes", () => {
    const zero = { hue: 0, saturation: 0, lightness: 0, alpha: 0 };
    for (const model of ["hsl", "okhsl"] as const) {
      for (const mode of ["additive", "proportional"] as const) {
        expect(adjustPixelHsl(255, 0, 0, 255, zero, model, mode)).toEqual([255, 0, 0, 255]);
        expect(adjustPixelHsl(10, 200, 90, 37, zero, model, mode)).toEqual([10, 200, 90, 37]);
      }
    }
  });

  it("adds absolute HSL offsets in additive mode", () => {
    // Gray 128 has classic lightness ~50.2; +14 points lands near 64.
    const out = adjustPixelHsl(128, 128, 128, 255, { hue: 0, saturation: 0, lightness: 14, alpha: 0 }, "hsl", "additive");
    expect(out[0]).toBe(out[1]);
    expect(out[1]).toBe(out[2]);
    const after = rgb01ToHsl(out[0] / 255, out[1] / 255, out[2] / 255);
    expect(after.l * 100).toBeCloseTo(64.2, 0);
    // Hue sums in degrees with wrap: red (h=0) + 200 lands at 200, -10 at 350.
    const plus = adjustPixelHsl(255, 0, 0, 255, { hue: 200, saturation: 0, lightness: 0, alpha: 0 }, "hsl", "additive");
    const plusHsl = rgb01ToHsl(plus[0] / 255, plus[1] / 255, plus[2] / 255);
    expect(plusHsl.h).toBeCloseTo(200, 0);
    const minus = adjustPixelHsl(255, 0, 0, 255, { hue: -10, saturation: 0, lightness: 0, alpha: 0 }, "hsl", "additive");
    const minusHsl = rgb01ToHsl(minus[0] / 255, minus[1] / 255, minus[2] / 255);
    expect(minusHsl.h).toBeCloseTo(350, 0);
    // Alpha sums in absolute 0..255 units with clamping.
    expect(adjustPixelHsl(10, 20, 30, 100, { hue: 0, saturation: 0, lightness: 0, alpha: 14 }, "hsl", "additive")).toEqual([
      10, 20, 30, 114,
    ]);
    expect(adjustPixelHsl(10, 20, 30, 250, { hue: 0, saturation: 0, lightness: 0, alpha: 14 }, "hsl", "additive")[3]).toBe(255);
    expect(adjustPixelHsl(10, 20, 30, 5, { hue: 0, saturation: 0, lightness: 0, alpha: -14 }, "hsl", "additive")[3]).toBe(0);
  });

  it("scales offsets as percent-of-value in proportional mode", () => {
    // L=20% + 10% lands at 22%: build the color straight from HSL space.
    const rgb = hslToRgb01(200, 0.5, 0.2);
    const bytes = [Math.round(rgb.r * 255), Math.round(rgb.g * 255), Math.round(rgb.b * 255)] as const;
    const out = adjustPixelHsl(bytes[0], bytes[1], bytes[2], 255, { hue: 0, saturation: 0, lightness: 10, alpha: 0 }, "hsl", "proportional");
    const after = rgb01ToHsl(out[0] / 255, out[1] / 255, out[2] / 255);
    expect(after.l).toBeCloseTo(0.22, 1);
    // Zeros never move in proportional mode (black stays black, gray keeps no saturation).
    expect(adjustPixelHsl(0, 0, 0, 255, { hue: 50, saturation: 50, lightness: 50, alpha: 0 }, "hsl", "proportional")).toEqual([
      0, 0, 0, 255,
    ]);
    const gray = adjustPixelHsl(128, 128, 128, 255, { hue: 0, saturation: 50, lightness: 0, alpha: 0 }, "hsl", "proportional");
    expect(gray[0]).toBe(gray[1]);
    expect(gray[1]).toBe(gray[2]);
    // Alpha scales too, and zero alpha stays zero.
    expect(adjustPixelHsl(10, 20, 30, 200, { hue: 0, saturation: 0, lightness: 0, alpha: 10 }, "hsl", "proportional")[3]).toBe(220);
    expect(adjustPixelHsl(10, 20, 30, 0, { hue: 0, saturation: 0, lightness: 0, alpha: 10 }, "hsl", "proportional")[3]).toBe(0);
  });

  it("applies hue shifts without tinting achromatic pixels", () => {
    const gray = adjustPixelHsl(128, 128, 128, 255, { hue: 90, saturation: 0, lightness: 0, alpha: 0 }, "hsl", "additive");
    expect(gray[0]).toBe(gray[1]);
    expect(gray[1]).toBe(gray[2]);
  });

  it("renders OKHSL and traditional HSL differently for saturated colors", () => {
    const levels = { hue: 0, saturation: 0, lightness: 10, alpha: 0 };
    const classic = adjustPixelHsl(255, 0, 0, 255, levels, "hsl", "additive");
    const perceptual = adjustPixelHsl(255, 0, 0, 255, levels, "okhsl", "additive");
    expect(classic).not.toEqual(perceptual);
    for (const channel of [...classic, ...perceptual]) {
      expect(channel).toBeGreaterThanOrEqual(0);
      expect(channel).toBeLessThanOrEqual(255);
    }
  });
});
