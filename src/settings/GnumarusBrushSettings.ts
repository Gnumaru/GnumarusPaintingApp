/**
 * Brush settings: the maximum brush/line/curve size in layer pixels.
 * The minimum of the minimum stays hardcoded (0.1 in the float clamp) and
 * the maximum of the minimum is the current max; the minimum of the
 * maximum is 0.1 and the maximum of the maximum is this setting (default
 * 512, up to 2048). Only affects future strokes, never stored artwork.
 */
export interface GnumarusBrushSettings {
  /** Maximum brush/line/curve size in layer pixels, default 512. */
  maxBrushSize: number;
}

export const DEFAULT_BRUSH_SETTINGS: GnumarusBrushSettings = {
  maxBrushSize: 512,
};

export const BRUSH_SETTINGS_STORAGE_KEY = "gnumarus.settings.brush.v1";

export const GNUMARUS_MIN_MAX_BRUSH_SIZE = 1;
export const GNUMARUS_MAX_MAX_BRUSH_SIZE = 2048;

export class GnumarusBrushSettingsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GnumarusBrushSettingsError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function clampMaxBrushSize(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_BRUSH_SETTINGS.maxBrushSize;
  }
  return Math.min(
    GNUMARUS_MAX_MAX_BRUSH_SIZE,
    Math.max(GNUMARUS_MIN_MAX_BRUSH_SIZE, Math.floor(value)),
  );
}

export function parseBrushSettings(jsonText: string): GnumarusBrushSettings {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText) as unknown;
  } catch {
    throw new GnumarusBrushSettingsError("brush settings are not valid JSON");
  }
  if (!isRecord(parsed)) {
    throw new GnumarusBrushSettingsError("brush settings root must be an object");
  }
  const { maxBrushSize } = parsed;
  if (typeof maxBrushSize !== "number") {
    throw new GnumarusBrushSettingsError("brush settings have invalid fields");
  }
  return { maxBrushSize: clampMaxBrushSize(maxBrushSize) };
}

export function serializeBrushSettings(settings: GnumarusBrushSettings): string {
  return JSON.stringify({ maxBrushSize: clampMaxBrushSize(settings.maxBrushSize) }, null, 2);
}
