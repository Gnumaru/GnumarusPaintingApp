import { expect, test } from "@playwright/test";
import { loadBlankProject, readPixel } from "./e2e-helpers";

/**
 * Regression: Ctrl+Z/Ctrl+Y must reach the canvas even when a non-text panel
 * control was touched last (the canvas is not focusable, so focus otherwise
 * stays on that control and the old blanket `inField` gate swallowed the
 * shortcut). Text inputs keep native undo; painting after editing one blurs
 * it so canvas undo works again.
 */
async function paintStroke(page: import("@playwright/test").Page): Promise<void> {
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 12, box.y + box.height / 2 + 12, { steps: 4 });
  await page.mouse.up();
}

const PAINTED = { r: 0, g: 0, b: 0, a: 255 };
const BLANK = { r: 0, g: 0, b: 0, a: 0 };

test("undo works while a slider or dropdown is focused", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintStroke(page);
  expect(await readPixel(page, 32, 32)).toEqual(PAINTED);

  // Focus the layer-opacity slider (range input): canvas undo must win.
  await page.locator('gnumarus-shell .layer-opacity input[type="range"]').focus();
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 32, 32)).toEqual(BLANK);

  // Redo, then focus the blend-mode dropdown (select): canvas redo/undo win.
  await page.keyboard.press("Control+y");
  expect(await readPixel(page, 32, 32)).toEqual(PAINTED);
  await page.locator("gnumarus-shell .layer-blend select").focus();
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 32, 32)).toEqual(BLANK);

  // Redo, then focus the layer-visibility checkbox: canvas undo still wins.
  await page.keyboard.press("Control+y");
  expect(await readPixel(page, 32, 32)).toEqual(PAINTED);
  await page.locator('gnumarus-shell .layer-top input[type="checkbox"]').first().focus();
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 32, 32)).toEqual(BLANK);
});

test("painting after editing a number input restores canvas undo", async ({ page }) => {
  // End-to-end guarantee: focusing a text-like number input and then
  // painting leaves canvas undo on Ctrl+Z. (In Chromium a real canvas
  // mousedown already releases focus natively; the engine's explicit blur
  // on pointerdown covers tools and browsers where it does not.)
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);

  // Focus a text-like number input, then paint: the canvas pointerdown blurs
  // the input, so the following Ctrl+Z undoes the stroke (not the field).
  await page.locator('gnumarus-shell [data-testid="tool-options"] #brushSize').focus();
  await paintStroke(page);
  expect(await readPixel(page, 32, 32)).toEqual(PAINTED);
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 32, 32)).toEqual(BLANK);
});
