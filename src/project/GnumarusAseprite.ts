/**
 * Aseprite (.ase/.aseprite) import.
 *
 * Strict little-endian parser implemented from the published
 * ase-file-specs document (format facts only; no Aseprite source code
 * is used here). Every structural violation throws GnumarusAsepriteError,
 * so truncated, mislabeled or otherwise corrupt files are rejected with a
 * precise byte offset instead of producing wrong pixels.
 *
 * Imported subset: canvas size, image layers (reference layers included,
 * groups flattened away, tilemaps skipped), layer visibility and opacity,
 * frames with per-frame durations, raw and zlib-compressed cels in RGBA /
 * grayscale / indexed color (palette tracked progressively, transparent
 * index honored on non-background layers), linked cels resolved into
 * shared cell contents, and frame tags resolved into named animations.
 * Cel opacity is baked into pixel alpha.
 *
 * Ignored (no equivalent in this app): layer blend modes (everything
 * composites normal), per-cel z-index (last cel wins per cell), tag colors,
 * tag repeat counts above one, slices, tilesets/tilemaps, user data, color
 * profiles, cel-extra scaling, pixel aspect ratio.
 *
 * Decompression uses the native DecompressionStream ("deflate"), so no
 * new dependency is needed. Parsing is sequential and releases each
 * zlib output right after its pixels are decoded.
 */
import {
  clampFrameDurationSec,
  GNUMARUS_DEFAULT_FRAME_DURATION_SEC,
  type GnumarusTexturePixels,
} from "../animation/GnumarusAnimationModel";
import type {
  GnumarusAnimationLoop,
  GnumarusNamedAnimation,
} from "../animation/GnumarusNamedAnimations";
import type { GnumarusChannelLock } from "../canvas/GnumarusPixelBuffer";
import {
  IDENTITY_LAYER_TRANSFORM,
  type GnumarusLayerTransform,
} from "../canvas/GnumarusViewportMath";

export class GnumarusAsepriteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GnumarusAsepriteError";
  }
}

export interface GnumarusAsepriteLayer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  lockedChannels: GnumarusChannelLock;
}

export interface GnumarusAsepriteContent {
  id: string;
  name: string;
  textureId: string;
  transform: GnumarusLayerTransform;
}

export interface GnumarusAsepriteCell {
  layer: string;
  frame: number;
  content: string;
}

export interface GnumarusAsepriteDocument {
  width: number;
  height: number;
  layers: GnumarusAsepriteLayer[];
  textures: GnumarusTexturePixels[];
  contents: GnumarusAsepriteContent[];
  cells: GnumarusAsepriteCell[];
  frames: number;
  defaultFrameDuration: number;
  frameDurations: Array<{ frame: number; duration: number }>;
  namedAnimations: GnumarusNamedAnimation[];
}

const ASE_MAGIC = 0xa5e0;
const ASE_FRAME_MAGIC = 0xf1fa;
const ASE_HEADER_SIZE = 128;
const ASE_FRAME_HEADER_SIZE = 16;
const ASE_MIN_CHUNK_SIZE = 6;
const ASE_MAX_DIMENSION = 4096;
const ASE_MAX_FRAMES = 10000;
const ASE_MAX_PALETTE_SIZE = 4096;

const ASE_CHUNK_OLD_PALETTE_4 = 0x0004;
const ASE_CHUNK_OLD_PALETTE_11 = 0x0011;
const ASE_CHUNK_LAYER = 0x2004;
const ASE_CHUNK_CEL = 0x2005;
const ASE_CHUNK_PALETTE = 0x2019;
const ASE_CHUNK_TAGS = 0x2018;

const ASE_TAG_LOOP_FORWARD = 0;
const ASE_TAG_LOOP_REVERSE = 1;
const ASE_TAG_LOOP_PING_PONG = 2;
const ASE_TAG_LOOP_PING_PONG_REVERSE = 3;

const ASE_LAYER_TYPE_IMAGE = 0;
const ASE_LAYER_TYPE_GROUP = 1;
const ASE_LAYER_TYPE_TILEMAP = 2;

