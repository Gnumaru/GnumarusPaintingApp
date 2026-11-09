import { describe, expect, it } from "vitest";
import {
  exportBaseName,
  findStillFormat,
  frameFileStem,
  GNUMARUS_BASE_STILL_FORMATS,
  GNUMARUS_EXTRA_STILL_FORMATS,
} from "../src/export/GnumarusImageExport";

describe("GnumarusImageExport", () => {
  it("lists PNG, JPEG and WebP as base formats", () => {
    expect(GNUMARUS_BASE_STILL_FORMATS.map((format) => format.mime)).toEqual([
      "image/png",
      "image/jpeg",
      "image/webp",
    ]);
    expect(GNUMARUS_BASE_STILL_FORMATS.find((format) => format.mime === "image/jpeg")?.alpha).toBe(false);
    expect(GNUMARUS_BASE_STILL_FORMATS.find((format) => format.mime === "image/png")?.alpha).toBe(true);
    expect(GNUMARUS_EXTRA_STILL_FORMATS.length).toBeGreaterThan(0);
  });

  it("finds formats by mime", () => {
    expect(findStillFormat(GNUMARUS_BASE_STILL_FORMATS, "image/png")?.ext).toBe("png");
    expect(findStillFormat(GNUMARUS_BASE_STILL_FORMATS, "image/gif")).toBeNull();
  });

  it("builds zero-padded frame stems", () => {
    expect(frameFileStem("walk", 0)).toBe("walk-001");
    expect(frameFileStem("walk", 41)).toBe("walk-042");
  });

  it("falls back to export for blank project names", () => {
    expect(exportBaseName("My Project")).toBe("My Project");
    expect(exportBaseName("   ")).toBe("export");
    expect(exportBaseName("")).toBe("export");
  });
});
