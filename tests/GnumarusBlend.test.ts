import { describe, expect, it } from "vitest";
import { isBlendFile, detectBlendCompression, parseBlendFile } from "../src/project/GnumarusBlend";

/** Minimal hand-built .blend v1 writer for parser tests. */
interface MiniField {
  type: string;
  name: string;
  values: number[];
}

interface MiniStruct {
  name: string;
  fields: MiniField[];
}

const PRIMITIVE_SIZES: Record<string, number> = {
  void: 0,
  char: 1,
  short: 2,
  int: 4,
  float: 4,
};

interface MiniMemberLayout {
  base: string;
  offset: number;
  size: number;
  isPointer: boolean;
}

function memberAlignOf(type: string, size: number): number {
  if (type === "void") {
    return 1;
  }
  return Math.min(Math.max(size, 1), 8);
}

function nestedAlignOf(type: string): number {
  const nested = MINI_STRUCTS.find((entry) => entry.name === type);
  if (nested === undefined) {
    throw new Error(`unknown test type ${type}`);
  }
  let align = 1;
  for (const member of layoutOf(nested)) {
    align = Math.max(align, Math.min(member.size, 8));
  }
  return Math.min(align, 8);
}

/** Aligned member layout shared by the test writer (mirrors the parser rule). */
function layoutOf(struct: MiniStruct): MiniMemberLayout[] {
  const out: MiniMemberLayout[] = [];
  let offset = 0;
  for (const field of struct.fields) {
    const match = /^(void\s*\**|\**)([A-Za-z_][A-Za-z0-9_]*?)((?:\[\d+\])*)$/.exec(field.name);
    if (match === null) {
      throw new Error(`bad test member: ${field.name}`);
    }
    const isPointer = match[1].includes("*");
    let size = isPointer ? 8 : (PRIMITIVE_SIZES[field.type] ?? 0);
    let align = 8;
    if (!isPointer) {
      if (field.type in PRIMITIVE_SIZES) {
        align = memberAlignOf(field.type, size);
      } else {
        align = nestedAlignOf(field.type);
        const nested = MINI_STRUCTS.find((entry) => entry.name === field.type);
        if (nested === undefined) {
          throw new Error(`unknown test type ${field.type}`);
        }
        size = structSize(nested);
      }
    }
    let dims = 1;
    for (const dim of match[3].matchAll(/\[(\d+)\]/g)) {
      dims *= Number(dim[1]);
    }
    offset += ((-offset) % align + align) % align;
    out.push({ base: match[2], offset, size: size * dims, isPointer });
    offset += size * dims;
  }
  return out;
}

const structSizeCache = new Map<string, number>();
function structSize(struct: MiniStruct): number {
  const cached = structSizeCache.get(struct.name);
  if (cached !== undefined) {
    return cached;
  }
  structSizeCache.set(struct.name, 8);
  let total = 0;
  let align = 1;
  for (const member of layoutOf(struct)) {
    align = Math.max(align, Math.min(member.size, 8));
    total = Math.max(total, member.offset + member.size);
  }
  total += ((-total) % align + align) % align;
  structSizeCache.set(struct.name, total);
  return total;
}

