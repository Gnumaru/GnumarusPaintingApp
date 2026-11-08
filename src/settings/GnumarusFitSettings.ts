export interface GnumarusFitSettings {
  /** Default alpha threshold for the "Fit texture to size" dialog. */
  alphaThreshold: number;
}

export const DEFAULT_FIT_SETTINGS: GnumarusFitSettings = {
  alphaThreshold: 0,
};

export const FIT_SETTINGS_STORAGE_KEY = "gnumarus.settings.fit.v1";

export const GNUMARUS_MIN_FIT_ALPHA_THRESHOLD = 0;
export const GNUMARUS_MAX_FIT_ALPHA_THRESHOLD = 254;

export class GnumarusFitSettingsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GnumarusFitSettingsError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function clampFitAlphaThreshold(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_FIT_SETTINGS.alphaThreshold;
  }
  return Math.min(
    GNUMARUS_MAX_FIT_ALPHA_THRESHOLD,
    Math.max(GNUMARUS_MIN_FIT_ALPHA_THRESHOLD, Math.floor(value)),
  );
}

export function parseFitSettings(jsonText: string): GnumarusFitSettings {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText) as unknown;
  } catch {
    throw new GnumarusFitSettingsError("fit settings are not valid JSON");
  }
  if (!isRecord(parsed)) {
    throw new GnumarusFitSettingsError("fit settings root must be an object");
  }
  const { alphaThreshold } = parsed;
  if (typeof alphaThreshold !== "number") {
    throw new GnumarusFitSettingsError("fit settings have invalid fields");
  }
  return { alphaThreshold: clampFitAlphaThreshold(alphaThreshold) };
}

export function serializeFitSettings(settings: GnumarusFitSettings): string {
  return JSON.stringify({ alphaThreshold: clampFitAlphaThreshold(settings.alphaThreshold) }, null, 2);
}
