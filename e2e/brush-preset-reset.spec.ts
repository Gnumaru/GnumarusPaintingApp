import { expect, test } from "@playwright/test";
import { loadBlankProject } from "./e2e-helpers";

test("brush preset reset restores toolbar settings @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  const options = page.locator('gnumarus-shell [aria-label="Brush options"]');
  await options.locator("select#brushPreset").selectOption("Chalk");
  await expect(page.locator("gnumarus-shell")).toContainText("Preset: Chalk");
  await expect(options.locator("input#brushSize")).toHaveValue("20");
  await expect(options.locator("input#paintGrainStrength")).toHaveValue("60");
  // Reset button sits immediately left of the preset select.
  const reset = options.locator('[data-testid="brush-reset"]');
  await expect(reset).toBeVisible();
  const selectBox = await options.locator("select#brushPreset").boundingBox();
  const resetBox = await reset.boundingBox();
  expect(selectBox).not.toBeNull();
  expect(resetBox).not.toBeNull();
  expect(resetBox!.x).toBeLessThan(selectBox!.x);
  // Dirty a setting, then reset.
  await options.locator("input#brushSize").fill("3");
  await expect(options.locator("input#brushSize")).toHaveValue("3");
  await reset.click();
  await expect(page.locator("gnumarus-shell")).toContainText("Preset: Chalk");
  await expect(options.locator("input#brushSize")).toHaveValue("20");
  await expect(options.locator("input#paintGrainStrength")).toHaveValue("60");
});

test("brush preset reset works in the color-picker side panel @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  const canvas = page.locator("gnumarus-shell canvas[data-engine]");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: "right" });
  const picker = page.locator("gnumarus-shell #brushColor");
  await expect(picker.getByRole("dialog", { name: "Color picker" })).toBeVisible();
  const panel = picker.locator("[data-testid='brush-side-panel']");
  await expect(panel).toBeVisible();
  await panel.locator("select#brushPresetPanel").selectOption("Soft Round");
  await expect(page.locator("gnumarus-shell")).toContainText("Preset: Soft Round");
  await expect(panel.locator("input#brushSizePanel")).toHaveValue("16");
  const reset = panel.locator('[data-testid="brush-resetPanel"]');
  await expect(reset).toBeVisible();
  await panel.locator("input#brushSizePanel").fill("5");
  await expect(panel.locator("input#brushSizePanel")).toHaveValue("5");
  await reset.click();
  await expect(page.locator("gnumarus-shell")).toContainText("Preset: Soft Round");
  await expect(panel.locator("input#brushSizePanel")).toHaveValue("16");
  await page.keyboard.press("Escape");
});
