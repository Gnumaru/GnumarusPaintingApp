import { describe, expect, it } from "vitest";
import { isRasterDropFile, projectDropKind } from "../src/project/GnumarusFileSystem";

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
