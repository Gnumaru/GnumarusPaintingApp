import { expect, test } from "@playwright/test";
import { getLayers, loadBlankProject, readPixel } from "./e2e-helpers";

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";

const BLANK = { r: 0, g: 0, b: 0, a: 0 };

test("desktop UA boots the desktop shell (no mobile chrome)", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await expect(page.locator('gnumarus-shell [data-testid="mobile-shell"]')).toHaveCount(0);
  await expect(page.locator("gnumarus-shell .menubar")).toBeVisible();
  // Desktop keeps the default new-project preset size regardless of window.
  const { layers } = await getLayers(page);
  expect(layers.length).toBeGreaterThan(0);
  expect({ width: layers[0].width, height: layers[0].height }).toEqual({ width: 1920, height: 1080 });
});

test.describe("mobile shell", () => {
  test.use({
    userAgent: IPHONE_UA,
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });

  test("boots the mobile shell with a single scrollable bar", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('gnumarus-shell [data-testid="mobile-shell"]');
    await expect(page.locator("gnumarus-shell .menubar")).toHaveCount(0);
    for (const id of [
      "mobile-pencil",
      "mobile-eraser",
      "mobile-undo",
      "mobile-redo",
      "mobile-settings",
      "mobile-bucket",
      "mobile-eyedropper",
      "mobile-menu",
    ]) {
      await expect(page.locator(`gnumarus-shell [data-testid="${id}"]`)).toBeVisible();
    }
    await expect(page.locator('gnumarus-shell [data-testid="mobile-pencil"]')).toHaveClass(/active/);
    // Save and the desktop switch live inside the hamburger menu.
    await expect(page.locator('gnumarus-shell [data-testid="mobile-menu-sheet"]')).toHaveCount(0);
  });

  test("hamburger menu holds save and the desktop switch", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('gnumarus-shell [data-testid="mobile-shell"]');
    await page.locator('gnumarus-shell [data-testid="mobile-menu"]').click();
    const sheet = page.locator('gnumarus-shell [data-testid="mobile-menu-sheet"]');
    await expect(sheet).toBeVisible();
    await expect(sheet.locator('[data-testid="mobile-save"]')).toBeVisible();
    await expect(sheet.locator('[data-testid="mobile-desktop"]')).toBeVisible();
    await page.locator('gnumarus-shell [data-testid="mobile-menu"]').click();
    await expect(sheet).toHaveCount(0);
  });

  test("mobile boots a portrait project at the screen resolution", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('gnumarus-shell [data-testid="mobile-shell"]');
    // Viewport is 390x844 at DPR 1, so the boot project matches the screen.
    const { layers } = await getLayers(page);
    expect(layers.length).toBeGreaterThan(0);
    expect({ width: layers[0].width, height: layers[0].height }).toEqual({ width: 390, height: 844 });
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

  test("two-finger twist rotates without committing a paint dot", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('gnumarus-shell [data-testid="mobile-shell"]');
    await loadBlankProject(page, 64);
    const box = await page.locator("gnumarus-shell canvas").boundingBox();
    if (box === null) {
      throw new Error("canvas has no bounding box");
    }
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const cdp = await page.context().newCDPSession(page);
    // Start horizontal, end vertical: a 90-degree clockwise twist.
    const twist = (angleDeg: number): Array<{ x: number; y: number; id: number }> => {
      const angle = (angleDeg * Math.PI) / 180;
      const radius = 45;
      return [
        { x: cx - radius * Math.cos(angle), y: cy - radius * Math.sin(angle), id: 1 },
        { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle), id: 2 },
      ];
    };
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: twist(0) });
    for (const angle of [20, 45, 70, 90]) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: twist(angle) });
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect
      .poll(async () => {
        return page.evaluate(() => {
          const root = window as unknown as { __gnumarus?: { shell?: { rotText: string } } };
          return root.__gnumarus?.shell?.rotText ?? null;
        });
      })
      .toBe("90°");
    expect(await readPixel(page, 32, 32)).toEqual(BLANK);
  });

  test("override switches mobile to desktop and back", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('gnumarus-shell [data-testid="mobile-shell"]');
    await page.locator('gnumarus-shell [data-testid="mobile-menu"]').click();
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
