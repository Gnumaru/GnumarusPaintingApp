import { expect, test } from "@playwright/test";
import { layerPixelToScreen } from "../src/canvas/GnumarusViewportMath";
import { getViewState, loadBlankProject, openPicker, paintedPixelCount, readPixel, selectTool, setPencil, shapePreviewVisible } from "./e2e-helpers";

test("line tool draws two-click segments with width, shape and aliasing", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: {
        engine?: {
          loadProject(
            width: number,
            height: number,
            inputs: Array<{
              id: string;
              name: string;
              visible: boolean;
              opacity: number;
              width: number;
              height: number;
              buffer: Uint8ClampedArray;
              transform: { x: number; y: number; rotation: number; flipX: boolean; flipY: boolean; scaleX: number; scaleY: number; skewX: number; skewY: number; rotationX: number; rotationY: number };
            }>,
          ): void;
        };
      };
    };
    root.__gnumarus?.engine?.loadProject(64, 64, [
      {
        id: "tiny",
        name: "Tiny",
        visible: true,
        opacity: 1,
        width: 8,
        height: 8,
        buffer: new Uint8ClampedArray(8 * 8 * 4),
        transform: { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
      },
    ]);
  });
  await setPencil(page, "#ff0000");
  await selectTool(page, 'Line');
  const options = page.locator('gnumarus-shell [data-testid="tool-options"]');
  await expect(options).toContainText("Line width");
  await expect(options).toContainText("Anti-aliasing");
  await page.locator("gnumarus-shell input#lineWidth").fill("1");
  await expect(page.locator("gnumarus-shell")).toContainText("Line width: 1");
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const clickAt = async (lx: number, ly: number): Promise<void> => {
    const state = await getViewState(page);
    const target = layerPixelToScreen(
      lx,
      ly,
      { left: box.x, top: box.y, width: box.width, height: box.height },
      8,
      8,
      { zoom: state.zoom, panX: 0, panY: 0, rotation: state.rotation, flipX: false, flipY: false },
      { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
    );
    await page.mouse.click(target.x, target.y);
  };
  await clickAt(1, 1);
  expect(await readPixel(page, 1, 1)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  await clickAt(6, 1);
  expect(await readPixel(page, 1, 1)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 6, 1)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 3, 1)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 3, 3)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 1, 1)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  await page.locator("gnumarus-shell input#lineAntialias").check();
  await expect(page.locator("gnumarus-shell")).toContainText("Line anti-aliasing: on");
  await clickAt(0, 0);
  await clickAt(7, 7);
  expect(await readPixel(page, 3, 3)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  const edge = await readPixel(page, 3, 4);
  expect(edge).not.toBeNull();
  expect(edge!.r).toBe(255);
  expect(edge!.a).toBeGreaterThan(0);
  expect(edge!.a).toBeLessThan(255);
  await page.keyboard.press("n");
  await expect(page.locator("gnumarus-shell")).toContainText("line");
});

