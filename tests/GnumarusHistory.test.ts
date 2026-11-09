import { describe, expect, it } from "vitest";
import { createPixelBuffer, setPixel } from "../src/canvas/GnumarusPixelBuffer";
import { IDENTITY_LAYER_TRANSFORM } from "../src/canvas/GnumarusViewportMath";
import {
  applyImageDiff,
  computeImageDiff,
  GnumarusHistory,
  type GnumarusFitRecord,
  type GnumarusHistoryLayer,
} from "../src/history/GnumarusHistory";

const BLACK = { r: 0, g: 0, b: 0, a: 255 };

function layerOf(buffer: Uint8ClampedArray): GnumarusHistoryLayer {
  return { buffer, width: 8 };
}

function layerOf4(buffer: Uint8ClampedArray): GnumarusHistoryLayer {
  return { buffer, width: 4 };
}

describe("GnumarusHistory", () => {
  it("computes null diff for identical buffers", () => {
    const a = createPixelBuffer(8, 8);
    const b = createPixelBuffer(8, 8);
    expect(computeImageDiff(a, b, 8, 8)).toBeNull();
  });

  it("computes a tight bounding-box diff", () => {
    const before = createPixelBuffer(8, 8);
    const after = createPixelBuffer(8, 8);
    setPixel(after, 8, 8, 2, 3, BLACK);
    setPixel(after, 8, 8, 5, 6, BLACK);
    const diff = computeImageDiff(before, after, 8, 8);
    expect(diff).not.toBeNull();
    expect({ x: diff?.x, y: diff?.y, w: diff?.w, h: diff?.h }).toEqual({ x: 2, y: 3, w: 4, h: 4 });
  });

  it("undoes and redoes a stroke", () => {
    const buffer = createPixelBuffer(8, 8);
    const stroke = createPixelBuffer(8, 8);
    setPixel(stroke, 8, 8, 1, 1, BLACK);
    setPixel(stroke, 8, 8, 2, 2, BLACK);
    const history = new GnumarusHistory();
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(false);
    const diff = computeImageDiff(buffer, stroke, 8, 8);
    expect(diff).not.toBeNull();
    if (diff === null) {
      throw new Error("expected a diff");
    }
    buffer.set(stroke);
    history.push({ type: "stroke", layerId: "layer0", diff });
    expect(history.canUndo()).toBe(true);

    expect(history.undo(() => layerOf(buffer), () => {})).toBe(true);
    expect(computeImageDiff(buffer, createPixelBuffer(8, 8), 8, 8)).toBeNull();
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(true);

    expect(history.redo(() => layerOf(buffer), () => {})).toBe(true);
    expect(computeImageDiff(buffer, stroke, 8, 8)).toBeNull();
    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(false);

    expect(history.redo(() => layerOf(buffer), () => {})).toBe(false);
  });

  it("skips entries whose layer no longer exists", () => {
    const history = new GnumarusHistory();
    const buffer = createPixelBuffer(8, 8);
    const stroke = createPixelBuffer(8, 8);
    setPixel(stroke, 8, 8, 1, 1, BLACK);
    const diff = computeImageDiff(buffer, stroke, 8, 8);
    if (diff === null) {
      throw new Error("expected a diff");
    }
    history.push({ type: "stroke", layerId: "gone", diff });
    expect(history.undo(() => null, () => {})).toBe(false);
    expect(history.canUndo()).toBe(false);
  });

  it("drops redo when a new action is pushed", () => {
    const history = new GnumarusHistory();
    const empty = createPixelBuffer(4, 4);
    const first = createPixelBuffer(4, 4);
    setPixel(first, 4, 4, 0, 0, BLACK);
    const second = createPixelBuffer(4, 4);
    setPixel(second, 4, 4, 3, 3, BLACK);
    const buffer = createPixelBuffer(4, 4);
    buffer.set(first);
    const diffA = computeImageDiff(empty, first, 4, 4);
    const diffB = computeImageDiff(first, second, 4, 4);
    if (diffA === null || diffB === null) {
      throw new Error("expected diffs");
    }
    history.push({ type: "stroke", layerId: "layer0", diff: diffA });
    history.undo(() => layerOf4(buffer), () => {});
    buffer.set(first);
    history.push({ type: "stroke", layerId: "layer0", diff: diffB });
    expect(history.canRedo()).toBe(false);
  });

  it("caps the undo depth", () => {
    const history = new GnumarusHistory(3);
    const base = createPixelBuffer(4, 4);
    for (let i = 0; i < 5; i += 1) {
      const next = createPixelBuffer(4, 4);
      setPixel(next, 4, 4, i % 4, 0, BLACK);
      const diff = computeImageDiff(base, next, 4, 4);
      if (diff === null) {
        throw new Error("expected a diff");
      }
      history.push({ type: "stroke", layerId: "layer0", diff });
    }
    const buffer = createPixelBuffer(4, 4);
    expect(history.undo(() => layerOf4(buffer), () => {})).toBe(true);
    expect(history.undo(() => layerOf4(buffer), () => {})).toBe(true);
    expect(history.undo(() => layerOf4(buffer), () => {})).toBe(true);
    expect(history.undo(() => layerOf4(buffer), () => {})).toBe(false);
  });

  it("applies diff sides directly", () => {
    const before = createPixelBuffer(4, 4);
    const after = createPixelBuffer(4, 4);
    setPixel(after, 4, 4, 1, 1, BLACK);
    const diff = computeImageDiff(before, after, 4, 4);
    if (diff === null) {
      throw new Error("expected a diff");
    }
    const buffer = createPixelBuffer(4, 4);
    applyImageDiff(buffer, 4, diff, "after");
    expect(computeImageDiff(buffer, after, 4, 4)).toBeNull();
    applyImageDiff(buffer, 4, diff, "before");
    expect(computeImageDiff(buffer, before, 4, 4)).toBeNull();
  });

  it("undoes and redoes a fit with content transforms", () => {
    const history = new GnumarusHistory();
    let texture = { width: 4, height: 4, buffer: createPixelBuffer(4, 4) };
    setPixel(texture.buffer, 4, 4, 2, 1, BLACK);
    const transforms = new Map<string, { x: number; y: number; rotation: number; flipX: boolean; flipY: boolean; scaleX: number; scaleY: number; skewX: number; skewY: number; rotationX: number; rotationY: number }>();
    transforms.set("content1", { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 });
    const fitEntry = {
      type: "fit" as const,
      fit: {
        textureId: "tex1",
        beforeWidth: 4,
        beforeHeight: 4,
        beforeBuffer: texture.buffer.slice(),
        afterWidth: 1,
        afterHeight: 1,
        afterBuffer: texture.buffer.subarray((1 * 4 + 2) * 4, (1 * 4 + 2) * 4 + 4).slice(),
        transforms: [
          {
            contentId: "content1",
            before: { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
            after: { x: 0.5, y: -0.5, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
          },
        ],
      },
    };
    texture = { width: 1, height: 1, buffer: fitEntry.fit.afterBuffer.slice() };
    transforms.set("content1", { ...fitEntry.fit.transforms[0]!.after });
    history.push(fitEntry);
    const applyFit = (
      textureId: string,
      width: number,
      height: number,
      buffer: Uint8ClampedArray,
      items: Array<{ contentId: string; transform: { x: number } }>,
    ): boolean => {
      if (textureId !== "tex1") {
        return false;
      }
      texture = { width, height, buffer: buffer.slice() };
      for (const item of items) {
        const current = transforms.get(item.contentId);
        if (current !== undefined) {
          transforms.set(item.contentId, { ...current, x: item.transform.x });
        }
      }
      return true;
    };
    expect(history.undo(() => null, () => {}, undefined, applyFit)).toBe(true);
    expect(texture).toMatchObject({ width: 4, height: 4 });
    expect(transforms.get("content1")).toMatchObject({ x: 0 });
    expect(history.redo(() => null, () => {}, undefined, applyFit)).toBe(true);
    expect(texture).toMatchObject({ width: 1, height: 1 });
    expect(transforms.get("content1")).toMatchObject({ x: 0.5 });
  });

  it("undoes and redoes a merge", () => {
    const layers = new Map<string, Uint8ClampedArray>();
    layers.set("lower", createPixelBuffer(4, 4));
    const upperBuffer = createPixelBuffer(4, 4);
    setPixel(upperBuffer, 4, 4, 1, 1, BLACK);
    const find = (id: string) => {
      const buffer = layers.get(id);
      return buffer === undefined ? null : { buffer, width: 4 };
    };
    const history = new GnumarusHistory();
    const lowerDiff = computeImageDiff(
      layers.get("lower") ?? createPixelBuffer(4, 4),
      upperBuffer,
      4,
      4,
    );
    history.push({
      type: "merge",
      merge: {
        lowerLayerId: "lower",
        lowerDiff,
        upper: {
          id: "upper",
          name: "Upper",
          textureName: "Texture 9",
          visible: true,
          opacity: 1,
          width: 4,
          height: 4,
          transform: { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
          lockedChannels: { r: false, g: false, b: false, a: false },
          stackIndex: 1,
          buffer: upperBuffer,
          cells: [{ frame: 0, content: "content9" }],
          detachedContents: ["content7"],
        },
        removedLayer: true,
        dissociatedCell: null,
        associatedCell: null,
        textureLink: null,
      },
    });
    layers.get("lower")?.set(upperBuffer);
    layers.delete("upper");

    expect(history.undo(find, (snapshot) => layers.set(snapshot.id, snapshot.buffer))).toBe(true);
    expect(layers.has("upper")).toBe(true);
    expect(computeImageDiff(layers.get("lower") ?? createPixelBuffer(4, 4), createPixelBuffer(4, 4), 4, 4)).toBeNull();

    expect(history.canRedo()).toBe(true);
    expect(
      history.redo(find, (id) => {
        layers.delete(id);
      }),
    ).toBe(true);
    expect(layers.has("upper")).toBe(false);
    expect(computeImageDiff(layers.get("lower") ?? createPixelBuffer(4, 4), upperBuffer, 4, 4)).toBeNull();
  });

  it("undoes and redoes a keep-layer merge by re-associating the cell", () => {
    const lower = createPixelBuffer(4, 4);
    const cells = new Map<string, string>();
    const history = new GnumarusHistory();
    const target = createPixelBuffer(4, 4);
    setPixel(target, 4, 4, 1, 1, BLACK);
    const lowerDiff = computeImageDiff(lower, target, 4, 4);
    expect(lowerDiff).not.toBeNull();
    history.push({
      type: "merge",
      merge: {
        lowerLayerId: "lower",
        lowerDiff,
        removedLayer: false,
        dissociatedCell: { layer: "upper", frame: 2, content: "content9" },
        associatedCell: null,
        textureLink: null,
        upper: {
          id: "upper",
          name: "Upper",
          textureName: "Texture 9",
          visible: true,
          opacity: 1,
          width: 4,
          height: 4,
          transform: { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
          lockedChannels: { r: false, g: false, b: false, a: false },
          stackIndex: 1,
          buffer: createPixelBuffer(4, 4),
          cells: [
            { frame: 0, content: "content9" },
            { frame: 2, content: "content9" },
          ],
          detachedContents: [],
        },
      },
    });
    const find = () => ({ buffer: lower, width: 4 });
    const associate = (layerId: string, frame: number, contentId: string): boolean => {
      cells.set(`${layerId}\n${frame}`, contentId);
      return true;
    };
    const dissociate = (layerId: string, frame: number): boolean => {
      const key = `${layerId}\n${frame}`;
      if (!cells.has(key)) {
        return false;
      }
      cells.delete(key);
      return true;
    };
    lower.set(target);
    cells.delete("upper\n2");

    expect(history.undo(find, () => {}, undefined, undefined, associate)).toBe(true);
    expect(computeImageDiff(lower, createPixelBuffer(4, 4), 4, 4)).toBeNull();
    expect(cells.get("upper\n2")).toBe("content9");

    expect(history.canRedo()).toBe(true);
    expect(history.redo(find, () => {}, undefined, undefined, dissociate)).toBe(true);
    expect(computeImageDiff(lower, target, 4, 4)).toBeNull();
    expect(cells.has("upper\n2")).toBe(false);
  });

  it("undoes and redoes a relink merge with associated cell and texture link", () => {
    const lower = createPixelBuffer(4, 4);
    const cells = new Map<string, string>();
    const textures = new Map<string, string | null>([
      ["content9", null],
      ["contentLower", "texLower"],
    ]);
    const history = new GnumarusHistory();
    history.push({
      type: "merge",
      merge: {
        lowerLayerId: "lower",
        lowerDiff: null,
        removedLayer: false,
        dissociatedCell: { layer: "upper", frame: 1, content: "content9" },
        associatedCell: { layer: "lower", frame: 1, content: "content9" },
        textureLink: { contentId: "contentLower", before: null, after: "texUpper" },
        upper: {
          id: "upper",
          name: "Upper",
          textureName: "Texture 9",
          visible: true,
          opacity: 1,
          width: 4,
          height: 4,
          transform: { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
          lockedChannels: { r: false, g: false, b: false, a: false },
          stackIndex: 1,
          buffer: createPixelBuffer(4, 4),
          cells: [{ frame: 0, content: "content9" }],
          detachedContents: [],
        },
      },
    });
    const find = () => ({ buffer: lower, width: 4 });
    const associate = (layerId: string, frame: number, contentId: string): boolean => {
      cells.set(`${layerId}\n${frame}`, contentId);
      return true;
    };
    const dissociate = (layerId: string, frame: number): boolean => {
      const key = `${layerId}\n${frame}`;
      if (!cells.has(key)) {
        return false;
      }
      cells.delete(key);
      return true;
    };
    const setTexture = (contentId: string, textureId: string | null): boolean => {
      if (!textures.has(contentId)) {
        return false;
      }
      textures.set(contentId, textureId);
      return true;
    };
    cells.delete("upper\n1");
    cells.set("lower\n1", "content9");
    textures.set("contentLower", "texUpper");

    expect(history.undo(find, () => {}, undefined, undefined, associate, dissociate, setTexture)).toBe(true);
    expect(cells.get("upper\n1")).toBe("content9");
    expect(cells.has("lower\n1")).toBe(false);
    expect(textures.get("contentLower")).toBeNull();

    expect(history.canRedo()).toBe(true);
    expect(history.redo(find, () => {}, undefined, undefined, dissociate, associate, setTexture)).toBe(true);
    expect(cells.has("upper\n1")).toBe(false);
    expect(cells.get("lower\n1")).toBe("content9");
    expect(textures.get("contentLower")).toBe("texUpper");
  });

  it("tracks depths and reports evictions", () => {
    const history = new GnumarusHistory(2);
    expect(history.undoDepth()).toBe(0);
    expect(history.redoDepth()).toBe(0);
    const entry = {
      type: "stroke" as const,
      layerId: "layer0",
      diff: { x: 0, y: 0, w: 1, h: 1, before: new Uint8ClampedArray(4), after: new Uint8ClampedArray(4) },
    };
    expect(history.push(entry)).toBe(0);
    expect(history.undoDepth()).toBe(1);
    expect(history.push(entry)).toBe(0);
    expect(history.undoDepth()).toBe(2);
    expect(history.push(entry)).toBe(1);
    expect(history.undoDepth()).toBe(2);
  });

  it("undoes a fit batch in reverse and redoes it in order", () => {
    const fitRecord = (textureId: string): GnumarusFitRecord => ({
      textureId,
      beforeWidth: 4,
      beforeHeight: 4,
      beforeBuffer: createPixelBuffer(4, 4),
      afterWidth: 1,
      afterHeight: 1,
      afterBuffer: createPixelBuffer(1, 1),
      transforms: [{ contentId: `content${textureId}`, before: { ...IDENTITY_LAYER_TRANSFORM }, after: { ...IDENTITY_LAYER_TRANSFORM } }],
    });
    const history = new GnumarusHistory();
    const calls: string[] = [];
    const applyFit = (textureId: string, width: number, height: number): boolean => {
      calls.push(`${textureId}:${width}x${height}`);
      return true;
    };
    const findLayer = (): null => null;
    const noop = (): void => {};
    history.push({ type: "fitBatch", fits: [fitRecord("texA"), fitRecord("texB")] });
    expect(history.undo(findLayer, noop, undefined, applyFit)).toBe(true);
    expect(calls).toEqual(["texB:4x4", "texA:4x4"]);
    expect(history.redo(findLayer, noop, undefined, applyFit)).toBe(true);
    expect(calls).toEqual(["texB:4x4", "texA:4x4", "texA:1x1", "texB:1x1"]);
    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(false);
  });

  it("skips a fit batch when no texture applies", () => {
    const history = new GnumarusHistory();
    const fit = {
      textureId: "gone",
      beforeWidth: 4,
      beforeHeight: 4,
      beforeBuffer: createPixelBuffer(4, 4),
      afterWidth: 1,
      afterHeight: 1,
      afterBuffer: createPixelBuffer(1, 1),
      transforms: [],
    };
    history.push({ type: "fitBatch", fits: [fit] });
    expect(history.undo(() => null, () => {}, undefined, () => false)).toBe(false);
    expect(history.canUndo()).toBe(false);
  });
});
