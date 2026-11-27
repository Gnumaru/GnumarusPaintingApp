import { expect, test } from "@playwright/test";
import { cellTextureId, loadBlankProject, paintCenter, readPixel } from "./e2e-helpers";

async function undoDepth(page: import("@playwright/test").Page): Promise<number | null> {
  return page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { history: { undoDepth(): number } } } };
    try {
      return root.__gnumarus?.engine?.history.undoDepth() ?? null;
    } catch {
      return null;
    }
  });
}

test("painting on an empty cell undoes the stroke, then its creation @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  expect(await cellTextureId(page, "layer0", 0)).toBeNull();
  await paintCenter(page);
  const painted = await readPixel(page, 32, 32);
  expect(painted).not.toEqual({ r: 0, g: 0, b: 0, a: 0 });
  // Materialization is its own entry below the stroke.
  expect(await cellTextureId(page, "layer0", 0)).not.toBeNull();
  expect(await undoDepth(page)).toBe(2);
  // First undo removes only the stroke; the empty content survives.
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  expect(await cellTextureId(page, "layer0", 0)).not.toBeNull();
  expect(await undoDepth(page)).toBe(1);
  // Second undo removes the creation; the cell is empty again.
  await page.keyboard.press("Control+z");
  expect(await cellTextureId(page, "layer0", 0)).toBeNull();
  expect(await undoDepth(page)).toBe(0);
  // Redo restores the empty content first, then the stroke.
  await page.keyboard.press("Control+y");
  expect(await cellTextureId(page, "layer0", 0)).not.toBeNull();
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  await page.keyboard.press("Control+y");
  expect(await readPixel(page, 32, 32)).toEqual(painted);
  expect(await undoDepth(page)).toBe(2);
});
