import { expect, test } from "@playwright/test";
import { layerScreenTarget, loadBlankProject, readPixel } from "./e2e-helpers";

test("pixel tip shows flow and thins dither at lower flow @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  const options = page.locator('gnumarus-shell [aria-label="Brush options"]');
  await options.locator("select#brushPreset").selectOption("Pixel Dither");
  await expect(page.locator("gnumarus-shell")).toContainText("Preset: Pixel Dither");
  // Flow is visible for the pixel tip; soft-only controls stay hidden.
  await expect(options.locator("input#brushFlow")).toBeVisible();
  await expect(options.locator("input#brushHardness")).toHaveCount(0);
  // Full flow: solid disk, interior pixels paint.
  const dab = await layerScreenTarget(page, 32, 32);
  await page.mouse.click(dab.x, dab.y);
  expect(await readPixel(page, 33, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 32, 33)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  // Half flow: Bayer cells at/above 0.5 stay transparent inside the disk.
  await options.locator("input#brushFlow").fill("50");
  await expect(page.locator("gnumarus-shell")).toContainText("Flow: 50");
  await page.mouse.click(dab.x, dab.y);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 33, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  expect(await readPixel(page, 32, 33)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
});

test("flow is visible in the color-picker side panel for pixel tips @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  const options = page.locator('gnumarus-shell [aria-label="Brush options"]');
  await options.locator("select#brushPreset").selectOption("Pixel Dither");
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
  await expect(panel.locator("input#brushFlowPanel")).toBeVisible();
  await panel.locator("input#brushFlowPanel").fill("50");
  await expect(page.locator("gnumarus-shell")).toContainText("Flow: 50");
  // Toolbar and panel stay in sync (same preset row, two scopes).
  await expect(options.locator("input#brushFlow")).toHaveValue("50");
  await page.keyboard.press("Escape");
});