const ASE_CEL_TYPE_RAW = 0;
const ASE_CEL_TYPE_LINKED = 1;
const ASE_CEL_TYPE_COMPRESSED = 2;
const ASE_CEL_TYPE_TILEMAP = 3;

const ASE_DEPTH_INDEXED = 8;
const ASE_DEPTH_GRAYSCALE = 16;
const ASE_DEPTH_RGBA = 32;

/** Bounds-checked little-endian cursor over the file bytes. */
class GnumarusAseReader {
  private readonly view: DataView;
  private cursor = 0;

  constructor(
    private readonly bytes: Uint8Array,
    private readonly label: string,
  ) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }

  get position(): number {
    return this.cursor;
  }

  get length(): number {
    return this.bytes.length;
  }

  fail(reason: string): never {
    throw new GnumarusAsepriteError(`${this.label}: ${reason} (byte ${this.cursor} of ${this.bytes.length})`);
  }

  setPosition(position: number, what: string): void {
    if (!Number.isInteger(position) || position < 0 || position > this.bytes.length) {
      this.fail(`invalid ${what} offset`);
    }
    this.cursor = position;
  }

  private need(count: number, what: string): void {
    if (!Number.isInteger(count) || count < 0 || count > this.bytes.length - this.cursor) {
      this.fail(`truncated file while reading ${what}`);
    }
  }

  u8(what = "byte"): number {
    this.need(1, what);
    const value = this.view.getUint8(this.cursor);
    this.cursor += 1;
    return value;
  }

  u16(what = "word"): number {
    this.need(2, what);
    const value = this.view.getUint16(this.cursor, true);
    this.cursor += 2;
    return value;
  }

  i16(what = "short"): number {
    this.need(2, what);
    const value = this.view.getInt16(this.cursor, true);
    this.cursor += 2;
    return value;
  }

  u32(what = "dword"): number {
    this.need(4, what);
    const value = this.view.getUint32(this.cursor, true);
    this.cursor += 4;
    return value;
  }

  raw(count: number, what: string): Uint8Array {
    this.need(count, what);
    const view = this.bytes.subarray(this.cursor, this.cursor + count);
    this.cursor += count;
    return view;
  }

  skip(count: number, what: string): void {
    this.need(count, what);
    this.cursor += count;
  }

  string(): string {
    const length = this.u16("string length");
    const bytes = this.raw(length, "string characters");
    return GNUMARUS_ASE_TEXT_DECODER.decode(bytes);
  }
}

const GNUMARUS_ASE_TEXT_DECODER = new TextDecoder("utf-8");

/** Inflate one zlib (RFC1950) blob, rejecting corrupt streams. */
async function inflateAsepriteZlib(compressed: Uint8Array, what: string): Promise<Uint8Array> {
  try {
    const output = await new Response(
      new Blob([compressed.slice()]).stream().pipeThrough(new DecompressionStream("deflate")),
    ).arrayBuffer();
    return new Uint8Array(output);
  } catch (error) {
    throw new GnumarusAsepriteError(
      `Aseprite file: corrupt zlib data in ${what} (${error instanceof Error ? error.message : String(error)})`,
    );
  }
}

interface GnumarusAseLayerSlot {
  /** Null for groups, tilemaps and unknown layer types (no pixels kept). */
  name: string | null;
  visible: boolean;
  opacity: number;
  background: boolean;
}

interface GnumarusAseRawCel {
  layer: number;
  frame: number;
  x: number;
  y: number;
  opacity: number;
  width: number;
  height: number;
  /** Unbaked raw pixels (PIXEL order for the file color depth). */
  pixels: Uint8Array;
}

interface GnumarusAseLinkedCel {
  layer: number;
  frame: number;
  x: number;
  y: number;
  opacity: number;
  linkTo: number;
}

interface GnumarusAseTag {
  name: string;
  /** 0-based first frame. */
  from: number;
  /** 0-based last frame (always >= from). */
  to: number;
  loop: number;
  repeat: number;
}

function asepriteCellKey(layer: number, frame: number): string {
  return `${layer}\n${frame}`;
}