const MINI_TYPES = ["void", "char", "short", "int", "float"];
const MINI_STRUCTS: MiniStruct[] = [
  { name: "ID", fields: [{ type: "void", name: "*next", values: [0, 0] }, { type: "void", name: "*prev", values: [0, 0] }, { type: "char", name: "name[64]", values: [] }] },
  { name: "ListBase", fields: [{ type: "void", name: "*first", values: [0, 0] }, { type: "void", name: "*last", values: [0, 0] }] },
  { name: "Base", fields: [{ type: "void", name: "*object", values: [0, 0] }, { type: "void", name: "*next", values: [0, 0] }] },
  {
    name: "Object",
    fields: [
      { type: "ID", name: "id", values: [] },
      { type: "short", name: "type", values: [] },
      { type: "char", name: "_pad0[6]", values: [] },
      { type: "void", name: "*data", values: [0, 0] },
      { type: "void", name: "*parent", values: [0, 0] },
      { type: "float", name: "loc[3]", values: [] },
      { type: "float", name: "size[3]", values: [] },
      { type: "float", name: "quat[4]", values: [] },
      { type: "float", name: "rot[3]", values: [] },
      { type: "float", name: "rotAxis[3]", values: [] },
      { type: "float", name: "rotAngle", values: [] },
      { type: "short", name: "rotmode", values: [] },
      { type: "char", name: "_pad1[6]", values: [] },
    ],
  },
  { name: "Scene", fields: [{ type: "ID", name: "id", values: [] }, { type: "ListBase", name: "base", values: [] }] },
  {
    name: "Mesh",
    fields: [
      { type: "ID", name: "id", values: [] },
      { type: "int", name: "totvert", values: [] },
      { type: "int", name: "totedge", values: [] },
      { type: "int", name: "totpoly", values: [] },
      { type: "int", name: "totloop", values: [] },
      { type: "void", name: "**mat", values: [0, 0] },
      { type: "int", name: "totcol", values: [] },
      { type: "int", name: "_pad0", values: [0] },
      { type: "void", name: "*poly_offset_indices", values: [0, 0] },
      { type: "AttributeStorage", name: "attribute_storage", values: [] },
    ],
  },
  {
    name: "AttributeStorage",
    fields: [
      { type: "void", name: "*dna_attributes", values: [0, 0] },
      { type: "int", name: "dna_attributes_num", values: [] },
    ],
  },
  {
    name: "Attribute",
    fields: [
      { type: "void", name: "*name", values: [0, 0] },
      { type: "short", name: "data_type", values: [] },
      { type: "char", name: "domain", values: [] },
      { type: "char", name: "storage_type", values: [] },
      { type: "char", name: "_pad[4]", values: [] },
      { type: "void", name: "*data", values: [0, 0] },
    ],
  },
];

describe("blend header sniffing", () => {
  it("accepts uncompressed files and detects compression", () => {
    const file = buildMiniScene();
    expect(isBlendFile(file)).toBe(true);
    expect(detectBlendCompression(file)).toBeNull();
    expect(detectBlendCompression(new Uint8Array([0x28, 0xb5, 0x2f, 0xfd, 1, 2, 3]))).toBe("zstd");
    expect(detectBlendCompression(new Uint8Array([0x1f, 0x8b, 1, 2, 3]))).toBe("gzip");
    expect(isBlendFile(new Uint8Array([1, 2, 3]))).toBe(false);
  });

  it("rejects big-endian and wrong versions", () => {
    expect(() => parseBlendFile(buildMiniScene("0402"))).toThrow(/only files saved by Blender 5/);
    expect(() => parseBlendFile(buildMiniScene("0600"))).toThrow(/only files saved by Blender 5/);
    const bigEndian = buildMiniScene();
    bigEndian[12] = 0x56;
    expect(() => parseBlendFile(bigEndian)).toThrow(/little-endian/);
    expect(() => parseBlendFile(new Uint8Array([0x28, 0xb5, 0x2f, 0xfd]))).toThrow(/Compress File/);
    const truncated = buildMiniScene();
    expect(() => parseBlendFile(truncated.slice(0, 10))).toThrow(/Truncated|missing|Invalid/i);
    expect(() => parseBlendFile(truncated.slice(0, 100))).toThrow(/Truncated|missing|Invalid|DNA|header/i);
  });
});

