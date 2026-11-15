/**
 * Empty-cell display setting: what the renderer shows for cells that hold
 * no real content (no cell content assigned, or content without texture,
 * text, vector, 3D model or tilemap). "nothing" renders transparency (the
 * historical behavior); "hold" renders the layer's last non-empty content
 * below the requested frame, like keyframe holds in animation apps.
 */
export type GnumarusEmptyCellMode = "nothing" | "hold";

export interface GnumarusEmptyCellSettings {
  mode: GnumarusEmptyCellMode;
}

export const DEFAULT_EMPTY_CELL_SETTINGS: GnumarusEmptyCellSettings = {
  mode: "hold",
};

export const EMPTY_CELL_SETTINGS_STORAGE_KEY = "gnumarus.settings.emptyCells.v1";

export class GnumarusEmptyCellSettingsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GnumarusEmptyCellSettingsError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseEmptyCellMode(value: unknown): GnumarusEmptyCellMode {
  return value === "nothing" ? "nothing" : "hold";
}

export function parseEmptyCellSettings(jsonText: string): GnumarusEmptyCellSettings {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText) as unknown;
  } catch {
    throw new GnumarusEmptyCellSettingsError("empty cell settings are not valid JSON");
  }
  if (!isRecord(parsed)) {
    throw new GnumarusEmptyCellSettingsError("empty cell settings root must be an object");
  }
  return { mode: parseEmptyCellMode(parsed["mode"]) };
}

export function serializeEmptyCellSettings(settings: GnumarusEmptyCellSettings): string {
  return JSON.stringify({ mode: parseEmptyCellMode(settings.mode) });
}
