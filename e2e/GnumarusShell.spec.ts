import { expect, test } from "@playwright/test";
import { imageToScreenPixel, layerPixelToScreen } from "../src/canvas/GnumarusViewportMath";

interface GnumarusPixel {
  r: number;
  g: number;
  b: number;
  a: number;
}

async function readPixel(page: import("@playwright/test").Page, x: number, y: number): Promise<GnumarusPixel | null> {
  return page.evaluate(([px, py]: number[]) => {
    const root = window as unknown as {
      __gnumarus?: {
        engine?: { readPixel(x: number, y: number): GnumarusPixel | null };
      };
    };
    return root.__gnumarus?.engine?.readPixel(px, py) ?? null;
  }, [x, y]);
}

async function setPencil(page: import("@playwright/test").Page, hex: string): Promise<void> {
  await page.evaluate((value: string) => {
    const root = window as unknown as {
      __gnumarus?: { shell?: { setPencilColor(hex: string): void } };
    };
    root.__gnumarus?.shell?.setPencilColor(value);
  }, hex);
}

async function setChecker(page: import("@playwright/test").Page, which: "A" | "B", hex: string): Promise<void> {
  await page.evaluate(
    ([side, value]: [string, string]) => {
      const root = window as unknown as {
        __gnumarus?: {
          shell?: { setCheckerColorA(hex: string): void; setCheckerColorB(hex: string): void };
        };
      };
      if (side === "A") {
        root.__gnumarus?.shell?.setCheckerColorA(value);
      } else {
        root.__gnumarus?.shell?.setCheckerColorB(value);
      }
    },
    [which, hex] as [string, string],
  );
}

async function openPicker(page: import("@playwright/test").Page, pickerId: string): Promise<import("@playwright/test").Locator> {
  const picker = page.locator(`gnumarus-shell #${pickerId}`);
  await picker.getByRole("button", { name: "Pick color" }).click();
  await expect(picker.getByRole("dialog", { name: "Color picker" })).toBeVisible();
  return picker;
}

test("shell boots with menu, toolbar, canvas host and status bar", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error: Error) => {
    errors.push(error.message);
  });
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell");
  await expect(page.locator("gnumarus-shell")).toBeAttached();

  await page.getByRole("button", { name: "File" }).click();
  await expect(page.getByRole("button", { name: "New" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save" })).toBeVisible();

  await expect(page.locator("gnumarus-shell")).toContainText("64 x 64");
  await expect(page.locator("gnumarus-shell")).toContainText("pencil");
  expect(await readPixel(page, 0, 0)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  expect(errors).toEqual([]);
});

test("File > New creates a canvas with the requested size", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell");
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "New" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("New canvas");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("64 x 64");
});

test("pencil draws a solid pixel on the WebGL2 canvas", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell");
  const canvas = page.locator("gnumarus-shell canvas");
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 12, box.y + box.height / 2 + 12, { steps: 4 });
  await page.mouse.up();
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
});

test("keyboard shortcuts zoom in and out", async ({ page }) => {
  const zoomOf = (): Promise<number> =>
    page.evaluate(() => {
      const root = window as unknown as {
        __gnumarus?: { engine?: { currentZoom: number } };
      };
      return root.__gnumarus?.engine?.currentZoom ?? 0;
    });
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const before = await zoomOf();
  expect(before).toBeGreaterThan(0);
  await page.keyboard.press("Control+Alt+=");
  expect(await zoomOf()).toBeCloseTo(before * 1.25, 5);
  await page.keyboard.press("Control+Alt+NumpadAdd");
  expect(await zoomOf()).toBeCloseTo(before * 1.25 * 1.25, 4);
  await page.keyboard.press("Control+Alt+-");
  await page.keyboard.press("Control+Alt+NumpadSubtract");
  expect(await zoomOf()).toBeCloseTo(before, 4);
});

test("Edit > Settings changes the checkerboard", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Checkerboard mode");
  await page.locator("gnumarus-shell select#checkerMode").selectOption("screen");
  await page.locator("gnumarus-shell input#checkerSizeX").fill("8");
  await page.locator("gnumarus-shell input#checkerSizeY").fill("16");
  const checkerPicker = await openPicker(page, "checkerColorA");
  await checkerPicker.locator("select#modelSelect").selectOption("rgb");
  await checkerPicker.getByLabel("Red", { exact: true }).fill("255");
  await checkerPicker.getByLabel("Green", { exact: true }).fill("0");
  await checkerPicker.getByLabel("Blue", { exact: true }).fill("0");
  await page.keyboard.press("Escape");
  const settings = await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: {
        engine?: {
          getCheckerSettings(): { mode: string; sizeX: number; sizeY: number; colorA: string; colorB: string };
        };
      };
    };
    return root.__gnumarus?.engine?.getCheckerSettings() ?? null;
  });
  expect(settings).toEqual({ mode: "screen", sizeX: 8, sizeY: 16, colorA: "#ff0000", colorB: "#949494" });
  await expect(page.locator("gnumarus-shell")).toContainText("Checker color A: #ff0000");
});

interface GnumarusViewState {
  zoom: number;
  rotation: number;
  flipX: boolean;
  flipY: boolean;
}

async function getViewState(page: import("@playwright/test").Page): Promise<GnumarusViewState> {
  return page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getViewState(): GnumarusViewState } };
    };
    const state = root.__gnumarus?.engine?.getViewState();
    if (state === undefined) {
      throw new Error("engine view state is unavailable");
    }
    return state;
  });
}

test("loupe left-drag zooms and right-drag rotates", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Loupe" }).click();
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  const beforeZoom = (await getViewState(page)).zoom;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 40, cy - 60, { steps: 5 });
  await page.mouse.up();
  expect((await getViewState(page)).zoom).toBeGreaterThan(beforeZoom);

  await page.mouse.move(cx + 60, cy);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(cx, cy + 60, { steps: 5 });
  await page.mouse.up({ button: "right" });
  const rotation = (await getViewState(page)).rotation;
  expect(rotation).toBeGreaterThan(Math.PI / 3);
  expect(rotation).toBeLessThan(Math.PI * 0.75);
  await expect(page.locator("gnumarus-shell")).toContainText("°");
});

test("loupe middle-click flips the canvas", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Loupe" }).click();
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  expect(await getViewState(page)).toMatchObject({ flipX: false, flipY: false });
  await page.mouse.click(cx, cy, { button: "middle" });
  expect(await getViewState(page)).toMatchObject({ flipX: true, flipY: false });
  await page.keyboard.down("Shift");
  await page.mouse.click(cx, cy, { button: "middle" });
  await page.keyboard.up("Shift");
  expect(await getViewState(page)).toMatchObject({ flipX: true, flipY: true });
  await expect(page.locator("gnumarus-shell")).toContainText("Flip XY");
});

test("P and L switch between pencil and loupe", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await expect(page.locator("gnumarus-shell")).toContainText("pencil");
  await page.keyboard.press("l");
  await expect(page.locator("gnumarus-shell")).toContainText("loupe");
  await page.keyboard.press("p");
  await expect(page.locator("gnumarus-shell")).toContainText("pencil");
});

test("Edit > Reset Canvas Transform restores the default view", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const fit = await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: {
        engine?: {
          setRotation(r: number): void;
          setFlip(x: boolean, y: boolean): void;
          setZoom(z: number): void;
          getViewState(): GnumarusViewState;
        };
      };
    };
    const engine = root.__gnumarus?.engine;
    const fitZoom = engine?.getViewState().zoom ?? 0;
    engine?.setRotation(1);
    engine?.setFlip(true, true);
    engine?.setZoom(30);
    return fitZoom;
  });
  const transformed = await getViewState(page);
  expect(transformed.rotation).toBeCloseTo(1, 5);
  expect(transformed).toMatchObject({ flipX: true, flipY: true });
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Reset Canvas Transform" }).click();
  expect(await getViewState(page)).toEqual({ zoom: fit, rotation: 0, flipX: false, flipY: false });
});

test("loupe Ctrl+middle-click resets the transform", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Loupe" }).click();
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { setRotation(r: number): void } };
    };
    root.__gnumarus?.engine?.setRotation(1.2);
  });
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  await page.keyboard.down("Control");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: "middle" });
  await page.keyboard.up("Control");
  expect((await getViewState(page)).rotation).toBeCloseTo(0, 5);
});

test("undo and redo restore image pixels via menu and shortcuts", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Edit" }).click();
  await expect(page.getByRole("button", { name: "Undo" })).toBeDisabled();
  await page.getByRole("button", { name: "Edit" }).click();

  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 12, box.y + box.height / 2 + 12, { steps: 4 });
  await page.mouse.up();
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });

  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });

  await page.keyboard.press("Control+y");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });

  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Undo" }).click();
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
});

