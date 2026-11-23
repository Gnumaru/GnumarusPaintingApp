/**
 * Shareable brush presets: every brush paint setting as versioned JSON.
 * Tip *images* are intentionally excluded (bitmaps don't belong in a
 * settings preset): applying an `image`-kind preset without an installed
 * tip paints nothing until one is imported. Dual tips are likewise
 * excluded; dual tuning (scale/strength) is included.
 */
import type { GnumarusBlendMode } from "./GnumarusPixelBuffer";
import type { GnumarusBrushTipKind } from "./GnumarusPaintBrush";
import type { GnumarusPressureCurve } from "./GnumarusPaintBrush";
import type { GnumarusPressureResponse } from "./GnumarusPixelBuffer";
import type { GnumarusSymmetryMode } from "./GnumarusPaintBrush";
import type { GnumarusTipAngleMode } from "./GnumarusPaintBrush";
import type { GnumarusWrapMode } from "./GnumarusViewportMath";
import type { GnumarusBrushShape, GnumarusShadeDirection } from "./GnumarusPixelBuffer";
import { GNUMARUS_MAX_MAX_BRUSH_SIZE } from "../settings/GnumarusBrushSettings";
import type { GnumarusLocale } from "../i18n/GnumarusI18n";

/** Brush color source: solid foreground or stepping through a palette. */
export type GnumarusBrushColorMode = "solid" | "palette";