test("brush and line previews follow the mouse", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const previewState = (): Promise<{ brush: string; line: string }> =>
    page.evaluate(() => {
      const root = document.querySelector("gnumarus-shell")?.shadowRoot;
      const host = root?.getElementById("canvasHost") ?? null;
      const brush = host?.querySelector('[data-testid="brush-preview"]') as HTMLElement | null;
      const line = host?.querySelector('[data-testid="line-preview"]') as SVGSVGElement | null;
      return { brush: brush?.style.display ?? "missing", line: line?.style.display ?? "missing" };
    });
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  await page.getByRole("button", { name: "Pencil" }).click();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await expect.poll(() => previewState().then((state) => state.brush)).toBe("block");
  const tipSize = await page.evaluate(() => {
    const root = document.querySelector("gnumarus-shell")?.shadowRoot;
    const tip = root?.getElementById("canvasHost")?.querySelector('[data-testid="brush-preview"]') as HTMLElement | null;
    return { w: tip?.style.width ?? "", radius: tip?.style.borderRadius ?? "" };
  });
  expect(tipSize.w).not.toBe("");
  expect(tipSize.radius).toBe("50%");
  await selectTool(page, 'Line');
  await expect(page.locator('gnumarus-shell [data-testid="tool-options"]')).toContainText("Line width");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await expect.poll(() => previewState().then((state) => state.brush)).toBe("block");
  const state = await getViewState(page);
  const target = layerPixelToScreen(
    2,
    2,
    { left: box.x, top: box.y, width: box.width, height: box.height },
    64,
    64,
    { zoom: state.zoom, panX: 0, panY: 0, rotation: state.rotation, flipX: false, flipY: false },
    { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
  );
  await page.mouse.click(target.x, target.y);
  await page.mouse.move(target.x + 40, target.y);
  // The rubber line is a pixel raster now, not an SVG overlay.
  await expect.poll(() => shapePreviewVisible(page)).toBe(true);
  await page.keyboard.press("Escape");
  await expect.poll(() => shapePreviewVisible(page)).toBe(false);
  expect(await paintedPixelCount(page)).toBe(0);
});

test("pencil anti-aliasing smooths diagonal edges", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: {
        engine?: {
          loadProject(
            width: number,
            height: number,
            inputs: Array<{
              id: string;
              name: string;
              visible: boolean;
              opacity: number;
              width: number;
              height: number;
              buffer: Uint8ClampedArray;
              transform: { x: number; y: number; rotation: number; flipX: boolean; flipY: boolean; scaleX: number; scaleY: number; skewX: number; skewY: number; rotationX: number; rotationY: number };
            }>,
          ): void;
        };
      };
    };
    root.__gnumarus?.engine?.loadProject(64, 64, [
      {
        id: "tiny",
        name: "Tiny",
        visible: true,
        opacity: 1,
        width: 8,
        height: 8,
        buffer: new Uint8ClampedArray(8 * 8 * 4),
        transform: { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
      },
    ]);
  });
  await setPencil(page, "#ff0000");
  await page.getByRole("button", { name: "Pencil" }).click();
  await expect(page.locator('gnumarus-shell [data-testid="tool-options"]')).toContainText("Anti-aliasing");
  const flagOf = (): Promise<boolean> =>
    page.evaluate(() => {
      const root = window as unknown as { __gnumarus?: { engine?: { getPencilAntialias(): boolean } } };
      return root.__gnumarus?.engine?.getPencilAntialias() ?? true;
    });
  expect(await flagOf()).toBe(false);
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const dragDiagonal = async (): Promise<void> => {
    const state = await getViewState(page);
    const rect = { left: box.x, top: box.y, width: box.width, height: box.height };
    const view = { zoom: state.zoom, panX: 0, panY: 0, rotation: state.rotation, flipX: false, flipY: false };
    const layer = { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 };
    const start = layerPixelToScreen(1, 1, rect, 8, 8, view, layer);
    const end = layerPixelToScreen(6, 6, rect, 8, 8, view, layer);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 8 });
    await page.mouse.up();
  };
  await dragDiagonal();
  expect(await readPixel(page, 1, 1)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 2, 1)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  await page.keyboard.press("Delete");
  expect(await readPixel(page, 1, 1)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  await page.locator("gnumarus-shell input#pencilAntialias").check();
  await expect(page.locator("gnumarus-shell")).toContainText("Pencil anti-aliasing: on");
  expect(await flagOf()).toBe(true);
  await dragDiagonal();
  expect(await readPixel(page, 1, 1)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  const soft = await readPixel(page, 2, 1);
  expect(soft).not.toBeNull();
  expect(soft!.r).toBe(255);
  expect(soft!.a).toBeGreaterThan(0);
  expect(soft!.a).toBeLessThan(255);
  await page.keyboard.press("n");
  await expect(page.locator("gnumarus-shell")).toContainText("line");
});

