import { describe, expect, it } from "vitest";
import { GnumarusPsdError, parsePsdFile } from "../src/project/GnumarusPsd";

class PsdWriter {
  private parts: Uint8Array[] = [];

  u8(value: number): this {
    this.parts.push(new Uint8Array([value & 0xff]));
    return this;
  }

  u16(value: number): this {
    this.parts.push(new Uint8Array([(value >> 8) & 0xff, value & 0xff]));
    return this;
  }

  i16(value: number): this {
    return this.u16(value < 0 ? 0x10000 + value : value);
  }

  u32(value: number): this {
    const out = new Uint8Array(4);
    new DataView(out.buffer).setUint32(0, value, false);
    this.parts.push(out);
    return this;
  }

  i32(value: number): this {
    const out = new Uint8Array(4);
    new DataView(out.buffer).setInt32(0, value, false);
    this.parts.push(out);
    return this;
  }

  ascii(text: string): this {
    const out = new Uint8Array(text.length);
    for (let index = 0; index < text.length; index += 1) {
      out[index] = text.charCodeAt(index) & 0xff;
    }
    this.parts.push(out);
    return this;
  }

  bytes(data: Uint8Array): this {
    this.parts.push(data);
    return this;
  }

  latin1(text: string): this {
    const out = new Uint8Array(text.length);
    for (let index = 0; index < text.length; index += 1) {
      out[index] = text.charCodeAt(index) & 0xff;
    }
    this.parts.push(out);
    return this;
  }

  /** Pascal string padded to a multiple of 4 bytes. */
  pascal4(text: string): this {
    this.u8(text.length);
    this.latin1(text);
    const pad = (4 - ((1 + text.length) % 4)) % 4;
    for (let index = 0; index < pad; index += 1) {
      this.u8(0);
    }
    return this;
  }

  unicodeString(text: string): this {
    this.u32(text.length);
    for (const unit of text) {
      this.u16(unit.charCodeAt(0));
    }
    return this;
  }

  build(): Uint8Array {
    let total = 0;
    for (const part of this.parts) {
      total += part.length;
    }
    const out = new Uint8Array(total);
    let pos = 0;
    for (const part of this.parts) {
      out.set(part, pos);
      pos += part.length;
    }
    return out;
  }
}

interface FixturePlane {
  id: number;
  compression: number;
  payload: Uint8Array;
}

interface FixtureLayer {
  top: number;
  left: number;
  bottom: number;
  right: number;
  opacity?: number;
  flags?: number;
  name?: string;
  planes: FixturePlane[];
}

function channelData(planes: FixturePlane[]): Uint8Array {
  const writer = new PsdWriter();
  for (const plane of planes) {
    writer.u16(plane.compression);
    writer.bytes(plane.payload);
  }
  return writer.build();
}

function layerRecord(
  writer: PsdWriter,
  layer: FixtureLayer,
  channelLengths: number[],
): void {
  writer.i32(layer.top).i32(layer.left).i32(layer.bottom).i32(layer.right);
  writer.u16(layer.planes.length);
  layer.planes.forEach((plane, index) => {
    writer.i16(plane.id).u32(channelLengths[index] ?? 0);
  });
  writer.ascii("8BIM").ascii("norm");
  writer.u8(layer.opacity ?? 255).u8(0).u8(layer.flags ?? 8).u8(0);
  const extra = new PsdWriter();
  extra.u32(0);
  extra.u32(0);
  extra.pascal4(layer.name ?? "");
  const extraBytes = extra.build();
  writer.u32(extraBytes.length).bytes(extraBytes);
}

