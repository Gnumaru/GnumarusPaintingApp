/**
 * Project texture storage settings: how layer textures are encoded when
 * the project is saved. `format` selects the container (default JXL);
 * `lossless`/`quality` tune JXL and WebP output, `pngLevel` tunes PNG
 * output and `jpgQuality` tunes JPEG output (color file plus a grayscale
 * alpha companion). `projectFile` selects the project data file itself:
 * zipped JSON (default) or plain JSON. Loading sniffs `.gpa`/`.json` and
 * `.jxl`/`.webp`/`.jpg`/`.png` per file, so these settings only affect
 * future saves. `textStorage` selects where rich text documents are saved:
 * inline in the project data file (`embedded`, the default), raw `.html`
 * files, or single-file `.zip` archives; loading sniffs each text reference.
 */
export type GnumarusStorageFormat = "jxl" | "webp" | "jpg" | "png";

/** Project data file: zipped JSON archive (default) or plain JSON text. */
export type GnumarusProjectFileFormat = "gpa" | "json";

/**
 * Where rich text documents are stored on save: inline in the project data
 * file (default), one raw `.html` file per text under `texts/`, or one
 * single-file `.zip` per text under `texts/`. Loading sniffs each text
 * reference, so this setting only affects future saves.
 */
export type GnumarusTextStorage = "embedded" | "html" | "htmlZip";

/**
 * Where vector graphic documents are stored on save: raw `.svg` files
 * (default `compressed` single-file `.zip` archives) under `svgs/`, or
 * inline strings in the project data file (`embedded`). Loading sniffs
 * each vector reference, so this setting only affects future saves.
 */
export type GnumarusSvgStorage = "raw" | "compressed" | "embedded";

export interface GnumarusStorageSettings {
  /** Texture container format, default JXL. */
  format: GnumarusStorageFormat;
  /** Lossless JXL/WebP output when true (default), lossy otherwise. */
  lossless: boolean;
  /** Lossy JXL/WebP quality 0..100, default 50; ignored unless lossy. */
  quality: number;
  /** PNG compression level 0..9, default 9. */
  pngLevel: number;
  /** JPEG quality 0..100, default 95. */
  jpgQuality: number;
  /** Brush tip JXL lossy quality 0..100, default 90. */
  brushQuality: number;
  /** Project data file format, default zipped JSON. */
  projectFile: GnumarusProjectFileFormat;
  /** Rich text storage, default inline in the project data file. */
  textStorage: GnumarusTextStorage;
  /** Vector graphic storage, default single-file ZIP archives. */
  svgStorage: GnumarusSvgStorage;
}

export const DEFAULT_STORAGE_SETTINGS: GnumarusStorageSettings = {
  format: "jxl",
  lossless: true,
  quality: 50,
  pngLevel: 9,
  jpgQuality: 95,
  brushQuality: 90,
  projectFile: "gpa",
  textStorage: "embedded",
  svgStorage: "compressed",
};

export const STORAGE_SETTINGS_STORAGE_KEY = "gnumarus.settings.storage.v1";

export const GNUMARUS_MIN_STORAGE_QUALITY = 0;
export const GNUMARUS_MAX_STORAGE_QUALITY = 100;

export const GNUMARUS_MIN_STORAGE_PNG_LEVEL = 0;
export const GNUMARUS_MAX_STORAGE_PNG_LEVEL = 9;

export class GnumarusStorageSettingsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GnumarusStorageSettingsError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function clampStorageQuality(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_STORAGE_SETTINGS.quality;
  }
  return Math.min(GNUMARUS_MAX_STORAGE_QUALITY, Math.max(GNUMARUS_MIN_STORAGE_QUALITY, Math.floor(value)));
}

export function clampStoragePngLevel(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_STORAGE_SETTINGS.pngLevel;
  }
  return Math.min(
    GNUMARUS_MAX_STORAGE_PNG_LEVEL,
    Math.max(GNUMARUS_MIN_STORAGE_PNG_LEVEL, Math.floor(value)),
  );
}

export function clampStorageJpgQuality(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_STORAGE_SETTINGS.jpgQuality;
  }
  return Math.min(GNUMARUS_MAX_STORAGE_QUALITY, Math.max(GNUMARUS_MIN_STORAGE_QUALITY, Math.floor(value)));
}

export function clampBrushQuality(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_STORAGE_SETTINGS.brushQuality;
  }
  return Math.min(GNUMARUS_MAX_STORAGE_QUALITY, Math.max(GNUMARUS_MIN_STORAGE_QUALITY, Math.floor(value)));
}

export function parseStorageFormat(value: unknown): GnumarusStorageFormat {
  return value === "webp" || value === "jpg" || value === "png" ? value : "jxl";
}

export function parseProjectFileFormat(value: unknown): GnumarusProjectFileFormat {
  return value === "json" ? "json" : "gpa";
}

export function parseSvgStorage(value: unknown): GnumarusSvgStorage {
  if (value === "raw" || value === "embedded") {
    return value;
  }
  return "compressed";
}

export function parseTextStorage(value: unknown): GnumarusTextStorage {
  if (value === "html" || value === "htmlZip") {
    return value;
  }
  // Legacy value from before the option was renamed to "embedded".
  return "embedded";
}

export function parseStorageSettings(jsonText: string): GnumarusStorageSettings {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText) as unknown;
  } catch {
    throw new GnumarusStorageSettingsError("storage settings are not valid JSON");
  }
  if (!isRecord(parsed)) {
    throw new GnumarusStorageSettingsError("storage settings root must be an object");
  }
  const { format, lossless, quality, pngLevel, jpgQuality, brushQuality, projectFile, textStorage, svgStorage } = parsed;
  if (typeof lossless !== "boolean" || typeof quality !== "number") {
    throw new GnumarusStorageSettingsError("storage settings have invalid fields");
  }
  return {
    format: parseStorageFormat(format),
    lossless,
    quality: clampStorageQuality(quality),
    pngLevel: typeof pngLevel === "number" ? clampStoragePngLevel(pngLevel) : DEFAULT_STORAGE_SETTINGS.pngLevel,
    jpgQuality:
      typeof jpgQuality === "number" ? clampStorageJpgQuality(jpgQuality) : DEFAULT_STORAGE_SETTINGS.jpgQuality,
    brushQuality:
      typeof brushQuality === "number" ? clampBrushQuality(brushQuality) : DEFAULT_STORAGE_SETTINGS.brushQuality,
    projectFile: parseProjectFileFormat(projectFile),
    textStorage: parseTextStorage(textStorage),
    svgStorage: parseSvgStorage(svgStorage),
  };
}

export function serializeStorageSettings(settings: GnumarusStorageSettings): string {
  return JSON.stringify(
    {
      format: parseStorageFormat(settings.format),
      lossless: settings.lossless,
      quality: clampStorageQuality(settings.quality),
      pngLevel: clampStoragePngLevel(settings.pngLevel),
      jpgQuality: clampStorageJpgQuality(settings.jpgQuality),
      brushQuality: clampBrushQuality(settings.brushQuality),
      projectFile: parseProjectFileFormat(settings.projectFile),
      textStorage: parseTextStorage(settings.textStorage),
      svgStorage: parseSvgStorage(settings.svgStorage),
    },
    null,
    2,
  );
}
