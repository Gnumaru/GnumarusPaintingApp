import { describe, expect, it } from "vitest";
import { unzipSync, zipSync } from "fflate";
import {
  cellFilePath,
  collectProjectFileReferences,
  createDefaultProject,
  decodeProjectArchive,
  decodeTextFile,
  encodeProjectArchive,
  encodeTextArchive,
  findStaleProjectPaths,
  parseProject,
  parseTextFilePath,
  serializeProject,
  staleTextureCandidates,
  decodeSvgFile,
  encodeSvgArchive,
  model3dFilePath,
  parseModel3dExtension,
  parseModel3dFilePath,
  parseSvgFilePath,
  svgArchivePath,
  svgFilePath,
  textArchivePath,
  textFilePath,
  textureAlphaCompanion,
  textureFilePath,
  GNUMARUS_APP_ID,
  GNUMARUS_PROJECT_ARCHIVE_FILE,
  GnumarusProjectError,
} from "../src/project/GnumarusProjectFormat";

describe("GnumarusProjectFormat", () => {
  it("round-trips the default single-layer project with animation", () => {
    const project = createDefaultProject(64, 64);
    expect(project.app).toBe(GNUMARUS_APP_ID);
    expect(project.layers.length).toBe(1);
    expect(project.animation.frames).toBe(1);
    expect(project.animation.frameNames).toEqual(["F1"]);
    expect(project.animation.textures).toEqual([
      { id: "layer0", name: "t1", width: 64, height: 64, file: textureFilePath("layer0") },
    ]);
    expect(project.animation.contents).toEqual([
      {
        id: "content1",
        name: "C1",
        textureId: "layer0",
        textId: null,
        svgId: null,
        model3dId: null,
        tilemapId: null,
        transform: { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
      },
    ]);
    expect(project.animation.cells).toEqual([{ layer: "layer0", frame: 0, content: "content1" }]);
    const parsed = parseProject(serializeProject(project));
    expect(parsed).toEqual(project);
  });

  it("migrates legacy layers to a single-frame animation", () => {
    const parsed = parseProject(
      JSON.stringify({
        app: GNUMARUS_APP_ID,
        version: 1,
        width: 64,
        height: 64,
        layers: [{ id: "layer0", name: "Layer 1", visible: true, opacity: 1, cells: [{ frame: 0, file: "cells/layer0_frame0.png" }] }],
      }),
    );
    expect(parsed.layers[0]).toMatchObject({ id: "layer0" });
    expect(parsed.layers[0]?.width).toBeUndefined();
    expect(parsed.animation.frames).toBe(1);
    expect(parsed.animation.frameNames).toEqual(["F1"]);
    expect(parsed.animation.defaultFrameDuration).toBe(0.25);
    expect(parsed.animation.frameDurations).toEqual([]);
    expect(parsed.animation.textures).toEqual([
      { id: "layer0", name: "t1", width: 64, height: 64, file: "cells/layer0_frame0.png" },
    ]);
    expect(parsed.animation.cells).toEqual([{ layer: "layer0", frame: 0, content: "content1" }]);
    const reparsed = parseProject(serializeProject(parsed));
    expect(reparsed).toEqual(parsed);
  });

  it("migrates legacy layers with explicit sizes and transforms", () => {
    const parsed = parseProject(
      JSON.stringify({
        app: GNUMARUS_APP_ID,
        version: 1,
        width: 64,
        height: 64,
        layers: [
          {
            id: "layer0",
            name: "Layer 0",
            visible: true,
            opacity: 0.5,
            width: 32,
            height: 16,
            transform: { x: 1, y: 2, rotation: 0.5, flipX: true, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
            lockedChannels: { r: true, g: false, b: false, a: false },
            cells: [{ frame: 0, file: "cells/layer0_frame0.png" }],
          },
        ],
      }),
    );
    expect(parsed.animation.textures[0]).toMatchObject({ id: "layer0", width: 32, height: 16 });
    expect(parsed.animation.contents[0]).toMatchObject({
      textureId: "layer0",
      textId: null,
      svgId: null,
      model3dId: null,
      tilemapId: null,
      transform: { x: 1, y: 2, rotation: 0.5, flipX: true, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
    });
    expect(parsed.layers[0]).toMatchObject({ opacity: 0.5, lockedChannels: { r: true, g: false, b: false, a: false } });
  });

  it("round-trips shared contents across frames", () => {
    const project = createDefaultProject(8, 8);
    project.animation.frames = 3;
    project.animation.frameNames = ["Frame 1", "Frame 2", "Frame 3"];
    project.animation.contents.push({
      id: "content2",
      name: "Content 2",
      textureId: null,
      textId: null,
      svgId: null,
      model3dId: null,
      tilemapId: null,
      transform: { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
    });
    project.animation.cells.push(
      { layer: "layer0", frame: 1, content: "content1" },
      { layer: "layer0", frame: 2, content: "content2" },
    );
    project.animation.defaultFrameDuration = 0.25;
    project.animation.frameDurations = [
      { frame: 0, duration: 0.12 },
      { frame: 2, duration: 0.5 },
    ];
    const parsed = parseProject(serializeProject(project));
    expect(parsed).toEqual(project);
    expect(parsed.animation.defaultFrameDuration).toBe(0.25);
    expect(parsed.animation.frameDurations).toEqual([
      { frame: 0, duration: 0.12 },
      { frame: 2, duration: 0.5 },
    ]);
  });

  it("builds predictable texture paths", () => {
    expect(textureFilePath("layer0")).toBe("textures/layer0.png");
    expect(textureFilePath("tex12")).toBe("textures/tex12.png");
    expect(cellFilePath("layer0", 0)).toBe("cells/layer0_frame0.png");
  });

  it("rejects invalid project files", () => {
    expect(() => parseProject("not json")).toThrow(GnumarusProjectError);
    expect(() => parseProject("{}")).toThrow(GnumarusProjectError);
    expect(() =>
      parseProject(JSON.stringify({ app: "other", version: 1, width: 8, height: 8, layers: [] })),
    ).toThrow(GnumarusProjectError);
    const ok = createDefaultProject(8, 8);
    expect(() =>
      parseProject(serializeProject({ ...ok, width: 0 })),
    ).toThrow(GnumarusProjectError);
    expect(() =>
      parseProject(
        serializeProject({
          ...ok,
          animation: { ...ok.animation, frames: 0, cells: [] },
        }),
      ),
    ).toThrow(GnumarusProjectError);
    expect(() =>
      parseProject(
        serializeProject({
          ...ok,
          animation: { ...ok.animation, cells: [{ layer: "layer0", frame: 9, content: "content1" }] },
        }),
      ),
    ).toThrow(GnumarusProjectError);
    expect(() =>
      parseProject(
        serializeProject({
          ...ok,
          animation: { ...ok.animation, cells: [{ layer: "missing", frame: 0, content: "content1" }] },
        }),
      ),
    ).toThrow(GnumarusProjectError);
    expect(() =>
      parseProject(
        serializeProject({
          ...ok,
          animation: { ...ok.animation, cells: [{ layer: "layer0", frame: 0, content: "missing" }] },
        }),
      ),
    ).toThrow(GnumarusProjectError);
    expect(() =>
      parseProject(
        serializeProject({
          ...ok,
          animation: { ...ok.animation, frameDurations: [{ frame: 5, duration: 100 }] },
        }),
      ),
    ).toThrow(GnumarusProjectError);
    expect(() =>
      parseProject(
        serializeProject({
          ...ok,
          animation: {
            ...ok.animation,
            frameDurations: [
              { frame: 0, duration: 100 },
              { frame: 0, duration: 200 },
            ],
          },
        }),
      ),
    ).toThrow(GnumarusProjectError);
    expect(() =>
      parseProject(serializeProject({ ...ok, animation: { ...ok.animation, defaultFrameDuration: "fast" as unknown as number } })),
    ).toThrow(GnumarusProjectError);
    expect(() =>
      parseProject(
        serializeProject({
          ...ok,
          animation: { ...ok.animation, frameNames: ["", "Frame 2"].slice(0, 1) },
        }),
      ),
    ).toThrow(GnumarusProjectError);
    expect(() =>
      parseProject(
        JSON.stringify({
          ...JSON.parse(serializeProject(ok)) as Record<string, unknown>,
          animation: {
            ...ok.animation,
            frames: 2,
            frameNames: ["only-one"],
          },
        }),
      ),
    ).toThrow(GnumarusProjectError);
  });

  it("migrates projects without frame names to defaults", () => {
    const raw = JSON.parse(serializeProject(createDefaultProject(8, 8))) as {
      animation: Record<string, unknown>;
    } & Record<string, unknown>;
    const animation = raw.animation;
    delete animation["frameNames"];
    const parsed = parseProject(JSON.stringify(raw));
    expect(parsed.animation.frameNames).toEqual(["F1"]);
  });

  it("round-trips custom frame names", () => {
    const project = createDefaultProject(8, 8);
    project.animation.frames = 2;
    project.animation.frameNames = ["Intro", "Outro"];
    project.animation.cells.push({ layer: "layer0", frame: 1, content: "content1" });
    const parsed = parseProject(serializeProject(project));
    expect(parsed.animation.frameNames).toEqual(["Intro", "Outro"]);
  });

  it("migrates version 1 millisecond durations to seconds", () => {
    const raw = JSON.parse(serializeProject(createDefaultProject(8, 8))) as Record<string, unknown>;
    raw["version"] = 1;
    const animation = raw["animation"] as Record<string, unknown>;
    animation["frames"] = 2;
    animation["frameNames"] = ["F1", "F2"];
    animation["defaultFrameDuration"] = 250;
    animation["frameDurations"] = [{ frame: 1, duration: 500 }];
    animation["namedAnimations"] = [
      { name: "walk", loop: "forward", frames: [{ frame: 0, duration: 400 }] },
    ];
    const parsed = parseProject(JSON.stringify(raw));
    expect(parsed.version).toBe(3);
    expect(parsed.animation.defaultFrameDuration).toBe(0.25);
    expect(parsed.animation.frameDurations).toEqual([{ frame: 1, duration: 0.5 }]);
    expect(parsed.animation.namedAnimations).toEqual([
      { name: "walk", loop: "forward", frames: [{ frame: 0, duration: 0.4 }] },
    ]);
  });

  it("defaults to no named animations for legacy files", () => {
    const raw = JSON.parse(serializeProject(createDefaultProject(8, 8))) as {
      animation: Record<string, unknown>;
    } & Record<string, unknown>;
    const animation = raw.animation;
    delete animation["namedAnimations"];
    delete animation["activeAnimation"];
    const parsed = parseProject(JSON.stringify(raw));
    expect(parsed.animation.namedAnimations).toEqual([]);
    expect(parsed.animation.activeAnimation).toBeNull();
  });

  it("round-trips named animations with overrides", () => {
    const project = createDefaultProject(8, 8);
    project.animation.frames = 4;
    project.animation.frameNames = ["Frame 1", "Frame 2", "Frame 3", "Frame 4"];
    project.animation.namedAnimations = [
      {
        name: "walk",
        loop: "forward",
        frames: [
          { frame: 0, duration: 0.4 },
          { frame: 1, duration: null },
          { frame: 2, duration: null },
          { frame: 3, duration: null },
        ],
      },
      { name: "idle", loop: "ping-pong", frames: [{ frame: 1, duration: 0.2 }] },
    ];
    project.animation.activeAnimation = "walk";
    const parsed = parseProject(serializeProject(project));
    expect(parsed.animation.namedAnimations).toEqual(project.animation.namedAnimations);
    expect(parsed.animation.activeAnimation).toBe("walk");
  });

  it("rejects malformed named animations but coerces unknown selections", () => {
    const raw = JSON.parse(serializeProject(createDefaultProject(8, 8))) as {
      animation: Record<string, unknown>;
    } & Record<string, unknown>;
    const animation = raw.animation;
    animation["namedAnimations"] = [{ name: "walk", loop: "sideways", frames: [] }];
    expect(() => parseProject(JSON.stringify(raw))).toThrow(GnumarusProjectError);
    animation["namedAnimations"] = [
      { name: "walk", loop: "forward", frames: [{ frame: 0, duration: null }] },
      { name: "walk", loop: "none", frames: [] },
    ];
    expect(() => parseProject(JSON.stringify(raw))).toThrow(/duplicated animation name/);
    animation["namedAnimations"] = [{ name: "walk", loop: "forward", frames: [{ frame: 9, duration: null }] }];
    expect(() => parseProject(JSON.stringify(raw))).toThrow(GnumarusProjectError);
    animation["namedAnimations"] = [];
    animation["activeAnimation"] = "ghost";
    expect(parseProject(JSON.stringify(raw)).animation.activeAnimation).toBeNull();
    animation["activeAnimation"] = 42;
    expect(() => parseProject(JSON.stringify(raw))).toThrow(GnumarusProjectError);
  });

  it("packs the project JSON as a max-compression zip with identical bytes", () => {
    expect(GNUMARUS_PROJECT_ARCHIVE_FILE).toBe("project.gpa");
    const project = createDefaultProject(64, 64);
    project.animation.textures.push(
      ...Array.from({ length: 24 }, (_, index) => ({
        id: `layer${index + 1}`,
        name: `t${index + 1}`,
        width: 64,
        height: 64,
        file: `textures/t${index + 1}.jxl`,
      })),
    );
    const jsonText = serializeProject(project);
    const archived = encodeProjectArchive(jsonText);
    expect(Array.from(archived.slice(0, 2))).toEqual([0x50, 0x4b]);
    expect(archived.length).toBeLessThan(jsonText.length);
    const entries = unzipSync(archived);
    expect(Object.keys(entries).sort()).toEqual(["project.json"]);
    expect(new TextDecoder().decode(entries["project.json"] as Uint8Array)).toBe(jsonText);
    expect(parseProject(decodeProjectArchive(archived))).toEqual(project);
  });

  it("rejects corrupt archives with clear errors", () => {
    expect(() => decodeProjectArchive(new Uint8Array([1, 2, 3, 4]))).toThrow(/not a valid zip archive/);
    expect(() => decodeProjectArchive(new Uint8Array(0))).toThrow(/not a valid zip archive/);
    expect(() => decodeProjectArchive(zipSync({ "other.txt": new Uint8Array([1]) }))).toThrow(
      /no project\.json inside/,
    );
  });

  it("maps JPEG color files to their alpha companions", () => {
    expect(textureAlphaCompanion("textures/t1.jpg")).toBe("textures/t1.alpha.jpg");
    expect(textureAlphaCompanion("textures/t1.alpha.jpg")).toBeNull();
    expect(textureAlphaCompanion("textures/t1.png")).toBeNull();
    expect(textureAlphaCompanion("textures/t1.jxl")).toBeNull();
    expect(textureAlphaCompanion("textures/t1.webp")).toBeNull();
  });

  it("collects texture, companion and legacy cell references", () => {
    const project = createDefaultProject(64, 64);
    project.animation.textures = [
      { id: "a", name: "t1", width: 64, height: 64, file: "textures/t1.jpg" },
      { id: "b", name: "t2", width: 64, height: 64, file: "textures/t2.png" },
    ];
    project.layers = [
      {
        id: "layer0",
        name: "L1",
        visible: true,
        opacity: 1,
        lockedChannels: { r: false, g: false, b: false, a: false },
        cells: [{ frame: 0, file: "cells/layer0_frame0.png" }],
      },
    ];
    expect(collectProjectFileReferences(project)).toEqual(
      new Set(["textures/t1.jpg", "textures/t1.alpha.jpg", "textures/t2.png", "cells/layer0_frame0.png"]),
    );
  });

  it("lists every texture candidate for one stem", () => {
    expect(staleTextureCandidates("t1").sort()).toEqual(
      ["textures/t1.jxl", "textures/t1.webp", "textures/t1.png", "textures/t1.jpg", "textures/t1.alpha.jpg"].sort(),
    );
  });

  it("finds old paths missing from the new set", () => {
    expect(
      findStaleProjectPaths(
        ["project.gpa", "textures/t1.jxl", "textures/t1.alpha.jpg"],
        new Set(["project.gpa", "textures/t1.png"]),
      ).sort(),
    ).toEqual(["textures/t1.alpha.jpg", "textures/t1.jxl"].sort());
    expect(findStaleProjectPaths([], new Set(["project.gpa"]))).toEqual([]);
  });

  it("round-trips text entries shared across contents", () => {
    const project = createDefaultProject(8, 8);
    project.animation.frames = 2;
    project.animation.frameNames = ["F1", "F2"];
    project.animation.texts.push({ id: "text1", name: "T1", document: { html: "<div>Hello <b>bold</b></div>" } });
    project.animation.contents.push({
      id: "content2",
      name: "C2",
      textureId: null,
      textId: "text1",
      svgId: null,
      model3dId: null,
      tilemapId: null,
      transform: { x: 5, y: 5, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
    });
    project.animation.cells.push({ layer: "layer0", frame: 1, content: "content2" });
    const parsed = parseProject(serializeProject(project));
    expect(parsed.animation.texts).toEqual([
      { id: "text1", name: "T1", document: { html: "<div>Hello <b>bold</b></div>" } },
    ]);
    expect(parsed.animation.contents[1]).toMatchObject({ textureId: null, textId: "text1" });
  });

  it("migrates v2 projects without texts", () => {
    const project = createDefaultProject(8, 8);
    const downgraded = JSON.parse(serializeProject(project)) as Record<string, unknown>;
    downgraded["version"] = 2;
    const animation = downgraded["animation"] as Record<string, unknown>;
    delete animation["texts"];
    delete (animation["contents"] as Array<Record<string, unknown>>)[0]?.["textId"];
    const parsed = parseProject(JSON.stringify(downgraded));
    expect(parsed.version).toBe(3);
    expect(parsed.animation.texts).toEqual([]);
    expect(parsed.animation.contents[0]).toMatchObject({ textureId: "layer0", textId: null });
  });

  it("rejects unknown text references and dual texture+text contents", () => {
    const ok = createDefaultProject(8, 8);
    expect(() =>
      parseProject(
        serializeProject({
          ...ok,
          animation: {
            ...ok.animation,
            contents: [{ ...ok.animation.contents[0], textId: "missing" }],
          },
        }),
      ),
    ).toThrow(GnumarusProjectError);
    expect(() =>
      parseProject(
        serializeProject({
          ...ok,
          animation: {
            ...ok.animation,
            texts: [{ id: "text1", name: "T1", document: { html: "<div>Hi</div>" } }],
            contents: [{ ...ok.animation.contents[0], textId: "text1" }],
          },
        }),
      ),
    ).toThrow(GnumarusProjectError);
    expect(() =>
      parseProject(
        serializeProject({
          ...ok,
          animation: { ...ok.animation, texts: [{ id: "t", name: 7 as unknown as string, document: { html: "<div>x</div>" } }] },
        }),
      ),
    ).toThrow(GnumarusProjectError);
  });

  it("sanitizes text html on load", () => {
    const project = createDefaultProject(8, 8);
    project.animation.texts.push({
      id: "text1",
      name: "T1",
      document: { html: '<div onclick="evil()">x<script>bad()</script></div>' },
    });
    const parsed = parseProject(serializeProject(project));
    expect(parsed.animation.texts).toEqual([{ id: "text1", name: "T1", document: { html: "<div>x</div>" } }]);
  });

  it("maps text entries to external files and back", () => {
    expect(textFilePath("text1")).toBe("texts/text1.html");
    expect(textArchivePath("text1")).toBe("texts/text1.zip");
    expect(parseTextFilePath("texts/text1.html")).toBe("texts/text1.html");
    expect(parseTextFilePath("texts/my-text_2.zip")).toBe("texts/my-text_2.zip");
    expect(parseTextFilePath("texts/text1.png")).toBeNull();
    expect(parseTextFilePath("textures/t1.jxl")).toBeNull();
    expect(parseTextFilePath("texts/../../evil.html")).toBeNull();
    expect(parseTextFilePath("texts/.html")).toBeNull();
    expect(parseTextFilePath(undefined)).toBeNull();
  });

  it("round-trips single-file text archives", () => {
    const html = "<div>Hello <b>bold</b></div>";
    const bytes = encodeTextArchive("text1", html);
    expect(decodeTextFile("texts/text1.zip", bytes)).toBe(html);
    expect(decodeTextFile("texts/text1.html", new TextEncoder().encode(html))).toBe(html);
    expect(() => decodeTextFile("texts/text1.zip", new Uint8Array([1, 2, 3]))).toThrow(GnumarusProjectError);
    expect(() =>
      decodeTextFile("texts/text1.zip", zipSync({ "other.html": new TextEncoder().encode(html) }, { level: 9 })),
    ).toThrow(GnumarusProjectError);
    expect(() =>
      decodeTextFile(
        "texts/text1.zip",
        zipSync(
          { "text1.html": new TextEncoder().encode(html), "extra.html": new TextEncoder().encode("x") },
          { level: 9 },
        ),
      ),
    ).toThrow(GnumarusProjectError);
    expect(() => decodeTextFile("textures/t1.jxl", bytes)).toThrow(GnumarusProjectError);
  });

  it("parses external text references and rejects bad ones", () => {
    const project = createDefaultProject(8, 8);
    project.animation.texts.push({ id: "text1", name: "T1", file: "texts/text1.html" });
    project.animation.texts.push({ id: "text2", name: "T2", file: "texts/text2.zip" });
    const parsed = parseProject(serializeProject(project));
    expect(parsed.animation.texts).toEqual([
      { id: "text1", name: "T1", file: "texts/text1.html" },
      { id: "text2", name: "T2", file: "texts/text2.zip" },
    ]);
    expect(collectProjectFileReferences(parsed)).toContain("texts/text1.html");
    expect(collectProjectFileReferences(parsed)).toContain("texts/text2.zip");
    const both = createDefaultProject(8, 8);
    both.animation.texts.push({ id: "t", name: "T", document: { html: "<div>x</div>" }, file: "texts/t.html" } as never);
    expect(() => parseProject(serializeProject(both))).toThrow(GnumarusProjectError);
    const neither = createDefaultProject(8, 8);
    neither.animation.texts.push({ id: "t", name: "T" } as never);
    expect(() => parseProject(serializeProject(neither))).toThrow(GnumarusProjectError);
    for (const bad of ["texts/t.png", "texts/../t.html", "other/t.html", "texts/t.html/"]) {
      const invalid = createDefaultProject(8, 8);
      invalid.animation.texts.push({ id: "t", name: "T", file: bad });
      expect(() => parseProject(serializeProject(invalid))).toThrow(GnumarusProjectError);
    }
    const duplicate = createDefaultProject(8, 8);
    duplicate.animation.texts.push({ id: "t1", name: "A", file: "texts/shared.html" });
    duplicate.animation.texts.push({ id: "t2", name: "B", file: "texts/shared.html" });
    expect(() => parseProject(serializeProject(duplicate))).toThrow(GnumarusProjectError);
  });

  it("maps vector graphics to external files and back", () => {
    expect(svgFilePath("vec1")).toBe("svgs/vec1.svg");
    expect(svgArchivePath("vec1")).toBe("svgs/vec1.zip");
    expect(parseSvgFilePath("svgs/vec1.svg")).toBe("svgs/vec1.svg");
    expect(parseSvgFilePath("svgs/my-vec_2.zip")).toBe("svgs/my-vec_2.zip");
    expect(parseSvgFilePath("svgs/vec1.html")).toBeNull();
    expect(parseSvgFilePath("svgs/../vec1.svg")).toBeNull();
    expect(parseSvgFilePath("texts/vec1.svg")).toBeNull();
    expect(parseSvgFilePath(undefined)).toBeNull();
  });

  it("round-trips single-file vector archives", () => {
    const svg = '<svg width="10" height="10"><rect width="10" height="10"/></svg>';
    const bytes = encodeSvgArchive("vec1", svg);
    expect(decodeSvgFile("svgs/vec1.zip", bytes)).toBe(svg);
    expect(decodeSvgFile("svgs/vec1.svg", new TextEncoder().encode(svg))).toBe(svg);
    expect(() => decodeSvgFile("svgs/vec1.zip", new Uint8Array([1, 2, 3]))).toThrow(GnumarusProjectError);
    expect(() =>
      decodeSvgFile("svgs/vec1.zip", zipSync({ "other.svg": new TextEncoder().encode(svg) }, { level: 9 })),
    ).toThrow(GnumarusProjectError);
    expect(() => decodeSvgFile("texts/vec1.svg", bytes)).toThrow(GnumarusProjectError);
  });

  it("parses external vector references and rejects bad ones", () => {
    const project = createDefaultProject(8, 8);
    project.animation.svgs.push({ id: "vec1", name: "V1", document: { svg: "<svg></svg>" } });
    project.animation.svgs.push({ id: "vec2", name: "V2", file: "svgs/vec2.zip" });
    project.animation.contents.push({
      id: "content2",
      name: "C2",
      textureId: null,
      textId: null,
      svgId: "vec1",
      model3dId: null,
      tilemapId: null,
      transform: { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
    });
    const parsed = parseProject(serializeProject(project));
    expect(parsed.animation.svgs).toEqual([
      { id: "vec1", name: "V1", document: { svg: "<svg></svg>" } },
      { id: "vec2", name: "V2", file: "svgs/vec2.zip" },
    ]);
    expect(parsed.animation.contents[1]).toMatchObject({ svgId: "vec1" });
    expect(collectProjectFileReferences(parsed)).toContain("svgs/vec2.zip");
    const both = createDefaultProject(8, 8);
    both.animation.svgs.push({ id: "v", name: "V", document: { svg: "<svg></svg>" }, file: "svgs/v.svg" } as never);
    expect(() => parseProject(serializeProject(both))).toThrow(GnumarusProjectError);
    const neither = createDefaultProject(8, 8);
    neither.animation.svgs.push({ id: "v", name: "V" } as never);
    expect(() => parseProject(serializeProject(neither))).toThrow(GnumarusProjectError);
    const duplicate = createDefaultProject(8, 8);
    duplicate.animation.svgs.push({ id: "v1", name: "A", file: "svgs/shared.svg" });
    duplicate.animation.svgs.push({ id: "v2", name: "B", file: "svgs/shared.svg" });
    expect(() => parseProject(serializeProject(duplicate))).toThrow(GnumarusProjectError);
    const unknown = createDefaultProject(8, 8);
    unknown.animation.contents[0] = { ...unknown.animation.contents[0], svgId: "missing" };
    expect(() => parseProject(serializeProject(unknown))).toThrow(GnumarusProjectError);
    const dual = createDefaultProject(8, 8);
    dual.animation.texts.push({ id: "t", name: "T", document: { html: "<div>x</div>" } });
    dual.animation.contents[0] = { ...dual.animation.contents[0], textId: "t", svgId: "v" };
    dual.animation.svgs.push({ id: "v", name: "V", document: { svg: "<svg></svg>" } });
    expect(() => parseProject(serializeProject(dual))).toThrow(GnumarusProjectError);
  });

  it("maps 3D models to files and validates extensions", () => {
    expect(model3dFilePath("car1", "glb")).toBe("3dmodels/car1.glb");
    expect(model3dFilePath("car1", "GLB")).toBe("3dmodels/car1.glb");
    expect(parseModel3dExtension("car.glb")).toBe("glb");
    expect(parseModel3dExtension("CAR.FBX")).toBe("fbx");
    expect(parseModel3dExtension("car.txt")).toBeNull();
    expect(parseModel3dExtension("car")).toBeNull();
    expect(parseModel3dFilePath("3dmodels/car1.glb")).toBe("3dmodels/car1.glb");
    expect(parseModel3dFilePath("3dmodels/my-car_2.obj")).toBe("3dmodels/my-car_2.obj");
    expect(parseModel3dFilePath("3dmodels/car1.txt")).toBeNull();
    expect(parseModel3dFilePath("3dmodels/../car1.glb")).toBeNull();
    expect(parseModel3dFilePath("textures/car1.glb")).toBeNull();
    expect(parseModel3dFilePath(undefined)).toBeNull();
  });

  it("parses 3D model references and rejects bad ones", () => {
    const project = createDefaultProject(8, 8);
    project.animation.models3d.push({ id: "model1", name: "M1", file: "3dmodels/model1.glb" });
    project.animation.contents.push({
      id: "content2",
      name: "C2",
      textureId: null,
      textId: null,
      svgId: null,
      model3dId: "model1",
      tilemapId: null,
      transform: { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
    });
    const parsed = parseProject(serializeProject(project));
    expect(parsed.animation.models3d).toEqual([{ id: "model1", name: "M1", file: "3dmodels/model1.glb" }]);
    expect(parsed.animation.contents[1]).toMatchObject({ model3dId: "model1" });
    expect(collectProjectFileReferences(parsed)).toContain("3dmodels/model1.glb");
    const badExt = createDefaultProject(8, 8);
    badExt.animation.models3d.push({ id: "m", name: "M", file: "3dmodels/m.txt" });
    expect(() => parseProject(serializeProject(badExt))).toThrow(GnumarusProjectError);
    const duplicate = createDefaultProject(8, 8);
    duplicate.animation.models3d.push({ id: "m1", name: "A", file: "3dmodels/shared.obj" });
    duplicate.animation.models3d.push({ id: "m2", name: "B", file: "3dmodels/shared.obj" });
    expect(() => parseProject(serializeProject(duplicate))).toThrow(GnumarusProjectError);
    const unknown = createDefaultProject(8, 8);
    unknown.animation.contents[0] = { ...unknown.animation.contents[0], model3dId: "missing" };
    expect(() => parseProject(serializeProject(unknown))).toThrow(GnumarusProjectError);
    const dual = createDefaultProject(8, 8);
    dual.animation.texts.push({ id: "t", name: "T", document: { html: "<div>x</div>" } });
    dual.animation.contents[0] = { ...dual.animation.contents[0], textId: "t", model3dId: "v" };
    dual.animation.models3d.push({ id: "v", name: "V", file: "3dmodels/v.stl" });
    expect(() => parseProject(serializeProject(dual))).toThrow(GnumarusProjectError);
  });

  it("parses tilemaps and rejects bad ones", () => {
    const project = createDefaultProject(8, 8);
    project.animation.tilemaps.push({
      id: "tm1",
      name: "TM1",
      tilesetId: "layer0",
      tileWidth: 16,
      tileHeight: 16,
      tiles: [{ x: 0, y: 0, tx: 1, ty: 2, flipH: true, flipV: false, rot: 90 }],
    });
    project.animation.contents.push({
      id: "content2",
      name: "C2",
      textureId: null,
      textId: null,
      svgId: null,
      model3dId: null,
      tilemapId: "tm1",
      transform: { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
    });
    const parsed = parseProject(serializeProject(project));
    expect(parsed.animation.tilemaps).toEqual([
      {
        id: "tm1",
        name: "TM1",
        tilesetId: "layer0",
        tileWidth: 16,
        tileHeight: 16,
        tiles: [{ x: 0, y: 0, tx: 1, ty: 2, flipH: true, flipV: false, rot: 90 }],
      },
    ]);
    expect(parsed.animation.contents[1]).toMatchObject({ tilemapId: "tm1" });
    const missingTileset = createDefaultProject(8, 8);
    missingTileset.animation.tilemaps.push({
      id: "t",
      name: "T",
      tilesetId: "nope",
      tileWidth: 16,
      tileHeight: 16,
      tiles: [],
    });
    expect(() => parseProject(serializeProject(missingTileset))).toThrow(GnumarusProjectError);
    const badDims = createDefaultProject(8, 8);
    badDims.animation.tilemaps.push({
      id: "t",
      name: "T",
      tilesetId: "layer0",
      tileWidth: 0,
      tileHeight: 16,
      tiles: [],
    });
    expect(() => parseProject(serializeProject(badDims))).toThrow(GnumarusProjectError);
    const badTile = createDefaultProject(8, 8);
    badTile.animation.tilemaps.push({
      id: "t",
      name: "T",
      tilesetId: "layer0",
      tileWidth: 16,
      tileHeight: 16,
      tiles: [{ x: 0, y: 0, tx: 0, ty: 0, flipH: false, flipV: false, rot: 45 }],
    } as never);
    expect(() => parseProject(serializeProject(badTile))).toThrow(GnumarusProjectError);
    const duplicate = createDefaultProject(8, 8);
    duplicate.animation.tilemaps.push({
      id: "t",
      name: "A",
      tilesetId: "layer0",
      tileWidth: 16,
      tileHeight: 16,
      tiles: [{ x: 0, y: 0, tx: 0, ty: 0, flipH: false, flipV: false, rot: 0 }],
    });
    duplicate.animation.tilemaps.push({
      id: "t",
      name: "B",
      tilesetId: "layer0",
      tileWidth: 16,
      tileHeight: 16,
      tiles: [],
    });
    expect(() => parseProject(serializeProject(duplicate))).toThrow(GnumarusProjectError);
    const unknown = createDefaultProject(8, 8);
    unknown.animation.contents[0] = { ...unknown.animation.contents[0], tilemapId: "missing" };
    expect(() => parseProject(serializeProject(unknown))).toThrow(GnumarusProjectError);
    const dual = createDefaultProject(8, 8);
    dual.animation.tilemaps.push({
      id: "t",
      name: "T",
      tilesetId: "layer0",
      tileWidth: 8,
      tileHeight: 8,
      tiles: [],
    });
    dual.animation.contents[0] = { ...dual.animation.contents[0], textId: "t", tilemapId: "t" };
    dual.animation.texts.push({ id: "t", name: "T", document: { html: "<div>x</div>" } });
    expect(() => parseProject(serializeProject(dual))).toThrow(GnumarusProjectError);
  });
});
