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

test("B and Z switch between pencil and loupe", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await expect(page.locator("gnumarus-shell")).toContainText("pencil");
  await page.keyboard.press("z");
  await expect(page.locator("gnumarus-shell")).toContainText("loupe");
  await page.keyboard.press("b");
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

test("loupe Alt+middle-click resets the transform", async ({ page }) => {
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
  await page.keyboard.down("Alt");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: "middle" });
  await page.keyboard.up("Alt");
  expect((await getViewState(page)).rotation).toBeCloseTo(0, 5);
  // Ctrl+middle-click no longer resets the transform.
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { setRotation(r: number): void } };
    };
    root.__gnumarus?.engine?.setRotation(1.2);
  });
  await page.keyboard.down("Control");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: "middle" });
  await page.keyboard.up("Control");
  expect((await getViewState(page)).rotation).toBeCloseTo(1.2, 5);
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
  transform: { x: number; y: number; rotation: number; flipX: boolean; flipY: boolean; scaleX: number; scaleY: number; skewX: number; skewY: number; rotationX: number; rotationY: number };
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

test("merge down keeps a layer used by other frames and dissociates only the current cell", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintCenter(page);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });

  await page.getByRole("button", { name: "Add layer" }).click();
  await setPencil(page, "#ff0000");
  await paintCenter(page);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });

  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  await page.locator('gnumarus-shell [data-layer-id="layer0"] .layer-name').click();
  await setPencil(page, "#000000");
  await paintCenter(page);
  await page.locator('gnumarus-shell [data-layer-id="layer1"] .layer-name').click();
  await setPencil(page, "#0000ff");
  await paintCenter(page);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 255, a: 255 });

  const mergedCell = matrix.locator('[data-testid="anim-cell"][data-matrix-layer="layer1"][data-matrix-frame="1"]');
  await page.locator('gnumarus-shell [data-layer-id="layer1"]').click({ button: "right" });
  await page.getByRole("button", { name: "Merge Down" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Layers merged");
  expect((await getLayers(page)).layers.map((layer) => layer.id)).toEqual(["layer0", "layer1"]);
  await expect(mergedCell).toHaveAttribute("aria-label", /empty/);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 255, a: 255 });

  await matrix.locator('[data-testid="anim-frame"][data-frame="0"]').click();
  await page.locator('gnumarus-shell [data-layer-id="layer1"] .layer-name').click();
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });

  await page.keyboard.press("Control+z");
  await expect(matrix.locator('[data-testid="anim-cell"][data-matrix-layer="layer1"][data-matrix-frame="1"]')).not.toHaveAttribute(
    "aria-label",
    /empty/,
  );
  await matrix.locator('[data-testid="anim-frame"][data-frame="1"]').click();
  await page.locator('gnumarus-shell [data-layer-id="layer1"] .layer-name').click();
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 255, a: 255 });
  await page.locator('gnumarus-shell [data-layer-id="layer0"] .layer-name').click();
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });

  await page.keyboard.press("Control+y");
  await expect(matrix.locator('[data-testid="anim-cell"][data-matrix-layer="layer1"][data-matrix-frame="1"]')).toHaveAttribute(
    "aria-label",
    /empty/,
  );
  expect((await getLayers(page)).layers.map((layer) => layer.id)).toEqual(["layer0", "layer1"]);
});

test("merge down links the upper content when the lower cell is empty", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Add layer" }).click();
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  await setPencil(page, "#0000ff");
  await paintCenter(page);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 255, a: 255 });
  const lowerCell = matrix.locator('[data-testid="anim-cell"][data-matrix-layer="layer0"][data-matrix-frame="1"]');
  await expect(lowerCell).toHaveAttribute("aria-label", /empty/);

  await page.locator('gnumarus-shell [data-layer-id="layer1"]').click({ button: "right" });
  await page.getByRole("button", { name: "Merge Down" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Layers merged");
  expect((await getLayers(page)).layers.map((layer) => layer.id)).toEqual(["layer0"]);
  await expect(lowerCell).not.toHaveAttribute("aria-label", /empty/);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 255, a: 255 });

  await page.keyboard.press("Control+z");
  expect((await getLayers(page)).layers.map((layer) => layer.id)).toEqual(["layer0", "layer1"]);
  await page.locator('gnumarus-shell [data-layer-id="layer1"] .layer-name').click();
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 255, a: 255 });
  await page.locator('gnumarus-shell [data-layer-id="layer0"] .layer-name').click();
  expect(await readPixel(page, 32, 32)).toBeNull();

  await page.keyboard.press("Control+y");
  expect((await getLayers(page)).layers.map((layer) => layer.id)).toEqual(["layer0"]);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 255, a: 255 });
});

test("merge down links the upper texture when the lower content has none", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintCenter(page);
  await page.getByRole("button", { name: "Add layer" }).click();
  await setPencil(page, "#ff0000");
  await paintCenter(page);
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  const lowerCell = matrix.locator('[data-testid="anim-cell"][data-matrix-layer="layer0"][data-matrix-frame="1"]');
  await lowerCell.click({ button: "right" });
  await page.getByRole("button", { name: "Select content" }).click();
  await page.locator('gnumarus-shell [data-testid="content-picker-new"]').click();
  await page.locator('gnumarus-shell [data-testid="texture-picker-none"]').click();
  await page.locator('gnumarus-shell [data-layer-id="layer1"] .layer-name').click();
  await setPencil(page, "#0000ff");
  await paintCenter(page);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 255, a: 255 });

  await page.locator('gnumarus-shell [data-layer-id="layer1"]').click({ button: "right" });
  await page.getByRole("button", { name: "Merge Down" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Layers merged");
  expect((await getLayers(page)).layers.map((layer) => layer.id)).toEqual(["layer0", "layer1"]);
  const mergedCell = matrix.locator('[data-testid="anim-cell"][data-matrix-layer="layer1"][data-matrix-frame="1"]');
  await expect(mergedCell).toHaveAttribute("aria-label", /empty/);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 255, a: 255 });
  await matrix.locator('[data-testid="anim-frame"][data-frame="0"]').click();
  await page.locator('gnumarus-shell [data-layer-id="layer0"] .layer-name').click();
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });

  await page.keyboard.press("Control+z");
  await matrix.locator('[data-testid="anim-frame"][data-frame="1"]').click();
  await expect(mergedCell).not.toHaveAttribute("aria-label", /empty/);
  await page.locator('gnumarus-shell [data-layer-id="layer0"] .layer-name').click();
  expect(await readPixel(page, 32, 32)).toBeNull();

  await page.keyboard.press("Control+y");
  await expect(mergedCell).toHaveAttribute("aria-label", /empty/);
  await page.locator('gnumarus-shell [data-layer-id="layer0"] .layer-name').click();
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 255, a: 255 });
  expect((await getLayers(page)).layers.map((layer) => layer.id)).toEqual(["layer0", "layer1"]);
});

