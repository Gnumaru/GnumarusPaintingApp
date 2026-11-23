import { expect, test } from "@playwright/test";
import { getFloatingSelection, getMatrix, layerScreenTarget, layerToScreen, loadBlankProject, paintedPixelCount, readBox, readPixel, selectTool, setBrushColor, shapePreviewPixels, shapePreviewVisible, sliceBox } from "./e2e-helpers";

test("changing frame/layer scrolls the matrix and layers list into view @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  for (let i = 0; i < 19; i += 1) {
    await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  }
  for (let i = 0; i < 8; i += 1) {
    await page.keyboard.press("Insert");
  }
  const scrollState = (): Promise<{
    listTop: number;
    scrollLeft: number;
    scrollTop: number;
    cellVisible: boolean;
    rowVisible: boolean;
  }> =>
    page.evaluate(() => {
      const root = document.querySelector("gnumarus-shell")?.shadowRoot ?? null;
      const list = root?.querySelector(".layers-list") as HTMLElement | null;
      const scroller = root?.querySelector(".anim-scroll") as HTMLElement | null;
      const cell = root?.querySelector(".anim-cell.active-cell") as HTMLElement | null;
      const row = root?.querySelector(".layer-row.active") as HTMLElement | null;
      if (list === null || scroller === null || cell === null || row === null) {
        throw new Error("scroll nodes are missing");
      }
      const inView = (box: DOMRect, area: DOMRect): boolean =>
        box.top >= area.top - 1 &&
        box.bottom <= area.bottom + 1 &&
        box.left >= area.left - 1 &&
        box.right <= area.right + 1;
      const scrollerBox = scroller.getBoundingClientRect();
      const cornerBox = (root?.querySelector(".anim-corner") as HTMLElement | null)?.getBoundingClientRect();
      // Usable area: client box (no borders, no classic scrollbars) minus
      // the sticky overlays (layer-name column left, frame-header row top).
      const usableLeft = scrollerBox.left + scroller.clientLeft + (cornerBox?.width ?? 0);
      const usableTop = scrollerBox.top + scroller.clientTop + (cornerBox?.height ?? 0);
      const usable = new DOMRect(
        usableLeft,
        usableTop,
        Math.max(0, scrollerBox.left + scroller.clientLeft + scroller.clientWidth - usableLeft),
        Math.max(0, scrollerBox.top + scroller.clientTop + scroller.clientHeight - usableTop),
      );
      const listBox = list.getBoundingClientRect();
      const listUsable = new DOMRect(
        listBox.left + list.clientLeft,
        listBox.top + list.clientTop,
        list.clientWidth,
        list.clientHeight,
      );
      return {
        listTop: list.scrollTop,
        scrollLeft: scroller.scrollLeft,
        scrollTop: scroller.scrollTop,
        cellVisible: inView(cell.getBoundingClientRect(), usable),
        rowVisible: inView(row.getBoundingClientRect(), listUsable),
      };
    });
  // Navigate with the keyboard: unlike clicking, this performs no automatic
  // browser scrolling, so only the app's own follow logic can reveal cells.
  for (let i = 0; i < 19; i += 1) {
    await page.keyboard.press("ArrowLeft");
  }
  await expect.poll(async () => (await scrollState()).scrollLeft, { timeout: 10000 }).toBe(0);
  await expect.poll(async () => scrollState(), { timeout: 10000 }).toMatchObject({ cellVisible: true });
  // Step down to the bottom layer; both panes must follow.
  for (let i = 0; i < 8; i += 1) {
    await page.keyboard.press("ArrowDown");
  }
  await expect.poll(async () => scrollState(), { timeout: 10000 }).toMatchObject({ cellVisible: true, rowVisible: true });
  let after = await scrollState();
  expect(after.listTop).toBeGreaterThan(0);
  expect(after.scrollTop).toBeGreaterThan(0);
  // Step back up to the top layer: the cell must clear the corner.
  for (let i = 0; i < 8; i += 1) {
    await page.keyboard.press("ArrowUp");
  }
  await expect.poll(async () => scrollState(), { timeout: 10000 }).toMatchObject({ cellVisible: true, rowVisible: true });
  after = await scrollState();
  expect(after.listTop).toBe(0);
  // Last frame: the right edge must clear the vertical scrollbar itself.
  for (let i = 0; i < 19; i += 1) {
    await page.keyboard.press("ArrowRight");
  }
  await expect.poll(async () => scrollState(), { timeout: 10000 }).toMatchObject({ cellVisible: true });
  // Bottom layer on the last frame: the corner cell must clear both scrollbars.
  for (let i = 0; i < 8; i += 1) {
    await page.keyboard.press("ArrowDown");
  }
  await expect.poll(async () => scrollState(), { timeout: 10000 }).toMatchObject({ cellVisible: true, rowVisible: true });
});

