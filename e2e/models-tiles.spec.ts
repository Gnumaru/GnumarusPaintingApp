import { expect, test } from "@playwright/test";
import { SIMPLE_STL, borderedPngBytes, cellModel3dId, flyPoseOf, getLayers, layerCount, layerScreenTarget, loadBlankProject, modelPaintedPixels, modelViewOf, paintCenter, readPixel, redPngBytes, selectTool, selectionMaskDisplay, setBrushColor, setupTileBrushStroke, stubImagePicker, stubModelPicker, stubProjectDirectory, textPaintedPixels, tileBrushState, tileKeys, tileRubberState, tilemapTiles } from "./e2e-helpers";

test("import 3d model renders into an empty cell", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await stubModelPicker(page, "tri.stl", SIMPLE_STL);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Import 3D Model as layer" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText('3D model "tri" imported');
  const modelId = await cellModel3dId(page, "layer0", 0);
  expect(typeof modelId).toBe("string");
  await expect
    .poll(async () => modelPaintedPixels(page), { timeout: 10000 })
    .toBeGreaterThan(0);
});

test("import 3d model creates a layer above when the cell is occupied @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintCenter(page);
  await stubModelPicker(page, "tri.stl", SIMPLE_STL);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Import 3D Model as layer" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText('3D model "tri" imported');
  expect(await cellModel3dId(page, "layer0", 0)).toBeNull();
  const modelId = await cellModel3dId(page, "layer1", 0);
  expect(typeof modelId).toBe("string");
});

test("import 3d model rejects unsupported extensions", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await stubModelPicker(page, "notes.txt", "hello");
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Import 3D Model as layer" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("not supported");
  expect(await cellModel3dId(page, "layer0", 0)).toBeNull();
});

test("import 3d model rejects corrupt files", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await stubModelPicker(page, "bad.stl", [1, 2, 3, 4]);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Import 3D Model as layer" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("not a valid 3D model");
  expect(await cellModel3dId(page, "layer0", 0)).toBeNull();
});

test("3d models save as raw files and reopen", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await stubModelPicker(page, "tri.stl", SIMPLE_STL);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Import 3D Model as layer" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("imported");
  const modelId = await cellModel3dId(page, "layer0", 0);
  expect(typeof modelId).toBe("string");
  const project = await stubProjectDirectory(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  expect(Object.keys(await project.writtenBlobs()).sort()).toEqual(
    ["project.gpa", `3dmodels/${modelId}.stl`].sort(),
  );
  const saved = await project.writtenProject();
  expect(saved).toContain(`"file": "3dmodels/${modelId}.stl"`);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Open Project" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Opened MockProject");
  expect(await cellModel3dId(page, "layer0", 0)).toBe(modelId);
  await expect
    .poll(async () => modelPaintedPixels(page), { timeout: 10000 })
    .toBeGreaterThan(0);
});

test("tile brush creates a tilemap and places a tile", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await setBrushColor(page, "#ff0000");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  await paintCenter(page);
  await page.locator('gnumarus-shell [data-testid="tool-tilebrush"]').click();
  await paintCenter(page);
  await expect(page.locator("gnumarus-shell")).toContainText("already has content");
  expect(await tilemapTiles(page)).toBeNull();
  await page.getByRole("button", { name: "Add frame", exact: true }).click();
  await page.locator('gnumarus-shell [data-testid="anim-frame"][data-frame="1"]').click();
  await paintCenter(page);
  await expect(page.locator("gnumarus-shell")).toContainText("Select a tileset first");
  expect(await tilemapTiles(page)).toBeNull();
  await page.locator('gnumarus-shell [data-testid="tile-tileset"]').click();
  await page.locator('gnumarus-shell [data-testid="texture-picker-item"]').first().click();
  await expect(page.locator("gnumarus-shell")).toContainText("Tileset:");
  await page.locator('gnumarus-shell [data-testid="tile-window-toggle"]').click();
  await expect(page.locator('gnumarus-shell [data-testid="tile-window"]')).toBeVisible();
  await page.locator('gnumarus-shell [data-testid="tile-cell"][data-tx="2"][data-ty="2"]').click();
  await paintCenter(page);
  const tiles = await tilemapTiles(page);
  expect(tiles).toHaveLength(1);
  expect(tiles?.[0]).toMatchObject({ x: 2, y: 2, tx: 2, ty: 2, flipH: false, flipV: false, rot: 0 });
  await expect
    .poll(async () => textPaintedPixels(page), { timeout: 5000 })
    .toBeGreaterThan(0);
});

