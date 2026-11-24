import { expect, test } from "@playwright/test";
import { getLayers, getMatrix, getMatrixFrame, loadBlankProject, openPicker, paintCenter, readPixel, setBrushColor } from "./e2e-helpers";

test("F selects the bucket tool", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await expect(page.locator("gnumarus-shell")).toContainText("brush");
  await page.keyboard.press("f");
  await expect(page.locator("gnumarus-shell")).toContainText("bucket");
  await page.keyboard.press("b");
  await expect(page.locator("gnumarus-shell")).toContainText("brush");
  await page.keyboard.press("F");
  await expect(page.locator("gnumarus-shell")).toContainText("bucket");
});

test("layer context menu resets the layer transform", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: {
        engine?: {
          setLayerTransform(id: string, transform: { x: number; rotation: number; flipX: boolean }): boolean;
        };
      };
    };
    root.__gnumarus?.engine?.setLayerTransform("layer0", { x: 5, rotation: 0.5, flipX: true });
  });
  let transform = await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getLayers(): Array<{ transform: { x: number } }> } };
    };
    return root.__gnumarus?.engine?.getLayers()[0]?.transform ?? null;
  });
  expect(transform).toMatchObject({ x: 5, flipX: true });
  const row0 = page.locator('gnumarus-shell [data-layer-id="layer0"]');
  await row0.click({ button: "right" });
  await page.getByRole("button", { name: "Reset transform" }).click();
  transform = await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getLayers(): Array<{ transform: { x: number } }> } };
    };
    return root.__gnumarus?.engine?.getLayers()[0]?.transform ?? null;
  });
  expect(transform).toEqual({ x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 });
  await expect(page.locator("gnumarus-shell")).toContainText("Layer transform reset");
});

