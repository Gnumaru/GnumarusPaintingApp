/**
 * Photoshop (.psd) import.
 *
 * Strict big-endian parser implemented from Adobe's Photoshop File Format
 * Specification (format facts only; no Adobe source code is used here).
 * Every structural violation throws GnumarusPsdError, so truncated,
 * mislabeled or otherwise corrupt files are rejected with a precise byte
 * offset instead of producing wrong pixels.
 *
 * Imported subset: canvas size, 8-bit RGB/grayscale/indexed images
 * (16-bit keeps the most significant byte), Raw/RLE-PackBits/ZIP/ZIP
 * predicted channel data, pixel layers with rect offsets, per-layer
 * opacity and visibility, layer names (Pascal strings, Unicode `luni`
 * names preferred), and the composite image as a single "Background"
 * layer when a file carries no pixel layers (flattened files).
 *
 * Layer visibility follows the de-facto convention used by GIMP, psd.js
 * and Pillow (flags bit 1 set means hidden), which disagrees with the
 * spec's one-line wording; visible layers in the wild keep the bit clear.
 *
 * Ignored (no equivalent in this app): layer blend modes (everything
 * composites normal), clipping layers (imported as normal layers), layer
 * and vector masks, adjustment/fill layers and group markers (they carry
 * no pixel channels, so they are skipped), guides/grids/slices/paths and
 * all other image resources and tagged blocks, color profiles, 32-bit
 * depth, PSB large documents and non-RGB/grayscale/indexed color modes.
 *
 * ZIP decompression uses the native DecompressionStream ("deflate"), so
 * no new dependency is needed.
 */
import {
  type GnumarusTexturePixels,
} from "../animation/GnumarusAnimationModel";
import type { GnumarusChannelLock } from "../canvas/GnumarusPixelBuffer";
import {
  IDENTITY_LAYER_TRANSFORM,
  type GnumarusLayerTransform,
} from "../canvas/GnumarusViewportMath";

export class GnumarusPsdError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GnumarusPsdError";
  }
}

export interface GnumarusPsdLayer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  lockedChannels: GnumarusChannelLock;
}

export interface GnumarusPsdContent {
  id: string;
  name: string;
  textureId: string;
  transform: GnumarusLayerTransform;
}

export interface GnumarusPsdCell {
  layer: string;
  frame: number;
  content: string;
}

export interface GnumarusPsdDocument {
  width: number;
  height: number;
  layers: GnumarusPsdLayer[];
  textures: GnumarusTexturePixels[];
  contents: GnumarusPsdContent[];
  cells: GnumarusPsdCell[];
}

const PSD_SIGNATURE = "8BPS";
const PSD_LARGE_SIGNATURE = "8BPB";
const PSD_VERSION = 1;
const PSD_MAX_DIMENSION = 4096;
const PSD_MAX_LAYER_DIMENSION = 8192;
const PSD_MAX_LAYERS = 4096;
const PSD_MAX_CHANNELS = 56;

const PSD_MODE_GRAYSCALE = 1;
const PSD_MODE_INDEXED = 2;
const PSD_MODE_RGB = 3;

const PSD_COMPRESSION_RAW = 0;
const PSD_COMPRESSION_RLE = 1;
const PSD_COMPRESSION_ZIP = 2;
const PSD_COMPRESSION_ZIP_PREDICTED = 3;

const PSD_CHANNEL_RED = 0;
const PSD_CHANNEL_GREEN = 1;
const PSD_CHANNEL_BLUE = 2;
const PSD_CHANNEL_TRANSPARENCY = -1;

/** Flags bit 1 set means the layer is hidden (de-facto convention). */
const PSD_LAYER_FLAG_HIDDEN = 0x02;

/** Bounds-checked big-endian cursor over the file bytes. */
class GnumarusPsdReader {
  private readonly view: DataView;
  private cursor = 0;

  constructor(
    private readonly data: Uint8Array,
    private readonly label: string,
  ) {
    this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  }

  get position(): number {
    return this.cursor;
  }

  fail(reason: string): never {
    throw new GnumarusPsdError(`${this.label}: ${reason} (byte ${this.cursor} of ${this.data.length})`);
  }

