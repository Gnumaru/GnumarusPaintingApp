import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { GnumarusKraError, parseKraFile } from "../src/project/GnumarusKra";

/** Trivial LZF encoder: literal runs only (control byte < 32). */
function lzfEncodePlane(data: number[]): number[] {
  const out: number[] = [];
  let i = 0;
  while (i < data.length) {
    const n = Math.min(32, data.length - i);
    out.push(n - 1, ...data.slice(i, i + n));
    i += n;
  }
  return out;
}

/** Interleaved pixels -> planar (channel-split) layout. */
function planarize(interleaved: number[], bpp: number): number[] {
  const count = interleaved.length / bpp;
  const out: number[] = [];
  for (let c = 0; c < bpp; c += 1) {
    for (let i = 0; i < count; i += 1) {
      out.push(interleaved[i * bpp + c] as number);
    }
  }
  return out;
}

interface TestTile {
  x: number;
  y: number;
  /** Interleaved row-major pixels (64x64 or smaller edge tiles not needed here). */
  pixels: number[];
  raw?: boolean;
  /** Override the compression flag byte (default 0 for raw, 1 for LZF). */
  flag?: number;
}

function tileStore(tiles: TestTile[], bpp: number): Uint8Array {
  const out: number[] = [];
  const pushAscii = (text: string): void => {
    for (let i = 0; i < text.length; i += 1) {
      out.push(text.charCodeAt(i) & 0xff);
    }
  };
  pushAscii(`VERSION 2\nTILEWIDTH 64\nTILEHEIGHT 64\nPIXELSIZE ${bpp}\nDATA ${tiles.length}\n`);
  for (const tile of tiles) {
    let payload: number[];
    if (tile.raw === true) {
      payload = [tile.flag ?? 0, ...tile.pixels];
    } else {
      payload = [tile.flag ?? 1, ...lzfEncodePlane(planarize(tile.pixels, bpp))];
    }
    pushAscii(`${tile.x},${tile.y},LZF,${payload.length}\n`);
    out.push(...payload);
  }
  return new Uint8Array(out);
}

function solidTile(value: number[], count = 64 * 64): number[] {
  const out: number[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push(...value);
  }
  return out;
}

interface TestLayerSpec {
  name: string;
  type?: string;
  opacity?: number;
  visible?: boolean;
  x?: number;
  y?: number;
  filename: string;
  colorspacename?: string;
  locks?: string;
  keyframes?: string;
  tiles?: TestTile[];
  rawTiles?: boolean;
  bpp?: number;
  defaultpixel?: number[];
}

interface TestKeyframeSpec {
  time: number;
  frame: string;
  x?: number;
  y?: number;
}

interface TestFileSpec {
  imageName?: string;
  width?: number;
  height?: number;
  colorspacename?: string;
  framerate?: number;
  range?: [number, number];
  layers?: TestLayerSpec[];
  keyframes?: Record<string, TestKeyframeSpec[]>;
  /** Extra raw ZIP entries (path -> bytes), e.g. keyframed `.fN` pixel files. */
  extraFiles?: Record<string, Uint8Array>;
}

function layerXml(layer: TestLayerSpec): string {
  const attrs = [
    `opacity="${layer.opacity ?? 255}"`,
    `x="${layer.x ?? 0}"`,
    `y="${layer.y ?? 0}"`,
    `colorspacename="${layer.colorspacename ?? "RGBA"}"`,
    `visible="${layer.visible === false ? "0" : "1"}"`,
    `nodetype="${layer.type ?? "paintlayer"}"`,
    `name="${layer.name}"`,
    `filename="${layer.filename}"`,
    `channelflags=""`,
  ];
  if (layer.locks !== undefined) {
    attrs.push(`channellockflags="${layer.locks}"`);
  }
  if (layer.keyframes !== undefined) {
    attrs.push(`keyframes="${layer.keyframes}"`);
  }
  return `<layer ${attrs.join(" ")}/>`;
}

