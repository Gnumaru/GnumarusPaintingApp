export type GnumarusBackgroundMode = "checkerboard" | "solid";

export interface GnumarusBackgroundSettings {
  mode: GnumarusBackgroundMode;
  color: string;
}

export const DEFAULT_BACKGROUND_SETTINGS: GnumarusBackgroundSettings = {
  mode: "checkerboard",
  color: "#808080",
};

export const BACKGROUND_SETTINGS_STORAGE_KEY = "gnumarus.settings.background.v1";

export class GnumarusBackgroundSettingsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GnumarusBackgroundSettingsError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

export function parseBackgroundSettings(jsonText: string): GnumarusBackgroundSettings {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText) as unknown;
  } catch {
    throw new GnumarusBackgroundSettingsError("background settings are not valid JSON");
  }
  if (!isRecord(parsed)) {
    throw new GnumarusBackgroundSettingsError("background settings root must be an object");
  }
  const { mode, color } = parsed;
  if (mode !== "checkerboard" && mode !== "solid") {
    throw new GnumarusBackgroundSettingsError("background settings have an invalid mode");
  }
  if (!isHexColor(color)) {
    throw new GnumarusBackgroundSettingsError("background settings have an invalid color");
  }
  return { mode, color };
}

export function serializeBackgroundSettings(settings: GnumarusBackgroundSettings): string {
  const mode: GnumarusBackgroundMode = settings.mode === "solid" ? "solid" : "checkerboard";
  const color = isHexColor(settings.color) ? settings.color : DEFAULT_BACKGROUND_SETTINGS.color;
  return JSON.stringify({ mode, color }, null, 2);
}
