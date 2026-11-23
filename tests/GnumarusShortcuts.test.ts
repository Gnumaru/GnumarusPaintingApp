import { describe, expect, test } from "vitest";
import {
  GNUMARUS_DEFAULT_SHORTCUTS,
  applyShortcutPreset,
  findShortcutConflicts,
  normalizeShortcutKey,
  parseShortcutStore,
  resolveEffectiveShortcuts,
  shortcutMatchesEvent,
  shortcutToString,
  type GnumarusShortcutKeyboard,
} from "../src/settings/GnumarusShortcuts";

function kb(partial: Partial<GnumarusShortcutKeyboard> & { key: string }): GnumarusShortcutKeyboard {
  return {
    ctrl: partial.ctrl ?? false,
    alt: partial.alt ?? false,
    shift: partial.shift ?? false,
    super: partial.super ?? false,
    space: partial.space ?? false,
    key: partial.key,
  };
}

function keyEvent(init: Partial<KeyboardEvent> & { key: string; code?: string }): KeyboardEvent {
  return {
    key: init.key,
    code: init.code ?? "",
    ctrlKey: init.ctrlKey ?? false,
    altKey: init.altKey ?? false,
    shiftKey: init.shiftKey ?? false,
    metaKey: init.metaKey ?? false,
  } as KeyboardEvent;
}

describe("GnumarusShortcuts", () => {
  test("factory defaults have no conflicts", () => {
    const effective = resolveEffectiveShortcuts({});
    const conflicts = findShortcutConflicts(effective);
    expect([...conflicts]).toEqual([]);
  });

  test("duplicate keyboards conflict unless overlap-allowed", () => {
    const effective = resolveEffectiveShortcuts({
      "tool-brush": kb({ key: "b" }),
      "tool-bucket": kb({ key: "b" }),
    });
    const conflicts = findShortcutConflicts(effective);
    expect(conflicts.has("tool-brush")).toBe(true);
    expect(conflicts.has("tool-bucket")).toBe(true);
  });

  test("unbound entries never conflict", () => {
    const effective = resolveEffectiveShortcuts({
      "file-new": kb({ key: "" }),
      "file-open": kb({ key: "" }),
    });
    expect([...findShortcutConflicts(effective)]).toEqual([]);
  });

  test("display strings match the requested examples", () => {
    expect(shortcutToString(kb({ key: "f" }), "")).toBe("F");
    expect(
      shortcutToString(kb({ key: "r", ctrl: true, alt: true, shift: true, super: true, space: true }), ""),
    ).toBe("ctrl+alt+shift+super+space+R");
    expect(shortcutToString(kb({ key: "", shift: true, space: true }), "left-drag")).toBe(
      "shift+space+left-drag",
    );
  });

  test("matcher respects ctrl/cmd parity and space", () => {
    expect(shortcutMatchesEvent(keyEvent({ key: "s", ctrlKey: true }), false, kb({ key: "s", ctrl: true }))).toBe(true);
    expect(shortcutMatchesEvent(keyEvent({ key: "s", metaKey: true }), false, kb({ key: "s", ctrl: true }))).toBe(true);
    expect(shortcutMatchesEvent(keyEvent({ key: "s" }), false, kb({ key: "s", ctrl: true }))).toBe(false);
    expect(shortcutMatchesEvent(keyEvent({ key: "m", shiftKey: true }), false, kb({ key: "m", shift: true }))).toBe(true);
    expect(shortcutMatchesEvent(keyEvent({ key: "m" }), false, kb({ key: "m", shift: true }))).toBe(false);
  });

  test("normalize accepts Return/Esc aliases", () => {
    expect(normalizeShortcutKey("Return")).toBe("Enter");
    expect(normalizeShortcutKey("esc")).toBe("Escape");
    expect(normalizeShortcutKey("F")).toBe("f");
  });

  test("all presets resolve without crashing", () => {
    for (const preset of [
      "gnumarus",
      "photoshop",
      "krita",
      "gimp",
      "mypaint",
      "aseprite",
      "procreate",
      "medibang",
      "ibis",
      "sai",
      "firealpaca",
    ] as const) {
      const overrides = applyShortcutPreset(preset);
      const effective = resolveEffectiveShortcuts(overrides);
      expect(Object.keys(effective).length).toBeGreaterThan(50);
    }
  });

  test("defaults define every documented id once", () => {
    const ids = GNUMARUS_DEFAULT_SHORTCUTS.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("pre-rename tool-pencil overrides migrate to tool-brush", () => {
    const store = parseShortcutStore(
      JSON.stringify({ preset: "gnumarus", overrides: { "tool-pencil": kb({ key: "x" }) } }),
    );
    expect(store.overrides["tool-brush"]).toEqual(kb({ key: "x" }));
    expect("tool-pencil" in store.overrides).toBe(false);
  });
});
