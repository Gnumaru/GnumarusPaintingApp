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

/** Split an animation cell key back into its layer id and frame number. */
export function parseAnimationCellKey(key: string): { layerId: string; frame: number } {
  const separator = key.lastIndexOf("\n");
  return { layerId: key.slice(0, separator), frame: Number.parseInt(key.slice(separator + 1), 10) };
}

/** Shift every cell at frame >= at up by one slot (frame insertion). */
export function insertFrameCells(cells: ReadonlyMap<string, string>, at: number): Map<string, string> {
  const shifted = new Map<string, string>();
  for (const [key, contentId] of cells) {
    const { layerId, frame } = parseAnimationCellKey(key);
    shifted.set(animationCellKey(layerId, frame >= at ? frame + 1 : frame), contentId);
  }
  return shifted;
}

/** Shift every explicit duration at frame >= at up by one slot (frame insertion). */
export function insertFrameDurations(
  durations: ReadonlyMap<number, number>,
  at: number,
): Map<number, number> {
  const shifted = new Map<number, number>();
  for (const [frame, duration] of durations) {
    shifted.set(frame >= at ? frame + 1 : frame, duration);
  }
  return shifted;
}

/** Swap the cells of two frames (frame move). */
export function swapFrameCells(
  cells: ReadonlyMap<string, string>,
  first: number,
  second: number,
): Map<string, string> {
  if (first === second) {
    return new Map(cells);
  }
  const swapped = new Map<string, string>();
  for (const [key, contentId] of cells) {
    const { layerId, frame } = parseAnimationCellKey(key);
    const target = frame === first ? second : frame === second ? first : frame;
    swapped.set(animationCellKey(layerId, target), contentId);
  }
  return swapped;
}

/** Swap the explicit durations of two frames, preserving absence on either side. */
export function swapFrameDurations(
  durations: ReadonlyMap<number, number>,
  first: number,
  second: number,
): Map<number, number> {
  const swapped = new Map(durations);
  const firstValue = swapped.get(first);
  const secondValue = swapped.get(second);
  if (secondValue === undefined) {
    swapped.delete(first);
  } else {
    swapped.set(first, secondValue);
  }
  if (firstValue === undefined) {
    swapped.delete(second);
  } else {
    swapped.set(second, firstValue);
  }
  return swapped;
}

/** Default display name for a frame index (0-based). */
export function defaultFrameName(frame: number): string {
  return `F${frame + 1}`;
}

/** Normalize a user-supplied frame name (trimmed, 1..64 chars). Null when empty. */
export function normalizeFrameName(name: string): string | null {
  const trimmed = name.trim().slice(0, 64);
  return trimmed.length === 0 ? null : trimmed;
}

/** Fill missing frame names with defaults so the array length matches the frame count. */
export function ensureFrameNames(count: number, existing: readonly string[] = []): string[] {
  const names: string[] = [];
  for (let frame = 0; frame < count; frame += 1) {
    const current = existing[frame];
    names.push(typeof current === "string" && normalizeFrameName(current) !== null ? (current as string).trim().slice(0, 64) : defaultFrameName(frame));
  }
  return names;
}

/** Insert a frame name at position `at`, shifting later names up by one slot. */
export function insertFrameNames(names: readonly string[], at: number, name: string): string[] {
  const clamped = Math.min(Math.max(0, Math.floor(at)), names.length);
  return [...names.slice(0, clamped), name, ...names.slice(clamped)];
}

/** Swap the names of two frames. */
export function swapFrameNames(names: readonly string[], first: number, second: number): string[] {
  if (first === second || first < 0 || second < 0 || first >= names.length || second >= names.length) {
    return [...names];
  }
  const swapped = [...names];
  const firstValue = swapped[first];
  const secondValue = swapped[second];
  if (firstValue !== undefined && secondValue !== undefined) {
    swapped[first] = secondValue;
    swapped[second] = firstValue;
  }
  return swapped;
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
