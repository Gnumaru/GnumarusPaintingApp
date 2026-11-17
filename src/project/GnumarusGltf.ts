/**
 * Minimal in-memory glTF 2.0 (binary .glb) synthesizer for Blender imports.
 * Converts extracted meshes (Blender Z-up space) to Y-up glTF with smooth
 * normals, optional UVs and vertex colors, per-material primitives, embedded
 * PNG/JPEG textures and KHR_lights_punctual lights. No dependency; the
 * output is decoded by three.js GLTFLoader like any other model file.
 */

export interface GnumarusGltfMeshInput {
  name: string;
  /** Column-major 4x4 object matrix (Blender space). */
  matrix: number[];
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array | null;
  colors: Float32Array | null;
  indices: Uint32Array;
  /** Global material index per triangle. */
  triMaterials: Uint16Array;
}

export interface GnumarusGltfMaterialInput {
  name: string;
  baseColorFactor: [number, number, number, number];
  baseColorTexture?: number;
}

export interface GnumarusGltfImageInput {
  mime: "image/png" | "image/jpeg";
  bytes: Uint8Array;
}

export interface GnumarusGltfLightInput {
  name: string;
  kind: "point" | "spot" | "directional";
  color: [number, number, number];
  intensity: number;
  matrix: number[];
  range?: number;
  innerConeAngle?: number;
  outerConeAngle?: number;
}

export interface GnumarusGltfSceneInput {
  meshes: GnumarusGltfMeshInput[];
  materials: GnumarusGltfMaterialInput[];
  images: GnumarusGltfImageInput[];
  lights: GnumarusGltfLightInput[];
}

/** Blender Z-up to glTF Y-up point mapping: (x, y, z) -> (x, z, -y). */
export function convertBlenderToGltfPosition(point: readonly [number, number, number]): [number, number, number] {
  return [point[0] as number, point[2] as number, -(point[1] as number)];
}

function mulMat4(a: readonly number[], b: readonly number[]): number[] {
  const out = new Array<number>(16).fill(0);
  for (let col = 0; col < 4; col += 1) {
    for (let row = 0; row < 4; row += 1) {
      out[col * 4 + row] =
        (a[0 * 4 + row] as number) * (b[col * 4 + 0] as number) +
        (a[1 * 4 + row] as number) * (b[col * 4 + 1] as number) +
        (a[2 * 4 + row] as number) * (b[col * 4 + 2] as number) +
        (a[3 * 4 + row] as number) * (b[col * 4 + 3] as number);
    }
  }
  return out;
}

/** Convert a Blender column-major matrix to Y-up glTF space (C * M * C^-1). */
export function convertBlenderToGltfMatrix(matrix: readonly number[]): number[] {
  // C: Blender Z-up -> glTF Y-up rotation (-90 deg about X).
  const basis = [1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1];
  const basisInverse = [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1];
  return mulMat4(mulMat4(basis, [...matrix]), basisInverse);
}

interface GltfBufferView {
  buffer: number;
  byteOffset: number;
  byteLength: number;
}

interface GltfAccessor {
  bufferView: number;
  componentType: number;
  count: number;
  type: string;
  min: number[];
  max: number[];
}

const COMPONENT_FLOAT = 5126;
const COMPONENT_UNSIGNED_INT = 5125;
const COMPONENT_UNSIGNED_SHORT = 5123;

class GlbBuilder {
  private readonly chunks: Uint8Array[] = [];
  private readonly bufferViews: GltfBufferView[] = [];
  private readonly accessors: GltfAccessor[] = [];
  private cursor = 0;

  viewOf(bytes: Uint8Array): number {
    const index = this.bufferViews.length;
    const padded = (bytes.length + 3) & ~3;
    const stored = new Uint8Array(padded);
    stored.set(bytes);
    this.chunks.push(stored);
    this.bufferViews.push({ buffer: 0, byteOffset: this.cursor, byteLength: bytes.length });
    this.cursor += padded;
    return index;
  }

