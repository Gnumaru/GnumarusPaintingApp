/**
 * Strict Blender `.blend` reader (5.x files only) plus mesh/light/texture
 * extraction for 3D import. Only what the app can use is decoded: meshes at
 * their local transforms (first frame, modifiers and armatures ignored),
 * packed image textures, vertex colors, UVs and lights. Everything else
 * (skeletons, animations, node materials beyond a texture lookup, curves,
 * cameras, worlds, physics) is skipped with a recorded reason.
 *
 * File layout facts (verified against Blender 5.3 files and
 * `source/blender/blenloader_core/BLO_core_bhead.hh`): a 17-byte v1 header (or legacy 12-byte v0 header),
 * `LargeBHead8` blocks, an SDNA block describing every struct, ID blocks
 * (`OB`/`ME`/`LA`/`IM`/`MA`/`SC`), and per-mesh generic attributes
 * (`position`, `.corner_vert`, `.corner_edge`, `material_index`, UV layers,
 * color layers) with a `poly_offset_indices` face-offset array. Legacy
 * `mvert`/`mloop`/`mpoly` arrays are not written by Blender 5 and are not
 * used here.
 */

export class GnumarusBlendError extends Error {}

/** Single extracted mesh (Blender Z-up space, raw units). */
export interface GnumarusBlendMesh {
  name: string;
  /** Column-major 4x4 object transform (local TRS; parents ignored). */
  matrix: number[];
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array | null;
  colors: Float32Array | null;
  indices: Uint32Array;
  /** Material slot index per triangle. */
  triMaterials: Uint16Array;
  materials: Array<{ name: string; texture: number | null; baseColor: [number, number, number, number] }>;
}

/** Packed image referenced by a material. */
export interface GnumarusBlendImage {
  name: string;
  mime: "image/png" | "image/jpeg";
  bytes: Uint8Array;
}

/** Light with a local transform (Blender space). */
export interface GnumarusBlendLight {
  name: string;
  kind: "point" | "sun" | "spot" | "area";
  color: [number, number, number];
  energy: number;
  matrix: number[];
  spotSize: number;
  spotBlend: number;
  areaSize: number;
  areaSizeY: number;
}

export interface GnumarusBlendDocument {
  meshes: GnumarusBlendMesh[];
  images: GnumarusBlendImage[];
  lights: GnumarusBlendLight[];
  /** Human-readable notes about skipped data (parents, curves, ...). */
  skipped: string[];
}

const ZSTD_MAGIC = [0x28, 0xb5, 0x2f, 0xfd];
const GZIP_MAGIC = [0x1f, 0x8b];

/** True for an uncompressed .blend file (any version). */
export function isBlendFile(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 7 &&
    bytes[0] === 0x42 &&
    bytes[1] === 0x4c &&
    bytes[2] === 0x45 &&
    bytes[3] === 0x4e &&
    bytes[4] === 0x44 &&
    bytes[5] === 0x45 &&
    bytes[6] === 0x52
  );
}

/** Compressed .blend variants the app cannot decode (needs an explicit choice). */
export function detectBlendCompression(bytes: Uint8Array): "zstd" | "gzip" | null {
  if (
    bytes.length >= 4 &&
    bytes[0] === ZSTD_MAGIC[0] &&
    bytes[1] === ZSTD_MAGIC[1] &&
    bytes[2] === ZSTD_MAGIC[2] &&
    bytes[3] === ZSTD_MAGIC[3]
  ) {
    return "zstd";
  }
  if (bytes.length >= 2 && bytes[0] === GZIP_MAGIC[0] && bytes[1] === GZIP_MAGIC[1]) {
    return "gzip";
  }
  return null;
}

interface BlendBlock {
  code: string;
  sdna: number;
  old: bigint;
  len: number;
  nr: number;
  offset: number;
}

interface SdnaMember {
  name: string;
  base: string;
  dims: number[];
  isPointer: boolean;
  type: string;
  typeSize: number;
  offset: number;
}

interface SdnaStruct {
  name: string;
  size: number;
  members: SdnaMember[];
  byName: Map<string, number>;
}

interface SdnaRawMember {
  type: string;
  typeSize: number;
  base: string;
  dims: number[];
  isPointer: boolean;
  name: string;
}

type Primitive = "u8" | "i16" | "u16" | "u32" | "i32" | "f32" | "f64";

function primitiveOf(type: string): Primitive | null {
  switch (type) {
    case "char":
    case "uchar":
    case "uint8_t":
    case "int8_t":
    case "bool":
      return "u8";
    case "ushort":
    case "uint16_t":
      return "u16";
    case "short":
    case "int16_t":
      return "i16";
    case "uint":
    case "uint32_t":
    case "unsigned":
    case "unsigned int":
      return "u32";
    case "int":
    case "int32_t":
    case "int64_t":
      return "i32";
    case "float":
      return "f32";
    case "double":
      return "f64";
    default:
      return null;
  }
}

function parseMemberName(raw: string): { base: string; dims: number[]; isPointer: boolean } | null {
  // Function pointers (e.g. `(*callback)()`) are opaque 8-byte slots; the
  // inner name is kept so layouts stay aligned, contents never read.
  const func = /^\(\*+([A-Za-z_][A-Za-z0-9_]*)\)(\([^)]*\))?$/.exec(raw);
  if (func !== null) {
    return { base: func[1] as string, dims: [], isPointer: true };
  }
  const match = /^(\**)([A-Za-z_][A-Za-z0-9_]*?)((?:\[\d+\])*)$/.exec(raw);
  if (match === null) {
    return null;
  }
  const dims: number[] = [];
  const dimRe = /\[(\d+)\]/g;
  let dimMatch: RegExpExecArray | null;
  while ((dimMatch = dimRe.exec(match[3] as string)) !== null) {
    dims.push(Number(dimMatch[1]));
  }
  return { base: match[2] as string, dims, isPointer: (match[1] as string).length > 0 };
}

export class BlendReader {
  readonly bytes: Uint8Array;
  private readonly view: DataView;
  readonly ptrSize: number;
  readonly fileVersion: number;
  private headerSize = 17;
  /** SDNA struct table (STRC order); index matches block SDNAnr. Exported for tests. */
  structs: SdnaStruct[] = [];
  blocks: BlendBlock[] = [];
  private readonly byOld = new Map<bigint, BlendBlock[]>();
  private readonly layoutCache = new Map<string, SdnaMember[]>();
  private pendingLayouts: Array<{ index: number; members: SdnaRawMember[] }> = [];
  private rawStructs: Array<{ name: string; members: SdnaRawMember[] }> = [];

