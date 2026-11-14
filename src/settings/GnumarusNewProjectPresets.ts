/**
 * New-project dialog presets: named canvas size + texture storage bundles
 * applied to the dialog fields when selected. The storage subset mirrors
 * the project texture storage settings (format/mode/lossy quality); PNG
 * is always lossless.
 */
import {
  clampStorageQuality,
  parseStorageFormat,
  type GnumarusStorageFormat,
} from "./GnumarusStorageSettings";

export interface GnumarusNewProjectPreset {
  /** Display name in the preset dropdown. */
  name: string;
  width: number;
  height: number;
  format: GnumarusStorageFormat;
  lossless: boolean;
  /** Lossy quality 0..100; only meaningful when lossless is false. */
  quality: number;
}

export const GNUMARUS_NEW_PROJECT_PRESETS: GnumarusNewProjectPreset[] = [
  { name: "pixel landscape", width: 400, height: 224, format: "webp", lossless: true, quality: 50 },
  { name: "pixel sprite small", width: 16, height: 16, format: "webp", lossless: true, quality: 50 },
  { name: "pixel sprite medium", width: 48, height: 48, format: "webp", lossless: true, quality: 50 },
  { name: "pixel sprite large", width: 128, height: 128, format: "webp", lossless: true, quality: 50 },
  { name: "Notes XLQ", width: 1920, height: 1080, format: "jxl", lossless: false, quality: 0 },
  { name: "Sketches MQ", width: 1920, height: 1080, format: "jxl", lossless: false, quality: 34 },
  { name: "Sketches HQ", width: 1920, height: 1080, format: "jxl", lossless: false, quality: 75 },
  { name: "digital painting lossless", width: 1920, height: 1080, format: "jxl", lossless: true, quality: 50 },
  { name: "digital painting lossy", width: 1920, height: 1080, format: "jxl", lossless: false, quality: 95 },
];

/** Display name of the preset selected by default in the new-project dialog. */
export const DEFAULT_NEW_PROJECT_PRESET = "digital painting lossless";

/** Dialog field values produced by applying a preset (or null when unknown). */
export interface GnumarusNewProjectFields {
  width: number;
  height: number;
  format: GnumarusStorageFormat;
  lossless: boolean;
  quality: number;
}

/** Look up a preset by name, normalizing its storage values. */
export function applyNewProjectPreset(name: string): GnumarusNewProjectFields | null {
  const preset = GNUMARUS_NEW_PROJECT_PRESETS.find((entry) => entry.name === name);
  if (preset === undefined) {
    return null;
  }
  const format = parseStorageFormat(preset.format);
  const lossless = format === "png" ? true : preset.lossless;
  return {
    width: Math.min(16384, Math.max(1, Math.floor(preset.width))),
    height: Math.min(16384, Math.max(1, Math.floor(preset.height))),
    format,
    lossless,
    quality: clampStorageQuality(preset.quality),
  };
}
