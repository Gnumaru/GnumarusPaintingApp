export interface GnumarusViewTransform {
  zoom: number;
  panX: number;
  panY: number;
  /** Canvas rotation in radians, clockwise-positive on screen. */
  rotation: number;
  flipX: boolean;
  flipY: boolean;
}

export interface GnumarusLayerTransform {
  /** Layer center offset in project pixels from the project center (y down). */
  x: number;
  y: number;
  /** Layer rotation in radians, clockwise-positive on screen. */
  rotation: number;
  flipX: boolean;
  flipY: boolean;
  /** Multipliers, always positive. */
  scaleX: number;
  scaleY: number;
  /** Shear factors (horizontal shear per vertical unit and vice versa). */
  skewX: number;
  skewY: number;
  /** Tilt about the layer X axis in radians (top toward viewer when positive). */
  rotationX: number;
  /** Tilt about the layer Y axis in radians (right edge toward viewer when positive). */
  rotationY: number;
}

export const IDENTITY_LAYER_TRANSFORM: GnumarusLayerTransform = {
  x: 0,
  y: 0,
  rotation: 0,
  flipX: false,
  flipY: false,
  scaleX: 1,
  scaleY: 1,
  skewX: 0,
  skewY: 0,
  rotationX: 0,
  rotationY: 0,
};

/** Clamp for layer shear factors (keeps mapping safely invertible). */
export const GNUMARUS_MAX_LAYER_SKEW = 2;

export interface GnumarusRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Full 3x3 rotation `Rz(rotation) * Ry(rotationY) * Rx(rotationX)` in
 * layer/project space (x right, y down, z toward the viewer, angles
 * clockwise-positive on screen). Row-major `m[row][col]`.
 */
export function layerRotate3(layer: Pick<GnumarusLayerTransform, "rotation" | "rotationX" | "rotationY">): [
  [number, number, number],
  [number, number, number],
  [number, number, number],
] {
  const cx = Math.cos(layer.rotationX);
  const sx = Math.sin(layer.rotationX);
  const cy = Math.cos(layer.rotationY);
  const sy = Math.sin(layer.rotationY);
  const cz = Math.cos(layer.rotation);
  const sz = Math.sin(layer.rotation);
  // Rx (y-down adapted) then Ry (y-down adapted), then Rz.
  // Rx = [[1,0,0],[0,cx,sx],[0,-sx,cx]], Ry = [[cy,0,-sy],[0,1,0],[sy,0,cy]].
  const ryRx: [[number, number, number], [number, number, number], [number, number, number]] = [
    [cy, sy * sx, -sy * cx],
    [0, cx, sx],
    [sy, -cy * sx, cy * cx],
  ];
  return [
    [cz * ryRx[0][0] - sz * ryRx[1][0], cz * ryRx[0][1] - sz * ryRx[1][1], cz * ryRx[0][2] - sz * ryRx[1][2]],
    [sz * ryRx[0][0] + cz * ryRx[1][0], sz * ryRx[0][1] + cz * ryRx[1][1], sz * ryRx[0][2] + cz * ryRx[1][2]],
    [ryRx[2][0], ryRx[2][1], ryRx[2][2]],
  ];
}

/** In-plane scale/shear part (flips are applied to the coords beforehand). */
function layerAffine2(layer: GnumarusLayerTransform): { a: number; b: number; c: number; d: number } {
  return {
    a: layer.scaleX,
    b: layer.skewX * layer.scaleY,
    c: layer.skewY * layer.scaleX,
    d: layer.scaleY,
  };
}

/** Linear part of the layer-image (flip-applied, layer-centered) to project map. */
export function layerLinearMatrix(layer: GnumarusLayerTransform): { a: number; b: number; c: number; d: number } {
  const rotation = layerRotate3(layer);
  const affine = layerAffine2(layer);
  // Top-left 2x2 of R3 * S*K (content lives at z = 0).
  return {
    a: rotation[0][0] * affine.a + rotation[0][1] * affine.c,
    b: rotation[0][0] * affine.b + rotation[0][1] * affine.d,
    c: rotation[1][0] * affine.a + rotation[1][1] * affine.c,
    d: rotation[1][0] * affine.b + rotation[1][1] * affine.d,
  };
}

/** Determinant of the layer linear part (tilt scales it by cosRX*cosRY). */
export function layerMatrixDeterminant(layer: GnumarusLayerTransform): number {
  return (
    Math.cos(layer.rotationX) *
    Math.cos(layer.rotationY) *
    layer.scaleX *
    layer.scaleY *
    (1 - layer.skewX * layer.skewY)
  );
}

