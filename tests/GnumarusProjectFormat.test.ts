import { describe, expect, it } from "vitest";
import {
  cellFilePath,
  createDefaultProject,
  parseProject,
  serializeProject,
  GNUMARUS_APP_ID,
  GnumarusProjectError,
} from "../src/project/GnumarusProjectFormat";

describe("GnumarusProjectFormat", () => {
  it("round-trips the default single-layer project", () => {
    const project = createDefaultProject(64, 64);
    expect(project.app).toBe(GNUMARUS_APP_ID);
    expect(project.layers.length).toBe(1);
    const parsed = parseProject(serializeProject(project));
    expect(parsed).toEqual(project);
  });

  it("builds predictable cell paths", () => {
    expect(cellFilePath("layer0", 0)).toBe("cells/layer0_frame0.png");
    expect(cellFilePath("layer2", 12)).toBe("cells/layer2_frame12.png");
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
  });
});
