/**
 * Hand-written WebM / Matroska / fragmented-MP4 muxers for animation
 * export. The app encodes frames with the platform WebCodecs encoder and
 * assembles the container here, so no muxer dependency or server is
 * needed. All functions are pure (byte assembly only) and unit-testable;
 * the browser only enters through `VideoEncoder` in GnumarusVideoEncode.
 *
 * Layout notes: WebM clusters split before the signed 16-bit SimpleBlock
 * timestamp would overflow; a leading SeekHead points at Info, Tracks and
 * every Cluster (strict players index through it). The MP4 is progressive
 * (ftyp + moov with complete sample tables + one mdat) so VLC/QuickTime
 * play it reliably; H.264 samples are reframed from Annex B to
 * length-prefixed AVCC. Durations come from the export delay list
 * (millisecond timescale).
 */

export interface GnumarusMuxedSample {
  /** Encoded payload: VP9 frame bytes, or AVCC length-prefixed NAL units. */
  data: Uint8Array;
  /** Presentation timestamp in milliseconds. */
  timestampMs: number;
  /** Frame duration in milliseconds. */
  durationMs: number;
  /** True for random-access (key) frames. */
  key: boolean;
}

export interface GnumarusMuxedTrack {
  width: number;
  height: number;
}

/** EBML element writer with deferred definite sizes (single pass). */
class EbmlWriter {
  private parts: Uint8Array[] = [];
  private length = 0;

  /** Buffered content length in bytes. */
  size(): number {
    return this.length;
  }

  writeBytes(data: Uint8Array): void {
    this.parts.push(data);
    this.length += data.length;
  }

  writeId(id: number): void {
    const bytes = id <= 0xff ? 1 : id <= 0xffff ? 2 : id <= 0xffffff ? 3 : 4;
    const out = new Uint8Array(bytes);
    for (let i = bytes - 1; i >= 0; i -= 1) {
      out[i] = id & 0xff;
      id = Math.floor(id / 256);
    }
    this.writeBytes(out);
  }

  writeSize(value: number): void {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`invalid EBML size ${value}`);
    }
    let bytes = 1;
    while (bytes < 8 && value >= 2 ** (7 * bytes) - 1) {
      bytes += 1;
    }
    const out = new Uint8Array(bytes);
    let rest = Math.floor(value);
    for (let i = bytes - 1; i >= 0; i -= 1) {
      out[i] = rest % 256;
      rest = Math.floor(rest / 256);
    }
    out[0] = (out[0] as number) | (1 << (8 - bytes));
    this.writeBytes(out);
  }

  writeUint(id: number, value: number, bytes: number): void {
    const out = new Uint8Array(bytes);
    let rest = Math.max(0, Math.floor(value));
    for (let i = bytes - 1; i >= 0; i -= 1) {
      out[i] = rest % 256;
      rest = Math.floor(rest / 256);
    }
    this.writeId(id);
    this.writeSize(bytes);
    this.writeBytes(out);
  }

  writeInt16(id: number, value: number): void {
    const out = new Uint8Array(2);
    const view = new DataView(out.buffer);
    view.setInt16(0, Math.max(-32768, Math.min(32767, Math.round(value))));
    this.writeId(id);
    this.writeSize(2);
    this.writeBytes(out);
  }

  writeFloat64(id: number, value: number): void {
    const out = new Uint8Array(8);
    new DataView(out.buffer).setFloat64(0, value);
    this.writeId(id);
    this.writeSize(8);
    this.writeBytes(out);
  }

  writeString(id: number, text: string): void {
    const out = new TextEncoder().encode(text);
    this.writeId(id);
    this.writeSize(out.length);
    this.writeBytes(out);
  }

  writeBinary(id: number, data: Uint8Array): void {
    this.writeId(id);
    this.writeSize(data.length);
    this.writeBytes(data);
  }

  element(id: number, build: (writer: EbmlWriter) => void): void {
    const child = new EbmlWriter();
    build(child);
    this.appendWriter(id, child);
  }

  /** Append an already-built child writer (for incremental clusters). */
  appendWriter(id: number, child: EbmlWriter): void {
    this.writeId(id);
    this.writeSize(child.length);
    for (const part of child.parts) {
      this.writeBytes(part);
    }
  }

  bytes(): Uint8Array {
    const out = new Uint8Array(this.length);
    let at = 0;
    for (const part of this.parts) {
      out.set(part, at);
      at += part.length;
    }
    return out;
  }
}

