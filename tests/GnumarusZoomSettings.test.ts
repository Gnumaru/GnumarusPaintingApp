import { describe, expect, it } from "vitest";
import {
  clampZoomMinPercent,
  DEFAULT_ZOOM_SETTINGS,
  GNUMARUS_MAX_ZOOM_PERCENT,
  GNUMARUS_MIN_ZOOM_PERCENT,
  parseZoomSettings,
  serializeZoomSettings,
  GnumarusZoomSettingsError,
} from "../src/settings/GnumarusZoomSettings";

describe("GnumarusZoomSettings", () => {
  it("defaults the minimum zoom to 25 percent", () => {
    expect(DEFAULT_ZOOM_SETTINGS).toEqual({ minZoomPercent: 25 });
    expect(GNUMARUS_MIN_ZOOM_PERCENT).toBe(1);
    expect(GNUMARUS_MAX_ZOOM_PERCENT).toBe(100);
  });

  it("clamps the minimum zoom to an integer 1..100", () => {
    expect(clampZoomMinPercent(25)).toBe(25);
    expect(clampZoomMinPercent(1)).toBe(1);
    expect(clampZoomMinPercent(100)).toBe(100);
    expect(clampZoomMinPercent(33.6)).toBe(33);
    expect(clampZoomMinPercent(0)).toBe(1);
    expect(clampZoomMinPercent(101)).toBe(100);
    expect(clampZoomMinPercent(Number.NaN)).toBe(25);
    expect(clampZoomMinPercent(Number.POSITIVE_INFINITY)).toBe(25);
  });

  it("round-trips settings", () => {
    expect(serializeZoomSettings(parseZoomSettings(serializeZoomSettings(DEFAULT_ZOOM_SETTINGS)))).toBe(
      serializeZoomSettings(DEFAULT_ZOOM_SETTINGS),
    );
    expect(parseZoomSettings(JSON.stringify({ minZoomPercent: 10 }))).toEqual({ minZoomPercent: 10 });
  });

  it("clamps parsed values", () => {
    expect(parseZoomSettings(JSON.stringify({ minZoomPercent: 250 }))).toEqual({ minZoomPercent: 100 });
    expect(parseZoomSettings(JSON.stringify({ minZoomPercent: -1 }))).toEqual({ minZoomPercent: 1 });
  });

  it("rejects invalid settings", () => {
    expect(() => parseZoomSettings("not json")).toThrow(GnumarusZoomSettingsError);
    expect(() => parseZoomSettings("{}")).toThrow(GnumarusZoomSettingsError);
    expect(() => parseZoomSettings(JSON.stringify({ minZoomPercent: "low" }))).toThrow(
      GnumarusZoomSettingsError,
    );
  });
});
