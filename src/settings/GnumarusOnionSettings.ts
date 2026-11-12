/**
 * Onion skinning settings: ghosted neighbor frames over the canvas while
 * animating. Past frames tint blue, future frames tint red (Pixelorama
 * convention); each side shows up to N frames with 0.6/i alpha falloff.
 */
export interface GnumarusOnionSettings {
  /** Master switch for the ghost planes. */
  enabled: boolean;
  /** Past frames shown (0..8). */
  past: number;
  /** Future frames shown (0..8). */
  future: number;
  /** Blue past / red future tint instead of plain white ghosts. */
  tint: boolean;
}

export const DEFAULT_ONION_SETTINGS: GnumarusOnionSettings = {
  enabled: false,
  past: 1,
  future: 1,
  tint: true,
};

export const ONION_SETTINGS_STORAGE_KEY = "gnumarus.settings.onion.v1";

export const GNUMARUS_MAX_ONION_FRAMES = 8;

export class GnumarusOnionSettingsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GnumarusOnionSettingsError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clampCount(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(GNUMARUS_MAX_ONION_FRAMES, Math.max(0, Math.floor(value)));
}

export function parseOnionSettings(jsonText: string): GnumarusOnionSettings {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText) as unknown;
  } catch {
    throw new GnumarusOnionSettingsError("onion settings are not valid JSON");
  }
  if (!isRecord(parsed)) {
    throw new GnumarusOnionSettingsError("onion settings root must be an object");
  }
  return {
    enabled: parsed["enabled"] === true,
    past: clampCount(parsed["past"], DEFAULT_ONION_SETTINGS.past),
    future: clampCount(parsed["future"], DEFAULT_ONION_SETTINGS.future),
    tint: parsed["tint"] === undefined ? DEFAULT_ONION_SETTINGS.tint : parsed["tint"] !== false,
  };
}

export function serializeOnionSettings(settings: GnumarusOnionSettings): string {
  return JSON.stringify(
    {
      enabled: settings.enabled,
      past: clampCount(settings.past, DEFAULT_ONION_SETTINGS.past),
      future: clampCount(settings.future, DEFAULT_ONION_SETTINGS.future),
      tint: settings.tint,
    },
    null,
    2,
  );
}
