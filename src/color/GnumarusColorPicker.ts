import { LitElement, css, html } from "lit";
import {
  getColorModelDef,
  isColorModelId,
  modelAxesToRgbBytes,
  modelAxisGradientCss,
  parseAxisInput,
  parseHexToRgbaBytes,
  rgbBytesToModelAxes,
  rgbaBytesToHex,
  GNUMARUS_COLOR_MODELS,
  type GnumarusColorModelDef,
  type GnumarusColorModelId,
  type GnumarusRgbaBytes,
} from "./GnumarusColorModels";

/**
 * Custom color picker: model selector, one draggable gradient bar plus an
 * editable numeric input per axis, and a hex field. No native
 * `<input type="color">` is used anywhere. Emits `gnumarus-color-change`
 * with `{ value: hex }` on every user edit (live).
 */
export class GnumarusColorPicker extends LitElement {
  static styles = css`
    :host {
      display: inline-block;
      font-size: 13px;
      color: #e6e6e6;
    }
    .swatch {
      width: 36px;
      height: 28px;
      border: 1px solid #555;
      border-radius: 4px;
      padding: 0;
      cursor: pointer;
      background:
        linear-gradient(45deg, #808080 25%, transparent 25%, transparent 75%, #808080 75%),
        linear-gradient(45deg, #808080 25%, transparent 25%, transparent 75%, #808080 75%),
        #ffffff;
      background-size: 8px 8px;
      background-position:
        0 0,
        4px 4px;
      position: relative;
    }
    .swatch-inner {
      position: absolute;
      inset: 0;
      border-radius: 3px;
    }
    .popup {
      position: fixed;
      z-index: 100;
      min-width: 300px;
      max-width: min(360px, 92vw);
      max-height: 80vh;
      overflow-y: auto;
      background: #2b2b2b;
      border: 1px solid #111;
      border-radius: 6px;
      padding: 12px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    }
    .model-row {
      display: flex;
      gap: 8px;
      align-items: center;
      margin-bottom: 8px;
    }
    .model-row select {
      flex: 1 1 auto;
      background: #1e1e1e;
      color: #e6e6e6;
      border: 1px solid #555;
      border-radius: 4px;
      padding: 4px 6px;
    }
    .axis-row {
      display: flex;
      gap: 8px;
      align-items: center;
      margin: 6px 0;
    }
    .axis-label {
      flex: 0 0 86px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .axis-bar {
      flex: 1 1 auto;
      height: 18px;
      border: 1px solid #555;
      border-radius: 4px;
      position: relative;
      cursor: ew-resize;
      touch-action: none;
      min-width: 80px;
    }
    .axis-bar:focus-visible {
      outline: 2px solid #0e639c;
      outline-offset: 1px;
    }
    .axis-thumb {
      position: absolute;
      top: -3px;
      bottom: -3px;
      width: 6px;
      margin-left: -3px;
      background: #ffffff;
      border: 1px solid #000000;
      border-radius: 2px;
      pointer-events: none;
    }
    .axis-input {
      flex: 0 0 64px;
      width: 64px;
      background: #1e1e1e;
      color: #e6e6e6;
      border: 1px solid #555;
      border-radius: 4px;
      padding: 4px 6px;
    }
    .axis-unit {
      flex: 0 0 20px;
      color: #9a9a9a;
      font-size: 11px;
    }
    .hex-row {
      display: flex;
      gap: 8px;
      align-items: center;
      margin-top: 10px;
    }
    .hex-row input {
      flex: 1 1 auto;
      min-width: 0;
      background: #1e1e1e;
      color: #e6e6e6;
      border: 1px solid #555;
      border-radius: 4px;
      padding: 4px 6px;
      font-family: monospace;
    }
  `;

  static properties = {
    value: { type: String },
    model: { type: String },
    open: { type: Boolean },
  };

  declare value: string;
  declare model: GnumarusColorModelId;
  declare open: boolean;

  private rgba: GnumarusRgbaBytes = { r: 0, g: 0, b: 0, a: 255 };
  private modelValues: number[] = [0, 0, 0];
  private popupPos: { left: number; top: number } | null = null;

