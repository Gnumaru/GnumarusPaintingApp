import { expect, test } from "@playwright/test";
import { getGrid, loadBlankProject, openPicker, setChecker } from "./e2e-helpers";

test("pixel grid hides below 200 percent and shows above", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { setZoom(z: number): void } };
    };
    root.__gnumarus?.engine?.setZoom(10);
  });
  expect((await getGrid(page)).visible).toBe(true);
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { setZoom(z: number): void } };
    };
    root.__gnumarus?.engine?.setZoom(1);
  });
  expect((await getGrid(page)).visible).toBe(false);
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { setZoom(z: number): void } };
    };
    root.__gnumarus?.engine?.setZoom(16);
  });
  const state = await getGrid(page);
  expect(state.visible).toBe(true);
  expect(state.minZoom).toBeCloseTo(10, 5);
  expect(state.layerId).toBe("layer0");
  expect(state.width).toBe(64);
});

test("pixel grid threshold is configurable in Edit > Settings", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Pixel grid minimum zoom");
  await page.locator("gnumarus-shell input#gridMinZoom").fill("400");
  const grid = await getGrid(page);
  expect(grid.minZoom).toBeCloseTo(4, 5);
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { setZoom(z: number): void } };
    };
    root.__gnumarus?.engine?.setZoom(2);
  });
  expect((await getGrid(page)).visible).toBe(false);
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { setZoom(z: number): void } };
    };
    root.__gnumarus?.engine?.setZoom(4);
  });
  expect((await getGrid(page)).visible).toBe(true);
  const persisted = await page.evaluate(() => window.localStorage.getItem("gnumarus.settings.grid.v1"));
  expect(persisted).toContain("4");
  await page.locator("gnumarus-shell input#gridMinZoom").fill("100");
  expect((await getGrid(page)).minZoom).toBeCloseTo(2, 5);
  await page.locator("gnumarus-shell input#gridMinZoom").fill("99999");
  expect((await getGrid(page)).minZoom).toBeCloseTo(64, 5);
});

test("pixel grid opacity is configurable in Edit > Settings", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Pixel grid opacity");
  expect((await getGrid(page)).opacityPercent).toBe(100);
  await page.locator("gnumarus-shell input#gridOpacity").fill("50");
  expect((await getGrid(page)).opacityPercent).toBe(50);
  await expect(page.locator("gnumarus-shell")).toContainText("Pixel grid opacity: 50%");
  const persisted = await page.evaluate(() => window.localStorage.getItem("gnumarus.settings.grid.v1"));
  expect(persisted).toContain("50");
  await page.locator("gnumarus-shell input#gridOpacity").fill("999");
  expect((await getGrid(page)).opacityPercent).toBe(100);
  await page.locator("gnumarus-shell input#gridOpacity").fill("0");
  expect((await getGrid(page)).opacityPercent).toBe(0);
  await page.getByRole("button", { name: "Reset pixel grid opacity to default" }).click();
  expect((await getGrid(page)).opacityPercent).toBe(100);
  await expect(page.locator("gnumarus-shell")).toContainText("Pixel grid opacity reset to default");
});

test("pixel grid follows the active layer transform", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Add layer" }).click();
  let grid = await getGrid(page);
  expect(grid.layerId).toBe("layer1");
  await page.locator('gnumarus-shell [data-layer-id="layer0"] .layer-name').click();
  grid = await getGrid(page);
  expect(grid.layerId).toBe("layer0");
  const matrices = await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: {
        engine?: {
          setZoom(z: number): void;
          setLayerTransform(id: string, t: { rotation: number }): boolean;
          getGridPlaneMatrix(): number[];
          getLayerPlaneMatrix(id: string): number[] | null;
          getActiveLayerId(): string;
        };
      };
    };
    const engine = root.__gnumarus?.engine;
    if (engine === undefined) {
      throw new Error("engine is unavailable");
    }
    engine.setZoom(16);
    engine.setLayerTransform(engine.getActiveLayerId(), { rotation: Math.PI / 4 });
    return { grid: engine.getGridPlaneMatrix(), layer: engine.getLayerPlaneMatrix(engine.getActiveLayerId()) };
  });
  expect(matrices.layer).not.toBeNull();
  if (matrices.layer === null) {
    throw new Error("layer matrix is missing");
  }
  for (const index of [0, 1, 4, 5, 12, 13]) {
    expect(matrices.grid[index]).toBeCloseTo(matrices.layer[index] ?? 0, 4);
  }
  expect(await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { isPixelGridVisible(): boolean } };
    };
    return root.__gnumarus?.engine?.isPixelGridVisible() ?? false;
  })).toBe(true);
});

