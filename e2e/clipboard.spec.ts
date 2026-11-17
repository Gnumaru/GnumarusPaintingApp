import { expect, test } from "@playwright/test";
import {
  dragRect,
  floatingRect,
  getFloatingSelection,
  loadBlankProject,
  paintCenter,
  paintDot,
  readFloatingPixel,
  readPixel,
  selectTool,
  setPencil,
} from "./e2e-helpers";

async function runAction(page: import("@playwright/test").Page, id: string): Promise<boolean> {
  return page.evaluate((actionId: string) => {
    const root = window as unknown as { __gnumarus?: { shell?: { runAction(id: string): boolean } } };
    return root.__gnumarus?.shell?.runAction(actionId) ?? false;
  }, id);
}

function toast(page: import("@playwright/test").Page): import("@playwright/test").Locator {
  return page.locator('gnumarus-shell [data-testid="toast"]');
}

test("copy selection and paste round-trips pixels at the same origin @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await setPencil(page, "#ff0000");
  await paintCenter(page);
  await selectTool(page, "Rectangular selection");
  await dragRect(page, 28, 28, 36, 36);
  const cutBox = await floatingRect(page);
  expect(cutBox).toMatchObject({ x: 28, y: 28, width: 9, height: 9 });
  expect(await runAction(page, "copy-selection")).toBe(true);
  expect(await runAction(page, "paste")).toBe(true);
  // Pasted floating sits where it was cut, with the same pixels.
  expect(await floatingRect(page)).toEqual(cutBox);
  expect(await readFloatingPixel(page, 4, 4)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  await page.keyboard.press("Enter");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("copy merged flattens visible layers and keeps holes transparent @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintDot(page, "#ff0000", 32, 32);
  await page.keyboard.press("Control+Shift+ArrowUp");
  await paintDot(page, "#0000ff", 40, 32);
  await selectTool(page, "Rectangular selection");
  await dragRect(page, 28, 28, 44, 36);
  // The floating selection holds the blue dot; layer 1 has a hole there now.
  expect(await runAction(page, "copy-merged")).toBe(true);
  await loadBlankProject(page, 64);
  expect(await runAction(page, "paste")).toBe(true);
  // Merged red shows through, the cut blue area stays transparent.
  expect(await readFloatingPixel(page, 4, 4)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readFloatingPixel(page, 12, 4)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  await page.keyboard.press("Enter");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 40, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
});

test("copy without floating and paste without memory show error toasts @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  expect(await runAction(page, "copy-selection")).toBe(false);
  await expect(toast(page)).toContainText("floating selection");
  expect(await runAction(page, "paste")).toBe(false);
  await expect(toast(page)).toContainText("memory");
});

test("shortcuts and Edit menu invoke copy and paste @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await setPencil(page, "#00ff00");
  await paintCenter(page);
  await selectTool(page, "Rectangular selection");
  await dragRect(page, 28, 28, 36, 36);
  await page.keyboard.press("Control+c");
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Paste" }).click();
  expect(await getFloatingSelection(page)).not.toBeNull();
  expect(await readFloatingPixel(page, 4, 4)).toEqual({ r: 0, g: 255, b: 0, a: 255 });
  await page.keyboard.press("Control+v");
  expect(await readFloatingPixel(page, 4, 4)).toEqual({ r: 0, g: 255, b: 0, a: 255 });
});