test("transform changes are not recorded in undo history", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.up();
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });

  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: {
        engine?: {
          setRotation(r: number): void;
          setFlip(x: boolean, y: boolean): void;
          setZoom(z: number): void;
        };
      };
    };
    root.__gnumarus?.engine?.setRotation(0.7);
    root.__gnumarus?.engine?.setFlip(true, false);
    root.__gnumarus?.engine?.setZoom(20);
  });
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  const view = await getViewState(page);
  expect(view.rotation).toBeCloseTo(0.7, 5);
  expect(view).toMatchObject({ flipX: true, zoom: 20 });
});

interface GnumarusLayerState {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  width: number;
  height: number;
  transform: { x: number; y: number; rotation: number; flipX: boolean; flipY: boolean };
}

async function getLayers(page: import("@playwright/test").Page): Promise<{
  layers: GnumarusLayerState[];
  active: string;
}> {
  return page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: {
        engine?: {
          getLayers(): GnumarusLayerState[];
          getActiveLayerId(): string;
        };
      };
    };
    return {
      layers: root.__gnumarus?.engine?.getLayers() ?? [],
      active: root.__gnumarus?.engine?.getActiveLayerId() ?? "",
    };
  });
}

test("layers can be added, renamed, reordered, hidden and removed", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  let state = await getLayers(page);
  expect(state.layers.map((layer) => layer.id)).toEqual(["layer0"]);

  await page.getByRole("button", { name: "Add layer" }).click();
  state = await getLayers(page);
  expect(state.layers.map((layer) => layer.id)).toEqual(["layer0", "layer1"]);
  expect(state.active).toBe("layer1");

  const row1 = page.locator('gnumarus-shell [data-layer-id="layer1"]');
  await row1.locator(".layer-name").dblclick();
  await row1.locator("input.layer-rename").fill("Top");
  await row1.locator("input.layer-rename").press("Enter");
  state = await getLayers(page);
  expect(state.layers[1]?.name).toBe("Top");

  await row1.getByRole("button", { name: "Move layer down" }).click();
  state = await getLayers(page);
  expect(state.layers.map((layer) => layer.id)).toEqual(["layer1", "layer0"]);

  const row0 = page.locator('gnumarus-shell [data-layer-id="layer0"]');
  await row0.getByRole("checkbox").click();
  state = await getLayers(page);
  expect(state.layers.find((layer) => layer.id === "layer0")?.visible).toBe(false);

  await row0.locator("input[type=range]").fill("50");
  state = await getLayers(page);
  expect(state.layers.find((layer) => layer.id === "layer0")?.opacity).toBeCloseTo(0.5, 5);

  await row0.click();
  expect((await getLayers(page)).active).toBe("layer0");
  await page.locator('gnumarus-shell [data-layer-id="layer1"]').getByRole("button", { name: "Delete layer" }).click();
  state = await getLayers(page);
  expect(state.layers.map((layer) => layer.id)).toEqual(["layer0"]);
  await expect(
    page.locator('gnumarus-shell [data-layer-id="layer0"]').getByRole("button", { name: "Delete layer" }),
  ).toBeDisabled();
});

test("undo restores pixels on the correct layer", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const paintCenter = async (): Promise<void> => {
    // Re-measure every time: adding layers grows the animation matrix and
    // shrinks the canvas, so a cached box would click off-center.
    const canvas = page.locator("gnumarus-shell canvas");
    const box = await canvas.boundingBox();
    if (box === null) {
      throw new Error("canvas has no bounding box");
    }
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.up();
  };
  await paintCenter();
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });

  await page.getByRole("button", { name: "Add layer" }).click();
  await paintCenter();
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });

  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });

  await page.locator('gnumarus-shell [data-layer-id="layer0"] .layer-name').click();
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });

  await page.keyboard.press("Control+y");
  await page.locator('gnumarus-shell [data-layer-id="layer1"] .layer-name').click();
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
});

test("layer context menu merges down with opacity", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.click(cx, cy);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });

  await page.getByRole("button", { name: "Add layer" }).click();
  await setPencil(page, "#ff0000");
  const afterAdd = await page.locator("gnumarus-shell canvas").boundingBox();
  if (afterAdd === null) {
    throw new Error("canvas has no bounding box");
  }
  await page.mouse.click(afterAdd.x + afterAdd.width / 2, afterAdd.y + afterAdd.height / 2);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });

  const row1 = page.locator('gnumarus-shell [data-layer-id="layer1"]');
  await row1.click({ button: "right" });
  await page.getByRole("button", { name: "Merge Down" }).click();
  expect(await getLayers(page)).toMatchObject({ layers: [{ id: "layer0" }] });
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });

  const row0 = page.locator('gnumarus-shell [data-layer-id="layer0"]');
  await row0.click({ button: "right" });
  await expect(page.getByRole("button", { name: "Merge Down" })).toBeDisabled();
  await page.mouse.click(cx, cy + 200);

  await page.keyboard.press("Control+z");
  const afterUndo = await getLayers(page);
  expect(afterUndo.layers.map((layer) => layer.id)).toEqual(["layer0", "layer1"]);
  await page.locator('gnumarus-shell [data-layer-id="layer0"] .layer-name').click();
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });

  await page.keyboard.press("Control+y");
  expect(await getLayers(page)).toMatchObject({ layers: [{ id: "layer0" }] });
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("transform tool moves, rotates and flips the active layer", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.keyboard.press("t");
  await expect(page.locator("gnumarus-shell")).toContainText("transform");
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const zoomBefore = (await getViewState(page)).zoom;

  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx, cy + 40, { steps: 4 });
  await page.mouse.up();
  let transform = (await getLayers(page)).layers[0]?.transform;
  expect(transform?.x ?? 0).toBeCloseTo(0, 4);
  expect(transform?.y ?? 0).toBeCloseTo(40 / zoomBefore, 4);

  await page.mouse.move(cx + 60, cy);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(cx, cy + 60, { steps: 4 });
  await page.mouse.up({ button: "right" });
  transform = (await getLayers(page)).layers[0]?.transform;
  expect(transform?.rotation ?? 0).toBeGreaterThan(Math.PI / 3);
  expect(transform?.rotation ?? 0).toBeLessThan(Math.PI * 0.75);

  await page.mouse.click(cx, cy, { button: "middle" });
  transform = (await getLayers(page)).layers[0]?.transform;
  expect(transform).toMatchObject({ flipX: true, flipY: false });
  await page.keyboard.down("Shift");
  await page.mouse.click(cx, cy, { button: "middle" });
  await page.keyboard.up("Shift");
  transform = (await getLayers(page)).layers[0]?.transform;
  expect(transform).toMatchObject({ flipX: true, flipY: true });
});

test("painting works on a layer smaller than the project", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
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
              transform: { x: number; y: number; rotation: number; flipX: boolean; flipY: boolean };
            }>,
          ): void;
        };
      };
    };
    const red = new Uint8ClampedArray(8 * 8 * 4);
    for (let i = 0; i < 8 * 8; i += 1) {
      red[i * 4] = 255;
      red[i * 4 + 3] = 255;
    }
    root.__gnumarus?.engine?.loadProject(64, 64, [
      {
        id: "tiny",
        name: "Tiny",
        visible: true,
        opacity: 1,
        width: 8,
        height: 8,
        buffer: red,
        transform: { x: 0, y: 0, rotation: 0, flipX: false, flipY: false },
      },
    ]);
  });
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const state = await getViewState(page);
  const layers = await getLayers(page);
  expect(layers.layers.map((layer) => layer.id)).toEqual(["tiny"]);
  const target = layerPixelToScreen(
    2,
    2,
    { left: box.x, top: box.y, width: box.width, height: box.height },
    8,
    8,
    { zoom: state.zoom, panX: 0, panY: 0, rotation: state.rotation, flipX: false, flipY: false },
    { x: 0, y: 0, rotation: 0, flipX: false, flipY: false },
  );
  await page.mouse.click(target.x, target.y);
  expect(await readPixel(page, 2, 2)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 0, 0)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("pencil paints the right pixel while the canvas is rotated", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const view = await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: {
        engine?: {
          setRotation(radians: number): void;
          getViewState(): GnumarusViewState;
        };
      };
    };
    root.__gnumarus?.engine?.setRotation(Math.PI / 2);
    return root.__gnumarus?.engine?.getViewState();
  });
  expect(view?.rotation).toBeCloseTo(Math.PI / 2, 5);
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const state = await getViewState(page);
  const target = imageToScreenPixel(
    63,
    32,
    { left: box.x, top: box.y, width: box.width, height: box.height },
    64,
    64,
    { zoom: state.zoom, panX: 0, panY: 0, rotation: state.rotation, flipX: false, flipY: false },
  );
  await page.mouse.click(target.x, target.y);
  expect(await readPixel(page, 63, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 0, 0)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
});

