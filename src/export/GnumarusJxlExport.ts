/**
 * JPEG XL export through the Emscripten libjxl module built from the
 * `third_party/libjxl` submodule (`jxl_shim.js` + `jxl_shim.wasm`).
 * Browsers cannot encode JXL through a canvas, so still frames,
 * spritesheets and single-file animations all go through this codec.
 * Unit tests cover the pure quality mapping; encoding itself is covered
 * by round-trip unit tests of the codec plus end-to-end export tests.
 */
import { getJxlCodec, type GnumarusJxlCodec } from "../codec/jxl/GnumarusJxl";
import wasmUrl from "../codec/jxl/jxl_shim.wasm?url";

export const JXL_MIME = "image/jxl";
export const JXL_EXT = "jxl";
export const JXL_LABEL = "JPEG XL";

let wasmBinary: Uint8Array | null = null;
let codecPromise: Promise<GnumarusJxlCodec> | null = null;

/** Fetch (once) the WASM bytes the Emscripten module instantiates from. */
async function loadJxlWasm(): Promise<Uint8Array> {
  if (wasmBinary === null) {
    const response = await fetch(wasmUrl);
    if (!response.ok) {
      throw new Error(`could not load the JXL codec (${response.status})`);
    }
    wasmBinary = new Uint8Array(await response.arrayBuffer());
  }
  return wasmBinary;
}

function getCodec(): Promise<GnumarusJxlCodec> {
  if (codecPromise === null) {
    codecPromise = loadJxlWasm().then((bytes) => getJxlCodec(bytes));
  }
  return codecPromise;
}

export interface GnumarusJxlQuality {
  /** Mathematically lossless when true (default). */
  lossless?: boolean;
  /** Lossy quality 0..100 (higher is better); ignored when lossless. */
  quality?: number;
}

/**
 * Encode RGBA pixels to a JXL file blob. Lossless by default; lossy maps
 * the 1-100 percent scale onto the codec distance.
 */
export async function encodeJxlStill(
  buffer: Uint8ClampedArray,
  width: number,
  height: number,
  options?: GnumarusJxlQuality,
): Promise<Uint8Array> {
  const lossless = options?.lossless ?? true;
  const quality = options?.quality ?? 90;
  const codec = await getCodec();
  return codec.encode(buffer, width, height, { lossless, quality });
}

export interface GnumarusJxlAnimationFrame {
  buffer: Uint8ClampedArray;
  delayMs: number;
}

/**
 * Encode uniform RGBA frames to a single animated JXL file. Durations are
 * milliseconds (rounded up to at least 1); loop repeats forever.
 */
export async function encodeJxlAnimation(
  frames: GnumarusJxlAnimationFrame[],
  width: number,
  height: number,
  loop: boolean,
  options?: GnumarusJxlQuality,
): Promise<Uint8Array> {
  if (frames.length === 0) {
    throw new Error("cannot encode a JXL animation without frames");
  }
  const lossless = options?.lossless ?? true;
  const quality = options?.quality ?? 90;
  const flat = new Uint8Array(frames.length * width * height * 4);
  const durations: number[] = [];
  for (let i = 0; i < frames.length; i += 1) {
    const frame = frames[i];
    if (frame === undefined || frame.buffer.length !== width * height * 4) {
      throw new Error("JXL animation frames must share one size");
    }
    flat.set(frame.buffer, i * width * height * 4);
    durations.push(Math.max(1, Math.round(frame.delayMs)));
  }
  const codec = await getCodec();
  const result = codec.encodeAnimation(flat, width, height, durations, lossless, quality, loop ? 0 : 1);
  return result;
}