const EBML = 0x1a45dfa3;
const EBML_VERSION = 0x4286;
const EBML_READ_VERSION = 0x42f7;
const EBML_MAX_ID_LENGTH = 0x42f2;
const EBML_MAX_SIZE_LENGTH = 0x42f3;
const EBML_DOC_TYPE = 0x4282;
const EBML_DOC_TYPE_VERSION = 0x4287;
const EBML_DOC_TYPE_READ_VERSION = 0x4285;
const SEGMENT = 0x18538067;
const INFO = 0x1549a966;
const TIMECODE_SCALE = 0x2ad7b1;
const DURATION = 0x4489;
const MUXING_APP = 0x4d80;
const WRITING_APP = 0x5741;
const TRACKS = 0x1654ae6b;
const TRACK_ENTRY = 0xae;
const TRACK_NUMBER = 0xd7;
const TRACK_UID = 0x73c5;
const TRACK_TYPE = 0x83;
const FLAG_LACING = 0x9c;
const DEFAULT_DURATION = 0x23e383;
const CODEC_ID = 0x86;
const VIDEO_SETTINGS = 0xe0;
const PIXEL_WIDTH = 0xb0;
const PIXEL_HEIGHT = 0xba;
const CLUSTER = 0x1f43b675;
const CLUSTER_TIMECODE = 0xe7;
const SIMPLE_BLOCK = 0xa3;
const SEEK_HEAD = 0x114d9b74;
const SEEK = 0x4dbb;
const SEEK_ID = 0x53ab;
const SEEK_POSITION = 0x53ac;

const GNUMARUS_MUXER_APP = "Gnumaru's Painting and Animation App";

/** Cluster split threshold: keeps SimpleBlock int16 timestamps in range. */
const MAX_CLUSTER_SPAN_MS = 30000;

function writeEbmlHead(writer: EbmlWriter, docType: string): void {
  writer.element(EBML, (head) => {
    head.writeUint(EBML_VERSION, 1, 1);
    head.writeUint(EBML_READ_VERSION, 1, 1);
    head.writeUint(EBML_MAX_ID_LENGTH, 4, 1);
    head.writeUint(EBML_MAX_SIZE_LENGTH, 8, 1);
    head.writeString(EBML_DOC_TYPE, docType);
    head.writeUint(EBML_DOC_TYPE_VERSION, 4, 1);
    head.writeUint(EBML_DOC_TYPE_READ_VERSION, 2, 1);
  });
}

function writeSegmentInfo(writer: EbmlWriter, totalMs: number): void {
  writer.element(INFO, (info) => {
    info.writeUint(TIMECODE_SCALE, 1000000, 4);
    // Matroska durations use TimecodeScale units (milliseconds here).
    info.writeFloat64(DURATION, Math.max(0, totalMs));
    info.writeString(MUXING_APP, GNUMARUS_MUXER_APP);
    info.writeString(WRITING_APP, GNUMARUS_MUXER_APP);
  });
}

function writeVideoTrack(writer: EbmlWriter, codecId: string, track: GnumarusMuxedTrack, defaultDurationMs: number): void {
  const width = Math.max(1, Math.floor(track.width));
  const height = Math.max(1, Math.floor(track.height));
  writer.element(TRACKS, (tracks) => {
    tracks.element(TRACK_ENTRY, (entry) => {
      entry.writeUint(TRACK_NUMBER, 1, 1);
      entry.writeUint(TRACK_UID, 1, 4);
      entry.writeUint(TRACK_TYPE, 1, 1);
      entry.writeUint(FLAG_LACING, 0, 1);
      // Default frame duration in nanoseconds (players fall back to block
      // timestamp deltas for variable frame rates).
      entry.writeUint(DEFAULT_DURATION, Math.max(1, Math.round(defaultDurationMs * 1000000)), 8);
      entry.writeString(CODEC_ID, codecId);
      entry.element(VIDEO_SETTINGS, (video) => {
        video.writeUint(PIXEL_WIDTH, width, 2);
        video.writeUint(PIXEL_HEIGHT, height, 2);
      });
    });
  });
}

