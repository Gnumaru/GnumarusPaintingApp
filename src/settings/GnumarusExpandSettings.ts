export interface GnumarusExpandSettings {
  /** Cell texture expand step in pixels per Ctrl+Alt+Arrow press. */
  step: number;
}

export const DEFAULT_EXPAND_SETTINGS: GnumarusExpandSettings = {
  step: 16,
};

export const EXPAND_SETTINGS_STORAGE_KEY = "gnumarus.settings.expand.v1";

export const GNUMARUS_MIN_EXPAND_STEP = 1;
export const GNUMARUS_MAX_EXPAND_STEP = 1024;

export class GnumarusExpandSettingsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GnumarusExpandSettingsError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function clampExpandStep(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_EXPAND_SETTINGS.step;
  }
  return Math.min(
    GNUMARUS_MAX_EXPAND_STEP,
    Math.max(GNUMARUS_MIN_EXPAND_STEP, Math.floor(value)),
  );
}

export function parseExpandSettings(jsonText: string): GnumarusExpandSettings {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText) as unknown;
  } catch {
    throw new GnumarusExpandSettingsError("expand settings are not valid JSON");
  }
  if (!isRecord(parsed)) {
    throw new GnumarusExpandSettingsError("expand settings root must be an object");
  }
  const { step } = parsed;
  if (typeof step !== "number") {
    throw new GnumarusExpandSettingsError("expand settings have invalid fields");
  }
  return { step: clampExpandStep(step) };
}

export function serializeExpandSettings(settings: GnumarusExpandSettings): string {
  return JSON.stringify({ step: clampExpandStep(settings.step) }, null, 2);
}
