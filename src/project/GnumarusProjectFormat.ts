import { unzipSync, zipSync } from "fflate";
import type { GnumarusLayerTransform } from "../canvas/GnumarusViewportMath";
import { IDENTITY_LAYER_TRANSFORM } from "../canvas/GnumarusViewportMath";
import type { GnumarusAnimationLoop } from "../animation/GnumarusNamedAnimations";
import { parseChannelLock, type GnumarusChannelLock } from "../canvas/GnumarusPixelBuffer";
import {
  clampFrameDurationSec,
  defaultFrameName,
  ensureFrameNames,
  normalizeFrameName,
  GNUMARUS_DEFAULT_FRAME_DURATION_SEC,
} from "../animation/GnumarusAnimationModel";

export interface GnumarusCellRef {
  frame: number;
  file: string;
}

export interface GnumarusTextureMeta {
  id: string;
  name: string;
  width: number;
  height: number;
  file: string;
}

export interface GnumarusContentMeta {
  id: string;
  name: string;
  /** Null means the content carries only settings and renders nothing. */
  textureId: string | null;
  transform: GnumarusLayerTransform;
}

export interface GnumarusMatrixCellRef {
  layer: string;
  frame: number;
  content: string;
}

export interface GnumarusFrameDurationRef {
  frame: number;
  duration: number;
}

export interface GnumarusNamedAnimationFrameMeta {
  /** 0-based project frame index. */
  frame: number;
  /** Per-frame duration override in seconds, or null for the project duration. */
  duration: number | null;
}

export interface GnumarusNamedAnimationMeta {
  name: string;
  loop: GnumarusAnimationLoop;
  frames: GnumarusNamedAnimationFrameMeta[];
}

export interface GnumarusAnimationMeta {
  frames: number;
  currentFrame: number;
  /** Project-wide fallback in seconds when a frame has no explicit duration. */
  defaultFrameDuration: number;
  /** Only frames with an explicit duration are listed. */
  frameDurations: GnumarusFrameDurationRef[];
  /** Display names per frame index (length matches frames). */
  frameNames: string[];
  /** Named frame sequences (may be empty). */
  namedAnimations: GnumarusNamedAnimationMeta[];
  /** Selected named animation, or null for the full timeline. */
  activeAnimation: string | null;
  textures: GnumarusTextureMeta[];
  contents: GnumarusContentMeta[];
  cells: GnumarusMatrixCellRef[];
}

export interface GnumarusLayerMeta {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  lockedChannels: GnumarusChannelLock;
  /** Legacy size/transform/cells: present in old files, omitted in new ones. */
  width?: number;
  height?: number;
  transform?: GnumarusLayerTransform;
  cells?: GnumarusCellRef[];
}

export interface GnumarusProjectMeta {
  app: string;
  version: 2;
  width: number;
  height: number;
  layers: GnumarusLayerMeta[];
  animation: GnumarusAnimationMeta;
}

export const GNUMARUS_APP_ID = "GnumarusPaintingAndAnimationApp";
export const GNUMARUS_PROJECT_FILE = "project.json";
/** Zipped project archive holding a single `project.json` entry. */
export const GNUMARUS_PROJECT_ARCHIVE_FILE = "project.gpa";

export class GnumarusProjectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GnumarusProjectError";
  }
}

export function cellFilePath(layerId: string, frame: number): string {
  return `cells/${layerId}_frame${frame}.png`;
}

export function textureFilePath(textureId: string, ext = "png"): string {
  return `textures/${textureId}.${ext}`;
}

