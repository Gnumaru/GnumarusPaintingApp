/**
 * Animated GIF export on top of the `gifenc` package (MIT, approved
 * dependency). Browsers expose no animated-image encoder through canvas,
 * so GIF is the single-file animated format; multi-file image sequences
 * are handled by the shell with `encodeStillImage`.
 *
 * Encoding choices:
 * - One local 256-color palette per frame (`rgba4444` + one-bit alpha),
 *   so each frame keeps its own best colors and transparency.
 * - Frames with a fully transparent palette entry are flagged with that
 *   transparent index and disposal 2 (restore to background); opaque
 *   frames use disposal 1 (do not dispose). Every frame covers the full
 *   canvas, composited with no background (transparent) by the caller.
 * - `loop === true` writes the NETSCAPE extension with repeat 0 (play
 *   forever); `loop === false` passes repeat -1 so the extension is
 *   omitted (play once).
 * - Delays are milliseconds, stored by gifenc as hundredths of a second.
 */

import { applyPalette, GIFEncoder, quantize } from "gifenc";

/** Maximum GIF dimension: widths/heights are 16-bit WORDs. */
export const GNUMARUS_GIF_MAX_DIMENSION = 65535;

/** Maximum colors per frame (GIF local palette limit). */
export const GNUMARUS_GIF_MAX_COLORS = 256;

export interface GnumarusGifFrame {
  /** Exact `width * height * 4` RGBA bytes. */
  pixels: Uint8ClampedArray;
  /** Frame delay in milliseconds (negative values clamp to 0). */
  delayMs: number;
}

export interface GnumarusGifEncoder {
  addFrame(pixels: Uint8ClampedArray, delayMs: number): void;
  finish(): Uint8Array;
}

/**
 * Palette entry index whose alpha is 0, or -1 when the frame is opaque.
 * Exported for unit tests (the encoder output is only bytes).
 */
export function gifTransparentIndex(palette: number[][]): number {
  for (let index = 0; index < palette.length; index += 1) {
    if (palette[index]?.[3] === 0) {
      return index;
    }
  }
  return -1;
}

/** Copy RGBA bytes into a Uint8Array with an exact backing store. */
function exactRgbaBytes(pixels: Uint8ClampedArray): Uint8Array {
  if (pixels.byteOffset === 0 && pixels.buffer.byteLength === pixels.byteLength) {
    return new Uint8Array(pixels.buffer, pixels.byteOffset, pixels.byteLength);
  }
  return new Uint8Array(pixels);
}

function checkDimensions(width: number, height: number): void {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > GNUMARUS_GIF_MAX_DIMENSION ||
    height > GNUMARUS_GIF_MAX_DIMENSION
  ) {
    throw new Error(`Invalid GIF dimensions ${width}x${height}: must be 1..${GNUMARUS_GIF_MAX_DIMENSION}.`);
  }
}

/**
 * Streaming GIF encoder. Holds only the output bytes plus one indexed
 * frame at a time, so long animations stay RAM-conservative.
 */
export function createGifEncoder(width: number, height: number, loop: boolean): GnumarusGifEncoder {
  checkDimensions(width, height);
  const gif = GIFEncoder();
  let frames = 0;
  return {
    addFrame(pixels: Uint8ClampedArray, delayMs: number): void {
      if (pixels.length !== width * height * 4) {
        throw new Error(
          `Invalid GIF frame ${pixels.length} bytes: expected ${width * height * 4} for ${width}x${height}.`,
        );
      }
      const rgba = exactRgbaBytes(pixels);
      const palette = quantize(rgba, GNUMARUS_GIF_MAX_COLORS, {
        format: "rgba4444",
        oneBitAlpha: true,
      });
      const transparentIndex = gifTransparentIndex(palette);
      const transparent = transparentIndex >= 0;
      const index = applyPalette(rgba, palette, "rgba4444");
      const rgbPalette = palette.map((entry) => [entry[0] ?? 0, entry[1] ?? 0, entry[2] ?? 0]);
      gif.writeFrame(index, width, height, {
        palette: rgbPalette,
        delay: Math.max(0, Math.round(delayMs)),
        repeat: frames === 0 ? (loop ? 0 : -1) : 0,
        transparent,
        transparentIndex: transparent ? transparentIndex : 0,
        dispose: transparent ? 2 : 1,
      });
      frames += 1;
    },
    finish(): Uint8Array {
      if (frames === 0) {
        throw new Error("Cannot encode a GIF with zero frames.");
      }
      gif.finish();
      return gif.bytes();
    },
  };
}

/** Convenience one-shot encoder (builds on the streaming encoder). */
export function encodeGif(
  width: number,
  height: number,
  frames: GnumarusGifFrame[],
  loop: boolean,
): Uint8Array {
  const encoder = createGifEncoder(width, height, loop);
  for (const frame of frames) {
    encoder.addFrame(frame.pixels, frame.delayMs);
  }
  return encoder.finish();
}
