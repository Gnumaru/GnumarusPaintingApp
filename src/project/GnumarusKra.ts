/**
 * Krita (.kra/.krz) import.
 *
 * Strict parser implemented from a self-authored description of the KRA
 * file format (format facts only; no Krita source code is used here).
 * Every structural violation throws GnumarusKraError, so truncated,
 * mislabeled or otherwise corrupt files are rejected instead of producing
 * wrong pixels.
 *
 * File layout (KRA and KRZ share it; KRZ is Krita's archival export with
 * the identical ZIP layout):
 * - ZIP archive holding `mimetype` (`application/x-krita`), `maindoc.xml`,
 *   previews, and one `<imagename>/layers/` directory with the pixel data.
 * - `maindoc.xml`: `DOC/IMAGE` carries the canvas width/height, the image
 *   colorspacename and the image name (which prefixes the layer entries).
 *   Nested `layers/layer` elements describe the stack (top layer first):
 *   `paintlayer` entries hold pixels, `grouplayer` entries nest another
 *   `layers` list (flattened away on import), every other `nodetype`
 *   (shape, file, clone, adjustment, generator, reference images, masks)
 *   is skipped. Per layer: `name`, `opacity` (0-255), `visible` (0/1),
 *   `x`/`y` position, `filename`, `colorspacename` and
 *   `channellockflags` (`1` = editable, `0` = locked, in file channel
 *   order). `mask` children are never walked into.
 * - Animation: `IMAGE/animation` holds `framerate` (frames per second),
 *   `range` (`from`/`to` playback bounds, inclusive) and `currentTime`.
 *   Animated layers reference `<filename>.keyframes.xml`: a `channel`
 *   named `content` lists `keyframe` elements with absolute `time`,
 *   `frame` (pixel file suffix, e.g. `layer3.f2`) and an `offset` child
 *   (`x`/`y` layer origin for that keyframe). Engine frames map the
 *   playback range one-to-one (frame i shows time from+i) with hold
 *   semantics: each frame shows the latest keyframe at or before its
 *   time (the earliest keyframe covers earlier times). Static layers
 *   share one content across all frames.
 * - Layer pixel files: an ASCII header (`VERSION 2`, `TILEWIDTH 64`,
 *   `TILEHEIGHT 64`, `PIXELSIZE n`, `DATA m`) followed by `m` tiles.
 *   Each tile is one `x,y,LZF,size` line plus exactly `size` payload
 *   bytes: a flag byte (0 = raw interleaved pixels, 1 = LZF-compressed
 *   planarized pixels) and the data. Tile coordinates are multiples of
 *   64 relative to the layer/frame offset and may be negative. Missing
 *   tiles read `<file>.defaultpixel` (transparent when absent).
 * - Planarization splits the tile into per-channel planes (all samples
 *   of channel 0, then channel 1, ...); LZF is the liblzf byte format
 *   (control byte < 32 starts a literal run of control+1 bytes, else a
 *   back-reference of (control>>5)+2 bytes, plus one extra length byte
 *   when the field is 7, at offset ((control&31)<<8)+1+extra byte).
 *   Only 8-bit RGBA (PIXELSIZE 4, stored B,G,R,A) and 8-bit gray+alpha
 *   (PIXELSIZE 2, stored Gray,Alpha) are supported.
 *
 * Imported: canvas size, pixel layers bottom-first with center-relative
 * transforms, visibility, opacity, lockedChannels from channellockflags,
 * keyframed animation (frames, default frame duration from the framerate),
 * short default names (L/T/C plus index) mirroring the PSD importer.
 *
 * Ignored (no equivalent in this app): blend modes (everything composites
 * normal), masks, non-paint layer types, scalar keyframe channels (e.g.
 * animated opacity), guides/assistants/palettes/profiles, depths above
 * 8-bit, unknown tile codecs. Layers with no pixels in any frame are
 * skipped; files with no importable layers are rejected.
 *
 * New dependencies: `fflate` (ZIP inflate) and `fast-xml-parser` (maindoc
 * and keyframe XML), both MIT-licensed. Unzipping and XML parsing are
 * sequential and each entry buffer is released after its pixels decode.
 */
import { unzipSync } from "fflate";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import {
  clampFrameDurationSec,
  GNUMARUS_DEFAULT_FRAME_DURATION_SEC,
  type GnumarusTexturePixels,
} from "../animation/GnumarusAnimationModel";
import type { GnumarusChannelLock } from "../canvas/GnumarusPixelBuffer";
import {
  IDENTITY_LAYER_TRANSFORM,
  type GnumarusLayerTransform,
} from "../canvas/GnumarusViewportMath";

export class GnumarusKraError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GnumarusKraError";
  }
}

export interface GnumarusKraLayer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  lockedChannels: GnumarusChannelLock;
}

