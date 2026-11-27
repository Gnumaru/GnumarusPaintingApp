import { expect, test } from "@playwright/test";
import { getGrid, loadBlankProject } from "./e2e-helpers";

async function openBackgroundWindow(page: import("@playwright/test").Page): Promise<import("@playwright/test").Locator> {
  await page.locator('gnumarus-shell [data-testid="background-button"]').click();
  const bgWindow = page.locator('gnumarus-shell [data-testid="background-window"]');
  await expect(bgWindow).toBeVisible();
  return bgWindow;
}

test("background button opens a draggable window and closes it @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  const bgWindow = await openBackgroundWindow(page);
  await expect(bgWindow).toContainText("Background");
  const box = await bgWindow.boundingBox();
  expect(box).not.toBeNull();
  const header = bgWindow.locator(".preview-header");
  const headerBox = await header.boundingBox();
  if (headerBox === null) {
    throw new Error("background window header has no bounding box");
  }
  await page.mouse.move(headerBox.x + headerBox.width / 2, headerBox.y + headerBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(headerBox.x + headerBox.width / 2 + 60, headerBox.y + headerBox.height / 2 + 40, { steps: 5 });
  await page.mouse.up();
  const moved = await bgWindow.boundingBox();
  expect(moved?.x).toBeGreaterThan((box?.x ?? 0) + 30);
  await bgWindow.getByRole("button", { name: "Close", exact: true }).click();
  await expect(bgWindow).toBeHidden();
});

test("background window edits match Edit > Settings @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  const bgWindow = await openBackgroundWindow(page);
  // Background mode flips both dialogs (shared state).
  await bgWindow.locator("select#backgroundModeBg").selectOption("solid");
  await expect(page.locator('gnumarus-shell dialog#settingsDialog select#backgroundMode')).toHaveValue("solid");
  await bgWindow.locator("select#backgroundModeBg").selectOption("checkerboard");
  // Checker width applies live to the engine.
  await bgWindow.locator("input#checkerSizeXBg").fill("32");
  await expect(page.locator("gnumarus-shell")).toContainText("32");
  // Grid rows drive the same engine state as the settings dialog.
  await bgWindow.locator("input#gridOpacityBg").fill("50");
  expect((await getGrid(page)).opacityPercent).toBe(50);
  await bgWindow.locator("input#gridMinZoomBg").fill("400");
  expect((await getGrid(page)).minZoom).toBeCloseTo(4, 5);
  const persisted = await page.evaluate(() => window.localStorage.getItem("gnumarus.settings.grid.v1"));
  expect(persisted).toContain("50");
  // Solid color picker writes through the shared hook.
  await bgWindow.locator("select#backgroundModeBg").selectOption("solid");
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { setBackgroundColor(hex: string): void } } };
    root.__gnumarus?.shell?.setBackgroundColor("#112233");
  });
  await expect(page.locator("gnumarus-shell")).toContainText("#112233");
});
