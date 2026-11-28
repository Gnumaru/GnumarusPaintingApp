import { expect, test } from "@playwright/test";
import { animationFrameCount, buildAsepriteBytes, buildKraBytes, buildPsdBytes, buildXcfBytes, frameDuration, getLayers, getMatrixFrame, paintCenter, readPixel, setImportCleanup, solidPsdPlane, stubAsepritePicker } from "./e2e-helpers";

test("File > Import loads layers, frames and durations from .ase", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell");
  await stubAsepritePicker(page, "hero.ase", await buildAsepriteBytes(page));
  await page.getByRole("button", { name: "File" }).click();
  await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Import full project", exact: true }).click();
  const toast = page.locator('gnumarus-shell [data-testid="toast"]');
  await expect(toast).toBeVisible();
  await expect(toast).toContainText("Imported hero.ase (2 layers, 2 frames)");
  // Active layer is the top one (fg, 2x2 red texture): texture-space pixels.
  expect(await readPixel(page, 0, 0)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 1, 1)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  // The 2x2 square at canvas (1,1) centers on the 4x4 canvas: offset (0,0).
  const layers = await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getLayers(): Array<{ id: string; transform: { x: number; y: number } }> } };
    };
    return root.__gnumarus?.engine?.getLayers() ?? [];
  });
  expect(layers.map((layer) => layer.id)).toEqual(["layer0", "layer1"]);
  expect(layers[1]?.transform).toMatchObject({ x: 0, y: 0 });
  // Switch to the background layer: solid blue 4x4.
  await page.locator('gnumarus-shell [data-layer-id="layer0"] .layer-name').click();
  expect(await readPixel(page, 0, 0)).toEqual({ r: 0, g: 0, b: 255, a: 255 });
  expect(await readPixel(page, 3, 3)).toEqual({ r: 0, g: 0, b: 255, a: 255 });
  expect(await animationFrameCount(page)).toBe(2);
  expect(await frameDuration(page, 0)).toBe(0.1);
  expect(await frameDuration(page, 1)).toBe(0.25);
});

test("File > Import loads frame tags as named animations", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell");
  await stubAsepritePicker(
    page,
    "tagged.ase",
    await buildAsepriteBytes(page, [{ name: "wave", from: 1, to: 1, loop: 2, repeat: 0 }]),
  );
  await page.getByRole("button", { name: "File" }).click();
  await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Import full project", exact: true }).click();
  const toast = page.locator('gnumarus-shell [data-testid="toast"]');
  await expect(toast).toBeVisible();
  await expect(toast).toContainText("Imported tagged.ase (2 layers, 2 frames, 1 animation)");
  await expect(page.locator('gnumarus-shell [data-testid="animation-select"]')).toContainText("wave");
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await page.locator('gnumarus-shell [data-testid="animation-select"]').selectOption("wave");
  await expect(matrix.locator('.anim-frame-header:has([data-frame="1"])')).toHaveClass(/in-animation/);
  await expect(matrix.locator('.anim-frame-header:has([data-frame="0"])')).not.toHaveClass(/in-animation/);
  // Playback scopes to the tagged frame and stays there.
  await matrix.getByRole("button", { name: "Play animation", exact: true }).click();
  await expect.poll(async () => getMatrixFrame(page), { timeout: 5000 }).toBe(1);
  await page.waitForTimeout(400);
  expect(await getMatrixFrame(page)).toBe(1);
  await matrix.getByRole("button", { name: "Stop animation", exact: true }).click();
  await expect(matrix.getByRole("button", { name: "Play animation", exact: true })).toBeVisible();
});