test("tile brush transforms tiles and resets on tile change", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await setBrushColor(page, "#ff0000");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  await paintCenter(page);
  await page.getByRole("button", { name: "Add frame", exact: true }).click();
  await page.locator('gnumarus-shell [data-testid="anim-frame"][data-frame="1"]').click();
  await page.locator('gnumarus-shell [data-testid="tool-tilebrush"]').click();
  await page.locator('gnumarus-shell [data-testid="tile-tileset"]').click();
  await page.locator('gnumarus-shell [data-testid="texture-picker-item"]').first().click();
  await page.keyboard.press("h");
  await page.keyboard.press("r");
  expect(await tileBrushState(page)).toMatchObject({ flipH: true, rot: 90 });
  await paintCenter(page);
  expect(await tilemapTiles(page)).toEqual([
    { x: 2, y: 2, tx: 0, ty: 0, flipH: true, flipV: false, rot: 90 },
  ]);
  await page.locator('gnumarus-shell [data-testid="tile-window-toggle"]').click();
  await page.locator('gnumarus-shell [data-testid="tile-cell"][data-tx="1"][data-ty="0"]').click();
  expect(await tileBrushState(page)).toMatchObject({ tx: 1, ty: 0, flipH: false, flipV: false, rot: 0 });
});

test("tile brush erases with right-click and supports undo", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setBrushColor(page, "#ff0000");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  await paintCenter(page);
  await page.getByRole("button", { name: "Add frame", exact: true }).click();
  await page.locator('gnumarus-shell [data-testid="anim-frame"][data-frame="1"]').click();
  await page.locator('gnumarus-shell [data-testid="tool-tilebrush"]').click();
  await page.locator('gnumarus-shell [data-testid="tile-tileset"]').click();
  await page.locator('gnumarus-shell [data-testid="texture-picker-item"]').first().click();
  await paintCenter(page);
  expect(await tilemapTiles(page)).toHaveLength(1);
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: "right" });
  await expect(page.locator("gnumarus-shell")).toContainText("Tile erased");
  expect(await tilemapTiles(page)).toEqual([]);
  await page.keyboard.press("Control+z");
  expect(await tilemapTiles(page)).toHaveLength(1);
  await page.keyboard.press("Control+y");
  expect(await tilemapTiles(page)).toEqual([]);
});

test("tile brush drag paints a stroke with single undo @recent", async ({ page }) => {
  await setupTileBrushStroke(page);
  const from = await layerScreenTarget(page, 40, 40);
  const to = await layerScreenTarget(page, 56, 40);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 5 });
  await page.mouse.up();
  expect(tileKeys(await tilemapTiles(page))).toEqual(["2,2", "3,2"]);
  await page.keyboard.press("Control+z");
  expect(await tilemapTiles(page)).toHaveLength(1);
  await page.keyboard.press("Control+y");
  expect(tileKeys(await tilemapTiles(page))).toEqual(["2,2", "3,2"]);
  // Right-drag erases the same stroke, again as one undo entry.
  await page.mouse.move(to.x, to.y);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(from.x, from.y, { steps: 5 });
  await page.mouse.up({ button: "right" });
  expect(await tilemapTiles(page)).toEqual([]);
  await page.keyboard.press("Control+z");
  expect(tileKeys(await tilemapTiles(page))).toEqual(["2,2", "3,2"]);
});

test("tile brush shift+click paints a tile line with preview @recent", async ({ page }) => {
  await setupTileBrushStroke(page);
  const to = await layerScreenTarget(page, 8, 8);
  await page.keyboard.down("Shift");
  await page.mouse.move(to.x, to.y);
  const rubber = await tileRubberState(page);
  expect(rubber?.display).toBe("block");
  expect(rubber?.cells).toBe(3);
  await page.mouse.click(to.x, to.y);
  await page.keyboard.up("Shift");
  expect(tileKeys(await tilemapTiles(page))).toEqual(["0,0", "1,1", "2,2"]);
  await page.keyboard.press("Control+z");
  expect(await tilemapTiles(page)).toHaveLength(1);
});

