import { describe, expect, it } from "vitest";
import {
  convertBlendDocument,
  convertBlendLightKind,
  convertBlenderToGltfMatrix,
  convertBlenderToGltfPosition,
  encodeGlbScene,
} from "../src/project/GnumarusGltf";

function decodeGlb(json: Uint8Array): { json: Record<string, unknown>; binLength: number } {
  const view = new DataView(json.buffer, json.byteOffset, json.length);
  expect(json[0]).toBe(0x67);
  expect(json[1]).toBe(0x6c);
  expect(json[2]).toBe(0x54);
  expect(json[3]).toBe(0x46);
  expect(view.getUint32(4, true)).toBe(2);
  const jsonLen = view.getUint32(12, true);
  expect(view.getUint32(16, true)).toBe(0x4e4f534a);
  const text = new TextDecoder().decode(json.slice(20, 20 + jsonLen));
  const parsed = JSON.parse(text) as Record<string, unknown>;
  const total = view.getUint32(8, true);
  expect(total).toBe(json.length);
  let binLength = 0;
  if (total > 20 + jsonLen) {
    const base = 20 + jsonLen;
    binLength = view.getUint32(base, true);
    expect(view.getUint32(base + 4, true)).toBe(0x004e4942);
  }
  return { json: parsed, binLength };
}

describe("blender to gltf coordinate conversion", () => {
  it("maps points and identity matrices", () => {
    const origin = convertBlenderToGltfPosition([0, 0, 0]);
    expect(origin[0]).toBe(0);
    expect(origin[1]).toBe(0);
    expect(origin[2] === 0).toBe(true);
    expect(convertBlenderToGltfPosition([1, 2, 3])).toEqual([1, 3, -2]);
    const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    expect(convertBlenderToGltfMatrix(identity)).toEqual(identity);
  });

  it("maps light kinds with area as point", () => {
    expect(convertBlendLightKind("spot")).toBe("spot");
    expect(convertBlendLightKind("sun")).toBe("directional");
    expect(convertBlendLightKind("directional")).toBe("directional");
    expect(convertBlendLightKind("area")).toBe("point");
    expect(convertBlendLightKind("point")).toBe("point");
  });
});

describe("convertBlendDocument", () => {
  it("dedupes materials, remaps triangles, converts lights", () => {
    const doc = {
      meshes: [
        {
          name: "OBCube",
          matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
          positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
          normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
          uvs: new Float32Array([0, 0, 1, 0, 0, 1]),
          colors: null,
          indices: new Uint32Array([0, 1, 2]),
          triMaterials: new Uint16Array([1]),
          materials: [
            { name: "MatA", texture: null as number | null, baseColor: [1, 0, 0, 1] as [number, number, number, number] },
            { name: "MatB", texture: 0 as number | null, baseColor: [0, 1, 0, 1] as [number, number, number, number] },
          ],
        },
      ],
      images: [{ mime: "image/png" as const, bytes: new Uint8Array([1, 2, 3, 4]) }],
      lights: [
        { name: "Sun", kind: "sun" as const, color: [1, 1, 1] as [number, number, number], energy: 3, matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], spotSize: 0, spotBlend: 0 },
        { name: "Area", kind: "area" as const, color: [0, 0, 1] as [number, number, number], energy: 5, matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], spotSize: 0, spotBlend: 0 },
        { name: "Spot", kind: "spot" as const, color: [0, 1, 0] as [number, number, number], energy: 10, matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], spotSize: 0.9, spotBlend: 0.5 },
      ],
    };
    const scene = convertBlendDocument(doc);
    expect(scene.materials.map((m) => m.name)).toEqual(["MatA", "MatB"]);
    expect(scene.materials[1]?.baseColorTexture).toBe(0);
    expect(Array.from(scene.meshes[0]?.triMaterials as Uint16Array)).toEqual([1]);
    expect(scene.lights.map((l) => l.kind)).toEqual(["directional", "point", "spot"]);
    const spot = scene.lights[2];
    expect(spot?.outerConeAngle).toBeGreaterThan(0);
    expect(spot?.innerConeAngle).toBeLessThan(spot?.outerConeAngle as number);
  });
});

