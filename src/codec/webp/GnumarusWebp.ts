/**
 * WebP read/write through the Emscripten libwebp module built from the
 * `third_party/libwebp` submodule (`src/codec/webp/webp_shim.js` + `.wasm`).
 * Single-threaded WASM, so no special hosting headers are required.
 *
 * The module instance is created lazily from explicit WASM bytes: the shell
 * fetches the bundled `.wasm` asset, unit tests read it from disk. This
 * keeps bundler-specific URL handling out of the codec itself.
 */
import createWebpModule, { type WebpShimModule } from "./webp_shim.js";

export class GnumarusWebpError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GnumarusWebpError";
  }
}

export interface GnumarusWebpImage {
  width: number;
  height: number;
  buffer: Uint8ClampedArray;
}

export interface GnumarusWebpEncodeOptions {
  /** Mathematically lossless when true (default). */
  lossless?: boolean;
  /** Lossy quality 0..100 (higher is better); ignored when lossless. */
  quality?: number;
  /**
   * Encoder effort 1 (fastest) to 10 (smallest files), mapped onto the
   * libwebp method 0..6. Omitted (or out of range) keeps the default.
   */
  effort?: number;
}

const WEBP_MAX_DIMENSION = 16384;

export class GnumarusWebpCodec {
  private constructor(private readonly module: WebpShimModule) {}

  /**
   * When `wasmBinary` is omitted the module locates its sibling `.wasm`
   * file itself (works in Node; browsers must pass explicit bytes since
   * bundlers relocate the script).
   */
  static async create(wasmBinary?: Uint8Array): Promise<GnumarusWebpCodec> {
    const module = await createWebpModule(wasmBinary === undefined ? {} : { wasmBinary });
    return new GnumarusWebpCodec(module);
  }

  /** Decode WebP bytes to 8-bit RGBA (first frame of animated files). */
  decode(data: Uint8Array): GnumarusWebpImage {
    if (data.length === 0) {
      throw new GnumarusWebpError("cannot decode an empty WebP file");
    }
    const result = this.module.webp_decode_js(data);
    if (!result.ok || typeof result.width !== "number" || typeof result.height !== "number" || !(result.buffer instanceof Uint8Array)) {
      throw new GnumarusWebpError(`failed to decode WebP data (stage ${result.stage ?? "?"})`);
    }
    const { width, height } = result;
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > WEBP_MAX_DIMENSION || height > WEBP_MAX_DIMENSION) {
      throw new GnumarusWebpError(`decoded WebP has invalid dimensions ${width}x${height}`);
    }
    if (result.buffer.length !== width * height * 4) {
      throw new GnumarusWebpError("decoded WebP buffer size does not match dimensions");
    }
    return { width, height, buffer: new Uint8ClampedArray(result.buffer) };
  }

  /** Encode 8-bit RGBA pixels to WebP bytes. */
  encode(buffer: Uint8ClampedArray, width: number, height: number, options?: GnumarusWebpEncodeOptions): Uint8Array {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
      throw new GnumarusWebpError(`cannot encode WebP with invalid dimensions ${width}x${height}`);
    }
    if (buffer.length !== width * height * 4) {
      throw new GnumarusWebpError("pixel buffer size does not match dimensions");
    }
    const lossless = options?.lossless ?? true;
    const quality = options?.quality ?? 90;
    if (!lossless && (!Number.isFinite(quality) || quality < 0 || quality > 100)) {
      throw new GnumarusWebpError(`invalid WebP quality ${quality}`);
    }
    const bytes = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const result = this.module.webp_encode_js(bytes, width, height, lossless, quality, options?.effort ?? 0);
    if (!result.ok || !(result.data instanceof Uint8Array) || result.data.length < 1) {
      throw new GnumarusWebpError(`failed to encode WebP data (stage ${result.stage ?? "?"})`);
    }
    return new Uint8Array(result.data);
  }

  /**
   * Encode uniform RGBA frames to a single animated WebP file. Durations
   * are milliseconds; `numLoops` follows the container convention (0 loops
   * forever). Decoding reads back the first frame.
   */
  encodeAnimation(
    flat: Uint8Array,
    width: number,
    height: number,
    durationsMs: number[],
    lossless: boolean,
    quality: number,
    numLoops: number,
    options?: GnumarusWebpEncodeOptions,
  ): Uint8Array {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
      throw new GnumarusWebpError(`cannot encode WebP with invalid dimensions ${width}x${height}`);
    }
    if (durationsMs.length === 0 || flat.length !== durationsMs.length * width * height * 4) {
      throw new GnumarusWebpError("WebP animation frames must share one size");
    }
    if (!lossless && (!Number.isFinite(quality) || quality < 0 || quality > 100)) {
      throw new GnumarusWebpError(`invalid WebP quality ${quality}`);
    }
    const result = this.module.webp_encode_animation_js(flat, width, height, durationsMs, lossless, quality, numLoops, options?.effort ?? 0);
    if (!result.ok || !(result.data instanceof Uint8Array) || result.data.length < 1) {
      throw new GnumarusWebpError(`failed to encode WebP animation (stage ${result.stage ?? "?"})`);
    }
    return new Uint8Array(result.data);
  }

  /** Number of frames in a WebP file (still or animated). */
  frameCount(data: Uint8Array): number {
    if (data.length === 0) {
      throw new GnumarusWebpError("cannot inspect an empty WebP file");
    }
    const result = this.module.webp_frame_count_js(data);
    if (!result.ok || typeof result.count !== "number") {
      throw new GnumarusWebpError("failed to read WebP frame count");
    }
    return result.count;
  }
}

let cachedCodec: Promise<GnumarusWebpCodec> | null = null;

/** Shared codec instance; the module is instantiated once per session. */
export function getWebpCodec(wasmBinary?: Uint8Array): Promise<GnumarusWebpCodec> {
  if (cachedCodec === null) {
    cachedCodec = GnumarusWebpCodec.create(wasmBinary);
  }
  return cachedCodec;
}