test("non-destructive cell transform tool moves, rotates and flips the active layer", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.keyboard.press("t");
  await expect(page.locator("gnumarus-shell")).toContainText("non-destructive cell transform");
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
  expect(transform).toMatchObject({ flipX: true, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 });
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
              transform: { x: number; y: number; rotation: number; flipX: boolean; flipY: boolean; scaleX: number; scaleY: number; skewX: number; skewY: number; rotationX: number; rotationY: number };
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
        transform: { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
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
    { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
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
              transform: { x: number; y: number; rotation: number; flipX: boolean; flipY: boolean; scaleX: number; scaleY: number; skewX: number; skewY: number; rotationX: number; rotationY: number };
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
        transform: { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
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

test("cell Select content modal creates, dissociates and associates shared contents", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
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
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
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
  expect(Math.abs(menuBox.y - cellBox.y)).toBeLessThan(80);
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
  expect(boxes).toHaveLength(12);
  const expected: Record<string, { w: number; h: number }> = {
    Pencil: { w: 33, h: 25 },
    Loupe: { w: 30, h: 25 },
    "Bucket fill": { w: 35, h: 26 },
    Eyedropper: { w: 35, h: 26 },
    Line: { w: 30, h: 25 },
    Curve: { w: 35, h: 29 },
    "Rectangular selection": { w: 34, h: 25 },
    "Destructive selection transform": { w: 33, h: 25 },
    "Non-destructive cell transform": { w: 31, h: 29 },
    "3D rotation": { w: 36, h: 29 },
    "Destructive 3D rotation": { w: 36, h: 29 },
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
              transform: { x: number; y: number; rotation: number; flipX: boolean; flipY: boolean; scaleX: number; scaleY: number; skewX: number; skewY: number; rotationX: number; rotationY: number };
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
        transform: { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
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
    { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
  );
  await page.mouse.click(target.x, target.y);
  expect(await readPixel(page, 1, 4)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 0, 0)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 4, 4)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 6, 4)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 1, 4)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  await page.keyboard.press("g");
  await expect(page.locator("gnumarus-shell")).toContainText("bucket");
  await page.keyboard.press("b");
  await expect(page.locator("gnumarus-shell")).toContainText("pencil");
});

test("tool options bar shows drawing settings and empty labels otherwise", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const options = page.locator('gnumarus-shell [data-testid="tool-options"]');
  await expect(options).toBeVisible();
  await expect(options).toContainText("Brush size");
  await expect(options).toContainText("Brush shape");
  await expect(options).toContainText("Anti-aliasing");
  await expect(options).toContainText("Blend mode");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  await expect(options).toContainText("Blend mode");
  await expect(options).not.toContainText("does not have any setting");
  await page.getByRole("button", { name: "Loupe" }).click();
  await expect(options).toContainText("the loupe tool does not have any setting or helper button");
  await page.getByRole("button", { name: "Non-destructive cell transform" }).click();
  await expect(options).toContainText("the non-destructive cell transform tool does not have any setting or helper button");
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
              transform: { x: number; y: number; rotation: number; flipX: boolean; flipY: boolean; scaleX: number; scaleY: number; skewX: number; skewY: number; rotationX: number; rotationY: number };
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
        transform: { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
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
      { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
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
              transform: { x: number; y: number; rotation: number; flipX: boolean; flipY: boolean; scaleX: number; scaleY: number; skewX: number; skewY: number; rotationX: number; rotationY: number };
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
        transform: { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
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
      { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
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
  expect(edge!.r).toBe(255);
  expect(edge!.a).toBeGreaterThan(0);
  expect(edge!.a).toBeLessThan(255);
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
    { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
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
              transform: { x: number; y: number; rotation: number; flipX: boolean; flipY: boolean; scaleX: number; scaleY: number; skewX: number; skewY: number; rotationX: number; rotationY: number };
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
        transform: { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
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
    const layer = { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 };
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
  expect(soft!.r).toBe(255);
  expect(soft!.a).toBeGreaterThan(0);
  expect(soft!.a).toBeLessThan(255);
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
              transform: { x: number; y: number; rotation: number; flipX: boolean; flipY: boolean; scaleX: number; scaleY: number; skewX: number; skewY: number; rotationX: number; rotationY: number };
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
        transform: { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
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
      { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
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
  await page.keyboard.press("b");
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
              transform: { x: number; y: number; rotation: number; flipX: boolean; flipY: boolean; scaleX: number; scaleY: number; skewX: number; skewY: number; rotationX: number; rotationY: number };
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
        transform: { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
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
      { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
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
  expect(soft!.r).toBe(255);
  expect(soft!.a).toBeGreaterThan(0);
  expect(soft!.a).toBeLessThan(255);
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

test("hsv triangle and hue ring edit the color in any model", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const picker = await openPicker(page, "pencilColor");
  const wheel = picker.locator('[data-testid="hsv-wheel"]');
  const ring = picker.locator('[data-testid="hsv-ring"]');
  const triangle = picker.locator('[data-testid="hsv-triangle"]');
  await expect(wheel).toBeVisible();
  await picker.locator("select#modelSelect").selectOption("rgb");
  await expect(ring).toBeVisible();
  await expect(triangle).toBeVisible();
  await picker.locator("#hexInput").fill("#ff0000");
  await picker.locator("select#modelSelect").selectOption("hsv");
  await expect(picker.getByLabel("Hue", { exact: true })).toHaveValue("0.0");
  await expect(picker.getByLabel("Saturation", { exact: true })).toHaveValue("100.0");
  await expect(picker.getByLabel("Value", { exact: true })).toHaveValue("100.0");
  await picker.locator("select#modelSelect").selectOption("rgb");
  await picker.getByLabel("Alpha", { exact: true }).fill("128");
  await expect(page.locator("gnumarus-shell")).toContainText("#ff000080");
  await picker.locator("select#modelSelect").selectOption("hsv");
  const ringBox = await ring.boundingBox();
  if (ringBox === null) {
    throw new Error("hue ring has no bounding box");
  }
  await page.mouse.click(ringBox.x + ringBox.width * 0.9, ringBox.y + ringBox.height / 2);
  expect(Number(await picker.getByLabel("Hue", { exact: true }).inputValue())).toBeCloseTo(90, 0);
  await expect(picker.getByLabel("Saturation", { exact: true })).toHaveValue("100.0");
  await expect(picker.getByLabel("Value", { exact: true })).toHaveValue("100.0");
  await expect(picker.locator("#hexInput")).toHaveValue("#80ff0080");
  await picker.locator("select#modelSelect").selectOption("rgb");
  await picker.getByLabel("Alpha", { exact: true }).fill("255");
  await picker.locator("select#modelSelect").selectOption("hsv");
  await page.mouse.click(ringBox.x + ringBox.width / 2, ringBox.y + ringBox.height * 0.9);
  await expect(picker.getByLabel("Hue", { exact: true })).toHaveValue("180.0");
  await expect(picker.locator("#hexInput")).toHaveValue("#00ffff");
  const triBox = await triangle.boundingBox();
  if (triBox === null) {
    throw new Error("hsv triangle has no bounding box");
  }
  await page.mouse.click(triBox.x + triBox.width * 0.05, triBox.y + triBox.height * 0.05);
  await expect(picker.getByLabel("Hue", { exact: true })).toHaveValue("180.0");
  await expect(picker.getByLabel("Saturation", { exact: true })).toHaveValue("5.0");
  await expect(picker.getByLabel("Value", { exact: true })).toHaveValue("94.9");
  await expect(picker.locator("#hexInput")).toHaveValue("#e6f2f2");
  await page.mouse.click(triBox.x + triBox.width * 0.75, triBox.y + triBox.height * 0.25);
  await expect(picker.getByLabel("Hue", { exact: true })).toHaveValue("180.0");
  await expect(picker.getByLabel("Saturation", { exact: true })).toHaveValue("74.9");
  await expect(picker.getByLabel("Value", { exact: true })).toHaveValue("74.9");
  await expect(picker.locator("#hexInput")).toHaveValue("#30bfbf");
  await triangle.focus();
  await page.keyboard.down("Shift");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.up("Shift");
  await expect(picker.locator("#hexInput")).toHaveValue("#43bfbf");
  await expect(picker.getByLabel("Saturation", { exact: true })).toHaveValue("64.9");
  await page.mouse.click(triBox.x + triBox.width * 0.5, triBox.y + triBox.height * 0.95);
  await expect(picker.locator("#hexInput")).toHaveValue("#060d0d");
  await expect(picker.getByLabel("Value", { exact: true })).toHaveValue("5.1");
  await expect(picker.getByLabel("Hue", { exact: true })).toHaveValue("180.0");
  await triangle.focus();
  await page.keyboard.press("ArrowUp");
  await expect(picker.locator("#hexInput")).toHaveValue("#071010");
  await expect(picker.getByLabel("Value", { exact: true })).toHaveValue("6.3");
  await ring.focus();
  await page.keyboard.press("End");
  await expect(picker.getByLabel("Hue", { exact: true })).toHaveValue("0.0");
  await expect(picker.locator("#hexInput")).toHaveValue("#100707");
});

test("normal blend accumulates translucent paint and eraser subtracts alpha", async ({ page }) => {
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
              transform: { x: number; y: number; rotation: number; flipX: boolean; flipY: boolean; scaleX: number; scaleY: number; skewX: number; skewY: number; rotationX: number; rotationY: number };
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
        transform: { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
      },
    ]);
  });
  await setPencil(page, "#00000080");
  await page.getByRole("button", { name: "Pencil" }).click();
  await page.locator("gnumarus-shell input#brushSize").fill("1");
  await page.locator("gnumarus-shell select#blendMode").selectOption("normal");
  await expect(page.locator("gnumarus-shell")).toContainText("Blend mode: normal");
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
      { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
    );
    await page.mouse.click(target.x, target.y);
  };
  await clickAt(4, 4);
  expect(await readPixel(page, 4, 4)).toEqual({ r: 0, g: 0, b: 0, a: 128 });
  await clickAt(4, 4);
  expect(await readPixel(page, 4, 4)).toEqual({ r: 0, g: 0, b: 0, a: 192 });
  await page.keyboard.press("Delete");
  expect(await readPixel(page, 4, 4)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  await page.locator("gnumarus-shell select#blendMode").selectOption("copy");
  await clickAt(4, 4);
  await clickAt(4, 4);
  expect(await readPixel(page, 4, 4)).toEqual({ r: 0, g: 0, b: 0, a: 128 });
  await page.locator("gnumarus-shell select#blendMode").selectOption("eraser");
  await expect(page.locator("gnumarus-shell")).toContainText("Blend mode: eraser");
  await clickAt(4, 4);
  expect(await readPixel(page, 4, 4)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  await setPencil(page, "#00000020");
  await page.locator("gnumarus-shell select#blendMode").selectOption("copy");
  await clickAt(2, 2);
  expect(await readPixel(page, 2, 2)).toEqual({ r: 0, g: 0, b: 0, a: 32 });
  await page.locator("gnumarus-shell select#blendMode").selectOption("eraser");
  await clickAt(2, 2);
  expect(await readPixel(page, 2, 2)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  await page.getByRole("button", { name: "Bucket fill" }).click();
  await expect(page.locator('gnumarus-shell [data-testid="tool-options"]')).toContainText("Blend mode");
});

test("E toggles eraser and strokes can opt out of accumulation", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const blendOf = (): Promise<string> =>
    page.evaluate(() => {
      const root = window as unknown as { __gnumarus?: { engine?: { getBlendMode(): string } } };
      return root.__gnumarus?.engine?.getBlendMode() ?? "missing";
    });
  expect(await blendOf()).toBe("normal");
  await page.keyboard.press("e");
  expect(await blendOf()).toBe("eraser");
  await expect(page.locator("gnumarus-shell")).toContainText("Blend mode: eraser");
  await page.keyboard.press("e");
  expect(await blendOf()).toBe("normal");
  await expect(page.locator("gnumarus-shell")).toContainText("Blend mode: normal");
  await page.locator("gnumarus-shell select#blendMode").selectOption("copy");
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur?.();
  });
  await page.keyboard.press("e");
  expect(await blendOf()).toBe("eraser");
  await page.keyboard.press("e");
  expect(await blendOf()).toBe("copy");
  await expect(page.locator("gnumarus-shell")).toContainText("Blend mode: copy");
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
              transform: { x: number; y: number; rotation: number; flipX: boolean; flipY: boolean; scaleX: number; scaleY: number; skewX: number; skewY: number; rotationX: number; rotationY: number };
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
        transform: { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
      },
    ]);
  });
  await setPencil(page, "#00000080");
  await page.getByRole("button", { name: "Pencil" }).click();
  await page.locator("gnumarus-shell input#brushSize").fill("1");
  await page.locator("gnumarus-shell select#blendMode").selectOption("normal");
  await expect(page.locator('gnumarus-shell input#accumulate')).toBeChecked();
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const scrubBackAndForth = async (): Promise<void> => {
    const state = await getViewState(page);
    const rect = { left: box.x, top: box.y, width: box.width, height: box.height };
    const view = { zoom: state.zoom, panX: 0, panY: 0, rotation: state.rotation, flipX: false, flipY: false };
    const layer = { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 };
    const start = layerPixelToScreen(1, 4, rect, 8, 8, view, layer);
    const end = layerPixelToScreen(6, 4, rect, 8, 8, view, layer);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 1 });
    await page.mouse.move(start.x, start.y, { steps: 1 });
    await page.mouse.up();
  };
  await scrubBackAndForth();
  expect(await readPixel(page, 3, 4)).toEqual({ r: 0, g: 0, b: 0, a: 192 });
  await page.keyboard.press("Delete");
  expect(await readPixel(page, 3, 4)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  await page.locator("gnumarus-shell input#accumulate").uncheck();
  await expect(page.locator("gnumarus-shell")).toContainText("Accumulate: off");
  await scrubBackAndForth();
  expect(await readPixel(page, 3, 4)).toEqual({ r: 0, g: 0, b: 0, a: 128 });
});

test("Tab hides and shows the interface, toast still works", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const fileButton = page.getByRole("button", { name: "File" });
  const layersPanel = page.locator('gnumarus-shell aside[aria-label="Layers"]');
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await expect(fileButton).toBeVisible();
  await expect(layersPanel).toBeVisible();
  await expect(matrix).toBeVisible();
  await expect(page.locator("gnumarus-shell")).toContainText("64 x 64");
  await page.keyboard.press("Tab");
  await expect(fileButton).toBeHidden();
  await expect(layersPanel).toBeHidden();
  await expect(matrix).toBeHidden();
  await expect(page.locator("gnumarus-shell .statusbar")).toBeHidden();
  await expect(page.locator("gnumarus-shell canvas")).toBeVisible();
  await page.keyboard.press("PageUp");
  const toast = page.locator('gnumarus-shell [data-testid="toast"]');
  await expect(toast).toBeVisible();
  await expect(toast).toContainText("1/1:");
  await page.keyboard.press("Tab");
  await expect(fileButton).toBeVisible();
  await expect(layersPanel).toBeVisible();
  await expect(matrix).toBeVisible();
});

test("PageUp and PageDown select layers with wrap-around and toast", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Add layer" }).click();
  await page.getByRole("button", { name: "Add layer" }).click();
  let state = await getLayers(page);
  expect(state.layers.map((layer) => layer.id)).toEqual(["layer0", "layer1", "layer2"]);
  expect(state.active).toBe("layer2");
  const row1 = page.locator('gnumarus-shell [data-layer-id="layer1"]');
  await row1.locator(".layer-name").dblclick();
  await row1.locator("input.layer-rename").fill("MyLayer2Name");
  await row1.locator("input.layer-rename").press("Enter");
  state = await getLayers(page);
  expect(state.layers[1]?.name).toBe("MyLayer2Name");
  await page.locator('gnumarus-shell [data-layer-id="layer2"] .layer-name').click();
  const toast = page.locator('gnumarus-shell [data-testid="toast"]');
  await page.keyboard.press("PageUp");
  state = await getLayers(page);
  expect(state.active).toBe("layer0");
  await expect(toast).toContainText("1/3: Layer 1");
  await page.keyboard.press("PageUp");
  state = await getLayers(page);
  expect(state.active).toBe("layer1");
  await expect(toast).toContainText("2/3: MyLayer2Name");
  await page.keyboard.press("PageUp");
  state = await getLayers(page);
  expect(state.active).toBe("layer2");
  await expect(toast).toContainText("3/3: Layer 3");
  await page.keyboard.press("PageUp");
  state = await getLayers(page);
  expect(state.active).toBe("layer0");
  await expect(toast).toContainText("1/3: Layer 1");
  await page.keyboard.press("PageDown");
  state = await getLayers(page);
  expect(state.active).toBe("layer2");
  await expect(toast).toContainText("3/3: Layer 3");
  await page.keyboard.press("PageDown");
  state = await getLayers(page);
  expect(state.active).toBe("layer1");
  await expect(toast).toContainText("2/3: MyLayer2Name");
});

