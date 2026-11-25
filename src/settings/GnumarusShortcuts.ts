/**
 * Configurable keyboard shortcuts (American English comments).
 *
 * Each shortcut id has a factory-default keyboard part plus a fixed mouse
 * gesture suffix (never editable, only described). The editable part is
 * always the keyboard part: ctrl/alt/shift/super(space-bar)/space modifiers
 * plus a main key symbol ("" means modifiers-only or unbound).
 *
 * Conflict rule: two ids with the same normalized keyboard string AND the
 * same mouse suffix conflict (shown red, disabled while the dialog closes).
 * Context-exclusive bindings (tile-brush keys, flycam keys, model-view keys)
 * set `allowOverlap` so intentional mode-specific sharing never conflicts.
 */

export interface GnumarusShortcutKeyboard {
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  /** Meta key (Windows key / Cmd). Displayed as "super". */
  super: boolean;
  /** Space bar held as a modifier. Displayed as "space". */
  space: boolean;
  /** Main key symbol ("" = modifiers-only or unbound). Canonical form. */
  key: string;
}

export interface GnumarusShortcutDef {
  id: string;
  keyboard: GnumarusShortcutKeyboard;
  /** Fixed mouse gesture suffix ("" = keyboard-only). Never editable. */
  mouse: string;
  /** When true, same-keyboard overlaps never count as conflicts. */
  allowOverlap?: boolean;
}

export const GNUMARUS_SHORTCUTS_STORAGE_KEY = "gnumarus.shortcuts.v1";

export type GnumarusShortcutPresetId =
  | "gnumarus"
  | "photoshop"
  | "krita"
  | "gimp"
  | "mypaint"
  | "aseprite"
  | "procreate"
  | "medibang"
  | "ibis"
  | "sai"
  | "firealpaca";

export const GNUMARUS_SHORTCUT_PRESETS: Array<{ id: GnumarusShortcutPresetId; label: string }> = [
  { id: "gnumarus", label: "Gnumaru's Paint" },
  { id: "photoshop", label: "Photoshop" },
  { id: "krita", label: "Krita" },
  { id: "gimp", label: "Gimp" },
  { id: "mypaint", label: "MyPaint" },
  { id: "aseprite", label: "Aseprite" },
  { id: "procreate", label: "Procreate" },
  { id: "medibang", label: "MediBang Paint" },
  { id: "ibis", label: "ibis Paint X" },
  { id: "sai", label: "Paint Tool SAI" },
  { id: "firealpaca", label: "FireAlpaca" },
];

function k(
  key: string,
  opts: Partial<Omit<GnumarusShortcutKeyboard, "key">> = {},
): GnumarusShortcutKeyboard {
  return {
    ctrl: opts.ctrl ?? false,
    alt: opts.alt ?? false,
    shift: opts.shift ?? false,
    super: opts.super ?? false,
    space: opts.space ?? false,
    key,
  };
}

const NONE = k("");

