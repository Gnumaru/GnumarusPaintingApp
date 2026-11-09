import { describe, expect, it } from "vitest";
import { GnumarusAsepriteError, parseAsepriteFile } from "../src/project/GnumarusAseprite";

/** zlib-compress with the native stream API (no extra dependency). */
async function deflateData(data: Uint8Array): Promise<Uint8Array> {
  const output = await new Response(
    new Blob([data.slice()]).stream().pipeThrough(new CompressionStream("deflate")),
  ).arrayBuffer();
  return new Uint8Array(output);
}

/** Minimal in-test .ase writer (little-endian, format facts only). */
class AseWriter {
  readonly bytes: number[] = [];

  u8(value: number): this {
    this.bytes.push(value & 0xff);
    return this;
  }

  u16(value: number): this {
    this.bytes.push(value & 0xff, (value >>> 8) & 0xff);
    return this;
  }

  i16(value: number): this {
    return this.u16(value < 0 ? 0x10000 + value : value);
  }

  u32(value: number): this {
    this.bytes.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
    return this;
  }

  raw(values: ArrayLike<number>): this {
    for (let i = 0; i < values.length; i += 1) {
      this.bytes.push(values[i] ?? 0);
    }
    return this;
  }

  str(text: string): this {
    const encoded = new TextEncoder().encode(text);
    this.u16(encoded.length);
    return this.raw(encoded);
  }

  /** Wrap a payload writer as one complete chunk. */
  wrap(type: number, payload: AseWriter): this {
    this.u32(6 + payload.bytes.length);
    this.u16(type);
    return this.raw(payload.bytes);
  }

  build(): Uint8Array {
    return new Uint8Array(this.bytes);
  }
}

function layerChunk(name: string, options?: { flags?: number; type?: number; opacity?: number }): AseWriter {
  const payload = new AseWriter();
  payload.u16(options?.flags ?? 1);
  payload.u16(options?.type ?? 0);
  payload.u16(0);
  payload.u16(0);
  payload.u16(0);
  payload.u16(0);
  payload.u8(options?.opacity ?? 255);
  payload.u8(0).u8(0).u8(0);
  payload.str(name);
  if ((options?.type ?? 0) === 2) {
    payload.u32(0);
  }
  return new AseWriter().wrap(0x2004, payload);
}

async function imageCel(
  layer: number,
  x: number,
  y: number,
  width: number,
  height: number,
  pixels: Uint8Array,
  options?: { opacity?: number; raw?: boolean },
): Promise<AseWriter> {
  const payload = new AseWriter();
  payload.u16(layer);
  payload.i16(x);
  payload.i16(y);
  payload.u8(options?.opacity ?? 255);
  payload.u16(options?.raw === true ? 0 : 2);
  payload.i16(0);
  payload.u8(0).u8(0).u8(0).u8(0).u8(0);
  payload.u16(width);
  payload.u16(height);
  if (options?.raw === true) {
    payload.raw(pixels);
  } else {
    payload.raw(await deflateData(pixels));
  }
  return new AseWriter().wrap(0x2005, payload);
}

function linkedCel(layer: number, x: number, y: number, linkTo: number, opacity = 255): AseWriter {
  const payload = new AseWriter();
  payload.u16(layer);
  payload.i16(x);
  payload.i16(y);
  payload.u8(opacity);
  payload.u16(1);
  payload.i16(0);
  payload.u8(0).u8(0).u8(0).u8(0).u8(0);
  payload.u16(linkTo);
  return new AseWriter().wrap(0x2005, payload);
}

function frame(duration: number, chunks: AseWriter[]): AseWriter {
  const body = new AseWriter();
  for (const chunk of chunks) {
    body.raw(chunk.bytes);
  }
  const out = new AseWriter();
  out.u32(16 + body.bytes.length);
  out.u16(0xf1fa);
  out.u16(chunks.length);
  out.u16(duration);
  out.u8(0).u8(0);
  out.u32(chunks.length);
  out.raw(body.bytes);
  return out;
}