/** Continuous image coordinates to project pixels (origin at project center, y down). */
export function layerImageToProject(
  imageX: number,
  imageY: number,
  layerWidth: number,
  layerHeight: number,
  layer: GnumarusLayerTransform,
): { x: number; y: number } {
  const qx = (imageX - layerWidth / 2) * (layer.flipX ? -1 : 1);
  const qy = (imageY - layerHeight / 2) * (layer.flipY ? -1 : 1);
  const matrix = layerLinearMatrix(layer);
  return {
    x: matrix.a * qx + matrix.b * qy + layer.x,
    y: matrix.c * qx + matrix.d * qy + layer.y,
  };
}

/** Center of an image pixel in project pixels (origin at project center, y down). */
export function layerPixelCenterToProject(
  imageX: number,
  imageY: number,
  layerWidth: number,
  layerHeight: number,
  layer: GnumarusLayerTransform,
): { x: number; y: number } {
  return layerImageToProject(imageX + 0.5, imageY + 0.5, layerWidth, layerHeight, layer);
}

/** Project pixels (origin at project center, y down) to image pixel. Null when outside. */
export function projectToLayerPixel(
  projectX: number,
  projectY: number,
  layerWidth: number,
  layerHeight: number,
  layer: GnumarusLayerTransform,
): { x: number; y: number } | null {
  const mapped = projectToLayerImageFloat(projectX, projectY, layerWidth, layerHeight, layer);
  if (mapped === null) {
    return null;
  }
  const x = Math.floor(mapped.x);
  const y = Math.floor(mapped.y);
  if (x < 0 || y < 0 || x >= layerWidth || y >= layerHeight) {
    return null;
  }
  return { x, y };
}

/**
 * Project pixels to continuous layer image coordinates (unbounded floats).
 * Null when the transform is degenerate (not invertible).
 */
export function projectToLayerImageFloat(
  projectX: number,
  projectY: number,
  layerWidth: number,
  layerHeight: number,
  layer: GnumarusLayerTransform,
): { x: number; y: number } | null {
  const matrix = layerLinearMatrix(layer);
  const determinant = matrix.a * matrix.d - matrix.b * matrix.c;
  if (!(Math.abs(determinant) > 1e-9)) {
    return null;
  }
  const rx = projectX - layer.x;
  const ry = projectY - layer.y;
  const qx = (matrix.d * rx - matrix.b * ry) / determinant;
  const qy = (-matrix.c * rx + matrix.a * ry) / determinant;
  return {
    x: qx / (layer.flipX ? -1 : 1) + layerWidth / 2,
    y: qy / (layer.flipY ? -1 : 1) + layerHeight / 2,
  };
}

/** Client (CSS pixel) point to project pixels (origin at project center, y down). */
export function screenToProject(
  clientX: number,
  clientY: number,
  rect: GnumarusRect,
  view: GnumarusViewTransform,
): { x: number; y: number } | null {
  if (view.zoom <= 0 || rect.width <= 0 || rect.height <= 0) {
    return null;
  }
  const centerX = rect.left + rect.width / 2 + view.panX;
  const centerY = rect.top + rect.height / 2 + view.panY;
  const dx = clientX - centerX;
  const dy = clientY - centerY;
  const cos = Math.cos(view.rotation);
  const sin = Math.sin(view.rotation);
  return {
    x: (cos * dx + sin * dy) / view.zoom / (view.flipX ? -1 : 1),
    y: (-sin * dx + cos * dy) / view.zoom / (view.flipY ? -1 : 1),
  };
}

/** Project pixels (origin at project center, y down) to client (CSS pixel) coordinates. */
export function projectToScreen(
  projectX: number,
  projectY: number,
  rect: GnumarusRect,
  view: GnumarusViewTransform,
): { x: number; y: number } {
  const centerX = rect.left + rect.width / 2 + view.panX;
  const centerY = rect.top + rect.height / 2 + view.panY;
  const ux = projectX * (view.flipX ? -1 : 1) * view.zoom;
  const uy = projectY * (view.flipY ? -1 : 1) * view.zoom;
  const cos = Math.cos(view.rotation);
  const sin = Math.sin(view.rotation);
  return {
    x: centerX + cos * ux - sin * uy,
    y: centerY + sin * ux + cos * uy,
  };
}

/**
 * Map a client (CSS pixel) point to a layer's image pixel.
 * Returns null when outside the layer.
 */
