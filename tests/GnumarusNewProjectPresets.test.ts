import { describe, expect, it } from "vitest";
import {
  applyNewProjectPreset,
  GNUMARUS_NEW_PROJECT_PRESETS,
} from "../src/settings/GnumarusNewProjectPresets";

describe("GnumarusNewProjectPresets", () => {
  it("ships the initial nine presets", () => {
    expect(GNUMARUS_NEW_PROJECT_PRESETS.map((preset) => preset.name)).toEqual([
      "pixel landscape",
      "pixel sprite small",
      "pixel sprite medium",
      "pixel sprite large",
      "Notes XLQ",
      "Sketches MQ",
      "Sketches HQ",
      "digital painting lossless",
      "digital painting lossy",
    ]);
  });

  it("keeps every preset inside the dialog limits with PNG always lossless", () => {
    for (const preset of GNUMARUS_NEW_PROJECT_PRESETS) {
      const applied = applyNewProjectPreset(preset.name);
      expect(applied).not.toBeNull();
      expect(applied?.width).toBeGreaterThanOrEqual(1);
      expect(applied?.width).toBeLessThanOrEqual(16384);
      expect(applied?.height).toBeGreaterThanOrEqual(1);
      expect(applied?.height).toBeLessThanOrEqual(16384);
      expect(["png", "webp", "jxl"]).toContain(applied?.format);
      if (applied?.format === "png") {
        expect(applied.lossless).toBe(true);
      }
      expect(applied?.quality).toBeGreaterThanOrEqual(0);
      expect(applied?.quality).toBeLessThanOrEqual(100);
    }
  });

  it("applies the documented preset values", () => {
    expect(applyNewProjectPreset("pixel landscape")).toEqual({
      width: 400,
      height: 224,
      format: "webp",
      lossless: true,
      quality: 50,
    });
    expect(applyNewProjectPreset("pixel sprite small")).toEqual({
      width: 16,
      height: 16,
      format: "webp",
      lossless: true,
      quality: 50,
    });
    expect(applyNewProjectPreset("Notes XLQ")).toEqual({
      width: 1920,
      height: 1080,
      format: "jxl",
      lossless: false,
      quality: 0,
    });
    expect(applyNewProjectPreset("Sketches MQ")).toEqual({
      width: 1920,
      height: 1080,
      format: "jxl",
      lossless: false,
      quality: 34,
    });
    expect(applyNewProjectPreset("Sketches HQ")).toEqual({
      width: 1920,
      height: 1080,
      format: "jxl",
      lossless: false,
      quality: 75,
    });
    expect(applyNewProjectPreset("digital painting lossless")).toEqual({
      width: 1920,
      height: 1080,
      format: "jxl",
      lossless: true,
      quality: 50,
    });
    expect(applyNewProjectPreset("digital painting lossy")).toEqual({
      width: 1920,
      height: 1080,
      format: "jxl",
      lossless: false,
      quality: 95,
    });
  });

  it("returns null for unknown preset names", () => {
    expect(applyNewProjectPreset("nope")).toBeNull();
    expect(applyNewProjectPreset("")).toBeNull();
  });
});
