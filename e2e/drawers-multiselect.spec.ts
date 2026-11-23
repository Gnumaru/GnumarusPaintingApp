import { expect, test } from "@playwright/test";
import { canvasBox, canvasScreenPixel, getLayers, getMatrix, layerToScreen, onionGhostBox, onionVisible, paintCenter, setBrushColor } from "./e2e-helpers";

test("drawer flyout renders above the canvas instead of clipped @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.locator('gnumarus-shell [data-testid="paint-drawer"] > button').click({ button: "right" });
  const flyout = page.locator('gnumarus-shell [data-testid="paint-flyout"]');
  await expect(flyout).toBeVisible();
  const toolbarBox = await page.locator("gnumarus-shell .toolbar").boundingBox();
  const flyBox = await flyout.boundingBox();
  if (toolbarBox === null || flyBox === null) {
    throw new Error("toolbar or flyout has no bounding box");
  }
  // The flyout expands past the toolbar into the canvas area.
  expect(flyBox.x + flyBox.width).toBeGreaterThan(toolbarBox.x + toolbarBox.width);
  // Fully inside the viewport (no spill that forces unreachable buttons).
  expect(flyBox.x).toBeGreaterThanOrEqual(0);
  expect(flyBox.y).toBeGreaterThanOrEqual(0);
  expect(flyBox.x + flyBox.width).toBeLessThanOrEqual(1280);
  expect(flyBox.y + flyBox.height).toBeLessThanOrEqual(720);
  // Hit test: the flyout center must resolve inside the flyout, proving the
  // canvas (or anything else) does not paint over or clip it.
  // (document.elementFromPoint retargets to the host here, so pierce via the
  // shell shadow root, which reports the deepest shadow-tree node.)
  const hit = await page.evaluate(([x, y]: [number, number]) => {
    const root = document.querySelector("gnumarus-shell")?.shadowRoot ?? null;
    const picker = root as unknown as { elementFromPoint(a: number, b: number): Element | null } | null;
    const el = picker?.elementFromPoint(x, y) as HTMLElement | null;
    if (el === null || el === undefined) {
      return "none";
    }
    return el.closest('[data-testid="paint-flyout"]') !== null ? "flyout" : el.tagName;
  }, [flyBox.x + flyBox.width / 2, flyBox.y + flyBox.height / 2] as [number, number]);
  expect(hit).toBe("flyout");
  // The flyout still picks tools and closes.
  await flyout.getByRole("button", { name: "Curve" }).click();
  await expect(flyout).toBeHidden();
  await expect(page.locator("gnumarus-shell")).toContainText("curve");
});

test("multiply on an unpainted texture shows the layers below on the GPU canvas @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  // Bottom layer: solid red.
  await setBrushColor(page, "#ff0000");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  await paintCenter(page);
  // Layer above with a real texture that is still transparent at the center:
  // an empty cell renders no plane at all, so materialize with a corner dot.
  await page.keyboard.press("Insert");
  await page.getByRole("button", { name: "Brush", exact: true }).click();
  await setBrushColor(page, "#000000");
  const dot = await layerToScreen(page, 8, 8);
  await page.mouse.click(dot.x, dot.y);
  const box = await canvasBox(page);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.locator('gnumarus-shell [data-layer-id="layer1"] select[aria-label="Blend mode"]').selectOption("multiply");
  await expect.poll(async () => canvasScreenPixel(page, cx, cy), { timeout: 10000 }).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  // White is invisible in multiply, black stays black (Krita parity).
  await setBrushColor(page, "#ffffff");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  await paintCenter(page);
  await expect.poll(async () => canvasScreenPixel(page, cx, cy), { timeout: 10000 }).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  await setBrushColor(page, "#000000");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  await paintCenter(page);
  await expect.poll(async () => canvasScreenPixel(page, cx, cy), { timeout: 10000 }).toEqual({ r: 0, g: 0, b: 0, a: 255 });
});

