import { expect, test } from "@playwright/test";
import { buildXcfBytes, getLayers, getMatrix, loadBlankProject, paintCenter, readPixel, runPaletteAction, setImportCleanup, setPencil, stubAsepritePicker, stubDirectoryWithFileStore } from "./e2e-helpers";

test("quick action palette filters and runs actions", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { setZoom(z: number): void } } };
    root.__gnumarus?.engine?.setZoom(16);
  });
  await page.keyboard.press("Control+Shift+P");
  const dialog = page.locator("gnumarus-shell dialog#actionPaletteDialog");
  await expect(dialog).toBeVisible();
  const input = dialog.locator('[data-testid="action-palette-input"]');
  await expect(input).toBeFocused();
  await expect(dialog.locator('[data-testid="action-palette-item"]')).toHaveText([
    "Adjust brightness/contrast",
    "Adjust colors…",
    "Adjust hue/saturation",
    "Content manager",
    "Copy merged",
    "Copy selection",
    "Crop All Cells to Canvas",
    "Cut",
    "Export project",
    "Fit All Textures to Size",
    "Import 3D Model as layer",
    "Import full project",
    "Import raster image as layer",
    "Import SVG as layer",
    "Invert colors",
    "Make root layer",
    "New animation",
    "New Project",
    "Open embedded project",
    "Open Project",
    "Paste",
    "Redo",
    "Relink cell content",
    "Reload All Contents Except Textures",
    "Reload All Textures",
    "Reset Canvas Transform",
    "Save embedded project",
    "Save embedded project as",
    "Save Project",
    "Save project as",
    "Set total duration",
    "Settings",
    "Shortcuts",
    "Source code",
    "Toggle layer mask",
    "Undo",
    "Unlink cell content",
    "Upload project",
  ]);
  await input.fill("xyz-nothing");
  await expect(dialog.locator('[data-testid="action-palette-empty"]')).toBeVisible();
  await expect(dialog.locator('[data-testid="action-palette-item"]')).toHaveCount(0);
  await page.keyboard.press("Enter");
  await expect(dialog).toBeVisible();
  await input.fill("reset");
  await expect(dialog.locator('[data-testid="action-palette-item"]')).toHaveText([
    "Reset Canvas Transform",
    "Reload All Contents Except Textures",
  ]);
  await page.keyboard.press("Enter");
  await expect(dialog).toBeHidden();
  await expect(page.locator("gnumarus-shell")).toContainText("Canvas transform reset");
});

test("quick action palette runs the clicked action and closes on Escape", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { setZoom(z: number): void } } };
    root.__gnumarus?.engine?.setZoom(16);
  });
  await page.keyboard.press("Control+Shift+P");
  const dialog = page.locator("gnumarus-shell dialog#actionPaletteDialog");
  await expect(dialog).toBeVisible();
  await dialog.locator('[data-testid="action-palette-item"][data-action-id="reset-canvas-transform"]').click();
  await expect(dialog).toBeHidden();
  await expect(page.locator("gnumarus-shell")).toContainText("Canvas transform reset");
  await page.keyboard.press("Control+Shift+P");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("Digit0 resets the canvas transform", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { setZoom(z: number): void } } };
    root.__gnumarus?.engine?.setZoom(16);
  });
  await page.keyboard.press("0");
  await expect(page.locator("gnumarus-shell")).toContainText("Canvas transform reset");
});

test("Fit All Textures to Size fits every texture at once", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await setPencil(page, "#ff0000");
  await paintCenter(page);
  await page.getByRole("button", { name: "Add layer" }).click();
  await page.keyboard.press("Control+Shift+P");
  const dialog = page.locator("gnumarus-shell dialog#actionPaletteDialog");
  await expect(dialog).toBeVisible();
  await dialog.locator('[data-testid="action-palette-input"]').fill("fit all");
  await expect(dialog.locator('[data-testid="action-palette-item"]')).toHaveText(["Fit All Textures to Size"]);
  await page.keyboard.press("Enter");
  const fitDialog = page.locator("gnumarus-shell dialog#fitTextureDialog");
  await expect(fitDialog).toBeVisible();
  await expect(fitDialog.locator("input#fitThreshold")).toHaveValue("0");
  await fitDialog.getByRole("button", { name: "OK" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Fitted 1 texture to size");
  // The painted layer shrank to its single pixel; the empty layer is untouched.
  await page.locator('gnumarus-shell [data-layer-id="layer0"] .layer-name').click();
  expect(await readPixel(page, 0, 0)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 1, 0)).toBeNull();
  // A single undo reverts the whole batch.
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 0, 0)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
});

