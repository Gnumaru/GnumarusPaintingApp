/**
 * Spritesheet packing setting: how the "packed" layout picks its column
 * count from the frame count's square root. Wide packs (the default) round
 * up, producing packs wider than tall; narrow packs round down, producing
 * packs taller than wide (a single column for 1..3 frames).
 */

export interface GnumarusSheetPackSettings {
  wideSpritesheetPacks: boolean;
}

export const DEFAULT_SHEET_PACK_SETTINGS: GnumarusSheetPackSettings = {
  wideSpritesheetPacks: true,
};

export const SHEET_PACK_SETTINGS_STORAGE_KEY = "gnumarus.settings.sheetPack.v1";

export class GnumarusSheetPackSettingsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GnumarusSheetPackSettingsError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Only an explicit false narrows packs; everything else stays wide. */
export function parseWideSpritesheetPacks(value: unknown): boolean {
  return value !== false;
}

export function parseSheetPackSettings(jsonText: string): GnumarusSheetPackSettings {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText) as unknown;
  } catch {
    throw new GnumarusSheetPackSettingsError("sheet pack settings are not valid JSON");
  }
  if (!isRecord(parsed)) {
    throw new GnumarusSheetPackSettingsError("sheet pack settings root must be an object");
  }
  return { wideSpritesheetPacks: parseWideSpritesheetPacks(parsed["wideSpritesheetPacks"]) };
}

export function serializeSheetPackSettings(settings: GnumarusSheetPackSettings): string {
  return JSON.stringify({ wideSpritesheetPacks: parseWideSpritesheetPacks(settings.wideSpritesheetPacks) });
}
