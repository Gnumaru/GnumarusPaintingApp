import { describe, expect, it } from "vitest";
import { GRID_FRAGMENT_SHADER } from "../src/canvas/GnumarusCanvasEngine";

describe("GnumarusPixelGridShader", () => {
  it("uses highp precision for stable interpolation", () => {
    expect(GRID_FRAGMENT_SHADER).toContain("highp");
    expect(GRID_FRAGMENT_SHADER).not.toMatch(/precision\s+mediump/);
  });

  it("uses screen-space derivatives for uniform 1px lines", () => {
    expect(GRID_FRAGMENT_SHADER).toContain("fwidth");
    expect(GRID_FRAGMENT_SHADER).not.toContain("uZoom");
    expect(GRID_FRAGMENT_SHADER).not.toContain("halfW");
    expect(GRID_FRAGMENT_SHADER).toContain("uLayerW");
    expect(GRID_FRAGMENT_SHADER).toContain("uLayerH");
  });

  it("scales line alpha by the opacity uniform", () => {
    expect(GRID_FRAGMENT_SHADER).toContain("uOpacity");
    expect(GRID_FRAGMENT_SHADER).toContain("line * 0.45 * uOpacity");
  });
});
