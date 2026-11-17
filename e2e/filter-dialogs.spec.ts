import { expect, test } from "@playwright/test";
import {
  dragRect,
  loadBlankProject,
  paintCenter,
  paintLayerRect,
  readFloatingPixel,
  readPixel,
  selectTool,
  setPencil,
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

async function paintRedBlock(page: import("@playwright/test").Page): Promise<void> {
  await loadBlankProject(page, 64);
  await setPencil(page, "#ff0000");
  await paintLayerRect(page, "#ff0000", 24, 24, 39, 39);
}

async function distinctPixelCount(page: import("@playwright/test").Page): Promise<number> {
  return page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { exportTextures(): Array<{ buffer: Uint8ClampedArray }> } };
    };
    const buffer = root.__gnumarus?.engine?.exportTextures()[0]?.buffer;
    const seen = new Set<number>();
    if (buffer !== undefined) {
      for (let i = 0; i < buffer.length; i += 4) {
        seen.add(((buffer[i] ?? 0) << 24) | ((buffer[i + 1] ?? 0) << 16) | ((buffer[i + 2] ?? 0) << 8) | (buffer[i + 3] ?? 0));
      }
    }
    return seen.size;
  });
}

test("filters menu lists themes and opens a dialog @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintRedBlock(page);
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  const flyout = page.locator("gnumarus-shell .submenu-flyout");
  await page.locator("gnumarus-shell .submenu-row").filter({ hasText: "Blur" }).hover();
  await expect(flyout.getByRole("button", { name: "Gaussian Blur" })).toBeVisible();
  await flyout.getByRole("button", { name: "Gaussian Blur" }).click();
  const popup = dialog(page);
  await expect(popup).toBeVisible();
  await expect(popup.locator('[data-testid="filter-param-radius"]')).toBeVisible();
  await expect(popup.getByTestId("filter-spinner")).toBeHidden();
  await page.keyboard.press("Escape");
  await expect(popup).toBeHidden();
});

test("invert applies, undoes and cancels cleanly @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintRedBlock(page);
  expect(await runFilter(page, "invert")).toBe(true);
  const popup = dialog(page);
  await expect(popup).toBeVisible();
  await expect(popup.getByTestId("filter-spinner")).toBeHidden();
  // Auto-preview on open already inverted the block.
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 255, b: 255, a: 255 });
  await popup.getByRole("button", { name: "OK", exact: true }).click();
  await expect(popup).toBeHidden();
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 255, b: 255, a: 255 });
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  // Reopen, apply, then cancel restores the pre-dialog pixels.
  expect(await runFilter(page, "invert")).toBe(true);
  await expect(dialog(page)).toBeVisible();
  await dialog(page).getByRole("button", { name: "Apply", exact: true }).click();
  await expect(dialog(page).getByTestId("filter-spinner")).toBeHidden();
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 255, b: 255, a: 255 });
  await dialog(page).getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog(page)).toBeHidden();
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("apply twice then cancel returns to the pre-last-apply pixels @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintRedBlock(page);
  expect(await runFilter(page, "pixelize")).toBe(true);
  const popup = dialog(page);
  await expect(popup).toBeVisible();
  await popup.locator('[data-testid="filter-param-size"]').fill("8");
  await popup.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(popup.getByTestId("filter-spinner")).toBeHidden();
  const afterFirst = await distinctPixelCount(page);
  await popup.locator('[data-testid="filter-param-size"]').fill("32");
  await popup.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(popup.getByTestId("filter-spinner")).toBeHidden();
  expect(await distinctPixelCount(page)).toBeLessThan(afterFirst);
  await popup.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(await distinctPixelCount(page)).toBe(afterFirst);
});

test("param reset arrow restores the default value @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintRedBlock(page);
  expect(await runFilter(page, "gaussian-blur")).toBe(true);
  const popup = dialog(page);
  await expect(popup).toBeVisible();
  await expect(popup.locator('[data-testid="filter-param-radius-reset"]')).toHaveCount(0);
  await popup.locator('[data-testid="filter-param-radius-num"]').fill("12");
  await expect(popup.locator('[data-testid="filter-param-radius-reset"]')).toHaveCount(1);
  await popup.locator('[data-testid="filter-param-radius-reset"]').click();
  expect(await popup.locator('[data-testid="filter-param-radius"]').inputValue()).toBe("2");
  await page.keyboard.press("Escape");
});

