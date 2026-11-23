import { describe, expect, it } from "vitest";
import {
  DEFAULT_PLAYBACK_SETTINGS,
  parseAllowChangesWhilePlaying,
  parsePlaybackSettings,
  serializePlaybackSettings,
} from "../src/settings/GnumarusPlaybackSettings";
import {
  DEFAULT_SHEET_PACK_SETTINGS,
  parseSheetPackSettings,
  parseWideSpritesheetPacks,
  serializeSheetPackSettings,
} from "../src/settings/GnumarusSheetPackSettings";

describe("playback settings", () => {
  it("defaults to locked edits while playing", () => {
    expect(DEFAULT_PLAYBACK_SETTINGS).toEqual({ allowChangesWhilePlaying: false });
    expect(parseAllowChangesWhilePlaying(undefined)).toBe(false);
    expect(parseAllowChangesWhilePlaying("yes")).toBe(false);
    expect(parseAllowChangesWhilePlaying(true)).toBe(true);
  });

  it("round-trips through storage", () => {
    expect(parsePlaybackSettings(serializePlaybackSettings({ allowChangesWhilePlaying: true }))).toEqual({
      allowChangesWhilePlaying: true,
    });
    expect(parsePlaybackSettings("{}")).toEqual({ allowChangesWhilePlaying: false });
    expect(() => parsePlaybackSettings("nope")).toThrow();
    expect(() => parsePlaybackSettings("[1]")).toThrow();
  });
});

describe("sheet pack settings", () => {
  it("defaults to wide packs", () => {
    expect(DEFAULT_SHEET_PACK_SETTINGS).toEqual({ wideSpritesheetPacks: true });
    expect(parseWideSpritesheetPacks(undefined)).toBe(true);
    expect(parseWideSpritesheetPacks(false)).toBe(false);
    expect(parseWideSpritesheetPacks(true)).toBe(true);
  });

  it("round-trips through storage", () => {
    expect(parseSheetPackSettings(serializeSheetPackSettings({ wideSpritesheetPacks: false }))).toEqual({
      wideSpritesheetPacks: false,
    });
    expect(parseSheetPackSettings("{}")).toEqual({ wideSpritesheetPacks: true });
    expect(() => parseSheetPackSettings("nope")).toThrow();
  });
});
