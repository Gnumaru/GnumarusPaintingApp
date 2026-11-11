import { unzipSync, zipSync } from "fflate";
import { sanitizeTextHtml } from "../text/GnumarusTextSanitize";
import {
  GNUMARUS_TILE_MAX_DIMENSION,
  GNUMARUS_TILE_MIN_DIMENSION,
  isValidTilePlacement,
  type GnumarusTilePlacement,
} from "../tilemap/GnumarusTilemap";
import type { GnumarusTextDocument } from "../text/GnumarusText";
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

export interface GnumarusTextMeta {
  id: string;
  name: string;
  /** Inline document (project-file text storage); mutually exclusive with file. */
  document?: GnumarusTextDocument;
  /** External file under texts/ (raw .html or single-file .zip); mutually exclusive with document. */
  file?: string;
}

export interface GnumarusSvgMeta {
  id: string;
  name: string;
  /** Inline SVG document (embedded storage); mutually exclusive with file. */
  document?: { svg: string };
  /** External file under svgs/ (raw .svg or single-file .zip); mutually exclusive with document. */
  file?: string;
}

export interface GnumarusModel3dMeta {
  id: string;
  name: string;
  /** External model file under 3dmodels/; models are always stored as raw files. */
  file: string;
  /** Persisted orbit view (defaults to the classic 3/4 angle when absent). */
  view?: GnumarusModel3dView;
}

export interface GnumarusTilemapMeta {
  id: string;
  name: string;
  /** Tileset texture id (any project texture). */
  tilesetId: string;
  /** Tile width/height in pixels (1..1024, not necessarily square). */
  tileWidth: number;
  tileHeight: number;
  /** Sparse placements; grid origin is the top-left corner. */
  tiles: GnumarusTilePlacement[];
}

export interface GnumarusContentMeta {
  id: string;
  name: string;
  /** Null means the content carries only settings and renders nothing. */
  textureId: string | null;
  /** Rich text shown instead of a texture; mutually exclusive with textureId. */
  textId: string | null;
  /** Vector graphic shown instead of a texture or text; mutually exclusive with both. */
  svgId: string | null;
  /** 3D model shown instead of a texture, text or vector; mutually exclusive with all. */
  model3dId: string | null;
  /** Tilemap shown instead of a texture, text, vector or 3D model; mutually exclusive with all. */
  tilemapId: string | null;
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
  texts: GnumarusTextMeta[];
  svgs: GnumarusSvgMeta[];
  models3d: GnumarusModel3dMeta[];
  tilemaps: GnumarusTilemapMeta[];
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
  version: 3;
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

/** Raw HTML file for one text entry (`html` text storage mode). */
export function textFilePath(textId: string): string {
  return `texts/${textId}.html`;
}

/** Single-file ZIP holding one text entry (`htmlZip` text storage mode). */
export function textArchivePath(textId: string): string {
  return `texts/${textId}.zip`;
}

/** Valid external text file: `texts/<stem>.html` or `texts/<stem>.zip` (no traversal). */
export function parseTextFilePath(file: unknown): string | null {
  if (typeof file !== "string") {
    return null;
  }
  const match = /^texts\/([A-Za-z0-9_-]+)\.(html|zip)$/.exec(file);
  return match === null ? null : file;
}

/** Raw SVG file for one vector entry (`raw` svg storage mode). */
export function svgFilePath(svgId: string): string {
  return `svgs/${svgId}.svg`;
}

/** Single-file ZIP holding one vector entry (`compressed` svg storage mode). */
export function svgArchivePath(svgId: string): string {
  return `svgs/${svgId}.zip`;
}

/** Valid external vector file: `svgs/<stem>.svg` or `svgs/<stem>.zip` (no traversal). */
export function parseSvgFilePath(file: unknown): string | null {
  if (typeof file !== "string") {
    return null;
  }
  const match = /^svgs\/([A-Za-z0-9_-]+)\.(svg|zip)$/.exec(file);
  return match === null ? null : file;
}

/** Pack one SVG document as a single-file ZIP (`<svgId>.svg` inside). */
export function encodeSvgArchive(svgId: string, svg: string): Uint8Array {
  return zipSync({ [`${svgId}.svg`]: new TextEncoder().encode(svg) }, { level: 9 });
}

/**
 * Decode an external vector file to its SVG string. Raw `.svg` decodes
 * directly; `.zip` must hold exactly the matching `<stem>.svg` entry.
 * Throws GnumarusProjectError on corrupt archives or mismatched entries.
 */
export function decodeSvgFile(file: string, bytes: Uint8Array): string {
  const valid = parseSvgFilePath(file);
  if (valid === null) {
    throw new GnumarusProjectError(`project.json has a vector graphic with an invalid file: ${file}`);
  }
  if (file.endsWith(".svg")) {
    return new TextDecoder().decode(bytes);
  }
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(bytes) as Record<string, Uint8Array>;
  } catch {
    throw new GnumarusProjectError(`vector file is not a valid archive: ${file}`);
  }
  const stem = file.slice("svgs/".length, -".zip".length);
  const expected = `${stem}.svg`;
  const names = Object.keys(entries);
  if (names.length !== 1 || names[0] !== expected || entries[expected] === undefined) {
    throw new GnumarusProjectError(`vector archive has no ${expected} inside: ${file}`);
  }
  return new TextDecoder().decode(entries[expected] as Uint8Array);
}