function buildKraBytes(spec: TestFileSpec): Uint8Array {
  const imageName = spec.imageName ?? "test";
  const width = spec.width ?? 64;
  const height = spec.height ?? 64;
  let animation = "";
  if (spec.range !== undefined) {
    animation = `<animation><framerate type="value" value="${spec.framerate ?? 24}"/><range from="${spec.range[0]}" type="timerange" to="${spec.range[1]}"/><currentTime type="value" value="0"/></animation>`;
  }
  const layers = (spec.layers ?? []).map((layer) => layerXml(layer)).join("");
  const maindoc =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<DOC xmlns="http://www.calligra.org/DTD/krita" syntaxVersion="2" editor="Krita">` +
    `<IMAGE width="${width}" profile="sRGB" y-res="100" mime="application/x-kra" height="${height}" ` +
    `colorspacename="${spec.colorspacename ?? "RGBA"}" name="${imageName}" x-res="100">` +
    `<layers>${layers}</layers>${animation}</IMAGE></DOC>`;
  const files: Record<string, Uint8Array> = {
    mimetype: strToU8("application/x-krita"),
    "maindoc.xml": strToU8(maindoc),
  };
  for (const layer of spec.layers ?? []) {
    if ((layer.type ?? "paintlayer") !== "paintlayer") {
      continue;
    }
    const bpp = layer.bpp ?? 4;
    files[`${imageName}/layers/${layer.filename}`] = tileStore(layer.tiles ?? [], bpp);
    if (layer.defaultpixel !== undefined) {
      files[`${imageName}/layers/${layer.filename}.defaultpixel`] = new Uint8Array(layer.defaultpixel);
    }
  }
  for (const [name, keys] of Object.entries(spec.keyframes ?? {})) {
    const items = keys
      .map((key) => `<keyframe frame="${key.frame}" time="${key.time}"><offset x="${key.x ?? 0}" y="${key.y ?? 0}" type="point"/></keyframe>`)
      .join("");
    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<keyframes xmlns="http://www.calligra.org/DTD/krita-keyframes"><channel name="content">${items}</channel></keyframes>`;
    files[`${imageName}/layers/${name}`] = strToU8(xml);
  }
  for (const [name, data] of Object.entries(spec.extraFiles ?? {})) {
    files[name] = data;
  }
  return zipSync(files);
}

function pixelOf(buffer: Uint8ClampedArray, width: number, x: number, y: number): number[] {
  const i = (y * width + x) * 4;
  return [buffer[i] ?? -1, buffer[i + 1] ?? -1, buffer[i + 2] ?? -1, buffer[i + 3] ?? -1];
}

async function rejectsWith(bytes: Uint8Array, fragment: string): Promise<void> {
  await expect(parseKraFile(bytes)).rejects.toThrowError(GnumarusKraError);
  try {
    await parseKraFile(bytes);
    expect.unreachable("expected GnumarusKraError");
  } catch (error) {
    expect(error).toBeInstanceOf(GnumarusKraError);
    expect((error as Error).message).toContain(fragment);
  }
}

