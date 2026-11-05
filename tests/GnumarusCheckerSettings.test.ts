import { describe, expect, it } from "vitest";
import {
  clampCheckerSize,
  DEFAULT_CHECKER_SETTINGS,
  GnumarusSettingsError,
  parseCheckerSettings,
  serializeCheckerSettings,
} from "../src/settings/GnumarusCheckerSettings";

describe("GnumarusCheckerSettings", () => {
  it("round-trips the default settings", () => {
    expect(parseCheckerSettings(serializeCheckerSettings(DEFAULT_CHECKER_SETTINGS))).toEqual(
      DEFAULT_CHECKER_SETTINGS,
    );
  });

  it("accepts screen-space settings", () => {
    const parsed = parseCheckerSettings(
      JSON.stringify({ mode: "screen", size: 8, colorA: "#ff0000", colorB: "#00ff00" }),
    );
    expect(parsed).toEqual({ mode: "screen", size: 8, colorA: "#ff0000", colorB: "#00ff00" });
  });

  it("clamps the checker size into range", () => {
    expect(clampCheckerSize(0)).toBe(1);
    expect(clampCheckerSize(1000)).toBe(128);
    expect(clampCheckerSize(Number.NaN)).toBe(DEFAULT_CHECKER_SETTINGS.size);
  });

  it("rejects invalid settings", () => {
    expect(() => parseCheckerSettings("not json")).toThrow(GnumarusSettingsError);
    expect(() => parseCheckerSettings("{}")).toThrow(GnumarusSettingsError);
    expect(() =>
      parseCheckerSettings(JSON.stringify({ mode: "bogus", size: 16, colorA: "#ffffff", colorB: "#000000" })),
    ).toThrow(GnumarusSettingsError);
    expect(() =>
      parseCheckerSettings(JSON.stringify({ mode: "image", size: 16, colorA: "red", colorB: "#000000" })),
    ).toThrow(GnumarusSettingsError);
  });
});
