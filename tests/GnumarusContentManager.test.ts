import { describe, expect, it } from "vitest";
import {
  countSvgElements,
  formatContentBytes,
  modelMeta,
  searchManagedItems,
  textureMeta,
  type GnumarusManagedItem,
} from "../src/content/GnumarusContentManager";

function item(name: string): GnumarusManagedItem {
  return {
    kind: "texture",
    id: name,
    name,
    sizeBytes: 10,
    meta: "",
    usage: { count: 0, cells: [] },
  };
}

describe("GnumarusContentManager", () => {
  it("formats byte counts", () => {
    expect(formatContentBytes(0)).toBe("0 B");
    expect(formatContentBytes(512)).toBe("512 B");
    expect(formatContentBytes(1023)).toBe("1023 B");
    expect(formatContentBytes(1024)).toBe("1 KB");
    expect(formatContentBytes(1536)).toBe("1.5 KB");
    expect(formatContentBytes(1048576)).toBe("1 MB");
    expect(formatContentBytes(-5)).toBe("0 B");
  });

  it("counts svg graphic elements", () => {
    expect(countSvgElements(`<svg><path d="M0 0h1"/><rect width="2" height="2"/><circle r="1"/></svg>`)).toBe(3);
    expect(countSvgElements(`<svg><g><ellipse rx="1" ry="2"/><line x1="0" y1="0" x2="1" y2="1"/></g></svg>`)).toBe(2);
    expect(countSvgElements(`<svg><defs><linearGradient/></defs></svg>`)).toBe(0);
    expect(countSvgElements(`not xml`)).toBe(0);
  });

  it("builds locale-neutral meta lines", () => {
    expect(textureMeta(64, 32)).toBe("64 × 32");
    expect(modelMeta("stl")).toBe(".stl");
    expect(modelMeta(".obj")).toBe(".obj");
  });

  it("searches by name similarity like the action palette", () => {
    const items = [item("Wood tileset"), item("Hero sprite"), item("Wooden crate")];
    expect(searchManagedItems(items, "").map((entry) => entry.name)).toEqual([
      "Hero sprite",
      "Wood tileset",
      "Wooden crate",
    ]);
    expect(searchManagedItems(items, "wood").map((entry) => entry.name)).toEqual(["Wood tileset", "Wooden crate"]);
    expect(searchManagedItems(items, "zzz")).toEqual([]);
  });
});