test("Insert adds a layer above the current one and selects it", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Add layer" }).click();
  let state = await getLayers(page);
  expect(state.layers.map((layer) => layer.id)).toEqual(["layer0", "layer1"]);
  await page.locator('gnumarus-shell [data-layer-id="layer0"] .layer-name').click();
  expect((await getLayers(page)).active).toBe("layer0");
  await page.keyboard.press("Insert");
  state = await getLayers(page);
  expect(state.layers.map((layer) => layer.id)).toEqual(["layer0", "layer2", "layer1"]);
  expect(state.active).toBe("layer2");
  await expect(page.locator("gnumarus-shell")).toContainText("Layer added");
});

test("Control+E merges down honoring the lower layer transform", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Add layer" }).click();
  await setPencil(page, "#ff0000");
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { setLayerTransform(id: string, transform: { x: number }): boolean } };
    };
    root.__gnumarus?.engine?.setLayerTransform("layer0", { x: 5 });
  });
  await page.keyboard.press("Control+e");
  expect((await getLayers(page)).layers.map((layer) => layer.id)).toEqual(["layer0"]);
  expect(await readPixel(page, 27, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  await expect(page.locator("gnumarus-shell")).toContainText("Layers merged");
  await page.keyboard.press("Control+z");
  expect((await getLayers(page)).layers.map((layer) => layer.id)).toEqual(["layer0", "layer1"]);
});

async function getMatrixFrame(page: import("@playwright/test").Page): Promise<number> {
  return page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { getCurrentFrame(): number } } };
    return root.__gnumarus?.engine?.getCurrentFrame() ?? -1;
  });
}