test("tile brush ctrl+shift+click paints a filled tile rectangle @recent", async ({ page }) => {
  await setupTileBrushStroke(page);
  const to = await layerScreenTarget(page, 8, 8);
  await page.keyboard.down("Control");
  await page.keyboard.down("Shift");
  await page.mouse.move(to.x, to.y);
  const rubber = await tileRubberState(page);
  expect(rubber?.display).toBe("block");
  expect(rubber?.cells).toBe(1);
  await page.mouse.click(to.x, to.y);
  await page.keyboard.up("Shift");
  await page.keyboard.up("Control");
  expect(tileKeys(await tilemapTiles(page))).toEqual([
    "0,0",
    "0,1",
    "0,2",
    "1,0",
    "1,1",
    "1,2",
    "2,0",
    "2,1",
    "2,2",
  ]);
  await page.keyboard.press("Control+z");
  expect(await tilemapTiles(page)).toHaveLength(1);
});

test("ellipse selection preview matches the committed mask @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setBrushColor(page, "#ff0000");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  const corner = await layerScreenTarget(page, 0, 0);
  await page.mouse.click(corner.x, corner.y);
  await page.keyboard.press("o");
  const from = await layerScreenTarget(page, 10, 10);
  const to = await layerScreenTarget(page, 30, 26);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 5 });
  expect(await selectionMaskDisplay(page)).toBe("block");
  const preview = await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: {
        engine?: {
          getEllipsePreviewMask(): { minX: number; minY: number; width: number; height: number; mask: number[] } | null;
        };
      };
    };
    return root.__gnumarus?.engine?.getEllipsePreviewMask() ?? null;
  });
  expect(preview).not.toBeNull();
  await page.mouse.up();
  const committed = await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: {
        engine?: {
          getFloatingSelectionMask(): { x: number; y: number; width: number; height: number; mask: number[] } | null;
        };
      };
    };
    return root.__gnumarus?.engine?.getFloatingSelectionMask() ?? null;
  });
  expect(committed).not.toBeNull();
  const previewPixels = new Set<string>();
  if (preview !== null) {
    for (let y = 0; y < preview.height; y += 1) {
      for (let x = 0; x < preview.width; x += 1) {
        if ((preview.mask[y * preview.width + x] ?? 0) !== 0) {
          previewPixels.add(`${preview.minX + x},${preview.minY + y}`);
        }
      }
    }
  }
  const committedPixels = new Set<string>();
  if (committed !== null) {
    for (let y = 0; y < committed.height; y += 1) {
      for (let x = 0; x < committed.width; x += 1) {
        if ((committed.mask[y * committed.width + x] ?? 0) !== 0) {
          committedPixels.add(`${committed.x + x},${committed.y + y}`);
        }
      }
    }
  }
  expect(previewPixels.size).toBeGreaterThan(0);
  expect([...previewPixels].sort()).toEqual([...committedPixels].sort());
});

test("tilemaps save and reopen with placements", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await setBrushColor(page, "#ff0000");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  await paintCenter(page);
  await page.getByRole("button", { name: "Add frame", exact: true }).click();
  await page.locator('gnumarus-shell [data-testid="anim-frame"][data-frame="1"]').click();
  await page.locator('gnumarus-shell [data-testid="tool-tilebrush"]').click();
  await page.locator('gnumarus-shell [data-testid="tile-tileset"]').click();
  await page.locator('gnumarus-shell [data-testid="texture-picker-item"]').first().click();
  await paintCenter(page);
  expect(await tilemapTiles(page)).toHaveLength(1);
  const project = await stubProjectDirectory(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  const saved = await project.writtenProject();
  expect(saved).toContain('"tilemaps"');
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Open Project" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Opened MockProject");
  expect(await tilemapTiles(page)).toHaveLength(1);
  await expect
    .poll(async () => textPaintedPixels(page), { timeout: 5000 })
    .toBeGreaterThan(0);
});

test("content picker shows tilemap kind badges", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setBrushColor(page, "#ff0000");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  await paintCenter(page);
  await page.getByRole("button", { name: "Add frame", exact: true }).click();
  await page.locator('gnumarus-shell [data-testid="anim-frame"][data-frame="1"]').click();
  await page.locator('gnumarus-shell [data-testid="tool-tilebrush"]').click();
  await page.locator('gnumarus-shell [data-testid="tile-tileset"]').click();
  await page.locator('gnumarus-shell [data-testid="texture-picker-item"]').first().click();
  await paintCenter(page);
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  const cell = matrix.locator('[data-testid="anim-cell"][data-matrix-frame="1"]');
  await cell.click({ button: "right" });
  await page.getByRole("button", { name: "Select content" }).click();
  const kinds = await page.locator('gnumarus-shell [data-testid="content-picker-kind"]').allTextContents();
  expect(kinds).toContain("Tilemap");
});

