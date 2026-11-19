import { describe, expect, it } from "vitest";
import {
  annexBToAvccSample,
  modalFrameDurationMs,
  muxProgressiveMp4,
  muxMatroska,
  muxWebM,
  parseAvcDecoderConfig,
  splitAnnexBNalus,
  withTailFrame,
  type GnumarusMuxedSample,
} from "../src/export/GnumarusVideoMux";
import { padFramesToEven, videoBitrateForQuality, videoCodecString, videoTotalDurationMs } from "../src/export/GnumarusVideoEncode";

function fakeFrames(count: number, keyFirst = true): GnumarusMuxedSample[] {
  const frames: GnumarusMuxedSample[] = [];
  for (let i = 0; i < count; i += 1) {
    frames.push({
      data: new Uint8Array([0x9d + i, 0x12, 0x34, 0x56]),
      timestampMs: i * 200,
      durationMs: 200,
      key: keyFirst ? i === 0 : true,
    });
  }
  return frames;
}

/** Minimal top-level EBML walk (id, size, header length, value slice). */
function ebmlChildren(bytes: Uint8Array): Array<{ id: number; size: number; start: number; header: number; value: Uint8Array }> {
  const out: Array<{ id: number; size: number; start: number; header: number; value: Uint8Array }> = [];
  let at = 0;
  const readId = (): { id: number; length: number } => {
    const first = bytes[at] as number;
    let length = 1;
    for (let mask = 0x80; !(first & mask) && length < 8; mask >>= 1) {
      length += 1;
    }
    let id = 0;
    for (let i = 0; i < length; i += 1) {
      id = id * 256 + (bytes[at + i] as number);
    }
    return { id, length };
  };
  const readSize = (offset: number): { size: number; length: number } => {
    const first = bytes[offset] as number;
    let length = 1;
    for (let mask = 0x80; !(first & mask) && length < 8; mask >>= 1) {
      length += 1;
    }
    let size = first & (0xff >> length);
    for (let i = 1; i < length; i += 1) {
      size = size * 256 + (bytes[offset + i] as number);
    }
    return { size, length };
  };
  while (at < bytes.length) {
    const id = readId();
    const size = readSize(at + id.length);
    const header = id.length + size.length;
    out.push({ id: id.id, size: size.size, start: at, header, value: bytes.slice(at + header, at + header + size.size) });
    at += header + size.size;
  }
  return out;
}

function ebmlString(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

/** Walk nested EBML containers depth-first, collecting raw ids. */
function ebmlIds(bytes: Uint8Array, containers: number[]): number[] {
  const found: number[] = [];
  const walk = (data: Uint8Array): void => {
    for (const child of ebmlChildren(data)) {
      found.push(child.id);
      if (containers.includes(child.id)) {
        walk(child.value);
      }
    }
  };
  walk(bytes);
  return found;
}

/** Minimal top-level MP4 box walk (size, type, payload). */
function mp4Boxes(bytes: Uint8Array): Array<{ type: string; size: number; start: number; payload: Uint8Array }> {
  const out: Array<{ type: string; size: number; start: number; payload: Uint8Array }> = [];
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.length);
  let at = 0;
  while (at + 8 <= bytes.length) {
    const size = view.getUint32(at);
    const type = String.fromCharCode(bytes[at + 4] as number, bytes[at + 5] as number, bytes[at + 6] as number, bytes[at + 7] as number);
    if (size < 8 || at + size > bytes.length) {
      break;
    }
    out.push({ type, size, start: at, payload: bytes.slice(at + 8, at + size) });
    at += size;
  }
  return out;
}