describe("GnumarusKraImport", () => {
  it("imports RGBA layers bottom-first with offsets, opacity and visibility", async () => {
    // File channel order is B,G,R,A; the paint is opaque red.
    const red = solidTile([0, 0, 255, 255]);
    const blue = solidTile([255, 0, 0, 255]);
    const bytes = buildKraBytes({
      width: 128,
      height: 128,
      layers: [
        { name: "Top", opacity: 128, x: 64, y: 64, filename: "layer1", tiles: [{ x: 0, y: 0, pixels: red }] },
        { name: "Bottom", filename: "layer2", tiles: [{ x: 0, y: 0, pixels: blue }] },
      ],
    });
    const doc = await parseKraFile(bytes);
    expect(doc.width).toBe(128);
    expect(doc.height).toBe(128);
    expect(doc.frames).toBe(1);
    expect(doc.layers.map((layer) => layer.name)).toEqual(["Bottom", "Top"]);
    expect(doc.layers.map((layer) => layer.id)).toEqual(["layer0", "layer1"]);
    expect(doc.layers[1]?.opacity).toBeCloseTo(128 / 255, 5);
    expect(doc.contents[1]?.transform).toMatchObject({ x: 64 + 32 - 64, y: 64 + 32 - 64 });
    expect(pixelOf(doc.textures[1]?.buffer as Uint8ClampedArray, 64, 0, 0)).toEqual([255, 0, 0, 255]);
    expect(pixelOf(doc.textures[0]?.buffer as Uint8ClampedArray, 64, 63, 63)).toEqual([0, 0, 255, 255]);
    expect(doc.cells).toEqual([
      { layer: "layer0", frame: 0, content: "content0" },
      { layer: "layer1", frame: 0, content: "content1" },
    ]);
  });

  it("maps gray layers, raw tiles, default pixels and channel locks", async () => {
    const gray = solidTile([200, 128], 64 * 64);
    const bytes = buildKraBytes({
      width: 64,
      height: 64,
      layers: [
        {
          name: "Gray",
          colorspacename: "GRAYA",
          bpp: 2,
          locks: "01",
          filename: "g1",
          tiles: [{ x: 0, y: 0, pixels: gray, raw: true }],
          defaultpixel: [9, 9],
        },
        { name: "Hidden", visible: false, filename: "h1", locks: "0000", tiles: [{ x: 64, y: 0, pixels: solidTile([1, 2, 3, 4]) }] },
        { name: "Empty", filename: "e1", tiles: [] },
      ],
    });
    const doc = await parseKraFile(bytes);
    expect(doc.layers.map((layer) => layer.name)).toEqual(["Hidden", "Gray"]);
    expect(doc.layers[1]?.lockedChannels).toEqual({ r: true, g: true, b: true, a: false });
    expect(doc.layers[0]?.visible).toBe(false);
    expect(doc.layers[0]?.lockedChannels).toEqual({ r: true, g: true, b: true, a: true });
    expect(pixelOf(doc.textures[1]?.buffer as Uint8ClampedArray, 64, 0, 0)).toEqual([200, 200, 200, 128]);
    // Empty layer (no tiles, transparent default) is skipped.
    expect(doc.layers).toHaveLength(2);
  });

  it("skips group containers but imports nested paint layers", async () => {
    const maindoc =
      `<?xml version="1.0" encoding="UTF-8"?>\n<DOC><IMAGE width="8" height="8" colorspacename="RGBA" name="g" profile="p" mime="m">` +
      `<layers><layer opacity="255" x="0" y="0" colorspacename="RGBA" visible="1" nodetype="grouplayer" name="Group" filename="grp" channelflags="">` +
      `<layers>${layerXml({ name: "Inner", filename: "inner", tiles: [{ x: 0, y: 0, pixels: solidTile([0, 0, 9, 9]) }] })}</layers>` +
      `</layer>${layerXml({ name: "Outer", filename: "outer", tiles: [{ x: 0, y: 0, pixels: solidTile([7, 7, 7, 7]) }] })}</layers>` +
      `</IMAGE></DOC>`;
    const files: Record<string, Uint8Array> = {
      mimetype: strToU8("application/x-krita"),
      "maindoc.xml": strToU8(maindoc),
      "g/layers/inner": tileStore([{ x: 0, y: 0, pixels: solidTile([0, 0, 9, 9]) }], 4),
      "g/layers/outer": tileStore([{ x: 0, y: 0, pixels: solidTile([7, 7, 7, 7]) }], 4),
    };
    const doc = await parseKraFile(zipSync(files));
    expect(doc.layers.map((layer) => layer.name)).toEqual(["Outer", "Inner"]);
  });

  it("imports keyframed animation with hold semantics and per-frame offsets", async () => {
    const red = solidTile([0, 0, 255, 255]);
    const green = solidTile([0, 255, 0, 255]);
    const doc = await parseKraFile(
      buildKraBytes({
        width: 128,
        height: 128,
        framerate: 10,
        range: [2, 6],
        layers: [
          {
            name: "Mover",
            filename: "anim",
            keyframes: "anim.keyframes.xml",
            // Base file holds the first keyframe; .f1 files are extras.
            tiles: [{ x: 0, y: 0, pixels: red }],
          },
        ],
        keyframes: {
          "anim.keyframes.xml": [
            { time: 2, frame: "anim", x: 0, y: 0 },
            { time: 4, frame: "anim.f1", x: 64, y: 0 },
          ],
        },
        extraFiles: { "test/layers/anim.f1": tileStore([{ x: 0, y: 0, pixels: green }], 4) },
      }),
    );
    expect(doc.frames).toBe(5);
    expect(doc.defaultFrameDuration).toBeCloseTo(0.1, 5);
    expect(doc.cells).toHaveLength(5);
    // Frames 0-1 hold the first keyframe, frames 2-4 hold the second.
    const contentAt = (frame: number): string => doc.cells.find((cell) => cell.frame === frame)?.content ?? "";
    expect(contentAt(0)).toBe(contentAt(1));
    expect(contentAt(2)).toBe(contentAt(3));
    expect(contentAt(2)).toBe(contentAt(4));
    expect(contentAt(0)).not.toBe(contentAt(2));
    const first = doc.contents.find((c) => c.id === contentAt(0));
    const second = doc.contents.find((c) => c.id === contentAt(2));
    expect(first?.transform).toMatchObject({ x: 0 + 32 - 64, y: 0 + 32 - 64 });
    expect(second?.transform).toMatchObject({ x: 64 + 32 - 64, y: 0 + 32 - 64 });
    const firstTex = doc.textures.find((t) => t.id === first?.textureId);
    const secondTex = doc.textures.find((t) => t.id === second?.textureId);
    expect(pixelOf(firstTex?.buffer as Uint8ClampedArray, 64, 0, 0)).toEqual([255, 0, 0, 255]);
    expect(pixelOf(secondTex?.buffer as Uint8ClampedArray, 64, 0, 0)).toEqual([0, 255, 0, 255]);
  });

  it("rejects corrupt and unsupported files with precise errors", async () => {
    await rejectsWith(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]), "not a Krita");
    await rejectsWith(zipSync({ "other.txt": strToU8("hi") }), "missing maindoc.xml");
    await rejectsWith(zipSync({ "maindoc.xml": strToU8("<DOC><oops>") }), "invalid maindoc");
    const noLayers = buildKraBytes({ layers: [{ name: "Shape", type: "shapelayer", filename: "s1" }] });
    await rejectsWith(noLayers, "no importable layers");
    const badCodec = buildKraBytes({
      layers: [{ name: "A", filename: "a1", tiles: [{ x: 0, y: 0, pixels: solidTile([1, 2, 3, 4]), flag: 7 }] }],
    });
    await rejectsWith(badCodec, "compression flag");
    const badDepth = buildKraBytes({
      layers: [{ name: "C", colorspacename: "CMYKA", filename: "c1", tiles: [] }],
    });
    await rejectsWith(badDepth, "unsupported layer colorspace");
    const badRange = buildKraBytes({ range: [5, 2], layers: [{ name: "A", filename: "a1", tiles: [] }] });
    await rejectsWith(badRange, "invalid animation range");
  });
});