test("Delete resets the current cell texture to zeros", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  const row = page.locator('gnumarus-shell [data-layer-id="layer0"]');
  await row.locator(".layer-name").dblclick();
  const renameInput = row.locator("input.layer-rename");
  await expect(renameInput).toBeVisible();
  await renameInput.press("Delete");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  await page.keyboard.press("Escape");
  await row.getByRole("button", { name: "Lock red channel" }).click();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.keyboard.press("Delete");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
});

test("curve tool draws cubic beziers with two control clicks", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: {
        engine?: {
          loadProject(
            width: number,
            height: number,
            inputs: Array<{
              id: string;
              name: string;
              visible: boolean;
              opacity: number;
              width: number;
              height: number;
              buffer: Uint8ClampedArray;
              transform: { x: number; y: number; rotation: number; flipX: boolean; flipY: boolean; scaleX: number; scaleY: number; skewX: number; skewY: number; rotationX: number; rotationY: number };
            }>,
          ): void;
        };
      };
    };
    root.__gnumarus?.engine?.loadProject(64, 64, [
      {
        id: "tiny",
        name: "Tiny",
        visible: true,
        opacity: 1,
        width: 8,
        height: 8,
        buffer: new Uint8ClampedArray(8 * 8 * 4),
        transform: { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
      },
    ]);
  });
  await setPencil(page, "#ff0000");
  await selectTool(page, 'Curve');
  await expect(page.locator('gnumarus-shell [data-testid="tool-options"]')).toContainText("Curve width");
  await expect(page.locator('gnumarus-shell [data-testid="tool-options"]')).toContainText("Anti-aliasing");
  await page.locator("gnumarus-shell input#curveWidth").fill("1");
  await expect(page.locator("gnumarus-shell")).toContainText("Curve width: 1");
  const phaseOf = (): Promise<string> =>
    page.evaluate(() => {
      const root = window as unknown as { __gnumarus?: { engine?: { getCurvePhase(): string } } };
      return root.__gnumarus?.engine?.getCurvePhase() ?? "missing";
    });
  const rasterVisible = (): Promise<boolean> =>
    page.evaluate(() => {
      const root = window as unknown as { __gnumarus?: { engine?: { isShapePreviewVisible(): boolean } } };
      return root.__gnumarus?.engine?.isShapePreviewVisible() ?? false;
    });
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const toScreen = async (lx: number, ly: number): Promise<{ x: number; y: number }> => {
    const state = await getViewState(page);
    return layerPixelToScreen(
      lx,
      ly,
      { left: box.x, top: box.y, width: box.width, height: box.height },
      8,
      8,
      { zoom: state.zoom, panX: 0, panY: 0, rotation: state.rotation, flipX: false, flipY: false },
      { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
    );
  };
  expect(await phaseOf()).toBe("idle");
  const start = await toScreen(1, 4);
  const end = await toScreen(6, 4);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 8 });
  await page.mouse.up();
  expect(await phaseOf()).toBe("awaitC1");
  expect(await rasterVisible()).toBe(true);
  const c1 = await toScreen(2, 1);
  await page.mouse.click(c1.x, c1.y);
  expect(await phaseOf()).toBe("awaitC2");
  const c2 = await toScreen(5, 6);
  await page.mouse.click(c2.x, c2.y);
  expect(await phaseOf()).toBe("idle");
  expect(await rasterVisible()).toBe(false);
  expect(await readPixel(page, 1, 4)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 6, 4)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  const apex = [await readPixel(page, 3, 3), await readPixel(page, 4, 3)];
  expect(apex.some((pixel) => pixel !== null && pixel.r === 255 && pixel.a === 255)).toBe(true);
  expect(await readPixel(page, 0, 0)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 1, 4)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  const restart = await toScreen(1, 1);
  const reend = await toScreen(6, 1);
  await page.mouse.move(restart.x, restart.y);
  await page.mouse.down();
  await page.mouse.move(reend.x, reend.y, { steps: 4 });
  await page.mouse.up();
  expect(await phaseOf()).toBe("awaitC1");
  await page.keyboard.press("Escape");
  expect(await phaseOf()).toBe("idle");
  expect(await readPixel(page, 1, 1)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  await page.keyboard.press("c");
  await expect(page.locator("gnumarus-shell")).toContainText("curve");
  await page.keyboard.press("b");
  await expect(page.locator("gnumarus-shell")).toContainText("pencil");
});