function sprite(options: {
  frames: AseWriter[];
  width?: number;
  height?: number;
  depth?: number;
  flags?: number;
  speed?: number;
  transparent?: number;
}): Uint8Array {
  const out = new AseWriter();
  const body = new AseWriter();
  for (const frame of options.frames) {
    body.raw(frame.bytes);
  }
  out.u32(128 + body.bytes.length);
  out.u16(0xa5e0);
  out.u16(options.frames.length);
  out.u16(options.width ?? 4);
  out.u16(options.height ?? 4);
  out.u16(options.depth ?? 32);
  out.u32(options.flags ?? 1);
  out.u16(options.speed ?? 100);
  out.u32(0);
  out.u32(0);
  out.u8(options.transparent ?? 0);
  out.u8(0).u8(0).u8(0);
  out.u16(0);
  out.u8(0).u8(0);
  out.i16(0).i16(0);
  out.u16(0).u16(0);
  out.raw(new Array<number>(84).fill(0));
  out.raw(body.bytes);
  return out.build();
}

function rgba(r: number, g: number, b: number, a: number): number[] {
  return [r, g, b, a];
}

function newPaletteChunk(from: number, entries: Array<[number, number, number, number]>): AseWriter {
  const payload = new AseWriter();
  payload.u32(entries.length);
  payload.u32(from);
  payload.u32(from + entries.length - 1);
  payload.raw(new Array<number>(8).fill(0));
  for (const [r, g, b, a] of entries) {
    payload.u16(0);
    payload.u8(r).u8(g).u8(b).u8(a);
  }
  return new AseWriter().wrap(0x2019, payload);
}

function patchU32(data: Uint8Array, offset: number, value: number): void {
  new DataView(data.buffer, data.byteOffset, data.byteLength).setUint32(offset, value, true);
}

function patchU16(data: Uint8Array, offset: number, value: number): void {
  new DataView(data.buffer, data.byteOffset, data.byteLength).setUint16(offset, value, true);
}