test("pencil stabilizer dropdown defaults to none with conditional rope and follow settings", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Pencil" }).click();
  const options = page.locator('gnumarus-shell [data-testid="tool-options"]');
  await expect(options).toContainText("Stabilizer");
  const mode = page.locator("gnumarus-shell select#stabilizerMode");
  await expect(mode).toHaveValue("none");
  await expect(page.locator("gnumarus-shell input#ropeLength")).toHaveCount(0);
  await expect(page.locator("gnumarus-shell input#followStrength")).toHaveCount(0);
  const engineMode = (): Promise<string> =>
    page.evaluate(() => {
      const root = window as unknown as { __gnumarus?: { engine?: { getStabilizerMode(): string } } };
      return root.__gnumarus?.engine?.getStabilizerMode() ?? "missing";
    });
  expect(await engineMode()).toBe("none");

  await mode.selectOption("rope");
  await expect(page.locator("gnumarus-shell")).toContainText("Stabilizer: rope");
  expect(await engineMode()).toBe("rope");
  await expect(page.locator("gnumarus-shell input#ropeLength")).toBeVisible();
  await expect(page.locator("gnumarus-shell input#followStrength")).toHaveCount(0);
  await page.locator("gnumarus-shell input#ropeLength").fill("25");
  await expect(page.locator("gnumarus-shell")).toContainText("Rope length: 25");

  await mode.selectOption("follow");
  await expect(page.locator("gnumarus-shell")).toContainText("Stabilizer: follow");
  expect(await engineMode()).toBe("follow");
  await expect(page.locator("gnumarus-shell input#followStrength")).toBeVisible();
  await expect(page.locator("gnumarus-shell input#ropeLength")).toHaveCount(0);
  await page.locator("gnumarus-shell input#followStrength").fill("50");
  await expect(page.locator("gnumarus-shell")).toContainText("Follow strength: 50");

  await mode.selectOption("none");
  await expect(page.locator("gnumarus-shell input#ropeLength")).toHaveCount(0);
  await expect(page.locator("gnumarus-shell input#followStrength")).toHaveCount(0);
});

test("rope stabilizer holds the focus within the rope and pulls beyond it", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Pencil" }).click();
  await page.locator("gnumarus-shell select#stabilizerMode").selectOption("rope");
  await page.locator("gnumarus-shell input#ropeLength").fill("10");
  await setPencil(page, "#ff0000");
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const state = await getViewState(page);
  const toScreen = (lx: number, ly: number): { x: number; y: number } =>
    layerPixelToScreen(
      lx,
      ly,
      { left: box.x, top: box.y, width: box.width, height: box.height },
      64,
      64,
      { zoom: state.zoom, panX: 0, panY: 0, rotation: state.rotation, flipX: false, flipY: false },
      { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
    );
  const start = toScreen(20, 32);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  // Small move inside the 10px rope: the focus must not move.
  const inside = toScreen(24, 32);
  await page.mouse.move(inside.x, inside.y, { steps: 4 });
  const focusInside = await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { getStabilizerPos(): { x: number; y: number } | null } } };
    return root.__gnumarus?.engine?.getStabilizerPos() ?? null;
  });
  expect(focusInside).not.toBeNull();
  expect(focusInside!.x).toBeCloseTo(20.5, 0);
  // Far move beyond the rope: the focus is dragged toward the cursor.
  const far = toScreen(50, 32);
  await page.mouse.move(far.x, far.y, { steps: 4 });
  const focusFar = await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { getStabilizerPos(): { x: number; y: number } | null } } };
    return root.__gnumarus?.engine?.getStabilizerPos() ?? null;
  });
  expect(focusFar).not.toBeNull();
  expect(focusFar!.x).toBeGreaterThan(focusInside!.x + 5);
  await page.mouse.up();
  expect(await readPixel(page, 20, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  const previewVisible = await page.evaluate(() => {
    const root = document.querySelector("gnumarus-shell")?.shadowRoot;
    const dot = root?.getElementById("canvasHost")?.querySelector('[data-testid="stabilizer-preview"]') as HTMLElement | null;
    return dot?.style.display ?? "missing";
  });
  expect(previewVisible).toBe("block");
  await page.keyboard.press("Control+z");
});

test("follow stabilizer paints while chasing the cursor", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Pencil" }).click();
  await page.locator("gnumarus-shell select#stabilizerMode").selectOption("follow");
  await page.locator("gnumarus-shell input#followStrength").fill("100");
  await expect(page.locator("gnumarus-shell")).toContainText("Follow strength: 100");
  await setPencil(page, "#ff0000");
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const state = await getViewState(page);
  const toScreen = (lx: number, ly: number): { x: number; y: number } =>
    layerPixelToScreen(
      lx,
      ly,
      { left: box.x, top: box.y, width: box.width, height: box.height },
      64,
      64,
      { zoom: state.zoom, panX: 0, panY: 0, rotation: state.rotation, flipX: false, flipY: false },
      { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
    );
  const start = toScreen(10, 10);
  const end = toScreen(20, 10);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 8 });
  await page.mouse.up();
  // Strength 100 (= 1.0) snaps instantly, so both ends are painted like without stabilization.
  expect(await readPixel(page, 10, 10)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 20, 10)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  await page.keyboard.press("Control+z");
  await page.locator("gnumarus-shell input#followStrength").fill("1");
  await expect(page.locator("gnumarus-shell")).toContainText("Follow strength: 1");
  await page.keyboard.press("Control+z");
  expect((await paintedNeighborStats(page, 16)).painted).toBe(0);
});

test("4 and 6 rotate the canvas by the step and 5 resets rotation", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const step = Math.PI / 12;
  expect((await getViewState(page)).rotation).toBeCloseTo(0, 5);
  await page.keyboard.press("6");
  expect((await getViewState(page)).rotation).toBeCloseTo(step, 5);
  await page.keyboard.press("4");
  expect((await getViewState(page)).rotation).toBeCloseTo(0, 5);
  await page.keyboard.press("Numpad6");
  expect((await getViewState(page)).rotation).toBeCloseTo(step, 5);
  await page.keyboard.press("Numpad4");
  expect((await getViewState(page)).rotation).toBeCloseTo(0, 5);
  await page.keyboard.press("6");
  await page.keyboard.press("5");
  expect((await getViewState(page)).rotation).toBeCloseTo(0, 5);
  await page.keyboard.press("Numpad6");
  await page.keyboard.press("Numpad5");
  expect((await getViewState(page)).rotation).toBeCloseTo(0, 5);
  // Digits typed into inputs must not rotate the canvas.
  await page.locator("gnumarus-shell input#brushSize").click();
  await page.keyboard.press("4");
  expect((await getViewState(page)).rotation).toBeCloseTo(0, 5);
  await expect(page.locator("gnumarus-shell")).toContainText("°");
});

test("canvas rotation step is configurable in Settings", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Canvas rotation step");
  expect(await page.getByRole("button", { name: "Reset canvas rotation step to default" }).count()).toBe(0);
  await page.locator("gnumarus-shell input#rotationStep").fill("30");
  await expect(page.locator("gnumarus-shell")).toContainText("Canvas rotation step: 30°");
  const persisted = await page.evaluate(() => window.localStorage.getItem("gnumarus.settings.rotation.v1"));
  expect(persisted).toContain("30");
  await page.getByRole("button", { name: "Close" }).click();
  await page.keyboard.press("6");
  expect((await getViewState(page)).rotation).toBeCloseTo(Math.PI / 6, 5);
  await page.keyboard.press("5");
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("button", { name: "Reset canvas rotation step to default" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Canvas rotation step reset to default");
  await page.getByRole("button", { name: "Close" }).click();
  await page.keyboard.press("6");
  expect((await getViewState(page)).rotation).toBeCloseTo(Math.PI / 12, 5);
});

test("1 sets zoom 100 percent and 2 fits the rotated canvas", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { setZoom(z: number): void } } };
    root.__gnumarus?.engine?.setZoom(8);
  });
  expect((await getViewState(page)).zoom).toBeCloseTo(8, 5);
  await page.keyboard.press("1");
  expect((await getViewState(page)).zoom).toBeCloseTo(1, 5);
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { setRotation(r: number): void } } };
    root.__gnumarus?.engine?.setRotation(Math.PI / 4);
  });
  await page.keyboard.press("2");
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const diagonal = 64 * Math.SQRT2;
  const expected = Math.max(1, Math.floor(Math.min(box.width / diagonal, box.height / diagonal)));
  expect((await getViewState(page)).zoom).toBeCloseTo(expected, 5);
  // Without rotation, 2 fits the plain canvas exactly like the initial view.
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { setRotation(r: number): void } } };
    root.__gnumarus?.engine?.setRotation(0);
  });
  await page.keyboard.press("2");
  const plain = Math.max(1, Math.floor(Math.min(box.width / 64, box.height / 64)));
  expect((await getViewState(page)).zoom).toBeCloseTo(plain, 5);
});

