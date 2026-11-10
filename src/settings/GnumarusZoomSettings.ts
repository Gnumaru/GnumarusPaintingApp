export interface GnumarusZoomSettings {
  /** Minimum canvas zoom in whole percent (1..100). */
  minZoomPercent: number;
}

export const DEFAULT_ZOOM_SETTINGS: GnumarusZoomSettings = {
  minZoomPercent: 1,
};

export const ZOOM_SETTINGS_STORAGE_KEY = "gnumarus.settings.zoom.v1";

export const GNUMARUS_MIN_ZOOM_PERCENT = 1;
export const GNUMARUS_MAX_ZOOM_PERCENT = 100;

export class GnumarusZoomSettingsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GnumarusZoomSettingsError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function clampZoomMinPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_ZOOM_SETTINGS.minZoomPercent;
  }
  return Math.min(
    GNUMARUS_MAX_ZOOM_PERCENT,
    Math.max(GNUMARUS_MIN_ZOOM_PERCENT, Math.floor(value)),
  );
}

export function parseZoomSettings(jsonText: string): GnumarusZoomSettings {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText) as unknown;
  } catch {
    throw new GnumarusZoomSettingsError("zoom settings are not valid JSON");
  }
  if (!isRecord(parsed)) {
    throw new GnumarusZoomSettingsError("zoom settings root must be an object");
  }
  const { minZoomPercent } = parsed;
  if (typeof minZoomPercent !== "number") {
    throw new GnumarusZoomSettingsError("zoom settings have invalid fields");
  }
  return { minZoomPercent: clampZoomMinPercent(minZoomPercent) };
}

export function serializeZoomSettings(settings: GnumarusZoomSettings): string {
  return JSON.stringify({ minZoomPercent: clampZoomMinPercent(settings.minZoomPercent) }, null, 2);
}
