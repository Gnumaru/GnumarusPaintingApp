import { describe, expect, it } from "vitest";
import {
  clampRotationStepDeg,
  DEFAULT_ROTATION_SETTINGS,
  GNUMARUS_MAX_ROTATION_STEP_DEG,
  GNUMARUS_MIN_ROTATION_STEP_DEG,
  parseRotationSettings,
  serializeRotationSettings,
  GnumarusRotationSettingsError,
} from "../src/settings/GnumarusRotationSettings";

describe("GnumarusRotationSettings", () => {
  it("defaults to a 15 degree step", () => {
    expect(DEFAULT_ROTATION_SETTINGS).toEqual({ stepDeg: 15 });
    expect(GNUMARUS_MIN_ROTATION_STEP_DEG).toBe(1);
    expect(GNUMARUS_MAX_ROTATION_STEP_DEG).toBe(90);
  });

  it("clamps the step into range with integer degrees", () => {
    expect(clampRotationStepDeg(15)).toBe(15);
    expect(clampRotationStepDeg(0)).toBe(1);
    expect(clampRotationStepDeg(500)).toBe(90);
    expect(clampRotationStepDeg(15.9)).toBe(15);
    expect(clampRotationStepDeg(Number.NaN)).toBe(15);
    expect(clampRotationStepDeg(Number.POSITIVE_INFINITY)).toBe(15);
  });

  it("round-trips settings", () => {
    expect(parseRotationSettings(serializeRotationSettings({ stepDeg: 30 }))).toEqual({ stepDeg: 30 });
    expect(parseRotationSettings(serializeRotationSettings(DEFAULT_ROTATION_SETTINGS))).toEqual(
      DEFAULT_ROTATION_SETTINGS,
    );
  });

  it("clamps parsed values", () => {
    expect(parseRotationSettings(JSON.stringify({ stepDeg: 0 }))).toEqual({ stepDeg: 1 });
    expect(parseRotationSettings(JSON.stringify({ stepDeg: 180 }))).toEqual({ stepDeg: 90 });
  });

  it("rejects invalid settings", () => {
    expect(() => parseRotationSettings("not json")).toThrow(GnumarusRotationSettingsError);
    expect(() => parseRotationSettings("{}")).toThrow(GnumarusRotationSettingsError);
    expect(() => parseRotationSettings(JSON.stringify({ stepDeg: "15deg" }))).toThrow(
      GnumarusRotationSettingsError,
    );
  });
});
