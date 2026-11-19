import { expect, test } from "@playwright/test";

async function openNewDialog(page: import("@playwright/test").Page): Promise<import("@playwright/test").Locator> {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "New Project" }).click();
  const dialog = page.locator("gnumarus-shell dialog#newDialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

test("new dialog links fps and frametime @recent", async ({ page }) => {
  const dialog = await openNewDialog(page);
  // Default preset is a non-pixel one: 12 fps.
  await expect(dialog.locator("select#newPreset")).toHaveValue("digital painting lossless");
  await expect(dialog.locator("input#newFps")).toHaveValue("12");
  await expect(dialog.locator("input#newFrametime")).toHaveValue("0.083333333");
  // Pixel presets switch to 4 fps.
  await dialog.locator("select#newPreset").selectOption("pixel sprite small");
  await expect(dialog.locator("input#newFps")).toHaveValue("4");
  await expect(dialog.locator("input#newFrametime")).toHaveValue("0.25");
  // Typing fps updates frametime and drops the preset to Custom.
  await dialog.locator("input#newFps").fill("24");
  await expect(dialog.locator("input#newFrametime")).toHaveValue("0.041666667");
  await expect(dialog.locator("select#newPreset")).toHaveValue("");
  // Typing frametime updates fps, including through a partial decimal.
  const frametime = dialog.locator("input#newFrametime");
  await frametime.click();
  await page.keyboard.press("ControlOrMeta+a");
  await frametime.pressSequentially("0.", { delay: 20 });
  await expect(dialog.locator("input#newFps")).toHaveValue("24");
  await frametime.pressSequentially("5", { delay: 20 });
  await expect(dialog.locator("input#newFps")).toHaveValue("2");
  await page.keyboard.press("Escape");
});

test("new project applies frametime to the default frame duration @recent", async ({ page }) => {
  const dialog = await openNewDialog(page);
  await dialog.locator("select#newPreset").selectOption("pixel sprite small");
  await dialog.locator("input#newFps").fill("8");
  await expect(dialog.locator("input#newFrametime")).toHaveValue("0.125");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("New 16 x 16 canvas");
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.locator("gnumarus-shell input#defaultFrameDuration")).toHaveValue("0.125");
  await page.keyboard.press("Escape");
});