describe("GnumarusVideoMux EBML", () => {
  it("writes a playable-shaped WebM: header, segment, tracks and clusters", () => {
    const file = muxWebM({ width: 64, height: 64 }, fakeFrames(3));
    const top = ebmlChildren(file);
    expect(top[0]?.id).toBe(0x1a45dfa3);
    expect(top[1]?.id).toBe(0x18538067);
    expect((top[1]?.start ?? 0) + (top[1]?.header ?? 0) + (top[1]?.size ?? 0)).toBe(file.length);
    const ids = ebmlIds(file, [0x1a45dfa3, 0x18538067, 0x1549a966, 0x1654ae6b, 0xae, 0x1f43b675]);
    expect(ids).toContain(0x4282);
    expect(ids).toContain(0x1549a966);
    expect(ids).toContain(0x1654ae6b);
    const clusters = ids.filter((id) => id === 0x1f43b675);
    expect(clusters.length).toBe(1);
    // Codec id and dimensions round-trip.
    const segment = top[1];
    expect(segment).toBeDefined();
    let codec = "";
    const walkStrings = (data: Uint8Array, want: number): void => {
      for (const child of ebmlChildren(data)) {
        if (child.id === want) {
          codec = ebmlString(child.value);
        }
        if ([0x18538067, 0x1654ae6b, 0xae, 0xe0].includes(child.id)) {
          walkStrings(child.value, want);
        }
      }
    };
    if (segment !== undefined) {
      walkStrings(segment.value, 0x86);
    }
    expect(codec).toBe("V_VP9");
  });

  it("writes a SeekHead indexing Info, Tracks and every cluster", () => {
    const frames = fakeFrames(3);
    const file = muxWebM({ width: 64, height: 64 }, frames);
    const segment = ebmlChildren(file)[1];
    expect(segment?.id).toBe(0x18538067);
    if (segment === undefined) {
      throw new Error("missing segment");
    }
    const children = ebmlChildren(segment.value);
    expect(children[0]?.id).toBe(0x114d9b74);
    // Collect absolute offsets of each segment child.
    const offsets = new Map<number, number>();
    let at = segment.start + segment.header;
    for (const child of children) {
      offsets.set(child.id, at - (segment.start + segment.header));
      at += child.header + child.size;
    }
    // Seek entries resolve to content-relative positions.
    const seek = children[0];
    if (seek === undefined) {
      throw new Error("missing seek head");
    }
    const targets = new Map<number, number>();
    for (const entry of ebmlChildren(seek.value)) {
      expect(entry.id).toBe(0x4dbb);
      let target = -1;
      let position = -1;
      for (const field of ebmlChildren(entry.value)) {
        if (field.id === 0x53ab) {
          let id = 0;
          for (const byte of field.value) {
            id = id * 256 + (byte as number);
          }
          target = id;
        }
        if (field.id === 0x53ac) {
          position = 0;
          for (const byte of field.value) {
            position = position * 256 + (byte as number);
          }
        }
      }
      expect(target).toBeGreaterThan(0);
      expect(position).toBeGreaterThanOrEqual(0);
      targets.set(target, position);
    }
    expect(targets.get(0x1549a966)).toBe(offsets.get(0x1549a966));
    expect(targets.get(0x1654ae6b)).toBe(offsets.get(0x1654ae6b));
    expect(targets.get(0x1f43b675)).toBe(offsets.get(0x1f43b675));
  });

  it("uses the modal duration so a tail frame never skews the hint", () => {
    expect(modalFrameDurationMs(fakeFrames(3))).toBe(200);
    const mixed: GnumarusMuxedSample[] = [
      { data: new Uint8Array([1]), timestampMs: 0, durationMs: 100, key: true },
      { data: new Uint8Array([2]), timestampMs: 100, durationMs: 300, key: false },
      { data: new Uint8Array([3]), timestampMs: 400, durationMs: 100, key: false },
    ];
    expect(modalFrameDurationMs(mixed)).toBe(100);
    expect(modalFrameDurationMs([])).toBe(1);
  });

  it("appends an invisible 1 ms duplicate of the last sample", () => {
    const frames = fakeFrames(3);
    const tailed = withTailFrame(frames);
    expect(tailed).toHaveLength(4);
    expect(tailed.slice(0, 3)).toEqual(frames);
    const tail = tailed[3] as GnumarusMuxedSample;
    expect(tail.timestampMs).toBe(600);
    expect(tail.durationMs).toBe(1);
    expect(tail.key).toBe(false);
    expect(tail.data).toBe((frames[2] as GnumarusMuxedSample).data);
    // The mode duration ignores the tail frame.
    expect(modalFrameDurationMs(tailed)).toBe(200);
    expect(() => withTailFrame([])).toThrow(/no frames/);
  });

  it("writes a DefaultDuration matching the average frame duration", () => {
    const file = muxWebM({ width: 64, height: 64 }, fakeFrames(4));
    const segment = ebmlChildren(file)[1];
    if (segment === undefined) {
      throw new Error("missing segment");
    }
    let durationNs = -1;
    const walk = (data: Uint8Array, containers: number[]): void => {
      for (const child of ebmlChildren(data)) {
        if (child.id === 0x23e383) {
          durationNs = 0;
          for (const byte of child.value) {
            durationNs = durationNs * 256 + (byte as number);
          }
        }
        if (containers.includes(child.id)) {
          walk(child.value, containers);
        }
      }
    };
    walk(segment.value, [0x1654ae6b, 0xae]);
    // 4 frames x 200ms = 800ms total, average 200ms = 200000000ns.
    expect(durationNs).toBe(200000000);
  });

  it("splits clusters before the int16 SimpleBlock range overflows", () => {
    const frames: GnumarusMuxedSample[] = [];
    for (let i = 0; i < 4; i += 1) {
      frames.push({ data: new Uint8Array([i]), timestampMs: i * 20000, durationMs: 20000, key: i === 0 });
    }
    const file = muxWebM({ width: 16, height: 16 }, frames);
    const ids = ebmlIds(file, [0x18538067, 0x1f43b675]);
    expect(ids.filter((id) => id === 0x1f43b675).length).toBeGreaterThanOrEqual(2);
  });

  it("writes Matroska with the matroska DocType", () => {
    const file = muxMatroska({ width: 16, height: 16 }, fakeFrames(1), "V_MPEG4/ISO/AVC");
    const head = ebmlChildren(file)[0];
    expect(head?.id).toBe(0x1a45dfa3);
    let docType = "";
    if (head !== undefined) {
      for (const child of ebmlChildren(head.value)) {
        if (child.id === 0x4282) {
          docType = ebmlString(child.value);
        }
      }
    }
    expect(docType).toBe("matroska");
    expect(() => muxMatroska({ width: 16, height: 16 }, [])).toThrow(/no frames/);
  });
});