test("channel locks toggle in the panel and mask pencil strokes", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const row0 = page.locator('gnumarus-shell [data-layer-id="layer0"]');
  await expect(row0.getByRole("button", { name: "Lock green channel" })).toBeVisible();
  await expect(row0.getByRole("button", { name: "Lock alpha channel" })).toHaveAttribute("aria-pressed", "false");

  await row0.getByRole("button", { name: "Lock green channel" }).click();
  await expect(row0.getByRole("button", { name: "Lock green channel" })).toHaveAttribute("aria-pressed", "true");
  const locked = await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getLayers(): Array<{ lockedChannels: { r: boolean; g: boolean; b: boolean; a: boolean } }> } };
    };
    return root.__gnumarus?.engine?.getLayers()[0]?.lockedChannels ?? null;
  });
  expect(locked).toEqual({ r: false, g: true, b: false, a: false });

  await setPencil(page, "#00ffff");
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 255, a: 255 });

  await row0.getByRole("button", { name: "Lock green channel" }).click();
  await expect(row0.getByRole("button", { name: "Lock green channel" })).toHaveAttribute("aria-pressed", "false");
});

test("alpha lock preserves alpha while painting", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
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
              transform: { x: number; y: number; rotation: number; flipX: boolean; flipY: boolean };
              lockedChannels: { r: boolean; g: boolean; b: boolean; a: boolean };
            }>,
          ): void;
          setLayerChannelLocked(id: string, channel: "r" | "g" | "b" | "a", locked: boolean): boolean;
        };
      };
    };
    const buffer = new Uint8ClampedArray(64 * 64 * 4);
    const i = (32 * 64 + 32) * 4;
    buffer[i] = 10;
    buffer[i + 1] = 20;
    buffer[i + 2] = 30;
    buffer[i + 3] = 40;
    root.__gnumarus?.engine?.loadProject(64, 64, [
      {
        id: "layer0",
        name: "Layer 0",
        visible: true,
        opacity: 1,
        width: 64,
        height: 64,
        buffer,
        transform: { x: 0, y: 0, rotation: 0, flipX: false, flipY: false },
        lockedChannels: { r: false, g: false, b: false, a: true },
      },
    ]);
  });
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 40 });
});

test("merge down respects destination locks and undo restores the upper lock", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.click(cx, cy);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });

  await page.getByRole("button", { name: "Add layer" }).click();
  await setPencil(page, "#ff0000");
  const afterAddLocks = await page.locator("gnumarus-shell canvas").boundingBox();
  if (afterAddLocks === null) {
    throw new Error("canvas has no bounding box");
  }
  await page.mouse.click(afterAddLocks.x + afterAddLocks.width / 2, afterAddLocks.y + afterAddLocks.height / 2);

  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { setLayerChannelLocked(id: string, channel: "r" | "g" | "b" | "a", locked: boolean): boolean } };
    };
    root.__gnumarus?.engine?.setLayerChannelLocked("layer0", "r", true);
    root.__gnumarus?.engine?.setLayerChannelLocked("layer1", "g", true);
  });

  const row1 = page.locator('gnumarus-shell [data-layer-id="layer1"]');
  await row1.click({ button: "right" });
  await page.getByRole("button", { name: "Merge Down" }).click();
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });

  await page.keyboard.press("Control+z");
  const locks = await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getLayers(): Array<{ id: string; lockedChannels: { r: boolean; g: boolean; b: boolean; a: boolean } }> } };
    };
    return root.__gnumarus?.engine?.getLayers().map((layer) => ({ id: layer.id, locked: layer.lockedChannels })) ?? [];
  });
  expect(locks).toEqual([
    { id: "layer0", locked: { r: true, g: false, b: false, a: false } },
    { id: "layer1", locked: { r: false, g: true, b: false, a: false } },
  ]);
});

test("layer resize expands right and down and crops right and below", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const row0 = page.locator('gnumarus-shell [data-layer-id="layer0"]');
  await expect(row0).toContainText("64×64");

  await row0.getByRole("button", { name: "Resize layer" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Resize layer");
  await page.locator("gnumarus-shell input#resizeWidth").fill("4");
  await page.locator("gnumarus-shell input#resizeHeight").fill("4");
  await page.getByRole("button", { name: "Resize", exact: true }).click();
  await expect(row0).toContainText("4×4");

  const dims = await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getLayers(): Array<{ width: number; height: number }> } };
    };
    return root.__gnumarus?.engine?.getLayers()[0] ?? null;
  });
  expect(dims).toMatchObject({ width: 4, height: 4 });

  await row0.getByRole("button", { name: "Resize layer" }).click();
  await page.locator("gnumarus-shell input#resizeWidth").fill("8");
  await page.locator("gnumarus-shell input#resizeHeight").fill("6");
  await page.getByRole("button", { name: "Resize", exact: true }).click();
  await expect(row0).toContainText("8×6");
});

test("layer resize is undoable and preserves top-left pixels", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.click(cx, cy);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });

  const resized = await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { resizeLayer(id: string, w: number, h: number): boolean } };
    };
    return root.__gnumarus?.engine?.resizeLayer("layer0", 4, 4);
  });
  expect(resized).toBe(true);
  expect(await readPixel(page, 0, 0)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  expect(await readPixel(page, 2, 2)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  expect(await readPixel(page, 32, 32)).toBeNull();

  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  const afterUndo = await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getLayers(): Array<{ width: number; height: number }> } };
    };
    return root.__gnumarus?.engine?.getLayers()[0] ?? null;
  });
  expect(afterUndo).toMatchObject({ width: 64, height: 64 });

  await page.keyboard.press("Control+y");
  expect(await readPixel(page, 32, 32)).toBeNull();
  const afterRedo = await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getLayers(): Array<{ width: number; height: number }> } };
    };
    return root.__gnumarus?.engine?.getLayers()[0] ?? null;
  });
  expect(afterRedo).toMatchObject({ width: 4, height: 4 });
});

async function getGrid(page: import("@playwright/test").Page): Promise<{
  visible: boolean;
  minZoom: number;
  layerId: string | null;
  width: number;
  height: number;
}> {
  return page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: {
        engine?: {
          getGridState(): { visible: boolean; minZoom: number; layerId: string | null; width: number; height: number };
        };
      };
    };
    const state = root.__gnumarus?.engine?.getGridState();
    if (state === undefined) {
      throw new Error("grid state is unavailable");
    }
    return state;
  });
}

test("pixel grid hides below 200 percent and shows above", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { setZoom(z: number): void } };
    };
    root.__gnumarus?.engine?.setZoom(10);
  });
  expect((await getGrid(page)).visible).toBe(true);
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { setZoom(z: number): void } };
    };
    root.__gnumarus?.engine?.setZoom(1);
  });
  expect((await getGrid(page)).visible).toBe(false);
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { setZoom(z: number): void } };
    };
    root.__gnumarus?.engine?.setZoom(16);
  });
  const state = await getGrid(page);
  expect(state.visible).toBe(true);
  expect(state.minZoom).toBeCloseTo(10, 5);
  expect(state.layerId).toBe("layer0");
  expect(state.width).toBe(64);
});

test("pixel grid threshold is configurable in Edit > Settings", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Pixel grid minimum zoom");
  await page.locator("gnumarus-shell input#gridMinZoom").fill("400");
  const grid = await getGrid(page);
  expect(grid.minZoom).toBeCloseTo(4, 5);
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { setZoom(z: number): void } };
    };
    root.__gnumarus?.engine?.setZoom(2);
  });
  expect((await getGrid(page)).visible).toBe(false);
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { setZoom(z: number): void } };
    };
    root.__gnumarus?.engine?.setZoom(4);
  });
  expect((await getGrid(page)).visible).toBe(true);
  const persisted = await page.evaluate(() => window.localStorage.getItem("gnumarus.settings.grid.v1"));
  expect(persisted).toContain("4");
  await page.locator("gnumarus-shell input#gridMinZoom").fill("100");
  expect((await getGrid(page)).minZoom).toBeCloseTo(2, 5);
  await page.locator("gnumarus-shell input#gridMinZoom").fill("99999");
  expect((await getGrid(page)).minZoom).toBeCloseTo(64, 5);
});

test("pixel grid follows the active layer transform", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Add layer" }).click();
  let grid = await getGrid(page);
  expect(grid.layerId).toBe("layer1");
  await page.locator('gnumarus-shell [data-layer-id="layer0"] .layer-name').click();
  grid = await getGrid(page);
  expect(grid.layerId).toBe("layer0");
  const matrices = await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: {
        engine?: {
          setZoom(z: number): void;
          setLayerTransform(id: string, t: { rotation: number }): boolean;
          getGridPlaneMatrix(): number[];
          getLayerPlaneMatrix(id: string): number[] | null;
          getActiveLayerId(): string;
        };
      };
    };
    const engine = root.__gnumarus?.engine;
    if (engine === undefined) {
      throw new Error("engine is unavailable");
    }
    engine.setZoom(16);
    engine.setLayerTransform(engine.getActiveLayerId(), { rotation: Math.PI / 4 });
    return { grid: engine.getGridPlaneMatrix(), layer: engine.getLayerPlaneMatrix(engine.getActiveLayerId()) };
  });
  expect(matrices.layer).not.toBeNull();
  if (matrices.layer === null) {
    throw new Error("layer matrix is missing");
  }
  for (const index of [0, 1, 4, 5, 12, 13]) {
    expect(matrices.grid[index]).toBeCloseTo(matrices.layer[index] ?? 0, 4);
  }
  expect(await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { isPixelGridVisible(): boolean } };
    };
    return root.__gnumarus?.engine?.isPixelGridVisible() ?? false;
  })).toBe(true);
});

