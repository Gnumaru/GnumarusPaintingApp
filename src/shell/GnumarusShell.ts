import { LitElement, css, html } from "lit";
import {
  GnumarusCanvasEngine,
  GnumarusWebGlError,
  type GnumarusCanvasTool,
  type GnumarusLayerInfo,
} from "../canvas/GnumarusCanvasEngine";
import {
  downloadBlob,
  isFilePickerSupported,
  isFileSaveSupported,
  isFileSystemAccessSupported,
  pickImportFile,
  pickProjectDirectory,
  pickSaveFile,
  readFileBytes,
  readOldProjectFileReferences,
  readProjectFiles,
  readProjectMeta,
  removeProjectFile,
  writeBlobToDirectory,
  writeBlobToFile,
  writeProjectFiles,
  type GnumarusDirectoryHandle,
} from "../project/GnumarusFileSystem";
import {
  encodeProjectArchive,
  findStaleProjectPaths,
  GNUMARUS_APP_ID,
  GNUMARUS_PROJECT_ARCHIVE_FILE,
  GNUMARUS_PROJECT_FILE,
  serializeProject,
  staleTextureCandidates,
  textureFilePath,
  type GnumarusContentMeta,
  type GnumarusProjectMeta,
  type GnumarusTextureMeta,
} from "../project/GnumarusProjectFormat";
import {
  CHECKER_SETTINGS_STORAGE_KEY,
  DEFAULT_CHECKER_SETTINGS,
  clampCheckerSize,
  parseCheckerSettings,
  serializeCheckerSettings,
  type GnumarusCheckerMode,
  type GnumarusCheckerSettings,
} from "../settings/GnumarusCheckerSettings";
import {
  DEFAULT_BACKGROUND_SETTINGS,
  BACKGROUND_SETTINGS_STORAGE_KEY,
  parseBackgroundSettings,
  serializeBackgroundSettings,
  type GnumarusBackgroundMode,
  type GnumarusBackgroundSettings,
} from "../settings/GnumarusBackgroundSettings";
import {
  DEFAULT_GRID_SETTINGS,
  GRID_SETTINGS_STORAGE_KEY,
  GNUMARUS_GRID_MAX_OPACITY_PERCENT,
  GNUMARUS_GRID_MAX_ZOOM,
  GNUMARUS_GRID_MIN_OPACITY_PERCENT,
  GNUMARUS_GRID_MIN_ZOOM,
  clampGridMinZoom,
  clampGridOpacityPercent,
  parseGridSettings,
  serializeGridSettings,
} from "../settings/GnumarusGridSettings";
import {
  DEFAULT_ROTATION_SETTINGS,
  ROTATION_SETTINGS_STORAGE_KEY,
  clampRotationStepDeg,
  parseRotationSettings,
  serializeRotationSettings,
} from "../settings/GnumarusRotationSettings";
import {
  DEFAULT_ZOOM_SETTINGS,
  ZOOM_SETTINGS_STORAGE_KEY,
  clampZoomMinPercent,
  parseZoomSettings,
  serializeZoomSettings,
} from "../settings/GnumarusZoomSettings";
import {
  DEFAULT_TOAST_SETTINGS,
  TOAST_SETTINGS_STORAGE_KEY,
  clampToastDurationSec,
  parseToastSettings,
  serializeToastSettings,
} from "../settings/GnumarusToastSettings";
import {
  DEFAULT_FIT_SETTINGS,
  FIT_SETTINGS_STORAGE_KEY,
  clampFitAlphaThreshold,
  parseFitSettings,
  serializeFitSettings,
} from "../settings/GnumarusFitSettings";
import {
  applyNewProjectPreset,
  GNUMARUS_NEW_PROJECT_PRESETS,
} from "../settings/GnumarusNewProjectPresets";
import {
  DEFAULT_STORAGE_SETTINGS,
  STORAGE_SETTINGS_STORAGE_KEY,
  clampBrushQuality,
  clampStorageJpgQuality,
  clampStoragePngLevel,
  clampStorageQuality,
  parseProjectFileFormat,
  parseStorageFormat,
  parseStorageSettings,
  serializeStorageSettings,
  type GnumarusProjectFileFormat,
  type GnumarusStorageFormat,
  type GnumarusStorageSettings,
} from "../settings/GnumarusStorageSettings";
import {
  DEFAULT_IMPORT_CLEANUP,
  IMPORT_CLEANUP_STORAGE_KEY,
  parseImportCleanup,
  parseImportCleanupSettings,
  serializeImportCleanupSettings,
  type GnumarusImportCleanup,
} from "../settings/GnumarusImportSettings";
import {
  DEFAULT_EXPAND_SETTINGS,
  EXPAND_SETTINGS_STORAGE_KEY,
  clampExpandStep,
  parseExpandSettings,
  serializeExpandSettings,
} from "../settings/GnumarusExpandSettings";
import { compositeFinalImage, type GnumarusPreviewBackground } from "../preview/GnumarusFinalRender";
import {
  detectStillFormats,
  decodeJpegToBuffer,
  encodeStillImage,
  exportBaseName,
  findStillFormat,
  frameFileStem,
  GNUMARUS_DEFAULT_STILL_QUALITY,
  normalizeStillQualityPercent,
  type GnumarusStillFormat,
} from "../export/GnumarusImageExport";
import {
  decodeJxlBytes,
  encodeJxlAnimation,
  encodeJxlStill,
  JXL_EXT,
  JXL_LABEL,
  JXL_MIME,
  JXL_STORAGE_EFFORT,
} from "../export/GnumarusJxlExport";
import {
  decodeWebpBytes,
  encodeWebpAnimation,
  encodeWebpStill,
  WEBP_EXT,
  WEBP_LABEL,
  WEBP_MIME,
  WEBP_STORAGE_EFFORT,
} from "../export/GnumarusWebpExport";
import { createGifEncoder } from "../export/GnumarusGifExport";
import {
  composeSheet,
  computeSheetGeometry,
  GNUMARUS_SHEET_LAYOUTS,
  type GnumarusSheetLayout,
} from "../export/GnumarusSpritesheet";
import { parseFrameList, resolveExportSequence } from "../animation/GnumarusNamedAnimations";
import { decodePngToBuffer, encodeBufferToPngBlob } from "../project/GnumarusPngCodec";
import { parseAsepriteFile } from "../project/GnumarusAseprite";
import { parsePsdFile } from "../project/GnumarusPsd";
import { parseXcfFile } from "../project/GnumarusXcf";
import { parseHexColor } from "../canvas/GnumarusPixelBuffer";
import {
  applyAlphaPlane,
  clampBrushSizeFloat,
  cropBufferBox,
  extractAlphaPlane,
  findAlphaBoundingBox,
  parseBlendMode,
  parseBrushShape,
  parsePressureResponse,
  type GnumarusBlendMode,
  type GnumarusBrushShape,
  type GnumarusPressureResponse,
} from "../canvas/GnumarusPixelBuffer";
import {
  GNUMARUS_DEFAULT_FOLLOW_STRENGTH,
  GNUMARUS_DEFAULT_ROPE_LENGTH,
  GNUMARUS_DEFAULT_STABILIZER_MODE,
  clampFollowStrength,
  clampRopeLength,
  parseStabilizerMode,
  type GnumarusStabilizerMode,
} from "../canvas/GnumarusStabilizer";
import {
  DEFAULT_AIRBRUSH_RATE,
  DEFAULT_BRUSH_FLOW,  DEFAULT_BRUSH_HARDNESS,
  DEFAULT_BRUSH_SPACING,
  DEFAULT_PAINT_DUAL_SCALE,
  DEFAULT_PAINT_DUAL_STRENGTH,
  DEFAULT_PAINT_DYNAMICS_AMOUNT,
  DEFAULT_PAINT_FUZZY,
  DEFAULT_PAINT_GRAIN_SCALE,
  DEFAULT_PAINT_GRAIN_STRENGTH,
  DEFAULT_PAINT_SMUDGE_RATE,
  DEFAULT_PAINT_SMUDGE_WET,
  clampAirbrushRate,
  clampBrushFlow,
  clampBrushHardness,
  clampBrushSpacing,
  clampPaintDualScale,
  clampPaintDualStrength,
  clampPaintDynamicsAmount,
  clampPaintFuzzy,
  clampPaintGrainScale,
  clampPaintGrainStrength,
  clampPaintSmudgeRate,
  clampPaintSmudgeWet,
  paintTipImageFromRgba,
  parseBrushTipKind,
  parsePressureCurve,
  parseSymmetryMode,
  parseTipAngleMode,
  type GnumarusBrushTipKind,
  type GnumarusPressureCurve,
  type GnumarusSymmetryMode,
  type GnumarusTipAngleMode,
} from "../canvas/GnumarusPaintBrush";
import { parseWrapMode, type GnumarusWrapMode } from "../canvas/GnumarusViewportMath";
import {
  BRUSH_PRESET_STORAGE_KEY,
  BUILT_IN_BRUSH_PRESETS,
  parseBrushPreset,
  parseBrushPresetList,
  serializeBrushPreset,
  serializeBrushPresetList,
  type GnumarusBrushPreset,
} from "../canvas/GnumarusBrushPresets";
import { parseHexToRgbaBytes, rgbaBytesToHex } from "../color/GnumarusColorModels";
import {
  getActiveLocale,
  resolveLocale,
  setActiveLocale,
  tr,
  type GnumarusLocale,
  type GnumarusLocaleSetting,
} from "../i18n/GnumarusI18n";
import {
  DEFAULT_LOCALE_SETTINGS,
  LOCALE_SETTINGS_STORAGE_KEY,
  parseLocaleSetting,
  parseLocaleSettings,
  serializeLocaleSettings,
} from "../settings/GnumarusLocaleSettings";
import { type GnumarusTexturePixels } from "../animation/GnumarusAnimationModel";
import {
  countAnimationFrames,
  describeNamedAnimation,
  nextAnimationStep,
  parseNamedAnimation,
  GnumarusNamedAnimationError,
  type GnumarusNamedAnimation,
} from "../animation/GnumarusNamedAnimations";
import {
  actionBlockedMessage,
  GnumarusActionRegistry,
  searchActions,
  type GnumarusAction,
  type GnumarusActionContext,
} from "../actions/GnumarusActions";
import {
  clampFrameDurationSec,
  formatFrameRanges,
  frameDurationTimeoutMs,
  GNUMARUS_DEFAULT_FRAME_DURATION_SEC as DEFAULT_ANIMATION_FRAME_DURATION,
} from "../animation/GnumarusAnimationModel";
import "../color/GnumarusColorPicker";

interface GnumarusShortcutEntry {
  keys: string;
  action: string;
}

interface GnumarusShortcutSection {
  title: string;
  entries: GnumarusShortcutEntry[];
}

/** True when the bytes start with the Photoshop `8BPS` signature. */
function isPhotoshopFile(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x38 &&
    bytes[1] === 0x42 &&
    bytes[2] === 0x50 &&
    bytes[3] === 0x53
  );
}

/** True when the bytes start with the GIMP `gimp xcf ` signature. */
function isGimpFile(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 9 &&
    bytes[0] === 0x67 &&
    bytes[1] === 0x69 &&
    bytes[2] === 0x6d &&
    bytes[3] === 0x70 &&
    bytes[4] === 0x20 &&
    bytes[5] === 0x78 &&
    bytes[6] === 0x63 &&
    bytes[7] === 0x66 &&
    bytes[8] === 0x20
  );
}

/** Public source repository opened by Help > Source code. */
export const GNUMARUS_SOURCE_URL = "https://github.com/Gnumaru/GnumarusPaintingApp";

function gnumarusShortcuts(): GnumarusShortcutSection[] {
  return [
    {
      title: tr("sc.file"),
      entries: [
        { keys: "Ctrl+S (Cmd+S on macOS)", action: tr("sc.saveFolder") },
      ],
    },
    {
      title: tr("sc.history"),
      entries: [
        { keys: "Ctrl+Z (Cmd+Z on macOS)", action: tr("sc.undo") },
        { keys: "Ctrl+Y or Shift+Ctrl+Z (Cmd+Y or Shift+Cmd+Z on macOS)", action: tr("sc.redo") },
      ],
    },
    {
      title: tr("sc.layers"),
      entries: [
        { keys: "Ctrl+E (Cmd+E on macOS)", action: tr("sc.mergeDown") },
        { keys: "PageUp", action: tr("sc.layerAbove") },
        { keys: "PageDown", action: tr("sc.layerBelow") },
        { keys: "ArrowUp", action: tr("sc.layerAbove") },
        { keys: "ArrowDown", action: tr("sc.layerBelow") },
        { keys: "Shift+ArrowUp", action: tr("sc.moveLayerUp") },
        { keys: "Shift+ArrowDown", action: tr("sc.moveLayerDown") },
        { keys: "Insert", action: tr("sc.insertLayer") },
        { keys: "Delete", action: tr("sc.deleteCell") },
        { keys: "Ctrl+Shift+ArrowUp", action: tr("sc.expandUp") },
        { keys: "Ctrl+Shift+ArrowDown", action: tr("sc.expandDown") },
        { keys: "Ctrl+Shift+ArrowLeft", action: tr("sc.expandLeft") },
        { keys: "Ctrl+Shift+ArrowRight", action: tr("sc.expandRight") },
      ],
    },
    {
      title: tr("sc.frames"),
      entries: [
        { keys: "ArrowLeft", action: tr("sc.prevFrame") },
        { keys: "ArrowRight", action: tr("sc.nextFrame") },
        { keys: "Shift+ArrowLeft", action: tr("sc.moveFrameLeft") },
        { keys: "Shift+ArrowRight", action: tr("sc.moveFrameRight") },
      ],
    },
    {
      title: tr("sc.tools"),
      entries: [
        { keys: "B", action: tr("sc.toolPencil") },
        { keys: "G or F", action: tr("sc.toolBucket") },
        { keys: "N", action: tr("sc.toolLine") },
        { keys: "C", action: tr("sc.toolCurve") },
        { keys: "Z", action: tr("sc.toolLoupe") },
        { keys: "T", action: tr("sc.toolTransform") },
        { keys: "Y", action: tr("sc.toolRot3d") },
        { keys: "R", action: tr("sc.toolRectselect") },
        { keys: "O", action: tr("sc.toolEllipse") },
        { keys: "L", action: tr("sc.toolLasso") },
        { keys: "W", action: tr("sc.toolColorselect") },
        { keys: "Shift / Ctrl+Shift / Alt+Shift + drag", action: tr("sc.rectselectModifiers") },
        { keys: "V", action: tr("sc.toolDestransform") },
        { keys: "U", action: tr("sc.toolDestransform3d") },
        { keys: "E", action: tr("sc.toggleEraser") },
        { keys: "Hold Ctrl", action: tr("sc.tempEyedropper") },
        { keys: "Enter, Return or Esc", action: tr("sc.mergeFloating") },
        { keys: "Escape", action: tr("sc.cancelStroke") },
      ],
    },
    {
      title: tr("sc.view"),
      entries: [
        { keys: "1 (main keyboard)", action: tr("sc.zoom100") },
        { keys: "2 (main keyboard)", action: tr("sc.fitRotated") },
        { keys: "0 (main keyboard)", action: tr("sc.resetTransform") },
        { keys: "4 (main and numpad)", action: tr("sc.rotateCcw") },
        { keys: "6 (main and numpad)", action: tr("sc.rotateCw") },
        { keys: "5 (main and numpad)", action: tr("sc.resetRotation") },
        { keys: "M", action: tr("sc.flipH") },
        { keys: "Shift+M", action: tr("sc.flipV") },
        { keys: "Ctrl+Alt+=", action: tr("sc.zoomIn") },
        { keys: "Ctrl+Alt+-", action: tr("sc.zoomOut") },
        { keys: "Hold Space and drag, or middle-drag", action: tr("sc.pan") },
        { keys: "Mouse wheel", action: tr("sc.zoomAtCursor") },
        { keys: "Hold Ctrl+Space, left-drag up/down", action: tr("sc.loupeZoom") },
        { keys: "Hold Shift+Space and left-drag", action: tr("sc.loupeRotate") },
        { keys: "Alt+middle-click (loupe or cell transform tool)", action: tr("sc.loupeReset") },
        { keys: "Middle-click (loupe or cell transform tool)", action: tr("sc.loupeFlip") },
        { keys: "Right-drag (loupe or cell transform tool)", action: tr("sc.loupeRotateDrag") },
        { keys: "Shift+Left-drag (pencil, line, curve)", action: tr("sc.liveResize") },
      ],
    },
    {
      title: tr("sc.actions"),
      entries: [
        {
          keys: "Ctrl+Shift+P (Cmd+Shift+P on macOS)",
          action: tr("sc.quickSearch"),
        },
      ],
    },
    {
      title: tr("sc.interface"),
      entries: [{ keys: "Tab", action: tr("sc.hideChrome") }],
    },
  ];
}

export class GnumarusShell extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100vh;
      width: 100vw;
      background: #1e1e1e;
      color: #e6e6e6;
      font-size: 13px;
      user-select: none;
    }
    [hidden] {
      display: none !important;
    }
    * {
      scrollbar-width: thin;
      scrollbar-color: #555 #1e1e1e;
    }
    *::-webkit-scrollbar {
      width: 10px;
      height: 10px;
    }
    *::-webkit-scrollbar-track {
      background: #1e1e1e;
    }
    *::-webkit-scrollbar-thumb {
      background: #555;
      border-radius: 5px;
      border: 2px solid #1e1e1e;
    }
    *::-webkit-scrollbar-thumb:hover {
      background: #0e639c;
    }
    *::-webkit-scrollbar-corner {
      background: #1e1e1e;
    }
    .menubar {
      display: flex;
      align-items: center;
      height: 32px;
      background: #2b2b2b;
      border-bottom: 1px solid #111;
      padding: 0 8px;
      gap: 4px;
      flex: 0 0 auto;
    }
    .menu {
      position: relative;
    }
    .menu > button,
    .toolbar button {
      background: transparent;
      color: #e6e6e6;
      border: 1px solid transparent;
      border-radius: 4px;
      padding: 4px 10px;
      cursor: pointer;
      font-size: 13px;
    }
    .toolbar .tool-icon {
      display: inline-block;
      transform: scale(2.5);
    }
    .toolbar .tool-icon svg {
      display: block;
    }
    .tool-drawer {
      position: relative;
    }
    .tool-drawer > button::after {
      content: "";
      position: absolute;
      right: 3px;
      bottom: 3px;
      border-left: 5px solid transparent;
      border-bottom: 5px solid #9a9a9a;
    }
    .tool-drawer > button {
      position: relative;
    }
    .tool-flyout {
      position: absolute;
      left: calc(100% + 4px);
      top: 0;
      display: flex;
      flex-direction: row;
      gap: 4px;
      background: #252526;
      border: 1px solid #555;
      border-radius: 4px;
      padding: 4px;
      z-index: 30;
    }
    .drawer-blocker {
      position: fixed;
      inset: 0;
      z-index: 29;
    }
    .menu > button:hover,
    .toolbar button:hover {
      background: #3a3a3a;
    }
    .menu > button.active,
    .toolbar button.active {
      background: #0e639c;
      border-color: #0e639c;
    }
    .dropdown {
      position: absolute;
      top: 28px;
      left: 0;
      min-width: 160px;
      background: #2b2b2b;
      border: 1px solid #111;
      border-radius: 4px;
      padding: 4px;
      z-index: 20;
    }
    .dropdown button {
      display: block;
      width: 100%;
      text-align: left;
      background: transparent;
      color: #e6e6e6;
      border: none;
      border-radius: 4px;
      padding: 6px 10px;
      cursor: pointer;
      font-size: 13px;
    }
    .dropdown button:hover {
      background: #0e639c;
    }
    .dropdown button:disabled {
      opacity: 0.4;
      cursor: default;
    }
    .dropdown button:disabled:hover {
      background: transparent;
    }
    .app-title {
      margin-left: 8px;
      color: #9a9a9a;
      font-size: 12px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .tool-options {
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 30px;
      background: #2b2b2b;
      border-bottom: 1px solid #111;
      padding: 2px 10px;
      flex: 0 0 auto;
      font-size: 12px;
      overflow-x: auto;
      white-space: nowrap;
    }
    .tool-options label {
      display: flex;
      gap: 6px;
      align-items: center;
    }
    .tool-options input[type="number"] {
      width: 64px;
      background: #1e1e1e;
      color: #e6e6e6;
      border: 1px solid #555;
      border-radius: 4px;
      padding: 2px 6px;
    }
    .tool-options select {
      background: #1e1e1e;
      color: #e6e6e6;
      border: 1px solid #555;
      border-radius: 4px;
      padding: 2px 6px;
    }
    .tool-options .tool-options-empty {
      color: #9a9a9a;
    }
    .body {
      display: flex;
      flex: 1 1 auto;
      min-height: 0;
    }
    .toolbar {
      width: 56px;
      background: #252526;
      border-right: 1px solid #111;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 8px 0;
      gap: 8px;
      flex: 0 0 auto;
    }
    .toolbar gnumarus-color-picker {
      --gnumarus-swatch-width: 36px;
      --gnumarus-swatch-height: 28px;
    }
    .canvas-host {
      flex: 1 1 auto;
      position: relative;
      min-width: 0;
      min-height: 0;
      background: #333333;
    }
    .canvas-host canvas {
      position: static;
      inset: auto;
    }
    .canvas-host > canvas {
      position: absolute;
      inset: 0;
    }
    .layers-panel {
      width: 220px;
      background: #252526;
      border-left: 1px solid #111;
      display: flex;
      flex-direction: column;
      flex: 0 0 auto;
      min-height: 0;
    }
    .layers-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 8px;
      font-weight: 600;
      border-bottom: 1px solid #111;
    }
    .layers-header button {
      background: #0e639c;
      color: #fff;
      border: none;
      border-radius: 4px;
      padding: 2px 10px;
      cursor: pointer;
      font-size: 14px;
      line-height: 1.4;
    }
    .layers-list {
      overflow-y: auto;
      flex: 1 1 auto;
    }
    .layer-row {
      border-bottom: 1px solid #111;
      padding: 4px 6px;
      cursor: pointer;
    }
    .layer-row.active {
      background: #094771;
    }
    .layer-top {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .layer-top input[type="checkbox"] {
      cursor: pointer;
    }
    .layer-name {
      flex: 1 1 auto;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .layer-dims {
      color: #9a9a9a;
      font-size: 11px;
      flex: 0 0 auto;
    }
    .layer-row input.layer-rename {
      flex: 1 1 auto;
      min-width: 0;
      background: #1e1e1e;
      color: #e6e6e6;
      border: 1px solid #0e639c;
      border-radius: 4px;
      padding: 2px 4px;
    }
    .layer-row button {
      background: transparent;
      color: #e6e6e6;
      border: 1px solid transparent;
      border-radius: 4px;
      padding: 2px 6px;
      cursor: pointer;
      font-size: 12px;
    }
    .layer-row button:hover {
      background: #3a3a3a;
    }
    .layer-row button:disabled {
      opacity: 0.3;
      cursor: default;
    }
    .layer-row button:disabled:hover {
      background: transparent;
    }
    .layer-opacity {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 4px;
      font-size: 11px;
      color: #9a9a9a;
    }
    .layer-opacity input[type="range"] {
      flex: 1 1 auto;
      min-width: 0;
    }
    .layer-channels {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 4px;
      font-size: 11px;
      color: #9a9a9a;
    }
    .layer-channels button {
      flex: 1 1 auto;
      min-width: 0;
      padding: 2px 0;
      font-size: 11px;
      font-weight: 600;
    }
    .layer-channels button.active {
      background: #b56600;
      border-color: #b56600;
    }
    .layer-resize {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 4px;
      font-size: 11px;
      color: #9a9a9a;
    }
    .layer-resize button {
      flex: 0 0 auto;
    }
    .anim-matrix {
      flex: 0 1 auto;
      max-height: 148px;
      background: #252526;
      border-top: 1px solid #111;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    .anim-scroll {
      overflow: auto;
      min-height: 0;
    }
    .anim-grid {
      display: inline-grid;
      min-width: 100%;
    }
    .anim-corner,
    .anim-frame-header,
    .anim-layer-name {
      position: sticky;
      background: #2b2b2b;
      z-index: 2;
    }
    .anim-corner {
      top: 0;
      left: 0;
      z-index: 3;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      gap: 4px;
      padding: 2px;
    }
    .anim-corner button {
      background: transparent;
      color: #e6e6e6;
      border: 1px solid transparent;
      border-radius: 4px;
      padding: 2px 8px;
      cursor: pointer;
      font-size: 13px;
      line-height: 1.4;
    }
    .anim-corner button:hover {
      background: #3a3a3a;
    }
    .anim-corner select {
      background: #2b2b2b;
      color: #e6e6e6;
      border: 1px solid #3a3a3a;
      border-radius: 4px;
      padding: 2px 4px;
      cursor: pointer;
      font-size: 12px;
      max-width: 100%;
    }
    .anim-frame-header {
      top: 0;
      text-align: center;
      padding: 2px;
    }
    .anim-frame-header button {
      background: transparent;
      color: #e6e6e6;
      border: 1px solid transparent;
      border-radius: 4px;
      padding: 2px 8px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      width: 100%;
    }
    .anim-frame-header.current button {
      background: #0e639c;
      border-color: #0e639c;
    }
    .anim-frame-header.in-animation button {
      background: #0e5a3c;
      border-color: #0e5a3c;
    }
    .anim-frame-header.current.in-animation button {
      background: #0e639c;
      border-color: #0e639c;
      box-shadow: inset 0 0 0 1px #2da886;
    }
    .anim-frame-header.in-range button {
      box-shadow: inset 0 0 0 2px #ffd23f;
    }
    .anim-frame-header button:hover {
      background: #3a3a3a;
    }
    .anim-frame-header.current button:hover {
      background: #0e639c;
    }
    .anim-layer-name {
      left: 0;
      padding: 2px 8px;
      font-size: 12px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      border-top: 1px solid #111;
      line-height: 24px;
    }
    .anim-cell {
      border-top: 1px solid #111;
      border-left: 1px solid #111;
      min-height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 11px;
      color: #9a9a9a;
      padding: 0 4px;
      overflow: hidden;
    }
    .anim-cell.filled {
      background: #094771;
      color: #e6e6e6;
    }
    .anim-cell.current-frame {
      box-shadow: inset 0 0 0 1px #0e639c;
    }
    .anim-cell.in-animation {
      box-shadow: inset 0 0 0 1px #2da886;
    }
    .anim-cell.current-frame.in-animation {
      box-shadow: inset 0 0 0 1px #0e639c, inset 0 0 0 3px #2da886;
    }
    .anim-cell.active-cell {
      box-shadow: inset 0 0 0 2px #ffd23f;
    }
    .anim-cell .cell-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .context-blocker {
      position: fixed;
      inset: 0;
      z-index: 40;
    }
    .context-menu {
      position: fixed;
      z-index: 41;
      min-width: 160px;
      max-width: min(320px, 90vw);
      max-height: 260px;
      overflow-y: auto;
      background: #2b2b2b;
      border: 1px solid #111;
      border-radius: 4px;
      padding: 4px;
    }
    .context-menu button {
      display: block;
      width: 100%;
      text-align: left;
      background: transparent;
      color: #e6e6e6;
      border: none;
      border-radius: 4px;
      padding: 6px 10px;
      cursor: pointer;
      font-size: 13px;
    }
    .context-menu button:hover {
      background: #0e639c;
    }
    .context-menu button:disabled {
      opacity: 0.4;
      cursor: default;
    }
    .context-menu button:disabled:hover {
      background: transparent;
    }
    .statusbar {
      display: flex;
      align-items: center;
      gap: 16px;
      height: 26px;
      background: #007acc;
      color: #fff;
      padding: 0 10px;
      font-size: 12px;
      flex: 0 0 auto;
      overflow: hidden;
      white-space: nowrap;
    }
    .statusbar .spacer {
      flex: 1 1 auto;
    }
    dialog {
      background: #2b2b2b;
      color: #e6e6e6;
      border: 1px solid #111;
      border-radius: 6px;
      padding: 16px;
    }
    dialog label {
      display: flex;
      gap: 8px;
      align-items: center;
      margin: 8px 0;
    }
    dialog input {
      width: 90px;
      background: #1e1e1e;
      color: #e6e6e6;
      border: 1px solid #555;
      border-radius: 4px;
      padding: 4px 6px;
    }
    dialog select {
      background: #1e1e1e;
      color: #e6e6e6;
      border: 1px solid #555;
      border-radius: 4px;
      padding: 4px 6px;
      max-width: 260px;
    }
    .settings-section {
      margin: 12px 0 4px 0;
      font-weight: 600;
      border-bottom: 1px solid #444;
      padding-bottom: 4px;
    }
    .setting-row {
      display: flex;
      gap: 8px;
      align-items: center;
      margin: 8px 0;
    }
    .setting-row label {
      display: flex;
      gap: 8px;
      align-items: center;
      margin: 0;
      flex: 1 1 auto;
    }
    .reset-btn {
      background: transparent;
      color: #e6e6e6;
      border: 1px solid #555;
      border-radius: 4px;
      padding: 2px 8px;
      cursor: pointer;
      font-size: 14px;
      line-height: 1.2;
    }
    .reset-btn:hover {
      background: #0e639c;
      border-color: #0e639c;
    }
    .preview-window {
      position: absolute;
      z-index: 30;
      min-width: 160px;
      min-height: 160px;
      width: 264px;
      height: 288px;
      max-width: 80%;
      max-height: 80%;
      background: #252526;
      border: 1px solid #0e639c;
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      resize: both;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    }
    .preview-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 8px;
      background: #2b2b2b;
      border-bottom: 1px solid #111;
      cursor: move;
      flex: 0 0 auto;
      font-weight: 600;
    }
    .preview-header .spacer {
      flex: 1 1 auto;
    }
    .preview-header button {
      background: transparent;
      color: #e6e6e6;
      border: 1px solid transparent;
      border-radius: 4px;
      padding: 2px 8px;
      cursor: pointer;
    }
    .preview-header button:hover {
      background: #3a3a3a;
    }
    .preview-toolbar {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      flex: 0 0 auto;
      font-size: 12px;
    }
    .preview-toolbar button {
      background: #0e639c;
      color: #fff;
      border: none;
      border-radius: 4px;
      padding: 2px 10px;
      cursor: pointer;
    }
    .preview-body {
      flex: 1 1 auto;
      overflow: auto;
      min-height: 0;
      background: #1e1e1e;
      display: flex;
      cursor: grab;
      touch-action: none;
    }
    .preview-body:active {
      cursor: grabbing;
    }
    .preview-body canvas {
      image-rendering: pixelated;
      background: transparent;
      flex: 0 0 auto;
      margin: auto;
    }
    .toast {
      position: absolute;
      left: 50%;
      bottom: 12px;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.85);
      color: #fff;
      padding: 6px 14px;
      border-radius: 12px;
      font-size: 13px;
      z-index: 20;
      pointer-events: none;
      white-space: nowrap;
    }
    .dialog-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      margin-top: 12px;
    }
    .dialog-actions button {
      background: #0e639c;
      color: #fff;
      border: none;
      border-radius: 4px;
      padding: 6px 12px;
      cursor: pointer;
    }
    .dialog-error {
      color: #f48771;
      margin: 8px 0 0 0;
    }
    .animation-list {
      list-style: none;
      margin: 12px 0 0 0;
      padding: 0;
      max-height: min(30vh, 220px);
      overflow-y: auto;
    }
    .animation-list li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 4px 0;
      border-top: 1px solid #3a3a3a;
    }
    .shortcuts-list {
      max-height: min(60vh, 420px);
      min-width: min(480px, 80vw);
      overflow-y: auto;
      margin: 8px 0;
    }
    .shortcuts-list h4 {
      margin: 12px 0 4px 0;
    }
    .shortcuts-list h4:first-child {
      margin-top: 0;
    }
    .shortcuts-list table {
      border-collapse: collapse;
      width: 100%;
    }
    .shortcuts-list td {
      padding: 3px 8px 3px 0;
      vertical-align: top;
    }
    .shortcuts-list kbd {
      background: #1e1e1e;
      border: 1px solid #555;
      border-radius: 4px;
      padding: 1px 6px;
      white-space: nowrap;
    }
    .action-palette-list {
      display: flex;
      flex-direction: column;
      gap: 2px;
      max-height: 320px;
      overflow-y: auto;
      min-width: 320px;
      max-width: min(560px, 80vw);
      padding: 4px;
      margin: 8px 0;
    }
    .action-palette-list button {
      text-align: left;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 4px;
      color: inherit;
      padding: 6px 8px;
      cursor: pointer;
    }
    .action-palette-list button.selected {
      background: #3a5a8c;
      border-color: #5a7aaa;
    }
    .picker-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 8px;
      max-height: 320px;
      overflow-y: auto;
      min-width: 320px;
      max-width: min(560px, 80vw);
      padding: 4px;
      margin: 8px 0;
    }
    .picker-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      background: #1e1e1e;
      color: #e6e6e6;
      border: 1px solid #555;
      border-radius: 6px;
      padding: 8px 6px;
      cursor: pointer;
      font-size: 12px;
      min-height: 96px;
    }
    .picker-item:hover {
      background: #0e639c;
      border-color: #0e639c;
    }
    .picker-item .picker-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 100%;
    }
    .picker-thumb {
      width: 48px;
      height: 48px;
      image-rendering: pixelated;
      background: transparent;
      border: 1px solid #111;
    }
    .picker-empty {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px dashed #555;
      border-radius: 4px;
      font-size: 20px;
      color: #9a9a9a;
    }
    .error {
      color: #ffb3b3;
    }
  `;

  static properties = {
    tool: { type: String },
    colorValue: { type: String },
    zoomText: { type: String },
    rotText: { type: String },
    flipText: { type: String },
    cursorText: { type: String },
    canvasText: { type: String },
    layerText: { type: String },
    frameText: { type: String },
    projectName: { type: String },
    dirty: { type: Boolean },
    statusMessage: { type: String },
    fileMenuOpen: { type: Boolean },
    editMenuOpen: { type: Boolean },
    helpMenuOpen: { type: Boolean },
    webglError: { type: String },
    fsSupported: { type: Boolean },
    newWidth: { type: Number },
    newHeight: { type: Number },
    newPreset: { type: String },
    newStorageFormat: { type: String },
    newStorageLossless: { type: Boolean },
    newStorageQuality: { type: Number },
    resizeWidth: { type: Number },
    resizeHeight: { type: Number },
    resizingLayerId: { type: String },
    checkerMode: { type: String },
    checkerSizeX: { type: Number },
    checkerSizeY: { type: Number },
    gridMinZoom: { type: Number },
    gridOpacity: { type: Number },
    actionPaletteQuery: { type: String },
    actionPaletteIndex: { type: Number },
    rotationStepDeg: { type: Number },
    zoomMinPercent: { type: Number },
    floatingActive: { type: Boolean },
    backgroundMode: { type: String },
    backgroundColor: { type: String },
    previewOpen: { type: Boolean },
    previewZoom: { type: Number },
    previewX: { type: Number },
    previewY: { type: Number },
    canUndo: { type: Boolean },
    canRedo: { type: Boolean },
    layers: { type: Array },
    activeLayerId: { type: String },
    renamingId: { type: String },
    contextMenuLayerId: { type: String },
    contextMenuX: { type: Number },
    contextMenuY: { type: Number },
    matrixMenu: { type: Object },
    contentPickerTarget: { type: Object },
    texturePickerContentId: { type: String },
    fitTextureTarget: { type: Object },
    fitThreshold: { type: Number },
    checkerColorA: { type: String },
    checkerColorB: { type: String },
    defaultFrameDuration: { type: Number },
    durationTargetFrame: { type: Number },
    durationValue: { type: Number },
    animationInput: { type: String },
    animationDeleteTarget: { type: String },
    animationError: { type: String },
    exportFrame: { type: Number },
    exportFormat: { type: String },
    exportFormats: { type: Array },
    exportQuality: { type: Number },
    exportJxlLossless: { type: Boolean },
    exportWebpLossless: { type: Boolean },
    exportAnimation: { type: String },
    exportAnimatedFormat: { type: String },
    exportAnimatedQuality: { type: Number },
    exportAnimatedJxlLossless: { type: Boolean },
    exportAnimatedWebpLossless: { type: Boolean },
    exportSheetLayout: { type: String },
    exportSheetFormat: { type: String },
    exportSheetCount: { type: Number },
    exportSheetQuality: { type: Number },
    exportSheetJxlLossless: { type: Boolean },
    exportSheetWebpLossless: { type: Boolean },
    playing: { type: Boolean },
    uiHidden: { type: Boolean },
    toastMessage: { type: String },
    toastDurationSec: { type: Number },
    locale: { type: String },
    fitDefaultThreshold: { type: Number },
    storageLossless: { type: Boolean },
    storageQuality: { type: Number },
    storageFormat: { type: String },
    storagePngLevel: { type: Number },
    storageJpegQuality: { type: Number },
    storageProjectFile: { type: String },
    brushQuality: { type: Number },
    importCleanup: { type: String },
    expandStep: { type: Number },
    renamingFrame: { type: Number },
    selectedFrames: { type: Array },
    deleteFramesTarget: { type: Array },
    brushSize: { type: Number },
    brushShape: { type: String },
    presetName: { type: String },
    brushTipKind: { type: String },
    selectionDrawerFront: { type: String },
    selectionDrawerOpen: { type: Boolean },
    colorThreshold: { type: Number },
    colorContiguous: { type: Boolean },
    brushHardness: { type: Number },
    brushSpacing: { type: Number },
    brushFlow: { type: Number },
    paintFuzzy: { type: Number },
    paintGrainStrength: { type: Number },
    paintGrainScale: { type: Number },
    tiltSizeAmount: { type: Number },
    speedFadeAmount: { type: Number },
    tipAngleMode: { type: String },
    symmetryMode: { type: String },
    wrapMode: { type: String },
    airbrushRate: { type: Number },
    smudgeRate: { type: Number },
    smudgeWet: { type: Number },
    paintDualScale: { type: Number },
    paintDualStrength: { type: Number },
    pressureSizeCurve: { type: String },
    pressureAlphaCurve: { type: String },
    paintDualName: { type: String },
    paintTipName: { type: String },
    pressureResponse: { type: String },
    pencilAntialias: { type: Boolean },
    pencilPixelPerfect: { type: Boolean },
    curvePixelPerfect: { type: Boolean },
    stabilizerMode: { type: String },
    ropeLength: { type: Number },
    followStrength: { type: Number },
    blendMode: { type: String },
    accumulate: { type: Boolean },
    lineWidth: { type: Number },
    lineShape: { type: String },
    lineAntialias: { type: Boolean },
    curveWidth: { type: Number },
    curveShape: { type: String },
    curveAntialias: { type: Boolean },
  };

  declare tool: GnumarusCanvasTool;
  declare selectionDrawerFront: "rectselect" | "ellipse" | "lasso" | "colorselect";
  declare selectionDrawerOpen: boolean;
  declare colorThreshold: number;
  declare colorContiguous: boolean;
  declare actionPaletteQuery: string;
  declare actionPaletteIndex: number;
  declare rotText: string;
  declare flipText: string;
  declare colorValue: string;
  declare zoomText: string;
  declare cursorText: string;
  declare canvasText: string;
  declare projectName: string;
  declare dirty: boolean;
  declare statusMessage: string;
  declare fileMenuOpen: boolean;
  declare editMenuOpen: boolean;
  declare helpMenuOpen: boolean;
  declare webglError: string;
  declare fsSupported: boolean;
  declare newWidth: number;
  declare newHeight: number;
  declare newPreset: string;
  declare newStorageFormat: GnumarusStorageFormat;
  declare newStorageLossless: boolean;
  declare newStorageQuality: number;
  declare resizeWidth: number;
  declare resizeHeight: number;
  declare resizingLayerId: string | null;
  declare checkerMode: GnumarusCheckerMode;
  declare checkerSizeX: number;
  declare checkerSizeY: number;
  declare gridMinZoom: number;
  declare gridOpacity: number;
  declare rotationStepDeg: number;
  declare zoomMinPercent: number;
  declare floatingActive: boolean;
  declare backgroundMode: GnumarusBackgroundMode;
  declare backgroundColor: string;
  declare previewOpen: boolean;
  declare previewZoom: number;
  declare previewX: number;
  declare previewY: number;
  declare canUndo: boolean;
  declare canRedo: boolean;
  declare layers: GnumarusLayerInfo[];
  declare activeLayerId: string;
  declare layerText: string;
  declare frameText: string;
  declare renamingId: string | null;
  declare contextMenuLayerId: string | null;
  declare contextMenuX: number;
  declare contextMenuY: number;
  declare matrixMenu:
    | { kind: "cell"; layerId: string; frame: number; x: number; y: number }
    | { kind: "frame"; frame: number; x: number; y: number }
    | { kind: "frames"; frames: number[]; x: number; y: number }
    | { kind: "layer"; layerId: string; x: number; y: number }
    | null;
  declare contentPickerTarget: { layerId: string; frame: number } | null;
  declare texturePickerContentId: string | null;
  declare fitTextureTarget: { kind: "single"; textureId: string } | { kind: "all" } | null;
  declare fitThreshold: number;
  declare checkerColorA: string;
  declare checkerColorB: string;
  declare defaultFrameDuration: number;
  declare durationTargetFrame: number | null;
  declare durationValue: number | null;
  declare animationInput: string;
  declare animationDeleteTarget: string | null;
  declare animationError: string | null;
  declare exportFrame: number;
  declare exportFormat: string;
  declare exportFormats: GnumarusStillFormat[];
  declare exportQuality: number;
  declare exportJxlLossless: boolean;
  declare exportWebpLossless: boolean;
  declare exportAnimation: string;
  declare exportAnimatedFormat: string;
  declare exportAnimatedQuality: number;
  declare exportAnimatedJxlLossless: boolean;
  declare exportAnimatedWebpLossless: boolean;
  declare exportSheetLayout: string;
  declare exportSheetFormat: string;
  declare exportSheetCount: number;
  declare exportSheetQuality: number;
  declare exportSheetJxlLossless: boolean;
  declare exportSheetWebpLossless: boolean;
  declare playing: boolean;
  declare uiHidden: boolean;
  declare toastMessage: string;
  declare toastDurationSec: number;
  declare locale: GnumarusLocaleSetting;
  declare fitDefaultThreshold: number;
  declare storageLossless: boolean;
  declare storageQuality: number;
  declare storageFormat: GnumarusStorageFormat;
  declare storagePngLevel: number;
  declare storageJpegQuality: number;
  declare storageProjectFile: GnumarusProjectFileFormat;
  declare brushQuality: number;
  declare importCleanup: GnumarusImportCleanup;
  declare expandStep: number;
  declare renamingFrame: number | null;
  declare selectedFrames: number[];
  declare deleteFramesTarget: number[] | null;
  /** Anchor frame for Shift+click range selection (not reactive by itself). */
  private frameAnchor: number | null = null;
  declare brushSize: number;
  declare brushShape: GnumarusBrushShape;
  declare presetName: string;
  declare brushPresets: GnumarusBrushPreset[];
  declare brushTipKind: GnumarusBrushTipKind;
  declare brushHardness: number;
  declare brushSpacing: number;
  declare brushFlow: number;
  declare paintFuzzy: number;
  declare paintGrainStrength: number;
  declare paintGrainScale: number;
  declare tiltSizeAmount: number;
  declare speedFadeAmount: number;
  declare tipAngleMode: GnumarusTipAngleMode;
  declare symmetryMode: GnumarusSymmetryMode;
  declare wrapMode: GnumarusWrapMode;
  declare airbrushRate: number;
  declare smudgeRate: number;
  declare smudgeWet: number;
  declare pressureSizeCurve: GnumarusPressureCurve;
  declare pressureAlphaCurve: GnumarusPressureCurve;
  declare paintDualName: string;
  declare paintDualScale: number;
  declare paintDualStrength: number;
  declare paintTipName: string;
  declare pressureResponse: GnumarusPressureResponse;
  declare pencilAntialias: boolean;
  declare pencilPixelPerfect: boolean;
  declare curvePixelPerfect: boolean;
  declare stabilizerMode: GnumarusStabilizerMode;
  declare ropeLength: number;
  declare followStrength: number;
  declare blendMode: GnumarusBlendMode;
  declare accumulate: boolean;
  declare lineWidth: number;
  declare lineShape: GnumarusBrushShape;
  declare lineAntialias: boolean;
  declare curveWidth: number;
  declare curveShape: GnumarusBrushShape;
  declare curveAntialias: boolean;

  private engine: GnumarusCanvasEngine | null = null;
  private directoryHandle: GnumarusDirectoryHandle | null = null;
  private playTimer: number | null = null;
  private playbackAnimation: GnumarusNamedAnimation | null = null;
  private playbackIndex = 0;
  private playbackDirection: 1 | -1 = 1;
  private toastTimer: number | null = null;

  private actionRegistry = new GnumarusActionRegistry();

  constructor() {
    super();
    this.tool = "pencil";
    this.selectionDrawerFront = "rectselect";
    this.selectionDrawerOpen = false;
    this.colorThreshold = 10;
    this.colorContiguous = true;
    this.actionPaletteQuery = "";
    this.actionPaletteIndex = 0;
    this.registerActions();
    this.colorValue = "#000000";
    this.zoomText = "800%";
    this.rotText = "0°";
    this.flipText = "";
    this.cursorText = "-";
    this.canvasText = "64 x 64";
    this.projectName = "Untitled";
    this.dirty = false;
    this.statusMessage = tr("status.ready");
    this.fileMenuOpen = false;
    this.editMenuOpen = false;
    this.helpMenuOpen = false;
    this.webglError = "";
    this.fsSupported = true;
    this.newWidth = 64;
    this.newHeight = 64;
    this.newPreset = "";
    this.newStorageFormat = DEFAULT_STORAGE_SETTINGS.format;
    this.newStorageLossless = DEFAULT_STORAGE_SETTINGS.lossless;
    this.newStorageQuality = DEFAULT_STORAGE_SETTINGS.quality;
    this.resizeWidth = 64;
    this.resizeHeight = 64;
    this.resizingLayerId = null;
    this.checkerMode = DEFAULT_CHECKER_SETTINGS.mode;
    this.checkerSizeX = DEFAULT_CHECKER_SETTINGS.sizeX;
    this.checkerSizeY = DEFAULT_CHECKER_SETTINGS.sizeY;
    this.gridMinZoom = DEFAULT_GRID_SETTINGS.minZoom;
    this.gridOpacity = DEFAULT_GRID_SETTINGS.opacityPercent;
    this.rotationStepDeg = DEFAULT_ROTATION_SETTINGS.stepDeg;
    this.zoomMinPercent = DEFAULT_ZOOM_SETTINGS.minZoomPercent;
    this.floatingActive = false;
    this.backgroundMode = DEFAULT_BACKGROUND_SETTINGS.mode;
    this.backgroundColor = DEFAULT_BACKGROUND_SETTINGS.color;
    this.previewOpen = false;
    this.previewZoom = 4;
    this.previewX = 0;
    this.previewY = 0;
    this.canUndo = false;
    this.canRedo = false;
    this.layers = [];
    this.activeLayerId = "";
    this.layerText = "-";
    this.frameText = tr("frame.label", { frame: 1, count: 1, name: "F1" });
    this.renamingId = null;
    this.contextMenuLayerId = null;
    this.contextMenuX = 0;
    this.contextMenuY = 0;
    this.matrixMenu = null;
    this.contentPickerTarget = null;
    this.texturePickerContentId = null;
    this.fitTextureTarget = null;
    this.fitThreshold = 0;
    this.checkerColorA = DEFAULT_CHECKER_SETTINGS.colorA;
    this.checkerColorB = DEFAULT_CHECKER_SETTINGS.colorB;
    this.defaultFrameDuration = DEFAULT_ANIMATION_FRAME_DURATION;
    this.durationTargetFrame = null;
    this.durationValue = null;
    this.animationInput = "";
    this.animationError = null;
    this.animationDeleteTarget = null;
    this.exportFrame = 1;
    this.exportFormat = "image/png";
    this.exportFormats = [];
    this.exportQuality = GNUMARUS_DEFAULT_STILL_QUALITY;
    this.exportJxlLossless = true;
    this.exportWebpLossless = true;
    this.exportAnimation = "";
    this.exportAnimatedFormat = "gif";
    this.exportAnimatedQuality = GNUMARUS_DEFAULT_STILL_QUALITY;
    this.exportAnimatedJxlLossless = true;
    this.exportAnimatedWebpLossless = true;
    this.exportSheetLayout = "line";
    this.exportSheetFormat = "image/png";
    this.exportSheetCount = 2;
    this.exportSheetQuality = GNUMARUS_DEFAULT_STILL_QUALITY;
    this.exportSheetJxlLossless = true;
    this.exportSheetWebpLossless = true;
    this.playing = false;
    this.playTimer = null;
    this.uiHidden = false;
    this.toastMessage = "";
    this.toastDurationSec = DEFAULT_TOAST_SETTINGS.durationSec;
    this.locale = DEFAULT_LOCALE_SETTINGS.locale;
    this.fitDefaultThreshold = DEFAULT_FIT_SETTINGS.alphaThreshold;
    this.storageLossless = DEFAULT_STORAGE_SETTINGS.lossless;
    this.storageQuality = DEFAULT_STORAGE_SETTINGS.quality;
    this.storageFormat = DEFAULT_STORAGE_SETTINGS.format;
    this.storagePngLevel = DEFAULT_STORAGE_SETTINGS.pngLevel;
    this.storageJpegQuality = DEFAULT_STORAGE_SETTINGS.jpgQuality;
    this.storageProjectFile = DEFAULT_STORAGE_SETTINGS.projectFile;
    this.brushQuality = DEFAULT_STORAGE_SETTINGS.brushQuality;
    this.importCleanup = DEFAULT_IMPORT_CLEANUP;
    this.expandStep = DEFAULT_EXPAND_SETTINGS.step;
    this.renamingFrame = null;
    this.selectedFrames = [];
    this.deleteFramesTarget = null;
    this.frameAnchor = null;
    this.brushSize = 1;
    this.brushShape = "circle";
    this.presetName = "";
    this.brushPresets = [];
    this.brushTipKind = "pixel";
    this.brushHardness = DEFAULT_BRUSH_HARDNESS;
    this.brushSpacing = DEFAULT_BRUSH_SPACING;
    this.brushFlow = DEFAULT_BRUSH_FLOW;
    this.paintFuzzy = DEFAULT_PAINT_FUZZY;
    this.paintGrainStrength = DEFAULT_PAINT_GRAIN_STRENGTH;
    this.paintGrainScale = DEFAULT_PAINT_GRAIN_SCALE;
    this.tiltSizeAmount = DEFAULT_PAINT_DYNAMICS_AMOUNT;
    this.speedFadeAmount = DEFAULT_PAINT_DYNAMICS_AMOUNT;
    this.tipAngleMode = "none";
    this.symmetryMode = "off";
    this.wrapMode = "off";
    this.airbrushRate = DEFAULT_AIRBRUSH_RATE;
    this.smudgeRate = DEFAULT_PAINT_SMUDGE_RATE;
    this.smudgeWet = DEFAULT_PAINT_SMUDGE_WET;
    this.pressureSizeCurve = "linear";
    this.pressureAlphaCurve = "linear";
    this.paintDualName = "";
    this.paintDualScale = DEFAULT_PAINT_DUAL_SCALE;
    this.paintDualStrength = DEFAULT_PAINT_DUAL_STRENGTH;
    this.paintTipName = "";
    this.pressureResponse = "none";
    this.pencilAntialias = false;
    this.pencilPixelPerfect = false;
    this.curvePixelPerfect = false;
    this.stabilizerMode = GNUMARUS_DEFAULT_STABILIZER_MODE;
    this.ropeLength = GNUMARUS_DEFAULT_ROPE_LENGTH;
    this.followStrength = GNUMARUS_DEFAULT_FOLLOW_STRENGTH;
    this.blendMode = "normal";
    this.accumulate = true;
    this.lineWidth = 1;
    this.lineShape = "circle";
    this.lineAntialias = false;
    this.curveWidth = 1;
    this.curveShape = "circle";
    this.curveAntialias = false;
  }

  render() {
    return html`
      <div class="menubar" ?hidden=${this.uiHidden}>
        <div class="menu">
          <button
            class=${this.fileMenuOpen ? "active" : ""}
            @click=${(): void => this.toggleMenu("file")}
            @mouseenter=${(): void => this.hoverMenu("file")}
          >
            ${tr("menu.file")}
          </button>
          ${this.fileMenuOpen
            ? html`
                <div class="dropdown">
                  <button @click=${(): void => void this.runAction("new-project")}>${tr("menu.newProject")}</button>
                  <button @click=${(): void => void this.runAction("open-project")}>${tr("menu.openProject")}</button>
                  <button title=${tr("menu.saveTitle")} @click=${(): void => void this.runAction("save-project")}>${tr("menu.saveProject")}</button>
                  <button @click=${(): void => void this.runAction("import")}>${tr("menu.import")}</button>
                  <button @click=${(): void => void this.runAction("export")}>${tr("menu.export")}</button>
                </div>
              `
            : html``}
        </div>
        <div class="menu">
          <button
            class=${this.editMenuOpen ? "active" : ""}
            @click=${(): void => this.toggleMenu("edit")}
            @mouseenter=${(): void => this.hoverMenu("edit")}
          >
            ${tr("menu.edit")}
          </button>
          ${this.editMenuOpen
            ? html`
                <div class="dropdown">
                  <button ?disabled=${!this.canUndo} @click=${(): void => this.doUndo()}>${tr("menu.undo")}</button>
                  <button ?disabled=${!this.canRedo} @click=${(): void => this.doRedo()}>${tr("menu.redo")}</button>
                  <button @click=${(): void => this.openSettingsDialog()}>${tr("menu.settings")}</button>
                  <button
                    @click=${(): void => {
                      this.runAction("reset-canvas-transform");
                    }}
                  >
                    ${tr("menu.resetCanvasTransform")}
                  </button>
                </div>
              `
            : html``}
        </div>
        <div class="menu">
          <button
            class=${this.helpMenuOpen ? "active" : ""}
            @click=${(): void => this.toggleMenu("help")}
            @mouseenter=${(): void => this.hoverMenu("help")}
          >
            ${tr("menu.help")}
          </button>
          ${this.helpMenuOpen
            ? html`
                <div class="dropdown">
                  <button @click=${(): void => this.openShortcutsDialog()}>${tr("menu.shortcuts")}</button>
                  <button @click=${(): void => this.openSourceCode()}>${tr("menu.sourceCode")}</button>
                </div>
              `
            : html``}
        </div>
        <span class="app-title">Gnumaru's Painting and Animation App${this.dirty ? tr("app.modified") : ""}</span>
      </div>
      ${this.renderEditorOptions()}
      ${this.renderToolOptions()}
      <div class="body">
        <div class="toolbar" ?hidden=${this.uiHidden}>
          <button
            class=${this.tool === "pencil" ? "active" : ""}
            title=${tr("tool.pencilHint")}
            aria-label=${tr("tool.pencil")}
            @click=${(): void => {
              this.tool = "pencil";
              this.engine?.setTool("pencil");
            }}
          >
            <span class="tool-icon">✎</span>
          </button>
          <button
            class=${this.tool === "loupe" ? "active" : ""}
            title=${tr("tool.loupeHint")}
            aria-label=${tr("tool.loupe")}
            @click=${(): void => {
              this.tool = "loupe";
              this.engine?.setTool("loupe");
            }}
          >
            <span class="tool-icon">⌕</span>
          </button>
          <button
            class=${this.tool === "bucket" ? "active" : ""}
            title=${tr("tool.bucketHint")}
            aria-label=${tr("tool.bucket")}
            @click=${(): void => {
              this.tool = "bucket";
              this.engine?.setTool("bucket");
            }}
          >
            <span class="tool-icon"
              ><svg
                viewBox="0 0 16 16"
                width="13"
                height="13"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M2.8 6.4h10.4l-1.6 7H4.4L2.8 6.4z" />
                <path d="M2 6.4h12" />
                <path d="M11.6 1.2c.7 1 1.4 1.9 1.4 2.8a1.4 1.4 0 1 1-2.8 0c0-.9.7-1.8 1.4-2.8z" />
              </svg>
            </span>
          </button>
          <button
            class=${this.tool === "eyedropper" ? "active" : ""}
            title=${tr("tool.eyedropperHint")}
            aria-label=${tr("tool.eyedropper")}
            @click=${(): void => {
              this.tool = "eyedropper";
              this.engine?.setTool("eyedropper");
            }}
          >
            <span class="tool-icon"
              ><svg
                viewBox="0 0 16 16"
                width="13"
                height="13"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M8 1.8S4.8 6.2 4.8 9.4a3.2 3.2 0 0 0 6.4 0C11.2 6.2 8 1.8 8 1.8z" />
              </svg>
            </span>
          </button>
          <button
            class=${this.tool === "line" ? "active" : ""}
            title=${tr("tool.lineHint")}
            aria-label=${tr("tool.line")}
            @click=${(): void => {
              this.tool = "line";
              this.engine?.setTool("line");
            }}
          >
            <span class="tool-icon">╲</span>
          </button>
          <button
            class=${this.tool === "curve" ? "active" : ""}
            title=${tr("tool.curveHint")}
            aria-label=${tr("tool.curve")}
            @click=${(): void => {
              this.tool = "curve";
              this.engine?.setTool("curve");
            }}
          >
            <span class="tool-icon">〜</span>
          </button>
          <div class="tool-drawer" data-testid="selection-drawer">
            <button
              class=${this.tool === this.selectionDrawerFront ? "active" : ""}
              title=${this.drawerFrontHint()}
              aria-label=${this.drawerFrontName()}
              @click=${(): void => this.selectDrawerFront(this.selectionDrawerFront)}
              @contextmenu=${(event: MouseEvent): void => {
                event.preventDefault();
                this.selectionDrawerOpen = !this.selectionDrawerOpen;
              }}
            >
              <span class="tool-icon">${this.drawerFrontGlyph()}</span>
            </button>
            ${this.selectionDrawerOpen
              ? html`<div class="tool-flyout" data-testid="selection-flyout">
                  ${(
                    [
                      ["rectselect", "▭"],
                      ["ellipse", "◯"],
                      ["lasso", "〰"],
                      ["colorselect", "✦"],
                    ] as const
                  ).map(
                    ([name, glyph]) => html`<button
                      class=${this.selectionDrawerFront === name ? "active" : ""}
                      title=${this.drawerToolHint(name)}
                      aria-label=${this.drawerToolName(name)}
                      @click=${(): void => this.selectDrawerFront(name, true)}
                    >
                      <span class="tool-icon">${glyph}</span>
                    </button>`,
                  )}
                </div>
                <div
                  class="drawer-blocker"
                  @click=${(): void => {
                    this.selectionDrawerOpen = false;
                  }}
                  @contextmenu=${(event: Event): void => {
                    event.preventDefault();
                    this.selectionDrawerOpen = false;
                  }}
                ></div>`
              : html``}
          </div>
          <button
            class=${this.tool === "destransform" ? "active" : ""}
            title=${tr("tool.destransformHint")}
            aria-label=${tr("tool.destransform")}
            @click=${(): void => {
              this.tool = "destransform";
              this.engine?.setTool("destransform");
            }}
          >
            <span class="tool-icon">✛</span>
          </button>
          <button
            class=${this.tool === "transform" ? "active" : ""}
            title=${tr("tool.transformHint")}
            aria-label=${tr("tool.transform")}
            @click=${(): void => {
              this.tool = "transform";
              this.engine?.setTool("transform");
            }}
          >
            <span class="tool-icon">⤢</span>
          </button>
          <button
            class=${this.tool === "transform3d" ? "active" : ""}
            title=${tr("tool.transform3dHint")}
            aria-label=${tr("tool.transform3d")}
            @click=${(): void => {
              this.tool = "transform3d";
              this.engine?.setTool("transform3d");
            }}
          >
            <span class="tool-icon">⟳</span>
          </button>
          <button
            class=${this.tool === "destransform3d" ? "active" : ""}
            title=${tr("tool.destransform3dHint")}
            aria-label=${tr("tool.destransform3d")}
            @click=${(): void => {
              this.tool = "destransform3d";
              this.engine?.setTool("destransform3d");
            }}
          >
            <span class="tool-icon">⟲</span>
          </button>
          <gnumarus-color-picker
            id="pencilColor"
            .value=${this.colorValue}
            model="hsl"
            @gnumarus-color-change=${(event: Event): void => {
              const detail = (event as CustomEvent<{ value?: unknown }>).detail;
              if (typeof detail?.value === "string") {
                this.setPencilColor(detail.value);
              }
            }}
          ></gnumarus-color-picker>
          <button
            class=${this.previewOpen ? "active" : ""}
            title=${tr("preview.hint")}
            aria-label=${tr("preview.title")}
            @click=${(): void => {
              this.togglePreview();
            }}
          >
            <span class="tool-icon">⊞</span>
          </button>
        </div>
        <div class="canvas-host" id="canvasHost">
          ${this.previewOpen
            ? html`
                <div
                  class="preview-window"
                  style="left: ${this.previewX}px; top: ${this.previewY}px;"
                  data-testid="final-preview"
                >
                  <div
                    class="preview-header"
                    @pointerdown=${(event: PointerEvent): void => this.onPreviewDragStart(event)}
                  >
                    <span>${tr("preview.title")}</span>
                    <span class="spacer"></span>
                    <button aria-label=${tr("preview.close")} title=${tr("preview.close")} @click=${(): void => this.togglePreview()}>
                      ×
                    </button>
                  </div>
                  <div class="preview-toolbar">
                    <button aria-label=${tr("preview.zoomOut")} title=${tr("preview.zoomOut")} @click=${(): void => this.zoomPreview(0.5)}>
                      −
                    </button>
                    <span>${Math.round(this.previewZoom * 100)}%</span>
                    <button aria-label=${tr("preview.zoomIn")} title=${tr("preview.zoomIn")} @click=${(): void => this.zoomPreview(2)}>
                      +
                    </button>
                    <button aria-label=${tr("preview.resetZoom")} title=${tr("preview.resetZoom")} @click=${(): void => this.resetPreviewZoom()}>
                      1:1
                    </button>
                  </div>
                  <div
                    class="preview-body"
                    @wheel=${(event: WheelEvent): void => {
                      event.preventDefault();
                      this.zoomPreview(event.deltaY < 0 ? 1.25 : 0.8);
                    }}
                    @pointerdown=${(event: PointerEvent): void => this.onPreviewPanStart(event)}
                    @mousedown=${(event: MouseEvent): void => {
                      if (event.button === 1) {
                        event.preventDefault();
                      }
                    }}
                    @contextmenu=${(event: Event): void => {
                      event.preventDefault();
                    }}
                  >
                    <canvas id="previewCanvas"></canvas>
                  </div>
                </div>
              `
            : html``}
          ${this.toastMessage !== ""
            ? html`<div class="toast" data-testid="toast">${this.toastMessage}</div>`
            : html``}
        </div>
        <aside class="layers-panel" aria-label=${tr("layer.layers")} ?hidden=${this.uiHidden}>
          <div class="layers-header">
            <span>${tr("layer.layers")}</span>
            <button aria-label=${tr("layer.add")} title=${tr("layer.add")} @click=${(): void => this.onAddLayer()}>+</button>
          </div>
          <div class="layers-list">
            ${[...this.layers].reverse().map(
              (layer, displayIndex, displayLayers) => html`
                <div
                  class="layer-row ${layer.id === this.activeLayerId ? "active" : ""}"
                  data-layer-id=${layer.id}
                  @click=${(): void => this.onSelectLayer(layer.id)}
                  @contextmenu=${(event: MouseEvent): void => {
                    event.preventDefault();
                    this.openLayerMenu(layer.id, event.clientX, event.clientY);
                  }}
                >
                  <div class="layer-top">
                    <input
                      type="checkbox"
                      aria-label=${tr("layer.toggleVisibility")}
                      .checked=${layer.visible}
                      @click=${(event: Event): void => event.stopPropagation()}
                      @change=${(event: Event): void => {
                        const target = event.target as HTMLInputElement | null;
                        if (target !== null) {
                          this.onToggleVisible(layer.id, target.checked);
                        }
                      }}
                    />
                    ${this.renamingId === layer.id
                      ? html`
                          <input
                            class="layer-rename"
                            .value=${layer.name}
                            @click=${(event: Event): void => event.stopPropagation()}
                            @keydown=${(event: KeyboardEvent): void => {
                              if (event.key === "Enter") {
                                this.onRenameCommit(layer.id);
                              } else if (event.key === "Escape") {
                                this.onRenameCancel();
                              }
                              event.stopPropagation();
                            }}
                            @blur=${(): void => this.onRenameCommit(layer.id)}
                          />
                        `
                      : html`
                          <span class="layer-name" @dblclick=${(): void => this.onRenameStart(layer.id)}>
                            ${layer.name}
                          </span>
                          <span class="layer-dims">${layer.width}×${layer.height}</span>
                        `}
                    <button
                      aria-label=${tr("layer.moveUp")}
                      title=${tr("layer.moveUpTitle")}
                      ?disabled=${displayIndex === 0}
                      @click=${(event: Event): void => {
                        event.stopPropagation();
                        this.onMoveLayer(layer.id, "up");
                      }}
                    >
                      ▲
                    </button>
                    <button
                      aria-label=${tr("layer.moveDown")}
                      title=${tr("layer.moveDownTitle")}
                      ?disabled=${displayIndex === displayLayers.length - 1}
                      @click=${(event: Event): void => {
                        event.stopPropagation();
                        this.onMoveLayer(layer.id, "down");
                      }}
                    >
                      ▼
                    </button>
                    <button
                      aria-label=${tr("layer.delete")}
                      title=${tr("layer.delete")}
                      ?disabled=${this.layers.length <= 1}
                      @click=${(event: Event): void => {
                        event.stopPropagation();
                        this.onRemoveLayer(layer.id);
                      }}
                    >
                      ×
                    </button>
                  </div>
                  <div class="layer-opacity">
                    <span>${tr("layer.opacity")}</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      aria-label=${tr("layer.opacityAria")}
                      .value=${String(Math.round(layer.opacity * 100))}
                      @input=${(event: Event): void => {
                        const target = event.target as HTMLInputElement | null;
                        if (target !== null) {
                          this.onOpacityInput(layer.id, Number(target.value) / 100);
                        }
                      }}
                    />
                  </div>
                  <div class="layer-channels">
                    <span>${tr("layer.lock")}</span>
                    <button
                      class=${layer.lockedChannels.r ? "active" : ""}
                      title=${layer.lockedChannels.r ? tr("layer.unlockChannel", { channel: tr("channel.red") }) : tr("layer.lockChannel", { channel: tr("channel.red") })}
                      aria-label=${tr("layer.lockChannel", { channel: tr("channel.red") })}
                      aria-pressed=${layer.lockedChannels.r ? "true" : "false"}
                      @click=${(): void => {
                        this.onToggleChannelLock(layer.id, "r");
                      }}
                    >
                      R
                    </button>
                    <button
                      class=${layer.lockedChannels.g ? "active" : ""}
                      title=${layer.lockedChannels.g ? tr("layer.unlockChannel", { channel: tr("channel.green") }) : tr("layer.lockChannel", { channel: tr("channel.green") })}
                      aria-label=${tr("layer.lockChannel", { channel: tr("channel.green") })}
                      aria-pressed=${layer.lockedChannels.g ? "true" : "false"}
                      @click=${(): void => {
                        this.onToggleChannelLock(layer.id, "g");
                      }}
                    >
                      G
                    </button>
                    <button
                      class=${layer.lockedChannels.b ? "active" : ""}
                      title=${layer.lockedChannels.b ? tr("layer.unlockChannel", { channel: tr("channel.blue") }) : tr("layer.lockChannel", { channel: tr("channel.blue") })}
                      aria-label=${tr("layer.lockChannel", { channel: tr("channel.blue") })}
                      aria-pressed=${layer.lockedChannels.b ? "true" : "false"}
                      @click=${(): void => {
                        this.onToggleChannelLock(layer.id, "b");
                      }}
                    >
                      B
                    </button>
                    <button
                      class=${layer.lockedChannels.a ? "active" : ""}
                      title=${layer.lockedChannels.a ? tr("layer.unlockChannel", { channel: tr("channel.alpha") }) : tr("layer.lockChannel", { channel: tr("channel.alpha") })}
                      aria-label=${tr("layer.lockChannel", { channel: tr("channel.alpha") })}
                      aria-pressed=${layer.lockedChannels.a ? "true" : "false"}
                      @click=${(): void => {
                        this.onToggleChannelLock(layer.id, "a");
                      }}
                    >
                      A
                    </button>
                  </div>
                  <div class="layer-resize">
                    <span>${tr("layer.size")}</span>
                    <button
                      aria-label=${tr("layer.resize")}
                      title=${tr("layer.resizeHint")}
                      @click=${(event: Event): void => {
                        event.stopPropagation();
                        this.openResizeDialog(layer.id);
                      }}
                    >
                      ${tr("layer.resizeButton", { dims: `${layer.width}×${layer.height}` })}
                    </button>
                  </div>
                </div>
              `,
            )}
          </div>
        </aside>
        ${this.contextMenuLayerId !== null
          ? html`
              <div class="context-blocker" @click=${(): void => this.closeLayerMenu()} @contextmenu=${(
                event: Event,
              ): void => {
                event.preventDefault();
                this.closeLayerMenu();
              }}></div>
              <div
                class="context-menu"
                style="left: ${this.contextMenuX}px; top: ${this.contextMenuY}px;"
              >
                <button
                  ?disabled=${this.layers.length > 0 && this.layers[0]?.id === this.contextMenuLayerId}
                  @click=${(): void => {
                    if (this.contextMenuLayerId !== null) {
                      this.onMergeDown(this.contextMenuLayerId);
                    }
                  }}
                >
                  ${tr("ctx.mergeDown")}
                </button>
                <button
                  @click=${(): void => {
                    if (this.contextMenuLayerId !== null) {
                      this.onAddLayerAbove(this.contextMenuLayerId);
                    }
                  }}
                >
                  ${tr("ctx.addAbove")}
                </button>
                <button
                  @click=${(): void => {
                    if (this.contextMenuLayerId !== null) {
                      this.onAddLayerBelow(this.contextMenuLayerId);
                    }
                  }}
                >
                  ${tr("ctx.addBelow")}
                </button>
                <button
                  @click=${(): void => {
                    if (this.contextMenuLayerId !== null) {
                      this.onResetLayerTransform(this.contextMenuLayerId);
                    }
                  }}
                >
                  ${tr("ctx.resetTransform")}
                </button>
                <button
                  ?disabled=${this.contextMenuLayerId === null ||
                  this.engine?.getCellTextureId(this.contextMenuLayerId, this.engine.getCurrentFrame()) === null}
                  @click=${(): void => {
                    if (this.contextMenuLayerId !== null) {
                      this.onOpenFitTextureFromLayer(this.contextMenuLayerId);
                    }
                  }}
                >
                  ${tr("ctx.fitTexture")}
                </button>
                <button
                  ?disabled=${this.contextMenuLayerId === null ||
                  this.engine?.getCellTextureId(this.contextMenuLayerId, this.engine.getCurrentFrame()) === null}
                  @click=${(): void => {
                    if (this.contextMenuLayerId !== null) {
                      this.onCropCellToCanvasFromLayer(this.contextMenuLayerId);
                    }
                  }}
                >
                  ${tr("ctx.cropCanvas")}
                </button>
                <button
                  ?disabled=${this.contextMenuLayerId === null ||
                  this.engine?.getCellTextureId(this.contextMenuLayerId, this.engine.getCurrentFrame()) === null}
                  @click=${(): void => {
                    if (this.contextMenuLayerId !== null) {
                      this.onResizeCellToCanvasFromLayer(this.contextMenuLayerId);
                    }
                  }}
                >
                  ${tr("ctx.resizeCanvas")}
                </button>
              </div>
            `
          : html``}
      </div>
      ${this.renderAnimationMatrix()}
      ${this.renderMatrixMenu()}
      <div class="statusbar" ?hidden=${this.uiHidden}>
        <span>${this.toolDisplayName(this.tool)}</span>
        <span>${this.colorValue}</span>
        <span>${this.cursorText}</span>
        <span>${this.canvasText}</span>
        <span>${this.layerText}</span>
        <span>${this.frameText}</span>
        <span>${this.zoomText}</span>
        <span>${this.rotText}</span>
        <span>${this.flipText}</span>
        <span>${this.projectName}</span>
        <span class="spacer"></span>
        ${this.webglError !== "" ? html`<span class="error">${this.webglError}</span>` : html``}
        <span>${this.statusMessage}</span>
      </div>
      <dialog id="newDialog">
        <h3>${tr("dialog.new")}</h3>
        <label
          >${tr("dialog.preset")}
          <select id="newPreset" .value=${this.newPreset} @change=${(): void => this.applyNewPresetFromDialog()}>
            <option value="">${tr("dialog.custom")}</option>
            ${GNUMARUS_NEW_PROJECT_PRESETS.map(
              (preset) => html`<option value=${preset.name}>${preset.name}</option>`,
            )}
          </select>
        </label>
        <label
          >${tr("dialog.width")}
          <input
            type="number"
            id="newWidth"
            min="1"
            max="16384"
            .value=${String(this.newWidth)}
            @input=${(): void => this.applyNewDimensionsFromDialog()}
        /></label>
        <label
          >${tr("dialog.height")}
          <input
            type="number"
            id="newHeight"
            min="1"
            max="16384"
            .value=${String(this.newHeight)}
            @input=${(): void => this.applyNewDimensionsFromDialog()}
        /></label>
        <label
          >${tr("dialog.textureFormat")}
          <select
            id="newStorageFormat"
            .value=${this.newStorageFormat}
            @change=${(): void => this.applyNewStorageFromDialog()}
          >
            <option value="png">PNG</option>
            <option value="webp">WebP</option>
            <option value="jxl">JPEG XL</option>
          </select>
        </label>
        <label
          >${tr("dialog.textureMode")}
          <select
            id="newStorageMode"
            .value=${this.newStorageLossless ? "lossless" : "lossy"}
            @change=${(): void => this.applyNewStorageFromDialog()}
          >
            <option value="lossless">${tr("val.lossless")}</option>
            ${this.newStorageFormat === "png"
              ? html``
              : html`<option value="lossy">${tr("val.lossy")}</option>`}
          </select>
        </label>
        ${this.newStorageFormat !== "png" && !this.newStorageLossless
          ? html`<label
              >${tr("dialog.lossyQuality")}
              <input
                type="number"
                id="newStorageQuality"
                min="0"
                max="100"
                step="1"
                .value=${String(this.newStorageQuality)}
                @input=${(): void => this.applyNewStorageFromDialog()}
            /></label>`
          : html``}
        <div class="dialog-actions">
          <button @click=${(): void => this.closeNewDialog()}>${tr("btn.cancel")}</button>
          <button @click=${(): void => void this.createNew()}>${tr("btn.create")}</button>
        </div>
      </dialog>
      <dialog id="resizeDialog">
        <h3>${tr("dialog.resize")}</h3>
        <p>${tr("dialog.resizeHint")}</p>
        <label>${tr("dialog.width")} <input type="number" id="resizeWidth" min="1" max="1024" .value=${String(this.resizeWidth)} /></label>
        <label>${tr("dialog.height")} <input type="number" id="resizeHeight" min="1" max="1024" .value=${String(this.resizeHeight)} /></label>
        <div class="dialog-actions">
          <button @click=${(): void => this.closeResizeDialog()}>${tr("btn.cancel")}</button>
          <button @click=${(): void => this.confirmResize()}>${tr("btn.resize")}</button>
        </div>
      </dialog>
      <dialog id="fitTextureDialog">
        <h3>${tr("ctx.fitTexture")}</h3>
        <p>${tr("dialog.fitHint")}</p>
        <label
          >${tr("dialog.alphaThreshold")}
          <input type="number" id="fitThreshold" min="0" max="254" step="1" .value=${String(this.fitThreshold)} />
        </label>
        <div class="dialog-actions">
          <button @click=${(): void => this.closeFitTextureDialog()}>${tr("btn.cancel")}</button>
          <button id="fitTextureOk" @click=${(): void => this.confirmFitTexture()}>${tr("btn.ok")}</button>
        </div>
      </dialog>
      <dialog id="shortcutsDialog">
        <h3>${tr("dialog.shortcuts")}</h3>
        <div class="shortcuts-list">
          ${gnumarusShortcuts().map(
            (section) => html`
              <h4>${section.title}</h4>
              <table>
                ${section.entries.map(
                  (entry) => html`
                    <tr>
                      <td><kbd>${entry.keys}</kbd></td>
                      <td>${entry.action}</td>
                    </tr>
                  `,
                )}
              </table>
            `,
          )}
        </div>
        <div class="dialog-actions">
          <button @click=${(): void => this.closeShortcutsDialog()}>${tr("btn.close")}</button>
        </div>
      </dialog>
      <dialog id="actionPaletteDialog" @close=${(): void => this.closeActionPalette()}>
        <h3>${tr("palette.title")}</h3>
        <input
          type="text"
          id="actionPaletteInput"
          data-testid="action-palette-input"
          placeholder=${tr("palette.placeholder")}
          autocomplete="off"
          spellcheck="false"
          aria-label=${tr("palette.searchLabel")}
          .value=${this.actionPaletteQuery}
          @input=${(event: Event): void => {
            this.actionPaletteQuery = (event.target as HTMLInputElement).value;
            this.actionPaletteIndex = 0;
          }}
          @keydown=${(event: KeyboardEvent): void => this.onActionPaletteKeyDown(event)}
        />
        ${((): unknown => {
          const results = this.paletteResults();
          if (results.length === 0) {
            return html`<p data-testid="action-palette-empty">${tr("palette.empty")}</p>`;
          }
          const selected = Math.min(this.actionPaletteIndex, results.length - 1);
          return html`<div class="action-palette-list" data-testid="action-palette-list" role="listbox">
            ${results.map(
              (action, index) => html`<button
                role="option"
                aria-selected=${index === selected ? "true" : "false"}
                data-testid="action-palette-item"
                data-action-id=${action.id}
                class=${index === selected ? "selected" : ""}
                title=${action.name}
                @click=${(): void => {
                  this.actionPaletteIndex = index;
                  this.executePaletteSelection();
                }}
                >${action.name}</button
              >`,
            )}
          </div>`;
        })()}
      </dialog>
      <dialog id="settingsDialog">
        <h3>${tr("dialog.settings")}</h3>
        <div class="settings-section">${tr("setting.background")}</div>
        <div class="setting-row">
          <label
            >${tr("setting.backgroundMode")}
            <select id="backgroundMode" .value=${this.backgroundMode} @change=${(): void => this.applyBackgroundFromDialog()}>
              <option value="checkerboard">${tr("setting.checkerboard")}</option>
              <option value="solid">${tr("setting.solidColor")}</option>
            </select>
          </label>
          ${this.backgroundMode !== DEFAULT_BACKGROUND_SETTINGS.mode
            ? html`<button
                class="reset-btn"
                aria-label=${tr("a11y.resetBackgroundMode")}
                title=${tr("a11y.resetToDefault")}
                @click=${(): void => this.resetBackgroundModeToDefault()}
              >
                ↻
              </button>`
            : html``}
        </div>
        ${this.backgroundMode === "solid"
          ? html`
              <div class="setting-row">
                <span>${tr("setting.solidColor")}</span>
                <gnumarus-color-picker
                  id="backgroundColor"
                  .value=${this.backgroundColor}
                  model="hsl"
                  @gnumarus-color-change=${(event: Event): void => {
                    const detail = (event as CustomEvent<{ value?: unknown }>).detail;
                    if (typeof detail?.value === "string") {
                      this.setBackgroundColor(detail.value);
                    }
                  }}
                ></gnumarus-color-picker>
                ${this.backgroundColor.toLowerCase() !== DEFAULT_BACKGROUND_SETTINGS.color.toLowerCase()
                  ? html`<button
                      class="reset-btn"
                      aria-label=${tr("a11y.resetBackgroundColor")}
                      title=${tr("a11y.resetToDefault")}
                      @click=${(): void => this.resetBackgroundColorToDefault()}
                    >
                      ↻
                    </button>`
                  : html``}
              </div>
            `
          : html``}
        ${this.backgroundMode === "checkerboard"
          ? html`
              <div class="settings-section">${tr("setting.checkerboard")}</div>
              <div class="setting-row">
                <label
                  >${tr("setting.checkerboardMode")}
                  <select
                    id="checkerMode"
                    .value=${this.checkerMode}
                    @change=${(): void => this.applyCheckerFromDialog()}
                  >
                    <option value="image">${tr("setting.checkerImage")}</option>
                    <option value="screen">${tr("setting.checkerScreen")}</option>
                  </select>
                </label>
                ${this.checkerMode !== DEFAULT_CHECKER_SETTINGS.mode
                  ? html`<button
                      class="reset-btn"
                      aria-label=${tr("a11y.resetCheckerMode")}
                      title=${tr("a11y.resetToDefault")}
                      @click=${(): void => this.resetCheckerModeToDefault()}
                    >
                      ↻
                    </button>`
                  : html``}
              </div>
              <div class="setting-row">
                <label
                  >${tr("setting.checkerWidth")}
                  <input
                    type="number"
                    id="checkerSizeX"
                    min="1"
                    max="128"
                    .value=${String(this.checkerSizeX)}
                    @input=${(): void => this.applyCheckerFromDialog()}
                  />
                </label>
                ${this.checkerSizeX !== DEFAULT_CHECKER_SETTINGS.sizeX
                  ? html`<button
                      class="reset-btn"
                      aria-label=${tr("a11y.resetCheckerWidth")}
                      title=${tr("a11y.resetToDefault")}
                      @click=${(): void => this.resetCheckerSizeXToDefault()}
                    >
                      ↻
                    </button>`
                  : html``}
              </div>
              <div class="setting-row">
                <label
                  >${tr("setting.checkerHeight")}
                  <input
                    type="number"
                    id="checkerSizeY"
                    min="1"
                    max="128"
                    .value=${String(this.checkerSizeY)}
                    @input=${(): void => this.applyCheckerFromDialog()}
                  />
                </label>
                ${this.checkerSizeY !== DEFAULT_CHECKER_SETTINGS.sizeY
                  ? html`<button
                      class="reset-btn"
                      aria-label=${tr("a11y.resetCheckerHeight")}
                      title=${tr("a11y.resetToDefault")}
                      @click=${(): void => this.resetCheckerSizeYToDefault()}
                    >
                      ↻
                    </button>`
                  : html``}
              </div>
              <div class="setting-row">
                <span>${tr("setting.checkerColorA")}</span>
                <gnumarus-color-picker
                  id="checkerColorA"
                  .value=${this.checkerColorA}
                  model="hsl"
                  @gnumarus-color-change=${(event: Event): void => {
                    const detail = (event as CustomEvent<{ value?: unknown }>).detail;
                    if (typeof detail?.value === "string") {
                      this.setCheckerColorA(detail.value);
                    }
                  }}
                ></gnumarus-color-picker>
                ${this.checkerColorA.toLowerCase() !== DEFAULT_CHECKER_SETTINGS.colorA.toLowerCase()
                  ? html`<button
                      class="reset-btn"
                      aria-label=${tr("a11y.resetCheckerColorA")}
                      title=${tr("a11y.resetToDefault")}
                      @click=${(): void => this.resetCheckerColorAToDefault()}
                    >
                      ↻
                    </button>`
                  : html``}
              </div>
              <div class="setting-row">
                <span>${tr("setting.checkerColorB")}</span>
                <gnumarus-color-picker
                  id="checkerColorB"
                  .value=${this.checkerColorB}
                  model="hsl"
                  @gnumarus-color-change=${(event: Event): void => {
                    const detail = (event as CustomEvent<{ value?: unknown }>).detail;
                    if (typeof detail?.value === "string") {
                      this.setCheckerColorB(detail.value);
                    }
                  }}
                ></gnumarus-color-picker>
                ${this.checkerColorB.toLowerCase() !== DEFAULT_CHECKER_SETTINGS.colorB.toLowerCase()
                  ? html`<button
                      class="reset-btn"
                      aria-label=${tr("a11y.resetCheckerColorB")}
                      title=${tr("a11y.resetToDefault")}
                      @click=${(): void => this.resetCheckerColorBToDefault()}
                    >
                      ↻
                    </button>`
                  : html``}
              </div>
            `
          : html``}
        <div class="settings-section">${tr("setting.pixelGrid")}</div>
        <div class="setting-row">
          <label
            >${tr("setting.gridMinZoom")}
            <input
              type="number"
              id="gridMinZoom"
              min="200"
              max="6400"
              step="50"
              .value=${String(Math.round(this.gridMinZoom * 100))}
              @input=${(): void => this.applyGridFromDialog()}
            />
          </label>
          ${Math.abs(this.gridMinZoom - DEFAULT_GRID_SETTINGS.minZoom) > 1e-9
            ? html`<button
                class="reset-btn"
                aria-label=${tr("a11y.resetGridMinZoom")}
                title=${tr("a11y.resetToDefault")}
                @click=${(): void => this.resetGridMinZoomToDefault()}
              >
                ↻
              </button>`
            : html``}
        </div>
        <div class="setting-row">
          <label
            >${tr("setting.gridOpacity")}
            <input
              type="number"
              id="gridOpacity"
              min="0"
              max="100"
              step="1"
              .value=${String(this.gridOpacity)}
              @input=${(): void => this.applyGridOpacityFromDialog()}
            />
          </label>
          ${this.gridOpacity !== DEFAULT_GRID_SETTINGS.opacityPercent
            ? html`<button
                class="reset-btn"
                aria-label=${tr("a11y.resetGridOpacity")}
                title=${tr("a11y.resetToDefault")}
                @click=${(): void => this.resetGridOpacityToDefault()}
              >
                ↻
              </button>`
            : html``}
        </div>
        <div class="settings-section">${tr("setting.canvasView")}</div>
        <div class="setting-row">
          <label
            >${tr("setting.rotationStep")}
            <input
              type="number"
              id="rotationStep"
              min="1"
              max="90"
              step="1"
              .value=${String(this.rotationStepDeg)}
              @input=${(): void => this.applyRotationFromDialog()}
            />
          </label>
          ${this.rotationStepDeg !== DEFAULT_ROTATION_SETTINGS.stepDeg
            ? html`<button
                class="reset-btn"
                aria-label=${tr("a11y.resetRotationStep")}
                title=${tr("a11y.resetToDefault")}
                @click=${(): void => this.resetRotationStepToDefault()}
              >
                ↻
              </button>`
            : html``}
        </div>
        <div class="setting-row">
          <label
            >${tr("setting.zoomMin")}
            <input
              type="number"
              id="zoomMinZoom"
              min="1"
              max="100"
              step="1"
              .value=${String(this.zoomMinPercent)}
              @input=${(): void => this.applyZoomMinFromDialog()}
            />
          </label>
          ${this.zoomMinPercent !== DEFAULT_ZOOM_SETTINGS.minZoomPercent
            ? html`<button
                class="reset-btn"
                aria-label=${tr("a11y.resetZoomMin")}
                title=${tr("a11y.resetToDefault")}
                @click=${(): void => this.resetZoomMinToDefault()}
              >
                ↻
              </button>`
            : html``}
        </div>
        <div class="settings-section">${tr("setting.animation")}</div>
        <div class="setting-row">
          <label
            >${tr("setting.defaultFrameDuration")}
            <input
              type="number"
              id="defaultFrameDuration"
              min="0.001"
              max="60"
              step="any"
              .value=${String(this.defaultFrameDuration)}
              @input=${(): void => this.applyDefaultFrameDurationFromDialog()}
              @change=${(): void => this.commitDefaultFrameDurationFromDialog()}
            />
          </label>
          ${this.defaultFrameDuration !== DEFAULT_ANIMATION_FRAME_DURATION
            ? html`<button
                class="reset-btn"
                aria-label=${tr("a11y.resetFrameDuration")}
                title=${tr("a11y.resetToDefault")}
                @click=${(): void => this.resetDefaultFrameDuration()}
              >
                ↻
              </button>`
            : html``}
        </div>
        <div class="settings-section">${tr("setting.interface")}</div>
        <div class="setting-row">
          <label>${tr("locale.language")}
            <select
              id="localeSelect"
              .value=${this.locale}
              @change=${(): void => this.applyLocaleFromDialog()}
            >
              <option value="system">${tr("locale.system")}</option>
              <option value="en">${tr("locale.english")}</option>
              <option value="pt-BR">${tr("locale.portuguese")}</option>
            </select>
          </label>
          ${this.locale !== DEFAULT_LOCALE_SETTINGS.locale
            ? html`<button
                class="reset-btn"
                aria-label=${tr("a11y.resetLanguage")}
                title=${tr("a11y.resetToDefault")}
                @click=${(): void => this.resetLocaleToDefault()}
              >
                ↻
              </button>`
            : html``}
        </div>
        <div class="setting-row">
          <label
            >${tr("setting.toastDuration")}
            <input
              type="number"
              id="toastDuration"
              min="0.5"
              max="2"
              step="0.1"
              .value=${String(this.toastDurationSec)}
              @input=${(): void => this.applyToastFromDialog()}
            />
          </label>
          ${Math.abs(this.toastDurationSec - DEFAULT_TOAST_SETTINGS.durationSec) > 1e-9
            ? html`<button
                class="reset-btn"
                aria-label=${tr("a11y.resetToast")}
                title=${tr("a11y.resetToDefault")}
                @click=${(): void => this.resetToastDurationToDefault()}
              >
                ↻
              </button>`
            : html``}
        </div>
        <div class="setting-row">
          <label
            >${tr("setting.fitThreshold")}
            <input
              type="number"
              id="fitDefaultThreshold"
              min="0"
              max="254"
              step="1"
              .value=${String(this.fitDefaultThreshold)}
              @input=${(): void => this.applyFitFromDialog()}
            />
          </label>
          ${this.fitDefaultThreshold !== DEFAULT_FIT_SETTINGS.alphaThreshold
            ? html`<button
                class="reset-btn"
                aria-label=${tr("a11y.resetFit")}
                title=${tr("a11y.resetToDefault")}
                @click=${(): void => this.resetFitToDefault()}
              >
                ↻
              </button>`
            : html``}
        </div>
        <div class="setting-row">
          <label>${tr("setting.projectFile")}
            <select
              id="storageProjectFile"
              .value=${this.storageProjectFile}
              @change=${(): void => this.applyStorageFromDialog()}
            >
              <option value="gpa">${tr("setting.projectFileGpa")}</option>
              <option value="json">${tr("setting.projectFileJson")}</option>
            </select>
          </label>
        </div>
        <div class="setting-row">
          <label>${tr("setting.textureFormat")}
            <select
              id="storageFormat"
              .value=${this.storageFormat}
              @change=${(): void => this.applyStorageFromDialog()}
            >
              <option value="jxl">JPEG XL</option>
              <option value="webp">WebP</option>
              <option value="jpg">JPEG</option>
              <option value="png">PNG</option>
            </select>
          </label>
          ${this.storageIsDefault()
            ? html``
            : html`<button
                class="reset-btn"
                aria-label=${tr("a11y.resetTextureFormat")}
                title=${tr("a11y.resetToDefault")}
                @click=${(): void => this.resetStorageToDefault()}
              >
                ↻
              </button>`}
        </div>
        ${this.storageFormat === "jxl" || this.storageFormat === "webp"
          ? html`<div class="setting-row">
              <label>${tr("setting.textureMode", { format: this.storageFormat === "webp" ? "WebP" : "JXL" })}
                <select
                  id="storageJxlMode"
                  .value=${this.storageLossless ? "lossless" : "lossy"}
                  @change=${(): void => this.applyStorageFromDialog()}
                >
                  <option value="lossless">${tr("setting.losslessFormat", { format: this.storageFormat === "webp" ? "WebP" : "JXL" })}</option>
                  <option value="lossy">${tr("setting.lossyFormat", { format: this.storageFormat === "webp" ? "WebP" : "JXL" })}</option>
                </select>
              </label>
            </div>`
          : html``}
        ${this.storageLossless === false && (this.storageFormat === "jxl" || this.storageFormat === "webp")
          ? html`<div class="setting-row">
              <label
                >${tr("setting.lossyQuality")}
                <input
                  type="number"
                  id="storageQuality"
                  min="0"
                  max="100"
                  step="1"
                  .value=${String(this.storageQuality)}
                  @input=${(): void => this.applyStorageFromDialog()}
                />
              </label>
              ${this.storageQuality !== DEFAULT_STORAGE_SETTINGS.quality
                ? html`<button
                    class="reset-btn"
                    aria-label=${tr("a11y.resetTextureQuality")}
                    title=${tr("a11y.resetToDefault")}
                    @click=${(): void => this.resetStorageToDefault()}
                  >
                    ↻
                  </button>`
                : html``}
            </div>`
          : html``}
        ${this.storageFormat === "png"
          ? html`<div class="setting-row">
              <label
                >${tr("setting.pngLevel")}
                <input
                  type="number"
                  id="storagePngLevel"
                  min="0"
                  max="9"
                  step="1"
                  .value=${String(this.storagePngLevel)}
                  @input=${(): void => this.applyStorageFromDialog()}
                />
              </label>
              ${this.storagePngLevel !== DEFAULT_STORAGE_SETTINGS.pngLevel
                ? html`<button
                    class="reset-btn"
                    aria-label=${tr("a11y.resetPngLevel")}
                    title=${tr("a11y.resetToDefault")}
                    @click=${(): void => this.resetStorageToDefault()}
                  >
                    ↻
                  </button>`
                : html``}
            </div>`
          : html``}
        ${this.storageFormat === "jpg"
          ? html`<div class="setting-row">
              <label
                >${tr("setting.jpegQuality")}
                <input
                  type="number"
                  id="storageJpegQuality"
                  min="0"
                  max="100"
                  step="1"
                  .value=${String(this.storageJpegQuality)}
                  @input=${(): void => this.applyStorageFromDialog()}
                />
              </label>
              ${this.storageJpegQuality !== DEFAULT_STORAGE_SETTINGS.jpgQuality
                ? html`<button
                    class="reset-btn"
                    aria-label=${tr("a11y.resetJpegQuality")}
                    title=${tr("a11y.resetToDefault")}
                    @click=${(): void => this.resetStorageToDefault()}
                  >
                    ↻
                  </button>`
                : html``}
            </div>`
          : html``}
        <div class="setting-row">
          <label
            >${tr("setting.brushQuality")}
            <input
              type="number"
              id="brushQuality"
              min="0"
              max="100"
              step="1"
              .value=${String(this.brushQuality)}
              @input=${(): void => this.applyStorageFromDialog()}
            />
          </label>
          ${this.brushQuality !== DEFAULT_STORAGE_SETTINGS.brushQuality
            ? html`<button
                class="reset-btn"
                aria-label=${tr("a11y.resetBrushQuality")}
                title=${tr("a11y.resetToDefault")}
                @click=${(): void => this.resetStorageToDefault()}
              >
                ↻
              </button>`
            : html``}
        </div>
        <div class="settings-section">${tr("setting.import")}</div>
        <div class="setting-row">
          <label
            >${tr("setting.cleanup")}
            <select id="importCleanup" .value=${this.importCleanup} @change=${(): void => this.applyImportCleanupFromDialog()}>
              <option value="none">${tr("val.none")}</option>
              <option value="fit">${tr("setting.cleanupFit")}</option>
              <option value="crop">${tr("setting.cleanupCrop")}</option>
              <option value="crop+fit">${tr("setting.cleanupCropFit")}</option>
            </select>
          </label>
          ${this.importCleanup !== DEFAULT_IMPORT_CLEANUP
            ? html`<button
                class="reset-btn"
                aria-label=${tr("a11y.resetCleanup")}
                title=${tr("a11y.resetToDefault")}
                @click=${(): void => this.resetImportCleanupToDefault()}
              >
                ↻
              </button>`
            : html``}
        </div>
        <div class="setting-row">
          <label
            >${tr("setting.expandStep")}
            <input
              type="number"
              id="expandStep"
              min="1"
              max="1024"
              step="1"
              .value=${String(this.expandStep)}
              @input=${(): void => this.applyExpandFromDialog()}
            />
          </label>
          ${this.expandStep !== DEFAULT_EXPAND_SETTINGS.step
            ? html`<button
                class="reset-btn"
                aria-label=${tr("a11y.resetExpand")}
                title=${tr("a11y.resetToDefault")}
                @click=${(): void => this.resetExpandToDefault()}
              >
                ↻
              </button>`
            : html``}
        </div>
          <button @click=${(): void => this.resetCheckerDefaults()}>${tr("setting.resetDefaults")}</button>
          <button @click=${(): void => this.closeSettingsDialog()}>${tr("btn.close")}</button>
        </div>
      </dialog>
      <dialog id="frameDurationDialog">
        <h3>${tr("dialog.duration")}</h3>
        <p>${tr("dialog.durationHint")}</p>
        <label
          >${tr("dialog.durationLabel")}
          <input
            type="number"
            id="frameDuration"
            min="0.001"
            max="60"
            step="any"
            placeholder=${String(this.defaultFrameDuration)}
            .value=${this.durationValue === null ? "" : String(this.durationValue)}
          />
        </label>
        <div class="dialog-actions">
          <button @click=${(): void => this.closeFrameDurationDialog()}>${tr("btn.cancel")}</button>
          <button @click=${(): void => this.clearFrameDuration()}>${tr("btn.clear")}</button>
          <button @click=${(): void => this.confirmFrameDuration()}>${tr("btn.set")}</button>
        </div>
      </dialog>
      <dialog id="animationDialog">
        <h3>${tr("dialog.animations")}</h3>
        <p>
          ${tr("dialog.animHintStart")} <code>name,loop,frames</code>${tr("dialog.animHintMiddle")}
          <code>${tr("dialog.animExample")}</code>${tr("dialog.animHintEnd")}
        </p>
        <label
          >${tr("dialog.animDefinition")}
          <input
            type="text"
            id="animationInput"
            maxlength="256"
            placeholder=${tr("dialog.animPlaceholder")}
            .value=${this.animationInput}
            @input=${(event: Event): void => {
              this.animationInput = (event.target as HTMLInputElement).value;
            }}
          />
        </label>
        ${this.animationError !== null
          ? html`<p class="dialog-error" role="alert">${this.animationError}</p>`
          : html``}
        <div class="dialog-actions">
          <button @click=${(): void => this.closeAnimationDialog()}>${tr("btn.close")}</button>
          <button @click=${(): void => this.confirmAddAnimation()}>${tr("btn.add")}</button>
        </div>
        <ul class="animation-list" data-testid="animation-list">
          ${(this.engine?.getNamedAnimations() ?? []).map(
            (animation) => html`
              <li>
                <span>${describeNamedAnimation(animation, { frame: tr("anim.frameOne"), frames: tr("anim.framesMany") })}</span>
                <button
                  aria-label=${tr("dialog.deleteAnim") + ` ${animation.name}`}
                  title=${tr("dialog.deleteAnim") + ` ${animation.name}`}
                  @click=${(): void => this.onDeleteAnimation(animation.name)}
                >
                  ${tr("btn.delete")}
                </button>
              </li>
            `,
          )}
        </ul>
      </dialog>
      <dialog id="animationDeleteDialog" @close=${(): void => this.cancelDeleteAnimation()}>
        <h3>${tr("dialog.deleteAnim")}</h3>
        <p>
          ${tr("dialog.deleteAnimConfirm", { target: this.animationDeleteTarget === null ? tr("dialog.thisAnimation") : `"${this.animationDeleteTarget}"` })}
        </p>
        <div class="dialog-actions">
          <button id="animationDeleteNo" @click=${(): void => this.cancelDeleteAnimation()}>${tr("dialog.no")}</button>
          <button id="animationDeleteYes" @click=${(): void => this.confirmDeleteAnimation()}>${tr("btn.yes")}</button>
        </div>
      </dialog>
      <dialog id="deleteFramesDialog" @close=${(): void => this.cancelDeleteFrames()}>
        <h3>${tr("dialog.deleteFrames")}</h3>
        <p>
          ${(this.deleteFramesTarget?.length ?? 0) === 1 && this.deleteFramesTarget !== null
            ? tr("dialog.deleteFrameOne", { ranges: formatFrameRanges(this.deleteFramesTarget) })
            : tr("dialog.deleteFramesMany", {
                count: this.deleteFramesTarget?.length ?? 0,
                ranges: this.deleteFramesTarget === null ? "" : formatFrameRanges(this.deleteFramesTarget),
              })}
        </p>
        <div class="dialog-actions">
          <button id="deleteFramesNo" @click=${(): void => this.cancelDeleteFrames()}>${tr("btn.cancel")}</button>
          <button id="deleteFramesYes" @click=${(): void => this.confirmDeleteFrames()}>${tr("btn.ok")}</button>
        </div>
      </dialog>
      <dialog id="exportDialog">
        <h3>${tr("dialog.exportFrame")}</h3>
        <label
          >${tr("dialog.frame")}
          <input
            type="number"
            id="exportFrame"
            min="1"
            max=${this.engine?.getFrameCount() ?? 1}
            step="1"
            .value=${String(this.exportFrame)}
          />
        </label>
        <label
          >${tr("dialog.format")}
          <select
            id="exportFormat"
            .value=${this.exportFormat}
            @change=${(event: Event): void => {
              this.exportFormat = (event.target as HTMLSelectElement).value;
            }}
          >
            ${this.exportFormats.map(
              (format) => html`<option value=${format.mime}>${format.label}</option>`,
            )}
          </select>
        </label>
        ${this.exportFormat === JXL_MIME || this.exportFormat === WEBP_MIME
          ? html`<label
              >${tr("val.lossless")}
              <input
                type="checkbox"
                id=${this.exportFormat === WEBP_MIME ? "exportWebpLossless" : "exportJxlLossless"}
                ?checked=${this.exportFormat === WEBP_MIME ? this.exportWebpLossless : this.exportJxlLossless}
                @change=${(event: Event): void => {
                  const checked = (event.target as HTMLInputElement).checked;
                  if (this.exportFormat === WEBP_MIME) {
                    this.exportWebpLossless = checked;
                  } else {
                    this.exportJxlLossless = checked;
                  }
                }}
              />
            </label>`
          : html``}
        ${this.exportFormat === "image/png" ||
        (this.exportFormat === JXL_MIME && this.exportJxlLossless) ||
        (this.exportFormat === WEBP_MIME && this.exportWebpLossless)
          ? html``
          : html`<label
              >${tr("dialog.quality")}
              <input
                type="number"
                id="exportQuality"
                min="1"
                max="100"
                step="1"
                .value=${String(this.exportQuality)}
                @change=${(event: Event): void => {
                  this.exportQuality = normalizeStillQualityPercent(
                    Number((event.target as HTMLInputElement).value),
                  );
                }}
              />
            </label>`}
        <div class="dialog-actions">
          <button @click=${(): void => this.closeExportDialog()}>${tr("btn.cancel")}</button>
          <button id="exportOk" @click=${(): void => void this.confirmExportFrame()}>${tr("btn.export")}</button>
        </div>
        <h3>${tr("dialog.exportAnimation")}</h3>
        <label
          >${tr("dialog.animation")}
          <select
            id="exportAnimation"
            .value=${this.exportAnimation}
            @change=${(event: Event): void => {
              this.exportAnimation = (event.target as HTMLSelectElement).value;
            }}
          >
            <option value="">${tr("matrix.allFrames")}</option>
            ${this.engine?.getNamedAnimations().map(
              (animation) => html`<option value=${animation.name}>${animation.name}</option>`,
            ) ?? html``}
          </select>
        </label>
        <label
          >${tr("dialog.format")}
          <select
            id="exportAnimatedFormat"
            .value=${this.exportAnimatedFormat}
            @change=${(event: Event): void => {
              this.exportAnimatedFormat = (event.target as HTMLSelectElement).value;
            }}
          >
            <option value="gif">${tr("dialog.animGif")}</option>
            <option value="jxl">${tr("dialog.animJxl")}</option>
            <option value="webp">${tr("dialog.animWebp")}</option>
            ${this.exportFormats.map(
              (format) => html`<option value=${format.mime}>${tr("dialog.sequence", { label: format.label })}</option>`,
            )}
          </select>
        </label>
        ${this.exportAnimatedFormat === "jxl" || this.exportAnimatedFormat === "webp"
          ? html`<label
              >${tr("val.lossless")}
              <input
                type="checkbox"
                id=${this.exportAnimatedFormat === "webp" ? "exportAnimatedWebpLossless" : "exportAnimatedJxlLossless"}
                ?checked=${this.exportAnimatedFormat === "webp"
                  ? this.exportAnimatedWebpLossless
                  : this.exportAnimatedJxlLossless}
                @change=${(event: Event): void => {
                  const checked = (event.target as HTMLInputElement).checked;
                  if (this.exportAnimatedFormat === "webp") {
                    this.exportAnimatedWebpLossless = checked;
                  } else {
                    this.exportAnimatedJxlLossless = checked;
                  }
                }}
              />
            </label>`
          : html``}
        ${this.exportAnimatedFormat === "gif" ||
        this.exportAnimatedFormat === "image/png" ||
        (this.exportAnimatedFormat === "jxl" && this.exportAnimatedJxlLossless) ||
        (this.exportAnimatedFormat === "webp" && this.exportAnimatedWebpLossless)
          ? html``
          : html`<label
              >${tr("dialog.quality")}
              <input
                type="number"
                id="exportAnimatedQuality"
                min="1"
                max="100"
                step="1"
                .value=${String(this.exportAnimatedQuality)}
                @change=${(event: Event): void => {
                  this.exportAnimatedQuality = normalizeStillQualityPercent(
                    Number((event.target as HTMLInputElement).value),
                  );
                }}
              />
            </label>`}
        <div class="dialog-actions">
          <button id="exportAnimatedOk" @click=${(): void => void this.confirmExportAnimated()}>
            ${tr("dialog.exportAnimation")}
          </button>
        </div>
        <h3>${tr("dialog.exportSheet")}</h3>
        <div class="export-sheet-animations">
          <label><input type="checkbox" id="exportSheetAll" />${tr("matrix.allFrames")}</label>
          ${this.engine?.getNamedAnimations().map(
            (animation) =>
              html`<label
                ><input type="checkbox" data-export-sheet-anim="${animation.name}" />${animation.name}</label
              >`,
          ) ?? html``}
        </div>
        <label
          >${tr("dialog.extraFrames")}
          <input type="text" id="exportSheetFrames" placeholder=${tr("dialog.extraFrames")} />
        </label>
        <label
          >${tr("dialog.layout")}
          <select
            id="exportSheetLayout"
            .value=${this.exportSheetLayout}
            @change=${(event: Event): void => {
              this.exportSheetLayout = (event.target as HTMLSelectElement).value;
            }}
          >
            ${GNUMARUS_SHEET_LAYOUTS.map(
              (entry) => html`<option value=${entry.value}>${this.sheetLayoutLabel(entry.value)}</option>`,
            )}
            <option value="individual">${tr("dialog.sheetIndividual")}</option>
          </select>
        </label>
        <label
          >${tr("dialog.linesCount")}
          <input
            type="number"
            id="exportSheetCount"
            min="1"
            step="1"
            .value=${String(this.exportSheetCount)}
          />
        </label>
        <label
          >${tr("dialog.format")}
          <select
            id="exportSheetFormat"
            .value=${this.exportSheetFormat}
            @change=${(event: Event): void => {
              this.exportSheetFormat = (event.target as HTMLSelectElement).value;
            }}
          >
            ${this.exportFormats.map(
              (format) => html`<option value=${format.mime}>${format.label}</option>`,
            )}
          </select>
        </label>
        ${this.exportSheetFormat === JXL_MIME || this.exportSheetFormat === WEBP_MIME
          ? html`<label
              >${tr("val.lossless")}
              <input
                type="checkbox"
                id=${this.exportSheetFormat === WEBP_MIME ? "exportSheetWebpLossless" : "exportSheetJxlLossless"}
                ?checked=${this.exportSheetFormat === WEBP_MIME
                  ? this.exportSheetWebpLossless
                  : this.exportSheetJxlLossless}
                @change=${(event: Event): void => {
                  const checked = (event.target as HTMLInputElement).checked;
                  if (this.exportSheetFormat === WEBP_MIME) {
                    this.exportSheetWebpLossless = checked;
                  } else {
                    this.exportSheetJxlLossless = checked;
                  }
                }}
              />
            </label>`
          : html``}
        ${this.exportSheetFormat === "image/png" ||
        (this.exportSheetFormat === JXL_MIME && this.exportSheetJxlLossless) ||
        (this.exportSheetFormat === WEBP_MIME && this.exportSheetWebpLossless)
          ? html``
          : html`<label
              >${tr("dialog.quality")}
              <input
                type="number"
                id="exportSheetQuality"
                min="1"
                max="100"
                step="1"
                .value=${String(this.exportSheetQuality)}
                @change=${(event: Event): void => {
                  this.exportSheetQuality = normalizeStillQualityPercent(
                    Number((event.target as HTMLInputElement).value),
                  );
                }}
              />
            </label>`}
        <div class="dialog-actions">
          <button id="exportSheetOk" @click=${(): void => void this.confirmExportSheet()}>
            ${tr("dialog.exportSheet")}
          </button>
        </div>
      </dialog>
      <dialog id="frameRenameDialog">
        <h3>${tr("dialog.renameFrame")}</h3>
        <label
          >${tr("dialog.frameName")}
          <input type="text" id="frameRename" maxlength="64" .value=${this.frameRenameValue()} />
        </label>
        <div class="dialog-actions">
          <button @click=${(): void => this.closeFrameRenameDialog()}>${tr("btn.cancel")}</button>
          <button @click=${(): void => this.confirmFrameRename()}>${tr("btn.rename")}</button>
        </div>
      </dialog>
      <dialog id="layerRenameDialog">
        <h3>${tr("dialog.renameLayer")}</h3>
        <label
          >${tr("dialog.layerName")}
          <input type="text" id="layerRename" maxlength="64" .value=${this.layerRenameValue()} />
        </label>
        <div class="dialog-actions">
          <button @click=${(): void => this.closeLayerRenameDialog()}>${tr("btn.cancel")}</button>
          <button @click=${(): void => this.confirmLayerRename()}>${tr("btn.rename")}</button>
        </div>
      </dialog>
      ${this.contentPickerTarget !== null ? this.renderContentPickerDialog() : html``}
      ${this.texturePickerContentId !== null ? this.renderTexturePickerDialog() : html``}
    `;
  }

  /** Translated spritesheet layout option label for a layout value. */
  private sheetLayoutLabel(value: string): string {
    switch (value) {
      case "line":
        return tr("dialog.sheetLine");
      case "column":
        return tr("dialog.sheetColumn");
      case "per-line":
        return tr("dialog.sheetPerLine");
      case "per-column":
        return tr("dialog.sheetPerColumn");
      case "packed":
        return tr("dialog.sheetPacked");
      case "fixed-rows":
        return tr("dialog.sheetFixedRows");
      case "fixed-cols":
        return tr("dialog.sheetFixedCols");
      default:
        return value;
    }
  }

  /** User-facing name of a tool. The internal id stays unchanged. */
  private toolDisplayName(tool: GnumarusCanvasTool): string {
    if (tool === "transform") {
      return tr("toolname.transform");
    }
    if (tool === "transform3d") {
      return tr("toolname.transform3d");
    }
    if (tool === "destransform") {
      return tr("toolname.destransform");
    }
    if (tool === "destransform3d") {
      return tr("toolname.destransform3d");
    }
    if (tool === "rectselect") {
      return tr("toolname.rectselect");
    }
    if (tool === "ellipse") {
      return tr("toolname.ellipse");
    }
    if (tool === "lasso") {
      return tr("toolname.lasso");
    }
    if (tool === "colorselect") {
      return tr("toolname.colorselect");
    }
    if (tool === "pencil") {
      return tr("toolname.pencil");
    }
    if (tool === "loupe") {
      return tr("toolname.loupe");
    }
    if (tool === "bucket") {
      return tr("toolname.bucket");
    }
    if (tool === "eyedropper") {
      return tr("toolname.eyedropper");
    }
    if (tool === "line") {
      return tr("toolname.line");
    }
    return tr("toolname.curve");
  }

  /** Selection-drawer helpers: the front tool doubles as the drawer button. */
  private drawerToolName(tool: "rectselect" | "ellipse" | "lasso" | "colorselect"): string {
    if (tool === "ellipse") {
      return tr("tool.ellipse");
    }
    if (tool === "lasso") {
      return tr("tool.lasso");
    }
    if (tool === "colorselect") {
      return tr("tool.colorselect");
    }
    return tr("tool.rectselect");
  }

  private drawerFrontName(): string {
    return this.drawerToolName(this.selectionDrawerFront);
  }

  private drawerToolHint(tool: "rectselect" | "ellipse" | "lasso" | "colorselect"): string {
    if (tool === "ellipse") {
      return tr("tool.ellipseHint");
    }
    if (tool === "lasso") {
      return tr("tool.lassoHint");
    }
    if (tool === "colorselect") {
      return tr("tool.colorselectHint");
    }
    return tr("tool.rectselectHint");
  }

  private drawerFrontHint(): string {
    return this.drawerToolHint(this.selectionDrawerFront);
  }

  private drawerFrontGlyph(): string {
    if (this.selectionDrawerFront === "ellipse") {
      return "◯";
    }
    if (this.selectionDrawerFront === "lasso") {
      return "〰";
    }
    if (this.selectionDrawerFront === "colorselect") {
      return "✦";
    }
    return "▭";
  }

  /** Activate a selection tool through the drawer (optionally closing it). */
  private selectDrawerFront(
    tool: "rectselect" | "ellipse" | "lasso" | "colorselect",
    close = false,
  ): void {
    this.selectionDrawerFront = tool;
    this.tool = tool;
    this.engine?.setTool(tool);
    if (close) {
      this.selectionDrawerOpen = false;
    }
  }

  private renderBlendModeOption() {
    return html`
      <label title=${tr("opt.blendHint")}
        >${tr("opt.blend")}
        <select id="blendMode" .value=${this.blendMode} @change=${(): void => this.applyBlendModeFromDialog()}>
          <option value="normal">${tr("val.normal")}</option>
          <option value="copy">${tr("val.copy")}</option>
          <option value="eraser">${tr("val.eraser")}</option>
        </select>
      </label>
    `;
  }

  private renderAccumulateOption() {
    return html`
      <label title=${tr("opt.accumulateHint")}
        ><input
          type="checkbox"
          id="accumulate"
          .checked=${this.accumulate}
          @change=${(): void => this.applyAccumulateFromDialog()}
        />
        ${tr("opt.accumulate")}
      </label>
    `;
  }

  private renderStabilizerOption() {
    return html`
      <label title=${tr("opt.stabilizerHint")}
        >${tr("opt.stabilizer")}
        <select
          id="stabilizerMode"
          .value=${this.stabilizerMode}
          @change=${(): void => this.applyStabilizerModeFromDialog()}
        >
          <option value="none">${tr("val.none")}</option>
          <option value="rope">${tr("val.rope")}</option>
          <option value="follow">${tr("val.follow")}</option>
        </select>
      </label>
      ${this.stabilizerMode === "rope"
        ? html`
            <label title=${tr("opt.ropeLengthHint")}
              >${tr("opt.ropeLength")}
              <input
                type="number"
                id="ropeLength"
                min="1"
                max="200"
                step="1"
                .value=${String(this.ropeLength)}
                @input=${(): void => this.applyRopeLengthFromDialog()}
              />
            </label>
          `
        : html``}
      ${this.stabilizerMode === "follow"
        ? html`
            <label title=${tr("opt.followStrengthHint")}
              >${tr("opt.followStrength")}
              <input
                type="number"
                id="followStrength"
                min="1"
                max="100"
                step="1"
                .value=${String(this.followStrength)}
                @input=${(): void => this.applyFollowStrengthFromDialog()}
              />
            </label>
          `
        : html``}
    `;
  }

  /**
   * Editor-level options bar, always visible regardless of the active tool
   * (unlike the per-tool options below it). Hosts canvas-wide settings that
   * are not tied to any single tool; painting tools honor them.
   */
  private renderEditorOptions() {
    return html`
      <div class="tool-options" data-testid="editor-options" aria-label=${tr("opt.editorAria")} ?hidden=${this.uiHidden}>
        <label title=${tr("opt.wrapHint")}
          >${tr("opt.wrap")}
          <select id="wrapMode" .value=${this.wrapMode} @change=${(): void => this.applyWrapModeFromDialog()}>
            <option value="off">${tr("val.off")}</option>
            <option value="x">${tr("val.leftRight")}</option>
            <option value="y">${tr("val.upDown")}</option>
            <option value="both">${tr("val.both")}</option>
          </select>
        </label>
        <label title=${tr("opt.symmetryHint")}
          >${tr("opt.symmetry")}
          <select id="symmetryMode" .value=${this.symmetryMode} @change=${(): void => this.applySymmetryModeFromDialog()}>
            <option value="off">${tr("val.off")}</option>
            <option value="mirror-x">${tr("val.leftRight")}</option>
            <option value="mirror-y">${tr("val.upDown")}</option>
            <option value="both">${tr("val.fourWay")}</option>
          </select>
        </label>
      </div>
    `;
  }

  private renderToolOptions() {
    if (this.tool === "pencil") {      return html`
        <div class="tool-options" data-testid="tool-options" aria-label=${tr("opt.pencilAria")} ?hidden=${this.uiHidden}>
          <label title=${tr("opt.presetHint")}
            >${tr("opt.preset")}
            <select id="brushPreset" @change=${(): void => this.applyBrushPresetFromDialog()}>
              ${[...BUILT_IN_BRUSH_PRESETS, ...this.brushPresets].map(
                (preset) => html`<option value=${preset.name}>${preset.name}</option>`,
              )}
            </select>
          </label>
          <label title=${tr("opt.presetNameHint")}
            >${tr("opt.presetName")}
            <input
              type="text"
              id="presetName"
              maxlength="64"
              .value=${this.presetName}
              @input=${(event: Event): void => {
                this.presetName = (event.target as HTMLInputElement | null)?.value ?? "";
              }}
            />
            <button @click=${(): void => this.saveBrushPresetFromDialog()}>${tr("btn.save")}</button>
            <button @click=${(): void => this.deleteBrushPresetFromDialog()}>${tr("btn.delete")}</button>
            <button @click=${(): void => this.downloadBrushPreset()}>${tr("btn.export")}</button>
            <button @click=${(): void => this.openBrushPresetPicker()}>${tr("btn.import")}</button>
            <input type="file" id="brushPresetImport" accept="application/json,.json" hidden @change=${(): void => void this.importBrushPresetFromDialog()} />
          </label>
          <label title=${tr("opt.brushSizeHint")}
            >${tr("opt.brushSize")}
            <input
              type="number"
              id="brushSize"
              min="0.1"
              max="64"
              step="0.1"
              .value=${String(this.brushSize)}
              @input=${(): void => this.applyBrushSizeFromDialog()}
            />
          </label>
          <label title=${tr("opt.brushShapeHint")}
            >${tr("opt.brushShape")}
            <select id="brushShape" .value=${this.brushShape} @change=${(): void => this.applyBrushShapeFromDialog()}>
              <option value="square">${tr("val.square")}</option>
              <option value="circle">${tr("val.circle")}</option>
            </select>
          </label>
          <label title=${tr("opt.brushTipHint")}
            >${tr("opt.brushTip")}
            <select id="brushTipKind" .value=${this.brushTipKind} @change=${(): void => this.applyBrushTipKindFromDialog()}>
              <option value="pixel">${tr("val.pixelHard")}</option>
              <option value="soft">${tr("val.softRound")}</option>
              <option value="image">${tr("val.image")}</option>
            </select>
          </label>
          ${this.brushTipKind === "pixel"
            ? html``
            : html`<label title=${tr("opt.softnessHint")}
                >${tr("opt.softness")}
                <input
                  type="number"
                  id="brushHardness"
                  min="0"
                  max="100"
                  step="1"
                  .value=${String(Math.round(this.brushHardness * 100))}
                  @input=${(): void => this.applyBrushHardnessFromDialog()}
                />
              </label>
              <label title=${tr("opt.spacingHint")}
                >${tr("opt.spacing")}
                <input
                  type="number"
                  id="brushSpacing"
                  min="5"
                  max="400"
                  step="1"
                  .value=${String(Math.round(this.brushSpacing * 100))}
                  @input=${(): void => this.applyBrushSpacingFromDialog()}
                />
              </label>
              <label title=${tr("opt.flowHint")}
                >${tr("opt.flow")}
                <input
                  type="number"
                  id="brushFlow"
                  min="1"
                  max="100"
                  step="1"
                  .value=${String(Math.round(this.brushFlow * 100))}
                  @input=${(): void => this.applyBrushFlowFromDialog()}
                />
              </label>
              <label title=${tr("opt.fuzzyHint")}
                >${tr("opt.fuzzy")}
                <input
                  type="number"
                  id="paintFuzzy"
                  min="0"
                  max="100"
                  step="1"
                  .value=${String(Math.round(this.paintFuzzy * 100))}
                  @input=${(): void => this.applyPaintFuzzyFromDialog()}
                />
              </label>
              <label title=${tr("opt.grainHint")}
                >${tr("opt.grain")}
                <input
                  type="number"
                  id="paintGrainStrength"
                  min="0"
                  max="100"
                  step="1"
                  .value=${String(Math.round(this.paintGrainStrength * 100))}
                  @input=${(): void => this.applyPaintGrainFromDialog()}
                />
              </label>
              <label title=${tr("opt.grainSizeHint")}
                >${tr("opt.grainSize")}
                <input
                  type="number"
                  id="paintGrainScale"
                  min="2"
                  max="64"
                  step="1"
                  .value=${String(this.paintGrainScale)}
                  @input=${(): void => this.applyPaintGrainFromDialog()}
                />
              </label>
              <label title=${tr("opt.tiltSizeHint")}
                >${tr("opt.tiltSize")}
                <input
                  type="number"
                  id="tiltSizeAmount"
                  min="0"
                  max="100"
                  step="1"
                  .value=${String(Math.round(this.tiltSizeAmount * 100))}
                  @input=${(): void => this.applyTiltSizeFromDialog()}
                />
              </label>
              <label title=${tr("opt.speedFadeHint")}
                >${tr("opt.speedFade")}
                <input
                  type="number"
                  id="speedFadeAmount"
                  min="0"
                  max="100"
                  step="1"
                  .value=${String(Math.round(this.speedFadeAmount * 100))}
                  @input=${(): void => this.applySpeedFadeFromDialog()}
                />
              </label>
              <label title=${tr("opt.tipRotationHint")}
                >${tr("opt.tipRotation")}
                <select id="tipAngleMode" .value=${this.tipAngleMode} @change=${(): void => this.applyTipAngleModeFromDialog()}>
                  <option value="none">${tr("val.none")}</option>
                  <option value="direction">${tr("val.followDirection")}</option>
                </select>
              </label>
              <label title=${tr("opt.airbrushHint")}
                >${tr("opt.airbrush")}
                <input
                  type="number"
                  id="airbrushRate"
                  min="0"
                  max="20"
                  step="1"
                  .value=${String(this.airbrushRate)}
                  @input=${(): void => this.applyAirbrushRateFromDialog()}
                />
              </label>
              <label title=${tr("opt.smudgeHint")}
                >${tr("opt.smudge")}
                <input
                  type="number"
                  id="smudgeRate"
                  min="0"
                  max="100"
                  step="1"
                  .value=${String(Math.round(this.smudgeRate * 100))}
                  @input=${(): void => this.applySmudgeFromDialog()}
                />
              </label>
              <label title=${tr("opt.wetnessHint")}
                >${tr("opt.wetness")}
                <input
                  type="number"
                  id="smudgeWet"
                  min="0"
                  max="100"
                  step="1"
                  .value=${String(Math.round(this.smudgeWet * 100))}
                  @input=${(): void => this.applySmudgeFromDialog()}
                />
              </label>
              <label title=${tr("opt.dualTipHint")}
                >${tr("opt.dualTip")} ${this.paintDualName === "" ? tr("val.noneOption") : `(${this.paintDualName})`}
                <input type="file" id="paintDualImport" accept="image/*" hidden @change=${(): void => void this.importPaintDualFromDialog()} />
                <button @click=${(): void => this.openPaintDualPicker()}>${tr("opt.importDual")}</button>
                ${this.paintDualName === ""
                  ? html``
                  : html`<button @click=${(): void => this.clearPaintDual()}>${tr("btn.clear")}</button>`}
              </label>
              ${this.paintDualName === ""
                ? html``
                : html`<label title=${tr("opt.dualStrengthHint")}
                    >${tr("opt.dualStrength")}
                    <input
                      type="number"
                      id="paintDualStrength"
                      min="0"
                      max="100"
                      step="1"
                      .value=${String(Math.round(this.paintDualStrength * 100))}
                      @input=${(): void => this.applyPaintDualTuningFromDialog()}
                    />
                  </label>
                  <label title=${tr("opt.dualSizeHint")}
                    >${tr("opt.dualSize")}
                    <input
                      type="number"
                      id="paintDualScale"
                      min="25"
                      max="400"
                      step="1"
                      .value=${String(Math.round(this.paintDualScale * 100))}
                      @input=${(): void => this.applyPaintDualTuningFromDialog()}
                    />
                  </label>`}`}
          ${this.brushTipKind === "image"
            ? html`<label title=${tr("opt.imageTipHint")}
                >${tr("opt.imageTip")} ${this.paintTipName === "" ? tr("val.noneOption") : `(${this.paintTipName})`}
                <input type="file" id="paintTipImport" accept="image/*" hidden @change=${(): void => void this.importPaintTipFromDialog()} />
                <button @click=${(): void => this.openPaintTipPicker()}>${tr("opt.importTip")}</button>
                ${this.paintTipName === ""
                  ? html``
                  : html`<button @click=${(): void => this.clearPaintTip()}>${tr("btn.clear")}</button>`}
              </label>`
            : html``}
          <label title=${tr("opt.pressureHint")}
            >${tr("opt.pressure")}
            <select
              id="pressureResponse"
              .value=${this.pressureResponse}
              @change=${(): void => this.applyPressureResponseFromDialog()}
            >
              <option value="none">${tr("val.none")}</option>
              <option value="size">${tr("val.size")}</option>
              <option value="opacity">${tr("val.opacity")}</option>
              <option value="size+opacity">${tr("val.sizeOpacity")}</option>
            </select>
          </label>
          ${this.pressureResponse === "none"
            ? html``
            : html`<label title=${tr("opt.sizeCurveHint")}
                >${tr("opt.sizeCurve")}
                <select
                  id="pressureSizeCurve"
                  .value=${this.pressureSizeCurve}
                  @change=${(): void => this.applyPressureSizeCurveFromDialog()}
                >
                  <option value="linear">${tr("val.linear")}</option>
                  <option value="soft">${tr("val.soft")}</option>
                  <option value="firm">${tr("val.firm")}</option>
                </select>
              </label>
              <label title=${tr("opt.alphaCurveHint")}
                >${tr("opt.alphaCurve")}
                <select
                  id="pressureAlphaCurve"
                  .value=${this.pressureAlphaCurve}
                  @change=${(): void => this.applyPressureAlphaCurveFromDialog()}
                >
                  <option value="linear">${tr("val.linear")}</option>
                  <option value="soft">${tr("val.soft")}</option>
                  <option value="firm">${tr("val.firm")}</option>
                </select>
              </label>`}
          <label title=${tr("opt.pencilAntialiasHint")}
            ><input
              type="checkbox"
              id="pencilAntialias"
              .checked=${this.pencilAntialias}
              @change=${(): void => this.applyPencilAntialiasFromDialog()}
            />
            ${tr("opt.antialias")}
          </label>
          <label title=${tr("opt.pencilPixelPerfectHint")}
            ><input
              type="checkbox"
              id="pencilPixelPerfect"
              .checked=${this.pencilPixelPerfect}
              ?disabled=${this.brushSize !== 1 || this.pencilAntialias || this.wrapMode !== "off"}
              @change=${(): void => this.applyPencilPixelPerfectFromDialog()}
            />
            ${tr("opt.pixelPerfect")}
          </label>
          ${this.renderStabilizerOption()} ${this.renderBlendModeOption()} ${this.renderAccumulateOption()}
        </div>
      `;
    }
    if (this.tool === "line") {
      return html`
        <div class="tool-options" data-testid="tool-options" aria-label=${tr("opt.lineAria")} ?hidden=${this.uiHidden}>
          <label
            >${tr("opt.lineWidth")}
            <input
              type="number"
              id="lineWidth"
              min="0.1"
              max="64"
              step="0.1"
              .value=${String(this.lineWidth)}
              @input=${(): void => this.applyLineWidthFromDialog()}
            />
          </label>
          <label
            >${tr("opt.lineShape")}
            <select id="lineShape" .value=${this.lineShape} @change=${(): void => this.applyLineShapeFromDialog()}>
              <option value="square">${tr("val.square")}</option>
              <option value="circle">${tr("val.circle")}</option>
            </select>
          </label>
          <label title=${tr("opt.lineAntialiasHint")}
            ><input
              type="checkbox"
              id="lineAntialias"
              .checked=${this.lineAntialias}
              @change=${(): void => this.applyLineAntialiasFromDialog()}
            />
            ${tr("opt.antialias")}
          </label>
          ${this.renderBlendModeOption()} ${this.renderAccumulateOption()}
        </div>
      `;
    }
    if (this.tool === "curve") {
      return html`
        <div class="tool-options" data-testid="tool-options" aria-label=${tr("opt.curveAria")} ?hidden=${this.uiHidden}>
          <label
            >${tr("opt.curveWidth")}
            <input
              type="number"
              id="curveWidth"
              min="0.1"
              max="64"
              step="0.1"
              .value=${String(this.curveWidth)}
              @input=${(): void => this.applyCurveWidthFromDialog()}
            />
          </label>
          <label
            >${tr("opt.curveShape")}
            <select id="curveShape" .value=${this.curveShape} @change=${(): void => this.applyCurveShapeFromDialog()}>
              <option value="square">${tr("val.square")}</option>
              <option value="circle">${tr("val.circle")}</option>
            </select>
          </label>
          <label title=${tr("opt.curveAntialiasHint")}
            ><input
              type="checkbox"
              id="curveAntialias"
              .checked=${this.curveAntialias}
              @change=${(): void => this.applyCurveAntialiasFromDialog()}
            />
            ${tr("opt.antialias")}
          </label>
          <label title=${tr("opt.curvePixelPerfectHint")}
            ><input
              type="checkbox"
              id="curvePixelPerfect"
              .checked=${this.curvePixelPerfect}
              ?disabled=${this.curveWidth !== 1 || this.curveAntialias || this.wrapMode !== "off"}
              @change=${(): void => this.applyCurvePixelPerfectFromDialog()}
            />
            ${tr("opt.pixelPerfect")}
          </label>
          ${this.renderBlendModeOption()} ${this.renderAccumulateOption()}
        </div>
      `;
    }
    if (this.tool === "bucket") {
      return html`
        <div class="tool-options" data-testid="tool-options" aria-label=${tr("opt.bucketAria")} ?hidden=${this.uiHidden}>
          ${this.renderBlendModeOption()}
        </div>
      `;
    }
    if (this.tool === "destransform" || this.tool === "destransform3d") {
      return html`
        <div class="tool-options" data-testid="tool-options" aria-label=${tr("opt.destransformAria")} ?hidden=${this.uiHidden}>
          <button
            ?disabled=${!this.floatingActive}
            title=${tr("opt.commitSelectionHint")}
            @click=${(): void => this.commitFloatingSelection()}
          >
            ${tr("opt.commitSelection")}
          </button>
        </div>
      `;
    }
    if (
      this.tool === "rectselect" ||
      this.tool === "ellipse" ||
      this.tool === "lasso" ||
      this.tool === "colorselect"
    ) {
      return html`
        <div class="tool-options" data-testid="tool-options" aria-label=${tr("options.suffix", { tool: this.toolDisplayName(this.tool) })} ?hidden=${this.uiHidden}>
          ${this.tool === "colorselect"
            ? html`<label title=${tr("opt.colorThresholdHint")}
                >${tr("opt.colorThreshold")}
                <input
                  type="number"
                  id="colorThreshold"
                  min="0"
                  max="100"
                  step="1"
                  .value=${String(this.colorThreshold)}
                  @input=${(): void => this.applyColorThresholdFromDialog()}
                />
              </label>
              <label title=${tr("opt.contiguousHint")}
                ><input
                  type="checkbox"
                  id="colorContiguous"
                  ?checked=${this.colorContiguous}
                  @change=${(): void => this.applyColorContiguousFromDialog()}
                />
                ${tr("opt.contiguous")}
              </label>`
            : html`<span class="tool-options-empty">${tr("opt.rectselectModifiers")}</span>`}
        </div>
      `;
    }
    return html`
      <div class="tool-options" data-testid="tool-options" aria-label=${tr("options.suffix", { tool: this.toolDisplayName(this.tool) })} ?hidden=${this.uiHidden}>
        <span class="tool-options-empty"
          >${tr("options.empty", { tool: this.toolDisplayName(this.tool) })}</span
        >
      </div>
    `;
  }

  private renderAnimationMatrix() {
    if (this.engine === null) {
      return html``;
    }
    const matrix = this.engine.getAnimationMatrix();
    const columns = `120px repeat(${matrix.frameCount}, 76px)`;
    const activeAnimation = this.engine.getActiveAnimationName();
    const activeFrames =
      activeAnimation === null
        ? null
        : new Set(
            (this.engine.getNamedAnimations().find((entry) => entry.name === activeAnimation)?.frames ?? []).map(
              (entry) => entry.frame,
            ),
          );
    const animationFrameCounts = countAnimationFrames(this.engine.getNamedAnimations());
    return html`
      <div class="anim-matrix" data-testid="animation-matrix" aria-label=${tr("matrix.matrixAria")} ?hidden=${this.uiHidden}>
        <div class="anim-scroll">
          <div class="anim-grid" style="grid-template-columns: ${columns};">
            <div class="anim-corner">
              <button
                aria-label=${tr("matrix.manageAnimations")}
                title=${tr("matrix.manageAnimationsHint")}
                @click=${(): void => this.openAnimationDialog()}
              >
                ⚙</button
              >
              <button aria-label=${tr("matrix.addFrame")} title=${tr("matrix.addFrame")} @click=${(): void => this.onAddFrame()}>+</button>
              <button
                aria-label=${this.playing ? tr("matrix.stop") : tr("matrix.play")}
                title=${this.playing ? tr("matrix.stop") : tr("matrix.play")}
                @click=${(): void => this.togglePlayback()}
                >${this.playing ? "■" : "▶"}</button
              >
              <select
                data-testid="animation-select"
                aria-label=${tr("matrix.activeAnimation")}
                title=${tr("matrix.activeAnimationHint")}
                @change=${(event: Event): void => this.onSelectAnimation(event)}
              >
                <option value="">${tr("matrix.allFrames")}</option>
                ${(this.engine?.getNamedAnimations() ?? []).map(
                  (animation) => html`
                    <option
                      value=${animation.name}
                      ?selected=${this.engine?.getActiveAnimationName() === animation.name}
                    >
                      ${animation.name}
                    </option>
                  `,
                )}
              </select>
            </div>
            ${Array.from({ length: matrix.frameCount }, (_unused, frame) => {
              const current = frame === matrix.currentFrame;
              const inAnimation = activeFrames !== null && activeFrames.has(frame);
              const duration = this.engine?.getEffectiveFrameDuration(frame) ?? 0;
              const frameName = matrix.frameNames[frame] ?? `F${frame + 1}`;
              const isRenaming = this.renamingFrame === frame;
              const animationCount = animationFrameCounts.get(frame) ?? 0;
              const inRange = this.selectedFrameSet().has(frame);
              const animationPhrase =
                animationCount === 0
                  ? tr("matrix.noAnimations")
                  : animationCount === 1
                    ? tr("matrix.oneAnimation")
                    : tr("matrix.animations", { count: animationCount });
              return html`
                <div class="anim-frame-header ${current ? "current" : ""} ${inAnimation ? "in-animation" : ""} ${inRange ? "in-range" : ""}">
                  ${isRenaming
                    ? html`<input
                        data-testid="anim-frame-rename"
                        data-frame=${frame}
                        .value=${frameName}
                        maxlength="64"
                        aria-label=${tr("matrix.renameAria", { frame: frame + 1 })}
                        @click=${(event: Event): void => event.stopPropagation()}
                        @keydown=${(event: KeyboardEvent): void => {
                          if (event.key === "Enter") {
                            this.onFrameRenameCommit(frame);
                          } else if (event.key === "Escape") {
                            this.onFrameRenameCancel();
                          }
                          event.stopPropagation();
                        }}
                        @blur=${(): void => this.onFrameRenameCommit(frame)}
                      />`
                    : html`<button
                        data-testid="anim-frame"
                        data-frame=${frame}
                        aria-label=${tr("matrix.frameAria", {
                          frame: frame + 1,
                          current: current ? tr("matrix.currentSuffix") : "",
                          name: frameName,
                          duration,
                          animation: animationPhrase,
                        })}
                        title=${tr("matrix.frameTitle", {
                          frame: frame + 1,
                          current: current ? tr("matrix.currentParen") : "",
                          name: frameName,
                          duration,
                          animation: animationPhrase,
                        })}
                        @click=${(event: MouseEvent): void => this.onSelectFrameClick(frame, event.shiftKey)}
                        @dblclick=${(): void => this.onFrameRenameStart(frame)}
                        @contextmenu=${(event: MouseEvent): void => {
                          event.preventDefault();
                          this.openMatrixFrameMenu(frame, event.clientX, event.clientY);
                        }}
                        >${frameName}</button
                      >`}
                </div>
              `;
            })}
            ${matrix.rows.map(
              (row) => html`
                <div
                  class="anim-layer-name"
                  title=${row.layerName}
                  data-testid="anim-layer-name"
                  data-matrix-layer=${row.layerId}
                  role="button"
                  tabindex="0"
                  aria-label=${tr("matrix.layerAria", { name: row.layerName })}
                  @contextmenu=${(event: MouseEvent): void => {
                    event.preventDefault();
                    this.openMatrixLayerMenu(row.layerId, event.clientX, event.clientY);
                  }}
                >
                  ${row.layerName}
                </div>
                ${row.cells.map((cell) => {
                  const isActive = cell.layerId === matrix.activeLayerId && cell.frame === matrix.currentFrame;
                  const isCurrent = cell.frame === matrix.currentFrame;
                  const inAnimation = activeFrames !== null && activeFrames.has(cell.frame);
                  const label = cell.contentName ?? tr("matrix.emptyCell");
                  return html`
                    <div
                      class="anim-cell ${cell.contentId !== null ? "filled" : ""} ${isCurrent ? "current-frame" : ""} ${isActive ? "active-cell" : ""} ${inAnimation ? "in-animation" : ""}"
                      data-testid="anim-cell"
                      data-matrix-layer=${cell.layerId}
                      data-matrix-frame=${cell.frame}
                      role="button"
                      tabindex="0"
                      aria-label=${tr("matrix.cellAria", {
                        layer: row.layerName,
                        frame: cell.frame + 1,
                        label,
                      })}
                      title=${tr("matrix.cellTitle", {
                        layer: row.layerName,
                        frame: cell.frame + 1,
                        label,
                      })}
                      @click=${(): void => this.onCellClick(cell.layerId, cell.frame)}
                      @keydown=${(event: KeyboardEvent): void => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          this.onCellClick(cell.layerId, cell.frame);
                        }
                      }}
                      @contextmenu=${(event: MouseEvent): void => {
                        event.preventDefault();
                        this.openMatrixCellMenu(cell.layerId, cell.frame, event.clientX, event.clientY);
                      }}
                    >
                      ${cell.contentName !== null
                        ? html`<span class="cell-name">${cell.contentName}</span>`
                        : html`<span aria-hidden="true">—</span>`}
                    </div>
                  `;
                })}
              `,
            )}
          </div>
        </div>
      </div>
    `;
  }

  private renderMatrixMenu() {
    if (this.matrixMenu === null || this.engine === null) {
      return html``;
    }
    if (this.matrixMenu.kind === "frame") {
      const frame = this.matrixMenu.frame;
      const count = this.engine.getFrameCount();
      return html`
        <div class="context-blocker" @click=${(): void => this.closeMatrixMenu()} @contextmenu=${(event: Event): void => {
          event.preventDefault();
          this.closeMatrixMenu();
        }}></div>
        <div class="context-menu" style="left: ${this.matrixMenu.x}px; top: ${this.matrixMenu.y}px;">
          <button @click=${(): void => this.onAddFrameBefore(frame)}>${tr("matrix.addBefore")}</button>
          <button @click=${(): void => this.onAddFrameAfter(frame)}>${tr("matrix.addAfter")}</button>
          <button @click=${(): void => this.onOpenFrameDuration()}>${tr("matrix.setDuration")}</button>
          <button @click=${(): void => this.onRenameFrameFromMenu()}>${tr("matrix.renameFrame")}</button>
          <button ?disabled=${count <= 1} @click=${(): void => this.onRemoveFrame(frame)}>${tr("matrix.removeFrame")}</button>
        </div>
      `;
    }
    if (this.matrixMenu.kind === "frames") {
      const frames = this.matrixMenu.frames;
      return html`
        <div class="context-blocker" @click=${(): void => this.closeMatrixMenu()} @contextmenu=${(event: Event): void => {
          event.preventDefault();
          this.closeMatrixMenu();
        }}></div>
        <div class="context-menu" style="left: ${this.matrixMenu.x}px; top: ${this.matrixMenu.y}px;">
          <button @click=${(): void => this.onDeleteFrames([...frames])}>
            ${tr("matrix.deleteFrames", { count: frames.length })}
          </button>
        </div>
      `;
    }
    if (this.matrixMenu.kind === "layer") {
      return html`
        <div class="context-blocker" @click=${(): void => this.closeMatrixMenu()} @contextmenu=${(event: Event): void => {
          event.preventDefault();
          this.closeMatrixMenu();
        }}></div>
        <div class="context-menu" style="left: ${this.matrixMenu.x}px; top: ${this.matrixMenu.y}px;">
          <button @click=${(): void => this.onRenameLayerFromMenu()}>${tr("matrix.renameLayer")}</button>
        </div>
      `;
    }
    const menu = this.matrixMenu;
    const cellTextureId =
      menu.kind === "cell" ? this.engine.getCellTextureId(menu.layerId, menu.frame) : null;
    return html`
      <div class="context-blocker" @click=${(): void => this.closeMatrixMenu()} @contextmenu=${(event: Event): void => {
        event.preventDefault();
        this.closeMatrixMenu();
      }}></div>
      <div class="context-menu" style="left: ${menu.x}px; top: ${menu.y}px;">
        <button @click=${(): void => void this.onOpenContentPicker()}>${tr("matrix.selectContent")}</button>
        <button ?disabled=${cellTextureId === null} @click=${(): void => this.onOpenFitTextureFromCell()}>
          ${tr("ctx.fitTexture")}
        </button>
        <button ?disabled=${cellTextureId === null} @click=${(): void => this.onCropCellToCanvasFromCell()}>
          ${tr("ctx.cropCanvas")}
        </button>
        <button ?disabled=${cellTextureId === null} @click=${(): void => this.onResizeCellToCanvasFromCell()}>
          ${tr("ctx.resizeCanvas")}
        </button>
      </div>
    `;
  }

  protected updated(): void {
    this.fitContextMenusToViewport();
  }

  /** Shift fixed-position context menus left/up only by the measured overflow so they stay adjacent to the cursor. */
  private fitContextMenusToViewport(): void {
    const root = this.shadowRoot;
    if (root === null || root === undefined) {
      return;
    }
    const margin = 8;
    for (const node of Array.from(root.querySelectorAll(".context-menu"))) {
      const menu = node as HTMLElement;
      const rect = menu.getBoundingClientRect();
      if (rect.width <= 0 && rect.height <= 0) {
        continue;
      }
      let shiftX = 0;
      let shiftY = 0;
      if (rect.right > window.innerWidth - margin) {
        shiftX = rect.right - (window.innerWidth - margin);
      } else if (rect.left < margin) {
        shiftX = rect.left - margin;
      }
      if (rect.bottom > window.innerHeight - margin) {
        shiftY = rect.bottom - (window.innerHeight - margin);
      } else if (rect.top < margin) {
        shiftY = rect.top - margin;
      }
      if (shiftX !== 0) {
        const current = Number.parseFloat(menu.style.left || "0") || 0;
        menu.style.left = `${current - shiftX}px`;
      }
      if (shiftY !== 0) {
        const current = Number.parseFloat(menu.style.top || "0") || 0;
        menu.style.top = `${current - shiftY}px`;
      }
    }
  }

  firstUpdated(): void {
    this.fsSupported = isFileSystemAccessSupported();
    window.addEventListener("keydown", this.onGlobalKeyDown);
    window.addEventListener("pointerdown", this.onGlobalPointerDown);
    const storedChecker = this.loadCheckerSettings();
    this.checkerMode = storedChecker.mode;
    this.checkerSizeX = storedChecker.sizeX;
    this.checkerSizeY = storedChecker.sizeY;
    this.checkerColorA = storedChecker.colorA;
    this.checkerColorB = storedChecker.colorB;
    const storedGrid = this.loadGridSettings();
    this.gridMinZoom = storedGrid.minZoom;
    this.gridOpacity = storedGrid.opacityPercent;
    const storedRotation = this.loadRotationSettings();
    this.rotationStepDeg = storedRotation.stepDeg;
    const storedZoom = this.loadZoomSettings();
    this.zoomMinPercent = storedZoom.minZoomPercent;
    const storedBackground = this.loadBackgroundSettings();
    this.backgroundMode = storedBackground.mode;
    this.backgroundColor = storedBackground.color;
    const storedToast = this.loadToastSettings();
    this.toastDurationSec = storedToast.durationSec;
    const storedLocale = this.loadLocaleSettings();
    this.locale = storedLocale.locale;
    this.applyActiveLocale();
    const storedFit = this.loadFitSettings();
    this.fitDefaultThreshold = storedFit.alphaThreshold;
    const storedStorage = this.loadStorageSettings();
    this.storageLossless = storedStorage.lossless;
    this.storageQuality = storedStorage.quality;
    this.storageProjectFile = storedStorage.projectFile;
    this.storageFormat = storedStorage.format;
    this.storagePngLevel = storedStorage.pngLevel;
    this.storageJpegQuality = storedStorage.jpgQuality;
    this.brushQuality = storedStorage.brushQuality;
    this.importCleanup = this.loadImportCleanup();
    const storedExpand = this.loadExpandSettings();
    this.expandStep = storedExpand.step;
    this.brushPresets = this.loadBrushPresets();
    const host = this.shadowRoot?.getElementById("canvasHost") ?? null;
    if (host === null) {
      this.webglError = tr("status.webglHostMissing");
      return;
    }
    try {
      this.engine = new GnumarusCanvasEngine(host, {
        onToolChanged: (tool): void => {
          this.tool = tool;
          if (tool === "rectselect" || tool === "ellipse" || tool === "lasso" || tool === "colorselect") {
            this.selectionDrawerFront = tool;
          }
        },
        onLayersChanged: (): void => {
          this.refreshLayers();
        },
        checker: storedChecker,
        gridMinZoom: storedGrid.minZoom,
        gridOpacityPercent: storedGrid.opacityPercent,
        viewMinZoom: storedZoom.minZoomPercent / 100,
        background: storedBackground,
        onStats: (stats): void => {
          this.zoomText = `${Math.round(stats.zoom * 100)}%`;
          this.canUndo = stats.canUndo;
          this.canRedo = stats.canRedo;
          this.rotText = `${Math.round(stats.rotationDeg)}°`;
          this.flipText =
            stats.flipX && stats.flipY
              ? tr("status.flipXY")
              : stats.flipX
                ? tr("status.flipX")
                : stats.flipY
                  ? tr("status.flipY")
                  : "";
          this.cursorText =
            stats.cursorX === null || stats.cursorY === null ? "-" : `${stats.cursorX}, ${stats.cursorY}`;
          this.canvasText = `${stats.width} x ${stats.height}`;
        },
        onPixelsChanged: (): void => {
          this.dirty = true;
          void this.refreshPreview();
        },
        onEyedropperPick: (hex): void => {
          this.setPencilColor(hex);
          this.statusMessage = tr("status.eyedropper", { hex });
        },
        onTransformChanged: (): void => {
          void this.refreshPreview();
        },
        onToolSizeChanged: (kind, size): void => {
          if (kind === "brush") {
            this.brushSize = size;
            this.statusMessage = tr("status.brushSize", { value: size });
          } else if (kind === "line") {
            this.lineWidth = size;
            this.statusMessage = tr("status.lineWidth", { value: size });
          } else {
            this.curveWidth = size;
            this.statusMessage = tr("status.curveWidth", { value: size });
          }
        },
      });
      this.engine.setColor(this.colorValue);
      this.engine.setRotationStepDeg(this.rotationStepDeg);
      this.engine.setViewMinZoom(this.zoomMinPercent / 100);
      this.engine.setStabilizerMode(this.stabilizerMode);
      this.engine.setRopeLength(this.ropeLength);
      this.engine.setFollowStrength(this.followStrength);
      this.engine.setPencilPixelPerfect(this.pencilPixelPerfect);
      this.engine.setCurvePixelPerfect(this.curvePixelPerfect);
      this.refreshLayers();
      // The engine fits the zoom during construction, before the animation
      // matrix above the status bar takes part in the layout. Re-fit once the
      // first update (matrix included) is painted so the initial zoom matches
      // what Reset Canvas Transform computes later.
      void this.fitInitialView();
      if (!this.fsSupported) {
        this.statusMessage = tr("status.fsUnavailable");
      }
      (window as unknown as { __gnumarus?: unknown }).__gnumarus = {
        shell: this,
        engine: this.engine,
      };
    } catch (error) {
      if (error instanceof GnumarusWebGlError) {
        this.webglError = error.message;
      } else {
        this.webglError = tr("status.webglFailed");
      }
    }
  }

  private async fitInitialView(): Promise<void> {
    try {
      await this.updateComplete;
    } catch {
      return;
    }
    if (!this.isConnected) {
      return;
    }
    this.engine?.resetViewTransform();
  }

  /** A click outside the menubar dismisses any open menu. */
  private onGlobalPointerDown = (event: PointerEvent): void => {
    if (!this.anyMenuOpen()) {
      return;
    }
    const menubar = this.shadowRoot?.querySelector(".menubar") ?? null;
    if (menubar !== null && event.composedPath().includes(menubar)) {
      return;
    }
    this.closeAllMenus();
  };

  private anyMenuOpen(): boolean {
    return this.fileMenuOpen || this.editMenuOpen || this.helpMenuOpen;
  }

  private closeAllMenus(): void {
    this.fileMenuOpen = false;
    this.editMenuOpen = false;
    this.helpMenuOpen = false;
    this.selectionDrawerOpen = false;
  }

  /** Header click toggles one menu, closing the others. */
  private toggleMenu(which: "file" | "edit" | "help"): void {
    const open = !(
      which === "file" ? this.fileMenuOpen : which === "edit" ? this.editMenuOpen : this.helpMenuOpen
    );
    this.closeAllMenus();
    if (which === "file") {
      this.fileMenuOpen = open;
    } else if (which === "edit") {
      this.editMenuOpen = open;
    } else {
      this.helpMenuOpen = open;
    }
  }

  /** Hover switches menus, but only while one is already open. */
  private hoverMenu(which: "file" | "edit" | "help"): void {
    if (!this.anyMenuOpen()) {
      return;
    }
    this.closeAllMenus();
    if (which === "file") {
      this.fileMenuOpen = true;
    } else if (which === "edit") {
      this.editMenuOpen = true;
    } else {
      this.helpMenuOpen = true;
    }
  }

  private onGlobalKeyDown = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();
    if ((event.ctrlKey || event.metaKey) && !event.altKey && key === "s") {
      event.preventDefault();
      void this.runAction("save-project");
      return;
    }
    if ((event.ctrlKey || event.metaKey) && !event.altKey && key === "e") {
      event.preventDefault();
      this.mergeActiveLayerDown();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && !event.altKey) {
      if (
        this.eventInField(event) ||
        this.eventInColorPicker(event) ||
        this.shadowRoot?.querySelector("dialog[open]") !== null
      ) {
        return;
      }
      if (
        event.key === "ArrowUp" ||
        event.key === "ArrowDown" ||
        event.key === "ArrowLeft" ||
        event.key === "ArrowRight"
      ) {
        event.preventDefault();
        this.expandCurrentCellTexture(
          event.key === "ArrowUp" ? "up" : event.key === "ArrowDown" ? "down" : event.key === "ArrowLeft" ? "left" : "right",
        );
        return;
      }
    }
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && !event.altKey && key === "p") {
      const palette = this.shadowRoot?.getElementById("actionPaletteDialog") as HTMLDialogElement | null;
      if (palette?.open === true || (!this.eventInField(event) && !this.eventInColorPicker(event))) {
        event.preventDefault();
        this.toggleActionPalette();
      }
      return;
    }
    if (event.key === "Tab") {
      if (this.shadowRoot?.querySelector("dialog[open]") !== null || this.eventInField(event)) {
        return;
      }
      event.preventDefault();
      this.uiHidden = !this.uiHidden;
      return;
    }    if (event.key === "Escape") {
      this.closeAllMenus();
      if (this.matrixMenu !== null) {
        this.matrixMenu = null;
      }
      if (this.contextMenuLayerId !== null) {
        this.closeLayerMenu();
      }
      if (this.renamingFrame !== null) {
        this.renamingFrame = null;
      }
      if (this.renamingId !== null) {
        this.renamingId = null;
      }
      return;
    }
    if (event.ctrlKey || event.altKey || event.metaKey) {
      return;
    }
    if (this.shadowRoot?.querySelector("dialog[open]") !== null) {
      return;
    }
    if (this.eventInField(event)) {
      return;
    }
    if (event.key === "PageUp") {
      event.preventDefault();
      this.selectLayerRelative(1);
      return;
    }
    if (event.key === "PageDown") {
      event.preventDefault();
      this.selectLayerRelative(-1);
      return;
    }
    if (event.key === "Insert") {
      event.preventDefault();
      this.insertLayerAboveActive();
      return;
    }
    if (event.code === "Digit0") {
      event.preventDefault();
      this.runAction("reset-canvas-transform");
      return;
    }
    if (
      event.key === "ArrowLeft" ||
      event.key === "ArrowRight" ||
      event.key === "ArrowUp" ||
      event.key === "ArrowDown"
    ) {
      if (this.eventInColorPicker(event)) {
        return;
      }
      event.preventDefault();
      if (event.shiftKey) {
        if (event.key === "ArrowLeft") {
          this.moveCurrentFrame(-1);
        } else if (event.key === "ArrowRight") {
          this.moveCurrentFrame(1);
        } else if (event.key === "ArrowUp") {
          this.moveActiveLayer("up");
        } else {
          this.moveActiveLayer("down");
        }
        return;
      }
      if (event.key === "ArrowLeft") {
        this.selectFrameRelative(-1);
      } else if (event.key === "ArrowRight") {
        this.selectFrameRelative(1);
      } else if (event.key === "ArrowUp") {
        this.selectLayerRelative(1);
      } else {
        this.selectLayerRelative(-1);
      }
      return;
    }
    if (event.key === "e" || event.key === "E") {
      event.preventDefault();
      this.toggleEraserBlend();
    }
  };

  /** Detect focus inside the custom color picker, whose ring/triangle/bars own the arrow keys. */
  private eventInColorPicker(event: KeyboardEvent): boolean {
    if (typeof event.composedPath === "function") {
      for (const node of event.composedPath()) {
        if (node instanceof Element && node.localName === "gnumarus-color-picker") {
          return true;
        }
      }
    }
    const target = event.target;
    return target instanceof HTMLElement && target.closest("gnumarus-color-picker") !== null;
  }

  /** Detect text editing focus, piercing shadow DOM retargeting via composedPath. */
  private eventInField(event: KeyboardEvent): boolean {    if (typeof event.composedPath === "function") {
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
  }

  private showToast(message: string): void {
    this.toastMessage = message;
    if (this.toastTimer !== null) {
      window.clearTimeout(this.toastTimer);
    }
    const delayMs = Math.round(clampToastDurationSec(this.toastDurationSec) * 1000);
    this.toastTimer = window.setTimeout(() => {
      this.toastMessage = "";
      this.toastTimer = null;
    }, delayMs);
  }

  private layerToastFor(index: number, total: number, name: string): string {
    return `${index + 1}/${total}: ${name}`;
  }

  private frameToastFor(frame: number, count: number): string {
    const name = this.engine?.getFrameName(frame) ?? `F${frame + 1}`;
    return tr("frame.label", { frame: frame + 1, count, name });
  }

  /** Select the layer above (direction 1) or below (direction -1), wrapping around. */
  private selectLayerRelative(direction: 1 | -1): void {
    if (this.engine === null || this.layers.length === 0) {
      return;
    }
    const active = this.layers.findIndex((layer) => layer.id === this.activeLayerId);
    const current = active < 0 ? this.layers.length - 1 : active;
    const next = (current + direction + this.layers.length) % this.layers.length;
    const target = this.layers[next];
    if (target === undefined || !this.engine.setActiveLayer(target.id)) {
      return;
    }
    this.refreshLayers();
    this.showToast(this.layerToastFor(next, this.layers.length, target.name));
  }

  private insertLayerAboveActive(): void {
    if (this.engine === null) {
      return;
    }
    this.engine.insertLayerAboveActive();
    this.refreshLayers();
    this.dirty = true;
    this.statusMessage = tr("status.layerAdded");
  }

  /** Select the previous/next frame with wraparound. */
  private selectFrameRelative(direction: 1 | -1): void {
    if (this.engine === null) {
      return;
    }
    const count = this.engine.getFrameCount();
    if (count <= 0) {
      return;
    }
    const next = (this.engine.getCurrentFrame() + direction + count) % count;
    if (this.engine.setCurrentFrame(next)) {
      this.selectSingleFrame(next);
      this.refreshLayers();
      this.showToast(this.frameToastFor(next, count));
    }
  }

  /** Move the current frame left/right with wraparound; selection follows. */
  private moveCurrentFrame(direction: 1 | -1): void {
    if (this.engine === null) {
      return;
    }
    const from = this.engine.getCurrentFrame();
    if (this.engine.moveFrame(from, direction)) {
      this.selectSingleFrame(this.engine.getCurrentFrame());
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage = direction === 1 ? tr("status.frameMovedRight") : tr("status.frameMovedLeft");
    }
  }

  /** Move the active layer up/down with wraparound. */
  private moveActiveLayer(direction: "up" | "down"): void {
    if (this.engine === null) {
      return;
    }
    if (this.engine.moveLayerWrapping(this.engine.getActiveLayerId(), direction)) {
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage = direction === "up" ? tr("status.layerMovedUp") : tr("status.layerMovedDown");
    }
  }

  private mergeActiveLayerDown(): void {
    if (this.engine === null) {
      return;
    }
    if (this.engine.mergeDown(this.engine.getActiveLayerId())) {
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage = tr("status.layersMerged");
    } else {
      this.statusMessage = tr("status.nothingBelow");
    }
  }

  private openNewDialog(): void {
    this.fileMenuOpen = false;
    // Refresh the dialog storage fields from the current global settings;
    // the preset no longer necessarily applies after external changes.
    this.newStorageFormat = this.storageFormat;
    this.newStorageLossless = this.storageLossless;
    this.newStorageQuality = this.storageQuality;
    this.newPreset = "";
    const dialog = this.shadowRoot?.getElementById("newDialog") as HTMLDialogElement | null;
    dialog?.showModal();
  }

  private closeNewDialog(): void {
    const dialog = this.shadowRoot?.getElementById("newDialog") as HTMLDialogElement | null;
    dialog?.close();
  }

  /** Apply the selected new-project preset to the dialog fields. */
  private applyNewPresetFromDialog(): void {
    const select = this.shadowRoot?.getElementById("newPreset") as HTMLSelectElement | null;
    const name = select?.value ?? "";
    this.newPreset = name;
    const applied = applyNewProjectPreset(name);
    if (applied === null) {
      return;
    }
    this.newWidth = applied.width;
    this.newHeight = applied.height;
    this.newStorageFormat = applied.format;
    this.newStorageLossless = applied.lossless;
    this.newStorageQuality = applied.quality;
  }

  /** Track manual dimension edits (the preset no longer applies). */
  private applyNewDimensionsFromDialog(): void {
    const widthInput = this.shadowRoot?.getElementById("newWidth") as HTMLInputElement | null;
    const heightInput = this.shadowRoot?.getElementById("newHeight") as HTMLInputElement | null;
    const width = Math.floor(Number(widthInput?.value));
    const height = Math.floor(Number(heightInput?.value));
    if (Number.isFinite(width) && width >= 1) {
      this.newWidth = Math.min(16384, width);
    }
    if (Number.isFinite(height) && height >= 1) {
      this.newHeight = Math.min(16384, height);
    }
    this.newPreset = "";
  }

  /** Track manual storage edits (PNG forces lossless; the preset no longer applies). */
  private applyNewStorageFromDialog(): void {
    const formatInput = this.shadowRoot?.getElementById("newStorageFormat") as HTMLSelectElement | null;
    const modeInput = this.shadowRoot?.getElementById("newStorageMode") as HTMLSelectElement | null;
    const qualityInput = this.shadowRoot?.getElementById("newStorageQuality") as HTMLInputElement | null;
    const format = parseStorageFormat(formatInput?.value ?? this.newStorageFormat);
    const lossless = format === "png" ? true : (modeInput?.value ?? "lossless") !== "lossy";
    let quality = this.newStorageQuality;
    if (qualityInput !== null) {
      const raw = Math.floor(Number(qualityInput.value));
      quality = clampStorageQuality(Number.isFinite(raw) ? raw : DEFAULT_STORAGE_SETTINGS.quality);
    }
    this.newStorageFormat = format;
    this.newStorageLossless = lossless;
    this.newStorageQuality = quality;
    this.newPreset = "";
  }

  private openResizeDialog(id: string): void {
    const layer = this.layers.find((entry) => entry.id === id);
    if (layer === undefined) {
      return;
    }
    this.resizingLayerId = id;
    this.resizeWidth = layer.width;
    this.resizeHeight = layer.height;
    this.requestUpdate();
    const dialog = this.shadowRoot?.getElementById("resizeDialog") as HTMLDialogElement | null;
    dialog?.showModal();
  }

  private closeResizeDialog(): void {
    const dialog = this.shadowRoot?.getElementById("resizeDialog") as HTMLDialogElement | null;
    dialog?.close();
    this.resizingLayerId = null;
  }

  private confirmResize(): void {
    const targetId = this.resizingLayerId;
    if (targetId === null || this.engine === null) {
      this.closeResizeDialog();
      return;
    }
    const widthInput = this.shadowRoot?.getElementById("resizeWidth") as HTMLInputElement | null;
    const heightInput = this.shadowRoot?.getElementById("resizeHeight") as HTMLInputElement | null;
    const width = Math.min(1024, Math.max(1, Math.floor(Number(widthInput?.value ?? "1") || 1)));
    const height = Math.min(1024, Math.max(1, Math.floor(Number(heightInput?.value ?? "1") || 1)));
    this.resizeWidth = width;
    this.resizeHeight = height;
    if (this.engine.resizeLayer(targetId, width, height)) {
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage = tr("status.layerResized", { width, height });
    } else {
      this.statusMessage = tr("status.layerSizeUnchanged");
    }
    this.closeResizeDialog();
  }

  private resetCanvasTransform(): void {
    this.editMenuOpen = false;
    this.fileMenuOpen = false;
    this.engine?.resetViewTransform();
    this.statusMessage = tr("status.canvasTransformReset");
  }

  private registerActions(): void {
    // Rebuilt on every language change so palette names stay translated.
    this.actionRegistry = new GnumarusActionRegistry();
    this.actionRegistry.register({
      id: "reset-canvas-transform",
      name: tr("menu.resetCanvasTransform"),
      requirements: [],
      run: (): void => {
        this.resetCanvasTransform();
      },
    });
    this.actionRegistry.register({
      id: "new-project",
      name: tr("menu.newProject"),
      requirements: [],
      run: (): void => {
        void this.openNewDialog();
      },
    });
    this.actionRegistry.register({
      id: "open-project",
      name: tr("menu.openProject"),
      requirements: [],
      run: (): void => {
        void this.openProject();
      },
    });
    this.actionRegistry.register({
      id: "save-project",
      name: tr("menu.saveProject"),
      requirements: [],
      run: (): void => {
        void this.saveProject();
      },
    });
    this.actionRegistry.register({
      id: "import",
      name: tr("menu.import"),
      requirements: [],
      run: (): void => {
        void this.importImageFile();
      },
    });
    this.actionRegistry.register({
      id: "export",
      name: tr("menu.export"),
      requirements: [],
      run: (): void => {
        void this.openExportDialog();
      },
    });
    this.actionRegistry.register({
      id: "fit-all-textures-to-size",
      name: tr("action.fitAll"),
      requirements: [],
      run: (): void => {
        void this.openFitTextureDialogForAll();
      },
    });
    this.actionRegistry.register({
      id: "crop-all-cells-to-canvas",
      name: tr("action.cropAll"),
      requirements: [],
      run: (): void => {
        this.cropAllCellsToCanvas();
      },
    });
    this.actionRegistry.register({
      id: "reload-all-textures",
      name: tr("action.reloadAll"),
      requirements: [],
      run: (): void => {
        void this.reloadAllTextures();
      },
    });
  }

  private actionContext(): GnumarusActionContext {
    return {
      tool: this.tool,
      hasFloatingSelection: this.engine?.hasFloatingSelection() ?? false,
    };
  }

  /** Run a registered action by id; failures show an error toast with the reason. */
  runAction(id: string): boolean {
    const action = this.actionRegistry.get(id);
    if (action === undefined) {
      this.showToast(tr("action.unknown", { id }));
      return false;
    }
    const result = this.actionRegistry.execute(id, this.actionContext());
    if (!result.ok) {
      this.showToast(actionBlockedMessage(action.name, result.reasons, getActiveLocale()));
      return false;
    }
    return true;
  }

  private paletteResults(): GnumarusAction[] {
    return searchActions(this.actionRegistry.actions(), this.actionPaletteQuery);
  }

  private openActionPalette(): void {
    this.closeAllMenus();
    this.actionPaletteQuery = "";
    this.actionPaletteIndex = 0;
    this.requestUpdate();
    const dialog = this.shadowRoot?.getElementById("actionPaletteDialog") as HTMLDialogElement | null;
    dialog?.showModal();
    void this.updateComplete.then(() => {
      const input = this.shadowRoot?.getElementById("actionPaletteInput") as HTMLInputElement | null;
      input?.focus();
    });
  }

  private closeActionPalette(): void {
    const dialog = this.shadowRoot?.getElementById("actionPaletteDialog") as HTMLDialogElement | null;
    dialog?.close();
    this.actionPaletteQuery = "";
    this.actionPaletteIndex = 0;
  }

  private toggleActionPalette(): void {
    const dialog = this.shadowRoot?.getElementById("actionPaletteDialog") as HTMLDialogElement | null;
    if (dialog?.open === true) {
      this.closeActionPalette();
      return;
    }
    if (this.shadowRoot?.querySelector("dialog[open]") !== null) {
      return;
    }
    this.openActionPalette();
  }

  private executePaletteSelection(): void {
    const results = this.paletteResults();
    const selected = results[Math.min(this.actionPaletteIndex, results.length - 1)];
    if (selected === undefined) {
      return;
    }
    this.closeActionPalette();
    this.runAction(selected.id);
  }

  private scrollPaletteSelectionIntoView(): void {
    void this.updateComplete.then(() => {
      const selected = this.shadowRoot?.querySelector(".action-palette-list button.selected") ?? null;
      selected?.scrollIntoView({ block: "nearest" });
    });
  }

  private onActionPaletteKeyDown(event: KeyboardEvent): void {
    const results = this.paletteResults();
    if (event.key === "ArrowDown") {
      event.preventDefault();
      event.stopPropagation();
      this.actionPaletteIndex = results.length === 0 ? 0 : (this.actionPaletteIndex + 1) % results.length;
      this.scrollPaletteSelectionIntoView();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      event.stopPropagation();
      this.actionPaletteIndex =
        results.length === 0 ? 0 : (this.actionPaletteIndex - 1 + results.length) % results.length;
      this.scrollPaletteSelectionIntoView();
    } else if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      this.executePaletteSelection();
    } else if (event.key === "Escape") {
      event.stopPropagation();
      this.closeActionPalette();
    }
  }

  private doUndo(): void {
    this.editMenuOpen = false;
    this.fileMenuOpen = false;
    this.statusMessage = this.engine?.undo() === true ? tr("status.undo") : tr("status.nothingToUndo");
  }

  private doRedo(): void {
    this.editMenuOpen = false;
    this.fileMenuOpen = false;
    this.statusMessage = this.engine?.redo() === true ? tr("status.redo") : tr("status.nothingToRedo");
  }

  private openSettingsDialog(): void {
    this.editMenuOpen = false;
    this.fileMenuOpen = false;
    const dialog = this.shadowRoot?.getElementById("settingsDialog") as HTMLDialogElement | null;
    dialog?.showModal();
  }

  private closeSettingsDialog(): void {
    const dialog = this.shadowRoot?.getElementById("settingsDialog") as HTMLDialogElement | null;
    dialog?.close();
  }

  private loadCheckerSettings(): GnumarusCheckerSettings {
    try {
      const stored = window.localStorage.getItem(CHECKER_SETTINGS_STORAGE_KEY);
      if (stored !== null) {
        return parseCheckerSettings(stored);
      }
    } catch {
      // Corrupt or unavailable storage falls back to defaults.
    }
    return { ...DEFAULT_CHECKER_SETTINGS };
  }

  private loadGridSettings(): { minZoom: number; opacityPercent: number } {
    try {
      const stored = window.localStorage.getItem(GRID_SETTINGS_STORAGE_KEY);
      if (stored !== null) {
        return parseGridSettings(stored);
      }
    } catch {
      // Corrupt or unavailable storage falls back to defaults.
    }
    return { ...DEFAULT_GRID_SETTINGS };
  }

  private currentDialogGridMinZoom(): number {
    const input = this.shadowRoot?.getElementById("gridMinZoom") as HTMLInputElement | null;
    const percent = Number(input?.value ?? "1000") || 1000;
    const clampedPercent = Math.min(
      GNUMARUS_GRID_MAX_ZOOM * 100,
      Math.max(GNUMARUS_GRID_MIN_ZOOM * 100, Math.floor(percent)),
    );
    return clampGridMinZoom(clampedPercent / 100);
  }

  private applyGridFromDialog(): void {
    const minZoom = this.currentDialogGridMinZoom();
    this.gridMinZoom = minZoom;
    this.engine?.setGridMinZoom(minZoom);
    this.persistGrid();
    this.statusMessage = tr("status.gridMinZoom", { value: Math.round(minZoom * 100) });
  }

  private currentDialogGridOpacity(): number {
    const input = this.shadowRoot?.getElementById("gridOpacity") as HTMLInputElement | null;
    const percent = Number(input?.value ?? "100") || 0;
    return clampGridOpacityPercent(
      Math.min(GNUMARUS_GRID_MAX_OPACITY_PERCENT, Math.max(GNUMARUS_GRID_MIN_OPACITY_PERCENT, Math.floor(percent))),
    );
  }

  private applyGridOpacityFromDialog(): void {
    const opacity = this.currentDialogGridOpacity();
    this.gridOpacity = opacity;
    this.engine?.setGridOpacityPercent(opacity);
    this.persistGrid();
    this.statusMessage = tr("status.gridOpacity", { value: opacity });
  }

  /** Test hook: set the pixel grid opacity in percent (0..100, clamped). */
  setGridOpacityPercent(value: number): void {
    this.gridOpacity = clampGridOpacityPercent(value);
    this.engine?.setGridOpacityPercent(this.gridOpacity);
    this.persistGrid();
    this.statusMessage = tr("status.gridOpacity", { value: this.gridOpacity });
  }

  private loadRotationSettings(): { stepDeg: number } {
    try {
      const stored = window.localStorage.getItem(ROTATION_SETTINGS_STORAGE_KEY);
      if (stored !== null) {
        return parseRotationSettings(stored);
      }
    } catch {
      // Corrupt or unavailable storage falls back to defaults.
    }
    return { ...DEFAULT_ROTATION_SETTINGS };
  }

  private persistRotation(): void {
    try {
      window.localStorage.setItem(
        ROTATION_SETTINGS_STORAGE_KEY,
        serializeRotationSettings({ stepDeg: this.rotationStepDeg }),
      );
    } catch {
      // Storage failures must not break the settings flow.
    }
  }

  private currentDialogRotationStep(): number {
    const input = this.shadowRoot?.getElementById("rotationStep") as HTMLInputElement | null;
    const parsed = Number(input?.value ?? String(DEFAULT_ROTATION_SETTINGS.stepDeg));
    return clampRotationStepDeg(Number.isFinite(parsed) ? Math.floor(parsed) : DEFAULT_ROTATION_SETTINGS.stepDeg);
  }

  private applyRotationFromDialog(): void {
    const stepDeg = this.currentDialogRotationStep();
    this.rotationStepDeg = stepDeg;
    this.engine?.setRotationStepDeg(stepDeg);
    this.persistRotation();
    this.statusMessage = tr("status.rotationStep", { value: stepDeg });
  }

  private resetRotationStepToDefault(): void {
    this.rotationStepDeg = DEFAULT_ROTATION_SETTINGS.stepDeg;
    this.engine?.setRotationStepDeg(this.rotationStepDeg);
    this.persistRotation();
    this.statusMessage = tr("status.rotationStepReset");
  }

  private loadZoomSettings(): { minZoomPercent: number } {
    try {
      const stored = window.localStorage.getItem(ZOOM_SETTINGS_STORAGE_KEY);
      if (stored !== null) {
        return parseZoomSettings(stored);
      }
    } catch {
      // Corrupt or unavailable storage falls back to defaults.
    }
    return { ...DEFAULT_ZOOM_SETTINGS };
  }

  private persistZoom(): void {
    try {
      window.localStorage.setItem(
        ZOOM_SETTINGS_STORAGE_KEY,
        serializeZoomSettings({ minZoomPercent: this.zoomMinPercent }),
      );
    } catch {
      // Storage failures must not break the settings flow.
    }
  }

  private currentDialogZoomMinPercent(): number {
    const input = this.shadowRoot?.getElementById("zoomMinZoom") as HTMLInputElement | null;
    const parsed = Number(input?.value ?? String(DEFAULT_ZOOM_SETTINGS.minZoomPercent));
    return clampZoomMinPercent(Number.isFinite(parsed) ? Math.floor(parsed) : DEFAULT_ZOOM_SETTINGS.minZoomPercent);
  }

  private applyZoomMinFromDialog(): void {
    const minZoomPercent = this.currentDialogZoomMinPercent();
    this.zoomMinPercent = minZoomPercent;
    this.engine?.setViewMinZoom(minZoomPercent / 100);
    this.persistZoom();
    this.statusMessage = tr("status.zoomMin", { value: minZoomPercent });
  }

  private resetZoomMinToDefault(): void {
    this.zoomMinPercent = DEFAULT_ZOOM_SETTINGS.minZoomPercent;
    this.engine?.setViewMinZoom(this.zoomMinPercent / 100);
    this.persistZoom();
    this.statusMessage = tr("status.zoomMinReset");
  }

  private loadToastSettings(): { durationSec: number } {
    try {
      const stored = window.localStorage.getItem(TOAST_SETTINGS_STORAGE_KEY);
      if (stored !== null) {
        return parseToastSettings(stored);
      }
    } catch {
      // Corrupt or unavailable storage falls back to defaults.
    }
    return { ...DEFAULT_TOAST_SETTINGS };
  }

  private persistToast(): void {
    try {
      window.localStorage.setItem(
        TOAST_SETTINGS_STORAGE_KEY,
        serializeToastSettings({ durationSec: this.toastDurationSec }),
      );
    } catch {
      // Storage failures must not break the settings flow.
    }
  }

  private currentDialogToastDuration(): number {
    const input = this.shadowRoot?.getElementById("toastDuration") as HTMLInputElement | null;
    const parsed = Number(input?.value ?? String(DEFAULT_TOAST_SETTINGS.durationSec));
    return clampToastDurationSec(Number.isFinite(parsed) ? parsed : DEFAULT_TOAST_SETTINGS.durationSec);
  }

  private applyToastFromDialog(): void {
    this.toastDurationSec = this.currentDialogToastDuration();
    this.persistToast();
    this.statusMessage = tr("status.toastTime", { value: this.toastDurationSec });
  }

  private resetToastDurationToDefault(): void {
    this.toastDurationSec = DEFAULT_TOAST_SETTINGS.durationSec;
    this.persistToast();
    this.statusMessage = tr("status.toastReset");
  }

  /** Test hook: set the toast display time in seconds (0.5..2.0, clamped). */
  setToastDurationSec(value: number): void {
    this.toastDurationSec = clampToastDurationSec(value);
    this.persistToast();
    this.statusMessage = tr("status.toastTime", { value: this.toastDurationSec });
  }

  private loadLocaleSettings(): { locale: GnumarusLocaleSetting } {
    try {
      const stored = window.localStorage.getItem(LOCALE_SETTINGS_STORAGE_KEY);
      if (stored !== null) {
        return parseLocaleSettings(stored);
      }
    } catch {
      // Corrupt or unavailable storage falls back to defaults.
    }
    return { ...DEFAULT_LOCALE_SETTINGS };
  }

  private persistLocale(): void {
    try {
      window.localStorage.setItem(
        LOCALE_SETTINGS_STORAGE_KEY,
        serializeLocaleSettings({ locale: this.locale }),
      );
    } catch {
      // Storage failures must not break the settings flow.
    }
  }

  /** Resolve the language setting, publish it, and refresh translated UI. */
  private applyActiveLocale(): GnumarusLocale {
    const resolved = resolveLocale(this.locale);
    setActiveLocale(resolved);
    try {
      document.documentElement.lang = resolved;
    } catch {
      // Non-DOM environments (unit tests) have no document.
    }
    this.registerActions();
    const pickers = this.shadowRoot?.querySelectorAll("gnumarus-color-picker");
    pickers?.forEach((picker) => {
      (picker as unknown as LitElement).requestUpdate();
    });
    return resolved;
  }

  private currentDialogLocale(): GnumarusLocaleSetting {
    const select = this.shadowRoot?.getElementById("localeSelect") as HTMLSelectElement | null;
    return parseLocaleSetting(select?.value ?? this.locale);
  }

  private localeDisplayName(locale: GnumarusLocale): string {
    return tr(locale === "pt-BR" ? "locale.portuguese" : "locale.english");
  }

  private applyLocaleFromDialog(): void {
    this.locale = this.currentDialogLocale();
    this.persistLocale();
    const resolved = this.applyActiveLocale();
    this.statusMessage = tr("status.language", { value: this.localeDisplayName(resolved) });
  }

  private resetLocaleToDefault(): void {
    this.locale = DEFAULT_LOCALE_SETTINGS.locale;
    this.persistLocale();
    this.applyActiveLocale();
    this.statusMessage = tr("status.languageReset");
  }

  /** Test hook: set the UI language (`system`, `en` or `pt-BR`). */
  setLocale(value: GnumarusLocaleSetting): void {
    this.locale = parseLocaleSetting(value);
    this.persistLocale();
    const resolved = this.applyActiveLocale();
    this.statusMessage = tr("status.language", { value: this.localeDisplayName(resolved) });
  }

  private loadFitSettings(): { alphaThreshold: number } {
    try {
      const stored = window.localStorage.getItem(FIT_SETTINGS_STORAGE_KEY);
      if (stored !== null) {
        return parseFitSettings(stored);
      }
    } catch {
      // Corrupt or unavailable storage falls back to defaults.
    }
    return { ...DEFAULT_FIT_SETTINGS };
  }

  private persistFit(): void {
    try {
      window.localStorage.setItem(
        FIT_SETTINGS_STORAGE_KEY,
        serializeFitSettings({ alphaThreshold: this.fitDefaultThreshold }),
      );
    } catch {
      // Storage failures must not break the settings flow.
    }
  }

  private currentDialogFitThreshold(): number {
    const input = this.shadowRoot?.getElementById("fitDefaultThreshold") as HTMLInputElement | null;
    const parsed = Number(input?.value ?? String(DEFAULT_FIT_SETTINGS.alphaThreshold));
    return clampFitAlphaThreshold(Number.isFinite(parsed) ? parsed : DEFAULT_FIT_SETTINGS.alphaThreshold);
  }

  private applyFitFromDialog(): void {
    this.fitDefaultThreshold = this.currentDialogFitThreshold();
    this.persistFit();
    this.statusMessage = tr("status.fitThreshold", { value: this.fitDefaultThreshold });
  }

  private resetFitToDefault(): void {
    this.fitDefaultThreshold = DEFAULT_FIT_SETTINGS.alphaThreshold;
    this.persistFit();
    this.statusMessage = tr("status.fitReset");
  }

  /** Test hook: set the fit texture default alpha threshold (0..254, clamped). */
  setFitDefaultThreshold(value: number): void {
    this.fitDefaultThreshold = clampFitAlphaThreshold(value);
    this.persistFit();
    this.statusMessage = tr("status.fitThreshold", { value: this.fitDefaultThreshold });
  }

  private loadStorageSettings(): GnumarusStorageSettings {
    try {
      const stored = window.localStorage.getItem(STORAGE_SETTINGS_STORAGE_KEY);
      if (stored !== null) {
        return parseStorageSettings(stored);
      }
    } catch {
      // Corrupt or unavailable storage falls back to defaults.
    }
    return { ...DEFAULT_STORAGE_SETTINGS };
  }

  private persistStorage(): void {
    try {
      window.localStorage.setItem(
        STORAGE_SETTINGS_STORAGE_KEY,
        serializeStorageSettings({
          format: this.storageFormat,
          lossless: this.storageLossless,
          quality: this.storageQuality,
          pngLevel: this.storagePngLevel,
          jpgQuality: this.storageJpegQuality,
          brushQuality: this.brushQuality,
          projectFile: this.storageProjectFile,
        }),
      );
    } catch {
      // Storage failures must not break the settings flow.
    }
  }

  private storageIsDefault(): boolean {
    return (
      this.storageFormat === DEFAULT_STORAGE_SETTINGS.format &&
      this.storageLossless === DEFAULT_STORAGE_SETTINGS.lossless &&
      this.storageQuality === DEFAULT_STORAGE_SETTINGS.quality &&
      this.storagePngLevel === DEFAULT_STORAGE_SETTINGS.pngLevel &&
      this.storageJpegQuality === DEFAULT_STORAGE_SETTINGS.jpgQuality &&
      this.brushQuality === DEFAULT_STORAGE_SETTINGS.brushQuality &&
      this.storageProjectFile === DEFAULT_STORAGE_SETTINGS.projectFile
    );
  }

  private currentDialogProjectFile(): GnumarusProjectFileFormat {
    const input = this.shadowRoot?.getElementById("storageProjectFile") as HTMLSelectElement | null;
    return parseProjectFileFormat(input?.value ?? this.storageProjectFile);
  }

  private currentDialogStorageFormat(): GnumarusStorageFormat {
    const input = this.shadowRoot?.getElementById("storageFormat") as HTMLSelectElement | null;
    return parseStorageFormat(input?.value ?? this.storageFormat);
  }

  private currentDialogStorageLossless(): boolean {
    const input = this.shadowRoot?.getElementById("storageJxlMode") as HTMLSelectElement | null;
    if (input === null) {
      return this.storageLossless;
    }
    return input.value !== "lossy";
  }

  private currentDialogStorageQuality(): number {
    const input = this.shadowRoot?.getElementById("storageQuality") as HTMLInputElement | null;
    if (input === null) {
      return this.storageQuality;
    }
    const raw = Number(input.value);
    return clampStorageQuality(Number.isFinite(raw) ? Math.floor(raw) : DEFAULT_STORAGE_SETTINGS.quality);
  }

  private currentDialogStoragePngLevel(): number {
    const input = this.shadowRoot?.getElementById("storagePngLevel") as HTMLInputElement | null;
    if (input === null) {
      return this.storagePngLevel;
    }
    const raw = Number(input.value);
    return clampStoragePngLevel(Number.isFinite(raw) ? Math.floor(raw) : DEFAULT_STORAGE_SETTINGS.pngLevel);
  }

  private currentDialogStorageJpegQuality(): number {
    const input = this.shadowRoot?.getElementById("storageJpegQuality") as HTMLInputElement | null;
    if (input === null) {
      return this.storageJpegQuality;
    }
    const raw = Number(input.value);
    return clampStorageJpgQuality(Number.isFinite(raw) ? Math.floor(raw) : DEFAULT_STORAGE_SETTINGS.jpgQuality);
  }

  private storageStatusMessage(): string {
    if (this.storageFormat === "png") {
      return tr("status.storagePng", { value: this.storagePngLevel });
    }
    if (this.storageFormat === "jpg") {
      return tr("status.storageJpeg", { value: this.storageJpegQuality });
    }
    const format = this.storageFormat === "webp" ? "WebP" : "JXL";
    return this.storageLossless
      ? tr("status.storageLossless", { format })
      : tr("status.storageLossy", { format, value: this.storageQuality });
  }

  /** Translated display label for a brush-shape value. */
  private shapeLabel(shape: string): string {
    return tr(shape === "square" ? "val.square" : "val.circle");
  }

  /** Translated display label for a paint blend mode. */
  private blendLabel(mode: string): string {
    if (mode === "copy") {
      return tr("val.copy");
    }
    return tr(mode === "eraser" ? "val.eraser" : "val.normal");
  }

  /** Translated display label for a pressure-response value. */
  private pressureLabel(response: string): string {
    if (response === "size") {
      return tr("val.size");
    }
    if (response === "opacity") {
      return tr("val.opacity");
    }
    if (response === "size+opacity") {
      return tr("val.sizeOpacity");
    }
    return tr("val.none");
  }

  /** Translated display label for a pressure-curve value. */
  private curveLabel(curve: string): string {
    if (curve === "soft") {
      return tr("val.soft");
    }
    return tr(curve === "firm" ? "val.firm" : "val.linear");
  }

  /** Translated display label for a stabilizer mode. */
  private stabilizerLabel(mode: string): string {
    if (mode === "rope") {
      return tr("val.rope");
    }
    return tr(mode === "follow" ? "val.follow" : "val.none");
  }

  /** Translated display label for a brush-tip kind. */
  private tipKindLabel(kind: string): string {
    if (kind === "soft") {
      return tr("val.softRound");
    }
    return tr(kind === "image" ? "val.image" : "val.pixelHard");
  }

  /** Translated display label for a tip-angle mode. */
  private tipAngleLabel(mode: string): string {
    return tr(mode === "direction" ? "val.followDirection" : "val.none");
  }

  /** Translated display label for a symmetry mode. */
  private symmetryLabel(mode: string): string {
    if (mode === "mirror-x") {
      return tr("val.leftRight");
    }
    if (mode === "mirror-y") {
      return tr("val.upDown");
    }
    return tr(mode === "both" ? "val.fourWay" : "val.off");
  }

  /** Translated display label for a wrap mode. */
  private wrapLabel(mode: string): string {
    if (mode === "x") {
      return tr("val.leftRight");
    }
    if (mode === "y") {
      return tr("val.upDown");
    }
    return tr(mode === "both" ? "val.both" : "val.off");
  }

  /** Translated display label for an import-cleanup mode. */
  private cleanupLabel(mode: string): string {
    if (mode === "fit") {
      return tr("setting.cleanupFit");
    }
    if (mode === "crop") {
      return tr("setting.cleanupCrop");
    }
    if (mode === "crop+fit") {
      return tr("setting.cleanupCropFit");
    }
    return tr("val.none");
  }

  /** Translated on/off word. */
  private onOffLabel(enabled: boolean): string {
    return tr(enabled ? "common.on" : "common.off");
  }

  private currentDialogBrushQuality(): number {
    const input = this.shadowRoot?.getElementById("brushQuality") as HTMLInputElement | null;
    if (input === null) {
      return this.brushQuality;
    }
    const raw = Number(input.value);
    return clampBrushQuality(Number.isFinite(raw) ? Math.floor(raw) : DEFAULT_STORAGE_SETTINGS.brushQuality);
  }

  private applyStorageFromDialog(): void {
    this.storageProjectFile = this.currentDialogProjectFile();
    this.storageFormat = this.currentDialogStorageFormat();
    this.storageLossless = this.currentDialogStorageLossless();
    this.storageQuality = this.currentDialogStorageQuality();
    this.storagePngLevel = this.currentDialogStoragePngLevel();
    this.storageJpegQuality = this.currentDialogStorageJpegQuality();
    this.brushQuality = this.currentDialogBrushQuality();
    this.persistStorage();
    this.statusMessage = this.storageStatusMessage();
  }

  private resetStorageToDefault(): void {
    this.storageLossless = DEFAULT_STORAGE_SETTINGS.lossless;
    this.storageQuality = DEFAULT_STORAGE_SETTINGS.quality;
    this.storageFormat = DEFAULT_STORAGE_SETTINGS.format;
    this.storagePngLevel = DEFAULT_STORAGE_SETTINGS.pngLevel;
    this.storageJpegQuality = DEFAULT_STORAGE_SETTINGS.jpgQuality;
    this.storageProjectFile = DEFAULT_STORAGE_SETTINGS.projectFile;
    this.brushQuality = DEFAULT_STORAGE_SETTINGS.brushQuality;
    this.persistStorage();
    this.statusMessage = tr("status.storageReset");
  }

  /** Test hook: set project texture storage (format, JXL mode/quality, PNG level, JPEG quality, brush JXL quality). */
  setProjectStorage(
    lossless: boolean,
    quality: number,
    format: GnumarusStorageFormat = DEFAULT_STORAGE_SETTINGS.format,
    pngLevel = DEFAULT_STORAGE_SETTINGS.pngLevel,
    jpgQuality = DEFAULT_STORAGE_SETTINGS.jpgQuality,
    brushQuality = DEFAULT_STORAGE_SETTINGS.brushQuality,
    projectFile: GnumarusProjectFileFormat = DEFAULT_STORAGE_SETTINGS.projectFile,
  ): void {
    this.storageProjectFile = parseProjectFileFormat(projectFile);
    this.storageFormat = parseStorageFormat(format);
    this.storageLossless = lossless;
    this.storageQuality = clampStorageQuality(quality);
    this.storagePngLevel = clampStoragePngLevel(pngLevel);
    this.storageJpegQuality = clampStorageJpgQuality(jpgQuality);
    this.brushQuality = clampBrushQuality(brushQuality);
    this.persistStorage();
    this.statusMessage = this.storageStatusMessage();
  }

  /** Test hook: set the brush tip JXL quality (0..100, lossy). */
  setBrushQuality(quality: number): void {
    this.brushQuality = clampBrushQuality(quality);
    this.persistStorage();
    this.statusMessage = tr("status.brushQuality", { value: this.brushQuality });
  }

  private loadImportCleanup(): GnumarusImportCleanup {
    try {
      const stored = window.localStorage.getItem(IMPORT_CLEANUP_STORAGE_KEY);
      if (stored !== null) {
        return parseImportCleanupSettings(stored);
      }
    } catch {
      // Corrupt or unavailable storage falls back to defaults.
    }
    return DEFAULT_IMPORT_CLEANUP;
  }

  private persistImportCleanup(): void {
    try {
      window.localStorage.setItem(IMPORT_CLEANUP_STORAGE_KEY, serializeImportCleanupSettings(this.importCleanup));
    } catch {
      // Storage failures must not break the settings flow.
    }
  }

  /** Test hook: set the texture cleanup applied on open/import. */
  setImportCleanup(mode: GnumarusImportCleanup): void {
    this.importCleanup = parseImportCleanup(mode);
    this.persistImportCleanup();
    this.statusMessage = tr("status.cleanup", { value: this.cleanupLabel(this.importCleanup) });
  }

  private applyImportCleanupFromDialog(): void {
    const select = this.shadowRoot?.getElementById("importCleanup") as HTMLSelectElement | null;
    this.importCleanup = parseImportCleanup(select?.value ?? DEFAULT_IMPORT_CLEANUP);
    this.persistImportCleanup();
    this.statusMessage = tr("status.cleanup", { value: this.cleanupLabel(this.importCleanup) });
  }

  private resetImportCleanupToDefault(): void {
    this.importCleanup = DEFAULT_IMPORT_CLEANUP;
    this.persistImportCleanup();
    this.statusMessage = tr("status.cleanupReset");
  }

  /**
   * Run the configured texture cleanup right after a project open or file
   * import: `crop` crops every texture to the canvas, `fit` removes fully
   * transparent borders (threshold 0), `crop+fit` runs both in that order.
   * Returns a status suffix ("" when nothing changed).
   */
  private applyImportCleanup(): string {
    if (this.engine === null || this.importCleanup === "none") {
      return "";
    }
    const parts: string[] = [];
    if (this.importCleanup === "crop" || this.importCleanup === "crop+fit") {
      const cropped = this.engine.cropAllCellsToCanvas();
      if (cropped.cropped > 0) {
        parts.push(tr("cleanup.croppedPart", { count: cropped.cropped }));
      }
    }
    if (this.importCleanup === "fit" || this.importCleanup === "crop+fit") {
      const fitted = this.engine.fitAllTexturesToSize(0);
      if (fitted.fitted > 0) {
        parts.push(tr("cleanup.fittedPart", { count: fitted.fitted }));
      }
    }
    if (parts.length === 0) {
      return "";
    }
    this.refreshLayers();
    this.dirty = true;
    return ` (${parts.join(", ")})`;
  }

  private loadExpandSettings(): { step: number } {
    try {
      const stored = window.localStorage.getItem(EXPAND_SETTINGS_STORAGE_KEY);
      if (stored !== null) {
        return parseExpandSettings(stored);
      }
    } catch {
      // Corrupt or unavailable storage falls back to defaults.
    }
    return { ...DEFAULT_EXPAND_SETTINGS };
  }

  private persistExpand(): void {
    try {
      window.localStorage.setItem(
        EXPAND_SETTINGS_STORAGE_KEY,
        serializeExpandSettings({ step: this.expandStep }),
      );
    } catch {
      // Storage failures must not break the settings flow.
    }
  }

  private currentDialogExpandStep(): number {
    const input = this.shadowRoot?.getElementById("expandStep") as HTMLInputElement | null;
    const parsed = Number(input?.value ?? String(DEFAULT_EXPAND_SETTINGS.step));
    return clampExpandStep(Number.isFinite(parsed) ? parsed : DEFAULT_EXPAND_SETTINGS.step);
  }

  private applyExpandFromDialog(): void {
    this.expandStep = this.currentDialogExpandStep();
    this.persistExpand();
    this.statusMessage = tr("status.expandStep", { value: this.expandStep });
  }

  private resetExpandToDefault(): void {
    this.expandStep = DEFAULT_EXPAND_SETTINGS.step;
    this.persistExpand();
    this.statusMessage = tr("status.expandReset");
  }

  /** Test hook: set the cell texture expand step in pixels (1..1024, clamped). */
  setExpandStep(value: number): void {
    this.expandStep = clampExpandStep(value);
    this.persistExpand();
    this.statusMessage = tr("status.expandStep", { value: this.expandStep });
  }

  /** Test hook: rename a frame (trimmed 1..64 chars). */
  renameFrame(frame: number, name: string): boolean {
    if (this.engine?.renameFrame(frame, name) === true) {
      this.dirty = true;
      this.statusMessage = tr("status.frameRenamed");
      this.refreshLayers();
      return true;
    }
    return false;
  }

  private loadBackgroundSettings(): GnumarusBackgroundSettings {
    try {
      const stored = window.localStorage.getItem(BACKGROUND_SETTINGS_STORAGE_KEY);
      if (stored !== null) {
        return parseBackgroundSettings(stored);
      }
    } catch {
      // Corrupt or unavailable storage falls back to defaults.
    }
    return { ...DEFAULT_BACKGROUND_SETTINGS };
  }

  private persistBackground(): void {
    try {
      window.localStorage.setItem(
        BACKGROUND_SETTINGS_STORAGE_KEY,
        serializeBackgroundSettings({ mode: this.backgroundMode, color: this.backgroundColor }),
      );
    } catch {
      // Storage failures must not break the settings flow.
    }
  }

  private persistChecker(): void {
    try {
      window.localStorage.setItem(
        CHECKER_SETTINGS_STORAGE_KEY,
        serializeCheckerSettings({
          mode: this.checkerMode,
          sizeX: this.checkerSizeX,
          sizeY: this.checkerSizeY,
          colorA: this.checkerColorA,
          colorB: this.checkerColorB,
        }),
      );
    } catch {
      // Storage failures must not break the settings flow.
    }
  }

  private persistGrid(): void {
    try {
      window.localStorage.setItem(
        GRID_SETTINGS_STORAGE_KEY,
        serializeGridSettings({ minZoom: this.gridMinZoom, opacityPercent: this.gridOpacity }),
      );
    } catch {
      // Storage failures must not break the settings flow.
    }
  }

  private currentDialogBackground(): GnumarusBackgroundSettings {
    const modeInput = this.shadowRoot?.getElementById("backgroundMode") as HTMLSelectElement | null;
    const colorInput = this.shadowRoot?.getElementById("backgroundColor") as HTMLInputElement | null;
    const mode: GnumarusBackgroundMode = modeInput?.value === "solid" ? "solid" : "checkerboard";
    const raw = colorInput?.value ?? this.backgroundColor;
    return { mode, color: typeof raw === "string" ? raw.slice(0, 7) : this.backgroundColor };
  }

  private applyBackgroundFromDialog(): void {
    const settings = this.currentDialogBackground();
    this.backgroundMode = settings.mode;
    this.backgroundColor = settings.color;
    this.engine?.applyBackgroundSettings(settings);
    this.persistBackground();
    void this.refreshPreview();
    this.statusMessage =
      settings.mode === "solid" ? `Canvas background: solid ${settings.color}` : "Canvas background: checkerboard";
  }

  private resetBackgroundModeToDefault(): void {
    this.backgroundMode = DEFAULT_BACKGROUND_SETTINGS.mode;
    this.engine?.setBackgroundMode(this.backgroundMode);
    this.persistBackground();
    void this.refreshPreview();
    this.statusMessage = tr("status.bgModeReset");
  }

  private resetBackgroundColorToDefault(): void {
    this.backgroundColor = DEFAULT_BACKGROUND_SETTINGS.color;
    this.engine?.setBackgroundColor(this.backgroundColor);
    this.persistBackground();
    void this.refreshPreview();
    this.statusMessage = tr("status.bgColorReset");
  }

  private resetCheckerModeToDefault(): void {
    this.checkerMode = DEFAULT_CHECKER_SETTINGS.mode;
    this.engine?.applyCheckerSettings({
      mode: this.checkerMode,
      sizeX: this.checkerSizeX,
      sizeY: this.checkerSizeY,
      colorA: this.checkerColorA,
      colorB: this.checkerColorB,
    });
    this.persistChecker();
    void this.refreshPreview();
    this.statusMessage = tr("status.checkerModeReset");
  }

  private resetCheckerSizeXToDefault(): void {
    this.checkerSizeX = DEFAULT_CHECKER_SETTINGS.sizeX;
    this.engine?.applyCheckerSettings({
      mode: this.checkerMode,
      sizeX: this.checkerSizeX,
      sizeY: this.checkerSizeY,
      colorA: this.checkerColorA,
      colorB: this.checkerColorB,
    });
    this.persistChecker();
    void this.refreshPreview();
    this.statusMessage = tr("status.checkerWidthReset");
  }

  private resetCheckerSizeYToDefault(): void {
    this.checkerSizeY = DEFAULT_CHECKER_SETTINGS.sizeY;
    this.engine?.applyCheckerSettings({
      mode: this.checkerMode,
      sizeX: this.checkerSizeX,
      sizeY: this.checkerSizeY,
      colorA: this.checkerColorA,
      colorB: this.checkerColorB,
    });
    this.persistChecker();
    void this.refreshPreview();
    this.statusMessage = tr("status.checkerHeightReset");
  }

  private resetCheckerColorAToDefault(): void {
    this.checkerColorA = DEFAULT_CHECKER_SETTINGS.colorA;
    this.engine?.applyCheckerSettings({
      mode: this.checkerMode,
      sizeX: this.checkerSizeX,
      sizeY: this.checkerSizeY,
      colorA: this.checkerColorA,
      colorB: this.checkerColorB,
    });
    this.persistChecker();
    void this.refreshPreview();
    this.statusMessage = tr("status.checkerColorAReset");
  }

  private resetCheckerColorBToDefault(): void {
    this.checkerColorB = DEFAULT_CHECKER_SETTINGS.colorB;
    this.engine?.applyCheckerSettings({
      mode: this.checkerMode,
      sizeX: this.checkerSizeX,
      sizeY: this.checkerSizeY,
      colorA: this.checkerColorA,
      colorB: this.checkerColorB,
    });
    this.persistChecker();
    void this.refreshPreview();
    this.statusMessage = tr("status.checkerColorBReset");
  }

  /** Test and picker hook: set the pencil color from any parseable hex. */
  setPencilColor(hex: string): void {
    const parsed = parseHexToRgbaBytes(hex);
    if (parsed === null) {
      return;
    }
    this.colorValue = rgbaBytesToHex(parsed);
    this.engine?.setColor(this.colorValue);
  }

  /** Test hook: set the brush size (floats 0.1..64, clamped). */
  setBrushSize(size: number): void {
    const clamped = clampBrushSizeFloat(size);
    this.brushSize = clamped;
    this.engine?.setBrushSize(clamped);
    this.statusMessage = tr("status.brushSize", { value: clamped });
  }

  /** Test hook: set the brush shape (square/circle, defaults to circle). */
  setBrushShape(shape: GnumarusBrushShape): void {
    const parsed = parseBrushShape(shape);
    this.brushShape = parsed;
    this.engine?.setBrushShape(parsed);
    this.statusMessage = tr("status.brushShape", { value: this.shapeLabel(parsed) });
  }

  /** Test hook: set the brush pressure response (none/size/opacity/size+opacity). */
  setPressureResponse(response: GnumarusPressureResponse): void {
    const parsed = parsePressureResponse(response);
    this.pressureResponse = parsed;
    this.engine?.setPressureResponse(parsed);
    this.statusMessage = tr("status.pressure", { value: this.pressureLabel(parsed) });
  }

  /** Test hook: set the brush tip kind (pixel/soft/image). */
  setBrushTipKind(kind: GnumarusBrushTipKind): void {
    const parsed = parseBrushTipKind(kind);
    this.brushTipKind = parsed;
    this.engine?.setBrushTipKind(parsed);
    this.statusMessage = tr("status.brushTip", { value: this.tipKindLabel(parsed) });
  }

  /** Test hook: set the paint tip softness (0..100 percent, clamped). */
  setBrushHardness(percent: number): void {
    const clamped = clampBrushHardness(Number.isFinite(percent) ? percent / 100 : DEFAULT_BRUSH_HARDNESS);
    this.brushHardness = clamped;
    this.engine?.setBrushHardness(clamped);
    this.statusMessage = tr("status.softness", { value: Math.round(clamped * 100) });
  }

  /** Test hook: set the dab spacing (5..400 percent of the diameter, clamped). */
  setBrushSpacing(percent: number): void {
    const clamped = clampBrushSpacing(Number.isFinite(percent) ? percent / 100 : DEFAULT_BRUSH_SPACING);
    this.brushSpacing = clamped;
    this.engine?.setBrushSpacing(clamped);
    this.statusMessage = tr("status.spacing", { value: Math.round(clamped * 100) });
  }

  /**
   * Test hook: install an image tip from raw RGBA pixels (row-major).
   * The pixels are auto-fitted (alpha threshold 0) and archived as JXL.
   * Returns false for invalid dimensions or buffers.
   */
  setPaintTipFromPixels(width: number, height: number, rgba: number[]): boolean {
    return this.installImageTip("tip", `${width}x${height} tip`, new Uint8ClampedArray(rgba), width, height);
  }

  /** Clear the installed image tip (painting with the image kind then lays nothing). */
  clearPaintTip(): void {
    this.engine?.setPaintTipImage(null);
    this.paintTipName = "";
    this.statusMessage = tr("status.imageTipCleared");
  }

  private openPaintTipPicker(): void {
    const input = this.shadowRoot?.getElementById("paintTipImport") as HTMLInputElement | null;
    input?.click();
  }

  private async importPaintTipFromDialog(): Promise<void> {
    const input = this.shadowRoot?.getElementById("paintTipImport") as HTMLInputElement | null;
    const file = input?.files?.[0];
    input?.removeAttribute("value");
    if (input !== null) {
      input.value = "";
    }
    if (file === undefined) {
      return;
    }
    try {
      const decoded = await decodePngToBuffer(file);
      const scale = Math.min(1, 128 / Math.max(decoded.width, decoded.height));
      const targetWidth = Math.max(1, Math.floor(decoded.width * scale)) || 1;
      const targetHeight = Math.max(1, Math.floor(decoded.height * scale)) || 1;
      let pixels = decoded.buffer;
      if (targetWidth !== decoded.width || targetHeight !== decoded.height) {
        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const context = canvas.getContext("2d");
        if (context === null) {
          throw new Error("2D canvas is unavailable for tip import.");
        }
        const source = document.createElement("canvas");
        source.width = decoded.width;
        source.height = decoded.height;
        const sourceContext = source.getContext("2d");
        if (sourceContext === null) {
          throw new Error("2D canvas is unavailable for tip import.");
        }
        sourceContext.putImageData(
          new ImageData(new Uint8ClampedArray(decoded.buffer), decoded.width, decoded.height),
          0,
          0,
        );
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        context.drawImage(source, 0, 0, targetWidth, targetHeight);
        pixels = context.getImageData(0, 0, targetWidth, targetHeight).data as Uint8ClampedArray;
      }
      const tip = paintTipImageFromRgba(new Uint8ClampedArray(pixels), targetWidth, targetHeight);
      if (tip === null) {
        throw new Error("Tip image has no pixels.");
      }
      this.installImageTip("tip", file.name, new Uint8ClampedArray(pixels), targetWidth, targetHeight);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.statusMessage = tr("status.tipImportFailed", { reason });
    }
  }

  /**
   * Fit brush pixels (alpha threshold 0), install them as an image or dual
   * tip, and archive the fitted pixels as lossy JXL under OPFS `brushes/`.
   * Returns false for invalid dimensions or buffers.
   */
  private installImageTip(
    kind: "tip" | "dual",
    fileLabel: string,
    buffer: Uint8ClampedArray,
    width: number,
    height: number,
  ): boolean {
    let pixels = buffer;
    let fittedWidth = width;
    let fittedHeight = height;
    const box = findAlphaBoundingBox(buffer, width, height, 0);
    if (box !== null && (box.width !== width || box.height !== height)) {
      const cropped = cropBufferBox(buffer, width, height, box.left, box.top, box.width, box.height);
      if (cropped !== null) {
        pixels = cropped.buffer;
        fittedWidth = cropped.width;
        fittedHeight = cropped.height;
      }
    }
    const tip = paintTipImageFromRgba(new Uint8ClampedArray(pixels), fittedWidth, fittedHeight);
    if (tip === null) {
      return false;
    }
    const stored = { width: tip.width, height: tip.height, alpha: tip.alpha };
    const label = `${fileLabel} (${fittedWidth}x${fittedHeight})`;
    if (kind === "tip") {
      this.engine?.setPaintTipImage(stored);
      this.paintTipName = label;
      this.statusMessage = tr("status.imageTipName", { value: label });
    } else {
      this.engine?.setPaintDualTip(stored);
      this.paintDualName = label;
      this.statusMessage = tr("status.dualTipName", { value: label });
    }
    void this.archiveBrushTip(fileLabel, fittedWidth, fittedHeight, new Uint8ClampedArray(pixels));
    return true;
  }

  /** Best-effort JXL archive of fitted brush pixels under OPFS `brushes/`. */
  private async archiveBrushTip(
    fileLabel: string,
    width: number,
    height: number,
    buffer: Uint8ClampedArray,
  ): Promise<void> {
    try {
      const storage = navigator.storage as unknown as { getDirectory?: () => Promise<unknown> } | undefined;
      if (typeof storage?.getDirectory !== "function") {
        return;
      }
      const root = (await storage.getDirectory()) as unknown as {
        getDirectoryHandle: (
          name: string,
          options?: { create?: boolean },
        ) => Promise<{
          getFileHandle: (
            name: string,
            options?: { create?: boolean },
          ) => Promise<{
            createWritable: () => Promise<{
              write: (data: Blob) => Promise<void>;
              close: () => Promise<void>;
            }>;
          }>;
        }>;
      };
      if (typeof root.getDirectoryHandle !== "function") {
        return;
      }
      const brushes = await root.getDirectoryHandle("brushes", { create: true });
      const safe =
        fileLabel.replace(/[^a-zA-Z0-9-_]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 48) || "tip";
      const handle = await brushes.getFileHandle(`${safe}.jxl`, { create: true });
      const writable = await handle.createWritable();
      const bytes = await encodeJxlStill(buffer, width, height, {
        lossless: false,
        quality: this.brushQuality,
        effort: JXL_STORAGE_EFFORT,
      });
      await writable.write(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "image/jxl" }));
      await writable.close();
    } catch {
      // Best effort: tips work from memory even when the archive fails.
    }
  }

  private currentDialogBrushSize(): number {
    const input = this.shadowRoot?.getElementById("brushSize") as HTMLInputElement | null;
    const parsed = Number(input?.value ?? "1");
    return clampBrushSizeFloat(Number.isFinite(parsed) ? parsed : 1);
  }

  private currentDialogBrushShape(): GnumarusBrushShape {
    const select = this.shadowRoot?.getElementById("brushShape") as HTMLSelectElement | null;
    return parseBrushShape(select?.value ?? "square");
  }

  private applyBrushSizeFromDialog(): void {
    const size = this.currentDialogBrushSize();
    this.brushSize = size;
    this.engine?.setBrushSize(size);
    this.statusMessage = tr("status.brushSize", { value: size });
  }

  private applyColorThresholdFromDialog(): void {
    const input = this.shadowRoot?.getElementById("colorThreshold") as HTMLInputElement | null;
    const raw = Math.floor(Number(input?.value));
    const value = Number.isFinite(raw) ? Math.min(100, Math.max(0, raw)) : this.colorThreshold;
    this.colorThreshold = value;
    this.engine?.setColorThreshold(value);
  }

  private applyColorContiguousFromDialog(): void {
    const input = this.shadowRoot?.getElementById("colorContiguous") as HTMLInputElement | null;
    const value = input?.checked ?? this.colorContiguous;
    this.colorContiguous = value;
    this.engine?.setColorContiguous(value);
  }

  private applyBrushShapeFromDialog(): void {
    const shape = this.currentDialogBrushShape();
    this.brushShape = shape;
    this.engine?.setBrushShape(shape);
    this.statusMessage = tr("status.brushShape", { value: this.shapeLabel(shape) });
  }

  private currentDialogBrushTipKind(): GnumarusBrushTipKind {
    const select = this.shadowRoot?.getElementById("brushTipKind") as HTMLSelectElement | null;
    return parseBrushTipKind(select?.value ?? "pixel");
  }

  private applyBrushTipKindFromDialog(): void {
    const kind = this.currentDialogBrushTipKind();
    this.brushTipKind = kind;
    this.engine?.setBrushTipKind(kind);
    this.statusMessage = tr("status.brushTip", { value: this.tipKindLabel(kind) });
  }

  private applyBrushHardnessFromDialog(): void {
    const input = this.shadowRoot?.getElementById("brushHardness") as HTMLInputElement | null;
    const raw = Number(input?.value ?? String(DEFAULT_BRUSH_HARDNESS * 100));
    const clamped = clampBrushHardness(Number.isFinite(raw) ? raw / 100 : DEFAULT_BRUSH_HARDNESS);
    this.brushHardness = clamped;
    this.engine?.setBrushHardness(clamped);
    this.statusMessage = tr("status.softness", { value: Math.round(clamped * 100) });
  }

  private applyBrushSpacingFromDialog(): void {
    const input = this.shadowRoot?.getElementById("brushSpacing") as HTMLInputElement | null;
    const raw = Number(input?.value ?? String(DEFAULT_BRUSH_SPACING * 100));
    const clamped = clampBrushSpacing(Number.isFinite(raw) ? raw / 100 : DEFAULT_BRUSH_SPACING);
    this.brushSpacing = clamped;
    this.engine?.setBrushSpacing(clamped);
    this.statusMessage = tr("status.spacing", { value: Math.round(clamped * 100) });
  }

  /** Test hook: set the per-dab flow (1..100 percent, clamped). */
  setBrushFlow(percent: number): void {
    const clamped = clampBrushFlow(Number.isFinite(percent) ? percent / 100 : DEFAULT_BRUSH_FLOW);
    this.brushFlow = clamped;
    this.engine?.setBrushFlow(clamped);
    this.statusMessage = tr("status.flow", { value: Math.round(clamped * 100) });
  }

  private applyBrushFlowFromDialog(): void {
    const input = this.shadowRoot?.getElementById("brushFlow") as HTMLInputElement | null;
    const raw = Number(input?.value ?? String(DEFAULT_BRUSH_FLOW * 100));
    const clamped = clampBrushFlow(Number.isFinite(raw) ? raw / 100 : DEFAULT_BRUSH_FLOW);
    this.brushFlow = clamped;
    this.engine?.setBrushFlow(clamped);
    this.statusMessage = tr("status.flow", { value: Math.round(clamped * 100) });
  }

  /** Test hook: set the fuzzy jitter amount (0..100 percent, clamped). */
  setPaintFuzzy(percent: number): void {
    const clamped = clampPaintFuzzy(Number.isFinite(percent) ? percent / 100 : DEFAULT_PAINT_FUZZY);
    this.paintFuzzy = clamped;
    this.engine?.setPaintFuzzy(clamped);
    this.statusMessage = tr("status.fuzzy", { value: Math.round(clamped * 100) });
  }

  private applyPaintFuzzyFromDialog(): void {
    const input = this.shadowRoot?.getElementById("paintFuzzy") as HTMLInputElement | null;
    const raw = Number(input?.value ?? String(DEFAULT_PAINT_FUZZY * 100));
    const clamped = clampPaintFuzzy(Number.isFinite(raw) ? raw / 100 : DEFAULT_PAINT_FUZZY);
    this.paintFuzzy = clamped;
    this.engine?.setPaintFuzzy(clamped);
    this.statusMessage = tr("status.fuzzy", { value: Math.round(clamped * 100) });
  }

  /** Test hook: set the paper grain strength (0..100 percent) and cell size. */
  setPaintGrain(strengthPercent: number, scalePx: number): void {
    const strength = clampPaintGrainStrength(
      Number.isFinite(strengthPercent) ? strengthPercent / 100 : DEFAULT_PAINT_GRAIN_STRENGTH,
    );
    const scale = clampPaintGrainScale(scalePx);
    this.paintGrainStrength = strength;
    this.paintGrainScale = scale;
    this.engine?.setPaintGrain(strength, scale);
    this.statusMessage = tr("status.grain", { value: Math.round(strength * 100), scale });
  }

  private applyPaintGrainFromDialog(): void {
    const strengthInput = this.shadowRoot?.getElementById("paintGrainStrength") as HTMLInputElement | null;
    const scaleInput = this.shadowRoot?.getElementById("paintGrainScale") as HTMLInputElement | null;
    const rawStrength = Number(strengthInput?.value ?? String(DEFAULT_PAINT_GRAIN_STRENGTH * 100));
    const rawScale = Number(scaleInput?.value ?? String(DEFAULT_PAINT_GRAIN_SCALE));
    const strength = clampPaintGrainStrength(Number.isFinite(rawStrength) ? rawStrength / 100 : DEFAULT_PAINT_GRAIN_STRENGTH);
    const scale = clampPaintGrainScale(Number.isFinite(rawScale) ? rawScale : DEFAULT_PAINT_GRAIN_SCALE);
    this.paintGrainStrength = strength;
    this.paintGrainScale = scale;
    this.engine?.setPaintGrain(strength, scale);
    this.statusMessage = tr("status.grain", { value: Math.round(strength * 100), scale });
  }

  /** Test hook: set the deterministic paint seed (fuzzy + grain). */
  setPaintSeed(seed: number): void {
    this.engine?.setPaintSeed(seed);
    this.statusMessage = tr("status.paintSeed", { value: this.engine?.getPaintSeed() ?? seed });
  }

  /** Test hook: set the tilt-size dynamics amount (0..100 percent). */
  setTiltSizeAmount(percent: number): void {
    const clamped = clampPaintDynamicsAmount(Number.isFinite(percent) ? percent / 100 : DEFAULT_PAINT_DYNAMICS_AMOUNT);
    this.tiltSizeAmount = clamped;
    this.engine?.setTiltSizeAmount(clamped);
    this.statusMessage = tr("status.tiltSize", { value: Math.round(clamped * 100) });
  }

  private applyTiltSizeFromDialog(): void {
    const input = this.shadowRoot?.getElementById("tiltSizeAmount") as HTMLInputElement | null;
    const raw = Number(input?.value ?? String(DEFAULT_PAINT_DYNAMICS_AMOUNT * 100));
    const clamped = clampPaintDynamicsAmount(Number.isFinite(raw) ? raw / 100 : DEFAULT_PAINT_DYNAMICS_AMOUNT);
    this.tiltSizeAmount = clamped;
    this.engine?.setTiltSizeAmount(clamped);
    this.statusMessage = tr("status.tiltSize", { value: Math.round(clamped * 100) });
  }

  /** Test hook: set the speed-fade flow loss (0..100 percent). */
  setSpeedFadeAmount(percent: number): void {
    const clamped = clampPaintDynamicsAmount(Number.isFinite(percent) ? percent / 100 : DEFAULT_PAINT_DYNAMICS_AMOUNT);
    this.speedFadeAmount = clamped;
    this.engine?.setSpeedFadeAmount(clamped);
    this.statusMessage = tr("status.speedFade", { value: Math.round(clamped * 100) });
  }

  private applySpeedFadeFromDialog(): void {
    const input = this.shadowRoot?.getElementById("speedFadeAmount") as HTMLInputElement | null;
    const raw = Number(input?.value ?? String(DEFAULT_PAINT_DYNAMICS_AMOUNT * 100));
    const clamped = clampPaintDynamicsAmount(Number.isFinite(raw) ? raw / 100 : DEFAULT_PAINT_DYNAMICS_AMOUNT);
    this.speedFadeAmount = clamped;
    this.engine?.setSpeedFadeAmount(clamped);
    this.statusMessage = tr("status.speedFade", { value: Math.round(clamped * 100) });
  }

  /** Test hook: set the tip rotation mode (none/direction). */
  setTipAngleMode(mode: GnumarusTipAngleMode): void {
    const parsed = parseTipAngleMode(mode);
    this.tipAngleMode = parsed;
    this.engine?.setTipAngleMode(parsed);
    this.statusMessage = tr("status.tipRotation", { value: this.tipAngleLabel(parsed) });
  }

  private applyTipAngleModeFromDialog(): void {
    const select = this.shadowRoot?.getElementById("tipAngleMode") as HTMLSelectElement | null;
    const mode = parseTipAngleMode(select?.value ?? "none");
    this.tipAngleMode = mode;
    this.engine?.setTipAngleMode(mode);
    this.statusMessage = tr("status.tipRotation", { value: this.tipAngleLabel(mode) });
  }

  /** Test hook: set the symmetry mode (off/mirror-x/mirror-y/both). */
  setSymmetryMode(mode: GnumarusSymmetryMode): void {
    const parsed = parseSymmetryMode(mode);
    this.symmetryMode = parsed;
    this.engine?.setSymmetryMode(parsed);
    this.statusMessage = tr("status.symmetry", { value: this.symmetryLabel(parsed) });
  }

  /** Test hook: set the wrap-around painting mode (off/x/y/both). */
  setWrapMode(mode: GnumarusWrapMode): void {
    const parsed = parseWrapMode(mode);
    this.wrapMode = parsed;
    this.engine?.setWrapMode(parsed);
    this.statusMessage = tr("status.wrap", { value: this.wrapLabel(parsed) });
  }

  private applyWrapModeFromDialog(): void {
    const select = this.shadowRoot?.getElementById("wrapMode") as HTMLSelectElement | null;
    const mode = parseWrapMode(select?.value ?? "off");
    this.wrapMode = mode;
    this.engine?.setWrapMode(mode);
    this.statusMessage = tr("status.wrap", { value: this.wrapLabel(mode) });
  }

  private applySymmetryModeFromDialog(): void {
    const select = this.shadowRoot?.getElementById("symmetryMode") as HTMLSelectElement | null;
    const mode = parseSymmetryMode(select?.value ?? "off");
    this.symmetryMode = mode;
    this.engine?.setSymmetryMode(mode);
    this.statusMessage = tr("status.symmetry", { value: this.symmetryLabel(mode) });
  }

  /** Test hook: force the stroke velocity reading (null restores measurement). */
  setStrokeVelocityOverride(value: number | null): void {
    this.engine?.setStrokeVelocityOverride(value);
    this.statusMessage = tr("status.strokeVelocity", { value: value ?? tr("status.strokeMeasured") });
  }

  /** Test hook: set the airbrush rate in dabs per second (0..20, 0 is off). */
  setAirbrushRate(rate: number): void {
    const clamped = clampAirbrushRate(Number.isFinite(rate) ? rate : DEFAULT_AIRBRUSH_RATE);
    this.airbrushRate = clamped;
    this.engine?.setAirbrushRate(clamped);
    this.statusMessage = tr("status.airbrush", {
      value: clamped === 0 ? tr("status.airbrushOff") : tr("status.airbrushRate", { value: clamped }),
    });
  }

  private applyAirbrushRateFromDialog(): void {
    const input = this.shadowRoot?.getElementById("airbrushRate") as HTMLInputElement | null;
    const raw = Number(input?.value ?? String(DEFAULT_AIRBRUSH_RATE));
    const clamped = clampAirbrushRate(Number.isFinite(raw) ? raw : DEFAULT_AIRBRUSH_RATE);
    this.airbrushRate = clamped;
    this.engine?.setAirbrushRate(clamped);
    this.statusMessage = tr("status.airbrush", {
      value: clamped === 0 ? tr("status.airbrushOff") : tr("status.airbrushRate", { value: clamped }),
    });
  }

  /** Test hook: set smudge pickup rate (0..100 percent) and wetness (0..100). */
  setSmudge(ratePercent: number, wetPercent: number): void {
    const rate = clampPaintSmudgeRate(Number.isFinite(ratePercent) ? ratePercent / 100 : DEFAULT_PAINT_SMUDGE_RATE);
    const wet = clampPaintSmudgeWet(Number.isFinite(wetPercent) ? wetPercent / 100 : DEFAULT_PAINT_SMUDGE_WET);
    this.smudgeRate = rate;
    this.smudgeWet = wet;
    this.engine?.setSmudge(rate, wet);
    this.statusMessage = tr("status.smudge", { value: Math.round(rate * 100), wet: Math.round(wet * 100) });
  }

  private applySmudgeFromDialog(): void {
    const rateInput = this.shadowRoot?.getElementById("smudgeRate") as HTMLInputElement | null;
    const wetInput = this.shadowRoot?.getElementById("smudgeWet") as HTMLInputElement | null;
    const rawRate = Number(rateInput?.value ?? String(DEFAULT_PAINT_SMUDGE_RATE * 100));
    const rawWet = Number(wetInput?.value ?? String(DEFAULT_PAINT_SMUDGE_WET * 100));
    const rate = clampPaintSmudgeRate(Number.isFinite(rawRate) ? rawRate / 100 : DEFAULT_PAINT_SMUDGE_RATE);
    const wet = clampPaintSmudgeWet(Number.isFinite(rawWet) ? rawWet / 100 : DEFAULT_PAINT_SMUDGE_WET);
    this.smudgeRate = rate;
    this.smudgeWet = wet;
    this.engine?.setSmudge(rate, wet);
    this.statusMessage = tr("status.smudge", { value: Math.round(rate * 100), wet: Math.round(wet * 100) });
  }

  /**
   * Test hook: install a dual tip from raw RGBA pixels (row-major).
   * The pixels are auto-fitted (alpha threshold 0) and archived as JXL.
   * Returns false for invalid dimensions or buffers.
   */
  setPaintDualTipFromPixels(width: number, height: number, rgba: number[]): boolean {
    return this.installImageTip("dual", `${width}x${height} dual`, new Uint8ClampedArray(rgba), width, height);
  }

  /** Test hook: tune the dual tip size (25..400 percent) and strength (0..100). */
  setPaintDualTuning(scalePercent: number, strengthPercent: number): void {
    const scale = clampPaintDualScale(Number.isFinite(scalePercent) ? scalePercent / 100 : DEFAULT_PAINT_DUAL_SCALE);
    const strength = clampPaintDualStrength(
      Number.isFinite(strengthPercent) ? strengthPercent / 100 : DEFAULT_PAINT_DUAL_STRENGTH,
    );
    this.paintDualScale = scale;
    this.paintDualStrength = strength;
    this.engine?.setPaintDualTuning(scale, strength);
    this.statusMessage = tr("status.dualTip", { value: Math.round(strength * 100), scale: Math.round(scale * 100) });
  }

  /** Clear the installed dual tip. */
  clearPaintDual(): void {
    this.engine?.setPaintDualTip(null);
    this.paintDualName = "";
    this.statusMessage = tr("status.dualCleared");
  }

  /** Snapshot the current pencil state as a preset object. */
  private currentBrushPreset(name: string): GnumarusBrushPreset {
    return {
      version: 1,
      name,      brushSize: this.brushSize,
      brushShape: this.brushShape,
      brushTipKind: this.brushTipKind,
      brushHardness: this.brushHardness,
      brushSpacing: this.brushSpacing,
      brushFlow: this.brushFlow,
      pressureResponse: this.pressureResponse,
      pressureSizeCurve: this.pressureSizeCurve,
      pressureAlphaCurve: this.pressureAlphaCurve,
      paintFuzzy: this.paintFuzzy,
      paintGrainStrength: this.paintGrainStrength,
      paintGrainScale: this.paintGrainScale,
      tiltSizeAmount: this.tiltSizeAmount,
      speedFadeAmount: this.speedFadeAmount,
      tipAngleMode: this.tipAngleMode,
      airbrushRate: this.airbrushRate,
      smudgeRate: this.smudgeRate,
      smudgeWet: this.smudgeWet,
      paintDualScale: this.paintDualScale,
      paintDualStrength: this.paintDualStrength,
      blendMode: this.blendMode,
      accumulate: this.accumulate,
      symmetryMode: this.symmetryMode,
      wrapMode: this.wrapMode,
    };
  }

  /** Apply a preset to the shell fields and the engine. */
  private applyBrushPreset(preset: GnumarusBrushPreset): void {
    this.brushSize = preset.brushSize;
    this.engine?.setBrushSize(preset.brushSize);
    this.brushShape = preset.brushShape;
    this.engine?.setBrushShape(preset.brushShape);
    this.brushTipKind = preset.brushTipKind;
    this.engine?.setBrushTipKind(preset.brushTipKind);
    this.brushHardness = preset.brushHardness;
    this.engine?.setBrushHardness(preset.brushHardness);
    this.brushSpacing = preset.brushSpacing;
    this.engine?.setBrushSpacing(preset.brushSpacing);
    this.brushFlow = preset.brushFlow;
    this.engine?.setBrushFlow(preset.brushFlow);
    this.pressureResponse = preset.pressureResponse;
    this.engine?.setPressureResponse(preset.pressureResponse);
    this.pressureSizeCurve = preset.pressureSizeCurve;
    this.engine?.setPressureSizeCurve(preset.pressureSizeCurve);
    this.pressureAlphaCurve = preset.pressureAlphaCurve;
    this.engine?.setPressureAlphaCurve(preset.pressureAlphaCurve);
    this.paintFuzzy = preset.paintFuzzy;
    this.engine?.setPaintFuzzy(preset.paintFuzzy);
    this.paintGrainStrength = preset.paintGrainStrength;
    this.paintGrainScale = preset.paintGrainScale;
    this.engine?.setPaintGrain(preset.paintGrainStrength, preset.paintGrainScale);
    this.tiltSizeAmount = preset.tiltSizeAmount;
    this.engine?.setTiltSizeAmount(preset.tiltSizeAmount);
    this.speedFadeAmount = preset.speedFadeAmount;
    this.engine?.setSpeedFadeAmount(preset.speedFadeAmount);
    this.tipAngleMode = preset.tipAngleMode;
    this.engine?.setTipAngleMode(preset.tipAngleMode);
    this.airbrushRate = preset.airbrushRate;
    this.engine?.setAirbrushRate(preset.airbrushRate);
    this.smudgeRate = preset.smudgeRate;
    this.smudgeWet = preset.smudgeWet;
    this.engine?.setSmudge(preset.smudgeRate, preset.smudgeWet);
    this.paintDualScale = preset.paintDualScale;
    this.paintDualStrength = preset.paintDualStrength;
    this.engine?.setPaintDualTuning(preset.paintDualScale, preset.paintDualStrength);
    this.blendMode = preset.blendMode;
    this.engine?.setBlendMode(preset.blendMode);
    this.accumulate = preset.accumulate;
    this.engine?.setAccumulate(preset.accumulate);
    this.symmetryMode = preset.symmetryMode ?? "off";
    this.engine?.setSymmetryMode(this.symmetryMode);
    this.wrapMode = preset.wrapMode ?? "off";
    this.engine?.setWrapMode(this.wrapMode);
    this.statusMessage = tr("status.preset", { value: preset.name });
  }

  private allBrushPresets(): GnumarusBrushPreset[] {
    return [...BUILT_IN_BRUSH_PRESETS, ...this.brushPresets];
  }

  private applyBrushPresetFromDialog(): void {
    const select = this.shadowRoot?.getElementById("brushPreset") as HTMLSelectElement | null;
    const preset = this.allBrushPresets().find((entry) => entry.name === (select?.value ?? ""));
    if (preset !== undefined) {
      this.applyBrushPreset(preset);
    }
  }

  private loadBrushPresets(): GnumarusBrushPreset[] {
    try {
      const stored = window.localStorage.getItem(BRUSH_PRESET_STORAGE_KEY);
      if (stored !== null) {
        return parseBrushPresetList(stored);
      }
    } catch {
      // Corrupt or unavailable storage falls back to built-ins only.
    }
    return [];
  }

  private persistBrushPresets(): void {
    try {
      window.localStorage.setItem(BRUSH_PRESET_STORAGE_KEY, serializeBrushPresetList(this.brushPresets));
    } catch {
      // Storage failures must not break the painting flow.
    }
  }

  /** Test hook: list all preset names (built-ins first, then customs). */
  listBrushPresetNames(): string[] {
    return this.allBrushPresets().map((preset) => preset.name);
  }

  /** Save the current pencil state as a custom preset (replaces same-name). */
  saveBrushPresetAs(name: string): boolean {
    const trimmed = name.trim().slice(0, 64);
    if (trimmed.length === 0) {
      return false;
    }
    const preset = this.currentBrushPreset(trimmed);
    const existing = this.brushPresets.findIndex((entry) => entry.name === trimmed);
    if (existing >= 0) {
      this.brushPresets[existing] = preset;
    } else {
      this.brushPresets = [...this.brushPresets, preset];
    }
    this.persistBrushPresets();
    this.statusMessage = tr("status.presetSaved", { value: trimmed });
    return true;
  }

  /** Delete a custom preset (built-ins are protected). Returns false when missing. */
  deleteBrushPreset(name: string): boolean {
    const index = this.brushPresets.findIndex((entry) => entry.name === name);
    if (index < 0) {
      return false;
    }
    this.brushPresets = this.brushPresets.filter((entry) => entry.name !== name);
    this.persistBrushPresets();
    this.statusMessage = tr("status.presetDeleted", { value: name });
    return true;
  }

  /** Test hook: import a preset from its JSON text (adds + applies). */
  importBrushPresetJson(jsonText: string): boolean {
    try {
      const preset = parseBrushPreset(jsonText);
      const existing = this.brushPresets.findIndex((entry) => entry.name === preset.name);
      if (existing >= 0) {
        this.brushPresets[existing] = preset;
      } else {
        this.brushPresets = [...this.brushPresets, preset];
      }
      this.persistBrushPresets();
      this.applyBrushPreset(preset);
      return true;
    } catch {
      return false;
    }
  }

  /** Test hook: export a preset (built-in or custom) as JSON text. */
  exportBrushPresetJson(name: string): string | null {
    const preset = this.allBrushPresets().find((entry) => entry.name === name);
    return preset === undefined ? null : serializeBrushPreset(preset);
  }

  private saveBrushPresetFromDialog(): void {
    const input = this.shadowRoot?.getElementById("presetName") as HTMLInputElement | null;
    const name = input?.value ?? "";
    if (!this.saveBrushPresetAs(name)) {
      this.statusMessage = tr("status.presetEmpty");
      return;
    }
    const select = this.shadowRoot?.getElementById("brushPreset") as HTMLSelectElement | null;
    if (select !== null) {
      select.value = name.trim().slice(0, 64);
    }
  }

  private deleteBrushPresetFromDialog(): void {
    const select = this.shadowRoot?.getElementById("brushPreset") as HTMLSelectElement | null;
    const name = select?.value ?? "";
    if (name === "" || !this.deleteBrushPreset(name)) {
      this.statusMessage = tr("status.presetCustomOnly");
    }
  }

  private downloadBrushPreset(): void {
    const select = this.shadowRoot?.getElementById("brushPreset") as HTMLSelectElement | null;
    const json = this.exportBrushPresetJson(select?.value ?? "");
    if (json === null) {
      this.statusMessage = tr("status.presetNone");
      return;
    }
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${select?.value ?? "preset"}.gnumarus-brush.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.statusMessage = tr("status.presetExported");
  }

  private openBrushPresetPicker(): void {
    const input = this.shadowRoot?.getElementById("brushPresetImport") as HTMLInputElement | null;
    input?.click();
  }

  private async importBrushPresetFromDialog(): Promise<void> {
    const input = this.shadowRoot?.getElementById("brushPresetImport") as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (input !== null) {
      input.value = "";
    }
    if (file === undefined) {
      return;
    }
    try {
      const text = await file.text();
      if (!this.importBrushPresetJson(text)) {
        throw new Error("Invalid brush preset file.");
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.statusMessage = tr("status.presetImportFailed", { reason });
    }
  }

  private applyPaintDualTuningFromDialog(): void {
    const strengthInput = this.shadowRoot?.getElementById("paintDualStrength") as HTMLInputElement | null;
    const scaleInput = this.shadowRoot?.getElementById("paintDualScale") as HTMLInputElement | null;
    const rawStrength = Number(strengthInput?.value ?? String(DEFAULT_PAINT_DUAL_STRENGTH * 100));
    const rawScale = Number(scaleInput?.value ?? String(DEFAULT_PAINT_DUAL_SCALE * 100));
    const scale = clampPaintDualScale(Number.isFinite(rawScale) ? rawScale / 100 : DEFAULT_PAINT_DUAL_SCALE);
    const strength = clampPaintDualStrength(
      Number.isFinite(rawStrength) ? rawStrength / 100 : DEFAULT_PAINT_DUAL_STRENGTH,
    );
    this.paintDualScale = scale;
    this.paintDualStrength = strength;
    this.engine?.setPaintDualTuning(scale, strength);
    this.statusMessage = tr("status.dualTip", { value: Math.round(strength * 100), scale: Math.round(scale * 100) });
  }

  private openPaintDualPicker(): void {
    const input = this.shadowRoot?.getElementById("paintDualImport") as HTMLInputElement | null;
    input?.click();
  }

  private async importPaintDualFromDialog(): Promise<void> {
    const input = this.shadowRoot?.getElementById("paintDualImport") as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (input !== null) {
      input.value = "";
    }
    if (file === undefined) {
      return;
    }
    try {
      const decoded = await decodePngToBuffer(file);
      const scale = Math.min(1, 128 / Math.max(decoded.width, decoded.height));
      const targetWidth = Math.max(1, Math.floor(decoded.width * scale)) || 1;
      const targetHeight = Math.max(1, Math.floor(decoded.height * scale)) || 1;
      let pixels = decoded.buffer;
      if (targetWidth !== decoded.width || targetHeight !== decoded.height) {
        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const context = canvas.getContext("2d");
        if (context === null) {
          throw new Error("2D canvas is unavailable for dual import.");
        }
        const source = document.createElement("canvas");
        source.width = decoded.width;
        source.height = decoded.height;
        const sourceContext = source.getContext("2d");
        if (sourceContext === null) {
          throw new Error("2D canvas is unavailable for dual import.");
        }
        sourceContext.putImageData(
          new ImageData(new Uint8ClampedArray(decoded.buffer), decoded.width, decoded.height),
          0,
          0,
        );
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        context.drawImage(source, 0, 0, targetWidth, targetHeight);
        pixels = context.getImageData(0, 0, targetWidth, targetHeight).data as Uint8ClampedArray;
      }
      const tip = paintTipImageFromRgba(new Uint8ClampedArray(pixels), targetWidth, targetHeight);
      if (tip === null) {
        throw new Error("Dual image has no pixels.");
      }
      this.installImageTip("dual", file.name, new Uint8ClampedArray(pixels), targetWidth, targetHeight);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.statusMessage = tr("status.dualImportFailed", { reason });
    }
  }

  private applyPressureResponseFromDialog(): void {
    const select = this.shadowRoot?.getElementById("pressureResponse") as HTMLSelectElement | null;
    const response = parsePressureResponse(select?.value ?? "none");
    this.pressureResponse = response;
    this.engine?.setPressureResponse(response);
    this.statusMessage = tr("status.pressure", { value: this.pressureLabel(response) });
  }

  /** Test hook: set the pressure curve mapping pressure to size gain. */
  setPressureSizeCurve(curve: GnumarusPressureCurve): void {
    const parsed = parsePressureCurve(curve);
    this.pressureSizeCurve = parsed;
    this.engine?.setPressureSizeCurve(parsed);
    this.statusMessage = tr("status.sizeCurve", { value: this.curveLabel(parsed) });
  }

  private applyPressureSizeCurveFromDialog(): void {
    const select = this.shadowRoot?.getElementById("pressureSizeCurve") as HTMLSelectElement | null;
    const curve = parsePressureCurve(select?.value ?? "linear");
    this.pressureSizeCurve = curve;
    this.engine?.setPressureSizeCurve(curve);
    this.statusMessage = tr("status.sizeCurve", { value: this.curveLabel(curve) });
  }

  /** Test hook: set the pressure curve mapping pressure to alpha gain. */
  setPressureAlphaCurve(curve: GnumarusPressureCurve): void {
    const parsed = parsePressureCurve(curve);
    this.pressureAlphaCurve = parsed;
    this.engine?.setPressureAlphaCurve(parsed);
    this.statusMessage = tr("status.alphaCurve", { value: this.curveLabel(parsed) });
  }

  private applyPressureAlphaCurveFromDialog(): void {
    const select = this.shadowRoot?.getElementById("pressureAlphaCurve") as HTMLSelectElement | null;
    const curve = parsePressureCurve(select?.value ?? "linear");
    this.pressureAlphaCurve = curve;
    this.engine?.setPressureAlphaCurve(curve);
    this.statusMessage = tr("status.alphaCurve", { value: this.curveLabel(curve) });
  }

  /** Test hook: enable or disable pencil anti-aliasing. */
  setPencilAntialias(enabled: boolean): void {
    const next = enabled === true;
    this.pencilAntialias = next;
    this.engine?.setPencilAntialias(next);
    this.statusMessage = tr("status.pencilAntialias", { value: this.onOffLabel(next) });
  }

  private currentDialogPencilAntialias(): boolean {
    const input = this.shadowRoot?.getElementById("pencilAntialias") as HTMLInputElement | null;
    return input?.checked === true;
  }

  private applyPencilAntialiasFromDialog(): void {
    const enabled = this.currentDialogPencilAntialias();
    this.pencilAntialias = enabled;
    this.engine?.setPencilAntialias(enabled);
    this.statusMessage = tr("status.pencilAntialias", { value: this.onOffLabel(enabled) });
  }

  /** Test hook: enable or disable pencil pixel perfect (1px + no AA only). */
  setPencilPixelPerfect(enabled: boolean): void {
    const next = enabled === true;
    this.pencilPixelPerfect = next;
    this.engine?.setPencilPixelPerfect(next);
    this.statusMessage = tr("status.pencilPixelPerfect", { value: this.onOffLabel(next) });
  }

  /** Test hook: enable or disable curve pixel perfect (1px + no AA only). */
  setCurvePixelPerfect(enabled: boolean): void {
    const next = enabled === true;
    this.curvePixelPerfect = next;
    this.engine?.setCurvePixelPerfect(next);
    this.statusMessage = tr("status.curvePixelPerfect", { value: this.onOffLabel(next) });
  }

  private currentDialogPencilPixelPerfect(): boolean {
    const input = this.shadowRoot?.getElementById("pencilPixelPerfect") as HTMLInputElement | null;
    return input?.checked === true;
  }

  private currentDialogCurvePixelPerfect(): boolean {
    const input = this.shadowRoot?.getElementById("curvePixelPerfect") as HTMLInputElement | null;
    return input?.checked === true;
  }

  private applyPencilPixelPerfectFromDialog(): void {
    const enabled = this.currentDialogPencilPixelPerfect();
    this.pencilPixelPerfect = enabled;
    this.engine?.setPencilPixelPerfect(enabled);
    this.statusMessage = tr("status.pencilPixelPerfect", { value: this.onOffLabel(enabled) });
  }

  private applyCurvePixelPerfectFromDialog(): void {
    const enabled = this.currentDialogCurvePixelPerfect();
    this.curvePixelPerfect = enabled;
    this.engine?.setCurvePixelPerfect(enabled);
    this.statusMessage = tr("status.curvePixelPerfect", { value: this.onOffLabel(enabled) });
  }

  /** Test hook: set the brush stabilizer mode (none/rope/follow, defaults to none). */
  setStabilizerMode(mode: GnumarusStabilizerMode): void {
    const parsed = parseStabilizerMode(mode);
    this.stabilizerMode = parsed;
    this.engine?.setStabilizerMode(parsed);
    this.statusMessage = tr("status.stabilizer", { value: this.stabilizerLabel(parsed) });
  }

  /** Test hook: set the rope leash length in layer pixels (1..200, clamped). */
  setRopeLength(length: number): void {
    const clamped = clampRopeLength(length);
    this.ropeLength = clamped;
    this.engine?.setRopeLength(clamped);
    this.statusMessage = tr("status.ropeLength", { value: clamped });
  }

  /** Test hook: set the follow chase strength (typed 1..100, used as typed / 100, clamped). */
  setFollowStrength(strength: number): void {
    const clamped = clampFollowStrength(strength);
    this.followStrength = clamped;
    this.engine?.setFollowStrength(clamped);
    this.statusMessage = tr("status.followStrength", { value: clamped });
  }

  private currentDialogStabilizerMode(): GnumarusStabilizerMode {
    const select = this.shadowRoot?.getElementById("stabilizerMode") as HTMLSelectElement | null;
    return parseStabilizerMode(select?.value ?? "none");
  }

  private currentDialogRopeLength(): number {
    const input = this.shadowRoot?.getElementById("ropeLength") as HTMLInputElement | null;
    const parsed = Number(input?.value ?? String(GNUMARUS_DEFAULT_ROPE_LENGTH));
    return clampRopeLength(Number.isFinite(parsed) ? parsed : GNUMARUS_DEFAULT_ROPE_LENGTH);
  }

  private currentDialogFollowStrength(): number {
    const input = this.shadowRoot?.getElementById("followStrength") as HTMLInputElement | null;
    const parsed = Number(input?.value ?? String(GNUMARUS_DEFAULT_FOLLOW_STRENGTH));
    return clampFollowStrength(Number.isFinite(parsed) ? parsed : GNUMARUS_DEFAULT_FOLLOW_STRENGTH);
  }

  private applyStabilizerModeFromDialog(): void {
    const mode = this.currentDialogStabilizerMode();
    this.stabilizerMode = mode;
    this.engine?.setStabilizerMode(mode);
    this.statusMessage = tr("status.stabilizer", { value: this.stabilizerLabel(mode) });
  }

  private applyRopeLengthFromDialog(): void {
    const length = this.currentDialogRopeLength();
    this.ropeLength = length;
    this.engine?.setRopeLength(length);
    this.statusMessage = tr("status.ropeLength", { value: length });
  }

  private applyFollowStrengthFromDialog(): void {
    const strength = this.currentDialogFollowStrength();
    this.followStrength = strength;
    this.engine?.setFollowStrength(strength);
    this.statusMessage = tr("status.followStrength", { value: strength });
  }

  /** Test hook: set the shared paint blend mode (normal/copy/eraser, defaults to normal). */
  setBlendMode(mode: GnumarusBlendMode): void {
    const parsed = parseBlendMode(mode);
    this.blendMode = parsed;
    this.engine?.setBlendMode(parsed);
    this.statusMessage = tr("status.blend", { value: this.blendLabel(parsed) });
  }

  private currentDialogBlendMode(): GnumarusBlendMode {
    const select = this.shadowRoot?.getElementById("blendMode") as HTMLSelectElement | null;
    return parseBlendMode(select?.value ?? "normal");
  }

  private applyBlendModeFromDialog(): void {
    const mode = this.currentDialogBlendMode();
    this.blendMode = mode;
    this.engine?.setBlendMode(mode);
    this.statusMessage = tr("status.blend", { value: this.blendLabel(mode) });
  }

  /** Test hook: set whether strokes accumulate onto themselves while drawing. */
  setAccumulate(enabled: boolean): void {
    const next = enabled === true;
    this.accumulate = next;
    this.engine?.setAccumulate(next);
    this.statusMessage = tr("status.accumulate", { value: this.onOffLabel(next) });
  }

  private currentDialogAccumulate(): boolean {
    const input = this.shadowRoot?.getElementById("accumulate") as HTMLInputElement | null;
    return input?.checked === true;
  }

  private applyAccumulateFromDialog(): void {
    const enabled = this.currentDialogAccumulate();
    this.accumulate = enabled;
    this.engine?.setAccumulate(enabled);
    this.statusMessage = tr("status.accumulate", { value: this.onOffLabel(enabled) });
  }

  /** Toggle between eraser and the previously used non-eraser blend mode. */
  private toggleEraserBlend(): void {
    if (this.engine === null) {
      return;
    }
    const mode = this.engine.toggleEraserBlend();
    this.blendMode = mode;
    this.statusMessage = tr("status.blend", { value: this.blendLabel(mode) });
  }

  /** Test hook: set the line width (floats 0.1..64, clamped). */
  setLineWidth(size: number): void {
    const clamped = clampBrushSizeFloat(size);
    this.lineWidth = clamped;
    this.engine?.setLineWidth(clamped);
    this.statusMessage = tr("status.lineWidth", { value: clamped });
  }

  /** Test hook: set the line shape (square/circle, defaults to circle). */
  setLineShape(shape: GnumarusBrushShape): void {
    const parsed = parseBrushShape(shape);
    this.lineShape = parsed;
    this.engine?.setLineShape(parsed);
    this.statusMessage = tr("status.lineShape", { value: this.shapeLabel(parsed) });
  }

  /** Test hook: enable or disable line anti-aliasing. */
  setLineAntialias(enabled: boolean): void {
    const next = enabled === true;
    this.lineAntialias = next;
    this.engine?.setLineAntialias(next);
    this.statusMessage = tr("status.lineAntialias", { value: this.onOffLabel(next) });
  }

  private currentDialogLineWidth(): number {
    const input = this.shadowRoot?.getElementById("lineWidth") as HTMLInputElement | null;
    const parsed = Number(input?.value ?? "1");
    return clampBrushSizeFloat(Number.isFinite(parsed) ? parsed : 1);
  }

  private currentDialogLineShape(): GnumarusBrushShape {
    const select = this.shadowRoot?.getElementById("lineShape") as HTMLSelectElement | null;
    return parseBrushShape(select?.value ?? "square");
  }

  private currentDialogLineAntialias(): boolean {
    const input = this.shadowRoot?.getElementById("lineAntialias") as HTMLInputElement | null;
    return input?.checked === true;
  }

  private applyLineWidthFromDialog(): void {
    const size = this.currentDialogLineWidth();
    this.lineWidth = size;
    this.engine?.setLineWidth(size);
    this.statusMessage = tr("status.lineWidth", { value: size });
  }

  private applyLineShapeFromDialog(): void {
    const shape = this.currentDialogLineShape();
    this.lineShape = shape;
    this.engine?.setLineShape(shape);
    this.statusMessage = tr("status.lineShape", { value: this.shapeLabel(shape) });
  }

  private applyLineAntialiasFromDialog(): void {
    const enabled = this.currentDialogLineAntialias();
    this.lineAntialias = enabled;
    this.engine?.setLineAntialias(enabled);
    this.statusMessage = tr("status.lineAntialias", { value: this.onOffLabel(enabled) });
  }

  /** Test hook: set the curve width (floats 0.1..64, clamped). */
  setCurveWidth(size: number): void {
    const clamped = clampBrushSizeFloat(size);
    this.curveWidth = clamped;
    this.engine?.setCurveWidth(clamped);
    this.statusMessage = tr("status.curveWidth", { value: clamped });
  }

  /** Test hook: set the curve shape (square/circle, defaults to circle). */
  setCurveShape(shape: GnumarusBrushShape): void {
    const parsed = parseBrushShape(shape);
    this.curveShape = parsed;
    this.engine?.setCurveShape(parsed);
    this.statusMessage = tr("status.curveShape", { value: this.shapeLabel(parsed) });
  }

  /** Test hook: enable or disable curve anti-aliasing. */
  setCurveAntialias(enabled: boolean): void {
    const next = enabled === true;
    this.curveAntialias = next;
    this.engine?.setCurveAntialias(next);
    this.statusMessage = tr("status.curveAntialias", { value: this.onOffLabel(next) });
  }

  private currentDialogCurveWidth(): number {
    const input = this.shadowRoot?.getElementById("curveWidth") as HTMLInputElement | null;
    const parsed = Number(input?.value ?? "1");
    return clampBrushSizeFloat(Number.isFinite(parsed) ? parsed : 1);
  }

  private currentDialogCurveShape(): GnumarusBrushShape {
    const select = this.shadowRoot?.getElementById("curveShape") as HTMLSelectElement | null;
    return parseBrushShape(select?.value ?? "square");
  }

  private currentDialogCurveAntialias(): boolean {
    const input = this.shadowRoot?.getElementById("curveAntialias") as HTMLInputElement | null;
    return input?.checked === true;
  }

  private applyCurveWidthFromDialog(): void {
    const size = this.currentDialogCurveWidth();
    this.curveWidth = size;
    this.engine?.setCurveWidth(size);
    this.statusMessage = tr("status.curveWidth", { value: size });
  }

  private applyCurveShapeFromDialog(): void {
    const shape = this.currentDialogCurveShape();
    this.curveShape = shape;
    this.engine?.setCurveShape(shape);
    this.statusMessage = tr("status.curveShape", { value: this.shapeLabel(shape) });
  }

  private applyCurveAntialiasFromDialog(): void {
    const enabled = this.currentDialogCurveAntialias();
    this.curveAntialias = enabled;
    this.engine?.setCurveAntialias(enabled);
    this.statusMessage = tr("status.curveAntialias", { value: this.onOffLabel(enabled) });
  }

  /** Test and picker hook: set checker color A (opaque hex only). */
  setCheckerColorA(hex: string): void {
    const six = hex.trim().toLowerCase().slice(0, 7);
    if (parseHexColor(six) === null || six.length !== 7) {
      return;
    }
    this.checkerColorA = six;
    this.engine?.applyCheckerSettings({
      mode: this.checkerMode,
      sizeX: this.checkerSizeX,
      sizeY: this.checkerSizeY,
      colorA: this.checkerColorA,
      colorB: this.checkerColorB,
    });
    this.persistChecker();
    void this.refreshPreview();
    this.statusMessage = tr("status.checkerColorA", { value: six });
  }

  /** Test and picker hook: set checker color B (opaque hex only). */
  setCheckerColorB(hex: string): void {
    const six = hex.trim().toLowerCase().slice(0, 7);
    if (parseHexColor(six) === null || six.length !== 7) {
      return;
    }
    this.checkerColorB = six;
    this.engine?.applyCheckerSettings({
      mode: this.checkerMode,
      sizeX: this.checkerSizeX,
      sizeY: this.checkerSizeY,
      colorA: this.checkerColorA,
      colorB: this.checkerColorB,
    });
    this.persistChecker();
    void this.refreshPreview();
    this.statusMessage = tr("status.checkerColorB", { value: six });
  }

  /** Test and picker hook: set the solid background color (opaque hex only). */
  setBackgroundColor(hex: string): void {
    const six = hex.trim().toLowerCase().slice(0, 7);
    if (parseHexColor(six) === null || six.length !== 7) {
      return;
    }
    this.backgroundColor = six;
    this.engine?.applyBackgroundSettings({ mode: this.backgroundMode, color: this.backgroundColor });
    this.persistBackground();
    void this.refreshPreview();
    this.statusMessage = tr("status.canvasBackground", {
      value: this.backgroundMode === "solid" ? tr("status.backgroundSolid", { value: six }) : tr("status.backgroundChecker"),
    });
  }

  private resetGridMinZoomToDefault(): void {
    this.gridMinZoom = DEFAULT_GRID_SETTINGS.minZoom;
    this.engine?.setGridMinZoom(this.gridMinZoom);
    this.persistGrid();
    this.statusMessage = tr("status.gridMinZoomReset");
  }

  private resetGridOpacityToDefault(): void {
    this.gridOpacity = DEFAULT_GRID_SETTINGS.opacityPercent;
    this.engine?.setGridOpacityPercent(this.gridOpacity);
    this.persistGrid();
    this.statusMessage = tr("status.gridOpacityReset");
  }

  private currentDialogChecker(): GnumarusCheckerSettings {
    const modeInput = this.shadowRoot?.getElementById("checkerMode") as HTMLSelectElement | null;
    const sizeXInput = this.shadowRoot?.getElementById("checkerSizeX") as HTMLInputElement | null;
    const sizeYInput = this.shadowRoot?.getElementById("checkerSizeY") as HTMLInputElement | null;
    const colorAInput = this.shadowRoot?.getElementById("checkerColorA") as HTMLInputElement | null;
    const colorBInput = this.shadowRoot?.getElementById("checkerColorB") as HTMLInputElement | null;
    const mode: GnumarusCheckerMode = modeInput?.value === "screen" ? "screen" : "image";
    const rawA = colorAInput?.value ?? this.checkerColorA;
    const rawB = colorBInput?.value ?? this.checkerColorB;
    return {
      mode,
      sizeX: clampCheckerSize(Number(sizeXInput?.value ?? "16") || 16),
      sizeY: clampCheckerSize(Number(sizeYInput?.value ?? "16") || 16),
      colorA: typeof rawA === "string" ? rawA.slice(0, 7) : this.checkerColorA,
      colorB: typeof rawB === "string" ? rawB.slice(0, 7) : this.checkerColorB,
    };
  }

  private applyCheckerFromDialog(): void {
    const settings = this.currentDialogChecker();
    this.checkerMode = settings.mode;
    this.checkerSizeX = settings.sizeX;
    this.checkerSizeY = settings.sizeY;
    this.checkerColorA = settings.colorA;
    this.checkerColorB = settings.colorB;
    this.engine?.applyCheckerSettings(settings);
    this.persistChecker();
    void this.refreshPreview();
    this.statusMessage = tr("status.checkerSummary", { mode: settings.mode, width: settings.sizeX, height: settings.sizeY });
  }

  private resetCheckerDefaults(): void {
    const settings = { ...DEFAULT_CHECKER_SETTINGS };
    this.checkerMode = settings.mode;
    this.checkerSizeX = settings.sizeX;
    this.checkerSizeY = settings.sizeY;
    this.checkerColorA = settings.colorA;
    this.checkerColorB = settings.colorB;
    this.engine?.applyCheckerSettings(settings);
    this.persistChecker();
    const gridSettings = { ...DEFAULT_GRID_SETTINGS };
    this.gridMinZoom = gridSettings.minZoom;
    this.engine?.setGridMinZoom(gridSettings.minZoom);
    this.gridOpacity = gridSettings.opacityPercent;
    this.engine?.setGridOpacityPercent(gridSettings.opacityPercent);
    this.persistGrid();
    const backgroundSettings = { ...DEFAULT_BACKGROUND_SETTINGS };
    this.backgroundMode = backgroundSettings.mode;
    this.backgroundColor = backgroundSettings.color;
    this.engine?.applyBackgroundSettings(backgroundSettings);
    this.persistBackground();
    this.rotationStepDeg = DEFAULT_ROTATION_SETTINGS.stepDeg;
    this.engine?.setRotationStepDeg(this.rotationStepDeg);
    this.persistRotation();
    this.zoomMinPercent = DEFAULT_ZOOM_SETTINGS.minZoomPercent;
    this.engine?.setViewMinZoom(this.zoomMinPercent / 100);
    this.persistZoom();
    this.toastDurationSec = DEFAULT_TOAST_SETTINGS.durationSec;
    this.persistToast();
    this.locale = DEFAULT_LOCALE_SETTINGS.locale;
    this.persistLocale();
    this.applyActiveLocale();
    const storageSettings = { ...DEFAULT_STORAGE_SETTINGS };
    this.storageLossless = storageSettings.lossless;
    this.storageQuality = storageSettings.quality;
    this.brushQuality = storageSettings.brushQuality;
    this.persistStorage();
    const importSettings = DEFAULT_IMPORT_CLEANUP;
    this.importCleanup = importSettings;
    this.persistImportCleanup();
    void this.refreshPreview();
    this.statusMessage = tr("status.settingsReset");
  }

  private togglePreview(): void {
    this.previewOpen = !this.previewOpen;
    if (this.previewOpen) {
      this.statusMessage = tr("status.previewOpened");
      void this.refreshPreview();
    } else {
      this.statusMessage = tr("status.previewClosed");
    }
  }

  private zoomPreview(factor: number): void {
    const next = Math.min(64, Math.max(0.25, this.previewZoom * factor));
    this.previewZoom = next;
    void this.refreshPreview();
  }

  private resetPreviewZoom(): void {
    this.previewZoom = 4;
    void this.refreshPreview();
  }

  private previewDragState: { startX: number; startY: number; originX: number; originY: number } | null = null;

  private previewPanState: {
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
    body: HTMLElement;
  } | null = null;

  /** Pan the preview content with a drag of any mouse button (left, right or middle). */
  private onPreviewPanStart(event: PointerEvent): void {
    if (event.button !== 0 && event.button !== 1 && event.button !== 2) {
      return;
    }
    const body = event.currentTarget as HTMLElement | null;
    if (body === null) {
      return;
    }
    event.preventDefault();
    this.previewPanState = {
      startX: event.clientX,
      startY: event.clientY,
      startLeft: body.scrollLeft,
      startTop: body.scrollTop,
      body,
    };
    const move = (moveEvent: PointerEvent): void => {
      if (this.previewPanState === null) {
        return;
      }
      this.previewPanState.body.scrollLeft = this.previewPanState.startLeft - (moveEvent.clientX - this.previewPanState.startX);
      this.previewPanState.body.scrollTop = this.previewPanState.startTop - (moveEvent.clientY - this.previewPanState.startY);
    };
    const up = (): void => {
      this.previewPanState = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  private onPreviewDragStart(event: PointerEvent): void {
    const target = event.target as HTMLElement | null;
    if (target !== null && target.closest("button") !== null) {
      return;
    }
    this.previewDragState = { startX: event.clientX, startY: event.clientY, originX: this.previewX, originY: this.previewY };
    const move = (moveEvent: PointerEvent): void => {
      if (this.previewDragState === null) {
        return;
      }
      this.previewX = Math.max(0, this.previewDragState.originX + (moveEvent.clientX - this.previewDragState.startX));
      this.previewY = Math.max(0, this.previewDragState.originY + (moveEvent.clientY - this.previewDragState.startY));
    };
    const up = (): void => {
      this.previewDragState = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  /** Canvas background settings shaped for the final compositor. */
  private canvasBackground(
    checker: GnumarusCheckerSettings,
    background: GnumarusBackgroundSettings,
  ): GnumarusPreviewBackground {
    return {
      mode: background.mode,
      checkerMode: checker.mode,
      sizeX: checker.sizeX,
      sizeY: checker.sizeY,
      colorA: checker.colorA,
      colorB: checker.colorB,
      color: background.color,
    };
  }

  private async refreshPreview(): Promise<void> {
    if (!this.previewOpen || this.engine === null) {
      return;
    }
    await this.updateComplete;
    const canvas = this.shadowRoot?.getElementById("previewCanvas") as HTMLCanvasElement | null;
    if (canvas === null) {
      return;
    }
    const size = this.engine.size;
    const infos = this.engine.getLayers();
    const pixels = this.engine.exportLayers();
    const inputs = infos.map((info) => {
      const rendered = pixels.find((entry) => entry.id === info.id);
      if (rendered === undefined) {
        throw new Error(`Missing pixels for layer ${info.id}`);
      }
      return {
        width: info.width,
        height: info.height,
        buffer: rendered.buffer,
        transform: { ...info.transform },
        visible: info.visible,
        opacity: info.opacity,
      };
    });
    const checker = this.engine.getCheckerSettings();
    const background = this.engine.getBackgroundSettings();
    const flat = compositeFinalImage(size.width, size.height, inputs, this.canvasBackground(checker, background));
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext("2d");
    if (ctx === null) {
      return;
    }
    const image = ctx.createImageData(size.width, size.height);
    image.data.set(flat);
    ctx.putImageData(image, 0, 0);
    const displayWidth = Math.max(1, Math.round(size.width * this.previewZoom));
    const displayHeight = Math.max(1, Math.round(size.height * this.previewZoom));
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
  }

  private refreshLayers(): void {
    if (this.engine === null) {
      this.layers = [];
      this.activeLayerId = "";
      this.floatingActive = false;
      this.layerText = "-";
      this.frameText = tr("frame.label", { frame: 1, count: 1, name: "F1" });
      return;
    }
    this.layers = this.engine.getLayers();
    this.activeLayerId = this.engine.getActiveLayerId();
    this.floatingActive = this.engine.hasFloatingSelection();
    const index = this.layers.findIndex((layer) => layer.id === this.activeLayerId);
    const current = index < 0 ? undefined : this.layers[index];
    this.layerText =
      current === undefined ? "-" : `${current.name} (${this.layers.length - index}/${this.layers.length})`;
    const frame = this.engine.getCurrentFrame();
    const count = this.engine.getFrameCount();
    this.frameText = tr("frame.label", { frame: frame + 1, count, name: this.engine.getFrameName(frame) });
    this.defaultFrameDuration = this.engine.getDefaultFrameDuration();
    if (this.previewOpen) {
      void this.refreshPreview();
    }
  }

  private onCellClick(layerId: string, frame: number): void {
    if (this.engine === null) {
      return;
    }
    const oldLayer = this.engine.getActiveLayerId();
    const oldFrame = this.engine.getCurrentFrame();
    const layerChanged = layerId !== oldLayer;
    const frameChanged = frame !== oldFrame;
    if (!layerChanged && !frameChanged) {
      return;
    }
    if (layerChanged) {
      this.engine.setActiveLayer(layerId);
    }
    if (frameChanged) {
      this.engine.setCurrentFrame(frame);
      this.selectSingleFrame(frame);
    }
    this.refreshLayers();
    const activeIndex = this.layers.findIndex((layer) => layer.id === this.engine?.getActiveLayerId());
    const active = activeIndex < 0 ? undefined : this.layers[activeIndex];
    const count = this.engine.getFrameCount();
    if (layerChanged && frameChanged && active !== undefined) {
      this.showToast(`${this.layerToastFor(activeIndex, this.layers.length, active.name)} — ${this.frameToastFor(frame, count)}`);
    } else if (layerChanged && active !== undefined) {
      this.showToast(this.layerToastFor(activeIndex, this.layers.length, active.name));
    } else if (frameChanged) {
      this.showToast(this.frameToastFor(frame, count));
    }
  }

  private onSelectFrame(frame: number): void {
    if (this.engine === null) {
      return;
    }
    if (this.engine.setCurrentFrame(frame)) {
      this.selectSingleFrame(frame);
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage = tr("status.frameSelected", { frame: frame + 1 });
      this.showToast(this.frameToastFor(frame, this.engine.getFrameCount()));
    }
  }

  /** Collapse the pending selection onto one frame (plain click paths). */
  private selectSingleFrame(frame: number): void {
    this.frameAnchor = frame;
    this.selectedFrames = [frame];
  }

  /** Valid selected frames for the current project, defaulting to the current frame. */
  private selectedFrameSet(): Set<number> {
    const count = this.engine?.getFrameCount() ?? 0;
    const current = this.engine?.getCurrentFrame() ?? 0;
    const valid = this.selectedFrames.filter(
      (frame) => Number.isInteger(frame) && frame >= 0 && frame < count,
    );
    return new Set(valid.length > 0 ? valid : count > 0 ? [Math.min(current, count - 1)] : []);
  }

  private onSelectFrameClick(frame: number, shiftKey: boolean): void {
    if (this.engine === null) {
      return;
    }
    if (!shiftKey) {
      this.onSelectFrame(frame);
      return;
    }
    const count = this.engine.getFrameCount();
    const anchor = this.frameAnchor ?? this.engine.getCurrentFrame();
    const clampedAnchor = Math.min(Math.max(0, anchor), count - 1);
    const low = Math.min(clampedAnchor, frame);
    const high = Math.max(clampedAnchor, frame);
    const range: number[] = [];
    for (let at = low; at <= high; at += 1) {
      range.push(at);
    }
    this.selectedFrames = range;
    if (this.engine.setCurrentFrame(frame)) {
      this.refreshLayers();
    } else {
      this.requestUpdate();
    }
    this.dirty = true;
    this.statusMessage =
      range.length === 1
        ? `Frame ${frame + 1} selected`
        : `Frames ${low + 1}-${high + 1} selected (${range.length})`;
    this.showToast(this.frameToastFor(frame, count));
  }

  private onAddFrame(): void {
    if (this.engine === null) {
      return;
    }
    const frame = this.engine.addFrame();
    this.selectSingleFrame(frame);
    this.refreshLayers();
    this.dirty = true;
    this.statusMessage = tr("status.frameAdded", { frame: frame + 1 });
  }

  private onAddFrameBefore(frame: number): void {
    this.closeMatrixMenu();
    if (this.engine === null) {
      return;
    }
    const added = this.engine.insertFrame(frame);
    if (added >= 0) {
      this.selectSingleFrame(added);
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage = tr("status.frameAdded", { frame: added + 1 });
    }
  }

  private onAddFrameAfter(frame: number): void {
    this.closeMatrixMenu();
    if (this.engine === null) {
      return;
    }
    const added = this.engine.insertFrame(frame + 1);
    if (added >= 0) {
      this.selectSingleFrame(added);
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage = tr("status.frameAdded", { frame: added + 1 });
    }
  }

  private onRemoveFrame(frame: number): void {
    this.closeMatrixMenu();
    if (this.engine === null) {
      return;
    }
    if (this.engine.removeFrame(frame)) {
      this.selectSingleFrame(this.engine.getCurrentFrame());
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage = tr("status.frameRemoved");
    } else {
      this.statusMessage = tr("status.frameRemoveLast");
    }
  }

  private openMatrixCellMenu(layerId: string, frame: number, clientX: number, clientY: number): void {
    this.closeLayerMenu();
    this.matrixMenu = { kind: "cell", layerId, frame, x: clientX, y: clientY };
  }

  private openMatrixLayerMenu(layerId: string, clientX: number, clientY: number): void {
    this.closeLayerMenu();
    this.matrixMenu = { kind: "layer", layerId, x: Math.min(clientX, window.innerWidth - 200), y: Math.min(clientY, window.innerHeight - 80) };
  }

  private openMatrixFrameMenu(frame: number, clientX: number, clientY: number): void {
    this.closeLayerMenu();
    const selected = this.selectedFrameSet();
    if (selected.size > 1 && selected.has(frame)) {
      this.matrixMenu = { kind: "frames", frames: [...selected].sort((a, b) => a - b), x: clientX, y: clientY };
      return;
    }
    if (!selected.has(frame) || selected.size !== 1) {
      this.frameAnchor = frame;
      this.selectedFrames = [frame];
    }
    this.matrixMenu = { kind: "frame", frame, x: clientX, y: clientY };
  }

  private closeMatrixMenu(): void {
    this.matrixMenu = null;
  }

  private matrixCellTarget(): { layerId: string; frame: number } | null {
    if (this.matrixMenu === null || this.matrixMenu.kind !== "cell") {
      return null;
    }
    return { layerId: this.matrixMenu.layerId, frame: this.matrixMenu.frame };
  }

  private sortedContents(): Array<{
    id: string;
    name: string;
    textureId: string | null;
    width: number;
    height: number;
  }> {
    if (this.engine === null) {
      return [];
    }
    return [...this.engine.getAnimationMatrix().contents].sort((left, right) =>
      left.name.localeCompare(right.name),
    );
  }

  private sortedTextures(): Array<{ id: string; name: string; width: number; height: number }> {
    if (this.engine === null) {
      return [];
    }
    return [...this.engine.getAnimationMatrix().textures].sort((left, right) =>
      left.name.localeCompare(right.name),
    );
  }

  private thumbnailDataUrl(textureId: string): string | null {
    if (this.engine === null) {
      return null;
    }
    const entry = this.engine.exportTextures().find((item) => item.id === textureId);
    if (entry === undefined || entry.width < 1 || entry.height < 1) {
      return null;
    }
    try {
      const canvas = document.createElement("canvas");
      canvas.width = entry.width;
      canvas.height = entry.height;
      const ctx = canvas.getContext("2d");
      if (ctx === null) {
        return null;
      }
      const image = new ImageData(new Uint8ClampedArray(entry.buffer), entry.width, entry.height);
      ctx.putImageData(image, 0, 0);
      return canvas.toDataURL();
    } catch {
      return null;
    }
  }

  private renderContentPickerDialog() {
    const contents = this.sortedContents();
    return html`
      <dialog id="contentPickerDialog" @close=${(): void => this.onContentPickerClosed()}>
        <h3>${tr("matrix.selectContent")}</h3>
        <div class="picker-grid" data-testid="content-picker-grid">
          <button
            class="picker-item"
            data-testid="content-picker-none"
            @click=${(): void => this.onContentPickerSelect("none")}
          >
            <span class="picker-empty" aria-hidden="true">∅</span>
            <span class="picker-name">${tr("dialog.noContent")}</span>
          </button>
          <button
            class="picker-item"
            data-testid="content-picker-new"
            @click=${(): void => this.onContentPickerSelect("new")}
          >
            <span class="picker-empty" aria-hidden="true">+</span>
            <span class="picker-name">${tr("dialog.newContent")}</span>
          </button>
          ${contents.map((content) => {
            const url = content.textureId === null ? null : this.thumbnailDataUrl(content.textureId);
            return html`
              <button
                class="picker-item"
                data-testid="content-picker-item"
                data-content-id=${content.id}
                title=${content.name}
                @click=${(): void => this.onContentPickerSelect(content.id)}
              >
                ${url !== null
                  ? html`<img class="picker-thumb" src=${url} alt="" data-texture-id=${content.textureId ?? ""} />`
                  : html`<span class="picker-empty" aria-hidden="true">∅</span>`}
                <span class="picker-name">${content.name}</span>
              </button>
            `;
          })}
        </div>
        <div class="dialog-actions">
          <button @click=${(): void => this.closeContentPicker()}>${tr("btn.cancel")}</button>
        </div>
      </dialog>
    `;
  }

  private renderTexturePickerDialog() {
    const textures = this.sortedTextures();
    return html`
      <dialog id="texturePickerDialog" @close=${(): void => this.onTexturePickerClosed()}>
        <h3>${tr("dialog.selectTexture")}</h3>
        <div class="picker-grid" data-testid="texture-picker-grid">
          <button
            class="picker-item"
            data-testid="texture-picker-none"
            @click=${(): void => this.onTexturePickerSelect("none")}
          >
            <span class="picker-empty" aria-hidden="true">∅</span>
            <span class="picker-name">${tr("dialog.noTexture")}</span>
          </button>
          <button
            class="picker-item"
            data-testid="texture-picker-new"
            @click=${(): void => this.onTexturePickerSelect("new")}
          >
            <span class="picker-empty" aria-hidden="true">+</span>
            <span class="picker-name">${tr("dialog.newTexture")}</span>
          </button>
          ${textures.map((texture) => {
            const url = this.thumbnailDataUrl(texture.id);
            return html`
              <button
                class="picker-item"
                data-testid="texture-picker-item"
                data-texture-id=${texture.id}
                title=${texture.name}
                @click=${(): void => this.onTexturePickerSelect(texture.id)}
              >
                ${url !== null
                  ? html`<img class="picker-thumb" src=${url} alt="" data-texture-id=${texture.id} />`
                  : html`<span class="picker-empty" aria-hidden="true">∅</span>`}
                <span class="picker-name">${texture.name}</span>
              </button>
            `;
          })}
        </div>
        <div class="dialog-actions">
          <button @click=${(): void => this.closeTexturePicker()}>${tr("btn.cancel")}</button>
        </div>
      </dialog>
    `;
  }

  private async onOpenContentPicker(): Promise<void> {
    const target = this.matrixCellTarget();
    this.closeMatrixMenu();
    if (target === null || this.engine === null) {
      return;
    }
    this.contentPickerTarget = { ...target };
    await this.updateComplete;
    const dialog = this.shadowRoot?.getElementById("contentPickerDialog") as HTMLDialogElement | null;
    dialog?.showModal();
  }

  private onContentPickerClosed(): void {
    this.contentPickerTarget = null;
  }

  private closeContentPicker(): void {
    const dialog = this.shadowRoot?.getElementById("contentPickerDialog") as HTMLDialogElement | null;
    dialog?.close();
    this.contentPickerTarget = null;
  }

  private onContentPickerSelect(contentId: string): void {
    const target = this.contentPickerTarget;
    if (target === null || this.engine === null) {
      this.closeContentPicker();
      return;
    }
    if (contentId === "none") {
      if (this.engine.dissociateCellContent(target.layerId, target.frame)) {
        this.refreshLayers();
        this.dirty = true;
        this.statusMessage = tr("status.cellDissociated");
      } else {
        this.statusMessage = tr("status.cellEmpty");
      }
      this.closeContentPicker();
      return;
    }
    if (contentId === "new") {
      const created = this.engine.createEmptyContentForCell(target.layerId, target.frame);
      if (created === null) {
        this.statusMessage = tr("status.contentCreateFailed");
        this.closeContentPicker();
        return;
      }
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage = tr("status.contentCreated");
      this.closeContentPicker();
      void this.openTexturePicker(created);
      return;
    }
    if (this.engine.associateCellContent(target.layerId, target.frame, contentId)) {
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage = tr("status.contentAssociated");
    } else {
      this.statusMessage = tr("status.contentSame");
    }
    this.closeContentPicker();
  }

  private async openTexturePicker(contentId: string): Promise<void> {
    if (this.engine === null) {
      return;
    }
    this.texturePickerContentId = contentId;
    await this.updateComplete;
    const dialog = this.shadowRoot?.getElementById("texturePickerDialog") as HTMLDialogElement | null;
    dialog?.showModal();
  }

  private onTexturePickerClosed(): void {
    this.texturePickerContentId = null;
  }

  private closeTexturePicker(): void {
    const dialog = this.shadowRoot?.getElementById("texturePickerDialog") as HTMLDialogElement | null;
    dialog?.close();
    this.texturePickerContentId = null;
  }

  private onTexturePickerSelect(textureId: string): void {
    const contentId = this.texturePickerContentId;
    if (contentId === null || this.engine === null) {
      this.closeTexturePicker();
      return;
    }
    if (textureId === "none") {
      this.statusMessage = tr("status.contentNoTexture");
      this.refreshLayers();
      this.closeTexturePicker();
      return;
    }
    if (textureId === "new") {
      const created = this.engine.createEmptyTexture();
      if (this.engine.associateContentTexture(contentId, created)) {
        this.refreshLayers();
        this.dirty = true;
        this.statusMessage = tr("status.textureAssociated");
      } else {
        this.statusMessage = tr("status.textureAssociateFailed");
      }
      this.closeTexturePicker();
      return;
    }
    if (this.engine.associateContentTexture(contentId, textureId)) {
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage = tr("status.textureAssociated");
    } else {
      this.statusMessage = tr("status.textureSame");
    }
    this.closeTexturePicker();
  }

  private applyDefaultFrameDurationFromDialog(): void {
    const input = this.shadowRoot?.getElementById("defaultFrameDuration") as HTMLInputElement | null;
    const raw = (input?.value ?? "").trim();
    if (raw === "") {
      // Mid-typing (cleared field): keep the current value instead of snapping.
      return;
    }
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) {
      // Partial input like "0.": wait for more typing (blur commits via change).
      return;
    }
    const duration = clampFrameDurationSec(value);
    this.defaultFrameDuration = duration;
    this.engine?.setDefaultFrameDuration(duration);
    this.refreshLayers();
    this.dirty = true;
    this.statusMessage = tr("status.defaultDuration", { value: duration });
  }

  private commitDefaultFrameDurationFromDialog(): void {
    const input = this.shadowRoot?.getElementById("defaultFrameDuration") as HTMLInputElement | null;
    const raw = (input?.value ?? "").trim();
    if (raw === "") {
      if (input !== null) {
        input.value = String(this.defaultFrameDuration);
      }
      return;
    }
    const duration = clampFrameDurationSec(Number(raw));
    this.defaultFrameDuration = duration;
    this.engine?.setDefaultFrameDuration(duration);
    this.refreshLayers();
    this.dirty = true;
    this.statusMessage = tr("status.defaultDuration", { value: duration });
  }

  private resetDefaultFrameDuration(): void {
    this.defaultFrameDuration = DEFAULT_ANIMATION_FRAME_DURATION;
    this.engine?.setDefaultFrameDuration(DEFAULT_ANIMATION_FRAME_DURATION);
    this.refreshLayers();
    this.dirty = true;
    this.statusMessage = tr("status.defaultDurationReset");
  }

  private openFrameDurationDialog(frame: number): void {
    if (this.engine === null) {
      return;
    }
    this.durationTargetFrame = frame;
    this.durationValue = this.engine.getFrameDuration(frame);
    this.requestUpdate();
    const dialog = this.shadowRoot?.getElementById("frameDurationDialog") as HTMLDialogElement | null;
    dialog?.showModal();
  }

  private onOpenFrameDuration(): void {
    if (this.matrixMenu === null || this.matrixMenu.kind !== "frame") {
      this.closeMatrixMenu();
      return;
    }
    const frame = this.matrixMenu.frame;
    this.closeMatrixMenu();
    this.openFrameDurationDialog(frame);
  }

  private closeFrameDurationDialog(): void {
    const dialog = this.shadowRoot?.getElementById("frameDurationDialog") as HTMLDialogElement | null;
    dialog?.close();
    this.durationTargetFrame = null;
  }

  private openAnimationDialog(): void {
    this.animationInput = "";
    this.animationError = null;
    const dialog = this.shadowRoot?.getElementById("animationDialog") as HTMLDialogElement | null;
    dialog?.showModal();
  }

  private closeAnimationDialog(): void {
    const dialog = this.shadowRoot?.getElementById("animationDialog") as HTMLDialogElement | null;
    dialog?.close();
    this.animationError = null;
  }

  private confirmAddAnimation(): void {
    if (this.engine === null) {
      this.closeAnimationDialog();
      return;
    }
    const input = this.shadowRoot?.getElementById("animationInput") as HTMLInputElement | null;
    const text = (input?.value ?? "").trim();
    let parsed;
    try {
      parsed = parseNamedAnimation(text, this.engine.getFrameCount());
    } catch (error) {
      this.animationError =
        error instanceof GnumarusNamedAnimationError ? error.message : tr("dialog.animInvalid");
      return;
    }
    if (!this.engine.addNamedAnimation(parsed)) {
      this.animationError = tr("dialog.animExists", { name: parsed.name });
      return;
    }
    this.animationInput = "";
    this.animationError = null;
    this.refreshLayers();
    this.dirty = true;
    this.statusMessage =
      parsed.frames.length === 1
        ? tr("status.animAddedOne", { name: parsed.name })
        : tr("status.animAdded", { name: parsed.name, count: parsed.frames.length });
  }

  private onDeleteAnimation(name: string): void {
    this.animationDeleteTarget = name;
    const dialog = this.shadowRoot?.getElementById("animationDeleteDialog") as HTMLDialogElement | null;
    dialog?.showModal();
    const no = this.shadowRoot?.getElementById("animationDeleteNo") as HTMLButtonElement | null;
    no?.focus();
  }

  private confirmDeleteAnimation(): void {
    const name = this.animationDeleteTarget;
    const dialog = this.shadowRoot?.getElementById("animationDeleteDialog") as HTMLDialogElement | null;
    dialog?.close();
    this.animationDeleteTarget = null;
    if (name === null || this.engine === null) {
      return;
    }
    if (this.engine.removeNamedAnimation(name)) {
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage = tr("status.animDeleted", { name });
      this.showToast(tr("status.animDeleted", { name }));
    }
  }

  private cancelDeleteAnimation(): void {
    const dialog = this.shadowRoot?.getElementById("animationDeleteDialog") as HTMLDialogElement | null;
    if (dialog?.open === true) {
      dialog.close();
    }
    this.animationDeleteTarget = null;
  }

  private onDeleteFrames(frames: number[]): void {
    this.closeMatrixMenu();
    if (this.engine === null || frames.length === 0) {
      return;
    }
    this.deleteFramesTarget = [...frames].sort((first, second) => first - second);
    const dialog = this.shadowRoot?.getElementById("deleteFramesDialog") as HTMLDialogElement | null;
    dialog?.showModal();
    const cancel = this.shadowRoot?.getElementById("deleteFramesNo") as HTMLButtonElement | null;
    cancel?.focus();
  }

  private confirmDeleteFrames(): void {
    const target = this.deleteFramesTarget === null ? [] : [...this.deleteFramesTarget];
    const dialog = this.shadowRoot?.getElementById("deleteFramesDialog") as HTMLDialogElement | null;
    dialog?.close();
    this.deleteFramesTarget = null;
    if (this.engine === null || target.length === 0) {
      return;
    }
    const deleted = this.engine.removeFrames(target);
    if (deleted > 0) {
      this.selectSingleFrame(this.engine.getCurrentFrame());
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage =
      deleted === 1 ? tr("status.frameDeletedOne") : tr("status.framesDeleted", { count: deleted });
      this.showToast(deleted === 1 ? tr("status.frameDeletedOne") : tr("status.framesDeleted", { count: deleted }));
    } else {
      this.statusMessage = tr("status.framesDeleteAll");
    }
  }

  private cancelDeleteFrames(): void {
    const dialog = this.shadowRoot?.getElementById("deleteFramesDialog") as HTMLDialogElement | null;
    if (dialog?.open === true) {
      dialog.close();
    }
    this.deleteFramesTarget = null;
  }

  private onSelectAnimation(event: Event): void {
    if (this.engine === null) {
      return;
    }
    const value = (event.target as HTMLSelectElement).value;
    if (value === "") {
      if (this.engine.setActiveAnimation(null)) {
        this.refreshLayers();
        this.dirty = true;
        this.statusMessage = tr("status.playingAll");
      }
      return;
    }
    if (this.engine.setActiveAnimation(value)) {
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage = tr("status.animSelected", { value });
    }
  }

  private async openExportDialog(): Promise<void> {
    if (this.engine === null) {
      return;
    }
    this.fileMenuOpen = false;
    this.exportFrame = this.engine.getCurrentFrame() + 1;
    this.exportFormats = detectStillFormats();
    if (findStillFormat(this.exportFormats, JXL_MIME) === null) {
      // Browsers never encode JXL through a canvas; our WASM codec does.
      this.exportFormats = [...this.exportFormats, { mime: JXL_MIME, ext: JXL_EXT, label: JXL_LABEL, alpha: true }];
    }
    if (findStillFormat(this.exportFormats, WEBP_MIME) === null) {
      // Canvas WebP has no lossless option; our WASM codec does.
      this.exportFormats = [...this.exportFormats, { mime: WEBP_MIME, ext: WEBP_EXT, label: WEBP_LABEL, alpha: true }];
    }
    if (findStillFormat(this.exportFormats, this.exportFormat) === null) {
      this.exportFormat = this.exportFormats[0]?.mime ?? "image/png";
    }
    this.exportAnimation = this.engine.getActiveAnimationName() ?? "";
    if (
      this.exportAnimation !== "" &&
      !this.engine.getNamedAnimations().some((animation) => animation.name === this.exportAnimation)
    ) {
      this.exportAnimation = "";
    }
    if (
      this.exportAnimatedFormat !== "gif" &&
      this.exportAnimatedFormat !== "jxl" &&
      this.exportAnimatedFormat !== "webp" &&
      findStillFormat(this.exportFormats, this.exportAnimatedFormat) === null
    ) {
      this.exportAnimatedFormat = "gif";
    }
    if (findStillFormat(this.exportFormats, this.exportSheetFormat) === null) {
      this.exportSheetFormat = this.exportFormats[0]?.mime ?? "image/png";
    }
    await this.updateComplete;
    const dialog = this.shadowRoot?.getElementById("exportDialog") as HTMLDialogElement | null;
    dialog?.showModal();
    const ok = this.shadowRoot?.getElementById("exportOk") as HTMLButtonElement | null;
    ok?.focus();
  }

  private closeExportDialog(): void {
    const dialog = this.shadowRoot?.getElementById("exportDialog") as HTMLDialogElement | null;
    dialog?.close();
  }

  /**
   * Save one blob through the OS save dialog (or the download fallback),
   * returning false only when the user cancels.
   */
  private async saveExportBlob(blob: Blob, fileName: string, description: string): Promise<boolean> {
    const mime = blob.type === "" ? "application/octet-stream" : blob.type;
    const dot = fileName.lastIndexOf(".");
    const ext = dot < 0 ? "bin" : fileName.slice(dot + 1);
    try {
      if (isFileSaveSupported()) {
        const handle = await pickSaveFile(fileName, description, { [mime]: [`.${ext}`] });
        if (handle === null) {
          downloadBlob(blob, fileName);
          return true;
        }
        await writeBlobToFile(handle, blob);
        return true;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return false;
      }
      throw error;
    }
    downloadBlob(blob, fileName);
    return true;
  }

  /**
   * Encode through a canvas, except JXL and WebP which go through their WASM
   * codecs (browsers cannot encode JXL at all and canvas WebP has no
   * lossless option). Quality percent is 1-100 or undefined for the browser
   * default; the WASM codecs ignore it when lossless.
   */
  private async encodeExportStill(
    buffer: Uint8ClampedArray,
    width: number,
    height: number,
    format: GnumarusStillFormat,
    qualityPercent: number | undefined,
    wasmLossless: boolean,
  ): Promise<Blob | null> {
    if (format.mime === JXL_MIME) {
      try {
        const bytes = await encodeJxlStill(buffer, width, height, {
          lossless: wasmLossless,
          quality: qualityPercent ?? GNUMARUS_DEFAULT_STILL_QUALITY,
        });
        return new Blob([bytes as Uint8Array<ArrayBuffer>], { type: JXL_MIME });
      } catch {
        return null;
      }
    }
    if (format.mime === WEBP_MIME) {
      try {
        const bytes = await encodeWebpStill(buffer, width, height, {
          lossless: wasmLossless,
          quality: qualityPercent ?? GNUMARUS_DEFAULT_STILL_QUALITY,
        });
        return new Blob([bytes as Uint8Array<ArrayBuffer>], { type: WEBP_MIME });
      } catch {
        return null;
      }
    }
    const fraction = qualityPercent === undefined ? undefined : qualityPercent / 100;
    return encodeStillImage(buffer, width, height, format.mime, fraction);
  }

  private async confirmExportFrame(): Promise<void> {
    if (this.engine === null) {
      this.closeExportDialog();
      return;
    }
    const frameCount = this.engine.getFrameCount();
    const input = this.shadowRoot?.getElementById("exportFrame") as HTMLInputElement | null;
    const raw = Math.floor(Number(input?.value ?? String(this.exportFrame)));
    const frame = Number.isFinite(raw) ? Math.min(frameCount, Math.max(1, raw)) : 1;
    this.exportFrame = frame;
    const format = findStillFormat(this.exportFormats, this.exportFormat) ?? this.exportFormats[0] ?? null;
    if (format === null) {
      this.closeExportDialog();
      this.statusMessage = tr("status.exportNoFormat");
      this.showToast(tr("status.exportNoFormat"));
      return;
    }
    const inputs = this.engine.getFrameFlattenInputs(frame - 1);
    if (inputs === null) {
      this.closeExportDialog();
      this.statusMessage = tr("status.exportBadFrame");
      this.showToast(tr("status.exportBadFrame"));
      return;
    }
    try {
      const size = this.engine.size;
      const background = format.alpha
        ? undefined
        : this.canvasBackground(this.engine.getCheckerSettings(), this.engine.getBackgroundSettings());
      const qualityInput = this.shadowRoot?.getElementById("exportQuality") as HTMLInputElement | null;
      const quality = normalizeStillQualityPercent(Number(qualityInput?.value ?? this.exportQuality));
      this.exportQuality = quality;
      const flat = compositeFinalImage(size.width, size.height, inputs, background);
      const blob = await this.encodeExportStill(
        flat,
        size.width,
        size.height,
        format,
        format.mime === "image/png" ? undefined : quality,
        format.mime === WEBP_MIME ? this.exportWebpLossless : this.exportJxlLossless,
      );
      if (blob === null) {
        this.closeExportDialog();
        this.statusMessage = tr("status.exportUnsupported", { label: format.label });
        this.showToast(tr("status.exportUnsupported", { label: format.label }));
        return;
      }
      const fileName = `${exportBaseName(this.projectName)}-frame-${frame}.${format.ext}`;
      this.closeExportDialog();
      if (await this.saveExportBlob(blob, fileName, `${format.label} image`)) {
        this.statusMessage = tr("status.exported", { file: fileName });
        this.showToast(tr("status.exported", { file: fileName }));
      }
    } catch (error) {
      this.closeExportDialog();
      const reason = error instanceof Error ? error.message : String(error);
      this.statusMessage = tr("status.exportFailed", { reason });
      this.showToast(tr("status.exportFailed", { reason }));
    }
  }

  /**
   * Resolve the animated export selection: project frames in playback
   * order with millisecond delays, plus whether it loops forever.
   */
  private resolveAnimatedExport(): { frames: Array<{ frame: number; delayMs: number }>; loop: boolean; label: string } | null {
    if (this.engine === null) {
      return null;
    }
    const select = this.shadowRoot?.getElementById("exportAnimation") as HTMLSelectElement | null;
    const name = select?.value ?? this.exportAnimation;
    this.exportAnimation = name;
    if (name === "") {
      const count = this.engine.getFrameCount();
      const frames = [];
      for (let frame = 0; frame < count; frame += 1) {
        frames.push({ frame, delayMs: frameDurationTimeoutMs(this.engine.getEffectiveFrameDuration(frame)) });
      }
      return { frames, loop: true, label: "frames" };
    }
    const animation = this.engine.getNamedAnimations().find((entry) => entry.name === name) ?? null;
    if (animation === null) {
      return null;
    }
    const frames = resolveExportSequence(animation).map((entry) => ({
      frame: entry.frame,
      delayMs: frameDurationTimeoutMs(entry.duration ?? this.engine?.getEffectiveFrameDuration(entry.frame) ?? 0),
    }));
    return { frames, loop: animation.loop !== "none", label: name };
  }

  private failAnimatedExport(message: string): void {
    this.closeExportDialog();
    this.statusMessage = message;
    this.showToast(message);
  }

  private async confirmExportAnimated(): Promise<void> {
    if (this.engine === null) {
      this.closeExportDialog();
      return;
    }
    const formatSelect = this.shadowRoot?.getElementById("exportAnimatedFormat") as HTMLSelectElement | null;
    const formatValue = formatSelect?.value ?? this.exportAnimatedFormat;
    this.exportAnimatedFormat = formatValue;
    const resolved = this.resolveAnimatedExport();
    if (resolved === null) {
      this.failAnimatedExport("Export failed: unknown animation");
      return;
    }
    if (resolved.frames.length === 0) {
      this.failAnimatedExport(`Export failed: animation ${resolved.label} has no frames`);
      return;
    }
    const base = exportBaseName(this.projectName);
    try {
      if (formatValue === "gif") {
        const size = this.engine.size;
        const encoder = createGifEncoder(size.width, size.height, resolved.loop);
        for (const entry of resolved.frames) {
          const inputs = this.engine.getFrameFlattenInputs(entry.frame);
          if (inputs === null) {
            this.failAnimatedExport("Export failed: invalid frame");
            return;
          }
          encoder.addFrame(compositeFinalImage(size.width, size.height, inputs), entry.delayMs);
        }
        const blob = new Blob([encoder.finish() as Uint8Array<ArrayBuffer>], { type: "image/gif" });
        const fileName = `${base}-${resolved.label}.gif`;
        this.closeExportDialog();
        if (await this.saveExportBlob(blob, fileName, "GIF animation")) {
          this.statusMessage = tr("status.exported", { file: fileName });
          this.showToast(tr("status.exported", { file: fileName }));
        }
        return;
      }
      if (formatValue === "jxl") {
        const size = this.engine.size;
        const animatedQualityInput = this.shadowRoot?.getElementById(
          "exportAnimatedQuality",
        ) as HTMLInputElement | null;
        const animatedQuality = normalizeStillQualityPercent(
          Number(animatedQualityInput?.value ?? this.exportAnimatedQuality),
        );
        this.exportAnimatedQuality = animatedQuality;
        const frames: Array<{ buffer: Uint8ClampedArray; delayMs: number }> = [];
        for (const entry of resolved.frames) {
          const inputs = this.engine.getFrameFlattenInputs(entry.frame);
          if (inputs === null) {
            this.failAnimatedExport("Export failed: invalid frame");
            return;
          }
          frames.push({
            buffer: compositeFinalImage(size.width, size.height, inputs),
            delayMs: entry.delayMs,
          });
        }
        try {
          const bytes = await encodeJxlAnimation(frames, size.width, size.height, resolved.loop, {
            lossless: this.exportAnimatedJxlLossless,
            quality: animatedQuality,
          });
          const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: JXL_MIME });
          const fileName = `${base}-${resolved.label}.jxl`;
          this.closeExportDialog();
          if (await this.saveExportBlob(blob, fileName, "JXL animation")) {
            this.statusMessage = tr("status.exported", { file: fileName });
            this.showToast(tr("status.exported", { file: fileName }));
          }
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          this.failAnimatedExport(`Export failed: ${reason}`);
        }
        return;
      }
      if (formatValue === "webp") {
        const size = this.engine.size;
        const animatedQualityInput = this.shadowRoot?.getElementById(
          "exportAnimatedQuality",
        ) as HTMLInputElement | null;
        const animatedQuality = normalizeStillQualityPercent(
          Number(animatedQualityInput?.value ?? this.exportAnimatedQuality),
        );
        this.exportAnimatedQuality = animatedQuality;
        const frames: Array<{ buffer: Uint8ClampedArray; delayMs: number }> = [];
        for (const entry of resolved.frames) {
          const inputs = this.engine.getFrameFlattenInputs(entry.frame);
          if (inputs === null) {
            this.failAnimatedExport("Export failed: invalid frame");
            return;
          }
          frames.push({
            buffer: compositeFinalImage(size.width, size.height, inputs),
            delayMs: entry.delayMs,
          });
        }
        try {
          const bytes = await encodeWebpAnimation(frames, size.width, size.height, resolved.loop, {
            lossless: this.exportAnimatedWebpLossless,
            quality: animatedQuality,
          });
          const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: WEBP_MIME });
          const fileName = `${base}-${resolved.label}.webp`;
          this.closeExportDialog();
          if (await this.saveExportBlob(blob, fileName, "WebP animation")) {
            this.statusMessage = tr("status.exported", { file: fileName });
            this.showToast(tr("status.exported", { file: fileName }));
          }
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          this.failAnimatedExport(`Export failed: ${reason}`);
        }
        return;
      }
      const format = findStillFormat(this.exportFormats, formatValue) ?? null;
      if (format === null) {
        this.failAnimatedExport("Export failed: no image format is available");
        return;
      }
      const size = this.engine.size;
      const background = format.alpha
        ? undefined
        : this.canvasBackground(this.engine.getCheckerSettings(), this.engine.getBackgroundSettings());
      const animatedQualityInput = this.shadowRoot?.getElementById(
        "exportAnimatedQuality",
      ) as HTMLInputElement | null;
      const animatedQuality = normalizeStillQualityPercent(
        Number(animatedQualityInput?.value ?? this.exportAnimatedQuality),
      );
      this.exportAnimatedQuality = animatedQuality;
      const animatedQualityOrDefault = format.mime === "image/png" ? undefined : animatedQuality;
      const blobs: Blob[] = [];
      for (const entry of resolved.frames) {
        const inputs = this.engine.getFrameFlattenInputs(entry.frame);
        if (inputs === null) {
          this.failAnimatedExport("Export failed: invalid frame");
          return;
        }
        const flat = compositeFinalImage(size.width, size.height, inputs, background);
        const blob = await this.encodeExportStill(
          flat,
          size.width,
          size.height,
          format,
          animatedQualityOrDefault,
          format.mime === WEBP_MIME ? this.exportAnimatedWebpLossless : this.exportAnimatedJxlLossless,
        );
        if (blob === null) {
          this.failAnimatedExport(tr("status.exportUnsupported", { label: format.label }));
          return;
        }
        blobs.push(blob);
      }
      const stem = `${base}-${resolved.label}`;
      this.closeExportDialog();
      await this.saveStillSequence(blobs, stem, format);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.failAnimatedExport(`Export failed: ${reason}`);
    }
  }

  /**
   * Save encoded stills as numbered files (`stem-001.ext`) through the
   * directory picker, or as one download per file when it is missing.
   * Directory-picker cancellation stays silent.
   */
  private async saveStillSequence(
    blobs: Blob[],
    stem: string,
    format: GnumarusStillFormat,
  ): Promise<void> {
    if (isFileSystemAccessSupported()) {
      try {
        const dir = await pickProjectDirectory();
        for (let index = 0; index < blobs.length; index += 1) {
          const blob = blobs[index];
          if (blob === undefined) {
            continue;
          }
          await writeBlobToDirectory(dir, `${frameFileStem(stem, index)}.${format.ext}`, blob);
        }
        this.statusMessage = tr("status.exportedMany", { count: blobs.length, dir: dir.name });
        this.showToast(tr("status.exportedMany", { count: blobs.length, dir: dir.name }));
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          throw error;
        }
      }
      return;
    }
    for (let index = 0; index < blobs.length; index += 1) {
      const blob = blobs[index];
      if (blob === undefined) {
        continue;
      }
      downloadBlob(blob, `${frameFileStem(stem, index)}.${format.ext}`);
    }
    this.statusMessage = tr("status.exportedManyNoDir", { count: blobs.length });
    this.showToast(tr("status.exportedManyNoDir", { count: blobs.length }));
  }

  /**
   * Resolve the spritesheet sources into strips of project frame indices:
   * checked animations in definition order, then the all-frames strip,
   * then the manual frame list. Throws with a user-facing message when
   * nothing usable is selected.
   */
  private resolveSheetStrips(): Array<{ frames: number[] }> {
    if (this.engine === null) {
      throw new Error("Export failed: no project is open");
    }
    const strips: Array<{ frames: number[] }> = [];
    const boxes = this.shadowRoot?.querySelectorAll("[data-export-sheet-anim]") ?? [];
    const names = new Set<string>();
    boxes.forEach((box) => {
      if (box instanceof HTMLInputElement && box.checked) {
        const name = box.getAttribute("data-export-sheet-anim") ?? "";
        if (name !== "") {
          names.add(name);
        }
      }
    });
    for (const animation of this.engine.getNamedAnimations()) {
      if (names.has(animation.name)) {
        strips.push({ frames: resolveExportSequence(animation).map((entry) => entry.frame) });
      }
    }
    const allBox = this.shadowRoot?.getElementById("exportSheetAll") as HTMLInputElement | null;
    if (allBox?.checked === true) {
      const frames: number[] = [];
      for (let frame = 0; frame < this.engine.getFrameCount(); frame += 1) {
        frames.push(frame);
      }
      strips.push({ frames });
    }
    const listInput = this.shadowRoot?.getElementById("exportSheetFrames") as HTMLInputElement | null;
    const listText = listInput?.value.trim() ?? "";
    if (listText !== "") {
      strips.push({ frames: parseFrameList(listText, this.engine.getFrameCount()) });
    }
    if (strips.every((strip) => strip.frames.length === 0)) {
      throw new Error("Export failed: select an animation or list frames like 1,3-5");
    }
    return strips;
  }

  /** Composite one project frame (or null for bad frames). */
  private compositeSheetFrame(frame: number, background: GnumarusPreviewBackground | undefined): Uint8ClampedArray | null {
    if (this.engine === null) {
      return null;
    }
    const inputs = this.engine.getFrameFlattenInputs(frame);
    if (inputs === null) {
      return null;
    }
    const size = this.engine.size;
    return compositeFinalImage(size.width, size.height, inputs, background);
  }

  private async confirmExportSheet(): Promise<void> {
    if (this.engine === null) {
      this.closeExportDialog();
      return;
    }
    const layoutSelect = this.shadowRoot?.getElementById("exportSheetLayout") as HTMLSelectElement | null;
    const layoutValue = layoutSelect?.value ?? this.exportSheetLayout;
    this.exportSheetLayout = layoutValue;
    const formatSelect = this.shadowRoot?.getElementById("exportSheetFormat") as HTMLSelectElement | null;
    const formatValue = formatSelect?.value ?? this.exportSheetFormat;
    this.exportSheetFormat = formatValue;
    const countInput = this.shadowRoot?.getElementById("exportSheetCount") as HTMLInputElement | null;
    const countRaw = Math.floor(Number(countInput?.value ?? String(this.exportSheetCount)));
    this.exportSheetCount = Number.isFinite(countRaw) ? countRaw : 0;
    const fail = (message: string): void => {
      this.closeExportDialog();
      this.statusMessage = message;
      this.showToast(message);
    };
    const format = findStillFormat(this.exportFormats, formatValue) ?? null;
    if (format === null) {
      fail(tr("status.exportNoFormat"));
      return;
    }
    let strips: Array<{ frames: number[] }>;
    try {
      strips = this.resolveSheetStrips();
    } catch (error) {
      fail(error instanceof Error ? error.message : tr("status.exportBadSources"));
      return;
    }
    const base = exportBaseName(this.projectName);
    try {
      const size = this.engine.size;
      const background = format.alpha
        ? undefined
        : this.canvasBackground(this.engine.getCheckerSettings(), this.engine.getBackgroundSettings());
      const sheetQualityInput = this.shadowRoot?.getElementById(
        "exportSheetQuality",
      ) as HTMLInputElement | null;
      const sheetQuality = normalizeStillQualityPercent(
        Number(sheetQualityInput?.value ?? this.exportSheetQuality),
      );
      this.exportSheetQuality = sheetQuality;
      const sheetQualityValue = format.mime === "image/png" ? undefined : sheetQuality;
      if (layoutValue === "individual") {
        const flat = strips.flatMap((strip) => strip.frames);
        const blobs: Blob[] = [];
        for (const frame of flat) {
          const flatPixels = this.compositeSheetFrame(frame, background);
          if (flatPixels === null) {
            fail(tr("status.exportBadFrame"));
            return;
          }
          const blob = await this.encodeExportStill(
            flatPixels,
            size.width,
            size.height,
            format,
            sheetQualityValue,
            format.mime === WEBP_MIME ? this.exportSheetWebpLossless : this.exportSheetJxlLossless,
          );
          if (blob === null) {
            fail(tr("status.exportUnsupported", { label: format.label }));
            return;
          }
          blobs.push(blob);
        }
        this.closeExportDialog();
        await this.saveStillSequence(blobs, `${base}-sheet`, format);
        return;
      }
      const geometry = computeSheetGeometry(strips, layoutValue as GnumarusSheetLayout, this.exportSheetCount);
      const needed = new Set<number>();
      for (const cell of geometry.cells) {
        needed.add(cell.frame);
      }
      const pixels = new Map<number, Uint8ClampedArray>();
      for (const frame of needed) {
        const flatPixels = this.compositeSheetFrame(frame, background);
        if (flatPixels === null) {
          fail(tr("status.exportBadFrame"));
          return;
        }
        pixels.set(frame, flatPixels);
      }
      const sheet = composeSheet(pixels, geometry, size.width, size.height);
      const blob = await this.encodeExportStill(
        sheet.buffer,
        sheet.width,
        sheet.height,
        format,
        sheetQualityValue,
        format.mime === WEBP_MIME ? this.exportSheetWebpLossless : this.exportSheetJxlLossless,
      );
      if (blob === null) {
        fail(tr("status.exportUnsupported", { label: format.label }));
        return;
      }
      const fileName = `${base}-sheet.${format.ext}`;
      this.closeExportDialog();
      if (await this.saveExportBlob(blob, fileName, `${format.label} image`)) {
        this.statusMessage = tr("status.exported", { file: fileName });
        this.showToast(tr("status.exported", { file: fileName }));
      }
    } catch (error) {
      fail(error instanceof Error ? error.message : tr("status.exportBadSheet"));
    }
  }

  private confirmFrameDuration(): void {
    const target = this.durationTargetFrame;
    if (target === null || this.engine === null) {
      this.closeFrameDurationDialog();
      return;
    }
    const input = this.shadowRoot?.getElementById("frameDuration") as HTMLInputElement | null;
    const raw = (input?.value ?? "").trim();
    if (raw === "") {
      this.engine.setFrameDuration(target, null);
      this.statusMessage = tr("status.frameUsesDefault", { frame: target + 1 });
    } else {
      const value = Number(raw);
      if (!Number.isFinite(value) || value <= 0) {
        this.closeFrameDurationDialog();
        return;
      }
      const duration = clampFrameDurationSec(value);
      this.engine.setFrameDuration(target, duration);
      this.statusMessage = tr("status.frameDuration", { frame: target + 1, value: duration });
    }
    this.refreshLayers();
    this.dirty = true;
    this.closeFrameDurationDialog();
  }

  private clearFrameDuration(): void {
    const target = this.durationTargetFrame;
    this.closeFrameDurationDialog();
    if (target === null || this.engine === null) {
      return;
    }
    if (this.engine.setFrameDuration(target, null)) {
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage = tr("status.frameUsesDefault", { frame: target + 1 });
    }
  }

  private frameRenameTarget: number | null = null;

  private frameRenameValue(): string {
    if (this.frameRenameTarget === null || this.engine === null) {
      return "";
    }
    return this.engine.getFrameName(this.frameRenameTarget);
  }

  private onFrameRenameStart(frame: number): void {
    this.renamingFrame = frame;
  }

  private onFrameRenameCancel(): void {
    this.renamingFrame = null;
  }

  private onFrameRenameCommit(frame: number): void {
    if (this.renamingFrame !== frame) {
      return;
    }
    this.renamingFrame = null;
    const input = this.shadowRoot?.querySelector(`[data-testid="anim-frame-rename"][data-frame="${frame}"]`);
    const name = input instanceof HTMLInputElement ? input.value : "";
    if (name.trim().length === 0) {
      this.refreshLayers();
      return;
    }
    if (this.engine?.renameFrame(frame, name) === true) {
      this.dirty = true;
      this.statusMessage = tr("status.frameRenamed");
    }
    this.refreshLayers();
  }

  private onRenameFrameFromMenu(): void {
    if (this.matrixMenu === null || this.matrixMenu.kind !== "frame") {
      this.closeMatrixMenu();
      return;
    }
    const frame = this.matrixMenu.frame;
    this.closeMatrixMenu();
    this.openFrameRenameDialog(frame);
  }

  private openFrameRenameDialog(frame: number): void {
    if (this.engine === null) {
      return;
    }
    this.frameRenameTarget = frame;
    this.requestUpdate();
    const dialog = this.shadowRoot?.getElementById("frameRenameDialog") as HTMLDialogElement | null;
    dialog?.showModal();
  }

  private closeFrameRenameDialog(): void {
    const dialog = this.shadowRoot?.getElementById("frameRenameDialog") as HTMLDialogElement | null;
    dialog?.close();
    this.frameRenameTarget = null;
  }

  private confirmFrameRename(): void {
    const target = this.frameRenameTarget;
    if (target === null || this.engine === null) {
      this.closeFrameRenameDialog();
      return;
    }
    const input = this.shadowRoot?.getElementById("frameRename") as HTMLInputElement | null;
    const name = input?.value ?? "";
    if (name.trim().length === 0) {
      this.closeFrameRenameDialog();
      return;
    }
    if (this.engine.renameFrame(target, name)) {
      this.dirty = true;
      this.statusMessage = tr("status.frameRenamed");
    }
    this.refreshLayers();
    this.closeFrameRenameDialog();
  }

  private layerRenameTarget: string | null = null;

  private layerRenameValue(): string {
    if (this.layerRenameTarget === null || this.engine === null) {
      return "";
    }
    return this.engine.getLayers().find((layer) => layer.id === this.layerRenameTarget)?.name ?? "";
  }

  private onRenameLayerFromMenu(): void {
    if (this.matrixMenu === null || this.matrixMenu.kind !== "layer") {
      this.closeMatrixMenu();
      return;
    }
    const layerId = this.matrixMenu.layerId;
    this.closeMatrixMenu();
    this.openLayerRenameDialog(layerId);
  }

  private openLayerRenameDialog(layerId: string): void {
    if (this.engine === null) {
      return;
    }
    this.layerRenameTarget = layerId;
    this.requestUpdate();
    const dialog = this.shadowRoot?.getElementById("layerRenameDialog") as HTMLDialogElement | null;
    dialog?.showModal();
  }

  private closeLayerRenameDialog(): void {
    const dialog = this.shadowRoot?.getElementById("layerRenameDialog") as HTMLDialogElement | null;
    dialog?.close();
    this.layerRenameTarget = null;
  }

  private confirmLayerRename(): void {
    const target = this.layerRenameTarget;
    if (target === null || this.engine === null) {
      this.closeLayerRenameDialog();
      return;
    }
    const input = this.shadowRoot?.getElementById("layerRename") as HTMLInputElement | null;
    const name = input?.value ?? "";
    if (name.trim().length === 0) {
      this.refreshLayers();
      this.closeLayerRenameDialog();
      return;
    }
    if (this.engine.renameLayer(target, name)) {
      this.dirty = true;
      this.statusMessage = tr("status.layerRenamed");
    }
    this.refreshLayers();
    this.closeLayerRenameDialog();
  }

  private togglePlayback(): void {
    if (this.engine === null) {
      return;
    }
    if (this.playing) {
      this.stopPlayback(tr("status.stopped"));
      return;
    }
    const activeName = this.engine.getActiveAnimationName();
    const animation =
      activeName === null
        ? null
        : (this.engine.getNamedAnimations().find((entry) => entry.name === activeName) ?? null);
    if (animation !== null && animation.frames.length === 0) {
      this.statusMessage = tr("status.animNoFrames", { name: animation.name });
      return;
    }
    this.playing = true;
    this.playbackAnimation = animation;
    this.playbackDirection = 1;
    if (animation === null) {
      this.playbackIndex = 0;
      this.statusMessage = tr("status.playingFrom", { frame: this.engine.getCurrentFrame() + 1 });
    } else {
      const current = this.engine.getCurrentFrame();
      const resume = animation.frames.findIndex((entry) => entry.frame === current);
      this.playbackIndex = resume < 0 ? 0 : resume;
      const start = animation.frames[this.playbackIndex];
      if (start !== undefined) {
        this.engine.setCurrentFrame(start.frame);
        this.refreshLayers();
      }
      this.statusMessage = tr("status.playingAnimFrom", { name: animation.name, frame: (start?.frame ?? 0) + 1 });
    }
    this.schedulePlaybackTick();
  }

  private stopPlayback(message = ""): void {
    if (this.playTimer !== null) {
      window.clearTimeout(this.playTimer);
      this.playTimer = null;
    }
    this.playbackAnimation = null;
    if (this.playing) {
      this.playing = false;
      if (message !== "") {
        this.statusMessage = message;
      }
    }
  }

  private schedulePlaybackTick(): void {
    if (!this.playing || this.engine === null) {
      return;
    }
    const animation = this.playbackAnimation;
    if (animation === null) {
      const delay = frameDurationTimeoutMs(this.engine.getEffectiveFrameDuration(this.engine.getCurrentFrame()));
      if (this.playTimer !== null) {
        window.clearTimeout(this.playTimer);
      }
      this.playTimer = window.setTimeout(() => {
        if (!this.playing || this.engine === null) {
          return;
        }
        const next = (this.engine.getCurrentFrame() + 1) % Math.max(1, this.engine.getFrameCount());
        this.engine.setCurrentFrame(next);
        this.refreshLayers();
        this.schedulePlaybackTick();
      }, delay);
      return;
    }
    const entry = animation.frames[this.playbackIndex];
    if (entry === undefined) {
      this.playbackAnimation = null;
      this.stopPlayback(`Animation ${animation.name} has no frames to play`);
      this.refreshLayers();
      return;
    }
    const delay = frameDurationTimeoutMs(entry.duration ?? this.engine.getEffectiveFrameDuration(entry.frame));
    if (this.playTimer !== null) {
      window.clearTimeout(this.playTimer);
    }
    this.playTimer = window.setTimeout(() => {
      if (!this.playing || this.engine === null) {
        return;
      }
      const step = nextAnimationStep(animation, this.playbackIndex, this.playbackDirection);
      if (step === null) {
        this.playbackAnimation = null;
        this.stopPlayback(`Animation ${animation.name} finished`);
        this.refreshLayers();
        return;
      }
      this.playbackIndex = step.index;
      this.playbackDirection = step.direction;
      const next = animation.frames[step.index];
      if (next !== undefined) {
        this.engine.setCurrentFrame(next.frame);
      }
      this.refreshLayers();
      this.schedulePlaybackTick();
    }, delay);
  }

  private onAddLayer(): void {
    if (this.engine === null) {
      return;
    }
    this.engine.addLayer();
    this.refreshLayers();
    this.dirty = true;
    this.statusMessage = tr("status.layerAdded");
  }

  private onRemoveLayer(id: string): void {
    if (this.engine === null) {
      return;
    }
    if (this.engine.removeLayer(id)) {
      this.statusMessage = tr("status.layerDeleted");
      this.dirty = true;
    } else {
      this.statusMessage = tr("status.layerDeleteLast");
    }
    this.refreshLayers();
  }

  private onSelectLayer(id: string): void {
    if (this.engine === null || id === this.activeLayerId) {
      return;
    }
    this.engine.setActiveLayer(id);
    this.refreshLayers();
    const index = this.layers.findIndex((layer) => layer.id === id);
    const target = index < 0 ? undefined : this.layers[index];
    if (target !== undefined) {
      this.showToast(this.layerToastFor(index, this.layers.length, target.name));
    }
  }

  private onToggleVisible(id: string, visible: boolean): void {
    this.engine?.setLayerVisible(id, visible);
    this.refreshLayers();
    this.dirty = true;
  }

  private onOpacityInput(id: string, opacity: number): void {
    this.engine?.setLayerOpacity(id, opacity);
    this.refreshLayers();
    this.dirty = true;
  }

  private onToggleChannelLock(id: string, channel: "r" | "g" | "b" | "a"): void {
    if (this.engine === null) {
      return;
    }
    const current = this.engine.getLayers().find((layer) => layer.id === id)?.lockedChannels;
    if (current === undefined) {
      return;
    }
    const next = !current[channel];
    if (this.engine.setLayerChannelLocked(id, channel, next)) {
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage = next
      ? tr("status.channelLocked", { channel: channel.toUpperCase() })
      : tr("status.channelUnlocked", { channel: channel.toUpperCase() });
    }
  }

  private onMoveLayer(id: string, direction: "up" | "down"): void {
    if (this.engine?.moveLayer(id, direction) === true) {
      this.statusMessage = direction === "up" ? tr("status.layerMovedUp") : tr("status.layerMovedDown");
      this.dirty = true;
    }
    this.refreshLayers();
  }

  private onAddLayerAbove(id: string): void {
    this.closeLayerMenu();
    if (this.engine === null) {
      return;
    }
    if (this.engine.insertLayerAbove(id) !== null) {
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage = tr("status.layerAdded");
    }
  }

  private onAddLayerBelow(id: string): void {
    this.closeLayerMenu();
    if (this.engine === null) {
      return;
    }
    if (this.engine.insertLayerBelow(id) !== null) {
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage = tr("status.layerAdded");
    }
  }

  private onRenameStart(id: string): void {
    this.renamingId = id;
  }

  private onRenameCancel(): void {
    this.renamingId = null;
  }

  private openLayerMenu(id: string, clientX: number, clientY: number): void {
    this.contextMenuLayerId = id;
    this.contextMenuX = clientX;
    this.contextMenuY = clientY;
  }

  private closeLayerMenu(): void {
    this.contextMenuLayerId = null;
  }

  private onMergeDown(id: string): void {
    this.closeLayerMenu();
    if (this.engine?.mergeDown(id) === true) {
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage = tr("status.layersMerged");
    } else {
      this.statusMessage = tr("status.nothingBelow");
    }
  }

  private onResetLayerTransform(id: string): void {
    this.closeLayerMenu();
    if (this.engine?.resetLayerTransform(id) === true) {
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage = tr("status.transformReset");
    } else {
      this.statusMessage = tr("status.transformResetFailed");
    }
  }

  /** Merge the floating selection into its home cell, if one is active. */
  private commitFloatingSelection(): void {
    if (this.engine?.commitFloating() === true) {
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage = tr("status.floatingMerged");
    }
  }

  private onOpenFitTextureFromLayer(layerId: string): void {
    if (this.engine === null) {
      this.closeLayerMenu();
      return;
    }
    const textureId = this.engine.getCellTextureId(layerId, this.engine.getCurrentFrame());
    this.closeLayerMenu();
    if (textureId === null) {
      this.statusMessage = tr("status.fitNoTextureLayer");
      return;
    }
    void this.openFitTextureDialog(textureId);
  }

  private onOpenFitTextureFromCell(): void {
    const target = this.matrixCellTarget();
    this.closeMatrixMenu();
    if (target === null || this.engine === null) {
      return;
    }
    const textureId = this.engine.getCellTextureId(target.layerId, target.frame);
    if (textureId === null) {
      this.statusMessage = tr("status.fitNoTextureCell");
      return;
    }
    void this.openFitTextureDialog(textureId);
  }

  private async openFitTextureDialog(textureId: string): Promise<void> {
    if (this.engine === null) {
      return;
    }
    this.fitTextureTarget = { kind: "single", textureId };
    this.fitThreshold = this.fitDefaultThreshold;
    await this.updateComplete;
    const dialog = this.shadowRoot?.getElementById("fitTextureDialog") as HTMLDialogElement | null;
    dialog?.showModal();
    const ok = this.shadowRoot?.getElementById("fitTextureOk") as HTMLButtonElement | null;
    ok?.focus();
  }

  private async openFitTextureDialogForAll(): Promise<void> {
    if (this.engine === null) {
      return;
    }
    this.fitTextureTarget = { kind: "all" };
    this.fitThreshold = this.fitDefaultThreshold;
    await this.updateComplete;
    const dialog = this.shadowRoot?.getElementById("fitTextureDialog") as HTMLDialogElement | null;
    dialog?.showModal();
    const ok = this.shadowRoot?.getElementById("fitTextureOk") as HTMLButtonElement | null;
    ok?.focus();
  }

  private closeFitTextureDialog(): void {
    const dialog = this.shadowRoot?.getElementById("fitTextureDialog") as HTMLDialogElement | null;
    dialog?.close();
    this.fitTextureTarget = null;
  }

  private confirmFitTexture(): void {
    const target = this.fitTextureTarget;
    if (target === null || this.engine === null) {
      this.closeFitTextureDialog();
      return;
    }
    const input = this.shadowRoot?.getElementById("fitThreshold") as HTMLInputElement | null;
    const raw = Number(input?.value ?? "0");
    const threshold = Number.isFinite(raw) ? Math.min(254, Math.max(0, Math.floor(raw))) : 0;
    this.fitThreshold = threshold;
    if (target.kind === "all") {
      const result = this.engine.fitAllTexturesToSize(threshold);
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage =
        result.fitted === 0
          ? tr("status.fitAllNothing")
          : result.fitted === 1
            ? tr("status.fittedOne")
            : tr("status.fittedMany", { count: result.fitted });
      this.closeFitTextureDialog();
      return;
    }
    if (this.engine.fitTextureToSize(target.textureId, threshold)) {
      this.refreshLayers();
      this.dirty = true;
      const fitted = this.engine.exportTextures().find((entry) => entry.id === target.textureId);
      this.statusMessage =
        fitted === undefined
          ? tr("status.fitSingle")
          : tr("status.fitSingleDims", { width: fitted.width, height: fitted.height });
    } else {
      this.statusMessage = tr("status.fitNothing");
    }
    this.closeFitTextureDialog();
  }

  private cropAllCellsToCanvas(): void {
    if (this.engine === null) {
      return;
    }
    const result = this.engine.cropAllCellsToCanvas();
    if (result.cropped === 0) {
      this.statusMessage =
        result.outside > 0 && result.unchanged === 0
          ? tr("status.cropAllOutside")
          : tr("status.cropAllFits");
      return;
    }
    this.refreshLayers();
    this.dirty = true;
    const rest =
      result.unchanged > 0 || result.outside > 0
        ? tr("status.cropRest", {
        unchanged: result.unchanged,
        outside: result.outside > 0 ? tr("status.cropRestOutside", { outside: result.outside }) : "",
      })
        : "";
    this.statusMessage = result.cropped === 1
      ? tr("status.croppedOne", { rest })
      : tr("status.cropped", { count: result.cropped, rest });
  }

  /**
   * Reload every texture from its file in the saved project directory.
   * Only an error toast when the project was never saved; textures with
   * no file on disk (or unreadable/decoded-size-mismatched files) are
   * skipped with counts. One undoable history entry when pixels change.
   */
  private async reloadAllTextures(): Promise<void> {
    if (this.engine === null) {
      return;
    }
    if (this.directoryHandle === null) {
      this.statusMessage = tr("status.reloadUnsaved");
      this.showToast(tr("status.reloadUnsaved"));
      return;
    }
    let files: Array<{ id: string; file: string }>;
    try {
      const project = await readProjectMeta(this.directoryHandle);
      files = project.animation.textures.map((texture) => ({ id: texture.id, file: texture.file }));
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.statusMessage = tr("status.reloadFailed", { reason });
      this.showToast(tr("status.reloadFailed", { reason }));
      return;
    }
    const decoded: Array<{ textureId: string; buffer: Uint8ClampedArray }> = [];
    let skipped = 0;
    for (const texture of this.engine.exportTextures()) {
      const entry = files.find((file) => file.id === texture.id);
      if (entry === undefined) {
        skipped += 1;
        continue;
      }
      let bytes: Uint8Array | null = null;
      try {
        bytes = await readFileBytes(this.directoryHandle, entry.file);
      } catch {
        skipped += 1;
        continue;
      }
      if (bytes === null) {
        skipped += 1;
        continue;
      }
      try {
        const image = await this.decodeStoredTextureBytes(this.directoryHandle, entry.file, bytes);
        if (image.width !== texture.width || image.height !== texture.height) {
          skipped += 1;
          continue;
        }
        decoded.push({ textureId: texture.id, buffer: image.buffer });
      } catch {
        skipped += 1;
      }
    }
    const result = this.engine.reloadTexturePixels(decoded);
    skipped += result.skipped;
    if (result.applied > 0) {
      this.refreshLayers();
      this.dirty = true;
    }
    const summary =
      (result.applied === 1 ? tr("status.reloadedOne", { skipped: "" }) : tr("status.reloadedMany", { count: result.applied, skipped: "" })) +
      (skipped > 0 ? tr("status.reloadSkipped", { skipped }) : "");
    this.statusMessage = summary;
    this.showToast(summary);
  }

  private onCropCellToCanvasFromLayer(layerId: string): void {
    if (this.engine === null) {
      this.closeLayerMenu();
      return;
    }
    const frame = this.engine.getCurrentFrame();
    const outcome = this.engine.cropCellTextureToCanvas(layerId, frame);
    this.closeLayerMenu();
    this.reportCropToCanvasOutcome(outcome, layerId, frame);
  }

  private onCropCellToCanvasFromCell(): void {
    const target = this.matrixCellTarget();
    this.closeMatrixMenu();
    if (target === null || this.engine === null) {
      return;
    }
    this.reportCropToCanvasOutcome(
      this.engine.cropCellTextureToCanvas(target.layerId, target.frame),
      target.layerId,
      target.frame,
    );
  }

  private reportCropToCanvasOutcome(
    outcome: "cropped" | "unchanged" | "outside",
    layerId: string,
    frame: number,
  ): void {
    if (outcome === "cropped") {
      this.refreshLayers();
      this.dirty = true;
      const textureId = this.engine?.getCellTextureId(layerId, frame) ?? null;
      const fitted =
        textureId === null
          ? undefined
          : this.engine?.exportTextures().find((entry) => entry.id === textureId);
      this.statusMessage =
        fitted === undefined ? "Texture cropped to canvas" : `Texture cropped to ${fitted.width} x ${fitted.height}`;
    } else if (outcome === "outside") {
      this.statusMessage = tr("status.cropOutside");
    } else {
      this.statusMessage = tr("status.cropInside");
    }
  }

  private onResizeCellToCanvasFromLayer(layerId: string): void {
    if (this.engine === null) {
      this.closeLayerMenu();
      return;
    }
    const frame = this.engine.getCurrentFrame();
    const outcome = this.engine.resizeCellTextureToCanvas(layerId, frame);
    this.closeLayerMenu();
    this.reportResizeToCanvasOutcome(outcome, layerId, frame);
  }

  private onResizeCellToCanvasFromCell(): void {
    const target = this.matrixCellTarget();
    this.closeMatrixMenu();
    if (target === null || this.engine === null) {
      return;
    }
    this.reportResizeToCanvasOutcome(
      this.engine.resizeCellTextureToCanvas(target.layerId, target.frame),
      target.layerId,
      target.frame,
    );
  }

  private reportResizeToCanvasOutcome(
    outcome: "resized" | "unchanged" | "outside",
    layerId: string,
    frame: number,
  ): void {
    if (outcome === "resized") {
      this.refreshLayers();
      this.dirty = true;
      const textureId = this.engine?.getCellTextureId(layerId, frame) ?? null;
      const fitted =
        textureId === null
          ? undefined
          : this.engine?.exportTextures().find((entry) => entry.id === textureId);
      this.statusMessage =
        fitted === undefined ? "Texture resized to canvas" : `Texture resized to ${fitted.width} x ${fitted.height}`;
    } else if (outcome === "outside") {
      this.statusMessage = tr("status.resizeOutside");
    } else {
      this.statusMessage = tr("status.resizeFills");
    }
  }

  private expandCurrentCellTexture(direction: "up" | "down" | "left" | "right"): void {
    if (this.engine === null) {
      return;
    }
    const outcome = this.engine.expandCellTexture(
      this.engine.getActiveLayerId(),
      this.engine.getCurrentFrame(),
      direction,
      this.expandStep,
    );
    if (outcome === "expanded") {
      this.refreshLayers();
      this.dirty = true;
      const textureId = this.engine.getCellTextureId(
        this.engine.getActiveLayerId(),
        this.engine.getCurrentFrame(),
      );
      const fitted =
        textureId === null
          ? undefined
          : this.engine.exportTextures().find((entry) => entry.id === textureId);
      this.statusMessage =
        fitted === undefined
          ? "Texture expanded"
          : `Texture expanded to ${fitted.width} x ${fitted.height}`;
    } else {
      this.statusMessage = tr("status.expandNoTexture");
    }
  }

  private openShortcutsDialog(): void {
    this.helpMenuOpen = false;
    this.requestUpdate();
    const dialog = this.shadowRoot?.getElementById("shortcutsDialog") as HTMLDialogElement | null;
    dialog?.showModal();
  }

  private closeShortcutsDialog(): void {
    const dialog = this.shadowRoot?.getElementById("shortcutsDialog") as HTMLDialogElement | null;
    dialog?.close();
  }

  private openSourceCode(): void {
    this.helpMenuOpen = false;
    window.open(GNUMARUS_SOURCE_URL, "_blank", "noopener");
  }

  private onRenameCommit(id: string): void {
    if (this.renamingId !== id) {
      return;
    }
    this.renamingId = null;
    const input = this.shadowRoot?.querySelector(`[data-layer-id="${id}"] input.layer-rename`);
    const name = input instanceof HTMLInputElement ? input.value : "";
    if (name.trim().length === 0) {
      this.refreshLayers();
      return;
    }
    if (this.engine?.renameLayer(id, name) === true) {
      this.dirty = true;
      this.statusMessage = tr("status.layerRenamed");
    }
    this.refreshLayers();
  }

  private async createNew(): Promise<void> {
    this.stopPlayback();
    const widthInput = this.shadowRoot?.getElementById("newWidth") as HTMLInputElement | null;
    const heightInput = this.shadowRoot?.getElementById("newHeight") as HTMLInputElement | null;
    const width = Math.min(16384, Math.max(1, Number(widthInput?.value ?? "64") || 64));
    const height = Math.min(16384, Math.max(1, Number(heightInput?.value ?? "64") || 64));
    this.newWidth = Math.floor(width);
    this.newHeight = Math.floor(height);
    this.storageFormat = this.newStorageFormat;
    this.storageLossless = this.newStorageLossless;
    this.storageQuality = this.newStorageQuality;
    this.persistStorage();
    this.engine?.newProject(this.newWidth, this.newHeight);
    this.refreshLayers();
    this.selectSingleFrame(0);
    this.directoryHandle = null;
    this.projectName = "Untitled";
    this.dirty = true;
    this.statusMessage = tr("status.newCanvas", { width: this.newWidth, height: this.newHeight });
    this.closeNewDialog();
  }

  /**
   * Decode one stored texture file: JXL and WebP through their WASM codecs,
   * PNG directly, JPEG by recombining the color file with its grayscale
   * `.alpha.jpg` companion (a missing companion means opaque).
   */
  private async decodeStoredTextureBytes(
    dir: GnumarusDirectoryHandle,
    file: string,
    bytes: Uint8Array,
  ): Promise<{ width: number; height: number; buffer: Uint8ClampedArray }> {
    if (file.endsWith(".jxl")) {
      return decodeJxlBytes(bytes);
    }
    if (file.endsWith(".webp")) {
      return decodeWebpBytes(bytes);
    }
    if (file.endsWith(".jpg")) {
      const color = await decodeJpegToBuffer(new Blob([bytes as Uint8Array<ArrayBuffer>]));
      const alphaBytes = await readFileBytes(dir, `${file.slice(0, -".jpg".length)}.alpha.jpg`);
      if (alphaBytes === null) {
        const opaque = new Uint8ClampedArray(color.buffer);
        for (let index = 3; index < opaque.length; index += 4) {
          opaque[index] = 255;
        }
        return { width: color.width, height: color.height, buffer: opaque };
      }
      const alpha = await decodeJpegToBuffer(new Blob([alphaBytes as Uint8Array<ArrayBuffer>]));
      if (alpha.width !== color.width || alpha.height !== color.height) {
        throw new Error(`Alpha size mismatch: ${file}`);
      }
      return {
        width: color.width,
        height: color.height,
        buffer: applyAlphaPlane(color.buffer, alpha.buffer, color.width, color.height),
      };
    }
    return decodePngToBuffer(new Blob([bytes as Uint8Array<ArrayBuffer>]));
  }

  private async openProject(): Promise<void> {
    this.fileMenuOpen = false;
    if (!isFileSystemAccessSupported()) {
      this.statusMessage = tr("status.openNeedsFs");
      return;
    }
    this.stopPlayback();
    try {
      this.statusMessage = tr("status.opening");
      const dir = await pickProjectDirectory();
      const { project, fileBlobs } = await readProjectFiles(dir);
      const textures: GnumarusTexturePixels[] = [];
      for (const texture of project.animation.textures) {
        const blob = fileBlobs.get(texture.file);
        if (blob === undefined) {
          throw new Error(`Missing texture file: ${texture.file}`);
        }
        const decoded = await this.decodeStoredTextureBytes(
          dir,
          texture.file,
          new Uint8Array(await blob.arrayBuffer()),
        );
        if (decoded.width !== texture.width || decoded.height !== texture.height) {
          throw new Error(`Texture size mismatch: ${texture.file}`);
        }
        textures.push({
          id: texture.id,
          name: texture.name,
          width: decoded.width,
          height: decoded.height,
          buffer: decoded.buffer,
        });
      }
      this.engine?.loadAnimationProject(project.width, project.height, {
        layers: project.layers.map((layer) => ({
          id: layer.id,
          name: layer.name,
          visible: layer.visible,
          opacity: layer.opacity,
          lockedChannels: { ...layer.lockedChannels },
        })),
        textures,
        contents: project.animation.contents.map((content) => ({
          id: content.id,
          name: content.name,
          textureId: content.textureId,
          transform: { ...content.transform },
        })),
        cells: project.animation.cells.map((cell) => ({ ...cell })),
        frames: project.animation.frames,
        currentFrame: project.animation.currentFrame,
        defaultFrameDuration: project.animation.defaultFrameDuration,
        frameDurations: project.animation.frameDurations.map((entry) => ({ ...entry })),
        frameNames: [...project.animation.frameNames],
        namedAnimations: project.animation.namedAnimations.map((entry) => ({
          name: entry.name,
          loop: entry.loop,
          frames: entry.frames.map((item) => ({ ...item })),
        })),
        activeAnimation: project.animation.activeAnimation,
      });
      this.refreshLayers();
      this.directoryHandle = dir;
      this.projectName = dir.name;
      this.dirty = false;
      this.selectSingleFrame(this.engine?.getCurrentFrame() ?? 0);
      const openedCleanup = this.applyImportCleanup();
      if (openedCleanup !== "") {
        this.dirty = true;
      }
      this.statusMessage = tr("status.opened", { dir: dir.name, cleanup: openedCleanup });
    } catch (error) {
      this.statusMessage = error instanceof Error ? tr("status.openFailed", { reason: error.message }) : tr("status.openFailedPlain");
    }
  }

  private async importImageFile(): Promise<void> {
    this.fileMenuOpen = false;
    if (!isFilePickerSupported()) {
      this.statusMessage = tr("status.importNeedsFs");
      return;
    }
    this.stopPlayback();
    let handle;
    try {
      handle = await pickImportFile();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      const reason = error instanceof Error ? error.message : String(error);
      console.error(tr("status.importFailed", { reason }));
      this.statusMessage = tr("status.importFailed", { reason });
      this.showToast(tr("status.importFailed", { reason }));
      return;
    }
    if (handle === null) {
      return;
    }
    try {
      this.statusMessage = tr("status.importing");
      const picked = await handle.getFile();
      const bytes = new Uint8Array(await picked.arrayBuffer());
      const fileName = picked.name;
      const dot = fileName.lastIndexOf(".");
      if (isPhotoshopFile(bytes)) {
        await this.loadPsdDocument(fileName, dot, bytes);
        return;
      }
      if (isGimpFile(bytes)) {
        await this.loadXcfDocument(fileName, dot, bytes);
        return;
      }
      const { isKritaFile } = await import("../project/GnumarusKra");
      if (isKritaFile(bytes)) {
        await this.loadKraDocument(fileName, dot, bytes);
        return;
      }
      const imported = await parseAsepriteFile(bytes);
      this.engine?.loadAnimationProject(imported.width, imported.height, {
        layers: imported.layers.map((layer) => ({
          id: layer.id,
          name: layer.name,
          visible: layer.visible,
          opacity: layer.opacity,
          lockedChannels: { ...layer.lockedChannels },
        })),
        textures: imported.textures.map((texture) => ({
          id: texture.id,
          name: texture.name,
          width: texture.width,
          height: texture.height,
          buffer: texture.buffer,
        })),
        contents: imported.contents.map((content) => ({
          id: content.id,
          name: content.name,
          textureId: content.textureId,
          transform: { ...content.transform },
        })),
        cells: imported.cells.map((cell) => ({ ...cell })),
        frames: imported.frames,
        currentFrame: 0,
        defaultFrameDuration: imported.defaultFrameDuration,
        frameDurations: imported.frameDurations.map((entry) => ({ ...entry })),
        frameNames: [],
        namedAnimations: imported.namedAnimations.map((entry) => ({
          name: entry.name,
          loop: entry.loop,
          frames: entry.frames.map((item) => ({ ...item })),
        })),
        activeAnimation: null,
      });
      this.refreshLayers();
      this.selectSingleFrame(this.engine?.getCurrentFrame() ?? 0);
      this.directoryHandle = null;
      this.projectName = dot > 0 ? fileName.slice(0, dot) : fileName;
      this.dirty = true;
      const animationSuffix =
        imported.namedAnimations.length === 1
          ? tr("import.animSuffixOne")
          : imported.namedAnimations.length > 1
            ? tr("import.animSuffixMany", { count: imported.namedAnimations.length })
            : "";
      const summary =
        tr("import.summaryAse", {
          file: fileName,
          layers: imported.layers.length,
          frames: imported.frames,
          animations: animationSuffix,
        }) + this.applyImportCleanup();
      this.statusMessage = summary;
      this.showToast(summary);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.error(tr("status.importFailed", { reason }));
      this.statusMessage = tr("status.importFailed", { reason });
      this.showToast(tr("status.importFailed", { reason }));
    }
  }

  private async loadPsdDocument(fileName: string, dot: number, bytes: Uint8Array): Promise<void> {
    const psd = await parsePsdFile(bytes);
    this.engine?.loadAnimationProject(psd.width, psd.height, {
      layers: psd.layers.map((layer) => ({
        id: layer.id,
        name: layer.name,
        visible: layer.visible,
        opacity: layer.opacity,
        lockedChannels: { r: false, g: false, b: false, a: false },
      })),
      textures: psd.textures.map((texture) => ({
        id: texture.id,
        name: texture.name,
        width: texture.width,
        height: texture.height,
        buffer: texture.buffer,
      })),
      contents: psd.contents.map((content) => ({
        id: content.id,
        name: content.name,
        textureId: content.textureId,
        transform: { ...content.transform },
      })),
      cells: psd.cells.map((cell) => ({ ...cell })),
      frames: 1,
      currentFrame: 0,
      defaultFrameDuration: DEFAULT_ANIMATION_FRAME_DURATION,
      frameDurations: [],
      frameNames: [],
      namedAnimations: [],
      activeAnimation: null,
    });
    this.refreshLayers();
    this.selectSingleFrame(this.engine?.getCurrentFrame() ?? 0);
    this.directoryHandle = null;
    this.projectName = dot > 0 ? fileName.slice(0, dot) : fileName;
    this.dirty = true;
    const summary =
      (psd.layers.length === 1
        ? tr("import.layersOne", { file: fileName })
        : tr("import.layersMany", { file: fileName, count: psd.layers.length })) + this.applyImportCleanup();
    this.statusMessage = summary;
    this.showToast(summary);
  }

  private async loadXcfDocument(fileName: string, dot: number, bytes: Uint8Array): Promise<void> {
    const xcf = await parseXcfFile(bytes);
    this.engine?.loadAnimationProject(xcf.width, xcf.height, {
      layers: xcf.layers.map((layer) => ({
        id: layer.id,
        name: layer.name,
        visible: layer.visible,
        opacity: layer.opacity,
        lockedChannels: { ...layer.lockedChannels },
      })),
      textures: xcf.textures.map((texture) => ({
        id: texture.id,
        name: texture.name,
        width: texture.width,
        height: texture.height,
        buffer: texture.buffer,
      })),
      contents: xcf.contents.map((content) => ({
        id: content.id,
        name: content.name,
        textureId: content.textureId,
        transform: { ...content.transform },
      })),
      cells: xcf.cells.map((cell) => ({ ...cell })),
      frames: 1,
      currentFrame: 0,
      defaultFrameDuration: DEFAULT_ANIMATION_FRAME_DURATION,
      frameDurations: [],
      frameNames: [],
      namedAnimations: [],
      activeAnimation: null,
    });
    this.refreshLayers();
    this.selectSingleFrame(this.engine?.getCurrentFrame() ?? 0);
    this.directoryHandle = null;
    this.projectName = dot > 0 ? fileName.slice(0, dot) : fileName;
    this.dirty = true;
    const summary =
      (xcf.layers.length === 1
        ? tr("import.layersOne", { file: fileName })
        : tr("import.layersMany", { file: fileName, count: xcf.layers.length })) + this.applyImportCleanup();
    this.statusMessage = summary;
    this.showToast(summary);
  }

  private async loadKraDocument(fileName: string, dot: number, bytes: Uint8Array): Promise<void> {
    const { parseKraFile } = await import("../project/GnumarusKra");
    const kra = await parseKraFile(bytes);
    this.engine?.loadAnimationProject(kra.width, kra.height, {
      layers: kra.layers.map((layer) => ({
        id: layer.id,
        name: layer.name,
        visible: layer.visible,
        opacity: layer.opacity,
        lockedChannels: { ...layer.lockedChannels },
      })),
      textures: kra.textures.map((texture) => ({
        id: texture.id,
        name: texture.name,
        width: texture.width,
        height: texture.height,
        buffer: texture.buffer,
      })),
      contents: kra.contents.map((content) => ({
        id: content.id,
        name: content.name,
        textureId: content.textureId,
        transform: { ...content.transform },
      })),
      cells: kra.cells.map((cell) => ({ ...cell })),
      frames: kra.frames,
      currentFrame: 0,
      defaultFrameDuration: kra.defaultFrameDuration,
      frameDurations: kra.frameDurations.map((entry) => ({ ...entry })),
      frameNames: [],
      namedAnimations: [],
      activeAnimation: null,
    });
    this.refreshLayers();
    this.selectSingleFrame(this.engine?.getCurrentFrame() ?? 0);
    this.directoryHandle = null;
    this.projectName = dot > 0 ? fileName.slice(0, dot) : fileName;
    this.dirty = true;
    const summary =
      tr("import.kraSummary", {
        file: fileName,
        layers:
          kra.layers.length === 1
            ? tr("import.layerOne")
            : tr("import.layersCount", { count: kra.layers.length }),
        frames:
          kra.frames === 1 ? tr("import.frameOne") : tr("import.framesCount", { count: kra.frames }),
      }) + this.applyImportCleanup();
    this.statusMessage = summary;
    this.showToast(summary);
  }

  private async saveProject(): Promise<void> {
    this.fileMenuOpen = false;
    if (this.engine === null) {
      return;
    }
    if (!isFileSystemAccessSupported()) {
      this.statusMessage = tr("status.saveNeedsFs");
      return;
    }
    try {
      this.statusMessage = tr("status.saving");
      const dir = this.directoryHandle ?? (await pickProjectDirectory());
      let oldPaths = new Set<string>();
      try {
        oldPaths = await readOldProjectFileReferences(dir);
      } catch {
        oldPaths = new Set<string>();
      }
      const size = this.engine.size;
      const exported = this.engine.exportAnimationProject();
      const texturesMeta: GnumarusTextureMeta[] = [];
      const blobs = new Map<string, Blob>();
      const stems: string[] = [];
      const lossless = this.storageLossless;
      const quality = this.storageQuality;
      for (let index = 0; index < exported.textures.length; index += 1) {
        const texture = exported.textures[index] as (typeof exported.textures)[number];
        const stem = `t${index + 1}`;
        stems.push(stem);
        if (this.storageFormat === "jpg") {
          const colorBlob = await encodeStillImage(
            texture.buffer,
            texture.width,
            texture.height,
            "image/jpeg",
            this.storageJpegQuality / 100,
          );
          if (colorBlob === null) {
            throw new Error("Failed to encode JPEG.");
          }
          const colorFile = textureFilePath(stem, "jpg");
          texturesMeta.push({
            id: texture.id,
            name: texture.name,
            width: texture.width,
            height: texture.height,
            file: colorFile,
          });
          blobs.set(colorFile, colorBlob);
          const alphaBlob = await encodeStillImage(
            extractAlphaPlane(texture.buffer, texture.width, texture.height),
            texture.width,
            texture.height,
            "image/jpeg",
            this.storageJpegQuality / 100,
          );
          if (alphaBlob === null) {
            throw new Error("Failed to encode JPEG.");
          }
          blobs.set(textureFilePath(`${stem}.alpha`, "jpg"), alphaBlob);
          continue;
        }
        if (this.storageFormat === "png") {
          const file = textureFilePath(stem, "png");
          texturesMeta.push({
            id: texture.id,
            name: texture.name,
            width: texture.width,
            height: texture.height,
            file,
          });
          blobs.set(
            file,
            await encodeBufferToPngBlob(texture.buffer, texture.width, texture.height, this.storagePngLevel),
          );
          continue;
        }
        if (this.storageFormat === "webp") {
          try {
            const bytes = await encodeWebpStill(texture.buffer, texture.width, texture.height, {
              lossless,
              quality,
              effort: WEBP_STORAGE_EFFORT,
            });
            const file = textureFilePath(stem, "webp");
            texturesMeta.push({
              id: texture.id,
              name: texture.name,
              width: texture.width,
              height: texture.height,
              file,
            });
            blobs.set(file, new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "image/webp" }));
          } catch {
            const file = textureFilePath(stem, "png");
            texturesMeta.push({
              id: texture.id,
              name: texture.name,
              width: texture.width,
              height: texture.height,
              file,
            });
            blobs.set(
              file,
              await encodeBufferToPngBlob(texture.buffer, texture.width, texture.height, this.storagePngLevel),
            );
          }
          continue;
        }
        try {
          const bytes = await encodeJxlStill(texture.buffer, texture.width, texture.height, {
            lossless,
            quality,
            effort: 1,
          });
          const file = textureFilePath(stem, "jxl");
          texturesMeta.push({
            id: texture.id,
            name: texture.name,
            width: texture.width,
            height: texture.height,
            file,
          });
          blobs.set(file, new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "image/jxl" }));
        } catch {
          const file = textureFilePath(stem, "png");
          texturesMeta.push({
            id: texture.id,
            name: texture.name,
            width: texture.width,
            height: texture.height,
            file,
          });
          blobs.set(
            file,
            await encodeBufferToPngBlob(texture.buffer, texture.width, texture.height, this.storagePngLevel),
          );
        }
      }
      const contentsMeta: GnumarusContentMeta[] = exported.contents.map((content) => ({
        id: content.id,
        name: content.name,
        textureId: content.textureId,
        transform: { ...content.transform },
      }));
      const meta: GnumarusProjectMeta = {
        app: GNUMARUS_APP_ID,
        version: 2,
        width: size.width,
        height: size.height,
        layers: exported.layers.map((layer) => ({
          id: layer.id,
          name: layer.name,
          visible: layer.visible,
          opacity: layer.opacity,
          lockedChannels: { ...layer.lockedChannels },
        })),
        animation: {
          frames: exported.frames,
          currentFrame: exported.currentFrame,
          defaultFrameDuration: exported.defaultFrameDuration,
          frameDurations: exported.frameDurations.map((entry) => ({ ...entry })),
          frameNames: [...exported.frameNames],
          namedAnimations: exported.namedAnimations.map((entry) => ({
            name: entry.name,
            loop: entry.loop,
            frames: entry.frames.map((item) => ({ ...item })),
          })),
          activeAnimation: exported.activeAnimation,
          textures: texturesMeta,
          contents: contentsMeta,
          cells: exported.cells.map((cell) => ({ ...cell })),
        },
      };
      const jsonText = serializeProject(meta);
      if (this.storageProjectFile === "json") {
        blobs.set(GNUMARUS_PROJECT_FILE, new Blob([jsonText], { type: "application/json" }));
      } else {
        blobs.set(
          GNUMARUS_PROJECT_ARCHIVE_FILE,
          new Blob([encodeProjectArchive(jsonText) as Uint8Array<ArrayBuffer>], { type: "application/zip" }),
        );
      }
      await writeProjectFiles(dir, blobs);
      const newPaths = new Set(blobs.keys());
      for (const stale of findStaleProjectPaths(oldPaths, newPaths)) {
        await removeProjectFile(dir, stale);
      }
      for (const stem of stems) {
        for (const candidate of staleTextureCandidates(stem)) {
          if (!newPaths.has(candidate)) {
            await removeProjectFile(dir, candidate);
          }
        }
      }
      await removeProjectFile(
        dir,
        this.storageProjectFile === "json" ? GNUMARUS_PROJECT_ARCHIVE_FILE : GNUMARUS_PROJECT_FILE,
      );
      this.directoryHandle = dir;
      this.projectName = dir.name;
      this.dirty = false;
      this.statusMessage = tr("status.saved", { dir: dir.name });
    } catch (error) {
      this.statusMessage = error instanceof Error ? tr("status.saveFailed", { reason: error.message }) : tr("status.saveFailedPlain");
    }
  }
}

customElements.define("gnumarus-shell", GnumarusShell);
