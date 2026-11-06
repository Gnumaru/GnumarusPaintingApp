import * as THREE from "three";
import {
  applyCoverageMask,
  clearPixelBuffer,
  clampBrushSizeFloat,
  clampLayerDim,
  compositePixelOver,
  createPixelBuffer,
  drawCubicBezier,
  drawCubicBezierCoverage,
  drawLineSegment,
  floodFill,
  getPixel,
  parseBrushShape,
  parseBlendMode,
  parseChannelLock,
  parseHexColor,
  resizePixelBuffer,
  setPixel,
  stampSegmentCoverage,
  type GnumarusBlendMode,
  type GnumarusBrushShape,
  type GnumarusChannelLock,
  type GnumarusRgba,
} from "./GnumarusPixelBuffer";
import {
  GnumarusPixelPerfectStroke,
  walkBresenhamLinePixels,
  walkCubicBezierPixels,
} from "./GnumarusPixelPerfect";
import {
  GNUMARUS_DEFAULT_FOLLOW_STRENGTH,
  GNUMARUS_DEFAULT_ROPE_LENGTH,
  GNUMARUS_DEFAULT_STABILIZER_MODE,
  clampFollowStrength,
  clampRopeLength,
  parseStabilizerMode,
  stabilizerDistance,
  stabilizerFollowStep,
  stabilizerRopeStep,
  type GnumarusStabilizerMode,
} from "./GnumarusStabilizer";
import {
  clampZoom,
  IDENTITY_LAYER_TRANSFORM,
  layerImageToProject,
  layerPixelCenterToProject,
  normalizeRotation,
  projectToLayerPixel,
  projectToScreen,
  rotatedBounds,
  screenToLayerPixel,
  screenToProject,
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
  clampGridMinZoom,
  DEFAULT_GRID_SETTINGS,
  shouldShowPixelGrid,
} from "../settings/GnumarusGridSettings";
import {
  clampRotationStepDeg,
  DEFAULT_ROTATION_SETTINGS,
} from "../settings/GnumarusRotationSettings";
import {
  animationCellKey,
  clampFrameDurationMs,
  defaultFrameName,
  effectiveFrameDurationMs,
  ensureFrameNames,
  GNUMARUS_DEFAULT_FRAME_DURATION_MS,
  insertFrameCells,
  insertFrameDurations,
  insertFrameNames,
  normalizeFrameName,
  resolveAnimationFrame,
  swapFrameCells,
  swapFrameDurations,
  swapFrameNames,
  type GnumarusResolvedCell,
  type GnumarusTexturePixels,
} from "../animation/GnumarusAnimationModel";
import {
  DEFAULT_BACKGROUND_SETTINGS,
  type GnumarusBackgroundMode,
  type GnumarusBackgroundSettings,
} from "../settings/GnumarusBackgroundSettings";
import { rgbaBytesToHex } from "../color/GnumarusColorModels";
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

export type GnumarusCanvasTool = "pencil" | "bucket" | "line" | "curve" | "loupe" | "transform" | "eyedropper";

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
  /** Texture id currently shown, or null when the active cell is empty. */
  renderTextureId: string | null;
}

/** Stored pixel pool entry: one per layer plus any textures created later. */
interface GnumarusTextureEntry {
  id: string;
  name: string;
  width: number;
  height: number;
  buffer: Uint8ClampedArray;
}

/** Shareable cell content: optional texture plus per-cell transform settings. */
interface GnumarusCellContent {
  id: string;
  name: string;
  textureId: string | null;
  transform: GnumarusLayerTransform;
}

export interface GnumarusMatrixCellView {
  layerId: string;
  frame: number;
  contentId: string | null;
  contentName: string | null;
  hasTexture: boolean;
}

export interface GnumarusMatrixRowView {
  layerId: string;
  layerName: string;
  cells: GnumarusMatrixCellView[];
}

export interface GnumarusAnimationMatrixView {
  frameCount: number;
  currentFrame: number;
  activeLayerId: string;
  frameNames: string[];
  rows: GnumarusMatrixRowView[];
  contents: Array<{
    id: string;
    name: string;
    textureId: string | null;
    width: number;
    height: number;
    transform: GnumarusLayerTransform;
  }>;
  textures: Array<{ id: string; name: string; width: number; height: number }>;
}

export interface GnumarusAnimationProjectData {
  layers: Array<{
    id: string;
    name: string;
    visible: boolean;
    opacity: number;
    lockedChannels: GnumarusChannelLock;
  }>;
  textures: GnumarusTexturePixels[];
  contents: Array<{ id: string; name: string; textureId: string | null; transform: GnumarusLayerTransform }>;
  cells: Array<{ layer: string; frame: number; content: string }>;
  frames: number;
  currentFrame: number;
  defaultFrameDuration: number;
  frameDurations: Array<{ frame: number; duration: number }>;
  frameNames: string[];
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
  "uniform vec3 uSolidColor;",
  "void main() {",
  "  if (uMode > 1.5) {",
  "    gl_FragColor = vec4(uSolidColor, 1.0);",
  "    return;",
  "  }",
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

export const GRID_FRAGMENT_SHADER = [
  "precision highp float;",
  "varying vec2 vUv;",
  "uniform float uLayerW;",
  "uniform float uLayerH;",
  "void main() {",
  "  if (uLayerW < 1.0 || uLayerH < 1.0) { discard; }",
  "  vec2 coord = vec2(vUv.x * uLayerW, vUv.y * uLayerH);",
  "  vec2 fw = fwidth(coord);",
  "  vec2 g = abs(fract(coord - 0.5) - 0.5) / max(fw, vec2(1e-4));",
  "  float line = 1.0 - min(min(g.x, g.y), 1.0);",
  "  if (line < 0.02) { discard; }",
  "  gl_FragColor = vec4(1.0, 1.0, 1.0, line * 0.45);",
  "}",
].join("\n");

export type GnumarusSizedTool = "pencil" | "line" | "curve";
export type GnumarusToolSizeKind = "brush" | "line" | "curve";

export interface GnumarusEngineOptions {
  onStats: (stats: GnumarusEngineStats) => void;
  onPixelsChanged: () => void;
  onToolChanged?: (tool: GnumarusCanvasTool) => void;
  onLayersChanged?: () => void;
  onToolSizeChanged?: (kind: GnumarusToolSizeKind, size: number) => void;
  onEyedropperPick?: (hex: string) => void;
  checker?: GnumarusCheckerSettings;
  gridMinZoom?: number;
  background?: GnumarusBackgroundSettings;
}

/** Screen pixels of horizontal drag per tool-size unit for shift-drag resizing. */
export const GNUMARUS_SIZE_DRAG_PX_PER_UNIT = 20;

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
  private textures = new Map<string, GnumarusTextureEntry>();
  private contents = new Map<string, GnumarusCellContent>();
  private cells = new Map<string, string>();
  private frameCount = 1;
  private currentFrame = 0;
  private frameDurations = new Map<number, number>();
  private defaultFrameDuration = GNUMARUS_DEFAULT_FRAME_DURATION_MS;
  private frameNames: string[] = [defaultFrameName(0)];
  private frameNameCounter = 2;
  private contentCounter = 1;
  private textureCounter = 1;
  private imageWidth: number;
  private imageHeight: number;
  private zoom: number;
  private panX = 0;
  private panY = 0;
  private rotation = 0;
  private rotationStepDeg = DEFAULT_ROTATION_SETTINGS.stepDeg;
  private flipX = false;
  private flipY = false;
  private tool: GnumarusCanvasTool = "pencil";
  /** Previous tool while Ctrl temporarily holds the eyedropper, or null. */
  private toolBeforeEyedropper: GnumarusCanvasTool | null = null;
  private tempEyedropper = false;
  private rotating = false;
  private lastPointerAngle: number | null = null;
  private loupeZooming = false;
  private loupeAnchor: { x: number; y: number } | null = null;
  private transforming = false;
  private transformStart: { clientX: number; clientY: number; x: number; y: number } | null = null;
  private transformRotating = false;
  private transformLastAngle: number | null = null;
  private color: GnumarusRgba = { r: 0, g: 0, b: 0, a: 255 };
  private blendMode: GnumarusBlendMode = "normal";
  private blendBeforeEraser: GnumarusBlendMode = "normal";
  private accumulate = true;
  private brushSize = 1;
  private brushShape: GnumarusBrushShape = "square";
  private pencilAntialias = false;
  private pencilPixelPerfect = false;
  private curvePixelPerfect = false;
  private readonly pencilPixelPerfectStroke = new GnumarusPixelPerfectStroke();
  private stabilizerMode: GnumarusStabilizerMode = GNUMARUS_DEFAULT_STABILIZER_MODE;
  private ropeLength = GNUMARUS_DEFAULT_ROPE_LENGTH;
  private followStrength = GNUMARUS_DEFAULT_FOLLOW_STRENGTH;
  private stabilizerPos: { x: number; y: number } | null = null;
  private stabilizerTarget: { x: number; y: number } | null = null;
  private followLoopId: number | null = null;
  private lineWidth = 1;
  private lineShape: GnumarusBrushShape = "square";
  private lineAntialias = false;
  private lineAnchor: { x: number; y: number; clientX: number; clientY: number } | null = null;
  private curveWidth = 1;
  private curveShape: GnumarusBrushShape = "square";
  private curveAntialias = false;
  private curvePhase: "idle" | "dragging" | "awaitC1" | "awaitC2" = "idle";
  private curveP0: { x: number; y: number; clientX: number; clientY: number } | null = null;
  private curveP3: { x: number; y: number; clientX: number; clientY: number } | null = null;
  private curveC1: { x: number; y: number; clientX: number; clientY: number } | null = null;
  private curveDragCurrent: { x: number; y: number; clientX: number; clientY: number } | null = null;
  private lastMouseClient: { x: number; y: number } | null = null;
  private readonly previewTip: HTMLDivElement;
  private readonly previewStabilizer: HTMLDivElement;
  private readonly previewSvg: SVGSVGElement;
  private readonly previewLine: SVGLineElement;
  private readonly previewCurve: SVGPathElement;
  private readonly previewHandleA: SVGLineElement;
  private readonly previewHandleB: SVGLineElement;
  private readonly previewStabilizerLine: SVGLineElement;
  private readonly previewMarkers: SVGCircleElement[];
  private drawing = false;
  private panning = false;
  private spaceDown = false;
  /** Shift+Left-drag tool-size gesture state (pencil/line/curve only). */
  private sizeDrag: { tool: GnumarusSizedTool; startClientX: number; startSize: number } | null = null;
  private strokeBase: Uint8ClampedArray | null = null;
  private strokeLayerId: string | null = null;
  /** Coverage mask for non-accumulating pencil strokes (union semantics). */
  private strokeMask: Uint8Array | null = null;
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
  private backgroundMode: GnumarusBackgroundMode;
  private backgroundColor: string;
  private readonly backgroundColorVec: THREE.Vector3;
  private gridMinZoom: number;
  private readonly gridMaterial: THREE.ShaderMaterial;
  private readonly gridPlane: THREE.Mesh;
  private readonly onStats: (stats: GnumarusEngineStats) => void;
  private readonly onPixelsChanged: () => void;
  private readonly onToolChanged: ((tool: GnumarusCanvasTool) => void) | undefined;
  private readonly onLayersChanged: (() => void) | undefined;
  private readonly onToolSizeChanged: ((kind: GnumarusToolSizeKind, size: number) => void) | undefined;
  private readonly onEyedropperPick: ((hex: string) => void) | undefined;

  constructor(container: HTMLElement, options: GnumarusEngineOptions) {
    this.container = container;
    this.onStats = options.onStats;
    this.onPixelsChanged = options.onPixelsChanged;
    this.onToolChanged = options.onToolChanged;
    this.onLayersChanged = options.onLayersChanged;
    this.onToolSizeChanged = options.onToolSizeChanged;
    this.onEyedropperPick = options.onEyedropperPick;
    const initialChecker = options.checker ?? DEFAULT_CHECKER_SETTINGS;
    this.checkerMode = initialChecker.mode;
    this.checkerSizeX = clampCheckerSize(initialChecker.sizeX);
    this.checkerSizeY = clampCheckerSize(initialChecker.sizeY);
    this.checkerColorA = initialChecker.colorA;
    this.checkerColorB = initialChecker.colorB;
    this.checkerColorAVec = checkerHexToVec(initialChecker.colorA);
    this.checkerColorBVec = checkerHexToVec(initialChecker.colorB);
    const initialBackground = options.background ?? DEFAULT_BACKGROUND_SETTINGS;
    this.backgroundMode = initialBackground.mode === "solid" ? "solid" : "checkerboard";
    this.backgroundColor = initialBackground.color;
    this.backgroundColorVec = checkerHexToVec(initialBackground.color);
    this.gridMinZoom = clampGridMinZoom(options.gridMinZoom ?? DEFAULT_GRID_SETTINGS.minZoom);
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
    this.previewTip = document.createElement("div");
    this.previewTip.setAttribute("data-testid", "brush-preview");
    this.previewTip.style.position = "absolute";
    this.previewTip.style.pointerEvents = "none";
    this.previewTip.style.display = "none";
    this.previewTip.style.border = "1px solid #ffffff";
    this.previewTip.style.boxShadow = "0 0 0 1px #000000";
    this.previewTip.style.boxSizing = "border-box";
    this.previewTip.style.zIndex = "5";
    container.appendChild(this.previewTip);
    this.previewStabilizer = document.createElement("div");
    this.previewStabilizer.setAttribute("data-testid", "stabilizer-preview");
    this.previewStabilizer.style.position = "absolute";
    this.previewStabilizer.style.pointerEvents = "none";
    this.previewStabilizer.style.display = "none";
    this.previewStabilizer.style.width = "10px";
    this.previewStabilizer.style.height = "10px";
    this.previewStabilizer.style.border = "2px solid #00e5ff";
    this.previewStabilizer.style.borderRadius = "50%";
    this.previewStabilizer.style.boxShadow = "0 0 0 1px #000000";
    this.previewStabilizer.style.boxSizing = "border-box";
    this.previewStabilizer.style.zIndex = "7";
    container.appendChild(this.previewStabilizer);
    this.previewSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.previewSvg.setAttribute("data-testid", "line-preview");
    this.previewSvg.style.position = "absolute";
    this.previewSvg.style.inset = "0";
    this.previewSvg.style.width = "100%";
    this.previewSvg.style.height = "100%";
    this.previewSvg.style.pointerEvents = "none";
    this.previewSvg.style.display = "none";
    this.previewSvg.style.zIndex = "6";
    this.previewSvg.style.overflow = "visible";
    this.previewLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    this.previewLine.setAttribute("fill", "none");
    this.previewLine.setAttribute("opacity", "0.9");
    this.previewSvg.appendChild(this.previewLine);
    this.previewCurve = document.createElementNS("http://www.w3.org/2000/svg", "path");
    this.previewCurve.setAttribute("data-testid", "curve-preview");
    this.previewCurve.setAttribute("fill", "none");
    this.previewCurve.setAttribute("opacity", "0.9");
    this.previewSvg.appendChild(this.previewCurve);
    const makeHandle = (testId: string): SVGLineElement => {
      const handle = document.createElementNS("http://www.w3.org/2000/svg", "line");
      handle.setAttribute("data-testid", testId);
      handle.setAttribute("stroke", "#ffffff");
      handle.setAttribute("stroke-width", "1");
      handle.setAttribute("opacity", "0.85");
      this.previewSvg.appendChild(handle);
      return handle;
    };
    this.previewHandleA = makeHandle("curve-handle-a");
    this.previewHandleB = makeHandle("curve-handle-b");
    this.previewStabilizerLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    this.previewStabilizerLine.setAttribute("data-testid", "stabilizer-rope");
    this.previewStabilizerLine.setAttribute("stroke", "#00e5ff");
    this.previewStabilizerLine.setAttribute("stroke-width", "1");
    this.previewStabilizerLine.setAttribute("stroke-dasharray", "4 3");
    this.previewStabilizerLine.setAttribute("opacity", "0.9");
    this.previewStabilizerLine.style.display = "none";
    this.previewSvg.appendChild(this.previewStabilizerLine);
    this.previewMarkers = [];
    for (let i = 0; i < 4; i += 1) {
      const marker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      marker.setAttribute("data-testid", `curve-point-${i}`);
      marker.setAttribute("r", "3.5");
      marker.setAttribute("fill", "#ffffff");
      marker.setAttribute("stroke", "#000000");
      marker.setAttribute("stroke-width", "1");
      marker.setAttribute("opacity", "0.95");
      this.previewSvg.appendChild(marker);
      this.previewMarkers.push(marker);
    }
    container.appendChild(this.previewSvg);

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);
    this.camera.position.set(0, 0, 1);
    this.camera.lookAt(0, 0, 0);

