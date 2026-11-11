import { describe, expect, it } from "vitest";
import {
  clampSelectionRect,
  colorDistanceRGBA,
  colorSelectTolerance,
  ellipseSelectMask,
  floodSelectMask,
  globalSelectMask,
  countSelectionMask,
  intersectSelectionRects,
  isEmptySelectionRect,
  normalizeSelectionRect,
  polygonSelectMask,
  selectionMaskBoundaryPath,
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

describe("selectionMaskBoundaryPath", () => {
  it("emits an empty path for empty or invalid masks", () => {
    expect(selectionMaskBoundaryPath(new Uint8Array(16), 4, 4)).toBe("");
    expect(selectionMaskBoundaryPath(new Uint8Array(3), 4, 4)).toBe("");
  });

  it("traces a single pixel as four unit edges", () => {
    expect(selectionMaskBoundaryPath(new Uint8Array([255]), 1, 1)).toBe("M0,0L1,0 M0,1L1,1 M0,0L0,1 M1,0L1,1");
  });

  it("merges box sides into one run per side", () => {
    const mask = new Uint8Array(3 * 3).fill(255);
    expect(selectionMaskBoundaryPath(mask, 3, 3)).toBe("M0,0L3,0 M0,3L3,3 M0,0L0,3 M3,0L3,3");
  });

  it("keeps disjoint regions disjoint", () => {
    const mask = new Uint8Array(5 * 5);
    mask[0] = 255;
    mask[4 * 5 + 4] = 255;
    const path = selectionMaskBoundaryPath(mask, 5, 5);
    expect(path.match(/M/g)?.length ?? 0).toBe(8);
    expect(path).toContain("M0,0L1,0");
    expect(path).toContain("M4,4L5,4");
  });

  it("traces holes and L shapes with exact runs", () => {
    // L tromino: 6 runs.
    const l = new Uint8Array([255, 255, 255, 0]);
    const lPath = selectionMaskBoundaryPath(l, 2, 2);
    expect(lPath.match(/M/g)?.length ?? 0).toBe(6);
    expect(lPath).toContain("M0,0L2,0");
    // 5x5 box with the center pixel missing: outer rect plus hole rect.
    const donut = new Uint8Array(5 * 5).fill(255);
    donut[2 * 5 + 2] = 0;
    const donutPath = selectionMaskBoundaryPath(donut, 5, 5);
    expect(donutPath.match(/M/g)?.length ?? 0).toBe(8);
    expect(donutPath).toContain("M0,0L5,0");
    expect(donutPath).toContain("M2,2L3,2");
  });
});

describe("selection shape masks", () => {
  it("masks an inscribed ellipse (1px box selects its pixel)", () => {
    expect(Array.from(ellipseSelectMask({ minX: 5, minY: 5, maxX: 6, maxY: 6 }))).toEqual([255]);
    const mask = ellipseSelectMask({ minX: 0, minY: 0, maxX: 5, maxY: 5 });
    expect(mask.length).toBe(25);
    // Corners out, edge centers in.
    expect(mask[0]).toBe(0);
    expect(mask[2]).toBe(255);
    expect(mask[12]).toBe(255);
    expect(countSelectionMask(mask)).toBeGreaterThan(0);
  });

  it("fills lasso polygons with the even-odd rule", () => {
    const triangle = polygonSelectMask(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 0, y: 10 },
      ],
      64,
      64,
    );
    expect(triangle).not.toBeNull();
    expect(triangle?.minX).toBe(0);
    expect(triangle?.minY).toBe(0);
    expect(countSelectionMask(triangle?.mask ?? new Uint8Array(0))).toBeGreaterThan(0);
    expect(polygonSelectMask([{ x: 1, y: 1 }], 64, 64)).toBeNull();
    expect(polygonSelectMask([], 64, 64)).toBeNull();
  });

  it("matches colors by RGBA distance with a threshold", () => {
    expect(colorDistanceRGBA(0, 0, 0, 0, 0, 0, 0, 0)).toBe(0);
    expect(colorSelectTolerance(0)).toBe(0);
    expect(colorSelectTolerance(100)).toBeCloseTo(510, 0);
    // 4x1: red, near-red, blue, transparent.
    const buffer = new Uint8ClampedArray([255, 0, 0, 255, 254, 0, 0, 255, 0, 0, 255, 255, 0, 0, 0, 0]);
    const exact = floodSelectMask(buffer, 4, 1, 0, 0, colorSelectTolerance(0));
    expect(Array.from(exact)).toEqual([255, 0, 0, 0]);
    const loose = floodSelectMask(buffer, 4, 1, 0, 0, colorSelectTolerance(100));
    expect(countSelectionMask(loose)).toBe(4);
    const global = globalSelectMask(buffer, 4, 1, 2, 0, colorSelectTolerance(0));
    expect(Array.from(global)).toEqual([0, 0, 255, 0]);
    expect(countSelectionMask(floodSelectMask(buffer, 4, 1, 9, 9, 10))).toBe(0);
  });
});
