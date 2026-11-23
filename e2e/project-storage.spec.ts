import { expect, test } from "@playwright/test";
import { decodeJxlInPage, loadBlankProject, paintCenter, readJpegSamples, readPixel, runPaletteAction, setPencil, stubProjectDirectory } from "./e2e-helpers";

test("Control+S saves to the chosen folder without prompting again", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.evaluate(() => {
    const w = window as unknown as {
      showDirectoryPicker?: unknown;
      __gnumarusSaveTest?: { pickCalls: number; written: string[] };
    };
    const testState = { pickCalls: 0, written: [] as string[] };
    w.__gnumarusSaveTest = testState;
    interface MockFileHandle {
      getFile(): Promise<{ text(): Promise<string>; arrayBuffer(): Promise<ArrayBuffer> }>;
      createWritable(): Promise<{ write(data: string | Blob): Promise<void>; close(): Promise<void> }>;
    }
    interface MockDirHandle {
      name: string;
      getFileHandle(fileName: string): Promise<MockFileHandle>;
      getDirectoryHandle(dirName: string): Promise<MockDirHandle>;
      removeEntry(fileName: string): Promise<void>;
    }
    function makeFileHandle(path: string): MockFileHandle {
      return {
        getFile: (): Promise<{ text(): Promise<string>; arrayBuffer(): Promise<ArrayBuffer> }> =>
          Promise.resolve({
            text: (): Promise<string> => Promise.resolve(""),
            arrayBuffer: (): Promise<ArrayBuffer> => Promise.resolve(new ArrayBuffer(0)),
          }),
        createWritable: (): Promise<{ write(data: string | Blob): Promise<void>; close(): Promise<void> }> =>
          Promise.resolve({
            write: (data: string | Blob): Promise<void> => {
              void data;
              return Promise.resolve();
            },
            close: (): Promise<void> => {
              testState.written.push(path);
              return Promise.resolve();
            },
          }),
      };
    }
    function makeDir(name: string, prefix: string): MockDirHandle {
      return {
        name,
        getFileHandle: (fileName: string): Promise<MockFileHandle> =>
          Promise.resolve(makeFileHandle(prefix + fileName)),
        getDirectoryHandle: (dirName: string): Promise<MockDirHandle> =>
          Promise.resolve(makeDir(dirName, `${prefix}${dirName}/`)),
        removeEntry: (): Promise<void> => Promise.resolve(),
      };
    }
    w.showDirectoryPicker = (): Promise<MockDirHandle> => {
      testState.pickCalls += 1;
      return Promise.resolve(makeDir("MockDir", ""));
    };
  });
  const pickCalls = (): Promise<number> =>
    page.evaluate(
      () =>
        (window as unknown as { __gnumarusSaveTest?: { pickCalls: number } }).__gnumarusSaveTest?.pickCalls ??
        -1,
    );
  const writtenFiles = (): Promise<string[]> =>
    page.evaluate(
      () => (window as unknown as { __gnumarusSaveTest?: { written: string[] } }).__gnumarusSaveTest?.written ?? [],
    );
  await page.keyboard.press("Control+s");
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockDir");
  expect(await pickCalls()).toBe(1);
  expect(await writtenFiles()).toContain("project.gpa");
  await page.keyboard.press("Control+s");
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockDir");
  expect(await pickCalls()).toBe(1);
});