test("darken/lighten/add/screen show through unpainted texels on the GPU canvas @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setBrushColor(page, "#ff0000");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  await paintCenter(page);
  await page.keyboard.press("Insert");
  await page.getByRole("button", { name: "Brush", exact: true }).click();
  await setBrushColor(page, "#000000");
  const dot = await layerToScreen(page, 8, 8);
  await page.mouse.click(dot.x, dot.y);
  const box = await canvasBox(page);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const blend = page.locator('gnumarus-shell [data-layer-id="layer1"] select[aria-label="Blend mode"]');
  for (const mode of ["darken", "lighten", "add", "screen"]) {
    await blend.selectOption(mode);
    await expect.poll(async () => canvasScreenPixel(page, cx, cy), { timeout: 10000 }).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  }
  // Opaque semantics per mode (Krita parity): darken keeps black, drops white.
  await blend.selectOption("darken");
  await setBrushColor(page, "#000000");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  await paintCenter(page);
  await expect.poll(async () => canvasScreenPixel(page, cx, cy), { timeout: 10000 }).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  await setBrushColor(page, "#ffffff");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  await paintCenter(page);
  await expect.poll(async () => canvasScreenPixel(page, cx, cy), { timeout: 10000 }).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  // Lighten is mirrored: white wins, black shows through.
  await blend.selectOption("lighten");
  await expect.poll(async () => canvasScreenPixel(page, cx, cy), { timeout: 10000 }).toEqual({ r: 255, g: 255, b: 255, a: 255 });
  await setBrushColor(page, "#000000");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  await paintCenter(page);
  await expect.poll(async () => canvasScreenPixel(page, cx, cy), { timeout: 10000 }).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("Ctrl+click adds discontiguous frames and Shift unions from the last @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  for (let i = 0; i < 4; i += 1) {
    await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  }
  expect((await getMatrix(page)).frameCount).toBe(5);
  await matrix.locator('[data-testid="anim-frame"][data-frame="0"]').click();
  await matrix.locator('[data-testid="anim-frame"][data-frame="4"]').click({ modifiers: ["Control"] });
  await expect(page.locator("gnumarus-shell")).toContainText("2 frames selected");
  await expect(matrix.locator(".anim-frame-header.in-range")).toHaveCount(2);
  await matrix.locator('[data-testid="anim-frame"][data-frame="2"]').click({ modifiers: ["Shift"] });
  await expect(page.locator("gnumarus-shell")).toContainText("4 frames selected");
  await expect(matrix.locator(".anim-frame-header.in-range")).toHaveCount(4);
  await matrix.locator('[data-testid="anim-frame"][data-frame="4"]').click({ modifiers: ["Control"] });
  await expect(page.locator("gnumarus-shell")).toContainText("3 frames selected");
  await expect(matrix.locator(".anim-frame-header.in-range")).toHaveCount(3);
  await matrix.locator('[data-testid="anim-frame"][data-frame="2"]').click({ button: "right" });
  await expect(page.getByRole("button", { name: "Delete frames (3)" })).toBeVisible();
  await page.keyboard.press("Escape");
});

test("Ctrl+click toggles layer selection and Shift unions the range @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.keyboard.press("Insert");
  await page.keyboard.press("Insert");
  expect((await getLayers(page)).layers.map((layer) => layer.id)).toEqual(["layer0", "layer1", "layer2"]);
  const row0 = page.locator('gnumarus-shell [data-layer-id="layer0"]');
  const row2 = page.locator('gnumarus-shell [data-layer-id="layer2"]');
  await row0.locator(".layer-name").click();
  await row2.locator(".layer-name").click({ modifiers: ["Control"] });
  await expect(page.locator("gnumarus-shell")).toContainText("2 layers selected");
  await expect(page.locator('gnumarus-shell .layer-row.selected')).toHaveCount(2);
  await row0.locator(".layer-name").click({ modifiers: ["Shift"] });
  await expect(page.locator("gnumarus-shell")).toContainText("3 layers selected");
  await expect(page.locator('gnumarus-shell .layer-row.selected')).toHaveCount(3);
  await expect(page.locator('gnumarus-shell [data-testid="anim-layer-name"].selected')).toHaveCount(3);
  await row2.locator(".layer-name").click({ modifiers: ["Control"] });
  await expect(page.locator("gnumarus-shell")).toContainText("2 layers selected");
  await expect(page.locator('gnumarus-shell [data-testid="anim-layer-name"].selected')).toHaveCount(2);
});

