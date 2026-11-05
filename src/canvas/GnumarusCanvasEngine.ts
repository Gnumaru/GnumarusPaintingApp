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
import { clampZoom, screenToImagePixel } from "./GnumarusViewportMath";

export interface GnumarusEngineStats {
  width: number;
  height: number;
  zoom: number;
  cursorX: number | null;
  cursorY: number | null;
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
  private color: GnumarusRgba = { r: 0, g: 0, b: 0, a: 255 };
  private drawing = false;
  private panning = false;
  private spaceDown = false;
  private lastPixel: { x: number; y: number } | null = null;
  private cursor: { x: number; y: number } | null = null;
  private disposed = false;
  private readonly onStats: (stats: GnumarusEngineStats) => void;
  private readonly onPixelsChanged: () => void;

  constructor(
    container: HTMLElement,
    options: { onStats: (stats: GnumarusEngineStats) => void; onPixelsChanged: () => void },
  ) {
    this.container = container;
    this.onStats = options.onStats;
    this.onPixelsChanged = options.onPixelsChanged;
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
        uCheckerPx: { value: 12 },
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
        "uniform float uCheckerPx;",
        "void main() {",
        "  vec4 tex = texture2D(uMap, vUv);",
        "  vec2 grid = floor(gl_FragCoord.xy / uCheckerPx);",
        "  float c = mod(grid.x + grid.y, 2.0);",
        "  vec3 check = mix(vec3(0.78), vec3(0.58), c);",
        "  vec3 rgb = mix(check, tex.rgb, tex.a);",
        "  gl_FragColor = vec4(rgb, 1.0);",
        "}",
      ].join("\n"),
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

  newProject(width: number, height: number): void {
    this.imageWidth = width;
    this.imageHeight = height;
    this.buffer = createPixelBuffer(width, height);
    this.texture.image = { data: this.buffer, width, height };
    this.texture.needsUpdate = true;
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
    this.layoutScene();
    this.render();
    this.emitStats();
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
      if (event.button === 1 || this.spaceDown) {
        this.panning = true;
        canvas.setPointerCapture(event.pointerId);
        return;
      }
      if (event.button !== 0) {
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
        const rect = canvas.getBoundingClientRect();
        const before = this.toImagePixel(event.clientX, event.clientY);
        const factor = event.deltaY < 0 ? 1.25 : 0.8;
        this.zoom = clampZoom(this.zoom * factor);
        if (before !== null) {
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          this.panX = event.clientX - centerX - (before.x + 0.5 - this.imageWidth / 2) * this.zoom;
          this.panY = event.clientY - centerY - (before.y + 0.5 - this.imageHeight / 2) * this.zoom;
        }
        this.layoutScene();
        this.render();
        this.emitStats();
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
      if (event.ctrlKey && event.altKey && !event.metaKey) {
        const target = event.target;
        if (
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target instanceof HTMLSelectElement
        ) {
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
      { zoom: this.zoom, panX: this.panX, panY: this.panY },
    );
  }

  private layout(): void {
    const rect = this.container.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.renderer.setPixelRatio(dpr);
    this.material.uniforms["uCheckerPx"]!.value = 12 * dpr;
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
    this.plane.scale.set(this.imageWidth * this.zoom, this.imageHeight * this.zoom, 1);
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
      cursorX: this.cursor === null ? null : this.cursor.x,
      cursorY: this.cursor === null ? null : this.cursor.y,
    });
  }

  readPixel(x: number, y: number): GnumarusRgba | null {
    return getPixel(this.buffer, this.imageWidth, this.imageHeight, x, y);
  }
}