test("project textures save as lossless JXL named tN and reopen", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { setImportCleanup(mode: string): void } } };
    root.__gnumarus?.shell?.setImportCleanup("none");
  });
  await setPencil(page, "#ff0000");
  await paintCenter(page);
  const project = await stubProjectDirectory(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  const meta = await project.writtenProject();
  expect(meta).toContain('"textures/t1.jxl"');
  expect(meta).toContain('"name": "t1"');
  const files = await project.writtenBlobs();
  expect(Object.keys(files).sort()).toEqual(["project.gpa", "textures/t1.jxl"]);
  expect(files["textures/t1.jxl"]?.slice(0, 2)).toEqual([0xff, 0x0a]);
  const decoded = await decodeJxlInPage(page, files["textures/t1.jxl"] ?? []);
  expect(decoded?.width).toBe(64);
  expect(decoded?.height).toBe(64);
  expect(decoded?.center).toEqual([255, 0, 0, 255]);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Open Project" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Opened MockProject");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("project texture lossy setting is honored and persists", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Project texture format");
  const dialog = page.locator("gnumarus-shell dialog#settingsDialog");
  await expect(dialog.locator("select#storageFormat")).toHaveValue("jxl");
  await dialog.locator("select#storageJxlMode").selectOption("lossy");
  await dialog.locator("input#storageQuality").fill("10");
  await expect(page.locator("gnumarus-shell")).toContainText("Project textures save as lossy JXL (quality 10)");
  const persisted = await page.evaluate(() => window.localStorage.getItem("gnumarus.settings.storage.v1"));
  expect(persisted).toContain('"lossless": false');
  expect(persisted).toContain('"quality": 10');
  await dialog.getByRole("button", { name: "Close" }).click();
  await setPencil(page, "#00ff00");
  await paintCenter(page);
  const project = await stubProjectDirectory(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  const files = await project.writtenBlobs();
  expect(files["textures/t1.jxl"]?.slice(0, 2)).toEqual([0xff, 0x0a]);
  const decoded = await decodeJxlInPage(page, files["textures/t1.jxl"] ?? []);
  expect(decoded?.width).toBe(64);
  expect(decoded?.height).toBe(64);
  const center = decoded?.center ?? [0, 0, 0, 0];
  expect(center[3]).toBeGreaterThan(0);
  expect(center[1]).toBeGreaterThan(center[0]);
  expect(center[1]).toBeGreaterThan(center[2]);
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await page.locator('gnumarus-shell [aria-label="Reset project texture format to default"]').click();
  await expect(page.locator("gnumarus-shell select#storageFormat")).toHaveValue("jxl");
});

test("project textures save as PNG with a compression level and reopen", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { setImportCleanup(mode: string): void } } };
    root.__gnumarus?.shell?.setImportCleanup("none");
  });
  await setPencil(page, "#ff0000");
  await paintCenter(page);
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  const dialog = page.locator("gnumarus-shell dialog#settingsDialog");
  await dialog.locator("select#storageFormat").selectOption("png");
  await expect(dialog.locator("input#storagePngLevel")).toHaveValue("9");
  await expect(dialog.locator("input#storageJpegQuality")).toHaveCount(0);
  await dialog.locator("input#storagePngLevel").fill("1");
  await expect(page.locator("gnumarus-shell")).toContainText("Project textures save as PNG (compression 1)");
  const persisted = await page.evaluate(() => window.localStorage.getItem("gnumarus.settings.storage.v1"));
  expect(persisted).toContain('"format": "png"');
  expect(persisted).toContain('"pngLevel": 1');
  await dialog.getByRole("button", { name: "Close" }).click();
  const project = await stubProjectDirectory(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  const meta = await project.writtenProject();
  expect(meta).toContain('"textures/t1.png"');
  const files = await project.writtenBlobs();
  expect(Object.keys(files).sort()).toEqual(["project.gpa", "textures/t1.png"]);
  expect(files["textures/t1.png"]?.slice(0, 4)).toEqual([137, 80, 78, 71]);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Open Project" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Opened MockProject");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 0, 0)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
});

test("project textures save as JPEG with a grayscale alpha companion", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#ff0000");
  // Bucket-fill the whole transparent canvas: solid blocks survive JPEG best.
  await page.getByRole("button", { name: "Bucket fill" }).click();
  await paintCenter(page);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  const dialog = page.locator("gnumarus-shell dialog#settingsDialog");
  await dialog.locator("select#storageFormat").selectOption("jpg");
  await expect(dialog.locator("input#storageJpegQuality")).toHaveValue("95");
  await expect(dialog.locator("input#storagePngLevel")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Close" }).click();
  const project = await stubProjectDirectory(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  const meta = await project.writtenProject();
  expect(meta).toContain('"textures/t1.jpg"');
  expect(meta).not.toContain(".alpha.jpg");
  const files = await project.writtenBlobs();
  expect(Object.keys(files).sort()).toEqual(["project.gpa", "textures/t1.alpha.jpg", "textures/t1.jpg"]);
  expect(files["textures/t1.jpg"]?.slice(0, 2)).toEqual([255, 216]);
  const color = await readJpegSamples(page, files["textures/t1.jpg"] ?? []);
  expect(color?.center[0] ?? 0).toBeGreaterThan(200);
  expect(color?.center[1] ?? 255).toBeLessThan(80);
  const alpha = await readJpegSamples(page, files["textures/t1.alpha.jpg"] ?? []);
  expect(alpha?.center[0] ?? 0).toBeGreaterThan(200);
  expect(alpha?.corner[0] ?? 0).toBeGreaterThan(200);
  // Paint over, then reload: the JPEG pair restores approximately.
  await setPencil(page, "#00ff00");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  await paintCenter(page);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 255, b: 0, a: 255 });
  await runPaletteAction(page, "reload all textures");
  await expect(page.locator("gnumarus-shell")).toContainText("Reloaded 1 texture");
  const restored = await readPixel(page, 32, 32);
  expect(restored?.r ?? 0).toBeGreaterThan(200);
  expect(restored?.g ?? 255).toBeLessThan(80);
  expect(restored?.b ?? 255).toBeLessThan(80);
  expect(restored?.a ?? 0).toBeGreaterThan(200);
});