/** 3D model extensions readable via three.js loaders. */
export const SUPPORTED_MODEL3D_EXTENSIONS = ["glb", "gltf", "obj", "stl", "ply", "fbx", "dae", "3mf", "amf"] as const;

export type GnumarusModel3dExtension = (typeof SUPPORTED_MODEL3D_EXTENSIONS)[number];

/** Lowercase 3D model extension of a file name, or null when unsupported. */
export function parseModel3dExtension(fileName: string): GnumarusModel3dExtension | null {
  const dot = fileName.toLowerCase().lastIndexOf(".");
  if (dot < 0) {
    return null;
  }
  const ext = fileName.toLowerCase().slice(dot + 1);
  return (SUPPORTED_MODEL3D_EXTENSIONS as readonly string[]).includes(ext)
    ? (ext as GnumarusModel3dExtension)
    : null;
}

/** Raw model file for one 3D entry (`3dmodels/<id>.<ext>`). */
export function model3dFilePath(modelId: string, ext: string): string {
  return `3dmodels/${modelId}.${ext.toLowerCase()}`;
}

/** Valid external model file: `3dmodels/<stem>.<supported ext>` (no traversal). */
export function parseModel3dFilePath(file: unknown): string | null {
  if (typeof file !== "string") {
    return null;
  }
  const match = /^3dmodels\/([A-Za-z0-9_-]+)\.([A-Za-z0-9]+)$/.exec(file);
  if (match === null || parseModel3dExtension(file) === null) {
    return null;
  }
  return file;
}

/** Orbit view of a 3D model: azimuth/elevation in degrees, camera distance, pan in unit-box units. */
export interface GnumarusModel3dView {
  azimuth: number;
  elevation: number;
  distance: number;
  panX: number;
  panY: number;
}

/** Default view: classic 3/4 angle matching the original fixed render. */
export const GNUMARUS_MODEL3D_DEFAULT_VIEW: GnumarusModel3dView = {
  azimuth: 39.8,
  elevation: 24.1,
  distance: 3.43,
  panX: 0,
  panY: 0,
};

function finiteOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** Lenient view parse: out-of-range or missing fields fall back to defaults. */
export function parseModel3dView(value: unknown): GnumarusModel3dView {
  if (!isRecord(value)) {
    return { ...GNUMARUS_MODEL3D_DEFAULT_VIEW };
  }
  const clamp = (raw: number, min: number, max: number): number => Math.min(max, Math.max(min, raw));
  return {
    azimuth: finiteOr(value["azimuth"], GNUMARUS_MODEL3D_DEFAULT_VIEW.azimuth),
    elevation: clamp(finiteOr(value["elevation"], GNUMARUS_MODEL3D_DEFAULT_VIEW.elevation), -89, 89),
    distance: clamp(finiteOr(value["distance"], GNUMARUS_MODEL3D_DEFAULT_VIEW.distance), 0.5, 50),
    panX: clamp(finiteOr(value["panX"], 0), -10, 10),
    panY: clamp(finiteOr(value["panY"], 0), -10, 10),
  };
}