export interface GnumarusKraContent {
  id: string;
  name: string;
  textureId: string;
  transform: GnumarusLayerTransform;
}

export interface GnumarusKraCell {
  layer: string;
  frame: number;
  content: string;
}

export interface GnumarusKraFrameDuration {
  frame: number;
  duration: number;
}

export interface GnumarusKraDocument {
  width: number;
  height: number;
  layers: GnumarusKraLayer[];
  textures: GnumarusTexturePixels[];
  contents: GnumarusKraContent[];
  cells: GnumarusKraCell[];
  frames: number;
  defaultFrameDuration: number;
  frameDurations: GnumarusKraFrameDuration[];
}

const KRA_MAX_DIMENSION = 4096;
const KRA_MAX_LAYER_DIMENSION = 8192;
const KRA_MAX_LAYERS = 4096;
const KRA_MAX_FRAMES = 10000;
const KRA_TILE_SIZE = 64;
const KRA_MAX_TILES_PER_LAYER = 16384;
const KRA_MAX_NAME_LENGTH = 1024;

const KRA_NODE_PAINT_LAYER = "paintlayer";
const KRA_NODE_GROUP_LAYER = "grouplayer";
const KRA_CHANNEL_CONTENT = "content";
const KRA_COLOR_RGBA = "RGBA";
const KRA_COLOR_GRAYA = "GRAYA";

type GnumarusKraXmlValue = string | GnumarusKraXmlObject | GnumarusKraXmlValue[];
interface GnumarusKraXmlObject {
  [key: string]: GnumarusKraXmlValue | undefined;
}

function fail(message: string): never {
  throw new GnumarusKraError(message);
}

function asXmlObject(value: unknown, what: string): GnumarusKraXmlObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail(`invalid ${what}`);
  }
  return value as GnumarusKraXmlObject;
}

function asArray(value: GnumarusKraXmlValue | undefined): GnumarusKraXmlValue[] {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function attrText(obj: GnumarusKraXmlObject, name: string, what: string): string {
  const value = obj[name];
  if (value === undefined) {
    fail(`missing ${what}`);
  }
  if (typeof value !== "string") {
    fail(`invalid ${what}`);
  }
  return value;
}

function optionalAttr(obj: GnumarusKraXmlObject, name: string, what: string): string | undefined {
  const value = obj[name];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string") {
    fail(`invalid ${what}`);
  }
  return value;
}

function parseIntStrict(text: string, what: string, min: number, max: number): number {
  if (!/^-?\d+$/.test(text)) {
    fail(`invalid ${what}: ${text}`);
  }
  const value = Number.parseInt(text, 10);
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    fail(`invalid ${what}: ${text}`);
  }
  return value;
}

/** True when the bytes look like a Krita file: a ZIP holding `maindoc.xml`. */
export function isKritaFile(bytes: Uint8Array): boolean {
  if (
    bytes.length < 4 ||
    bytes[0] !== 0x50 ||
    bytes[1] !== 0x4b ||
    (bytes[2] !== 0x03 && bytes[2] !== 0x05 && bytes[2] !== 0x07) ||
    (bytes[2] === 0x03 && bytes[3] !== 0x04) ||
    (bytes[2] === 0x05 && bytes[3] !== 0x06) ||
    (bytes[2] === 0x07 && bytes[3] !== 0x08)
  ) {
    return false;
  }
  try {
    return findCentralEntry(bytes, "maindoc.xml") !== null;
  } catch {
    return false;
  }
}

interface GnumarusKraCentralEntry {
  name: string;
  method: number;
  compressedSize: number;
  uncompressedSize: number;
  localOffset: number;
}

function readU16(view: DataView, offset: number): number {
  return view.getUint16(offset, true);
}

function readU32(view: DataView, offset: number): number {
  return view.getUint32(offset, true);
}

