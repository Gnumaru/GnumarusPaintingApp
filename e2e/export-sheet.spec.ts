import { expect, test } from "@playwright/test";
import { addAnimation, addFrames, exportedFile, exportedSheetPixels, loadBlankProject, paintCenter, setEmptyCellHold, stubSaveFilePicker } from "./e2e-helpers";

async function openSheetTab(page: import("@playwright/test").Page): Promise<import("@playwright/test").Locator> {
  await page.getByRole("button", { name: "File" }).click();
  await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Export" }).click();
  const dialog = page.locator("gnumarus-shell dialog#exportDialog");
  await expect(dialog).toBeVisible();
  await dialog.locator('[data-testid="export-tab-sheet"]').click();
  return dialog;
}

test("spritesheet animations select through a multi-select", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await setEmptyCellHold(page, false);
  await addFrames(page, 2);
  await addAnimation(page, "a,none,1,2");
  await addAnimation(page, "b,none,3");
  await page.locator('gnumarus-shell [data-testid="anim-frame"][data-frame="0"]').click();
  await paintCenter(page);
  await stubSaveFilePicker(page);
  const dialog = await openSheetTab(page);
  const select = dialog.locator("#exportSheetAnimations");
  await expect(select).toHaveJSProperty("multiple", true);
  await expect(select.locator("option")).toHaveText(["a", "b"]);
  // The old per-animation checkbox list is gone; the all-frames checkbox stays.
  await expect(dialog.locator("#exportSheetAnimations option")).toHaveCount(2);
  await expect(dialog.locator("#exportSheetAll")).toBeVisible();
  await select.selectOption(["a", "b"]);
  await dialog.locator("select#exportSheetLayout").selectOption("per-line");
  await dialog.locator("#exportSheetOk").click();
  await expect(page.locator("gnumarus-shell")).toContainText("Exported");
  const sheet = await exportedSheetPixels(page);
  expect(sheet?.width).toBe(128);
  expect(sheet?.height).toBe(128);
  expect(sheet?.cells[0]).toEqual([0, 0, 0, 255]);
  expect(sheet?.cells[1]).toEqual([0, 0, 0, 0]);
  expect(sheet?.cells[2]).toEqual([0, 0, 0, 0]);
});

test("wide spritesheet packs round columns up, narrow packs down", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await addFrames(page, 2);
  await page.locator('gnumarus-shell [data-testid="anim-frame"][data-frame="0"]').click();
  await paintCenter(page);
  await stubSaveFilePicker(page);
  const exportPacked = async (): Promise<{ width?: number; height?: number } | null> => {
    await page.getByRole("button", { name: "File" }).click();
    await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Export" }).click();
    const dialog = page.locator("gnumarus-shell dialog#exportDialog");
    await expect(dialog).toBeVisible();
    await dialog.locator('[data-testid="export-tab-sheet"]').click();
    await dialog.getByRole("checkbox", { name: "All frames" }).check();
    await dialog.locator("select#exportSheetLayout").selectOption("packed");
    await dialog.locator("#exportSheetOk").click();
    await expect(page.locator("gnumarus-shell")).toContainText("Exported");
    return exportedFile(page);
  };
  // Wide (default): 3 frames pack into 2 columns x 2 rows.
  const wide = await exportPacked();
  expect(wide?.width).toBe(128);
  expect(wide?.height).toBe(128);
  // Let the first toast expire so the next export's completion is fresh.
  await expect(page.locator('gnumarus-shell [data-testid="toast"]')).toBeHidden();
  // Narrow: 3 frames pack into 1 column x 3 rows.
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { setWideSpritesheetPacks(v: boolean): void } } };
    root.__gnumarus?.shell?.setWideSpritesheetPacks(false);
  });
  await exportPacked();
  // Poll the file itself: the success toast also matches hidden text,
  // so only the new blob proves the second export landed.
  await expect
    .poll(async () => (await exportedFile(page))?.width, { timeout: 15000 })
    .toBe(64);
  const narrow = await exportedFile(page);
  expect(narrow?.width).toBe(64);
  expect(narrow?.height).toBe(192);
});

test("fixed columns shrink to content unless full size is ensured", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintCenter(page);
  await stubSaveFilePicker(page);
  const exportFixed = async (): Promise<void> => {
    const dialog = await openSheetTab(page);
    await dialog.getByRole("checkbox", { name: "All frames" }).check();
    await dialog.locator("select#exportSheetLayout").selectOption("fixed-cols");
    await dialog.locator("#exportSheetCount").fill("9");
  };
  // Default (unchecked): the fixed count is a maximum, so one frame stays 64x64.
  await exportFixed();
  const dialog = page.locator('gnumarus-shell dialog#exportDialog');
  await expect(dialog.getByRole("checkbox", { name: "Ensure full size" })).not.toBeChecked();
  await expect(dialog.getByRole("checkbox", { name: "Ensure full size" })).toBeVisible();
  await dialog.locator("#exportSheetOk").click();
  await expect(page.locator("gnumarus-shell")).toContainText("Exported");
  expect((await exportedFile(page))?.width).toBe(64);
  expect((await exportedFile(page))?.height).toBe(64);
  await expect(page.locator('gnumarus-shell [data-testid="toast"]')).toBeHidden();
  // Checked: the 9-column grid is kept, so one 64px frame exports as 576x64.
  await exportFixed();
  await page
    .locator('gnumarus-shell dialog#exportDialog')
    .getByRole("checkbox", { name: "Ensure full size" })
    .check();
  await page.locator('gnumarus-shell dialog#exportDialog').locator("#exportSheetOk").click();
  await expect
    .poll(async () => (await exportedFile(page))?.width, { timeout: 15000 })
    .toBe(576);
  expect((await exportedFile(page))?.height).toBe(64);
});
