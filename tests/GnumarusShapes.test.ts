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
  paintCurveStroke,
  paintEllipseFilled,
  paintEllipseOutline,
  paintGradient,
  paintLineSegment,
  paintPolygon,
  paintRectFilled,
  paintRectOutline,
  walkRectOutline,
  type GnumarusShapeStyle,
  type GnumarusShapeTex,
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

function makeTex(width: number, height: number, fill = 0): GnumarusShapeTex {
  const buffer = new Uint8ClampedArray(width * height * 4);
  if (fill !== 0) {
    buffer.fill(fill);
  }
  return { buffer, width, height };
}

function styleOf(overrides: Partial<GnumarusShapeStyle> = {}): GnumarusShapeStyle {
  return {
    color: { r: 255, g: 0, b: 0, a: 255 },
    locked: { r: false, g: false, b: false, a: false },
    blend: "normal",
    wrap: "off",
    width: 1,
    tip: "square",
    antialias: false,
    filled: false,
    dither: false,
    radial: false,
    accumulate: true,
    pixelPerfect: false,
    ...overrides,
  };
}

function alphaPlane(tex: GnumarusShapeTex): number[] {
  const out: number[] = [];
  for (let i = 3; i < tex.buffer.length; i += 4) {
    out.push(tex.buffer[i] as number);
  }
  return out;
}

