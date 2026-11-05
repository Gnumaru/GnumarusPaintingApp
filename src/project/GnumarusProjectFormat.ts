import type { GnumarusLayerTransform } from "../canvas/GnumarusViewportMath";
import { IDENTITY_LAYER_TRANSFORM } from "../canvas/GnumarusViewportMath";
import { parseChannelLock, type GnumarusChannelLock } from "../canvas/GnumarusPixelBuffer";

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

export interface GnumarusAnimationMeta {
  frames: number;
  currentFrame: number;
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
  version: 1;
  width: number;
  height: number;
  layers: GnumarusLayerMeta[];
  animation: GnumarusAnimationMeta;
}

export const GNUMARUS_APP_ID = "GnumarusPaintingAndAnimationApp";
export const GNUMARUS_PROJECT_FILE = "project.json";

export class GnumarusProjectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GnumarusProjectError";
  }
}

export function cellFilePath(layerId: string, frame: number): string {
  return `cells/${layerId}_frame${frame}.png`;
}

export function textureFilePath(textureId: string): string {
  return `textures/${textureId}.png`;
}

export function createDefaultProject(width: number, height: number): GnumarusProjectMeta {
  return {
    app: GNUMARUS_APP_ID,
    version: 1,
    width,
    height,
    layers: [
      {
        id: "layer0",
        name: "Layer 0",
        visible: true,
        opacity: 1,
        lockedChannels: { r: false, g: false, b: false, a: false },
      },
    ],
    animation: {
      frames: 1,
      currentFrame: 0,
      textures: [{ id: "layer0", name: "Layer 0 pixels", width, height, file: textureFilePath("layer0") }],
      contents: [
        {
          id: "content1",
          name: "Content 1",
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseLayerTransform(value: unknown): GnumarusLayerTransform {
  if (!isRecord(value)) {
    return { ...IDENTITY_LAYER_TRANSFORM };
  }
  const { x, y, rotation, flipX, flipY } = value;
  return {
    x: typeof x === "number" && Number.isFinite(x) ? x : 0,
    y: typeof y === "number" && Number.isFinite(y) ? y : 0,
    rotation: typeof rotation === "number" && Number.isFinite(rotation) ? rotation : 0,
    flipX: flipX === true,
    flipY: flipY === true,
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

function parseAnimationMeta(value: unknown, layerIds: Set<string>): GnumarusAnimationMeta {
  if (!isRecord(value)) {
    throw new GnumarusProjectError("project.json has an invalid animation section");
  }
  const { frames, currentFrame, textures, contents, cells } = value;
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
  return {
    frames: frameCount,
    currentFrame: startFrame,
    textures: checkedTextures,
    contents: checkedContents,
    cells: checkedCells,
  };
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
      name: `${layer.name} pixels`,
      width,
      height,
      file: legacyCell?.file ?? textureFilePath(layer.id),
    });
    const contentId = `content${index + 1}`;
    contents.push({
      id: contentId,
      name: `Content ${index + 1}`,
      textureId: layer.id,
      transform: layer.transform !== undefined ? { ...layer.transform } : { ...IDENTITY_LAYER_TRANSFORM },
    });
    cells.push({ layer: layer.id, frame: 0, content: contentId });
  });
  return { frames: 1, currentFrame: 0, textures, contents, cells };
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
  if (version !== 1) {
    throw new GnumarusProjectError("unsupported project version");
  }
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
      : parseAnimationMeta(animation, layerIds);
  return {
    app: GNUMARUS_APP_ID,
    version: 1,
    width: Math.floor(width),
    height: Math.floor(height),
    layers: checkedLayers,
    animation: checkedAnimation,
  };
}
