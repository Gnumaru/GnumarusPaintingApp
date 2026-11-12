/**
 * Pure geometry for the shape paint tools (rectangle, ellipse, polygon
 * outline/fill) and the gradient tool. No DOM or WebGL: every helper is
 * deterministic and unit-tested; the engine only rasterizes the results.
 *
 * The `paint*` entry points below share one implementation between the live
 * raster preview and the real commit, so what you drag is what gets painted
 * down to the pixel. They paint into any `{ buffer, width, height }` target:
 * pass the live cell texture to commit, or a zeroed scratch buffer to
 * preview without touching the project.
 */
import {
  applyCoverageMask,
  blendPixelCoverage,
  drawCubicBezier,
  drawCubicBezierCoverage,
  drawLineSegment,
  setPixel,
  stampSegmentCoverage,
  type GnumarusBlendMode,
  type GnumarusBrushShape,
  type GnumarusChannelLock,
  type GnumarusRgba,
} from "../canvas/GnumarusPixelBuffer";
import type { GnumarusWrapMode } from "../canvas/GnumarusViewportMath";
import {
  GnumarusPixelPerfectStroke,
  walkBresenhamLinePixels,
  walkCubicBezierPixels,
} from "../canvas/GnumarusPixelPerfect";

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

/** Paint target: a live cell texture or a zeroed preview scratch buffer. */
export interface GnumarusShapeTex {
  buffer: Uint8ClampedArray;
  width: number;
  height: number;
}

/** Paint settings shared by every shape stroke. */
export interface GnumarusShapeStyle {
  color: GnumarusRgba;
  locked: GnumarusChannelLock | undefined;
  blend: GnumarusBlendMode;
  wrap: GnumarusWrapMode;
  /** Outline stroke width. */
  width: number;
  /** Outline tip shape ("square" for shapes, configurable for line/curve). */
  tip: GnumarusBrushShape;
  antialias: boolean;
  filled: boolean;
  /** Ordered dithering (gradient only). */
  dither: boolean;
  /** Radial (true) vs linear (false) gradient. */
  radial: boolean;
  /** Single-pass union coverage instead of accumulating dabs. */
  accumulate: boolean;
  /** Pixel-perfect 1px filter (curve only). */
  pixelPerfect: boolean;
}

/** Blend one row span with full coverage, honoring locks and blend mode. */
function fillShapeRows(
  tex: GnumarusShapeTex,
  rows: GnumarusPixelRow[],
  style: GnumarusShapeStyle,
): void {
  for (const row of rows) {
    const y = Math.round(row.y);
    for (let x = Math.round(row.x0); x <= Math.round(row.x1); x += 1) {
      blendPixelCoverage(tex.buffer, tex.width, tex.height, x, y, style.color, 1, style.locked, style.blend, style.wrap);
    }
  }
}

/** Reset a texture to a base snapshot, then apply one coverage mask over it. */
function repaintShapeMask(
  tex: GnumarusShapeTex,
  base: Uint8ClampedArray,
  mask: Uint8Array,
  style: GnumarusShapeStyle,
): void {
  tex.buffer.set(base);
  applyCoverageMask(tex.buffer, mask, tex.width, tex.height, style.color, style.blend, style.locked);
}

/** Paint a rectangle outline from a drag box (corners rounded like the commit). */
export function paintRectOutline(
  tex: GnumarusShapeTex,
  style: GnumarusShapeStyle,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): void {
  const corners = [
    { x: Math.round(x0), y: Math.round(y0) },
    { x: Math.round(x1), y: Math.round(y0) },
    { x: Math.round(x1), y: Math.round(y1) },
    { x: Math.round(x0), y: Math.round(y1) },
  ];
  for (let i = 0; i < corners.length; i += 1) {
    const a = corners[i] as { x: number; y: number };
    const b = corners[(i + 1) % corners.length] as { x: number; y: number };
    drawLineSegment(
      tex.buffer, tex.width, tex.height, a.x, a.y, b.x, b.y,
      style.width, "square", style.antialias, style.color, style.locked, style.blend, style.wrap,
    );
  }
}

/** Paint a filled rectangle from a drag box. */
export function paintRectFilled(
  tex: GnumarusShapeTex,
  style: GnumarusShapeStyle,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): void {
  fillShapeRows(
    tex,
    fillRectRows(Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1)),
    style,
  );
}

/** Paint an ellipse outline from a drag box (float center/radii like the commit). */
export function paintEllipseOutline(
  tex: GnumarusShapeTex,
  style: GnumarusShapeStyle,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): void {
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const rx = Math.abs(x1 - x0) / 2;
  const ry = Math.abs(y1 - y0) / 2;
  const points = ellipseOutlinePoints(cx, cy, Math.max(rx, 0.5), Math.max(ry, 0.5));
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i] as { x: number; y: number };
    const b = points[(i + 1) % points.length] as { x: number; y: number };
    drawLineSegment(
      tex.buffer, tex.width, tex.height, Math.round(a.x), Math.round(a.y), Math.round(b.x), Math.round(b.y),
      style.width, "square", style.antialias, style.color, style.locked, style.blend, style.wrap,
    );
  }
}

/** Paint a filled ellipse from a drag box. */
export function paintEllipseFilled(
  tex: GnumarusShapeTex,
  style: GnumarusShapeStyle,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): void {
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const rx = Math.abs(x1 - x0) / 2;
  const ry = Math.abs(y1 - y0) / 2;
  fillShapeRows(tex, fillEllipseRows(cx, cy, rx, ry), style);
}