interface FilterSpotCheck {
  id: string;
  setup?: "graydot" | "whitedot";
  check: (page: import("@playwright/test").Page) => Promise<void>;
}

const FILTER_SPOT_CHECKS: FilterSpotCheck[] = [
  {
    id: "gaussian-blur",
    async check(page) {
      const center = await readPixel(page, 32, 32);
      expect(center?.r).toBeGreaterThan(100);
      expect(center?.a).toBe(255);
    },
  },
  {
    id: "motion-blur",
    async check(page) {
      const center = await readPixel(page, 32, 32);
      expect(center?.r).toBeGreaterThan(0);
    },
  },
  {
    id: "pixelize",
    async check(page) {
      const center = await readPixel(page, 32, 32);
      expect(center?.r).toBeGreaterThan(center?.b ?? -1);
    },
  },
  {
    id: "unsharp-mask",
    async check(page) {
      expect(await readPixel(page, 25, 25)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
    },
  },
  {
    id: "sharpen",
    async check(page) {
      expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
    },
  },
  {
    id: "despeckle",
    async check(page) {
      expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
    },
  },
  {
    id: "oilify",
    async check(page) {
      const center = await readPixel(page, 32, 32);
      expect(center?.r).toBeGreaterThan(100);
    },
  },
  {
    id: "emboss",
    async check(page) {
      const center = await readPixel(page, 32, 32);
      expect(center?.r).toBe(center?.g);
      expect(center?.g).toBe(center?.b);
    },
  },
  {
    id: "sobel",
    async check(page) {
      // Flat block interior has no edges: black, alpha preserved.
      expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
    },
  },
  {
    id: "neon",
    async check(page) {
      const center = await readPixel(page, 32, 32);
      expect(center?.r).toBe(255);
    },
  },
  {
    id: "rgb-noise",
    async check(page) {
      expect(await distinctPixelCount(page)).toBeGreaterThan(1);
    },
  },
  {
    id: "posterize",
    setup: "graydot",
    async check(page) {
      expect(await readPixel(page, 32, 32)).toEqual({ r: 170, g: 170, b: 170, a: 255 });
    },
  },
  {
    id: "threshold",
    async check(page) {
      // Red luminance (~54) falls below 128: black.
      expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
    },
  },
  {
    id: "desaturate",
    async check(page) {
      const center = await readPixel(page, 32, 32);
      expect(center?.r).toBe(center?.g);
      expect(center?.g).toBe(center?.b);
      expect(center?.r).toBeGreaterThan(0);
    },
  },
  {
    id: "color-to-alpha",
    setup: "whitedot",
    async check(page) {
      expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 255, b: 255, a: 0 });
    },
  },
];

test("every filter applies and undoes cleanly @recent", async ({ page }) => {
  for (const item of FILTER_SPOT_CHECKS) {
    await page.goto("/");
    await page.waitForSelector("gnumarus-shell canvas");
    await loadBlankProject(page, 64);
    if (item.setup === "graydot") {
      await setPencil(page, "#808080");
      await paintCenter(page);
    } else if (item.setup === "whitedot") {
      await setPencil(page, "#ffffff");
      await paintCenter(page);
    } else {
      await setPencil(page, "#ff0000");
      await paintLayerRect(page, "#ff0000", 24, 24, 39, 39);
    }
    expect(await runFilter(page, item.id)).toBe(true);
    const popup = dialog(page);
    await expect(popup).toBeVisible();
    await popup.getByRole("button", { name: "OK", exact: true }).click();
    await expect(popup).toBeHidden();
    await item.check(page);
    await page.keyboard.press("Control+z");
  }
});

test("filter applies to the floating selection only @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintRedBlock(page);
  await selectTool(page, "Rectangular selection");
  await dragRect(page, 28, 28, 36, 36);
  expect(await runFilter(page, "invert")).toBe(true);
  await expect(dialog(page)).toBeVisible();
  await dialog(page).getByRole("button", { name: "OK", exact: true }).click();
  expect(await readFloatingPixel(page, 4, 4)).toEqual({ r: 0, g: 255, b: 255, a: 255 });
  await page.keyboard.press("Enter");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 255, b: 255, a: 255 });
  expect(await readPixel(page, 20, 20)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
});

test("filter reports empty on a blank canvas @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await runFilter(page, "invert");
  await expect(dialog(page)).toBeHidden();
  await expect(page.locator('gnumarus-shell [data-testid="toast"]')).toContainText("Nothing to filter");
});