test("browser context menu is suppressed on toolbar buttons and menus @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.evaluate(() => {
    (window as unknown as { __ctxPrevented?: boolean[] }).__ctxPrevented = [];
    document.addEventListener("contextmenu", (event: Event) => {
      (window as unknown as { __ctxPrevented?: boolean[] }).__ctxPrevented?.push(event.defaultPrevented);
    });
  });
  // Plain toolbar button without a drawer flyout.
  await page.locator('gnumarus-shell [aria-label="Bucket fill"]').click({ button: "right" });
  // Menubar button.
  await page.getByRole("button", { name: "File" }).click({ button: "right" });
  // Layer context-menu item (menu stays open: right-click never activates).
  await page.locator('gnumarus-shell [data-layer-id="layer0"]').click({ button: "right" });
  await page.locator("gnumarus-shell .context-menu").getByRole("button", { name: "Add above" }).click({ button: "right" });
  await page.keyboard.press("Escape");
  // Text fields keep their native menu for copy/paste.
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await page.locator("gnumarus-shell dialog#settingsDialog input").first().click({ button: "right" });
  await page.keyboard.press("Escape");
  const prevented = await page.evaluate(
    () => (window as unknown as { __ctxPrevented?: boolean[] }).__ctxPrevented ?? [],
  );
  expect(prevented).toEqual([true, true, true, true, false]);
});

test("animation matrix resizes by dragging its top edge @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  const handle = page.locator('gnumarus-shell [data-testid="matrix-resize"]');
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  await matrix.locator('[data-testid="anim-frame"][data-frame="1"]').click();
  const before = (await matrix.boundingBox())?.height ?? 0;
  expect(before).toBeGreaterThan(0);
  const hbox = (await handle.boundingBox()) ?? null;
  if (hbox === null) {
    throw new Error("resize handle has no bounding box");
  }
  const startX = hbox.x + hbox.width / 2;
  const startY = hbox.y + hbox.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX, startY - 60, { steps: 5 });
  await page.mouse.up();
  const grown = (await matrix.boundingBox())?.height ?? 0;
  expect(grown).toBeGreaterThanOrEqual(before + 50);
  const hbox2 = (await handle.boundingBox()) ?? null;
  if (hbox2 === null) {
    throw new Error("resize handle has no bounding box");
  }
  await page.mouse.move(hbox2.x + hbox2.width / 2, hbox2.y + hbox2.height / 2);
  await page.mouse.down();
  await page.mouse.move(startX, startY + 40, { steps: 5 });
  await page.mouse.up();
  const shrunk = (await matrix.boundingBox())?.height ?? 0;
  expect(shrunk).toBeLessThan(grown);
  // The matrix stays functional after resizing.
  await matrix.locator('[data-testid="anim-frame"][data-frame="0"]').click();
  expect((await getMatrix(page)).currentFrame).toBe(0);
});

test("raster preview matches the committed rectangle @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await setBrushColor(page, "#ff0000");
  await page.keyboard.press("d");
  const a = await layerToScreen(page, 20, 20);
  const b = await layerToScreen(page, 35, 30);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 5 });
  await expect.poll(() => shapePreviewVisible(page)).toBe(true);
  const preview = await shapePreviewPixels(page);
  if (preview === null) {
    throw new Error("shape preview is missing mid-drag");
  }
  expect(preview.width).toBe(64);
  expect(preview.height).toBe(64);
  await page.mouse.up();
  expect(await readBox(page, 20, 20, 35, 30)).toEqual(sliceBox(preview.buffer, preview.width, 20, 20, 35, 30));
  await expect.poll(() => shapePreviewVisible(page)).toBe(false);
});