test("3d model transform orbits, commits and reopens", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await stubModelPicker(page, "tri.stl", SIMPLE_STL);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Import 3D Model as layer" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("imported");
  const modelId = await cellModel3dId(page, "layer0", 0);
  expect(typeof modelId).toBe("string");
  const before = await modelViewOf(page, modelId as string);
  expect(before).not.toBeNull();
  await page.locator('gnumarus-shell [data-testid="model-drawer"] > button').click();
  await expect(page.locator('gnumarus-shell [data-testid="model-view-readout"]')).toBeVisible();
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2, { steps: 5 });
  await page.mouse.up();
  const during = await modelViewOf(page, modelId as string);
  // Uncommitted drags do not touch the stored view yet.
  expect(during).toEqual(before);
  await expect(page.locator("gnumarus-shell")).toContainText("az ");
  await page.locator('gnumarus-shell [data-testid="model-view-commit"]').click();
  const committed = await modelViewOf(page, modelId as string);
  expect(committed).not.toEqual(before);
  expect(Math.abs((committed?.azimuth ?? 0) - (before?.azimuth ?? 0))).toBeGreaterThan(5);
  const project = await stubProjectDirectory(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  expect(await project.writtenProject()).toContain('"view"');
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Open Project" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Opened MockProject");
  expect(await cellModel3dId(page, "layer0", 0)).toBe(modelId);
  const reopened = await modelViewOf(page, modelId as string);
  expect(reopened?.azimuth).toBeCloseTo(committed?.azimuth ?? 0, 0);
  await expect
    .poll(async () => modelPaintedPixels(page), { timeout: 10000 })
    .toBeGreaterThan(0);
});

test("3d model transform cancels and resets the view", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await stubModelPicker(page, "tri.stl", SIMPLE_STL);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Import 3D Model as layer" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("imported");
  const modelId = await cellModel3dId(page, "layer0", 0);
  expect(typeof modelId).toBe("string");
  const original = await modelViewOf(page, modelId as string);
  await page.locator('gnumarus-shell [data-testid="model-drawer"] > button').click();
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const dragAt = async (dx: number, dy: number): Promise<void> => {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + dx, box.y + box.height / 2 + dy, { steps: 5 });
    await page.mouse.up();
  };
  await dragAt(80, 40);
  await page.keyboard.press("Escape");
  expect(await modelViewOf(page, modelId as string)).toEqual(original);
  await dragAt(120, 0);
  await page.locator('gnumarus-shell [data-testid="model-view-commit"]').click();
  const committed = await modelViewOf(page, modelId as string);
  expect(committed).not.toEqual(original);
  await page.keyboard.press("r");
  await page.locator('gnumarus-shell [data-testid="model-view-commit"]').click();
  const reset = await modelViewOf(page, modelId as string);
  expect(reset?.azimuth).toBeCloseTo(39.8, 0);
  expect(reset?.elevation).toBeCloseTo(24.1, 0);
  await page.keyboard.press("Control+z");
  expect(await modelViewOf(page, modelId as string)).toEqual(committed);
  await page.keyboard.press("Control+y");
  expect(await modelViewOf(page, modelId as string)).toEqual(reset);
});

test("3d model transform requires a model cell", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.locator('gnumarus-shell [data-testid="model-drawer"] > button').click();
  await paintCenter(page);
  await expect(page.locator("gnumarus-shell")).toContainText("Select a 3D model cell first");
});

test("3d model transform wheel up zooms in and wheel down zooms out @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await stubModelPicker(page, "tri.stl", SIMPLE_STL);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Import 3D Model as layer" }).click();
  const modelId = await cellModel3dId(page, "layer0", 0);
  expect(typeof modelId).toBe("string");
  const before = await modelViewOf(page, modelId as string);
  expect(before).not.toBeNull();
  await page.locator('gnumarus-shell [data-testid="model-drawer"] > button').click();
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, -120);
  await page.locator('gnumarus-shell [data-testid="model-view-commit"]').click();
  const zoomedIn = await modelViewOf(page, modelId as string);
  expect(zoomedIn?.distance ?? 0).toBeLessThan(before?.distance ?? 0);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, 240);
  await page.locator('gnumarus-shell [data-testid="model-view-commit"]').click();
  const zoomedOut = await modelViewOf(page, modelId as string);
  expect(zoomedOut?.distance ?? 0).toBeGreaterThan(zoomedIn?.distance ?? 0);
});

