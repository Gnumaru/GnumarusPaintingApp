import { expect, test } from "@playwright/test";
import { canvasBox, canvasCenter, dragCanvas, loadBlankProject, mouseDot, paintCenter, paintedPixelCount, penDot, readPixel, selectTool, setPencil, stubPenPointerCapture, textureDims } from "./e2e-helpers";

test("brush size range paints max without pressure response @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Pencil" }).click();
  await expect(page.locator('gnumarus-shell [data-testid="tool-options"]')).toContainText("Min size");
  await page.locator("gnumarus-shell input#brushSize").fill("8");
  await page.locator("gnumarus-shell input#brushSizeMin").fill("2");
  await expect(page.locator("gnumarus-shell")).toContainText("Brush size: 2 – 8");
  // Without pressure response the max always paints, even for light pen touches.
  await expect(page.locator("gnumarus-shell select#pressureResponse")).toHaveValue("none");
  const center = await canvasCenter(page);
  await stubPenPointerCapture(page);
  await penDot(page, center.x, center.y, 0.1);
  const painted = await paintedPixelCount(page);
  await page.keyboard.press("Control+z");
  await page.locator("gnumarus-shell input#brushSizeMin").fill("8");
  await expect(page.locator("gnumarus-shell")).toContainText("Brush size: 8");
  await penDot(page, center.x, center.y, 0.1);
  expect(await paintedPixelCount(page)).toBe(painted);
});

test("brush min size clamps to the max @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Pencil" }).click();
  await page.locator("gnumarus-shell input#brushSize").fill("4");
  await page.locator("gnumarus-shell input#brushSizeMin").fill("99");
  expect(await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { getBrushSizeMin?(): number } } };
    return root.__gnumarus?.engine?.getBrushSizeMin?.() ?? -1;
  })).toBe(4);
  await expect(page.locator("gnumarus-shell")).toContainText("Brush size: 4");
});

test("pixel perfect snaps min and max size to 1 @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Pencil" }).click();
  const box = page.locator('gnumarus-shell input#pencilPixelPerfect');
  await expect(box).toBeEnabled();
  await page.locator("gnumarus-shell input#brushSize").fill("4");
  await page.locator("gnumarus-shell input#brushSizeMin").fill("2");
  await expect(box).toBeEnabled();
  await box.check();
  await expect(page.locator("gnumarus-shell input#brushSize")).toHaveValue("1");
  await expect(page.locator("gnumarus-shell input#brushSizeMin")).toHaveValue("1");
  await expect(page.locator("gnumarus-shell")).toContainText("Pencil pixel perfect: on");
  await box.uncheck();
  await expect(page.locator("gnumarus-shell")).toContainText("Pencil pixel perfect: off");
});

test("rectangle tool paints an outline and undoes @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.keyboard.press("d");
  await expect(page.locator("gnumarus-shell")).toContainText("rectangle");
  const box = await canvasBox(page);
  const cx = box.width / 2;
  const cy = box.height / 2;
  await dragCanvas(page, cx - 20, cy - 10, cx + 20, cy + 10);
  expect(await paintedPixelCount(page)).toBeGreaterThan(0);
  // Outline leaves the interior empty (transparent black).
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  await page.keyboard.press("Control+z");
  expect(await paintedPixelCount(page)).toBe(0);
});

test("rectangle tool fills the interior when enabled @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await page.keyboard.press("d");
  await page.locator("gnumarus-shell input#shapeFilled").click();
  const box = await canvasBox(page);
  const cx = box.width / 2;
  const cy = box.height / 2;
  await dragCanvas(page, cx - 20, cy - 10, cx + 20, cy + 10);
  expect(await paintedPixelCount(page)).toBeGreaterThan(0);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  await page.keyboard.press("Control+z");
  expect(await paintedPixelCount(page)).toBe(0);
});

test("ellipse tool paints an outline and undoes @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.keyboard.press("h");
  await expect(page.locator("gnumarus-shell")).toContainText("ellipse");
  const box = await canvasBox(page);
  const cx = box.width / 2;
  const cy = box.height / 2;
  await dragCanvas(page, cx - 20, cy - 12, cx + 20, cy + 12);
  expect(await paintedPixelCount(page)).toBeGreaterThan(0);
  await page.keyboard.press("Control+z");
  expect(await paintedPixelCount(page)).toBe(0);
});

