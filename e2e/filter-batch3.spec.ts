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

interface Batch3SpotCheck {
  id: string;
  setup: "red" | "gray" | "white" | "teal" | "halves" | "full-white";
  /** Pixel at (32,32) after OK + undo (transparent when the filter was a no-op). */
  afterUndo: Pixel;
  check: (center: Pixel | null, page: import("@playwright/test").Page) => unknown;
}

const RED: Pixel = { r: 255, g: 0, b: 0, a: 255 };
const GRAY: Pixel = { r: 128, g: 128, b: 128, a: 255 };
const WHITE: Pixel = { r: 255, g: 255, b: 255, a: 255 };
const BLANK: Pixel = { r: 0, g: 0, b: 0, a: 0 };
const TEAL: Pixel = { r: 100, g: 150, b: 200, a: 255 };

const BATCH3_SPOT_CHECKS: Batch3SpotCheck[] = [
  { id: "slope-offset-power", setup: "red", afterUndo: BLANK, check: (c) => expect(c).toEqual(RED) },
  { id: "mono-mixer", setup: "gray", afterUndo: BLANK, check: (c) => expect(c).toEqual(GRAY) },
  {
    id: "maximize-channel",
    setup: "teal",
    afterUndo: TEAL,
    check: (c) => expect(c).toEqual({ r: 200, g: 200, b: 200, a: 255 }),
  },
  {
    id: "minimize-channel",
    setup: "teal",
    afterUndo: TEAL,
    check: (c) => expect(c).toEqual({ r: 100, g: 100, b: 100, a: 255 }),
  },
  {
    id: "normalize",
    setup: "halves",
    afterUndo: { r: 192, g: 192, b: 192, a: 255 },
    check: async (c, page) => {
      expect(c).toEqual(WHITE);
      expect(await readPixel(page, 16, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
    },
  },
  { id: "box-blur", setup: "red", afterUndo: RED, check: (c) => expect(c).toEqual(RED) },
  { id: "snn-mean", setup: "red", afterUndo: RED, check: (c) => expect(c).toEqual(RED) },
  {
    id: "high-pass",
    setup: "full-white",
    afterUndo: WHITE,
    check: (c) => expect(c).toEqual({ r: 128, g: 128, b: 128, a: 255 }),
  },
  {
    id: "emboss-fixed",
    setup: "white",
    afterUndo: WHITE,
    check: (c) => expect(c).toEqual({ r: 128, g: 128, b: 128, a: 255 }),
  },
  { id: "antialias", setup: "red", afterUndo: RED, check: (c) => expect(c).toEqual(RED) },
  {
    id: "round-corners",
    setup: "full-white",
    afterUndo: WHITE,
    check: async (c, page) => {
      expect(c).toEqual(WHITE);
      // Corners lose alpha but keep their RGB (straight-alpha buffer).
      expect(await readPixel(page, 0, 0)).toEqual({ r: 255, g: 255, b: 255, a: 0 });
    },
  },
  {
    id: "video-degradation",
    setup: "white",
    afterUndo: WHITE,
    check: async (c, page) => {
      // Even rows stay white, odd rows halve to 128.
      expect(c).toEqual(WHITE);
      expect(await readPixel(page, 33, 33)).toEqual({ r: 128, g: 128, b: 128, a: 255 });
    },
  },
];

test("every batch-3 filter applies and undoes cleanly @recent", async ({ page }) => {
  for (const item of BATCH3_SPOT_CHECKS) {
    await page.goto("/");
    await page.waitForSelector("gnumarus-shell canvas");
    if (item.setup === "red") {
      await paintBlock(page, "#ff0000");
    } else if (item.setup === "gray") {
      await paintBlock(page, "#808080");
    } else if (item.setup === "white") {
      await paintBlock(page, "#ffffff");
    } else if (item.setup === "teal") {
      await paintBlock(page, "#6496c8");
    } else if (item.setup === "halves") {
      await loadBlankProject(page, 64);
      await paintLayerRect(page, "#404040", 0, 0, 31, 63);
      await paintLayerRect(page, "#c0c0c0", 32, 0, 63, 63);
    } else {
      await loadBlankProject(page, 64);
      await paintLayerRect(page, "#ffffff", 0, 0, 63, 63);
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

test("mono-mixer param round-trips and resets @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintBlock(page, "#808080");
  expect(await runFilter(page, "mono-mixer")).toBe(true);
  const popup = dialog(page);
  await expect(popup).toBeVisible();
  await expect(popup.locator('[data-testid="filter-param-red-reset"]')).toHaveCount(0);
  await popup.locator('[data-testid="filter-param-red-num"]').fill("100");
  await expect(popup.locator('[data-testid="filter-param-red-reset"]')).toHaveCount(1);
  await popup.locator('[data-testid="filter-param-red-reset"]').click();
  expect(await popup.locator('[data-testid="filter-param-red"]')).toHaveValue("34");
  await page.keyboard.press("Escape");
  await expect(popup).toBeHidden();
});

test("slope-offset-power dialog exposes nine gain params @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintBlock(page, "#ff0000");
  expect(await runFilter(page, "slope-offset-power")).toBe(true);
  const popup = dialog(page);
  await expect(popup).toBeVisible();
  await expect(popup.locator('[data-testid="filter-param-slopeR"]')).toBeVisible();
  await expect(popup.locator('[data-testid="filter-param-powerB"]')).toBeVisible();
  await popup.getByRole("button", { name: "OK", exact: true }).click();
  await expect(popup).toBeHidden();
  expect(await readPixel(page, 32, 32)).toEqual(RED);
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 32, 32)).toEqual(BLANK);
});

test("decor submenu lists the new filters @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  const flyout = page.locator("gnumarus-shell .submenu-flyout");
  await page.locator("gnumarus-shell .submenu-row").filter({ hasText: "Decor" }).hover();
  await expect(flyout.getByRole("button", { name: "Round Corners" })).toBeVisible();
  await expect(flyout.getByRole("button", { name: "Video Degradation" })).toBeVisible();
  await page.keyboard.press("Escape");
});

test("batch-3 filter targets the floating selection @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintBlock(page, "#ff0000");
  await selectTool(page, "Rectangular selection");
  await dragRect(page, 28, 28, 36, 36);
  expect(await runFilter(page, "high-pass")).toBe(true);
  await expect(dialog(page)).toBeVisible();
  await dialog(page).getByRole("button", { name: "OK", exact: true }).click();
  // Uniform red has no detail: high-pass centers it on mid-gray.
  expect(await readFloatingPixel(page, 4, 4)).toEqual({ r: 128, g: 128, b: 128, a: 255 });
  await page.keyboard.press("Enter");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 128, g: 128, b: 128, a: 255 });
  expect(await readPixel(page, 20, 20)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
});