  floats(values: Float32Array, type: string, components: number): number {
    const view = this.viewOf(new Uint8Array(values.buffer, values.byteOffset, values.byteLength));
    const min: number[] = [];
    const max: number[] = [];
    for (let c = 0; c < components; c += 1) {
      min.push(Number.POSITIVE_INFINITY);
      max.push(Number.NEGATIVE_INFINITY);
    }
    for (let i = 0; i < values.length / components; i += 1) {
      for (let c = 0; c < components; c += 1) {
        const value = values[i * components + c] as number;
        if (value < (min[c] as number)) {
          min[c] = value;
        }
        if (value > (max[c] as number)) {
          max[c] = value;
        }
      }
    }
    const index = this.accessors.length;
    this.accessors.push({ bufferView: view, componentType: COMPONENT_FLOAT, count: values.length / components, type, min, max });
    return index;
  }

  indices(values: Uint32Array): number {
    let componentType = COMPONENT_UNSIGNED_INT;
    let raw: Uint8Array = new Uint8Array(values.buffer, values.byteOffset, values.byteLength);
    let max = 0;
    for (let i = 0; i < values.length; i += 1) {
      if ((values[i] as number) > max) {
        max = values[i] as number;
      }
    }
    if (max < 65536) {
      componentType = COMPONENT_UNSIGNED_SHORT;
      const narrow = new Uint16Array(values.length);
      for (let i = 0; i < values.length; i += 1) {
        narrow[i] = values[i] as number;
      }
      raw = new Uint8Array(narrow.buffer);
    }
    const view = this.viewOf(raw);
    const index = this.accessors.length;
    this.accessors.push({ bufferView: view, componentType, count: values.length, type: "SCALAR", min: [0], max: [max] });
    return index;
  }

  finish(json: Record<string, unknown>): Uint8Array {
    let binLength = 0;
    for (const chunk of this.chunks) {
      binLength += chunk.length;
    }
    if (binLength > 0) {
      json["buffers"] = [{ byteLength: binLength }];
    }
    if (this.bufferViews.length > 0) {
      json["bufferViews"] = this.bufferViews;
    }
    if (this.accessors.length > 0) {
      json["accessors"] = this.accessors;
    }
    const jsonText = JSON.stringify(json);
    const jsonBytes = new TextEncoder().encode(jsonText);
    const jsonPadded = (jsonBytes.length + 3) & ~3;
    const jsonChunk = new Uint8Array(jsonPadded);
    jsonChunk.set(jsonBytes);
    jsonChunk.fill(0x20, jsonBytes.length);
    const binChunk = new Uint8Array(binLength);
    let binOffset = 0;
    for (const chunk of this.chunks) {
      binChunk.set(chunk, binOffset);
      binOffset += chunk.length;
    }
    const totalLength = 12 + 8 + jsonChunk.length + (binLength > 0 ? 8 + binLength : 0);
    const out = new Uint8Array(totalLength);
    const view = new DataView(out.buffer);
    out[0] = 0x67;
    out[1] = 0x6c;
    out[2] = 0x54;
    out[3] = 0x46;
    view.setUint32(4, 2, true);
    view.setUint32(8, totalLength, true);
    view.setUint32(12, jsonChunk.length, true);
    view.setUint32(16, 0x4e4f534a, true);
    out.set(jsonChunk, 20);
    if (binLength > 0) {
      const base = 20 + jsonChunk.length;
      view.setUint32(base, binLength, true);
      view.setUint32(base + 4, 0x004e4942, true);
      out.set(binChunk, base + 8);
    }
    return out;
  }
}

/**
 * Area lights have no glTF representation; the converter keeps them as
 * point lights (documented approximation) instead of dropping the light.
 */
export function convertBlendLightKind(kind: string): "point" | "spot" | "directional" {
  if (kind === "spot") {
    return "spot";
  }
  if (kind === "sun" || kind === "directional") {
    return "directional";
  }
  return "point";
}

