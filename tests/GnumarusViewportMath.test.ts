import { describe, expect, it } from "vitest";
import { clampZoom, screenToImagePixel } from "../src/canvas/GnumarusViewportMath";

describe("GnumarusViewportMath", () => {
  it("maps the container center to the image center", () => {
    const pixel = screenToImagePixel(
      200,
      150,
      { left: 0, top: 0, width: 400, height: 300 },
      64,
      64,
      { zoom: 4, panX: 0, panY: 0 },
    );
    expect(pixel).toEqual({ x: 32, y: 32 });
  });

  it("returns null outside the image", () => {
    const pixel = screenToImagePixel(
      5,
      5,
      { left: 0, top: 0, width: 400, height: 300 },
      64,
      64,
      { zoom: 4, panX: 0, panY: 0 },
    );
    expect(pixel).toBeNull();
  });

  it("clamps zoom to a sane range", () => {
    expect(clampZoom(1000)).toBe(64);
    expect(clampZoom(-3)).toBe(0.5);
    expect(clampZoom(Number.NaN)).toBe(1);
  });
});
