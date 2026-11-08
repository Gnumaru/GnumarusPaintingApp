/**
 * Pure affine math for the floating selection transform.
 * Floating-local coordinates span the source buffer (0..width, 0..height);
 * home coordinates span the destination cell texture. Both use y-down
 * pixels, so standard rotation matrices read clockwise-positive, matching
 * the layer transform convention. No DOM or WebGL here (unit-tested); the
 * engine owns the live selection state.
 */

export interface GnumarusSelectionPlacement {
  /** Center in home-texture pixels. */
  cx: number;
  cy: number;
  /** Clockwise-positive radians. */
  rotation: number;
  /** Multipliers, always positive. */
  scaleX: number;
  scaleY: number;
  /** Shear factors (horizontal shear per vertical unit and vice versa). */
  skewX: number;
  skewY: number;
  /** Mirror flags, applied to buffer-centered coords before the linear map. */
  flipX: boolean;
  flipY: boolean;
  /** Source buffer dimensions. */
  width: number;
  height: number;
}

export interface GnumarusAffineMatrix {
  a: number;
  b: number;
  c: number;
  d: number;
}

/** Clamp for shear factors (keeps commits bounded and far from singular). */
export const GNUMARUS_MAX_SELECTION_SKEW = 2;

/** Smallest allowed selection dimension in pixels (no mirror-by-resize). */
export const GNUMARUS_MIN_SELECTION_SIZE_PX = 1;

/** Epsilon added before flooring resampled coordinates (tie-breaking). */
export const GNUMARUS_SELECTION_SAMPLE_EPSILON = 1e-6;

/** Linear part of the floating-local (buffer-centered) to home map. */
export function selectionLinearMatrix(placement: GnumarusSelectionPlacement): GnumarusAffineMatrix {
  const cos = Math.cos(placement.rotation);
  const sin = Math.sin(placement.rotation);
  return {
    a: cos * placement.scaleX - sin * placement.skewY * placement.scaleX,
    b: cos * placement.skewX * placement.scaleY - sin * placement.scaleY,
    c: sin * placement.scaleX + cos * placement.skewY * placement.scaleX,
    d: sin * placement.skewX * placement.scaleY + cos * placement.scaleY,
  };
}

/** Determinant of the linear part (scales times shear factor). */
export function selectionMatrixDeterminant(placement: GnumarusSelectionPlacement): number {
  return placement.scaleX * placement.scaleY * (1 - placement.skewX * placement.skewY);
}

/** True when the transform cannot be inverted (degenerate shear/scales). */
export function isSelectionDegenerate(placement: GnumarusSelectionPlacement): boolean {
  return !(Math.abs(selectionMatrixDeterminant(placement)) > 1e-9);
}

/** Map a floating-local point (0..width, 0..height) to home-texture pixels. */
export function forwardSelectionPoint(
  placement: GnumarusSelectionPlacement,
  x: number,
  y: number,
): { x: number; y: number } {
  const matrix = selectionLinearMatrix(placement);
  const qx = (x - placement.width / 2) * (placement.flipX ? -1 : 1);
  const qy = (y - placement.height / 2) * (placement.flipY ? -1 : 1);
  return {
    x: matrix.a * qx + matrix.b * qy + placement.cx,
    y: matrix.c * qx + matrix.d * qy + placement.cy,
  };
}

/**
 * Map a home-texture point back to floating-local coordinates.
 * Returns null for degenerate transforms.
 */
export function inverseSelectionPoint(
  placement: GnumarusSelectionPlacement,
  x: number,
  y: number,
): { x: number; y: number } | null {
  const matrix = selectionLinearMatrix(placement);
  const determinant = matrix.a * matrix.d - matrix.b * matrix.c;
  if (!(Math.abs(determinant) > 1e-9)) {
    return null;
  }
  const dx = x - placement.cx;
  const dy = y - placement.cy;
  const qx = (matrix.d * dx - matrix.b * dy) / determinant;
  const qy = (-matrix.c * dx + matrix.a * dy) / determinant;
  return {
    x: qx / (placement.flipX ? -1 : 1) + placement.width / 2,
    y: qy / (placement.flipY ? -1 : 1) + placement.height / 2,
  };
}

/** Axis-aligned bounding box of the transformed selection corners. */
export function selectionCornerBox(placement: GnumarusSelectionPlacement): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  const corners = [
    forwardSelectionPoint(placement, 0, 0),
    forwardSelectionPoint(placement, placement.width, 0),
    forwardSelectionPoint(placement, placement.width, placement.height),
    forwardSelectionPoint(placement, 0, placement.height),
  ];
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const corner of corners) {
    minX = Math.min(minX, corner.x);
    minY = Math.min(minY, corner.y);
    maxX = Math.max(maxX, corner.x);
    maxY = Math.max(maxY, corner.y);
  }
  return { minX, minY, maxX, maxY };
}