/** Minimal valid scene: one triangle mesh with position/corner/UV attributes. */
function buildMiniScene(version = "0503", corruptOffsets = false): Uint8Array {
  const encoder = new TextEncoder();
  let nextOld = 0x1000;
  const takeOld = (): number => {
    const old = nextOld;
    nextOld += 0x100;
    return old;
  };
  interface TestBlock {
    code: string;
    sdna: number;
    old: number;
    data: Uint8Array;
  }
  const blocks: TestBlock[] = [];
  const fixedStruct = (name: string): (typeof MINI_STRUCTS)[number] => {
    const found = MINI_STRUCTS.find((entry) => entry.name === name);
    if (found === undefined) {
      throw new Error(`unknown test struct ${name}`);
    }
    return found;
  };
  const memberOffset = (structName: string, base: string): number => {
    const found = layoutOf(fixedStruct(structName)).find((member) => member.base === base);
    if (found === undefined) {
      throw new Error(`test struct ${structName} has no ${base}`);
    }
    return found.offset;
  };
  const writeString = (bytes: Uint8Array, offset: number, text: string, length: number): void => {
    const encoded = encoder.encode(text);
    bytes.set(encoded.slice(0, length - 1), offset);
  };
  const putU64 = (view: DataView, offset: number, value: number): void => {
    view.setUint32(offset, value % 4294967296, true);
    view.setUint32(offset + 4, Math.floor(value / 4294967296), true);
  };
  const putF32 = (view: DataView, offset: number, values: number[]): void => {
    values.forEach((value, index) => view.setFloat32(offset + index * 4, value, true));
  };
  const types = [...MINI_TYPES, ...MINI_STRUCTS.map((struct) => struct.name)];
  const typeIndexOf = (type: string): number => {
    const index = types.indexOf(type);
    if (index < 0) {
      throw new Error(`unknown test type ${type}`);
    }
    return index;
  };
  const names: string[] = [];
  for (const struct of MINI_STRUCTS) {
    for (const field of struct.fields) {
      if (!names.includes(field.name)) {
        names.push(field.name);
      }
    }
  }
  const sdna: number[] = [];
  const pushAscii = (text: string): void => {
    for (const byte of encoder.encode(text)) {
      sdna.push(byte);
    }
  };
  const emitI32 = (value: number): void => {
    sdna.push(value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff, (value >> 24) & 0xff);
  };
  const emitI16 = (value: number): void => {
    sdna.push(value & 0xff, (value >> 8) & 0xff);
  };
  const emitText = (text: string): void => {
    for (const byte of encoder.encode(text)) {
      sdna.push(byte);
    }
    sdna.push(0);
  };
  const padTo = (alignment: number): void => {
    while (sdna.length % alignment !== 0) {
      sdna.push(0);
    }
  };
  pushAscii("SDNA");
  pushAscii("NAME");
  emitI32(names.length);
  for (const name of names) {
    emitText(name);
  }
  padTo(4);
  pushAscii("TYPE");
  emitI32(types.length);
  for (const type of types) {
    emitText(type);
  }
  padTo(4);
  pushAscii("TLEN");
  for (const type of types) {
    const primitive = PRIMITIVE_SIZES[type];
    if (primitive !== undefined) {
      emitI16(primitive);
      continue;
    }
    emitI16(structSize(fixedStruct(type)));
  }
  padTo(4);
  pushAscii("STRC");
  emitI32(MINI_STRUCTS.length);
  for (const struct of MINI_STRUCTS) {
    emitI16(types.indexOf(struct.name));
    emitI16(struct.fields.length);
    for (const field of struct.fields) {
      const match = /^(void\s*\**|\**)([A-Za-z_][A-Za-z0-9_]*?)((?:\[\d+\])*)$/.exec(field.name);
      if (match === null) {
        throw new Error(`bad test member ${field.name}`);
      }
      const isPointer = match[1].includes("*");
      const fieldType = isPointer && field.type !== "void" ? "void" : field.type;
      emitI16(typeIndexOf(fieldType));
      const nameIndex = names.indexOf(field.name);
      if (nameIndex < 0) {
        throw new Error(`unknown test name ${field.name}`);
      }
      emitI16(nameIndex);
    }
  }
  const sdnaBytes = new Uint8Array(sdna);
  const addBlock = (code: string, sdnaName: string | null, old: number, data: Uint8Array): void => {
    blocks.push({ code, sdna: sdnaName === null ? 0 : types.indexOf(sdnaName), old, data });
  };
  const stringBlock = (text: string): number => {
    const old = takeOld();
    const data = new Uint8Array([...encoder.encode(text), 0]);
    addBlock("DATA", null, old, data);
    return old;
  };
  const namePosition = stringBlock("position");
  const nameCorner = stringBlock(".corner_vert");
  const nameCornerEdge = stringBlock(".corner_edge");
  const nameUV = stringBlock("UVMap");
  const positionsPtr = takeOld();
  addBlock("DATA", null, positionsPtr, new Uint8Array(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]).buffer));
  const cornersPtr = takeOld();
  addBlock("DATA", null, cornersPtr, new Uint8Array(new Uint32Array([0, 1, 2]).buffer));
  const cornerEdgesPtr = takeOld();
  addBlock("DATA", null, cornerEdgesPtr, new Uint8Array(new Uint32Array([0, 1, 2]).buffer));
  const uvsPtr = takeOld();
  addBlock("DATA", null, uvsPtr, new Uint8Array(new Float32Array([0, 0, 1, 0, 0, 1]).buffer));
  const offsetsPtr = takeOld();
  {
    const data = new Uint8Array(8);
    const view = new DataView(data.buffer);
    view.setUint32(0, 0, true);
    view.setUint32(4, corruptOffsets ? 99 : 3, true);
    addBlock("DATA", null, offsetsPtr, data);
  }
  const writeAttribute = (view: DataView, offset: number, namePtr: number, dtype: number, domain: number, dataPtr: number): void => {
    view.setUint32(offset, namePtr % 4294967296, true);
    view.setUint32(offset + 4, Math.floor(namePtr / 4294967296), true);
    view.setInt16(offset + 8, dtype, true);
    view.setUint8(offset + 10, domain);
    view.setUint8(offset + 11, 0);
    view.setUint32(offset + 12, 0, true);
    view.setUint32(offset + 16, dataPtr % 4294967296, true);
    view.setUint32(offset + 20, Math.floor(dataPtr / 4294967296), true);
  };
  const attrData = new Uint8Array(4 * 24);
  const attrView = new DataView(attrData.buffer);
  writeAttribute(attrView, 0, namePosition, 7, 0, positionsPtr);
  writeAttribute(attrView, 24, nameCorner, 3, 3, cornersPtr);
  writeAttribute(attrView, 48, nameCornerEdge, 3, 3, cornerEdgesPtr);
  writeAttribute(attrView, 72, nameUV, 6, 3, uvsPtr);
  const attrArray = takeOld();
  addBlock("DATA", "Attribute", attrArray, attrData);
  // Mesh block (ID header + fields; member offsets already include the ID header).
  const meshBytes = new Uint8Array(structSize(fixedStruct("Mesh")));
  const meshView = new DataView(meshBytes.buffer);
  writeString(meshBytes, memberOffset("ID", "name"), "MECube", 64);
  const setMesh = (base: string, write: (view: DataView, offset: number) => void): void => {
    write(meshView, memberOffset("Mesh", base));
  };
  setMesh("totvert", (view, offset) => view.setInt32(offset, 3, true));
  setMesh("totedge", (view, offset) => view.setInt32(offset, 3, true));
  setMesh("totpoly", (view, offset) => view.setInt32(offset, 1, true));
  setMesh("totloop", (view, offset) => view.setInt32(offset, 3, true));
  setMesh("totcol", (view, offset) => view.setInt32(offset, 0, true));
  setMesh("poly_offset_indices", (view, offset) => putU64(view, offset, offsetsPtr));
  setMesh("attribute_storage", (view, offset) => {
    const inner = layoutOf(fixedStruct("AttributeStorage"));
    const dnaAttr = inner.find((entry) => entry.base === "dna_attributes");
    const dnaNum = inner.find((entry) => entry.base === "dna_attributes_num");
    if (dnaAttr === undefined || dnaNum === undefined) {
      throw new Error("no attribute storage layout");
    }
    putU64(view, offset + dnaAttr.offset, attrArray);
    view.setInt32(offset + dnaNum.offset, 4, true);
  });
  const meshOld = takeOld();
  blocks.push({ code: "ME", sdna: types.indexOf("Mesh"), old: meshOld, data: meshBytes });
  // Object block (ID header + TRS).
  const objectBytes = new Uint8Array(structSize(fixedStruct("Object")));
  const objectView = new DataView(objectBytes.buffer);
  writeString(objectBytes, memberOffset("ID", "name"), "OBCube", 64);
  const setObject = (base: string, write: (view: DataView, offset: number) => void): void => {
    write(objectView, memberOffset("Object", base));
  };
  setObject("type", (view, offset) => view.setInt16(offset, 1, true));
  setObject("data", (view, offset) => putU64(view, offset, meshOld));
  setObject("loc", (view, offset) => putF32(view, offset, [1, 2, 3]));
  setObject("size", (view, offset) => putF32(view, offset, [1, 1, 1]));
  setObject("quat", (view, offset) => putF32(view, offset, [0, 0, 0, 1]));
  setObject("rot", (view, offset) => putF32(view, offset, [0, 0, 0]));
  setObject("rotAxis", (view, offset) => putF32(view, offset, [0, 0, 1]));
  setObject("rotAngle", (view, offset) => view.setFloat32(offset, 0, true));
  setObject("rotmode", (view, offset) => view.setInt16(offset, 0, true));
  const objectOld = takeOld();
  blocks.push({ code: "OB", sdna: types.indexOf("Object"), old: objectOld, data: objectBytes });
  // Base + Scene blocks linking the object.
  const baseBytes = new Uint8Array(structSize(fixedStruct("Base")));
  const baseView = new DataView(baseBytes.buffer);
  const baseLayout = layoutOf(fixedStruct("Base"));
  const baseObject = baseLayout.find((entry) => entry.base === "object");
  if (baseObject === undefined) {
    throw new Error("no base layout");
  }
  putU64(baseView, baseObject.offset, objectOld);
  const baseOld = takeOld();
  blocks.push({ code: "DATA", sdna: 0, old: baseOld, data: baseBytes });
  const sceneBytes = new Uint8Array(structSize(fixedStruct("Scene")));
  const sceneView = new DataView(sceneBytes.buffer);
  writeString(sceneBytes, memberOffset("ID", "name"), "SCScene", 64);
  const sceneLayout = layoutOf(fixedStruct("Scene"));
  const sceneBase = sceneLayout.find((entry) => entry.base === "base");
  if (sceneBase === undefined) {
    throw new Error("no scene layout");
  }
  const listLayout = layoutOf(fixedStruct("ListBase"));
  const listFirst = listLayout.find((entry) => entry.base === "first");
  const listLast = listLayout.find((entry) => entry.base === "last");
  if (listFirst === undefined || listLast === undefined) {
    throw new Error("no list layout");
  }
  putU64(sceneView, sceneBase.offset + listFirst.offset, baseOld);
  putU64(sceneView, sceneBase.offset + listLast.offset, baseOld);
  blocks.push({ code: "SC", sdna: types.indexOf("Scene"), old: takeOld(), data: sceneBytes });
  // Assemble: header + DNA1 + data blocks + ENDB (LargeBHead8, 32 bytes).
  const out: number[] = [];
  const pushOutAscii = (text: string): void => {
    for (const byte of encoder.encode(text)) {
      out.push(byte);
    }
  };
  const pushOutI32 = (value: number): void => {
    out.push(value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff, (value >> 24) & 0xff);
  };
  const pushOutU64 = (value: number): void => {
    pushOutI32(value % 4294967296);
    pushOutI32(Math.floor(value / 4294967296));
  };
  const pushBlock = (code: string, sdna: number, old: number, data: Uint8Array): void => {
    const padded = code.length >= 4 ? code.slice(0, 4) : code + "\x00".repeat(4 - code.length);
    for (let index = 0; index < 4; index += 1) {
      out.push(padded.charCodeAt(index));
    }
    pushOutI32(sdna);
    pushOutU64(old);
    pushOutU64(data.length);
    pushOutU64(1);
    for (const byte of data) {
      out.push(byte);
    }
  };
  pushOutAscii("BLENDER17-01v" + version);
  pushBlock("DNA1", 0, 0, sdnaBytes);
  for (const block of blocks) {
    pushBlock(block.code, block.sdna, block.old, block.data);
  }
  pushBlock("ENDB", 0, 0, new Uint8Array(0));
  return new Uint8Array(out);
}

