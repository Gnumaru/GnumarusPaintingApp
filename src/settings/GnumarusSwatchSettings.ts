/**
 * Saved color swatches plus recent colors for the color picker.
 * Plain hex strings (`#rrggbb` or `#rrggbbaa`); anything else is dropped
 * on load so a corrupt file can never break the picker.
 */
export interface GnumarusSwatchSettings {
  swatches: string[];
  recent: string[];
}

export const SWATCH_SETTINGS_STORAGE_KEY = "gnumarus.settings.swatches.v1";

export const GNUMARUS_MAX_SWATCHES = 64;
export const GNUMARUS_MAX_RECENT_COLORS = 10;

export function normalizeSwatchHex(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const hex = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(hex) || /^#[0-9a-f]{8}$/.test(hex)) {
    return hex;
  }
  return null;
}

function normalizeList(value: unknown, cap: number): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const out: string[] = [];
  for (const entry of value) {
    const hex = normalizeSwatchHex(entry);
    if (hex !== null && !out.includes(hex)) {
      out.push(hex);
      if (out.length >= cap) {
        break;
      }
    }
  }
  return out;
}

export function parseSwatchSettings(jsonText: string): GnumarusSwatchSettings {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText) as unknown;
  } catch {
    throw new Error("swatch settings are not valid JSON");
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("swatch settings root must be an object");
  }
  const record = parsed as Record<string, unknown>;
  return {
    swatches: normalizeList(record["swatches"], GNUMARUS_MAX_SWATCHES),
    recent: normalizeList(record["recent"], GNUMARUS_MAX_RECENT_COLORS),
  };
}

export function serializeSwatchSettings(settings: GnumarusSwatchSettings): string {
  return JSON.stringify(
    {
      swatches: normalizeList(settings.swatches, GNUMARUS_MAX_SWATCHES),
      recent: normalizeList(settings.recent, GNUMARUS_MAX_RECENT_COLORS),
    },
    null,
    2,
  );
}
