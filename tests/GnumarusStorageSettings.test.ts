import { describe, expect, it } from "vitest";
import {
  clampStorageQuality,
  DEFAULT_STORAGE_SETTINGS,
  GNUMARUS_MAX_STORAGE_QUALITY,
  GNUMARUS_MIN_STORAGE_QUALITY,
  parseStorageSettings,
  serializeStorageSettings,
  GnumarusStorageSettingsError,
} from "../src/settings/GnumarusStorageSettings";

describe("GnumarusStorageSettings", () => {
  it("defaults to lossless with quality 50", () => {
    expect(DEFAULT_STORAGE_SETTINGS).toEqual({ lossless: true, quality: 50 });
    expect(GNUMARUS_MIN_STORAGE_QUALITY).toBe(0);
    expect(GNUMARUS_MAX_STORAGE_QUALITY).toBe(100);
  });

  it("clamps the lossy quality to an integer 0..100", () => {
    expect(clampStorageQuality(50)).toBe(50);
    expect(clampStorageQuality(0)).toBe(0);
    expect(clampStorageQuality(100)).toBe(100);
    expect(clampStorageQuality(33.6)).toBe(33);
    expect(clampStorageQuality(-4)).toBe(0);
    expect(clampStorageQuality(101)).toBe(100);
    expect(clampStorageQuality(Number.NaN)).toBe(50);
    expect(clampStorageQuality(Number.POSITIVE_INFINITY)).toBe(50);
  });

  it("round-trips settings", () => {
    expect(serializeStorageSettings(parseStorageSettings(serializeStorageSettings(DEFAULT_STORAGE_SETTINGS)))).toBe(
      serializeStorageSettings(DEFAULT_STORAGE_SETTINGS),
    );
    expect(parseStorageSettings(JSON.stringify({ lossless: false, quality: 75 }))).toEqual({
      lossless: false,
      quality: 75,
    });
  });

  it("clamps parsed quality values", () => {
    expect(parseStorageSettings(JSON.stringify({ lossless: true, quality: 250 }))).toEqual({
      lossless: true,
      quality: 100,
    });
    expect(parseStorageSettings(JSON.stringify({ lossless: false, quality: -1 }))).toEqual({
      lossless: false,
      quality: 0,
    });
  });

  it("rejects invalid settings", () => {
    expect(() => parseStorageSettings("not json")).toThrow(GnumarusStorageSettingsError);
    expect(() => parseStorageSettings("{}")).toThrow(GnumarusStorageSettingsError);
    expect(() => parseStorageSettings(JSON.stringify({ lossless: "yes", quality: 50 }))).toThrow(
      GnumarusStorageSettingsError,
    );
    expect(() => parseStorageSettings(JSON.stringify({ lossless: true, quality: "high" }))).toThrow(
      GnumarusStorageSettingsError,
    );
  });
});
