import { expect, test } from "@playwright/test";
import { cutRedBlock, cutSingleRedPixel, floatingRect, getAxisOverlay, getFloatingTransform, getLayerTransform, getPlaneMatrix, getSelectionHandle, getViewState, layerDragHandle, layerScreenTarget, loadBlankProject, loadRedProject, paintCenter, readPixel, redPixelCount, rot3DCenter, rot3DHandle, selectTool, setPencil, zoomToFitLayer } from "./e2e-helpers";

test("final preview follows non-destructive transforms live", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintCenter(page);
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  await page.getByRole("button", { name: "Final preview" }).click();
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
  expect(await previewPixel(32, 32)).toEqual([0, 0, 0, 255]);
  await selectTool(page, 'Non-destructive cell transform');
  const zoom = (await getViewState(page)).zoom;
  const shift = 10;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + shift * zoom, box.y + box.height / 2, { steps: 4 });
  // Still holding the button: the open preview already shows the moved layer.
  await expect.poll(() => previewPixel(32, 32)).toEqual([148, 148, 148, 255]);
  await expect.poll(() => previewPixel(32 + shift, 32)).toEqual([0, 0, 0, 255]);
  await page.mouse.up();
  expect(await previewPixel(32 + shift, 32)).toEqual([0, 0, 0, 255]);
  // Reset transform refreshes the preview too.
  await page.locator('gnumarus-shell [data-layer-id="layer0"]').click({ button: "right" });
  await page.getByRole("button", { name: "Reset transform" }).click();
  await expect.poll(() => previewPixel(32, 32)).toEqual([0, 0, 0, 255]);
});

test("matrix layer names rename layers through a context menu", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  const nameCell = matrix.locator('[data-testid="anim-layer-name"][data-matrix-layer="layer0"]');
  await expect(nameCell).toContainText("L1");
  await nameCell.click({ button: "right" });
  await page.getByRole("button", { name: "Rename layer…" }).click();
  await expect(page.locator("gnumarus-shell dialog#layerRenameDialog")).toBeVisible();
  await page.locator("gnumarus-shell input#layerRename").fill("Backdrop");
  await page.getByRole("button", { name: "Rename", exact: true }).click();
  await expect(nameCell).toContainText("Backdrop");
  await expect(page.locator('gnumarus-shell [data-layer-id="layer0"] .layer-name')).toContainText("Backdrop");
  await expect(page.locator("gnumarus-shell")).toContainText("Layer renamed");
  // Empty names are rejected like in the other rename dialogs.
  await nameCell.click({ button: "right" });
  await page.getByRole("button", { name: "Rename layer…" }).click();
  await page.locator("gnumarus-shell input#layerRename").fill("   ");
  await page.getByRole("button", { name: "Rename", exact: true }).click();
  await expect(nameCell).toContainText("Backdrop");
});

