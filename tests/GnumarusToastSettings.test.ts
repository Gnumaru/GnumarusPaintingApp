import { describe, expect, it } from "vitest";
import {
  clampToastDurationSec,
  DEFAULT_TOAST_SETTINGS,
  GNUMARUS_MAX_TOAST_DURATION_SEC,
  GNUMARUS_MIN_TOAST_DURATION_SEC,
  parseToastSettings,
  serializeToastSettings,
  GnumarusToastSettingsError,
} from "../src/settings/GnumarusToastSettings";

describe("GnumarusToastSettings", () => {
  it("defaults to 1.0 seconds", () => {
    expect(DEFAULT_TOAST_SETTINGS).toEqual({ durationSec: 1.0 });
    expect(GNUMARUS_MIN_TOAST_DURATION_SEC).toBe(0.5);
    expect(GNUMARUS_MAX_TOAST_DURATION_SEC).toBe(2.0);
  });

  it("clamps the duration into range", () => {
    expect(clampToastDurationSec(1.0)).toBe(1.0);
    expect(clampToastDurationSec(0.5)).toBe(0.5);
    expect(clampToastDurationSec(2.0)).toBe(2.0);
    expect(clampToastDurationSec(0)).toBe(0.5);
    expect(clampToastDurationSec(0.49)).toBe(0.5);
    expect(clampToastDurationSec(2.01)).toBe(2.0);
    expect(clampToastDurationSec(10)).toBe(2.0);
    expect(clampToastDurationSec(Number.NaN)).toBe(1.0);
    expect(clampToastDurationSec(Number.POSITIVE_INFINITY)).toBe(1.0);
  });

  it("round-trips settings", () => {
    expect(parseToastSettings(serializeToastSettings({ durationSec: 1.5 }))).toEqual({ durationSec: 1.5 });
    expect(parseToastSettings(serializeToastSettings(DEFAULT_TOAST_SETTINGS))).toEqual(DEFAULT_TOAST_SETTINGS);
  });

  it("clamps parsed values and accepts milliseconds", () => {
    expect(parseToastSettings(JSON.stringify({ durationSec: 0 }))).toEqual({ durationSec: 0.5 });
    expect(parseToastSettings(JSON.stringify({ durationSec: 5 }))).toEqual({ durationSec: 2.0 });
    expect(parseToastSettings(JSON.stringify({ durationMs: 1500 }))).toEqual({ durationSec: 1.5 });
  });

  it("rejects invalid settings", () => {
    expect(() => parseToastSettings("not json")).toThrow(GnumarusToastSettingsError);
    expect(() => parseToastSettings("{}")).toThrow(GnumarusToastSettingsError);
    expect(() => parseToastSettings(JSON.stringify({ durationSec: "1s" }))).toThrow(
      GnumarusToastSettingsError,
    );
  });
});