test("pixel grid stays visible across max zoom out/in with black checkerboard", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error: Error) => {
    errors.push(error.message);
  });
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await setChecker(page, "A", "#000000");
  await setChecker(page, "B", "#000000");
  await page.getByRole("button", { name: "Close" }).click();
  const setZoom = (zoom: number): Promise<void> =>
    page.evaluate((value: number) => {
      const root = window as unknown as {
        __gnumarus?: { engine?: { setZoom(z: number): void } };
      };
      root.__gnumarus?.engine?.setZoom(value);
    }, zoom);
  const isVisible = (): Promise<boolean> =>
    page.evaluate(() => {
      const root = window as unknown as {
        __gnumarus?: { engine?: { isPixelGridVisible(): boolean } };
      };
      return root.__gnumarus?.engine?.isPixelGridVisible() ?? false;
    });
  await setZoom(64);
  expect(await isVisible()).toBe(true);
  await setZoom(48);
  expect(await isVisible()).toBe(true);
  await setZoom(64);
  expect(await isVisible()).toBe(true);
  await setZoom(32);
  expect(await isVisible()).toBe(true);
  await setZoom(64);
  expect(await isVisible()).toBe(true);
  expect(errors).toEqual([]);
});

test("settings show reset arrows only when non-default and reset on click", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Pixel grid minimum zoom");
  expect(await page.getByRole("button", { name: "Reset pixel grid minimum zoom to default" }).count()).toBe(0);
  await page.locator("gnumarus-shell input#gridMinZoom").fill("400");
  await expect(page.getByRole("button", { name: "Reset pixel grid minimum zoom to default" })).toBeVisible();
  await page.getByRole("button", { name: "Reset pixel grid minimum zoom to default" }).click();
  expect(await getGrid(page)).toMatchObject({ minZoom: 10 });
  expect(await page.getByRole("button", { name: "Reset pixel grid minimum zoom to default" }).count()).toBe(0);
  expect(await page.getByRole("button", { name: "Reset checker width to default" }).count()).toBe(0);
  await page.locator("gnumarus-shell input#checkerSizeX").fill("32");
  await expect(page.getByRole("button", { name: "Reset checker width to default" })).toBeVisible();
  await page.getByRole("button", { name: "Reset checker width to default" }).click();
  const checkerX = await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getCheckerSettings(): { sizeX: number } } };
    };
    return root.__gnumarus?.engine?.getCheckerSettings().sizeX ?? 0;
  });
  expect(checkerX).toBe(16);
});

test("canvas background can switch between checkerboard and solid color", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Background mode");
  await expect(page.locator("gnumarus-shell input#checkerSizeX")).toBeVisible();
  await page.locator("gnumarus-shell select#backgroundMode").selectOption("solid");
  await expect(page.locator("gnumarus-shell input#checkerSizeX")).toHaveCount(0);
  const backgroundPicker = await openPicker(page, "backgroundColor");
  await backgroundPicker.locator("select#modelSelect").selectOption("rgb");
  await backgroundPicker.getByLabel("Red", { exact: true }).fill("255");
  await backgroundPicker.getByLabel("Green", { exact: true }).fill("0");
  await backgroundPicker.getByLabel("Blue", { exact: true }).fill("0");
  await backgroundPicker.getByRole("button", { name: "Pick color" }).click();
  const background = await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getBackgroundSettings(): { mode: string; color: string } } };
    };
    return root.__gnumarus?.engine?.getBackgroundSettings() ?? null;
  });
  expect(background).toEqual({ mode: "solid", color: "#ff0000" });
  const persisted = await page.evaluate(() => window.localStorage.getItem("gnumarus.settings.background.v1"));
  expect(persisted).toContain("solid");
  await page.locator("gnumarus-shell select#backgroundMode").selectOption("checkerboard");
  await expect(page.locator("gnumarus-shell input#checkerSizeX")).toBeVisible();
  await expect(page.locator("gnumarus-shell #backgroundColor")).toHaveCount(0);
});

test("final preview shows flattened render with zoom and pan", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.getByRole("button", { name: "Final preview" }).click();
  const preview = page.locator('gnumarus-shell [data-testid="final-preview"]');
  await expect(preview).toBeVisible();
  await expect(preview).toContainText("Final preview");
  const previewCanvas = page.locator("gnumarus-shell canvas#previewCanvas");
  await expect(previewCanvas).toBeVisible();
  const size = await previewCanvas.evaluate((element: HTMLCanvasElement) => ({ width: element.width, height: element.height }));
  expect(size).toEqual({ width: 64, height: 64 });
  await expect(preview).toContainText("400%");
  await preview.getByRole("button", { name: "Zoom in preview" }).click();
  await expect(preview).toContainText("800%");
  const scaledWidth = await previewCanvas.evaluate((element: HTMLCanvasElement) => element.style.width);
  expect(scaledWidth).toBe("512px");
  await preview.getByRole("button", { name: "Zoom out preview" }).click();
  await expect(preview).toContainText("400%");
  await preview.getByRole("button", { name: "Close preview" }).click();
  await expect(preview).toHaveCount(0);
});

interface GnumarusTestMatrix {
  frameCount: number;
  currentFrame: number;
  activeLayerId: string;
  rows: Array<{
    layerId: string;
    cells: Array<{ layerId: string; frame: number; contentId: string | null; contentName: string | null }>;
  }>;
  contents: Array<{ id: string; name: string; textureId: string | null }>;
}

async function getMatrix(page: import("@playwright/test").Page): Promise<GnumarusTestMatrix> {
  return page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getAnimationMatrix(): GnumarusTestMatrix } };
    };
    const matrix = root.__gnumarus?.engine?.getAnimationMatrix();
    if (matrix === undefined) {
      throw new Error("animation matrix is unavailable");
    }
    return matrix;
  });
}

async function paintCenter(page: import("@playwright/test").Page): Promise<void> {
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

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
  expect(state.rows[0]?.cells.map((cell) => cell.contentId)).toEqual([expect.any(String), null]);
});

test("new frames start empty and painting a frame does not leak into others", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
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

test("cell context menu creates, dissociates and associates shared contents", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  const cell = matrix.locator('[data-testid="anim-cell"][data-matrix-frame="1"]');
  await expect(cell).toHaveAttribute("aria-label", /empty/);
  await cell.click({ button: "right" });
  await page.getByRole("button", { name: "New content" }).click();
  await expect(cell).not.toHaveAttribute("aria-label", /empty/);
  let state = await getMatrix(page);
  const freshId = state.rows[0]?.cells[1]?.contentId;
  expect(typeof freshId).toBe("string");
  await paintCenter(page);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  await matrix.locator('[data-testid="anim-frame"][data-frame="0"]').click();
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  const firstCell = matrix.locator('[data-testid="anim-cell"][data-matrix-frame="0"]');
  await firstCell.click({ button: "right" });
  await page.getByRole("button", { name: `Use content "${state.rows[0]?.cells[1]?.contentName ?? ""}"` }).click();
  state = await getMatrix(page);
  expect(state.rows[0]?.cells[0]?.contentId).toBe(freshId);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  await firstCell.click({ button: "right" });
  await page.getByRole("button", { name: "Dissociate content" }).click();
  state = await getMatrix(page);
  expect(state.rows[0]?.cells[0]?.contentId).toBeNull();
  expect(await readPixel(page, 32, 32)).toBeNull();
});

