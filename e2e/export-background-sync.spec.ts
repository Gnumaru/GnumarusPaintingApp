import { expect, test } from "@playwright/test";
import { loadBlankProject } from "./e2e-helpers";

/** The export-background controls are shared state: every tab must mirror
 * them exactly (checked + dropdown visibility), never partially. */
test("export background stays in sync across export tabs @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await page.getByRole("button", { name: "File" }).click();
  await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Export" }).click();
  const dialog = page.locator("gnumarus-shell dialog#exportDialog");
  await expect(dialog).toBeVisible();
  const frameBox = dialog.locator("#exportBackgroundFrame");
  const frameType = dialog.locator("#exportBackgroundTypeFrame");
  const animBox = dialog.locator("#exportBackgroundAnimated");
  const animType = dialog.locator("#exportBackgroundTypeAnimated");
  const sheetBox = dialog.locator("#exportBackgroundSheet");
  const sheetType = dialog.locator("#exportBackgroundTypeSheet");

  await expect(frameBox).not.toBeChecked();
  await frameBox.check();
  await expect(frameType).toBeVisible();

  await dialog.locator('[data-testid="export-tab-animation"]').click();
  await expect(animBox).toBeChecked();
  await expect(animType).toBeVisible();
  await animBox.uncheck();
  await expect(animType).toBeHidden();

  await dialog.locator('[data-testid="export-tab-frame"]').click();
  await expect(frameBox).not.toBeChecked();
  await expect(frameType).toBeHidden();

  await dialog.locator('[data-testid="export-tab-sheet"]').click();
  await sheetBox.check();
  await expect(sheetType).toBeVisible();
  await dialog.locator('[data-testid="export-tab-animation"]').click();
  await expect(animBox).toBeChecked();
  await expect(animType).toBeVisible();
});
