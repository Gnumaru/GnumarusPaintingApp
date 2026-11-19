import { expect, test } from "@playwright/test";
import { getMatrix, layerSize, loadBlankProject, paintCenter, readPixel, setEmptyCellHold, setPencil } from "./e2e-helpers";

test("animation matrix shows one row per layer and one column per frame", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await expect(matrix).toBeVisible();
  expect(await matrix.locator('[data-testid="anim-cell"]').count()).toBe(1);
  await expect(matrix.locator('[data-testid="anim-frame"][data-frame="0"]')).toBeVisible();
  await expect(page.locator("gnumarus-shell")).toContainText("Frame 1/1");
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  expect(await matrix.locator('[data-testid="anim-cell"]').count()).toBe(2);
  await expect(page.locator("gnumarus-shell")).toContainText("Frame 2/2");
  const state = await getMatrix(page);
  expect(state.frameCount).toBe(2);
  expect(state.rows).toHaveLength(1);
  expect(state.rows[0]?.cells.map((cell) => cell.contentId)).toEqual([null, null]);
});

test("new frames start empty and painting a frame does not leak into others", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await setEmptyCellHold(page, false);
  await paintCenter(page);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  await matrix.locator('[data-testid="anim-frame"][data-frame="1"]').click();
  expect(await readPixel(page, 32, 32)).toBeNull();
  await paintCenter(page);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  await matrix.locator('[data-testid="anim-frame"][data-frame="0"]').click();
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  const state = await getMatrix(page);
  expect(state.rows[0]?.cells[0]?.contentId).not.toBeNull();
  expect(state.rows[0]?.cells[1]?.contentId).not.toBeNull();
  expect(state.rows[0]?.cells[0]?.contentId).not.toBe(state.rows[0]?.cells[1]?.contentId);
});

test("cell Select content modal creates, dissociates and associates shared contents", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  const cell = matrix.locator('[data-testid="anim-cell"][data-matrix-frame="1"]');
  await expect(cell).toHaveAttribute("aria-label", /empty/);
  await cell.click({ button: "right" });
  await page.getByRole("button", { name: "Select content" }).click();
  const contentGrid = page.locator('gnumarus-shell [data-testid="content-picker-grid"]');
  await expect(contentGrid).toBeVisible();
  await expect(page.locator('gnumarus-shell [data-testid="content-picker-none"]')).toBeVisible();
  await expect(page.locator('gnumarus-shell [data-testid="content-picker-new"]')).toBeVisible();
  await page.locator('gnumarus-shell [data-testid="content-picker-new"]').click();
  const textureGrid = page.locator('gnumarus-shell [data-testid="texture-picker-grid"]');
  await expect(textureGrid).toBeVisible();
  await expect(page.locator('gnumarus-shell [data-testid="texture-picker-none"]')).toBeVisible();
  await expect(page.locator('gnumarus-shell [data-testid="texture-picker-new"]')).toBeVisible();
  await page.locator('gnumarus-shell [data-testid="texture-picker-new"]').click();
  await expect(cell).not.toHaveAttribute("aria-label", /empty/);
  let state = await getMatrix(page);
  const freshId = state.rows[0]?.cells[1]?.contentId;
  expect(typeof freshId).toBe("string");
  await paintCenter(page);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  await matrix.locator('[data-testid="anim-frame"][data-frame="0"]').click();
  expect(await readPixel(page, 32, 32)).toBeNull();
  const firstCell = matrix.locator('[data-testid="anim-cell"][data-matrix-frame="0"]');
  await firstCell.click({ button: "right" });
  await page.getByRole("button", { name: "Select content" }).click();
  await expect(page.locator('gnumarus-shell [data-testid="content-picker-grid"]')).toBeVisible();
  const freshName = state.rows[0]?.cells[1]?.contentName ?? "";
  expect(freshName.length).toBeGreaterThan(0);
  const items = page.locator('gnumarus-shell [data-testid="content-picker-item"]');
  const names = await items.evaluateAll((elements) =>
    elements.map((el) => el.querySelector(".picker-name")?.textContent?.trim() ?? ""),
  );
  const sorted = [...names].sort((a, b) => a.localeCompare(b));
  expect(names).toEqual(sorted);
  expect(names).toContain(freshName);
  await page.locator(`gnumarus-shell [data-testid="content-picker-item"][data-content-id="${freshId}"]`).click();
  state = await getMatrix(page);
  expect(state.rows[0]?.cells[0]?.contentId).toBe(freshId);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  await firstCell.click({ button: "right" });
  await page.getByRole("button", { name: "Select content" }).click();
  await page.locator('gnumarus-shell [data-testid="content-picker-none"]').click();
  state = await getMatrix(page);
  expect(state.rows[0]?.cells[0]?.contentId).toBeNull();
  expect(await readPixel(page, 32, 32)).toBeNull();
});

