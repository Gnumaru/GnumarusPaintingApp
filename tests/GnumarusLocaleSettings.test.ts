import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE_SETTINGS,
  LOCALE_SETTINGS_STORAGE_KEY,
  parseLocaleSetting,
  parseLocaleSettings,
  serializeLocaleSettings,
  GnumarusLocaleSettingsError,
} from "../src/settings/GnumarusLocaleSettings";

describe("GnumarusLocaleSettings", () => {
  it("defaults to the system language", () => {
    expect(DEFAULT_LOCALE_SETTINGS).toEqual({ locale: "system" });
    expect(LOCALE_SETTINGS_STORAGE_KEY).toBe("gnumarus.settings.locale.v1");
  });

  it("parses concrete locales with a system fallback", () => {
    expect(parseLocaleSetting("en")).toBe("en");
    expect(parseLocaleSetting("pt-BR")).toBe("pt-BR");
    expect(parseLocaleSetting("system")).toBe("system");
    expect(parseLocaleSetting("es")).toBe("system");
    expect(parseLocaleSetting(undefined)).toBe("system");
    expect(parseLocaleSetting(42)).toBe("system");
  });

  it("round-trips settings and rejects invalid payloads", () => {
    expect(parseLocaleSettings(serializeLocaleSettings({ locale: "pt-BR" }))).toEqual({ locale: "pt-BR" });
    expect(parseLocaleSettings(serializeLocaleSettings(DEFAULT_LOCALE_SETTINGS))).toEqual(
      DEFAULT_LOCALE_SETTINGS,
    );
    expect(() => parseLocaleSettings("not json")).toThrow(GnumarusLocaleSettingsError);
    expect(() => parseLocaleSettings("[]")).toThrow(GnumarusLocaleSettingsError);
    expect(() => parseLocaleSettings(JSON.stringify({}))).toThrow(GnumarusLocaleSettingsError);
    expect(() => parseLocaleSettings(JSON.stringify({ locale: 7 }))).toThrow(GnumarusLocaleSettingsError);
  });
});