  constructor() {
    super();
    this.value = "#000000";
    this.model = "hsv";
    this.open = false;
    this.syncFromValue(this.value, "hsv");
  }

  private get def(): GnumarusColorModelDef {
    return getColorModelDef(this.model);
  }

  private syncFromValue(hex: string, model: GnumarusColorModelId): void {
    const parsed = parseHexToRgbaBytes(hex);
    if (parsed === null) {
      return;
    }
    this.rgba = parsed;
    this.modelValues = rgbBytesToModelAxes(parsed, model);
  }

  protected willUpdate(changed: Map<string, unknown>): void {
    if (changed.has("model")) {
      if (!isColorModelId(this.model)) {
        this.model = "hsv";
      }
    }
    if (changed.has("value") || changed.has("model")) {
      const parsed = parseHexToRgbaBytes(this.value);
      if (parsed !== null) {
        const same =
          parsed.r === this.rgba.r && parsed.g === this.rgba.g && parsed.b === this.rgba.b && parsed.a === this.rgba.a;
        if (!same) {
          this.syncFromValue(this.value, this.model);
        } else if (changed.has("model")) {
          this.modelValues = rgbBytesToModelAxes(this.rgba, this.model);
        }
      }
    }
  }

  private emitChange(): void {
    this.value = rgbaBytesToHex(this.rgba);
    this.dispatchEvent(
      new CustomEvent("gnumarus-color-change", {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private applyModelValues(values: number[]): void {
    const rgb = modelAxesToRgbBytes(this.model, values);
    if (this.model === "rgb") {
      const alpha = values[3];
      this.rgba = {
        r: rgb.r,
        g: rgb.g,
        b: rgb.b,
        a: typeof alpha === "number" && Number.isFinite(alpha) ? Math.max(0, Math.min(255, Math.round(alpha))) : this.rgba.a,
      };
    } else {
      this.rgba = { r: rgb.r, g: rgb.g, b: rgb.b, a: this.rgba.a };
    }
    this.modelValues = [...values];
    this.emitChange();
  }

  private onModelSelect(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    const next = target?.value ?? "hsv";
    if (!isColorModelId(next) || next === this.model) {
      return;
    }
    this.model = next;
    this.modelValues = rgbBytesToModelAxes(this.rgba, next);
  }

  private onAxisInput(axisIndex: number, event: Event): void {
    const def = this.def;
    const axis = def.axes[axisIndex];
    if (axis === undefined) {
      return;
    }
    const target = event.target as HTMLInputElement | null;
    if (target === null) {
      return;
    }
    // Live feedback while typing: apply valid values, ignore the rest.
    const parsed = parseAxisInput(target.value, axis);
    if (parsed === null) {
      return;
    }
    const next = [...this.modelValues];
    next[axisIndex] = parsed;
    this.applyModelValues(next);
  }

  private onAxisChange(axisIndex: number, event: Event): void {
    const def = this.def;
    const axis = def.axes[axisIndex];
    if (axis === undefined) {
      return;
    }
    const target = event.target as HTMLInputElement | null;
    if (target === null) {
      return;
    }
    // Commit on blur/Enter: snap invalid text back to the current value.
    const parsed = parseAxisInput(target.value, axis);
    if (parsed === null) {
      target.value = (this.modelValues[axisIndex] ?? axis.min).toFixed(axis.decimals);
      return;
    }
    const next = [...this.modelValues];
    next[axisIndex] = parsed;
    this.applyModelValues(next);
  }

  private valueFromPointer(axisIndex: number, clientX: number, bar: HTMLElement): number | null {
    const rect = bar.getBoundingClientRect();
    if (rect.width <= 0) {
      return null;
    }
    const t = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const axis = this.def.axes[axisIndex];
    if (axis === undefined) {
      return null;
    }
    const raw = axis.min + t * (axis.max - axis.min);
    if (axis.unit === "degrees") {
      return raw >= 360 ? 359.9 : raw;
    }
    if (axis.unit === "byte") {
      return Math.round(raw);
    }
    return Math.round(raw * 10) / 10;
  }

  private onBarPointerDown(axisIndex: number, event: PointerEvent): void {
    const bar = event.currentTarget as HTMLElement | null;
    if (bar === null) {
      return;
    }
    event.preventDefault();
    bar.setPointerCapture(event.pointerId);
    const start = (clientX: number): void => {
      const nextValue = this.valueFromPointer(axisIndex, clientX, bar);
      if (nextValue === null) {
        return;
      }
      const next = [...this.modelValues];
      next[axisIndex] = nextValue;
      this.applyModelValues(next);
    };
    start(event.clientX);
    const move = (moveEvent: PointerEvent): void => {
      start(moveEvent.clientX);
    };
    const up = (): void => {
      bar.removeEventListener("pointermove", move);
      bar.removeEventListener("pointerup", up);
      bar.removeEventListener("pointercancel", up);
    };
    bar.addEventListener("pointermove", move);
    bar.addEventListener("pointerup", up);
    bar.addEventListener("pointercancel", up);
  }

  private onBarKeyDown(axisIndex: number, event: KeyboardEvent): void {
    const axis = this.def.axes[axisIndex];
    if (axis === undefined) {
      return;
    }
    const step = axis.unit === "byte" ? 1 : axis.unit === "degrees" ? 1 : axis.decimals > 0 ? 0.1 : 1;
    const big = event.shiftKey ? step * 10 : step;
    let delta = 0;
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      delta = -big;
    } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      delta = big;
    } else if (event.key === "Home") {
      const next = [...this.modelValues];
      next[axisIndex] = axis.min;
      this.applyModelValues(next);
      event.preventDefault();
      return;
    } else if (event.key === "End") {
      const next = [...this.modelValues];
      next[axisIndex] = axis.unit === "degrees" ? 359.9 : axis.max;
      this.applyModelValues(next);
      event.preventDefault();
      return;
    } else {
      return;
    }
    event.preventDefault();
    const current = this.modelValues[axisIndex] ?? axis.min;
    let nextValue = current + delta;
    if (axis.unit === "degrees") {
      nextValue = ((nextValue % 360) + 360) % 360;
      if (nextValue >= 360) {
        nextValue = 359.9;
      }
    } else if (axis.unit === "byte") {
      nextValue = Math.round(Math.min(axis.max, Math.max(axis.min, nextValue)));
    } else {
      nextValue = Math.round(Math.min(axis.max, Math.max(axis.min, nextValue)) * 10) / 10;
    }
    const next = [...this.modelValues];
    next[axisIndex] = nextValue;
    this.applyModelValues(next);
  }

  private onHexInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    if (target === null) {
      return;
    }
    const parsed = parseHexToRgbaBytes(target.value);
    if (parsed === null) {
      return;
    }
    this.rgba = parsed;
    this.modelValues = rgbBytesToModelAxes(parsed, this.model);
    this.emitChange();
  }

  private onHexChange(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    if (target === null) {
      return;
    }
    if (parseHexToRgbaBytes(target.value) === null) {
      target.value = rgbaBytesToHex(this.rgba);
    }
  }

  private toggleOpen(): void {
    this.open = !this.open;
    if (this.open) {
      const swatch = this.shadowRoot?.querySelector(".swatch") as HTMLElement | null;
      if (swatch !== null) {
        const rect = swatch.getBoundingClientRect();
        this.popupPos = {
          left: Math.min(rect.right + 8, Math.max(8, window.innerWidth - 380)),
          top: Math.min(rect.top, Math.max(8, window.innerHeight - 420)),
        };
      }
      window.addEventListener("pointerdown", this.onDocumentPointerDown);
      window.addEventListener("keydown", this.onDocumentKeyDown);
    } else {
      this.closePopup();
    }
  }

  private closePopup(): void {
    this.open = false;
    this.popupPos = null;
    window.removeEventListener("pointerdown", this.onDocumentPointerDown);
    window.removeEventListener("keydown", this.onDocumentKeyDown);
  }

  private readonly onDocumentPointerDown = (event: PointerEvent): void => {
    const path = event.composedPath();
    if (!path.includes(this)) {
      this.closePopup();
    }
  };

  private readonly onDocumentKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") {
      this.closePopup();
    }
  };

  disconnectedCallback(): void {
    window.removeEventListener("pointerdown", this.onDocumentPointerDown);
    window.removeEventListener("keydown", this.onDocumentKeyDown);
    super.disconnectedCallback();
  }

  render() {
    const def = this.def;
    const hex = rgbaBytesToHex(this.rgba);
    const swatchStyle = `background-color: ${hex};`;
    return html`
      <button
        class="swatch"
        aria-label="Pick color"
        aria-haspopup="dialog"
        aria-expanded=${this.open ? "true" : "false"}
        title="Pick color (current ${hex})"
        @click=${(): void => this.toggleOpen()}
      >
        <span class="swatch-inner" style=${swatchStyle}></span>
      </button>
      ${this.open
        ? html`
            <div
              class="popup"
              role="dialog"
              aria-label="Color picker"
              style=${this.popupPos === null
                ? ""
                : `left: ${this.popupPos.left}px; top: ${this.popupPos.top}px;`}
            >
              <div class="model-row">
                <label for="modelSelect">Model</label>
                <select
                  id="modelSelect"
                  .value=${this.model}
                  @change=${(event: Event): void => this.onModelSelect(event)}
                >
                  ${GNUMARUS_COLOR_MODELS.map(
                    (entry) => html`<option value=${entry.id} ?selected=${entry.id === this.model}>${entry.label}</option>`,
                  )}
                </select>
              </div>
              ${def.axes.map((axis, index) => {
                const current = this.modelValues[index] ?? axis.min;
                const percent = axis.max > axis.min ? ((current - axis.min) / (axis.max - axis.min)) * 100 : 0;
                const gradient = modelAxisGradientCss(this.model, index, this.modelValues);
                const unit = axis.unit === "percent" ? "%" : axis.unit === "degrees" ? "°" : "";
                return html`
                  <div class="axis-row">
                    <span class="axis-label">${axis.label}</span>
                    <div
                      class="axis-bar"
                      role="slider"
                      tabindex="0"
                      data-testid=${`axis-bar-${axis.key}`}
                      aria-label=${`${axis.label} (${axis.min}-${axis.max}${axis.unit === "percent" ? " percent" : axis.unit === "degrees" ? " degrees" : ""})`}
                      aria-valuemin=${axis.min}
                      aria-valuemax=${axis.max}
                      aria-valuenow=${Math.round(current * 10) / 10}
                      style="background: ${gradient};"
                      @pointerdown=${(event: PointerEvent): void => this.onBarPointerDown(index, event)}
                      @keydown=${(event: KeyboardEvent): void => this.onBarKeyDown(index, event)}
                    >
                      <div class="axis-thumb" style="left: ${percent}%;"></div>
                    </div>
                    <input
                      class="axis-input"
                      data-axis=${axis.key}
                      aria-label=${axis.label}
                      type="number"
                      min=${axis.min}
                      max=${axis.max}
                      step=${axis.unit === "byte" ? 1 : 0.1}
                      .value=${current.toFixed(axis.decimals)}
                      @input=${(event: Event): void => this.onAxisInput(index, event)}
                      @change=${(event: Event): void => this.onAxisChange(index, event)}
                    />
                    <span class="axis-unit">${unit}</span>
                  </div>
                `;
              })}
              <div class="hex-row">
                <label for="hexInput">Hex</label>
                <input
                  id="hexInput"
                  data-testid="hex-input"
                  .value=${hex}
                  spellcheck="false"
                  @input=${(event: Event): void => this.onHexInput(event)}
                  @change=${(event: Event): void => this.onHexChange(event)}
                />
              </div>
            </div>
          `
        : html``}
    `;
  }
}

customElements.define("gnumarus-color-picker", GnumarusColorPicker);
