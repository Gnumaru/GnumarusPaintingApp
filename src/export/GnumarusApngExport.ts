/**
 * Animated PNG (APNG) export: hand-assembled PNG chunks with platform
 * CompressionStream zlib compression. No dependencies. Frames are full
 * canvas composites, so every frame overwrites the previous one
 * (dispose NONE + blend SOURCE) and only filter type 0 is used.
 */

export interface GnumarusApngFrameInput {
  /** Full-frame RGBA pixels, exactly width * height * 4 bytes. */
  pixels: Uint8ClampedArray;
  /** Frame display time in milliseconds. */
  delayMs: number;
}

export interface GnumarusApngEncodeRequest {
  frames: GnumarusApngFrameInput[];
  width: number;
  height: number;
  /** True repeats forever (acTL num_plays 0), false plays once. */
  loop: boolean;
}

export interface GnumarusApngCompressedFrame {
  compressed: Uint8Array;
  delayMs: number;
}

/** CRC-32 (ISO 3309) over raw bytes, as PNG chunks require. */
export function pngCrc32(data: Uint8Array): number {
  let table = GnumarusCrcTable;
  if (table === null) {
    table = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let value = n;
      for (let k = 0; k < 8; k += 1) {
        value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
      }
      table[n] = value >>> 0;
    }
    GnumarusCrcTable = table;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) {
    crc = (table[(crc ^ (data[i] as number)) & 0xff] as number) ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

let GnumarusCrcTable: Uint32Array | null = null;

function u32be(value: number): Uint8Array {
  const out = new Uint8Array(4);
  const view = new DataView(out.buffer);
  view.setUint32(0, value >>> 0);
  return out;
}

function u16be(value: number): Uint8Array {
  const out = new Uint8Array(2);
  const view = new DataView(out.buffer);
  view.setUint16(0, value & 0xffff);
  return out;
}

/** Single PNG chunk (length + type + data + CRC), pure and unit-tested. */
export function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const name = new TextEncoder().encode(type);
  const out = new Uint8Array(12 + data.length);
  out.set(u32be(data.length), 0);
  out.set(name, 4);
  out.set(data, 8);
  const crcInput = new Uint8Array(4 + data.length);
  crcInput.set(name, 0);
  crcInput.set(data, 4);
  out.set(u32be(pngCrc32(crcInput)), 8 + data.length);
  return out;
}

/** fcTL delay fraction for a millisecond duration (num fits in u16). */
export function apngDelay(delayMs: number): { num: number; den: number } {
  const ms = Number.isFinite(delayMs) ? Math.max(1, Math.round(delayMs)) : 100;
  if (ms <= 65535) {
    return { num: ms, den: 1000 };
  }
  const den = Math.max(1, Math.round((1000 * 65535) / ms));
  return { num: Math.min(65535, Math.round((ms * den) / 1000)), den };
}

/** Prefix every scanline with filter byte 0 (None). */
export function filterScanlines(pixels: Uint8ClampedArray, width: number, height: number): Uint8Array {
  const stride = width * 4;
  const out = new Uint8Array(height * (stride + 1));
  for (let y = 0; y < height; y += 1) {
    out[y * (stride + 1)] = 0;
    out.set(pixels.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  }
  return out;
}

/** zlib-compress filtered scanlines with the platform encoder. */
export async function deflateZlib(raw: Uint8Array): Promise<Uint8Array> {
  const stream = new CompressionStream("deflate");
  const writer = stream.writable.getWriter();
  const chunks: Uint8Array[] = [];
  const reader = stream.readable.getReader();
  const pump = (async (): Promise<void> => {
    for (;;) {
      const next = await reader.read();
      if (next.done) {
        return;
      }
      chunks.push(next.value);
    }
  })();
  await writer.write(raw.slice());
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

/**
 * Assemble a complete APNG file from already-deflated frames (pure;
 * compression is injected so unit tests stay deterministic). The first
 * frame carries fcTL + IDAT (doubles as the static fallback image), the
 * rest fcTL + fdAT with a shared sequence counter.
 */
export function assembleApng(
  width: number,
  height: number,
  loop: boolean,
  frames: GnumarusApngCompressedFrame[],
): Uint8Array {
  const w = Math.max(1, Math.floor(width));
  const h = Math.max(1, Math.floor(height));
  if (frames.length === 0) {
    throw new Error("cannot encode an animation with no frames");
  }
  const parts: Uint8Array[] = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])];
  const ihdr = new Uint8Array(13);
  ihdr.set(u32be(w), 0);
  ihdr.set(u32be(h), 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  parts.push(pngChunk("IHDR", ihdr));
  const actl = new Uint8Array(8);
  actl.set(u32be(frames.length), 0);
  actl.set(u32be(loop ? 0 : 1), 4);
  parts.push(pngChunk("acTL", actl));
  let sequence = 0;
  frames.forEach((frame, index) => {
    if (frame.compressed.length === 0) {
      throw new Error(`animation frame ${index} has no image data`);
    }
    const delay = apngDelay(frame.delayMs);
    const fctl = new Uint8Array(26);
    fctl.set(u32be(sequence), 0);
    sequence += 1;
    fctl.set(u32be(w), 4);
    fctl.set(u32be(h), 8);
    fctl.set(u32be(0), 12);
    fctl.set(u32be(0), 16);
    fctl.set(u16be(delay.num), 20);
    fctl.set(u16be(delay.den), 22);
    fctl[24] = 0;
    fctl[25] = 0;
    parts.push(pngChunk("fcTL", fctl));
    if (index === 0) {
      parts.push(pngChunk("IDAT", frame.compressed));
    } else {
      const fdat = new Uint8Array(4 + frame.compressed.length);
      fdat.set(u32be(sequence), 0);
      sequence += 1;
      fdat.set(frame.compressed, 4);
      parts.push(pngChunk("fdAT", fdat));
    }
  });
  parts.push(pngChunk("IEND", new Uint8Array(0)));
  let total = 0;
  for (const part of parts) {
    total += part.length;
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

/** Encode full-frame RGBA buffers to a complete APNG file. */
export async function encodeAnimatedPng(request: GnumarusApngEncodeRequest): Promise<Uint8Array> {
  const w = Math.max(1, Math.floor(request.width));
  const h = Math.max(1, Math.floor(request.height));
  if (request.frames.length === 0) {
    throw new Error("cannot encode an animation with no frames");
  }
  if (typeof CompressionStream === "undefined") {
    throw new Error("this browser cannot compress PNG data (CompressionStream unavailable)");
  }
  const compressed: GnumarusApngCompressedFrame[] = [];
  for (let index = 0; index < request.frames.length; index += 1) {
    const frame = request.frames[index];
    if (frame === undefined) {
      throw new Error(`missing pixels for frame ${index}`);
    }
    if (frame.pixels.length !== w * h * 4) {
      throw new Error(`frame ${index} has ${frame.pixels.length} bytes, expected ${w * h * 4}`);
    }
    const delayMs = Number.isFinite(frame.delayMs) && frame.delayMs > 0 ? frame.delayMs : 100;
    compressed.push({ compressed: await deflateZlib(filterScanlines(frame.pixels, w, h)), delayMs });
  }
  return assembleApng(w, h, request.loop, compressed);
}
