import { describe, expect, it } from "vitest";
import {
  commitsApiUrl,
  GNUMARUS_UPDATE_BRANCH,
  GNUMARUS_UPDATE_CHECK_MS,
  GNUMARUS_UPDATE_COOLDOWN_MS,
  GNUMARUS_UPDATE_REPO,
  isCommitSha,
  isLocalhostHostname,
  isOutdatedBuild,
  parseLatestCommitSha,
  repoSlugFromSourceUrl,
  shouldCheckForUpdates,
} from "../src/project/GnumarusUpdateCheck";

describe("GnumarusUpdateCheck", () => {
  it("targets the source repo master branch with a polite cadence", () => {
    expect(GNUMARUS_UPDATE_REPO).toBe("Gnumaru/GnumarusPaintingApp");
    expect(GNUMARUS_UPDATE_BRANCH).toBe("master");
    expect(commitsApiUrl(GNUMARUS_UPDATE_REPO, GNUMARUS_UPDATE_BRANCH)).toBe(
      "https://api.github.com/repos/Gnumaru/GnumarusPaintingApp/commits/master",
    );
    expect(GNUMARUS_UPDATE_CHECK_MS).toBe(10_000);
    expect(GNUMARUS_UPDATE_COOLDOWN_MS).toBe(10 * 60 * 1000);
  });

  it("parses owner/name slugs out of GitHub URLs", () => {
    expect(repoSlugFromSourceUrl("https://github.com/Gnumaru/GnumarusPaintingApp")).toBe(
      "Gnumaru/GnumarusPaintingApp",
    );
    expect(repoSlugFromSourceUrl("https://github.com/Gnumaru/GnumarusPaintingApp/")).toBe(
      "Gnumaru/GnumarusPaintingApp",
    );
    expect(repoSlugFromSourceUrl("https://github.com/Gnumaru/GnumarusPaintingApp.git")).toBe(
      "Gnumaru/GnumarusPaintingApp",
    );
    expect(repoSlugFromSourceUrl("https://example.com/a/b")).toBeNull();
    expect(repoSlugFromSourceUrl("not a url")).toBeNull();
    expect(repoSlugFromSourceUrl("")).toBeNull();
  });

  it("detects localhost hostnames to skip the check", () => {
    expect(isLocalhostHostname("localhost")).toBe(true);
    expect(isLocalhostHostname("127.0.0.1")).toBe(true);
    expect(isLocalhostHostname("::1")).toBe(true);
    expect(isLocalhostHostname("")).toBe(true);
    expect(isLocalhostHostname("LOCALHOST")).toBe(true);
    expect(isLocalhostHostname("gnumaru.github.io")).toBe(false);
    expect(isLocalhostHostname("192.168.0.10")).toBe(false);
  });

  it("validates commit SHAs", () => {
    expect(isCommitSha("dc0b1315c709bafbbe0272f7124708443d2e30f9")).toBe(true);
    expect(isCommitSha("DC0B1315C709BAFBBE0272F7124708443D2E30F9")).toBe(true);
    expect(isCommitSha("abc123")).toBe(false);
    expect(isCommitSha("")).toBe(false);
    expect(isCommitSha(null)).toBe(false);
    expect(isCommitSha(42)).toBe(false);
  });

  it("parses the newest commit SHA out of the API payload", () => {
    const sha = "dc0b1315c709bafbbe0272f7124708443d2e30f9";
    expect(parseLatestCommitSha({ sha })).toBe(sha);
    expect(parseLatestCommitSha([{ sha }])).toBe(sha);
    expect(parseLatestCommitSha({})).toBeNull();
    expect(parseLatestCommitSha([])).toBeNull();
    expect(parseLatestCommitSha(null)).toBeNull();
    expect(parseLatestCommitSha("dc0b1315")).toBeNull();
    expect(parseLatestCommitSha({ sha: "xyz" })).toBeNull();
  });

  it("flags outdated builds only for two valid differing SHAs", () => {
    const a = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const b = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    expect(isOutdatedBuild(a, a)).toBe(false);
    expect(isOutdatedBuild(a.toUpperCase(), a)).toBe(false);
    expect(isOutdatedBuild(a, b)).toBe(true);
    expect(isOutdatedBuild("dev", b)).toBe(false);
    expect(isOutdatedBuild(a, "unknown")).toBe(false);
    expect(isOutdatedBuild("", "")).toBe(false);
  });

  it("runs only off localhost with a valid embedded SHA", () => {
    const sha = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    expect(shouldCheckForUpdates("gnumaru.github.io", sha)).toBe(true);
    expect(shouldCheckForUpdates("10.0.0.5", sha)).toBe(true);
    expect(shouldCheckForUpdates("localhost", sha)).toBe(false);
    expect(shouldCheckForUpdates("127.0.0.1", sha)).toBe(false);
    expect(shouldCheckForUpdates("gnumaru.github.io", "dev")).toBe(false);
    expect(shouldCheckForUpdates("gnumaru.github.io", "")).toBe(false);
    expect(shouldCheckForUpdates("localhost", "dev")).toBe(false);
  });
});
