import { LitElement, css, html } from "lit";
import {
  GnumarusCanvasEngine,
  GnumarusWebGlError,
  type GnumarusCanvasTool,
  type GnumarusLayerInfo,
} from "../canvas/GnumarusCanvasEngine";
import {
  isFileSystemAccessSupported,
  pickProjectDirectory,
  readProjectFiles,
  writeProjectFiles,
  type GnumarusDirectoryHandle,
} from "../project/GnumarusFileSystem";
import {
  GNUMARUS_APP_ID,
  cellFilePath,
  type GnumarusLayerMeta,
  type GnumarusProjectMeta,
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
  GNUMARUS_GRID_MAX_ZOOM,
  GNUMARUS_GRID_MIN_ZOOM,
  clampGridMinZoom,
  parseGridSettings,
  serializeGridSettings,
} from "../settings/GnumarusGridSettings";
import { compositeFinalImage } from "../preview/GnumarusFinalRender";
import { decodePngToBuffer, encodeBufferToPngBlob } from "../project/GnumarusPngCodec";
import { parseHexColor } from "../canvas/GnumarusPixelBuffer";
import { parseHexToRgbaBytes, rgbaBytesToHex } from "../color/GnumarusColorModels";
import "../color/GnumarusColorPicker";

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
    .context-blocker {
      position: fixed;
      inset: 0;
      z-index: 40;
    }
    .context-menu {
      position: fixed;
      z-index: 41;
      min-width: 160px;
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
      align-items: center;
      justify-content: center;
    }
    .preview-body canvas {
      image-rendering: pixelated;
      background: transparent;
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
    projectName: { type: String },
    dirty: { type: Boolean },
    statusMessage: { type: String },
    fileMenuOpen: { type: Boolean },
    editMenuOpen: { type: Boolean },
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
    checkerColorA: { type: String },
    checkerColorB: { type: String },
  };

  declare tool: GnumarusCanvasTool;
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
  declare renamingId: string | null;
  declare contextMenuLayerId: string | null;
  declare contextMenuX: number;
  declare contextMenuY: number;
  declare checkerColorA: string;
  declare checkerColorB: string;

  private engine: GnumarusCanvasEngine | null = null;
  private directoryHandle: GnumarusDirectoryHandle | null = null;

  constructor() {
    super();
    this.tool = "pencil";
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
    this.renamingId = null;
    this.contextMenuLayerId = null;
    this.contextMenuX = 0;
    this.contextMenuY = 0;
    this.checkerColorA = DEFAULT_CHECKER_SETTINGS.colorA;
    this.checkerColorB = DEFAULT_CHECKER_SETTINGS.colorB;
  }

  render() {
    return html`
      <div class="menubar">
        <div class="menu">
          <button
            class=${this.fileMenuOpen ? "active" : ""}
            @click=${(): void => {
              this.fileMenuOpen = !this.fileMenuOpen;
              this.editMenuOpen = false;
            }}
          >
            File
          </button>
          ${this.fileMenuOpen
            ? html`
                <div class="dropdown">
                  <button @click=${(): void => void this.openNewDialog()}>New</button>
                  <button @click=${(): void => void this.openProject()}>Open</button>
                  <button @click=${(): void => void this.saveProject()}>Save</button>
                </div>
              `
            : html``}
        </div>
        <div class="menu">
          <button
            class=${this.editMenuOpen ? "active" : ""}
            @click=${(): void => {
              this.editMenuOpen = !this.editMenuOpen;
              this.fileMenuOpen = false;
            }}
          >
            Edit
          </button>
          ${this.editMenuOpen
            ? html`
                <div class="dropdown">
                  <button ?disabled=${!this.canUndo} @click=${(): void => this.doUndo()}>Undo</button>
                  <button ?disabled=${!this.canRedo} @click=${(): void => this.doRedo()}>Redo</button>
                  <button @click=${(): void => this.openSettingsDialog()}>Settings</button>
                  <button @click=${(): void => this.resetCanvasTransform()}>Reset Canvas Transform</button>
                </div>
              `
            : html``}
        </div>
        <span class="app-title">Gnumaru's Painting and Animation App${this.dirty ? " — *modified*" : ""}</span>
      </div>
      <div class="body">
        <div class="toolbar">
          <button
            class=${this.tool === "pencil" ? "active" : ""}
            title="Pencil (pixel-art, 1px solid)"
            aria-label="Pencil"
            @click=${(): void => {
              this.tool = "pencil";
              this.engine?.setTool("pencil");
            }}
          >
            ✎
          </button>
          <button
            class=${this.tool === "loupe" ? "active" : ""}
            title="Loupe (left-drag zoom, right-drag rotate, middle-click flip)"
            aria-label="Loupe"
            @click=${(): void => {
              this.tool = "loupe";
              this.engine?.setTool("loupe");
            }}
          >
            ⌕
          </button>
          <button
            class=${this.tool === "transform" ? "active" : ""}
            title="Transform (left-drag move, right-drag rotate, middle-click flip layer)"
            aria-label="Transform"
            @click=${(): void => {
              this.tool = "transform";
              this.engine?.setTool("transform");
            }}
          >
            ⤢
          </button>
          <gnumarus-color-picker
            id="pencilColor"
            .value=${this.colorValue}
            model="hsv"
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
            ⊞
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
                  >
                    <canvas id="previewCanvas"></canvas>
                  </div>
                </div>
              `
            : html``}
        </div>
        <aside class="layers-panel" aria-label="Layers">
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
              </div>
            `
          : html``}
      </div>
      <div class="statusbar">
        <span>${this.tool}</span>
        <span>${this.colorValue}</span>
        <span>${this.cursorText}</span>
        <span>${this.canvasText}</span>
        <span>${this.layerText}</span>
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
                  model="hsv"
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
                  model="hsv"
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
                  model="hsv"
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
        <div class="dialog-actions">
          <button @click=${(): void => this.resetCheckerDefaults()}>Reset defaults</button>
          <button @click=${(): void => this.closeSettingsDialog()}>Close</button>
        </div>
      </dialog>
    `;
  }

  firstUpdated(): void {
    this.fsSupported = isFileSystemAccessSupported();
    const storedChecker = this.loadCheckerSettings();
    this.checkerMode = storedChecker.mode;
    this.checkerSizeX = storedChecker.sizeX;
    this.checkerSizeY = storedChecker.sizeY;
    this.checkerColorA = storedChecker.colorA;
    this.checkerColorB = storedChecker.colorB;
    const storedGrid = this.loadGridSettings();
    this.gridMinZoom = storedGrid.minZoom;
    const storedBackground = this.loadBackgroundSettings();
    this.backgroundMode = storedBackground.mode;
    this.backgroundColor = storedBackground.color;
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
      });
      this.engine.setColor(this.colorValue);
      this.refreshLayers();
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

  private loadGridSettings(): { minZoom: number } {
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
      window.localStorage.setItem(GRID_SETTINGS_STORAGE_KEY, serializeGridSettings({ minZoom: this.gridMinZoom }));
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
    this.statusMessage =
      settings.mode === "solid" ? `Canvas background: solid ${settings.color}` : "Canvas background: checkerboard";
  }

  private resetBackgroundModeToDefault(): void {
    this.backgroundMode = DEFAULT_BACKGROUND_SETTINGS.mode;
    this.engine?.setBackgroundMode(this.backgroundMode);
    this.persistBackground();
    this.statusMessage = "Background mode reset to default";
  }

  private resetBackgroundColorToDefault(): void {
    this.backgroundColor = DEFAULT_BACKGROUND_SETTINGS.color;
    this.engine?.setBackgroundColor(this.backgroundColor);
    this.persistBackground();
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
    this.statusMessage = `Canvas background: ${this.backgroundMode === "solid" ? `solid ${six}` : "checkerboard"}`;
  }

  private resetGridMinZoomToDefault(): void {
    this.gridMinZoom = DEFAULT_GRID_SETTINGS.minZoom;
    this.engine?.setGridMinZoom(this.gridMinZoom);
    this.persistGrid();
    this.statusMessage = "Pixel grid minimum zoom reset to default";
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
    this.persistGrid();
    const backgroundSettings = { ...DEFAULT_BACKGROUND_SETTINGS };
    this.backgroundMode = backgroundSettings.mode;
    this.backgroundColor = backgroundSettings.color;
    this.engine?.applyBackgroundSettings(backgroundSettings);
    this.persistBackground();
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
    const flat = compositeFinalImage(size.width, size.height, inputs);
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
      this.layerText = "-";
      return;
    }
    this.layers = this.engine.getLayers();
    this.activeLayerId = this.engine.getActiveLayerId();
    const index = this.layers.findIndex((layer) => layer.id === this.activeLayerId);
    const current = index < 0 ? undefined : this.layers[index];
    this.layerText =
      current === undefined ? "-" : `${current.name} (${this.layers.length - index}/${this.layers.length})`;
    if (this.previewOpen) {
      void this.refreshPreview();
    }
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

  private onRenameStart(id: string): void {
    this.renamingId = id;
  }

  private onRenameCancel(): void {
    this.renamingId = null;
  }

  private openLayerMenu(id: string, clientX: number, clientY: number): void {
    this.contextMenuLayerId = id;
    this.contextMenuX = Math.min(clientX, window.innerWidth - 180);
    this.contextMenuY = Math.min(clientY, window.innerHeight - 60);
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
    try {
      this.statusMessage = "Opening directory...";
      const dir = await pickProjectDirectory();
      const { project, cellBlobs } = await readProjectFiles(dir);
      const inputs: Array<{
        id: string;
        name: string;
        visible: boolean;
        opacity: number;
        width: number;
        height: number;
        buffer: Uint8ClampedArray;
        transform: { x: number; y: number; rotation: number; flipX: boolean; flipY: boolean };
        lockedChannels: { r: boolean; g: boolean; b: boolean; a: boolean };
      }> = [];
      for (const layer of project.layers) {
        const cell = layer.cells[0];
        if (cell === undefined) {
          throw new Error(`Layer ${layer.id} has no cells.`);
        }
        const blob = cellBlobs.get(cell.file);
        if (blob === undefined) {
          throw new Error(`Missing cell file: ${cell.file}`);
        }
        const decoded = await decodePngToBuffer(blob);
        if (decoded.width !== layer.width || decoded.height !== layer.height) {
          throw new Error(`Cell size mismatch: ${cell.file}`);
        }
        inputs.push({
          id: layer.id,
          name: layer.name,
          visible: layer.visible,
          opacity: layer.opacity,
          width: decoded.width,
          height: decoded.height,
          buffer: decoded.buffer,
          transform: layer.transform,
          lockedChannels: { ...layer.lockedChannels },
        });
      }
      this.engine?.loadProject(project.width, project.height, inputs);
      this.refreshLayers();
      this.directoryHandle = dir;
      this.projectName = dir.name;
      this.dirty = false;
      this.statusMessage = `Opened ${dir.name}`;
    } catch (error) {
      this.statusMessage = error instanceof Error ? `Open failed: ${error.message}` : "Open failed";
    }
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
      const infos = this.engine.getLayers();
      const pixels = this.engine.exportLayers();
      const layersMeta: GnumarusLayerMeta[] = [];
      const cells = new Map<string, Blob>();
      for (const info of infos) {
        const rendered = pixels.find((entry) => entry.id === info.id);
        if (rendered === undefined) {
          throw new Error(`Missing pixels for layer ${info.id}`);
        }
        const file = cellFilePath(info.id, 0);
        layersMeta.push({
          id: info.id,
          name: info.name,
          visible: info.visible,
          opacity: info.opacity,
          width: info.width,
          height: info.height,
          transform: { ...info.transform },
          lockedChannels: { ...info.lockedChannels },
          cells: [{ frame: 0, file }],
        });
        cells.set(file, await encodeBufferToPngBlob(rendered.buffer, rendered.width, rendered.height));
      }
      const meta: GnumarusProjectMeta = {
        app: GNUMARUS_APP_ID,
        version: 1,
        width: size.width,
        height: size.height,
        layers: layersMeta,
      };
      await writeProjectFiles(dir, meta, cells);
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