test("canvas shows red X and green Y axis lines following the cell transform", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintCenter(page);
  const zoom = (await getViewState(page)).zoom;
  const span = 64 * zoom;
  let axes = await getAxisOverlay(page);
  expect(axes.visible).toBe(true);
  expect(axes.xColor).toBe("#ff0000");
  expect(axes.yColor).toBe("#00ff00");
  expect(axes.borderColor).toBe("#ff00ff");
  // X runs along the top edge, Y along the left edge.
  expect(axes.xAxis.ay).toBeCloseTo(axes.xAxis.by, 5);
  expect(axes.xAxis.ax).toBeLessThan(axes.xAxis.bx);
  expect(axes.xAxis.bx - axes.xAxis.ax).toBeCloseTo(span, 0);
  expect(axes.yAxis.ax).toBeCloseTo(axes.yAxis.bx, 5);
  expect(axes.yAxis.by).toBeGreaterThan(axes.yAxis.ay);
  expect(axes.yAxis.by - axes.yAxis.ay).toBeCloseTo(span, 0);
  expect(axes.xAxis.ax).toBeCloseTo(axes.yAxis.ax, 5);
  expect(axes.xAxis.ay).toBeCloseTo(axes.yAxis.ay, 5);
  // Magenta borders close the rectangle on the right and bottom edges.
  expect(axes.rightBorder.ax).toBeCloseTo(axes.xAxis.bx, 5);
  expect(axes.rightBorder.ay).toBeCloseTo(axes.xAxis.by, 5);
  expect(axes.rightBorder.bx).toBeCloseTo(axes.bottomBorder.bx, 5);
  expect(axes.rightBorder.by).toBeCloseTo(axes.bottomBorder.by, 5);
  expect(axes.bottomBorder.ax).toBeCloseTo(axes.yAxis.bx, 5);
  expect(axes.bottomBorder.ay).toBeCloseTo(axes.yAxis.by, 5);
  expect(axes.rightBorder.ax).toBeCloseTo(axes.rightBorder.bx, 5);
  expect(axes.bottomBorder.ay).toBeCloseTo(axes.bottomBorder.by, 5);
  // A 90 degree layer rotation swaps the on-screen axes.
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { setLayerTransform(id: string, transform: { rotation: number }): boolean } };
    };
    root.__gnumarus?.engine?.setLayerTransform("layer0", { rotation: Math.PI / 2 });
  });
  axes = await getAxisOverlay(page);
  expect(axes.xAxis.ax).toBeCloseTo(axes.xAxis.bx, 5);
  expect(axes.xAxis.by).toBeGreaterThan(axes.xAxis.ay);
  expect(axes.yAxis.ay).toBeCloseTo(axes.yAxis.by, 5);
  // A horizontal flip mirrors the X arrowhead direction.
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { setLayerTransform(id: string, transform: { rotation: number; flipX: boolean }): boolean } };
    };
    root.__gnumarus?.engine?.setLayerTransform("layer0", { rotation: 0, flipX: true });
  });
  axes = await getAxisOverlay(page);
  expect(axes.xAxis.bx).toBeLessThan(axes.xAxis.ax);
  expect(axes.xAxis.bx - axes.xAxis.ax).toBeCloseTo(-span, 0);
  // Empty cells hide the axes.
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  await matrix.locator('[data-testid="anim-frame"][data-frame="1"]').click();
  expect((await getAxisOverlay(page)).visible).toBe(false);
});

