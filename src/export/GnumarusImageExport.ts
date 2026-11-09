/**
 * Still-image export helpers: format table, browser support probing,
 * canvas encoding and file naming. Animated formats (GIF) live in
 * GnumarusGifExport.ts; spritesheet geometry in GnumarusSpritesheet.ts.
 * Encoding needs a DOM canvas, so this module is covered by end-to-end
 * tests; everything pure here has unit tests.
 */

export interface GnumarusStillFormat {
  mime: string;
  ext: string;
  label: string;
  /** False for formats without alpha (pixels flatten onto a background). */
  alpha: boolean;
}

/** Always offered; every Chromium encodes all three. */
export const GNUMARUS_BASE_STILL_FORMATS: GnumarusStillFormat[] = [
  { mime: "image/png", ext: "png", label: "PNG", alpha: true },
  { mime: "image/jpeg", ext: "jpg", label: "JPEG", alpha: false },
  { mime: "image/webp", ext: "webp", label: "WebP", alpha: true },
];

/** Probed on top of the base list; support varies by browser and build. */
export const GNUMARUS_EXTRA_STILL_FORMATS: GnumarusStillFormat[] = [
  { mime: "image/avif", ext: "avif", label: "AVIF", alpha: true },
  { mime: "image/heic", ext: "heic", label: "HEIC", alpha: true },
  { mime: "image/heif", ext: "heif", label: "HEIF", alpha: true },
  { mime: "image/jxl", ext: "jxl", label: "JPEG XL", alpha: true },
];

let detectedFormats: GnumarusStillFormat[] | null = null;

/**
 * True when a `toDataURL(mime)` result proves the browser really encodes
 * `mime`. Chromium silently falls back to a PNG data URL for unknown mimes
 * (only Firefox returns `"data:,"`), so anything but an exact
 * `data:<mime>` prefix means "unsupported".
 */
export function isSupportedStillDataUrl(dataUrl: string, mime: string): boolean {
  return dataUrl.toLowerCase().startsWith(`data:${mime}`);
}

/**
 * Base formats plus any extra format this browser actually encodes
 * (probed once via a 1x1 canvas; result cached).
 */
export function detectStillFormats(): GnumarusStillFormat[] {
  if (detectedFormats !== null) {
    return detectedFormats;
  }
  const formats = [...GNUMARUS_BASE_STILL_FORMATS];
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    for (const format of GNUMARUS_EXTRA_STILL_FORMATS) {
      try {
        if (isSupportedStillDataUrl(canvas.toDataURL(format.mime), format.mime)) {
          formats.push(format);
        }
      } catch {
        // Unsupported mime: skip it.
      }
    }
  } catch {
    // No DOM canvas at all: base formats only.
  }
  detectedFormats = formats;
  return detectedFormats;
}

/** Find a supported format by mime, or null. */
export function findStillFormat(formats: GnumarusStillFormat[], mime: string): GnumarusStillFormat | null {
  return formats.find((format) => format.mime === mime) ?? null;
}

/**
 * Encode an RGBA buffer through a canvas. Null when the browser refuses
 * the mime type. The optional quality is a 0-1 fraction for lossy formats
 * (omitted or non-finite means the browser default).
 */
export function encodeStillImage(
  buffer: Uint8ClampedArray,
  width: number,
  height: number,
  mime: string,
  quality?: number,
): Promise<Blob | null> {
  const w = Math.max(1, Math.floor(width));
  const h = Math.max(1, Math.floor(height));
  if (buffer.length !== w * h * 4) {
    return Promise.resolve(null);
  }
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const context = canvas.getContext("2d");
  if (context === null) {
    return Promise.resolve(null);
  }
  context.putImageData(new ImageData(new Uint8ClampedArray(buffer), w, h), 0, 0);
  const lossyQuality =
    typeof quality === "number" && Number.isFinite(quality)
      ? Math.min(1, Math.max(0, quality))
      : undefined;
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => {
        // Browsers silently fall back to PNG for unsupported mimes, so a
        // mislabeled blob must be refused instead of saved as a fake .avif.
        if (blob !== null && blob.type !== "" && blob.type !== mime) {
          resolve(null);
          return;
        }
        resolve(blob);
      }, mime, lossyQuality);
    } catch {
      resolve(null);
    }
  });
}

/** Zero-padded frame file stem, e.g. `walk-007`. */
export function frameFileStem(base: string, index: number): string {
  return `${base}-${String(index + 1).padStart(3, "0")}`;
}

/** Default still-image quality (percent): matches the browser default. */
export const GNUMARUS_DEFAULT_STILL_QUALITY = 92;

/**
 * Normalize a 1-100 quality percent to an integer, falling back to the
 * default for missing or non-finite input.
 */
export function normalizeStillQualityPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return GNUMARUS_DEFAULT_STILL_QUALITY;
  }
  return Math.min(100, Math.max(1, Math.round(value)));
}

/** File-safe project base name (falls back to "export"). */
export function exportBaseName(projectName: string): string {
  const trimmed = projectName.trim();
  return trimmed === "" ? "export" : trimmed;
}
