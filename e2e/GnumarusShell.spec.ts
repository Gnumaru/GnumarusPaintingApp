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
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const paintCenter = async (): Promise<void> => {
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
  await page.mouse.click(cx, cy);
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
  await page.mouse.click(cx, cy);

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
