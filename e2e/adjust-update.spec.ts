import { expect, test } from "@playwright/test";
import { layerPixelToScreen } from "../src/canvas/GnumarusViewportMath";
import { commitFloatingSelection, countRedIn, dragLayerBox, dragRect, fillHsAndWait, getFloatingSelection, getViewState, layerSize, loadBlankProject, paintLayerRect, readFloatingPixel, readPixel, selectTool, setMaskOption, setBrushColor } from "./e2e-helpers";

test("selection feather softens the merged edge @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintLayerRect(page, "#ff0000", 24, 24, 39, 39);
  expect(await countRedIn(page, 20, 20, 44, 44)).toBe(256);
  await page.keyboard.press("r");
  await dragLayerBox(page, 24, 24, 39, 39);
  await page.keyboard.press("v");
  await setMaskOption(page, "featherRadius", "2");
  await commitFloatingSelection(page);
  const partial = await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { readPixel(x: number, y: number): { a: number } | null } } };
    const engine = root.__gnumarus?.engine;
    if (engine === undefined) {
      return -1;
    }
    let count = 0;
    for (let y = 20; y < 44; y += 1) {
      for (let x = 20; x < 44; x += 1) {
        const pixel = engine.readPixel(x, y);
        if (pixel !== null && pixel.a > 0 && pixel.a < 255) {
          count += 1;
        }
      }
    }
    return count;
  });
  expect(partial).toBeGreaterThan(0);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  await page.keyboard.press("Control+z");
  expect(await countRedIn(page, 20, 20, 44, 44)).toBe(256 - 256);
});

test("selection grow expands and shrink contracts the merged area @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintLayerRect(page, "#ff0000", 24, 24, 39, 39);
  await page.keyboard.press("r");
  await dragLayerBox(page, 26, 26, 37, 37);
  await page.keyboard.press("v");
  await setMaskOption(page, "growShrinkPx", "4");
  await page.locator("gnumarus-shell [data-testid=\"selection-grow\"]").click();
  await commitFloatingSelection(page);
  // Grown by 2px each side: the full 16x16 square is red again.
  expect(await countRedIn(page, 20, 20, 44, 44)).toBe(256);
  await page.keyboard.press("Control+z");
  // Undo restores the cut hole: only the border ring stays red.
  expect(await countRedIn(page, 20, 20, 44, 44)).toBe(256 - 144);
  // Repaint to a full square: the next cut must hold solid reds.
  await paintLayerRect(page, "#ff0000", 24, 24, 39, 39);
  expect(await countRedIn(page, 20, 20, 44, 44)).toBe(256);
  await page.keyboard.press("r");
  await dragLayerBox(page, 24, 24, 39, 39);
  await page.keyboard.press("v");
  await setMaskOption(page, "growShrinkPx", "4");
  await page.locator("gnumarus-shell [data-testid=\"selection-shrink\"]").click();
  await commitFloatingSelection(page);
  // Shrunk by 4px each side: only the center 8x8 stays red.
  expect(await countRedIn(page, 20, 20, 44, 44)).toBe(64);
  await page.keyboard.press("Control+z");
  expect(await countRedIn(page, 20, 20, 44, 44)).toBe(0);
});