/** EBML VINT width for a definite size value (mirrors writeSize). */
function ebmlVintWidth(value: number): number {
  let bytes = 1;
  while (bytes < 8 && value >= 2 ** (7 * bytes) - 1) {
    bytes += 1;
  }
  return bytes;
}

/** EBML ID width in bytes (mirrors writeId). */
function ebmlIdWidth(id: number): number {
  if (id <= 0xff) {
    return 1;
  }
  if (id <= 0xffff) {
    return 2;
  }
  return id <= 0xffffff ? 3 : 4;
}

function writeSimpleBlock(writer: EbmlWriter, sample: GnumarusMuxedSample, clusterStartMs: number): void {
  const relative = Math.round(sample.timestampMs - clusterStartMs);
  const payload = sample.data;
  const head = new Uint8Array(4);
  head[0] = 0x81;
  new DataView(head.buffer).setInt16(1, relative);
  head[3] = sample.key ? 0x80 : 0x00;
  writer.writeId(SIMPLE_BLOCK);
  writer.writeSize(head.length + payload.length);
  writer.writeBytes(head);
  writer.writeBytes(payload);
}

/** Most common frame duration in milliseconds (DefaultDuration hint). */
export function modalFrameDurationMs(frames: GnumarusMuxedSample[]): number {
  const counts = new Map<number, number>();
  let best = 0;
  let bestCount = 0;
  for (const frame of frames) {
    const duration = Math.max(1, Math.round(frame.durationMs));
    const count = (counts.get(duration) ?? 0) + 1;
    counts.set(duration, count);
    if (count > bestCount) {
      bestCount = count;
      best = duration;
    }
  }
  return Math.max(1, best);
}

/**
 * Append a 1 ms duplicate of the last sample. VLC 3.0 drops a trailing
 * zero-duration SimpleBlock and stops MP4 playback at the last PTS instead
 * of holding it, so the real last frame never shows there. The duplicate
 * makes the true last frame non-final (it then carries its full duration
 * under every duration-derivation rule) while the tail itself stays
 * invisible to every player; total length grows by exactly 1 ms. Applied
 * unconditionally: the pixels match the last frame, so even a player that
 * held it a vsync longer would show no visual difference.
 */
export function withTailFrame(frames: GnumarusMuxedSample[]): GnumarusMuxedSample[] {
  if (frames.length === 0) {
    throw new Error("cannot mux an animation with no frames");
  }
  const last = frames[frames.length - 1];
  if (last === undefined) {
    throw new Error("cannot mux an animation with no frames");
  }
  return [
    ...frames,
    {
      data: last.data,
      timestampMs: last.timestampMs + Math.max(1, Math.round(last.durationMs)),
      durationMs: 1,
      key: false,
    },
  ];
}

