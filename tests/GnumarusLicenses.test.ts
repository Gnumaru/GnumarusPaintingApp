import { describe, expect, it } from "vitest";
import { GNUMARUS_LICENSES } from "../src/licenses/GnumarusLicenses";

describe("GnumarusLicenses table", () => {
  it("lists every bundled dependency that requires attribution", () => {
    const names = GNUMARUS_LICENSES.map((entry) => entry.name).sort();
    expect(names).toEqual([
      "fast-xml-parser",
      "fflate",
      "gifenc",
      "libjxl",
      "libwebp",
      "lit",
      "three",
    ]);
  });

  it("has complete, self-consistent entries", () => {
    const seen = new Set<string>();
    for (const entry of GNUMARUS_LICENSES) {
      expect(entry.name.length).toBeGreaterThan(0);
      expect(seen.has(entry.name)).toBe(false);
      seen.add(entry.name);
      expect(entry.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(entry.source.length).toBeGreaterThan(0);
      expect(["MIT", "BSD-3-Clause"]).toContain(entry.license);
      // The copyright notice must appear verbatim in the license text,
      // which is what the MIT/BSD attribution clauses require.
      expect(entry.copyright.length).toBeGreaterThan(10);
      expect(entry.text).toContain(entry.copyright);
      expect(entry.text.length).toBeGreaterThan(500);
    }
  });

  it("pins the git submodules to their checked-in tags", () => {
    const byName = new Map(GNUMARUS_LICENSES.map((entry) => [entry.name, entry]));
    expect(byName.get("libjxl")?.version).toBe("0.12.0");
    expect(byName.get("libwebp")?.version).toBe("1.6.0");
    expect(byName.get("libjxl")?.source).toContain("third_party/libjxl");
    expect(byName.get("libwebp")?.source).toContain("third_party/libwebp");
  });
});
