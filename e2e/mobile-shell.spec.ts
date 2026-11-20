import { expect, test } from "@playwright/test";
import { loadBlankProject, readPixel } from "./e2e-helpers";

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";

const BLANK = { r: 0, g: 0, b: 0, a: 0 };

test("desktop UA boots the desktop shell (no mobile chrome)", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await expect(page.locator('gnumarus-shell [data-testid="mobile-shell"]')).toHaveCount(0);
  await expect(page.locator("gnumarus-shell .menubar")).toBeVisible();
});

test.describe("mobile shell", () => {
  test.use({
    userAgent: IPHONE_UA,
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });

  test("boots the mobile shell with bottom toolbar", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('gnumarus-shell [data-testid="mobile-shell"]');
    await expect(page.locator("gnumarus-shell .menubar")).toHaveCount(0);
    for (const id of [
      "mobile-pencil",
      "mobile-eraser",
      "mobile-bucket",
      "mobile-eyedropper",
      "mobile-settings",
      "mobile-undo",
      "mobile-redo",
    ]) {
      await expect(page.locator(`gnumarus-shell [data-testid="${id}"]`)).toBeVisible();
    }
    await expect(page.locator('gnumarus-shell [data-testid="mobile-pencil"]')).toHaveClass(/active/);
  });

  test("touch tap paints and the undo button clears it", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('gnumarus-shell [data-testid="mobile-shell"]');
    await loadBlankProject(page, 64);
    const canvas = page.locator("gnumarus-shell canvas");
    const box = await canvas.boundingBox();
    if (box === null) {
      throw new Error("canvas has no bounding box");
    }
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await expect.poll(() => readPixel(page, 32, 32)).not.toEqual(BLANK);
    await page.locator('gnumarus-shell [data-testid="mobile-undo"]').click();
    expect(await readPixel(page, 32, 32)).toEqual(BLANK);
    await page.locator('gnumarus-shell [data-testid="mobile-redo"]').click();
    await expect.poll(() => readPixel(page, 32, 32)).not.toEqual(BLANK);
  });

  test("tool buttons switch tool and blend, sheet edits color and size", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('gnumarus-shell [data-testid="mobile-shell"]');
    await loadBlankProject(page, 64);

    await page.locator('gnumarus-shell [data-testid="mobile-eyedropper"]').click();
    await expect(page.locator('gnumarus-shell [data-testid="mobile-eyedropper"]')).toHaveClass(/active/);
    await page.locator('gnumarus-shell [data-testid="mobile-eraser"]').click();
    await expect(page.locator('gnumarus-shell [data-testid="mobile-eraser"]')).toHaveClass(/active/);
    const blend = await page.evaluate(() => {
      const root = window as unknown as { __gnumarus?: { shell?: { blendMode: string } } };
      return root.__gnumarus?.shell?.blendMode ?? null;
    });
    expect(blend).toBe("eraser");

    await page.locator('gnumarus-shell [data-testid="mobile-settings"]').click();
    await expect(page.locator('gnumarus-shell [data-testid="mobile-sheet"]')).toBeVisible();
    await page.locator('gnumarus-shell [data-testid="mobile-color"]').fill("#ff0000");
    expect(
      await page.evaluate(() => {
        const root = window as unknown as { __gnumarus?: { shell?: { colorValue: string } } };
        return root.__gnumarus?.shell?.colorValue ?? null;
      }),
    ).toBe("#ff0000");
    await page.locator('gnumarus-shell [data-testid="mobile-size"]').fill("12.5");
    expect(
      await page.evaluate(() => {
        const root = window as unknown as { __gnumarus?: { shell?: { brushSize: number } } };
        return root.__gnumarus?.shell?.brushSize ?? null;
      }),
    ).toBeCloseTo(12.5, 5);
  });

  test("pinch zooms without committing a paint dot", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('gnumarus-shell [data-testid="mobile-shell"]');
    await loadBlankProject(page, 64);
    const zoomBefore = await page.evaluate(() => {
      const root = window as unknown as { __gnumarus?: { shell?: { zoomText: string } } };
      return root.__gnumarus?.shell?.zoomText ?? null;
    });
    const box = await page.locator("gnumarus-shell canvas").boundingBox();
    if (box === null) {
      throw new Error("canvas has no bounding box");
    }
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const cdp = await page.context().newCDPSession(page);
    const points = (spread: number): Array<{ x: number; y: number; id: number }> => [
      { x: cx - spread, y: cy, id: 1 },
      { x: cx + spread, y: cy, id: 2 },
    ];
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: points(20) });
    for (const spread of [30, 45, 65, 90]) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: points(spread) });
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect
      .poll(async () => {
        return page.evaluate(() => {
          const root = window as unknown as { __gnumarus?: { shell?: { zoomText: string } } };
          return root.__gnumarus?.shell?.zoomText ?? null;
        });
      })
      .not.toBe(zoomBefore);
    // The first finger's touchdown dot must have been discarded, not committed.
    expect(await readPixel(page, 32, 32)).toEqual(BLANK);
    const undoDepth = await page.evaluate(() => {
      const root = window as unknown as {
        __gnumarus?: { engine?: { history: { undoDepth(): number } } };
      };
      return root.__gnumarus?.engine?.history.undoDepth() ?? null;
    });
    expect(undoDepth).toBe(0);
  });

  test("override switches mobile to desktop and back", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('gnumarus-shell [data-testid="mobile-shell"]');
    await page.locator('gnumarus-shell [data-testid="mobile-desktop"]').click();
    await expect(page.locator("gnumarus-shell .menubar")).toBeVisible();
    await expect(page.locator('gnumarus-shell [data-testid="mobile-shell"]')).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem("gnumarus.uiMode"))).toBe("desktop");
    // The shared engine canvas moved hosts: painting still works on desktop.
    await loadBlankProject(page, 64);
    const box = await page.locator("gnumarus-shell canvas").boundingBox();
    if (box === null) {
      throw new Error("canvas has no bounding box");
    }
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 10, box.y + box.height / 2 + 10, { steps: 3 });
    await page.mouse.up();
    await expect.poll(() => readPixel(page, 32, 32)).not.toEqual(BLANK);

    await page.getByRole("button", { name: "Help" }).click();
    await page.getByRole("button", { name: "Mobile version" }).click();
    await expect(page.locator('gnumarus-shell [data-testid="mobile-shell"]')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("gnumarus.uiMode"))).toBe("mobile");
  });
});
