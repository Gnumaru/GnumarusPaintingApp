import { expect, test } from "@playwright/test";
import {
  getMatrixFrame,
  loadBlankProject,
  onionFlattenCount,
  onionVisible,
  paintCenter,
  setOnion,
  setPencil,
} from "./e2e-helpers";

async function selectFrame(page: import("@playwright/test").Page, frame: number): Promise<void> {
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.locator(`[data-testid="anim-frame"][data-frame="${frame}"]`).click();
  await expect.poll(async () => getMatrixFrame(page), { timeout: 5000 }).toBe(frame);
}

async function setOnionCache(page: import("@playwright/test").Page, resolution: string, frames: string): Promise<void> {
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  const dialog = page.locator("gnumarus-shell dialog#settingsDialog");
  await dialog.locator("input#onionResolution").fill(resolution);
  await dialog.locator("input#onionCacheFrames").fill(frames);
  await dialog.getByRole("button", { name: "Close" }).click();
}

test("halved cache resolution keeps ghosts working with cache hits @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  await setPencil(page, "#ff0000");
  await selectFrame(page, 0);
  await paintCenter(page);
  await selectFrame(page, 1);
  await setOnion(page, true, 1, 1);
  await setOnionCache(page, "0.5", "10");
  // Past ghost paints from the downscaled cache.
  expect(await onionVisible(page)).toEqual({ past: true, future: false });
  const built = await onionFlattenCount(page);
  expect(built).toBeGreaterThan(0);
  // Revisits hit the scaled cache: no new composites, ghosts intact.
  await selectFrame(page, 0);
  await selectFrame(page, 1);
  expect(await onionFlattenCount(page)).toBe(built);
  expect(await onionVisible(page)).toEqual({ past: true, future: false });
});

test("zero cached frames disables caching @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  await setPencil(page, "#ff0000");
  await selectFrame(page, 0);
  await paintCenter(page);
  await setPencil(page, "#0000ff");
  await selectFrame(page, 1);
  await paintCenter(page);
  await selectFrame(page, 0);
  await setOnion(page, true, 1, 1);
  await setOnionCache(page, "1", "0");
  const built = await onionFlattenCount(page);
  // Both neighbors painted: every visit recomposites with caching off.
  await selectFrame(page, 1);
  const once = await onionFlattenCount(page);
  expect(once).toBeGreaterThan(built);
  await selectFrame(page, 0);
  expect(await onionFlattenCount(page)).toBeGreaterThan(once);
  expect(await onionVisible(page)).toEqual({ past: false, future: true });
});
