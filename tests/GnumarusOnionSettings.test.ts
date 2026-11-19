import { describe, expect, it } from "vitest";
import {
  DEFAULT_ONION_SETTINGS,
  GNUMARUS_MAX_ONION_CACHE_FRAMES,
  GNUMARUS_MAX_ONION_FRAMES,
  parseOnionSettings,
  serializeOnionSettings,
} from "../src/settings/GnumarusOnionSettings";

describe("GnumarusOnionSettings", () => {
  it("round-trips valid settings", () => {
    const settings = { enabled: true, past: 3, future: 0, tint: false, resolutionScale: 0.5, cacheFrames: 4 };
    expect(parseOnionSettings(serializeOnionSettings(settings))).toEqual(settings);
  });

  it("clamps the new cache settings and fills defaults", () => {
    const parsed = parseOnionSettings(JSON.stringify({ enabled: true }));
    expect(parsed.resolutionScale).toBe(DEFAULT_ONION_SETTINGS.resolutionScale);
    expect(parsed.cacheFrames).toBe(DEFAULT_ONION_SETTINGS.cacheFrames);
    expect(parseOnionSettings(JSON.stringify({ resolutionScale: 0 })).resolutionScale).toBe(
      DEFAULT_ONION_SETTINGS.resolutionScale,
    );
    expect(parseOnionSettings(JSON.stringify({ resolutionScale: 2 })).resolutionScale).toBe(1);
    expect(parseOnionSettings(JSON.stringify({ resolutionScale: 0.05 })).resolutionScale).toBeCloseTo(0.1);
    expect(parseOnionSettings(JSON.stringify({ cacheFrames: -1 })).cacheFrames).toBe(0);
    expect(parseOnionSettings(JSON.stringify({ cacheFrames: 10000 })).cacheFrames).toBe(
      GNUMARUS_MAX_ONION_CACHE_FRAMES,
    );
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
