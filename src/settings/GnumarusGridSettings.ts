export interface GnumarusGridSettings {
  /** Minimum zoom factor at which the pixel grid is shown. 2 = 200 percent. */
  minZoom: number;
  /** Grid line opacity as an integer percent, 0..100. */
  opacityPercent: number;
}

export const DEFAULT_GRID_SETTINGS: GnumarusGridSettings = {
  minZoom: 10,
  opacityPercent: 100,
};

export const GRID_SETTINGS_STORAGE_KEY = "gnumarus.settings.grid.v1";

export const GNUMARUS_GRID_MIN_ZOOM = 2;
export const GNUMARUS_GRID_MAX_ZOOM = 64;
export const GNUMARUS_GRID_MIN_OPACITY_PERCENT = 0;
export const GNUMARUS_GRID_MAX_OPACITY_PERCENT = 100;

export class GnumarusGridSettingsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GnumarusGridSettingsError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function clampGridMinZoom(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_GRID_SETTINGS.minZoom;
  }
  return Math.min(GNUMARUS_GRID_MAX_ZOOM, Math.max(GNUMARUS_GRID_MIN_ZOOM, value));
}

export function clampGridOpacityPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_GRID_SETTINGS.opacityPercent;
  }
  return Math.min(
    GNUMARUS_GRID_MAX_OPACITY_PERCENT,
    Math.max(GNUMARUS_GRID_MIN_OPACITY_PERCENT, Math.round(value)),
  );
}

export function parseGridSettings(jsonText: string): GnumarusGridSettings {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText) as unknown;
  } catch {
    throw new GnumarusGridSettingsError("grid settings are not valid JSON");
  }
  if (!isRecord(parsed)) {
    throw new GnumarusGridSettingsError("grid settings root must be an object");
  }
  const { minZoom, minZoomPercent, opacityPercent } = parsed;
  let resolved: number | null = null;
  if (typeof minZoom === "number") {
    resolved = minZoom;
  } else if (typeof minZoomPercent === "number") {
    resolved = minZoomPercent / 100;
  }
  if (resolved === null) {
    throw new GnumarusGridSettingsError("grid settings have invalid fields");
  }
  let opacity = DEFAULT_GRID_SETTINGS.opacityPercent;
  if (opacityPercent !== undefined) {
    if (typeof opacityPercent !== "number") {
      throw new GnumarusGridSettingsError("grid settings have invalid fields");
    }
    opacity = clampGridOpacityPercent(opacityPercent);
  }
  return { minZoom: clampGridMinZoom(resolved), opacityPercent: opacity };
}

export function serializeGridSettings(settings: GnumarusGridSettings): string {
  return JSON.stringify(
    { minZoom: clampGridMinZoom(settings.minZoom), opacityPercent: clampGridOpacityPercent(settings.opacityPercent) },
    null,
    2,
  );
}

/** Pixel grid is never shown below 200 percent, regardless of the configured threshold. */
export function shouldShowPixelGrid(zoom: number, minZoom: number): boolean {
  if (!Number.isFinite(zoom) || !Number.isFinite(minZoom)) {
    return false;
  }
  const threshold = Math.max(GNUMARUS_GRID_MIN_ZOOM, minZoom);
  return zoom >= threshold;
}
