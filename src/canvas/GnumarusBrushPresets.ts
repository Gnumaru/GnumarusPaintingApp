/**
 * Shareable brush presets: every pencil paint setting as versioned JSON.
 * Tip *images* are intentionally excluded (bitmaps don't belong in a
 * settings preset): applying an `image`-kind preset without an installed
 * tip paints nothing until one is imported. Dual tips are likewise
 * excluded; dual tuning (scale/strength) is included.
 */
import type { GnumarusBlendMode } from "./GnumarusPixelBuffer";
import type { GnumarusBrushTipKind } from "./GnumarusPaintBrush";
import type { GnumarusPressureCurve } from "./GnumarusPaintBrush";
import type { GnumarusPressureResponse } from "./GnumarusPixelBuffer";
import type { GnumarusTipAngleMode } from "./GnumarusPaintBrush";
import type { GnumarusBrushShape } from "./GnumarusPixelBuffer";

export interface GnumarusBrushPreset {
  version: 1;
  name: string;
  brushSize: number;
  brushShape: GnumarusBrushShape;
  brushTipKind: GnumarusBrushTipKind;
  brushHardness: number;
  brushSpacing: number;
  brushFlow: number;
  pressureResponse: GnumarusPressureResponse;
  pressureSizeCurve: GnumarusPressureCurve;
  pressureAlphaCurve: GnumarusPressureCurve;
  paintFuzzy: number;
  paintGrainStrength: number;
  paintGrainScale: number;
  tiltSizeAmount: number;
  speedFadeAmount: number;
  tipAngleMode: GnumarusTipAngleMode;
  airbrushRate: number;
  smudgeRate: number;
  smudgeWet: number;
  paintDualScale: number;
  paintDualStrength: number;
  blendMode: GnumarusBlendMode;
  accumulate: boolean;
}

export const BRUSH_PRESET_STORAGE_KEY = "gnumarus.brushPresets.v1";

export class GnumarusBrushPresetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GnumarusBrushPresetError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function checkString(value: unknown, field: string, allowed: readonly string[]): string {
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new GnumarusBrushPresetError(`preset has an invalid ${field}`);
  }
  return value;
}

/** Validate unknown JSON into a brush preset (v1 only). */
export function parseBrushPreset(jsonText: string): GnumarusBrushPreset {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText) as unknown;
  } catch {
    throw new GnumarusBrushPresetError("preset is not valid JSON");
  }
  if (!isRecord(parsed)) {
    throw new GnumarusBrushPresetError("preset root must be an object");
  }
  if (parsed["version"] !== 1) {
    throw new GnumarusBrushPresetError("unsupported preset version");
  }
  const name = parsed["name"];
  if (typeof name !== "string" || name.length === 0 || name.length > 64) {
    throw new GnumarusBrushPresetError("preset has an invalid name");
  }
  const numbers: Array<[string, number, number]> = [
    ["brushSize", 0.1, 64],
    ["brushHardness", 0, 1],
    ["brushSpacing", 0.05, 4],
    ["brushFlow", 0.01, 1],
    ["paintFuzzy", 0, 1],
    ["paintGrainStrength", 0, 1],
    ["paintGrainScale", 2, 64],
    ["tiltSizeAmount", 0, 1],
    ["speedFadeAmount", 0, 1],
    ["airbrushRate", 0, 20],
    ["smudgeRate", 0, 1],
    ["smudgeWet", 0, 1],
    ["paintDualScale", 0.25, 4],
    ["paintDualStrength", 0, 1],
  ];
  const numeric: Record<string, number> = {};
  for (const [field, min, max] of numbers) {
    const value = parsed[field];
    if (!isFiniteNumber(value) || value < min || value > max) {
      throw new GnumarusBrushPresetError(`preset has an invalid ${field}`);
    }
    numeric[field] = value;
  }
  const accumulate = parsed["accumulate"];
  if (typeof accumulate !== "boolean") {
    throw new GnumarusBrushPresetError("preset has an invalid accumulate flag");
  }
  const preset: GnumarusBrushPreset = {
    version: 1,
    name,
    brushSize: numeric["brushSize"] ?? 1,
    brushShape: checkString(parsed["brushShape"], "brushShape", ["square", "circle"]) as GnumarusBrushShape,
    brushTipKind: checkString(parsed["brushTipKind"], "brushTipKind", ["pixel", "soft", "image"]) as GnumarusBrushTipKind,
    brushHardness: numeric["brushHardness"] ?? 0.5,
    brushSpacing: numeric["brushSpacing"] ?? 0.15,
    brushFlow: numeric["brushFlow"] ?? 1,
    pressureResponse: checkString(parsed["pressureResponse"], "pressureResponse", [
      "none",
      "size",
      "opacity",
      "size+opacity",
    ]) as GnumarusPressureResponse,
    pressureSizeCurve: checkString(parsed["pressureSizeCurve"], "pressureSizeCurve", [
      "linear",
      "soft",
      "firm",
    ]) as GnumarusPressureCurve,
    pressureAlphaCurve: checkString(parsed["pressureAlphaCurve"], "pressureAlphaCurve", [
      "linear",
      "soft",
      "firm",
    ]) as GnumarusPressureCurve,
    paintFuzzy: numeric["paintFuzzy"] ?? 0,
    paintGrainStrength: numeric["paintGrainStrength"] ?? 0,
    paintGrainScale: numeric["paintGrainScale"] ?? 8,
    tiltSizeAmount: numeric["tiltSizeAmount"] ?? 0,
    speedFadeAmount: numeric["speedFadeAmount"] ?? 0,
    tipAngleMode: checkString(parsed["tipAngleMode"], "tipAngleMode", ["none", "direction"]) as GnumarusTipAngleMode,
    airbrushRate: numeric["airbrushRate"] ?? 0,
    smudgeRate: numeric["smudgeRate"] ?? 0,
    smudgeWet: numeric["smudgeWet"] ?? 0,
    paintDualScale: numeric["paintDualScale"] ?? 1,
    paintDualStrength: numeric["paintDualStrength"] ?? 1,
    blendMode: checkString(parsed["blendMode"], "blendMode", ["normal", "copy", "eraser"]) as GnumarusBlendMode,
    accumulate,
  };
  return preset;
}