test("brush and line widths accept floats with AA-dependent rounding", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: {
        engine?: {
          loadProject(
            width: number,
            height: number,
            inputs: Array<{
              id: string;
              name: string;
              visible: boolean;
              opacity: number;
              width: number;
              height: number;
              buffer: Uint8ClampedArray;
              transform: { x: number; y: number; rotation: number; flipX: boolean; flipY: boolean; scaleX: number; scaleY: number; skewX: number; skewY: number; rotationX: number; rotationY: number };
            }>,
          ): void;
        };
      };
    };
    root.__gnumarus?.engine?.loadProject(64, 64, [
      {
        id: "tiny",
        name: "Tiny",
        visible: true,
        opacity: 1,
        width: 8,
        height: 8,
        buffer: new Uint8ClampedArray(8 * 8 * 4),
        transform: { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
      },
    ]);
  });
  await setPencil(page, "#ff0000");
  await page.getByRole("button", { name: "Pencil" }).click();
  await page.locator("gnumarus-shell select#brushShape").selectOption("square");
  const brushOf = (): Promise<number> =>
    page.evaluate(() => {
      const root = window as unknown as { __gnumarus?: { engine?: { getBrushSize(): number } } };
      return root.__gnumarus?.engine?.getBrushSize() ?? 0;
    });
  await page.locator("gnumarus-shell input#brushSize").fill("0");
  expect(await brushOf()).toBeCloseTo(0.1, 5);
  await expect(page.locator("gnumarus-shell")).toContainText("Brush size: 0.1");
  await page.locator("gnumarus-shell input#brushSize").fill("1.5");
  expect(await brushOf()).toBeCloseTo(1.5, 5);
  await expect(page.locator("gnumarus-shell")).toContainText("Brush size: 0.1 – 1.5");
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const clickAt = async (lx: number, ly: number): Promise<void> => {
    const state = await getViewState(page);
    const target = layerPixelToScreen(
      lx,
      ly,
      { left: box.x, top: box.y, width: box.width, height: box.height },
      8,
      8,
      { zoom: state.zoom, panX: 0, panY: 0, rotation: state.rotation, flipX: false, flipY: false },
      { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
    );
    await page.mouse.click(target.x, target.y);
  };
  await expect(page.locator("gnumarus-shell input#pencilAntialias")).not.toBeChecked();
  await clickAt(4, 4);
  expect(await readPixel(page, 5, 5)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  await page.keyboard.press("Delete");
  await page.locator("gnumarus-shell input#pencilAntialias").check();
  await clickAt(4, 4);
  const soft = await readPixel(page, 5, 5);
  expect(soft).not.toBeNull();
  expect(soft!.r).toBe(255);
  expect(soft!.a).toBeGreaterThan(0);
  expect(soft!.a).toBeLessThan(255);
  await selectTool(page, 'Line');
  const lineOf = (): Promise<number> =>
    page.evaluate(() => {
      const root = window as unknown as { __gnumarus?: { engine?: { getLineWidth(): number } } };
      return root.__gnumarus?.engine?.getLineWidth() ?? 0;
    });
  await page.locator("gnumarus-shell input#lineWidth").fill("1.5");
  expect(await lineOf()).toBeCloseTo(1.5, 5);
  await expect(page.locator("gnumarus-shell")).toContainText("Line width: 1 – 1.5");
});

