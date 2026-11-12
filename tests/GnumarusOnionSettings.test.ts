import { describe, expect, it } from "vitest";
import {
  DEFAULT_ONION_SETTINGS,
  GNUMARUS_MAX_ONION_FRAMES,
  parseOnionSettings,
  serializeOnionSettings,
} from "../src/settings/GnumarusOnionSettings";

describe("GnumarusOnionSettings", () => {
  it("round-trips valid settings", () => {
    const settings = { enabled: true, past: 3, future: 0, tint: false };
    expect(parseOnionSettings(serializeOnionSettings(settings))).toEqual(settings);
  });

  it("clamps counts and falls back on garbage", () => {
    expect(parseOnionSettings("{}")).toEqual(DEFAULT_ONION_SETTINGS);
    const clamped = parseOnionSettings(JSON.stringify({ enabled: true, past: 99, future: -2 }));
    expect(clamped.past).toBe(GNUMARUS_MAX_ONION_FRAMES);
    expect(clamped.future).toBe(0);
    expect(clamped.enabled).toBe(true);
    expect(() => parseOnionSettings("nope")).toThrow();
    expect(() => parseOnionSettings("[]")).toThrow();
  });
});
