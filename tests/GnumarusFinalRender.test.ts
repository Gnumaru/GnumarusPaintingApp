import { describe, expect, it } from "vitest";
import { createPixelBuffer, setPixel } from "../src/canvas/GnumarusPixelBuffer";
import { IDENTITY_LAYER_TRANSFORM } from "../src/canvas/GnumarusViewportMath";
import { compositeFinalImage } from "../src/preview/GnumarusFinalRender";

describe("GnumarusFinalRender", () => {
  it("renders transparent for empty layers", () => {
    const flat = compositeFinalImage(2, 2, []);
    expect(flat.length).toBe(16);
    expect(Array.from(flat)).toEqual(new Array(16).fill(0));
  });

  it("flattens a single opaque pixel", () => {
    const buffer = createPixelBuffer(2, 2);
    setPixel(buffer, 2, 2, 0, 0, { r: 255, g: 0, b: 0, a: 255 });
    const flat = compositeFinalImage(2, 2, [
      { width: 2, height: 2, buffer, transform: { ...IDENTITY_LAYER_TRANSFORM }, visible: true, opacity: 1 },
    ]);
    expect(flat[0]).toBe(255);
    expect(flat[3]).toBe(255);
    expect(flat[4]).toBe(0);
    expect(flat[7]).toBe(0);
  });

  it("skips hidden layers and respects opacity", () => {
    const red = createPixelBuffer(1, 1);
    setPixel(red, 1, 1, 0, 0, { r: 255, g: 0, b: 0, a: 255 });
    const blue = createPixelBuffer(1, 1);
    setPixel(blue, 1, 1, 0, 0, { r: 0, g: 0, b: 255, a: 255 });
    const hidden = compositeFinalImage(1, 1, [
      { width: 1, height: 1, buffer: red, transform: { ...IDENTITY_LAYER_TRANSFORM }, visible: true, opacity: 1 },
      { width: 1, height: 1, buffer: blue, transform: { ...IDENTITY_LAYER_TRANSFORM }, visible: false, opacity: 1 },
    ]);
    expect(hidden[0]).toBe(255);
    const half = compositeFinalImage(1, 1, [
      { width: 1, height: 1, buffer: red, transform: { ...IDENTITY_LAYER_TRANSFORM }, visible: true, opacity: 1 },
      { width: 1, height: 1, buffer: blue, transform: { ...IDENTITY_LAYER_TRANSFORM }, visible: true, opacity: 0.5 },
    ]);
    expect(half[0]).toBe(128);
    expect(half[2]).toBe(128);
    expect(half[3]).toBe(255);
  });

  it("offsets layers by transform", () => {
    const buffer = createPixelBuffer(2, 2);
    setPixel(buffer, 2, 2, 0, 0, { r: 255, g: 0, b: 0, a: 255 });
    const flat = compositeFinalImage(4, 4, [
      {
        width: 2,
        height: 2,
        buffer,
        transform: { ...IDENTITY_LAYER_TRANSFORM, x: 1 },
        visible: true,
        opacity: 1,
      },
    ]);
    const at = (x: number, y: number): number => (y * 4 + x) * 4;
    expect(flat[at(2, 1)]).toBe(255);
    expect(flat[at(1, 1)]).toBe(0);
  });

  it("fills solid backgrounds opaquely under layers", () => {
    const buffer = createPixelBuffer(2, 2);
    setPixel(buffer, 2, 2, 1, 1, { r: 255, g: 0, b: 0, a: 255 });
    const flat = compositeFinalImage(
      2,
      2,
      [
        { width: 2, height: 2, buffer, transform: { ...IDENTITY_LAYER_TRANSFORM }, visible: true, opacity: 1 },
      ],
      { mode: "solid", checkerMode: "image", sizeX: 16, sizeY: 16, colorA: "#000000", colorB: "#ffffff", color: "#00ff00" },
    );
    const at = (x: number, y: number): number => (y * 2 + x) * 4;
    expect(Array.from(flat.subarray(at(0, 0), at(0, 0) + 4))).toEqual([0, 255, 0, 255]);
    expect(Array.from(flat.subarray(at(1, 1), at(1, 1) + 4))).toEqual([255, 0, 0, 255]);
  });

  it("draws matching image-space checkerboard squares", () => {
    const flat = compositeFinalImage(4, 4, [], {
      mode: "checkerboard",
      checkerMode: "image",
      sizeX: 2,
      sizeY: 2,
      colorA: "#ffffff",
      colorB: "#000000",
      color: "#808080",
    });
    const at = (x: number, y: number): number => (y * 4 + x) * 4;
    // Matches the canvas shader (origin at the bottom): top-left is B, top row alternates every 2px.
    expect(Array.from(flat.subarray(at(0, 0), at(0, 0) + 3))).toEqual([0, 0, 0]);
    expect(Array.from(flat.subarray(at(2, 0), at(2, 0) + 3))).toEqual([255, 255, 255]);
    expect(Array.from(flat.subarray(at(0, 3), at(0, 3) + 3))).toEqual([255, 255, 255]);
    expect(Array.from(flat.subarray(at(2, 3), at(2, 3) + 3))).toEqual([0, 0, 0]);
    expect(flat[at(0, 0) + 3]).toBe(255);
  });

  it("ignores invalid background colors and keeps transparency", () => {
    const flat = compositeFinalImage(2, 2, [], {
      mode: "solid",
      checkerMode: "image",
      sizeX: 16,
      sizeY: 16,
      colorA: "#ffffff",
      colorB: "not-a-color",
      color: "also-bad",
    });
    expect(Array.from(flat)).toEqual(new Array(16).fill(0));
  });
});
