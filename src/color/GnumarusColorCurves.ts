/**
 * Color-curves model: an editable Bézier tone curve shared by the curves
 * filter kernel and the curve-editor widget. Coordinates are normalized
 * [0, 1]² (x = input tone left-to-right, y = output tone bottom-to-top).
 *
 * Nodes stay sorted by x (minimum separation EPS); the first and last
 * nodes are the black/white endpoints with locked x (0 and 1). Every
 * node carries an explicit in-handle (hx0, hy0) and out-handle (hx1,
 * hy1); new nodes start smooth (mirrored slope from their neighbors)
 * and handles are fully independent afterwards.
 */

/** One curve node with explicit Bézier handles (absolute [0, 1]² positions). */
export interface GnumarusCurveNode {
  x: number;
  y: number;
  hx0: number;
  hy0: number;
  hx1: number;
  hy1: number;
}

/** Node list, sorted by ascending x. */
export type GnumarusColorCurve = GnumarusCurveNode[];

/** Minimum horizontal separation between nodes (about one LUT step). */
export const GNUMARUS_CURVE_EPS = 1 / 255;

/** Samples per Bézier segment when building the lookup table. */
const CURVE_LUT_SAMPLES = 64;

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

function cloneNode(node: GnumarusCurveNode): GnumarusCurveNode {
  return { x: node.x, y: node.y, hx0: node.hx0, hy0: node.hy0, hx1: node.hx1, hy1: node.hy1 };
}

/**
 * Smooth handle pair for a node at (x, y) with the given slope: mirrored
 * handles along the tangent, scaled to a third of the tighter neighbor
 * gap (axis units, so a slope-1 line stays perfectly straight). Outputs
 * clamp to the unit box.
 */
function smoothHandles(
  x: number,
  y: number,
  slope: number,
  gap: number,
): { hx0: number; hy0: number; hx1: number; hy1: number } {
  const len = Math.min(1 / 3, Math.max(GNUMARUS_CURVE_EPS, gap / 3));
  return {
    hx0: clamp01(x - len),
    hy0: clamp01(y - len * slope),
    hx1: clamp01(x + len),
    hy1: clamp01(y + len * slope),
  };
}

/** Identity (diagonal) curve: straight line from bottom-left to top-right. */
export function defaultColorCurve(): GnumarusColorCurve {
  const first = smoothHandles(0, 0, 1, 1);
  const last = smoothHandles(1, 1, 1, 1);
  return [
    { x: 0, y: 0, hx0: first.hx0, hy0: first.hy0, hx1: first.hx1, hy1: first.hy1 },
    { x: 1, y: 1, hx0: last.hx0, hy0: last.hy0, hx1: last.hx1, hy1: last.hy1 },
  ];
}

/**
 * Coerce unknown input into a valid curve (fresh objects every call, so
 * callers may freely mutate the result). Garbage falls back to identity;
 * coordinates clamp to [0, 1], nodes sort by x, endpoints lock to x 0/1.
 */
export function normalizeColorCurve(value: unknown): GnumarusColorCurve {
  if (!Array.isArray(value)) {
    return defaultColorCurve();
  }
  const nodes: GnumarusCurveNode[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) {
      continue;
    }
    const rec = entry as Record<string, unknown>;
    const pick = (key: string): number => {
      const raw = rec[key];
      return typeof raw === "number" && Number.isFinite(raw) ? raw : NaN;
    };
    const x = pick("x");
    const y = pick("y");
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      continue;
    }
    const hx0 = pick("hx0");
    const hy0 = pick("hy0");
    const hx1 = pick("hx1");
    const hy1 = pick("hy1");
    nodes.push({
      x: clamp01(x),
      y: clamp01(y),
      hx0: clamp01(Number.isFinite(hx0) ? hx0 : x),
      hy0: clamp01(Number.isFinite(hy0) ? hy0 : y),
      hx1: clamp01(Number.isFinite(hx1) ? hx1 : x),
      hy1: clamp01(Number.isFinite(hy1) ? hy1 : y),
    });
  }
  if (nodes.length < 2) {
    return defaultColorCurve();
  }
  nodes.sort((a, b) => a.x - b.x);
  nodes[0]!.x = 0;
  nodes[nodes.length - 1]!.x = 1;
  return nodes;
}