test("File > Import loads layers and pixels from .xcf", async ({ page }) => {
  const bytes = buildXcfBytes(4, 4, [
    { name: "Top", width: 2, height: 2, offsetX: 2, offsetY: 2, opacity: 128, rgba: [255, 0, 0, 255] },
    { name: "Bottom", width: 4, height: 4, offsetX: 0, offsetY: 0, rgba: [0, 0, 255, 255] },
  ]);
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell");
  await stubAsepritePicker(page, "art.xcf", bytes);
  await page.getByRole("button", { name: "File" }).click();
  await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Import full project", exact: true }).click();
  const toast = page.locator('gnumarus-shell [data-testid="toast"]');
  await expect(toast).toBeVisible();
  await expect(toast).toContainText("Imported art.xcf (2 layers)");
  // File order is top-first; the engine stacks bottom-first.
  const state = await getLayers(page);
  expect(state.layers.map((layer) => layer.name)).toEqual(["Bottom", "Top"]);
  expect(state.layers.map((layer) => layer.id)).toEqual(["layer0", "layer1"]);
  expect(state.layers[1]?.opacity).toBeCloseTo(128 / 255, 5);
  // The 2x2 square at canvas (2,2) centers on the 4x4 canvas: offset (1,1).
  expect(state.layers[1]?.transform).toMatchObject({ x: 1, y: 1 });
  expect(state.active).toBe("layer1");
  // Active layer is the top one: texture-space pixels.
  expect(await readPixel(page, 0, 0)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  // Switch to the background layer: solid blue 4x4.
  await page.locator('gnumarus-shell [data-layer-id="layer0"] .layer-name').click();
  expect(await readPixel(page, 3, 3)).toEqual({ r: 0, g: 0, b: 255, a: 255 });
  expect(await animationFrameCount(page)).toBe(1);
});

test("File > Import loads layers, pixels and frames from .kra", async ({ page }) => {
  const bytes = buildKraBytes(64, 64, [
    { name: "Top", filename: "top", x: 2, y: 2, tiles: [{ x: 0, y: 0, bgra: [0, 0, 255, 255] }] },
    { name: "Bottom", filename: "bottom", tiles: [{ x: 0, y: 0, bgra: [255, 0, 0, 255] }] },
  ]);
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell");
  await setImportCleanup(page, "none");
  await stubAsepritePicker(page, "art.kra", bytes);
  await page.getByRole("button", { name: "File" }).click();
  await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Import full project", exact: true }).click();
  const toast = page.locator('gnumarus-shell [data-testid="toast"]');
  await expect(toast).toBeVisible();
  await expect(toast).toContainText("Imported art.kra (2 layers, 1 frame)");
  // File order is top-first; the engine stacks bottom-first.
  const state = await getLayers(page);
  expect(state.layers.map((layer) => layer.name)).toEqual(["Bottom", "Top"]);
  expect(state.layers.map((layer) => layer.id)).toEqual(["layer0", "layer1"]);
  // The 64x64 tile at layer offset (2,2) centers on the 64x64 canvas: offset (2,2).
  expect(state.layers[1]?.transform).toMatchObject({ x: 2, y: 2 });
  expect(await animationFrameCount(page)).toBe(1);
  expect(await frameDuration(page, 0)).toBeCloseTo(0.1, 3);
});

test("File > Import loads layers and pixels from .psd", async ({ page }) => {
  const bytes = buildPsdBytes(4, 4, [
    {
      top: 2,
      left: 2,
      bottom: 4,
      right: 4,
      opacity: 128,
      name: "Top",
      planes: [
        { id: 0, payload: solidPsdPlane(2, 2, 255) },
        { id: -1, payload: solidPsdPlane(2, 2, 255) },
      ],
    },
    {
      top: 0,
      left: 0,
      bottom: 4,
      right: 4,
      name: "Bottom",
      planes: [
        { id: 0, payload: solidPsdPlane(4, 4, 0) },
        { id: 1, payload: solidPsdPlane(4, 4, 0) },
        { id: 2, payload: solidPsdPlane(4, 4, 255) },
      ],
    },
  ]);
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell");
  await stubAsepritePicker(page, "art.psd", bytes);
  await page.getByRole("button", { name: "File" }).click();
  await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Import full project", exact: true }).click();
  const toast = page.locator('gnumarus-shell [data-testid="toast"]');
  await expect(toast).toBeVisible();
  await expect(toast).toContainText("Imported art.psd (2 layers)");
  // File order is top-first; the engine stacks bottom-first.
  const state = await getLayers(page);
  expect(state.layers.map((layer) => layer.name)).toEqual(["Bottom", "Top"]);
  expect(state.layers.map((layer) => layer.id)).toEqual(["layer0", "layer1"]);
  expect(state.layers[1]?.opacity).toBeCloseTo(128 / 255, 5);
  // The 2x2 square at canvas (2,2) centers on the 4x4 canvas: offset (1,1).
  expect(state.layers[1]?.transform).toMatchObject({ x: 1, y: 1 });
  expect(state.active).toBe("layer1");
  // Active layer is the top one: texture-space pixels.
  expect(await readPixel(page, 0, 0)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  // Switch to the background layer: solid blue 4x4.
  await page.locator('gnumarus-shell [data-layer-id="layer0"] .layer-name').click();
  expect(await readPixel(page, 3, 3)).toEqual({ r: 0, g: 0, b: 255, a: 255 });
  expect(await animationFrameCount(page)).toBe(1);
});

test("File > Import falls back to the composite image for flattened .psd", async ({ page }) => {
  const bytes = buildPsdBytes(2, 2, [], [
    solidPsdPlane(2, 2, 0),
    solidPsdPlane(2, 2, 200),
    solidPsdPlane(2, 2, 0),
  ]);
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell");
  await stubAsepritePicker(page, "flat.psd", bytes);
  await page.getByRole("button", { name: "File" }).click();
  await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Import full project", exact: true }).click();
  const toast = page.locator('gnumarus-shell [data-testid="toast"]');
  await expect(toast).toBeVisible();
  await expect(toast).toContainText("Imported flat.psd (1 layer)");
  const state = await getLayers(page);
  expect(state.layers.map((layer) => layer.name)).toEqual(["Background"]);
  expect(await readPixel(page, 1, 1)).toEqual({ r: 0, g: 200, b: 0, a: 255 });
});

test("File > Import rejects corrupt files with an error toast", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell");
  await stubAsepritePicker(page, "broken.ase", new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]));
  await page.getByRole("button", { name: "File" }).click();
  await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Import full project", exact: true }).click();
  const toast = page.locator('gnumarus-shell [data-testid="toast"]');
  await expect(toast).toBeVisible();
  await expect(toast).toContainText("Import failed");
  expect(errors.some((text) => text.includes("Import failed"))).toBe(true);
});

