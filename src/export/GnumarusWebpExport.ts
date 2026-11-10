/**
 * WebP export through the Emscripten libwebp module built from the
 * `third_party/libwebp` submodule (`webp_shim.js` + `webp_shim.wasm`).
 * Browsers encode still WebP through a canvas but without a lossless
 * option, and cannot encode animated WebP at all, so single frames,
 * spritesheets and single-file animations all go through this codec.
 * Unit tests cover the pure quality mapping; encoding itself is covered
 * by round-trip unit tests of the codec plus end-to-end export tests.
 */
import { getWebpCodec, type GnumarusWebpCodec } from "../codec/webp/GnumarusWebp";
import wasmUrl from "../codec/webp/webp_shim.wasm?url";

export const WEBP_MIME = "image/webp";
export const WEBP_EXT = "webp";
export const WEBP_LABEL = "WebP";

let wasmBinary: Uint8Array | null = null;
let codecPromise: Promise<GnumarusWebpCodec> | null = null;

/** Fetch (once) the WASM bytes the Emscripten module instantiates from. */
async function loadWebpWasm(): Promise<Uint8Array> {
  if (wasmBinary === null) {
    const response = await fetch(wasmUrl);
    if (!response.ok) {
      throw new Error(`could not load the WebP codec (${response.status})`);
    }
    wasmBinary = new Uint8Array(await response.arrayBuffer());
  }
  return wasmBinary;
}

function getCodec(): Promise<GnumarusWebpCodec> {
  if (codecPromise === null) {
    codecPromise = loadWebpWasm().then((bytes) => getWebpCodec(bytes));
  }
  return codecPromise;
}

export interface GnumarusWebpQuality {
  /** Mathematically lossless when true (default). */
  lossless?: boolean;
  /** Lossy quality 0..100 (higher is better); ignored when lossless. */
  quality?: number;
  /**
   * Encoder effort 1 (fastest) to 10 (slowest, smallest files), mapped
   * onto the libwebp method. Omitted keeps the default.
   */
  effort?: number;
}

/** Project texture storage always encodes as fast as possible. */
export const WEBP_STORAGE_EFFORT = 1;

/**
 * Encode RGBA pixels to a WebP file blob. Lossless by default; lossy maps
 * the 1-100 percent scale directly onto the libwebp quality.
 */
export async function encodeWebpStill(
  buffer: Uint8ClampedArray,
  width: number,
  height: number,
  options?: GnumarusWebpQuality,
): Promise<Uint8Array> {
  const lossless = options?.lossless ?? true;
  const quality = options?.quality ?? 90;
  const codec = await getCodec();
  return codec.encode(buffer, width, height, { lossless, quality, effort: options?.effort });
}

export interface GnumarusWebpAnimationFrame {
  buffer: Uint8ClampedArray;
  delayMs: number;
}

/**
 * Encode uniform RGBA frames to a single animated WebP file. Durations are
 * milliseconds (rounded up to at least 1); loop repeats forever.
 */
export async function decodeWebpBytes(data: Uint8Array): Promise<{
  width: number;
  height: number;
  buffer: Uint8ClampedArray;
}> {
  const codec = await getCodec();
  const decoded = codec.decode(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
  return decoded;
}

export async function encodeWebpAnimation(
  frames: GnumarusWebpAnimationFrame[],
  width: number,
  height: number,
  loop: boolean,
  options?: GnumarusWebpQuality,
): Promise<Uint8Array> {
  if (frames.length === 0) {
    throw new Error("cannot encode a WebP animation without frames");
  }
  const lossless = options?.lossless ?? true;
  const quality = options?.quality ?? 90;
  const flat = new Uint8Array(frames.length * width * height * 4);
  const durations: number[] = [];
  for (let i = 0; i < frames.length; i += 1) {
    const frame = frames[i];
    if (frame === undefined || frame.buffer.length !== width * height * 4) {
      throw new Error("WebP animation frames must share one size");
    }
    flat.set(frame.buffer, i * width * height * 4);
    durations.push(Math.max(1, Math.round(frame.delayMs)));
  }
  const codec = await getCodec();
  const result = codec.encodeAnimation(flat, width, height, durations, lossless, quality, loop ? 0 : 1, {
    effort: options?.effort,
  });
  return result;
}