  constructor(bytes: Uint8Array) {
    const compressed = detectBlendCompression(bytes);
    if (compressed !== null) {
      throw new GnumarusBlendError(
        "Compressed .blend files are not supported: re-save the project in Blender with Compress File off and import again.",
      );
    }
    if (!isBlendFile(bytes)) {
      throw new GnumarusBlendError("Not a Blender .blend file (missing BLENDER magic).");
    }
    if (bytes.length < 17) {
      throw new GnumarusBlendError("Truncated .blend header.");
    }
    // v1 17-byte header only (all 64-bit Blender 5.x builds write this):
    // BLENDER + size("17") + "-" + format("01") + endian + 4-digit version.
    const isV1 = bytes[7] === 0x31 && bytes[8] === 0x37;
    if (!isV1 || bytes[9] !== 0x2d || bytes[10] !== 0x30 || bytes[11] !== 0x31) {
      throw new GnumarusBlendError("Unsupported .blend header (expected Blender 5.x format).");
    }
    {
      const endian = String.fromCharCode(bytes[12] as number);
      if (endian !== "v") {
        throw new GnumarusBlendError("Only little-endian .blend files are supported.");
      }
      const versionText = String.fromCharCode(bytes[13] as number, bytes[14] as number, bytes[15] as number, bytes[16] as number);
      const version = Number(versionText);
      if (!Number.isInteger(version) || version < 500 || version > 509) {
        throw new GnumarusBlendError(
          `Unsupported .blend version ${versionText}: only files saved by Blender 5.x can be imported.`,
        );
      }
      this.headerSize = 17;
      this.fileVersion = version;
    }
    this.bytes = bytes;
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.length);
    this.ptrSize = 8;
  }

  private need(offset: number, length: number, what: string): void {
    if (!Number.isInteger(offset) || offset < 0 || length < 0 || offset + length > this.bytes.length) {
      throw new GnumarusBlendError(`Truncated .blend file while reading ${what}.`);
    }
  }

  u8(offset: number): number {
    this.need(offset, 1, "u8");
    return this.bytes[offset] as number;
  }

  u16(offset: number): number {
    this.need(offset, 2, "u16");
    return this.view.getUint16(offset, true);
  }

  i16(offset: number): number {
    this.need(offset, 2, "i16");
    return this.view.getInt16(offset, true);
  }

  u32(offset: number): number {
    this.need(offset, 4, "u32");
    return this.view.getUint32(offset, true);
  }

  i32(offset: number): number {
    this.need(offset, 4, "i32");
    return this.view.getInt32(offset, true);
  }

  f32(offset: number): number {
    this.need(offset, 4, "f32");
    return this.view.getFloat32(offset, true);
  }

  f64(offset: number): number {
    this.need(offset, 8, "f64");
    return this.view.getFloat64(offset, true);
  }

  u64(offset: number): bigint {
    this.need(offset, 8, "u64");
    return this.view.getBigUint64(offset, true);
  }

  readBlocks(): void {
    // v1 files always use 32-byte LargeBHead8 (code/SDNAnr/old64/len64/nr64).
    const stride = 32;
    let pos = this.headerSize;
    for (;;) {
      this.need(pos, stride, "block header");
      let rawCode = "";
      for (let i = 0; i < 4; i += 1) {
        rawCode += String.fromCharCode(this.bytes[pos + i] as number);
      }
      // ID codes are 2 letters + 2 NUL bytes (e.g. "OB\0\0"); strip padding
      // so scene/object/mesh blocks compare by their 2-letter code.
      const code = rawCode.replace(/\0+$/, "");
      let sdna = 0;
      let old = 0n;
      let len = 0;
      let nr = 0;
      {
        sdna = this.view.getInt32(pos + 4, true);
        old = this.u64(pos + 8);
        len = Number(this.view.getBigInt64(pos + 16, true));
        nr = Number(this.view.getBigUint64(pos + 24, true));
      }
      if (!Number.isInteger(len) || len < 0 || !Number.isInteger(nr) || nr < 0) {
        throw new GnumarusBlendError("Invalid .blend block header.");
      }
      if (code === "ENDB") {
        return;
      }
      this.need(pos + stride, len, `block ${JSON.stringify(code)}`);
      this.blocks.push({ code, sdna, old, len, nr, offset: pos + stride });
      const existing = this.byOld.get(old);
      if (existing === undefined) {
        this.byOld.set(old, []);
      }
      (this.byOld.get(old) as BlendBlock[]).push(this.blocks[this.blocks.length - 1] as BlendBlock);
      pos += stride + len;
    }
  }

  readSdna(): void {
    const dna = this.blocks.find((block) => block.code === "DNA1");
    if (dna === undefined) {
      throw new GnumarusBlendError(".blend file has no DNA1 type description block.");
    }
    let p = dna.offset;
    const magic = this.bytes.slice(p, p + 4);
    if (magic[0] !== 0x53 || magic[1] !== 0x44 || magic[2] !== 0x4e || magic[3] !== 0x41) {
      throw new GnumarusBlendError("Invalid .blend DNA1 block (missing SDNA magic).");
    }
    p += 4;
    const readName = (): string => {
      const end = this.bytes.indexOf(0, p);
      if (end < 0 || end >= dna.offset + dna.len) {
        throw new GnumarusBlendError("Truncated .blend SDNA strings.");
      }
      const text = new TextDecoder().decode(this.bytes.slice(p, end));
      p = end + 1;
      return text;
    };
    const pad = (): void => {
      p += (((-(p - dna.offset)) % 4) + 4) % 4;
    };
    const expectTag = (tag: string): void => {
      const actual = String.fromCharCode(
        this.bytes[p] as number,
        this.bytes[p + 1] as number,
        this.bytes[p + 2] as number,
        this.bytes[p + 3] as number,
      );
      if (actual !== tag) {
        throw new GnumarusBlendError(`Invalid .blend SDNA (expected ${tag}).`);
      }
      p += 4;
    };
    expectTag("NAME");
    const nameCount = this.i32(p);
    p += 4;
    const names: string[] = [];
    for (let i = 0; i < nameCount; i += 1) {
      names.push(readName());
    }
    pad();
    expectTag("TYPE");
    const typeCount = this.i32(p);
    p += 4;
    const types: string[] = [];
    for (let i = 0; i < typeCount; i += 1) {
      types.push(readName());
    }
    pad();
    expectTag("TLEN");
    const typeSizes: number[] = [];
    for (let i = 0; i < typeCount; i += 1) {
      this.need(p, 2, "SDNA type size");
      typeSizes.push(this.view.getInt16(p, true));
      p += 2;
    }
    pad();
    expectTag("STRC");
    const structCount = this.i32(p);
    p += 4;
    for (let i = 0; i < structCount; i += 1) {
      this.need(p, 4, "SDNA struct header");
      const typeIndex = this.view.getInt16(p, true);
      const memberCount = this.view.getInt16(p + 2, true);
      p += 4;
      if (typeIndex < 0 || typeIndex >= types.length || memberCount < 0) {
        throw new GnumarusBlendError("Invalid .blend SDNA struct entry.");
      }
      const rawMembers: SdnaRawMember[] = [];
      for (let m = 0; m < memberCount; m += 1) {
        this.need(p, 4, "SDNA struct member");
        const memberType = this.view.getInt16(p, true);
        const memberName = this.view.getInt16(p + 2, true);
        p += 4;
        if (memberType < 0 || memberType >= types.length || memberName < 0 || memberName >= names.length) {
          throw new GnumarusBlendError("Invalid .blend SDNA struct member.");
        }
        const parsed = parseMemberName(names[memberName] as string);
        if (parsed === null) {
          throw new GnumarusBlendError(`Unsupported .blend SDNA member name: ${names[memberName]}.`);
        }
        rawMembers.push({
          type: types[memberType] as string,
          typeSize: typeSizes[memberType] as number,
          base: parsed.base,
          dims: parsed.dims,
          isPointer: parsed.isPointer,
          name: names[memberName] as string,
        });
      }
      const name = types[typeIndex] as string;
      const size = typeSizes[typeIndex] as number;
      this.structs.push({ name, size, members: [], byName: new Map<string, number>() });
      this.rawStructs.push({ name, members: rawMembers });
      this.pendingLayouts.push({ index: this.structs.length - 1, members: rawMembers });
    }
    this.resolveLayouts();
  }

  private resolveLayouts(): void {
    for (const pending of this.pendingLayouts) {
      const entry = this.structs[pending.index];
      if (entry === undefined) {
        continue;
      }
      let offset = 0;
      for (const raw of pending.members) {
        const elemSize = raw.isPointer ? 8 : raw.typeSize;
        const align = raw.isPointer ? 8 : this.typeAlign(raw.type, raw.typeSize, new Set<string>());
        offset += ((-offset) % align + align) % align;
        let total = elemSize;
        for (const dim of raw.dims) {
          total *= dim;
        }
        if (!entry.byName.has(raw.base)) {
          entry.byName.set(raw.base, entry.members.length);
        }
        entry.members.push({
          name: raw.name,
          base: raw.base,
          dims: raw.dims,
          isPointer: raw.isPointer,
          type: raw.type,
          typeSize: raw.typeSize,
          offset,
        });
        offset += total;
      }
    }
    this.pendingLayouts = [];
  }

  structIndex(name: string): number {
    const index = this.structs.findIndex((entry) => entry.name === name);
    if (index < 0) {
      throw new GnumarusBlendError(`.blend file has no ${name} struct definition.`);
    }
    return index;
  }

  /** C alignment of a type: pointers 8, primitives min(size, 8), structs max member alignment. */
  private typeAlign(typeName: string, typeSize: number, seen: Set<string>): number {
    if (typeSize <= 0) {
      return 1;
    }
    if (typeSize >= 8) {
      return 8;
    }
    if (seen.has(typeName)) {
      return 8;
    }
    seen.add(typeName);
    let align = 1;
    let known = false;
    for (const entry of this.rawStructs) {
      if (entry.name !== typeName) {
        continue;
      }
      known = true;
      for (const member of entry.members) {
        const memberAlign = member.isPointer ? 8 : this.typeAlign(member.type, member.typeSize, seen);
        align = Math.max(align, memberAlign);
      }
    }
    seen.delete(typeName);
    return known ? Math.min(align, 8) : Math.min(typeSize, 8);
  }

  layout(structName: string): SdnaMember[] {
    const cached = this.layoutCache.get(structName);
    if (cached !== undefined) {
      return cached;
    }
    const index = this.structIndex(structName);
    const members = this.structs[index]?.members ?? [];
    this.layoutCache.set(structName, members);
    return members;
  }

  memberOffset(structName: string, candidates: string[]): number {
    const members = this.layout(structName);
    for (const candidate of candidates) {
      const found = members.find((member) => member.base === candidate);
      if (found !== undefined) {
        return found.offset;
      }
    }
    throw new GnumarusBlendError(`.blend ${structName} has no ${candidates.join("/")} member.`);
  }

  structSize(structName: string): number {
    const index = this.structIndex(structName);
    return this.structs[index]?.size ?? 0;
  }

  member(structName: string, base: string): SdnaMember {
    const members = this.layout(structName);
    const found = members.find((member) => member.base === base);
    if (found === undefined) {
      throw new GnumarusBlendError(`.blend ${structName} has no ${base} member.`);
    }
    return found;
  }

  readPrimitive(type: string, offset: number): number {
    const prim = primitiveOf(type);
    if (prim === null) {
      throw new GnumarusBlendError(`Unsupported .blend field type: ${type}.`);
    }
    switch (prim) {
      case "u8":
        return this.u8(offset);
      case "u16":
        return this.u16(offset);
      case "i16":
        return this.i16(offset);
      case "u32":
        return this.u32(offset);
      case "i32":
        return this.i32(offset);
      case "f32":
        return this.f32(offset);
      case "f64":
        return this.f64(offset);
    }
  }

  readString(offset: number, maxLength: number): string {
    this.need(offset, maxLength, "string");
    const slice = this.bytes.slice(offset, offset + maxLength);
    const end = slice.indexOf(0);
    return new TextDecoder().decode(end < 0 ? slice : slice.slice(0, end));
  }

  blocksWithOld(old: bigint): BlendBlock[] {
    return this.byOld.get(old) ?? [];
  }
}