test("tile window draws the project canvas background @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setBrushColor(page, "#ff0000");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  await paintCenter(page);
  await page.locator('gnumarus-shell [data-testid="tool-tilebrush"]').click();
  await page.locator('gnumarus-shell [data-testid="tile-tileset"]').click();
  await page.locator('gnumarus-shell [data-testid="texture-picker-item"]').first().click();
  await expect(page.locator("gnumarus-shell")).toContainText("Tileset:");
  await page.locator('gnumarus-shell [data-testid="tile-window-toggle"]').click();
  const grid = page.locator('gnumarus-shell [data-testid="tile-window"] .tile-grid');
  await expect(grid).toBeVisible();
  await expect(grid).toHaveAttribute("style", /repeating-conic-gradient/);
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await page.locator("gnumarus-shell select#backgroundMode").selectOption("solid");
  await page.locator("gnumarus-shell dialog#settingsDialog").getByRole("button", { name: "Close" }).click();
  await expect(grid).toHaveAttribute("style", /background-color: #808080/);
});

test("tileset texture picker lists project textures on the canvas background @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setBrushColor(page, "#ff0000");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  await paintCenter(page);
  await page.locator('gnumarus-shell [data-testid="tool-tilebrush"]').click();
  await page.locator('gnumarus-shell [data-testid="tile-tileset"]').click();
  const dialog = page.locator("gnumarus-shell dialog#texturePickerDialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('[data-testid="texture-picker-none"]')).toHaveCount(0);
  await expect(dialog.locator('[data-testid="texture-picker-new"]')).toHaveCount(0);
  await expect(dialog.locator('[data-testid="texture-picker-item"]')).not.toHaveCount(0);
  await expect(dialog.locator("img.picker-thumb").first()).toHaveAttribute(
    "style",
    /repeating-conic-gradient/,
  );
});

test("3d model transform drag orbits inverted on both axes @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await stubModelPicker(page, "tri.stl", SIMPLE_STL);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Import 3D Model as layer" }).click();
  const modelId = await cellModel3dId(page, "layer0", 0);
  expect(typeof modelId).toBe("string");
  const before = await modelViewOf(page, modelId as string);
  expect(before).not.toBeNull();
  await page.locator('gnumarus-shell [data-testid="model-drawer"] > button').click();
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const drag = async (dx: number, dy: number): Promise<void> => {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + dx, box.y + box.height / 2 + dy, { steps: 5 });
    await page.mouse.up();
  };
  await drag(120, 0);
  await page.locator('gnumarus-shell [data-testid="model-view-commit"]').click();
  const afterX = await modelViewOf(page, modelId as string);
  expect(afterX?.azimuth ?? 0).toBeCloseTo(((before?.azimuth ?? 0) - 48 + 360) % 360, 0);
  expect(afterX?.elevation ?? 0).toBeCloseTo(before?.elevation ?? 0, 1);
  await page.keyboard.press("r");
  await page.locator('gnumarus-shell [data-testid="model-view-commit"]').click();
  await drag(0, 80);
  await page.locator('gnumarus-shell [data-testid="model-view-commit"]').click();
  const afterY = await modelViewOf(page, modelId as string);
  expect(afterY?.elevation ?? 0).toBeCloseTo(24.1 + 32, 0);
  expect(afterY?.azimuth ?? 0).toBeCloseTo(39.8, 0);
});

test("model lighting default leaves imported models alone until a 3D tool touches them @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await stubModelPicker(page, "tri.stl", SIMPLE_STL);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Import 3D Model as layer" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText('3D model "tri" imported');
  const lightingOf = (): Promise<string | null> =>
    page.evaluate(() => {
      const root = window as unknown as { __gnumarus?: { engine?: { getModelLighting(): string } } };
      return root.__gnumarus?.engine?.getModelLighting() ?? null;
    });
  const editorSelect = page.locator("gnumarus-shell [data-testid='editor-options'] select#modelLighting");
  await expect(editorSelect).toHaveValue("unlit");
  await expect(lightingOf()).resolves.toBe("unlit");
  const before = await modelPaintedPixels(page);
  expect(before).toBeGreaterThan(0);
  await editorSelect.selectOption("lit");
  await expect(lightingOf()).resolves.toBe("lit");
  const persisted = await page.evaluate(() => window.localStorage.getItem("gnumarus.settings.storage.v1"));
  expect(persisted).toContain('"modelLighting": "lit"');
  // Switching the default re-renders nothing: the imported model is untouched.
  await page.waitForTimeout(500);
  await expect(modelPaintedPixels(page)).resolves.toBe(before);
  const project = await stubProjectDirectory(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  expect(await project.writtenProject()).toContain('"lighting": "unlit"');
  // The settings dialog mirrors the same default.
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.locator("gnumarus-shell dialog#settingsDialog select#storageModelLighting")).toHaveValue("lit");
  await page.locator('gnumarus-shell [aria-label="Reset project texture format to default"]').click();
  await expect(page.locator("gnumarus-shell dialog#settingsDialog select#storageModelLighting")).toHaveValue("unlit");
  await expect(editorSelect).toHaveValue("unlit");
  await expect(lightingOf()).resolves.toBe("unlit");
  await page.getByRole("button", { name: "Close" }).click();
  // Using the 3D model transform tool stamps the current default onto the model.
  await editorSelect.selectOption("lit");
  await selectTool(page, "3D model transform");
  await page.keyboard.press("r");
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  expect(await project.writtenProject()).toContain('"lighting": "lit"');
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Open Project" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Opened MockProject");
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  expect(await project.writtenProject()).toContain('"lighting": "lit"');
});

