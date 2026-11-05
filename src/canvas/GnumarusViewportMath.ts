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
}

export const IDENTITY_LAYER_TRANSFORM: GnumarusLayerTransform = {
  x: 0,
  y: 0,
  rotation: 0,
  flipX: false,
  flipY: false,
};

export interface GnumarusRect {
  left: number;
  top: number;
  width: number;
  height: number;
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
  const cos = Math.cos(layer.rotation);
  const sin = Math.sin(layer.rotation);
  return {
    x: cos * qx - sin * qy + layer.x,
    y: sin * qx + cos * qy + layer.y,
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
  const rx = projectX - layer.x;
  const ry = projectY - layer.y;
  const cos = Math.cos(layer.rotation);
  const sin = Math.sin(layer.rotation);
  const qx = (cos * rx + sin * ry) / (layer.flipX ? -1 : 1);
  const qy = (-sin * rx + cos * ry) / (layer.flipY ? -1 : 1);
  const x = Math.floor(qx + layerWidth / 2);
  const y = Math.floor(qy + layerHeight / 2);
  if (x < 0 || y < 0 || x >= layerWidth || y >= layerHeight) {
    return null;
  }
  return { x, y };
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
