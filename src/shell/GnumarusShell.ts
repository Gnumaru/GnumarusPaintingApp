import { LitElement, css, html } from "lit";
import {
  GnumarusCanvasEngine,
  GnumarusWebGlError,
  type GnumarusCanvasTool,
} from "../canvas/GnumarusCanvasEngine";
import {
  isFileSystemAccessSupported,
  pickProjectDirectory,
  readProjectFiles,
  writeProjectFiles,
  type GnumarusDirectoryHandle,
} from "../project/GnumarusFileSystem";
import { createDefaultProject } from "../project/GnumarusProjectFormat";
import {
  CHECKER_SETTINGS_STORAGE_KEY,
  DEFAULT_CHECKER_SETTINGS,
  clampCheckerSize,
  parseCheckerSettings,
  serializeCheckerSettings,
  type GnumarusCheckerMode,
  type GnumarusCheckerSettings,
} from "../settings/GnumarusCheckerSettings";
import { decodePngToBuffer, encodeBufferToPngBlob } from "../project/GnumarusPngCodec";

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
    .toolbar input[type="color"] {
      width: 36px;
      height: 28px;
      border: none;
      background: transparent;
      padding: 0;
      cursor: pointer;
    }
    .canvas-host {
      flex: 1 1 auto;
      position: relative;
      min-width: 0;
      min-height: 0;
      background: #333333;
    }
    .canvas-host canvas {
      position: absolute;
      inset: 0;
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
    dialog input[type="color"] {
      width: 48px;
      height: 28px;
      padding: 0;
      cursor: pointer;
    }
    dialog select {
      background: #1e1e1e;
      color: #e6e6e6;
      border: 1px solid #555;
      border-radius: 4px;
      padding: 4px 6px;
      max-width: 260px;
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
    projectName: { type: String },
    dirty: { type: Boolean },
    statusMessage: { type: String },
    fileMenuOpen: { type: Boolean },
    editMenuOpen: { type: Boolean },
    webglError: { type: String },
    fsSupported: { type: Boolean },
    newWidth: { type: Number },
    newHeight: { type: Number },
    checkerMode: { type: String },
    checkerSizeX: { type: Number },
    checkerSizeY: { type: Number },
    canUndo: { type: Boolean },
    canRedo: { type: Boolean },
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
  declare checkerMode: GnumarusCheckerMode;
  declare checkerSizeX: number;
  declare checkerSizeY: number;
  declare canUndo: boolean;
  declare canRedo: boolean;
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
    this.checkerMode = DEFAULT_CHECKER_SETTINGS.mode;
    this.checkerSizeX = DEFAULT_CHECKER_SETTINGS.sizeX;
    this.checkerSizeY = DEFAULT_CHECKER_SETTINGS.sizeY;
    this.canUndo = false;
    this.canRedo = false;
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
          <input
            type="color"
            .value=${this.colorValue}
            title="Pencil color"
            @input=${(event: Event): void => {
              const target = event.target as HTMLInputElement | null;
              if (target !== null) {
                this.colorValue = target.value;
                this.engine?.setColor(target.value);
              }
            }}
          />
        </div>
        <div class="canvas-host" id="canvasHost"></div>
      </div>
      <div class="statusbar">
        <span>${this.tool}</span>
        <span>${this.colorValue}</span>
        <span>${this.cursorText}</span>
        <span>${this.canvasText}</span>
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
      <dialog id="settingsDialog">
        <h3>Settings</h3>
        <label
          >Checkerboard mode
          <select id="checkerMode" .value=${this.checkerMode} @change=${(): void => this.applyCheckerFromDialog()}>
            <option value="image">Image-space (moves and zooms with the canvas)</option>
            <option value="screen">Screen-space (fixed on screen)</option>
          </select>
        </label>
        <label
          >Checker width <input type="number" id="checkerSizeX" min="1" max="128" .value=${String(this.checkerSizeX)} @input=${(): void =>
            this.applyCheckerFromDialog()} />
        </label>
        <label
          >Checker height <input type="number" id="checkerSizeY" min="1" max="128" .value=${String(this.checkerSizeY)} @input=${(): void =>
            this.applyCheckerFromDialog()} />
        </label>
        <label
          >Checker color A <input type="color" id="checkerColorA" .value=${this.checkerColorA} @input=${(): void =>
            this.applyCheckerFromDialog()} />
        </label>
        <label
          >Checker color B <input type="color" id="checkerColorB" .value=${this.checkerColorB} @input=${(): void =>
            this.applyCheckerFromDialog()} />
        </label>
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
        checker: storedChecker,
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
        },
      });
      this.engine.setColor(this.colorValue);
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

  private currentDialogChecker(): GnumarusCheckerSettings {
    const modeInput = this.shadowRoot?.getElementById("checkerMode") as HTMLSelectElement | null;
    const sizeXInput = this.shadowRoot?.getElementById("checkerSizeX") as HTMLInputElement | null;
    const sizeYInput = this.shadowRoot?.getElementById("checkerSizeY") as HTMLInputElement | null;
    const colorAInput = this.shadowRoot?.getElementById("checkerColorA") as HTMLInputElement | null;
    const colorBInput = this.shadowRoot?.getElementById("checkerColorB") as HTMLInputElement | null;
    const mode: GnumarusCheckerMode = modeInput?.value === "screen" ? "screen" : "image";
    return {
      mode,
      sizeX: clampCheckerSize(Number(sizeXInput?.value ?? "16") || 16),
      sizeY: clampCheckerSize(Number(sizeYInput?.value ?? "16") || 16),
      colorA: colorAInput?.value ?? this.checkerColorA,
      colorB: colorBInput?.value ?? this.checkerColorB,
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
    try {
      window.localStorage.setItem(CHECKER_SETTINGS_STORAGE_KEY, serializeCheckerSettings(settings));
    } catch {
      // Storage failures must not break the settings flow.
    }
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
    try {
      window.localStorage.setItem(CHECKER_SETTINGS_STORAGE_KEY, serializeCheckerSettings(settings));
    } catch {
      // Storage failures must not break the settings flow.
    }
    this.statusMessage = "Checkerboard settings reset to defaults";
  }

  private async createNew(): Promise<void> {
    const widthInput = this.shadowRoot?.getElementById("newWidth") as HTMLInputElement | null;
    const heightInput = this.shadowRoot?.getElementById("newHeight") as HTMLInputElement | null;
    const width = Math.min(1024, Math.max(1, Number(widthInput?.value ?? "64") || 64));
    const height = Math.min(1024, Math.max(1, Number(heightInput?.value ?? "64") || 64));
    this.newWidth = Math.floor(width);
    this.newHeight = Math.floor(height);
    this.engine?.newProject(this.newWidth, this.newHeight);
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
      const firstLayer = project.layers[0];
      const firstCell = firstLayer?.cells[0];
      if (firstLayer === undefined || firstCell === undefined) {
        throw new Error("Project has no cells.");
      }
      const blob = cellBlobs.get(firstCell.file);
      if (blob === undefined) {
        throw new Error(`Missing cell file: ${firstCell.file}`);
      }
      const decoded = await decodePngToBuffer(blob);
      this.engine?.loadBuffer(decoded.width, decoded.height, decoded.buffer);
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
      const meta = createDefaultProject(size.width, size.height);
      const blob = await encodeBufferToPngBlob(this.engine.pixelData, size.width, size.height);
      const cells = new Map<string, Blob>();
      const cellFile = meta.layers[0]?.cells[0]?.file ?? "cells/layer0_frame0.png";
      cells.set(cellFile, blob);
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