function readIdName(reader: BlendReader, offset: number): string {
  const member = reader.member("ID", "name");
  return reader.readString(offset + member.offset, 258);
}

interface BlendObject {
  name: string;
  type: number;
  data: bigint;
  loc: number[];
  size: number[];
  quat: number[];
  rot: number[];
  rotAxis: number[];
  rotAngle: number;
  rotmode: number;
}

function readObject(reader: BlendReader, offset: number): BlendObject {
  const loc3 = (primary: string, fallback: string): number[] => {
    let member: SdnaMember | null = null;
    for (const candidate of [primary, fallback]) {
      try {
        member = reader.member("Object", candidate);
        break;
      } catch {
        member = null;
      }
    }
    if (member === null) {
      throw new GnumarusBlendError("Corrupt .blend object (missing scale).");
    }
    const resolved = member;
    return [reader.f32(offset + resolved.offset), reader.f32(offset + resolved.offset + 4), reader.f32(offset + resolved.offset + 8)];
  };
  const loc = (base: string, count: number): number[] => {
    const member = reader.member("Object", base);
    const out: number[] = [];
    for (let i = 0; i < count; i += 1) {
      out.push(reader.f32(offset + member.offset + i * 4));
    }
    return out;
  };
  const typeMember = reader.member("Object", "type");
  const dataMember = reader.member("Object", "data");
  return {
    name: readIdName(reader, offset),
    type: reader.readPrimitive(typeMember.type, offset + typeMember.offset),
    data: reader.u64(offset + dataMember.offset),
    loc: loc("loc", 3),
    size: loc3("size", "scale"),
    quat: loc("quat", 4),
    rot: loc("rot", 3),
    rotAxis: loc("rotAxis", 3),
    rotAngle: loc("rotAngle", 1)[0] as number,
    rotmode: (() => {
      const member = reader.member("Object", "rotmode");
      return reader.readPrimitive(member.type, offset + member.offset);
    })(),
  };
}