test("hsv triangle and hue ring edit the color in any model", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const picker = await openPicker(page, "pencilColor");
  const wheel = picker.locator('[data-testid="hsv-wheel"]');
  const ring = picker.locator('[data-testid="hsv-ring"]');
  const triangle = picker.locator('[data-testid="hsv-triangle"]');
  await expect(wheel).toBeVisible();
  await picker.locator("select#modelSelect").selectOption("rgb");
  await expect(ring).toBeVisible();
  await expect(triangle).toBeVisible();
  await picker.locator("#hexInput").fill("#ff0000");
  await picker.locator("select#modelSelect").selectOption("hsv");
  await expect(picker.getByLabel("Hue", { exact: true })).toHaveValue("0.0");
  await expect(picker.getByLabel("Saturation", { exact: true })).toHaveValue("100.0");
  await expect(picker.getByLabel("Value", { exact: true })).toHaveValue("100.0");
  await picker.locator("select#modelSelect").selectOption("rgb");
  await picker.getByLabel("Alpha", { exact: true }).fill("128");
  await expect(page.locator("gnumarus-shell")).toContainText("#ff000080");
  await picker.locator("select#modelSelect").selectOption("hsv");
  const ringBox = await ring.boundingBox();
  if (ringBox === null) {
    throw new Error("hue ring has no bounding box");
  }
  await page.mouse.click(ringBox.x + ringBox.width * 0.9, ringBox.y + ringBox.height / 2);
  expect(Number(await picker.getByLabel("Hue", { exact: true }).inputValue())).toBeCloseTo(90, 0);
  await expect(picker.getByLabel("Saturation", { exact: true })).toHaveValue("100.0");
  await expect(picker.getByLabel("Value", { exact: true })).toHaveValue("100.0");
  await expect(picker.locator("#hexInput")).toHaveValue("#80ff0080");
  await picker.locator("select#modelSelect").selectOption("rgb");
  await picker.getByLabel("Alpha", { exact: true }).fill("255");
  await picker.locator("select#modelSelect").selectOption("hsv");
  await page.mouse.click(ringBox.x + ringBox.width / 2, ringBox.y + ringBox.height * 0.9);
  await expect(picker.getByLabel("Hue", { exact: true })).toHaveValue("180.0");
  await expect(picker.locator("#hexInput")).toHaveValue("#00ffff");
  const triBox = await triangle.boundingBox();
  if (triBox === null) {
    throw new Error("hsv triangle has no bounding box");
  }
  // The svg viewBox is 136x136 with an inscribed flat-top triangle:
  // white (9.11,34), hue (126.89,34), black apex (68,136).
  const triAt = (lx: number, ly: number): { x: number; y: number } => ({
    x: triBox.x + (lx / 136) * triBox.width,
    y: triBox.y + (ly / 136) * triBox.height,
  });
  let p = triAt(9.11, 34);
  await page.mouse.click(p.x, p.y);
  // Pure white has no defined hue, so the axis shows 0 (tracked hue stays 180).
  await expect(picker.getByLabel("Hue", { exact: true })).toHaveValue("0.0");
  await expect(picker.getByLabel("Saturation", { exact: true })).toHaveValue("0.0");
  await expect(picker.getByLabel("Value", { exact: true })).toHaveValue("100.0");
  await expect(picker.locator("#hexInput")).toHaveValue("#ffffff");
  p = triAt(126.89, 34);
  await page.mouse.click(p.x, p.y);
  await expect(picker.getByLabel("Saturation", { exact: true })).toHaveValue("100.0");
  await expect(picker.getByLabel("Value", { exact: true })).toHaveValue("100.0");
  await expect(picker.locator("#hexInput")).toHaveValue("#00ffff");
  p = triAt(68, 34);
  await page.mouse.click(p.x, p.y);
  expect(Number(await picker.getByLabel("Saturation", { exact: true }).inputValue())).toBeCloseTo(50, 0);
  await triangle.focus();
  await page.keyboard.down("Shift");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.up("Shift");
  expect(Number(await picker.getByLabel("Saturation", { exact: true }).inputValue())).toBeCloseTo(40, 0);
  p = triAt(68, 135.9);
  await page.mouse.click(p.x, p.y);
  await expect(picker.locator("#hexInput")).toHaveValue("#000000");
  await expect(picker.getByLabel("Value", { exact: true })).toHaveValue("0.0");
  await expect(picker.getByLabel("Hue", { exact: true })).toHaveValue("0.0");
  await triangle.focus();
  await page.keyboard.press("ArrowUp");
  await expect(picker.locator("#hexInput")).toHaveValue("#030303");
  expect(Number(await picker.getByLabel("Value", { exact: true }).inputValue())).toBeCloseTo(1, 0);
  await ring.focus();
  await page.keyboard.press("End");
  await expect(picker.getByLabel("Hue", { exact: true })).toHaveValue("0.0");
  // Saturation stayed zero from the black apex, so the hue flip keeps neutral gray.
  await expect(picker.locator("#hexInput")).toHaveValue("#030303");
});

