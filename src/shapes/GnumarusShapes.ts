/**
 * Pure geometry for the shape paint tools (rectangle, ellipse, polygon
 * outline/fill) and the gradient tool. No DOM or WebGL: every helper is
 * deterministic and unit-tested; the engine only rasterizes the results.
 */
import { walkBresenhamLinePixels } from "../canvas/GnumarusPixelPerfect";

export interface GnumarusPixelPoint {
  x: number;
  y: number;
}

export interface GnumarusPixelRow {
  y: number;
  x0: number;
  x1: number;
}

/** Outline pixels of the axis-aligned rect cornered at the two points. */
export function walkRectOutline(x0: number, y0: number, x1: number, y1: number): GnumarusPixelPoint[] {
  const left = Math.min(x0, x1);
  const right = Math.max(x0, x1);
  const top = Math.min(y0, y1);
  const bottom = Math.max(y0, y1);
  const out: GnumarusPixelPoint[] = [];
  const seen = new Set<number>();
  const push = (x: number, y: number): void => {
    const key = x * 100000 + y;
    if (!seen.has(key)) {
      seen.add(key);
      out.push({ x, y });
    }
  };
  const walk = (ax: number, ay: number, bx: number, by: number): void => {
    walkBresenhamLinePixels(ax, ay, bx, by, (x, y) => push(x, y));
  };
  walk(left, top, right, top);
  walk(left, bottom, right, bottom);
  walk(left, top, left, bottom);
  walk(right, top, right, bottom);
  return out;
}

/** Scanline rows filling the axis-aligned rect cornered at the two points. */
export function fillRectRows(x0: number, y0: number, x1: number, y1: number): GnumarusPixelRow[] {
  const left = Math.min(x0, x1);
  const right = Math.max(x0, x1);
  const top = Math.min(y0, y1);
  const bottom = Math.max(y0, y1);
  const rows: GnumarusPixelRow[] = [];
  for (let y = top; y <= bottom; y += 1) {
    rows.push({ y, x0: left, x1: right });
  }
  return rows;
}

/** Horizontal extent of an axis-aligned ellipse row, or null outside. */
export function ellipseRowExtent(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  y: number,
): [number, number] | null {
  if (!(rx > 0) || !(ry > 0)) {
    return null;
  }
  const dy = (y - cy) / ry;
  const rest = 1 - dy * dy;
  if (rest < 0) {
    return null;
  }
  const dx = rx * Math.sqrt(rest);
  return [Math.ceil(cx - dx), Math.floor(cx + dx)];
}

/** Scanline rows filling an axis-aligned ellipse (zero radii paint a dot/line). */
export function fillEllipseRows(cx: number, cy: number, rx: number, ry: number): GnumarusPixelRow[] {
  const rows: GnumarusPixelRow[] = [];
  if (rx < 0 || ry < 0 || !Number.isFinite(cx) || !Number.isFinite(cy)) {
    return rows;
  }
  const rxi = Math.max(0.5, rx);
  const ryi = Math.max(0.5, ry);
  const top = Math.ceil(cy - ryi);
  const bottom = Math.floor(cy + ryi);
  for (let y = top; y <= bottom; y += 1) {
    const extent = ellipseRowExtent(cx, cy, rxi, ryi, y);
    if (extent !== null && extent[1] >= extent[0]) {
      rows.push({ y, x0: extent[0], x1: extent[1] });
    }
  }
  return rows;
}

/** Sampled polyline points around an axis-aligned ellipse (for outline stroking). */
export function ellipseOutlinePoints(cx: number, cy: number, rx: number, ry: number): GnumarusPixelPoint[] {
  const points: GnumarusPixelPoint[] = [];
  const perimeter = Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
  const steps = Math.max(8, Math.min(256, Math.ceil(perimeter)));
  for (let i = 0; i < steps; i += 1) {
    const angle = (i / steps) * Math.PI * 2;
    points.push({ x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) });
  }
  return points;
}

/** Even-odd scanline fill rows for a simple polygon (float vertices, integer rows). */
export function fillPolygonRows(points: Array<{ x: number; y: number }>): GnumarusPixelRow[] {
  const rows: GnumarusPixelRow[] = [];
  if (points.length < 3) {
    return rows;
  }
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const point of points) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      return [];
    }
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  for (let y = Math.ceil(minY); y <= Math.floor(maxY); y += 1) {
    const crossings: number[] = [];
    for (let i = 0; i < points.length; i += 1) {
      const a = points[i] as { x: number; y: number };
      const b = points[(i + 1) % points.length] as { x: number; y: number };
      if ((a.y <= y && b.y > y) || (b.y <= y && a.y > y)) {
        const t = (y - a.y) / (b.y - a.y);
        crossings.push(a.x + t * (b.x - a.x));
      }
    }
    crossings.sort((left, right) => left - right);
    for (let i = 0; i + 1 < crossings.length; i += 2) {
      const x0 = Math.ceil(crossings[i] as number);
      const x1 = Math.floor(crossings[i + 1] as number);
      if (x1 >= x0) {
        rows.push({ y, x0, x1 });
      }
    }
  }
  return rows;
}

/** 4x4 Bayer matrix threshold for ordered-dither gradients (0..15). */
const BAYER_4X4: number[] = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

export function bayerThreshold(x: number, y: number): number {
  const row = ((y % 4) + 4) % 4;
  const col = ((x % 4) + 4) % 4;
  return (BAYER_4X4[row * 4 + col] as number) / 16;
}

/** Clamped 0..1 position of a pixel along a linear gradient axis. */
export function gradientLinearT(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  if (!(lengthSquared > 0)) {
    return 0;
  }
  const t = ((px - ax) * dx + (py - ay) * dy) / lengthSquared;
  return Math.min(1, Math.max(0, t));
}

/** Clamped 0..1 radial distance from the gradient center to its edge. */
export function gradientRadialT(
  px: number,
  py: number,
  cx: number,
  cy: number,
  ex: number,
  ey: number,
): number {
  const radius = Math.hypot(ex - cx, ey - cy);
  if (!(radius > 0)) {
    return 0;
  }
  return Math.min(1, Math.max(0, Math.hypot(px - cx, py - cy) / radius));
}