describe("parseBlendFile end to end on a hand-built file", () => {
  it("extracts one triangle mesh with transform, UVs and offsets", () => {
    const bytes = buildMiniScene();
    const doc = parseBlendFile(bytes);
    expect(doc.skipped).toEqual([]);
    expect(doc.meshes).toHaveLength(1);
    const mesh = doc.meshes[0] as NonNullable<(typeof doc.meshes)[number]>;
    expect(mesh.name).toBe("OBCube");
    // Local positions (object translation lives in matrix, applied at glTF convert).
    expect(Array.from(mesh.positions.slice(0, 3))).toEqual([0, 0, 0]);
    // Smooth normal of a single +Z triangle.
    expect(Array.from(mesh.normals.slice(0, 3))).toEqual([0, 0, 1]);
    // UVs are preserved per corner.
    expect(Array.from(mesh.uvs as Float32Array)).toEqual([0, 0, 1, 0, 0, 1]);
    expect(Array.from(mesh.indices)).toEqual([0, 1, 2]);
    expect(Array.from(mesh.triMaterials)).toEqual([0]);
    expect(mesh.matrix[12]).toBe(1);
    expect(mesh.matrix[13]).toBe(2);
    expect(mesh.matrix[14]).toBe(3);
  });

  it("rejects corrupt face offsets", () => {
    const bytes = buildMiniScene("0503", true);
    expect(() => parseBlendFile(bytes)).toThrow(/face offsets/);
  });
});
