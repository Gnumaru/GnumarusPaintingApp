export type GnumarusCheckerMode = "image" | "screen";

export interface GnumarusCheckerSettings {
  mode: GnumarusCheckerMode;
  /** Square size: image pixels in image-space, CSS pixels in screen-space. */
  sizeX: number;
  sizeY: number;
  colorA: string;
  colorB: string;
}

export const DEFAULT_CHECKER_SETTINGS: GnumarusCheckerSettings = {
  mode: "image",
  sizeX: 16,
  sizeY: 16,
  colorA: "#c7c7c7",
  colorB: "#949494",
};

export const CHECKER_SETTINGS_STORAGE_KEY = "gnumarus.settings.checker.v1";

export class GnumarusSettingsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GnumarusSettingsError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

export function clampCheckerSize(size: number): number {
  if (Number.isNaN(size)) {
    return DEFAULT_CHECKER_SETTINGS.sizeX;
  }
  return Math.min(128, Math.max(1, Math.floor(size)));
}

export function parseCheckerSettings(jsonText: string): GnumarusCheckerSettings {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText) as unknown;
  } catch {
    throw new GnumarusSettingsError("checker settings are not valid JSON");
  }
  if (!isRecord(parsed)) {
    throw new GnumarusSettingsError("checker settings root must be an object");
  }
  const { mode, size, sizeX, sizeY, colorA, colorB } = parsed;
  if (mode !== "image" && mode !== "screen") {
    throw new GnumarusSettingsError("checker settings have an invalid mode");
  }
  // Legacy v1 format stored a single `size` for both axes.
  const resolvedX = typeof sizeX === "number" ? sizeX : typeof size === "number" ? size : null;
  const resolvedY = typeof sizeY === "number" ? sizeY : typeof size === "number" ? size : null;
  if (resolvedX === null || resolvedY === null || !isHexColor(colorA) || !isHexColor(colorB)) {
    throw new GnumarusSettingsError("checker settings have invalid fields");
  }
  return { mode, sizeX: clampCheckerSize(resolvedX), sizeY: clampCheckerSize(resolvedY), colorA, colorB };
}

export function serializeCheckerSettings(settings: GnumarusCheckerSettings): string {
  return JSON.stringify(settings, null, 2);
}