test("corner anchors resize the floating selection", async ({ page }) => {
  await cutRedBlock(page);
  expect(await floatingRect(page)).toEqual({ x: 30, y: 30, width: 5, height: 5 });
  const zoom = (await getViewState(page)).zoom;
  const anchor = await getSelectionHandle(page, "resize-se");
  await page.mouse.move(anchor.x, anchor.y);
  await page.mouse.down();
  await page.mouse.move(anchor.x + 5 * zoom, anchor.y, { steps: 4 });
  await page.mouse.up();
  const transform = await getFloatingTransform(page);
  expect(transform?.scaleX).toBeCloseTo(2, 6);
  expect(transform?.scaleY).toBeCloseTo(1, 6);
  await page.getByRole("button", { name: "Commit selection" }).click();
  expect(await readPixel(page, 34, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 35, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 30, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  expect(await readPixel(page, 39, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  expect(await redPixelCount(page, 28, 28, 42, 36)).toBeGreaterThanOrEqual(15);
  expect(await redPixelCount(page, 28, 28, 42, 36)).toBeLessThanOrEqual(21);
});

test("alt-drag keeps floating resize proportional @recent", async ({ page }) => {
  await cutRedBlock(page);
  const zoom = (await getViewState(page)).zoom;
  const anchor = await getSelectionHandle(page, "resize-se");
  await page.keyboard.down("Alt");
  await page.mouse.move(anchor.x, anchor.y);
  await page.mouse.down();
  await page.mouse.move(anchor.x + 5 * zoom, anchor.y, { steps: 4 });
  await page.mouse.up();
  await page.keyboard.up("Alt");
  // Same horizontal drag as without Alt, but the height follows the width.
  const transform = await getFloatingTransform(page);
  expect(transform?.scaleX).toBeCloseTo(2, 6);
  expect(transform?.scaleY).toBeCloseTo(2, 6);
});

test("rotate anchors turn the floating selection", async ({ page }) => {
  await cutRedBlock(page);
  const box = await page.locator("gnumarus-shell canvas").boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const grab = await getSelectionHandle(page, "rotate-se");
  const grabLocal = { x: grab.x - box.x, y: grab.y - box.y };
  const center = await getSelectionHandle(page, "center");
  const centerLocal = { x: center.x - box.x, y: center.y - box.y };
  const grabAngle = Math.atan2(grabLocal.y - centerLocal.y, grabLocal.x - centerLocal.x);
  const dropAngle = grabAngle + Math.PI / 2;
  const radius = Math.sqrt(
    (grabLocal.x - centerLocal.x) * (grabLocal.x - centerLocal.x) +
      (grabLocal.y - centerLocal.y) * (grabLocal.y - centerLocal.y),
  );
  const drop = {
    x: box.x + centerLocal.x + Math.cos(dropAngle) * radius,
    y: box.y + centerLocal.y + Math.sin(dropAngle) * radius,
  };
  await page.mouse.move(grab.x, grab.y);
  await page.mouse.down();
  await page.mouse.move(drop.x, drop.y, { steps: 8 });
  await page.mouse.up();
  expect((await getFloatingTransform(page))?.rotation).toBeCloseTo(Math.PI / 2, 2);
  await page.keyboard.press("Enter");
  expect(await floatingRect(page)).toBeNull();
  // The symmetric block survives the quarter turn exactly.
  expect(await redPixelCount(page, 28, 28, 38, 38)).toBe(9);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("skew anchors shear the floating selection on their axis", async ({ page }) => {
  await cutRedBlock(page);
  const zoom = (await getViewState(page)).zoom;
  const anchor = await getSelectionHandle(page, "skew-n");
  await page.mouse.move(anchor.x, anchor.y);
  await page.mouse.down();
  await page.mouse.move(anchor.x + 5 * zoom, anchor.y, { steps: 4 });
  await page.mouse.up();
  // The dragged top edge follows right (negative centered shear); the
  // bottom edge mirrors left, the center stays fixed.
  expect((await getFloatingTransform(page))?.skewX).toBeCloseTo(-1, 6);
  await page.keyboard.press("Enter");
  expect(await readPixel(page, 34, 31)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 31, 31)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  expect(await readPixel(page, 30, 33)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 34, 33)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await redPixelCount(page, 28, 28, 40, 36)).toBe(9);
});

test("opposite skew anchors mirror each other and ignore perpendicular drags", async ({ page }) => {
  await cutRedBlock(page);
  const zoom = (await getViewState(page)).zoom;
  // Bottom edge follows right with the opposite sign of the top edge.
  const bottom = await getSelectionHandle(page, "skew-s");
  await page.mouse.move(bottom.x, bottom.y);
  await page.mouse.down();
  await page.mouse.move(bottom.x + 5 * zoom, bottom.y, { steps: 4 });
  await page.mouse.up();
  expect((await getFloatingTransform(page))?.skewX).toBeCloseTo(1, 6);
  await page.keyboard.press("Escape");
  // Perpendicular drags do nothing: vertical on top/bottom.
  await cutRedBlock(page);
  const top = await getSelectionHandle(page, "skew-n");
  await page.mouse.move(top.x, top.y);
  await page.mouse.down();
  await page.mouse.move(top.x, top.y + 5 * zoom, { steps: 4 });
  await page.mouse.up();
  expect((await getFloatingTransform(page))?.skewX).toBeCloseTo(0, 6);
  await page.keyboard.press("Escape");
  // Left edge follows down; horizontal drag does nothing.
  await cutRedBlock(page);
  const left = await getSelectionHandle(page, "skew-w");
  await page.mouse.move(left.x, left.y);
  await page.mouse.down();
  await page.mouse.move(left.x, left.y + 5 * zoom, { steps: 4 });
  await page.mouse.up();
  expect((await getFloatingTransform(page))?.skewY).toBeCloseTo(-1, 6);
  await page.keyboard.press("Escape");
  await cutRedBlock(page);
  const leftFlat = await getSelectionHandle(page, "skew-w");
  await page.mouse.move(leftFlat.x, leftFlat.y);
  await page.mouse.down();
  await page.mouse.move(leftFlat.x + 5 * zoom, leftFlat.y, { steps: 4 });
  await page.mouse.up();
  expect((await getFloatingTransform(page))?.skewY).toBeCloseTo(0, 6);
  await page.keyboard.press("Escape");
  // Right edge follows down with the opposite sign of the left edge.
  await cutRedBlock(page);
  const right = await getSelectionHandle(page, "skew-e");
  await page.mouse.move(right.x, right.y);
  await page.mouse.down();
  await page.mouse.move(right.x, right.y + 5 * zoom, { steps: 4 });
  await page.mouse.up();
  expect((await getFloatingTransform(page))?.skewY).toBeCloseTo(1, 6);
  await page.keyboard.press("Escape");
});

test("flip anchors mirror the floating selection about its center", async ({ page }) => {
  // flip-n (above center) toggles the horizontal mirror: pixel (31,32)
  // relocates to (33,32), mirrored about the cut center 32.5.
  await cutSingleRedPixel(page, 31, 32);
  const flipN = await getSelectionHandle(page, "flip-n");
  await page.mouse.click(flipN.x, flipN.y);
  expect((await getFloatingTransform(page))?.flipX).toBe(true);
  await page.keyboard.press("Enter");
  expect(await readPixel(page, 33, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 31, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  // flip-e (right of center) toggles the vertical mirror: (31,31) -> (31,33).
  await cutSingleRedPixel(page, 31, 31);
  const flipE = await getSelectionHandle(page, "flip-e");
  await page.mouse.click(flipE.x, flipE.y);
  expect((await getFloatingTransform(page))?.flipY).toBe(true);
  await page.keyboard.press("Enter");
  expect(await readPixel(page, 31, 33)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 31, 31)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
});

test("non-destructive resize anchors scale the layer about the opposite edge", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadRedProject(page, 64, 64, 0, 0);
  await layerDragHandle(page, "resize-se", 5, 0);
  const transform = await getLayerTransform(page);
  // Dragging the corner 5 layer-px right widens 64px to 69px; the west
  // edge stays anchored, so the center shifts right by half the growth.
  expect(transform.scaleX).toBeCloseTo(69 / 64, 6);
  expect(transform.scaleY).toBeCloseTo(1, 6);
  expect(transform.x).toBeCloseTo(2.5, 4);
  expect(transform.y).toBeCloseTo(0, 6);
});

test("alt-drag keeps non-destructive resize proportional @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadRedProject(page, 64, 64, 0, 0);
  await layerDragHandle(page, "resize-se", 5, 0, true);
  // Same horizontal drag as without Alt, but the height follows the width
  // (69/64 on both axes) and the center shifts diagonally.
  const transform = await getLayerTransform(page);
  expect(transform.scaleX).toBeCloseTo(69 / 64, 6);
  expect(transform.scaleY).toBeCloseTo(69 / 64, 6);
  expect(transform.x).toBeCloseTo(2.5, 4);
  expect(transform.y).toBeCloseTo(2.5, 4);
});

test("non-destructive rotate anchors turn the layer about its center", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await zoomToFitLayer(page);
  await selectTool(page, 'Non-destructive cell transform');
  const box = await page.locator("gnumarus-shell canvas").boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const grab = await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getSelectionHandles(): Array<{ id: string; x: number; y: number }> } };
    };
    const handles = root.__gnumarus?.engine?.getSelectionHandles() ?? [];
    const anchor = handles.find((handle) => handle.id === "rotate-se") ?? null;
    const center = handles.find((handle) => handle.id === "center") ?? null;
    return { anchor, center };
  });
  if (grab.anchor === null || grab.center === null) {
    throw new Error("rotate anchors are missing");
  }
  const grabAngle = Math.atan2(grab.anchor.y - grab.center.y, grab.anchor.x - grab.center.x);
  const dropAngle = grabAngle + Math.PI / 2;
  const radius = Math.sqrt(
    (grab.anchor.x - grab.center.x) * (grab.anchor.x - grab.center.x) +
      (grab.anchor.y - grab.center.y) * (grab.anchor.y - grab.center.y),
  );
  await page.mouse.move(box.x + grab.anchor.x, box.y + grab.anchor.y);
  await page.mouse.down();
  await page.mouse.move(
    box.x + grab.center.x + Math.cos(dropAngle) * radius,
    box.y + grab.center.y + Math.sin(dropAngle) * radius,
    { steps: 8 },
  );
  await page.mouse.up();
  expect((await getLayerTransform(page)).rotation).toBeCloseTo(Math.PI / 2, 2);
});