function unlockedChannels(): GnumarusChannelLock {
  return { r: false, g: false, b: false, a: false };
}

/**
 * Parse a complete .ase/.aseprite file into engine-ready project data.
 * Throws GnumarusAsepriteError when the file is not an Aseprite file or
 * any structural check fails.
 */
export async function parseAsepriteFile(data: Uint8Array): Promise<GnumarusAsepriteDocument> {
  const reader = new GnumarusAseReader(data, "Aseprite file");
  if (data.length < ASE_HEADER_SIZE) {
    reader.fail("file is smaller than the 128-byte header");
  }
  const fileSize = reader.u32("file size");
  if (fileSize !== data.length) {
    reader.fail(`declared size ${fileSize} does not match actual size ${data.length}`);
  }
  const magic = reader.u16("magic number");
  if (magic !== ASE_MAGIC) {
    reader.fail(`bad magic 0x${magic.toString(16)} (not an Aseprite file)`);
  }
  const frames = reader.u16("frame count");
  if (frames < 1 || frames > ASE_MAX_FRAMES) {
    reader.fail(`unsupported frame count ${frames}`);
  }
  const width = reader.u16("canvas width");
  const height = reader.u16("canvas height");
  if (width < 1 || width > ASE_MAX_DIMENSION || height < 1 || height > ASE_MAX_DIMENSION) {
    reader.fail(`unsupported canvas size ${width}x${height}`);
  }
  const depth = reader.u16("color depth");
  if (depth !== ASE_DEPTH_INDEXED && depth !== ASE_DEPTH_GRAYSCALE && depth !== ASE_DEPTH_RGBA) {
    reader.fail(`unsupported color depth ${depth}`);
  }
  const headerFlags = reader.u32("header flags");
  const speed = reader.u16("header speed");
  reader.skip(8, "header reserved");
  const transparentIndex = reader.u8("transparent index");
  reader.skip(3, "header reserved");
  reader.u16("color count");
  reader.u8("pixel width");
  reader.u8("pixel height");
  reader.skip(8, "grid geometry");
  reader.skip(84, "header future");
  if (reader.position !== ASE_HEADER_SIZE) {
    reader.fail("header layout mismatch");
  }

  const pixelBytes = depth === ASE_DEPTH_RGBA ? 4 : depth === ASE_DEPTH_GRAYSCALE ? 2 : 1;
  const layerSlots: Array<GnumarusAseLayerSlot | null> = [];
  const rawCels = new Map<string, GnumarusAseRawCel>();
  const linkedCels = new Map<string, GnumarusAseLinkedCel>();
  const tags: GnumarusAseTag[] = [];
  const durations = new Array<number>(frames).fill(
    speed > 0 ? clampFrameDurationSec(speed / 1000) : GNUMARUS_DEFAULT_FRAME_DURATION_SEC,
  );
  const palette = new Map<number, { r: number; g: number; b: number; a: number }>();
  let sawNewPalette = false;

  for (let frame = 0; frame < frames; frame += 1) {
    const frameStart = reader.position;
    const frameSize = reader.u32("frame size");
    if (frameSize < ASE_FRAME_HEADER_SIZE || frameStart + frameSize > data.length) {
      reader.fail(`frame ${frame} declares ${frameSize} bytes, which overruns the file`);
    }
    const frameEnd = frameStart + frameSize;
    const frameMagic = reader.u16("frame magic");
    if (frameMagic !== ASE_FRAME_MAGIC) {
      reader.fail(`frame ${frame} has bad magic 0x${frameMagic.toString(16)}`);
    }
    const oldChunks = reader.u16("old chunk count");
    const duration = reader.u16("frame duration");
    if (duration > 0) {
      durations[frame] = clampFrameDurationSec(duration / 1000);
    }
    reader.skip(2, "frame reserved");
    const newChunks = reader.u32("chunk count");
    let chunkCount = newChunks !== 0 ? newChunks : oldChunks;
    if (oldChunks === 0xffff) {
      if (newChunks === 0) {
        reader.fail(`frame ${frame} overflows the old chunk count without a new count`);
      }
      chunkCount = newChunks;
    }
    for (let chunk = 0; chunk < chunkCount; chunk += 1) {
      if (reader.position + ASE_MIN_CHUNK_SIZE > frameEnd) {
        reader.fail(`frame ${frame} ends inside chunk ${chunk} header`);
      }
      const chunkSize = reader.u32("chunk size");
      const chunkType = reader.u16("chunk type");
      if (chunkSize < ASE_MIN_CHUNK_SIZE) {
        reader.fail(`frame ${frame} chunk ${chunk} declares ${chunkSize} bytes`);
      }
      const chunkEnd = reader.position + chunkSize - ASE_MIN_CHUNK_SIZE;
      if (chunkEnd > frameEnd) {
        reader.fail(`frame ${frame} chunk ${chunk} overruns the frame`);
      }
      switch (chunkType) {
        case ASE_CHUNK_OLD_PALETTE_4:
        case ASE_CHUNK_OLD_PALETTE_11: {
          if (sawNewPalette) {
            reader.setPosition(chunkEnd, "old palette chunk");
            break;
          }
          parseOldPaletteChunk(reader, chunkEnd, chunkType === ASE_CHUNK_OLD_PALETTE_11, palette);
          break;
        }
        case ASE_CHUNK_LAYER: {
          parseLayerChunk(reader, chunkEnd, headerFlags, layerSlots);
          break;
        }
        case ASE_CHUNK_CEL: {
          const linked = await parseCelChunk(reader, chunkEnd, frame, pixelBytes, layerSlots, rawCels);
          if (linked !== null) {
            linkedCels.set(asepriteCellKey(linked.layer, linked.frame), linked);
          }
          break;
        }
        case ASE_CHUNK_PALETTE: {
          parsePaletteChunk(reader, chunkEnd, palette);
          sawNewPalette = true;
          break;
        }
        case ASE_CHUNK_TAGS: {
          parseTagsChunk(reader, chunkEnd, frame, frames, tags);
          break;
        }
        default: {
          reader.setPosition(chunkEnd, "skipped chunk");
          break;
        }
      }
      if (reader.position !== chunkEnd) {
        reader.fail(`frame ${frame} chunk ${chunk} length mismatch`);
      }
    }
    if (reader.position !== frameEnd) {
      reader.fail(`frame ${frame} declares ${frameSize} bytes but holds a different payload`);
    }
  }
  if (reader.position !== data.length) {
    reader.fail("trailing data after the last frame");
  }

  return buildAsepriteDocument({
    width,
    height,
    depth,
    transparentIndex,
    frames,
    durations,
    layerSlots,
    rawCels,
    linkedCels,
    palette,
    tags,
  });
}

