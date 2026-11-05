import * as THREE from "three";
import {
  clearPixelBuffer,
  createPixelBuffer,
  drawPixelLine,
  getPixel,
  parseHexColor,
  setPixel,
  type GnumarusRgba,
} from "./GnumarusPixelBuffer";
import { clampZoom, normalizeRotation, screenToImagePixel } from "./GnumarusViewportMath";
import {
  clampCheckerSize,
  DEFAULT_CHECKER_SETTINGS,
  type GnumarusCheckerMode,
  type GnumarusCheckerSettings,
} from "../settings/GnumarusCheckerSettings";

export interface GnumarusEngineStats {
  width: number;
  height: number;
  zoom: number;
  rotationDeg: number;
  flipX: boolean;
  flipY: boolean;
  cursorX: number | null;
  cursorY: number | null;
}

export type GnumarusCanvasTool = "pencil" | "loupe";

export interface GnumarusEngineOptions {
  onStats: (stats: GnumarusEngineStats) => void;
  onPixelsChanged: () => void;
  onToolChanged?: (tool: GnumarusCanvasTool) => void;
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
  private readonly texture: THREE.DataTexture;
  private readonly material: THREE.ShaderMaterial;
  private readonly plane: THREE.Mesh;
  private readonly resizeObserver: ResizeObserver;
  private buffer: Uint8ClampedArray;
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
  private color: GnumarusRgba = { r: 0, g: 0, b: 0, a: 255 };
  private drawing = false;
  private panning = false;
  private spaceDown = false;
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

