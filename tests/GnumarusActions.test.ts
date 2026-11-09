import { describe, expect, it } from "vitest";
import {
  actionBlockedMessage,
  GnumarusActionError,
  GnumarusActionRegistry,
  requireFloatingSelection,
  requireTool,
  searchActions,
  type GnumarusAction,
} from "../src/actions/GnumarusActions";

function makeAction(overrides: Partial<GnumarusAction> & { id: string }): GnumarusAction {
  return {
    name: overrides.id,
    requirements: [],
    run: (): void => {},
    ...overrides,
  };
}

describe("GnumarusActions", () => {
  it("lists registered actions alphabetically", () => {
    const registry = new GnumarusActionRegistry();
    registry.register(makeAction({ id: "zebra", name: "Zebra" }));
    registry.register(makeAction({ id: "apple", name: "Apple" }));
    registry.register(makeAction({ id: "mango", name: "Mango" }));
    expect(registry.actions().map((action) => action.name)).toEqual(["Apple", "Mango", "Zebra"]);
    expect(registry.get("mango")?.name).toBe("Mango");
    expect(registry.get("missing")).toBeUndefined();
  });

  it("rejects duplicates and malformed actions", () => {
    const registry = new GnumarusActionRegistry();
    registry.register(makeAction({ id: "a", name: "A" }));
    expect(() => registry.register(makeAction({ id: "a", name: "A again" }))).toThrow(GnumarusActionError);
    expect(() => registry.register(makeAction({ id: "  ", name: "Blank" }))).toThrow(GnumarusActionError);
    expect(() => registry.register(makeAction({ id: "b", name: "  " }))).toThrow(GnumarusActionError);
  });

  it("runs actions whose requirements hold and reports the rest", () => {
    const registry = new GnumarusActionRegistry();
    let ran = 0;
    registry.register(
      makeAction({
        id: "free",
        name: "Free",
        run: (): void => {
          ran += 1;
        },
      }),
    );
    registry.register(
      makeAction({
        id: "gated",
        name: "Gated",
        requirements: [requireTool("pencil", "Pencil"), requireFloatingSelection()],
        run: (): void => {
          ran += 100;
        },
      }),
    );
    expect(registry.execute("free", { tool: "loupe", hasFloatingSelection: false })).toEqual({ ok: true });
    expect(ran).toBe(1);
    expect(registry.execute("missing", { tool: "pencil", hasFloatingSelection: true }).ok).toBe(false);
    expect(ran).toBe(1);
    const blocked = registry.execute("gated", { tool: "loupe", hasFloatingSelection: false });
    expect(blocked).toEqual({
      ok: false,
      reasons: ["the Pencil tool selected", "an active floating selection"],
    });
    expect(ran).toBe(1);
    const partial = registry.execute("gated", { tool: "pencil", hasFloatingSelection: false });
    expect(partial).toEqual({ ok: false, reasons: ["an active floating selection"] });
    expect(registry.execute("gated", { tool: "pencil", hasFloatingSelection: true })).toEqual({ ok: true });
    expect(ran).toBe(101);
  });

  it("formats the blocked message", () => {
    expect(actionBlockedMessage("Commit Float", ["an active floating selection"])).toBe(
      'Cannot run "Commit Float": requires an active floating selection.',
    );
    expect(actionBlockedMessage("Paint", ["the Pencil tool selected", "an active floating selection"])).toBe(
      'Cannot run "Paint": requires the Pencil tool selected and an active floating selection.',
    );
  });

  it("lists everything alphabetically for an empty query", () => {
    const actions = [makeAction({ id: "z", name: "Zebra" }), makeAction({ id: "a", name: "Apple" })];
    expect(searchActions(actions, "").map((action) => action.name)).toEqual(["Apple", "Zebra"]);
    expect(searchActions(actions, "   ").map((action) => action.name)).toEqual(["Apple", "Zebra"]);
  });

  it("ranks exact, prefix, substring and fuzzy matches", () => {
    const actions = [
      makeAction({ id: "1", name: "Merge floating selection" }),
      makeAction({ id: "2", name: "Reset canvas transform" }),
      makeAction({ id: "3", name: "Commit floating selection" }),
      makeAction({ id: "4", name: "Resize layer" }),
    ];
    expect(searchActions(actions, "reset canvas transform").map((action) => action.id)).toEqual(["2"]);
    expect(searchActions(actions, "res").map((action) => action.id)).toEqual(["2", "4"]);
    expect(searchActions(actions, "CANVAS").map((action) => action.id)).toEqual(["2"]);
    expect(searchActions(actions, "float").map((action) => action.id)).toEqual(["1", "3"]);
    expect(searchActions(actions, "rct").map((action) => action.id)).toEqual(["2"]);
    expect(searchActions(actions, "zzz")).toEqual([]);
  });
});
