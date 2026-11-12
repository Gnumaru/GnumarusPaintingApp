import { describe, expect, it } from "vitest";
import {
  blurAverageColor,
  jumbleOffset,
  parseBlurMode,
  parseShadeMode,
  recolorTowardPaint,
  shadePixelColor,
  sharpenAround,
} from "../src/retouch/GnumarusRetouch";

describe("GnumarusRetouch", () => {
  it("parses modes with safe defaults", () => {
    expect(parseShadeMode("darken")).toBe("darken");
    expect(parseShadeMode("hue")).toBe("hue");
    expect(parseShadeMode("nope")).toBe("lighten");
    expect(parseBlurMode("sharpen")).toBe("sharpen");
    expect(parseBlurMode(undefined)).toBe("blur");
  });

  it("lightens toward white and darkens toward black", () => {
    const gray = { r: 100, g: 100, b: 100, a: 200 };
    const paint = { r: 0, g: 0, b: 0, a: 255 };
    expect(shadePixelColor(gray, paint, "lighten", 1)).toEqual({ r: 255, g: 255, b: 255, a: 200 });
    expect(shadePixelColor(gray, paint, "darken", 1)).toEqual({ r: 0, g: 0, b: 0, a: 200 });
    expect(shadePixelColor(gray, paint, "lighten", 0)).toEqual(gray);
    const half = shadePixelColor(gray, paint, "lighten", 0.5);
    expect(half.r).toBeGreaterThan(gray.r);
    expect(half.r).toBeLessThan(255);
  });

  it("rotates hue toward the paint color", () => {
    const blue = { r: 0, g: 0, b: 255, a: 255 };
    const red = { r: 255, g: 0, b: 0, a: 255 };
    const moved = shadePixelColor(blue, red, "hue", 1);
    expect(moved.r).toBeGreaterThan(moved.b);
    expect(shadePixelColor(blue, red, "hue", 0)).toEqual(blue);
  });

  it("averages neighborhoods and sharpens away from the average", () => {
    const buffer = new Uint8ClampedArray([
      0, 0, 0, 255, 100, 100, 100, 255, 0, 0, 0, 255,
      100, 100, 100, 255, 200, 200, 200, 255, 100, 100, 100, 255,
      0, 0, 0, 255, 100, 100, 100, 255, 0, 0, 0, 255,
    ]);
    const avg = blurAverageColor(buffer, 3, 3, 1, 1, 1);
    expect(avg).not.toBeNull();
    expect(avg?.r ?? 0).toBeGreaterThan(0);
    expect(avg?.r ?? 0).toBeLessThan(200);
    expect(blurAverageColor(buffer, 3, 3, 9, 9, 1)).toBeNull();
    const sharpened = sharpenAround(
      { r: 200, g: 200, b: 200, a: 255 },
      { r: 100, g: 100, b: 100, a: 255 },
      1,
    );
    expect(sharpened.r).toBe(255);
    expect(sharpenAround({ r: 200, g: 200, b: 200, a: 255 }, { r: 100, g: 100, b: 100, a: 255 }, 0).r).toBe(200);
  });

  it("recolors only within tolerance, keeping luminosity", () => {
    const nearBlue = { r: 20, g: 20, b: 230, a: 255 };
    const red = { r: 255, g: 0, b: 0, a: 255 };
    const far = { r: 0, g: 255, b: 0, a: 255 };
    const repainted = recolorTowardPaint(nearBlue, red, 1);
    expect(repainted).not.toBeNull();
    expect(repainted?.r ?? 0).toBeGreaterThan(repainted?.b ?? 0);
    expect(recolorTowardPaint(far, red, 0.2)).toBeNull();
  });

  it("jumbles inside the disc deterministically", () => {
    expect(jumbleOffset(5, 0, 1)).toEqual({ dx: 5, dy: 0 });
    const offset = jumbleOffset(5, 0.25, 1);
    expect(Math.hypot(offset.dx, offset.dy)).toBeLessThanOrEqual(5 + 1);
    expect(jumbleOffset(0, 0.5, 0.5).dx + 0).toBe(0);
    expect(jumbleOffset(0, 0.5, 0.5).dy).toBe(0);
  });
});
