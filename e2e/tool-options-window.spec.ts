import { expect, test } from "@playwright/test";
import { loadBlankProject, selectTool } from "./e2e-helpers";

test("general bar has a Tool options button and 3D Lighting label", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const bar = page.locator('gnumarus-shell [data-testid="editor-options"]');
  await expect(bar.getByRole("button", { name: "Tool options" })).toBeVisible();
  // The button is the leftmost control of the bar.
  const firstLabel = await bar.locator(":scope > *").first().textContent();
  expect(firstLabel).toContain("Tool options");
  await expect(bar).toContainText("3D Lighting");
});

test("tool options window mirrors the bar vertically and edits live", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  const bar = page.locator('gnumarus-shell [data-testid="editor-options"]');
  await bar.getByRole("button", { name: "Tool options" }).click();
  const win = page.locator('gnumarus-shell [data-testid="tool-options-window"]');
  await expect(win).toBeVisible();
  // Vertical layout like the color picker side panel.
  await expect(page.locator('gnumarus-shell [data-testid="tool-options-window"]')).toHaveCSS("flex-direction", "column");
  // Same brush size control as the bar; editing in the window updates the bar.
  const winSize = win.locator("#brushSizeWindow");
  await expect(winSize).toHaveValue("1");
  await winSize.fill("7.5");
  await expect(page.locator("gnumarus-shell #brushSize")).toHaveValue("7.5");
  // Switching tools swaps the window content.
  await selectTool(page, "Line");
  await expect(win.locator("#lineWidthWindow")).toBeVisible();
  await expect(win.locator("#brushSizeWindow")).toBeHidden();
  await win.locator("#lineWidthWindow").fill("3");
  await expect(page.locator("gnumarus-shell #lineWidth")).toHaveValue("3");
});

test("tool options window drags by its header and closes", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const bar = page.locator('gnumarus-shell [data-testid="editor-options"]');
  await bar.getByRole("button", { name: "Tool options" }).click();
  const win = page.locator('gnumarus-shell [data-testid="tool-options-float"]');
  await expect(win).toBeVisible();
  const boxBefore = await win.boundingBox();
  const header = win.locator(".preview-header");
  const headerBox = await header.boundingBox();
  if (boxBefore === null || headerBox === null) {
    throw new Error("tool options window has no bounding box");
  }
  await page.mouse.move(headerBox.x + headerBox.width / 2, headerBox.y + headerBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(headerBox.x + headerBox.width / 2 + 60, headerBox.y + headerBox.height / 2 + 40, { steps: 5 });
  await page.mouse.up();
  const boxAfter = await win.boundingBox();
  if (boxAfter === null) {
    throw new Error("tool options window lost its bounding box");
  }
  expect(Math.round(boxAfter.x - boxBefore.x)).toBe(60);
  expect(Math.round(boxAfter.y - boxBefore.y)).toBe(40);
  await win.getByRole("button", { name: "Close" }).click();
  await expect(win).toBeHidden();
  await bar.getByRole("button", { name: "Tool options" }).click();
  await expect(win).toBeVisible();
});

test("every tool stacks its options vertically in the window, rows stay in the bar @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  const runAction = (id: string): Promise<boolean> =>
    page.evaluate((actionId: string) => {
      const root = window as unknown as { __gnumarus?: { shell?: { runAction(actionId: string): boolean } } };
      return root.__gnumarus?.shell?.runAction(actionId) ?? false;
    }, id);
  // Delegated option groups (shapes, retouch, tile brush) used to lose the
  // window testid and fall back to the horizontal bar layout.
  for (const action of ["tool-rectangle", "tool-shading", "tool-tilebrush"]) {
    expect(await runAction(action)).toBe(true);
    await page.locator('gnumarus-shell [data-testid="tool-options-button"]').click();
    const win = page.locator('gnumarus-shell [data-testid="tool-options-window"]');
    await expect(win).toBeVisible();
    await expect(win).toHaveCSS("flex-direction", "column");
    const first = await win.locator(":scope > *").nth(0).boundingBox();
    const second = await win.locator(":scope > *").nth(1).boundingBox();
    if (first === null || second === null) {
      throw new Error(`dialog options have no boxes for ${action}`);
    }
    expect(second.y).toBeGreaterThan(first.y);
    await page.locator('gnumarus-shell [data-testid="tool-options-float"]').getByRole("button", { name: "Close" }).click();
    await expect(win).toBeHidden();
  }
  // The bar itself keeps the horizontal row layout.
  await expect(page.locator('gnumarus-shell [data-testid="tool-options"]')).toHaveCSS("flex-direction", "row");
});