test("non-destructive skew anchors mirror each other and ignore perpendicular drags", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadRedProject(page, 64, 64, 0, 0);
  // Top edge follows right with a negative shear; dragging vertically does nothing.
  await layerDragHandle(page, "skew-n", 5, 0);
  expect((await getLayerTransform(page)).skewX).toBeCloseTo(-5 / 64, 6);
  await layerDragHandle(page, "skew-n", 0, 5);
  expect((await getLayerTransform(page)).skewX).toBeCloseTo(-5 / 64, 6);
  // Bottom edge follows right with the opposite sign.
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { resetLayerTransform(id: string): boolean } } };
    root.__gnumarus?.engine?.resetLayerTransform("layer0");
  });
  await layerDragHandle(page, "skew-s", 5, 0);
  expect((await getLayerTransform(page)).skewX).toBeCloseTo(5 / 64, 6);
});

test("non-destructive flip anchors toggle the layer mirrors", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await zoomToFitLayer(page);
  await selectTool(page, 'Non-destructive cell transform');
  const box = await page.locator("gnumarus-shell canvas").boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const clickHandle = async (id: string): Promise<void> => {
    const position = await page.evaluate((handleId: string) => {
      const root = window as unknown as {
        __gnumarus?: { engine?: { getSelectionHandles(): Array<{ id: string; x: number; y: number }> } };
      };
      return root.__gnumarus?.engine?.getSelectionHandles().find((handle) => handle.id === handleId) ?? null;
    }, id);
    if (position === null) {
      throw new Error(`layer handle ${id} is missing`);
    }
    await page.mouse.click(box.x + position.x, box.y + position.y);
  };
  await clickHandle("flip-n");
  expect((await getLayerTransform(page)).flipX).toBe(true);
  await clickHandle("flip-e");
  expect((await getLayerTransform(page)).flipY).toBe(true);
  await clickHandle("flip-n");
  expect((await getLayerTransform(page)).flipX).toBe(false);
});

