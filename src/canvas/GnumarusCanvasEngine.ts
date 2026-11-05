import * as THREE from "three";
import {
  clearPixelBuffer,
  clampLayerDim,
  compositePixelOver,
  createPixelBuffer,
  drawPixelLine,
  getPixel,
  parseChannelLock,
  parseHexColor,
  resizePixelBuffer,
  setPixel,
  type GnumarusChannelLock,
  type GnumarusRgba,
} from "./GnumarusPixelBuffer";
import {
  clampZoom,
  IDENTITY_LAYER_TRANSFORM,
  layerImageToProject,
  layerPixelCenterToProject,
  normalizeRotation,
  projectToLayerPixel,
  projectToScreen,
  screenToLayerPixel,
} from "./GnumarusViewportMath";
import type {
  GnumarusLayerTransform,
  GnumarusRect,
  GnumarusViewTransform,
} from "./GnumarusViewportMath";
import {
  clampCheckerSize,
  DEFAULT_CHECKER_SETTINGS,
  type GnumarusCheckerMode,
  type GnumarusCheckerSettings,
} from "../settings/GnumarusCheckerSettings";
import {
  computeImageDiff,
  GnumarusHistory,
  type GnumarusMergedLayerSnapshot,
} from "../history/GnumarusHistory";

export interface GnumarusEngineStats {
  width: number;
  height: number;
  zoom: number;
  rotationDeg: number;
  flipX: boolean;
  flipY: boolean;
  canUndo: boolean;
  canRedo: boolean;
  cursorX: number | null;
  cursorY: number | null;
}

export type GnumarusCanvasTool = "pencil" | "loupe" | "transform";

export interface GnumarusLayerInfo {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  width: number;
  height: number;
  transform: GnumarusLayerTransform;
  lockedChannels: GnumarusChannelLock;
}

export interface GnumarusLayerPixels {
  id: string;
  width: number;
  height: number;
  buffer: Uint8ClampedArray;
}

interface GnumarusLayer extends GnumarusLayerInfo {
  buffer: Uint8ClampedArray;
  texture: THREE.DataTexture;
  material: THREE.ShaderMaterial;
  plane: THREE.Mesh;
}

export interface GnumarusProjectLayerInput {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  width: number;
  height: number;
  buffer: Uint8ClampedArray;
  transform: GnumarusLayerTransform;
  lockedChannels: GnumarusChannelLock;
}

const LAYER_VERTEX_SHADER = [
  "varying vec2 vUv;",
  "void main() {",
  "  vUv = uv;",
  "  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
  "}",
].join("\n");

const CHECKER_FRAGMENT_SHADER = [
  "precision mediump float;",
  "varying vec2 vUv;",
  "uniform float uImageW;",
  "uniform float uImageH;",
  "uniform float uMode;",
  "uniform float uSizeX;",
  "uniform float uSizeY;",
  "uniform float uPixelRatio;",
  "uniform vec3 uColorA;",
  "uniform vec3 uColorB;",
  "void main() {",
  "  vec2 cell = vec2(max(uSizeX, 1.0), max(uSizeY, 1.0));",
  "  vec2 grid = uMode < 0.5",
  "    ? floor(vec2(vUv.x * uImageW, vUv.y * uImageH) / cell)",
  "    : floor(gl_FragCoord.xy / max(cell * uPixelRatio, vec2(1.0)));",
  "  float c = mod(grid.x + grid.y, 2.0);",
  "  vec3 check = mix(uColorA, uColorB, c);",
  "  gl_FragColor = vec4(check, 1.0);",
  "}",
].join("\n");

const LAYER_FRAGMENT_SHADER = [
  "precision mediump float;",
  "varying vec2 vUv;",
  "uniform sampler2D uMap;",
  "uniform float uOpacity;",
  "void main() {",
  "  vec4 tex = texture2D(uMap, vUv);",
  "  gl_FragColor = vec4(tex.rgb, tex.a * uOpacity);",
  "}",
].join("\n");

export interface GnumarusEngineOptions {
  onStats: (stats: GnumarusEngineStats) => void;
  onPixelsChanged: () => void;
  onToolChanged?: (tool: GnumarusCanvasTool) => void;
  onLayersChanged?: () => void;
  checker?: GnumarusCheckerSettings;
}

function checkerHexToVec(hex: string): THREE.Vector3 {
  const parsed = parseHexColor(hex) ?? { r: 199, g: 199, b: 199, a: 255 };
  return new THREE.Vector3(parsed.r / 255, parsed.g / 255, parsed.b / 255);
}

export class GnumarusWebGlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GnumarusWebGlError";
  }
}

function isWebGl2Context(gl: WebGLRenderingContext | WebGL2RenderingContext): gl is WebGL2RenderingContext {
  return typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext;
}

