import { describe, expect, it } from "vitest";
import {
  clampLayerDim,
  createPixelBuffer,
  getPixel,
  resizePixelBuffer,
  setPixel,
} from "../src/canvas/GnumarusPixelBuffer";
import { GnumarusHistory } from "../src/history/GnumarusHistory";

describe("GnumarusLayerResize", () => {
  it("clamps dimensions to 1..1024", () => {
    expect(clampLayerDim(64)).toBe(64);
    expect(clampLayerDim(64.9)).toBe(64);
    expect(clampLayerDim(0)).toBe(1);
    expect(clampLayerDim(-5)).toBe(1);
    expect(clampLayerDim(5000)).toBe(1024);
    expect(clampLayerDim(Number.NaN)).toBe(1);
    expect(clampLayerDim(Number.POSITIVE_INFINITY)).toBe(1);
  });

  it("expands right and down with transparent pixels", () => {
    const buffer = createPixelBuffer(2, 2);
    setPixel(buffer, 2, 2, 0, 0, { r: 10, g: 20, b: 30, a: 40 });
    setPixel(buffer, 2, 2, 1, 1, { r: 100, g: 110, b: 120, a: 130 });
    const next = resizePixelBuffer(buffer, 2, 2, 4, 3);
    expect(next.length).toBe(4 * 3 * 4);
    expect(getPixel(next, 4, 3, 0, 0)).toEqual({ r: 10, g: 20, b: 30, a: 40 });
    expect(getPixel(next, 4, 3, 1, 1)).toEqual({ r: 100, g: 110, b: 120, a: 130 });
    expect(getPixel(next, 4, 3, 1, 0)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    expect(getPixel(next, 4, 3, 3, 0)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    expect(getPixel(next, 4, 3, 0, 2)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    expect(getPixel(next, 4, 3, 3, 2)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    expect(getPixel(buffer, 2, 2, 0, 0)).toEqual({ r: 10, g: 20, b: 30, a: 40 });
  });

  it("crops excess right and below preserving top-left", () => {
    const buffer = createPixelBuffer(4, 4);
    for (let y = 0; y < 4; y += 1) {
      for (let x = 0; x < 4; x += 1) {
        setPixel(buffer, 4, 4, x, y, { r: x * 10, g: y * 10, b: 5, a: 255 });
      }
    }
    const next = resizePixelBuffer(buffer, 4, 4, 2, 2);
    expect(next.length).toBe(2 * 2 * 4);
    expect(getPixel(next, 2, 2, 0, 0)).toEqual({ r: 0, g: 0, b: 5, a: 255 });
    expect(getPixel(next, 2, 2, 1, 0)).toEqual({ r: 10, g: 0, b: 5, a: 255 });
    expect(getPixel(next, 2, 2, 0, 1)).toEqual({ r: 0, g: 10, b: 5, a: 255 });
    expect(getPixel(next, 2, 2, 1, 1)).toEqual({ r: 10, g: 10, b: 5, a: 255 });
  });

  it("supports asymmetric expand and shrink", () => {
    const buffer = createPixelBuffer(2, 3);
    setPixel(buffer, 2, 3, 1, 2, { r: 7, g: 8, b: 9, a: 255 });
    const wider = resizePixelBuffer(buffer, 2, 3, 5, 3);
    expect(getPixel(wider, 5, 3, 1, 2)).toEqual({ r: 7, g: 8, b: 9, a: 255 });
    expect(getPixel(wider, 5, 3, 4, 2)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    const narrower = resizePixelBuffer(buffer, 2, 3, 2, 1);
    expect(narrower.length).toBe(2 * 1 * 4);
    expect(getPixel(narrower, 2, 1, 1, 0)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  });

  it("undoes and redoes a resize entry", () => {
    const history = new GnumarusHistory();
    const before = createPixelBuffer(2, 2);
    setPixel(before, 2, 2, 0, 0, { r: 255, g: 0, b: 0, a: 255 });
    const after = resizePixelBuffer(before, 2, 2, 4, 4);
    history.push({
      type: "resize",
      resize: {
        layerId: "layer0",
        textureId: "tex0",
        beforeWidth: 2,
        beforeHeight: 2,
        beforeBuffer: before.slice(),
        afterWidth: 4,
        afterHeight: 4,
        afterBuffer: after.slice(),
      },
    });
    let current = { width: 4, height: 4, buffer: after.slice() };
    const apply = (id: string, width: number, height: number, buffer: Uint8ClampedArray): boolean => {
      if (id !== "tex0") {
        return false;
      }
      current = { width, height, buffer: buffer.slice() };
      return true;
    };
    expect(history.canUndo()).toBe(true);
    expect(history.undo(() => null, () => {}, apply)).toBe(true);
    expect(current.width).toBe(2);
    expect(current.height).toBe(2);
    expect(getPixel(current.buffer, 2, 2, 0, 0)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
    expect(history.canRedo()).toBe(true);
    expect(history.redo(() => null, () => {}, apply)).toBe(true);
    expect(current.width).toBe(4);
    expect(current.height).toBe(4);
    expect(getPixel(current.buffer, 4, 4, 0, 0)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
    expect(getPixel(current.buffer, 4, 4, 3, 3)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  });

  it("skips resize entries for missing layers", () => {
    const history = new GnumarusHistory();
    const before = createPixelBuffer(2, 2);
    const after = resizePixelBuffer(before, 2, 2, 3, 3);
    history.push({
      type: "resize",
      resize: {
        layerId: "gone",
        textureId: "gone",
        beforeWidth: 2,
        beforeHeight: 2,
        beforeBuffer: before,
        afterWidth: 3,
        afterHeight: 3,
        afterBuffer: after,
      },
    });
    expect(history.undo(() => null, () => {}, () => false)).toBe(false);
  });
});