describe("GnumarusVideoMux Annex B", () => {
  it("splits 3- and 4-byte start codes and length-prefixes them", () => {
    const stream = new Uint8Array([0, 0, 0, 1, 0x67, 0x42, 0, 0, 1, 0x68, 0xce, 0, 0, 0, 1, 0x65, 1, 2, 3]);
    const units = splitAnnexBNalus(stream);
    expect(units.map((unit) => Array.from(unit.slice(0, 2)))).toEqual([[0x67, 0x42], [0x68, 0xce], [0x65, 1]]);
    const { bytes, containsSps } = annexBToAvccSample(stream);
    expect(containsSps).toBe(true);
    const view = new DataView(bytes.buffer);
    expect(view.getUint32(0)).toBe(2);
    expect(bytes[4]).toBe(0x67);
    expect(bytes[4 + 2 + 4]).toBe(0x68);
  });

  it("passes through length-prefixed NALs and rejects garbage", () => {
    const framed = new Uint8Array([0, 0, 0, 2, 0x67, 0x42, 0, 0, 0, 3, 0x65, 0x01, 0x02]);
    expect(splitAnnexBNalus(framed).map((unit) => Array.from(unit))).toEqual([
      [0x67, 0x42],
      [0x65, 0x01, 0x02],
    ]);
    const { bytes, containsSps } = annexBToAvccSample(framed);
    expect(containsSps).toBe(true);
    expect(bytes[0]).toBe(0);
    expect(bytes[4]).toBe(0x67);
    expect(() => splitAnnexBNalus(new Uint8Array([1, 2, 3]))).toThrow(/framing/);
    expect(() => splitAnnexBNalus(new Uint8Array([0, 0, 0, 99, 0x65]))).toThrow(/framing/);
  });

  it("parses avcC records with and without the box header", () => {
    const sps = new Uint8Array([0x67, 0x42, 0x00, 0x1e, 0x01, 0x02]);
    const pps = new Uint8Array([0x68, 0xce, 0x38, 0x80]);
    const record = new Uint8Array([1, 0x42, 0x00, 0x1e, 0xff, 0xe1, 0, 6, ...sps, 1, 0, 4, ...pps]);
    const bare = parseAvcDecoderConfig(record);
    expect(bare.profile).toBe(0x42);
    expect(Array.from(bare.sps)).toEqual(Array.from(sps));
    expect(Array.from(bare.pps)).toEqual(Array.from(pps));
    const boxed = new Uint8Array(8 + record.length);
    new DataView(boxed.buffer).setUint32(0, 8 + record.length);
    boxed.set([0x61, 0x76, 0x63, 0x43], 4);
    boxed.set(record, 8);
    expect(Array.from(parseAvcDecoderConfig(boxed).sps)).toEqual(Array.from(sps));
    expect(() => parseAvcDecoderConfig(new Uint8Array([2, 0, 0, 0, 0xff, 0xe1, 0, 0, 0]))).toThrow(/avcC/);
    expect(() => parseAvcDecoderConfig(new Uint8Array([1, 0x42, 0, 0x1e, 0xff, 0xe0, 0, 0]))).toThrow(/SPS/);
  });
});

