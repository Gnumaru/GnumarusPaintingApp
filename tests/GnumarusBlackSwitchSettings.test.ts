import { describe, expect, it } from "vitest";
import {
  BLACK_SWITCH_SETTINGS_STORAGE_KEY,
  DEFAULT_BLACK_SWITCH_SETTINGS,
  GnumarusBlackSwitchSettingsError,
  parseBlackSwitch,
  parseBlackSwitchSettings,
  serializeBlackSwitchSettings,
} from "../src/settings/GnumarusBlackSwitchSettings";

describe("GnumarusBlackSwitchSettings", () => {
  it("defaults to switching out of black", () => {
    expect(DEFAULT_BLACK_SWITCH_SETTINGS).toEqual({ switchOutOfBlack: true });
    expect(BLACK_SWITCH_SETTINGS_STORAGE_KEY).toBe("gnumarus.settings.blackSwitch.v1");
  });

  it("only an explicit false disables the switch", () => {
    expect(parseBlackSwitch(false)).toBe(false);
    expect(parseBlackSwitch(true)).toBe(true);
    expect(parseBlackSwitch(undefined)).toBe(true);
    expect(parseBlackSwitch(null)).toBe(true);
    expect(parseBlackSwitch(0)).toBe(true);
    expect(parseBlackSwitch("false")).toBe(true);
  });

  it("round-trips settings", () => {
    expect(parseBlackSwitchSettings(serializeBlackSwitchSettings({ switchOutOfBlack: false }))).toEqual({
      switchOutOfBlack: false,
    });
    expect(parseBlackSwitchSettings(serializeBlackSwitchSettings(DEFAULT_BLACK_SWITCH_SETTINGS))).toEqual(
      DEFAULT_BLACK_SWITCH_SETTINGS,
    );
  });

  it("rejects invalid settings", () => {
    expect(() => parseBlackSwitchSettings("not json")).toThrow(GnumarusBlackSwitchSettingsError);
    expect(() => parseBlackSwitchSettings("[1,2]")).toThrow(GnumarusBlackSwitchSettingsError);
    expect(parseBlackSwitchSettings("{}")).toEqual({ switchOutOfBlack: true });
  });
});
