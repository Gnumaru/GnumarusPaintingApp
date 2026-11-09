/**
 * GIMP (.xcf) import.
 *
 * Strict big-endian parser implemented from a self-authored description of
 * the XCF file format (format facts only; no GIMP source code is used here).
 * Every structural violation throws GnumarusXcfError with a precise byte
 * offset, so corrupt files are rejected instead of producing wrong pixels.
 *
 * File layout (all multi-byte integers big-endian; offsets are 4 bytes for
 * file versions below 11 and 8 bytes otherwise):
 * - 14-byte magic: "gimp xcf " followed by "file" (version 0) or
 *   "v%03d" plus a NUL byte (versions 1 and up).
 * - Image header: width, height, base type (int32 each; 0 RGB, 1 gray,
 *   2 indexed), plus a precision int32 for versions >= 4 (only 8-bit
 *   precisions are supported).
 * - Image properties: repeated (u32 type, u32 size, size payload bytes)
 *   triplets terminated by type 0. Consumed: compression (1 byte: 0 raw,
 *   1 RLE) and the indexed colormap (u32 count + 3 bytes per color).
 * - Layer offset list: offsets terminated by a zero offset. Channel
 *   offsets that follow are ignored entirely.
 * - Per layer at its offset: width, height, layer type (int32 each; 0 RGB,
 *   1 RGBA, 2 gray, 3 gray+alpha, 4 indexed, 5 indexed+alpha), Pascal-style
 *   name (u32 length including the NUL terminator), then properties until
 *   type 0. Consumed: pixel offsets (2x int32), opacity (u32 0-255),
 *   float opacity (float32, wins over the integer one), visibility
 *   (nonzero u32), alpha channel lock, and the group marker (group layers
 *   are skipped so groups flatten away). Then a hierarchy offset, a mask
 *   offset (ignored) and, for versions >= 20, an effects offset (ignored).
 * - Hierarchy: width, height, bytes-per-pixel (int32 each, must match the
 *   layer), then one mip level offset. The level repeats the dimensions and
 *   holds a row-major grid of 64x64 tile offsets (last row/column may be
 *   partial); a zero first offset means the whole level is transparent.
 * - Tiles: raw interleaved bytes when uncompressed, or per-component planar
 *   RLE streams (see decodeRleTile): byte 0-126 repeats the next byte
 *   (value + 1) times, byte 127 prefixes a 16-bit big-endian repeat count,
 *   byte 128 prefixes a 16-bit big-endian literal length, and bytes
 *   129-255 copy (256 - value) literal bytes.
 *
 * Imported: canvas size, pixel layers (RGB/RGBA/gray/gray+alpha/indexed/
 * indexed+alpha, with the image colormap applied to indexed layers),
 * per-layer offsets via a centered transform like the PSD importer,
 * visibility, opacity and alpha channel locks, layer names (single-frame
 * animation, bottom layer first). Short default names (L/T/C plus index)
 * mirror the PSD importer.
 *
 * Ignored (no equivalent in this app): blend modes (everything composites
 * normal), layer masks, channels/selection masks, guides, paths, vectors,
 * parasites, text/vector layers (their pixels are out of scope),
 * resolutions/units/tattoos, precision above 8-bit, zlib/fractal
 * compression, group containers (flattened away) and versions above 12.
 */
import {
  type GnumarusTexturePixels,
} from "../animation/GnumarusAnimationModel";
import type { GnumarusChannelLock } from "../canvas/GnumarusPixelBuffer";
import {
  IDENTITY_LAYER_TRANSFORM,
  type GnumarusLayerTransform,
} from "../canvas/GnumarusViewportMath";

export class GnumarusXcfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GnumarusXcfError";
  }
}

export interface GnumarusXcfLayer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  lockedChannels: GnumarusChannelLock;
}

export interface GnumarusXcfContent {
  id: string;
  name: string;
  textureId: string;
  transform: GnumarusLayerTransform;
}

export interface GnumarusXcfCell {
  layer: string;
  frame: number;
  content: string;
}

