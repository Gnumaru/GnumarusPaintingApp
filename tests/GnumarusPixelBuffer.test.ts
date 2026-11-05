import { describe, expect, it } from "vitest";
import {
  clearPixelBuffer,
  compositeOver,
  createPixelBuffer,
  drawPixelLine,
  getPixel,
  parseHexColor,
  setPixel,
} from "../src/canvas/GnumarusPixelBuffer";

describe("GnumarusPixelBuffer", () => {
  it("creates a transparent buffer", () => {
    const buffer = createPixelBuffer(4, 4);
    expect(buffer.length).toBe(64);
    expect(getPixel(buffer, 4, 4, 0, 0)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  });

  it("sets and reads a solid pixel", () => {
    const buffer = createPixelBuffer(4, 4);
    const ok = setPixel(buffer, 4, 4, 2, 1, { r: 255, g: 0, b: 0, a: 255 });
    expect(ok).toBe(true);
    expect(getPixel(buffer, 4, 4, 2, 1)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  });

  it("rejects out-of-bounds pixels", () => {
    const buffer = createPixelBuffer(4, 4);
    expect(setPixel(buffer, 4, 4, -1, 0, { r: 1, g: 2, b: 3, a: 255 })).toBe(false);
    expect(setPixel(buffer, 4, 4, 4, 0, { r: 1, g: 2, b: 3, a: 255 })).toBe(false);
    expect(getPixel(buffer, 4, 4, 0, 9)).toBeNull();
  });

  it("clears pixels", () => {
    const buffer = createPixelBuffer(2, 2);
    setPixel(buffer, 2, 2, 0, 0, { r: 10, g: 20, b: 30, a: 255 });
    clearPixelBuffer(buffer);
    expect(getPixel(buffer, 2, 2, 0, 0)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  });

  it("draws solid horizontal and diagonal lines without gaps", () => {
    const buffer = createPixelBuffer(8, 8);
    const black = { r: 0, g: 0, b: 0, a: 255 };
    drawPixelLine(buffer, 8, 8, 0, 3, 7, 3, black);
    for (let x = 0; x < 8; x += 1) {
      expect(getPixel(buffer, 8, 8, x, 3)).toEqual(black);
    }
    const diagonal = createPixelBuffer(8, 8);
    drawPixelLine(diagonal, 8, 8, 0, 0, 7, 7, black);
    for (let i = 0; i < 8; i += 1) {
      expect(getPixel(diagonal, 8, 8, i, i)).toEqual(black);
    }
  });

  it("parses hex colors", () => {
    expect(parseHexColor("#ff0000")).toEqual({ r: 255, g: 0, b: 0, a: 255 });
    expect(parseHexColor("#0f0")).toEqual({ r: 0, g: 255, b: 0, a: 255 });
    expect(parseHexColor("not-a-color")).toBeNull();
    expect(parseHexColor("#gggggg")).toBeNull();
  });

  it("composites source-over with opacity", () => {
    const red = { r: 255, g: 0, b: 0, a: 255 };
    const blue = { r: 0, g: 0, b: 255, a: 255 };
    const dst = createPixelBuffer(2, 2);
    setPixel(dst, 2, 2, 0, 0, blue);
    const src = createPixelBuffer(2, 2);
    setPixel(src, 2, 2, 0, 0, red);
    compositeOver(dst, src, 2, 2, 1);
    expect(getPixel(dst, 2, 2, 0, 0)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
    expect(getPixel(dst, 2, 2, 1, 1)).toEqual({ r: 0, g: 0, b: 0, a: 0 });

    const half = createPixelBuffer(2, 2);
    setPixel(half, 2, 2, 0, 0, blue);
    const halfSrc = createPixelBuffer(2, 2);
    setPixel(halfSrc, 2, 2, 0, 0, red);
    compositeOver(half, halfSrc, 2, 2, 0.5);
    expect(getPixel(half, 2, 2, 0, 0)).toEqual({ r: 128, g: 0, b: 128, a: 255 });

    const empty = createPixelBuffer(2, 2);
    const emptySrc = createPixelBuffer(2, 2);
    compositeOver(empty, emptySrc, 2, 2, 1);
    expect(getPixel(empty, 2, 2, 0, 0)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  });
});