export function createDefaultProject(width: number, height: number): GnumarusProjectMeta {
  return {
    app: GNUMARUS_APP_ID,
    version: 2,
    width,
    height,
    layers: [
      {
        id: "layer0",
        name: "L1",
        visible: true,
        opacity: 1,
        lockedChannels: { r: false, g: false, b: false, a: false },
      },
    ],
    animation: {
      frames: 1,
      currentFrame: 0,
      defaultFrameDuration: GNUMARUS_DEFAULT_FRAME_DURATION_SEC,
      frameDurations: [],
      frameNames: [defaultFrameName(0)],
      namedAnimations: [],
      activeAnimation: null,
      textures: [{ id: "layer0", name: "t1", width, height, file: textureFilePath("layer0") }],
      contents: [
        {
          id: "content1",
          name: "C1",
          textureId: "layer0",
          transform: { ...IDENTITY_LAYER_TRANSFORM },
        },
      ],
      cells: [{ layer: "layer0", frame: 0, content: "content1" }],
    },
  };
}

export function serializeProject(project: GnumarusProjectMeta): string {
  return JSON.stringify(project, null, 2);
}

/**
 * Pack serialized project JSON as a ZIP archive at maximum compression,
 * with a single `project.json` entry identical to the plain bytes.
 */
export function encodeProjectArchive(jsonText: string): Uint8Array {
  return zipSync({ [GNUMARUS_PROJECT_FILE]: new TextEncoder().encode(jsonText) }, { level: 9 });
}

/** Unpack a project archive back to its serialized JSON text. */
export function decodeProjectArchive(bytes: Uint8Array): string {
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(bytes);
  } catch (error) {
    throw new GnumarusProjectError(
      `project.gpa is not a valid zip archive (${error instanceof Error ? error.message : String(error)})`,
    );
  }
  const inner = entries[GNUMARUS_PROJECT_FILE];
  if (inner === undefined) {
    throw new GnumarusProjectError("project.gpa has no project.json inside");
  }
  return new TextDecoder().decode(inner);
}

/** Texture container extensions used for project texture files. */
export const GNUMARUS_TEXTURE_EXTENSIONS = ["jxl", "webp", "png", "jpg"] as const;

/**
 * Companion grayscale alpha file for a JPEG texture file, or null when the
 * path is not a JPEG color file (companions never nest).
 */
export function textureAlphaCompanion(file: string): string | null {
  if (!file.endsWith(".jpg") || file.endsWith(".alpha.jpg")) {
    return null;
  }
  return `${file.slice(0, -".jpg".length)}.alpha.jpg`;
}

/**
 * Every file path referenced by a project: texture files, their JPEG alpha
 * companions, and legacy per-cell files.
 */
export function collectProjectFileReferences(project: GnumarusProjectMeta): Set<string> {
  const out = new Set<string>();
  for (const texture of project.animation.textures) {
    out.add(texture.file);
    const companion = textureAlphaCompanion(texture.file);
    if (companion !== null) {
      out.add(companion);
    }
  }
  for (const layer of project.layers) {
    for (const cell of layer.cells ?? []) {
      out.add(cell.file);
    }
  }
  return out;
}

/**
 * Every texture path that can exist for one stem (`t1`, `t2`, ...): one per
 * container extension plus the JPEG alpha companion.
 */
export function staleTextureCandidates(stem: string): string[] {
  const out = GNUMARUS_TEXTURE_EXTENSIONS.map((ext) => textureFilePath(stem, ext));
  out.push(textureFilePath(`${stem}.alpha`, "jpg"));
  return out;
}

