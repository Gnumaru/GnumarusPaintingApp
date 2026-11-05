/**
 * Minimal typed surface of the `three` package used by the MVP.
 * Kept local on purpose so v1 needs no extra `@types/*` dependency.
 * If the Three.js surface used by the app grows, replace this file
 * with the official `@types/three` package (requires approval).
 */
declare module "three" {
  export const NearestFilter: number;
  export const BackSide: number;

  export class Vector3 {
    x: number;
    y: number;
    z: number;
    constructor(x?: number, y?: number, z?: number);
    set(x: number, y: number, z: number): this;
  }

  export class Scene {
    add(object: Mesh): void;
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

  export class PlaneGeometry {
    constructor(width: number, height: number);
    dispose(): void;
  }

  export class Mesh {
    readonly geometry: PlaneGeometry;
    readonly scale: Vector3;
    readonly position: Vector3;
    constructor(geometry: PlaneGeometry, material: MeshBasicMaterial);
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
    setClearColor(color: number, alpha: number): void;
    setPixelRatio(ratio: number): void;
    setSize(width: number, height: number, updateStyle?: boolean): void;
    render(scene: Scene, camera: OrthographicCamera): void;
    dispose(): void;
  }
}