/** Factory defaults mirroring the historic hard-coded behavior. */
export const GNUMARUS_DEFAULT_SHORTCUTS: GnumarusShortcutDef[] = [
  // File (save keeps Ctrl+S; new/open keep Ctrl+Alt+N/Ctrl+Alt+O since
  // browsers reserve Ctrl+N/Ctrl+O — see FORBIDEN_KEYBOARD_SHORTCUTS.md).
  { id: "file-new", keyboard: k("n", { ctrl: true, alt: true }), mouse: "" },
  { id: "file-open", keyboard: k("o", { ctrl: true, alt: true }), mouse: "" },
  { id: "file-save", keyboard: k("s", { ctrl: true }), mouse: "" },
  { id: "file-save-as", keyboard: NONE, mouse: "" },
  { id: "file-upload", keyboard: NONE, mouse: "" },
  { id: "file-open-embedded", keyboard: NONE, mouse: "" },
  { id: "file-save-embedded", keyboard: NONE, mouse: "" },
  { id: "file-save-embedded-as", keyboard: NONE, mouse: "" },
  { id: "file-import", keyboard: NONE, mouse: "" },
  { id: "file-import-svg", keyboard: NONE, mouse: "" },
  { id: "file-import-3d", keyboard: NONE, mouse: "" },
  { id: "file-import-image", keyboard: NONE, mouse: "" },
  { id: "file-content-manager", keyboard: NONE, mouse: "" },
  { id: "file-export", keyboard: NONE, mouse: "" },
  // Edit.
  { id: "edit-undo", keyboard: k("z", { ctrl: true }), mouse: "" },
  { id: "edit-redo", keyboard: k("y", { ctrl: true }), mouse: "" },
  { id: "edit-cut", keyboard: k("x", { ctrl: true }), mouse: "" },
  { id: "edit-copy", keyboard: k("c", { ctrl: true }), mouse: "" },
  { id: "edit-copy-merged", keyboard: k("c", { ctrl: true, shift: true }), mouse: "" },
  { id: "edit-paste", keyboard: k("v", { ctrl: true }), mouse: "" },
  { id: "edit-create-brush", keyboard: NONE, mouse: "" },
  { id: "edit-settings", keyboard: NONE, mouse: "" },
  { id: "edit-shortcuts", keyboard: NONE, mouse: "" },
  { id: "edit-adjust-bc", keyboard: NONE, mouse: "" },
  { id: "edit-adjust-hs", keyboard: NONE, mouse: "" },
  { id: "edit-adjust-invert", keyboard: NONE, mouse: "" },
  { id: "edit-adjust-colors", keyboard: NONE, mouse: "" },
  { id: "edit-reset-transform", keyboard: k("0"), mouse: "" },
  { id: "edit-merge-down", keyboard: k("e", { ctrl: true }), mouse: "" },
  { id: "edit-swap-colors", keyboard: k("x"), mouse: "" },
  { id: "edit-toggle-eraser", keyboard: k("e"), mouse: "" },
  { id: "edit-temp-eyedropper", keyboard: k("", { ctrl: true }), mouse: "" },
  { id: "edit-confirm", keyboard: k("Enter"), mouse: "" },
  { id: "edit-cancel", keyboard: k("Escape"), mouse: "" },
  { id: "edit-merge-floating", keyboard: k("Enter"), mouse: "", allowOverlap: true },
  { id: "edit-delete-cell", keyboard: k("Delete"), mouse: "" },
  { id: "edit-quick-search", keyboard: k("k", { ctrl: true }), mouse: "" },
  { id: "edit-hide-chrome", keyboard: k("Tab"), mouse: "" },
  // Layers.
  { id: "layer-above", keyboard: k("PageUp"), mouse: "" },
  { id: "layer-below", keyboard: k("PageDown"), mouse: "" },
  { id: "layer-move-up", keyboard: k("ArrowUp", { shift: true }), mouse: "" },
  { id: "layer-move-down", keyboard: k("ArrowDown", { shift: true }), mouse: "" },
  { id: "layer-nest-out", keyboard: k("ArrowLeft", { alt: true }), mouse: "" },
  { id: "layer-nest-in", keyboard: k("ArrowRight", { alt: true }), mouse: "" },
  { id: "layer-insert", keyboard: k("Insert"), mouse: "" },
  { id: "layer-new-above", keyboard: k("ArrowUp", { ctrl: true, shift: true }), mouse: "" },
  { id: "layer-new-below", keyboard: k("ArrowDown", { ctrl: true, shift: true }), mouse: "" },
  { id: "layer-expand-up", keyboard: k("ArrowUp", { ctrl: true, alt: true }), mouse: "" },
  { id: "layer-expand-down", keyboard: k("ArrowDown", { ctrl: true, alt: true }), mouse: "" },
  { id: "layer-expand-left", keyboard: k("ArrowLeft", { ctrl: true, alt: true }), mouse: "" },
  { id: "layer-expand-right", keyboard: k("ArrowRight", { ctrl: true, alt: true }), mouse: "" },
  // Frames.
  { id: "frame-prev", keyboard: k("ArrowLeft"), mouse: "" },
  { id: "frame-next", keyboard: k("ArrowRight"), mouse: "" },
  { id: "frame-move-left", keyboard: k("ArrowLeft", { shift: true }), mouse: "" },
  { id: "frame-move-right", keyboard: k("ArrowRight", { shift: true }), mouse: "" },
  { id: "frame-new-left", keyboard: k("ArrowLeft", { ctrl: true, shift: true }), mouse: "" },
  { id: "frame-new-right", keyboard: k("ArrowRight", { ctrl: true, shift: true }), mouse: "" },
  // Tools (factory letters).
  { id: "tool-brush", keyboard: k("b"), mouse: "" },
  { id: "tool-bucket", keyboard: k("g"), mouse: "" },
  { id: "tool-line", keyboard: k("n"), mouse: "" },
  { id: "tool-curve", keyboard: k("c"), mouse: "" },
  { id: "tool-rectangle", keyboard: k("d"), mouse: "" },
  { id: "tool-ellipseShape", keyboard: k("h"), mouse: "" },
  { id: "tool-polygon", keyboard: k("j"), mouse: "" },
  { id: "tool-gradient", keyboard: k("k"), mouse: "" },
  { id: "tool-shading", keyboard: k("s"), mouse: "" },
  { id: "tool-blur", keyboard: k("i"), mouse: "" },
  { id: "tool-clone", keyboard: k("a"), mouse: "" },
  { id: "tool-recolor", keyboard: k("q"), mouse: "" },
  { id: "tool-loupe", keyboard: k("z"), mouse: "" },
  { id: "tool-pan", keyboard: NONE, mouse: "" },
  { id: "tool-rotatecanvas", keyboard: NONE, mouse: "" },
  { id: "tool-transform", keyboard: k("t"), mouse: "" },
  { id: "tool-transform3d", keyboard: k("y"), mouse: "" },
  { id: "tool-eyedropper", keyboard: NONE, mouse: "" },
  { id: "tool-rectselect", keyboard: k("r"), mouse: "" },
  { id: "tool-ellipse", keyboard: k("o"), mouse: "" },
  { id: "tool-lasso", keyboard: k("l"), mouse: "" },
  { id: "tool-polylasso", keyboard: k("p"), mouse: "" },
  { id: "tool-colorselect", keyboard: k("w"), mouse: "" },
  { id: "tool-regions", keyboard: NONE, mouse: "" },
  { id: "tool-text", keyboard: NONE, mouse: "" },
  { id: "tool-tilebrush", keyboard: NONE, mouse: "" },
  { id: "tool-modeltransform", keyboard: NONE, mouse: "" },
  { id: "tool-flycam", keyboard: NONE, mouse: "" },
  { id: "tool-jumble", keyboard: NONE, mouse: "" },
  { id: "tool-crop", keyboard: NONE, mouse: "" },
  { id: "tool-growcrop", keyboard: NONE, mouse: "" },
  { id: "tool-destransform", keyboard: k("v"), mouse: "" },
  { id: "tool-destransform3d", keyboard: k("u"), mouse: "" },
  // Tile-brush mode keys (context-exclusive with the global letters above).
  { id: "tile-rotate", keyboard: k("r"), mouse: "", allowOverlap: true },
  { id: "tile-fliph", keyboard: k("h"), mouse: "", allowOverlap: true },
  { id: "tile-flipv", keyboard: k("v"), mouse: "", allowOverlap: true },
  { id: "model-reset-view", keyboard: k("r"), mouse: "", allowOverlap: true },
  // View.
  { id: "view-zoom-100", keyboard: k("1"), mouse: "" },
  { id: "view-fit", keyboard: k("2"), mouse: "" },
  { id: "view-rotate-ccw", keyboard: k("4"), mouse: "" },
  { id: "view-rotate-cw", keyboard: k("6"), mouse: "" },
  { id: "view-reset-rotation", keyboard: k("5"), mouse: "" },
  { id: "view-flip-h", keyboard: k("m"), mouse: "" },
  { id: "view-flip-v", keyboard: k("m", { shift: true }), mouse: "" },
  { id: "view-zoom-in", keyboard: k("=", { ctrl: true, alt: true }), mouse: "" },
  { id: "view-zoom-out", keyboard: k("-", { ctrl: true, alt: true }), mouse: "" },
  { id: "view-pan", keyboard: k("", { space: true }), mouse: "left-drag" },
  { id: "view-zoom-wheel", keyboard: NONE, mouse: "wheel" },
  { id: "view-loupe-zoom", keyboard: k("", { ctrl: true, space: true }), mouse: "left-drag-up-down" },
  { id: "view-loupe-rotate", keyboard: k("", { shift: true, space: true }), mouse: "left-drag" },
  { id: "view-loupe-reset", keyboard: k("", { alt: true }), mouse: "middle-click" },
  { id: "view-loupe-flip", keyboard: NONE, mouse: "middle-click" },
  { id: "view-loupe-rotate-drag", keyboard: NONE, mouse: "right-drag" },
  { id: "view-live-resize", keyboard: k("", { shift: true }), mouse: "left-drag" },
  { id: "view-transform-proportional", keyboard: k("", { alt: true }), mouse: "left-drag-handle" },
  { id: "view-drawer-flyout", keyboard: NONE, mouse: "right-click" },
  { id: "view-toggle-grayscale", keyboard: k("g", { ctrl: true }), mouse: "" },
  { id: "tool-brush-resize-wheel", keyboard: k("", { ctrl: true }), mouse: "wheel" },
  // Flycam mode keys (exclusive: flycam owns every plain key while active).
  { id: "flycam-forward", keyboard: k("w"), mouse: "", allowOverlap: true },
  { id: "flycam-back", keyboard: k("s"), mouse: "", allowOverlap: true },
  { id: "flycam-left", keyboard: k("a"), mouse: "", allowOverlap: true },
  { id: "flycam-right", keyboard: k("d"), mouse: "", allowOverlap: true },
  { id: "flycam-up", keyboard: k("e"), mouse: "", allowOverlap: true },
  { id: "flycam-down", keyboard: k("q"), mouse: "", allowOverlap: true },
  { id: "flycam-orbit-left", keyboard: k("z"), mouse: "", allowOverlap: true },
  { id: "flycam-orbit-right", keyboard: k("c"), mouse: "", allowOverlap: true },
  { id: "flycam-turn-left", keyboard: k("j"), mouse: "", allowOverlap: true },
  { id: "flycam-turn-right", keyboard: k("l"), mouse: "", allowOverlap: true },
  { id: "flycam-pitch-up", keyboard: k("i"), mouse: "", allowOverlap: true },
  { id: "flycam-pitch-down", keyboard: k("k"), mouse: "", allowOverlap: true },
  { id: "flycam-reset", keyboard: k("r"), mouse: "", allowOverlap: true },
  { id: "flycam-exit", keyboard: k("Escape"), mouse: "", allowOverlap: true },
  // Generic run actions without factory keys.
  { id: "action-fit-all", keyboard: NONE, mouse: "" },
  { id: "action-invert", keyboard: NONE, mouse: "" },
  { id: "action-adjust", keyboard: NONE, mouse: "" },
  { id: "action-new-animation", keyboard: NONE, mouse: "" },
  { id: "action-reload-contents", keyboard: NONE, mouse: "" },
  { id: "action-reload-textures", keyboard: NONE, mouse: "" },
  { id: "action-unlink-cells", keyboard: NONE, mouse: "" },
  { id: "action-relink-cells", keyboard: NONE, mouse: "" },
  { id: "action-total-duration", keyboard: NONE, mouse: "" },
  { id: "action-make-root", keyboard: NONE, mouse: "" },
  { id: "action-toggle-mask", keyboard: NONE, mouse: "" },
  { id: "action-crop-all", keyboard: NONE, mouse: "" },
  { id: "action-manual", keyboard: NONE, mouse: "" },
  { id: "action-source-code", keyboard: NONE, mouse: "" },
  { id: "action-licenses", keyboard: NONE, mouse: "" },
];

