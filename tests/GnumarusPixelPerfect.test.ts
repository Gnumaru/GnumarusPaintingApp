import { describe, expect, it } from "vitest";
import { drawCubicBezier, drawPixelLine } from "../src/canvas/GnumarusPixelBuffer";
import {
  GNUMARUS_PIXEL_PERFECT_RECENT_WINDOW,
  GnumarusPixelPerfectStroke,
  countPixelPerfectNeighbors,
  walkBresenhamLinePixels,
  walkCubicBezierPixels,
} from "../src/canvas/GnumarusPixelPerfect";

function collectLine(x0: number, y0: number, x1: number, y1: number): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  walkBresenhamLinePixels(x0, y0, x1, y1, (x: number, y: number): void => {
    points.push({ x, y });
  });
  return points;
}

function paintSet(pixels: Array<{ x: number; y: number }>): Set<string> {
  return new Set(pixels.map((point) => `${point.x},${point.y}`));
}

function maxNeighbors(pixels: Array<{ x: number; y: number }>): number {
  const set = paintSet(pixels);
  let max = 0;
  for (const point of pixels) {
    max = Math.max(max, countPixelPerfectNeighbors(set, point.x, point.y));
  }
  return max;
}

function maxNeighborsOf(stroke: GnumarusPixelPerfectStroke): number {
  return maxNeighbors(stroke.pixels());
}

describe("walkBresenhamLinePixels", () => {
  it("visits the same pixels as drawPixelLine", () => {
    const cases: Array<[number, number, number, number]> = [
      [0, 0, 5, 0],
      [0, 0, 0, 5],
      [0, 0, 5, 5],
      [0, 0, 5, 2],
      [5, 2, 0, 0],
      [2, 5, 2, 0],
      [-3, -2, 4, 6],
    ];
    for (const [x0, y0, x1, y1] of cases) {
      const visited = new Set(collectLine(x0, y0, x1, y1).map((point) => `${point.x},${point.y}`));
      const buffer = new Uint8ClampedArray(32 * 32 * 4);
      drawPixelLine(
        buffer,
        32,
        32,
        x0 + 8,
        y0 + 8,
        x1 + 8,
        y1 + 8,
        { r: 255, g: 0, b: 0, a: 255 },
      );
      const painted = new Set<string>();
      for (let y = 0; y < 32; y += 1) {
        for (let x = 0; x < 32; x += 1) {
          if (buffer[(y * 32 + x) * 4 + 3] === 255) {
            painted.add(`${x - 8},${y - 8}`);
          }
        }
      }
      expect(visited).toEqual(painted);
    }
  });
});

describe("walkCubicBezierPixels", () => {
  it("visits the same pixels as drawCubicBezier without anti-aliasing", () => {
    const points = {
      p0: { x: 1, y: 4 },
      c1: { x: 2, y: 1 },
      c2: { x: 5, y: 6 },
      p3: { x: 6, y: 4 },
    };
    const visited = new Set<string>();
    walkCubicBezierPixels(points, (x: number, y: number): void => {
      visited.add(`${x},${y}`);
    });
    const buffer = new Uint8ClampedArray(16 * 16 * 4);
    drawCubicBezier(
      buffer,
      16,
      16,
      points.p0,
      points.c1,
      points.c2,
      points.p3,
      1,
      "square",
      false,
      { r: 255, g: 0, b: 0, a: 255 },
    );
    const painted = new Set<string>();
    for (let y = 0; y < 16; y += 1) {
      for (let x = 0; x < 16; x += 1) {
        if (buffer[(y * 16 + x) * 4 + 3] === 255) {
          painted.add(`${x},${y}`);
        }
      }
    }
    expect(visited).toEqual(painted);
  });
});

describe("GnumarusPixelPerfectStroke", () => {
  it("keeps straight and diagonal lines intact", () => {
    const stroke = new GnumarusPixelPerfectStroke();
    const line = collectLine(0, 0, 6, 0);
    const kept = line.filter((point) => stroke.add(point.x, point.y));
    expect(kept).toEqual(line);
    expect(maxNeighbors(kept)).toBeLessThanOrEqual(2);
  });

  it("turns a tight square corner into a diagonal by eating the elbow", () => {
    const stroke = new GnumarusPixelPerfectStroke();
    for (const point of collectLine(0, 0, 2, 0)) {
      expect(stroke.add(point.x, point.y)).toBe(true);
    }
    expect(stroke.add(2, 1)).toBe(true);
    expect(stroke.add(2, 2)).toBe(true);
    // (1, 2) would overload (2, 1): the local elbows are eaten instead,
    // turning both square corners into diagonals.
    expect(stroke.add(1, 2)).toBe(true);
    expect(stroke.has(2, 0)).toBe(false);
    expect(stroke.has(2, 2)).toBe(false);
    expect(stroke.has(1, 2)).toBe(true);
    const removed = stroke.drainRemoved();
    expect(removed).toEqual([
      { x: 2, y: 0 },
      { x: 2, y: 2 },
    ]);
    expect(stroke.add(0, 2)).toBe(true);
    expect(maxNeighborsOf(stroke)).toBeLessThanOrEqual(2);
  });

  it("turns a stair inner corner into a diagonal by eating the elbow", () => {
    const stroke = new GnumarusPixelPerfectStroke();
    expect(stroke.add(0, 0)).toBe(true);
    expect(stroke.add(1, 0)).toBe(true);
    expect(stroke.add(1, 1)).toBe(true);
    // (2, 1) would give (1, 1) a third neighbor: eat (1, 1) instead.
    expect(stroke.add(2, 1)).toBe(true);
    expect(stroke.has(1, 1)).toBe(false);
    expect(stroke.has(2, 1)).toBe(true);
    expect(maxNeighborsOf(stroke)).toBeLessThanOrEqual(2);
  });

  it("always paints crossings and revisits, allowing more than 2 neighbors", () => {
    const stroke = new GnumarusPixelPerfectStroke();
    for (const point of collectLine(0, 2, 4, 2)) {
      expect(stroke.add(point.x, point.y)).toBe(true);
    }
    // Vertical line crossing the horizontal one: touches old pixels.
    let painted = 0;
    for (const point of collectLine(2, 0, 2, 4)) {
      if (stroke.add(point.x, point.y)) {
        painted += 1;
      }
    }
    expect(painted).toBe(5);
    // Exact revisit of an old pixel always paints.
    expect(stroke.add(0, 2)).toBe(true);
    expect(GNUMARUS_PIXEL_PERFECT_RECENT_WINDOW).toBe(4);
  });

  it("tracks out-of-bounds candidates without failing", () => {
    const stroke = new GnumarusPixelPerfectStroke();
    expect(stroke.add(-5, -5)).toBe(true);
    expect(stroke.add(-4, -5)).toBe(true);
    expect(stroke.has(-5, -5)).toBe(true);
    expect(stroke.size).toBe(2);
    stroke.reset();
    expect(stroke.size).toBe(0);
    expect(stroke.has(-5, -5)).toBe(false);
  });
});
