/**
 * Type declarations for the Emscripten embind build of
 * `third_party/jxl-shim/jxl_shim.cc` (libjxl decode/encode bridge).
 */
export interface JxlBridgeResult {
  readonly ok: boolean;
  readonly stage?: number;
  readonly width?: number;
  readonly height?: number;
  readonly buffer?: Uint8Array;
  readonly data?: Uint8Array;
}

export interface JxlShimModule {
  jxl_decode_js(data: Uint8Array): JxlBridgeResult;
  jxl_encode_js(pixels: Uint8Array, w: number, h: number, lossless: boolean, quality: number): JxlBridgeResult;
  jxl_encode_animation_js(
    pixels: Uint8Array,
    w: number,
    h: number,
    durationsMs: number[],
    lossless: boolean,
    quality: number,
    numLoops: number,
  ): JxlBridgeResult;
  jxl_frame_count_js(data: Uint8Array): { ok: boolean; count?: number };
}

declare const createJxlModule: (overrides?: { wasmBinary?: Uint8Array }) => Promise<JxlShimModule>;
export default createJxlModule;