test("raster preview matches the committed ellipse fill @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await setBrushColor(page, "#ff0000");
  await page.keyboard.press("h");
  await page.locator("gnumarus-shell input#shapeFilled").click();
  const a = await layerToScreen(page, 18, 18);
  const b = await layerToScreen(page, 46, 46);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 5 });
  await expect.poll(() => shapePreviewVisible(page)).toBe(true);
  const preview = await shapePreviewPixels(page);
  if (preview === null) {
    throw new Error("shape preview is missing mid-drag");
  }
  await page.mouse.up();
  expect(await readBox(page, 0, 0, 63, 63)).toEqual(preview.buffer);
  await expect.poll(() => shapePreviewVisible(page)).toBe(false);
});

test("raster preview matches the committed line @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await setBrushColor(page, "#ff0000");
  await selectTool(page, "Line");
  const a = await layerToScreen(page, 10, 32);
  const b = await layerToScreen(page, 50, 32);
  await page.mouse.click(a.x, a.y);
  await page.mouse.move(b.x, b.y);
  await expect.poll(() => shapePreviewVisible(page)).toBe(true);
  const preview = await shapePreviewPixels(page);
  if (preview === null) {
    throw new Error("shape preview is missing with an armed line");
  }
  await page.mouse.click(b.x, b.y);
  expect(await readBox(page, 0, 0, 63, 63)).toEqual(preview.buffer);
  await expect.poll(() => shapePreviewVisible(page)).toBe(false);
});

test("raster preview matches the committed polygon @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await setBrushColor(page, "#ff0000");
  await page.keyboard.press("j");
  const v0 = await layerToScreen(page, 20, 20);
  const v1 = await layerToScreen(page, 44, 20);
  const v2 = await layerToScreen(page, 44, 44);
  await page.mouse.click(v0.x, v0.y);
  await page.mouse.click(v1.x, v1.y);
  await page.mouse.click(v2.x, v2.y);
  // Park the rubber vertex exactly on the first vertex so the preview shows
  // the closed shape the commit will paint.
  await page.mouse.move(v0.x, v0.y);
  await expect.poll(() => shapePreviewVisible(page)).toBe(true);
  const preview = await shapePreviewPixels(page);
  if (preview === null) {
    throw new Error("shape preview is missing with placed vertices");
  }
  await page.keyboard.press("Enter");
  expect(await readBox(page, 0, 0, 63, 63)).toEqual(preview.buffer);
  await expect.poll(() => shapePreviewVisible(page)).toBe(false);
});

test("raster preview matches the committed curve @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await setBrushColor(page, "#ff0000");
  await selectTool(page, "Curve");
  const p0 = await layerToScreen(page, 20, 32);
  const p3 = await layerToScreen(page, 44, 32);
  await page.mouse.move(p0.x, p0.y);
  await page.mouse.down();
  await page.mouse.move(p3.x, p3.y, { steps: 5 });
  await page.mouse.up();
  const c1 = await layerToScreen(page, 32, 20);
  await page.mouse.click(c1.x, c1.y);
  const c2 = await layerToScreen(page, 32, 44);
  await page.mouse.move(c2.x, c2.y);
  await expect.poll(() => shapePreviewVisible(page)).toBe(true);
  const preview = await shapePreviewPixels(page);
  if (preview === null) {
    throw new Error("shape preview is missing before the second control click");
  }
  await page.mouse.click(c2.x, c2.y);
  expect(await readBox(page, 0, 0, 63, 63)).toEqual(preview.buffer);
  await expect.poll(() => shapePreviewVisible(page)).toBe(false);
});