function eulerToMatrix(euler: number[], order: number): number[] {
  const [x, y, z] = [euler[0] as number, euler[1] as number, euler[2] as number];
  const cx = Math.cos(x);
  const sx = Math.sin(x);
  const cy = Math.cos(y);
  const sy = Math.sin(y);
  const cz = Math.cos(z);
  const sz = Math.sin(z);
  // Column-major 3x3 for each XYZ-order variant.
  const rx = [1, 0, 0, 0, cx, sx, 0, -sx, cx];
  const ry = [cy, 0, -sy, 0, 1, 0, sy, 0, cy];
  const rz = [cz, sz, 0, -sz, cz, 0, 0, 0, 1];
  const orderName = ["XYZ", "XZY", "YXZ", "YZX", "ZXY", "ZYX"][order - 1] ?? "XYZ";
  const pick = (name: string): number[] => (name === "X" ? rx : name === "Y" ? ry : rz);
  let out = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  for (const axis of orderName) {
    out = mulMat3(out, pick(axis));
  }
  return out;
}

function mulMat3(a: number[], b: number[]): number[] {
  const out = new Array<number>(9).fill(0);
  for (let col = 0; col < 3; col += 1) {
    for (let row = 0; row < 3; row += 1) {
      out[col * 3 + row] =
        (a[0 * 3 + row] as number) * (b[col * 3 + 0] as number) +
        (a[1 * 3 + row] as number) * (b[col * 3 + 1] as number) +
        (a[2 * 3 + row] as number) * (b[col * 3 + 2] as number);
    }
  }
  return out;
}

function quatToMatrix(q: number[]): number[] {
  const [x, y, z, w] = [q[0] as number, q[1] as number, q[2] as number, q[3] as number];
  const xx = x * x;
  const yy = y * y;
  const zz = z * z;
  const xy = x * y;
  const xz = x * z;
  const yz = y * z;
  const wx = w * x;
  const wy = w * y;
  const wz = w * z;
  return [1 - 2 * (yy + zz), 2 * (xy + wz), 2 * (xz - wy), 2 * (xy - wz), 1 - 2 * (xx + zz), 2 * (yz + wx), 2 * (xz + wy), 2 * (yz - wx), 1 - 2 * (xx + yy)];
}

function objectMatrix(object: BlendObject): number[] {
  const s = object.size;
  let r: number[];
  if (object.rotmode === 0) {
    r = quatToMatrix(object.quat);
  } else if (object.rotmode >= 1 && object.rotmode <= 6) {
    r = eulerToMatrix(object.rot, object.rotmode);
  } else {
    // Axis-angle and exotic modes: keep translation+scale, drop rotation.
    r = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  }
  const t = object.loc;
  return [
    r[0] as number * (s[0] as number),
    r[1] as number * (s[0] as number),
    r[2] as number * (s[0] as number),
    0,
    r[3] as number * (s[1] as number),
    r[4] as number * (s[1] as number),
    r[5] as number * (s[1] as number),
    0,
    r[6] as number * (s[2] as number),
    r[7] as number * (s[2] as number),
    r[8] as number * (s[2] as number),
    0,
    t[0] as number,
    t[1] as number,
    t[2] as number,
    1,
  ];
}

function readIntArrayFromOld(reader: BlendReader, oldPtr: bigint, count: number, what: string): number[] {
  if (oldPtr === 0n) {
    throw new GnumarusBlendError(`Truncated .blend file (${what} missing).`);
  }
  const holders = reader.blocksWithOld(oldPtr);
  if (holders.length === 0) {
    throw new GnumarusBlendError(`Truncated .blend file (${what} missing).`);
  }
  const holder = holders[0] as BlendBlock;
  if (holder.len < count * 4) {
    throw new GnumarusBlendError(`Truncated .blend file (${what} truncated).`);
  }
  const out: number[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push(reader.i32(holder.offset + i * 4));
  }
  return out;
}

interface MeshPointers {
  offset: number;
  name: string;
  totvert: number;
  totedge: number;
  totpoly: number;
  totloop: number;
  totcol: number;
  mat: bigint;
  polyOffsets: bigint;
  attributes: bigint;
  attributesNum: number;
}

function readMeshHead(reader: BlendReader, offset: number): MeshPointers {
  const get = (base: string): number => offset + reader.member("Mesh", base).offset;
  const i32at = (base: string): number => reader.i32(get(base));
  return {
    offset,
    name: readIdName(reader, offset),
    totvert: i32at("totvert"),
    totedge: i32at("totedge"),
    totpoly: i32at("totpoly"),
    totloop: i32at("totloop"),
    totcol: i32at("totcol"),
    mat: reader.u64(get("mat")),
    polyOffsets: reader.u64(get("poly_offset_indices")),
    attributes: reader.u64(
      get("attribute_storage") + reader.member("AttributeStorage", "dna_attributes").offset,
    ),
    attributesNum: reader.i32(
      get("attribute_storage") + reader.member("AttributeStorage", "dna_attributes_num").offset,
    ),
  };
}

