import { expect, test } from "@playwright/test";
import { dragRect, layerScreenTarget, loadBlankProject, paintLayerRect, readPixel, selectTool, setPencil } from "./e2e-helpers";

async function runAction(page: import("@playwright/test").Page, id: string): Promise<boolean> {
  return page.evaluate((actionId: string) => {
    const root = window as unknown as { __gnumarus?: { shell?: { runAction(actionId: string): boolean } } };
    return root.__gnumarus?.shell?.runAction(actionId) ?? false;
  }, id);
}

async function shellState(page: import("@playwright/test").Page): Promise<{ brushSource: unknown }> {
  return page.evaluate(() => {
    const shell = document.querySelector("gnumarus-shell") as unknown as Record<string, unknown>;
    return { brushSource: shell["brushSource"] };
  });
}

async function paintAt(page: import("@playwright/test").Page, x: number, y: number): Promise<void> {
  const target = await layerScreenTarget(page, x, y);
  await page.mouse.click(target.x, target.y);
}

async function selectBlock(page: import("@playwright/test").Page): Promise<void> {
  await paintLayerRect(page, "#ff0000", 24, 24, 31, 39);
  await paintLayerRect(page, "#0000ff", 32, 24, 39, 39);
  await selectTool(page, "Rectangular selection");
  await dragRect(page, 24, 24, 39, 39);
}

test("captures the floating selection and stamps it as a brush @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await setPencil(page, "#ff0000");
  await selectBlock(page);
  expect(await runAction(page, "create-brush-from-selection")).toBe(true);
  expect((await shellState(page)).brushSource).toBe("selection");
  // Merge the pending selection away, back to plain-cell painting.
  await page.keyboard.press("Enter");
  expect(await runAction(page, "tool-pencil")).toBe(true);
  // Stamp the 16x16 capture centered on (50, 32): left half red, right half blue.
  await paintAt(page, 50, 32);
  expect(await readPixel(page, 43, 25)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 51, 25)).toEqual({ r: 0, g: 0, b: 255, a: 255 });
  expect(await readPixel(page, 20, 20)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 50, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
});

test("origin and destination anchor the pattern differently @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await setPencil(page, "#ff0000");
  await selectBlock(page);
  expect(await runAction(page, "create-brush-from-selection")).toBe(true);
  await page.keyboard.press("Enter");
  expect(await runAction(page, "tool-pencil")).toBe(true);
  await page.evaluate(() => {
    const shell = document.querySelector("gnumarus-shell") as unknown as {
      setBrushSize(size: number): void;
      setSelectionBrushMode(mode: string): void;
    };
    shell.setBrushSize(1);
    shell.setSelectionBrushMode("origin");
  });
  // Origin (24, 24): pixel (50, 32) samples brush (10, 8) -> blue half.
  await paintAt(page, 50, 32);
  expect(await readPixel(page, 50, 32)).toEqual({ r: 0, g: 0, b: 255, a: 255 });
  // Destination: the stroke start (50, 40) anchors brush (0, 0) -> red.
  await page.evaluate(() => {
    const shell = document.querySelector("gnumarus-shell") as unknown as { setSelectionBrushMode(mode: string): void };
    shell.setSelectionBrushMode("destination");
  });
  await paintAt(page, 50, 40);
  expect(await readPixel(page, 50, 40)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 50, 40)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
});

test("capture needs a floating selection and lives in the edit menu @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  expect(await runAction(page, "create-brush-from-selection")).toBe(false);
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(page.getByRole("button", { name: "Create brush from selection", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
});