test("shift-drag adjusts the pencil brush size live without painting", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Pencil" }).click();
  const sizeOf = (): Promise<number> =>
    page.evaluate(() => {
      const root = window as unknown as { __gnumarus?: { engine?: { getBrushSize(): number } } };
      return root.__gnumarus?.engine?.getBrushSize() ?? 0;
    });
  expect(await sizeOf()).toBeCloseTo(1, 5);
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const tipWidth = (): Promise<string> =>
    page.evaluate(() => {
      const root = document.querySelector("gnumarus-shell")?.shadowRoot;
      const tip = root?.getElementById("canvasHost")?.querySelector('[data-testid="brush-preview"]') as HTMLElement | null;
      return tip?.style.width ?? "";
    });
  await page.mouse.move(cx, cy);
  await page.keyboard.down("Shift");
  await page.mouse.down();
  await page.mouse.move(cx + 80, cy, { steps: 4 });
  expect(await sizeOf()).toBeCloseTo(1 + 80 / 20, 5);
  expect(await tipWidth()).not.toBe("");
  // Moving back left shrinks again from the drag anchor.
  await page.mouse.move(cx + 40, cy, { steps: 2 });
  expect(await sizeOf()).toBeCloseTo(1 + 40 / 20, 5);
  // Vertical-only movement changes nothing.
  await page.mouse.move(cx + 40, cy + 120, { steps: 2 });
  expect(await sizeOf()).toBeCloseTo(1 + 40 / 20, 5);
  await page.mouse.up();
  await page.keyboard.up("Shift");
  expect(await sizeOf()).toBeCloseTo(3, 5);
  await expect(page.locator("gnumarus-shell")).toContainText("Brush size: 3");
  // No painting happened during the size drag.
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
});

test("shift-drag adjusts line and curve widths", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.getByRole("button", { name: "Line" }).click();
  await page.mouse.move(cx, cy);
  await page.keyboard.down("Shift");
  await page.mouse.down();
  await page.mouse.move(cx + 60, cy, { steps: 3 });
  await page.mouse.up();
  await page.keyboard.up("Shift");
  const lineWidth = await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { getLineWidth(): number } } };
    return root.__gnumarus?.engine?.getLineWidth() ?? 0;
  });
  expect(lineWidth).toBeCloseTo(1 + 60 / 20, 5);
  await expect(page.locator("gnumarus-shell")).toContainText(`Line width: ${lineWidth}`);
  await page.getByRole("button", { name: "Curve" }).click();
  await page.mouse.move(cx, cy);
  await page.keyboard.down("Shift");
  await page.mouse.down();
  await page.mouse.move(cx - 40, cy, { steps: 2 });
  await page.mouse.up();
  await page.keyboard.up("Shift");
  const curveWidth = await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { getCurveWidth(): number } } };
    return root.__gnumarus?.engine?.getCurveWidth() ?? 0;
  });
  expect(curveWidth).toBeCloseTo(Math.max(0.1, 1 - 40 / 20), 5);
});

async function loadTinyLayer(
  page: import("@playwright/test").Page,
  size: number,
): Promise<void> {
  await page.evaluate((side: number) => {
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
              transform: { x: number; y: number; rotation: number; flipX: boolean; flipY: boolean; scaleX: number; scaleY: number; skewX: number; skewY: number; rotationX: number; rotationY: number };
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
        width: side,
        height: side,
        buffer: new Uint8ClampedArray(side * side * 4),
        transform: { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
      },
    ]);
  }, size);
}

async function paintedNeighborStats(
  page: import("@playwright/test").Page,
  side: number,
): Promise<{ max: number; painted: number }> {
  return page.evaluate((dims: number) => {
    const root = window as unknown as {
      __gnumarus?: {
        engine?: { readPixel(x: number, y: number): { r: number; g: number; b: number; a: number } | null };
      };
    };
    const engine = root.__gnumarus?.engine;
    if (engine === undefined) {
      throw new Error("engine is unavailable");
    }
    const isPainted = (x: number, y: number): boolean => {
      if (x < 0 || y < 0 || x >= dims || y >= dims) {
        return false;
      }
      return (engine.readPixel(x, y)?.a ?? 0) > 0;
    };
    let max = 0;
    let painted = 0;
    for (let y = 0; y < dims; y += 1) {
      for (let x = 0; x < dims; x += 1) {
        if (!isPainted(x, y)) {
          continue;
        }
        painted += 1;
        let neighbors = 0;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            if (dx === 0 && dy === 0) {
              continue;
            }
            if (isPainted(x + dx, y + dy)) {
              neighbors += 1;
            }
          }
        }
        max = Math.max(max, neighbors);
      }
    }
    return { max, painted };
  }, side);
}

test("pencil pixel perfect is gated to 1px without AA and thins tight turns", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Pencil" }).click();
  const options = page.locator('gnumarus-shell [data-testid="tool-options"]');
  await expect(options).toContainText("Pixel perfect");
  const pixelPerfect = page.locator("gnumarus-shell input#pencilPixelPerfect");
  await expect(pixelPerfect).toBeEnabled();
  await page.locator("gnumarus-shell input#brushSize").fill("3");
  await expect(pixelPerfect).toBeDisabled();
  await page.locator("gnumarus-shell input#brushSize").fill("1");
  await expect(pixelPerfect).toBeEnabled();
  await page.locator("gnumarus-shell input#pencilAntialias").check();
  await expect(pixelPerfect).toBeDisabled();
  await page.locator("gnumarus-shell input#pencilAntialias").uncheck();
  await expect(pixelPerfect).toBeEnabled();

  await loadTinyLayer(page, 8);
  await setPencil(page, "#ff0000");
  await pixelPerfect.check();
  await expect(page.locator("gnumarus-shell")).toContainText("Pencil pixel perfect: on");
  const dragUTurn = async (): Promise<void> => {
    const canvas = page.locator("gnumarus-shell canvas");
    const box = await canvas.boundingBox();
    if (box === null) {
      throw new Error("canvas has no bounding box");
    }
    const state = await getViewState(page);
    const view = { zoom: state.zoom, panX: 0, panY: 0, rotation: state.rotation, flipX: false, flipY: false };
    const layer = { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 };
    const rect = { left: box.x, top: box.y, width: box.width, height: box.height };
    const at = (lx: number, ly: number): { x: number; y: number } =>
      layerPixelToScreen(lx, ly, rect, 8, 8, view, layer);
    const p0 = at(1, 2);
    const p1 = at(6, 2);
    const p2 = at(6, 4);
    const p3 = at(1, 4);
    await page.mouse.move(p0.x, p0.y);
    await page.mouse.down();
    await page.mouse.move(p1.x, p1.y, { steps: 8 });
    await page.mouse.move(p2.x, p2.y, { steps: 4 });
    await page.mouse.move(p3.x, p3.y, { steps: 8 });
    await page.mouse.up();
  };
  await dragUTurn();
  let stats = await paintedNeighborStats(page, 8);
  expect(stats.painted).toBeGreaterThan(0);
  expect(stats.max).toBeLessThanOrEqual(2);
  await page.keyboard.press("Delete");
  await pixelPerfect.uncheck();
  await expect(page.locator("gnumarus-shell")).toContainText("Pencil pixel perfect: off");
  await dragUTurn();
  stats = await paintedNeighborStats(page, 8);
  expect(stats.painted).toBeGreaterThan(0);
  expect(stats.max).toBeGreaterThan(2);
});

