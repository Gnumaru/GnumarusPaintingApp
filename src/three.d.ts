/**
 * Minimal typed surface of the `three` package used by the MVP.
 * Kept local on purpose so v1 needs no extra `@types/*` dependency.
 * If the Three.js surface used by the app grows, replace this file
 * with the official `@types/three` package (requires approval).
 */
declare module "three" {
  export const NearestFilter: number;
  export const DoubleSide: number;
  export const NormalBlending: number;
  export const AdditiveBlending: number;
  export const CustomBlending: number;
  export const ZeroFactor: number;
  export const OneFactor: number;
  export const SrcColorFactor: number;
  export const OneMinusSrcColorFactor: number;
  export const DstColorFactor: number;
  export const SrcAlphaFactor: number;
  export const OneMinusSrcAlphaFactor: number;
  export const AddEquation: number;
  export const MinEquation: number;
  export const MaxEquation: number;

  export class Vector3 {
    x: number;
    y: number;
    z: number;
    constructor(x?: number, y?: number, z?: number);
    set(x: number, y: number, z: number): this;
    copy(source: Vector3): this;
    multiplyScalar(scalar: number): this;
    normalize(): this;
    setScalar(scalar: number): this;
  }

  export class Object3D {
    readonly position: Vector3;
    readonly scale: Vector3;
    readonly rotation: Vector3;
    add(object: Object3D): this;
    traverse(callback: (node: Object3D) => void): void;
  }

  export class Group extends Object3D {
    constructor();
  }

  export class Box3 {
    constructor();
    setFromObject(object: Object3D): this;
    getSize(target: Vector3): Vector3;
    getCenter(target: Vector3): Vector3;
  }

  export class Scene {
    add(object: Object3D): void;
    remove(object: Object3D): void;
  }

  export class OrthographicCamera {
    left: number;
    right: number;
    top: number;
    bottom: number;
    near: number;
    far: number;
    readonly position: Vector3;
    constructor(left: number, right: number, top: number, bottom: number, near: number, far: number);
    lookAt(x: number, y: number, z: number): void;
    updateProjectionMatrix(): void;
  }

  export class PerspectiveCamera {
    fov: number;
    aspect: number;
    near: number;
    far: number;
    readonly position: Vector3;
    constructor(fov: number, aspect: number, near: number, far: number);
    lookAt(x: number, y: number, z: number): void;
    updateProjectionMatrix(): void;
  }

  export class HemisphereLight extends Object3D {
    constructor(skyColor?: number, groundColor?: number, intensity?: number);
  }

  export class DirectionalLight extends Object3D {
    constructor(color?: number, intensity?: number);
  }

  export class Texture {
    dispose(): void;
  }

  export class Material {
    dispose(): void;
  }

  export class MeshStandardMaterial extends Material {
    constructor(options?: { color?: number; roughness?: number; metalness?: number; side?: number });
  }

  export const MathUtils: {
    degToRad(degrees: number): number;
  };

  export interface DataTextureImage {
    data: Uint8ClampedArray | Uint8Array;
    width: number;
    height: number;
  }

  export class DataTexture {
    image: DataTextureImage;
    magFilter: number;
    minFilter: number;
    generateMipmaps: boolean;
    flipY: boolean;
    needsUpdate: boolean;
    constructor(data: Uint8ClampedArray | Uint8Array, width: number, height: number);
    dispose(): void;
  }

  export class MeshBasicMaterial {
    constructor(options?: { map?: DataTexture; transparent?: boolean });
    dispose(): void;
  }

  export interface ShaderUniform {
    value: number | boolean | DataTexture | Vector3;
  }

  export class ShaderMaterial {
    readonly uniforms: Record<string, ShaderUniform>;
    blending: number;
    blendSrc: number;
    blendDst: number;
    blendEquation: number;
    blendSrcAlpha: number;
    blendDstAlpha: number;
    blendEquationAlpha: number;
    needsUpdate: boolean;
    constructor(options: {
      uniforms: Record<string, ShaderUniform>;
      vertexShader: string;
      fragmentShader: string;
      side?: number;
      transparent?: boolean;
      depthWrite?: boolean;
    });
    dispose(): void;
  }

  export class PlaneGeometry extends BufferGeometry {
    constructor(width: number, height: number);
  }