test("new content texture picker offers no, new and existing textures with thumbnails", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintCenter(page);
  await page.getByRole("button", { name: "Add layer" }).click();
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  await matrix.locator('[data-testid="anim-frame"][data-frame="0"]').click();
  await paintCenter(page);
  const cell = matrix.locator('[data-testid="anim-cell"][data-matrix-layer="layer1"][data-matrix-frame="1"]');
  await expect(cell).toHaveAttribute("aria-label", /empty/);
  await cell.click({ button: "right" });
  await page.getByRole("button", { name: "Select content" }).click();
  await page.locator('gnumarus-shell [data-testid="content-picker-new"]').click();
  const textureGrid = page.locator('gnumarus-shell [data-testid="texture-picker-grid"]');
  await expect(textureGrid).toBeVisible();
  await expect(page.locator('gnumarus-shell [data-testid="texture-picker-none"]')).toBeVisible();
  await expect(page.locator('gnumarus-shell [data-testid="texture-picker-new"]')).toBeVisible();
  const textureItems = page.locator('gnumarus-shell [data-testid="texture-picker-item"]');
  expect(await textureItems.count()).toBeGreaterThanOrEqual(2);
  const textureNames = await textureItems.evaluateAll((elements) =>
    elements.map((el) => el.querySelector(".picker-name")?.textContent?.trim() ?? ""),
  );
  expect(textureNames).toEqual([...textureNames].sort((a, b) => a.localeCompare(b)));
  for (const name of textureNames) {
    const thumb = textureItems.filter({ hasText: name }).locator("img.picker-thumb");
    await expect(thumb.first()).toBeVisible();
    const src = await thumb.first().getAttribute("src");
    expect(src?.startsWith("data:image/png")).toBe(true);
  }
  await page.locator('gnumarus-shell [data-testid="texture-picker-none"]').click();
  let state = await getMatrix(page);
  const createdId = state.rows.find((row) => row.layerId === "layer1")?.cells[1]?.contentId;
  expect(typeof createdId).toBe("string");
  expect(state.contents.find((entry) => entry.id === createdId)?.textureId).toBeNull();
  await expect(cell).not.toHaveAttribute("aria-label", /empty/);
});

test("new layers start with empty cells until painting or content assignment", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintCenter(page);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  await page.getByRole("button", { name: "Add layer" }).click();
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  const newCell = matrix.locator('[data-testid="anim-cell"][data-matrix-layer="layer1"][data-matrix-frame="0"]');
  await expect(newCell).toHaveAttribute("aria-label", /empty/);
  expect(await readPixel(page, 32, 32)).toBeNull();
  await page.locator('gnumarus-shell [data-layer-id="layer0"] .layer-name').click();
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  await page.locator('gnumarus-shell [data-layer-id="layer1"] .layer-name').click();
  await paintCenter(page);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  await expect(newCell).not.toHaveAttribute("aria-label", /empty/);
  await page.getByRole("button", { name: "Add layer" }).click();
  const emptyCell = matrix.locator('[data-testid="anim-cell"][data-matrix-layer="layer2"][data-matrix-frame="0"]');
  await expect(emptyCell).toHaveAttribute("aria-label", /empty/);
  let state = await getMatrix(page);
  const sharedId = state.rows.find((row) => row.layerId === "layer0")?.cells[0]?.contentId;
  expect(typeof sharedId).toBe("string");
  await emptyCell.click({ button: "right" });
  await page.getByRole("button", { name: "Select content" }).click();
  await page.locator(`gnumarus-shell [data-testid="content-picker-item"][data-content-id="${sharedId}"]`).click();
  state = await getMatrix(page);
  expect(state.rows.find((row) => row.layerId === "layer2")?.cells[0]?.contentId).toBe(sharedId);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
});

