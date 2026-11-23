import { expect, test } from "@playwright/test";
import { cellTextId, cellTextureId, createDefaultText, createHelloText, paintCenter, setBrushColor, setTextStorage, stubProjectDirectory, stubSaveFilePicker, textHtml, textPaintedPixels } from "./e2e-helpers";

test("text tool creates a text cell and renders it", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.locator('gnumarus-shell [data-testid="tool-text"]').click();
  await paintCenter(page);
  const dialog = page.locator('gnumarus-shell [data-testid="text-editor-dialog"]');
  await expect(dialog).toBeVisible();
  const area = page.locator('gnumarus-shell [data-testid="text-editor-area"]');
  await expect(area).toContainText("Text");
  await area.click();
  await page.keyboard.press("Control+a");
  await page.keyboard.type("Hello");
  await page.locator('gnumarus-shell [data-testid="text-ok"]').click();
  await expect(page.locator("gnumarus-shell")).toContainText("Text updated");
  const textId = await cellTextId(page, "layer0", 0);
  expect(typeof textId).toBe("string");
  expect(await textHtml(page, textId as string)).toContain("Hello");
  expect(await textPaintedPixels(page)).toBeGreaterThan(0);
});

test("text edit undo and redo restore the document", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const textId = await createDefaultText(page);
  await page.locator('gnumarus-shell [data-testid="tool-text"]').click();
  await paintCenter(page);
  const area = page.locator('gnumarus-shell [data-testid="text-editor-area"]');
  await area.click();
  await page.keyboard.press("Control+a");
  await page.keyboard.type("Abc");
  await page.locator('gnumarus-shell [data-testid="text-ok"]').click();
  await expect(page.locator("gnumarus-shell")).toContainText("Text updated");
  expect(await textHtml(page, textId)).toContain("Abc");
  await page.keyboard.press("Control+z");
  expect(await textHtml(page, textId)).toBe("<div>Text</div>");
  await page.keyboard.press("Control+y");
  expect(await textHtml(page, textId)).toContain("Abc");
});

test("text entries can be shared across cells", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const textId = await createDefaultText(page);
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  const cell = matrix.locator('[data-testid="anim-cell"][data-matrix-frame="1"]');
  await cell.click({ button: "right" });
  await page.getByRole("button", { name: "Select text" }).click();
  const grid = page.locator('gnumarus-shell [data-testid="text-picker-grid"]');
  await expect(grid).toBeVisible();
  await page.locator(`gnumarus-shell [data-testid="text-picker-item"][data-text-id="${textId}"]`).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Text associated");
  expect(await cellTextId(page, "layer0", 1)).toBe(textId);
});

test("painting a text cell toasts that rasterizing is needed", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await createDefaultText(page);
  const before = await textPaintedPixels(page);
  expect(before).toBeGreaterThan(0);
  await page.keyboard.press("b");
  await paintCenter(page);
  await expect(page.locator("gnumarus-shell")).toContainText("rasterize the text first");
  expect(await textPaintedPixels(page)).toBe(before);
});

test("rasterize text bakes a paintable texture content", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await createDefaultText(page);
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  const cell = matrix.locator('[data-testid="anim-cell"][data-matrix-frame="0"]');
  await cell.click({ button: "right" });
  await page.getByRole("button", { name: "Rasterize text", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Text rasterized");
  expect(await cellTextId(page, "layer0", 0)).toBeNull();
  expect(await cellTextureId(page, "layer0", 0)).not.toBeNull();
  await setBrushColor(page, "#ff0000");
  await page.keyboard.press("b");
  await paintCenter(page);
  const redCount = await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { readPixel(x: number, y: number): { r: number; g: number; b: number; a: number } | null } };
    };
    const engine = root.__gnumarus?.engine;
    if (engine === undefined) {
      return -1;
    }
    let count = 0;
    for (let y = 0; y < 256; y += 2) {
      for (let x = 0; x < 256; x += 2) {
        const pixel = engine.readPixel(x, y);
        if (pixel !== null && pixel.r === 255 && pixel.g === 0 && pixel.b === 0 && pixel.a === 255) {
          count += 1;
        }
      }
    }
    return count;
  });
  expect(redCount).toBeGreaterThan(0);
});