test("eyedropper copies the clicked pixel color", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await setBrushColor(page, "#ff0000");
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.click(cx, cy);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  await setBrushColor(page, "#0000ff");
  await page.getByRole("button", { name: "Eyedropper" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("eyedropper");
  await page.mouse.click(cx, cy);
  await expect(page.locator("gnumarus-shell")).toContainText("Eyedropper: #ff0000");
  // The picked color paints like any chosen color.
  await page.keyboard.press("Delete");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  await page.keyboard.press("b");
  await page.mouse.click(cx, cy);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("holding Ctrl temporarily switches to the eyedropper", async ({ page }) => {  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await setBrushColor(page, "#ff0000");
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.click(cx, cy);
  await setBrushColor(page, "#0000ff");
  await page.keyboard.down("Control");
  await expect(page.locator("gnumarus-shell")).toContainText("eyedropper");
  await page.mouse.click(cx, cy);
  await expect(page.locator("gnumarus-shell")).toContainText("Eyedropper: #ff0000");
  await page.keyboard.up("Control");
  await expect(page.locator("gnumarus-shell")).toContainText("brush");
  // Painting after release uses the picked color with the restored tool.
  await page.keyboard.press("Delete");
  await page.mouse.click(cx, cy);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("eyedropper copies the composited color through empty layers", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const clickCenter = async (): Promise<void> => {
    const canvas = page.locator("gnumarus-shell canvas");
    const box = await canvas.boundingBox();
    if (box === null) {
      throw new Error("canvas has no bounding box");
    }
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  };
  await setBrushColor(page, "#ff0000");
  await clickCenter();
  await page.getByRole("button", { name: "Add layer" }).click();
  // The new top layer is active and empty: the old eyedropper would copy
  // its transparent pixel instead of the red square underneath.
  await page.getByRole("button", { name: "Eyedropper" }).click();
  await clickCenter();
  await expect(page.locator("gnumarus-shell")).toContainText("Eyedropper: #ff0000");
  // Opaque paint on the top layer wins the composite.
  await page.keyboard.press("b");
  await setBrushColor(page, "#0000ff");
  await clickCenter();
  await page.getByRole("button", { name: "Eyedropper" }).click();
  await clickCenter();
  await expect(page.locator("gnumarus-shell")).toContainText("Eyedropper: #0000ff");
});

test("frame menu adds frames before and after the clicked frame", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  expect(await getMatrix(page)).toMatchObject({ frameCount: 2, currentFrame: 1 });
  await paintCenter(page);
  await matrix.locator('[data-testid="anim-frame"][data-frame="0"]').click({ button: "right" });
  await page.getByRole("button", { name: "Add frame after" }).click();
  let state = await getMatrix(page);
  expect(state.frameCount).toBe(3);
  expect(state.currentFrame).toBe(1);
  await expect(page.locator("gnumarus-shell")).toContainText("Frame 2 added");
  expect(state.rows[0]?.cells.map((cell) => cell.contentId !== null)).toEqual([false, false, true]);
  await matrix.locator('[data-testid="anim-frame"][data-frame="2"]').click({ button: "right" });
  await page.getByRole("button", { name: "Add frame before" }).click();
  state = await getMatrix(page);
  expect(state.frameCount).toBe(4);
  expect(state.currentFrame).toBe(2);
  expect(state.rows[0]?.cells.map((cell) => cell.contentId !== null)).toEqual([false, false, false, true]);
});

test("layer menu adds layers above and below the clicked layer", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Add layer" }).click();
  let state = await getLayers(page);
  expect(state.layers.map((layer) => layer.id)).toEqual(["layer0", "layer1"]);
  await page.locator('gnumarus-shell [data-layer-id="layer0"] .layer-name').click();
  await page.locator('gnumarus-shell [data-layer-id="layer0"]').click({ button: "right" });
  await page.getByRole("button", { name: "Add above" }).click();
  state = await getLayers(page);
  expect(state.layers.map((layer) => layer.id)).toEqual(["layer0", "layer2", "layer1"]);
  expect(state.active).toBe("layer2");
  await expect(page.locator("gnumarus-shell")).toContainText("Layer added");
  await page.locator('gnumarus-shell [data-layer-id="layer1"] .layer-name').click();
  await page.locator('gnumarus-shell [data-layer-id="layer1"]').click({ button: "right" });
  await page.getByRole("button", { name: "Add below" }).click();
  state = await getLayers(page);
  expect(state.layers.map((layer) => layer.id)).toEqual(["layer0", "layer2", "layer3", "layer1"]);
  expect(state.active).toBe("layer3");
});

test("ArrowLeft and ArrowRight select frames with wraparound", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  expect(await getMatrixFrame(page)).toBe(2);
  await matrix.locator('[data-testid="anim-frame"][data-frame="0"]').click();
  expect(await getMatrixFrame(page)).toBe(0);
  await page.keyboard.press("ArrowLeft");
  expect(await getMatrixFrame(page)).toBe(2);
  await expect(page.locator('gnumarus-shell [data-testid="toast"]')).toContainText("Frame 3/3");
  await page.keyboard.press("ArrowLeft");
  expect(await getMatrixFrame(page)).toBe(1);
  await page.keyboard.press("ArrowRight");
  expect(await getMatrixFrame(page)).toBe(2);
  await page.keyboard.press("ArrowRight");
  expect(await getMatrixFrame(page)).toBe(0);
  await page.keyboard.press("ArrowRight");
  expect(await getMatrixFrame(page)).toBe(1);
});

test("ArrowUp and ArrowDown select layers like PageUp and PageDown", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Add layer" }).click();
  await page.locator('gnumarus-shell [data-layer-id="layer0"] .layer-name').click();
  expect((await getLayers(page)).active).toBe("layer0");
  await page.keyboard.press("ArrowUp");
  expect((await getLayers(page)).active).toBe("layer1");
  await expect(page.locator('gnumarus-shell [data-testid="toast"]')).toContainText("2/2");
  await page.keyboard.press("ArrowUp");
  expect((await getLayers(page)).active).toBe("layer0");
  await page.keyboard.press("ArrowDown");
  expect((await getLayers(page)).active).toBe("layer1");
  await page.keyboard.press("ArrowDown");
  expect((await getLayers(page)).active).toBe("layer0");
});

test("Shift+Up and Shift+Down move layers with wraparound", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Add layer" }).click();
  expect((await getLayers(page)).layers.map((layer) => layer.id)).toEqual(["layer0", "layer1"]);
  expect((await getLayers(page)).active).toBe("layer1");
  await page.keyboard.press("Shift+ArrowDown");
  let state = await getLayers(page);
  expect(state.layers.map((layer) => layer.id)).toEqual(["layer1", "layer0"]);
  expect(state.active).toBe("layer1");
  await expect(page.locator("gnumarus-shell")).toContainText("Layer moved down");
  await page.keyboard.press("Shift+ArrowDown");
  state = await getLayers(page);
  expect(state.layers.map((layer) => layer.id)).toEqual(["layer0", "layer1"]);
  expect(state.active).toBe("layer1");
  await page.keyboard.press("Shift+ArrowUp");
  state = await getLayers(page);
  expect(state.layers.map((layer) => layer.id)).toEqual(["layer1", "layer0"]);
  expect(state.active).toBe("layer1");
  await page.keyboard.press("Shift+ArrowUp");
  state = await getLayers(page);
  expect(state.layers.map((layer) => layer.id)).toEqual(["layer0", "layer1"]);
  expect(state.active).toBe("layer1");
});

