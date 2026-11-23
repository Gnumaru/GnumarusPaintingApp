import { expect, test } from "@playwright/test";
import { readPixel, stubProjectDirectory } from "./e2e-helpers";

test("shell boots with menu, toolbar, canvas host and status bar", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error: Error) => {
    errors.push(error.message);
  });
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell");
  await expect(page.locator("gnumarus-shell")).toBeAttached();

  await page.getByRole("button", { name: "File" }).click();
  await expect(page.getByRole("button", { name: "New Project" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open Project" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save Project", exact: true })).toBeVisible();

  await expect(page.locator("gnumarus-shell")).toContainText("1920 x 1080");
  await expect(page.locator("gnumarus-shell")).toContainText("pencil");
  expect(await readPixel(page, 0, 0)).toBeNull();
  expect(errors).toEqual([]);
});

test("File > New creates a canvas with the requested size", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell");
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "New Project" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("New canvas");
  // The dialog defaults to the digital painting lossless preset.
  const dialog = page.locator("gnumarus-shell dialog#newDialog");
  await expect(dialog.locator("select#newPreset")).toHaveValue("digital painting lossless");
  await dialog.locator("select#newPreset").selectOption("");
  await dialog.locator("input#newWidth").fill("80");
  await dialog.locator("input#newHeight").fill("70");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("80 x 70");
});

test("File > New preset fills dimensions and WebP lossless storage", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell");
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "New Project" }).click();
  const dialog = page.locator("gnumarus-shell dialog#newDialog");
  await expect(dialog).toBeVisible();
  await dialog.locator("select#newPreset").selectOption("pixel sprite small");
  await expect(dialog.locator("input#newWidth")).toHaveValue("16");
  await expect(dialog.locator("input#newHeight")).toHaveValue("16");
  await expect(dialog.locator("select#newStorageFormat")).toHaveValue("webp");
  await expect(dialog.locator("select#newStorageMode")).toHaveValue("lossless");
  await expect(dialog.locator("input#newStorageQuality")).toHaveCount(0);
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("New 16 x 16 canvas");
  const persisted = await page.evaluate(() => window.localStorage.getItem("gnumarus.settings.storage.v1"));
  expect(persisted).toContain('"format": "webp"');
  expect(persisted).toContain('"lossless": true');
  const project = await stubProjectDirectory(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  const files = await project.writtenBlobs();
  expect(Object.keys(files).sort()).toEqual(["project.gpa"]);
});

test("File > New Notes XLQ preset uses JXL lossy quality 0", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell");
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "New Project" }).click();
  const dialog = page.locator("gnumarus-shell dialog#newDialog");
  await expect(dialog).toBeVisible();
  await dialog.locator("select#newPreset").selectOption("Notes XLQ");
  await expect(dialog.locator("input#newWidth")).toHaveValue("1920");
  await expect(dialog.locator("input#newHeight")).toHaveValue("1080");
  await expect(dialog.locator("select#newStorageFormat")).toHaveValue("jxl");
  await expect(dialog.locator("select#newStorageMode")).toHaveValue("lossy");
  await expect(dialog.locator("input#newStorageQuality")).toHaveValue("0");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("New 1920 x 1080 canvas");
  const persisted = await page.evaluate(() => window.localStorage.getItem("gnumarus.settings.storage.v1"));
  expect(persisted).toContain('"format": "jxl"');
  expect(persisted).toContain('"lossless": false');
  expect(persisted).toContain('"quality": 0');
});

test("File > New PNG storage forces lossless and hides quality", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell");
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "New Project" }).click();
  const dialog = page.locator("gnumarus-shell dialog#newDialog");
  await expect(dialog).toBeVisible();
  await dialog.locator("select#newPreset").selectOption("Sketches MQ");
  await expect(dialog.locator("select#newStorageMode")).toHaveValue("lossy");
  await dialog.locator("select#newStorageFormat").selectOption("png");
  await expect(dialog.locator("select#newStorageMode")).toHaveValue("lossless");
  await expect(dialog.locator("input#newStorageQuality")).toHaveCount(0);
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("New 1920 x 1080 canvas");
  const persisted = await page.evaluate(() => window.localStorage.getItem("gnumarus.settings.storage.v1"));
  expect(persisted).toContain('"format": "png"');
  expect(persisted).toContain('"lossless": true');
});

test("File > New JPEG storage forces lossy and shows quality", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell");
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "New Project" }).click();
  const dialog = page.locator("gnumarus-shell dialog#newDialog");
  await expect(dialog).toBeVisible();
  await dialog.locator("select#newPreset").selectOption("Sketches MQ");
  await expect(dialog.locator("select#newStorageMode")).toHaveValue("lossy");
  await dialog.locator("select#newStorageFormat").selectOption("jpg");
  await expect(dialog.locator("select#newStorageMode")).toHaveValue("lossy");
  await expect(dialog.locator("input#newStorageQuality")).toHaveCount(1);
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("New 1920 x 1080 canvas");
  const persisted = await page.evaluate(() => window.localStorage.getItem("gnumarus.settings.storage.v1"));
  expect(persisted).toContain('"format": "jpg"');
  expect(persisted).toContain('"lossless": false');
});

test("File > New accepts canvas sizes up to 16384", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell");
  const canvasSize = (): Promise<{ width: number; height: number } | null> =>
    page.evaluate(() => {
      const root = window as unknown as { __gnumarus?: { engine?: { size: { width: number; height: number } } } };
      return root.__gnumarus?.engine?.size ?? null;
    });
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "New Project" }).click();
  await page.locator("gnumarus-shell input#newWidth").fill("1920");
  await page.locator("gnumarus-shell input#newHeight").fill("1080");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("New 1920 x 1080 canvas");
  expect(await canvasSize()).toEqual({ width: 1920, height: 1080 });
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "New Project" }).click();
  await page.locator("gnumarus-shell input#newWidth").fill("20000");
  await page.locator("gnumarus-shell input#newHeight").fill("100");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("New 16384 x 100 canvas");
  expect(await canvasSize()).toEqual({ width: 16384, height: 100 });
});