export function serializeBrushPreset(preset: GnumarusBrushPreset): string {
  return JSON.stringify(preset, null, 2);
}

/** Parse a stored custom-preset list (array of preset JSON strings or objects). */
export function parseBrushPresetList(jsonText: string): GnumarusBrushPreset[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText) as unknown;
  } catch {
    throw new GnumarusBrushPresetError("preset list is not valid JSON");
  }
  if (!Array.isArray(parsed)) {
    throw new GnumarusBrushPresetError("preset list root must be an array");
  }
  return parsed.map((entry) => parseBrushPreset(JSON.stringify(entry)));
}

export function serializeBrushPresetList(presets: GnumarusBrushPreset[]): string {
  return JSON.stringify(presets, null, 2);
}

/** Built-in presets shipped with the app (always valid by construction). */
export const BUILT_IN_BRUSH_PRESETS: GnumarusBrushPreset[] = [
  {
    version: 1,
    name: "Pixel Hard",
    brushSize: 1,
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
  },
  {
    version: 1,
    name: "Soft Round",
    brushSize: 16,
    brushShape: "circle",
    brushTipKind: "soft",
    brushHardness: 0.5,
    brushSpacing: 0.15,
    brushFlow: 1,
    pressureResponse: "size+opacity",
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
  },
  {
    version: 1,
    name: "Chalk",
    brushSize: 20,
    brushShape: "circle",
    brushTipKind: "soft",
    brushHardness: 0.7,
    brushSpacing: 0.25,
    brushFlow: 0.9,
    pressureResponse: "size+opacity",
    pressureSizeCurve: "soft",
    pressureAlphaCurve: "linear",
    paintFuzzy: 0.4,
    paintGrainStrength: 0.6,
    paintGrainScale: 4,
    tiltSizeAmount: 0.5,
    speedFadeAmount: 0,
    tipAngleMode: "none",
    airbrushRate: 0,
    smudgeRate: 0,
    smudgeWet: 0,
    paintDualScale: 1,
    paintDualStrength: 1,
    blendMode: "normal",
    accumulate: true,
  },
  {
    version: 1,
    name: "Ink",
    brushSize: 8,
    brushShape: "circle",
    brushTipKind: "soft",
    brushHardness: 0.8,
    brushSpacing: 0.08,
    brushFlow: 0.9,
    pressureResponse: "size",
    pressureSizeCurve: "firm",
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
  },
  {
    version: 1,
    name: "Airbrush",
    brushSize: 32,
    brushShape: "circle",
    brushTipKind: "soft",
    brushHardness: 0,
    brushSpacing: 0.5,
    brushFlow: 0.25,
    pressureResponse: "none",
    pressureSizeCurve: "linear",
    pressureAlphaCurve: "linear",
    paintFuzzy: 0,
    paintGrainStrength: 0,
    paintGrainScale: 8,
    tiltSizeAmount: 0,
    speedFadeAmount: 0,
    tipAngleMode: "none",
    airbrushRate: 12,
    smudgeRate: 0,
    smudgeWet: 0,
    paintDualScale: 1,
    paintDualStrength: 1,
    blendMode: "normal",
    accumulate: true,
  },
  {
    version: 1,
    name: "Smudge",
    brushSize: 24,
    brushShape: "circle",
    brushTipKind: "soft",
    brushHardness: 0.3,
    brushSpacing: 0.15,
    brushFlow: 0.6,
    pressureResponse: "size",
    pressureSizeCurve: "linear",
    pressureAlphaCurve: "linear",
    paintFuzzy: 0,
    paintGrainStrength: 0,
    paintGrainScale: 8,
    tiltSizeAmount: 0,
    speedFadeAmount: 0,
    tipAngleMode: "none",
    airbrushRate: 0,
    smudgeRate: 0.8,
    smudgeWet: 0,
    paintDualScale: 1,
    paintDualStrength: 1,
    blendMode: "normal",
    accumulate: true,
  },
];