function cubic(p0: number, c0: number, c1: number, p1: number, t: number): number {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * c0 + 3 * u * t * t * c1 + t * t * t * p1;
}

/**
 * Evaluate the curve output for an input x in [0, 1] (binary search over
 * segments, then the segment's Bézier at the matching parameter).
 */
export function curveValueAt(curve: GnumarusColorCurve, x: number): number {
  const nodes = curve.length === 0 ? defaultColorCurve() : curve;
  const input = clamp01(x);
  let segment = 0;
  while (segment < nodes.length - 2 && input > nodes[segment + 1]!.x) {
    segment += 1;
  }
  const p0 = nodes[segment]!;
  const p1 = nodes[segment + 1]!;
  // Invert x(t) by bisection (handles may be non-monotonic; first root wins).
  let lo = 0;
  let high = 1;
  for (let i = 0; i < 24; i += 1) {
    const mid = (lo + high) / 2;
    const xm = cubic(p0.x, p0.hx1, p1.hx0, p1.x, mid);
    if (xm < input) {
      lo = mid;
    } else {
      high = mid;
    }
  }
  const t = (lo + high) / 2;
  return clamp01(cubic(p0.y, p0.hy1, p1.hy0, p1.y, t));
}

/**
 * Build the 256-entry tone lookup table: sample every segment, later
 * segments overwrite earlier ones at shared x, then linearly interpolate
 * any unsampled x between its written neighbors (endpoints always pin
 * LUT[0] and LUT[255]).
 */
export function colorCurveLookup(curve: GnumarusColorCurve): Uint8Array {
  const nodes = curve.length === 0 ? defaultColorCurve() : curve;
  const lut = new Uint8Array(256);
  const written = new Array<boolean>(256).fill(false);
  for (let s = 0; s < nodes.length - 1; s += 1) {
    const p0 = nodes[s]!;
    const p1 = nodes[s + 1]!;
    for (let i = 0; i <= CURVE_LUT_SAMPLES; i += 1) {
      const t = i / CURVE_LUT_SAMPLES;
      const x = Math.round(clamp01(cubic(p0.x, p0.hx1, p1.hx0, p1.x, t)) * 255);
      const y = Math.round(clamp01(cubic(p0.y, p0.hy1, p1.hy0, p1.y, t)) * 255);
      lut[x] = y;
      written[x] = true;
    }
  }
  let anchor = 0;
  while (anchor < 256 && written[anchor] !== true) {
    anchor += 1;
  }
  let prev = anchor < 256 ? anchor : 0;
  for (let x = prev + 1; x < 256; x += 1) {
    if (written[x] === true) {
      const span = x - prev;
      for (let k = prev + 1; k < x; k += 1) {
        lut[k] = Math.round(lut[prev]! + ((lut[x]! - lut[prev]!) * (k - prev)) / span);
      }
      prev = x;
    }
  }
  return lut;
}

/**
 * Insert a node at (x, y), keeping x order. No-op (same reference) when a
 * node already sits within EPS or x is outside (0, 1). The new node starts
 * smooth, with handles from the enclosing segment's slope.
 */