/** Old paths that are no longer referenced: each old path missing from the new set. */
export function findStaleProjectPaths(
  oldPaths: Iterable<string>,
  newPaths: ReadonlySet<string>,
): string[] {
  const stale: string[] = [];
  for (const old of oldPaths) {
    if (!newPaths.has(old)) {
      stale.push(old);
    }
  }
  return stale;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseLayerTransform(value: unknown): GnumarusLayerTransform {
  if (!isRecord(value)) {
    return { ...IDENTITY_LAYER_TRANSFORM };
  }
  const { x, y, rotation, flipX, flipY, scaleX, scaleY, skewX, skewY, rotationX, rotationY } = value;
  const parsedScaleX =
    typeof scaleX === "number" && Number.isFinite(scaleX) && scaleX > 0 ? (scaleX as number) : 1;
  const parsedScaleY =
    typeof scaleY === "number" && Number.isFinite(scaleY) && scaleY > 0 ? (scaleY as number) : 1;
  const parsedSkewX = typeof skewX === "number" && Number.isFinite(skewX) ? (skewX as number) : 0;
  const parsedSkewY = typeof skewY === "number" && Number.isFinite(skewY) ? (skewY as number) : 0;
  const parsedRotationX =
    typeof rotationX === "number" && Number.isFinite(rotationX) ? (rotationX as number) : 0;
  const parsedRotationY =
    typeof rotationY === "number" && Number.isFinite(rotationY) ? (rotationY as number) : 0;
  return {
    x: typeof x === "number" && Number.isFinite(x) ? x : 0,
    y: typeof y === "number" && Number.isFinite(y) ? y : 0,
    rotation: typeof rotation === "number" && Number.isFinite(rotation) ? rotation : 0,
    flipX: flipX === true,
    flipY: flipY === true,
    scaleX: parsedScaleX,
    scaleY: parsedScaleY,
    skewX: parsedSkewX,
    skewY: parsedSkewY,
    rotationX: parsedRotationX,
    rotationY: parsedRotationY,
  };
}

function checkedId(value: unknown, what: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new GnumarusProjectError(`project.json has an invalid ${what} id`);
  }
  return value;
}

function checkedName(value: unknown, what: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new GnumarusProjectError(`project.json has an invalid ${what} name`);
  }
  return value;
}

