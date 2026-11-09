import { describe, expect, it } from "vitest";
import { GnumarusXcfError, parseXcfFile } from "../src/project/GnumarusXcf";

class XcfWriter {
  private bytes: number[] = [];

  get position(): number {
    return this.bytes.length;
  }

  u8(value: number): this {
    this.bytes.push(value & 0xff);
    return this;
  }

  u16(value: number): this {
    this.bytes.push((value >> 8) & 0xff, value & 0xff);
    return this;
  }

  u32(value: number): this {
    const out = new Uint8Array(4);
    new DataView(out.buffer).setUint32(0, value >>> 0, false);
    for (const byte of out) {
      this.bytes.push(byte);
    }
    return this;
  }

  i32(value: number): this {
    const out = new Uint8Array(4);
    new DataView(out.buffer).setInt32(0, value, false);
    for (const byte of out) {
      this.bytes.push(byte);
    }
    return this;
  }

  f32(value: number): this {
    const out = new Uint8Array(4);
    new DataView(out.buffer).setFloat32(0, value, false);
    for (const byte of out) {
      this.bytes.push(byte);
    }
    return this;
  }

  u64(value: number): this {
    this.u32(Math.floor(value / 4294967296));
    this.u32(value >>> 0);
    return this;
  }

  raw(data: number[] | Uint8Array): this {
    for (const byte of data) {
      this.bytes.push(byte & 0xff);
    }
    return this;
  }

  ascii(text: string): this {
    for (let index = 0; index < text.length; index += 1) {
      this.bytes.push(text.charCodeAt(index) & 0xff);
    }
    return this;
  }

  xcfString(text: string): this {
    const chars: number[] = [];
    for (let index = 0; index < text.length; index += 1) {
      chars.push(text.charCodeAt(index) & 0xff);
    }
    this.u32(chars.length + 1);
    this.raw(chars);
    this.u8(0);
    return this;
  }

  prop(type: number, payload: number[]): this {
    this.u32(type);
    this.u32(payload.length);
    this.raw(payload);
    return this;
  }

  propU32(type: number, value: number): this {
    const payload = new XcfWriter().u32(value).build();
    return this.prop(type, Array.from(payload));
  }

  reserveU32(): number {
    const at = this.bytes.length;
    this.bytes.push(0, 0, 0, 0);
    return at;
  }

  reserveU64(): number {
    const at = this.bytes.length;
    for (let index = 0; index < 8; index += 1) {
      this.bytes.push(0);
    }
    return at;
  }

  patchU32(at: number, value: number): void {
    const out = new Uint8Array(4);
    new DataView(out.buffer).setUint32(0, value >>> 0, false);
    for (let index = 0; index < 4; index += 1) {
      this.bytes[at + index] = out[index] as number;
    }
  }

  patchU64(at: number, value: number): void {
    this.patchU32(at, Math.floor(value / 4294967296));
    this.patchU32(at + 4, value >>> 0);
  }

  build(): Uint8Array {
    return new Uint8Array(this.bytes);
  }
}

/** Simple RLE encoder (literals capped at 120 bytes so only short tokens are emitted). */
function rleEncodePlane(data: number[]): number[] {
  const out: number[] = [];
  let i = 0;
  while (i < data.length) {
    let run = 1;
    while (i + run < data.length && data[i + run] === data[i] && run < 120) {
      run += 1;
    }
    if (run >= 3) {
      out.push(run - 1, data[i] as number);
      i += run;
      continue;
    }
    const literal: number[] = [];
    while (i + literal.length < data.length && literal.length < 120) {
      let ahead = 1;
      while (
        i + literal.length + ahead < data.length &&
        data[i + literal.length + ahead] === data[i + literal.length] &&
        ahead < 120
      ) {
        ahead += 1;
      }
      if (ahead >= 3) {
        break;
      }
      literal.push(data[i + literal.length] as number);
    }
    out.push(256 - literal.length, ...literal);
    i += literal.length;
  }
  return out;
}

