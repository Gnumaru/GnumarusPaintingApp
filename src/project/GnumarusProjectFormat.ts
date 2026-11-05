export interface GnumarusCellRef {
  frame: number;
  file: string;
}

export interface GnumarusLayerMeta {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  cells: GnumarusCellRef[];
}

export interface GnumarusProjectMeta {
  app: string;
  version: 1;
  width: number;
  height: number;
  layers: GnumarusLayerMeta[];
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
        cells: [{ frame: 0, file: cellFilePath("layer0", 0) }],
      },
    ],
  };
}

export function serializeProject(project: GnumarusProjectMeta): string {
  return JSON.stringify(project, null, 2);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
  const { app, version, width, height, layers } = parsed;
  if (app !== GNUMARUS_APP_ID) {
    throw new GnumarusProjectError("project.json app id mismatch");
  }
  if (version !== 1) {
    throw new GnumarusProjectError("unsupported project version");
  }
  if (typeof width !== "number" || typeof height !== "number" || width < 1 || height < 1) {
    throw new GnumarusProjectError("project.json has invalid dimensions");
  }
  if (!Array.isArray(layers) || layers.length === 0) {
    throw new GnumarusProjectError("project.json has no layers");
  }
  const checkedLayers: GnumarusLayerMeta[] = layers.map((entry: unknown) => {
    if (!isRecord(entry)) {
      throw new GnumarusProjectError("project.json has an invalid layer");
    }
    const { id, name, visible, opacity, cells } = entry;
    if (typeof id !== "string" || typeof name !== "string") {
      throw new GnumarusProjectError("project.json has a layer with invalid id/name");
    }
    if (typeof visible !== "boolean" || typeof opacity !== "number") {
      throw new GnumarusProjectError("project.json has a layer with invalid flags");
    }
    if (!Array.isArray(cells) || cells.length === 0) {
      throw new GnumarusProjectError("project.json has a layer without cells");
    }
    const checkedCells: GnumarusCellRef[] = cells.map((cell: unknown) => {
      if (!isRecord(cell) || typeof cell.frame !== "number" || typeof cell.file !== "string") {
        throw new GnumarusProjectError("project.json has an invalid cell");
      }
      return { frame: cell.frame, file: cell.file };
    });
    return { id, name, visible, opacity, cells: checkedCells };
  });
  return {
    app: GNUMARUS_APP_ID,
    version: 1,
    width: Math.floor(width),
    height: Math.floor(height),
    layers: checkedLayers,
  };
}
