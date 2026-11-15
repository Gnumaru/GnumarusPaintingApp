import { describe, expect, it } from "vitest";
import {
  isEffectivelyVisible,
  isHiddenByCollapse,
  isLayerAncestor,
  layerBlockRange,
  layerDepth,
  makeRootLayer,
  moveLayerBlock,
  moveLayerBlockWrapping,
  rebuildLayerOrder,
  reparentLayer,
  sanitizeLayerParents,
} from "../src/canvas/GnumarusLayerTree";

function parentsOf(order: readonly string[], pairs: Record<string, string | null>): Map<string, string | null> {
  const raw = new Map<string, unknown>();
  for (const id of order) {
    raw.set(id, pairs[id] ?? null);
  }
  return sanitizeLayerParents(order, raw);
}

describe("nested layer tree", () => {
  it("sanitizes unknown, self and cyclic parents to roots", () => {
    const order = ["b", "c", "a"];
    const raw = new Map<string, unknown>([
      ["b", "missing"],
      ["c", "c"],
      ["a", "b"],
    ]);
    expect(sanitizeLayerParents(order, raw).get("b")).toBeNull();
    expect(sanitizeLayerParents(order, raw).get("c")).toBeNull();
    expect(parentsOf(["x", "y"], { x: "y", y: null }).get("x")).toBe("y");
    // Two-node cycles are broken on one side and terminate.
    const cyclic = new Map<string, unknown>([
      ["b", "a"],
      ["a", "b"],
    ]);
    const fixed = sanitizeLayerParents(["b", "a"], cyclic);
    const followsRoot = (id: string): boolean => {
      const seen = new Set<string>();
      let current: string | null | undefined = id;
      while (typeof current === "string") {
        if (seen.has(current)) {
          return false;
        }
        seen.add(current);
        current = fixed.get(current) ?? null;
      }
      return true;
    };
    expect(followsRoot("b")).toBe(true);
    expect(followsRoot("a")).toBe(true);
    expect(fixed.get("a") === null || fixed.get("b") === null).toBe(true);
  });

  it("computes depth and ancestry", () => {
    const order = ["b", "c", "a"];
    const parents = parentsOf(order, { b: null, c: "a", a: null });
    expect(layerDepth("b", parents)).toBe(0);
    expect(layerDepth("c", parents)).toBe(1);
    expect(isLayerAncestor("a", "c", parents)).toBe(true);
    expect(isLayerAncestor("c", "a", parents)).toBe(false);
    expect(isLayerAncestor("a", "a", parents)).toBe(false);
  });

  it("moves roots with their whole child blocks", () => {
    // Storage bottom -> top: B root, then A's children, then A on top.
    const order = ["b", "c1", "c2", "a"];
    const parents = parentsOf(order, { b: null, c1: "a", c2: "a", a: null });
    expect(layerBlockRange(order, parents, "a")).toEqual({ start: 1, end: 3 });
    // c2 is the top child: moving up is the edge (toward the parent).
    expect(moveLayerBlock(order, parents, "c2", "up")).toBeNull();
    // c2 down swaps with c1 inside the level.
    expect(moveLayerBlock(order, parents, "c2", "down")).toEqual(["b", "c2", "c1", "a"]);
    // Moving the root B up swaps whole blocks (B <-> A block).
    expect(moveLayerBlock(order, parents, "b", "up")).toEqual(["c1", "c2", "a", "b"]);
    expect(moveLayerBlock(order, parents, "a", "up")).toBeNull();
    expect(moveLayerBlock(order, parents, "b", "down")).toBeNull();
  });

  it("wraps inside the same level only", () => {
    const order = ["b", "c1", "c2", "a"];
    const parents = parentsOf(order, { b: null, c1: "a", c2: "a", a: null });
    expect(moveLayerBlockWrapping(order, parents, "c2", "up")).toEqual(["b", "c2", "c1", "a"]);
    expect(moveLayerBlockWrapping(order, parents, "c1", "down")).toEqual(["b", "c2", "c1", "a"]);
    // Roots wrap across the whole stack (whole blocks move).
    expect(moveLayerBlockWrapping(order, parents, "a", "up")).toEqual(["c1", "c2", "a", "b"]);
    expect(moveLayerBlockWrapping(order, parents, "b", "down")).toEqual(["c1", "c2", "a", "b"]);
  });

  it("reparents with top/bottom edges and rejects cycles", () => {
    const order = ["b", "a", "x"];
    const parents = parentsOf(order, { b: null, a: null, x: null });
    // x starts below a in storage (visually below); dropping below => bottom edge.
    const bottom = reparentLayer(order, parents, "x", "a", "bottom");
    expect(bottom?.order).toEqual(["b", "x", "a"]);
    expect(bottom?.parents.get("x")).toBe("a");
    // y starts above the parent; dropping onto it lands on top (below the parent).
    const order2 = ["b", "a", "y"];
    const parents2 = parentsOf(order2, { b: null, a: null, y: null });
    const top = reparentLayer(order2, parents2, "y", "a", "top");
    expect(top?.order).toEqual(["b", "y", "a"] satisfies string[]);
    // With existing children, top lands directly below the parent, bottom at the far edge.
    const order3 = ["b", "c1", "a", "y"];
    const parents3 = parentsOf(order3, { b: null, c1: "a", a: null, y: null });
    expect(reparentLayer(order3, parents3, "y", "a", "top")?.order).toEqual(["b", "c1", "y", "a"]);
    expect(reparentLayer(order3, parents3, "y", "a", "bottom")?.order).toEqual(["b", "y", "c1", "a"]);
    // Cycles and self-drops are rejected.
    const nested = parentsOf(["b", "c", "a"], { b: null, c: "a", a: null });
    expect(reparentLayer(["b", "c", "a"], nested, "a", "c", "top")).toBeNull();
    expect(reparentLayer(["b", "c", "a"], nested, "a", "a", "top")).toBeNull();
  });

  it("makes roots just above the old parent", () => {
    const order = ["b", "c1", "c2", "a"];
    const parents = parentsOf(order, { b: null, c1: "a", c2: "a", a: null });
    const made = makeRootLayer(order, parents, "c1");
    expect(made?.order).toEqual(["b", "c2", "a", "c1"]);
    expect(made?.parents.get("c1")).toBeNull();
    expect(makeRootLayer(order, parents, "b")).toBeNull();
  });

  it("rebuilds a contiguous order for loaded files", () => {
    // Scattered children collapse into the parent block, roots keep order.
    expect(rebuildLayerOrder(["c1", "b", "a"], parentsOf(["c1", "b", "a"], { c1: "a", b: null, a: null }))).toEqual([
      "b",
      "c1",
      "a",
    ]);
  });

  it("hides subtrees behind hidden ancestors only", () => {
    const order = ["b", "g", "c", "a"];
    const parents = parentsOf(order, { b: null, g: "c", c: "a", a: null });
    const visible = new Map<string, boolean>([
      ["b", true],
      ["g", true],
      ["c", true],
      ["a", false],
    ]);
    const isVisible = (id: string): boolean => visible.get(id) ?? true;
    expect(isEffectivelyVisible("a", parents, isVisible)).toBe(false);
    expect(isEffectivelyVisible("c", parents, isVisible)).toBe(false);
    expect(isEffectivelyVisible("g", parents, isVisible)).toBe(false);
    expect(isEffectivelyVisible("b", parents, isVisible)).toBe(true);
    visible.set("a", true);
    visible.set("c", false);
    expect(isEffectivelyVisible("c", parents, isVisible)).toBe(false);
    expect(isEffectivelyVisible("g", parents, isVisible)).toBe(false);
    expect(isEffectivelyVisible("a", parents, isVisible)).toBe(true);
  });

  it("collapses only strict descendants in the panel", () => {
    const order = ["b", "g", "c", "a"];
    const parents = parentsOf(order, { b: null, g: "c", c: "a", a: null });
    expect(isHiddenByCollapse("a", parents, new Set(["a"]))).toBe(false);
    expect(isHiddenByCollapse("c", parents, new Set(["a"]))).toBe(true);
    expect(isHiddenByCollapse("g", parents, new Set(["a"]))).toBe(true);
    expect(isHiddenByCollapse("g", parents, new Set(["c"]))).toBe(true);
    expect(isHiddenByCollapse("c", parents, new Set(["c"]))).toBe(false);
    expect(isHiddenByCollapse("b", parents, new Set(["a"]))).toBe(false);
    expect(isHiddenByCollapse("g", parents, new Set())).toBe(false);
  });
});

