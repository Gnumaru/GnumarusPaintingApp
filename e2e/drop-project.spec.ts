import { expect, test } from "@playwright/test";
import { animationFrameCount, buildAsepriteBytes, buildXcfBytes, countRedIn, loadBlankProject, paintCenter, paintLayerRect, readPixel, stubProjectDirectory } from "./e2e-helpers";

async function dropFiles(page: import("@playwright/test").Page, entries: Array<{ name: string; type: string; bytes: number[] }>): Promise<void> {
  await page.evaluate((files: Array<{ name: string; type: string; bytes: number[] }>) => {
    const shell = document.querySelector("gnumarus-shell");
    if (shell === null) {
      throw new Error("no shell");
    }
    const transfer = new DataTransfer();
    for (const entry of files) {
      transfer.items.add(new File([new Uint8Array(entry.bytes)], entry.name, { type: entry.type }));
    }
    shell.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: transfer }));
  }, entries);
}

async function dropProjectDialog(page: import("@playwright/test").Page): Promise<import("@playwright/test").Locator> {
  const dialog = page.locator("gnumarus-shell dialog#projectDropDialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

/**
 * Drop a synthetic directory handle: builds an in-memory file system from
 * seed files, records every handle call, and dispatches a drop whose items
 * expose getAsFileSystemHandle like a real OS directory drag.
 */
async function dropDirectory(
  page: import("@playwright/test").Page,
  seed: Record<string, number[]>,
  permission: PermissionState,
  failWrite: boolean,
): Promise<void> {
  await page.evaluate(
    ({ seedFiles, perm, denyWrite }: { seedFiles: Record<string, number[]>; perm: PermissionState; denyWrite: boolean }) => {
      const files: Record<string, number[]> = {};
      for (const [key, value] of Object.entries(seedFiles)) {
        files[key] = [...(value as number[])];
      }
      const calls: string[] = [];
      (window as unknown as { __dropTestCalls?: string[] }).__dropTestCalls = calls;
      const makeFile = (path: string): unknown => ({
        getFile: async (): Promise<Blob> => new Blob([new Uint8Array(files[path] ?? [])]),
        createWritable: async (): Promise<{ write(data: Blob): Promise<void>; close(): Promise<void> }> => {
          calls.push(`writable:${path}`);
          if (denyWrite) {
            throw new DOMException("denied", "NotAllowedError");
          }
          return {
            write: async (_data: Blob): Promise<void> => undefined,
            close: async (): Promise<void> => undefined,
          };
        },
      });
      const makeDir = (prefix: string): unknown => ({
        kind: "directory",
        name: prefix === "" ? "DroppedProject" : (prefix.split("/").filter((part) => part !== "").pop() ?? ""),
        queryPermission: async (): Promise<PermissionState> => perm,
        getFileHandle: async (name: string, options?: { create?: boolean }): Promise<unknown> => {
          const path = prefix + name;
          calls.push(`getFile:${path}${options?.create === true ? ":create" : ""}`);
          if (files[path] === undefined) {
            if (options?.create === true) {
              files[path] = [];
              return makeFile(path);
            }
            throw new DOMException("not found", "NotFoundError");
          }
          return makeFile(path);
        },
        getDirectoryHandle: async (name: string): Promise<unknown> => makeDir(`${prefix}${name}/`),
        removeEntry: async (name: string): Promise<void> => {
          calls.push(`remove:${prefix}${name}`);
          for (const key of Object.keys(files)) {
            if (key === prefix + name || key.startsWith(`${prefix}${name}/`)) {
              delete files[key];
            }
          }
        },
      });
      const shell = document.querySelector("gnumarus-shell");
      if (shell === null) {
        throw new Error("no shell");
      }
      const transfer = new DataTransfer();
      Object.defineProperty(transfer, "items", {
        value: [{ kind: "file", getAsFileSystemHandle: async (): Promise<unknown> => makeDir("") }],
      });
      shell.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: transfer }));
    },
    { seedFiles: seed, perm: permission, denyWrite: failWrite },
  );
}

async function dropCalls(page: import("@playwright/test").Page): Promise<string[]> {
  return page.evaluate(() => {
    return (window as unknown as { __dropTestCalls?: string[] }).__dropTestCalls ?? [];
  });
}

async function seedSavedProject(page: import("@playwright/test").Page): Promise<Record<string, number[]>> {
  const project = await stubProjectDirectory(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  return project.writtenBlobs();
}

test("dropping a project file asks for confirmation and cancel keeps everything @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintLayerRect(page, "#ff0000", 0, 0, 63, 63);
  const bytes = Array.from(await buildAsepriteBytes(page));
  await dropFiles(page, [{ name: "hero.ase", type: "", bytes }]);
  const dialog = await dropProjectDialog(page);
  await expect(dialog).toContainText("hero.ase");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog).toBeHidden();
  // Nothing happened: the painted pixel survives and nothing was imported.
  expect(await readPixel(page, 0, 0)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  await expect(page.locator("gnumarus-shell")).not.toContainText("Imported hero.ase");
});

