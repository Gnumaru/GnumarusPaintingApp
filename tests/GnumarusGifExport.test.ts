import { describe, expect, it } from "vitest";
import {
  createGifEncoder,
  encodeGif,
  gifTransparentIndex,
} from "../src/export/GnumarusGifExport";

function solidFrame(width: number, height: number, r: number, g: number, b: number, a: number): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    pixels[i * 4] = r;
    pixels[i * 4 + 1] = g;
    pixels[i * 4 + 2] = b;
    pixels[i * 4 + 3] = a;
  }
  return pixels;
}

interface ParsedGif {
  header: string;
  width: number;
  height: number;
  hasNetscape: boolean;
  trailer: boolean;
  frames: Array<{ delayHundredths: number; transparent: boolean; dispose: number }>;
  imageDescriptors: number;
}

/** Minimal GIF parser: headers, GCE blocks, NETSCAPE extension, trailer. */
function parseGif(bytes: Uint8Array): ParsedGif {
  const text = new TextDecoder("ascii");
  const header = text.decode(bytes.slice(0, 6));
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint16(6, true);
  const height = view.getUint16(8, true);
  const frames: ParsedGif["frames"] = [];
  let imageDescriptors = 0;
  let hasNetscape = false;
  let pending: { delayHundredths: number; transparent: boolean; dispose: number } | null = null;
  let i = 13;
  // Skip the global color table.
  const packed = bytes[10] ?? 0;
  if ((packed & 0x80) !== 0) {
    i += 3 * 2 ** ((packed & 0x07) + 1);
  }
  while (i < bytes.length) {
    const marker = bytes[i];
    if (marker === 0x3b) {
      break;
    }
    if (marker === 0x21) {
      const label = bytes[i + 1];
      if (label === 0xf9) {
        const packedFields = bytes[i + 3] ?? 0;
        pending = {
          delayHundredths: view.getUint16(i + 4, true),
          transparent: (packedFields & 0x01) !== 0,
          dispose: (packedFields >> 2) & 0x07,
        };
        i += 8;
        continue;
      }
      // Other extension: skip sub-blocks.
      i += 2;
      for (;;) {
        const size = bytes[i] ?? 0;
        i += 1;
        if (size === 0) {
          break;
        }
        if (text.decode(bytes.slice(i, i + Math.min(size, 12))) === "NETSCAPE2.0") {
          hasNetscape = true;
        }
        i += size;
      }
      continue;
    }
    if (marker === 0x2c) {
      imageDescriptors += 1;
      frames.push(pending ?? { delayHundredths: 0, transparent: false, dispose: 0 });
      pending = null;
      // Descriptor (10 bytes incl. separator), optional local color table,
      // then LZW min code size + data sub-blocks.
      const imagePacked = bytes[i + 9] ?? 0;
      i += 10;
      if ((imagePacked & 0x80) !== 0) {
        i += 3 * 2 ** ((imagePacked & 0x07) + 1);
      }
      i += 1;
      for (;;) {
        const size = bytes[i] ?? 0;
        i += 1;
        if (size === 0) {
          break;
        }
        i += size;
      }
      continue;
    }
    throw new Error(`Unexpected GIF byte ${marker} at offset ${i}`);
  }
  return {
    header,
    width,
    height,
    hasNetscape,
    trailer: bytes[bytes.length - 1] === 0x3b,
    frames,
    imageDescriptors,
  };
}

describe("GnumarusGifExport", () => {
  it("finds the transparent palette entry", () => {
    expect(gifTransparentIndex([[255, 0, 0, 255], [0, 0, 0, 0]])).toBe(1);
    expect(gifTransparentIndex([[255, 0, 0, 255]])).toBe(-1);
    expect(gifTransparentIndex([])).toBe(-1);
  });

  it("encodes opaque frames with exact dimensions and delays", () => {
    const bytes = encodeGif(
      4,
      3,
      [
        { pixels: solidFrame(4, 3, 255, 0, 0, 255), delayMs: 100 },
        { pixels: solidFrame(4, 3, 0, 0, 255, 255), delayMs: 250 },
      ],
      true,
    );
    const parsed = parseGif(bytes);
    expect(parsed.header).toBe("GIF89a");
    expect(parsed.width).toBe(4);
    expect(parsed.height).toBe(3);
    expect(parsed.trailer).toBe(true);
    expect(parsed.hasNetscape).toBe(true);
    expect(parsed.imageDescriptors).toBe(2);
    expect(parsed.frames.map((frame) => frame.delayHundredths)).toEqual([10, 25]);
    expect(parsed.frames.every((frame) => !frame.transparent)).toBe(true);
    expect(parsed.frames.map((frame) => frame.dispose)).toEqual([1, 1]);
  });

  it("omits the NETSCAPE extension when playing once", () => {
    const bytes = encodeGif(2, 2, [{ pixels: solidFrame(2, 2, 0, 255, 0, 255), delayMs: 50 }], false);
    const parsed = parseGif(bytes);
    expect(parsed.hasNetscape).toBe(false);
    expect(parsed.imageDescriptors).toBe(1);
  });

  it("flags transparency with disposal 2 on frames with clear pixels", () => {
    const pixels = solidFrame(2, 2, 255, 0, 0, 255);
    pixels[3] = 0;
    const bytes = encodeGif(2, 2, [{ pixels, delayMs: 100 }], true);
    const parsed = parseGif(bytes);
    expect(parsed.frames).toHaveLength(1);
    expect(parsed.frames[0]?.transparent).toBe(true);
    expect(parsed.frames[0]?.dispose).toBe(2);
  });

  it("streams incrementally with the same bytes as one-shot encoding", () => {
    const frames = [
      { pixels: solidFrame(3, 1, 255, 0, 0, 255), delayMs: 100 },
      { pixels: solidFrame(3, 1, 0, 255, 0, 255), delayMs: 200 },
    ];
    const oneShot = encodeGif(3, 1, frames, true);
    const encoder = createGifEncoder(3, 1, true);
    for (const frame of frames) {
      encoder.addFrame(frame.pixels, frame.delayMs);
    }
    expect(Array.from(encoder.finish())).toEqual(Array.from(oneShot));
  });

  it("rejects bad dimensions, bad buffers and empty animations", () => {
    expect(() => encodeGif(0, 4, [{ pixels: solidFrame(1, 4, 0, 0, 0, 255), delayMs: 0 }], true)).toThrow(
      /dimensions/,
    );
    expect(() => encodeGif(70000, 4, [{ pixels: solidFrame(1, 1, 0, 0, 0, 255), delayMs: 0 }], true)).toThrow(
      /dimensions/,
    );
    expect(() => encodeGif(2, 2, [{ pixels: solidFrame(2, 2, 0, 0, 0, 255).slice(0, 8), delayMs: 0 }], true)).toThrow(
      /Invalid GIF frame/,
    );
    expect(() => encodeGif(2, 2, [], true)).toThrow(/zero frames/);
  });
});