  constructor(container: HTMLElement, options: GnumarusEngineOptions) {
    this.container = container;
    this.onStats = options.onStats;
    this.onPixelsChanged = options.onPixelsChanged;
    this.onToolChanged = options.onToolChanged;
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
    this.buffer = createPixelBuffer(this.imageWidth, this.imageHeight);

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

    this.texture = new THREE.DataTexture(this.buffer, this.imageWidth, this.imageHeight);
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.minFilter = THREE.NearestFilter;
    this.texture.generateMipmaps = false;
    this.texture.flipY = true;
    this.texture.needsUpdate = true;

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: this.texture },
        uImageW: { value: this.imageWidth },
        uImageH: { value: this.imageHeight },
        uMode: { value: this.checkerMode === "screen" ? 1 : 0 },
        uSizeX: { value: this.checkerSizeX },
        uSizeY: { value: this.checkerSizeY },
        uPixelRatio: { value: 1 },
        uColorA: { value: this.checkerColorAVec },
        uColorB: { value: this.checkerColorBVec },
      },
      vertexShader: [
        "varying vec2 vUv;",
        "void main() {",
        "  vUv = uv;",
        "  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
        "}",
      ].join("\n"),
      fragmentShader: [
        "precision mediump float;",
        "varying vec2 vUv;",
        "uniform sampler2D uMap;",
        "uniform float uImageW;",
        "uniform float uImageH;",
        "uniform float uMode;",
        "uniform float uSizeX;",
        "uniform float uSizeY;",
        "uniform float uPixelRatio;",
        "uniform vec3 uColorA;",
        "uniform vec3 uColorB;",
        "void main() {",
        "  vec4 tex = texture2D(uMap, vUv);",
        "  vec2 cell = vec2(max(uSizeX, 1.0), max(uSizeY, 1.0));",
        "  vec2 grid = uMode < 0.5",
        "    ? floor(vec2(vUv.x * uImageW, vUv.y * uImageH) / cell)",
        "    : floor(gl_FragCoord.xy / max(cell * uPixelRatio, vec2(1.0)));",
        "  float c = mod(grid.x + grid.y, 2.0);",
        "  vec3 check = mix(uColorA, uColorB, c);",
        "  vec3 rgb = mix(check, tex.rgb, tex.a);",
        "  gl_FragColor = vec4(rgb, 1.0);",
        "}",
      ].join("\n"),
      side: THREE.DoubleSide,
    });
    this.plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.material);
    this.scene.add(this.plane);

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

  get pixelData(): Uint8ClampedArray {
    return this.buffer;
  }

  private syncImageUniforms(): void {
    const w = this.material.uniforms["uImageW"];
    const h = this.material.uniforms["uImageH"];
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
    this.buffer = createPixelBuffer(width, height);
    this.texture.image = { data: this.buffer, width, height };
    this.texture.needsUpdate = true;
    this.syncImageUniforms();
    this.resetView();
    this.render();
    this.emitStats();
  }

  loadBuffer(width: number, height: number, data: Uint8ClampedArray): void {
    const copy = new Uint8ClampedArray(width * height * 4);
    copy.set(data.subarray(0, width * height * 4));
    this.imageWidth = width;
    this.imageHeight = height;
    this.buffer = copy;
    this.texture.image = { data: this.buffer, width, height };
    this.texture.needsUpdate = true;
    this.syncImageUniforms();
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
    clearPixelBuffer(this.buffer);
    this.texture.needsUpdate = true;
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
    this.material.uniforms["uMode"]!.value = this.checkerMode === "screen" ? 1 : 0;
    this.material.uniforms["uSizeX"]!.value = this.checkerSizeX;
    this.material.uniforms["uSizeY"]!.value = this.checkerSizeY;
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
    this.plane.geometry.dispose();
    this.material.dispose();
    this.texture.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private attachEvents(): void {
    const canvas = this.renderer.domElement;
    canvas.addEventListener("pointerdown", (event: PointerEvent) => {
      if (event.button === 1 && this.tool === "loupe") {
        event.preventDefault();
        if (event.ctrlKey) {
          // Ctrl+middle-click with the loupe tool resets the transform.
          this.resetViewTransform();
        } else if (event.shiftKey) {
          // Middle click with the loupe tool flips the canvas view.
          this.setFlip(this.flipX, !this.flipY);
        } else {
          this.setFlip(!this.flipX, this.flipY);
        }
        return;
      }
      if (event.button === 1 || this.spaceDown) {
        this.panning = true;
        canvas.setPointerCapture(event.pointerId);
        return;
      }
      if (event.button === 2 && this.tool === "loupe") {
        // Right-drag with the loupe tool rotates around the image center.
        const angle = this.pointerAngle(event.clientX, event.clientY);
        if (angle === null) {
          return;
        }
        this.rotating = true;
        this.lastPointerAngle = angle;
        canvas.setPointerCapture(event.pointerId);
        return;
      }
      if (event.button !== 0) {
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
      this.drawing = true;
      canvas.setPointerCapture(event.pointerId);
      this.lastPixel = pixel;
      setPixel(this.buffer, this.imageWidth, this.imageHeight, pixel.x, pixel.y, this.color);
      this.texture.needsUpdate = true;
      this.render();
      this.onPixelsChanged();
      this.emitStats();
    });
    canvas.addEventListener("pointermove", (event: PointerEvent) => {
      const pixel = this.toImagePixel(event.clientX, event.clientY);
      this.cursor = pixel;
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
        drawPixelLine(
          this.buffer,
          this.imageWidth,
          this.imageHeight,
          this.lastPixel.x,
          this.lastPixel.y,
          pixel.x,
          pixel.y,
          this.color,
        );
        this.lastPixel = pixel;
        this.texture.needsUpdate = true;
        this.render();
        this.onPixelsChanged();
      }
      this.emitStats();
    });
    const endStroke = (): void => {
      this.drawing = false;
      this.panning = false;
      this.rotating = false;
      this.loupeZooming = false;
      this.lastPointerAngle = null;
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
    const rect = this.renderer.domElement.getBoundingClientRect();
    return screenToImagePixel(
      clientX,
      clientY,
      { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      this.imageWidth,
      this.imageHeight,
      {
        zoom: this.zoom,
        panX: this.panX,
        panY: this.panY,
        rotation: this.rotation,
        flipX: this.flipX,
        flipY: this.flipY,
      },
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

  private layout(): void {
    const rect = this.container.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.renderer.setPixelRatio(dpr);
    this.material.uniforms["uPixelRatio"]!.value = dpr;
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
    this.plane.scale.set(
      this.imageWidth * this.zoom * (this.flipX ? -1 : 1),
      this.imageHeight * this.zoom * (this.flipY ? -1 : 1),
      1,
    );
    this.plane.rotation.z = -this.rotation;
    this.plane.position.set(this.panX, -this.panY, 0);
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
      cursorX: this.cursor === null ? null : this.cursor.x,
      cursorY: this.cursor === null ? null : this.cursor.y,
    });
  }

  readPixel(x: number, y: number): GnumarusRgba | null {
    return getPixel(this.buffer, this.imageWidth, this.imageHeight, x, y);
  }
}
