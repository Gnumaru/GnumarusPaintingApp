import { describe, expect, it } from "vitest";
import {
  clampZoom,
  imageToScreenPixel,
  layerImageToProject,
  layerLinearMatrix,
  layerMatrixDeterminant,
  layerPixelToScreen,
  layerRotate3,
  normalizeRotation,
  projectToLayerImageFloat,
  projectToLayerPixel,
  rotatedBounds,
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
    const layer: GnumarusLayerTransform = { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 };
    const screen = layerPixelToScreen(0, 0, RECT, 8, 8, PLAIN, layer);
    expect(screen.x).toBeCloseTo(200 - 3.5 * 4, 6);
    expect(screen.y).toBeCloseTo(150 - 3.5 * 4, 6);
    expect(projectToLayerPixel(1000, 1000, 8, 8, layer)).toBeNull();
  });

  it("shifts layers by their offset", () => {
    const centered: GnumarusLayerTransform = { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 };
    const shifted: GnumarusLayerTransform = { x: 10, y: -5, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 };
    const a = layerPixelToScreen(4, 4, RECT, 8, 8, PLAIN, centered);
    const b = layerPixelToScreen(4, 4, RECT, 8, 8, PLAIN, shifted);
    expect(b.x - a.x).toBeCloseTo(40, 6);
    expect(b.y - a.y).toBeCloseTo(-20, 6);
  });

  it("round-trips pixels through layer rotation and flips", () => {
    const view: GnumarusViewTransform = { ...PLAIN, rotation: Math.PI / 6 };
    const layers: GnumarusLayerTransform[] = [
      { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
      { x: 20, y: -13, rotation: Math.PI / 3, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
      { x: -40, y: 30, rotation: -Math.PI / 2, flipX: true, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
      { x: 5, y: 5, rotation: Math.PI, flipX: true, flipY: true, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
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

  it("computes rotated bboxes for fit zoom", () => {
    expect(rotatedBounds(64, 64, 0)).toEqual({ width: 64, height: 64 });
    const quarter = rotatedBounds(64, 32, Math.PI / 2);
    expect(quarter.width).toBeCloseTo(32, 10);
    expect(quarter.height).toBeCloseTo(64, 10);
    const diagonal = rotatedBounds(64, 64, Math.PI / 4);
    expect(diagonal.width).toBeCloseTo(64 * Math.SQRT2, 8);
    expect(diagonal.height).toBeCloseTo(64 * Math.SQRT2, 8);
    // Sign of rotation does not matter for the bbox.
    expect(rotatedBounds(64, 32, -Math.PI / 2)).toEqual(quarter);
  });

  it("scales layer images about the layer center", () => {
    const scaled: GnumarusLayerTransform = {
      x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 2, scaleY: 3, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0,
    };
    // Layer is 4x4: image (0,0) sits 2 left / 2 up from center, doubled/tripled.
    expect(layerImageToProject(0, 0, 4, 4, scaled)).toEqual({ x: -4, y: -6 });
    expect(layerImageToProject(4, 4, 4, 4, scaled)).toEqual({ x: 4, y: 6 });
    expect(layerImageToProject(2, 2, 4, 4, scaled)).toEqual({ x: 0, y: 0 });
    expect(layerMatrixDeterminant(scaled)).toBeCloseTo(6, 12);
  });

  it("shears layer images proportional to the cross-axis offset", () => {
    const skewed: GnumarusLayerTransform = {
      x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 1, skewY: 0, rotationX: 0, rotationY: 0,
    };
    // Center column stays, top row shifts left, bottom row shifts right.
    expect(layerImageToProject(2, 2, 4, 4, skewed)).toEqual({ x: 0, y: 0 });
    expect(layerImageToProject(0, 0, 4, 4, skewed).x).toBeCloseTo(-4, 9);
    expect(layerImageToProject(4, 4, 4, 4, skewed).x).toBeCloseTo(4, 9);
    expect(layerMatrixDeterminant(skewed)).toBeCloseTo(1, 12);
  });

  it("round-trips floats through scale, skew and flips", () => {
    const placed: GnumarusLayerTransform = {
      x: 7, y: -3, rotation: 0.7, flipX: true, flipY: false,
      scaleX: 1.5, scaleY: 0.8, skewX: 0.3, skewY: -0.2, rotationX: 0.4, rotationY: -0.3,
    };
    for (const [ix, iy] of [[0, 0], [8, 0], [4, 4], [8, 8], [2.5, 6.25]]) {
      const project = layerImageToProject(ix, iy, 8, 8, placed);
      const back = projectToLayerImageFloat(project.x, project.y, 8, 8, placed);
      expect(back?.x).toBeCloseTo(ix, 9);
      expect(back?.y).toBeCloseTo(iy, 9);
    }
    expect(layerLinearMatrix({
      x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0,
    })).toEqual({ a: 1, b: 0, c: 0, d: 1 });
  });

  it("reports degenerate layer shear as null", () => {
    const degenerate: GnumarusLayerTransform = {
      x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 1, skewY: 1, rotationX: 0, rotationY: 0,
    };
    expect(layerMatrixDeterminant(degenerate)).toBeCloseTo(0, 12);
    expect(projectToLayerImageFloat(0, 0, 8, 8, degenerate)).toBeNull();
    expect(projectToLayerPixel(0, 0, 8, 8, degenerate)).toBeNull();
  });

  it("tilts layer images toward the viewer on the dragged side", () => {
    const tiltX: GnumarusLayerTransform = {
      x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0,
      rotationX: Math.PI / 6, rotationY: 0,
    };
    // Top-middle foreshortens by cos(30deg); the layer normal tips up.
    const top = layerImageToProject(2, 0, 4, 4, tiltX);
    expect(top.x).toBeCloseTo(0, 9);
    expect(top.y).toBeCloseTo(-2 * Math.cos(Math.PI / 6), 9);
    const tiltY: GnumarusLayerTransform = { ...tiltX, rotationX: 0, rotationY: Math.PI / 6 };
    const right = layerImageToProject(4, 2, 4, 4, tiltY);
    expect(right.x).toBeCloseTo(2 * Math.cos(Math.PI / 6), 9);
    expect(right.y).toBeCloseTo(0, 9);
    expect(layerMatrixDeterminant(tiltX)).toBeCloseTo(Math.cos(Math.PI / 6), 12);
  });

  it("round-trips floats through tilt combined with spin", () => {
    const tilted: GnumarusLayerTransform = {
      x: 3, y: -2, rotation: 0.5, flipX: false, flipY: true,
      scaleX: 1.2, scaleY: 0.9, skewX: 0.1, skewY: 0.2, rotationX: 0.4, rotationY: -0.3,
    };
    for (const [ix, iy] of [[0, 0], [8, 0], [4, 4], [8, 8], [2.5, 6.25]]) {
      const project = layerImageToProject(ix, iy, 8, 8, tilted);
      const back = projectToLayerImageFloat(project.x, project.y, 8, 8, tilted);
      expect(back?.x).toBeCloseTo(ix, 9);
      expect(back?.y).toBeCloseTo(iy, 9);
    }
  });

  it("reports edge-on tilt as null", () => {
    const edgeOn: GnumarusLayerTransform = {
      x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0,
      rotationX: Math.PI / 2, rotationY: 0,
    };
    expect(layerMatrixDeterminant(edgeOn)).toBeCloseTo(0, 12);
    expect(projectToLayerImageFloat(0, 0, 8, 8, edgeOn)).toBeNull();
    expect(projectToLayerPixel(4, 4, 8, 8, edgeOn)).toBeNull();
  });

  it("tips the dragged side toward the viewer (trackball convention)", () => {
    // Negative RY (right drags): left point (-1,0,0) gets positive z.
    const tiltY = layerRotate3({ rotation: 0, rotationX: 0, rotationY: -0.3 });
    const leftZ = tiltY[2][0] * -1 + tiltY[2][1] * 0 + tiltY[2][2] * 0;
    expect(leftZ).toBeCloseTo(-Math.sin(-0.3), 12);
    expect(leftZ).toBeGreaterThan(0);
    // Positive RX (down drags): top point (0,-1,0) gets positive z.
    const tiltX = layerRotate3({ rotation: 0, rotationX: 0.3, rotationY: 0 });
    const topZ = tiltX[2][0] * 0 + tiltX[2][1] * -1 + tiltX[2][2] * 0;
    expect(topZ).toBeCloseTo(Math.sin(0.3), 12);
    expect(topZ).toBeGreaterThan(0);
  });
});
