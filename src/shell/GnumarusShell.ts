import { LitElement, css, html } from "lit";
import {
  GnumarusCanvasEngine,
  GnumarusWebGlError,
  type GnumarusCanvasTool,
  type GnumarusLayerInfo,
} from "../canvas/GnumarusCanvasEngine";
import { sanitizeTextHtml } from "../text/GnumarusTextSanitize";
import {
  cellRectCells,
  toggleSelectedFrame,
  toggleSelectedId,
  unionSelectedFrameRange,
  unionSelectedIdRange,
} from "../canvas/GnumarusSelectionBoolean";
import { isHiddenByCollapse } from "../canvas/GnumarusLayerTree";
import {
  formatContentBytes,
  modelMeta,
  searchManagedItems,
  textureMeta,
  type GnumarusContentSnapshot,
  type GnumarusManagedItem,
} from "../content/GnumarusContentManager";
import { gunzipSync, zipSync } from "fflate";
import {
  detectUnsupportedSvgFeatures,
  sanitizeSvg,
} from "../vector/GnumarusSvg";
import {
  createEmbeddedProjectStore,
  downloadBlob,
  ensureProjectContentDirs,
  isFilePickerSupported,
  isFileSaveSupported,
  isFileSystemAccessSupported,
  isOpfsSupported,
  listEmbeddedProjects,
  openEmbeddedProjectStore,
  pickImportFile,
  pickImageFile,
  pickModel3dFile,
  pickProjectDirectory,
  pickSvgFile,
  pickSaveFile,
  readFileBytes,
  readFileSize,
  readOldProjectFileReferences,
  readProjectFiles,
  readProjectMeta,
  removeProjectFile,
  sanitizeEmbeddedProjectName,
  scanProjectContentFiles,
  unpackGppToEmbedded,
  writeBlobToDirectory,
  writeBlobToFile,
  writeProjectFiles,
  type GnumarusDirectoryHandle,
  type GnumarusDiscoveredContentFile,
} from "../project/GnumarusFileSystem";
import {
  DEFAULT_ONION_SETTINGS,
  ONION_SETTINGS_STORAGE_KEY,
  parseOnionSettings,
  serializeOnionSettings,
} from "../settings/GnumarusOnionSettings";
import {
  GNUMARUS_MAX_RECENT_COLORS,
  GNUMARUS_MAX_SWATCHES,
  normalizeSwatchHex,
  parseSwatchSettings,
  serializeSwatchSettings,
  SWATCH_SETTINGS_STORAGE_KEY,
} from "../settings/GnumarusSwatchSettings";
import {
  collectProjectFileReferences,
  decodeSvgFile,
  decodeTextFile,
  encodeProjectArchive,
  encodeSvgArchive,
  encodeTextArchive,
  findStaleProjectPaths,
  GNUMARUS_APP_ID,
  GNUMARUS_MODEL3D_DEFAULT_VIEW,
  GNUMARUS_PROJECT_ARCHIVE_FILE,
  GNUMARUS_PROJECT_FILE,
  model3dFilePath,
  parseModel3dExtension,
  serializeProject,
  staleTextureCandidates,
  svgArchivePath,
  svgFilePath,
  textArchivePath,
  textFilePath,
  textureFilePath,
  type GnumarusContentMeta,
  type GnumarusModel3dMeta,
  type GnumarusModel3dView,
  type GnumarusProjectMeta,
  type GnumarusSvgMeta,
  type GnumarusTextureMeta,
  type GnumarusTextMeta,
  type GnumarusTilemapMeta,
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
  DEFAULT_EMPTY_CELL_SETTINGS,
  EMPTY_CELL_SETTINGS_STORAGE_KEY,
  parseEmptyCellMode,
  parseEmptyCellSettings,
  serializeEmptyCellSettings,
  type GnumarusEmptyCellMode,
} from "../settings/GnumarusEmptyCellSettings";
import {
  BLACK_SWITCH_SETTINGS_STORAGE_KEY,
  DEFAULT_BLACK_SWITCH_SETTINGS,
  parseBlackSwitchSettings,
  serializeBlackSwitchSettings,
} from "../settings/GnumarusBlackSwitchSettings";
import {
  applyNewProjectPreset,
  DEFAULT_NEW_PROJECT_PRESET,
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
  parseModelLighting,
  parseSvgStorage,
  parseTextStorage,
  serializeStorageSettings,
  type GnumarusModelLighting,
  type GnumarusProjectFileFormat,
  type GnumarusStorageFormat,
  type GnumarusStorageSettings,
  type GnumarusSvgStorage,
  type GnumarusTextStorage,
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
import { installNumberInputHelpers } from "../settings/GnumarusNumberSlider";
import {
  BRUSH_SETTINGS_STORAGE_KEY,
  clampMaxBrushSize,
  DEFAULT_BRUSH_SETTINGS,
  parseBrushSettings,
  serializeBrushSettings,
} from "../settings/GnumarusBrushSettings";
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
import {
  adjustPixel,
  clampAdjustLevels,
  invertPixel,
  parseHslAdjustMode,
  parseHslAdjustModel,
  type GnumarusHslAdjustMode,
  type GnumarusHslAdjustModel,
} from "../color/GnumarusAdjustments";
import {
  buildCacheBustedReloadUrl,
  extractEntryScriptUrl,
  GNUMARUS_UPDATE_CHECK_MS,
  resolveEntryScriptUrl,
  shouldCheckForUpdates,
  stripReloadCacheBuster,
  type GnumarusUpdateStatus,
} from "../project/GnumarusUpdateCheck";
import {
  GNUMARUS_PAGES_URL,
  gnumarusManualPath,
  isGitHubPagesDeploy,
} from "./GnumarusDeploy";
import { parseHexColor } from "../canvas/GnumarusPixelBuffer";
import {
  applyAlphaPlane,
  clampBrushAngle,
  clampBrushSizeFloat,
  clampLayerDim,
  cropBufferBox,
  extractAlphaPlane,
  findAlphaBoundingBox,
  parseBlendMode,
  parseBrushShape,
  parseBrushSource,
  parseLayerBlendMode,
  parsePressureResponse,
  parseSelectionBrushMode,
  type GnumarusBlendMode,
  type GnumarusBrushShape,
  type GnumarusBrushSource,
  type GnumarusPressureResponse,
  type GnumarusSelectionBrushMode,
  type GnumarusShadeDirection,
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
import { parseWrapMode, scrollIntoViewDelta, type GnumarusWrapMode } from "../canvas/GnumarusViewportMath";
import {
  getFilterDef,
  GNUMARUS_FILTERS,
  normalizeFilterValues,
  type GnumarusFilterDef,
  type GnumarusFilterParamDef,
  type GnumarusFilterTheme,
} from "../canvas/GnumarusFilters";
import {
  BRUSH_PRESET_STORAGE_KEY,
  BUILT_IN_BRUSH_PRESETS,
  displayBrushPresetName,
  parseBrushPreset,
  parseBrushPresetList,
  serializeBrushPreset,
  serializeBrushPresetList,
  type GnumarusBrushColorMode,
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
  type GnumarusMessageKey,
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
  requireClipboard,
  requireFloatingSelection,
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
import type { GnumarusColorPicker } from "../color/GnumarusColorPicker";

interface GnumarusShortcutEntry {
  keys: string;
  /** Brazilian Portuguese key label (shown when the locale is pt-BR). */
  keysPt?: string;
  action: string;
}

interface GnumarusShortcutSection {
  title: string;
  entries: GnumarusShortcutEntry[];
}

/** Decode a base64 string into raw bytes (chunked, no dependency). */
function decodeBase64Bytes(data: string): Uint8Array {
  const text = atob(data);
  const out = new Uint8Array(text.length);
  for (let index = 0; index < text.length; index += 1) {
    out[index] = text.charCodeAt(index);
  }
  return out;
}

/** Encode raw bytes as a base64 string (chunked, no dependency). */
function encodeBase64Bytes(bytes: Uint8Array): string {
  let text = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    text += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(text);
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
        { keys: "Ctrl+S (Cmd+S on macOS)", keysPt: "Ctrl+S (Cmd+S no macOS)", action: tr("sc.saveFolder") },
      ],
    },
    {
      title: tr("sc.history"),
      entries: [
        { keys: "Ctrl+Z (Cmd+Z on macOS)", keysPt: "Ctrl+Z (Cmd+Z no macOS)", action: tr("sc.undo") },
        { keys: "Ctrl+Y or Shift+Ctrl+Z (Cmd+Y or Shift+Cmd+Z on macOS)", keysPt: "Ctrl+Y ou Shift+Ctrl+Z (Cmd+Y ou Shift+Cmd+Z no macOS)", action: tr("sc.redo") },
      ],
    },
    {
      title: tr("sc.edit"),
      entries: [
        { keys: "Ctrl+X (Cmd+X on macOS)", keysPt: "Ctrl+X (Cmd+X no macOS)", action: tr("sc.cut") },
        { keys: "Ctrl+C (Cmd+C on macOS)", keysPt: "Ctrl+C (Cmd+C no macOS)", action: tr("sc.copySelection") },
        { keys: "Ctrl+Shift+C (Cmd+Shift+C on macOS)", keysPt: "Ctrl+Shift+C (Cmd+Shift+C no macOS)", action: tr("sc.copyMerged") },
        { keys: "Ctrl+V (Cmd+V on macOS)", keysPt: "Ctrl+V (Cmd+V no macOS)", action: tr("sc.paste") },
      ],
    },
    {
      title: tr("sc.layers"),
      entries: [
        { keys: "Ctrl+E (Cmd+E on macOS)", keysPt: "Ctrl+E (Cmd+E no macOS)", action: tr("sc.mergeDown") },
        { keys: "PageUp", action: tr("sc.layerAbove") },
        { keys: "PageDown", action: tr("sc.layerBelow") },
        { keys: "ArrowUp", action: tr("sc.layerAbove") },
        { keys: "ArrowDown", action: tr("sc.layerBelow") },
        { keys: "Shift+ArrowUp", action: tr("sc.moveLayerUp") },
        { keys: "Shift+ArrowDown", action: tr("sc.moveLayerDown") },
        { keys: "Alt+ArrowLeft", action: tr("sc.nestOut") },
        { keys: "Alt+ArrowRight", action: tr("sc.nestIn") },
        { keys: "Insert", action: tr("sc.insertLayer") },
        { keys: "Delete", action: tr("sc.deleteCell") },
        { keys: "Ctrl+Shift+ArrowUp (Cmd+Shift+ArrowUp on macOS)", keysPt: "Ctrl+Shift+ArrowUp (Cmd+Shift+ArrowUp no macOS)", action: tr("sc.newLayerAbove") },
        { keys: "Ctrl+Shift+ArrowDown (Cmd+Shift+ArrowDown on macOS)", keysPt: "Ctrl+Shift+ArrowDown (Cmd+Shift+ArrowDown no macOS)", action: tr("sc.newLayerBelow") },
        { keys: "Ctrl+Alt+ArrowUp", action: tr("sc.expandUp") },
        { keys: "Ctrl+Alt+ArrowDown", action: tr("sc.expandDown") },
        { keys: "Ctrl+Alt+ArrowLeft", action: tr("sc.expandLeft") },
        { keys: "Ctrl+Alt+ArrowRight", action: tr("sc.expandRight") },
      ],
    },
    {
      title: tr("sc.frames"),
      entries: [
        { keys: "ArrowLeft", action: tr("sc.prevFrame") },
        { keys: "ArrowRight", action: tr("sc.nextFrame") },
        { keys: "Shift+ArrowLeft", action: tr("sc.moveFrameLeft") },
        { keys: "Shift+ArrowRight", action: tr("sc.moveFrameRight") },
        { keys: "Ctrl+Shift+ArrowLeft (Cmd+Shift+ArrowLeft on macOS)", keysPt: "Ctrl+Shift+ArrowLeft (Cmd+Shift+ArrowLeft no macOS)", action: tr("sc.newFrameLeft") },
        { keys: "Ctrl+Shift+ArrowRight (Cmd+Shift+ArrowRight on macOS)", keysPt: "Ctrl+Shift+ArrowRight (Cmd+Shift+ArrowRight no macOS)", action: tr("sc.newFrameRight") },
      ],
    },
    {
      title: tr("sc.tools"),
      entries: [
        { keys: "B", action: tr("sc.toolPencil") },
        { keys: "G or F", keysPt: "G ou F", action: tr("sc.toolBucket") },
        { keys: "N", action: tr("sc.toolLine") },
        { keys: "C", action: tr("sc.toolCurve") },
        { keys: "D", action: tr("sc.toolRectangle") },
        { keys: "H", action: tr("sc.toolEllipseShape") },
        { keys: "J", action: tr("sc.toolPolygon") },
        { keys: "K", action: tr("sc.toolGradient") },
        { keys: "S", action: tr("sc.toolShading") },
        { keys: "I", action: tr("sc.toolBlur") },
        { keys: "A", action: tr("sc.toolClone") },
        { keys: "Q", action: tr("sc.toolRecolor") },
        { keys: "Z", action: tr("sc.toolLoupe") },
        { keys: "T", action: tr("sc.toolTransform") },
        { keys: "Y", action: tr("sc.toolRot3d") },
        { keys: "R", action: tr("sc.toolRectselect") },
        { keys: "O", action: tr("sc.toolEllipse") },
        { keys: "L", action: tr("sc.toolLasso") },
        { keys: "P", action: tr("sc.toolPolylasso") },
        { keys: "W", action: tr("sc.toolColorselect") },
        { keys: "X", action: tr("sc.swapColors") },
        { keys: "Toolbar, palette", keysPt: "Barra de ferramentas, paleta", action: tr("sc.toolText") },
        { keys: "R (tile brush)", keysPt: "R (pincel de tiles)", action: tr("sc.tileRotate") },
        { keys: "H (tile brush)", keysPt: "H (pincel de tiles)", action: tr("sc.tileFlipH") },
        { keys: "V (tile brush)", keysPt: "V (pincel de tiles)", action: tr("sc.tileFlipV") },
        { keys: "Shift / Ctrl+Shift / Alt+Shift + drag", keysPt: "Shift / Ctrl+Shift / Alt+Shift + arrastar", action: tr("sc.rectselectModifiers") },
        { keys: "Alt + drag a transform resize handle", keysPt: "Alt + arraste uma âncora de redimensionamento", action: tr("sc.transformProportional") },
        { keys: "Right-click a drawer button", keysPt: "Botão direito numa gaveta de ferramentas", action: tr("sc.drawerFlyout") },
        { keys: "V", action: tr("sc.toolDestransform") },
        { keys: "U", action: tr("sc.toolDestransform3d") },
        { keys: "E", action: tr("sc.toggleEraser") },
        { keys: "Hold Ctrl", keysPt: "Segurar Ctrl", action: tr("sc.tempEyedropper") },
        { keys: "Enter, Return or Esc", keysPt: "Enter, Return ou Esc", action: tr("sc.mergeFloating") },
        { keys: "Escape", action: tr("sc.cancelStroke") },
      ],
    },
    {
      title: tr("sc.view"),
      entries: [
        { keys: "1 (main keyboard)", keysPt: "1 (teclado principal)", action: tr("sc.zoom100") },
        { keys: "2 (main keyboard)", keysPt: "2 (teclado principal)", action: tr("sc.fitRotated") },
        { keys: "0 (main keyboard)", keysPt: "0 (teclado principal)", action: tr("sc.resetTransform") },
        { keys: "4 (main and numpad)", keysPt: "4 (teclado principal e numérico)", action: tr("sc.rotateCcw") },
        { keys: "6 (main and numpad)", keysPt: "6 (teclado principal e numérico)", action: tr("sc.rotateCw") },
        { keys: "5 (main and numpad)", keysPt: "5 (teclado principal e numérico)", action: tr("sc.resetRotation") },
        { keys: "M", action: tr("sc.flipH") },
        { keys: "Shift+M", action: tr("sc.flipV") },
        { keys: "Ctrl+Alt+=", action: tr("sc.zoomIn") },
        { keys: "Ctrl+Alt+-", action: tr("sc.zoomOut") },
        { keys: "Hold Space and drag, or middle-drag", keysPt: "Segurar Espaço e arrastar, ou botão do meio", action: tr("sc.pan") },
        { keys: "Mouse wheel", keysPt: "Roda do mouse", action: tr("sc.zoomAtCursor") },
        { keys: "Hold Ctrl+Space, left-drag up/down", keysPt: "Segurar Ctrl+Espaço, arrastar com botão esquerdo para cima/baixo", action: tr("sc.loupeZoom") },
        { keys: "Hold Shift+Space and left-drag", keysPt: "Segurar Shift+Espaço e arrastar com botão esquerdo", action: tr("sc.loupeRotate") },
        { keys: "Alt+middle-click (loupe or cell transform tool)", keysPt: "Alt+clique do meio (lupa ou ferramenta de transformação de célula)", action: tr("sc.loupeReset") },
        { keys: "Middle-click (loupe or cell transform tool)", keysPt: "Clique do meio (lupa ou ferramenta de transformação de célula)", action: tr("sc.loupeFlip") },
        { keys: "Right-drag (loupe or cell transform tool)", keysPt: "Arrastar com botão direito (lupa ou ferramenta de transformação de célula)", action: tr("sc.loupeRotateDrag") },
        { keys: "Shift+Left-drag (pencil, line, curve)", keysPt: "Shift+arrastar com botão esquerdo (lápis, linha, curva)", action: tr("sc.liveResize") },
      ],
    },
    {
      title: tr("sc.actions"),
      entries: [
        {
          keys: "Ctrl+Shift+P (Cmd+Shift+P on macOS)", keysPt: "Ctrl+Shift+P (Cmd+Shift+P no macOS)",
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

/** Toolbar drawers: tool groups sharing one button with a flyout. */
export interface GnumarusToolDrawerDef {
  id: string;
  tools: GnumarusCanvasTool[];
}

export const GNUMARUS_TOOL_DRAWERS: GnumarusToolDrawerDef[] = [
  { id: "paint", tools: ["pencil", "line", "curve"] },
  { id: "shape", tools: ["rectangle", "ellipseShape", "polygon", "gradient"] },
  { id: "retouch", tools: ["shading", "blur", "clone", "recolor", "jumble"] },
  { id: "selection", tools: ["rectselect", "ellipse", "lasso", "polylasso", "colorselect"] },
  { id: "destructive", tools: ["destransform", "destransform3d", "crop"] },
  { id: "transform", tools: ["transform", "transform3d"] },
  { id: "model", tools: ["modeltransform", "flycam"] },
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
    .paint-wells {
      position: relative;
      width: 40px;
      height: 32px;
      flex: 0 0 auto;
    }
    .toolbar .paint-wells .paint-well {
      position: absolute;
      width: 20px;
      height: 20px;
      box-sizing: border-box;
      border: 1px solid #111;
      border-radius: 4px;
      padding: 0;
      cursor: pointer;
    }
    .paint-well-back {
      left: 16px;
      top: 12px;
    }
    .paint-well-front {
      left: 0;
      top: 0;
      cursor: pointer;
    }
    .toolbar .paint-swap {
      position: absolute;
      right: 0;
      top: 0;
      width: 16px;
      height: 16px;
      box-sizing: border-box;
      padding: 0;
      font-size: 11px;
      line-height: 1;
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
      position: fixed;
      display: flex;
      flex-direction: row;
      gap: 4px;
      background: #252526;
      border: 1px solid #555;
      border-radius: 4px;
      padding: 4px;
      z-index: 50;
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
      z-index: 50;
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
    .submenu-row {
      position: relative;
    }
    .submenu-row > button .submenu-arrow {
      float: right;
      margin-left: 12px;
    }
    .submenu-flyout {
      position: absolute;
      left: 100%;
      top: -4px;
      min-width: 180px;
      background: #2b2b2b;
      border: 1px solid #111;
      border-radius: 4px;
      padding: 4px;
      z-index: 60;
    }
    .submenu-flyout button {
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
    .submenu-flyout button:hover {
      background: #3a3a3a;
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
    .update-banner {
      background: #c00000;
      color: #fff;
      font-weight: 700;
      border: none;
      border-radius: 4px;
      padding: 4px 12px;
      margin-left: 8px;
      cursor: pointer;
      white-space: nowrap;
    }
    .update-banner:hover {
      background: #e00000;
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
    .tool-options .tool-options-readout {
      color: #e6e6e6;
      font-size: 12px;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
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
      min-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
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
    .layer-row.selected {
      box-shadow: inset 0 0 0 2px #ffd23f;
    }
    .layer-row.drop-target {
      outline: 2px dashed #4fc3f7;
      outline-offset: -2px;
    }
    .layer-row[data-mask="true"] {
      border-left: 2px solid #ba68c8;
    }
    .layer-mask-badge {
      flex: 0 0 auto;
      font-size: 10px;
      font-style: normal;
      color: #1e1e1e;
      background: #ba68c8;
      border-radius: 3px;
      padding: 0 5px;
      line-height: 1.6;
    }
    .anim-layer-name[data-mask="true"] {
      font-style: italic;
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
    .layer-blend {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 4px;
      font-size: 11px;
      color: #9a9a9a;
    }
    .layer-blend select {
      flex: 1 1 auto;
      min-width: 0;
      background: #1e1e1e;
      color: #e6e6e6;
      border: 1px solid #555;
      border-radius: 4px;
      padding: 2px 4px;
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
    .anim-matrix.sized {
      flex: 0 0 auto;
      max-height: none;
    }
    .matrix-resize-handle {
      flex: 0 0 auto;
      height: 7px;
      cursor: ns-resize;
      touch-action: none;
      background: transparent;
      border: 0;
      padding: 0;
    }
    .matrix-resize-handle:hover,
    .matrix-resize-handle:active {
      background: #0e639c;
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
      justify-content: flex-start;
      flex-wrap: nowrap;
      gap: 4px;
      padding: 2px;
    }
    .anim-corner button {
      flex: 0 0 auto;
    }
    .anim-corner select {
      min-width: 0;
      flex: 1 1 auto;
      overflow: hidden;
      text-overflow: ellipsis;
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
    .anim-corner button.active {
      background: #0e639c;
      border-color: #0e639c;
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
    .anim-layer-name.selected {
      box-shadow: inset 0 0 0 2px #ffd23f;
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
    .anim-cell.selected {
      box-shadow: inset 0 0 0 2px #4da3ff;
    }
    .anim-cell .cell-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .context-blocker {
      position: fixed;
      inset: 0;
      z-index: 60;
    }
    .context-menu {
      position: fixed;
      z-index: 61;
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
    .preview-toolbar input[type="number"] {
      width: 64px;
      background: #1e1e1e;
      color: #fff;
      border: 1px solid #555;
      border-radius: 4px;
      padding: 2px 6px;
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
    .adjust-window {
      width: 308px;
      height: auto;
      min-height: 0;
      resize: none;
    }
    .adjust-body {
      padding: 2px 12px 10px;
      display: flex;
      flex-direction: column;
      overflow: auto;
      font-size: 13px;
    }
    .adjust-body > p {
      margin: 6px 0;
      font-size: 12px;
      color: #b0b0b0;
    }
    .adjust-body label {
      display: flex;
      gap: 8px;
      align-items: center;
      margin: 6px 0;
    }
    .filter-param-row {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .filter-param-row > label {
      flex: 1 1 auto;
      min-width: 0;
    }
    .adjust-body label > .adjust-name {
      flex: 0 0 96px;
    }
    .adjust-body input[type="range"] {
      flex: 1 1 auto;
      min-width: 0;
    }
    .adjust-body input[type="number"] {
      width: 64px;
      flex: 0 0 auto;
      background: #1e1e1e;
      color: #e6e6e6;
      border: 1px solid #555;
      border-radius: 4px;
      padding: 4px 6px;
    }
    .adjust-body select {
      background: #1e1e1e;
      color: #e6e6e6;
      border: 1px solid #555;
      border-radius: 4px;
      padding: 4px 6px;
      max-width: 220px;
    }
    .adjust-spinner {
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 18px;
      font-size: 12px;
      color: #b0b0b0;
    }
    .adjust-spinner[hidden] {
      /* The generic [hidden] rule below uses !important, so this needs it
         too: the spinner must keep its 18px box while hidden, otherwise
         toggling it mid-gesture moves the param buttons and the pointerup
         misses the reset arrow (real mouse click never fires). */
      display: flex !important;
      visibility: hidden;
    }
    .adjust-spinner-ring {
      width: 14px;
      height: 14px;
      flex: 0 0 auto;
      border-radius: 50%;
      border: 2px solid #555;
      border-top-color: #fff;
      animation: hs-spin 0.8s linear infinite;
    }
    @keyframes hs-spin {
      to {
        transform: rotate(360deg);
      }
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
    .dialog-actions button,
    dialog button,
    .tool-options button {
      background: #0e639c;
      color: #fff;
      border: none;
      border-radius: 4px;
      padding: 6px 12px;
      cursor: pointer;
    }
    dialog button:hover,
    .tool-options button:hover {
      background: #1177b3;
    }
    dialog button:disabled,
    .tool-options button:disabled {
      opacity: 0.4;
      cursor: default;
    }
    /* Brush settings side panel inside the paint color picker popup. */
    .tool-options.brush-side-panel {
      flex-direction: column;
      align-items: stretch;
      white-space: normal;
      border-bottom: none;
      background: transparent;
      padding: 0;
      overflow: visible;
    }
    /* Native number spinners clash with the dark theme; the floating
       slider plus PageUp/PageDown cover stepping instead. */
    input[type="number"]::-webkit-outer-spin-button,
    input[type="number"]::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    input[type="number"] {
      -moz-appearance: textfield;
      appearance: textfield;
    }
    input:focus-visible,
    select:focus-visible,
    button:focus-visible {
      outline: 1px solid #0e639c;
      outline-offset: 1px;
    }
    .export-tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 12px;
      border-bottom: 1px solid #444;
      padding-bottom: 8px;
    }
    .export-tabs button {
      background: transparent;
      color: #e6e6e6;
      border: 1px solid transparent;
      border-radius: 4px;
      padding: 6px 12px;
      cursor: pointer;
    }
    .export-tabs button[aria-selected="true"] {
      background: #0e639c;
      color: #fff;
    }
    .dialog-error {
      color: #f48771;
      margin: 8px 0 0 0;
    }
    .embedded-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin: 8px 0;
      max-height: 240px;
      overflow-y: auto;
    }
    .embedded-list label {
      display: flex;
      align-items: center;
      gap: 8px;
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
    .picker-kind {
      font-size: 10px;
      color: #9a9a9a;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    #contentManagerDialog {
      min-width: min(640px, 90vw);
    }
    #contentManagerDialog input[type="search"] {
      width: 100%;
      box-sizing: border-box;
      margin: 4px 0 8px;
    }
    .manager-item {
      cursor: default;
      min-height: 0;
    }
    .manager-item:hover {
      background: #1e1e1e;
      border-color: #555;
    }
    .manager-meta {
      font-size: 10px;
      color: #9a9a9a;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .manager-cells {
      display: flex;
      flex-wrap: wrap;
      gap: 2px;
      justify-content: center;
      max-width: 100%;
    }
    .manager-cell {
      font-size: 10px;
      background: #0e639c;
      color: #e6e6e6;
      border-radius: 3px;
      padding: 0 4px;
      line-height: 1.6;
      white-space: nowrap;
    }
    .tile-window-body {
      flex: 1 1 auto;
      overflow: auto;
      padding: 8px;
    }
    .tile-window-empty {
      color: #9a9a9a;
      font-size: 12px;
      text-align: center;
    }
    .tile-grid {
      display: grid;
      gap: 2px;
      justify-content: start;
      align-content: start;
    }
    .tile-cell {
      padding: 0;
      border: 1px solid #555;
      border-radius: 0;
      background-color: transparent;
      background-repeat: no-repeat;
      image-rendering: pixelated;
      cursor: pointer;
      min-width: 0;
      min-height: 0;
    }
    .tile-cell:hover {
      border-color: #0e639c;
    }
    .tile-cell.active {
      outline: 2px solid #0e639c;
      outline-offset: -2px;
    }
    .picker-empty-note {
      grid-column: 1 / -1;
      color: #9a9a9a;
      font-size: 12px;
      text-align: center;
      padding: 12px 0;
    }
    .tool-text-glyph {
      font-family: Georgia, "Times New Roman", serif;
      font-weight: bold;
      font-size: 15px;
      line-height: 1;
    }
    .text-toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin: 8px 0;
      font-size: 12px;
    }
    .text-toolbar button {
      min-width: 30px;
    }
    .text-toolbar label {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .text-toolbar select,
    .text-toolbar input[type="number"] {
      max-width: 130px;
    }
    .text-toolbar input[type="number"] {
      width: 56px;
    }
    .text-color-row {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .text-editor-area {
      min-width: min(480px, 80vw);
      min-height: 120px;
      max-height: 320px;
      overflow-y: auto;
      background: #ffffff;
      color: #000000;
      border: 1px solid #555;
      border-radius: 4px;
      padding: 8px;
      font-size: 16px;
    }
    .text-editor-title {
      cursor: move;
      user-select: none;
      touch-action: none;
    }
    .text-editor-area:focus {
      outline: 2px solid #0e639c;
    }
    .text-editor-empty {
      color: #ffb3b3;
      font-size: 12px;
    }
    .error {
      color: #ffb3b3;
    }
  `;

  static properties = {
    tool: { type: String },
    colorValue: { type: String },
    secondaryColorValue: { type: String },
    pickerTarget: { type: String },
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
    filterMenuOpen: { type: Boolean },
    filterSubmenu: { type: String },
    toolsMenuOpen: { type: Boolean },
    toolsSubmenu: { type: String },
    filterOpen: { type: Boolean },
    filterId: { type: String },
    filterValues: { type: Object },
    filterWorking: { type: Boolean },
    filterWindowX: { type: Number },
    filterWindowY: { type: Number },
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
    emptyCellMode: { type: String },
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
    collapsedLayers: { type: Array },
    dragLayerId: { type: String },
    dropTargetLayerId: { type: String },
    contextMenuLayerId: { type: String },
    contextMenuLayerIds: { type: Array },
    contextMenuX: { type: Number },
    contextMenuY: { type: Number },
    matrixMenu: { type: Object },
    contentPickerTarget: { type: Object },
    texturePickerContentId: { type: String },
    texturePickerTileset: { type: Boolean },
    tileWindowOpen: { type: Boolean },
    tileWindowX: { type: Number },
    tileWindowY: { type: Number },
    textPickerTarget: { type: Object },
    textEditor: { type: Object },
    textEditorColor: { type: String },
    fitTextureTarget: { type: Object },
    fitThreshold: { type: Number },
    adjustBrightness: { type: Number },
    adjustContrast: { type: Number },
    adjustPosterize: { type: Number },
    bcBrightness: { type: Number },
    bcContrast: { type: Number },
    bcOpen: { type: Boolean },
    bcWindowX: { type: Number },
    bcWindowY: { type: Number },
    hsHue: { type: Number },
    hsSaturation: { type: Number },
    hsLightness: { type: Number },
    hsAlpha: { type: Number },
    hsModel: { type: String },
    hsMode: { type: String },
    hsOpen: { type: Boolean },
    hsWorking: { type: Boolean },
    hsWindowX: { type: Number },
    hsWindowY: { type: Number },
    checkerColorA: { type: String },
    checkerColorB: { type: String },
    defaultFrameDuration: { type: Number },
    durationTargetFrame: { type: Number },
    durationTargetFrames: { type: Array },
    durationTotal: { type: Boolean },
    durationValue: { type: Number },
    animationInput: { type: String },
    animationCreateName: { type: String },
    animationCreateLoop: { type: String },
    animationCreateError: { type: String },
    animationCreateFrames: { type: Array },
    animationDeleteTarget: { type: String },
    animationError: { type: String },
    exportFrame: { type: Number },
    exportTab: { type: String },
    exportFormat: { type: String },
    exportFormats: { type: Array },
    exportQuality: { type: Number },
    exportLossless: { type: Boolean },
    exportAnimation: { type: String },
    exportAnimatedFormat: { type: String },
    exportAnimatedQuality: { type: Number },
    exportAnimatedLossless: { type: Boolean },
    exportSheetLayout: { type: String },
    exportSheetFormat: { type: String },
    exportSheetCount: { type: Number },
    exportSheetAll: { type: Boolean },
    exportSheetQuality: { type: Number },
    exportSheetLossless: { type: Boolean },
    playing: { type: Boolean },
    uiHidden: { type: Boolean },
    matrixHeightPx: { type: Number },
    toastMessage: { type: String },
    updateStatus: { type: String },
    toastDurationSec: { type: Number },
    swatches: { attribute: false },
    recentColors: { attribute: false },
    onionEnabled: { type: Boolean },
    onionPast: { type: Number },
    onionFuture: { type: Number },
    onionTint: { type: Boolean },
    colorSwitchOutOfBlack: { type: Boolean },
    locale: { type: String },
    fitDefaultThreshold: { type: Number },
    storageLossless: { type: Boolean },
    storageQuality: { type: Number },
    storageFormat: { type: String },
    storagePngLevel: { type: Number },
    storageJpegQuality: { type: Number },
    storageProjectFile: { type: String },
    storageTextStorage: { type: String },
    storageSvgStorage: { type: String },
    storageModelLighting: { type: String },
    brushQuality: { type: Number },
    importCleanup: { type: String },
    expandStep: { type: Number },
    maxBrushSize: { type: Number },
    renamingFrame: { type: Number },
    selectedFrames: { type: Array },
    selectedLayers: { type: Array },
    selectedCells: { type: Array },
    contentPickerMode: { type: String },
    contentManagerOpen: { type: Boolean },
    embeddedOpenList: { type: Array },
    embeddedOpenSelected: { type: String },
    embeddedSaveOpen: { type: Boolean },
    embeddedSaveName: { type: String },
    embeddedDialogError: { type: String },
    discoveredFiles: { type: Array },
    contentManagerQuery: { type: String },
    deleteFramesTarget: { type: Array },
    brushSize: { type: Number },
    brushSizeMin: { type: Number },
    brushShape: { type: String },
    brushAngle: { type: Number },
    brushSource: { type: String },
    selectionBrushMode: { type: String },
    presetName: { type: String },
    brushPresetName: { type: String },
    brushTipKind: { type: String },
    drawerFront: { type: Object },
    drawerOpen: { type: String },
    drawerFlyoutPos: { attribute: false },
    colorThreshold: { type: Number },
    colorContiguous: { type: Boolean },
    brushHardness: { type: Number },
    brushSpacing: { type: Number },
    brushFlow: { type: Number },
    pixelSprayDensity: { type: Number },
    brushDither: { type: Boolean },
    brushColorMode: { type: String },
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
    featherRadius: { type: Number },
    growShrinkPx: { type: Number },
    blendMode: { type: String },
    accumulate: { type: Boolean },
    lineWidth: { type: Number },
    lineWidthMin: { type: Number },
    shapeWidth: { type: Number },
    retouchSize: { type: Number },
    shadeMode: { type: String },
    shadeAmount: { type: Number },
    blurMode: { type: String },
    recolorTolerance: { type: Number },
    shapeFilled: { type: Boolean },
    shapeAntialias: { type: Boolean },
    gradientMode: { type: String },
    gradientDither: { type: Boolean },
    lineShape: { type: String },
    lineAntialias: { type: Boolean },
    curveWidth: { type: Number },
    curveWidthMin: { type: Number },
    curveShape: { type: String },
    curveAntialias: { type: Boolean },
  };

  declare tool: GnumarusCanvasTool;
  declare drawerFront: Record<string, GnumarusCanvasTool>;
  declare drawerOpen: string | null;
  /** Viewport position of the open drawer flyout (fixed, escapes toolbar overflow). */
  declare drawerFlyoutPos: { left: number; top: number } | null;
  declare colorThreshold: number;
  declare colorContiguous: boolean;
  declare actionPaletteQuery: string;
  declare actionPaletteIndex: number;
  declare rotText: string;
  declare flipText: string;
  declare colorValue: string;
  declare secondaryColorValue: string;
  declare pickerTarget: string;
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
  declare emptyCellMode: GnumarusEmptyCellMode;
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
  declare collapsedLayers: string[];
  declare dragLayerId: string | null;
  declare dropTargetLayerId: string | null;
  declare contextMenuLayerId: string | null;
  /** Multi-layer targets for the shared layers context menu (null = single). */
  declare contextMenuLayerIds: string[] | null;
  declare contextMenuX: number;
  declare contextMenuY: number;
  declare matrixMenu:
    | { kind: "cell"; layerId: string; frame: number; x: number; y: number }
    | { kind: "cells"; cells: Array<{ layerId: string; frame: number }>; x: number; y: number }
    | { kind: "frame"; frame: number; x: number; y: number }
    | { kind: "frames"; frames: number[]; x: number; y: number }
    | null;
  declare contentPickerTarget: { layerId: string; frame: number } | null;
  declare texturePickerContentId: string | null;
  declare texturePickerTileset: boolean;
  declare tileWindowOpen: boolean;
  declare tileWindowX: number;
  declare tileWindowY: number;
  declare textPickerTarget: { layerId: string; frame: number } | null;
  declare textEditor: {
    layerId: string;
    frame: number;
    contentId: string;
    textId: string;
    beforeHtml: string;
  } | null;
  declare textEditorColor: string;
  declare fitTextureTarget: { kind: "single"; textureId: string } | { kind: "all" } | null;
  declare fitThreshold: number;
  declare adjustBrightness: number;
  declare adjustContrast: number;
  declare adjustPosterize: number;
  declare bcBrightness: number;
  declare bcContrast: number;
  declare bcOpen: boolean;
  declare bcWindowX: number;
  declare bcWindowY: number;
  declare filterMenuOpen: boolean;
  declare filterSubmenu: string | null;
  declare toolsMenuOpen: boolean;
  declare toolsSubmenu: string | null;
  declare filterOpen: boolean;
  declare filterId: string | null;
  declare filterValues: Record<string, number | boolean | string>;
  declare filterWorking: boolean;
  declare filterWindowX: number;
  declare filterWindowY: number;
  declare hsHue: number;
  declare hsSaturation: number;
  declare hsLightness: number;
  declare hsAlpha: number;
  declare hsModel: GnumarusHslAdjustModel;
  declare hsMode: GnumarusHslAdjustMode;
  declare hsOpen: boolean;
  /** True while a hue/saturation preview is being computed. */
  declare hsWorking: boolean;
  declare hsWindowX: number;
  declare hsWindowY: number;
  declare checkerColorA: string;
  declare checkerColorB: string;
  declare defaultFrameDuration: number;
  declare durationTargetFrame: number | null;
  declare durationTargetFrames: number[] | null;
  declare durationTotal: boolean;
  declare durationValue: number | null;
  declare animationInput: string;
  declare animationCreateName: string;
  declare animationCreateLoop: string;
  declare animationCreateError: string | null;
  declare animationCreateFrames: number[] | null;
  declare animationDeleteTarget: string | null;
  declare animationError: string | null;
  declare exportFrame: number;
  declare exportTab: string;
  declare exportFormat: string;
  declare exportFormats: GnumarusStillFormat[];
  declare exportQuality: number;
  declare exportLossless: boolean;
  declare exportAnimation: string;
  declare exportAnimatedFormat: string;
  declare exportAnimatedQuality: number;
  declare exportAnimatedLossless: boolean;
  declare exportSheetLayout: string;
  declare exportSheetFormat: string;
  declare exportSheetCount: number;
  declare exportSheetAll: boolean;
  declare exportSheetQuality: number;
  declare exportSheetLossless: boolean;
  declare playing: boolean;
  declare uiHidden: boolean;
  /** Explicit animation-matrix height in px (null = automatic). */
  declare matrixHeightPx: number | null;
  declare toastMessage: string;
  /** Update-check status (banner shows only when outdated). */
  declare updateStatus: GnumarusUpdateStatus;
  declare toastDurationSec: number;
  declare onionEnabled: boolean;
  declare onionPast: number;
  declare onionFuture: number;
  declare onionTint: boolean;
  declare colorSwitchOutOfBlack: boolean;
  declare swatches: string[];
  declare recentColors: string[];
  declare locale: GnumarusLocaleSetting;
  declare fitDefaultThreshold: number;
  declare storageLossless: boolean;
  declare storageQuality: number;
  declare storageFormat: GnumarusStorageFormat;
  declare storagePngLevel: number;
  declare storageJpegQuality: number;
  declare storageProjectFile: GnumarusProjectFileFormat;
  declare storageTextStorage: GnumarusTextStorage;
  declare storageSvgStorage: GnumarusSvgStorage;
  declare storageModelLighting: GnumarusModelLighting;
  declare brushQuality: number;
  declare importCleanup: GnumarusImportCleanup;
  declare expandStep: number;
  declare maxBrushSize: number;
  declare renamingFrame: number | null;
  declare selectedFrames: number[];
  declare selectedLayers: string[];
  declare selectedCells: Array<{ layerId: string; frame: number }>;
  declare contentPickerMode: "single" | "relink";
  declare contentManagerOpen: boolean;
  declare embeddedOpenList: string[] | null;
  declare embeddedOpenSelected: string;
  declare embeddedSaveOpen: boolean;
  declare embeddedSaveName: string;
  declare embeddedDialogError: string | null;
  declare discoveredFiles: GnumarusDiscoveredContentFile[] | null;
  declare contentManagerQuery: string;
  /** Read-only snapshot behind the content manager dialog. */
  private contentManagerData: GnumarusContentSnapshot | null = null;
  /** Resolved 3D-model vertex counts (absent while decoding). */
  private contentManagerVerts = new Map<string, number | null>();
  /** On-disk byte sizes by texture id (unsaved textures fall back to buffer bytes). */
  private contentManagerDiskSizes = new Map<string, number>();
  /** Cells to relink while the content picker runs in relink mode. */
  private relinkTargets: Array<{ layerId: string; frame: number }> | null = null;
  declare deleteFramesTarget: number[] | null;
  /** Anchor frame for Shift+click range selection (not reactive by itself). */
  private frameAnchor: number | null = null;
  private layerAnchor: string | null = null;
  /** Anchor cell for Shift+click rectangle selection (not reactive by itself). */
  private cellAnchor: { layerId: string; frame: number } | null = null;
  declare brushSize: number;
  declare brushSizeMin: number;
  declare brushShape: GnumarusBrushShape;
  declare brushAngle: number;
  declare brushSource: GnumarusBrushSource;
  declare selectionBrushMode: GnumarusSelectionBrushMode;
  declare presetName: string;
  declare brushPresets: GnumarusBrushPreset[];
  declare brushPresetName: string;
  declare brushTipKind: GnumarusBrushTipKind;
  declare brushHardness: number;
  declare brushSpacing: number;
  declare brushFlow: number;
  declare pixelSprayDensity: number;
  declare brushDither: boolean;
  declare brushColorMode: GnumarusBrushColorMode;
  declare shadeDirection: GnumarusShadeDirection;
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
  declare featherRadius: number;
  declare growShrinkPx: number;
  declare blendMode: GnumarusBlendMode;
  declare accumulate: boolean;
  declare lineWidth: number;
  declare lineWidthMin: number;
  declare shapeWidth: number;
  declare retouchSize: number;
  declare shadeMode: "lighten" | "darken" | "hue";
  declare shadeAmount: number;
  declare blurMode: "blur" | "sharpen";
  declare recolorTolerance: number;
  declare shapeFilled: boolean;
  declare shapeAntialias: boolean;
  declare gradientMode: "linear" | "radial";
  declare gradientDither: boolean;
  declare lineShape: GnumarusBrushShape;
  declare lineAntialias: boolean;
  declare curveWidth: number;
  declare curveWidthMin: number;
  declare curveShape: GnumarusBrushShape;
  declare curveAntialias: boolean;

  private engine: GnumarusCanvasEngine | null = null;
  private directoryHandle: GnumarusDirectoryHandle | null = null;
  /**
   * OPFS embedded project name when `directoryHandle` is an embedded root.
   * Null for native (File System Access) projects and unsaved projects.
   */
  private embeddedProjectName: string | null = null;
  private playTimer: number | null = null;
  private playbackAnimation: GnumarusNamedAnimation | null = null;
  private playbackIndex = 0;
  private playbackDirection: 1 | -1 = 1;
  private toastTimer: number | null = null;

  private actionRegistry = new GnumarusActionRegistry();
  /** Discovered files already imported this session (stay hidden from discovery). */
  private importedDiscoveredFiles = new Set<string>();

  constructor() {
    super();
    this.tool = "pencil";
    this.drawerFront = {
      paint: "pencil",
      selection: "rectselect",
      destructive: "destransform",
      transform: "transform",
      model: "modeltransform",
    };
    this.drawerOpen = null;
    this.drawerFlyoutPos = null;
    this.colorThreshold = 10;
    this.colorContiguous = true;
    this.actionPaletteQuery = "";
    this.actionPaletteIndex = 0;
    this.registerActions();
    this.colorValue = "#000000";
    this.secondaryColorValue = "#ffffff";
    this.pickerTarget = "foreground";
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
    this.emptyCellMode = DEFAULT_EMPTY_CELL_SETTINGS.mode;
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
    this.collapsedLayers = [];
    this.dragLayerId = null;
    this.dropTargetLayerId = null;
    this.contextMenuLayerId = null;
    this.contextMenuX = 0;
    this.contextMenuY = 0;
    this.matrixMenu = null;
    this.contentPickerTarget = null;
    this.texturePickerContentId = null;
    this.texturePickerTileset = false;
    this.textPickerTarget = null;
    this.textEditor = null;
    this.savedTextRange = null;
    this.textEditorColor = "#000000";
    this.tileWindowOpen = false;
    this.tileWindowX = 280;
    this.tileWindowY = 120;
    this.fitTextureTarget = null;
    this.fitThreshold = 0;
    this.adjustBrightness = 0;
    this.adjustContrast = 0;
    this.adjustPosterize = 0;
    this.bcBrightness = 0;
    this.bcContrast = 0;
    this.bcOpen = false;
    this.bcWindowX = 16;
    this.bcWindowY = 16;
    this.filterMenuOpen = false;
    this.filterSubmenu = null;
    this.toolsMenuOpen = false;
    this.toolsSubmenu = null;
    this.filterOpen = false;
    this.filterId = null;
    this.filterValues = {};
    this.filterWorking = false;
    this.filterWindowX = 64;
    this.filterWindowY = 16;
    this.hsHue = 0;
    this.hsSaturation = 0;
    this.hsLightness = 0;
    this.hsAlpha = 0;
    this.hsModel = "hsl";
    this.hsMode = "additive";
    this.hsOpen = false;
    this.hsWorking = false;
    this.hsWindowX = 340;
    this.hsWindowY = 16;
    this.checkerColorA = DEFAULT_CHECKER_SETTINGS.colorA;
    this.checkerColorB = DEFAULT_CHECKER_SETTINGS.colorB;
    this.defaultFrameDuration = DEFAULT_ANIMATION_FRAME_DURATION;
    this.durationTargetFrame = null;
    this.durationTargetFrames = null;
    this.durationTotal = false;
    this.durationValue = null;
    this.animationInput = "";
    this.animationError = null;
    this.animationCreateName = "";
    this.animationCreateLoop = "forward";
    this.animationCreateError = null;
    this.animationCreateFrames = null;
    this.animationDeleteTarget = null;
    this.exportFrame = 1;
    this.exportTab = "frame";
    this.exportFormat = "image/png";
    this.exportFormats = [];
    this.exportQuality = GNUMARUS_DEFAULT_STILL_QUALITY;
    this.exportLossless = true;
    this.exportAnimation = "";
    this.exportAnimatedFormat = "gif";
    this.exportAnimatedQuality = GNUMARUS_DEFAULT_STILL_QUALITY;
    this.exportAnimatedLossless = true;
    this.exportSheetLayout = "line";
    this.exportSheetFormat = "image/png";
    this.exportSheetCount = 2;
    this.exportSheetAll = false;
    this.exportSheetQuality = GNUMARUS_DEFAULT_STILL_QUALITY;
    this.exportSheetLossless = true;
    this.playing = false;
    this.playTimer = null;
    this.uiHidden = false;
    this.matrixHeightPx = null;
    this.toastMessage = "";
    this.updateStatus = "unknown";
    this.toastDurationSec = DEFAULT_TOAST_SETTINGS.durationSec;
    this.onionEnabled = DEFAULT_ONION_SETTINGS.enabled;
    this.onionPast = DEFAULT_ONION_SETTINGS.past;
    this.onionFuture = DEFAULT_ONION_SETTINGS.future;
    this.onionTint = DEFAULT_ONION_SETTINGS.tint;
    this.colorSwitchOutOfBlack = DEFAULT_BLACK_SWITCH_SETTINGS.switchOutOfBlack;
    this.swatches = [];
    this.recentColors = [];
    this.locale = DEFAULT_LOCALE_SETTINGS.locale;
    this.fitDefaultThreshold = DEFAULT_FIT_SETTINGS.alphaThreshold;
    this.storageLossless = DEFAULT_STORAGE_SETTINGS.lossless;
    this.storageQuality = DEFAULT_STORAGE_SETTINGS.quality;
    this.storageFormat = DEFAULT_STORAGE_SETTINGS.format;
    this.storagePngLevel = DEFAULT_STORAGE_SETTINGS.pngLevel;
    this.storageJpegQuality = DEFAULT_STORAGE_SETTINGS.jpgQuality;
    this.storageProjectFile = DEFAULT_STORAGE_SETTINGS.projectFile;
    this.storageTextStorage = DEFAULT_STORAGE_SETTINGS.textStorage;
    this.storageSvgStorage = DEFAULT_STORAGE_SETTINGS.svgStorage;
    this.storageModelLighting = DEFAULT_STORAGE_SETTINGS.modelLighting;
    this.brushQuality = DEFAULT_STORAGE_SETTINGS.brushQuality;
    this.importCleanup = DEFAULT_IMPORT_CLEANUP;
    this.expandStep = DEFAULT_EXPAND_SETTINGS.step;
    this.renamingFrame = null;
    this.selectedFrames = [];
    this.selectedLayers = [];
    this.selectedCells = [];
    this.contentPickerMode = "single";
    this.contentManagerOpen = false;
    this.embeddedOpenList = null;
    this.embeddedOpenSelected = "";
    this.embeddedSaveOpen = false;
    this.embeddedSaveName = "";
    this.embeddedDialogError = null;
    this.discoveredFiles = null;
    this.contentManagerQuery = "";
    this.layerAnchor = null;
    this.contextMenuLayerIds = null;
    this.deleteFramesTarget = null;
    this.frameAnchor = null;
    this.cellAnchor = null;
    this.brushSize = 1;
    this.brushSizeMin = 1;
    this.maxBrushSize = DEFAULT_BRUSH_SETTINGS.maxBrushSize;
    this.brushShape = "circle";
    this.brushAngle = 0;
    this.brushSource = "tip";
    this.selectionBrushMode = "stamp";
    this.presetName = "";
    this.brushPresetName = BUILT_IN_BRUSH_PRESETS[0]?.name ?? "Pixel Hard";
    this.brushPresets = [];
    this.brushTipKind = "pixel";
    this.brushHardness = DEFAULT_BRUSH_HARDNESS;
    this.brushSpacing = DEFAULT_BRUSH_SPACING;
    this.brushFlow = DEFAULT_BRUSH_FLOW;
    this.pixelSprayDensity = 1;
    this.brushDither = false;
    this.brushColorMode = "solid";
    this.shadeDirection = "forward";
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
    this.featherRadius = 0;
    this.growShrinkPx = 1;
    this.blendMode = "normal";
    this.accumulate = true;
    this.lineWidth = 1;
    this.shapeWidth = 1;
    this.retouchSize = 8;
    this.shadeMode = "lighten";
    this.shadeAmount = 0.2;
    this.blurMode = "blur";
    this.recolorTolerance = 30;
    this.shapeFilled = false;
    this.shapeAntialias = false;
    this.gradientMode = "linear";
    this.gradientDither = false;
    this.lineWidthMin = 1;
    this.lineShape = "circle";
    this.lineAntialias = false;
    this.curveWidth = 1;
    this.curveWidthMin = 1;
    this.curveShape = "circle";
    this.curveAntialias = false;
  }

  render() {
    return html`
      <input
        type="file"
        id="gppUpload"
        accept=".gpp,.zip,application/zip"
        hidden
        @change=${(): void => {
          void this.onGppUploadChanged();
        }}
      />
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
                  <button title=${tr("menu.newProjectTitle")} @click=${(): void => void this.runAction("new-project")}>${tr("menu.newProject")}</button>
                  ${this.fsSupported
                    ? html`
                        <button title=${tr("menu.openProjectTitle")} @click=${(): void => void this.runAction("open-project")}>${tr("menu.openProject")}</button>
                        <button title=${tr("menu.saveTitle")} @click=${(): void => void this.runAction("save-project")}>${tr("menu.saveProject")}</button>
                        <button title=${tr("menu.saveProjectAsTitle")} @click=${(): void => void this.runAction("save-project-as")}>${tr("menu.saveProjectAs")}</button>
                      `
                    : html`
                        <button title=${tr("menu.uploadProjectTitle")} @click=${(): void => void this.runAction("upload-project")}>${tr("menu.uploadProject")}</button>
                        <button title=${tr("menu.openEmbeddedTitle")} @click=${(): void => void this.runAction("open-embedded-project")}>${tr("menu.openEmbeddedProject")}</button>
                        <button title=${tr("menu.saveEmbeddedTitle")} @click=${(): void => void this.runAction("save-embedded-project")}>${tr("menu.saveEmbeddedProject")}</button>
                        <button title=${tr("menu.saveEmbeddedAsTitle")} @click=${(): void => void this.runAction("save-embedded-project-as")}>${tr("menu.saveEmbeddedProjectAs")}</button>
                      `}
                  <button title=${tr("menu.importTitle")} @click=${(): void => void this.runAction("import")}>${tr("menu.import")}</button>
                  <button title=${tr("menu.importSvgTitle")} @click=${(): void => void this.runAction("import-svg")}>${tr("menu.importSvg")}</button>
                  <button title=${tr("menu.importModel3dTitle")} @click=${(): void => void this.runAction("import-3d-model")}>${tr("menu.importModel3d")}</button>
                  <button title=${tr("menu.importImageTitle")} @click=${(): void => void this.runAction("import-image")}>${tr("menu.importImage")}</button>
                  <button title=${tr("menu.contentManagerTitle")} @click=${(): void => void this.runAction("content-manager")}>${tr("menu.contentManager")}</button>
                  <button title=${tr("menu.exportTitle")} @click=${(): void => void this.runAction("export")}>${tr("menu.export")}</button>
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
                  <button title=${tr("menu.undoTitle")} ?disabled=${!this.canUndo} @click=${(): void => void this.runAction("undo")}>${tr("menu.undo")}</button>
                  <button title=${tr("menu.redoTitle")} ?disabled=${!this.canRedo} @click=${(): void => void this.runAction("redo")}>${tr("menu.redo")}</button>
                  <button title=${tr("menu.cutTitle")} @click=${(): void => void this.runAction("cut")}>${tr("menu.cut")}</button>
                  <button title=${tr("menu.copySelectionTitle")} @click=${(): void => void this.runAction("copy-selection")}>${tr("menu.copySelection")}</button>
                  <button title=${tr("menu.copyMergedTitle")} @click=${(): void => void this.runAction("copy-merged")}>${tr("menu.copyMerged")}</button>
                  <button title=${tr("menu.pasteTitle")} @click=${(): void => void this.runAction("paste")}>${tr("menu.paste")}</button>
        <button title=${tr("menu.createBrushFromSelectionTitle")} @click=${(): void => void this.runAction("create-brush-from-selection")}>${tr("menu.createBrushFromSelection")}</button>
                  <button title=${tr("menu.settingsTitle")} @click=${(): void => void this.runAction("settings")}>${tr("menu.settings")}</button>
                  <button title=${tr("menu.adjustBrightnessContrastTitle")} @click=${(): void => void this.runAction("adjust-brightness-contrast")}>${tr("menu.adjustBrightnessContrast")}</button>
                  <button title=${tr("menu.adjustHueSaturationTitle")} @click=${(): void => void this.runAction("adjust-hue-saturation")}>${tr("menu.adjustHueSaturation")}</button>
                  <button
                    title=${tr("menu.resetCanvasTransformTitle")}
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
            class=${this.toolsMenuOpen ? "active" : ""}
            @click=${(): void => this.toggleMenu("tools")}
            @mouseenter=${(): void => this.hoverMenu("tools")}
          >
            ${tr("menu.tools")}
          </button>
          ${this.toolsMenuOpen
            ? html`
                <div class="dropdown">
                  ${this.standaloneTools().map(
                    (tool) => html`
                      <button title=${this.toolMenuHint(tool)} @click=${(): void => this.activateToolFromMenu(tool)}>
                        ${this.toolMenuLabel(tool)}
                      </button>
                    `,
                  )}
                  ${GNUMARUS_TOOL_DRAWERS.map(
                    (drawer) => html`
                      <div
                        class="submenu-row"
                        @mouseenter=${(): void => {
                          this.toolsSubmenu = drawer.id;
                        }}
                      >
                        <button
                          title=${tr(`tool.drawer.${drawer.id}Hint` as GnumarusMessageKey)}
                          @click=${(): void => {
                            this.toolsSubmenu = this.toolsSubmenu === drawer.id ? null : drawer.id;
                          }}
                        >
                          ${tr(`tool.drawer.${drawer.id}` as GnumarusMessageKey)}<span class="submenu-arrow">▸</span>
                        </button>
                        ${this.toolsSubmenu === drawer.id
                          ? html`
                              <div class="submenu-flyout">
                                ${drawer.tools.map(
                                  (tool) => html`
                                    <button
                                      title=${this.drawerToolHint(tool)}
                                      @click=${(): void => this.activateToolFromMenu(tool)}
                                    >
                                      ${this.drawerToolLabel(tool)}
                                    </button>
                                  `,
                                )}
                              </div>
                            `
                          : html``}
                      </div>
                    `,
                  )}
                </div>
              `
            : html``}
        </div>
        <div class="menu">
          <button
            class=${this.filterMenuOpen ? "active" : ""}
            @click=${(): void => this.toggleMenu("filters")}
            @mouseenter=${(): void => this.hoverMenu("filters")}
          >
            ${tr("menu.filters")}
          </button>
          ${this.filterMenuOpen
            ? html`
                <div class="dropdown">
                  ${this.filterThemes().map(
                    (theme) => html`
                      <div
                        class="submenu-row"
                        @mouseenter=${(): void => {
                          this.filterSubmenu = theme.id;
                        }}
                      >
                        <button
                          title=${theme.hint}
                          @click=${(): void => {
                            this.filterSubmenu = this.filterSubmenu === theme.id ? null : theme.id;
                          }}
                        >
                          ${theme.label}<span class="submenu-arrow">▸</span>
                        </button>
                        ${this.filterSubmenu === theme.id
                          ? html`
                              <div class="submenu-flyout">
                                ${theme.filters.map(
                                  (filter) => html`
                                    <button
                                      title=${tr(("filter." + filter.id + "Hint") as GnumarusMessageKey)}
                                      @click=${(): void => {
                                        void this.openFilterDialog(filter.id);
                                      }}
                                    >
                                      ${tr(("filter." + filter.id) as GnumarusMessageKey)}
                                    </button>
                                  `,
                                )}
                              </div>
                            `
                          : html``}
                      </div>
                    `,
                  )}
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
                  <button title=${tr("menu.manualTitle")} @click=${(): void => void this.runAction("manual")}>${tr("menu.manual")}</button>
                  <button title=${tr("menu.shortcutsTitle")} @click=${(): void => void this.runAction("shortcuts")}>${tr("menu.shortcuts")}</button>
                  <button title=${tr("menu.sourceCodeTitle")} @click=${(): void => void this.runAction("source-code")}>${tr("menu.sourceCode")}</button>
                  ${!this.isGitHubPagesDeploy()
                    ? html`<button
                        title=${tr("menu.githubPagesDeployTitle")}
                        @click=${(): void => void this.runAction("github-pages-deploy")}
                      >${tr("menu.githubPagesDeploy")}</button>`
                    : html``}
                </div>
              `
            : html``}
        </div>
        ${this.updateStatus === "outdated"
          ? html`<button
              class="update-banner"
              data-testid="update-banner"
              title=${tr("update.availableTitle")}
              @click=${(): void => this.reloadForUpdate()}
            >
              ${tr("update.available")}
            </button>`
          : html``}
        <span class="app-title">Gnumaru's Painting and Animation App${this.dirty ? tr("app.modified") : ""}</span>
      </div>
      ${this.renderEditorOptions()}
      ${this.renderToolOptions()}
      <div class="body">
        <div
          class="toolbar"
          ?hidden=${this.uiHidden}
          @scroll=${(): void => {
            if (this.drawerOpen !== null) {
              this.closeDrawerFlyout();
            }
          }}
        >
          ${this.renderToolDrawer("paint")}
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
            class=${this.tool === "text" ? "active" : ""}
            title=${tr("tool.textHint")}
            aria-label=${tr("tool.text")}
            data-testid="tool-text"
            @click=${(): void => {
              this.tool = "text";
              this.engine?.setTool("text");
            }}
          >
            <span class="tool-icon tool-text-glyph" aria-hidden="true">T</span>
          </button>
          <button
            class=${this.tool === "tilebrush" ? "active" : ""}
            title=${tr("tool.tilebrushHint")}
            aria-label=${tr("tool.tilebrush")}
            data-testid="tool-tilebrush"
            @click=${(): void => {
              this.tool = "tilebrush";
              this.engine?.setTool("tilebrush");
            }}
          >
            <span class="tool-icon" aria-hidden="true">▦</span>
          </button>
          ${this.renderToolDrawer("shape")}
          ${this.renderToolDrawer("retouch")}
          ${this.renderToolDrawer("model")}

          ${this.renderToolDrawer("selection")}
          ${this.renderToolDrawer("destructive")}
          ${this.renderToolDrawer("transform")}
          <gnumarus-color-picker
            id="pencilColor"
            hideSwatch
            .switchOutOfBlack=${this.colorSwitchOutOfBlack}
            .value=${this.pickerTarget === "background" ? this.secondaryColorValue : this.colorValue}
            .swatches=${this.swatches}
            .recents=${this.recentColors}
            model="hsl"
            @gnumarus-color-change=${(event: Event): void => {
              const detail = (event as CustomEvent<{ value?: unknown }>).detail;
              if (typeof detail?.value !== "string") {
                return;
              }
              const parsed = parseHexToRgbaBytes(detail.value);
              if (parsed === null) {
                return;
              }
              if (this.pickerTarget === "background") {
                this.secondaryColorValue = rgbaBytesToHex(parsed);
                return;
              }
              this.colorValue = rgbaBytesToHex(parsed);
              this.engine?.setColor(this.colorValue);
            }}
            @gnumarus-color-commit=${(event: Event): void => {
              const detail = (event as CustomEvent<{ value?: unknown }>).detail;
              if (typeof detail?.value === "string") {
                this.pushRecentColor(detail.value);
              }
            }}
            @gnumarus-palette-change=${(event: Event): void => {
              const detail = (event as CustomEvent<{ hexes?: unknown }>).detail;
              if (!Array.isArray(detail?.hexes)) {
                return;
              }
              if (this.brushColorMode !== "palette") {
                return;
              }
              this.refreshShadingPalette();
            }}
            @gnumarus-swatches-edit=${(event: Event): void => {
              const detail = (event as CustomEvent<{ kind?: unknown; hex?: unknown }>).detail;
              if (detail?.kind === "add") {
                this.addSwatch(
                  this.pickerTarget === "background" ? this.secondaryColorValue : this.colorValue,
                );
              } else if (detail?.kind === "remove" && typeof detail.hex === "string") {
                this.removeSwatch(detail.hex);
              }
            }}
          >
            ${this.tool === "pencil"
              ? html`<div slot="side-panel">
                  <div class="tool-options brush-side-panel" data-testid="brush-side-panel">
                    ${this.renderBrushPresetRow("Panel")}
                    ${this.renderPencilBrushOptions("Panel")}
                  </div>
                </div>`
              : html``}
          </gnumarus-color-picker>
          <div class="paint-wells" title=${tr("color.wellsHint")}>
            <button
              class="paint-well paint-well-back"
              data-testid="bg-well"
              style="background-color: ${this.secondaryColorValue};"
              aria-label=${tr("color.background")}
              title=${tr("color.editBackground")}
              @click=${(event: Event): void => {
                const anchor = event.currentTarget as HTMLElement | null;
                if (anchor !== null) {
                  this.openWellPicker("background", anchor);
                }
              }}
            ></button>
            <button
              class="paint-well paint-well-front"
              data-testid="fg-well"
              style="background-color: ${this.colorValue};"
              aria-label=${tr("color.foreground")}
              title=${tr("color.editForeground")}
              @click=${(event: Event): void => {
                const anchor = event.currentTarget as HTMLElement | null;
                if (anchor !== null) {
                  this.openWellPicker("foreground", anchor);
                }
              }}
            ></button>
            <button
              class="paint-swap"
              data-testid="swap-colors"
              aria-label=${tr("color.swap")}
              title=${tr("color.swapHint")}
              @click=${(): void => this.swapPaintColors()}
              >⇄</button
            >
          </div>
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
                    <input
                      type="number"
                      id="previewZoomInput"
                      data-testid="preview-zoom-input"
                      min="1"
                      max="6400"
                      step="1"
                      aria-label=${tr("preview.zoomAria")}
                      .value=${String(Math.round(this.previewZoom * 100))}
                      @change=${(): void => this.applyPreviewZoomInput()}
                    />
                    <button aria-label=${tr("preview.zoomIn")} title=${tr("preview.zoomIn")} @click=${(): void => this.zoomPreview(2)}>
                      +
                    </button>
                    <button aria-label=${tr("preview.resetZoom")} title=${tr("preview.resetZoom")} @click=${(): void => this.resetPreviewZoom()}>
                      1:1
                    </button>
                    <button aria-label=${tr("preview.fit")} title=${tr("preview.fitTitle")} @click=${(): void => this.fitPreviewZoom()}>
                      ${tr("preview.fit")}
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
          ${this.bcOpen
            ? html`
              <div
                class="preview-window adjust-window"
                style="left: ${this.bcWindowX}px; top: ${this.bcWindowY}px;"
                data-testid="bc-window"
                @keydown=${(event: KeyboardEvent): void => {
                  if (event.key === "Escape") {
                    event.stopPropagation();
                    this.cancelBrightnessContrast();
                  }
                }}
              >
                <div class="preview-header" @pointerdown=${(event: PointerEvent): void => this.onAdjustWindowDragStart(event, "bc")}>
                  <span>${tr("dialog.bcTitle")}</span>
                  <span class="spacer"></span>
                  <button aria-label=${tr("btn.close")} title=${tr("btn.close")} @click=${(): void => this.cancelBrightnessContrast()}>
                    ×
                  </button>
                </div>
                <div class="adjust-body">
                  <p>${tr("dialog.bcHint")}</p>
                  <label
                    ><span class="adjust-name">${tr("dialog.brightness")}</span>
                    <input
                      type="range"
                      id="bcBrightness"
                      min="-100"
                      max="100"
                      step="1"
                      .value=${String(this.bcBrightness)}
                      @input=${(event: Event): void => {
                        const target = event.target as HTMLInputElement | null;
                        if (target !== null) {
                          this.bcBrightness = Math.min(100, Math.max(-100, Math.round(Number(target.value) || 0)));
                        }
                      }}
                      @change=${(): void => this.previewBrightnessContrast()}
                    />
                    <input
                      type="number"
                      id="bcBrightnessNum"
                      min="-100"
                      max="100"
                      step="1"
                      .value=${String(this.bcBrightness)}
                      @input=${(event: Event): void => {
                        const target = event.target as HTMLInputElement | null;
                        if (target !== null && /^-?\d+$/.test(target.value)) {
                          this.bcBrightness = Math.min(100, Math.max(-100, parseInt(target.value, 10)));
                        }
                      }}
                      @change=${(): void => this.previewBrightnessContrast()}
                    />
                  </label>
                  <label
                    ><span class="adjust-name">${tr("dialog.contrast")}</span>
                    <input
                      type="range"
                      id="bcContrast"
                      min="-100"
                      max="100"
                      step="1"
                      .value=${String(this.bcContrast)}
                      @input=${(event: Event): void => {
                        const target = event.target as HTMLInputElement | null;
                        if (target !== null) {
                          this.bcContrast = Math.min(100, Math.max(-100, Math.round(Number(target.value) || 0)));
                        }
                      }}
                      @change=${(): void => this.previewBrightnessContrast()}
                    />
                    <input
                      type="number"
                      id="bcContrastNum"
                      min="-100"
                      max="100"
                      step="1"
                      .value=${String(this.bcContrast)}
                      @input=${(event: Event): void => {
                        const target = event.target as HTMLInputElement | null;
                        if (target !== null && /^-?\d+$/.test(target.value)) {
                          this.bcContrast = Math.min(100, Math.max(-100, parseInt(target.value, 10)));
                        }
                      }}
                      @change=${(): void => this.previewBrightnessContrast()}
                    />
                  </label>
                  <div class="dialog-actions">
                    <button @click=${(): void => this.cancelBrightnessContrast()}>${tr("btn.cancel")}</button>
                    <button id="brightnessContrastApply" @click=${(): void => this.applyBrightnessContrast()}>${tr("btn.apply")}</button>
                    <button id="brightnessContrastOk" @click=${(): void => this.confirmBrightnessContrast()}>${tr("btn.ok")}</button>
                  </div>
                </div>
              </div>
            `
            : html``}
          ${this.hsOpen
            ? html`
              <div
                class="preview-window adjust-window"
                style="left: ${this.hsWindowX}px; top: ${this.hsWindowY}px;"
                data-testid="hs-window"
                @keydown=${(event: KeyboardEvent): void => {
                  if (event.key === "Escape") {
                    event.stopPropagation();
                    void this.cancelHslAdjust();
                  }
                }}
              >
                <div class="preview-header" @pointerdown=${(event: PointerEvent): void => this.onAdjustWindowDragStart(event, "hs")}>
                  <span>${tr("dialog.hsTitle")}</span>
                  <span class="spacer"></span>
                  <button aria-label=${tr("btn.close")} title=${tr("btn.close")} @click=${(): void => {
                    void this.cancelHslAdjust();
                  }}>
                    ×
                  </button>
                </div>
                <div class="adjust-body">
                  <p>${tr("dialog.hsHint")}</p>
                  <div class="adjust-spinner" data-testid="hs-spinner" ?hidden=${!this.hsWorking}>
                    <span class="adjust-spinner-ring" aria-hidden="true"></span>
                    <span>${tr("dialog.hsWorking")}</span>
                  </div>
            <label
              >${tr("dialog.hsModel")}
              <select
                id="hsModel"
                .value=${this.hsModel}
                @change=${(event: Event): void => {
                  const target = event.target as HTMLSelectElement | null;
                  if (target !== null) {
                    this.hsModel = parseHslAdjustModel(target.value);
                    this.previewHslAdjust();
                  }
                }}
              >
                <option value="hsl">${tr("dialog.hslTraditional")}</option>
                <option value="okhsl">${tr("dialog.okhsl")}</option>
              </select>
            </label>
            <label
              >${tr("dialog.hsMode")}
              <select
                id="hsMode"
                .value=${this.hsMode}
                @change=${(event: Event): void => {
                  const target = event.target as HTMLSelectElement | null;
                  if (target !== null) {
                    this.hsMode = parseHslAdjustMode(target.value);
                    this.previewHslAdjust();
                  }
                }}
              >
                <option value="additive">${tr("dialog.modeAdditive")}</option>
                <option value="proportional">${tr("dialog.modeProportional")}</option>
              </select>
            </label>
            <label
              ><span class="adjust-name">${tr("color.hue")}</span>
              <input
                type="range"
                id="hsHue"
                min="-180"
                max="180"
                step="1"
                .value=${String(this.hsHue)}
                @input=${(event: Event): void => {
                  const target = event.target as HTMLInputElement | null;
                  if (target !== null) {
                    this.hsHue = Math.min(180, Math.max(-180, Math.round(Number(target.value) || 0)));
                  }
                }}
                @change=${(): void => this.previewHslAdjust()}
              />
              <input
                type="number"
                id="hsHueNum"
                min="-180"
                max="180"
                step="1"
                .value=${String(this.hsHue)}
                @input=${(event: Event): void => {
                  const target = event.target as HTMLInputElement | null;
                  if (target !== null && /^-?\d+$/.test(target.value)) {
                    this.hsHue = Math.min(180, Math.max(-180, parseInt(target.value, 10)));
                  }
                }}
                @change=${(): void => this.previewHslAdjust()}
              />
            </label>
            <label
              ><span class="adjust-name">${tr("color.saturation")}</span>
              <input
                type="range"
                id="hsSaturation"
                min="-100"
                max="100"
                step="1"
                .value=${String(this.hsSaturation)}
                @input=${(event: Event): void => {
                  const target = event.target as HTMLInputElement | null;
                  if (target !== null) {
                    this.hsSaturation = Math.min(100, Math.max(-100, Math.round(Number(target.value) || 0)));
                  }
                }}
                @change=${(): void => this.previewHslAdjust()}
              />
              <input
                type="number"
                id="hsSaturationNum"
                min="-100"
                max="100"
                step="1"
                .value=${String(this.hsSaturation)}
                @input=${(event: Event): void => {
                  const target = event.target as HTMLInputElement | null;
                  if (target !== null && /^-?\d+$/.test(target.value)) {
                    this.hsSaturation = Math.min(100, Math.max(-100, parseInt(target.value, 10)));
                  }
                }}
                @change=${(): void => this.previewHslAdjust()}
              />
            </label>
            <label
              ><span class="adjust-name">${tr("color.lightness")}</span>
              <input
                type="range"
                id="hsLightness"
                min="-100"
                max="100"
                step="1"
                .value=${String(this.hsLightness)}
                @input=${(event: Event): void => {
                  const target = event.target as HTMLInputElement | null;
                  if (target !== null) {
                    this.hsLightness = Math.min(100, Math.max(-100, Math.round(Number(target.value) || 0)));
                  }
                }}
                @change=${(): void => this.previewHslAdjust()}
              />
              <input
                type="number"
                id="hsLightnessNum"
                min="-100"
                max="100"
                step="1"
                .value=${String(this.hsLightness)}
                @input=${(event: Event): void => {
                  const target = event.target as HTMLInputElement | null;
                  if (target !== null && /^-?\d+$/.test(target.value)) {
                    this.hsLightness = Math.min(100, Math.max(-100, parseInt(target.value, 10)));
                  }
                }}
                @change=${(): void => this.previewHslAdjust()}
              />
            </label>
            <label
              ><span class="adjust-name">${tr("color.alpha")}</span>
              <input
                type="range"
                id="hsAlpha"
                min="-100"
                max="100"
                step="1"
                .value=${String(this.hsAlpha)}
                @input=${(event: Event): void => {
                  const target = event.target as HTMLInputElement | null;
                  if (target !== null) {
                    this.hsAlpha = Math.min(100, Math.max(-100, Math.round(Number(target.value) || 0)));
                  }
                }}
                @change=${(): void => this.previewHslAdjust()}
              />
              <input
                type="number"
                id="hsAlphaNum"
                min="-100"
                max="100"
                step="1"
                .value=${String(this.hsAlpha)}
                @input=${(event: Event): void => {
                  const target = event.target as HTMLInputElement | null;
                  if (target !== null && /^-?\d+$/.test(target.value)) {
                    this.hsAlpha = Math.min(100, Math.max(-100, parseInt(target.value, 10)));
                  }
                }}
                @change=${(): void => this.previewHslAdjust()}
              />
            </label>
                  <div class="dialog-actions">
                    <button @click=${(): void => {
                      void this.cancelHslAdjust();
                    }}>${tr("btn.cancel")}</button>
                    <button id="hueSaturationApply" @click=${(): void => {
                      void this.applyHslAdjust();
                    }}>${tr("btn.apply")}</button>
                    <button id="hueSaturationOk" @click=${(): void => {
                      void this.confirmHslAdjust();
                    }}>${tr("btn.ok")}</button>
                  </div>
                </div>
              </div>
            `
            : html``}
          ${this.filterOpen && this.filterDef() !== null
            ? html`
              <div
                class="preview-window adjust-window"
                style="left: ${this.filterWindowX}px; top: ${this.filterWindowY}px;"
                data-testid="filter-window"
                @keydown=${(event: KeyboardEvent): void => {
                  if (event.key === "Escape") {
                    event.stopPropagation();
                    this.cancelFilterDialog();
                  }
                }}
              >
                <div class="preview-header" @pointerdown=${(event: PointerEvent): void => this.onAdjustWindowDragStart(event, "filter")}>
                  <span>${tr(("filter." + (this.filterId ?? "")) as GnumarusMessageKey)}</span>
                  <span class="spacer"></span>
                  <button aria-label=${tr("btn.close")} title=${tr("btn.close")} @click=${(): void => {
                    this.cancelFilterDialog();
                  }}>
                    ×
                  </button>
                </div>
                <div class="adjust-body">
                  <p>${tr(("filter." + (this.filterId ?? "") + "Hint") as GnumarusMessageKey)}</p>
                  <div class="adjust-spinner" data-testid="filter-spinner" ?hidden=${!this.filterWorking}>
                    <span class="adjust-spinner-ring" aria-hidden="true"></span>
                  </div>
                  ${this.filterDef()?.params.map((param) => this.renderFilterParam(param)) ?? html``}
                  <div class="dialog-actions">
                    <button @click=${(): void => {
                      this.cancelFilterDialog();
                    }}>${tr("btn.cancel")}</button>
                    <button id="filterApply" @click=${(): void => {
                      void this.applyFilter();
                    }}>${tr("btn.apply")}</button>
                    <button id="filterOk" @click=${(): void => {
                      void this.confirmFilter();
                    }}>${tr("btn.ok")}</button>
                  </div>
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
            ${[...this.layers]
              .reverse()
              .filter((row) => !this.isLayerRowHidden(row.id))
              .map((layer, displayIndex, displayLayers) => {
              const depth = this.layerDepthOf(layer.id);
              const collapsed = this.collapsedLayerSet().has(layer.id);
              const expandable = this.hasLayerChildren(layer.id);
              const siblings = displayLayers.filter(
                (entry) => (entry.parentId ?? null) === (layer.parentId ?? null),
              );
              const siblingPos = siblings.findIndex((entry) => entry.id === layer.id);
              const moveUpDisabled = siblingPos <= 0;
              const moveDownDisabled = siblingPos < 0 || siblingPos >= siblings.length - 1;
              void displayIndex;
              return html`
                <div
                  class="layer-row ${layer.id === this.activeLayerId ? "active" : ""} ${this.selectedLayerSet().has(layer.id) ? "selected" : ""} ${this.dropTargetLayerId === layer.id ? "drop-target" : ""}"
                  data-layer-id=${layer.id}
                  data-depth=${depth}
                  data-parent-id=${layer.parentId ?? ""}
                  data-mask=${layer.isMask}
                  style="margin-left:${depth * 8}px"
                  draggable="true"
                  @click=${(event: MouseEvent): void => this.onSelectLayerClick(layer.id, event.shiftKey, event.ctrlKey || event.metaKey)}
                  @contextmenu=${(event: MouseEvent): void => {
                    event.preventDefault();
                    this.openLayerMenu(layer.id, event.clientX, event.clientY);
                  }}
                  @dragstart=${(event: DragEvent): void => this.onLayerDragStart(event, layer.id)}
                  @dragover=${(event: DragEvent): void => this.onLayerDragOver(event, layer.id)}
                  @dragleave=${(): void => this.onLayerDragLeave(layer.id)}
                  @drop=${(event: DragEvent): void => this.onLayerDrop(event, layer.id)}
                  @dragend=${(): void => this.onLayerDragEnd()}
                >
                  <div class="layer-top">
                    ${expandable
                      ? html`
                          <button
                            aria-label=${collapsed ? tr("layer.expandChildren") : tr("layer.collapseChildren")}
                            title=${collapsed ? tr("layer.expandChildren") : tr("layer.collapseChildren")}
                            aria-expanded=${collapsed ? "false" : "true"}
                            data-testid="layer-collapse"
                            data-collapse-for=${layer.id}
                            @click=${(event: Event): void => {
                              event.stopPropagation();
                              this.toggleCollapsedLayer(layer.id);
                            }}
                          >
                            ${collapsed ? "▸" : "▾"}
                          </button>
                        `
                      : html``}
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
                          ${layer.isMask
                            ? html`<span class="layer-mask-badge">${tr("layer.maskBadge")}</span>`
                            : html``}
                        `}
                    <button
                      aria-label=${tr("layer.moveUp")}
                      title=${tr("layer.moveUpTitle")}
                      ?disabled=${moveUpDisabled}
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
                      ?disabled=${moveDownDisabled}
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
                  <div class="layer-blend">
                    <select
                      name="layerBlendMode"
                      aria-label=${tr("layer.blendMode")}
                      title=${tr("layer.blendModeHint")}
                      .value=${layer.blend}
                      @change=${(event: Event): void => {
                        const target = event.target as HTMLSelectElement | null;
                        if (target !== null) {
                          this.onBlendInput(layer.id, target.value);
                        }
                      }}
                    >
                      <option value="normal">${tr("blend.normal")}</option>
                      <option value="multiply">${tr("blend.multiply")}</option>
                      <option value="screen">${tr("blend.screen")}</option>
                      <option value="darken">${tr("blend.darken")}</option>
                      <option value="lighten">${tr("blend.lighten")}</option>
                      <option value="add">${tr("blend.add")}</option>
                    </select>
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
              `;
            })}
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
                ${this.contextMenuLayerIds !== null && this.contextMenuLayerIds.length > 1
                  ? html`
                      <button
                        @click=${(): void => {
                          if (this.contextMenuLayerIds !== null) {
                            this.onDeleteLayers([...this.contextMenuLayerIds]);
                          }
                        }}
                      >
                        ${tr("ctx.deleteLayers", { count: this.contextMenuLayerIds.length })}
                      </button>
                    `
                  : html`
                      <button @click=${(): void => this.onRenameLayerFromMenu()}>
                        ${tr("matrix.renameLayer")}
                      </button>
                      <button
                        ?disabled=${this.layers.length <= 1}
                        @click=${(): void => {
                          if (this.contextMenuLayerId !== null) {
                            this.onDeleteLayer(this.contextMenuLayerId);
                          }
                        }}
                      >
                        ${tr("ctx.deleteLayer")}
                      </button>
                      <button
                        ?disabled=${this.isMergeDownDisabled(this.contextMenuLayerId)}
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
                        ?disabled=${this.contextMenuLayerId === null ||
                        (this.layers.find((entry) => entry.id === this.contextMenuLayerId)?.parentId ?? null) ===
                          null}
                        @click=${(): void => {
                          if (this.contextMenuLayerId !== null) {
                            this.onMakeRootLayer(this.contextMenuLayerId);
                          }
                        }}
                      >
                        ${tr("ctx.makeRoot")}
                      </button>
                      <button
                        @click=${(): void => {
                          if (this.contextMenuLayerId !== null) {
                            this.onToggleLayerMask(this.contextMenuLayerId);
                          }
                        }}
                      >
                        ${(this.layers.find((entry) => entry.id === this.contextMenuLayerId)?.isMask ?? false)
                          ? tr("ctx.convertToNormal")
                          : tr("ctx.convertToMask")}
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
                        this.engine?.getCellTextureId(this.contextMenuLayerId, this.engine.getCurrentFrame()) ===
                          null}
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
                        this.engine?.getCellTextureId(this.contextMenuLayerId, this.engine.getCurrentFrame()) ===
                          null}
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
                        this.engine?.getCellTextureId(this.contextMenuLayerId, this.engine.getCurrentFrame()) ===
                          null}
                        @click=${(): void => {
                          if (this.contextMenuLayerId !== null) {
                            this.onResizeCellToCanvasFromLayer(this.contextMenuLayerId);
                          }
                        }}
                      >
                        ${tr("ctx.resizeCanvas")}
                      </button>
                    `}
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
        <label>${tr("dialog.width")} <input type="number" id="resizeWidth" min="1" max="4096" .value=${String(this.resizeWidth)} /></label>
        <label>${tr("dialog.height")} <input type="number" id="resizeHeight" min="1" max="4096" .value=${String(this.resizeHeight)} /></label>
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
      <dialog id="adjustColorsDialog">
        <h3>${tr("dialog.adjustTitle")}</h3>
        <p>${tr("dialog.adjustHint")}</p>
        <label
          >${tr("dialog.brightness")}
          <input type="number" id="adjustBrightness" min="-100" max="100" step="1" .value=${String(this.adjustBrightness)} />
        </label>
        <label
          >${tr("dialog.contrast")}
          <input type="number" id="adjustContrast" min="-100" max="100" step="1" .value=${String(this.adjustContrast)} />
        </label>
        <label
          >${tr("dialog.posterize")}
          <input type="number" id="adjustPosterize" min="0" max="255" step="1" .value=${String(this.adjustPosterize)} />
        </label>
        <div class="dialog-actions">
          <button @click=${(): void => this.closeAdjustColorsDialog()}>${tr("btn.cancel")}</button>
          <button id="adjustColorsOk" @click=${(): void => this.confirmAdjustColors()}>${tr("btn.ok")}</button>
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
                      <td><kbd>${entry.keysPt !== undefined && getActiveLocale() === "pt-BR" ? entry.keysPt : entry.keys}</kbd></td>
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
                  .switchOutOfBlack=${this.colorSwitchOutOfBlack}
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
                  .switchOutOfBlack=${this.colorSwitchOutOfBlack}
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
                  .switchOutOfBlack=${this.colorSwitchOutOfBlack}
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
        <div class="setting-row">
          <label
            >${tr("setting.emptyCells")}
            <select id="emptyCellMode" .value=${this.emptyCellMode} @change=${(): void => this.applyEmptyCellFromDialog()}>
              <option value="hold">${tr("setting.emptyCellsHold")}</option>
              <option value="nothing">${tr("setting.emptyCellsNothing")}</option>
            </select>
          </label>
          ${this.emptyCellMode !== DEFAULT_EMPTY_CELL_SETTINGS.mode
            ? html`<button
                class="reset-btn"
                aria-label=${tr("a11y.resetEmptyCells")}
                title=${tr("a11y.resetToDefault")}
                @click=${(): void => this.resetEmptyCellsToDefault()}
              >
                ↻
              </button>`
            : html``}
        </div>
        <div class="settings-section">${tr("setting.onion")}</div>
        <div class="setting-row">
          <label title=${tr("setting.onionEnabledHint")}
            ><input
              type="checkbox"
              id="onionEnabled"
              .checked=${this.onionEnabled}
              @change=${(): void => this.applyOnionFromDialog()}
            />
            ${tr("setting.onionEnabled")}
          </label>
        </div>
        <div class="setting-row">
          <label title=${tr("setting.onionPastHint")}
            >${tr("setting.onionPast")}
            <input
              type="number"
              id="onionPast"
              min="0"
              max="8"
              step="1"
              .value=${String(this.onionPast)}
              @input=${(): void => this.applyOnionFromDialog()}
            />
          </label>
        </div>
        <div class="setting-row">
          <label title=${tr("setting.onionFutureHint")}
            >${tr("setting.onionFuture")}
            <input
              type="number"
              id="onionFuture"
              min="0"
              max="8"
              step="1"
              .value=${String(this.onionFuture)}
              @input=${(): void => this.applyOnionFromDialog()}
            />
          </label>
        </div>
        <div class="setting-row">
          <label title=${tr("setting.onionTintHint")}
            ><input
              type="checkbox"
              id="onionTint"
              .checked=${this.onionTint}
              @change=${(): void => this.applyOnionFromDialog()}
            />
            ${tr("setting.onionTint")}
          </label>
          ${this.onionEnabled !== DEFAULT_ONION_SETTINGS.enabled ||
          this.onionPast !== DEFAULT_ONION_SETTINGS.past ||
          this.onionFuture !== DEFAULT_ONION_SETTINGS.future ||
          this.onionTint !== DEFAULT_ONION_SETTINGS.tint
            ? html`<button
                class="reset-btn"
                aria-label=${tr("setting.onion")}
                title=${tr("a11y.resetToDefault")}
                @click=${(): void => this.resetOnionToDefault()}
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
          <label title=${tr("setting.switchOutOfBlackHint")}
            ><input
              type="checkbox"
              id="blackSwitchOutOfBlack"
              .checked=${this.colorSwitchOutOfBlack}
              @change=${(): void => this.applyBlackSwitchFromDialog()}
            />
            ${tr("setting.switchOutOfBlack")}
          </label>
          ${this.colorSwitchOutOfBlack !== DEFAULT_BLACK_SWITCH_SETTINGS.switchOutOfBlack
            ? html`<button
                class="reset-btn"
                aria-label=${tr("a11y.resetBlackSwitch")}
                title=${tr("a11y.resetToDefault")}
                @click=${(): void => this.resetBlackSwitchToDefault()}
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
          <label>${tr("setting.textStorage")}
            <select
              id="storageTextStorage"
              .value=${this.storageTextStorage}
              @change=${(): void => this.applyStorageFromDialog()}
            >
              <option value="embedded">${tr("setting.textStorageEmbedded")}</option>
              <option value="html">${tr("setting.textStorageHtml")}</option>
              <option value="htmlZip">${tr("setting.textStorageHtmlZip")}</option>
            </select>
          </label>
        </div>
        <div class="setting-row">
          <label>${tr("setting.svgStorage")}
            <select
              id="storageSvgStorage"
              .value=${this.storageSvgStorage}
              @change=${(): void => this.applyStorageFromDialog()}
            >
              <option value="raw">${tr("setting.svgStorageRaw")}</option>
              <option value="compressed">${tr("setting.svgStorageCompressed")}</option>
              <option value="embedded">${tr("setting.svgStorageEmbedded")}</option>
            </select>
          </label>
        </div>
        <div class="setting-row">
          <label>${tr("setting.modelLighting")}
            <select
              id="storageModelLighting"
              .value=${this.storageModelLighting}
              @change=${(): void => this.applyStorageFromDialog()}
            >
              <option value="unlit">${tr("setting.modelLightingUnlit")}</option>
              <option value="lit">${tr("setting.modelLightingLit")}</option>
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
        <div class="setting-row">
          <label
            >${tr("setting.brushMaxSize")}
            <input
              type="number"
              id="brushMaxSize"
              min="1"
              max="2048"
              step="1"
              .value=${String(this.maxBrushSize)}
              @input=${(): void => this.applyBrushFromDialog()}
            />
          </label>
          ${this.maxBrushSize !== DEFAULT_BRUSH_SETTINGS.maxBrushSize
            ? html`<button
                class="reset-btn"
                aria-label=${tr("a11y.resetBrushMaxSize")}
                title=${tr("a11y.resetToDefault")}
                @click=${(): void => this.resetBrushMaxToDefault()}
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
        ${this.durationTotal
          ? html`<p>${tr("dialog.durationTotalHint")}</p>`
          : html``}
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
      <dialog id="brushPresetManagerDialog" data-testid="brush-preset-dialog">
        <h3>${tr("dialog.presetsTitle")}</h3>
        <label title=${tr("opt.presetHint")}
          >${tr("opt.preset")}
          <select id="brushPresetDialog" @change=${(): void => this.applyBrushPresetFromDialog("Dialog")}>
            ${[...BUILT_IN_BRUSH_PRESETS, ...this.brushPresets].map(
              (preset) => html`<option value=${preset.name}>${displayBrushPresetName(preset, getActiveLocale())}</option>`,
            )}
          </select>
        </label>
        <label title=${tr("opt.presetNameHint")}
          >${tr("opt.presetName")}
          <input
            type="text"
            id="presetNameDialog"
            maxlength="64"
            .value=${this.presetName}
            @input=${(event: Event): void => {
              this.presetName = (event.target as HTMLInputElement | null)?.value ?? "";
            }}
          />
          <button @click=${(): void => this.saveBrushPresetFromDialog("Dialog")}>${tr("btn.save")}</button>
          <button @click=${(): void => this.deleteBrushPresetFromDialog("Dialog")}>${tr("btn.delete")}</button>
          <button @click=${(): void => this.downloadBrushPreset("Dialog")}>${tr("btn.export")}</button>
          <button @click=${(): void => this.openBrushPresetPicker("Dialog")}>${tr("btn.import")}</button>
          <input type="file" id="brushPresetImportDialog" accept="application/json,.json" hidden @change=${(): void => void this.importBrushPresetFromDialog("Dialog")} />
        </label>
        <div class="dialog-actions">
          <button @click=${(): void => this.closeBrushPresetDialog()}>${tr("btn.close")}</button>
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
      <dialog
        id="animationCreateDialog"
        data-testid="animation-create-dialog"
        @close=${(): void => this.closeNewAnimationDialog()}
      >
        <h3>${tr("action.newAnimation")}</h3>
        <label
          >${tr("dialog.animName")}
          <input
            type="text"
            id="animationCreateName"
            data-testid="animation-create-name"
            maxlength="64"
            .value=${this.animationCreateName}
            @input=${(event: Event): void => {
              this.animationCreateName = (event.target as HTMLInputElement).value;
            }}
          />
        </label>
        <label
          >${tr("dialog.animLoop")}
          <select
            id="animationCreateLoop"
            data-testid="animation-create-loop"
            .value=${this.animationCreateLoop}
            @change=${(event: Event): void => {
              this.animationCreateLoop = (event.target as HTMLSelectElement).value;
            }}
          >
            <option value="none">none</option>
            <option value="forward">forward</option>
            <option value="ping-pong">ping-pong</option>
          </select>
        </label>
        ${this.animationCreateError !== null
          ? html`<p class="dialog-error" role="alert" data-testid="animation-create-error">${this.animationCreateError}</p>`
          : html``}
        <div class="dialog-actions">
          <button data-testid="animation-create-cancel" @click=${(): void => this.closeNewAnimationDialog()}>
            ${tr("btn.cancel")}
          </button>
          <button data-testid="animation-create-ok" @click=${(): void => this.confirmNewAnimation()}>
            ${tr("btn.ok")}
          </button>
        </div>
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
        <div class="export-tabs" role="tablist" aria-label=${tr("menu.export")}>
          <button
            role="tab"
            data-testid="export-tab-frame"
            title=${tr("dialog.exportFrameTitle")}
            aria-selected=${this.exportTab === "frame" ? "true" : "false"}
            @click=${(): void => {
              this.exportTab = "frame";
            }}
          >
            ${tr("dialog.exportFrame")}
          </button>
          <button
            role="tab"
            data-testid="export-tab-animation"
            title=${tr("dialog.exportAnimationTitle")}
            aria-selected=${this.exportTab === "animation" ? "true" : "false"}
            @click=${(): void => {
              this.exportTab = "animation";
            }}
          >
            ${tr("dialog.exportAnimation")}
          </button>
          <button
            role="tab"
            data-testid="export-tab-sheet"
            title=${tr("dialog.exportSheetTitle")}
            aria-selected=${this.exportTab === "sheet" ? "true" : "false"}
            @click=${(): void => {
              this.exportTab = "sheet";
            }}
          >
            ${tr("dialog.exportSheet")}
          </button>
          <button
            role="tab"
            data-testid="export-tab-full"
            title=${tr("dialog.exportFullProjectTitle")}
            aria-selected=${this.exportTab === "full" ? "true" : "false"}
            @click=${(): void => {
              this.exportTab = "full";
            }}
          >
            ${tr("dialog.exportFullProject")}
          </button>
        </div>
        <section ?hidden=${this.exportTab !== "frame"}>
        <label title=${tr("dialog.frameTitle")}
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
        <label title=${tr("dialog.formatTitle")}
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
          ? html`<label title=${tr("dialog.losslessTitle")}
              >${tr("val.lossless")}
              <input
                type="checkbox"
                id="exportLossless"
                ?checked=${this.exportLossless}
                @change=${(event: Event): void => {
                  this.exportLossless = (event.target as HTMLInputElement).checked;
                }}
              />
            </label>`
          : html``}
        ${this.exportFormat === "image/png" ||
        ((this.exportFormat === JXL_MIME || this.exportFormat === WEBP_MIME) && this.exportLossless)
          ? html``
          : html`<label title=${tr("dialog.qualityTitle")}
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
          <button id="exportOk" @click=${(): void => void this.confirmExportFrame()}>
            ${tr("dialog.exportFrame")}
          </button>
        </div>
        </section>
        <section ?hidden=${this.exportTab !== "animation"}>
        <label title=${tr("dialog.animationTitle")}
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
        <label title=${tr("dialog.formatTitle")}
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
        ${this.animatedFormatUsesLossless()
          ? html`<label title=${tr("dialog.losslessTitle")}
              >${tr("val.lossless")}
              <input
                type="checkbox"
                id="exportAnimatedLossless"
                ?checked=${this.exportAnimatedLossless}
                @change=${(event: Event): void => {
                  this.exportAnimatedLossless = (event.target as HTMLInputElement).checked;
                }}
              />
            </label>`
          : html``}
        ${this.animatedFormatHidesQuality()
          ? html``
          : html`<label title=${tr("dialog.qualityTitle")}
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
          <button @click=${(): void => this.closeExportDialog()}>${tr("btn.cancel")}</button>
          <button id="exportAnimatedOk" @click=${(): void => void this.confirmExportAnimated()}>
            ${tr("dialog.exportAnimation")}
          </button>
        </div>
        </section>
        <section ?hidden=${this.exportTab !== "sheet"}>
        <div class="export-sheet-animations" title=${tr("dialog.sheetAnimationsTitle")}>
          <label title=${tr("dialog.sheetAllFramesTitle")}
            ><input
              type="checkbox"
              id="exportSheetAll"
              ?checked=${this.exportSheetAll}
              @change=${(event: Event): void => {
                this.exportSheetAll = (event.target as HTMLInputElement).checked;
              }}
            />${tr("matrix.allFrames")}</label
          >
          ${this.engine?.getNamedAnimations().map(
            (animation) =>
              html`<label
                ><input type="checkbox" data-export-sheet-anim="${animation.name}" />${animation.name}</label
              >`,
          ) ?? html``}
        </div>
        <label
          title=${tr("dialog.extraFramesTitle")}
          ?hidden=${this.exportSheetAll}
          >${tr("dialog.extraFrames")}
          <input type="text" id="exportSheetFrames" placeholder=${tr("dialog.extraFrames")} />
        </label>
        <label title=${tr("dialog.sheetLayoutTitle")}
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
          title=${tr("dialog.linesCountTitle")}
          ?hidden=${this.exportSheetLayout !== "fixed-rows" && this.exportSheetLayout !== "fixed-cols"}
          >${tr("dialog.linesCount")}
          <input
            type="number"
            id="exportSheetCount"
            min="1"
            step="1"
            .value=${String(this.exportSheetCount)}
          />
        </label>
        <label title=${tr("dialog.formatTitle")}
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
          ? html`<label title=${tr("dialog.losslessTitle")}
              >${tr("val.lossless")}
              <input
                type="checkbox"
                id="exportSheetLossless"
                ?checked=${this.exportSheetLossless}
                @change=${(event: Event): void => {
                  this.exportSheetLossless = (event.target as HTMLInputElement).checked;
                }}
              />
            </label>`
          : html``}
        ${this.exportSheetFormat === "image/png" ||
        ((this.exportSheetFormat === JXL_MIME || this.exportSheetFormat === WEBP_MIME) && this.exportSheetLossless)
          ? html``
          : html`<label title=${tr("dialog.qualityTitle")}
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
          <button @click=${(): void => this.closeExportDialog()}>${tr("btn.cancel")}</button>
          <button id="exportSheetOk" @click=${(): void => void this.confirmExportSheet()}>
            ${tr("dialog.exportSheet")}
          </button>
        </div>
        </section>
        <section ?hidden=${this.exportTab !== "full"}>
        <p>${tr("dialog.exportFullProjectHint")}</p>
        <div class="dialog-actions">
          <button @click=${(): void => this.closeExportDialog()}>${tr("btn.cancel")}</button>
          <button id="exportFullProjectOk" @click=${(): void => void this.exportFullProject()}>
            ${tr("dialog.exportFullProject")}
          </button>
        </div>
        </section>
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
      ${this.embeddedOpenList !== null ? this.renderEmbeddedOpenDialog() : html``}
      ${this.embeddedSaveOpen ? this.renderSaveEmbeddedAsDialog() : html``}
      ${this.contentPickerTarget !== null || this.contentPickerMode === "relink" ? this.renderContentPickerDialog() : html``}
      ${this.contentManagerOpen ? this.renderContentManagerDialog() : html``}
      ${this.texturePickerContentId !== null || this.texturePickerTileset ? this.renderTexturePickerDialog() : html``}
      ${this.tileWindowOpen && this.tool === "tilebrush" ? this.renderTileWindow() : html``}
      ${this.textPickerTarget !== null ? this.renderTextPickerDialog() : html``}
      ${this.textEditor !== null ? this.renderTextEditorDialog() : html``}
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
    if (tool === "polylasso") {
      return tr("toolname.polylasso");
    }
    if (tool === "colorselect") {
      return tr("toolname.colorselect");
    }
    if (tool === "text") {
      return tr("toolname.text");
    }
    if (tool === "tilebrush") {
      return tr("toolname.tilebrush");
    }
    if (tool === "modeltransform") {
      return tr("toolname.modeltransform");
    }
    if (tool === "flycam") {
      return tr("toolname.flycam");
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
    if (tool === "rectangle") {
      return tr("toolname.rectangle");
    }
    if (tool === "ellipseShape") {
      return tr("toolname.ellipseShape");
    }
    if (tool === "polygon") {
      return tr("toolname.polygon");
    }
    if (tool === "gradient") {
      return tr("toolname.gradient");
    }
    if (tool === "shading") {
      return tr("toolname.shading");
    }
    if (tool === "blur") {
      return tr("toolname.blur");
    }
    if (tool === "clone") {
      return tr("toolname.clone");
    }
    if (tool === "recolor") {
      return tr("toolname.recolor");
    }
    if (tool === "jumble") {
      return tr("toolname.jumble");
    }
    if (tool === "crop") {
      return tr("toolname.crop");
    }
    return tr("toolname.curve");
  }

  /** Drawer helpers: the front tool doubles as the drawer button. */
  /** Tools without a drawer, in toolbar order (menu items before the drawer submenus). */
  private standaloneTools(): GnumarusCanvasTool[] {
    return ["loupe", "bucket", "eyedropper", "text", "tilebrush"];
  }

  /** Every tool reachable from the Tools menu, standalone first, then drawer order. */
  private allMenuTools(): GnumarusCanvasTool[] {
    const tools: GnumarusCanvasTool[] = [...this.standaloneTools()];
    for (const drawer of GNUMARUS_TOOL_DRAWERS) {
      tools.push(...drawer.tools);
    }
    return tools;
  }

  /** Drawer owning a tool, or null for drawer-less tools. */
  private toolDrawerId(tool: GnumarusCanvasTool): string | null {
    for (const drawer of GNUMARUS_TOOL_DRAWERS) {
      if ((drawer.tools as GnumarusCanvasTool[]).includes(tool)) {
        return drawer.id;
      }
    }
    return null;
  }

  /** Menu/action label for any tool (drawer labels or the standalone tool name). */
  private toolMenuLabel(tool: GnumarusCanvasTool): string {
    if (this.toolDrawerId(tool) !== null) {
      return this.drawerToolLabel(tool);
    }
    return tr(`tool.${tool}` as GnumarusMessageKey);
  }

  /** Menu/action tooltip for any tool (drawer hints or the standalone tool hint). */
  private toolMenuHint(tool: GnumarusCanvasTool): string {
    if (this.toolDrawerId(tool) !== null) {
      return this.drawerToolHint(tool);
    }
    return tr(`tool.${tool}Hint` as GnumarusMessageKey);
  }

  /** Activate a tool from the Tools menu or its run action (closes menus first). */
  private activateToolFromMenu(tool: GnumarusCanvasTool): void {
    this.closeAllMenus();
    const drawerId = this.toolDrawerId(tool);
    if (drawerId !== null) {
      this.selectDrawerTool(drawerId, tool, true);
      return;
    }
    this.tool = tool;
    this.engine?.setTool(tool);
  }

  /** Close the open drawer flyout, if any. */
  private closeDrawerFlyout(): void {
    this.drawerOpen = null;
    this.drawerFlyoutPos = null;
  }
  /** One toolbar drawer: front button activates, right-click opens the flyout. */
  private renderToolDrawer(id: string): unknown {
    const def = GNUMARUS_TOOL_DRAWERS.find((entry) => entry.id === id);
    if (def === undefined) {
      return html``;
    }
    const front = this.drawerFrontTool(id);
    const open = this.drawerOpen === id;
    return html`
      <div class="tool-drawer" data-testid=${`${id}-drawer`}>
        <button
          class=${this.tool === front ? "active" : ""}
          title=${this.drawerFrontHint(id)}
          aria-label=${this.drawerFrontName(id)}
          @click=${(): void => this.selectDrawerTool(id, front)}
          @contextmenu=${(event: MouseEvent): void => {
            event.preventDefault();
            if (open) {
              this.closeDrawerFlyout();
              return;
            }
            const anchor = event.currentTarget as HTMLElement | null;
            const rect = anchor?.getBoundingClientRect();
            this.drawerFlyoutPos =
              rect === undefined
                ? null
                : { left: rect.right + 4, top: Math.max(8, rect.top) };
            this.drawerOpen = id;
            // The flyout content varies per drawer, so re-measure after
            // render and pull it back when it would spill out of the viewport.
            void this.updateComplete.then(() => {
              if (this.drawerOpen !== id || this.drawerFlyoutPos === null) {
                return;
              }
              const flyout = this.shadowRoot?.querySelector(
                `[data-testid="${id}-flyout"]`,
              ) as HTMLElement | null;
              if (flyout === null) {
                return;
              }
              const box = flyout.getBoundingClientRect();
              const overflowX = box.right - window.innerWidth + 8;
              const overflowY = box.bottom - window.innerHeight + 8;
              if (overflowX > 0 || overflowY > 0) {
                this.drawerFlyoutPos = {
                  left: Math.max(8, this.drawerFlyoutPos.left - Math.max(0, overflowX)),
                  top: Math.max(8, this.drawerFlyoutPos.top - Math.max(0, overflowY)),
                };
              }
            });
          }}
        >
          <span class="tool-icon">${this.drawerToolGlyph(front)}</span>
        </button>
        ${open
          ? html`<div
              class="tool-flyout"
              data-testid=${`${id}-flyout`}
              style=${this.drawerFlyoutPos === null
                ? ""
                : `left: ${this.drawerFlyoutPos.left}px; top: ${this.drawerFlyoutPos.top}px;`}
            >
              ${def.tools.map(
                (name) => html`<button
                  class=${front === name ? "active" : ""}
                  title=${this.drawerToolHint(name)}
                  aria-label=${this.drawerToolLabel(name)}
                  @click=${(): void => this.selectDrawerTool(id, name, true)}
                >
                  <span class="tool-icon">${this.drawerToolGlyph(name)}</span>
                </button>`,
              )}
            </div>
            <div
              class="drawer-blocker"
              @click=${(): void => {
                this.closeDrawerFlyout();
              }}
              @contextmenu=${(event: Event): void => {
                event.preventDefault();
                this.closeDrawerFlyout();
              }}
            ></div>`
          : html``}
      </div>
    `;
  }

  private drawerFrontTool(id: string): GnumarusCanvasTool {
    const def = GNUMARUS_TOOL_DRAWERS.find((entry) => entry.id === id);
    const front = this.drawerFront[id];
    if (def !== undefined && front !== undefined && (def.tools as GnumarusCanvasTool[]).includes(front)) {
      return front;
    }
    return def?.tools[0] ?? "pencil";
  }

  /** Front-button and flyout accessible name: the tool label, unchanged. */
  private drawerToolLabel(tool: GnumarusCanvasTool): string {
    if (tool === "ellipse") {
      return tr("tool.ellipse");
    }
    if (tool === "lasso") {
      return tr("tool.lasso");
    }
    if (tool === "polylasso") {
      return tr("tool.polylasso");
    }
    if (tool === "colorselect") {
      return tr("tool.colorselect");
    }
    if (tool === "line") {
      return tr("tool.line");
    }
    if (tool === "rectangle") {
      return tr("tool.rectangle");
    }
    if (tool === "ellipseShape") {
      return tr("tool.ellipseShape");
    }
    if (tool === "polygon") {
      return tr("tool.polygon");
    }
    if (tool === "gradient") {
      return tr("tool.gradient");
    }
    if (tool === "shading") {
      return tr("tool.shading");
    }
    if (tool === "blur") {
      return tr("tool.blur");
    }
    if (tool === "clone") {
      return tr("tool.clone");
    }
    if (tool === "recolor") {
      return tr("tool.recolor");
    }
    if (tool === "jumble") {
      return tr("tool.jumble");
    }
    if (tool === "crop") {
      return tr("tool.crop");
    }
    if (tool === "curve") {
      return tr("tool.curve");
    }
    if (tool === "destransform") {
      return tr("tool.destransform");
    }
    if (tool === "destransform3d") {
      return tr("tool.destransform3d");
    }
    if (tool === "transform") {
      return tr("tool.transform");
    }
    if (tool === "transform3d") {
      return tr("tool.transform3d");
    }
    if (tool === "rectselect") {
      return tr("tool.rectselect");
    }
    if (tool === "modeltransform") {
      return tr("tool.modeltransform");
    }
    if (tool === "flycam") {
      return tr("tool.flycam");
    }
    if (tool === "bucket") {
      return tr("tool.bucket");
    }
    if (tool === "eyedropper") {
      return tr("tool.eyedropper");
    }
    if (tool === "loupe") {
      return tr("tool.loupe");
    }
    return tr("tool.pencil");
  }

  private drawerFrontName(id: string): string {
    return this.drawerToolLabel(this.drawerFrontTool(id));
  }

  private drawerToolHint(tool: GnumarusCanvasTool): string {
    if (tool === "ellipse") {
      return tr("tool.ellipseHint");
    }
    if (tool === "lasso") {
      return tr("tool.lassoHint");
    }
    if (tool === "polylasso") {
      return tr("tool.polylassoHint");
    }
    if (tool === "colorselect") {
      return tr("tool.colorselectHint");
    }
    if (tool === "line") {
      return tr("tool.lineHint");
    }
    if (tool === "rectangle") {
      return tr("tool.rectangleHint");
    }
    if (tool === "ellipseShape") {
      return tr("tool.ellipseShapeHint");
    }
    if (tool === "polygon") {
      return tr("tool.polygonHint");
    }
    if (tool === "gradient") {
      return tr("tool.gradientHint");
    }
    if (tool === "shading") {
      return tr("tool.shadingHint");
    }
    if (tool === "blur") {
      return tr("tool.blurHint");
    }
    if (tool === "clone") {
      return tr("tool.cloneHint");
    }
    if (tool === "recolor") {
      return tr("tool.recolorHint");
    }
    if (tool === "jumble") {
      return tr("tool.jumbleHint");
    }
    if (tool === "crop") {
      return tr("tool.cropHint");
    }
    if (tool === "curve") {
      return tr("tool.curveHint");
    }
    if (tool === "destransform") {
      return tr("tool.destransformHint");
    }
    if (tool === "destransform3d") {
      return tr("tool.destransform3dHint");
    }
    if (tool === "transform") {
      return tr("tool.transformHint");
    }
    if (tool === "transform3d") {
      return tr("tool.transform3dHint");
    }
    if (tool === "rectselect") {
      return tr("tool.rectselectHint");
    }
    if (tool === "modeltransform") {
      return tr("tool.modeltransformHint");
    }
    if (tool === "flycam") {
      return tr("tool.flycamHint");
    }
    return tr("tool.pencilHint");
  }

  private drawerFrontHint(id: string): string {
    return `${this.drawerToolHint(this.drawerFrontTool(id))} (${tr("tool.drawerHint")})`;
  }

  private drawerToolGlyph(tool: GnumarusCanvasTool): string {
    if (tool === "ellipse") {
      return "◯";
    }
    if (tool === "lasso") {
      return "〰";
    }
    if (tool === "polylasso") {
      return "⬔";
    }
    if (tool === "colorselect") {
      return "✦";
    }
    if (tool === "line") {
      return "╲";
    }
    if (tool === "rectangle") {
      return "▭";
    }
    if (tool === "ellipseShape") {
      return "◯";
    }
    if (tool === "polygon") {
      return "⬠";
    }
    if (tool === "gradient") {
      return "◨";
    }
    if (tool === "shading") {
      return "◐";
    }
    if (tool === "blur") {
      return "░";
    }
    if (tool === "clone") {
      return "⧉";
    }
    if (tool === "recolor") {
      return "◑";
    }
    if (tool === "jumble") {
      return "⟡";
    }
    if (tool === "crop") {
      return "◫";
    }
    if (tool === "curve") {
      return "〜";
    }
    if (tool === "destransform") {
      return "✛";
    }
    if (tool === "destransform3d") {
      return "⟲";
    }
    if (tool === "transform") {
      return "⤢";
    }
    if (tool === "transform3d") {
      return "⟳";
    }
    if (tool === "rectselect") {
      return "▭";
    }
    if (tool === "modeltransform") {
      return "⬢";
    }
    if (tool === "flycam") {
      return "✈";
    }
    return "✎";
  }

  /** Activate a drawer tool (optionally closing the flyout). */
  private selectDrawerTool(id: string, tool: GnumarusCanvasTool, close = false): void {
    if (tool === "flycam") {
      if (close) {
        this.closeDrawerFlyout();
      }
      this.activateFlycamTool(id);
      return;
    }
    this.drawerFront = { ...this.drawerFront, [id]: tool };
    this.tool = tool;
    this.engine?.setTool(tool);
    if (close) {
      this.closeDrawerFlyout();
    }
  }

  /** Tool active before entering fly-camera mode (restored on exit). */
  private toolBeforeFlycam: GnumarusCanvasTool | null = null;

  /**
   * Enter fly-camera mode on the active cell: requires a 3D model, otherwise
   * a toast explains and the current tool stays.
   */
  private activateFlycamTool(drawerId: string): void {
    if (this.engine === null) {
      return;
    }
    const layerId = this.engine.getActiveLayerId();
    if (this.engine.getCellModel3dId(layerId, this.engine.getCurrentFrame()) === null) {
      this.statusMessage = tr("status.model3dNeedsCell");
      this.showToast(tr("status.model3dNeedsCell"));
      return;
    }
    if (!this.engine.enterFlycam()) {
      this.statusMessage = tr("status.model3dNeedsCell");
      this.showToast(tr("status.model3dNeedsCell"));
      return;
    }
    if (this.tool !== "flycam") {
      this.toolBeforeFlycam = this.tool;
    }
    this.drawerFront = { ...this.drawerFront, [drawerId]: "flycam" };
    this.tool = "flycam";
    this.engine.setTool("flycam");
    this.refreshLayers();
  }

  /** Leave fly-camera mode, restoring the previously active tool. */
  private exitFlycam(): void {
    const previous = this.toolBeforeFlycam ?? "pencil";
    this.toolBeforeFlycam = null;
    if (this.tool !== "flycam") {
      return;
    }
    this.tool = previous;
    this.engine?.setTool(previous);
    this.refreshLayers();
  }

  /** Route one key event to the fly camera (always consumed). */
  private handleFlycamKey(event: KeyboardEvent): void {
    if (this.engine === null) {
      return;
    }
    // Movement keys go through the hold tracker: one discrete step on the
    // initial keydown (repeats are no-ops) plus a rAF loop while held.
    // KeyJ/KeyL turn left/right, KeyI/KeyK pitch up/down (±89° clamp).
    switch (event.code) {
      case "KeyW":
      case "KeyA":
      case "KeyS":
      case "KeyD":
      case "KeyQ":
      case "KeyE":
      case "KeyZ":
      case "KeyC":
      case "KeyJ":
      case "KeyL":
      case "KeyI":
      case "KeyK":
        this.engine.flyPressKey(event.code);
        break;
      case "KeyR":
        this.engine.flyResetView();
        this.statusMessage = tr("status.flycamReset");
        break;
      case "Escape":
        this.exitFlycam();
        break;
      default:
        break;
    }
    this.refreshLayers();
  }

  private renderBlendModeOption(sfx: "" | "Panel" = "") {
    return html`
      <label title=${tr("opt.blendHint")}
        >${tr("opt.blend")}
        <select id="blendMode${sfx}" .value=${this.blendMode} @change=${(): void => this.applyBlendModeFromDialog(sfx)}>
          <option value="normal">${tr("val.normal")}</option>
          <option value="copy">${tr("val.copy")}</option>
          <option value="eraser">${tr("val.eraser")}</option>
        </select>
      </label>
    `;
  }

  private renderAccumulateOption(sfx: "" | "Panel" = "") {
    return html`
      <label title=${tr("opt.accumulateHint")}
        ><input
          type="checkbox"
          id="accumulate${sfx}"
          .checked=${this.accumulate}
          @change=${(): void => this.applyAccumulateFromDialog(sfx)}
        />
        ${tr("opt.accumulate")}
      </label>
    `;
  }

  private renderStabilizerOption(sfx: "" | "Panel" = "") {
    return html`
      <label title=${tr("opt.stabilizerHint")}
        >${tr("opt.stabilizer")}
        <select
          id="stabilizerMode${sfx}"
          .value=${this.stabilizerMode}
          @change=${(): void => this.applyStabilizerModeFromDialog(sfx)}
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
                id="ropeLength${sfx}"
                min="1"
                max="200"
                step="1"
                .value=${String(this.ropeLength)}
                @input=${(): void => this.applyRopeLengthFromDialog(sfx)}
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
                id="followStrength${sfx}"
                min="1"
                max="100"
                step="1"
                .value=${String(this.followStrength)}
                @input=${(): void => this.applyFollowStrengthFromDialog(sfx)}
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
        <label title=${tr("opt.lightingHint")}
          >${tr("opt.lighting")}
          <select id="modelLighting" .value=${this.storageModelLighting} @change=${(): void => this.applyModelLightingFromEditor()}>
            <option value="unlit">${tr("setting.modelLightingUnlit")}</option>
            <option value="lit">${tr("setting.modelLightingLit")}</option>
          </select>
        </label>
      </div>
    `;
  }

  /** Shared pencil settings (toolbar bar, picker side panel, preset dialog uses its own). */
  private renderBrushPresetRow(sfx: "" | "Panel" | "Dialog") {
    return html`
              <label title=${tr("opt.presetHint")}
                >${tr("opt.preset")}
                <button data-testid="brush-reset${sfx}" aria-label=${tr("opt.resetPreset")} title=${tr("opt.resetPresetHint")} @click=${(): void => this.resetBrushPresetFromDialog(sfx)}>${tr("opt.resetPreset")}</button>
                <select id="brushPreset${sfx}" .value=${this.brushPresetName} @change=${(): void => this.applyBrushPresetFromDialog(sfx)}>
                  ${[...BUILT_IN_BRUSH_PRESETS, ...this.brushPresets].map(
                    (preset) => html`<option value=${preset.name}>${displayBrushPresetName(preset, getActiveLocale())}</option>`,
                  )}
                </select>
                <button data-testid="brush-presets${sfx}" aria-label=${tr("opt.presets")} title=${tr("opt.presetsHint")} @click=${(): void => this.openBrushPresetDialog()}>${tr("opt.presets")}</button>
              </label>
    `;
  }

  /** Brush size, tip, dynamics, pressure, AA, pixel-perfect, stabilizer, blend, accumulate. */
  private renderPencilBrushOptions(sfx: "" | "Panel") {
    return html`
              <label title=${tr("opt.brushSizeHint")}
                >${tr("opt.brushSize")}
                <input
                  type="number"
                  id="brushSize${sfx}"
                  min="0.1"
                  max=${String(this.maxBrushSize)}
                  step="0.1"
                  .value=${String(this.brushSize)}
                  @input=${(): void => this.applyBrushSizeFromDialog(sfx)}
                />
              </label>
              <label title=${tr("opt.brushSizeMinHint")}
                >${tr("opt.brushSizeMin")}
                <input
                  type="number"
                  id="brushSizeMin${sfx}"
                  min="0.1"
                  max=${String(this.maxBrushSize)}
                  step="0.1"
                  .value=${String(this.brushSizeMin)}
                  @input=${(): void => this.applyBrushSizeMinFromDialog(sfx)}
                />
              </label>
              <label title=${tr("opt.brushShapeHint")}
                >${tr("opt.brushShape")}
                <select id="brushShape${sfx}" .value=${this.brushShape} @change=${(): void => this.applyBrushShapeFromDialog(sfx)}>
                  <option value="square">${tr("val.square")}</option>
                  <option value="circle">${tr("val.circle")}</option>
                  <option value="line">${tr("val.line")}</option>
                </select>
              </label>
              <label title=${tr("opt.brushAngleHint")}
                >${tr("opt.brushAngle")}
                <input
                  type="number"
                  id="brushAngle${sfx}"
                  min="-180"
                  max="180"
                  step="1"
                  .value=${String(Math.round(this.brushAngle))}
                  @input=${(): void => this.applyBrushAngleFromDialog(sfx)}
                />
              </label>
              <label title=${tr("opt.brushSourceHint")}
                >${tr("opt.brushSource")}
                <select id="brushSource${sfx}" .value=${this.brushSource} @change=${(): void => this.applyBrushSourceFromDialog(sfx)}>
                  <option value="tip">${tr("val.tip")}</option>
                  <option value="selection" ?disabled=${!this.hasSelectionBrush()}>${tr("val.selectionBrush")}</option>
                </select>
              </label>
              ${this.brushSource === "selection"
                ? html`<label title=${tr("opt.brushModeHint")}
                    >${tr("opt.brushMode")}
                    <select id="brushMode${sfx}" .value=${this.selectionBrushMode} @change=${(): void => this.applySelectionBrushModeFromDialog(sfx)}>
                      <option value="stamp">${tr("val.stamp")}</option>
                      <option value="origin">${tr("val.origin")}</option>
                      <option value="destination">${tr("val.destination")}</option>
                    </select>
                  </label>`
                : html``}
              <label title=${tr("opt.brushTipHint")}
                >${tr("opt.brushTip")}
                <select id="brushTipKind${sfx}" .value=${this.brushTipKind} @change=${(): void => this.applyBrushTipKindFromDialog(sfx)}>
                  <option value="pixel">${tr("val.pixelHard")}</option>
                  <option value="soft">${tr("val.softRound")}</option>
                  <option value="image">${tr("val.image")}</option>
                </select>
              </label>
              <label title=${tr("opt.sprayHint")}
                >${tr("opt.spray")}
                <input
                  type="number"
                  id="pixelSpray${sfx}"
                  min="1"
                  max="100"
                  step="1"
                  .value=${String(Math.round(this.pixelSprayDensity * 100))}
                  @input=${(): void => this.applyPixelSprayFromDialog(sfx)}
                />
              </label>
              <label title=${tr("opt.colorModeHint")}
                >${tr("opt.colorMode")}
                <select id="brushColorMode${sfx}" .value=${this.brushColorMode} @change=${(): void => this.applyBrushColorModeFromDialog(sfx)}>
                  <option value="solid">${tr("val.solid")}</option>
                  <option value="palette">${tr("val.palette")}</option>
                </select>
              </label>
              <label title=${tr("opt.shadeDirectionHint")}
                >${tr("opt.shadeDirection")}
                <select id="brushShadeDirection${sfx}" .value=${this.shadeDirection} @change=${(): void => this.applyShadeDirectionFromDialog(sfx)}>
                  <option value="forward">${tr("val.forward")}</option>
                  <option value="backward">${tr("val.backward")}</option>
                </select>
              </label>
              <label title=${tr("opt.ditherHint")}
                ><input
                  type="checkbox"
                  id="brushDither${sfx}"
                  .checked=${this.brushDither}
                  @change=${(): void => this.applyBrushDitherFromDialog(sfx)}
                />
                ${tr("opt.dither")}
              </label>
              <label title=${tr("opt.flowHint")}
                >${tr("opt.flow")}
                <input
                  type="number"
                  id="brushFlow${sfx}"
                  min="1"
                  max="100"
                  step="1"
                  .value=${String(Math.round(this.brushFlow * 100))}
                  @input=${(): void => this.applyBrushFlowFromDialog(sfx)}
                />
              </label>
              ${this.brushTipKind === "pixel"
                ? html``
                : html`<label title=${tr("opt.softnessHint")}
                    >${tr("opt.softness")}
                    <input
                      type="number"
                      id="brushHardness${sfx}"
                      min="0"
                      max="100"
                      step="1"
                      .value=${String(Math.round(this.brushHardness * 100))}
                      @input=${(): void => this.applyBrushHardnessFromDialog(sfx)}
                    />
                  </label>
                  <label title=${tr("opt.spacingHint")}
                    >${tr("opt.spacing")}
                    <input
                      type="number"
                      id="brushSpacing${sfx}"
                      min="5"
                      max="400"
                      step="1"
                      .value=${String(Math.round(this.brushSpacing * 100))}
                      @input=${(): void => this.applyBrushSpacingFromDialog(sfx)}
                    />
                  </label>
                  <label title=${tr("opt.fuzzyHint")}
                    >${tr("opt.fuzzy")}
                    <input
                      type="number"
                      id="paintFuzzy${sfx}"
                      min="0"
                      max="100"
                      step="1"
                      .value=${String(Math.round(this.paintFuzzy * 100))}
                      @input=${(): void => this.applyPaintFuzzyFromDialog(sfx)}
                    />
                  </label>
                  <label title=${tr("opt.grainHint")}
                    >${tr("opt.grain")}
                    <input
                      type="number"
                      id="paintGrainStrength${sfx}"
                      min="0"
                      max="100"
                      step="1"
                      .value=${String(Math.round(this.paintGrainStrength * 100))}
                      @input=${(): void => this.applyPaintGrainFromDialog(sfx)}
                    />
                  </label>
                  <label title=${tr("opt.grainSizeHint")}
                    >${tr("opt.grainSize")}
                    <input
                      type="number"
                      id="paintGrainScale${sfx}"
                      min="2"
                      max="64"
                      step="1"
                      .value=${String(this.paintGrainScale)}
                      @input=${(): void => this.applyPaintGrainFromDialog(sfx)}
                    />
                  </label>
                  <label title=${tr("opt.tiltSizeHint")}
                    >${tr("opt.tiltSize")}
                    <input
                      type="number"
                      id="tiltSizeAmount${sfx}"
                      min="0"
                      max="100"
                      step="1"
                      .value=${String(Math.round(this.tiltSizeAmount * 100))}
                      @input=${(): void => this.applyTiltSizeFromDialog(sfx)}
                    />
                  </label>
                  <label title=${tr("opt.speedFadeHint")}
                    >${tr("opt.speedFade")}
                    <input
                      type="number"
                      id="speedFadeAmount${sfx}"
                      min="0"
                      max="100"
                      step="1"
                      .value=${String(Math.round(this.speedFadeAmount * 100))}
                      @input=${(): void => this.applySpeedFadeFromDialog(sfx)}
                    />
                  </label>
                  <label title=${tr("opt.tipRotationHint")}
                    >${tr("opt.tipRotation")}
                    <select id="tipAngleMode${sfx}" .value=${this.tipAngleMode} @change=${(): void => this.applyTipAngleModeFromDialog(sfx)}>
                      <option value="none">${tr("val.none")}</option>
                      <option value="direction">${tr("val.followDirection")}</option>
                    </select>
                  </label>
                  <label title=${tr("opt.airbrushHint")}
                    >${tr("opt.airbrush")}
                    <input
                      type="number"
                      id="airbrushRate${sfx}"
                      min="0"
                      max="20"
                      step="1"
                      .value=${String(this.airbrushRate)}
                      @input=${(): void => this.applyAirbrushRateFromDialog(sfx)}
                    />
                  </label>
                  <label title=${tr("opt.smudgeHint")}
                    >${tr("opt.smudge")}
                    <input
                      type="number"
                      id="smudgeRate${sfx}"
                      min="0"
                      max="100"
                      step="1"
                      .value=${String(Math.round(this.smudgeRate * 100))}
                      @input=${(): void => this.applySmudgeFromDialog(sfx)}
                    />
                  </label>
                  <label title=${tr("opt.wetnessHint")}
                    >${tr("opt.wetness")}
                    <input
                      type="number"
                      id="smudgeWet${sfx}"
                      min="0"
                      max="100"
                      step="1"
                      .value=${String(Math.round(this.smudgeWet * 100))}
                      @input=${(): void => this.applySmudgeFromDialog(sfx)}
                    />
                  </label>
                  <label title=${tr("opt.dualTipHint")}
                    >${tr("opt.dualTip")} ${this.paintDualName === "" ? tr("val.noneOption") : `(${this.paintDualName})`}
                    <input type="file" id="paintDualImport${sfx}" accept="image/*" hidden @change=${(): void => void this.importPaintDualFromDialog(sfx)} />
                    <button @click=${(): void => this.openPaintDualPicker(sfx)}>${tr("opt.importDual")}</button>
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
                          id="paintDualStrength${sfx}"
                          min="0"
                          max="100"
                          step="1"
                          .value=${String(Math.round(this.paintDualStrength * 100))}
                          @input=${(): void => this.applyPaintDualTuningFromDialog(sfx)}
                        />
                      </label>
                      <label title=${tr("opt.dualSizeHint")}
                        >${tr("opt.dualSize")}
                        <input
                          type="number"
                          id="paintDualScale${sfx}"
                          min="25"
                          max="400"
                          step="1"
                          .value=${String(Math.round(this.paintDualScale * 100))}
                          @input=${(): void => this.applyPaintDualTuningFromDialog(sfx)}
                        />
                      </label>`}`}
              ${this.brushTipKind === "image"
                ? html`<label title=${tr("opt.imageTipHint")}
                    >${tr("opt.imageTip")} ${this.paintTipName === "" ? tr("val.noneOption") : `(${this.paintTipName})`}
                    <input type="file" id="paintTipImport${sfx}" accept="image/*" hidden @change=${(): void => void this.importPaintTipFromDialog(sfx)} />
                    <button @click=${(): void => this.openPaintTipPicker(sfx)}>${tr("opt.importTip")}</button>
                    ${this.paintTipName === ""
                      ? html``
                      : html`<button @click=${(): void => this.clearPaintTip()}>${tr("btn.clear")}</button>`}
                  </label>`
                : html``}
              <label title=${tr("opt.pressureHint")}
                >${tr("opt.pressure")}
                <select
                  id="pressureResponse${sfx}"
                  .value=${this.pressureResponse}
                  @change=${(): void => this.applyPressureResponseFromDialog(sfx)}
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
                      id="pressureSizeCurve${sfx}"
                      .value=${this.pressureSizeCurve}
                      @change=${(): void => this.applyPressureSizeCurveFromDialog(sfx)}
                    >
                      <option value="linear">${tr("val.linear")}</option>
                      <option value="soft">${tr("val.soft")}</option>
                      <option value="firm">${tr("val.firm")}</option>
                    </select>
                  </label>
                  <label title=${tr("opt.alphaCurveHint")}
                    >${tr("opt.alphaCurve")}
                    <select
                      id="pressureAlphaCurve${sfx}"
                      .value=${this.pressureAlphaCurve}
                      @change=${(): void => this.applyPressureAlphaCurveFromDialog(sfx)}
                    >
                      <option value="linear">${tr("val.linear")}</option>
                      <option value="soft">${tr("val.soft")}</option>
                      <option value="firm">${tr("val.firm")}</option>
                    </select>
                  </label>`}
              <label title=${tr("opt.pencilAntialiasHint")}
                ><input
                  type="checkbox"
                  id="pencilAntialias${sfx}"
                  .checked=${this.pencilAntialias}
                  @change=${(): void => this.applyPencilAntialiasFromDialog(sfx)}
                />
                ${tr("opt.antialias")}
              </label>
              <label title=${tr("opt.pencilPixelPerfectHint")}
                ><input
                  type="checkbox"
                  id="pencilPixelPerfect${sfx}"
                  .checked=${this.pencilPixelPerfect}
                  @change=${(): void => this.applyPencilPixelPerfectFromDialog(sfx)}
                />
                ${tr("opt.pixelPerfect")}
              </label>
              ${this.renderStabilizerOption(sfx)} ${this.renderBlendModeOption(sfx)} ${this.renderAccumulateOption(sfx)}
    `;
  }

  private renderToolOptions() {
    if (this.tool === "pencil") {      return html`
        <div class="tool-options" data-testid="tool-options" aria-label=${tr("opt.pencilAria")} ?hidden=${this.uiHidden}>
          ${this.renderBrushPresetRow("")}
          ${this.renderPencilBrushOptions("")}
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
              max=${String(this.maxBrushSize)}
              step="0.1"
              .value=${String(this.lineWidth)}
              @input=${(): void => this.applyLineWidthFromDialog()}
            />
          </label>
          <label title=${tr("opt.lineWidthMinHint")}
            >${tr("opt.lineWidthMin")}
            <input
              type="number"
              id="lineWidthMin"
              min="0.1"
              max=${String(this.maxBrushSize)}
              step="0.1"
              .value=${String(this.lineWidthMin)}
              @input=${(): void => this.applyLineWidthMinFromDialog()}
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
              max=${String(this.maxBrushSize)}
              step="0.1"
              .value=${String(this.curveWidth)}
              @input=${(): void => this.applyCurveWidthFromDialog()}
            />
          </label>
          <label title=${tr("opt.curveWidthMinHint")}
            >${tr("opt.curveWidthMin")}
            <input
              type="number"
              id="curveWidthMin"
              min="0.1"
              max=${String(this.maxBrushSize)}
              step="0.1"
              .value=${String(this.curveWidthMin)}
              @input=${(): void => this.applyCurveWidthMinFromDialog()}
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
          <label title=${tr("opt.featherHint")}
            >${tr("opt.feather")}
            <input
              type="number"
              id="featherRadius"
              data-testid="feather-radius"
              min="0"
              max="32"
              step="1"
              .value=${String(this.featherRadius)}
              ?disabled=${!this.floatingActive}
              @change=${(): void => {
                void this.applyFeatherFromDialog();
              }}
            />
          </label>
          <label title=${tr("opt.growShrinkHint")}
            >${tr("opt.growShrink")}
            <input
              type="number"
              id="growShrinkPx"
              data-testid="grow-shrink-px"
              min="1"
              max="64"
              step="1"
              .value=${String(this.growShrinkPx)}
              ?disabled=${!this.floatingActive}
              @change=${(): void => this.applyGrowShrinkFromDialog()}
            />
          </label>
          <button data-testid="selection-grow" ?disabled=${!this.floatingActive} title=${tr("opt.growHint")} @click=${(): void => {
            void this.reshapeFloatingSelection(1);
          }}>
            ${tr("opt.grow")}
          </button>
          <button data-testid="selection-shrink" ?disabled=${!this.floatingActive} title=${tr("opt.shrinkHint")} @click=${(): void => {
            void this.reshapeFloatingSelection(-1);
          }}>
            ${tr("opt.shrink")}
          </button>
        </div>
      `;
    }
    if (this.tool === "text") {
      return html`
        <div class="tool-options" data-testid="tool-options" aria-label=${tr("options.suffix", { tool: this.toolDisplayName(this.tool) })} ?hidden=${this.uiHidden}>
          <span class="tool-options-empty">${tr("opt.textHint")}</span>
        </div>
      `;
    }
    if (this.tool === "tilebrush") {
      return this.renderTileBrushOptions();
    }
    if (this.tool === "modeltransform") {
      return this.renderModelTransformOptions();
    }
    if (this.tool === "flycam") {
      return this.renderFlycamOptions();
    }
    if (
      this.tool === "rectangle" ||
      this.tool === "ellipseShape" ||
      this.tool === "polygon" ||
      this.tool === "gradient"
    ) {
      return this.renderShapeOptions();
    }
    if (
      this.tool === "shading" ||
      this.tool === "blur" ||
      this.tool === "clone" ||
      this.tool === "recolor" ||
      this.tool === "jumble"
    ) {
      return this.renderRetouchOptions();
    }
    if (this.tool === "crop") {
      return html`
        <div class="tool-options" data-testid="tool-options" aria-label=${tr("options.suffix", { tool: this.toolDisplayName(this.tool) })} ?hidden=${this.uiHidden}>
          <span class="tool-options-empty">${tr("opt.cropHint")}</span>
        </div>
      `;
    }
    if (
      this.tool === "rectselect" ||
      this.tool === "ellipse" ||
      this.tool === "lasso" ||
      this.tool === "polylasso" ||
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

  /** Smallest animation-matrix height in px (corner plus a row sliver). */
  private readonly minMatrixHeightPx = 56;

  /** Resize the animation matrix by dragging its top edge. */
  private onMatrixResizeStart(event: PointerEvent): void {
    if (this.engine === null) {
      return;
    }
    event.preventDefault();
    const startY = event.clientY;
    const matrix = this.shadowRoot?.querySelector(".anim-matrix") as HTMLElement | null;
    const startH = matrix?.getBoundingClientRect().height ?? 148;
    const move = (moveEvent: PointerEvent): void => {
      const max = Math.max(120, window.innerHeight - 240);
      this.matrixHeightPx = Math.min(max, Math.max(this.minMatrixHeightPx, Math.round(startH + (startY - moveEvent.clientY))));
    };
    const up = (): void => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  private renderAnimationMatrix() {
    if (this.engine === null) {
      return html``;
    }    const matrix = this.engine.getAnimationMatrix();
    const columns = `190px repeat(${matrix.frameCount}, 76px)`;
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
    const selectedCellKeys = new Set(
      this.validSelectedCells().map((cell) => this.cellSelectionKey(cell.layerId, cell.frame)),
    );
    return html`
      <div class="anim-matrix ${this.matrixHeightPx === null ? "" : "sized"}" data-testid="animation-matrix" aria-label=${tr("matrix.matrixAria")} ?hidden=${this.uiHidden}
        style=${this.matrixHeightPx === null ? "" : `height: ${this.matrixHeightPx}px;`}
      >
        <div
          class="matrix-resize-handle"
          data-testid="matrix-resize"
          role="separator"
          aria-label=${tr("matrix.resizeHint")}
          title=${tr("matrix.resizeHint")}
          @pointerdown=${(event: PointerEvent): void => this.onMatrixResizeStart(event)}
        ></div>
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
              <button
                data-testid="onion-toggle"
                aria-label=${tr("matrix.onion")}
                title=${tr("matrix.onionHint")}
                class=${this.onionEnabled ? "active" : ""}
                @click=${(): void => this.toggleOnionSkinning()}
                >◍</button
              >
              <select
                data-testid="animation-select"
                name="animationSelect"
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
                        @click=${(event: MouseEvent): void => this.onSelectFrameClick(frame, event.shiftKey, event.ctrlKey || event.metaKey)}
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
            ${matrix.rows.map((row) => {
              const layerSelected = this.selectedLayerSet().has(row.layerId);
              return html`
                <div
                  class="anim-layer-name ${layerSelected ? "selected" : ""}"
                  title=${row.layerName}
                  data-testid="anim-layer-name"
                  data-matrix-layer=${row.layerId}
                  data-mask=${row.isMask}
                  role="button"
                  tabindex="0"
                  aria-label=${tr("matrix.layerAria", { name: row.layerName })}
                  @click=${(event: MouseEvent): void =>
                    this.onSelectLayerClick(row.layerId, event.shiftKey, event.ctrlKey || event.metaKey)}
                  @keydown=${(event: KeyboardEvent): void => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      this.onSelectLayer(row.layerId);
                    }
                  }}
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
                  const cellSelected = selectedCellKeys.has(this.cellSelectionKey(cell.layerId, cell.frame));
                  return html`
                    <div
                      class="anim-cell ${cell.contentId !== null ? "filled" : ""} ${isCurrent ? "current-frame" : ""} ${isActive ? "active-cell" : ""} ${inAnimation ? "in-animation" : ""} ${cellSelected ? "selected" : ""}"
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
                      @click=${(event: MouseEvent): void =>
                        this.onSelectCellClick(cell.layerId, cell.frame, event.shiftKey, event.ctrlKey || event.metaKey)}
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
              `;
            })}
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
          <button @click=${(): void => this.openNewAnimationDialog([frame])}>${tr("action.newAnimation")}</button>
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
          <button @click=${(): void => this.onOpenFramesDuration(false)}>${tr("matrix.setDuration")}</button>
          <button @click=${(): void => this.onOpenFramesDuration(true)}>${tr("matrix.setTotalDuration")}</button>
          <button @click=${(): void => this.openNewAnimationDialog([...frames])}>${tr("action.newAnimation")}</button>
        </div>
      `;
    }
    if (this.matrixMenu.kind === "cells") {
      const cells = this.matrixMenu.cells;
      return html`
        <div class="context-blocker" @click=${(): void => this.closeMatrixMenu()} @contextmenu=${(event: Event): void => {
          event.preventDefault();
          this.closeMatrixMenu();
        }}></div>
        <div class="context-menu" style="left: ${this.matrixMenu.x}px; top: ${this.matrixMenu.y}px;">
          <button @click=${(): void => this.unlinkCellContent(cells)}>${tr("action.unlinkCells")}</button>
          <button @click=${(): void => this.openRelinkDialog(cells)}>${tr("action.relinkCells")}</button>
        </div>
      `;
    }
    const menu = this.matrixMenu;
    const cellTextureId =
      menu.kind === "cell" ? this.engine.getCellTextureId(menu.layerId, menu.frame) : null;
    const cellTextId =
      menu.kind === "cell" ? this.engine.getCellTextId(menu.layerId, menu.frame) : null;
    return html`
      <div class="context-blocker" @click=${(): void => this.closeMatrixMenu()} @contextmenu=${(event: Event): void => {
        event.preventDefault();
        this.closeMatrixMenu();
      }}></div>
      <div class="context-menu" style="left: ${menu.x}px; top: ${menu.y}px;">
        <button @click=${(): void => void this.onOpenContentPicker()}>${tr("matrix.selectContent")}</button>
        <button @click=${(): void => void this.onOpenTextPicker()}>${tr("matrix.selectText")}</button>
        <button ?disabled=${cellTextId === null} @click=${(): void => this.onEditTextFromCell()}>
          ${tr("matrix.editText")}
        </button>
        <button ?disabled=${cellTextId === null} @click=${(): void => this.onRasterizeTextFromCell()}>
          ${tr("matrix.rasterizeText")}
        </button>
        <button ?disabled=${cellTextureId === null} @click=${(): void => this.onOpenFitTextureFromCell()}>
          ${tr("ctx.fitTexture")}
        </button>
        <button ?disabled=${cellTextureId === null} @click=${(): void => this.onCropCellToCanvasFromCell()}>
          ${tr("ctx.cropCanvas")}
        </button>
        <button ?disabled=${cellTextureId === null} @click=${(): void => this.onResizeCellToCanvasFromCell()}>
          ${tr("ctx.resizeCanvas")}
        </button>
        <button ?disabled=${cellTextureId === null} @click=${(): void => void this.runAction("adjust-colors")}>
          ${tr("ctx.adjustColors")}
        </button>
        <button ?disabled=${cellTextureId === null} @click=${(): void => void this.runAction("adjust-invert")}>
          ${tr("ctx.invertColors")}
        </button>
        <button @click=${(): void => {
          const target = this.matrixCellTarget();
          if (target !== null) {
            this.unlinkCellContent([target]);
          }
        }}>
          ${tr("action.unlinkCells")}
        </button>
        <button @click=${(): void => {
          const target = this.matrixCellTarget();
          if (target !== null) {
            this.openRelinkDialog([target]);
          }
        }}>
          ${tr("action.relinkCells")}
        </button>
      </div>
    `;
  }

  protected updated(): void {
    this.fitContextMenusToViewport();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.stopUpdateChecker();
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
    // Drop our own reload cache-buster (?v=<sha>) after booting the fresh
    // build so copied/shared URLs stay clean. The versioned URL already did
    // its job (defeated the HTTP/CDN cache for the document); hashed asset
    // names keep everything else fresh from here on.
    try {
      const cleaned = stripReloadCacheBuster(window.location.href);
      if (cleaned !== null) {
        window.history.replaceState(null, "", cleaned);
      }
    } catch {
      // Sandboxed iframes may block history access: the param is harmless.
    }
    this.fsSupported = isFileSystemAccessSupported();
    if (this.shadowRoot !== null) {
      installNumberInputHelpers(this.shadowRoot);
    }
    window.addEventListener("keydown", this.onGlobalKeyDown);
    window.addEventListener("pointerdown", this.onGlobalPointerDown);
    // Desktop-like chrome: no native browser menu on our own buttons and
    // menus (toolbar, menubar, dropdowns, context menus, flyouts). Text
    // fields keep theirs so copy/paste still works.
    this.shadowRoot?.addEventListener("contextmenu", (event: Event): void => {
      if (event.defaultPrevented || this.eventInField(event)) {
        return;
      }
      event.preventDefault();
    });
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
    const storedSwatches = this.loadSwatchSettings();
    this.swatches = storedSwatches.swatches;
    this.recentColors = storedSwatches.recent;
    const storedOnion = this.loadOnionSettings();
    this.onionEnabled = storedOnion.enabled;
    this.onionPast = storedOnion.past;
    this.onionFuture = storedOnion.future;
    this.onionTint = storedOnion.tint;
    const storedBlackSwitch = this.loadBlackSwitchSettings();
    this.colorSwitchOutOfBlack = storedBlackSwitch.switchOutOfBlack;
    const storedLocale = this.loadLocaleSettings();
    this.locale = storedLocale.locale;
    this.applyActiveLocale();
    const storedFit = this.loadFitSettings();
    const storedEmptyCells = this.loadEmptyCellSettings();
    this.emptyCellMode = storedEmptyCells.mode;
    this.fitDefaultThreshold = storedFit.alphaThreshold;
    const storedStorage = this.loadStorageSettings();
    this.storageLossless = storedStorage.lossless;
    this.storageQuality = storedStorage.quality;
    this.storageProjectFile = storedStorage.projectFile;
    this.storageTextStorage = storedStorage.textStorage;
    this.storageSvgStorage = storedStorage.svgStorage;
    this.storageModelLighting = storedStorage.modelLighting;
    this.engine?.setModelLighting(this.storageModelLighting);
    this.storageFormat = storedStorage.format;
    this.storagePngLevel = storedStorage.pngLevel;
    this.storageJpegQuality = storedStorage.jpgQuality;
    this.brushQuality = storedStorage.brushQuality;
    this.importCleanup = this.loadImportCleanup();
    const storedExpand = this.loadExpandSettings();
    this.expandStep = storedExpand.step;
    this.maxBrushSize = this.loadBrushSettings().maxBrushSize;
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
          const drawer = GNUMARUS_TOOL_DRAWERS.find((entry) => entry.tools.includes(tool))?.id;
          if (drawer !== undefined) {
            this.drawerFront = { ...this.drawerFront, [drawer]: tool };
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
        onOpenColorPicker: (clientX, clientY): void => {
          this.openColorPickerAt(clientX, clientY);
        },
        onTransformChanged: (): void => {
          void this.refreshPreview();
        },
        onTextEditRequested: (info): void => {
          this.openTextEditor(info.layerId, info.frame, info.contentId, info.textId);
        },
        onTileBrushOutcome: (outcome): void => {
          if (outcome === "erased") {
            this.statusMessage = tr("status.tileErased");
          } else if (outcome === "no-tileset") {
            this.statusMessage = tr("status.tileNeedsTileset");
            this.showToast(tr("status.tileNeedsTileset"));
          } else if (outcome === "occupied") {
            this.statusMessage = tr("status.tileCellOccupied");
            this.showToast(tr("status.tileCellOccupied"));
          }
        },
        onCropOutcome: (outcome, width, height): void => {
          if (outcome === "cropped") {
            this.statusMessage = tr("status.textureCropped", { w: width, h: height });
            this.dirty = true;
          } else if (outcome === "outside") {
            this.statusMessage = tr("status.cropOutside");
            this.showToast(tr("status.cropOutside"));
          } else if (outcome === "empty") {
            this.statusMessage = tr("status.cropNoTexture");
            this.showToast(tr("status.cropNoTexture"));
          } else {
            this.statusMessage = tr("status.cropInside");
          }
          this.refreshLayers();
        },
        onNotice: (kind): void => {
          if (kind === "text-paint-blocked") {
            this.statusMessage = tr("status.textPaintBlocked");
          } else if (kind === "vector-paint-blocked") {
            this.statusMessage = tr("status.vectorPaintBlocked");
          } else if (kind === "model3d-paint-blocked") {
            this.statusMessage = tr("status.model3dPaintBlocked");
          } else if (kind === "tilemap-paint-blocked") {
            this.statusMessage = tr("status.tilemapPaintBlocked");
          } else if (kind === "tile-rot-needs-square") {
            this.statusMessage = tr("status.tileRotNeedsSquare");
          } else if (kind === "model3d-needs-cell") {
            this.statusMessage = tr("status.model3dNeedsCell");
            this.showToast(tr("status.model3dNeedsCell"));
          }
        },
        onToolSizeChanged: (kind, size): void => {
          if (kind === "brush") {
            this.brushSize = size;
            if (this.brushSizeMin > size) {
              this.brushSizeMin = size;
            }
            this.statusMessage = this.brushSizeStatus();
          } else if (kind === "line") {
            this.lineWidth = size;
            if (this.lineWidthMin > size) {
              this.lineWidthMin = size;
            }
            this.statusMessage = this.lineWidthStatus();
          } else {
            this.curveWidth = size;
            if (this.curveWidthMin > size) {
              this.curveWidthMin = size;
            }
            this.statusMessage = this.curveWidthStatus();
          }
        },
      });
      this.engine.setColor(this.colorValue);
      this.engine.setRotationStepDeg(this.rotationStepDeg);
      this.engine.setViewMinZoom(this.zoomMinPercent / 100);
      this.engine.setStabilizerMode(this.stabilizerMode);
      this.engine.setRopeLength(this.ropeLength);
      this.engine.setFollowStrength(this.followStrength);
      this.engine.setOnionEnabled(this.onionEnabled);
      this.engine.setOnionCounts(this.onionPast, this.onionFuture);
      this.engine.setOnionTint(this.onionTint);
      this.engine.setPencilPixelPerfect(this.pencilPixelPerfect);
      this.engine.setCurvePixelPerfect(this.curvePixelPerfect);
      this.engine.setModelLighting(this.storageModelLighting);
      this.engine.setMaxBrushSize(this.maxBrushSize);
      this.engine.setPixelSprayDensity(this.pixelSprayDensity);
      this.engine.setBrushDither(this.brushDither);
      this.engine.setBrushColorMode(this.brushColorMode);
      this.engine.setShadeDirection(this.shadeDirection);
      this.refreshShadingPalette();
      this.engine.setEmptyCellHold(this.emptyCellMode === "hold");
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
      this.startUpdateChecker();
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
    if (this.isAdjustWindowOpen()) {
      const path = typeof event.composedPath === "function" ? event.composedPath() : [];
      const inAdjustWindow = path.some(
        (node) =>
          node instanceof HTMLElement &&
          node.closest('[data-testid="bc-window"],[data-testid="hs-window"],[data-testid="filter-window"]') !== null,
      );
      if (!inAdjustWindow) {
        const canvas = this.shadowRoot?.querySelector("#canvasHost > canvas") ?? null;
        if (canvas !== null && path.includes(canvas)) {
          // Starting canvas work bakes the live adjustment instead of
          // letting the next preview wipe the new pixels.
          this.confirmBrightnessContrast();
          this.confirmHslAdjust();
          void this.confirmFilter();
        }
      }
    }
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
    return this.fileMenuOpen || this.editMenuOpen || this.toolsMenuOpen || this.helpMenuOpen || this.filterMenuOpen;
  }

  private closeAllMenus(): void {
    this.fileMenuOpen = false;
    this.editMenuOpen = false;
    this.helpMenuOpen = false;
    this.filterMenuOpen = false;
    this.filterSubmenu = null;
    this.toolsMenuOpen = false;
    this.toolsSubmenu = null;
    this.closeDrawerFlyout();
  }

  /** Whether a live adjust floating window is open (keyboard behaves as with a modal dialog). */
  private isAdjustWindowOpen(): boolean {
    return this.bcOpen || this.hsOpen || this.filterOpen;
  }

  /** Drag state for the floating adjust windows (shared like the preview/tile drags). */
  private adjustWindowDragState: {
    which: "bc" | "hs" | "filter";
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null = null;

  /** Header drag moves the floating adjust/filter window (clicks on buttons are ignored). */
  private onAdjustWindowDragStart(event: PointerEvent, which: "bc" | "hs" | "filter"): void {
    const target = event.target as HTMLElement | null;
    if (target !== null && target.closest("button") !== null) {
      return;
    }
    this.adjustWindowDragState = {
      which,
      startX: event.clientX,
      startY: event.clientY,
      originX: which === "bc" ? this.bcWindowX : this.hsWindowX,
      originY: which === "bc" ? this.bcWindowY : this.hsWindowY,
    };
    const move = (moveEvent: PointerEvent): void => {
      const state = this.adjustWindowDragState;
      if (state === null) {
        return;
      }
      const x = Math.max(0, state.originX + (moveEvent.clientX - state.startX));
      const y = Math.max(0, state.originY + (moveEvent.clientY - state.startY));
      if (state.which === "bc") {
        this.bcWindowX = x;
        this.bcWindowY = y;
      } else if (state.which === "hs") {
        this.hsWindowX = x;
        this.hsWindowY = y;
      } else {
        this.filterWindowX = x;
        this.filterWindowY = y;
      }
    };
    const up = (): void => {
      this.adjustWindowDragState = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  /** Polling timer id for the update checker, or null when stopped. */
  private updateTimer: number | null = null;
  /** In-flight guard so slow polls never overlap. */
  private updateCheckInFlight = false;
  /** Test hook: force the check even on localhost (e2e with a mocked API). */
  private updateCheckForced = false;

  /** Queued hue/saturation preview runs (coalesced by the pump). */
  private hsPreviewQueued = 0;
  /** True while a hue/saturation preview compute is in flight. */
  private hsPreviewActive = false;

  /** Embedded build commit SHA (vite define, "unknown" when git was unavailable). */
  private buildSha(): string {
    try {
      const sha = typeof __GNUMARUS_BUILD_SHA__ !== "undefined" ? __GNUMARUS_BUILD_SHA__ : "";
      return /^[0-9a-f]{40}$/i.test(sha) ? sha.toLowerCase() : "";
    } catch {
      return "";
    }
  }

  /**
   * Test hook for e2e: force one update check now and report the status.
   * Bypasses the localhost skip so the suite can mock the commits API.
   */
  async forceUpdateCheck(): Promise<GnumarusUpdateStatus> {
    this.updateCheckForced = true;
    await this.checkForUpdates();
    return this.updateStatus;
  }

  /** Start the continuous update check (immediate check plus polling). */
  private startUpdateChecker(): void {
    this.stopUpdateChecker();
    void this.checkForUpdates();
    this.updateTimer = window.setInterval(() => {
      void this.checkForUpdates();
    }, GNUMARUS_UPDATE_CHECK_MS);
  }

  /** Stop the continuous update check. */
  private stopUpdateChecker(): void {
    if (this.updateTimer !== null) {
      window.clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  /**
   * Reload into the newest deployed build. A plain `location.reload()` can
   * keep serving a fresh-within-max-age cached `index.html` (GitHub Pages
   * sends long cache headers and the file name is stable), booting the old
   * app again with the banner still on. Navigating to the same document
   * with a unique per-click `?v=` tag defeats both browser and CDN caches;
   * the tag is stripped on boot. Content-hashed asset names keep everything
   * else fresh from there on.
   */
  private reloadForUpdate(): void {
    window.location.href = buildCacheBustedReloadUrl(window.location.href, `t${Date.now().toString(36)}`);
  }

  /**
   * Poll the newest master commit and update the banner status. Silent on
   * every failure mode (offline, rate limit, bad payload): the last known
   * status stands until a newer master is actually observed.
   */
  private async checkForUpdates(): Promise<void> {
    if (this.updateCheckInFlight) {
      return;
    }
    if (!this.updateCheckForced && !shouldCheckForUpdates(window.location.hostname, this.buildSha())) {
      return;
    }
    this.updateCheckInFlight = true;
    try {
      // Re-fetch our own document bypassing every cache: its entry-script
      // URL is content-hashed per deploy, so it differs from the running
      // app exactly when a newer build is deployed. No GitHub API involved,
      // hence no rate limits (the old commits-API poll 403'd on busy
      // networks and the banner silently never appeared).
      const documentUrl = new URL("./", window.location.href).toString();
      const response = await fetch(documentUrl, { headers: { Accept: "text/html" }, cache: "no-store" });
      if (!response.ok) {
        return;
      }
      const html = await response.text();
      const latest = extractEntryScriptUrl(html, documentUrl);
      const running = resolveEntryScriptUrl(
        window.document.querySelector("script[type=module][src]")?.getAttribute("src"),
        documentUrl,
      );
      if (latest === null || running === null) {
        return;
      }
      const next: GnumarusUpdateStatus = latest === running ? "current" : "outdated";
      if (next !== this.updateStatus) {
        this.updateStatus = next;
      }
    } catch {
      // Offline or unreachable: keep the last known status silently.
    } finally {
      this.updateCheckInFlight = false;
    }
  }

  /** Header click toggles one menu, closing the others. */
  private toggleMenu(which: "file" | "edit" | "tools" | "help" | "filters"): void {
    const open = !(
      which === "file"
        ? this.fileMenuOpen
        : which === "edit"
          ? this.editMenuOpen
          : which === "tools"
            ? this.toolsMenuOpen
            : which === "help"
              ? this.helpMenuOpen
              : this.filterMenuOpen
    );
    // A menubar menu takes over the screen: dismiss picker popups so they
    // never sit above menu items (their document-click guard may still be
    // swallowing the opening click).
    this.shadowRoot
      ?.querySelectorAll("gnumarus-color-picker")
      .forEach((picker) => (picker as GnumarusColorPicker).closePopup());
    this.closeAllMenus();
    if (which === "file") {
      this.fileMenuOpen = open;
    } else if (which === "edit") {
      this.editMenuOpen = open;
    } else if (which === "tools") {
      this.toolsMenuOpen = open;
      if (open) {
        this.toolsSubmenu = null;
      }
    } else if (which === "help") {
      this.helpMenuOpen = open;
    } else {
      this.filterMenuOpen = open;
      if (open) {
        this.filterSubmenu = null;
      }
    }
  }

  /** Hover switches menus, but only while one is already open. */
  private hoverMenu(which: "file" | "edit" | "tools" | "help" | "filters"): void {
    if (!this.anyMenuOpen()) {
      return;
    }
    this.closeAllMenus();
    if (which === "file") {
      this.fileMenuOpen = true;
    } else if (which === "edit") {
      this.editMenuOpen = true;
    } else if (which === "tools") {
      this.toolsMenuOpen = true;
      this.toolsSubmenu = null;
    } else if (which === "help") {
      this.helpMenuOpen = true;
    } else {
      this.filterMenuOpen = true;
      this.filterSubmenu = null;
    }
  }

  private onGlobalKeyDown = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();
    if ((event.ctrlKey || event.metaKey) && !event.altKey && key === "s") {
      event.preventDefault();
      void this.runAction(this.fsSupported ? "save-project" : "save-embedded-project");
      return;
    }
    if ((event.ctrlKey || event.metaKey) && !event.altKey && key === "e") {
      event.preventDefault();
      this.mergeActiveLayerDown();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && (key === "c" || key === "v" || key === "x")) {
      if (
        this.eventInField(event) ||
        this.eventInColorPicker(event) ||
        this.shadowRoot?.querySelector("dialog[open]") !== null ||
        this.isAdjustWindowOpen()
      ) {
        return;
      }
      event.preventDefault();
      void this.runAction(key === "c" ? "copy-selection" : key === "v" ? "paste" : "cut");
      return;
    }
    if ((event.ctrlKey || event.metaKey) && !event.altKey && event.shiftKey && key === "c") {
      if (
        this.eventInField(event) ||
        this.eventInColorPicker(event) ||
        this.shadowRoot?.querySelector("dialog[open]") !== null ||
        this.isAdjustWindowOpen()
      ) {
        return;
      }
      event.preventDefault();
      void this.runAction("copy-merged");
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && !event.altKey) {
      if (
        this.eventInField(event) ||
        this.eventInColorPicker(event) ||
        this.shadowRoot?.querySelector("dialog[open]") !== null ||
        this.isAdjustWindowOpen()
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
        if (this.engine !== null) {
          if (event.key === "ArrowUp") {
            this.insertLayerAboveActive();
          } else if (event.key === "ArrowDown") {
            this.insertLayerBelowActive();
          } else if (event.key === "ArrowLeft") {
            this.onAddFrameBefore(this.engine.getCurrentFrame());
          } else {
            this.onAddFrameAfter(this.engine.getCurrentFrame());
          }
        }
        return;
      }
    }
    if ((event.ctrlKey || event.metaKey) && event.altKey && !event.shiftKey) {
      if (
        this.eventInField(event) ||
        this.eventInColorPicker(event) ||
        this.shadowRoot?.querySelector("dialog[open]") !== null ||
        this.isAdjustWindowOpen()
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
    if (event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
      if (
        this.eventInField(event) ||
        this.eventInColorPicker(event) ||
        this.shadowRoot?.querySelector("dialog[open]") !== null ||
        this.isAdjustWindowOpen()
      ) {
        return;
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        if (event.key === "ArrowLeft") {
          this.outdentActiveLayer();
        } else {
          this.indentActiveLayer();
        }
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
    if (
      this.tool === "flycam" &&
      !this.eventInField(event) &&
      !this.eventInColorPicker(event) &&
      this.shadowRoot?.querySelector("dialog[open]") === null &&
      !this.isAdjustWindowOpen()
    ) {
      // Fly-camera mode owns every plain key: WASDQE fly, ZC orbit, JL
      // turn, IK pitch, R resets, Esc exits. Dialogs and text fields keep working above it.
      // All other editor shortcuts stay suppressed while flying (Ctrl
      // combos handled above still apply).
      this.handleFlycamKey(event);
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if ((event.key === "x" || event.key === "X") && !event.ctrlKey && !event.metaKey && !event.altKey) {
      // X swaps the foreground/background paint colors everywhere except
      // while flying (suppressed like every other editor shortcut), in
      // text fields and color pickers, and with dialogs open.
      if (
        !this.eventInField(event) &&
        !this.eventInColorPicker(event) &&
        this.shadowRoot?.querySelector("dialog[open]") === null &&
        !this.isAdjustWindowOpen()
      ) {
        this.swapPaintColors();
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
    }
    if (event.key === "Tab") {
      if (
        this.shadowRoot?.querySelector("dialog[open]") !== null ||
        this.isAdjustWindowOpen() ||
        this.eventInField(event)
      ) {
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
      // Floating adjust windows have no native Esc handling: revert them
      // here when no modal dialog is open (a modal consumes Esc itself).
      if (this.shadowRoot?.querySelector("dialog[open]") === null) {
        this.cancelBrightnessContrast();
        this.cancelHslAdjust();
      }
      return;
    }
    if (event.ctrlKey || event.altKey || event.metaKey) {
      return;
    }
    if (this.shadowRoot?.querySelector("dialog[open]") !== null || this.isAdjustWindowOpen()) {
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
  private eventInField(event: Event): boolean {    if (typeof event.composedPath === "function") {
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
    this.selectSingleLayer(target.id);
    this.refreshLayers();
    this.showToast(this.layerToastFor(next, this.layers.length, target.name));
  }

  private insertLayerAboveActive(): void {
    if (this.engine === null) {
      return;
    }
    const id = this.engine.insertLayerAboveActive();
    this.selectSingleLayer(id);
    this.refreshLayers();
    this.dirty = true;
    this.statusMessage = tr("status.layerAdded");
  }

  /** Insert a new layer immediately below the active layer and select it. */
  private insertLayerBelowActive(): void {
    if (this.engine === null) {
      return;
    }
    const id = this.engine.insertLayerBelowActive();
    this.selectSingleLayer(id);
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

  /** Alt+Left: lift the active layer out below its old parent. */
  private outdentActiveLayer(): void {
    if (this.engine === null) {
      return;
    }
    const id = this.engine.getActiveLayerId();
    const parent = this.layers.find((entry) => entry.id === id)?.parentId ?? null;
    if (parent === null) {
      this.statusMessage = tr("status.layerAlreadyRoot");
      return;
    }
    const parentName = this.layers.find((entry) => entry.id === parent)?.name ?? parent;
    if (this.engine.outdentLayerBelowParent(id)) {
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage = tr("status.layerNestedOut", { name: parentName });
    }
  }

  /** Alt+Right: nest the active layer into the sibling above it. */
  private indentActiveLayer(): void {
    if (this.engine === null) {
      return;
    }
    const id = this.engine.getActiveLayerId();
    if (this.engine.indentLayerIntoAboveSibling(id)) {
      const parent = this.layers.find((entry) => entry.id === id)?.parentId ?? null;
      const parentName = this.layers.find((entry) => entry.id === parent)?.name ?? parent ?? id;
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage = tr("status.layerNestedIn", { name: parentName });
    } else {
      this.statusMessage = tr("status.layerNestNoAbove");
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
    this.newPreset = DEFAULT_NEW_PROJECT_PRESET;
    const applied = applyNewProjectPreset(this.newPreset);
    if (applied !== null) {
      this.newWidth = applied.width;
      this.newHeight = applied.height;
      this.newStorageFormat = applied.format;
      this.newStorageLossless = applied.lossless;
      this.newStorageQuality = applied.quality;
    }
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
    const width = clampLayerDim(Number(widthInput?.value ?? "1"));
    const height = clampLayerDim(Number(heightInput?.value ?? "1"));
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
      id: "save-project-as",
      name: tr("menu.saveProjectAs"),
      requirements: [],
      run: (): void => {
        void this.saveProjectAs();
      },
    });
    this.actionRegistry.register({
      id: "upload-project",
      name: tr("menu.uploadProject"),
      requirements: [],
      run: (): void => {
        void this.uploadEmbeddedProject();
      },
    });
    this.actionRegistry.register({
      id: "open-embedded-project",
      name: tr("menu.openEmbeddedProject"),
      requirements: [],
      run: (): void => {
        void this.openEmbeddedProjectDialog();
      },
    });
    this.actionRegistry.register({
      id: "save-embedded-project",
      name: tr("menu.saveEmbeddedProject"),
      requirements: [],
      run: (): void => {
        void this.saveEmbeddedProject();
      },
    });
    this.actionRegistry.register({
      id: "save-embedded-project-as",
      name: tr("menu.saveEmbeddedProjectAs"),
      requirements: [],
      run: (): void => {
        void this.openSaveEmbeddedAsDialog();
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
      id: "import-svg",
      name: tr("menu.importSvg"),
      requirements: [],
      run: (): void => {
        void this.importSvgFile();
      },
    });
    this.actionRegistry.register({
      id: "import-3d-model",
      name: tr("menu.importModel3d"),
      requirements: [],
      run: (): void => {
        void this.importModel3dFile();
      },
    });
    this.actionRegistry.register({
      id: "import-image",
      name: tr("menu.importImage"),
      requirements: [],
      run: (): void => {
        void this.importImageAsLayerFile();
      },
    });
    this.actionRegistry.register({
      id: "content-manager",
      name: tr("menu.contentManager"),
      requirements: [],
      run: (): void => {
        this.openContentManager();
      },
    });
    this.actionRegistry.register({
      id: "undo",
      name: tr("menu.undo"),
      requirements: [],
      run: (): void => {
        this.doUndo();
      },
    });
    this.actionRegistry.register({
      id: "redo",
      name: tr("menu.redo"),
      requirements: [],
      run: (): void => {
        this.doRedo();
      },
    });
    this.actionRegistry.register({
      id: "cut",
      name: tr("menu.cut"),
      requirements: [requireFloatingSelection()],
      run: (): void => {
        this.cutSelectionToMemory();
      },
    });
    this.actionRegistry.register({
      id: "copy-selection",
      name: tr("menu.copySelection"),
      requirements: [requireFloatingSelection()],
      run: (): void => {
        this.copySelectionToMemory();
      },
    });
    this.actionRegistry.register({
      id: "create-brush-from-selection",
      name: tr("menu.createBrushFromSelection"),
      requirements: [requireFloatingSelection()],
      run: (): void => {
        this.createBrushFromSelection();
      },
    });
    this.actionRegistry.register({
      id: "copy-merged",
      name: tr("menu.copyMerged"),
      requirements: [],
      run: (): void => {
        this.copyMergedToMemory();
      },
    });
    this.actionRegistry.register({
      id: "paste",
      name: tr("menu.paste"),
      requirements: [requireClipboard()],
      run: (): void => {
        this.pasteFromMemory();
      },
    });
    this.actionRegistry.register({
      id: "settings",
      name: tr("menu.settings"),
      requirements: [],
      run: (): void => {
        this.openSettingsDialog();
      },
    });
    this.actionRegistry.register({
      id: "shortcuts",
      name: tr("menu.shortcuts"),
      requirements: [],
      run: (): void => {
        this.openShortcutsDialog();
      },
    });
    this.actionRegistry.register({
      id: "manual",
      name: tr("menu.manual"),
      requirements: [],
      run: (): void => {
        this.openManual();
      },
    });
    this.actionRegistry.register({
      id: "source-code",
      name: tr("menu.sourceCode"),
      requirements: [],
      run: (): void => {
        this.openSourceCode();
      },
    });
    // No point offering a ride to where we already are.
    if (!isGitHubPagesDeploy(window.location.hostname, window.location.pathname)) {
      this.actionRegistry.register({
        id: "github-pages-deploy",
        name: tr("menu.githubPagesDeploy"),
        requirements: [],
        run: (): void => {
          this.openGitHubPagesDeploy();
        },
      });
    }
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
      id: "adjust-invert",
      name: tr("action.invert"),
      requirements: [],
      run: (): void => {
        this.adjustCellInvert();
      },
    });
    this.actionRegistry.register({
      id: "adjust-colors",
      name: tr("action.adjust"),
      requirements: [],
      run: (): void => {
        void this.openAdjustColorsDialog();
      },
    });
    this.actionRegistry.register({
      id: "adjust-brightness-contrast",
      name: tr("action.brightnessContrast"),
      requirements: [],
      run: (): void => {
        void this.openBrightnessContrastDialog();
      },
    });
    this.actionRegistry.register({
      id: "adjust-hue-saturation",
      name: tr("action.hueSaturation"),
      requirements: [],
      run: (): void => {
        void this.openHslAdjustDialog();
      },
    });
    for (const def of GNUMARUS_FILTERS) {
      this.actionRegistry.register({
        id: `filter-${def.id}`,
        name: tr(("filter." + def.id) as GnumarusMessageKey),
        requirements: [],
        run: (): void => {
          void this.openFilterDialog(def.id);
        },
      });
    }
    for (const tool of this.allMenuTools()) {
      this.actionRegistry.register({
        id: `tool-${tool}`,
        name: this.toolMenuLabel(tool),
        requirements: [],
        run: (): void => {
          this.activateToolFromMenu(tool);
        },
      });
    }
    this.actionRegistry.register({
      id: "crop-all-cells-to-canvas",
      name: tr("action.cropAll"),
      requirements: [],
      run: (): void => {
        this.cropAllCellsToCanvas();
      },
    });
    this.actionRegistry.register({
      id: "new-animation",
      name: tr("action.newAnimation"),
      requirements: [],
      run: (): void => {
        this.openNewAnimationDialog([...this.selectedFrameSet()]);
      },
    });
    this.actionRegistry.register({
      id: "reload-all-contents",
      name: tr("action.reloadContents"),
      requirements: [],
      run: (): void => {
        void this.reloadAllContents();
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
    this.actionRegistry.register({
      id: "unlink-cell-content",
      name: tr("action.unlinkCells"),
      requirements: [],
      run: (): void => {
        this.unlinkCellContent(this.resolveCellActionTargets());
      },
    });
    this.actionRegistry.register({
      id: "relink-cell-content",
      name: tr("action.relinkCells"),
      requirements: [],
      run: (): void => {
        this.openRelinkDialog(this.resolveCellActionTargets());
      },
    });
    this.actionRegistry.register({
      id: "set-total-duration",
      name: tr("action.totalDuration"),
      requirements: [],
      run: (): void => {
        this.openTotalDurationFromSelection();
      },
    });
    this.actionRegistry.register({
      id: "make-root-layer",
      name: tr("action.makeRoot"),
      requirements: [],
      run: (): void => {
        this.makeActiveLayerRoot();
      },
    });
    this.actionRegistry.register({
      id: "toggle-layer-mask",
      name: tr("action.toggleLayerMask"),
      requirements: [],
      run: (): void => {
        this.toggleActiveLayerMask();
      },
    });
  }

  private actionContext(): GnumarusActionContext {
    return {
      tool: this.tool,
      hasFloatingSelection: this.engine?.hasFloatingSelection() ?? false,
      hasClipboard: this.engine?.hasClipboard() ?? false,
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
    if (this.shadowRoot?.querySelector("dialog[open]") !== null || this.isAdjustWindowOpen()) {
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

  /** Cut the active floating selection into memory and discard it. */
  private cutSelectionToMemory(): boolean {
    this.editMenuOpen = false;
    this.fileMenuOpen = false;
    if (this.engine?.cutFloatingSelection() !== true) {
      this.showToast(tr("status.copySelectionEmpty"));
      return false;
    }
    this.statusMessage = tr("status.cut");
    return true;
  }

  /** Copy the active floating selection into memory (error toast without one). */
  private copySelectionToMemory(): boolean {
    this.editMenuOpen = false;
    this.fileMenuOpen = false;
    if (this.engine?.copyFloatingSelection() !== true) {
      this.showToast(tr("status.copySelectionEmpty"));
      return false;
    }
    this.statusMessage = tr("status.copySelection");
    return true;
  }

  /** Copy the visible composite (floating box or full canvas) into memory. */
  private copyMergedToMemory(): boolean {
    this.editMenuOpen = false;
    this.fileMenuOpen = false;
    if (this.engine?.copyMergedSelection() !== true) {
      this.showToast(tr("status.copyFailed"));
      return false;
    }
    this.statusMessage = tr("status.copyMerged");
    return true;
  }

  /** Paste copy memory as a floating selection in the current cell. */
  private pasteFromMemory(): boolean {
    this.editMenuOpen = false;
    this.fileMenuOpen = false;
    if (this.engine?.pasteClipboard() !== true) {
      this.showToast(tr("status.pasteBlocked"));
      return false;
    }
    return true;
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

  private loadBlackSwitchSettings(): { switchOutOfBlack: boolean } {
    try {
      const stored = window.localStorage.getItem(BLACK_SWITCH_SETTINGS_STORAGE_KEY);
      if (stored !== null) {
        return parseBlackSwitchSettings(stored);
      }
    } catch {
      // Corrupt or unavailable storage falls back to defaults.
    }
    return { ...DEFAULT_BLACK_SWITCH_SETTINGS };
  }

  private persistBlackSwitch(): void {
    try {
      window.localStorage.setItem(
        BLACK_SWITCH_SETTINGS_STORAGE_KEY,
        serializeBlackSwitchSettings({ switchOutOfBlack: this.colorSwitchOutOfBlack }),
      );
    } catch {
      // Storage failures must not break the settings flow.
    }
  }

  private applyBlackSwitchFromDialog(): void {
    const input = this.shadowRoot?.getElementById("blackSwitchOutOfBlack") as HTMLInputElement | null;
    this.colorSwitchOutOfBlack = input?.checked ?? this.colorSwitchOutOfBlack;
    this.persistBlackSwitch();
  }

  private resetBlackSwitchToDefault(): void {
    this.colorSwitchOutOfBlack = DEFAULT_BLACK_SWITCH_SETTINGS.switchOutOfBlack;
    this.persistBlackSwitch();
  }

  private loadOnionSettings(): { enabled: boolean; past: number; future: number; tint: boolean } {
    try {
      const stored = window.localStorage.getItem(ONION_SETTINGS_STORAGE_KEY);
      if (stored !== null) {
        return parseOnionSettings(stored);
      }
    } catch {
      // Corrupt or unavailable storage falls back to defaults.
    }
    return { ...DEFAULT_ONION_SETTINGS };
  }

  private persistOnion(): void {
    try {
      window.localStorage.setItem(
        ONION_SETTINGS_STORAGE_KEY,
        serializeOnionSettings({
          enabled: this.onionEnabled,
          past: this.onionPast,
          future: this.onionFuture,
          tint: this.onionTint,
        }),
      );
    } catch {
      // Storage failures must not break the settings flow.
    }
  }

  /** Test hook: set the onion skinning state (enabled, past/future counts, tint). */
  setOnionState(enabled: boolean, past: number, future: number, tint: boolean): void {
    this.onionEnabled = enabled === true;
    this.onionPast = Math.min(8, Math.max(0, Math.floor(past)));
    this.onionFuture = Math.min(8, Math.max(0, Math.floor(future)));
    this.onionTint = tint !== false;
    this.engine?.setOnionEnabled(this.onionEnabled);
    this.engine?.setOnionCounts(this.onionPast, this.onionFuture);
    this.engine?.setOnionTint(this.onionTint);
    this.persistOnion();
    this.refreshLayers();
  }

  /** Matrix corner action: toggle onion skinning ghosts. */
  private toggleOnionSkinning(): void {
    this.setOnionState(!this.onionEnabled, this.onionPast, this.onionFuture, this.onionTint);
    this.statusMessage = this.onionEnabled ? tr("status.onionOn") : tr("status.onionOff");
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

  private currentDialogOnionState(): { enabled: boolean; past: number; future: number; tint: boolean } {
    const enabledInput = this.shadowRoot?.getElementById("onionEnabled") as HTMLInputElement | null;
    const pastInput = this.shadowRoot?.getElementById("onionPast") as HTMLInputElement | null;
    const futureInput = this.shadowRoot?.getElementById("onionFuture") as HTMLInputElement | null;
    const tintInput = this.shadowRoot?.getElementById("onionTint") as HTMLInputElement | null;
    const count = (input: HTMLInputElement | null, fallback: number): number => {
      const parsed = Math.floor(Number(input?.value ?? String(fallback)));
      return Number.isFinite(parsed) ? Math.min(8, Math.max(0, parsed)) : fallback;
    };
    return {
      enabled: enabledInput?.checked === true,
      past: count(pastInput, this.onionPast),
      future: count(futureInput, this.onionFuture),
      tint: tintInput?.checked !== false,
    };
  }

  private applyOnionFromDialog(): void {
    const next = this.currentDialogOnionState();
    this.onionEnabled = next.enabled;
    this.onionPast = next.past;
    this.onionFuture = next.future;
    this.onionTint = next.tint;
    this.engine?.setOnionEnabled(next.enabled);
    this.engine?.setOnionCounts(next.past, next.future);
    this.engine?.setOnionTint(next.tint);
    this.persistOnion();
    this.refreshLayers();
    this.statusMessage = next.enabled ? tr("status.onionOn") : tr("status.onionOff");
  }

  private resetOnionToDefault(): void {
    this.setOnionState(
      DEFAULT_ONION_SETTINGS.enabled,
      DEFAULT_ONION_SETTINGS.past,
      DEFAULT_ONION_SETTINGS.future,
      DEFAULT_ONION_SETTINGS.tint,
    );
    this.statusMessage = tr("status.onionOff");
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

  private loadEmptyCellSettings(): { mode: GnumarusEmptyCellMode } {
    try {
      const stored = window.localStorage.getItem(EMPTY_CELL_SETTINGS_STORAGE_KEY);
      if (stored !== null) {
        return parseEmptyCellSettings(stored);
      }
    } catch {
      // Corrupt or unavailable storage falls back to defaults.
    }
    return { ...DEFAULT_EMPTY_CELL_SETTINGS };
  }

  private persistEmptyCells(): void {
    try {
      window.localStorage.setItem(
        EMPTY_CELL_SETTINGS_STORAGE_KEY,
        serializeEmptyCellSettings({ mode: this.emptyCellMode }),
      );
    } catch {
      // Storage failures must not break the settings flow.
    }
  }

  private applyEmptyCellFromDialog(): void {
    const select = this.shadowRoot?.getElementById("emptyCellMode") as HTMLSelectElement | null;
    this.emptyCellMode = parseEmptyCellMode(select?.value ?? this.emptyCellMode);
    this.engine?.setEmptyCellHold(this.emptyCellMode === "hold");
    this.persistEmptyCells();
  }

  private resetEmptyCellsToDefault(): void {
    this.emptyCellMode = DEFAULT_EMPTY_CELL_SETTINGS.mode;
    this.engine?.setEmptyCellHold(this.emptyCellMode === "hold");
    this.persistEmptyCells();
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
          textStorage: this.storageTextStorage,
          svgStorage: this.storageSvgStorage,
          modelLighting: this.storageModelLighting,
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
      this.storageProjectFile === DEFAULT_STORAGE_SETTINGS.projectFile &&
      this.storageTextStorage === DEFAULT_STORAGE_SETTINGS.textStorage &&
      this.storageSvgStorage === DEFAULT_STORAGE_SETTINGS.svgStorage &&
      this.storageModelLighting === DEFAULT_STORAGE_SETTINGS.modelLighting
    );
  }

  private currentDialogProjectFile(): GnumarusProjectFileFormat {
    const input = this.shadowRoot?.getElementById("storageProjectFile") as HTMLSelectElement | null;
    return parseProjectFileFormat(input?.value ?? this.storageProjectFile);
  }

  private currentDialogTextStorage(): GnumarusTextStorage {
    const input = this.shadowRoot?.getElementById("storageTextStorage") as HTMLSelectElement | null;
    return parseTextStorage(input?.value ?? this.storageTextStorage);
  }

  private currentDialogSvgStorage(): GnumarusSvgStorage {
    const input = this.shadowRoot?.getElementById("storageSvgStorage") as HTMLSelectElement | null;
    return parseSvgStorage(input?.value ?? this.storageSvgStorage);
  }

  private currentDialogModelLighting(): GnumarusModelLighting {
    const input = this.shadowRoot?.getElementById("storageModelLighting") as HTMLSelectElement | null;
    return parseModelLighting(input?.value ?? this.storageModelLighting);
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
    if (shape === "line") {
      return tr("val.line");
    }
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
    this.storageTextStorage = this.currentDialogTextStorage();
    this.storageSvgStorage = this.currentDialogSvgStorage();
    this.storageModelLighting = this.currentDialogModelLighting();
    this.engine?.setModelLighting(this.storageModelLighting);
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
    this.storageTextStorage = DEFAULT_STORAGE_SETTINGS.textStorage;
    this.storageSvgStorage = DEFAULT_STORAGE_SETTINGS.svgStorage;
    this.storageModelLighting = DEFAULT_STORAGE_SETTINGS.modelLighting;
    this.engine?.setModelLighting(this.storageModelLighting);
    this.brushQuality = DEFAULT_STORAGE_SETTINGS.brushQuality;
    this.persistStorage();
    this.statusMessage = tr("status.storageReset");
  }

  /** Test hook: set the vector graphic storage mode (raw/compressed/embedded). */
  setSvgStorage(svgStorage: string): void {
    this.storageSvgStorage = parseSvgStorage(svgStorage);
    this.persistStorage();
    this.statusMessage = this.storageStatusMessage();
  }

  /** Test hook: set the 3D model lighting mode (unlit/lit). */
  setModelLighting(modelLighting: string): void {
    this.storageModelLighting = parseModelLighting(modelLighting);
    this.persistStorage();
    this.engine?.setModelLighting(this.storageModelLighting);
    this.statusMessage = this.storageStatusMessage();
  }

  /** Test hook: set the brush size ceiling (1..2048, default 512). */
  setMaxBrushSize(size: number): void {
    this.maxBrushSize = clampMaxBrushSize(size);
    this.persistBrush();
    this.engine?.setMaxBrushSize(this.maxBrushSize);
    this.statusMessage = tr("status.brushMaxSize", { value: this.maxBrushSize });
  }

  /** Test hook: set project texture storage (format, JXL mode/quality, PNG level, JPEG quality, brush JXL quality, text storage). */
  setProjectStorage(
    lossless: boolean,
    quality: number,
    format: GnumarusStorageFormat = DEFAULT_STORAGE_SETTINGS.format,
    pngLevel = DEFAULT_STORAGE_SETTINGS.pngLevel,
    jpgQuality = DEFAULT_STORAGE_SETTINGS.jpgQuality,
    brushQuality = DEFAULT_STORAGE_SETTINGS.brushQuality,
    projectFile: GnumarusProjectFileFormat = DEFAULT_STORAGE_SETTINGS.projectFile,
    textStorage: GnumarusTextStorage = DEFAULT_STORAGE_SETTINGS.textStorage,
    svgStorage: GnumarusSvgStorage = DEFAULT_STORAGE_SETTINGS.svgStorage,
    modelLighting: GnumarusModelLighting = DEFAULT_STORAGE_SETTINGS.modelLighting,
  ): void {
    this.storageProjectFile = parseProjectFileFormat(projectFile);
    this.storageTextStorage = parseTextStorage(textStorage);
    this.storageSvgStorage = parseSvgStorage(svgStorage);
    this.storageModelLighting = parseModelLighting(modelLighting);
    this.storageFormat = parseStorageFormat(format);
    this.storageLossless = lossless;
    this.storageQuality = clampStorageQuality(quality);
    this.storagePngLevel = clampStoragePngLevel(pngLevel);
    this.storageJpegQuality = clampStorageJpgQuality(jpgQuality);
    this.brushQuality = clampBrushQuality(brushQuality);
    this.persistStorage();
    this.engine?.setModelLighting(this.storageModelLighting);
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

  private loadBrushSettings(): { maxBrushSize: number } {
    try {
      const stored = window.localStorage.getItem(BRUSH_SETTINGS_STORAGE_KEY);
      if (stored !== null) {
        return parseBrushSettings(stored);
      }
    } catch {
      // Corrupt or unavailable storage falls back to defaults.
    }
    return { ...DEFAULT_BRUSH_SETTINGS };
  }

  private persistBrush(): void {
    try {
      window.localStorage.setItem(
        BRUSH_SETTINGS_STORAGE_KEY,
        serializeBrushSettings({ maxBrushSize: this.maxBrushSize }),
      );
    } catch {
      // Storage failures must not break the settings flow.
    }
  }

  private currentDialogMaxBrushSize(): number {
    const input = this.shadowRoot?.getElementById("brushMaxSize") as HTMLInputElement | null;
    const parsed = Number(input?.value ?? String(DEFAULT_BRUSH_SETTINGS.maxBrushSize));
    return clampMaxBrushSize(Number.isFinite(parsed) ? parsed : DEFAULT_BRUSH_SETTINGS.maxBrushSize);
  }

  private applyBrushFromDialog(): void {
    this.maxBrushSize = this.currentDialogMaxBrushSize();
    this.persistBrush();
    this.engine?.setMaxBrushSize(this.maxBrushSize);
    this.statusMessage = tr("status.brushMaxSize", { value: this.maxBrushSize });
  }

  private resetBrushMaxToDefault(): void {
    this.maxBrushSize = DEFAULT_BRUSH_SETTINGS.maxBrushSize;
    this.persistBrush();
    this.engine?.setMaxBrushSize(this.maxBrushSize);
    this.statusMessage = tr("status.brushMaxSize", { value: this.maxBrushSize });
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
    this.pushRecentColor(this.colorValue);
  }

  /** Swap the foreground and background paint colors (X key). */
  private swapPaintColors(): void {
    const foreground = this.secondaryColorValue;
    this.secondaryColorValue = this.colorValue;
    this.setPencilColor(foreground);
    this.statusMessage = tr("status.colorsSwapped");
  }

  /** Remember a color in the recents row (dedupe, newest first, capped). */
  private pushRecentColor(hex: string): void {
    const normalized = normalizeSwatchHex(hex);
    if (normalized === null) {
      return;
    }
    const rest = this.recentColors.filter((entry) => entry !== normalized);
    this.recentColors = [normalized, ...rest].slice(0, GNUMARUS_MAX_RECENT_COLORS);
    this.persistSwatches();
  }

  /** Open the paint color picker popup at a viewport position (canvas right-click). */
  private openColorPickerAt(clientX: number, clientY: number): void {
    this.pickerTarget = "foreground";
    const picker = this.shadowRoot?.getElementById("pencilColor") as GnumarusColorPicker | null;
    if (picker !== null) {
      picker.value = this.colorValue;
      picker.openAt(clientX, clientY);
    }
  }

  /** Open the paint color picker popup for one well, anchored under it. */
  private openWellPicker(target: "foreground" | "background", anchor: HTMLElement): void {
    this.pickerTarget = target;
    const picker = this.shadowRoot?.getElementById("pencilColor") as GnumarusColorPicker | null;
    if (picker === null) {
      return;
    }
    picker.value = target === "background" ? this.secondaryColorValue : this.colorValue;
    const rect = anchor.getBoundingClientRect();
    picker.openAt(rect.left, rect.bottom);
  }

  /** Add the current paint color to the saved swatches (dedupe, capped). */
  private addSwatch(hex: string): void {
    const normalized = normalizeSwatchHex(hex);
    if (normalized === null || this.swatches.includes(normalized)) {
      return;
    }
    this.swatches = [...this.swatches, normalized].slice(0, GNUMARUS_MAX_SWATCHES);
    this.persistSwatches();
    this.statusMessage = tr("status.swatchAdded", { hex: normalized });
  }

  /** Remove one saved swatch by hex. */
  private removeSwatch(hex: string): void {
    const normalized = normalizeSwatchHex(hex);
    if (normalized === null || !this.swatches.includes(normalized)) {
      return;
    }
    this.swatches = this.swatches.filter((entry) => entry !== normalized);
    this.persistSwatches();
  }

  private loadSwatchSettings(): { swatches: string[]; recent: string[] } {
    try {
      const stored = window.localStorage.getItem(SWATCH_SETTINGS_STORAGE_KEY);
      if (stored !== null) {
        return parseSwatchSettings(stored);
      }
    } catch {
      // Corrupt or unavailable storage falls back to empty lists.
    }
    return { swatches: [], recent: [] };
  }

  private persistSwatches(): void {
    try {
      window.localStorage.setItem(
        SWATCH_SETTINGS_STORAGE_KEY,
        serializeSwatchSettings({ swatches: this.swatches, recent: this.recentColors }),
      );
    } catch {
      // Storage failures must not break the settings flow.
    }
  }

  /** Test hook: set the brush size (floats 0.1..64, clamped). */
  setBrushSize(size: number): void {
    const clamped = clampBrushSizeFloat(size, this.maxBrushSize);
    this.brushSize = clamped;
    if (this.brushSizeMin > clamped) {
      this.brushSizeMin = clamped;
      this.engine?.setBrushSizeMin(clamped);
    }
    this.engine?.setBrushSize(clamped);
    this.statusMessage = this.brushSizeStatus();
  }

  /** Test hook: set the minimum brush size (floats 0.1..max, clamped). */
  setBrushSizeMin(size: number): void {
    const clamped = Math.min(clampBrushSizeFloat(size, this.maxBrushSize), this.brushSize);
    this.brushSizeMin = clamped;
    this.engine?.setBrushSizeMin(clamped);
    this.statusMessage = this.brushSizeStatus();
  }

  /** Test hook: set the brush shape (square/circle/line, defaults to square). */
  setBrushShape(shape: GnumarusBrushShape): void {
    const parsed = parseBrushShape(shape);
    this.brushShape = parsed;
    this.engine?.setBrushShape(parsed);
    this.statusMessage = tr("status.brushShape", { value: this.shapeLabel(parsed) });
  }

  /** Test hook: set the fixed dab rotation in degrees (-180..180). */
  setBrushAngle(degrees: number): void {
    const clamped = clampBrushAngle(degrees);
    this.brushAngle = clamped;
    this.engine?.setBrushAngle(clamped);
    this.statusMessage = tr("status.brushAngle", { value: String(clamped) });
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

  private openPaintTipPicker(scope = ""): void {
    const input = this.shadowRoot?.getElementById("paintTipImport" + scope) as HTMLInputElement | null;
    input?.click();
  }

  private async importPaintTipFromDialog(scope = ""): Promise<void> {
    const input = this.shadowRoot?.getElementById("paintTipImport" + scope) as HTMLInputElement | null;
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

  private currentDialogBrushSize(scope = ""): number {
    const input = this.shadowRoot?.getElementById("brushSize" + scope) as HTMLInputElement | null;
    const parsed = Number(input?.value ?? "1");
    return clampBrushSizeFloat(Number.isFinite(parsed) ? parsed : 1, this.maxBrushSize);
  }

  private currentDialogBrushShape(scope = ""): GnumarusBrushShape {
    const select = this.shadowRoot?.getElementById("brushShape" + scope) as HTMLSelectElement | null;
    return parseBrushShape(select?.value ?? "square");
  }

  private brushSizeStatus(): string {
    return this.brushSizeMin === this.brushSize
      ? tr("status.brushSize", { value: this.brushSize })
      : tr("status.brushSizeRange", { min: this.brushSizeMin, max: this.brushSize });
  }

  private lineWidthStatus(): string {
    return this.lineWidthMin === this.lineWidth
      ? tr("status.lineWidth", { value: this.lineWidth })
      : tr("status.lineWidthRange", { min: this.lineWidthMin, max: this.lineWidth });
  }

  private curveWidthStatus(): string {
    return this.curveWidthMin === this.curveWidth
      ? tr("status.curveWidth", { value: this.curveWidth })
      : tr("status.curveWidthRange", { min: this.curveWidthMin, max: this.curveWidth });
  }

  private applyBrushSizeFromDialog(scope = ""): void {
    const size = this.currentDialogBrushSize(scope);
    this.brushSize = size;
    if (this.brushSizeMin > size) {
      this.brushSizeMin = size;
      this.engine?.setBrushSizeMin(size);
    }
    this.engine?.setBrushSize(size);
    this.statusMessage = this.brushSizeStatus();
  }

  private currentDialogBrushSizeMin(scope = ""): number {
    const input = this.shadowRoot?.getElementById("brushSizeMin" + scope) as HTMLInputElement | null;
    const parsed = Number(input?.value ?? "1");
    return clampBrushSizeFloat(Number.isFinite(parsed) ? parsed : 1, this.maxBrushSize);
  }

  private applyBrushSizeMinFromDialog(scope = ""): void {
    const size = Math.min(this.currentDialogBrushSizeMin(scope), this.brushSize);
    this.brushSizeMin = size;
    this.engine?.setBrushSizeMin(size);
    this.statusMessage = this.brushSizeStatus();
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

  private applyBrushShapeFromDialog(scope = ""): void {
    const shape = this.currentDialogBrushShape(scope);
    this.brushShape = shape;
    this.engine?.setBrushShape(shape);
    this.statusMessage = tr("status.brushShape", { value: this.shapeLabel(shape) });
  }

  private applyBrushAngleFromDialog(scope = ""): void {
    const input = this.shadowRoot?.getElementById("brushAngle" + scope) as HTMLInputElement | null;
    const raw = Number(input?.value ?? "0");
    const clamped = Number.isFinite(raw) ? Math.min(180, Math.max(-180, Math.round(raw))) : 0;
    this.brushAngle = clamped;
    this.engine?.setBrushAngle(clamped);
    this.statusMessage = tr("status.brushAngle", { value: String(clamped) });
  }

  private applyBrushSourceFromDialog(scope = ""): void {
    const select = this.shadowRoot?.getElementById("brushSource" + scope) as HTMLSelectElement | null;
    this.setBrushSource(parseBrushSource(select?.value ?? "tip"));
  }

  /** Test hook: select the pixel tip ("tip") or the captured selection ("selection"). */
  setBrushSource(source: GnumarusBrushSource): void {
    const parsed = parseBrushSource(source);
    if (parsed === "selection" && !this.hasSelectionBrush()) {
      this.statusMessage = tr("status.noFloatingSelection");
      return;
    }
    this.brushSource = parsed;
    this.engine?.setBrushSource(parsed);
    this.statusMessage = tr("status.brushSource", { value: this.brushSourceLabel(parsed) });
  }

  /** Translated label for a brush-source value. */
  private brushSourceLabel(source: GnumarusBrushSource): string {
    return tr(source === "selection" ? "val.selectionBrush" : "val.tip");
  }

  private applySelectionBrushModeFromDialog(scope = ""): void {
    const select = this.shadowRoot?.getElementById("brushMode" + scope) as HTMLSelectElement | null;
    this.setSelectionBrushMode(parseSelectionBrushMode(select?.value ?? "stamp"));
  }

  /** Test hook: set how a captured selection brush paints. */
  setSelectionBrushMode(mode: GnumarusSelectionBrushMode): void {
    const parsed = parseSelectionBrushMode(mode);
    this.selectionBrushMode = parsed;
    this.engine?.setSelectionBrushMode(parsed);
    this.statusMessage = tr("status.brushMode", { value: this.brushModeLabel(parsed) });
  }

  /** Translated label for a selection-brush mode value. */
  private brushModeLabel(mode: GnumarusSelectionBrushMode): string {
    if (mode === "origin") {
      return tr("val.origin");
    }
    return tr(mode === "destination" ? "val.destination" : "val.stamp");
  }

  /** True when a captured selection brush is available to paint with. */
  private hasSelectionBrush(): boolean {
    if (this.engine?.hasSelectionBrush() === true) {
      return true;
    }
    return false;
  }

  /** Capture the active floating selection as a paintable brush (Edit menu + run action). */
  private createBrushFromSelection(): void {
    this.closeAllMenus();
    if (this.engine === null) {
      return;
    }
    if (!this.engine.captureSelectionBrush()) {
      this.statusMessage = tr("status.noFloatingSelection");
      this.showToast(tr("status.noFloatingSelection"));
      return;
    }
    this.brushSource = "selection";
    this.statusMessage = tr("status.brushCaptured");
    this.requestUpdate();
  }

  private currentDialogBrushTipKind(scope = ""): GnumarusBrushTipKind {
    const select = this.shadowRoot?.getElementById("brushTipKind" + scope) as HTMLSelectElement | null;
    return parseBrushTipKind(select?.value ?? "pixel");
  }

  private applyBrushTipKindFromDialog(scope = ""): void {
    const kind = this.currentDialogBrushTipKind(scope);
    this.brushTipKind = kind;
    this.engine?.setBrushTipKind(kind);
    this.statusMessage = tr("status.brushTip", { value: this.tipKindLabel(kind) });
  }

  private applyBrushHardnessFromDialog(scope = ""): void {
    const input = this.shadowRoot?.getElementById("brushHardness" + scope) as HTMLInputElement | null;
    const raw = Number(input?.value ?? String(DEFAULT_BRUSH_HARDNESS * 100));
    const clamped = clampBrushHardness(Number.isFinite(raw) ? raw / 100 : DEFAULT_BRUSH_HARDNESS);
    this.brushHardness = clamped;
    this.engine?.setBrushHardness(clamped);
    this.statusMessage = tr("status.softness", { value: Math.round(clamped * 100) });
  }

  private applyBrushSpacingFromDialog(scope = ""): void {
    const input = this.shadowRoot?.getElementById("brushSpacing" + scope) as HTMLInputElement | null;
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

  private applyBrushFlowFromDialog(scope = ""): void {
    const input = this.shadowRoot?.getElementById("brushFlow" + scope) as HTMLInputElement | null;
    const raw = Number(input?.value ?? String(DEFAULT_BRUSH_FLOW * 100));
    const clamped = clampBrushFlow(Number.isFinite(raw) ? raw / 100 : DEFAULT_BRUSH_FLOW);
    this.brushFlow = clamped;
    this.engine?.setBrushFlow(clamped);
    this.statusMessage = tr("status.flow", { value: Math.round(clamped * 100) });
  }

  /** Test hook: set the pixel-spray density (1..100 percent kept, clamped). */
  setPixelSpray(percent: number): void {
    const clamped = Number.isFinite(percent) ? Math.min(100, Math.max(1, Math.round(percent))) : 100;
    this.pixelSprayDensity = clamped / 100;
    this.engine?.setPixelSprayDensity(clamped / 100);
    this.statusMessage = tr("status.spray", { value: clamped });
  }

  private applyPixelSprayFromDialog(scope = ""): void {
    const input = this.shadowRoot?.getElementById("pixelSpray" + scope) as HTMLInputElement | null;
    const raw = Number(input?.value ?? "100");
    const clamped = Number.isFinite(raw) ? Math.min(100, Math.max(1, Math.round(raw))) : 100;
    this.pixelSprayDensity = clamped / 100;
    this.engine?.setPixelSprayDensity(clamped / 100);
    this.statusMessage = tr("status.spray", { value: clamped });
  }

  private applyBrushDitherFromDialog(scope = ""): void {
    const input = this.shadowRoot?.getElementById("brushDither" + scope) as HTMLInputElement | null;
    const enabled = input?.checked === true;
    this.brushDither = enabled;
    this.engine?.setBrushDither(enabled);
  }

  private applyShadeDirectionFromDialog(scope = ""): void {
    const select = this.shadowRoot?.getElementById("brushShadeDirection" + scope) as HTMLSelectElement | null;
    const next: GnumarusShadeDirection = select?.value === "backward" ? "backward" : "forward";
    this.shadeDirection = next;
    this.engine?.setShadeDirection(next);
    this.statusMessage = tr("status.shadeDirection", {
      value: next === "backward" ? tr("val.backward") : tr("val.forward"),
    });
  }

  private applyBrushColorModeFromDialog(scope = ""): void {
    const select = this.shadowRoot?.getElementById("brushColorMode" + scope) as HTMLSelectElement | null;
    const next: GnumarusBrushColorMode = select?.value === "palette" ? "palette" : "solid";
    this.brushColorMode = next;
    this.engine?.setBrushColorMode(next);
    if (next === "palette") {
      this.refreshShadingPalette();
    }
    this.statusMessage = tr("status.colorMode", {
      value: next === "palette" ? tr("val.palette") : tr("val.solid"),
    });
  }

  /**
   * Push the foreground picker's displayed palette (in order) to the
   * engine as the shading sequence. No-op when the picker is not mounted.
   */
  private refreshShadingPalette(): void {
    const picker = this.shadowRoot?.getElementById("pencilColor") as unknown as {
      getPaletteHexes?: () => string[];
    } | null;
    let hexes: string[] = [];
    try {
      hexes = picker?.getPaletteHexes?.() ?? [];
    } catch {
      hexes = [];
    }
    const colors = hexes
      .map((hex) => parseHexToRgbaBytes(hex))
      .filter((parsed): parsed is { r: number; g: number; b: number; a: number } => parsed !== null)
      .map((parsed) => ({ r: parsed.r, g: parsed.g, b: parsed.b, a: 255 }));
    this.engine?.setShadingPalette(colors);
  }

  /** Test hook: set the fuzzy jitter amount (0..100 percent, clamped). */
  setPaintFuzzy(percent: number): void {
    const clamped = clampPaintFuzzy(Number.isFinite(percent) ? percent / 100 : DEFAULT_PAINT_FUZZY);
    this.paintFuzzy = clamped;
    this.engine?.setPaintFuzzy(clamped);
    this.statusMessage = tr("status.fuzzy", { value: Math.round(clamped * 100) });
  }

  private applyPaintFuzzyFromDialog(scope = ""): void {
    const input = this.shadowRoot?.getElementById("paintFuzzy" + scope) as HTMLInputElement | null;
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

  private applyPaintGrainFromDialog(scope = ""): void {
    const strengthInput = this.shadowRoot?.getElementById("paintGrainStrength" + scope) as HTMLInputElement | null;
    const scaleInput = this.shadowRoot?.getElementById("paintGrainScale" + scope) as HTMLInputElement | null;
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

  private applyTiltSizeFromDialog(scope = ""): void {
    const input = this.shadowRoot?.getElementById("tiltSizeAmount" + scope) as HTMLInputElement | null;
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

  private applySpeedFadeFromDialog(scope = ""): void {
    const input = this.shadowRoot?.getElementById("speedFadeAmount" + scope) as HTMLInputElement | null;
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

  private applyTipAngleModeFromDialog(scope = ""): void {
    const select = this.shadowRoot?.getElementById("tipAngleMode" + scope) as HTMLSelectElement | null;
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

  /**
   * Editor-bar lighting default: only affects models imported afterwards
   * or touched by the 3D model transform / fly camera tools. Already
   * imported models keep rendering exactly as before.
   */
  private applyModelLightingFromEditor(): void {
    const select = this.shadowRoot?.getElementById("modelLighting") as HTMLSelectElement | null;
    this.storageModelLighting = parseModelLighting(select?.value ?? this.storageModelLighting);
    this.persistStorage();
    this.engine?.setModelLighting(this.storageModelLighting);
    this.statusMessage = this.storageStatusMessage();
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

  private applyAirbrushRateFromDialog(scope = ""): void {
    const input = this.shadowRoot?.getElementById("airbrushRate" + scope) as HTMLInputElement | null;
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

  private applySmudgeFromDialog(scope = ""): void {
    const rateInput = this.shadowRoot?.getElementById("smudgeRate" + scope) as HTMLInputElement | null;
    const wetInput = this.shadowRoot?.getElementById("smudgeWet" + scope) as HTMLInputElement | null;
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
      brushSizeMin: this.brushSizeMin,
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
    this.brushSizeMin = preset.brushSizeMin ?? preset.brushSize;
    this.engine?.setBrushSizeMin(preset.brushSizeMin ?? preset.brushSize);
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
    this.pixelSprayDensity = preset.pixelSprayDensity ?? 1;
    this.engine?.setPixelSprayDensity(preset.pixelSprayDensity ?? 1);
    this.brushDither = preset.brushDither ?? false;
    this.engine?.setBrushDither(preset.brushDither ?? false);
    this.brushColorMode = preset.brushColorMode ?? "solid";
    this.engine?.setBrushColorMode(preset.brushColorMode ?? "solid");
    this.shadeDirection = preset.shadeDirection ?? "forward";
    this.engine?.setShadeDirection(preset.shadeDirection ?? "forward");
    if (this.brushColorMode === "palette") {
      this.refreshShadingPalette();
    }
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
    this.brushPresetName = preset.name;
    this.syncBrushPresetSelects();
    this.statusMessage = tr("status.preset", { value: displayBrushPresetName(preset, getActiveLocale()) });
  }

  /** Keep the bar/panel/dialog preset dropdowns on the last applied preset. */
  private syncBrushPresetSelects(): void {
    for (const scope of ["", "Panel", "Dialog"] as const) {
      const select = this.shadowRoot?.getElementById("brushPreset" + scope) as HTMLSelectElement | null;
      if (select !== null && select.value !== this.brushPresetName) {
        select.value = this.brushPresetName;
      }
    }
  }

  private allBrushPresets(): GnumarusBrushPreset[] {
    return [...BUILT_IN_BRUSH_PRESETS, ...this.brushPresets];
  }

  private applyBrushPresetFromDialog(scope = ""): void {
    const select = this.shadowRoot?.getElementById("brushPreset" + scope) as HTMLSelectElement | null;
    const preset = this.allBrushPresets().find((entry) => entry.name === (select?.value ?? ""));
    if (preset !== undefined) {
      this.applyBrushPreset(preset);
    }
  }

  /** Re-apply the selected preset, discarding later brush tweaks. */
  private resetBrushPresetFromDialog(scope = ""): void {
    const select = this.shadowRoot?.getElementById("brushPreset" + scope) as HTMLSelectElement | null;
    const wanted = select?.value ?? this.brushPresetName;
    const preset = this.allBrushPresets().find((entry) => entry.name === wanted)
      ?? this.allBrushPresets().find((entry) => entry.name === this.brushPresetName);
    if (preset === undefined) {
      this.statusMessage = tr("status.presetNone");
      return;
    }
    this.applyBrushPreset(preset);
  }

  /** Test hook: reset brush settings to the selected preset defaults. */
  resetBrushPreset(): boolean {
    const preset = this.allBrushPresets().find((entry) => entry.name === this.brushPresetName);
    if (preset === undefined) {
      return false;
    }
    this.applyBrushPreset(preset);
    return true;
  }

  /** Test hook: name of the currently selected brush preset. */
  brushPresetSelected(): string {
    return this.brushPresetName;
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
    this.brushPresetName = trimmed;
    this.syncBrushPresetSelects();
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
    if (this.brushPresetName === name) {
      this.brushPresetName = BUILT_IN_BRUSH_PRESETS[0]?.name ?? "Pixel Hard";
      this.syncBrushPresetSelects();
    }
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

  private saveBrushPresetFromDialog(scope = ""): void {
    const input = this.shadowRoot?.getElementById("presetName" + scope) as HTMLInputElement | null;
    const name = input?.value ?? "";
    if (!this.saveBrushPresetAs(name)) {
      this.statusMessage = tr("status.presetEmpty");
      return;
    }
    const select = this.shadowRoot?.getElementById("brushPreset" + scope) as HTMLSelectElement | null;
    if (select !== null) {
      select.value = name.trim().slice(0, 64);
    }
  }

  private deleteBrushPresetFromDialog(scope = ""): void {
    const select = this.shadowRoot?.getElementById("brushPreset" + scope) as HTMLSelectElement | null;
    const name = select?.value ?? "";
    if (name === "" || !this.deleteBrushPreset(name)) {
      this.statusMessage = tr("status.presetCustomOnly");
    }
  }

  private downloadBrushPreset(scope = ""): void {
    const select = this.shadowRoot?.getElementById("brushPreset" + scope) as HTMLSelectElement | null;
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

  private openBrushPresetPicker(scope = ""): void {
    const input = this.shadowRoot?.getElementById("brushPresetImport" + scope) as HTMLInputElement | null;
    input?.click();
  }

  private async importBrushPresetFromDialog(scope = ""): Promise<void> {
    const input = this.shadowRoot?.getElementById("brushPresetImport" + scope) as HTMLInputElement | null;
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

  /** Open the brush preset manager dialog. */
  private openBrushPresetDialog(): void {
    const dialog = this.shadowRoot?.getElementById("brushPresetManagerDialog") as HTMLDialogElement | null;
    dialog?.showModal();
  }

  private closeBrushPresetDialog(): void {
    const dialog = this.shadowRoot?.getElementById("brushPresetManagerDialog") as HTMLDialogElement | null;
    dialog?.close();
  }

  private applyPaintDualTuningFromDialog(scope = ""): void {
    const strengthInput = this.shadowRoot?.getElementById("paintDualStrength" + scope) as HTMLInputElement | null;
    const scaleInput = this.shadowRoot?.getElementById("paintDualScale" + scope) as HTMLInputElement | null;
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

  private openPaintDualPicker(scope = ""): void {
    const input = this.shadowRoot?.getElementById("paintDualImport" + scope) as HTMLInputElement | null;
    input?.click();
  }

  private async importPaintDualFromDialog(scope = ""): Promise<void> {
    const input = this.shadowRoot?.getElementById("paintDualImport" + scope) as HTMLInputElement | null;
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

  private applyPressureResponseFromDialog(scope = ""): void {
    const select = this.shadowRoot?.getElementById("pressureResponse" + scope) as HTMLSelectElement | null;
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

  private applyPressureSizeCurveFromDialog(scope = ""): void {
    const select = this.shadowRoot?.getElementById("pressureSizeCurve" + scope) as HTMLSelectElement | null;
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

  private applyPressureAlphaCurveFromDialog(scope = ""): void {
    const select = this.shadowRoot?.getElementById("pressureAlphaCurve" + scope) as HTMLSelectElement | null;
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

  private currentDialogPencilAntialias(scope = ""): boolean {
    const input = this.shadowRoot?.getElementById("pencilAntialias" + scope) as HTMLInputElement | null;
    return input?.checked === true;
  }

  private applyPencilAntialiasFromDialog(scope = ""): void {
    const enabled = this.currentDialogPencilAntialias(scope);
    this.pencilAntialias = enabled;
    this.engine?.setPencilAntialias(enabled);
    this.statusMessage = tr("status.pencilAntialias", { value: this.onOffLabel(enabled) });
  }

  /** Test hook: enable or disable pencil pixel perfect (enabling snaps brush size min/max to 1). */
  setPencilPixelPerfect(enabled: boolean): void {
    const next = enabled === true;
    if (next) {
      this.brushSize = 1;
      this.brushSizeMin = 1;
      this.engine?.setBrushSize(1);
      this.engine?.setBrushSizeMin(1);
    }
    this.pencilPixelPerfect = next;
    this.engine?.setPencilPixelPerfect(next);
    this.statusMessage = tr("status.pencilPixelPerfect", { value: this.onOffLabel(next) });
  }

  /** Test hook: enable or disable curve pixel perfect (enabling snaps curve width min/max to 1). */
  setCurvePixelPerfect(enabled: boolean): void {
    const next = enabled === true;
    if (next) {
      this.curveWidth = 1;
      this.curveWidthMin = 1;
      this.engine?.setCurveWidth(1);
      this.engine?.setCurveWidthMin(1);
    }
    this.curvePixelPerfect = next;
    this.engine?.setCurvePixelPerfect(next);
    this.statusMessage = tr("status.curvePixelPerfect", { value: this.onOffLabel(next) });
  }

  private currentDialogPencilPixelPerfect(scope = ""): boolean {
    const input = this.shadowRoot?.getElementById("pencilPixelPerfect" + scope) as HTMLInputElement | null;
    return input?.checked === true;
  }

  private currentDialogCurvePixelPerfect(): boolean {
    const input = this.shadowRoot?.getElementById("curvePixelPerfect") as HTMLInputElement | null;
    return input?.checked === true;
  }

  private applyPencilPixelPerfectFromDialog(scope = ""): void {
    const enabled = this.currentDialogPencilPixelPerfect(scope);
    if (enabled) {
      this.brushSize = 1;
      this.brushSizeMin = 1;
      this.engine?.setBrushSize(1);
      this.engine?.setBrushSizeMin(1);
    }
    this.pencilPixelPerfect = enabled;
    this.engine?.setPencilPixelPerfect(enabled);
    this.statusMessage = tr("status.pencilPixelPerfect", { value: this.onOffLabel(enabled) });
  }

  private applyCurvePixelPerfectFromDialog(): void {
    const enabled = this.currentDialogCurvePixelPerfect();
    if (enabled) {
      this.curveWidth = 1;
      this.curveWidthMin = 1;
      this.engine?.setCurveWidth(1);
      this.engine?.setCurveWidthMin(1);
    }
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

  private currentDialogStabilizerMode(scope = ""): GnumarusStabilizerMode {
    const select = this.shadowRoot?.getElementById("stabilizerMode" + scope) as HTMLSelectElement | null;
    return parseStabilizerMode(select?.value ?? "none");
  }

  private currentDialogRopeLength(scope = ""): number {
    const input = this.shadowRoot?.getElementById("ropeLength" + scope) as HTMLInputElement | null;
    const parsed = Number(input?.value ?? String(GNUMARUS_DEFAULT_ROPE_LENGTH));
    return clampRopeLength(Number.isFinite(parsed) ? parsed : GNUMARUS_DEFAULT_ROPE_LENGTH);
  }

  private currentDialogFollowStrength(scope = ""): number {
    const input = this.shadowRoot?.getElementById("followStrength" + scope) as HTMLInputElement | null;
    const parsed = Number(input?.value ?? String(GNUMARUS_DEFAULT_FOLLOW_STRENGTH));
    return clampFollowStrength(Number.isFinite(parsed) ? parsed : GNUMARUS_DEFAULT_FOLLOW_STRENGTH);
  }

  private applyStabilizerModeFromDialog(scope = ""): void {
    const mode = this.currentDialogStabilizerMode(scope);
    this.stabilizerMode = mode;
    this.engine?.setStabilizerMode(mode);
    this.statusMessage = tr("status.stabilizer", { value: this.stabilizerLabel(mode) });
  }

  private applyRopeLengthFromDialog(scope = ""): void {
    const length = this.currentDialogRopeLength(scope);
    this.ropeLength = length;
    this.engine?.setRopeLength(length);
    this.statusMessage = tr("status.ropeLength", { value: length });
  }

  private applyFollowStrengthFromDialog(scope = ""): void {
    const strength = this.currentDialogFollowStrength(scope);
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

  private currentDialogBlendMode(scope = ""): GnumarusBlendMode {
    const select = this.shadowRoot?.getElementById("blendMode" + scope) as HTMLSelectElement | null;
    return parseBlendMode(select?.value ?? "normal");
  }

  private applyBlendModeFromDialog(scope = ""): void {
    const mode = this.currentDialogBlendMode(scope);
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

  private currentDialogAccumulate(scope = ""): boolean {
    const input = this.shadowRoot?.getElementById("accumulate" + scope) as HTMLInputElement | null;
    return input?.checked === true;
  }

  private applyAccumulateFromDialog(scope = ""): void {
    const enabled = this.currentDialogAccumulate(scope);
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
    const clamped = clampBrushSizeFloat(size, this.maxBrushSize);
    this.lineWidth = clamped;
    if (this.lineWidthMin > clamped) {
      this.lineWidthMin = clamped;
      this.engine?.setLineWidthMin(clamped);
    }
    this.engine?.setLineWidth(clamped);
    this.statusMessage = this.lineWidthStatus();
  }

  /** Test hook: set the minimum line width (floats 0.1..max, clamped). */
  setLineWidthMin(size: number): void {
    const clamped = Math.min(clampBrushSizeFloat(size, this.maxBrushSize), this.lineWidth);
    this.lineWidthMin = clamped;
    this.engine?.setLineWidthMin(clamped);
    this.statusMessage = this.lineWidthStatus();
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
    return clampBrushSizeFloat(Number.isFinite(parsed) ? parsed : 1, this.maxBrushSize);
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
    if (this.lineWidthMin > size) {
      this.lineWidthMin = size;
      this.engine?.setLineWidthMin(size);
    }
    this.engine?.setLineWidth(size);
    this.statusMessage = this.lineWidthStatus();
  }

  private currentDialogLineWidthMin(): number {
    const input = this.shadowRoot?.getElementById("lineWidthMin") as HTMLInputElement | null;
    const parsed = Number(input?.value ?? "1");
    return clampBrushSizeFloat(Number.isFinite(parsed) ? parsed : 1, this.maxBrushSize);
  }

  private applyLineWidthMinFromDialog(): void {
    const size = Math.min(this.currentDialogLineWidthMin(), this.lineWidth);
    this.lineWidthMin = size;
    this.engine?.setLineWidthMin(size);
    this.statusMessage = this.lineWidthStatus();
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
    const clamped = clampBrushSizeFloat(size, this.maxBrushSize);
    this.curveWidth = clamped;
    if (this.curveWidthMin > clamped) {
      this.curveWidthMin = clamped;
      this.engine?.setCurveWidthMin(clamped);
    }
    this.engine?.setCurveWidth(clamped);
    this.statusMessage = this.curveWidthStatus();
  }

  /** Test hook: set the minimum curve width (floats 0.1..max, clamped). */
  setCurveWidthMin(size: number): void {
    const clamped = Math.min(clampBrushSizeFloat(size, this.maxBrushSize), this.curveWidth);
    this.curveWidthMin = clamped;
    this.engine?.setCurveWidthMin(clamped);
    this.statusMessage = this.curveWidthStatus();
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
    return clampBrushSizeFloat(Number.isFinite(parsed) ? parsed : 1, this.maxBrushSize);
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
    if (this.curveWidthMin > size) {
      this.curveWidthMin = size;
      this.engine?.setCurveWidthMin(size);
    }
    this.engine?.setCurveWidth(size);
    this.statusMessage = this.curveWidthStatus();
  }

  private currentDialogCurveWidthMin(): number {
    const input = this.shadowRoot?.getElementById("curveWidthMin") as HTMLInputElement | null;
    const parsed = Number(input?.value ?? "1");
    return clampBrushSizeFloat(Number.isFinite(parsed) ? parsed : 1, this.maxBrushSize);
  }

  private applyCurveWidthMinFromDialog(): void {
    const size = Math.min(this.currentDialogCurveWidthMin(), this.curveWidth);
    this.curveWidthMin = size;
    this.engine?.setCurveWidthMin(size);
    this.statusMessage = this.curveWidthStatus();
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

  private currentDialogShapeWidth(): number {
    const input = this.shadowRoot?.getElementById("shapeWidth") as HTMLInputElement | null;
    const parsed = Number(input?.value ?? "1");
    return clampBrushSizeFloat(Number.isFinite(parsed) ? parsed : 1);
  }

  private applyShapeWidthFromDialog(): void {
    const size = this.currentDialogShapeWidth();
    this.shapeWidth = size;
    this.engine?.setShapeWidth(size);
    this.statusMessage = tr("status.brushSize", { value: size });
  }

  private applyShapeFilledFromDialog(): void {
    const input = this.shadowRoot?.getElementById("shapeFilled") as HTMLInputElement | null;
    const filled = input?.checked === true;
    this.shapeFilled = filled;
    this.engine?.setShapeFilled(filled);
    this.refreshLayers();
  }

  private applyShapeAntialiasFromDialog(): void {
    const input = this.shadowRoot?.getElementById("shapeAntialias") as HTMLInputElement | null;
    const enabled = input?.checked === true;
    this.shapeAntialias = enabled;
    this.engine?.setShapeAntialias(enabled);
    this.refreshLayers();
  }

  private currentDialogRetouchSize(): number {
    const input = this.shadowRoot?.getElementById("retouchSize") as HTMLInputElement | null;
    const parsed = Number(input?.value ?? "8");
    return clampBrushSizeFloat(Number.isFinite(parsed) ? parsed : 8);
  }

  private applyRetouchSizeFromDialog(): void {
    const size = this.currentDialogRetouchSize();
    this.retouchSize = size;
    this.engine?.setRetouchSize(size);
    this.statusMessage = tr("status.brushSize", { value: size });
  }

  private applyShadeModeFromDialog(): void {
    const select = this.shadowRoot?.getElementById("shadeMode") as HTMLSelectElement | null;
    const raw = select?.value ?? "lighten";
    const mode = raw === "darken" ? "darken" : raw === "hue" ? "hue" : "lighten";
    this.shadeMode = mode;
    this.engine?.setShadeMode(mode);
    this.refreshLayers();
  }

  private applyShadeAmountFromDialog(): void {
    const input = this.shadowRoot?.getElementById("shadeAmount") as HTMLInputElement | null;
    const parsed = Math.round(Number(input?.value ?? "20"));
    const amount = (Number.isFinite(parsed) ? Math.min(100, Math.max(1, parsed)) : 20) / 100;
    this.shadeAmount = amount;
    this.engine?.setShadeAmount(amount);
    this.refreshLayers();
  }

  private applyBlurModeFromDialog(): void {
    const select = this.shadowRoot?.getElementById("blurMode") as HTMLSelectElement | null;
    const mode = select?.value === "sharpen" ? "sharpen" : "blur";
    this.blurMode = mode;
    this.engine?.setBlurMode(mode);
    this.refreshLayers();
  }

  private applyRecolorToleranceFromDialog(): void {
    const input = this.shadowRoot?.getElementById("recolorTolerance") as HTMLInputElement | null;
    const parsed = Math.round(Number(input?.value ?? "30"));
    const tolerance = Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : 30;
    this.recolorTolerance = tolerance;
    this.engine?.setRecolorTolerance(tolerance);
    this.refreshLayers();
  }

  private applyGradientModeFromDialog(): void {
    const select = this.shadowRoot?.getElementById("gradientMode") as HTMLSelectElement | null;
    const mode = select?.value === "radial" ? "radial" : "linear";
    this.gradientMode = mode;
    this.engine?.setGradientMode(mode);
    this.refreshLayers();
  }

  private applyGradientDitherFromDialog(): void {
    const input = this.shadowRoot?.getElementById("gradientDither") as HTMLInputElement | null;
    const enabled = input?.checked === true;
    this.gradientDither = enabled;
    this.engine?.setGradientDither(enabled);
    this.refreshLayers();
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
    this.onionEnabled = DEFAULT_ONION_SETTINGS.enabled;
    this.onionPast = DEFAULT_ONION_SETTINGS.past;
    this.onionFuture = DEFAULT_ONION_SETTINGS.future;
    this.onionTint = DEFAULT_ONION_SETTINGS.tint;
    this.engine?.setOnionEnabled(this.onionEnabled);
    this.engine?.setOnionCounts(this.onionPast, this.onionFuture);
    this.engine?.setOnionTint(this.onionTint);
    this.persistOnion();
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
    const next = Math.min(64, Math.max(0.01, this.previewZoom * factor));
    this.previewZoom = next;
    this.paintPreviewSize();
  }

  private resetPreviewZoom(): void {
    this.previewZoom = 1;
    this.paintPreviewSize();
  }

  /** Read the zoom percent input, clamped to 1..6400. */
  private applyPreviewZoomInput(): void {
    const input = this.shadowRoot?.getElementById("previewZoomInput") as HTMLInputElement | null;
    const raw = Math.round(Number(input?.value ?? "100"));
    const percent = Number.isFinite(raw) ? Math.min(6400, Math.max(1, raw)) : 100;
    if (input !== null && input.value !== String(percent)) {
      input.value = String(percent);
    }
    this.previewZoom = percent / 100;
    this.paintPreviewSize();
  }

  /**
   * One-shot fit: set the zoom so the whole flattened image fits inside
   * the preview body viewport (no scrolling needed to see it all).
   */
  private fitPreviewZoom(): void {
    if (this.engine === null) {
      return;
    }
    const size = this.engine.size;
    if (size.width < 1 || size.height < 1) {
      return;
    }
    const body = this.shadowRoot?.querySelector('[data-testid="final-preview"] .preview-body') as HTMLElement | null;
    if (body === null || body.clientWidth < 1 || body.clientHeight < 1) {
      return;
    }
    this.previewZoom = Math.min(
      64,
      Math.max(0.01, Math.min(body.clientWidth / size.width, body.clientHeight / size.height)),
    );
    this.paintPreviewSize();
  }

  /**
   * Apply the current zoom as a CSS-only resize of the existing preview
   * bitmap (GPU-scaled, instant even on huge canvases). The expensive
   * flatten + upload in `refreshPreview` runs only when pixels change.
   * Falls back to a full refresh when the backing store is stale.
   */
  private paintPreviewSize(): void {
    if (this.engine === null) {
      return;
    }
    const canvas = this.shadowRoot?.getElementById("previewCanvas") as HTMLCanvasElement | null;
    if (canvas === null) {
      return;
    }
    const size = this.engine.size;
    if (size.width < 1 || size.height < 1) {
      return;
    }
    if (canvas.width !== size.width || canvas.height !== size.height) {
      void this.refreshPreview();
      return;
    }
    canvas.style.width = `${Math.max(1, Math.round(canvas.width * this.previewZoom))}px`;
    canvas.style.height = `${Math.max(1, Math.round(canvas.height * this.previewZoom))}px`;
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
    const engine = this.engine;
    const size = engine.size;
    const infos = engine.getLayers();
    const pixels = engine.exportLayers();
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
        visible: info.isMask ? false : engine.isLayerEffectivelyVisible(info.id),
        opacity: info.opacity,
        blend: info.blend,
        masks: engine.getMaskFlattenInputs(info.id),
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
    this.paintPreviewSize();
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
    // Keep the active layer row and the current matrix cell on screen after
    // any navigation (frame/layer switch, add/remove, playback follows too).
    void this.updateComplete.then(() => {
      this.scrollCurrentCellIntoView();
    });
  }

  /** Scroll a container just enough to fully show a child (no-op when visible).
   * Visibility is measured against the container's client area (excluding
   * borders and classic scrollbars, which would otherwise cover the child's
   * edge), minus `insetLeft`/`insetTop` overlays (e.g. sticky headers that
   * paint above the scrolled content). */
  private scrollChildIntoView(
    container: Element | null,
    child: Element | null,
    insetLeft = 0,
    insetTop = 0,
  ): void {
    if (!(container instanceof HTMLElement) || !(child instanceof HTMLElement)) {
      return;
    }
    const area = container.getBoundingClientRect();
    if (area.width <= 0 || area.height <= 0) {
      return;
    }
    const rect = child.getBoundingClientRect();
    const delta = scrollIntoViewDelta(
      {
        left: area.left + container.clientLeft + insetLeft,
        top: area.top + container.clientTop + insetTop,
        right: area.left + container.clientLeft + container.clientWidth,
        bottom: area.top + container.clientTop + container.clientHeight,
      },
      {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        empty: rect.width <= 0 && rect.height <= 0,
      },
    );
    container.scrollTop += delta.dTop;
    container.scrollLeft += delta.dLeft;
  }

  /** Bring the active layer row and the current matrix cell into view. */
  private scrollCurrentCellIntoView(): void {
    const root = this.shadowRoot;
    if (root === null) {
      return;
    }
    this.scrollChildIntoView(root.querySelector(".layers-list"), root.querySelector(".layer-row.active"));
    // The sticky corner overlays the scrolled cells: keep the current cell
    // clear of the layer-name column (left) and the frame-header row (top).
    const corner = root.querySelector(".anim-corner");
    const cornerRect = corner instanceof HTMLElement ? corner.getBoundingClientRect() : null;
    this.scrollChildIntoView(
      root.querySelector(".anim-scroll"),
      root.querySelector(".anim-cell.active-cell"),
      cornerRect?.width ?? 0,
      cornerRect?.height ?? 0,
    );
  }

  private onCellClick(layerId: string, frame: number): void {
    if (this.engine === null) {
      return;
    }
    // A plain click replaces the cell selection, then navigates.
    this.selectSingleCell(layerId, frame);
    const { layerChanged, frameChanged } = this.navigateToCell(layerId, frame);
    this.toastCellNavigation(layerChanged, frameChanged, layerId, frame);
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

  /** Valid selected layers for the current project, defaulting to the active layer. */
  private selectedLayerSet(): Set<string> {
    const ids = new Set(this.layers.map((layer) => layer.id));
    const valid = this.selectedLayers.filter((id) => ids.has(id));
    if (valid.length > 0) {
      return new Set(valid);
    }
    return this.activeLayerId !== "" && ids.has(this.activeLayerId) ? new Set([this.activeLayerId]) : new Set();
  }

  /** Layer ids in stack order (bottom first), restricted to the selection. */
  private selectedLayerIds(): string[] {
    const selected = this.selectedLayerSet();
    return this.layers.filter((layer) => selected.has(layer.id)).map((layer) => layer.id);
  }

  /** Collapse the layer selection onto one layer (plain click paths). */
  private selectSingleLayer(id: string): void {
    this.layerAnchor = id;
    this.selectedLayers = [id];
  }

  /** Collapse the layer selection onto the active layer, if any. */
  private collapseLayerSelectionToActive(): void {
    if (this.activeLayerId !== "") {
      this.selectSingleLayer(this.activeLayerId);
    } else {
      this.selectedLayers = [];
      this.layerAnchor = null;
    }
  }

  private onSelectFrameClick(frame: number, shiftKey: boolean, ctrlKey: boolean): void {
    if (this.engine === null) {
      return;
    }
    if (!shiftKey && !ctrlKey) {
      this.onSelectFrame(frame);
      return;
    }
    const count = this.engine.getFrameCount();
    if (ctrlKey && !shiftKey) {
      // Toggle membership, keeping everything else; the anchor follows so a
      // later Shift+click extends from the last touched frame.
      this.frameAnchor = frame;
      this.selectedFrames = toggleSelectedFrame([...this.selectedFrameSet()], frame, count);
      if (this.engine.setCurrentFrame(frame)) {
        this.refreshLayers();
      } else {
        this.requestUpdate();
      }
      this.dirty = true;
      this.reportFrameSelection(frame, count);
      return;
    }
    // Shift (with or without Ctrl): union the anchor..clicked interval.
    const anchor = this.frameAnchor ?? this.engine.getCurrentFrame();
    const clampedAnchor = Math.min(Math.max(0, anchor), count - 1);
    this.frameAnchor = frame;
    this.selectedFrames = unionSelectedFrameRange([...this.selectedFrameSet()], clampedAnchor, frame, count);
    if (this.engine.setCurrentFrame(frame)) {
      this.refreshLayers();
    } else {
      this.requestUpdate();
    }
    this.dirty = true;
    this.reportFrameSelection(frame, count);
  }

  /** Status + toast describing the current frame selection. */
  private reportFrameSelection(frame: number, count: number): void {
    const selected = [...this.selectedFrameSet()].sort((a, b) => a - b);
    if (selected.length > 1 && selected[selected.length - 1]! - selected[0]! === selected.length - 1) {
      const low = selected[0]!;
      const high = selected[selected.length - 1]!;
      this.statusMessage = tr("status.framesSelected", { from: low + 1, to: high + 1, count: selected.length });
    } else if (selected.length > 1) {
      this.statusMessage = tr("status.framesSelectedMany", { count: selected.length });
    } else {
      this.statusMessage = tr("status.frameSelected", { frame: frame + 1 });
    }
    this.showToast(this.frameToastFor(frame, count));
  }

  /** Click (plain/Ctrl/Shift) on a layer row or matrix layer name. */
  private onSelectLayerClick(id: string, shiftKey: boolean, ctrlKey: boolean): void {
    if (this.engine === null) {
      return;
    }
    if (!shiftKey && !ctrlKey) {
      this.onSelectLayer(id);
      return;
    }
    if (ctrlKey && !shiftKey) {
      // Toggle membership, keeping everything else; the anchor follows so a
      // later Shift+click extends from the last touched layer. The touched
      // layer becomes active so painting follows the click.
      const ids = this.layers.map((layer) => layer.id);
      this.layerAnchor = id;
      this.selectedLayers = toggleSelectedId([...this.selectedLayerSet()], id, ids);
      if (this.engine.setActiveLayer(id)) {
        this.refreshLayers();
      } else {
        this.requestUpdate();
      }
      this.dirty = true;
      this.reportLayerSelection();
      return;
    }
    // Shift (with or without Ctrl): union the anchor..clicked index interval.
    const ids = this.layers.map((layer) => layer.id);
    const united = unionSelectedIdRange([...this.selectedLayerSet()], this.layerAnchor, id, ids);
    if (united === null) {
      this.onSelectLayer(id);
      return;
    }
    this.layerAnchor = id;
    this.selectedLayers = united;
    if (this.engine.setActiveLayer(id)) {
      this.refreshLayers();
    } else {
      this.requestUpdate();
    }
    this.dirty = true;
    this.reportLayerSelection();
  }

  /** Status + toast describing the current layer selection. */
  private reportLayerSelection(): void {
    const selected = this.selectedLayerIds();
    if (selected.length > 1) {
      this.statusMessage = tr("status.layersSelected", { count: selected.length });
      this.showToast(tr("status.layersSelected", { count: selected.length }));
      return;
    }
    const index = this.layers.findIndex((layer) => layer.id === this.activeLayerId);
    const target = index < 0 ? undefined : this.layers[index];
    if (target !== undefined) {
      this.showToast(this.layerToastFor(index, this.layers.length, target.name));
    }
  }

  /** Key for cell membership tests. */
  private cellSelectionKey(layerId: string, frame: number): string {
    return `${layerId}:${frame}`;
  }

  /** Selected cells restricted to existing layers and frames. */
  private validSelectedCells(): Array<{ layerId: string; frame: number }> {
    const ids = new Set(this.layers.map((layer) => layer.id));
    const count = this.engine?.getFrameCount() ?? 0;
    return this.selectedCells.filter(
      (cell) => ids.has(cell.layerId) && Number.isInteger(cell.frame) && cell.frame >= 0 && cell.frame < count,
    );
  }

  /** Collapse the cell selection onto one cell (plain click paths). */
  private selectSingleCell(layerId: string, frame: number): void {
    this.cellAnchor = { layerId, frame };
    this.selectedCells = [{ layerId, frame }];
  }

  /** Move the active layer/frame onto the cell; returns what changed. */
  private navigateToCell(
    layerId: string,
    frame: number,
  ): { layerChanged: boolean; frameChanged: boolean } {
    if (this.engine === null) {
      return { layerChanged: false, frameChanged: false };
    }
    const oldLayer = this.engine.getActiveLayerId();
    const oldFrame = this.engine.getCurrentFrame();
    const layerChanged = layerId !== oldLayer;
    const frameChanged = frame !== oldFrame;
    if (layerChanged) {
      this.engine.setActiveLayer(layerId);
      this.selectSingleLayer(layerId);
    }
    if (frameChanged) {
      this.engine.setCurrentFrame(frame);
      this.selectSingleFrame(frame);
    }
    if (layerChanged || frameChanged) {
      this.refreshLayers();
    }
    return { layerChanged, frameChanged };
  }

  /** Toasts for cell navigation (shared by plain and single-result clicks). */
  private toastCellNavigation(
    layerChanged: boolean,
    frameChanged: boolean,
    layerId: string,
    frame: number,
  ): void {
    if (!layerChanged && !frameChanged) {
      return;
    }
    const activeIndex = this.layers.findIndex((layer) => layer.id === layerId);
    const active = activeIndex < 0 ? undefined : this.layers[activeIndex];
    const count = this.engine?.getFrameCount() ?? frame + 1;
    if (layerChanged && frameChanged && active !== undefined) {
      this.showToast(`${this.layerToastFor(activeIndex, this.layers.length, active.name)} — ${this.frameToastFor(frame, count)}`);
    } else if (layerChanged && active !== undefined) {
      this.showToast(this.layerToastFor(activeIndex, this.layers.length, active.name));
    } else if (frameChanged) {
      this.showToast(this.frameToastFor(frame, count));
    }
  }

  /** Status + toast describing the current cell selection. */
  private reportCellSelection(
    layerChanged: boolean,
    frameChanged: boolean,
    layerId: string,
    frame: number,
  ): void {
    const valid = this.validSelectedCells();
    if (valid.length > 1) {
      this.statusMessage = tr("status.cellsSelected", { count: valid.length });
      this.showToast(tr("status.cellsSelected", { count: valid.length }));
      return;
    }
    this.toastCellNavigation(layerChanged, frameChanged, layerId, frame);
  }

  /** Click (plain/Ctrl/Shift) on a matrix cell. */
  private onSelectCellClick(layerId: string, frame: number, shiftKey: boolean, ctrlKey: boolean): void {
    if (this.engine === null) {
      return;
    }
    if (!shiftKey && !ctrlKey) {
      this.onCellClick(layerId, frame);
      return;
    }
    const clicked = { layerId, frame };
    if (ctrlKey && !shiftKey) {
      // Toggle membership, keeping everything else; the anchor follows so a
      // later Shift+click extends from the last touched cell.
      this.cellAnchor = { ...clicked };
      const key = this.cellSelectionKey(layerId, frame);
      const valid = this.validSelectedCells();
      this.selectedCells = valid.some((cell) => this.cellSelectionKey(cell.layerId, cell.frame) === key)
        ? valid.filter((cell) => this.cellSelectionKey(cell.layerId, cell.frame) !== key)
        : [...valid, clicked];
      const { layerChanged, frameChanged } = this.navigateToCell(layerId, frame);
      this.dirty = true;
      this.reportCellSelection(layerChanged, frameChanged, layerId, frame);
      return;
    }
    // Shift (with or without Ctrl): replace with the anchor..clicked rectangle;
    // the anchor follows so consecutive Shift+clicks chain from the last cell.
    const rows = this.engine.getAnimationMatrix().rows.map((row) => row.layerId);
    const anchor = this.cellAnchor ?? {
      layerId: this.engine.getActiveLayerId(),
      frame: this.engine.getCurrentFrame(),
    };
    const rect = cellRectCells(anchor, clicked, rows, this.engine.getFrameCount());
    if (rect.length === 0) {
      this.onCellClick(layerId, frame);
      return;
    }
    this.cellAnchor = { ...clicked };
    this.selectedCells = rect;
    const { layerChanged, frameChanged } = this.navigateToCell(layerId, frame);
    this.dirty = true;
    this.reportCellSelection(layerChanged, frameChanged, layerId, frame);
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
    // Right-clicking a member of a multi-cell selection opens the bulk menu
    // (only unlink/relink apply to cell sets); otherwise the selection
    // collapses onto the clicked cell like the frame menu does.
    const selected = this.validSelectedCells();
    const key = this.cellSelectionKey(layerId, frame);
    if (selected.length > 1 && selected.some((cell) => this.cellSelectionKey(cell.layerId, cell.frame) === key)) {
      this.matrixMenu = { kind: "cells", cells: selected, x: clientX, y: clientY };
      return;
    }
    this.selectSingleCell(layerId, frame);
    this.matrixMenu = { kind: "cell", layerId, frame, x: clientX, y: clientY };
  }

  private openMatrixLayerMenu(layerId: string, clientX: number, clientY: number): void {
    this.closeMatrixMenu();
    // The matrix layer name opens the same context menu as the layers panel.
    this.openLayerMenu(layerId, clientX, clientY);
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
    textId: string | null;
    svgId: string | null;
    model3dId: string | null;
    tilemapId: string | null;
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

  private textThumbnailDataUrl(textId: string): string | null {
    if (this.engine === null) {
      return null;
    }
    const raster = this.engine.rasterizeText(textId);
    if (raster === null || raster.width < 1 || raster.height < 1) {
      return null;
    }
    try {
      // Downscale large rasters for the picker thumbnails.
      const maxSide = 128;
      const scale = Math.min(1, maxSide / Math.max(raster.width, raster.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(raster.width * scale));
      canvas.height = Math.max(1, Math.round(raster.height * scale));
      const ctx = canvas.getContext("2d");
      if (ctx === null) {
        return null;
      }
      const image = new ImageData(new Uint8ClampedArray(raster.buffer), raster.width, raster.height);
      if (scale >= 1) {
        ctx.putImageData(image, 0, 0);
      } else {
        const full = document.createElement("canvas");
        full.width = raster.width;
        full.height = raster.height;
        const fullCtx = full.getContext("2d");
        if (fullCtx === null) {
          return null;
        }
        fullCtx.putImageData(image, 0, 0);
        ctx.drawImage(full, 0, 0, canvas.width, canvas.height);
      }
      return canvas.toDataURL();
    } catch {
      return null;
    }
  }

  /** Rasterize a vector entry into a picker thumbnail data URL (sync cache only). */
  private svgThumbnailDataUrl(svgId: string): string | null {
    if (this.engine === null) {
      return null;
    }
    const raster = this.engine.rasterizeSvg(svgId);
    if (raster === null || raster.width < 1 || raster.height < 1) {
      return null;
    }
    try {
      const maxSide = 128;
      const scale = Math.min(1, maxSide / Math.max(raster.width, raster.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(raster.width * scale));
      canvas.height = Math.max(1, Math.round(raster.height * scale));
      const ctx = canvas.getContext("2d");
      if (ctx === null) {
        return null;
      }
      const image = new ImageData(new Uint8ClampedArray(raster.buffer), raster.width, raster.height);
      if (scale >= 1) {
        ctx.putImageData(image, 0, 0);
      } else {
        const full = document.createElement("canvas");
        full.width = raster.width;
        full.height = raster.height;
        const fullCtx = full.getContext("2d");
        if (fullCtx === null) {
          return null;
        }
        fullCtx.putImageData(image, 0, 0);
        ctx.drawImage(full, 0, 0, canvas.width, canvas.height);
      }
      return canvas.toDataURL();
    } catch {
      return null;
    }
  }

  /** Rasterize a 3D model entry into a picker thumbnail data URL (sync cache only). */
  private model3dThumbnailDataUrl(modelId: string): string | null {
    if (this.engine === null) {
      return null;
    }
    const raster = this.engine.rasterizeModel3d(modelId);
    if (raster === null || raster.width < 1 || raster.height < 1) {
      return null;
    }
    try {
      const maxSide = 128;
      const scale = Math.min(1, maxSide / Math.max(raster.width, raster.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(raster.width * scale));
      canvas.height = Math.max(1, Math.round(raster.height * scale));
      const ctx = canvas.getContext("2d");
      if (ctx === null) {
        return null;
      }
      const image = new ImageData(new Uint8ClampedArray(raster.buffer), raster.width, raster.height);
      if (scale >= 1) {
        ctx.putImageData(image, 0, 0);
      } else {
        const full = document.createElement("canvas");
        full.width = raster.width;
        full.height = raster.height;
        const fullCtx = full.getContext("2d");
        if (fullCtx === null) {
          return null;
        }
        fullCtx.putImageData(image, 0, 0);
        ctx.drawImage(full, 0, 0, canvas.width, canvas.height);
      }
      return canvas.toDataURL();
    } catch {
      return null;
    }
  }

  /** Rasterize a tilemap entry into a picker thumbnail data URL (sync cache only). */
  private tilemapThumbnailDataUrl(tilemapId: string): string | null {
    if (this.engine === null) {
      return null;
    }
    const raster = this.engine.rasterizeTilemap(tilemapId);
    if (raster === null || raster.width < 1 || raster.height < 1) {
      return null;
    }
    try {
      const maxSide = 128;
      const scale = Math.min(1, maxSide / Math.max(raster.width, raster.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(raster.width * scale));
      canvas.height = Math.max(1, Math.round(raster.height * scale));
      const ctx = canvas.getContext("2d");
      if (ctx === null) {
        return null;
      }
      ctx.imageSmoothingEnabled = false;
      const image = new ImageData(new Uint8ClampedArray(raster.buffer), raster.width, raster.height);
      if (scale >= 1) {
        ctx.putImageData(image, 0, 0);
      } else {
        const full = document.createElement("canvas");
        full.width = raster.width;
        full.height = raster.height;
        const fullCtx = full.getContext("2d");
        if (fullCtx === null) {
          return null;
        }
        fullCtx.putImageData(image, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(full, 0, 0, canvas.width, canvas.height);
      }
      return canvas.toDataURL();
    } catch {
      return null;
    }
  }

  /** Open the read-only content manager dialog with a fresh snapshot. */
  private openContentManager(): void {
    if (this.engine === null) {
      return;
    }
    this.closeAllMenus();
    this.contentManagerData = this.engine.getContentManagerData();
    this.contentManagerVerts = new Map();
    this.contentManagerDiskSizes = new Map();
    this.contentManagerQuery = "";
    this.contentManagerOpen = true;
    const engine = this.engine;
    for (const model of this.contentManagerData.models) {
      void engine.countModel3dVertices(model.id).then((count) => {
        this.contentManagerVerts.set(model.id, count);
        if (this.contentManagerOpen) {
          this.requestUpdate();
        }
      });
    }
    void this.refreshContentManagerDiskSizes();
    this.discoveredFiles = null;
    void this.refreshDiscoveredFiles();
    this.requestUpdate();
    void this.updateComplete.then(() => {
      const dialog = this.shadowRoot?.getElementById("contentManagerDialog") as HTMLDialogElement | null;
      dialog?.showModal();
    });
  }

  /** Resolve on-disk byte sizes for saved textures (best effort, silent). */
  private async refreshContentManagerDiskSizes(): Promise<void> {
    if (this.engine === null || this.directoryHandle === null) {
      return;
    }
    let files: Array<{ id: string; file: string }>;
    try {
      const project = await readProjectMeta(this.directoryHandle);
      files = project.animation.textures.map((texture) => ({ id: texture.id, file: texture.file }));
    } catch {
      return;
    }
    for (const file of files) {
      try {
        const size = await readFileSize(this.directoryHandle, file.file);
        if (size !== null) {
          this.contentManagerDiskSizes.set(file.id, size);
        }
      } catch {
        // Permission or I/O failure: keep the buffer-byte fallback.
      }
    }
    if (this.contentManagerOpen) {
      this.requestUpdate();
    }
  }

  private closeContentManager(): void {
    const dialog = this.shadowRoot?.getElementById("contentManagerDialog") as HTMLDialogElement | null;
    dialog?.close();
    this.contentManagerOpen = false;
  }

  private onContentManagerClosed(): void {
    this.contentManagerOpen = false;
    this.contentManagerData = null;
    this.discoveredFiles = null;
  }

  /**
   * Scan the project content directories for files the project does not
   * reference yet. Runs on content-manager open; only the right type in
   * the right directory counts, independent of storage settings. Files
   * imported earlier this session stay hidden. Best effort: unreadable
   * projects scan with an empty reference set, unlistable directories
   * contribute nothing.
   */
  private async refreshDiscoveredFiles(): Promise<void> {
    if (this.engine === null || this.directoryHandle === null) {
      this.discoveredFiles = [];
      return;
    }
    const dir = this.directoryHandle;
    let referenced = new Set<string>();
    try {
      referenced = collectProjectFileReferences(await readProjectMeta(dir));
    } catch {
      referenced = new Set<string>();
    }
    let scanned: GnumarusDiscoveredContentFile[];
    try {
      scanned = await scanProjectContentFiles(dir, referenced);
    } catch {
      return;
    }
    this.discoveredFiles = scanned.filter((entry) => !this.importedDiscoveredFiles.has(entry.file));
    if (this.contentManagerOpen) {
      this.requestUpdate();
    }
  }

  /** Import one discovered file into the project pool (no cell is linked). */
  private async importDiscoveredFile(file: string): Promise<void> {
    if (this.engine === null || this.directoryHandle === null) {
      return;
    }
    const name = file
      .slice(file.lastIndexOf("/") + 1)
      .replace(/\.[^.]+$/, "")
      .replace(/[^A-Za-z0-9-_]+/g, "_")
      .slice(0, 48);
    try {
      const bytes = await readFileBytes(this.directoryHandle, file);
      if (bytes === null) {
        throw new Error(`Missing file: ${file}`);
      }
      if (file.startsWith("textures/")) {
        const decoded = await this.decodeDiscoveredTexture(file, bytes);
        if (decoded === null) {
          throw new Error(`Unsupported image: ${file}`);
        }
        if (decoded.width > 16384 || decoded.height > 16384) {
          throw new Error(`Image too large: ${file}`);
        }
        if (this.engine.registerTexturePixels(name, decoded.width, decoded.height, decoded.buffer) === null) {
          throw new Error(`Invalid image: ${file}`);
        }
      } else if (file.startsWith("texts/")) {
        const html = decodeTextFile(file, bytes);
        this.engine.createTextEntry(html);
      } else if (file.startsWith("svgs/")) {
        const svg = decodeSvgFile(file, bytes);
        this.engine.createSvgEntry(svg);
      } else if (file.startsWith("3dmodels/")) {
        const ext = file.slice(file.lastIndexOf(".") + 1);
        if (this.engine.registerModel3d(name, ext, bytes) === null) {
          throw new Error(`Unsupported model: ${file}`);
        }
      } else {
        return;
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.statusMessage = tr("status.importFailed", { reason });
      this.showToast(tr("status.importFailed", { reason }));
      return;
    }
    this.importedDiscoveredFiles.add(file);
    this.contentManagerData = this.engine.getContentManagerData();
    this.refreshLayers();
    this.dirty = true;
    this.statusMessage = tr("status.discoveredImported", { name });
    await this.refreshDiscoveredFiles();
  }

  /** Decode a discovered texture with the same rules as saved projects. */
  private async decodeDiscoveredTexture(
    file: string,
    bytes: Uint8Array,
  ): Promise<{ width: number; height: number; buffer: Uint8ClampedArray } | null> {
    if (this.directoryHandle === null) {
      return null;
    }
    try {
      return await this.decodeStoredTextureBytes(this.directoryHandle, file, bytes);
    } catch {
      return null;
    }
  }

  /** Translated kind label for a cell content record. */
  private contentKindLabel(kind: string): string {
    switch (kind) {
      case "texture":
        return tr("dialog.kindTexture");
      case "text":
        return tr("dialog.kindText");
      case "svg":
        return tr("dialog.kindVector");
      case "model3d":
        return tr("dialog.kindModel3d");
      case "tilemap":
        return tr("dialog.kindTilemap");
      default:
        return tr("dialog.kindEmpty");
    }
  }

  /** Every managed row, unfiltered (the dialog filters by the query). */
  private contentManagerItems(): GnumarusManagedItem[] {
    const data = this.contentManagerData;
    if (data === null) {
      return [];
    }
    const contentName = new Map(data.contents.map((content) => [content.id, content.name] as const));
    const refContents = (ids: string[] | undefined): Array<{ id: string; name: string }> =>
      (ids ?? []).map((id) => ({ id, name: contentName.get(id) ?? id }));
    const items: GnumarusManagedItem[] = [];
    for (const texture of data.textures) {
      const cells = data.usage.textures[texture.id] ?? [];
      items.push({
        kind: "texture",
        id: texture.id,
        name: texture.name,
        sizeBytes: this.contentManagerDiskSizes.get(texture.id) ?? texture.sizeBytes,
        meta: textureMeta(texture.width, texture.height),
        usage: { count: cells.length, cells },
        contents: refContents(data.refs.textures[texture.id]),
      });
    }
    for (const content of data.contents) {
      const cells = data.usage.contents[content.id] ?? [];
      items.push({
        kind: "content",
        id: content.id,
        name: content.name,
        sizeBytes: content.sizeBytes,
        meta: this.contentKindLabel(content.kindLabel),
        usage: { count: cells.length, cells },
        contents: [],
      });
    }
    for (const text of data.texts) {
      const cells = data.usage.texts[text.id] ?? [];
      items.push({
        kind: "text",
        id: text.id,
        name: text.name,
        sizeBytes: text.sizeBytes,
        meta: tr("manager.metaChars", { count: text.charCount }),
        usage: { count: cells.length, cells },
        contents: refContents(data.refs.texts[text.id]),
      });
    }
    for (const svg of data.svgs) {
      const cells = data.usage.svgs[svg.id] ?? [];
      items.push({
        kind: "svg",
        id: svg.id,
        name: svg.name,
        sizeBytes: svg.sizeBytes,
        meta: tr("manager.metaElements", { count: svg.elementCount }),
        usage: { count: cells.length, cells },
        contents: refContents(data.refs.svgs[svg.id]),
      });
    }
    for (const model of data.models) {
      const cells = data.usage.models[model.id] ?? [];
      let meta = modelMeta(model.ext);
      const verts = this.contentManagerVerts.get(model.id);
      meta += verts === undefined ? " · …" : verts === null ? "" : ` · ${tr("manager.metaVertices", { count: verts })}`;
      items.push({
        kind: "model3d",
        id: model.id,
        name: model.name,
        sizeBytes: model.sizeBytes,
        meta,
        usage: { count: cells.length, cells },
        contents: refContents(data.refs.models[model.id]),
      });
    }
    for (const tilemap of data.tilemaps) {
      const cells = data.usage.tilemaps[tilemap.id] ?? [];
      items.push({
        kind: "tilemap",
        id: tilemap.id,
        name: tilemap.name,
        sizeBytes: tilemap.sizeBytes,
        meta: `${tr("manager.metaTiles", { count: tilemap.tileCount })} · ${tilemap.tileWidth}×${tilemap.tileHeight}`,
        usage: { count: cells.length, cells },
        contents: refContents(data.refs.tilemaps[tilemap.id]),
      });
    }
    return items;
  }

  /** Thumbnail for a managed row (null until the raster decodes). */
  private contentManagerThumb(item: GnumarusManagedItem): string | null {
    switch (item.kind) {
      case "texture":
        return this.thumbnailDataUrl(item.id);
      case "text":
        return this.textThumbnailDataUrl(item.id);
      case "svg":
        return this.svgThumbnailDataUrl(item.id);
      case "model3d":
        return this.model3dThumbnailDataUrl(item.id);
      case "tilemap":
        return this.tilemapThumbnailDataUrl(item.id);
      case "content": {
        const record = this.contentManagerData?.contents.find((entry) => entry.id === item.id);
        if (record?.refId === undefined || record.refId === null) {
          return null;
        }
        switch (record.kindLabel) {
          case "texture":
            return this.thumbnailDataUrl(record.refId);
          case "text":
            return this.textThumbnailDataUrl(record.refId);
          case "svg":
            return this.svgThumbnailDataUrl(record.refId);
          case "model3d":
            return this.model3dThumbnailDataUrl(record.refId);
          case "tilemap":
            return this.tilemapThumbnailDataUrl(record.refId);
          default:
            return null;
        }
      }
      default:
        return null;
    }
  }

  private renderContentManagerDialog() {
    const data = this.contentManagerData;
    const all = this.contentManagerItems();
    const filtered = searchManagedItems(all, this.contentManagerQuery);
    const sections: Array<{ kind: GnumarusManagedItem["kind"]; title: string }> = [
      { kind: "texture", title: tr("manager.textures") },
      { kind: "content", title: tr("manager.contents") },
      { kind: "text", title: tr("manager.texts") },
      { kind: "svg", title: tr("manager.vectors") },
      { kind: "model3d", title: tr("manager.models") },
      { kind: "tilemap", title: tr("manager.tilemaps") },
    ];
    return html`
      <dialog id="contentManagerDialog" data-testid="content-manager-dialog" @close=${(): void => this.onContentManagerClosed()}>
        <h3>${tr("manager.title")}</h3>
        <input
          type="search"
          data-testid="content-manager-search"
          placeholder=${tr("manager.searchPlaceholder")}
          .value=${this.contentManagerQuery}
          @input=${(event: Event): void => {
            const input = event.target as HTMLInputElement | null;
            this.contentManagerQuery = input?.value ?? "";
          }}
        />
        ${data === null
          ? html``
          : filtered.length === 0
            ? html`<p data-testid="content-manager-empty">${tr("manager.noResults")}</p>`
            : sections.map((section) => {
                const rows = filtered.filter((item) => item.kind === section.kind);
                if (rows.length === 0) {
                  return html``;
                }
                return html`
                  <h4 data-testid="content-manager-section" data-kind=${section.kind}>
                    ${section.title} (${rows.length})
                  </h4>
                  <div class="picker-grid" data-testid="content-manager-grid" data-kind=${section.kind}>
                    ${rows.map((item) => {
                      const thumb = this.contentManagerThumb(item);
                      return html`
                        <div
                          class="picker-item manager-item"
                          data-testid="content-manager-item"
                          data-kind=${item.kind}
                          data-item-id=${item.id}
                          title=${item.name}
                        >
                          ${thumb !== null
                            ? html`<img class="picker-thumb" src=${thumb} alt="" />`
                            : html`<span class="picker-empty" aria-hidden="true">∅</span>`}
                          <span class="picker-name">${item.name}</span>
                          <span class="manager-meta">${item.meta} · ${formatContentBytes(item.sizeBytes)}</span>
                          <span class="manager-meta">
                            ${item.kind === "content"
                              ? item.usage.count > 0
                                ? tr("manager.usedIn", { count: item.usage.count })
                                : tr("manager.unused")
                              : item.contents.length > 0
                                ? tr("manager.usedByContents", { count: item.contents.length })
                                : tr("manager.unused")}
                          </span>
                          ${item.kind === "content"
                            ? item.usage.cells.length > 0
                              ? html`<span class="manager-cells">
                                  ${item.usage.cells.map(
                                    (cell) => html`<span class="manager-cell" data-testid="content-manager-cell"
                                      >${tr("manager.cellRef", { layer: cell.layerName, frame: cell.frame + 1 })}</span
                                    >`,
                                  )}
                                </span>`
                              : html``
                            : item.contents.length > 0
                              ? html`<span class="manager-cells">
                                  ${item.contents.map(
                                    (content) => html`<span class="manager-cell" data-testid="content-manager-content" data-content-id=${content.id}
                                      >${content.name}</span
                                    >`,
                                  )}
                                </span>`
                              : html``}
                        </div>
                      `;
                    })}
                  </div>
                `;
              })}
        ${this.discoveredFiles !== null && this.discoveredFiles.length > 0
          ? html`
              <h4 data-testid="content-manager-discovered-title">
                ${tr("manager.discovered")} (${this.discoveredFiles.length})
              </h4>
              <div class="picker-grid" data-testid="content-manager-discovered">
                ${this.discoveredFiles.map((entry) => {
                  const kindTitle =
                    entry.kind === "texture"
                      ? tr("manager.textures")
                      : entry.kind === "text"
                        ? tr("manager.texts")
                        : entry.kind === "svg"
                          ? tr("manager.vectors")
                          : tr("manager.models");
                  return html`
                    <div
                      class="picker-item manager-item"
                      data-testid="content-manager-discovered-item"
                      data-file=${entry.file}
                      data-kind=${entry.kind}
                      title=${entry.file}
                    >
                      <span class="picker-name">${entry.file}</span>
                      <span class="manager-meta">${kindTitle}</span>
                      <button
                        data-testid="content-manager-discovered-import"
                        data-file=${entry.file}
                        @click=${(): void => {
                          void this.importDiscoveredFile(entry.file);
                        }}
                      >
                        ${tr("manager.import")}
                      </button>
                    </div>
                  `;
                })}
              </div>
            `
          : html``}
        <div class="dialog-actions">
          <button @click=${(): void => this.closeContentManager()}>${tr("btn.close")}</button>
        </div>
      </dialog>
    `;
  }

  private renderContentPickerDialog() {
    const contents = this.sortedContents();
    return html`
      <dialog id="contentPickerDialog" @close=${(): void => this.onContentPickerClosed()}>
        <h3>${tr("matrix.selectContent")}</h3>
        <div class="picker-grid" data-testid="content-picker-grid">
          ${this.contentPickerMode === "relink"
            ? html``
            : html`
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
              `}
          <button
            class="picker-item"
            data-testid="content-picker-new-text"
            @click=${(): void => this.onContentPickerSelect("new-text")}
          >
            <span class="picker-empty" aria-hidden="true">T</span>
            <span class="picker-name">${tr("dialog.newText")}</span>
          </button>
          ${contents.map((content) => {
            const url =
              content.textId !== null
                ? this.textThumbnailDataUrl(content.textId)
                : content.svgId !== null
                  ? this.svgThumbnailDataUrl(content.svgId)
                  : content.model3dId !== null
                    ? this.model3dThumbnailDataUrl(content.model3dId)
                    : content.tilemapId !== null
                      ? this.tilemapThumbnailDataUrl(content.tilemapId)
                      : content.textureId === null
                        ? null
                        : this.thumbnailDataUrl(content.textureId);
            const kind =
              content.textId !== null
                ? tr("dialog.kindText")
                : content.svgId !== null
                  ? tr("dialog.kindVector")
                  : content.model3dId !== null
                    ? tr("dialog.kindModel3d")
                    : content.tilemapId !== null
                      ? tr("dialog.kindTilemap")
                      : content.textureId !== null
                        ? tr("dialog.kindTexture")
                        : tr("dialog.kindEmpty");
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
                <span class="picker-kind" data-testid="content-picker-kind">${kind}</span>
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
        <h3>${this.texturePickerTileset ? tr("dialog.selectTileset") : tr("dialog.selectTexture")}</h3>
        <div class="picker-grid" data-testid="texture-picker-grid">
          ${this.texturePickerTileset
            ? html``
            : html`
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
              `}
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
                  ? html`<img
                      class="picker-thumb"
                      src=${url}
                      alt=""
                      data-texture-id=${texture.id}
                      style=${this.texturePickerTileset ? this.canvasBackgroundCss() : ""}
                    />`
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

  /** Targets for cell-content actions: the valid selection, else the current cell. */
  private resolveCellActionTargets(): Array<{ layerId: string; frame: number }> {
    const selected = this.validSelectedCells();
    if (selected.length > 0) {
      return selected;
    }
    if (this.engine === null) {
      return [];
    }
    return [{ layerId: this.engine.getActiveLayerId(), frame: this.engine.getCurrentFrame() }];
  }

  /**
   * Dissociate the content of every target cell (bulk menu, single menu and
   * the run-action palette share this). Single empty cell: error toast.
   */
  private unlinkCellContent(targets: Array<{ layerId: string; frame: number }>): void {
    this.closeMatrixMenu();
    if (this.engine === null || targets.length === 0) {
      this.showToast(tr("status.cellEmpty"));
      return;
    }
    let count = 0;
    for (const target of targets) {
      if (this.engine.dissociateCellContent(target.layerId, target.frame)) {
        count += 1;
      }
    }
    this.refreshLayers();
    this.dirty = true;
    if (count === 0) {
      this.showToast(tr(targets.length > 1 ? "status.nothingToUnlink" : "status.cellEmpty"));
      return;
    }
    if (targets.length === 1) {
      this.statusMessage = tr("status.cellDissociated");
      return;
    }
    this.statusMessage = tr("status.cellsUnlinked", { count });
    this.showToast(tr("status.cellsUnlinked", { count }));
  }

  /** Open the content picker in relink mode for the target cells. */
  private openRelinkDialog(targets: Array<{ layerId: string; frame: number }>): void {
    this.closeMatrixMenu();
    if (this.engine === null || targets.length === 0) {
      this.showToast(tr("status.cellEmpty"));
      return;
    }
    this.relinkTargets = targets.map((target) => ({ ...target }));
    this.contentPickerMode = "relink";
    this.requestUpdate();
    void this.updateComplete.then(() => {
      const dialog = this.shadowRoot?.getElementById("contentPickerDialog") as HTMLDialogElement | null;
      dialog?.showModal();
    });
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
    this.contentPickerMode = "single";
    this.relinkTargets = null;
  }

  private closeContentPicker(): void {
    const dialog = this.shadowRoot?.getElementById("contentPickerDialog") as HTMLDialogElement | null;
    dialog?.close();
    this.contentPickerTarget = null;
    this.contentPickerMode = "single";
    this.relinkTargets = null;
  }

  private onContentPickerSelect(contentId: string): void {
    if (this.contentPickerMode === "relink") {
      this.onRelinkPickerSelect(contentId);
      return;
    }
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
    if (contentId === "new-text") {
      const created = this.engine.createTextContent(target.layerId, target.frame);
      if (created === null) {
        this.statusMessage = tr("status.contentCreateFailed");
        this.closeContentPicker();
        return;
      }
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage = tr("status.textCreated");
      this.closeContentPicker();
      void this.openTextEditor(target.layerId, target.frame, created.contentId, created.textId);
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

  /**
   * Content choice while the picker runs in relink mode: every relink
   * target ends up sharing the same content. The none/new options are
   * hidden in this mode; new-text creates on the first target and links
   * the rest to the created entry.
   */
  private onRelinkPickerSelect(contentId: string): void {
    const targets = this.relinkTargets ?? [];
    if (targets.length === 0 || this.engine === null) {
      this.closeContentPicker();
      return;
    }
    if (contentId === "none" || contentId === "new") {
      this.closeContentPicker();
      return;
    }
    const first = targets[0];
    if (first === undefined) {
      this.closeContentPicker();
      return;
    }
    if (contentId === "new-text") {
      const created = this.engine.createTextContent(first.layerId, first.frame);
      if (created === null) {
        this.statusMessage = tr("status.contentCreateFailed");
        this.closeContentPicker();
        return;
      }
      for (const target of targets.slice(1)) {
        this.engine.associateCellContent(target.layerId, target.frame, created.contentId);
      }
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage = tr("status.cellsRelinked", { count: targets.length });
      this.showToast(tr("status.cellsRelinked", { count: targets.length }));
      this.closeContentPicker();
      void this.openTextEditor(first.layerId, first.frame, created.contentId, created.textId);
      return;
    }
    let count = 0;
    for (const target of targets) {
      if (this.engine.associateCellContent(target.layerId, target.frame, contentId)) {
        count += 1;
      }
    }
    if (count > 0) {
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage = tr("status.cellsRelinked", { count });
      this.showToast(tr("status.cellsRelinked", { count }));
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
    this.texturePickerTileset = false;
  }

  private closeTexturePicker(): void {
    const dialog = this.shadowRoot?.getElementById("texturePickerDialog") as HTMLDialogElement | null;
    dialog?.close();
    this.texturePickerContentId = null;
    this.texturePickerTileset = false;
  }

  /** Tileset picker assignment: tool staging plus the active tilemap cell (kept in sync). */
  private onTilesetPickerSelect(textureId: string): void {
    if (this.engine === null) {
      this.closeTexturePicker();
      return;
    }
    if (textureId === "none") {
      this.engine.setTileBrushTileset(null);
      this.refreshLayers();
      this.statusMessage = tr("status.tileNoTileset");
      this.closeTexturePicker();
      return;
    }
    let resolved = textureId;
    if (textureId === "new") {
      resolved = this.engine.createEmptyTexture();
      this.refreshLayers();
    }
    this.engine.setTileBrushTileset(resolved);
    const layer = this.engine.getActiveLayerId();
    const frame = this.engine.getCurrentFrame();
    const contentId = this.engine.getCellContentId(layer, frame);
    if (contentId !== null) {
      this.engine.setTilemapTileset(layer, frame, resolved);
    }
    this.refreshLayers();
    this.dirty = true;
    const entry =
      this.engine === null
        ? undefined
        : this.engine.getAnimationMatrix().textures.find((item) => item.id === resolved);
    this.statusMessage = tr("status.tileTileset", { name: entry?.name ?? resolved });
    this.closeTexturePicker();
  }

  private onTexturePickerSelect(textureId: string): void {
    if (this.texturePickerTileset) {
      this.onTilesetPickerSelect(textureId);
      return;
    }
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

  /** Text picker: assign an existing text entry to a cell (shared, like textures). */
  private renderTextPickerDialog() {
    const texts = this.engine?.getTextEntries() ?? [];
    return html`
      <dialog id="textPickerDialog" data-testid="text-picker-dialog" @close=${(): void => this.onTextPickerClosed()}>
        <h3>${tr("dialog.selectText")}</h3>
        <div class="picker-grid" data-testid="text-picker-grid">
          <button
            class="picker-item"
            data-testid="text-picker-new"
            @click=${(): void => this.onTextPickerSelect("new")}
          >
            <span class="picker-empty" aria-hidden="true">+</span>
            <span class="picker-name">${tr("dialog.newText")}</span>
          </button>
          ${texts.length === 0
            ? html`<span class="picker-empty-note">${tr("status.noTexts")}</span>`
            : texts.map((entry) => {
                const url = this.textThumbnailDataUrl(entry.id);
                return html`
                  <button
                    class="picker-item"
                    data-testid="text-picker-item"
                    data-text-id=${entry.id}
                    title=${entry.name}
                    @click=${(): void => this.onTextPickerSelect(entry.id)}
                  >
                    ${url !== null
                      ? html`<img class="picker-thumb" src=${url} alt="" />`
                      : html`<span class="picker-empty" aria-hidden="true">T</span>`}
                    <span class="picker-name">${entry.name}</span>
                  </button>
                `;
              })}
        </div>
        <div class="dialog-actions">
          <button @click=${(): void => this.closeTextPicker()}>${tr("btn.cancel")}</button>
        </div>
      </dialog>
    `;
  }

  private async onOpenTextPicker(): Promise<void> {
    const target = this.matrixCellTarget();
    this.closeMatrixMenu();
    if (target === null || this.engine === null) {
      return;
    }
    this.textPickerTarget = { ...target };
    await this.updateComplete;
    const dialog = this.shadowRoot?.getElementById("textPickerDialog") as HTMLDialogElement | null;
    dialog?.showModal();
  }

  private onTextPickerClosed(): void {
    this.textPickerTarget = null;
  }

  private closeTextPicker(): void {
    const dialog = this.shadowRoot?.getElementById("textPickerDialog") as HTMLDialogElement | null;
    dialog?.close();
    this.textPickerTarget = null;
  }

  private onTextPickerSelect(textId: string): void {
    const target = this.textPickerTarget;
    if (target === null || this.engine === null) {
      this.closeTextPicker();
      return;
    }
    if (textId === "new") {
      const created = this.engine.createTextContent(target.layerId, target.frame);
      if (created === null) {
        this.statusMessage = tr("status.contentCreateFailed");
        this.closeTextPicker();
        return;
      }
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage = tr("status.textCreated");
      this.closeTextPicker();
      void this.openTextEditor(target.layerId, target.frame, created.contentId, created.textId);
      return;
    }
    if (this.engine.getCellTextId(target.layerId, target.frame) === textId) {
      this.statusMessage = tr("status.textSame");
      this.closeTextPicker();
      return;
    }
    const assigned = this.engine.createCellContentWithText(target.layerId, target.frame, textId);
    if (assigned === null) {
      this.statusMessage = tr("status.contentCreateFailed");
    } else {
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage = tr("status.textAssociated");
    }
    this.closeTextPicker();
  }

  /** Cell menu: reopen the editor for the cell's text. */
  private onEditTextFromCell(): void {
    const target = this.matrixCellTarget();
    this.closeMatrixMenu();
    if (target === null || this.engine === null) {
      return;
    }
    const contentId = this.engine.getCellContentId(target.layerId, target.frame);
    const textId = this.engine.getCellTextId(target.layerId, target.frame);
    if (contentId === null || textId === null) {
      return;
    }
    void this.openTextEditor(target.layerId, target.frame, contentId, textId);
  }

  /** Cell menu: bake the cell's text into a texture content (explicit rasterize). */
  private onRasterizeTextFromCell(): void {
    const target = this.matrixCellTarget();
    this.closeMatrixMenu();
    if (target === null || this.engine === null) {
      return;
    }
    if (this.engine.rasterizeTextContent(target.layerId, target.frame)) {
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage = tr("status.textRasterized");
    } else {
      this.statusMessage = tr("status.textRasterFailed");
    }
  }

  /**
   * Drag the text editor dialog by its title bar so the canvas stays
   * visible while editing. The native modal dialog is centered by
   * default; the first drag pins it to fixed coordinates, later drags
   * move it from there.
   */
  private startTextDialogDrag(event: PointerEvent): void {
    const dialog = this.shadowRoot?.getElementById("textEditorDialog") as HTMLDialogElement | null;
    if (dialog === null || dialog === undefined || !dialog.open) {
      return;
    }
    event.preventDefault();
    const rect = dialog.getBoundingClientRect();
    dialog.style.position = "fixed";
    dialog.style.margin = "0";
    dialog.style.left = `${rect.left}px`;
    dialog.style.top = `${rect.top}px`;
    const startX = event.clientX;
    const startY = event.clientY;
    const baseLeft = rect.left;
    const baseTop = rect.top;
    const onMove = (moveEvent: PointerEvent): void => {
      const nextLeft = Math.min(
        Math.max(baseLeft + moveEvent.clientX - startX, 8 - rect.width),
        window.innerWidth - 40,
      );
      const nextTop = Math.min(
        Math.max(baseTop + moveEvent.clientY - startY, 0),
        window.innerHeight - 40,
      );
      dialog.style.left = `${nextLeft}px`;
      dialog.style.top = `${nextTop}px`;
    };
    const onUp = (): void => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  /** System font families offered by the text editor (matches the sanitizer allowlist). */
  private textFontFamilies(): string[] {
    return [
      "sans-serif",
      "serif",
      "monospace",
      "Arial",
      "Helvetica",
      "Verdana",
      "Tahoma",
      "Trebuchet MS",
      "Georgia",
      "Times New Roman",
      "Courier New",
      "Impact",
      "Comic Sans MS",
      "Segoe UI",
      "system-ui",
      "cursive",
      "fantasy",
    ];
  }

  /** Open the rich text editor for a cell's text entry (live preview, single history entry on OK). */
  private async openTextEditor(layerId: string, frame: number, contentId: string, textId: string): Promise<void> {
    if (this.engine === null) {
      return;
    }
    const document = this.engine.getTextDocument(textId);
    if (document === null) {
      return;
    }
    this.closeMatrixMenu();
    this.textEditor = { layerId, frame, contentId, textId, beforeHtml: document.html };
    this.textEditorColor = "#000000";
    await this.updateComplete;
    const area = this.shadowRoot?.getElementById("textEditorArea");
    if (area !== null && area !== undefined) {
      area.innerHTML = document.html;
      (area as HTMLElement).focus();
    }
    const dialog = this.shadowRoot?.getElementById("textEditorDialog") as HTMLDialogElement | null;
    dialog?.showModal();
  }

  private renderTextEditorDialog() {
    const editor = this.textEditor;
    if (editor === null || this.engine === null) {
      return html``;
    }
    const document = this.engine.getTextDocument(editor.textId);
    return html`
      <dialog id="textEditorDialog" data-testid="text-editor-dialog" @close=${(): void => this.onTextEditorClosed()}>
        <h3
          class="text-editor-title"
          data-testid="text-editor-title"
          @pointerdown=${(event: PointerEvent): void => this.startTextDialogDrag(event)}
        >${tr("dialog.editText")}</h3>
        <div class="text-toolbar" role="toolbar" aria-label=${tr("dialog.editText")}>
          <button data-testid="text-bold" title=${tr("dialog.textBold")} @mousedown=${(event: MouseEvent): void => event.preventDefault()} @click=${(): void => this.applyTextCommand("bold")}>
            <b>B</b>
          </button>
          <button data-testid="text-italic" title=${tr("dialog.textItalic")} @mousedown=${(event: MouseEvent): void => event.preventDefault()} @click=${(): void => this.applyTextCommand("italic")}>
            <i>I</i>
          </button>
          <button data-testid="text-underline" title=${tr("dialog.textUnderline")} @mousedown=${(event: MouseEvent): void => event.preventDefault()} @click=${(): void => this.applyTextCommand("underline")}>
            <u>U</u>
          </button>
          <label title=${tr("dialog.textFont")}>${tr("dialog.textFont")}
            <select
              id="textEditorFont"
              data-testid="text-font"
              @change=${(): void => this.applyTextFontFromDialog()}
            >
              ${this.textFontFamilies().map((family) => html`<option value=${family}>${family}</option>`)}
            </select>
          </label>
          <label title=${tr("dialog.textSize")}>${tr("dialog.textSize")}
            <input
              type="number"
              id="textEditorSize"
              data-testid="text-size"
              min="6"
              max="500"
              step="1"
              value="32"
            />
          </label>
          <span class="text-color-row" title=${tr("dialog.textColor")}>
            <span>${tr("dialog.textColor")}</span>
            <gnumarus-color-picker
              id="textEditorColor"
              .switchOutOfBlack=${this.colorSwitchOutOfBlack}
              .value=${this.textEditorColor}
              model="hsl"
              @gnumarus-color-change=${(event: Event): void => {
                const detail = (event as CustomEvent<{ value?: unknown }>).detail;
                if (typeof detail?.value === "string") {
                  this.textEditorColor = detail.value;
                  this.applyTextCommand("foreColor", detail.value);
                }
              }}
            ></gnumarus-color-picker>
          </span>
          <button data-testid="text-apply-size" title=${tr("dialog.textSize")} @mousedown=${(event: MouseEvent): void => event.preventDefault()} @click=${(): void => this.applyTextSizeFromDialog()}>
            ${tr("btn.set")}
          </button>
        </div>
        <div
          id="textEditorArea"
          class="text-editor-area"
          data-testid="text-editor-area"
          contenteditable="true"
          @input=${(): void => {
            this.saveTextSelection();
            this.onTextEditorInput();
          }}
          @blur=${(): void => this.saveTextSelection()}
          @keyup=${(): void => this.saveTextSelection()}
          @mouseup=${(): void => this.saveTextSelection()}
          @paste=${(event: ClipboardEvent): void => this.onTextEditorPaste(event)}
        ></div>
        ${document === null
          ? html`<p class="text-editor-empty">${tr("status.contentCreateFailed")}</p>`
          : html``}
        <div class="dialog-actions">
          <button data-testid="text-cancel" @click=${(): void => this.cancelTextEditor()}>${tr("btn.cancel")}</button>
          <button data-testid="text-ok" @click=${(): void => this.confirmTextEditor()}>${tr("btn.ok")}</button>
        </div>
      </dialog>
    `;
  }

  /** Last editor selection (toolbar controls steal focus; restored before styling). */
  private savedTextRange: Range | null = null;

  /** Run a formatting command inside the editor, then push a live preview. */
  private applyTextCommand(command: "bold" | "italic" | "underline" | "foreColor", value?: string): void {
    const area = this.shadowRoot?.getElementById("textEditorArea");
    if (!(area instanceof HTMLElement)) {
      return;
    }
    area.focus();
    this.restoreTextSelection();
    try {
      document.execCommand(command, false, value ?? undefined);
    } catch {
      // Unsupported command: leave the DOM untouched.
    }
    this.onTextEditorInput();
  }

  private applyTextFontFromDialog(): void {
    const select = this.shadowRoot?.getElementById("textEditorFont") as HTMLSelectElement | null;
    const family = select?.value ?? "";
    if (family === "") {
      return;
    }
    this.wrapTextSelection(`font-family:${family.includes(" ") ? `"${family}"` : family}`);
  }

  private applyTextSizeFromDialog(): void {
    const input = this.shadowRoot?.getElementById("textEditorSize") as HTMLInputElement | null;
    const size = Math.min(500, Math.max(6, Math.round(Number.parseFloat(input?.value ?? "") || 0)));
    if (!Number.isFinite(size) || size < 6) {
      return;
    }
    this.wrapTextSelection(`font-size:${size}px`);
  }

  /**
   * Selection scoped to the shell shadow tree (where the editor lives).
   * `document.getSelection` does not pierce shadow DOM, so it reports the
   * host/body instead of the real in-editor range.
   */
  private editorSelection(): Selection | null {
    const scoped = (
      this.shadowRoot as ShadowRoot & { getSelection?: () => Selection | null }
    )?.getSelection?.();
    return scoped ?? document.getSelection();
  }

  /**
   * Snapshot the editor selection (called on area blur/keys/mouse, i.e.
   * right before a toolbar control steals focus).
   */
  private saveTextSelection(): void {
    const area = this.shadowRoot?.getElementById("textEditorArea");
    if (!(area instanceof HTMLElement)) {
      return;
    }
    const selection = this.editorSelection();
    if (selection !== null && selection.rangeCount > 0 && area.contains(selection.anchorNode)) {
      try {
        this.savedTextRange = selection.getRangeAt(0).cloneRange();
      } catch {
        this.savedTextRange = null;
      }
    }
  }

  /**
   * Re-select the snapshot inside the editor (toolbar controls steal
   * focus; without this, styling applies to an empty selection and looks
   * like a no-op). A live non-collapsed range wins; otherwise a live
   * non-collapsed snapshot wins over a stale collapsed caret (e.g. the
   * caret `focus()` restores after typing in a toolbar field).
   */
  private restoreTextSelection(): boolean {
    const area = this.shadowRoot?.getElementById("textEditorArea");
    if (!(area instanceof HTMLElement)) {
      return false;
    }
    const selection = this.editorSelection();
    if (selection !== null && selection.rangeCount > 0 && area.contains(selection.anchorNode)) {
      if (!selection.isCollapsed) {
        return true;
      }
    }
    const saved = this.savedTextRange;
    if (selection !== null && saved !== null) {
      try {
        if (area.contains(saved.startContainer) && area.contains(saved.endContainer)) {
          const probe = saved.cloneRange();
          if (!probe.collapsed) {
            selection.removeAllRanges();
            selection.addRange(saved.cloneRange());
            return true;
          }
        }
      } catch {
        // Fall through to the current selection below.
      }
    }
    return selection !== null && selection.rangeCount > 0 && area.contains(selection.anchorNode);
  }

  /**
   * Wrap the editor selection in a styled span (or insert a styled
   * placeholder when collapsed), then push a live preview.
   */
  private wrapTextSelection(style: string): void {
    const area = this.shadowRoot?.getElementById("textEditorArea");
    if (!(area instanceof HTMLElement)) {
      return;
    }
    area.focus();
    this.restoreTextSelection();
    const selection = this.editorSelection();
    const span = document.createElement("span");
    span.setAttribute("style", style);
    if (selection !== null && !selection.isCollapsed && area.contains(selection.anchorNode)) {
      try {
        const range = selection.getRangeAt(0);
        range.surroundContents(span);
        selection.removeAllRanges();
      } catch {
        try {
          const range = selection.getRangeAt(0);
          span.appendChild(range.extractContents());
          range.insertNode(span);
          selection.removeAllRanges();
        } catch {
          // Leave the DOM untouched when the range cannot be wrapped.
          return;
        }
      }
    } else {
      span.innerHTML = "&#8203;";
      try {
        if (selection !== null && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0).cloneRange();
          range.collapse(true);
          range.insertNode(span);
          range.setStart(span.firstChild as Node, 1);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        } else {
          area.appendChild(span);
        }
      } catch {
        return;
      }
    }
    this.onTextEditorInput();
  }

  /** Live preview: sanitize into the engine and refresh the canvas (no history). */
  private onTextEditorInput(): void {
    const editor = this.textEditor;
    const area = this.shadowRoot?.getElementById("textEditorArea");
    if (editor === null || this.engine === null || !(area instanceof HTMLElement)) {
      return;
    }
    if (this.engine.previewTextEdit(editor.textId, area.innerHTML)) {
      this.refreshLayers();
      this.dirty = true;
    }
  }

  /** Paste sanitized rich text (canonical subset); plain-text fallback. */
  private onTextEditorPaste(event: ClipboardEvent): void {
    const editor = this.textEditor;
    const area = this.shadowRoot?.getElementById("textEditorArea");
    if (editor === null || !(area instanceof HTMLElement)) {
      return;
    }
    event.preventDefault();
    area.focus();
    const html = event.clipboardData?.getData("text/html") ?? "";
    const plain = event.clipboardData?.getData("text/plain") ?? "";
    try {
      if (html !== "") {
        document.execCommand("insertHTML", false, sanitizeTextHtml(html));
      } else if (plain !== "") {
        document.execCommand("insertText", false, plain);
      }
    } catch {
      // Clipboard insertion unsupported: leave the DOM untouched.
    }
    this.onTextEditorInput();
  }

  private confirmTextEditor(): void {
    const editor = this.textEditor;
    if (editor === null || this.engine === null) {
      return;
    }
    // Read the final DOM first: OK commits exactly what the user sees.
    const area = this.shadowRoot?.getElementById("textEditorArea");
    if (area instanceof HTMLElement) {
      this.engine.previewTextEdit(editor.textId, area.innerHTML);
    }
    // Clear state before closing so @close does not restore (cancel path).
    const beforeHtml = editor.beforeHtml;
    const textId = editor.textId;
    this.textEditor = null;
    this.savedTextRange = null;
    const dialog = this.shadowRoot?.getElementById("textEditorDialog") as HTMLDialogElement | null;
    dialog?.close();
    if (this.engine.commitTextEdit(textId, beforeHtml)) {
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage = tr("status.textEdited");
    } else {
      this.refreshLayers();
    }
  }

  private cancelTextEditor(): void {
    const editor = this.textEditor;
    // Clear state before closing so @close does not restore twice.
    this.textEditor = null;
    this.savedTextRange = null;
    const dialog = this.shadowRoot?.getElementById("textEditorDialog") as HTMLDialogElement | null;
    dialog?.close();
    if (editor !== null && this.engine !== null) {
      this.engine.previewTextEdit(editor.textId, editor.beforeHtml);
      this.refreshLayers();
    }
  }

  /** Native dialog close (Esc/X): restore the pre-edit document (cancel path). */
  private onTextEditorClosed(): void {
    const editor = this.textEditor;
    this.textEditor = null;
    this.savedTextRange = null;
    if (editor !== null && this.engine !== null) {
      this.engine.previewTextEdit(editor.textId, editor.beforeHtml);
      this.refreshLayers();
    }
  }

  /** Tile-brush tool options: tileset picker, tile size, tiles window toggle, hints. */
  private renderTileBrushOptions() {
    const brush = this.engine?.getTileBrush() ?? null;
    const size = this.engine?.getTileBrushTileSize() ?? { w: 16, h: 16 };
    const tilesetEntry =
      this.engine === null
        ? undefined
        : (this.engine.getAnimationMatrix().textures.find((entry) => entry.id === brush?.tilesetId) ?? undefined);
    const tilesetName = tilesetEntry === null || tilesetEntry === undefined ? tr("dialog.noTexture") : tilesetEntry.name;
    return html`
      <div class="tool-options" data-testid="tool-options" aria-label=${tr("options.suffix", { tool: this.toolDisplayName(this.tool) })} ?hidden=${this.uiHidden}>
        <label>${tr("opt.tileset")}
          <button data-testid="tile-tileset" title=${tr("dialog.selectTileset")} @click=${(): void => void this.openTexturePickerForTileset()}>
            ${tilesetName}
          </button>
        </label>
        <label title=${tr("opt.tileWidth")}>${tr("opt.tileWidth")}
          <input
            type="number"
            data-testid="tile-width"
            min="1"
            max="1024"
            step="1"
            .value=${String(size.w)}
            @change=${(): void => this.applyTileSizeFromDialog()}
          />
        </label>
        <label title=${tr("opt.tileHeight")}>${tr("opt.tileHeight")}
          <input
            type="number"
            data-testid="tile-height"
            min="1"
            max="1024"
            step="1"
            .value=${String(size.h)}
            @change=${(): void => this.applyTileSizeFromDialog()}
          />
        </label>
        <button
          data-testid="tile-window-toggle"
          class=${this.tileWindowOpen ? "active" : ""}
          title=${tr("opt.tilesHint")}
          @click=${(): void => {
            this.tileWindowOpen = !this.tileWindowOpen;
          }}
        >
          ${tr("opt.tiles")}
        </button>
        <span class="tool-options-empty">${tr("opt.tileHint")}</span>
      </div>
    `;
  }

  private applyTileSizeFromDialog(): void {
    if (this.engine === null) {
      return;
    }
    const widthInput = this.shadowRoot?.querySelector('[data-testid="tile-width"]') as HTMLInputElement | null;
    const heightInput = this.shadowRoot?.querySelector('[data-testid="tile-height"]') as HTMLInputElement | null;
    const w = Math.min(1024, Math.max(1, Math.round(Number(widthInput?.value) || 0)));
    const h = Math.min(1024, Math.max(1, Math.round(Number(heightInput?.value) || 0)));
    if (!Number.isFinite(w) || !Number.isFinite(h) || w < 1 || h < 1) {
      return;
    }
    this.engine.setTileBrushSize(w, h);
    this.refreshLayers();
    this.dirty = true;
    this.statusMessage = tr("status.tileSize", { w, h });
  }

  /** Open the texture picker assigning the tile-brush tileset (not a content texture). */
  private async openTexturePickerForTileset(): Promise<void> {
    if (this.engine === null) {
      return;
    }
    this.texturePickerTileset = true;
    this.texturePickerContentId = null;
    await this.updateComplete;
    const dialog = this.shadowRoot?.getElementById("texturePickerDialog") as HTMLDialogElement | null;
    dialog?.showModal();
  }

  /** Inline CSS background matching the project canvas (solid color or checkerboard). */
  private canvasBackgroundCss(): string {
    if (this.engine === null) {
      return "background-color: transparent;";
    }
    const checker = this.engine.getCheckerSettings();
    const background = this.engine.getBackgroundSettings();
    if (background.mode === "solid") {
      return `background-color: ${background.color};`;
    }
    const sizeX = Math.max(1, Math.floor(checker.sizeX));
    const sizeY = Math.max(1, Math.floor(checker.sizeY));
    return (
      `background-color: ${checker.colorA}; ` +
      `background-image: repeating-conic-gradient(${checker.colorA} 0% 25%, ${checker.colorB} 0% 50%); ` +
      `background-size: ${sizeX * 2}px ${sizeY * 2}px;`
    );
  }

  /** Floating tiles window: pick tiles from the effective tileset grid. */
  private renderTileWindow() {
    const tilesetId = this.engine?.getTileBrushTilesetId() ?? null;
    const size = this.engine?.getTileBrushTileSize() ?? { w: 16, h: 16 };
    const brush = this.engine?.getTileBrush() ?? null;
    const entry =
      this.engine === null || tilesetId === null
        ? null
        : (this.engine.exportTextures().find((item) => item.id === tilesetId) ?? null);
    const columns = entry === null ? 0 : Math.max(1, Math.floor(entry.width / Math.max(1, size.w)));
    const rows = entry === null ? 0 : Math.max(1, Math.floor(entry.height / Math.max(1, size.h)));
    const thumb = tilesetId === null ? null : this.thumbnailDataUrl(tilesetId);
    const previewScale = Math.max(1, Math.ceil(32 / Math.max(size.w, size.h)));
    const cells: Array<{ tx: number; ty: number }> = [];
    for (let ty = 0; ty < rows; ty += 1) {
      for (let tx = 0; tx < columns; tx += 1) {
        cells.push({ tx, ty });
      }
    }
    return html`
      <div class="preview-window" style="left: ${this.tileWindowX}px; top: ${this.tileWindowY}px;" data-testid="tile-window">
        <div class="preview-header" @pointerdown=${(event: PointerEvent): void => this.onTileWindowDragStart(event)}>
          <span>${tr("dialog.tilesTitle")}</span>
          <span class="spacer"></span>
          <button
            aria-label=${tr("btn.close")}
            title=${tr("btn.close")}
            @click=${(): void => {
              this.tileWindowOpen = false;
            }}
          >
            ×
          </button>
        </div>
        <div class="tile-window-body" data-testid="tile-window-grid">
          ${entry === null || thumb === null
            ? html`
                <p class="tile-window-empty">${tr("status.tileNoTileset")}</p>
                <button @click=${(): void => void this.openTexturePickerForTileset()}>${tr("dialog.selectTileset")}</button>
              `
            : html`
                <div
                  class="tile-grid"
                  style="grid-template-columns: repeat(${columns}, ${size.w * previewScale}px); ${this.canvasBackgroundCss()}"
                >
                  ${cells.map(
                    (cell) => html`
                      <button
                        class="tile-cell ${brush !== null && brush.tx === cell.tx && brush.ty === cell.ty ? "active" : ""}"
                        data-testid="tile-cell"
                        data-tx=${cell.tx}
                        data-ty=${cell.ty}
                        title="[${cell.tx}, ${cell.ty}]"
                        style="width: ${size.w * previewScale}px; height: ${size.h * previewScale}px; background-image: url('${thumb}'); background-size: ${entry.width * previewScale}px ${entry.height * previewScale}px; background-position: ${-cell.tx * size.w * previewScale}px ${-cell.ty * size.h * previewScale}px;"
                        @click=${(): void => this.onTileCellPick(cell.tx, cell.ty)}
                      ></button>
                    `,
                  )}
                </div>
              `}
        </div>
      </div>
    `;
  }

  private onTileCellPick(tx: number, ty: number): void {
    if (this.engine === null) {
      return;
    }
    this.engine.setTileBrushTile(tx, ty);
    this.refreshLayers();
    this.dirty = true;
  }

  private tileWindowDragState: { startX: number; startY: number; originX: number; originY: number } | null = null;

  private onTileWindowDragStart(event: PointerEvent): void {
    const target = event.target as HTMLElement | null;
    if (target !== null && target.closest("button") !== null) {
      return;
    }
    this.tileWindowDragState = { startX: event.clientX, startY: event.clientY, originX: this.tileWindowX, originY: this.tileWindowY };
    const move = (moveEvent: PointerEvent): void => {
      if (this.tileWindowDragState === null) {
        return;
      }
      this.tileWindowX = Math.max(0, this.tileWindowDragState.originX + (moveEvent.clientX - this.tileWindowDragState.startX));
      this.tileWindowY = Math.max(0, this.tileWindowDragState.originY + (moveEvent.clientY - this.tileWindowDragState.startY));
    };
    const up = (): void => {
      this.tileWindowDragState = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  /** Fly-camera options bar: live pose readout plus reset. */
  private renderFlycamOptions() {
    const fly = this.engine?.getFlycam() ?? null;
    const readout =
      fly === null
        ? ""
        : tr("opt.flycamReadout", {
            yaw: Math.round(((fly.yawDeg % 360) + 360) % 360),
            pitch: Math.round(fly.pitchDeg * 10) / 10,
            x: Math.round(fly.x * 100) / 100,
            y: Math.round(fly.y * 100) / 100,
            z: Math.round(fly.z * 100) / 100,
          });
    return html`
      <div class="tool-options" data-testid="tool-options" aria-label=${tr("options.suffix", { tool: this.toolDisplayName(this.tool) })} ?hidden=${this.uiHidden}>
        ${fly === null
          ? html`<span class="tool-options-empty">${tr("opt.flycamNoCell")}</span>`
          : html`
              <span class="tool-options-readout" data-testid="flycam-readout">${readout}</span>
              <button data-testid="flycam-reset" title=${tr("opt.modelResetHint")} @click=${(): void => this.handleFlycamReset()}>
                ${tr("opt.modelReset")}
              </button>
            `}
        <span class="tool-options-empty">${tr("opt.flycamHint")}</span>
      </div>
    `;
  }

  /** Retouch tool options: shared dab size plus per-tool mode controls. */
  private renderRetouchOptions() {
    return html`
      <div class="tool-options" data-testid="tool-options" aria-label=${tr("options.suffix", { tool: this.toolDisplayName(this.tool) })} ?hidden=${this.uiHidden}>
        <label title=${tr("opt.retouchSizeHint")}
          >${tr("opt.retouchSize")}
          <input
            type="number"
            id="retouchSize"
            min="0.1"
            max="64"
            step="0.1"
            .value=${String(this.retouchSize)}
            @input=${(): void => this.applyRetouchSizeFromDialog()}
          />
        </label>
        ${this.tool === "shading"
          ? html`
              <label title=${tr("opt.shadeModeHint")}
                >${tr("opt.shadeMode")}
                <select id="shadeMode" .value=${this.shadeMode} @change=${(): void => this.applyShadeModeFromDialog()}>
                  <option value="lighten">${tr("opt.shadeLighten")}</option>
                  <option value="darken">${tr("opt.shadeDarken")}</option>
                  <option value="hue">${tr("opt.shadeHue")}</option>
                </select>
              </label>
              <label title=${tr("opt.shadeAmountHint")}
                >${tr("opt.shadeAmount")}
                <input
                  type="number"
                  id="shadeAmount"
                  min="1"
                  max="100"
                  step="1"
                  .value=${String(Math.round(this.shadeAmount * 100))}
                  @input=${(): void => this.applyShadeAmountFromDialog()}
                />
              </label>
            `
          : html``}
        ${this.tool === "blur"
          ? html`
              <label title=${tr("opt.blurModeHint")}
                >${tr("opt.blurMode")}
                <select id="blurMode" .value=${this.blurMode} @change=${(): void => this.applyBlurModeFromDialog()}>
                  <option value="blur">${tr("opt.blurBlur")}</option>
                  <option value="sharpen">${tr("opt.blurSharpen")}</option>
                </select>
              </label>
            `
          : html``}
        ${this.tool === "recolor"
          ? html`
              <label title=${tr("opt.recolorToleranceHint")}
                >${tr("opt.recolorTolerance")}
                <input
                  type="number"
                  id="recolorTolerance"
                  min="0"
                  max="100"
                  step="1"
                  .value=${String(this.recolorTolerance)}
                  @input=${(): void => this.applyRecolorToleranceFromDialog()}
                />
              </label>
            `
          : html``}
        ${this.tool === "clone" ? html`<span class="tool-options-empty">${tr("opt.cloneHint")}</span>` : html``}
        ${this.tool === "jumble" ? html`<span class="tool-options-empty">${tr("opt.jumbleHint")}</span>` : html``}
      </div>
    `;
  }

  /** Shape + gradient tool options: shared width/fill/AA for shapes, mode/dither for gradients. */
  private renderShapeOptions() {
    return html`
      <div class="tool-options" data-testid="tool-options" aria-label=${tr("options.suffix", { tool: this.toolDisplayName(this.tool) })} ?hidden=${this.uiHidden}>
        ${this.tool === "gradient"
          ? html`
              <label title=${tr("opt.gradientModeHint")}
                >${tr("opt.gradientMode")}
                <select id="gradientMode" .value=${this.gradientMode} @change=${(): void => this.applyGradientModeFromDialog()}>
                  <option value="linear">${tr("opt.gradientLinear")}</option>
                  <option value="radial">${tr("opt.gradientRadial")}</option>
                </select>
              </label>
              <label title=${tr("opt.gradientDitherHint")}
                ><input
                  type="checkbox"
                  id="gradientDither"
                  .checked=${this.gradientDither}
                  @change=${(): void => this.applyGradientDitherFromDialog()}
                />
                ${tr("opt.gradientDither")}
              </label>
            `
          : html`
              <label title=${tr("opt.shapeWidthHint")}
                >${tr("opt.shapeWidth")}
                <input
                  type="number"
                  id="shapeWidth"
                  min="0.1"
                  max="64"
                  step="0.1"
                  .value=${String(this.shapeWidth)}
                  @input=${(): void => this.applyShapeWidthFromDialog()}
                />
              </label>
              <label title=${tr("opt.shapeFillHint")}
                ><input
                  type="checkbox"
                  id="shapeFilled"
                  .checked=${this.shapeFilled}
                  @change=${(): void => this.applyShapeFilledFromDialog()}
                />
                ${tr("opt.shapeFill")}
              </label>
              <label title=${tr("opt.shapeAntialiasHint")}
                ><input
                  type="checkbox"
                  id="shapeAntialias"
                  .checked=${this.shapeAntialias}
                  @change=${(): void => this.applyShapeAntialiasFromDialog()}
                />
                ${tr("opt.shapeAntialias")}
              </label>
            `}
      </div>
    `;
  }

  /** Fly-camera bar action: reset the view to the classic 3/4 framing. */
  private handleFlycamReset(): void {
    if (this.engine === null) {
      return;
    }
    if (this.engine.flyResetView()) {
      this.statusMessage = tr("status.flycamReset");
      this.refreshLayers();
    }
  }

  /** 3D model transform options: live view readout plus reset/commit/cancel. */
  private renderModelTransformOptions() {
    const view = this.engine?.getModelViewForActiveCell() ?? null;
    return html`
      <div class="tool-options" data-testid="tool-options" aria-label=${tr("options.suffix", { tool: this.toolDisplayName(this.tool) })} ?hidden=${this.uiHidden}>
        ${view === null
          ? html`<span class="tool-options-empty">${tr("opt.modelNoCell")}</span>`
          : html`
              <span class="tool-options-readout" data-testid="model-view-readout">
                ${tr("opt.modelView", {
                  azimuth: Math.round(view.azimuth),
                  elevation: Math.round(view.elevation),
                  distance: view.distance.toFixed(2),
                })}
              </span>
              <button data-testid="model-view-reset" title=${tr("opt.modelResetHint")} @click=${(): void => this.commitModelViewEdit("reset")}>
                ${tr("opt.modelReset")}
              </button>
              <button data-testid="model-view-commit" title=${tr("opt.modelCommitHint")} @click=${(): void => this.commitModelViewEdit("commit")}>
                ${tr("btn.ok")}
              </button>
              <button data-testid="model-view-cancel" title=${tr("opt.modelCancelHint")} @click=${(): void => this.commitModelViewEdit("cancel")}>
                ${tr("btn.cancel")}
              </button>
            `}
        <span class="tool-options-empty">${tr("opt.modelHint")}</span>
      </div>
    `;
  }

  /** Options-bar model view action: reset to the classic view, commit, or cancel. */
  private commitModelViewEdit(action: "reset" | "commit" | "cancel"): void {
    if (this.engine === null) {
      return;
    }
    if (action === "reset") {
      this.engine.resetModelView();
    } else if (action === "commit") {
      this.engine.commitModelOrbit();
    } else {
      this.engine.cancelModelOrbit();
    }
    this.refreshLayers();
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

  private openFrameDurationsDialog(frames: number[], total: boolean): void {
    if (this.engine === null || frames.length === 0) {
      return;
    }
    this.durationTargetFrame = null;
    this.durationTargetFrames = [...frames];
    this.durationTotal = total;
    this.durationValue = null;
    this.requestUpdate();
    const dialog = this.shadowRoot?.getElementById("frameDurationDialog") as HTMLDialogElement | null;
    dialog?.showModal();
  }

  private onOpenFramesDuration(total: boolean): void {
    if (this.matrixMenu === null || this.matrixMenu.kind !== "frames") {
      this.closeMatrixMenu();
      return;
    }
    const frames = [...this.matrixMenu.frames];
    this.closeMatrixMenu();
    this.openFrameDurationsDialog(frames, total);
  }

  /** Run-action entry for total duration: splits over the current selection. */
  private openTotalDurationFromSelection(): void {
    const frames = [...this.selectedFrameSet()].sort((a, b) => a - b);
    if (frames.length < 2) {
      this.statusMessage = tr("status.framesNeedTwo");
      this.showToast(tr("status.framesNeedTwo"));
      return;
    }
    this.openFrameDurationsDialog(frames, true);
  }

  private closeFrameDurationDialog(): void {
    const dialog = this.shadowRoot?.getElementById("frameDurationDialog") as HTMLDialogElement | null;
    dialog?.close();
    this.durationTargetFrame = null;
    this.durationTargetFrames = null;
    this.durationTotal = false;
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

  /** Open the New-animation dialog for the given frames (sorted, deduped). */
  private openNewAnimationDialog(frames: number[]): void {
    if (this.engine === null) {
      return;
    }
    const count = this.engine.getFrameCount();
    const valid = [...new Set(frames)]
      .filter((frame) => Number.isInteger(frame) && frame >= 0 && frame < count)
      .sort((left, right) => left - right);
    if (valid.length === 0) {
      return;
    }
    this.closeMatrixMenu();
    this.animationCreateFrames = valid;
    this.animationCreateName = "";
    this.animationCreateLoop = "forward";
    this.animationCreateError = null;
    this.requestUpdate();
    void this.updateComplete.then(() => {
      const dialog = this.shadowRoot?.getElementById("animationCreateDialog") as HTMLDialogElement | null;
      dialog?.showModal();
      const input = this.shadowRoot?.getElementById("animationCreateName") as HTMLInputElement | null;
      input?.focus();
    });
  }

  private closeNewAnimationDialog(): void {
    const dialog = this.shadowRoot?.getElementById("animationCreateDialog") as HTMLDialogElement | null;
    dialog?.close();
    this.animationCreateFrames = null;
    this.animationCreateError = null;
  }

  private confirmNewAnimation(): void {
    const targets = this.animationCreateFrames;
    if (targets === null || targets.length === 0 || this.engine === null) {
      this.closeNewAnimationDialog();
      return;
    }
    const name = this.animationCreateName.trim();
    if (name.length === 0) {
      this.animationCreateError = tr("dialog.animNameRequired");
      return;
    }
    const loop = this.animationCreateLoop === "none" || this.animationCreateLoop === "ping-pong" ? this.animationCreateLoop : "forward";
    if (
      !this.engine.addNamedAnimation({
        name,
        loop,
        frames: targets.map((frame) => ({ frame, duration: null })),
      })
    ) {
      this.animationCreateError = tr("dialog.animExists", { name });
      return;
    }
    this.engine.setActiveAnimation(name);
    this.refreshLayers();
    this.dirty = true;
    this.statusMessage =
      targets.length === 1
        ? tr("status.animAddedOne", { name })
        : tr("status.animAdded", { name, count: targets.length });
    this.showToast(this.statusMessage);
    this.closeNewAnimationDialog();
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
    this.exportSheetAll = false;
    this.exportTab = "frame";
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
   * Download the whole project as a `.gpp` package (a zip with a single
   * root directory holding every project file, exactly what File > Upload
   * project imports). Uses the same entry builder as save, so the bytes
   * always match the current storage settings.
   */
  private async exportFullProject(): Promise<void> {
    if (this.engine === null) {
      this.closeExportDialog();
      return;
    }
    try {
      const { blobs } = await this.buildProjectFileBlobs();
      const rootName = sanitizeEmbeddedProjectName(this.projectName) ?? "project";
      const raw: Record<string, Uint8Array> = {};
      for (const [path, blob] of blobs) {
        raw[`${rootName}/${path}`] = new Uint8Array(await blob.arrayBuffer());
      }
      const zipped = zipSync(raw, { level: 9 });
      const blob = new Blob([zipped as Uint8Array<ArrayBuffer>], { type: "application/zip" });
      const fileName = `${exportBaseName(rootName)}.gpp`;
      this.closeExportDialog();
      if (await this.saveExportBlob(blob, fileName, "Gnumaru paint project")) {
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
        this.exportLossless,
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
   * True when the animation export format goes through a WASM codec with a
   * lossless toggle (single-file jxl/webp or a jxl/webp still sequence).
   */
  private animatedFormatUsesLossless(): boolean {
    if (this.exportAnimatedFormat === "jxl" || this.exportAnimatedFormat === "webp") {
      return true;
    }
    const mime = findStillFormat(this.exportFormats, this.exportAnimatedFormat)?.mime;
    return mime === JXL_MIME || mime === WEBP_MIME;
  }

  /** True when the animation export format has no quality control. */
  private animatedFormatHidesQuality(): boolean {
    if (this.exportAnimatedFormat === "gif") {
      return true;
    }
    if (this.exportAnimatedFormat === "jxl" || this.exportAnimatedFormat === "webp") {
      return this.exportAnimatedLossless;
    }
    const mime = findStillFormat(this.exportFormats, this.exportAnimatedFormat)?.mime;
    if (mime === "image/png") {
      return true;
    }
    if (mime === undefined) {
      return false;
    }
    if (mime !== JXL_MIME && mime !== WEBP_MIME) {
      return false;
    }
    return this.exportAnimatedLossless;
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
            lossless: this.exportAnimatedLossless,
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
            lossless: this.exportAnimatedLossless,
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
          this.exportAnimatedLossless,
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
    if (this.exportSheetAll) {
      const frames: number[] = [];
      for (let frame = 0; frame < this.engine.getFrameCount(); frame += 1) {
        frames.push(frame);
      }
      strips.push({ frames });
    }
    const listInput = this.shadowRoot?.getElementById("exportSheetFrames") as HTMLInputElement | null;
    const listText = this.exportSheetAll ? "" : (listInput?.value.trim() ?? "");
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
            this.exportSheetLossless,
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
        this.exportSheetLossless,
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
    const engine = this.engine;
    const input = this.shadowRoot?.getElementById("frameDuration") as HTMLInputElement | null;
    const raw = (input?.value ?? "").trim();
    const targets = this.durationTargetFrames ?? (this.durationTargetFrame === null ? [] : [this.durationTargetFrame]);
    const total = this.durationTotal && this.durationTargetFrames !== null;
    if (targets.length === 0 || engine === null) {
      this.closeFrameDurationDialog();
      return;
    }
    if (raw === "") {
      let cleared = false;
      for (const frame of targets) {
        cleared = engine.setFrameDuration(frame, null) || cleared;
      }
      if (targets.length === 1) {
        this.statusMessage = tr("status.frameUsesDefault", { frame: targets[0] as number + 1 });
      } else {
        this.statusMessage = tr("status.framesUseDefault", { count: targets.length });
      }
      void cleared;
    } else {
      const value = Number(raw);
      if (!Number.isFinite(value) || value <= 0) {
        this.closeFrameDurationDialog();
        return;
      }
      if (total) {
        const each = clampFrameDurationSec(value / targets.length);
        for (const frame of targets) {
          engine.setFrameDuration(frame, each);
        }
        this.statusMessage = tr("status.framesTotalDuration", { count: targets.length, value, each });
      } else if (targets.length === 1) {
        const duration = clampFrameDurationSec(value);
        engine.setFrameDuration(targets[0] as number, duration);
        this.statusMessage = tr("status.frameDuration", { frame: (targets[0] as number) + 1, value: duration });
      } else {
        const duration = clampFrameDurationSec(value);
        for (const frame of targets) {
          engine.setFrameDuration(frame, duration);
        }
        this.statusMessage = tr("status.framesDuration", { count: targets.length, value: duration });
      }
    }
    this.refreshLayers();
    this.dirty = true;
    this.closeFrameDurationDialog();
  }

  private clearFrameDuration(): void {
    const engine = this.engine;
    const targets = this.durationTargetFrames ?? (this.durationTargetFrame === null ? [] : [this.durationTargetFrame]);
    this.closeFrameDurationDialog();
    if (targets.length === 0 || engine === null) {
      return;
    }
    let cleared = false;
    for (const frame of targets) {
      cleared = engine.setFrameDuration(frame, null) || cleared;
    }
    if (cleared) {
      this.refreshLayers();
      this.dirty = true;
      if (targets.length === 1) {
        this.statusMessage = tr("status.frameUsesDefault", { frame: (targets[0] as number) + 1 });
      } else {
        this.statusMessage = tr("status.framesUseDefault", { count: targets.length });
      }
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
    if (this.contextMenuLayerId === null) {
      this.closeLayerMenu();
      return;
    }
    const layerId = this.contextMenuLayerId;
    this.closeLayerMenu();
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
    this.collapseLayerSelectionToActive();
    this.refreshLayers();
  }

  private onSelectLayer(id: string): void {
    if (this.engine === null) {
      return;
    }
    if (id !== this.activeLayerId) {
      this.engine.setActiveLayer(id);
    }
    this.selectSingleLayer(id);
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

  private onBlendInput(id: string, blend: string): void {
    if (this.engine?.setLayerBlendMode(id, parseLayerBlendMode(blend)) === true) {
      this.refreshLayers();
      this.dirty = true;
    }
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

  private layerParentOf(id: string): string | null {
    return this.layers.find((layer) => layer.id === id)?.parentId ?? null;
  }

  private layerDepthOf(id: string): number {
    let depth = 0;
    let current = this.layerParentOf(id);
    const seen = new Set<string>([id]);
    while (current !== null) {
      if (seen.has(current)) {
        break;
      }
      seen.add(current);
      depth += 1;
      current = this.layerParentOf(current);
    }
    return depth;
  }

  private collapsedLayerSet(): Set<string> {
    return new Set(this.collapsedLayers ?? []);
  }

  private hasLayerChildren(id: string): boolean {
    return this.layers.some((layer) => (layer.parentId ?? null) === id);
  }

  private isLayerRowHidden(id: string): boolean {
    const parents = new Map(this.layers.map((layer) => [layer.id, layer.parentId ?? null] as const));
    return isHiddenByCollapse(id, parents, this.collapsedLayerSet());
  }

  private toggleCollapsedLayer(id: string): void {
    const next = new Set(this.collapsedLayers ?? []);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.collapsedLayers = [...next];
  }

  private onLayerDragStart(event: DragEvent, id: string): void {
    this.dragLayerId = id;
    this.dropTargetLayerId = null;
    if (event.dataTransfer !== null) {
      event.dataTransfer.effectAllowed = "move";
      try {
        event.dataTransfer.setData("text/plain", id);
      } catch {
        // Some browsers block setData outside trusted gestures; ids still tracked locally.
      }
    }
  }

  private onLayerDragOver(event: DragEvent, id: string): void {
    if (this.dragLayerId === null || this.dragLayerId === id) {
      return;
    }
    event.preventDefault();
    if (event.dataTransfer !== null) {
      event.dataTransfer.dropEffect = "move";
    }
    if (this.dropTargetLayerId !== id) {
      this.dropTargetLayerId = id;
    }
  }

  private onLayerDragLeave(id: string): void {
    if (this.dropTargetLayerId === id) {
      this.dropTargetLayerId = null;
    }
  }

  private onLayerDrop(event: DragEvent, id: string): void {
    event.preventDefault();
    const dragged = this.dragLayerId ?? event.dataTransfer?.getData("text/plain") ?? null;
    this.dragLayerId = null;
    this.dropTargetLayerId = null;
    if (dragged === null || dragged === "" || dragged === id || this.engine === null) {
      return;
    }
    if (this.layers.find((layer) => layer.id === id)?.isMask === true) {
      this.statusMessage = tr("status.layerReparentOntoMask");
      this.showToast(tr("status.layerReparentOntoMask"));
      return;
    }
    const targetName = this.layers.find((layer) => layer.id === id)?.name ?? id;
    if (this.engine.reparentLayerAsChild(dragged, id)) {
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage = tr("status.layerReparented", { name: targetName });
      this.showToast(tr("status.layerReparented", { name: targetName }));
    } else {
      this.statusMessage = tr("status.layerReparentInvalid");
      this.showToast(tr("status.layerReparentInvalid"));
    }
  }

  private onLayerDragEnd(): void {
    this.dragLayerId = null;
    this.dropTargetLayerId = null;
  }

  private onMakeRootLayer(id: string): void {
    this.closeLayerMenu();
    if (this.engine === null) {
      return;
    }
    if (this.engine.makeRootLayer(id)) {
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage = tr("status.layerMadeRoot");
    } else {
      this.statusMessage = tr("status.layerAlreadyRoot");
    }
  }

  private makeActiveLayerRoot(): void {
    if (this.engine === null) {
      return;
    }
    const id = this.engine.getActiveLayerId();
    if (this.engine.makeRootLayer(id)) {
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage = tr("status.layerMadeRoot");
    } else {
      this.statusMessage = tr("status.layerAlreadyRoot");
    }
  }

  private isMergeDownDisabled(id: string | null): boolean {
    if (id === null || this.layers.length === 0 || this.layers[0]?.id === id) {
      return true;
    }
    const index = this.layers.findIndex((entry) => entry.id === id);
    if (index <= 0) {
      return true;
    }
    const upper = this.layers[index];
    const lower = this.layers[index - 1];
    if (upper === undefined || lower === undefined) {
      return true;
    }
    if (upper.isMask || lower.isMask) {
      return true;
    }
    return this.layers.some((entry) => entry.isMask && entry.parentId === upper.id);
  }

  private onMergeDown(id: string): void {
    this.closeLayerMenu();
    const index = this.layers.findIndex((entry) => entry.id === id);
    const upper = index < 0 ? undefined : this.layers[index];
    const lower = index <= 0 ? undefined : this.layers[index - 1];
    const upperHasMasks =
      upper !== undefined && this.layers.some((entry) => entry.isMask && entry.parentId === upper.id);
    if ((upper?.isMask ?? false) || (lower?.isMask ?? false) || upperHasMasks) {
      this.statusMessage = tr("status.layerMaskNoMerge");
      this.showToast(tr("status.layerMaskNoMerge"));
      return;
    }
    if (this.engine?.mergeDown(id) === true) {
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage = tr("status.layersMerged");
    } else {
      this.statusMessage = tr("status.nothingBelow");
    }
  }

  private onToggleLayerMask(id: string): void {
    this.closeLayerMenu();
    if (this.engine === null) {
      return;
    }
    const result = this.engine.setLayerMask(id, !(this.layers.find((entry) => entry.id === id)?.isMask ?? false));
    const name = this.layers.find((entry) => entry.id === id)?.name ?? id;
    if (result === "ok") {
      this.refreshLayers();
      this.dirty = true;
      const masked = this.layers.find((entry) => entry.id === id)?.isMask ?? false;
      this.statusMessage = masked ? tr("status.layerMaskOn", { name }) : tr("status.layerMaskOff", { name });
    } else if (result === "needs-parent") {
      this.statusMessage = tr("status.layerMaskNeedsParent");
      this.showToast(tr("status.layerMaskNeedsParent"));
    } else if (result === "has-children") {
      this.statusMessage = tr("status.layerMaskHasChildren");
      this.showToast(tr("status.layerMaskHasChildren"));
    } else if (result === "parent-is-mask") {
      this.statusMessage = tr("status.layerMaskParentIsMask");
      this.showToast(tr("status.layerMaskParentIsMask"));
    }
  }

  private toggleActiveLayerMask(): void {
    if (this.engine === null) {
      return;
    }
    const id = this.engine.getActiveLayerId();
    const result = this.engine.setLayerMask(id, !(this.layers.find((entry) => entry.id === id)?.isMask ?? false));
    const name = this.layers.find((entry) => entry.id === id)?.name ?? id;
    if (result === "ok") {
      this.refreshLayers();
      this.dirty = true;
      const masked = this.layers.find((entry) => entry.id === id)?.isMask ?? false;
      this.statusMessage = masked ? tr("status.layerMaskOn", { name }) : tr("status.layerMaskOff", { name });
    } else if (result === "needs-parent") {
      this.statusMessage = tr("status.layerMaskNeedsParent");
      this.showToast(tr("status.layerMaskNeedsParent"));
    } else if (result === "has-children") {
      this.statusMessage = tr("status.layerMaskHasChildren");
      this.showToast(tr("status.layerMaskHasChildren"));
    } else if (result === "parent-is-mask") {
      this.statusMessage = tr("status.layerMaskParentIsMask");
      this.showToast(tr("status.layerMaskParentIsMask"));
    }
  }

  private onAddLayerAbove(id: string): void {
    this.closeLayerMenu();
    if (this.engine === null) {
      return;
    }
    const added = this.engine.insertLayerAbove(id);
    if (added !== null) {
      this.selectSingleLayer(added);
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
    const added = this.engine.insertLayerBelow(id);
    if (added !== null) {
      this.selectSingleLayer(added);
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
    const selected = this.selectedLayerSet();
    if (selected.size > 1 && selected.has(id)) {
      this.contextMenuLayerId = id;
      this.contextMenuLayerIds = this.selectedLayerIds();
    } else {
      this.selectSingleLayer(id);
      this.contextMenuLayerId = id;
      this.contextMenuLayerIds = null;
    }
    this.contextMenuX = clientX;
    this.contextMenuY = clientY;
  }

  private closeLayerMenu(): void {
    this.contextMenuLayerId = null;
    this.contextMenuLayerIds = null;
  }

  /** Delete one layer (the shared layers menu single target). */
  private onDeleteLayer(id: string): void {
    this.closeLayerMenu();
    this.onRemoveLayer(id);
  }

  /** Delete every layer in a multi-selection (structural, like single delete). */
  private onDeleteLayers(ids: string[]): void {
    this.closeLayerMenu();
    if (this.engine === null || ids.length === 0) {
      return;
    }
    const deleted = this.engine.removeLayers(ids);
    if (deleted > 0) {
      this.collapseLayerSelectionToActive();
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage = tr("status.layersDeleted", { count: deleted });
      this.showToast(tr("status.layersDeleted", { count: deleted }));
    } else {
      this.statusMessage = tr("status.layerDeleteLast");
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

  /** Report a mask-op outcome (ok refreshes, transformed needs a reset first). */
  private reportMaskOutcome(outcome: "ok" | "transformed" | "none", done: () => void): void {
    if (outcome === "transformed") {
      this.statusMessage = tr("status.maskNeedsReset");
      this.showToast(tr("status.maskNeedsReset"));
      return;
    }
    if (outcome === "none") {
      return;
    }
    done();
    this.refreshLayers();
  }

  /** Feather the floating mask by the dialog radius (no undo until merge). */
  private async applyFeatherFromDialog(): Promise<void> {
    // Baking a live adjust first keeps the previewed pixels (a reshape
    // replaces the floating buffer, which would orphan the session).
    await this.confirmBrightnessContrast();
    await this.confirmHslAdjust();
    if (this.engine === null) {
      return;
    }
    const input = this.shadowRoot?.getElementById("featherRadius") as HTMLInputElement | null;
    const parsed = Math.floor(Number(input?.value ?? "0"));
    const radius = Number.isFinite(parsed) ? Math.min(32, Math.max(0, parsed)) : 0;
    this.featherRadius = radius;
    this.reportMaskOutcome(this.engine?.featherFloatingSelection(radius) ?? "none", () => {
      this.statusMessage = tr("status.feathered", { value: radius });
    });
  }

  /** Grow (+1) or shrink (-1) the floating mask by the dialog pixel count. */
  private async reshapeFloatingSelection(direction: 1 | -1): Promise<void> {
    // Bake a live adjust first (a reshape replaces the floating buffer,
    // which would orphan the session).
    await this.confirmBrightnessContrast();
    await this.confirmHslAdjust();
    if (this.engine === null) {
      return;
    }
    const input = this.shadowRoot?.getElementById("growShrinkPx") as HTMLInputElement | null;
    const parsed = Math.floor(Number(input?.value ?? "1"));
    const px = Number.isFinite(parsed) ? Math.min(64, Math.max(1, parsed)) : 1;
    this.growShrinkPx = px;
    this.reportMaskOutcome(this.engine?.reshapeFloatingSelection(direction * px) ?? "none", () => {
      this.dirty = true;
      this.statusMessage = direction > 0 ? tr("status.grown", { value: px }) : tr("status.shrunk", { value: px });
    });
  }

  private applyGrowShrinkFromDialog(): void {
    const input = this.shadowRoot?.getElementById("growShrinkPx") as HTMLInputElement | null;
    const parsed = Math.floor(Number(input?.value ?? "1"));
    this.growShrinkPx = Number.isFinite(parsed) ? Math.min(64, Math.max(1, parsed)) : 1;
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

  /** Open the Adjust colors dialog (brightness/contrast/posterize). */
  private async openAdjustColorsDialog(): Promise<void> {
    if (this.engine === null) {
      return;
    }
    this.closeAllMenus();
    await this.updateComplete;
    const dialog = this.shadowRoot?.getElementById("adjustColorsDialog") as HTMLDialogElement | null;
    dialog?.showModal();
    const ok = this.shadowRoot?.getElementById("adjustColorsOk") as HTMLButtonElement | null;
    ok?.focus();
  }

  private closeAdjustColorsDialog(): void {
    const dialog = this.shadowRoot?.getElementById("adjustColorsDialog") as HTMLDialogElement | null;
    dialog?.close();
  }

  private currentDialogAdjustLevels(): { brightness: number; contrast: number; posterize: number } {
    const num = (id: string, fallback: number): number => {
      const input = this.shadowRoot?.getElementById(id) as HTMLInputElement | null;
      const raw = Number(input?.value ?? String(fallback));
      return Number.isFinite(raw) ? raw : fallback;
    };
    return clampAdjustLevels({
      brightness: num("adjustBrightness", 0),
      contrast: num("adjustContrast", 0),
      posterize: num("adjustPosterize", 0),
    });
  }

  /** Apply the dialog levels to the current cell (single undoable entry). */
  private confirmAdjustColors(): void {
    const levels = this.currentDialogAdjustLevels();
    this.adjustBrightness = levels.brightness;
    this.adjustContrast = levels.contrast;
    this.adjustPosterize = levels.posterize;
    this.closeAdjustColorsDialog();
    if (this.engine === null) {
      return;
    }
    const outcome = this.engine.adjustCurrentCellPixels((r, g, b, a) => adjustPixel(r, g, b, a, levels));
    if (outcome === "adjusted") {
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage = tr("status.adjusted");
    } else if (outcome === "empty") {
      this.statusMessage = tr("status.adjustEmpty");
      this.showToast(tr("status.adjustEmpty"));
    }
  }

  /** Open the live brightness/contrast floating window (two sliders + Cancel/Apply/OK). */
  private async openBrightnessContrastDialog(): Promise<void> {
    if (this.bcOpen) {
      return;
    }
    if (this.engine === null) {
      return;
    }
    if (this.filterOpen) {
      this.cancelFilterDialog();
    }
    if (!this.engine.startBrightnessContrast()) {
      this.statusMessage = tr("status.adjustEmpty");
      this.showToast(tr("status.adjustEmpty"));
      return;
    }
    this.closeAllMenus();
    this.bcBrightness = 0;
    this.bcContrast = 0;
    this.bcOpen = true;
    await this.updateComplete;
  }

  /** Clamped slider levels currently shown in the dialog. */
  private currentBcLevels(): { brightness: number; contrast: number } {
    // Read reactive state (updated synchronously on input), not the DOM:
    // `change` fires before Lit re-renders the paired control.
    return { brightness: this.bcBrightness, contrast: this.bcContrast };
  }

  /** Slider released: re-apply the dialog levels over the session base (preview, no history). */
  private previewBrightnessContrast(): void {
    if (this.engine === null || !this.bcOpen) {
      return;
    }
    const levels = this.currentBcLevels();
    this.bcBrightness = levels.brightness;
    this.bcContrast = levels.contrast;
    this.engine.previewBrightnessContrast(levels.brightness, levels.contrast);
  }

  /** Cancel: revert to the dialog-open snapshot with no history entry. */
  private cancelBrightnessContrast(): void {
    this.bcOpen = false;
    this.engine?.cancelBrightnessContrast();
  }

  /** Apply: keep the visible change, rebase the session and reset the sliders (dialog stays open). */
  private applyBrightnessContrast(): void {
    if (this.engine === null || !this.bcOpen) {
      return;
    }
    const levels = this.currentBcLevels();
    this.engine.previewBrightnessContrast(levels.brightness, levels.contrast);
    this.engine.rebaseBrightnessContrast();
    this.bcBrightness = 0;
    this.bcContrast = 0;
    this.statusMessage = tr("status.adjusted");
  }

  /** Thematic groups of filters for the Filters menu, in display order. */
  private filterThemes(): Array<{
    id: GnumarusFilterTheme;
    label: string;
    hint: string;
    filters: GnumarusFilterDef[];
  }> {
    const order: GnumarusFilterTheme[] = ["blur", "enhance", "artistic", "edge", "noise", "colors", "decor", "distort"];
    return order.map((id) => ({
      id,
      label: tr(`filter.theme.${id}` as GnumarusMessageKey),
      hint: tr("menu.filtersTitle"),
      filters: GNUMARUS_FILTERS.filter((def) => def.theme === id),
    }));
  }

  /** Active filter definition, or null when no filter dialog is open. */
  private filterDef(): GnumarusFilterDef | null {
    if (this.filterId === null) {
      return null;
    }
    return getFilterDef(this.filterId) ?? null;
  }

  /** Open the generic filter dialog for one filter id (run actions route here). */
  async openFilterDialog(id: string): Promise<void> {
    const def = getFilterDef(id);
    if (def === undefined || this.engine === null) {
      return;
    }
    if (this.filterOpen) {
      this.cancelFilterDialog();
    }
    if (!this.engine.startFilter(id)) {
      this.statusMessage = tr("status.filterEmpty");
      this.showToast(tr("status.filterEmpty"));
      return;
    }
    this.closeAllMenus();
    if (this.bcOpen) {
      this.cancelBrightnessContrast();
    }
    if (this.hsOpen) {
      void this.cancelHslAdjust();
    }
    this.filterId = id;
    this.filterValues = normalizeFilterValues(def, null);
    this.filterWorking = false;
    this.filterRunQueued = false;
    this.filterOpen = true;
    window.addEventListener("keydown", this.onFilterKeyDown);
    await this.updateComplete;
    await this.previewFilter();
  }

  /** Close the filter dialog, reverting to the dialog-open (or last-apply) snapshot. */
  private cancelFilterDialog(): void {
    if (!this.filterOpen) {
      return;
    }
    this.filterOpen = false;
    this.filterId = null;
    window.removeEventListener("keydown", this.onFilterKeyDown);
    this.engine?.cancelFilter();
  }

  /** Escape closes the filter dialog even when focus sits outside it. */
  private readonly onFilterKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") {
      this.cancelFilterDialog();
    }
  };

  /** One generic param row: label, typed control, reset-to-default arrow. */
  private renderFilterParam(param: GnumarusFilterParamDef): unknown {
    const key = `filter.${this.filterId ?? ""}.${param.key}` as GnumarusMessageKey;
    return html`<div class="filter-param-row">${this.renderFilterParamControl(param, key)}</div>`;
  }

  private renderFilterParamControl(param: GnumarusFilterParamDef, key: GnumarusMessageKey): unknown {
    const hintKey = `${key}Hint` as GnumarusMessageKey;
    const value = this.filterValues[param.key] ?? param.def;
    const dirty = value !== param.def;
    const reset = dirty
      ? html`<button
          class="reset-btn"
          data-testid="filter-param-${param.key}-reset"
          aria-label=${tr("a11y.resetToDefault")}
          title=${tr("a11y.resetToDefault")}
          @click=${(): void => {
            this.filterValues = { ...this.filterValues, [param.key]: param.def };
            void this.previewFilter();
          }}
          >↻</button
        >`
      : html``;
    if (param.kind === "boolean") {
      return html`<label title=${tr(hintKey)}
        ><input
          type="checkbox"
          data-testid="filter-param-${param.key}"
          .checked=${value === true}
          @change=${(event: Event): void => {
            const input = event.target as HTMLInputElement | null;
            this.filterValues = { ...this.filterValues, [param.key]: input?.checked === true };
            void this.previewFilter();
          }}
        />
        ${tr(key)}</label
      >${reset}`;
    }
    if (param.kind === "enum") {
      return html`<label title=${tr(hintKey)}
        >${tr(key)}
        <select
          data-testid="filter-param-${param.key}"
          .value=${typeof value === "string" ? value : String(param.def)}
          @change=${(event: Event): void => {
            const select = event.target as HTMLSelectElement | null;
            this.filterValues = { ...this.filterValues, [param.key]: select?.value ?? param.def };
            void this.previewFilter();
          }}
        >
          ${(param.options ?? []).map(
            (option) => html`<option value=${option.value}>${tr(("filter.opt." + option.value) as GnumarusMessageKey)}</option>`,
          )}
        </select>
        </label
      >${reset}`;
    }
    if (param.kind === "text") {
      return html`<label title=${tr(hintKey)}
        >${tr(key)}
        <input
          type="text"
          data-testid="filter-param-${param.key}"
          .value=${typeof value === "string" ? value : String(param.def)}
          @change=${(event: Event): void => {
            const input = event.target as HTMLInputElement | null;
            this.filterValues = { ...this.filterValues, [param.key]: input?.value ?? param.def };
            void this.previewFilter();
          }}
        />
      </label
    >${reset}`;
    }
    const min = param.min ?? 0;
    const max = param.max ?? 100;
    const step = param.step ?? 1;
    const numeric = typeof value === "number" && Number.isFinite(value) ? value : Number(param.def);
    return html`<label title=${tr(hintKey)}
      ><span class="adjust-name">${tr(key)}</span>
      <input
        type="range"
        data-testid="filter-param-${param.key}"
        min=${String(min)}
        max=${String(max)}
        step=${String(step)}
        .value=${String(numeric)}
        @input=${(event: Event): void => {
          const input = event.target as HTMLInputElement | null;
          if (input !== null) {
            const parsed = Number(input.value);
            this.filterValues = { ...this.filterValues, [param.key]: Number.isFinite(parsed) ? parsed : numeric };
          }
        }}
        @change=${(): void => {
          void this.previewFilter();
        }}
      />
      <input
        type="number"
        data-testid="filter-param-${param.key}-num"
        min=${String(min)}
        max=${String(max)}
        step=${String(step)}
        .value=${String(numeric)}
        @input=${(event: Event): void => {
          const input = event.target as HTMLInputElement | null;
          if (input !== null && input.value.trim() !== "" && Number.isFinite(Number(input.value))) {
            this.filterValues = { ...this.filterValues, [param.key]: Number(input.value) };
          }
        }}
        @change=${(): void => {
          void this.previewFilter();
        }}
      />
      </label
    >${reset}`;
  }

  /** Re-run the active filter over the session base (debounced while a run is in flight). */
  private filterRunQueued = false;

  private async previewFilter(): Promise<void> {
    if (!this.filterOpen || this.filterId === null || this.engine === null) {
      return;
    }
    if (this.filterWorking) {
      this.filterRunQueued = true;
      return;
    }
    this.filterWorking = true;
    try {
      do {
        this.filterRunQueued = false;
        await this.updateComplete;
        await new Promise((resolve) => requestAnimationFrame(resolve));
        if (!this.filterOpen || this.filterId === null) {
          return;
        }
        this.engine.previewFilter(this.filterId, { ...this.filterValues });
        this.requestUpdate();
      } while (this.filterRunQueued);
    } finally {
      this.filterWorking = false;
    }
  }

  /** Apply: bake the preview as the new base (undoable later as one entry on OK). */
  private async applyFilter(): Promise<void> {
    if (!this.filterOpen || this.engine === null) {
      return;
    }
    await this.previewFilter();
    this.engine.rebaseFilter();
    this.statusMessage = tr("status.filterApplied");
  }

  /** OK: commit one undoable entry and close. */
  private async confirmFilter(): Promise<void> {
    if (!this.filterOpen) {
      return;
    }
    this.filterOpen = false;
    window.removeEventListener("keydown", this.onFilterKeyDown);
    const id = this.filterId;
    this.filterId = null;
    if (this.engine === null || id === null) {
      return;
    }
    await this.previewFilter();
    const outcome = this.engine.commitFilter();
    if (outcome === "adjusted") {
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage = tr("status.filterApplied");
    } else if (outcome === "empty") {
      this.statusMessage = tr("status.filterEmpty");
      this.showToast(tr("status.filterEmpty"));
    }
  }

  /** OK: one undoable entry from the dialog-open snapshot to the current pixels. */
  private confirmBrightnessContrast(): void {
    if (!this.bcOpen) {
      return;
    }
    this.bcOpen = false;
    if (this.engine === null) {
      return;
    }
    const outcome = this.engine.commitBrightnessContrast();
    if (outcome === "adjusted") {
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage = tr("status.adjusted");
    } else if (outcome === "empty") {
      this.statusMessage = tr("status.adjustEmpty");
      this.showToast(tr("status.adjustEmpty"));
    }
  }

  /** Open the live hue/saturation floating window (four sliders + model/mode + Cancel/Apply/OK). */
  private async openHslAdjustDialog(): Promise<void> {
    if (this.hsOpen) {
      return;
    }
    if (this.engine === null) {
      return;
    }
    if (this.filterOpen) {
      this.cancelFilterDialog();
    }
    if (!this.engine.startHslAdjust()) {
      this.statusMessage = tr("status.adjustEmpty");
      this.showToast(tr("status.adjustEmpty"));
      return;
    }
    this.closeAllMenus();
    this.hsHue = 0;
    this.hsSaturation = 0;
    this.hsLightness = 0;
    this.hsAlpha = 0;
    this.hsModel = "hsl";
    this.hsMode = "additive";
    this.hsWorking = false;
    this.hsPreviewQueued = 0;
    this.hsOpen = true;
    await this.updateComplete;
  }

  /** Clamped slider levels plus the model/mode dropdowns currently shown in the dialog. */
  private currentHslLevels(): {
    hue: number;
    saturation: number;
    lightness: number;
    alpha: number;
    model: GnumarusHslAdjustModel;
    mode: GnumarusHslAdjustMode;
  } {
    // Read reactive state (updated synchronously on input), not the DOM:
    // `change` fires before Lit re-renders the paired control.
    return {
      hue: this.hsHue,
      saturation: this.hsSaturation,
      lightness: this.hsLightness,
      alpha: this.hsAlpha,
      model: this.hsModel,
      mode: this.hsMode,
    };
  }

  /** Slider released (or model/mode switched): queue a live preview over the session base (no history). */
  private previewHslAdjust(): void {
    if (this.engine === null || !this.hsOpen) {
      return;
    }
    this.hsWorking = true;
    this.hsPreviewQueued += 1;
    void this.pumpHslPreview();
  }

  /**
   * Run queued previews one at a time, coalescing rapid changes: show the
   * spinner, yield so it paints, compute from the newest state, and hide
   * the spinner when no newer request arrived meanwhile.
   */
  private async pumpHslPreview(): Promise<void> {
    if (this.hsPreviewActive) {
      return;
    }
    this.hsPreviewActive = true;
    try {
      let served = 0;
      while (served !== this.hsPreviewQueued) {
        served = this.hsPreviewQueued;
        this.hsWorking = true;
        await this.updateComplete;
        // Two frames: the first paints with the spinner while JS is idle
        // (a single rAF callback still runs before that frame's paint, so
        // a synchronous compute right after it would never show the spinner).
        await this.nextPaintedFrame();
        if (served !== this.hsPreviewQueued || !this.hsOpen || this.engine === null) {
          continue;
        }
        const levels = this.currentHslLevels();
        this.engine.previewHslAdjust(
          levels.hue,
          levels.saturation,
          levels.lightness,
          levels.alpha,
          levels.model,
          levels.mode,
        );
      }
    } finally {
      this.hsPreviewActive = false;
      this.hsWorking = false;
    }
  }

  /**
   * Yield until the browser has painted a frame (a full idle frame between
   * two rAF callbacks guarantees the spinner is on screen).
   */
  private nextPaintedFrame(): Promise<void> {
    return new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });
  }

  /** Wait until no preview is computing (confirm/apply/cancel serialize behind it). */
  private async settleHslPreview(): Promise<void> {
    while (this.hsPreviewActive) {
      await new Promise<number>((resolve) => requestAnimationFrame(resolve));
    }
  }

  /** Cancel: revert to the dialog-open snapshot with no history entry. */
  private async cancelHslAdjust(): Promise<void> {
    await this.settleHslPreview();
    this.hsOpen = false;
    this.hsWorking = false;
    this.engine?.cancelHslAdjust();
  }

  /** Apply: keep the visible change, rebase the session and reset the sliders (dialog stays open). */
  private async applyHslAdjust(): Promise<void> {
    if (this.engine === null || !this.hsOpen) {
      return;
    }
    await this.settleHslPreview();
    if (this.engine === null || !this.hsOpen) {
      return;
    }
    const levels = this.currentHslLevels();
    this.engine.previewHslAdjust(
      levels.hue,
      levels.saturation,
      levels.lightness,
      levels.alpha,
      levels.model,
      levels.mode,
    );
    this.engine.rebaseHslAdjust();
    this.hsHue = 0;
    this.hsSaturation = 0;
    this.hsLightness = 0;
    this.hsAlpha = 0;
    this.statusMessage = tr("status.adjusted");
  }

  /** OK: one undoable entry from the dialog-open snapshot to the current pixels. */
  private async confirmHslAdjust(): Promise<void> {
    if (!this.hsOpen) {
      return;
    }
    await this.settleHslPreview();
    if (!this.hsOpen) {
      return;
    }
    this.hsOpen = false;
    this.hsWorking = false;
    if (this.engine === null) {
      return;
    }
    const outcome = this.engine.commitHslAdjust();
    if (outcome === "adjusted") {
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage = tr("status.adjusted");
    } else if (outcome === "empty") {
      this.statusMessage = tr("status.adjustEmpty");
      this.showToast(tr("status.adjustEmpty"));
    }
  }

  /** Invert the current cell colors (single undoable entry). */
  private adjustCellInvert(): void {
    if (this.engine === null) {
      return;
    }
    const outcome = this.engine.adjustCurrentCellPixels((r, g, b, a) => invertPixel(r, g, b, a));
    if (outcome === "adjusted") {
      this.refreshLayers();
      this.dirty = true;
      this.statusMessage = tr("status.inverted");
    } else if (outcome === "empty") {
      this.statusMessage = tr("status.adjustEmpty");
      this.showToast(tr("status.adjustEmpty"));
    }
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

  /**
   * Reprocess every saved non-texture content (texts, vectors, 3D models)
   * from the project directory: external edits made elsewhere (Inkscape,
   * Blender, a text editor) show up in the app. Textures are untouched
   * (see Reload All Textures). Missing or undecodable files are skipped.
   */
  private async reloadAllContents(): Promise<void> {
    if (this.engine === null) {
      return;
    }
    if (this.directoryHandle === null) {
      this.statusMessage = tr("status.contentsReloadUnsaved");
      this.showToast(tr("status.contentsReloadUnsaved"));
      return;
    }
    let project: GnumarusProjectMeta;
    try {
      project = await readProjectMeta(this.directoryHandle);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.statusMessage = tr("status.contentsReloadFailed", { reason });
      this.showToast(tr("status.contentsReloadFailed", { reason }));
      return;
    }
    let applied = 0;
    let skipped = 0;
    const texts: Array<{ textId: string; html: string }> = [];
    for (const text of project.animation.texts) {
      if (text.file === undefined) {
        continue;
      }
      let bytes: Uint8Array | null = null;
      try {
        bytes = await readFileBytes(this.directoryHandle, text.file);
      } catch {
        bytes = null;
      }
      if (bytes === null) {
        skipped += 1;
        continue;
      }
      try {
        texts.push({ textId: text.id, html: decodeTextFile(text.file, bytes) });
      } catch {
        skipped += 1;
      }
    }
    const svgs: Array<{ svgId: string; svg: string }> = [];
    for (const vector of project.animation.svgs) {
      if (vector.file === undefined) {
        continue;
      }
      let bytes: Uint8Array | null = null;
      try {
        bytes = await readFileBytes(this.directoryHandle, vector.file);
      } catch {
        bytes = null;
      }
      if (bytes === null) {
        skipped += 1;
        continue;
      }
      try {
        svgs.push({ svgId: vector.id, svg: decodeSvgFile(vector.file, bytes) });
      } catch {
        skipped += 1;
      }
    }
    const models: Array<{ modelId: string; ext: string; bytes: Uint8Array }> = [];
    for (const model of project.animation.models3d) {
      let bytes: Uint8Array | null = null;
      try {
        bytes = await readFileBytes(this.directoryHandle, model.file);
      } catch {
        bytes = null;
      }
      if (bytes === null) {
        skipped += 1;
        continue;
      }
      const ext = model.file.slice(model.file.lastIndexOf(".") + 1);
      models.push({ modelId: model.id, ext, bytes });
    }
    const textResult = this.engine.reloadTextDocuments(texts);
    const svgResult = this.engine.reloadSvgDocuments(svgs);
    const modelResult = this.engine.reloadModel3dBytes(models);
    applied = textResult.applied + svgResult.applied + modelResult.applied;
    skipped += textResult.skipped + svgResult.skipped + modelResult.skipped;
    if (applied > 0) {
      this.refreshLayers();
      this.dirty = true;
    }
    const summary =
      (applied === 1
        ? tr("status.contentsReloadedOne", { skipped: "" })
        : tr("status.contentsReloadedMany", { count: applied, skipped: "" })) +
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

  /** Open the user manual (locale-aware) in a new tab. */
  private openManual(): void {
    this.helpMenuOpen = false;
    const url = new URL(gnumarusManualPath(getActiveLocale()), document.baseURI).href;
    window.open(url, "_blank", "noopener");
  }

  private openSourceCode(): void {
    this.helpMenuOpen = false;
    window.open(GNUMARUS_SOURCE_URL, "_blank", "noopener");
  }

  /** True on the production Pages deploy (hides the Pages shortcut there). */
  private isGitHubPagesDeploy(): boolean {
    return isGitHubPagesDeploy(window.location.hostname, window.location.pathname);
  }

  /** Leave the local/dev build for the public GitHub Pages deploy (same tab). */
  private openGitHubPagesDeploy(): void {
    this.closeAllMenus();
    window.open(GNUMARUS_PAGES_URL, "_blank", "noopener");
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
    this.exitFlycam();
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
    this.collapseLayerSelectionToActive();
    this.directoryHandle = null;
    this.embeddedProjectName = null;
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
  /**
   * Decode one external text file from the loaded blobs (raw `.html` or
   * single-file `.zip`, sniffed by extension). Throws on missing or
   * corrupt files.
   */
  /**
   * Decode one external 3D model file from the loaded blobs. Throws on
   * missing files or invalid references (empty payloads fail at raster
   * time and render nothing, like undecodable SVGs).
   */
  private async decodeStoredModel3dFile(file: string, fileBlobs: Map<string, Blob>): Promise<Uint8Array> {
    const blob = fileBlobs.get(file);
    if (blob === undefined) {
      throw new Error(`Missing 3D model file: ${file}`);
    }
    return new Uint8Array(await blob.arrayBuffer());
  }

  /**
   * Resolve stored 3D models to engine entries: raw bytes plus extension
   * (loaders dispatch on it). Rasters decode asynchronously after load.
   */
  private async resolveStoredModels3d(
    models: GnumarusModel3dMeta[],
    fileBlobs: Map<string, Blob>,
  ): Promise<Array<{ id: string; name: string; ext: string; bytes: Uint8Array; view?: GnumarusModel3dView; lighting?: GnumarusModelLighting }>> {
    const out: Array<{ id: string; name: string; ext: string; bytes: Uint8Array; view?: GnumarusModel3dView; lighting?: GnumarusModelLighting }> = [];
    for (const model of models) {
      const ext = model.file.slice(model.file.lastIndexOf(".") + 1).toLowerCase();
      out.push({
        id: model.id,
        name: model.name,
        ext,
        bytes: await this.decodeStoredModel3dFile(model.file, fileBlobs),
        view: model.view === undefined ? undefined : { ...model.view },
        lighting: model.lighting,
      });
    }
    return out;
  }

  /**
   * Decode one external vector file from the loaded blobs (raw `.svg` or
   * single-file `.zip`, sniffed by extension). Throws on missing or
   * corrupt files.
   */
  private async decodeStoredSvgFile(file: string, fileBlobs: Map<string, Blob>): Promise<string> {
    const blob = fileBlobs.get(file);
    if (blob === undefined) {
      throw new Error(`Missing vector file: ${file}`);
    }
    return decodeSvgFile(file, new Uint8Array(await blob.arrayBuffer()));
  }

  /**
   * Resolve stored vectors to engine documents: inline sources pass
   * through, external `svgs/` files decode from the loaded blobs.
   */
  private async resolveStoredSvgs(
    vectors: GnumarusSvgMeta[],
    fileBlobs: Map<string, Blob>,
  ): Promise<Array<{ id: string; name: string; svg: string }>> {
    const out: Array<{ id: string; name: string; svg: string }> = [];
    for (const vector of vectors) {
      if (vector.document !== undefined) {
        out.push({ id: vector.id, name: vector.name, svg: vector.document.svg });
        continue;
      }
      const file = vector.file as string;
      out.push({ id: vector.id, name: vector.name, svg: await this.decodeStoredSvgFile(file, fileBlobs) });
    }
    return out;
  }

  private async decodeStoredTextFile(file: string, fileBlobs: Map<string, Blob>): Promise<string> {
    const blob = fileBlobs.get(file);
    if (blob === undefined) {
      throw new Error(`Missing text file: ${file}`);
    }
    return decodeTextFile(file, new Uint8Array(await blob.arrayBuffer()));
  }

  /**
   * Resolve stored texts to engine documents: inline documents pass
   * through, external `texts/` files decode from the loaded blobs.
   * The engine sanitizes every document on load.
   */
  private async resolveStoredTexts(
    texts: GnumarusTextMeta[],
    fileBlobs: Map<string, Blob>,
  ): Promise<Array<{ id: string; name: string; document: { html: string } }>> {
    const out: Array<{ id: string; name: string; document: { html: string } }> = [];
    for (const text of texts) {
      if (text.document !== undefined) {
        out.push({ id: text.id, name: text.name, document: { ...text.document } });
        continue;
      }
      const file = text.file as string;
      out.push({ id: text.id, name: text.name, document: { html: await this.decodeStoredTextFile(file, fileBlobs) } });
    }
    return out;
  }

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
    try {
      this.statusMessage = tr("status.opening");
      const dir = await pickProjectDirectory();
      await this.loadProjectFromDirectory(dir, dir.name, null);
    } catch (error) {
      this.statusMessage = error instanceof Error ? tr("status.openFailed", { reason: error.message }) : tr("status.openFailedPlain");
    }
  }

  /**
   * Load a project from any directory handle (a native picked folder or an
   * embedded OPFS subdirectory): the same call path for both backends.
   * Throws on unreadable or invalid projects (callers report the reason).
   */
  private async loadProjectFromDirectory(
    dir: GnumarusDirectoryHandle,
    displayName: string,
    embeddedName: string | null,
  ): Promise<void> {
    this.stopPlayback();
    this.exitFlycam();
    {
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
          blend: layer.blend,
          lockedChannels: { ...layer.lockedChannels },
          parentId: layer.parentId ?? null,
          isMask: layer.mask === true,
        })),
        textures,
        texts: await this.resolveStoredTexts(project.animation.texts, fileBlobs),
        svgs: await this.resolveStoredSvgs(project.animation.svgs, fileBlobs),
        models3d: await this.resolveStoredModels3d(project.animation.models3d, fileBlobs),
        tilemaps: project.animation.tilemaps.map((tilemap) => ({
          id: tilemap.id,
          name: tilemap.name,
          tilesetId: tilemap.tilesetId,
          tileWidth: tilemap.tileWidth,
          tileHeight: tilemap.tileHeight,
          tiles: tilemap.tiles.map((tile) => ({ ...tile })),
        })),
        contents: project.animation.contents.map((content) => ({
          id: content.id,
          name: content.name,
          textureId: content.textureId,
          textId: content.textId,
          svgId: content.svgId,
          model3dId: content.model3dId,
          tilemapId: content.tilemapId,
          flyCam: content.flyCam ?? null,
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
      this.embeddedProjectName = embeddedName;
      this.projectName = displayName;
      this.dirty = false;
      this.selectSingleFrame(this.engine?.getCurrentFrame() ?? 0);
      this.collapseLayerSelectionToActive();
      this.statusMessage = tr("status.opened", { dir: displayName, cleanup: "" });
    }
  }

  /**
   * Import an SVG vector graphic into the current cell. Only empty cells
   * (or cells holding an empty content) accept the import; anything else
   * shows an error toast so existing work is never destroyed. Unsupported
   * content (filters, path effects, foreign objects, scripts, SMIL,
   * external references) is dropped with a warning toast naming it.
   */
  private async importSvgFile(): Promise<void> {
    this.fileMenuOpen = false;
    if (this.engine === null) {
      return;
    }
    if (!isFilePickerSupported()) {
      this.statusMessage = tr("status.importNeedsFs");
      return;
    }
    this.stopPlayback();
    let layerId = this.engine.getActiveLayerId();
    const frame = this.engine.getCurrentFrame();
    if (!this.engine.isCellContentEmpty(layerId, frame)) {
      layerId = this.engine.insertLayerAboveActive();
      this.refreshLayers();
    }
    let handle;
    try {
      handle = await pickSvgFile();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      const reason = error instanceof Error ? error.message : String(error);
      this.statusMessage = tr("status.importFailed", { reason });
      this.showToast(tr("status.importFailed", { reason }));
      return;
    }
    if (handle === null) {
      this.statusMessage = tr("status.importNeedsFs");
      return;
    }
    const fileName = await this.svgPickerFileName(handle);
    const raw = new Uint8Array(await (await handle.getFile()).arrayBuffer());
    let text: string;
    try {
      text = fileName.toLowerCase().endsWith(".svgz")
        ? new TextDecoder().decode(gunzipSync(raw))
        : new TextDecoder().decode(raw);
    } catch {
      this.statusMessage = tr("status.svgArchiveInvalid");
      this.showToast(tr("status.svgArchiveInvalid"));
      return;
    }
    const parsed = new DOMParser().parseFromString(text, "image/svg+xml");
    if (
      parsed.getElementsByTagName("parsererror").length > 0 ||
      parsed.documentElement?.tagName.toLowerCase() !== "svg"
    ) {
      this.statusMessage = tr("status.svgInvalid");
      this.showToast(tr("status.svgInvalid"));
      return;
    }
    const unsupported = detectUnsupportedSvgFeatures(text);
    const svg = sanitizeSvg(text);
    const name = fileName.replace(/\.(svg|svgz)$/i, "").slice(0, 64) || "Vector";
    const created = this.engine.ensureSvgContent(layerId, frame, svg, name);
    if (created === null) {
      this.statusMessage = tr("status.svgCellOccupied");
      this.showToast(tr("status.svgCellOccupied"));
      return;
    }
    this.refreshLayers();
    this.dirty = true;
    if (unsupported.length > 0) {
      this.statusMessage = tr("status.svgImportedWithWarnings", { name, features: unsupported.join(", ") });
    } else {
      this.statusMessage = tr("status.svgImported", { name });
    }
    this.showToast(this.statusMessage);
  }

  /**
   * Import a 3D model into the current cell. Only empty cells (or cells
   * holding an empty content) accept the import; anything else shows an
   * error toast so existing work is never destroyed. The model is decoded
   * first: unreadable files or unsupported formats show an error toast and
   * import nothing. No editing tools exist in v1; the cell renders an
   * offscreen turntable-style raster of the model.
   */
  private async importModel3dFile(): Promise<void> {
    this.fileMenuOpen = false;
    if (this.engine === null) {
      return;
    }
    if (!isFilePickerSupported()) {
      this.statusMessage = tr("status.importNeedsFs");
      return;
    }
    this.stopPlayback();
    let layerId = this.engine.getActiveLayerId();
    const frame = this.engine.getCurrentFrame();
    if (!this.engine.isCellContentEmpty(layerId, frame)) {
      layerId = this.engine.insertLayerAboveActive();
      this.refreshLayers();
    }
    let handle;
    try {
      handle = await pickModel3dFile();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      const reason = error instanceof Error ? error.message : String(error);
      this.statusMessage = tr("status.importFailed", { reason });
      this.showToast(tr("status.importFailed", { reason }));
      return;
    }
    if (handle === null) {
      this.statusMessage = tr("status.importNeedsFs");
      return;
    }
    const fileName = await this.svgPickerFileName(handle);
    const ext = parseModel3dExtension(fileName);
    if (ext === null) {
      this.statusMessage = tr("status.model3dUnsupported", { name: fileName });
      this.showToast(tr("status.model3dUnsupported", { name: fileName }));
      return;
    }
    const bytes = new Uint8Array(await (await handle.getFile()).arrayBuffer());
    if (bytes.length === 0) {
      this.statusMessage = tr("status.model3dInvalid");
      this.showToast(tr("status.model3dInvalid"));
      return;
    }
    // .blend files are validated up front so version/compression problems
    // surface their specific reason instead of the generic invalid-model
    // message (the engine converts to in-memory glb on decode).
    if (ext === "blend") {
      try {
        const { parseBlendFile } = await import("../project/GnumarusBlend");
        const doc = parseBlendFile(bytes);
        if (doc.meshes.length === 0) {
          this.statusMessage = tr("status.importFailed", { reason: "No meshes found in .blend file" });
          this.showToast(tr("status.importFailed", { reason: "No meshes found in .blend file" }));
          return;
        }
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        this.statusMessage = tr("status.importFailed", { reason });
        this.showToast(tr("status.importFailed", { reason }));
        return;
      }
    }
    const name = fileName.replace(/\.[^.]+$/, "").slice(0, 64) || "Model";
    const created = await this.engine.ensureModel3dContent(layerId, frame, name, ext, bytes);
    if (created === null) {
      this.statusMessage = tr("status.model3dInvalid");
      this.showToast(tr("status.model3dInvalid"));
      return;
    }
    this.refreshLayers();
    this.dirty = true;
    this.statusMessage = tr("status.model3dImported", { name });
    this.showToast(this.statusMessage);
  }

  /**
   * Import a raster image (PNG, JPEG, WebP, GIF or BMP) as a layer. When the
   * current cell is empty (or holds an empty content) the image lands on the
   * current layer; otherwise a new layer is created above the active one and
   * the image goes there. Unlike full-project imports, no fit/crop cleanup
   * runs: the texture keeps the exact image pixels and dimensions.
   */
  private async importImageAsLayerFile(): Promise<void> {
    this.fileMenuOpen = false;
    if (this.engine === null) {
      return;
    }
    if (!isFilePickerSupported()) {
      this.statusMessage = tr("status.importNeedsFs");
      return;
    }
    this.stopPlayback();
    this.exitFlycam();
    let handle;
    try {
      handle = await pickImageFile();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      const reason = error instanceof Error ? error.message : String(error);
      this.statusMessage = tr("status.importFailed", { reason });
      this.showToast(tr("status.importFailed", { reason }));
      return;
    }
    if (handle === null) {
      this.statusMessage = tr("status.importNeedsFs");
      return;
    }
    const fileName = await this.svgPickerFileName(handle);
    const picked = await handle.getFile();
    let decoded: { width: number; height: number; buffer: Uint8ClampedArray };
    try {
      const bitmap = await createImageBitmap(new Blob([new Uint8Array(await picked.arrayBuffer())]));
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d");
      if (context === null) {
        bitmap.close();
        throw new Error("2D canvas is unavailable for image decoding.");
      }
      context.drawImage(bitmap, 0, 0);
      bitmap.close();
      if (canvas.width < 1 || canvas.height < 1) {
        throw new Error("Decoded image is empty.");
      }
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      decoded = { width: canvas.width, height: canvas.height, buffer: imageData.data };
    } catch {
      this.statusMessage = tr("status.imageInvalid");
      this.showToast(tr("status.imageInvalid"));
      return;
    }
    if (decoded.width > 16384 || decoded.height > 16384) {
      this.statusMessage = tr("status.imageTooLarge");
      this.showToast(tr("status.imageTooLarge"));
      return;
    }
    let layerId = this.engine.getActiveLayerId();
    const frame = this.engine.getCurrentFrame();
    if (!this.engine.isCellContentEmpty(layerId, frame)) {
      layerId = this.engine.insertLayerAboveActive();
      this.refreshLayers();
    }
    const name = fileName.replace(/\.[^.]+$/, "").slice(0, 64) || "Image";
    const created = this.engine.ensureImageContent(layerId, frame, decoded.width, decoded.height, decoded.buffer, name);
    if (created === null) {
      this.statusMessage = tr("status.imageInvalid");
      this.showToast(tr("status.imageInvalid"));
      return;
    }
    this.refreshLayers();
    this.dirty = true;
    const layerName = this.engine.getLayers().find((layer) => layer.id === layerId)?.name ?? layerId;
    this.statusMessage = tr("status.imageImported", { name, layer: layerName });
    this.showToast(this.statusMessage);
  }

  /**
   * Picked-file name for a handle. Real handles expose it via getFile();
   * the lookup stays defensive so test stubs keep working.
   */
  private async svgPickerFileName(handle: { getFile(): Promise<{ name?: unknown }> }): Promise<string> {
    try {
      const file = await handle.getFile();
      if (typeof file.name === "string" && file.name !== "") {
        return file.name;
      }
    } catch {
      // Fall through to the default name.
    }
    return "vector.svg";
  }

  private async importImageFile(): Promise<void> {
    this.fileMenuOpen = false;
    if (!isFilePickerSupported()) {
      this.statusMessage = tr("status.importNeedsFs");
      return;
    }
    this.stopPlayback();
    this.exitFlycam();
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
      this.collapseLayerSelectionToActive();
      this.directoryHandle = null;
    this.embeddedProjectName = null;
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
    this.collapseLayerSelectionToActive();
    this.directoryHandle = null;
    this.embeddedProjectName = null;
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
    this.collapseLayerSelectionToActive();
    this.directoryHandle = null;
    this.embeddedProjectName = null;
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
    this.collapseLayerSelectionToActive();
    this.directoryHandle = null;
    this.embeddedProjectName = null;
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

  private async saveProject(pickNewDirectory = false): Promise<void> {
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
      const dir =
        pickNewDirectory || this.directoryHandle === null
          ? await pickProjectDirectory()
          : this.directoryHandle;
      await this.writeProjectToDirectory(dir);
      this.directoryHandle = dir;
      this.embeddedProjectName = null;
      this.projectName = dir.name;
      this.dirty = false;
      this.statusMessage = tr("status.saved", { dir: dir.name });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        this.statusMessage = tr("status.ready");
        return;
      }
      this.statusMessage = error instanceof Error ? tr("status.saveFailed", { reason: error.message }) : tr("status.saveFailedPlain");
    }
  }

  /**
   * Serialize the engine project into project-relative path-to-blob entries
   * (textures, texts, vectors, models, metadata) honoring the storage
   * settings. Shared by save (writes the entries into a directory) and
   * full-project export (zips them into a `.gpp` package). Throws on failure.
   */
  private async buildProjectFileBlobs(): Promise<{ blobs: Map<string, Blob>; stems: string[] }> {
    if (this.engine === null) {
      return { blobs: new Map<string, Blob>(), stems: [] };
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
      textId: content.textId ?? null,
      svgId: content.svgId ?? null,
      model3dId: content.model3dId ?? null,
      tilemapId: content.tilemapId ?? null,
      flyCam: content.flyCam === null || content.flyCam === undefined ? null : { ...content.flyCam },
      transform: { ...content.transform },
    }));
    const textsMeta: GnumarusTextMeta[] = [];
    const svgsMeta: GnumarusSvgMeta[] = [];
    const models3dMeta: GnumarusModel3dMeta[] = [];
    const tilemapsMeta: GnumarusTilemapMeta[] = [];
    for (const text of exported.texts ?? []) {
      if (this.storageTextStorage === "html") {
        const file = textFilePath(text.id);
        textsMeta.push({ id: text.id, name: text.name, file });
        blobs.set(file, new Blob([text.document.html], { type: "text/html" }));
      } else if (this.storageTextStorage === "htmlZip") {
        const file = textArchivePath(text.id);
        textsMeta.push({ id: text.id, name: text.name, file });
        blobs.set(
          file,
          new Blob([encodeTextArchive(text.id, text.document.html) as Uint8Array<ArrayBuffer>], {
            type: "application/zip",
          }),
        );
      } else {
        textsMeta.push({ id: text.id, name: text.name, document: { ...text.document } });
      }
    }
    for (const vector of exported.svgs ?? []) {
      if (this.storageSvgStorage === "raw") {
        const file = svgFilePath(vector.id);
        svgsMeta.push({ id: vector.id, name: vector.name, file });
        blobs.set(file, new Blob([vector.svg], { type: "image/svg+xml" }));
      } else if (this.storageSvgStorage === "compressed") {
        const file = svgArchivePath(vector.id);
        svgsMeta.push({ id: vector.id, name: vector.name, file });
        blobs.set(
          file,
          new Blob([encodeSvgArchive(vector.id, vector.svg) as Uint8Array<ArrayBuffer>], {
            type: "application/zip",
          }),
        );
      } else {
        svgsMeta.push({ id: vector.id, name: vector.name, document: { svg: vector.svg } });
      }
    }
    for (const model of exported.models3d ?? []) {
      const file = model3dFilePath(model.id, model.ext);
      models3dMeta.push({
        id: model.id,
        name: model.name,
        file,
        view: model.view === undefined ? { ...GNUMARUS_MODEL3D_DEFAULT_VIEW } : { ...model.view },
        lighting: model.lighting ?? "unlit",
      });
      blobs.set(file, new Blob([model.bytes as Uint8Array<ArrayBuffer>], { type: "application/octet-stream" }));
    }
    for (const tilemap of exported.tilemaps ?? []) {
      tilemapsMeta.push({
        id: tilemap.id,
        name: tilemap.name,
        tilesetId: tilemap.tilesetId,
        tileWidth: tilemap.tileWidth,
        tileHeight: tilemap.tileHeight,
        tiles: tilemap.tiles.map((tile) => ({ ...tile })),
      });
    }
    const meta: GnumarusProjectMeta = {
      app: GNUMARUS_APP_ID,
      version: 3,
      width: size.width,
      height: size.height,
      layers: exported.layers.map((layer) => ({
        id: layer.id,
        name: layer.name,
        visible: layer.visible,
        opacity: layer.opacity,
        blend: layer.blend,
        lockedChannels: { ...layer.lockedChannels },
        ...(layer.parentId === null ? {} : { parentId: layer.parentId }),
        ...(layer.isMask ? { mask: true as const } : {}),
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
        texts: textsMeta,
        svgs: svgsMeta,
        models3d: models3dMeta,
        tilemaps: tilemapsMeta,
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
    return { blobs, stems };
  }

  /**
   * Serialize the engine project and write every file into any directory
   * handle (a native picked folder or an embedded OPFS subdirectory): the
   * same call path for both storage backends. Throws on failure.
   */
  private async writeProjectToDirectory(dir: GnumarusDirectoryHandle): Promise<void> {
    if (this.engine === null) {
      return;
    }
    {
      let oldPaths = new Set<string>();
      try {
        oldPaths = await readOldProjectFileReferences(dir);
      } catch {
        oldPaths = new Set<string>();
      }
      const { blobs, stems } = await this.buildProjectFileBlobs();
      await writeProjectFiles(dir, blobs);
      // Content directories always exist, even when empty, so users can
      // drop files in for content-manager discovery.
      await ensureProjectContentDirs(dir);
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
      await removeProjectFile(
        dir,
        this.storageProjectFile === "json" ? GNUMARUS_PROJECT_ARCHIVE_FILE : GNUMARUS_PROJECT_FILE,
      );
    }
  }

  /** Save the project into a new user-chosen directory (always prompts). */
  private async saveProjectAs(): Promise<void> {
    await this.saveProject(true);
  }

  /**
   * Upload a `.gpp` project package (a zip holding exactly one root directory
   * with the normal project layout) and unpack it into a new OPFS embedded
   * project, then open it. Only available where OPFS exists; the File menu
   * only offers it when the File System Access API is missing. The actual
   * bytes arrive through the hidden `#gppUpload` input (plain file input, so
   * no File System Access API is needed).
   */
  private async uploadEmbeddedProject(): Promise<void> {
    this.fileMenuOpen = false;
    if (!isOpfsSupported()) {
      this.statusMessage = tr("status.embeddedNoOpfs");
      return;
    }
    const input = this.shadowRoot?.getElementById("gppUpload") as HTMLInputElement | null;
    input?.click();
  }

  private async onGppUploadChanged(): Promise<void> {
    const input = this.shadowRoot?.getElementById("gppUpload") as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;
    if (input !== null) {
      input.value = "";
    }
    if (file === null) {
      return;
    }
    let bytes: Uint8Array;
    try {
      bytes = new Uint8Array(await file.arrayBuffer());
    } catch {
      return;
    }
    try {
      this.statusMessage = tr("status.uploading");
      const store = await unpackGppToEmbedded(bytes);
      await this.loadProjectFromDirectory(store.root, store.name, store.name);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.statusMessage = tr("status.uploadFailed", { reason });
      this.showToast(tr("status.uploadFailed", { reason }));
    }
  }

  /**
   * Test hook: zip base64-encoded entries (`UpSrc/project.gpa`, ...) into a
   * `.gpp`-style package, returned base64-encoded.
   */
  zipTestEntries(entries: Array<{ path: string; data: string }>): string {
    const raw: Record<string, Uint8Array> = {};
    for (const entry of entries) {
      raw[entry.path] = decodeBase64Bytes(entry.data);
    }
    return encodeBase64Bytes(zipSync(raw));
  }

  /** Open the embedded-project picker (lists every project saved in OPFS). */
  private async openEmbeddedProjectDialog(): Promise<void> {
    this.fileMenuOpen = false;
    if (!isOpfsSupported()) {
      this.statusMessage = tr("status.embeddedNoOpfs");
      return;
    }
    try {
      this.embeddedOpenList = await listEmbeddedProjects();
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.statusMessage = tr("status.openFailed", { reason });
      return;
    }
    this.embeddedOpenSelected = "";
    this.embeddedDialogError = null;
    await this.updateComplete;
    const dialog = this.shadowRoot?.getElementById("embeddedOpenDialog") as HTMLDialogElement | null;
    dialog?.showModal();
  }

  private closeEmbeddedOpenDialog(): void {
    const dialog = this.shadowRoot?.getElementById("embeddedOpenDialog") as HTMLDialogElement | null;
    dialog?.close();
    this.embeddedOpenList = null;
    this.embeddedOpenSelected = "";
    this.embeddedDialogError = null;
  }

  private confirmEmbeddedOpen(): void {
    const name = this.embeddedOpenSelected;
    if (name === "") {
      this.embeddedDialogError = tr("status.embeddedPickOne");
      return;
    }
    this.closeEmbeddedOpenDialog();
    void this.openEmbeddedByName(name);
  }

  private async openEmbeddedByName(name: string): Promise<void> {
    try {
      this.statusMessage = tr("status.opening");
      const store = await openEmbeddedProjectStore(name);
      await this.loadProjectFromDirectory(store.root, store.name, store.name);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.statusMessage = tr("status.openFailed", { reason });
      this.showToast(tr("status.openFailed", { reason }));
    }
  }

  /**
   * Save the current project as an embedded OPFS project: writes into the
   * current embedded directory when there is one, otherwise asks for a name
   * like Save As does.
   */
  private async saveEmbeddedProject(): Promise<void> {
    this.fileMenuOpen = false;
    if (this.engine === null) {
      return;
    }
    if (!isOpfsSupported()) {
      this.statusMessage = tr("status.embeddedNoOpfs");
      return;
    }
    if (this.directoryHandle !== null && this.embeddedProjectName !== null) {
      try {
        this.statusMessage = tr("status.saving");
        await this.writeProjectToDirectory(this.directoryHandle);
        this.dirty = false;
        this.statusMessage = tr("status.saved", { dir: this.embeddedProjectName });
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        this.statusMessage = tr("status.saveFailed", { reason });
        this.showToast(tr("status.saveFailed", { reason }));
      }
      return;
    }
    await this.openSaveEmbeddedAsDialog();
  }

  /** Open the Save-embedded-as dialog (asks for a new unique project name). */
  private async openSaveEmbeddedAsDialog(): Promise<void> {
    this.fileMenuOpen = false;
    if (this.engine === null) {
      return;
    }
    if (!isOpfsSupported()) {
      this.statusMessage = tr("status.embeddedNoOpfs");
      return;
    }
    this.embeddedSaveName = this.embeddedProjectName ?? (this.projectName === "Untitled" ? "" : this.projectName);
    this.embeddedDialogError = null;
    this.embeddedSaveOpen = true;
    await this.updateComplete;
    const dialog = this.shadowRoot?.getElementById("embeddedSaveDialog") as HTMLDialogElement | null;
    dialog?.showModal();
    const input = this.shadowRoot?.getElementById("embeddedSaveName") as HTMLInputElement | null;
    input?.focus();
    input?.select();
  }

  private closeSaveEmbeddedAsDialog(): void {
    const dialog = this.shadowRoot?.getElementById("embeddedSaveDialog") as HTMLDialogElement | null;
    dialog?.close();
    this.embeddedSaveOpen = false;
    this.embeddedDialogError = null;
  }

  private async confirmSaveEmbeddedAs(): Promise<void> {
    if (this.engine === null) {
      this.closeSaveEmbeddedAsDialog();
      return;
    }
    const input = this.shadowRoot?.getElementById("embeddedSaveName") as HTMLInputElement | null;
    const clean = sanitizeEmbeddedProjectName(input?.value ?? "");
    if (clean === null) {
      this.embeddedDialogError = tr("status.embeddedInvalidName");
      return;
    }
    let store;
    try {
      store = await createEmbeddedProjectStore(clean);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.embeddedDialogError = reason.includes("already exists")
        ? tr("status.embeddedExists", { name: clean })
        : tr("status.saveFailed", { reason });
      return;
    }
    try {
      this.statusMessage = tr("status.saving");
      await this.writeProjectToDirectory(store.root);
      this.closeSaveEmbeddedAsDialog();
      this.directoryHandle = store.root;
      this.embeddedProjectName = store.name;
      this.projectName = store.name;
      this.dirty = false;
      this.statusMessage = tr("status.saved", { dir: store.name });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.statusMessage = tr("status.saveFailed", { reason });
      this.showToast(tr("status.saveFailed", { reason }));
      this.closeSaveEmbeddedAsDialog();
    }
  }

  private renderEmbeddedOpenDialog(): ReturnType<typeof html> {
    const projects = this.embeddedOpenList ?? [];
    return html`
      <dialog id="embeddedOpenDialog" @close=${(): void => this.closeEmbeddedOpenDialog()}>
        <h3>${tr("dialog.openEmbedded")}</h3>
        ${projects.length === 0
          ? html`<p>${tr("status.embeddedEmpty")}</p>`
          : html`
              <div class="embedded-list" role="radiogroup" aria-label=${tr("dialog.openEmbedded")}>
                ${projects.map(
                  (name) => html`
                    <label>
                      <input
                        type="radio"
                        name="embeddedProject"
                        .value=${name}
                        .checked=${this.embeddedOpenSelected === name}
                        @change=${(): void => {
                          this.embeddedOpenSelected = name;
                          this.embeddedDialogError = null;
                        }}
                      />
                      ${name}
                    </label>
                  `,
                )}
              </div>
            `}
        ${this.embeddedDialogError !== null
          ? html`<p class="dialog-error" role="alert">${this.embeddedDialogError}</p>`
          : html``}
        <div class="dialog-actions">
          <button @click=${(): void => this.closeEmbeddedOpenDialog()}>${tr("btn.cancel")}</button>
          <button data-testid="embedded-open-confirm" @click=${(): void => this.confirmEmbeddedOpen()}>
            ${tr("btn.open")}
          </button>
        </div>
      </dialog>
    `;
  }

  private renderSaveEmbeddedAsDialog(): ReturnType<typeof html> {
    return html`
      <dialog id="embeddedSaveDialog" @close=${(): void => this.closeSaveEmbeddedAsDialog()}>
        <h3>${tr("dialog.saveEmbeddedAs")}</h3>
        <label
          >${tr("dialog.projectName")}
          <input type="text" id="embeddedSaveName" maxlength="64" .value=${this.embeddedSaveName} />
        </label>
        ${this.embeddedDialogError !== null
          ? html`<p class="dialog-error" role="alert">${this.embeddedDialogError}</p>`
          : html``}
        <div class="dialog-actions">
          <button @click=${(): void => this.closeSaveEmbeddedAsDialog()}>${tr("btn.cancel")}</button>
          <button data-testid="embedded-save-confirm" @click=${(): void => void this.confirmSaveEmbeddedAs()}>
            ${tr("btn.save")}
          </button>
        </div>
      </dialog>
    `;
  }
}

customElements.define("gnumarus-shell", GnumarusShell);