  private need(count: number, what: string): void {
    if (!Number.isInteger(count) || count < 0 || this.cursor + count > this.data.length) {
      this.fail(`truncated ${what}`);
    }
  }

  seek(position: number, what: string): void {
    if (!Number.isInteger(position) || position < this.cursor || position > this.data.length) {
      this.fail(`invalid ${what}`);
    }
    this.cursor = position;
  }

  remaining(): number {
    return this.data.length - this.cursor;
  }

  u8(what: string): number {
    this.need(1, what);
    const value = this.view.getUint8(this.cursor);
    this.cursor += 1;
    return value;
  }

  u16(what: string): number {
    this.need(2, what);
    const value = this.view.getUint16(this.cursor, false);
    this.cursor += 2;
    return value;
  }

  i16(what: string): number {
    this.need(2, what);
    const value = this.view.getInt16(this.cursor, false);
    this.cursor += 2;
    return value;
  }

  u32(what: string): number {
    this.need(4, what);
    const value = this.view.getUint32(this.cursor, false);
    this.cursor += 4;
    return value;
  }

  i32(what: string): number {
    this.need(4, what);
    const value = this.view.getInt32(this.cursor, false);
    this.cursor += 4;
    return value;
  }

  bytes(count: number, what: string): Uint8Array {
    this.need(count, what);
    const slice = this.data.subarray(this.cursor, this.cursor + count);
    this.cursor += count;
    return slice;
  }

  skip(count: number, what: string): void {
    this.need(count, what);
    this.cursor += count;
  }

  ascii(count: number, what: string): string {
    const slice = this.bytes(count, what);
    let text = "";
    for (let index = 0; index < slice.length; index += 1) {
      text += String.fromCharCode(slice[index] ?? 0);
    }
    return text;
  }

  /** Pascal string padded to a multiple of 4 bytes (layer names). */
  pascalString4(what: string): string {
    const length = this.u8(`${what} length`);
    const slice = this.bytes(length, what);
    this.skip((4 - ((1 + length) % 4)) % 4, `${what} padding`);
    return GNUMARUS_PSD_TEXT_DECODER.decode(slice);
  }
}

const GNUMARUS_PSD_TEXT_DECODER = new TextDecoder("windows-1252");

/** Inflate one zlib (RFC1950) blob, rejecting corrupt streams. */
async function inflatePsdZlib(compressed: Uint8Array, what: string): Promise<Uint8Array> {
  try {
    const output = await new Response(
      new Blob([compressed.slice()]).stream().pipeThrough(new DecompressionStream("deflate")),
    ).arrayBuffer();
    return new Uint8Array(output);
  } catch (error) {
    throw new GnumarusPsdError(
      `Photoshop file: corrupt ZIP data in ${what} (${error instanceof Error ? error.message : String(error)})`,
    );
  }
}

interface GnumarusPsdChannelRef {
  id: number;
  length: number;
}

interface GnumarusPsdLayerRecord {
  top: number;
  left: number;
  bottom: number;
  right: number;
  channels: GnumarusPsdChannelRef[];
  opacity: number;
  flags: number;
  name: string;
}

/** Decode one PackBits row; the slice must yield exactly `width` bytes. */
function unpackPsdPackBitsRow(data: Uint8Array, width: number, what: string): Uint8Array {
  const row = new Uint8Array(width);
  let out = 0;
  let pos = 0;
  while (out < width) {
    if (pos >= data.length) {
      throw new GnumarusPsdError(`Photoshop file: truncated PackBits row in ${what}`);
    }
    const raw = data[pos] ?? 0;
    const header = raw > 127 ? raw - 256 : raw;
    pos += 1;
    if (header >= 0) {
      const count = header + 1;
      if (pos + count > data.length || out + count > width) {
        throw new GnumarusPsdError(`Photoshop file: corrupt PackBits literal in ${what}`);
      }
      row.set(data.subarray(pos, pos + count), out);
      pos += count;
      out += count;
    } else if (header === -128) {
      // No-op.
    } else {
      const count = 1 - header;
      if (pos >= data.length || out + count > width) {
        throw new GnumarusPsdError(`Photoshop file: corrupt PackBits repeat in ${what}`);
      }
      row.fill(data[pos] ?? 0, out, out + count);
      pos += 1;
      out += count;
    }
  }
  return row;
}

