import { describe, expect, it } from "vitest";
import {
  forwardSelectionPoint,
  inverseSelectionPoint,
  isSelectionDegenerate,
  selectionCornerBox,
  selectionLinearMatrix,
  selectionMaskAt,
  selectionMaskTester,
  selectionMatrixDeterminant,
} from "../src/canvas/GnumarusSelectionTransform";

const IDENTITY = {
  cx: 32.5,
  cy: 32.5,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  skewX: 0,
  skewY: 0,
  rotationX: 0,
  rotationY: 0,
  flipX: false,
  flipY: false,
  width: 5,
  height: 5,
};

describe("GnumarusSelectionTransform", () => {
  it("maps identity to a plain offset", () => {
    expect(forwardSelectionPoint(IDENTITY, 0, 0)).toEqual({ x: 30, y: 30 });
    expect(forwardSelectionPoint(IDENTITY, 5, 5)).toEqual({ x: 35, y: 35 });
    expect(selectionMatrixDeterminant(IDENTITY)).toBeCloseTo(1, 12);
    expect(isSelectionDegenerate(IDENTITY)).toBe(false);
  });

  it("rotates clockwise about the center", () => {
    const rotated = { ...IDENTITY, rotation: Math.PI / 2 };
    // Top-right corner travels to the bottom-right (east goes south).
    const corner = forwardSelectionPoint(rotated, 5, 0);
    expect(corner.x).toBeCloseTo(35, 9);
    expect(corner.y).toBeCloseTo(35, 9);
    expect(forwardSelectionPoint(rotated, 0, 0).x).toBeCloseTo(35, 9);
    expect(forwardSelectionPoint(rotated, 0, 0).y).toBeCloseTo(30, 9);
  });

  it("scales about the center", () => {
    const scaled = { ...IDENTITY, scaleX: 2, scaleY: 3 };
    expect(forwardSelectionPoint(scaled, 0, 0)).toEqual({ x: 27.5, y: 25 });
    expect(forwardSelectionPoint(scaled, 5, 5)).toEqual({ x: 37.5, y: 40 });
    expect(selectionMatrixDeterminant(scaled)).toBeCloseTo(6, 12);
  });

  it("shears horizontally proportional to the vertical offset", () => {
    const skewed = { ...IDENTITY, skewX: 1 };
    // Center row stays, top row shifts left, bottom row shifts right.
    expect(forwardSelectionPoint(skewed, 2.5, 2.5)).toEqual({ x: 32.5, y: 32.5 });
    expect(forwardSelectionPoint(skewed, 0, 0).x).toBeCloseTo(27.5, 9);
    expect(forwardSelectionPoint(skewed, 5, 5).x).toBeCloseTo(37.5, 9);
    expect(selectionMatrixDeterminant(skewed)).toBeCloseTo(1, 12);
  });

  it("round-trips through the inverse", () => {
    const placed = { ...IDENTITY, rotation: 0.7, scaleX: 1.5, scaleY: 0.8, skewX: 0.3, skewY: -0.2, rotationX: 0, rotationY: 0 };
    for (const [x, y] of [
      [0, 0],
      [5, 0],
      [2.5, 2.5],
      [5, 5],
      [1.25, 3.75],
    ]) {
      const forward = forwardSelectionPoint(placed, x, y);
      const back = inverseSelectionPoint(placed, forward.x, forward.y);
      expect(back?.x).toBeCloseTo(x, 9);
      expect(back?.y).toBeCloseTo(y, 9);
    }
  });

  it("detects degenerate shear", () => {
    expect(isSelectionDegenerate({ ...IDENTITY, skewX: 1, skewY: 1, rotationX: 0, rotationY: 0 })).toBe(true);
    expect(inverseSelectionPoint({ ...IDENTITY, skewX: 1, skewY: 1, rotationX: 0, rotationY: 0 }, 32, 32)).toBeNull();
    expect(isSelectionDegenerate({ ...IDENTITY, skewX: 2, skewY: 0.4, rotationX: 0, rotationY: 0 })).toBe(false);
  });

  it("bounds the transformed corners", () => {
    const box = selectionCornerBox(IDENTITY);
    expect(box).toEqual({ minX: 30, minY: 30, maxX: 35, maxY: 35 });
    const rotated = selectionCornerBox({ ...IDENTITY, rotation: Math.PI / 2 });
    expect(rotated.minX).toBeCloseTo(30, 9);
    expect(rotated.maxX).toBeCloseTo(35, 9);
    expect(selectionLinearMatrix(IDENTITY)).toEqual({ a: 1, b: 0, c: 0, d: 1 });
  });

  it("mirrors buffer coords about the center", () => {
    // flipX swaps left and right; flipY swaps top and bottom.
    expect(forwardSelectionPoint({ ...IDENTITY, flipX: true }, 0, 0)).toEqual({ x: 35, y: 30 });
    expect(forwardSelectionPoint({ ...IDENTITY, flipX: true }, 5, 5)).toEqual({ x: 30, y: 35 });
    expect(forwardSelectionPoint({ ...IDENTITY, flipY: true }, 0, 0)).toEqual({ x: 30, y: 35 });
    expect(forwardSelectionPoint({ ...IDENTITY, flipY: true }, 5, 5)).toEqual({ x: 35, y: 30 });
    // Double mirrors restore the identity map and bbox.
    const both = { ...IDENTITY, flipX: true, flipY: true };
    expect(forwardSelectionPoint(both, 0, 0)).toEqual({ x: 35, y: 35 });
    expect(selectionCornerBox(both)).toEqual({ minX: 30, minY: 30, maxX: 35, maxY: 35 });
    expect(isSelectionDegenerate(both)).toBe(false);
  });

  it("round-trips through mirrors combined with rotation and shear", () => {
    const placed = {
      ...IDENTITY, rotation: 0.7, scaleX: 1.5, scaleY: 0.8,
      skewX: 0.3, skewY: -0.2, flipX: true, flipY: true, rotationX: 0.4, rotationY: -0.3,
    };
    for (const [x, y] of [[0, 0], [5, 0], [2.5, 2.5], [5, 5], [1.25, 3.75]]) {
      const forward = forwardSelectionPoint(placed, x, y);
      const back = inverseSelectionPoint(placed, forward.x, forward.y);
      expect(back?.x).toBeCloseTo(x, 9);
      expect(back?.y).toBeCloseTo(y, 9);
    }
  });

  it("tilts the selection with foreshortening and reports the scaled determinant", () => {
    const tiltX = { ...IDENTITY, rotationX: Math.PI / 6 };
    const top = forwardSelectionPoint(tiltX, 2.5, 0);
    expect(top.x).toBeCloseTo(32.5, 9);
    expect(top.y).toBeCloseTo(32.5 - 2.5 * Math.cos(Math.PI / 6), 9);
    expect(selectionMatrixDeterminant(tiltX)).toBeCloseTo(Math.cos(Math.PI / 6), 12);
    const tiltY = { ...IDENTITY, rotationY: Math.PI / 6 };
    const right = forwardSelectionPoint(tiltY, 5, 2.5);
    expect(right.x).toBeCloseTo(32.5 + 2.5 * Math.cos(Math.PI / 6), 9);
    expect(right.y).toBeCloseTo(32.5, 9);
    // Edge-on tilt is degenerate.
    expect(isSelectionDegenerate({ ...IDENTITY, rotationX: Math.PI / 2 })).toBe(true);
  });

  it("clips paint to the selection mask", () => {
    const mask = new Uint8Array(5 * 5).fill(255);
    // 5x5 box centered at (32.5, 32.5): layer pixels 30..34 are inside.
    for (const [x, y] of [[30, 30], [34, 34], [32, 30], [30, 34]] as Array<[number, number]>) {
      expect(selectionMaskAt(mask, 5, 5, false, IDENTITY, x, y)).toBe(true);
    }
    for (const [x, y] of [[29, 30], [30, 29], [35, 34], [34, 35], [0, 0]] as Array<[number, number]>) {
      expect(selectionMaskAt(mask, 5, 5, false, IDENTITY, x, y)).toBe(false);
    }
    // Holes in the mask block paint.
    mask[2 * 5 + 2] = 0;
    expect(selectionMaskAt(mask, 5, 5, false, IDENTITY, 32, 32)).toBe(false);
    expect(selectionMaskAt(mask, 5, 5, false, IDENTITY, 31, 32)).toBe(true);
    // maskFull skips the lookup.
    expect(selectionMaskAt(new Uint8Array(25), 5, 5, true, IDENTITY, 32, 32)).toBe(true);
    expect(selectionMaskAt(new Uint8Array(25), 5, 5, true, IDENTITY, 29, 32)).toBe(false);
    // Degenerate placements match nothing (like the merge).
    expect(selectionMaskAt(mask, 5, 5, false, { ...IDENTITY, scaleX: 0 }, 32, 32)).toBe(false);
  });

  it("maps translated, flipped and rotated selections", () => {
    const mask = new Uint8Array(5 * 5).fill(255);
    const moved = { ...IDENTITY, cx: 35.5, cy: 35.5 };
    expect(selectionMaskAt(mask, 5, 5, false, moved, 33, 33)).toBe(true);
    expect(selectionMaskAt(mask, 5, 5, false, moved, 30, 30)).toBe(false);
    // A single top-left bit mirrors to the right edge under flipX.
    const single = new Uint8Array(25);
    single[0] = 255;
    expect(selectionMaskAt(single, 5, 5, false, IDENTITY, 30, 30)).toBe(true);
    expect(selectionMaskAt(single, 5, 5, false, IDENTITY, 34, 30)).toBe(false);
    expect(selectionMaskAt(single, 5, 5, false, { ...IDENTITY, flipX: true }, 34, 30)).toBe(true);
    expect(selectionMaskAt(single, 5, 5, false, { ...IDENTITY, flipX: true }, 30, 30)).toBe(false);
    // A 90-degree turn of a square box covers the same pixels.
    const turned = { ...IDENTITY, rotation: Math.PI / 2 };
    for (let y = 30; y <= 34; y += 1) {
      for (let x = 30; x <= 34; x += 1) {
        expect(selectionMaskAt(mask, 5, 5, false, turned, x, y)).toBe(true);
      }
    }
  });

  it("tester agrees with the per-call check on a skewed placement", () => {
    const mask = new Uint8Array(6 * 4);
    for (let i = 0; i < mask.length; i += 1) {
      mask[i] = i % 3 === 0 ? 0 : 255;
    }
    const placement = { ...IDENTITY, width: 6, height: 4, skewX: 0.25, rotation: 0.3 };
    const test = selectionMaskTester(mask, 6, 4, false, placement);
    for (let y = 25; y <= 40; y += 1) {
      for (let x = 25; x <= 40; x += 1) {
        expect(test(x, y)).toBe(selectionMaskAt(mask, 6, 4, false, placement, x, y));
      }
    }
  });
});