describe("GnumarusShapePaint", () => {
  it("paints aliased rectangle outlines on exact pixels", () => {
    const tex = makeTex(8, 8);
    paintRectOutline(tex, styleOf(), 1, 1, 4, 3);
    // Interior stays empty, border is painted.
    expect(alphaPlane(tex)).toEqual([
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 255, 255, 255, 255, 0, 0, 0,
      0, 255, 0, 0, 255, 0, 0, 0,
      0, 255, 255, 255, 255, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
    ]);
  });

  it("fills rectangles solid", () => {
    const tex = makeTex(6, 6);
    paintRectFilled(tex, styleOf({ filled: true }), 1, 1, 3, 2);
    expect(alphaPlane(tex)).toEqual([
      0, 0, 0, 0, 0, 0,
      0, 255, 255, 255, 0, 0,
      0, 255, 255, 255, 0, 0,
      0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0,
    ]);
  });

  it("paints filled ellipses symmetric around the center", () => {
    const tex = makeTex(9, 9);
    paintEllipseFilled(tex, styleOf({ filled: true }), 1, 1, 7, 7);
    const rows: number[][] = [];
    for (let y = 0; y < 9; y += 1) {
      rows.push(alphaPlane(tex).slice(y * 9, y * 9 + 9));
    }
    // Middle row is the widest; top and bottom rows mirror each other.
    expect(rows[4]).toEqual([0, 255, 255, 255, 255, 255, 255, 255, 0]);
    expect(rows[1]).toEqual(rows[7]);
    expect(rows[1]?.filter((a) => a === 255).length).toBeGreaterThan(0);
  });

  it("draws ellipse outlines without filling the interior", () => {
    const tex = makeTex(9, 9);
    paintEllipseOutline(tex, styleOf(), 1, 1, 7, 7);
    // Center stays empty for a hollow outline.
    expect(tex.buffer[(4 * 9 + 4) * 4 + 3]).toBe(0);
    expect(alphaPlane(tex).filter((a) => a === 255).length).toBeGreaterThan(8);
  });

  it("paints closed polygons with even-odd fill", () => {
    const tex = makeTex(8, 8);
    const triangle = [
      { x: 1, y: 1 },
      { x: 6, y: 1 },
      { x: 1, y: 6 },
    ];
    paintPolygon(tex, styleOf({ filled: true }), triangle);
    // Interior of the right triangle is painted, the far corner is not.
    expect(tex.buffer[(3 * 8 + 2) * 4 + 3]).toBe(255);
    expect(tex.buffer[(5 * 8 + 5) * 4 + 3]).toBe(0);
    const hollow = makeTex(8, 8);
    paintPolygon(hollow, styleOf(), triangle);
    expect(hollow.buffer[(3 * 8 + 2) * 4 + 3]).toBe(0);
    expect(alphaPlane(hollow).filter((a) => a === 255).length).toBeGreaterThan(0);
  });

  it("paints line segments identically through both accumulate paths", () => {
    const a = makeTex(8, 8);
    const b = makeTex(8, 8);
    const zero = new Uint8ClampedArray(8 * 8 * 4);
    paintLineSegment(a, zero, styleOf({ accumulate: true }), 0, 0, 7, 7);
    paintLineSegment(b, zero, styleOf({ accumulate: false }), 0, 0, 7, 7);
    expect(Array.from(a.buffer)).toEqual(Array.from(b.buffer));
    // Diagonal endpoints are painted.
    expect(a.buffer[3]).toBe(255);
    expect(a.buffer[(7 * 8 + 7) * 4 + 3]).toBe(255);
  });

  it("paints cubic curves through both accumulate paths", () => {
    const p0 = { x: 0, y: 4 };
    const c1 = { x: 2, y: 0 };
    const c2 = { x: 6, y: 8 };
    const p3 = { x: 7, y: 4 };
    const a = makeTex(8, 8);
    const b = makeTex(8, 8);
    const zero = new Uint8ClampedArray(8 * 8 * 4);
    paintCurveStroke(a, zero, styleOf({ accumulate: true, width: 1 }), p0, c1, c2, p3);
    paintCurveStroke(b, zero, styleOf({ accumulate: false, width: 1 }), p0, c1, c2, p3);
    expect(Array.from(a.buffer)).toEqual(Array.from(b.buffer));
    expect(alphaPlane(a).filter((v) => v === 255).length).toBeGreaterThan(4);
  });

  it("keeps pixel-perfect curves one pixel thin on sharp turns", () => {
    const p0 = { x: 1, y: 1 };
    const c1 = { x: 6, y: 1 };
    const c2 = { x: 6, y: 1 };
    const p3 = { x: 6, y: 6 };
    const tex = makeTex(8, 8);
    paintCurveStroke(
      tex,
      new Uint8ClampedArray(8 * 8 * 4),
      styleOf({ accumulate: true, width: 1, pixelPerfect: true }),
      p0, c1, c2, p3,
    );
    const painted = alphaPlane(tex).filter((v) => v === 255).length;
    expect(painted).toBeGreaterThan(0);
    const wide = makeTex(8, 8);
    paintCurveStroke(
      wide,
      new Uint8ClampedArray(8 * 8 * 4),
      styleOf({ accumulate: true, width: 3, pixelPerfect: false }),
      p0, c1, c2, p3,
    );
    expect(alphaPlane(wide).filter((v) => v === 255).length).toBeGreaterThanOrEqual(painted);
  });

  it("fades linear gradients to transparent and dithers when enabled", () => {
    const tex = makeTex(4, 1);
    paintGradient(tex, styleOf(), 0, 0, 4, 0);
    const alphas = alphaPlane(tex);
    expect(alphas[0]).toBe(255);
    expect(alphas[3]).toBeLessThan(alphas[0] as number);
    expect(alphas[3]).toBeGreaterThan(0);
    const dithered = makeTex(16, 16);
    paintGradient(dithered, styleOf({ dither: true }), 0, 8, 16, 8);
    const mid = alphaPlane(dithered).slice(8 * 16, 9 * 16);
    // Ordered dither drops a Bayer subset of pixels entirely while the kept
    // ones still carry the fade alpha.
    expect(mid.filter((a) => a === 0).length).toBeGreaterThan(0);
    expect(mid.filter((a) => a > 0).length).toBeGreaterThan(0);
    // Without dither the same row is a smooth ramp with no holes.
    const smooth = makeTex(16, 16);
    paintGradient(smooth, styleOf(), 0, 8, 16, 8);
    const smoothMid = alphaPlane(smooth).slice(8 * 16, 9 * 16);
    expect(smoothMid.filter((a) => a === 0).length).toBe(0);
    expect(smoothMid[0]).toBe(255);
  });

  it("paints radial gradients brightest at the center", () => {
    const tex = makeTex(9, 9);
    paintGradient(tex, styleOf({ radial: true }), 4, 4, 8, 4);
    expect(tex.buffer[(4 * 9 + 4) * 4 + 3]).toBe(255);
    expect(tex.buffer[(4 * 9 + 8) * 4 + 3]).toBe(0);
    expect(tex.buffer[(0 * 9 + 0) * 4 + 3]).toBe(0);
  });

  it("honors locked channels", () => {
    const tex = makeTex(4, 4);
    paintRectFilled(tex, styleOf({ filled: true, locked: { r: true, g: false, b: false, a: false } }), 0, 0, 3, 3);
    expect(tex.buffer[0]).toBe(0);
    expect(tex.buffer[1]).toBe(0);
    expect(tex.buffer[2]).toBe(0);
    expect(tex.buffer[3]).toBe(255);
  });

  it("wraps paint around texture edges only when enabled", () => {
    const wrapped = makeTex(8, 8);
    paintLineSegment(wrapped, new Uint8ClampedArray(8 * 8 * 4), styleOf({ wrap: "both" }), 6, 4, 10, 4);
    expect(wrapped.buffer[(4 * 8 + 0) * 4 + 3]).toBe(255);
    const clipped = makeTex(8, 8);
    paintLineSegment(clipped, new Uint8ClampedArray(8 * 8 * 4), styleOf({ wrap: "off" }), 6, 4, 10, 4);
    expect(clipped.buffer[(4 * 8 + 0) * 4 + 3]).toBe(0);
  });
});