test("non-destructive center anchor resets the layer transform", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadRedProject(page, 64, 64, 0, 0);
  await layerDragHandle(page, "resize-se", 5, 0);
  expect((await getLayerTransform(page)).scaleX).toBeCloseTo(69 / 64, 6);
  await zoomToFitLayer(page);
  await selectTool(page, 'Non-destructive cell transform');
  const box = await page.locator("gnumarus-shell canvas").boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const position = await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getSelectionHandles(): Array<{ id: string; x: number; y: number }> } };
    };
    return root.__gnumarus?.engine?.getSelectionHandles().find((handle) => handle.id === "center") ?? null;
  });
  if (position === null) {
    throw new Error("layer center handle is missing");
  }
  await page.mouse.click(box.x + position.x, box.y + position.y);
  expect(await getLayerTransform(page)).toMatchObject({
    x: 0,
    y: 0,
    rotation: 0,
    flipX: false,
    flipY: false,
    scaleX: 1,
    scaleY: 1,
    skewX: 0,
    skewY: 0,
  });
});

test("center anchor resets the floating transform to the as-cut state", async ({ page }) => {
  await cutRedBlock(page);
  const zoom = (await getViewState(page)).zoom;
  const corner = await getSelectionHandle(page, "resize-se");
  await page.mouse.move(corner.x, corner.y);
  await page.mouse.down();
  await page.mouse.move(corner.x + 5 * zoom, corner.y, { steps: 4 });
  await page.mouse.up();
  expect((await getFloatingTransform(page))?.scaleX).toBeCloseTo(2, 6);
  const skew = await getSelectionHandle(page, "skew-n");
  await page.mouse.move(skew.x, skew.y);
  await page.mouse.down();
  await page.mouse.move(skew.x + 5 * zoom, skew.y, { steps: 4 });
  await page.mouse.up();
  expect((await getFloatingTransform(page))?.skewX).toBeCloseTo(-1, 6);
  const center = await getSelectionHandle(page, "center");
  await page.mouse.click(center.x, center.y);
  expect(await getFloatingTransform(page)).toMatchObject({
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    skewX: 0,
    skewY: 0,
  });
  expect(await floatingRect(page)).toEqual({ x: 30, y: 30, width: 5, height: 5 });
  await page.getByRole("button", { name: "Commit selection" }).click();
  expect(await redPixelCount(page, 28, 28, 38, 38)).toBe(9);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 30, 30)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
});

