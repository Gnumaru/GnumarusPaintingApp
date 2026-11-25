import { expect, test } from "@playwright/test";
import { loadBlankProject, paintLayerRect, readPixel } from "./e2e-helpers";

async function runFilter(page: import("@playwright/test").Page, id: string): Promise<boolean> {
  return page.evaluate((filterId: string) => {
    const root = window as unknown as { __gnumarus?: { shell?: { runAction(id: string): boolean } } };
    return root.__gnumarus?.shell?.runAction(`filter-${filterId}`) ?? false;
  }, id);
}

function dialog(page: import("@playwright/test").Page): import("@playwright/test").Locator {
  return page.locator('gnumarus-shell [data-testid="filter-window"]');
}

interface Pixel {
  r: number;
  g: number;
  b: number;
  a: number;
}

const WHITE: Pixel = { r: 255, g: 255, b: 255, a: 255 };
const GRAY: Pixel = { r: 128, g: 128, b: 128, a: 255 };

test("every batch-6 filter applies and undoes cleanly @recent", async ({ page }) => {
  // Propagate colors: single opaque dot on transparency.
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintLayerRect(page, "#ffffff", 32, 32, 32, 32);
  expect(await runFilter(page, "propagate-colors")).toBe(true);
  let popup = dialog(page);
  await expect(popup).toBeVisible();
  await popup.getByRole("button", { name: "OK", exact: true }).click();
  await expect(popup).toBeHidden();
  expect(await readPixel(page, 32, 32)).toEqual(WHITE);
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 32, 32)).toEqual(WHITE);

  // LCh noise on a gray block: grain appears, undo restores.
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintLayerRect(page, "#808080", 24, 24, 39, 39);
  expect(await runFilter(page, "lch-noise")).toBe(true);
  popup = dialog(page);
  await expect(popup).toBeVisible();
  await popup.getByRole("button", { name: "OK", exact: true }).click();
  await expect(popup).toBeHidden();
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 32, 32)).toEqual(GRAY);
});

test("propagate-colors distance clamps and resets @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintLayerRect(page, "#ffffff", 32, 32, 32, 32);
  expect(await runFilter(page, "propagate-colors")).toBe(true);
  const popup = dialog(page);
  await expect(popup).toBeVisible();
  await expect(popup.locator('[data-testid="filter-param-distance-reset"]')).toHaveCount(0);
  await popup.locator('[data-testid="filter-param-distance-num"]').fill("20");
  await expect(popup.locator('[data-testid="filter-param-distance-reset"]')).toHaveCount(1);
  await popup.locator('[data-testid="filter-param-distance-reset"]').click();
  await expect(popup.locator('[data-testid="filter-param-distance"]')).toHaveValue("8");
  await page.keyboard.press("Escape");
  await expect(popup).toBeHidden();
});