test("pencil pixel perfect still paints crossings and revisits", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Pencil" }).click();
  await loadTinyLayer(page, 8);
  await setPencil(page, "#ff0000");
  await page.locator("gnumarus-shell input#pencilPixelPerfect").check();
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const state = await getViewState(page);
  const view = { zoom: state.zoom, panX: 0, panY: 0, rotation: state.rotation, flipX: false, flipY: false };
  const layer = { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 };
  const rect = { left: box.x, top: box.y, width: box.width, height: box.height };
  const at = (lx: number, ly: number): { x: number; y: number } =>
    layerPixelToScreen(lx, ly, rect, 8, 8, view, layer);
  const h0 = at(0, 3);
  const h1 = at(7, 3);
  await page.mouse.move(h0.x, h0.y);
  await page.mouse.down();
  await page.mouse.move(h1.x, h1.y, { steps: 8 });
  await page.mouse.up();
  const v0 = at(3, 0);
  const v1 = at(3, 7);
  await page.mouse.move(v0.x, v0.y);
  await page.mouse.down();
  await page.mouse.move(v1.x, v1.y, { steps: 8 });
  await page.mouse.up();
  // The crossing pixel paints even though its neighborhood exceeds 2.
  expect(await readPixel(page, 3, 3)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("curve pixel perfect is gated to 1px without AA and keeps curves thin", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadTinyLayer(page, 16);
  await setPencil(page, "#ff0000");
  await page.getByRole("button", { name: "Curve" }).click();
  const pixelPerfect = page.locator("gnumarus-shell input#curvePixelPerfect");
  await expect(pixelPerfect).toBeEnabled();
  await page.locator("gnumarus-shell input#curveWidth").fill("2");
  await expect(pixelPerfect).toBeDisabled();
  await page.locator("gnumarus-shell input#curveWidth").fill("1");
  await pixelPerfect.check();
  await expect(page.locator("gnumarus-shell")).toContainText("Curve pixel perfect: on");
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const state = await getViewState(page);
  const view = { zoom: state.zoom, panX: 0, panY: 0, rotation: state.rotation, flipX: false, flipY: false };
  const layer = { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 };
  const rect = { left: box.x, top: box.y, width: box.width, height: box.height };
  const at = (lx: number, ly: number): { x: number; y: number } =>
    layerPixelToScreen(lx, ly, rect, 16, 16, view, layer);
  const start = at(2, 8);
  const end = at(13, 8);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 8 });
  await page.mouse.up();
  await page.mouse.click(at(4, 2).x, at(4, 2).y);
  await page.mouse.click(at(11, 14).x, at(11, 14).y);
  const stats = await paintedNeighborStats(page, 16);
  expect(stats.painted).toBeGreaterThan(0);
  expect(stats.max).toBeLessThanOrEqual(2);
  await page.keyboard.press("Control+z");
  expect((await paintedNeighborStats(page, 16)).painted).toBe(0);
});

test("F selects the bucket tool", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await expect(page.locator("gnumarus-shell")).toContainText("pencil");
  await page.keyboard.press("f");
  await expect(page.locator("gnumarus-shell")).toContainText("bucket");
  await page.keyboard.press("b");
  await expect(page.locator("gnumarus-shell")).toContainText("pencil");
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
  await setPencil(page, "#ff0000");
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.click(cx, cy);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  await setPencil(page, "#0000ff");
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

test("holding Ctrl temporarily switches to the eyedropper", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#ff0000");
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.click(cx, cy);
  await setPencil(page, "#0000ff");
  await page.keyboard.down("Control");
  await expect(page.locator("gnumarus-shell")).toContainText("eyedropper");
  await page.mouse.click(cx, cy);
  await expect(page.locator("gnumarus-shell")).toContainText("Eyedropper: #ff0000");
  await page.keyboard.up("Control");
  await expect(page.locator("gnumarus-shell")).toContainText("pencil");
  // Painting after release uses the picked color with the restored tool.
  await page.keyboard.press("Delete");
  await page.mouse.click(cx, cy);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
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
  expect(state.rows[0]?.cells.map((cell) => cell.contentId !== null)).toEqual([true, false, true]);
  await matrix.locator('[data-testid="anim-frame"][data-frame="2"]').click({ button: "right" });
  await page.getByRole("button", { name: "Add frame before" }).click();
  state = await getMatrix(page);
  expect(state.frameCount).toBe(4);
  expect(state.currentFrame).toBe(2);
  expect(state.rows[0]?.cells.map((cell) => cell.contentId !== null)).toEqual([true, false, false, true]);
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
  const picker = await openPicker(page, "pencilColor");
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

test("toast display time is configurable between 0.5 and 2 seconds", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  const input = page.locator("gnumarus-shell input#toastDuration");
  await expect(input).toBeVisible();
  await expect(input).toHaveValue("1");
  await input.fill("0.1");
  await expect(page.locator("gnumarus-shell")).toContainText("Toast display time: 0.5 s");
  await expect(input).toHaveValue("0.5");
  await input.fill("5");
  await expect(page.locator("gnumarus-shell")).toContainText("Toast display time: 2 s");
  await expect(input).toHaveValue("2");
  await input.fill("1.5");
  await expect(page.locator("gnumarus-shell")).toContainText("Toast display time: 1.5 s");
  await expect(page.locator('gnumarus-shell button[aria-label="Reset toast display time to default"]')).toBeVisible();
  await page.locator('gnumarus-shell button[aria-label="Reset toast display time to default"]').click();
  await expect(input).toHaveValue("1");
  await page.getByRole("button", { name: "Close" }).click();
  const duration = await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { toastDurationSec: number } } };
    return root.__gnumarus?.shell?.toastDurationSec ?? -1;
  });
  expect(duration).toBe(1);
});

test("automatic layer names start at 1", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  let state = await getLayers(page);
  expect(state.layers[0]?.name).toBe("Layer 1");
  await page.getByRole("button", { name: "Add layer" }).click();
  await page.getByRole("button", { name: "Add layer" }).click();
  state = await getLayers(page);
  expect(state.layers.map((layer) => layer.name)).toEqual(["Layer 1", "Layer 2", "Layer 3"]);
});

test("frames can be renamed like layers", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  await expect(matrix.locator('[data-testid="anim-frame"][data-frame="0"]')).toContainText("Frame 1");
  await expect(matrix.locator('[data-testid="anim-frame"][data-frame="1"]')).toContainText("Frame 2");
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
  for (const heading of ["File", "History", "Layers", "Frames", "Tools", "View", "Interface"]) {
    await expect(dialog.getByRole("heading", { name: heading })).toBeVisible();
  }
  await expect(dialog).toContainText("Merge active layer down");
  await expect(dialog).toContainText("Non-destructive cell transform tool");
  await expect(dialog).toContainText("Temporary eyedropper");
  await expect(dialog).toContainText("Merge floating selection into the cell");
  await expect(dialog).toContainText("Reset current cell texture to transparent");
  await expect(dialog).toContainText("Resize tool live");
  await expect(dialog).toContainText("Hide/show all interface chrome");
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toBeHidden();
});

test("final preview shows the canvas background", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
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

async function selectionOverlayDisplay(page: import("@playwright/test").Page): Promise<string> {
  return page.evaluate(() => {
    const root = document.querySelector("gnumarus-shell")?.shadowRoot;
    const rect = root?.getElementById("canvasHost")?.querySelector('[data-testid="selection-rect"]') as SVGPolygonElement | null;
    return rect?.style.display ?? "missing";
  });
}

async function floatingRect(page: import("@playwright/test").Page): Promise<{
  x: number;
  y: number;
  width: number;
  height: number;
} | null> {
  return page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getFloatingRect(): { x: number; y: number; width: number; height: number } | null } };
    };
    return root.__gnumarus?.engine?.getFloatingRect() ?? null;
  });
}

