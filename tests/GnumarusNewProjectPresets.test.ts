import { describe, expect, it } from "vitest";
import {
  applyNewProjectPreset,
  fpsToFrametimeSec,
  frametimeSecToFps,
  GNUMARUS_NEW_PROJECT_PRESETS,
  isPartialDecimal,
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
      fps: 4,
    });
    expect(applyNewProjectPreset("pixel sprite small")).toEqual({
      width: 16,
      height: 16,
      format: "webp",
      lossless: true,
      quality: 50,
      fps: 4,
    });
    expect(applyNewProjectPreset("Notes XLQ")).toEqual({
      width: 1920,
      height: 1080,
      format: "jxl",
      lossless: false,
      quality: 0,
      fps: 12,
    });
    expect(applyNewProjectPreset("Sketches MQ")).toEqual({
      width: 1920,
      height: 1080,
      format: "jxl",
      lossless: false,
      quality: 34,
      fps: 12,
    });
    expect(applyNewProjectPreset("Sketches HQ")).toEqual({
      width: 1920,
      height: 1080,
      format: "jxl",
      lossless: false,
      quality: 75,
      fps: 12,
    });
    expect(applyNewProjectPreset("digital painting lossless")).toEqual({
      width: 1920,
      height: 1080,
      format: "jxl",
      lossless: true,
      quality: 50,
      fps: 12,
    });
    expect(applyNewProjectPreset("digital painting lossy")).toEqual({
      width: 1920,
      height: 1080,
      format: "jxl",
      lossless: false,
      quality: 95,
      fps: 12,
    });
  });

  it("returns null for unknown preset names", () => {
    expect(applyNewProjectPreset("nope")).toBeNull();
    expect(applyNewProjectPreset("")).toBeNull();
  });

  it("gives pixel-art presets 4 fps and every other preset 12 fps", () => {
    for (const preset of GNUMARUS_NEW_PROJECT_PRESETS) {
      const applied = applyNewProjectPreset(preset.name);
      const pixelArt = preset.name === "pixel landscape" || preset.name.startsWith("pixel sprite");
      expect(applied?.fps).toBe(pixelArt ? 4 : 12);
    }
  });

  it("links fps and frametime through 1/x with clamping", () => {
    expect(fpsToFrametimeSec(4)).toBe(0.25);
    expect(fpsToFrametimeSec(12)).toBe(0.083333333);
    expect(frametimeSecToFps(0.25)).toBe(4);
    // Typing the displayed frametime back yields the same fps (no drift).
    expect(frametimeSecToFps(fpsToFrametimeSec(12))).toBe(12);
    expect(frametimeSecToFps(fpsToFrametimeSec(29.97))).toBe(29.97);
    // Out-of-range sides clamp through the duration limits (0.001..60 s).
    expect(fpsToFrametimeSec(0.01)).toBe(60);
    expect(fpsToFrametimeSec(5000)).toBe(0.001);
    expect(frametimeSecToFps(100)).toBe(0.016667);
    expect(frametimeSecToFps(0)).toBe(12);
    expect(fpsToFrametimeSec(Number.NaN)).toBe(0.25);
  });

  it("spots unfinished decimal input", () => {
    expect(isPartialDecimal("")).toBe(true);
    expect(isPartialDecimal("0.")).toBe(true);
    expect(isPartialDecimal("12.")).toBe(true);
    expect(isPartialDecimal("0.25")).toBe(false);
    expect(isPartialDecimal("12")).toBe(false);
  });
});
