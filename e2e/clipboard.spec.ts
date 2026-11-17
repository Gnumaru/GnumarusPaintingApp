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

test("copy merged flattens visible layers @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintDot(page, "#ff0000", 32, 32);
  await page.keyboard.press("Control+Shift+ArrowUp");
  await paintDot(page, "#0000ff", 40, 32);
  // No selection: the whole canvas composite lands in memory.
  expect(await runAction(page, "copy-merged")).toBe(true);
  await loadBlankProject(page, 64);
  await expect(runAction(page, "paste")).resolves.toBe(true);
  expect(await readFloatingPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readFloatingPixel(page, 40, 32)).toEqual({ r: 0, g: 0, b: 255, a: 255 });
});

test("copy merged includes the visible floating selection @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintDot(page, "#ff0000", 32, 32);
  await page.keyboard.press("Control+Shift+ArrowUp");
  await paintDot(page, "#0000ff", 40, 32);
  await selectTool(page, "Rectangular selection");
  await dragRect(page, 28, 28, 44, 36);
  // The cut moved blue into the floating selection; the merged copy still
  // shows it because the floating is visualized on top.
  expect(await runAction(page, "copy-merged")).toBe(true);
  await loadBlankProject(page, 64);
  await expect(runAction(page, "paste")).resolves.toBe(true);
  expect(await readFloatingPixel(page, 4, 4)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readFloatingPixel(page, 12, 4)).toEqual({ r: 0, g: 0, b: 255, a: 255 });
  await page.keyboard.press("Enter");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 40, 32)).toEqual({ r: 0, g: 0, b: 255, a: 255 });
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

test("persisting a paste keeps what transparent pixels cover @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await setPencil(page, "#ff0000");
  await paintCenter(page);
  await selectTool(page, "Rectangular selection");
  // Box larger than the dot: floating holds red plus transparent surroundings.
  await dragRect(page, 24, 24, 40, 40);
  expect(await runAction(page, "copy-selection")).toBe(true);
  await loadBlankProject(page, 64);
  await selectTool(page, "Pencil");
  await paintDot(page, "#0000ff", 36, 32);
  expect(await runAction(page, "paste")).toBe(true);
  await page.keyboard.press("Enter");
  // Opaque red covers; transparent surroundings leave the blue alone.
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 36, 32)).toEqual({ r: 0, g: 0, b: 255, a: 255 });
  expect(await readPixel(page, 24, 24)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
});

test("persisting a paste blends partial alpha over the layer @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await setPencil(page, "#ff0000");
  await paintCenter(page);
  await selectTool(page, "Rectangular selection");
  await dragRect(page, 28, 28, 36, 36);
  // Halve the floating alpha in place, then copy the faded pixels.
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { floating?: { buffer: Uint8ClampedArray } | null } };
    };
    const buffer = root.__gnumarus?.engine?.floating?.buffer;
    if (buffer === undefined) {
      throw new Error("no floating selection");
    }
    for (let i = 3; i < buffer.length; i += 4) {
      buffer[i] = 128;
    }
  });
  expect(await runAction(page, "copy-selection")).toBe(true);
  await loadBlankProject(page, 64);
  await selectTool(page, "Pencil");
  await paintDot(page, "#0000ff", 32, 32);
  expect(await runAction(page, "paste")).toBe(true);
  await page.keyboard.press("Enter");
  // Straight-alpha source-over of half red over opaque blue.
  expect(await readPixel(page, 32, 32)).toEqual({ r: 128, g: 0, b: 127, a: 255 });
});