describe("GnumarusVideoMux progressive MP4", () => {
  const sps = new Uint8Array([0x67, 0x42, 0x00, 0x1e, 0x01, 0x02]);
  const pps = new Uint8Array([0x68, 0xce, 0x38, 0x80]);
  const config = { profile: 0x42, compatibility: 0, level: 0x1f, sps, pps };

  /** Find a nested box by walking container payloads. */
  function findBox(root: Uint8Array, path: string[]): Uint8Array | null {
    let level: Array<{ type: string; start: number; payload: Uint8Array }> = mp4Boxes(root);
    for (const want of path) {
      const next = level.find((box) => box.type === want);
      if (next === undefined) {
        return null;
      }
      if (want === path[path.length - 1]) {
        return next.payload;
      }
      level = mp4Boxes(next.payload);
    }
    return null;
  }

  function u32(view: Uint8Array, at: number): number {
    return new DataView(view.buffer, view.byteOffset, view.length).getUint32(at);
  }

  it("writes ftyp/moov/mdat with complete sample tables", () => {
    const frames: GnumarusMuxedSample[] = [
      { data: new Uint8Array([0, 0, 0, 1, 0x67, 1, 0, 0, 1, 0x65, 2]), timestampMs: 0, durationMs: 200, key: true },
      { data: new Uint8Array([0, 0, 1, 0x41, 9, 9]), timestampMs: 200, durationMs: 300, key: false },
    ];
    const file = muxProgressiveMp4({ width: 64, height: 64, avc: config }, frames);
    const boxes = mp4Boxes(file);
    expect(boxes.map((box) => box.type)).toEqual(["ftyp", "moov", "mdat"]);
    expect(boxes[0]?.size).toBe(32);
    // moov carries avcC with our SPS.
    const moov = boxes[1]?.payload ?? new Uint8Array(0);
    const haystack = Array.from(moov);
    const needle = [0x61, 0x76, 0x63, 0x43];
    let avccAt = -1;
    for (let i = 0; i + 4 <= haystack.length; i += 1) {
      if (needle.every((byte, j) => haystack[i + j] === byte)) {
        avccAt = i;
        break;
      }
    }
    expect(avccAt).toBeGreaterThanOrEqual(0);
    expect(moov[avccAt + 4]).toBe(1);
    expect(moov[avccAt + 12]).toBe(0x67);
    // stts compresses the two durations into two runs (200, 300).
    const stts = findBox(file, ["moov", "trak", "mdia", "minf", "stbl", "stts"]);
    expect(stts).not.toBeNull();
    if (stts !== null) {
      expect(u32(stts, 4)).toBe(2);
      expect(u32(stts, 8)).toBe(1);
      expect(u32(stts, 12)).toBe(200);
      expect(u32(stts, 16)).toBe(1);
      expect(u32(stts, 20)).toBe(300);
    }
    // stss marks only the first sample as a keyframe.
    const stss = findBox(file, ["moov", "trak", "mdia", "minf", "stbl", "stss"]);
    expect(stss).not.toBeNull();
    if (stss !== null) {
      expect(u32(stss, 4)).toBe(1);
      expect(u32(stss, 8)).toBe(1);
    }
    // stsz carries one exact size per sample (no default sample size).
    const stsz = findBox(file, ["moov", "trak", "mdia", "minf", "stbl", "stsz"]);
    expect(stsz).not.toBeNull();
    if (stsz !== null) {
      expect(u32(stsz, 4)).toBe(0);
      expect(u32(stsz, 8)).toBe(2);
      expect(u32(stsz, 12)).toBe(12);
      expect(u32(stsz, 16)).toBe(7);
    }
    // stco points at the single mdat payload; samples split AVCC-cleanly.
    const stco = findBox(file, ["moov", "trak", "mdia", "minf", "stbl", "stco"]);
    expect(stco).not.toBeNull();
    if (stco !== null) {
      expect(u32(stco, 4)).toBe(1);
      const mdat = boxes[2];
      expect(mdat?.type).toBe("mdat");
      if (mdat !== undefined) {
        expect(u32(stco, 8)).toBe(mdat.start + 8);
        expect(mdat.size).toBe(8 + 12 + 7);
      }
    }
    expect(() => muxProgressiveMp4({ width: 64, height: 64, avc: config }, [])).toThrow(/no frames/);
  });
});

