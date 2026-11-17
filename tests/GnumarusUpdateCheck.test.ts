import { describe, expect, it } from "vitest";
import {
  buildCacheBustedReloadUrl,
  extractEntryScriptUrl,
  GNUMARUS_UPDATE_CHECK_MS,
  isCommitSha,
  isLocalhostHostname,
  resolveEntryScriptUrl,
  shouldCheckForUpdates,
  stripReloadCacheBuster,
} from "../src/project/GnumarusUpdateCheck";

describe("GnumarusUpdateCheck", () => {
  it("polls on a polite fixed cadence", () => {
    expect(GNUMARUS_UPDATE_CHECK_MS).toBe(10_000);
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

  it("resolves entry script URLs against the document URL", () => {
    expect(resolveEntryScriptUrl("./assets/index-abc123.js", "https://gnumaru.github.io/app/")).toBe(
      "https://gnumaru.github.io/app/assets/index-abc123.js",
    );
    expect(resolveEntryScriptUrl("/assets/index-abc123.js", "https://gnumaru.github.io/nested/path/")).toBe(
      "https://gnumaru.github.io/assets/index-abc123.js",
    );
    expect(resolveEntryScriptUrl(null, "https://gnumaru.github.io/app/")).toBeNull();
    expect(resolveEntryScriptUrl("", "https://gnumaru.github.io/app/")).toBeNull();
    expect(resolveEntryScriptUrl("./assets/x.js", "not a base")).toBeNull();
  });

  it("extracts the entry script URL from deployed index.html", () => {
    const html =
      '<!doctype html><html><head><script type="module" src="./assets/index-abc123.js"></script></head><body></body></html>';
    expect(extractEntryScriptUrl(html, "https://gnumaru.github.io/app/")).toBe(
      "https://gnumaru.github.io/app/assets/index-abc123.js",
    );
    expect(extractEntryScriptUrl("<html><body>no scripts</body></html>", "https://gnumaru.github.io/app/")).toBeNull();
    expect(extractEntryScriptUrl("", "https://gnumaru.github.io/app/")).toBeNull();
  });

  it("version-tags the reload URL with a unique tag", () => {
    expect(buildCacheBustedReloadUrl("https://gnumaru.github.io/app/", "tm4xz")).toBe(
      "https://gnumaru.github.io/app/?v=tm4xz",
    );
    // Replaces a previous tag and preserves the other params.
    expect(buildCacheBustedReloadUrl("https://gnumaru.github.io/app/?v=old&x=1", "tm4xz")).toBe(
      "https://gnumaru.github.io/app/?v=tm4xz&x=1",
    );
    // Empty tag or href: unchanged document URL.
    expect(buildCacheBustedReloadUrl("https://gnumaru.github.io/app/", "")).toBe("https://gnumaru.github.io/app/");
    expect(buildCacheBustedReloadUrl("not a url", "tm4xz")).toBe("not a url");
  });

  it("strips only our own reload cache-buster", () => {
    const sha = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    expect(stripReloadCacheBuster(`https://gnumaru.github.io/app/?v=${sha}`)).toBe("https://gnumaru.github.io/app/");
    expect(stripReloadCacheBuster("https://gnumaru.github.io/app/?v=tm4xz")).toBe(
      "https://gnumaru.github.io/app/",
    );
    expect(stripReloadCacheBuster("https://gnumaru.github.io/app/?v=tm4xz&x=1")).toBe(
      "https://gnumaru.github.io/app/?x=1",
    );
    expect(stripReloadCacheBuster("https://gnumaru.github.io/app/")).toBeNull();
    expect(stripReloadCacheBuster("https://gnumaru.github.io/app/?v=nope")).toBeNull();
    expect(stripReloadCacheBuster("https://gnumaru.github.io/app/?x=1")).toBeNull();
    expect(stripReloadCacheBuster("not a url")).toBeNull();
  });
});
