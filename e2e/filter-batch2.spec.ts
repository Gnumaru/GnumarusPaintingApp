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

interface Batch2SpotCheck {
  id: string;
  setup: "red" | "gray" | "white" | "halves";
  /** Pixel at (32,32) after OK + undo: the dialog-open pixel when the filter changed something, otherwise transparent (a no-op filter writes no history entry, so undo removes the paint itself). */
  afterUndo: Pixel;
  check: (center: Pixel | null, page: import("@playwright/test").Page) => unknown;
}

const RED: Pixel = { r: 255, g: 0, b: 0, a: 255 };
const GRAY: Pixel = { r: 128, g: 128, b: 128, a: 255 };
const WHITE: Pixel = { r: 255, g: 255, b: 255, a: 255 };
const BLANK: Pixel = { r: 0, g: 0, b: 0, a: 0 };

const BATCH2_SPOT_CHECKS: Batch2SpotCheck[] = [
  { id: "color-balance", setup: "red", afterUndo: BLANK, check: (c) => expect(c).toEqual(RED) },
  { id: "channel-mixer", setup: "red", afterUndo: BLANK, check: (c) => expect(c).toEqual(RED) },
  {
    id: "colorize",
    setup: "red",
    afterUndo: RED,
    check: (c) => {
      // Red (hsl 0,1,0.5) repainted at hue 220, sat 50%: blue-dominant.
      expect(c?.b).toBeGreaterThan(100);
      expect(c && c.r < c.g && c.g < c.b).toBe(true);
    },
  },
  {
    id: "sepia",
    setup: "white",
    afterUndo: WHITE,
    check: (c) => expect(c).toEqual({ r: 255, g: 255, b: 239, a: 255 }),
  },
  { id: "exposure", setup: "gray", afterUndo: BLANK, check: (c) => expect(c).toEqual(GRAY) },
  { id: "saturation", setup: "gray", afterUndo: BLANK, check: (c) => expect(c).toEqual(GRAY) },
  {
    id: "dodge-burn",
    setup: "gray",
    afterUndo: GRAY,
    check: (c) => {
      // Dodge at 50% on mid-gray lifts every channel equally.
      expect(c?.r).toBeGreaterThan(128);
      expect(c?.r).toBe(c?.g);
      expect(c?.g).toBe(c?.b);
    },
  },
  {
    id: "auto-contrast",
    setup: "halves",
    afterUndo: { r: 192, g: 192, b: 192, a: 255 },
    check: async (c, page) => {
      // 64 stretches to black, 192 stretches to white.
      expect(c).toEqual(WHITE);
      expect(await readPixel(page, 16, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
    },
  },
  { id: "cartoon", setup: "red", afterUndo: RED, check: (c) => expect(c).toEqual(RED) },
  {
    id: "laplace",
    setup: "white",
    afterUndo: WHITE,
    check: (c) => expect(c).toEqual({ r: 0, g: 0, b: 0, a: 255 }),
  },
  {
    id: "difference-of-gaussians",
    setup: "white",
    afterUndo: WHITE,
    check: (c) => expect(c).toEqual({ r: 128, g: 128, b: 128, a: 255 }),
  },
  {
    id: "hurl",
    setup: "gray",
    afterUndo: GRAY,
    check: () => {},
  },
];

test("every batch-2 filter applies and undoes cleanly @recent", async ({ page }) => {
  for (const item of BATCH2_SPOT_CHECKS) {
    await page.goto("/");
    await page.waitForSelector("gnumarus-shell canvas");
    if (item.setup === "red") {
      await paintBlock(page, "#ff0000");
    } else if (item.setup === "gray") {
      await paintBlock(page, "#808080");
    } else if (item.setup === "white") {
      await paintBlock(page, "#ffffff");
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

test("color-balance param round-trips and resets @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintBlock(page, "#808080");
  expect(await runFilter(page, "color-balance")).toBe(true);
  const popup = dialog(page);
  await expect(popup).toBeVisible();
  await expect(popup.locator('[data-testid="filter-param-cyanRed-reset"]')).toHaveCount(0);
  await popup.locator('[data-testid="filter-param-cyanRed-num"]').fill("100");
  await expect(popup.locator('[data-testid="filter-param-cyanRed-reset"]')).toHaveCount(1);
  await popup.locator('[data-testid="filter-param-cyanRed-reset"]').click();
  expect(await popup.locator('[data-testid="filter-param-cyanRed"]')).toHaveValue("0");
  await page.keyboard.press("Escape");
  await expect(popup).toBeHidden();
});

test("channel-mixer identity keeps pixels @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintBlock(page, "#ff0000");
  expect(await runFilter(page, "channel-mixer")).toBe(true);
  const popup = dialog(page);
  await expect(popup).toBeVisible();
  await expect(popup.locator('[data-testid="filter-param-rr"]')).toBeVisible();
  await popup.getByRole("button", { name: "OK", exact: true }).click();
  await expect(popup).toBeHidden();
  expect(await readPixel(page, 32, 32)).toEqual(RED);
  await page.keyboard.press("Control+z");
  // Identity changes nothing, so no filter history entry exists: undo removes the paint.
  expect(await readPixel(page, 32, 32)).toEqual(BLANK);
});

test("batch-2 filter targets the floating selection @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintBlock(page, "#ff0000");
  await selectTool(page, "Rectangular selection");
  await dragRect(page, 28, 28, 36, 36);
  expect(await runFilter(page, "colorize")).toBe(true);
  await expect(dialog(page)).toBeVisible();
  await dialog(page).getByRole("button", { name: "OK", exact: true }).click();
  const floated = await readFloatingPixel(page, 4, 4);
  expect(floated?.b).toBeGreaterThan(100);
  expect(floated && floated.r < floated.g && floated.g < floated.b).toBe(true);
  await page.keyboard.press("Enter");
  const merged = await readPixel(page, 32, 32);
  expect(merged?.b).toBeGreaterThan(100);
  expect(merged && merged.r < merged.g && merged.g < merged.b).toBe(true);
  expect(await readPixel(page, 20, 20)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
});