test("layer context menus match between panel and matrix, frames stay separate @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.keyboard.press("Insert");
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  await matrix.locator('[data-testid="anim-frame"][data-frame="0"]').click();
  await matrix.locator('[data-testid="anim-frame"][data-frame="1"]').click({ modifiers: ["Control"] });
  await matrix.locator('[data-testid="anim-frame"][data-frame="0"]').click({ button: "right" });
  const frameMenu = page.locator("gnumarus-shell .context-menu");
  await expect(frameMenu.getByRole("button", { name: "Delete frames (2)" })).toBeVisible();
  await expect(frameMenu.getByRole("button", { name: "Rename layer…" })).toHaveCount(0);
  await expect(frameMenu.getByRole("button", { name: /Delete \d+ layers/ })).toHaveCount(0);
  await expect(frameMenu.getByRole("button", { name: "Merge Down" })).toHaveCount(0);
  await page.keyboard.press("Escape");
  const panelItems = async (): Promise<string[]> => {
    await page.locator('gnumarus-shell [data-layer-id="layer0"]').click({ button: "right" });
    const items = await page.locator("gnumarus-shell .context-menu").getByRole("button").allTextContents();
    await page.keyboard.press("Escape");
    return items;
  };
  const matrixItems = async (): Promise<string[]> => {
    await page.locator('gnumarus-shell [data-testid="anim-layer-name"][data-matrix-layer="layer0"]').click({ button: "right" });
    const items = await page.locator("gnumarus-shell .context-menu").getByRole("button").allTextContents();
    await page.keyboard.press("Escape");
    return items;
  };
  await expect(await panelItems()).toEqual(await matrixItems());
  await page.locator('gnumarus-shell [data-testid="anim-layer-name"][data-matrix-layer="layer0"]').click();
  await page.locator('gnumarus-shell [data-testid="anim-layer-name"][data-matrix-layer="layer1"]').click({ modifiers: ["Control"] });
  await page.locator('gnumarus-shell [data-testid="anim-layer-name"][data-matrix-layer="layer0"]').click({ button: "right" });
  const multiMenu = page.locator("gnumarus-shell .context-menu");
  await expect(multiMenu.getByRole("button")).toHaveText(["Delete 2 layers"]);
  await page.keyboard.press("Escape");
});

test("bulk delete removes selected layers keeping one @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.keyboard.press("Insert");
  await page.keyboard.press("Insert");
  await page.locator('gnumarus-shell [data-testid="anim-layer-name"][data-matrix-layer="layer0"]').click();
  await page.locator('gnumarus-shell [data-testid="anim-layer-name"][data-matrix-layer="layer1"]').click({ modifiers: ["Control"] });
  await page.locator('gnumarus-shell [data-testid="anim-layer-name"][data-matrix-layer="layer0"]').click({ button: "right" });
  await page.getByRole("button", { name: "Delete 2 layers" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Deleted 2 layers");
  expect((await getLayers(page)).layers.map((layer) => layer.id)).toEqual(["layer2"]);
  await page.locator('gnumarus-shell [data-testid="anim-layer-name"][data-matrix-layer="layer2"]').click({ modifiers: ["Control"] });
  await page.locator('gnumarus-shell [data-testid="anim-layer-name"][data-matrix-layer="layer2"]').click({ button: "right" });
  await expect(page.locator("gnumarus-shell .context-menu").getByRole("button", { name: "Delete layer" })).toBeVisible();
});

test("matrix cells multi-select with plain, ctrl and shift clicks @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Add layer" }).click();
  await page.getByRole("button", { name: "Add frame", exact: true }).click();
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  const cell = (layer: string, frame: number): import("@playwright/test").Locator =>
    matrix.locator(`[data-testid="anim-cell"][data-matrix-layer="${layer}"][data-matrix-frame="${frame}"]`);
  const selectedCells = page.locator('gnumarus-shell [data-testid="anim-cell"].selected');
  await cell("layer1", 1).click();
  await expect(selectedCells).toHaveCount(1);
  await cell("layer0", 0).click({ modifiers: ["Control"] });
  await expect(page.locator("gnumarus-shell")).toContainText("2 cells selected");
  await expect(selectedCells).toHaveCount(2);
  // Shift+click replaces with the anchor..clicked rectangle (2 layers x 2 frames).
  await cell("layer1", 1).click({ modifiers: ["Shift"] });
  await expect(page.locator("gnumarus-shell")).toContainText("4 cells selected");
  await expect(selectedCells).toHaveCount(4);
  // Right-clicking a member of a multi-cell selection shows only set actions.
  await cell("layer0", 0).click({ button: "right" });
  await expect(page.locator("gnumarus-shell .context-menu").getByRole("button")).toHaveText([
    "Unlink cell content",
    "Relink cell content",
  ]);
  await page.keyboard.press("Escape");
  // Right-clicking outside the selection falls back to the single-cell menu.
  await cell("layer1", 0).click();
  await expect(selectedCells).toHaveCount(1);
  await cell("layer0", 1).click({ button: "right" });
  await expect(
    page.locator("gnumarus-shell .context-menu").getByRole("button", { name: "Select content" }),
  ).toBeVisible();
  await expect(
    page.locator("gnumarus-shell .context-menu").getByRole("button", { name: "Unlink cell content" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
});

test("unlink cell content action dissociates selected cells @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setBrushColor(page, "#ff0000");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  await paintCenter(page);
  await page.getByRole("button", { name: "Add frame", exact: true }).click();
  await paintCenter(page);
  let matrixState = await getMatrix(page);
  expect(matrixState.rows[0]?.cells.map((entry) => entry.contentId !== null)).toEqual([true, true]);
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  const cell = (frame: number): import("@playwright/test").Locator =>
    matrix.locator(`[data-testid="anim-cell"][data-matrix-layer="layer0"][data-matrix-frame="${frame}"]`);
  await cell(0).click();
  await cell(1).click({ modifiers: ["Control"] });
  await page.keyboard.press("Control+Shift+P");
  const dialog = page.locator("gnumarus-shell dialog#actionPaletteDialog");
  await dialog.locator('[data-testid="action-palette-input"]').fill("unlink");
  await dialog.locator('[data-testid="action-palette-item"][data-action-id="unlink-cell-content"]').click();
  await expect(page.locator("gnumarus-shell")).toContainText("Unlinked 2 cells");
  matrixState = await getMatrix(page);
  expect(matrixState.rows[0]?.cells.map((entry) => entry.contentId)).toEqual([null, null]);
  // Nothing left to unlink across the still-selected cells.
  await page.keyboard.press("Control+Shift+P");
  await dialog.locator('[data-testid="action-palette-input"]').fill("unlink");
  await dialog.locator('[data-testid="action-palette-item"][data-action-id="unlink-cell-content"]').click();
  await expect(page.locator("gnumarus-shell")).toContainText("Nothing to unlink");
  // A single empty current cell reports the empty-cell error.
  await cell(0).click();
  await page.keyboard.press("Control+Shift+P");
  await dialog.locator('[data-testid="action-palette-input"]').fill("unlink");
  await dialog.locator('[data-testid="action-palette-item"][data-action-id="unlink-cell-content"]').click();
  await expect(page.locator("gnumarus-shell")).toContainText("Cell is already empty");
});

