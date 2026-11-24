import { expect, test } from "@playwright/test";
import { addAnimation, addFrames, loadBlankProject, selectAnimation } from "./e2e-helpers";

async function openManageDialog(page: import("@playwright/test").Page): Promise<import("@playwright/test").Locator> {
  await page.locator('gnumarus-shell [data-testid="animation-matrix"]').getByRole("button", { name: "Manage animations" }).click();
  const dialog = page.locator('gnumarus-shell dialog#animationDialog');
  await expect(dialog).toBeVisible();
  return dialog;
}

test("tag panel toggles and remembers its state", async ({ page }) => {
  const setup = async (): Promise<void> => {
    await page.goto("/");
    await page.waitForSelector("gnumarus-shell canvas");
    await loadBlankProject(page, 64);
    await addFrames(page, 3);
    await addAnimation(page, "walk,forward,1-2");
  };
  await setup();
  const panel = page.locator('gnumarus-shell [data-testid="animation-tags"]');
  await expect(panel).toBeVisible();
  await expect(panel.locator('[data-testid="animation-tag"]')).toHaveText("walk");
  const toggle = page.locator('gnumarus-shell [data-testid="tags-toggle"]');
  await toggle.click();
  await expect(panel).toBeHidden();
  // A reload resets the project (no animations), so the stored closed
  // state only shows once an animation exists again.
  await setup();
  await expect(page.locator('gnumarus-shell [data-testid="animation-tags"]')).toBeHidden();
  // Reopen: the open state persists across reloads too.
  await page.locator('gnumarus-shell [data-testid="tags-toggle"]').click();
  await expect(page.locator('gnumarus-shell [data-testid="animation-tags"]')).toBeVisible();
  await setup();
  await expect(page.locator('gnumarus-shell [data-testid="animation-tags"]')).toBeVisible();
});

test("tag brackets point at frame columns and stack overlaps", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await addFrames(page, 5);
  await addAnimation(page, "walk,forward,1-3");
  await addAnimation(page, "jump,forward,3-5");
  await addAnimation(page, "split,forward,1,6");
  const panel = page.locator('gnumarus-shell [data-testid="animation-tags"]');
  await expect(panel).toBeVisible();
  const segBox = async (name: string, occurrence: number): Promise<{ x: number; width: number; y: number }> => {
    const box = await panel.locator(`[data-testid="animation-tag-seg"][data-animation="${name}"]`).nth(occurrence).boundingBox();
    if (box === null) {
      throw new Error(`no box for ${name} #${occurrence}`);
    }
    return { x: box.x, width: box.width, y: box.y };
  };
  const headerBox = async (frame: number): Promise<{ x: number; width: number }> => {
    // Header cell divs (not the inset buttons) sit exactly on the 76px tracks.
    const box = await page.locator("gnumarus-shell .anim-frame-header").nth(frame).boundingBox();
    if (box === null) {
      throw new Error(`no box for frame ${frame}`);
    }
    return { x: box.x, width: box.width };
  };
  // walk covers frames 1-3 (0-based 0-2); bracket edges match those headers.
  const walk = await segBox("walk", 0);
  const first = await headerBox(0);
  const third = await headerBox(2);
  expect(Math.abs(walk.x - first.x)).toBeLessThanOrEqual(2);
  expect(Math.abs(walk.x + walk.width - (third.x + third.width))).toBeLessThanOrEqual(2);
  // jump overlaps walk at frame 3, so it must sit on another lane.
  const jump = await segBox("jump", 0);
  expect(Math.abs(jump.y - walk.y)).toBeGreaterThan(10);
  // Segmented animation: one bracket per run, chip only on the first.
  await expect(panel.locator('[data-testid="animation-tag-seg"][data-animation="split"]')).toHaveCount(2);
  await expect(panel.locator('[data-testid="animation-tag"][data-animation="split"]')).toHaveCount(1);
  const splitFirst = await segBox("split", 0);
  const splitLast = await segBox("split", 1);
  expect(Math.abs(splitFirst.x - first.x)).toBeLessThanOrEqual(2);
  const sixth = await headerBox(5);
  expect(Math.abs(splitLast.x + splitLast.width - (sixth.x + sixth.width))).toBeLessThanOrEqual(2);
});

test("clicking a tag selects the animation scope", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await addFrames(page, 3);
  await addAnimation(page, "walk,forward,1-2");
  await addAnimation(page, "jump,forward,3-4");
  await page.locator('gnumarus-shell [data-testid="animation-tag"][data-animation="jump"]').click();
  await expect(page.locator('gnumarus-shell [data-testid="animation-select"]')).toHaveValue("jump");
  // Active scope highlights the chip and the scoped headers.
  await expect(page.locator('gnumarus-shell [data-testid="animation-tag"][data-animation="jump"]')).toHaveClass(/active/);
  await selectAnimation(page, "");
  await expect(page.locator('gnumarus-shell [data-testid="animation-select"]')).toHaveValue("");
});

test("tag color edits apply live from the manage dialog", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await addFrames(page, 1);
  await addAnimation(page, "walk,forward,1-2");
  const dialog = await openManageDialog(page);
  await dialog.locator('[data-testid="animation-color"][data-animation="walk"]').fill("#123456");
  const chip = page.locator('gnumarus-shell [data-testid="animation-tag"][data-animation="walk"]');
  await expect(chip).toHaveCSS("background-color", "rgb(18, 52, 86)");
  const stored = await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { getNamedAnimations(): Array<{ color: string }> } } };
    return root.__gnumarus?.engine?.getNamedAnimations()[0]?.color ?? null;
  });
  expect(stored).toBe("#123456");
});