export interface GnumarusXcfDocument {
  width: number;
  height: number;
  layers: GnumarusXcfLayer[];
  textures: GnumarusTexturePixels[];
  contents: GnumarusXcfContent[];
  cells: GnumarusXcfCell[];
}

const XCF_MAGIC_PREFIX = "gimp xcf ";
const XCF_MAGIC_LENGTH = 14;
const XCF_MIN_VERSION = 0;
const XCF_MAX_VERSION = 12;
const XCF_OFFSET_THRESHOLD_64BIT = 11;
const XCF_EFFECTS_OFFSET_VERSION = 20;

const XCF_MAX_DIMENSION = 4096;
const XCF_MAX_LAYER_DIMENSION = 8192;
const XCF_MAX_LAYERS = 4096;
const XCF_TILE_SIZE = 64;
const XCF_TILE_MAX_DATA_FACTOR = 1.5;
const XCF_MAX_NAME_BYTES = 1 << 20;

const XCF_BASE_RGB = 0;
const XCF_BASE_GRAY = 1;
const XCF_BASE_INDEXED = 2;

const XCF_TYPE_RGB = 0;
const XCF_TYPE_RGBA = 1;
const XCF_TYPE_GRAY = 2;
const XCF_TYPE_GRAYA = 3;
const XCF_TYPE_INDEXED = 4;
const XCF_TYPE_INDEXEDA = 5;

const XCF_COMPRESSION_NONE = 0;
const XCF_COMPRESSION_RLE = 1;

const XCF_PROP_END = 0;
const XCF_PROP_COLORMAP = 1;
const XCF_PROP_VISIBLE = 8;
const XCF_PROP_OFFSETS = 15;
const XCF_PROP_OPACITY = 6;
const XCF_PROP_COMPRESSION = 17;
const XCF_PROP_GROUP_ITEM = 29;
const XCF_PROP_FLOAT_OPACITY = 33;
const XCF_PROP_LOCK_ALPHA = 10;

/** Bounds-checked big-endian cursor over the file bytes. */
class GnumarusXcfReader {
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

  get length(): number {
    return this.data.length;
  }

  fail(reason: string): never {
    throw new GnumarusXcfError(`${this.label}: ${reason} (byte ${this.cursor} of ${this.data.length})`);
  }

  private need(count: number, what: string): void {
    if (!Number.isInteger(count) || count < 0 || this.cursor + count > this.data.length) {
      this.fail(`truncated ${what}`);
    }
  }

  seek(position: number, what: string): void {
    if (!Number.isInteger(position) || position < 0 || position > this.data.length) {
      this.fail(`invalid ${what}`);
    }
    this.cursor = position;
  }

