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
  readProjectFiles,
  writeBlobToDirectory,
  writeBlobToFile,
  writeProjectFiles,
  type GnumarusDirectoryHandle,
} from "../project/GnumarusFileSystem";
import {
  GNUMARUS_APP_ID,
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
  DEFAULT_EXPAND_SETTINGS,
  EXPAND_SETTINGS_STORAGE_KEY,
  clampExpandStep,
  parseExpandSettings,
  serializeExpandSettings,
} from "../settings/GnumarusExpandSettings";
import { compositeFinalImage, type GnumarusPreviewBackground } from "../preview/GnumarusFinalRender";
import {
  detectStillFormats,
  encodeStillImage,
  exportBaseName,
  findStillFormat,
  frameFileStem,
  GNUMARUS_DEFAULT_STILL_QUALITY,
  normalizeStillQualityPercent,
  type GnumarusStillFormat,
} from "../export/GnumarusImageExport";
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
  clampBrushSizeFloat,
  parseBlendMode,
  parseBrushShape,
  type GnumarusBlendMode,
  type GnumarusBrushShape,
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
import { parseHexToRgbaBytes, rgbaBytesToHex } from "../color/GnumarusColorModels";
import { type GnumarusTexturePixels } from "../animation/GnumarusAnimationModel";
import {
  countAnimationFrames,
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

const GNUMARUS_SHORTCUTS: GnumarusShortcutSection[] = [
  {
    title: "File",
    entries: [
      { keys: "Ctrl+S (Cmd+S on macOS)", action: "Save (reuses the chosen folder, otherwise shows the folder picker)" },
      { keys: "Ctrl+E (Cmd+E on macOS)", action: "Merge active layer down (same as Merge Down)" },
    ],
  },
  {
    title: "History",
    entries: [
      { keys: "Ctrl+Z", action: "Undo" },
      { keys: "Ctrl+Y or Shift+Ctrl+Z", action: "Redo" },
    ],
  },
  {
    title: "Layers",
    entries: [
      { keys: "PageUp", action: "Select layer above (wraps around)" },
      { keys: "PageDown", action: "Select layer below (wraps around)" },
      { keys: "ArrowUp", action: "Select layer above (wraps around)" },
      { keys: "ArrowDown", action: "Select layer below (wraps around)" },
      { keys: "Shift+ArrowUp", action: "Move active layer up (wraps around)" },
      { keys: "Shift+ArrowDown", action: "Move active layer down (wraps around)" },
      { keys: "Insert", action: "Insert layer above the active layer" },
      { keys: "Delete", action: "Reset current cell texture to transparent" },
      { keys: "Ctrl+Shift+ArrowUp", action: "Expand current cell texture up by the configured step" },
      { keys: "Ctrl+Shift+ArrowDown", action: "Expand current cell texture down by the configured step" },
      { keys: "Ctrl+Shift+ArrowLeft", action: "Expand current cell texture left by the configured step" },
      { keys: "Ctrl+Shift+ArrowRight", action: "Expand current cell texture right by the configured step" },
    ],
  },
  {
    title: "Frames",
    entries: [
      { keys: "ArrowLeft", action: "Select previous frame (wraps around)" },
      { keys: "ArrowRight", action: "Select next frame (wraps around)" },
      { keys: "Shift+ArrowLeft", action: "Move current frame left (wraps around)" },
      { keys: "Shift+ArrowRight", action: "Move current frame right (wraps around)" },
    ],
  },
  {
    title: "Tools",
    entries: [
      { keys: "B", action: "Pencil tool" },
      { keys: "G or F", action: "Bucket fill tool" },
      { keys: "N", action: "Line tool" },
      { keys: "C", action: "Curve tool" },
      { keys: "Z", action: "Loupe tool" },
      { keys: "T", action: "Non-destructive cell transform tool" },
      { keys: "Y", action: "3D rotation tool" },
      { keys: "R", action: "Rectangular selection tool" },
      { keys: "V", action: "Destructive selection transform tool" },
      { keys: "U", action: "Destructive 3D rotation tool" },
      { keys: "E", action: "Toggle eraser blend mode" },
      { keys: "Hold Ctrl", action: "Temporary eyedropper (release to restore the previous tool)" },
      { keys: "Enter, Return or Esc", action: "Merge floating selection into the cell" },
      { keys: "Escape", action: "Cancel line/curve in progress; close menus and rename fields" },
    ],
  },
  {
    title: "View",
    entries: [
      { keys: "1 (main keyboard)", action: "Zoom to 100%" },
      { keys: "2 (main keyboard)", action: "Fit rotated canvas on screen" },
      { keys: "0 (main keyboard)", action: "Reset canvas transform (zoom, pan and rotation)" },
      { keys: "4 (main and numpad)", action: "Rotate canvas counterclockwise by step" },
      { keys: "6 (main and numpad)", action: "Rotate canvas clockwise by step" },
      { keys: "5 (main and numpad)", action: "Reset canvas rotation" },
      { keys: "Ctrl+Alt+=", action: "Zoom in (numpad + also works)" },
      { keys: "Ctrl+Alt+-", action: "Zoom out (numpad - also works)" },
      { keys: "Hold Space and drag", action: "Pan canvas" },
      { keys: "Shift+Left-drag (pencil, line, curve)", action: "Resize tool live from horizontal movement" },
    ],
  },
  {
    title: "Actions",
    entries: [
      {
        keys: "Ctrl+Shift+P (Cmd+Shift+P on macOS)",
        action: "Quick action search (type to filter, arrows to move, Enter to run)",
      },
    ],
  },
  {
    title: "Interface",
    entries: [{ keys: "Tab", action: "Hide/show all interface chrome except the canvas" }],
  },
];

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
      flex: 0 0 auto;
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
    animationError: { type: String },
    exportFrame: { type: Number },
    exportFormat: { type: String },
    exportFormats: { type: Array },
    exportQuality: { type: Number },
    exportAnimation: { type: String },
    exportAnimatedFormat: { type: String },
    exportAnimatedQuality: { type: Number },
    exportSheetLayout: { type: String },
    exportSheetFormat: { type: String },
    exportSheetCount: { type: Number },
    exportSheetQuality: { type: Number },
    playing: { type: Boolean },
    uiHidden: { type: Boolean },
    toastMessage: { type: String },
    toastDurationSec: { type: Number },
    fitDefaultThreshold: { type: Number },
    expandStep: { type: Number },
    renamingFrame: { type: Number },
    brushSize: { type: Number },
    brushShape: { type: String },
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
  declare resizeWidth: number;
  declare resizeHeight: number;
  declare resizingLayerId: string | null;
  declare checkerMode: GnumarusCheckerMode;
  declare checkerSizeX: number;
  declare checkerSizeY: number;
  declare gridMinZoom: number;
  declare gridOpacity: number;
  declare rotationStepDeg: number;
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
  declare animationError: string | null;
  declare exportFrame: number;
  declare exportFormat: string;
  declare exportFormats: GnumarusStillFormat[];
  declare exportQuality: number;
  declare exportAnimation: string;
  declare exportAnimatedFormat: string;
  declare exportAnimatedQuality: number;
  declare exportSheetLayout: string;
  declare exportSheetFormat: string;
  declare exportSheetCount: number;
  declare exportSheetQuality: number;
  declare playing: boolean;
  declare uiHidden: boolean;
  declare toastMessage: string;
  declare toastDurationSec: number;
  declare fitDefaultThreshold: number;
  declare expandStep: number;
  declare renamingFrame: number | null;
  declare brushSize: number;
  declare brushShape: GnumarusBrushShape;
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

  private readonly actionRegistry = new GnumarusActionRegistry();

  constructor() {
    super();
    this.tool = "pencil";
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
    this.statusMessage = "Ready";
    this.fileMenuOpen = false;
    this.editMenuOpen = false;
    this.helpMenuOpen = false;
    this.webglError = "";
    this.fsSupported = true;
    this.newWidth = 64;
    this.newHeight = 64;
    this.resizeWidth = 64;
    this.resizeHeight = 64;
    this.resizingLayerId = null;
    this.checkerMode = DEFAULT_CHECKER_SETTINGS.mode;
    this.checkerSizeX = DEFAULT_CHECKER_SETTINGS.sizeX;
    this.checkerSizeY = DEFAULT_CHECKER_SETTINGS.sizeY;
    this.gridMinZoom = DEFAULT_GRID_SETTINGS.minZoom;
    this.gridOpacity = DEFAULT_GRID_SETTINGS.opacityPercent;
    this.rotationStepDeg = DEFAULT_ROTATION_SETTINGS.stepDeg;
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
    this.frameText = "Frame 1/1";
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
    this.exportFrame = 1;
    this.exportFormat = "image/png";
    this.exportFormats = [];
    this.exportQuality = GNUMARUS_DEFAULT_STILL_QUALITY;
    this.exportAnimation = "";
    this.exportAnimatedFormat = "gif";
    this.exportAnimatedQuality = GNUMARUS_DEFAULT_STILL_QUALITY;
    this.exportSheetLayout = "line";
    this.exportSheetFormat = "image/png";
    this.exportSheetCount = 2;
    this.exportSheetQuality = GNUMARUS_DEFAULT_STILL_QUALITY;
    this.playing = false;
    this.playTimer = null;
    this.uiHidden = false;
    this.toastMessage = "";
    this.toastDurationSec = DEFAULT_TOAST_SETTINGS.durationSec;
    this.fitDefaultThreshold = DEFAULT_FIT_SETTINGS.alphaThreshold;
    this.expandStep = DEFAULT_EXPAND_SETTINGS.step;
    this.renamingFrame = null;
    this.brushSize = 1;
    this.brushShape = "square";
    this.pencilAntialias = false;
    this.pencilPixelPerfect = false;
    this.curvePixelPerfect = false;
    this.stabilizerMode = GNUMARUS_DEFAULT_STABILIZER_MODE;
    this.ropeLength = GNUMARUS_DEFAULT_ROPE_LENGTH;
    this.followStrength = GNUMARUS_DEFAULT_FOLLOW_STRENGTH;
    this.blendMode = "normal";
    this.accumulate = true;
    this.lineWidth = 1;
    this.lineShape = "square";
    this.lineAntialias = false;
    this.curveWidth = 1;
    this.curveShape = "square";
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
            File
          </button>
          ${this.fileMenuOpen
            ? html`
                <div class="dropdown">
                  <button @click=${(): void => void this.openNewDialog()}>New</button>
                  <button @click=${(): void => void this.openProject()}>Open</button>
                  <button title="Save (Ctrl+S)" @click=${(): void => void this.saveProject()}>Save</button>
                  <button @click=${(): void => void this.importImageFile()}>Import</button>
                  <button @click=${(): void => void this.openExportDialog()}>Export</button>
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
            Edit
          </button>
          ${this.editMenuOpen
            ? html`
                <div class="dropdown">
                  <button ?disabled=${!this.canUndo} @click=${(): void => this.doUndo()}>Undo</button>
                  <button ?disabled=${!this.canRedo} @click=${(): void => this.doRedo()}>Redo</button>
                  <button @click=${(): void => this.openSettingsDialog()}>Settings</button>
                  <button
                    @click=${(): void => {
                      this.runAction("reset-canvas-transform");
                    }}
                  >
                    Reset Canvas Transform
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
            Help
          </button>
          ${this.helpMenuOpen
            ? html`
                <div class="dropdown">
                  <button @click=${(): void => this.openShortcutsDialog()}>Shortcuts</button>
                </div>
              `
            : html``}
        </div>
        <span class="app-title">Gnumaru's Painting and Animation App${this.dirty ? " — *modified*" : ""}</span>
      </div>
      ${this.renderToolOptions()}
      <div class="body">
        <div class="toolbar" ?hidden=${this.uiHidden}>
          <button
            class=${this.tool === "pencil" ? "active" : ""}
            title="B: Pencil (pixel-art solid brush, size and shape in the options bar)"
            aria-label="Pencil"
            @click=${(): void => {
              this.tool = "pencil";
              this.engine?.setTool("pencil");
            }}
          >
            <span class="tool-icon">✎</span>
          </button>
          <button
            class=${this.tool === "loupe" ? "active" : ""}
            title="Z: Loupe (left-drag zoom, right-drag rotate, middle-click flip)"
            aria-label="Loupe"
            @click=${(): void => {
              this.tool = "loupe";
              this.engine?.setTool("loupe");
            }}
          >
            <span class="tool-icon">⌕</span>
          </button>
          <button
            class=${this.tool === "bucket" ? "active" : ""}
            title="G or F: Bucket fill (click fills contiguous same-color region)"
            aria-label="Bucket fill"
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
            title="Ctrl (hold): Eyedropper (click a pixel to copy its color)"
            aria-label="Eyedropper"
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
            title="N: Line (click start point, click end point)"
            aria-label="Line"
            @click=${(): void => {
              this.tool = "line";
              this.engine?.setTool("line");
            }}
          >
            <span class="tool-icon">╲</span>
          </button>
          <button
            class=${this.tool === "curve" ? "active" : ""}
            title="C: Curve (drag endpoints, then two control clicks)"
            aria-label="Curve"
            @click=${(): void => {
              this.tool = "curve";
              this.engine?.setTool("curve");
            }}
          >
            <span class="tool-icon">〜</span>
          </button>
          <button
            class=${this.tool === "rectselect" ? "active" : ""}
            title="R: Rectangular selection (drag to mark, release cuts to floating)"
            aria-label="Rectangular selection"
            @click=${(): void => {
              this.tool = "rectselect";
              this.engine?.setTool("rectselect");
            }}
          >
            <span class="tool-icon">▭</span>
          </button>
          <button
            class=${this.tool === "destransform" ? "active" : ""}
            title="V: Destructive selection transform (drag anchors to move, resize, rotate or skew; Enter merges)"
            aria-label="Destructive selection transform"
            @click=${(): void => {
              this.tool = "destransform";
              this.engine?.setTool("destransform");
            }}
          >
            <span class="tool-icon">✛</span>
          </button>
          <button
            class=${this.tool === "transform" ? "active" : ""}
            title="T: Non-destructive cell transform (drag anchors to move, resize, rotate, skew or flip; center resets)"
            aria-label="Non-destructive cell transform"
            @click=${(): void => {
              this.tool = "transform";
              this.engine?.setTool("transform");
            }}
          >
            <span class="tool-icon">⤢</span>
          </button>
          <button
            class=${this.tool === "transform3d" ? "active" : ""}
            title="Y: 3D rotation (drag to tilt the layer, rings rotate one axis, center resets rotations)"
            aria-label="3D rotation"
            @click=${(): void => {
              this.tool = "transform3d";
              this.engine?.setTool("transform3d");
            }}
          >
            <span class="tool-icon">⟳</span>
          </button>
          <button
            class=${this.tool === "destransform3d" ? "active" : ""}
            title="U: Destructive 3D rotation (drag to tilt the selection, rings rotate one axis, Enter merges)"
            aria-label="Destructive 3D rotation"
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
            title="Final preview (flattened image)"
            aria-label="Final preview"
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
                    <span>Final preview</span>
                    <span class="spacer"></span>
                    <button aria-label="Close preview" title="Close preview" @click=${(): void => this.togglePreview()}>
                      ×
                    </button>
                  </div>
                  <div class="preview-toolbar">
                    <button aria-label="Zoom out preview" title="Zoom out preview" @click=${(): void => this.zoomPreview(0.5)}>
                      −
                    </button>
                    <span>${Math.round(this.previewZoom * 100)}%</span>
                    <button aria-label="Zoom in preview" title="Zoom in preview" @click=${(): void => this.zoomPreview(2)}>
                      +
                    </button>
                    <button aria-label="Reset preview zoom" title="Reset preview zoom" @click=${(): void => this.resetPreviewZoom()}>
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
        <aside class="layers-panel" aria-label="Layers" ?hidden=${this.uiHidden}>
          <div class="layers-header">
            <span>Layers</span>
            <button aria-label="Add layer" title="Add layer" @click=${(): void => this.onAddLayer()}>+</button>
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
                      aria-label="Toggle layer visibility"
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
                      aria-label="Move layer up"
                      title="Move up"
                      ?disabled=${displayIndex === 0}
                      @click=${(event: Event): void => {
                        event.stopPropagation();
                        this.onMoveLayer(layer.id, "up");
                      }}
                    >
                      ▲
                    </button>
                    <button
                      aria-label="Move layer down"
                      title="Move down"
                      ?disabled=${displayIndex === displayLayers.length - 1}
                      @click=${(event: Event): void => {
                        event.stopPropagation();
                        this.onMoveLayer(layer.id, "down");
                      }}
                    >
                      ▼
                    </button>
                    <button
                      aria-label="Delete layer"
                      title="Delete layer"
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
                    <span>Opacity</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      aria-label="Layer opacity"
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
                    <span>Lock</span>
                    <button
                      class=${layer.lockedChannels.r ? "active" : ""}
                      title=${layer.lockedChannels.r ? "Unlock red channel" : "Lock red channel"}
                      aria-label="Lock red channel"
                      aria-pressed=${layer.lockedChannels.r ? "true" : "false"}
                      @click=${(): void => {
                        this.onToggleChannelLock(layer.id, "r");
                      }}
                    >
                      R
                    </button>
                    <button
                      class=${layer.lockedChannels.g ? "active" : ""}
                      title=${layer.lockedChannels.g ? "Unlock green channel" : "Lock green channel"}
                      aria-label="Lock green channel"
                      aria-pressed=${layer.lockedChannels.g ? "true" : "false"}
                      @click=${(): void => {
                        this.onToggleChannelLock(layer.id, "g");
                      }}
                    >
                      G
                    </button>
                    <button
                      class=${layer.lockedChannels.b ? "active" : ""}
                      title=${layer.lockedChannels.b ? "Unlock blue channel" : "Lock blue channel"}
                      aria-label="Lock blue channel"
                      aria-pressed=${layer.lockedChannels.b ? "true" : "false"}
                      @click=${(): void => {
                        this.onToggleChannelLock(layer.id, "b");
                      }}
                    >
                      B
                    </button>
                    <button
                      class=${layer.lockedChannels.a ? "active" : ""}
                      title=${layer.lockedChannels.a ? "Unlock alpha channel" : "Lock alpha channel"}
                      aria-label="Lock alpha channel"
                      aria-pressed=${layer.lockedChannels.a ? "true" : "false"}
                      @click=${(): void => {
                        this.onToggleChannelLock(layer.id, "a");
                      }}
                    >
                      A
                    </button>
                  </div>
                  <div class="layer-resize">
                    <span>Size</span>
                    <button
                      aria-label="Resize layer"
                      title="Resize layer (expand right and down, crop right and below)"
                      @click=${(event: Event): void => {
                        event.stopPropagation();
                        this.openResizeDialog(layer.id);
                      }}
                    >
                      ${layer.width}×${layer.height} Resize
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
                  Merge Down
                </button>
                <button
                  @click=${(): void => {
                    if (this.contextMenuLayerId !== null) {
                      this.onAddLayerAbove(this.contextMenuLayerId);
                    }
                  }}
                >
                  Add above
                </button>
                <button
                  @click=${(): void => {
                    if (this.contextMenuLayerId !== null) {
                      this.onAddLayerBelow(this.contextMenuLayerId);
                    }
                  }}
                >
                  Add below
                </button>
                <button
                  @click=${(): void => {
                    if (this.contextMenuLayerId !== null) {
                      this.onResetLayerTransform(this.contextMenuLayerId);
                    }
                  }}
                >
                  Reset transform
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
                  Fit texture to size
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
                  Crop to canvas
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
                  Resize to canvas
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
        <h3>New canvas</h3>
        <label>Width <input type="number" id="newWidth" min="1" max="1024" .value=${String(this.newWidth)} /></label>
        <label>Height <input type="number" id="newHeight" min="1" max="1024" .value=${String(this.newHeight)} /></label>
        <div class="dialog-actions">
          <button @click=${(): void => this.closeNewDialog()}>Cancel</button>
          <button @click=${(): void => void this.createNew()}>Create</button>
        </div>
      </dialog>
      <dialog id="resizeDialog">
        <h3>Resize layer</h3>
        <p>Expanding adds transparent pixels right and below. Shrinking crops right and below.</p>
        <label>Width <input type="number" id="resizeWidth" min="1" max="1024" .value=${String(this.resizeWidth)} /></label>
        <label>Height <input type="number" id="resizeHeight" min="1" max="1024" .value=${String(this.resizeHeight)} /></label>
        <div class="dialog-actions">
          <button @click=${(): void => this.closeResizeDialog()}>Cancel</button>
          <button @click=${(): void => this.confirmResize()}>Resize</button>
        </div>
      </dialog>
      <dialog id="fitTextureDialog">
        <h3>Fit texture to size</h3>
        <p>Crops transparent borders on all four sides. Pixels with alpha up to the threshold count as empty.</p>
        <label
          >Alpha threshold
          <input type="number" id="fitThreshold" min="0" max="254" step="1" .value=${String(this.fitThreshold)} />
        </label>
        <div class="dialog-actions">
          <button @click=${(): void => this.closeFitTextureDialog()}>Cancel</button>
          <button id="fitTextureOk" @click=${(): void => this.confirmFitTexture()}>OK</button>
        </div>
      </dialog>
      <dialog id="shortcutsDialog">
        <h3>Keyboard shortcuts</h3>
        <div class="shortcuts-list">
          ${GNUMARUS_SHORTCUTS.map(
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
          <button @click=${(): void => this.closeShortcutsDialog()}>Close</button>
        </div>
      </dialog>
      <dialog id="actionPaletteDialog" @close=${(): void => this.closeActionPalette()}>
        <h3>Run action</h3>
        <input
          type="text"
          id="actionPaletteInput"
          data-testid="action-palette-input"
          placeholder="Type an action name…"
          autocomplete="off"
          spellcheck="false"
          aria-label="Search actions"
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
            return html`<p data-testid="action-palette-empty">No actions found</p>`;
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
        <h3>Settings</h3>
        <div class="settings-section">Background</div>
        <div class="setting-row">
          <label
            >Background mode
            <select id="backgroundMode" .value=${this.backgroundMode} @change=${(): void => this.applyBackgroundFromDialog()}>
              <option value="checkerboard">Checkerboard</option>
              <option value="solid">Solid color</option>
            </select>
          </label>
          ${this.backgroundMode !== DEFAULT_BACKGROUND_SETTINGS.mode
            ? html`<button
                class="reset-btn"
                aria-label="Reset background mode to default"
                title="Reset to default"
                @click=${(): void => this.resetBackgroundModeToDefault()}
              >
                ↻
              </button>`
            : html``}
        </div>
        ${this.backgroundMode === "solid"
          ? html`
              <div class="setting-row">
                <span>Solid color</span>
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
                      aria-label="Reset background color to default"
                      title="Reset to default"
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
              <div class="settings-section">Checkerboard</div>
              <div class="setting-row">
                <label
                  >Checkerboard mode
                  <select
                    id="checkerMode"
                    .value=${this.checkerMode}
                    @change=${(): void => this.applyCheckerFromDialog()}
                  >
                    <option value="image">Image-space (moves and zooms with the canvas)</option>
                    <option value="screen">Screen-space (fixed on screen)</option>
                  </select>
                </label>
                ${this.checkerMode !== DEFAULT_CHECKER_SETTINGS.mode
                  ? html`<button
                      class="reset-btn"
                      aria-label="Reset checkerboard mode to default"
                      title="Reset to default"
                      @click=${(): void => this.resetCheckerModeToDefault()}
                    >
                      ↻
                    </button>`
                  : html``}
              </div>
              <div class="setting-row">
                <label
                  >Checker width
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
                      aria-label="Reset checker width to default"
                      title="Reset to default"
                      @click=${(): void => this.resetCheckerSizeXToDefault()}
                    >
                      ↻
                    </button>`
                  : html``}
              </div>
              <div class="setting-row">
                <label
                  >Checker height
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
                      aria-label="Reset checker height to default"
                      title="Reset to default"
                      @click=${(): void => this.resetCheckerSizeYToDefault()}
                    >
                      ↻
                    </button>`
                  : html``}
              </div>
              <div class="setting-row">
                <span>Checker color A</span>
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
                      aria-label="Reset checker color A to default"
                      title="Reset to default"
                      @click=${(): void => this.resetCheckerColorAToDefault()}
                    >
                      ↻
                    </button>`
                  : html``}
              </div>
              <div class="setting-row">
                <span>Checker color B</span>
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
                      aria-label="Reset checker color B to default"
                      title="Reset to default"
                      @click=${(): void => this.resetCheckerColorBToDefault()}
                    >
                      ↻
                    </button>`
                  : html``}
              </div>
            `
          : html``}
        <div class="settings-section">Pixel grid</div>
        <div class="setting-row">
          <label
            >Pixel grid minimum zoom (percent)
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
                aria-label="Reset pixel grid minimum zoom to default"
                title="Reset to default"
                @click=${(): void => this.resetGridMinZoomToDefault()}
              >
                ↻
              </button>`
            : html``}
        </div>
        <div class="setting-row">
          <label
            >Pixel grid opacity (percent)
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
                aria-label="Reset pixel grid opacity to default"
                title="Reset to default"
                @click=${(): void => this.resetGridOpacityToDefault()}
              >
                ↻
              </button>`
            : html``}
        </div>
        <div class="settings-section">Canvas view</div>
        <div class="setting-row">
          <label
            >Canvas rotation step (degrees)
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
                aria-label="Reset canvas rotation step to default"
                title="Reset to default"
                @click=${(): void => this.resetRotationStepToDefault()}
              >
                ↻
              </button>`
            : html``}
        </div>
        <div class="settings-section">Animation</div>
        <div class="setting-row">
          <label
            >Default frame duration (s)
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
                aria-label="Reset default frame duration to default"
                title="Reset to default"
                @click=${(): void => this.resetDefaultFrameDuration()}
              >
                ↻
              </button>`
            : html``}
        </div>
        <div class="settings-section">Interface</div>
        <div class="setting-row">
          <label
            >Toast display time (seconds)
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
                aria-label="Reset toast display time to default"
                title="Reset to default"
                @click=${(): void => this.resetToastDurationToDefault()}
              >
                ↻
              </button>`
            : html``}
        </div>
        <div class="setting-row">
          <label
            >Fit texture default alpha threshold
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
                aria-label="Reset fit alpha threshold to default"
                title="Reset to default"
                @click=${(): void => this.resetFitToDefault()}
              >
                ↻
              </button>`
            : html``}
        </div>
        <div class="setting-row">
          <label
            >Cell texture expand step (pixels)
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
                aria-label="Reset expand step to default"
                title="Reset to default"
                @click=${(): void => this.resetExpandToDefault()}
              >
                ↻
              </button>`
            : html``}
        </div>
        <div class="dialog-actions">
          <button @click=${(): void => this.resetCheckerDefaults()}>Reset defaults</button>
          <button @click=${(): void => this.closeSettingsDialog()}>Close</button>
        </div>
      </dialog>
      <dialog id="frameDurationDialog">
        <h3>Frame duration</h3>
        <p>How long this frame shows during playback. Empty means the project default.</p>
        <label
          >Duration (s)
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
          <button @click=${(): void => this.closeFrameDurationDialog()}>Cancel</button>
          <button @click=${(): void => this.clearFrameDuration()}>Clear</button>
          <button @click=${(): void => this.confirmFrameDuration()}>Set</button>
        </div>
      </dialog>
      <dialog id="animationDialog">
        <h3>Named animations</h3>
        <p>
          Define one animation as <code>name,loop,frames</code>, e.g.
          <code>walk,forward,1:400,2-4,7</code>. Loop is none, forward or ping-pong; frames
          count from 1; <code>A-B</code> spans a range and <code>:ms</code> overrides the
          duration of one frame (or every frame of a range).
        </p>
        <label
          >Animation definition
          <input
            type="text"
            id="animationInput"
            maxlength="256"
            placeholder="walk,forward,1,2,3"
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
          <button @click=${(): void => this.closeAnimationDialog()}>Close</button>
          <button @click=${(): void => this.confirmAddAnimation()}>Add</button>
        </div>
        <ul class="animation-list" data-testid="animation-list">
          ${(this.engine?.getNamedAnimations() ?? []).map(
            (animation) => html`
              <li>
                <span>${animation.name} (${animation.loop}, ${animation.frames.length} frame${animation.frames.length === 1 ? "" : "s"})</span>
                <button
                  aria-label=${`Delete animation ${animation.name}`}
                  title=${`Delete animation ${animation.name}`}
                  @click=${(): void => this.onDeleteAnimation(animation.name)}
                >
                  Delete
                </button>
              </li>
            `,
          )}
        </ul>
      </dialog>
      <dialog id="exportDialog">
        <h3>Export frame</h3>
        <label
          >Frame
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
          >Format
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
        ${this.exportFormat === "image/png"
          ? html``
          : html`<label
              >Quality
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
          <button @click=${(): void => this.closeExportDialog()}>Cancel</button>
          <button id="exportOk" @click=${(): void => void this.confirmExportFrame()}>Export</button>
        </div>
        <h3>Export animation</h3>
        <label
          >Animation
          <select
            id="exportAnimation"
            .value=${this.exportAnimation}
            @change=${(event: Event): void => {
              this.exportAnimation = (event.target as HTMLSelectElement).value;
            }}
          >
            <option value="">All frames</option>
            ${this.engine?.getNamedAnimations().map(
              (animation) => html`<option value=${animation.name}>${animation.name}</option>`,
            ) ?? html``}
          </select>
        </label>
        <label
          >Format
          <select
            id="exportAnimatedFormat"
            .value=${this.exportAnimatedFormat}
            @change=${(event: Event): void => {
              this.exportAnimatedFormat = (event.target as HTMLSelectElement).value;
            }}
          >
            <option value="gif">GIF animation</option>
            ${this.exportFormats.map(
              (format) => html`<option value=${format.mime}>${format.label} sequence</option>`,
            )}
          </select>
        </label>
        ${this.exportAnimatedFormat === "gif" || this.exportAnimatedFormat === "image/png"
          ? html``
          : html`<label
              >Quality
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
            Export animation
          </button>
        </div>
        <h3>Export spritesheet</h3>
        <div class="export-sheet-animations">
          <label><input type="checkbox" id="exportSheetAll" />All frames</label>
          ${this.engine?.getNamedAnimations().map(
            (animation) =>
              html`<label
                ><input type="checkbox" data-export-sheet-anim="${animation.name}" />${animation.name}</label
              >`,
          ) ?? html``}
        </div>
        <label
          >Extra frames (1,3-5)
          <input type="text" id="exportSheetFrames" placeholder="1,3-5" />
        </label>
        <label
          >Layout
          <select
            id="exportSheetLayout"
            .value=${this.exportSheetLayout}
            @change=${(event: Event): void => {
              this.exportSheetLayout = (event.target as HTMLSelectElement).value;
            }}
          >
            ${GNUMARUS_SHEET_LAYOUTS.map(
              (entry) => html`<option value=${entry.value}>${entry.label}</option>`,
            )}
            <option value="individual">Individual frames</option>
          </select>
        </label>
        <label
          >Lines/columns count
          <input
            type="number"
            id="exportSheetCount"
            min="1"
            step="1"
            .value=${String(this.exportSheetCount)}
          />
        </label>
        <label
          >Format
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
        ${this.exportSheetFormat === "image/png"
          ? html``
          : html`<label
              >Quality
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
            Export spritesheet
          </button>
        </div>
      </dialog>
      <dialog id="frameRenameDialog">
        <h3>Rename frame</h3>
        <label
          >Frame name
          <input type="text" id="frameRename" maxlength="64" .value=${this.frameRenameValue()} />
        </label>
        <div class="dialog-actions">
          <button @click=${(): void => this.closeFrameRenameDialog()}>Cancel</button>
          <button @click=${(): void => this.confirmFrameRename()}>Rename</button>
        </div>
      </dialog>
      <dialog id="layerRenameDialog">
        <h3>Rename layer</h3>
        <label
          >Layer name
          <input type="text" id="layerRename" maxlength="64" .value=${this.layerRenameValue()} />
        </label>
        <div class="dialog-actions">
          <button @click=${(): void => this.closeLayerRenameDialog()}>Cancel</button>
          <button @click=${(): void => this.confirmLayerRename()}>Rename</button>
        </div>
      </dialog>
      ${this.contentPickerTarget !== null ? this.renderContentPickerDialog() : html``}
      ${this.texturePickerContentId !== null ? this.renderTexturePickerDialog() : html``}
    `;
  }

  /** User-facing name of a tool. The internal id stays unchanged. */
  private toolDisplayName(tool: GnumarusCanvasTool): string {
    if (tool === "transform") {
      return "non-destructive cell transform";
    }
    if (tool === "transform3d") {
      return "3d rotation";
    }
    if (tool === "destransform") {
      return "destructive selection transform";
    }
    if (tool === "destransform3d") {
      return "destructive 3d rotation";
    }
    if (tool === "rectselect") {
      return "rectangular selection";
    }
    return tool;
  }

  private renderBlendModeOption() {
    return html`
      <label
        >Blend mode
        <select id="blendMode" .value=${this.blendMode} @change=${(): void => this.applyBlendModeFromDialog()}>
          <option value="normal">Normal</option>
          <option value="copy">Copy</option>
          <option value="eraser">Eraser</option>
        </select>
      </label>
    `;
  }

  private renderAccumulateOption() {
    return html`
      <label
        ><input
          type="checkbox"
          id="accumulate"
          .checked=${this.accumulate}
          @change=${(): void => this.applyAccumulateFromDialog()}
        />
        Accumulate
      </label>
    `;
  }

  private renderStabilizerOption() {
    return html`
      <label
        >Stabilizer
        <select
          id="stabilizerMode"
          .value=${this.stabilizerMode}
          @change=${(): void => this.applyStabilizerModeFromDialog()}
        >
          <option value="none">None</option>
          <option value="rope">Rope</option>
          <option value="follow">Follow</option>
        </select>
      </label>
      ${this.stabilizerMode === "rope"
        ? html`
            <label
              >Rope length
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
            <label
              >Follow strength
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

  private renderToolOptions() {
    if (this.tool === "pencil") {
      return html`
        <div class="tool-options" data-testid="tool-options" aria-label="Pencil options" ?hidden=${this.uiHidden}>
          <label
            >Brush size
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
          <label
            >Brush shape
            <select id="brushShape" .value=${this.brushShape} @change=${(): void => this.applyBrushShapeFromDialog()}>
              <option value="square">Square</option>
              <option value="circle">Circle</option>
            </select>
          </label>
          <label
            ><input
              type="checkbox"
              id="pencilAntialias"
              .checked=${this.pencilAntialias}
              @change=${(): void => this.applyPencilAntialiasFromDialog()}
            />
            Anti-aliasing
          </label>
          <label title="Keeps 1px strokes exactly 1px thick. Only applies at brush size 1 without anti-aliasing."
            ><input
              type="checkbox"
              id="pencilPixelPerfect"
              .checked=${this.pencilPixelPerfect}
              ?disabled=${this.brushSize !== 1 || this.pencilAntialias}
              @change=${(): void => this.applyPencilPixelPerfectFromDialog()}
            />
            Pixel perfect
          </label>
          ${this.renderStabilizerOption()} ${this.renderBlendModeOption()} ${this.renderAccumulateOption()}
        </div>
      `;
    }
    if (this.tool === "line") {
      return html`
        <div class="tool-options" data-testid="tool-options" aria-label="Line options" ?hidden=${this.uiHidden}>
          <label
            >Line width
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
            >Line shape
            <select id="lineShape" .value=${this.lineShape} @change=${(): void => this.applyLineShapeFromDialog()}>
              <option value="square">Square</option>
              <option value="circle">Circle</option>
            </select>
          </label>
          <label
            ><input
              type="checkbox"
              id="lineAntialias"
              .checked=${this.lineAntialias}
              @change=${(): void => this.applyLineAntialiasFromDialog()}
            />
            Anti-aliasing
          </label>
          ${this.renderBlendModeOption()} ${this.renderAccumulateOption()}
        </div>
      `;
    }
    if (this.tool === "curve") {
      return html`
        <div class="tool-options" data-testid="tool-options" aria-label="Curve options" ?hidden=${this.uiHidden}>
          <label
            >Curve width
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
            >Curve shape
            <select id="curveShape" .value=${this.curveShape} @change=${(): void => this.applyCurveShapeFromDialog()}>
              <option value="square">Square</option>
              <option value="circle">Circle</option>
            </select>
          </label>
          <label
            ><input
              type="checkbox"
              id="curveAntialias"
              .checked=${this.curveAntialias}
              @change=${(): void => this.applyCurveAntialiasFromDialog()}
            />
            Anti-aliasing
          </label>
          <label title="Keeps 1px curves exactly 1px thick. Only applies at curve width 1 without anti-aliasing."
            ><input
              type="checkbox"
              id="curvePixelPerfect"
              .checked=${this.curvePixelPerfect}
              ?disabled=${this.curveWidth !== 1 || this.curveAntialias}
              @change=${(): void => this.applyCurvePixelPerfectFromDialog()}
            />
            Pixel perfect
          </label>
          ${this.renderBlendModeOption()} ${this.renderAccumulateOption()}
        </div>
      `;
    }
    if (this.tool === "bucket") {
      return html`
        <div class="tool-options" data-testid="tool-options" aria-label="Bucket options" ?hidden=${this.uiHidden}>
          ${this.renderBlendModeOption()}
        </div>
      `;
    }
    if (this.tool === "destransform" || this.tool === "destransform3d") {
      return html`
        <div class="tool-options" data-testid="tool-options" aria-label="Destructive selection transform options" ?hidden=${this.uiHidden}>
          <button
            ?disabled=${!this.floatingActive}
            title="Merge the floating selection into the cell (Enter)"
            @click=${(): void => this.commitFloatingSelection()}
          >
            Commit selection
          </button>
        </div>
      `;
    }
    return html`
      <div class="tool-options" data-testid="tool-options" aria-label="${this.toolDisplayName(this.tool)} options" ?hidden=${this.uiHidden}>
        <span class="tool-options-empty"
          >the ${this.toolDisplayName(this.tool)} tool does not have any setting or helper button</span
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
      <div class="anim-matrix" data-testid="animation-matrix" aria-label="Animation matrix" ?hidden=${this.uiHidden}>
        <div class="anim-scroll">
          <div class="anim-grid" style="grid-template-columns: ${columns};">
            <div class="anim-corner">
              <button aria-label="Add frame" title="Add frame" @click=${(): void => this.onAddFrame()}>+</button>
              <button
                aria-label=${this.playing ? "Stop animation" : "Play animation"}
                title=${this.playing ? "Stop animation" : "Play animation"}
                @click=${(): void => this.togglePlayback()}
                >${this.playing ? "■" : "▶"}</button
              >
              <select
                data-testid="animation-select"
                aria-label="Active animation"
                title="Play only the frames of the selected animation"
                @change=${(event: Event): void => this.onSelectAnimation(event)}
              >
                <option value="">All frames</option>
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
              <button
                aria-label="Manage animations"
                title="Define named frame animations"
                @click=${(): void => this.openAnimationDialog()}
              >
                ⚙</button
              >
            </div>
            ${Array.from({ length: matrix.frameCount }, (_unused, frame) => {
              const current = frame === matrix.currentFrame;
              const inAnimation = activeFrames !== null && activeFrames.has(frame);
              const duration = this.engine?.getEffectiveFrameDuration(frame) ?? 0;
              const frameName = matrix.frameNames[frame] ?? `F${frame + 1}`;
              const isRenaming = this.renamingFrame === frame;
              const animationCount = animationFrameCounts.get(frame) ?? 0;
              const animationPhrase =
                animationCount === 0
                  ? "in no animations"
                  : `in ${animationCount} animation${animationCount === 1 ? "" : "s"}`;
              return html`
                <div class="anim-frame-header ${current ? "current" : ""} ${inAnimation ? "in-animation" : ""}">
                  ${isRenaming
                    ? html`<input
                        data-testid="anim-frame-rename"
                        data-frame=${frame}
                        .value=${frameName}
                        maxlength="64"
                        aria-label="Rename frame ${frame + 1}"
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
                        aria-label="Frame ${frame + 1}${current ? ", current" : ""}: ${frameName}, ${duration} seconds, ${animationPhrase}"
                        title="Frame ${frame + 1}${current ? " (current)" : ""}: ${frameName} — ${duration} s, ${animationPhrase}"
                        @click=${(): void => this.onSelectFrame(frame)}
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
                  aria-label="Animation layer ${row.layerName}"
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
                  const label = cell.contentName ?? "empty";
                  return html`
                    <div
                      class="anim-cell ${cell.contentId !== null ? "filled" : ""} ${isCurrent ? "current-frame" : ""} ${isActive ? "active-cell" : ""} ${inAnimation ? "in-animation" : ""}"
                      data-testid="anim-cell"
                      data-matrix-layer=${cell.layerId}
                      data-matrix-frame=${cell.frame}
                      role="button"
                      tabindex="0"
                      aria-label="Animation cell, layer ${row.layerName}, frame ${cell.frame + 1}, ${label}"
                      title="Layer ${row.layerName}, frame ${cell.frame + 1}: ${label}"
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
          <button @click=${(): void => this.onAddFrameBefore(frame)}>Add frame before</button>
          <button @click=${(): void => this.onAddFrameAfter(frame)}>Add frame after</button>
          <button @click=${(): void => this.onOpenFrameDuration()}>Set frame duration…</button>
          <button @click=${(): void => this.onRenameFrameFromMenu()}>Rename frame…</button>
          <button ?disabled=${count <= 1} @click=${(): void => this.onRemoveFrame(frame)}>Remove frame</button>
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
          <button @click=${(): void => this.onRenameLayerFromMenu()}>Rename layer…</button>
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
        <button @click=${(): void => void this.onOpenContentPicker()}>Select content</button>
        <button ?disabled=${cellTextureId === null} @click=${(): void => this.onOpenFitTextureFromCell()}>
          Fit texture to size
        </button>
        <button ?disabled=${cellTextureId === null} @click=${(): void => this.onCropCellToCanvasFromCell()}>
          Crop to canvas
        </button>
        <button ?disabled=${cellTextureId === null} @click=${(): void => this.onResizeCellToCanvasFromCell()}>
          Resize to canvas
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
    const storedBackground = this.loadBackgroundSettings();
    this.backgroundMode = storedBackground.mode;
    this.backgroundColor = storedBackground.color;
    const storedToast = this.loadToastSettings();
    this.toastDurationSec = storedToast.durationSec;
    const storedFit = this.loadFitSettings();
    this.fitDefaultThreshold = storedFit.alphaThreshold;
    const storedExpand = this.loadExpandSettings();
    this.expandStep = storedExpand.step;
    const host = this.shadowRoot?.getElementById("canvasHost") ?? null;
    if (host === null) {
      this.webglError = "Canvas host is missing.";
      return;
    }
    try {
      this.engine = new GnumarusCanvasEngine(host, {
        onToolChanged: (tool): void => {
          this.tool = tool;
        },
        onLayersChanged: (): void => {
          this.refreshLayers();
        },
        checker: storedChecker,
        gridMinZoom: storedGrid.minZoom,
        gridOpacityPercent: storedGrid.opacityPercent,
        background: storedBackground,
        onStats: (stats): void => {
          this.zoomText = `${Math.round(stats.zoom * 100)}%`;
          this.canUndo = stats.canUndo;
          this.canRedo = stats.canRedo;
          this.rotText = `${Math.round(stats.rotationDeg)}°`;
          this.flipText =
            stats.flipX && stats.flipY ? "Flip XY" : stats.flipX ? "Flip X" : stats.flipY ? "Flip Y" : "";
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
          this.statusMessage = `Eyedropper: ${hex}`;
        },
        onTransformChanged: (): void => {
          void this.refreshPreview();
        },
        onToolSizeChanged: (kind, size): void => {
          if (kind === "brush") {
            this.brushSize = size;
            this.statusMessage = `Brush size: ${size}`;
          } else if (kind === "line") {
            this.lineWidth = size;
            this.statusMessage = `Line width: ${size}`;
          } else {
            this.curveWidth = size;
            this.statusMessage = `Curve width: ${size}`;
          }
        },
      });
      this.engine.setColor(this.colorValue);
      this.engine.setRotationStepDeg(this.rotationStepDeg);
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
        this.statusMessage = "File System Access API unavailable (use Chromium)";
      }
      (window as unknown as { __gnumarus?: unknown }).__gnumarus = {
        shell: this,
        engine: this.engine,
      };
    } catch (error) {
      if (error instanceof GnumarusWebGlError) {
        this.webglError = error.message;
      } else {
        this.webglError = "Failed to start WebGL2 canvas.";
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
      void this.saveProject();
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
    return `Frame ${frame + 1}/${count}: ${name}`;
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
    this.statusMessage = "Layer added";
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
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage = `Frame moved ${direction === 1 ? "right" : "left"}`;
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
      this.statusMessage = `Layer moved ${direction}`;
    }
  }

  private mergeActiveLayerDown(): void {
    if (this.engine === null) {
      return;
    }
    if (this.engine.mergeDown(this.engine.getActiveLayerId())) {
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage = "Layers merged";
    } else {
      this.statusMessage = "Nothing below to merge with";
    }
  }

  private openNewDialog(): void {
    this.fileMenuOpen = false;
    const dialog = this.shadowRoot?.getElementById("newDialog") as HTMLDialogElement | null;
    dialog?.showModal();
  }

  private closeNewDialog(): void {
    const dialog = this.shadowRoot?.getElementById("newDialog") as HTMLDialogElement | null;
    dialog?.close();
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
      this.statusMessage = `Layer resized to ${width} x ${height}`;
    } else {
      this.statusMessage = "Layer size unchanged";
    }
    this.closeResizeDialog();
  }

  private resetCanvasTransform(): void {
    this.editMenuOpen = false;
    this.fileMenuOpen = false;
    this.engine?.resetViewTransform();
    this.statusMessage = "Canvas transform reset";
  }

  private registerActions(): void {
    this.actionRegistry.register({
      id: "reset-canvas-transform",
      name: "Reset Canvas Transform",
      requirements: [],
      run: (): void => {
        this.resetCanvasTransform();
      },
    });
    this.actionRegistry.register({
      id: "fit-all-textures-to-size",
      name: "Fit All Textures to Size",
      requirements: [],
      run: (): void => {
        void this.openFitTextureDialogForAll();
      },
    });
    this.actionRegistry.register({
      id: "crop-all-cells-to-canvas",
      name: "Crop All Cells to Canvas",
      requirements: [],
      run: (): void => {
        this.cropAllCellsToCanvas();
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
      this.showToast(`Unknown action "${id}".`);
      return false;
    }
    const result = this.actionRegistry.execute(id, this.actionContext());
    if (!result.ok) {
      this.showToast(actionBlockedMessage(action.name, result.reasons));
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
    this.statusMessage = this.engine?.undo() === true ? "Undo" : "Nothing to undo";
  }

  private doRedo(): void {
    this.editMenuOpen = false;
    this.fileMenuOpen = false;
    this.statusMessage = this.engine?.redo() === true ? "Redo" : "Nothing to redo";
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
    this.statusMessage = `Pixel grid minimum zoom: ${Math.round(minZoom * 100)}%`;
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
    this.statusMessage = `Pixel grid opacity: ${opacity}%`;
  }

  /** Test hook: set the pixel grid opacity in percent (0..100, clamped). */
  setGridOpacityPercent(value: number): void {
    this.gridOpacity = clampGridOpacityPercent(value);
    this.engine?.setGridOpacityPercent(this.gridOpacity);
    this.persistGrid();
    this.statusMessage = `Pixel grid opacity: ${this.gridOpacity}%`;
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
    this.statusMessage = `Canvas rotation step: ${stepDeg}°`;
  }

  private resetRotationStepToDefault(): void {
    this.rotationStepDeg = DEFAULT_ROTATION_SETTINGS.stepDeg;
    this.engine?.setRotationStepDeg(this.rotationStepDeg);
    this.persistRotation();
    this.statusMessage = "Canvas rotation step reset to default";
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
    this.statusMessage = `Toast display time: ${this.toastDurationSec} s`;
  }

  private resetToastDurationToDefault(): void {
    this.toastDurationSec = DEFAULT_TOAST_SETTINGS.durationSec;
    this.persistToast();
    this.statusMessage = "Toast display time reset to default";
  }

  /** Test hook: set the toast display time in seconds (0.5..2.0, clamped). */
  setToastDurationSec(value: number): void {
    this.toastDurationSec = clampToastDurationSec(value);
    this.persistToast();
    this.statusMessage = `Toast display time: ${this.toastDurationSec} s`;
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
    this.statusMessage = `Fit texture default alpha threshold: ${this.fitDefaultThreshold}`;
  }

  private resetFitToDefault(): void {
    this.fitDefaultThreshold = DEFAULT_FIT_SETTINGS.alphaThreshold;
    this.persistFit();
    this.statusMessage = "Fit texture default alpha threshold reset to default";
  }

  /** Test hook: set the fit texture default alpha threshold (0..254, clamped). */
  setFitDefaultThreshold(value: number): void {
    this.fitDefaultThreshold = clampFitAlphaThreshold(value);
    this.persistFit();
    this.statusMessage = `Fit texture default alpha threshold: ${this.fitDefaultThreshold}`;
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
    this.statusMessage = `Cell texture expand step: ${this.expandStep} pixels`;
  }

  private resetExpandToDefault(): void {
    this.expandStep = DEFAULT_EXPAND_SETTINGS.step;
    this.persistExpand();
    this.statusMessage = "Cell texture expand step reset to default";
  }

  /** Test hook: set the cell texture expand step in pixels (1..1024, clamped). */
  setExpandStep(value: number): void {
    this.expandStep = clampExpandStep(value);
    this.persistExpand();
    this.statusMessage = `Cell texture expand step: ${this.expandStep} pixels`;
  }

  /** Test hook: rename a frame (trimmed 1..64 chars). */
  renameFrame(frame: number, name: string): boolean {
    if (this.engine?.renameFrame(frame, name) === true) {
      this.dirty = true;
      this.statusMessage = "Frame renamed";
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
    this.statusMessage = "Background mode reset to default";
  }

  private resetBackgroundColorToDefault(): void {
    this.backgroundColor = DEFAULT_BACKGROUND_SETTINGS.color;
    this.engine?.setBackgroundColor(this.backgroundColor);
    this.persistBackground();
    void this.refreshPreview();
    this.statusMessage = "Background color reset to default";
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
    this.statusMessage = "Checkerboard mode reset to default";
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
    this.statusMessage = "Checker width reset to default";
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
    this.statusMessage = "Checker height reset to default";
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
    this.statusMessage = "Checker color A reset to default";
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
    this.statusMessage = "Checker color B reset to default";
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
    this.statusMessage = `Brush size: ${clamped}`;
  }

  /** Test hook: set the brush shape (square/circle, defaults to square). */
  setBrushShape(shape: GnumarusBrushShape): void {
    const parsed = parseBrushShape(shape);
    this.brushShape = parsed;
    this.engine?.setBrushShape(parsed);
    this.statusMessage = `Brush shape: ${parsed}`;
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
    this.statusMessage = `Brush size: ${size}`;
  }

  private applyBrushShapeFromDialog(): void {
    const shape = this.currentDialogBrushShape();
    this.brushShape = shape;
    this.engine?.setBrushShape(shape);
    this.statusMessage = `Brush shape: ${shape}`;
  }

  /** Test hook: enable or disable pencil anti-aliasing. */
  setPencilAntialias(enabled: boolean): void {
    const next = enabled === true;
    this.pencilAntialias = next;
    this.engine?.setPencilAntialias(next);
    this.statusMessage = `Pencil anti-aliasing: ${next ? "on" : "off"}`;
  }

  private currentDialogPencilAntialias(): boolean {
    const input = this.shadowRoot?.getElementById("pencilAntialias") as HTMLInputElement | null;
    return input?.checked === true;
  }

  private applyPencilAntialiasFromDialog(): void {
    const enabled = this.currentDialogPencilAntialias();
    this.pencilAntialias = enabled;
    this.engine?.setPencilAntialias(enabled);
    this.statusMessage = `Pencil anti-aliasing: ${enabled ? "on" : "off"}`;
  }

  /** Test hook: enable or disable pencil pixel perfect (1px + no AA only). */
  setPencilPixelPerfect(enabled: boolean): void {
    const next = enabled === true;
    this.pencilPixelPerfect = next;
    this.engine?.setPencilPixelPerfect(next);
    this.statusMessage = `Pencil pixel perfect: ${next ? "on" : "off"}`;
  }

  /** Test hook: enable or disable curve pixel perfect (1px + no AA only). */
  setCurvePixelPerfect(enabled: boolean): void {
    const next = enabled === true;
    this.curvePixelPerfect = next;
    this.engine?.setCurvePixelPerfect(next);
    this.statusMessage = `Curve pixel perfect: ${next ? "on" : "off"}`;
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
    this.statusMessage = `Pencil pixel perfect: ${enabled ? "on" : "off"}`;
  }

  private applyCurvePixelPerfectFromDialog(): void {
    const enabled = this.currentDialogCurvePixelPerfect();
    this.curvePixelPerfect = enabled;
    this.engine?.setCurvePixelPerfect(enabled);
    this.statusMessage = `Curve pixel perfect: ${enabled ? "on" : "off"}`;
  }

  /** Test hook: set the brush stabilizer mode (none/rope/follow, defaults to none). */
  setStabilizerMode(mode: GnumarusStabilizerMode): void {
    const parsed = parseStabilizerMode(mode);
    this.stabilizerMode = parsed;
    this.engine?.setStabilizerMode(parsed);
    this.statusMessage = `Stabilizer: ${parsed}`;
  }

  /** Test hook: set the rope leash length in layer pixels (1..200, clamped). */
  setRopeLength(length: number): void {
    const clamped = clampRopeLength(length);
    this.ropeLength = clamped;
    this.engine?.setRopeLength(clamped);
    this.statusMessage = `Rope length: ${clamped}`;
  }

  /** Test hook: set the follow chase strength (typed 1..100, used as typed / 100, clamped). */
  setFollowStrength(strength: number): void {
    const clamped = clampFollowStrength(strength);
    this.followStrength = clamped;
    this.engine?.setFollowStrength(clamped);
    this.statusMessage = `Follow strength: ${clamped}`;
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
    this.statusMessage = `Stabilizer: ${mode}`;
  }

  private applyRopeLengthFromDialog(): void {
    const length = this.currentDialogRopeLength();
    this.ropeLength = length;
    this.engine?.setRopeLength(length);
    this.statusMessage = `Rope length: ${length}`;
  }

  private applyFollowStrengthFromDialog(): void {
    const strength = this.currentDialogFollowStrength();
    this.followStrength = strength;
    this.engine?.setFollowStrength(strength);
    this.statusMessage = `Follow strength: ${strength}`;
  }

  /** Test hook: set the shared paint blend mode (normal/copy/eraser, defaults to normal). */
  setBlendMode(mode: GnumarusBlendMode): void {
    const parsed = parseBlendMode(mode);
    this.blendMode = parsed;
    this.engine?.setBlendMode(parsed);
    this.statusMessage = `Blend mode: ${parsed}`;
  }

  private currentDialogBlendMode(): GnumarusBlendMode {
    const select = this.shadowRoot?.getElementById("blendMode") as HTMLSelectElement | null;
    return parseBlendMode(select?.value ?? "normal");
  }

  private applyBlendModeFromDialog(): void {
    const mode = this.currentDialogBlendMode();
    this.blendMode = mode;
    this.engine?.setBlendMode(mode);
    this.statusMessage = `Blend mode: ${mode}`;
  }

  /** Test hook: set whether strokes accumulate onto themselves while drawing. */
  setAccumulate(enabled: boolean): void {
    const next = enabled === true;
    this.accumulate = next;
    this.engine?.setAccumulate(next);
    this.statusMessage = `Accumulate: ${next ? "on" : "off"}`;
  }

  private currentDialogAccumulate(): boolean {
    const input = this.shadowRoot?.getElementById("accumulate") as HTMLInputElement | null;
    return input?.checked === true;
  }

  private applyAccumulateFromDialog(): void {
    const enabled = this.currentDialogAccumulate();
    this.accumulate = enabled;
    this.engine?.setAccumulate(enabled);
    this.statusMessage = `Accumulate: ${enabled ? "on" : "off"}`;
  }

  /** Toggle between eraser and the previously used non-eraser blend mode. */
  private toggleEraserBlend(): void {
    if (this.engine === null) {
      return;
    }
    const mode = this.engine.toggleEraserBlend();
    this.blendMode = mode;
    this.statusMessage = `Blend mode: ${mode}`;
  }

  /** Test hook: set the line width (floats 0.1..64, clamped). */
  setLineWidth(size: number): void {
    const clamped = clampBrushSizeFloat(size);
    this.lineWidth = clamped;
    this.engine?.setLineWidth(clamped);
    this.statusMessage = `Line width: ${clamped}`;
  }

  /** Test hook: set the line shape (square/circle, defaults to square). */
  setLineShape(shape: GnumarusBrushShape): void {
    const parsed = parseBrushShape(shape);
    this.lineShape = parsed;
    this.engine?.setLineShape(parsed);
    this.statusMessage = `Line shape: ${parsed}`;
  }

  /** Test hook: enable or disable line anti-aliasing. */
  setLineAntialias(enabled: boolean): void {
    const next = enabled === true;
    this.lineAntialias = next;
    this.engine?.setLineAntialias(next);
    this.statusMessage = `Line anti-aliasing: ${next ? "on" : "off"}`;
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
    this.statusMessage = `Line width: ${size}`;
  }

  private applyLineShapeFromDialog(): void {
    const shape = this.currentDialogLineShape();
    this.lineShape = shape;
    this.engine?.setLineShape(shape);
    this.statusMessage = `Line shape: ${shape}`;
  }

  private applyLineAntialiasFromDialog(): void {
    const enabled = this.currentDialogLineAntialias();
    this.lineAntialias = enabled;
    this.engine?.setLineAntialias(enabled);
    this.statusMessage = `Line anti-aliasing: ${enabled ? "on" : "off"}`;
  }

  /** Test hook: set the curve width (floats 0.1..64, clamped). */
  setCurveWidth(size: number): void {
    const clamped = clampBrushSizeFloat(size);
    this.curveWidth = clamped;
    this.engine?.setCurveWidth(clamped);
    this.statusMessage = `Curve width: ${clamped}`;
  }

  /** Test hook: set the curve shape (square/circle, defaults to square). */
  setCurveShape(shape: GnumarusBrushShape): void {
    const parsed = parseBrushShape(shape);
    this.curveShape = parsed;
    this.engine?.setCurveShape(parsed);
    this.statusMessage = `Curve shape: ${parsed}`;
  }

  /** Test hook: enable or disable curve anti-aliasing. */
  setCurveAntialias(enabled: boolean): void {
    const next = enabled === true;
    this.curveAntialias = next;
    this.engine?.setCurveAntialias(next);
    this.statusMessage = `Curve anti-aliasing: ${next ? "on" : "off"}`;
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
    this.statusMessage = `Curve width: ${size}`;
  }

  private applyCurveShapeFromDialog(): void {
    const shape = this.currentDialogCurveShape();
    this.curveShape = shape;
    this.engine?.setCurveShape(shape);
    this.statusMessage = `Curve shape: ${shape}`;
  }

  private applyCurveAntialiasFromDialog(): void {
    const enabled = this.currentDialogCurveAntialias();
    this.curveAntialias = enabled;
    this.engine?.setCurveAntialias(enabled);
    this.statusMessage = `Curve anti-aliasing: ${enabled ? "on" : "off"}`;
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
    this.statusMessage = `Checker color A: ${six}`;
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
    this.statusMessage = `Checker color B: ${six}`;
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
    this.statusMessage = `Canvas background: ${this.backgroundMode === "solid" ? `solid ${six}` : "checkerboard"}`;
  }

  private resetGridMinZoomToDefault(): void {
    this.gridMinZoom = DEFAULT_GRID_SETTINGS.minZoom;
    this.engine?.setGridMinZoom(this.gridMinZoom);
    this.persistGrid();
    this.statusMessage = "Pixel grid minimum zoom reset to default";
  }

  private resetGridOpacityToDefault(): void {
    this.gridOpacity = DEFAULT_GRID_SETTINGS.opacityPercent;
    this.engine?.setGridOpacityPercent(this.gridOpacity);
    this.persistGrid();
    this.statusMessage = "Pixel grid opacity reset to default";
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
    this.statusMessage = `Checkerboard: ${settings.mode}-space, ${settings.sizeX}x${settings.sizeY}px`;
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
    this.toastDurationSec = DEFAULT_TOAST_SETTINGS.durationSec;
    this.persistToast();
    void this.refreshPreview();
    this.statusMessage = "Settings reset to defaults";
  }

  private togglePreview(): void {
    this.previewOpen = !this.previewOpen;
    if (this.previewOpen) {
      this.statusMessage = "Final preview opened";
      void this.refreshPreview();
    } else {
      this.statusMessage = "Final preview closed";
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
      this.frameText = "Frame 1/1: F1";
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
    this.frameText = `Frame ${frame + 1}/${count}: ${this.engine.getFrameName(frame)}`;
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
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage = `Frame ${frame + 1} selected`;
      this.showToast(this.frameToastFor(frame, this.engine.getFrameCount()));
    }
  }

  private onAddFrame(): void {
    if (this.engine === null) {
      return;
    }
    const frame = this.engine.addFrame();
    this.refreshLayers();
    this.dirty = true;
    this.statusMessage = `Frame ${frame + 1} added`;
  }

  private onAddFrameBefore(frame: number): void {
    this.closeMatrixMenu();
    if (this.engine === null) {
      return;
    }
    const added = this.engine.insertFrame(frame);
    if (added >= 0) {
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage = `Frame ${added + 1} added`;
    }
  }

  private onAddFrameAfter(frame: number): void {
    this.closeMatrixMenu();
    if (this.engine === null) {
      return;
    }
    const added = this.engine.insertFrame(frame + 1);
    if (added >= 0) {
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage = `Frame ${added + 1} added`;
    }
  }

  private onRemoveFrame(frame: number): void {
    this.closeMatrixMenu();
    if (this.engine === null) {
      return;
    }
    if (this.engine.removeFrame(frame)) {
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage = "Frame removed";
    } else {
      this.statusMessage = "Cannot remove the last frame";
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
        <h3>Select content</h3>
        <div class="picker-grid" data-testid="content-picker-grid">
          <button
            class="picker-item"
            data-testid="content-picker-none"
            @click=${(): void => this.onContentPickerSelect("none")}
          >
            <span class="picker-empty" aria-hidden="true">∅</span>
            <span class="picker-name">No content</span>
          </button>
          <button
            class="picker-item"
            data-testid="content-picker-new"
            @click=${(): void => this.onContentPickerSelect("new")}
          >
            <span class="picker-empty" aria-hidden="true">+</span>
            <span class="picker-name">New content</span>
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
          <button @click=${(): void => this.closeContentPicker()}>Cancel</button>
        </div>
      </dialog>
    `;
  }

  private renderTexturePickerDialog() {
    const textures = this.sortedTextures();
    return html`
      <dialog id="texturePickerDialog" @close=${(): void => this.onTexturePickerClosed()}>
        <h3>Select texture</h3>
        <div class="picker-grid" data-testid="texture-picker-grid">
          <button
            class="picker-item"
            data-testid="texture-picker-none"
            @click=${(): void => this.onTexturePickerSelect("none")}
          >
            <span class="picker-empty" aria-hidden="true">∅</span>
            <span class="picker-name">No texture</span>
          </button>
          <button
            class="picker-item"
            data-testid="texture-picker-new"
            @click=${(): void => this.onTexturePickerSelect("new")}
          >
            <span class="picker-empty" aria-hidden="true">+</span>
            <span class="picker-name">New texture</span>
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
          <button @click=${(): void => this.closeTexturePicker()}>Cancel</button>
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
        this.statusMessage = "Cell content dissociated";
      } else {
        this.statusMessage = "Cell is already empty";
      }
      this.closeContentPicker();
      return;
    }
    if (contentId === "new") {
      const created = this.engine.createEmptyContentForCell(target.layerId, target.frame);
      if (created === null) {
        this.statusMessage = "Failed to create content";
        this.closeContentPicker();
        return;
      }
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage = "Cell content created";
      this.closeContentPicker();
      void this.openTexturePicker(created);
      return;
    }
    if (this.engine.associateCellContent(target.layerId, target.frame, contentId)) {
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage = "Cell content associated";
    } else {
      this.statusMessage = "Cell already uses that content";
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
      this.statusMessage = "Content left without texture";
      this.refreshLayers();
      this.closeTexturePicker();
      return;
    }
    if (textureId === "new") {
      const created = this.engine.createEmptyTexture();
      if (this.engine.associateContentTexture(contentId, created)) {
        this.refreshLayers();
        this.dirty = true;
        this.statusMessage = "Content associated with texture";
      } else {
        this.statusMessage = "Failed to associate texture";
      }
      this.closeTexturePicker();
      return;
    }
    if (this.engine.associateContentTexture(contentId, textureId)) {
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage = "Content associated with texture";
    } else {
      this.statusMessage = "Content already uses that texture";
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
    this.statusMessage = `Default frame duration: ${duration} s`;
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
    this.statusMessage = `Default frame duration: ${duration} s`;
  }

  private resetDefaultFrameDuration(): void {
    this.defaultFrameDuration = DEFAULT_ANIMATION_FRAME_DURATION;
    this.engine?.setDefaultFrameDuration(DEFAULT_ANIMATION_FRAME_DURATION);
    this.refreshLayers();
    this.dirty = true;
    this.statusMessage = "Default frame duration reset to default";
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
        error instanceof GnumarusNamedAnimationError ? error.message : "Invalid animation definition.";
      return;
    }
    if (!this.engine.addNamedAnimation(parsed)) {
      this.animationError = `An animation named "${parsed.name}" already exists.`;
      return;
    }
    this.animationInput = "";
    this.animationError = null;
    this.refreshLayers();
    this.dirty = true;
    this.statusMessage = `Animation ${parsed.name} added (${parsed.frames.length} frame${parsed.frames.length === 1 ? "" : "s"})`;
  }

  private onDeleteAnimation(name: string): void {
    if (this.engine === null) {
      return;
    }
    if (this.engine.removeNamedAnimation(name)) {
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage = `Animation ${name} deleted`;
    }
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
        this.statusMessage = "Playing all frames";
      }
      return;
    }
    if (this.engine.setActiveAnimation(value)) {
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage = `Animation ${value} selected`;
    }
  }

  private async openExportDialog(): Promise<void> {
    if (this.engine === null) {
      return;
    }
    this.fileMenuOpen = false;
    this.exportFrame = this.engine.getCurrentFrame() + 1;
    this.exportFormats = detectStillFormats();
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
    if (this.exportAnimatedFormat !== "gif" && findStillFormat(this.exportFormats, this.exportAnimatedFormat) === null) {
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
      this.statusMessage = "Export failed: no image format is available";
      this.showToast("Export failed: no image format is available");
      return;
    }
    const inputs = this.engine.getFrameFlattenInputs(frame - 1);
    if (inputs === null) {
      this.closeExportDialog();
      this.statusMessage = "Export failed: invalid frame";
      this.showToast("Export failed: invalid frame");
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
      const blob = await encodeStillImage(
        flat,
        size.width,
        size.height,
        format.mime,
        format.mime === "image/png" ? undefined : quality / 100,
      );
      if (blob === null) {
        this.closeExportDialog();
        this.statusMessage = `Export failed: ${format.label} encoding is not supported here`;
        this.showToast(`Export failed: ${format.label} encoding is not supported here`);
        return;
      }
      const fileName = `${exportBaseName(this.projectName)}-frame-${frame}.${format.ext}`;
      this.closeExportDialog();
      if (await this.saveExportBlob(blob, fileName, `${format.label} image`)) {
        this.statusMessage = `Exported ${fileName}`;
        this.showToast(`Exported ${fileName}`);
      }
    } catch (error) {
      this.closeExportDialog();
      const reason = error instanceof Error ? error.message : String(error);
      this.statusMessage = `Export failed: ${reason}`;
      this.showToast(`Export failed: ${reason}`);
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
          this.statusMessage = `Exported ${fileName}`;
          this.showToast(`Exported ${fileName}`);
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
      const animatedQualityValue = format.mime === "image/png" ? undefined : animatedQuality / 100;
      const blobs: Blob[] = [];
      for (const entry of resolved.frames) {
        const inputs = this.engine.getFrameFlattenInputs(entry.frame);
        if (inputs === null) {
          this.failAnimatedExport("Export failed: invalid frame");
          return;
        }
        const flat = compositeFinalImage(size.width, size.height, inputs, background);
        const blob = await encodeStillImage(flat, size.width, size.height, format.mime, animatedQualityValue);
        if (blob === null) {
          this.failAnimatedExport(`Export failed: ${format.label} encoding is not supported here`);
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
        this.statusMessage = `Exported ${blobs.length} files to ${dir.name}`;
        this.showToast(`Exported ${blobs.length} files to ${dir.name}`);
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
    this.statusMessage = `Exported ${blobs.length} files`;
    this.showToast(`Exported ${blobs.length} files`);
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
      fail("Export failed: no image format is available");
      return;
    }
    let strips: Array<{ frames: number[] }>;
    try {
      strips = this.resolveSheetStrips();
    } catch (error) {
      fail(error instanceof Error ? error.message : "Export failed: invalid spritesheet sources");
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
      const sheetQualityValue = format.mime === "image/png" ? undefined : sheetQuality / 100;
      if (layoutValue === "individual") {
        const flat = strips.flatMap((strip) => strip.frames);
        const blobs: Blob[] = [];
        for (const frame of flat) {
          const flatPixels = this.compositeSheetFrame(frame, background);
          if (flatPixels === null) {
            fail("Export failed: invalid frame");
            return;
          }
          const blob = await encodeStillImage(
            flatPixels,
            size.width,
            size.height,
            format.mime,
            sheetQualityValue,
          );
          if (blob === null) {
            fail(`Export failed: ${format.label} encoding is not supported here`);
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
          fail("Export failed: invalid frame");
          return;
        }
        pixels.set(frame, flatPixels);
      }
      const sheet = composeSheet(pixels, geometry, size.width, size.height);
      const blob = await encodeStillImage(
        sheet.buffer,
        sheet.width,
        sheet.height,
        format.mime,
        sheetQualityValue,
      );
      if (blob === null) {
        fail(`Export failed: ${format.label} encoding is not supported here`);
        return;
      }
      const fileName = `${base}-sheet.${format.ext}`;
      this.closeExportDialog();
      if (await this.saveExportBlob(blob, fileName, `${format.label} image`)) {
        this.statusMessage = `Exported ${fileName}`;
        this.showToast(`Exported ${fileName}`);
      }
    } catch (error) {
      fail(error instanceof Error ? error.message : "Export failed: invalid spritesheet");
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
      this.statusMessage = `Frame ${target + 1} uses the project default`;
    } else {
      const value = Number(raw);
      if (!Number.isFinite(value) || value <= 0) {
        this.closeFrameDurationDialog();
        return;
      }
      const duration = clampFrameDurationSec(value);
      this.engine.setFrameDuration(target, duration);
      this.statusMessage = `Frame ${target + 1} duration: ${duration} s`;
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
      this.statusMessage = `Frame ${target + 1} uses the project default`;
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
      this.statusMessage = "Frame renamed";
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
      this.statusMessage = "Frame renamed";
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
      this.statusMessage = "Layer renamed";
    }
    this.refreshLayers();
    this.closeLayerRenameDialog();
  }

  private togglePlayback(): void {
    if (this.engine === null) {
      return;
    }
    if (this.playing) {
      this.stopPlayback("Animation stopped");
      return;
    }
    const activeName = this.engine.getActiveAnimationName();
    const animation =
      activeName === null
        ? null
        : (this.engine.getNamedAnimations().find((entry) => entry.name === activeName) ?? null);
    if (animation !== null && animation.frames.length === 0) {
      this.statusMessage = `Animation ${animation.name} has no frames to play`;
      return;
    }
    this.playing = true;
    this.playbackAnimation = animation;
    this.playbackDirection = 1;
    if (animation === null) {
      this.playbackIndex = 0;
      this.statusMessage = `Playing from frame ${this.engine.getCurrentFrame() + 1}`;
    } else {
      const current = this.engine.getCurrentFrame();
      const resume = animation.frames.findIndex((entry) => entry.frame === current);
      this.playbackIndex = resume < 0 ? 0 : resume;
      const start = animation.frames[this.playbackIndex];
      if (start !== undefined) {
        this.engine.setCurrentFrame(start.frame);
        this.refreshLayers();
      }
      this.statusMessage = `Playing animation ${animation.name} from frame ${(start?.frame ?? 0) + 1}`;
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
    this.statusMessage = "Layer added";
  }

  private onRemoveLayer(id: string): void {
    if (this.engine === null) {
      return;
    }
    if (this.engine.removeLayer(id)) {
      this.statusMessage = "Layer deleted";
      this.dirty = true;
    } else {
      this.statusMessage = "Cannot delete the last layer";
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
      this.statusMessage = next ? `${channel.toUpperCase()} channel locked` : `${channel.toUpperCase()} channel unlocked`;
    }
  }

  private onMoveLayer(id: string, direction: "up" | "down"): void {
    if (this.engine?.moveLayer(id, direction) === true) {
      this.statusMessage = `Layer moved ${direction}`;
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
      this.statusMessage = "Layer added";
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
      this.statusMessage = "Layer added";
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
      this.statusMessage = "Layers merged";
    } else {
      this.statusMessage = "Nothing below to merge with";
    }
  }

  private onResetLayerTransform(id: string): void {
    this.closeLayerMenu();
    if (this.engine?.resetLayerTransform(id) === true) {
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage = "Layer transform reset";
    } else {
      this.statusMessage = "Layer transform reset failed";
    }
  }

  /** Merge the floating selection into its home cell, if one is active. */
  private commitFloatingSelection(): void {
    if (this.engine?.commitFloating() === true) {
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage = "Floating selection merged";
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
      this.statusMessage = "Nothing to fit: the layer has no texture on this frame";
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
      this.statusMessage = "Nothing to fit: the cell has no texture";
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
          ? "Nothing to fit: every texture is empty or already fits"
          : `Fitted ${result.fitted} texture${result.fitted === 1 ? "" : "s"} to size`;
      this.closeFitTextureDialog();
      return;
    }
    if (this.engine.fitTextureToSize(target.textureId, threshold)) {
      this.refreshLayers();
      this.dirty = true;
      const fitted = this.engine.exportTextures().find((entry) => entry.id === target.textureId);
      this.statusMessage =
        fitted === undefined ? "Texture fitted to size" : `Texture fitted to ${fitted.width} x ${fitted.height}`;
    } else {
      this.statusMessage = "Nothing to fit: texture is empty or already fits";
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
          ? "Cannot crop: every cell content is fully outside the canvas"
          : "Nothing to crop: every cell already fits the canvas";
      return;
    }
    this.refreshLayers();
    this.dirty = true;
    const rest =
      result.unchanged > 0 || result.outside > 0
        ? ` (${result.unchanged} unchanged${result.outside > 0 ? `, ${result.outside} outside` : ""})`
        : "";
    this.statusMessage = `Cropped ${result.cropped} texture${result.cropped === 1 ? "" : "s"} to canvas${rest}`;
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
      this.statusMessage = "Cannot crop: cell content is fully outside the canvas";
    } else {
      this.statusMessage = "Nothing to crop: texture is already inside the canvas";
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
      this.statusMessage = "Cannot resize to canvas: content is outside the canvas or too large";
    } else {
      this.statusMessage = "Nothing to resize: texture already fills the canvas";
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
      this.statusMessage = "Nothing to expand: current cell has no texture";
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
      this.statusMessage = "Layer renamed";
    }
    this.refreshLayers();
  }

  private async createNew(): Promise<void> {
    this.stopPlayback();
    const widthInput = this.shadowRoot?.getElementById("newWidth") as HTMLInputElement | null;
    const heightInput = this.shadowRoot?.getElementById("newHeight") as HTMLInputElement | null;
    const width = Math.min(1024, Math.max(1, Number(widthInput?.value ?? "64") || 64));
    const height = Math.min(1024, Math.max(1, Number(heightInput?.value ?? "64") || 64));
    this.newWidth = Math.floor(width);
    this.newHeight = Math.floor(height);
    this.engine?.newProject(this.newWidth, this.newHeight);
    this.refreshLayers();
    this.directoryHandle = null;
    this.projectName = "Untitled";
    this.dirty = true;
    this.statusMessage = `New ${this.newWidth} x ${this.newHeight} canvas`;
    this.closeNewDialog();
  }

  private async openProject(): Promise<void> {
    this.fileMenuOpen = false;
    if (!isFileSystemAccessSupported()) {
      this.statusMessage = "Open requires the File System Access API (Chromium)";
      return;
    }
    this.stopPlayback();
    try {
      this.statusMessage = "Opening directory...";
      const dir = await pickProjectDirectory();
      const { project, fileBlobs } = await readProjectFiles(dir);
      const textures: GnumarusTexturePixels[] = [];
      for (const texture of project.animation.textures) {
        const blob = fileBlobs.get(texture.file);
        if (blob === undefined) {
          throw new Error(`Missing texture file: ${texture.file}`);
        }
        const decoded = await decodePngToBuffer(blob);
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
      this.statusMessage = `Opened ${dir.name}`;
    } catch (error) {
      this.statusMessage = error instanceof Error ? `Open failed: ${error.message}` : "Open failed";
    }
  }

  private async importImageFile(): Promise<void> {
    this.fileMenuOpen = false;
    if (!isFilePickerSupported()) {
      this.statusMessage = "Import requires the File System Access API (Chromium)";
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
      console.error(`Import failed: ${reason}`);
      this.statusMessage = `Import failed: ${reason}`;
      this.showToast(`Import failed: ${reason}`);
      return;
    }
    if (handle === null) {
      return;
    }
    try {
      this.statusMessage = "Importing...";
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
      this.directoryHandle = null;
      this.projectName = dot > 0 ? fileName.slice(0, dot) : fileName;
      this.dirty = true;
      const animationSuffix =
        imported.namedAnimations.length === 1
          ? ", 1 animation"
          : imported.namedAnimations.length > 1
            ? `, ${imported.namedAnimations.length} animations`
            : "";
      const summary = `Imported ${fileName} (${imported.layers.length} layers, ${imported.frames} frames${animationSuffix})`;
      this.statusMessage = summary;
      this.showToast(summary);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.error(`Import failed: ${reason}`);
      this.statusMessage = `Import failed: ${reason}`;
      this.showToast(`Import failed: ${reason}`);
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
    this.directoryHandle = null;
    this.projectName = dot > 0 ? fileName.slice(0, dot) : fileName;
    this.dirty = true;
    const summary = `Imported ${fileName} (${psd.layers.length} layer${psd.layers.length === 1 ? "" : "s"})`;
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
    this.directoryHandle = null;
    this.projectName = dot > 0 ? fileName.slice(0, dot) : fileName;
    this.dirty = true;
    const summary = `Imported ${fileName} (${xcf.layers.length} layer${xcf.layers.length === 1 ? "" : "s"})`;
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
    this.directoryHandle = null;
    this.projectName = dot > 0 ? fileName.slice(0, dot) : fileName;
    this.dirty = true;
    const summary = `Imported ${fileName} (${kra.layers.length} layer${kra.layers.length === 1 ? "" : "s"}, ${kra.frames} frame${kra.frames === 1 ? "" : "s"})`;
    this.statusMessage = summary;
    this.showToast(summary);
  }

  private async saveProject(): Promise<void> {
    this.fileMenuOpen = false;
    if (this.engine === null) {
      return;
    }
    if (!isFileSystemAccessSupported()) {
      this.statusMessage = "Save requires the File System Access API (Chromium)";
      return;
    }
    try {
      this.statusMessage = "Saving...";
      const dir = this.directoryHandle ?? (await pickProjectDirectory());
      const size = this.engine.size;
      const exported = this.engine.exportAnimationProject();
      const texturesMeta: GnumarusTextureMeta[] = [];
      const blobs = new Map<string, Blob>();
      for (const texture of exported.textures) {
        const file = textureFilePath(texture.id);
        texturesMeta.push({
          id: texture.id,
          name: texture.name,
          width: texture.width,
          height: texture.height,
          file,
        });
        blobs.set(file, await encodeBufferToPngBlob(texture.buffer, texture.width, texture.height));
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
      await writeProjectFiles(dir, meta, blobs);
      this.directoryHandle = dir;
      this.projectName = dir.name;
      this.dirty = false;
      this.statusMessage = `Saved to ${dir.name}`;
    } catch (error) {
      this.statusMessage = error instanceof Error ? `Save failed: ${error.message}` : "Save failed";
    }
  }
}

customElements.define("gnumarus-shell", GnumarusShell);
