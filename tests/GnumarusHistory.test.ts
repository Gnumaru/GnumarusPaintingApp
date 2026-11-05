import { describe, expect, it } from "vitest";
import { createPixelBuffer, setPixel } from "../src/canvas/GnumarusPixelBuffer";
import {
  applyImageDiff,
  computeImageDiff,
  GnumarusHistory,
  type GnumarusHistoryLayer,
} from "../src/history/GnumarusHistory";

const BLACK = { r: 0, g: 0, b: 0, a: 255 };

function layerOf(buffer: Uint8ClampedArray): GnumarusHistoryLayer {
  return { buffer, width: 8 };
}

function layerOf4(buffer: Uint8ClampedArray): GnumarusHistoryLayer {
  return { buffer, width: 4 };
}

describe("GnumarusHistory", () => {
  it("computes null diff for identical buffers", () => {
    const a = createPixelBuffer(8, 8);
    const b = createPixelBuffer(8, 8);
    expect(computeImageDiff(a, b, 8, 8)).toBeNull();
  });

  it("computes a tight bounding-box diff", () => {
    const before = createPixelBuffer(8, 8);
    const after = createPixelBuffer(8, 8);
    setPixel(after, 8, 8, 2, 3, BLACK);
    setPixel(after, 8, 8, 5, 6, BLACK);
    const diff = computeImageDiff(before, after, 8, 8);
    expect(diff).not.toBeNull();
    expect({ x: diff?.x, y: diff?.y, w: diff?.w, h: diff?.h }).toEqual({ x: 2, y: 3, w: 4, h: 4 });
  });

  it("undoes and redoes a stroke", () => {
    const buffer = createPixelBuffer(8, 8);
    const stroke = createPixelBuffer(8, 8);
    setPixel(stroke, 8, 8, 1, 1, BLACK);
    setPixel(stroke, 8, 8, 2, 2, BLACK);
    const history = new GnumarusHistory();
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(false);
    const diff = computeImageDiff(buffer, stroke, 8, 8);
    expect(diff).not.toBeNull();
    if (diff === null) {
      throw new Error("expected a diff");
    }
    buffer.set(stroke);
    history.push({ layerId: "layer0", diff });
    expect(history.canUndo()).toBe(true);

    expect(history.undo(() => layerOf(buffer))).toBe(true);
    expect(computeImageDiff(buffer, createPixelBuffer(8, 8), 8, 8)).toBeNull();
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(true);

    expect(history.redo(() => layerOf(buffer))).toBe(true);
    expect(computeImageDiff(buffer, stroke, 8, 8)).toBeNull();
    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(false);

    expect(history.redo(() => layerOf(buffer))).toBe(false);
  });

  it("skips entries whose layer no longer exists", () => {
    const history = new GnumarusHistory();
    const buffer = createPixelBuffer(8, 8);
    const stroke = createPixelBuffer(8, 8);
    setPixel(stroke, 8, 8, 1, 1, BLACK);
    const diff = computeImageDiff(buffer, stroke, 8, 8);
    if (diff === null) {
      throw new Error("expected a diff");
    }
    history.push({ layerId: "gone", diff });
    expect(history.undo(() => null)).toBe(false);
    expect(history.canUndo()).toBe(false);
  });

  it("drops redo when a new action is pushed", () => {
    const history = new GnumarusHistory();
    const empty = createPixelBuffer(4, 4);
    const first = createPixelBuffer(4, 4);
    setPixel(first, 4, 4, 0, 0, BLACK);
    const second = createPixelBuffer(4, 4);
    setPixel(second, 4, 4, 3, 3, BLACK);
    const buffer = createPixelBuffer(4, 4);
    buffer.set(first);
    const diffA = computeImageDiff(empty, first, 4, 4);
    const diffB = computeImageDiff(first, second, 4, 4);
    if (diffA === null || diffB === null) {
      throw new Error("expected diffs");
    }
    history.push({ layerId: "layer0", diff: diffA });
    history.undo(() => layerOf4(buffer));
    buffer.set(first);
    history.push({ layerId: "layer0", diff: diffB });
    expect(history.canRedo()).toBe(false);
  });

  it("caps the undo depth", () => {
    const history = new GnumarusHistory(3);
    const base = createPixelBuffer(4, 4);
    for (let i = 0; i < 5; i += 1) {
      const next = createPixelBuffer(4, 4);
      setPixel(next, 4, 4, i % 4, 0, BLACK);
      const diff = computeImageDiff(base, next, 4, 4);
      if (diff === null) {
        throw new Error("expected a diff");
      }
      history.push({ layerId: "layer0", diff });
    }
    const buffer = createPixelBuffer(4, 4);
    expect(history.undo(() => layerOf4(buffer))).toBe(true);
    expect(history.undo(() => layerOf4(buffer))).toBe(true);
    expect(history.undo(() => layerOf4(buffer))).toBe(true);
    expect(history.undo(() => layerOf4(buffer))).toBe(false);
  });

  it("applies diff sides directly", () => {
    const before = createPixelBuffer(4, 4);
    const after = createPixelBuffer(4, 4);
    setPixel(after, 4, 4, 1, 1, BLACK);
    const diff = computeImageDiff(before, after, 4, 4);
    if (diff === null) {
      throw new Error("expected a diff");
    }
    const buffer = createPixelBuffer(4, 4);
    applyImageDiff(buffer, 4, diff, "after");
    expect(computeImageDiff(buffer, after, 4, 4)).toBeNull();
    applyImageDiff(buffer, 4, diff, "before");
    expect(computeImageDiff(buffer, before, 4, 4)).toBeNull();
  });
});