test("pixel grid stays visible across max zoom out/in with black checkerboard", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error: Error) => {
    errors.push(error.message);
  });
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await setChecker(page, "A", "#000000");
  await setChecker(page, "B", "#000000");
  await page.getByRole("button", { name: "Close" }).click();
  const setZoom = (zoom: number): Promise<void> =>
    page.evaluate((value: number) => {
      const root = window as unknown as {
        __gnumarus?: { engine?: { setZoom(z: number): void } };
      };
      root.__gnumarus?.engine?.setZoom(value);
    }, zoom);
  const isVisible = (): Promise<boolean> =>
    page.evaluate(() => {
      const root = window as unknown as {
        __gnumarus?: { engine?: { isPixelGridVisible(): boolean } };
      };
      return root.__gnumarus?.engine?.isPixelGridVisible() ?? false;
    });
  await setZoom(64);
  expect(await isVisible()).toBe(true);
  await setZoom(48);
  expect(await isVisible()).toBe(true);
  await setZoom(64);
  expect(await isVisible()).toBe(true);
  await setZoom(32);
  expect(await isVisible()).toBe(true);
  await setZoom(64);
  expect(await isVisible()).toBe(true);
  expect(errors).toEqual([]);
});

test("settings show reset arrows only when non-default and reset on click", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Pixel grid minimum zoom");
  expect(await page.getByRole("button", { name: "Reset pixel grid minimum zoom to default" }).count()).toBe(0);
  await page.locator("gnumarus-shell input#gridMinZoom").fill("400");
  await expect(page.getByRole("button", { name: "Reset pixel grid minimum zoom to default" })).toBeVisible();
  await page.getByRole("button", { name: "Reset pixel grid minimum zoom to default" }).click();
  expect(await getGrid(page)).toMatchObject({ minZoom: 10 });
  expect(await page.getByRole("button", { name: "Reset pixel grid minimum zoom to default" }).count()).toBe(0);
  expect(await page.getByRole("button", { name: "Reset checker width to default" }).count()).toBe(0);
  await page.locator("gnumarus-shell input#checkerSizeX").fill("32");
  await expect(page.getByRole("button", { name: "Reset checker width to default" })).toBeVisible();
  await page.getByRole("button", { name: "Reset checker width to default" }).click();
  const checkerX = await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getCheckerSettings(): { sizeX: number } } };
    };
    return root.__gnumarus?.engine?.getCheckerSettings().sizeX ?? 0;
  });
  expect(checkerX).toBe(16);
});

test("canvas background can switch between checkerboard and solid color", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Background mode");
  await expect(page.locator("gnumarus-shell input#checkerSizeX")).toBeVisible();
  await page.locator("gnumarus-shell select#backgroundMode").selectOption("solid");
  await expect(page.locator("gnumarus-shell input#checkerSizeX")).toHaveCount(0);
  const backgroundPicker = await openPicker(page, "backgroundColor");
  await backgroundPicker.locator("select#modelSelect").selectOption("rgb");
  await backgroundPicker.getByLabel("Red", { exact: true }).fill("255");
  await backgroundPicker.getByLabel("Green", { exact: true }).fill("0");
  await backgroundPicker.getByLabel("Blue", { exact: true }).fill("0");
  await backgroundPicker.getByRole("button", { name: "Pick color" }).click();
  const background = await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getBackgroundSettings(): { mode: string; color: string } } };
    };
    return root.__gnumarus?.engine?.getBackgroundSettings() ?? null;
  });
  expect(background).toEqual({ mode: "solid", color: "#ff0000" });
  const persisted = await page.evaluate(() => window.localStorage.getItem("gnumarus.settings.background.v1"));
  expect(persisted).toContain("solid");
  await page.locator("gnumarus-shell select#backgroundMode").selectOption("checkerboard");
  await expect(page.locator("gnumarus-shell input#checkerSizeX")).toBeVisible();
  await expect(page.locator("gnumarus-shell #backgroundColor")).toHaveCount(0);
});

