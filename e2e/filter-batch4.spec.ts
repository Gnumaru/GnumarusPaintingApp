import { expect, test } from "@playwright/test";
import {
  dragRect,
  loadBlankProject,
  paintLayerRect,
  readFloatingPixel,
  readPixel,
  selectTool,
} from "./e2e-helpers";

async function runFilter(page: import("@playwright/test").Page, id: string): Promise<boolean> {
  return page.evaluate((filterId: string) => {
    const root = window as unknown as { __gnumarus?: { shell?: { runAction(id: string): boolean } } };
    return root.__gnumarus?.shell?.runAction(`filter-${filterId}`) ?? false;
  }, id);
}

function dialog(page: import("@playwright/test").Page): import("@playwright/test").Locator {
  return page.locator('gnumarus-shell [data-testid="filter-window"]');
}

async function paintBlock(page: import("@playwright/test").Page, hex: string): Promise<void> {
  await loadBlankProject(page, 64);
  await paintLayerRect(page, hex, 24, 24, 39, 39);
}

interface Pixel {
  r: number;
  g: number;
  b: number;
  a: number;
}

interface Batch4SpotCheck {
  id: string;
  setup: "red" | "gray" | "white";
  /** Pixel at (32,32) after OK + undo (transparent when the filter was a no-op). */
  afterUndo: Pixel;
  check: (center: Pixel | null, page: import("@playwright/test").Page) => unknown;
}

const RED: Pixel = { r: 255, g: 0, b: 0, a: 255 };
const GRAY: Pixel = { r: 128, g: 128, b: 128, a: 255 };
const WHITE: Pixel = { r: 255, g: 255, b: 255, a: 255 };
const BLANK: Pixel = { r: 0, g: 0, b: 0, a: 0 };

const BATCH4_SPOT_CHECKS: Batch4SpotCheck[] = [
  { id: "levels", setup: "red", afterUndo: BLANK, check: (c) => expect(c).toEqual(RED) },
  { id: "hsv-adjust", setup: "red", afterUndo: BLANK, check: (c) => expect(c).toEqual(RED) },
  { id: "palettize", setup: "red", afterUndo: BLANK, check: (c) => expect(c).toEqual(RED) },
  {
    id: "gradient-map",
    setup: "gray",
    afterUndo: GRAY,
    check: (c) => expect(c).toEqual({ r: 124, g: 124, b: 124, a: 255 }),
  },
  {
    id: "photocopy",
    setup: "red",
    afterUndo: RED,
    check: (c) => expect(c).toEqual(WHITE),
  },
  { id: "softglow", setup: "white", afterUndo: WHITE, check: (c) => expect(c).toEqual(WHITE) },
  {
    id: "halftone",
    setup: "red",
    afterUndo: RED,
    check: (c) => expect(c).toEqual({ r: 0, g: 0, b: 0, a: 255 }),
  },
  {
    id: "tile-mosaic",
    setup: "white",
    afterUndo: WHITE,
    check: (c) => expect(c).toEqual({ r: 64, g: 64, b: 64, a: 64 }),
  },
  { id: "spread", setup: "gray", afterUndo: GRAY, check: () => {} },
  { id: "value-propagate", setup: "gray", afterUndo: GRAY, check: (c) => expect(c).toEqual(GRAY) },
  { id: "waves", setup: "white", afterUndo: WHITE, check: (c) => expect(c).toEqual(WHITE) },
  { id: "wind", setup: "white", afterUndo: WHITE, check: (c) => expect(c).toEqual(WHITE) },
];

test("every batch-4 filter applies and undoes cleanly @recent", async ({ page }) => {
  for (const item of BATCH4_SPOT_CHECKS) {
    await page.goto("/");
    await page.waitForSelector("gnumarus-shell canvas");
    if (item.setup === "red") {
      await paintBlock(page, "#ff0000");
    } else if (item.setup === "gray") {
      await paintBlock(page, "#808080");
    } else {
      await paintBlock(page, "#ffffff");
    }
    expect(await runFilter(page, item.id)).toBe(true);
    const popup = dialog(page);
    await expect(popup).toBeVisible();
    await popup.getByRole("button", { name: "OK", exact: true }).click();
    await expect(popup).toBeHidden();
    await item.check(await readPixel(page, 32, 32), page);
    await page.keyboard.press("Control+z");
    expect(await readPixel(page, 32, 32)).toEqual(item.afterUndo);
  }
});

test("levels low clamps and resets @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintBlock(page, "#808080");
  expect(await runFilter(page, "levels")).toBe(true);
  const popup = dialog(page);
  await expect(popup).toBeVisible();
  await expect(popup.locator('[data-testid="filter-param-channel"]')).toContainText("All channels");
  await expect(popup.locator('[data-testid="filter-param-low-reset"]')).toHaveCount(0);
  await popup.locator('[data-testid="filter-param-low-num"]').fill("100");
  await expect(popup.locator('[data-testid="filter-param-low-reset"]')).toHaveCount(1);
  await popup.locator('[data-testid="filter-param-low-reset"]').click();
  await expect(popup.locator('[data-testid="filter-param-low"]')).toHaveValue("0");
  await page.keyboard.press("Escape");
  await expect(popup).toBeHidden();
});

test("distort submenu lists the new filters @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  const flyout = page.locator("gnumarus-shell .submenu-flyout");
  await page.locator("gnumarus-shell .submenu-row").filter({ hasText: "Distort" }).hover();
  await expect(flyout.getByRole("button", { name: "Waves" })).toBeVisible();
  await expect(flyout.getByRole("button", { name: "Wind" })).toBeVisible();
  await page.keyboard.press("Escape");
});

test("batch-4 filter targets the floating selection @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintBlock(page, "#ff0000");
  await selectTool(page, "Rectangular selection");
  await dragRect(page, 28, 28, 36, 36);
  expect(await runFilter(page, "photocopy")).toBe(true);
  await expect(dialog(page)).toBeVisible();
  await dialog(page).getByRole("button", { name: "OK", exact: true }).click();
  // Uniform red matches its local mean, so the copy keeps it paper-white.
  expect(await readFloatingPixel(page, 4, 4)).toEqual({ r: 255, g: 255, b: 255, a: 255 });
  await page.keyboard.press("Enter");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 255, b: 255, a: 255 });
  expect(await readPixel(page, 20, 20)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
});