test("polygon tool commits on Enter and cancels on Escape @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.keyboard.press("j");
  await expect(page.locator("gnumarus-shell")).toContainText("polygon");
  const box = await canvasBox(page);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.click(cx - 15, cy - 10);
  await page.mouse.click(cx + 15, cy - 10);
  await page.mouse.click(cx, cy + 12);
  await page.keyboard.press("Escape");
  expect(await paintedPixelCount(page)).toBe(0);
  await page.mouse.click(cx - 15, cy - 10);
  await page.mouse.click(cx + 15, cy - 10);
  await page.mouse.click(cx, cy + 12);
  await page.keyboard.press("Enter");
  expect(await paintedPixelCount(page)).toBeGreaterThan(0);
  await page.keyboard.press("Control+z");
  expect(await paintedPixelCount(page)).toBe(0);
});

test("gradient tool fades paint to transparent and undoes @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await setPencil(page, "#ff0000");
  await page.keyboard.press("k");
  await expect(page.locator("gnumarus-shell")).toContainText("gradient");
  const box = await canvasBox(page);
  await dragCanvas(page, 0, box.height / 2, box.width, box.height / 2);
  const painted = await paintedPixelCount(page);
  expect(painted).toBeGreaterThan(0);
  // Axis runs left→right past both canvas edges, so the left corner is
  // always more opaque than the right corner regardless of pan/zoom.
  const left = await readPixel(page, 0, 32);
  const right = await readPixel(page, 63, 32);
  expect(left === null || right === null).toBe(false);
  expect((left as { a: number }).a).toBeGreaterThan((right as { a: number }).a);
  await page.keyboard.press("Control+z");
  expect(await paintedPixelCount(page)).toBe(0);
});

test("shading tool lightens pixels and undoes @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await setPencil(page, "#808080");
  const box = await canvasBox(page);
  await mouseDot(page, box.width / 2, box.height / 2);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 128, g: 128, b: 128, a: 255 });
  await page.keyboard.press("s");
  await expect(page.locator("gnumarus-shell")).toContainText("shading");
  await page.locator("gnumarus-shell input#shadeAmount").fill("100");
  await mouseDot(page, box.width / 2, box.height / 2);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 255, b: 255, a: 255 });
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 128, g: 128, b: 128, a: 255 });
});

test("blur tool softens a hard dot @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await setPencil(page, "#000000");
  const box = await canvasBox(page);
  await mouseDot(page, box.width / 2, box.height / 2);
  await page.keyboard.press("i");
  await expect(page.locator("gnumarus-shell")).toContainText("blur");
  await mouseDot(page, box.width / 2, box.height / 2);
  const center = await readPixel(page, 32, 32);
  expect(center === null || center.a < 255).toBe(true);
  expect(await paintedPixelCount(page)).toBeGreaterThan(1);
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
});

test("clone tool stamps from the alt-clicked source @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await setPencil(page, "#ff0000");
  const box = await canvasBox(page);
  const cx = box.width / 2;
  const cy = box.height / 2;
  await mouseDot(page, cx - 10, cy);
  // Locate the painted dot in layer space (screen mapping depends on zoom/pan).
  const source = await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { readPixel(x: number, y: number): unknown } } };
    const engine = root.__gnumarus?.engine;
    if (engine === undefined) {
      return null;
    }
    for (let y = 0; y < 64; y += 1) {
      for (let x = 0; x < 64; x += 1) {
        const pixel = engine.readPixel(x, y) as { r: number; g: number; b: number; a: number } | null;
        if (pixel !== null && pixel.r === 255 && pixel.g === 0 && pixel.b === 0 && pixel.a === 255) {
          return { x, y };
        }
      }
    }
    return null;
  });
  expect(source).not.toBeNull();
  const zoom = await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { getViewState(): { zoom: number } } } };
    return root.__gnumarus?.engine?.getViewState().zoom ?? 1;
  });
  await page.keyboard.press("a");
  await expect(page.locator("gnumarus-shell")).toContainText("clone");
  await page.keyboard.down("Alt");
  await page.mouse.click(box.x + cx - 10, box.y + cy);
  await page.keyboard.up("Alt");
  await expect(page.locator('gnumarus-shell [data-testid="clone-source"]')).toBeVisible();
  // Stamp 20 layer pixels to the right of the source dot.
  await page.mouse.click(box.x + cx - 10 + 20 * zoom, box.y + cy);
  const target = await page.evaluate(([tx, ty]: number[]) => {
    const root = window as unknown as { __gnumarus?: { engine?: { readPixel(x: number, y: number): unknown } } };
    return (root.__gnumarus?.engine?.readPixel(tx, ty) ?? null) as unknown as {
      r: number;
      g: number;
      b: number;
      a: number;
    } | null;
  }, [(source as { x: number }).x + 20, (source as { y: number }).y]);
  expect(target).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  await page.keyboard.press("Control+z");
  const undone = await page.evaluate(([tx, ty]: number[]) => {
    const root = window as unknown as { __gnumarus?: { engine?: { readPixel(x: number, y: number): unknown } } };
    return (root.__gnumarus?.engine?.readPixel(tx, ty) ?? null) as unknown;
  }, [(source as { x: number }).x + 20, (source as { y: number }).y]);
  expect(undone).not.toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("recolor tool shifts similar hues toward the paint color @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await setPencil(page, "#0000ff");
  const box = await canvasBox(page);
  await mouseDot(page, box.width / 2, box.height / 2);
  await setPencil(page, "#ff0000");
  await page.keyboard.press("q");
  await expect(page.locator("gnumarus-shell")).toContainText("recolor");
  await page.locator("gnumarus-shell input#recolorTolerance").fill("100");
  await mouseDot(page, box.width / 2, box.height / 2);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 255, a: 255 });
});

