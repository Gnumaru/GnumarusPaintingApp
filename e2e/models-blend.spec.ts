import { expect, test } from "@playwright/test";
import { cellModel3dId, getModelBytes, modelPaintedPixels, runPaletteAction, stubModelPicker, stubProjectDirectory } from "./e2e-helpers";

/** Stub the model picker with a real project fixture fetched from the dev server. */
async function stubModelPickerWithFixture(page: import("@playwright/test").Page, fileName: string, url: string): Promise<number> {
  return page.evaluate(async ([name, fixtureUrl]: [string, string]) => {
    const res = await fetch(fixtureUrl);
    if (!res.ok) {
      throw new Error(`fixture fetch failed: ${res.status}`);
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    const root = window as unknown as {
      showOpenFilePicker?: () => Promise<Array<{ getFile(): Promise<File> }>>;
    };
    root.showOpenFilePicker = async () => [
      {
        getFile: async () => new File([bytes as Uint8Array<ArrayBuffer>], name, { type: "application/octet-stream" }),
      },
    ];
    return bytes.length;
  }, [fileName, url] as [string, string]);
}

async function importBlenderModel(page: import("@playwright/test").Page, fileName: string, url: string): Promise<string> {
  await stubModelPickerWithFixture(page, fileName, url);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Import 3D Model as layer" }).click();
  return fileName;
}

test("blend cube import renders into an empty cell", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await importBlenderModel(page, "cube.blend", "/test-fixtures/blend_cube.blend");
  await expect(page.locator("gnumarus-shell")).toContainText('3D model "cube" imported');
  const modelId = await cellModel3dId(page, "layer0", 0);
  expect(typeof modelId).toBe("string");
  await expect
    .poll(async () => modelPaintedPixels(page), { timeout: 15000 })
    .toBeGreaterThan(0);
});

test("blend suite import renders packed texture and lights", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await importBlenderModel(page, "suite.blend", "/test-fixtures/blend_suite.blend");
  await expect(page.locator("gnumarus-shell")).toContainText('3D model "suite" imported');
  const modelId = await cellModel3dId(page, "layer0", 0);
  expect(typeof modelId).toBe("string");
  await expect
    .poll(async () => modelPaintedPixels(page), { timeout: 15000 })
    .toBeGreaterThan(0);
});

test("blend rejects compressed files with a re-save message", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await stubModelPicker(page, "compressed.blend", [0x28, 0xb5, 0x2f, 0xfd, 1, 2, 3, 4]);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Import 3D Model as layer" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Compress");
  expect(await cellModel3dId(page, "layer0", 0)).toBeNull();
});

test("blend rejects unsupported versions with a clear message", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.evaluate(() => {
    const header = new TextEncoder().encode("BLENDER17-01v0402");
    const bytes = new Uint8Array(64);
    bytes.set(header, 0);
    const root = window as unknown as {
      showOpenFilePicker?: () => Promise<Array<{ getFile(): Promise<File> }>>;
    };
    root.showOpenFilePicker = async () => [
      {
        getFile: async () => new File([bytes as Uint8Array<ArrayBuffer>], "old.blend", { type: "application/octet-stream" }),
      },
    ];
  });
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Import 3D Model as layer" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Blender 5");
  expect(await cellModel3dId(page, "layer0", 0)).toBeNull();
});

test("blend models save as raw files and reopen", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const fixtureLength = await stubModelPickerWithFixture(page, "cube.blend", "/test-fixtures/blend_cube.blend");
  expect(fixtureLength).toBeGreaterThan(1000);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Import 3D Model as layer" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("imported");
  const modelId = await cellModel3dId(page, "layer0", 0);
  expect(typeof modelId).toBe("string");
  const project = await stubProjectDirectory(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  const blobs = await project.writtenBlobs();
  expect(Object.keys(blobs).sort()).toEqual(["project.gpa", `3dmodels/${modelId}.blend`].sort());
  expect(blobs[`3dmodels/${modelId}.blend`]?.length).toBe(fixtureLength);
  const saved = await project.writtenProject();
  expect(saved).toContain(`"file": "3dmodels/${modelId}.blend"`);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Open Project" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Opened MockProject");
  expect(await cellModel3dId(page, "layer0", 0)).toBe(modelId);
  await expect
    .poll(async () => modelPaintedPixels(page), { timeout: 15000 })
    .toBeGreaterThan(0);
});

test("blend reload picks up external edits", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const cubeLength = await stubModelPickerWithFixture(page, "cube.blend", "/test-fixtures/blend_cube.blend");
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Import 3D Model as layer" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("imported");
  const modelId = await cellModel3dId(page, "layer0", 0);
  expect(typeof modelId).toBe("string");
  const project = await stubProjectDirectory(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  void project;
  expect((await getModelBytes(page, modelId as string))?.length).toBe(cubeLength);
  // External edit in Blender: overwrite the .blend with the green variant.
  const greenLength = await page.evaluate(async (file: string) => {
    const res = await fetch("/test-fixtures/blend_suite_green.blend");
    if (!res.ok) {
      throw new Error(`fixture fetch failed: ${res.status}`);
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    const root = window as unknown as {
      __gnumarusProjectTest?: { files: Record<string, Blob> };
    };
    const files = root.__gnumarusProjectTest?.files;
    if (files === undefined) {
      throw new Error("mock project is missing");
    }
    files[file] = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/octet-stream" });
    return bytes.length;
  }, `3dmodels/${modelId}.blend`);
  expect(greenLength).not.toBe(cubeLength);
  await runPaletteAction(page, "reload all contents");
  await expect(page.locator("gnumarus-shell")).toContainText("Reloaded 1 content");
  expect((await getModelBytes(page, modelId as string))?.length).toBe(greenLength);
  await expect
    .poll(async () => modelPaintedPixels(page), { timeout: 15000 })
    .toBeGreaterThan(0);
});
