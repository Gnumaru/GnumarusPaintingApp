/**
 * Type declarations for the Emscripten embind build of
 * `third_party/webp-shim/webp_shim.cc` (libwebp decode/encode bridge).
 */
export interface WebpBridgeResult {
  readonly ok: boolean;
  readonly stage?: number;
  readonly width?: number;
  readonly height?: number;
  readonly buffer?: Uint8Array;
  readonly data?: Uint8Array;
}

export interface WebpShimModule {
  webp_decode_js(data: Uint8Array): WebpBridgeResult;
  webp_encode_js(pixels: Uint8Array, w: number, h: number, lossless: boolean, quality: number, effort: number): WebpBridgeResult;
  webp_encode_animation_js(
    pixels: Uint8Array,
    w: number,
    h: number,
    durationsMs: number[],
    lossless: boolean,
    quality: number,
    numLoops: number,
    effort: number,
  ): WebpBridgeResult;
  webp_frame_count_js(data: Uint8Array): { ok: boolean; count?: number };
}

declare const createWebpModule: (overrides?: { wasmBinary?: Uint8Array }) => Promise<WebpShimModule>;
export default createWebpModule;
