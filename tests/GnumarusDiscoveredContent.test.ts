import { describe, expect, it } from "vitest";
import {
  GNUMARUS_PROJECT_CONTENT_DIRS,
  cellFilePath,
  classifyDiscoveredContentFile,
  model3dFilePath,
  svgArchivePath,
  svgFilePath,
  textArchivePath,
  textFilePath,
  textureFilePath,
} from "../src/project/GnumarusProjectFormat";
import {
  ensureProjectContentDirs,
  scanProjectContentFiles,
} from "../src/project/GnumarusFileSystem";

describe("discovered content classification", () => {
  it("covers every content directory helper", () => {
    const dirs = new Set(
      [cellFilePath("x", 0), textureFilePath("x", "png"), textFilePath("x"), textArchivePath("x"), svgFilePath("x"), svgArchivePath("x"), model3dFilePath("x", "obj")]
        .map((file) => file.split("/")[0]),
    );
    for (const dir of ["textures", "texts", "svgs", "3dmodels"]) {
      expect([...dirs]).toContain(dir);
      expect([...GNUMARUS_PROJECT_CONTENT_DIRS]).toContain(dir);
    }
  });

  it("accepts only the right type in the right directory", () => {
    expect(classifyDiscoveredContentFile("textures/hero.png")).toBe("texture");
    expect(classifyDiscoveredContentFile("textures/IMG.JPG")).toBe("texture");
    expect(classifyDiscoveredContentFile("textures/anim.webp")).toBe("texture");
    expect(classifyDiscoveredContentFile("textures/photo.jxl")).toBe("texture");
    expect(classifyDiscoveredContentFile("texts/note.html")).toBe("text");
    expect(classifyDiscoveredContentFile("texts/packed.zip")).toBe("text");
    expect(classifyDiscoveredContentFile("svgs/art.svg")).toBe("svg");
    expect(classifyDiscoveredContentFile("svgs/packed.zip")).toBe("svg");
    expect(classifyDiscoveredContentFile("3dmodels/part.obj")).toBe("model3d");
    expect(classifyDiscoveredContentFile("3dmodels/scene.GLTF")).toBe("model3d");
  });

  it("ignores companions, wrong extensions, wrong dirs and traversal", () => {
    expect(classifyDiscoveredContentFile("textures/x.alpha.jpg")).toBeNull();
    expect(classifyDiscoveredContentFile("textures/notes.txt")).toBeNull();
    expect(classifyDiscoveredContentFile("textures/noext")).toBeNull();
    expect(classifyDiscoveredContentFile("svgs/note.png")).toBeNull();
    expect(classifyDiscoveredContentFile("texts/image.png")).toBeNull();
    expect(classifyDiscoveredContentFile("3dmodels/image.png")).toBeNull();
    expect(classifyDiscoveredContentFile("cells/layer0_frame0.png")).toBeNull();
    expect(classifyDiscoveredContentFile("project.json")).toBeNull();
    expect(classifyDiscoveredContentFile("textures/../project.json")).toBeNull();
    expect(classifyDiscoveredContentFile("textures//x.png")).toBeNull();
    expect(classifyDiscoveredContentFile("other/x.png")).toBeNull();
    expect(classifyDiscoveredContentFile(42)).toBeNull();
    expect(classifyDiscoveredContentFile(null)).toBeNull();
  });
});

/** Minimal in-memory directory handle for filesystem unit tests. */
interface FakeEntry {
  kind: string;
  name: string;
}

class FakeFileHandle {
  bytes: Uint8Array;
  constructor(bytes: Uint8Array = new Uint8Array(0)) {
    this.bytes = bytes;
  }
  async getFile(): Promise<{ arrayBuffer(): Promise<ArrayBuffer> }> {
    const copy = this.bytes.slice().buffer as ArrayBuffer;
    return { arrayBuffer: (): Promise<ArrayBuffer> => Promise.resolve(copy) };
  }
  createWritable(): Promise<{ write(data: Blob): Promise<void>; close(): Promise<void> }> {
    return Promise.resolve({
      write: async (data: Blob): Promise<void> => {
        this.bytes = new Uint8Array(await data.arrayBuffer());
      },
      close: async (): Promise<void> => {},
    });
  }
}

