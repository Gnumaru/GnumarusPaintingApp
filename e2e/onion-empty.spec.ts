import { expect, test } from "@playwright/test";
import {
  getMatrixFrame,
  loadBlankProject,
  onionFlattenCount,
  onionVisible,
  paintCenter,
  setOnion,
  setBrushColor,
} from "./e2e-helpers";

async function selectFrame(page: import("@playwright/test").Page, frame: number): Promise<void> {
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.locator(`[data-testid="anim-frame"][data-frame="${frame}"]`).click();
  await expect.poll(async () => getMatrixFrame(page), { timeout: 5000 }).toBe(frame);
}

test("empty neighbor frames skip the onion rebuild @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  await setOnion(page, true, 1, 1);
  const before = await onionFlattenCount(page);
  expect(before).toBeGreaterThanOrEqual(0);
  // Nothing painted anywhere: switching frames performs no flatten work
  // and shows no ghosts (same pixels as onion-off switching).
  await selectFrame(page, 1);
  expect(await onionFlattenCount(page)).toBe(before);
  expect(await onionVisible(page)).toEqual({ past: false, future: false });
  await selectFrame(page, 0);
  expect(await onionFlattenCount(page)).toBe(before);
  expect(await onionVisible(page)).toEqual({ past: false, future: false });
});

test("painted neighbor frames still build ghosts @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  await setBrushColor(page, "#ff0000");
  await selectFrame(page, 1);
  await paintCenter(page);
  await selectFrame(page, 0);
  await setOnion(page, true, 1, 1);
  // Frame 0 sees painted frame 1 ahead: rebuild happens, future ghost shows.
  expect(await onionVisible(page)).toEqual({ past: false, future: true });
  const built = await onionFlattenCount(page);
  expect(built).toBeGreaterThan(0);
  // Frame 1 sees only the empty frame 0 behind: per-neighbor skip, no work.
  await selectFrame(page, 1);
  expect(await onionFlattenCount(page)).toBe(built);
  expect(await onionVisible(page)).toEqual({ past: false, future: false });
  // Back to frame 0: the flat is cached, so no new composite — same ghost.
  await selectFrame(page, 0);
  expect(await onionFlattenCount(page)).toBe(built);
  expect(await onionVisible(page)).toEqual({ past: false, future: true });
  // Painting different pixels busts the cache: the next visit recomposites.
  await selectFrame(page, 1);
  await setBrushColor(page, "#0000ff");
  await paintCenter(page);
  await selectFrame(page, 0);
  expect(await onionFlattenCount(page)).toBeGreaterThan(built);
  expect(await onionVisible(page)).toEqual({ past: false, future: true });
});
