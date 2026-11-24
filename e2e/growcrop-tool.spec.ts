import { expect, test } from "@playwright/test";
import { countRedIn, layerScreenTarget, loadBlankProject, paintLayerRect, readPixel, selectTool } from "./e2e-helpers";

async function activeTool(page: import("@playwright/test").Page): Promise<unknown> {
  return page.evaluate(() => (document.querySelector("gnumarus-shell") as unknown as { tool: unknown }).tool);
}

async function dragImage(page: import("@playwright/test").Page, x0: number, y0: number, x1: number, y1: number): Promise<void> {
  const a = await layerScreenTarget(page, x0, y0);
  const b = await layerScreenTarget(page, x1, y1);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 8 });
  await page.mouse.up();
}

async function handleCenter(page: import("@playwright/test").Page, index: number): Promise<{ x: number; y: number }> {
  const box = await page.locator(`gnumarus-shell [data-testid="growcrop-corner-${index}"]`).boundingBox();
  if (box === null) {
    throw new Error(`grow handle ${index} has no bounding box`);
  }
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function blurActiveElement(page: import("@playwright/test").Page): Promise<void> {
  await page.evaluate(() => {
    const active = document.activeElement as HTMLElement | null;
    if (active !== null && typeof active.blur === "function") {
      active.blur();
    }
  });
}

async function setZoom(page: import("@playwright/test").Page, zoom: number): Promise<void> {
  await page.evaluate((value: number) => {
    const root = window as unknown as { __gnumarus?: { engine?: { setZoom(z: number): void } } };
    root.__gnumarus?.engine?.setZoom(value);
  }, zoom);
}

test("growcrop selects from the drawer and auto-creates the texture box @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintLayerRect(page, "#ff0000", 0, 0, 63, 63);
  await selectTool(page, "Grow or Crop");
  expect(await activeTool(page)).toBe("growcrop");
  for (let index = 0; index < 4; index += 1) {
    await expect(page.locator(`gnumarus-shell [data-testid="growcrop-corner-${index}"]`)).toBeVisible();
  }
  // Handles sit on exact box corners; layerScreenTarget maps pixel
  // centers, so (-0.5,-0.5)/(63.5,63.5) land on the (0,0)/(64,64) corners.
  const topLeft = await layerScreenTarget(page, -0.5, -0.5);
  const bottomRight = await layerScreenTarget(page, 63.5, 63.5);
  const corner0 = await handleCenter(page, 0);
  const corner3 = await handleCenter(page, 3);
  expect(Math.abs(corner0.x - topLeft.x)).toBeLessThanOrEqual(2);
  expect(Math.abs(corner0.y - topLeft.y)).toBeLessThanOrEqual(2);
  expect(Math.abs(corner3.x - bottomRight.x)).toBeLessThanOrEqual(2);
  expect(Math.abs(corner3.y - bottomRight.y)).toBeLessThanOrEqual(2);
});

test("drawn box crops and grows around the overlap on Enter @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintLayerRect(page, "#ff0000", 0, 0, 63, 63);
  await selectTool(page, "Grow or Crop");
  await setZoom(page, 2);
  // Box (52,52)-(67,67) normalizes to (52,52,16,16): the overlapped old
  // [52,64) square lands on the new (0,0)-(12,12); the rest is transparent.
  await dragImage(page, 52, 52, 67, 67);
  await blurActiveElement(page);
  await page.keyboard.press("Enter");
  await expect(page.locator("gnumarus-shell")).toContainText("16 x 16");
  expect(await countRedIn(page, 0, 0, 16, 16)).toBe(12 * 12);
  expect(await readPixel(page, 15, 15)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
});

test("border drag grows the texture and Ctrl+Z restores it @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintLayerRect(page, "#ff0000", 0, 0, 63, 63);
  await selectTool(page, "Grow or Crop");
  await setZoom(page, 2);
  await dragImage(page, 63, 32, 79, 32);
  await blurActiveElement(page);
  await page.keyboard.press("Enter");
  await expect(page.locator("gnumarus-shell")).toContainText("80 x 64");
  expect(await countRedIn(page, 0, 0, 64, 64)).toBe(64 * 64);
  expect(await readPixel(page, 64, 10)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 64, 10)).toBeNull();
  expect(await countRedIn(page, 0, 0, 64, 64)).toBe(64 * 64);
});