function muxEbmlContainer(
  docType: string,
  codecId: string,
  track: GnumarusMuxedTrack,
  frames: GnumarusMuxedSample[],
): Uint8Array {
  if (frames.length === 0) {
    throw new Error("cannot mux an animation with no frames");
  }
  const first = frames[0];
  if (first === undefined) {
    throw new Error("cannot mux an animation with no frames");
  }
  const last = frames[frames.length - 1];
  if (last === undefined) {
    throw new Error("cannot mux an animation with no frames");
  }
  const totalMs = Math.max(0, last.timestampMs + last.durationMs);
  const writer = new EbmlWriter();
  writeEbmlHead(writer, docType);
  const info = new EbmlWriter();
  writeSegmentInfo(info, totalMs);
  const tracks = new EbmlWriter();
  writeVideoTrack(tracks, codecId, track, modalFrameDurationMs(frames));
  const clusters: EbmlWriter[] = [];
  let clusterStart = -1;
  let cluster: EbmlWriter | null = null;
  for (const sample of frames) {
    if (cluster === null || sample.timestampMs - clusterStart >= MAX_CLUSTER_SPAN_MS) {
      if (cluster !== null) {
        clusters.push(cluster);
      }
      cluster = new EbmlWriter();
      clusterStart = sample.timestampMs;
      cluster.writeUint(CLUSTER_TIMECODE, Math.max(0, Math.round(clusterStart)), 4);
    }
    if (cluster === null) {
      throw new Error("unreachable cluster state");
    }
    writeSimpleBlock(cluster, sample, clusterStart);
  }
  if (cluster !== null) {
    clusters.push(cluster);
  }
  // SeekHead first (strict players index through it): fixed-width entries
  // so positions resolve in a single pass. Positions are segment-content
  // relative, matching what mainstream muxers write. Note info/tracks are
  // already complete elements (their writers wrap once), so their totals
  // are their own lengths.
  const elementTotal = (id: number, content: EbmlWriter): number =>
    ebmlIdWidth(id) + ebmlVintWidth(content.size()) + content.size();
  const infoTotal = info.size();
  const tracksTotal = tracks.size();
  const clusterTotals = clusters.map((item) => elementTotal(CLUSTER, item));
  const seekEntryContent = (ebmlIdWidth(SEEK_ID) + 1 + ebmlIdWidth(INFO)) + (ebmlIdWidth(SEEK_POSITION) + 1 + 4);
  const seekContentLength = (2 + clusters.length) * (ebmlIdWidth(SEEK) + ebmlVintWidth(seekEntryContent) + seekEntryContent);
  const seekTotal = ebmlIdWidth(SEEK_HEAD) + ebmlVintWidth(seekContentLength) + seekContentLength;
  const seekContent = new EbmlWriter();
  let position = seekTotal;
  const seekTargets: number[] = [INFO, TRACKS];
  for (const item of clusters) {
    void item;
    seekTargets.push(CLUSTER);
  }
  let clusterIndex = 0;
  for (const target of seekTargets) {
    const targetPosition = position;
    seekContent.element(SEEK, (entry) => {
      entry.element(SEEK_ID, (id) => {
        id.writeId(target);
      });
      entry.writeUint(SEEK_POSITION, targetPosition, 4);
    });
    if (target === INFO) {
      position += infoTotal;
    } else if (target === TRACKS) {
      position += tracksTotal;
    } else {
      position += clusterTotals[clusterIndex] as number;
      clusterIndex += 1;
    }
  }
  const segment = new EbmlWriter();
  segment.appendWriter(SEEK_HEAD, seekContent);
  segment.writeBytes(info.bytes());
  segment.writeBytes(tracks.bytes());
  for (const item of clusters) {
    segment.appendWriter(CLUSTER, item);
  }
  writer.appendWriter(SEGMENT, segment);
  return writer.bytes();
}

/** Mux VP8/VP9 frames into a WebM file (DocType "webm"). */
export function muxWebM(
  track: GnumarusMuxedTrack,
  frames: GnumarusMuxedSample[],
  codecId = "V_VP9",
): Uint8Array {
  return muxEbmlContainer("webm", codecId, track, frames);
}

/** Mux VP8/VP9/H.264 frames into a Matroska file (same writer, "matroska" DocType). */
export function muxMatroska(
  track: GnumarusMuxedTrack,
  frames: GnumarusMuxedSample[],
  codecId = "V_VP9",
): Uint8Array {
  return muxEbmlContainer("matroska", codecId, track, frames);
}

/**
 * Split an H.264 Annex B byte stream into NAL units (3- and 4-byte start
 * codes, empty units dropped, SPS/PPS/SEI kept in-band for seeking).
 */
/**
 * Split an H.264 stream into NAL units. Understands both Annex B byte
 * streams (3- and 4-byte start codes, trailing zero padding stripped) and
 * already length-prefixed AVCC frames (some encoders, including Chromium's
 * WebCodecs H.264 output, hand those over), validating the latter.
 */