interface TestLayerSpec {
  name: string;
  type: number;
  width: number;
  height: number;
  offsetX?: number;
  offsetY?: number;
  opacity?: number;
  floatOpacity?: number;
  visible?: boolean;
  lockAlpha?: boolean;
  group?: boolean;
  /** Per-component full-image planes (row-major). */
  channels?: number[][];
  raw?: boolean;
  /** Pre-encoded per-tile payloads (row-major), bypassing the RLE encoder. */
  rawTiles?: number[][];
  emptyLevel?: boolean;
}

interface TestFileSpec {
  version?: number;
  v0?: boolean;
  width?: number;
  height?: number;
  baseType?: number;
  precision?: number | null;
  compression?: number;
  colormap?: number[];
  layers?: TestLayerSpec[];
  extraImageProps?: Array<{ type: number; data: number[] }>;
}

function buildXcfBytes(spec: TestFileSpec): Uint8Array {
  const w = new XcfWriter();
  const version = spec.v0 === true ? 0 : (spec.version ?? 11);
  const off = (at: number, value: number): void => {
    if (version >= 11) {
      w.patchU64(at, value);
    } else {
      w.patchU32(at, value);
    }
  };
  const reserveOff = (): number => (version >= 11 ? w.reserveU64() : w.reserveU32());
  const width = spec.width ?? 64;
  const height = spec.height ?? 64;
  w.ascii("gimp xcf ");
  if (spec.v0 === true) {
    w.raw([0x66, 0x69, 0x6c, 0x65, 0x00]);
  } else {
    const digits = String(version).padStart(3, "0");
    w.ascii(`v${digits}`).u8(0);
  }
  w.i32(width).i32(height).i32(spec.baseType ?? 0);
  if (version >= 4 && spec.precision !== null) {
    w.i32(spec.precision ?? 150);
  }
  if (spec.colormap !== undefined) {
    const colors = spec.colormap;
    w.u32(1).u32(4 + colors.length).u32(colors.length / 3).raw(colors);
  }
  w.prop(17, [spec.compression ?? 1]);
  for (const extra of spec.extraImageProps ?? []) {
    w.prop(extra.type, extra.data);
  }
  w.u32(0).u32(0);
  const layerSlots: number[] = [];
  for (let i = 0; i < (spec.layers ?? []).length; i += 1) {
    layerSlots.push(reserveOff());
  }
  reserveOff();
  const layers = spec.layers ?? [];
  for (let li = 0; li < layers.length; li += 1) {
    const layer = layers[li] as TestLayerSpec;
    off(layerSlots[li] as number, w.position);
    w.i32(layer.width).i32(layer.height).i32(layer.type);
    w.xcfString(layer.name);
    if (layer.group === true) {
      w.prop(29, []);
    }
    w.propU32(6, layer.opacity ?? 255);
    if (layer.floatOpacity !== undefined) {
      w.prop(33, Array.from(new XcfWriter().f32(layer.floatOpacity).build()));
    }
    w.prop(15, Array.from(new XcfWriter().i32(layer.offsetX ?? 0).i32(layer.offsetY ?? 0).build()));
    w.propU32(8, layer.visible === false ? 0 : 1);
    if (layer.lockAlpha === true) {
      w.propU32(10, 1);
    }
    w.prop(7, [0, 0, 0, 28]);
    w.u32(0).u32(0);
    const hierSlot = reserveOff();
    reserveOff();
    if (version >= 20) {
      reserveOff();
    }
    if (layer.group === true) {
      // Real files still carry hierarchy/mask offsets on group layers; the
      // parser reads them and then flattens the group away.
      off(hierSlot, 0);
      continue;
    }
    off(hierSlot, w.position);
    const bpp = layer.type === 0 ? 3 : layer.type === 1 ? 4 : layer.type === 2 ? 1 : layer.type === 3 ? 2 : layer.type === 4 ? 1 : 2;
    w.i32(layer.width).i32(layer.height).i32(bpp);
    const levelSlot = reserveOff();
    off(levelSlot, w.position);
    w.i32(layer.width).i32(layer.height);
    const cols = Math.ceil(layer.width / 64);
    const rows = Math.ceil(layer.height / 64);
    if (layer.emptyLevel === true) {
      off(reserveOff(), 0);
    } else {
      const tileSlots: number[] = [];
      for (let i = 0; i < cols * rows; i += 1) {
        tileSlots.push(reserveOff());
      }
      off(reserveOff(), 0);
      let ti = 0;
      for (let ty = 0; ty < rows; ty += 1) {
        for (let tx = 0; tx < cols; tx += 1) {
          const tw = Math.min(64, layer.width - tx * 64);
          const th = Math.min(64, layer.height - ty * 64);
          let payload: number[];
          if (layer.rawTiles !== undefined) {
            payload = layer.rawTiles[ti] as number[];
          } else {
            const planes: number[][] = [];
            for (let c = 0; c < bpp; c += 1) {
              const plane: number[] = [];
              const channel = (layer.channels ?? [])[c] ?? [];
              for (let y = 0; y < th; y += 1) {
                for (let x = 0; x < tw; x += 1) {
                  plane.push(channel[(ty * 64 + y) * layer.width + tx * 64 + x] ?? 0);
                }
              }
              planes.push(plane);
            }
            if (layer.raw === true) {
              payload = [];
              for (let i = 0; i < tw * th; i += 1) {
                for (let c = 0; c < bpp; c += 1) {
                  payload.push((planes[c] as number[])[i] as number);
                }
              }
            } else {
              payload = [];
              for (const plane of planes) {
                payload.push(...rleEncodePlane(plane));
              }
            }
          }
          off(tileSlots[ti] as number, w.position);
          w.raw(payload);
          ti += 1;
        }
      }
    }
  }
  return w.build();
}

