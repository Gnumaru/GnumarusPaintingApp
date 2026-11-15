import { describe, expect, it } from "vitest";
import { zipSync } from "fflate";
import {
  GNUMARUS_PROJECT_ARCHIVE_FILE,
  GNUMARUS_PROJECT_FILE,
} from "../src/project/GnumarusProjectFormat";
import {
  parseGppArchive,
  sanitizeEmbeddedProjectName,
} from "../src/project/GnumarusFileSystem";

describe("sanitizeEmbeddedProjectName", () => {
  it("trims and accepts plain names", () => {
    expect(sanitizeEmbeddedProjectName("My Project")).toBe("My Project");
    expect(sanitizeEmbeddedProjectName("  demo-1_x  ")).toBe("demo-1_x");
    expect(sanitizeEmbeddedProjectName("a")).toBe("a");
    expect(sanitizeEmbeddedProjectName("x".repeat(64))).toBe("x".repeat(64));
  });

  it("rejects empty, long, dotted and slash names", () => {
    expect(sanitizeEmbeddedProjectName("")).toBeNull();
    expect(sanitizeEmbeddedProjectName("   ")).toBeNull();
    expect(sanitizeEmbeddedProjectName("x".repeat(65))).toBeNull();
    expect(sanitizeEmbeddedProjectName(".")).toBeNull();
    expect(sanitizeEmbeddedProjectName("..")).toBeNull();
    expect(sanitizeEmbeddedProjectName("a/b")).toBeNull();
    expect(sanitizeEmbeddedProjectName("a\\b")).toBeNull();
    expect(sanitizeEmbeddedProjectName("a\u0000b")).toBeNull();
    expect(sanitizeEmbeddedProjectName("a\nb")).toBeNull();
  });
});

function pack(entries: Record<string, string>): Uint8Array {
  const raw: Record<string, Uint8Array> = {};
  for (const [name, text] of Object.entries(entries)) {
    raw[name] = new TextEncoder().encode(text);
  }
  return zipSync(raw);
}

describe("parseGppArchive", () => {
  it("unpacks a single-root package and strips the prefix", () => {
    const bytes = pack({
      "Demo/project.gpa": "archive",
      "Demo/textures/t1.jxl": "pixels",
      "Demo/texts/n.html": "<div>x</div>",
    });
    const gpp = parseGppArchive(bytes);
    expect(gpp.projectName).toBe("Demo");
    expect([...gpp.files.keys()].sort()).toEqual(["project.gpa", "texts/n.html", "textures/t1.jxl"]);
    expect(new TextDecoder().decode(gpp.files.get("texts/n.html") as Uint8Array)).toBe("<div>x</div>");
  });

  it("accepts plain project.json packages", () => {
    const bytes = pack({ "Demo/project.json": "{}" });
    const gpp = parseGppArchive(bytes);
    expect(gpp.projectName).toBe("Demo");
    expect(gpp.files.has(GNUMARUS_PROJECT_FILE)).toBe(true);
  });

  it("rejects empty, multi-root, root-file and data-less archives", () => {
    expect(() => parseGppArchive(pack({}))).toThrow(/empty/);
    expect(() => parseGppArchive(pack({ "a/project.gpa": "x", "b/project.gpa": "y" }))).toThrow(
      /exactly one directory/,
    );
    expect(() => parseGppArchive(pack({ "project.gpa": "x" }))).toThrow(/exactly one directory/);
    expect(() => parseGppArchive(pack({ "Demo/readme.txt": "hi" }))).toThrow(
      new RegExp(`${GNUMARUS_PROJECT_ARCHIVE_FILE} or ${GNUMARUS_PROJECT_FILE}`),
    );
    expect(() => parseGppArchive(new Uint8Array([1, 2, 3]))).toThrow(/Invalid project package/);
  });

  it("rejects packages with an invalid root name", () => {
    expect(() => parseGppArchive(pack({ "../project.gpa": "x" }))).toThrow(/Invalid project package/);
  });
});
