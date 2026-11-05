import { describe, expect, it } from "vitest";
import {
  clampBrushSize,
  clampBrushSizeFloat,
  clearPixelBuffer,
  compositeOver,
  createPixelBuffer,
  drawBrushLine,
  drawBrushStamp,
  drawCubicBezier,
  drawLineSegment,
  drawPixelLine,
  floodFill,
  getPixel,
  parseBrushShape,
  parseHexColor,
  roundBrushSizeForAliased,
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

  it("flood fills a contiguous region without leaking through barriers", () => {
    const buffer = createPixelBuffer(5, 5);
    const white = { r: 255, g: 255, b: 255, a: 255 };
    const black = { r: 0, g: 0, b: 0, a: 255 };
    const red = { r: 255, g: 0, b: 0, a: 255 };
    for (let x = 0; x < 5; x += 1) {
      setPixel(buffer, 5, 5, x, 2, black);
    }
    const filled = floodFill(buffer, 5, 5, 0, 0, white);
    expect(filled).toBe(10);
    for (let y = 0; y < 2; y += 1) {
      for (let x = 0; x < 5; x += 1) {
        expect(getPixel(buffer, 5, 5, x, y)).toEqual(white);
      }
    }
    expect(getPixel(buffer, 5, 5, 0, 2)).toEqual(black);
    for (let y = 3; y < 5; y += 1) {
      for (let x = 0; x < 5; x += 1) {
        expect(getPixel(buffer, 5, 5, x, y)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
      }
    }
    const second = floodFill(buffer, 5, 5, 0, 4, red);
    expect(second).toBe(10);
    expect(getPixel(buffer, 5, 5, 4, 4)).toEqual(red);
  });

  it("flood fill is a no-op for same color or out of bounds", () => {
    const buffer = createPixelBuffer(3, 3);
    const red = { r: 255, g: 0, b: 0, a: 255 };
    setPixel(buffer, 3, 3, 1, 1, red);
    expect(floodFill(buffer, 3, 3, 1, 1, red, undefined, "copy")).toBe(0);
    expect(floodFill(buffer, 3, 3, -1, 0, red)).toBe(0);
    expect(floodFill(buffer, 3, 3, 9, 9, red)).toBe(0);
    expect(getPixel(buffer, 3, 3, 1, 1)).toEqual(red);
  });

  it("flood fill respects channel locks", () => {
    const buffer = createPixelBuffer(2, 2);
    const target = { r: 10, g: 20, b: 30, a: 40 };
    const fill = { r: 200, g: 210, b: 220, a: 230 };
    for (let y = 0; y < 2; y += 1) {
      for (let x = 0; x < 2; x += 1) {
        setPixel(buffer, 2, 2, x, y, target);
      }
    }
    const filled = floodFill(buffer, 2, 2, 0, 0, fill, { r: true, g: false, b: false, a: false }, "copy");
    expect(filled).toBe(4);
    expect(getPixel(buffer, 2, 2, 1, 1)).toEqual({ r: 10, g: 210, b: 220, a: 230 });
  });

  it("clamps brush size and parses brush shape", () => {
    expect(clampBrushSize(1)).toBe(1);
    expect(clampBrushSize(64)).toBe(64);
    expect(clampBrushSize(0)).toBe(1);
    expect(clampBrushSize(65)).toBe(64);
    expect(clampBrushSize(3.9)).toBe(3);
    expect(clampBrushSize(Number.NaN)).toBe(1);
    expect(clampBrushSizeFloat(0.1)).toBeCloseTo(0.1, 5);
    expect(clampBrushSizeFloat(1.5)).toBeCloseTo(1.5, 5);
    expect(clampBrushSizeFloat(0)).toBeCloseTo(0.1, 5);
    expect(clampBrushSizeFloat(99)).toBe(64);
    expect(clampBrushSizeFloat(Number.NaN)).toBe(1);
    expect(roundBrushSizeForAliased(1.4)).toBe(1);
    expect(roundBrushSizeForAliased(1.5)).toBe(2);
    expect(roundBrushSizeForAliased(0.1)).toBe(1);
    expect(roundBrushSizeForAliased(0)).toBe(1);
    expect(roundBrushSizeForAliased(99)).toBe(64);
    expect(parseBrushShape("circle")).toBe("circle");
    expect(parseBrushShape("square")).toBe("square");
    expect(parseBrushShape("triangle")).toBe("square");
    expect(parseBrushShape(undefined)).toBe("square");
  });

  it("stamps square and circle tips", () => {
    const red = { r: 255, g: 0, b: 0, a: 255 };
    const square = createPixelBuffer(5, 5);
    drawBrushStamp(square, 5, 5, 2, 2, 3, "square", red);
    for (let y = 1; y <= 3; y += 1) {
      for (let x = 1; x <= 3; x += 1) {
        expect(getPixel(square, 5, 5, x, y)).toEqual(red);
      }
    }
    expect(getPixel(square, 5, 5, 0, 0)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    const circle = createPixelBuffer(5, 5);
    drawBrushStamp(circle, 5, 5, 2, 2, 3, "circle", red);
    expect(getPixel(circle, 5, 5, 2, 2)).toEqual(red);
    expect(getPixel(circle, 5, 5, 2, 1)).toEqual(red);
    expect(getPixel(circle, 5, 5, 1, 1)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    expect(getPixel(circle, 5, 5, 3, 3)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  });

  it("draws brush lines with thickness and locks", () => {
    const red = { r: 255, g: 0, b: 0, a: 255 };
    const thick = createPixelBuffer(8, 8);
    drawBrushLine(thick, 8, 8, 1, 1, 5, 1, 3, "square", red);
    expect(getPixel(thick, 8, 8, 3, 0)).toEqual(red);
    expect(getPixel(thick, 8, 8, 3, 2)).toEqual(red);
    expect(getPixel(thick, 8, 8, 3, 3)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    const masked = createPixelBuffer(4, 4);
    const target = { r: 10, g: 20, b: 30, a: 40 };
    for (let y = 0; y < 4; y += 1) {
      for (let x = 0; x < 4; x += 1) {
        setPixel(masked, 4, 4, x, y, target);
      }
    }
    drawBrushStamp(masked, 4, 4, 1, 1, 2, "square", red, { r: true, g: false, b: false, a: false });
    expect(getPixel(masked, 4, 4, 1, 1)).toEqual({ r: 10, g: 0, b: 0, a: 255 });
  });

  it("draws aliased line segments with width and shape", () => {
    const red = { r: 255, g: 0, b: 0, a: 255 };
    const thin = createPixelBuffer(8, 8);
    drawLineSegment(thin, 8, 8, 0, 0, 7, 0, 1, "square", false, red);
    for (let x = 0; x < 8; x += 1) {
      expect(getPixel(thin, 8, 8, x, 0)).toEqual(red);
    }
    expect(getPixel(thin, 8, 8, 0, 1)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    const wide = createPixelBuffer(8, 8);
    drawLineSegment(wide, 8, 8, 0, 3, 7, 3, 3, "square", false, red);
    expect(getPixel(wide, 8, 8, 3, 2)).toEqual(red);
    expect(getPixel(wide, 8, 8, 3, 4)).toEqual(red);
    expect(getPixel(wide, 8, 8, 3, 5)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    const dot = createPixelBuffer(4, 4);
    drawLineSegment(dot, 4, 4, 2, 2, 2, 2, 3, "circle", false, red);
    expect(getPixel(dot, 4, 4, 2, 2)).toEqual(red);
    expect(getPixel(dot, 4, 4, 1, 1)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  });

  it("composites translucent paint over the background in normal mode", () => {
    const buffer = createPixelBuffer(2, 2);
    const halfBlack = { r: 0, g: 0, b: 0, a: 128 };
    expect(setPixel(buffer, 2, 2, 0, 0, halfBlack, undefined, "normal")).toBe(true);
    expect(getPixel(buffer, 2, 2, 0, 0)).toEqual({ r: 0, g: 0, b: 0, a: 128 });
    // Painting again darkens/accumulates toward opaque, like Krita/Photoshop.
    expect(setPixel(buffer, 2, 2, 0, 0, halfBlack, undefined, "normal")).toBe(true);
    expect(getPixel(buffer, 2, 2, 0, 0)).toEqual({ r: 0, g: 0, b: 0, a: 192 });
    // Fully transparent paint is a no-op in normal mode.
    expect(setPixel(buffer, 2, 2, 1, 1, { r: 255, g: 0, b: 0, a: 0 }, undefined, "normal")).toBe(true);
    expect(getPixel(buffer, 2, 2, 1, 1)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    // Opaque paint matches copy mode exactly.
    const opaque = createPixelBuffer(1, 1);
    setPixel(opaque, 1, 1, 0, 0, { r: 10, g: 20, b: 30, a: 40 });
    setPixel(opaque, 1, 1, 0, 0, { r: 200, g: 210, b: 220, a: 255 }, undefined, "normal");
    expect(getPixel(opaque, 1, 1, 0, 0)).toEqual({ r: 200, g: 210, b: 220, a: 255 });
    // Locks still mask the composite write.
    const masked = createPixelBuffer(1, 1);
    setPixel(masked, 1, 1, 0, 0, { r: 0, g: 0, b: 255, a: 255 });
    setPixel(
      masked,
      1,
      1,
      0,
      0,
      { r: 255, g: 0, b: 0, a: 128 },
      { r: false, g: false, b: true, a: false },
      "normal",
    );
    expect(getPixel(masked, 1, 1, 0, 0)).toEqual({ r: 128, g: 0, b: 255, a: 255 });
  });

  it("erases only alpha, subtracting the paint alpha down to zero", () => {
    const buffer = createPixelBuffer(1, 1);
    setPixel(buffer, 1, 1, 0, 0, { r: 10, g: 20, b: 30, a: 100 });
    expect(setPixel(buffer, 1, 1, 0, 0, { r: 255, g: 255, b: 255, a: 255 }, undefined, "eraser")).toBe(true);
    expect(getPixel(buffer, 1, 1, 0, 0)).toEqual({ r: 10, g: 20, b: 30, a: 0 });
    setPixel(buffer, 1, 1, 0, 0, { r: 10, g: 20, b: 30, a: 100 });
    expect(setPixel(buffer, 1, 1, 0, 0, { r: 0, g: 0, b: 0, a: 32 }, undefined, "eraser")).toBe(true);
    expect(getPixel(buffer, 1, 1, 0, 0)).toEqual({ r: 10, g: 20, b: 30, a: 68 });
    expect(setPixel(buffer, 1, 1, 0, 0, { r: 0, g: 0, b: 0, a: 32 }, undefined, "eraser")).toBe(true);
    expect(getPixel(buffer, 1, 1, 0, 0)).toEqual({ r: 10, g: 20, b: 30, a: 36 });
    // A locked alpha channel blocks the eraser.
    setPixel(
      buffer,
      1,
      1,
      0,
      0,
      { r: 0, g: 0, b: 0, a: 255 },
      { r: false, g: false, b: false, a: true },
      "eraser",
    );
    expect(getPixel(buffer, 1, 1, 0, 0)).toEqual({ r: 10, g: 20, b: 30, a: 36 });
  });

  it("flood fills in copy mode only for new colors and always otherwise", () => {
    const red = { r: 255, g: 0, b: 0, a: 200 };
    const buffer = createPixelBuffer(3, 3);
    setPixel(buffer, 3, 3, 1, 1, red);
    expect(floodFill(buffer, 3, 3, 1, 1, red, undefined, "copy")).toBe(0);
    expect(floodFill(buffer, 3, 3, 1, 1, red, undefined, "copy")).toBe(0);
    expect(floodFill(buffer, 3, 3, 1, 1, red, undefined, "normal")).toBe(1);
    expect(getPixel(buffer, 3, 3, 1, 1)).toEqual({ r: 255, g: 0, b: 0, a: 243 });
    expect(floodFill(buffer, 3, 3, 1, 1, red, undefined, "eraser")).toBe(1);
    expect(getPixel(buffer, 3, 3, 1, 1)).toEqual({ r: 255, g: 0, b: 0, a: 43 });
  });

  it("accumulates repeated strokes in normal blend mode", () => {
    const translucent = { r: 0, g: 0, b: 0, a: 100 };
    const buffer = createPixelBuffer(4, 4);
    drawLineSegment(buffer, 4, 4, 0, 0, 3, 0, 1, "square", false, translucent, undefined, "copy");
    expect(getPixel(buffer, 4, 4, 1, 0)).toEqual({ r: 0, g: 0, b: 0, a: 100 });
    drawLineSegment(buffer, 4, 4, 0, 0, 3, 0, 1, "square", false, translucent, undefined, "normal");
    expect(getPixel(buffer, 4, 4, 1, 0)).toEqual({ r: 0, g: 0, b: 0, a: 161 });
    const smooth = createPixelBuffer(8, 8);
    drawLineSegment(
      smooth,
      8,
      8,
      0,
      0,
      7,
      7,
      1,
      "square",
      true,
      { r: 255, g: 0, b: 0, a: 255 },
      undefined,
      "normal",
    );
    const edge = getPixel(smooth, 8, 8, 3, 4);
    expect(edge).not.toBeNull();
    expect(edge!.r).toBe(255);
    expect(edge!.a).toBeGreaterThan(0);
    expect(edge!.a).toBeLessThan(255);
  });

  it("draws anti-aliased lines with soft edges", () => {
    const red = { r: 255, g: 0, b: 0, a: 255 };
    const smooth = createPixelBuffer(8, 8);
    drawLineSegment(smooth, 8, 8, 0, 0, 7, 7, 1, "square", true, red);
    expect(getPixel(smooth, 8, 8, 3, 3)).toEqual(red);
    const edge = getPixel(smooth, 8, 8, 3, 4);
    expect(edge).not.toBeNull();
    expect(edge!.r).toBe(255);
    expect(edge!.a).toBeGreaterThan(0);
    expect(edge!.a).toBeLessThan(255);
    expect(getPixel(smooth, 8, 8, 3, 6)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    const masked = createPixelBuffer(4, 4);
    drawLineSegment(masked, 4, 4, 0, 0, 3, 0, 1, "square", true, red, {
      r: true,
      g: false,
      b: false,
      a: false,
    });
    expect(getPixel(masked, 4, 4, 1, 0)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  });

  it("rounds float widths when anti-aliasing is off and uses floats when on", () => {
    const red = { r: 255, g: 0, b: 0, a: 255 };
    const rounded = createPixelBuffer(8, 8);
    drawLineSegment(rounded, 8, 8, 0, 3, 7, 3, 1.5, "square", false, red);
    expect(getPixel(rounded, 8, 8, 3, 3)).toEqual(red);
    expect(getPixel(rounded, 8, 8, 3, 4)).toEqual(red);
    expect(getPixel(rounded, 8, 8, 3, 5)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    const thin = createPixelBuffer(8, 8);
    drawLineSegment(thin, 8, 8, 0, 3, 7, 3, 1.4, "square", false, red);
    expect(getPixel(thin, 8, 8, 3, 3)).toEqual(red);
    expect(getPixel(thin, 8, 8, 3, 2)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    expect(getPixel(thin, 8, 8, 3, 4)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    const mid = createPixelBuffer(8, 8);
    drawLineSegment(mid, 8, 8, 0, 3, 7, 3, 1.5, "square", true, red);
    const midEdge = getPixel(mid, 8, 8, 3, 2);
    expect(midEdge).not.toBeNull();
    expect(midEdge!.r).toBe(255);
    expect(midEdge!.a).toBe(64);
    const narrow = createPixelBuffer(8, 8);
    drawLineSegment(narrow, 8, 8, 0, 3, 7, 3, 1, "square", true, red);
    expect(getPixel(narrow, 8, 8, 3, 2)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    const wide = createPixelBuffer(8, 8);
    drawLineSegment(wide, 8, 8, 0, 3, 7, 3, 2, "square", true, red);
    const wideEdge = getPixel(wide, 8, 8, 3, 2);
    expect(wideEdge).not.toBeNull();
    expect(wideEdge!.r).toBe(255);
    expect(wideEdge!.a).toBe(128);
    expect(wideEdge!.a).toBeGreaterThan(midEdge!.a);
  });

  it("draws cubic beziers through endpoints with control influence", () => {
    const red = { r: 255, g: 0, b: 0, a: 255 };
    const flat = createPixelBuffer(8, 8);
    drawCubicBezier(
      flat,
      8,
      8,
      { x: 0, y: 3 },
      { x: 2, y: 3 },
      { x: 5, y: 3 },
      { x: 7, y: 3 },
      1,
      "square",
      false,
      red,
    );
    expect(getPixel(flat, 8, 8, 0, 3)).toEqual(red);
    expect(getPixel(flat, 8, 8, 7, 3)).toEqual(red);
    expect(getPixel(flat, 8, 8, 3, 3)).toEqual(red);
    expect(getPixel(flat, 8, 8, 3, 5)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    const bowed = createPixelBuffer(8, 8);
    drawCubicBezier(
      bowed,
      8,
      8,
      { x: 1, y: 1 },
      { x: 2, y: 4 },
      { x: 5, y: 4 },
      { x: 6, y: 1 },
      1,
      "square",
      false,
      red,
    );
    expect(getPixel(bowed, 8, 8, 1, 1)).toEqual(red);
    expect(getPixel(bowed, 8, 8, 6, 1)).toEqual(red);
    expect(getPixel(bowed, 8, 8, 3, 3)).toEqual(red);
    expect(getPixel(bowed, 8, 8, 0, 0)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    const smooth = createPixelBuffer(8, 8);
    drawCubicBezier(
      smooth,
      8,
      8,
      { x: 1, y: 1 },
      { x: 2, y: 4 },
      { x: 5, y: 4 },
      { x: 6, y: 1 },
      1.5,
      "square",
      true,
      red,
    );
    const soft = getPixel(smooth, 8, 8, 3, 2);
    expect(soft).not.toBeNull();
    expect(soft!.r).toBeGreaterThan(0);
  });
});