test("text survives save and reopen", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.locator('gnumarus-shell [data-testid="tool-text"]').click();
  await paintCenter(page);
  const area = page.locator('gnumarus-shell [data-testid="text-editor-area"]');
  await area.click();
  await page.keyboard.press("Control+a");
  await page.keyboard.type("Hello");
  await page.locator('gnumarus-shell [data-testid="text-ok"]').click();
  await expect(page.locator("gnumarus-shell")).toContainText("Text updated");
  const project = await stubProjectDirectory(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  const saved = await project.writtenProject();
  expect(saved).toContain('"texts"');
  expect(saved).toContain("Hello");
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Open Project" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Opened MockProject");
  const textId = await cellTextId(page, "layer0", 0);
  expect(typeof textId).toBe("string");
  expect(await textHtml(page, textId as string)).toContain("Hello");
  expect(await textPaintedPixels(page)).toBeGreaterThan(0);
  await stubSaveFilePicker(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Export" }).click();
  const exportDialog = page.locator("gnumarus-shell dialog#exportDialog");
  await expect(exportDialog).toBeVisible();
  await exportDialog.locator("#exportOk").click();
  await expect(page.locator("gnumarus-shell")).toContainText("Exported");
  const painted = await page.evaluate(async () => {
    const root = window as unknown as {
      __gnumarusExportTest?: { fileName: string | null; blob: Blob | null };
    };
    const blob = root.__gnumarusExportTest?.blob;
    if (blob === null || blob === undefined) {
      return -1;
    }
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (context === null) {
      bitmap.close();
      return -1;
    }
    context.drawImage(bitmap, 0, 0);
    const data = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
    let count = 0;
    for (let index = 3; index < data.length; index += 16) {
      if ((data[index] ?? 0) > 0) {
        count += 1;
      }
    }
    bitmap.close();
    return count;
  });
  expect(painted).toBeGreaterThan(0);
});

test("content picker offers new text with kind badges", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintCenter(page);
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  const cell = matrix.locator('[data-testid="anim-cell"][data-matrix-frame="1"]');
  await cell.click({ button: "right" });
  await page.getByRole("button", { name: "Select content" }).click();
  await page.locator('gnumarus-shell [data-testid="content-picker-new-text"]').click();
  await expect(page.locator('gnumarus-shell [data-testid="text-editor-dialog"]')).toBeVisible();
  await page.locator('gnumarus-shell [data-testid="text-cancel"]').click();
  const textId = await cellTextId(page, "layer0", 1);
  expect(typeof textId).toBe("string");
  await cell.click({ button: "right" });
  await page.getByRole("button", { name: "Select content" }).click();
  const kinds = await page.locator('gnumarus-shell [data-testid="content-picker-kind"]').allTextContents();
  expect(kinds).toContain("Text");
  expect(kinds).toContain("Texture");
});

test("text storage html saves raw files and reopens", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const textId = await createHelloText(page);
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  const dialog = page.locator("gnumarus-shell dialog#settingsDialog");
  await expect(dialog).toBeVisible();
  await dialog.locator("select#storageTextStorage").selectOption("html");
  await dialog.getByRole("button", { name: "Close" }).click();
  const project = await stubProjectDirectory(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  expect(Object.keys(await project.writtenBlobs()).sort()).toEqual(
    ["project.gpa", `texts/${textId}.html`].sort(),
  );
  const saved = await project.writtenProject();
  expect(saved).toContain(`"file": "texts/${textId}.html"`);
  expect(saved).not.toContain('"document"');
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Open Project" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Opened MockProject");
  expect(await cellTextId(page, "layer0", 0)).toBe(textId);
  expect(await textHtml(page, textId)).toContain("Hello");
  expect(await textPaintedPixels(page)).toBeGreaterThan(0);
});

test("text storage htmlZip saves archives and reopens", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const textId = await createHelloText(page);
  await setTextStorage(page, "htmlZip");
  const project = await stubProjectDirectory(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  expect(Object.keys(await project.writtenBlobs()).sort()).toEqual(
    ["project.gpa", `texts/${textId}.zip`].sort(),
  );
  const saved = await project.writtenProject();
  expect(saved).toContain(`"file": "texts/${textId}.zip"`);
  expect(saved).not.toContain('"document"');
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Open Project" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Opened MockProject");
  expect(await cellTextId(page, "layer0", 0)).toBe(textId);
  expect(await textHtml(page, textId)).toContain("Hello");
  expect(await textPaintedPixels(page)).toBeGreaterThan(0);
});

test("switching text storage removes stale text files", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const textId = await createHelloText(page);
  await setTextStorage(page, "html");
  const project = await stubProjectDirectory(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  expect(Object.keys(await project.writtenBlobs())).toContain(`texts/${textId}.html`);
  await setTextStorage(page, "embedded");
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  expect(Object.keys(await project.writtenBlobs())).not.toContain(`texts/${textId}.html`);
  expect(await project.writtenProject()).toContain('"document"');
  await setTextStorage(page, "htmlZip");
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  const files = Object.keys(await project.writtenBlobs());
  expect(files).toContain(`texts/${textId}.zip`);
  expect(files).not.toContain(`texts/${textId}.html`);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Open Project" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Opened MockProject");
  expect(await textHtml(page, textId)).toContain("Hello");
});

test("corrupt text archive fails to open with a clear error", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const textId = await createHelloText(page);
  await setTextStorage(page, "htmlZip");
  const project = await stubProjectDirectory(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  await project.seedFile(`texts/${textId}.zip`, [1, 2, 3, 4]);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Open Project" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText(
    `Open failed: text file is not a valid archive: texts/${textId}.zip`,
  );
});