  export class Color {
    constructor(color?: number);
    getHexString(): string;
  }

  export class LineBasicMaterial {
    readonly color: Color;
    constructor(options?: { color?: number; transparent?: boolean; depthWrite?: boolean });
    dispose(): void;
  }

  export class BufferAttribute {
    needsUpdate: boolean;
    constructor(array: Float32Array, itemSize: number);
    setXYZ(index: number, x: number, y: number, z: number): this;
  }

  export class BufferGeometry {
    constructor();
    setAttribute(name: string, attribute: BufferAttribute): this;
    getAttribute(name: string): BufferAttribute;
    dispose(): void;
  }

  export class LineSegments extends Object3D {
    readonly geometry: BufferGeometry;
    material: LineBasicMaterial | ShaderMaterial;
    matrixAutoUpdate: boolean;
    matrixWorldNeedsUpdate: boolean;
    frustumCulled: boolean;
    renderOrder: number;
    visible: boolean;
    constructor(geometry?: BufferGeometry, material?: LineBasicMaterial);
  }

  export class Mesh extends Object3D {
    readonly geometry: BufferGeometry;
    readonly matrix: Matrix4;
    matrixAutoUpdate: boolean;
    matrixWorldNeedsUpdate: boolean;
    frustumCulled: boolean;
    material: MeshBasicMaterial | ShaderMaterial | MeshStandardMaterial;
    renderOrder: number;
    visible: boolean;
    constructor(
      geometry: BufferGeometry,
      material: MeshBasicMaterial | ShaderMaterial | MeshStandardMaterial,
    );
  }

  export class Matrix4 {
    readonly elements: number[];
    set(
      n11: number, n12: number, n13: number, n14: number,
      n21: number, n22: number, n23: number, n24: number,
      n31: number, n32: number, n33: number, n34: number,
      n41: number, n42: number, n43: number, n44: number,
    ): this;
  }

  export interface WebGLRendererOptions {
    antialias?: boolean;
    alpha?: boolean;
    powerPreference?: string;
    preserveDrawingBuffer?: boolean;
    canvas?: HTMLCanvasElement;
  }

  export class WebGLRenderer {
    readonly domElement: HTMLCanvasElement;
    constructor(options?: WebGLRendererOptions);
    getContext(): WebGLRenderingContext | WebGL2RenderingContext;
    getPixelRatio(): number;
    setClearColor(color: number, alpha: number): void;
    setPixelRatio(ratio: number): void;
    setSize(width: number, height: number, updateStyle?: boolean): void;
    clear(): void;
    render(scene: Scene, camera: OrthographicCamera | PerspectiveCamera): void;
    dispose(): void;
  }
}

declare module "three/addons/loaders/GLTFLoader.js" {
  import type { Object3D } from "three";
  export class GLTFLoader {
    parseAsync(data: ArrayBuffer | string, path: string): Promise<{ scene: Object3D }>;
  }
}

declare module "three/addons/loaders/OBJLoader.js" {
  import type { Object3D } from "three";
  export class OBJLoader {
    parse(data: string): Object3D;
  }
}

declare module "three/addons/loaders/STLLoader.js" {
  import type { BufferGeometry } from "three";
  export class STLLoader {
    parse(data: ArrayBuffer): BufferGeometry;
  }
}

declare module "three/addons/loaders/PLYLoader.js" {
  import type { BufferGeometry } from "three";
  export class PLYLoader {
    parse(data: ArrayBuffer): BufferGeometry;
  }
}

declare module "three/addons/loaders/FBXLoader.js" {
  import type { Object3D } from "three";
  export class FBXLoader {
    parse(data: ArrayBuffer, path: string): Object3D;
  }
}

declare module "three/addons/loaders/ColladaLoader.js" {
  import type { Object3D } from "three";
  export class ColladaLoader {
    parse(data: string, path: string): { scene: Object3D };
  }
}

declare module "three/addons/loaders/3MFLoader.js" {
  import type { Object3D } from "three";
  export class ThreeMFLoader {
    parse(data: ArrayBuffer): Object3D;
  }
}

declare module "three/addons/loaders/AMFLoader.js" {
  import type { Object3D } from "three";
  export class AMFLoader {
    parse(data: ArrayBuffer): Object3D;
  }
}