export const GNUMARUS_DEFAULT_SHORTCUT_MAP: Record<string, GnumarusShortcutDef> = Object.fromEntries(
  GNUMARUS_DEFAULT_SHORTCUTS.map((def) => [def.id, def]),
);

const CANONICAL_KEYS: Record<string, string> = {
  esc: "Escape",
  escape: "Escape",
  return: "Enter",
  enter: "Enter",
  tab: "Tab",
  spacebar: " ",
  del: "Delete",
  delete: "Delete",
  insert: "Insert",
  ins: "Insert",
  home: "Home",
  end: "End",
  pageup: "PageUp",
  pagedown: "PageDown",
  arrowup: "ArrowUp",
  arrowdown: "ArrowDown",
  arrowleft: "ArrowLeft",
  arrowright: "ArrowRight",
  up: "ArrowUp",
  down: "ArrowDown",
  left: "ArrowLeft",
  right: "ArrowRight",
  backspace: "Backspace",
};

/** Normalize a user-typed symbol into canonical key form ("" allowed). */
export function normalizeShortcutKey(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return "";
  }
  const lower = trimmed.toLowerCase();
  if (lower === "space" || trimmed === " ") {
    return " ";
  }
  const mapped = CANONICAL_KEYS[lower];
  if (mapped !== undefined) {
    return mapped;
  }
  if (/^f([1-9]|1[0-9]|2[0-4])$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }
  if (trimmed.length === 1) {
    return trimmed.toLowerCase();
  }
  // Accept Digit/Numpad codes and short names verbatim when plausible.
  if (/^(Digit|Numpad)[0-9]$/.test(trimmed)) {
    return trimmed;
  }
  return trimmed;
}