test("fit texture to size crops transparent borders and keeps apparent position", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintCenter(page);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  const cell = matrix.locator('[data-testid="anim-cell"][data-matrix-layer="layer0"][data-matrix-frame="0"]');
  await cell.click({ button: "right" });
  await page.getByRole("button", { name: "Fit texture to size" }).click();
  const dialog = page.locator("gnumarus-shell dialog#fitTextureDialog");
  await expect(dialog).toBeVisible();
  const threshold = dialog.locator("input#fitThreshold");
  await expect(threshold).toHaveValue("0");
  await threshold.fill("0");
  await dialog.getByRole("button", { name: "OK" }).click();
  await expect(page.locator('gnumarus-shell [data-layer-id="layer0"]')).toContainText("1×1");
  expect(await readPixel(page, 0, 0)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  await setPencil(page, "#ff0000");
  await paintCenter(page);
  expect(await readPixel(page, 0, 0)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 0, 0)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  await page.keyboard.press("Control+z");
  await expect(page.locator('gnumarus-shell [data-layer-id="layer0"]')).toContainText("64×64");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  await page.keyboard.press("Control+y");
  await expect(page.locator('gnumarus-shell [data-layer-id="layer0"]')).toContainText("1×1");
  expect(await readPixel(page, 0, 0)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
});

test("fit texture to size from the layer menu honors the threshold and no-ops", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintCenter(page);
  const row = page.locator('gnumarus-shell [data-layer-id="layer0"]');
  await row.click({ button: "right" });
  await page.getByRole("button", { name: "Fit texture to size" }).click();
  const dialog = page.locator("gnumarus-shell dialog#fitTextureDialog");
  await expect(dialog).toBeVisible();
  await dialog.locator("input#fitThreshold").fill("999");
  await dialog.getByRole("button", { name: "OK" }).click();
  await expect(row).toContainText("1×1");
  await row.click({ button: "right" });
  await page.getByRole("button", { name: "Fit texture to size" }).click();
  await expect(page.locator("gnumarus-shell dialog#fitTextureDialog")).toBeVisible();
  await page.locator("gnumarus-shell dialog#fitTextureDialog").getByRole("button", { name: "OK" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Nothing to fit");
  await page.getByRole("button", { name: "Add layer" }).click();
  const emptyRow = page.locator('gnumarus-shell [data-layer-id="layer1"]');
  await emptyRow.click({ button: "right" });
  await expect(page.getByRole("button", { name: "Fit texture to size" })).toBeDisabled();
  await page.keyboard.press("Escape");
});

test("cell context menu opens adjacent to the clicked cell and inside the viewport", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  const cell = matrix.locator('[data-testid="anim-cell"][data-matrix-frame="1"]').first();
  const cellBox = await cell.boundingBox();
  expect(cellBox).not.toBeNull();
  await cell.click({ button: "right" });
  const menu = page.locator("gnumarus-shell .context-menu");
  await expect(menu).toBeVisible();
  const menuBox = await menu.boundingBox();
  expect(menuBox).not.toBeNull();
  if (cellBox === null || menuBox === null) {
    throw new Error("missing bounding box");
  }
  const viewport = page.viewportSize() ?? { width: 1280, height: 720 };
  expect(menuBox.x).toBeGreaterThanOrEqual(0);
  expect(menuBox.y).toBeGreaterThanOrEqual(0);
  expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(viewport.width);
  expect(menuBox.y + menuBox.height).toBeLessThanOrEqual(viewport.height);
  // The menu lists all cell actions (select/text/fit/crop/resize), so it is
  // tall and shifts up when it would overflow the viewport bottom. The cell
  // row must either sit near the menu top or overlap the menu vertically.
  const overlapsVertically = cellBox.y >= menuBox.y && cellBox.y <= menuBox.y + menuBox.height;
  expect(overlapsVertically || Math.abs(menuBox.y - cellBox.y) < 80).toBe(true);
});

test("frames can be removed but never the last one", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  expect(await matrix.locator('[data-testid="anim-cell"]').count()).toBe(3);
  await matrix.locator('[data-testid="anim-frame"][data-frame="2"]').click({ button: "right" });
  await page.getByRole("button", { name: "Remove frame" }).click();
  expect(await matrix.locator('[data-testid="anim-cell"]').count()).toBe(2);
  expect(await getMatrix(page)).toMatchObject({ frameCount: 2, currentFrame: 1 });
  await matrix.locator('[data-testid="anim-frame"][data-frame="1"]').click({ button: "right" });
  await expect(page.getByRole("button", { name: "Remove frame" })).toBeEnabled();
  await page.keyboard.press("Escape");
  await matrix.locator('[data-testid="anim-frame"][data-frame="0"]').click({ button: "right" });
  await page.getByRole("button", { name: "Remove frame" }).click();
  expect(await getMatrix(page)).toMatchObject({ frameCount: 1, currentFrame: 0 });
  await matrix.locator('[data-testid="anim-frame"][data-frame="0"]').click({ button: "right" });
  await expect(page.getByRole("button", { name: "Remove frame" })).toBeDisabled();
});