function parseAnimationMeta(value: unknown, layerIds: Set<string>, durationsInMs: boolean): GnumarusAnimationMeta {
  if (!isRecord(value)) {
    throw new GnumarusProjectError("project.json has an invalid animation section");
  }
  const { frames, currentFrame, defaultFrameDuration, frameDurations, frameNames, namedAnimations, activeAnimation, textures, contents, cells } = value;
  if (!Number.isInteger(frames) || (frames as number) < 1) {
    throw new GnumarusProjectError("project.json has an invalid frame count");
  }
  const frameCount = frames as number;
  let startFrame = 0;
  if (currentFrame !== undefined) {
    if (!Number.isInteger(currentFrame)) {
      throw new GnumarusProjectError("project.json has an invalid current frame");
    }
    startFrame = Math.min(frameCount - 1, Math.max(0, currentFrame as number));
  }
  if (!Array.isArray(textures)) {
    throw new GnumarusProjectError("project.json has invalid textures");
  }
  const checkedTextures: GnumarusTextureMeta[] = [];
  const textureIds = new Set<string>();
  for (const entry of textures) {
    if (!isRecord(entry)) {
      throw new GnumarusProjectError("project.json has an invalid texture");
    }
    const id = checkedId(entry.id, "texture");
    if (textureIds.has(id)) {
      throw new GnumarusProjectError("project.json has duplicate texture ids");
    }
    textureIds.add(id);
    const { name, width, height, file } = entry;
    if (
      typeof width !== "number" ||
      !Number.isInteger(width) ||
      width < 1 ||
      typeof height !== "number" ||
      !Number.isInteger(height) ||
      height < 1
    ) {
      throw new GnumarusProjectError("project.json has a texture with invalid dimensions");
    }
    if (typeof file !== "string" || file.length === 0) {
      throw new GnumarusProjectError("project.json has a texture with an invalid file");
    }
    checkedTextures.push({ id, name: checkedName(name, "texture"), width, height, file });
  }
  if (!Array.isArray(contents)) {
    throw new GnumarusProjectError("project.json has invalid contents");
  }
  const checkedContents: GnumarusContentMeta[] = [];
  const contentIds = new Set<string>();
  for (const entry of contents) {
    if (!isRecord(entry)) {
      throw new GnumarusProjectError("project.json has an invalid cell content");
    }
    const id = checkedId(entry.id, "content");
    if (contentIds.has(id)) {
      throw new GnumarusProjectError("project.json has duplicate content ids");
    }
    contentIds.add(id);
    const { name, textureId, transform } = entry;
    if (textureId !== null && textureId !== undefined && typeof textureId !== "string") {
      throw new GnumarusProjectError("project.json has a content with an invalid texture reference");
    }
    const resolvedTexture = textureId === undefined ? null : (textureId as string | null);
    if (resolvedTexture !== null && !textureIds.has(resolvedTexture)) {
      throw new GnumarusProjectError("project.json has a content with an unknown texture");
    }
    checkedContents.push({
      id,
      name: checkedName(name, "content"),
      textureId: resolvedTexture,
      transform: parseLayerTransform(transform),
    });
  }
  if (!Array.isArray(cells)) {
    throw new GnumarusProjectError("project.json has invalid cells");
  }
  const checkedCells: GnumarusMatrixCellRef[] = [];
  const seenCells = new Set<string>();
  for (const entry of cells) {
    if (!isRecord(entry)) {
      throw new GnumarusProjectError("project.json has an invalid matrix cell");
    }
    const { layer, frame, content } = entry;
    if (typeof layer !== "string" || !layerIds.has(layer)) {
      throw new GnumarusProjectError("project.json has a cell with an unknown layer");
    }
    if (!Number.isInteger(frame) || (frame as number) < 0 || (frame as number) >= frameCount) {
      throw new GnumarusProjectError("project.json has a cell with an invalid frame");
    }
    if (typeof content !== "string" || !contentIds.has(content)) {
      throw new GnumarusProjectError("project.json has a cell with an unknown content");
    }
    const key = `${layer}\n${frame as number}`;
    if (seenCells.has(key)) {
      throw new GnumarusProjectError("project.json has a duplicated matrix cell");
    }
    seenCells.add(key);
    checkedCells.push({ layer, frame: frame as number, content: content as string });
  }
  let checkedDefaultSec = GNUMARUS_DEFAULT_FRAME_DURATION_SEC;
  if (defaultFrameDuration !== undefined) {
    if (typeof defaultFrameDuration !== "number" || !Number.isFinite(defaultFrameDuration)) {
      throw new GnumarusProjectError("project.json has an invalid default frame duration");
    }
    checkedDefaultSec = clampFrameDurationSec(durationsInMs ? (defaultFrameDuration as number) / 1000 : (defaultFrameDuration as number));
  }
  const checkedDurations: GnumarusFrameDurationRef[] = [];
  if (frameDurations !== undefined) {
    if (!Array.isArray(frameDurations)) {
      throw new GnumarusProjectError("project.json has invalid frame durations");
    }
    const seenFrames = new Set<number>();
    for (const entry of frameDurations) {
      if (!isRecord(entry)) {
        throw new GnumarusProjectError("project.json has an invalid frame duration");
      }
      const { frame, duration } = entry;
      if (!Number.isInteger(frame) || (frame as number) < 0 || (frame as number) >= frameCount) {
        throw new GnumarusProjectError("project.json has a frame duration with an invalid frame");
      }
      if (typeof duration !== "number" || !Number.isFinite(duration)) {
        throw new GnumarusProjectError("project.json has a frame duration with an invalid duration");
      }
      if (seenFrames.has(frame as number)) {
        throw new GnumarusProjectError("project.json has a duplicated frame duration");
      }
      seenFrames.add(frame as number);
      checkedDurations.push({ frame: frame as number, duration: clampFrameDurationSec(durationsInMs ? (duration as number) / 1000 : (duration as number)) });
    }
    checkedDurations.sort((left, right) => left.frame - right.frame);
  }
  let checkedNames: string[];
  if (frameNames === undefined) {
    checkedNames = ensureFrameNames(frameCount);
  } else {
    if (!Array.isArray(frameNames) || (frameNames as unknown[]).length !== frameCount) {
      throw new GnumarusProjectError("project.json has invalid frame names");
    }
    checkedNames = [];
    for (const entry of frameNames as unknown[]) {
      if (typeof entry !== "string" || normalizeFrameName(entry) === null) {
        throw new GnumarusProjectError("project.json has an invalid frame name");
      }
      checkedNames.push((entry as string).trim().slice(0, 64));
    }
  }
  const checkedAnimations = parseNamedAnimationMetas(namedAnimations, frameCount, durationsInMs);
  return {
    frames: frameCount,
    currentFrame: startFrame,
    defaultFrameDuration: checkedDefaultSec,
    frameDurations: checkedDurations,
    frameNames: checkedNames,
    namedAnimations: checkedAnimations,
    activeAnimation: parseActiveAnimationName(activeAnimation, checkedAnimations),
    textures: checkedTextures,
    contents: checkedContents,
    cells: checkedCells,
  };
}