/** Display form of a keyboard part ("F", "ctrl+alt+shift+super+space+R", "ctrl", "—"). */
export function shortcutKeyboardToString(kb: GnumarusShortcutKeyboard): string {
  const parts: string[] = [];
  if (kb.ctrl) parts.push("ctrl");
  if (kb.alt) parts.push("alt");
  if (kb.shift) parts.push("shift");
  if (kb.super) parts.push("super");
  if (kb.space) parts.push("space");
  if (kb.key !== "") {
    parts.push(kb.key.length === 1 ? kb.key.toUpperCase() : kb.key);
  }
  if (parts.length === 0) {
    return "—";
  }
  return parts.join("+");
}

/** Full display string including the fixed mouse suffix. */
export function shortcutToString(kb: GnumarusShortcutKeyboard, mouse: string): string {
  const head = shortcutKeyboardToString(kb);
  if (mouse === "") {
    return head;
  }
  if (head === "—") {
    return mouse;
  }
  return `${head}+${mouse}`;
}

/** True for effectively unbound entries (no keyboard, no mouse). */
export function isShortcutUnbound(kb: GnumarusShortcutKeyboard, mouse: string): boolean {
  return kb.key === "" && !kb.ctrl && !kb.alt && !kb.shift && !kb.super && !kb.space && mouse === "";
}

function canonicalKeyForCompare(key: string): string {
  if (key.length === 1) {
    return key.toLowerCase();
  }
  return key;
}

/** Normalized conflict key (keyboard + mouse). Unbound entries return null. */
export function shortcutConflictKey(kb: GnumarusShortcutKeyboard, mouse: string): string | null {
  if (isShortcutUnbound(kb, mouse)) {
    return null;
  }
  const head = [
    kb.ctrl ? "ctrl" : "",
    kb.alt ? "alt" : "",
    kb.shift ? "shift" : "",
    kb.super ? "super" : "",
    kb.space ? "space" : "",
    canonicalKeyForCompare(kb.key),
  ].join("+");
  return `${head}|${mouse}`;
}

