import { describe, expect, it } from "vitest";
import {
  BRUSH_SETTINGS_STORAGE_KEY,
  DEFAULT_BRUSH_SETTINGS,
  GNUMARUS_MAX_MAX_BRUSH_SIZE,
  GNUMARUS_MIN_MAX_BRUSH_SIZE,
  clampMaxBrushSize,
  parseBrushSettings,
  serializeBrushSettings,
} from "../src/settings/GnumarusBrushSettings";

describe("GnumarusBrushSettings", () => {
  it("exposes the default ceiling and storage key", () => {
    expect(DEFAULT_BRUSH_SETTINGS).toEqual({ maxBrushSize: 512 });
    expect(BRUSH_SETTINGS_STORAGE_KEY).toBe("gnumarus.settings.brush.v1");
    expect(GNUMARUS_MIN_MAX_BRUSH_SIZE).toBe(1);
    expect(GNUMARUS_MAX_MAX_BRUSH_SIZE).toBe(2048);
  });

  it("clamps the ceiling to 1..2048", () => {
    expect(clampMaxBrushSize(512)).toBe(512);
    expect(clampMaxBrushSize(0)).toBe(1);
    expect(clampMaxBrushSize(-5)).toBe(1);
    expect(clampMaxBrushSize(2048)).toBe(2048);
    expect(clampMaxBrushSize(9999)).toBe(2048);
    expect(clampMaxBrushSize(100.9)).toBe(100);
    expect(clampMaxBrushSize(Number.NaN)).toBe(512);
    expect(clampMaxBrushSize(Number.POSITIVE_INFINITY)).toBe(512);
  });

  it("round-trips valid settings and rejects garbage", () => {
    expect(parseBrushSettings(serializeBrushSettings({ maxBrushSize: 1024 }))).toEqual({
      maxBrushSize: 1024,
    });
    expect(parseBrushSettings('{"maxBrushSize": 9999}')).toEqual({ maxBrushSize: 2048 });
    expect(() => parseBrushSettings("nope")).toThrow();
    expect(() => parseBrushSettings("[]")).toThrow();
    expect(() => parseBrushSettings("{}")).toThrow();
    expect(() => parseBrushSettings('{"maxBrushSize": "big"}')).toThrow();
  });
});
