/**
 * New-project dialog presets: named canvas size + texture storage bundles
 * applied to the dialog fields when selected. The storage subset mirrors
 * the project texture storage settings (format/mode/lossy quality); PNG
 * is always lossless.
 */
import {
  GNUMARUS_DEFAULT_FRAME_DURATION_SEC,
  clampFrameDurationSec,
} from "../animation/GnumarusAnimationModel";
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
  /** Animation frames per second (the dialog derives frametime as 1/fps). */
  fps: number;
}

export const GNUMARUS_NEW_PROJECT_PRESETS: GnumarusNewProjectPreset[] = [
  { name: "pixel landscape", width: 400, height: 224, format: "webp", lossless: true, quality: 50, fps: 4 },
  { name: "pixel sprite small", width: 16, height: 16, format: "webp", lossless: true, quality: 50, fps: 4 },
  { name: "pixel sprite medium", width: 48, height: 48, format: "webp", lossless: true, quality: 50, fps: 4 },
  { name: "pixel sprite large", width: 128, height: 128, format: "webp", lossless: true, quality: 50, fps: 4 },
  { name: "Notes XLQ", width: 1920, height: 1080, format: "jxl", lossless: false, quality: 0, fps: 12 },
  { name: "Sketches MQ", width: 1920, height: 1080, format: "jxl", lossless: false, quality: 34, fps: 12 },
  { name: "Sketches HQ", width: 1920, height: 1080, format: "jxl", lossless: false, quality: 75, fps: 12 },
  { name: "digital painting lossless", width: 1920, height: 1080, format: "jxl", lossless: true, quality: 50, fps: 12 },
  { name: "digital painting lossy", width: 1920, height: 1080, format: "jxl", lossless: false, quality: 95, fps: 12 },
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
  fps: number;
}

/** Fallback animation rate for the dialog when no preset applies. */
export const GNUMARUS_NEW_PROJECT_DEFAULT_FPS = 12;

/**
 * Frametime in seconds for an fps rate, clamped to the project duration
 * range and rounded to 9 decimals for stable display (1/12 = 0.083333333).
 */
export function fpsToFrametimeSec(fps: number): number {
  if (!Number.isFinite(fps) || fps <= 0) {
    return GNUMARUS_DEFAULT_FRAME_DURATION_SEC;
  }
  return Math.round(clampFrameDurationSec(1 / fps) * 1e9) / 1e9;
}

/**
 * Frames per second for a frametime in seconds, clamped to the project
 * duration range and rounded to 6 decimals so linked fields don't drift
 * (typing the displayed frametime back yields the same fps).
 */
export function frametimeSecToFps(frametimeSec: number): number {
  if (!Number.isFinite(frametimeSec) || frametimeSec <= 0) {
    return GNUMARUS_NEW_PROJECT_DEFAULT_FPS;
  }
  const clamped = clampFrameDurationSec(frametimeSec);
  return Math.round((1 / clamped) * 1e6) / 1e6;
}

/** True while the raw input looks like an unfinished decimal (e.g. "0."). */
export function isPartialDecimal(raw: string): boolean {
  const text = raw.trim();
  return text === "" || text.endsWith(".") || text.endsWith("e") || text.endsWith("E");
}

/** Look up a preset by name, normalizing its storage values. */
export function applyNewProjectPreset(name: string): GnumarusNewProjectFields | null {
  const preset = GNUMARUS_NEW_PROJECT_PRESETS.find((entry) => entry.name === name);
  if (preset === undefined) {
    return null;
  }
  const format = parseStorageFormat(preset.format);
  const lossless = format === "png" ? true : preset.lossless;
  const fps = Number.isFinite(preset.fps) && preset.fps > 0 ? preset.fps : GNUMARUS_NEW_PROJECT_DEFAULT_FPS;
  return {
    width: Math.min(16384, Math.max(1, Math.floor(preset.width))),
    height: Math.min(16384, Math.max(1, Math.floor(preset.height))),
    format,
    lossless,
    quality: clampStorageQuality(preset.quality),
    fps,
  };
}
