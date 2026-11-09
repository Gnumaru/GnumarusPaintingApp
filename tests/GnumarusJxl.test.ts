import { describe, expect, it } from "vitest";
import { GnumarusJxlCodec, GnumarusJxlError } from "../src/codec/jxl/GnumarusJxl";

function gradient(width: number, height: number): Uint8ClampedArray {
  const buffer = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      buffer[i] = (x * 13 + 7) % 256;
      buffer[i + 1] = (y * 29 + 11) % 256;
      buffer[i + 2] = ((x + y) * 17 + 3) % 256;
      buffer[i + 3] = (x * y) % 256;
    }
  }
  return buffer;
}

describe("GnumarusJxl", () => {
  it("round-trips RGBA losslessly", async () => {
    const codec = await GnumarusJxlCodec.create();
    const original = gradient(32, 24);
    const encoded = codec.encode(original, 32, 24, { lossless: true });
    expect(encoded.length).toBeGreaterThan(8);
    expect(Array.from(encoded.subarray(0, 2))).toEqual([0xff, 0x0a]);
    const decoded = codec.decode(encoded);
    expect(decoded.width).toBe(32);
    expect(decoded.height).toBe(24);
    expect(Array.from(decoded.buffer)).toEqual(Array.from(original));
  });

  it("round-trips lossy within tolerance", async () => {
    const codec = await GnumarusJxlCodec.create();
    const original = gradient(16, 16);
    const encoded = codec.encode(original, 16, 16, { lossless: false, quality: 80 });
    expect(encoded.length).toBeGreaterThan(8);
    const decoded = codec.decode(encoded);
    expect([decoded.width, decoded.height]).toEqual([16, 16]);
    let diff = 0;
    for (let i = 0; i < original.length; i += 1) {
      diff += Math.abs((original[i] ?? 0) - (decoded.buffer[i] ?? 0));
    }
    expect(diff / original.length).toBeLessThan(30);
  });

  it("rejects invalid input", async () => {
    const codec = await GnumarusJxlCodec.create();
    await expect(async () => codec.decode(new Uint8Array(0))).rejects.toThrow(GnumarusJxlError);
    await expect(async () => codec.decode(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]))).rejects.toThrow(
      GnumarusJxlError,
    );
    expect(() => codec.encode(new Uint8ClampedArray(4), 0, 1)).toThrow(GnumarusJxlError);
    expect(() => codec.encode(new Uint8ClampedArray(3), 1, 1)).toThrow(GnumarusJxlError);
    expect(() => codec.encode(new Uint8ClampedArray(4), 1, 1, { lossless: false, quality: 101 })).toThrow(
      GnumarusJxlError,
    );
  });
});
