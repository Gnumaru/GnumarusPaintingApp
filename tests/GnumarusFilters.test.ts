import { describe, expect, it } from "vitest";
import {
  filterRandom,
  getFilterDef,
  GNUMARUS_FILTERS,
  normalizeFilterValues,
  parseFilterHexColor,
  runFilterKernel,
  type GnumarusFilterValues,
} from "../src/canvas/GnumarusFilters";

function solid(width: number, height: number, r: number, g: number, b: number, a = 255): Uint8ClampedArray {
  const buffer = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < buffer.length; i += 4) {
    buffer[i] = r;
    buffer[i + 1] = g;
    buffer[i + 2] = b;
    buffer[i + 3] = a;
  }
  return buffer;
}

function gradient(width: number, height: number): Uint8ClampedArray {
  const buffer = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const at = (y * width + x) * 4;
      buffer[at] = Math.round((x / Math.max(1, width - 1)) * 255);
      buffer[at + 1] = Math.round((y / Math.max(1, height - 1)) * 255);
      buffer[at + 2] = 128;
      buffer[at + 3] = 255;
    }
  }
  return buffer;
}

describe("GnumarusFilters", () => {
  it("registers 28 filters across 6 themes with unique ids", () => {
    expect(GNUMARUS_FILTERS.length).toBe(28);
    const ids = GNUMARUS_FILTERS.map((def) => def.id);
    expect(new Set(ids).size).toBe(ids.length);
    const themes = new Set(GNUMARUS_FILTERS.map((def) => def.theme));
    expect([...themes].sort()).toEqual(["artistic", "blur", "colors", "edge", "enhance", "noise"]);
    for (const def of GNUMARUS_FILTERS) {
      expect(getFilterDef(def.id)).toEqual(def);
      for (const param of def.params) {
        if (param.kind === "enum") {
          expect((param.options ?? []).length).toBeGreaterThan(1);
          expect((param.options ?? []).map((option) => option.value)).toContain(param.def);
        }
        expect(normalizeFilterValues(def, null)[param.key]).toEqual(param.def);
      }
    }
    expect(getFilterDef("nope")).toBeUndefined();
  });

  it("normalizes out-of-range and wrong-typed values to defaults", () => {
    const def = getFilterDef("gaussian-blur");
    expect(def).toBeDefined();
    if (def === undefined) {
      return;
    }
    expect(normalizeFilterValues(def, { radius: 500 })).toEqual({ radius: 50 });
    expect(normalizeFilterValues(def, { radius: "x" } as unknown as GnumarusFilterValues)).toEqual({ radius: 2 });
    const sobel = getFilterDef("sobel");
    expect(sobel && normalizeFilterValues(sobel, { direction: "diagonal" })).toEqual({ direction: "both" });
    const noise = getFilterDef("rgb-noise");
    expect(noise && normalizeFilterValues(noise, { mono: 1 })).toEqual({ amount: 10, mono: false, seed: 1 });
  });

  it("parses hex colors strictly", () => {
    expect(parseFilterHexColor("#ff0000")).toEqual({ r: 255, g: 0, b: 0 });
    expect(parseFilterHexColor("00ff00")).toEqual({ r: 0, g: 255, b: 0 });
    expect(parseFilterHexColor("#fff")).toBeNull();
    expect(parseFilterHexColor("red")).toBeNull();
    expect(parseFilterHexColor(42)).toBeNull();
  });

  it("rejects bad inputs", () => {
    expect(runFilterKernel("nope", solid(2, 2, 1, 2, 3), 2, 2, {})).toBeNull();
    expect(runFilterKernel("invert", solid(2, 2, 1, 2, 3), 0, 2, {})).toBeNull();
    expect(runFilterKernel("invert", solid(2, 2, 1, 2, 3), 3, 3, {})).toBeNull();
  });

  it("inverts rgb and preserves alpha", () => {
    const out = runFilterKernel("invert", solid(2, 1, 10, 20, 30, 40), 2, 1, {});
    expect(out).not.toBeNull();
    expect(Array.from(out ?? [])).toEqual([245, 235, 225, 40, 245, 235, 225, 40]);
  });

  it("posterizes to exact steps", () => {
    const out = runFilterKernel("posterize", solid(1, 1, 100, 150, 200, 255), 1, 1, { levels: 2 });
    expect(out).not.toBeNull();
    // 100/255*1 rounds to 0, 150 and 200 round to 1.
    expect(Array.from((out as Uint8ClampedArray).slice(0, 4))).toEqual([0, 255, 255, 255]);
  });

  it("thresholds on the chosen channel", () => {
    const px = solid(2, 1, 100, 150, 200, 255);
    const lum = runFilterKernel("threshold", px, 2, 1, { threshold: 128, channel: "luminance" });
    expect(lum).not.toBeNull();
    // Luminance of (100,150,200) ~ 141 >= 128 -> white.
    expect(Array.from((lum as Uint8ClampedArray).slice(0, 4))).toEqual([255, 255, 255, 255]);
    const red = runFilterKernel("threshold", px, 2, 1, { threshold: 128, channel: "red" });
    expect(Array.from((red as Uint8ClampedArray).slice(0, 4))).toEqual([0, 0, 0, 255]);
  });

  it("desaturates with every formula", () => {
    const px = solid(1, 1, 100, 150, 200, 77);
    for (const [mode, expected] of [
      ["luminance", Math.round(0.2126 * 100 + 0.7152 * 150 + 0.0722 * 200)],
      ["lightness", Math.round((200 + 100) / 2)],
      ["average", Math.round(450 / 3)],
    ] as Array<[string, number]>) {
      const out = runFilterKernel("desaturate", px, 1, 1, { mode });
      expect(out).not.toBeNull();
      expect(Array.from((out as Uint8ClampedArray).slice(0, 4))).toEqual([expected, expected, expected, 77]);
    }
  });

  it("maps the target color to transparent", () => {
    const px = solid(2, 1, 255, 0, 0, 255);
    const out = runFilterKernel("color-to-alpha", px, 2, 1, { color: "#ff0000", threshold: 0 });
    expect(out).not.toBeNull();
    expect(Array.from((out as Uint8ClampedArray).slice(0, 4))).toEqual([255, 0, 0, 0]);
    const kept = runFilterKernel("color-to-alpha", solid(1, 1, 10, 20, 30, 200), 1, 1, {
      color: "#ff0000",
      threshold: 0,
    });
    const keptPx = kept as Uint8ClampedArray;
    expect(keptPx[3]).toBeGreaterThan(0);
    expect([keptPx[0], keptPx[1], keptPx[2]]).toEqual([10, 20, 30]);
    expect(runFilterKernel("color-to-alpha", solid(1, 1, 0, 0, 0, 255), 1, 1, { color: "nope", threshold: 0 })).not.toBeNull();
  });

  it("blurs toward the local average and keeps flat areas untouched", () => {
    const flat = solid(8, 8, 10, 20, 30, 40);
    for (const id of ["gaussian-blur", "motion-blur", "despeckle", "oilify", "unsharp-mask", "sharpen"]) {
      const out = runFilterKernel(id, flat, 8, 8, {});
      expect(out, id).not.toBeNull();
      expect(Array.from(out as Uint8ClampedArray)).toEqual(Array.from(flat));
    }
  });

  it("pixelizes into flat blocks", () => {
    const out = runFilterKernel("pixelize", gradient(8, 8), 8, 8, { size: 4 });
    expect(out).not.toBeNull();
    const buf = out as Uint8ClampedArray;
    // Top-left block is uniform.
    const first = [buf[0], buf[1], buf[2], buf[3]];
    for (let y = 0; y < 4; y += 1) {
      for (let x = 0; x < 4; x += 1) {
        const at = (y * 8 + x) * 4;
        expect([buf[at], buf[at + 1], buf[at + 2], buf[at + 3]]).toEqual(first);
      }
    }
    // Bottom-right block differs (gradient).
    expect([buf[(7 * 8 + 7) * 4], buf[(7 * 8 + 7) * 4 + 1]]).not.toEqual([first[0], first[1]]);
  });

  it("finds horizontal but not vertical edges directionally", () => {
    // Left half black, right half white: vertical edge in the middle.
    const buffer = new Uint8ClampedArray(8 * 8 * 4);
    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        const at = (y * 8 + x) * 4;
        const v = x < 4 ? 0 : 255;
        buffer[at] = v;
        buffer[at + 1] = v;
        buffer[at + 2] = v;
        buffer[at + 3] = 255;
      }
    }
    const vert = runFilterKernel("sobel", buffer, 8, 8, { direction: "vertical" }) as Uint8ClampedArray;
    const horiz = runFilterKernel("sobel", buffer, 8, 8, { direction: "horizontal" }) as Uint8ClampedArray;
    const edge = (buf: Uint8ClampedArray, x: number, y: number): number => buf[(y * 8 + x) * 4] ?? 0;
    expect(edge(vert, 3, 4)).toBeGreaterThan(0);
    expect(edge(vert, 4, 4)).toBeGreaterThan(0);
    expect(edge(horiz, 3, 4)).toBe(0);
    expect(edge(horiz, 0, 0)).toBe(0);
  });

  it("embosses to mid-gray on flat areas", () => {
    const out = runFilterKernel("emboss", solid(4, 4, 200, 100, 50, 255), 4, 4, { depth: 10, azimuth: 135 });
    expect(out).not.toBeNull();
    expect(Array.from((out as Uint8ClampedArray).slice(0, 4))).toEqual([128, 128, 128, 255]);
  });

  it("adds deterministic seeded noise", () => {
    const flat = solid(4, 4, 100, 100, 100, 255);
    const a = runFilterKernel("rgb-noise", flat, 4, 4, { amount: 50, mono: true, seed: 7 });
    const b = runFilterKernel("rgb-noise", flat, 4, 4, { amount: 50, mono: true, seed: 7 });
    const c = runFilterKernel("rgb-noise", flat, 4, 4, { amount: 50, mono: true, seed: 8 });
    expect(a).not.toBeNull();
    expect(Array.from(a as Uint8ClampedArray)).toEqual(Array.from(b as Uint8ClampedArray));
    expect(Array.from(a as Uint8ClampedArray)).not.toEqual(Array.from(c as Uint8ClampedArray));
    const mono = a as Uint8ClampedArray;
    expect(mono[0]).toBe(mono[1]);
    expect(mono[1]).toBe(mono[2]);
    const color = runFilterKernel("rgb-noise", flat, 4, 4, { amount: 50, mono: false, seed: 7 }) as Uint8ClampedArray;
    expect(color[0] === color[1] && color[1] === color[2]).toBe(false);
  });

  it("produces repeatable random values", () => {
    const a = filterRandom(42);
    const b = filterRandom(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    const v = a();
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
  });

  it("glows edges without touching flat alpha", () => {
    const flat = solid(6, 6, 10, 20, 30, 40);
    const out = runFilterKernel("neon", flat, 6, 6, { radius: 3, amount: 50 });
    expect(out).not.toBeNull();
    expect(Array.from(out as Uint8ClampedArray)).toEqual(Array.from(flat));
  });

  it("balances colors in one range and optionally preserves luminosity", () => {
    const gray = solid(2, 1, 128, 128, 128, 255);
    const identity = runFilterKernel("color-balance", gray, 2, 1, {});
    expect(identity).not.toBeNull();
    expect(Array.from(identity as Uint8ClampedArray)).toEqual(Array.from(gray));
    const shifted = runFilterKernel("color-balance", gray, 2, 1, { range: "midtones", cyanRed: 100, preserve: false });
    expect(shifted).not.toBeNull();
    const px = shifted as Uint8ClampedArray;
    // Mid-gray has full midtone weight: red maxes out, others unchanged.
    expect([px[0], px[1], px[2], px[3]]).toEqual([255, 128, 128, 255]);
    const kept = runFilterKernel("color-balance", gray, 2, 1, { range: "midtones", cyanRed: 20, preserve: true });
    const kp = kept as Uint8ClampedArray;
    const lum = Math.round(0.2126 * kp[0]! + 0.7152 * kp[1]! + 0.0722 * kp[2]!);
    expect(Math.abs(lum - 128)).toBeLessThanOrEqual(2);
    // Shadows-only leaves mid-gray untouched (zero shadow weight there).
    const shadows = runFilterKernel("color-balance", gray, 2, 1, { range: "shadows", cyanRed: 100, preserve: false });
    expect(Array.from((shadows as Uint8ClampedArray).slice(0, 4))).toEqual([128, 128, 128, 255]);
    // ...but moves a dark pixel strongly toward red.
    const dark = runFilterKernel("color-balance", solid(1, 1, 40, 40, 40, 255), 1, 1, {
      range: "shadows",
      cyanRed: 100,
      preserve: false,
    });
    const dp = dark as Uint8ClampedArray;
    expect(dp[0]).toBeGreaterThan(200);
    expect([dp[1], dp[2], dp[3]]).toEqual([40, 40, 255]);
  });

  it("mixes channels with identity by default", () => {
    const px = solid(1, 1, 10, 20, 30, 40);
    const identity = runFilterKernel("channel-mixer", px, 1, 1, {});
    expect(identity).not.toBeNull();
    expect(Array.from(identity as Uint8ClampedArray)).toEqual([10, 20, 30, 40]);
    // Swap red and blue.
    const swapped = runFilterKernel("channel-mixer", px, 1, 1, { rr: 0, bb: 0, rb: 100, br: 100, preserve: false });
    expect(Array.from(swapped as Uint8ClampedArray)).toEqual([30, 20, 10, 40]);
  });

  it("colorizes gray to the chosen hue", () => {
    const out = runFilterKernel("colorize", solid(1, 1, 128, 128, 128, 200), 1, 1, {
      hue: 0,
      saturation: 100,
      lightness: 0,
    });
    expect(out).not.toBeNull();
    expect(Array.from(out as Uint8ClampedArray)).toEqual([255, 1, 1, 200]);
  });

  it("applies sepia by scale", () => {
    const white = solid(1, 1, 255, 255, 255, 255);
    const none = runFilterKernel("sepia", white, 1, 1, { scale: 0 });
    expect(Array.from(none as Uint8ClampedArray)).toEqual([255, 255, 255, 255]);
    const full = runFilterKernel("sepia", white, 1, 1, { scale: 100 });
    expect(Array.from(full as Uint8ClampedArray)).toEqual([255, 255, 239, 255]);
  });

  it("exposes with black point and stops", () => {
    const gray = solid(1, 1, 128, 128, 128, 255);
    const identity = runFilterKernel("exposure", gray, 1, 1, {});
    expect(Array.from(identity as Uint8ClampedArray)).toEqual([128, 128, 128, 255]);
    const pushed = runFilterKernel("exposure", gray, 1, 1, { exposure: 1 });
    expect(Array.from(pushed as Uint8ClampedArray)).toEqual([255, 255, 255, 255]);
    const black = runFilterKernel("exposure", gray, 1, 1, { black: 100 });
    expect(Array.from(black as Uint8ClampedArray)).toEqual([0, 0, 0, 255]);
  });

  it("scales saturation around gray", () => {
    const px = solid(1, 1, 100, 150, 200, 77);
    const flat = runFilterKernel("saturation", px, 1, 1, { scale: 0 });
    const expected = Math.round(0.2126 * 100 + 0.7152 * 150 + 0.0722 * 200);
    expect(Array.from(flat as Uint8ClampedArray)).toEqual([expected, expected, expected, 77]);
    const same = runFilterKernel("saturation", px, 1, 1, { scale: 100 });
    expect(Array.from(same as Uint8ClampedArray)).toEqual([100, 150, 200, 77]);
  });

  it("dodges lighter and burns darker", () => {
    const gray = solid(1, 1, 128, 128, 128, 255);
    const dodge = runFilterKernel("dodge-burn", gray, 1, 1, { mode: "dodge", type: "midtones", exposure: 100 });
    expect((dodge as Uint8ClampedArray)[0]).toBeGreaterThan(128);
    const burn = runFilterKernel("dodge-burn", gray, 1, 1, { mode: "burn", type: "midtones", exposure: 100 });
    expect((burn as Uint8ClampedArray)[0]).toBeLessThan(128);
  });

  it("stretches contrast to the full range", () => {
    const buffer = new Uint8ClampedArray([50, 50, 50, 255, 200, 200, 200, 255]);
    const out = runFilterKernel("auto-contrast", buffer, 2, 1, {});
    expect(out).not.toBeNull();
    expect(Array.from(out as Uint8ClampedArray)).toEqual([0, 0, 0, 255, 255, 255, 255, 255]);
    const flat = solid(2, 2, 42, 42, 42, 9);
    const same = runFilterKernel("auto-contrast", flat, 2, 2, {});
    expect(Array.from(same as Uint8ClampedArray)).toEqual(Array.from(flat));
  });

  it("leaves flat areas alone in cartoon", () => {
    const flat = solid(6, 6, 10, 20, 30, 40);
    const out = runFilterKernel("cartoon", flat, 6, 6, {});
    expect(out).not.toBeNull();
    expect(Array.from(out as Uint8ClampedArray)).toEqual(Array.from(flat));
  });

  it("finds nothing on flat laplace input", () => {
    const flat = solid(4, 4, 90, 90, 90, 255);
    const out = runFilterKernel("laplace", flat, 4, 4, {});
    expect(out).not.toBeNull();
    expect(Array.from(out as Uint8ClampedArray)).toEqual(Array.from(solid(4, 4, 0, 0, 0, 255)));
  });

  it("centers flat difference-of-gaussians on mid-gray", () => {
    const flat = solid(8, 8, 90, 90, 90, 255);
    const out = runFilterKernel("difference-of-gaussians", flat, 8, 8, {});
    expect(out).not.toBeNull();
    expect(Array.from((out as Uint8ClampedArray).slice(0, 4))).toEqual([128, 128, 128, 255]);
  });

  it("hurls deterministically and spares untouched pixels", () => {
    const flat = solid(4, 4, 100, 100, 100, 255);
    const none = runFilterKernel("hurl", flat, 4, 4, { amount: 0 });
    expect(Array.from(none as Uint8ClampedArray)).toEqual(Array.from(flat));
    const a = runFilterKernel("hurl", flat, 4, 4, { amount: 50, seed: 7 });
    const b = runFilterKernel("hurl", flat, 4, 4, { amount: 50, seed: 7 });
    const c = runFilterKernel("hurl", flat, 4, 4, { amount: 50, seed: 8 });
    expect(Array.from(a as Uint8ClampedArray)).toEqual(Array.from(b as Uint8ClampedArray));
    expect(Array.from(a as Uint8ClampedArray)).not.toEqual(Array.from(c as Uint8ClampedArray));
    const near = runFilterKernel("hurl", flat, 4, 4, { amount: 50, mode: "neighbor", seed: 7 });
    expect(near).not.toBeNull();
  });
});
