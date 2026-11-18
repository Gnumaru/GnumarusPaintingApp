import { describe, expect, it } from "vitest";
import { GNUMARUS_PAGES_URL, gnumarusManualPath, isGitHubPagesDeploy } from "../src/shell/GnumarusDeploy";

describe("GnumarusDeploy", () => {
  it("points at the public Pages build", () => {
    expect(GNUMARUS_PAGES_URL).toBe("https://gnumaru.github.io/GnumarusPaintingApp/");
  });

  it("detects the production deploy by host and app path", () => {
    expect(isGitHubPagesDeploy("gnumaru.github.io", "/GnumarusPaintingApp")).toBe(true);
    expect(isGitHubPagesDeploy("gnumaru.github.io", "/GnumarusPaintingApp/")).toBe(true);
    expect(isGitHubPagesDeploy("gnumaru.github.io", "/GnumarusPaintingApp/sub")).toBe(true);
    expect(isGitHubPagesDeploy("GNUMARU.GITHUB.IO", "/GnumarusPaintingApp/")).toBe(true);
    expect(isGitHubPagesDeploy("gnumaru.github.io", "/")).toBe(false);
    expect(isGitHubPagesDeploy("gnumaru.github.io", "/OtherApp")).toBe(false);
    expect(isGitHubPagesDeploy("gnumaru.github.io", "/GnumarusPaintingApp2")).toBe(false);
    expect(isGitHubPagesDeploy("localhost", "/GnumarusPaintingApp")).toBe(false);
    expect(isGitHubPagesDeploy("127.0.0.1", "/")).toBe(false);
    expect(isGitHubPagesDeploy("", "/")).toBe(false);
    expect(isGitHubPagesDeploy("example.com", "/GnumarusPaintingApp")).toBe(false);
  });

  it("resolves the manual subpath per locale", () => {
    expect(gnumarusManualPath("en")).toBe("manual/en/");
    expect(gnumarusManualPath("pt-BR")).toBe("manual/pt_BR/");
  });
});