export class GnumarusCanvasEngine {
  private readonly container: HTMLElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.OrthographicCamera;
  private readonly sharedGeometry: THREE.PlaneGeometry;
  private readonly backgroundMaterial: THREE.ShaderMaterial;
  private readonly backgroundPlane: THREE.Mesh;
  private readonly resizeObserver: ResizeObserver;
  private layers: GnumarusLayer[] = [];
  private activeLayerId = "";
  private layerCounter = 1;
  private imageWidth: number;
  private imageHeight: number;
  private zoom: number;
  private panX = 0;
  private panY = 0;
  private rotation = 0;
  private flipX = false;
  private flipY = false;
  private tool: GnumarusCanvasTool = "pencil";
  private rotating = false;
  private lastPointerAngle: number | null = null;
  private loupeZooming = false;
  private loupeAnchor: { x: number; y: number } | null = null;
  private transforming = false;
  private transformStart: { clientX: number; clientY: number; x: number; y: number } | null = null;
  private transformRotating = false;
  private transformLastAngle: number | null = null;
  private color: GnumarusRgba = { r: 0, g: 0, b: 0, a: 255 };
  private drawing = false;
  private panning = false;
  private spaceDown = false;
  private strokeBase: Uint8ClampedArray | null = null;
  private strokeLayerId: string | null = null;
  private readonly history = new GnumarusHistory(100);
  private lastPixel: { x: number; y: number } | null = null;
  private cursor: { x: number; y: number } | null = null;
  private disposed = false;
  private checkerMode: GnumarusCheckerMode;
  private checkerSizeX: number;
  private checkerSizeY: number;
  private checkerColorA: string;
  private checkerColorB: string;
  private readonly checkerColorAVec: THREE.Vector3;
  private readonly checkerColorBVec: THREE.Vector3;
  private readonly onStats: (stats: GnumarusEngineStats) => void;
  private readonly onPixelsChanged: () => void;
  private readonly onToolChanged: ((tool: GnumarusCanvasTool) => void) | undefined;
  private readonly onLayersChanged: (() => void) | undefined;