test("Shift+click selects a frame range with bulk delete", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  expect((await getMatrix(page)).frameCount).toBe(4);
  await matrix.locator('[data-testid="anim-frame"][data-frame="0"]').click();
  await matrix.locator('[data-testid="anim-frame"][data-frame="2"]').click({ modifiers: ["Shift"] });
  await expect(page.locator("gnumarus-shell")).toContainText("Frames 1-3 selected (3)");
  await expect(matrix.locator(".anim-frame-header.in-range")).toHaveCount(3);
  await matrix.locator('[data-testid="anim-frame"][data-frame="1"]').click({ button: "right" });
  await expect(page.getByRole("button", { name: "Delete frames (3)" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove frame", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Delete frames (3)" }).click();
  const dialog = page.locator("gnumarus-shell dialog#deleteFramesDialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Delete 3 frames (1-3)?");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
  expect((await getMatrix(page)).frameCount).toBe(4);
  await matrix.locator('[data-testid="anim-frame"][data-frame="3"]').click({ button: "right" });
  await expect(page.getByRole("button", { name: "Remove frame", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Delete frames/ })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await matrix.locator('[data-testid="anim-frame"][data-frame="0"]').click();
  await matrix.locator('[data-testid="anim-frame"][data-frame="2"]').click({ modifiers: ["Shift"] });
  await matrix.locator('[data-testid="anim-frame"][data-frame="1"]').click({ button: "right" });
  await page.getByRole("button", { name: "Delete frames (3)" }).click();
  await page.locator("gnumarus-shell dialog#deleteFramesDialog").getByRole("button", { name: "OK" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Deleted 3 frames");
  expect(await getMatrix(page)).toMatchObject({ frameCount: 1, currentFrame: 0 });
});

test("cell transform is stored per content and follows the frame", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await paintCenter(page);
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { setLayerTransform(id: string, t: unknown): boolean } } };
    root.__gnumarus?.engine?.setLayerTransform("layer0", { x: 5, y: 0 });
  });
  await matrix.locator('[data-testid="anim-frame"][data-frame="1"]').click();
  const moved = await page.evaluate((): {
    rows: Array<{ cells: Array<{ contentId: string | null }> }>;
    contents: Array<{ id: string; transform: { x: number } }>;
  } => {
    const inner = window as unknown as { __gnumarus?: { engine?: { getAnimationMatrix(): unknown } } };
    const matrix = inner.__gnumarus?.engine?.getAnimationMatrix() as
      | {
          rows: Array<{ cells: Array<{ contentId: string | null }> }>;
          contents: Array<{ id: string; transform: { x: number } }>;
        }
      | undefined;
    if (matrix === undefined) {
      throw new Error("animation matrix is unavailable");
    }
    return matrix;
  });
  const frame1Content = moved.rows[0]?.cells[0]?.contentId;
  const frame2Content = moved.rows[0]?.cells[1]?.contentId;
  expect(frame1Content).not.toBeNull();
  expect(frame2Content).not.toBeNull();
  expect(frame2Content).not.toBe(frame1Content);
  expect(moved.contents.find((entry) => entry.id === frame1Content)?.transform.x).toBe(0);
  expect(moved.contents.find((entry) => entry.id === frame2Content)?.transform.x).toBe(5);
});