/** Paint a polygon (closed outline, plus even-odd fill when enabled). */
export function paintPolygon(
  tex: GnumarusShapeTex,
  style: GnumarusShapeStyle,
  points: Array<{ x: number; y: number }>,
): void {
  const rounded = points.map((point) => ({ x: Math.round(point.x), y: Math.round(point.y) }));
  if (style.filled) {
    fillShapeRows(tex, fillPolygonRows(rounded), style);
  }
  for (let i = 0; i < rounded.length; i += 1) {
    const a = rounded[i] as { x: number; y: number };
    const b = rounded[(i + 1) % rounded.length] as { x: number; y: number };
    if (a === undefined || b === undefined) {
      continue;
    }
    drawLineSegment(
      tex.buffer, tex.width, tex.height, a.x, a.y, b.x, b.y,
      style.width, "square", style.antialias, style.color, style.locked, style.blend, style.wrap,
    );
  }
}

/** Paint one line segment (integer endpoints, like the two-click commit). */
export function paintLineSegment(
  tex: GnumarusShapeTex,
  base: Uint8ClampedArray,
  style: GnumarusShapeStyle,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): void {
  if (style.accumulate) {
    drawLineSegment(
      tex.buffer, tex.width, tex.height, x0, y0, x1, y1,
      style.width, style.tip, style.antialias, style.color, style.locked, style.blend, style.wrap,
    );
    return;
  }
  const mask = new Uint8Array(tex.width * tex.height);
  stampSegmentCoverage(
    mask, tex.width, tex.height, x0, y0, x1, y1,
    style.width, style.tip, style.antialias, style.wrap,
  );
  repaintShapeMask(tex, base, mask, style);
}

/** Paint one cubic Bezier stroke (pixel-perfect, accumulated, or union-mask). */
export function paintCurveStroke(
  tex: GnumarusShapeTex,
  base: Uint8ClampedArray,
  style: GnumarusShapeStyle,
  p0: { x: number; y: number },
  c1: { x: number; y: number },
  c2: { x: number; y: number },
  p3: { x: number; y: number },
): void {
  if (style.pixelPerfect) {
    const stroke = new GnumarusPixelPerfectStroke();
    if (!style.accumulate) {
      const mask = new Uint8Array(tex.width * tex.height);
      walkCubicBezierPixels({ p0, c1, c2, p3 }, (x: number, y: number): void => {
        if (!stroke.add(x, y)) {
          return;
        }
        for (const removed of stroke.drainRemoved()) {
          if (removed.x >= 0 && removed.y >= 0 && removed.x < tex.width && removed.y < tex.height) {
            mask[removed.y * tex.width + removed.x] = 0;
          }
        }
        if (x < 0 || y < 0 || x >= tex.width || y >= tex.height) {
          return;
        }
        mask[y * tex.width + x] = 255;
      });
      repaintShapeMask(tex, base, mask, style);
      return;
    }
    walkCubicBezierPixels({ p0, c1, c2, p3 }, (x: number, y: number): void => {
      if (!stroke.add(x, y)) {
        return;
      }
      for (const removed of stroke.drainRemoved()) {
        if (removed.x >= 0 && removed.y >= 0 && removed.x < tex.width && removed.y < tex.height) {
          const at = (removed.y * tex.width + removed.x) * 4;
          tex.buffer[at] = base[at] as number;
          tex.buffer[at + 1] = base[at + 1] as number;
          tex.buffer[at + 2] = base[at + 2] as number;
          tex.buffer[at + 3] = base[at + 3] as number;
        }
      }
      setPixel(tex.buffer, tex.width, tex.height, x, y, style.color, style.locked, style.blend);
    });
    return;
  }
  if (style.accumulate) {
    drawCubicBezier(
      tex.buffer, tex.width, tex.height, p0, c1, c2, p3,
      style.width, style.tip, style.antialias, style.color, style.locked, style.blend, style.wrap,
    );
    return;
  }
  const mask = new Uint8Array(tex.width * tex.height);
  drawCubicBezierCoverage(
    mask, tex.width, tex.height, p0, c1, c2, p3,
    style.width, style.tip, style.antialias, style.wrap,
  );
  repaintShapeMask(tex, base, mask, style);
}

/** Paint a paint-to-transparent gradient over a drag axis (with optional dither). */
export function paintGradient(
  tex: GnumarusShapeTex,
  style: GnumarusShapeStyle,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): void {
  const radius = Math.hypot(bx - ax, by - ay);
  const minX = Math.floor(style.radial ? ax - radius : Math.min(ax, bx));
  const maxX = Math.ceil(style.radial ? ax + radius : Math.max(ax, bx));
  const minY = Math.floor(style.radial ? ay - radius : Math.min(ay, by));
  const maxY = Math.ceil(style.radial ? ay + radius : Math.max(ay, by));
  if (!(maxX >= minX) || !(maxY >= minY)) {
    return;
  }
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const t = style.radial
        ? gradientRadialT(x, y, ax, ay, bx, by)
        : gradientLinearT(x, y, ax, ay, bx, by);
      const strength = 1 - t;
      if (strength <= 0) {
        continue;
      }
      if (style.dither && strength <= bayerThreshold(x, y)) {
        continue;
      }
      const faded = { ...style.color, a: Math.round(style.color.a * strength) };
      blendPixelCoverage(
        tex.buffer, tex.width, tex.height, x, y, faded,
        style.dither ? 1 : strength,
        style.locked, style.blend, style.wrap,
      );
    }
  }
}
