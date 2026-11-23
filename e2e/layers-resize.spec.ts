import { expect, test } from "@playwright/test";

test("layers panel resizes by dragging its left edge", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const panel = page.locator("gnumarus-shell .layers-panel");
  const handle = page.locator('gnumarus-shell [data-testid="layers-resize"]');
  const before = (await panel.boundingBox())?.width ?? 0;
  expect(before).toBeGreaterThan(0);
  const hbox = (await handle.boundingBox()) ?? null;
  if (hbox === null) {
    throw new Error("resize handle has no bounding box");
  }
  const startX = hbox.x + hbox.width / 2;
  const startY = hbox.y + hbox.height / 2;
  // Drag left: the panel grows.
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX - 60, startY, { steps: 5 });
  await page.mouse.up();
  const grown = (await panel.boundingBox())?.width ?? 0;
  expect(grown).toBeGreaterThanOrEqual(before + 50);
  // Drag far right: the width clamps at the 140px minimum.
  const hbox2 = (await handle.boundingBox()) ?? null;
  if (hbox2 === null) {
    throw new Error("resize handle has no bounding box");
  }
  await page.mouse.move(hbox2.x + hbox2.width / 2, hbox2.y + hbox2.height / 2);
  await page.mouse.down();
  await page.mouse.move(hbox2.x + 2000, startY, { steps: 5 });
  await page.mouse.up();
  const shrunk = await panel.evaluate((element) => (element as HTMLElement).style.width);
  expect(shrunk).toBe("140px");
});