function pixelOf(buffer: Uint8ClampedArray, width: number, x: number, y: number): number[] {
  const i = (y * width + x) * 4;
  return [buffer[i] ?? -1, buffer[i + 1] ?? -1, buffer[i + 2] ?? -1, buffer[i + 3] ?? -1];
}

async function rejectsWith(bytes: Uint8Array, fragment: string): Promise<void> {
  await expect(parseXcfFile(bytes)).rejects.toThrowError(GnumarusXcfError);
  try {
    await parseXcfFile(bytes);
    expect.unreachable("expected GnumarusXcfError");
  } catch (error) {
    expect(error).toBeInstanceOf(GnumarusXcfError);
    expect((error as Error).message).toContain(fragment);
  }
}

describe("GnumarusXcfImport", () => {
  it("imports RGBA layers bottom-first with offsets, opacity and visibility", async () => {
    const gray = new Array(64 * 64).fill(128);
    const bytes = buildXcfBytes({
      width: 64,
      height: 64,
      // File order is top layer first; the engine stacks bottom layer first.
      layers: [
        {
          name: "Red",
          type: 0,
          width: 16,
          height: 16,
          offsetX: 8,
          offsetY: 8,
          opacity: 128,
          channels: [
            new Array(16 * 16).fill(255),
            new Array(16 * 16).fill(0),
            new Array(16 * 16).fill(0),
          ],
        },
        {
          name: "Bg",
          type: 2,
          width: 64,
          height: 64,
          channels: [gray],
        },
      ],
    });
    const doc = await parseXcfFile(bytes);
    expect(doc.width).toBe(64);
    expect(doc.height).toBe(64);
    expect(doc.layers.map((layer) => layer.name)).toEqual(["Bg", "Red"]);
    expect(doc.layers.map((layer) => layer.id)).toEqual(["layer0", "layer1"]);
    expect(doc.layers[1]?.opacity).toBeCloseTo(128 / 255, 5);
    expect(doc.layers[1]?.visible).toBe(true);
    expect(doc.contents[1]?.transform).toMatchObject({ x: 8 + 8 - 32, y: 8 + 8 - 32 });
    expect(doc.textures[1]?.width).toBe(16);
    expect(pixelOf(doc.textures[1]?.buffer as Uint8ClampedArray, 16, 0, 0)).toEqual([255, 0, 0, 255]);
    expect(pixelOf(doc.textures[1]?.buffer as Uint8ClampedArray, 16, 15, 15)).toEqual([255, 0, 0, 255]);
    expect(pixelOf(doc.textures[0]?.buffer as Uint8ClampedArray, 64, 0, 0)).toEqual([128, 128, 128, 255]);
    expect(pixelOf(doc.textures[0]?.buffer as Uint8ClampedArray, 64, 63, 63)).toEqual([128, 128, 128, 255]);
    expect(doc.textures[0]?.name).toBe("t1");
    expect(doc.contents[0]?.name).toBe("C1");
  });

  it("maps grayscale and indexed channels to RGB", async () => {
    const gray = await parseXcfFile(
      buildXcfBytes({
        width: 4,
        height: 4,
        baseType: 1,
        layers: [{ name: "G", type: 3, width: 4, height: 4, channels: [new Array(16).fill(200), new Array(16).fill(128)] }],
      }),
    );
    expect(pixelOf(gray.textures[0]?.buffer as Uint8ClampedArray, 4, 0, 0)).toEqual([200, 200, 200, 128]);
    const indexed = await parseXcfFile(
      buildXcfBytes({
        width: 4,
        height: 4,
        baseType: 2,
        colormap: [10, 20, 30, 40, 50, 60],
        layers: [
          {
            name: "I",
            type: 4,
            width: 4,
            height: 4,
            channels: [[0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1]],
          },
        ],
      }),
    );
    const tex = indexed.textures[0]?.buffer as Uint8ClampedArray;
    expect(pixelOf(tex, 4, 0, 0)).toEqual([10, 20, 30, 255]);
    expect(pixelOf(tex, 4, 1, 0)).toEqual([40, 50, 60, 255]);
    const indexedAlpha = await parseXcfFile(
      buildXcfBytes({
        width: 2,
        height: 2,
        baseType: 2,
        colormap: [1, 2, 3],
        layers: [
          {
            name: "IA",
            type: 5,
            width: 2,
            height: 2,
            channels: [
              [0, 0, 0, 0],
              [0, 255, 0, 255],
            ],
          },
        ],
      }),
    );
    const texA = indexedAlpha.textures[0]?.buffer as Uint8ClampedArray;
    expect(pixelOf(texA, 2, 0, 0)).toEqual([1, 2, 3, 0]);
    expect(pixelOf(texA, 2, 1, 0)).toEqual([1, 2, 3, 255]);
  });

  it("honors visibility, locks alpha and skips group layers", async () => {
    const solid = (v: number): number[] => new Array(4 * 4).fill(v);
    const bytes = buildXcfBytes({
      width: 4,
      height: 4,
      // File order is top layer first; groups flatten away on import.
      layers: [
        { name: "Paint", type: 2, width: 4, height: 4, lockAlpha: true, channels: [solid(20)] },
        { name: "Group", type: 0, width: 4, height: 4, group: true },
        { name: "Hidden", type: 2, width: 4, height: 4, visible: false, channels: [solid(10)] },
      ],
    });
    const doc = await parseXcfFile(bytes);
    expect(doc.layers.map((layer) => layer.name)).toEqual(["Hidden", "Paint"]);
    expect(doc.layers[0]?.visible).toBe(false);
    expect(doc.layers[1]?.lockedChannels).toEqual({ r: false, g: false, b: false, a: true });
    expect(doc.layers[0]?.lockedChannels).toEqual({ r: false, g: false, b: false, a: false });
    expect(pixelOf(doc.textures[1]?.buffer as Uint8ClampedArray, 4, 0, 0)).toEqual([20, 20, 20, 255]);
    expect(doc.contents[1]?.textureId).toBe("texture1");
    expect(doc.cells).toEqual([
      { layer: "layer0", frame: 0, content: "content0" },
      { layer: "layer1", frame: 0, content: "content1" },
    ]);
  });

  it("decodes hand-written RLE runs including extended lengths", async () => {
    const doc = await parseXcfFile(
      buildXcfBytes({
        width: 8,
        height: 40,
        // File order is top layer first; the engine stacks bottom layer first.
        layers: [
          // 136 literal samples via the 128 + u16 form (4x34 tile).
          {
            name: "LongLit",
            type: 2,
            width: 4,
            height: 34,
            rawTiles: [[128, 0, 136, ...Array.from({ length: 136 }, (_, i) => i % 256)]],
          },
          // 136 samples via the 127 + u16 repeat form (4x34 tile).
          { name: "Long", type: 2, width: 4, height: 34, rawTiles: [[127, 0, 130, 7, 5, 8]] },
          // 5 samples: 2x repeat of 9, then 3 literals.
          { name: "Short", type: 2, width: 5, height: 1, rawTiles: [[1, 9, 253, 1, 2, 3]] },
        ],
      }),
    );
    const short = doc.textures[0]?.buffer as Uint8ClampedArray;
    expect(doc.textures[0]?.width).toBe(5);
    expect(pixelOf(short, 5, 0, 0)).toEqual([9, 9, 9, 255]);
    expect(pixelOf(short, 5, 1, 0)).toEqual([9, 9, 9, 255]);
    expect(pixelOf(short, 5, 2, 0)).toEqual([1, 1, 1, 255]);
    expect(pixelOf(short, 5, 3, 0)).toEqual([2, 2, 2, 255]);
    expect(pixelOf(short, 5, 4, 0)).toEqual([3, 3, 3, 255]);
    const long = doc.textures[1]?.buffer as Uint8ClampedArray;
    expect([doc.textures[1]?.width, doc.textures[1]?.height]).toEqual([4, 34]);
    expect(long.length).toBe(4 * 34 * 4);
    expect(pixelOf(long, 4, 0, 0)).toEqual([7, 7, 7, 255]);
    expect(pixelOf(long, 4, 1, 32)).toEqual([7, 7, 7, 255]);
    expect(pixelOf(long, 4, 2, 32)).toEqual([8, 8, 8, 255]);
    expect(pixelOf(long, 4, 3, 33)).toEqual([8, 8, 8, 255]);
    const longLit = doc.textures[2]?.buffer as Uint8ClampedArray;
    expect(pixelOf(longLit, 4, 0, 0)).toEqual([0, 0, 0, 255]);
    expect(pixelOf(longLit, 4, 1, 0)).toEqual([1, 1, 1, 255]);
    expect(pixelOf(longLit, 4, 3, 33)).toEqual([135, 135, 135, 255]);
  });

  it("tiles images larger than 64 pixels and treats empty levels as transparent", async () => {
    const size = 70;
    const ramp: number[] = [];
    for (let i = 0; i < size * size; i += 1) {
      ramp.push(i % 256);
    }
    const doc = await parseXcfFile(
      buildXcfBytes({
        width: size,
        height: size,
        layers: [{ name: "Big", type: 2, width: size, height: size, channels: [ramp] }],
      }),
    );
    const tex = doc.textures[0]?.buffer as Uint8ClampedArray;
    expect([tex.length, doc.textures[0]?.width, doc.textures[0]?.height]).toEqual([size * size * 4, size, size]);
    expect(pixelOf(tex, size, 0, 0)).toEqual([0, 0, 0, 255]);
    expect(pixelOf(tex, size, 69, 69)).toEqual([35, 35, 35, 255]);
    expect(pixelOf(tex, size, 64, 0)).toEqual([64, 64, 64, 255]);
    const empty = await parseXcfFile(
      buildXcfBytes({
        width: 8,
        height: 8,
        layers: [{ name: "Empty", type: 3, width: 8, height: 8, emptyLevel: true }],
      }),
    );
    expect(Array.from((empty.textures[0]?.buffer as Uint8ClampedArray).subarray(0, 8))).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it("supports version 0 files, raw tiles and float opacity", async () => {
    const doc = await parseXcfFile(
      buildXcfBytes({
        v0: true,
        width: 2,
        height: 2,
        compression: 0,
        layers: [
          {
            name: "Raw",
            type: 1,
            width: 2,
            height: 2,
            opacity: 255,
            floatOpacity: 0.5,
            raw: true,
            channels: [
              [10, 20, 30, 40],
              [50, 60, 70, 80],
              [90, 100, 110, 120],
              [130, 140, 150, 160],
            ],
          },
        ],
      }),
    );
    expect(doc.width).toBe(2);
    expect(doc.layers[0]?.opacity).toBeCloseTo(0.5, 5);
    const tex = doc.textures[0]?.buffer as Uint8ClampedArray;
    expect(pixelOf(tex, 2, 0, 0)).toEqual([10, 50, 90, 130]);
    expect(pixelOf(tex, 2, 1, 0)).toEqual([20, 60, 100, 140]);
    expect(pixelOf(tex, 2, 0, 1)).toEqual([30, 70, 110, 150]);
    expect(pixelOf(tex, 2, 1, 1)).toEqual([40, 80, 120, 160]);
  });

  it("rejects corrupt and unsupported files with precise errors", async () => {
    const valid = ({ layers }: { layers?: TestLayerSpec[] }): Uint8Array =>
      buildXcfBytes({ width: 4, height: 4, layers: layers ?? [{ name: "A", type: 2, width: 4, height: 4, channels: [new Array(16).fill(1)] }] });
    await rejectsWith(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]), "not a GIMP XCF file");
    const badVersion = valid({});
    badVersion[10] = 0x39;
    badVersion[11] = 0x39;
    await rejectsWith(badVersion, "unsupported XCF version");
    await rejectsWith(buildXcfBytes({ precision: 200, layers: [{ name: "A", type: 2, width: 4, height: 4, channels: [new Array(16).fill(1)] }] }), "only 8-bit");
    await rejectsWith(
      buildXcfBytes({ compression: 2, layers: [{ name: "A", type: 2, width: 4, height: 4, channels: [new Array(16).fill(1)] }] }),
      "unsupported compression",
    );
    await rejectsWith(
      buildXcfBytes({ baseType: 2, layers: [{ name: "I", type: 4, width: 4, height: 4, channels: [new Array(16).fill(0)] }] }),
      "without a colormap",
    );
    await rejectsWith(buildXcfBytes({ width: 4, height: 4, layers: [] }), "no importable layers");
    await rejectsWith(buildXcfBytes({ width: 4, height: 4, layers: [{ name: "G", type: 0, width: 4, height: 4, group: true }] }), "no importable layers");
    const truncated = valid({}).subarray(0, 20);
    await rejectsWith(truncated, "truncated");
    const badRle = buildXcfBytes({
      width: 4,
      height: 1,
      layers: [{ name: "Bad", type: 2, width: 4, height: 1, rawTiles: [[0, 1, 2]] }],
    });
    await rejectsWith(badRle, "truncated RLE");
    const badIndex = buildXcfBytes({
      width: 2,
      height: 1,
      baseType: 2,
      colormap: [1, 2, 3],
      layers: [{ name: "I", type: 4, width: 2, height: 1, rawTiles: [[254, 5, 9]] }],
    });
    await rejectsWith(badIndex, "palette index");
    // Unknown image properties are skipped without failing the import.
    const tolerant = await parseXcfFile(
      buildXcfBytes({
        width: 2,
        height: 1,
        extraImageProps: [{ type: 999, data: [1, 2, 3, 4] }],
        layers: [{ name: "A", type: 2, width: 2, height: 1, channels: [[7, 8]] }],
      }),
    );
    expect(tolerant.layers.map((layer) => layer.name)).toEqual(["A"]);
    expect(pixelOf(tolerant.textures[0]?.buffer as Uint8ClampedArray, 2, 1, 0)).toEqual([8, 8, 8, 255]);
  });
});
