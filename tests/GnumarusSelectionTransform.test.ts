import { describe, expect, it } from "vitest";
import {
  forwardSelectionPoint,
  inverseSelectionPoint,
  isSelectionDegenerate,
  selectionCornerBox,
  selectionLinearMatrix,
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
    const placed = { ...IDENTITY, rotation: 0.7, scaleX: 1.5, scaleY: 0.8, skewX: 0.3, skewY: -0.2 };
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
    expect(isSelectionDegenerate({ ...IDENTITY, skewX: 1, skewY: 1 })).toBe(true);
    expect(inverseSelectionPoint({ ...IDENTITY, skewX: 1, skewY: 1 }, 32, 32)).toBeNull();
    expect(isSelectionDegenerate({ ...IDENTITY, skewX: 2, skewY: 0.4 })).toBe(false);
  });

  it("bounds the transformed corners", () => {
    const box = selectionCornerBox(IDENTITY);
    expect(box).toEqual({ minX: 30, minY: 30, maxX: 35, maxY: 35 });
    const rotated = selectionCornerBox({ ...IDENTITY, rotation: Math.PI / 2 });
    expect(rotated.minX).toBeCloseTo(30, 9);
    expect(rotated.maxX).toBeCloseTo(35, 9);
    expect(selectionLinearMatrix(IDENTITY)).toEqual({ a: 1, b: 0, c: 0, d: 1 });
  });
});