interface MeshAttribute {
  name: string;
  dataType: number;
  domain: number;
  data: bigint;
}

function readAttributes(reader: BlendReader, head: MeshPointers): MeshAttribute[] {
  const out: MeshAttribute[] = [];
  if (head.attributes === 0n) {
    return out;
  }
  const holders = reader.blocksWithOld(head.attributes);
  if (holders.length === 0) {
    throw new GnumarusBlendError("Truncated .blend mesh attributes.");
  }
  const holder = holders[0] as BlendBlock;
  const nameMember = reader.member("Attribute", "name");
  const typeMember = reader.member("Attribute", "data_type");
  const domainMember = reader.member("Attribute", "domain");
  const dataMember = reader.member("Attribute", "data");
  const stride = reader.structSize("Attribute");
  for (let i = 0; i < head.attributesNum; i += 1) {
    const base = holder.offset + i * stride;
    const namePtr = reader.u64(base + nameMember.offset);
    const dataType = reader.i16(base + typeMember.offset);
    const domain = reader.u8(base + domainMember.offset);
    const dataPtr = reader.u64(base + dataMember.offset);
    let name = "";
    const nameBlocks = reader.blocksWithOld(namePtr);
    if (nameBlocks.length > 0) {
      const block = nameBlocks[0] as BlendBlock;
      name = reader.readString(block.offset, Math.max(1, block.len));
    }
    out.push({ name, dataType, domain, data: dataPtr });
  }
  return out;
}

function payloadBytes(reader: BlendReader, dataPtr: bigint, byteLength: number): Uint8Array {
  const holders = reader.blocksWithOld(dataPtr);
  if (holders.length === 0) {
    throw new GnumarusBlendError("Truncated .blend attribute payload.");
  }
  const holder = holders[0] as BlendBlock;
  // Payload may live behind an AttributeArray wrapper (the data pointer is
  // its first member); detect by struct name, not by size, and unwrap once.
  const holderStruct = reader.structs[holder.sdna];
  if (holderStruct !== undefined && holderStruct.name === "AttributeArray" && holder.len === holderStruct.size) {
    const inner = reader.u64(holder.offset);
    const innerHolders = reader.blocksWithOld(inner);
    if (innerHolders.length === 0) {
      throw new GnumarusBlendError("Truncated .blend attribute payload.");
    }
    const innerHolder = innerHolders[0] as BlendBlock;
    if (innerHolder.len < byteLength) {
      throw new GnumarusBlendError("Truncated .blend attribute payload.");
    }
    return reader.bytes.slice(innerHolder.offset, innerHolder.offset + byteLength);
  }
  if (holder.len < byteLength) {
    throw new GnumarusBlendError("Truncated .blend attribute payload.");
  }
  return reader.bytes.slice(holder.offset, holder.offset + byteLength);
}

function decodeImageBytes(bytes: Uint8Array): { mime: "image/png" | "image/jpeg"; bytes: Uint8Array } | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return { mime: "image/png", bytes };
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: "image/jpeg", bytes };
  }
  return null;
}

function readPackedImage(reader: BlendReader, imageOffset: number, images: GnumarusBlendImage[], skipped: string[]): number | null {
  const packedMember = reader.layout("Image").find((member) => member.base === "packedfile");
  if (packedMember === undefined) {
    return null;
  }
  const packedPtr = reader.u64(imageOffset + packedMember.offset);
  if (packedPtr === 0n) {
    return null;
  }
  const packedBlocks = reader.blocksWithOld(packedPtr);
  if (packedBlocks.length === 0) {
    skipped.push("image with missing packed data");
    return null;
  }
  const packed = packedBlocks[0] as BlendBlock;
  const sizeMember = reader.member("PackedFile", "size");
  const dataMember = reader.member("PackedFile", "data");
  const size = reader.i32(packed.offset + sizeMember.offset);
  const dataPtr = reader.u64(packed.offset + dataMember.offset);
  if (size <= 0) {
    return null;
  }
  const dataBlocks = reader.blocksWithOld(dataPtr);
  if (dataBlocks.length === 0) {
    skipped.push("image with missing packed data");
    return null;
  }
  const dataBlock = dataBlocks[0] as BlendBlock;
  if (dataBlock.len < size) {
    throw new GnumarusBlendError("Truncated .blend packed image.");
  }
  const bytes = reader.bytes.slice(dataBlock.offset, dataBlock.offset + size);
  const decoded = decodeImageBytes(bytes);
  if (decoded === null) {
    skipped.push("packed image with unsupported encoding (only PNG/JPEG)");
    return null;
  }
  images.push({ name: `Image${images.length + 1}`, mime: decoded.mime, bytes: decoded.bytes });
  return images.length - 1;
}

function readNodeTexture(
  reader: BlendReader,
  materialOffset: number,
  images: GnumarusBlendImage[],
  skipped: string[],
): number | null {
  let nodetree: bigint;
  try {
    nodetree = reader.u64(materialOffset + reader.member("Material", "nodetree").offset);
  } catch {
    return null;
  }
  if (nodetree === 0n) {
    return null;
  }
  const treeBlocks = reader.blocksWithOld(nodetree);
  if (treeBlocks.length === 0) {
    return null;
  }
  const tree = treeBlocks[0] as BlendBlock;
  const nodesMember = reader.layout("bNodeTree").find((member) => member.base === "nodes");
  if (nodesMember === undefined) {
    return null;
  }
  // ListBase: first pointer at +0.
  let nodePtr: bigint = reader.u64(tree.offset + nodesMember.offset);
  const seen = new Set<bigint>();
  while (nodePtr !== 0n) {
    if (seen.has(nodePtr)) {
      break;
    }
    seen.add(nodePtr);
    const nodeBlocks = reader.blocksWithOld(nodePtr);
    if (nodeBlocks.length === 0) {
      break;
    }
    const node = nodeBlocks[0] as BlendBlock;
    const idname = reader.readString(node.offset + reader.member("bNode", "idname").offset, 64);
    if (idname === "ShaderNodeTexImage") {
      const idMember = reader.member("bNode", "id");
      const imagePtr: bigint = reader.u64(node.offset + idMember.offset);
      const imageBlocks = reader.blocksWithOld(imagePtr);
      if (imageBlocks.length > 0) {
        const index = readPackedImage(reader, (imageBlocks[0] as BlendBlock).offset, images, skipped);
        if (index !== null) {
          return index;
        }
      }
      return null;
    }
    const nextMember = reader.layout("bNode").find((member) => member.base === "next");
    if (nextMember === undefined) {
      break;
    }
    nodePtr = reader.u64(node.offset + nextMember.offset);
  }
  return null;
}

