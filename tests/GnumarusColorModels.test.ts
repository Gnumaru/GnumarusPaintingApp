import { describe, expect, it } from "vitest";
import { parseHexColor } from "../src/canvas/GnumarusPixelBuffer";
import {
  ardToRgb01,
  cmykToRgb01,
  getColorModelDef,
  hslToRgb01,
  hsvToRgb01,
  hsvToRgbBytes,
  hsvWheelHue,
  isColorModelId,
  linearSrgbToOkhsl,
  linearSrgbToOkhsv,
  modelAlphaFromValues,
  modelAxesToRgbBytes,
  modelAxisGradientCss,
  normalizeModelValues,
  okhslToLinearSrgb,
  okhsvToLinearSrgb,
  parseAxisInput,
  parseHexToRgbaBytes,
  rgb01ToArd,
  rgb01ToCmyk,
  rgb01ToHsl,
  rgb01ToHsv,
  rgbBytesToHsv,
  rgbBytesToModelAxes,
  rgbaBytesToHex,
  srgbByteToLinear,
  trianglePointToSv,
} from "../src/color/GnumarusColorModels";

function expectBytesClose(actual: { r: number; g: number; b: number }, expected: { r: number; g: number; b: number }, tolerance = 2): void {
  expect(Math.abs(actual.r - expected.r)).toBeLessThanOrEqual(tolerance);
  expect(Math.abs(actual.g - expected.g)).toBeLessThanOrEqual(tolerance);
  expect(Math.abs(actual.b - expected.b)).toBeLessThanOrEqual(tolerance);
}

describe("GnumarusColorModels hex", () => {
  it("parses 8-digit hex with alpha", () => {
    expect(parseHexColor("#ff000080")).toEqual({ r: 255, g: 0, b: 0, a: 128 });
    expect(parseHexColor("#00FF00FF")).toEqual({ r: 0, g: 255, b: 0, a: 255 });
    expect(parseHexColor("#ff0000")).toEqual({ r: 255, g: 0, b: 0, a: 255 });
    expect(parseHexColor("#gggggg")).toBeNull();
  });

  it("round-trips rgba hex", () => {
    expect(parseHexToRgbaBytes("#ff0000")).toEqual({ r: 255, g: 0, b: 0, a: 255 });
    expect(parseHexToRgbaBytes("#f00")).toEqual({ r: 255, g: 0, b: 0, a: 255 });
    expect(parseHexToRgbaBytes("#ff000080")).toEqual({ r: 255, g: 0, b: 0, a: 128 });
    expect(parseHexToRgbaBytes("red")).toBeNull();
    expect(rgbaBytesToHex({ r: 255, g: 0, b: 0, a: 255 })).toBe("#ff0000");
    expect(rgbaBytesToHex({ r: 255, g: 0, b: 0, a: 128 })).toBe("#ff000080");
  });
});