test("final preview zoom avoids recompositing @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Final preview" }).click();
  const preview = page.locator('gnumarus-shell [data-testid="final-preview"]');
  await expect(preview).toBeVisible();
  const size = await layerSize(page);
  // Count canvas uploads: full refreshes call putImageData, CSS-only zooms do not.
  await page.evaluate(() => {
    const w = window as unknown as { __putImageDataCalls?: number };
    w.__putImageDataCalls = 0;
    type PutImageDataFn = (this: CanvasRenderingContext2D, imageData: ImageData, dx: number, dy: number) => void;
    const ctxProto = CanvasRenderingContext2D.prototype as unknown as { putImageData: PutImageDataFn };
    const orig: PutImageDataFn = ctxProto.putImageData;
    ctxProto.putImageData = function (this: CanvasRenderingContext2D, imageData: ImageData, dx: number, dy: number): void {
      w.__putImageDataCalls = (w.__putImageDataCalls ?? 0) + 1;
      orig.call(this, imageData, dx, dy);
    };
  });
  const uploads = (): Promise<number> =>
    page.evaluate(() => (window as unknown as { __putImageDataCalls?: number }).__putImageDataCalls ?? -1);
  // Reopening recomposites (the spy observes real uploads).
  await page.getByRole("button", { name: "Final preview" }).click();
  await expect(preview).toBeHidden();
  await page.getByRole("button", { name: "Final preview" }).click();
  await expect(preview).toBeVisible();
  expect(await uploads()).toBeGreaterThanOrEqual(1);
  await page.evaluate(() => {
    (window as unknown as { __putImageDataCalls?: number }).__putImageDataCalls = 0;
  });
  // Four zoom clicks change only the CSS size, with no uploads in between.
  const zoomIn = preview.getByRole("button", { name: "Zoom in preview" });
  const zoomOut = preview.getByRole("button", { name: "Zoom out preview" });
  await zoomIn.click();
  await zoomOut.click();
  await zoomIn.click();
  await zoomOut.click();
  await page.waitForTimeout(1000);
  expect(await uploads()).toBe(0);
  const zoomInput = preview.locator('[data-testid="preview-zoom-input"]');
  await expect(zoomInput).toHaveValue("400");
  const previewCanvas = page.locator("gnumarus-shell canvas#previewCanvas");
  expect(await previewCanvas.evaluate((element: HTMLCanvasElement) => element.style.width)).toBe(
    `${size.width * 4}px`,
  );
});

test("final preview pans with left, right and middle mouse drags", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Final preview" }).click();
  const preview = page.locator('gnumarus-shell [data-testid="final-preview"]');
  await expect(preview).toBeVisible();
  await preview.getByRole("button", { name: "Zoom in preview" }).click();
  await preview.getByRole("button", { name: "Zoom in preview" }).click();
  const body = preview.locator(".preview-body");
  const scrolled = (): Promise<{ left: number; top: number }> =>
    body.evaluate((element: HTMLElement) => ({ left: element.scrollLeft, top: element.scrollTop }));
  const start = await scrolled();
  expect(start.left).toBe(0);
  expect(start.top).toBe(0);
  const center = await body.boundingBox();
  if (center === null) {
    throw new Error("preview body has no bounding box");
  }
  const cx = center.x + center.width / 2;
  const cy = center.y + center.height / 2;
  const drag = async (button: "left" | "right" | "middle"): Promise<{ left: number; top: number }> => {
    const before = await scrolled();
    await page.mouse.move(cx, cy);
    await page.mouse.down({ button });
    await page.mouse.move(cx - 60, cy - 40, { steps: 5 });
    await page.mouse.up({ button });
    return { left: (await scrolled()).left - before.left, top: (await scrolled()).top - before.top };
  };
  const leftDrag = await drag("left");
  expect(leftDrag.left).toBeGreaterThan(0);
  expect(leftDrag.top).toBeGreaterThan(0);
  const rightDrag = await drag("right");
  expect(rightDrag.left).toBeGreaterThan(0);
  expect(rightDrag.top).toBeGreaterThan(0);
  const middleDrag = await drag("middle");
  expect(middleDrag.left).toBeGreaterThan(0);
  expect(middleDrag.top).toBeGreaterThan(0);
});