test("final preview shows flattened render with zoom and pan", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.getByRole("button", { name: "Final preview" }).click();
  const preview = page.locator('gnumarus-shell [data-testid="final-preview"]');
  await expect(preview).toBeVisible();
  await expect(preview).toContainText("Final preview");
  const previewCanvas = page.locator("gnumarus-shell canvas#previewCanvas");
  await expect(previewCanvas).toBeVisible();
  const size = await previewCanvas.evaluate((element: HTMLCanvasElement) => ({ width: element.width, height: element.height }));
  expect(size).toEqual({ width: 64, height: 64 });
  const zoomInput = preview.locator('[data-testid="preview-zoom-input"]');
  await expect(zoomInput).toHaveValue("400");
  await preview.getByRole("button", { name: "Zoom in preview" }).click();
  await expect(zoomInput).toHaveValue("800");
  const scaledWidth = await previewCanvas.evaluate((element: HTMLCanvasElement) => element.style.width);
  expect(scaledWidth).toBe("512px");
  await preview.getByRole("button", { name: "Zoom out preview" }).click();
  await expect(zoomInput).toHaveValue("400");
  await preview.getByRole("button", { name: "Close preview" }).click();
  await expect(preview).toHaveCount(0);
});

test("final preview zoom input, fit and 1:1 @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await page.getByRole("button", { name: "Final preview" }).click();
  const preview = page.locator('gnumarus-shell [data-testid="final-preview"]');
  await expect(preview).toBeVisible();
  const zoomInput = preview.locator('[data-testid="preview-zoom-input"]');
  await expect(zoomInput).toHaveValue("400");
  const previewCanvas = page.locator("gnumarus-shell canvas#previewCanvas");
  // 1:1 resets to a true 100%.
  await preview.getByRole("button", { name: "Reset preview zoom" }).click();
  await expect(zoomInput).toHaveValue("100");
  expect(await previewCanvas.evaluate((element: HTMLCanvasElement) => element.style.width)).toBe("64px");
  // Typed values apply on commit and clamp to 1..6400.
  await zoomInput.fill("50");
  await zoomInput.evaluate((el: HTMLElement) => el.blur());
  await expect(zoomInput).toHaveValue("50");
  expect(await previewCanvas.evaluate((element: HTMLCanvasElement) => element.style.width)).toBe("32px");
  await zoomInput.fill("99999");
  await zoomInput.evaluate((el: HTMLElement) => el.blur());
  await expect(zoomInput).toHaveValue("6400");
  await zoomInput.fill("0");
  await zoomInput.evaluate((el: HTMLElement) => el.blur());
  await expect(zoomInput).toHaveValue("1");
  // Fit shows the whole image at once without scrolling.
  await preview.getByRole("button", { name: "Fit", exact: true }).click();
  const body = preview.locator(".preview-body");
  const fits = await body.evaluate((element: HTMLElement) => {
    const canvas = element.querySelector("canvas");
    if (canvas === null) {
      throw new Error("preview canvas is missing");
    }
    return {
      styleWidth: Number.parseFloat(canvas.style.width),
      styleHeight: Number.parseFloat(canvas.style.height),
      clientWidth: element.clientWidth,
      clientHeight: element.clientHeight,
    };
  });
  expect(fits.styleWidth).toBeGreaterThan(0);
  expect(fits.styleWidth).toBeLessThanOrEqual(fits.clientWidth);
  expect(fits.styleHeight).toBeLessThanOrEqual(fits.clientHeight);
  await expect(zoomInput).not.toHaveValue("1");
});