describe("GnumarusAseprite", () => {
  it("parses a minimal RGBA sprite with exact pixels", async () => {
    const pixels = new Uint8Array([
      ...rgba(255, 0, 0, 255),
      ...rgba(0, 255, 0, 255),
      ...rgba(0, 0, 255, 255),
      ...rgba(255, 255, 255, 255),
    ]);
    const data = sprite({
      frames: [frame(100, [layerChunk("Background", { flags: 1 | 8 }), await imageCel(0, 0, 0, 2, 2, pixels)])],
      width: 2,
      height: 2,
    });
    const doc = await parseAsepriteFile(data);
    expect(doc.width).toBe(2);
    expect(doc.height).toBe(2);
    expect(doc.frames).toBe(1);
    expect(doc.layers).toEqual([
      {
        id: "layer0",
        name: "Background",
        visible: true,
        opacity: 1,
        lockedChannels: { r: false, g: false, b: false, a: false },
      },
    ]);
    expect(doc.textures.length).toBe(1);
    expect(doc.textures[0]).toMatchObject({ id: "tex0", width: 2, height: 2 });
    expect(Array.from(doc.textures[0]?.buffer ?? [])).toEqual(Array.from(pixels));
    expect(doc.contents.length).toBe(1);
    expect(doc.contents[0]).toMatchObject({
      id: "content0",
      textureId: "tex0",
      transform: expect.objectContaining({ x: 0, y: 0 }),
    });
    expect(doc.cells).toEqual([{ layer: "layer0", frame: 0, content: "content0" }]);
    expect(doc.defaultFrameDuration).toBe(0.1);
    expect(doc.frameDurations).toEqual([]);
  });

  it("decodes raw (uncompressed) cels", async () => {
    const pixels = new Uint8Array(rgba(10, 20, 30, 255));
    const data = sprite({
      frames: [frame(100, [layerChunk("L"), await imageCel(0, 0, 0, 1, 1, pixels, { raw: true })])],
      width: 1,
      height: 1,
    });
    const doc = await parseAsepriteFile(data);
    expect(Array.from(doc.textures[0]?.buffer ?? [])).toEqual([10, 20, 30, 255]);
  });

  it("decodes grayscale cels to gray RGBA", async () => {
    const pixels = new Uint8Array([200, 128, 10, 255]);
    const data = sprite({
      depth: 16,
      frames: [frame(100, [layerChunk("L"), await imageCel(0, 0, 0, 2, 1, pixels)])],
      width: 2,
      height: 1,
    });
    const doc = await parseAsepriteFile(data);
    expect(Array.from(doc.textures[0]?.buffer ?? [])).toEqual([200, 200, 200, 128, 10, 10, 10, 255]);
  });

  it("decodes indexed cels with the new palette and transparent index", async () => {
    const palette = newPaletteChunk(0, [
      [0, 0, 0, 0],
      [255, 0, 0, 255],
    ]);
    const data = sprite({
      depth: 8,
      transparent: 0,
      frames: [
        frame(100, [
          palette,
          layerChunk("fg", { flags: 1 }),
          layerChunk("bg", { flags: 1 | 8 }),
          await imageCel(0, 0, 0, 2, 1, new Uint8Array([0, 1])),
          await imageCel(1, 0, 0, 1, 1, new Uint8Array([0])),
        ]),
      ],
      width: 2,
      height: 1,
    });
    const doc = await parseAsepriteFile(data);
    expect(Array.from(doc.textures[0]?.buffer ?? [])).toEqual([0, 0, 0, 0, 255, 0, 0, 255]);
    expect(Array.from(doc.textures[1]?.buffer ?? [])).toEqual([0, 0, 0, 0]);
  });

  it("rejects indexed pixels without any palette", async () => {
    const data = sprite({
      depth: 8,
      transparent: 5,
      frames: [frame(100, [layerChunk("L"), await imageCel(0, 0, 0, 1, 1, new Uint8Array([3]))])],
      width: 1,
      height: 1,
    });
    await expect(parseAsepriteFile(data)).rejects.toThrow(GnumarusAsepriteError);
  });

  it("rejects palette indexes the file never defines", async () => {
    const palette = newPaletteChunk(0, [[1, 2, 3, 255]]);
    const data = sprite({
      depth: 8,
      transparent: 5,
      frames: [frame(100, [palette, layerChunk("L"), await imageCel(0, 0, 0, 1, 1, new Uint8Array([7]))])],
      width: 1,
      height: 1,
    });
    await expect(parseAsepriteFile(data)).rejects.toThrow(/palette index 7/);
  });

  it("reads the old palette chunk when no new palette exists", async () => {
    const payload = new AseWriter();
    payload.u16(1);
    payload.u8(0).u8(1);
    payload.u8(0).u8(255).u8(0);
    const data = sprite({
      depth: 8,
      transparent: 5,
      frames: [
        frame(100, [
          layerChunk("L"),
          new AseWriter().wrap(0x0004, payload),
          await imageCel(0, 0, 0, 1, 1, new Uint8Array([0])),
        ]),
      ],
      width: 1,
      height: 1,
    });
    const doc = await parseAsepriteFile(data);
    expect(Array.from(doc.textures[0]?.buffer ?? [])).toEqual([0, 255, 0, 255]);
  });

  it("flattens groups away while keeping layer indexes", async () => {
    const pixels = new Uint8Array(rgba(9, 9, 9, 255));
    const data = sprite({
      frames: [
        frame(100, [
          layerChunk("set", { type: 1 }),
          layerChunk("inner"),
          layerChunk("top"),
          await imageCel(1, 0, 0, 1, 1, pixels),
          await imageCel(2, 0, 0, 1, 1, pixels),
        ]),
      ],
      width: 1,
      height: 1,
    });
    const doc = await parseAsepriteFile(data);
    expect(doc.layers.map((layer) => layer.name)).toEqual(["inner", "top"]);
    expect(doc.cells).toEqual([
      { layer: "layer0", frame: 0, content: "content0" },
      { layer: "layer1", frame: 0, content: "content1" },
    ]);
  });

  it("skips tilemap layers and tilemap cels", async () => {
    const pixels = new Uint8Array(rgba(9, 9, 9, 255));
    const tilePayload = new AseWriter();
    tilePayload.u16(0).i16(0).i16(0).u8(255).u16(3).i16(0);
    tilePayload.u8(0).u8(0).u8(0).u8(0).u8(0);
    tilePayload.u16(2).u16(2).u16(32);
    tilePayload.u32(0x1fffffff).u32(0x20000000).u32(0x40000000).u32(0x80000000);
    tilePayload.raw(new Array<number>(10).fill(0));
    tilePayload.raw(
      await deflateData(new Uint8Array([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])),
    );
    const data = sprite({
      frames: [
        frame(100, [
          layerChunk("tiles", { type: 2 }),
          layerChunk("paint"),
          new AseWriter().wrap(0x2005, tilePayload),
          await imageCel(1, 0, 0, 1, 1, pixels),
        ]),
      ],
      width: 1,
      height: 1,
    });
    const doc = await parseAsepriteFile(data);
    expect(doc.layers.map((layer) => layer.name)).toEqual(["paint"]);
    expect(doc.cells).toEqual([{ layer: "layer0", frame: 0, content: "content0" }]);
  });

  it("links cels through shared cell contents", async () => {
    const pixels = new Uint8Array(rgba(5, 6, 7, 255));
    const data = sprite({
      frames: [
        frame(100, [layerChunk("L"), await imageCel(0, 0, 0, 1, 1, pixels)]),
        frame(200, [linkedCel(0, 0, 0, 0)]),
      ],
      width: 1,
      height: 1,
    });
    const doc = await parseAsepriteFile(data);
    expect(doc.frames).toBe(2);
    expect(doc.defaultFrameDuration).toBe(0.1);
    expect(doc.frameDurations).toEqual([{ frame: 1, duration: 0.2 }]);
    expect(doc.textures.length).toBe(1);
    expect(doc.contents.length).toBe(1);
    expect(doc.cells).toEqual([
      { layer: "layer0", frame: 0, content: "content0" },
      { layer: "layer0", frame: 1, content: "content0" },
    ]);
  });

  it("creates separate contents for links with their own geometry", async () => {
    const pixels = new Uint8Array(rgba(5, 6, 7, 255));
    const data = sprite({
      frames: [
        frame(100, [layerChunk("L"), await imageCel(0, 1, 1, 1, 1, pixels)]),
        frame(100, [linkedCel(0, 2, 2, 0)]),
      ],
      width: 4,
      height: 4,
    });
    const doc = await parseAsepriteFile(data);
    expect(doc.textures.length).toBe(2);
    expect(doc.cells).toEqual([
      { layer: "layer0", frame: 0, content: "content0" },
      { layer: "layer0", frame: 1, content: "content1" },
    ]);
    expect(doc.contents[1]?.transform.x).toBe(2 + 0.5 - 2);
    expect(doc.contents[1]?.transform.y).toBe(2 + 0.5 - 2);
  });

  it("rejects linked cel cycles and out-of-range links", async () => {
    const cyclic = sprite({
      frames: [frame(100, [layerChunk("L"), linkedCel(0, 0, 0, 0)]), frame(100, [])],
      width: 1,
      height: 1,
    });
    await expect(parseAsepriteFile(cyclic)).rejects.toThrow(/cycle/);
    const outOfRange = sprite({
      frames: [frame(100, [layerChunk("L"), linkedCel(0, 0, 0, 9)])],
      width: 1,
      height: 1,
    });
    await expect(parseAsepriteFile(outOfRange)).rejects.toThrow(GnumarusAsepriteError);
  });

  it("maps hidden layers, opacity and cel geometry", async () => {
    const pixels = new Uint8Array([
      ...rgba(255, 255, 255, 200),
      ...rgba(255, 255, 255, 200),
      ...rgba(255, 255, 255, 200),
      ...rgba(255, 255, 255, 200),
    ]);
    const data = sprite({
      flags: 1,
      frames: [
        frame(100, [layerChunk("ghost", { flags: 0, opacity: 128 }), await imageCel(0, 3, 4, 2, 2, pixels, { opacity: 128 })]),
      ],
      width: 16,
      height: 16,
    });
    const doc = await parseAsepriteFile(data);
    expect(doc.layers[0]?.visible).toBe(false);
    expect(doc.layers[0]?.opacity).toBeCloseTo(128 / 255, 6);
    expect(doc.contents[0]?.transform.x).toBe(-4);
    expect(doc.contents[0]?.transform.y).toBe(-3);
    expect(doc.textures[0]?.buffer[3]).toBe(100);
  });

  it("ignores opacity bytes without the header opacity flag", async () => {
    const pixels = new Uint8Array(rgba(1, 2, 3, 255));
    const data = sprite({
      flags: 0,
      frames: [frame(100, [layerChunk("L", { opacity: 0 }), await imageCel(0, 0, 0, 1, 1, pixels)])],
      width: 1,
      height: 1,
    });
    const doc = await parseAsepriteFile(data);
    expect(doc.layers[0]?.opacity).toBe(1);
  });

  it("keeps the last cel when a cell holds several", async () => {
    const first = new Uint8Array(rgba(1, 1, 1, 255));
    const second = new Uint8Array(rgba(2, 2, 2, 255));
    const data = sprite({
      frames: [frame(100, [layerChunk("L"), await imageCel(0, 0, 0, 1, 1, first), await imageCel(0, 0, 0, 1, 1, second)])],
      width: 1,
      height: 1,
    });
    const doc = await parseAsepriteFile(data);
    expect(doc.cells).toEqual([{ layer: "layer0", frame: 0, content: "content0" }]);
    expect(doc.textures.length).toBe(1);
    expect(Array.from(doc.textures[0]?.buffer ?? [])).toEqual([2, 2, 2, 255]);
  });

  it("skips unknown chunks without losing sync", async () => {
    const pixels = new Uint8Array(rgba(7, 8, 9, 255));
    const mystery = new AseWriter();
    mystery.u16(0);
    mystery.raw(new Array<number>(8).fill(0));
    const data = sprite({
      frames: [
        frame(100, [layerChunk("L"), new AseWriter().wrap(0x9999, mystery), await imageCel(0, 0, 0, 1, 1, pixels)]),
      ],
      width: 1,
      height: 1,
    });
    const doc = await parseAsepriteFile(data);
    expect(doc.cells.length).toBe(1);
  });

  it("imports frame tags as named animations", async () => {
    const pixels = new Uint8Array(rgba(7, 8, 9, 255));
    const tags = new AseWriter();
    tags.u16(4);
    tags.raw(new Array<number>(8).fill(0));
    const tag = (name: string, from: number, to: number, loop: number, repeat: number): void => {
      tags.u16(from).u16(to).u8(loop).u16(repeat);
      tags.raw(new Array<number>(6).fill(0));
      tags.u8(255).u8(0).u8(0);
      tags.u8(0);
      tags.str(name);
    };
    tag("walk", 0, 2, 0, 0);
    tag("back", 1, 3, 1, 0);
    tag("boing", 0, 2, 2, 0);
    tag("gnob", 0, 2, 3, 0);
    const data = sprite({
      frames: [
        frame(
          100,
          [
            layerChunk("L"),
            new AseWriter().wrap(0x2018, tags),
            await imageCel(0, 0, 0, 1, 1, pixels),
          ],
        ),
        frame(100, []),
        frame(100, []),
        frame(100, []),
      ],
      width: 1,
      height: 1,
    });
    const doc = await parseAsepriteFile(data);
    expect(doc.namedAnimations).toEqual([
      {
        name: "walk",
        loop: "forward",
        frames: [
          { frame: 0, duration: null },
          { frame: 1, duration: null },
          { frame: 2, duration: null },
        ],
      },
      {
        name: "back",
        loop: "forward",
        frames: [
          { frame: 3, duration: null },
          { frame: 2, duration: null },
          { frame: 1, duration: null },
        ],
      },
      {
        name: "boing",
        loop: "ping-pong",
        frames: [
          { frame: 0, duration: null },
          { frame: 1, duration: null },
          { frame: 2, duration: null },
        ],
      },
      {
        name: "gnob",
        loop: "ping-pong",
        frames: [
          { frame: 2, duration: null },
          { frame: 1, duration: null },
          { frame: 0, duration: null },
        ],
      },
    ]);
  });

  it("plays repeat-one tags once and renames empty or duplicated tags", async () => {
    const pixels = new Uint8Array(rgba(7, 8, 9, 255));
    const tags = new AseWriter();
    tags.u16(3);
    tags.raw(new Array<number>(8).fill(0));
    const tag = (name: string, from: number, to: number, loop: number, repeat: number): void => {
      tags.u16(from).u16(to).u8(loop).u16(repeat);
      tags.raw(new Array<number>(6).fill(0));
      tags.u8(0).u8(0).u8(0);
      tags.u8(0);
      tags.str(name);
    };
    tag("once", 0, 1, 0, 1);
    tag("", 0, 0, 0, 0);
    tag("once", 1, 1, 2, 0);
    const data = sprite({
      frames: [
        frame(100, [layerChunk("L"), new AseWriter().wrap(0x2018, tags), await imageCel(0, 0, 0, 1, 1, pixels)]),
        frame(100, []),
      ],
      width: 1,
      height: 1,
    });
    const doc = await parseAsepriteFile(data);
    expect(doc.namedAnimations).toEqual([
      {
        name: "once",
        loop: "none",
        frames: [
          { frame: 0, duration: null },
          { frame: 1, duration: null },
        ],
      },
      { name: "Tag 2", loop: "forward", frames: [{ frame: 0, duration: null }] },
      { name: "once (2)", loop: "ping-pong", frames: [{ frame: 1, duration: null }] },
    ]);
  });

  it("rejects tags with bad ranges, loops or frames", async () => {
    const pixels = new Uint8Array(rgba(7, 8, 9, 255));
    const tagged = async (tag: AseWriter): Promise<Uint8Array> =>
      sprite({
        frames: [frame(100, [layerChunk("L"), new AseWriter().wrap(0x2018, tag), await imageCel(0, 0, 0, 1, 1, pixels)])],
        width: 1,
        height: 1,
      });
    const makeTag = (from: number, to: number, loop: number): AseWriter => {
      const tags = new AseWriter();
      tags.u16(1);
      tags.raw(new Array<number>(8).fill(0));
      tags.u16(from).u16(to).u8(loop).u16(0);
      tags.raw(new Array<number>(6).fill(0));
      tags.u8(0).u8(0).u8(0);
      tags.u8(0);
      tags.str("bad");
      return tags;
    };
    await expect(parseAsepriteFile(await tagged(makeTag(1, 0, 0)))).rejects.toThrow(/starts after its end/);
    await expect(parseAsepriteFile(await tagged(makeTag(0, 5, 0)))).rejects.toThrow(/out-of-range frame/);
    await expect(parseAsepriteFile(await tagged(makeTag(0, 0, 9)))).rejects.toThrow(/unknown loop direction/);
  });

  it("rejects files that are not Aseprite files or are corrupt", async () => {
    const good = sprite({
      frames: [frame(100, [layerChunk("L"), await imageCel(0, 0, 0, 1, 1, new Uint8Array([1, 2, 3, 4]))])],
      width: 1,
      height: 1,
    });
    const badMagic = good.slice();
    badMagic[4] = 0x00;
    const truncated = good.slice(0, good.length - 5);
    const badFrameMagic = good.slice();
    badFrameMagic[128 + 4] = 0x00;
    const badSize = good.slice();
    patchU32(badSize, 0, badSize.length + 10);
    const overrun = good.slice();
    patchU32(overrun, 128 + 16, 0xffff);
    const celPayload = new AseWriter();
    celPayload.u16(0).i16(0).i16(0).u8(255).u16(9).i16(0);
    celPayload.u8(0).u8(0).u8(0).u8(0).u8(0);
    const unknownCel = sprite({
      frames: [frame(100, [layerChunk("L"), new AseWriter().wrap(0x2005, celPayload)])],
      width: 1,
      height: 1,
    });
    const cases: Array<[string, Uint8Array]> = [
      ["bad magic", badMagic],
      ["truncated", truncated],
      ["bad frame magic", badFrameMagic],
      ["size mismatch", badSize],
      ["chunk overrun", overrun],
      ["unknown cel type", unknownCel],
    ];
    for (const [label, bytes] of cases) {
      await expect(parseAsepriteFile(bytes), label).rejects.toThrow(GnumarusAsepriteError);
    }
  });

  it("rejects bad headers and bad cels", async () => {
    const zeroFrames = sprite({
      frames: [frame(100, [layerChunk("L")])],
      width: 1,
      height: 1,
    });
    patchU16(zeroFrames, 6, 0);
    const badDepth = sprite({
      depth: 24,
      frames: [frame(100, [layerChunk("L")])],
      width: 1,
      height: 1,
    });
    const badLayer = sprite({
      frames: [frame(100, [layerChunk("L"), await imageCel(5, 0, 0, 1, 1, new Uint8Array([1]))])],
      width: 1,
      height: 1,
    });
    const badLayerType = sprite({
      frames: [frame(100, [layerChunk("L", { type: 7 }), await imageCel(0, 0, 0, 1, 1, new Uint8Array([1]))])],
      width: 1,
      height: 1,
    });
    const cases: Array<[string, Uint8Array]> = [
      ["zero frames", zeroFrames],
      ["bad depth", badDepth],
      ["cel on unknown layer", badLayer],
      ["unknown layer type", badLayerType],
    ];
    for (const [label, bytes] of cases) {
      await expect(parseAsepriteFile(bytes), label).rejects.toThrow(GnumarusAsepriteError);
    }
  });

  it("rejects garbage zlib payloads", async () => {
    const head = sprite({
      frames: [frame(100, [layerChunk("L"), await imageCel(0, 0, 0, 1, 1, new Uint8Array([1, 2, 3, 4]))])],
      width: 1,
      height: 1,
    });
    const broken = head.slice();
    broken[broken.length - 1] ^= 0xff;
    broken[broken.length - 2] ^= 0xff;
    await expect(parseAsepriteFile(broken)).rejects.toThrow(GnumarusAsepriteError);
  });
});