test("content texture can be dissociated and associated with another texture", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintCenter(page);
  await page.getByRole("button", { name: "Add layer" }).click();
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  const cell = matrix.locator('[data-testid="anim-cell"][data-matrix-layer="layer1"][data-matrix-frame="0"]');
  await cell.click({ button: "right" });
  await page.getByRole("button", { name: "Dissociate texture" }).click();
  let state = await getMatrix(page);
  const layer1Content = state.rows.find((row) => row.layerId === "layer1")?.cells[0]?.contentId;
  expect(typeof layer1Content).toBe("string");
  expect(state.contents.find((entry) => entry.id === layer1Content)?.textureId).toBeNull();
  const layer1Cell = matrix.locator('[data-testid="anim-cell"][data-matrix-layer="layer1"][data-matrix-frame="0"]');
  await layer1Cell.click();
  expect(await readPixel(page, 0, 0)).toBeNull();
  await layer1Cell.click({ button: "right" });
  await page.getByRole("button", { name: /Use texture "Layer 0 pixels"/ }).click();
  state = await getMatrix(page);
  expect(state.contents.find((entry) => entry.id === layer1Content)?.textureId).toBe("layer0");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
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

test("cell transform is stored per content and follows the frame", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
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
  const boxes = await page.evaluate(() => {
    const root = document.querySelector("gnumarus-shell")?.shadowRoot;
    const buttons = Array.from(root?.querySelectorAll(".toolbar button") ?? []);
    return buttons.map((button) => {
      const rect = (button as HTMLElement).getBoundingClientRect();
      const icon = (button as HTMLElement).querySelector(".tool-icon");
      const transform = icon === null ? "none" : getComputedStyle(icon).transform;
      return {
        label: (button as HTMLElement).getAttribute("aria-label"),
        w: rect.width,
        h: rect.height,
        transform,
      };
    });
  });
  expect(boxes).toHaveLength(7);
  const expected: Record<string, { w: number; h: number }> = {
    Pencil: { w: 33, h: 25 },
    Loupe: { w: 30, h: 25 },
    "Bucket fill": { w: 35, h: 26 },
    Line: { w: 30, h: 25 },
    Curve: { w: 35, h: 29 },
    Transform: { w: 31, h: 29 },
    "Final preview": { w: 32, h: 29 },
  };
  for (const box of boxes) {
    const ref = expected[box.label ?? ""];
    expect(ref).toBeDefined();
    expect(Math.abs(box.w - ref.w)).toBeLessThanOrEqual(1);
    expect(Math.abs(box.h - ref.h)).toBeLessThanOrEqual(1);
    expect(box.transform).not.toBe("none");
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

test("custom picker edits pencil color through models and inputs", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const picker = await openPicker(page, "pencilColor");
  const modelSelect = picker.locator("select#modelSelect");
  await expect(modelSelect.locator("option")).toHaveCount(7);
  for (const id of ["rgb", "cmyk", "hsv", "hsl", "okhsl", "okhsv", "ard"]) {
    await expect(modelSelect.locator(`option[value="${id}"]`)).toHaveCount(1);
  }
  await modelSelect.selectOption("rgb");
  await picker.getByLabel("Red", { exact: true }).fill("255");
  await picker.getByLabel("Green", { exact: true }).fill("0");
  await picker.getByLabel("Blue", { exact: true }).fill("0");
  await picker.getByLabel("Alpha", { exact: true }).fill("255");
  await expect(page.locator("gnumarus-shell")).toContainText("#ff0000");
  await modelSelect.selectOption("cmyk");
  await expect(picker.getByLabel("Cyan", { exact: true })).toHaveValue("0.0");
  await expect(picker.getByLabel("Magenta", { exact: true })).toHaveValue("100.0");
  await picker.getByLabel("Yellow", { exact: true }).fill("0");
  await picker.getByLabel("Magenta", { exact: true }).fill("0");
  await picker.getByLabel("Cyan", { exact: true }).fill("100");
  await picker.getByLabel("Black", { exact: true }).fill("0");
  await expect(page.locator("gnumarus-shell")).toContainText("#00ffff");
  await modelSelect.selectOption("hsl");
  await expect(picker.getByLabel("Hue", { exact: true })).toHaveValue("180.0");
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  await page.keyboard.press("Escape");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 255, b: 255, a: 255 });
});

test("custom picker bars render gradients and drag to change color", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#ff0000");
  const picker = await openPicker(page, "pencilColor");
  await picker.locator("select#modelSelect").selectOption("hsl");
  const hueBar = picker.locator('[data-testid="axis-bar-h"]');
  const style = await hueBar.getAttribute("style");
  expect(style).toContain("linear-gradient(to right");
  expect(style).toContain("rgb(255, 0, 0) 0%");
  expect(style).toContain("100%");
  const before = await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { colorValue: string } } };
    return root.__gnumarus?.shell?.colorValue ?? "";
  });
  const barBox = await hueBar.boundingBox();
  if (barBox === null) {
    throw new Error("hue bar has no bounding box");
  }
  await page.mouse.move(barBox.x + barBox.width * 0.9, barBox.y + barBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(barBox.x + barBox.width * 0.1, barBox.y + barBox.height / 2, { steps: 5 });
  await page.mouse.up();
  const after = await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { colorValue: string } } };
    return root.__gnumarus?.shell?.colorValue ?? "";
  });
  expect(after).not.toBe(before);
  await expect(picker.getByLabel("Hue", { exact: true })).not.toHaveValue("0.0");
});

test("custom picker supports alpha and clamps manual input", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const picker = await openPicker(page, "pencilColor");
  await picker.locator("select#modelSelect").selectOption("rgb");
  await picker.getByLabel("Red", { exact: true }).fill("10");
  await picker.getByLabel("Green", { exact: true }).fill("20");
  await picker.getByLabel("Blue", { exact: true }).fill("30");
  await picker.getByLabel("Alpha", { exact: true }).fill("128");
  await expect(page.locator("gnumarus-shell")).toContainText("#0a141e80");
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  await page.keyboard.press("Escape");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 10, g: 20, b: 30, a: 128 });
  await picker.getByRole("button", { name: "Pick color" }).click();
  await picker.locator("select#modelSelect").selectOption("hsv");
  await picker.getByLabel("Saturation", { exact: true }).fill("999");
  await expect(picker.getByLabel("Saturation", { exact: true })).toHaveValue("100.0");
  const hueBefore = await picker.getByLabel("Hue", { exact: true }).inputValue();
  await picker.getByLabel("Hue", { exact: true }).fill("");
  await picker.getByLabel("Hue", { exact: true }).press("Tab");
  await expect(picker.getByLabel("Hue", { exact: true })).toHaveValue(hueBefore);
});

test("custom picker defaults to hsl and exposes alpha in every model", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const picker = await openPicker(page, "pencilColor");
  await expect(picker.locator("select#modelSelect")).toHaveValue("hsl");
  for (const id of ["rgb", "cmyk", "hsv", "hsl", "okhsl", "okhsv", "ard"]) {
    await picker.locator("select#modelSelect").selectOption(id);
    await expect(picker.getByLabel("Alpha", { exact: true })).toBeVisible();
  }
  await picker.locator("select#modelSelect").selectOption("hsv");
  await picker.getByLabel("Hue", { exact: true }).fill("0");
  await picker.getByLabel("Saturation", { exact: true }).fill("100");
  await picker.getByLabel("Value", { exact: true }).fill("100");
  await picker.getByLabel("Alpha", { exact: true }).fill("128");
  await expect(page.locator("gnumarus-shell")).toContainText("#ff000080");
});

test("custom picker ard uses diagonal 0-360 and ratio 0-255", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const picker = await openPicker(page, "pencilColor");
  await picker.locator("select#modelSelect").selectOption("ard");
  await expect(picker.getByLabel("Angle", { exact: true })).toHaveAttribute("max", "360");
  await expect(picker.getByLabel("Ratio", { exact: true })).toHaveAttribute("max", "255");
  await expect(picker.getByLabel("Diagonal", { exact: true })).toHaveAttribute("max", "360");
  await picker.getByLabel("Angle", { exact: true }).fill("30");
  await picker.getByLabel("Ratio", { exact: true }).fill("255");
  await picker.getByLabel("Diagonal", { exact: true }).fill("120");
  await expect(page.locator("gnumarus-shell")).toContainText("#ff0000");
});

test("custom picker sliders and inputs work while value is zero", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const picker = await openPicker(page, "pencilColor");
  await picker.locator("select#modelSelect").selectOption("hsv");
  await picker.getByLabel("Value", { exact: true }).fill("0");
  const hueBar = picker.locator('[data-testid="axis-bar-h"]');
  const hueBox = await hueBar.boundingBox();
  if (hueBox === null) {
    throw new Error("hue bar has no bounding box");
  }
  await page.mouse.move(hueBox.x + hueBox.width * 0.75, hueBox.y + hueBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(hueBox.x + hueBox.width * 0.25, hueBox.y + hueBox.height / 2, { steps: 5 });
  await page.mouse.up();
  await expect(picker.getByLabel("Hue", { exact: true })).not.toHaveValue("0.0");
  await picker.getByLabel("Saturation", { exact: true }).fill("50");
  await expect(picker.getByLabel("Saturation", { exact: true })).toHaveValue("50.0");
  await picker.getByLabel("Value", { exact: true }).fill("100");
  await expect(page.locator("gnumarus-shell")).not.toContainText("#000000");
});

async function getFrameDuration(page: import("@playwright/test").Page, frame: number): Promise<number | null> {
  return page.evaluate((target: number) => {
    const root = window as unknown as { __gnumarus?: { engine?: { getFrameDuration(f: number): number | null } } };
    return root.__gnumarus?.engine?.getFrameDuration(target) ?? null;
  }, frame);
}