test("Crop All Cells to Canvas crops shared textures sequentially", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await setPencil(page, "#ff0000");
  await paintCenter(page);
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  // Frame 1 gets its own content reusing frame 0's texture, then moved right.
  const frameCell = matrix.locator('[data-testid="anim-cell"][data-matrix-frame="1"]');
  await frameCell.click({ button: "right" });
  await page.getByRole("button", { name: "Select content" }).click();
  await page.locator('gnumarus-shell [data-testid="content-picker-new"]').click();
  const before = await getMatrix(page);
  const textureId = before.contents[0]?.textureId ?? "";
  expect(textureId.length).toBeGreaterThan(0);
  await page.locator(`gnumarus-shell [data-testid="texture-picker-item"][data-texture-id="${textureId}"]`).click();
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { setLayerTransform(id: string, t: unknown): boolean } } };
    root.__gnumarus?.engine?.setLayerTransform("layer0", { x: 10, y: 0 });
  });
  await page.keyboard.press("Control+Shift+P");
  const dialog = page.locator("gnumarus-shell dialog#actionPaletteDialog");
  await expect(dialog).toBeVisible();
  await dialog.locator('[data-testid="action-palette-input"]').fill("crop all");
  await page.keyboard.press("Enter");
  await expect(dialog).toBeHidden();
  await expect(page.locator("gnumarus-shell")).toContainText("Cropped 1 texture to canvas (1 unchanged)");
  // Both cells keep their pixels; the shared texture shrank once.
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  await matrix.locator('[data-testid="anim-frame"][data-frame="0"]').click();
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  const state = await getLayers(page);
  expect(state.layers[0]?.width).toBe(54);
  // A single undo reverts the whole batch.
  await page.keyboard.press("Control+z");
  const restored = await getLayers(page);
  expect(restored.layers[0]?.width).toBe(64);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("Crop All Cells to Canvas crops every cell at once", async ({ page }) => {
  const bytes = buildXcfBytes(4, 4, [
    { name: "Top", width: 4, height: 4, offsetX: 2, offsetY: 2, rgba: [0, 255, 0, 255] },
    { name: "Bottom", width: 4, height: 4, offsetX: 0, offsetY: 0, rgba: [0, 0, 255, 255] },
  ]);
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell");
  await setImportCleanup(page, "none");
  await stubAsepritePicker(page, "crop.xcf", bytes);
  await page.getByRole("button", { name: "File" }).click();
  await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Import full project", exact: true }).click();
  await expect(page.locator('gnumarus-shell [data-testid="toast"]')).toContainText("Imported crop.xcf (2 layers)");
  let state = await getLayers(page);
  expect(state.layers[1]?.transform).toMatchObject({ x: 2, y: 2 });
  expect(state.layers[1]?.width).toBe(4);
  await page.keyboard.press("Control+Shift+P");
  const dialog = page.locator("gnumarus-shell dialog#actionPaletteDialog");
  await expect(dialog).toBeVisible();
  await dialog.locator('[data-testid="action-palette-input"]').fill("crop all");
  await expect(dialog.locator('[data-testid="action-palette-item"]')).toHaveText(["Crop All Cells to Canvas"]);
  await page.keyboard.press("Enter");
  await expect(dialog).toBeHidden();
  await expect(page.locator("gnumarus-shell")).toContainText("Cropped 1 texture to canvas");
  // The offset layer shrank to its visible 2x2 and re-seated; the full layer is untouched.
  state = await getLayers(page);
  expect(state.layers[1]?.transform).toMatchObject({ x: 1, y: 1 });
  expect(state.layers[1]?.width).toBe(2);
  expect(state.layers[1]?.height).toBe(2);
  expect(await readPixel(page, 0, 0)).toEqual({ r: 0, g: 255, b: 0, a: 255 });
  expect(await readPixel(page, 2, 0)).toBeNull();
  // A single undo reverts the whole batch.
  await page.keyboard.press("Control+z");
  state = await getLayers(page);
  expect(state.layers[1]?.transform).toMatchObject({ x: 2, y: 2 });
  expect(state.layers[1]?.width).toBe(4);
});

test("Reload All Textures without a saved project shows an error toast", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await runPaletteAction(page, "reload all textures");
  await expect(page.locator("gnumarus-shell")).toContainText(
    "Reload textures failed: the project has not been saved yet",
  );
});

test("Reload All Textures restores saved files, skips new textures and undoes", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await stubDirectoryWithFileStore(page);
  // Create an empty texture via the pickers so the save records a blank file.
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.locator('[data-testid="anim-cell"][data-matrix-layer="layer0"][data-matrix-frame="0"]').click({ button: "right" });
  await page.getByRole("button", { name: "Select content" }).click();
  await page.locator('gnumarus-shell [data-testid="content-picker-new"]').click();
  await page.locator('gnumarus-shell [data-testid="texture-picker-new"]').click();
  await page.keyboard.press("Control+s");
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockDir");
  // Paint after saving, then add a layer and paint it (texture with no file on disk).
  await paintCenter(page);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  await page.getByRole("button", { name: "Add layer" }).click();
  await paintCenter(page);
  await runPaletteAction(page, "reload all textures");
  await expect(page.locator("gnumarus-shell")).toContainText("Reloaded 1 texture (1 skipped)");
  // The saved layer is back to its on-disk (blank) pixels.
  await page.locator('gnumarus-shell [data-layer-id="layer0"] .layer-name').click();
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  // A single undo restores the painted pixels.
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
});