/** Pack one text document as a single-file ZIP (`<textId>.html` inside). */
export function encodeTextArchive(textId: string, html: string): Uint8Array {
  return zipSync({ [`${textId}.html`]: new TextEncoder().encode(html) }, { level: 9 });
}

/**
 * Decode an external text file to its HTML string. Raw `.html` decodes
 * directly; `.zip` must hold exactly the matching `<stem>.html` entry.
 * Throws GnumarusProjectError on corrupt archives or mismatched entries.
 */
export function decodeTextFile(file: string, bytes: Uint8Array): string {
  const valid = parseTextFilePath(file);
  if (valid === null) {
    throw new GnumarusProjectError(`project.json has a text with an invalid file: ${file}`);
  }
  if (file.endsWith(".html")) {
    return new TextDecoder().decode(bytes);
  }
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(bytes) as Record<string, Uint8Array>;
  } catch {
    throw new GnumarusProjectError(`text file is not a valid archive: ${file}`);
  }
  const stem = file.slice("texts/".length, -".zip".length);
  const expected = `${stem}.html`;
  const names = Object.keys(entries);
  if (names.length !== 1 || names[0] !== expected || entries[expected] === undefined) {
    throw new GnumarusProjectError(`text archive has no ${expected} inside: ${file}`);
  }
  return new TextDecoder().decode(entries[expected] as Uint8Array);
}