async function getDefaultFrameDuration(page: import("@playwright/test").Page): Promise<number> {
  return page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { getDefaultFrameDuration(): number } } };
    return root.__gnumarus?.engine?.getDefaultFrameDuration() ?? 0;
  });
}

test("frame menu sets and clears an explicit frame duration", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  expect(await getFrameDuration(page, 0)).toBeNull();
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  await matrix.locator('[data-testid="anim-frame"][data-frame="1"]').click({ button: "right" });
  await page.getByRole("button", { name: "Set frame duration…" }).click();
  await page.locator("gnumarus-shell input#frameDuration").fill("250");
  await page.getByRole("button", { name: "Set", exact: true }).click();
  expect(await getFrameDuration(page, 1)).toBe(250);
  expect(await getFrameDuration(page, 0)).toBeNull();
  await expect(page.locator("gnumarus-shell")).toContainText("Frame 2 duration: 250 ms");
  await matrix.locator('[data-testid="anim-frame"][data-frame="1"]').click({ button: "right" });
  await page.getByRole("button", { name: "Set frame duration…" }).click();
  await expect(page.locator("gnumarus-shell input#frameDuration")).toHaveValue("250");
  await page.getByRole("button", { name: "Clear" }).click();
  await expect(page.locator("gnumarus-shell dialog#frameDurationDialog")).toBeHidden();
  expect(await getFrameDuration(page, 1)).toBeNull();
  await expect(page.locator("gnumarus-shell")).toContainText("uses the project default");
});

test("project default frame duration is configurable with a reset", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  expect(await getDefaultFrameDuration(page)).toBe(100);
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Default frame duration");
  const input = page.locator("gnumarus-shell input#defaultFrameDuration");
  await expect(input).toHaveValue("100");
  await expect(page.getByRole("button", { name: "Reset default frame duration to default" })).toHaveCount(0);
  await input.fill("500");
  expect(await getDefaultFrameDuration(page)).toBe(500);
  await expect(page.getByRole("button", { name: "Reset default frame duration to default" })).toBeVisible();
  await expect(page.locator("gnumarus-shell")).toContainText("Default frame duration: 500 ms");
  await page.getByRole("button", { name: "Reset default frame duration to default" }).click();
  expect(await getDefaultFrameDuration(page)).toBe(100);
  await expect(page.getByRole("button", { name: "Reset default frame duration to default" })).toHaveCount(0);
});

test("playback advances frames by duration and stops on demand", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { setFrameDuration(f: number, d: number | null): boolean; setCurrentFrame(f: number): boolean } };
    };
    root.__gnumarus?.engine?.setFrameDuration(0, 200);
    root.__gnumarus?.engine?.setFrameDuration(2, 200);
    root.__gnumarus?.engine?.setCurrentFrame(1);
  });
  await expect(matrix.locator('[data-testid="anim-frame"][data-frame="1"]')).toHaveAttribute("aria-label", /current/);
  await matrix.getByRole("button", { name: "Play animation", exact: true }).click();
  await expect(matrix.getByRole("button", { name: "Stop animation", exact: true })).toBeVisible();
  await expect
    .poll(async () => getMatrixFrame(page), { timeout: 5000 })
    .toBe(2);
  await matrix.getByRole("button", { name: "Stop animation", exact: true }).click();
  const stoppedAt = await getMatrixFrame(page);
  await page.waitForTimeout(400);
  expect(await getMatrixFrame(page)).toBe(stoppedAt);
  await expect(matrix.getByRole("button", { name: "Play animation", exact: true })).toBeVisible();
});

test("Control+S saves to the chosen folder without prompting again", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.evaluate(() => {
    const w = window as unknown as {
      showDirectoryPicker?: unknown;
      __gnumarusSaveTest?: { pickCalls: number; written: string[] };
    };
    const testState = { pickCalls: 0, written: [] as string[] };
    w.__gnumarusSaveTest = testState;
    interface MockFileHandle {
      getFile(): Promise<{ text(): Promise<string>; arrayBuffer(): Promise<ArrayBuffer> }>;
      createWritable(): Promise<{ write(data: string | Blob): Promise<void>; close(): Promise<void> }>;
    }
    interface MockDirHandle {
      name: string;
      getFileHandle(fileName: string): Promise<MockFileHandle>;
      getDirectoryHandle(dirName: string): Promise<MockDirHandle>;
    }
    function makeFileHandle(path: string): MockFileHandle {
      return {
        getFile: (): Promise<{ text(): Promise<string>; arrayBuffer(): Promise<ArrayBuffer> }> =>
          Promise.resolve({
            text: (): Promise<string> => Promise.resolve(""),
            arrayBuffer: (): Promise<ArrayBuffer> => Promise.resolve(new ArrayBuffer(0)),
          }),
        createWritable: (): Promise<{ write(data: string | Blob): Promise<void>; close(): Promise<void> }> =>
          Promise.resolve({
            write: (data: string | Blob): Promise<void> => {
              void data;
              return Promise.resolve();
            },
            close: (): Promise<void> => {
              testState.written.push(path);
              return Promise.resolve();
            },
          }),
      };
    }
    function makeDir(name: string, prefix: string): MockDirHandle {
      return {
        name,
        getFileHandle: (fileName: string): Promise<MockFileHandle> =>
          Promise.resolve(makeFileHandle(prefix + fileName)),
        getDirectoryHandle: (dirName: string): Promise<MockDirHandle> =>
          Promise.resolve(makeDir(dirName, `${prefix}${dirName}/`)),
      };
    }
    w.showDirectoryPicker = (): Promise<MockDirHandle> => {
      testState.pickCalls += 1;
      return Promise.resolve(makeDir("MockDir", ""));
    };
  });
  const pickCalls = (): Promise<number> =>
    page.evaluate(
      () =>
        (window as unknown as { __gnumarusSaveTest?: { pickCalls: number } }).__gnumarusSaveTest?.pickCalls ??
        -1,
    );
  const writtenFiles = (): Promise<string[]> =>
    page.evaluate(
      () => (window as unknown as { __gnumarusSaveTest?: { written: string[] } }).__gnumarusSaveTest?.written ?? [],
    );
  await page.keyboard.press("Control+s");
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockDir");
  expect(await pickCalls()).toBe(1);
  expect(await writtenFiles()).toContain("project.json");
  await page.keyboard.press("Control+s");
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockDir");
  expect(await pickCalls()).toBe(1);
});

test("bucket fill fills a contiguous region without crossing barriers", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
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
              transform: { x: number; y: number; rotation: number; flipX: boolean; flipY: boolean };
            }>,
          ): void;
        };
      };
    };
    const barrier = new Uint8ClampedArray(8 * 8 * 4);
    for (let y = 0; y < 8; y += 1) {
      const i = (y * 8 + 4) * 4;
      barrier[i] = 0;
      barrier[i + 1] = 0;
      barrier[i + 2] = 0;
      barrier[i + 3] = 255;
    }
    root.__gnumarus?.engine?.loadProject(64, 64, [
      {
        id: "tiny",
        name: "Tiny",
        visible: true,
        opacity: 1,
        width: 8,
        height: 8,
        buffer: barrier,
        transform: { x: 0, y: 0, rotation: 0, flipX: false, flipY: false },
      },
    ]);
  });
  await setPencil(page, "#ff0000");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("bucket");
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const state = await getViewState(page);
  const target = layerPixelToScreen(
    1,
    4,
    { left: box.x, top: box.y, width: box.width, height: box.height },
    8,
    8,
    { zoom: state.zoom, panX: 0, panY: 0, rotation: state.rotation, flipX: false, flipY: false },
    { x: 0, y: 0, rotation: 0, flipX: false, flipY: false },
  );
  await page.mouse.click(target.x, target.y);
  expect(await readPixel(page, 1, 4)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 0, 0)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 4, 4)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 6, 4)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 1, 4)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  await page.keyboard.press("b");
  await expect(page.locator("gnumarus-shell")).toContainText("bucket");
  await page.keyboard.press("p");
  await expect(page.locator("gnumarus-shell")).toContainText("pencil");
});

test("tool options bar shows pencil brush settings and empty labels otherwise", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const options = page.locator('gnumarus-shell [data-testid="tool-options"]');
  await expect(options).toBeVisible();
  await expect(options).toContainText("Brush size");
  await expect(options).toContainText("Brush shape");
  await expect(options).toContainText("Anti-aliasing");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  await expect(options).toContainText("the bucket tool does not have any setting or helper button");
  await page.getByRole("button", { name: "Loupe" }).click();
  await expect(options).toContainText("the loupe tool does not have any setting or helper button");
  await page.getByRole("button", { name: "Transform" }).click();
  await expect(options).toContainText("the transform tool does not have any setting or helper button");
  await page.getByRole("button", { name: "Pencil" }).click();
  await expect(options).toContainText("Brush size");
  const icon = await page.evaluate(() => {
    const root = document.querySelector("gnumarus-shell")?.shadowRoot;
    const button = Array.from(root?.querySelectorAll('button[aria-label="Bucket fill"]') ?? [])[0];
    const iconElement = button?.querySelector(".tool-icon") ?? null;
    return {
      text: iconElement?.textContent ?? "",
      html: iconElement?.innerHTML ?? "",
    };
  });
  expect(icon.text).not.toContain("🪣");
  expect(icon.html).toContain("<svg");
  expect(icon.html).toContain("<path");
});

