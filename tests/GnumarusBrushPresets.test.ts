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

  it("round-trips custom preset lists", () => {
    const first = BUILT_IN_BRUSH_PRESETS[0];
    if (first === undefined) {
      throw new Error("missing built-in preset");
    }
    const custom = { ...first, name: "Mine" };
    expect(parseBrushPresetList(serializeBrushPresetList([custom]))).toEqual([custom]);
    expect(parseBrushPresetList("[]")).toEqual([]);
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
    expect(() => parseBrushPreset(JSON.stringify({ ...base, brushSize: 999 }))).toThrow(GnumarusBrushPresetError);
    expect(() => parseBrushPreset(JSON.stringify({ ...base, brushTipKind: "fancy" }))).toThrow(GnumarusBrushPresetError);
    expect(() => parseBrushPreset(JSON.stringify({ ...base, accumulate: "yes" }))).toThrow(GnumarusBrushPresetError);
    expect(() => parseBrushPresetList("{}")).toThrow(GnumarusBrushPresetError);
    expect(() => parseBrushPresetList("[{}]")).toThrow(GnumarusBrushPresetError);
  });
});