test("relink cell content action shares one content across cells @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setBrushColor(page, "#ff0000");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  await paintCenter(page);
  await page.getByRole("button", { name: "Add frame", exact: true }).click();
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  const cell = (frame: number): import("@playwright/test").Locator =>
    matrix.locator(`[data-testid="anim-cell"][data-matrix-layer="layer0"][data-matrix-frame="${frame}"]`);
  // Orphan the frame-0 content so neither target uses it afterwards.
  await cell(0).click();
  await page.keyboard.press("Control+Shift+P");
  const palette = page.locator("gnumarus-shell dialog#actionPaletteDialog");
  await palette.locator('[data-testid="action-palette-input"]').fill("unlink");
  await palette.locator('[data-testid="action-palette-item"][data-action-id="unlink-cell-content"]').click();
  let matrixState = await getMatrix(page);
  expect(matrixState.rows[0]?.cells.map((entry) => entry.contentId)).toEqual([null, null]);
  await cell(0).click();
  await cell(1).click({ modifiers: ["Control"] });
  await page.keyboard.press("Control+Shift+P");
  await palette.locator('[data-testid="action-palette-input"]').fill("relink");
  await palette.locator('[data-testid="action-palette-item"][data-action-id="relink-cell-content"]').click();
  const picker = page.locator("gnumarus-shell dialog#contentPickerDialog");
  await expect(picker).toBeVisible();
  await expect(picker.locator('[data-testid="content-picker-none"]')).toHaveCount(0);
  await expect(picker.locator('[data-testid="content-picker-new"]')).toHaveCount(0);
  await picker.locator('[data-testid="content-picker-item"]').first().click();
  await expect(page.locator("gnumarus-shell")).toContainText("Relinked 2 cells to the same content");
  matrixState = await getMatrix(page);
  const contents = matrixState.rows[0]?.cells.map((entry) => entry.contentId) ?? [];
  expect(contents).toHaveLength(2);
  expect(contents[0]).not.toBeNull();
  expect(contents[0]).toBe(contents[1]);
});

