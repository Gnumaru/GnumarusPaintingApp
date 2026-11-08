import { describe, expect, it } from "vitest";
import { shiftTransformForCrop } from "../src/canvas/GnumarusCanvasEngine";
import { layerImageToProject } from "../src/canvas/GnumarusViewportMath";

describe("shiftTransformForCrop", () => {
  it("leaves the transform alone for a full-size box", () => {
    const transform = { x: 4, y: -2, rotation: 0.3, flipX: false, flipY: true, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 };
    const shifted = shiftTransformForCrop(transform, 64, 64, { left: 0, top: 0, width: 64, height: 64 });
    expect(shifted).toEqual(transform);
  });

  it("shifts the center for identity crops", () => {
    // Crop 10px off the left and 4px off the top of a 64x48 texture.
    const shifted = shiftTransformForCrop(
      { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
      64,
      48,
      { left: 10, top: 4, width: 54, height: 44 },
    );
    expect(shifted.x).toBeCloseTo(5, 9);
    expect(shifted.y).toBeCloseTo(2, 9);
    expect(shifted.rotation).toBe(0);
  });

  it("mirrors the shift for flipped textures", () => {
    const flipped = shiftTransformForCrop(
      { x: 0, y: 0, rotation: 0, flipX: true, flipY: true, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
      64,
      48,
      { left: 10, top: 4, width: 54, height: 44 },
    );
    expect(flipped.x).toBeCloseTo(-5, 9);
    expect(flipped.y).toBeCloseTo(-2, 9);
  });

  it("keeps every remaining pixel at the same project position", () => {
    const cases = [
      { x: 5, y: -3, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
      { x: -7, y: 9, rotation: 0, flipX: true, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
      { x: 2, y: 2, rotation: Math.PI / 2, flipX: false, flipY: true, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
      { x: 0, y: 0, rotation: 0.7, flipX: true, flipY: true, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
      { x: 11, y: -4, rotation: -1.1, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
    ];
    const oldWidth = 64;
    const oldHeight = 48;
    const box = { left: 10, top: 6, width: 30, height: 20 };
    for (const transform of cases) {
      const next = shiftTransformForCrop(transform, oldWidth, oldHeight, box);
      expect(next.rotation).toBe(transform.rotation);
      expect(next.flipX).toBe(transform.flipX);
      expect(next.flipY).toBe(transform.flipY);
      for (const [x, y] of [
        [0, 0],
        [box.width - 1, box.height - 1],
        [7, 13],
      ]) {
        const after = layerImageToProject(x, y, box.width, box.height, next);
        const before = layerImageToProject(x + box.left, y + box.top, oldWidth, oldHeight, transform);
        expect(after.x).toBeCloseTo(before.x, 9);
        expect(after.y).toBeCloseTo(before.y, 9);
      }
    }
  });

  it("keeps every pixel at the same project position for padded boxes", () => {
    // Expanding a 32x32 texture by 16 transparent pixels on the left/top.
    const box = { left: -16, top: -16, width: 64, height: 64 };
    const cases = [
      { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
      { x: 4, y: -3, rotation: 0.5, flipX: true, flipY: false, scaleX: 2, scaleY: 2, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
    ];
    for (const transform of cases) {
      const next = shiftTransformForCrop(transform, 32, 32, box);
      for (const [x, y] of [
        [16, 16],
        [47, 47],
        [30, 20],
      ]) {
        const after = layerImageToProject(x, y, box.width, box.height, next);
        const before = layerImageToProject(x + box.left, y + box.top, 32, 32, transform);
        expect(after.x).toBeCloseTo(before.x, 9);
        expect(after.y).toBeCloseTo(before.y, 9);
      }
    }
  });
});
