import { describe, expect, it } from "vitest";
import { isValidTilePlacement, tileLineCells, tileRectCells, wrappedTileBlits } from "../src/tilemap/GnumarusTilemap";

describe("GnumarusTilemap", () => {
  it("emits a single blit for fully inside tiles", () => {
    expect(wrappedTileBlits(0, 0, 16, 16, 64, 64)).toEqual([{ sx: 0, sy: 0, w: 16, h: 16, dx: 0, dy: 0 }]);
    expect(wrappedTileBlits(32, 48, 16, 8, 64, 64)).toEqual([{ sx: 32, sy: 48, w: 16, h: 8, dx: 0, dy: 0 }]);
  });

  it("wraps tiles crossing the right and bottom texture edges", () => {
    expect(wrappedTileBlits(56, 0, 16, 16, 64, 64)).toEqual([
      { sx: 56, sy: 0, w: 8, h: 16, dx: 0, dy: 0 },
      { sx: 0, sy: 0, w: 8, h: 16, dx: 8, dy: 0 },
    ]);
    const blits = wrappedTileBlits(60, 60, 16, 16, 64, 64);
    expect(blits).toHaveLength(4);
    expect(blits.reduce((sum, blit) => sum + blit.w * blit.h, 0)).toBe(256);
  });

  it("wraps negative origins back into the texture", () => {
    expect(wrappedTileBlits(-8, -8, 16, 16, 64, 64)).toEqual([
      { sx: 56, sy: 56, w: 8, h: 8, dx: 0, dy: 0 },
      { sx: 0, sy: 56, w: 8, h: 8, dx: 8, dy: 0 },
      { sx: 56, sy: 0, w: 8, h: 8, dx: 0, dy: 8 },
      { sx: 0, sy: 0, w: 8, h: 8, dx: 8, dy: 8 },
    ]);
  });

  it("repeats textures smaller than the tile", () => {
    const blits = wrappedTileBlits(0, 0, 16, 16, 8, 8);
    expect(blits).toHaveLength(4);
    expect(blits.reduce((sum, blit) => sum + blit.w * blit.h, 0)).toBe(256);
  });

  it("rejects degenerate inputs", () => {
    expect(wrappedTileBlits(0, 0, 0, 16, 64, 64)).toEqual([]);
    expect(wrappedTileBlits(0, 0, 16, 16, 0, 64)).toEqual([]);
    expect(wrappedTileBlits(0.5, 0, 16, 16, 64, 64)).toEqual([]);
  });

  it("validates tile placements", () => {
    expect(isValidTilePlacement({ x: 1, y: -2, tx: 0, ty: 3, flipH: true, flipV: false, rot: 90 })).toBe(true);
    expect(isValidTilePlacement({ x: 1.5, y: 0, tx: 0, ty: 0, flipH: false, flipV: false, rot: 0 })).toBe(false);
    expect(isValidTilePlacement({ x: 0, y: 0, tx: 0, ty: 0, flipH: false, flipV: false, rot: 45 })).toBe(false);
    expect(isValidTilePlacement({ x: 0, y: 0, tx: 0, ty: 0, flipH: 0, flipV: false, rot: 0 })).toBe(false);
    expect(isValidTilePlacement(null)).toBe(false);
  });

  it("walks grid lines with integer bresenham without gaps", () => {
    expect(tileLineCells(2, 2, 2, 2)).toEqual([{ x: 2, y: 2 }]);
    expect(tileLineCells(0, 0, 3, 0)).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ]);
    expect(tileLineCells(1, 1, 1, 3)).toEqual([
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 1, y: 3 },
    ]);
    const diagonal = tileLineCells(0, 0, 3, 3);
    expect(diagonal).toHaveLength(4);
    expect(diagonal[0]).toEqual({ x: 0, y: 0 });
    expect(diagonal[3]).toEqual({ x: 3, y: 3 });
    for (let i = 1; i < diagonal.length; i += 1) {
      const prev = diagonal[i - 1];
      const current = diagonal[i];
      expect(Math.abs((current?.x ?? 0) - (prev?.x ?? 0)) + Math.abs((current?.y ?? 0) - (prev?.y ?? 0))).toBeLessThanOrEqual(2);
    }
    // Reversed walks cover the same cells in reverse order.
    expect(tileLineCells(3, 0, 0, 0)).toEqual([
      { x: 3, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 0 },
    ]);
    // Steep lines stay 8-connected from start to end.
    const steep = tileLineCells(0, 0, 2, 5);
    expect(steep[0]).toEqual({ x: 0, y: 0 });
    expect(steep[steep.length - 1]).toEqual({ x: 2, y: 5 });
    for (let i = 1; i < steep.length; i += 1) {
      const prev = steep[i - 1];
      const current = steep[i];
      expect(Math.abs((current?.x ?? 0) - (prev?.x ?? 0))).toBeLessThanOrEqual(1);
      expect(Math.abs((current?.y ?? 0) - (prev?.y ?? 0))).toBeLessThanOrEqual(1);
    }
  });

  it("fills grid rectangles inclusive in row-major order", () => {
    expect(tileRectCells(1, 1, 1, 1)).toEqual([{ x: 1, y: 1 }]);
    expect(tileRectCells(0, 0, 1, 1)).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ]);
    // Corner order does not matter.
    expect(tileRectCells(1, 1, 0, 0)).toEqual(tileRectCells(0, 0, 1, 1));
    expect(tileRectCells(2, 3, 0, 1)).toHaveLength(3 * 3);
  });
});