test("normal blend accumulates translucent paint and eraser subtracts alpha", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: {
        engine?: {
          loadProject(
            width: number,
            height: number,
            inputs: Array<{
              id: string;
              name: string;
              visible: boolean;
              opacity: number;
              width: number;
              height: number;
              buffer: Uint8ClampedArray;
              transform: { x: number; y: number; rotation: number; flipX: boolean; flipY: boolean; scaleX: number; scaleY: number; skewX: number; skewY: number; rotationX: number; rotationY: number };
            }>,
          ): void;
        };
      };
    };
    root.__gnumarus?.engine?.loadProject(64, 64, [
      {
        id: "tiny",
        name: "Tiny",
        visible: true,
        opacity: 1,
        width: 8,
        height: 8,
        buffer: new Uint8ClampedArray(8 * 8 * 4),
        transform: { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
      },
    ]);
  });
  await setPencil(page, "#00000080");
  await page.getByRole("button", { name: "Pencil" }).click();
  await page.locator("gnumarus-shell input#brushSize").fill("1");
  await page.locator("gnumarus-shell select#blendMode").selectOption("normal");
  await expect(page.locator("gnumarus-shell")).toContainText("Blend mode: Normal");
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const clickAt = async (lx: number, ly: number): Promise<void> => {
    const state = await getViewState(page);
    const target = layerPixelToScreen(
      lx,
      ly,
      { left: box.x, top: box.y, width: box.width, height: box.height },
      8,
      8,
      { zoom: state.zoom, panX: 0, panY: 0, rotation: state.rotation, flipX: false, flipY: false },
      { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
    );
    await page.mouse.click(target.x, target.y);
  };
  await clickAt(4, 4);
  expect(await readPixel(page, 4, 4)).toEqual({ r: 0, g: 0, b: 0, a: 128 });
  await clickAt(4, 4);
  expect(await readPixel(page, 4, 4)).toEqual({ r: 0, g: 0, b: 0, a: 192 });
  await page.keyboard.press("Delete");
  expect(await readPixel(page, 4, 4)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  await page.locator("gnumarus-shell select#blendMode").selectOption("copy");
  await clickAt(4, 4);
  await clickAt(4, 4);
  expect(await readPixel(page, 4, 4)).toEqual({ r: 0, g: 0, b: 0, a: 128 });
  await page.locator("gnumarus-shell select#blendMode").selectOption("eraser");
  await expect(page.locator("gnumarus-shell")).toContainText("Blend mode: Eraser");
  await clickAt(4, 4);
  expect(await readPixel(page, 4, 4)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  await setPencil(page, "#00000020");
  await page.locator("gnumarus-shell select#blendMode").selectOption("copy");
  await clickAt(2, 2);
  expect(await readPixel(page, 2, 2)).toEqual({ r: 0, g: 0, b: 0, a: 32 });
  await page.locator("gnumarus-shell select#blendMode").selectOption("eraser");
  await clickAt(2, 2);
  expect(await readPixel(page, 2, 2)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  await page.getByRole("button", { name: "Bucket fill" }).click();
  await expect(page.locator('gnumarus-shell [data-testid="tool-options"]')).toContainText("Blend mode");
});

test("E toggles eraser and strokes can opt out of accumulation", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const blendOf = (): Promise<string> =>
    page.evaluate(() => {
      const root = window as unknown as { __gnumarus?: { engine?: { getBlendMode(): string } } };
      return root.__gnumarus?.engine?.getBlendMode() ?? "missing";
    });
  expect(await blendOf()).toBe("normal");
  await page.keyboard.press("e");
  expect(await blendOf()).toBe("eraser");
  await expect(page.locator("gnumarus-shell")).toContainText("Blend mode: Eraser");
  await page.keyboard.press("e");
  expect(await blendOf()).toBe("normal");
  await expect(page.locator("gnumarus-shell")).toContainText("Blend mode: Normal");
  await page.locator("gnumarus-shell select#blendMode").selectOption("copy");
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur?.();
  });
  await page.keyboard.press("e");
  expect(await blendOf()).toBe("eraser");
  await page.keyboard.press("e");
  expect(await blendOf()).toBe("copy");
  await expect(page.locator("gnumarus-shell")).toContainText("Blend mode: Copy");
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: {
        engine?: {
          loadProject(
            width: number,
            height: number,
            inputs: Array<{
              id: string;
              name: string;
              visible: boolean;
              opacity: number;
              width: number;
              height: number;
              buffer: Uint8ClampedArray;
              transform: { x: number; y: number; rotation: number; flipX: boolean; flipY: boolean; scaleX: number; scaleY: number; skewX: number; skewY: number; rotationX: number; rotationY: number };
            }>,
          ): void;
        };
      };
    };
    root.__gnumarus?.engine?.loadProject(64, 64, [
      {
        id: "tiny",
        name: "Tiny",
        visible: true,
        opacity: 1,
        width: 8,
        height: 8,
        buffer: new Uint8ClampedArray(8 * 8 * 4),
        transform: { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
      },
    ]);
  });
  await setPencil(page, "#00000080");
  await page.getByRole("button", { name: "Pencil" }).click();
  await page.locator("gnumarus-shell input#brushSize").fill("1");
  await page.locator("gnumarus-shell select#blendMode").selectOption("normal");
  await expect(page.locator('gnumarus-shell input#accumulate')).toBeChecked();
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const scrubBackAndForth = async (): Promise<void> => {
    const state = await getViewState(page);
    const rect = { left: box.x, top: box.y, width: box.width, height: box.height };
    const view = { zoom: state.zoom, panX: 0, panY: 0, rotation: state.rotation, flipX: false, flipY: false };
    const layer = { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 };
    const start = layerPixelToScreen(1, 4, rect, 8, 8, view, layer);
    const end = layerPixelToScreen(6, 4, rect, 8, 8, view, layer);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 1 });
    await page.mouse.move(start.x, start.y, { steps: 1 });
    await page.mouse.up();
  };
  await scrubBackAndForth();
  expect(await readPixel(page, 3, 4)).toEqual({ r: 0, g: 0, b: 0, a: 192 });
  await page.keyboard.press("Delete");
  expect(await readPixel(page, 3, 4)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  await page.locator("gnumarus-shell input#accumulate").uncheck();
  await expect(page.locator("gnumarus-shell")).toContainText("Accumulate: off");
  await scrubBackAndForth();
  expect(await readPixel(page, 3, 4)).toEqual({ r: 0, g: 0, b: 0, a: 128 });
});