test("toolbar icons fill buttons without growing them", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  const boxes = await page.evaluate(() => {
    const root = document.querySelector("gnumarus-shell")?.shadowRoot;
    const buttons = Array.from(root?.querySelectorAll(".toolbar button") ?? []);
    return buttons.flatMap((button) => {
      const rect = (button as HTMLElement).getBoundingClientRect();
      const icon = (button as HTMLElement).querySelector(".tool-icon");
      const transform = icon === null ? "none" : getComputedStyle(icon).transform;
      if (rect.width <= 0 || rect.height <= 0) {
        // Slot content of a closed popup (e.g. the picker's brush side
        // panel) stays in the DOM unprojected: not a rendered button.
        return [];
      }
      return [
        {
          label: (button as HTMLElement).getAttribute("aria-label"),
          w: rect.width,
          h: rect.height,
          transform,
        },
      ];
    });
  });
  expect(boxes).toHaveLength(17);
  const expected: Record<string, { w: number; h: number }> = {
    Pencil: { w: 33, h: 25 },
    Loupe: { w: 30, h: 25 },
    Pan: { w: 34, h: 26 },
    "Bucket fill": { w: 35, h: 26 },
    Eyedropper: { w: 35, h: 26 },
    Text: { w: 32, h: 25 },
    "Tile brush": { w: 34, h: 25 },
    "Rectangle": { w: 33, h: 25 },
    "Shading": { w: 30, h: 25 },
    "3D model transform": { w: 33, h: 25 },
    "Rectangular selection": { w: 34, h: 25 },
    "Destructive selection transform": { w: 33, h: 25 },
    "Non-destructive cell transform": { w: 31, h: 29 },
    "Final preview": { w: 32, h: 29 },
    "Foreground paint color (paints)": { w: 20, h: 20 },
    "Background paint color (X swaps)": { w: 20, h: 20 },
    "Swap paint colors": { w: 16, h: 16 },
  };
  for (const box of boxes) {
    const ref = expected[box.label ?? ""];
    expect(ref).toBeDefined();
    expect(Math.abs(box.w - ref.w)).toBeLessThanOrEqual(1);
    expect(Math.abs(box.h - ref.h)).toBeLessThanOrEqual(1);
    if (
      box.label !== "Foreground paint color (paints)" &&
      box.label !== "Background paint color (X swaps)" &&
      box.label !== "Swap paint colors"
    ) {
      // Paint wells show flat colors instead of scaled glyphs.
      expect(box.transform).not.toBe("none");
    }
  }
});

test("final preview scroll limits show all four image edges", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Final preview" }).click();
  const preview = page.locator('gnumarus-shell [data-testid="final-preview"]');
  await expect(preview).toBeVisible();
  await preview.getByRole("button", { name: "Zoom in preview" }).click();
  await preview.getByRole("button", { name: "Zoom in preview" }).click();
  const body = preview.locator(".preview-body");
  const previewCanvas = preview.locator("canvas#previewCanvas");
  await expect(previewCanvas).toBeVisible();
  const edges = await body.evaluate((element: HTMLElement) => {
    const canvas = element.querySelector("canvas");
    if (canvas === null) {
      throw new Error("preview canvas is missing");
    }
    const setScroll = (left: number, top: number): DOMRect => {
      element.scrollLeft = left;
      element.scrollTop = top;
      return canvas.getBoundingClientRect();
    };
    const bodyRect = element.getBoundingClientRect();
    const atStart = setScroll(0, 0);
    const maxLeft = element.scrollWidth - element.clientWidth;
    const maxTop = element.scrollHeight - element.clientHeight;
    const atEnd = setScroll(maxLeft, maxTop);
    return {
      bodyLeft: bodyRect.left,
      bodyTop: bodyRect.top,
      bodyRight: bodyRect.right,
      bodyBottom: bodyRect.bottom,
      startLeft: atStart.left,
      startTop: atStart.top,
      endRight: atEnd.right,
      endBottom: atEnd.bottom,
      maxLeft,
      maxTop,
    };
  });
  expect(edges.maxLeft).toBeGreaterThan(0);
  expect(edges.maxTop).toBeGreaterThan(0);
  expect(Math.abs(edges.startLeft - edges.bodyLeft)).toBeLessThanOrEqual(1);
  expect(Math.abs(edges.startTop - edges.bodyTop)).toBeLessThanOrEqual(1);
  expect(Math.abs(edges.endRight - edges.bodyRight)).toBeLessThanOrEqual(1);
  expect(Math.abs(edges.endBottom - edges.bodyBottom)).toBeLessThanOrEqual(1);
});
