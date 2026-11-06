export interface GnumarusToastSettings {
  /** Toast display time in seconds. */
  durationSec: number;
}

export const DEFAULT_TOAST_SETTINGS: GnumarusToastSettings = {
  durationSec: 1.0,
};

export const TOAST_SETTINGS_STORAGE_KEY = "gnumarus.settings.toast.v1";

export const GNUMARUS_MIN_TOAST_DURATION_SEC = 0.5;
export const GNUMARUS_MAX_TOAST_DURATION_SEC = 2.0;

export class GnumarusToastSettingsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GnumarusToastSettingsError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function clampToastDurationSec(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_TOAST_SETTINGS.durationSec;
  }
  return Math.min(
    GNUMARUS_MAX_TOAST_DURATION_SEC,
    Math.max(GNUMARUS_MIN_TOAST_DURATION_SEC, value),
  );
}

export function parseToastSettings(jsonText: string): GnumarusToastSettings {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText) as unknown;
  } catch {
    throw new GnumarusToastSettingsError("toast settings are not valid JSON");
  }
  if (!isRecord(parsed)) {
    throw new GnumarusToastSettingsError("toast settings root must be an object");
  }
  const { durationSec, durationMs } = parsed;
  let resolved: number | null = null;
  if (typeof durationSec === "number") {
    resolved = durationSec;
  } else if (typeof durationMs === "number") {
    resolved = durationMs / 1000;
  }
  if (resolved === null) {
    throw new GnumarusToastSettingsError("toast settings have invalid fields");
  }
  return { durationSec: clampToastDurationSec(resolved) };
}

export function serializeToastSettings(settings: GnumarusToastSettings): string {
  return JSON.stringify({ durationSec: clampToastDurationSec(settings.durationSec) }, null, 2);
}