async function buildPsd(options: {
  width: number;
  height: number;
  depth?: number;
  mode?: number;
  channels?: number;
  colorTable?: Uint8Array;
  layers?: FixtureLayer[];
  taggedBlocks?: Uint8Array[];
  composite?: { compression: number; planes: Uint8Array[]; counts?: number[] };
}): Promise<Uint8Array> {
  const depth = options.depth ?? 8;
  const mode = options.mode ?? 3;
  const writer = new PsdWriter();
  writer.ascii("8BPS").u16(1);
  writer.bytes(new Uint8Array(6));
  writer.u16(options.channels ?? (mode === 3 ? 3 : 1));
  writer.u32(options.height).u32(options.width);
  writer.u16(depth).u16(mode);
  if (options.colorTable !== undefined) {
    writer.u32(options.colorTable.length).bytes(options.colorTable);
  } else {
    writer.u32(0);
  }
  writer.u32(0);
  const section = new PsdWriter();
  const info = new PsdWriter();
  const layers = options.layers ?? [];
  const records = new PsdWriter();
  records.i16(layers.length);
  const channelBlobs: Uint8Array[] = [];
  for (const layer of layers) {
    const lengths = layer.planes.map((plane) => 2 + plane.payload.length);
    layerRecord(records, layer, lengths);
    channelBlobs.push(channelData(layer.planes));
  }
  const recordBytes = records.build();
  let channelTotal = 0;
  for (const blob of channelBlobs) {
    channelTotal += blob.length;
  }
  const contentLength = recordBytes.length + channelTotal;
  const pad = contentLength % 2;
  info.u32(contentLength + pad);
  info.bytes(recordBytes);
  for (const blob of channelBlobs) {
    info.bytes(blob);
  }
  if (pad === 1) {
    info.u8(0);
  }
  section.bytes(info.build());
  section.u32(0);
  for (const block of options.taggedBlocks ?? []) {
    section.bytes(block);
  }
  const sectionBytes = section.build();
  writer.u32(sectionBytes.length).bytes(sectionBytes);
  if (options.composite !== undefined) {
    writer.u16(options.composite.compression);
    if (options.composite.counts !== undefined) {
      for (const count of options.composite.counts) {
        writer.u16(count);
      }
    }
    for (const plane of options.composite.planes) {
      writer.bytes(plane);
    }
  }
  return writer.build();
}

function taggedBlock(key: string, data: Uint8Array): Uint8Array {
  const writer = new PsdWriter();
  writer.ascii("8BIM").ascii(key).u32(data.length).bytes(data);
  if (data.length % 2 === 1) {
    writer.u8(0);
  }
  return writer.build();
}

function solidPlane(width: number, height: number, value: number): Uint8Array {
  return new Uint8Array(width * height).fill(value);
}

async function deflate(data: Uint8Array): Promise<Uint8Array> {
  const output = await new Response(
    new Blob([data.slice()]).stream().pipeThrough(new CompressionStream("deflate")),
  ).arrayBuffer();
  return new Uint8Array(output);
}

function deltaEncodePlane(data: Uint8Array, width: number): Uint8Array {
  const out = new Uint8Array(data.length);
  for (let rowStart = 0; rowStart + width <= data.length; rowStart += width) {
    out[rowStart] = data[rowStart] ?? 0;
    for (let x = 1; x < width; x += 1) {
      out[rowStart + x] = ((data[rowStart + x] ?? 0) - (data[rowStart + x - 1] ?? 0)) & 0xff;
    }
  }
  return out;
}

