import { expect, test } from "@playwright/test";
import { getLayers, loadBlankProject, paintCenter, readPixel } from "./e2e-helpers";

async function startPlayback(page: import("@playwright/test").Page): Promise<void> {
  await page.getByRole("button", { name: "Play animation", exact: true }).click();
}

async function stopPlayback(page: import("@playwright/test").Page): Promise<void> {
  await page.getByRole("button", { name: "Stop animation", exact: true }).click();
}

test("status bar turns red while an animation plays", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  const statusbar = page.locator("gnumarus-shell .statusbar");
  await expect(statusbar).not.toHaveClass(/playing/);
  await startPlayback(page);
  await expect(statusbar).toHaveClass(/playing/);
  await stopPlayback(page);
  await expect(statusbar).not.toHaveClass(/playing/);
});

test("painting is blocked while playing unless allowed", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintCenter(page);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  const undoDepth = (): Promise<number | null> =>
    page.evaluate(() => {
      const root = window as unknown as { __gnumarus?: { engine?: { history: { undoDepth(): number } } } };
      try {
        return root.__gnumarus?.engine?.history.undoDepth() ?? null;
      } catch {
        return null;
      }
    });
  // Painting materializes the empty cell first: creation entry plus stroke.
  expect(await undoDepth()).toBe(2);
  await startPlayback(page);
  // Brush strokes are swallowed while locked (default): no pixels, no history.
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  await page.mouse.move(box.x + box.width / 2 + 5, box.y + box.height / 2 + 5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 20, box.y + box.height / 2 + 20, { steps: 4 });
  await page.mouse.up();
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  expect(await undoDepth()).toBe(2);
  await expect(page.locator("gnumarus-shell")).toContainText("Stop playback to edit");
  await stopPlayback(page);
  // Allowing edits while playing restores painting (new history entry).
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { setAllowChangesWhilePlaying(v: boolean): void } } };
    root.__gnumarus?.shell?.setAllowChangesWhilePlaying(true);
  });
  await startPlayback(page);
  await page.mouse.move(box.x + box.width / 2 - 20, box.y + box.height / 2 - 20);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 20, box.y + box.height / 2 + 20, { steps: 6 });
  await page.mouse.up();
  await expect.poll(undoDepth).toBe(3);
  await stopPlayback(page);
});

test("undo and layer ops are blocked while playing unless allowed", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintCenter(page);
  await startPlayback(page);
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  const before = (await getLayers(page)).layers.length;
  await page.locator("gnumarus-shell .layers-header button").first().click();
  expect((await getLayers(page)).layers.length).toBe(before);
  await expect(page.locator("gnumarus-shell")).toContainText("Stop playback to edit");
  await stopPlayback(page);
  // With edits allowed, the same actions go through.
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { setAllowChangesWhilePlaying(v: boolean): void } } };
    root.__gnumarus?.shell?.setAllowChangesWhilePlaying(true);
  });
  await startPlayback(page);
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  await stopPlayback(page);
});

test("allow-changes setting toggles in the dialog and persists", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  const allowed = (): Promise<boolean | null> =>
    page.evaluate(() => {
      const root = window as unknown as { __gnumarus?: { shell?: { allowChangesWhilePlaying: boolean } } };
      return root.__gnumarus?.shell?.allowChangesWhilePlaying ?? null;
    });
  expect(await allowed()).toBe(false);
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  const dialog = page.locator("gnumarus-shell dialog#settingsDialog");
  await expect(dialog).toBeVisible();
  const checkbox = dialog.locator("#allowChangesWhilePlaying");
  await expect(checkbox).not.toBeChecked();
  await checkbox.check();
  expect(await allowed()).toBe(true);
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await page.reload();
  await page.waitForSelector("gnumarus-shell canvas");
  expect(await allowed()).toBe(true);
});
