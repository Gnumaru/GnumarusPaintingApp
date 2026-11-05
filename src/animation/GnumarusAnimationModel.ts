/**
 * Pure animation matrix model: layers x frames cells referencing shared
 * cell contents, which combine zero or one project texture with cell
 * settings (position, rotation and flips). No DOM or WebGL here so the
 * resolution rules stay unit-testable; the engine owns the live maps.
 */
import type { GnumarusLayerTransform } from "../canvas/GnumarusViewportMath";
import { IDENTITY_LAYER_TRANSFORM } from "../canvas/GnumarusViewportMath";

export interface GnumarusTexturePixels {
  id: string;
  name: string;
  width: number;
  height: number;
  buffer: Uint8ClampedArray;
}

export interface GnumarusCellContentData {
  id: string;
  name: string;
  /** Null means the content carries only settings and renders nothing. */
  textureId: string | null;
  transform: GnumarusLayerTransform;
}

export interface GnumarusResolvedCell {
  layerId: string;
  /** Null when the cell is empty or references a missing content. */
  contentId: string | null;
  textureId: string | null;
  /** Null buffer with 0x0 dimensions when the cell renders nothing. */
  buffer: Uint8ClampedArray | null;
  width: number;
  height: number;
  transform: GnumarusLayerTransform;
}

/** Map key for the (layer, frame) intersection. */
export function animationCellKey(layerId: string, frame: number): string {
  return `${layerId}\n${frame}`;
}

export const GNUMARUS_DEFAULT_FRAME_DURATION_MS = 100;
export const GNUMARUS_MIN_FRAME_DURATION_MS = 1;
export const GNUMARUS_MAX_FRAME_DURATION_MS = 60000;

/** Clamp a frame duration to the supported millisecond range. */
export function clampFrameDurationMs(value: number): number {
  if (!Number.isFinite(value)) {
    return GNUMARUS_DEFAULT_FRAME_DURATION_MS;
  }
  return Math.min(GNUMARUS_MAX_FRAME_DURATION_MS, Math.max(GNUMARUS_MIN_FRAME_DURATION_MS, Math.floor(value)));
}

/** Explicit per-frame duration wins; otherwise the project default applies. */
export function effectiveFrameDurationMs(explicitMs: number | null | undefined, defaultMs: number): number {
  if (explicitMs === null || explicitMs === undefined || !Number.isFinite(explicitMs)) {
    return clampFrameDurationMs(defaultMs);
  }
  return clampFrameDurationMs(explicitMs);
}

/**
 * Resolve every layer to the pixels and transform it shows on one frame.
 * Buffers are shared references into the texture pool (no copies), so
 * painting through a resolved buffer edits the shared texture and every
 * cell using the same content sees the change.
 */
export function resolveAnimationFrame(
  layerIds: string[],
  textures: ReadonlyMap<string, { width: number; height: number; buffer: Uint8ClampedArray }>,
  contents: ReadonlyMap<string, { textureId: string | null; transform: GnumarusLayerTransform }>,
  cells: ReadonlyMap<string, string>,
  frame: number,
): Map<string, GnumarusResolvedCell> {
  const resolved = new Map<string, GnumarusResolvedCell>();
  for (const layerId of layerIds) {
    const contentId = cells.get(animationCellKey(layerId, frame)) ?? null;
    if (contentId === null) {
      resolved.set(layerId, {
        layerId,
        contentId: null,
        textureId: null,
        buffer: null,
        width: 0,
        height: 0,
        transform: { ...IDENTITY_LAYER_TRANSFORM },
      });
      continue;
    }
    const content = contents.get(contentId);
    if (content === undefined) {
      resolved.set(layerId, {
        layerId,
        contentId: null,
        textureId: null,
        buffer: null,
        width: 0,
        height: 0,
        transform: { ...IDENTITY_LAYER_TRANSFORM },
      });
      continue;
    }
    const texture = content.textureId === null ? null : (textures.get(content.textureId) ?? null);
    if (texture === null) {
      resolved.set(layerId, {
        layerId,
        contentId,
        textureId: content.textureId,
        buffer: null,
        width: 0,
        height: 0,
        transform: { ...content.transform },
      });
      continue;
    }
    resolved.set(layerId, {
      layerId,
      contentId,
      textureId: content.textureId,
      buffer: texture.buffer,
      width: texture.width,
      height: texture.height,
      transform: { ...content.transform },
    });
  }
  return resolved;
}