/** Undo horizontal delta prediction, independently per row. */
function undoPsdPrediction(plane: Uint8Array, width: number): void {
  for (let rowStart = 0; rowStart + width <= plane.length; rowStart += width) {
    for (let x = 1; x < width; x += 1) {
      plane[rowStart + x] = ((plane[rowStart + x] ?? 0) + (plane[rowStart + x - 1] ?? 0)) & 0xff;
    }
  }
}

/**
 * Decode one channel plane to 8-bit samples. For RLE, `rowLengths` carries
 * the per-row compressed lengths: read from the payload for layer channels
 * (null), supplied by the caller for the composite image (which stores all
 * counts up front).
 */
async function decodePsdPlane(
  payload: Uint8Array,
  compression: number,
  width: number,
  height: number,
  depth: number,
  rowLengths: number[] | null,
  what: string,
): Promise<Uint8Array> {
  const samples = width * height;
  if (compression === PSD_COMPRESSION_RAW) {
    if (rowLengths !== null) {
      throw new GnumarusPsdError(`Photoshop file: unexpected row counts for raw data in ${what}`);
    }
    if (depth === 8) {
      if (payload.length < samples) {
        throw new GnumarusPsdError(`Photoshop file: truncated raw channel in ${what}`);
      }
      return payload.slice(0, samples);
    }
    const rawBytes = samples * 2;
    if (payload.length < rawBytes) {
      throw new GnumarusPsdError(`Photoshop file: truncated raw channel in ${what}`);
    }
    return msbOfPsdSamples(payload.slice(0, rawBytes), samples, what);
  }
  if (compression === PSD_COMPRESSION_RLE) {
    let counts: number[];
    let data: Uint8Array;
    if (rowLengths === null) {
      if (payload.length < height * 2) {
        throw new GnumarusPsdError(`Photoshop file: truncated RLE row counts in ${what}`);
      }
      const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
      counts = [];
      for (let y = 0; y < height; y += 1) {
        counts.push(view.getUint16(y * 2, false));
      }
      data = payload.subarray(height * 2);
    } else {
      if (rowLengths.length !== height) {
        throw new GnumarusPsdError(`Photoshop file: wrong RLE row count in ${what}`);
      }
      counts = rowLengths;
      data = payload;
    }
    if (depth === 8) {
      const plane = new Uint8Array(samples);
      let pos = 0;
      for (let y = 0; y < height; y += 1) {
        const rowLength = counts[y] ?? -1;
        const rowData = data.subarray(pos, pos + rowLength);
        if (rowData.length < rowLength) {
          throw new GnumarusPsdError(`Photoshop file: truncated RLE row ${y + 1} in ${what}`);
        }
        plane.set(unpackPsdPackBitsRow(rowData, width, `${what} row ${y + 1}`), y * width);
        pos += rowLength;
      }
      return plane;
    }
    const plane = new Uint8Array(samples);
    let pos = 0;
    for (let y = 0; y < height; y += 1) {
      const rowLength = counts[y] ?? -1;
      const rowData = data.subarray(pos, pos + rowLength);
      if (rowData.length < rowLength) {
        throw new GnumarusPsdError(`Photoshop file: truncated RLE row ${y + 1} in ${what}`);
      }
      const decoded = unpackPsdPackBitsRow(rowData, width * 2, `${what} row ${y + 1}`);
      for (let x = 0; x < width; x += 1) {
        plane[y * width + x] = decoded[x * 2] ?? 0;
      }
      pos += rowLength;
    }
    return plane;
  }
  if (compression === PSD_COMPRESSION_ZIP || compression === PSD_COMPRESSION_ZIP_PREDICTED) {
    if (rowLengths !== null) {
      throw new GnumarusPsdError(`Photoshop file: unexpected row counts for ZIP data in ${what}`);
    }
    const plane = await inflatePsdZlib(payload, what);
    if (depth === 8) {
      if (plane.length !== samples) {
        throw new GnumarusPsdError(
          `Photoshop file: ZIP channel decoded to ${plane.length} bytes, expected ${samples} in ${what}`,
        );
      }
      if (compression === PSD_COMPRESSION_ZIP_PREDICTED) {
        undoPsdPrediction(plane, width);
      }
      return plane;
    }
    if (compression === PSD_COMPRESSION_ZIP_PREDICTED) {
      throw new GnumarusPsdError(`Photoshop file: ZIP prediction with 16-bit depth is not supported in ${what}`);
    }
    return msbOfPsdSamples(plane, samples, what);
  }
  throw new GnumarusPsdError(`Photoshop file: unsupported channel compression ${compression} in ${what}`);
}

