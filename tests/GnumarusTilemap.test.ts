import { describe, expect, it } from "vitest";
import { isValidTilePlacement, wrappedTileBlits } from "../src/tilemap/GnumarusTilemap";

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
});
