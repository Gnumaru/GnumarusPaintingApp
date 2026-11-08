import { describe, expect, it } from "vitest";
import {
  clampExpandStep,
  DEFAULT_EXPAND_SETTINGS,
  GNUMARUS_MAX_EXPAND_STEP,
  GNUMARUS_MIN_EXPAND_STEP,
  parseExpandSettings,
  serializeExpandSettings,
  GnumarusExpandSettingsError,
} from "../src/settings/GnumarusExpandSettings";

describe("GnumarusExpandSettings", () => {
  it("defaults to a 16px step", () => {
    expect(DEFAULT_EXPAND_SETTINGS).toEqual({ step: 16 });
    expect(GNUMARUS_MIN_EXPAND_STEP).toBe(1);
    expect(GNUMARUS_MAX_EXPAND_STEP).toBe(1024);
  });

  it("clamps the step into range", () => {
    expect(clampExpandStep(16)).toBe(16);
    expect(clampExpandStep(1)).toBe(1);
    expect(clampExpandStep(1024)).toBe(1024);
    expect(clampExpandStep(0)).toBe(1);
    expect(clampExpandStep(1025)).toBe(1024);
    expect(clampExpandStep(10.9)).toBe(10);
    expect(clampExpandStep(Number.NaN)).toBe(16);
    expect(clampExpandStep(Number.POSITIVE_INFINITY)).toBe(16);
  });

  it("round-trips settings", () => {
    expect(parseExpandSettings(serializeExpandSettings({ step: 8 }))).toEqual({ step: 8 });
    expect(parseExpandSettings(serializeExpandSettings(DEFAULT_EXPAND_SETTINGS))).toEqual(
      DEFAULT_EXPAND_SETTINGS,
    );
  });

  it("clamps parsed values", () => {
    expect(parseExpandSettings(JSON.stringify({ step: 0 }))).toEqual({ step: 1 });
    expect(parseExpandSettings(JSON.stringify({ step: 9999 }))).toEqual({ step: 1024 });
  });

  it("rejects invalid settings", () => {
    expect(() => parseExpandSettings("not json")).toThrow(GnumarusExpandSettingsError);
    expect(() => parseExpandSettings("{}")).toThrow(GnumarusExpandSettingsError);
    expect(() => parseExpandSettings(JSON.stringify({ step: "16" }))).toThrow(
      GnumarusExpandSettingsError,
    );
  });
});