function normalizeColorBytes(r: number, g: number, b: number): [number, number, number] {
  const clamp = (v: number): number => Math.min(1, Math.max(0, v));
  return [clamp(r), clamp(g), clamp(b)];
}

/**
 * Parse a .blend file (Blender 5.x, uncompressed, little-endian) into meshes,
 * lights and packed textures. Throws GnumarusBlendError with a clear reason.
 */
export function parseBlendFile(bytes: Uint8Array): GnumarusBlendDocument {
  const reader = new BlendReader(bytes);
  reader.readBlocks();
  reader.readSdna();
  const skipped: string[] = [];
  const images: GnumarusBlendImage[] = [];
  const meshes: GnumarusBlendMesh[] = [];
  const lights: GnumarusBlendLight[] = [];

  const scenes = reader.blocks.filter((block) => block.code === "SC");
  if (scenes.length === 0) {
    throw new GnumarusBlendError("Blender file has no scene.");
  }
  // Blender 5 writes Scene.base empty on disk (objects live in collections);
  // walk every OB block instead so real files import. Scene presence is still
  // required so non-scene files are rejected with a clear message.
  const seenObjects = new Set<bigint>();
  for (const objectBlock of reader.blocks.filter((block) => block.code === "OB")) {
    if (seenObjects.has(objectBlock.old)) {
      continue;
    }
    seenObjects.add(objectBlock.old);
    const object = readObject(reader, objectBlock.offset);
    const parentMember = reader.member("Object", "parent");
    if (reader.u64(objectBlock.offset + parentMember.offset) !== 0n) {
      skipped.push(`parented object "${object.name}" (parents are ignored)`);
      continue;
    }
    if (object.type === 1) {
      const mesh = readMesh(reader, object, images, skipped);
      if (mesh !== null) {
        meshes.push(mesh);
      }
    } else if (object.type === 10) {
      const light = readLamp(reader, object);
      if (light !== null) {
        lights.push(light);
      }
    } else {
      skipped.push(`object "${object.name}" (only meshes and lights are imported)`);
    }
  }
  return { meshes, images, lights, skipped };
}

function readMesh(
  reader: BlendReader,
  object: BlendObject,
  images: GnumarusBlendImage[],
  skipped: string[],
): GnumarusBlendMesh | null {
  const meshBlocks = reader.blocksWithOld(object.data);
  if (meshBlocks.length === 0) {
    skipped.push(`mesh "${object.name}" (missing mesh data)`);
    return null;
  }
  const mesh = meshBlocks[0] as BlendBlock;
  const head = readMeshHead(reader, mesh.offset);
  if (head.totvert < 1 || head.totloop < 1 || head.totpoly < 1) {
    skipped.push(`mesh "${object.name}" (empty mesh)`);
    return null;
  }
  const attributes = readAttributes(reader, head);
  const positions = readPositions(reader, attributes, head, object.name, skipped);
  if (positions === null) {
    return null;
  }
  const corners = readCorners(reader, attributes, head, object.name, skipped);
  if (corners === null) {
    return null;
  }
  const uvs = readLayerFloats(reader, attributes, head, 6, 2);
  const colors = readLayerColors(reader, attributes, head);
  const materialIndex = readLayerInts(reader, attributes, "material_index", head.totpoly);
  const { indices, triMaterials } = triangulate(head, corners.offsets, materialIndex);
  // Smooth normals averaged per shared vertex, then expanded per corner.
  const vertNormals = smoothNormals(positions, corners.verts, indices);
  const cornerCount = corners.verts.length;
  const cornerPositions = new Float32Array(cornerCount * 3);
  const cornerNormals = new Float32Array(cornerCount * 3);
  for (let corner = 0; corner < cornerCount; corner += 1) {
    const vert = corners.verts[corner] as number;
    cornerPositions[corner * 3] = positions[vert * 3] as number;
    cornerPositions[corner * 3 + 1] = positions[vert * 3 + 1] as number;
    cornerPositions[corner * 3 + 2] = positions[vert * 3 + 2] as number;
    cornerNormals[corner * 3] = vertNormals[vert * 3] as number;
    cornerNormals[corner * 3 + 1] = vertNormals[vert * 3 + 1] as number;
    cornerNormals[corner * 3 + 2] = vertNormals[vert * 3 + 2] as number;
  }
  const materials: Array<{ name: string; texture: number | null; baseColor: [number, number, number, number] }> = [];
  if (head.totcol > 0 && head.mat !== 0n) {
    for (let slot = 0; slot < head.totcol; slot += 1) {
      const material = readMaterialSlot(reader, head, slot, images, skipped);
      materials.push(material);
    }
  }
  if (materials.length === 0) {
    materials.push({ name: "Material", texture: null, baseColor: [1, 1, 1, 1] });
  }
  return {
    name: object.name,
    matrix: objectMatrix(object),
    positions: cornerPositions,
    normals: cornerNormals,
    uvs,
    colors,
    indices,
    triMaterials,
    materials,
  };
}

interface CornersData {
  verts: Uint32Array;
  edges: Uint32Array;
  offsets: Uint32Array;
}

function readPositions(
  reader: BlendReader,
  attributes: MeshAttribute[],
  head: MeshPointers,
  objectName: string,
  skipped: string[],
): Float32Array | null {
  const found = attributes.find((attr) => attr.name === "position" && attr.dataType === 7);
  if (found === undefined) {
    skipped.push(`mesh "${objectName}" (no position attribute)`);
    return null;
  }
  const bytes = payloadBytes(reader, found.data, head.totvert * 12);
  const out = new Float32Array(head.totvert * 3);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.length);
  for (let i = 0; i < head.totvert; i += 1) {
    out[i * 3] = view.getFloat32(i * 12, true);
    out[i * 3 + 1] = view.getFloat32(i * 12 + 4, true);
    out[i * 3 + 2] = view.getFloat32(i * 12 + 8, true);
  }
  return out;
}