test("adjust invert flips cell colors and undoes @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintLayerRect(page, "#ff0000", 24, 24, 39, 39);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { runAction(id: string): boolean } } };
    root.__gnumarus?.shell?.runAction("adjust-invert");
  });
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 255, b: 255, a: 255 });
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("adjust colors dialog applies brightness and undoes @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintLayerRect(page, "#ff0000", 24, 24, 39, 39);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { runAction(id: string): boolean } } };
    root.__gnumarus?.shell?.runAction("adjust-colors");
  });
  const dialog = page.locator('gnumarus-shell dialog#adjustColorsDialog[open]');
  await expect(dialog).toBeVisible();
  await dialog.locator("#adjustBrightness").fill("100");
  await dialog.getByRole("button", { name: "OK" }).click();
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 255, b: 255, a: 255 });
  await expect(page.locator("gnumarus-shell")).toContainText("Colors adjusted");
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("adjust brightness/contrast previews on release and cancels to revert @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintLayerRect(page, "#ff0000", 24, 24, 39, 39);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { runAction(id: string): boolean } } };
    root.__gnumarus?.shell?.runAction("adjust-brightness-contrast");
  });
  const dialog = page.locator('gnumarus-shell [data-testid="bc-window"]');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("#bcBrightness")).toHaveValue("0");
  await expect(dialog.locator("#bcContrast")).toHaveValue("0");
  await dialog.locator("#bcBrightness").fill("100");
  await dialog.locator("#bcBrightness").evaluate((el: HTMLElement) => el.blur());
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 255, b: 255, a: 255 });
  await dialog.getByRole("button", { name: "Cancel" }).click();
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("adjust brightness/contrast window drags and header-close reverts @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintLayerRect(page, "#ff0000", 24, 24, 39, 39);
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { runAction(id: string): boolean } } };
    root.__gnumarus?.shell?.runAction("adjust-brightness-contrast");
  });
  const dialog = page.locator('gnumarus-shell [data-testid="bc-window"]');
  await expect(dialog).toBeVisible();
  await dialog.locator("#bcBrightness").fill("100");
  await dialog.locator("#bcBrightness").evaluate((el: HTMLElement) => el.blur());
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 255, b: 255, a: 255 });
  const before = await dialog.boundingBox();
  if (before === null) {
    throw new Error("adjust window has no bounding box");
  }
  const header = dialog.locator(".preview-header");
  const headerBox = await header.boundingBox();
  if (headerBox === null) {
    throw new Error("adjust window header has no bounding box");
  }
  // Both sliders share the same x and width (fixed-width name labels).
  const brightnessBox = await dialog.locator("#bcBrightness").boundingBox();
  const contrastBox = await dialog.locator("#bcContrast").boundingBox();
  if (brightnessBox === null || contrastBox === null) {
    throw new Error("adjust sliders have no bounding box");
  }
  expect(contrastBox.x).toBeCloseTo(brightnessBox.x, 0);
  expect(contrastBox.width).toBeCloseTo(brightnessBox.width, 0);
  await page.mouse.move(headerBox.x + headerBox.width / 2, headerBox.y + 6);
  await page.mouse.down();
  await page.mouse.move(headerBox.x + headerBox.width / 2 + 60, headerBox.y + 6 + 40, { steps: 5 });
  await page.mouse.up();
  const after = await dialog.boundingBox();
  if (after === null) {
    throw new Error("adjust window has no bounding box after drag");
  }
  expect(after.x).toBeGreaterThan(before.x + 40);
  expect(after.y).toBeGreaterThan(before.y + 20);
  // Dragging never commits: the preview is intact and the × button still reverts.
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 255, b: 255, a: 255 });
  await dialog.locator('.preview-header button[aria-label="Close"]').click();
  await expect(dialog).toBeHidden();
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("adjust brightness/contrast manual inputs preview and revert @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintLayerRect(page, "#ff0000", 24, 24, 39, 39);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { runAction(id: string): boolean } } };
    root.__gnumarus?.shell?.runAction("adjust-brightness-contrast");
  });
  const dialog = page.locator('gnumarus-shell [data-testid="bc-window"]');
  await expect(dialog).toBeVisible();
  await dialog.locator("#bcBrightnessNum").fill("100");
  await dialog.locator("#bcBrightnessNum").evaluate((el: HTMLElement) => el.blur());
  await expect(dialog.locator("#bcBrightness")).toHaveValue("100");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 255, b: 255, a: 255 });
  await dialog.getByRole("button", { name: "Cancel" }).click();
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("adjust brightness/contrast from Edit menu commits, applies and undoes @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintLayerRect(page, "#ff0000", 24, 24, 39, 39);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Adjust brightness/contrast" }).click();
  const dialog = page.locator('gnumarus-shell [data-testid="bc-window"]');
  await expect(dialog).toBeVisible();
  await dialog.locator("#bcBrightness").fill("100");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 255, b: 255, a: 255 });
  await dialog.getByRole("button", { name: "Apply" }).click();
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("#bcBrightness")).toHaveValue("0");
  await expect(dialog.locator("#bcContrast")).toHaveValue("0");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 255, b: 255, a: 255 });
  await dialog.getByRole("button", { name: "OK" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator("gnumarus-shell")).toContainText("Colors adjusted");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 255, b: 255, a: 255 });
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("painting on canvas with adjust window open bakes the adjustment @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintLayerRect(page, "#ff0000", 24, 24, 39, 39);
  await page.getByRole("button", { name: "Brush", exact: true }).click();
  await setBrushColor(page, "#0000ff");
  expect(await readPixel(page, 960, 540)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { runAction(id: string): boolean } } };
    root.__gnumarus?.shell?.runAction("adjust-brightness-contrast");
  });
  const dialog = page.locator('gnumarus-shell [data-testid="bc-window"]');
  await expect(dialog).toBeVisible();
  await dialog.locator("#bcBrightness").fill("100");
  await dialog.locator("#bcBrightness").evaluate((el: HTMLElement) => el.blur());
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 255, b: 255, a: 255 });
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const size = await layerSize(page);
  const state = await getViewState(page);
  const view = { zoom: state.zoom, panX: 0, panY: 0, rotation: state.rotation, flipX: false, flipY: false };
  const layer = { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 };
  const rect = { left: box.x, top: box.y, width: box.width, height: box.height };
  const at = (lx: number, ly: number): { x: number; y: number } =>
    layerPixelToScreen(lx, ly, rect, size.width, size.height, view, layer);
  const p0 = at(960, 540);
  const p1 = at(966, 546);
  await page.mouse.move(p0.x, p0.y);
  await page.mouse.down();
  await page.mouse.move(p1.x, p1.y, { steps: 3 });
  await page.mouse.up();
  // Starting canvas work bakes the preview instead of losing it.
  await expect(dialog).toBeHidden();
  expect(await readPixel(page, 960, 540)).toEqual({ r: 0, g: 0, b: 255, a: 255 });
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 255, b: 255, a: 255 });
  await page.keyboard.press("Control+z");
  // The stroke is undone; the baked preview stays (transparent pixels keep
  // the previewed RGB with alpha 0, like the existing adjust path).
  expect(await readPixel(page, 960, 540)).toEqual({ r: 255, g: 255, b: 255, a: 0 });
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 255, b: 255, a: 255 });
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("adjust hue/saturation previews on release and cancels to revert @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintLayerRect(page, "#ff0000", 24, 24, 39, 39);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { runAction(id: string): boolean } } };
    root.__gnumarus?.shell?.runAction("adjust-hue-saturation");
  });
  const dialog = page.locator('gnumarus-shell [data-testid="hs-window"]');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("#hsHue")).toHaveValue("0");
  await expect(dialog.locator("#hsSaturation")).toHaveValue("0");
  await expect(dialog.locator("#hsLightness")).toHaveValue("0");
  await expect(dialog.locator("#hsAlpha")).toHaveValue("0");
  await expect(dialog.locator("#hsModel")).toHaveValue("hsl");
  await expect(dialog.locator("#hsMode")).toHaveValue("additive");
  await fillHsAndWait(dialog, "#hsLightness", "100");
  await expect.poll(() => readPixel(page, 32, 32)).toEqual({ r: 255, g: 255, b: 255, a: 255 });
  await dialog.getByRole("button", { name: "Cancel" }).click();
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("adjust hue/saturation from Edit menu commits, applies and undoes @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintLayerRect(page, "#ff0000", 24, 24, 39, 39);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Adjust hue/saturation" }).click();
  const dialog = page.locator('gnumarus-shell [data-testid="hs-window"]');
  await expect(dialog).toBeVisible();
  await fillHsAndWait(dialog, "#hsHue", "60");
  await expect.poll(() => readPixel(page, 32, 32)).toEqual({ r: 255, g: 255, b: 0, a: 255 });
  await dialog.getByRole("button", { name: "Apply" }).click();
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("#hsHue")).toHaveValue("0");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 255, b: 0, a: 255 });
  await dialog.getByRole("button", { name: "OK" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator("gnumarus-shell")).toContainText("Colors adjusted");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 255, b: 0, a: 255 });
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("hue slider spans -180 to 180 @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintLayerRect(page, "#ff0000", 24, 24, 39, 39);
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { runAction(id: string): boolean } } };
    root.__gnumarus?.shell?.runAction("adjust-hue-saturation");
  });
  const dialog = page.locator('gnumarus-shell [data-testid="hs-window"]');
  await expect(dialog).toBeVisible();
  await fillHsAndWait(dialog, "#hsHue", "180");
  await expect.poll(() => readPixel(page, 32, 32)).toEqual({ r: 0, g: 255, b: 255, a: 255 });
  await fillHsAndWait(dialog, "#hsHueNum", "-180");
  await expect.poll(() => readPixel(page, 32, 32)).toEqual({ r: 0, g: 255, b: 255, a: 255 });
  await dialog.getByRole("button", { name: "Cancel" }).click();
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("escape with focus outside the adjust window reverts @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintLayerRect(page, "#ff0000", 24, 24, 39, 39);
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { runAction(id: string): boolean } } };
    root.__gnumarus?.shell?.runAction("adjust-brightness-contrast");
  });
  const dialog = page.locator('gnumarus-shell [data-testid="bc-window"]');
  await expect(dialog).toBeVisible();
  await dialog.locator("#bcBrightness").fill("100");
  await dialog.locator("#bcBrightness").evaluate((el: HTMLElement) => el.blur());
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 255, b: 255, a: 255 });
  // Focusing other chrome does not commit: the preview stands.
  await page.getByRole("button", { name: "Brush", exact: true }).click();
  await expect(dialog).toBeVisible();
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 255, b: 255, a: 255 });
  // Global Esc reverts even though the window itself is not focused.
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("adjust brightness/contrast applies to the floating selection only @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintLayerRect(page, "#ff0000", 24, 24, 39, 39);
  await selectTool(page, "Rectangular selection");
  await dragRect(page, 28, 28, 35, 35);
  expect(await getFloatingSelection(page)).toEqual({ x: 28, y: 28, width: 8, height: 8, selected: 64 });
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { runAction(id: string): boolean } } };
    return root.__gnumarus?.shell?.runAction("adjust-brightness-contrast");
  });
  const dialog = page.locator('gnumarus-shell [data-testid="bc-window"]');
  await expect(dialog).toBeVisible();
  await dialog.locator("#bcBrightness").fill("100");
  await dialog.locator("#bcBrightness").evaluate((el: HTMLElement) => el.blur());
  // The cell texture is untouched: hole stays transparent, ring stays red.
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  expect(await readPixel(page, 26, 26)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  await dialog.getByRole("button", { name: "OK" }).click();
  await expect(dialog).toBeHidden();
  // Nothing merged yet: the floating selection is still active.
  expect(await getFloatingSelection(page)).not.toBeNull();
  await selectTool(page, "Destructive selection transform");
  await page.getByRole("button", { name: "Commit selection" }).click();
  expect(await getFloatingSelection(page)).toBeNull();
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 255, b: 255, a: 255 });
  expect(await readPixel(page, 26, 26)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  expect(await readPixel(page, 26, 26)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("adjust hue/saturation applies to the floating selection, cancel reverts @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintLayerRect(page, "#ff0000", 24, 24, 39, 39);
  await selectTool(page, "Rectangular selection");
  await dragRect(page, 28, 28, 35, 35);
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { runAction(id: string): boolean } } };
    root.__gnumarus?.shell?.runAction("adjust-hue-saturation");
  });
  const dialog = page.locator('gnumarus-shell [data-testid="hs-window"]');
  await expect(dialog).toBeVisible();
  await fillHsAndWait(dialog, "#hsHue", "60");
  // The cell texture is untouched while the preview lands on the floating content.
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  expect(await readPixel(page, 26, 26)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readFloatingPixel(page, 4, 4)).toEqual({ r: 255, g: 255, b: 0, a: 255 });
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
  expect(await getFloatingSelection(page)).not.toBeNull();
  await selectTool(page, "Destructive selection transform");
  await page.getByRole("button", { name: "Commit selection" }).click();
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 26, 26)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("hue/saturation OK on a floating selection merges adjusted colors @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintLayerRect(page, "#ff0000", 24, 24, 39, 39);
  await selectTool(page, "Rectangular selection");
  await dragRect(page, 28, 28, 35, 35);
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { runAction(id: string): boolean } } };
    root.__gnumarus?.shell?.runAction("adjust-hue-saturation");
  });
  const dialog = page.locator('gnumarus-shell [data-testid="hs-window"]');
  await expect(dialog).toBeVisible();
  await fillHsAndWait(dialog, "#hsHue", "120");
  await expect(dialog.locator("#hsHue")).toHaveValue("120");
  await dialog.getByRole("button", { name: "Apply" }).click();
  await expect(dialog.locator("#hsHue")).toHaveValue("0");
  await dialog.getByRole("button", { name: "OK" }).click();
  await expect(dialog).toBeHidden();
  await selectTool(page, "Destructive selection transform");
  await page.getByRole("button", { name: "Commit selection" }).click();
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 255, b: 0, a: 255 });
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
});

