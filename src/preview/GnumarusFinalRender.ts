import { compositePixelOver } from "../canvas/GnumarusPixelBuffer";
import { layerPixelCenterToProject, IDENTITY_LAYER_TRANSFORM } from "../canvas/GnumarusViewportMath";
import type { GnumarusLayerTransform } from "../canvas/GnumarusViewportMath";

export interface GnumarusFlattenLayerInput {
  width: number;
  height: number;
  buffer: Uint8ClampedArray;
  transform: GnumarusLayerTransform;
  visible: boolean;
  opacity: number;
}

interface GnumarusPreparedLayer extends GnumarusFlattenLayerInput {
  cos: number;
  sin: number;
}

/**
 * Composite visible layers bottom-to-top in project space.
 * The result is the flattened image as a single PNG export would look:
 * transparent background with all visible layers blended by opacity.
 * Only allocates the destination buffer.
 */
export function compositeFinalImage(
  projectWidth: number,
  projectHeight: number,
  layers: GnumarusFlattenLayerInput[],
): Uint8ClampedArray {
  const width = Math.max(1, Math.floor(projectWidth));
  const height = Math.max(1, Math.floor(projectHeight));
  const dst = new Uint8ClampedArray(width * height * 4);
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
    });
  }
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const project = layerPixelCenterToProject(x, y, width, height, IDENTITY_LAYER_TRANSFORM);
      const dstIndex = (y * width + x) * 4;
      for (const layer of prepared) {
        const rx = project.x - layer.transform.x;
        const ry = project.y - layer.transform.y;
        const qx = (layer.cos * rx + layer.sin * ry) / (layer.transform.flipX ? -1 : 1);
        const qy = (-layer.sin * rx + layer.cos * ry) / (layer.transform.flipY ? -1 : 1);
        const sx = Math.floor(qx + layer.width / 2);
        const sy = Math.floor(qy + layer.height / 2);
        if (sx < 0 || sy < 0 || sx >= layer.width || sy >= layer.height) {
          continue;
        }
        compositePixelOver(dst, dstIndex, layer.buffer, (sy * layer.width + sx) * 4, layer.opacity);
      }
    }
  }
  return dst;
}
