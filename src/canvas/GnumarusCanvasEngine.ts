import * as THREE from "three";
import { compositeLayersAt } from "../preview/GnumarusFinalRender";
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
  findAlphaBoundingBox,
  GNUMARUS_MAX_TEXTURE_DIM,
  buffersEqual,
  floodFill,
  getPixel,
  normalizePointerPressure,
  parseBrushShape,
  parsePressureResponse,
  pressureAlphaMultiplier,
  pressureSizeMultiplier,
  parseBlendMode,
  parseChannelLock,
  parseHexColor,
  resizePixelBuffer,
  setPixel,
  stampSegmentCoverage,
  type GnumarusBlendMode,
  type GnumarusBrushShape,
  type GnumarusChannelLock,
  type GnumarusPressureResponse,
  type GnumarusRgba,
} from "./GnumarusPixelBuffer";
import {
  GnumarusPixelPerfectStroke,
  walkBresenhamLinePixels,
  walkCubicBezierPixels,
} from "./GnumarusPixelPerfect";
import {
  GNUMARUS_MAX_SELECTION_SKEW,
  forwardSelectionPoint,
  inverseSelectionPoint,
  isSelectionDegenerate,
  selectionCornerBox,
  selectionLinearMatrix,
  selectionRotate3,
  type GnumarusSelectionPlacement,
} from "./GnumarusSelectionTransform";
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
  canvasResizeTextureBox,
  canvasVisibleTextureBox,
  GNUMARUS_MAX_LAYER_SKEW,
  IDENTITY_LAYER_TRANSFORM,
  layerImageToProject,
  layerLinearMatrix,
  layerPixelCenterToProject,
  layerRotate3,
  normalizeRotation,
  projectToLayerImageFloat,
  projectToLayerPixel,
  projectToScreen,
  rotatedBounds,
  screenToLayerPixel,
  screenToProject,
} from "./GnumarusViewportMath";
import type {
  GnumarusCropBox,
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
  clampGridOpacityPercent,
  DEFAULT_GRID_SETTINGS,
  shouldShowPixelGrid,
} from "../settings/GnumarusGridSettings";
import {
  clampRotationStepDeg,
  DEFAULT_ROTATION_SETTINGS,
} from "../settings/GnumarusRotationSettings";
import {
  animationCellKey,
  clampFrameDurationSec,
  defaultFrameName,
  effectiveFrameDurationSec,
  ensureFrameNames,
  GNUMARUS_DEFAULT_FRAME_DURATION_SEC,
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
  mapNamedAnimationFrames,
  type GnumarusNamedAnimation,
} from "../animation/GnumarusNamedAnimations";
import {
  DEFAULT_BACKGROUND_SETTINGS,
  type GnumarusBackgroundMode,
  type GnumarusBackgroundSettings,
} from "../settings/GnumarusBackgroundSettings";
import { rgbaBytesToHex } from "../color/GnumarusColorModels";
import {
  computeImageDiff,
  GnumarusHistory,
  type GnumarusFitRecord,
  type GnumarusHistoryEntry,
  type GnumarusMergedLayerSnapshot,
  type GnumarusReloadRecord,
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

export type GnumarusCanvasTool =
  | "pencil"
  | "bucket"
  | "line"
  | "curve"
  | "loupe"
  | "transform"
  | "transform3d"
  | "eyedropper"
  | "rectselect"
  | "destransform"
  | "destransform3d";

/** Floating selection cut out of a cell texture, without a cell of its own. */
export interface GnumarusFloatingSelection {
  /** Source pixels as cut (never resampled in place). */
  buffer: Uint8ClampedArray;
  width: number;
  height: number;
  /** Center in home texture pixels (floats, unbounded). */
  cx: number;
  cy: number;
  /** Clockwise-positive radians. */
  rotation: number;
  /** Multipliers, always positive. */
  scaleX: number;
  scaleY: number;
  /** Shear factors. */
  skewX: number;
  skewY: number;
  /** Tilt about the X/Y axes in radians (managed by the 3D rotation tools). */
  rotationX: number;
  rotationY: number;
  /** Mirror flags (toggled by the flip anchors). */
  flipX: boolean;
  flipY: boolean;
  /** Placement snapshot taken at cut time; the center anchor restores it. */
  initial: {
    cx: number;
    cy: number;
    rotation: number;
    scaleX: number;
    scaleY: number;
    skewX: number;
    skewY: number;
    rotationX: number;
    rotationY: number;
    flipX: boolean;
    flipY: boolean;
  };
  layerId: string;
  frame: number;
  textureId: string;
  /** History undo depth right after the cut entry was pushed. */
  cutDepth: number;
  active: boolean;
}

/** Anchor ids for the destructive selection transform overlay. */
export type GnumarusSelectionHandleId =
  | "resize-nw"
  | "resize-ne"
  | "resize-sw"
  | "resize-se"
  | "resize-n"
  | "resize-s"
  | "resize-e"
  | "resize-w"
  | "rotate-nw"
  | "rotate-ne"
  | "rotate-sw"
  | "rotate-se"
  | "skew-n"
  | "skew-s"
  | "skew-e"
  | "skew-w"
  | "flip-n"
  | "flip-s"
  | "flip-e"
  | "flip-w"
  | "rot3d-x"
  | "rot3d-y"
  | "rot3d-z"
  | "center";

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
  namedAnimations: GnumarusNamedAnimation[];
  activeAnimation: string | null;
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

/**
 * Point on a 3D gizmo great circle (plane perpendicular to `axis`) at ring
 * parameter `phi`, for a rigid sphere of radius `r` in layer/project units.
 */
function rot3DRingPoint(axis: "x" | "y" | "z", phi: number, r: number): [number, number, number] {
  const c = Math.cos(phi) * r;
  const s = Math.sin(phi) * r;
  return axis === "x" ? [0, c, s] : axis === "y" ? [c, 0, s] : [c, s, 0];
}

/** Endpoints of a 3D gizmo axis line (negative, positive) for radius `r`. */
function rot3DAxisEnds(axis: "x" | "y" | "z", r: number): [[number, number, number], [number, number, number]] {
  return axis === "x"
    ? [[-r, 0, 0], [r, 0, 0]]
    : axis === "y"
      ? [[0, -r, 0], [0, r, 0]]
      : [[0, 0, -r], [0, 0, r]];
}

/**
 * Shift a cell content transform so its texture keeps the same apparent
 * project position after the texture is cropped to `box` (a sub-rectangle
 * of the old `oldWidth` x `oldHeight` buffer). Rotation, flips, scale and
 * skew are preserved; only the center offset changes. The shift accounts
 * for the content's own full linear map.
 */
export function shiftTransformForCrop(
  transform: GnumarusLayerTransform,
  oldWidth: number,
  oldHeight: number,
  box: { left: number; top: number; width: number; height: number },
): GnumarusLayerTransform {
  const shiftX = (box.left + (box.width - oldWidth) / 2) * (transform.flipX ? -1 : 1);
  const shiftY = (box.top + (box.height - oldHeight) / 2) * (transform.flipY ? -1 : 1);
  const matrix = layerLinearMatrix(transform);
  return {
    ...transform,
    x: transform.x + matrix.a * shiftX + matrix.b * shiftY,
    y: transform.y + matrix.c * shiftX + matrix.d * shiftY,
  };
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
  "uniform float uOpacity;",
  "void main() {",
  "  if (uLayerW < 1.0 || uLayerH < 1.0) { discard; }",
  "  vec2 coord = vec2(vUv.x * uLayerW, vUv.y * uLayerH);",
  "  vec2 fw = fwidth(coord);",
  "  vec2 g = abs(fract(coord - 0.5) - 0.5) / max(fw, vec2(1e-4));",
  "  float line = 1.0 - min(min(g.x, g.y), 1.0);",
  "  if (line < 0.02) { discard; }",
  "  gl_FragColor = vec4(1.0, 1.0, 1.0, line * 0.45 * uOpacity);",
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
  /** Fired when a cell content transform changes (move/rotate/flip/reset). */
  onTransformChanged?: () => void;
  checker?: GnumarusCheckerSettings;
  gridMinZoom?: number;
  gridOpacityPercent?: number;
  viewMinZoom?: number;
  background?: GnumarusBackgroundSettings;
}

/** Screen pixels of horizontal drag per tool-size unit for shift-drag resizing. */
export const GNUMARUS_SIZE_DRAG_PX_PER_UNIT = 20;

/** Clamp a view minimum-zoom fraction (0.01..1, default 0.25). */
function normalizeViewMinZoom(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0.01, value)) : 0.25;
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
  private textures = new Map<string, GnumarusTextureEntry>();
  private contents = new Map<string, GnumarusCellContent>();
  private cells = new Map<string, string>();
  private frameCount = 1;
  private currentFrame = 0;
  private frameDurations = new Map<number, number>();
  private defaultFrameDuration = GNUMARUS_DEFAULT_FRAME_DURATION_SEC;
  private frameNames: string[] = [defaultFrameName(0)];
  private namedAnimations: GnumarusNamedAnimation[] = [];
  private activeAnimationName: string | null = null;
  private frameNameCounter = 2;
  private contentCounter = 1;
  private textureCounter = 1;
  private textureNameCounter = 1;
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
  private brushShape: GnumarusBrushShape = "circle";
  private pressureResponse: GnumarusPressureResponse = "none";
  private strokePressure = 1;
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
  private lineShape: GnumarusBrushShape = "circle";
  private lineAntialias = false;
  private lineAnchor: { x: number; y: number; clientX: number; clientY: number } | null = null;
  private curveWidth = 1;
  private curveShape: GnumarusBrushShape = "circle";
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
  private readonly previewSelectWhite: SVGPolygonElement;
  private readonly previewSelectBlack: SVGPolygonElement;
  private readonly selectionHandles: Array<{ id: GnumarusSelectionHandleId; group: SVGGElement }> = [];
  /** 3D gizmo ring halves (front solid, back dashed) per rotation axis. */
  private readonly rot3dRings: Record<"x" | "y" | "z", { front: SVGPathElement; back: SVGPathElement }>;
  /** 3D gizmo visible axis lines per rotation axis. */
  private readonly rot3dAxes: Record<"x" | "y" | "z", SVGLineElement>;
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
  /** Floating selection cut out of a cell texture (null when none exists). */
  private floating: GnumarusFloatingSelection | null = null;
  /** Active rectangular-selection drag in cell image pixels, or null. */
  private rectDrag: { x0: number; y0: number; x1: number; y1: number } | null = null;
  /** Active destructive-transform move (grab offset from the selection center). */
  private moveDrag: { grabDX: number; grabDY: number } | null = null;
  /** Active corner/edge resize gesture. */
  private resizeDrag: {
    anchorBufferX: number;
    anchorBufferY: number;
    anchorHomeX: number;
    anchorHomeY: number;
    grabLocalX: number;
    grabLocalY: number;
    startScaleX: number;
    startScaleY: number;
    axis: "both" | "x" | "y";
    placement: GnumarusSelectionPlacement;
  } | null = null;
  /** Active rotate gesture (screen-space angles). */
  private rotateDrag: { startRotation: number; grabAngle: number; centerX: number; centerY: number } | null = null;
  /** Active skew gesture (centered shear, opposite edge mirrors). */
  private skewDrag: {
    axis: "x" | "y";
    sign: 1 | -1;
    startSkew: number;
    grabClientX: number;
    grabClientY: number;
    dirX: number;
    dirY: number;
    extent: number;
  } | null = null;
  /** Pending center-anchor tap (click without drag resets the transform). */
  private centerTap: { startClientX: number; startClientY: number; grabDX: number; grabDY: number } | null = null;
  /** Pending flip-anchor tap (click without drag toggles the mirror flag). */
  private flipTap: { axis: "x" | "y"; startClientX: number; startClientY: number } | null = null;
  /** Active non-destructive layer resize (opposite anchor fixed in project space). */
  private layerResizeDrag: {
    layerId: string;
    anchorImgX: number;
    anchorImgY: number;
    anchorProjectX: number;
    anchorProjectY: number;
    grabLocalX: number;
    grabLocalY: number;
    startScaleX: number;
    startScaleY: number;
    axis: "both" | "x" | "y";
    snapshot: GnumarusLayerTransform;
  } | null = null;
  /** Active non-destructive layer rotate (screen-space angle about the layer center). */
  private layerRotateDrag: {
    layerId: string;
    startRotation: number;
    grabAngle: number;
    centerX: number;
    centerY: number;
  } | null = null;
  /** Active non-destructive layer skew (centered shear, center fixed). */
  private layerSkewDrag: {
    layerId: string;
    axis: "x" | "y";
    sign: 1 | -1;
    startSkew: number;
    grabClientX: number;
    grabClientY: number;
    dirX: number;
    dirY: number;
    extent: number;
    snapshot: GnumarusLayerTransform;
  } | null = null;
  /** Pending non-destructive center tap (click resets, drag moves the layer). */
  private layerCenterTap: { layerId: string; startClientX: number; startClientY: number } | null = null;
  /** Pending non-destructive flip tap (click toggles the mirror flag). */
  private layerFlipTap: { layerId: string; axis: "x" | "y"; startClientX: number; startClientY: number } | null = null;
  /** Active 3D trackball drag (screen-space sphere around the gizmo center). */
  private trackballDrag: {
    /** "layer" (non-destructive) or "floating" (destructive) target. */
    target: "layer" | "floating";
    layerId: string;
    startRotationX: number;
    startRotationY: number;
    grabClientX: number;
    grabClientY: number;
    /** Screen radius of the gizmo sphere in CSS pixels. */
    radiusPx: number;
  } | null = null;
  /** Pending 3D center tap (click resets the tool rotations, drag trackballs). */
  private rot3dCenterTap: {
    target: "layer" | "floating";
    layerId: string;
    startClientX: number;
    startClientY: number;
    radiusPx: number;
  } | null = null;
  /** Active single-axis 3D rotation (tangent projection along the ring). */
  private axisDrag: {
    target: "layer" | "floating";
    layerId: string;
    axis: "x" | "y" | "z";
    startAngle: number;
    startPhi: number;
    phi: number;
    lastClientX: number;
    lastClientY: number;
    sphereR: number;
    project: (ox: number, oy: number, oz: number) => { x: number; y: number; front: boolean };
  } | null = null;
  private floatingPlane: THREE.Mesh | null = null;
  private floatingPlaneFor: GnumarusFloatingSelection | null = null;
  private floatingMaterial: THREE.ShaderMaterial | null = null;
  private floatingTexture: THREE.DataTexture | null = null;
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
  private viewMinZoom = 0.25;
  private gridOpacityPercent: number;
  private readonly gridMaterial: THREE.ShaderMaterial;
  private readonly gridPlane: THREE.Mesh;
  private readonly axisXMaterial: THREE.LineBasicMaterial;
  private readonly axisXLine: THREE.LineSegments;
  private readonly axisYMaterial: THREE.LineBasicMaterial;
  private readonly axisYLine: THREE.LineSegments;
  private readonly borderMaterial: THREE.LineBasicMaterial;
  private readonly borderLine: THREE.LineSegments;
  private readonly onStats: (stats: GnumarusEngineStats) => void;
  private readonly onPixelsChanged: () => void;
  private readonly onToolChanged: ((tool: GnumarusCanvasTool) => void) | undefined;
  private readonly onLayersChanged: (() => void) | undefined;
  private readonly onToolSizeChanged: ((kind: GnumarusToolSizeKind, size: number) => void) | undefined;
  private readonly onEyedropperPick: ((hex: string) => void) | undefined;
  private readonly onTransformChanged: (() => void) | undefined;

  constructor(container: HTMLElement, options: GnumarusEngineOptions) {
    this.container = container;
    this.onStats = options.onStats;
    this.onPixelsChanged = options.onPixelsChanged;
    this.onToolChanged = options.onToolChanged;
    this.onLayersChanged = options.onLayersChanged;
    this.onToolSizeChanged = options.onToolSizeChanged;
    this.onEyedropperPick = options.onEyedropperPick;
    this.onTransformChanged = options.onTransformChanged;
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
    this.gridOpacityPercent = clampGridOpacityPercent(
      options.gridOpacityPercent ?? DEFAULT_GRID_SETTINGS.opacityPercent,
    );
    this.viewMinZoom = normalizeViewMinZoom(options.viewMinZoom ?? 0.25);
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
    const makeSelectionAnts = (testId: string | null, stroke: string, dashOffset: string): SVGPolygonElement => {
      const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      if (testId !== null) {
        polygon.setAttribute("data-testid", testId);
      }
      polygon.setAttribute("fill", "none");
      polygon.setAttribute("stroke", stroke);
      polygon.setAttribute("stroke-width", "1.5");
      polygon.setAttribute("stroke-dasharray", "6 4");
      polygon.setAttribute("opacity", "0.95");
      const march = document.createElementNS("http://www.w3.org/2000/svg", "animate");
      march.setAttribute("attributeName", "stroke-dashoffset");
      march.setAttribute("from", "0");
      march.setAttribute("to", dashOffset);
      march.setAttribute("dur", "1s");
      march.setAttribute("repeatCount", "indefinite");
      polygon.appendChild(march);
      polygon.style.display = "none";
      this.previewSvg.appendChild(polygon);
      return polygon;
    };
    this.previewSelectWhite = makeSelectionAnts("selection-rect", "#ffffff", "-20");
    this.previewSelectBlack = makeSelectionAnts(null, "#000000", "-10");
    const svgNamespace = "http://www.w3.org/2000/svg";
    const appendShape = (group: SVGGElement, tag: string, attributes: Record<string, string>): SVGElement => {
      const shape = document.createElementNS(svgNamespace, tag) as SVGElement;
      for (const [name, value] of Object.entries(attributes)) {
        shape.setAttribute(name, value);
      }
      group.appendChild(shape);
      return shape;
    };
    const underlay = { fill: "none", stroke: "#000000", "stroke-width": "4", opacity: "0.9" };
    const overlay = { fill: "none", stroke: "#ffffff", "stroke-width": "2", opacity: "0.95" };
    const solidWhite = { fill: "#ffffff", stroke: "#000000", "stroke-width": "1", opacity: "0.95" };
    const makeHandleGroup = (id: GnumarusSelectionHandleId): SVGGElement => {
      const group = document.createElementNS(svgNamespace, "g") as SVGGElement;
      group.setAttribute("data-testid", "pp-handle");
      group.setAttribute("data-handle", id);
      group.style.display = "none";
      group.style.pointerEvents = "none";
      this.previewSvg.appendChild(group);
      this.selectionHandles.push({ id, group });
      return group;
    };
    const resizeIds: GnumarusSelectionHandleId[] = [
      "resize-nw",
      "resize-ne",
      "resize-se",
      "resize-sw",
      "resize-n",
      "resize-s",
      "resize-e",
      "resize-w",
    ];
    for (const id of resizeIds) {
      const group = makeHandleGroup(id);
      appendShape(group, "rect", { x: "-4", y: "-4", width: "8", height: "8", ...solidWhite });
    }
    const rotateIds: GnumarusSelectionHandleId[] = ["rotate-nw", "rotate-ne", "rotate-se", "rotate-sw"];
    for (const id of rotateIds) {
      const group = makeHandleGroup(id);
      appendShape(group, "path", { d: "M -7 0 A 7 7 0 0 1 0 -7", ...underlay });
      appendShape(group, "path", { d: "M -7 0 A 7 7 0 0 1 0 -7", ...overlay });
      appendShape(group, "polygon", { points: "-7,-4 -11,1 -3,1", ...solidWhite });
      appendShape(group, "polygon", { points: "1,-7 -4,-11 -4,-3", ...solidWhite });
    }
    const skewIds: GnumarusSelectionHandleId[] = ["skew-n", "skew-s", "skew-e", "skew-w"];
    for (const id of skewIds) {
      const group = makeHandleGroup(id);
      appendShape(group, "line", { x1: "-7", y1: "0", x2: "7", y2: "0", ...underlay });
      appendShape(group, "line", { x1: "-7", y1: "0", x2: "7", y2: "0", ...overlay });
      appendShape(group, "polygon", { points: "-11,0 -5,-3 -5,3", ...solidWhite });
      appendShape(group, "polygon", { points: "11,0 5,-3 5,3", ...solidWhite });
    }
    // Flip anchors reuse the skew double-arrow icons: horizontal for the
    // flipX pair (above/below center), vertical for the flipY pair.
    const flipIds: GnumarusSelectionHandleId[] = ["flip-n", "flip-s", "flip-e", "flip-w"];
    for (const id of flipIds) {
      const group = makeHandleGroup(id);
      appendShape(group, "line", { x1: "-7", y1: "0", x2: "7", y2: "0", ...underlay });
      appendShape(group, "line", { x1: "-7", y1: "0", x2: "7", y2: "0", ...overlay });
      appendShape(group, "polygon", { points: "-11,0 -5,-3 -5,3", ...solidWhite });
      appendShape(group, "polygon", { points: "11,0 5,-3 5,3", ...solidWhite });
    }
    const centerGroup = makeHandleGroup("center");
    appendShape(centerGroup, "circle", { cx: "0", cy: "0", r: "6.5", ...underlay });
    appendShape(centerGroup, "circle", { cx: "0", cy: "0", r: "6.5", ...overlay });
    appendShape(centerGroup, "polygon", { points: "0,-9.5 -3.5,-4 3.5,-4", ...solidWhite });
    // 3D rotation gizmo: RGB rings (solid front, dashed back), visible axis
    // lines and colored single-axis handles. Shown only by the 3D tools.
    const rot3dColor: Record<"x" | "y" | "z", string> = { x: "#ff0000", y: "#00ff00", z: "#0000ff" };
    const makeRing = (axis: "x" | "y" | "z", front: boolean): SVGPathElement => {
      const path = document.createElementNS(svgNamespace, "path") as SVGPathElement;
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", rot3dColor[axis]);
      path.setAttribute("stroke-width", "2.5");
      path.setAttribute("opacity", front ? "0.95" : "0.45");
      if (!front) {
        path.setAttribute("stroke-dasharray", "5 4");
      }
      path.style.display = "none";
      path.style.pointerEvents = "none";
      this.previewSvg.appendChild(path);
      return path;
    };
    this.rot3dRings = {
      x: { front: makeRing("x", true), back: makeRing("x", false) },
      y: { front: makeRing("y", true), back: makeRing("y", false) },
      z: { front: makeRing("z", true), back: makeRing("z", false) },
    };
    const makeGizmoAxis = (axis: "x" | "y" | "z"): SVGLineElement => {
      const line = document.createElementNS(svgNamespace, "line") as SVGLineElement;
      line.setAttribute("stroke", rot3dColor[axis]);
      line.setAttribute("stroke-width", "2");
      line.setAttribute("opacity", "0.9");
      line.style.display = "none";
      line.style.pointerEvents = "none";
      this.previewSvg.appendChild(line);
      return line;
    };
    this.rot3dAxes = { x: makeGizmoAxis("x"), y: makeGizmoAxis("y"), z: makeGizmoAxis("z") };
    const rot3dIds: GnumarusSelectionHandleId[] = ["rot3d-x", "rot3d-y", "rot3d-z"];
    for (const id of rot3dIds) {
      const group = makeHandleGroup(id);
      const axis = id.slice(-1) as "x" | "y" | "z";
      appendShape(group, "circle", {
        cx: "0",
        cy: "0",
        r: "6",
        fill: rot3dColor[axis],
        stroke: "#000000",
        "stroke-width": "1.5",
        opacity: "0.95",
      });
    }
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
        uOpacity: { value: 1 },
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
    const makeAxisLine = (color: number): { material: THREE.LineBasicMaterial; line: THREE.LineSegments } => {
      const material = new THREE.LineBasicMaterial({ color, transparent: true, depthWrite: false });
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(18), 3));
      const line = new THREE.LineSegments(geometry, material);
      line.frustumCulled = false;
      line.renderOrder = 1001;
      line.visible = false;
      this.scene.add(line);
      return { material, line };
    };
    const axisX = makeAxisLine(0xff0000);
    this.axisXMaterial = axisX.material;
    this.axisXLine = axisX.line;
    const axisY = makeAxisLine(0x00ff00);
    this.axisYMaterial = axisY.material;
    this.axisYLine = axisY.line;
    const border = makeAxisLine(0xff00ff);
    this.borderMaterial = border.material;
    this.borderLine = border.line;
    const first = this.createLayerInternal("layer0", "L1", true, 1, createPixelBuffer(64, 64), 64, 64, {
      ...IDENTITY_LAYER_TRANSFORM,
    });
    this.layers.push(first);
    this.activeLayerId = first.id;
    this.layerCounter = 1;
    this.textureNameCounter = 1;
    this.textures.set("layer0", {
      id: "layer0",
      name: this.nextTextureName(),
      width: 64,
      height: 64,
      buffer: first.buffer,
    });
    this.contents.set("content1", {
      id: "content1",
      name: "C1",
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
    return this.resolveFrameAt(this.currentFrame);
  }

  private resolveFrameAt(frame: number): Map<string, GnumarusResolvedCell> {
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
      frame,
    );
  }

  /**
   * Flatten inputs for an arbitrary frame without touching live render
   * state (buffer references are shared read-only). Null for bad frames.
   */
  getFrameFlattenInputs(frame: number): Array<{
    width: number;
    height: number;
    buffer: Uint8ClampedArray;
    transform: GnumarusLayerTransform;
    visible: boolean;
    opacity: number;
  }> | null {
    if (!Number.isInteger(frame) || frame < 0 || frame >= this.frameCount) {
      return null;
    }
    const resolved = this.resolveFrameAt(frame);
    return this.layers.map((layer) => {
      const cell = resolved.get(layer.id);
      if (cell === undefined || cell.buffer === null || cell.width < 1 || cell.height < 1) {
        return {
          width: 0,
          height: 0,
          buffer: new Uint8ClampedArray(0),
          transform: { ...IDENTITY_LAYER_TRANSFORM },
          visible: false,
          opacity: layer.opacity,
        };
      }
      return {
        width: cell.width,
        height: cell.height,
        buffer: cell.buffer,
        transform: { ...cell.transform },
        visible: layer.visible,
        opacity: layer.opacity,
      };
    });
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

  private nextTextureName(): string {
    return `t${this.textureNameCounter++}`;
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
    this.updateSelectionOverlay();
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
    const name = `F${this.frameNameCounter++}`;
    this.cells = insertFrameCells(this.cells, at);
    this.frameDurations = insertFrameDurations(this.frameDurations, at);
    this.frameNames = insertFrameNames(this.frameNames, at, name);
    this.namedAnimations = mapNamedAnimationFrames(this.namedAnimations, (frame) =>
      frame >= at ? frame + 1 : frame,
    );
    this.frameCount += 1;
    if (this.floating !== null && this.floating.frame >= at) {
      this.floating.frame += 1;
    }
    this.currentFrame = at;
    this.stabilizerPos = null;
    this.stabilizerTarget = null;
    this.stopFollowLoop();
    this.resetPencilPixelPerfect();
    this.syncAllLayerRenders();
    this.refreshLayerStacking();
    this.render();
    this.emitStats();
    this.updateSelectionOverlay();
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
    this.namedAnimations = mapNamedAnimationFrames(this.namedAnimations, (entry) =>
      entry === frame ? target : entry === target ? frame : entry,
    );
    if (this.floating !== null) {
      if (this.floating.frame === frame) {
        this.floating.frame = target;
      } else if (this.floating.frame === target) {
        this.floating.frame = frame;
      }
    }
    this.currentFrame = target;
    this.stabilizerPos = null;
    this.stabilizerTarget = null;
    this.stopFollowLoop();
    this.resetPencilPixelPerfect();
    this.syncAllLayerRenders();
    this.refreshLayerStacking();
    this.render();
    this.emitStats();
    this.updateSelectionOverlay();
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
    this.namedAnimations = mapNamedAnimationFrames(this.namedAnimations, (entry) =>
      entry === frame ? null : entry > frame ? entry - 1 : entry,
    );
    this.frameCount -= 1;
    if (this.floating !== null) {
      if (this.floating.frame === frame) {
        this.dropFloating();
      } else if (this.floating.frame > frame) {
        this.floating.frame -= 1;
      }
    }
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
    this.updateSelectionOverlay();
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

  /** Explicit per-frame duration in seconds, or null for the project default. */
  getFrameDuration(frame: number): number | null {
    if (!Number.isInteger(frame) || frame < 0 || frame >= this.frameCount) {
      return null;
    }
    return this.frameDurations.get(frame) ?? null;
  }

  getDefaultFrameDuration(): number {
    return this.defaultFrameDuration;
  }

  /** Named animations (deep copies, in definition order). */
  getNamedAnimations(): GnumarusNamedAnimation[] {
    return this.namedAnimations.map((animation) => ({
      name: animation.name,
      loop: animation.loop,
      frames: animation.frames.map((entry) => ({ frame: entry.frame, duration: entry.duration })),
    }));
  }

  /**
   * Add a parsed named animation. False when the shape is invalid or the
   * name is already taken. Out-of-range frame entries are dropped.
   */
  addNamedAnimation(animation: GnumarusNamedAnimation): boolean {
    const loop = animation.loop;
    if (
      typeof animation.name !== "string" ||
      animation.name.trim().length === 0 ||
      (loop !== "none" && loop !== "forward" && loop !== "ping-pong") ||
      !Array.isArray(animation.frames) ||
      this.namedAnimations.some((entry) => entry.name === animation.name)
    ) {
      return false;
    }
    const frames = animation.frames.filter(
      (entry) =>
        Number.isInteger(entry.frame) &&
        entry.frame >= 0 &&
        entry.frame < this.frameCount &&
        (entry.duration === null || (typeof entry.duration === "number" && Number.isFinite(entry.duration))),
    );
    this.namedAnimations.push({
      name: animation.name,
      loop,
      frames: frames.map((entry) => ({ frame: entry.frame, duration: entry.duration })),
    });
    return true;
  }

  /** Remove a named animation by name, clearing the selection if it pointed at it. */
  removeNamedAnimation(name: string): boolean {
    const index = this.namedAnimations.findIndex((entry) => entry.name === name);
    if (index < 0) {
      return false;
    }
    this.namedAnimations.splice(index, 1);
    if (this.activeAnimationName === name) {
      this.activeAnimationName = null;
    }
    return true;
  }

  /** Selected named animation, or null for the full timeline. */
  getActiveAnimationName(): string | null {
    return this.activeAnimationName;
  }

  /** Select a named animation (null = full timeline). False for unknown names. */
  setActiveAnimation(name: string | null): boolean {
    if (name !== null && !this.namedAnimations.some((entry) => entry.name === name)) {
      return false;
    }
    if (this.activeAnimationName === name) {
      return false;
    }
    this.activeAnimationName = name;
    return true;
  }

  getEffectiveFrameDuration(frame: number): number {
    return effectiveFrameDurationSec(this.getFrameDuration(frame), this.defaultFrameDuration);
  }

  setFrameDuration(frame: number, durationSec: number | null): boolean {
    if (!Number.isInteger(frame) || frame < 0 || frame >= this.frameCount) {
      return false;
    }
    if (durationSec === null) {
      if (!this.frameDurations.has(frame)) {
        return false;
      }
      this.frameDurations.delete(frame);
      this.onLayersChanged?.();
      this.emitStats();
      return true;
    }
    if (!Number.isFinite(durationSec)) {
      return false;
    }
    const clamped = clampFrameDurationSec(durationSec);
    if (this.frameDurations.get(frame) === clamped) {
      return false;
    }
    this.frameDurations.set(frame, clamped);
    this.onLayersChanged?.();
    this.emitStats();
    return true;
  }

  setDefaultFrameDuration(durationSec: number): boolean {
    if (!Number.isFinite(durationSec)) {
      return false;
    }
    const clamped = clampFrameDurationSec(durationSec);
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

  /** Texture id of a cell's content, or null when the cell is empty, textureless or dangling. */
  getCellTextureId(layerId: string, frame: number): string | null {
    const contentId = this.cells.get(animationCellKey(layerId, frame));
    if (contentId === undefined) {
      return null;
    }
    const content = this.contents.get(contentId);
    if (content === undefined || content.textureId === null) {
      return null;
    }
    return this.textures.has(content.textureId) ? content.textureId : null;
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
      name: this.nextTextureName(),
      width: this.imageWidth,
      height: this.imageHeight,
      buffer: createPixelBuffer(this.imageWidth, this.imageHeight),
    });
    const contentId = this.nextContentId();
    this.contents.set(contentId, {
      id: contentId,
      name: `C${this.contentCounter - 1}`,
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

  /** Create a textureless content and attach it to the cell (for the content picker flow). */
  createEmptyContentForCell(layerId: string, frame: number): string | null {
    if (this.findLayer(layerId) === null) {
      return null;
    }
    if (!Number.isInteger(frame) || frame < 0 || frame >= this.frameCount) {
      return null;
    }
    const contentId = this.nextContentId();
    this.contents.set(contentId, {
      id: contentId,
      name: `C${this.contentCounter - 1}`,
      textureId: null,
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

  /** Create a new empty project-sized texture without attaching it to any content. */
  createEmptyTexture(): string {
    const textureId = this.nextTextureId();
    this.textures.set(textureId, {
      id: textureId,
      name: this.nextTextureName(),
      width: this.imageWidth,
      height: this.imageHeight,
      buffer: createPixelBuffer(this.imageWidth, this.imageHeight),
    });
    this.syncAllLayerRenders();
    this.refreshLayerStacking();
    this.render();
    this.onPixelsChanged();
    this.onLayersChanged?.();
    this.emitStats();
    return textureId;
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
        name: `C${this.contentCounter - 1}`,
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
        name: this.nextTextureName(),
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
      namedAnimations: this.getNamedAnimations(),
      activeAnimation: this.activeAnimationName,
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
    this.updateAxisOverlay();
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
    const name = `L${this.layerCounter + 1}`;
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
      name: this.nextTextureName(),
      width: this.imageWidth,
      height: this.imageHeight,
      buffer: layer.buffer,
    });
    // New layer cells start empty (like new frames): no content is created
    // and no cell is associated until the user paints or picks a content
    // via the Select content menu. The owned texture above is kept so
    // resize/save/undo keep working; painting materializes tex textures
    // on demand via ensureCellContent.
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
    if (this.floating !== null && (this.floating.layerId === id || this.floating.textureId === id)) {
      this.dropFloating();
    }    if (!this.removeLayerSilent(id)) {
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
      name: snapshot.textureName,
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
   * cell's texture through its own size and transform and using its opacity.
   * Operates on the current frame's resolved pixels. When the below cell has
   * no usable texture, the upper cell's content (empty below cell) or its
   * texture (textureless below content) is linked into the lower cell
   * instead of compositing pixels.
   * The merged layer is removed only when all of its cells in every other
   * frame are empty or hold textureless contents; otherwise the layer is
   * kept, only the current cell's content is dissociated (the cell becomes
   * empty) and the other frames stay untouched. Either way the result is a
   * single undoable history entry.
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
    const frame = this.currentFrame;
    const currentCellKey = animationCellKey(id, frame);
    const currentContentId = this.cells.get(currentCellKey) ?? null;
    const upperContent = currentContentId === null ? undefined : this.contents.get(currentContentId);
    const upperTextureId = upperContent?.textureId ?? null;
    const upperEntry = upperTextureId === null ? undefined : this.textures.get(upperTextureId);
    const ownedEntry = this.textures.get(id);
    if (
      currentContentId === null ||
      upperContent === undefined ||
      upperTextureId === null ||
      upperEntry === undefined ||
      ownedEntry === undefined
    ) {
      return false;
    }
    const lowerCellKey = animationCellKey(lower.id, frame);
    const lowerContentId = this.cells.get(lowerCellKey) ?? null;
    const lowerContent = lowerContentId === null ? undefined : this.contents.get(lowerContentId);
    const lowerTextureId = lowerContent?.textureId ?? null;
    if (
      this.floating !== null &&
      this.floating.active &&
      (this.floating.textureId === upperTextureId || this.floating.textureId === lowerTextureId)
    ) {
      this.commitFloating();
    }
    if (lowerTextureId === null) {
      return this.mergeDownRelink(index, id, lower.id, frame, currentCellKey, currentContentId, upperTextureId, lowerCellKey, lowerContent);
    }
    const lowerEntry = this.textures.get(lowerTextureId);
    if (lowerEntry === undefined) {
      return this.mergeDownRelink(index, id, lower.id, frame, currentCellKey, currentContentId, upperTextureId, lowerCellKey, lowerContent);
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
    const lowerOwner = lowerTextureId;
    const keepLayer = this.mergeDownKeepsLayer(id);
    const snapshot: GnumarusMergedLayerSnapshot = {
      id: upper.id,
      name: upper.name,
      textureName: ownedEntry.name,
      visible: upper.visible,
      opacity: upper.opacity,
      width: ownedEntry.width,
      height: ownedEntry.height,
      transform: { ...upper.transform },
      lockedChannels: { ...upper.lockedChannels },
      stackIndex: index,
      buffer: ownedEntry.buffer.slice(),
      cells: [],
      detachedContents: [],
    };
    if (keepLayer) {
      this.cells.delete(currentCellKey);
      this.activeLayerId = lower.id;
      this.pushHistory({
        type: "merge",
        merge: {
          lowerLayerId: lowerOwner,
          lowerDiff: diff,
          upper: snapshot,
          removedLayer: false,
          dissociatedCell: { layer: id, frame: this.currentFrame, content: currentContentId },
          associatedCell: null,
          textureLink: null,
        },
      });
    } else {
      const collected = this.collectMergeSnapshotCells(id);
      snapshot.cells = collected.cells;
      snapshot.detachedContents = collected.detachedContents;
      this.removeLayerFull(id);
      this.activeLayerId = lower.id;
      this.pushHistory({
        type: "merge",
        merge: {
          lowerLayerId: lowerOwner,
          lowerDiff: diff,
          upper: snapshot,
          removedLayer: true,
          dissociatedCell: null,
          associatedCell: null,
          textureLink: null,
        },
      });
    }
    this.markTextureViewsDirty(lowerOwner);
    this.syncAllLayerRenders();
    this.refreshLayerStacking();
    this.render();
    this.onPixelsChanged();
    this.onLayersChanged?.();
    this.emitStats();
    return true;
  }

  /** True when the layer must survive a merge because another frame holds textured content. */
  private mergeDownKeepsLayer(id: string): boolean {
    for (let frame = 0; frame < this.frameCount; frame += 1) {
      if (frame === this.currentFrame) {
        continue;
      }
      const otherContentId = this.cells.get(animationCellKey(id, frame));
      if (otherContentId === undefined) {
        continue;
      }
      const otherContent = this.contents.get(otherContentId);
      if (otherContent === undefined || otherContent.textureId === null) {
        continue;
      }
      if (!this.textures.has(otherContent.textureId)) {
        continue;
      }
      return true;
    }
    return false;
  }

  /** Upper cells plus owned-texture contents detached by a layer-removing merge (captured before removal). */
  private collectMergeSnapshotCells(id: string): {
    cells: Array<{ frame: number; content: string }>;
    detachedContents: string[];
  } {
    const cells: Array<{ frame: number; content: string }> = [];
    for (const [key, contentId] of this.cells) {
      if (key.startsWith(`${id}\n`)) {
        const separator = key.lastIndexOf("\n");
        cells.push({ frame: Number.parseInt(key.slice(separator + 1), 10), content: contentId });
      }
    }
    const detachedContents: string[] = [];
    for (const content of this.contents.values()) {
      if (content.textureId === id) {
        detachedContents.push(content.id);
      }
    }
    return { cells, detachedContents };
  }

  /**
   * Merge fallback used when the below cell has no usable texture at the
   * current frame: link the upper cell's content into the empty lower cell,
   * or link its texture into the textureless lower content, then dissociate
   * the upper cell. The upper layer is removed only when all its other
   * frames are empty or textureless (same rule as the composite path).
   */
  private mergeDownRelink(
    index: number,
    upperId: string,
    lowerId: string,
    frame: number,
    currentCellKey: string,
    currentContentId: string,
    upperTextureId: string,
    lowerCellKey: string,
    lowerContent: GnumarusCellContent | undefined,
  ): boolean {
    const upper = this.findLayer(upperId);
    const lower = this.findLayer(lowerId);
    const ownedEntry = this.textures.get(upperId);
    if (upper === null || lower === null || ownedEntry === undefined) {
      return false;
    }
    const snapshot: GnumarusMergedLayerSnapshot = {
      id: upper.id,
      name: upper.name,
      textureName: ownedEntry.name,
      visible: upper.visible,
      opacity: upper.opacity,
      width: ownedEntry.width,
      height: ownedEntry.height,
      transform: { ...upper.transform },
      lockedChannels: { ...upper.lockedChannels },
      stackIndex: index,
      buffer: ownedEntry.buffer.slice(),
      cells: [],
      detachedContents: [],
    };
    let associatedCell: { layer: string; frame: number; content: string } | null = null;
    let textureLink: { contentId: string; before: string | null; after: string | null } | null = null;
    if (lowerContent === undefined) {
      this.cells.set(lowerCellKey, currentContentId);
      associatedCell = { layer: lowerId, frame, content: currentContentId };
    } else {
      const before = lowerContent.textureId;
      lowerContent.textureId = upperTextureId;
      textureLink = { contentId: lowerContent.id, before, after: upperTextureId };
    }
    if (this.mergeDownKeepsLayer(upperId)) {
      this.cells.delete(currentCellKey);
      this.activeLayerId = lowerId;
      this.pushHistory({
        type: "merge",
        merge: {
          lowerLayerId: lowerId,
          lowerDiff: null,
          upper: snapshot,
          removedLayer: false,
          dissociatedCell: { layer: upperId, frame, content: currentContentId },
          associatedCell,
          textureLink,
        },
      });
    } else {
      const collected = this.collectMergeSnapshotCells(upperId);
      snapshot.cells = collected.cells;
      snapshot.detachedContents = collected.detachedContents;
      this.removeLayerFull(upperId);
      this.activeLayerId = lowerId;
      this.pushHistory({
        type: "merge",
        merge: {
          lowerLayerId: lowerId,
          lowerDiff: null,
          upper: snapshot,
          removedLayer: true,
          dissociatedCell: null,
          associatedCell,
          textureLink,
        },
      });
    }
    this.syncAllLayerRenders();
    this.refreshLayerStacking();
    this.render();
    this.onPixelsChanged();
    this.onLayersChanged?.();
    this.emitStats();
    return true;
  }

  /** Point a content at a texture (history undo/redo of a merge texture relink). */
  private setContentTextureForHistory(contentId: string, textureId: string | null): boolean {
    const content = this.contents.get(contentId);
    if (content === undefined) {
      return false;
    }
    if (textureId !== null && !this.textures.has(textureId)) {
      return false;
    }
    content.textureId = textureId;
    this.syncAllLayerRenders();
    return true;
  }

  /** Re-associate a cell content (history undo of a keep-layer merge). */
  private associateCellForHistory(layerId: string, frame: number, contentId: string): boolean {
    if (this.findLayer(layerId) === null || !this.contents.has(contentId)) {
      return false;
    }
    if (!Number.isInteger(frame) || frame < 0 || frame >= this.frameCount) {
      return false;
    }
    this.cells.set(animationCellKey(layerId, frame), contentId);
    this.syncAllLayerRenders();
    return true;
  }

  /** Dissociate a cell content (history redo of a keep-layer merge). */
  private dissociateCellForHistory(layerId: string, frame: number): boolean {
    const key = animationCellKey(layerId, frame);
    if (!this.cells.has(key)) {
      return false;
    }
    this.cells.delete(key);
    this.syncAllLayerRenders();
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
    if (
      this.floating !== null &&
      this.floating.active &&
      this.floating.layerId === id &&
      this.floating.frame === this.currentFrame
    ) {
      this.commitFloating();
    }
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
    if (transform.rotationX !== undefined) {
      const raw = Number.isFinite(transform.rotationX) ? (transform.rotationX as number) : 0;
      ensured.content.transform.rotationX = normalizeRotation(raw);
    }
    if (transform.rotationY !== undefined) {
      const raw = Number.isFinite(transform.rotationY) ? (transform.rotationY as number) : 0;
      ensured.content.transform.rotationY = normalizeRotation(raw);
    }
    if (transform.flipX !== undefined) {
      ensured.content.transform.flipX = transform.flipX;
    }
    if (transform.flipY !== undefined) {
      ensured.content.transform.flipY = transform.flipY;
    }
    if (transform.scaleX !== undefined || transform.scaleY !== undefined) {
      // Keep at least 1px (and at most 1024px) of effective dimension per
      // axis; non-finite or non-positive scales fall back to the minimum.
      const layer = this.findLayer(id);
      const width = layer === null ? 64 : Math.max(1, layer.width);
      const height = layer === null ? 64 : Math.max(1, layer.height);
      if (transform.scaleX !== undefined) {
        const raw = Number.isFinite(transform.scaleX) ? (transform.scaleX as number) : 0;
        ensured.content.transform.scaleX = Math.min(1024 / width, Math.max(1 / width, raw));
      }
      if (transform.scaleY !== undefined) {
        const raw = Number.isFinite(transform.scaleY) ? (transform.scaleY as number) : 0;
        ensured.content.transform.scaleY = Math.min(1024 / height, Math.max(1 / height, raw));
      }
    }
    if (transform.skewX !== undefined) {
      const raw = Number.isFinite(transform.skewX) ? (transform.skewX as number) : 0;
      ensured.content.transform.skewX = Math.min(
        GNUMARUS_MAX_LAYER_SKEW,
        Math.max(-GNUMARUS_MAX_LAYER_SKEW, raw),
      );
    }
    if (transform.skewY !== undefined) {
      const raw = Number.isFinite(transform.skewY) ? (transform.skewY as number) : 0;
      ensured.content.transform.skewY = Math.min(
        GNUMARUS_MAX_LAYER_SKEW,
        Math.max(-GNUMARUS_MAX_LAYER_SKEW, raw),
      );
    }
    this.syncAllLayerRenders();
    this.layoutSceneTransforms();
    this.render();
    this.updatePreviews();
    this.onTransformChanged?.();
    return true;
  }

  resetLayerTransform(id: string): boolean {
    if (
      this.floating !== null &&
      this.floating.active &&
      this.floating.layerId === id &&
      this.floating.frame === this.currentFrame
    ) {
      this.commitFloating();
    }
    const ensured = this.ensureCellContent(id, this.currentFrame);
    if (ensured === null) {
      return false;
    }
    ensured.content.transform = { ...IDENTITY_LAYER_TRANSFORM };
    this.syncAllLayerRenders();
    this.layoutSceneTransforms();
    this.render();
    this.updatePreviews();
    this.emitStats();
    this.onTransformChanged?.();
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
    this.commitFloatingIfHomeTexture(id);
    const beforeWidth = entry.width;
    const beforeHeight = entry.height;
    const beforeBuffer = entry.buffer.slice();
    const nextBuffer = resizePixelBuffer(entry.buffer, entry.width, entry.height, clampedWidth, clampedHeight);
    const afterBuffer = nextBuffer.slice();
    if (!this.setTexturePixels(id, clampedWidth, clampedHeight, nextBuffer)) {
      return false;
    }
    this.pushHistory({
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

  /**
   * Crop a texture to the smallest box containing every pixel with alpha
   * strictly greater than `threshold` (integer 0..254, clamped). Every cell
   * content referencing the texture has its transform shifted so the
   * remaining pixels keep the same apparent project position.
   * Returns false for missing textures, fully transparent textures and
   * already-tight textures (no history entry in those cases).
   * Successful crops are undoable.
   */
  fitTextureToSize(textureId: string, threshold: number): boolean {
    const entry = this.textures.get(textureId);
    if (entry === undefined) {
      return false;
    }
    this.commitFloatingIfHomeTexture(textureId);
    const limit = Number.isFinite(threshold) ? Math.min(254, Math.max(0, Math.floor(threshold))) : 0;
    const box = findAlphaBoundingBox(entry.buffer, entry.width, entry.height, limit);
    if (box === null) {
      return false;
    }
    if (box.left === 0 && box.top === 0 && box.width === entry.width && box.height === entry.height) {
      return false;
    }
    return this.applyTextureCropBox(textureId, entry, box);
  }

  /**
   * Crop a cell texture to the region visible on the canvas through that
   * cell content transform. Returns "cropped" on success, "unchanged" when
   * the cell has no texture or the texture already lies fully inside the
   * canvas, and "outside" when the content sits fully outside the canvas
   * (cropping would destroy every pixel, so nothing happens).
   */
  cropCellTextureToCanvas(layerId: string, frame: number): "cropped" | "unchanged" | "outside" {
    const contentId = this.cells.get(animationCellKey(layerId, frame));
    const content = contentId === undefined ? undefined : this.contents.get(contentId);
    const textureId = content?.textureId ?? null;
    const entry = textureId === null ? undefined : this.textures.get(textureId);
    if (entry === undefined || textureId === null || content === undefined) {
      return "unchanged";
    }
    this.commitFloatingIfHomeTexture(textureId);
    const box = canvasVisibleTextureBox(
      this.imageWidth,
      this.imageHeight,
      entry.width,
      entry.height,
      content.transform,
    );
    if (box === null) {
      return "outside";
    }
    if (box.left === 0 && box.top === 0 && box.width === entry.width && box.height === entry.height) {
      return "unchanged";
    }
    return this.applyTextureCropBox(textureId, entry, box) ? "cropped" : "unchanged";
  }

  /**
   * Resize a cell texture so it covers the whole canvas area: crops excess
   * outside the canvas and pads transparent pixels where the canvas maps
   * outside the texture, through that cell content transform. Rendering is
   * pixel-identical (the transform is re-seated, pixels are only moved or
   * padded with zeros). Returns "resized" on success, "unchanged" when the
   * texture already covers the canvas exactly, and "outside" when the
   * content is fully outside, degenerate, or would exceed the texture cap.
   */
  resizeCellTextureToCanvas(layerId: string, frame: number): "resized" | "unchanged" | "outside" {
    const contentId = this.cells.get(animationCellKey(layerId, frame));
    const content = contentId === undefined ? undefined : this.contents.get(contentId);
    const textureId = content?.textureId ?? null;
    const entry = textureId === null ? undefined : this.textures.get(textureId);
    if (entry === undefined || textureId === null || content === undefined) {
      return "unchanged";
    }
    this.commitFloatingIfHomeTexture(textureId);
    const box = canvasResizeTextureBox(
      this.imageWidth,
      this.imageHeight,
      entry.width,
      entry.height,
      content.transform,
    );
    if (
      box === null ||
      box.width < 1 ||
      box.height < 1 ||
      box.width > GNUMARUS_MAX_TEXTURE_DIM ||
      box.height > GNUMARUS_MAX_TEXTURE_DIM
    ) {
      return "outside";
    }
    if (box.left === 0 && box.top === 0 && box.width === entry.width && box.height === entry.height) {
      return "unchanged";
    }
    return this.applyTextureCropBox(textureId, entry, box) ? "resized" : "unchanged";
  }

  /**
   * Expand a cell texture by `amount` pixels toward `direction`, filling the
   * new pixels with transparent black and re-seating the content transform
   * so the apparent position is unchanged. Undoable. Returns "expanded" on
   * success or "unchanged" when the cell has no texture (or is capped).
   */
  expandCellTexture(
    layerId: string,
    frame: number,
    direction: "up" | "down" | "left" | "right",
    amount: number,
  ): "expanded" | "unchanged" {
    const contentId = this.cells.get(animationCellKey(layerId, frame));
    const content = contentId === undefined ? undefined : this.contents.get(contentId);
    const textureId = content?.textureId ?? null;
    const entry = textureId === null ? undefined : this.textures.get(textureId);
    if (entry === undefined || textureId === null) {
      return "unchanged";
    }
    const step = Number.isFinite(amount) ? Math.min(1024, Math.max(1, Math.floor(amount))) : 16;
    const growth = Math.min(step, GNUMARUS_MAX_TEXTURE_DIM - (direction === "left" || direction === "right" ? entry.width : entry.height));
    if (growth < 1) {
      return "unchanged";
    }
    this.commitFloatingIfHomeTexture(textureId);
    const box: GnumarusCropBox =
      direction === "up"
        ? { left: 0, top: -growth, width: entry.width, height: entry.height + growth }
        : direction === "down"
          ? { left: 0, top: 0, width: entry.width, height: entry.height + growth }
          : direction === "left"
            ? { left: -growth, top: 0, width: entry.width + growth, height: entry.height }
            : { left: 0, top: 0, width: entry.width + growth, height: entry.height };
    return this.applyTextureCropBox(textureId, entry, box) ? "expanded" : "unchanged";
  }

  /**
   * Shared texture-crop body: snapshots the texture, copies the box pixels,
   * re-seats every sharing content transform so rendering is unchanged,
   * records an undoable history entry and refreshes the views.
   */
  private applyTextureCropBox(
    textureId: string,
    entry: { width: number; height: number; buffer: Uint8ClampedArray },
    box: GnumarusCropBox,
  ): boolean {
    const record = this.cropTextureToBox(textureId, entry, box);
    if (record === null) {
      return false;
    }
    this.pushHistory({
      type: "fit",
      fit: record,
    });
    this.markTextureViewsDirty(textureId);
    this.syncAllLayerRenders();
    this.refreshLayerStacking();
    this.render();
    this.onPixelsChanged();
    this.onLayersChanged?.();
    this.emitStats();
    return true;
  }

  /**
   * Crop a texture to a box and re-seat every sharing content transform,
   * without recording history or refreshing the views. Returns the fit
   * record for the caller to batch, or null when the pixels cannot be set.
   */
  private cropTextureToBox(
    textureId: string,
    entry: { width: number; height: number; buffer: Uint8ClampedArray },
    box: GnumarusCropBox,
  ): GnumarusFitRecord | null {
    const beforeWidth = entry.width;
    const beforeHeight = entry.height;
    const beforeBuffer = entry.buffer.slice();
    // Starts transparent; source rows/columns outside the old texture (from
    // padding origins) stay zeroed in all channels.
    const afterBuffer = new Uint8ClampedArray(box.width * box.height * 4);
    for (let y = 0; y < box.height; y += 1) {
      const srcY = box.top + y;
      if (srcY < 0 || srcY >= beforeHeight) {
        continue;
      }
      const srcLeft = Math.max(0, box.left);
      const srcRight = Math.min(beforeWidth, box.left + box.width);
      if (srcRight <= srcLeft) {
        continue;
      }
      const src = (srcY * beforeWidth + srcLeft) * 4;
      afterBuffer.set(
        entry.buffer.subarray(src, src + (srcRight - srcLeft) * 4),
        (y * box.width + (srcLeft - box.left)) * 4,
      );
    }
    const transforms = [...this.contents.values()]
      .filter((content) => content.textureId === textureId)
      .map((content) => ({
        contentId: content.id,
        before: { ...content.transform },
        after: shiftTransformForCrop(content.transform, beforeWidth, beforeHeight, box),
      }));
    if (!this.setTexturePixels(textureId, box.width, box.height, afterBuffer)) {
      return null;
    }
    for (const record of transforms) {
      const content = this.contents.get(record.contentId);
      if (content !== undefined) {
        content.transform = { ...record.after };
      }
    }
    return {
      textureId,
      beforeWidth,
      beforeHeight,
      beforeBuffer,
      afterWidth: box.width,
      afterHeight: box.height,
      afterBuffer: afterBuffer.slice(),
      transforms,
    };
  }

  private refreshAfterBatchCrop(textureIds: Iterable<string>): void {
    for (const textureId of textureIds) {
      this.markTextureViewsDirty(textureId);
    }
    this.syncAllLayerRenders();
    this.refreshLayerStacking();
    this.render();
    this.onPixelsChanged();
    this.onLayersChanged?.();
    this.emitStats();
  }

  /**
   * Crop every project texture to its alpha bounding box (same rule as
   * `fitTextureToSize`), recording a single undoable history entry for the
   * whole batch. Returns fitted/unchanged counts.
   */
  fitAllTexturesToSize(threshold: number): { fitted: number; unchanged: number } {
    const limit = Number.isFinite(threshold) ? Math.min(254, Math.max(0, Math.floor(threshold))) : 0;
    const records: GnumarusFitRecord[] = [];
    const touched = new Set<string>();
    let unchanged = 0;
    for (const [textureId, entry] of this.textures) {
      this.commitFloatingIfHomeTexture(textureId);
      const box = findAlphaBoundingBox(entry.buffer, entry.width, entry.height, limit);
      if (box === null) {
        unchanged += 1;
        continue;
      }
      if (box.left === 0 && box.top === 0 && box.width === entry.width && box.height === entry.height) {
        unchanged += 1;
        continue;
      }
      const record = this.cropTextureToBox(textureId, entry, box);
      if (record === null) {
        unchanged += 1;
        continue;
      }
      records.push(record);
      touched.add(textureId);
    }
    if (records.length === 0) {
      return { fitted: 0, unchanged };
    }
    this.pushHistory({ type: "fitBatch", fits: records });
    this.refreshAfterBatchCrop(touched);
    return { fitted: records.length, unchanged };
  }

  /**
   * Crop every cell content texture to its canvas-visible region (same rule
   * as `cropCellTextureToCanvas`). Contents are grouped by texture so a
   * shared texture is cropped once per distinct referencing geometry; each
   * box is recomputed from current state and every referencing transform
   * is re-seated, so rendering stays pixel-identical. Records a single
   * undoable history entry. Returns cropped/unchanged/outside counts.
   */
  cropAllCellsToCanvas(): { cropped: number; unchanged: number; outside: number } {
    const byTexture = new Map<string, string[]>();
    for (const content of this.contents.values()) {
      if (content.textureId === null) {
        continue;
      }
      const group = byTexture.get(content.textureId);
      if (group === undefined) {
        byTexture.set(content.textureId, [content.id]);
      } else {
        group.push(content.id);
      }
    }
    const records: GnumarusFitRecord[] = [];
    const touched = new Set<string>();
    let unchanged = 0;
    let outside = 0;
    for (const [textureId, contentIds] of byTexture) {
      this.commitFloatingIfHomeTexture(textureId);
      for (const contentId of contentIds) {
        const content = this.contents.get(contentId);
        const entry = this.textures.get(textureId);
        if (content === undefined || entry === undefined) {
          unchanged += 1;
          continue;
        }
        const box = canvasVisibleTextureBox(
          this.imageWidth,
          this.imageHeight,
          entry.width,
          entry.height,
          content.transform,
        );
        if (box === null) {
          outside += 1;
          continue;
        }
        if (box.left === 0 && box.top === 0 && box.width === entry.width && box.height === entry.height) {
          unchanged += 1;
          continue;
        }
        const record = this.cropTextureToBox(textureId, entry, box);
        if (record === null) {
          unchanged += 1;
          continue;
        }
        records.push(record);
        touched.add(textureId);
      }
    }
    if (records.length === 0) {
      return { cropped: 0, unchanged, outside };
    }
    this.pushHistory({ type: "fitBatch", fits: records });
    this.refreshAfterBatchCrop(touched);
    return { cropped: records.length, unchanged, outside };
  }

  /**
   * Replace texture pixels with freshly decoded file buffers (reload-all
   * textures action). Same-size only: unknown ids and size mismatches are
   * skipped. Buffers identical to memory count as applied without a
   * history record; anything else records a single undoable history entry
   * for the whole batch. Returns applied/skipped counts.
   */
  reloadTexturePixels(entries: Array<{ textureId: string; buffer: Uint8ClampedArray }>): {
    applied: number;
    skipped: number;
  } {
    const records: GnumarusReloadRecord[] = [];
    const touched = new Set<string>();
    let applied = 0;
    let skipped = 0;
    for (const { textureId, buffer } of entries) {
      const entry = this.textures.get(textureId);
      if (entry === undefined || buffer.length !== entry.width * entry.height * 4) {
        skipped += 1;
        continue;
      }
      this.commitFloatingIfHomeTexture(textureId);
      if (buffersEqual(entry.buffer, buffer)) {
        applied += 1;
        touched.add(textureId);
        continue;
      }
      const record: GnumarusReloadRecord = {
        textureId,
        width: entry.width,
        height: entry.height,
        beforeBuffer: new Uint8ClampedArray(entry.buffer),
        afterBuffer: new Uint8ClampedArray(buffer),
      };
      if (!this.setTexturePixels(textureId, entry.width, entry.height, new Uint8ClampedArray(buffer))) {
        skipped += 1;
        continue;
      }
      records.push(record);
      touched.add(textureId);
      applied += 1;
    }
    if (records.length > 0) {
      this.pushHistory({ type: "reloadBatch", reloads: records });
    }
    if (applied > 0) {
      this.refreshAfterBatchCrop(touched);
    }
    return { applied, skipped };
  }

  private applyFitToSize(
    textureId: string,
    width: number,
    height: number,
    buffer: Uint8ClampedArray,
    transforms: Array<{ contentId: string; transform: GnumarusLayerTransform }>,
  ): boolean {
    const copy = new Uint8ClampedArray(buffer);
    if (!this.setTexturePixels(textureId, width, height, copy)) {
      return false;
    }
    for (const item of transforms) {
      const content = this.contents.get(item.contentId);
      if (content !== undefined) {
        content.transform = { ...item.transform };
      }
    }
    // setTexturePixels re-syncs the layer renders above, but with the
    // pre-restore transforms; sync again now that they are restored.
    this.syncAllLayerRenders();
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
    this.textureNameCounter = 1;
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
        name: this.nextTextureName(),
        width: input.width,
        height: input.height,
        buffer: copy,
      });
      layer.renderTextureId = input.id;
      const contentId = this.nextContentId();
      this.contents.set(contentId, {
        id: contentId,
        name: `C${this.contentCounter - 1}`,
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
    this.dropFloating();
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
      namedAnimations?: GnumarusNamedAnimation[];
      activeAnimation?: string | null;
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
    this.defaultFrameDuration = clampFrameDurationSec(data.defaultFrameDuration ?? GNUMARUS_DEFAULT_FRAME_DURATION_SEC);
    this.frameNames = ensureFrameNames(data.frames, data.frameNames ?? []);
    this.frameNameCounter = data.frames + 1;
    for (const name of this.frameNames) {
      const match = /^F(\d+)$/.exec(name);
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
        this.frameDurations.set(entry.frame, clampFrameDurationSec(entry.duration));
      }
    }
    this.namedAnimations = [];
    this.activeAnimationName = null;
    for (const animation of data.namedAnimations ?? []) {
      if (!this.addNamedAnimation(animation)) {
        throw new Error(`Invalid named animation: ${typeof animation.name === "string" ? animation.name : "?"}`);
      }
    }
    if (data.activeAnimation !== undefined && data.activeAnimation !== null) {
      if (!this.setActiveAnimation(data.activeAnimation)) {
        throw new Error(`Unknown active animation: ${data.activeAnimation}`);
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
    let maxTextureName = 0;
    for (const texture of data.textures) {
      const match = /^(?:[Tt]|[Tt]exture )(\d+)$/.exec(texture.name);
      if (match?.[1] !== undefined) {
        maxTextureName = Math.max(maxTextureName, Number.parseInt(match[1], 10) + 1);
      }
    }
    this.layerCounter = Math.max(maxLayer, data.layers.length);
    this.contentCounter = Math.max(maxContent, data.contents.length + 1, 1);
    this.textureCounter = Math.max(maxTexture, 1);
    this.textureNameCounter = Math.max(maxTextureName, data.textures.length + 1, 1);
    const top = this.layers[this.layers.length - 1];
    if (top !== undefined) {
      this.activeLayerId = top.id;
    }
    this.history.clear();
    this.dropFloating();
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
    this.defaultFrameDuration = GNUMARUS_DEFAULT_FRAME_DURATION_SEC;
    this.frameNames = [defaultFrameName(0)];
    this.frameNameCounter = 2;
    this.namedAnimations = [];
    this.activeAnimationName = null;
  }

  newProject(width: number, height: number): void {
    this.imageWidth = width;
    this.imageHeight = height;
    this.clearAllLayers();
    this.textureNameCounter = 1;
    const first = this.createLayerInternal("layer0", "L1", true, 1, createPixelBuffer(width, height), width, height, {
      ...IDENTITY_LAYER_TRANSFORM,
    });
    this.layers.push(first);
    this.textures.set("layer0", {
      id: "layer0",
      name: this.nextTextureName(),
      width,
      height,
      buffer: first.buffer,
    });
    first.renderTextureId = "layer0";
    this.contents.set("content1", {
      id: "content1",
      name: "C1",
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
    this.dropFloating();
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

  setPressureResponse(response: GnumarusPressureResponse): boolean {
    const parsed = parsePressureResponse(response);
    if (parsed === this.pressureResponse) {
      return false;
    }
    this.pressureResponse = parsed;
    this.emitStats();
    this.updatePreviews();
    return true;
  }

  /** Pencil size scaled by the current stroke pressure when enabled. */
  private pressureBrushSize(): number {
    return clampBrushSizeFloat(this.brushSize * pressureSizeMultiplier(this.pressureResponse, this.strokePressure));
  }

  /** Pencil color with alpha scaled by the current stroke pressure when enabled. */
  private pressureBrushColor(): GnumarusRgba {
    return {
      ...this.color,
      a: Math.round(this.color.a * pressureAlphaMultiplier(this.pressureResponse, this.strokePressure)),
    };
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
    const mapped = projectToLayerImageFloat(project.x, project.y, layer.width, layer.height, transform);
    if (mapped === null) {
      return null;
    }
    return { x: mapped.x, y: mapped.y };
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
    color: GnumarusRgba,
  ): void {
    tex.buffer.set(base);
    applyCoverageMask(tex.buffer, mask, tex.width, tex.height, color, this.blendMode, locked);
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
    const size = this.pressureBrushSize();
    const color = this.pressureBrushColor();
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
        this.repaintFromMask(tex, base, mask, locked, color);
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
          setPixel(tex.buffer, tex.width, tex.height, x, y, color, locked, this.blendMode);
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
        size,
        this.brushShape,
        this.pencilAntialias,
      );
      this.repaintFromMask(tex, this.strokeBase, this.strokeMask, locked, color);
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
      size,
      this.brushShape,
      this.pencilAntialias,
      color,
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
      this.repaintFromMask(tex, base, mask, locked, this.color);
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
   * Push a history entry, keeping floating-selection bookkeeping coherent:
   * evictions shift the recorded cut depth, and a detached (undo-deactivated)
   * floating selection is discarded since its redo chain is gone.
   */
  private pushHistory(entry: GnumarusHistoryEntry): void {
    const evicted = this.history.push(entry);
    if (this.floating !== null) {
      this.floating.cutDepth = Math.max(0, this.floating.cutDepth - evicted);
    }
    if (this.floating !== null && !this.floating.active) {
      this.floating = null;
      this.syncFloatingPlane();
      this.updatePreviews();
    }
  }

  /** Whether a floating selection is currently active (committable, movable). */
  hasFloatingSelection(): boolean {
    return this.floating !== null && this.floating.active;
  }

  /** Floating placement as the pure affine module expects it. */
  private floatingPlacement(floating: GnumarusFloatingSelection): GnumarusSelectionPlacement {
    return {
      cx: floating.cx,
      cy: floating.cy,
      rotation: floating.rotation,
      scaleX: floating.scaleX,
      scaleY: floating.scaleY,
      skewX: floating.skewX,
      skewY: floating.skewY,
      rotationX: floating.rotationX,
      rotationY: floating.rotationY,
      flipX: floating.flipX,
      flipY: floating.flipY,
      width: floating.width,
      height: floating.height,
    };
  }

  /** Floating selection bbox in home texture pixels, or null when inactive. */
  getFloatingRect(): { x: number; y: number; width: number; height: number } | null {
    const floating = this.floating;
    if (floating === null || !floating.active) {
      return null;
    }
    const box = selectionCornerBox(this.floatingPlacement(floating));
    const x = Math.floor(box.minX);
    const y = Math.floor(box.minY);
    return { x, y, width: Math.ceil(box.maxX) - x, height: Math.ceil(box.maxY) - y };
  }

  /** Floating transform params, or null when no selection is active. */
  getFloatingTransform(): {
    cx: number;
    cy: number;
    rotation: number;
    scaleX: number;
    scaleY: number;
    skewX: number;
    skewY: number;
    rotationX: number;
    rotationY: number;
    flipX: boolean;
    flipY: boolean;
    width: number;
    height: number;
  } | null {
    const floating = this.floating;
    if (floating === null || !floating.active) {
      return null;
    }
    return {
      cx: floating.cx,
      cy: floating.cy,
      rotation: floating.rotation,
      scaleX: floating.scaleX,
      scaleY: floating.scaleY,
      skewX: floating.skewX,
      skewY: floating.skewY,
      rotationX: floating.rotationX,
      rotationY: floating.rotationY,
      flipX: floating.flipX,
      flipY: floating.flipY,
      width: floating.width,
      height: floating.height,
    };
  }

  /**
   * Reset only the rotations (spin + tilts) of the floating selection,
   * keeping position, scale, skew and mirrors. Used by the center handle
   * of the destructive 3D rotation tool.
   */
  resetFloatingRotations(): boolean {
    const floating = this.floating;
    if (floating === null || !floating.active) {
      return false;
    }
    floating.rotation = 0;
    floating.rotationX = 0;
    floating.rotationY = 0;
    this.syncFloatingPlane();
    this.render();
    this.updatePreviews();
    return true;
  }

  /**
   * Reset the floating transform to the as-cut snapshot (position included).
   * Ephemeral like moves: no history entry, commit captures the result.
   */
  resetFloatingTransform(): boolean {
    const floating = this.floating;
    if (floating === null || !floating.active) {
      return false;
    }
    floating.cx = floating.initial.cx;
    floating.cy = floating.initial.cy;
    floating.rotation = floating.initial.rotation;
    floating.scaleX = floating.initial.scaleX;
    floating.scaleY = floating.initial.scaleY;
    floating.skewX = floating.initial.skewX;
    floating.skewY = floating.initial.skewY;
    floating.flipX = floating.initial.flipX;
    floating.flipY = floating.initial.flipY;
    this.syncFloatingPlane();
    this.render();
    this.updatePreviews();
    return true;
  }

  /** Refresh plane, canvas and overlay after a floating placement change. */
  private afterFloatingChange(): void {
    this.syncFloatingPlane();
    this.render();
    this.updatePreviews();
  }

  /**
   * Map a client point to floating-local buffer coords (unbounded floats).
   * Null when no selection is active, home is hidden, or degenerate.
   */
  private clientToSelectionLocal(clientX: number, clientY: number): { x: number; y: number } | null {
    const floating = this.floating;
    if (floating === null || !floating.active || !this.floatingHomeVisible()) {
      return null;
    }
    const cursor = this.clientToLayerImageFloat(clientX, clientY);
    if (cursor === null) {
      return null;
    }
    return inverseSelectionPoint(this.floatingPlacement(floating), cursor.x, cursor.y);
  }

  /** Screen-space anchor layout in container-local pixels, or null. */
  private selectionHandleLayout(): Array<{
    id: GnumarusSelectionHandleId;
    kind: "resize" | "rotate" | "skew" | "flip" | "center";
    x: number;
    y: number;
    angle: number;
  }> | null {
    const floating = this.floating;
    if (floating === null || !floating.active || !this.floatingHomeVisible()) {
      return null;
    }
    const layer = this.activeLayer();
    if (layer === null) {
      return null;
    }
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return null;
    }
    const placement = this.floatingPlacement(floating);
    const local: GnumarusRect = { left: 0, top: 0, width: rect.width, height: rect.height };
    const view = this.viewTransform();
    const toLocal = (bufferX: number, bufferY: number): { x: number; y: number } => {
      const home = forwardSelectionPoint(placement, bufferX, bufferY);
      const project = layerImageToProject(home.x, home.y, layer.width, layer.height, layer.transform);
      const client = projectToScreen(project.x, project.y, local, view);
      return { x: client.x, y: client.y };
    };
    const halfW = floating.width / 2;
    const halfH = floating.height / 2;
    const center = toLocal(halfW, halfH);
    const corners: Array<{ id: GnumarusSelectionHandleId; bx: number; by: number }> = [
      { id: "resize-nw", bx: 0, by: 0 },
      { id: "resize-ne", bx: floating.width, by: 0 },
      { id: "resize-se", bx: floating.width, by: floating.height },
      { id: "resize-sw", bx: 0, by: floating.height },
    ];
    const edges: Array<{ id: GnumarusSelectionHandleId; bx: number; by: number }> = [
      { id: "resize-n", bx: halfW, by: 0 },
      { id: "resize-s", bx: halfW, by: floating.height },
      { id: "resize-e", bx: floating.width, by: halfH },
      { id: "resize-w", bx: 0, by: halfH },
    ];
    return this.placeBoxHandles(
      center,
      corners.map((corner) => ({ id: corner.id, point: toLocal(corner.bx, corner.by) })),
      edges.map((edge) => ({ id: edge.id, point: toLocal(edge.bx, edge.by) })),
    );
  }

  /**
   * Build the shared anchor set (resize rects, offset rotate arcs, outer
   * skew arrows, center reset ring with its flip-arrow satellites) from
   * screen-space box corners, edge midpoints and center. Used identically
   * by the destructive selection and the non-destructive layer overlays.
   */
  private placeBoxHandles(
    center: { x: number; y: number },
    corners: Array<{ id: GnumarusSelectionHandleId; point: { x: number; y: number } }>,
    edges: Array<{ id: GnumarusSelectionHandleId; point: { x: number; y: number } }>,
  ): Array<{
    id: GnumarusSelectionHandleId;
    kind: "resize" | "rotate" | "skew" | "flip" | "center";
    x: number;
    y: number;
    angle: number;
  }> {
    const handles: Array<{
      id: GnumarusSelectionHandleId;
      kind: "resize" | "rotate" | "skew" | "flip" | "center";
      x: number;
      y: number;
      angle: number;
    }> = [];
    const outward = (point: { x: number; y: number }): { nx: number; ny: number } => {
      const dx = point.x - center.x;
      const dy = point.y - center.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length > 1e-6) {
        return { nx: dx / length, ny: dy / length };
      }
      return { nx: 0, ny: -1 };
    };
    for (const corner of corners) {
      handles.push({ id: corner.id, kind: "resize", x: corner.point.x, y: corner.point.y, angle: 0 });
      const { nx, ny } = outward(corner.point);
      handles.push({
        id: corner.id.replace("resize-", "rotate-") as GnumarusSelectionHandleId,
        kind: "rotate",
        x: corner.point.x + nx * 20,
        y: corner.point.y + ny * 20,
        angle: (Math.atan2(ny, nx) * 180) / Math.PI - 225,
      });
    }
    for (const edge of edges) {
      handles.push({ id: edge.id, kind: "resize", x: edge.point.x, y: edge.point.y, angle: 0 });
      const { nx, ny } = outward(edge.point);
      const vertical = edge.id === "resize-e" || edge.id === "resize-w";
      handles.push({
        id: edge.id.replace("resize-", "skew-") as GnumarusSelectionHandleId,
        kind: "skew",
        x: edge.point.x + nx * 34,
        y: edge.point.y + ny * 34,
        angle: vertical ? 90 : 0,
      });
    }
    handles.push({ id: "center", kind: "center", x: center.x, y: center.y, angle: 0 });
    // Flip anchors ring the center handle: flip-n/s above/below toggle the
    // horizontal mirror (flipX), flip-e/w left/right toggle flipY. Fixed
    // screen offset along the box axes so they track rotation.
    const flipSpots: Array<{ id: GnumarusSelectionHandleId; edgeId: GnumarusSelectionHandleId; vertical: boolean }> = [
      { id: "flip-n", edgeId: "resize-n", vertical: false },
      { id: "flip-s", edgeId: "resize-s", vertical: false },
      { id: "flip-e", edgeId: "resize-e", vertical: true },
      { id: "flip-w", edgeId: "resize-w", vertical: true },
    ];
    for (const spot of flipSpots) {
      const edge = handles.find((handle) => handle.id === spot.edgeId);
      if (edge === undefined) {
        continue;
      }
      const { nx, ny } = outward({ x: edge.x, y: edge.y });
      handles.push({
        id: spot.id,
        kind: "flip",
        x: center.x + nx * 26,
        y: center.y + ny * 26,
        angle: spot.vertical ? 90 : 0,
      });
    }
    return handles;
  }

  /** Hit-test selection anchors by priority (rotate, skew, flip, resize, center). */
  private selectionHitTest(
    clientX: number,
    clientY: number,
  ): { kind: "rotate" | "skew" | "flip" | "resize" | "center"; id: GnumarusSelectionHandleId } | null {
    const layout = this.selectionHandleLayout();
    if (layout === null) {
      return null;
    }
    const rect = this.renderer.domElement.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    const radiusSquared = 12 * 12;
    for (const kind of ["rotate", "skew", "flip", "resize", "center"] as const) {
      for (const handle of layout) {
        if (handle.kind !== kind) {
          continue;
        }
        const dx = handle.x - mx;
        const dy = handle.y - my;
        if (dx * dx + dy * dy <= radiusSquared) {
          return { kind, id: handle.id };
        }
      }
    }
    return null;
  }

  /** Test hook: anchor layout in container-local pixels (destructure only). */
  getSelectionHandles(): Array<{ id: string; x: number; y: number }> {
    if (this.tool === "transform3d" || this.tool === "destransform3d") {
      const frame = this.rot3DFrameFor(this.tool === "transform3d" ? "layer" : "floating");
      if (frame === null) {
        return [];
      }
      return [
        ...this.rot3DHandlePositions(frame).map((handle) => ({ id: handle.id, x: handle.x, y: handle.y })),
        { id: "center", x: frame.center.x, y: frame.center.y },
      ];
    }
    const layout =
      this.tool === "destransform"
        ? this.selectionHandleLayout()
        : this.tool === "transform"
          ? this.layerHandleLayout()
          : null;
    return (layout ?? []).map((handle) => ({ id: handle.id, x: handle.x, y: handle.y }));
  }

  /** Start a resize/rotate/skew/flip/center gesture from a hit anchor. */
  private beginSelectionGesture(
    hit: { kind: "rotate" | "skew" | "flip" | "resize" | "center"; id: GnumarusSelectionHandleId },
    event: PointerEvent,
  ): boolean {
    const floating = this.floating;
    if (floating === null || !floating.active) {
      return false;
    }
    const cursor = this.clientToLayerImageFloat(event.clientX, event.clientY);
    if (cursor === null) {
      return false;
    }
    if (hit.kind === "center") {
      this.centerTap = {
        startClientX: event.clientX,
        startClientY: event.clientY,
        grabDX: cursor.x - floating.cx,
        grabDY: cursor.y - floating.cy,
      };
      return true;
    }
    if (hit.kind === "flip") {
      // Click toggles the mirror flag; a drag cancels the tap (no change).
      this.flipTap = {
        axis: hit.id === "flip-n" || hit.id === "flip-s" ? "x" : "y",
        startClientX: event.clientX,
        startClientY: event.clientY,
      };
      return true;
    }
    if (hit.kind === "rotate") {
      const layer = this.activeLayer();
      if (layer === null) {
        return false;
      }
      const rect = this.renderer.domElement.getBoundingClientRect();
      const project = layerImageToProject(floating.cx, floating.cy, layer.width, layer.height, layer.transform);
      const center = projectToScreen(
        project.x,
        project.y,
        { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        this.viewTransform(),
      );
      this.rotateDrag = {
        startRotation: floating.rotation,
        grabAngle: Math.atan2(event.clientY - center.y, event.clientX - center.x),
        centerX: center.x,
        centerY: center.y,
      };
      return true;
    }
    const placement = this.floatingPlacement(floating);
    const local = inverseSelectionPoint(placement, cursor.x, cursor.y);
    if (local === null) {
      return false;
    }
    if (hit.kind === "skew") {
      // Centered shear: the dragged edge follows the cursor along the edge
      // axis while the opposite edge mirrors it (center stays fixed).
      // Top/bottom shear horizontally (drag along the box X axis);
      // left/right shear vertically (drag along the box Y axis).
      // Dragging perpendicular to the edge projects to zero, so it does
      // nothing. Directions come from the on-screen box axes so the feel
      // stays uniform under rotation and scale.
      const axis = hit.id === "skew-n" || hit.id === "skew-s" ? "x" : "y";
      const layout = this.selectionHandleLayout();
      const first = axis === "x" ? "resize-n" : "resize-e";
      const second = axis === "x" ? "resize-s" : "resize-w";
      const firstPos = layout?.find((handle) => handle.id === first);
      const secondPos = layout?.find((handle) => handle.id === second);
      if (firstPos === undefined || secondPos === undefined) {
        return false;
      }
      // Screen extent the shear is measured in (height for x, width for y).
      const perpDX = secondPos.x - firstPos.x;
      const perpDY = secondPos.y - firstPos.y;
      const perpLength = Math.sqrt(perpDX * perpDX + perpDY * perpDY);
      if (!(perpLength > 1e-6)) {
        return false;
      }
      // Local shear direction on screen: +X for horizontal shear, +Y for
      // vertical shear (buffer coords are y-down, matching home pixels).
      const placement = this.floatingPlacement(floating);
      const originHome = forwardSelectionPoint(placement, floating.width / 2, floating.height / 2);
      const layer = this.activeLayer();
      if (layer === null) {
        return false;
      }
      const rect = this.renderer.domElement.getBoundingClientRect();
      const local: GnumarusRect = { left: 0, top: 0, width: rect.width, height: rect.height };
      const view = this.viewTransform();
      const projectHome = (hx: number, hy: number): { x: number; y: number } => {
        const project = layerImageToProject(hx, hy, layer.width, layer.height, layer.transform);
        return projectToScreen(project.x, project.y, local, view);
      };
      const centerScreen = projectHome(originHome.x, originHome.y);
      const plusHome =
        axis === "x"
          ? forwardSelectionPoint(placement, floating.width / 2 + 1, floating.height / 2)
          : forwardSelectionPoint(placement, floating.width / 2, floating.height / 2 + 1);
      const plusScreen = projectHome(plusHome.x, plusHome.y);
      const dirX = plusScreen.x - centerScreen.x;
      const dirY = plusScreen.y - centerScreen.y;
      const dirLength = Math.sqrt(dirX * dirX + dirY * dirY);
      if (!(dirLength > 1e-9)) {
        return false;
      }
      this.skewDrag = {
        axis,
        sign: hit.id === "skew-n" || hit.id === "skew-w" ? -1 : 1,
        startSkew: axis === "x" ? floating.skewX : floating.skewY,
        grabClientX: event.clientX,
        grabClientY: event.clientY,
        dirX: dirX / dirLength,
        dirY: dirY / dirLength,
        extent: perpLength,
      };
      return true;
    }
    const opposite: Record<string, { bx: number; by: number; axis: "both" | "x" | "y" }> = {
      "resize-nw": { bx: floating.width, by: floating.height, axis: "both" },
      "resize-ne": { bx: 0, by: floating.height, axis: "both" },
      "resize-se": { bx: 0, by: 0, axis: "both" },
      "resize-sw": { bx: floating.width, by: 0, axis: "both" },
      "resize-n": { bx: floating.width / 2, by: floating.height, axis: "y" },
      "resize-s": { bx: floating.width / 2, by: 0, axis: "y" },
      "resize-e": { bx: 0, by: floating.height / 2, axis: "x" },
      "resize-w": { bx: floating.width, by: floating.height / 2, axis: "x" },
    };
    const info = opposite[hit.id];
    if (info === undefined) {
      return false;
    }
    const anchorHome = forwardSelectionPoint(placement, info.bx, info.by);
    this.resizeDrag = {
      anchorBufferX: info.bx,
      anchorBufferY: info.by,
      anchorHomeX: anchorHome.x,
      anchorHomeY: anchorHome.y,
      grabLocalX: local.x - floating.width / 2,
      grabLocalY: local.y - floating.height / 2,
      startScaleX: floating.scaleX,
      startScaleY: floating.scaleY,
      axis: info.axis,
      placement: { ...this.floatingPlacement(floating) },
    };
    return true;
  }

  /** Advance an in-progress resize/rotate/skew gesture from the cursor. */
  private updateTransformGesture(clientX: number, clientY: number): void {
    const floating = this.floating;
    if (floating === null || !floating.active || !this.floatingHomeVisible()) {
      this.resizeDrag = null;
      this.rotateDrag = null;
      this.skewDrag = null;
      return;
    }
    if (this.rotateDrag !== null) {
      const gesture = this.rotateDrag;
      const angle = Math.atan2(clientY - gesture.centerY, clientX - gesture.centerX);
      floating.rotation = normalizeRotation(gesture.startRotation + (angle - gesture.grabAngle));
      this.lastMouseClient = { x: clientX, y: clientY };
      this.afterFloatingChange();
      return;
    }
    if (this.skewDrag !== null) {
      // Centered shear: only the along-edge component matters; the center
      // stays fixed so the opposite edge mirrors the dragged one.
      const gesture = this.skewDrag;
      const s =
        ((clientX - gesture.grabClientX) * gesture.dirX + (clientY - gesture.grabClientY) * gesture.dirY) /
        gesture.extent;
      const skew = Math.min(
        GNUMARUS_MAX_SELECTION_SKEW,
        Math.max(-GNUMARUS_MAX_SELECTION_SKEW, gesture.startSkew + gesture.sign * s),
      );
      if (gesture.axis === "x") {
        floating.skewX = skew;
      } else {
        floating.skewY = skew;
      }
      this.lastMouseClient = { x: clientX, y: clientY };
      this.afterFloatingChange();
      return;
    }
    if (this.resizeDrag !== null) {
      const gesture = this.resizeDrag;
      const cursor = this.clientToLayerImageFloat(clientX, clientY);
      if (cursor === null) {
        return;
      }
      const local = inverseSelectionPoint(gesture.placement, cursor.x, cursor.y);
      if (local === null) {
        return;
      }
      const halfW = floating.width / 2;
      const halfH = floating.height / 2;
      const anchorCX = gesture.anchorBufferX - halfW;
      const anchorCY = gesture.anchorBufferY - halfH;
      let scaleX = gesture.startScaleX;
      let scaleY = gesture.startScaleY;
      if (gesture.axis !== "y") {
        const denomX = gesture.grabLocalX - anchorCX;
        if (Math.abs(denomX) > 1e-9) {
          scaleX = gesture.startScaleX * (local.x - halfW - anchorCX) / denomX;
        }
      }
      if (gesture.axis !== "x") {
        const denomY = gesture.grabLocalY - anchorCY;
        if (Math.abs(denomY) > 1e-9) {
          scaleY = gesture.startScaleY * (local.y - halfH - anchorCY) / denomY;
        }
      }
      scaleX = Math.min(1024 / floating.width, Math.max(1 / floating.width, scaleX));
      scaleY = Math.min(1024 / floating.height, Math.max(1 / floating.height, scaleY));
      floating.scaleX = scaleX;
      floating.scaleY = scaleY;
      const matrix = selectionLinearMatrix({ ...gesture.placement, scaleX, scaleY });
      floating.cx = gesture.anchorHomeX - (matrix.a * anchorCX + matrix.b * anchorCY);
      floating.cy = gesture.anchorHomeY - (matrix.c * anchorCX + matrix.d * anchorCY);
      this.lastMouseClient = { x: clientX, y: clientY };
      this.afterFloatingChange();
    }
  }

  /**
   * Screen-space anchor layout for the active layer box (non-destructive
   * cell transform), or null when there is no active layer. Same anchor
   * set and placement as the floating selection overlay.
   */
  private layerHandleLayout(): Array<{
    id: GnumarusSelectionHandleId;
    kind: "resize" | "rotate" | "skew" | "flip" | "center";
    x: number;
    y: number;
    angle: number;
  }> | null {
    const layer = this.activeLayer();
    if (layer === null || layer.width < 1 || layer.height < 1) {
      return null;
    }
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return null;
    }
    const local: GnumarusRect = { left: 0, top: 0, width: rect.width, height: rect.height };
    const view = this.viewTransform();
    const toLocal = (imageX: number, imageY: number): { x: number; y: number } => {
      const project = layerImageToProject(imageX, imageY, layer.width, layer.height, layer.transform);
      const client = projectToScreen(project.x, project.y, local, view);
      return { x: client.x, y: client.y };
    };
    const halfW = layer.width / 2;
    const halfH = layer.height / 2;
    return this.placeBoxHandles(
      toLocal(halfW, halfH),
      [
        { id: "resize-nw", point: toLocal(0, 0) },
        { id: "resize-ne", point: toLocal(layer.width, 0) },
        { id: "resize-se", point: toLocal(layer.width, layer.height) },
        { id: "resize-sw", point: toLocal(0, layer.height) },
      ],
      [
        { id: "resize-n", point: toLocal(halfW, 0) },
        { id: "resize-s", point: toLocal(halfW, layer.height) },
        { id: "resize-e", point: toLocal(layer.width, halfH) },
        { id: "resize-w", point: toLocal(0, halfH) },
      ],
    );
  }

  /** Hit-test layer anchors by priority (rotate, skew, flip, resize, center). */
  private layerHitTest(
    clientX: number,
    clientY: number,
  ): { kind: "rotate" | "skew" | "flip" | "resize" | "center"; id: GnumarusSelectionHandleId } | null {
    const layout = this.layerHandleLayout();
    if (layout === null) {
      return null;
    }
    const rect = this.renderer.domElement.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    const radiusSquared = 12 * 12;
    for (const kind of ["rotate", "skew", "flip", "resize", "center"] as const) {
      for (const handle of layout) {
        if (handle.kind !== kind) {
          continue;
        }
        const dx = handle.x - mx;
        const dy = handle.y - my;
        if (dx * dx + dy * dy <= radiusSquared) {
          return { kind, id: handle.id };
        }
      }
    }
    return null;
  }

  /** Map a client point to project pixels (stable under layer transforms). */
  private clientToProject(clientX: number, clientY: number): { x: number; y: number } | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    return screenToProject(
      clientX,
      clientY,
      { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      this.viewTransform(),
    );
  }

  /** Start a non-destructive layer gesture from a hit anchor. */
  private beginLayerGesture(
    hit: { kind: "rotate" | "skew" | "flip" | "resize" | "center"; id: GnumarusSelectionHandleId },
    event: PointerEvent,
  ): boolean {
    const layer = this.activeLayer();
    if (layer === null || layer.width < 1 || layer.height < 1) {
      return false;
    }
    if (hit.kind === "center") {
      this.layerCenterTap = { layerId: layer.id, startClientX: event.clientX, startClientY: event.clientY };
      return true;
    }
    if (hit.kind === "flip") {
      this.layerFlipTap = {
        layerId: layer.id,
        axis: hit.id === "flip-n" || hit.id === "flip-s" ? "x" : "y",
        startClientX: event.clientX,
        startClientY: event.clientY,
      };
      return true;
    }
    if (hit.kind === "rotate") {
      const rect = this.renderer.domElement.getBoundingClientRect();
      const center = projectToScreen(
        layer.transform.x,
        layer.transform.y,
        { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        this.viewTransform(),
      );
      this.layerRotateDrag = {
        layerId: layer.id,
        startRotation: layer.transform.rotation,
        grabAngle: Math.atan2(event.clientY - center.y, event.clientX - center.x),
        centerX: center.x,
        centerY: center.y,
      };
      return true;
    }
    const snapshot = { ...layer.transform };
    const project = this.clientToProject(event.clientX, event.clientY);
    if (project === null) {
      return false;
    }
    const cursor = projectToLayerImageFloat(project.x, project.y, layer.width, layer.height, snapshot);
    if (cursor === null) {
      return false;
    }
    if (hit.kind === "skew") {
      // Centered shear like the floating selection: dragged edge follows
      // along the edge axis, opposite edge mirrors, center stays fixed.
      const axis = hit.id === "skew-n" || hit.id === "skew-s" ? "x" : "y";
      const layout = this.layerHandleLayout();
      const first = axis === "x" ? "resize-n" : "resize-e";
      const second = axis === "x" ? "resize-s" : "resize-w";
      const firstPos = layout?.find((handle) => handle.id === first);
      const secondPos = layout?.find((handle) => handle.id === second);
      if (firstPos === undefined || secondPos === undefined) {
        return false;
      }
      const perpDX = secondPos.x - firstPos.x;
      const perpDY = secondPos.y - firstPos.y;
      const perpLength = Math.sqrt(perpDX * perpDX + perpDY * perpDY);
      if (!(perpLength > 1e-6)) {
        return false;
      }
      const rect = this.renderer.domElement.getBoundingClientRect();
      const local: GnumarusRect = { left: 0, top: 0, width: rect.width, height: rect.height };
      const view = this.viewTransform();
      const projectImage = (ix: number, iy: number): { x: number; y: number } => {
        const projected = layerImageToProject(ix, iy, layer.width, layer.height, snapshot);
        return projectToScreen(projected.x, projected.y, local, view);
      };
      const halfW = layer.width / 2;
      const halfH = layer.height / 2;
      const centerScreen = projectImage(halfW, halfH);
      const plusScreen =
        axis === "x" ? projectImage(halfW + 1, halfH) : projectImage(halfW, halfH + 1);
      const dirX = plusScreen.x - centerScreen.x;
      const dirY = plusScreen.y - centerScreen.y;
      const dirLength = Math.sqrt(dirX * dirX + dirY * dirY);
      if (!(dirLength > 1e-9)) {
        return false;
      }
      this.layerSkewDrag = {
        layerId: layer.id,
        axis,
        sign: hit.id === "skew-n" || hit.id === "skew-w" ? -1 : 1,
        startSkew: axis === "x" ? snapshot.skewX : snapshot.skewY,
        grabClientX: event.clientX,
        grabClientY: event.clientY,
        dirX: dirX / dirLength,
        dirY: dirY / dirLength,
        extent: perpLength,
        snapshot,
      };
      return true;
    }
    const opposite: Record<string, { ix: number; iy: number; axis: "both" | "x" | "y" }> = {
      "resize-nw": { ix: layer.width, iy: layer.height, axis: "both" },
      "resize-ne": { ix: 0, iy: layer.height, axis: "both" },
      "resize-se": { ix: 0, iy: 0, axis: "both" },
      "resize-sw": { ix: layer.width, iy: 0, axis: "both" },
      "resize-n": { ix: layer.width / 2, iy: layer.height, axis: "y" },
      "resize-s": { ix: layer.width / 2, iy: 0, axis: "y" },
      "resize-e": { ix: 0, iy: layer.height / 2, axis: "x" },
      "resize-w": { ix: layer.width, iy: layer.height / 2, axis: "x" },
    };
    const info = opposite[hit.id];
    if (info === undefined) {
      return false;
    }
    const anchorProject = layerImageToProject(info.ix, info.iy, layer.width, layer.height, snapshot);
    this.layerResizeDrag = {
      layerId: layer.id,
      anchorImgX: info.ix,
      anchorImgY: info.iy,
      anchorProjectX: anchorProject.x,
      anchorProjectY: anchorProject.y,
      grabLocalX: cursor.x - layer.width / 2,
      grabLocalY: cursor.y - layer.height / 2,
      startScaleX: snapshot.scaleX,
      startScaleY: snapshot.scaleY,
      axis: info.axis,
      snapshot,
    };
    return true;
  }

  /** Advance an in-progress non-destructive layer gesture from the cursor. */
  private updateLayerGesture(clientX: number, clientY: number): void {
    const layer = this.activeLayer();
    if (this.layerRotateDrag !== null) {
      const gesture = this.layerRotateDrag;
      if (layer === null || layer.id !== gesture.layerId) {
        this.layerRotateDrag = null;
        return;
      }
      const angle = Math.atan2(clientY - gesture.centerY, clientX - gesture.centerX);
      this.setLayerTransform(layer.id, { rotation: gesture.startRotation + (angle - gesture.grabAngle) });
      this.lastMouseClient = { x: clientX, y: clientY };
      return;
    }
    if (this.layerSkewDrag !== null) {
      const gesture = this.layerSkewDrag;
      if (layer === null || layer.id !== gesture.layerId) {
        this.layerSkewDrag = null;
        return;
      }
      const s =
        ((clientX - gesture.grabClientX) * gesture.dirX + (clientY - gesture.grabClientY) * gesture.dirY) /
        gesture.extent;
      const skew = Math.min(
        GNUMARUS_MAX_LAYER_SKEW,
        Math.max(-GNUMARUS_MAX_LAYER_SKEW, gesture.startSkew + gesture.sign * s),
      );
      this.setLayerTransform(layer.id, gesture.axis === "x" ? { skewX: skew } : { skewY: skew });
      this.lastMouseClient = { x: clientX, y: clientY };
      return;
    }
    if (this.layerResizeDrag !== null) {
      const gesture = this.layerResizeDrag;
      if (layer === null || layer.id !== gesture.layerId) {
        this.layerResizeDrag = null;
        return;
      }
      const project = this.clientToProject(clientX, clientY);
      if (project === null) {
        return;
      }
      const cursor = projectToLayerImageFloat(project.x, project.y, layer.width, layer.height, gesture.snapshot);
      if (cursor === null) {
        return;
      }
      const halfW = layer.width / 2;
      const halfH = layer.height / 2;
      const anchorCX = gesture.anchorImgX - halfW;
      const anchorCY = gesture.anchorImgY - halfH;
      let scaleX = gesture.startScaleX;
      let scaleY = gesture.startScaleY;
      if (gesture.axis !== "y") {
        const denomX = gesture.grabLocalX - anchorCX;
        if (Math.abs(denomX) > 1e-9) {
          scaleX = (gesture.startScaleX * (cursor.x - halfW - anchorCX)) / denomX;
        }
      }
      if (gesture.axis !== "x") {
        const denomY = gesture.grabLocalY - anchorCY;
        if (Math.abs(denomY) > 1e-9) {
          scaleY = (gesture.startScaleY * (cursor.y - halfH - anchorCY)) / denomY;
        }
      }
      scaleX = Math.min(1024 / layer.width, Math.max(1 / layer.width, scaleX));
      scaleY = Math.min(1024 / layer.height, Math.max(1 / layer.height, scaleY));
      const matrix = layerLinearMatrix({ ...gesture.snapshot, scaleX, scaleY });
      this.setLayerTransform(layer.id, {
        scaleX,
        scaleY,
        x: gesture.anchorProjectX - (matrix.a * anchorCX + matrix.b * anchorCY),
        y: gesture.anchorProjectY - (matrix.c * anchorCX + matrix.d * anchorCY),
      });
      this.lastMouseClient = { x: clientX, y: clientY };
    }
  }

  /** Screen-space 3D gizmo frame (rings, axes, handles) for one tool target. */
  private rot3DFrameFor(
    target: "layer" | "floating",
  ): {
    target: "layer" | "floating";
    layerId: string;
    center: { x: number; y: number };
    radiusPx: number;
    sphereR: number;
    toScreen: (ox: number, oy: number, oz: number) => { x: number; y: number; front: boolean };
    rings: Record<"x" | "y" | "z", Array<{ x: number; y: number; front: boolean }>>;
  } | null {
    const layer = this.activeLayer();
    if (layer === null || layer.width < 1 || layer.height < 1) {
      return null;
    }
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return null;
    }
    // Rotation + gizmo center/radius per target (rigid sphere: scale, skew
    // and flips do not distort the rings).
    let rot: [[number, number, number], [number, number, number], [number, number, number]];
    let homeCX: number;
    let homeCY: number;
    let sphereR: number;
    let layerId: string;
    if (target === "floating") {
      const floating = this.floating;
      if (floating === null || !floating.active || !this.floatingHomeVisible()) {
        return null;
      }
      rot = selectionRotate3(this.floatingPlacement(floating));
      homeCX = floating.cx;
      homeCY = floating.cy;
      sphereR = Math.max(floating.width, floating.height) / 2;
      layerId = floating.layerId;
    } else {
      rot = layerRotate3(layer.transform);
      homeCX = layer.width / 2;
      homeCY = layer.height / 2;
      // Layer gizmo rotates about the project center offset.
      sphereR = Math.max(layer.width, layer.height) / 2;
      layerId = layer.id;
    }
    if (!(sphereR > 0)) {
      return null;
    }
    const local: GnumarusRect = { left: 0, top: 0, width: rect.width, height: rect.height };
    const view = this.viewTransform();
    const toScreen = (ox: number, oy: number, oz: number): { x: number; y: number; front: boolean } => {
      // Rotate the rigid offset, then map through the home layer placement.
      const rx = rot[0][0] * ox + rot[0][1] * oy + rot[0][2] * oz;
      const ry = rot[1][0] * ox + rot[1][1] * oy + rot[1][2] * oz;
      const rz = rot[2][0] * ox + rot[2][1] * oy + rot[2][2] * oz;
      let projectX: number;
      let projectY: number;
      if (target === "floating") {
        const projected = layerImageToProject(homeCX + rx, homeCY + ry, layer.width, layer.height, layer.transform);
        projectX = projected.x;
        projectY = projected.y;
      } else {
        projectX = layer.transform.x + rx;
        projectY = layer.transform.y + ry;
      }
      const client = projectToScreen(projectX, projectY, local, view);
      // `local` is zero-based, so the client point is already container-local.
      // On-plane (z = 0) counts as front so resting rings render solid.
      return { x: client.x, y: client.y, front: rz >= 0 };
    };
    const origin = toScreen(0, 0, 0);
    const radiusPx = Math.max(24, sphereR * this.zoom);
    const samples = 120;
    const rings = {
      x: new Array<{ x: number; y: number; front: boolean }>(),
      y: new Array<{ x: number; y: number; front: boolean }>(),
      z: new Array<{ x: number; y: number; front: boolean }>(),
    };
    for (const axis of ["x", "y", "z"] as const) {
      for (let i = 0; i < samples; i += 1) {
        const [ox, oy, oz] = rot3DRingPoint(axis, (i / samples) * Math.PI * 2, sphereR);
        rings[axis].push(toScreen(ox, oy, oz));
      }
    }
    return { target, layerId, center: { x: origin.x, y: origin.y }, radiusPx, sphereR, toScreen, rings };
  }

  /** Axis-handle screen positions on the 3D rings (front, 45 degrees). */
  private rot3DHandlePositions(frame: {
    sphereR: number;
    toScreen: (ox: number, oy: number, oz: number) => { x: number; y: number; front: boolean };
  }): Array<{ id: GnumarusSelectionHandleId; x: number; y: number }> {
    const handles: Array<{ id: GnumarusSelectionHandleId; x: number; y: number }> = [];
    const ids: Array<{ id: GnumarusSelectionHandleId; axis: "x" | "y" | "z" }> = [
      { id: "rot3d-x", axis: "x" },
      { id: "rot3d-y", axis: "y" },
      { id: "rot3d-z", axis: "z" },
    ];
    for (const entry of ids) {
      const [ox, oy, oz] = rot3DRingPoint(entry.axis, Math.PI / 4, frame.sphereR);
      const point = frame.toScreen(ox, oy, oz);
      handles.push({ id: entry.id, x: point.x, y: point.y });
    }
    return handles;
  }

  /**
   * Hit-test the 3D gizmo: axis handles, center reset, ring proximity,
   * then the sphere body for trackball. Null when the tool has no frame.
   */
  private rot3DHitTest(
    clientX: number,
    clientY: number,
  ): { kind: "axis" | "center" | "body"; id: GnumarusSelectionHandleId; axis: "x" | "y" | "z"; phi: number } | null {
    const target = this.tool === "transform3d" ? "layer" : this.tool === "destransform3d" ? "floating" : null;
    if (target === null) {
      return null;
    }
    const frame = this.rot3DFrameFor(target);
    if (frame === null) {
      return null;
    }
    const rect = this.renderer.domElement.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    const radiusSquared = 12 * 12;
    for (const handle of this.rot3DHandlePositions(frame)) {
      const dx = handle.x - mx;
      const dy = handle.y - my;
      if (dx * dx + dy * dy <= radiusSquared) {
        const axis = handle.id.slice(-1) as "x" | "y" | "z";
        return { kind: "axis", id: handle.id, axis, phi: Math.PI / 4 };
      }
    }
    const cdx = frame.center.x - mx;
    const cdy = frame.center.y - my;
    if (cdx * cdx + cdy * cdy <= radiusSquared) {
      return { kind: "center", id: "center", axis: "z", phi: 0 };
    }
    // Ring proximity starts a single-axis drag about that ring's axis.
    const ringThresholdSquared = 10 * 10;
    for (const axis of ["x", "y", "z"] as const) {
      const points = frame.rings[axis];
      let best = Number.POSITIVE_INFINITY;
      let bestPhi = 0;
      for (let i = 0; i < points.length; i += 1) {
        const point = points[i];
        if (point === undefined) {
          continue;
        }
        const dx = point.x - mx;
        const dy = point.y - my;
        const squared = dx * dx + dy * dy;
        if (squared < best) {
          best = squared;
          bestPhi = (i / points.length) * Math.PI * 2;
        }
      }
      if (best <= ringThresholdSquared) {
        return { kind: "axis", id: `rot3d-${axis}` as GnumarusSelectionHandleId, axis, phi: bestPhi };
      }
    }
    const bdx = frame.center.x - mx;
    const bdy = frame.center.y - my;
    if (bdx * bdx + bdy * bdy <= frame.radiusPx * frame.radiusPx) {
      return { kind: "body", id: "center", axis: "z", phi: 0 };
    }
    return null;
  }

  /** Current tool-managed rotation angle for a 3D gesture target. */
  private rot3DStartAngle(target: "layer" | "floating", layerId: string, axis: "x" | "y" | "z"): number | null {
    if (target === "layer") {
      const layer = this.activeLayer();
      if (layer === null || layer.id !== layerId) {
        return null;
      }
      return axis === "x" ? layer.transform.rotationX : axis === "y" ? layer.transform.rotationY : layer.transform.rotation;
    }
    const floating = this.floating;
    if (floating === null || !floating.active || floating.layerId !== layerId) {
      return null;
    }
    return axis === "x" ? floating.rotationX : axis === "y" ? floating.rotationY : floating.rotation;
  }

  /** Apply one tool-managed rotation angle (ephemeral; commit captures it). */
  private applyRot3DAngle(target: "layer" | "floating", layerId: string, axis: "x" | "y" | "z", angle: number): boolean {
    if (target === "layer") {
      const layer = this.activeLayer();
      if (layer === null || layer.id !== layerId) {
        return false;
      }
      if (axis === "x") {
        this.setLayerTransform(layerId, { rotationX: angle });
      } else if (axis === "y") {
        this.setLayerTransform(layerId, { rotationY: angle });
      } else {
        this.setLayerTransform(layerId, { rotation: angle });
      }
      return true;
    }
    const floating = this.floating;
    if (floating === null || !floating.active || floating.layerId !== layerId || !this.floatingHomeVisible()) {
      return false;
    }
    if (axis === "x") {
      floating.rotationX = normalizeRotation(angle);
    } else if (axis === "y") {
      floating.rotationY = normalizeRotation(angle);
    } else {
      floating.rotation = normalizeRotation(angle);
    }
    this.afterFloatingChange();
    return true;
  }

  /** Start a 3D gizmo gesture from a hit test. */
  private beginRot3DGesture(
    hit: { kind: "axis" | "center" | "body"; id: GnumarusSelectionHandleId; axis: "x" | "y" | "z"; phi: number },
    event: PointerEvent,
  ): boolean {
    const target = this.tool === "transform3d" ? "layer" : this.tool === "destransform3d" ? "floating" : null;
    if (target === null) {
      return false;
    }
    const frame = this.rot3DFrameFor(target);
    if (frame === null) {
      return false;
    }
    if (hit.kind === "center") {
      this.rot3dCenterTap = {
        target,
        layerId: frame.layerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        radiusPx: frame.radiusPx,
      };
      return true;
    }
    if (hit.kind === "axis") {
      const startAngle = this.rot3DStartAngle(target, frame.layerId, hit.axis);
      if (startAngle === null) {
        return false;
      }
      this.axisDrag = {
        target,
        layerId: frame.layerId,
        axis: hit.axis,
        startAngle,
        startPhi: hit.phi,
        phi: hit.phi,
        lastClientX: event.clientX,
        lastClientY: event.clientY,
        sphereR: frame.sphereR,
        project: frame.toScreen,
      };
      return true;
    }
    const startX = this.rot3DStartAngle(target, frame.layerId, "x");
    const startY = this.rot3DStartAngle(target, frame.layerId, "y");
    if (startX === null || startY === null) {
      return false;
    }
    this.trackballDrag = {
      target,
      layerId: frame.layerId,
      startRotationX: startX,
      startRotationY: startY,
      grabClientX: event.clientX,
      grabClientY: event.clientY,
      radiusPx: frame.radiusPx,
    };
    return true;
  }

  /** Advance an in-progress 3D gizmo gesture from the cursor. */
  private updateRot3DGesture(clientX: number, clientY: number): void {
    if (this.trackballDrag !== null) {
      const gesture = this.trackballDrag;
      // Screen-space trackball: right drags turn the front face right, so
      // the left edge comes toward the viewer (negative RY); down drags
      // tip the top toward the viewer (positive RX); angle = drag / radius.
      const okX = this.applyRot3DAngle(
        gesture.target,
        gesture.layerId,
        "x",
        gesture.startRotationX + (clientY - gesture.grabClientY) / gesture.radiusPx,
      );
      const okY = this.applyRot3DAngle(
        gesture.target,
        gesture.layerId,
        "y",
        gesture.startRotationY - (clientX - gesture.grabClientX) / gesture.radiusPx,
      );
      if (!okX || !okY) {
        this.trackballDrag = null;
        return;
      }
      this.lastMouseClient = { x: clientX, y: clientY };
      return;
    }
    if (this.axisDrag !== null) {
      const gesture = this.axisDrag;
      // Tangent projection along the ring: the dragged ring point follows
      // the cursor around its own axis; incremental in the live tangent.
      const epsilon = 0.01;
      const ahead = gesture.project(...rot3DRingPoint(gesture.axis, gesture.phi + epsilon, gesture.sphereR));
      const behind = gesture.project(...rot3DRingPoint(gesture.axis, gesture.phi - epsilon, gesture.sphereR));
      const tx = (ahead.x - behind.x) / (2 * epsilon);
      const ty = (ahead.y - behind.y) / (2 * epsilon);
      const denom = tx * tx + ty * ty;
      if (!(denom > 1e-9)) {
        return;
      }
      const dx = clientX - gesture.lastClientX;
      const dy = clientY - gesture.lastClientY;
      gesture.phi += (dx * tx + dy * ty) / denom;
      gesture.lastClientX = clientX;
      gesture.lastClientY = clientY;
      if (
        !this.applyRot3DAngle(gesture.target, gesture.layerId, gesture.axis, gesture.startAngle + (gesture.phi - gesture.startPhi))
      ) {
        this.axisDrag = null;
      } else {
        this.lastMouseClient = { x: clientX, y: clientY };
      }
    }
  }

  /** Reset only the tool-managed rotations (spin + tilts), keeping the rest. */
  private resetRot3DAngles(target: "layer" | "floating", layerId: string): boolean {
    if (target === "layer") {
      const layer = this.activeLayer();
      if (layer === null || layer.id !== layerId) {
        return false;
      }
      this.setLayerTransform(layerId, { rotation: 0, rotationX: 0, rotationY: 0 });
      return true;
    }
    return this.resetFloatingRotations();
  }

  /** True when the floating selection belongs to the currently shown cell. */
  private floatingHomeVisible(): boolean {    const floating = this.floating;
    if (floating === null || !floating.active || floating.frame !== this.currentFrame) {
      return false;
    }
    const layer = this.activeLayer();
    return layer !== null && layer.id === floating.layerId && layer.renderTextureId === floating.textureId;
  }

  /** Merge the floating selection first when it lives in the given texture. */
  private commitFloatingIfHomeTexture(textureId: string): void {
    if (this.floating !== null && this.floating.active && this.floating.textureId === textureId) {
      this.commitFloating();
    }
  }

  /** Discard the floating selection without merging (content is lost). */
  private dropFloating(): void {
    if (this.floating === null && this.floatingPlane === null) {
      return;
    }
    this.floating = null;
    this.clearTransformGestures();
    this.disposeFloatingPlane();
    this.updatePreviews();
  }

  /**
   * Merge the floating texture back into its home cell texture with an exact
   * copy paste (a destructive move relocates pixels losslessly), resampled
   * through the inverse placement with nearest sampling and a tie epsilon,
   * clipped to the texture. Undoable. Returns false when nothing was merged
   * (inactive, missing home, degenerate transform or empty coverage).
   */
  commitFloating(): boolean {
    const floating = this.floating;
    if (floating === null || !floating.active) {
      return false;
    }
    const tex = this.textures.get(floating.textureId);
    if (tex === undefined) {
      this.floating = null;
      this.clearTransformGestures();
      this.disposeFloatingPlane();
      this.updatePreviews();
      return false;
    }
    const placement = this.floatingPlacement(floating);
    if (isSelectionDegenerate(placement)) {
      return false;
    }
    const box = selectionCornerBox(placement);
    const minX = Math.max(0, Math.floor(box.minX));
    const minY = Math.max(0, Math.floor(box.minY));
    const maxX = Math.min(tex.width, Math.ceil(box.maxX));
    const maxY = Math.min(tex.height, Math.ceil(box.maxY));
    if (minX >= maxX || minY >= maxY) {
      return false;
    }
    const base = tex.buffer.slice();
    const epsilon = 1e-6;
    for (let dy = minY; dy < maxY; dy += 1) {
      for (let dx = minX; dx < maxX; dx += 1) {
        const local = inverseSelectionPoint(placement, dx + 0.5, dy + 0.5);
        if (local === null) {
          continue;
        }
        const sx = Math.floor(local.x + epsilon);
        const sy = Math.floor(local.y + epsilon);
        if (sx < 0 || sy < 0 || sx >= floating.width || sy >= floating.height) {
          continue;
        }
        const source = (sy * floating.width + sx) * 4;
        const dest = (dy * tex.width + dx) * 4;
        tex.buffer[dest] = floating.buffer[source]!;
        tex.buffer[dest + 1] = floating.buffer[source + 1]!;
        tex.buffer[dest + 2] = floating.buffer[source + 2]!;
        tex.buffer[dest + 3] = floating.buffer[source + 3]!;
      }
    }
    this.floating = null;
    this.clearTransformGestures();
    this.disposeFloatingPlane();
    const diff = computeImageDiff(base, tex.buffer, tex.width, tex.height);
    if (diff === null) {
      this.syncAllLayerRenders();
      this.refreshLayerStacking();
      this.render();
      this.emitStats();
      this.updatePreviews();
      return false;
    }
    this.pushHistory({ type: "stroke", layerId: tex.id, diff });
    this.markTextureViewsDirty(tex.id);
    this.syncAllLayerRenders();
    this.refreshLayerStacking();
    this.render();
    this.onPixelsChanged();
    this.onLayersChanged?.();
    this.emitStats();
    this.updatePreviews();
    return true;
  }

  /**
   * Cut a cell-texture rect out into a floating selection (transparent hole,
   * locks ignored like Delete). Commits any active floating selection first.
   * Returns false for empty or invalid rects.
   */
  private cutRectToFloating(x0: number, y0: number, x1: number, y1: number): boolean {
    const layer = this.activeLayer();
    if (layer === null) {
      return false;
    }
    const ensured = this.ensureCellContent(layer.id, this.currentFrame);
    if (ensured === null) {
      return false;
    }
    this.syncLayerRender(layer);
    this.refreshLayerStacking();
    const tex = ensured.texture;
    const minX = Math.max(0, Math.min(x0, x1));
    const minY = Math.max(0, Math.min(y0, y1));
    const maxX = Math.min(tex.width, Math.max(x0, x1) + 1);
    const maxY = Math.min(tex.height, Math.max(y0, y1) + 1);
    if (minX >= maxX || minY >= maxY) {
      return false;
    }
    this.commitFloating();
    const base = tex.buffer.slice();
    const width = maxX - minX;
    const height = maxY - minY;
    const cut = new Uint8ClampedArray(width * height * 4);
    for (let row = 0; row < height; row += 1) {
      const source = ((minY + row) * tex.width + minX) * 4;
      cut.set(tex.buffer.subarray(source, source + width * 4), row * width * 4);
      tex.buffer.fill(0, source, source + width * 4);
    }
    const diff = computeImageDiff(base, tex.buffer, tex.width, tex.height);
    if (diff !== null) {
      this.pushHistory({ type: "stroke", layerId: tex.id, diff });
    }
    this.floating = {
      buffer: cut,
      width,
      height,
      cx: minX + width / 2,
      cy: minY + height / 2,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      skewX: 0,
      skewY: 0,
      rotationX: 0,
      rotationY: 0,
      flipX: false,
      flipY: false,
      initial: {
        cx: minX + width / 2,
        cy: minY + height / 2,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        skewX: 0,
        skewY: 0,
        rotationX: 0,
        rotationY: 0,
        flipX: false,
        flipY: false,
      },
      layerId: layer.id,
      frame: this.currentFrame,
      textureId: tex.id,
      cutDepth: this.history.undoDepth(),
      active: true,
    };
    this.markTextureViewsDirty(tex.id);
    this.syncAllLayerRenders();
    this.syncFloatingPlane();
    this.refreshLayerStacking();
    this.render();
    this.onPixelsChanged();
    this.onLayersChanged?.();
    this.emitStats();
    this.updatePreviews();
    return true;
  }

  /** Cut the whole current-cell texture into a floating selection. */
  private cutAllToFloating(): boolean {
    const layer = this.activeLayer();
    if (layer === null || layer.width < 1 || layer.height < 1) {
      return false;
    }
    return this.cutRectToFloating(0, 0, layer.width - 1, layer.height - 1);
  }

  /**
   * Keep floating activation in sync with undo/redo: popping the cut entry
   * deactivates (content kept aside); redoing it back reactivates.
   */
  private syncFloatingWithHistory(): void {
    const floating = this.floating;
    if (floating === null) {
      return;
    }
    const depth = this.history.undoDepth();
    if (floating.active && depth < floating.cutDepth) {
      floating.active = false;
    } else if (!floating.active && depth >= floating.cutDepth) {
      floating.active = true;
    }
    this.syncFloatingPlane();
    this.updatePreviews();
  }

  private disposeFloatingPlane(): void {
    if (this.floatingPlane !== null) {
      this.scene.remove(this.floatingPlane);
      this.floatingPlane = null;
    }
    if (this.floatingMaterial !== null) {
      this.floatingMaterial.dispose();
      this.floatingMaterial = null;
    }
    if (this.floatingTexture !== null) {
      this.floatingTexture.dispose();
      this.floatingTexture = null;
    }
    this.floatingPlaneFor = null;
  }

  /** Clear every in-progress selection gesture (move/resize/rotate/skew/tap). */
  private clearTransformGestures(): void {
    this.moveDrag = null;
    this.resizeDrag = null;
    this.rotateDrag = null;
    this.skewDrag = null;
    this.centerTap = null;
    this.flipTap = null;
    this.layerResizeDrag = null;
    this.layerRotateDrag = null;
    this.layerSkewDrag = null;
    this.layerCenterTap = null;
    this.layerFlipTap = null;
    this.trackballDrag = null;
    this.rot3dCenterTap = null;
    this.axisDrag = null;
  }

  /** Clear in-progress drags at stroke end, keeping a pending center tap. */
  private clearTransformDrags(): void {
    this.moveDrag = null;
    this.resizeDrag = null;
    this.rotateDrag = null;
    this.skewDrag = null;
    this.layerResizeDrag = null;
    this.layerRotateDrag = null;
    this.layerSkewDrag = null;
    this.trackballDrag = null;
    this.axisDrag = null;
  }

  /** (Re)create, position and show/hide the floating content plane. */
  private syncFloatingPlane(): void {
    const floating = this.floating;
    if (floating === null || !floating.active || !this.floatingHomeVisible()) {
      if (this.floatingPlane !== null) {
        this.floatingPlane.visible = false;
      }
      return;
    }
    if (this.floatingPlane === null || this.floatingPlaneFor !== floating) {
      this.disposeFloatingPlane();
      const texture = new THREE.DataTexture(floating.buffer, floating.width, floating.height);
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;
      texture.generateMipmaps = false;
      texture.flipY = true;
      texture.needsUpdate = true;
      const material = new THREE.ShaderMaterial({
        uniforms: {
          uMap: { value: texture },
          uOpacity: { value: 1 },
        },
        vertexShader: LAYER_VERTEX_SHADER,
        fragmentShader: LAYER_FRAGMENT_SHADER,
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false,
      });
      const plane = new THREE.Mesh(this.sharedGeometry, material);
      plane.matrixAutoUpdate = false;
      this.scene.add(plane);
      this.floatingPlane = plane;
      this.floatingMaterial = material;
      this.floatingTexture = texture;
      this.floatingPlaneFor = floating;
    }
    const layer = this.activeLayer();
    if (layer === null) {
      this.floatingPlane.visible = false;
      return;
    }
    // Position the unit quad with the same normalized convention as
    // writePlaneMatrix (center-based basis with flipped V), mapping through
    // the floating placement instead of the identity map. Anything else
    // shifts the content by half its size and mirrors it vertically.
    const placement = this.floatingPlacement(floating);
    const rect = this.container.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    const local: GnumarusRect = { left: 0, top: 0, width: w, height: h };
    const view = this.viewTransform();
    const at = (lx: number, ly: number): { x: number; y: number } => {
      const home = forwardSelectionPoint(placement, (lx + 0.5) * floating.width, (0.5 - ly) * floating.height);
      const projected = layerImageToProject(home.x, home.y, layer.width, layer.height, layer.transform);
      return projectToScreen(projected.x, projected.y, local, view);
    };
    const o = at(0, 0);
    const ex = at(1, 0);
    const ey = at(0, 1);
    const elements = this.floatingPlane.matrix.elements;
    elements[0] = ex.x - o.x;
    elements[1] = -(ex.y - o.y);
    elements[2] = 0;
    elements[3] = 0;
    elements[4] = ey.x - o.x;
    elements[5] = -(ey.y - o.y);
    elements[6] = 0;
    elements[7] = 0;
    elements[8] = 0;
    elements[9] = 0;
    elements[10] = 1;
    elements[11] = 0;
    elements[12] = o.x - w / 2;
    elements[13] = h / 2 - o.y;
    elements[14] = this.layers.length * 0.01 + 0.01;
    elements[15] = 1;
    this.floatingPlane.matrixWorldNeedsUpdate = true;
    this.floatingPlane.visible = true;
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
    const size = this.pressureBrushSize();
    const color = this.pressureBrushColor();
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
        size,
        this.brushShape,
        this.pencilAntialias,
      );
      this.repaintFromMask(tex, this.strokeBase, this.strokeMask, locked, color);
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
      size,
      this.brushShape,
      this.pencilAntialias,
      color,
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
      this.repaintFromMask(tex, base, mask, layer.lockedChannels, this.color);
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
    this.pushHistory({ type: "stroke", layerId: tex.id, diff });
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
      this.repaintFromMask(tex, base, mask, layer.lockedChannels, this.color);
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
    this.pushHistory({ type: "stroke", layerId: tex.id, diff });
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

  /** Cell-image rect currently shown as marching ants: rubber band or floating selection. */
  /**
   * Selection outline in home texture pixels: rubber band corners, or the
   * transformed floating quad. Null when nothing is shown.
   */
  private selectionOverlayQuad(): Array<{ x: number; y: number }> | null {
    if (this.rectDrag !== null) {
      const drag = this.rectDrag;
      const x0 = Math.min(drag.x0, drag.x1);
      const y0 = Math.min(drag.y0, drag.y1);
      const x1 = Math.max(drag.x0, drag.x1) + 1;
      const y1 = Math.max(drag.y0, drag.y1) + 1;
      return [
        { x: x0, y: y0 },
        { x: x1, y: y0 },
        { x: x1, y: y1 },
        { x: x0, y: y1 },
      ];
    }
    const floating = this.floating;
    if (floating !== null && floating.active && this.floatingHomeVisible()) {
      const placement = this.floatingPlacement(floating);
      const corners: Array<[number, number]> = [
        [0, 0],
        [floating.width, 0],
        [floating.width, floating.height],
        [0, floating.height],
      ];
      return corners.map(([x, y]) => forwardSelectionPoint(placement, x, y));
    }
    if (this.tool === "transform" || this.tool === "transform3d") {
      // Non-destructive overlay: the active layer box in its own image
      // pixels (the layer transform applies at draw time in toClient).
      const layer = this.activeLayer();
      if (layer === null || layer.width < 1 || layer.height < 1) {
        return null;
      }
      return [
        { x: 0, y: 0 },
        { x: layer.width, y: 0 },
        { x: layer.width, y: layer.height },
        { x: 0, y: layer.height },
      ];
    }
    return null;
  }

  /** Hide every selection anchor group. */
  private hideSelectionHandles(): void {
    for (const handle of this.selectionHandles) {
      handle.group.style.display = "none";
    }
  }

  /** Hide the 3D gizmo rings and axis lines. */
  private hideRot3dGizmo(): void {
    for (const axis of ["x", "y", "z"] as const) {
      this.rot3dRings[axis].front.style.display = "none";
      this.rot3dRings[axis].back.style.display = "none";
      this.rot3dAxes[axis].style.display = "none";
    }
  }

  /** SVG path data for one ring side (front or back), breaking runs. */
  private rot3DRingPath(points: Array<{ x: number; y: number; front: boolean }>, front: boolean): string {
    let d = "";
    let pen = false;
    for (const point of points) {
      if (point.front !== front) {
        pen = false;
        continue;
      }
      d += `${pen ? "L" : "M"}${point.x.toFixed(1)},${point.y.toFixed(1)}`;
      pen = true;
    }
    return d;
  }

  /** Position the marching-ants selection polygon over the active layer. */
  private updateSelectionOverlay(): void {
    const overlay = this.selectionOverlayQuad();
    const layer = this.activeLayer();
    if (overlay === null || layer === null || layer.width < 1 || layer.height < 1) {
      this.previewSelectWhite.style.display = "none";
      this.previewSelectBlack.style.display = "none";
      this.hideSelectionHandles();
      return;
    }
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      this.previewSelectWhite.style.display = "none";
      this.previewSelectBlack.style.display = "none";
      this.hideSelectionHandles();
      return;
    }
    const toClient = (imageX: number, imageY: number): string => {
      const project = layerImageToProject(imageX, imageY, layer.width, layer.height, layer.transform);
      const client = projectToScreen(
        project.x,
        project.y,
        { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        this.viewTransform(),
      );
      return `${client.x - rect.left},${client.y - rect.top}`;
    };
    const points = overlay.map((point) => toClient(point.x, point.y)).join(" ");
    this.previewSvg.style.display = "block";
    this.previewSelectWhite.setAttribute("points", points);
    this.previewSelectWhite.style.display = "block";
    this.previewSelectBlack.setAttribute("points", points);
    this.previewSelectBlack.style.display = "block";
    if (this.tool === "destransform" || this.tool === "transform") {
      const layout =
        this.tool === "destransform" ? this.selectionHandleLayout() : this.layerHandleLayout();
      const placed = new Set<string>();
      if (layout !== null) {
        for (const handle of layout) {
          const group = this.selectionHandles.find((entry) => entry.id === handle.id)?.group;
          if (group === undefined) {
            continue;
          }
          group.setAttribute("transform", `translate(${handle.x} ${handle.y}) rotate(${handle.angle})`);
          group.style.display = "block";
          placed.add(handle.id);
        }
      }
      for (const handle of this.selectionHandles) {
        if (!placed.has(handle.id)) {
          handle.group.style.display = "none";
        }
      }
      this.hideRot3dGizmo();
    } else if (this.tool === "transform3d" || this.tool === "destransform3d") {
      const frame = this.rot3DFrameFor(this.tool === "transform3d" ? "layer" : "floating");
      const placed = new Set<string>();
      if (frame !== null) {
        this.previewSvg.style.display = "block";
        for (const axis of ["x", "y", "z"] as const) {
          const ring = this.rot3dRings[axis];
          ring.front.setAttribute("d", this.rot3DRingPath(frame.rings[axis], true));
          ring.front.style.display = "block";
          ring.back.setAttribute("d", this.rot3DRingPath(frame.rings[axis], false));
          ring.back.style.display = "block";
          const line = this.rot3dAxes[axis];
          const [from, to] = rot3DAxisEnds(axis, frame.sphereR);
          const negative = frame.toScreen(...from);
          const positive = frame.toScreen(...to);
          line.setAttribute("x1", String(negative.x));
          line.setAttribute("y1", String(negative.y));
          line.setAttribute("x2", String(positive.x));
          line.setAttribute("y2", String(positive.y));
          line.style.display = "block";
        }
        const handles = [...this.rot3DHandlePositions(frame), { id: "center" as GnumarusSelectionHandleId, x: frame.center.x, y: frame.center.y }];
        for (const handle of handles) {
          const group = this.selectionHandles.find((entry) => entry.id === handle.id)?.group;
          if (group === undefined) {
            continue;
          }
          group.setAttribute("transform", `translate(${handle.x} ${handle.y})`);
          group.style.display = "block";
          placed.add(handle.id);
        }
      } else {
        this.hideRot3dGizmo();
      }
      for (const handle of this.selectionHandles) {
        if (!placed.has(handle.id)) {
          handle.group.style.display = "none";
        }
      }
    } else {
      this.hideSelectionHandles();
      this.hideRot3dGizmo();
    }
  }

  /** Hide the overlay svg unless another overlay (rope, selection) needs it. */
  private hidePreviewSvgIfIdle(): void {
    if (
      this.previewStabilizerLine.style.display !== "block" &&
      this.previewSelectWhite.style.display !== "block"
    ) {
      this.previewSvg.style.display = "none";
    }
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
    this.previewSelectWhite.style.display = "none";
    this.previewSelectBlack.style.display = "none";
    this.hideSelectionHandles();
    this.hideRot3dGizmo();
    for (const marker of this.previewMarkers) {
      marker.style.display = "none";
    }
    this.updateStabilizerOverlay();
    this.updateSelectionOverlay();
    if (mouse === null) {
      // Keep the stabilizer dot hidden when the mouse leaves; the overlay
      // helper already hid it, but the svg may still be needed for nothing.
      this.hidePreviewSvgIfIdle();
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
      // Preserve the stabilizer rope and selection overlays for other tools.
      this.hidePreviewSvgIfIdle();
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
    this.hidePreviewSvgIfIdle();
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
    this.previewSelectWhite.style.display = "none";
    this.previewSelectBlack.style.display = "none";
    this.hideSelectionHandles();
    this.hideRot3dGizmo();
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
      this.pushHistory({ type: "stroke", layerId: tex.id, diff });
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
    this.pushHistory({ type: "stroke", layerId: tex.id, diff });
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
    this.pushHistory({ type: "stroke", layerId: tex.id, diff });
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

  /** Minimum zoom fraction from settings (0.01..1, default 0.25). */
  setViewMinZoom(value: number): void {
    this.viewMinZoom = normalizeViewMinZoom(value);
    this.setZoom(this.zoom);
  }

  private clampViewZoom(zoom: number): number {
    if (Number.isNaN(zoom)) {
      return 1;
    }
    return Math.min(64, Math.max(this.viewMinZoom, zoom));
  }

  setZoom(zoom: number): void {
    this.zoom = this.clampViewZoom(zoom);
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
    const nextZoom = this.clampViewZoom(this.zoom * factor);
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
      this.zoom = this.clampViewZoom(fit >= 1 ? Math.floor(fit) : fit);
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
    this.rectDrag = null;
    this.clearTransformGestures();
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
   * Copy the composited canvas pixel under the client point into the paint
   * color: every visible layer blended exactly like the final render, so
   * the picked color is what the user sees on screen regardless of which
   * layer it comes from. No background is composited. Never paints,
   * records history or materializes empty cells. Returns false when the
   * point is outside the canvas.
   */
  pickColorAt(clientX: number, clientY: number): boolean {
    const project = this.clientToProject(clientX, clientY);
    if (project === null) {
      return false;
    }
    const pixel = projectToLayerPixel(project.x, project.y, this.imageWidth, this.imageHeight, {
      ...IDENTITY_LAYER_TRANSFORM,
    });
    if (pixel === null) {
      return false;
    }
    const inputs = this.getFrameFlattenInputs(this.currentFrame);
    if (inputs === null) {
      return false;
    }
    const sampled = compositeLayersAt(this.imageWidth, this.imageHeight, inputs, pixel.x, pixel.y);
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
      (textureId, width, height, buffer, transforms) =>
        this.applyFitToSize(textureId, width, height, buffer, transforms),
      (layerId, frame, contentId) => this.associateCellForHistory(layerId, frame, contentId),
      (layerId, frame) => this.dissociateCellForHistory(layerId, frame),
      (contentId, textureId) => this.setContentTextureForHistory(contentId, textureId),
    );
    if (!applied) {
      return false;
    }
    this.syncFloatingWithHistory();
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
      (textureId, width, height, buffer, transforms) =>
        this.applyFitToSize(textureId, width, height, buffer, transforms),
      (layerId, frame) => this.dissociateCellForHistory(layerId, frame),
      (layerId, frame, contentId) => this.associateCellForHistory(layerId, frame, contentId),
      (contentId, textureId) => this.setContentTextureForHistory(contentId, textureId),
    );
    if (!applied) {
      return false;
    }
    this.syncFloatingWithHistory();
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

  getGridOpacityPercent(): number {
    return this.gridOpacityPercent;
  }

  setGridOpacityPercent(value: number): void {
    this.gridOpacityPercent = clampGridOpacityPercent(value);
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

  /** Floating content plane matrix, or null when no plane exists. */
  getFloatingPlaneMatrix(): number[] | null {
    if (this.floatingPlane === null) {
      return null;
    }
    return Array.from(this.floatingPlane.matrix.elements);
  }

  getGridState(): {
    visible: boolean;
    minZoom: number;
    opacityPercent: number;
    layerId: string | null;
    width: number;
    height: number;
  } {
    const active = this.activeLayer();
    return {
      visible: this.gridPlane.visible === true,
      minZoom: this.gridMinZoom,
      opacityPercent: this.gridOpacityPercent,
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
    this.gridMaterial.uniforms["uOpacity"]!.value = this.gridOpacityPercent / 100;
    this.gridPlane.visible = visible;
    if (visible) {
      this.writePlaneMatrix(this.gridPlane, active.width, active.height, active.transform, this.layers.length * 0.01 + 0.02);
    }
  }

  /**
   * Cell-image axis segments in container-local CSS pixels, or null when the
   * current cell has no drawable texture. X runs along the top edge, Y along
   * the left edge, both resolved through the cell transform. Right and bottom
   * carry the plain magenta border.
   */
  private axisOverlaySegments(): {
    x: { ax: number; ay: number; bx: number; by: number };
    y: { ax: number; ay: number; bx: number; by: number };
    right: { ax: number; ay: number; bx: number; by: number };
    bottom: { ax: number; ay: number; bx: number; by: number };
  } | null {
    const active = this.activeLayer();
    if (active === null || active.width < 1 || active.height < 1) {
      return null;
    }
    const rect = this.container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return null;
    }
    const local: GnumarusRect = { left: 0, top: 0, width: rect.width, height: rect.height };
    const view = this.viewTransform();
    const toLocal = (imageX: number, imageY: number): { x: number; y: number } => {
      const project = layerImageToProject(imageX, imageY, active.width, active.height, active.transform);
      const client = projectToScreen(project.x, project.y, local, view);
      return { x: client.x, y: client.y };
    };
    const origin = toLocal(0, 0);
    const xEnd = toLocal(active.width, 0);
    const yEnd = toLocal(0, active.height);
    const far = toLocal(active.width, active.height);
    return {
      x: { ax: origin.x, ay: origin.y, bx: xEnd.x, by: xEnd.y },
      y: { ax: origin.x, ay: origin.y, bx: yEnd.x, by: yEnd.y },
      right: { ax: xEnd.x, ay: xEnd.y, bx: far.x, by: far.y },
      bottom: { ax: yEnd.x, ay: yEnd.y, bx: far.x, by: far.y },
    };
  }

  /** Write one axis segment plus its end arrowhead into a line geometry. */
  private writeAxisSegments(
    line: THREE.LineSegments,
    segment: { ax: number; ay: number; bx: number; by: number },
    width: number,
    height: number,
    z: number,
  ): void {
    const dx = segment.bx - segment.ax;
    const dy = segment.by - segment.ay;
    const length = Math.sqrt(dx * dx + dy * dy);
    let baseX = segment.bx;
    let baseY = segment.by;
    let wingX = 0;
    let wingY = 0;
    if (length > 1e-6) {
      const ux = dx / length;
      const uy = dy / length;
      const head = Math.min(9, length / 3);
      baseX = segment.bx - ux * head;
      baseY = segment.by - uy * head;
      wingX = -uy * head * 0.45;
      wingY = ux * head * 0.45;
    }
    const toScene = (x: number, y: number): [number, number] => [x - width / 2, height / 2 - y];
    const [sax, say] = toScene(segment.ax, segment.ay);
    const [sbx, sby] = toScene(segment.bx, segment.by);
    const [w1x, w1y] = toScene(baseX + wingX, baseY + wingY);
    const [w2x, w2y] = toScene(baseX - wingX, baseY - wingY);
    const attribute = line.geometry.getAttribute("position") as THREE.BufferAttribute;
    attribute.setXYZ(0, sax, say, z);
    attribute.setXYZ(1, sbx, sby, z);
    attribute.setXYZ(2, w1x, w1y, z);
    attribute.setXYZ(3, sbx, sby, z);
    attribute.setXYZ(4, w2x, w2y, z);
    attribute.setXYZ(5, sbx, sby, z);
    attribute.needsUpdate = true;
  }

  /** Write two plain segments (right + bottom border, no arrowheads). */
  private writeBorderSegments(
    line: THREE.LineSegments,
    right: { ax: number; ay: number; bx: number; by: number },
    bottom: { ax: number; ay: number; bx: number; by: number },
    width: number,
    height: number,
    z: number,
  ): void {
    const toScene = (x: number, y: number): [number, number] => [x - width / 2, height / 2 - y];
    const [rax, ray] = toScene(right.ax, right.ay);
    const [rbx, rby] = toScene(right.bx, right.by);
    const [bax, bay] = toScene(bottom.ax, bottom.ay);
    const [bbx, bby] = toScene(bottom.bx, bottom.by);
    const attribute = line.geometry.getAttribute("position") as THREE.BufferAttribute;
    attribute.setXYZ(0, rax, ray, z);
    attribute.setXYZ(1, rbx, rby, z);
    attribute.setXYZ(2, bax, bay, z);
    attribute.setXYZ(3, bbx, bby, z);
    attribute.setXYZ(4, bbx, bby, z);
    attribute.setXYZ(5, bbx, bby, z);
    attribute.needsUpdate = true;
  }

  /** Position the red X / green Y axis lines over the current cell texture. */
  private updateAxisOverlay(): void {
    if (this.disposed) {
      return;
    }
    const segments = this.axisOverlaySegments();
    if (segments === null) {
      this.axisXLine.visible = false;
      this.axisYLine.visible = false;
      this.borderLine.visible = false;
      return;
    }
    const rect = this.container.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    const z = this.layers.length * 0.01 + 0.03;
    this.writeAxisSegments(this.axisXLine, segments.x, width, height, z);
    this.writeAxisSegments(this.axisYLine, segments.y, width, height, z);
    this.writeBorderSegments(this.borderLine, segments.right, segments.bottom, width, height, z);
    this.axisXLine.visible = true;
    this.axisYLine.visible = true;
    this.borderLine.visible = true;
  }

  /** Axis overlay state in container-local CSS pixels, for tests and UI. */
  getAxisOverlayState(): {
    visible: boolean;
    xAxis: { ax: number; ay: number; bx: number; by: number };
    yAxis: { ax: number; ay: number; bx: number; by: number };
    rightBorder: { ax: number; ay: number; bx: number; by: number };
    bottomBorder: { ax: number; ay: number; bx: number; by: number };
    xColor: string;
    yColor: string;
    borderColor: string;
  } {
    const segments = this.axisOverlaySegments();
    const empty = { ax: 0, ay: 0, bx: 0, by: 0 };
    return {
      visible: segments !== null,
      xAxis: segments === null ? { ...empty } : { ...segments.x },
      yAxis: segments === null ? { ...empty } : { ...segments.y },
      rightBorder: segments === null ? { ...empty } : { ...segments.right },
      bottomBorder: segments === null ? { ...empty } : { ...segments.bottom },
      xColor: `#${this.axisXMaterial.color.getHexString()}`,
      yColor: `#${this.axisYMaterial.color.getHexString()}`,
      borderColor: `#${this.borderMaterial.color.getHexString()}`,
    };
  }

  resetView(): void {
    const rect = this.container.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      const fit = Math.min(rect.width / this.imageWidth, rect.height / this.imageHeight);
      this.zoom = this.clampViewZoom(fit >= 1 ? Math.floor(fit) : fit);
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
    this.disposeFloatingPlane();
    this.scene.remove(this.axisXLine);
    this.axisXLine.geometry.dispose();
    this.axisXMaterial.dispose();
    this.scene.remove(this.axisYLine);
    this.axisYLine.geometry.dispose();
    this.axisYMaterial.dispose();
    this.scene.remove(this.borderLine);
    this.borderLine.geometry.dispose();
    this.borderMaterial.dispose();
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
          // Middle click with the non-destructive cell transform tool flips the active layer.
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
      if (this.spaceDown && event.button === 0 && (event.ctrlKey || event.shiftKey)) {
        // Ctrl+Space+left-drag zooms like the loupe; Shift+Space+left-drag
        // rotates like the loupe. Plain Space+left-drag still pans below.
        if (event.ctrlKey) {
          this.loupeZooming = true;
          this.loupeAnchor = { x: event.clientX, y: event.clientY };
        } else {
          const angle = this.pointerAngle(event.clientX, event.clientY);
          if (angle === null) {
            return;
          }
          this.rotating = true;
          this.lastPointerAngle = angle;
        }
        canvas.setPointerCapture(event.pointerId);
        return;
      }
      if (event.button === 1 || this.spaceDown) {
        this.panning = true;
        canvas.setPointerCapture(event.pointerId);
        return;
      }
      if (event.button === 2 && (this.tool === "loupe" || this.tool === "transform")) {
        // Right-drag rotates around the viewport (loupe) or layer (transform) center.
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
        // movement only; no painting starts. (Pointer lock was tried here
        // to freeze the cursor, but the canvas lives in shadow DOM: the
        // lock lands on the host element, starving canvas listeners and
        // breaking pointer capture. Absolute positioning stays.)
        const startSize =
          this.tool === "pencil" ? this.brushSize : this.tool === "line" ? this.lineWidth : this.curveWidth;
        this.sizeDrag = { tool: this.tool, startClientX: event.clientX, startSize };
        canvas.setPointerCapture(event.pointerId);
        return;
      }
      if (this.tool === "transform") {
        // Anchors first (resize/rotate/skew/flip/reset); anywhere else
        // left-drag moves the active layer, as before.
        const layer = this.activeLayer();
        if (layer === null) {
          return;
        }
        const hit = this.layerHitTest(event.clientX, event.clientY);
        if (hit !== null && this.beginLayerGesture(hit, event)) {
          this.lastMouseClient = { x: event.clientX, y: event.clientY };
          canvas.setPointerCapture(event.pointerId);
          this.updatePreviews();
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
      if (this.tool === "transform3d" || this.tool === "destransform3d") {
        // Rotation-only gizmo tools. The destructive variant auto-selects
        // the whole current-cell texture when nothing is floating yet.
        if (this.tool === "destransform3d") {
          const floating = this.floating;
          if (floating === null || !floating.active) {
            const layer = this.activeLayer();
            if (layer === null) {
              return;
            }
            if (this.toImagePixel(event.clientX, event.clientY) === null) {
              return;
            }
            if (!this.cutAllToFloating()) {
              return;
            }
          }
        } else if (this.activeLayer() === null) {
          return;
        }
        const hit = this.rot3DHitTest(event.clientX, event.clientY);
        if (hit !== null && this.beginRot3DGesture(hit, event)) {
          this.lastMouseClient = { x: event.clientX, y: event.clientY };
          canvas.setPointerCapture(event.pointerId);
          this.updatePreviews();
        }
        // Clicks outside the gizmo are ignored so work is never baked.
        return;
      }
      if (this.tool === "loupe") {
        // Left-drag with the loupe tool zooms: up zooms in, down zooms out.
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
      if (this.tool === "rectselect") {
        // Drag marks a rectangle; releasing cuts it out as a floating texture.
        const layer = this.activeLayer();
        if (layer === null) {
          return;
        }
        const pixel = this.toImagePixel(event.clientX, event.clientY);
        if (pixel === null) {
          return;
        }
        this.rectDrag = { x0: pixel.x, y0: pixel.y, x1: pixel.x, y1: pixel.y };
        this.lastMouseClient = { x: event.clientX, y: event.clientY };
        canvas.setPointerCapture(event.pointerId);
        this.updatePreviews();
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
      if (this.tool === "destransform") {
        const floating = this.floating;
        if (floating !== null && floating.active) {
          // Anchors first, then the selection body for moves; clicks
          // anywhere else are ignored so work is never baked accidentally.
          if (this.floatingHomeVisible()) {
            const hit = this.selectionHitTest(event.clientX, event.clientY);
            if (hit !== null && this.beginSelectionGesture(hit, event)) {
              this.lastMouseClient = { x: event.clientX, y: event.clientY };
              canvas.setPointerCapture(event.pointerId);
              this.updatePreviews();
              return;
            }
            if (hit === null) {
              const local = this.clientToSelectionLocal(event.clientX, event.clientY);
              const cursor = this.clientToLayerImageFloat(event.clientX, event.clientY);
              if (
                local !== null &&
                cursor !== null &&
                local.x >= 0 &&
                local.x <= floating.width &&
                local.y >= 0 &&
                local.y <= floating.height
              ) {
                this.moveDrag = { grabDX: cursor.x - floating.cx, grabDY: cursor.y - floating.cy };
                this.lastMouseClient = { x: event.clientX, y: event.clientY };
                canvas.setPointerCapture(event.pointerId);
                this.updatePreviews();
              }
            }
          }
          return;
        }
        // Nothing selected: select the whole current-cell texture first,
        // exactly like a full-canvas rectangular selection, then move it.
        const layer = this.activeLayer();
        if (layer === null) {
          return;
        }
        const cursor = this.clientToLayerImageFloat(event.clientX, event.clientY);
        if (cursor === null) {
          return;
        }
        const pixel = this.toImagePixel(event.clientX, event.clientY);
        if (pixel === null) {
          return;
        }
        if (!this.cutAllToFloating()) {
          return;
        }
        const current = this.floating;
        if (current === null) {
          return;
        }
        this.moveDrag = { grabDX: cursor.x - current.cx, grabDY: cursor.y - current.cy };
        this.lastMouseClient = { x: event.clientX, y: event.clientY };
        canvas.setPointerCapture(event.pointerId);
        this.updatePreviews();
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
        this.strokePressure = normalizePointerPressure(event.pointerType, event.pressure);
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
      this.strokePressure = normalizePointerPressure(event.pointerType, event.pressure);
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
      if (this.trackballDrag !== null || this.axisDrag !== null) {
        this.updateRot3DGesture(event.clientX, event.clientY);
        return;
      }
      if (this.rot3dCenterTap !== null) {
        const dx = event.clientX - this.rot3dCenterTap.startClientX;
        const dy = event.clientY - this.rot3dCenterTap.startClientY;
        if (dx * dx + dy * dy >= 16) {
          // Dragged: the tap becomes a trackball measured from the down
          // point, so the full drag distance applies.
          const tap = this.rot3dCenterTap;
          this.rot3dCenterTap = null;
          const startX = this.rot3DStartAngle(tap.target, tap.layerId, "x");
          const startY = this.rot3DStartAngle(tap.target, tap.layerId, "y");
          if (startX === null || startY === null) {
            return;
          }
          this.trackballDrag = {
            target: tap.target,
            layerId: tap.layerId,
            startRotationX: startX,
            startRotationY: startY,
            grabClientX: tap.startClientX,
            grabClientY: tap.startClientY,
            radiusPx: tap.radiusPx,
          };
          this.updateRot3DGesture(event.clientX, event.clientY);
        }
        return;
      }
      if (this.layerResizeDrag !== null || this.layerRotateDrag !== null || this.layerSkewDrag !== null) {
        this.updateLayerGesture(event.clientX, event.clientY);
        return;
      }
      if (this.layerCenterTap !== null) {
        const dx = event.clientX - this.layerCenterTap.startClientX;
        const dy = event.clientY - this.layerCenterTap.startClientY;
        if (dx * dx + dy * dy >= 16) {
          // Dragged: the tap becomes a move measured from the down point,
          // so the full drag distance applies (no threshold segment lost).
          const layer = this.activeLayer();
          if (layer === null || layer.id !== this.layerCenterTap.layerId) {
            this.layerCenterTap = null;
          } else {
            const downX = this.layerCenterTap.startClientX;
            const downY = this.layerCenterTap.startClientY;
            this.layerCenterTap = null;
            this.transforming = true;
            this.transformStart = {
              clientX: downX,
              clientY: downY,
              x: layer.transform.x,
              y: layer.transform.y,
            };
          }
        } else {
          return;
        }
      }
      if (this.layerFlipTap !== null) {
        const dx = event.clientX - this.layerFlipTap.startClientX;
        const dy = event.clientY - this.layerFlipTap.startClientY;
        if (dx * dx + dy * dy >= 16) {
          // Dragged: a flip tap cancels (mirrors only toggle on click).
          this.layerFlipTap = null;
        } else {
          return;
        }
      }
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
        // Vertical movement only: up zooms in, down zooms out.
        const amount = -event.movementY;
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
      if (this.rectDrag !== null) {
        const target = this.clientToLayerImageFloat(event.clientX, event.clientY);
        if (target !== null) {
          this.rectDrag.x1 = Math.floor(target.x);
          this.rectDrag.y1 = Math.floor(target.y);
          this.lastMouseClient = { x: event.clientX, y: event.clientY };
          this.updatePreviews();
        }
        return;
      }
      if (this.resizeDrag !== null || this.rotateDrag !== null || this.skewDrag !== null) {
        this.updateTransformGesture(event.clientX, event.clientY);
        return;
      }
      if (this.centerTap !== null) {
        const dx = event.clientX - this.centerTap.startClientX;
        const dy = event.clientY - this.centerTap.startClientY;
        if (dx * dx + dy * dy >= 16) {
          // Dragged: the tap becomes a move starting from the down point.
          this.moveDrag = { grabDX: this.centerTap.grabDX, grabDY: this.centerTap.grabDY };
          this.centerTap = null;
        } else {
          return;
        }
      }
      if (this.flipTap !== null) {
        const dx = event.clientX - this.flipTap.startClientX;
        const dy = event.clientY - this.flipTap.startClientY;
        if (dx * dx + dy * dy >= 16) {
          // Dragged: a flip tap cancels (mirrors only toggle on click).
          this.flipTap = null;
        } else {
          return;
        }
      }
      if (this.moveDrag !== null) {
        const floating = this.floating;
        if (floating === null || !floating.active || !this.floatingHomeVisible()) {
          this.moveDrag = null;
        } else {
          const target = this.clientToLayerImageFloat(event.clientX, event.clientY);
          if (target !== null) {
            floating.cx = target.x - this.moveDrag.grabDX;
            floating.cy = target.y - this.moveDrag.grabDY;
            this.lastMouseClient = { x: event.clientX, y: event.clientY };
            this.syncFloatingPlane();
            this.render();
            this.updatePreviews();
          }
        }
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
                this.strokePressure = normalizePointerPressure(event.pointerType, event.pressure);
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
        this.strokePressure = normalizePointerPressure(event.pointerType, event.pressure);
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
            this.pushHistory({ type: "stroke", layerId: tex.id, diff });
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
      this.clearTransformDrags();
      this.resetPencilPixelPerfect();
      // Keep the stabilizer focus for hover preview; let follow mode converge.
      if (this.stabilizerMode === "follow") {
        this.ensureFollowLoop();
      }
      this.updatePreviews();
    };
    canvas.addEventListener("pointerup", endStroke);
    canvas.addEventListener("pointerup", (event: PointerEvent) => {
      if (this.centerTap !== null) {
        this.centerTap = null;
        if (event.button === 0) {
          this.resetFloatingTransform();
        }
        return;
      }
      if (this.flipTap !== null) {
        const axis = this.flipTap.axis;
        this.flipTap = null;
        if (event.button === 0) {
          const floating = this.floating;
          if (floating !== null && floating.active) {
            if (axis === "x") {
              floating.flipX = !floating.flipX;
            } else {
              floating.flipY = !floating.flipY;
            }
            this.afterFloatingChange();
          }
        }
        return;
      }
      if (this.layerCenterTap !== null) {
        const layerId = this.layerCenterTap.layerId;
        this.layerCenterTap = null;
        if (event.button === 0) {
          this.resetLayerTransform(layerId);
        }
        return;
      }
      if (this.layerFlipTap !== null) {
        const tap = this.layerFlipTap;
        this.layerFlipTap = null;
        if (event.button === 0) {
          const layer = this.findLayer(tap.layerId);
          if (layer !== null) {
            this.setLayerTransform(
              tap.layerId,
              tap.axis === "x" ? { flipX: !layer.transform.flipX } : { flipY: !layer.transform.flipY },
            );
          }
        }
        return;
      }
      if (this.rot3dCenterTap !== null) {
        const tap = this.rot3dCenterTap;
        this.rot3dCenterTap = null;
        if (event.button === 0) {
          this.resetRot3DAngles(tap.target, tap.layerId);
        }
        return;
      }
      if (this.rectDrag !== null && event.button === 0) {
        const drag = this.rectDrag;
        this.rectDrag = null;
        this.cutRectToFloating(drag.x0, drag.y0, drag.x1, drag.y1);
        return;
      }
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
      this.centerTap = null;
      this.flipTap = null;
      this.layerCenterTap = null;
      this.layerFlipTap = null;
      this.rot3dCenterTap = null;
      if (this.rectDrag !== null) {
        this.rectDrag = null;
        this.updatePreviews();
      }
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
        if ((event.key === "Enter" || event.key === "Return" || event.key === "Escape") && this.hasFloatingSelection()) {
          this.commitFloating();
          return;
        }        if (event.key === "b" || event.key === "B") {
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
        if (event.key === "r" || event.key === "R") {
          this.setTool("rectselect");
          return;
        }
        if (event.key === "v" || event.key === "V") {
          this.setTool("destransform");
          return;
        }
        if (event.key === "t" || event.key === "T") {
          this.setTool("transform");
          return;
        }
        if (event.key === "y" || event.key === "Y") {
          this.setTool("transform3d");
          return;
        }
        if (event.key === "u" || event.key === "U") {
          this.setTool("destransform3d");
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
        if (event.key === "Escape" && this.tool === "rectselect" && this.rectDrag !== null) {
          this.rectDrag = null;
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

  /** Pointer angle around the viewport center (ignores canvas pan). Null at the center. */
  private pointerAngle(clientX: number, clientY: number): number | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);
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
    this.syncFloatingPlane();
    this.updateAxisOverlay();
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
