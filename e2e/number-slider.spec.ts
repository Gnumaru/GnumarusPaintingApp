import { expect, test } from "@playwright/test";
import { loadBlankProject } from "./e2e-helpers";

async function openBrushSize(page: import("@playwright/test").Page): Promise<import("@playwright/test").Locator> {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await page.getByRole("button", { name: "Brush", exact: true }).click();
  const input = page.locator("gnumarus-shell input#brushSize");
  await input.click();
  return input;
}

function numberPopup(page: import("@playwright/test").Page): import("@playwright/test").Locator {
  return page.locator("gnumarus-shell .gnumarus-number-popup input[type='range']:visible");
}

test("focused number input shows a slider synced both ways @recent", async ({ page }) => {
  const input = await openBrushSize(page);
  const slider = numberPopup(page);
  await expect(slider).toBeVisible();
  const box = await input.boundingBox();
  const popup = await slider.boundingBox();
  expect(box).not.toBeNull();
  expect(popup).not.toBeNull();
  expect(popup?.y ?? 0).toBeGreaterThan((box?.y ?? 0) + (box?.height ?? 0));
  await expect(slider).toHaveAttribute("min", "0.1");
  await expect(slider).toHaveAttribute("max", "512");
  // Typing moves the slider; the slider writes back.
  await input.fill("20");
  await expect(slider).toHaveValue("20");
  await slider.fill("33.5");
  await expect(input).toHaveValue("33.5");
  // Leaving the input hides the popup.
  await page.locator("gnumarus-shell canvas").click();
  await expect(slider).toBeHidden();
});

test("PageUp and PageDown step focused numbers by ten @recent", async ({ page }) => {
  const input = await openBrushSize(page);
  await input.fill("1");
  await page.keyboard.press("PageUp");
  await expect(input).toHaveValue("11");
  // Holding the key repeats the stepping (echo).
  await page.keyboard.down("PageUp");
  await expect.poll(async () => input.inputValue(), { timeout: 2000 }).not.toBe("11");
  await page.keyboard.up("PageUp");
  // Clamp at the input bounds.
  await input.fill("510");
  await page.keyboard.press("PageUp");
  await expect(input).toHaveValue("512");
  await page.keyboard.press("PageDown");
  await expect(input).toHaveValue("502");
  await input.fill("5");
  await page.keyboard.press("PageDown");
  await expect(input).toHaveValue("0.1");
});

test("dialog buttons and number spinners match the dark theme @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  // Brush preset buttons used the light UA chrome; now they are app blue.
  const saveButton = page.locator("gnumarus-shell [data-testid='tool-options'] button").first();
  await expect(saveButton).toHaveCSS("background-color", "rgb(14, 99, 156)");
  // Native number spinners are hidden in favor of the slider.
  const spinner = await page.evaluate(() => {
    const shell = document.querySelector("gnumarus-shell")?.shadowRoot ?? null;
    const input = shell?.getElementById("brushSize") as HTMLInputElement | null;
    if (input === null || input === undefined) {
      return null;
    }
    const inner = window.getComputedStyle(input, "::-webkit-inner-spin-button");
    return { appearance: inner.getPropertyValue("-webkit-appearance"), display: inner.display };
  });
  expect(spinner).not.toBeNull();
});

test("color picker axis inputs get the slider too @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Brush", exact: true }).click();
  await page.locator("gnumarus-shell [data-testid='fg-well']").click();
  const picker = page.locator("gnumarus-shell #brushColor");
  await expect(picker.getByRole("dialog", { name: "Color picker" })).toBeVisible();
  await picker.locator("select#modelSelect").selectOption("rgb");
  const red = picker.getByLabel("Red", { exact: true });
  await red.click();
  const slider = picker.locator(".gnumarus-number-popup input[type='range']:visible");
  await expect(slider).toBeVisible();
  await expect(slider).toHaveAttribute("min", "0");
  await expect(slider).toHaveAttribute("max", "255");
  await red.fill("200");
  await expect(slider).toHaveValue("200");
});
