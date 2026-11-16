import { describe, expect, it } from "vitest";
import {
  BRUSH_PRESET_STORAGE_KEY,
  BUILT_IN_BRUSH_PRESETS,
  GnumarusBrushPresetError,
  parseBrushPreset,
  parseBrushPresetList,
  serializeBrushPreset,
  serializeBrushPresetList,
} from "../src/canvas/GnumarusBrushPresets";

describe("GnumarusBrushPresets", () => {
  it("round-trips a preset through JSON", () => {
    const preset = BUILT_IN_BRUSH_PRESETS[1];
    if (preset === undefined) {
      throw new Error("missing built-in preset");
    }
    const parsed = parseBrushPreset(serializeBrushPreset(preset));
    expect(parsed).toEqual(preset);
  });

  it("ships valid built-ins", () => {
    expect(BRUSH_PRESET_STORAGE_KEY).toBe("gnumarus.brushPresets.v1");
    expect(BUILT_IN_BRUSH_PRESETS.length).toBeGreaterThanOrEqual(5);
    const names = BUILT_IN_BRUSH_PRESETS.map((preset) => preset.name);
    expect(new Set(names).size).toBe(names.length);
    for (const preset of BUILT_IN_BRUSH_PRESETS) {
      expect(parseBrushPreset(serializeBrushPreset(preset))).toEqual(preset);
    }
  });

  it("ships the extended preset set", () => {
    const names = BUILT_IN_BRUSH_PRESETS.map((preset) => preset.name);
    for (const expected of [
      "Pixel Hard",
      "Soft Round",
      "Chalk",
      "Ink",
      "Airbrush",
      "Smudge",
      "Eraser Hard",
      "Eraser Soft",
      "Glaze",
      "Dry Brush",
      "Charcoal",
      "Blender",
      "Spray",
      "Chisel Marker",
      "Velocity Ink",
      "Tilt Pencil",
      "Pixel Spray",
      "Pixel Dither",
      "Palette Shade",
    ]) {
      expect(names).toContain(expected);
    }
  });

  it("fills pixel-art defaults for older preset files", () => {
    const legacy = JSON.stringify({
      version: 1,
      name: "Legacy",
      brushSize: 4,
      brushShape: "circle",
      brushTipKind: "pixel",
      brushHardness: 0.5,
      brushSpacing: 0.15,
      brushFlow: 1,
      pressureResponse: "none",
      pressureSizeCurve: "linear",
      pressureAlphaCurve: "linear",
      paintFuzzy: 0,
      paintGrainStrength: 0,
      paintGrainScale: 8,
      tiltSizeAmount: 0,
      speedFadeAmount: 0,
      tipAngleMode: "none",
      airbrushRate: 0,
      smudgeRate: 0,
      smudgeWet: 0,
      paintDualScale: 1,
      paintDualStrength: 1,
      blendMode: "normal",
      accumulate: true,
    });
    expect(parseBrushPreset(legacy)).toMatchObject({
      pixelSprayDensity: 1,
      brushDither: false,
      brushColorMode: "solid",
    });
    expect(() => parseBrushPreset(JSON.stringify({ ...JSON.parse(legacy), pixelSprayDensity: 5 }))).toThrow(
      GnumarusBrushPresetError,
    );
  });

  it("round-trips custom preset lists", () => {
    const first = BUILT_IN_BRUSH_PRESETS[0];
    if (first === undefined) {
      throw new Error("missing built-in preset");
    }
    const custom = { ...first, name: "Mine" };
    expect(parseBrushPresetList(serializeBrushPresetList([custom]))).toEqual([custom]);
    expect(parseBrushPresetList("[]")).toEqual([]);
  });

  it("defaults a missing brushSizeMin to brushSize", () => {
    const first = BUILT_IN_BRUSH_PRESETS[0];
    if (first === undefined) {
      throw new Error("missing built-in preset");
    }
    const base = JSON.parse(serializeBrushPreset(first)) as Record<string, unknown>;
    delete base["brushSizeMin"];
    const parsed = parseBrushPreset(JSON.stringify(base));
    expect(parsed.brushSizeMin).toBe(parsed.brushSize);
  });

  it("rejects invalid presets", () => {
    expect(() => parseBrushPreset("not json")).toThrow(GnumarusBrushPresetError);
    expect(() => parseBrushPreset("{}")).toThrow(GnumarusBrushPresetError);
    const first = BUILT_IN_BRUSH_PRESETS[0];
    if (first === undefined) {
      throw new Error("missing built-in preset");
    }
    const base = JSON.parse(serializeBrushPreset(first)) as Record<string, unknown>;
    expect(() => parseBrushPreset(JSON.stringify({ ...base, version: 2 }))).toThrow(GnumarusBrushPresetError);
    expect(() => parseBrushPreset(JSON.stringify({ ...base, name: "" }))).toThrow(GnumarusBrushPresetError);
    expect(() => parseBrushPreset(JSON.stringify({ ...base, brushSize: 9999 }))).toThrow(GnumarusBrushPresetError);
    expect(parseBrushPreset(JSON.stringify({ ...base, brushSize: 999 })).brushSize).toBe(999);
    expect(() => parseBrushPreset(JSON.stringify({ ...base, brushTipKind: "fancy" }))).toThrow(GnumarusBrushPresetError);
    expect(() => parseBrushPreset(JSON.stringify({ ...base, accumulate: "yes" }))).toThrow(GnumarusBrushPresetError);
    expect(() => parseBrushPresetList("{}")).toThrow(GnumarusBrushPresetError);
    expect(() => parseBrushPresetList("[{}]")).toThrow(GnumarusBrushPresetError);
  });
});