export function encodeGlbScene(scene: GnumarusGltfSceneInput): Uint8Array {
  const builder = new GlbBuilder();
  const images = scene.images.map((image) => ({ bufferView: builder.viewOf(image.bytes), mimeType: image.mime }));
  const textures = scene.images.map((_, index) => ({ source: index }));
  const materials = scene.materials.map((material) => {
    const pbr: Record<string, unknown> = {
      metallicFactor: 0,
      roughnessFactor: 0.9,
      baseColorFactor: [...material.baseColorFactor],
    };
    if (material.baseColorTexture !== undefined) {
      pbr["baseColorTexture"] = { index: material.baseColorTexture };
    }
    return { name: material.name, pbrMetallicRoughness: pbr };
  });
  const meshes: Array<Record<string, unknown>> = [];
  const nodes: Array<Record<string, unknown>> = [];
  for (const mesh of scene.meshes) {
    const positions = new Float32Array(mesh.positions.length);
    const normals = new Float32Array(mesh.normals.length);
    for (let i = 0; i < mesh.positions.length / 3; i += 1) {
      const converted = convertBlenderToGltfPosition([
        mesh.positions[i * 3] as number,
        mesh.positions[i * 3 + 1] as number,
        mesh.positions[i * 3 + 2] as number,
      ]);
      positions[i * 3] = converted[0];
      positions[i * 3 + 1] = converted[1];
      positions[i * 3 + 2] = converted[2];
      const normal = convertBlenderToGltfPosition([
        mesh.normals[i * 3] as number,
        mesh.normals[i * 3 + 1] as number,
        mesh.normals[i * 3 + 2] as number,
      ]);
      normals[i * 3] = normal[0];
      normals[i * 3 + 1] = normal[1];
      normals[i * 3 + 2] = normal[2];
    }
    let uvs: Float32Array | null = null;
    if (mesh.uvs !== null) {
      uvs = new Float32Array(mesh.uvs.length);
      for (let i = 0; i < mesh.uvs.length / 2; i += 1) {
        uvs[i * 2] = mesh.uvs[i * 2] as number;
        uvs[i * 2 + 1] = 1 - (mesh.uvs[i * 2 + 1] as number);
      }
    }
    const positionAccessor = builder.floats(positions, "VEC3", 3);
    const normalAccessor = builder.floats(normals, "VEC3", 3);
    const uvAccessor = uvs === null ? null : builder.floats(uvs, "VEC2", 2);
    const colorAccessor = mesh.colors === null ? null : builder.floats(mesh.colors, "VEC3", 3);
    const byMaterial = new Map<number, number[]>();
    for (let t = 0; t < mesh.triMaterials.length; t += 1) {
      const slot = mesh.triMaterials[t] as number;
      if (!byMaterial.has(slot)) {
        byMaterial.set(slot, []);
      }
      (byMaterial.get(slot) as number[]).push(
        mesh.indices[t * 3] as number,
        mesh.indices[t * 3 + 1] as number,
        mesh.indices[t * 3 + 2] as number,
      );
    }
    const primitives: Array<Record<string, unknown>> = [];
    for (const slot of [...byMaterial.keys()].sort((a, b) => a - b)) {
      const group = new Uint32Array(byMaterial.get(slot) as number[]);
      if (group.length === 0) {
        continue;
      }
      const attributes: Record<string, number> = { POSITION: positionAccessor, NORMAL: normalAccessor };
      if (uvAccessor !== null) {
        attributes["TEXCOORD_0"] = uvAccessor;
      }
      if (colorAccessor !== null) {
        attributes["COLOR_0"] = colorAccessor;
      }
      primitives.push({ attributes, indices: builder.indices(group), material: slot, mode: 4 });
    }
    if (primitives.length === 0) {
      continue;
    }
    const meshIndex = meshes.length;
    meshes.push({ name: mesh.name, primitives });
    nodes.push({ name: mesh.name, matrix: convertBlenderToGltfMatrix(mesh.matrix), mesh: meshIndex });
  }
  const lights: Array<Record<string, unknown>> = [];
  for (const light of scene.lights) {
    const entry: Record<string, unknown> = {
      name: light.name,
      color: [...light.color],
      intensity: light.intensity,
      type: light.kind,
    };
    if (light.kind === "spot") {
      if (light.range !== undefined) {
        entry["range"] = light.range;
      }
      entry["spot"] = { innerConeAngle: light.innerConeAngle ?? 0, outerConeAngle: light.outerConeAngle ?? Math.PI / 4 };
    }
    if (light.kind === "point" && light.range !== undefined) {
      entry["range"] = light.range;
    }
    const lightIndex = lights.length;
    lights.push(entry);
    nodes.push({
      name: light.name,
      matrix: convertBlenderToGltfMatrix(light.matrix),
      extensions: { KHR_lights_punctual: { light: lightIndex } },
    });
  }
  const json: Record<string, unknown> = {
    asset: { version: "2.0", generator: "GnumarusBlend" },
    scene: 0,
    scenes: [{ nodes: nodes.map((_, index) => index) }],
    nodes,
    meshes,
  };
  if (images.length > 0) {
    json["images"] = images;
    json["textures"] = textures;
  }
  if (materials.length > 0) {
    json["materials"] = materials;
  }
  if (lights.length > 0) {
    json["extensionsUsed"] = ["KHR_lights_punctual"];
    json["extensions"] = { KHR_lights_punctual: { lights } };
  }
  return builder.finish(json);
}