/** Keep the most significant byte of each big-endian 16-bit sample. */
function msbOfPsdSamples(data: Uint8Array, samples: number, what: string): Uint8Array {
  if (data.length !== samples * 2) {
    throw new GnumarusPsdError(
      `Photoshop file: 16-bit channel decoded to ${data.length} bytes, expected ${samples * 2} in ${what}`,
    );
  }
  const msb = new Uint8Array(samples);
  for (let index = 0; index < samples; index += 1) {
    msb[index] = data[index * 2] ?? 0;
  }
  return msb;
}

/**
 * Parse a `luni` block into per-layer names, or null when the bytes do not
 * fit (callers fall back to the Pascal names). Tolerates a single trailing
 * null word, since writers disagree on whether the counts include it.
 */
function parsePsdUnicodeNames(data: Uint8Array, layerCount: number): string[] | null {
  if (layerCount === 0) {
    return data.length === 0 ? [] : null;
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const names: string[] = [];
  let pos = 0;
  for (let index = 0; index < layerCount; index += 1) {
    if (pos + 4 > data.length) {
      return null;
    }
    const count = view.getUint32(pos, false);
    pos += 4;
    if (count > 1024 || pos + count * 2 > data.length) {
      return null;
    }
    let name = "";
    for (let unit = 0; unit < count; unit += 1) {
      name += String.fromCharCode(view.getUint16(pos + unit * 2, false));
    }
    pos += count * 2;
    names.push(name.replace(/\0+$/, ""));
  }
  if (pos === data.length) {
    return names;
  }
  if (pos + 2 === data.length && data[pos] === 0 && data[pos + 1] === 0) {
    return names;
  }
  return null;
}

function psdModeName(mode: number): string {
  switch (mode) {
    case PSD_MODE_GRAYSCALE:
      return "Grayscale";
    case PSD_MODE_INDEXED:
      return "Indexed";
    case PSD_MODE_RGB:
      return "RGB";
    case 0:
      return "Bitmap";
    case 4:
      return "CMYK";
    case 7:
      return "Multichannel";
    case 8:
      return "Duotone";
    case 9:
      return "Lab";
    default:
      return `mode ${mode}`;
  }
}

interface GnumarusPsdHeader {
  width: number;
  height: number;
  depth: number;
  mode: number;
  channels: number;
  colorTable: Uint8Array | null;
}

interface GnumarusPsdPixelLayer {
  name: string;
  opacity: number;
  visible: boolean;
  left: number;
  top: number;
  width: number;
  height: number;
  buffer: Uint8ClampedArray;
}

function assemblePsdLayerBuffer(
  planes: ReadonlyMap<number, Uint8Array>,
  mode: number,
  colorTable: Uint8Array | null,
  width: number,
  height: number,
): Uint8ClampedArray {
  const buffer = new Uint8ClampedArray(width * height * 4);
  const red = planes.get(PSD_CHANNEL_RED);
  const green = planes.get(PSD_CHANNEL_GREEN);
  const blue = planes.get(PSD_CHANNEL_BLUE);
  const alpha = planes.get(PSD_CHANNEL_TRANSPARENCY);
  for (let index = 0; index < width * height; index += 1) {
    let r = 0;
    let g = 0;
    let b = 0;
    if (mode === PSD_MODE_GRAYSCALE) {
      r = red?.[index] ?? 0;
      g = r;
      b = r;
    } else if (mode === PSD_MODE_INDEXED) {
      const tableIndex = red?.[index] ?? 0;
      r = colorTable?.[tableIndex] ?? 0;
      g = colorTable?.[256 + tableIndex] ?? 0;
      b = colorTable?.[512 + tableIndex] ?? 0;
    } else {
      r = red?.[index] ?? 0;
      g = green?.[index] ?? 0;
      b = blue?.[index] ?? 0;
    }
    buffer[index * 4] = r;
    buffer[index * 4 + 1] = g;
    buffer[index * 4 + 2] = b;
    buffer[index * 4 + 3] = alpha?.[index] ?? 255;
  }
  return buffer;
}

async function parsePsdHeader(reader: GnumarusPsdReader): Promise<GnumarusPsdHeader> {
  const signature = reader.ascii(4, "signature");
  if (signature === PSD_LARGE_SIGNATURE) {
    throw new GnumarusPsdError("Photoshop file: large document (PSB) files are not supported");
  }
  if (signature !== PSD_SIGNATURE) {
    throw new GnumarusPsdError("Photoshop file: bad signature, expected '8BPS'");
  }
  if (reader.u16("version") !== PSD_VERSION) {
    throw new GnumarusPsdError("Photoshop file: unsupported version, expected 1");
  }
  reader.skip(6, "reserved");
  const channels = reader.u16("channel count");
  if (channels < 1 || channels > PSD_MAX_CHANNELS) {
    throw new GnumarusPsdError(`Photoshop file: unsupported channel count ${channels}`);
  }
  const height = reader.u32("height");
  const width = reader.u32("width");
  if (width < 1 || height < 1 || width > 30000 || height > 30000) {
    throw new GnumarusPsdError(`Photoshop file: unsupported canvas size ${width}x${height}`);
  }
  if (width > PSD_MAX_DIMENSION || height > PSD_MAX_DIMENSION) {
    throw new GnumarusPsdError(
      `Photoshop file: canvas is ${width}x${height}, larger than the ${PSD_MAX_DIMENSION}px import limit`,
    );
  }
  const depth = reader.u16("depth");
  if (depth !== 8 && depth !== 16) {
    throw new GnumarusPsdError(
      depth === 32
        ? "Photoshop file: 32-bit depth is not supported"
        : `Photoshop file: unsupported depth ${depth}`,
    );
  }
  const mode = reader.u16("color mode");
  if (mode !== PSD_MODE_RGB && mode !== PSD_MODE_GRAYSCALE && mode !== PSD_MODE_INDEXED) {
    throw new GnumarusPsdError(`Photoshop file: ${psdModeName(mode)} color is not supported`);
  }
  const colorLength = reader.u32("color data length");
  let colorTable: Uint8Array | null = null;
  if (mode === PSD_MODE_INDEXED) {
    if (colorLength !== 768) {
      throw new GnumarusPsdError("Photoshop file: indexed color table must be 768 bytes");
    }
    colorTable = reader.bytes(768, "color table").slice();
  } else {
    reader.skip(colorLength, "color data");
  }
  reader.skip(reader.u32("image resources length"), "image resources");
  return { width, height, depth, mode, channels, colorTable };
}

interface GnumarusPsdLayerData {
  record: GnumarusPsdLayerRecord;
  planes: Map<number, Uint8Array>;
}

/**
 * Parse layer records plus their channel image data. Returns the records
 * in file order (top layer first) with decoded color/alpha planes.
 */
async function parsePsdLayers(
  reader: GnumarusPsdReader,
  sectionEnd: number,
  depth: number,
): Promise<{ layers: GnumarusPsdLayerData[]; unicodeNames: string[] | null }> {
  const infoLength = reader.u32("layers info length");
  const infoStart = reader.position;
  const infoEnd = infoStart + infoLength;
  if (infoEnd > sectionEnd) {
    reader.fail("layers info overruns its section");
  }
  const layerCount = Math.abs(reader.i16("layer count"));
  if (layerCount > PSD_MAX_LAYERS) {
    reader.fail(`too many layers (${layerCount})`);
  }
  const records: GnumarusPsdLayerRecord[] = [];
  for (let index = 0; index < layerCount; index += 1) {
    const top = reader.i32(`layer ${index + 1} top`);
    const left = reader.i32(`layer ${index + 1} left`);
    const bottom = reader.i32(`layer ${index + 1} bottom`);
    const right = reader.i32(`layer ${index + 1} right`);
    if (right < left || bottom < top) {
      reader.fail(`layer ${index + 1} has an inverted rectangle`);
    }
    const channelCount = reader.u16(`layer ${index + 1} channel count`);
    if (channelCount > PSD_MAX_CHANNELS) {
      reader.fail(`layer ${index + 1} has too many channels`);
    }
    const channels: GnumarusPsdChannelRef[] = [];
    for (let channel = 0; channel < channelCount; channel += 1) {
      channels.push({
        id: reader.i16(`layer ${index + 1} channel id`),
        length: reader.u32(`layer ${index + 1} channel length`),
      });
    }
    if (reader.ascii(4, `layer ${index + 1} blend signature`) !== "8BIM") {
      reader.fail(`layer ${index + 1} has a bad blend signature`);
    }
    reader.skip(4, `layer ${index + 1} blend key`);
    const opacity = reader.u8(`layer ${index + 1} opacity`);
    reader.skip(1, `layer ${index + 1} clipping`);
    const flags = reader.u8(`layer ${index + 1} flags`);
    reader.skip(1, `layer ${index + 1} filler`);
    const extraLength = reader.u32(`layer ${index + 1} extra data length`);
    const extraEnd = reader.position + extraLength;
    const maskLength = reader.u32(`layer ${index + 1} mask length`);
    if (reader.position + maskLength > extraEnd) {
      reader.fail(`layer ${index + 1} mask overruns its extra data`);
    }
    reader.skip(maskLength, `layer ${index + 1} mask data`);
    const blendLength = reader.u32(`layer ${index + 1} blending ranges length`);
    if (reader.position + blendLength > extraEnd) {
      reader.fail(`layer ${index + 1} blending ranges overrun its extra data`);
    }
    reader.skip(blendLength, `layer ${index + 1} blending ranges`);
    const name = reader.pascalString4(`layer ${index + 1} name`);
    reader.seek(extraEnd, `layer ${index + 1} extra data end`);
    records.push({ top, left, bottom, right, channels, opacity, flags, name });
  }
  const layers: GnumarusPsdLayerData[] = [];
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    if (record === undefined) {
      reader.fail(`missing layer record ${index + 1}`);
    }
    const width = record.right - record.left;
    const height = record.bottom - record.top;
    const planes = new Map<number, Uint8Array>();
    for (const channel of record.channels) {
      if (channel.length < 2) {
        reader.fail(`layer ${index + 1} channel ${channel.id} has no compression field`);
      }
      const compression = reader.u16(`layer ${index + 1} channel ${channel.id} compression`);
      const payload = reader.bytes(channel.length - 2, `layer ${index + 1} channel ${channel.id} data`);
      if (width <= 0 || height <= 0 || planes.has(channel.id)) {
        continue;
      }
      if (
        channel.id === PSD_CHANNEL_RED ||
        channel.id === PSD_CHANNEL_GREEN ||
        channel.id === PSD_CHANNEL_BLUE ||
        channel.id === PSD_CHANNEL_TRANSPARENCY
      ) {
        planes.set(
          channel.id,
          await decodePsdPlane(payload, compression, width, height, depth, null, `layer ${index + 1} channel ${channel.id}`),
        );
      }
    }
    layers.push({ record, planes });
  }
  if ((reader.position - infoStart) % 2 === 1) {
    reader.skip(1, "layers info padding");
  }
  if (reader.position > infoEnd) {
    reader.fail("layers info overruns its length");
  }
  reader.seek(infoEnd, "layers info end");
  let unicodeNames: string[] | null = null;
  reader.skip(reader.u32("global mask length"), "global mask");
  while (reader.position < sectionEnd) {
    const blockSignature = reader.ascii(4, "tagged block signature");
    if (blockSignature !== "8BIM" && blockSignature !== "8B64") {
      reader.fail("bad tagged block signature");
    }
    const key = reader.ascii(4, "tagged block key");
    const blockLength = reader.u32("tagged block length");
    const blockEnd = reader.position + blockLength;
    if (blockEnd > sectionEnd) {
      reader.fail(`tagged block ${key} overruns its section`);
    }
    const blockData = reader.bytes(blockLength, `tagged block ${key}`);
    if (key === "luni" && unicodeNames === null) {
      unicodeNames = parsePsdUnicodeNames(blockData, records.length);
    }
    reader.seek(blockEnd, `tagged block ${key} end`);
    if (blockLength % 2 === 1) {
      reader.skip(1, `tagged block ${key} padding`);
    }
  }
  if (reader.position > sectionEnd) {
    reader.fail("layer section overruns its length");
  }
  reader.seek(sectionEnd, "layer section end");
  return { layers, unicodeNames };
}

