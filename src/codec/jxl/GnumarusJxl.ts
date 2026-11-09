/**
 * JPEG XL read/write through the Emscripten libjxl module built from the
 * `third_party/libjxl` submodule (`src/codec/jxl/jxl_shim.js` + `.wasm`).
 * Single-threaded WASM, so no special hosting headers are required.
 *
 * The module instance is created lazily from explicit WASM bytes: the shell
 * fetches the bundled `.wasm` asset, unit tests read it from disk. This
 * keeps bundler-specific URL handling out of the codec itself.
 */
import createJxlModule, { type JxlShimModule } from "./jxl_shim.js";

export class GnumarusJxlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GnumarusJxlError";
  }
}

export interface GnumarusJxlImage {
  width: number;
  height: number;
  buffer: Uint8ClampedArray;
}

export interface GnumarusJxlEncodeOptions {
  /** Mathematically lossless when true (default). */
  lossless?: boolean;
  /** Lossy quality 0..100 (higher is better); ignored when lossless. */
  quality?: number;
}

const JXL_MAX_DIMENSION = 65536;

export class GnumarusJxlCodec {
  private constructor(private readonly module: JxlShimModule) {}

  /**
   * When `wasmBinary` is omitted the module locates its sibling `.wasm`
   * file itself (works in Node; browsers must pass explicit bytes since
   * bundlers relocate the script).
   */
  static async create(wasmBinary?: Uint8Array): Promise<GnumarusJxlCodec> {
    const module = await createJxlModule(wasmBinary === undefined ? {} : { wasmBinary });
    return new GnumarusJxlCodec(module);
  }

  /** Decode JXL bytes to 8-bit RGBA (first frame of animated files). */
  decode(data: Uint8Array): GnumarusJxlImage {
    if (data.length === 0) {
      throw new GnumarusJxlError("cannot decode an empty JXL file");
    }
    const result = this.module.jxl_decode_js(data);
    if (!result.ok || typeof result.width !== "number" || typeof result.height !== "number" || !(result.buffer instanceof Uint8Array)) {
      throw new GnumarusJxlError(`failed to decode JXL data (stage ${result.stage ?? "?"})`);
    }
    const { width, height } = result;
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > JXL_MAX_DIMENSION || height > JXL_MAX_DIMENSION) {
      throw new GnumarusJxlError(`decoded JXL has invalid dimensions ${width}x${height}`);
    }
    if (result.buffer.length !== width * height * 4) {
      throw new GnumarusJxlError("decoded JXL buffer size does not match dimensions");
    }
    return { width, height, buffer: new Uint8ClampedArray(result.buffer) };
  }

  /** Encode 8-bit RGBA pixels to JXL bytes. */
  encode(buffer: Uint8ClampedArray, width: number, height: number, options?: GnumarusJxlEncodeOptions): Uint8Array {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
      throw new GnumarusJxlError(`cannot encode JXL with invalid dimensions ${width}x${height}`);
    }
    if (buffer.length !== width * height * 4) {
      throw new GnumarusJxlError("pixel buffer size does not match dimensions");
    }
    const lossless = options?.lossless ?? true;
    const quality = options?.quality ?? 90;
    if (!lossless && (!Number.isFinite(quality) || quality < 0 || quality > 100)) {
      throw new GnumarusJxlError(`invalid JXL quality ${quality}`);
    }
    const bytes = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const result = this.module.jxl_encode_js(bytes, width, height, lossless, quality);
    if (!result.ok || !(result.data instanceof Uint8Array) || result.data.length < 1) {
      throw new GnumarusJxlError(`failed to encode JXL data (stage ${result.stage ?? "?"})`);
    }
    return new Uint8Array(result.data);
  }
}

let cachedCodec: Promise<GnumarusJxlCodec> | null = null;

/** Shared codec instance; the module is instantiated once per session. */
export function getJxlCodec(wasmBinary?: Uint8Array): Promise<GnumarusJxlCodec> {
  if (cachedCodec === null) {
    cachedCodec = GnumarusJxlCodec.create(wasmBinary);
  }
  return cachedCodec;
}