  constructor(container: HTMLElement, options: GnumarusEngineOptions) {
    this.container = container;
    this.onStats = options.onStats;
    this.onPixelsChanged = options.onPixelsChanged;
    this.onToolChanged = options.onToolChanged;
    this.onLayersChanged = options.onLayersChanged;
    const initialChecker = options.checker ?? DEFAULT_CHECKER_SETTINGS;
    this.checkerMode = initialChecker.mode;
    this.checkerSizeX = clampCheckerSize(initialChecker.sizeX);
    this.checkerSizeY = clampCheckerSize(initialChecker.sizeY);
    this.checkerColorA = initialChecker.colorA;
    this.checkerColorB = initialChecker.colorB;
    this.checkerColorAVec = checkerHexToVec(initialChecker.colorA);
    this.checkerColorBVec = checkerHexToVec(initialChecker.colorB);
    this.imageWidth = 64;
    this.imageHeight = 64;
    this.zoom = 8;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: true,
        powerPreference: "high-performance",
        preserveDrawingBuffer: false,
      });
    } catch {
      throw new GnumarusWebGlError("WebGL2 is unavailable in this browser.");
    }
    const gl = renderer.getContext();
    if (!isWebGl2Context(gl)) {
      renderer.dispose();
      throw new GnumarusWebGlError("WebGL2 is unavailable in this browser.");
    }
    this.renderer = renderer;
    this.renderer.setClearColor(0x333333, 1);
    this.renderer.domElement.style.display = "block";
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    this.renderer.domElement.style.touchAction = "none";
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);
    this.camera.position.set(0, 0, 1);
    this.camera.lookAt(0, 0, 0);

    this.sharedGeometry = new THREE.PlaneGeometry(1, 1);
    this.backgroundMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uImageW: { value: this.imageWidth },
        uImageH: { value: this.imageHeight },
        uMode: { value: this.checkerMode === "screen" ? 1 : 0 },
        uSizeX: { value: this.checkerSizeX },
        uSizeY: { value: this.checkerSizeY },
        uPixelRatio: { value: 1 },
        uColorA: { value: this.checkerColorAVec },
        uColorB: { value: this.checkerColorBVec },
      },
      vertexShader: LAYER_VERTEX_SHADER,
      fragmentShader: CHECKER_FRAGMENT_SHADER,
      side: THREE.DoubleSide,
    });
    this.backgroundPlane = new THREE.Mesh(this.sharedGeometry, this.backgroundMaterial);
    this.backgroundPlane.matrixAutoUpdate = false;
    this.backgroundPlane.renderOrder = -1;
    this.scene.add(this.backgroundPlane);
    const first = this.createLayerInternal("layer0", "Layer 0", true, 1, createPixelBuffer(64, 64), 64, 64, {
      ...IDENTITY_LAYER_TRANSFORM,
    });
    this.layers.push(first);
    this.activeLayerId = first.id;
    this.layerCounter = 1;

    this.resizeObserver = new ResizeObserver(() => this.layout());
    this.resizeObserver.observe(container);
    this.attachEvents();
    this.layout();
    this.resetView();
  }

  get size(): { width: number; height: number } {
    return { width: this.imageWidth, height: this.imageHeight };
  }

  get currentZoom(): number {
    return this.zoom;
  }

  get activeLayerPixels(): Uint8ClampedArray | null {
    return this.activeLayer()?.buffer ?? null;
  }

  private createLayerInternal(
    id: string,
    name: string,
    visible: boolean,
    opacity: number,
    buffer: Uint8ClampedArray,
    width: number,
    height: number,
    transform: GnumarusLayerTransform,
    lockedChannels: GnumarusChannelLock | undefined = undefined,
  ): GnumarusLayer {
    const texture = new THREE.DataTexture(buffer, width, height);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.flipY = true;
    texture.needsUpdate = true;
    const clampedOpacity = Math.min(1, Math.max(0, opacity));
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: texture },
        uOpacity: { value: clampedOpacity },
      },
      vertexShader: LAYER_VERTEX_SHADER,
      fragmentShader: LAYER_FRAGMENT_SHADER,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
    });
    const plane = new THREE.Mesh(this.sharedGeometry, material);
    plane.matrixAutoUpdate = false;
    const stackIndex = this.layers.length;
    plane.renderOrder = stackIndex;
    plane.visible = visible;
    this.scene.add(plane);
    const parsedLock = lockedChannels === undefined ? { r: false, g: false, b: false, a: false } : parseChannelLock(lockedChannels);
    return {
      id,
      name,
      visible,
      opacity: clampedOpacity,
      width,
      height,
      transform: { ...transform },
      lockedChannels: parsedLock,
      buffer,
      texture,
      material,
      plane,
    };
  }

  private refreshLayerStacking(): void {
    for (let i = 0; i < this.layers.length; i += 1) {
      const layer = this.layers[i];
      if (layer === undefined) {
        continue;
      }
      layer.plane.renderOrder = i;
    }
    this.layoutSceneTransforms();
  }

  private findLayer(id: string): GnumarusLayer | null {
    for (const layer of this.layers) {
      if (layer.id === id) {
        return layer;
      }
    }
    return null;
  }

  private activeLayer(): GnumarusLayer | null {
    return this.findLayer(this.activeLayerId);
  }

  getLayers(): GnumarusLayerInfo[] {
    return this.layers.map((layer) => ({
      id: layer.id,
      name: layer.name,
      visible: layer.visible,
      opacity: layer.opacity,
      width: layer.width,
      height: layer.height,
      transform: { ...layer.transform },
      lockedChannels: { ...layer.lockedChannels },
    }));
  }

  getActiveLayerId(): string {
    return this.activeLayerId;
  }

  setActiveLayer(id: string): boolean {
    if (this.findLayer(id) === null) {
      return false;
    }
    this.activeLayerId = id;
    this.emitStats();
    return true;
  }

  addLayer(): string {
    const id = `layer${this.layerCounter}`;
    const name = `Layer ${this.layerCounter}`;
    this.layerCounter += 1;
    const layer = this.createLayerInternal(
      id,
      name,
      true,
      1,
      createPixelBuffer(this.imageWidth, this.imageHeight),
      this.imageWidth,
      this.imageHeight,
      { ...IDENTITY_LAYER_TRANSFORM },
    );
    this.layers.push(layer);
    this.activeLayerId = id;
    this.refreshLayerStacking();
    this.render();
    this.emitStats();
    return id;
  }

  removeLayer(id: string): boolean {
    if (this.layers.length <= 1) {
      return false;
    }
    if (!this.removeLayerSilent(id)) {
      return false;
    }
    this.refreshLayerStacking();
    this.render();
    this.emitStats();
    return true;
  }

  private removeLayerSilent(id: string): boolean {
    const index = this.layers.findIndex((layer) => layer.id === id);
    if (index < 0) {
      return false;
    }
    const [removed] = this.layers.splice(index, 1);
    if (removed !== undefined) {
      this.scene.remove(removed.plane);
      removed.material.dispose();
      removed.texture.dispose();
    }
    if (this.activeLayerId === id) {
      const next = this.layers[Math.min(index, this.layers.length - 1)];
      if (next !== undefined) {
        this.activeLayerId = next.id;
      }
    }
    return true;
  }

  private insertLayerSnapshot(snapshot: GnumarusMergedLayerSnapshot): void {
    const buffer = new Uint8ClampedArray(snapshot.buffer);
    const layer = this.createLayerInternal(
      snapshot.id,
      snapshot.name,
      snapshot.visible,
      snapshot.opacity,
      buffer,
      snapshot.width,
      snapshot.height,
      { ...snapshot.transform },
      { ...snapshot.lockedChannels },
    );
    const at = Math.min(Math.max(0, snapshot.stackIndex), this.layers.length);
    this.layers.splice(at, 0, layer);
    this.activeLayerId = snapshot.id;
    this.refreshLayerStacking();
  }

  /**
   * Merge the layer into the one immediately below it, sampling the upper
   * layer through its own size and transform and using its opacity.
   * The result is a single undoable history entry.
   */
  mergeDown(id: string): boolean {
    const index = this.layers.findIndex((layer) => layer.id === id);
    if (index <= 0) {
      return false;
    }
    const upper = this.layers[index];
    const lower = this.layers[index - 1];
    if (upper === undefined || lower === undefined) {
      return false;
    }
    const base = lower.buffer.slice();
    for (let y = 0; y < lower.height; y += 1) {
      for (let x = 0; x < lower.width; x += 1) {
        const project = layerPixelCenterToProject(x, y, lower.width, lower.height, lower.transform);
        const sample = projectToLayerPixel(
          project.x,
          project.y,
          upper.width,
          upper.height,
          upper.transform,
        );
        if (sample === null) {
          continue;
        }
        compositePixelOver(
          lower.buffer,
          (y * lower.width + x) * 4,
          upper.buffer,
          (sample.y * upper.width + sample.x) * 4,
          upper.opacity,
          lower.lockedChannels,
        );
      }
    }
    const diff = computeImageDiff(base, lower.buffer, lower.width, lower.height);
    const snapshot: GnumarusMergedLayerSnapshot = {
      id: upper.id,
      name: upper.name,
      visible: upper.visible,
      opacity: upper.opacity,
      width: upper.width,
      height: upper.height,
      transform: { ...upper.transform },
      lockedChannels: { ...upper.lockedChannels },
      stackIndex: index,
      buffer: upper.buffer.slice(),
    };
    this.removeLayerSilent(id);
    this.activeLayerId = lower.id;
    this.history.push({
      type: "merge",
      merge: { lowerLayerId: lower.id, lowerDiff: diff, upper: snapshot },
    });
    lower.texture.needsUpdate = true;
    this.refreshLayerStacking();
    this.render();
    this.emitStats();
    return true;
  }

  renameLayer(id: string, name: string): boolean {
    const layer = this.findLayer(id);
    const trimmed = name.trim().slice(0, 64);
    if (layer === null || trimmed.length === 0) {
      return false;
    }
    layer.name = trimmed;
    this.emitStats();
    return true;
  }

  setLayerVisible(id: string, visible: boolean): boolean {
    const layer = this.findLayer(id);
    if (layer === null) {
      return false;
    }
    layer.visible = visible;
    layer.plane.visible = visible;
    this.render();
    this.emitStats();
    return true;
  }

  setLayerOpacity(id: string, opacity: number): boolean {
    const layer = this.findLayer(id);
    if (layer === null) {
      return false;
    }
    const clamped = Math.min(1, Math.max(0, opacity));
    layer.opacity = clamped;
    layer.material.uniforms["uOpacity"]!.value = clamped;
    this.render();
    return true;
  }

  setLayerLockedChannels(id: string, locked: GnumarusChannelLock): boolean {
    const layer = this.findLayer(id);
    if (layer === null) {
      return false;
    }
    layer.lockedChannels = parseChannelLock(locked);
    this.emitStats();
    return true;
  }

  setLayerChannelLocked(id: string, channel: "r" | "g" | "b" | "a", locked: boolean): boolean {
    const layer = this.findLayer(id);
    if (layer === null) {
      return false;
    }
    layer.lockedChannels[channel] = locked === true;
    this.emitStats();
    return true;
  }

  /** Move a layer visually up (toward the top) or down. Returns false at the ends. */
  moveLayer(id: string, direction: "up" | "down"): boolean {
    const index = this.layers.findIndex((layer) => layer.id === id);
    const target = direction === "up" ? index + 1 : index - 1;
    if (index < 0 || target < 0 || target >= this.layers.length) {
      return false;
    }
    const current = this.layers[index];
    const other = this.layers[target];
    if (current === undefined || other === undefined) {
      return false;
    }
    this.layers[target] = current;
    this.layers[index] = other;
    this.refreshLayerStacking();
    this.render();
    this.emitStats();
    return true;
  }

  exportLayers(): GnumarusLayerPixels[] {
    return this.layers.map((layer) => ({
      id: layer.id,
      width: layer.width,
      height: layer.height,
      buffer: layer.buffer,
    }));
  }

  setLayerTransform(id: string, transform: Partial<GnumarusLayerTransform>): boolean {
    const layer = this.findLayer(id);
    if (layer === null) {
      return false;
    }
    if (transform.x !== undefined) {
      layer.transform.x = transform.x;
    }
    if (transform.y !== undefined) {
      layer.transform.y = transform.y;
    }
    if (transform.rotation !== undefined) {
      layer.transform.rotation = normalizeRotation(transform.rotation);
    }
    if (transform.flipX !== undefined) {
      layer.transform.flipX = transform.flipX;
    }
    if (transform.flipY !== undefined) {
      layer.transform.flipY = transform.flipY;
    }
    this.layoutSceneTransforms();
    this.render();
    return true;
  }

  resetLayerTransform(id: string): boolean {
    const layer = this.findLayer(id);
    if (layer === null) {
      return false;
    }
    layer.transform = { ...IDENTITY_LAYER_TRANSFORM };
    this.layoutSceneTransforms();
    this.render();
    this.emitStats();
    return true;
  }

  private replaceLayerBuffer(layerId: string, width: number, height: number, buffer: Uint8ClampedArray): boolean {
    const layer = this.findLayer(layerId);
    if (layer === null) {
      return false;
    }
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
      return false;
    }
    if (buffer.length !== width * height * 4) {
      return false;
    }
    layer.texture.dispose();
    const texture = new THREE.DataTexture(buffer, width, height);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.flipY = true;
    texture.needsUpdate = true;
    layer.texture = texture;
    layer.material.uniforms["uMap"]!.value = texture;
    layer.width = width;
    layer.height = height;
    layer.buffer = buffer;
    return true;
  }

  private applyLayerResize(layerId: string, width: number, height: number, buffer: Uint8ClampedArray): boolean {
    const copy = new Uint8ClampedArray(buffer);
    if (!this.replaceLayerBuffer(layerId, width, height, copy)) {
      return false;
    }
    return true;
  }

  /**
   * Resize a layer, preserving top-left pixels.
   * Larger dimensions expand right and down with transparent pixels.
   * Smaller dimensions crop excess right and below.
   * Returns false for unknown layers, invalid dimensions or no-op resizes.
   * Successful resizes are undoable.
   */
  resizeLayer(id: string, newWidth: number, newHeight: number): boolean {
    const layer = this.findLayer(id);
    if (layer === null) {
      return false;
    }
    if (!Number.isFinite(newWidth) || !Number.isFinite(newHeight)) {
      return false;
    }
    const clampedWidth = clampLayerDim(newWidth);
    const clampedHeight = clampLayerDim(newHeight);
    if (clampedWidth === layer.width && clampedHeight === layer.height) {
      return false;
    }
    const beforeWidth = layer.width;
    const beforeHeight = layer.height;
    const beforeBuffer = layer.buffer.slice();
    const nextBuffer = resizePixelBuffer(layer.buffer, layer.width, layer.height, clampedWidth, clampedHeight);
    const afterBuffer = nextBuffer.slice();
    if (!this.replaceLayerBuffer(id, clampedWidth, clampedHeight, nextBuffer)) {
      return false;
    }
    this.history.push({
      type: "resize",
      resize: {
        layerId: id,
        beforeWidth,
        beforeHeight,
        beforeBuffer,
        afterWidth: clampedWidth,
        afterHeight: clampedHeight,
        afterBuffer,
      },
    });
    this.refreshLayerStacking();
    this.render();
    this.onPixelsChanged();
    this.onLayersChanged?.();
    this.emitStats();
    return true;
  }

  loadProject(projectWidth: number, projectHeight: number, inputs: GnumarusProjectLayerInput[]): void {
    if (inputs.length === 0) {
      throw new Error("Project has no layers.");
    }
    for (const input of inputs) {
      if (!Number.isInteger(input.width) || !Number.isInteger(input.height) || input.width < 1 || input.height < 1) {
        throw new Error(`Layer has invalid dimensions: ${input.id}`);
      }
      if (input.buffer.length !== input.width * input.height * 4) {
        throw new Error(`Layer buffer size mismatch: ${input.id}`);
      }
    }
    this.imageWidth = Math.max(1, Math.floor(projectWidth));
    this.imageHeight = Math.max(1, Math.floor(projectHeight));
    for (const layer of this.layers) {
      this.scene.remove(layer.plane);
      layer.material.dispose();
      layer.texture.dispose();
    }
    this.layers = [];
    let maxSuffix = 0;
    for (const input of inputs) {
      const match = /^layer(\d+)$/.exec(input.id);
      if (match !== null && match[1] !== undefined) {
        maxSuffix = Math.max(maxSuffix, Number.parseInt(match[1], 10) + 1);
      }
      const copy = new Uint8ClampedArray(input.buffer);
      this.layers.push(
        this.createLayerInternal(
          input.id,
          input.name,
          input.visible,
          input.opacity,
          copy,
          input.width,
          input.height,
          {
            ...input.transform,
            rotation: normalizeRotation(input.transform.rotation),
          },
          parseChannelLock(input.lockedChannels),
        ),
      );
    }
    const top = this.layers[this.layers.length - 1];
    if (top !== undefined) {
      this.activeLayerId = top.id;
    }
    this.layerCounter = Math.max(maxSuffix, this.layers.length);
    this.history.clear();
    this.strokeBase = null;
    this.strokeLayerId = null;
    this.syncImageUniforms();
    this.refreshLayerStacking();
    this.resetView();
    this.render();
    this.emitStats();
  }

  private syncImageUniforms(): void {
    const w = this.backgroundMaterial.uniforms["uImageW"];
    const h = this.backgroundMaterial.uniforms["uImageH"];
    if (w !== undefined) {
      w.value = this.imageWidth;
    }
    if (h !== undefined) {
      h.value = this.imageHeight;
    }
  }

  newProject(width: number, height: number): void {
    this.imageWidth = width;
    this.imageHeight = height;
    for (const layer of this.layers) {
      this.scene.remove(layer.plane);
      layer.material.dispose();
      layer.texture.dispose();
    }
    this.layers = [];
    const first = this.createLayerInternal("layer0", "Layer 0", true, 1, createPixelBuffer(width, height), width, height, {
      ...IDENTITY_LAYER_TRANSFORM,
    });
    this.layers.push(first);
    this.activeLayerId = first.id;
    this.layerCounter = 1;
    this.history.clear();
    this.strokeBase = null;
    this.strokeLayerId = null;
    this.syncImageUniforms();
    this.refreshLayerStacking();
    this.resetView();
    this.render();
    this.emitStats();
  }

  setColor(hex: string): void {
    const parsed = parseHexColor(hex);
    if (parsed !== null) {
      this.color = parsed;
    }
  }

  clear(): void {
    const layer = this.activeLayer();
    if (layer === null) {
      return;
    }
    const base = layer.buffer.slice();
    clearPixelBuffer(layer.buffer, layer.lockedChannels);
    const diff = computeImageDiff(base, layer.buffer, layer.width, layer.height);
    if (diff !== null) {
      this.history.push({ type: "stroke", layerId: layer.id, diff });
    }
    layer.texture.needsUpdate = true;
    this.render();
    this.onPixelsChanged();
    this.emitStats();
  }

  setZoom(zoom: number): void {
    this.zoom = clampZoom(zoom);
    this.layoutScene();
    this.render();
    this.emitStats();
  }

  zoomBy(factor: number): void {
    this.setZoom(this.zoom * factor);
  }

  /** Zoom keeping the image pixel under the client point stable. */
  zoomAtPoint(clientX: number, clientY: number, factor: number): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);
    const dx = clientX - centerX - this.panX;
    const dy = clientY - centerY - this.panY;
    const vx = (cos * dx + sin * dy) / this.zoom;
    const vy = (-sin * dx + cos * dy) / this.zoom;
    const nextZoom = clampZoom(this.zoom * factor);
    this.zoom = nextZoom;
    this.panX = clientX - centerX - (cos * vx - sin * vy) * nextZoom;
    this.panY = clientY - centerY - (sin * vx + cos * vy) * nextZoom;
    this.layoutScene();
    this.render();
    this.emitStats();
  }

  setRotation(radians: number): void {
    this.rotation = normalizeRotation(radians);
    this.layoutScene();
    this.render();
    this.emitStats();
  }

  setFlip(flipX: boolean, flipY: boolean): void {
    this.flipX = flipX;
    this.flipY = flipY;
    this.layoutScene();
    this.render();
    this.emitStats();
  }

  setTool(tool: GnumarusCanvasTool): void {
    this.tool = tool;
    this.onToolChanged?.(tool);
  }

  getViewState(): { zoom: number; rotation: number; flipX: boolean; flipY: boolean } {
    return { zoom: this.zoom, rotation: this.rotation, flipX: this.flipX, flipY: this.flipY };
  }

  undo(): boolean {
    const applied = this.history.undo(
      (layerId) => this.historyLayerFor(layerId),
      (snapshot) => this.insertLayerSnapshot(snapshot),
      (layerId, width, height, buffer) => this.applyLayerResize(layerId, width, height, buffer),
    );
    if (!applied) {
      return false;
    }
    this.markLayersDirty();
    this.refreshLayerStacking();
    this.render();
    this.onPixelsChanged();
    this.onLayersChanged?.();
    this.emitStats();
    return true;
  }

  redo(): boolean {
    const applied = this.history.redo(
      (layerId) => this.historyLayerFor(layerId),
      (layerId) => this.removeLayerSilent(layerId),
      (layerId, width, height, buffer) => this.applyLayerResize(layerId, width, height, buffer),
    );
    if (!applied) {
      return false;
    }
    this.markLayersDirty();
    this.refreshLayerStacking();
    this.render();
    this.onPixelsChanged();
    this.onLayersChanged?.();
    this.emitStats();
    return true;
  }

  private historyLayerFor(layerId: string): { buffer: Uint8ClampedArray; width: number } | null {
    const layer = this.findLayer(layerId);
    if (layer === null) {
      return null;
    }
    return { buffer: layer.buffer, width: layer.width };
  }

  private markLayersDirty(): void {
    for (const layer of this.layers) {
      layer.texture.needsUpdate = true;
    }
  }

  applyCheckerSettings(settings: GnumarusCheckerSettings): void {
    this.checkerMode = settings.mode;
    this.checkerSizeX = clampCheckerSize(settings.sizeX);
    this.checkerSizeY = clampCheckerSize(settings.sizeY);
    const colorA = parseHexColor(settings.colorA);
    const colorB = parseHexColor(settings.colorB);
    if (colorA !== null) {
      this.checkerColorA = settings.colorA;
      this.checkerColorAVec.set(colorA.r / 255, colorA.g / 255, colorA.b / 255);
    }
    if (colorB !== null) {
      this.checkerColorB = settings.colorB;
      this.checkerColorBVec.set(colorB.r / 255, colorB.g / 255, colorB.b / 255);
    }
    this.backgroundMaterial.uniforms["uMode"]!.value = this.checkerMode === "screen" ? 1 : 0;
    this.backgroundMaterial.uniforms["uSizeX"]!.value = this.checkerSizeX;
    this.backgroundMaterial.uniforms["uSizeY"]!.value = this.checkerSizeY;
    this.render();
  }

  getCheckerSettings(): GnumarusCheckerSettings {
    return {
      mode: this.checkerMode,
      sizeX: this.checkerSizeX,
      sizeY: this.checkerSizeY,
      colorA: this.checkerColorA,
      colorB: this.checkerColorB,
    };
  }

  resetView(): void {
    const rect = this.container.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      const fit = Math.min(rect.width / this.imageWidth, rect.height / this.imageHeight);
      this.zoom = clampZoom(Math.max(1, Math.floor(fit)));
    } else {
      this.zoom = 8;
    }
    this.panX = 0;
    this.panY = 0;
    this.rotation = 0;
    this.flipX = false;
    this.flipY = false;
    this.layoutScene();
    this.render();
    this.emitStats();
  }

  /** Reset zoom, pan, rotation and flips to the default view. */
  resetViewTransform(): void {
    this.resetView();
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.resizeObserver.disconnect();
    for (const layer of this.layers) {
      this.scene.remove(layer.plane);
      layer.material.dispose();
      layer.texture.dispose();
    }
    this.layers = [];
    this.scene.remove(this.backgroundPlane);
    this.backgroundMaterial.dispose();
    this.sharedGeometry.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private attachEvents(): void {
    const canvas = this.renderer.domElement;
    canvas.addEventListener("pointerdown", (event: PointerEvent) => {
      if (event.button === 1 && (this.tool === "loupe" || this.tool === "transform")) {
        event.preventDefault();
        if (event.ctrlKey) {
          // Ctrl+middle-click resets the transform.
          if (this.tool === "loupe") {
            this.resetViewTransform();
          } else {
            const layer = this.activeLayer();
            if (layer !== null) {
              this.resetLayerTransform(layer.id);
            }
          }
        } else if (this.tool === "loupe") {
          // Middle click with the loupe tool flips the canvas view.
          if (event.shiftKey) {
            this.setFlip(this.flipX, !this.flipY);
          } else {
            this.setFlip(!this.flipX, this.flipY);
          }
        } else {
          // Middle click with the transform tool flips the active layer.
          const layer = this.activeLayer();
          if (layer !== null) {
            if (event.shiftKey) {
              this.setLayerTransform(layer.id, { flipY: !layer.transform.flipY });
            } else {
              this.setLayerTransform(layer.id, { flipX: !layer.transform.flipX });
            }
          }
        }
        return;
      }
      if (event.button === 1 || this.spaceDown) {
        this.panning = true;
        canvas.setPointerCapture(event.pointerId);
        return;
      }
      if (event.button === 2 && (this.tool === "loupe" || this.tool === "transform")) {
        // Right-drag rotates around the image (loupe) or layer (transform) center.
        const angle =
          this.tool === "loupe"
            ? this.pointerAngle(event.clientX, event.clientY)
            : this.layerPointerAngle(event.clientX, event.clientY);
        if (angle === null) {
          return;
        }
        if (this.tool === "loupe") {
          this.rotating = true;
          this.lastPointerAngle = angle;
        } else {
          this.transformRotating = true;
          this.transformLastAngle = angle;
        }
        canvas.setPointerCapture(event.pointerId);
        return;
      }
      if (event.button !== 0) {
        return;
      }
      if (this.tool === "transform") {
        // Left-drag with the transform tool moves the active layer.
        const layer = this.activeLayer();
        if (layer === null) {
          return;
        }
        this.transforming = true;
        this.transformStart = {
          clientX: event.clientX,
          clientY: event.clientY,
          x: layer.transform.x,
          y: layer.transform.y,
        };
        canvas.setPointerCapture(event.pointerId);
        return;
      }
      if (this.tool === "loupe") {
        // Left-drag with the loupe tool zooms: up/right zooms in.
        this.loupeZooming = true;
        this.loupeAnchor = { x: event.clientX, y: event.clientY };
        canvas.setPointerCapture(event.pointerId);
        return;
      }
      const pixel = this.toImagePixel(event.clientX, event.clientY);
      if (pixel === null) {
        return;
      }
      const layer = this.activeLayer();
      if (layer === null) {
        return;
      }
      this.drawing = true;
      canvas.setPointerCapture(event.pointerId);
      this.lastPixel = pixel;
      this.strokeBase = layer.buffer.slice();
      this.strokeLayerId = layer.id;
      setPixel(layer.buffer, layer.width, layer.height, pixel.x, pixel.y, this.color, layer.lockedChannels);
      layer.texture.needsUpdate = true;
      this.render();
      this.onPixelsChanged();
      this.emitStats();
    });
    canvas.addEventListener("pointermove", (event: PointerEvent) => {
      const pixel = this.toImagePixel(event.clientX, event.clientY);
      this.cursor = pixel;
      if (this.transformRotating) {
        const angle = this.layerPointerAngle(event.clientX, event.clientY);
        if (angle !== null && this.transformLastAngle !== null) {
          let delta = angle - this.transformLastAngle;
          if (delta > Math.PI) {
            delta -= Math.PI * 2;
          } else if (delta < -Math.PI) {
            delta += Math.PI * 2;
          }
          const layer = this.activeLayer();
          if (layer !== null) {
            this.setLayerTransform(layer.id, { rotation: layer.transform.rotation + delta });
            this.transformLastAngle = angle;
          }
        }
        return;
      }
      if (this.transforming && this.transformStart !== null) {
        const layer = this.activeLayer();
        if (layer === null) {
          return;
        }
        const cos = Math.cos(this.rotation);
        const sin = Math.sin(this.rotation);
        const dx = event.clientX - this.transformStart.clientX;
        const dy = event.clientY - this.transformStart.clientY;
        const vx = (cos * dx + sin * dy) / this.zoom;
        const vy = (-sin * dx + cos * dy) / this.zoom;
        this.setLayerTransform(layer.id, {
          x: this.transformStart.x + vx / (this.flipX ? -1 : 1),
          y: this.transformStart.y + vy / (this.flipY ? -1 : 1),
        });
        return;
      }
      if (this.rotating) {
        const angle = this.pointerAngle(event.clientX, event.clientY);
        if (angle !== null && this.lastPointerAngle !== null) {
          let delta = angle - this.lastPointerAngle;
          if (delta > Math.PI) {
            delta -= Math.PI * 2;
          } else if (delta < -Math.PI) {
            delta += Math.PI * 2;
          }
          this.setRotation(this.rotation + delta);
          this.lastPointerAngle = angle;
        }
        return;
      }
      if (this.loupeZooming && this.loupeAnchor !== null) {
        const amount = event.movementX - event.movementY;
        if (amount !== 0) {
          this.zoomAtPoint(this.loupeAnchor.x, this.loupeAnchor.y, 1 + amount * 0.004);
        }
        return;
      }
      if (this.panning) {
        this.panX += event.movementX;
        this.panY += event.movementY;
        this.layoutScene();
        this.render();
        this.emitStats();
        return;
      }
      if (this.drawing && this.lastPixel !== null && pixel !== null) {
        const layer = this.activeLayer();
        if (layer === null) {
          return;
        }
        drawPixelLine(
          layer.buffer,
          layer.width,
          layer.height,
          this.lastPixel.x,
          this.lastPixel.y,
          pixel.x,
          pixel.y,
          this.color,
          layer.lockedChannels,
        );
        this.lastPixel = pixel;
        layer.texture.needsUpdate = true;
        this.render();
        this.onPixelsChanged();
      }
      this.emitStats();
    });
    const endStroke = (): void => {
      if (this.strokeBase !== null && this.strokeLayerId !== null) {
        const layer = this.findLayer(this.strokeLayerId);
        if (layer !== null) {
          const diff = computeImageDiff(this.strokeBase, layer.buffer, layer.width, layer.height);
          if (diff !== null) {
            this.history.push({ type: "stroke", layerId: layer.id, diff });
          }
        }
        this.strokeBase = null;
        this.strokeLayerId = null;
      }
      this.drawing = false;
      this.panning = false;
      this.rotating = false;
      this.loupeZooming = false;
      this.transforming = false;
      this.transformRotating = false;
      this.lastPointerAngle = null;
      this.transformLastAngle = null;
      this.transformStart = null;
      this.loupeAnchor = null;
      this.lastPixel = null;
    };
    canvas.addEventListener("pointerup", endStroke);
    canvas.addEventListener("pointercancel", endStroke);
    canvas.addEventListener("pointerleave", () => {
      this.cursor = null;
      this.emitStats();
    });
    canvas.addEventListener(
      "wheel",
      (event: WheelEvent) => {
        event.preventDefault();
        this.zoomAtPoint(event.clientX, event.clientY, event.deltaY < 0 ? 1.25 : 0.8);
      },
      { passive: false },
    );
    canvas.addEventListener("contextmenu", (event: Event) => {
      event.preventDefault();
    });
    window.addEventListener("keydown", (event: KeyboardEvent) => {
      if (event.code === "Space") {
        this.spaceDown = true;
        return;
      }
      const target = event.target;
      const inField =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement;
      if (!event.ctrlKey && !event.altKey && !event.metaKey && !inField) {
        if (event.key === "p" || event.key === "P") {
          this.setTool("pencil");
          return;
        }
        if (event.key === "l" || event.key === "L") {
          this.setTool("loupe");
          return;
        }
        if (event.key === "t" || event.key === "T") {
          this.setTool("transform");
          return;
        }
      }
      if (event.ctrlKey && !event.altKey && !event.metaKey && !inField) {
        const key = event.key.toLowerCase();
        if (key === "z" && !event.shiftKey) {
          event.preventDefault();
          this.undo();
          return;
        }
        if (key === "y" || (key === "z" && event.shiftKey)) {
          event.preventDefault();
          this.redo();
          return;
        }
      }
      if (event.ctrlKey && event.altKey && !event.metaKey) {
        if (inField) {
          return;
        }
        if (event.key === "+" || event.key === "=" || event.code === "Equal" || event.code === "NumpadAdd") {
          event.preventDefault();
          this.zoomBy(1.25);
        } else if (event.key === "-" || event.code === "Minus" || event.code === "NumpadSubtract") {
          event.preventDefault();
          this.zoomBy(0.8);
        }
      }
    });
    window.addEventListener("keyup", (event: KeyboardEvent) => {
      if (event.code === "Space") {
        this.spaceDown = false;
        this.panning = false;
      }
    });
  }

  private toImagePixel(clientX: number, clientY: number): { x: number; y: number } | null {
    const layer = this.activeLayer();
    if (layer === null) {
      return null;
    }
    const rect = this.renderer.domElement.getBoundingClientRect();
    return screenToLayerPixel(
      clientX,
      clientY,
      { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      layer.width,
      layer.height,
      this.viewTransform(),
      layer.transform,
    );
  }

  /** Pointer angle around the image center, clockwise-positive. Null at the center. */
  private pointerAngle(clientX: number, clientY: number): number | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const dx = clientX - (rect.left + rect.width / 2 + this.panX);
    const dy = clientY - (rect.top + rect.height / 2 + this.panY);
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
      return null;
    }
    return Math.atan2(dy, dx);
  }

  /** Pointer angle around the active layer's screen center. Null at the center. */
  private layerPointerAngle(clientX: number, clientY: number): number | null {
    const layer = this.activeLayer();
    if (layer === null) {
      return null;
    }
    const rect = this.renderer.domElement.getBoundingClientRect();
    const center = projectToScreen(
      layer.transform.x,
      layer.transform.y,
      { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      this.viewTransform(),
    );
    const dx = clientX - center.x;
    const dy = clientY - center.y;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
      return null;
    }
    return Math.atan2(dy, dx);
  }

  private layout(): void {
    const rect = this.container.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.renderer.setPixelRatio(dpr);
    this.backgroundMaterial.uniforms["uPixelRatio"]!.value = dpr;
    this.renderer.setSize(width, height, false);
    this.layoutScene();
    this.render();
  }

  private layoutScene(): void {
    const rect = this.container.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    this.camera.left = -width / 2;
    this.camera.right = width / 2;
    this.camera.top = height / 2;
    this.camera.bottom = -height / 2;
    this.camera.updateProjectionMatrix();
    this.layoutSceneTransforms();
  }

  private viewTransform(): GnumarusViewTransform {
    return {
      zoom: this.zoom,
      panX: this.panX,
      panY: this.panY,
      rotation: this.rotation,
      flipX: this.flipX,
      flipY: this.flipY,
    };
  }

  /**
   * Position a plane from its layer transform and the view transform by
   * evaluating the same pure mapping used for pointer math, so render and
   * picking always agree.
   */
  private writePlaneMatrix(
    mesh: THREE.Mesh,
    layerWidth: number,
    layerHeight: number,
    layer: GnumarusLayerTransform,
    z: number,
  ): void {
    const rect = this.container.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    const local: GnumarusRect = { left: 0, top: 0, width: w, height: h };
    const view = this.viewTransform();
    const at = (lx: number, ly: number): { x: number; y: number } => {
      const projected = layerImageToProject((lx + 0.5) * layerWidth, (0.5 - ly) * layerHeight, layerWidth, layerHeight, layer);
      return projectToScreen(projected.x, projected.y, local, view);
    };
    const o = at(0, 0);
    const ex = at(1, 0);
    const ey = at(0, 1);
    const e = mesh.matrix.elements;
    e[0] = ex.x - o.x;
    e[1] = -(ex.y - o.y);
    e[2] = 0;
    e[3] = 0;
    e[4] = ey.x - o.x;
    e[5] = -(ey.y - o.y);
    e[6] = 0;
    e[7] = 0;
    e[8] = 0;
    e[9] = 0;
    e[10] = 1;
    e[11] = 0;
    e[12] = o.x - w / 2;
    e[13] = h / 2 - o.y;
    e[14] = z;
    e[15] = 1;
    mesh.matrixWorldNeedsUpdate = true;
  }

  private layoutSceneTransforms(): void {
    for (let i = 0; i < this.layers.length; i += 1) {
      const layer = this.layers[i];
      if (layer === undefined) {
        continue;
      }
      this.writePlaneMatrix(layer.plane, layer.width, layer.height, layer.transform, i * 0.01);
    }
    this.writePlaneMatrix(
      this.backgroundPlane,
      this.imageWidth,
      this.imageHeight,
      IDENTITY_LAYER_TRANSFORM,
      -0.02,
    );
  }

  private render(): void {
    if (this.disposed) {
      return;
    }
    this.renderer.render(this.scene, this.camera);
  }

  private emitStats(): void {
    this.onStats({
      width: this.imageWidth,
      height: this.imageHeight,
      zoom: this.zoom,
      rotationDeg: Math.round((this.rotation * 180) / Math.PI),
      flipX: this.flipX,
      flipY: this.flipY,
      canUndo: this.history.canUndo(),
      canRedo: this.history.canRedo(),
      cursorX: this.cursor === null ? null : this.cursor.x,
      cursorY: this.cursor === null ? null : this.cursor.y,
    });
  }

  readPixel(x: number, y: number): GnumarusRgba | null {
    const layer = this.activeLayer();
    if (layer === null) {
      return null;
    }
    return getPixel(layer.buffer, layer.width, layer.height, x, y);
  }
}
