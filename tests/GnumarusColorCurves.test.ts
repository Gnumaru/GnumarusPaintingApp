import { describe, expect, it } from "vitest";
import {
  addCurveNode,
  colorCurveLookup,
  curveValueAt,
  defaultColorCurve,
  moveCurveHandle,
  moveCurveNode,
  nearestCurvePoint,
  normalizeColorCurve,
  removeCurveNode,
} from "../src/color/GnumarusColorCurves";

describe("defaultColorCurve", () => {
  it("is the identity diagonal with locked endpoints", () => {
    const curve = defaultColorCurve();
    expect(curve).toHaveLength(2);
    expect(curve[0]).toMatchObject({ x: 0, y: 0 });
    expect(curve[1]).toMatchObject({ x: 1, y: 1 });
    const lut = colorCurveLookup(curve);
    expect(lut).toHaveLength(256);
    for (let i = 0; i < 256; i += 1) {
      // Diagonal maps every tone to itself (within rounding).
      expect(Math.abs((lut[i] ?? 0) - i)).toBeLessThanOrEqual(2);
    }
  });
});

describe("normalizeColorCurve", () => {
  it("falls back to identity on garbage", () => {
    expect(normalizeColorCurve(null)).toEqual(defaultColorCurve());
    expect(normalizeColorCurve("nope")).toEqual(defaultColorCurve());
    expect(normalizeColorCurve([{ x: 0.5 }])).toEqual(defaultColorCurve());
  });

  it("clamps, sorts and locks endpoints", () => {
    const curve = normalizeColorCurve([
      { x: 0.9, y: 0.2, hx0: 9, hy0: -9, hx1: 0.9, hy1: 0.2 },
      { x: 0.1, y: 1.5, hx0: 0.1, hy0: 1.5, hx1: 0.1, hy1: 1.5 },
    ]);
    expect(curve.map((node) => node.x)).toEqual([0, 1]);
    expect(curve[0]?.y).toBe(1);
    expect(curve[1]?.y).toBe(0.2);
    expect(curve[0]?.hx0).toBe(0.1);
    expect(curve[0]?.hy0).toBe(1);
  });
});

describe("curve editing ops", () => {
  it("adds nodes sorted with smooth handles", () => {
    const added = addCurveNode(defaultColorCurve(), 0.5, 0.75);
    expect(added).toHaveLength(3);
    expect(added[1]).toMatchObject({ x: 0.5, y: 0.75 });
    // Same reference when too close to an existing node or outside (0, 1).
    const base = defaultColorCurve();
    expect(addCurveNode(base, 0.0001, 0.5)).toBe(base);
    expect(addCurveNode(base, 0, 0.5)).toBe(base);
    expect(addCurveNode(base, 1, 0.5)).toBe(base);
  });

  it("refuses to remove endpoints or the last pair", () => {
    const curve = addCurveNode(defaultColorCurve(), 0.5, 0.5);
    expect(removeCurveNode(curve, 0)).toBe(curve);
    expect(removeCurveNode(curve, 2)).toBe(curve);
    const base = defaultColorCurve();
    expect(removeCurveNode(base, 0)).toBe(base);
    const removed = removeCurveNode(curve, 1);
    expect(removed).toHaveLength(2);
  });

  it("moves nodes clamped between neighbors, endpoints keep x", () => {
    const curve = addCurveNode(addCurveNode(defaultColorCurve(), 0.3, 0.3), 0.7, 0.7);
    const moved = moveCurveNode(curve, 1, 0.9, 0.1);
    expect(moved[1]?.x).toBeLessThan(0.7);
    expect(moved[1]?.y).toBe(0.1);
    const ends = moveCurveNode(moveCurveNode(curve, 0, 0.4, 0.4), 3, 0.6, 0.6);
    expect(ends[0]?.x).toBe(0);
    expect(ends[3]?.x).toBe(1);
  });

  it("moves handles independently inside the unit box", () => {
    const curve = addCurveNode(defaultColorCurve(), 0.5, 0.5);
    const moved = moveCurveHandle(curve, 1, 0, 0.4, 0.9);
    expect(moved[1]).toMatchObject({ hx0: 0.4, hy0: 0.9 });
    expect(moved[1]?.hx1).not.toBe(0.4);
    const clamped = moveCurveHandle(curve, 1, 1, 9, -9);
    expect(clamped[1]).toMatchObject({ hx1: 1, hy1: 0 });
  });
});

describe("curve evaluation", () => {
  it("evaluates darkening and inverting curves", () => {
    // Pull the white endpoint down: highlights darken.
    const dark = moveCurveNode(defaultColorCurve(), 1, 1, 0.5);
    expect(curveValueAt(dark, 1)).toBeCloseTo(0.5, 2);
    expect(curveValueAt(dark, 0)).toBeCloseTo(0, 2);
    const lut = colorCurveLookup(dark);
    expect(lut[255]).toBe(128);
    expect(lut[0]).toBe(0);
    // Swap endpoints vertically: output inverts.
    const invert = moveCurveNode(moveCurveNode(defaultColorCurve(), 0, 0, 1), 1, 1, 0);
    const invLut = colorCurveLookup(invert);
    expect(invLut[0]).toBe(255);
    expect(invLut[255]).toBe(0);
  });

  it("fills every LUT entry without gaps", () => {
    const steep = addCurveNode(defaultColorCurve(), 0.5, 0.9);
    const lut = colorCurveLookup(steep);
    expect(lut).toHaveLength(256);
    for (const value of lut) {
      expect(Number.isFinite(value)).toBe(true);
    }
  });

  it("finds the nearest curve point", () => {
    const near = nearestCurvePoint(defaultColorCurve(), 0.5, 0.9);
    expect(near.dist).toBeGreaterThan(0.2);
    const on = nearestCurvePoint(defaultColorCurve(), 0.5, 0.5);
    expect(on.dist).toBeLessThan(0.05);
  });
});