test("fly camera applies the editor lighting default to the flown model @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await stubModelPicker(page, "tri.stl", SIMPLE_STL);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Import 3D Model as layer" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText('3D model "tri" imported');
  await page.locator("gnumarus-shell [data-testid='editor-options'] select#modelLighting").selectOption("lit");
  await selectTool(page, "Fly camera");
  await expect(page.locator("gnumarus-shell [data-testid='flycam-readout']")).toBeVisible();
  const project = await stubProjectDirectory(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  expect(await project.writtenProject()).toContain('"lighting": "lit"');
});

test("fly camera requires a 3D model cell @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await selectTool(page, "Fly camera");
  await expect(page.locator("gnumarus-shell")).toContainText("Select a 3D model cell first");
  await expect(page.locator("gnumarus-shell [data-testid='flycam-readout']")).toHaveCount(0);
  await expect(page.locator("gnumarus-shell")).toContainText("Brush size");
});

test("fly camera flies, looks, orbits and resets @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await stubModelPicker(page, "tri.stl", SIMPLE_STL);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Import 3D Model as layer" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("imported");
  await selectTool(page, "Fly camera");
  await expect(page.locator("gnumarus-shell [data-testid='flycam-readout']")).toBeVisible();
  const before = await flyPoseOf(page);
  expect(before).not.toBeNull();
  expect(before?.yawDeg ?? 0).toBeCloseTo(39.8, 0);
  expect(before?.pitchDeg ?? 0).toBeCloseTo(24.1, 1);
  await page.keyboard.press("w");
  const moved = await flyPoseOf(page);
  expect(moved?.x ?? 0).toBeLessThan(before?.x ?? 0);
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2, { steps: 5 });
  await page.mouse.up();
  const looked = await flyPoseOf(page);
  expect(looked?.yawDeg ?? 0).toBeLessThan(moved?.yawDeg ?? 0);
  await page.keyboard.press("z");
  const orbited = await flyPoseOf(page);
  expect(orbited?.yawDeg ?? 0).toBeGreaterThan(looked?.yawDeg ?? 0);
  await page.keyboard.press("r");
  await expect(page.locator("gnumarus-shell")).toContainText("Fly camera reset");
  const reset = await flyPoseOf(page);
  expect(reset?.yawDeg ?? 0).toBeCloseTo(39.8, 0);
  expect(reset?.pitchDeg ?? 0).toBeCloseTo(24.1, 1);
});

test("fly camera suppresses editor shortcuts and exits with Escape @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await stubModelPicker(page, "tri.stl", SIMPLE_STL);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Import 3D Model as layer" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("imported");
  await selectTool(page, "Fly camera");
  await expect(page.locator("gnumarus-shell [data-testid='flycam-readout']")).toBeVisible();
  await page.keyboard.press("b");
  await expect(page.locator("gnumarus-shell [data-testid='flycam-readout']")).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.locator("gnumarus-shell .menubar")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("gnumarus-shell [data-testid='flycam-readout']")).toHaveCount(0);
  await expect(page.locator("gnumarus-shell")).toContainText("Brush size");
});

test("fly camera resumes the saved pose when reopened @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await stubModelPicker(page, "tri.stl", SIMPLE_STL);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Import 3D Model as layer" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("imported");
  await selectTool(page, "Fly camera");
  await page.keyboard.press("w");
  const before = await flyPoseOf(page);
  expect(before).not.toBeNull();
  expect(before?.x ?? 0).toBeLessThan(1.95);
  await page.keyboard.press("Escape");
  await expect(page.locator("gnumarus-shell [data-testid='flycam-readout']")).toHaveCount(0);
  await selectTool(page, "Fly camera");
  const resumed = await flyPoseOf(page);
  expect(resumed).toEqual(before);
});

