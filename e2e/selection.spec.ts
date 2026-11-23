import { expect, test } from "@playwright/test";
import { canvasScreenPixel, dragRect, engineBrushSize, floatingRect, getFloatingSelection, getPendingResizeHandle, getViewState, layerScreenTarget, loadBlankProject, paintCenter, paintDot, readFloatingPixel, readPixel, selectTool, selectionMaskDisplay, selectionMaskMoves, selectionOverlayDisplay, setBrushColor } from "./e2e-helpers";

test("final preview shows the canvas background", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintCenter(page);
  await page.getByRole("button", { name: "Final preview" }).click();
  const preview = page.locator('gnumarus-shell [data-testid="final-preview"]');
  await expect(preview).toBeVisible();
  const previewCanvas = page.locator("gnumarus-shell canvas#previewCanvas");
  await expect(previewCanvas).toBeVisible();
  const previewPixel = (x: number, y: number): Promise<number[] | null> =>
    page.evaluate(([px, py]: number[]) => {
      const root = document.querySelector("gnumarus-shell")?.shadowRoot ?? null;
      const canvas = root?.getElementById("previewCanvas") as HTMLCanvasElement | null;
      const ctx = canvas?.getContext("2d") ?? null;
      if (ctx === null) {
        return null;
      }
      const data = ctx.getImageData(px, py, 1, 1).data;
      return [data[0], data[1], data[2], data[3]];
    }, [x, y]);
  // Default 16px checkerboard: top-left square uses the second checker color.
  await expect.poll(() => previewPixel(0, 0)).toEqual([148, 148, 148, 255]);
  // Painted pixels still composite over the background.
  expect(await previewPixel(32, 32)).toEqual([0, 0, 0, 255]);
  // Drag the preview window aside so the menu bar stays clickable, then
  // switch to a solid background and watch the open preview update live.
  const header = preview.locator(".preview-header");
  const headerBox = await header.boundingBox();
  if (headerBox === null) {
    throw new Error("preview header has no bounding box");
  }
  await page.mouse.move(headerBox.x + 40, headerBox.y + headerBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(headerBox.x + 540, headerBox.y + headerBox.height / 2 + 80, { steps: 8 });
  await page.mouse.up();
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await page.locator("gnumarus-shell select#backgroundMode").selectOption("solid");
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { setBackgroundColor(hex: string): void } } };
    root.__gnumarus?.shell?.setBackgroundColor("#ff0000");
  });
  await expect.poll(() => previewPixel(0, 0)).toEqual([255, 0, 0, 255]);
  expect(await previewPixel(32, 32)).toEqual([0, 0, 0, 255]);
  // Switching back to checkerboard updates the open preview too.
  await page.locator("gnumarus-shell select#backgroundMode").selectOption("checkerboard");
  await expect.poll(() => previewPixel(0, 0)).toEqual([148, 148, 148, 255]);
  await page.locator("gnumarus-shell dialog#settingsDialog").getByRole("button", { name: "Close", exact: true }).click();
});

test("wheel alone zooms, wheel with modifiers does not", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const before = (await getViewState(page)).zoom;
  await page.mouse.wheel(0, 240);
  const afterPlain = (await getViewState(page)).zoom;
  expect(afterPlain).toBeLessThan(before);
  await page.keyboard.down("Shift");
  await page.mouse.wheel(0, 240);
  await page.keyboard.up("Shift");
  expect((await getViewState(page)).zoom).toBe(afterPlain);
});

test("ctrl+wheel resizes the brush in whole steps", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  expect(await engineBrushSize(page)).toBe(1);
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.keyboard.down("Control");
  await page.mouse.wheel(0, -240);
  await page.keyboard.up("Control");
  expect(await engineBrushSize(page)).toBe(2);
  await page.keyboard.down("Control");
  await page.mouse.wheel(0, 240);
  await page.keyboard.up("Control");
  expect(await engineBrushSize(page)).toBe(1);
});

