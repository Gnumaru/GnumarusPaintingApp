import { compositePixelOver, parseHexColor } from "../canvas/GnumarusPixelBuffer";
import { layerPixelCenterToProject, IDENTITY_LAYER_TRANSFORM, layerLinearMatrix } from "../canvas/GnumarusViewportMath";
import type { GnumarusLayerTransform } from "../canvas/GnumarusViewportMath";

export interface GnumarusFlattenLayerInput {
  width: number;
  height: number;
  buffer: Uint8ClampedArray;
  transform: GnumarusLayerTransform;
  visible: boolean;
  opacity: number;
}

/**
 * Canvas background to paint under the flattened layers, mirroring the
 * background plane of the canvas engine. Checkerboard squares use the same
 * image-space layout as the canvas shader (`floor(x / sizeX)` columns and
 * `floor((height - 1 - y) / sizeY)` rows, matching `vUv` with the origin at
 * the bottom); screen-space squares use the same sizes in preview pixels.
 * Sizes outside 1..128 fall back to the 16px default.
 */
export interface GnumarusPreviewBackground {
  mode: "solid" | "checkerboard";
  checkerMode: "image" | "screen";
  sizeX: number;
  sizeY: number;
  colorA: string;
  colorB: string;
  color: string;
}

const GNUMARUS_PREVIEW_CHECKER_FALLBACK_SIZE = 16;

function clampPreviewCheckerSize(value: number): number {
  if (!Number.isFinite(value)) {
    return GNUMARUS_PREVIEW_CHECKER_FALLBACK_SIZE;
  }
  return Math.min(128, Math.max(1, Math.floor(value)));
}

function paintPreviewBackground(
  dst: Uint8ClampedArray,
  width: number,
  height: number,
  background: GnumarusPreviewBackground,
): void {
  if (background.mode === "solid") {
    const parsed = parseHexColor(background.color);
    if (parsed === null) {
      return;
    }
    for (let i = 0; i < dst.length; i += 4) {
      dst[i] = parsed.r;
      dst[i + 1] = parsed.g;
      dst[i + 2] = parsed.b;
      dst[i + 3] = 255;
    }
    return;
  }
  const parsedA = parseHexColor(background.colorA);
  const parsedB = parseHexColor(background.colorB);
  if (parsedA === null || parsedB === null) {
    return;
  }
  const sizeX = clampPreviewCheckerSize(background.sizeX);
  const sizeY = clampPreviewCheckerSize(background.sizeY);
  for (let y = 0; y < height; y += 1) {
    const rowParity = Math.floor((height - 1 - y) / sizeY) % 2;
    const row = y * width * 4;
    for (let x = 0; x < width; x += 1) {
      const useA = (Math.floor(x / sizeX) + rowParity) % 2 === 0;
      const parsed = useA ? parsedA : parsedB;
      const i = row + x * 4;
      dst[i] = parsed.r;
      dst[i + 1] = parsed.g;
      dst[i + 2] = parsed.b;
      dst[i + 3] = 255;
    }
  }
}

interface GnumarusPreparedLayer extends GnumarusFlattenLayerInput {
  cos: number;
  sin: number;
  matrix: { a: number; b: number; c: number; d: number };
}

/**
 * Composite visible layers bottom-to-top in project space.
 * The result is the flattened image as a single PNG export would look:
 * transparent background with all visible layers blended by opacity, or the
 * given canvas background painted underneath when provided.
 * Only allocates the destination buffer.
 */
export function compositeFinalImage(
  projectWidth: number,
  projectHeight: number,
  layers: GnumarusFlattenLayerInput[],
  background?: GnumarusPreviewBackground,
): Uint8ClampedArray {
  const width = Math.max(1, Math.floor(projectWidth));
  const height = Math.max(1, Math.floor(projectHeight));
  const dst = new Uint8ClampedArray(width * height * 4);
  if (background !== undefined) {
    paintPreviewBackground(dst, width, height, background);
  }
  const prepared: GnumarusPreparedLayer[] = [];
  for (const layer of layers) {
    if (!layer.visible) {
      continue;
    }
    if (!Number.isInteger(layer.width) || !Number.isInteger(layer.height) || layer.width < 1 || layer.height < 1) {
      continue;
    }
    if (layer.buffer.length !== layer.width * layer.height * 4) {
      continue;
    }
    const opacity = Math.min(1, Math.max(0, layer.opacity));
    if (opacity <= 0) {
      continue;
    }
    prepared.push({
      ...layer,
      opacity,
      cos: Math.cos(layer.transform.rotation),
      sin: Math.sin(layer.transform.rotation),
      matrix: layerLinearMatrix(layer.transform),
    });
  }
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const project = layerPixelCenterToProject(x, y, width, height, IDENTITY_LAYER_TRANSFORM);
      const dstIndex = (y * width + x) * 4;
      for (const layer of prepared) {
        const determinant = layer.matrix.a * layer.matrix.d - layer.matrix.b * layer.matrix.c;
        if (!(Math.abs(determinant) > 1e-9)) {
          continue;
        }
        const rx = project.x - layer.transform.x;
        const ry = project.y - layer.transform.y;
        const qx = (layer.matrix.d * rx - layer.matrix.b * ry) / determinant;
        const qy = (-layer.matrix.c * rx + layer.matrix.a * ry) / determinant;
        const sx = Math.floor(qx / (layer.transform.flipX ? -1 : 1) + layer.width / 2);
        const sy = Math.floor(qy / (layer.transform.flipY ? -1 : 1) + layer.height / 2);
        if (sx < 0 || sy < 0 || sx >= layer.width || sy >= layer.height) {
          continue;
        }
        compositePixelOver(dst, dstIndex, layer.buffer, (sy * layer.width + sx) * 4, layer.opacity);
      }
    }
  }
  return dst;
}