export function createDefaultProject(width: number, height: number): GnumarusProjectMeta {
  return {
    app: GNUMARUS_APP_ID,
    version: 3,
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
      texts: [],
      svgs: [],
      models3d: [],
      tilemaps: [],
      contents: [
        {
          id: "content1",
          name: "C1",
          textureId: "layer0",
          textId: null,
          svgId: null,
          model3dId: null,
          tilemapId: null,
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
 * companions, external text files, and legacy per-cell files.
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
  for (const text of project.animation.texts) {
    if (text.file !== undefined) {
      out.add(text.file);
    }
  }
  for (const vector of project.animation.svgs) {
    if (vector.file !== undefined) {
      out.add(vector.file);
    }
  }
  for (const model of project.animation.models3d) {
    out.add(model.file);
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
  const { frames, currentFrame, defaultFrameDuration, frameDurations, frameNames, namedAnimations, activeAnimation, textures, texts, svgs, models3d, tilemaps, contents, cells } = value;
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
  const checkedTexts = parseTextMetas(texts);
  const textIds = new Set(checkedTexts.map((entry) => entry.id));
  const checkedSvgs = parseSvgMetas(svgs);
  const svgIds = new Set(checkedSvgs.map((entry) => entry.id));
  const checkedModels3d = parseModel3dMetas(models3d);
  const model3dIds = new Set(checkedModels3d.map((entry) => entry.id));
  const checkedTilemaps = parseTilemapMetas(tilemaps, textureIds);
  const tilemapIds = new Set(checkedTilemaps.map((entry) => entry.id));
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
    const { name, textureId, textId, svgId, model3dId, tilemapId, transform } = entry;
    if (textureId !== null && textureId !== undefined && typeof textureId !== "string") {
      throw new GnumarusProjectError("project.json has a content with an invalid texture reference");
    }
    const resolvedTexture = textureId === undefined ? null : (textureId as string | null);
    if (resolvedTexture !== null && !textureIds.has(resolvedTexture)) {
      throw new GnumarusProjectError("project.json has a content with an unknown texture");
    }
    if (textId !== null && textId !== undefined && typeof textId !== "string") {
      throw new GnumarusProjectError("project.json has a content with an invalid text reference");
    }
    const resolvedText = textId === undefined ? null : (textId as string | null);
    if (resolvedText !== null && !textIds.has(resolvedText)) {
      throw new GnumarusProjectError("project.json has a content with an unknown text");
    }
    if (svgId !== null && svgId !== undefined && typeof svgId !== "string") {
      throw new GnumarusProjectError("project.json has a content with an invalid vector reference");
    }
    const resolvedSvg = svgId === undefined ? null : (svgId as string | null);
    if (resolvedSvg !== null && !svgIds.has(resolvedSvg)) {
      throw new GnumarusProjectError("project.json has a content with an unknown vector graphic");
    }
    if (model3dId !== null && model3dId !== undefined && typeof model3dId !== "string") {
      throw new GnumarusProjectError("project.json has a content with an invalid 3D model reference");
    }
    const resolvedModel3d = model3dId === undefined ? null : (model3dId as string | null);
    if (resolvedModel3d !== null && !model3dIds.has(resolvedModel3d)) {
      throw new GnumarusProjectError("project.json has a content with an unknown 3D model");
    }
    if (tilemapId !== null && tilemapId !== undefined && typeof tilemapId !== "string") {
      throw new GnumarusProjectError("project.json has a content with an invalid tilemap reference");
    }
    const resolvedTilemap = tilemapId === undefined ? null : (tilemapId as string | null);
    if (resolvedTilemap !== null && !tilemapIds.has(resolvedTilemap)) {
      throw new GnumarusProjectError("project.json has a content with an unknown tilemap");
    }
    const linkedKinds = [resolvedTexture, resolvedText, resolvedSvg, resolvedModel3d, resolvedTilemap].filter((ref) => ref !== null).length;
    if (linkedKinds > 1) {
      throw new GnumarusProjectError("project.json has a content with more than one texture, text, vector graphic, 3D model or tilemap");
    }
    checkedContents.push({
      id,
      name: checkedName(name, "content"),
      textureId: resolvedTexture,
      textId: resolvedText,
      svgId: resolvedSvg,
      model3dId: resolvedModel3d,
      tilemapId: resolvedTilemap,
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
    texts: checkedTexts,
    svgs: checkedSvgs,
    models3d: checkedModels3d,
    tilemaps: checkedTilemaps,
    contents: checkedContents,
    cells: checkedCells,
  };
}

/** Strict text list (absent in legacy files means none). Sanitized on load. */
function parseTextMetas(value: unknown): GnumarusTextMeta[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new GnumarusProjectError("project.json has invalid texts");
  }
  const checked: GnumarusTextMeta[] = [];
  const seenIds = new Set<string>();
  const seenFiles = new Set<string>();
  for (const entry of value) {
    if (!isRecord(entry)) {
      throw new GnumarusProjectError("project.json has an invalid text");
    }
    const id = checkedId(entry.id, "text");
    if (seenIds.has(id)) {
      throw new GnumarusProjectError("project.json has duplicate text ids");
    }
    seenIds.add(id);
    const { name, document, file } = entry;
    const hasDocument = isRecord(document) && typeof document.html === "string";
    const textFile = parseTextFilePath(file);
    if ((hasDocument ? 1 : 0) + (textFile === null ? 0 : 1) !== 1) {
      throw new GnumarusProjectError("project.json has a text with an invalid document");
    }
    if (textFile !== null) {
      if (seenFiles.has(textFile)) {
        throw new GnumarusProjectError("project.json has duplicate text files");
      }
      seenFiles.add(textFile);
      checked.push({ id, name: checkedName(name, "text"), file: textFile });
    } else {
      checked.push({
        id,
        name: checkedName(name, "text"),
        document: { html: sanitizeTextHtml((document as { html: string }).html) },
      });
    }
  }
  return checked;
}

/** Strict vector list (absent in legacy files means none). File contents load separately. */
function parseSvgMetas(value: unknown): GnumarusSvgMeta[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new GnumarusProjectError("project.json has invalid vector graphics");
  }
  const checked: GnumarusSvgMeta[] = [];
  const seenIds = new Set<string>();
  const seenFiles = new Set<string>();
  for (const entry of value) {
    if (!isRecord(entry)) {
      throw new GnumarusProjectError("project.json has an invalid vector graphic");
    }
    const id = checkedId(entry.id, "vector graphic");
    if (seenIds.has(id)) {
      throw new GnumarusProjectError("project.json has duplicate vector graphic ids");
    }
    seenIds.add(id);
    const { name, document, file } = entry;
    const hasDocument = isRecord(document) && typeof document.svg === "string" && (document.svg as string).length > 0;
    const svgFile = parseSvgFilePath(file);
    if ((hasDocument ? 1 : 0) + (svgFile === null ? 0 : 1) !== 1) {
      throw new GnumarusProjectError("project.json has a vector graphic with an invalid document");
    }
    if (svgFile !== null) {
      if (seenFiles.has(svgFile)) {
        throw new GnumarusProjectError("project.json has duplicate vector graphic files");
      }
      seenFiles.add(svgFile);
      checked.push({ id, name: checkedName(name, "vector graphic"), file: svgFile });
    } else {
      checked.push({
        id,
        name: checkedName(name, "vector graphic"),
        document: { svg: (document as { svg: string }).svg },
      });
    }
  }
  return checked;
}

/** Strict tilemap list (absent in legacy files means none). Inline; validated strictly. */
function parseTilemapMetas(value: unknown, textureIds: Set<string>): GnumarusTilemapMeta[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new GnumarusProjectError("project.json has invalid tilemaps");
  }
  const checked: GnumarusTilemapMeta[] = [];
  const seenIds = new Set<string>();
  for (const entry of value) {
    if (!isRecord(entry)) {
      throw new GnumarusProjectError("project.json has an invalid tilemap");
    }
    const id = checkedId(entry.id, "tilemap");
    if (seenIds.has(id)) {
      throw new GnumarusProjectError("project.json has duplicate tilemap ids");
    }
    seenIds.add(id);
    const { name, tilesetId, tileWidth, tileHeight, tiles } = entry;
    if (typeof tilesetId !== "string" || !textureIds.has(tilesetId)) {
      throw new GnumarusProjectError("project.json has a tilemap with an unknown tileset");
    }
    if (
      typeof tileWidth !== "number" ||
      !Number.isInteger(tileWidth) ||
      tileWidth < GNUMARUS_TILE_MIN_DIMENSION ||
      tileWidth > GNUMARUS_TILE_MAX_DIMENSION ||
      typeof tileHeight !== "number" ||
      !Number.isInteger(tileHeight) ||
      tileHeight < GNUMARUS_TILE_MIN_DIMENSION ||
      tileHeight > GNUMARUS_TILE_MAX_DIMENSION
    ) {
      throw new GnumarusProjectError("project.json has a tilemap with invalid tile dimensions");
    }
    if (!Array.isArray(tiles)) {
      throw new GnumarusProjectError("project.json has a tilemap with invalid tiles");
    }
    const checkedTiles: GnumarusTilePlacement[] = [];
    const seenCells = new Set<string>();
    for (const placement of tiles) {
      if (!isValidTilePlacement(placement)) {
        throw new GnumarusProjectError("project.json has a tilemap with an invalid tile");
      }
      const key = `${placement.x},${placement.y}`;
      if (seenCells.has(key)) {
        throw new GnumarusProjectError("project.json has a tilemap with duplicate tiles");
      }
      seenCells.add(key);
      checkedTiles.push({ ...placement });
    }
    checked.push({ id, name: checkedName(name, "tilemap"), tilesetId, tileWidth, tileHeight, tiles: checkedTiles });
  }
  return checked;
}

/** Strict 3D model list (absent in legacy files means none). Files load separately. */
function parseModel3dMetas(value: unknown): GnumarusModel3dMeta[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new GnumarusProjectError("project.json has invalid 3D models");
  }
  const checked: GnumarusModel3dMeta[] = [];
  const seenIds = new Set<string>();
  const seenFiles = new Set<string>();
  for (const entry of value) {
    if (!isRecord(entry)) {
      throw new GnumarusProjectError("project.json has an invalid 3D model");
    }
    const id = checkedId(entry.id, "3D model");
    if (seenIds.has(id)) {
      throw new GnumarusProjectError("project.json has duplicate 3D model ids");
    }
    seenIds.add(id);
    const { name, file, view } = entry;
    const modelFile = parseModel3dFilePath(file);
    if (modelFile === null) {
      throw new GnumarusProjectError("project.json has a 3D model with an invalid file");
    }
    if (seenFiles.has(modelFile)) {
      throw new GnumarusProjectError("project.json has duplicate 3D model files");
    }
    seenFiles.add(modelFile);
    checked.push({ id, name: checkedName(name, "3D model"), file: modelFile, view: parseModel3dView(view) });
  }
  return checked;
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
      textId: null,
      svgId: null,
      model3dId: null,
      tilemapId: null,
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
    texts: [],
    svgs: [],
    models3d: [],
    tilemaps: [],
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
  if (version !== 1 && version !== 2 && version !== 3) {
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
    version: 3,
    width: Math.floor(width),
    height: Math.floor(height),
    layers: checkedLayers,
    animation: checkedAnimation,
  };
}