test("pencil brush size and shape paint thick strokes", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
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
              transform: { x: number; y: number; rotation: number; flipX: boolean; flipY: boolean };
            }>,
          ): void;
        };
      };
    };
    root.__gnumarus?.engine?.loadProject(64, 64, [
      {
        id: "tiny",
        name: "Tiny",
        visible: true,
        opacity: 1,
        width: 8,
        height: 8,
        buffer: new Uint8ClampedArray(8 * 8 * 4),
        transform: { x: 0, y: 0, rotation: 0, flipX: false, flipY: false },
      },
    ]);
  });
  const brushOf = (): Promise<{ size: number; shape: string }> =>
    page.evaluate(() => {
      const root = window as unknown as {
        __gnumarus?: { engine?: { getBrushSize(): number; getBrushShape(): string } };
      };
      return {
        size: root.__gnumarus?.engine?.getBrushSize() ?? 0,
        shape: root.__gnumarus?.engine?.getBrushShape() ?? "",
      };
    });
  await expect(page.locator('gnumarus-shell [data-testid="tool-options"]')).toContainText("Brush size");
  await page.locator("gnumarus-shell input#brushSize").fill("3");
  await expect(page.locator("gnumarus-shell")).toContainText("Brush size: 3");
  expect(await brushOf()).toEqual({ size: 3, shape: "square" });
  await page.locator("gnumarus-shell select#brushShape").selectOption("circle");
  await expect(page.locator("gnumarus-shell")).toContainText("Brush shape: circle");
  expect(await brushOf()).toEqual({ size: 3, shape: "circle" });
  await page.locator("gnumarus-shell input#brushSize").fill("99");
  expect(await brushOf()).toEqual({ size: 64, shape: "circle" });
  await page.locator("gnumarus-shell input#brushSize").fill("3");
  await page.locator("gnumarus-shell select#brushShape").selectOption("square");
  await setPencil(page, "#ff0000");
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const paintAt = async (lx: number, ly: number): Promise<void> => {
    const state = await getViewState(page);
    const target = layerPixelToScreen(
      lx,
      ly,
      { left: box.x, top: box.y, width: box.width, height: box.height },
      8,
      8,
      { zoom: state.zoom, panX: 0, panY: 0, rotation: state.rotation, flipX: false, flipY: false },
      { x: 0, y: 0, rotation: 0, flipX: false, flipY: false },
    );
    await page.mouse.click(target.x, target.y);
  };
  await paintAt(4, 4);
  expect(await readPixel(page, 4, 4)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 3, 3)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 5, 5)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 4, 4)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  await page.locator("gnumarus-shell select#brushShape").selectOption("circle");
  await paintAt(4, 4);
  expect(await readPixel(page, 4, 4)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 3, 3)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  expect(await readPixel(page, 4, 3)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("line tool draws two-click segments with width, shape and aliasing", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
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
              transform: { x: number; y: number; rotation: number; flipX: boolean; flipY: boolean };
            }>,
          ): void;
        };
      };
    };
    root.__gnumarus?.engine?.loadProject(64, 64, [
      {
        id: "tiny",
        name: "Tiny",
        visible: true,
        opacity: 1,
        width: 8,
        height: 8,
        buffer: new Uint8ClampedArray(8 * 8 * 4),
        transform: { x: 0, y: 0, rotation: 0, flipX: false, flipY: false },
      },
    ]);
  });
  await setPencil(page, "#ff0000");
  await page.getByRole("button", { name: "Line" }).click();
  const options = page.locator('gnumarus-shell [data-testid="tool-options"]');
  await expect(options).toContainText("Line width");
  await expect(options).toContainText("Anti-aliasing");
  await page.locator("gnumarus-shell input#lineWidth").fill("1");
  await expect(page.locator("gnumarus-shell")).toContainText("Line width: 1");
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const clickAt = async (lx: number, ly: number): Promise<void> => {
    const state = await getViewState(page);
    const target = layerPixelToScreen(
      lx,
      ly,
      { left: box.x, top: box.y, width: box.width, height: box.height },
      8,
      8,
      { zoom: state.zoom, panX: 0, panY: 0, rotation: state.rotation, flipX: false, flipY: false },
      { x: 0, y: 0, rotation: 0, flipX: false, flipY: false },
    );
    await page.mouse.click(target.x, target.y);
  };
  await clickAt(1, 1);
  expect(await readPixel(page, 1, 1)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  await clickAt(6, 1);
  expect(await readPixel(page, 1, 1)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 6, 1)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 3, 1)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 3, 3)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 1, 1)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  await page.locator("gnumarus-shell input#lineAntialias").check();
  await expect(page.locator("gnumarus-shell")).toContainText("Line anti-aliasing: on");
  await clickAt(0, 0);
  await clickAt(7, 7);
  expect(await readPixel(page, 3, 3)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  const edge = await readPixel(page, 3, 4);
  expect(edge).not.toBeNull();
  expect(edge!.r).toBeGreaterThan(0);
  expect(edge!.r).toBeLessThan(255);
  await page.keyboard.press("n");
  await expect(page.locator("gnumarus-shell")).toContainText("line");
});

test("brush and line previews follow the mouse", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const previewState = (): Promise<{ brush: string; line: string }> =>
    page.evaluate(() => {
      const root = document.querySelector("gnumarus-shell")?.shadowRoot;
      const host = root?.getElementById("canvasHost") ?? null;
      const brush = host?.querySelector('[data-testid="brush-preview"]') as HTMLElement | null;
      const line = host?.querySelector('[data-testid="line-preview"]') as SVGSVGElement | null;
      return { brush: brush?.style.display ?? "missing", line: line?.style.display ?? "missing" };
    });
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  await page.getByRole("button", { name: "Pencil" }).click();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await expect.poll(() => previewState().then((state) => state.brush)).toBe("block");
  const tipSize = await page.evaluate(() => {
    const root = document.querySelector("gnumarus-shell")?.shadowRoot;
    const tip = root?.getElementById("canvasHost")?.querySelector('[data-testid="brush-preview"]') as HTMLElement | null;
    return { w: tip?.style.width ?? "", radius: tip?.style.borderRadius ?? "" };
  });
  expect(tipSize.w).not.toBe("");
  expect(tipSize.radius).toBe("0px");
  await page.getByRole("button", { name: "Line" }).click();
  await expect(page.locator('gnumarus-shell [data-testid="tool-options"]')).toContainText("Line width");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await expect.poll(() => previewState().then((state) => state.brush)).toBe("block");
  const state = await getViewState(page);
  const target = layerPixelToScreen(
    2,
    2,
    { left: box.x, top: box.y, width: box.width, height: box.height },
    64,
    64,
    { zoom: state.zoom, panX: 0, panY: 0, rotation: state.rotation, flipX: false, flipY: false },
    { x: 0, y: 0, rotation: 0, flipX: false, flipY: false },
  );
  await page.mouse.click(target.x, target.y);
  await page.mouse.move(target.x + 40, target.y);
  await expect.poll(() => previewState().then((state) => state.line)).toBe("block");
  await page.keyboard.press("Escape");
  await expect.poll(() => previewState().then((state) => state.line)).toBe("none");
});