test("destructive transform merge grows the texture to fit @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintLayerRect(page, "#ff0000", 0, 0, 63, 63);
  await selectTool(page, "Rectangular selection");
  await dragRect(page, 8, 8, 55, 55);
  expect(await getFloatingSelection(page)).toEqual({ x: 8, y: 8, width: 48, height: 48, selected: 2304 });
  // Rotate the floating square exactly 45 degrees about its center.
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: {
        engine?: { floating: { rotation: number } | null };
      };
    };
    const engine = root.__gnumarus?.engine as { floating: { rotation: number } | null } | undefined;
    if (engine === undefined || engine.floating === null) {
      throw new Error("no floating selection");
    }
    engine.floating.rotation = Math.PI / 4;
  });
  await selectTool(page, "Destructive selection transform");
  // A no-op body drag (off the center handle, which would reset the
  // transform on tap) materializes the pending cut without moving it.
  await dragLayerBox(page, 40, 32, 40, 32);
  await page.getByRole("button", { name: "Commit selection" }).click();
  // A 48x48 square rotated 45 degrees spans ~67.9px: the texture grows
  // from 64x64 to 68x68 instead of clipping the corners.
  expect(await layerSize(page)).toEqual({ width: 68, height: 68 });
  expect(await getFloatingSelection(page)).toBeNull();
  expect(await readPixel(page, 34, 34)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 0, 0)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  // One undo restores the pre-merge texture and its size.
  await page.keyboard.press("Control+z");
  expect(await layerSize(page)).toEqual({ width: 64, height: 64 });
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  expect(await readPixel(page, 4, 4)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("adjust hue/saturation proportional mode and manual inputs @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintLayerRect(page, "#ff0000", 24, 24, 39, 39);
  await paintLayerRect(page, "#000000", 40, 24, 55, 39);
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { runAction(id: string): boolean } } };
    root.__gnumarus?.shell?.runAction("adjust-hue-saturation");
  });
  const dialog = page.locator('gnumarus-shell [data-testid="hs-window"]');
  await expect(dialog).toBeVisible();
  await dialog.locator("#hsMode").selectOption("proportional");
  // Proportional hue on red (h=0) is a no-op: zeros stay zero.
  await fillHsAndWait(dialog, "#hsHueNum", "100");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  // Manual lightness input to +100 doubles L=50% to white.
  await fillHsAndWait(dialog, "#hsLightnessNum", "100");
  await expect.poll(() => readPixel(page, 32, 32)).toEqual({ r: 255, g: 255, b: 255, a: 255 });
  // Black never moves in proportional mode.
  expect(await readPixel(page, 47, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  // Switching the model keeps the dialog alive and still previews.
  await dialog.locator("#hsModel").selectOption("okhsl");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("hue/saturation spinner shows while computing @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintLayerRect(page, "#ff0000", 24, 24, 39, 39);
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { runAction(id: string): boolean } } };
    root.__gnumarus?.shell?.runAction("adjust-hue-saturation");
  });
  const dialog = page.locator('gnumarus-shell [data-testid="hs-window"]');
  await expect(dialog).toBeVisible();
  // The OKHSL path is slow enough (~0.5s on a full canvas) that the
  // spinner is guaranteed to be observable while it computes.
  await dialog.locator("#hsModel").selectOption("okhsl");
  const becameVisible = expect(dialog.locator('[data-testid="hs-spinner"]')).toBeVisible();
  await dialog.locator("#hsLightness").fill("100");
  await dialog.locator("#hsLightness").evaluate((el: HTMLElement) => el.blur());
  await becameVisible;
  await expect(dialog.locator('[data-testid="hs-spinner"]')).toBeHidden();
  await expect.poll(() => readPixel(page, 32, 32)).toEqual({ r: 255, g: 255, b: 255, a: 255 });
  await dialog.getByRole("button", { name: "Cancel" }).click();
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("update banner appears in the menubar when the deploy is newer @recent", async ({ page }) => {
  // Mock the no-store index.html poll with a foreign entry script: the
  // running dev bundle (/src/main.ts) no longer matches, so the app is
  // outdated. Navigation requests still hit the real dev server.
  await page.route(
    (url) => url.pathname === "/",
    async (route) => {
      if (route.request().isNavigationRequest()) {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: '<!doctype html><html><head><script type="module" src="/assets/index-outdatedtest.js"></script></head><body></body></html>',
      });
    },
  );
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { shell?: { forceUpdateCheck(): Promise<string> } };
    };
    return root.__gnumarus?.shell?.forceUpdateCheck();
  });
  const banner = page.locator('gnumarus-shell .menubar [data-testid="update-banner"]');
  await expect(banner).toBeVisible();
  await expect(banner).toContainText("Update available");
});

test("no update banner when the deploy matches the running bundle @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const runningSrc = await page.evaluate(() => {
    const el = document.querySelector("script[type=module][src]");
    return el?.getAttribute("src") ?? "";
  });
  expect(runningSrc).not.toBe("");
  await page.route(
    (url) => url.pathname === "/",
    async (route) => {
      if (route.request().isNavigationRequest()) {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: `<!doctype html><html><head><script type="module" src="${runningSrc}"></script></head><body></body></html>`,
      });
    },
  );
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { shell?: { forceUpdateCheck(): Promise<string> } };
    };
    return root.__gnumarus?.shell?.forceUpdateCheck();
  });
  await expect(page.locator('gnumarus-shell [data-testid="update-banner"]')).toHaveCount(0);
});