  /** Bytes from an absolute position to the end of the file. */
  remainingFrom(position: number): number {
    if (!Number.isInteger(position) || position < 0 || position > this.data.length) {
      this.fail("invalid file position");
    }
    return this.data.length - position;
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

  f32(what: string): number {
    this.need(4, what);
    const value = this.view.getFloat32(this.cursor, false);
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

  /** File offset: 32 bits before version 11, 64 bits after. */
  offset(is64Bit: boolean, what: string): number {
    if (!is64Bit) {
      return this.u32(what);
    }
    this.need(8, what);
    const value = this.view.getBigUint64(this.cursor, false);
    this.cursor += 8;
    if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
      this.fail(`invalid ${what}`);
    }
    return Number(value);
  }

  /** NUL-terminated UTF-8 string prefixed by its byte length including the NUL. */
  text(what: string): string {
    const length = this.u32(`${what} length`);
    if (length === 0) {
      return "";
    }
    if (length > XCF_MAX_NAME_BYTES) {
      this.fail(`oversized ${what}`);
    }
    const raw = this.bytes(length, what);
    if (raw[length - 1] !== 0) {
      this.fail(`unterminated ${what}`);
    }
    return new TextDecoder("utf-8", { fatal: false }).decode(raw.subarray(0, length - 1));
  }
}

interface GnumarusXcfProperty {
  type: number;
  size: number;
  valueOffset: number;
}

/** Read one (type, size) property header; returns null on the terminator. */
function readPropertyHeader(reader: GnumarusXcfReader): GnumarusXcfProperty | null {
  const type = reader.u32("property type");
  const size = reader.u32("property size");
  if (type === XCF_PROP_END) {
    return null;
  }
  return { type, size, valueOffset: reader.position };
}

/** Skip whatever remains of the current property payload. */
function skipPropertyRest(reader: GnumarusXcfReader, property: GnumarusXcfProperty, consumed: number): void {
  const rest = property.size - consumed;
  if (rest < 0) {
    reader.fail("property overrun");
  }
  if (rest > 0) {
    reader.skip(rest, "property padding");
  }
}

interface GnumarusXcfImageProps {
  compression: number;
  colormap: number[] | null;
}

/** Parse the image-level properties; unknown entries are skipped by size. */
function readImageProperties(reader: GnumarusXcfReader, version: number): GnumarusXcfImageProps {
  void version;
  let compression = XCF_COMPRESSION_NONE;
  let colormap: number[] | null = null;
  for (;;) {
    const property = readPropertyHeader(reader);
    if (property === null) {
      return { compression, colormap };
    }
    if (property.type === XCF_PROP_COMPRESSION) {
      if (property.size < 1) {
        reader.fail("invalid compression property size");
      }
      compression = reader.u8("compression type");
      if (compression !== XCF_COMPRESSION_NONE && compression !== XCF_COMPRESSION_RLE) {
        reader.fail(`unsupported compression ${compression}`);
      }
      skipPropertyRest(reader, property, 1);
    } else if (property.type === XCF_PROP_COLORMAP) {
      if (property.size < 4) {
        reader.fail("invalid colormap property size");
      }
      const count = reader.u32("colormap entry count");
      if (4 + count * 3 > property.size) {
        reader.fail("invalid colormap property size");
      }
      const palette: number[] = [];
      for (let i = 0; i < count; i += 1) {
        const entry = reader.bytes(3, "colormap entry");
        palette.push(entry[0] ?? 0, entry[1] ?? 0, entry[2] ?? 0);
      }
      skipPropertyRest(reader, property, 4 + count * 3);
      colormap = palette;
    } else {
      reader.skip(property.size, `image property ${property.type}`);
    }
  }
}

interface GnumarusXcfLayerHeader {
  width: number;
  height: number;
  kind: number;
  name: string;
  offsetX: number;
  offsetY: number;
  opacity: number;
  visible: boolean;
  lockAlpha: boolean;
  isGroup: boolean;
}

/** Parse one layer record header; leaves the cursor after the mask offset (and effects offset on v20+). */
function readLayerHeader(reader: GnumarusXcfReader): GnumarusXcfLayerHeader {
  const width = reader.i32("layer width");
  const height = reader.i32("layer height");
  const kind = reader.i32("layer type");
  if (width < 1 || height < 1 || width > XCF_MAX_LAYER_DIMENSION || height > XCF_MAX_LAYER_DIMENSION) {
    reader.fail(`invalid layer dimensions ${width}x${height}`);
  }
  if (
    kind !== XCF_TYPE_RGB &&
    kind !== XCF_TYPE_RGBA &&
    kind !== XCF_TYPE_GRAY &&
    kind !== XCF_TYPE_GRAYA &&
    kind !== XCF_TYPE_INDEXED &&
    kind !== XCF_TYPE_INDEXEDA
  ) {
    reader.fail(`unsupported layer type ${kind}`);
  }
  const name = reader.text("layer name");
  let offsetX = 0;
  let offsetY = 0;
  let opacity = 1;
  let visible = true;
  let lockAlpha = false;
  let isGroup = false;
  for (;;) {
    const property = readPropertyHeader(reader);
    if (property === null) {
      break;
    }
    if (property.type === XCF_PROP_OFFSETS) {
      if (property.size < 8) {
        reader.fail("invalid offsets property size");
      }
      offsetX = reader.i32("layer offset x");
      offsetY = reader.i32("layer offset y");
      skipPropertyRest(reader, property, 8);
    } else if (property.type === XCF_PROP_OPACITY) {
      if (property.size < 4) {
        reader.fail("invalid opacity property size");
      }
      opacity = Math.min(1, Math.max(0, reader.u32("layer opacity") / 255));
      skipPropertyRest(reader, property, 4);
    } else if (property.type === XCF_PROP_FLOAT_OPACITY) {
      if (property.size < 4) {
        reader.fail("invalid float opacity property size");
      }
      const value = reader.f32("layer float opacity");
      opacity = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 1;
      skipPropertyRest(reader, property, 4);
    } else if (property.type === XCF_PROP_VISIBLE) {
      if (property.size < 4) {
        reader.fail("invalid visibility property size");
      }
      visible = reader.u32("layer visibility") !== 0;
      skipPropertyRest(reader, property, 4);
    } else if (property.type === XCF_PROP_LOCK_ALPHA) {
      if (property.size < 4) {
        reader.fail("invalid alpha lock property size");
      }
      lockAlpha = reader.u32("layer alpha lock") !== 0;
      skipPropertyRest(reader, property, 4);
    } else if (property.type === XCF_PROP_GROUP_ITEM) {
      isGroup = true;
      reader.skip(property.size, "group marker");
    } else {
      reader.skip(property.size, `layer property ${property.type}`);
    }
  }
  return { width, height, kind, name, offsetX, offsetY, opacity, visible, lockAlpha, isGroup };
}

/** Bytes per pixel for an 8-bit layer type, or -1 when the type is unknown here. */
function bytesPerPixel(kind: number): number {
  if (kind === XCF_TYPE_RGB) {
    return 3;
  }
  if (kind === XCF_TYPE_RGBA) {
    return 4;
  }
  if (kind === XCF_TYPE_GRAY) {
    return 1;
  }
  if (kind === XCF_TYPE_GRAYA) {
    return 2;
  }
  if (kind === XCF_TYPE_INDEXED) {
    return 1;
  }
  return 2;
}

/**
 * Decode one planar RLE tile stream into interleaved row-major pixels.
 * Per component, the stream is a sequence of runs over width*height samples:
 * a byte 0..126 repeats the next byte (value + 1) times, 127 prefixes a
 * 16-bit big-endian repeat count, 128 prefixes a 16-bit big-endian literal
 * length, and bytes 129..255 copy (256 - value) literal bytes.
 */
function decodeRleTile(
  data: Uint8Array,
  dataOffset: number,
  tileWidth: number,
  tileHeight: number,
  bpp: number,
): Uint8Array {
  const samples = tileWidth * tileHeight;
  const out = new Uint8Array(samples * bpp);
  let cursor = dataOffset;
  const end = dataOffset + data.length;
  const fail = (reason: string): never => {
    throw new GnumarusXcfError(`${reason} (byte ${Math.min(cursor, end)} of ${end})`);
  };
  const takeByte = (): number => {
    if (cursor >= end) {
      fail("truncated RLE tile data");
    }
    const value = data[cursor] ?? 0;
    cursor += 1;
    return value;
  };
  const takeLength = (token: number): number => {
    if (token !== 128) {
      return token;
    }
    if (cursor + 2 > end) {
      fail("truncated RLE run length");
    }
    const value = ((data[cursor] ?? 0) << 8) | (data[cursor + 1] ?? 0);
    cursor += 2;
    return value;
  };
  for (let component = 0; component < bpp; component += 1) {
    let remaining = samples;
    let plane = component;
    while (remaining > 0) {
      const token = takeByte();
      if (token >= 128) {
        let length = 256 - token;
        if (length === 128) {
          length = takeLength(token);
        }
        if (length <= 0 || length > remaining) {
          fail("invalid RLE literal run");
        }
        for (let i = 0; i < length; i += 1) {
          out[plane] = takeByte();
          plane += bpp;
        }
        remaining -= length;
      } else {
        let length = takeLength(token + 1);
        if (length <= 0 || length > remaining) {
          fail("invalid RLE repeat run");
        }
        const value = takeByte();
        for (let i = 0; i < length; i += 1) {
          out[plane] = value;
          plane += bpp;
        }
        remaining -= length;
      }
    }
  }
  return out;
}

interface GnumarusXcfTileGrid {
  width: number;
  height: number;
  pixels: Uint8Array;
  bytesPerPixel: number;
}

/** Read the level tile list at an absolute offset; first offset zero means fully transparent. */
function readPixelTiles(
  reader: GnumarusXcfReader,
  is64Bit: boolean,
  levelOffset: number,
  width: number,
  height: number,
  bpp: number,
  compression: number,
  label: string,
): GnumarusXcfTileGrid {
  const maxTileBytes = Math.floor(XCF_TILE_SIZE * XCF_TILE_SIZE * bpp * XCF_TILE_MAX_DATA_FACTOR);
  const pixels = new Uint8Array(width * height * bpp);
  const readOffset = (): number => reader.offset(is64Bit, `${label} tile offset`);
  reader.seek(levelOffset, `${label} level`);
  const levelWidth = reader.i32(`${label} level width`);
  const levelHeight = reader.i32(`${label} level height`);
  if (levelWidth !== width || levelHeight !== height) {
    reader.fail(`${label} level size ${levelWidth}x${levelHeight} does not match ${width}x${height}`);
  }
  let offset = readOffset();
  if (offset === 0) {
    return { width, height, pixels, bytesPerPixel: bpp };
  }
  const columns = Math.ceil(width / XCF_TILE_SIZE);
  const rows = Math.ceil(height / XCF_TILE_SIZE);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      if (offset === 0) {
        reader.fail(`missing ${label} tile ${column},${row}`);
      }
      const next = readOffset();
      const saved = reader.position;
      let length: number;
      if (next === 0) {
        length = Math.min(maxTileBytes, reader.remainingFrom(offset));
      } else {
        if (next <= offset || next > reader.length) {
          reader.fail(`invalid ${label} tile data length`);
        }
        length = next - offset;
        if (length > maxTileBytes) {
          reader.fail(`invalid ${label} tile data length`);
        }
      }
      if (length <= 0) {
        reader.fail(`truncated ${label} tile ${column},${row}`);
      }
      const tileWidth = Math.min(XCF_TILE_SIZE, width - column * XCF_TILE_SIZE);
      const tileHeight = Math.min(XCF_TILE_SIZE, height - row * XCF_TILE_SIZE);
      reader.seek(offset, `${label} tile ${column},${row} data`);
      const raw = reader.bytes(length, `${label} tile ${column},${row} data`);
      let tile: Uint8Array;
      if (compression === XCF_COMPRESSION_NONE) {
        if (raw.length < tileWidth * tileHeight * bpp) {
          reader.fail(`truncated ${label} tile ${column},${row}`);
        }
        tile = raw.subarray(0, tileWidth * tileHeight * bpp);
      } else {
        tile = decodeRleTile(raw, 0, tileWidth, tileHeight, bpp);
      }
      for (let y = 0; y < tileHeight; y += 1) {
        const src = y * tileWidth * bpp;
        const dst = ((row * XCF_TILE_SIZE + y) * width + column * XCF_TILE_SIZE) * bpp;
        pixels.set(tile.subarray(src, src + tileWidth * bpp), dst);
      }
      reader.seek(saved, `${label} tile list`);
      offset = next;
    }
  }
  if (offset !== 0) {
    reader.fail(`garbage after ${label} level`);
  }
  return { width, height, pixels, bytesPerPixel: bpp };
}

