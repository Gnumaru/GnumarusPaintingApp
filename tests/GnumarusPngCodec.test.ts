import { describe, expect, it } from "vitest";
import { unzlibSync } from "fflate";
import { encodeBufferToPngBytes } from "../src/project/GnumarusPngCodec";

function checkeredBuffer(width: number, height: number): Uint8ClampedArray {
  const buffer = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    const x = index % width;
    const y = Math.floor(index / width);
    const on = (x + y) % 2 === 0;
    buffer[index * 4] = on ? 200 : 10;
    buffer[index * 4 + 1] = on ? 100 : 20;
    buffer[index * 4 + 2] = on ? 50 : 30;
    buffer[index * 4 + 3] = 255;
  }
  return buffer;
}

function parseChunks(bytes: Uint8Array): Array<{ type: string; data: Uint8Array }> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const chunks: Array<{ type: string; data: Uint8Array }> = [];
  let pos = 8;
  while (pos + 8 <= bytes.length) {
    const length = view.getUint32(pos, false);
    const type = String.fromCharCode(bytes[pos + 4] ?? 0, bytes[pos + 5] ?? 0, bytes[pos + 6] ?? 0, bytes[pos + 7] ?? 0);
    chunks.push({ type, data: bytes.slice(pos + 8, pos + 8 + length) });
    pos += 12 + length;
    if (type === "IEND") {
      break;
    }
  }
  return chunks;
}

describe("GnumarusPngCodec", () => {
  it("writes a valid signature, IHDR and IEND", () => {
    const bytes = encodeBufferToPngBytes(checkeredBuffer(3, 2), 3, 2, 9);
    expect(Array.from(bytes.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    const chunks = parseChunks(bytes);
    expect(chunks.map((chunk) => chunk.type)).toEqual(["IHDR", "IDAT", "IEND"]);
    const ihdr = chunks[0]?.data ?? new Uint8Array(0);
    const view = new DataView(ihdr.buffer, ihdr.byteOffset, ihdr.byteLength);
    expect([view.getUint32(0, false), view.getUint32(4, false)]).toEqual([3, 2]);
    expect([ihdr[8], ihdr[9], ihdr[10], ihdr[11], ihdr[12]]).toEqual([8, 6, 0, 0, 0]);
    expect(chunks[chunks.length - 1]?.data.length).toBe(0);
  });

  it("round-trips exact pixels through the deflated scanlines", () => {
    const buffer = checkeredBuffer(5, 4);
    for (const level of [0, 1, 6, 9]) {
      const bytes = encodeBufferToPngBytes(buffer, 5, 4, level);
      const idat = parseChunks(bytes).find((chunk) => chunk.type === "IDAT")?.data ?? new Uint8Array(0);
      const raw = unzlibSync(idat);
      expect(raw.length).toBe(4 * (1 + 5 * 4));
      for (let y = 0; y < 4; y += 1) {
        expect(raw[y * 21]).toBe(0);
        expect(Array.from(raw.slice(y * 21 + 1, (y + 1) * 21))).toEqual(
          Array.from(buffer.slice(y * 20, (y + 1) * 20)),
        );
      }
    }
  });

  it("compresses harder at higher levels", () => {
    const buffer = checkeredBuffer(64, 64);
    const stored = encodeBufferToPngBytes(buffer, 64, 64, 0);
    const squeezed = encodeBufferToPngBytes(buffer, 64, 64, 9);
    expect(squeezed.length).toBeLessThan(stored.length);
    expect(stored.length).toBeGreaterThan(64 * 64 * 4);
  });

  it("rejects bad dimensions, buffers and levels defensively", () => {
    const buffer = checkeredBuffer(2, 2);
    expect(() => encodeBufferToPngBytes(buffer, 0, 2)).toThrow(/dimensions/);
    expect(() => encodeBufferToPngBytes(buffer.slice(0, 8), 2, 2)).toThrow(/expected 16 bytes/);
    // Out-of-range levels clamp instead of throwing.
    expect(encodeBufferToPngBytes(buffer, 2, 2, 99).length).toBe(encodeBufferToPngBytes(buffer, 2, 2, 9).length);
    expect(encodeBufferToPngBytes(buffer, 2, 2, -3).length).toBe(encodeBufferToPngBytes(buffer, 2, 2, 0).length);
  });
});
