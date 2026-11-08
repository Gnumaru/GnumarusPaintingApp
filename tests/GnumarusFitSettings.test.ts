import { describe, expect, it } from "vitest";
import {
  clampFitAlphaThreshold,
  DEFAULT_FIT_SETTINGS,
  GNUMARUS_MAX_FIT_ALPHA_THRESHOLD,
  GNUMARUS_MIN_FIT_ALPHA_THRESHOLD,
  parseFitSettings,
  serializeFitSettings,
  GnumarusFitSettingsError,
} from "../src/settings/GnumarusFitSettings";

describe("GnumarusFitSettings", () => {
  it("defaults to threshold 0", () => {
    expect(DEFAULT_FIT_SETTINGS).toEqual({ alphaThreshold: 0 });
    expect(GNUMARUS_MIN_FIT_ALPHA_THRESHOLD).toBe(0);
    expect(GNUMARUS_MAX_FIT_ALPHA_THRESHOLD).toBe(254);
  });

  it("clamps the threshold into range", () => {
    expect(clampFitAlphaThreshold(0)).toBe(0);
    expect(clampFitAlphaThreshold(128)).toBe(128);
    expect(clampFitAlphaThreshold(254)).toBe(254);
    expect(clampFitAlphaThreshold(-1)).toBe(0);
    expect(clampFitAlphaThreshold(255)).toBe(254);
    expect(clampFitAlphaThreshold(1000)).toBe(254);
    expect(clampFitAlphaThreshold(10.9)).toBe(10);
    expect(clampFitAlphaThreshold(Number.NaN)).toBe(0);
    expect(clampFitAlphaThreshold(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it("round-trips settings", () => {
    expect(parseFitSettings(serializeFitSettings({ alphaThreshold: 10 }))).toEqual({ alphaThreshold: 10 });
    expect(parseFitSettings(serializeFitSettings(DEFAULT_FIT_SETTINGS))).toEqual(DEFAULT_FIT_SETTINGS);
  });

  it("clamps parsed values", () => {
    expect(parseFitSettings(JSON.stringify({ alphaThreshold: -5 }))).toEqual({ alphaThreshold: 0 });
    expect(parseFitSettings(JSON.stringify({ alphaThreshold: 999 }))).toEqual({ alphaThreshold: 254 });
  });

  it("rejects invalid settings", () => {
    expect(() => parseFitSettings("not json")).toThrow(GnumarusFitSettingsError);
    expect(() => parseFitSettings("{}")).toThrow(GnumarusFitSettingsError);
    expect(() => parseFitSettings(JSON.stringify({ alphaThreshold: "10" }))).toThrow(
      GnumarusFitSettingsError,
    );
  });
});
