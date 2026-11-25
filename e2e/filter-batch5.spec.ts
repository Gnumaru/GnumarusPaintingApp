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

interface Batch5SpotCheck {
  id: string;
  setup: "red" | "gray" | "white" | "halves" | "full-white";
  /** Pixel at (32,32) after OK + undo (transparent when the filter was a no-op). */
  afterUndo: Pixel;
  check: (center: Pixel | null, page: import("@playwright/test").Page) => unknown;
}

const RED: Pixel = { r: 255, g: 0, b: 0, a: 255 };
const GRAY: Pixel = { r: 128, g: 128, b: 128, a: 255 };
const WHITE: Pixel = { r: 255, g: 255, b: 255, a: 255 };
const BLANK: Pixel = { r: 0, g: 0, b: 0, a: 0 };
const MIDGRAY: Pixel = { r: 192, g: 192, b: 192, a: 255 };

const BATCH5_SPOT_CHECKS: Batch5SpotCheck[] = [
  { id: "whirl-pinch", setup: "white", afterUndo: WHITE, check: (c) => expect(c).toEqual(WHITE) },
  {
    id: "polar-coordinates",
    setup: "halves",
    afterUndo: MIDGRAY,
    check: (c) => expect(c).toEqual({ r: 64, g: 64, b: 64, a: 255 }),
  },
  { id: "lens-distortion", setup: "white", afterUndo: BLANK, check: (c) => expect(c).toEqual(WHITE) },
  { id: "circular-motion", setup: "white", afterUndo: WHITE, check: (c) => expect(c).toEqual(WHITE) },
  { id: "zoom-motion", setup: "white", afterUndo: WHITE, check: (c) => expect(c).toEqual(WHITE) },
  { id: "selective-blur", setup: "red", afterUndo: BLANK, check: (c) => expect(c).toEqual(RED) },
  { id: "lens-blur", setup: "full-white", afterUndo: BLANK, check: (c) => expect(c).toEqual(WHITE) },
  {
    id: "height-to-normal",
    setup: "gray",
    afterUndo: GRAY,
    check: (c) => expect(c).toEqual({ r: 128, g: 128, b: 255, a: 255 }),
  },
  { id: "hsv-noise", setup: "gray", afterUndo: GRAY, check: () => {} },
  { id: "shift", setup: "gray", afterUndo: GRAY, check: () => {} },
  {
    id: "image-gradient",
    setup: "white",
    afterUndo: WHITE,
    check: (c) => expect(c).toEqual({ r: 0, g: 0, b: 0, a: 255 }),
  },
];

test("every batch-5 filter applies and undoes cleanly @recent", async ({ page }) => {
  for (const item of BATCH5_SPOT_CHECKS) {
    await page.goto("/");
    await page.waitForSelector("gnumarus-shell canvas");
    if (item.setup === "red") {
      await paintBlock(page, "#ff0000");
    } else if (item.setup === "gray") {
      await paintBlock(page, "#808080");
    } else if (item.setup === "white") {
      await paintBlock(page, "#ffffff");
    } else if (item.setup === "full-white") {
      await loadBlankProject(page, 64);
      await paintLayerRect(page, "#ffffff", 0, 0, 63, 63);
    } else {
      await loadBlankProject(page, 64);
      await paintLayerRect(page, "#404040", 0, 0, 31, 63);
      await paintLayerRect(page, "#c0c0c0", 32, 0, 63, 63);
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

test("selective-blur maxDelta clamps and resets @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintBlock(page, "#ff0000");
  expect(await runFilter(page, "selective-blur")).toBe(true);
  const popup = dialog(page);
  await expect(popup).toBeVisible();
  await expect(popup.locator('[data-testid="filter-param-maxDelta-reset"]')).toHaveCount(0);
  await popup.locator('[data-testid="filter-param-maxDelta-num"]').fill("200");
  await expect(popup.locator('[data-testid="filter-param-maxDelta-reset"]')).toHaveCount(1);
  await popup.locator('[data-testid="filter-param-maxDelta-reset"]').click();
  await expect(popup.locator('[data-testid="filter-param-maxDelta"]')).toHaveValue("50");
  await page.keyboard.press("Escape");
  await expect(popup).toBeHidden();
});

test("distort submenu lists the new warps @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  const flyout = page.locator("gnumarus-shell .submenu-flyout");
  await page.locator("gnumarus-shell .submenu-row").filter({ hasText: "Distort" }).hover();
  await expect(flyout.getByRole("button", { name: "Whirl and Pinch" })).toBeVisible();
  await expect(flyout.getByRole("button", { name: "Polar Coordinates" })).toBeVisible();
  await expect(flyout.getByRole("button", { name: "Lens Distortion" })).toBeVisible();
  await expect(flyout.getByRole("button", { name: "Shift" })).toBeVisible();
  await page.keyboard.press("Escape");
});

test("batch-5 filter targets the floating selection @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintBlock(page, "#ff0000");
  await selectTool(page, "Rectangular selection");
  await dragRect(page, 28, 28, 36, 36);
  expect(await runFilter(page, "image-gradient")).toBe(true);
  await expect(dialog(page)).toBeVisible();
  await dialog(page).getByRole("button", { name: "OK", exact: true }).click();
  // Uniform red has no per-channel gradient: edges go black.
  expect(await readFloatingPixel(page, 4, 4)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  await page.keyboard.press("Enter");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 20, 20)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
});