test("floating plane renders over the layer without shift or flip", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await selectTool(page, 'Destructive selection transform');
  const box = await page.locator("gnumarus-shell canvas").boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  // Auto-select-all covers the whole texture at identity: the floating quad
  // must coincide with the layer quad (same basis, only render depth differs).
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  const layerMatrix = await getPlaneMatrix(page, "layer");
  const floatingMatrix = await getPlaneMatrix(page, "floating");
  expect(layerMatrix).not.toBeNull();
  expect(floatingMatrix).not.toBeNull();
  for (let index = 0; index < 16; index += 1) {
    if (index === 14) {
      continue;
    }
    expect(floatingMatrix?.[index]).toBeCloseTo(layerMatrix?.[index] ?? 0, 6);
  }
  // Moves translate the quad in screen space without mirroring the basis.
  const zoom = (await getViewState(page)).zoom;
  const before = await getPlaneMatrix(page, "floating");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 10 * zoom, box.y + box.height / 2, { steps: 4 });
  await page.mouse.up();
  const after = await getPlaneMatrix(page, "floating");
  expect((after?.[12] ?? 0) - (before?.[12] ?? 0)).toBeCloseTo(10 * zoom, 4);
  expect((after?.[13] ?? 0) - (before?.[13] ?? 0)).toBeCloseTo(0, 4);
  for (const index of [0, 1, 4, 5]) {
    expect(after?.[index]).toBeCloseTo(before?.[index] ?? 0, 6);
  }
});

test("Y and U select the cell/selection 3d rotation tools", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.keyboard.press("y");
  await expect(page.locator("gnumarus-shell")).toContainText("3d rotation");
  await page.keyboard.press("u");
  await expect(page.locator("gnumarus-shell")).toContainText("destructive selection 3d rotation");
  await expect(page.getByRole("button", { name: "Commit selection" })).toBeVisible();
  await page.keyboard.press("Y");
  await expect(page.locator("gnumarus-shell")).toContainText("3d rotation");
});

test("cell 3d rotation trackball tilts the layer in the dragged direction", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await page.keyboard.press("y");
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { setZoom(zoom: number): void } } };
    root.__gnumarus?.engine?.setZoom(4);
  });
  // Sphere radius is half the 64px layer times zoom 4 = 128 screen px.
  const center = await rot3DCenter(page);
  await page.mouse.move(center.x, center.y);
  await page.mouse.down();
  await page.mouse.move(center.x + 40, center.y, { steps: 4 });
  await page.mouse.up();
  expect((await getLayerTransform(page)).rotationY).toBeCloseTo(-40 / 128, 4);
  expect((await getLayerTransform(page)).rotationX).toBeCloseTo(0, 6);
  await page.mouse.move(center.x, center.y);
  await page.mouse.down();
  await page.mouse.move(center.x, center.y + 40, { steps: 4 });
  await page.mouse.up();
  expect((await getLayerTransform(page)).rotationX).toBeCloseTo(40 / 128, 4);
});

test("cell 3d rotation axis handles turn a single axis", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await page.keyboard.press("y");
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { setZoom(zoom: number): void } } };
    root.__gnumarus?.engine?.setZoom(4);
  });
  const handle = await rot3DHandle(page, "rot3d-x");
  await page.mouse.move(handle.x, handle.y);
  await page.mouse.down();
  await page.mouse.move(handle.x, handle.y + 40, { steps: 4 });
  await page.mouse.up();
  // The grabbed ring point follows the cursor down its own ring: X turns
  // negative while Y stays put (tangent curvature overshoots the linear
  // 40/128 estimate, so assert sign, isolation and a sane magnitude).
  const tilted = await getLayerTransform(page);
  expect(tilted.rotationX).toBeLessThan(-0.2);
  expect(tilted.rotationX).toBeGreaterThan(-1.2);
  expect(tilted.rotationY).toBeCloseTo(0, 6);
  // Z handle drags spin the layer rotation.
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { resetLayerTransform(id: string): boolean } } };
    root.__gnumarus?.engine?.resetLayerTransform("layer0");
  });
  const zHandle = await rot3DHandle(page, "rot3d-z");
  await page.mouse.move(zHandle.x, zHandle.y);
  await page.mouse.down();
  await page.mouse.move(zHandle.x + 40, zHandle.y, { steps: 4 });
  await page.mouse.up();
  const spun = await getLayerTransform(page);
  expect(Math.abs(spun.rotation)).toBeGreaterThan(0.05);
  expect(spun.rotationX).toBeCloseTo(0, 6);
  expect(spun.rotationY).toBeCloseTo(0, 6);
});