    this.sharedGeometry = new THREE.PlaneGeometry(1, 1);
    this.backgroundMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uImageW: { value: this.imageWidth },
        uImageH: { value: this.imageHeight },
        uMode: { value: this.backgroundMode === "solid" ? 2 : this.checkerMode === "screen" ? 1 : 0 },
        uSizeX: { value: this.checkerSizeX },
        uSizeY: { value: this.checkerSizeY },
        uPixelRatio: { value: 1 },
        uColorA: { value: this.checkerColorAVec },
        uColorB: { value: this.checkerColorBVec },
        uSolidColor: { value: this.backgroundColorVec },
      },
      vertexShader: LAYER_VERTEX_SHADER,
      fragmentShader: CHECKER_FRAGMENT_SHADER,
      side: THREE.DoubleSide,
    });
    this.backgroundPlane = new THREE.Mesh(this.sharedGeometry, this.backgroundMaterial);
    this.backgroundPlane.matrixAutoUpdate = false;
    this.backgroundPlane.renderOrder = -1;
    this.scene.add(this.backgroundPlane);
    this.gridMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uLayerW: { value: 64 },
        uLayerH: { value: 64 },
      },
      vertexShader: LAYER_VERTEX_SHADER,
      fragmentShader: GRID_FRAGMENT_SHADER,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
    });
    this.gridPlane = new THREE.Mesh(this.sharedGeometry, this.gridMaterial);
    this.gridPlane.matrixAutoUpdate = false;
    this.gridPlane.renderOrder = 1000;
    this.gridPlane.visible = false;
    this.scene.add(this.gridPlane);
    const first = this.createLayerInternal("layer0", "Layer 1", true, 1, createPixelBuffer(64, 64), 64, 64, {
      ...IDENTITY_LAYER_TRANSFORM,
    });
    this.layers.push(first);
    this.activeLayerId = first.id;
    this.layerCounter = 1;
    this.textures.set("layer0", {
      id: "layer0",
      name: "Layer 1 pixels",
      width: 64,
      height: 64,
      buffer: first.buffer,
    });
    this.contents.set("content1", {
      id: "content1",
      name: "Content 1",
      textureId: "layer0",
      transform: { ...IDENTITY_LAYER_TRANSFORM },
    });
    this.cells.set(animationCellKey("layer0", 0), "content1");
    this.frameCount = 1;
    this.currentFrame = 0;
    this.frameNames = [defaultFrameName(0)];
    this.frameNameCounter = 2;
    this.contentCounter = 2;
    this.textureCounter = 1;
    this.syncAllLayerRenders();

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
      renderTextureId: null,
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

  private historyTextureFor(id: string): { buffer: Uint8ClampedArray; width: number } | null {
    const entry = this.textures.get(id);
    if (entry === undefined) {
      return null;
    }
    return { buffer: entry.buffer, width: entry.width };
  }

  private resolveFrame(): Map<string, GnumarusResolvedCell> {
    const textures = new Map<string, { width: number; height: number; buffer: Uint8ClampedArray }>();
    for (const [id, entry] of this.textures) {
      textures.set(id, { width: entry.width, height: entry.height, buffer: entry.buffer });
    }
    const contents = new Map<string, { textureId: string | null; transform: GnumarusLayerTransform }>();
    for (const [id, content] of this.contents) {
      contents.set(id, { textureId: content.textureId, transform: content.transform });
    }
    return resolveAnimationFrame(
      this.layers.map((layer) => layer.id),
      textures,
      contents,
      this.cells,
      this.currentFrame,
    );
  }

  /** Point one layer render at its current-frame cell (shared buffer refs, no copies). */
  private syncLayerRender(layer: GnumarusLayer): void {
    const resolved = this.resolveFrame().get(layer.id);
    if (resolved === undefined || resolved.textureId === null || resolved.buffer === null) {
      layer.buffer = new Uint8ClampedArray(0);
      layer.width = 0;
      layer.height = 0;
      layer.transform = { ...IDENTITY_LAYER_TRANSFORM };
      layer.renderTextureId = null;
      layer.plane.visible = false;
      return;
    }
    const texId = resolved.textureId;
    const image = layer.texture.image;
    if (layer.renderTextureId !== texId || image.data !== resolved.buffer || image.width !== resolved.width || image.height !== resolved.height) {
      layer.texture.dispose();
      const texture = new THREE.DataTexture(resolved.buffer, resolved.width, resolved.height);
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;
      texture.generateMipmaps = false;
      texture.flipY = true;
      texture.needsUpdate = true;
      layer.texture = texture;
      layer.material.uniforms["uMap"]!.value = texture;
    }
    layer.buffer = resolved.buffer;
    layer.width = resolved.width;
    layer.height = resolved.height;
    layer.transform = { ...resolved.transform };
    layer.renderTextureId = texId;
    layer.plane.visible = layer.visible;
  }

  private syncAllLayerRenders(): void {
    for (const layer of this.layers) {
      this.syncLayerRender(layer);
    }
  }

  private markTextureViewsDirty(textureId: string): void {
    for (const layer of this.layers) {
      if (layer.renderTextureId === textureId) {
        layer.texture.needsUpdate = true;
      }
    }
  }

  private nextContentId(): string {
    return `content${this.contentCounter++}`;
  }

  private nextTextureId(): string {
    return `tex${this.textureCounter++}`;
  }

  private contentDisplaySize(content: GnumarusCellContent): { width: number; height: number } {
    if (content.textureId === null) {
      return { width: 0, height: 0 };
    }
    const tex = this.textures.get(content.textureId);
    if (tex === undefined) {
      return { width: 0, height: 0 };
    }
    return { width: tex.width, height: tex.height };
  }

  getFrameCount(): number {
    return this.frameCount;
  }

  getCurrentFrame(): number {
    return this.currentFrame;
  }

  setCurrentFrame(frame: number): boolean {
    if (!Number.isInteger(frame) || frame < 0 || frame >= this.frameCount) {
      return false;
    }
    if (frame === this.currentFrame) {
      return false;
    }
    this.currentFrame = frame;
    this.stabilizerPos = null;
    this.stabilizerTarget = null;
    this.stopFollowLoop();
    this.resetPencilPixelPerfect();
    this.syncAllLayerRenders();
    this.refreshLayerStacking();
    this.render();
    this.emitStats();
    this.onLayersChanged?.();
    return true;
  }

  addFrame(): number {
    return this.insertFrame(this.frameCount);
  }

  /**
   * Insert an empty frame at position `at`, shifting that frame and later
   * ones up by one slot (cells, names and explicit durations follow). Selects the
   * new frame. Returns the new frame index, or -1 for invalid positions.
   */
  insertFrame(at: number): number {
    if (!Number.isInteger(at) || at < 0 || at > this.frameCount) {
      return -1;
    }
    const name = `Frame ${this.frameNameCounter++}`;
    this.cells = insertFrameCells(this.cells, at);
    this.frameDurations = insertFrameDurations(this.frameDurations, at);
    this.frameNames = insertFrameNames(this.frameNames, at, name);
    this.frameCount += 1;
    this.currentFrame = at;
    this.stabilizerPos = null;
    this.stabilizerTarget = null;
    this.stopFollowLoop();
    this.resetPencilPixelPerfect();
    this.syncAllLayerRenders();
    this.refreshLayerStacking();
    this.render();
    this.emitStats();
    this.onLayersChanged?.();
    return this.currentFrame;
  }

  /**
   * Move one frame left (-1) or right (+1), wrapping around the ends.
   * Selection follows the moved frame. Returns false for invalid frames
   * and single-frame projects.
   */
  moveFrame(frame: number, direction: 1 | -1): boolean {
    if (!Number.isInteger(frame) || frame < 0 || frame >= this.frameCount || this.frameCount <= 1) {
      return false;
    }
    const target = (frame + direction + this.frameCount) % this.frameCount;
    if (target === frame) {
      return false;
    }
    this.cells = swapFrameCells(this.cells, frame, target);
    this.frameDurations = swapFrameDurations(this.frameDurations, frame, target);
    this.frameNames = swapFrameNames(this.frameNames, frame, target);
    this.currentFrame = target;
    this.stabilizerPos = null;
    this.stabilizerTarget = null;
    this.stopFollowLoop();
    this.resetPencilPixelPerfect();
    this.syncAllLayerRenders();
    this.refreshLayerStacking();
    this.render();
    this.emitStats();
    this.onLayersChanged?.();
    return true;
  }

  removeFrame(frame: number): boolean {
    if (this.frameCount <= 1) {
      return false;
    }
    if (!Number.isInteger(frame) || frame < 0 || frame >= this.frameCount) {
      return false;
    }
    const kept = new Map<string, string>();
    for (const [key, contentId] of this.cells) {
      const separator = key.lastIndexOf("\n");
      const layerId = key.slice(0, separator);
      const cellFrame = Number.parseInt(key.slice(separator + 1), 10);
      if (cellFrame === frame) {
        continue;
      }
      const target = cellFrame > frame ? cellFrame - 1 : cellFrame;
      kept.set(animationCellKey(layerId, target), contentId);
    }
    this.cells = kept;
    const keptDurations = new Map<number, number>();
    for (const [at, duration] of this.frameDurations) {
      if (at === frame) {
        continue;
      }
      keptDurations.set(at > frame ? at - 1 : at, duration);
    }
    this.frameDurations = keptDurations;
    this.frameNames = [...this.frameNames.slice(0, frame), ...this.frameNames.slice(frame + 1)];
    this.frameCount -= 1;
    if (this.currentFrame > frame) {
      this.currentFrame -= 1;
    } else if (this.currentFrame >= this.frameCount) {
      this.currentFrame = this.frameCount - 1;
    }
    this.stabilizerPos = null;
    this.stabilizerTarget = null;
    this.stopFollowLoop();
    this.resetPencilPixelPerfect();
    this.syncAllLayerRenders();
    this.refreshLayerStacking();
    this.render();
    this.emitStats();
    this.onLayersChanged?.();
    return true;
  }

  /** Display name for a frame index, falling back to the default when out of range. */
  getFrameName(frame: number): string {
    if (!Number.isInteger(frame) || frame < 0 || frame >= this.frameCount) {
      return defaultFrameName(frame);
    }
    return this.frameNames[frame] ?? defaultFrameName(frame);
  }

  getFrameNames(): string[] {
    return [...this.frameNames];
  }

  renameFrame(frame: number, name: string): boolean {
    if (!Number.isInteger(frame) || frame < 0 || frame >= this.frameCount) {
      return false;
    }
    const trimmed = normalizeFrameName(name);
    if (trimmed === null) {
      return false;
    }
    if (this.frameNames[frame] === trimmed) {
      return false;
    }
    this.frameNames[frame] = trimmed;
    this.emitStats();
    this.onLayersChanged?.();
    return true;
  }

  /** Explicit per-frame duration in milliseconds, or null for the project default. */
  getFrameDuration(frame: number): number | null {
    if (!Number.isInteger(frame) || frame < 0 || frame >= this.frameCount) {
      return null;
    }
    return this.frameDurations.get(frame) ?? null;
  }

  getDefaultFrameDuration(): number {
    return this.defaultFrameDuration;
  }

  getEffectiveFrameDuration(frame: number): number {
    return effectiveFrameDurationMs(this.getFrameDuration(frame), this.defaultFrameDuration);
  }

  setFrameDuration(frame: number, durationMs: number | null): boolean {
    if (!Number.isInteger(frame) || frame < 0 || frame >= this.frameCount) {
      return false;
    }
    if (durationMs === null) {
      if (!this.frameDurations.has(frame)) {
        return false;
      }
      this.frameDurations.delete(frame);
      this.onLayersChanged?.();
      this.emitStats();
      return true;
    }
    if (!Number.isFinite(durationMs)) {
      return false;
    }
    const clamped = clampFrameDurationMs(durationMs);
    if (this.frameDurations.get(frame) === clamped) {
      return false;
    }
    this.frameDurations.set(frame, clamped);
    this.onLayersChanged?.();
    this.emitStats();
    return true;
  }

  setDefaultFrameDuration(durationMs: number): boolean {
    if (!Number.isFinite(durationMs)) {
      return false;
    }
    const clamped = clampFrameDurationMs(durationMs);
    if (clamped === this.defaultFrameDuration) {
      return false;
    }
    this.defaultFrameDuration = clamped;
    this.onLayersChanged?.();
    this.emitStats();
    return true;
  }

  getCellContentId(layerId: string, frame: number): string | null {
    return this.cells.get(animationCellKey(layerId, frame)) ?? null;
  }

  getAnimationMatrix(): GnumarusAnimationMatrixView {
    const rows: GnumarusMatrixRowView[] = [...this.layers].reverse().map((layer) => ({
      layerId: layer.id,
      layerName: layer.name,
      cells: Array.from({ length: this.frameCount }, (_unused, frame) => {
        const contentId = this.cells.get(animationCellKey(layer.id, frame)) ?? null;
        const content = contentId === null ? undefined : this.contents.get(contentId);
        return {
          layerId: layer.id,
          frame,
          contentId,
          contentName: content?.name ?? null,
          hasTexture: content?.textureId !== undefined && content.textureId !== null && this.textures.has(content.textureId),
        };
      }),
    }));
    return {
      frameCount: this.frameCount,
      currentFrame: this.currentFrame,
      activeLayerId: this.activeLayerId,
      frameNames: [...this.frameNames],
      rows,
      contents: [...this.contents.values()].map((content) => {
        const size = this.contentDisplaySize(content);
        return {
          id: content.id,
          name: content.name,
          textureId: content.textureId,
          width: size.width,
          height: size.height,
          transform: { ...content.transform },
        };
      }),
      textures: [...this.textures.values()].map((texture) => ({
        id: texture.id,
        name: texture.name,
        width: texture.width,
        height: texture.height,
      })),
    };
  }

  /** Create fresh content with a new empty project-sized texture and attach it to the cell. */
  createCellContent(layerId: string, frame: number): string | null {
    if (this.findLayer(layerId) === null) {
      return null;
    }
    if (!Number.isInteger(frame) || frame < 0 || frame >= this.frameCount) {
      return null;
    }
    const textureId = this.nextTextureId();
    this.textures.set(textureId, {
      id: textureId,
      name: `Texture ${this.textureCounter - 1}`,
      width: this.imageWidth,
      height: this.imageHeight,
      buffer: createPixelBuffer(this.imageWidth, this.imageHeight),
    });
    const contentId = this.nextContentId();
    this.contents.set(contentId, {
      id: contentId,
      name: `Content ${this.contentCounter - 1}`,
      textureId,
      transform: { ...IDENTITY_LAYER_TRANSFORM },
    });
    this.cells.set(animationCellKey(layerId, frame), contentId);
    this.syncAllLayerRenders();
    this.refreshLayerStacking();
    this.render();
    this.onPixelsChanged();
    this.onLayersChanged?.();
    this.emitStats();
    return contentId;
  }

  dissociateCellContent(layerId: string, frame: number): boolean {
    const key = animationCellKey(layerId, frame);
    if (!this.cells.has(key)) {
      return false;
    }
    this.cells.delete(key);
    this.syncAllLayerRenders();
    this.refreshLayerStacking();
    this.render();
    this.onPixelsChanged();
    this.onLayersChanged?.();
    this.emitStats();
    return true;
  }

  associateCellContent(layerId: string, frame: number, contentId: string): boolean {
    if (this.findLayer(layerId) === null || !this.contents.has(contentId)) {
      return false;
    }
    if (!Number.isInteger(frame) || frame < 0 || frame >= this.frameCount) {
      return false;
    }
    const key = animationCellKey(layerId, frame);
    if (this.cells.get(key) === contentId) {
      return false;
    }
    this.cells.set(key, contentId);
    this.syncAllLayerRenders();
    this.refreshLayerStacking();
    this.render();
    this.onPixelsChanged();
    this.onLayersChanged?.();
    this.emitStats();
    return true;
  }

  dissociateContentTexture(contentId: string): boolean {
    const content = this.contents.get(contentId);
    if (content === undefined || content.textureId === null) {
      return false;
    }
    content.textureId = null;
    this.syncAllLayerRenders();
    this.refreshLayerStacking();
    this.render();
    this.onPixelsChanged();
    this.onLayersChanged?.();
    this.emitStats();
    return true;
  }

  associateContentTexture(contentId: string, textureId: string): boolean {
    const content = this.contents.get(contentId);
    if (content === undefined || !this.textures.has(textureId)) {
      return false;
    }
    if (content.textureId === textureId) {
      return false;
    }
    content.textureId = textureId;
    this.syncAllLayerRenders();
    this.refreshLayerStacking();
    this.render();
    this.onPixelsChanged();
    this.onLayersChanged?.();
    this.emitStats();
    return true;
  }

  /**
   * Ensure the cell has content backed by a texture, creating both as needed.
   * Painting and transforming an empty cell materialize it so the canvas
   * stays directly editable on any frame.
   */
  private ensureCellContent(layerId: string, frame: number): { content: GnumarusCellContent; texture: GnumarusTextureEntry } | null {
    if (this.findLayer(layerId) === null) {
      return null;
    }
    const key = animationCellKey(layerId, frame);
    let contentId = this.cells.get(key);
    let content = contentId === undefined ? undefined : this.contents.get(contentId);
    if (content === undefined) {
      const createdId = this.nextContentId();
      content = {
        id: createdId,
        name: `Content ${this.contentCounter - 1}`,
        textureId: null,
        transform: { ...IDENTITY_LAYER_TRANSFORM },
      };
      this.contents.set(createdId, content);
      this.cells.set(key, createdId);
      contentId = createdId;
    }
    let texture = content.textureId === null ? null : (this.textures.get(content.textureId) ?? null);
    if (texture === null) {
      const textureId = this.nextTextureId();
      texture = {
        id: textureId,
        name: `Texture ${this.textureCounter - 1}`,
        width: this.imageWidth,
        height: this.imageHeight,
        buffer: createPixelBuffer(this.imageWidth, this.imageHeight),
      };
      this.textures.set(textureId, texture);
      content.textureId = textureId;
    }
    return { content, texture };
  }

  exportTextures(): GnumarusLayerPixels[] {
    return [...this.textures.values()].map((texture) => ({
      id: texture.id,
      width: texture.width,
      height: texture.height,
      buffer: texture.buffer,
    }));
  }

  exportAnimationProject(): GnumarusAnimationProjectData {
    return {
      layers: this.layers.map((layer) => ({
        id: layer.id,
        name: layer.name,
        visible: layer.visible,
        opacity: layer.opacity,
        lockedChannels: { ...layer.lockedChannels },
      })),
      textures: [...this.textures.values()].map((texture) => ({
        id: texture.id,
        name: texture.name,
        width: texture.width,
        height: texture.height,
        buffer: texture.buffer,
      })),
      contents: [...this.contents.values()].map((content) => ({
        id: content.id,
        name: content.name,
        textureId: content.textureId,
        transform: { ...content.transform },
      })),
      cells: [...this.cells.entries()].map(([key, content]) => {
        const separator = key.lastIndexOf("\n");
        return { layer: key.slice(0, separator), frame: Number.parseInt(key.slice(separator + 1), 10), content };
      }),
      frames: this.frameCount,
      currentFrame: this.currentFrame,
      defaultFrameDuration: this.defaultFrameDuration,
      frameDurations: [...this.frameDurations.entries()].map(([frame, duration]) => ({ frame, duration })),
      frameNames: [...this.frameNames],
    };
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
    this.stabilizerPos = null;
    this.stabilizerTarget = null;
    this.stopFollowLoop();
    this.resetPencilPixelPerfect();
    this.updateGrid();
    this.render();
    this.updatePreviews();
    this.emitStats();
    return true;
  }

  addLayer(): string {
    return this.insertLayerAt(this.layers.length);
  }

  /** Insert a new layer immediately above the active layer and select it. */
  insertLayerAboveActive(): string {
    const index = this.layers.findIndex((layer) => layer.id === this.activeLayerId);
    const at = index < 0 ? this.layers.length : index + 1;
    return this.insertLayerAt(at);
  }

  /** Insert a new layer immediately above the given layer and select it. Null for unknown ids. */
  insertLayerAbove(id: string): string | null {
    const index = this.layers.findIndex((layer) => layer.id === id);
    if (index < 0) {
      return null;
    }
    return this.insertLayerAt(index + 1);
  }

  /** Insert a new layer immediately below the given layer and select it. Null for unknown ids. */
  insertLayerBelow(id: string): string | null {
    const index = this.layers.findIndex((layer) => layer.id === id);
    if (index < 0) {
      return null;
    }
    return this.insertLayerAt(index);
  }

  private insertLayerAt(at: number): string {
    const id = `layer${this.layerCounter}`;
    const name = `Layer ${this.layerCounter + 1}`;
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
    const clamped = Math.min(Math.max(0, Math.floor(at)), this.layers.length);
    this.layers.splice(clamped, 0, layer);
    this.textures.set(id, {
      id,
      name: `${name} pixels`,
      width: this.imageWidth,
      height: this.imageHeight,
      buffer: layer.buffer,
    });
    layer.renderTextureId = id;
    const contentId = this.nextContentId();
    this.contents.set(contentId, {
      id: contentId,
      name: `Content ${this.contentCounter - 1}`,
      textureId: id,
      transform: { ...IDENTITY_LAYER_TRANSFORM },
    });
    for (let frame = 0; frame < this.frameCount; frame += 1) {
      this.cells.set(animationCellKey(id, frame), contentId);
    }
    this.activeLayerId = id;
    this.syncAllLayerRenders();
    this.refreshLayerStacking();
    this.render();
    this.onPixelsChanged();
    this.onLayersChanged?.();
    this.emitStats();
    return id;
  }

  removeLayer(id: string): boolean {
    if (this.layers.length <= 1) {
      return false;
    }
    if (!this.removeLayerFull(id)) {
      return false;
    }
    this.refreshLayerStacking();
    this.render();
    this.emitStats();
    return true;
  }

  /** Fully remove a layer: entry, owned texture, cells; detach referencing contents. */
  private removeLayerFull(id: string): boolean {
    if (!this.removeLayerSilent(id)) {
      return false;
    }
    for (const content of this.contents.values()) {
      if (content.textureId === id) {
        content.textureId = null;
      }
    }
    for (const key of [...this.cells.keys()]) {
      if (key.startsWith(`${id}\n`)) {
        this.cells.delete(key);
      }
    }
    this.syncAllLayerRenders();
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
    this.textures.delete(id);
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
      { ...IDENTITY_LAYER_TRANSFORM },
      { ...snapshot.lockedChannels },
    );
    this.textures.set(snapshot.id, {
      id: snapshot.id,
      name: `${snapshot.name} pixels`,
      width: snapshot.width,
      height: snapshot.height,
      buffer,
    });
    layer.renderTextureId = snapshot.id;
    const at = Math.min(Math.max(0, snapshot.stackIndex), this.layers.length);
    this.layers.splice(at, 0, layer);
    for (const cell of snapshot.cells) {
      if (this.contents.has(cell.content)) {
        this.cells.set(animationCellKey(snapshot.id, cell.frame), cell.content);
      }
    }
    for (const contentId of snapshot.detachedContents) {
      const content = this.contents.get(contentId);
      if (content !== undefined) {
        content.textureId = snapshot.id;
      }
    }
    this.activeLayerId = snapshot.id;
    this.syncAllLayerRenders();
    this.refreshLayerStacking();
  }

  /**
   * Merge the layer into the one immediately below it, sampling the upper
   * layer through its own size and transform and using its opacity.
   * Operates on the current frame's resolved pixels. The removed layer's
   * cells and any contents detached from its texture are recorded so undo
   * restores them. The result is a single undoable history entry.
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
    const upperOwner = this.ownerTextureId(upper);
    const lowerOwner = this.ownerTextureId(lower);
    if (upperOwner === null || lowerOwner === null) {
      return false;
    }
    const lowerEntry = this.textures.get(lowerOwner);
    const upperEntry = this.textures.get(upperOwner);
    const ownedEntry = this.textures.get(id);
    if (lowerEntry === undefined || upperEntry === undefined || ownedEntry === undefined) {
      return false;
    }
    const base = lowerEntry.buffer.slice();
    for (let y = 0; y < lowerEntry.height; y += 1) {
      for (let x = 0; x < lowerEntry.width; x += 1) {
        const project = layerPixelCenterToProject(x, y, lowerEntry.width, lowerEntry.height, lower.transform);
        const sample = projectToLayerPixel(
          project.x,
          project.y,
          upperEntry.width,
          upperEntry.height,
          upper.transform,
        );
        if (sample === null) {
          continue;
        }
        compositePixelOver(
          lowerEntry.buffer,
          (y * lowerEntry.width + x) * 4,
          upperEntry.buffer,
          (sample.y * upperEntry.width + sample.x) * 4,
          upper.opacity,
          lower.lockedChannels,
        );
      }
    }
    const diff = computeImageDiff(base, lowerEntry.buffer, lowerEntry.width, lowerEntry.height);
    const upperCells: Array<{ frame: number; content: string }> = [];
    for (const [key, contentId] of this.cells) {
      if (key.startsWith(`${id}\n`)) {
        const separator = key.lastIndexOf("\n");
        upperCells.push({ frame: Number.parseInt(key.slice(separator + 1), 10), content: contentId });
      }
    }
    const detachedContents: string[] = [];
    for (const content of this.contents.values()) {
      if (content.textureId === id) {
        detachedContents.push(content.id);
      }
    }
    const snapshot: GnumarusMergedLayerSnapshot = {
      id: upper.id,
      name: upper.name,
      visible: upper.visible,
      opacity: upper.opacity,
      width: ownedEntry.width,
      height: ownedEntry.height,
      transform: { ...upper.transform },
      lockedChannels: { ...upper.lockedChannels },
      stackIndex: index,
      buffer: ownedEntry.buffer.slice(),
      cells: upperCells,
      detachedContents,
    };
    this.removeLayerFull(id);
    this.activeLayerId = lower.id;
    this.history.push({
      type: "merge",
      merge: { lowerLayerId: lowerOwner, lowerDiff: diff, upper: snapshot },
    });
    this.markTextureViewsDirty(lowerOwner);
    this.syncAllLayerRenders();
    this.refreshLayerStacking();
    this.render();
    this.onPixelsChanged();
    this.onLayersChanged?.();
    this.emitStats();
    return true;
  }

  /** Texture id whose pixels the layer currently renders (null when empty). */
  private ownerTextureId(layer: GnumarusLayer): string | null {
    if (layer.renderTextureId !== null && this.textures.has(layer.renderTextureId)) {
      return layer.renderTextureId;
    }
    const resolved = this.resolveFrame().get(layer.id);
    if (resolved === undefined || resolved.textureId === null || resolved.buffer === null) {
      return null;
    }
    return resolved.textureId;
  }

  renameLayer(id: string, name: string): boolean {
    const layer = this.findLayer(id);
    const trimmed = name.trim().slice(0, 64);
    if (layer === null || trimmed.length === 0) {
      return false;
    }
    layer.name = trimmed;
    const owned = this.textures.get(id);
    if (owned !== undefined) {
      owned.name = `${trimmed} pixels`;
    }
    this.emitStats();
    this.onLayersChanged?.();
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

  /** Move a layer up/down in the stack, wrapping around the ends. */
  moveLayerWrapping(id: string, direction: "up" | "down"): boolean {
    const index = this.layers.findIndex((layer) => layer.id === id);
    if (index < 0 || this.layers.length <= 1) {
      return false;
    }
    const target = direction === "up" ? index + 1 : index - 1;
    if (target >= 0 && target < this.layers.length) {
      return this.moveLayer(id, direction);
    }
    const [removed] = this.layers.splice(index, 1);
    if (removed === undefined) {
      return false;
    }
    this.layers.splice(direction === "up" ? 0 : this.layers.length, 0, removed);
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
    const ensured = this.ensureCellContent(id, this.currentFrame);
    if (ensured === null) {
      return false;
    }
    if (transform.x !== undefined) {
      ensured.content.transform.x = transform.x;
    }
    if (transform.y !== undefined) {
      ensured.content.transform.y = transform.y;
    }
    if (transform.rotation !== undefined) {
      ensured.content.transform.rotation = normalizeRotation(transform.rotation);
    }
    if (transform.flipX !== undefined) {
      ensured.content.transform.flipX = transform.flipX;
    }
    if (transform.flipY !== undefined) {
      ensured.content.transform.flipY = transform.flipY;
    }
    this.syncAllLayerRenders();
    this.layoutSceneTransforms();
    this.render();
    return true;
  }

  resetLayerTransform(id: string): boolean {
    const ensured = this.ensureCellContent(id, this.currentFrame);
    if (ensured === null) {
      return false;
    }
    ensured.content.transform = { ...IDENTITY_LAYER_TRANSFORM };
    this.syncAllLayerRenders();
    this.layoutSceneTransforms();
    this.render();
    this.emitStats();
    return true;
  }

  /** Replace a texture's pixels and refresh every layer view showing it. */
  private setTexturePixels(textureId: string, width: number, height: number, buffer: Uint8ClampedArray): boolean {
    const entry = this.textures.get(textureId);
    if (entry === undefined) {
      return false;
    }
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
      return false;
    }
    if (buffer.length !== width * height * 4) {
      return false;
    }
    entry.width = width;
    entry.height = height;
    entry.buffer = buffer;
    this.syncAllLayerRenders();
    return true;
  }

  private applyLayerResize(layerId: string, width: number, height: number, buffer: Uint8ClampedArray): boolean {
    const copy = new Uint8ClampedArray(buffer);
    if (!this.setTexturePixels(layerId, width, height, copy)) {
      return false;
    }
    return true;
  }

  /**
   * Resize a layer's own texture, preserving top-left pixels.
   * Larger dimensions expand right and down with transparent pixels.
   * Smaller dimensions crop excess right and below.
   * Returns false for unknown layers, invalid dimensions or no-op resizes.
   * Successful resizes are undoable.
   */
  resizeLayer(id: string, newWidth: number, newHeight: number): boolean {
    const entry = this.textures.get(id);
    if (entry === undefined) {
      return false;
    }
    if (!Number.isFinite(newWidth) || !Number.isFinite(newHeight)) {
      return false;
    }
    const clampedWidth = clampLayerDim(newWidth);
    const clampedHeight = clampLayerDim(newHeight);
    if (clampedWidth === entry.width && clampedHeight === entry.height) {
      return false;
    }
    const beforeWidth = entry.width;
    const beforeHeight = entry.height;
    const beforeBuffer = entry.buffer.slice();
    const nextBuffer = resizePixelBuffer(entry.buffer, entry.width, entry.height, clampedWidth, clampedHeight);
    const afterBuffer = nextBuffer.slice();
    if (!this.setTexturePixels(id, clampedWidth, clampedHeight, nextBuffer)) {
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
    this.markTextureViewsDirty(id);
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
    this.clearAllLayers();
    let maxSuffix = 0;
    for (const input of inputs) {
      const match = /^layer(\d+)$/.exec(input.id);
      if (match !== null && match[1] !== undefined) {
        maxSuffix = Math.max(maxSuffix, Number.parseInt(match[1], 10) + 1);
      }
      const copy = new Uint8ClampedArray(input.buffer);
      const layer = this.createLayerInternal(
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
      );
      this.layers.push(layer);
      this.textures.set(input.id, {
        id: input.id,
        name: `${input.name} pixels`,
        width: input.width,
        height: input.height,
        buffer: copy,
      });
      layer.renderTextureId = input.id;
      const contentId = this.nextContentId();
      this.contents.set(contentId, {
        id: contentId,
        name: `Content ${this.contentCounter - 1}`,
        textureId: input.id,
        transform: {
          ...input.transform,
          rotation: normalizeRotation(input.transform.rotation),
        },
      });
      this.cells.set(animationCellKey(input.id, 0), contentId);
    }
    const top = this.layers[this.layers.length - 1];
    if (top !== undefined) {
      this.activeLayerId = top.id;
    }
    this.layerCounter = Math.max(maxSuffix, this.layers.length);
    this.frameCount = 1;
    this.currentFrame = 0;
    this.frameNames = [defaultFrameName(0)];
    this.frameNameCounter = 2;
    this.history.clear();
    this.strokeBase = null;
    this.strokeLayerId = null;
    this.stabilizerPos = null;
    this.stabilizerTarget = null;
    this.stopFollowLoop();
    this.resetPencilPixelPerfect();
    this.syncImageUniforms();
    this.syncAllLayerRenders();
    this.refreshLayerStacking();
    this.resetView();
    this.render();
    this.emitStats();
    this.onLayersChanged?.();
  }

  loadAnimationProject(
    projectWidth: number,
    projectHeight: number,
    data: {
      layers: Array<{
        id: string;
        name: string;
        visible: boolean;
        opacity: number;
        lockedChannels: GnumarusChannelLock;
      }>;
      textures: GnumarusTexturePixels[];
      contents: Array<{ id: string; name: string; textureId: string | null; transform: GnumarusLayerTransform }>;
      cells: Array<{ layer: string; frame: number; content: string }>;
      frames: number;
      currentFrame: number;
      defaultFrameDuration?: number;
      frameDurations?: Array<{ frame: number; duration: number }>;
      frameNames?: string[];
    },
  ): void {
    if (data.layers.length === 0) {
      throw new Error("Project has no layers.");
    }
    if (!Number.isInteger(data.frames) || data.frames < 1) {
      throw new Error("Project has an invalid frame count.");
    }
    const layerIds = new Set(data.layers.map((layer) => layer.id));
    for (const texture of data.textures) {
      if (texture.buffer.length !== texture.width * texture.height * 4) {
        throw new Error(`Texture buffer size mismatch: ${texture.id}`);
      }
    }
    const textureIds = new Set(data.textures.map((texture) => texture.id));
    const contentIds = new Set<string>();
    for (const content of data.contents) {
      contentIds.add(content.id);
      if (content.textureId !== null && !textureIds.has(content.textureId)) {
        throw new Error(`Content references a missing texture: ${content.id}`);
      }
    }
    for (const cell of data.cells) {
      if (!layerIds.has(cell.layer)) {
        throw new Error(`Cell references a missing layer: ${cell.layer}`);
      }
      if (!Number.isInteger(cell.frame) || cell.frame < 0 || cell.frame >= data.frames) {
        throw new Error("Cell references an invalid frame.");
      }
      if (!contentIds.has(cell.content)) {
        throw new Error("Cell references a missing content.");
      }
    }
    this.imageWidth = Math.max(1, Math.floor(projectWidth));
    this.imageHeight = Math.max(1, Math.floor(projectHeight));
    this.clearAllLayers();
    for (const layer of data.layers) {
      const placeholder = new Uint8ClampedArray(4);
      this.layers.push(
        this.createLayerInternal(
          layer.id,
          layer.name,
          layer.visible,
          layer.opacity,
          placeholder,
          1,
          1,
          { ...IDENTITY_LAYER_TRANSFORM },
          parseChannelLock(layer.lockedChannels),
        ),
      );
    }
    for (const texture of data.textures) {
      this.textures.set(texture.id, {
        id: texture.id,
        name: texture.name,
        width: texture.width,
        height: texture.height,
        buffer: new Uint8ClampedArray(texture.buffer),
      });
    }
    for (const content of data.contents) {
      this.contents.set(content.id, {
        id: content.id,
        name: content.name,
        textureId: content.textureId,
        transform: { ...content.transform, rotation: normalizeRotation(content.transform.rotation) },
      });
    }
    for (const cell of data.cells) {
      this.cells.set(animationCellKey(cell.layer, cell.frame), cell.content);
    }
    this.frameCount = data.frames;
    this.currentFrame = Math.min(Math.max(0, Math.floor(data.currentFrame)), data.frames - 1);
    this.defaultFrameDuration = clampFrameDurationMs(data.defaultFrameDuration ?? GNUMARUS_DEFAULT_FRAME_DURATION_MS);
    this.frameNames = ensureFrameNames(data.frames, data.frameNames ?? []);
    this.frameNameCounter = data.frames + 1;
    for (const name of this.frameNames) {
      const match = /^Frame (\d+)$/.exec(name);
      if (match?.[1] !== undefined) {
        this.frameNameCounter = Math.max(this.frameNameCounter, Number.parseInt(match[1], 10) + 1);
      }
    }
    this.frameDurations = new Map<number, number>();
    for (const entry of data.frameDurations ?? []) {
      if (
        Number.isInteger(entry.frame) &&
        entry.frame >= 0 &&
        entry.frame < data.frames &&
        Number.isFinite(entry.duration)
      ) {
        this.frameDurations.set(entry.frame, clampFrameDurationMs(entry.duration));
      }
    }
    let maxLayer = 0;
    let maxContent = 0;
    let maxTexture = 0;
    for (const layer of data.layers) {
      const match = /^layer(\d+)$/.exec(layer.id);
      if (match?.[1] !== undefined) {
        maxLayer = Math.max(maxLayer, Number.parseInt(match[1], 10) + 1);
      }
    }
    for (const content of data.contents) {
      const match = /^content(\d+)$/.exec(content.id);
      if (match?.[1] !== undefined) {
        maxContent = Math.max(maxContent, Number.parseInt(match[1], 10) + 1);
      }
    }
    for (const texture of data.textures) {
      const match = /^tex(\d+)$/.exec(texture.id);
      if (match?.[1] !== undefined) {
        maxTexture = Math.max(maxTexture, Number.parseInt(match[1], 10) + 1);
      }
    }
    this.layerCounter = Math.max(maxLayer, data.layers.length);
    this.contentCounter = Math.max(maxContent, data.contents.length + 1, 1);
    this.textureCounter = Math.max(maxTexture, 1);
    const top = this.layers[this.layers.length - 1];
    if (top !== undefined) {
      this.activeLayerId = top.id;
    }
    this.history.clear();
    this.strokeBase = null;
    this.strokeLayerId = null;
    this.stabilizerPos = null;
    this.stabilizerTarget = null;
    this.stopFollowLoop();
    this.resetPencilPixelPerfect();
    this.syncImageUniforms();
    this.syncAllLayerRenders();
    this.refreshLayerStacking();
    this.resetView();
    this.render();
    this.emitStats();
    this.onLayersChanged?.();
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

  private clearAllLayers(): void {
    for (const layer of this.layers) {
      this.scene.remove(layer.plane);
      layer.material.dispose();
      layer.texture.dispose();
    }
    this.layers = [];
    this.textures.clear();
    this.contents.clear();
    this.cells.clear();
    this.lineAnchor = null;
    this.resetCurveState();
    this.stabilizerPos = null;
    this.stabilizerTarget = null;
    this.stopFollowLoop();
    this.resetPencilPixelPerfect();
    this.hidePreviews();
    this.frameDurations.clear();
    this.defaultFrameDuration = GNUMARUS_DEFAULT_FRAME_DURATION_MS;
    this.frameNames = [defaultFrameName(0)];
    this.frameNameCounter = 2;
  }

  newProject(width: number, height: number): void {
    this.imageWidth = width;
    this.imageHeight = height;
    this.clearAllLayers();
    const first = this.createLayerInternal("layer0", "Layer 1", true, 1, createPixelBuffer(width, height), width, height, {
      ...IDENTITY_LAYER_TRANSFORM,
    });
    this.layers.push(first);
    this.textures.set("layer0", {
      id: "layer0",
      name: "Layer 1 pixels",
      width,
      height,
      buffer: first.buffer,
    });
    first.renderTextureId = "layer0";
    this.contents.set("content1", {
      id: "content1",
      name: "Content 1",
      textureId: "layer0",
      transform: { ...IDENTITY_LAYER_TRANSFORM },
    });
    this.cells.set(animationCellKey("layer0", 0), "content1");
    this.activeLayerId = first.id;
    this.layerCounter = 1;
    this.contentCounter = 2;
    this.textureCounter = 1;
    this.frameCount = 1;
    this.currentFrame = 0;
    this.frameNames = [defaultFrameName(0)];
    this.frameNameCounter = 2;
    this.history.clear();
    this.strokeBase = null;
    this.strokeLayerId = null;
    this.syncImageUniforms();
    this.syncAllLayerRenders();
    this.refreshLayerStacking();
    this.resetView();
    this.render();
    this.emitStats();
    this.onLayersChanged?.();
  }

  setColor(hex: string): void {
    const parsed = parseHexColor(hex);
    if (parsed !== null) {
      this.color = parsed;
      this.updatePreviews();
    }
  }

  getBlendMode(): GnumarusBlendMode {
    return this.blendMode;
  }

  setBlendMode(mode: GnumarusBlendMode): boolean {
    const parsed = parseBlendMode(mode);
    if (parsed === this.blendMode) {
      return false;
    }
    this.blendMode = parsed;
    if (parsed !== "eraser") {
      this.blendBeforeEraser = parsed;
    }
    this.emitStats();
    this.updatePreviews();
    return true;
  }

  /** Toggle the eraser blend mode, remembering the previous non-eraser mode. */
  toggleEraserBlend(): GnumarusBlendMode {
    if (this.blendMode === "eraser") {
      this.blendMode = this.blendBeforeEraser;
    } else {
      this.blendBeforeEraser = this.blendMode;
      this.blendMode = "eraser";
    }
    this.emitStats();
    this.updatePreviews();
    return this.blendMode;
  }

  getAccumulate(): boolean {
    return this.accumulate;
  }

  setAccumulate(enabled: boolean): boolean {
    const next = enabled === true;
    if (next === this.accumulate) {
      return false;
    }
    this.accumulate = next;
    this.emitStats();
    return true;
  }

  getBrushSize(): number {
    return this.brushSize;
  }

  getBrushShape(): GnumarusBrushShape {
    return this.brushShape;
  }

  setBrushSize(size: number): boolean {
    const clamped = clampBrushSizeFloat(size);
    if (clamped === this.brushSize) {
      return false;
    }
    this.brushSize = clamped;
    this.emitStats();
    this.updatePreviews();
    return true;
  }

  setBrushShape(shape: GnumarusBrushShape): boolean {
    const parsed = parseBrushShape(shape);
    if (parsed === this.brushShape) {
      return false;
    }
    this.brushShape = parsed;
    this.emitStats();
    this.updatePreviews();
    return true;
  }

  getPencilAntialias(): boolean {
    return this.pencilAntialias;
  }

  setPencilAntialias(enabled: boolean): boolean {
    const next = enabled === true;
    if (next === this.pencilAntialias) {
      return false;
    }
    this.pencilAntialias = next;
    this.emitStats();
    this.updatePreviews();
    return true;
  }

  getPencilPixelPerfect(): boolean {
    return this.pencilPixelPerfect;
  }

  getCurvePixelPerfect(): boolean {
    return this.curvePixelPerfect;
  }

  setPencilPixelPerfect(enabled: boolean): boolean {
    const next = enabled === true;
    if (next === this.pencilPixelPerfect) {
      return false;
    }
    this.pencilPixelPerfect = next;
    this.emitStats();
    this.updatePreviews();
    return true;
  }

  setCurvePixelPerfect(enabled: boolean): boolean {
    const next = enabled === true;
    if (next === this.curvePixelPerfect) {
      return false;
    }
    this.curvePixelPerfect = next;
    this.emitStats();
    this.updatePreviews();
    return true;
  }

  /** Pixel perfect only applies at exactly 1px without anti-aliasing. */
  private pencilPixelPerfectActive(): boolean {
    return this.pencilPixelPerfect && this.brushSize === 1 && !this.pencilAntialias;
  }

  private curvePixelPerfectActive(): boolean {
    return this.curvePixelPerfect && this.curveWidth === 1 && !this.curveAntialias;
  }

  private resetPencilPixelPerfect(): void {
    this.pencilPixelPerfectStroke.reset();
  }

  getStabilizerMode(): GnumarusStabilizerMode {
    return this.stabilizerMode;
  }

  getRopeLength(): number {
    return this.ropeLength;
  }

  getFollowStrength(): number {
    return this.followStrength;
  }

  /** Current paint focus in layer-image space, or null when stabilization is idle. */
  getStabilizerPos(): { x: number; y: number } | null {
    return this.stabilizerPos === null ? null : { x: this.stabilizerPos.x, y: this.stabilizerPos.y };
  }

  setStabilizerMode(mode: GnumarusStabilizerMode): boolean {
    const parsed = parseStabilizerMode(mode);
    if (parsed === this.stabilizerMode) {
      return false;
    }
    this.stabilizerMode = parsed;
    if (parsed === "none") {
      this.stabilizerPos = null;
      this.stabilizerTarget = null;
      this.stopFollowLoop();
    }
    this.emitStats();
    this.updatePreviews();
    return true;
  }

  setRopeLength(length: number): boolean {
    const clamped = clampRopeLength(length);
    if (clamped === this.ropeLength) {
      return false;
    }
    this.ropeLength = clamped;
    this.emitStats();
    this.updatePreviews();
    return true;
  }

  setFollowStrength(strength: number): boolean {
    const clamped = clampFollowStrength(strength);
    if (clamped === this.followStrength) {
      return false;
    }
    this.followStrength = clamped;
    this.emitStats();
    this.updatePreviews();
    return true;
  }

  private isStabilizing(): boolean {
    return this.tool === "pencil" && this.stabilizerMode !== "none";
  }

  private stabilizerStep(
    current: { x: number; y: number },
    target: { x: number; y: number },
  ): { x: number; y: number } {
    if (this.stabilizerMode === "rope") {
      return stabilizerRopeStep(current, target, this.ropeLength);
    }
    if (this.stabilizerMode === "follow") {
      return stabilizerFollowStep(current, target, this.followStrength);
    }
    return { x: target.x, y: target.y };
  }

  getLineWidth(): number {
    return this.lineWidth;
  }

  getLineShape(): GnumarusBrushShape {
    return this.lineShape;
  }

  getLineAntialias(): boolean {
    return this.lineAntialias;
  }

  setLineWidth(size: number): boolean {
    const clamped = clampBrushSizeFloat(size);
    if (clamped === this.lineWidth) {
      return false;
    }
    this.lineWidth = clamped;
    this.emitStats();
    this.updatePreviews();
    return true;
  }

  setLineShape(shape: GnumarusBrushShape): boolean {
    const parsed = parseBrushShape(shape);
    if (parsed === this.lineShape) {
      return false;
    }
    this.lineShape = parsed;
    this.emitStats();
    this.updatePreviews();
    return true;
  }

  setLineAntialias(enabled: boolean): boolean {
    const next = enabled === true;
    if (next === this.lineAntialias) {
      return false;
    }
    this.lineAntialias = next;
    this.emitStats();
    this.updatePreviews();
    return true;
  }

  /** Pending line start in texture pixels, or null when no line is armed. */
  getLineAnchor(): { x: number; y: number } | null {
    return this.lineAnchor === null ? null : { x: this.lineAnchor.x, y: this.lineAnchor.y };
  }

  cancelLine(): boolean {
    if (this.lineAnchor === null) {
      return false;
    }
    this.lineAnchor = null;
    this.updatePreviews();
    return true;
  }

  getCurveWidth(): number {
    return this.curveWidth;
  }

  getCurveShape(): GnumarusBrushShape {
    return this.curveShape;
  }

  getCurveAntialias(): boolean {
    return this.curveAntialias;
  }

  setCurveWidth(size: number): boolean {
    const clamped = clampBrushSizeFloat(size);
    if (clamped === this.curveWidth) {
      return false;
    }
    this.curveWidth = clamped;
    this.emitStats();
    this.updatePreviews();
    return true;
  }

  setCurveShape(shape: GnumarusBrushShape): boolean {
    const parsed = parseBrushShape(shape);
    if (parsed === this.curveShape) {
      return false;
    }
    this.curveShape = parsed;
    this.emitStats();
    this.updatePreviews();
    return true;
  }

  setCurveAntialias(enabled: boolean): boolean {
    const next = enabled === true;
    if (next === this.curveAntialias) {
      return false;
    }
    this.curveAntialias = next;
    this.emitStats();
    this.updatePreviews();
    return true;
  }

  /** Current curve phase for tests and UI. */
  getCurvePhase(): "idle" | "dragging" | "awaitC1" | "awaitC2" {
    return this.curvePhase;
  }

  cancelCurve(): boolean {
    if (this.curvePhase === "idle") {
      return false;
    }
    this.curvePhase = "idle";
    this.curveP0 = null;
    this.curveP3 = null;
    this.curveC1 = null;
    this.curveDragCurrent = null;
    this.updatePreviews();
    return true;
  }

  /** Map a client point to continuous layer image coordinates (unbounded, may be fractional). */
  private clientToLayerImageFloat(clientX: number, clientY: number): { x: number; y: number } | null {
    const layer = this.activeLayer();
    if (layer === null || layer.width < 1 || layer.height < 1) {
      return null;
    }
    const rect = this.renderer.domElement.getBoundingClientRect();
    const project = screenToProject(
      clientX,
      clientY,
      { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      this.viewTransform(),
    );
    if (project === null) {
      return null;
    }
    const transform = layer.transform;
    const rx = project.x - transform.x;
    const ry = project.y - transform.y;
    const cos = Math.cos(transform.rotation);
    const sin = Math.sin(transform.rotation);
    const qx = cos * rx + sin * ry;
    const qy = -sin * rx + cos * ry;
    const fx = transform.flipX ? -1 : 1;
    const fy = transform.flipY ? -1 : 1;
    return { x: qx / fx + layer.width / 2, y: qy / fy + layer.height / 2 };
  }

  private resetCurveState(): void {
    this.curvePhase = "idle";
    this.curveP0 = null;
    this.curveP3 = null;
    this.curveC1 = null;
    this.curveDragCurrent = null;
  }

  /**
   * Repaint a texture from a base snapshot plus a coverage mask in one
   * uniform pass (non-accumulating strokes). The mask holds union coverage,
   * so overlapping dab regions are applied exactly once.
   */
  private repaintFromMask(
    tex: { buffer: Uint8ClampedArray; width: number; height: number },
    base: Uint8ClampedArray,
    mask: Uint8Array,
    locked: GnumarusChannelLock,
  ): void {
    tex.buffer.set(base);
    applyCoverageMask(tex.buffer, mask, tex.width, tex.height, this.color, this.blendMode, locked);
  }

  /**
   * Paint one integer pencil run `from -> to` (endpoints already quantized).
   * With pixel perfect active (exactly 1px, no AA) each Bresenham candidate
   * passes through the per-stroke filter so the line stays 1px thick:
   * elbows are eaten retroactively (restored from the stroke base snapshot
   * or cleared from the union mask) while crossings/revisits always paint.
   * Otherwise uses the standard brush/accumulate paths.
   */
  private paintPencilLine(
    tex: { buffer: Uint8ClampedArray; width: number; height: number },
    locked: GnumarusChannelLock,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
  ): void {
    if (this.pencilPixelPerfectActive()) {
      const stroke = this.pencilPixelPerfectStroke;
      const base = this.strokeBase;
      const mask = this.strokeMask;
      if (!this.accumulate && base !== null && mask !== null) {
        walkBresenhamLinePixels(x0, y0, x1, y1, (x: number, y: number): void => {
          if (!stroke.add(x, y)) {
            return;
          }
          for (const removed of stroke.drainRemoved()) {
            if (removed.x >= 0 && removed.y >= 0 && removed.x < tex.width && removed.y < tex.height) {
              mask[removed.y * tex.width + removed.x] = 0;
            }
          }
          if (x < 0 || y < 0 || x >= tex.width || y >= tex.height) {
            return;
          }
          mask[y * tex.width + x] = 255;
        });
        this.repaintFromMask(tex, base, mask, locked);
        return;
      }
      if (this.accumulate && base !== null) {
        walkBresenhamLinePixels(x0, y0, x1, y1, (x: number, y: number): void => {
          if (!stroke.add(x, y)) {
            return;
          }
          for (const removed of stroke.drainRemoved()) {
            if (removed.x >= 0 && removed.y >= 0 && removed.x < tex.width && removed.y < tex.height) {
              const at = (removed.y * tex.width + removed.x) * 4;
              tex.buffer[at] = base[at]!;
              tex.buffer[at + 1] = base[at + 1]!;
              tex.buffer[at + 2] = base[at + 2]!;
              tex.buffer[at + 3] = base[at + 3]!;
            }
          }
          setPixel(tex.buffer, tex.width, tex.height, x, y, this.color, locked, this.blendMode);
        });
        return;
      }
    }
    if (!this.accumulate && this.strokeBase !== null && this.strokeMask !== null) {
      stampSegmentCoverage(
        this.strokeMask,
        tex.width,
        tex.height,
        x0,
        y0,
        x1,
        y1,
        this.brushSize,
        this.brushShape,
        this.pencilAntialias,
      );
      this.repaintFromMask(tex, this.strokeBase, this.strokeMask, locked);
      return;
    }
    drawLineSegment(
      tex.buffer,
      tex.width,
      tex.height,
      x0,
      y0,
      x1,
      y1,
      this.brushSize,
      this.brushShape,
      this.pencilAntialias,
      this.color,
      locked,
      this.blendMode,
    );
  }

  /**
   * Paint one pixel-perfect cubic commit in rasterizer order. Walks the same
   * flattened candidate sequence `drawCubicBezier` would rasterize (aliased,
   * width 1) and paints only pixels passing a fresh per-commit filter, so
   * joints stay 1px thin while self-intersections still paint. Handles both
   * accumulate (per-pixel `setPixel`) and mask (union bits + one repaint).
   */
  private paintPixelPerfectCurve(
    tex: { buffer: Uint8ClampedArray; width: number; height: number },
    locked: GnumarusChannelLock,
    base: Uint8ClampedArray,
    p0: { x: number; y: number },
    c1: { x: number; y: number },
    c2: { x: number; y: number },
    p3: { x: number; y: number },
  ): void {
    const stroke = new GnumarusPixelPerfectStroke();
    if (!this.accumulate) {
      const mask = new Uint8Array(tex.width * tex.height);
      walkCubicBezierPixels({ p0, c1, c2, p3 }, (x: number, y: number): void => {
        if (!stroke.add(x, y)) {
          return;
        }
        for (const removed of stroke.drainRemoved()) {
          if (removed.x >= 0 && removed.y >= 0 && removed.x < tex.width && removed.y < tex.height) {
            mask[removed.y * tex.width + removed.x] = 0;
          }
        }
        if (x < 0 || y < 0 || x >= tex.width || y >= tex.height) {
          return;
        }
        mask[y * tex.width + x] = 255;
      });
      this.repaintFromMask(tex, base, mask, locked);
      return;
    }
    walkCubicBezierPixels({ p0, c1, c2, p3 }, (x: number, y: number): void => {
      if (!stroke.add(x, y)) {
        return;
      }
      for (const removed of stroke.drainRemoved()) {
        if (removed.x >= 0 && removed.y >= 0 && removed.x < tex.width && removed.y < tex.height) {
          const at = (removed.y * tex.width + removed.x) * 4;
          tex.buffer[at] = base[at]!;
          tex.buffer[at + 1] = base[at + 1]!;
          tex.buffer[at + 2] = base[at + 2]!;
          tex.buffer[at + 3] = base[at + 3]!;
        }
      }
      setPixel(tex.buffer, tex.width, tex.height, x, y, this.color, locked, this.blendMode);
    });
  }

  /**
   * Paint one stabilized pencil segment `from -> to` in layer-image space.
   * Uses the same brush/AA/blend/accumulate paths as unstabilized strokes.
   */
  private paintStabilizedSegment(
    tex: { buffer: Uint8ClampedArray; width: number; height: number },
    locked: GnumarusChannelLock,
    from: { x: number; y: number },
    to: { x: number; y: number },
  ): void {
    // Quantize like toImagePixel for the aliased path so stabilized strokes
    // land on the same pixels as unstabilized ones (pixel x covers [x, x+1)).
    const qx0 = this.pencilAntialias ? from.x : Math.floor(from.x);
    const qy0 = this.pencilAntialias ? from.y : Math.floor(from.y);
    const qx1 = this.pencilAntialias ? to.x : Math.floor(to.x);
    const qy1 = this.pencilAntialias ? to.y : Math.floor(to.y);
    if (this.pencilPixelPerfectActive()) {
      this.paintPencilLine(tex, locked, qx0, qy0, qx1, qy1);
      return;
    }
    if (!this.accumulate && this.strokeBase !== null && this.strokeMask !== null) {
      stampSegmentCoverage(
        this.strokeMask,
        tex.width,
        tex.height,
        qx0,
        qy0,
        qx1,
        qy1,
        this.brushSize,
        this.brushShape,
        this.pencilAntialias,
      );
      this.repaintFromMask(tex, this.strokeBase, this.strokeMask, locked);
      return;
    }
    // The aliased rasterizer walks integer pixels with Bresenham and only
    // terminates on integer endpoints (see drawCubicBezier).
    // The smoothed path keeps floats.
    drawLineSegment(
      tex.buffer,
      tex.width,
      tex.height,
      qx0,
      qy0,
      qx1,
      qy1,
      this.brushSize,
      this.brushShape,
      this.pencilAntialias,
      this.color,
      locked,
      this.blendMode,
    );
  }

  private stopFollowLoop(): void {
    if (this.followLoopId !== null) {
      cancelAnimationFrame(this.followLoopId);
      this.followLoopId = null;
    }
  }

  private ensureFollowLoop(): void {
    if (this.stabilizerMode !== "follow" || this.followLoopId !== null || this.disposed) {
      return;
    }
    if (this.stabilizerPos === null || this.stabilizerTarget === null) {
      return;
    }
    if (stabilizerDistance(this.stabilizerPos, this.stabilizerTarget) < 1e-3) {
      return;
    }
    this.followLoopId = requestAnimationFrame(() => {
      this.followLoopId = null;
      this.followTick();
    });
  }

  /**
   * Catch-up tick for follow mode: the paint focus keeps chasing the last
   * cursor target even between pointer events, painting while the button
   * is held and updating only the preview while hovering.
   */
  private followTick(): void {
    if (this.disposed || this.stabilizerMode !== "follow") {
      return;
    }
    const pos = this.stabilizerPos;
    const target = this.stabilizerTarget;
    if (pos === null || target === null) {
      return;
    }
    if (stabilizerDistance(pos, target) < 1e-3) {
      this.updatePreviews();
      return;
    }
    const next = stabilizerFollowStep(pos, target, this.followStrength);
    this.stabilizerPos = next;
    if (this.drawing && this.strokeLayerId !== null) {
      const layer = this.activeLayer();
      const tex = this.textures.get(this.strokeLayerId);
      if (layer !== null && tex !== undefined) {
        this.paintStabilizedSegment(tex, layer.lockedChannels, pos, next);
        this.markTextureViewsDirty(tex.id);
        this.render();
        this.onPixelsChanged();
      }
    }
    this.updatePreviews();
    this.ensureFollowLoop();
  }

  /**
   * Map a layer-image point back to client coordinates for the stabilizer
   * overlay. Returns null when the layer or view is unavailable.
   */
  private stabilizerPosToClient(point: { x: number; y: number }): { x: number; y: number } | null {
    const layer = this.activeLayer();
    if (layer === null || layer.width < 1 || layer.height < 1) {
      return null;
    }
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return null;
    }
    const project = layerImageToProject(point.x, point.y, layer.width, layer.height, layer.transform);
    return projectToScreen(
      project.x,
      project.y,
      { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      this.viewTransform(),
    );
  }

  /**
   * Draw the pending line through (x, y). When no anchor exists, arm it and
   * return 0 without drawing. Otherwise draws the segment, clears the anchor
   * and returns true when pixels changed.
   */
  commitLineTo(x: number, y: number): boolean {
    const layer = this.activeLayer();
    if (layer === null) {
      return false;
    }
    const ensured = this.ensureCellContent(layer.id, this.currentFrame);
    if (ensured === null) {
      return false;
    }
    if (
      !Number.isInteger(x) ||
      !Number.isInteger(y) ||
      x < 0 ||
      y < 0 ||
      x >= ensured.texture.width ||
      y >= ensured.texture.height
    ) {
      return false;
    }
    if (this.lineAnchor === null) {
      return false;
    }
    const tex = ensured.texture;
    const base = tex.buffer.slice();
    if (this.accumulate) {
      drawLineSegment(
        tex.buffer,
        tex.width,
        tex.height,
        this.lineAnchor.x,
        this.lineAnchor.y,
        x,
        y,
        this.lineWidth,
        this.lineShape,
        this.lineAntialias,
        this.color,
        layer.lockedChannels,
        this.blendMode,
      );
    } else {
      const mask = new Uint8Array(tex.width * tex.height);
      stampSegmentCoverage(
        mask,
        tex.width,
        tex.height,
        this.lineAnchor.x,
        this.lineAnchor.y,
        x,
        y,
        this.lineWidth,
        this.lineShape,
        this.lineAntialias,
      );
      this.repaintFromMask(tex, base, mask, layer.lockedChannels);
    }
    this.lineAnchor = null;
    const diff = computeImageDiff(base, tex.buffer, tex.width, tex.height);
    if (diff === null) {
      this.syncAllLayerRenders();
      this.refreshLayerStacking();
      this.render();
      this.updatePreviews();
      this.emitStats();
      return false;
    }
    this.history.push({ type: "stroke", layerId: tex.id, diff });
    this.syncAllLayerRenders();
    this.markTextureViewsDirty(tex.id);
    this.refreshLayerStacking();
    this.render();
    this.onPixelsChanged();
    this.onLayersChanged?.();
    this.emitStats();
    this.updatePreviews();
    return true;
  }

  /**
   * Draw the armed cubic Bezier through (x, y) as the end control point.
   * Requires start/end plus the start control point; renders the curve,
   * destroys all auxiliaries and returns true when pixels changed.
   */
  commitCurveTo(c2x: number, c2y: number): boolean {
    if (this.curvePhase !== "awaitC2") {
      return false;
    }
    const p0 = this.curveP0;
    const p3 = this.curveP3;
    const c1 = this.curveC1;
    if (p0 === null || p3 === null || c1 === null) {
      return false;
    }
    if (!Number.isFinite(c2x) || !Number.isFinite(c2y)) {
      return false;
    }
    const layer = this.activeLayer();
    if (layer === null) {
      return false;
    }
    const ensured = this.ensureCellContent(layer.id, this.currentFrame);
    if (ensured === null) {
      return false;
    }
    const tex = ensured.texture;
    const base = tex.buffer.slice();
    if (this.curvePixelPerfectActive()) {
      this.paintPixelPerfectCurve(
        tex,
        layer.lockedChannels,
        base,
        { x: p0.x, y: p0.y },
        { x: c1.x, y: c1.y },
        { x: c2x, y: c2y },
        { x: p3.x, y: p3.y },
      );
    } else if (this.accumulate) {
      drawCubicBezier(
        tex.buffer,
        tex.width,
        tex.height,
        { x: p0.x, y: p0.y },
        { x: c1.x, y: c1.y },
        { x: c2x, y: c2y },
        { x: p3.x, y: p3.y },
        this.curveWidth,
        this.curveShape,
        this.curveAntialias,
        this.color,
        layer.lockedChannels,
        this.blendMode,
      );
    } else {
      const mask = new Uint8Array(tex.width * tex.height);
      drawCubicBezierCoverage(
        mask,
        tex.width,
        tex.height,
        { x: p0.x, y: p0.y },
        { x: c1.x, y: c1.y },
        { x: c2x, y: c2y },
        { x: p3.x, y: p3.y },
        this.curveWidth,
        this.curveShape,
        this.curveAntialias,
      );
      this.repaintFromMask(tex, base, mask, layer.lockedChannels);
    }
    this.resetCurveState();
    const diff = computeImageDiff(base, tex.buffer, tex.width, tex.height);
    if (diff === null) {
      this.syncAllLayerRenders();
      this.refreshLayerStacking();
      this.render();
      this.updatePreviews();
      this.emitStats();
      return false;
    }
    this.history.push({ type: "stroke", layerId: tex.id, diff });
    this.syncAllLayerRenders();
    this.markTextureViewsDirty(tex.id);
    this.refreshLayerStacking();
    this.render();
    this.onPixelsChanged();
    this.onLayersChanged?.();
    this.emitStats();
    this.updatePreviews();
    return true;
  }

  private colorCss(): string {
    const alpha = Math.round((this.color.a / 255) * 100) / 100;
    return `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${alpha})`;
  }

  /** Position the stabilizer focus dot and rope line for the pencil tool. */
  private updateStabilizerOverlay(): void {
    const mouse = this.lastMouseClient;
    if (!this.isStabilizing() || mouse === null || this.stabilizerPos === null) {
      this.previewStabilizer.style.display = "none";
      this.previewStabilizerLine.style.display = "none";
      return;
    }
    const focusClient = this.stabilizerPosToClient(this.stabilizerPos);
    if (focusClient === null) {
      this.previewStabilizer.style.display = "none";
      this.previewStabilizerLine.style.display = "none";
      return;
    }
    const rect = this.renderer.domElement.getBoundingClientRect();
    const dotSize = 10;
    this.previewStabilizer.style.display = "block";
    this.previewStabilizer.style.left = `${focusClient.x - rect.left - dotSize / 2}px`;
    this.previewStabilizer.style.top = `${focusClient.y - rect.top - dotSize / 2}px`;
    // Rope line from the raw cursor to the paint focus; also useful for
    // follow mode as a lag indicator.
    this.previewSvg.style.display = "block";
    this.previewStabilizerLine.style.display = "block";
    this.previewStabilizerLine.setAttribute("x1", String(mouse.x - rect.left));
    this.previewStabilizerLine.setAttribute("y1", String(mouse.y - rect.top));
    this.previewStabilizerLine.setAttribute("x2", String(focusClient.x - rect.left));
    this.previewStabilizerLine.setAttribute("y2", String(focusClient.y - rect.top));
  }

  /** Refresh the brush tip and line/curve overlays for the last mouse position. */
  private updatePreviews(): void {
    if (this.disposed) {
      return;
    }
    const mouse = this.lastMouseClient;
    const showTip =
      (this.tool === "pencil" || this.tool === "line" || this.tool === "curve") && mouse !== null;
    if (!showTip || mouse === null) {
      this.previewTip.style.display = "none";
    } else {
      const rect = this.renderer.domElement.getBoundingClientRect();
      const tipSize =
        (this.tool === "pencil"
          ? this.brushSize
          : this.tool === "line"
            ? this.lineWidth
            : this.curveWidth) * this.zoom;
      const tipShape =
        this.tool === "pencil" ? this.brushShape : this.tool === "line" ? this.lineShape : this.curveShape;
      const size = Math.max(2, tipSize);
      this.previewTip.style.display = "block";
      this.previewTip.style.width = `${size}px`;
      this.previewTip.style.height = `${size}px`;
      this.previewTip.style.left = `${mouse.x - rect.left - size / 2}px`;
      this.previewTip.style.top = `${mouse.y - rect.top - size / 2}px`;
      this.previewTip.style.borderRadius = tipShape === "circle" ? "50%" : "0";
    }
    this.previewLine.removeAttribute("display");
    this.previewLine.style.display = "none";
    this.previewCurve.style.display = "none";
    this.previewHandleA.style.display = "none";
    this.previewHandleB.style.display = "none";
    this.previewStabilizerLine.style.display = "none";
    for (const marker of this.previewMarkers) {
      marker.style.display = "none";
    }
    this.updateStabilizerOverlay();
    if (mouse === null) {
      // Keep the stabilizer dot hidden when the mouse leaves; the overlay
      // helper already hid it, but the svg may still be needed for nothing.
      if (this.previewStabilizerLine.style.display !== "block") {
        this.previewSvg.style.display = "none";
      }
      return;
    }
    const rect = this.renderer.domElement.getBoundingClientRect();
    const rel = (clientX: number, clientY: number): { x: number; y: number } => ({
      x: clientX - rect.left,
      y: clientY - rect.top,
    });
    const placeMarker = (index: number, clientX: number, clientY: number): void => {
      const marker = this.previewMarkers[index];
      if (marker === undefined) {
        return;
      }
      const p = rel(clientX, clientY);
      marker.setAttribute("cx", String(p.x));
      marker.setAttribute("cy", String(p.y));
      marker.style.display = "block";
    };
    if (this.tool === "line" && this.lineAnchor !== null) {
      this.previewSvg.style.display = "block";
      this.previewLine.style.display = "block";
      this.previewLine.setAttribute("x1", String(this.lineAnchor.clientX - rect.left));
      this.previewLine.setAttribute("y1", String(this.lineAnchor.clientY - rect.top));
      this.previewLine.setAttribute("x2", String(mouse.x - rect.left));
      this.previewLine.setAttribute("y2", String(mouse.y - rect.top));
      this.previewLine.setAttribute("stroke", this.colorCss());
      this.previewLine.setAttribute("stroke-width", String(Math.max(1, this.lineWidth * this.zoom)));
      this.previewLine.setAttribute("stroke-linecap", this.lineShape === "circle" ? "round" : "butt");
      return;
    }
    if (this.tool !== "curve") {
      // Preserve the stabilizer rope overlay for the pencil tool.
      if (this.previewStabilizerLine.style.display !== "block") {
        this.previewSvg.style.display = "none";
      }
      return;
    }
    if (this.curvePhase === "dragging" && this.curveP0 !== null) {
      const current = this.curveDragCurrent;
      const endX = current === null ? mouse.x : current.clientX;
      const endY = current === null ? mouse.y : current.clientY;
      this.previewSvg.style.display = "block";
      this.previewLine.style.display = "block";
      this.previewLine.setAttribute("x1", String(this.curveP0.clientX - rect.left));
      this.previewLine.setAttribute("y1", String(this.curveP0.clientY - rect.top));
      this.previewLine.setAttribute("x2", String(endX - rect.left));
      this.previewLine.setAttribute("y2", String(endY - rect.top));
      this.previewLine.setAttribute("stroke", this.colorCss());
      this.previewLine.setAttribute("stroke-width", String(Math.max(1, this.curveWidth * this.zoom)));
      this.previewLine.setAttribute("stroke-linecap", this.curveShape === "circle" ? "round" : "butt");
      placeMarker(0, this.curveP0.clientX, this.curveP0.clientY);
      placeMarker(3, endX, endY);
      return;
    }
    if (this.curvePhase === "awaitC1" && this.curveP0 !== null && this.curveP3 !== null) {
      this.previewSvg.style.display = "block";
      const p0 = rel(this.curveP0.clientX, this.curveP0.clientY);
      const p3 = rel(this.curveP3.clientX, this.curveP3.clientY);
      const p1 = rel(mouse.x, mouse.y);
      this.previewCurve.style.display = "block";
      this.previewCurve.setAttribute(
        "d",
        `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y} ${p3.x} ${p3.y} ${p3.x} ${p3.y}`,
      );
      this.previewCurve.setAttribute("stroke", this.colorCss());
      this.previewCurve.setAttribute("stroke-width", String(Math.max(1, this.curveWidth * this.zoom)));
      this.previewCurve.setAttribute("stroke-linecap", this.curveShape === "circle" ? "round" : "butt");
      this.previewHandleA.style.display = "block";
      this.previewHandleA.setAttribute("x1", String(p0.x));
      this.previewHandleA.setAttribute("y1", String(p0.y));
      this.previewHandleA.setAttribute("x2", String(p1.x));
      this.previewHandleA.setAttribute("y2", String(p1.y));
      placeMarker(0, this.curveP0.clientX, this.curveP0.clientY);
      placeMarker(1, mouse.x, mouse.y);
      placeMarker(3, this.curveP3.clientX, this.curveP3.clientY);
      return;
    }
    if (
      this.curvePhase === "awaitC2" &&
      this.curveP0 !== null &&
      this.curveP3 !== null &&
      this.curveC1 !== null
    ) {
      this.previewSvg.style.display = "block";
      const p0 = rel(this.curveP0.clientX, this.curveP0.clientY);
      const p3 = rel(this.curveP3.clientX, this.curveP3.clientY);
      const p1 = rel(this.curveC1.clientX, this.curveC1.clientY);
      const p2 = rel(mouse.x, mouse.y);
      this.previewCurve.style.display = "block";
      this.previewCurve.setAttribute(
        "d",
        `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y} ${p2.x} ${p2.y} ${p3.x} ${p3.y}`,
      );
      this.previewCurve.setAttribute("stroke", this.colorCss());
      this.previewCurve.setAttribute("stroke-width", String(Math.max(1, this.curveWidth * this.zoom)));
      this.previewCurve.setAttribute("stroke-linecap", this.curveShape === "circle" ? "round" : "butt");
      this.previewHandleA.style.display = "block";
      this.previewHandleA.setAttribute("x1", String(p0.x));
      this.previewHandleA.setAttribute("y1", String(p0.y));
      this.previewHandleA.setAttribute("x2", String(p1.x));
      this.previewHandleA.setAttribute("y2", String(p1.y));
      this.previewHandleB.style.display = "block";
      this.previewHandleB.setAttribute("x1", String(p3.x));
      this.previewHandleB.setAttribute("y1", String(p3.y));
      this.previewHandleB.setAttribute("x2", String(p2.x));
      this.previewHandleB.setAttribute("y2", String(p2.y));
      placeMarker(0, this.curveP0.clientX, this.curveP0.clientY);
      placeMarker(1, this.curveC1.clientX, this.curveC1.clientY);
      placeMarker(2, mouse.x, mouse.y);
      placeMarker(3, this.curveP3.clientX, this.curveP3.clientY);
      return;
    }
    if (this.previewStabilizerLine.style.display !== "block") {
      this.previewSvg.style.display = "none";
    }
  }

  private hidePreviews(): void {
    this.previewTip.style.display = "none";
    this.previewStabilizer.style.display = "none";
    this.previewSvg.style.display = "none";
    this.previewLine.style.display = "none";
    this.previewCurve.style.display = "none";
    this.previewHandleA.style.display = "none";
    this.previewHandleB.style.display = "none";
    this.previewStabilizerLine.style.display = "none";
    for (const marker of this.previewMarkers) {
      marker.style.display = "none";
    }
  }

  clear(): void {
    const layer = this.activeLayer();
    if (layer === null) {
      return;
    }
    const ensured = this.ensureCellContent(layer.id, this.currentFrame);
    if (ensured === null) {
      return;
    }
    const tex = ensured.texture;
    const base = tex.buffer.slice();
    clearPixelBuffer(tex.buffer, layer.lockedChannels);
    const diff = computeImageDiff(base, tex.buffer, tex.width, tex.height);
    if (diff !== null) {
      this.history.push({ type: "stroke", layerId: tex.id, diff });
    }
    this.syncAllLayerRenders();
    this.markTextureViewsDirty(tex.id);
    this.refreshLayerStacking();
    this.render();
    this.onPixelsChanged();
    this.onLayersChanged?.();
    this.emitStats();
  }

  /**
   * Reset the current cell texture to zeros in all RGBA channels, ignoring
   * channel locks. Does not materialize empty cells. Returns true when pixels
   * changed (undoable via the same region-diff history as strokes).
   */
  clearCurrentCellTexture(): boolean {
    const layer = this.activeLayer();
    if (layer === null) {
      return false;
    }
    const contentId = this.getCellContentId(layer.id, this.currentFrame);
    if (contentId === null) {
      return false;
    }
    const content = this.contents.get(contentId);
    if (content === undefined || content.textureId === null) {
      return false;
    }
    const tex = this.textures.get(content.textureId);
    if (tex === undefined) {
      return false;
    }
    const base = tex.buffer.slice();
    tex.buffer.fill(0);
    const diff = computeImageDiff(base, tex.buffer, tex.width, tex.height);
    if (diff === null) {
      return false;
    }
    this.history.push({ type: "stroke", layerId: tex.id, diff });
    this.syncAllLayerRenders();
    this.markTextureViewsDirty(tex.id);
    this.refreshLayerStacking();
    this.render();
    this.onPixelsChanged();
    this.onLayersChanged?.();
    this.emitStats();
    return true;
  }

  /**
   * Fill the contiguous same-RGBA region at texture pixel (x, y) with the
   * current color, honoring the active layer channel locks. Materializes an
   * empty cell first. Returns the filled pixel count (0 = no-op).
   */
  bucketFillAt(x: number, y: number): number {
    const layer = this.activeLayer();
    if (layer === null) {
      return 0;
    }
    const ensured = this.ensureCellContent(layer.id, this.currentFrame);
    if (ensured === null) {
      return 0;
    }
    const tex = ensured.texture;
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= tex.width || y >= tex.height) {
      return 0;
    }
    const base = tex.buffer.slice();
    const filled = floodFill(
      tex.buffer,
      tex.width,
      tex.height,
      x,
      y,
      this.color,
      layer.lockedChannels,
      this.blendMode,
    );
    if (filled === 0) {
      return 0;
    }
    const diff = computeImageDiff(base, tex.buffer, tex.width, tex.height);
    if (diff === null) {
      return 0;
    }
    this.history.push({ type: "stroke", layerId: tex.id, diff });
    this.syncAllLayerRenders();
    this.markTextureViewsDirty(tex.id);
    this.refreshLayerStacking();
    this.render();
    this.onPixelsChanged();
    this.onLayersChanged?.();
    this.emitStats();
    return filled;
  }

  /** Fill at a client point (maps through view + layer transforms). */
  bucketFillAtClient(clientX: number, clientY: number): number {
    const pixel = this.toImagePixel(clientX, clientY);
    if (pixel === null) {
      return 0;
    }
    return this.bucketFillAt(pixel.x, pixel.y);
  }

  setZoom(zoom: number): void {
    this.zoom = clampZoom(zoom);
    this.layoutScene();
    this.render();
    this.updatePreviews();
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
    this.updatePreviews();
    this.emitStats();
  }

  setRotation(radians: number): void {
    this.rotation = normalizeRotation(radians);
    this.layoutScene();
    this.render();
    this.updatePreviews();
    this.emitStats();
  }

  getRotationStepDeg(): number {
    return this.rotationStepDeg;
  }

  setRotationStepDeg(degrees: number): boolean {
    const clamped = clampRotationStepDeg(degrees);
    if (clamped === this.rotationStepDeg) {
      return false;
    }
    this.rotationStepDeg = clamped;
    return true;
  }

  /** Rotate the canvas by degrees (clockwise-positive). */
  rotateByDegrees(degrees: number): void {
    if (!Number.isFinite(degrees) || degrees === 0) {
      return;
    }
    this.setRotation(this.rotation + (degrees * Math.PI) / 180);
  }

  /** Reset canvas rotation to zero, keeping zoom, pan and flips. */
  resetRotation(): void {
    this.setRotation(0);
  }

  /** Fit the rotated canvas bbox on screen: fit zoom plus centered pan. */
  zoomToFit(): void {
    const rect = this.container.getBoundingClientRect();
    const bounds = rotatedBounds(this.imageWidth, this.imageHeight, this.rotation);
    if (rect.width > 0 && rect.height > 0 && bounds.width > 0 && bounds.height > 0) {
      const fit = Math.min(rect.width / bounds.width, rect.height / bounds.height);
      this.zoom = clampZoom(Math.max(1, Math.floor(fit)));
    } else {
      this.zoom = 8;
    }
    this.panX = 0;
    this.panY = 0;
    this.layoutScene();
    this.render();
    this.updatePreviews();
    this.emitStats();
  }

  setFlip(flipX: boolean, flipY: boolean): void {
    this.flipX = flipX;
    this.flipY = flipY;
    this.layoutScene();
    this.render();
    this.updatePreviews();
    this.emitStats();
  }

  setTool(tool: GnumarusCanvasTool): void {
    if (this.tempEyedropper && tool !== "eyedropper") {
      // Manual tool change cancels the Ctrl-held temporary eyedropper.
      this.tempEyedropper = false;
      this.toolBeforeEyedropper = null;
    }
    this.tool = tool;
    if (tool !== "line") {
      this.lineAnchor = null;
    }
    if (tool !== "curve") {
      this.resetCurveState();
    }
    if (tool !== "pencil") {
      this.stabilizerPos = null;
      this.stabilizerTarget = null;
      this.stopFollowLoop();
    }
    this.sizeDrag = null;
    this.resetPencilPixelPerfect();
    this.updatePreviews();
    this.onToolChanged?.(tool);
  }

  getViewState(): { zoom: number; rotation: number; flipX: boolean; flipY: boolean } {
    return { zoom: this.zoom, rotation: this.rotation, flipX: this.flipX, flipY: this.flipY };
  }

  /** Holding Ctrl temporarily switches to the eyedropper, stashing the tool. */
  beginTempEyedropper(): void {
    if (this.tempEyedropper || this.tool === "eyedropper") {
      return;
    }
    this.toolBeforeEyedropper = this.tool;
    this.tempEyedropper = true;
    this.setTool("eyedropper");
  }

  /** Releasing Ctrl restores the tool stashed by `beginTempEyedropper`. */
  endTempEyedropper(): void {
    if (!this.tempEyedropper) {
      return;
    }
    const previous = this.toolBeforeEyedropper;
    this.tempEyedropper = false;
    this.toolBeforeEyedropper = null;
    if (previous !== null) {
      this.setTool(previous);
    }
  }

  /**
   * Copy the active cell pixel under the client point into the paint color.
   * Never paints, records history or materializes empty cells. Returns false
   * when there is no pixel to sample.
   */
  pickColorAt(clientX: number, clientY: number): boolean {
    const pixel = this.toImagePixel(clientX, clientY);
    if (pixel === null) {
      return false;
    }
    const layer = this.activeLayer();
    if (layer === null) {
      return false;
    }
    const sampled = getPixel(layer.buffer, layer.width, layer.height, pixel.x, pixel.y);
    if (sampled === null) {
      return false;
    }
    this.onEyedropperPick?.(
      rgbaBytesToHex({ r: sampled.r, g: sampled.g, b: sampled.b, a: sampled.a }),
    );
    return true;
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
      (layerId) => {
        this.removeLayerFull(layerId);
      },
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
    return this.historyTextureFor(layerId);
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
    this.syncBackgroundModeUniform();
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

  private syncBackgroundModeUniform(): void {
    this.backgroundMaterial.uniforms["uMode"]!.value =
      this.backgroundMode === "solid" ? 2 : this.checkerMode === "screen" ? 1 : 0;
  }

  getBackgroundSettings(): GnumarusBackgroundSettings {
    return { mode: this.backgroundMode, color: this.backgroundColor };
  }

  setBackgroundMode(mode: GnumarusBackgroundMode): void {
    this.backgroundMode = mode === "solid" ? "solid" : "checkerboard";
    this.syncBackgroundModeUniform();
    this.render();
  }

  setBackgroundColor(hex: string): void {
    const parsed = parseHexColor(hex);
    if (parsed === null) {
      return;
    }
    this.backgroundColor = hex;
    this.backgroundColorVec.set(parsed.r / 255, parsed.g / 255, parsed.b / 255);
    this.render();
  }

  applyBackgroundSettings(settings: GnumarusBackgroundSettings): void {
    this.backgroundMode = settings.mode === "solid" ? "solid" : "checkerboard";
    const parsed = parseHexColor(settings.color);
    if (parsed !== null) {
      this.backgroundColor = settings.color;
      this.backgroundColorVec.set(parsed.r / 255, parsed.g / 255, parsed.b / 255);
    }
    this.syncBackgroundModeUniform();
    this.render();
  }

  getGridMinZoom(): number {
    return this.gridMinZoom;
  }

  setGridMinZoom(value: number): void {
    this.gridMinZoom = clampGridMinZoom(value);
    this.updateGrid();
    this.render();
  }

  applyGridMinZoom(value: number): void {
    this.setGridMinZoom(value);
  }

  isPixelGridVisible(): boolean {
    return this.gridPlane.visible === true;
  }

  getGridPlaneMatrix(): number[] {
    return Array.from(this.gridPlane.matrix.elements);
  }

  getLayerPlaneMatrix(id: string): number[] | null {
    const layer = this.findLayer(id);
    if (layer === null) {
      return null;
    }
    return Array.from(layer.plane.matrix.elements);
  }

  getGridState(): { visible: boolean; minZoom: number; layerId: string | null; width: number; height: number } {
    const active = this.activeLayer();
    return {
      visible: this.gridPlane.visible === true,
      minZoom: this.gridMinZoom,
      layerId: active === null ? null : active.id,
      width: active === null ? 0 : active.width,
      height: active === null ? 0 : active.height,
    };
  }

  private updateGrid(): void {
    if (this.disposed) {
      return;
    }
    const active = this.activeLayer();
    if (active === null) {
      this.gridPlane.visible = false;
      return;
    }
    const visible = shouldShowPixelGrid(this.zoom, this.gridMinZoom);
    this.gridMaterial.uniforms["uLayerW"]!.value = active.width;
    this.gridMaterial.uniforms["uLayerH"]!.value = active.height;
    this.gridPlane.visible = visible;
    if (visible) {
      this.writePlaneMatrix(this.gridPlane, active.width, active.height, active.transform, this.layers.length * 0.01 + 0.02);
    }
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
    this.stopFollowLoop();
    this.resizeObserver.disconnect();
    this.lineAnchor = null;
    this.lastMouseClient = null;
    this.stabilizerPos = null;
    this.stabilizerTarget = null;
    this.previewTip.remove();
    this.previewStabilizer.remove();
    this.previewSvg.remove();
    for (const layer of this.layers) {
      this.scene.remove(layer.plane);
      layer.material.dispose();
      layer.texture.dispose();
    }
    this.layers = [];
    this.scene.remove(this.gridPlane);
    this.gridMaterial.dispose();
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
        if (event.altKey) {
          // Alt+middle-click resets the transform.
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
      if (
        event.shiftKey &&
        (this.tool === "pencil" || this.tool === "line" || this.tool === "curve")
      ) {
        // Shift+Left-drag resizes the active size tool from horizontal
        // movement only; no painting starts.
        const startSize =
          this.tool === "pencil" ? this.brushSize : this.tool === "line" ? this.lineWidth : this.curveWidth;
        this.sizeDrag = { tool: this.tool, startClientX: event.clientX, startSize };
        canvas.setPointerCapture(event.pointerId);
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
      if (this.tool === "bucket") {
        // Single click with the bucket tool fills the contiguous same-color region.
        const layer = this.activeLayer();
        if (layer === null) {
          return;
        }
        const ensured = this.ensureCellContent(layer.id, this.currentFrame);
        if (ensured === null) {
          return;
        }
        this.syncLayerRender(layer);
        this.refreshLayerStacking();
        const pixel = this.toImagePixel(event.clientX, event.clientY);
        if (pixel === null) {
          return;
        }
        this.bucketFillAt(pixel.x, pixel.y);
        return;
      }
      if (this.tool === "eyedropper") {
        // Single click copies the clicked pixel color into the paint color.
        this.pickColorAt(event.clientX, event.clientY);
        return;
      }
      if (this.tool === "line") {
        // Two clicks define a segment: first arms the start, second draws.
        const layer = this.activeLayer();
        if (layer === null) {
          return;
        }
        const ensured = this.ensureCellContent(layer.id, this.currentFrame);
        if (ensured === null) {
          return;
        }
        this.syncLayerRender(layer);
        this.refreshLayerStacking();
        const pixel = this.toImagePixel(event.clientX, event.clientY);
        if (pixel === null) {
          return;
        }
        if (this.lineAnchor === null) {
          this.lineAnchor = { x: pixel.x, y: pixel.y, clientX: event.clientX, clientY: event.clientY };
          this.lastMouseClient = { x: event.clientX, y: event.clientY };
          this.updatePreviews();
          return;
        }
        this.commitLineTo(pixel.x, pixel.y);
        return;
      }
      if (this.tool === "curve") {
        const layer = this.activeLayer();
        if (layer === null) {
          return;
        }
        if (this.curvePhase === "awaitC2") {
          const control = this.clientToLayerImageFloat(event.clientX, event.clientY);
          if (control === null) {
            return;
          }
          this.lastMouseClient = { x: event.clientX, y: event.clientY };
          const ensured = this.ensureCellContent(layer.id, this.currentFrame);
          if (ensured === null) {
            return;
          }
          this.syncLayerRender(layer);
          this.refreshLayerStacking();
          this.commitCurveTo(control.x, control.y);
          return;
        }
        if (this.curvePhase === "awaitC1") {
          const control = this.clientToLayerImageFloat(event.clientX, event.clientY);
          if (control === null) {
            return;
          }
          this.curveC1 = { x: control.x, y: control.y, clientX: event.clientX, clientY: event.clientY };
          this.lastMouseClient = { x: event.clientX, y: event.clientY };
          this.curvePhase = "awaitC2";
          this.updatePreviews();
          return;
        }
        if (this.curvePhase === "idle") {
          const ensured = this.ensureCellContent(layer.id, this.currentFrame);
          if (ensured === null) {
            return;
          }
          this.syncLayerRender(layer);
          this.refreshLayerStacking();
          const pixel = this.toImagePixel(event.clientX, event.clientY);
          if (pixel === null) {
            return;
          }
          this.curveP0 = { x: pixel.x, y: pixel.y, clientX: event.clientX, clientY: event.clientY };
          this.curveDragCurrent = { x: pixel.x, y: pixel.y, clientX: event.clientX, clientY: event.clientY };
          this.curveP3 = null;
          this.curveC1 = null;
          this.curvePhase = "dragging";
          this.lastMouseClient = { x: event.clientX, y: event.clientY };
          canvas.setPointerCapture(event.pointerId);
          this.updatePreviews();
          return;
        }
        return;
      }
      const layer = this.activeLayer();
      if (layer === null) {
        return;
      }
      const ensured = this.ensureCellContent(layer.id, this.currentFrame);
      if (ensured === null) {
        return;
      }
      this.syncLayerRender(layer);
      this.refreshLayerStacking();
      this.lastMouseClient = { x: event.clientX, y: event.clientY };
      if (this.isStabilizing()) {
        const pixel = this.toImagePixel(event.clientX, event.clientY);
        if (pixel === null) {
          return;
        }
        const floatPos = this.clientToLayerImageFloat(event.clientX, event.clientY);
        if (floatPos === null) {
          return;
        }
        const tex = ensured.texture;
        this.drawing = true;
        canvas.setPointerCapture(event.pointerId);
        this.lastPixel = null;
        this.stabilizerPos = { x: floatPos.x, y: floatPos.y };
        this.stabilizerTarget = { x: floatPos.x, y: floatPos.y };
        this.strokeBase = tex.buffer.slice();
        this.strokeLayerId = tex.id;
        if (!this.accumulate) {
          this.strokeMask = new Uint8Array(tex.width * tex.height);
        }
        this.resetPencilPixelPerfect();
        this.paintStabilizedSegment(tex, layer.lockedChannels, this.stabilizerPos, this.stabilizerPos);
        this.markTextureViewsDirty(tex.id);
        this.render();
        this.onPixelsChanged();
        this.onLayersChanged?.();
        this.emitStats();
        this.updatePreviews();
        return;
      }
      const pixel = this.toImagePixel(event.clientX, event.clientY);
      if (pixel === null) {
        return;
      }
      const tex = ensured.texture;
      this.drawing = true;
      canvas.setPointerCapture(event.pointerId);
      this.lastPixel = pixel;
      this.strokeBase = tex.buffer.slice();
      this.strokeLayerId = tex.id;
      if (!this.accumulate) {
        this.strokeMask = new Uint8Array(tex.width * tex.height);
      }
      this.resetPencilPixelPerfect();
      this.paintPencilLine(tex, layer.lockedChannels, pixel.x, pixel.y, pixel.x, pixel.y);
      this.markTextureViewsDirty(tex.id);
      this.render();
      this.onPixelsChanged();
      this.onLayersChanged?.();
      this.emitStats();
    });
    canvas.addEventListener("pointermove", (event: PointerEvent) => {
      const pixel = this.toImagePixel(event.clientX, event.clientY);
      this.cursor = pixel;
      this.lastMouseClient = { x: event.clientX, y: event.clientY };
      if (this.tool === "curve" && this.curvePhase === "dragging" && pixel !== null) {
        this.curveDragCurrent = {
          x: pixel.x,
          y: pixel.y,
          clientX: event.clientX,
          clientY: event.clientY,
        };
      }
      this.updatePreviews();
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
      if (this.sizeDrag !== null) {
        // Horizontal movement only: right grows, left shrinks, vertical is ignored.
        const size = clampBrushSizeFloat(
          this.sizeDrag.startSize + (event.clientX - this.sizeDrag.startClientX) / GNUMARUS_SIZE_DRAG_PX_PER_UNIT,
        );
        if (this.sizeDrag.tool === "pencil") {
          if (this.setBrushSize(size)) {
            this.onToolSizeChanged?.("brush", size);
          }
        } else if (this.sizeDrag.tool === "line") {
          if (this.setLineWidth(size)) {
            this.onToolSizeChanged?.("line", size);
          }
        } else if (this.setCurveWidth(size)) {
          this.onToolSizeChanged?.("curve", size);
        }
        return;
      }
      if (this.tool === "pencil" && this.stabilizerMode !== "none") {
        const floatTarget = this.clientToLayerImageFloat(event.clientX, event.clientY);
        if (floatTarget !== null) {
          if (this.stabilizerPos === null) {
            this.stabilizerPos = { x: floatTarget.x, y: floatTarget.y };
            this.stabilizerTarget = { x: floatTarget.x, y: floatTarget.y };
            this.updatePreviews();
          } else {
            this.stabilizerTarget = { x: floatTarget.x, y: floatTarget.y };
            const next = this.stabilizerStep(this.stabilizerPos, this.stabilizerTarget);
            if (stabilizerDistance(this.stabilizerPos, next) > 1e-9) {
              const prev = this.stabilizerPos;
              this.stabilizerPos = next;
              if (this.drawing && this.strokeLayerId !== null) {
                const layer = this.activeLayer();
                const tex = this.strokeLayerId === null ? undefined : this.textures.get(this.strokeLayerId);
                if (layer !== null && tex !== undefined) {
                  this.paintStabilizedSegment(tex, layer.lockedChannels, prev, next);
                  this.markTextureViewsDirty(tex.id);
                  this.render();
                  this.onPixelsChanged();
                }
              }
              this.updatePreviews();
            } else {
              this.updatePreviews();
            }
          }
          if (this.stabilizerMode === "follow") {
            this.ensureFollowLoop();
          }
        }
        this.emitStats();
        return;
      }
      if (this.drawing && this.lastPixel !== null && pixel !== null) {
        const layer = this.activeLayer();
        if (layer === null || this.strokeLayerId === null) {
          return;
        }
        const tex = this.textures.get(this.strokeLayerId);
        if (tex === undefined) {
          return;
        }
        this.paintPencilLine(tex, layer.lockedChannels, this.lastPixel.x, this.lastPixel.y, pixel.x, pixel.y);
        this.lastPixel = pixel;
        this.markTextureViewsDirty(tex.id);
        this.render();
        this.onPixelsChanged();
      }
      this.emitStats();
    });
    const endStroke = (): void => {
      if (this.strokeBase !== null && this.strokeLayerId !== null) {
        const tex = this.textures.get(this.strokeLayerId);
        if (tex !== undefined) {
          const diff = computeImageDiff(this.strokeBase, tex.buffer, tex.width, tex.height);
          if (diff !== null) {
            this.history.push({ type: "stroke", layerId: tex.id, diff });
          }
        }
        this.strokeBase = null;
        this.strokeLayerId = null;
        this.strokeMask = null;
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
      this.sizeDrag = null;
      this.resetPencilPixelPerfect();
      // Keep the stabilizer focus for hover preview; let follow mode converge.
      if (this.stabilizerMode === "follow") {
        this.ensureFollowLoop();
      }
      this.updatePreviews();
    };
    canvas.addEventListener("pointerup", endStroke);
    canvas.addEventListener("pointerup", (event: PointerEvent) => {
      if (this.tool !== "curve" || this.curvePhase !== "dragging" || event.button !== 0) {
        return;
      }
      const pixel = this.toImagePixel(event.clientX, event.clientY);
      if (pixel !== null) {
        this.curveP3 = { x: pixel.x, y: pixel.y, clientX: event.clientX, clientY: event.clientY };
      } else if (this.curveDragCurrent !== null) {
        this.curveP3 = { ...this.curveDragCurrent };
      } else {
        return;
      }
      this.curvePhase = "awaitC1";
      this.curveDragCurrent = null;
      this.lastMouseClient = { x: event.clientX, y: event.clientY };
      this.updatePreviews();
    });
    canvas.addEventListener("pointercancel", endStroke);
    canvas.addEventListener("pointercancel", () => {
      if (this.tool === "curve" && this.curvePhase === "dragging") {
        this.resetCurveState();
        this.updatePreviews();
      }
    });
    canvas.addEventListener("pointerleave", () => {
      this.cursor = null;
      this.lastMouseClient = null;
      this.stabilizerPos = null;
      this.stabilizerTarget = null;
      this.stopFollowLoop();
      this.resetPencilPixelPerfect();
      this.hidePreviews();
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
      // Keyboard events from inside shadow DOM retarget `target` to the host,
      // so inspect the composed path to reliably detect text fields.
      const inField = ((): boolean => {
        if (typeof event.composedPath === "function") {
          for (const node of event.composedPath()) {
            if (
              node instanceof HTMLInputElement ||
              node instanceof HTMLTextAreaElement ||
              node instanceof HTMLSelectElement
            ) {
              return true;
            }
            if (node instanceof HTMLElement && node.isContentEditable) {
              return true;
            }
          }
        }
        const target = event.target;
        return (
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target instanceof HTMLSelectElement
        );
      })();
      if (event.key === "Control" && !event.repeat && !event.altKey && !event.metaKey && !inField) {
        this.beginTempEyedropper();
        return;
      }
      if (!event.ctrlKey && !event.altKey && !event.metaKey && !inField) {
        if (event.key === "b" || event.key === "B") {
          this.setTool("pencil");
          return;
        }
        if (event.key === "g" || event.key === "G") {
          this.setTool("bucket");
          return;
        }
        if (event.key === "f" || event.key === "F") {
          this.setTool("bucket");
          return;
        }
        if (event.key === "n" || event.key === "N") {
          this.setTool("line");
          return;
        }
        if (event.key === "c" || event.key === "C") {
          this.setTool("curve");
          return;
        }
        if (event.key === "z" || event.key === "Z") {
          this.setTool("loupe");
          return;
        }
        if (event.key === "t" || event.key === "T") {
          this.setTool("transform");
          return;
        }
        if (event.code === "Digit4" || event.code === "Numpad4") {
          this.rotateByDegrees(-this.rotationStepDeg);
          return;
        }
        if (event.code === "Digit6" || event.code === "Numpad6") {
          this.rotateByDegrees(this.rotationStepDeg);
          return;
        }
        if (event.code === "Digit5" || event.code === "Numpad5") {
          this.resetRotation();
          return;
        }
        if (event.code === "Digit1") {
          this.setZoom(1);
          return;
        }
        if (event.code === "Digit2") {
          this.zoomToFit();
          return;
        }
        if (event.key === "Escape" && this.tool === "line" && this.lineAnchor !== null) {
          this.lineAnchor = null;
          this.updatePreviews();
          return;
        }
        if (event.key === "Escape" && this.tool === "curve" && this.curvePhase !== "idle") {
          this.resetCurveState();
          this.updatePreviews();
          return;
        }
        if (event.key === "Delete") {
          event.preventDefault();
          this.clearCurrentCellTexture();
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
      if (event.key === "Control") {
        this.endTempEyedropper();
      }
    });
  }

  private toImagePixel(clientX: number, clientY: number): { x: number; y: number } | null {
    const layer = this.activeLayer();
    if (layer === null) {
      return null;
    }
    if (layer.width < 1 || layer.height < 1 || layer.renderTextureId === null) {
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
    this.updatePreviews();
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
    this.updateGrid();
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