export function splitAnnexBNalus(data: Uint8Array): Uint8Array[] {
  if (startsWithStartCode(data)) {
    return splitAnnexBUnits(data);
  }
  const prefixed = trySplitAvccUnits(data);
  if (prefixed !== null) {
    return prefixed;
  }
  throw new Error("unrecognized H.264 framing: expected Annex B start codes or length-prefixed NALs");
}

function startsWithStartCode(data: Uint8Array): boolean {
  // Annex B allows a few leading zero bytes before the first start code.
  for (let at = 0; at < 8 && at + 2 < data.length; at += 1) {
    if (data[at] === 0 && data[at + 1] === 0 && data[at + 2] === 1) {
      return true;
    }
    if (at + 3 < data.length && data[at] === 0 && data[at + 1] === 0 && data[at + 2] === 0 && data[at + 3] === 1) {
      return true;
    }
  }
  return false;
}

function splitAnnexBUnits(data: Uint8Array): Uint8Array[] {
  const units: Uint8Array[] = [];
  let start = -1;
  let i = 0;
  const push = (end: number): void => {
    if (start >= 0 && end > start) {
      // Strip Annex B trailing zero padding (legal filler, not payload).
      let trimmed = end;
      while (trimmed > start && data[trimmed - 1] === 0) {
        trimmed -= 1;
      }
      if (trimmed > start) {
        units.push(data.slice(start, trimmed));
      }
    }
    start = -1;
  };
  while (i + 2 < data.length) {
    const isFour =
      data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 0 && data[i + 3] === 1;
    const isThree = data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 1;
    if (isFour || isThree) {
      push(i);
      i += isFour ? 4 : 3;
      start = i;
    } else {
      i += 1;
    }
  }
  push(data.length);
  return units;
}

/** Split already length-prefixed NALs, or null when the layout is invalid. */
function trySplitAvccUnits(data: Uint8Array): Uint8Array[] | null {
  const units: Uint8Array[] = [];
  let at = 0;
  while (at + 4 <= data.length) {
    const length =
      ((data[at] as number) * 16777216) +
      ((data[at + 1] as number) * 65536) +
      ((data[at + 2] as number) * 256) +
      (data[at + 3] as number);
    if (length < 1 || at + 4 + length > data.length) {
      return null;
    }
    const unit = data.slice(at + 4, at + 4 + length);
    // NAL headers always have the forbidden bit cleared.
    if ((unit[0] as number) >= 0x80) {
      return null;
    }
    units.push(unit);
    at += 4 + length;
  }
  if (at !== data.length || units.length === 0) {
    return null;
  }
  return units;
}

/** Length-prefixed AVCC sample from Annex B NAL units. */
export function annexBToAvccSample(data: Uint8Array): { bytes: Uint8Array; containsSps: boolean } {
  const units = splitAnnexBNalus(data);
  let total = 0;
  let containsSps = false;
  for (const unit of units) {
    if (unit.length === 0) {
      continue;
    }
    if (((unit[0] as number) & 0x1f) === 7) {
      containsSps = true;
    }
    total += 4 + unit.length;
  }
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  let at = 0;
  for (const unit of units) {
    if (unit.length === 0) {
      continue;
    }
    view.setUint32(at, unit.length);
    out.set(unit, at + 4);
    at += 4 + unit.length;
  }
  return { bytes: out, containsSps };
}

export interface GnumarusAvcDecoderConfig {
  profile: number;
  compatibility: number;
  level: number;
  sps: Uint8Array;
  pps: Uint8Array;
}

/**
 * Parse an H.264 decoder description into SPS/PPS. Accepts both the bare
 * avcC record and the full avcC box (size + "avcC" header) that some
 * encoders hand out.
 */