test("polygonal lasso commits on Enter", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setBrushColor(page, "#ff0000");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  const corner = await layerScreenTarget(page, 0, 0);
  await page.mouse.click(corner.x, corner.y);
  await page.keyboard.press("p");
  for (const [x, y] of [[10, 10], [30, 10], [10, 30]] as Array<[number, number]>) {
    const target = await layerScreenTarget(page, x, y);
    await page.mouse.click(target.x, target.y);
  }
  await page.keyboard.press("Enter");
  const selection = await getFloatingSelection(page);
  expect(selection).not.toBeNull();
  expect(selection?.selected ?? 0).toBeGreaterThan(50);
  expect(await readPixel(page, 12, 12)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 28, 28)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("polygonal lasso commits on right-click and combines with shift", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setBrushColor(page, "#ff0000");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  const corner = await layerScreenTarget(page, 0, 0);
  await page.mouse.click(corner.x, corner.y);
  await page.getByRole("button", { name: "Rectangular selection" }).click();
  await dragRect(page, 10, 10, 12, 12);
  expect(await getFloatingSelection(page)).toEqual({ x: 10, y: 10, width: 3, height: 3, selected: 9 });
  await page.keyboard.press("p");
  for (const [x, y] of [[20, 20], [26, 20], [20, 26]] as Array<[number, number]>) {
    const target = await layerScreenTarget(page, x, y);
    await page.mouse.click(target.x, target.y);
  }
  await page.keyboard.down("Shift");
  const commit = await layerScreenTarget(page, 20, 20);
  await page.mouse.click(commit.x, commit.y, { button: "right" });
  await page.keyboard.up("Shift");
  const selection = await getFloatingSelection(page);
  expect(selection).not.toBeNull();
  expect(selection?.selected ?? 0).toBeGreaterThan(9);
  expect(await readPixel(page, 11, 11)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 21, 21)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("selection drawer swaps the front tool on flyout pick", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const drawer = page.locator('gnumarus-shell [data-testid="selection-drawer"]');
  await expect(drawer.getByRole("button", { name: "Rectangular selection" })).toBeVisible();
  await drawer.getByRole("button", { name: "Rectangular selection" }).click({ button: "right" });
  await expect(page.locator('gnumarus-shell [data-testid="selection-flyout"]')).toBeVisible();
  await page.locator('gnumarus-shell [data-testid="selection-flyout"]').getByRole("button", { name: "Elliptical selection" }).click();
  await expect(page.locator('gnumarus-shell [data-testid="selection-flyout"]')).toBeHidden();
  await expect(drawer.getByRole("button", { name: "Elliptical selection" })).toBeVisible();
  await expect(page.locator("gnumarus-shell")).toContainText("Elliptical selection");
  await page.keyboard.press("r");
  await expect(drawer.getByRole("button", { name: "Rectangular selection" })).toBeVisible();
});

test("paint drawer swaps line and curve through the flyout", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const drawer = page.locator('gnumarus-shell [data-testid="paint-drawer"]');
  await expect(drawer.getByRole("button", { name: "Brush", exact: true })).toBeVisible();
  await drawer.getByRole("button", { name: "Brush", exact: true }).click({ button: "right" });
  await expect(page.locator('gnumarus-shell [data-testid="paint-flyout"]')).toBeVisible();
  await page.locator('gnumarus-shell [data-testid="paint-flyout"]').getByRole("button", { name: "Curve" }).click();
  await expect(page.locator('gnumarus-shell [data-testid="paint-flyout"]')).toBeHidden();
  await expect(drawer.getByRole("button", { name: "Curve" })).toBeVisible();
  await expect(page.locator("gnumarus-shell")).toContainText("Curve");
  await drawer.getByRole("button", { name: "Curve" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Curve");
});

test("destructive and transform drawers swap their front tools", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const destructive = page.locator('gnumarus-shell [data-testid="destructive-drawer"]');
  await destructive.getByRole("button", { name: "Destructive selection transform" }).click({ button: "right" });
  await page
    .locator('gnumarus-shell [data-testid="destructive-flyout"]')
    .getByRole("button", { name: "Destructive selection 3D rotation" })
    .click();
  await expect(destructive.getByRole("button", { name: "Destructive selection 3D rotation" })).toBeVisible();
  const transform = page.locator('gnumarus-shell [data-testid="transform-drawer"]');
  await transform.getByRole("button", { name: "Non-destructive cell transform" }).click({ button: "right" });
  await page.locator('gnumarus-shell [data-testid="transform-flyout"]').getByRole("button", { name: "Non-destructive cell 3D rotation" }).click();
  await expect(transform.getByRole("button", { name: "Non-destructive cell 3D rotation" })).toBeVisible();
  await expect(page.locator("gnumarus-shell")).toContainText("Non-destructive cell 3D rotation");
});

test("elliptical selection cuts an ellipse", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setBrushColor(page, "#ff0000");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  const corner = await layerScreenTarget(page, 0, 0);
  await page.mouse.click(corner.x, corner.y);
  await page.keyboard.press("o");
  await dragRect(page, 10, 10, 20, 20);
  const selection = await getFloatingSelection(page);
  expect(selection).not.toBeNull();
  expect(selection?.x).toBe(10);
  expect(selection?.y).toBe(10);
  expect(selection?.width).toBe(11);
  expect(selection?.height).toBe(11);
  expect(selection?.selected ?? 0).toBeGreaterThan(0);
  expect(selection?.selected ?? 121).toBeLessThan(121);
  // Center cut out, bbox corner left intact.
  expect(await readPixel(page, 15, 15)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 10, 10)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("lasso selection cuts a freehand shape", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setBrushColor(page, "#ff0000");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  const corner = await layerScreenTarget(page, 0, 0);
  await page.mouse.click(corner.x, corner.y);
  await page.keyboard.press("l");
  const corners = [
    await layerScreenTarget(page, 10, 10),
    await layerScreenTarget(page, 30, 10),
    await layerScreenTarget(page, 10, 30),
  ];
  const first = corners[0];
  if (first === undefined) {
    throw new Error("lasso start has no screen target");
  }
  await page.mouse.move(first.x, first.y);
  await page.mouse.down();
  for (const corner of corners.slice(1)) {
    await page.mouse.move(corner.x, corner.y, { steps: 5 });
  }
  await page.mouse.move(first.x, first.y, { steps: 5 });
  await page.mouse.up();
  const selection = await getFloatingSelection(page);
  expect(selection).not.toBeNull();
  expect(selection?.selected ?? 0).toBeGreaterThan(100);
  expect(await readPixel(page, 12, 12)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 28, 28)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("color selection cuts the contiguous region", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintDot(page, "#ff0000", 32, 32);
  await paintDot(page, "#0000ff", 10, 10);
  await paintDot(page, "#0000ff", 40, 40);
  await page.keyboard.press("w");
  const target = await layerScreenTarget(page, 10, 10);
  await page.mouse.click(target.x, target.y);
  expect(await getFloatingSelection(page)).toEqual({ x: 10, y: 10, width: 1, height: 1, selected: 1 });
  expect(await readPixel(page, 10, 10)).toEqual({ r: 0, g: 0, b: 255, a: 255 });
  expect(await readPixel(page, 40, 40)).toEqual({ r: 0, g: 0, b: 255, a: 255 });
});

test("color selection matches the whole texture when not contiguous", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintDot(page, "#ff0000", 32, 32);
  await paintDot(page, "#0000ff", 10, 10);
  await paintDot(page, "#0000ff", 40, 40);
  await page.keyboard.press("w");
  await page.locator("gnumarus-shell input#colorContiguous").uncheck();
  const target = await layerScreenTarget(page, 10, 10);
  await page.mouse.click(target.x, target.y);
  expect(await getFloatingSelection(page)).toEqual({ x: 10, y: 10, width: 31, height: 31, selected: 2 });
  expect(await readPixel(page, 10, 10)).toEqual({ r: 0, g: 0, b: 255, a: 255 });
  expect(await readPixel(page, 40, 40)).toEqual({ r: 0, g: 0, b: 255, a: 255 });
});

test("color selection threshold gates near matches", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await setBrushColor(page, "#ff0000");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  const corner = await layerScreenTarget(page, 0, 0);
  await page.mouse.click(corner.x, corner.y);
  await page.getByRole("button", { name: "Brush", exact: true }).click();
  await paintDot(page, "#fe0000", 20, 20);
  await page.keyboard.press("w");
  // Exact match selects only the contiguous near-red dot.
  await page.locator("gnumarus-shell input#colorThreshold").fill("0");
  const target = await layerScreenTarget(page, 20, 20);
  await page.mouse.click(target.x, target.y);
  expect(await getFloatingSelection(page)).toEqual({ x: 20, y: 20, width: 1, height: 1, selected: 1 });
  expect(await readPixel(page, 30, 30)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  // Undo, widen the tolerance, and the red background joins the selection.
  await page.keyboard.press("Control+z");
  await page.locator("gnumarus-shell input#colorThreshold").fill("2");
  await page.mouse.click(target.x, target.y);
  expect(await getFloatingSelection(page)).toEqual({ x: 0, y: 0, width: 64, height: 64, selected: 4096 });
});

test("boolean ops combine ellipse with rectangle", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintDot(page, "#ff0000", 32, 32);
  await selectTool(page, 'Rectangular selection');
  await dragRect(page, 10, 10, 12, 12);
  expect(await getFloatingSelection(page)).toEqual({ x: 10, y: 10, width: 3, height: 3, selected: 9 });
  await page.keyboard.press("o");
  await page.keyboard.down("Shift");
  await dragRect(page, 20, 20, 22, 22);
  await page.keyboard.up("Shift");
  expect(await getFloatingSelection(page)).toEqual({ x: 10, y: 10, width: 13, height: 13, selected: 18 });
  // Layer and floating selection both untouched by the mask-only union.
  expect(await readPixel(page, 11, 11)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  expect(await readPixel(page, 21, 21)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  expect(await readFloatingPixel(page, 1, 1)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
});

test("rectangular selection shift-drag adds to the selection", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setBrushColor(page, "#ff0000");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  const center = await layerScreenTarget(page, 32, 32);
  await page.mouse.click(center.x, center.y);
  await selectTool(page, 'Rectangular selection');
  await dragRect(page, 10, 10, 12, 12);
  expect(await getFloatingSelection(page)).toEqual({ x: 10, y: 10, width: 3, height: 3, selected: 9 });
  expect(await readPixel(page, 11, 11)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  await page.keyboard.down("Shift");
  const unionFrom = await layerScreenTarget(page, 20, 20);
  const unionTo = await layerScreenTarget(page, 22, 22);
  await page.mouse.move(unionFrom.x, unionFrom.y);
  await page.mouse.down();
  await page.mouse.move(unionTo.x, unionTo.y, { steps: 5 });
  // Both the rubber band and the previous selection stay visible mid-drag.
  expect(await selectionOverlayDisplay(page)).toBe("block");
  expect(await selectionMaskDisplay(page)).toBe("block");
  expect(await selectionMaskMoves(page)).toBe(4);
  await page.mouse.up();
  await page.keyboard.up("Shift");
  expect(await getFloatingSelection(page)).toEqual({ x: 10, y: 10, width: 13, height: 13, selected: 18 });
  expect(await readPixel(page, 21, 21)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 15, 15)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  // Two disjoint boxes trace two outlines, not one bbox outline.
  expect(await selectionOverlayDisplay(page)).toBe("none");
  expect(await selectionMaskDisplay(page)).toBe("block");
  expect(await selectionMaskMoves(page)).toBe(8);
});

test("rectangular selection ctrl-shift-drag intersects the selection", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setBrushColor(page, "#ff0000");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  const center = await layerScreenTarget(page, 32, 32);
  await page.mouse.click(center.x, center.y);
  await selectTool(page, 'Rectangular selection');
  await dragRect(page, 10, 10, 20, 20);
  expect(await getFloatingSelection(page)).toEqual({ x: 10, y: 10, width: 11, height: 11, selected: 121 });
  await page.keyboard.down("Control");
  await page.keyboard.down("Shift");
  await dragRect(page, 15, 15, 25, 25);
  await page.keyboard.up("Shift");
  await page.keyboard.up("Control");
  expect(await getFloatingSelection(page)).toEqual({ x: 15, y: 15, width: 6, height: 6, selected: 36 });
  expect(await readPixel(page, 12, 12)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 17, 17)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 30, 30)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  // Full-mask result keeps the quad polygon overlay.
  expect(await selectionOverlayDisplay(page)).toBe("block");
  expect(await selectionMaskDisplay(page)).toBe("none");
});

test("rectangular selection ctrl-shift-drag with no overlap clears the selection", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setBrushColor(page, "#ff0000");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  const center = await layerScreenTarget(page, 32, 32);
  await page.mouse.click(center.x, center.y);
  await selectTool(page, 'Rectangular selection');
  await dragRect(page, 10, 10, 12, 12);
  expect(await getFloatingSelection(page)).toEqual({ x: 10, y: 10, width: 3, height: 3, selected: 9 });
  await page.keyboard.down("Control");
  await page.keyboard.down("Shift");
  await dragRect(page, 40, 40, 42, 42);
  await page.keyboard.up("Shift");
  await page.keyboard.up("Control");
  expect(await getFloatingSelection(page)).toBeNull();
  expect(await readPixel(page, 11, 11)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("rectangular selection alt-shift-drag subtracts from the selection", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setBrushColor(page, "#ff0000");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  const center = await layerScreenTarget(page, 32, 32);
  await page.mouse.click(center.x, center.y);
  await selectTool(page, 'Rectangular selection');
  await dragRect(page, 10, 10, 20, 20);
  await page.keyboard.down("Alt");
  await page.keyboard.down("Shift");
  await dragRect(page, 15, 15, 25, 25);
  await page.keyboard.up("Shift");
  await page.keyboard.up("Alt");
  expect(await getFloatingSelection(page)).toEqual({ x: 10, y: 10, width: 11, height: 11, selected: 85 });
  expect(await readPixel(page, 12, 12)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 17, 17)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 30, 30)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  // The notch is traced: outline rendering switches to the mask path.
  expect(await selectionOverlayDisplay(page)).toBe("none");
  expect(await selectionMaskDisplay(page)).toBe("block");
});

test("rectangular selection alt-shift-drag with no overlap changes nothing", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setBrushColor(page, "#ff0000");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  const center = await layerScreenTarget(page, 32, 32);
  await page.mouse.click(center.x, center.y);
  await selectTool(page, 'Rectangular selection');
  await dragRect(page, 10, 10, 12, 12);
  await page.keyboard.down("Alt");
  await page.keyboard.down("Shift");
  await dragRect(page, 40, 40, 42, 42);
  await page.keyboard.up("Shift");
  await page.keyboard.up("Alt");
  expect(await getFloatingSelection(page)).toEqual({ x: 10, y: 10, width: 3, height: 3, selected: 9 });
  expect(await readPixel(page, 11, 11)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 41, 41)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("rectangular selection cuts to floating and destructive transform moves and merges", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await setBrushColor(page, "#ff0000");
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { setBrushSize(size: number): void } } };
    root.__gnumarus?.shell?.setBrushSize(3);
  });
  const center = await layerScreenTarget(page, 32, 32);
  await page.mouse.click(center.x, center.y);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  await selectTool(page, 'Destructive selection transform');
  await expect(page.getByRole("button", { name: "Commit selection" })).toBeDisabled();
  await selectTool(page, 'Rectangular selection');
  const start = await layerScreenTarget(page, 30, 30);
  const end = await layerScreenTarget(page, 34, 34);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 4 });
  await expect.poll(() => selectionOverlayDisplay(page)).toBe("block");
  await page.mouse.up();
  expect(await floatingRect(page)).toEqual({ x: 30, y: 30, width: 5, height: 5 });
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  await selectTool(page, 'Destructive selection transform');
  await expect(page.getByRole("button", { name: "Commit selection" })).toBeEnabled();
  const grab = await layerScreenTarget(page, 31, 31);
  const drop = await layerScreenTarget(page, 39, 31);
  await page.mouse.move(grab.x, grab.y);
  await page.mouse.down();
  await page.mouse.move(drop.x, drop.y, { steps: 4 });
  await page.mouse.up();
  expect(await floatingRect(page)).toEqual({ x: 38, y: 30, width: 5, height: 5 });
  await page.getByRole("button", { name: "Commit selection" }).click();
  expect(await selectionOverlayDisplay(page)).toBe("none");
  expect(await floatingRect(page)).toBeNull();
  await expect(page.locator("gnumarus-shell")).toContainText("Floating selection merged");
  await expect(page.getByRole("button", { name: "Commit selection" })).toBeDisabled();
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  expect(await readPixel(page, 40, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 40, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  expect(await readPixel(page, 30, 30)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
});

test("destructive transform auto-selects the whole texture and Esc merges", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await page.mouse.click((await layerScreenTarget(page, 32, 32)).x, (await layerScreenTarget(page, 32, 32)).y);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  await selectTool(page, 'Destructive selection transform');
  const center = await layerScreenTarget(page, 32, 32);
  await page.mouse.move(center.x, center.y);
  await page.mouse.down();
  await page.mouse.up();
  expect(await floatingRect(page)).toEqual({ x: 0, y: 0, width: 64, height: 64 });
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  await page.keyboard.press("Escape");
  expect(await floatingRect(page)).toBeNull();
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
});