export function keyboardsEqual(a: GnumarusShortcutKeyboard, b: GnumarusShortcutKeyboard): boolean {
  return (
    a.ctrl === b.ctrl &&
    a.alt === b.alt &&
    a.shift === b.shift &&
    a.super === b.super &&
    a.space === b.space &&
    canonicalKeyForCompare(a.key) === canonicalKeyForCompare(b.key)
  );
}

export interface GnumarusShortcutEffective {
  keyboard: GnumarusShortcutKeyboard;
  mouse: string;
  allowOverlap: boolean;
  isDefault: boolean;
}

/** Merge factory defaults with user overrides (unknown ids become unbound). */
export function resolveEffectiveShortcuts(
  overrides: Record<string, GnumarusShortcutKeyboard>,
  extraIds: string[] = [],
): Record<string, GnumarusShortcutEffective> {
  const out: Record<string, GnumarusShortcutEffective> = {};
  for (const def of GNUMARUS_DEFAULT_SHORTCUTS) {
    const override = overrides[def.id];
    out[def.id] =
      override === undefined
        ? { keyboard: { ...def.keyboard }, mouse: def.mouse, allowOverlap: def.allowOverlap ?? false, isDefault: true }
        : { keyboard: { ...override }, mouse: def.mouse, allowOverlap: def.allowOverlap ?? false, isDefault: false };
  }
  for (const id of extraIds) {
    if (out[id] === undefined) {
      const override = overrides[id];
      out[id] =
        override === undefined
          ? { keyboard: { ...NONE }, mouse: "", allowOverlap: false, isDefault: true }
          : { keyboard: { ...override }, mouse: "", allowOverlap: false, isDefault: false };
    }
  }
  return out;
}

/** Ids involved in a conflict (same conflict key, overlap-allowed excluded). */
export function findShortcutConflicts(
  effective: Record<string, GnumarusShortcutEffective>,
): Set<string> {
  const byKey = new Map<string, string[]>();
  for (const [id, entry] of Object.entries(effective)) {
    if (entry.allowOverlap) {
      continue;
    }
    const ck = shortcutConflictKey(entry.keyboard, entry.mouse);
    if (ck === null) {
      continue;
    }
    const list = byKey.get(ck);
    if (list === undefined) {
      byKey.set(ck, [id]);
    } else {
      list.push(id);
    }
  }
  const out = new Set<string>();
  for (const list of byKey.values()) {
    if (list.length > 1) {
      for (const id of list) {
        out.add(id);
      }
    }
  }
  return out;
}

function eventKeyCandidates(event: KeyboardEvent): string[] {
  const out: string[] = [];
  if (typeof event.key === "string" && event.key !== "") {
    const kl = event.key.toLowerCase();
    if (kl === " ") {
      out.push(" ");
    } else {
      out.push(event.key.length === 1 ? event.key.toLowerCase() : event.key);
    }
  }
  if (typeof event.code === "string" && event.code !== "") {
    out.push(event.code);
    // Digit1 / Numpad1 both satisfy a "1" binding.
    const digit = /^Digit([0-9])$/.exec(event.code) ?? /^Numpad([0-9])$/.exec(event.code);
    if (digit !== null) {
      out.push(digit[1]);
    }
    // NumpadAdd/Subtract satisfy "+" / "-" and "=" bindings.
    if (event.code === "NumpadAdd" || event.code === "Equal") {
      out.push("=", "+");
    }
    if (event.code === "NumpadSubtract" || event.code === "Minus") {
      out.push("-");
    }
  }
  return out;
}

/**
 * Keyboard-event matcher. `spaceDown` is the tracked Space-bar state.
 * Ctrl bindings also accept Cmd (meta) alone for macOS parity unless the
 * binding explicitly requires super; requiring both needs both physical keys.
 */
export function shortcutMatchesEvent(
  event: KeyboardEvent,
  spaceDown: boolean,
  combo: GnumarusShortcutKeyboard,
): boolean {
  const hasCtrl = event.ctrlKey;
  const hasMeta = event.metaKey;
  const hasAlt = event.altKey;
  const hasShift = event.shiftKey;
  const hasSpace = spaceDown || event.code === "Space" || event.key === " ";
  if (combo.ctrl && combo.super) {
    if (!(hasCtrl && hasMeta)) {
      return false;
    }
  } else if (combo.ctrl) {
    if (!(hasCtrl || hasMeta)) {
      return false;
    }
  } else if (combo.super) {
    if (!hasMeta || hasCtrl) {
      return false;
    }
  } else if (hasCtrl || hasMeta) {
    return false;
  }
  if (combo.alt !== hasAlt) {
    return false;
  }
  if (combo.shift !== hasShift) {
    return false;
  }
  if (combo.space !== hasSpace) {
    // A binding without space must not fire from the Space key itself.
    return false;
  }
  if (combo.key === "") {
    return true;
  }
  if (combo.key === " ") {
    return event.code === "Space" || event.key === " ";
  }
  const want = canonicalKeyForCompare(normalizeShortcutKey(combo.key));
  const candidates = eventKeyCandidates(event).map((entry) =>
    entry.length === 1 ? entry.toLowerCase() : entry,
  );
  if (candidates.includes(want)) {
    return true;
  }
  // Single letters/digits also match by code (layout-independent enough).
  if (want.length === 1 && typeof event.code === "string") {
    const codeLetter = /^Key([a-z])$/i.exec(event.code);
    if (codeLetter !== null && codeLetter[1].toLowerCase() === want) {
      return true;
    }
  }
  return false;
}