/**
 * Bridge a parsed .blend document to glTF scene input: global material list
 * (deduped by name), per-triangle global material indices, area lights kept
 * as point lights, spot cone angles from Blender's full-angle spot size.
 */
export function convertBlendDocument(doc: {
  meshes: Array<{
    name: string;
    matrix: number[];
    positions: Float32Array;
    normals: Float32Array;
    uvs: Float32Array | null;
    colors: Float32Array | null;
    indices: Uint32Array;
    triMaterials: Uint16Array;
    materials: Array<{ name: string; texture: number | null; baseColor: [number, number, number, number] }>;
  }>;
  images: Array<{ mime: "image/png" | "image/jpeg"; bytes: Uint8Array }>;
  lights: Array<{
    name: string;
    kind: "point" | "sun" | "spot" | "area";
    color: [number, number, number];
    energy: number;
    matrix: number[];
    spotSize: number;
    spotBlend: number;
  }>;
}): GnumarusGltfSceneInput {
  const materials: GnumarusGltfMaterialInput[] = [];
  const materialIndex = new Map<string, number>();
  const meshes: GnumarusGltfMeshInput[] = [];
  for (const mesh of doc.meshes) {
    const remapped = new Uint16Array(mesh.triMaterials.length);
    const slotToGlobal = new Map<number, number>();
    mesh.materials.forEach((material, slot) => {
      let global = materialIndex.get(material.name);
      if (global === undefined) {
        global = materials.length;
        materialIndex.set(material.name, global);
        materials.push({
          name: material.name,
          baseColorFactor: [...material.baseColor] as [number, number, number, number],
          ...(material.texture === null ? {} : { baseColorTexture: material.texture }),
        });
      }
      slotToGlobal.set(slot, global);
    });
    if (slotToGlobal.size === 0) {
      slotToGlobal.set(0, 0);
      materials.push({ name: "Material", baseColorFactor: [1, 1, 1, 1] });
      materialIndex.set("Material", 0);
    }
    for (let t = 0; t < mesh.triMaterials.length; t += 1) {
      remapped[t] = slotToGlobal.get(mesh.triMaterials[t] as number) ?? 0;
    }
    meshes.push({
      name: mesh.name,
      matrix: [...mesh.matrix],
      positions: mesh.positions,
      normals: mesh.normals,
      uvs: mesh.uvs,
      colors: mesh.colors,
      indices: mesh.indices,
      triMaterials: remapped,
    });
  }
  const lights: GnumarusGltfLightInput[] = doc.lights.map((light) => {
    const kind = convertBlendLightKind(light.kind);
    const entry: GnumarusGltfLightInput = {
      name: light.name,
      kind,
      color: [...light.color],
      intensity: light.energy,
      matrix: [...light.matrix],
    };
    if (kind === "spot") {
      const outer = Math.max(0.01, (light.spotSize || Math.PI / 4) / 2);
      entry.outerConeAngle = Math.min(outer, Math.PI / 2 - 0.01);
      entry.innerConeAngle = entry.outerConeAngle * Math.max(0, 1 - light.spotBlend);
    }
    return entry;
  });
  return {
    meshes,
    materials,
    images: doc.images.map((image) => ({ mime: image.mime, bytes: image.bytes })),
    lights,
  };
}