test("fly camera pose survives save and reopen @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await stubModelPicker(page, "tri.stl", SIMPLE_STL);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Import 3D Model as layer" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("imported");
  await selectTool(page, "Fly camera");
  await page.keyboard.press("w");
  const before = await flyPoseOf(page);
  expect(before).not.toBeNull();
  expect(before?.x ?? 0).toBeLessThan(1.95);
  const project = await stubProjectDirectory(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  expect(await project.writtenProject()).toContain('"flyCam"');
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Open Project" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Opened MockProject");
  await selectTool(page, "Fly camera");
  const reopened = await flyPoseOf(page);
  expect(reopened).toEqual(before);
});

test("fly camera drag up looks up and drag down looks down @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await stubModelPicker(page, "tri.stl", SIMPLE_STL);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Import 3D Model as layer" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("imported");
  await selectTool(page, "Fly camera");
  const before = await flyPoseOf(page);
  expect(before).not.toBeNull();
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx, cy - 60, { steps: 5 });
  await page.mouse.up();
  const lookedUp = await flyPoseOf(page);
  expect(lookedUp?.pitchDeg ?? 0).toBeLessThan(before?.pitchDeg ?? 0);
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx, cy + 60, { steps: 5 });
  await page.mouse.up();
  const lookedDown = await flyPoseOf(page);
  expect(lookedDown?.pitchDeg ?? 0).toBeGreaterThan(lookedUp?.pitchDeg ?? 0);
});

test("fly camera turns with J/L and pitches with I/K within plus-minus 89 degrees @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await stubModelPicker(page, "tri.stl", SIMPLE_STL);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Import 3D Model as layer" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("imported");
  await selectTool(page, "Fly camera");
  const before = await flyPoseOf(page);
  expect(before).not.toBeNull();
  await page.keyboard.press("j");
  const left = await flyPoseOf(page);
  expect(left?.yawDeg ?? 0).toBeGreaterThan(before?.yawDeg ?? 0);
  await page.keyboard.press("l");
  const backYaw = await flyPoseOf(page);
  // A hold-loop frame may land between down/up, so allow sub-degree drift.
  expect(backYaw?.yawDeg ?? 0).toBeCloseTo(before?.yawDeg ?? 0, 0);
  await page.keyboard.press("i");
  const up = await flyPoseOf(page);
  expect(up?.pitchDeg ?? 0).toBeLessThan(before?.pitchDeg ?? 0);
  await page.keyboard.press("k");
  const backPitch = await flyPoseOf(page);
  expect(backPitch?.pitchDeg ?? 0).toBeCloseTo(before?.pitchDeg ?? 0, 0);
  for (let n = 0; n < 20; n += 1) {
    await page.keyboard.press("k");
  }
  expect((await flyPoseOf(page))?.pitchDeg ?? 0).toBe(89);
  for (let n = 0; n < 40; n += 1) {
    await page.keyboard.press("i");
  }
  expect((await flyPoseOf(page))?.pitchDeg ?? 0).toBe(-89);
});

test("fly camera keeps moving while a key is held and stops on release @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await stubModelPicker(page, "tri.stl", SIMPLE_STL);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Import 3D Model as layer" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("imported");
  await selectTool(page, "Fly camera");
  const before = await flyPoseOf(page);
  expect(before).not.toBeNull();
  await page.keyboard.down("w");
  await page.waitForTimeout(500);
  const held = await flyPoseOf(page);
  // A single discrete step moves ~0.15 on x; holding must travel further.
  expect(held?.x ?? 0).toBeLessThan((before?.x ?? 0) - 0.35);
  await page.keyboard.up("w");
  // The release may land while a frame is in flight, so wait for the pose
  // to settle and then require full quiescence across a second window.
  await page.waitForTimeout(400);
  const settled = await flyPoseOf(page);
  await page.waitForTimeout(300);
  expect(await flyPoseOf(page)).toEqual(settled);
});