describe("GnumarusPsdImport", () => {
  it("imports raw RGB layers bottom-first with offsets, opacity and names", async () => {
    const file = await buildPsd({
      width: 4,
      height: 4,
      layers: [
        {
          top: 1,
          left: 1,
          bottom: 3,
          right: 3,
          opacity: 128,
          name: "Dot",
          planes: [
            { id: 0, compression: 0, payload: solidPlane(2, 2, 255) },
            { id: -1, compression: 0, payload: solidPlane(2, 2, 255) },
          ],
        },
        {
          top: 0,
          left: 0,
          bottom: 4,
          right: 4,
          name: "Sky",
          planes: [
            { id: 0, compression: 0, payload: solidPlane(4, 4, 0) },
            { id: 1, compression: 0, payload: solidPlane(4, 4, 0) },
            { id: 2, compression: 0, payload: solidPlane(4, 4, 255) },
          ],
        },
      ],
    });
    const doc = await parsePsdFile(file);
    expect(doc.width).toBe(4);
    expect(doc.height).toBe(4);
    expect(doc.layers.map((layer) => layer.name)).toEqual(["Sky", "Dot"]);
    expect(doc.layers.map((layer) => layer.id)).toEqual(["layer0", "layer1"]);
    expect(doc.layers[0]).toMatchObject({ visible: true, opacity: 1 });
    expect(doc.layers[1]).toMatchObject({ visible: true, opacity: 128 / 255 });
    expect(doc.textures[0]).toMatchObject({ width: 4, height: 4 });
    expect(doc.textures[1]).toMatchObject({ width: 2, height: 2 });
    // Dot is red with opaque alpha (green/blue planes missing default to 0).
    expect(Array.from(doc.textures[1]?.buffer.slice(0, 8) ?? [])).toEqual([255, 0, 0, 255, 255, 0, 0, 255]);
    // Sky is blue and opaque (alpha plane missing defaults to 255).
    expect(Array.from(doc.textures[0]?.buffer.slice(0, 4) ?? [])).toEqual([0, 0, 255, 255]);
    // Center-relative offsets: Dot spans (1,1)-(3,3) of a 4x4 canvas.
    expect(doc.contents[1]?.transform).toMatchObject({ x: 0, y: 0 });
    expect(doc.contents[0]?.transform).toMatchObject({ x: 0, y: 0 });
    expect(doc.cells).toEqual([
      { layer: "layer0", frame: 0, content: "content0" },
      { layer: "layer1", frame: 0, content: "content1" },
    ]);
  });

  it("marks layers with flags bit 1 as hidden", async () => {
    const file = await buildPsd({
      width: 2,
      height: 2,
      layers: [
        {
          top: 0,
          left: 0,
          bottom: 2,
          right: 2,
          flags: 0x0a,
          name: "Ghost",
          planes: [{ id: 0, compression: 0, payload: solidPlane(2, 2, 9) }],
        },
        {
          top: 0,
          left: 0,
          bottom: 2,
          right: 2,
          flags: 0x08,
          name: "Solid",
          planes: [{ id: 0, compression: 0, payload: solidPlane(2, 2, 9) }],
        },
      ],
    });
    const doc = await parsePsdFile(file);
    expect(doc.layers.map((layer) => [layer.name, layer.visible])).toEqual([
      ["Solid", true],
      ["Ghost", false],
    ]);
  });

  it("decodes RLE PackBits rows with literals and repeats", async () => {
    // Row 0: repeat 7 three times, then literals 1,2. Row 1: five literals.
    const row0 = new Uint8Array([0xfe, 7, 0x01, 1, 2]);
    const row1 = new Uint8Array([0x04, 3, 4, 5, 6, 7]);
    const payload = new Uint8Array(4 + row0.length + row1.length);
    new DataView(payload.buffer).setUint16(0, row0.length, false);
    new DataView(payload.buffer).setUint16(2, row1.length, false);
    payload.set(row0, 4);
    payload.set(row1, 4 + row0.length);
    const file = await buildPsd({
      width: 5,
      height: 2,
      layers: [
        {
          top: 0,
          left: 0,
          bottom: 2,
          right: 5,
          name: "R",
          planes: [{ id: 0, compression: 1, payload }],
        },
      ],
    });
    const doc = await parsePsdFile(file);
    const red = Array.from(doc.textures[0]?.buffer ?? []).filter((_, index) => index % 4 === 0);
    expect(red).toEqual([7, 7, 7, 1, 2, 3, 4, 5, 6, 7]);
  });

  it("maps grayscale and indexed color to RGB", async () => {
    const gray = await buildPsd({
      width: 2,
      height: 1,
      mode: 1,
      channels: 2,
      layers: [
        {
          top: 0,
          left: 0,
          bottom: 1,
          right: 2,
          name: "G",
          planes: [
            { id: 0, compression: 0, payload: new Uint8Array([200, 10]) },
            { id: -1, compression: 0, payload: new Uint8Array([255, 128]) },
          ],
        },
      ],
    });
    const grayDoc = await parsePsdFile(gray);
    expect(Array.from(grayDoc.textures[0]?.buffer ?? [])).toEqual([200, 200, 200, 255, 10, 10, 10, 128]);
    const table = new Uint8Array(768);
    table[5] = 11;
    table[256 + 5] = 22;
    table[512 + 5] = 33;
    const indexed = await buildPsd({
      width: 1,
      height: 1,
      mode: 2,
      colorTable: table,
      layers: [
        {
          top: 0,
          left: 0,
          bottom: 1,
          right: 1,
          name: "I",
          planes: [{ id: 0, compression: 0, payload: new Uint8Array([5]) }],
        },
      ],
    });
    const indexedDoc = await parsePsdFile(indexed);
    expect(Array.from(indexedDoc.textures[0]?.buffer ?? [])).toEqual([11, 22, 33, 255]);
  });

  it("keeps the most significant byte of 16-bit samples", async () => {
    const file = await buildPsd({
      width: 1,
      height: 1,
      depth: 16,
      mode: 1,
      layers: [
        {
          top: 0,
          left: 0,
          bottom: 1,
          right: 1,
          name: "Deep",
          planes: [{ id: 0, compression: 0, payload: new Uint8Array([0xab, 0xcd]) }],
        },
      ],
    });
    const doc = await parsePsdFile(file);
    expect(Array.from(doc.textures[0]?.buffer ?? [])).toEqual([0xab, 0xab, 0xab, 255]);
  });

  it("round-trips ZIP channels with and without prediction", async () => {
    const samples = new Uint8Array([10, 20, 35, 40, 50, 70]);
    const file = await buildPsd({
      width: 3,
      height: 2,
      layers: [
        {
          top: 0,
          left: 0,
          bottom: 2,
          right: 3,
          name: "Z",
          planes: [
            { id: 0, compression: 2, payload: await deflate(samples) },
            { id: 1, compression: 3, payload: await deflate(deltaEncodePlane(samples, 3)) },
          ],
        },
      ],
    });
    const doc = await parsePsdFile(file);
    const red = Array.from(doc.textures[0]?.buffer ?? []).filter((_, index) => index % 4 === 0);
    const green = Array.from(doc.textures[0]?.buffer ?? []).filter((_, index) => index % 4 === 1);
    expect(red).toEqual([10, 20, 35, 40, 50, 70]);
    expect(green).toEqual([10, 20, 35, 40, 50, 70]);
  });

  it("prefers luni names and skips group markers", async () => {
    const names = new PsdWriter().unicodeString("").unicodeString("日本語").build();
    const divider = (type: number): Uint8Array => {
      const writer = new PsdWriter();
      writer.u32(type).ascii("8BIM").ascii("norm");
      return writer.build();
    };
    const file = await buildPsd({
      width: 1,
      height: 1,
      layers: [
        { top: 0, left: 0, bottom: 0, right: 0, name: "", planes: [] },
        {
          top: 0,
          left: 0,
          bottom: 1,
          right: 1,
          name: "x",
          planes: [{ id: 0, compression: 0, payload: new Uint8Array([9]) }],
        },
      ],
      // Real writers emit one section-divider block per layer, in order.
      taggedBlocks: [taggedBlock("luni", names), taggedBlock("lsct", divider(1)), taggedBlock("lsct", divider(0))],
    });
    const doc = await parsePsdFile(file);
    expect(doc.layers.map((layer) => layer.name)).toEqual(["日本語"]);
  });

  it("falls back to the composite image for flattened files", async () => {
    const file = await buildPsd({
      width: 2,
      height: 2,
      channels: 4,
      layers: [],
      composite: {
        compression: 0,
        planes: [
          solidPlane(2, 2, 200),
          solidPlane(2, 2, 100),
          solidPlane(2, 2, 50),
          new Uint8Array([255, 128, 255, 128]),
        ],
      },
    });
    const doc = await parsePsdFile(file);
    expect(doc.layers.map((layer) => layer.name)).toEqual(["Background"]);
    expect(Array.from(doc.textures[0]?.buffer ?? [])).toEqual([
      200, 100, 50, 255, 200, 100, 50, 128, 200, 100, 50, 255, 200, 100, 50, 128,
    ]);
  });

  it("skips mask channels without disturbing colors", async () => {
    const file = await buildPsd({
      width: 1,
      height: 1,
      layers: [
        {
          top: 0,
          left: 0,
          bottom: 1,
          right: 1,
          name: "M",
          planes: [
            { id: 0, compression: 0, payload: new Uint8Array([5]) },
            { id: 1, compression: 0, payload: new Uint8Array([6]) },
            { id: 2, compression: 0, payload: new Uint8Array([7]) },
            { id: -1, compression: 0, payload: new Uint8Array([8]) },
            { id: -2, compression: 0, payload: new Uint8Array([250]) },
          ],
        },
      ],
    });
    const doc = await parsePsdFile(file);
    expect(Array.from(doc.textures[0]?.buffer ?? [])).toEqual([5, 6, 7, 8]);
  });

  it("rejects bad signatures, versions, modes, depths and truncations", async () => {
    const good = await buildPsd({
      width: 1,
      height: 1,
      layers: [
        {
          top: 0,
          left: 0,
          bottom: 1,
          right: 1,
          planes: [{ id: 0, compression: 0, payload: new Uint8Array([1]) }],
        },
      ],
    });
    const mutate = (mutator: (bytes: Uint8Array) => void): Uint8Array => {
      const copy = good.slice();
      mutator(copy);
      return copy;
    };
    await expect(parsePsdFile(mutate((bytes) => bytes.set([0x58, 0x58, 0x58, 0x58], 0)))).rejects.toThrow(
      /bad signature/,
    );
    await expect(parsePsdFile(mutate((bytes) => bytes.set([0x38, 0x42, 0x50, 0x42], 0)))).rejects.toThrow(
      /large document/,
    );
    await expect(parsePsdFile(mutate((bytes) => bytes.set([0, 2], 4)))).rejects.toThrow(/version/);
    await expect(parsePsdFile(mutate((bytes) => bytes.set([0, 32], 22)))).rejects.toThrow(/32-bit/);
    await expect(parsePsdFile(mutate((bytes) => bytes.set([0, 4], 24)))).rejects.toThrow(/CMYK/);
    await expect(parsePsdFile(good.slice(0, 10))).rejects.toThrow(/byte \d+ of \d+/);
    await expect(parsePsdFile(good.slice(0, good.length - 1))).rejects.toThrow(GnumarusPsdError);
    const huge = await buildPsd({ width: 5000, height: 4, layers: [] });
    await expect(parsePsdFile(huge)).rejects.toThrow(/import limit/);
  });
});
