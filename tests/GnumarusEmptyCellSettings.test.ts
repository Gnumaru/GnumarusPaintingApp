import { describe, expect, it } from "vitest";
import {
  DEFAULT_EMPTY_CELL_SETTINGS,
  EMPTY_CELL_SETTINGS_STORAGE_KEY,
  GnumarusEmptyCellSettingsError,
  parseEmptyCellMode,
  parseEmptyCellSettings,
  serializeEmptyCellSettings,
} from "../src/settings/GnumarusEmptyCellSettings";

describe("GnumarusEmptyCellSettings", () => {
  it("defaults to holding the last non-empty content", () => {
    expect(DEFAULT_EMPTY_CELL_SETTINGS).toEqual({ mode: "hold" });
    expect(EMPTY_CELL_SETTINGS_STORAGE_KEY).toBe("gnumarus.settings.emptyCells.v1");
  });

  it("parses only explicit nothing, defaulting anything else to hold", () => {
    expect(parseEmptyCellMode("nothing")).toBe("nothing");
    expect(parseEmptyCellMode("hold")).toBe("hold");
    expect(parseEmptyCellMode(undefined)).toBe("hold");
    expect(parseEmptyCellMode("sometimes")).toBe("hold");
    expect(parseEmptyCellMode(null)).toBe("hold");
  });

  it("round-trips settings", () => {
    expect(parseEmptyCellSettings(serializeEmptyCellSettings({ mode: "nothing" }))).toEqual({ mode: "nothing" });
    expect(parseEmptyCellSettings(serializeEmptyCellSettings(DEFAULT_EMPTY_CELL_SETTINGS))).toEqual(
      DEFAULT_EMPTY_CELL_SETTINGS,
    );
  });

  it("rejects invalid settings", () => {
    expect(() => parseEmptyCellSettings("not json")).toThrow(GnumarusEmptyCellSettingsError);
    expect(() => parseEmptyCellSettings("[1,2]")).toThrow(GnumarusEmptyCellSettingsError);
    expect(parseEmptyCellSettings("{}")).toEqual({ mode: "hold" });
  });
});
