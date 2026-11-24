import { expect, test } from "@playwright/test";
import { loadBlankProject } from "./e2e-helpers";

async function openBrushColorPicker(page: import("@playwright/test").Page) {
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
  await picker.locator("select#modelSelect").selectOption("hsl");
  return picker;
}

test("typing 123 into the HSL hue input keeps every digit @recent", async ({ page }) => {
  const picker = await openBrushColorPicker(page);
  const hue = picker.locator("input.axis-input[data-axis='h']");
  await hue.click();
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Delete");
  // Slow enough for Lit re-renders to interleave between keystrokes: the
  // regression formatted "1" as "1.0" mid-typing, yielding "1.023".
  await page.keyboard.type("123", { delay: 60 });
  await expect(hue).toHaveValue("123");
  // Blurring commits and snaps to the axis precision. (Tab is reserved:
  // the shell intercepts it to hide the interface, and programmatic blur()
  // alone does not fire change, so dispatch the real commit event too.)
  await hue.evaluate((element: HTMLInputElement) => {
    element.blur();
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect(hue).toHaveValue("123.0");
  await page.keyboard.press("Escape");
});

test("select-all then typing over the hue value replaces it @recent", async ({ page }) => {
  const picker = await openBrushColorPicker(page);
  const hue = picker.locator("input.axis-input[data-axis='h']");
  await hue.click();
  await page.keyboard.press("Control+A");
  await page.keyboard.type("45", { delay: 60 });
  await expect(hue).toHaveValue("45");
  await hue.evaluate((element: HTMLInputElement) => {
    element.blur();
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect(hue).toHaveValue("45.0");
  await page.keyboard.press("Escape");
});
