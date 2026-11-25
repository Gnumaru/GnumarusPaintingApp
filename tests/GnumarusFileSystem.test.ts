import { describe, expect, it, vi } from "vitest";
import {
  directoryHasProjectFile,
  dropWriteProbeName,
  ensureDirectoryWritable,
  getDroppedDirectoryHandle,
  hasDroppedDirectoryWithoutHandle,
  type GnumarusDroppedDirectory,
} from "../src/project/GnumarusFileSystem";

function notFound(): DOMException {
  return new DOMException("File not found", "NotFoundError");
}

function fileHandle(): { createWritable: () => Promise<{ write: (data: Blob) => Promise<void>; close: () => Promise<void> }> } {
  return {
    createWritable: async () => ({
      write: async (_data: Blob): Promise<void> => undefined,
      close: async (): Promise<void> => undefined,
    }),
  };
}

function fakeDir(files: Record<string, boolean>, probeLog?: { created: string[]; removed: string[] }): GnumarusDroppedDirectory & {
  queryPermission: (descriptor: { mode: string }) => Promise<PermissionState>;
} {
  const dir = {
    kind: "directory",
    name: "MockDir",
    queryPermission: async (_descriptor: { mode: string }): Promise<PermissionState> => "granted",
    getFileHandle: async (name: string, options?: { create?: boolean }): Promise<unknown> => {
      if (files[name] === true) {
        return fileHandle();
      }
      if (options?.create === true) {
        probeLog?.created.push(name);
        files[name] = true;
        return fileHandle();
      }
      throw notFound();
    },
    getDirectoryHandle: async (name: string): Promise<unknown> => {
      throw new Error(`no subdir ${name}`);
    },
    removeEntry: async (name: string): Promise<void> => {
      probeLog?.removed.push(name);
      delete files[name];
    },
  };
  return dir as unknown as GnumarusDroppedDirectory & {
    queryPermission: (descriptor: { mode: string }) => Promise<PermissionState>;
  };
}

describe("dropped project directories", () => {
  it("finds the first directory handle and skips files", async () => {
    const dir = fakeDir({});
    const items = [
      { kind: "file", getAsFileSystemHandle: async (): Promise<unknown> => ({ kind: "file", name: "a.png" }) },
      { kind: "file", getAsFileSystemHandle: async (): Promise<unknown> => dir },
    ];
    expect(await getDroppedDirectoryHandle(items)).toBe(dir);
    expect(await getDroppedDirectoryHandle([])).toBeNull();
    expect(await getDroppedDirectoryHandle([{ kind: "file" }])).toBeNull();
  });

  it("times out hanging handle probes instead of bricking the drop", async () => {
    const hanging = { kind: "file", getAsFileSystemHandle: (): Promise<unknown> => new Promise(() => {}) };
    const started = Date.now();
    expect(await getDroppedDirectoryHandle([hanging], 20)).toBeNull();
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it("still finds directories listed after a hanging probe", async () => {
    const dir = fakeDir({});
    const items = [
      { kind: "file", getAsFileSystemHandle: (): Promise<unknown> => new Promise(() => {}) },
      { kind: "file", getAsFileSystemHandle: async (): Promise<unknown> => dir },
    ];
    expect(await getDroppedDirectoryHandle(items, 50)).toBe(dir);
  });

  it("detects webkit-only directory drops", () => {
    expect(hasDroppedDirectoryWithoutHandle([])).toBe(false);
    expect(
      hasDroppedDirectoryWithoutHandle([{ kind: "file", webkitGetAsEntry: (): unknown => ({ isDirectory: false }) }]),
    ).toBe(false);
    expect(
      hasDroppedDirectoryWithoutHandle([{ kind: "file", webkitGetAsEntry: (): unknown => ({ isDirectory: true }) }]),
    ).toBe(true);
  });

  it("accepts project.json or project.gpa and rejects other folders", async () => {
    expect(await directoryHasProjectFile(fakeDir({ "project.json": true }))).toBe(true);
    expect(await directoryHasProjectFile(fakeDir({ "project.gpa": true }))).toBe(true);
    expect(await directoryHasProjectFile(fakeDir({ "other.txt": true }))).toBe(false);
    expect(await directoryHasProjectFile(fakeDir({}))).toBe(false);
  });

  it("rethrows unexpected lookup errors instead of treating them as non-projects", async () => {
    const dir = fakeDir({});
    dir.getFileHandle = async (_name: string): Promise<never> => {
      throw new DOMException("denied", "SecurityError");
    };
    await expect(directoryHasProjectFile(dir)).rejects.toThrow("denied");
  });

  it("skips the probe write when write access is already granted", async () => {
    const log = { created: [] as string[], removed: [] as string[] };
    const dir = fakeDir({ "project.json": true }, log);
    expect(await ensureDirectoryWritable(dir)).toBe(true);
    expect(log.created).toEqual([]);
    expect(log.removed).toEqual([]);
  });

  it("forces write access with a probe file and deletes it afterwards", async () => {
    const log = { created: [] as string[], removed: [] as string[] };
    const dir = fakeDir({ "project.json": true }, log);
    dir.queryPermission = async (_descriptor: { mode: string }): Promise<PermissionState> => "prompt";
    expect(await ensureDirectoryWritable(dir, "probe.tmp")).toBe(true);
    expect(log.created).toEqual(["probe.tmp"]);
    expect(log.removed).toEqual(["probe.tmp"]);
  });

  it("reports failure when the probe write stays denied", async () => {
    const dir = fakeDir({ "project.json": true });
    dir.queryPermission = async (_descriptor: { mode: string }): Promise<PermissionState> => "denied";
    dir.getFileHandle = async (_name: string): Promise<never> => {
      throw new DOMException("denied", "NotAllowedError");
    };
    const remove = vi.fn(async (_name: string): Promise<void> => undefined);
    dir.removeEntry = remove;
    expect(await ensureDirectoryWritable(dir, "probe.tmp")).toBe(false);
    expect(remove).toHaveBeenCalledWith("probe.tmp");
  });

  it("generates unique probe names", () => {
    const names = new Set([dropWriteProbeName(), dropWriteProbeName(), dropWriteProbeName()]);
    expect(names.size).toBe(3);
    for (const name of names) {
      expect(name.startsWith("gnumarus-write-test-")).toBe(true);
      expect(name.endsWith(".tmp")).toBe(true);
    }
  });
});