function parseOldPaletteChunk(
  reader: GnumarusAseReader,
  chunkEnd: number,
  sixBit: boolean,
  palette: Map<number, { r: number; g: number; b: number; a: number }>,
): void {
  const packets = reader.u16("palette packet count");
  let index = 0;
  const scale = (value: number): number => (sixBit ? Math.round((value * 255) / 63) : value);
  for (let packet = 0; packet < packets; packet += 1) {
    index += reader.u8("palette skip");
    const countByte = reader.u8("palette count");
    const count = countByte === 0 ? 256 : countByte;
    for (let entry = 0; entry < count; entry += 1) {
      if (index > ASE_MAX_PALETTE_SIZE) {
        reader.fail("palette index out of range");
      }
      palette.set(index, {
        r: scale(reader.u8("palette red")),
        g: scale(reader.u8("palette green")),
        b: scale(reader.u8("palette blue")),
        a: 255,
      });
      index += 1;
    }
  }
  if (reader.position !== chunkEnd) {
    reader.fail("old palette chunk length mismatch");
  }
}

function parsePaletteChunk(
  reader: GnumarusAseReader,
  chunkEnd: number,
  palette: Map<number, { r: number; g: number; b: number; a: number }>,
): void {
  const size = reader.u32("palette size");
  const from = reader.u32("palette first index");
  const to = reader.u32("palette last index");
  if (size < 1 || size > ASE_MAX_PALETTE_SIZE || from > to || to >= size) {
    reader.fail(`invalid palette range ${from}..${to} of ${size}`);
  }
  reader.skip(8, "palette reserved");
  for (let index = from; index <= to; index += 1) {
    const entryFlags = reader.u16("palette entry flags");
    const r = reader.u8("palette red");
    const g = reader.u8("palette green");
    const b = reader.u8("palette blue");
    const a = reader.u8("palette alpha");
    if ((entryFlags & 1) !== 0) {
      const nameLength = reader.u16("palette entry name length");
      reader.skip(nameLength, "palette entry name");
    }
    palette.set(index, { r, g, b, a });
  }
  if (reader.position !== chunkEnd) {
    reader.fail("palette chunk length mismatch");
  }
}

