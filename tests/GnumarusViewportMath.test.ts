import { describe, expect, it } from "vitest";
import {
  backgroundUnionForWrap,
  canvasResizeTextureBox,
  canvasVisibleTextureBox,
  clampCropBoxToMin1,
  clampZoom,
  clipSegmentToRect,
  constrainSquareDrag,
  growTextureBoxForPlacement,
  hitGrowBoxHandles,
  hitQuadHandles,
  normalizeGrowBox,
  snapCropBox,
  imageToScreenPixel,
  layerImageToProject,
  layerLinearMatrix,
  layerMatrixDeterminant,
  layerPixelCenterToProject,
  layerPixelToScreen,
  layerRotate3,
  normalizeRotation,
  orbitPanForRotation,
  parseWrapMode,
  proportionalResizeScale,
  wrapLayerPixel,
  wrapTileOffsets,
  wrapTileShift,
  projectToLayerImageFloat,
  projectToLayerPixel,
  rotatedBounds,
  scrollIntoViewDelta,
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

describe("GnumarusViewportMath", () => {  it("maps the container center to the image center", () => {
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

  it("grows textures to fit transformed selections", () => {
    // A centered 100x100 square rotated 45 degrees spans the diagonal.
    const h = 50 * Math.SQRT2;
    expect(growTextureBoxForPlacement(100, 100, { minX: 50 - h, minY: 50 - h, maxX: 50 + h, maxY: 50 + h }, 4096)).toEqual({
      left: -21,
      top: -21,
      width: 142,
      height: 142,
    });
    // Content inside the texture needs no growth.
    expect(growTextureBoxForPlacement(100, 100, { minX: 10, minY: 10, maxX: 90, maxY: 90 }, 4096)).toBeNull();
    expect(growTextureBoxForPlacement(100, 100, { minX: 0, minY: 0, maxX: 100, maxY: 100 }, 4096)).toBeNull();
    // Overflow on one side grows only that side.
    expect(growTextureBoxForPlacement(100, 100, { minX: 0, minY: 0, maxX: 120, maxY: 110 }, 4096)).toEqual({
      left: 0,
      top: 0,
      width: 120,
      height: 110,
    });
    // Negative origins use whole pixels outward.
    expect(growTextureBoxForPlacement(100, 100, { minX: -5.5, minY: 10, maxX: 50, maxY: 50 }, 4096)).toEqual({
      left: -6,
      top: 0,
      width: 106,
      height: 100,
    });
    // Over the cap: fall back to a clipped in-place merge.
    expect(growTextureBoxForPlacement(100, 100, { minX: -5000, minY: 0, maxX: 100, maxY: 100 }, 4096)).toBeNull();
    expect(growTextureBoxForPlacement(10, 10, { minX: -1, minY: -1, maxX: 11, maxY: 11 }, 11)).toBeNull();
    // Invalid inputs never grow.
    expect(growTextureBoxForPlacement(0, 100, { minX: -1, minY: 0, maxX: 10, maxY: 10 }, 4096)).toBeNull();
    expect(growTextureBoxForPlacement(100, 100, { minX: Number.NaN, minY: 0, maxX: 10, maxY: 10 }, 4096)).toBeNull();
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

  it("canvasVisibleTextureBox keeps the full texture when it fills the canvas", () => {
    const identity: GnumarusLayerTransform = {
      x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1,
      skewX: 0, skewY: 0, rotationX: 0, rotationY: 0,
    };
    expect(canvasVisibleTextureBox(64, 64, 64, 64, identity)).toEqual({ left: 0, top: 0, width: 64, height: 64 });
  });

  it("canvasVisibleTextureBox crops offset excess", () => {
    // 64x64 texture shifted 32px left and up: first 32 rows/columns drop out.
    const shifted: GnumarusLayerTransform = {
      x: -32, y: -32, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1,
      skewX: 0, skewY: 0, rotationX: 0, rotationY: 0,
    };
    expect(canvasVisibleTextureBox(64, 64, 64, 64, shifted)).toEqual({ left: 32, top: 32, width: 32, height: 32 });
    const rightDown: GnumarusLayerTransform = { ...shifted, x: 16, y: 8 };
    expect(canvasVisibleTextureBox(64, 64, 64, 64, rightDown)).toEqual({ left: 0, top: 0, width: 48, height: 56 });
  });

  it("canvasVisibleTextureBox mirrors the box for flipped content", () => {
    // Same shift as above but mirrored: the visible 32 columns are the left ones.
    const flipped: GnumarusLayerTransform = {
      x: -32, y: -32, rotation: 0, flipX: true, flipY: false, scaleX: 1, scaleY: 1,
      skewX: 0, skewY: 0, rotationX: 0, rotationY: 0,
    };
    expect(canvasVisibleTextureBox(64, 64, 64, 64, flipped)).toEqual({ left: 0, top: 32, width: 32, height: 32 });
  });

  it("canvasVisibleTextureBox covers centered rotations fully", () => {
    const spun: GnumarusLayerTransform = {
      x: 0, y: 0, rotation: Math.PI / 2, flipX: false, flipY: false, scaleX: 1, scaleY: 1,
      skewX: 0, skewY: 0, rotationX: 0, rotationY: 0,
    };
    expect(canvasVisibleTextureBox(64, 64, 64, 64, spun)).toEqual({ left: 0, top: 0, width: 64, height: 64 });
  });

  it("canvasVisibleTextureBox returns null outside the canvas or when degenerate", () => {
    const away: GnumarusLayerTransform = {
      x: 100, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1,
      skewX: 0, skewY: 0, rotationX: 0, rotationY: 0,
    };
    expect(canvasVisibleTextureBox(64, 64, 64, 64, away)).toBeNull();
    const edgeOn: GnumarusLayerTransform = {
      x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1,
      skewX: 0, skewY: 0, rotationX: Math.PI / 2, rotationY: 0,
    };
    expect(canvasVisibleTextureBox(64, 64, 64, 64, edgeOn)).toBeNull();
  });

  it("canvasResizeTextureBox crops excess and pads to cover the canvas", () => {
    // 64x64 texture shifted 32px left and up: drop [0,32), pad 32 right/bottom.
    const shifted: GnumarusLayerTransform = {
      x: -32, y: -32, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1,
      skewX: 0, skewY: 0, rotationX: 0, rotationY: 0,
    };
    expect(canvasResizeTextureBox(64, 64, 64, 64, shifted)).toEqual({ left: 32, top: 32, width: 64, height: 64 });
    // Small centered texture: pad transparent pixels on all sides.
    const identity: GnumarusLayerTransform = {
      x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1,
      skewX: 0, skewY: 0, rotationX: 0, rotationY: 0,
    };
    expect(canvasResizeTextureBox(64, 64, 32, 32, identity)).toEqual({ left: -16, top: -16, width: 64, height: 64 });
    // Exact cover is returned as-is.
    expect(canvasResizeTextureBox(64, 64, 64, 64, identity)).toEqual({ left: 0, top: 0, width: 64, height: 64 });
  });

  it("clampCropBoxToMin1 keeps healthy boxes unchanged", () => {
    expect(clampCropBoxToMin1({ left: 3, top: 2, width: 5, height: 7 })).toEqual({
      left: 3, top: 2, width: 5, height: 7,
    });
    expect(clampCropBoxToMin1({ left: 0, top: 0, width: 1, height: 1 })).toEqual({
      left: 0, top: 0, width: 1, height: 1,
    });
  });

  it("clampCropBoxToMin1 floors degenerate dimensions at 1px", () => {
    expect(clampCropBoxToMin1({ left: 4, top: 4, width: 0, height: 0 })).toEqual({
      left: 4, top: 4, width: 1, height: 1,
    });
    expect(clampCropBoxToMin1({ left: 2, top: 6, width: 0, height: 9 })).toEqual({
      left: 2, top: 6, width: 1, height: 9,
    });
    expect(clampCropBoxToMin1({ left: 2, top: 6, width: 7, height: 0 })).toEqual({
      left: 2, top: 6, width: 7, height: 1,
    });
  });

  it("canvasResizeTextureBox returns null outside the canvas or when degenerate", () => {
    const away: GnumarusLayerTransform = {
      x: 100, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1,
      skewX: 0, skewY: 0, rotationX: 0, rotationY: 0,
    };
    expect(canvasResizeTextureBox(64, 64, 64, 64, away)).toBeNull();
    const edgeOn: GnumarusLayerTransform = {
      x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1,
      skewX: 0, skewY: 0, rotationX: Math.PI / 2, rotationY: 0,
    };
    expect(canvasResizeTextureBox(64, 64, 64, 64, edgeOn)).toBeNull();
  });

  it("canvasResizeTextureBox contains the visible box and the canvas footprint", () => {
    const placed: GnumarusLayerTransform = {
      x: -7, y: 5, rotation: 0.7, flipX: true, flipY: false, scaleX: 1.5, scaleY: 0.8,
      skewX: 0.2, skewY: -0.1, rotationX: 0.2, rotationY: -0.15,
    };
    const resized = canvasResizeTextureBox(64, 64, 48, 40, placed);
    const visible = canvasVisibleTextureBox(64, 64, 48, 40, placed);
    expect(resized).not.toBeNull();
    expect(visible).not.toBeNull();
    if (resized === null || visible === null) {
      return;
    }
    // Resize box covers the visible box.
    expect(resized.left).toBeLessThanOrEqual(visible.left);
    expect(resized.top).toBeLessThanOrEqual(visible.top);
    expect(resized.left + resized.width).toBeGreaterThanOrEqual(visible.left + visible.width);
    expect(resized.top + resized.height).toBeGreaterThanOrEqual(visible.top + visible.height);
    // And every canvas corner maps inside it.
    for (const [px, py] of [[-32, -32], [32, -32], [32, 32], [-32, 32]] as Array<[number, number]>) {
      const mapped = projectToLayerImageFloat(px, py, 48, 40, placed);
      expect(mapped).not.toBeNull();
      if (mapped === null) {
        continue;
      }
      expect(mapped.x).toBeGreaterThanOrEqual(resized.left);
      expect(mapped.x).toBeLessThanOrEqual(resized.left + resized.width);
      expect(mapped.y).toBeGreaterThanOrEqual(resized.top);
      expect(mapped.y).toBeLessThanOrEqual(resized.top + resized.height);
    }
  });

  it("canvasVisibleTextureBox contains every canvas-mapped texel", () => {
    const placed: GnumarusLayerTransform = {
      x: -7, y: 5, rotation: 0.7, flipX: true, flipY: false, scaleX: 1.5, scaleY: 0.8,
      skewX: 0.2, skewY: -0.1, rotationX: 0.2, rotationY: -0.15,
    };
    const box = canvasVisibleTextureBox(64, 64, 48, 40, placed);
    expect(box).not.toBeNull();
    if (box === null) {
      return;
    }
    for (let y = 0; y < 40; y += 1) {
      for (let x = 0; x < 48; x += 1) {
        const project = layerPixelCenterToProject(x, y, 48, 40, placed);
        const onCanvas =
          project.x >= -32 && project.x < 32 && project.y >= -32 && project.y < 32;
        if (onCanvas) {
          expect(x).toBeGreaterThanOrEqual(box.left);
          expect(x).toBeLessThan(box.left + box.width);
          expect(y).toBeGreaterThanOrEqual(box.top);
          expect(y).toBeLessThan(box.top + box.height);
        }
      }
    }
  });

  it("wraps layer pixels per axis", () => {    expect(parseWrapMode("x")).toBe("x");
    expect(parseWrapMode("y")).toBe("y");
    expect(parseWrapMode("both")).toBe("both");
    expect(parseWrapMode("off")).toBe("off");
    expect(parseWrapMode("diagonal")).toBe("off");
    expect(wrapLayerPixel(70, 32, 64, 64, "x")).toEqual({ x: 6, y: 32 });
    expect(wrapLayerPixel(-1, 32, 64, 64, "x")).toEqual({ x: 63, y: 32 });
    expect(wrapLayerPixel(32, 70, 64, 64, "y")).toEqual({ x: 32, y: 6 });
    expect(wrapLayerPixel(70, 70, 64, 64, "both")).toEqual({ x: 6, y: 6 });
    expect(wrapLayerPixel(70, 32, 64, 64, "y")).toBeNull();
    expect(wrapLayerPixel(32, 70, 64, 64, "x")).toBeNull();
    expect(wrapLayerPixel(70, 32, 64, 64, "off")).toBeNull();
    expect(wrapLayerPixel(32, 32, 64, 64, "off")).toEqual({ x: 32, y: 32 });
    expect(wrapLayerPixel(0, 0, 0, 64, "both")).toBeNull();
  });

  it("lists wrap tile offsets excluding the origin", () => {
    expect(wrapTileOffsets("off")).toEqual([]);
    expect(wrapTileOffsets("x")).toEqual([{ x: -1, y: 0 }, { x: 1, y: 0 }]);
    expect(wrapTileOffsets("y")).toEqual([{ x: 0, y: -1 }, { x: 0, y: 1 }]);
    expect(wrapTileOffsets("both")).toHaveLength(8);
  });

  it("shifts tiles by whole textures through the layer transform", () => {
    const identity: GnumarusLayerTransform = {
      x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1,
      skewX: 0, skewY: 0, rotationX: 0, rotationY: 0,
    };
    expect(wrapTileShift(identity, 1, 0, 64, 64)).toEqual({ x: 64, y: 0 });
    expect(wrapTileShift(identity, -1, 1, 64, 32)).toEqual({ x: -64, y: 32 });
    expect(wrapTileShift({ ...identity, flipX: true }, 1, 0, 64, 64)).toEqual({ x: -64, y: 0 });
  });

  it("sizes the wrap background to canvas plus tiles, snapped to cells", () => {
    const identity: GnumarusLayerTransform = {
      x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1,
      skewX: 0, skewY: 0, rotationX: 0, rotationY: 0,
    };
    expect(backgroundUnionForWrap(64, 64, 64, 64, identity, "off", 16, 16)).toEqual({
      width: 64, height: 64, centerX: 0, centerY: 0,
    });
    expect(backgroundUnionForWrap(64, 64, 0, 0, identity, "x", 16, 16).width).toBe(64);
    const horizontal = backgroundUnionForWrap(64, 64, 64, 64, identity, "x", 16, 16);
    expect(horizontal).toEqual({ width: 192, height: 64, centerX: 0, centerY: 0 });
    const both = backgroundUnionForWrap(64, 64, 64, 64, identity, "both", 16, 16);
    expect(both).toEqual({ width: 192, height: 192, centerX: 0, centerY: 0 });
    // Odd cell sizes snap the min corner down to whole cells.
    const snapped = backgroundUnionForWrap(64, 64, 64, 64, identity, "x", 24, 16);
    expect(snapped).toEqual({ width: 200, height: 64, centerX: -4, centerY: 0 });
  });

  it("clips segments to an axis-aligned box", () => {
    expect(clipSegmentToRect(10, 10, 20, 20, 0, 0, 64, 64)).toEqual({ ax: 10, ay: 10, bx: 20, by: 20 });
    expect(clipSegmentToRect(-100, 0, -10, 0, 0, 0, 64, 64)).toBeNull();
    expect(clipSegmentToRect(-100, 10, 100, 10, 0, 0, 64, 64)).toEqual({ ax: 0, ay: 10, bx: 64, by: 10 });
    expect(clipSegmentToRect(5, 5, 5, 5, 0, 0, 64, 64)).toEqual({ ax: 5, ay: 5, bx: 5, by: 5 });
    expect(clipSegmentToRect(0, 0, 0, 0, 10, 10, 64, 64)).toBeNull();
  });
});

describe("scrollIntoViewDelta", () => {
  const view = (left: number, top: number, right: number, bottom: number) => ({ left, top, right, bottom });
  const child = (left: number, top: number, right: number, bottom: number, empty = false) => ({
    left,
    top,
    right,
    bottom,
    empty,
  });

  it("stays put when the child already fits", () => {
    expect(scrollIntoViewDelta(view(0, 0, 100, 100), child(10, 10, 50, 50))).toEqual({ dTop: 0, dLeft: 0 });
  });

  it("scrolls the minimum to reveal each edge", () => {
    expect(scrollIntoViewDelta(view(0, 0, 100, 100), child(-30, 10, 20, 50))).toEqual({ dTop: 0, dLeft: -30 });
    expect(scrollIntoViewDelta(view(0, 0, 100, 100), child(10, -20, 50, 30))).toEqual({ dTop: -20, dLeft: 0 });
    expect(scrollIntoViewDelta(view(0, 0, 100, 100), child(60, 10, 130, 50))).toEqual({ dTop: 0, dLeft: 30 });
    expect(scrollIntoViewDelta(view(0, 0, 100, 100), child(10, 60, 50, 140))).toEqual({ dTop: 40, dLeft: 0 });
  });

  it("ignores empty children", () => {
    expect(scrollIntoViewDelta(view(0, 0, 100, 100), child(-50, -50, -10, -10, true))).toEqual({
      dTop: 0,
      dLeft: 0,
    });
  });
});

describe("constrainSquareDrag", () => {
  it("locks to the larger side keeping each axis direction", () => {
    expect(constrainSquareDrag(10, 20, 30, 25)).toEqual({ x1: 30, y1: 40 });
    expect(constrainSquareDrag(10, 20, 12, 50)).toEqual({ x1: 40, y1: 50 });
    expect(constrainSquareDrag(30, 30, 10, 5)).toEqual({ x1: 5, y1: 5 });
    expect(constrainSquareDrag(0, 0, 10, -4)).toEqual({ x1: 10, y1: -10 });
    expect(constrainSquareDrag(0, 0, -3, 7)).toEqual({ x1: -7, y1: 7 });
  });

  it("leaves zero movement alone", () => {
    expect(constrainSquareDrag(5, 5, 5, 5)).toEqual({ x1: 5, y1: 5 });
    expect(constrainSquareDrag(5, 5, 5, 9)).toEqual({ x1: 5, y1: 9 });
    expect(constrainSquareDrag(5, 5, 9, 5)).toEqual({ x1: 9, y1: 5 });
  });
});

describe("proportionalResizeScale", () => {
  it("follows the dominant axis preserving the start ratio", () => {
    // Horizontal drag on a square: both axes double.
    expect(proportionalResizeScale(2, 1, 1, 1, true, true)).toEqual({ scaleX: 2, scaleY: 2 });
    // Vertical drag wins when it moves more.
    expect(proportionalResizeScale(1.1, 3, 1, 1, true, true)).toEqual({ scaleX: 3, scaleY: 3 });
    // Non-square start ratios are preserved, not squared.
    expect(proportionalResizeScale(4, 1, 2, 1, true, true)).toEqual({ scaleX: 4, scaleY: 2 });
    expect(proportionalResizeScale(2, 5, 2, 1, true, true)).toEqual({ scaleX: 10, scaleY: 5 });
  });

  it("couples edge handles through the single adjusted axis", () => {
    expect(proportionalResizeScale(3, 1, 1, 1, true, false)).toEqual({ scaleX: 3, scaleY: 3 });
    expect(proportionalResizeScale(1, 0.5, 1, 1, false, true)).toEqual({ scaleX: 0.5, scaleY: 0.5 });
  });

  it("leaves untouched and degenerate inputs alone", () => {
    expect(proportionalResizeScale(2, 3, 1, 1, false, false)).toEqual({ scaleX: 2, scaleY: 3 });
    expect(proportionalResizeScale(0, 0, 0, 0, true, true)).toEqual({ scaleX: 0, scaleY: 0 });
    expect(proportionalResizeScale(2, 2, 1, 1, true, false)).toEqual({ scaleX: 2, scaleY: 2 });
    expect(proportionalResizeScale(Number.NaN, 2, 1, 1, true, true)).toEqual({ scaleX: 2, scaleY: 2 });
  });
});

describe("grow-or-crop box helpers", () => {
  it("normalizes drag corners outward with a 1px floor", () => {
    expect(normalizeGrowBox(10, 10, 20, 30)).toEqual({ left: 10, top: 10, width: 10, height: 20 });
    // Reversed drags flip; fractional edges snap outward.
    expect(normalizeGrowBox(20.7, 30.2, 10.2, 10.9)).toEqual({ left: 10, top: 10, width: 11, height: 21 });
    // Zero-area drags keep one pixel.
    expect(normalizeGrowBox(5, 5, 5, 5)).toEqual({ left: 5, top: 5, width: 1, height: 1 });
    // Negative origins (growing past the texture edge) survive.
    expect(normalizeGrowBox(-3.2, -3.7, 1, 1)).toEqual({ left: -4, top: -4, width: 5, height: 5 });
  });

  it("snaps crop-box drags outward to whole pixels", () => {
    // Forward drags: min floors, max ceils (the commit behavior).
    expect(snapCropBox(10.4, 20.2, 30.6, 40.9)).toEqual({ x0: 10, y0: 20, x1: 31, y1: 41 });
    expect(snapCropBox(10, 20, 30, 40)).toEqual({ x0: 10, y0: 20, x1: 30, y1: 40 });
    // Reversed drags keep the press anchor: corners are not swapped.
    expect(snapCropBox(30.6, 40.9, 10.4, 20.2)).toEqual({ x0: 31, y0: 41, x1: 10, y1: 20 });
    // Negative origins (growing past the texture edge) survive.
    expect(snapCropBox(1, 1, -3.2, -3.7)).toEqual({ x0: 1, y0: 1, x1: -4, y1: -4 });
  });

  it("hits corners before edges and edges before the interior", () => {
    const box = { left: 100, top: 100, right: 200, bottom: 200 };
    const hit = (x: number, y: number): string | null => {
      const found = hitGrowBoxHandles(box.left, box.top, box.right, box.bottom, x, y);
      return found === null ? null : (found as string);
    };
    expect(hit(100, 100)).toBe("nw");
    expect(hit(200, 200)).toBe("se");
    expect(hit(200, 100)).toBe("ne");
    expect(hit(100, 200)).toBe("sw");
    // Near-corner points still prefer the corner.
    expect(hit(108, 106)).toBe("nw");
    // Edge middles.
    expect(hit(150, 100)).toBe("n");
    expect(hit(150, 200)).toBe("s");
    expect(hit(100, 150)).toBe("w");
    expect(hit(200, 150)).toBe("e");
    // Interior and far exterior miss.
    expect(hit(150, 150)).toBeNull();
    expect(hit(10, 10)).toBeNull();
    expect(hit(150, 40)).toBeNull();
  });

  it("matches the axis-aligned hit test on unrotated boxes", () => {
    const quad = {
      nw: { x: 100, y: 100 },
      ne: { x: 200, y: 100 },
      sw: { x: 100, y: 200 },
      se: { x: 200, y: 200 },
    };
    for (let x = 80; x <= 220; x += 2) {
      for (let y = 80; y <= 220; y += 2) {
        expect(hitQuadHandles(quad.nw, quad.ne, quad.sw, quad.se, x, y)).toBe(
          hitGrowBoxHandles(quad.nw.x, quad.nw.y, quad.se.x, quad.se.y, x, y),
        );
      }
    }
  });

  it("hits the outline of a rotated box", () => {
    // 100x100 box centered at (150,150), rotated 45 degrees clockwise.
    const c = Math.SQRT1_2 * 50;
    const quad = {
      nw: { x: 150, y: 150 - 2 * c },
      ne: { x: 150 + 2 * c, y: 150 },
      sw: { x: 150 - 2 * c, y: 150 },
      se: { x: 150, y: 150 + 2 * c },
    };
    expect(hitQuadHandles(quad.nw, quad.ne, quad.sw, quad.se, 150, 150 - 2 * c)).toBe("nw");
    expect(hitQuadHandles(quad.nw, quad.ne, quad.sw, quad.se, 150 + 2 * c, 150)).toBe("ne");
    // Edge middles: the north edge runs from nw to ne.
    expect(hitQuadHandles(quad.nw, quad.ne, quad.sw, quad.se, 150 + c, 150 - c)).toBe("n");
    expect(hitQuadHandles(quad.nw, quad.ne, quad.sw, quad.se, 150 - c, 150 + c)).toBe("s");
    expect(hitQuadHandles(quad.nw, quad.ne, quad.sw, quad.se, 150 - c, 150 - c)).toBe("w");
    expect(hitQuadHandles(quad.nw, quad.ne, quad.sw, quad.se, 150 + c, 150 + c)).toBe("e");
    // Center and far points miss.
    expect(hitQuadHandles(quad.nw, quad.ne, quad.sw, quad.se, 150, 150)).toBeNull();
    expect(hitQuadHandles(quad.nw, quad.ne, quad.sw, quad.se, 10, 10)).toBeNull();
  });
});

describe("orbitPanForRotation", () => {
  it("leaves centered views and zero deltas alone", () => {
    expect(orbitPanForRotation(0, 0, 1.2)).toEqual({ panX: 0, panY: 0 });
    expect(orbitPanForRotation(30, -40, 0)).toEqual({ panX: 30, panY: -40 });
  });

  it("rotates the pan vector with the projection matrix", () => {
    // Quarter turn: (x, y) -> (-y, x), like projectToScreen.
    const quarter = orbitPanForRotation(30, 10, Math.PI / 2);
    expect(quarter.panX).toBeCloseTo(-10, 9);
    expect(quarter.panY).toBeCloseTo(30, 9);
    // Half turn negates.
    const half = orbitPanForRotation(30, 10, Math.PI);
    expect(half.panX).toBeCloseTo(-30, 9);
    expect(half.panY).toBeCloseTo(-10, 9);
    // Magnitude is preserved for any angle.
    const tilted = orbitPanForRotation(30, 10, 0.2618);
    expect(Math.hypot(tilted.panX, tilted.panY)).toBeCloseTo(Math.hypot(30, 10), 9);
    expect(tilted.panX).toBeCloseTo(30 * Math.cos(0.2618) - 10 * Math.sin(0.2618), 9);
    expect(tilted.panY).toBeCloseTo(30 * Math.sin(0.2618) + 10 * Math.cos(0.2618), 9);
  });
});