async function layerScreenTarget(
  page: import("@playwright/test").Page,
  lx: number,
  ly: number,
): Promise<{ x: number; y: number }> {
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const state = await getViewState(page);
  return layerPixelToScreen(
    lx,
    ly,
    { left: box.x, top: box.y, width: box.width, height: box.height },
    64,
    64,
    { zoom: state.zoom, panX: 0, panY: 0, rotation: state.rotation, flipX: false, flipY: false },
    { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
  );
}

test("rectangular selection cuts to floating and destructive transform moves and merges", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#ff0000");
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { setBrushSize(size: number): void } } };
    root.__gnumarus?.shell?.setBrushSize(3);
  });
  const center = await layerScreenTarget(page, 32, 32);
  await page.mouse.click(center.x, center.y);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  await page.getByRole("button", { name: "Destructive selection transform" }).click();
  await expect(page.getByRole("button", { name: "Commit selection" })).toBeDisabled();
  await page.getByRole("button", { name: "Rectangular selection" }).click();
  const start = await layerScreenTarget(page, 30, 30);
  const end = await layerScreenTarget(page, 34, 34);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 4 });
  await expect.poll(() => selectionOverlayDisplay(page)).toBe("block");
  await page.mouse.up();
  expect(await floatingRect(page)).toEqual({ x: 30, y: 30, width: 5, height: 5 });
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  await page.getByRole("button", { name: "Destructive selection transform" }).click();
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
  await page.mouse.click((await layerScreenTarget(page, 32, 32)).x, (await layerScreenTarget(page, 32, 32)).y);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  await page.getByRole("button", { name: "Destructive selection transform" }).click();
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
  await setPencil(page, "#ff0000");
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { setBrushSize(size: number): void } } };
    root.__gnumarus?.shell?.setBrushSize(3);
  });
  const center = await layerScreenTarget(page, 32, 32);
  await page.mouse.click(center.x, center.y);
  await page.getByRole("button", { name: "Rectangular selection" }).click();
  const start = await layerScreenTarget(page, 30, 30);
  const end = await layerScreenTarget(page, 34, 34);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 4 });
  await page.mouse.up();
  expect(await floatingRect(page)).toEqual({ x: 30, y: 30, width: 5, height: 5 });
  // A later paint is an independent entry: undoing it keeps the selection.
  await page.keyboard.press("b");
  await setPencil(page, "#0000ff");
  const dot = await layerScreenTarget(page, 10, 10);
  await page.mouse.click(dot.x, dot.y);
  expect(await readPixel(page, 10, 10)).toEqual({ r: 0, g: 0, b: 255, a: 255 });
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 10, 10)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  expect(await selectionOverlayDisplay(page)).toBe("block");
  // Undoing the cut itself drops the selection and restores the pixels.
  await page.keyboard.press("Control+z");
  expect(await selectionOverlayDisplay(page)).toBe("none");
  expect(await floatingRect(page)).toBeNull();
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  // Redoing the cut brings the hole and the selection back.
  await page.keyboard.press("Control+y");
  expect(await selectionOverlayDisplay(page)).toBe("block");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  await page.keyboard.press("Control+y");
  expect(await readPixel(page, 10, 10)).toEqual({ r: 0, g: 0, b: 255, a: 255 });
});

test("floating selection survives frame switches hidden and merges explicitly", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const center = await layerScreenTarget(page, 32, 32);
  await page.mouse.click(center.x, center.y);
  await page.getByRole("button", { name: "Rectangular selection" }).click();
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
  const titles = await page.evaluate(() => {
    const root = document.querySelector("gnumarus-shell")?.shadowRoot;
    const buttons = Array.from(root?.querySelectorAll(".toolbar button[aria-label]") ?? []);
    const entries: Array<{ label: string | null; title: string | null }> = [];
    for (const button of buttons) {
      const element = button as HTMLElement;
      if (element.getAttribute("aria-label") === "Final preview") {
        continue;
      }
      entries.push({ label: element.getAttribute("aria-label"), title: element.getAttribute("title") });
    }
    return entries;
  });
  expect(titles).toEqual([
    { label: "Pencil", title: expect.stringMatching(/^B: Pencil \(/) },
    { label: "Loupe", title: expect.stringMatching(/^Z: Loupe \(/) },
    { label: "Bucket fill", title: expect.stringMatching(/^G or F: Bucket fill \(/) },
    { label: "Eyedropper", title: expect.stringMatching(/^Ctrl \(hold\): Eyedropper \(/) },
    { label: "Line", title: expect.stringMatching(/^N: Line \(/) },
    { label: "Curve", title: expect.stringMatching(/^C: Curve \(/) },
    { label: "Rectangular selection", title: expect.stringMatching(/^R: Rectangular selection \(/) },
    { label: "Destructive selection transform", title: expect.stringMatching(/^V: Destructive selection transform \(/) },
    { label: "Non-destructive cell transform", title: expect.stringMatching(/^T: Non-destructive cell transform \(/) },
    { label: "3D rotation", title: expect.stringMatching(/^Y: 3D rotation \(/) },
    { label: "Destructive 3D rotation", title: expect.stringMatching(/^U: Destructive 3D rotation \(/) },
  ]);
});

test("R and V select the rectangular selection and destructive transform tools", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await expect(page.locator("gnumarus-shell")).toContainText("pencil");
  await page.keyboard.press("r");
  await expect(page.locator("gnumarus-shell")).toContainText("rectangular selection");
  await page.keyboard.press("b");
  await expect(page.locator("gnumarus-shell")).toContainText("pencil");
  await page.keyboard.press("v");
  await expect(page.locator("gnumarus-shell")).toContainText("destructive selection transform");
  await expect(page.getByRole("button", { name: "Commit selection" })).toBeVisible();
  await page.keyboard.press("V");
  await expect(page.locator("gnumarus-shell")).toContainText("destructive selection transform");
  await page.keyboard.press("R");
  await expect(page.locator("gnumarus-shell")).toContainText("rectangular selection");
});

test("final preview follows non-destructive transforms live", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
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
  await page.getByRole("button", { name: "Non-destructive cell transform" }).click();
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

async function getAxisOverlay(page: import("@playwright/test").Page): Promise<{
  visible: boolean;
  xAxis: { ax: number; ay: number; bx: number; by: number };
  yAxis: { ax: number; ay: number; bx: number; by: number };
  rightBorder: { ax: number; ay: number; bx: number; by: number };
  bottomBorder: { ax: number; ay: number; bx: number; by: number };
  xColor: string;
  yColor: string;
  borderColor: string;
}> {
  return page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: {
        engine?: {
          getAxisOverlayState(): {
            visible: boolean;
            xAxis: { ax: number; ay: number; bx: number; by: number };
            yAxis: { ax: number; ay: number; bx: number; by: number };
            rightBorder: { ax: number; ay: number; bx: number; by: number };
            bottomBorder: { ax: number; ay: number; bx: number; by: number };
            xColor: string;
            yColor: string;
            borderColor: string;
          };
        };
      };
    };
    const state = root.__gnumarus?.engine?.getAxisOverlayState();
    if (state === undefined) {
      throw new Error("axis overlay state is unavailable");
    }
    return state;
  });
}

test("matrix layer names rename layers through a context menu", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  const nameCell = matrix.locator('[data-testid="anim-layer-name"][data-matrix-layer="layer0"]');
  await expect(nameCell).toContainText("Layer 1");
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

async function getFloatingTransform(page: import("@playwright/test").Page): Promise<{
  cx: number;
  cy: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  skewX: number;
  skewY: number;
  rotationX: number;
  rotationY: number;
  flipX: boolean;
  flipY: boolean;
  width: number;
  height: number;
} | null> {
  return page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: {
        engine?: {
          getFloatingTransform(): {
            cx: number;
            cy: number;
            rotation: number;
            scaleX: number;
            scaleY: number;
            skewX: number;
            skewY: number;
            rotationX: number;
            rotationY: number;
            flipX: boolean;
            flipY: boolean;
            width: number;
            height: number;
          } | null;
        };
      };
    };
    return root.__gnumarus?.engine?.getFloatingTransform() ?? null;
  });
}

async function getSelectionHandle(
  page: import("@playwright/test").Page,
  id: string,
): Promise<{ x: number; y: number }> {
  const box = await page.locator("gnumarus-shell canvas").boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const position = await page.evaluate((handleId: string) => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getSelectionHandles(): Array<{ id: string; x: number; y: number }> } };
    };
    return root.__gnumarus?.engine?.getSelectionHandles().find((handle) => handle.id === handleId) ?? null;
  }, id);
  if (position === null) {
    throw new Error(`selection handle ${id} is missing`);
  }
  return { x: box.x + position.x, y: box.y + position.y };
}

async function redPixelCount(
  page: import("@playwright/test").Page,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): Promise<number> {
  return page.evaluate(
    ([ax, ay, bx, by]: number[]) => {
      const root = window as unknown as {
        __gnumarus?: {
          engine?: { readPixel(x: number, y: number): { r: number; g: number; b: number; a: number } | null };
        };
      };
      const engine = root.__gnumarus?.engine;
      if (engine === undefined) {
        throw new Error("engine is unavailable");
      }
      let count = 0;
      for (let y = ay; y <= by; y += 1) {
        for (let x = ax; x <= bx; x += 1) {
          const pixel = engine.readPixel(x, y);
          if (pixel !== null && pixel.r === 255 && pixel.g === 0 && pixel.b === 0 && pixel.a === 255) {
            count += 1;
          }
        }
      }
      return count;
    },
    [x0, y0, x1, y1],
  );
}

async function cutRedBlock(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#ff0000");
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { setBrushSize(size: number): void } } };
    root.__gnumarus?.shell?.setBrushSize(3);
  });
  const center = await layerScreenTarget(page, 32, 32);
  await page.mouse.click(center.x, center.y);
  await page.getByRole("button", { name: "Rectangular selection" }).click();
  const start = await layerScreenTarget(page, 30, 30);
  const end = await layerScreenTarget(page, 34, 34);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 4 });
  await page.mouse.up();
  await page.getByRole("button", { name: "Destructive selection transform" }).click();
}

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