describe("encodeGlbScene", () => {
  it("writes a valid glb with one triangle, uv, color, texture and lights", () => {
    const scene = {
      meshes: [
        {
          name: "OBCube",
          matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 2, 3, 1],
          positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
          normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
          uvs: new Float32Array([0, 0, 1, 0, 0, 1]),
          colors: new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]),
          indices: new Uint32Array([0, 1, 2]),
          triMaterials: new Uint16Array([0]),
        },
      ],
      materials: [{ name: "Mat", baseColorFactor: [1, 1, 1, 1] as [number, number, number, number], baseColorTexture: 0 }],
      images: [{ mime: "image/png" as const, bytes: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]) }],
      lights: [
        { name: "Sun", kind: "directional" as const, color: [1, 1, 1] as [number, number, number], intensity: 3, matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] },
      ],
    };
    const glb = encodeGlbScene(scene);
    const { json, binLength } = decodeGlb(glb);
    expect(binLength).toBeGreaterThan(0);
    expect(json["asset"]).toMatchObject({ version: "2.0" });
    const meshes = json["meshes"] as Array<{ primitives: Array<Record<string, unknown>> }>;
    expect(meshes).toHaveLength(1);
    expect(meshes[0]?.primitives).toHaveLength(1);
    const attrs = meshes[0]?.primitives[0]?.["attributes"] as Record<string, number>;
    expect(attrs["POSITION"]).toBeDefined();
    expect(attrs["NORMAL"]).toBeDefined();
    expect(attrs["TEXCOORD_0"]).toBeDefined();
    expect(attrs["COLOR_0"]).toBeDefined();
    expect(json["images"]).toBeDefined();
    expect(json["textures"]).toBeDefined();
    expect(json["extensionsUsed"]).toEqual(["KHR_lights_punctual"]);
    const nodes = json["nodes"] as Array<Record<string, unknown>>;
    // Mesh node carries the converted translation (Blender (1,2,3) -> glTF (1,3,-2)).
    const meshNode = nodes[0] as { matrix: number[] };
    expect(meshNode.matrix[12]).toBe(1);
    expect(meshNode.matrix[13]).toBe(3);
    expect(meshNode.matrix[14]).toBe(-2);
    // Binary payload must be self-describing for three.js GLTFLoader.
    expect(json["buffers"]).toBeDefined();
    const bufferViews = json["bufferViews"] as Array<{ buffer: number }>;
    for (const view of bufferViews) {
      expect(view.buffer).toBe(0);
    }
  });

  it("splits primitives per material and omits empty sections", () => {
    const scene = {
      meshes: [
        {
          name: "M",
          matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
          positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 0, 1, 1]),
          normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]),
          uvs: null,
          colors: null,
          indices: new Uint32Array([0, 1, 2, 3, 4, 5]),
          triMaterials: new Uint16Array([0, 1]),
        },
      ],
      materials: [
        { name: "A", baseColorFactor: [1, 0, 0, 1] as [number, number, number, number] },
        { name: "B", baseColorFactor: [0, 1, 0, 1] as [number, number, number, number] },
      ],
      images: [],
      lights: [],
    };
    const glb = encodeGlbScene(scene);
    const { json } = decodeGlb(glb);
    const meshes = json["meshes"] as Array<{ primitives: Array<{ material: number }> }>;
    expect(meshes[0]?.primitives).toHaveLength(2);
    expect(meshes[0]?.primitives.map((p) => p.material).sort()).toEqual([0, 1]);
    expect(json["images"]).toBeUndefined();
    expect(json["extensionsUsed"]).toBeUndefined();
  });
});