class FakeDirHandle {
  readonly name: string;
  readonly files = new Map<string, FakeFileHandle>();
  readonly dirs = new Map<string, FakeDirHandle>();
  constructor(name: string) {
    this.name = name;
  }
  async getFileHandle(name: string, options?: { create?: boolean }): Promise<FakeFileHandle> {
    const found = this.files.get(name);
    if (found !== undefined) {
      return found;
    }
    if (options?.create !== true) {
      throw new DOMException("File not found", "NotFoundError");
    }
    const created = new FakeFileHandle();
    this.files.set(name, created);
    return created;
  }
  async *values(): AsyncIterable<FakeEntry> {
    for (const name of this.dirs.keys()) {
      yield { kind: "directory", name };
    }
    for (const name of this.files.keys()) {
      yield { kind: "file", name };
    }
  }
  async getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FakeDirHandle> {
    const found = this.dirs.get(name);
    if (found !== undefined) {
      return found;
    }
    if (options?.create !== true) {
      throw new DOMException("File not found", "NotFoundError");
    }
    const created = new FakeDirHandle(name);
    this.dirs.set(name, created);
    return created;
  }
  async removeEntry(name: string): Promise<void> {
    if (!this.files.delete(name) && !this.dirs.delete(name)) {
      throw new DOMException("File not found", "NotFoundError");
    }
  }
}

describe("project content directories", () => {
  it("creates every content dir even when empty", async () => {
    const root = new FakeDirHandle("Mock");
    await ensureProjectContentDirs(root as never);
    expect([...root.dirs.keys()].sort()).toEqual(["3dmodels", "svgs", "texts", "textures"]);
  });
});

describe("scanProjectContentFiles", () => {
  function seed(): FakeDirHandle {
    const root = new FakeDirHandle("Mock");
    const textures = new FakeDirHandle("textures");
    textures.files.set("extra.png", new FakeFileHandle(new Uint8Array([1, 2, 3])));
    textures.files.set("x.alpha.jpg", new FakeFileHandle(new Uint8Array([4])));
    textures.files.set("notes.txt", new FakeFileHandle(new Uint8Array([5])));
    textures.dirs.set("nested", new FakeDirHandle("nested"));
    const texts = new FakeDirHandle("texts");
    texts.files.set("doc.html", new FakeFileHandle(new Uint8Array([6])));
    const svgs = new FakeDirHandle("svgs");
    svgs.files.set("note.png", new FakeFileHandle(new Uint8Array([7])));
    svgs.files.set("art.svg", new FakeFileHandle(new Uint8Array([8])));
    const models = new FakeDirHandle("3dmodels");
    models.files.set("part.obj", new FakeFileHandle(new Uint8Array([9])));
    models.files.set("junk.png", new FakeFileHandle(new Uint8Array([10])));
    root.dirs.set("textures", textures);
    root.dirs.set("texts", texts);
    root.dirs.set("svgs", svgs);
    root.dirs.set("3dmodels", models);
    return root;
  }

  it("finds only unreferenced, correctly-typed files", async () => {
    const root = seed();
    const referenced = new Set(["textures/extra.png"]);
    const found = await scanProjectContentFiles(root as never, referenced);
    expect(found).toEqual([
      { kind: "model3d", file: "3dmodels/part.obj" },
      { kind: "svg", file: "svgs/art.svg" },
      { kind: "text", file: "texts/doc.html" },
    ]);
  });

  it("skips missing or unlistable directories", async () => {
    const empty = new FakeDirHandle("Empty");
    expect(await scanProjectContentFiles(empty as never, new Set())).toEqual([]);
    const noList = new FakeDirHandle("NoList");
    const textures = new FakeDirHandle("textures");
    textures.files.set("extra.png", new FakeFileHandle(new Uint8Array([1])));
    (textures as unknown as { values?: unknown }).values = undefined;
    noList.dirs.set("textures", textures);
    expect(await scanProjectContentFiles(noList as never, new Set())).toEqual([]);
  });
});