/** Assemble interleaved RLE/raw tile planes into an RGBA buffer. */
function renderLayerBuffer(
  grid: GnumarusXcfTileGrid,
  kind: number,
  colormap: number[] | null,
  label: string,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(grid.width * grid.height * 4);
  const fail = (reason: string): never => {
    throw new GnumarusXcfError(`${label}: ${reason}`);
  };
  const indexed = kind === XCF_TYPE_INDEXED || kind === XCF_TYPE_INDEXEDA;
  if (indexed && colormap === null) {
    fail("indexed layer without a colormap");
  }
  const palette = colormap ?? [];
  for (let i = 0; i < grid.width * grid.height; i += 1) {
    const src = i * grid.bytesPerPixel;
    const dst = i * 4;
    if (kind === XCF_TYPE_RGB) {
      out[dst] = grid.pixels[src] ?? 0;
      out[dst + 1] = grid.pixels[src + 1] ?? 0;
      out[dst + 2] = grid.pixels[src + 2] ?? 0;
      out[dst + 3] = 255;
    } else if (kind === XCF_TYPE_RGBA) {
      out[dst] = grid.pixels[src] ?? 0;
      out[dst + 1] = grid.pixels[src + 1] ?? 0;
      out[dst + 2] = grid.pixels[src + 2] ?? 0;
      out[dst + 3] = grid.pixels[src + 3] ?? 0;
    } else if (kind === XCF_TYPE_GRAY) {
      const v = grid.pixels[src] ?? 0;
      out[dst] = v;
      out[dst + 1] = v;
      out[dst + 2] = v;
      out[dst + 3] = 255;
    } else if (kind === XCF_TYPE_GRAYA) {
      const v = grid.pixels[src] ?? 0;
      out[dst] = v;
      out[dst + 1] = v;
      out[dst + 2] = v;
      out[dst + 3] = grid.pixels[src + 1] ?? 0;
    } else {
      const index = grid.pixels[src] ?? 0;
      if (index * 3 + 2 >= palette.length) {
        fail(`palette index ${index} out of range`);
      }
      out[dst] = palette[index * 3] ?? 0;
      out[dst + 1] = palette[index * 3 + 1] ?? 0;
      out[dst + 2] = palette[index * 3 + 2] ?? 0;
      out[dst + 3] = kind === XCF_TYPE_INDEXEDA ? (grid.pixels[src + 1] ?? 0) : 255;
    }
  }
  return out;
}