describe("GnumarusColorModels axes", () => {
  it("exposes all seven models with axes", () => {
    expect(isColorModelId("rgb")).toBe(true);
    expect(isColorModelId("ard")).toBe(true);
    expect(isColorModelId("xyz")).toBe(false);
    expect(getColorModelDef("hsv").axes.map((axis) => axis.key)).toEqual(["h", "s", "v", "a"]);
    expect(getColorModelDef("rgb").axes).toHaveLength(4);
    for (const def of [getColorModelDef("cmyk"), getColorModelDef("hsv"), getColorModelDef("hsl"), getColorModelDef("okhsl"), getColorModelDef("okhsv"), getColorModelDef("ard")]) {
      expect(def.axes.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("parses axis inputs with clamping", () => {
    const percent = getColorModelDef("hsv").axes[1]!;
    expect(parseAxisInput("62.54", percent)).toBeCloseTo(62.5, 5);
    expect(parseAxisInput("150", percent)).toBe(100);
    expect(parseAxisInput("abc", percent)).toBeNull();
    const hue = getColorModelDef("hsv").axes[0]!;
    expect(parseAxisInput("370", hue)).toBeCloseTo(10, 5);
    const byte = getColorModelDef("rgb").axes[0]!;
    expect(parseAxisInput("300", byte)).toBe(255);
    expect(parseAxisInput("12.7", byte)).toBe(13);
  });
});

describe("GnumarusColorModels rgb/cmyk/hsv/hsl", () => {
  it("converts primaries in hsv and hsl", () => {
    expect(rgb01ToHsv(1, 0, 0)).toMatchObject({ h: 0, s: 1, v: 1 });
    expect(rgb01ToHsl(1, 0, 0)).toMatchObject({ h: 0, s: 1, l: 0.5 });
    expect(hsvToRgb01(120, 1, 1)).toMatchObject({ r: 0, g: 1, b: 0 });
    expect(hslToRgb01(240, 1, 0.5)).toMatchObject({ r: 0, g: 0, b: 1 });
  });

  it("converts cmyk anchors", () => {
    expect(rgb01ToCmyk(1, 0, 0)).toMatchObject({ c: 0, m: 1, y: 1, k: 0 });
    expect(rgb01ToCmyk(0, 0, 0)).toMatchObject({ k: 1 });
    expect(cmykToRgb01(0, 1, 1, 0)).toMatchObject({ r: 1, g: 0, b: 0 });
  });

  it("round-trips rgb through hsv/hsl/cmyk", () => {
    const samples: Array<[number, number, number]> = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
      [1, 1, 0],
      [0.25, 0.5, 0.75],
      [0.2, 0.2, 0.2],
    ];
    for (const [r, g, b] of samples) {
      const hsv = rgb01ToHsv(r, g, b);
      expectBytesClose(hsvToRgb01(hsv.h, hsv.s, hsv.v), { r, g, b }, 0.01);
      const hsl = rgb01ToHsl(r, g, b);
      expectBytesClose(hslToRgb01(hsl.h, hsl.s, hsl.l), { r, g, b }, 0.01);
      const cmyk = rgb01ToCmyk(r, g, b);
      expectBytesClose(cmykToRgb01(cmyk.c, cmyk.m, cmyk.y, cmyk.k), { r, g, b }, 0.01);
    }
  });
});

describe("GnumarusColorModels okhsl/okhsv", () => {
  it("maps black and white correctly", () => {
    expect(linearSrgbToOkhsl(0, 0, 0)).toMatchObject({ h: 0, s: 0, l: 0 });
    const whiteHsl = linearSrgbToOkhsl(1, 1, 1);
    expect(whiteHsl.s).toBe(0);
    expect(whiteHsl.l).toBeCloseTo(1, 5);
    expect(linearSrgbToOkhsv(0, 0, 0)).toMatchObject({ h: 0, s: 0, v: 0 });
    const whiteHsv = linearSrgbToOkhsv(1, 1, 1);
    expect(whiteHsv.s).toBe(0);
    expect(whiteHsv.v).toBeCloseTo(1, 5);
    expect(okhslToLinearSrgb(0, 0, 0)).toMatchObject({ r: 0, g: 0, b: 0 });
    expect(okhslToLinearSrgb(0, 0, 1)).toMatchObject({ r: 1, g: 1, b: 1 });
    expect(okhsvToLinearSrgb(0, 0, 0)).toMatchObject({ r: 0, g: 0, b: 0 });
    expect(okhsvToLinearSrgb(0, 0, 1)).toMatchObject({ r: 1, g: 1, b: 1 });
  });

  it("matches the red anchor in oklab-derived hue", () => {
    const red = linearSrgbToOkhsl(1, 0, 0);
    expect(red.h).toBeGreaterThan(20);
    expect(red.h).toBeLessThan(40);
    expect(red.s).toBeGreaterThan(0.5);
    const back = okhslToLinearSrgb(red.h, red.s, red.l);
    expect(back.r).toBeCloseTo(1, 2);
    expect(back.g).toBeCloseTo(0, 2);
    expect(back.b).toBeCloseTo(0, 2);
  });

  it("round-trips srgb bytes through okhsl and okhsv", () => {
    const bytes: Array<[number, number, number]> = [
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255],
      [255, 255, 0],
      [0, 255, 255],
      [255, 0, 255],
      [128, 64, 32],
      [18, 52, 86],
      [200, 200, 200],
    ];
    for (const [r, g, b] of bytes) {
      const lin = { r: srgbByteToLinear(r), g: srgbByteToLinear(g), b: srgbByteToLinear(b) };
      const hsl = linearSrgbToOkhsl(lin.r, lin.g, lin.b);
      const backHsl = okhslToLinearSrgb(hsl.h, hsl.s, hsl.l);
      expect(backHsl.r).toBeCloseTo(lin.r, 2);
      expect(backHsl.g).toBeCloseTo(lin.g, 2);
      expect(backHsl.b).toBeCloseTo(lin.b, 2);
      const hsv = linearSrgbToOkhsv(lin.r, lin.g, lin.b);
      const backHsv = okhsvToLinearSrgb(hsv.h, hsv.s, hsv.v);
      expect(backHsv.r).toBeCloseTo(lin.r, 2);
      expect(backHsv.g).toBeCloseTo(lin.g, 2);
      expect(backHsv.b).toBeCloseTo(lin.b, 2);
      const axes = rgbBytesToModelAxes({ r, g, b, a: 255 }, "okhsl");
      const round = modelAxesToRgbBytes("okhsl", axes);
      expectBytesClose(round, { r, g, b }, 1);
      const axesV = rgbBytesToModelAxes({ r, g, b, a: 255 }, "okhsv");
      const roundV = modelAxesToRgbBytes("okhsv", axesV);
      expectBytesClose(roundV, { r, g, b }, 1);
    }
  });
});

describe("GnumarusColorModels ard", () => {
  it("maps grays to zero ratio with diagonal lightness", () => {
    expect(rgb01ToArd(0, 0, 0)).toMatchObject({ a: 0, r: 0, d: 0 });
    const mid = rgb01ToArd(0.5, 0.5, 0.5);
    expect(mid.r).toBeCloseTo(0, 5);
    expect(mid.d).toBeCloseTo(0.5, 5);
    const white = rgb01ToArd(1, 1, 1);
    expect(white.r).toBeCloseTo(0, 5);
    expect(white.d).toBeCloseTo(1, 5);
  });

  it("puts primaries on the gamut edge", () => {
    for (const [r, g, b] of [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 0], [1, 0, 1], [0, 1, 1]] as Array<[number, number, number]>) {
      const ard = rgb01ToArd(r, g, b);
      expect(ard.r).toBeCloseTo(1, 2);
    }
  });

  it("round-trips rgb through ard", () => {
    const samples: Array<[number, number, number]> = [
      [1, 0, 0],
      [0.25, 0.5, 0.75],
      [0.9, 0.1, 0.4],
      [0.5, 0.5, 0.5],
      [0, 0, 0],
      [1, 1, 1],
    ];
    for (const [r, g, b] of samples) {
      const ard = rgb01ToArd(r, g, b);
      const back = ardToRgb01(ard.a, ard.r, ard.d);
      expect(back.r).toBeCloseTo(r, 2);
      expect(back.g).toBeCloseTo(g, 2);
      expect(back.b).toBeCloseTo(b, 2);
    }
  });
});

describe("GnumarusColorModels gradients", () => {
  it("builds hue gradients that start and end at red", () => {
    const css = modelAxisGradientCss("hsl", 0, [0, 100, 50, 255]);
    expect(css.startsWith("linear-gradient(to right, ")).toBe(true);
    expect(css).toContain("rgb(255, 0, 0) 0%");
    expect(css).toContain("100%");
    const stops = css.split("rgb(").length - 1;
    expect(stops).toBeGreaterThanOrEqual(5);
  });

  it("builds alpha gradients with fading opacity", () => {
    const css = modelAxisGradientCss("hsv", 3, [0, 100, 100, 255]);
    expect(css.startsWith("linear-gradient(to right, ")).toBe(true);
    expect(css).toContain("rgba(255, 0, 0, 0) 0%");
    expect(css).toContain("rgba(255, 0, 0, 1) 100%");
  });

  it("normalizes model values to axis precision", () => {
    expect(normalizeModelValues("hsv", [370, 62.54, 50, 300])).toEqual([10, 62.5, 50, 255]);
    expect(normalizeModelValues("rgb", [300, -5, 12.7, 255])).toEqual([255, 0, 13, 255]);
    expect(normalizeModelValues("ard", [370, 300, 400.04, -5])).toEqual([10, 255, 360, 0]);
  });
});

describe("GnumarusColorModels alpha axes", () => {
  it("exposes an alpha axis on every model", () => {
    for (const def of [
      getColorModelDef("rgb"),
      getColorModelDef("cmyk"),
      getColorModelDef("hsv"),
      getColorModelDef("hsl"),
      getColorModelDef("okhsl"),
      getColorModelDef("okhsv"),
      getColorModelDef("ard"),
    ]) {
      expect(def.axes[def.axes.length - 1]).toMatchObject({ label: "Alpha", min: 0, max: 255 });
    }
  });

  it("round-trips alpha through every model", () => {
    const models = ["rgb", "cmyk", "hsv", "hsl", "okhsl", "okhsv", "ard"] as const;
    for (const model of models) {
      const axes = rgbBytesToModelAxes({ r: 10, g: 20, b: 30, a: 128 }, model);
      expect(modelAlphaFromValues(model, axes, 255)).toBe(128);
      expect(modelAlphaFromValues(model, [], 255)).toBe(255);
    }
  });

  it("uses the new ard display ranges", () => {
    expect(rgbBytesToModelAxes({ r: 255, g: 0, b: 0, a: 255 }, "ard")).toEqual([expect.any(Number), 255, 120, 255]);
    expect(rgbBytesToModelAxes({ r: 0, g: 0, b: 0, a: 255 }, "ard")).toEqual([0, 0, 0, 255]);
    expect(rgbBytesToModelAxes({ r: 255, g: 255, b: 255, a: 255 }, "ard")).toEqual([0, 0, 360, 255]);
    const round = modelAxesToRgbBytes("ard", [30, 255, 120, 255]);
    expect(round).toMatchObject({ r: 255, g: 0, b: 0 });
  });
});

describe("GnumarusColorModels hsv triangle and wheel", () => {
  it("converts hsv bytes at the triangle corners", () => {
    expect(hsvToRgbBytes(0, 1, 1)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
    expect(hsvToRgbBytes(120, 1, 1)).toEqual({ r: 0, g: 255, b: 0, a: 255 });
    expect(hsvToRgbBytes(0, 0, 1)).toEqual({ r: 255, g: 255, b: 255, a: 255 });
    expect(hsvToRgbBytes(200, 0.5, 0)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
    expect(hsvToRgbBytes(90, 0.75, 0.75)).toEqual({ r: 120, g: 191, b: 48, a: 255 });
  });

  it("reads hsv fractions back from bytes", () => {
    expect(rgbBytesToHsv({ r: 255, g: 0, b: 0, a: 255 })).toMatchObject({ h: 0, s: 1, v: 1 });
    expect(rgbBytesToHsv({ r: 255, g: 255, b: 255, a: 255 })).toMatchObject({ s: 0, v: 1 });
    expect(rgbBytesToHsv({ r: 0, g: 0, b: 0, a: 255 })).toMatchObject({ s: 0, v: 0 });
  });

  it("maps triangle points to saturation and value with clamping", () => {
    expect(trianglePointToSv(0, 0, 0, 0, 100, 84)).toEqual({ s: 0, v: 1 });
    expect(trianglePointToSv(100, 0, 0, 0, 100, 84)).toEqual({ s: 1, v: 1 });
    expect(trianglePointToSv(50, 84, 0, 0, 100, 84)).toEqual({ s: 0.5, v: 0 });
    expect(trianglePointToSv(75, 21, 0, 0, 100, 84)).toEqual({ s: 0.75, v: 0.75 });
    expect(trianglePointToSv(-10, 200, 0, 0, 100, 84)).toEqual({ s: 0, v: 0 });
    expect(trianglePointToSv(0, 0, 0, 0, 0, 0)).toEqual({ s: 0, v: 1 });
  });

  it("maps ring offsets to hue with zero at the top, clockwise", () => {
    expect(hsvWheelHue(0, -1)).toBeCloseTo(0, 5);
    expect(hsvWheelHue(1, 0)).toBeCloseTo(90, 5);
    expect(hsvWheelHue(0, 1)).toBeCloseTo(180, 5);
    expect(hsvWheelHue(-1, 0)).toBeCloseTo(270, 5);
    expect(hsvWheelHue(0, 0)).toBe(0);
    expect(hsvWheelHue(Number.NaN, 0)).toBe(0);
  });
});