function parseTagsChunk(
  reader: GnumarusAseReader,
  chunkEnd: number,
  frame: number,
  frameCount: number,
  tags: GnumarusAseTag[],
): void {
  const count = reader.u16("tag count");
  reader.skip(8, "tags reserved");
  for (let index = 0; index < count; index += 1) {
    const from = reader.u16("tag first frame");
    const to = reader.u16("tag last frame");
    const loop = reader.u8("tag loop direction");
    const repeat = reader.u16("tag repeat count");
    reader.skip(6, "tag reserved");
    reader.skip(3, "tag color");
    reader.skip(1, "tag extra byte");
    const name = reader.string();
    if (from > to) {
      reader.fail(`frame ${frame} tag ${index} starts after its end`);
    }
    if (to >= frameCount) {
      reader.fail(`frame ${frame} tag ${index} reaches out-of-range frame ${to}`);
    }
    if (
      loop !== ASE_TAG_LOOP_FORWARD &&
      loop !== ASE_TAG_LOOP_REVERSE &&
      loop !== ASE_TAG_LOOP_PING_PONG &&
      loop !== ASE_TAG_LOOP_PING_PONG_REVERSE
    ) {
      reader.fail(`frame ${frame} tag ${index} has an unknown loop direction`);
    }
    tags.push({ name, from, to, loop, repeat });
  }
  if (reader.position !== chunkEnd) {
    reader.fail("tags chunk length mismatch");
  }
}

function parseLayerChunk(
  reader: GnumarusAseReader,
  chunkEnd: number,
  headerFlags: number,
  layerSlots: Array<GnumarusAseLayerSlot | null>,
): void {
  const flags = reader.u16("layer flags");
  const type = reader.u16("layer type");
  reader.u16("layer child level");
  reader.skip(4, "layer default size");
  reader.u16("layer blend mode");
  const opacityByte = reader.u8("layer opacity");
  reader.skip(3, "layer reserved");
  const name = reader.string();
  if (type === ASE_LAYER_TYPE_TILEMAP) {
    reader.u32("tileset index");
  } else if (type !== ASE_LAYER_TYPE_IMAGE && type !== ASE_LAYER_TYPE_GROUP) {
    reader.fail(`unknown layer type ${type}`);
  }
  if ((headerFlags & 4) !== 0) {
    reader.skip(16, "layer uuid");
  }
  if (reader.position !== chunkEnd) {
    reader.fail("layer chunk length mismatch");
  }
  if (type === ASE_LAYER_TYPE_IMAGE) {
    layerSlots.push({
      name: name.length > 0 ? name : null,
      visible: (flags & 1) !== 0,
      opacity: (headerFlags & 1) !== 0 ? opacityByte / 255 : 1,
      background: (flags & 8) !== 0,
    });
  } else {
    layerSlots.push(null);
  }
}

interface GnumarusAseCelImage {
  width: number;
  height: number;
  pixels: Uint8Array;
}

/**
 * Parse one cel chunk. Image cels are stored (last cel wins per cell);
 * linked cels are returned for second-pass resolution; tilemap cels on
 * skipped layers are ignored. Returns the linked cel, if any.
 */
