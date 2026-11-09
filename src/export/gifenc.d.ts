/**
 * Minimal typed surface of the `gifenc` package (MIT) used for animated
 * GIF export. Kept local on purpose so no extra `@types/*` dependency is
 * needed (same pattern as `src/three.d.ts`).
 */
declare module "gifenc" {
  export type GifPalette = number[][];
  export interface GifQuantizeOptions {
    format?: "rgb565" | "rgb444" | "rgba4444";
    oneBitAlpha?: boolean | number;
    clearAlpha?: boolean;
    clearAlphaThreshold?: number;
    clearAlphaColor?: number;
    useSqrt?: boolean;
  }
  export interface GifWriteFrameOptions {
    palette?: GifPalette;
    first?: boolean;
    transparent?: boolean;
    transparentIndex?: number;
    delay?: number;
    repeat?: number;
    dispose?: number;
    colorDepth?: number;
  }
  export interface GifEncoder {
    writeFrame(index: Uint8Array, width: number, height: number, options?: GifWriteFrameOptions): void;
    finish(): void;
    bytes(): Uint8Array;
    bytesView(): Uint8Array;
    reset(): void;
  }
  export function quantize(
    rgba: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    options?: GifQuantizeOptions,
  ): GifPalette;
  export function applyPalette(
    rgba: Uint8Array | Uint8ClampedArray,
    palette: GifPalette,
    format?: "rgb565" | "rgb444" | "rgba4444",
  ): Uint8Array;
  export function GIFEncoder(options?: { auto?: boolean; initialCapacity?: number }): GifEncoder;
}
