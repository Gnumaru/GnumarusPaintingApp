import { describe, expect, it } from "vitest";
import {
  apngDelay,
  assembleApng,
  deflateZlib,
  encodeAnimatedPng,
  filterScanlines,
  pngChunk,
  pngCrc32,
} from "../src/export/GnumarusApngExport";

/** Minimal PNG chunk walk (type, data slice). */
function pngChunks(file: Uint8Array): Array<{ type: string; data: Uint8Array }> {
  const out: Array<{ type: string; data: Uint8Array }> = [];
  const view = new DataView(file.buffer, file.byteOffset, file.length);
  expect(Array.from(file.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  let at = 8;
  while (at + 12 <= file.length) {
    const length = view.getUint32(at);
    const type = String.fromCharCode(file[at + 4] as number, file[at + 5] as number, file[at + 6] as number, file[at + 7] as number);
    const data = file.slice(at + 8, at + 8 + length);
    const stored = view.getUint32(at + 8 + length);
    expect(stored).toBe(pngCrc32(file.slice(at + 4, at + 8 + length)));
    out.push({ type, data });
    at += 12 + length;
  }
  expect(at).toBe(file.length);
  return out;
}

function u32(data: Uint8Array, at: number): number {
  return new DataView(data.buffer, data.byteOffset, data.length).getUint32(at);
}

function u16(data: Uint8Array, at: number): number {
  return new DataView(data.buffer, data.byteOffset, data.length).getUint16(at);
}

/** Inflate a zlib stream with the platform decoder (no node types needed). */
async function inflateZlib(data: Uint8Array): Promise<Uint8Array> {
  const stream = new DecompressionStream("deflate");
  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();
  const chunks: Uint8Array[] = [];
  const pump = (async (): Promise<void> => {
    for (;;) {
      const next = await reader.read();
      if (next.done) {
        return;
      }
      chunks.push(next.value);
    }
  })();
  await writer.write(data.slice());
  await writer.close();
  await pump;
  let total = 0;
  for (const chunk of chunks) {
    total += chunk.length;
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.length;
  }
  return out;
}

describe("GnumarusApngExport chunks", () => {
  it("computes the standard CRC-32 test vector", () => {
    expect(pngCrc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });

  it("writes length/type/crc framing", () => {
    const chunk = pngChunk("acTL", new Uint8Array([0, 0, 0, 2, 0, 0, 0, 0]));
    expect(chunk.length).toBe(20);
    expect(new DataView(chunk.buffer).getUint32(0)).toBe(8);
    expect(String.fromCharCode(chunk[4] as number, chunk[5] as number, chunk[6] as number, chunk[7] as number)).toBe("acTL");
  });

  it("maps millisecond delays to u16 fractions", () => {
    expect(apngDelay(250)).toEqual({ num: 250, den: 1000 });
    expect(apngDelay(0)).toEqual({ num: 1, den: 1000 });
    const long = apngDelay(100000);
    expect(long.num).toBeLessThanOrEqual(65535);
    expect(Math.abs((long.num / long.den) * 1000 - 100000)).toBeLessThan(1000);
  });

  it("prefixes scanlines with filter byte 0", () => {
    const pixels = new Uint8ClampedArray([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(Array.from(filterScanlines(pixels, 2, 1))).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("assembles sequenced fcTL/IDAT/fdAT with loop control", () => {
    const frames = [
      { compressed: new Uint8Array([1]), delayMs: 100 },
      { compressed: new Uint8Array([2, 2]), delayMs: 200 },
      { compressed: new Uint8Array([3, 3, 3]), delayMs: 300 },
    ];
    for (const loop of [true, false]) {
      const file = assembleApng(4, 5, loop, frames);
      const chunks = pngChunks(file);
      expect(chunks.map((chunk) => chunk.type)).toEqual(["IHDR", "acTL", "fcTL", "IDAT", "fcTL", "fdAT", "fcTL", "fdAT", "IEND"]);
      const ihdr = chunks[0]?.data as Uint8Array;
      expect(u32(ihdr, 0)).toBe(4);
      expect(u32(ihdr, 4)).toBe(5);
      expect(ihdr[9]).toBe(6);
      const actl = chunks[1]?.data as Uint8Array;
      expect(u32(actl, 0)).toBe(3);
      expect(u32(actl, 4)).toBe(loop ? 0 : 1);
      const seqs: number[] = [];
      const delays: Array<[number, number]> = [];
      for (const chunk of chunks) {
        if (chunk.type === "fcTL") {
          seqs.push(u32(chunk.data, 0));
          delays.push([u16(chunk.data, 20), u16(chunk.data, 22)]);
        }
        if (chunk.type === "fdAT") {
          seqs.push(u32(chunk.data, 0));
        }
      }
      expect(seqs).toEqual([0, 1, 2, 3, 4]);
      expect(delays).toEqual([[100, 1000], [200, 1000], [300, 1000]]);
      expect(chunks[3]?.data).toEqual(new Uint8Array([1]));
      expect(chunks[5]?.data.slice(4)).toEqual(new Uint8Array([2, 2]));
    }
    expect(() => assembleApng(4, 4, true, [])).toThrow(/no frames/);
  });
});

describe("GnumarusApngExport round-trip", () => {
  function solid(width: number, height: number, r: number, g: number, b: number): Uint8ClampedArray {
    const out = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < out.length; i += 4) {
      out[i] = r;
      out[i + 1] = g;
      out[i + 2] = b;
      out[i + 3] = 255;
    }
    return out;
  }

  it("deflates to real zlib streams", async () => {
    const raw = new Uint8Array([1, 2, 3, 4, 5]);
    const compressed = await deflateZlib(raw);
    expect(Array.from(await inflateZlib(compressed))).toEqual([1, 2, 3, 4, 5]);
  });

  it("encodes red/blue frames that inflate back to exact pixels", async () => {
    const file = await encodeAnimatedPng({
      width: 4,
      height: 4,
      loop: false,
      frames: [
        { pixels: solid(4, 4, 255, 0, 0), delayMs: 250 },
        { pixels: solid(4, 4, 0, 0, 255), delayMs: 500 },
      ],
    });
    const chunks = pngChunks(file);
    expect(chunks.map((chunk) => chunk.type)).toEqual(["IHDR", "acTL", "fcTL", "IDAT", "fcTL", "fdAT", "IEND"]);
    const payloads = chunks.filter((chunk) => chunk.type === "IDAT" || chunk.type === "fdAT").map((chunk) => (chunk.type === "IDAT" ? chunk.data : chunk.data.slice(4)));
    expect(payloads).toHaveLength(2);
    const expected = [solid(4, 4, 255, 0, 0), solid(4, 4, 0, 0, 255)];
    for (const [index, payload] of payloads.entries()) {
      const raw = await inflateZlib(payload as Uint8Array);
      // Strip per-scanline filter bytes, then compare pixels verbatim.
      const stride = 4 * 4;
      const pixels = new Uint8ClampedArray(4 * 4 * 4);
      for (let y = 0; y < 4; y += 1) {
        expect(raw[y * (stride + 1)]).toBe(0);
        pixels.set(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), y * stride);
      }
      expect(Array.from(pixels)).toEqual(Array.from(expected[index] as Uint8ClampedArray));
    }
    // Second frame delay survives the round trip.
    const fctls = chunks.filter((chunk) => chunk.type === "fcTL");
    expect(u16((fctls[1] as { data: Uint8Array }).data, 20)).toBe(500);
  });

  it("rejects empty animations and ragged frames", async () => {
    await expect(encodeAnimatedPng({ width: 4, height: 4, loop: true, frames: [] })).rejects.toThrow(/no frames/);
    await expect(
      encodeAnimatedPng({ width: 4, height: 4, loop: true, frames: [{ pixels: new Uint8ClampedArray(3), delayMs: 100 }] }),
    ).rejects.toThrow(/bytes/);
  });
});