async function parseCelChunk(
  reader: GnumarusAseReader,
  chunkEnd: number,
  frame: number,
  pixelBytes: number,
  layerSlots: Array<GnumarusAseLayerSlot | null>,
  rawCels: Map<string, GnumarusAseRawCel>,
): Promise<GnumarusAseLinkedCel | null> {
  const layerIndex = reader.u16("cel layer index");
  if (layerIndex >= layerSlots.length) {
    reader.fail(`cel references unknown layer ${layerIndex}`);
  }
  const x = reader.i16("cel x");
  const y = reader.i16("cel y");
  const opacity = reader.u8("cel opacity");
  const celType = reader.u16("cel type");
  reader.i16("cel z-index");
  reader.skip(5, "cel reserved");
  const slot = layerSlots[layerIndex];
  if (slot === undefined || slot === null) {
    reader.setPosition(chunkEnd, "cel on skipped layer");
    return null;
  }
  if (celType === ASE_CEL_TYPE_RAW || celType === ASE_CEL_TYPE_COMPRESSED) {
    const width = reader.u16("cel width");
    const height = reader.u16("cel height");
    if (width < 1 || width > ASE_MAX_DIMENSION || height < 1 || height > ASE_MAX_DIMENSION) {
      reader.fail(`cel has unsupported size ${width}x${height}`);
    }
    const expected = width * height * pixelBytes;
    let pixels: Uint8Array;
    if (celType === ASE_CEL_TYPE_RAW) {
      pixels = reader.raw(expected, "raw cel pixels").slice();
    } else {
      const compressed = reader.raw(chunkEnd - reader.position, "compressed cel pixels");
      const inflated = await inflateAsepriteZlib(compressed, `frame ${frame} cel`);
      if (inflated.length !== expected) {
        reader.fail(`frame ${frame} cel inflates to ${inflated.length} bytes, expected ${expected}`);
      }
      pixels = inflated;
    }
    if (reader.position !== chunkEnd) {
      reader.fail(`frame ${frame} cel length mismatch`);
    }
    rawCels.set(asepriteCellKey(layerIndex, frame), {
      layer: layerIndex,
      frame,
      x,
      y,
      opacity,
      width,
      height,
      pixels,
    });
    return null;
  }
  if (celType === ASE_CEL_TYPE_LINKED) {
    const linkTo = reader.u16("linked frame");
    if (reader.position !== chunkEnd) {
      reader.fail(`frame ${frame} linked cel length mismatch`);
    }
    return { layer: layerIndex, frame, x, y, opacity, linkTo };
  }
  if (celType === ASE_CEL_TYPE_TILEMAP) {
    reader.setPosition(chunkEnd, "tilemap cel");
    return null;
  }
  reader.fail(`frame ${frame} has unsupported cel type ${celType}`);
}

function decodeAsepritePixels(
  image: GnumarusAseCelImage,
  depth: number,
  palette: Map<number, { r: number; g: number; b: number; a: number }>,
  transparentIndex: number,
  background: boolean,
  label: string,
): Uint8ClampedArray {
  const count = image.width * image.height;
  const output = new Uint8ClampedArray(count * 4);
  if (depth === ASE_DEPTH_RGBA) {
    output.set(image.pixels.subarray(0, count * 4));
    return output;
  }
  if (depth === ASE_DEPTH_GRAYSCALE) {
    for (let i = 0; i < count; i += 1) {
      const value = image.pixels[i * 2] ?? 0;
      const alpha = image.pixels[i * 2 + 1] ?? 0;
      output[i * 4] = value;
      output[i * 4 + 1] = value;
      output[i * 4 + 2] = value;
      output[i * 4 + 3] = alpha;
    }
    return output;
  }
  for (let i = 0; i < count; i += 1) {
    const index = image.pixels[i] ?? 0;
    const entry = palette.get(index);
    if (entry === undefined) {
      throw new GnumarusAsepriteError(
        `Aseprite file: ${label} uses palette index ${index} which the file never defines`,
      );
    }
    output[i * 4] = entry.r;
    output[i * 4 + 1] = entry.g;
    output[i * 4 + 2] = entry.b;
    output[i * 4 + 3] = !background && index === transparentIndex ? 0 : entry.a;
  }
  return output;
}