export function parseAvcDecoderConfig(description: Uint8Array): GnumarusAvcDecoderConfig {
  let raw = description;
  if (
    raw.length > 8 &&
    raw[4] === 0x61 &&
    raw[5] === 0x76 &&
    raw[6] === 0x63 &&
    raw[7] === 0x43
  ) {
    raw = raw.subarray(8);
  }
  if (raw.length < 8 || raw[0] !== 1) {
    throw new Error("unsupported H.264 decoder description (expected an avcC record)");
  }
  const spsCount = (raw[5] as number) & 0x1f;
  if (spsCount < 1) {
    throw new Error("H.264 decoder description has no SPS");
  }
  const spsLength = ((raw[6] as number) << 8) | (raw[7] as number);
  const spsStart = 8;
  const spsEnd = spsStart + spsLength;
  if (spsEnd > raw.length) {
    throw new Error("H.264 decoder description truncates its SPS");
  }
  const ppsCountIndex = spsEnd;
  const ppsCount = raw[ppsCountIndex] as number;
  if (ppsCount === undefined || ppsCount < 1 || ppsCountIndex + 3 > raw.length) {
    throw new Error("H.264 decoder description has no PPS");
  }
  const ppsLength = ((raw[ppsCountIndex + 1] as number) << 8) | (raw[ppsCountIndex + 2] as number);
  const ppsStart = ppsCountIndex + 3;
  if (ppsStart + ppsLength > raw.length) {
    throw new Error("H.264 decoder description truncates its PPS");
  }
  return {
    profile: raw[1] as number,
    compatibility: raw[2] as number,
    level: raw[3] as number,
    sps: raw.slice(spsStart, spsEnd),
    pps: raw.slice(ppsStart, ppsStart + ppsLength),
  };
}

/** Minimal big-endian box writer for fragmented MP4. */
class Mp4Writer {
  private parts: Uint8Array[] = [];
  private length = 0;

  writeBytes(data: Uint8Array): void {
    this.parts.push(data);
    this.length += data.length;
  }

  u8(value: number): void {
    this.writeBytes(new Uint8Array([value & 0xff]));
  }

  u16(value: number): void {
    const out = new Uint8Array(2);
    new DataView(out.buffer).setUint16(0, value);
    this.writeBytes(out);
  }

  u24(value: number): void {
    const out = new Uint8Array(3);
    const view = new DataView(out.buffer);
    view.setUint16(0, (value >>> 8) & 0xffff);
    out[2] = value & 0xff;
    this.writeBytes(out);
  }

  u32(value: number): void {
    const out = new Uint8Array(4);
    new DataView(out.buffer).setUint32(0, value >>> 0);
    this.writeBytes(out);
  }

  ascii(text: string): void {
    this.writeBytes(new TextEncoder().encode(text));
  }

  bytes(): Uint8Array {
    const out = new Uint8Array(this.length);
    let at = 0;
    for (const part of this.parts) {
      out.set(part, at);
      at += part.length;
    }
    return out;
  }
}

function mp4Box(type: string, ...payloads: Uint8Array[]): Uint8Array {
  let size = 8;
  for (const payload of payloads) {
    size += payload.length;
  }
  const writer = new Mp4Writer();
  writer.u32(size);
  writer.ascii(type);
  for (const payload of payloads) {
    writer.writeBytes(payload);
  }
  return writer.bytes();
}

function mp4FullBox(type: string, version: number, flags: number, ...payloads: Uint8Array[]): Uint8Array {
  const writer = new Mp4Writer();
  writer.u8(version);
  writer.u24(flags);
  for (const payload of payloads) {
    writer.writeBytes(payload);
  }
  return mp4Box(type, writer.bytes());
}

function mp4MatrixIdentity(): Uint8Array {
  const out = new Uint8Array(36);
  const view = new DataView(out.buffer);
  view.setUint32(0, 0x00010000);
  view.setUint32(12, 0x00010000);
  view.setUint32(24, 0x40000000);
  return out;
}

export interface GnumarusMp4Track {
  width: number;
  height: number;
  /** Parsed H.264 decoder description (SPS/PPS). */
  avc: GnumarusAvcDecoderConfig;
}

/**
 * Mux H.264 frames into a progressive MP4 (ftyp + moov with complete sample
 * tables + one mdat with every sample). Timescale is milliseconds, so delay
 * values map 1:1. Progressive (not fragmented) because strict players
 * (VLC, QuickTime) handle full sample tables far more reliably than
 * fragments; files stay small since animations are short. Video-only;
 * players loop or stop at the end.
 */