function readCorners(
  reader: BlendReader,
  attributes: MeshAttribute[],
  head: MeshPointers,
  objectName: string,
  skipped: string[],
): CornersData | null {
  const findInts = (name: string): Uint32Array | null => {
    const found = attributes.find((attr) => attr.name === name && attr.dataType === 3);
    if (found === undefined) {
      return null;
    }
    const count = name === ".edge_verts" ? head.totedge * 2 : name === "material_index" ? head.totpoly : head.totloop;
    const bytes = payloadBytes(reader, found.data, count * 4);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.length);
    const out = new Uint32Array(count);
    for (let i = 0; i < count; i += 1) {
      const value = view.getInt32(i * 4, true);
      out[i] = value < 0 ? 0 : value;
    }
    return out;
  };
  const verts = findInts(".corner_vert");
  const edges = findInts(".corner_edge");
  if (verts === null || edges === null) {
    skipped.push(`mesh "${objectName}" (missing corner topology)`);
    return null;
  }
  for (let i = 0; i < verts.length; i += 1) {
    if ((verts[i] as number) >= head.totvert) {
      throw new GnumarusBlendError(`Corrupt .blend mesh "${objectName}" (corner references out-of-range vertex).`);
    }
  }
  const offsets = readIntArrayFromOld(reader, head.polyOffsets, head.totpoly + 1, "face offsets");
  for (let i = 0; i < head.totpoly; i += 1) {
    const start = offsets[i] as number;
    const end = offsets[i + 1] as number;
    if (start < 0 || end < start || end > head.totloop) {
      throw new GnumarusBlendError(`Corrupt .blend mesh "${objectName}" (face offsets out of range).`);
    }
  }
  return { verts, edges, offsets: Uint32Array.from(offsets.slice(0, head.totpoly + 1)) };
}

function readLayerFloats(
  reader: BlendReader,
  attributes: MeshAttribute[],
  head: MeshPointers,
  dataType: number,
  components: number,
): Float32Array | null {
  const found = attributes.find((attr) => attr.dataType === dataType && attr.domain === 3);
  if (found === undefined) {
    return null;
  }
  const bytes = payloadBytes(reader, found.data, head.totloop * components * 4);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.length);
  const out = new Float32Array(head.totloop * components);
  for (let i = 0; i < head.totloop * components; i += 1) {
    out[i] = view.getFloat32(i * 4, true);
  }
  return out;
}

function readLayerColors(
  reader: BlendReader,
  attributes: MeshAttribute[],
  head: MeshPointers,
): Float32Array | null {
  const byteLayer = attributes.find((attr) => attr.dataType === 9);
  if (byteLayer !== undefined) {
    const count = byteLayer.domain === 3 ? head.totloop : head.totvert;
    const bytes = payloadBytes(reader, byteLayer.data, count * 4);
    const out = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const base = i * 4;
      out[i * 3] = (bytes[base] as number) / 255;
      out[i * 3 + 1] = (bytes[base + 1] as number) / 255;
      out[i * 3 + 2] = (bytes[base + 2] as number) / 255;
    }
    if (byteLayer.domain !== 3) {
      return expandPerCorner(out, 3, readCornerVerts(reader, attributes, head));
    }
    return out;
  }
  const floatLayer = attributes.find((attr) => attr.dataType === 10);
  if (floatLayer !== undefined) {
    const count = floatLayer.domain === 3 ? head.totloop : head.totvert;
    const bytes = payloadBytes(reader, floatLayer.data, count * 16);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.length);
    const out = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      out[i * 3] = view.getFloat32(i * 16, true);
      out[i * 3 + 1] = view.getFloat32(i * 16 + 4, true);
      out[i * 3 + 2] = view.getFloat32(i * 16 + 8, true);
    }
    if (floatLayer.domain !== 3) {
      return expandPerCorner(out, 3, readCornerVerts(reader, attributes, head));
    }
    return out;
  }
  return null;
}

function readCornerVerts(reader: BlendReader, attributes: MeshAttribute[], head: MeshPointers): Uint32Array {
  const found = attributes.find((attr) => attr.name === ".corner_vert");
  if (found === undefined) {
    return new Uint32Array(head.totloop);
  }
  const bytes = payloadBytes(reader, found.data, head.totloop * 4);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.length);
  const out = new Uint32Array(head.totloop);
  for (let i = 0; i < head.totloop; i += 1) {
    const value = view.getInt32(i * 4, true);
    out[i] = value < 0 ? 0 : value;
  }
  return out;
}

function expandPerCorner(values: Float32Array, components: number, corners: Uint32Array): Float32Array {
  const out = new Float32Array(corners.length * components);
  for (let i = 0; i < corners.length; i += 1) {
    const source = (corners[i] as number) * components;
    for (let c = 0; c < components; c += 1) {
      out[i * components + c] = values[source + c] as number;
    }
  }
  return out;
}

function readLayerInts(
  reader: BlendReader,
  attributes: MeshAttribute[],
  name: string,
  count: number,
): Uint32Array | null {
  const found = attributes.find((attr) => attr.name === name && attr.dataType === 3);
  if (found === undefined) {
    return null;
  }
  const bytes = payloadBytes(reader, found.data, count * 4);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.length);
  const out = new Uint32Array(count);
  for (let i = 0; i < count; i += 1) {
    const value = view.getInt32(i * 4, true);
    out[i] = value < 0 ? 0 : value;
  }
  return out;
}

function readColorMember(reader: BlendReader, offset: number, base: string): number {
  try {
    return reader.f32(offset + reader.member("Material", base).offset);
  } catch {
    return base === "a" ? 1 : 1;
  }
}

function readMaterialSlot(
  reader: BlendReader,
  head: MeshPointers,
  slot: number,
  images: GnumarusBlendImage[],
  skipped: string[],
): { name: string; texture: number | null; baseColor: [number, number, number, number] } {
  // `Material **mat`: array of totcol 64-bit pointers to Material blocks.
  const holders = reader.blocksWithOld(head.mat);
  if (holders.length === 0) {
    return { name: `Material${slot + 1}`, texture: null, baseColor: [1, 1, 1, 1] };
  }
  const holder = holders[0] as BlendBlock;
  if (holder.len < head.totcol * 8) {
    throw new GnumarusBlendError("Truncated .blend material slots.");
  }
  const materialPtr = reader.u64(holder.offset + slot * 8);
  const materialBlocks = reader.blocksWithOld(materialPtr);
  if (materialBlocks.length === 0) {
    return { name: `Material${slot + 1}`, texture: null, baseColor: [1, 1, 1, 1] };
  }
  const material = materialBlocks[0] as BlendBlock;
  let name = `Material${slot + 1}`;
  try {
    name = readIdName(reader, material.offset).slice(2) || name;
  } catch {
    // Keep the fallback name.
  }
  const clampChannel = (value: number): number => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 1);
  const baseColor: [number, number, number, number] = [
    clampChannel(readColorMember(reader, material.offset, "r")),
    clampChannel(readColorMember(reader, material.offset, "g")),
    clampChannel(readColorMember(reader, material.offset, "b")),
    1,
  ];
  const texture = readNodeTexture(reader, material.offset, images, skipped);
  return { name, texture, baseColor };
}