function bakeAsepriteOpacity(buffer: Uint8ClampedArray, opacity: number): void {
  if (opacity === 255) {
    return;
  }
  for (let i = 3; i < buffer.length; i += 4) {
    const alpha = buffer[i];
    if (alpha === undefined) {
      continue;
    }
    buffer[i] = Math.round((alpha * opacity) / 255);
  }
}

interface GnumarusAseBuildInput {
  width: number;
  height: number;
  depth: number;
  transparentIndex: number;
  frames: number;
  durations: number[];
  layerSlots: Array<GnumarusAseLayerSlot | null>;
  rawCels: Map<string, GnumarusAseRawCel>;
  linkedCels: Map<string, GnumarusAseLinkedCel>;
  palette: Map<number, { r: number; g: number; b: number; a: number }>;
  tags: GnumarusAseTag[];
}

/**
 * Map frame tags to named animations. Reverse directions play the range
 * backwards under a forward/ping-pong loop; a repeat count of one plays
 * once (`none`). Higher repeat counts and tag colors have no equivalent
 * and are ignored. Empty names fall back to `Tag N`, taken names gain a
 * ` (2)` suffix.
 */
export function tagsToNamedAnimations(tags: GnumarusAseTag[]): GnumarusNamedAnimation[] {
  const taken = new Set<string>();
  const animations: GnumarusNamedAnimation[] = [];
  tags.forEach((tag, order) => {
    const reversed = tag.loop === ASE_TAG_LOOP_REVERSE || tag.loop === ASE_TAG_LOOP_PING_PONG_REVERSE;
    const pingPong =
      tag.loop === ASE_TAG_LOOP_PING_PONG || tag.loop === ASE_TAG_LOOP_PING_PONG_REVERSE;
    const loop: GnumarusAnimationLoop =
      pingPong || tag.repeat !== 1 ? (pingPong ? "ping-pong" : "forward") : "none";
    const frames: Array<{ frame: number; duration: null }> = [];
    if (reversed) {
      for (let frame = tag.to; frame >= tag.from; frame -= 1) {
        frames.push({ frame, duration: null });
      }
    } else {
      for (let frame = tag.from; frame <= tag.to; frame += 1) {
        frames.push({ frame, duration: null });
      }
    }
    let name = tag.name.trim().slice(0, 64);
    if (name === "") {
      name = `Tag ${order + 1}`;
    }
    let candidate = name;
    let suffix = 2;
    while (taken.has(candidate)) {
      candidate = `${name} (${suffix})`;
      suffix += 1;
    }
    taken.add(candidate);
    animations.push({ name: candidate, loop, frames });
  });
  return animations;
}