/**
 * Parse the trailing composite image (planar full-canvas channels) used
 * when a file carries no importable pixel layers. The section runs to the
 * end of the file: raw planes have computable sizes, RLE planes are framed
 * by the upfront row counts, and ZIP covers all planes in one stream.
 */
async function parsePsdComposite(
  reader: GnumarusPsdReader,
  header: GnumarusPsdHeader,
): Promise<Map<number, Uint8Array>> {
  const compression = reader.u16("composite compression");
  if (
    compression !== PSD_COMPRESSION_RAW &&
    compression !== PSD_COMPRESSION_RLE &&
    compression !== PSD_COMPRESSION_ZIP &&
    compression !== PSD_COMPRESSION_ZIP_PREDICTED
  ) {
    reader.fail(`unsupported composite compression ${compression}`);
  }
  const { width, height, depth, channels } = header;
  const planes = new Map<number, Uint8Array>();
  if (compression === PSD_COMPRESSION_RAW) {
    const planeBytes = width * height * (depth === 8 ? 1 : 2);
    for (let channel = 0; channel < channels; channel += 1) {
      planes.set(
        channel,
        await decodePsdPlane(
          reader.bytes(planeBytes, `composite channel ${channel + 1}`),
          compression,
          width,
          height,
          depth,
          null,
          `composite channel ${channel + 1}`,
        ),
      );
    }
    return planes;
  }
  if (compression === PSD_COMPRESSION_RLE) {
    const counts: number[] = [];
    for (let row = 0; row < height * channels; row += 1) {
      counts.push(reader.u16("composite row length"));
    }
    const rest = reader.bytes(reader.remaining(), "composite image data");
    let pos = 0;
    for (let channel = 0; channel < channels; channel += 1) {
      const planeCounts = counts.slice(channel * height, (channel + 1) * height);
      let planeLength = 0;
      for (const count of planeCounts) {
        planeLength += count;
      }
      const payload = rest.subarray(pos, pos + planeLength);
      if (payload.length < planeLength) {
        reader.fail(`truncated composite channel ${channel + 1}`);
      }
      planes.set(
        channel,
        await decodePsdPlane(payload, compression, width, height, depth, planeCounts, `composite channel ${channel + 1}`),
      );
      pos += planeLength;
    }
    return planes;
  }
  const payload = reader.bytes(reader.remaining(), "composite image data");
  const inflated = await inflatePsdZlib(payload, "composite image");
  if (depth === 8) {
    const expected = channels * width * height;
    if (inflated.length !== expected) {
      throw new GnumarusPsdError(
        `Photoshop file: composite ZIP decoded to ${inflated.length} bytes, expected ${expected}`,
      );
    }
    for (let channel = 0; channel < channels; channel += 1) {
      const plane = inflated.slice(channel * width * height, (channel + 1) * width * height);
      if (compression === PSD_COMPRESSION_ZIP_PREDICTED) {
        undoPsdPrediction(plane, width);
      }
      planes.set(channel, plane);
    }
    return planes;
  }
  if (compression === PSD_COMPRESSION_ZIP_PREDICTED) {
    throw new GnumarusPsdError("Photoshop file: ZIP prediction with 16-bit depth is not supported in composite image");
  }
  const expected = channels * width * height * 2;
  for (let channel = 0; channel < channels; channel += 1) {
    planes.set(
      channel,
      msbOfPsdSamples(inflated.slice(channel * width * height * 2, (channel + 1) * width * height * 2), width * height, `composite channel ${channel + 1}`),
    );
  }
  if (inflated.length !== expected) {
    throw new GnumarusPsdError(
      `Photoshop file: composite ZIP decoded to ${inflated.length} bytes, expected ${expected}`,
    );
  }
  return planes;
}