/** Minimal ZIP central-directory scan for one entry name; null when absent. */
function findCentralEntry(bytes: Uint8Array, wanted: string): GnumarusKraCentralEntry | null {
  if (bytes.length > 0xffffffff) {
    return null;
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // End-of-central-directory record ends the file (allowing a comment).
  let eocd = -1;
  const scanStart = Math.max(0, bytes.length - 65557);
  for (let i = bytes.length - 22; i >= scanStart; i -= 1) {
    if (readU32(view, i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) {
    return null;
  }
  const entries = readU16(view, eocd + 10);
  let cursor = readU32(view, eocd + 16);
  const wantedBytes = new TextEncoder().encode(wanted);
  for (let i = 0; i < entries; i += 1) {
    if (cursor + 46 > bytes.length || readU32(view, cursor) !== 0x02014b50) {
      return null;
    }
    const method = readU16(view, cursor + 10);
    const compressedSize = readU32(view, cursor + 20);
    const uncompressedSize = readU32(view, cursor + 24);
    const nameLength = readU16(view, cursor + 28);
    const extraLength = readU16(view, cursor + 30);
    const commentLength = readU16(view, cursor + 32);
    const localOffset = readU32(view, cursor + 42);
    const nameStart = cursor + 46;
    const nameEnd = nameStart + nameLength;
    if (nameEnd > bytes.length) {
      return null;
    }
    let match = nameLength === wantedBytes.length;
    if (match) {
      for (let b = 0; b < wantedBytes.length; b += 1) {
        if ((bytes[nameStart + b] ?? 0) !== (wantedBytes[b] ?? 0)) {
          match = false;
          break;
        }
      }
    }
    if (match) {
      return { name: wanted, method, compressedSize, uncompressedSize, localOffset };
    }
    cursor = nameEnd + extraLength + commentLength;
  }
  return null;
}

/**
 * Decode one LZF stream (liblzf byte format) into exactly `expected`
 * bytes. Control byte < 32 copies control+1 literal bytes, otherwise it
 * encodes a back-reference of (control>>5)+2 bytes (plus one extra length
 * byte when the field is 7) at offset ((control&31)<<8)+1+extra.
 */
function lzfDecompress(input: Uint8Array, expected: number, what: string): Uint8Array {
  if (expected < 0 || expected > KRA_TILE_SIZE * KRA_TILE_SIZE * 4) {
    fail(`invalid ${what} size ${expected}`);
  }
  const out = new Uint8Array(expected);
  let ip = 0;
  let op = 0;
  const limit = input.length - 1;
  const failAt = (reason: string): never => {
    fail(`invalid ${what}: ${reason} (byte ${Math.min(ip, input.length)} of ${input.length})`);
  };
  while (ip < limit) {
    const ctrl = input[ip] ?? 0;
    ip += 1;
    if (ctrl < 32) {
      const length = ctrl + 1;
      if (ip + length > input.length || op + length > expected) {
        failAt("literal run out of range");
      }
      out.set(input.subarray(ip, ip + length), op);
      ip += length;
      op += length;
    } else {
      let length = (ctrl >> 5) - 1;
      let offset = ((ctrl & 31) << 8) + 1;
      if (length === 6) {
        if (ip >= input.length) {
          failAt("truncated back-reference length");
        }
        length += input[ip] ?? 0;
        ip += 1;
      }
      if (ip >= input.length) {
        failAt("truncated back-reference offset");
      }
      offset += input[ip] ?? 0;
      ip += 1;
      const total = length + 3;
      if (offset < 1 || offset > op || op + total > expected) {
        failAt("back-reference out of range");
      }
      for (let i = 0; i < total; i += 1) {
        out[op] = out[op - offset] ?? 0;
        op += 1;
      }
    }
  }
  if (op !== expected) {
    failAt(`decoded ${op} of ${expected} bytes`);
  }
  return out;
}

/**
 * Invert Krita's planarization: the payload holds all samples of channel
 * 0, then channel 1, and so on; rebuild interleaved pixels from them.
 */
function delinearizeTile(planar: Uint8Array, bytesPerPixel: number, what: string): Uint8Array {
  const total = planar.length;
  if (total % bytesPerPixel !== 0) {
    fail(`invalid ${what} planar size ${total}`);
  }
  const stride = total / bytesPerPixel;
  const out = new Uint8Array(total);
  let start = 0;
  for (let pixel = 0; pixel < stride; pixel += 1) {
    for (let c = 0; c < bytesPerPixel; c += 1) {
      const sample = planar[start + c * stride];
      if (sample === undefined) {
        fail(`invalid ${what} planar data`);
      }
      out[pixel * bytesPerPixel + c] = sample;
    }
    start += 1;
  }
  return out;
}

interface GnumarusKraTileLayer {
  minX: number;
  minY: number;
  width: number;
  height: number;
  buffer: Uint8ClampedArray;
}

function parseTileLine(line: string, what: string, tileBytes: number): { x: number; y: number; size: number } {
  const parts = line.split(",");
  if (parts.length !== 4 || parts[2] !== "LZF") {
    fail(`invalid ${what} tile header: ${line}`);
  }
  const x = parseIntStrict(parts[0] ?? "", `${what} tile x`, -KRA_MAX_LAYER_DIMENSION, KRA_MAX_LAYER_DIMENSION);
  const y = parseIntStrict(parts[1] ?? "", `${what} tile y`, -KRA_MAX_LAYER_DIMENSION, KRA_MAX_LAYER_DIMENSION);
  if (x % KRA_TILE_SIZE !== 0 || y % KRA_TILE_SIZE !== 0) {
    fail(`invalid ${what} tile origin ${x},${y}`);
  }
  // Worst case LZF output: input + input/16 + 64 + 3, plus the flag byte.
  const maxSize = tileBytes + (tileBytes >> 4) + 72;
  const size = parseIntStrict(parts[3] ?? "", `${what} tile size`, 1, maxSize);
  return { x, y, size };
}

/**
 * Decode one layer pixel file (tile store) into an RGBA buffer sized to
 * the tile bounding box. Returns null when the file holds no tiles and
 * the default pixel is transparent.
 */
function parseTileStore(
  data: Uint8Array,
  defaultPixel: Uint8ClampedArray | null,
  bytesPerPixel: number,
  swapBgr: boolean,
  what: string,
): GnumarusKraTileLayer | null {
  const findLineEnd = (from: number): number => {
    for (let i = from; i < data.length; i += 1) {
      if (data[i] === 0x0a) {
        return i;
      }
    }
    fail(`truncated ${what} header`);
  };
  const readLine = (from: number): { text: string; next: number } => {
    const end = findLineEnd(from);
    const text = new TextDecoder("latin1").decode(data.subarray(from, end));
    return { text: text.endsWith("\r") ? text.slice(0, -1) : text, next: end + 1 };
  };
  let cursor = 0;
  const expectLine = (expected: string, label: string): void => {
    const line = readLine(cursor);
    cursor = line.next;
    if (line.text !== expected) {
      fail(`invalid ${what} ${label}: ${line.text}`);
    }
  };
  expectLine("VERSION 2", "version");
  expectLine(`TILEWIDTH ${KRA_TILE_SIZE}`, "tile width");
  expectLine(`TILEHEIGHT ${KRA_TILE_SIZE}`, "tile height");
  const pixelLine = readLine(cursor);
  cursor = pixelLine.next;
  const pixelMatch = /^PIXELSIZE (\d+)$/.exec(pixelLine.text);
  if (pixelMatch === null || Number(pixelMatch[1]) !== bytesPerPixel) {
    fail(`invalid ${what} pixel size: ${pixelLine.text}`);
  }
  const dataLine = readLine(cursor);
  cursor = dataLine.next;
  const dataMatch = /^DATA (\d+)$/.exec(dataLine.text);
  if (dataMatch === null) {
    fail(`invalid ${what} tile count: ${dataLine.text}`);
  }
  const tileCount = Number(dataMatch[1]);
  if (!Number.isSafeInteger(tileCount) || tileCount < 0 || tileCount > KRA_MAX_TILES_PER_LAYER) {
    fail(`invalid ${what} tile count: ${dataLine.text}`);
  }
  const tileBytes = KRA_TILE_SIZE * KRA_TILE_SIZE * bytesPerPixel;
  const tiles = new Map<string, { x: number; y: number; pixels: Uint8Array }>();
  for (let i = 0; i < tileCount; i += 1) {
    if (cursor >= data.length) {
      fail(`truncated ${what} tile ${i}`);
    }
    const header = readLine(cursor);
    cursor = header.next;
    const { x, y, size } = parseTileLine(header.text, what, KRA_TILE_SIZE * KRA_TILE_SIZE * bytesPerPixel);
    if (cursor + size > data.length) {
      fail(`truncated ${what} tile ${i} data`);
    }
    const payload = data.subarray(cursor, cursor + size);
    cursor += size;
    const flag = payload[0];
    let pixels: Uint8Array;
    if (flag === 0) {
      if (size !== tileBytes + 1) {
        fail(`invalid ${what} raw tile ${i} size ${size}`);
      }
      pixels = payload.subarray(1);
    } else if (flag === 1) {
      pixels = delinearizeTile(lzfDecompress(payload.subarray(1), tileBytes, `${what} tile ${i}`), bytesPerPixel, `${what} tile ${i}`);
    } else {
      fail(`invalid ${what} tile ${i} compression flag ${flag}`);
    }
    tiles.set(`${x},${y}`, { x, y, pixels });
  }
  if (tiles.size === 0) {
    return null;
  }
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const tile of tiles.values()) {
    minX = Math.min(minX, tile.x);
    minY = Math.min(minY, tile.y);
    maxX = Math.max(maxX, tile.x + KRA_TILE_SIZE);
    maxY = Math.max(maxY, tile.y + KRA_TILE_SIZE);
  }
  const width = maxX - minX;
  const height = maxY - minY;
  if (width < 1 || height < 1 || width > KRA_MAX_LAYER_DIMENSION || height > KRA_MAX_LAYER_DIMENSION) {
    fail(`invalid ${what} tile bounds ${width}x${height}`);
  }
  const buffer = new Uint8ClampedArray(width * height * 4);
  const fallback = defaultPixel ?? new Uint8ClampedArray([0, 0, 0, 0]);
  for (let p = 0; p < width * height; p += 1) {
    buffer[p * 4] = fallback[0] ?? 0;
    buffer[p * 4 + 1] = fallback[1] ?? 0;
    buffer[p * 4 + 2] = fallback[2] ?? 0;
    buffer[p * 4 + 3] = fallback[3] ?? 0;
  }
  for (const tile of tiles.values()) {
    for (let ty = 0; ty < KRA_TILE_SIZE; ty += 1) {
      for (let tx = 0; tx < KRA_TILE_SIZE; tx += 1) {
        const src = (ty * KRA_TILE_SIZE + tx) * bytesPerPixel;
        const dst = ((tile.y - minY + ty) * width + (tile.x - minX + tx)) * 4;
        if (swapBgr) {
          buffer[dst] = tile.pixels[src + 2] ?? 0;
          buffer[dst + 1] = tile.pixels[src + 1] ?? 0;
          buffer[dst + 2] = tile.pixels[src] ?? 0;
          buffer[dst + 3] = tile.pixels[src + 3] ?? 0;
        } else {
          const v = tile.pixels[src] ?? 0;
          buffer[dst] = v;
          buffer[dst + 1] = v;
          buffer[dst + 2] = v;
          buffer[dst + 3] = tile.pixels[src + 1] ?? 0;
        }
      }
    }
  }
  return { minX, minY, width, height, buffer };
}

/** Decode a `.defaultpixel` file (raw B,G,R,A or Gray,Alpha bytes). */
function parseDefaultPixel(data: Uint8Array | undefined, bytesPerPixel: number, swapBgr: boolean, what: string): Uint8ClampedArray | null {
  if (data === undefined) {
    return null;
  }
  if (data.length !== bytesPerPixel) {
    fail(`invalid ${what} default pixel size ${data.length}`);
  }
  if (swapBgr) {
    return new Uint8ClampedArray([data[2] ?? 0, data[1] ?? 0, data[0] ?? 0, data[3] ?? 0]);
  }
  return new Uint8ClampedArray([data[0] ?? 0, data[0] ?? 0, data[0] ?? 0, data[1] ?? 0]);
}

interface GnumarusKraKeyframe {
  time: number;
  suffix: string;
  offsetX: number;
  offsetY: number;
}

function parseKeyframesXml(text: string, what: string): GnumarusKraKeyframe[] {
  const parsed = parseXmlDocument(text, what);
  const root = asXmlObject(parsed["keyframes"], `${what} keyframes`);
  const result: GnumarusKraKeyframe[] = [];
  for (const channelValue of asArray(root["channel"])) {
    const channel = asXmlObject(channelValue, `${what} channel`);
    if (optionalAttr(channel, "name", `${what} channel name`) !== KRA_CHANNEL_CONTENT) {
      continue;
    }
    for (const keyframeValue of asArray(channel["keyframe"])) {
      const keyframe = asXmlObject(keyframeValue, `${what} keyframe`);
      const rawTime = attrText(keyframe, "time", `${what} keyframe time`);
      let time = parseIntStrict(rawTime, `${what} keyframe time`, -KRA_MAX_FRAMES, KRA_MAX_FRAMES);
      if (time < 0) {
        time = 0;
      }
      const suffix = attrText(keyframe, "frame", `${what} keyframe file`);
      if (suffix.length === 0 || suffix.length > KRA_MAX_NAME_LENGTH) {
        fail(`invalid ${what} keyframe file`);
      }
      const offsetValue = keyframe["offset"];
      let offsetX = 0;
      let offsetY = 0;
      if (offsetValue !== undefined) {
        const offset = asXmlObject(offsetValue, `${what} keyframe offset`);
        offsetX = parseIntStrict(attrText(offset, "x", `${what} keyframe offset x`), `${what} keyframe offset x`, -KRA_MAX_LAYER_DIMENSION, KRA_MAX_LAYER_DIMENSION);
        offsetY = parseIntStrict(attrText(offset, "y", `${what} keyframe offset y`), `${what} keyframe offset y`, -KRA_MAX_LAYER_DIMENSION, KRA_MAX_LAYER_DIMENSION);
      }
      result.push({ time, suffix, offsetX, offsetY });
    }
  }
  result.sort((a, b) => a.time - b.time);
  return result;
}

function parseXmlDocument(text: string, what: string): GnumarusKraXmlObject {
  const validation = XMLValidator.validate(text);
  if (validation !== true) {
    const err = validation as { err?: { msg?: string; line?: number } };
    fail(`invalid ${what} XML: ${err.err?.msg ?? "parse error"} (line ${err.err?.line ?? "?"})`);
  }
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    parseAttributeValue: false,
    trimValues: true,
  });
  return asXmlObject(parser.parse(text) as unknown, what);
}