function buildAsepriteDocument(input: GnumarusAseBuildInput): GnumarusAsepriteDocument {
  // Index image layers in file order (groups/tilemaps flattened away).
  const layerIds: Array<string | null> = [];
  const layers: GnumarusAsepriteLayer[] = [];
  input.layerSlots.forEach((slot) => {
    if (slot === null) {
      layerIds.push(null);
      return;
    }
    const id = `layer${layers.length}`;
    layerIds.push(id);
    layers.push({
      id,
      name: slot.name ?? `L${layers.length + 1}`,
      visible: slot.visible,
      opacity: slot.opacity,
      lockedChannels: unlockedChannels(),
    });
  });

  // Resolve linked cels transitively to their raw source image.
  const resolveSource = (layer: number, frame: number): GnumarusAseRawCel | null => {
    const seen = new Set<string>();
    let current = frame;
    for (;;) {
      const key = asepriteCellKey(layer, current);
      if (seen.has(key)) {
        throw new GnumarusAsepriteError(`Aseprite file: linked cels form a cycle at layer ${layer} frame ${frame}`);
      }
      seen.add(key);
      const raw = input.rawCels.get(key);
      if (raw !== undefined) {
        return raw;
      }
      const link = input.linkedCels.get(key);
      if (link === undefined) {
        return null;
      }
      if (link.linkTo >= input.frames) {
        throw new GnumarusAsepriteError(
          `Aseprite file: layer ${layer} frame ${frame} links to out-of-range frame ${link.linkTo}`,
        );
      }
      current = link.linkTo;
    }
  };

  const textures: GnumarusTexturePixels[] = [];
  const contents: GnumarusAsepriteContent[] = [];
  const cells: GnumarusAsepriteCell[] = [];
  // Raw source key -> shared material (enables true content linking when
  // the link reuses the source geometry and opacity).
  const sharedMaterials = new Map<string, { textureId: string; contentId: string }>();

  const materialize = (
    layerIndex: number,
    frame: number,
    image: GnumarusAseCelImage,
    x: number,
    y: number,
    opacity: number,
  ): { textureId: string; contentId: string } => {
    const slot = input.layerSlots[layerIndex];
    const layerId = layerIds[layerIndex];
    if (slot === null || slot === undefined || layerId === null || layerId === undefined) {
      throw new GnumarusAsepriteError(`Aseprite file: cannot materialize cel on skipped layer ${layerIndex}`);
    }
    const layerName = layers.find((entry) => entry.id === layerId)?.name ?? layerId;
    const decoded = decodeAsepritePixels(
      image,
      input.depth,
      input.palette,
      input.transparentIndex,
      slot.background,
      `layer ${layerIndex} frame ${frame}`,
    );
    bakeAsepriteOpacity(decoded, opacity);
    const textureId = `tex${textures.length}`;
    textures.push({
      id: textureId,
      name: `${layerName} frame ${frame + 1}`,
      width: image.width,
      height: image.height,
      buffer: decoded,
    });
    const contentId = `content${contents.length}`;
    contents.push({
      id: contentId,
      name: `C${contents.length + 1}`,
      textureId,
      transform: {
        ...IDENTITY_LAYER_TRANSFORM,
        x: x + image.width / 2 - input.width / 2,
        y: y + image.height / 2 - input.height / 2,
      },
    });
    return { textureId, contentId };
  };

  input.layerSlots.forEach((slot, layerIndex) => {
    const layerId = layerIds[layerIndex];
    if (slot === null || layerId === null) {
      return;
    }
    for (let frame = 0; frame < input.frames; frame += 1) {
      const key = asepriteCellKey(layerIndex, frame);
      const raw = input.rawCels.get(key);
      if (raw !== undefined) {
        const material = materialize(layerIndex, frame, raw, raw.x, raw.y, raw.opacity);
        sharedMaterials.set(key, material);
        cells.push({ layer: layerId, frame, content: material.contentId });
        continue;
      }
      const link = input.linkedCels.get(key);
      if (link === undefined) {
        continue;
      }
      if (link.linkTo >= input.frames) {
        throw new GnumarusAsepriteError(
          `Aseprite file: layer ${layerIds[layerIndex] ?? layerIndex} frame ${frame} links to out-of-range frame ${link.linkTo}`,
        );
      }
      const source = resolveSource(layerIndex, link.linkTo);
      if (source === null) {
        continue;
      }
      const sourceKey = asepriteCellKey(source.layer, source.frame);
      const shared = sharedMaterials.get(sourceKey);
      if (
        shared !== undefined &&
        link.x === source.x &&
        link.y === source.y &&
        link.opacity === source.opacity
      ) {
        cells.push({ layer: layerId, frame, content: shared.contentId });
        continue;
      }
      const material = materialize(layerIndex, frame, source, link.x, link.y, link.opacity);
      cells.push({ layer: layerId, frame, content: material.contentId });
    }
  });

  const defaultDuration =
    input.durations[0] ?? GNUMARUS_DEFAULT_FRAME_DURATION_SEC;
  const frameDurations: Array<{ frame: number; duration: number }> = [];
  input.durations.forEach((duration, frame) => {
    const clamped = clampFrameDurationSec(duration);
    if (clamped !== defaultDuration) {
      frameDurations.push({ frame, duration: clamped });
    }
  });

  return {
    width: input.width,
    height: input.height,
    layers,
    textures,
    contents,
    cells,
    frames: input.frames,
    defaultFrameDuration: defaultDuration,
    frameDurations,
    namedAnimations: tagsToNamedAnimations(input.tags),
  };
}
