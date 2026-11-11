import { describe, expect, it } from "vitest";
import {
  EN_STRINGS,
  PT_BR_STRINGS,
  resolveLocale,
  setActiveLocale,
  tr,
  type GnumarusMessageKey,
} from "../src/i18n/GnumarusI18n";

describe("GnumarusI18n", () => {
  it("resolves system to the browser language with English fallback", () => {
    expect(resolveLocale("en", "pt-BR")).toBe("en");
    expect(resolveLocale("pt-BR", "en-US")).toBe("pt-BR");
    expect(resolveLocale("system", "pt-BR")).toBe("pt-BR");
    expect(resolveLocale("system", "pt-PT")).toBe("pt-BR");
    expect(resolveLocale("system", "pt")).toBe("pt-BR");
    expect(resolveLocale("system", "en-US")).toBe("en");
    expect(resolveLocale("system", "en")).toBe("en");
    expect(resolveLocale("system", "es-ES")).toBe("en");
    expect(resolveLocale("system", "")).toBe("en");
  });

  it("keeps key parity between English and Brazilian Portuguese", () => {
    const enKeys = Object.keys(EN_STRINGS).sort();
    const ptKeys = Object.keys(PT_BR_STRINGS).sort();
    expect(ptKeys).toEqual(enKeys);
    expect(enKeys.length).toBeGreaterThan(0);
    for (const key of enKeys as GnumarusMessageKey[]) {
      expect(PT_BR_STRINGS[key].trim().length).toBeGreaterThan(0);
    }
  });

  it("translates the active locale with interpolation", () => {
    setActiveLocale("en");
    expect(tr("locale.language")).toBe("Language");
    expect(tr("status.language", { value: "English" })).toBe("Language: English");
    setActiveLocale("pt-BR");
    expect(tr("locale.language")).toBe("Idioma");
    expect(tr("status.language", { value: "Português (Brasil)" })).toBe("Idioma: Português (Brasil)");
    setActiveLocale("en");
  });
});
