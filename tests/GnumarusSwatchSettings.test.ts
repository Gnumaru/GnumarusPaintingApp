import { describe, expect, it } from "vitest";
import {
  GNUMARUS_MAX_RECENT_COLORS,
  GNUMARUS_MAX_SWATCHES,
  normalizeSwatchHex,
  parseSwatchSettings,
  serializeSwatchSettings,
} from "../src/settings/GnumarusSwatchSettings";

describe("GnumarusSwatchSettings", () => {
  it("round-trips swatches and recents", () => {
    const settings = { swatches: ["#ff0000", "#00ff00ff"], recent: ["#0000ff"] };
    expect(parseSwatchSettings(serializeSwatchSettings(settings))).toEqual(settings);
  });

  it("drops invalid entries and caps the lists", () => {
    const parsed = parseSwatchSettings(
      JSON.stringify({
        swatches: ["#ff0000", "nope", "#ff0000", 42, "#gggggg", "#00ff00"],
        recent: ["#zzz", "#123456"],
      }),
    );
    expect(parsed).toEqual({ swatches: ["#ff0000", "#00ff00"], recent: ["#123456"] });
    expect(normalizeSwatchHex("#ABCDEF")).toBe("#abcdef");
    expect(normalizeSwatchHex("red")).toBeNull();
  });

  it("caps long lists and rejects garbage", () => {
    const many = Array.from({ length: GNUMARUS_MAX_SWATCHES + 10 }, (_v, i) => `#${i.toString(16).padStart(6, "0")}`);
    const parsed = parseSwatchSettings(JSON.stringify({ swatches: many, recent: many }));
    expect(parsed.swatches).toHaveLength(GNUMARUS_MAX_SWATCHES);
    expect(parsed.recent).toHaveLength(GNUMARUS_MAX_RECENT_COLORS);
    expect(() => parseSwatchSettings("nope")).toThrow();
    expect(() => parseSwatchSettings("[]")).toThrow();
  });
});
