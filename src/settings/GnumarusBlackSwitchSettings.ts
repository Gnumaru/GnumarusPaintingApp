/**
 * "Switch out of black" setting for the color picker: when the paint color
 * is black and the user switches color models, the picker jumps to a vivid
 * color in the new model instead of staying black (where every axis drag
 * would start from a degenerate point).
 */

export interface GnumarusBlackSwitchSettings {
  switchOutOfBlack: boolean;
}

export const DEFAULT_BLACK_SWITCH_SETTINGS: GnumarusBlackSwitchSettings = {
  switchOutOfBlack: true,
};

export const BLACK_SWITCH_SETTINGS_STORAGE_KEY = "gnumarus.settings.blackSwitch.v1";

export class GnumarusBlackSwitchSettingsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GnumarusBlackSwitchSettingsError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Only an explicit false disables the switch; everything else stays on. */
export function parseBlackSwitch(value: unknown): boolean {
  return value !== false;
}

export function parseBlackSwitchSettings(jsonText: string): GnumarusBlackSwitchSettings {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText) as unknown;
  } catch {
    throw new GnumarusBlackSwitchSettingsError("black switch settings are not valid JSON");
  }
  if (!isRecord(parsed)) {
    throw new GnumarusBlackSwitchSettingsError("black switch settings root must be an object");
  }
  return { switchOutOfBlack: parseBlackSwitch(parsed["switchOutOfBlack"]) };
}

export function serializeBlackSwitchSettings(settings: GnumarusBlackSwitchSettings): string {
  return JSON.stringify({ switchOutOfBlack: parseBlackSwitch(settings.switchOutOfBlack) });
}