async function cutSingleRedPixel(
  page: import("@playwright/test").Page,
  lx: number,
  ly: number,
): Promise<void> {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#ff0000");
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { setBrushSize(size: number): void } } };
    root.__gnumarus?.shell?.setBrushSize(1);
  });
  const target = await layerScreenTarget(page, lx, ly);
  await page.mouse.click(target.x, target.y);
  await page.getByRole("button", { name: "Rectangular selection" }).click();
  const start = await layerScreenTarget(page, 30, 30);
  const end = await layerScreenTarget(page, 34, 34);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 4 });
  await page.mouse.up();
  await page.getByRole("button", { name: "Destructive selection transform" }).click();
}

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

async function getLayerTransform(page: import("@playwright/test").Page): Promise<{
  x: number;
  y: number;
  rotation: number;
  flipX: boolean;
  flipY: boolean;
  scaleX: number;
  scaleY: number;
  skewX: number;
  skewY: number;
  rotationX: number;
  rotationY: number;
}> {
  return page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: {
        engine?: {
          getLayers(): Array<{
            id: string;
            transform: {
              x: number;
              y: number;
              rotation: number;
              flipX: boolean;
              flipY: boolean;
              scaleX: number;
              scaleY: number;
              skewX: number;
              skewY: number;
              rotationX: number;
              rotationY: number;
            };
          }>;
        };
      };
    };
    const found = root.__gnumarus?.engine?.getLayers().find((layer) => layer.id === "layer0");
    if (found === undefined) {
      throw new Error("layer0 is missing");
    }
    return found.transform;
  });
}

async function layerDragHandle(
  page: import("@playwright/test").Page,
  id: string,
  dx: number,
  dy: number,
): Promise<void> {
  // Zoom out so the outer anchors sit inside the canvas.
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { setZoom(zoom: number): void } } };
    root.__gnumarus?.engine?.setZoom(4);
  });
  await page.getByRole("button", { name: "Non-destructive cell transform" }).click();
  const box = await page.locator("gnumarus-shell canvas").boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const position = await page.evaluate((handleId: string) => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getSelectionHandles(): Array<{ id: string; x: number; y: number }> } };
    };
    return root.__gnumarus?.engine?.getSelectionHandles().find((handle) => handle.id === handleId) ?? null;
  }, id);
  if (position === null) {
    throw new Error(`layer handle ${id} is missing`);
  }
  await page.mouse.move(box.x + position.x, box.y + position.y);
  await page.mouse.down();
  await page.mouse.move(box.x + position.x + dx, box.y + position.y + dy, { steps: 4 });
  await page.mouse.up();
}

test("non-destructive resize anchors scale the layer about the opposite edge", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await layerDragHandle(page, "resize-se", 5 * 4, 0);
  const transform = await getLayerTransform(page);
  // Dragging the corner 5 layer-px right widens 64px to 69px; the west
  // edge stays anchored, so the center shifts right by half the growth.
  expect(transform.scaleX).toBeCloseTo(69 / 64, 6);
  expect(transform.scaleY).toBeCloseTo(1, 6);
  expect(transform.x).toBeCloseTo(2.5, 6);
  expect(transform.y).toBeCloseTo(0, 6);
});

test("non-destructive rotate anchors turn the layer about its center", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { setZoom(zoom: number): void } } };
    root.__gnumarus?.engine?.setZoom(4);
  });
  await page.getByRole("button", { name: "Non-destructive cell transform" }).click();
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
  // Top edge follows right with a negative shear; dragging vertically does nothing.
  await layerDragHandle(page, "skew-n", 5 * 4, 0);
  expect((await getLayerTransform(page)).skewX).toBeCloseTo(-5 / 64, 6);
  await layerDragHandle(page, "skew-n", 0, 5 * 4);
  expect((await getLayerTransform(page)).skewX).toBeCloseTo(-5 / 64, 6);
  // Bottom edge follows right with the opposite sign.
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { resetLayerTransform(id: string): boolean } } };
    root.__gnumarus?.engine?.resetLayerTransform("layer0");
  });
  await layerDragHandle(page, "skew-s", 5 * 4, 0);
  expect((await getLayerTransform(page)).skewX).toBeCloseTo(5 / 64, 6);
});

test("non-destructive flip anchors toggle the layer mirrors", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { setZoom(zoom: number): void } } };
    root.__gnumarus?.engine?.setZoom(4);
  });
  await page.getByRole("button", { name: "Non-destructive cell transform" }).click();
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
  await layerDragHandle(page, "resize-se", 5 * 4, 0);
  expect((await getLayerTransform(page)).scaleX).toBeCloseTo(69 / 64, 6);
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { setZoom(zoom: number): void } } };
    root.__gnumarus?.engine?.setZoom(4);
  });
  await page.getByRole("button", { name: "Non-destructive cell transform" }).click();
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

async function getPlaneMatrix(
  page: import("@playwright/test").Page,
  kind: "layer" | "floating",
): Promise<number[] | null> {
  return page.evaluate((which: string) => {
    const root = window as unknown as {
      __gnumarus?: {
        engine?: {
          getLayerPlaneMatrix(id: string): number[] | null;
          getFloatingPlaneMatrix(): number[] | null;
        };
      };
    };
    const engine = root.__gnumarus?.engine;
    if (engine === undefined) {
      throw new Error("engine is unavailable");
    }
    return which === "layer" ? engine.getLayerPlaneMatrix("layer0") : engine.getFloatingPlaneMatrix();
  }, kind);
}

test("floating plane renders over the layer without shift or flip", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Destructive selection transform" }).click();
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

async function rot3DCenter(page: import("@playwright/test").Page): Promise<{ x: number; y: number }> {
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
    throw new Error("3d gizmo center is missing");
  }
  return { x: box.x + position.x, y: box.y + position.y };
}

async function rot3DHandle(
  page: import("@playwright/test").Page,
  id: string,
): Promise<{ x: number; y: number }> {
  const box = await page.locator("gnumarus-shell canvas").boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const position = await page.evaluate((handleId: string) => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getSelectionHandles(): Array<{ id: string; x: number; y: number }> } };
    };
    return root.__gnumarus?.engine?.getSelectionHandles().find((handle) => handle.id === handleId) ?? null;
  }, id);
  if (position === null) {
    throw new Error(`3d handle ${id} is missing`);
  }
  return { x: box.x + position.x, y: box.y + position.y };
}

test("Y and U select the 3d rotation tools", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.keyboard.press("y");
  await expect(page.locator("gnumarus-shell")).toContainText("3d rotation");
  await page.keyboard.press("u");
  await expect(page.locator("gnumarus-shell")).toContainText("destructive 3d rotation");
  await expect(page.getByRole("button", { name: "Commit selection" })).toBeVisible();
  await page.keyboard.press("Y");
  await expect(page.locator("gnumarus-shell")).toContainText("3d rotation");
});

test("3d rotation trackball tilts the layer in the dragged direction", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
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
  expect((await getLayerTransform(page)).rotationY).toBeCloseTo(40 / 128, 4);
  expect((await getLayerTransform(page)).rotationX).toBeCloseTo(0, 6);
  await page.mouse.move(center.x, center.y);
  await page.mouse.down();
  await page.mouse.move(center.x, center.y + 40, { steps: 4 });
  await page.mouse.up();
  expect((await getLayerTransform(page)).rotationX).toBeCloseTo(40 / 128, 4);
});

test("3d rotation axis handles turn a single axis", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
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

test("3d rotation center resets only the rotations", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  // Displace the layer first with the 2d tool so the reset scope is visible.
  await page.getByRole("button", { name: "Non-destructive cell transform", exact: true }).click();
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
  expect((await getLayerTransform(page)).rotationY).toBeCloseTo(40 / 128, 4);
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

test("destructive 3d rotation auto-selects, tilts and merges", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#ff0000");
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { setBrushSize(size: number): void } } };
    root.__gnumarus?.shell?.setBrushSize(3);
  });
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
  // Sphere radius is half the 64px selection times zoom 8 = 256 screen px.
  expect((await getFloatingTransform(page))?.rotationY).toBeCloseTo(40 / 256, 4);
  await page.keyboard.press("Enter");
  expect(await floatingRect(page)).toBeNull();
  // The symmetric block survives the small tilt with its center intact.
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await redPixelCount(page, 24, 24, 40, 40)).toBe(9);
});

test("painting on a tilted layer lands in layer space", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
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
  expect((await getLayerTransform(page)).rotationY).toBeCloseTo(40 / 128, 4);
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