test("project meta saves zipped by default and reopens", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { setImportCleanup(mode: string): void } } };
    root.__gnumarus?.shell?.setImportCleanup("none");
  });
  await setPencil(page, "#ff0000");
  await paintCenter(page);
  const project = await stubProjectDirectory(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  const files = await project.writtenBlobs();
  expect(Object.keys(files).sort()).toEqual(["project.gpa", "textures/t1.jxl"]);
  expect(files["project.gpa"]?.slice(0, 2)).toEqual([0x50, 0x4b]);
  const meta = await project.writtenProject();
  expect(meta).toContain('"textures/t1.jxl"');
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Open Project" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Opened MockProject");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("project meta plain mode writes project.json and removes project.gpa", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { setImportCleanup(mode: string): void } } };
    root.__gnumarus?.shell?.setImportCleanup("none");
  });
  await setPencil(page, "#ff0000");
  await paintCenter(page);
  const project = await stubProjectDirectory(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  expect(Object.keys(await project.writtenBlobs()).sort()).toEqual(["project.gpa", "textures/t1.jxl"]);
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  const dialog = page.locator("gnumarus-shell dialog#settingsDialog");
  await expect(dialog.locator("select#storageProjectFile")).toHaveValue("gpa");
  await dialog.locator("select#storageProjectFile").selectOption("json");
  await dialog.getByRole("button", { name: "Close" }).click();
  const persisted = await page.evaluate(() => window.localStorage.getItem("gnumarus.settings.storage.v1"));
  expect(persisted).toContain('"projectFile": "json"');
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  expect(Object.keys(await project.writtenBlobs()).sort()).toEqual(["project.json", "textures/t1.jxl"]);
  expect(await project.writtenProject()).toContain('"textures/t1.jxl"');
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await page.locator("gnumarus-shell dialog#settingsDialog select#storageProjectFile").selectOption("gpa");
  await page.locator("gnumarus-shell dialog#settingsDialog").getByRole("button", { name: "Close" }).click();
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  expect(Object.keys(await project.writtenBlobs()).sort()).toEqual(["project.gpa", "textures/t1.jxl"]);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Open Project" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Opened MockProject");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("changing texture storage removes stale texture files", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { setImportCleanup(mode: string): void } } };
    root.__gnumarus?.shell?.setImportCleanup("none");
  });
  await setPencil(page, "#ff0000");
  await paintCenter(page);
  const project = await stubProjectDirectory(page);
  const save = async (): Promise<void> => {
    await page.getByRole("button", { name: "File" }).click();
    await page.getByRole("button", { name: "Save Project", exact: true }).click();
    await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  };
  const setFormat = async (format: string): Promise<void> => {
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await page.getByRole("button", { name: "Settings" }).click();
    await page.locator("gnumarus-shell dialog#settingsDialog select#storageFormat").selectOption(format);
    await page.locator("gnumarus-shell dialog#settingsDialog").getByRole("button", { name: "Close" }).click();
  };
  await save();
  expect(Object.keys(await project.writtenBlobs()).sort()).toEqual(["project.gpa", "textures/t1.jxl"]);
  await setFormat("png");
  await save();
  expect(Object.keys(await project.writtenBlobs()).sort()).toEqual(["project.gpa", "textures/t1.png"]);
  await setFormat("jpg");
  await save();
  expect(Object.keys(await project.writtenBlobs()).sort()).toEqual([
    "project.gpa",
    "textures/t1.alpha.jpg",
    "textures/t1.jpg",
  ]);
  await setFormat("jxl");
  await save();
  expect(Object.keys(await project.writtenBlobs()).sort()).toEqual(["project.gpa", "textures/t1.jxl"]);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Open Project" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Opened MockProject");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("corrupt project.gpa fails to open with a clear error", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell");
  const project = await stubProjectDirectory(page);
  await project.seedFile("project.gpa", [1, 2, 3, 4]);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Open Project" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Open failed: project.gpa is not a valid zip archive");
});