test("confirming a dropped .ase imports it as a new project @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  const bytes = Array.from(await buildAsepriteBytes(page));
  await dropFiles(page, [{ name: "hero.ase", type: "", bytes }]);
  const dialog = await dropProjectDialog(page);
  await dialog.getByRole("button", { name: "Import", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator("gnumarus-shell")).toContainText("Imported hero.ase (2 layers, 2 frames)");
  expect(await readPixel(page, 0, 0)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await animationFrameCount(page)).toBe(2);
});

test("confirming a broken project drop reports failure without touching the project @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintLayerRect(page, "#ff0000", 0, 0, 63, 63);
  await dropFiles(page, [{ name: "broken.ase", type: "", bytes: [0, 1, 2, 3, 4, 5, 6, 7] }]);
  const dialog = await dropProjectDialog(page);
  await dialog.getByRole("button", { name: "Import", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator("gnumarus-shell")).toContainText("Import failed");
  expect(await readPixel(page, 0, 0)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("confirming a dropped .xcf imports it as a new project @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  const bytes = Array.from(
    buildXcfBytes(4, 4, [
      { name: "Top", width: 2, height: 2, offsetX: 2, offsetY: 2, opacity: 128, rgba: [255, 0, 0, 255] },
      { name: "Bottom", width: 4, height: 4, offsetX: 0, offsetY: 0, rgba: [0, 0, 255, 255] },
    ]),
  );
  await dropFiles(page, [{ name: "art.xcf", type: "", bytes }]);
  const dialog = await dropProjectDialog(page);
  await dialog.getByRole("button", { name: "Import", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator("gnumarus-shell")).toContainText("Imported art.xcf (2 layers)");
  expect(await readPixel(page, 0, 0)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("dropping a project directory opens it without a probe write when already permitted @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintCenter(page);
  const seed = await seedSavedProject(page);
  await paintLayerRect(page, "#ff0000", 0, 0, 63, 63);
  await dropDirectory(page, seed, "granted", false);
  await expect(page.locator("gnumarus-shell")).toContainText("Opened DroppedProject");
  // The saved project replaces the canvas: only the center dot is red now.
  expect(await countRedIn(page, 0, 0, 64, 64)).toBeLessThan(64 * 64);
  const calls = await dropCalls(page);
  expect(calls.some((call) => call.startsWith("writable:") || call.startsWith("remove:"))).toBe(false);
});

test("dropping a directory without a project file only toasts and never forces permission @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintLayerRect(page, "#ff0000", 0, 0, 63, 63);
  await dropDirectory(page, { "notes.txt": [104, 105] }, "granted", false);
  await expect(page.locator("gnumarus-shell")).toContainText("not a project");
  // Nothing was opened and no write was attempted.
  expect(await countRedIn(page, 0, 0, 64, 64)).toBe(64 * 64);
  const calls = await dropCalls(page);
  expect(calls.some((call) => call.startsWith("writable:") || call.startsWith("remove:"))).toBe(false);
});

test("dropping a project directory forces write permission with a probe file @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintCenter(page);
  const seed = await seedSavedProject(page);
  await paintLayerRect(page, "#ff0000", 0, 0, 63, 63);
  await dropDirectory(page, seed, "prompt", false);
  await expect(page.locator("gnumarus-shell")).toContainText("Opened DroppedProject");
  expect(await countRedIn(page, 0, 0, 64, 64)).toBeLessThan(64 * 64);
  const calls = await dropCalls(page);
  const created = calls.filter((call) => call.includes(":create"));
  expect(created).toHaveLength(1);
  expect(created[0]).toMatch(/gnumarus-write-test-.*\.tmp/);
  const removed = calls.filter((call) => call.startsWith("remove:"));
  expect(removed).toHaveLength(1);
  expect(removed[0]).toContain("gnumarus-write-test-");
});

test("dropping a project directory without write permission toasts instead of loading @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintLayerRect(page, "#ff0000", 0, 0, 63, 63);
  const seed = await seedSavedProject(page);
  await dropDirectory(page, seed, "denied", true);
  await expect(page.locator("gnumarus-shell")).toContainText("Write permission denied");
  // The current project is untouched.
  expect(await countRedIn(page, 0, 0, 64, 64)).toBe(64 * 64);
});