test("pencil anti-aliasing smooths diagonal edges", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
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
              transform: { x: number; y: number; rotation: number; flipX: boolean; flipY: boolean };
            }>,
          ): void;
        };
      };
    };
    root.__gnumarus?.engine?.loadProject(64, 64, [
      {
        id: "tiny",
        name: "Tiny",
        visible: true,
        opacity: 1,
        width: 8,
        height: 8,
        buffer: new Uint8ClampedArray(8 * 8 * 4),
        transform: { x: 0, y: 0, rotation: 0, flipX: false, flipY: false },
      },
    ]);
  });
  await setPencil(page, "#ff0000");
  await page.getByRole("button", { name: "Pencil" }).click();
  await expect(page.locator('gnumarus-shell [data-testid="tool-options"]')).toContainText("Anti-aliasing");
  const flagOf = (): Promise<boolean> =>
    page.evaluate(() => {
      const root = window as unknown as { __gnumarus?: { engine?: { getPencilAntialias(): boolean } } };
      return root.__gnumarus?.engine?.getPencilAntialias() ?? true;
    });
  expect(await flagOf()).toBe(false);
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const dragDiagonal = async (): Promise<void> => {
    const state = await getViewState(page);
    const rect = { left: box.x, top: box.y, width: box.width, height: box.height };
    const view = { zoom: state.zoom, panX: 0, panY: 0, rotation: state.rotation, flipX: false, flipY: false };
    const layer = { x: 0, y: 0, rotation: 0, flipX: false, flipY: false };
    const start = layerPixelToScreen(1, 1, rect, 8, 8, view, layer);
    const end = layerPixelToScreen(6, 6, rect, 8, 8, view, layer);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 8 });
    await page.mouse.up();
  };
  await dragDiagonal();
  expect(await readPixel(page, 1, 1)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 2, 1)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  await page.keyboard.press("Delete");
  expect(await readPixel(page, 1, 1)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  await page.locator("gnumarus-shell input#pencilAntialias").check();
  await expect(page.locator("gnumarus-shell")).toContainText("Pencil anti-aliasing: on");
  expect(await flagOf()).toBe(true);
  await dragDiagonal();
  expect(await readPixel(page, 1, 1)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  const soft = await readPixel(page, 2, 1);
  expect(soft).not.toBeNull();
  expect(soft!.r).toBeGreaterThan(0);
  expect(soft!.r).toBeLessThan(255);
  await page.keyboard.press("n");
  await expect(page.locator("gnumarus-shell")).toContainText("line");
});

test("Delete resets the current cell texture to zeros", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  const row = page.locator('gnumarus-shell [data-layer-id="layer0"]');
  await row.locator(".layer-name").dblclick();
  const renameInput = row.locator("input.layer-rename");
  await expect(renameInput).toBeVisible();
  await renameInput.press("Delete");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  await page.keyboard.press("Escape");
  await row.getByRole("button", { name: "Lock red channel" }).click();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.keyboard.press("Delete");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
});

test("curve tool draws cubic beziers with two control clicks", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
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
              transform: { x: number; y: number; rotation: number; flipX: boolean; flipY: boolean };
            }>,
          ): void;
        };
      };
    };
    root.__gnumarus?.engine?.loadProject(64, 64, [
      {
        id: "tiny",
        name: "Tiny",
        visible: true,
        opacity: 1,
        width: 8,
        height: 8,
        buffer: new Uint8ClampedArray(8 * 8 * 4),
        transform: { x: 0, y: 0, rotation: 0, flipX: false, flipY: false },
      },
    ]);
  });
  await setPencil(page, "#ff0000");
  await page.getByRole("button", { name: "Curve" }).click();
  await expect(page.locator('gnumarus-shell [data-testid="tool-options"]')).toContainText("Curve width");
  await expect(page.locator('gnumarus-shell [data-testid="tool-options"]')).toContainText("Anti-aliasing");
  await page.locator("gnumarus-shell input#curveWidth").fill("1");
  await expect(page.locator("gnumarus-shell")).toContainText("Curve width: 1");
  const phaseOf = (): Promise<string> =>
    page.evaluate(() => {
      const root = window as unknown as { __gnumarus?: { engine?: { getCurvePhase(): string } } };
      return root.__gnumarus?.engine?.getCurvePhase() ?? "missing";
    });
  const previewVisible = (): Promise<{ svg: string; path: string }> =>
    page.evaluate(() => {
      const root = document.querySelector("gnumarus-shell")?.shadowRoot;
      const host = root?.getElementById("canvasHost") ?? null;
      const svg = host?.querySelector('[data-testid="line-preview"]') as SVGSVGElement | null;
      const path = host?.querySelector('[data-testid="curve-preview"]') as SVGPathElement | null;
      return { svg: svg?.style.display ?? "missing", path: path?.style.display ?? "missing" };
    });
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const toScreen = async (lx: number, ly: number): Promise<{ x: number; y: number }> => {
    const state = await getViewState(page);
    return layerPixelToScreen(
      lx,
      ly,
      { left: box.x, top: box.y, width: box.width, height: box.height },
      8,
      8,
      { zoom: state.zoom, panX: 0, panY: 0, rotation: state.rotation, flipX: false, flipY: false },
      { x: 0, y: 0, rotation: 0, flipX: false, flipY: false },
    );
  };
  expect(await phaseOf()).toBe("idle");
  const start = await toScreen(1, 4);
  const end = await toScreen(6, 4);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 8 });
  await page.mouse.up();
  expect(await phaseOf()).toBe("awaitC1");
  expect((await previewVisible()).path).toBe("block");
  const c1 = await toScreen(2, 1);
  await page.mouse.click(c1.x, c1.y);
  expect(await phaseOf()).toBe("awaitC2");
  const c2 = await toScreen(5, 6);
  await page.mouse.click(c2.x, c2.y);
  expect(await phaseOf()).toBe("idle");
  expect((await previewVisible()).svg).toBe("none");
  expect(await readPixel(page, 1, 4)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 6, 4)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  const apex = [await readPixel(page, 3, 3), await readPixel(page, 4, 3)];
  expect(apex.some((pixel) => pixel !== null && pixel.r === 255 && pixel.a === 255)).toBe(true);
  expect(await readPixel(page, 0, 0)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 1, 4)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  const restart = await toScreen(1, 1);
  const reend = await toScreen(6, 1);
  await page.mouse.move(restart.x, restart.y);
  await page.mouse.down();
  await page.mouse.move(reend.x, reend.y, { steps: 4 });
  await page.mouse.up();
  expect(await phaseOf()).toBe("awaitC1");
  await page.keyboard.press("Escape");
  expect(await phaseOf()).toBe("idle");
  expect(await readPixel(page, 1, 1)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  await page.keyboard.press("c");
  await expect(page.locator("gnumarus-shell")).toContainText("curve");
  await page.keyboard.press("p");
  await expect(page.locator("gnumarus-shell")).toContainText("pencil");
});

test("brush and line widths accept floats with AA-dependent rounding", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
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
              transform: { x: number; y: number; rotation: number; flipX: boolean; flipY: boolean };
            }>,
          ): void;
        };
      };
    };
    root.__gnumarus?.engine?.loadProject(64, 64, [
      {
        id: "tiny",
        name: "Tiny",
        visible: true,
        opacity: 1,
        width: 8,
        height: 8,
        buffer: new Uint8ClampedArray(8 * 8 * 4),
        transform: { x: 0, y: 0, rotation: 0, flipX: false, flipY: false },
      },
    ]);
  });
  await setPencil(page, "#ff0000");
  await page.getByRole("button", { name: "Pencil" }).click();
  const brushOf = (): Promise<number> =>
    page.evaluate(() => {
      const root = window as unknown as { __gnumarus?: { engine?: { getBrushSize(): number } } };
      return root.__gnumarus?.engine?.getBrushSize() ?? 0;
    });
  await page.locator("gnumarus-shell input#brushSize").fill("0");
  expect(await brushOf()).toBeCloseTo(0.1, 5);
  await expect(page.locator("gnumarus-shell")).toContainText("Brush size: 0.1");
  await page.locator("gnumarus-shell input#brushSize").fill("1.5");
  expect(await brushOf()).toBeCloseTo(1.5, 5);
  await expect(page.locator("gnumarus-shell")).toContainText("Brush size: 1.5");
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const clickAt = async (lx: number, ly: number): Promise<void> => {
    const state = await getViewState(page);
    const target = layerPixelToScreen(
      lx,
      ly,
      { left: box.x, top: box.y, width: box.width, height: box.height },
      8,
      8,
      { zoom: state.zoom, panX: 0, panY: 0, rotation: state.rotation, flipX: false, flipY: false },
      { x: 0, y: 0, rotation: 0, flipX: false, flipY: false },
    );
    await page.mouse.click(target.x, target.y);
  };
  await expect(page.locator("gnumarus-shell input#pencilAntialias")).not.toBeChecked();
  await clickAt(4, 4);
  expect(await readPixel(page, 5, 5)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  await page.keyboard.press("Delete");
  await page.locator("gnumarus-shell input#pencilAntialias").check();
  await clickAt(4, 4);
  const soft = await readPixel(page, 5, 5);
  expect(soft).not.toBeNull();
  expect(soft!.r).toBeGreaterThan(0);
  expect(soft!.r).toBeLessThan(255);
  await page.getByRole("button", { name: "Line" }).click();
  const lineOf = (): Promise<number> =>
    page.evaluate(() => {
      const root = window as unknown as { __gnumarus?: { engine?: { getLineWidth(): number } } };
      return root.__gnumarus?.engine?.getLineWidth() ?? 0;
    });
  await page.locator("gnumarus-shell input#lineWidth").fill("1.5");
  expect(await lineOf()).toBeCloseTo(1.5, 5);
  await expect(page.locator("gnumarus-shell")).toContainText("Line width: 1.5");
});

async function getMatrixFrame(page: import("@playwright/test").Page): Promise<number> {
  return page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { getCurrentFrame(): number } } };
    return root.__gnumarus?.engine?.getCurrentFrame() ?? -1;
  });
}