function textOfEntry(entries: Record<string, Uint8Array>, name: string, what: string, maxBytes: number): string {
  const data = entries[name];
  if (data === undefined) {
    fail(`missing ${what} (${name})`);
  }
  if (data.length > maxBytes) {
    fail(`oversized ${what} (${name})`);
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(data);
  } catch {
    fail(`invalid ${what} encoding (${name})`);
  }
}

interface GnumarusKraFileLayer {
  name: string;
  visible: boolean;
  opacity: number;
  lockedChannels: GnumarusChannelLock;
  baseX: number;
  baseY: number;
  filename: string;
  bytesPerPixel: number;
  swapBgr: boolean;
  keyframesAttr: string | undefined;
}

function collectPaintLayers(layersObj: GnumarusKraXmlObject | undefined, out: GnumarusKraXmlObject[]): void {
  if (layersObj === undefined) {
    return;
  }
  for (const child of asArray(layersObj["layer"])) {
    const layer = asXmlObject(child, "layer");
    const nodetype = optionalAttr(layer, "nodetype", "layer type") ?? "";
    if (nodetype === KRA_NODE_PAINT_LAYER) {
      out.push(layer);
    } else if (nodetype === KRA_NODE_GROUP_LAYER) {
      const nested = layer["layers"];
      if (nested !== undefined) {
        collectPaintLayers(asXmlObject(nested, "nested layers"), out);
      }
    }
  }
}

