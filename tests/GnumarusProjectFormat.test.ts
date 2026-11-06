import { describe, expect, it } from "vitest";
import {
  cellFilePath,
  createDefaultProject,
  parseProject,
  serializeProject,
  textureFilePath,
  GNUMARUS_APP_ID,
  GnumarusProjectError,
} from "../src/project/GnumarusProjectFormat";

describe("GnumarusProjectFormat", () => {
  it("round-trips the default single-layer project with animation", () => {
    const project = createDefaultProject(64, 64);
    expect(project.app).toBe(GNUMARUS_APP_ID);
    expect(project.layers.length).toBe(1);
    expect(project.animation.frames).toBe(1);
    expect(project.animation.frameNames).toEqual(["Frame 1"]);
    expect(project.animation.textures).toEqual([
      { id: "layer0", name: "Layer 1 pixels", width: 64, height: 64, file: textureFilePath("layer0") },
    ]);
    expect(project.animation.contents).toEqual([
      {
        id: "content1",
        name: "Content 1",
        textureId: "layer0",
        transform: { x: 0, y: 0, rotation: 0, flipX: false, flipY: false },
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
    expect(parsed.animation.frameNames).toEqual(["Frame 1"]);
    expect(parsed.animation.defaultFrameDuration).toBe(100);
    expect(parsed.animation.frameDurations).toEqual([]);
    expect(parsed.animation.textures).toEqual([
      { id: "layer0", name: "Layer 1 pixels", width: 64, height: 64, file: "cells/layer0_frame0.png" },
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
            transform: { x: 1, y: 2, rotation: 0.5, flipX: true, flipY: false },
            lockedChannels: { r: true, g: false, b: false, a: false },
            cells: [{ frame: 0, file: "cells/layer0_frame0.png" }],
          },
        ],
      }),
    );
    expect(parsed.animation.textures[0]).toMatchObject({ id: "layer0", width: 32, height: 16 });
    expect(parsed.animation.contents[0]).toMatchObject({
      textureId: "layer0",
      transform: { x: 1, y: 2, rotation: 0.5, flipX: true, flipY: false },
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
      transform: { x: 0, y: 0, rotation: 0, flipX: false, flipY: false },
    });
    project.animation.cells.push(
      { layer: "layer0", frame: 1, content: "content1" },
      { layer: "layer0", frame: 2, content: "content2" },
    );
    project.animation.defaultFrameDuration = 100;
    project.animation.frameDurations = [
      { frame: 0, duration: 120 },
      { frame: 2, duration: 500 },
    ];
    const parsed = parseProject(serializeProject(project));
    expect(parsed).toEqual(project);
    expect(parsed.animation.defaultFrameDuration).toBe(100);
    expect(parsed.animation.frameDurations).toEqual([
      { frame: 0, duration: 120 },
      { frame: 2, duration: 500 },
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
    expect(parsed.animation.frameNames).toEqual(["Frame 1"]);
  });

  it("round-trips custom frame names", () => {
    const project = createDefaultProject(8, 8);
    project.animation.frames = 2;
    project.animation.frameNames = ["Intro", "Outro"];
    project.animation.cells.push({ layer: "layer0", frame: 1, content: "content1" });
    const parsed = parseProject(serializeProject(project));
    expect(parsed.animation.frameNames).toEqual(["Intro", "Outro"]);
  });
});