export async function parsePsdFile(bytes: Uint8Array): Promise<GnumarusPsdDocument> {
  const reader = new GnumarusPsdReader(bytes, "Photoshop file");
  const header = await parsePsdHeader(reader);
  const sectionLength = reader.u32("layer section length");
  const sectionEnd = reader.position + sectionLength;
  if (sectionEnd > bytes.length) {
    reader.fail("layer section overruns the file");
  }
  let unicodeNames: string[] | null = null;
  const fileOrder: GnumarusPsdPixelLayer[] = [];
  if (sectionLength > 0) {
    const { layers, unicodeNames: parsedNames } = await parsePsdLayers(reader, sectionEnd, header.depth);
    unicodeNames = parsedNames;
    for (let index = 0; index < layers.length; index += 1) {
      const entry = layers[index];
      if (entry === undefined) {
        continue;
      }
      const width = entry.record.right - entry.record.left;
      const height = entry.record.bottom - entry.record.top;
      if (width < 1 || height < 1 || entry.planes.size === 0) {
        continue;
      }
      if (width > PSD_MAX_LAYER_DIMENSION || height > PSD_MAX_LAYER_DIMENSION) {
        reader.fail(`layer ${index + 1} is larger than the ${PSD_MAX_LAYER_DIMENSION}px import limit`);
      }
      fileOrder.push({
        name: unicodeNames?.[index] ?? entry.record.name,
        opacity: entry.record.opacity / 255,
        visible: (entry.record.flags & PSD_LAYER_FLAG_HIDDEN) === 0,
        left: entry.record.left,
        top: entry.record.top,
        width,
        height,
        buffer: assemblePsdLayerBuffer(entry.planes, header.mode, header.colorTable, width, height),
      });
    }
  } else {
    reader.seek(sectionEnd, "layer section end");
  }
  if (fileOrder.length === 0) {
    const composite = await parsePsdComposite(reader, header);
    // Composite planes arrive in channel order; remap them onto channel
    // ids (the fourth RGB plane, when present, is the transparency mask).
    const remapped = new Map<number, Uint8Array>();
    const order = header.mode === PSD_MODE_GRAYSCALE ? [PSD_CHANNEL_RED, PSD_CHANNEL_TRANSPARENCY] : [PSD_CHANNEL_RED, PSD_CHANNEL_GREEN, PSD_CHANNEL_BLUE, PSD_CHANNEL_TRANSPARENCY];
    composite.forEach((plane, index) => {
      const id = order[index];
      if (id !== undefined && !remapped.has(id)) {
        remapped.set(id, plane);
      }
    });
    fileOrder.push({
      name: "Background",
      opacity: 1,
      visible: true,
      left: 0,
      top: 0,
      width: header.width,
      height: header.height,
      buffer: assemblePsdLayerBuffer(remapped, header.mode, header.colorTable, header.width, header.height),
    });
  }
  // File order is top layer first; the engine stacks bottom layer first.
  const ordered = fileOrder.reverse();
  const layers: GnumarusPsdLayer[] = [];
  const textures: GnumarusTexturePixels[] = [];
  const contents: GnumarusPsdContent[] = [];
  const cells: GnumarusPsdCell[] = [];
  const unlocked: GnumarusChannelLock = { r: false, g: false, b: false, a: false };
  ordered.forEach((pixelLayer, index) => {
    const layerId = `layer${index}`;
    const textureId = `texture${index}`;
    const contentId = `content${index}`;
    const name = pixelLayer.name.trim() === "" ? `L${index + 1}` : pixelLayer.name.trim().slice(0, 64);
    layers.push({ id: layerId, name, visible: pixelLayer.visible, opacity: pixelLayer.opacity, lockedChannels: { ...unlocked } });
    textures.push({
      id: textureId,
      name: `t${index + 1}`,
      width: pixelLayer.width,
      height: pixelLayer.height,
      buffer: pixelLayer.buffer,
    });
    contents.push({
      id: contentId,
      name: `C${index + 1}`,
      textureId,
      transform: {
        ...IDENTITY_LAYER_TRANSFORM,
        x: pixelLayer.left + pixelLayer.width / 2 - header.width / 2,
        y: pixelLayer.top + pixelLayer.height / 2 - header.height / 2,
      },
    });
    cells.push({ layer: layerId, frame: 0, content: contentId });
  });
  return { width: header.width, height: header.height, layers, textures, contents, cells };
}
