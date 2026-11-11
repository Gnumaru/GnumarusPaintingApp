import type { GnumarusLocaleSetting } from "../i18n/GnumarusI18n";
import { DEFAULT_LOCALE_SETTING } from "../i18n/GnumarusI18n";

export interface GnumarusLocaleSettings {
  /** UI language: browser language (`system`) or a concrete locale. */
  locale: GnumarusLocaleSetting;
}

export const DEFAULT_LOCALE_SETTINGS: GnumarusLocaleSettings = {
  locale: DEFAULT_LOCALE_SETTING,
};

export const LOCALE_SETTINGS_STORAGE_KEY = "gnumarus.settings.locale.v1";

export class GnumarusLocaleSettingsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GnumarusLocaleSettingsError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseLocaleSetting(value: unknown): GnumarusLocaleSetting {
  return value === "en" || value === "pt-BR" ? value : DEFAULT_LOCALE_SETTING;
}

export function parseLocaleSettings(jsonText: string): GnumarusLocaleSettings {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText) as unknown;
  } catch {
    throw new GnumarusLocaleSettingsError("locale settings are not valid JSON");
  }
  if (!isRecord(parsed)) {
    throw new GnumarusLocaleSettingsError("locale settings root must be an object");
  }
  const { locale } = parsed;
  if (typeof locale !== "string") {
    throw new GnumarusLocaleSettingsError("locale settings have invalid fields");
  }
  return { locale: parseLocaleSetting(locale) };
}

export function serializeLocaleSettings(settings: GnumarusLocaleSettings): string {
  return JSON.stringify({ locale: parseLocaleSetting(settings.locale) }, null, 2);
}