test("File > Import cancellation stays silent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell");
  await page.evaluate(() => {
    const root = window as unknown as { showOpenFilePicker?: () => Promise<never> };
    root.showOpenFilePicker = async () => {
      throw new DOMException("User cancelled", "AbortError");
    };
  });
  await page.getByRole("button", { name: "File" }).click();
  await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Import full project", exact: true }).click();
  await expect(page.locator('gnumarus-shell [data-testid="toast"]')).toBeHidden();
});

test("content and texture pickers render only while open", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  // Closed pickers render no thumbnails, keeping frame switches cheap.
  await expect(page.locator('gnumarus-shell [data-testid="content-picker-grid"]')).toHaveCount(0);
  await expect(page.locator('gnumarus-shell [data-testid="texture-picker-grid"]')).toHaveCount(0);
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  const cell = matrix.locator('[data-testid="anim-cell"][data-matrix-frame="0"]').first();
  await cell.click({ button: "right" });
  await page.getByRole("button", { name: "Select content" }).click();
  await expect(page.locator('gnumarus-shell [data-testid="content-picker-grid"]')).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator('gnumarus-shell [data-testid="content-picker-grid"]')).toHaveCount(0);
});

test("layer menu Crop to canvas removes outside excess and stays undoable", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  // Full-canvas red texture with the content shifted 32px left and up.
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: {
        engine?: {
          loadProject(
            width: number,
            height: number,
            inputs: Array<{
              id: string;
              name: string;
              visible: boolean;
              opacity: number;
              width: number;
              height: number;
              buffer: Uint8ClampedArray;
              transform: unknown;
              lockedChannels: { r: boolean; g: boolean; b: boolean; a: boolean };
            }>,
          ): void;
        };
      };
    };
    const red = new Uint8ClampedArray(64 * 64 * 4);
    for (let i = 0; i < 64 * 64; i += 1) {
      red[i * 4] = 255;
      red[i * 4 + 3] = 255;
    }
    root.__gnumarus?.engine?.loadProject(64, 64, [
      {
        id: "layer0",
        name: "Layer 1",
        visible: true,
        opacity: 1,
        width: 64,
        height: 64,
        buffer: red,
        transform: {
          x: -32, y: -32, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1,
          skewX: 0, skewY: 0, rotationX: 0, rotationY: 0,
        },
        lockedChannels: { r: false, g: false, b: false, a: false },
      },
    ]);
  });
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  await page.getByRole("button", { name: "Final preview" }).click();
  const previewCanvas = page.locator("gnumarus-shell canvas#previewCanvas");
  await expect(previewCanvas).toBeVisible();
  const previewPixel = (x: number, y: number): Promise<number[] | null> =>
    page.evaluate(([px, py]: number[]) => {
      const root = document.querySelector("gnumarus-shell")?.shadowRoot ?? null;
      const target = root?.getElementById("previewCanvas") as HTMLCanvasElement | null;
      const ctx = target?.getContext("2d") ?? null;
      if (ctx === null) {
        return null;
      }
      const data = ctx.getImageData(px, py, 1, 1).data;
      return [data[0], data[1], data[2], data[3]];
    }, [x, y]);
  expect(await previewPixel(0, 0)).toEqual([255, 0, 0, 255]);
  await page.locator('gnumarus-shell [data-layer-id="layer0"]').click({ button: "right" });
  await page.getByRole("button", { name: "Crop to canvas" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Texture cropped to 32 x 32");
  const cropped = (await getLayers(page)).layers[0];
  expect(cropped?.width).toBe(32);
  expect(cropped?.height).toBe(32);
  expect(cropped?.transform.x).toBeCloseTo(-16, 9);
  expect(cropped?.transform.y).toBeCloseTo(-16, 9);
  // Kept pixels are the old bottom-right quadrant.
  expect(await readPixel(page, 0, 0)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 31, 31)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  // Rendering position is preserved: canvas origin still shows red.
  expect(await previewPixel(0, 0)).toEqual([255, 0, 0, 255]);
  // Undo restores the full texture and transform; redo crops again.
  await page.keyboard.press("Control+z");
  const undone = (await getLayers(page)).layers[0];
  expect(undone?.width).toBe(64);
  expect(undone?.transform.x).toBeCloseTo(-32, 9);
  await page.keyboard.press("Control+y");
  const redone = (await getLayers(page)).layers[0];
  expect(redone?.width).toBe(32);
  expect(redone?.transform.x).toBeCloseTo(-16, 9);
});

test("cell menu Crop to canvas reports edge cases", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintCenter(page);
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  const cell = matrix.locator('[data-testid="anim-cell"][data-matrix-layer="layer0"][data-matrix-frame="0"]');
  await cell.click({ button: "right" });
  await page.getByRole("button", { name: "Crop to canvas" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText(
    "Nothing to crop: texture is already inside the canvas",
  );
  // Push the content fully off-canvas, then crop refuses.
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getLayers(): Array<{ width: number }> ; setLayerTransform(id: string, t: unknown): boolean } };
    };
    const width = root.__gnumarus?.engine?.getLayers()[0]?.width ?? 64;
    root.__gnumarus?.engine?.setLayerTransform("layer0", { x: width + 10, y: 0 });
  });
  await cell.click({ button: "right" });
  await page.getByRole("button", { name: "Crop to canvas" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText(
    "Cannot crop: cell content is fully outside the canvas",
  );
});