test("cell 3d rotation center resets only the rotations", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  // Displace the layer first with the 2d tool so the reset scope is visible.
  await selectTool(page, 'Non-destructive cell transform');
  const box = await page.locator("gnumarus-shell canvas").boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2, { steps: 4 });
  await page.mouse.up();
  expect((await getLayerTransform(page)).x).not.toBeCloseTo(0, 6);
  await page.keyboard.press("y");
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { setZoom(zoom: number): void } } };
    root.__gnumarus?.engine?.setZoom(4);
  });
  const center = await rot3DCenter(page);
  await page.mouse.move(center.x, center.y);
  await page.mouse.down();
  await page.mouse.move(center.x + 40, center.y, { steps: 4 });
  await page.mouse.up();
  expect((await getLayerTransform(page)).rotationY).toBeCloseTo(-40 / 128, 4);
  const displaced = await getLayerTransform(page);
  const centerAgain = await rot3DCenter(page);
  await page.mouse.click(centerAgain.x, centerAgain.y);
  expect(await getLayerTransform(page)).toMatchObject({
    x: displaced.x,
    y: displaced.y,
    rotation: 0,
    rotationX: 0,
    rotationY: 0,
  });
  expect((await getLayerTransform(page)).x).not.toBeCloseTo(0, 6);
});

test("destructive selection 3d rotation auto-selects, tilts and merges", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await setPencil(page, "#ff0000");
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { setBrushSize(size: number): void } } };
    root.__gnumarus?.shell?.setBrushSize(3);
  });
  await page.locator('gnumarus-shell select#brushShape').selectOption("square");
  const target = await layerScreenTarget(page, 32, 32);
  await page.mouse.click(target.x, target.y);
  await page.keyboard.press("u");
  // Clicking the canvas auto-selects the whole texture, then tilt it.
  await page.mouse.click(target.x, target.y);
  await expect(page.getByRole("button", { name: "Commit selection" })).toBeEnabled();
  expect(await floatingRect(page)).toEqual({ x: 0, y: 0, width: 64, height: 64 });
  const center = await rot3DCenter(page);
  await page.mouse.move(center.x, center.y);
  await page.mouse.down();
  await page.mouse.move(center.x + 40, center.y, { steps: 4 });
  await page.mouse.up();
  // Sphere radius is half the 64px selection times the live canvas zoom.
  const liveZoom = await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { getViewState(): { zoom: number } } } };
    return root.__gnumarus?.engine?.getViewState().zoom ?? 8;
  });
  expect((await getFloatingTransform(page))?.rotationY).toBeCloseTo(-40 / (32 * liveZoom), 4);
  await page.keyboard.press("Enter");
  expect(await floatingRect(page)).toBeNull();
  // The symmetric block survives the small tilt with its center intact.
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await redPixelCount(page, 24, 24, 40, 40)).toBe(9);
});

test("painting on a tilted layer lands in layer space", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await page.keyboard.press("y");
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { setZoom(zoom: number): void } } };
    root.__gnumarus?.engine?.setZoom(4);
  });
  const center = await rot3DCenter(page);
  await page.mouse.move(center.x, center.y);
  await page.mouse.down();
  await page.mouse.move(center.x + 40, center.y, { steps: 4 });
  await page.mouse.up();
  expect((await getLayerTransform(page)).rotationY).toBeCloseTo(-40 / 128, 4);
  // Tilt is about the layer center, so the canvas center still addresses
  // the layer center pixel through the ray-plane solve.
  await setPencil(page, "#ff0000");
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { setBrushSize(size: number): void } } };
    root.__gnumarus?.shell?.setBrushSize(1);
  });
  await page.keyboard.press("b");
  const box = await page.locator("gnumarus-shell canvas").boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

/** Build a minimal 2-layer, 2-frame .ase file inside the page (zlib via CompressionStream). */
