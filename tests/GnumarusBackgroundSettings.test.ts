import { describe, expect, it } from "vitest";
import {
  DEFAULT_BACKGROUND_SETTINGS,
  parseBackgroundSettings,
  serializeBackgroundSettings,
  GnumarusBackgroundSettingsError,
} from "../src/settings/GnumarusBackgroundSettings";

describe("GnumarusBackgroundSettings", () => {
  it("defaults to checkerboard", () => {
    expect(DEFAULT_BACKGROUND_SETTINGS).toEqual({ mode: "checkerboard", color: "#808080" });
  });

  it("round-trips settings", () => {
    expect(parseBackgroundSettings(serializeBackgroundSettings({ mode: "solid", color: "#ff0000" }))).toEqual({
      mode: "solid",
      color: "#ff0000",
    });
    expect(parseBackgroundSettings(serializeBackgroundSettings(DEFAULT_BACKGROUND_SETTINGS))).toEqual(
      DEFAULT_BACKGROUND_SETTINGS,
    );
  });

  it("rejects invalid settings", () => {
    expect(() => parseBackgroundSettings("not json")).toThrow(GnumarusBackgroundSettingsError);
    expect(() => parseBackgroundSettings("{}")).toThrow(GnumarusBackgroundSettingsError);
    expect(() =>
      parseBackgroundSettings(JSON.stringify({ mode: "gradient", color: "#ffffff" })),
    ).toThrow(GnumarusBackgroundSettingsError);
    expect(() =>
      parseBackgroundSettings(JSON.stringify({ mode: "solid", color: "red" })),
    ).toThrow(GnumarusBackgroundSettingsError);
  });
});
