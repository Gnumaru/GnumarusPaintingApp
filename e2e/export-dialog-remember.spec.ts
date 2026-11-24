import { expect, test } from "@playwright/test";
import { addAnimation, addFrames, loadBlankProject, paintCenter, stubSaveFilePicker } from "./e2e-helpers";

async function openExport(page: import("@playwright/test").Page): Promise<import("@playwright/test").Locator> {
  await page.getByRole("button", { name: "File" }).click();
  await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Export" }).click();
  const dialog = page.locator("gnumarus-shell dialog#exportDialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

test("export frame tab remembers every field across close and reopen", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintCenter(page);
  await stubSaveFilePicker(page);
  let dialog = await openExport(page);
  // Change everything on the frame tab, then cancel without exporting.
  await dialog.locator("#exportFrame").fill("1");
  await dialog.locator("#exportFormat").selectOption("image/jpeg");
  await dialog.locator("#exportQuality").fill("77");
  await dialog.getByRole("checkbox", { name: "Export background" }).check();
  await dialog.locator("#exportBackgroundTypeFrame").selectOption("solid");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
  // Reopen: all values are back.
  dialog = await openExport(page);
  await expect(dialog.locator("#exportFrame")).toHaveValue("1");
  await expect(dialog.locator("#exportFormat")).toHaveValue("image/jpeg");
  await expect(dialog.locator("#exportQuality")).toHaveValue("77");
  await expect(dialog.getByRole("checkbox", { name: "Export background" })).toBeChecked();
});

test("export sheet tab remembers animations, frames, layout and data checkbox", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintCenter(page);
  await addFrames(page, 2);
  await addAnimation(page, "walk,none,1,2");
  await stubSaveFilePicker(page);
  let dialog = await openExport(page);
  await dialog.locator('[data-testid="export-tab-sheet"]').click();
  await dialog.locator("#exportSheetAnimations").selectOption(["walk"]);
  await dialog.locator("#exportSheetFrames").fill("1,2");
  await dialog.locator("select#exportSheetLayout").selectOption("per-line");
  await dialog.locator("select#exportSheetTrim").selectOption("individual");
  await dialog.getByRole("checkbox", { name: "Allow rotation" }).uncheck();
  await dialog.getByRole("checkbox", { name: "Export animation data" }).uncheck();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
  dialog = await openExport(page);
  await dialog.locator('[data-testid="export-tab-sheet"]').click();
  await expect(dialog.locator("#exportSheetAnimations")).toHaveValues(["walk"]);
  await expect(dialog.locator("#exportSheetFrames")).toHaveValue("1,2");
  await expect(dialog.locator("select#exportSheetLayout")).toHaveValue("per-line");
  await expect(dialog.locator("select#exportSheetTrim")).toHaveValue("individual");
  await expect(dialog.getByRole("checkbox", { name: "Allow rotation" })).not.toBeChecked();
  await expect(dialog.getByRole("checkbox", { name: "Export animation data" })).not.toBeChecked();
});

test("export dialog remembers the active tab", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  let dialog = await openExport(page);
  await dialog.locator('[data-testid="export-tab-sheet"]').click();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
  dialog = await openExport(page);
  await expect(dialog.locator("#exportSheetLayout")).toBeVisible();
});