test("onion toggle looks pressed while enabled @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const toggle = page.locator('gnumarus-shell [data-testid="onion-toggle"]');
  await expect(toggle).not.toHaveClass(/active/);
  await toggle.click();
  await expect(toggle).toHaveClass(/active/);
  await expect(page.locator("gnumarus-shell")).toContainText("Onion skin on");
  await toggle.click();
  await expect(toggle).not.toHaveClass(/active/);
});

test("onion ghosts follow canvas pan, zoom and rotation @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setBrushColor(page, "#ff0000");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  await paintCenter(page);
  await page.getByRole("button", { name: "Add frame", exact: true }).click();
  await page.locator('gnumarus-shell [data-testid="onion-toggle"]').click();
  expect(await onionVisible(page)).toEqual({ past: true, future: false });
  const before = await onionGhostBox(page, "past");
  expect(before).not.toBeNull();
  // Pan with Space+drag moves the ghost by the same screen delta.
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await page.keyboard.down("Space");
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 40, startY + 24, { steps: 5 });
  await page.mouse.up();
  await page.keyboard.up("Space");
  const panned = await onionGhostBox(page, "past");
  expect(panned).not.toBeNull();
  expect(Math.abs((panned?.x ?? 0) - (before?.x ?? 0) - 40)).toBeLessThan(6);
  expect(Math.abs((panned?.y ?? 0) - (before?.y ?? 0) - 24)).toBeLessThan(6);
  // Doubling the zoom doubles the ghost size around the same center.
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { getViewState(): { zoom: number }; setZoom(zoom: number): void } } };
    const engine = root.__gnumarus?.engine;
    const zoom = engine?.getViewState().zoom ?? 1;
    engine?.setZoom(zoom * 2);
  });
  const zoomed = await onionGhostBox(page, "past");
  expect(zoomed).not.toBeNull();
  expect(Math.abs((zoomed?.width ?? 0) - (panned?.width ?? 0) * 2)).toBeLessThan(12);
  expect(Math.abs((zoomed?.height ?? 0) - (panned?.height ?? 0) * 2)).toBeLessThan(12);
  // A quarter turn swaps the ghost extents.
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { setRotation(radians: number): void } } };
    root.__gnumarus?.engine?.setRotation(Math.PI / 2);
  });
  const rotated = await onionGhostBox(page, "past");
  expect(rotated).not.toBeNull();
  expect(Math.abs((rotated?.width ?? 0) - (zoomed?.height ?? 0))).toBeLessThan(12);
  expect(Math.abs((rotated?.height ?? 0) - (zoomed?.width ?? 0))).toBeLessThan(12);
});

test("onion toggle tooltip and single-line animation controls @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await expect(page.locator('gnumarus-shell [data-testid="onion-toggle"]')).toHaveAttribute("title", "Onion skin");
  const overlap = await page.evaluate(() => {
    const root = document.querySelector("gnumarus-shell")?.shadowRoot;
    const corner = root?.querySelector(".anim-corner");
    const boxes = Array.from(corner?.children ?? []).map((element) => {
      const rect = (element as HTMLElement).getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom };
    });
    if (boxes.length === 0) {
      return null;
    }
    return Math.max(...boxes.map((box) => box.top)) < Math.min(...boxes.map((box) => box.bottom));
  });
  expect(overlap).toBe(true);
});

test("drawer buttons carry a high-contrast amber marker, plain buttons do not @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const marker = await page.evaluate(() => {
    const root = document.querySelector("gnumarus-shell")?.shadowRoot ?? null;
    const byTestId = (id: string): Element | null =>
      root?.querySelector(`[data-testid="${id}"] > button`) ?? null;
    const colorOf = (element: Element | null): string | null =>
      element === null
        ? null
        : getComputedStyle(element, "::after").getPropertyValue("border-bottom-color").trim();
    const contentOf = (element: Element | null): string | null =>
      element === null ? null : getComputedStyle(element, "::after").getPropertyValue("content");
    return {
      paint: colorOf(byTestId("paint-drawer")),
      view: colorOf(byTestId("view-drawer")),
      // Standalone tool button: no corner marker at all.
      tileContent: contentOf(root?.querySelector('[aria-label="Tile brush"]') ?? null),
    };
  });
  expect(marker.paint).toBe("rgb(255, 179, 0)");
  expect(marker.view).toBe("rgb(255, 179, 0)");
  expect(marker.tileContent).toBe("none");
});