/** Strict named-animation list (absent in legacy files means none). */
function parseNamedAnimationMetas(value: unknown, frameCount: number, durationsInMs: boolean): GnumarusNamedAnimationMeta[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new GnumarusProjectError("project.json has invalid named animations");
  }
  const checked: GnumarusNamedAnimationMeta[] = [];
  const seenNames = new Set<string>();
  for (const entry of value) {
    if (!isRecord(entry)) {
      throw new GnumarusProjectError("project.json has an invalid named animation");
    }
    const { name, loop, frames } = entry;
    if (typeof name !== "string" || name.trim().length === 0) {
      throw new GnumarusProjectError("project.json has a named animation with an invalid name");
    }
    const trimmed = name.trim().slice(0, 64);
    if (seenNames.has(trimmed)) {
      throw new GnumarusProjectError(`project.json has a duplicated animation name "${trimmed}"`);
    }
    seenNames.add(trimmed);
    if (loop !== "none" && loop !== "forward" && loop !== "ping-pong") {
      throw new GnumarusProjectError(`project.json has an animation with an invalid loop mode`);
    }
    if (!Array.isArray(frames)) {
      throw new GnumarusProjectError("project.json has a named animation with invalid frames");
    }
    const checkedFrames: GnumarusNamedAnimationFrameMeta[] = [];
    for (const item of frames) {
      if (!isRecord(item)) {
        throw new GnumarusProjectError("project.json has a named animation with an invalid frame");
      }
      const { frame, duration } = item;
      if (!Number.isInteger(frame) || (frame as number) < 0 || (frame as number) >= frameCount) {
        throw new GnumarusProjectError("project.json has a named animation with an invalid frame");
      }
      if (duration !== null && duration !== undefined && (typeof duration !== "number" || !Number.isFinite(duration))) {
        throw new GnumarusProjectError("project.json has a named animation with an invalid duration");
      }
      checkedFrames.push({
        frame: frame as number,
        duration: duration === undefined || duration === null ? null : clampFrameDurationSec(durationsInMs ? (duration as number) / 1000 : (duration as number)),
      });
    }
    checked.push({ name: trimmed, loop, frames: checkedFrames });
  }
  return checked;
}

/**
 * Active animation selection: unknown names coerce to null (like current
 * frame clamping), malformed values throw.
 */
function parseActiveAnimationName(value: unknown, animations: GnumarusNamedAnimationMeta[]): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== "string") {
    throw new GnumarusProjectError("project.json has an invalid active animation");
  }
  return animations.some((entry) => entry.name === value) ? value : null;
}

function migrateLegacyLayersToAnimation(
  layers: GnumarusLayerMeta[],
  projectWidth: number,
  projectHeight: number,
): GnumarusAnimationMeta {
  const textures: GnumarusTextureMeta[] = [];
  const contents: GnumarusContentMeta[] = [];
  const cells: GnumarusMatrixCellRef[] = [];
  layers.forEach((layer, index) => {
    const width = layer.width !== undefined && layer.width >= 1 ? Math.floor(layer.width) : projectWidth;
    const height = layer.height !== undefined && layer.height >= 1 ? Math.floor(layer.height) : projectHeight;
    const legacyCell = layer.cells?.[0];
    textures.push({
      id: layer.id,
      name: `t${index + 1}`,
      width,
      height,
      file: legacyCell?.file ?? textureFilePath(layer.id),
    });
    const contentId = `content${index + 1}`;
    contents.push({
      id: contentId,
      name: `C${index + 1}`,
      textureId: layer.id,
      transform: layer.transform !== undefined ? { ...layer.transform } : { ...IDENTITY_LAYER_TRANSFORM },
    });
    cells.push({ layer: layer.id, frame: 0, content: contentId });
  });
  return {
    frames: 1,
    currentFrame: 0,
    defaultFrameDuration: GNUMARUS_DEFAULT_FRAME_DURATION_SEC,
    frameDurations: [],
    frameNames: [defaultFrameName(0)],
    namedAnimations: [],
    activeAnimation: null,
    textures,
    contents,
    cells,
  };
}