test("jumble tool displaces pixels @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await setPencil(page, "#ff0000");
  const box = await canvasBox(page);
  const cx = box.width / 2;
  const cy = box.height / 2;
  await mouseDot(page, cx - 2, cy);
  await setPencil(page, "#0000ff");
  await mouseDot(page, cx + 2, cy);
  const before = await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { readPixel(x: number, y: number): unknown } } };
    const engine = root.__gnumarus?.engine;
    if (engine === undefined) {
      return [];
    }
    const out: unknown[] = [];
    for (let y = 28; y <= 36; y += 1) {
      for (let x = 28; x <= 36; x += 1) {
        out.push(engine.readPixel(x, y));
      }
    }
    return out;
  });
  await selectTool(page, "Jumble");
  await expect(page.locator("gnumarus-shell")).toContainText("jumble");
  await page.mouse.move(box.x + cx - 4, box.y + cy);
  await page.mouse.down();
  await page.mouse.move(box.x + cx + 4, box.y + cy, { steps: 4 });
  await page.mouse.up();
  const after = await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { readPixel(x: number, y: number): unknown } } };
    const engine = root.__gnumarus?.engine;
    if (engine === undefined) {
      return [];
    }
    const out: unknown[] = [];
    for (let y = 28; y <= 36; y += 1) {
      for (let x = 28; x <= 36; x += 1) {
        out.push(engine.readPixel(x, y));
      }
    }
    return out;
  });
  expect(JSON.stringify(after)).not.toBe(JSON.stringify(before));
  await page.keyboard.press("Control+z");
  const undone = await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { readPixel(x: number, y: number): unknown } } };
    const engine = root.__gnumarus?.engine;
    if (engine === undefined) {
      return [];
    }
    const out: unknown[] = [];
    for (let y = 28; y <= 36; y += 1) {
      for (let x = 28; x <= 36; x += 1) {
        out.push(engine.readPixel(x, y));
      }
    }
    return out;
  });
  expect(JSON.stringify(undone)).toBe(JSON.stringify(before));
});

test("crop tool crops the cell texture to the dragged box @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await setPencil(page, "#ff0000");
  await paintCenter(page);
  expect(await textureDims(page)).toEqual({ width: 64, height: 64 });
  await selectTool(page, "Crop");
  await expect(page.locator("gnumarus-shell")).toContainText("crop");
  const box = await canvasBox(page);
  // Drag a small centered box (well inside the layer in any zoom/pan).
  await dragCanvas(page, (box.width * 3) / 8, (box.height * 3) / 8, (box.width * 5) / 8, (box.height * 5) / 8);
  const dims = await textureDims(page);
  expect(dims.width).toBeLessThan(64);
  expect(dims.height).toBeLessThan(64);
  expect(await page.locator("gnumarus-shell")).toContainText(`Texture cropped to ${dims.width} x ${dims.height}`);
  await page.keyboard.press("Control+z");
  expect(await textureDims(page)).toEqual({ width: 64, height: 64 });
});

test("crop tool refuses an empty cell @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await selectTool(page, "Crop");
  const box = await canvasBox(page);
  await dragCanvas(page, box.width / 4, box.height / 4, (box.width * 3) / 4, (box.height * 3) / 4);
  await expect(page.locator("gnumarus-shell")).toContainText("no texture");
  expect(await textureDims(page)).toEqual({ width: -1, height: -1 });
});
