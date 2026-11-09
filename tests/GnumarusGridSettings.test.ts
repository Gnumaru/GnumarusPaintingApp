import { describe, expect, it } from "vitest";
import {
  clampGridMinZoom,
  clampGridOpacityPercent,
  DEFAULT_GRID_SETTINGS,
  GNUMARUS_GRID_MAX_ZOOM,
  GNUMARUS_GRID_MIN_ZOOM,
  parseGridSettings,
  serializeGridSettings,
  shouldShowPixelGrid,
  GnumarusGridSettingsError,
} from "../src/settings/GnumarusGridSettings";

describe("GnumarusGridSettings", () => {
  it("defaults to 1000 percent and full opacity", () => {
    expect(DEFAULT_GRID_SETTINGS).toEqual({ minZoom: 10, opacityPercent: 100 });
    expect(GNUMARUS_GRID_MIN_ZOOM).toBe(2);
    expect(GNUMARUS_GRID_MAX_ZOOM).toBe(64);
  });

  it("clamps the minimum zoom into range", () => {
    expect(clampGridMinZoom(10)).toBe(10);
    expect(clampGridMinZoom(8)).toBe(8);
    expect(clampGridMinZoom(1)).toBe(2);
    expect(clampGridMinZoom(1.99)).toBe(2);
    expect(clampGridMinZoom(100)).toBe(64);
    expect(clampGridMinZoom(Number.NaN)).toBe(10);
    expect(clampGridMinZoom(Number.POSITIVE_INFINITY)).toBe(10);
  });

  it("clamps the opacity percent to an integer 0..100", () => {
    expect(clampGridOpacityPercent(100)).toBe(100);
    expect(clampGridOpacityPercent(0)).toBe(0);
    expect(clampGridOpacityPercent(33.4)).toBe(33);
    expect(clampGridOpacityPercent(33.6)).toBe(34);
    expect(clampGridOpacityPercent(-5)).toBe(0);
    expect(clampGridOpacityPercent(140)).toBe(100);
    expect(clampGridOpacityPercent(Number.NaN)).toBe(100);
    expect(clampGridOpacityPercent(Number.POSITIVE_INFINITY)).toBe(100);
  });

  it("round-trips settings", () => {
    expect(parseGridSettings(serializeGridSettings({ minZoom: 4, opacityPercent: 55 }))).toEqual({
      minZoom: 4,
      opacityPercent: 55,
    });
    expect(parseGridSettings(serializeGridSettings(DEFAULT_GRID_SETTINGS))).toEqual(DEFAULT_GRID_SETTINGS);
  });

  it("clamps parsed values", () => {
    expect(parseGridSettings(JSON.stringify({ minZoom: 1 }))).toEqual({ minZoom: 2, opacityPercent: 100 });
    expect(parseGridSettings(JSON.stringify({ minZoom: 100 }))).toEqual({ minZoom: 64, opacityPercent: 100 });
    expect(parseGridSettings(JSON.stringify({ minZoomPercent: 400 }))).toEqual({ minZoom: 4, opacityPercent: 100 });
    expect(parseGridSettings(JSON.stringify({ minZoom: 10, opacityPercent: 250 }))).toEqual({
      minZoom: 10,
      opacityPercent: 100,
    });
    expect(parseGridSettings(JSON.stringify({ minZoom: 10, opacityPercent: -3 }))).toEqual({
      minZoom: 10,
      opacityPercent: 0,
    });
  });

  it("rejects invalid settings", () => {
    expect(() => parseGridSettings("not json")).toThrow(GnumarusGridSettingsError);
    expect(() => parseGridSettings("{}")).toThrow(GnumarusGridSettingsError);
    expect(() => parseGridSettings(JSON.stringify({ minZoom: "4x" }))).toThrow(GnumarusGridSettingsError);
    expect(() => parseGridSettings(JSON.stringify({ minZoom: 10, opacityPercent: "loud" }))).toThrow(
      GnumarusGridSettingsError,
    );
  });

  it("hides the grid below 200 percent no matter the threshold", () => {
    expect(shouldShowPixelGrid(1.99, 2)).toBe(false);
    expect(shouldShowPixelGrid(1, 2)).toBe(false);
    expect(shouldShowPixelGrid(0.5, 2)).toBe(false);
    expect(shouldShowPixelGrid(2, 2)).toBe(true);
    expect(shouldShowPixelGrid(8, 2)).toBe(true);
    expect(shouldShowPixelGrid(2, 4)).toBe(false);
    expect(shouldShowPixelGrid(4, 4)).toBe(true);
    expect(shouldShowPixelGrid(64, 64)).toBe(true);
    expect(shouldShowPixelGrid(63.9, 64)).toBe(false);
    expect(shouldShowPixelGrid(Number.NaN, 2)).toBe(false);
  });
});