test("file menu shows renamed import items with tooltips @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "File" }).click();
  const dropdown = page.locator("gnumarus-shell .menubar .dropdown");
  await expect(dropdown.getByRole("button", { name: "Import full project", exact: true })).toHaveAttribute(
    "title",
    "Import entire projects from different application (photoshop, krita, aseprite etc)",
  );
  await expect(dropdown.getByRole("button", { name: "Import SVG as layer" })).toBeVisible();
  await expect(dropdown.getByRole("button", { name: "Import 3D Model as layer" })).toBeVisible();
  await expect(dropdown.getByRole("button", { name: "Import raster image as layer" })).toHaveAttribute(
    "title",
    "Import a raster image into the current layer (or a new layer above it)",
  );
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Edit" }).click();
  const edit = page.locator("gnumarus-shell .menubar .dropdown");
  await expect(edit.getByRole("button", { name: "Undo" })).toHaveAttribute("title", "Undo the last change (Ctrl+Z)");
  await expect(edit.getByRole("button", { name: "Settings" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Help" }).click();
  const help = page.locator("gnumarus-shell .menubar .dropdown");
  await expect(help.getByRole("button", { name: "Shortcuts" })).toHaveAttribute(
    "title",
    "List every keyboard shortcut",
  );
  await expect(help.getByRole("button", { name: "Source code" })).toHaveAttribute(
    "title",
    "Open the project source code page",
  );
});

test("run action dialog lists and runs the new menu actions @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.keyboard.press("Control+K");
  const dialog = page.locator("gnumarus-shell dialog#actionPaletteDialog");
  await expect(dialog).toBeVisible();
  await dialog.locator('[data-testid="action-palette-input"]').fill("undo");
  await expect(dialog.locator('[data-testid="action-palette-item"]')).toHaveText(["Undo"]);
  await page.keyboard.press("Enter");
  await expect(page.locator("gnumarus-shell")).toContainText("Nothing to undo");
  await page.keyboard.press("Control+K");
  await expect(dialog).toBeVisible();
  await dialog.locator('[data-testid="action-palette-input"]').fill("settings");
  await expect(dialog.locator('[data-testid="action-palette-item"]')).toHaveText(["Settings"]);
  await page.keyboard.press("Enter");
  await expect(page.locator('gnumarus-shell dialog#settingsDialog')).toBeVisible();
  await page.keyboard.press("Escape");
});

test("import image as layer lands on the current layer when the cell is empty @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await stubImagePicker(page, "red.png", await redPngBytes(page, 8));
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Import raster image as layer" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText('Image "red" imported as layer "L1"');
  expect(await layerCount(page)).toBe(1);
  expect(await getLayers(page)).toMatchObject({ layers: [{ width: 8, height: 8 }] });
  expect(await readPixel(page, 0, 0)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("import image as layer skips fit and crop cleanup @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await stubImagePicker(page, "dot.png", await borderedPngBytes(page, 8));
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Import raster image as layer" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText('Image "dot" imported as layer "L1"');
  // Default cleanup is crop+fit: a fit would trim the transparent border to
  // 1x1, so keeping 8x8 proves no automatic cleanup ran on image import.
  expect(await getLayers(page)).toMatchObject({ layers: [{ width: 8, height: 8 }] });
});

test("import image as layer creates a layer above when the cell is occupied @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await setBrushColor(page, "#00ff00");
  await paintCenter(page);
  await stubImagePicker(page, "red.png", await redPngBytes(page, 8));
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Import raster image as layer" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText('Image "red" imported as layer "L2"');
  expect(await layerCount(page)).toBe(2);
  expect(await getLayers(page)).toMatchObject({ layers: [{ width: 64, height: 64 }, { width: 8, height: 8 }] });
});

test("import image as layer rejects invalid files @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await stubImagePicker(page, "nope.png", Array.from(new TextEncoder().encode("definitely not an image")));
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Import raster image as layer" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("not a valid image");
  expect(await layerCount(page)).toBe(1);
  expect(await getLayers(page)).toMatchObject({ layers: [{ width: 64, height: 64 }] });
});

test("save project as writes to a new directory and switches to it @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await stubProjectDirectory(page, "MockProject");
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  const second = await stubProjectDirectory(page, "MockProject2");
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save project as" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject2");
  expect(Object.keys(await second.writtenBlobs())).toContain("project.gpa");
  await page.keyboard.press("Control+s");
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject2");
});

test("save project as lists its action and tooltip @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "File" }).click();
  await expect(
    page.locator("gnumarus-shell .menubar .dropdown").getByRole("button", { name: "Save project as" }),
  ).toHaveAttribute("title", "Save the project into a new directory");
  await page.keyboard.press("Control+K");
  const dialog = page.locator("gnumarus-shell dialog#actionPaletteDialog");
  await dialog.locator('[data-testid="action-palette-input"]').fill("save project as");
  await expect(dialog.locator('[data-testid="action-palette-item"]')).toHaveText([
    "Save project as",
    "Save embedded project as",
  ]);
});
