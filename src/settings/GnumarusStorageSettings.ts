/**
 * Project texture storage settings: how layer textures are encoded when
 * the project is saved. Textures always save as JPEG XL; `lossless`
 * selects mathematically lossless output, otherwise the 0-100 `quality`
 * maps to the codec distance. Loading sniffs `.jxl`/`.png` per file, so
 * these settings only affect future saves.
 */
export interface GnumarusStorageSettings {
  /** Lossless JXL output when true (default), lossy otherwise. */
  lossless: boolean;
  /** Lossy quality 0..100, default 50; ignored when lossless. */
  quality: number;
}

export const DEFAULT_STORAGE_SETTINGS: GnumarusStorageSettings = {
  lossless: true,
  quality: 50,
};

export const STORAGE_SETTINGS_STORAGE_KEY = "gnumarus.settings.storage.v1";

export const GNUMARUS_MIN_STORAGE_QUALITY = 0;
export const GNUMARUS_MAX_STORAGE_QUALITY = 100;

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
  const { lossless, quality } = parsed;
  if (typeof lossless !== "boolean" || typeof quality !== "number") {
    throw new GnumarusStorageSettingsError("storage settings have invalid fields");
  }
  return { lossless, quality: clampStorageQuality(quality) };
}

export function serializeStorageSettings(settings: GnumarusStorageSettings): string {
  return JSON.stringify(
    { lossless: settings.lossless, quality: clampStorageQuality(settings.quality) },
    null,
    2,
  );
}
