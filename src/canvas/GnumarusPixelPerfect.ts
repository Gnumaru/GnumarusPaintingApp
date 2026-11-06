export interface GnumarusPixelPerfectPoint {
  x: number;
  y: number;
}

/** How many trailing painted pixels count as "recent" (local elbow vs revisit). */
export const GNUMARUS_PIXEL_PERFECT_RECENT_WINDOW = 4;

function pixelPerfectKey(x: number, y: number): string {
  return `${x},${y}`;
}

/** Count painted 8-neighbors of (x, y) inside the set (excludes itself). */
export function countPixelPerfectNeighbors(painted: ReadonlySet<string>, x: number, y: number): number {
  let count = 0;
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) {
        continue;
      }
      if (painted.has(pixelPerfectKey(x + dx, y + dy))) {
        count += 1;
      }
    }
  }
  return count;
}

/**
 * Step the exact Bresenham walk used by `drawPixelLine` (integer endpoints
 * required, same octant handling), visiting every rasterized pixel in order
 * without painting. Lets the filter see candidates in rasterizer order.
 */
export function walkBresenhamLinePixels(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  visit: (x: number, y: number) => void,
): void {
  let x = x0;
  let y = y0;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  for (;;) {
    visit(x, y);
    if (x === x1 && y === y1) {
      break;
    }
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}

export interface GnumarusCubicPoints {
  p0: GnumarusPixelPerfectPoint;
  c1: GnumarusPixelPerfectPoint;
  c2: GnumarusPixelPerfectPoint;
  p3: GnumarusPixelPerfectPoint;
}

/**
 * Visit every integer pixel of an aliased cubic in rasterizer order.
 * Mirrors `drawCubicBezier` with anti-aliasing off: same chord count
 * (16..200 by control-polygon length, Bernstein evaluation) and the same
 * rounding of each joint to integers so the walkers terminate. Used to feed
 * the pixel-perfect filter with the exact candidate order the rasterizer
 * would paint.
 */
export function walkCubicBezierPixels(points: GnumarusCubicPoints, visit: (x: number, y: number) => void): void {
  const { p0, c1, c2, p3 } = points;
  const chord = (a: GnumarusPixelPerfectPoint, b: GnumarusPixelPerfectPoint): number =>
    Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
  const polygon = chord(p0, c1) + chord(c1, c2) + chord(c2, p3);
  if (!(polygon > 1e-9)) {
    walkBresenhamLinePixels(Math.round(p0.x), Math.round(p0.y), Math.round(p0.x), Math.round(p0.y), visit);
    return;
  }
  const segments = Math.min(200, Math.max(16, Math.ceil(polygon * 2)));
  let prevX = p0.x;
  let prevY = p0.y;
  for (let i = 1; i <= segments; i += 1) {
    const t = i / segments;
    const it = 1 - t;
    const x =
      it * it * it * p0.x + 3 * it * it * t * c1.x + 3 * it * t * t * c2.x + t * t * t * p3.x;
    const y =
      it * it * it * p0.y + 3 * it * it * t * c1.y + 3 * it * t * t * c2.y + t * t * t * p3.y;
    walkBresenhamLinePixels(
      Math.round(prevX),
      Math.round(prevY),
      Math.round(x),
      Math.round(y),
      visit,
    );
    prevX = x;
    prevY = y;
  }
}

/**
 * Per-stroke pixel-perfect filter. Keeps lines exactly 1px thick: a new
 * pixel is skipped when painting it would give itself or any painted
 * 8-neighbor more than 2 painted neighbors within the stroke. Sharp square
 * corners are converted to diagonal corners by retroactively eating the
 * elbow pixel (reported via `drainRemoved` so the caller can restore it).
 * Crossing or revisiting your own line always paints (may exceed 2
 * neighbors), detected by touching a painted pixel outside the recent
 * window.
 *
 * Out-of-bounds candidates are tracked in the set (topology) but left to the
 * caller to skip when painting. Coordinates must be integers.
 */
export interface GnumarusPixelPerfectRemoved {
  x: number;
  y: number;
}

export class GnumarusPixelPerfectStroke {
  private readonly painted = new Set<string>();
  private readonly order: Array<string | null> = [];
  private readonly coords = new Map<string, GnumarusPixelPerfectPoint>();
  private pendingRemoved: GnumarusPixelPerfectRemoved[] = [];

  constructor(private readonly recentWindow: number = GNUMARUS_PIXEL_PERFECT_RECENT_WINDOW) {}

  reset(): void {
    this.painted.clear();
    this.order.length = 0;
    this.coords.clear();
    this.pendingRemoved = [];
  }

  get size(): number {
    return this.painted.size;
  }

  has(x: number, y: number): boolean {
    return this.painted.has(pixelPerfectKey(x, y));
  }

  /** Snapshot of currently painted pixels (eaten elbows excluded). */
  pixels(): GnumarusPixelPerfectPoint[] {
    const points: GnumarusPixelPerfectPoint[] = [];
    for (const [code, point] of this.coords) {
      if (this.painted.has(code)) {
        points.push({ x: point.x, y: point.y });
      }
    }
    return points;
  }

  /** Pixels eaten by the last successful `add`; clears the queue. */
  drainRemoved(): GnumarusPixelPerfectRemoved[] {
    const removed = this.pendingRemoved;
    this.pendingRemoved = [];
    return removed;
  }

  private record(code: string, x: number, y: number): void {
    this.painted.add(code);
    this.coords.set(code, { x, y });
    this.order.push(code);
  }

  private occurrences(code: string): number {
    let count = 0;
    for (const entry of this.order) {
      if (entry === code) {
        count += 1;
      }
    }
    return count;
  }

  private isOld(code: string): boolean {
    const index = this.order.lastIndexOf(code);
    return index !== -1 && index < this.order.length - this.recentWindow;
  }

  /** True when any painted 8-neighbor of (x, y) sits outside the recent window. */
  private touchesOld(x: number, y: number): boolean {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0) {
          continue;
        }
        if (this.isOld(pixelPerfectKey(x + dx, y + dy))) {
          return true;
        }
      }
    }
    return false;
  }

  private neighborCodes(x: number, y: number): string[] {
    const found: string[] = [];
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0) {
          continue;
        }
        const neighbor = pixelPerfectKey(x + dx, y + dy);
        if (this.painted.has(neighbor)) {
          found.push(neighbor);
        }
      }
    }
    return found;
  }

  private neighborCount(code: string): number {
    const point = this.coords.get(code);
    if (point === undefined) {
      return 0;
    }
    return countPixelPerfectNeighbors(this.painted, point.x, point.y);
  }

  /** Fully unpaints one single-occurrence pixel (square-corner elbow). */
  private eat(code: string): GnumarusPixelPerfectRemoved | null {
    const point = this.coords.get(code);
    if (point === undefined || !this.painted.has(code) || this.occurrences(code) !== 1) {
      return null;
    }
    this.painted.delete(code);
    const index = this.order.lastIndexOf(code);
    if (index !== -1) {
      this.order[index] = null;
    }
    this.coords.delete(code);
    return { x: point.x, y: point.y };
  }

  /**
   * Decide whether (x, y) should be painted; records painted pixels and
   * queues eaten elbows in `drainRemoved` on success. Revisits (already
   * painted) always return true. A new pixel that would violate the
   * 2-neighbor invariant is skipped, unless it touches old paint
   * (crossing/revisit -> true) or the violation is a local square corner,
   * which is fixed by eating the most recent neighboring elbow.
   */
  add(x: number, y: number): boolean {
    const code = pixelPerfectKey(x, y);
    if (this.order[this.order.length - 1] === code) {
      // Consecutive duplicate: the shared joint of two walk segments, not a
      // genuine retrace. Ignore it so recency and single-occurrence eating
      // keep working across pointermove segment boundaries.
      return true;
    }
    if (this.painted.has(code)) {
      this.record(code, x, y);
      return true;
    }
    const eaten: GnumarusPixelPerfectRemoved[] = [];
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const neighbors = this.neighborCodes(x, y);
      if (neighbors.length === 0) {
        this.record(code, x, y);
        this.pendingRemoved.push(...eaten);
        return true;
      }
      const selfViolates = neighbors.length > 2;
      let otherViolates = false;
      for (const neighbor of neighbors) {
        if (this.neighborCount(neighbor) + 1 > 2) {
          otherViolates = true;
          break;
        }
      }
      if (!selfViolates && !otherViolates) {
        this.record(code, x, y);
        this.pendingRemoved.push(...eaten);
        return true;
      }
      if (this.touchesOld(x, y)) {
        this.record(code, x, y);
        this.pendingRemoved.push(...eaten);
        return true;
      }
      let oldContext = false;
      for (const neighbor of neighbors) {
        const point = this.coords.get(neighbor);
        if (point !== undefined && this.touchesOld(point.x, point.y)) {
          oldContext = true;
          break;
        }
      }
      if (oldContext) {
        this.record(code, x, y);
        this.pendingRemoved.push(...eaten);
        return true;
      }
      if (selfViolates || attempt > 0) {
        break;
      }
      // Local square corner: eat the most recent neighboring elbow so the
      // corner becomes diagonal instead of punching a hole by skipping.
      let elbow: string | null = null;
      let elbowIndex = -1;
      for (const neighbor of neighbors) {
        const index = this.order.lastIndexOf(neighbor);
        if (index > elbowIndex) {
          elbowIndex = index;
          elbow = neighbor;
        }
      }
      const removed = elbow === null ? null : this.eat(elbow);
      if (removed === null) {
        break;
      }
      eaten.push(removed);
    }
    for (const removed of eaten) {
      this.record(pixelPerfectKey(removed.x, removed.y), removed.x, removed.y);
    }
    return false;
  }
}
