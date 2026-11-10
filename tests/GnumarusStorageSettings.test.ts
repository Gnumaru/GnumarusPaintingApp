import { describe, expect, it } from "vitest";
import {
  clampBrushQuality,
  clampStorageJpgQuality,
  clampStoragePngLevel,
  clampStorageQuality,
  DEFAULT_STORAGE_SETTINGS,
  GNUMARUS_MAX_STORAGE_PNG_LEVEL,
  GNUMARUS_MAX_STORAGE_QUALITY,
  GNUMARUS_MIN_STORAGE_PNG_LEVEL,
  GNUMARUS_MIN_STORAGE_QUALITY,
  parseStorageFormat,
  parseStorageSettings,
  serializeStorageSettings,
  GnumarusStorageSettingsError,
} from "../src/settings/GnumarusStorageSettings";

describe("GnumarusStorageSettings", () => {
  it("defaults to JXL lossless with PNG level 9, JPEG quality 95 and brush JXL quality 90", () => {
    expect(DEFAULT_STORAGE_SETTINGS).toEqual({
      format: "jxl",
      lossless: true,
      quality: 50,
      pngLevel: 9,
      jpgQuality: 95,
      brushQuality: 90,
    });
    expect(GNUMARUS_MIN_STORAGE_QUALITY).toBe(0);
    expect(GNUMARUS_MAX_STORAGE_QUALITY).toBe(100);
    expect(GNUMARUS_MIN_STORAGE_PNG_LEVEL).toBe(0);
    expect(GNUMARUS_MAX_STORAGE_PNG_LEVEL).toBe(9);
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
      format: "jxl",
      lossless: false,
      quality: 75,
      pngLevel: 9,
      jpgQuality: 95,
      brushQuality: 90,
    });
    expect(
      parseStorageSettings(JSON.stringify({ format: "png", lossless: true, quality: 50, pngLevel: 3, jpgQuality: 80 })),
    ).toEqual({ format: "png", lossless: true, quality: 50, pngLevel: 3, jpgQuality: 80, brushQuality: 90 });
  });

  it("parses formats with a JXL fallback and clamps levels", () => {
    expect(parseStorageFormat("jpg")).toBe("jpg");
    expect(parseStorageFormat("png")).toBe("png");
    expect(parseStorageFormat("jxl")).toBe("jxl");
    expect(parseStorageFormat("webp")).toBe("jxl");
    expect(parseStorageFormat(undefined)).toBe("jxl");
    expect(clampStoragePngLevel(4)).toBe(4);
    expect(clampStoragePngLevel(4.9)).toBe(4);
    expect(clampStoragePngLevel(-1)).toBe(0);
    expect(clampStoragePngLevel(10)).toBe(9);
    expect(clampStoragePngLevel(Number.NaN)).toBe(9);
    expect(clampStorageJpgQuality(95)).toBe(95);
    expect(clampStorageJpgQuality(200)).toBe(100);
    expect(clampStorageJpgQuality(Number.NaN)).toBe(95);
  });

  it("clamps parsed quality values", () => {
    expect(parseStorageSettings(JSON.stringify({ lossless: true, quality: 250 }))).toEqual({
      format: "jxl",
      lossless: true,
      quality: 100,
      pngLevel: 9,
      jpgQuality: 95,
      brushQuality: 90,
    });
    expect(parseStorageSettings(JSON.stringify({ lossless: false, quality: -1 }))).toEqual({
      format: "jxl",
      lossless: false,
      quality: 0,
      pngLevel: 9,
      jpgQuality: 95,
      brushQuality: 90,
    });
    expect(parseStorageSettings(JSON.stringify({ lossless: true, quality: 50, brushQuality: 250 }))).toEqual({
      format: "jxl",
      lossless: true,
      quality: 50,
      pngLevel: 9,
      jpgQuality: 95,
      brushQuality: 100,
    });
  });

  it("clamps the brush tip JXL quality to an integer 0..100", () => {
    expect(clampBrushQuality(90)).toBe(90);
    expect(clampBrushQuality(0)).toBe(0);
    expect(clampBrushQuality(101)).toBe(100);
    expect(clampBrushQuality(-1)).toBe(0);
    expect(clampBrushQuality(42.7)).toBe(42);
    expect(clampBrushQuality(Number.NaN)).toBe(90);
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