export async function parseXcfFile(bytes: Uint8Array): Promise<GnumarusXcfDocument> {
  const reader = new GnumarusXcfReader(bytes, "GIMP XCF");
  const magic = reader.bytes(XCF_MAGIC_LENGTH, "magic");
  const prefix = String.fromCharCode(...magic.subarray(0, 9));
  if (prefix !== XCF_MAGIC_PREFIX) {
    reader.fail("not a GIMP XCF file");
  }
  let version = -1;
  if (
    magic[9] === 0x66 &&
    magic[10] === 0x69 &&
    magic[11] === 0x6c &&
    magic[12] === 0x65 &&
    magic[13] === 0
  ) {
    version = 0;
  } else if (
    magic[9] === 0x76 &&
    magic[10] >= 0x30 &&
    magic[10] <= 0x39 &&
    magic[11] >= 0x30 &&
    magic[11] <= 0x39 &&
    magic[12] >= 0x30 &&
    magic[12] <= 0x39 &&
    magic[13] === 0
  ) {
    version = (magic[10] - 0x30) * 100 + (magic[11] - 0x30) * 10 + (magic[12] - 0x30);
  } else {
    reader.fail("invalid XCF version tag");
  }
  if (version < XCF_MIN_VERSION || version > XCF_MAX_VERSION) {
    reader.fail(`unsupported XCF version ${version}`);
  }
  const is64Bit = version >= XCF_OFFSET_THRESHOLD_64BIT;
  const width = reader.i32("canvas width");
  const height = reader.i32("canvas height");
  if (width < 1 || height < 1 || width > XCF_MAX_DIMENSION || height > XCF_MAX_DIMENSION) {
    reader.fail(`invalid canvas size ${width}x${height}`);
  }
  const baseType = reader.i32("image type");
  if (baseType !== XCF_BASE_RGB && baseType !== XCF_BASE_GRAY && baseType !== XCF_BASE_INDEXED) {
    reader.fail(`unsupported image type ${baseType}`);
  }
  if (version >= 4) {
    const precision = reader.i32("precision");
    const isEightBit =
      version === 4
        ? precision === 0
        : version <= 6
          ? precision === 100 || precision === 150
          : precision === 100 || precision === 150 || precision === 175;
    if (!isEightBit) {
      reader.fail(`only 8-bit images are supported (precision ${precision})`);
    }
  }
  const imageProps = readImageProperties(reader, version);
  interface GnumarusXcfFileLayer {
    name: string;
    visible: boolean;
    opacity: number;
    lockAlpha: boolean;
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
    buffer: Uint8ClampedArray;
  }
  const fileLayers: GnumarusXcfFileLayer[] = [];
  for (;;) {
    const layerOffset = reader.offset(is64Bit, "layer offset");
    if (layerOffset === 0) {
      break;
    }
    if (layerOffset < reader.position || layerOffset >= bytes.length) {
      reader.fail("invalid layer offset");
    }
    if (fileLayers.length >= XCF_MAX_LAYERS) {
      reader.fail("too many layers");
    }
    const saved = reader.position;
    reader.seek(layerOffset, "layer header");
    const header = readLayerHeader(reader);
    const hierarchyOffset = reader.offset(is64Bit, "layer hierarchy offset");
    const maskOffset = reader.offset(is64Bit, "layer mask offset");
    void maskOffset;
    if (version >= XCF_EFFECTS_OFFSET_VERSION) {
      reader.offset(is64Bit, "layer effects offset");
    }
    if (header.isGroup) {
      reader.seek(saved, "layer list");
      continue;
    }
    if (hierarchyOffset === 0 || hierarchyOffset < reader.position || hierarchyOffset >= bytes.length) {
      reader.fail("invalid layer hierarchy offset");
    }
    const expectedBpp = bytesPerPixel(header.kind);
    reader.seek(hierarchyOffset, "layer hierarchy");
    const hierarchyWidth = reader.i32("hierarchy width");
    const hierarchyHeight = reader.i32("hierarchy height");
    const hierarchyBpp = reader.i32("hierarchy bytes per pixel");
    if (hierarchyWidth !== header.width || hierarchyHeight !== header.height) {
      reader.fail("layer hierarchy size does not match layer size");
    }
    if (hierarchyBpp !== expectedBpp) {
      reader.fail(`layer hierarchy bpp ${hierarchyBpp} does not match layer type`);
    }
    const levelOffset = reader.offset(is64Bit, "hierarchy level offset");
    if (levelOffset === 0 || levelOffset < reader.position || levelOffset >= bytes.length) {
      reader.fail("invalid hierarchy level offset");
    }
    const grid = readPixelTiles(
      reader,
      is64Bit,
      levelOffset,
      header.width,
      header.height,
      expectedBpp,
      imageProps.compression,
      `layer ${fileLayers.length}`,
    );
    const buffer = renderLayerBuffer(grid, header.kind, imageProps.colormap, `layer ${header.name}`);
    fileLayers.push({
      name: header.name,
      visible: header.visible,
      opacity: header.opacity,
      lockAlpha: header.lockAlpha,
      width: header.width,
      height: header.height,
      offsetX: header.offsetX,
      offsetY: header.offsetY,
      buffer,
    });
    reader.seek(saved, "layer list");
  }
  if (fileLayers.length === 0) {
    reader.fail("no importable layers");
  }
  // File order is top layer first; the engine stacks bottom layer first.
  const ordered = fileLayers.reverse();
  const layers: GnumarusXcfLayer[] = [];
  const textures: GnumarusTexturePixels[] = [];
  const contents: GnumarusXcfContent[] = [];
  const cells: GnumarusXcfCell[] = [];
  const unlocked: GnumarusChannelLock = { r: false, g: false, b: false, a: false };
  ordered.forEach((pixelLayer, index) => {
    const layerId = `layer${index}`;
    const textureId = `texture${index}`;
    const contentId = `content${index}`;
    const trimmed = pixelLayer.name.trim();
    const displayName = trimmed === "" ? `L${index + 1}` : trimmed.slice(0, 64);
    layers.push({
      id: layerId,
      name: displayName,
      visible: pixelLayer.visible,
      opacity: pixelLayer.opacity,
      lockedChannels: pixelLayer.lockAlpha ? { ...unlocked, a: true } : { ...unlocked },
    });
    textures.push({
      id: textureId,
      name: `T${index + 1}`,
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
        x: pixelLayer.offsetX + pixelLayer.width / 2 - width / 2,
        y: pixelLayer.offsetY + pixelLayer.height / 2 - height / 2,
      },
    });
    cells.push({ layer: layerId, frame: 0, content: contentId });
  });
  return { width, height, layers, textures, contents, cells };
}
