/**
 * Minimal typed surface of the `three` package used by the MVP.
 * Kept local on purpose so v1 needs no extra `@types/*` dependency.
 * If the Three.js surface used by the app grows, replace this file
 * with the official `@types/three` package (requires approval).
 */
declare module "three" {
  export const NearestFilter: number;
  export const DoubleSide: number;

  export class Vector3 {
    x: number;
    y: number;
    z: number;
    constructor(x?: number, y?: number, z?: number);
    set(x: number, y: number, z: number): this;
  }

  export class Scene {
    add(object: Mesh | LineSegments): void;
    remove(object: Mesh | LineSegments): void;
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

  export class PlaneGeometry {
    constructor(width: number, height: number);
    dispose(): void;
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

  export class LineSegments {
    readonly geometry: BufferGeometry;
    matrixAutoUpdate: boolean;
    matrixWorldNeedsUpdate: boolean;
    frustumCulled: boolean;
    renderOrder: number;
    visible: boolean;
    constructor(geometry?: BufferGeometry, material?: LineBasicMaterial);
  }

  export class Mesh {
    readonly geometry: PlaneGeometry;
    readonly scale: Vector3;
    readonly position: Vector3;
    readonly rotation: Vector3;
    readonly matrix: Matrix4;
    matrixAutoUpdate: boolean;
    matrixWorldNeedsUpdate: boolean;
    renderOrder: number;
    visible: boolean;
    constructor(geometry: PlaneGeometry, material: MeshBasicMaterial | ShaderMaterial);
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
    render(scene: Scene, camera: OrthographicCamera): void;
    dispose(): void;
  }
}
