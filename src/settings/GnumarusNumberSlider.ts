import { tr } from "../i18n/GnumarusI18n";

/**
 * Aseprite-style numeric slider: focusing any `<input type="number">` shows a
 * floating slider right below it spanning the input's min..max, with two-way
 * sync (typing moves the slider, the slider writes back through regular
 * input/change events). PageUp/PageDown on a focused number input step ∓10
 * clamped to min/max (holding the key repeats; native stepping suppressed).
 *
 * The popup lives in the same tree as the focused input (the open modal
 * dialog when there is one, else the shadow root), so it paints above modal
 * dialogs and works in every shadow root (shell, color picker, ...).
 * Call `installNumberInputHelpers(root)` once per shadow root.
 */

const POPUP_CLASS = "gnumarus-number-popup";
const STYLE_MARKER = "data-gnumarus-number-slider";

export function parseSliderNumber(text: string | null | undefined): number | null {
  if (typeof text !== "string") {
    return null;
  }
  const trimmed = text.trim();
  if (trimmed === "") {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export interface GnumarusSliderBounds {
  min: number;
  max: number;
  step: number;
}

/** Effective slider bounds from the input attributes, with sane fallbacks. */
export function resolveSliderBounds(
  minText: string | null | undefined,
  maxText: string | null | undefined,
  stepText: string | null | undefined,
  value: number,
): GnumarusSliderBounds {
  const fallbackMin = Number.isFinite(value) ? value - 100 : 0;
  const fallbackMax = Number.isFinite(value) ? value + 100 : 100;
  let min = parseSliderNumber(minText) ?? fallbackMin;
  let max = parseSliderNumber(maxText) ?? fallbackMax;
  if (!(max > min)) {
    max = min + 1;
  }
  let step = parseSliderNumber(stepText);
  if (step === null || !(step > 0)) {
    step = Number.isInteger(min) && Number.isInteger(max) ? 1 : (max - min) / 100;
    if (!(step > 0)) {
      step = 1;
    }
  }
  return { min, max, step };
}

function stepDecimals(step: number): number {
  const text = String(step);
  const dot = text.indexOf(".");
  if (dot < 0) {
    return 0;
  }
  const exp = text.indexOf("e");
  const frac = (exp < 0 ? text.slice(dot + 1) : text.slice(dot + 1, exp)).replace(/0+$/, "");
  const expValue = exp < 0 ? 0 : Number(text.slice(exp + 1));
  return Math.max(0, frac.length - expValue);
}

/** Round a value to whole steps (keeps step decimal precision). */
export function roundToStep(value: number, step: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (!Number.isFinite(step) || step <= 0) {
    return value;
  }
  const rounded = Math.round(value / step) * step;
  return Number(rounded.toFixed(stepDecimals(step)));
}

/**
 * Add `delta` to a numeric input string, clamped to min/max. Returns the new
 * string, or null when the current value is not a number.
 */
export function stepNumberValue(
  valueText: string,
  minText: string | null | undefined,
  maxText: string | null | undefined,
  delta: number,
): string | null {
  const current = parseSliderNumber(valueText);
  if (current === null) {
    return null;
  }
  let next = current + delta;
  const min = parseSliderNumber(minText);
  if (min !== null) {
    next = Math.max(min, next);
  }
  const max = parseSliderNumber(maxText);
  if (max !== null) {
    next = Math.min(max, next);
  }
  return String(next);
}

const POPUP_CSS = `
.${POPUP_CLASS} {
  position: fixed;
  z-index: 1000;
  background: #2b2b2b;
  border: 1px solid #111;
  border-radius: 4px;
  padding: 6px 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
}
.${POPUP_CLASS} input[type="range"] {
  display: block;
  width: 100%;
  margin: 0;
  padding: 0;
  accent-color: #0e639c;
  background: transparent;
  cursor: pointer;
}
`;

interface NumberPopup {
  box: HTMLDivElement;
  range: HTMLInputElement;
  input: HTMLInputElement | null;
}

const popups = new Map<Element | ShadowRoot, NumberPopup>();
const styledRoots = new Set<Element | ShadowRoot>();
let listenersInstalled = false;

function ensurePopupCss(container: Element | ShadowRoot): void {
  if (styledRoots.has(container)) {
    return;
  }
  styledRoots.add(container);
  const style = document.createElement("style");
  style.setAttribute(STYLE_MARKER, "");
  style.textContent = POPUP_CSS;
  container.appendChild(style);
}

function popupFor(container: Element | ShadowRoot): NumberPopup {
  const existing = popups.get(container);
  if (existing !== undefined) {
    return existing;
  }
  ensurePopupCss(container);
  const box = document.createElement("div");
  box.className = POPUP_CLASS;
  box.hidden = true;
  const range = document.createElement("input");
  range.type = "range";
  range.setAttribute("aria-label", tr("slider.numberValue"));
  range.addEventListener("input", () => {
    const popup = popups.get(container);
    const target = popup?.input ?? null;
    if (target === null || !target.isConnected) {
      return;
    }
    const raw = Number(range.value);
    if (!Number.isFinite(raw)) {
      return;
    }
    const bounds = resolveSliderBounds(
      target.min,
      target.max,
      target.step,
      Number(target.value),
    );
    commitInputValue(target, String(roundToStep(raw, bounds.step)));
  });
  box.appendChild(range);
  container.appendChild(box);
  const popup: NumberPopup = { box, range, input: null };
  popups.set(container, popup);
  return popup;
}

/** Write a value back through the input's regular event path. */
function commitInputValue(input: HTMLInputElement, text: string): void {
  if (input.value !== text) {
    input.value = text;
    input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    input.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
  }
  syncRange(input);
}

/** Move the slider to the input's current value (clamped into range). */
function syncRange(input: HTMLInputElement): void {
  const container = containerFor(input);
  if (container === null) {
    return;
  }
  const popup = popups.get(container);
  if (popup === undefined || popup.input !== input || popup.box.hidden) {
    return;
  }
  const parsed = Number(input.value);
  if (!Number.isFinite(parsed)) {
    return;
  }
  const bounds = resolveSliderBounds(input.min, input.max, input.step, parsed);
  const clamped = Math.min(bounds.max, Math.max(bounds.min, parsed));
  popup.range.min = String(bounds.min);
  popup.range.max = String(bounds.max);
  popup.range.step = String(bounds.step);
  popup.range.value = String(clamped);
}

/** The popup container: the open modal dialog when there is one, else the root. */
function containerFor(input: HTMLInputElement): Element | ShadowRoot | null {
  const root = input.getRootNode();
  const path = [input, ...ancestors(input)];
  for (const node of path) {
    if (node instanceof HTMLDialogElement && node.open) {
      return node;
    }
  }
  return root instanceof Element || root instanceof ShadowRoot ? root : null;
}

function* ancestors(node: Node): Generator<Node> {
  let current: Node | null = node.parentNode;
  while (current !== null) {
    yield current;
    current = current.parentNode;
  }
}

function hidePopup(container: Element | ShadowRoot): void {
  const popup = popups.get(container);
  if (popup !== undefined) {
    popup.box.hidden = true;
    popup.input = null;
  }
}

function hideAllPopups(): void {
  for (const container of popups.keys()) {
    hidePopup(container);
  }
}

function showFor(input: HTMLInputElement): void {
  if (input.disabled || input.readOnly) {
    return;
  }
  const container = containerFor(input);
  if (container === null) {
    return;
  }
  const popup = popupFor(container);
  const parsed = Number(input.value);
  const bounds = resolveSliderBounds(
    input.min,
    input.max,
    input.step,
    Number.isFinite(parsed) ? parsed : 0,
  );
  popup.range.min = String(bounds.min);
  popup.range.max = String(bounds.max);
  popup.range.step = String(bounds.step);
  popup.input = input;
  const rect = input.getBoundingClientRect();
  const width = Math.max(rect.width, 140);
  popup.box.style.width = `${width}px`;
  popup.box.style.left = `${Math.min(rect.left, window.innerWidth - width - 8)}px`;
  popup.box.style.top = `${rect.bottom + 4}px`;
  popup.box.hidden = false;
  syncRange(input);
}

function focusedNumber(path: EventTarget[]): HTMLInputElement | null {
  const first = path[0];
  return first instanceof HTMLInputElement && first.type === "number" ? first : null;
}

function onFocusIn(event: FocusEvent): void {
  const path = typeof event.composedPath === "function" ? event.composedPath() : [];
  const target = focusedNumber(path);
  if (target !== null) {
    showFor(target);
    return;
  }
  const first = path[0];
  if (first instanceof Node) {
    const root = first.getRootNode();
    const container =
      root instanceof Element || root instanceof ShadowRoot ? root : null;
    if (container !== null) {
      const popup = popups.get(container);
      if (popup !== undefined && !popup.box.hidden) {
        const inPopup = path.some((node) => node === popup.box);
        if (!inPopup) {
          hidePopup(container);
        }
      }
    }
  }
}

function onFocusOut(): void {
  // The next focusin (or a pointer press elsewhere) settles visibility;
  // this only covers focus escaping to nowhere (e.g. removed inputs).
  window.setTimeout(() => {
    const active = document.activeElement;
    if (active instanceof HTMLInputElement && active.type === "number") {
      return;
    }
    for (const [container, popup] of popups) {
      // A pending focusin may have just retargeted this popup; only hide
      // popups whose input is not the focused element.
      if (!popup.box.hidden && popup.input !== active && !popup.box.contains(active)) {
        hidePopup(container);
      }
    }
  }, 0);
}

function onPointerDown(event: PointerEvent): void {
  const path = typeof event.composedPath === "function" ? event.composedPath() : [];
  // Pressing a number input shows its slider immediately, even if the
  // ensuing focus is swallowed by a re-render replacing the node.
  const target = focusedNumber(path);
  if (target !== null) {
    showFor(target);
  }
  for (const [container, popup] of popups) {
    if (popup.box.hidden) {
      continue;
    }
    const inside = path.some((node) => node === popup.box || node === popup.input);
    if (!inside) {
      hidePopup(container);
    }
  }
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey) {
    return;
  }
  if (event.key !== "PageUp" && event.key !== "PageDown") {
    return;
  }
  const path = typeof event.composedPath === "function" ? event.composedPath() : [];
  const target = path[0];
  if (
    !(target instanceof HTMLInputElement) ||
    target.type !== "number" ||
    target.disabled ||
    target.readOnly
  ) {
    return;
  }
  const next = stepNumberValue(
    target.value,
    target.min,
    target.max,
    event.key === "PageUp" ? 10 : -10,
  );
  if (next === null) {
    return;
  }
  // Suppress native stepping (and the app shortcuts, which skip fields
  // anyway); holding the key repeats and keeps stepping by tens.
  event.preventDefault();
  commitInputValue(target, next);
}

function onInput(event: Event): void {
  const path = typeof event.composedPath === "function" ? event.composedPath() : [];
  const target = focusedNumber(path);
  if (target === null) {
    return;
  }
  // The focused node may have been replaced by a re-render since the popup
  // opened; adopt whatever number input is actually being typed in.
  const container = containerFor(target);
  if (container !== null) {
    const popup = popups.get(container);
    if (popup !== undefined && !popup.box.hidden && popup.input !== target) {
      popup.input = target;
      const rect = target.getBoundingClientRect();
      popup.box.style.left = `${Math.min(rect.left, window.innerWidth - 160)}px`;
      popup.box.style.top = `${rect.bottom + 4}px`;
    }
  }
  syncRange(target);
}

/** Wire the shared numeric-slider behavior (popups are created lazily). Idempotent. */
export function installNumberInputHelpers(root: ShadowRoot): void {
  if (!listenersInstalled) {
    listenersInstalled = true;
    document.addEventListener("focus", onFocusIn, true);
    document.addEventListener("focusin", onFocusIn, true);
    document.addEventListener("focusout", onFocusOut, true);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("input", onInput, true);
    window.addEventListener("scroll", hideAllPopups, true);
    window.addEventListener("resize", hideAllPopups);
  }
  void root;
}