export function parseProject(jsonText: string): GnumarusProjectMeta {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText) as unknown;
  } catch {
    throw new GnumarusProjectError("project.json is not valid JSON");
  }
  if (!isRecord(parsed)) {
    throw new GnumarusProjectError("project.json root must be an object");
  }
  const { app, version, width, height, layers, animation } = parsed;
  if (app !== GNUMARUS_APP_ID) {
    throw new GnumarusProjectError("project.json app id mismatch");
  }
  if (version !== 1 && version !== 2) {
    throw new GnumarusProjectError("unsupported project version");
  }
  // Version 1 stored frame durations in milliseconds; version 2 uses seconds.
  const durationsInMs = version === 1;
  if (typeof width !== "number" || typeof height !== "number" || width < 1 || height < 1) {
    throw new GnumarusProjectError("project.json has invalid dimensions");
  }
  const widthDim = Math.floor(width);
  const heightDim = Math.floor(height);
  if (!Array.isArray(layers) || layers.length === 0) {
    throw new GnumarusProjectError("project.json has no layers");
  }
  const layerIds = new Set<string>();
  const checkedLayers: GnumarusLayerMeta[] = layers.map((entry: unknown) => {
    if (!isRecord(entry)) {
      throw new GnumarusProjectError("project.json has an invalid layer");
    }
    const { id, name, visible, opacity, width, height, transform, lockedChannels, cells } = entry;
    if (typeof id !== "string" || typeof name !== "string") {
      throw new GnumarusProjectError("project.json has a layer with invalid id/name");
    }
    if (layerIds.has(id)) {
      throw new GnumarusProjectError("project.json has duplicate layer ids");
    }
    layerIds.add(id);
    if (typeof visible !== "boolean" || typeof opacity !== "number") {
      throw new GnumarusProjectError("project.json has a layer with invalid flags");
    }
    const checked: GnumarusLayerMeta = {
      id,
      name,
      visible,
      opacity,
      lockedChannels: parseChannelLock(lockedChannels),
    };
    if (typeof width === "number" && width >= 1) {
      checked.width = Math.floor(width);
    } else if (width !== undefined) {
      throw new GnumarusProjectError("project.json has a layer with invalid dimensions");
    }
    if (typeof height === "number" && height >= 1) {
      checked.height = Math.floor(height);
    } else if (height !== undefined) {
      throw new GnumarusProjectError("project.json has a layer with invalid dimensions");
    }
    if (transform !== undefined) {
      checked.transform = parseLayerTransform(transform);
    }
    if (cells !== undefined) {
      if (!Array.isArray(cells)) {
        throw new GnumarusProjectError("project.json has a layer with an invalid cell list");
      }
      checked.cells = cells.map((cell: unknown) => {
        if (!isRecord(cell) || typeof cell.frame !== "number" || typeof cell.file !== "string") {
          throw new GnumarusProjectError("project.json has an invalid cell");
        }
        return { frame: cell.frame, file: cell.file };
      });
    }
    return checked;
  });
  const checkedAnimation =
    animation === undefined
      ? migrateLegacyLayersToAnimation(checkedLayers, widthDim, heightDim)
      : parseAnimationMeta(animation, layerIds, durationsInMs);
  return {
    app: GNUMARUS_APP_ID,
    version: 2,
    width: Math.floor(width),
    height: Math.floor(height),
    layers: checkedLayers,
    animation: checkedAnimation,
  };
}