describe("layer masks", () => {
  it("computes white-shows black-hides texel factors", async () => {
    const { maskTexelFactor } = await import("../src/canvas/GnumarusLayerTree");
    expect(maskTexelFactor(255, 255, 255, 255, 1)).toBe(1);
    expect(maskTexelFactor(0, 0, 0, 255, 1)).toBe(0);
    expect(maskTexelFactor(123, 45, 67, 0, 1)).toBe(1);
    expect(maskTexelFactor(255, 255, 255, 255, 0)).toBe(1);
    expect(maskTexelFactor(255, 255, 255, 128, 1)).toBeCloseTo(128 / 255, 5);
  });

  it("combines masks in parent space with identity outside", async () => {
    const { combineMasksForParent } = await import("../src/canvas/GnumarusLayerTree");
    const { IDENTITY_LAYER_TRANSFORM } = await import("../src/canvas/GnumarusViewportMath");
    const white = new Uint8ClampedArray([255, 255, 255, 255]);
    const black = new Uint8ClampedArray([0, 0, 0, 255]);
    const out = combineMasksForParent(1, 1, { ...IDENTITY_LAYER_TRANSFORM }, [
      { width: 1, height: 1, buffer: white, transform: { ...IDENTITY_LAYER_TRANSFORM }, opacity: 1 },
    ]);
    expect(out?.[0]).toBe(255);
    const hidden = combineMasksForParent(1, 1, { ...IDENTITY_LAYER_TRANSFORM }, [
      { width: 1, height: 1, buffer: black, transform: { ...IDENTITY_LAYER_TRANSFORM }, opacity: 1 },
    ]);
    expect(hidden?.[0]).toBe(0);
    expect(combineMasksForParent(1, 1, { ...IDENTITY_LAYER_TRANSFORM }, [])).toBeNull();
  });

  it("clears unworkable mask flags", async () => {
    const { sanitizeLayerMasks } = await import("../src/canvas/GnumarusLayerTree");
    const order = ["m", "p", "c", "q"];
    const parents = new Map<string, string | null>([
      ["m", null],
      ["p", null],
      ["c", "p"],
      ["q", "c"],
    ]);
    const isMask = new Map<string, boolean>([
      ["m", true],
      ["p", false],
      ["c", true],
      ["q", true],
    ]);
    // m has no parent, c has a child, q's parent is a mask: all cleared.
    expect(sanitizeLayerMasks(order, parents, isMask).sort()).toEqual(["c", "m", "q"]);
    expect(isMask.get("c")).toBe(false);
  });
});