test("undo and redo track the floating selection lifecycle", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setBrushColor(page, "#ff0000");
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { setBrushSize(size: number): void } } };
    root.__gnumarus?.shell?.setBrushSize(3);
  });
  const center = await layerScreenTarget(page, 32, 32);
  await page.mouse.click(center.x, center.y);
  await selectTool(page, 'Rectangular selection');
  const start = await layerScreenTarget(page, 30, 30);
  const end = await layerScreenTarget(page, 34, 34);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 4 });
  await page.mouse.up();
  expect(await floatingRect(page)).toEqual({ x: 30, y: 30, width: 5, height: 5 });
  // A later paint is an independent entry: undoing it keeps the selection.
  await page.keyboard.press("b");
  await setBrushColor(page, "#0000ff");
  const dot = await layerScreenTarget(page, 10, 10);
  await page.mouse.click(dot.x, dot.y);
  expect(await readPixel(page, 10, 10)).toEqual({ r: 0, g: 0, b: 255, a: 255 });
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 10, 10)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  expect(await selectionOverlayDisplay(page)).toBe("block");
  // The selection itself was never cut, so undoing the red dot just clears it.
  await page.keyboard.press("Control+z");
  expect(await selectionOverlayDisplay(page)).toBe("none");
  expect(await floatingRect(page)).toBeNull();
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  // Redoing the red dot reactivates the pending selection; nothing was cut.
  await page.keyboard.press("Control+y");
  expect(await selectionOverlayDisplay(page)).toBe("block");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  await page.keyboard.press("Control+y");
  expect(await readPixel(page, 10, 10)).toEqual({ r: 0, g: 0, b: 255, a: 255 });
});