export interface GnumarusBrushPreset {
  version: 1;
  name: string;
  /** Brazilian Portuguese display label; absent means showing `name`. */
  labelPt?: string;
  brushSize: number;
  /** Minimum pressure size; absent in older files means a fixed brushSize. */
  brushSizeMin?: number;
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
  /** Fraction of pixels kept (pixel spray); absent in older files means 1. */
  pixelSprayDensity?: number;
  /** Ordered Bayer-4x4 dithering; absent in older files means false. */
  brushDither?: boolean;
  /** Solid foreground vs palette stepping; absent in older files means solid. */
  brushColorMode?: GnumarusBrushColorMode;
  /** Palette-shading step direction; absent in older files means forward. */
  shadeDirection?: GnumarusShadeDirection;
  blendMode: GnumarusBlendMode;
  accumulate: boolean;
  /** Symmetry mode; absent in older files means off. */
  symmetryMode?: GnumarusSymmetryMode;
  /** Wrap-around mode; absent in older files means off. */
  wrapMode?: GnumarusWrapMode;
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

function checkSymmetry(value: unknown): GnumarusSymmetryMode {
  if (value === undefined) {
    return "off";
  }
  if (value === "mirror-x" || value === "mirror-y" || value === "both" || value === "off") {
    return value;
  }
  throw new GnumarusBrushPresetError("preset has an invalid symmetryMode");
}

function checkWrapMode(value: unknown): GnumarusWrapMode {
  if (value === undefined) {
    return "off";
  }
  if (value === "x" || value === "y" || value === "both" || value === "off") {
    return value;
  }
  throw new GnumarusBrushPresetError("preset has an invalid wrapMode");
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
  const labelPtRaw = parsed["labelPt"];
  if (labelPtRaw !== undefined && (typeof labelPtRaw !== "string" || labelPtRaw.length === 0 || labelPtRaw.length > 64)) {
    throw new GnumarusBrushPresetError("preset has an invalid labelPt");
  }
  const labelPt = labelPtRaw === undefined ? undefined : (labelPtRaw as string);
  const numbers: Array<[string, number, number]> = [
    ["brushSize", 0.1, GNUMARUS_MAX_MAX_BRUSH_SIZE],
    ["brushSizeMin", 0.1, GNUMARUS_MAX_MAX_BRUSH_SIZE],
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
    ["pixelSprayDensity", 0.01, 1],
  ];
  const numeric: Record<string, number> = {};
  for (const [field, min, max] of numbers) {
    const value = parsed[field];
    if (value === undefined) {
      if (field === "brushSizeMin" || field === "pixelSprayDensity") {
        continue;
      }
      throw new GnumarusBrushPresetError(`preset has an invalid ${field}`);
    }
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
    ...(labelPt === undefined ? {} : { labelPt }),
    brushSize: numeric["brushSize"] ?? 1,
    brushSizeMin: numeric["brushSizeMin"] ?? numeric["brushSize"] ?? 1,
    brushShape: checkString(parsed["brushShape"], "brushShape", ["square", "circle", "line"]) as GnumarusBrushShape,
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
    pixelSprayDensity: numeric["pixelSprayDensity"] ?? 1,
    brushDither: parsed["brushDither"] === true,
    brushColorMode: checkString(parsed["brushColorMode"] ?? "solid", "brushColorMode", [
      "solid",
      "palette",
    ]) as GnumarusBrushColorMode,
    shadeDirection: checkString(parsed["shadeDirection"] ?? "forward", "shadeDirection", [
      "forward",
      "backward",
    ]) as GnumarusShadeDirection,
    blendMode: checkString(parsed["blendMode"], "blendMode", ["normal", "copy", "eraser"]) as GnumarusBlendMode,
    accumulate,
    symmetryMode: checkSymmetry(parsed["symmetryMode"]),
    wrapMode: checkWrapMode(parsed["wrapMode"]),
  };
  return preset;
}

export function serializeBrushPreset(preset: GnumarusBrushPreset): string {
  return JSON.stringify(preset, null, 2);
}

/**
 * Display name of a preset for a locale: the Brazilian Portuguese label
 * when asked and present, otherwise the stable English identity name.
 * Custom (user-named) presets have no label and always show their name.
 */
export function displayBrushPresetName(preset: GnumarusBrushPreset, locale: GnumarusLocale): string {
  if (locale === "pt-BR" && preset.labelPt !== undefined && preset.labelPt.length > 0) {
    return preset.labelPt;
  }
  return preset.name;
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
    labelPt: "Pixel duro",
    brushSize: 1,
    brushSizeMin: 1,
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
    pixelSprayDensity: 1,
    brushDither: false,
    brushColorMode: "solid",
    shadeDirection: "forward",
    blendMode: "normal",
    accumulate: true,
    symmetryMode: "off",
    wrapMode: "off",
  },
  {
    version: 1,
    name: "Pixel Hard (Pressure = Size)",
    labelPt: "Pixel duro (pressão = tamanho)",
    brushSize: 8,
    brushSizeMin: 1,
    brushShape: "circle",
    brushTipKind: "pixel",
    brushHardness: 0.5,
    brushSpacing: 0.15,
    brushFlow: 1,
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
    smudgeRate: 0,
    smudgeWet: 0,
    paintDualScale: 1,
    paintDualStrength: 1,
    pixelSprayDensity: 1,
    brushDither: false,
    brushColorMode: "solid",
    shadeDirection: "forward",
    blendMode: "normal",
    accumulate: true,
    symmetryMode: "off",
    wrapMode: "off",
  },
  {
    version: 1,
    name: "Pixel Spray",
    labelPt: "Spray de pixels",
    brushSize: 8,
    brushSizeMin: 8,
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
    pixelSprayDensity: 0.35,
    brushDither: false,
    brushColorMode: "solid",
    shadeDirection: "forward",
    blendMode: "normal",
    accumulate: true,
    symmetryMode: "off",
    wrapMode: "off",
  },
  {
    version: 1,
    name: "Pixel Spray (Pressure = Size)",
    labelPt: "Spray de pixels (pressão = tamanho)",
    brushSize: 8,
    brushSizeMin: 1,
    brushShape: "circle",
    brushTipKind: "pixel",
    brushHardness: 0.5,
    brushSpacing: 0.15,
    brushFlow: 1,
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
    smudgeRate: 0,
    smudgeWet: 0,
    paintDualScale: 1,
    paintDualStrength: 1,
    pixelSprayDensity: 0.35,
    brushDither: false,
    brushColorMode: "solid",
    shadeDirection: "forward",
    blendMode: "normal",
    accumulate: true,
    symmetryMode: "off",
    wrapMode: "off",
  },
  {
    version: 1,
    name: "Pixel Dither",
    labelPt: "Dithering de pixels",
    brushSize: 8,
    brushSizeMin: 8,
    brushShape: "circle",
    brushTipKind: "pixel",
    brushHardness: 0.5,
    brushSpacing: 0.15,
    brushFlow: 1,
    pressureResponse: "opacity",
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
    pixelSprayDensity: 1,
    brushDither: true,
    brushColorMode: "solid",
    shadeDirection: "forward",
    blendMode: "normal",
    accumulate: true,
    symmetryMode: "off",
    wrapMode: "off",
  },
  {
    version: 1,
    name: "Palette Shade",
    labelPt: "Sombreamento de paleta",
    brushSize: 4,
    brushSizeMin: 4,
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
    pixelSprayDensity: 1,
    brushDither: false,
    brushColorMode: "palette",
    shadeDirection: "forward",
    blendMode: "normal",
    accumulate: true,
    symmetryMode: "off",
    wrapMode: "off",
  },
  {
    version: 1,
    name: "Soft Round",
    labelPt: "Redonda suave",
    brushSize: 16,
    brushSizeMin: 4,
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
    pixelSprayDensity: 1,
    brushDither: false,
    brushColorMode: "solid",
    shadeDirection: "forward",
    blendMode: "normal",
    accumulate: true,
    symmetryMode: "off",
    wrapMode: "off",
  },
  {
    version: 1,
    name: "Chalk",
    labelPt: "Giz",
    brushSize: 20,
    brushSizeMin: 6,
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
    pixelSprayDensity: 1,
    brushDither: false,
    brushColorMode: "solid",
    shadeDirection: "forward",
    blendMode: "normal",
    accumulate: true,
    symmetryMode: "off",
    wrapMode: "off",
  },
  {
    version: 1,
    name: "Ink",
    labelPt: "Nanquim",
    brushSize: 8,
    brushSizeMin: 2,
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
    pixelSprayDensity: 1,
    brushDither: false,
    brushColorMode: "solid",
    shadeDirection: "forward",
    blendMode: "normal",
    accumulate: true,
    symmetryMode: "off",
    wrapMode: "off",
  },
  {
    version: 1,
    name: "Airbrush",
    labelPt: "Aerógrafo",
    brushSize: 32,
    brushSizeMin: 8,
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
    pixelSprayDensity: 1,
    brushDither: false,
    brushColorMode: "solid",
    shadeDirection: "forward",
    blendMode: "normal",
    accumulate: true,
    symmetryMode: "off",
    wrapMode: "off",
  },
  {
    version: 1,
    name: "Smudge",
    labelPt: "Esfuminho",
    brushSize: 24,
    brushSizeMin: 8,
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
    pixelSprayDensity: 1,
    brushDither: false,
    brushColorMode: "solid",
    shadeDirection: "forward",
    blendMode: "normal",
    accumulate: true,
    symmetryMode: "off",
    wrapMode: "off",
  },
  {
    version: 1,
    name: "Eraser Hard",
    labelPt: "Borracha dura",
    brushSize: 32,
    brushSizeMin: 8,
    brushShape: "circle",
    brushTipKind: "pixel",
    brushHardness: 0.5,
    brushSpacing: 0.05,
    brushFlow: 1,
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
    smudgeRate: 0,
    smudgeWet: 0,
    paintDualScale: 1,
    paintDualStrength: 1,
    pixelSprayDensity: 1,
    brushDither: false,
    brushColorMode: "solid",
    shadeDirection: "forward",
    blendMode: "eraser",
    accumulate: true,
    symmetryMode: "off",
    wrapMode: "off",
  },
  {
    version: 1,
    name: "Eraser Soft",
    labelPt: "Borracha suave",
    brushSize: 48,
    brushSizeMin: 12,
    brushShape: "circle",
    brushTipKind: "soft",
    brushHardness: 0.3,
    brushSpacing: 0.05,
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
    smudgeRate: 0,
    smudgeWet: 0,
    paintDualScale: 1,
    paintDualStrength: 1,
    pixelSprayDensity: 1,
    brushDither: false,
    brushColorMode: "solid",
    shadeDirection: "forward",
    blendMode: "eraser",
    accumulate: true,
    symmetryMode: "off",
    wrapMode: "off",
  },
  {
    version: 1,
    name: "Glaze",
    labelPt: "Veladura",
    brushSize: 64,
    brushSizeMin: 16,
    brushShape: "circle",
    brushTipKind: "soft",
    brushHardness: 0.1,
    brushSpacing: 0.05,
    brushFlow: 0.25,
    pressureResponse: "opacity",
    pressureSizeCurve: "linear",
    pressureAlphaCurve: "soft",
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
    pixelSprayDensity: 1,
    brushDither: false,
    brushColorMode: "solid",
    shadeDirection: "forward",
    blendMode: "normal",
    accumulate: false,
    symmetryMode: "off",
    wrapMode: "off",
  },
  {
    version: 1,
    name: "Dry Brush",
    labelPt: "Pincel seco",
    brushSize: 32,
    brushSizeMin: 8,
    brushShape: "circle",
    brushTipKind: "soft",
    brushHardness: 0.8,
    brushSpacing: 0.3,
    brushFlow: 0.7,
    pressureResponse: "size",
    pressureSizeCurve: "firm",
    pressureAlphaCurve: "linear",
    paintFuzzy: 0,
    paintGrainStrength: 0.6,
    paintGrainScale: 24,
    tiltSizeAmount: 0,
    speedFadeAmount: 0,
    tipAngleMode: "none",
    airbrushRate: 0,
    smudgeRate: 0,
    smudgeWet: 0,
    paintDualScale: 1,
    paintDualStrength: 1,
    pixelSprayDensity: 1,
    brushDither: false,
    brushColorMode: "solid",
    shadeDirection: "forward",
    blendMode: "normal",
    accumulate: true,
    symmetryMode: "off",
    wrapMode: "off",
  },
  {
    version: 1,
    name: "Charcoal",
    labelPt: "Carvão",
    brushSize: 24,
    brushSizeMin: 6,
    brushShape: "circle",
    brushTipKind: "soft",
    brushHardness: 0.4,
    brushSpacing: 0.1,
    brushFlow: 0.6,
    pressureResponse: "opacity",
    pressureSizeCurve: "linear",
    pressureAlphaCurve: "soft",
    paintFuzzy: 0.2,
    paintGrainStrength: 0.5,
    paintGrainScale: 16,
    tiltSizeAmount: 0,
    speedFadeAmount: 0,
    tipAngleMode: "none",
    airbrushRate: 0,
    smudgeRate: 0,
    smudgeWet: 0,
    paintDualScale: 1,
    paintDualStrength: 1,
    pixelSprayDensity: 1,
    brushDither: false,
    brushColorMode: "solid",
    shadeDirection: "forward",
    blendMode: "normal",
    accumulate: true,
    symmetryMode: "off",
    wrapMode: "off",
  },
  {
    version: 1,
    name: "Blender",
    labelPt: "Misturador",
    brushSize: 24,
    brushSizeMin: 8,
    brushShape: "circle",
    brushTipKind: "soft",
    brushHardness: 0.3,
    brushSpacing: 0.15,
    brushFlow: 0.15,
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
    smudgeRate: 0.8,
    smudgeWet: 1,
    paintDualScale: 1,
    paintDualStrength: 1,
    pixelSprayDensity: 1,
    brushDither: false,
    brushColorMode: "solid",
    shadeDirection: "forward",
    blendMode: "normal",
    accumulate: true,
    symmetryMode: "off",
    wrapMode: "off",
  },
  {
    version: 1,
    name: "Spray",
    labelPt: "Spray",
    brushSize: 16,
    brushSizeMin: 16,
    brushShape: "circle",
    brushTipKind: "soft",
    brushHardness: 0.3,
    brushSpacing: 0.4,
    brushFlow: 0.4,
    pressureResponse: "none",
    pressureSizeCurve: "linear",
    pressureAlphaCurve: "linear",
    paintFuzzy: 0.5,
    paintGrainStrength: 0,
    paintGrainScale: 8,
    tiltSizeAmount: 0,
    speedFadeAmount: 0,
    tipAngleMode: "none",
    airbrushRate: 8,
    smudgeRate: 0,
    smudgeWet: 0,
    paintDualScale: 1,
    paintDualStrength: 1,
    pixelSprayDensity: 1,
    brushDither: false,
    brushColorMode: "solid",
    shadeDirection: "forward",
    blendMode: "normal",
    accumulate: true,
    symmetryMode: "off",
    wrapMode: "off",
  },
  {
    version: 1,
    name: "Chisel Marker",
    labelPt: "Marcador chanfrado",
    brushSize: 16,
    brushSizeMin: 4,
    brushShape: "square",
    brushTipKind: "pixel",
    brushHardness: 0.5,
    brushSpacing: 0.05,
    brushFlow: 1,
    pressureResponse: "size",
    pressureSizeCurve: "soft",
    pressureAlphaCurve: "linear",
    paintFuzzy: 0,
    paintGrainStrength: 0,
    paintGrainScale: 8,
    tiltSizeAmount: 0,
    speedFadeAmount: 0,
    tipAngleMode: "direction",
    airbrushRate: 0,
    smudgeRate: 0,
    smudgeWet: 0,
    paintDualScale: 1,
    paintDualStrength: 1,
    pixelSprayDensity: 1,
    brushDither: false,
    brushColorMode: "solid",
    shadeDirection: "forward",
    blendMode: "normal",
    accumulate: true,
    symmetryMode: "off",
    wrapMode: "off",
  },
  {
    version: 1,
    name: "Velocity Ink",
    labelPt: "Nanquim por velocidade",
    brushSize: 12,
    brushSizeMin: 2,
    brushShape: "circle",
    brushTipKind: "pixel",
    brushHardness: 0.5,
    brushSpacing: 0.05,
    brushFlow: 1,
    pressureResponse: "size",
    pressureSizeCurve: "firm",
    pressureAlphaCurve: "linear",
    paintFuzzy: 0,
    paintGrainStrength: 0,
    paintGrainScale: 8,
    tiltSizeAmount: 0,
    speedFadeAmount: 0.7,
    tipAngleMode: "none",
    airbrushRate: 0,
    smudgeRate: 0,
    smudgeWet: 0,
    paintDualScale: 1,
    paintDualStrength: 1,
    pixelSprayDensity: 1,
    brushDither: false,
    brushColorMode: "solid",
    shadeDirection: "forward",
    blendMode: "normal",
    accumulate: true,
    symmetryMode: "off",
    wrapMode: "off",
  },
  {
    version: 1,
    name: "Tilt Brush",
    labelPt: "Pincel de inclinação",
    brushSize: 16,
    brushSizeMin: 4,
    brushShape: "circle",
    brushTipKind: "soft",
    brushHardness: 0.5,
    brushSpacing: 0.1,
    brushFlow: 0.5,
    pressureResponse: "opacity",
    pressureSizeCurve: "linear",
    pressureAlphaCurve: "soft",
    paintFuzzy: 0,
    paintGrainStrength: 0.2,
    paintGrainScale: 8,
    tiltSizeAmount: 0.7,
    speedFadeAmount: 0,
    tipAngleMode: "none",
    airbrushRate: 0,
    smudgeRate: 0,
    smudgeWet: 0,
    paintDualScale: 1,
    paintDualStrength: 1,
    pixelSprayDensity: 1,
    brushDither: false,
    brushColorMode: "solid",
    shadeDirection: "forward",
    blendMode: "normal",
    accumulate: true,
    symmetryMode: "off",
    wrapMode: "off",
  },
];