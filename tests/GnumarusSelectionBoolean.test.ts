import { describe, expect, it } from "vitest";
import {
  clampSelectionRect,
  countSelectionMask,
  intersectSelectionRects,
  isEmptySelectionRect,
  normalizeSelectionRect,
  selectionMaskBox,
  unionSelectionBox,
} from "../src/canvas/GnumarusSelectionBoolean";

describe("GnumarusSelectionBoolean", () => {
  it("normalizes corners to exclusive-max rects", () => {
    expect(normalizeSelectionRect(5, 8, 2, 3)).toEqual({ minX: 2, minY: 3, maxX: 6, maxY: 9 });
    expect(normalizeSelectionRect(2, 3, 2, 3)).toEqual({ minX: 2, minY: 3, maxX: 3, maxY: 4 });
    expect(isEmptySelectionRect({ minX: 4, minY: 1, maxX: 4, maxY: 9 })).toBe(true);
    expect(isEmptySelectionRect({ minX: 1, minY: 1, maxX: 4, maxY: 9 })).toBe(false);
  });

  it("clamps rects into texture bounds", () => {
    expect(clampSelectionRect({ minX: -4, minY: -2, maxX: 100, maxY: 90 }, 64, 64)).toEqual({
      minX: 0,
      minY: 0,
      maxX: 64,
      maxY: 64,
    });
    expect(clampSelectionRect({ minX: 70, minY: 70, maxX: 80, maxY: 80 }, 64, 64)).toBeNull();
    expect(clampSelectionRect({ minX: 60, minY: 60, maxX: 70, maxY: 70 }, 64, 64)).toEqual({
      minX: 60,
      minY: 60,
      maxX: 64,
      maxY: 64,
    });
  });

  it("intersects rects, null when disjoint", () => {
    const a = normalizeSelectionRect(10, 10, 20, 20);
    const b = normalizeSelectionRect(15, 15, 25, 25);
    expect(intersectSelectionRects(a, b)).toEqual({ minX: 15, minY: 15, maxX: 21, maxY: 21 });
    expect(intersectSelectionRects(a, normalizeSelectionRect(30, 30, 40, 40))).toBeNull();
    // Touching edges share no pixel.
    expect(intersectSelectionRects(a, normalizeSelectionRect(21, 10, 30, 20))).toBeNull();
    expect(intersectSelectionRects(a, a)).toEqual({ minX: 10, minY: 10, maxX: 21, maxY: 21 });
  });

  it("unions rects into the bounding box", () => {
    const box = unionSelectionBox(normalizeSelectionRect(10, 10, 12, 12), normalizeSelectionRect(40, 40, 42, 42));
    expect(box).toEqual({ minX: 10, minY: 10, maxX: 43, maxY: 43 });
  });

  it("counts mask bits and finds the tight box", () => {
    const mask = new Uint8Array(4 * 4);
    expect(countSelectionMask(mask)).toBe(0);
    expect(selectionMaskBox(mask, 4, 4)).toBeNull();
    mask[1 * 4 + 1] = 255;
    mask[2 * 4 + 3] = 255;
    expect(countSelectionMask(mask)).toBe(2);
    expect(selectionMaskBox(mask, 4, 4)).toEqual({ minX: 1, minY: 1, maxX: 4, maxY: 3 });
    expect(selectionMaskBox(new Uint8Array(3), 4, 4)).toBeNull();
  });
});
