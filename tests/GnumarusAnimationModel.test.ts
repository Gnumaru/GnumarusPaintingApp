import { describe, expect, it } from "vitest";
import {
  animationCellKey,
  clampFrameDurationMs,
  defaultFrameName,
  effectiveFrameDurationMs,
  ensureFrameNames,
  insertFrameCells,
  insertFrameDurations,
  insertFrameNames,
  normalizeFrameName,
  resolveAnimationFrame,
  swapFrameCells,
  swapFrameDurations,
  swapFrameNames,
  GNUMARUS_DEFAULT_FRAME_DURATION_MS,
  GNUMARUS_MAX_FRAME_DURATION_MS,
  GNUMARUS_MIN_FRAME_DURATION_MS,
} from "../src/animation/GnumarusAnimationModel";

function bufferOf(width: number, height: number, fill: number): Uint8ClampedArray {
  const buffer = new Uint8ClampedArray(width * height * 4);
  buffer.fill(fill);
  return buffer;
}

describe("GnumarusAnimationModel", () => {
  it("builds stable cell keys", () => {
    expect(animationCellKey("layer0", 0)).toBe("layer0\n0");
    expect(animationCellKey("layer10", 2)).not.toBe(animationCellKey("layer1", 0));
  });

  it("resolves empty cells to nothing", () => {
    const resolved = resolveAnimationFrame(["layer0"], new Map(), new Map(), new Map(), 0);
    const cell = resolved.get("layer0");
    expect(cell).toMatchObject({ layerId: "layer0", contentId: null, textureId: null, width: 0, height: 0 });
    expect(cell?.buffer).toBeNull();
  });

  it("shares texture buffers across cells with the same content", () => {
    const buffer = bufferOf(4, 4, 7);
    const textures = new Map([["layer0", { width: 4, height: 4, buffer }]]);
    const contents = new Map([
      ["content1", { textureId: "layer0", transform: { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 } }],
    ]);
    const cells = new Map([
      [animationCellKey("layer0", 0), "content1"],
      [animationCellKey("layer1", 0), "content1"],
    ]);
    const resolved = resolveAnimationFrame(["layer0", "layer1"], textures, contents, cells, 0);
    expect(resolved.get("layer0")?.buffer).toBe(buffer);
    expect(resolved.get("layer1")?.buffer).toBe(buffer);
    expect(resolved.get("layer0")?.contentId).toBe("content1");
    expect(resolved.get("layer1")?.contentId).toBe("content1");
  });

  it("keeps frames independent through different contents", () => {
    const first = bufferOf(2, 2, 1);
    const second = bufferOf(2, 2, 2);
    const textures = new Map([
      ["tex0", { width: 2, height: 2, buffer: first }],
      ["tex1", { width: 2, height: 2, buffer: second }],
    ]);
    const contents = new Map([
      ["c0", { textureId: "tex0", transform: { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 } }],
      ["c1", { textureId: "tex1", transform: { x: 5, y: 6, rotation: 0.5, flipX: true, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 } }],
    ]);
    const cells = new Map([
      [animationCellKey("layer0", 0), "c0"],
      [animationCellKey("layer0", 1), "c1"],
    ]);
    const f0 = resolveAnimationFrame(["layer0"], textures, contents, cells, 0).get("layer0");
    const f1 = resolveAnimationFrame(["layer0"], textures, contents, cells, 1).get("layer0");
    expect(f0?.buffer).toBe(first);
    expect(f1?.buffer).toBe(second);
    expect(f1).toMatchObject({ contentId: "c1", textureId: "tex1" });
    expect(f1?.transform).toMatchObject({ x: 5, flipX: true });
  });

  it("renders textureless contents as empty with their transform", () => {
    const contents = new Map([
      ["c0", { textureId: null, transform: { x: 3, y: 4, rotation: 0, flipX: false, flipY: true, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 } }],
    ]);
    const cells = new Map([[animationCellKey("layer0", 0), "c0"]]);
    const resolved = resolveAnimationFrame(["layer0"], new Map(), contents, cells, 0).get("layer0");
    expect(resolved).toMatchObject({ contentId: "c0", textureId: null, width: 0, height: 0 });
    expect(resolved?.buffer).toBeNull();
    expect(resolved?.transform).toMatchObject({ x: 3, flipY: true });
  });

  it("treats dangling content references as empty", () => {
    const cells = new Map([[animationCellKey("layer0", 0), "gone"]]);
    const resolved = resolveAnimationFrame(["layer0"], new Map(), new Map(), cells, 0).get("layer0");
    expect(resolved).toMatchObject({ contentId: null, buffer: null });
  });

  it("clamps frame durations and falls back to the project default", () => {
    expect(GNUMARUS_DEFAULT_FRAME_DURATION_MS).toBe(100);
    expect(GNUMARUS_MIN_FRAME_DURATION_MS).toBe(1);
    expect(GNUMARUS_MAX_FRAME_DURATION_MS).toBe(60000);
    expect(clampFrameDurationMs(250)).toBe(250);
    expect(clampFrameDurationMs(0)).toBe(1);
    expect(clampFrameDurationMs(-50)).toBe(1);
    expect(clampFrameDurationMs(999999)).toBe(60000);
    expect(clampFrameDurationMs(Number.NaN)).toBe(100);
    expect(effectiveFrameDurationMs(250, 100)).toBe(250);
    expect(effectiveFrameDurationMs(null, 100)).toBe(100);
    expect(effectiveFrameDurationMs(undefined, 400)).toBe(400);
    expect(effectiveFrameDurationMs(Number.NaN, 100)).toBe(100);
  });

  it("shifts cells and durations up on frame insertion", () => {
    const cells = new Map([
      [animationCellKey("layer0", 0), "a"],
      [animationCellKey("layer0", 1), "b"],
      [animationCellKey("layer1", 2), "c"],
    ]);
    const shifted = insertFrameCells(cells, 1);
    expect(shifted.get(animationCellKey("layer0", 0))).toBe("a");
    expect(shifted.get(animationCellKey("layer0", 1))).toBeUndefined();
    expect(shifted.get(animationCellKey("layer0", 2))).toBe("b");
    expect(shifted.get(animationCellKey("layer1", 3))).toBe("c");
    expect(shifted.size).toBe(3);
    const durations = insertFrameDurations(
      new Map([
        [0, 100],
        [1, 200],
      ]),
      1,
    );
    expect(durations.get(0)).toBe(100);
    expect(durations.get(1)).toBeUndefined();
    expect(durations.get(2)).toBe(200);
  });

  it("swaps cells and durations of two frames", () => {
    const cells = new Map([
      [animationCellKey("layer0", 0), "a"],
      [animationCellKey("layer0", 2), "b"],
    ]);
    const swapped = swapFrameCells(cells, 0, 2);
    expect(swapped.get(animationCellKey("layer0", 0))).toBe("b");
    expect(swapped.get(animationCellKey("layer0", 2))).toBe("a");
    expect(swapFrameCells(cells, 1, 1)).toEqual(cells);
    const durations = swapFrameDurations(
      new Map([
        [0, 100],
        [2, 300],
      ]),
      0,
      2,
    );
    expect(durations.get(0)).toBe(300);
    expect(durations.get(2)).toBe(100);
    // Absence is preserved on either side of the swap.
    const partial = swapFrameDurations(new Map([[1, 150]]), 0, 1);
    expect(partial.get(0)).toBe(150);
    expect(partial.get(1)).toBeUndefined();
    expect(swapFrameDurations(new Map(), 0, 1).size).toBe(0);
  });

  it("builds default frame names and normalizes custom names", () => {
    expect(defaultFrameName(0)).toBe("F1");
    expect(defaultFrameName(2)).toBe("F3");
    expect(normalizeFrameName("  My Frame  ")).toBe("My Frame");
    expect(normalizeFrameName("   ")).toBeNull();
    expect(normalizeFrameName("")).toBeNull();
    const long = "x".repeat(100);
    expect(normalizeFrameName(long)?.length).toBe(64);
  });

  it("ensures frame names with defaults", () => {
    expect(ensureFrameNames(1)).toEqual(["F1"]);
    expect(ensureFrameNames(3, ["A"])).toEqual(["A", "F2", "F3"]);
    expect(ensureFrameNames(2, ["  ", "B"])).toEqual(["F1", "B"]);
  });

  it("inserts and swaps frame names", () => {
    expect(insertFrameNames(["Frame 1", "Frame 2"], 1, "Frame 3")).toEqual(["Frame 1", "Frame 3", "Frame 2"]);
    expect(insertFrameNames(["Frame 1"], 0, "Frame 2")).toEqual(["Frame 2", "Frame 1"]);
    expect(swapFrameNames(["A", "B", "C"], 0, 2)).toEqual(["C", "B", "A"]);
    expect(swapFrameNames(["A", "B"], 1, 1)).toEqual(["A", "B"]);
  });
});
