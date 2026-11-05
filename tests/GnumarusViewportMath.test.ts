import { describe, expect, it } from "vitest";
import {
  clampZoom,
  imageToScreenPixel,
  layerPixelToScreen,
  normalizeRotation,
  projectToLayerPixel,
  screenToImagePixel,
  screenToLayerPixel,
  type GnumarusLayerTransform,
  type GnumarusViewTransform,
} from "../src/canvas/GnumarusViewportMath";

const RECT = { left: 0, top: 0, width: 400, height: 300 };
const PLAIN: GnumarusViewTransform = {
  zoom: 4,
  panX: 0,
  panY: 0,
  rotation: 0,
  flipX: false,
  flipY: false,
};

describe("GnumarusViewportMath", () => {
  it("maps the container center to the image center", () => {
    const pixel = screenToImagePixel(200, 150, RECT, 64, 64, PLAIN);
    expect(pixel).toEqual({ x: 32, y: 32 });
  });

  it("returns null outside the image", () => {
    const pixel = screenToImagePixel(5, 5, RECT, 64, 64, PLAIN);
    expect(pixel).toBeNull();
  });

  it("clamps zoom to a sane range", () => {
    expect(clampZoom(1000)).toBe(64);
    expect(clampZoom(-3)).toBe(0.5);
    expect(clampZoom(Number.NaN)).toBe(1);
  });

  it("normalizes rotation to (-PI, PI]", () => {
    expect(normalizeRotation(Math.PI * 3)).toBeCloseTo(Math.PI, 10);
    expect(normalizeRotation(-Math.PI)).toBeCloseTo(Math.PI, 10);
    expect(normalizeRotation(0.5)).toBeCloseTo(0.5, 10);
  });

  it("round-trips pixels through rotation and flips", () => {
    const transforms: GnumarusViewTransform[] = [
      PLAIN,
      { ...PLAIN, rotation: Math.PI / 2 },
      { ...PLAIN, rotation: -Math.PI / 4, panX: 37, panY: -23 },
      { ...PLAIN, rotation: Math.PI, flipX: true },
      { ...PLAIN, flipX: true, flipY: true, zoom: 7.5 },
      { ...PLAIN, rotation: 2.3, flipX: true, panX: -120, panY: 88, zoom: 1 },
    ];
    for (const view of transforms) {
      for (const [ix, iy] of [
        [0, 0],
        [63, 0],
        [0, 63],
        [63, 63],
        [32, 32],
        [7, 51],
      ]) {
        const screen = imageToScreenPixel(ix, iy, RECT, 64, 64, view);
        const back = screenToImagePixel(screen.x, screen.y, RECT, 64, 64, view);
        expect(back, `view=${JSON.stringify(view)} pixel=${ix},${iy}`).toEqual({ x: ix, y: iy });
      }
    }
  });

  it("rotates the image clockwise on screen", () => {
    // Buffer right-middle pixel with a +90deg (clockwise) view rotation
    // must appear at the bottom-middle of the image on screen.
    const view: GnumarusViewTransform = { ...PLAIN, rotation: Math.PI / 2 };
    const screen = imageToScreenPixel(63, 32, RECT, 64, 64, view);
    expect(screen.x).toBeCloseTo(200 - 2, 6);
    expect(screen.y).toBeCloseTo(150 + 126, 6);
  });

  it("mirrors the image with flipX", () => {
    const view: GnumarusViewTransform = { ...PLAIN, flipX: true };
    const right = imageToScreenPixel(63, 32, RECT, 64, 64, view);
    const left = imageToScreenPixel(0, 32, RECT, 64, 64, view);
    expect(right.x).toBeLessThan(200);
    expect(left.x).toBeGreaterThan(200);
  });

  it("maps small offset layers", () => {
    const layer: GnumarusLayerTransform = { x: 0, y: 0, rotation: 0, flipX: false, flipY: false };
    const screen = layerPixelToScreen(0, 0, RECT, 8, 8, PLAIN, layer);
    expect(screen.x).toBeCloseTo(200 - 3.5 * 4, 6);
    expect(screen.y).toBeCloseTo(150 - 3.5 * 4, 6);
    expect(projectToLayerPixel(1000, 1000, 8, 8, layer)).toBeNull();
  });

  it("shifts layers by their offset", () => {
    const centered: GnumarusLayerTransform = { x: 0, y: 0, rotation: 0, flipX: false, flipY: false };
    const shifted: GnumarusLayerTransform = { x: 10, y: -5, rotation: 0, flipX: false, flipY: false };
    const a = layerPixelToScreen(4, 4, RECT, 8, 8, PLAIN, centered);
    const b = layerPixelToScreen(4, 4, RECT, 8, 8, PLAIN, shifted);
    expect(b.x - a.x).toBeCloseTo(40, 6);
    expect(b.y - a.y).toBeCloseTo(-20, 6);
  });

  it("round-trips pixels through layer rotation and flips", () => {
    const view: GnumarusViewTransform = { ...PLAIN, rotation: Math.PI / 6 };
    const layers: GnumarusLayerTransform[] = [
      { x: 0, y: 0, rotation: 0, flipX: false, flipY: false },
      { x: 20, y: -13, rotation: Math.PI / 3, flipX: false, flipY: false },
      { x: -40, y: 30, rotation: -Math.PI / 2, flipX: true, flipY: false },
      { x: 5, y: 5, rotation: Math.PI, flipX: true, flipY: true },
    ];
    for (const layer of layers) {
      for (const [ix, iy] of [
        [0, 0],
        [7, 0],
        [0, 7],
        [7, 7],
        [3, 5],
      ]) {
        const screen = layerPixelToScreen(ix, iy, RECT, 8, 8, view, layer);
        const back = screenToLayerPixel(screen.x, screen.y, RECT, 8, 8, view, layer);
        expect(back, `view-rot layer=${JSON.stringify(layer)} pixel=${ix},${iy}`).toEqual({ x: ix, y: iy });
      }
    }
  });
});