/** Modifier-only check for pointer/wheel gestures (ignores the main key when heldKeys lacks it). */
export function shortcutModifiersSatisfied(
  mods: { ctrl: boolean; alt: boolean; shift: boolean; meta: boolean; space: boolean },
  combo: GnumarusShortcutKeyboard,
  heldKeys: Set<string> = new Set(),
): boolean {
  const hasCtrl = mods.ctrl;
  const hasMeta = mods.meta;
  if (combo.ctrl && combo.super) {
    if (!(hasCtrl && hasMeta)) {
      return false;
    }
  } else if (combo.ctrl) {
    if (!(hasCtrl || hasMeta)) {
      return false;
    }
  } else if (combo.super) {
    if (!hasMeta || hasCtrl) {
      return false;
    }
  } else if (hasCtrl || hasMeta) {
    return false;
  }
  if (combo.alt !== mods.alt || combo.shift !== mods.shift || combo.space !== mods.space) {
    return false;
  }
  if (combo.key === "" || combo.key === " ") {
    return combo.key === "" ? true : mods.space;
  }
  const want = canonicalKeyForCompare(normalizeShortcutKey(combo.key));
  for (const held of heldKeys) {
    if ((held.length === 1 ? held.toLowerCase() : held) === want) {
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Presets: best-effort approximations of each program's factory keys.
// Only the keyboard part is overridden; fixed mouse suffixes never change.
// ---------------------------------------------------------------------------

type PresetOverride = Record<string, GnumarusShortcutKeyboard>;

/**
 * Build a preset override map from base letters, disambiguating duplicates
 * (and collisions with non-tool defaults) by adding Shift/Alt/Ctrl so every
 * preset stays conflict-free while keeping the familiar base letter.
 */
function presetTools(
  map: Record<string, string>,
  extra: Record<string, GnumarusShortcutKeyboard> = {},
): PresetOverride {
  const out: PresetOverride = { ...extra };
  // Occupied conflict keys: non-tool defaults (edit/view/layers/frames/file)
  // plus tools not overridden by this preset (they keep factory keys).
  const overriddenTools = new Set(Object.keys(map).map((tool) => `tool-${tool}`));
  const used = new Set<string>();
  for (const def of GNUMARUS_DEFAULT_SHORTCUTS) {
    if (def.allowOverlap) {
      continue;
    }
    if (def.id.startsWith("tool-") && overriddenTools.has(def.id)) {
      continue;
    }
    const ck = shortcutConflictKey(def.keyboard, def.mouse);
    if (ck !== null) {
      used.add(ck);
    }
  }
  const variants: Array<Partial<Omit<GnumarusShortcutKeyboard, "key">>> = [
    {},
    { shift: true },
    { alt: true },
    { ctrl: true },
    { ctrl: true, shift: true },
    { alt: true, shift: true },
    { ctrl: true, alt: true },
    { super: true },
    { super: true, shift: true },
    { super: true, alt: true },
    { super: true, ctrl: true },
    { ctrl: true, alt: true, shift: true },
  ];
  for (const [tool, base] of Object.entries(map)) {
    const id = `tool-${tool}`;
    const def = GNUMARUS_DEFAULT_SHORTCUT_MAP[id];
    if (def === undefined) {
      continue;
    }
    const letter = base.trim().toLowerCase();
    if (letter === "") {
      continue;
    }
    let placed: GnumarusShortcutKeyboard | null = null;
    for (const variant of variants) {
      const candidate = k(letter, variant);
      const ck = shortcutConflictKey(candidate, def.mouse);
      if (ck !== null && !used.has(ck)) {
        placed = candidate;
        used.add(ck);
        break;
      }
    }
    out[id] = placed ?? k(letter);
    if (placed !== null) {
      // already added to used
    }
  }
  return out;
}

const PHOTOSHOP_KEYS: Record<string, string> = {
  brush: "b",
  bucket: "g",
  line: "u",
  curve: "p",
  rectangle: "u",
  ellipseShape: "u",
  polygon: "u",
  gradient: "g",
  shading: "o",
  blur: "r",
  clone: "s",
  recolor: "o",
  loupe: "z",
  transform: "v",
  transform3d: "v",
  rectselect: "m",
  ellipse: "m",
  lasso: "l",
  polylasso: "l",
  colorselect: "w",
  text: "t",
  eyedropper: "i",
  destransform: "v",
  destransform3d: "c",
  crop: "c",
};

const KRITA_KEYS: Record<string, string> = {
  brush: "b",
  bucket: "f",
  line: "v",
  curve: "v",
  rectangle: "r",
  ellipseShape: "r",
  polygon: "r",
  gradient: "g",
  shading: "s",
  blur: "b",
  clone: "s",
  recolor: "h",
  loupe: "z",
  transform: "t",
  transform3d: "t",
  rectselect: "r",
  ellipse: "r",
  lasso: "r",
  polylasso: "r",
  colorselect: "r",
  text: "t",
  eyedropper: "p",
  pan: "h",
};

const GIMP_KEYS: Record<string, string> = {
  brush: "p",
  bucket: "g",
  line: "l",
  curve: "b",
  rectangle: "r",
  ellipseShape: "e",
  polygon: "f",
  gradient: "g",
  shading: "s",
  blur: "b",
  clone: "c",
  recolor: "h",
  loupe: "z",
  transform: "t",
  rectselect: "r",
  ellipse: "e",
  lasso: "f",
  polylasso: "f",
  colorselect: "f",
  text: "t",
  eyedropper: "o",
  crop: "c",
};

const MYPAINT_KEYS: Record<string, string> = {
  brush: "b",
  bucket: "f",
  line: "l",
  curve: "c",
  rectangle: "r",
  ellipseShape: "e",
  polygon: "p",
  gradient: "g",
  shading: "s",
  blur: "b",
  clone: "c",
  recolor: "h",
  loupe: "z",
  transform: "t",
  rectselect: "r",
  ellipse: "e",
  lasso: "l",
  polylasso: "l",
  colorselect: "w",
  text: "t",
  eyedropper: "o",
};

const ASEPRITE_KEYS: Record<string, string> = {
  brush: "b",
  bucket: "g",
  line: "l",
  curve: "c",
  rectangle: "u",
  ellipseShape: "u",
  polygon: "u",
  gradient: "g",
  shading: "s",
  blur: "b",
  clone: "s",
  recolor: "h",
  loupe: "z",
  transform: "t",
  rectselect: "m",
  ellipse: "m",
  lasso: "l",
  polylasso: "l",
  colorselect: "w",
  text: "t",
  eyedropper: "i",
};

const PROCREATE_KEYS: Record<string, string> = {
  brush: "b",
  bucket: "g",
  line: "l",
  curve: "c",
  rectangle: "r",
  ellipseShape: "e",
  polygon: "p",
  gradient: "g",
  shading: "s",
  blur: "b",
  clone: "s",
  recolor: "h",
  loupe: "z",
  transform: "t",
  rectselect: "s",
  ellipse: "s",
  lasso: "s",
  polylasso: "s",
  colorselect: "s",
  text: "t",
  eyedropper: "o",
};

const MEDIBANG_KEYS: Record<string, string> = {
  brush: "b",
  bucket: "g",
  line: "l",
  curve: "c",
  rectangle: "u",
  ellipseShape: "u",
  polygon: "u",
  gradient: "g",
  shading: "s",
  blur: "b",
  clone: "s",
  recolor: "h",
  loupe: "z",
  transform: "t",
  rectselect: "m",
  ellipse: "m",
  lasso: "l",
  polylasso: "l",
  colorselect: "w",
  text: "t",
  eyedropper: "i",
};

const IBIS_KEYS: Record<string, string> = {
  brush: "b",
  bucket: "g",
  line: "l",
  curve: "c",
  rectangle: "r",
  ellipseShape: "e",
  polygon: "p",
  gradient: "g",
  shading: "s",
  blur: "b",
  clone: "s",
  recolor: "h",
  loupe: "z",
  transform: "t",
  rectselect: "s",
  ellipse: "s",
  lasso: "s",
  polylasso: "s",
  colorselect: "w",
  text: "t",
  eyedropper: "o",
};

const SAI_KEYS: Record<string, string> = {
  brush: "b",
  bucket: "g",
  line: "l",
  curve: "c",
  rectangle: "u",
  ellipseShape: "u",
  polygon: "u",
  gradient: "g",
  shading: "s",
  blur: "b",
  clone: "s",
  recolor: "h",
  loupe: "z",
  transform: "t",
  rectselect: "m",
  ellipse: "m",
  lasso: "l",
  polylasso: "l",
  colorselect: "w",
  text: "t",
  eyedropper: "o",
};

const FIREALPACA_KEYS: Record<string, string> = {
  brush: "b",
  bucket: "g",
  line: "l",
  curve: "c",
  rectangle: "u",
  ellipseShape: "u",
  polygon: "u",
  gradient: "g",
  shading: "s",
  blur: "b",
  clone: "s",
  recolor: "h",
  loupe: "z",
  transform: "t",
  rectselect: "m",
  ellipse: "m",
  lasso: "l",
  polylasso: "l",
  colorselect: "w",
  text: "t",
  eyedropper: "i",
};

function withCore(base: PresetOverride, redoShift: boolean, zoomAlt: boolean): PresetOverride {
  const out: PresetOverride = { ...base };
  out["edit-redo"] = redoShift ? k("z", { ctrl: true, shift: true }) : k("y", { ctrl: true });
  if (!zoomAlt) {
    out["view-zoom-in"] = k("=", { ctrl: true });
    out["view-zoom-out"] = k("-", { ctrl: true });
  }
  return out;
}

export const GNUMARUS_SHORTCUT_PRESET_OVERRIDES: Record<GnumarusShortcutPresetId, PresetOverride> = {
  gnumarus: {},
  photoshop: withCore(presetTools(PHOTOSHOP_KEYS), true, true),
  krita: withCore(presetTools(KRITA_KEYS), false, true),
  gimp: withCore(presetTools(GIMP_KEYS), false, false),
  mypaint: withCore(presetTools(MYPAINT_KEYS), false, true),
  aseprite: withCore(presetTools(ASEPRITE_KEYS), true, true),
  procreate: withCore(presetTools(PROCREATE_KEYS), true, true),
  medibang: withCore(presetTools(MEDIBANG_KEYS), true, true),
  ibis: withCore(presetTools(IBIS_KEYS), true, true),
  sai: withCore(presetTools(SAI_KEYS), true, true),
  firealpaca: withCore(presetTools(FIREALPACA_KEYS), true, true),
};

export interface GnumarusShortcutStore {
  preset: GnumarusShortcutPresetId;
  overrides: Record<string, GnumarusShortcutKeyboard>;
}

export function defaultShortcutStore(): GnumarusShortcutStore {
  return { preset: "gnumarus", overrides: {} };
}

function isPresetId(value: unknown): value is GnumarusShortcutPresetId {
  return (
    value === "gnumarus" ||
    value === "photoshop" ||
    value === "krita" ||
    value === "gimp" ||
    value === "mypaint" ||
    value === "aseprite" ||
    value === "procreate" ||
    value === "medibang" ||
    value === "ibis" ||
    value === "sai" ||
    value === "firealpaca"
  );
}

function isKeyboardRecord(value: unknown): value is GnumarusShortcutKeyboard {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const rec = value as Record<string, unknown>;
  return (
    typeof rec["ctrl"] === "boolean" &&
    typeof rec["alt"] === "boolean" &&
    typeof rec["shift"] === "boolean" &&
    typeof rec["super"] === "boolean" &&
    typeof rec["space"] === "boolean" &&
    typeof rec["key"] === "string"
  );
}

export function parseShortcutStore(jsonText: string): GnumarusShortcutStore {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText) as unknown;
  } catch {
    throw new Error("shortcuts are not valid JSON");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("shortcuts root must be an object");
  }
  const rec = parsed as Record<string, unknown>;
  const presetRaw = rec["preset"];
  const preset = isPresetId(presetRaw) ? presetRaw : "gnumarus";
  const overridesRaw = rec["overrides"];
  const overrides: Record<string, GnumarusShortcutKeyboard> = {};
  if (typeof overridesRaw === "object" && overridesRaw !== null && !Array.isArray(overridesRaw)) {
    for (const [id, value] of Object.entries(overridesRaw as Record<string, unknown>)) {
      if (!isKeyboardRecord(value)) {
        continue;
      }
      overrides[id] = {
        ctrl: value.ctrl,
        alt: value.alt,
        shift: value.shift,
        super: value.super,
        space: value.space,
        key: normalizeShortcutKey(value.key),
      };
    }
  }
  // Migration (v1 pencil->brush rename): keep pre-rename custom bindings.
  if ("tool-pencil" in overrides && !("tool-brush" in overrides)) {
    overrides["tool-brush"] = overrides["tool-pencil"];
  }
  delete overrides["tool-pencil"];
  return { preset, overrides };
}

export function serializeShortcutStore(store: GnumarusShortcutStore): string {
  return JSON.stringify({ preset: store.preset, overrides: store.overrides }, null, 2);
}

export function loadShortcutStore(): GnumarusShortcutStore {
  try {
    const raw = window.localStorage.getItem(GNUMARUS_SHORTCUTS_STORAGE_KEY);
    if (raw === null) {
      return defaultShortcutStore();
    }
    return parseShortcutStore(raw);
  } catch {
    return defaultShortcutStore();
  }
}

export function saveShortcutStore(store: GnumarusShortcutStore): void {
  try {
    window.localStorage.setItem(GNUMARUS_SHORTCUTS_STORAGE_KEY, serializeShortcutStore(store));
  } catch {
    // Storage may be unavailable (private mode): shortcuts still work in memory.
  }
}

/** Apply a preset: replace every overridden keyboard part with the preset map. */
export function applyShortcutPreset(preset: GnumarusShortcutPresetId): Record<string, GnumarusShortcutKeyboard> {
  const base = GNUMARUS_SHORTCUT_PRESET_OVERRIDES[preset] ?? {};
  const out: Record<string, GnumarusShortcutKeyboard> = {};
  for (const [id, kb] of Object.entries(base)) {
    out[id] = { ...kb };
  }
  return out;
}