export function screenToLayerPixel(
  clientX: number,
  clientY: number,
  rect: GnumarusRect,
  layerWidth: number,
  layerHeight: number,
  view: GnumarusViewTransform,
  layer: GnumarusLayerTransform,
): { x: number; y: number } | null {
  const project = screenToProject(clientX, clientY, rect, view);
  if (project === null) {
    return null;
  }
  return projectToLayerPixel(project.x, project.y, layerWidth, layerHeight, layer);
}

/** Map a layer image pixel to its center position in client (CSS pixel) coordinates. */
export function layerPixelToScreen(
  imageX: number,
  imageY: number,
  rect: GnumarusRect,
  layerWidth: number,
  layerHeight: number,
  view: GnumarusViewTransform,
  layer: GnumarusLayerTransform,
): { x: number; y: number } {
  const project = layerPixelCenterToProject(imageX, imageY, layerWidth, layerHeight, layer);
  return projectToScreen(project.x, project.y, rect, view);
}

/**
 * Map a client (CSS pixel) point to image pixel coordinates for a layer
 * that fills the project (identity layer transform).
 */
export function screenToImagePixel(
  clientX: number,
  clientY: number,
  rect: GnumarusRect,
  imageWidth: number,
  imageHeight: number,
  view: GnumarusViewTransform,
): { x: number; y: number } | null {
  return screenToLayerPixel(clientX, clientY, rect, imageWidth, imageHeight, view, IDENTITY_LAYER_TRANSFORM);
}

/**
 * Map an image pixel to its center position in client (CSS pixel)
 * coordinates for a layer that fills the project. Exact inverse of
 * `screenToImagePixel` for the un-floored position.
 */
export function imageToScreenPixel(
  imageX: number,
  imageY: number,
  rect: GnumarusRect,
  imageWidth: number,
  imageHeight: number,
  view: GnumarusViewTransform,
): { x: number; y: number } {
  return layerPixelToScreen(imageX, imageY, rect, imageWidth, imageHeight, view, IDENTITY_LAYER_TRANSFORM);
}

export function clampZoom(zoom: number): number {
  if (Number.isNaN(zoom)) {
    return 1;
  }
  return Math.min(64, Math.max(0.5, zoom));
}

/** Normalize radians to (-PI, PI]. */
export function normalizeRotation(radians: number): number {
  const twoPi = Math.PI * 2;
  let result = radians % twoPi;
  if (result <= -Math.PI) {
    result += twoPi;
  } else if (result > Math.PI) {
    result -= twoPi;
  }
  return result;
}

/** Integer texture-pixel box: sub-rectangle produced by cropping. */
export interface GnumarusCropBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Texture-pixel box visible on the canvas through a content transform.
 * Inverse-maps the four canvas corners into texture space, expands outward
 * to whole texels and clamps to the texture, so no visible texel is ever
 * dropped (at most a fringe of partially covered texels is kept).
 * Null when the transform is degenerate or the content lies fully outside
 * the canvas.
 */
export function canvasVisibleTextureBox(
  canvasWidth: number,
  canvasHeight: number,
  textureWidth: number,
  textureHeight: number,
  transform: GnumarusLayerTransform,
): GnumarusCropBox | null {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  const corners: Array<[number, number]> = [
    [-canvasWidth / 2, -canvasHeight / 2],
    [canvasWidth / 2, -canvasHeight / 2],
    [canvasWidth / 2, canvasHeight / 2],
    [-canvasWidth / 2, canvasHeight / 2],
  ];
  for (const [projectX, projectY] of corners) {
    const mapped = projectToLayerImageFloat(projectX, projectY, textureWidth, textureHeight, transform);
    if (mapped === null) {
      return null;
    }
    minX = Math.min(minX, mapped.x);
    minY = Math.min(minY, mapped.y);
    maxX = Math.max(maxX, mapped.x);
    maxY = Math.max(maxY, mapped.y);
  }
  const left = Math.max(0, Math.floor(minX));
  const top = Math.max(0, Math.floor(minY));
  const right = Math.min(textureWidth, Math.ceil(maxX));
  const bottom = Math.min(textureHeight, Math.ceil(maxY));
  if (left >= right || top >= bottom) {
    return null;
  }
  return { left, top, width: right - left, height: bottom - top };
}

/** Axis-aligned bbox of a width x height image rotated by radians. Flips preserve the bbox. */
export function rotatedBounds(width: number, height: number, rotation: number): { width: number; height: number } {
  const cos = Math.abs(Math.cos(rotation));
  const sin = Math.abs(Math.sin(rotation));
  return {
    width: width * cos + height * sin,
    height: width * sin + height * cos,
  };
}