test("Shift+Left and Shift+Right move frames with wraparound", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintCenter(page);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  await matrix.locator('[data-testid="anim-frame"][data-frame="0"]').click();
  expect(await getMatrixFrame(page)).toBe(0);
  await page.keyboard.press("Shift+ArrowRight");
  expect(await getMatrixFrame(page)).toBe(1);
  await expect(page.locator("gnumarus-shell")).toContainText("Frame moved right");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  await matrix.locator('[data-testid="anim-frame"][data-frame="0"]').click();
  expect(await readPixel(page, 32, 32)).toBeNull();
  await matrix.locator('[data-testid="anim-frame"][data-frame="1"]').click();
  await page.keyboard.press("Shift+ArrowRight");
  expect(await getMatrixFrame(page)).toBe(2);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  await page.keyboard.press("Shift+ArrowRight");
  expect(await getMatrixFrame(page)).toBe(0);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  await page.keyboard.press("Shift+ArrowLeft");
  expect(await getMatrixFrame(page)).toBe(2);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
});

test("arrow keys stay out of inputs and the color picker", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Add layer" }).click();
  const before = await getLayers(page);
  const frameBefore = await getMatrixFrame(page);
  await page.locator("gnumarus-shell input#brushSize").click();
  await page.keyboard.press("ArrowUp");
  expect((await getLayers(page)).active).toBe(before.active);
  expect(await getMatrixFrame(page)).toBe(frameBefore);
  await page.keyboard.press("Escape");
  const picker = await openPicker(page, "brushColor");
  await picker.locator('[data-testid="hsv-triangle"]').focus();
  await page.keyboard.press("ArrowUp");
  expect((await getLayers(page)).active).toBe(before.active);
  expect(await getMatrixFrame(page)).toBe(frameBefore);
  await picker.locator('[data-testid="hsv-triangle"]').focus();
  await page.keyboard.down("Shift");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.up("Shift");
  expect((await getLayers(page)).active).toBe(before.active);
  expect((await getLayers(page)).layers.map((layer) => layer.id)).toEqual(
    before.layers.map((layer) => layer.id),
  );
});

test("clicking layers and frames also shows the toast", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Add layer" }).click();
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  const toast = page.locator('gnumarus-shell [data-testid="toast"]');
  await matrix.locator('[data-testid="anim-frame"][data-frame="0"]').click();
  await expect(toast).toContainText("Frame 1/2:");
  await page.locator('gnumarus-shell [data-layer-id="layer0"] .layer-name').click();
  await expect(toast).toContainText("1/2:");
  await page.locator('gnumarus-shell [data-layer-id="layer1"] .layer-name').click();
  await expect(toast).toContainText("2/2:");
  await matrix.locator('[data-testid="anim-frame"][data-frame="1"]').click();
  await expect(toast).toContainText("Frame 2/2:");
  await matrix.locator('[data-testid="anim-frame"][data-frame="0"]').click();
  await expect(toast).toContainText("Frame 1/2:");
  const cell = matrix.locator('[data-testid="anim-cell"][data-matrix-layer="layer0"][data-matrix-frame="1"]');
  await cell.click();
  await expect(toast).toBeVisible();
});

test("toast display time is configurable between 0.5 and 10 seconds", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  const input = page.locator("gnumarus-shell input#toastDuration");
  await expect(input).toBeVisible();
  await expect(input).toHaveValue("2");
  await input.fill("0.1");
  await expect(page.locator("gnumarus-shell")).toContainText("Toast display time: 0.5 s");
  await expect(input).toHaveValue("0.5");
  await input.fill("50");
  await expect(page.locator("gnumarus-shell")).toContainText("Toast display time: 10 s");
  await expect(input).toHaveValue("10");
  await input.fill("1.5");
  await expect(page.locator("gnumarus-shell")).toContainText("Toast display time: 1.5 s");
  await expect(page.locator('gnumarus-shell button[aria-label="Reset toast display time to default"]')).toBeVisible();
  await page.locator('gnumarus-shell button[aria-label="Reset toast display time to default"]').click();
  await expect(input).toHaveValue("2");
  await page.getByRole("button", { name: "Close" }).click();
  const duration = await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { toastDurationSec: number } } };
    return root.__gnumarus?.shell?.toastDurationSec ?? -1;
  });
  expect(duration).toBe(2);
});

test("automatic layer names start at 1", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  let state = await getLayers(page);
  expect(state.layers[0]?.name).toBe("L1");
  await page.getByRole("button", { name: "Add layer" }).click();
  await page.getByRole("button", { name: "Add layer" }).click();
  state = await getLayers(page);
  expect(state.layers.map((layer) => layer.name)).toEqual(["L1", "L2", "L3"]);
});