describe("GnumarusVideoEncode helpers", () => {
  it("maps quality to a sane bitrate", () => {
    expect(videoBitrateForQuality(64, 64, 10, 1)).toBe(50000);
    expect(videoBitrateForQuality(1920, 1080, 60, 1)).toBeLessThanOrEqual(60000000);
    expect(videoBitrateForQuality(640, 480, 10, 1)).toBeGreaterThan(videoBitrateForQuality(640, 480, 10, 0));
    expect(videoBitrateForQuality(0, 0, 0, 0)).toBe(50000);
    expect(videoCodecString("avc")).toBe("avc1.42E028");
  });

  it("sums frame delays", () => {
    expect(videoTotalDurationMs([200, 200, 200])).toBe(600);
    expect(videoTotalDurationMs([])).toBe(0);
  });

  it("pads odd dimensions by replicating the edge", () => {
    // 3x1 red row: padded to 4x2, new column/row repeat the edge pixel.
    const frame = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255]);
    const { frames, width, height } = padFramesToEven([frame], 3, 1);
    expect(width).toBe(4);
    expect(height).toBe(2);
    expect(frames).toHaveLength(1);
    const out = frames[0] as Uint8ClampedArray;
    expect(out.length).toBe(4 * 2 * 4);
    // First row: r, g, b, then replicated b.
    expect(Array.from(out.slice(0, 16))).toEqual([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 0, 0, 255, 255]);
    // Second row replicates the first row.
    expect(Array.from(out.slice(16, 32))).toEqual(Array.from(out.slice(0, 16)));
  });

  it("leaves even dimensions untouched", () => {
    const frame = new Uint8ClampedArray(2 * 2 * 4).fill(7);
    const result = padFramesToEven([frame], 2, 2);
    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
    expect(result.frames[0]).toBe(frame);
  });
});