test("shrinking commits a smaller texture and undoes cleanly @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintLayerRect(page, "#ff0000", 0, 0, 63, 63);
  await selectTool(page, "Grow or Crop");
  await setZoom(page, 2);
  await dragImage(page, 16, 16, 31, 31);
  await blurActiveElement(page);
  await page.keyboard.press("Enter");
  await expect(page.locator("gnumarus-shell")).toContainText("16 x 16");
  expect(await countRedIn(page, 0, 0, 16, 16)).toBe(16 * 16);
  expect(await readPixel(page, 16, 16)).toBeNull();
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 16, 16)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await countRedIn(page, 0, 0, 64, 64)).toBe(64 * 64);
});

test("growcrop snaps fractional drags to whole pixels @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintLayerRect(page, "#ff0000", 0, 0, 63, 63);
  await selectTool(page, "Grow or Crop");
  // High zoom separates snapped from unsnapped handle spots: a 0.6px
  // image gap is ~5 screen px at zoom 8. (layerScreenTarget maps pixel
  // centers, so hitting image float f needs target f - 0.5.)
  await setZoom(page, 8);
  const a = await layerScreenTarget(page, 52.1, 52.1);
  const b = await layerScreenTarget(page, 66.9, 66.9);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 8 });
  // Snapped box is (52,52)-(68,68): handles sit on the pixel corners,
  // like the auto-created box, not on the fractional drag points.
  const want0 = await layerScreenTarget(page, 51.5, 51.5);
  const want3 = await layerScreenTarget(page, 67.5, 67.5);
  const corner0 = await handleCenter(page, 0);
  const corner3 = await handleCenter(page, 3);
  expect(Math.abs(corner0.x - want0.x)).toBeLessThanOrEqual(2);
  expect(Math.abs(corner0.y - want0.y)).toBeLessThanOrEqual(2);
  expect(Math.abs(corner3.x - want3.x)).toBeLessThanOrEqual(2);
  expect(Math.abs(corner3.y - want3.y)).toBeLessThanOrEqual(2);
  await page.mouse.up();
  await blurActiveElement(page);
  await page.keyboard.press("Enter");
  // The outward snap matches the commit: 16x16, red overlap 12x12.
  await expect(page.locator("gnumarus-shell")).toContainText("16 x 16");
  expect(await countRedIn(page, 0, 0, 16, 16)).toBe(12 * 12);
});

test("crop tool draws the thin white box and snaps to whole pixels @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintLayerRect(page, "#ff0000", 0, 0, 63, 63);
  await selectTool(page, "Crop");
  await setZoom(page, 2);
  // Hold the drag open: the preview uses the same thin white outline as
  // the grow-or-crop box (not the brush-colored shape width). Targets are
  // offset by -0.5 because layerScreenTarget maps pixel centers.
  const a = await layerScreenTarget(page, 16.1, 16.1);
  const b = await layerScreenTarget(page, 30.9, 30.9);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 8 });
  const preview = page.locator('gnumarus-shell [data-testid="line-preview"] rect[stroke="#ffffff"]');
  await expect(preview).toHaveAttribute("stroke", "#ffffff");
  await expect(preview).toHaveAttribute("stroke-width", "1.5");
  // Snapped box is (16,16)-(32,32): 32 content px wide at zoom 2 (plus
  // the 1.5px outline stroke in the bounding box), while the raw
  // fractional drag would render 29.6px wide.
  const box = await preview.boundingBox();
  expect(box?.width).toBeGreaterThan(33);
  expect(box?.width).toBeLessThan(34);
  await page.mouse.up();
  // The outward snap matches the commit: a 16x16 texture.
  expect(await countRedIn(page, 0, 0, 16, 16)).toBe(16 * 16);
  expect(await readPixel(page, 16, 16)).toBeNull();
});

test("empty cell shows no box and Esc clears a drawn one @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await selectTool(page, "Grow or Crop");
  await expect(page.locator("gnumarus-shell [data-testid=\"growcrop-corner-0\"]")).toBeHidden();
  await setZoom(page, 2);
  await dragImage(page, 10, 10, 20, 20);
  await expect(page.locator("gnumarus-shell [data-testid=\"growcrop-corner-0\"]")).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.locator("gnumarus-shell [data-testid=\"growcrop-corner-0\"]")).toBeHidden();
  await dragImage(page, 10, 10, 20, 20);
  await expect(page.locator("gnumarus-shell [data-testid=\"growcrop-corner-0\"]")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("gnumarus-shell [data-testid=\"growcrop-corner-0\"]")).toBeHidden();
});