describe("indent and outdent", () => {
  it("outdents below the old parent block as its sibling", async () => {
    const { outdentLayer } = await import("../src/canvas/GnumarusLayerTree");
    // Storage bottom -> top: B root, then A's children, then A on top.
    const order = ["b", "c0", "c1", "a"];
    const parents = parentsOf(order, { b: null, c0: "a", c1: "a", a: null });
    const moved = outdentLayer(order, parents, "c1");
    expect(moved?.order).toEqual(["b", "c1", "c0", "a"]);
    expect(moved?.parents.get("c1")).toBeNull();
    // Roots and unknown ids cannot outdent.
    expect(outdentLayer(order, parents, "a")).toBeNull();
    expect(outdentLayer(order, parents, "missing")).toBeNull();
  });

  it("indents into the sibling above as the last child", async () => {
    const { indentLayerIntoAbove } = await import("../src/canvas/GnumarusLayerTree");
    const noMasks = (): boolean => false;
    // Display top -> bottom: P, C1, C0, B. C0's above sibling is C1.
    const order = ["b", "c0", "c1", "p"];
    const parents = parentsOf(order, { b: null, c0: "p", c1: "p", p: null });
    const moved = indentLayerIntoAbove(order, parents, "c0", noMasks);
    expect(moved?.order).toEqual(["b", "c0", "c1", "p"]);
    expect(moved?.parents.get("c0")).toBe("c1");
    // Top child has no sibling above.
    expect(indentLayerIntoAbove(order, parents, "c1", noMasks)).toBeNull();
    // Mask targets reject.
    expect(indentLayerIntoAbove(order, parents, "c0", (target) => target === "c1")).toBeNull();
  });

  it("round-trips indent then outdent", async () => {
    const { indentLayerIntoAbove, outdentLayer } = await import("../src/canvas/GnumarusLayerTree");
    const noMasks = (): boolean => false;
    const order = ["b", "c0", "c1", "p"];
    const parents = parentsOf(order, { b: null, c0: "p", c1: "p", p: null });
    const indented = indentLayerIntoAbove(order, parents, "c0", noMasks);
    expect(indented).not.toBeNull();
    if (indented === null) {
      return;
    }
    const restored = outdentLayer(indented.order, indented.parents, "c0");
    expect(restored?.order).toEqual(["b", "c0", "c1", "p"]);
    expect(restored?.parents.get("c0")).toBe("p");
  });
});