test("frames can be renamed like layers", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  await expect(matrix.locator('[data-testid="anim-frame"][data-frame="0"]')).toContainText("F1");
  await expect(matrix.locator('[data-testid="anim-frame"][data-frame="1"]')).toContainText("F2");
  const header = matrix.locator('[data-testid="anim-frame"][data-frame="1"]');
  await header.dblclick();
  const renameInput = matrix.locator('[data-testid="anim-frame-rename"][data-frame="1"]');
  await expect(renameInput).toBeVisible();
  await renameInput.fill("Intro");
  await renameInput.press("Enter");
  await expect(matrix.locator('[data-testid="anim-frame"][data-frame="1"]')).toContainText("Intro");
  await expect(page.locator("gnumarus-shell")).toContainText("Frame renamed");
  await matrix.locator('[data-testid="anim-frame"][data-frame="1"]').click({ button: "right" });
  await page.getByRole("button", { name: "Rename frame…" }).click();
  await page.locator("gnumarus-shell input#frameRename").fill("Outro");
  await page.getByRole("button", { name: "Rename", exact: true }).click();
  await expect(matrix.locator('[data-testid="anim-frame"][data-frame="1"]')).toContainText("Outro");
  await matrix.locator('[data-testid="anim-frame"][data-frame="0"]').click();
  await matrix.locator('[data-testid="anim-frame"][data-frame="1"]').click();
  await expect(page.locator('gnumarus-shell [data-testid="toast"]')).toContainText("Outro");
});

test("Help menu lists every keyboard shortcut in a modal", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Help" }).click();
  await page.getByRole("button", { name: "Shortcuts" }).click();
  const dialog = page.locator("gnumarus-shell dialog#shortcutsDialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Keyboard shortcuts");
  // Configurable editor: presets, search, reset and per-row change buttons.
  await expect(dialog.locator('[data-testid="shortcut-preset"]')).toBeVisible();
  await expect(dialog.locator('[data-testid="shortcut-search"]')).toBeVisible();
  await expect(dialog.locator('[data-testid="shortcut-reset-all"]')).toBeVisible();
  await expect(dialog).toContainText("Merge active layer down");
  await expect(dialog).toContainText("Transform");
  await expect(dialog).toContainText("Temporary eyedropper");
  await expect(dialog).toContainText("Merge floating selection into the cell");
  await expect(dialog).toContainText("Reset current cell texture to transparent");
  await expect(dialog).toContainText("Resize tool live");
  await expect(dialog).toContainText("wheel");
  await expect(dialog).toContainText("Zoom canvas at cursor");
  await expect(dialog).toContainText("middle-click");
  await expect(dialog).toContainText("right-drag");
  await expect(dialog).toContainText("ctrl+Z");
  await expect(dialog).toContainText("Quick action search");
  await expect(dialog).toContainText("Reset Canvas Transform");
  await expect(dialog).toContainText("Hide/show all interface chrome");
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toBeHidden();
});

test("Help menu Source code opens the GitHub project page", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Help" }).click();
  const item = page.getByRole("button", { name: "Source code", exact: true });
  await expect(item).toBeVisible();
  const [popup] = await Promise.all([
    page.waitForEvent("popup"),
    item.click(),
  ]);
  expect(popup.url()).toContain("github.com/Gnumaru/GnumarusPaintingApp");
  await popup.close();
});

test("language setting translates the interface to Brazilian Portuguese", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await expect(page.getByRole("button", { name: "File", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  const dialog = page.locator("gnumarus-shell dialog#settingsDialog");
  await expect(dialog.locator("select#localeSelect")).toHaveValue("system");
  await dialog.locator("select#localeSelect").selectOption("pt-BR");
  await expect(page.locator("gnumarus-shell")).toContainText("Idioma: Português (Brasil)");
  const persisted = await page.evaluate(() => window.localStorage.getItem("gnumarus.settings.locale.v1"));
  expect(persisted).toContain('"locale": "pt-BR"');
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  await dialog.getByRole("button", { name: "Fechar" }).click();
  await expect(page.getByRole("button", { name: "Arquivo", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Editar", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ajuda", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Arquivo", exact: true }).click();
  await expect(page.getByRole("button", { name: "Novo projeto", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Novo projeto", exact: true }).click();
  const newDialog = page.locator("gnumarus-shell dialog#newDialog");
  await expect(newDialog).toBeVisible();
  await expect(newDialog).toContainText("Novo canvas");
  await expect(newDialog.getByRole("button", { name: "Criar" })).toBeVisible();
  await newDialog.getByRole("button", { name: "Cancelar" }).click();
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { setLocale(mode: string): void } } };
    root.__gnumarus?.shell?.setLocale("en");
  });
  await expect(page.getByRole("button", { name: "File", exact: true })).toBeVisible();
  await expect(page.locator("gnumarus-shell")).toContainText("Language: English");
});
