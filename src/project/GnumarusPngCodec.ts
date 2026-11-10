import { zlibSync } from "fflate";

const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

/** fflate zlib level (0 stores rows raw, 9 compresses hardest). */
export type GnumarusPngDeflateLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

const PNG_CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let value = 0; value < 256; value += 1) {
    let entry = value;
    for (let bit = 0; bit < 8; bit += 1) {
      entry = entry % 2 === 0 ? entry >>> 1 : (entry >>> 1) ^ 0xedb88320;
    }
    table[value] = entry >>> 0;
  }
  return table;
})();

function pngCrc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let index = 0; index < data.length; index += 1) {
    crc = (PNG_CRC_TABLE[(crc ^ (data[index] ?? 0)) & 0xff] ?? 0) ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length, false);
  for (let index = 0; index < 4; index += 1) {
    out[4 + index] = type.charCodeAt(index);
  }
  out.set(data, 8);
  view.setUint32(8 + data.length, pngCrc32(out.subarray(4, 8 + data.length)), false);
  return out;
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const part of parts) {
    total += part.length;
  }
  const out = new Uint8Array(total);
  let pos = 0;
  for (const part of parts) {
    out.set(part, pos);
    pos += part.length;
  }
  return out;
}

/**
 * Encode RGBA bytes as PNG with an fflate zlib compression level 0-9
 * (0 stores rows raw, 9 compresses hardest). Pure function of the pixels:
 * identical input always yields identical bytes.
 */
export function encodeBufferToPngBytes(
  buffer: Uint8ClampedArray,
  width: number,
  height: number,
  level = 9,
): Uint8Array {
  const w = Math.floor(width);
  const h = Math.floor(height);
  if (!Number.isInteger(w) || !Number.isInteger(h) || w < 1 || h < 1) {
    throw new Error(`Cannot encode PNG with invalid dimensions ${width}x${height}.`);
  }
  if (buffer.length !== w * h * 4) {
    throw new Error(`Cannot encode PNG: expected ${w * h * 4} bytes, got ${buffer.length}.`);
  }
  const deflateLevel = Number.isFinite(level) ? Math.min(9, Math.max(0, Math.round(level))) : 9;
  const raw = new Uint8Array(h * (1 + w * 4));
  for (let y = 0; y < h; y += 1) {
    const rowStart = y * w * 4;
    raw[y * (1 + w * 4)] = 0;
    raw.set(buffer.subarray(rowStart, rowStart + w * 4), y * (1 + w * 4) + 1);
  }
  const compressed = zlibSync(raw, { level: deflateLevel as GnumarusPngDeflateLevel });
  const ihdr = new Uint8Array(13);
  const header = new DataView(ihdr.buffer);
  header.setUint32(0, w, false);
  header.setUint32(4, h, false);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return concatBytes([PNG_SIGNATURE, pngChunk("IHDR", ihdr), pngChunk("IDAT", compressed), pngChunk("IEND", new Uint8Array(0))]);
}

export async function encodeBufferToPngBlob(
  buffer: Uint8ClampedArray,
  width: number,
  height: number,
  level = 9,
): Promise<Blob> {
  return new Blob([encodeBufferToPngBytes(buffer, width, height, level) as Uint8Array<ArrayBuffer>], {
    type: "image/png",
  });
}

export async function decodePngToBuffer(blob: Blob): Promise<{
  width: number;
  height: number;
  buffer: Uint8ClampedArray;
}> {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext("2d");
  if (context === null) {
    bitmap.close();
    throw new Error("2D canvas is unavailable for PNG decoding.");
  }
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  return { width: canvas.width, height: canvas.height, buffer: imageData.data };
}
