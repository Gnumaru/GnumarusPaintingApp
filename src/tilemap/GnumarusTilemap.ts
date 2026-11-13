/**
 * Pure tilemap helpers: grid placement types plus the wrap-around tile
 * blit math (unit-testable without a canvas). Tiles live on an integer
 * grid from the top-left origin; tileset references wrap modulo the
 * texture, so out-of-bounds or partial tiles repeat instead of clipping.
 */

export type GnumarusTileRotation = 0 | 90 | 180 | 270;

/** One painted tile: grid cell plus tileset cell plus per-tile transform. */
export interface GnumarusTilePlacement {
  /** Grid column (integer, may be negative). */
  x: number;
  /** Grid row (integer, may be negative). */
  y: number;
  /** Tileset tile column (integer, wraps). */
  tx: number;
  /** Tileset tile row (integer, wraps). */
  ty: number;
  flipH: boolean;
  flipV: boolean;
  rot: GnumarusTileRotation;
}

/** One axis-aligned wrapped blit: source rect plus destination offset. */
export interface GnumarusTileBlit {
  sx: number;
  sy: number;
  w: number;
  h: number;
  dx: number;
  dy: number;
}

/** Tile rotation steps accepted by the format; anything else is invalid. */
export const GNUMARUS_TILE_ROTATIONS: readonly number[] = [0, 90, 180, 270];

/** Minimum/maximum tile edge in pixels. */
export const GNUMARUS_TILE_MIN_DIMENSION = 1;
export const GNUMARUS_TILE_MAX_DIMENSION = 1024;

/** Default tile size in pixels. */
export const GNUMARUS_TILE_DEFAULT_SIZE = 16;

function positiveModulo(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}

/**
 * Split a (possibly out-of-bounds, possibly oversized) tile source rect
 * into axis-aligned blits against a wrapping texture. The blits tile the
 * destination `[0, tw] x [0, th]` area exactly; callers add the cell
 * origin. Empty when any dimension is degenerate.
 */
export function wrappedTileBlits(
  sx: number,
  sy: number,
  tw: number,
  th: number,
  texW: number,
  texH: number,
): GnumarusTileBlit[] {
  if (!Number.isInteger(tw) || !Number.isInteger(th) || tw < 1 || th < 1) {
    return [];
  }
  if (!Number.isInteger(texW) || !Number.isInteger(texH) || texW < 1 || texH < 1) {
    return [];
  }
  if (!Number.isInteger(sx) || !Number.isInteger(sy)) {
    return [];
  }
  interface Span {
    from: number;
    length: number;
    to: number;
  }
  const splitAxis = (start: number, length: number, extent: number): Span[] => {
    const spans: Span[] = [];
    let cursor = positiveModulo(start, extent);
    let remaining = length;
    let placed = 0;
    while (remaining > 0) {
      const take = Math.min(remaining, extent - cursor);
      spans.push({ from: cursor, length: take, to: placed });
      remaining -= take;
      placed += take;
      cursor = 0;
    }
    return spans;
  };
  const out: GnumarusTileBlit[] = [];
  for (const vertical of splitAxis(sy, th, texH)) {
    for (const horizontal of splitAxis(sx, tw, texW)) {
      out.push({
        sx: horizontal.from,
        sy: vertical.from,
        w: horizontal.length,
        h: vertical.length,
        dx: horizontal.to,
        dy: vertical.to,
      });
    }
  }
  return out;
}

/** One grid cell address. */
export interface GnumarusTileCell {
  x: number;
  y: number;
}

/**
 * Grid cells on the segment from (x0, y0) to (x1, y1), inclusive, walked
 * with integer Bresenham so fast drags never skip a slot. The endpoints
 * may be given in any order; the walk always starts at (x0, y0).
 */
export function tileLineCells(x0: number, y0: number, x1: number, y1: number): GnumarusTileCell[] {
  const cells: GnumarusTileCell[] = [];
  let x = Math.trunc(x0);
  let y = Math.trunc(y0);
  const endX = Math.trunc(x1);
  const endY = Math.trunc(y1);
  const dx = Math.abs(endX - x);
  const dy = -Math.abs(endY - y);
  const sx = x < endX ? 1 : -1;
  const sy = y < endY ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    cells.push({ x, y });
    if (x === endX && y === endY) {
      break;
    }
    const doubled = 2 * err;
    if (doubled >= dy) {
      err += dy;
      x += sx;
    }
    if (doubled <= dx) {
      err += dx;
      y += sy;
    }
  }
  return cells;
}

/**
 * Every grid cell inside the filled rectangle with opposite corners
 * (x0, y0) and (x1, y1), inclusive, in row-major order. Corners may be
 * given in any order.
 */
export function tileRectCells(x0: number, y0: number, x1: number, y1: number): GnumarusTileCell[] {
  const minX = Math.min(Math.trunc(x0), Math.trunc(x1));
  const maxX = Math.max(Math.trunc(x0), Math.trunc(x1));
  const minY = Math.min(Math.trunc(y0), Math.trunc(y1));
  const maxY = Math.max(Math.trunc(y0), Math.trunc(y1));
  const cells: GnumarusTileCell[] = [];
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      cells.push({ x, y });
    }
  }
  return cells;
}
/** True for plain-object tile placements with valid field types/ranges. */
export function isValidTilePlacement(value: unknown): value is GnumarusTilePlacement {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const placement = value as Record<string, unknown>;
  return (
    Number.isInteger(placement["x"]) &&
    Number.isInteger(placement["y"]) &&
    Number.isInteger(placement["tx"]) &&
    Number.isInteger(placement["ty"]) &&
    typeof placement["flipH"] === "boolean" &&
    typeof placement["flipV"] === "boolean" &&
    (placement["rot"] === 0 || placement["rot"] === 90 || placement["rot"] === 180 || placement["rot"] === 270)
  );
}