test("floating selection survives frame switches hidden and merges explicitly", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const center = await layerScreenTarget(page, 32, 32);
  await page.mouse.click(center.x, center.y);
  await selectTool(page, 'Rectangular selection');
  const start = await layerScreenTarget(page, 30, 30);
  const end = await layerScreenTarget(page, 34, 34);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 4 });
  await page.mouse.up();
  expect(await floatingRect(page)).toEqual({ x: 30, y: 30, width: 5, height: 5 });
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  await matrix.locator('[data-testid="anim-frame"][data-frame="1"]').click();
  expect(await selectionOverlayDisplay(page)).toBe("none");
  expect(await floatingRect(page)).toEqual({ x: 30, y: 30, width: 5, height: 5 });
  await matrix.locator('[data-testid="anim-frame"][data-frame="0"]').click();
  expect(await selectionOverlayDisplay(page)).toBe("block");
  await page.keyboard.press("Enter");
  expect(await floatingRect(page)).toBeNull();
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
});

test("tool tooltips start with the selection shortcut", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  const titles = await page.evaluate(() => {
    const root = document.querySelector("gnumarus-shell")?.shadowRoot;
    const buttons = Array.from(root?.querySelectorAll(".toolbar button[aria-label]") ?? []);
    const entries: Array<{ label: string | null; title: string | null }> = [];
    for (const button of buttons) {
      const element = button as HTMLElement;
      // Slot content of a closed popup stays in the DOM unprojected.
      if (element.getBoundingClientRect().width <= 0) {
        continue;
      }
      if (element.getAttribute("aria-label") === "Final preview") {
        continue;
      }
      entries.push({ label: element.getAttribute("aria-label"), title: element.getAttribute("title") });
    }
    return entries;
  });
  expect(titles).toEqual([
    { label: "Brush", title: expect.stringMatching(/^B: Brush \(/) },
    { label: "Loupe", title: expect.stringMatching(/^Z: Loupe \(/) },
    { label: "Bucket fill", title: expect.stringMatching(/^G or F: Bucket fill \(/) },
    { label: "Eyedropper", title: expect.stringMatching(/^Ctrl \(hold\): Eyedropper \(/) },
    { label: "Text", title: expect.stringMatching(/^Text \(/) },
    { label: "Tile brush", title: "Tile brush (click an empty cell to create a tilemap, click a tilemap cell to place the selected tile; right-click erases; drag paints a stroke; Shift+click draws a tile line from the last tile; Ctrl+Shift+click fills a tile rectangle)" },
    { label: "Rectangle", title: expect.stringMatching(/^D: Rectangle \(/) },
    { label: "Shading", title: expect.stringMatching(/^S: Shading \(/) },
    { label: "3D model transform", title: expect.stringMatching(/^3D model transform \(drag to orbit/) },
    { label: "Rectangular selection", title: expect.stringMatching(/^R: Rectangular selection \(/) },
    { label: "Destructive selection transform", title: expect.stringMatching(/^V: Destructive selection transform \(/) },
    { label: "Non-destructive cell transform", title: expect.stringMatching(/^T: Non-destructive cell transform \(/) },
    { label: "Background paint color (X swaps)", title: "Edit the background color" },
    { label: "Foreground paint color (paints)", title: "Edit the foreground color" },
    { label: "Swap paint colors", title: "Swap foreground and background paint colors (X)" },
  ]);
});

test("R and V select the rectangular selection and destructive transform tools", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await expect(page.locator("gnumarus-shell")).toContainText("brush");
  await page.keyboard.press("r");
  await expect(page.locator("gnumarus-shell")).toContainText("rectangular selection");
  await page.keyboard.press("b");
  await expect(page.locator("gnumarus-shell")).toContainText("brush");
  await page.keyboard.press("v");
  await expect(page.locator("gnumarus-shell")).toContainText("destructive selection transform");
  await expect(page.getByRole("button", { name: "Commit selection" })).toBeVisible();
  await page.keyboard.press("V");
  await expect(page.locator("gnumarus-shell")).toContainText("destructive selection transform");
  await page.keyboard.press("R");
  await expect(page.locator("gnumarus-shell")).toContainText("rectangular selection");
});

test("rectangular selection chains three unions", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setBrushColor(page, "#ff0000");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  const center = await layerScreenTarget(page, 32, 32);
  await page.mouse.click(center.x, center.y);
  await selectTool(page, 'Rectangular selection');
  await dragRect(page, 5, 5, 7, 7);
  expect(await getFloatingSelection(page)).toEqual({ x: 5, y: 5, width: 3, height: 3, selected: 9 });
  await page.keyboard.down("Shift");
  await dragRect(page, 20, 20, 22, 22);
  expect(await getFloatingSelection(page)).toEqual({ x: 5, y: 5, width: 18, height: 18, selected: 18 });
  // Third disjoint union: mid-drag both overlays, three outlines after.
  const thirdFrom = await layerScreenTarget(page, 40, 40);
  const thirdTo = await layerScreenTarget(page, 42, 42);
  await page.mouse.move(thirdFrom.x, thirdFrom.y);
  await page.mouse.down();
  await page.mouse.move(thirdTo.x, thirdTo.y, { steps: 5 });
  expect(await selectionOverlayDisplay(page)).toBe("block");
  expect(await selectionMaskDisplay(page)).toBe("block");
  await page.mouse.up();
  await page.keyboard.up("Shift");
  expect(await getFloatingSelection(page)).toEqual({ x: 5, y: 5, width: 38, height: 38, selected: 27 });
  expect(await selectionMaskDisplay(page)).toBe("block");
  expect(await selectionMaskMoves(page)).toBe(12);
});

test("rectangular selection stays pending without cutting the layer @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await setBrushColor(page, "#ff0000");
  await paintCenter(page);
  await selectTool(page, "Rectangular selection");
  await dragRect(page, 28, 28, 36, 36);
  // No hole: the layer is intact and the selection is pending.
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await getFloatingSelection(page)).not.toBeNull();
  expect(await floatingRect(page)).toEqual({ x: 28, y: 28, width: 9, height: 9 });
  // Copy leaves the layer (and the pending selection) untouched.
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { runAction(id: string): boolean } } };
    root.__gnumarus?.shell?.runAction("copy-selection");
  });
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await getFloatingSelection(page)).not.toBeNull();
  // Committing a pending selection just clears it.
  await page.keyboard.press("Enter");
  expect(await getFloatingSelection(page)).toBeNull();
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("pending rect resizes via corner handle without touching pixels @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await setBrushColor(page, "#ff0000");
  await paintCenter(page);
  await selectTool(page, "Rectangular selection");
  await dragRect(page, 28, 28, 36, 36);
  const zoom = (await getViewState(page)).zoom;
  await expect
    .poll(() => getFloatingSelection(page).then((selection) => (selection === null ? 0 : 1)))
    .toBe(1);
  const handle = await getPendingResizeHandle(page, "se");
  await page.mouse.move(handle.x, handle.y);
  await page.mouse.down();
  await page.mouse.move(handle.x + 8 * zoom, handle.y + 8 * zoom, { steps: 6 });
  await page.mouse.up();
  expect(await floatingRect(page)).toMatchObject({ x: 28, y: 28, width: 17, height: 17 });
  // Mask-only resize: painted pixels stay, empty stays empty, no hole anywhere.
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 40, 40)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  expect(await readPixel(page, 28, 28)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
});

test("pending rect resizes from any border point, not just handles @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await setBrushColor(page, "#ff0000");
  await paintCenter(page);
  await selectTool(page, "Rectangular selection");
  await dragRect(page, 28, 28, 36, 36);
  // A quarter along the top edge: no handle lives there, but the continuous
  // border band still grabs it as a north resize. The grab point is the
  // pixel center, so +4 lands on a .5 boundary and rounds up.
  const grab = await layerScreenTarget(page, 30, 28);
  const zoom = (await getViewState(page)).zoom;
  await page.mouse.move(grab.x, grab.y);
  await page.mouse.down();
  await page.mouse.move(grab.x, grab.y + 4 * zoom, { steps: 6 });
  await page.mouse.up();
  expect(await floatingRect(page)).toMatchObject({ x: 28, y: 33, width: 9, height: 4 });
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("pending ellipse resizes via edge handle @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await setBrushColor(page, "#ff0000");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  const corner = await layerScreenTarget(page, 0, 0);
  await page.mouse.click(corner.x, corner.y);
  const drawer = page.locator('gnumarus-shell [data-testid="selection-drawer"]');
  await drawer.getByRole("button", { name: "Rectangular selection" }).click({ button: "right" });
  await page.locator('gnumarus-shell [data-testid="selection-flyout"]').getByRole("button", { name: "Elliptical selection" }).click();
  await dragRect(page, 10, 10, 20, 20);
  const before = await floatingRect(page);
  expect(before).toMatchObject({ width: 11, height: 11 });
  const zoom = (await getViewState(page)).zoom;
  await expect
    .poll(() => getFloatingSelection(page).then((selection) => (selection === null ? 0 : 1)))
    .toBe(1);
  const handle = await getPendingResizeHandle(page, "e");
  await page.mouse.move(handle.x, handle.y);
  await page.mouse.down();
  await page.mouse.move(handle.x + 6 * zoom, handle.y, { steps: 6 });
  await page.mouse.up();
  const after = await floatingRect(page);
  expect(after?.width ?? 0).toBeGreaterThan(before?.width ?? 0);
  expect(after?.height).toBe(before?.height);
  // Ellipse mask, layer intact.
  const selection = await getFloatingSelection(page);
  expect(selection?.selected ?? 0).toBeGreaterThan(0);
  expect(selection?.selected ?? 0).toBeLessThan((after?.width ?? 0) * (after?.height ?? 0));
  expect(await readPixel(page, 15, 15)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("dragged pending selection shows its pixels while moving @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await setBrushColor(page, "#ff0000");
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { setBrushSize(size: number): void } };
    };
    root.__gnumarus?.engine?.setBrushSize(9);
  });
  await paintCenter(page);
  await selectTool(page, "Rectangular selection");
  await dragRect(page, 24, 24, 40, 40);
  await selectTool(page, "Destructive selection transform");
  const from = await layerScreenTarget(page, 32, 32);
  const to = await layerScreenTarget(page, 42, 32);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 5 });
  // The floating plane carries the cut pixels: the moved area paints red
  // on the composited canvas instead of a transparent hole.
  expect(await canvasScreenPixel(page, to.x, to.y)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  await page.mouse.up();
  await page.keyboard.press("Enter");
  expect(await readPixel(page, 42, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("rect and ellipse select on empty and textureless cells @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  // No paint at all: the cell has no texture yet.
  await selectTool(page, "Rectangular selection");
  await dragRect(page, 10, 10, 20, 20);
  expect(await getFloatingSelection(page)).toEqual({ x: 10, y: 10, width: 11, height: 11, selected: 121 });
  await page.keyboard.press("Escape");
  const drawer = page.locator('gnumarus-shell [data-testid="selection-drawer"]');
  await drawer.getByRole("button", { name: "Rectangular selection" }).click({ button: "right" });
  await page.locator('gnumarus-shell [data-testid="selection-flyout"]').getByRole("button", { name: "Elliptical selection" }).click();
  await dragRect(page, 10, 10, 20, 20);
  const ellipse = await getFloatingSelection(page);
  expect(ellipse).not.toBeNull();
  expect(ellipse?.selected ?? 0).toBeGreaterThan(0);
  await page.keyboard.press("Escape");
  // Textureless content (New content > No texture) selects too.
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.locator('[data-testid="anim-cell"][data-matrix-frame="0"]').click({ button: "right" });
  await page.getByRole("button", { name: "Select content" }).click();
  await page.locator('gnumarus-shell [data-testid="content-picker-new"]').click();
  await page.locator('gnumarus-shell [data-testid="texture-picker-none"]').click();
  await selectTool(page, "Rectangular selection");
  await dragRect(page, 12, 12, 22, 22);
  expect(await getFloatingSelection(page)).toEqual({ x: 12, y: 12, width: 11, height: 11, selected: 121 });
});