test("raster preview matches the committed gradient @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await setBrushColor(page, "#ff0000");
  await page.keyboard.press("k");
  const a = await layerToScreen(page, 0, 32);
  const b = await layerToScreen(page, 63, 32);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 5 });
  await expect.poll(() => shapePreviewVisible(page)).toBe(true);
  const preview = await shapePreviewPixels(page);
  if (preview === null) {
    throw new Error("shape preview is missing mid-drag");
  }
  await page.mouse.up();
  expect(await readBox(page, 0, 0, 63, 63)).toEqual(preview.buffer);
  await expect.poll(() => shapePreviewVisible(page)).toBe(false);
});

test("shape preview clears on Escape without painting @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.keyboard.press("d");
  const a = await layerToScreen(page, 20, 20);
  const b = await layerToScreen(page, 35, 30);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 5 });
  await expect.poll(() => shapePreviewVisible(page)).toBe(true);
  await page.keyboard.press("Escape");
  await expect.poll(() => shapePreviewVisible(page)).toBe(false);
  await page.mouse.up();
  expect(await paintedPixelCount(page)).toBe(0);
});

test("shape preview hides when switching tools mid-drag @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.keyboard.press("d");
  const a = await layerToScreen(page, 20, 20);
  const b = await layerToScreen(page, 35, 30);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 5 });
  await expect.poll(() => shapePreviewVisible(page)).toBe(true);
  await page.keyboard.press("b");
  await expect.poll(() => shapePreviewVisible(page)).toBe(false);
  await page.mouse.up();
  expect(await paintedPixelCount(page)).toBe(0);
});

test("rectangular selection with Alt cuts a perfect square @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setBrushColor(page, "#ff0000");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  const corner = await layerScreenTarget(page, 0, 0);
  await page.mouse.click(corner.x, corner.y);
  await page.keyboard.press("r");
  const from = await layerScreenTarget(page, 10, 10);
  const to = await layerScreenTarget(page, 30, 15);
  await page.keyboard.down("Alt");
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 5 });
  await page.mouse.up();
  await page.keyboard.up("Alt");
  const selection = await getFloatingSelection(page);
  expect(selection).not.toBeNull();
  // Drag spans 20 wide by 5 tall; Shift locks the side to 20 (21px inclusive).
  expect(selection?.width).toBe(21);
  expect(selection?.height).toBe(21);
});

test("elliptical selection with Alt cuts a perfect circle @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setBrushColor(page, "#ff0000");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  const corner = await layerScreenTarget(page, 0, 0);
  await page.mouse.click(corner.x, corner.y);
  await page.keyboard.press("o");
  const from = await layerScreenTarget(page, 10, 10);
  const to = await layerScreenTarget(page, 30, 15);
  await page.keyboard.down("Alt");
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 5 });
  await page.mouse.up();
  await page.keyboard.up("Alt");
  const selection = await getFloatingSelection(page);
  expect(selection).not.toBeNull();
  expect(selection?.width).toBe(21);
  expect(selection?.height).toBe(21);
  expect(selection?.selected ?? 0).toBeGreaterThan(0);
});

test("rectangle shape with Alt draws a perfect square @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setBrushColor(page, "#ff0000");
  await page.keyboard.press("d");
  await page.locator("gnumarus-shell input#shapeFilled").click();
  const a = await layerToScreen(page, 20, 20);
  const b = await layerToScreen(page, 35, 25);
  await page.keyboard.down("Alt");
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 5 });
  await page.mouse.up();
  await page.keyboard.up("Alt");
  // Without the lock the box would end at y 25; locked it spans 20..35.
  expect(await readPixel(page, 30, 30)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 19, 19)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
});

test("ellipse shape with Alt draws a perfect circle @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setBrushColor(page, "#ff0000");
  await page.keyboard.press("h");
  await page.locator("gnumarus-shell input#shapeFilled").click();
  const a = await layerToScreen(page, 18, 18);
  const b = await layerToScreen(page, 46, 26);
  await page.keyboard.down("Alt");
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 5 });
  await page.mouse.up();
  await page.keyboard.up("Alt");
  // Without the lock the ellipse would end at y 26; locked it spans 18..46.
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 17, 17)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
});