export function muxProgressiveMp4(
  track: GnumarusMp4Track,
  frames: GnumarusMuxedSample[],
): Uint8Array {
  if (frames.length === 0) {
    throw new Error("cannot mux an animation with no frames");
  }
  const first = frames[0];
  if (first === undefined) {
    throw new Error("cannot mux an animation with no frames");
  }
  const width = Math.max(1, Math.floor(track.width));
  const height = Math.max(1, Math.floor(track.height));
  let totalMs = 0;
  const durations: number[] = frames.map((frame) => {
    const duration = Math.max(1, Math.round(frame.durationMs));
    totalMs += duration;
    return duration;
  });
  const avcC = new Mp4Writer();
  avcC.u8(1);
  avcC.u8(track.avc.profile);
  avcC.u8(track.avc.compatibility);
  avcC.u8(track.avc.level);
  avcC.u8(0xff);
  avcC.u8(0xe1);
  avcC.u16(track.avc.sps.length);
  avcC.writeBytes(track.avc.sps);
  avcC.u8(1);
  avcC.u16(track.avc.pps.length);
  avcC.writeBytes(track.avc.pps);

  const visualEntry = new Mp4Writer();
  visualEntry.writeBytes(new Uint8Array(6));
  visualEntry.u16(1);
  visualEntry.writeBytes(new Uint8Array(16));
  visualEntry.u16(width);
  visualEntry.u16(height);
  visualEntry.u32(0x00480000);
  visualEntry.u32(0x00480000);
  visualEntry.u32(0);
  visualEntry.u16(1);
  visualEntry.writeBytes(new Uint8Array(32));
  visualEntry.u16(0x0018);
  visualEntry.u16(0xffff);
  const avcCBox = mp4Box("avcC", avcC.bytes());
  const avc1 = mp4Box("avc1", visualEntry.bytes(), avcCBox);
  const stsd = mp4FullBox("stsd", 0, 0, new Uint8Array([0, 0, 0, 1]), avc1);
  // Sample tables: every sample lives in one chunk inside a single mdat.
  const payloads: Uint8Array[] = [];
  for (const sample of frames) {
    const { bytes, containsSps } = annexBToAvccSample(sample.data);
    void containsSps;
    payloads.push(bytes);
  }
  const sttsBody = new Mp4Writer();
  const runs: Array<{ count: number; delta: number }> = [];
  for (const duration of durations) {
    const prev = runs[runs.length - 1];
    if (prev !== undefined && prev.delta === duration) {
      prev.count += 1;
    } else {
      runs.push({ count: 1, delta: duration });
    }
  }
  sttsBody.u32(runs.length);
  for (const run of runs) {
    sttsBody.u32(run.count);
    sttsBody.u32(run.delta);
  }
  const stts = mp4FullBox("stts", 0, 0, sttsBody.bytes());
  const stscBody = new Mp4Writer();
  stscBody.u32(1);
  stscBody.u32(1);
  stscBody.u32(frames.length);
  stscBody.u32(1);
  const stsc = mp4FullBox("stsc", 0, 0, stscBody.bytes());
  // Sync samples: without stss every sample counts as a keyframe, which
  // breaks delta frames (only the forced first frame is a keyframe here).
  const stssBody = new Mp4Writer();
  const keyframes: number[] = [];
  frames.forEach((sample, index) => {
    if (sample.key) {
      keyframes.push(index + 1);
    }
  });
  stssBody.u32(keyframes.length);
  for (const keyframe of keyframes) {
    stssBody.u32(keyframe);
  }
  const stss = mp4FullBox("stss", 0, 0, stssBody.bytes());
  const stszBody = new Mp4Writer();
  stszBody.u32(0);
  stszBody.u32(0);
  stszBody.u32(frames.length);
  for (const payload of payloads) {
    stszBody.u32(payload.length);
  }
  const stsz = mp4Box("stsz", stszBody.bytes());
  const dinfWriter = new Mp4Writer();
  dinfWriter.writeBytes(mp4FullBox("dref", 0, 0, new Uint8Array([0, 0, 0, 1])));
  dinfWriter.writeBytes(
    (() => {
      const url = new Mp4Writer();
      url.u32(12);
      url.ascii("url ");
      url.u32(1);
      return url.bytes();
    })(),
  );
  const dinf = mp4Box("dinf", dinfWriter.bytes());
  const vmhd = mp4FullBox("vmhd", 0, 1, new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]));
  const mdhdWriter = new Mp4Writer();
  mdhdWriter.u32(0);
  mdhdWriter.u32(0);
  mdhdWriter.u32(1000);
  mdhdWriter.u32(totalMs);
  mdhdWriter.u16(0x55c4);
  mdhdWriter.u16(0);
  const mdhd = mp4FullBox("mdhd", 0, 0, mdhdWriter.bytes());
  const hdlrName = new TextEncoder().encode("VideoHandler\0");
  const hdlrBody = new Mp4Writer();
  hdlrBody.u32(0);
  hdlrBody.ascii("vide");
  hdlrBody.writeBytes(new Uint8Array(12));
  hdlrBody.writeBytes(hdlrName);
  const hdlr = mp4FullBox("hdlr", 0, 0, hdlrBody.bytes());
  const tkhdWriter = new Mp4Writer();
  tkhdWriter.u32(0);
  tkhdWriter.u32(0);
  tkhdWriter.u32(1);
  tkhdWriter.u32(0);
  tkhdWriter.u32(totalMs);
  tkhdWriter.writeBytes(new Uint8Array(8));
  tkhdWriter.u16(0);
  tkhdWriter.u16(0);
  tkhdWriter.u16(0);
  tkhdWriter.u16(0);
  tkhdWriter.writeBytes(mp4MatrixIdentity());
  tkhdWriter.u32(width * 65536);
  tkhdWriter.u32(height * 65536);
  const tkhd = mp4FullBox("tkhd", 0, 7, tkhdWriter.bytes());
  // Chunk offset depends on the moov size but never on its own value, so a
  // probe build fixes the offset for the final build (single pass overall).
  const buildMoov = (chunkOffset: number): Uint8Array => {
    const stcoBody = new Mp4Writer();
    stcoBody.u32(0);
    stcoBody.u32(1);
    stcoBody.u32(chunkOffset);
    const stco = mp4Box("stco", stcoBody.bytes());
    const table = mp4Box("stbl", stsd, stts, stss, stsc, stsz, stco);
    const trackMinf = mp4Box("minf", vmhd, dinf, table);
    const trackMdia = mp4Box("mdia", mdhd, hdlr, trackMinf);
    const trackTrak = mp4Box("trak", tkhd, trackMdia);
    return mp4Box("moov", mvhd, trackTrak);
  };
  const mvhdWriter = new Mp4Writer();
  mvhdWriter.u32(0);
  mvhdWriter.u32(0);
  mvhdWriter.u32(1000);
  mvhdWriter.u32(totalMs);
  mvhdWriter.u32(0x00010000);
  mvhdWriter.u16(0x0100);
  mvhdWriter.u16(0);
  mvhdWriter.writeBytes(new Uint8Array(8));
  mvhdWriter.writeBytes(mp4MatrixIdentity());
  mvhdWriter.writeBytes(new Uint8Array(24));
  mvhdWriter.u32(2);
  const mvhd = mp4FullBox("mvhd", 0, 0, mvhdWriter.bytes());
  const ftypWriter = new Mp4Writer();
  ftypWriter.ascii("isom");
  ftypWriter.u32(0);
  ftypWriter.ascii("isomiso6avc1mp41");
  const ftyp = mp4Box("ftyp", ftypWriter.bytes());
  const chunkOffset = ftyp.length + buildMoov(0).length + 8;
  const moov = buildMoov(chunkOffset);

  const parts: Uint8Array[] = [ftyp, moov];
  const mdatHead = new Mp4Writer();
  let mediaBytes = 0;
  for (const payload of payloads) {
    mediaBytes += payload.length;
  }
  mdatHead.u32(8 + mediaBytes);
  mdatHead.ascii("mdat");
  parts.push(mdatHead.bytes());
  for (const payload of payloads) {
    parts.push(payload);
  }
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
