import { describe, expect, it } from "vitest";
import { isModel3dDropFile, isRasterDropFile, isTextDropFile, isVectorDropFile, projectDropKind } from "../src/project/GnumarusFileSystem";

describe("isRasterDropFile", () => {
  it("accepts the picker raster types by MIME or extension", () => {
    expect(isRasterDropFile("photo.png", "image/png")).toBe(true);
    expect(isRasterDropFile("photo.jpg", "image/jpeg")).toBe(true);
    expect(isRasterDropFile("photo.jpeg", "image/jpeg")).toBe(true);
    expect(isRasterDropFile("photo.webp", "image/webp")).toBe(true);
    expect(isRasterDropFile("anim.gif", "image/gif")).toBe(true);
    expect(isRasterDropFile("scan.bmp", "image/bmp")).toBe(true);
    // Browser tabs often drop files without a MIME type; extension still matches.
    expect(isRasterDropFile("red.PNG", "")).toBe(true);
    expect(isRasterDropFile("UPPER.JPEG", "")).toBe(true);
  });

  it("rejects non-image drops (SVG needs its own importer)", () => {
    expect(isRasterDropFile("notes.txt", "text/plain")).toBe(false);
    expect(isRasterDropFile("archive.zip", "application/zip")).toBe(false);
    expect(isRasterDropFile("project.gpp", "")).toBe(false);
    expect(isRasterDropFile("noext", "")).toBe(false);
    expect(isRasterDropFile("vector.svg", "image/svg+xml")).toBe(false);
    expect(isRasterDropFile("photo.avif", "image/avif")).toBe(false);
  });
});

describe("projectDropKind", () => {
  it("routes project drops by extension", () => {
    expect(projectDropKind("art.psd")).toBe("psd");
    expect(projectDropKind("ART.PSD")).toBe("psd");
    expect(projectDropKind("art.xcf")).toBe("xcf");
    expect(projectDropKind("art.kra")).toBe("kra");
    expect(projectDropKind("art.krz")).toBe("kra");
    expect(projectDropKind("hero.ase")).toBe("ase");
    expect(projectDropKind("hero.aseprite")).toBe("ase");
    expect(projectDropKind("photo.png")).toBeNull();
    expect(projectDropKind("notes.txt")).toBeNull();
    expect(projectDropKind("noext")).toBeNull();
  });
});

describe("content drop classifiers", () => {
  it("accepts vector files", () => {
    expect(isVectorDropFile("icon.svg")).toBe(true);
    expect(isVectorDropFile("ICON.SVG")).toBe(true);
    expect(isVectorDropFile("archive.svgz")).toBe(true);
    expect(isVectorDropFile("photo.png")).toBe(false);
    expect(isVectorDropFile("model.glb")).toBe(false);
  });

  it("accepts rich-text files", () => {
    expect(isTextDropFile("page.html", "")).toBe(true);
    expect(isTextDropFile("PAGE.HTM", "")).toBe(true);
    expect(isTextDropFile("noext", "text/html")).toBe(true);
    expect(isTextDropFile("notes.txt", "text/plain")).toBe(false);
    expect(isTextDropFile("page.html.svg", "")).toBe(false);
  });

  it("accepts 3D model files the app can load", () => {
    for (const ext of ["glb", "gltf", "obj", "stl", "ply", "fbx", "dae", "3mf", "amf", "blend"]) {
      expect(isModel3dDropFile(`model.${ext}`)).toBe(true);
    }
    expect(isModel3dDropFile("MODEL.GLB")).toBe(true);
    expect(isModel3dDropFile("scene.txt")).toBe(false);
    expect(isModel3dDropFile("photo.png")).toBe(false);
  });
});