export function addCurveNode(curve: GnumarusColorCurve, x: number, y: number): GnumarusColorCurve {
  if (!Number.isFinite(x) || !Number.isFinite(y) || x <= 0 || x >= 1) {
    return curve;
  }
  const sorted = [...curve].sort((a, b) => a.x - b.x);
  for (const node of sorted) {
    if (Math.abs(node.x - x) < GNUMARUS_CURVE_EPS) {
      return curve;
    }
  }
  let segment = 0;
  while (segment < sorted.length - 2 && x > sorted[segment + 1]!.x) {
    segment += 1;
  }
  const before = sorted[segment];
  const after = sorted[segment + 1];
  if (before === undefined || after === undefined) {
    return curve;
  }
  const slope = (after.y - before.y) / Math.max(GNUMARUS_CURVE_EPS, after.x - before.x);
  const gap = Math.min(x - before.x, after.x - x);
  const handles = smoothHandles(x, clamp01(y), slope, gap);
  const inserted: GnumarusCurveNode = { x, y: clamp01(y), ...handles };
  return [...sorted.slice(0, segment + 1), inserted, ...sorted.slice(segment + 1)];
}

/** Remove the node at index (endpoints and 2-node curves refuse; same ref on no-op). */
export function removeCurveNode(curve: GnumarusColorCurve, index: number): GnumarusColorCurve {
  if (!Number.isInteger(index) || curve.length <= 2 || index <= 0 || index >= curve.length - 1) {
    return curve;
  }
  return [...curve.slice(0, index), ...curve.slice(index + 1)];
}

/**
 * Drag a node (fresh array, sorted copy in place). Interior x clamps
 * between the neighbors so order never flips; endpoints keep x 0/1.
 */
export function moveCurveNode(curve: GnumarusColorCurve, index: number, x: number, y: number): GnumarusColorCurve {
  if (!Number.isInteger(index) || index < 0 || index >= curve.length || !Number.isFinite(x) || !Number.isFinite(y)) {
    return curve;
  }
  const next = curve.map(cloneNode);
  const node = next[index]!;
  if (index === 0) {
    node.x = 0;
  } else if (index === next.length - 1) {
    node.x = 1;
  } else {
    node.x = Math.min(next[index + 1]!.x - GNUMARUS_CURVE_EPS, Math.max(next[index - 1]!.x + GNUMARUS_CURVE_EPS, x));
  }
  node.y = clamp01(y);
  return next;
}

/** Drag one handle of a node (0 = in, 1 = out), clamped to the unit box. */
export function moveCurveHandle(
  curve: GnumarusColorCurve,
  index: number,
  which: 0 | 1,
  x: number,
  y: number,
): GnumarusColorCurve {
  if (!Number.isInteger(index) || index < 0 || index >= curve.length || !Number.isFinite(x) || !Number.isFinite(y)) {
    return curve;
  }
  const next = curve.map(cloneNode);
  const node = next[index]!;
  if (which === 0) {
    node.hx0 = clamp01(x);
    node.hy0 = clamp01(y);
  } else {
    node.hx1 = clamp01(x);
    node.hy1 = clamp01(y);
  }
  return next;
}

/**
 * Closest sample on the rendered curve to (x, y), in normalized coords
 * (for click-to-add and hit-testing). Samples every segment densely.
 */
export function nearestCurvePoint(curve: GnumarusColorCurve, x: number, y: number): { x: number; y: number; dist: number } {
  const nodes = curve.length === 0 ? defaultColorCurve() : curve;
  let best = { x: 0, y: 0, dist: Number.POSITIVE_INFINITY };
  for (let s = 0; s < nodes.length - 1; s += 1) {
    const p0 = nodes[s]!;
    const p1 = nodes[s + 1]!;
    for (let i = 0; i <= CURVE_LUT_SAMPLES; i += 1) {
      const t = i / CURVE_LUT_SAMPLES;
      const px = cubic(p0.x, p0.hx1, p1.hx0, p1.x, t);
      const py = cubic(p0.y, p0.hy1, p1.hy0, p1.y, t);
      const dist = Math.hypot(px - x, py - y);
      if (dist < best.dist) {
        best = { x: px, y: py, dist };
      }
    }
  }
  return best;
}
