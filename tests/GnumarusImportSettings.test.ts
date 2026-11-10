import { describe, expect, it } from "vitest";
import {
  DEFAULT_IMPORT_CLEANUP,
  IMPORT_CLEANUP_STORAGE_KEY,
  parseImportCleanup,
  parseImportCleanupSettings,
  serializeImportCleanupSettings,
  GnumarusImportCleanupError,
} from "../src/settings/GnumarusImportSettings";

describe("GnumarusImportSettings", () => {
  it("defaults to crop+fit", () => {
    expect(DEFAULT_IMPORT_CLEANUP).toBe("crop+fit");
    expect(IMPORT_CLEANUP_STORAGE_KEY).toBe("gnumarus.settings.importCleanup.v1");
    expect(parseImportCleanup("none")).toBe("none");
    expect(parseImportCleanup("fit")).toBe("fit");
    expect(parseImportCleanup("crop")).toBe("crop");
    expect(parseImportCleanup("crop+fit")).toBe("crop+fit");
    expect(parseImportCleanup("scrub")).toBe("crop+fit");
    expect(parseImportCleanup(undefined)).toBe("crop+fit");
  });

  it("round-trips the cleanup mode", () => {
    expect(parseImportCleanupSettings(serializeImportCleanupSettings("fit"))).toBe("fit");
    expect(parseImportCleanupSettings(serializeImportCleanupSettings(DEFAULT_IMPORT_CLEANUP))).toBe(
      DEFAULT_IMPORT_CLEANUP,
    );
  });

  it("rejects invalid settings", () => {
    expect(() => parseImportCleanupSettings("not json")).toThrow(GnumarusImportCleanupError);
    expect(() => parseImportCleanupSettings("{}")).toThrow(GnumarusImportCleanupError);
    expect(() => parseImportCleanupSettings(JSON.stringify({ cleanup: 42 }))).toThrow(GnumarusImportCleanupError);
  });
});
