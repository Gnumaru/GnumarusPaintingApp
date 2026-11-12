import { describe, expect, it } from "vitest";
import {
  bayerThreshold,
  ellipseOutlinePoints,
  ellipseRowExtent,
  fillEllipseRows,
  fillPolygonRows,
  fillRectRows,
  gradientLinearT,
  gradientRadialT,
  walkRectOutline,
} from "../src/shapes/GnumarusShapes";

describe("GnumarusShapes", () => {
  it("walks a rectangular outline without duplicate corners", () => {
    const pixels = walkRectOutline(0, 0, 3, 2);
    // Perimeter of a 4x3 box: 2*4 + 2*3 - 4 shared corners = 10.
    expect(pixels).toHaveLength(10);
    expect(pixels).toContainEqual({ x: 0, y: 0 });
    expect(pixels).toContainEqual({ x: 3, y: 2 });
    expect(pixels).toContainEqual({ x: 0, y: 2 });
    expect(pixels).toContainEqual({ x: 3, y: 0 });
  });

  it("walks the same outline regardless of corner order", () => {
    const forward = walkRectOutline(1, 1, 4, 5);
    const backward = walkRectOutline(4, 5, 1, 1);
    expect([...forward].sort((a, b) => a.y - b.y || a.x - b.x)).toEqual(
      [...backward].sort((a, b) => a.y - b.y || a.x - b.x),
    );
  });

  it("fills rect rows covering the full box", () => {
    const rows = fillRectRows(2, 3, 4, 4);
    expect(rows).toEqual([
      { y: 3, x0: 2, x1: 4 },
      { y: 4, x0: 2, x1: 4 },
    ]);
  });

  it("measures ellipse row extents symmetrically", () => {
    expect(ellipseRowExtent(0, 0, 4, 2, 0)).toEqual([-4, 4]);
    expect(ellipseRowExtent(0, 0, 4, 2, 2)).toEqual([0, 0]);
    expect(ellipseRowExtent(0, 0, 4, 2, 3)).toBeNull();
    expect(ellipseRowExtent(0, 0, 0, 2, 0)).toBeNull();
  });

  it("fills ellipse rows symmetric about both axes", () => {
    const rows = fillEllipseRows(10, 10, 3, 2);
    expect(rows.length).toBeGreaterThan(0);
    const middle = rows.find((row) => row.y === 10);
    expect(middle).toEqual({ y: 10, x0: 7, x1: 13 });
    for (const row of rows) {
      const mirror = rows.find((other) => other.y === 20 - row.y);
      expect(mirror).toEqual(row.y === 10 ? row : { y: 20 - row.y, x0: row.x0, x1: row.x1 });
    }
  });

  it("samples ellipse outline points on the curve", () => {
    const points = ellipseOutlinePoints(5, 5, 4, 2);
    expect(points.length).toBeGreaterThanOrEqual(8);
    for (const point of points) {
      const normalized = ((point.x - 5) / 4) ** 2 + ((point.y - 5) / 2) ** 2;
      expect(normalized).toBeCloseTo(1, 5);
    }
  });

  it("fills polygons with the even-odd rule", () => {
    const rows = fillPolygonRows([
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 4 },
      { x: 0, y: 4 },
    ]);
    expect(rows).toHaveLength(4);
    expect(rows[0]).toEqual({ y: 0, x0: 0, x1: 4 });
    // A dented (concave) polygon excludes the dent row segment.
    const dented = fillPolygonRows([
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 4 },
      { x: 2, y: 2 },
      { x: 0, y: 4 },
    ]);
    expect(dented.length).toBeGreaterThan(0);
    expect(dented.every((row) => row.x1 >= row.x0)).toBe(true);
  });

  it("rejects degenerate polygons", () => {
    expect(fillPolygonRows([])).toEqual([]);
    expect(fillPolygonRows([{ x: 0, y: 0 }])).toEqual([]);
    expect(
      fillPolygonRows([
        { x: 0, y: 0 },
        { x: Number.NaN, y: 0 },
        { x: 1, y: 1 },
      ]),
    ).toEqual([]);
  });

  it("spreads Bayer thresholds evenly over 0..1", () => {
    const values = new Set<number>();
    for (let y = 0; y < 4; y += 1) {
      for (let x = 0; x < 4; x += 1) {
        values.add(bayerThreshold(x, y));
      }
    }
    expect(values.size).toBe(16);
    expect(Math.min(...values)).toBe(0);
    expect(Math.max(...values)).toBeLessThan(1);
    expect(bayerThreshold(4, 0)).toBe(bayerThreshold(0, 0));
    expect(bayerThreshold(-1, -1)).toBe(bayerThreshold(3, 3));
  });

  it("projects linear and radial gradient positions", () => {
    expect(gradientLinearT(5, 0, 0, 0, 10, 0)).toBeCloseTo(0.5, 9);
    expect(gradientLinearT(-5, 0, 0, 0, 10, 0)).toBe(0);
    expect(gradientLinearT(50, 0, 0, 0, 10, 0)).toBe(1);
    expect(gradientLinearT(5, 5, 3, 3, 3, 3)).toBe(0);
    expect(gradientRadialT(3, 4, 0, 0, 10, 0)).toBeCloseTo(0.5, 9);
    expect(gradientRadialT(30, 0, 0, 0, 10, 0)).toBe(1);
    expect(gradientRadialT(0, 0, 0, 0, 0, 0)).toBe(0);
  });
});