function triangulate(
  head: MeshPointers,
  offsets: Uint32Array,
  materialIndex: Uint32Array | null,
): { indices: Uint32Array; triMaterials: Uint16Array } {
  const indices: number[] = [];
  const triMaterials: number[] = [];
  const slots = Math.max(1, head.totcol);
  for (let face = 0; face < head.totpoly; face += 1) {
    const start = offsets[face] as number;
    const end = offsets[face + 1] as number;
    const count = end - start;
    if (count < 3) {
      continue;
    }
    const slot = materialIndex === null ? 0 : Math.min(slots - 1, materialIndex[face] as number);
    for (let i = 1; i + 1 < count; i += 1) {
      indices.push(start, start + i, start + i + 1);
      triMaterials.push(slot);
    }
  }
  return { indices: Uint32Array.from(indices), triMaterials: Uint16Array.from(triMaterials) };
}

function smoothNormals(positions: Float32Array, cornerVerts: Uint32Array, indices: Uint32Array): Float32Array {
  const vertCount = positions.length / 3;
  const normals = new Float32Array(positions.length);
  const counts = new Float32Array(vertCount);
  for (let t = 0; t < indices.length; t += 3) {
    const va = cornerVerts[indices[t] as number] as number;
    const vb = cornerVerts[indices[t + 1] as number] as number;
    const vc = cornerVerts[indices[t + 2] as number] as number;
    const a = va * 3;
    const b = vb * 3;
    const c = vc * 3;
    const abx = (positions[b] as number) - (positions[a] as number);
    const aby = (positions[b + 1] as number) - (positions[a + 1] as number);
    const abz = (positions[b + 2] as number) - (positions[a + 2] as number);
    const acx = (positions[c] as number) - (positions[a] as number);
    const acy = (positions[c + 1] as number) - (positions[a + 1] as number);
    const acz = (positions[c + 2] as number) - (positions[a + 2] as number);
    let nx = aby * acz - abz * acy;
    let ny = abz * acx - abx * acz;
    let nz = abx * acy - aby * acx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len;
    ny /= len;
    nz /= len;
    for (const corner of [t, t + 1, t + 2]) {
      const vert = cornerVerts[(indices[corner] as number)] as number;
      normals[vert * 3] = (normals[vert * 3] as number) + nx;
      normals[vert * 3 + 1] = (normals[vert * 3 + 1] as number) + ny;
      normals[vert * 3 + 2] = (normals[vert * 3 + 2] as number) + nz;
      counts[vert] = (counts[vert] as number) + 1;
    }
  }
  for (let v = 0; v < vertCount; v += 1) {
    if ((counts[v] as number) === 0) {
      normals[v * 3 + 2] = 1;
      continue;
    }
    const len = Math.hypot(normals[v * 3] as number, normals[v * 3 + 1] as number, normals[v * 3 + 2] as number) || 1;
    normals[v * 3] = (normals[v * 3] as number) / len;
    normals[v * 3 + 1] = (normals[v * 3 + 1] as number) / len;
    normals[v * 3 + 2] = (normals[v * 3 + 2] as number) / len;
  }
  return normals;
}

function readLamp(reader: BlendReader, object: BlendObject): GnumarusBlendLight | null {
  const lampBlocks = reader.blocksWithOld(object.data);
  if (lampBlocks.length === 0) {
    return null;
  }
  const lamp = lampBlocks[0] as BlendBlock;
  // Blender 5.4 renamed Lamp -> Light; resolve either struct name via SDNA.
  let structName = "Lamp";
  try {
    reader.layout("Lamp");
  } catch {
    try {
      reader.layout("Light");
      structName = "Light";
    } catch {
      return null;
    }
  }
  const tryFloat = (bases: string[], fallback: number): number => {
    for (const base of bases) {
      try {
        return reader.f32(lamp.offset + reader.member(structName, base).offset);
      } catch {
        continue;
      }
    }
    return fallback;
  };
  const tryI16 = (bases: string[], fallback: number): number => {
    for (const base of bases) {
      try {
        return reader.i16(lamp.offset + reader.member(structName, base).offset);
      } catch {
        continue;
      }
    }
    return fallback;
  };
  const get = (base: string): number => lamp.offset + reader.member(structName, base).offset;
  void get;
  const type = tryI16(["type"], 0);
  const energyNew = tryFloat(["energy_new", "energy"], 0);
  const energyLegacy = tryFloat(["energy"], 0);
  const energy = energyNew !== 0 ? energyNew : energyLegacy;
  const r = tryFloat(["r"], 1);
  const g = tryFloat(["g"], 1);
  const b = tryFloat(["b"], 1);
  const kind = type === 1 ? "sun" : type === 2 ? "spot" : type === 4 ? "area" : "point";
  let spotSize = 0;
  let spotBlend = 0;
  if (kind === "spot") {
    spotSize = tryFloat(["spotsize", "spot_size"], 0);
    spotBlend = tryFloat(["spotblend", "spot_blend"], 0);
  }
  let areaSize = 0;
  let areaSizeY = 0;
  if (kind === "area") {
    areaSize = tryFloat(["area_size", "size"], 0);
    areaSizeY = tryFloat(["area_sizey", "area_size_y", "size_y"], areaSize);
  }
  const kinds: Record<string, "point" | "sun" | "spot" | "area"> = { point: "point", sun: "sun", spot: "spot", area: "area" };
  const [cr, cg, cb] = normalizeColorBytes(r, g, b);
  return {
    name: object.name,
    kind: kinds[kind] as "point" | "sun" | "spot" | "area",
    color: [cr, cg, cb],
    energy,
    matrix: objectMatrix(object),
    spotSize,
    spotBlend,
    areaSize,
    areaSizeY: areaSizeY === 0 ? areaSize : areaSizeY,
  };
}