export async function parseKraFile(bytes: Uint8Array): Promise<GnumarusKraDocument> {
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(bytes) as Record<string, Uint8Array>;
  } catch {
    fail("not a Krita (.kra/.krz) file");
  }
  const maindocText = textOfEntry(entries, "maindoc.xml", "maindoc.xml", 16 << 20);
  const maindoc = parseXmlDocument(maindocText, "maindoc.xml");
  const doc = asXmlObject(maindoc["DOC"], "maindoc DOC");
  const imageValue = doc["IMAGE"];
  if (imageValue === undefined) {
    fail("missing maindoc IMAGE");
  }
  if (Array.isArray(imageValue)) {
    fail("multiple maindoc IMAGE elements");
  }
  const image = asXmlObject(imageValue, "maindoc IMAGE");
  const width = parseIntStrict(attrText(image, "width", "canvas width"), "canvas width", 1, KRA_MAX_DIMENSION);
  const height = parseIntStrict(attrText(image, "height", "canvas height"), "canvas height", 1, KRA_MAX_DIMENSION);
  const imageColorspace = optionalAttr(image, "colorspacename", "image colorspace") ?? KRA_COLOR_RGBA;
  const imageName = optionalAttr(image, "name", "image name") ?? "";
  if (imageName.length === 0 || imageName.length > KRA_MAX_NAME_LENGTH || imageName.includes("/")) {
    fail("invalid maindoc image name");
  }
  const layerDir = `${imageName}/layers/`;

  let frames = 1;
  let fromTime = 0;
  let defaultFrameDuration = GNUMARUS_DEFAULT_FRAME_DURATION_SEC;
  const animationValue = image["animation"];
  if (animationValue !== undefined) {
    const animation = asXmlObject(animationValue, "maindoc animation");
    const framerateValue = animation["framerate"];
    if (framerateValue !== undefined) {
      const framerate = asXmlObject(framerateValue, "maindoc framerate");
      const rateText = optionalAttr(framerate, "value", "maindoc framerate") ?? "";
      if (/^\d+$/.test(rateText)) {
        const rate = Number.parseInt(rateText, 10);
        if (Number.isSafeInteger(rate) && rate >= 1 && rate <= 1000) {
          defaultFrameDuration = clampFrameDurationSec(1 / rate);
        }
      }
    }
    const rangeValue = animation["range"];
    if (rangeValue !== undefined) {
      const range = asXmlObject(rangeValue, "maindoc range");
      const from = parseIntStrict(attrText(range, "from", "animation range start"), "animation range start", 0, KRA_MAX_FRAMES);
      const to = parseIntStrict(attrText(range, "to", "animation range end"), "animation range end", 0, KRA_MAX_FRAMES);
      if (to < from) {
        fail(`invalid animation range ${from}..${to}`);
      }
      frames = to - from + 1;
      if (frames < 1 || frames > KRA_MAX_FRAMES) {
        fail(`invalid animation frame count ${frames}`);
      }
      fromTime = from;
    }
  }

  const layersObj = image["layers"];
  if (layersObj === undefined) {
    fail("missing maindoc layers");
  }
  const fileOrder: GnumarusKraXmlObject[] = [];
  collectPaintLayers(asXmlObject(layersObj, "maindoc layers"), fileOrder);
  if (fileOrder.length > KRA_MAX_LAYERS) {
    fail("too many layers");
  }

  interface GnumarusKraLoadedFrame {
    buffer: Uint8ClampedArray;
    width: number;
    height: number;
    canvasX: number;
    canvasY: number;
  }
  interface GnumarusKraLoadedLayer extends GnumarusKraFileLayer {
    /** One entry per engine frame; shared buffer when frames hold. */
    framePixels: Array<GnumarusKraLoadedFrame | null>;
    /** Dedup key per frame ("" for empty); equal keys share one content. */
    keyForFrame: string[];
  }
  const loaded: GnumarusKraLoadedLayer[] = [];
  for (const element of fileOrder) {
    const filename = optionalAttr(element, "filename", "layer filename") ?? "";
    if (filename.length === 0 || filename.length > KRA_MAX_NAME_LENGTH || filename.includes("/")) {
      fail("invalid layer filename");
    }
    const layerColorspace = optionalAttr(element, "colorspacename", "layer colorspace") ?? imageColorspace;
    let bytesPerPixel: number;
    let swapBgr: boolean;
    if (layerColorspace === KRA_COLOR_RGBA) {
      bytesPerPixel = 4;
      swapBgr = true;
    } else if (layerColorspace === KRA_COLOR_GRAYA) {
      bytesPerPixel = 2;
      swapBgr = false;
    } else {
      fail(`unsupported layer colorspace ${layerColorspace}`);
    }
    const name = optionalAttr(element, "name", "layer name") ?? "";
    const opacityText = optionalAttr(element, "opacity", "layer opacity") ?? "255";
    const visible = (optionalAttr(element, "visible", "layer visibility") ?? "1") !== "0";
    const baseX = parseIntStrict(optionalAttr(element, "x", "layer x") ?? "0", "layer x", -KRA_MAX_LAYER_DIMENSION, KRA_MAX_LAYER_DIMENSION);
    const baseY = parseIntStrict(optionalAttr(element, "y", "layer y") ?? "0", "layer y", -KRA_MAX_LAYER_DIMENSION, KRA_MAX_LAYER_DIMENSION);
    const lockFlags = optionalAttr(element, "channellockflags", "layer channel locks") ?? "";
    const locked = (index: number): boolean => (lockFlags[index] ?? "1") === "0";
    const lockedChannels: GnumarusChannelLock =
      bytesPerPixel === 4
        ? { r: locked(2), g: locked(1), b: locked(0), a: locked(3) }
        : { r: locked(0), g: locked(0), b: locked(0), a: locked(1) };
    const keyframesAttr = optionalAttr(element, "keyframes", "layer keyframes");
    const fileLayer: GnumarusKraFileLayer = {
      name,
      visible,
      opacity: parseIntStrict(opacityText, "layer opacity", 0, 255) / 255,
      lockedChannels,
      baseX,
      baseY,
      filename,
      bytesPerPixel,
      swapBgr,
      keyframesAttr,
    };

    let keyframes: GnumarusKraKeyframe[] = [];
    if (keyframesAttr !== undefined) {
      const keyframesText = textOfEntry(entries, layerDir + keyframesAttr, `keyframes ${keyframesAttr}`, 1 << 20);
      keyframes = parseKeyframesXml(keyframesText, keyframesAttr);
    }
    // Decoded tile boxes are relative to the layer/frame origin; the
    // returned frame boxes are absolute canvas boxes. Suffixes decode
    // once even when several frames hold the same keyframe.
    const suffixCache = new Map<string, GnumarusKraTileLayer | null>();
    const decodeSuffix = (suffix: string): GnumarusKraTileLayer | "solid" | null => {
      const cached = suffixCache.get(suffix);
      if (cached !== undefined) {
        return cached;
      }
      const data = entries[layerDir + suffix];
      if (data === undefined) {
        fail(`missing layer data ${suffix}`);
      }
      const fallback = parseDefaultPixel(entries[layerDir + suffix + ".defaultpixel"], bytesPerPixel, swapBgr, suffix);
      const decoded = parseTileStore(data, fallback, bytesPerPixel, swapBgr, suffix);
      if (decoded !== null) {
        suffixCache.set(suffix, decoded);
        return decoded;
      }
      if (fallback !== null && (fallback[3] ?? 0) > 0) {
        suffixCache.set(suffix, null);
        return "solid";
      }
      suffixCache.set(suffix, null);
      return null;
    };
    const frameBox = (decoded: GnumarusKraTileLayer, originX: number, originY: number): GnumarusKraLoadedFrame => ({
      buffer: decoded.buffer,
      width: decoded.width,
      height: decoded.height,
      canvasX: decoded.minX + originX,
      canvasY: decoded.minY + originY,
    });
    const solidBox = (fallback: Uint8ClampedArray): GnumarusKraLoadedFrame => {
      const solid = new Uint8ClampedArray(width * height * 4);
      for (let p = 0; p < width * height; p += 1) {
        solid[p * 4] = fallback[0] ?? 0;
        solid[p * 4 + 1] = fallback[1] ?? 0;
        solid[p * 4 + 2] = fallback[2] ?? 0;
        solid[p * 4 + 3] = fallback[3] ?? 0;
      }
      return { buffer: solid, width, height, canvasX: 0, canvasY: 0 };
    };
    const framePixels: Array<GnumarusKraLoadedFrame | null> = [];
    const keyForFrame: string[] = [];
    const needSolid = (suffix: string): Uint8ClampedArray | null =>
      parseDefaultPixel(entries[layerDir + suffix + ".defaultpixel"], bytesPerPixel, swapBgr, suffix);

    if (keyframes.length === 0) {
      const decoded = decodeSuffix(filename);
      for (let f = 0; f < frames; f += 1) {
        if (decoded === null) {
          framePixels.push(null);
          keyForFrame.push("");
        } else if (decoded === "solid") {
          const fallback = needSolid(filename);
          if (fallback === null || (fallback[3] ?? 0) === 0) {
            framePixels.push(null);
            keyForFrame.push("");
          } else {
            framePixels.push(solidBox(fallback));
            keyForFrame.push(`solid:${filename}`);
          }
        } else {
          framePixels.push(frameBox(decoded, baseX, baseY));
          keyForFrame.push(`tiles:${filename}`);
        }
      }
    } else {
      for (let f = 0; f < frames; f += 1) {
        const time = fromTime + f;
        let active = keyframes[0] as GnumarusKraKeyframe;
        for (const keyframe of keyframes) {
          if (keyframe.time <= time) {
            active = keyframe;
          } else {
            break;
          }
        }
        const decoded = decodeSuffix(active.suffix);
        if (decoded === null) {
          framePixels.push(null);
          keyForFrame.push("");
        } else if (decoded === "solid") {
          const fallback = needSolid(active.suffix);
          if (fallback === null || (fallback[3] ?? 0) === 0) {
            framePixels.push(null);
            keyForFrame.push("");
          } else {
            framePixels.push(solidBox(fallback));
            keyForFrame.push(`solid:${active.suffix}`);
          }
        } else {
          framePixels.push(frameBox(decoded, active.offsetX, active.offsetY));
          keyForFrame.push(`tiles:${active.suffix}`);
        }
      }
    }
    loaded.push({ ...fileLayer, framePixels, keyForFrame });
  }

  // File order is top layer first; the engine stacks bottom layer first.
  const ordered = loaded.reverse();
  const layers: GnumarusKraLayer[] = [];
  const textures: GnumarusTexturePixels[] = [];
  const contents: GnumarusKraContent[] = [];
  const cells: GnumarusKraCell[] = [];
  ordered.forEach((layer, index) => {
    const hasPixels = layer.framePixels.some((frame) => frame !== null);
    if (!hasPixels) {
      return;
    }
    const layerId = `layer${index}`;
    const trimmed = layer.name.trim();
    layers.push({
      id: layerId,
      name: trimmed === "" ? `L${index + 1}` : trimmed.slice(0, 64),
      visible: layer.visible,
      opacity: layer.opacity,
      lockedChannels: { ...layer.lockedChannels },
    });
    // Frames holding the same keyframe share one content (like linked cels).
    const contentByKey = new Map<string, string>();
    layer.framePixels.forEach((frame, frameIndex) => {
      if (frame === null) {
        return;
      }
      const key = layer.keyForFrame[frameIndex] ?? `${frameIndex}`;
      const shared = contentByKey.get(key);
      if (shared !== undefined) {
        cells.push({ layer: layerId, frame: frameIndex, content: shared });
        return;
      }
      const contentIndex = contents.length;
      const contentId = `content${contentIndex}`;
      const textureId = `texture${contentIndex}`;
      textures.push({
        id: textureId,
        name: `t${contentIndex + 1}`,
        width: frame.width,
        height: frame.height,
        buffer: frame.buffer,
      });
      contents.push({
        id: contentId,
        name: `C${contentIndex + 1}`,
        textureId,
        transform: {
          ...IDENTITY_LAYER_TRANSFORM,
          x: frame.canvasX + frame.width / 2 - width / 2,
          y: frame.canvasY + frame.height / 2 - height / 2,
        },
      });
      cells.push({ layer: layerId, frame: frameIndex, content: contentId });
      contentByKey.set(key, contentId);
    });
  });
  if (layers.length === 0) {
    fail("no importable layers");
  }
  return { width, height, layers, textures, contents, cells, frames, defaultFrameDuration, frameDurations: [] };
}
