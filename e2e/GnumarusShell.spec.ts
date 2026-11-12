import { expect, test } from "@playwright/test";
import { gzipSync, unzipSync, zipSync } from "fflate";
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
  await expect(page.getByRole("button", { name: "New Project" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open Project" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save Project", exact: true })).toBeVisible();

  await expect(page.locator("gnumarus-shell")).toContainText("64 x 64");
  await expect(page.locator("gnumarus-shell")).toContainText("pencil");
  expect(await readPixel(page, 0, 0)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  expect(errors).toEqual([]);
});

test("File > New creates a canvas with the requested size", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell");
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "New Project" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("New canvas");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("64 x 64");
});

test("File > New preset fills dimensions and WebP lossless storage", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell");
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "New Project" }).click();
  const dialog = page.locator("gnumarus-shell dialog#newDialog");
  await expect(dialog).toBeVisible();
  await dialog.locator("select#newPreset").selectOption("pixel sprite small");
  await expect(dialog.locator("input#newWidth")).toHaveValue("16");
  await expect(dialog.locator("input#newHeight")).toHaveValue("16");
  await expect(dialog.locator("select#newStorageFormat")).toHaveValue("webp");
  await expect(dialog.locator("select#newStorageMode")).toHaveValue("lossless");
  await expect(dialog.locator("input#newStorageQuality")).toHaveCount(0);
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("New 16 x 16 canvas");
  const persisted = await page.evaluate(() => window.localStorage.getItem("gnumarus.settings.storage.v1"));
  expect(persisted).toContain('"format": "webp"');
  expect(persisted).toContain('"lossless": true');
  const project = await stubProjectDirectory(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  const files = await project.writtenBlobs();
  expect(Object.keys(files).sort()).toEqual(["project.gpa", "textures/t1.webp"]);
});

test("File > New Notes XLQ preset uses JXL lossy quality 0", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell");
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "New Project" }).click();
  const dialog = page.locator("gnumarus-shell dialog#newDialog");
  await expect(dialog).toBeVisible();
  await dialog.locator("select#newPreset").selectOption("Notes XLQ");
  await expect(dialog.locator("input#newWidth")).toHaveValue("1920");
  await expect(dialog.locator("input#newHeight")).toHaveValue("1080");
  await expect(dialog.locator("select#newStorageFormat")).toHaveValue("jxl");
  await expect(dialog.locator("select#newStorageMode")).toHaveValue("lossy");
  await expect(dialog.locator("input#newStorageQuality")).toHaveValue("0");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("New 1920 x 1080 canvas");
  const persisted = await page.evaluate(() => window.localStorage.getItem("gnumarus.settings.storage.v1"));
  expect(persisted).toContain('"format": "jxl"');
  expect(persisted).toContain('"lossless": false');
  expect(persisted).toContain('"quality": 0');
});

test("File > New PNG storage forces lossless and hides quality", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell");
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "New Project" }).click();
  const dialog = page.locator("gnumarus-shell dialog#newDialog");
  await expect(dialog).toBeVisible();
  await dialog.locator("select#newPreset").selectOption("Sketches MQ");
  await expect(dialog.locator("select#newStorageMode")).toHaveValue("lossy");
  await dialog.locator("select#newStorageFormat").selectOption("png");
  await expect(dialog.locator("select#newStorageMode")).toHaveValue("lossless");
  await expect(dialog.locator("input#newStorageQuality")).toHaveCount(0);
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("New 1920 x 1080 canvas");
  const persisted = await page.evaluate(() => window.localStorage.getItem("gnumarus.settings.storage.v1"));
  expect(persisted).toContain('"format": "png"');
  expect(persisted).toContain('"lossless": true');
});

test("File > New accepts canvas sizes up to 16384", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell");
  const canvasSize = (): Promise<{ width: number; height: number } | null> =>
    page.evaluate(() => {
      const root = window as unknown as { __gnumarus?: { engine?: { size: { width: number; height: number } } } };
      return root.__gnumarus?.engine?.size ?? null;
    });
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "New Project" }).click();
  await page.locator("gnumarus-shell input#newWidth").fill("1920");
  await page.locator("gnumarus-shell input#newHeight").fill("1080");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("New 1920 x 1080 canvas");
  expect(await canvasSize()).toEqual({ width: 1920, height: 1080 });
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "New Project" }).click();
  await page.locator("gnumarus-shell input#newWidth").fill("20000");
  await page.locator("gnumarus-shell input#newHeight").fill("100");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("New 16384 x 100 canvas");
  expect(await canvasSize()).toEqual({ width: 16384, height: 100 });
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

test("loupe rotation pivots on the viewport center", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  // Pan the canvas away from the viewport center with Space+drag.
  await page.keyboard.down(" ");
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 50, cy + 30, { steps: 5 });
  await page.mouse.up();
  await page.keyboard.up(" ");
  const pan = await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: unknown } };
    const engine = root.__gnumarus?.engine as unknown as { panX: number; panY: number };
    return { x: engine.panX, y: engine.panY };
  });
  expect(pan.x).toBe(50);
  expect(pan.y).toBe(30);
  // Dragging from east to south around the viewport center turns π/2
  // no matter where the panned canvas sits.
  await page.getByRole("button", { name: "Loupe" }).click();
  await page.mouse.move(cx + 60, cy);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(cx, cy + 60, { steps: 5 });
  await page.mouse.up({ button: "right" });
  expect((await getViewState(page)).rotation).toBeCloseTo(Math.PI / 2, 1);
});

test("M flips the canvas view horizontally and Shift+M vertically", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  expect(await getViewState(page)).toMatchObject({ flipX: false, flipY: false });
  await page.keyboard.press("m");
  expect(await getViewState(page)).toMatchObject({ flipX: true, flipY: false });
  await page.keyboard.press("m");
  expect(await getViewState(page)).toMatchObject({ flipX: false, flipY: false });
  await page.keyboard.press("Shift+m");
  expect(await getViewState(page)).toMatchObject({ flipX: false, flipY: true });
  await page.keyboard.press("Shift+m");
  expect(await getViewState(page)).toMatchObject({ flipX: false, flipY: false });
});

test("pencil stroke can start outside the texture and paint on entry", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#ff0000");
  // Zoom to 100% so the canvas corners are well outside the 64x64 texture.
  await page.keyboard.press("1");
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  await page.mouse.move(box.x + 8, box.y + 8);
  await page.mouse.down();
  // Still outside the texture: the stroke started but paints nothing.
  await page.mouse.move(box.x + 16, box.y + 16, { steps: 2 });
  expect(await paintedPixelCount(page)).toBe(0);
  // Drag into the texture: paint appears from the edge.
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
  await page.mouse.up();
  expect(await paintedPixelCount(page)).toBeGreaterThan(0);
});

test("Control+Space drag zooms vertically like the loupe", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const beforeZoom = (await getViewState(page)).zoom;
  await page.keyboard.down("Control");
  await page.keyboard.down(" ");
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx, cy - 60, { steps: 5 });
  await page.mouse.up();
  const zoomed = (await getViewState(page)).zoom;
  expect(zoomed).toBeGreaterThan(beforeZoom);
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx, cy + 60, { steps: 5 });
  await page.mouse.up();
  const zoomedOut = (await getViewState(page)).zoom;
  expect(zoomedOut).toBeLessThan(zoomed);
  // Horizontal movement does nothing.
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 80, cy, { steps: 4 });
  await page.mouse.up();
  expect((await getViewState(page)).zoom).toBe(zoomedOut);
  await page.keyboard.up(" ");
  await page.keyboard.up("Control");
});

test("Shift+Space drag rotates like the loupe", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const before = (await getViewState(page)).rotation;
  await page.keyboard.down("Shift");
  await page.keyboard.down(" ");
  await page.mouse.move(cx + 60, cy);
  await page.mouse.down();
  await page.mouse.move(cx, cy + 60, { steps: 5 });
  await page.mouse.up();
  await page.keyboard.up(" ");
  await page.keyboard.up("Shift");
  expect(Math.abs((await getViewState(page)).rotation - before)).toBeGreaterThan(Math.PI / 4);
});

test("minimum zoom is configurable and floors zoom-out", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  const dialog = page.locator("gnumarus-shell dialog#settingsDialog");
  await expect(dialog.locator("input#zoomMinZoom")).toHaveValue("1");
  await dialog.locator("input#zoomMinZoom").fill("10");
  await expect(page.locator("gnumarus-shell")).toContainText("Minimum zoom: 10%");
  const persisted = await page.evaluate(() => window.localStorage.getItem("gnumarus.settings.zoom.v1"));
  expect(persisted).toContain('"minZoomPercent": 10');
  await dialog.getByRole("button", { name: "Close" }).click();
  // Ten ×0.8 steps from 100% land near 10.7%: clamped by the 10% setting.
  await page.keyboard.press("1");
  for (let i = 0; i < 10; i += 1) {
    await page.keyboard.press("Control+Alt+-");
  }
  const zoom = (await getViewState(page)).zoom;
  expect(zoom).toBeLessThan(0.5);
  expect(zoom).toBeGreaterThanOrEqual(0.1);
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await page.locator('gnumarus-shell [aria-label="Reset minimum zoom to default"]').click();
  await expect(dialog.locator("input#zoomMinZoom")).toHaveValue("1");
});

test("matrix corner shows the animation gear left of Add frame", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  const gear = await matrix.getByRole("button", { name: "Manage animations", exact: true }).boundingBox();
  const plus = await matrix.getByRole("button", { name: "Add frame", exact: true }).boundingBox();
  if (gear === null || plus === null) {
    throw new Error("matrix corner buttons are missing");
  }
  expect(gear.x + gear.width).toBeLessThanOrEqual(plus.x);
});

test("status bar stays visible at tiny viewport heights", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 200 });
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas", { state: "attached" });
  await page.waitForTimeout(300);
  const layout = await page.evaluate(() => {
    const root = document.querySelector("gnumarus-shell")?.shadowRoot ?? null;
    const bar = root?.querySelector(".statusbar") as HTMLElement | null;
    const rect = bar?.getBoundingClientRect();
    return { innerHeight: window.innerHeight, barBottom: rect ? Math.round(rect.bottom) : -1 };
  });
  expect(layout.barBottom).toBeLessThanOrEqual(layout.innerHeight);
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

  await page.keyboard.press("Meta+z");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });

  await page.keyboard.press("Meta+Shift+z");
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
  opacityPercent: number;
  layerId: string | null;
  width: number;
  height: number;
}> {
  return page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: {
        engine?: {
          getGridState(): {
            visible: boolean;
            minZoom: number;
            opacityPercent: number;
            layerId: string | null;
            width: number;
            height: number;
          };
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

test("pixel grid opacity is configurable in Edit > Settings", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Pixel grid opacity");
  expect((await getGrid(page)).opacityPercent).toBe(100);
  await page.locator("gnumarus-shell input#gridOpacity").fill("50");
  expect((await getGrid(page)).opacityPercent).toBe(50);
  await expect(page.locator("gnumarus-shell")).toContainText("Pixel grid opacity: 50%");
  const persisted = await page.evaluate(() => window.localStorage.getItem("gnumarus.settings.grid.v1"));
  expect(persisted).toContain("50");
  await page.locator("gnumarus-shell input#gridOpacity").fill("999");
  expect((await getGrid(page)).opacityPercent).toBe(100);
  await page.locator("gnumarus-shell input#gridOpacity").fill("0");
  expect((await getGrid(page)).opacityPercent).toBe(0);
  await page.getByRole("button", { name: "Reset pixel grid opacity to default" }).click();
  expect((await getGrid(page)).opacityPercent).toBe(100);
  await expect(page.locator("gnumarus-shell")).toContainText("Pixel grid opacity reset to default");
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
  contents: Array<{ id: string; name: string; textureId: string | null; textId?: string | null }>;
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
  // The menu lists all cell actions (select/text/fit/crop/resize), so it is
  // tall and shifts up when it would overflow the viewport bottom. The cell
  // row must either sit near the menu top or overlap the menu vertically.
  const overlapsVertically = cellBox.y >= menuBox.y && cellBox.y <= menuBox.y + menuBox.height;
  expect(overlapsVertically || Math.abs(menuBox.y - cellBox.y) < 80).toBe(true);
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

test("Shift+click selects a frame range with bulk delete", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  expect((await getMatrix(page)).frameCount).toBe(4);
  await matrix.locator('[data-testid="anim-frame"][data-frame="0"]').click();
  await matrix.locator('[data-testid="anim-frame"][data-frame="2"]').click({ modifiers: ["Shift"] });
  await expect(page.locator("gnumarus-shell")).toContainText("Frames 1-3 selected (3)");
  await expect(matrix.locator(".anim-frame-header.in-range")).toHaveCount(3);
  await matrix.locator('[data-testid="anim-frame"][data-frame="1"]').click({ button: "right" });
  await expect(page.getByRole("button", { name: "Delete frames (3)" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove frame", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Delete frames (3)" }).click();
  const dialog = page.locator("gnumarus-shell dialog#deleteFramesDialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Delete 3 frames (1-3)?");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
  expect((await getMatrix(page)).frameCount).toBe(4);
  await matrix.locator('[data-testid="anim-frame"][data-frame="3"]').click({ button: "right" });
  await expect(page.getByRole("button", { name: "Remove frame", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Delete frames/ })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await matrix.locator('[data-testid="anim-frame"][data-frame="0"]').click();
  await matrix.locator('[data-testid="anim-frame"][data-frame="2"]').click({ modifiers: ["Shift"] });
  await matrix.locator('[data-testid="anim-frame"][data-frame="1"]').click({ button: "right" });
  await page.getByRole("button", { name: "Delete frames (3)" }).click();
  await page.locator("gnumarus-shell dialog#deleteFramesDialog").getByRole("button", { name: "OK" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Deleted 3 frames");
  expect(await getMatrix(page)).toMatchObject({ frameCount: 1, currentFrame: 0 });
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
    Text: { w: 32, h: 25 },
    "Tile brush": { w: 34, h: 25 },
    "Rectangle": { w: 33, h: 25 },
    "3D model transform": { w: 33, h: 25 },
    "Rectangular selection": { w: 34, h: 25 },
    "Destructive selection transform": { w: 33, h: 25 },
    "Non-destructive cell transform": { w: 31, h: 29 },
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
  await page.locator("gnumarus-shell input#frameDuration").fill("0.25");
  await page.getByRole("button", { name: "Set", exact: true }).click();
  expect(await getFrameDuration(page, 1)).toBe(0.25);
  expect(await getFrameDuration(page, 0)).toBeNull();
  await expect(page.locator("gnumarus-shell")).toContainText("Frame 2 duration: 0.25 s");
  await matrix.locator('[data-testid="anim-frame"][data-frame="1"]').click({ button: "right" });
  await page.getByRole("button", { name: "Set frame duration…" }).click();
  await expect(page.locator("gnumarus-shell input#frameDuration")).toHaveValue("0.25");
  await page.getByRole("button", { name: "Clear" }).click();
  await expect(page.locator("gnumarus-shell dialog#frameDurationDialog")).toBeHidden();
  expect(await getFrameDuration(page, 1)).toBeNull();
  await expect(page.locator("gnumarus-shell")).toContainText("uses the project default");
});

test("project default frame duration is configurable with a reset", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  expect(await getDefaultFrameDuration(page)).toBe(0.25);
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Default frame duration");
  const input = page.locator("gnumarus-shell input#defaultFrameDuration");
  await expect(input).toHaveValue("0.25");
  await expect(page.getByRole("button", { name: "Reset default frame duration to default" })).toHaveCount(0);
  await input.fill("0.5");
  expect(await getDefaultFrameDuration(page)).toBe(0.5);
  await expect(page.getByRole("button", { name: "Reset default frame duration to default" })).toBeVisible();
  await expect(page.locator("gnumarus-shell")).toContainText("Default frame duration: 0.5 s");
  await page.getByRole("button", { name: "Reset default frame duration to default" }).click();
  expect(await getDefaultFrameDuration(page)).toBe(0.25);
  await expect(page.getByRole("button", { name: "Reset default frame duration to default" })).toHaveCount(0);
});

test("menubar closes on outside click and Escape", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const menubar = page.locator("gnumarus-shell .menubar");
  const fileItem = menubar.getByRole("button", { name: "New Project", exact: true });
  await page.getByRole("button", { name: "File" }).click();
  await expect(fileItem).toBeVisible();
  await page.locator("gnumarus-shell canvas").click();
  await expect(fileItem).toBeHidden();
  await page.getByRole("button", { name: "File" }).click();
  await expect(fileItem).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(fileItem).toBeHidden();
});

test("menubar switches menus on hover while open", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const menubar = page.locator("gnumarus-shell .menubar");
  const fileItem = menubar.getByRole("button", { name: "New Project", exact: true });
  const editItem = menubar.getByRole("button", { name: "Settings", exact: true });
  const helpItem = menubar.getByRole("button", { name: "Shortcuts", exact: true });
  // Hovering with no menu open opens nothing.
  await menubar.getByRole("button", { name: "Edit" }).hover();
  await expect(fileItem).toBeHidden();
  await expect(editItem).toBeHidden();
  await page.getByRole("button", { name: "File" }).click();
  await expect(fileItem).toBeVisible();
  await menubar.getByRole("button", { name: "Edit" }).hover();
  await expect(fileItem).toBeHidden();
  await expect(editItem).toBeVisible();
  await menubar.getByRole("button", { name: "Help" }).hover();
  await expect(editItem).toBeHidden();
  await expect(helpItem).toBeVisible();
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
    root.__gnumarus?.engine?.setFrameDuration(0, 0.2);
    root.__gnumarus?.engine?.setFrameDuration(2, 0.2);
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
      removeEntry(fileName: string): Promise<void>;
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
        removeEntry: (): Promise<void> => Promise.resolve(),
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
  expect(await writtenFiles()).toContain("project.gpa");
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
  await selectTool(page, 'Non-destructive cell transform');
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
  await expect(page.locator("gnumarus-shell")).toContainText("Brush size: 1 – 3");
  expect(await brushOf()).toEqual({ size: 3, shape: "circle" });
  await page.locator("gnumarus-shell select#brushShape").selectOption("square");
  await expect(page.locator("gnumarus-shell")).toContainText("Brush shape: Square");
  expect(await brushOf()).toEqual({ size: 3, shape: "square" });
  await page.locator("gnumarus-shell input#brushSize").fill("99");
  expect(await brushOf()).toEqual({ size: 64, shape: "square" });
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

test("brush shape defaults to circle for pencil, line and curve", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const shapeOf = (kind: string): Promise<string> =>
    page.evaluate((which: string) => {
      const root = window as unknown as {
        __gnumarus?: { engine?: { getBrushShape(): string; getLineShape(): string; getCurveShape(): string } };
      };
      if (which === "line") {
        return root.__gnumarus?.engine?.getLineShape() ?? "";
      }
      if (which === "curve") {
        return root.__gnumarus?.engine?.getCurveShape() ?? "";
      }
      return root.__gnumarus?.engine?.getBrushShape() ?? "";
    }, kind);
  expect(await shapeOf("pencil")).toBe("circle");
  expect(await shapeOf("line")).toBe("circle");
  expect(await shapeOf("curve")).toBe("circle");
  await expect(page.locator("gnumarus-shell select#brushShape")).toHaveValue("circle");
  await selectTool(page, 'Line');
  await expect(page.locator("gnumarus-shell select#lineShape")).toHaveValue("circle");
  await selectTool(page, 'Curve');
  await expect(page.locator("gnumarus-shell select#curveShape")).toHaveValue("circle");
});

async function setPaintTip(
  page: import("@playwright/test").Page,
  kind: string,
  size: number,
  hardness: number,
  spacing: number,
): Promise<void> {
  await page.evaluate(
    ([which, brushSize, softness, gap]: [string, number, number, number]) => {
      const root = window as unknown as {
        __gnumarus?: {
          shell?: {
            setBrushTipKind(kind: string): void;
            setBrushSize(size: number): void;
            setBrushHardness(percent: number): void;
            setBrushSpacing(percent: number): void;
          };
        };
      };
      root.__gnumarus?.shell?.setBrushTipKind(which);
      root.__gnumarus?.shell?.setBrushSize(brushSize);
      root.__gnumarus?.shell?.setBrushHardness(softness);
      root.__gnumarus?.shell?.setBrushSpacing(gap);
    },
    [kind, size, hardness, spacing] as [string, number, number, number],
  );
}

test("soft brush tip paints with feathered edges", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#ff0000");
  await setPaintTip(page, "soft", 16, 50, 15);
  await paintCenter(page);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  const feather = await readPixel(page, 38, 32);
  expect(feather).not.toBeNull();
  expect(feather!.a).toBeGreaterThan(0);
  expect(feather!.a).toBeLessThan(255);
});

test("wide tip spacing leaves gaps between dabs", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#ff0000");
  await setPaintTip(page, "soft", 8, 100, 15);
  const dense = async (): Promise<number> => {
    const start = await layerScreenTarget(page, 8, 32);
    const end = await layerScreenTarget(page, 56, 32);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 8 });
    await page.mouse.up();
    return paintedPixelCount(page);
  };
  const denseCount = await dense();
  await blurActiveElement(page);
  await page.keyboard.press("Control+z");
  expect(await paintedPixelCount(page)).toBe(0);
  await setPaintTip(page, "soft", 8, 100, 400);
  const sparseCount = await dense();
  expect(sparseCount).toBeGreaterThan(0);
  expect(sparseCount).toBeLessThan(denseCount / 4);
});

test("image tip masks paint by its luminance", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#ff0000");
  await setPaintTip(page, "image", 16, 100, 15);
  const installed = await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { shell?: { setPaintTipFromPixels(w: number, h: number, rgba: number[]): boolean } };
    };
    return root.__gnumarus?.shell?.setPaintTipFromPixels(2, 1, [255, 255, 255, 255, 0, 0, 0, 255]) ?? false;
  });
  expect(installed).toBe(true);
  await paintCenter(page);
  const left = await readPixel(page, 26, 32);
  const right = await readPixel(page, 38, 32);
  expect(left).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(right).toEqual({ r: 0, g: 0, b: 0, a: 0 });
});

async function setPaintDynamics(
  page: import("@playwright/test").Page,
  flow: number,
  fuzzy: number,
  grain: number,
  grainScale: number,
): Promise<void> {
  await page.evaluate(
    ([flowPct, fuzzyPct, grainPct, scale]: [number, number, number, number]) => {
      const root = window as unknown as {
        __gnumarus?: {
          shell?: {
            setBrushFlow(percent: number): void;
            setPaintFuzzy(percent: number): void;
            setPaintGrain(strengthPercent: number, scalePx: number): void;
          };
        };
      };
      root.__gnumarus?.shell?.setBrushFlow(flowPct);
      root.__gnumarus?.shell?.setPaintFuzzy(fuzzyPct);
      root.__gnumarus?.shell?.setPaintGrain(grainPct, scale);
    },
    [flow, fuzzy, grain, grainScale] as [number, number, number, number],
  );
}

test("low flow paints translucent dabs", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#ff0000");
  await setPaintTip(page, "soft", 16, 100, 15);
  await setPaintDynamics(page, 30, 0, 0, 8);
  await paintCenter(page);
  const center = await readPixel(page, 32, 32);
  expect(center).not.toBeNull();
  expect(center!.a).toBeGreaterThan(0);
  expect(center!.a).toBeLessThan(255);
});

test("paper grain varies dab alpha across pixels", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#ff0000");
  await setPaintTip(page, "image", 16, 100, 15);
  const installed = await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { shell?: { setPaintTipFromPixels(w: number, h: number, rgba: number[]): boolean } };
    };
    const rgba: number[] = [];
    for (let i = 0; i < 16; i += 1) {
      rgba.push(255, 255, 255, 255);
    }
    return root.__gnumarus?.shell?.setPaintTipFromPixels(4, 4, rgba) ?? false;
  });
  expect(installed).toBe(true);
  await setPaintDynamics(page, 100, 0, 100, 2);
  await paintCenter(page);
  const alphas: number[] = [];
  for (const x of [31, 32, 33]) {
    const pixel = await readPixel(page, x, 32);
    expect(pixel).not.toBeNull();
    alphas.push(pixel!.a);
  }
  expect(new Set(alphas).size).toBeGreaterThan(1);
});

test("fuzzy jitter changes the footprint deterministically", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#ff0000");
  await setPaintTip(page, "soft", 8, 100, 100);
  await setPaintDynamics(page, 100, 0, 0, 8);
  const stroke = async (): Promise<number> => {
    const start = await layerScreenTarget(page, 8, 32);
    const end = await layerScreenTarget(page, 56, 32);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 8 });
    await page.mouse.up();
    return paintedPixelCount(page);
  };
  const plain = await stroke();
  await blurActiveElement(page);
  await page.keyboard.press("Control+z");
  expect(await paintedPixelCount(page)).toBe(0);
  await setPaintDynamics(page, 100, 100, 0, 8);
  const fuzzyOnce = await stroke();
  await blurActiveElement(page);
  await page.keyboard.press("Control+z");
  expect(await paintedPixelCount(page)).toBe(0);
  const fuzzyTwice = await stroke();
  expect(fuzzyTwice).toBe(fuzzyOnce);
  expect(fuzzyTwice).not.toBe(plain);
});

test("firm pressure curve paints smaller than linear", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#ff0000");
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: {
        shell?: {
          setBrushSize(size: number): void;
          setPressureResponse(response: string): void;
          setPressureSizeCurve(curve: string): void;
        };
      };
    };
    root.__gnumarus?.shell?.setBrushSize(10);
    root.__gnumarus?.shell?.setPressureResponse("size");
    root.__gnumarus?.shell?.setPressureSizeCurve("linear");
  });
  await stubPenPointerCapture(page);
  const center = await canvasCenter(page);
  await penDot(page, center.x, center.y, 0.5);
  const linearCount = await paintedPixelCount(page);
  await blurActiveElement(page);
  await page.keyboard.press("Control+z");
  expect(await paintedPixelCount(page)).toBe(0);
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { shell?: { setPressureSizeCurve(curve: string): void } };
    };
    root.__gnumarus?.shell?.setPressureSizeCurve("firm");
  });
  await penDot(page, center.x, center.y, 0.5);
  const firmCount = await paintedPixelCount(page);
  expect(firmCount).toBeGreaterThan(0);
  expect(firmCount).toBeLessThan(linearCount);
});

test("dual tip masks the primary tip", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#ff0000");
  await setPaintTip(page, "soft", 16, 100, 15);
  await setPaintDynamics(page, 100, 0, 0, 8);
  const installed = await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: {
        shell?: {
          setPaintTipFromPixels(w: number, h: number, rgba: number[]): boolean;
          setPaintDualTipFromPixels(w: number, h: number, rgba: number[]): boolean;
        };
      };
    };
    const white: number[] = [];
    const black: number[] = [];
    for (let i = 0; i < 16; i += 1) {
      white.push(255, 255, 255, 255);
      black.push(0, 0, 0, 255);
    }
    const primary = root.__gnumarus?.shell?.setPaintTipFromPixels(4, 4, white) ?? false;
    const dual = root.__gnumarus?.shell?.setPaintDualTipFromPixels(4, 4, black) ?? false;
    return primary && dual;
  });
  expect(installed).toBe(true);
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { shell?: { setBrushTipKind(kind: string): void } };
    };
    root.__gnumarus?.shell?.setBrushTipKind("image");
  });
  await paintCenter(page);
  expect(await paintedPixelCount(page)).toBe(0);
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { shell?: { clearPaintDual(): void } };
    };
    root.__gnumarus?.shell?.clearPaintDual();
  });
  await paintCenter(page);
  expect(await paintedPixelCount(page)).toBeGreaterThan(0);
});

async function penTiltDot(
  page: import("@playwright/test").Page,
  x: number,
  y: number,
  pressure: number,
  tiltX: number,
  tiltY: number,
): Promise<void> {
  await page.evaluate(
    ([px, py, p, tx, ty]: number[]) => {
      const root = document.querySelector("gnumarus-shell")?.shadowRoot ?? null;
      const target = root?.querySelector("canvas") as HTMLCanvasElement | null;
      if (target === null) {
        throw new Error("canvas is missing");
      }
      const base = {
        pointerId: 7,
        pointerType: "pen",
        button: 0,
        clientX: px,
        clientY: py,
        tiltX: tx,
        tiltY: ty,
        bubbles: true,
        cancelable: true,
        composed: true,
      };
      target.dispatchEvent(new PointerEvent("pointerdown", { ...base, buttons: 1, pressure: p }));
      target.dispatchEvent(new PointerEvent("pointerup", { ...base, buttons: 0, pressure: p }));
    },
    [x, y, pressure, tiltX, tiltY],
  );
}

test("pen tilt broadens dabs with tilt size", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#ff0000");
  await setPaintTip(page, "soft", 8, 100, 15);
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { shell?: { setTiltSizeAmount(percent: number): void } };
    };
    root.__gnumarus?.shell?.setTiltSizeAmount(100);
  });
  await stubPenPointerCapture(page);
  const center = await canvasCenter(page);
  await penTiltDot(page, center.x, center.y, 1, 0, 0);
  const straight = await paintedPixelCount(page);
  await blurActiveElement(page);
  await page.keyboard.press("Control+z");
  expect(await paintedPixelCount(page)).toBe(0);
  await penTiltDot(page, center.x, center.y, 1, 60, 0);
  const tilted = await paintedPixelCount(page);
  expect(tilted).toBeGreaterThan(straight);
});

test("speed fade thins fast-stroke flow", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#ff0000");
  await setPaintTip(page, "soft", 16, 100, 15);
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: {
        shell?: {
          setSpeedFadeAmount(percent: number): void;
          setStrokeVelocityOverride(value: number | null): void;
        };
      };
    };
    root.__gnumarus?.shell?.setSpeedFadeAmount(100);
    root.__gnumarus?.shell?.setStrokeVelocityOverride(1);
  });
  await stubPenPointerCapture(page);
  const center = await canvasCenter(page);
  await penDot(page, center.x, center.y, 1);
  expect(await paintedPixelCount(page)).toBe(0);
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { shell?: { setStrokeVelocityOverride(value: number | null): void } };
    };
    root.__gnumarus?.shell?.setStrokeVelocityOverride(0);
  });
  await penDot(page, center.x, center.y, 1);
  expect(await paintedPixelCount(page)).toBeGreaterThan(0);
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { shell?: { setStrokeVelocityOverride(value: number | null): void } };
    };
    root.__gnumarus?.shell?.setStrokeVelocityOverride(null);
  });
});

test("dry smudge drags paint instead of laying color", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#ff0000");
  await paintCenter(page);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  await setPencil(page, "#0000ff");
  await setPaintTip(page, "soft", 16, 100, 15);
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { shell?: { setSmudge(ratePercent: number, wetPercent: number): void } };
    };
    root.__gnumarus?.shell?.setSmudge(100, 0);
  });
  const start = await layerScreenTarget(page, 32, 32);
  const end = await layerScreenTarget(page, 48, 32);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 8 });
  await page.mouse.up();
  const smeared = await readPixel(page, 44, 32);
  expect(smeared).not.toBeNull();
  expect(smeared!.r).toBeGreaterThan(150);
  expect(smeared!.r).toBeGreaterThan(smeared!.b);
});

test("symmetry mirrors pixel dabs across axes", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#ff0000");
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { shell?: { setSymmetryMode(mode: string): void } };
    };
    root.__gnumarus?.shell?.setSymmetryMode("mirror-x");
  });
  const left = await layerScreenTarget(page, 16, 32);
  await page.mouse.click(left.x, left.y);
  expect(await readPixel(page, 16, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 47, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { shell?: { setSymmetryMode(mode: string): void } };
    };
    root.__gnumarus?.shell?.setSymmetryMode("both");
  });
  const corner = await layerScreenTarget(page, 16, 16);
  await page.mouse.click(corner.x, corner.y);
  for (const [x, y] of [[16, 16], [47, 16], [16, 47], [47, 47]] as Array<[number, number]>) {
    expect(await readPixel(page, x, y)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  }
});

test("symmetry lives in the editor bar and shows axis lines", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const editor = page.locator('gnumarus-shell [data-testid="editor-options"]');
  await expect(editor.locator("select#symmetryMode")).toHaveValue("off");
  await expect(page.locator('gnumarus-shell [aria-label="Pencil options"] select#symmetryMode')).toHaveCount(0);
  await page.getByRole("button", { name: "Bucket fill" }).click();
  await expect(editor.locator("select#symmetryMode")).toBeVisible();
  await editor.locator("select#symmetryMode").selectOption("mirror-x");
  const overlay = await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getSymmetryOverlayState(): unknown } };
    };
    return root.__gnumarus?.engine?.getSymmetryOverlayState() ?? null;
  });
  expect(overlay).toMatchObject({ visible: true });
});

test("symmetry guides pass through the canvas center", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { shell?: { setSymmetryMode(mode: string): void } };
    };
    root.__gnumarus?.shell?.setSymmetryMode("both");
  });
  const overlay = await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: {
        engine?: {
          getSymmetryOverlayState(): {
            visible: boolean;
            vertical: { ax: number; ay: number; bx: number; by: number } | null;
            horizontal: { ax: number; ay: number; bx: number; by: number } | null;
          };
        };
      };
    };
    return root.__gnumarus?.engine?.getSymmetryOverlayState() ?? null;
  });
  if (overlay === null || overlay.vertical === null || overlay.horizontal === null) {
    throw new Error("symmetry guides are missing");
  }
  // The default axis bisects every mirrored pixel pair, so each guide
  // passes through the canvas center (the canvas fills its container).
  expect(Math.abs(overlay.vertical.ax - overlay.vertical.bx)).toBeLessThan(1);
  expect(Math.abs(overlay.vertical.ax - box.width / 2)).toBeLessThan(1.5);
  expect(Math.abs(overlay.horizontal.ay - overlay.horizontal.by)).toBeLessThan(1);
  expect(Math.abs(overlay.horizontal.ay - box.height / 2)).toBeLessThan(1.5);
});

test("four-way symmetry shows an intersection handle that drags both axes", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const visibleHandles = (): Promise<number> =>
    page.evaluate(() => {
      const root = document.querySelector("gnumarus-shell")?.shadowRoot;
      const circles = root?.querySelectorAll('[data-testid="symmetry-handle"]') ?? [];
      return Array.from(circles).filter(
        (circle) => (circle as SVGCircleElement).style.display !== "none",
      ).length;
    });
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { shell?: { setSymmetryMode(mode: string): void } };
    };
    root.__gnumarus?.shell?.setSymmetryMode("mirror-x");
  });
  expect(await visibleHandles()).toBe(2);
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { shell?: { setSymmetryMode(mode: string): void } };
    };
    root.__gnumarus?.shell?.setSymmetryMode("both");
  });
  expect(await visibleHandles()).toBe(5);
  const center = page.locator('gnumarus-shell [data-testid="symmetry-handle"][data-handle="sym-center"]');
  await expect(center).toBeVisible();
  await expect(center).toHaveAttribute("fill-opacity", "0.25");
  const centerOf = (): Promise<{ x: number; y: number }> =>
    page.evaluate(() => {
      const root = window as unknown as {
        __gnumarus?: { engine?: { getSymmetryCenter(): { x: number; y: number } } };
      };
      return root.__gnumarus?.engine?.getSymmetryCenter() ?? { x: -1, y: -1 };
    });
  expect(await centerOf()).toEqual({ x: 31.5, y: 31.5 });
  const handleBox = await center.boundingBox();
  if (handleBox === null) {
    throw new Error("symmetry center handle has no bounding box");
  }
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(handleBox.x + handleBox.width / 2 - 30, handleBox.y + handleBox.height / 2 + 24, { steps: 5 });
  await page.mouse.up();
  const moved = await centerOf();
  expect(moved.x).toBeLessThan(31.5);
  expect(moved.y).toBeGreaterThan(31.5);
  await page.keyboard.down("Shift");
  await center.click();
  await page.keyboard.up("Shift");
  expect(await centerOf()).toEqual({ x: 31.5, y: 31.5 });
});

test("symmetry axis drag moves the mirror and resets with Shift+click", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#ff0000");
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { shell?: { setSymmetryMode(mode: string): void } };
    };
    root.__gnumarus?.shell?.setSymmetryMode("mirror-x");
  });
  const centerOf = (): Promise<{ x: number; y: number }> =>
    page.evaluate(() => {
      const root = window as unknown as {
        __gnumarus?: { engine?: { getSymmetryCenter(): { x: number; y: number } } };
      };
      return root.__gnumarus?.engine?.getSymmetryCenter() ?? { x: -1, y: -1 };
    });
  expect(await centerOf()).toEqual({ x: 31.5, y: 31.5 });
  // Default axis mirrors (16,32) to (47,32).
  const left = await layerScreenTarget(page, 16, 32);
  await page.mouse.click(left.x, left.y);
  expect(await readPixel(page, 47, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  // Drag the top handle left; the mirror follows the new axis.
  const handle = page.locator('gnumarus-shell [data-testid="symmetry-handle"][data-handle="sym-x-min"]');
  await expect(handle).toBeVisible();
  const handleBox = await handle.boundingBox();
  if (handleBox === null) {
    throw new Error("symmetry handle has no bounding box");
  }
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(handleBox.x + handleBox.width / 2 - 40, handleBox.y + handleBox.height / 2, { steps: 5 });
  await page.mouse.up();
  const moved = await centerOf();
  expect(moved.x).toBeLessThan(31.5);
  const mirrored = Math.round(2 * moved.x - 20);
  const dot = await layerScreenTarget(page, 20, 40);
  await page.mouse.click(dot.x, dot.y);
  expect(await readLayerPixel(page, mirrored, 40)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  // Shift+click resets the axis to the canvas center.
  await page.keyboard.down("Shift");
  await handle.click();
  await page.keyboard.up("Shift");
  expect(await centerOf()).toEqual({ x: 31.5, y: 31.5 });
});

async function backgroundPlaneSize(page: import("@playwright/test").Page): Promise<{ width: number; height: number }> {
  return page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getBackgroundPlaneSize(): { width: number; height: number } } };
    };
    return root.__gnumarus?.engine?.getBackgroundPlaneSize() ?? { width: -1, height: -1 };
  });
}

async function canvasScreenPixel(
  page: import("@playwright/test").Page,
  clientX: number,
  clientY: number,
): Promise<{ r: number; g: number; b: number; a: number }> {
  const shot = Array.from(await page.locator("gnumarus-shell canvas").screenshot());
  const sampled = await page.evaluate(([png, px, py]: [number[], number, number]) => {
    const target = document.querySelector("gnumarus-shell")?.shadowRoot?.querySelector("canvas") ?? null;
    const rect = target?.getBoundingClientRect();
    if (rect === undefined || rect.width <= 0) {
      throw new Error("canvas box is missing");
    }
    const blob = new Blob([new Uint8Array(png)], { type: "image/png" });
    return createImageBitmap(blob).then((bitmap) => {
      const probe = document.createElement("canvas");
      probe.width = bitmap.width;
      probe.height = bitmap.height;
      const context = probe.getContext("2d");
      if (context === null) {
        throw new Error("2D canvas unavailable");
      }
      context.drawImage(bitmap, 0, 0);
      const scale = bitmap.width / rect.width;
      const sx = Math.round((px - rect.left) * scale);
      const sy = Math.round((py - rect.top) * scale);
      const data = context.getImageData(sx, sy, 1, 1).data;
      return { rgba: [data[0] ?? -1, data[1] ?? -1, data[2] ?? -1, data[3] ?? -1], sx, sy, sw: bitmap.width, sh: bitmap.height };
    });
  }, [shot, clientX, clientY] as [number[], number, number]);
  const [r, g, b, a] = sampled.rgba;
  return { r: r ?? 0, g: g ?? 0, b: b ?? 0, a: a ?? 0 };
}

test("editor bar stays visible across tools and holds wrap", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const editor = page.locator('gnumarus-shell [data-testid="editor-options"]');
  await expect(editor).toBeVisible();
  await expect(editor.locator("select#wrapMode")).toHaveValue("off");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  await expect(editor).toBeVisible();
  await expect(page.locator('gnumarus-shell [data-testid="tool-options"]')).toHaveAttribute("aria-label", "Bucket options");
  await editor.locator("select#wrapMode").selectOption("x");
  await expect(page.locator("gnumarus-shell")).toContainText("Wrap: Left-right");
  await page.getByRole("button", { name: "Pencil" }).click();
  await expect(editor.locator("select#wrapMode")).toHaveValue("x");
});

test("background grows with wrap tiles", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  expect(await backgroundPlaneSize(page)).toEqual({ width: 64, height: 64 });
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { shell?: { setWrapMode(mode: string): void } };
    };
    root.__gnumarus?.shell?.setWrapMode("x");
  });
  expect(await backgroundPlaneSize(page)).toEqual({ width: 192, height: 64 });
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { shell?: { setWrapMode(mode: string): void } };
    };
    root.__gnumarus?.shell?.setWrapMode("off");
  });
  expect(await backgroundPlaneSize(page)).toEqual({ width: 64, height: 64 });
});

test("changing wrap mode repaints immediately", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  await paintCenter(page);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  const outside = await layerScreenTarget(page, -10, 32);
  const before = await canvasScreenPixel(page, outside.x, outside.y);
  expect([before.r, before.g, before.b]).toEqual([51, 51, 51]);
  await page.locator('gnumarus-shell [data-testid="editor-options"] select#wrapMode').selectOption("x");
  // No painting in between: the ghost tile must already show the layer.
  await expect
    .poll(async () => canvasScreenPixel(page, outside.x, outside.y), { timeout: 5000 })
    .toEqual({ r: 0, g: 0, b: 0, a: 255 });
});

async function readLayerPixel(page: import("@playwright/test").Page, x: number, y: number): Promise<GnumarusPixel | null> {
  return page.evaluate(([px, py]: number[]) => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { exportTextures(): Array<{ width: number; buffer: Uint8ClampedArray }> } };
    };
    const buffer = root.__gnumarus?.engine?.exportTextures()[0]?.buffer;
    const width = root.__gnumarus?.engine?.exportTextures()[0]?.width ?? 0;
    if (buffer === undefined || px < 0 || py < 0 || px >= width || py >= buffer.length / 4 / width) {
      return null;
    }
    const i = (py * width + px) * 4;
    return {
      r: buffer[i] ?? 0,
      g: buffer[i + 1] ?? 0,
      b: buffer[i + 2] ?? 0,
      a: buffer[i + 3] ?? 0,
    };
  }, [x, y]);
}

async function outsideLayerTarget(page: import("@playwright/test").Page, x: number, y: number): Promise<{ x: number; y: number }> {
  return layerScreenTarget(page, x, y);
}

test("painting outside the texture does nothing with wrap off", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#ff0000");
  const outside = await outsideLayerTarget(page, 70, 32);
  await page.mouse.click(outside.x, outside.y);
  expect(await paintedPixelCount(page)).toBe(0);
});

test("wrap-x paints outside pixels back into the texture", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#ff0000");
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { shell?: { setWrapMode(mode: string): void } };
    };
    root.__gnumarus?.shell?.setWrapMode("x");
  });
  const outside = await outsideLayerTarget(page, 70, 32);
  await page.mouse.click(outside.x, outside.y);
  expect(await readLayerPixel(page, 6, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await paintedPixelCount(page)).toBeGreaterThan(0);
});

test("wrap tiles show only for the active layer", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const tilesOf = (): Promise<number> =>
    page.evaluate(() => {
      const root = window as unknown as {
        __gnumarus?: { engine?: { getWrapTileCount(): number } };
      };
      return root.__gnumarus?.engine?.getWrapTileCount() ?? -1;
    });
  expect(await tilesOf()).toBe(0);
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { shell?: { setWrapMode(mode: string): void } };
    };
    root.__gnumarus?.shell?.setWrapMode("both");
  });
  await expect.poll(tilesOf).toBe(8);
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { shell?: { setWrapMode(mode: string): void } };
    };
    root.__gnumarus?.shell?.setWrapMode("off");
  });
  await expect.poll(tilesOf).toBe(0);
});

test("scrollbars match the dark app theme", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const colors = await page.evaluate(() => {
    const bar = document.querySelector("gnumarus-shell")?.shadowRoot?.querySelector(".layers-panel") ?? null;
    if (bar === null) {
      return null;
    }
    return getComputedStyle(bar as Element).scrollbarColor;
  });
  expect(colors).toContain("rgb(85, 85, 85)");
});

async function textureDims(page: import("@playwright/test").Page): Promise<{ width: number; height: number }> {
  return page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { exportTextures(): Array<{ width: number; height: number }> } };
    };
    const first = root.__gnumarus?.engine?.exportTextures()[0];
    return { width: first?.width ?? -1, height: first?.height ?? -1 };
  });
}

async function setImportCleanup(page: import("@playwright/test").Page, mode: string): Promise<void> {
  await page.evaluate((which: string) => {
    const root = window as unknown as {
      __gnumarus?: { shell?: { setImportCleanup(mode: string): void } };
    };
    root.__gnumarus?.shell?.setImportCleanup(which);
  }, mode);
}

test("import cleanup setting is configurable and persists", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  const dialog = page.locator("gnumarus-shell dialog#settingsDialog");
  await expect(dialog.locator("select#importCleanup")).toHaveValue("crop+fit");
  await dialog.locator("select#importCleanup").selectOption("fit");
  await expect(page.locator("gnumarus-shell")).toContainText("Import cleanup: Fit (trim transparent borders)");
  const persisted = await page.evaluate(() => window.localStorage.getItem("gnumarus.settings.importCleanup.v1"));
  expect(persisted).toContain('"cleanup": "fit"');
  await page.locator('gnumarus-shell [aria-label="Reset import cleanup to default"]').click();
  await expect(dialog.locator("select#importCleanup")).toHaveValue("crop+fit");
});

test("native project open keeps textures exact despite cleanup setting @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#ff0000");
  await paintCenter(page);
  await stubProjectDirectory(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  // Default cleanup is crop+fit, which would trim the dot to 1x1 — native
  // opens must no longer apply it, so the texture stays project-sized.
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Open Project" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Opened MockProject");
  await expect(page.locator("gnumarus-shell")).not.toContainText("(fitted");
  await expect(page.locator("gnumarus-shell")).not.toContainText("(cropped");
  expect(await textureDims(page)).toEqual({ width: 64, height: 64 });
  expect(await paintedPixelCount(page)).toBe(1);
});

test("import cleanup none imports full projects as-is", async ({ page }) => {
  const bytes = buildXcfBytes(4, 4, [
    { name: "Top", width: 4, height: 4, offsetX: 2, offsetY: 2, rgba: [0, 255, 0, 255] },
    { name: "Bottom", width: 4, height: 4, offsetX: 0, offsetY: 0, rgba: [0, 0, 255, 255] },
  ]);
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell");
  await setImportCleanup(page, "none");
  await stubAsepritePicker(page, "crop.xcf", bytes);
  await page.getByRole("button", { name: "File" }).click();
  await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Import full project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Imported crop.xcf (2 layers)");
  const state = await getLayers(page);
  expect(state.layers[1]?.transform).toMatchObject({ x: 2, y: 2 });
  expect(state.layers[1]?.width).toBe(4);
});

async function redPngBytes(page: import("@playwright/test").Page, size: number): Promise<number[]> {
  return page.evaluate(async (side: number) => {
    const canvas = document.createElement("canvas");
    canvas.width = side;
    canvas.height = side;
    const context = canvas.getContext("2d");
    if (context === null) {
      throw new Error("2D canvas unavailable");
    }
    context.fillStyle = "#ff0000";
    context.fillRect(0, 0, side, side);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (blob === null) {
      throw new Error("PNG encode failed");
    }
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  }, size);
}

test("import cleanup crop trims to canvas on full project import @recent", async ({ page }) => {
  const bytes = buildXcfBytes(4, 4, [
    { name: "Top", width: 4, height: 4, offsetX: 2, offsetY: 2, rgba: [0, 255, 0, 255] },
    { name: "Bottom", width: 4, height: 4, offsetX: 0, offsetY: 0, rgba: [0, 0, 255, 255] },
  ]);
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell");
  await setImportCleanup(page, "crop");
  await stubAsepritePicker(page, "crop.xcf", bytes);
  await page.getByRole("button", { name: "File" }).click();
  await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Import full project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Imported crop.xcf (2 layers) (cropped 1)");
  const state = await getLayers(page);
  expect(state.layers[1]?.transform).toMatchObject({ x: 1, y: 1 });
  expect(state.layers[1]?.width).toBe(2);
  expect(state.layers[1]?.height).toBe(2);
});

test("brush quality setting persists and tips archive as JXL", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  const dialog = page.locator("gnumarus-shell dialog#settingsDialog");
  await expect(dialog.locator("input#brushQuality")).toHaveValue("90");
  await dialog.locator("input#brushQuality").fill("70");
  await expect(page.locator("gnumarus-shell")).toContainText("Project textures save as lossless JXL");
  const persisted = await page.evaluate(() => window.localStorage.getItem("gnumarus.settings.storage.v1"));
  expect(persisted).toContain('"brushQuality": 70');
  await dialog.getByRole("button", { name: "Close" }).click();
  const installed = await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: {
        shell?: { setPaintTipFromPixels(w: number, h: number, rgba: number[]): boolean };
        engine?: { getPaintTipImage(): { width: number; height: number } | null };
      };
    };
    const rgba: number[] = new Array(16 * 4).fill(0);
    rgba[5 * 4] = 255;
    rgba[5 * 4 + 1] = 255;
    rgba[5 * 4 + 2] = 255;
    rgba[5 * 4 + 3] = 255;
    const ok = root.__gnumarus?.shell?.setPaintTipFromPixels(4, 4, rgba) ?? false;
    return { ok, tip: root.__gnumarus?.engine?.getPaintTipImage() ?? null };
  });
  expect(installed.ok).toBe(true);
  expect(installed.tip?.width).toBe(1);
  expect(installed.tip?.height).toBe(1);
  const readBrushFile = (): Promise<number[]> =>
    page.evaluate(async () => {
      const storage = navigator.storage as unknown as { getDirectory(): Promise<unknown> };
      const root = (await storage.getDirectory()) as unknown as {
        getDirectoryHandle(name: string): Promise<{
          getFileHandle(name: string): Promise<{ getFile(): Promise<Blob> }>;
        }>;
      };
      const brushes = await root.getDirectoryHandle("brushes");
      const file = await brushes.getFileHandle("4x4_tip.jxl");
      return Array.from(new Uint8Array(await (await file.getFile()).arrayBuffer()));
    });
  await expect.poll(readBrushFile, { timeout: 10000 }).not.toEqual([]);
  const archived = await readBrushFile();
  expect(archived.slice(0, 2)).toEqual([0xff, 0x0a]);
  const decoded = await decodeJxlInPage(page, archived);
  expect(decoded?.width).toBe(1);
  expect(decoded?.height).toBe(1);
  for (const channel of decoded?.center ?? []) {
    expect(channel).toBeGreaterThan(200);
  }
});

test("brush presets apply, save and persist", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const options = page.locator('gnumarus-shell [aria-label="Pencil options"]');
  await options.locator("select#brushPreset").selectOption("Chalk");
  await expect(page.locator("gnumarus-shell")).toContainText("Preset: Chalk");
  await expect(options.locator("select#brushTipKind")).toHaveValue("soft");
  await expect(options.locator("input#paintGrainStrength")).toHaveValue("60");
  await options.locator("input#presetName").fill("E2E Custom");
  await options.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Preset saved: E2E Custom");
  await expect(options.locator("select#brushPreset")).toContainText("E2E Custom");
  await page.reload();
  await page.waitForSelector("gnumarus-shell canvas");
  await expect(
    page.locator('gnumarus-shell [aria-label="Pencil options"] select#brushPreset'),
  ).toContainText("E2E Custom");
});

test("brush preset JSON imports and applies", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const imported = await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: {
        shell?: {
          exportBrushPresetJson(name: string): string | null;
          importBrushPresetJson(json: string): boolean;
          listBrushPresetNames(): string[];
        };
      };
    };
    const json = root.__gnumarus?.shell?.exportBrushPresetJson("Chalk") ?? null;
    if (json === null) {
      return { ok: false, names: [] as string[] };
    }
    const renamed = json.replace('"Chalk"', '"E2E Imported"');
    const ok = root.__gnumarus?.shell?.importBrushPresetJson(renamed) ?? false;
    return { ok, names: root.__gnumarus?.shell?.listBrushPresetNames() ?? [] };
  });
  expect(imported.ok).toBe(true);
  expect(imported.names).toContain("E2E Imported");
  await expect(page.locator("gnumarus-shell")).toContainText("Preset: E2E Imported");
  const options = page.locator('gnumarus-shell [aria-label="Pencil options"]');
  await expect(options.locator("input#paintGrainStrength")).toHaveValue("60");
  expect(await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { shell?: { importBrushPresetJson(json: string): boolean } };
    };
    return root.__gnumarus?.shell?.importBrushPresetJson("definitely not json") ?? true;
  })).toBe(false);
});

test("tip rotation follows the stroke direction", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#ff0000");
  await setPaintTip(page, "image", 16, 100, 15);
  const installed = await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: {
        shell?: {
          setPaintTipFromPixels(w: number, h: number, rgba: number[]): boolean;
          setTipAngleMode(mode: string): void;
        };
      };
    };
    const ok = root.__gnumarus?.shell?.setPaintTipFromPixels(2, 1, [255, 255, 255, 255, 0, 0, 0, 255]) ?? false;
    root.__gnumarus?.shell?.setTipAngleMode("direction");
    return ok;
  });
  expect(installed).toBe(true);
  const start = await layerScreenTarget(page, 32, 8);
  const end = await layerScreenTarget(page, 32, 56);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 8 });
  await page.mouse.up();
  expect(await readPixel(page, 32, 26)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("airbrush builds paint up while held", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#ff0000");
  await setPaintTip(page, "soft", 16, 100, 15);
  await setPaintDynamics(page, 30, 0, 0, 8);
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { shell?: { setAirbrushRate(rate: number): void } };
    };
    root.__gnumarus?.shell?.setAirbrushRate(0);
  });
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(center.x, center.y);
  await page.mouse.down();
  await page.mouse.up();
  const single = await readPixel(page, 32, 32);
  expect(single).not.toBeNull();
  expect(single!.a).toBeGreaterThan(0);
  expect(single!.a).toBeLessThan(150);
  await blurActiveElement(page);
  await page.keyboard.press("Control+z");
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { shell?: { setAirbrushRate(rate: number): void } };
    };
    root.__gnumarus?.shell?.setAirbrushRate(20);
  });
  await page.mouse.move(center.x, center.y);
  await page.mouse.down();
  await page.waitForTimeout(500);
  await page.mouse.up();
  const built = await readPixel(page, 32, 32);
  expect(built).not.toBeNull();
  expect(built!.a).toBeGreaterThan(150);
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { shell?: { setAirbrushRate(rate: number): void } };
    };
    root.__gnumarus?.shell?.setAirbrushRate(0);
  });
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
  await selectTool(page, 'Line');
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
  expect(tipSize.radius).toBe("50%");
  await selectTool(page, 'Line');
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
  await selectTool(page, 'Curve');
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
  await page.locator("gnumarus-shell select#brushShape").selectOption("square");
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
  await expect(page.locator("gnumarus-shell")).toContainText("Brush size: 0.1 – 1.5");
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
  await selectTool(page, 'Line');
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
  await expect(page.locator("gnumarus-shell")).toContainText("Blend mode: Normal");
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
  await expect(page.locator("gnumarus-shell")).toContainText("Blend mode: Eraser");
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
  await expect(page.locator("gnumarus-shell")).toContainText("Blend mode: Eraser");
  await page.keyboard.press("e");
  expect(await blendOf()).toBe("normal");
  await expect(page.locator("gnumarus-shell")).toContainText("Blend mode: Normal");
  await page.locator("gnumarus-shell select#blendMode").selectOption("copy");
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur?.();
  });
  await page.keyboard.press("e");
  expect(await blendOf()).toBe("eraser");
  await page.keyboard.press("e");
  expect(await blendOf()).toBe("copy");
  await expect(page.locator("gnumarus-shell")).toContainText("Blend mode: Copy");
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
  await expect(toast).toContainText("1/3: L1");
  await page.keyboard.press("PageUp");
  state = await getLayers(page);
  expect(state.active).toBe("layer1");
  await expect(toast).toContainText("2/3: MyLayer2Name");
  await page.keyboard.press("PageUp");
  state = await getLayers(page);
  expect(state.active).toBe("layer2");
  await expect(toast).toContainText("3/3: L3");
  await page.keyboard.press("PageUp");
  state = await getLayers(page);
  expect(state.active).toBe("layer0");
  await expect(toast).toContainText("1/3: L1");
  await page.keyboard.press("PageDown");
  state = await getLayers(page);
  expect(state.active).toBe("layer2");
  await expect(toast).toContainText("3/3: L3");
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
  await expect(page.locator("gnumarus-shell")).toContainText("Stabilizer: Rope");
  expect(await engineMode()).toBe("rope");
  await expect(page.locator("gnumarus-shell input#ropeLength")).toBeVisible();
  await expect(page.locator("gnumarus-shell input#followStrength")).toHaveCount(0);
  await page.locator("gnumarus-shell input#ropeLength").fill("25");
  await expect(page.locator("gnumarus-shell")).toContainText("Rope length: 25");

  await mode.selectOption("follow");
  await expect(page.locator("gnumarus-shell")).toContainText("Stabilizer: Follow");
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
  await expect(page.locator("gnumarus-shell")).toContainText("Brush size: 1 – 3");
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
  await selectTool(page, 'Line');
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
  await expect(page.locator("gnumarus-shell")).toContainText("Line width: 1 – 4");
  await selectTool(page, 'Curve');
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

async function stubPenPointerCapture(page: import("@playwright/test").Page): Promise<void> {
  // Synthetic pen PointerEvents carry no OS pointer, so capture would throw.
  await page.evaluate(() => {
    const proto = HTMLCanvasElement.prototype as unknown as { setPointerCapture(id: number): void };
    proto.setPointerCapture = () => {};
  });
}

async function penDot(
  page: import("@playwright/test").Page,
  x: number,
  y: number,
  pressure: number,
): Promise<void> {
  await page.evaluate(
    ([px, py, p]: number[]) => {
      const root = document.querySelector("gnumarus-shell")?.shadowRoot ?? null;
      const target = root?.querySelector("canvas") as HTMLCanvasElement | null;
      if (target === null) {
        throw new Error("canvas is missing");
      }
      const base = {
        pointerId: 7,
        pointerType: "pen",
        button: 0,
        clientX: px,
        clientY: py,
        bubbles: true,
        cancelable: true,
        composed: true,
      };
      target.dispatchEvent(new PointerEvent("pointerdown", { ...base, buttons: 1, pressure: p }));
      target.dispatchEvent(new PointerEvent("pointerup", { ...base, buttons: 0, pressure: p }));
    },
    [x, y, pressure],
  );
}

async function paintedPixelCount(page: import("@playwright/test").Page): Promise<number> {
  return page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { exportTextures(): Array<{ buffer: Uint8ClampedArray }> } };
    };
    const buffer = root.__gnumarus?.engine?.exportTextures()[0]?.buffer;
    if (buffer === undefined) {
      return -1;
    }
    let count = 0;
    for (let index = 3; index < buffer.length; index += 4) {
      if ((buffer[index] ?? 0) > 0) {
        count += 1;
      }
    }
    return count;
  });
}

async function blurActiveElement(page: import("@playwright/test").Page): Promise<void> {
  // Shortcuts ignore key events from fields; blur first so Ctrl+Z reaches the shell.
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });
}

async function canvasCenter(page: import("@playwright/test").Page): Promise<{ x: number; y: number }> {
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

test("pencil pressure size scales the stroke", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await stubPenPointerCapture(page);
  await page.getByRole("button", { name: "Pencil" }).click();
  await page.locator("gnumarus-shell input#brushSize").fill("10");
  await page.locator("gnumarus-shell input#brushSizeMin").fill("2");
  await page.locator("gnumarus-shell select#pressureResponse").selectOption("size");
  await expect(page.locator("gnumarus-shell")).toContainText("Pressure response: Size");
  const center = await canvasCenter(page);
  await penDot(page, center.x, center.y, 1);
  const full = await paintedPixelCount(page);
  await blurActiveElement(page);
  await page.keyboard.press("Control+z");
  expect(await paintedPixelCount(page)).toBe(0);
  await penDot(page, center.x, center.y, 0.5);
  const half = await paintedPixelCount(page);
  expect(half).toBeGreaterThan(0);
  expect(full).toBeGreaterThan(2 * half);
});

test("pencil pressure opacity scales the alpha", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await stubPenPointerCapture(page);
  await page.getByRole("button", { name: "Pencil" }).click();
  await page.locator("gnumarus-shell select#pressureResponse").selectOption("opacity");
  await setPencil(page, "#00000080");
  const center = await canvasCenter(page);
  await penDot(page, center.x, center.y, 1);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 128 });
  await blurActiveElement(page);
  await page.keyboard.press("Control+z");
  await penDot(page, center.x, center.y, 0.5);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 64 });
});

test("pencil pressure none ignores pen pressure", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await stubPenPointerCapture(page);
  await page.getByRole("button", { name: "Pencil" }).click();
  await expect(page.locator("gnumarus-shell select#pressureResponse")).toHaveValue("none");
  await page.locator("gnumarus-shell input#brushSize").fill("10");
  const center = await canvasCenter(page);
  await penDot(page, center.x, center.y, 0.5);
  expect(await paintedPixelCount(page)).toBeGreaterThan(50);
  await blurActiveElement(page);
  await page.keyboard.press("Control+z");
  await setPencil(page, "#00000080");
  await page.locator("gnumarus-shell input#brushSize").fill("1");
  await penDot(page, center.x, center.y, 0.5);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 128 });
});

test("pencil pressure size+opacity applies both", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await stubPenPointerCapture(page);
  await page.getByRole("button", { name: "Pencil" }).click();
  await page.locator("gnumarus-shell input#brushSize").fill("10");
  await page.locator("gnumarus-shell select#pressureResponse").selectOption("size+opacity");
  await setPencil(page, "#00000080");
  const center = await canvasCenter(page);
  await penDot(page, center.x, center.y, 0.5);
  expect(await paintedPixelCount(page)).toBeLessThan(40);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 64 });
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

test("pencil pixel perfect snaps size to 1 and thins tight turns @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Pencil" }).click();
  const options = page.locator('gnumarus-shell [data-testid="tool-options"]');
  await expect(options).toContainText("Pixel perfect");
  const pixelPerfect = page.locator("gnumarus-shell input#pencilPixelPerfect");
  await expect(pixelPerfect).toBeEnabled();
  await page.locator("gnumarus-shell input#brushSize").fill("3");
  await page.locator("gnumarus-shell input#brushSizeMin").fill("2");
  await expect(pixelPerfect).toBeEnabled();
  await pixelPerfect.check();
  await expect(page.locator("gnumarus-shell input#brushSize")).toHaveValue("1");
  await expect(page.locator("gnumarus-shell input#brushSizeMin")).toHaveValue("1");
  await page.locator("gnumarus-shell input#pencilAntialias").check();
  await expect(pixelPerfect).toBeEnabled();
  await page.locator("gnumarus-shell input#pencilAntialias").uncheck();
  await expect(pixelPerfect).toBeEnabled();
  await pixelPerfect.uncheck();

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

test("curve pixel perfect snaps width to 1 and keeps curves thin @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadTinyLayer(page, 16);
  await setPencil(page, "#ff0000");
  await selectTool(page, 'Curve');
  const pixelPerfect = page.locator("gnumarus-shell input#curvePixelPerfect");
  await expect(pixelPerfect).toBeEnabled();
  await page.locator("gnumarus-shell input#curveWidth").fill("2");
  await expect(pixelPerfect).toBeEnabled();
  await pixelPerfect.check();
  await expect(page.locator("gnumarus-shell input#curveWidth")).toHaveValue("1");
  await expect(page.locator("gnumarus-shell input#curveWidthMin")).toHaveValue("1");
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

test("holding Ctrl temporarily switches to the eyedropper", async ({ page }) => {  await page.goto("/");
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
  await setPencil(page, "#ff0000");
  await clickCenter();
  await page.getByRole("button", { name: "Add layer" }).click();
  // The new top layer is active and empty: the old eyedropper would copy
  // its transparent pixel instead of the red square underneath.
  await page.getByRole("button", { name: "Eyedropper" }).click();
  await clickCenter();
  await expect(page.locator("gnumarus-shell")).toContainText("Eyedropper: #ff0000");
  // Opaque paint on the top layer wins the composite.
  await page.keyboard.press("b");
  await setPencil(page, "#0000ff");
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
  for (const heading of ["File", "History", "Layers", "Frames", "Tools", "View", "Actions", "Interface"]) {
    await expect(dialog.getByRole("heading", { name: heading })).toBeVisible();
  }
  await expect(dialog).toContainText("Merge active layer down");
  await expect(dialog).toContainText("Non-destructive cell transform tool");
  await expect(dialog).toContainText("Temporary eyedropper");
  await expect(dialog).toContainText("Merge floating selection into the cell");
  await expect(dialog).toContainText("Cancel line/curve/rectangular selection in progress");
  await expect(dialog).toContainText("Reset current cell texture to transparent");
  await expect(dialog).toContainText("Resize tool live");
  await expect(dialog).toContainText("Mouse wheel");
  await expect(dialog).toContainText("Zoom canvas at cursor");
  await expect(dialog).toContainText("Alt+middle-click");
  await expect(dialog).toContainText("Middle-click");
  await expect(dialog).toContainText("Right-drag");
  await expect(dialog).toContainText("Cmd+Z");
  await expect(dialog).toContainText("Quick action search");
  await expect(dialog).toContainText("Reset canvas transform (zoom, pan and rotation)");
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

test("quick action palette filters and runs actions", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { setZoom(z: number): void } } };
    root.__gnumarus?.engine?.setZoom(16);
  });
  await page.keyboard.press("Control+Shift+P");
  const dialog = page.locator("gnumarus-shell dialog#actionPaletteDialog");
  await expect(dialog).toBeVisible();
  const input = dialog.locator('[data-testid="action-palette-input"]');
  await expect(input).toBeFocused();
  await expect(dialog.locator('[data-testid="action-palette-item"]')).toHaveText([
    "Adjust colors…",
    "Crop All Cells to Canvas",
    "Export project",
    "Fit All Textures to Size",
    "Import 3D Model as layer",
    "Import full project",
    "Import raster image as layer",
    "Import SVG as layer",
    "Invert colors",
    "New Project",
    "Open Project",
    "Redo",
    "Reload All Textures",
    "Reset Canvas Transform",
    "Save Project",
    "Save project as",
    "Settings",
    "Shortcuts",
    "Source code",
    "Undo",
  ]);
  await input.fill("xyz-nothing");
  await expect(dialog.locator('[data-testid="action-palette-empty"]')).toBeVisible();
  await expect(dialog.locator('[data-testid="action-palette-item"]')).toHaveCount(0);
  await page.keyboard.press("Enter");
  await expect(dialog).toBeVisible();
  await input.fill("reset");
  await expect(dialog.locator('[data-testid="action-palette-item"]')).toHaveText(["Reset Canvas Transform"]);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(dialog).toBeHidden();
  await expect(page.locator("gnumarus-shell")).toContainText("Canvas transform reset");
});

test("quick action palette runs the clicked action and closes on Escape", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { setZoom(z: number): void } } };
    root.__gnumarus?.engine?.setZoom(16);
  });
  await page.keyboard.press("Control+Shift+P");
  const dialog = page.locator("gnumarus-shell dialog#actionPaletteDialog");
  await expect(dialog).toBeVisible();
  await dialog.locator('[data-testid="action-palette-item"][data-action-id="reset-canvas-transform"]').click();
  await expect(dialog).toBeHidden();
  await expect(page.locator("gnumarus-shell")).toContainText("Canvas transform reset");
  await page.keyboard.press("Control+Shift+P");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("Digit0 resets the canvas transform", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { setZoom(z: number): void } } };
    root.__gnumarus?.engine?.setZoom(16);
  });
  await page.keyboard.press("0");
  await expect(page.locator("gnumarus-shell")).toContainText("Canvas transform reset");
});

test("Fit All Textures to Size fits every texture at once", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#ff0000");
  await paintCenter(page);
  await page.getByRole("button", { name: "Add layer" }).click();
  await page.keyboard.press("Control+Shift+P");
  const dialog = page.locator("gnumarus-shell dialog#actionPaletteDialog");
  await expect(dialog).toBeVisible();
  await dialog.locator('[data-testid="action-palette-input"]').fill("fit all");
  await expect(dialog.locator('[data-testid="action-palette-item"]')).toHaveText(["Fit All Textures to Size"]);
  await page.keyboard.press("Enter");
  const fitDialog = page.locator("gnumarus-shell dialog#fitTextureDialog");
  await expect(fitDialog).toBeVisible();
  await expect(fitDialog.locator("input#fitThreshold")).toHaveValue("0");
  await fitDialog.getByRole("button", { name: "OK" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Fitted 1 texture to size");
  // The painted layer shrank to its single pixel; the empty layer is untouched.
  await page.locator('gnumarus-shell [data-layer-id="layer0"] .layer-name').click();
  expect(await readPixel(page, 0, 0)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 1, 0)).toBeNull();
  // A single undo reverts the whole batch.
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 0, 0)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
});

test("Crop All Cells to Canvas crops shared textures sequentially", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#ff0000");
  await paintCenter(page);
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  // Frame 1 gets its own content reusing frame 0's texture, then moved right.
  const frameCell = matrix.locator('[data-testid="anim-cell"][data-matrix-frame="1"]');
  await frameCell.click({ button: "right" });
  await page.getByRole("button", { name: "Select content" }).click();
  await page.locator('gnumarus-shell [data-testid="content-picker-new"]').click();
  const before = await getMatrix(page);
  const textureId = before.contents[0]?.textureId ?? "";
  expect(textureId.length).toBeGreaterThan(0);
  await page.locator(`gnumarus-shell [data-testid="texture-picker-item"][data-texture-id="${textureId}"]`).click();
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { setLayerTransform(id: string, t: unknown): boolean } } };
    root.__gnumarus?.engine?.setLayerTransform("layer0", { x: 10, y: 0 });
  });
  await page.keyboard.press("Control+Shift+P");
  const dialog = page.locator("gnumarus-shell dialog#actionPaletteDialog");
  await expect(dialog).toBeVisible();
  await dialog.locator('[data-testid="action-palette-input"]').fill("crop all");
  await page.keyboard.press("Enter");
  await expect(dialog).toBeHidden();
  await expect(page.locator("gnumarus-shell")).toContainText("Cropped 1 texture to canvas (1 unchanged)");
  // Both cells keep their pixels; the shared texture shrank once.
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  await matrix.locator('[data-testid="anim-frame"][data-frame="0"]').click();
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  const state = await getLayers(page);
  expect(state.layers[0]?.width).toBe(54);
  // A single undo reverts the whole batch.
  await page.keyboard.press("Control+z");
  const restored = await getLayers(page);
  expect(restored.layers[0]?.width).toBe(64);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("Crop All Cells to Canvas crops every cell at once", async ({ page }) => {
  const bytes = buildXcfBytes(4, 4, [
    { name: "Top", width: 4, height: 4, offsetX: 2, offsetY: 2, rgba: [0, 255, 0, 255] },
    { name: "Bottom", width: 4, height: 4, offsetX: 0, offsetY: 0, rgba: [0, 0, 255, 255] },
  ]);
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell");
  await setImportCleanup(page, "none");
  await stubAsepritePicker(page, "crop.xcf", bytes);
  await page.getByRole("button", { name: "File" }).click();
  await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Import full project", exact: true }).click();
  await expect(page.locator('gnumarus-shell [data-testid="toast"]')).toContainText("Imported crop.xcf (2 layers)");
  let state = await getLayers(page);
  expect(state.layers[1]?.transform).toMatchObject({ x: 2, y: 2 });
  expect(state.layers[1]?.width).toBe(4);
  await page.keyboard.press("Control+Shift+P");
  const dialog = page.locator("gnumarus-shell dialog#actionPaletteDialog");
  await expect(dialog).toBeVisible();
  await dialog.locator('[data-testid="action-palette-input"]').fill("crop all");
  await expect(dialog.locator('[data-testid="action-palette-item"]')).toHaveText(["Crop All Cells to Canvas"]);
  await page.keyboard.press("Enter");
  await expect(dialog).toBeHidden();
  await expect(page.locator("gnumarus-shell")).toContainText("Cropped 1 texture to canvas");
  // The offset layer shrank to its visible 2x2 and re-seated; the full layer is untouched.
  state = await getLayers(page);
  expect(state.layers[1]?.transform).toMatchObject({ x: 1, y: 1 });
  expect(state.layers[1]?.width).toBe(2);
  expect(state.layers[1]?.height).toBe(2);
  expect(await readPixel(page, 0, 0)).toEqual({ r: 0, g: 255, b: 0, a: 255 });
  expect(await readPixel(page, 2, 0)).toBeNull();
  // A single undo reverts the whole batch.
  await page.keyboard.press("Control+z");
  state = await getLayers(page);
  expect(state.layers[1]?.transform).toMatchObject({ x: 2, y: 2 });
  expect(state.layers[1]?.width).toBe(4);
});

async function stubDirectoryWithFileStore(page: import("@playwright/test").Page): Promise<void> {
  await page.evaluate(() => {
    const root = window as unknown as {
      showDirectoryPicker?: () => Promise<unknown>;
      __gnumarusDirTest?: { files: Record<string, Blob> };
    };
    const state: { files: Record<string, Blob> } = { files: {} };
    root.__gnumarusDirTest = state;
    interface MockFileHandle {
      getFile(): Promise<File>;
      createWritable(): Promise<{ write(data: string | Blob): Promise<void>; close(): Promise<void> }>;
    }
    function makeFileHandle(path: string): MockFileHandle {
      return {
        getFile: (): Promise<File> => Promise.resolve(new File([state.files[path] ?? new Blob([])], path)),
        createWritable: (): Promise<{ write(data: string | Blob): Promise<void>; close(): Promise<void> }> =>
          Promise.resolve({
            write: (data: string | Blob): Promise<void> => {
              state.files[path] = data instanceof Blob ? data : new Blob([data]);
              return Promise.resolve();
            },
            close: (): Promise<void> => Promise.resolve(),
          }),
      };
    }
    function makeDir(prefix: string): unknown {
      return {
        name: prefix === "" ? "MockDir" : prefix,
        removeEntry: (fileName: string): Promise<void> => {
          if (state.files[prefix + fileName] === undefined) {
            return Promise.reject(new DOMException("File not found", "NotFoundError"));
          }
          delete state.files[prefix + fileName];
          return Promise.resolve();
        },
        getFileHandle: (fileName: string, options?: { create?: boolean }): Promise<MockFileHandle> => {
          const path = prefix + fileName;
          if (state.files[path] === undefined && options?.create !== true) {
            return Promise.reject(new DOMException("File not found", "NotFoundError"));
          }
          return Promise.resolve(makeFileHandle(path));
        },
        getDirectoryHandle: (dirName: string): Promise<unknown> =>
          Promise.resolve(makeDir(`${prefix}${dirName}/`)),
      };
    }
    root.showDirectoryPicker = (): Promise<unknown> => Promise.resolve(makeDir(""));
  });
}

async function runPaletteAction(page: import("@playwright/test").Page, query: string): Promise<void> {
  await page.keyboard.press("Control+Shift+P");
  const dialog = page.locator("gnumarus-shell dialog#actionPaletteDialog");
  await expect(dialog).toBeVisible();
  await dialog.locator('[data-testid="action-palette-input"]').fill(query);
  await page.keyboard.press("Enter");
  await expect(dialog).toBeHidden();
}

test("Reload All Textures without a saved project shows an error toast", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await runPaletteAction(page, "reload all");
  await expect(page.locator("gnumarus-shell")).toContainText(
    "Reload textures failed: the project has not been saved yet",
  );
});

test("Reload All Textures restores saved files, skips new textures and undoes", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await stubDirectoryWithFileStore(page);
  await page.keyboard.press("Control+s");
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockDir");
  // Paint after saving, then add a layer whose texture has no file on disk.
  await paintCenter(page);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  await page.getByRole("button", { name: "Add layer" }).click();
  await runPaletteAction(page, "reload all");
  await expect(page.locator("gnumarus-shell")).toContainText("Reloaded 1 texture (1 skipped)");
  // The saved layer is back to its on-disk (blank) pixels.
  await page.locator('gnumarus-shell [data-layer-id="layer0"] .layer-name').click();
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  // A single undo restores the painted pixels.
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
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

async function selectionMaskDisplay(page: import("@playwright/test").Page): Promise<string> {
  return page.evaluate(() => {
    const root = document.querySelector("gnumarus-shell")?.shadowRoot;
    const path = root?.getElementById("canvasHost")?.querySelector('[data-testid="selection-mask"]') as SVGPathElement | null;
    return path?.style.display ?? "missing";
  });
}

async function selectionMaskMoves(page: import("@playwright/test").Page): Promise<number> {
  return page.evaluate(() => {
    const root = document.querySelector("gnumarus-shell")?.shadowRoot;
    const path = root?.getElementById("canvasHost")?.querySelector('[data-testid="selection-mask"]') as SVGPathElement | null;
    const d = path?.getAttribute("d") ?? "";
    return d.split("M").length - 1;
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

interface GnumarusFloatingSelectionInfo {
  x: number;
  y: number;
  width: number;
  height: number;
  selected: number;
}

async function getFloatingSelection(page: import("@playwright/test").Page): Promise<GnumarusFloatingSelectionInfo | null> {
  return page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getFloatingSelection(): GnumarusFloatingSelectionInfo | null } };
    };
    return root.__gnumarus?.engine?.getFloatingSelection() ?? null;
  });
}

async function dragRect(
  page: import("@playwright/test").Page,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): Promise<void> {
  const from = await layerScreenTarget(page, x0, y0);
  const to = await layerScreenTarget(page, x1, y1);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 5 });
  await page.mouse.up();
}

async function engineBrushSize(page: import("@playwright/test").Page): Promise<number> {
  return page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { getBrushSize(): number } } };
    return root.__gnumarus?.engine?.getBrushSize() ?? -1;
  });
}

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
  await setPencil(page, "#ff0000");
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
  expect(await readPixel(page, 12, 12)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  expect(await readPixel(page, 28, 28)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("polygonal lasso commits on right-click and combines with shift", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#ff0000");
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
  expect(await readPixel(page, 11, 11)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  expect(await readPixel(page, 21, 21)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
});

async function paintDot(
  page: import("@playwright/test").Page,
  hex: string,
  x: number,
  y: number,
): Promise<void> {
  await setPencil(page, hex);
  const target = await layerScreenTarget(page, x, y);
  await page.mouse.click(target.x, target.y);
}

/** Front buttons of each drawer, for tools hidden inside a closed flyout. */
const DRAWER_FOR_TOOL: Record<string, string> = {
  Line: "paint",
  Curve: "paint",
  Rectangle: "shape",
  Ellipse: "shape",
  Polygon: "shape",
  Gradient: "shape",
  Shading: "retouch",
  Blur: "retouch",
  Clone: "retouch",
  Recolor: "retouch",
  Jumble: "retouch",
  Crop: "destructive",
  "Rectangular selection": "selection",
  "Elliptical selection": "selection",
  "Freehand lasso": "selection",
  "Color selection": "selection",
  "Destructive selection transform": "destructive",
  "Destructive selection 3D rotation": "destructive",
  "Non-destructive cell transform": "transform",
  "Non-destructive cell 3D rotation": "transform",
  "3D model transform": "model",
  "Fly camera": "model",
};

/** Click a toolbar tool, opening its drawer flyout when it is not the front. */
async function selectTool(page: import("@playwright/test").Page, name: string): Promise<void> {
  const direct = page.getByRole("button", { name, exact: true });
  if ((await direct.count()) > 0) {
    await direct.first().click();
    return;
  }
  const drawer = DRAWER_FOR_TOOL[name];
  if (drawer === undefined) {
    throw new Error(`no drawer known for tool ${name}`);
  }
  await page.locator(`gnumarus-shell [data-testid="${drawer}-drawer"] > button`).click({ button: "right" });
  await page
    .locator(`gnumarus-shell [data-testid="${drawer}-flyout"]`)
    .getByRole("button", { name, exact: true })
    .click();
}

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
  await expect(drawer.getByRole("button", { name: "Pencil" })).toBeVisible();
  await drawer.getByRole("button", { name: "Pencil" }).click({ button: "right" });
  await expect(page.locator('gnumarus-shell [data-testid="paint-flyout"]')).toBeVisible();
  await page.locator('gnumarus-shell [data-testid="paint-flyout"]').getByRole("button", { name: "Curve" }).click();
  await expect(page.locator('gnumarus-shell [data-testid="paint-flyout"]')).toBeHidden();
  await expect(drawer.getByRole("button", { name: "Curve" })).toBeVisible();
  await expect(page.locator("gnumarus-shell")).toContainText("Curve tool");
  await drawer.getByRole("button", { name: "Curve" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Curve tool");
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
  await expect(page.locator("gnumarus-shell")).toContainText("Non-destructive cell 3D rotation tool");
});

test("elliptical selection cuts an ellipse", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#ff0000");
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
  expect(await readPixel(page, 15, 15)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  expect(await readPixel(page, 10, 10)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("lasso selection cuts a freehand shape", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#ff0000");
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
  expect(await readPixel(page, 12, 12)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
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
  expect(await readPixel(page, 10, 10)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
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
  expect(await readPixel(page, 10, 10)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  expect(await readPixel(page, 40, 40)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
});

test("color selection threshold gates near matches", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#ff0000");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  const corner = await layerScreenTarget(page, 0, 0);
  await page.mouse.click(corner.x, corner.y);
  await page.getByRole("button", { name: "Pencil" }).click();
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
  expect(await readPixel(page, 11, 11)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  expect(await readPixel(page, 21, 21)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
});

test("rectangular selection shift-drag adds to the selection", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#ff0000");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  const center = await layerScreenTarget(page, 32, 32);
  await page.mouse.click(center.x, center.y);
  await selectTool(page, 'Rectangular selection');
  await dragRect(page, 10, 10, 12, 12);
  expect(await getFloatingSelection(page)).toEqual({ x: 10, y: 10, width: 3, height: 3, selected: 9 });
  expect(await readPixel(page, 11, 11)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
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
  expect(await readPixel(page, 21, 21)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  expect(await readPixel(page, 15, 15)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  // Two disjoint boxes trace two outlines, not one bbox outline.
  expect(await selectionOverlayDisplay(page)).toBe("none");
  expect(await selectionMaskDisplay(page)).toBe("block");
  expect(await selectionMaskMoves(page)).toBe(8);
});

test("rectangular selection ctrl-shift-drag intersects the selection", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#ff0000");
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
  expect(await readPixel(page, 17, 17)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  expect(await readPixel(page, 30, 30)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  // Full-mask result keeps the quad polygon overlay.
  expect(await selectionOverlayDisplay(page)).toBe("block");
  expect(await selectionMaskDisplay(page)).toBe("none");
});

test("rectangular selection ctrl-shift-drag with no overlap clears the selection", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#ff0000");
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
  await setPencil(page, "#ff0000");
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
  expect(await readPixel(page, 12, 12)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  expect(await readPixel(page, 17, 17)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 30, 30)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  // The notch is traced: outline rendering switches to the mask path.
  expect(await selectionOverlayDisplay(page)).toBe("none");
  expect(await selectionMaskDisplay(page)).toBe("block");
});

test("rectangular selection alt-shift-drag with no overlap changes nothing", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#ff0000");
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
  expect(await readPixel(page, 11, 11)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  expect(await readPixel(page, 41, 41)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

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
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
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
  await setPencil(page, "#ff0000");
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
    { label: "Text", title: expect.stringMatching(/^X: Text \(/) },
    { label: "Tile brush", title: "Tile brush (click an empty cell to create a tilemap, click a tilemap cell to place the selected tile; right-click erases)" },
    { label: "Rectangle", title: expect.stringMatching(/^D: Rectangle \(/) },
    { label: "3D model transform", title: expect.stringMatching(/^3D model transform \(drag to orbit/) },
    { label: "Rectangular selection", title: expect.stringMatching(/^R: Rectangular selection \(/) },
    { label: "Destructive selection transform", title: expect.stringMatching(/^V: Destructive selection transform \(/) },
    { label: "Non-destructive cell transform", title: expect.stringMatching(/^T: Non-destructive cell transform \(/) },
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
  await page.locator('gnumarus-shell select#brushShape').selectOption("square");
  const center = await layerScreenTarget(page, 32, 32);
  await page.mouse.click(center.x, center.y);
  await selectTool(page, 'Rectangular selection');
  const start = await layerScreenTarget(page, 30, 30);
  const end = await layerScreenTarget(page, 34, 34);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 4 });
  await page.mouse.up();
  await selectTool(page, 'Destructive selection transform');
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
  await selectTool(page, 'Rectangular selection');
  const start = await layerScreenTarget(page, 30, 30);
  const end = await layerScreenTarget(page, 34, 34);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 4 });
  await page.mouse.up();
  await selectTool(page, 'Destructive selection transform');
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
  await selectTool(page, 'Non-destructive cell transform');
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
  await layerDragHandle(page, "resize-se", 5 * 4, 0);
  expect((await getLayerTransform(page)).scaleX).toBeCloseTo(69 / 64, 6);
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { setZoom(zoom: number): void } } };
    root.__gnumarus?.engine?.setZoom(4);
  });
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
async function buildAsepriteBytes(
  page: import("@playwright/test").Page,
  tags?: Array<{ name: string; from: number; to: number; loop: number; repeat: number }>,
): Promise<Uint8Array> {
  return page.evaluate(
    async (tagEntries: Array<{ name: string; from: number; to: number; loop: number; repeat: number }>) => {
    async function deflate(data: Uint8Array): Promise<Uint8Array> {
      const output = await new Response(
        new Blob([data.slice()]).stream().pipeThrough(new CompressionStream("deflate")),
      ).arrayBuffer();
      return new Uint8Array(output);
    }
    class Writer {
      readonly bytes: number[] = [];
      u8(v: number): this {
        this.bytes.push(v & 0xff);
        return this;
      }
      u16(v: number): this {
        this.bytes.push(v & 0xff, (v >>> 8) & 0xff);
        return this;
      }
      i16(v: number): this {
        return this.u16(v < 0 ? 0x10000 + v : v);
      }
      u32(v: number): this {
        this.bytes.push(v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff);
        return this;
      }
      raw(values: ArrayLike<number>): this {
        for (let i = 0; i < values.length; i += 1) {
          this.bytes.push(values[i] ?? 0);
        }
        return this;
      }
      str(text: string): this {
        const encoded = new TextEncoder().encode(text);
        this.u16(encoded.length);
        return this.raw(encoded);
      }
      wrap(type: number, payload: Writer): this {
        this.u32(6 + payload.bytes.length);
        this.u16(type);
        return this.raw(payload.bytes);
      }
    }
    const layerChunk = (name: string, flags: number): Writer => {
      const payload = new Writer();
      payload.u16(flags).u16(0).u16(0).u16(0).u16(0).u16(0);
      payload.u8(255).u8(0).u8(0).u8(0);
      payload.str(name);
      return new Writer().wrap(0x2004, payload);
    };
    const imageCel = async (
      layer: number,
      x: number,
      y: number,
      width: number,
      height: number,
      pixels: Uint8Array,
    ): Promise<Writer> => {
      const payload = new Writer();
      payload.u16(layer).i16(x).i16(y).u8(255).u16(2).i16(0);
      payload.u8(0).u8(0).u8(0).u8(0).u8(0);
      payload.u16(width).u16(height);
      payload.raw(await deflate(pixels));
      return new Writer().wrap(0x2005, payload);
    };
    const linkedCel = (layer: number, x: number, y: number, linkTo: number): Writer => {
      const payload = new Writer();
      payload.u16(layer).i16(x).i16(y).u8(255).u16(1).i16(0);
      payload.u8(0).u8(0).u8(0).u8(0).u8(0);
      payload.u16(linkTo);
      return new Writer().wrap(0x2005, payload);
    };
    const tagsChunk = (entries: Array<{ name: string; from: number; to: number; loop: number; repeat: number }>): Writer => {
      const payload = new Writer();
      payload.u16(entries.length);
      payload.raw(new Array<number>(8).fill(0));
      for (const entry of entries) {
        payload.u16(entry.from).u16(entry.to).u8(entry.loop).u16(entry.repeat);
        payload.raw(new Array<number>(6).fill(0));
        payload.u8(255).u8(0).u8(0);
        payload.u8(0);
        payload.str(entry.name);
      }
      return new Writer().wrap(0x2018, payload);
    };
    const frameChunk = (duration: number, chunks: Writer[]): Writer => {
      const body = new Writer();
      for (const chunk of chunks) {
        body.raw(chunk.bytes);
      }
      const out = new Writer();
      out.u32(16 + body.bytes.length);
      out.u16(0xf1fa).u16(chunks.length).u16(duration).u8(0).u8(0).u32(chunks.length);
      return out.raw(body.bytes);
    };
    const blue = new Uint8Array(16 * 4);
    for (let i = 0; i < 16; i += 1) {
      blue[i * 4] = 0;
      blue[i * 4 + 1] = 0;
      blue[i * 4 + 2] = 255;
      blue[i * 4 + 3] = 255;
    }
    const red = new Uint8Array([255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255]);
    // Frame 0 (100ms): blue background + red 2x2 square at (1,1).
    // Frame 1 (250ms): blue background + linked copy of the red square.
    const frameZeroChunks = [
      layerChunk("bg", 1 | 8),
      layerChunk("fg", 1),
      await imageCel(0, 0, 0, 4, 4, blue),
      await imageCel(1, 1, 1, 2, 2, red),
    ];
    if (tagEntries.length > 0) {
      frameZeroChunks.push(tagsChunk(tagEntries));
    }
    const frames = [
      frameChunk(100, frameZeroChunks),
      frameChunk(250, [await imageCel(0, 0, 0, 4, 4, blue), linkedCel(1, 1, 1, 0)]),
    ];
    const out = new Writer();
    const body = new Writer();
    for (const entry of frames) {
      body.raw(entry.bytes);
    }
    out.u32(128 + body.bytes.length);
    out.u16(0xa5e0).u16(frames.length).u16(4).u16(4).u16(32).u32(1).u16(100);
    out.u32(0).u32(0).u8(0).u8(0).u8(0).u8(0).u16(0).u8(0).u8(0);
    out.i16(0).i16(0).u16(0).u16(0);
    out.raw(new Array<number>(84).fill(0));
    out.raw(body.bytes);
    return new Uint8Array(out.bytes);
  }, tags ?? []);
}

/** Stub the OS file picker to serve in-memory bytes as the picked file. */
async function stubAsepritePicker(
  page: import("@playwright/test").Page,
  fileName: string,
  bytes: Uint8Array,
): Promise<void> {
  await page.evaluate(
    ([name, data]: [string, number[]]) => {
      const root = window as unknown as {
        showOpenFilePicker?: () => Promise<Array<{ getFile(): Promise<File> }>>;
      };
      root.showOpenFilePicker = async () => [
        {
          getFile: async () => new File([new Uint8Array(data)], name, { type: "application/octet-stream" }),
        },
      ];
    },
    [fileName, Array.from(bytes)] as [string, number[]],
  );
}

async function animationFrameCount(page: import("@playwright/test").Page): Promise<number> {
  return page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { getFrameCount(): number } } };
    return root.__gnumarus?.engine?.getFrameCount() ?? -1;
  });
}

async function frameDuration(
  page: import("@playwright/test").Page,
  frame: number,
): Promise<number | null> {
  return page.evaluate((target: number) => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getEffectiveFrameDuration(frame: number): number } };
    };
    return root.__gnumarus?.engine?.getEffectiveFrameDuration(target) ?? null;
  }, frame);
}

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

function psdU16(value: number): number[] {
  return [(value >> 8) & 0xff, value & 0xff];
}

function psdU32(value: number): number[] {
  return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
}

function psdI32(value: number): number[] {
  return psdU32(value < 0 ? 0x100000000 + value : value);
}

function psdI16(value: number): number[] {
  return psdU16(value < 0 ? 0x10000 + value : value);
}

function psdAscii(text: string): number[] {
  return [...text].map((char) => char.charCodeAt(0) & 0xff);
}

function psdPascal4(text: string): number[] {
  const chars = psdAscii(text);
  const pad = (4 - ((1 + chars.length) % 4)) % 4;
  return [chars.length, ...chars, ...new Array<number>(pad).fill(0)];
}

interface PsdTestPlane {
  id: number;
  payload: number[];
}

interface PsdTestLayer {
  top: number;
  left: number;
  bottom: number;
  right: number;
  opacity?: number;
  flags?: number;
  name?: string;
  planes: PsdTestPlane[];
}

function buildPsdBytes(
  width: number,
  height: number,
  layers: PsdTestLayer[],
  composite?: number[][],
): Uint8Array {
  const out: number[] = [
    ...psdAscii("8BPS"),
    ...psdU16(1),
    0, 0, 0, 0, 0, 0,
    ...psdU16(3),
    ...psdU32(height),
    ...psdU32(width),
    ...psdU16(8),
    ...psdU16(3),
    ...psdU32(0),
    ...psdU32(0),
  ];
  const records: number[] = [...psdI16(layers.length)];
  const blobs: number[] = [];
  for (const layer of layers) {
    records.push(
      ...psdI32(layer.top),
      ...psdI32(layer.left),
      ...psdI32(layer.bottom),
      ...psdI32(layer.right),
      ...psdU16(layer.planes.length),
    );
    for (const plane of layer.planes) {
      records.push(...psdI16(plane.id), ...psdU32(2 + plane.payload.length));
    }
    records.push(...psdAscii("8BIM"), ...psdAscii("norm"), layer.opacity ?? 255, 0, layer.flags ?? 8, 0);
    const extra = [...psdU32(0), ...psdU32(0), ...psdPascal4(layer.name ?? "")];
    records.push(...psdU32(extra.length), ...extra);
    for (const plane of layer.planes) {
      blobs.push(...psdU16(0), ...plane.payload);
    }
  }
  const infoPad = (records.length + blobs.length) % 2;
  const info = [...psdU32(records.length + blobs.length + infoPad), ...records, ...blobs];
  if (infoPad === 1) {
    info.push(0);
  }
  const section = [...info, ...psdU32(0)];
  out.push(...psdU32(section.length), ...section);
  if (composite !== undefined) {
    out.push(...psdU16(0));
    for (const plane of composite) {
      out.push(...plane);
    }
  }
  return new Uint8Array(out);
}

function solidPsdPlane(width: number, height: number, value: number): number[] {
  return new Array<number>(width * height).fill(value);
}

function xcfU32(value: number): number[] {
  return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
}

function xcfI32(value: number): number[] {
  return xcfU32(value < 0 ? 0x100000000 + value : value);
}

function xcfU64(value: number): number[] {
  return [...xcfU32(Math.floor(value / 4294967296)), ...xcfU32(value >>> 0)];
}

function xcfRlePlane(samples: number[]): number[] {
  const out: number[] = [];
  let i = 0;
  while (i < samples.length) {
    let run = 1;
    while (i + run < samples.length && samples[i + run] === samples[i]) {
      run += 1;
    }
    if (run >= 3) {
      out.push(run - 1, samples[i] as number);
      i += run;
      continue;
    }
    const start = i;
    while (i < samples.length) {
      let ahead = 1;
      while (i + ahead < samples.length && samples[i + ahead] === samples[i] && ahead < 120) {
        ahead += 1;
      }
      if (ahead >= 3 || i - start >= 120) {
        break;
      }
      i += 1;
    }
    out.push(256 - (i - start), ...samples.slice(start, i));
  }
  return out;
}

interface XcfTestLayer {
  name: string;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  opacity?: number;
  rgba: [number, number, number, number];
}

function buildXcfBytes(width: number, height: number, layers: XcfTestLayer[]): Uint8Array {
  const out: number[] = [
    ...[... "gimp xcf v011"].map((char) => char.charCodeAt(0)),
    0,
    ...xcfI32(width),
    ...xcfI32(height),
    ...xcfI32(0),
    ...xcfI32(150),
    ...xcfU32(17),
    ...xcfU32(1),
    1,
    ...xcfU32(0),
    ...xcfU32(0),
  ];
  const patch = (at: number, value: number[]): void => {
    for (let i = 0; i < value.length; i += 1) {
      out[at + i] = value[i] as number;
    }
  };
  const reserve = (size: number): number => {
    const at = out.length;
    for (let i = 0; i < size; i += 1) {
      out.push(0);
    }
    return at;
  };
  const slots = layers.map(() => reserve(8));
  reserve(8);
  layers.forEach((layer, index) => {
    patch(slots[index] as number, xcfU64(out.length));
    out.push(...xcfI32(layer.width), ...xcfI32(layer.height), ...xcfI32(1));
    const name = [...layer.name].map((char) => char.charCodeAt(0) & 0xff);
    out.push(...xcfU32(name.length + 1), ...name, 0);
    out.push(...xcfU32(6), ...xcfU32(4), ...xcfU32(layer.opacity ?? 255));
    out.push(...xcfU32(15), ...xcfU32(8), ...xcfI32(layer.offsetX), ...xcfI32(layer.offsetY));
    out.push(...xcfU32(8), ...xcfU32(4), ...xcfU32(1));
    out.push(...xcfU32(7), ...xcfU32(4), 0, 0, 0, 28);
    out.push(...xcfU32(0), ...xcfU32(0));
    const hier = reserve(8);
    reserve(8);
    patch(hier, xcfU64(out.length));
    out.push(...xcfI32(layer.width), ...xcfI32(layer.height), ...xcfI32(4));
    const level = reserve(8);
    patch(level, xcfU64(out.length));
    out.push(...xcfI32(layer.width), ...xcfI32(layer.height));
    const tile = reserve(8);
    reserve(8);
    patch(tile, xcfU64(out.length));
    const count = layer.width * layer.height;
    const planes = [
      new Array<number>(count).fill(layer.rgba[0]),
      new Array<number>(count).fill(layer.rgba[1]),
      new Array<number>(count).fill(layer.rgba[2]),
      new Array<number>(count).fill(layer.rgba[3]),
    ];
    for (const plane of planes) {
      out.push(...xcfRlePlane(plane));
    }
  });
  return new Uint8Array(out);
}

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

function kraRawTile(bgra: [number, number, number, number]): number[] {
  const pixels: number[] = [0];
  for (let i = 0; i < 64 * 64; i += 1) {
    pixels.push(bgra[0], bgra[1], bgra[2], bgra[3]);
  }
  return pixels;
}

function kraTileStore(tiles: Array<{ x: number; y: number; bgra: [number, number, number, number] }>): Uint8Array {
  const out: number[] = [];
  const ascii = (text: string): void => {
    for (let i = 0; i < text.length; i += 1) {
      out.push(text.charCodeAt(i) & 0xff);
    }
  };
  ascii("VERSION 2\nTILEWIDTH 64\nTILEHEIGHT 64\nPIXELSIZE 4\n");
  ascii(`DATA ${tiles.length}\n`);
  for (const tile of tiles) {
    const payload = kraRawTile(tile.bgra);
    ascii(`${tile.x},${tile.y},LZF,${payload.length}\n`);
    out.push(...payload);
  }
  return new Uint8Array(out);
}

function buildKraBytes(
  width: number,
  height: number,
  layers: Array<{ name: string; filename: string; x?: number; y?: number; tiles: Array<{ x: number; y: number; bgra: [number, number, number, number] }> }>,
): Uint8Array {
  const maindoc =
    `<?xml version="1.0" encoding="UTF-8"?>\n<DOC><IMAGE width="${width}" height="${height}" ` +
    `colorspacename="RGBA" name="art" profile="sRGB" mime="application/x-kra">` +
    `<layers>${layers.map((layer) => `<layer opacity="255" x="${layer.x ?? 0}" y="${layer.y ?? 0}" colorspacename="RGBA" visible="1" nodetype="paintlayer" name="${layer.name}" filename="${layer.filename}" channelflags=""/>`).join("")}</layers>` +
    `<animation><framerate type="value" value="10"/><range from="0" type="timerange" to="1"/><currentTime type="value" value="0"/></animation>` +
    `</IMAGE></DOC>`;
  const files: Record<string, Uint8Array> = {
    mimetype: new TextEncoder().encode("application/x-krita"),
    "maindoc.xml": new TextEncoder().encode(maindoc),
  };
  for (const layer of layers) {
    files[`art/layers/${layer.filename}`] = kraTileStore(layer.tiles);
  }
  return zipSync(files);
}

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
  await expect(toast).toContainText("Imported art.kra (2 layers, 2 frames)");
  // File order is top-first; the engine stacks bottom-first.
  const state = await getLayers(page);
  expect(state.layers.map((layer) => layer.name)).toEqual(["Bottom", "Top"]);
  expect(state.layers.map((layer) => layer.id)).toEqual(["layer0", "layer1"]);
  // The 64x64 tile at layer offset (2,2) centers on the 64x64 canvas: offset (2,2).
  expect(state.layers[1]?.transform).toMatchObject({ x: 2, y: 2 });
  expect(await animationFrameCount(page)).toBe(2);
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
      __gnumarus?: { engine?: { setLayerTransform(id: string, t: unknown): boolean } };
    };
    root.__gnumarus?.engine?.setLayerTransform("layer0", { x: 100, y: 0 });
  });
  await cell.click({ button: "right" });
  await page.getByRole("button", { name: "Crop to canvas" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText(
    "Cannot crop: cell content is fully outside the canvas",
  );
});

async function loadRedProject(
  page: import("@playwright/test").Page,
  canvasSize: number,
  textureSize: number,
  offsetX: number,
  offsetY: number,
): Promise<void> {
  await page.evaluate(
    ([canvas, texture, dx, dy]: number[]) => {
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
      const red = new Uint8ClampedArray(texture * texture * 4);
      for (let i = 0; i < texture * texture; i += 1) {
        red[i * 4] = 255;
        red[i * 4 + 3] = 255;
      }
      root.__gnumarus?.engine?.loadProject(canvas, canvas, [
        {
          id: "layer0",
          name: "Layer 1",
          visible: true,
          opacity: 1,
          width: texture,
          height: texture,
          buffer: red,
          transform: {
            x: dx, y: dy, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1,
            skewX: 0, skewY: 0, rotationX: 0, rotationY: 0,
          },
          lockedChannels: { r: false, g: false, b: false, a: false },
        },
      ]);
    },
    [canvasSize, textureSize, offsetX, offsetY],
  );
}

test("layer menu Resize to canvas crops excess and pads to cover", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadRedProject(page, 64, 64, -32, -32);
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
  await page.getByRole("button", { name: "Resize to canvas" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Texture resized to 64 x 64");
  const resized = (await getLayers(page)).layers[0];
  expect(resized?.width).toBe(64);
  expect(resized?.height).toBe(64);
  expect(resized?.transform.x).toBeCloseTo(0, 9);
  expect(resized?.transform.y).toBeCloseTo(0, 9);
  // Old bottom-right quadrant moved to the top-left; padding is transparent.
  expect(await readPixel(page, 0, 0)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 31, 31)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  expect(await readPixel(page, 63, 63)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  // Rendering position is preserved.
  expect(await previewPixel(0, 0)).toEqual([255, 0, 0, 255]);
  // Undo restores the full offset texture; redo resizes again.
  await page.keyboard.press("Control+z");
  const undone = (await getLayers(page)).layers[0];
  expect(undone?.width).toBe(64);
  expect(undone?.transform.x).toBeCloseTo(-32, 9);
  expect(await readPixel(page, 0, 0)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  await page.keyboard.press("Control+y");
  const redone = (await getLayers(page)).layers[0];
  expect(redone?.width).toBe(64);
  expect(redone?.transform.x).toBeCloseTo(0, 9);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
});

test("cell menu Resize to canvas pads a small texture with transparency", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadRedProject(page, 64, 32, 0, 0);
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  const cell = matrix.locator('[data-testid="anim-cell"][data-matrix-layer="layer0"][data-matrix-frame="0"]');
  await cell.click({ button: "right" });
  await page.getByRole("button", { name: "Resize to canvas" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Texture resized to 64 x 64");
  const resized = (await getLayers(page)).layers[0];
  expect(resized?.width).toBe(64);
  expect(resized?.height).toBe(64);
  expect(resized?.transform.x).toBeCloseTo(0, 9);
  expect(resized?.transform.y).toBeCloseTo(0, 9);
  // Old pixels sit centered; the new border is zeroed in all channels.
  expect(await readPixel(page, 16, 16)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 47, 47)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 0, 0)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  expect(await readPixel(page, 63, 63)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  await page.keyboard.press("Control+z");
  expect((await getLayers(page)).layers[0]?.width).toBe(32);
});

test("Ctrl+Alt+Arrow expands the current cell texture by the configured step", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintCenter(page);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  await page.keyboard.press("Control+Alt+ArrowRight");
  await expect(page.locator("gnumarus-shell")).toContainText("Texture expanded to 80 x 64");
  expect((await getLayers(page)).layers[0]?.width).toBe(80);
  // Expanding right keeps existing coordinates: the painted pixel stays put.
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  await page.keyboard.press("Control+Alt+ArrowLeft");
  await expect(page.locator("gnumarus-shell")).toContainText("Texture expanded to 96 x 64");
  expect((await getLayers(page)).layers[0]?.width).toBe(96);
  // Expanding left shifts existing pixels right by the step.
  expect(await readPixel(page, 48, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  await page.keyboard.press("Control+z");
  expect((await getLayers(page)).layers[0]?.width).toBe(80);
  // The step setting changes the growth: 8px down from 64px height.
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await page.locator("gnumarus-shell input#expandStep").fill("8");
  const persisted = await page.evaluate(() => window.localStorage.getItem("gnumarus.settings.expand.v1"));
  expect(persisted).toContain("8");
  await page.getByRole("button", { name: "Close" }).click();
  await page.keyboard.press("Control+Alt+ArrowDown");
  await expect(page.locator("gnumarus-shell")).toContainText("Texture expanded to 80 x 72");
  expect((await getLayers(page)).layers[0]?.height).toBe(72);
});

test("fit texture dialog focuses OK so Enter confirms immediately", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintCenter(page);
  await page.locator('gnumarus-shell [data-layer-id="layer0"]').click({ button: "right" });
  await page.getByRole("button", { name: "Fit texture to size" }).click();
  const dialog = page.locator("gnumarus-shell dialog#fitTextureDialog");
  await expect(dialog).toBeVisible();
  const focusedId = await page.evaluate(() => {
    const root = document.querySelector("gnumarus-shell")?.shadowRoot ?? null;
    const active = root?.activeElement;
    return active instanceof HTMLElement ? active.id : null;
  });
  expect(focusedId).toBe("fitTextureOk");
  await page.keyboard.press("Enter");
  await expect(dialog).toBeHidden();
  await expect(page.locator('gnumarus-shell [data-layer-id="layer0"]')).toContainText("1×1");
});

test("fit alpha threshold default flows into the dialog and persists", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  const setting = page.locator("gnumarus-shell input#fitDefaultThreshold");
  await expect(setting).toHaveValue("0");
  await setting.fill("10");
  const persisted = await page.evaluate(() => window.localStorage.getItem("gnumarus.settings.fit.v1"));
  expect(persisted).toContain("10");
  await page.getByRole("button", { name: "Close" }).click();
  await page.locator('gnumarus-shell [data-layer-id="layer0"]').click({ button: "right" });
  await page.getByRole("button", { name: "Fit texture to size" }).click();
  await expect(page.locator("gnumarus-shell dialog#fitTextureDialog input#fitThreshold")).toHaveValue("10");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("button", { name: "Reset fit alpha threshold to default" }).click();
  await expect(page.locator("gnumarus-shell input#fitDefaultThreshold")).toHaveValue("0");
});

async function animationDialog(page: import("@playwright/test").Page): Promise<import("@playwright/test").Locator> {
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.getByRole("button", { name: "Manage animations", exact: true }).click();
  const dialog = page.locator("gnumarus-shell dialog#animationDialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

async function addAnimation(page: import("@playwright/test").Page, text: string): Promise<void> {
  const dialog = await animationDialog(page);
  await dialog.locator("input#animationInput").fill(text);
  await dialog.getByRole("button", { name: "Add", exact: true }).click();
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(dialog).toBeHidden();
}

async function addFrames(page: import("@playwright/test").Page, count: number): Promise<void> {
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  for (let i = 0; i < count; i += 1) {
    await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  }
}

async function selectAnimation(page: import("@playwright/test").Page, name: string): Promise<void> {
  await page.locator('gnumarus-shell [data-testid="animation-select"]').selectOption(name);
}

test("named animations reject bad definitions and list valid ones", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await addFrames(page, 2);
  const dialog = await animationDialog(page);
  await dialog.locator("input#animationInput").fill("walk,sideways,1");
  await dialog.getByRole("button", { name: "Add", exact: true }).click();
  await expect(dialog.locator('[role="alert"]')).toContainText("none, forward or ping-pong");
  await dialog.locator("input#animationInput").fill("walk,forward,1,2");
  await dialog.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Animation walk added (2 frames)");
  await expect(dialog.locator('[data-testid="animation-list"]')).toContainText('"walk": forward, 2 frames: 1,2');
  await expect(page.locator('gnumarus-shell [data-testid="animation-select"]')).toContainText("walk");
  await dialog.locator("input#animationInput").fill("walk,none,3");
  await dialog.getByRole("button", { name: "Add", exact: true }).click();
  await expect(dialog.locator('[role="alert"]')).toContainText("already exists");
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(dialog).toBeHidden();
});

test("animation delete asks for confirmation", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await addFrames(page, 1);
  await addAnimation(page, "walk,forward,1,2");
  const dialog = await animationDialog(page);
  const listItem = dialog.locator("li", { hasText: '"walk"' });
  await expect(listItem).toBeVisible();
  await listItem.getByRole("button", { name: 'Delete animation walk' }).click();
  const confirm = page.locator("gnumarus-shell dialog#animationDeleteDialog");
  await expect(confirm).toBeVisible();
  await expect(confirm).toContainText("Are you sure");
  await confirm.getByRole("button", { name: "No", exact: true }).click();
  await expect(confirm).toBeHidden();
  await expect(dialog.locator('[data-testid="animation-list"]')).toContainText('"walk"');
  await listItem.getByRole("button", { name: 'Delete animation walk' }).click();
  await expect(confirm).toBeVisible();
  await confirm.getByRole("button", { name: "Yes", exact: true }).click();
  await expect(confirm).toBeHidden();
  await expect(dialog.locator('[data-testid="animation-list"]')).not.toContainText('"walk"');
  await expect(page.locator("gnumarus-shell")).toContainText("Animation walk deleted");
});

test("selecting an animation highlights its frame columns", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await addFrames(page, 2);
  await addAnimation(page, "walk,forward,1,3");
  await page.locator('gnumarus-shell [data-testid="animation-select"]').selectOption("walk");
  await expect(page.locator("gnumarus-shell")).toContainText("Animation walk selected");
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await expect(matrix.locator('.anim-frame-header:has([data-frame="0"])')).toHaveClass(/in-animation/);
  await expect(matrix.locator('.anim-frame-header:has([data-frame="2"])')).toHaveClass(/in-animation/);
  await expect(matrix.locator('.anim-frame-header:has([data-frame="1"])')).not.toHaveClass(/in-animation/);
  await expect(
    matrix.locator('[data-testid="anim-cell"][data-matrix-frame="0"]').first(),
  ).toHaveClass(/in-animation/);
  await selectAnimation(page, "");
  await expect(matrix.locator('.anim-frame-header:has([data-frame="0"])')).not.toHaveClass(/in-animation/);
});

test("frame headers show how many animations include each frame", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  const titleOf = async (frame: number): Promise<string | null> =>
    matrix.locator(`[data-testid="anim-frame"][data-frame="${frame}"]`).getAttribute("title");
  await expect.poll(() => titleOf(0)).toContain("in no animations");
  await addFrames(page, 3);
  await addAnimation(page, "walk,forward,1,3");
  await addAnimation(page, "run,forward,2,3,4");
  await expect.poll(() => titleOf(0)).toBe("Frame 1: F1 — 0.25 s, in 1 animation");
  await expect.poll(() => titleOf(1)).toBe("Frame 2: F2 — 0.25 s, in 1 animation");
  await expect.poll(() => titleOf(2)).toBe("Frame 3: F3 — 0.25 s, in 2 animations");
  await expect.poll(() => titleOf(3)).toBe("Frame 4 (current): F4 — 0.25 s, in 1 animation");
});

test("forward playback follows the animation order and skips other frames", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await addFrames(page, 2);
  await addAnimation(page, "walk,forward,3,1");
  await selectAnimation(page, "walk");
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.getByRole("button", { name: "Play animation", exact: true }).click();
  // Custom order 3,1: from frame 1 the next shown frame is 3, then 1 again.
  await expect.poll(async () => getMatrixFrame(page), { timeout: 5000 }).toBe(2);
  await expect.poll(async () => getMatrixFrame(page), { timeout: 5000 }).toBe(0);
  await matrix.getByRole("button", { name: "Stop animation", exact: true }).click();
  await expect(matrix.getByRole("button", { name: "Play animation", exact: true })).toBeVisible();
});

test("a none animation stops after its last frame", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await addFrames(page, 2);
  await addAnimation(page, "once,none,1,2");
  await selectAnimation(page, "once");
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.getByRole("button", { name: "Play animation", exact: true }).click();
  await expect.poll(async () => getMatrixFrame(page), { timeout: 5000 }).toBe(1);
  await expect(matrix.getByRole("button", { name: "Play animation", exact: true })).toBeVisible();
  await page.waitForTimeout(400);
  expect(await getMatrixFrame(page)).toBe(1);
});

test("a ping-pong animation bounces without repeating endpoints", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await addFrames(page, 2);
  await addAnimation(page, "boing,ping-pong,1,2,3");
  await selectAnimation(page, "boing");
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.getByRole("button", { name: "Play animation", exact: true }).click();
  // Dense polls: frames flip every ~250ms, so the default poll backoff
  // (100/250/500/1000ms) aliases and can miss a frame window deterministically.
  await expect.poll(async () => getMatrixFrame(page), { timeout: 10000, intervals: [50] }).toBe(1);
  await expect.poll(async () => getMatrixFrame(page), { timeout: 10000, intervals: [50] }).toBe(2);
  // Forward would wrap to frame 1 here; ping-pong bounces back to frame 2.
  await expect.poll(async () => getMatrixFrame(page), { timeout: 10000, intervals: [50] }).toBe(1);
  await matrix.getByRole("button", { name: "Stop animation", exact: true }).click();
});

test("deleting the selected animation restores the full timeline", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await addFrames(page, 1);
  await addAnimation(page, "walk,forward,1,2");
  await selectAnimation(page, "walk");
  const dialog = await animationDialog(page);
  await dialog.getByRole("button", { name: "Delete animation walk", exact: true }).click();
  const confirm = page.locator("gnumarus-shell dialog#animationDeleteDialog");
  await expect(confirm).toBeVisible();
  await confirm.getByRole("button", { name: "Yes", exact: true }).click();
  await expect(confirm).toBeHidden();
  await expect(page.locator("gnumarus-shell")).toContainText("Animation walk deleted");
  await expect(page.locator('gnumarus-shell [data-testid="animation-select"]')).toHaveValue("");
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await expect(matrix.locator('.anim-frame-header:has([data-frame="0"])')).not.toHaveClass(/in-animation/);
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
});

test("animation duration overrides win over the project default", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await addFrames(page, 1);
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { setDefaultFrameDuration(d: number): boolean } } };
    root.__gnumarus?.engine?.setDefaultFrameDuration(2);
  });
  await addAnimation(page, "fast,forward,1:0.1,2:0.1");
  await selectAnimation(page, "fast");
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.getByRole("button", { name: "Play animation", exact: true }).click();
  // With the 2s project default this would time out; overrides tick at 0.1s.
  await expect.poll(async () => getMatrixFrame(page), { timeout: 1500 }).toBe(1);
  await matrix.getByRole("button", { name: "Stop animation", exact: true }).click();
});

async function stubSaveFilePicker(page: import("@playwright/test").Page): Promise<void> {
  await page.evaluate(() => {
    const root = window as unknown as {
      showSaveFilePicker?: (options?: unknown) => Promise<unknown>;
      __gnumarusExportTest?: { fileName: string | null; blob: Blob | null };
    };
    const state: { fileName: string | null; blob: Blob | null } = { fileName: null, blob: null };
    root.__gnumarusExportTest = state;
    root.showSaveFilePicker = async (options?: unknown) => {
      const name =
        (options as { suggestedName?: string } | undefined)?.suggestedName ?? "export.bin";
      return {
        createWritable: async () => ({
          write: async (data: string | Blob): Promise<void> => {
            state.fileName = name;
            state.blob = data instanceof Blob ? data : new Blob([data]);
          },
          close: async (): Promise<void> => {},
        }),
      };
    };
  });
}

async function exportedFile(page: import("@playwright/test").Page): Promise<{
  fileName: string | null;
  type: string;
  width: number;
  height: number;
  center: number[];
  corner: number[];
} | null> {
  return page.evaluate(async () => {
    const root = window as unknown as {
      __gnumarusExportTest?: { fileName: string | null; blob: Blob | null };
    };
    const state = root.__gnumarusExportTest;
    if (state?.blob == null) {
      return null;
    }
    const bitmap = await createImageBitmap(state.blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (context === null) {
      bitmap.close();
      return null;
    }
    context.drawImage(bitmap, 0, 0);
    const result = {
      fileName: state.fileName,
      type: state.blob.type,
      width: bitmap.width,
      height: bitmap.height,
      center: Array.from(context.getImageData(32, 32, 1, 1).data),
      corner: Array.from(context.getImageData(0, 0, 1, 1).data),
    };
    bitmap.close();
    return result;
  });
}

test("File > Export saves the current frame as PNG with exact pixels", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintCenter(page);
  await stubSaveFilePicker(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Export" }).click();
  const dialog = page.locator("gnumarus-shell dialog#exportDialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("input#exportFrame")).toHaveValue("1");
  const options = await dialog.locator("select#exportFormat option").allTextContents();
  expect(options).toEqual(expect.arrayContaining(["PNG", "JPEG", "WebP"]));
  await dialog.locator("#exportOk").click();
  await expect(page.locator("gnumarus-shell")).toContainText("Exported");
  const file = await exportedFile(page);
  expect(file?.fileName).toContain("frame-1.png");
  expect(file?.type).toBe("image/png");
  expect(file?.width).toBe(64);
  expect(file?.height).toBe(64);
  expect(file?.center).toEqual([0, 0, 0, 255]);
  expect(file?.corner).toEqual([0, 0, 0, 0]);
});

test("File > Export flattens JPEG without alpha", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintCenter(page);
  await stubSaveFilePicker(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Export" }).click();
  const dialog = page.locator("gnumarus-shell dialog#exportDialog");
  await expect(dialog).toBeVisible();
  await dialog.locator("select#exportFormat").selectOption("image/jpeg");
  await dialog.locator("#exportOk").click();
  await expect(page.locator("gnumarus-shell")).toContainText("Exported");
  const file = await exportedFile(page);
  expect(file?.type).toBe("image/jpeg");
  expect(file?.width).toBe(64);
  // JPEG has no alpha: every decoded pixel is opaque.
  expect(file?.corner?.[3]).toBe(255);
});

test("File > Export cancellation stays silent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell");
  await page.evaluate(() => {
    const root = window as unknown as { showSaveFilePicker?: () => Promise<never> };
    root.showSaveFilePicker = async () => {
      throw new DOMException("User cancelled", "AbortError");
    };
  });
  await page.getByRole("button", { name: "File" }).click();
  await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Export" }).click();
  const dialog = page.locator("gnumarus-shell dialog#exportDialog");
  await expect(dialog).toBeVisible();
  await dialog.locator("#exportOk").click();
  await expect(page.locator('gnumarus-shell [data-testid="toast"]')).toBeHidden();
});

test("File > Export lists only formats the browser truly encodes", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintCenter(page);
  await stubSaveFilePicker(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Export" }).click();
  const dialog = page.locator("gnumarus-shell dialog#exportDialog");
  await expect(dialog).toBeVisible();
  const values = await dialog.locator("select#exportFormat option").evaluateAll((options) =>
    options.map((option) => (option as HTMLOptionElement).value),
  );
  expect(values).toEqual(expect.arrayContaining(["image/png", "image/jpeg", "image/webp"]));
  // Chromium has no canvas encoder for these (it used to fall back to PNG bytes).
  for (const mime of ["image/heic", "image/heif"]) {
    expect(values).not.toContain(mime);
  }
  // JPEG XL is always offered through the bundled WASM codec.
  expect(values).toContain("image/jxl");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  // Every listed format must round-trip to a blob of the claimed type.
  let prev: string | null = null;
  for (const mime of values) {
    await page.getByRole("button", { name: "File" }).click();
    await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Export project", exact: true }).click();
    await expect(dialog).toBeVisible();
    await dialog.locator("select#exportFormat").selectOption(mime);
    await dialog.locator("#exportOk").click();
    await page.waitForFunction(
      (previous: string | null) => {
        const root = window as unknown as {
          __gnumarusExportTest?: { fileName: string | null; blob: Blob | null };
        };
        const state = root.__gnumarusExportTest;
        return state?.fileName !== null && state?.fileName !== undefined && state.fileName !== previous;
      },
      prev,
    );
    const saved = await page.evaluate(() => {
      const root = window as unknown as {
        __gnumarusExportTest?: { fileName: string | null; blob: Blob | null };
      };
      return {
        fileName: root.__gnumarusExportTest?.fileName ?? null,
        type: root.__gnumarusExportTest?.blob?.type ?? null,
      };
    });
    expect(saved.type).toBe(mime);
    prev = saved.fileName;
  }
});

test("File > Export JPEG quality changes the file size", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintCenter(page);
  await stubSaveFilePicker(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Export" }).click();
  const dialog = page.locator("gnumarus-shell dialog#exportDialog");
  await expect(dialog).toBeVisible();
  // The lossless default offers no quality control.
  await expect(dialog.locator("input#exportQuality")).toHaveCount(0);
  await dialog.locator("select#exportFormat").selectOption("image/jpeg");
  await expect(dialog.locator("input#exportQuality")).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();

  async function exportJpegSize(quality: string): Promise<number> {
    await page.getByRole("button", { name: "File" }).click();
    await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Export project", exact: true }).click();
    await expect(dialog).toBeVisible();
    await dialog.locator("input#exportQuality").fill(quality);
    await page.evaluate(() => {
      const root = window as unknown as { __gnumarusExportTest?: { blob: Blob | null } };
      if (root.__gnumarusExportTest !== undefined) {
        root.__gnumarusExportTest.blob = null;
      }
    });
    await dialog.locator("#exportOk").click();
    await page.waitForFunction(() => {
      const root = window as unknown as { __gnumarusExportTest?: { blob: Blob | null } };
      return root.__gnumarusExportTest?.blob instanceof Blob;
    });
    return page.evaluate(() => {
      const root = window as unknown as { __gnumarusExportTest?: { blob: Blob | null } };
      return root.__gnumarusExportTest?.blob?.size ?? -1;
    });
  }

  const small = await exportJpegSize("10");
  const big = await exportJpegSize("100");
  expect(small).toBeGreaterThan(0);
  expect(big).toBeGreaterThan(small);
});

async function stubProjectDirectory(
  page: import("@playwright/test").Page,
  dirName = "MockProject",
): Promise<{
  writtenBlobs: () => Promise<Record<string, number[]>>;
  writtenProject: () => Promise<string | null>;
  seedFile: (path: string, bytes: number[]) => Promise<void>;
}> {
  await page.evaluate((dir: string) => {
    const root = window as unknown as {
      showDirectoryPicker?: () => Promise<unknown>;
      __gnumarusProjectTest?: { files: Record<string, Blob> };
    };
    const state: { files: Record<string, Blob> } = { files: {} };
    root.__gnumarusProjectTest = state;
    root.showDirectoryPicker = async () => ({
      name: dir,
      removeEntry: async (name: string): Promise<void> => {
        if (state.files[name] === undefined) {
          throw new DOMException("File not found", "NotFoundError");
        }
        delete state.files[name];
      },
      getFileHandle: async (name: string, options?: { create?: boolean }) => {
        if (state.files[name] === undefined && options?.create !== true) {
          throw new DOMException("File not found", "NotFoundError");
        }
        return {
          getFile: async (): Promise<Blob> => {
            const found = state.files[name];
            if (found === undefined) {
              throw new DOMException("File not found", "NotFoundError");
            }
            return found;
          },
          createWritable: async () => ({
            write: async (data: string | Blob): Promise<void> => {
              state.files[name] = data instanceof Blob ? data : new Blob([data]);
            },
            close: async (): Promise<void> => {},
          }),
        };
      },
      getDirectoryHandle: async (name: string) => ({
        name,
        removeEntry: async (child: string): Promise<void> => {
          if (state.files[`${name}/${child}`] === undefined) {
            throw new DOMException("File not found", "NotFoundError");
          }
          delete state.files[`${name}/${child}`];
        },
        getFileHandle: async (child: string, options?: { create?: boolean }) => {
          if (state.files[`${name}/${child}`] === undefined && options?.create !== true) {
            throw new DOMException("File not found", "NotFoundError");
          }
          return {
            getFile: async (): Promise<Blob> => {
              const found = state.files[`${name}/${child}`];
              if (found === undefined) {
                throw new DOMException("File not found", "NotFoundError");
              }
              return found;
            },
            createWritable: async () => ({
              write: async (data: string | Blob): Promise<void> => {
                state.files[`${name}/${child}`] = data instanceof Blob ? data : new Blob([data]);
              },
              close: async (): Promise<void> => {},
            }),
          };
        },
        getDirectoryHandle: async (): Promise<never> => {
          throw new Error("no nested directories in project test");
        },
      }),
    });
  }, dirName);
  return {
    writtenBlobs: (): Promise<Record<string, number[]>> =>
      page.evaluate(async () => {
        const root = window as unknown as {
          __gnumarusProjectTest?: { files: Record<string, Blob> };
        };
        const out: Record<string, number[]> = {};
        for (const [name, blob] of Object.entries(root.__gnumarusProjectTest?.files ?? {})) {
          out[name] = Array.from(new Uint8Array(await blob.arrayBuffer()));
        }
        return out;
      }),
    writtenProject: (): Promise<string | null> =>
      page
        .evaluate(async () => {
          const root = window as unknown as {
            __gnumarusProjectTest?: { files: Record<string, Blob> };
          };
          const files = root.__gnumarusProjectTest?.files ?? {};
          const archived = files["project.gpa"];
          if (archived !== undefined) {
            return JSON.stringify(Array.from(new Uint8Array(await archived.arrayBuffer())));
          }
          const plain = files["project.json"];
          return plain === undefined ? null : plain.text();
        })
        .then((raw) => {
          if (raw === null) {
            return null;
          }
          if (raw.startsWith("[")) {
            const entries = unzipSync(new Uint8Array(JSON.parse(raw) as number[]));
            const inner = entries["project.json"];
            if (inner === undefined) {
              throw new Error("project.gpa has no project.json inside");
            }
            return new TextDecoder().decode(inner);
          }
          return raw;
        }),
    seedFile: (path: string, bytes: number[]): Promise<void> =>
      page.evaluate(
        ({ name, data }: { name: string; data: number[] }) => {
          const root = window as unknown as {
            __gnumarusProjectTest?: { files: Record<string, Blob> };
          };
          if (root.__gnumarusProjectTest !== undefined) {
            root.__gnumarusProjectTest.files[name] = new Blob([new Uint8Array(data)]);
          }
        },
        { name: path, data: bytes },
      ),
  };
}

test("project textures save as lossless JXL named tN and reopen", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { setImportCleanup(mode: string): void } } };
    root.__gnumarus?.shell?.setImportCleanup("none");
  });
  await setPencil(page, "#ff0000");
  await paintCenter(page);
  const project = await stubProjectDirectory(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  const meta = await project.writtenProject();
  expect(meta).toContain('"textures/t1.jxl"');
  expect(meta).toContain('"name": "t1"');
  const files = await project.writtenBlobs();
  expect(Object.keys(files).sort()).toEqual(["project.gpa", "textures/t1.jxl"]);
  expect(files["textures/t1.jxl"]?.slice(0, 2)).toEqual([0xff, 0x0a]);
  const decoded = await decodeJxlInPage(page, files["textures/t1.jxl"] ?? []);
  expect(decoded?.width).toBe(64);
  expect(decoded?.height).toBe(64);
  expect(decoded?.center).toEqual([255, 0, 0, 255]);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Open Project" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Opened MockProject");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("project texture lossy setting is honored and persists", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Project texture format");
  const dialog = page.locator("gnumarus-shell dialog#settingsDialog");
  await expect(dialog.locator("select#storageFormat")).toHaveValue("jxl");
  await dialog.locator("select#storageJxlMode").selectOption("lossy");
  await dialog.locator("input#storageQuality").fill("10");
  await expect(page.locator("gnumarus-shell")).toContainText("Project textures save as lossy JXL (quality 10)");
  const persisted = await page.evaluate(() => window.localStorage.getItem("gnumarus.settings.storage.v1"));
  expect(persisted).toContain('"lossless": false');
  expect(persisted).toContain('"quality": 10');
  await dialog.getByRole("button", { name: "Close" }).click();
  await setPencil(page, "#00ff00");
  await paintCenter(page);
  const project = await stubProjectDirectory(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  const files = await project.writtenBlobs();
  expect(files["textures/t1.jxl"]?.slice(0, 2)).toEqual([0xff, 0x0a]);
  const decoded = await decodeJxlInPage(page, files["textures/t1.jxl"] ?? []);
  expect(decoded?.width).toBe(64);
  expect(decoded?.height).toBe(64);
  const center = decoded?.center ?? [0, 0, 0, 0];
  expect(center[3]).toBeGreaterThan(0);
  expect(center[1]).toBeGreaterThan(center[0]);
  expect(center[1]).toBeGreaterThan(center[2]);
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await page.locator('gnumarus-shell [aria-label="Reset project texture format to default"]').click();
  await expect(page.locator("gnumarus-shell select#storageFormat")).toHaveValue("jxl");
});

async function readJpegSamples(
  page: import("@playwright/test").Page,
  bytes: number[],
): Promise<{ center: number[]; corner: number[] } | null> {
  return page.evaluate(async (data: number[]) => {
    const blob = new Blob([new Uint8Array(data)], { type: "image/jpeg" });
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (context === null) {
      bitmap.close();
      return null;
    }
    context.drawImage(bitmap, 0, 0);
    const result = {
      center: Array.from(context.getImageData(32, 32, 1, 1).data),
      corner: Array.from(context.getImageData(0, 0, 1, 1).data),
    };
    bitmap.close();
    return result;
  }, bytes);
}

test("project textures save as PNG with a compression level and reopen", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { setImportCleanup(mode: string): void } } };
    root.__gnumarus?.shell?.setImportCleanup("none");
  });
  await setPencil(page, "#ff0000");
  await paintCenter(page);
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  const dialog = page.locator("gnumarus-shell dialog#settingsDialog");
  await dialog.locator("select#storageFormat").selectOption("png");
  await expect(dialog.locator("input#storagePngLevel")).toHaveValue("9");
  await expect(dialog.locator("input#storageJpegQuality")).toHaveCount(0);
  await dialog.locator("input#storagePngLevel").fill("1");
  await expect(page.locator("gnumarus-shell")).toContainText("Project textures save as PNG (compression 1)");
  const persisted = await page.evaluate(() => window.localStorage.getItem("gnumarus.settings.storage.v1"));
  expect(persisted).toContain('"format": "png"');
  expect(persisted).toContain('"pngLevel": 1');
  await dialog.getByRole("button", { name: "Close" }).click();
  const project = await stubProjectDirectory(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  const meta = await project.writtenProject();
  expect(meta).toContain('"textures/t1.png"');
  const files = await project.writtenBlobs();
  expect(Object.keys(files).sort()).toEqual(["project.gpa", "textures/t1.png"]);
  expect(files["textures/t1.png"]?.slice(0, 4)).toEqual([137, 80, 78, 71]);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Open Project" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Opened MockProject");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 0, 0)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
});

test("project textures save as JPEG with a grayscale alpha companion", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#ff0000");
  // Bucket-fill the whole transparent canvas: solid blocks survive JPEG best.
  await page.getByRole("button", { name: "Bucket fill" }).click();
  await paintCenter(page);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  const dialog = page.locator("gnumarus-shell dialog#settingsDialog");
  await dialog.locator("select#storageFormat").selectOption("jpg");
  await expect(dialog.locator("input#storageJpegQuality")).toHaveValue("95");
  await expect(dialog.locator("input#storagePngLevel")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Close" }).click();
  const project = await stubProjectDirectory(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  const meta = await project.writtenProject();
  expect(meta).toContain('"textures/t1.jpg"');
  expect(meta).not.toContain(".alpha.jpg");
  const files = await project.writtenBlobs();
  expect(Object.keys(files).sort()).toEqual(["project.gpa", "textures/t1.alpha.jpg", "textures/t1.jpg"]);
  expect(files["textures/t1.jpg"]?.slice(0, 2)).toEqual([255, 216]);
  const color = await readJpegSamples(page, files["textures/t1.jpg"] ?? []);
  expect(color?.center[0] ?? 0).toBeGreaterThan(200);
  expect(color?.center[1] ?? 255).toBeLessThan(80);
  const alpha = await readJpegSamples(page, files["textures/t1.alpha.jpg"] ?? []);
  expect(alpha?.center[0] ?? 0).toBeGreaterThan(200);
  expect(alpha?.corner[0] ?? 0).toBeGreaterThan(200);
  // Paint over, then reload: the JPEG pair restores approximately.
  await setPencil(page, "#00ff00");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  await paintCenter(page);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 255, b: 0, a: 255 });
  await runPaletteAction(page, "reload all");
  await expect(page.locator("gnumarus-shell")).toContainText("Reloaded 1 texture");
  const restored = await readPixel(page, 32, 32);
  expect(restored?.r ?? 0).toBeGreaterThan(200);
  expect(restored?.g ?? 255).toBeLessThan(80);
  expect(restored?.b ?? 255).toBeLessThan(80);
  expect(restored?.a ?? 0).toBeGreaterThan(200);
});

test("project meta saves zipped by default and reopens", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { setImportCleanup(mode: string): void } } };
    root.__gnumarus?.shell?.setImportCleanup("none");
  });
  await setPencil(page, "#ff0000");
  await paintCenter(page);
  const project = await stubProjectDirectory(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  const files = await project.writtenBlobs();
  expect(Object.keys(files).sort()).toEqual(["project.gpa", "textures/t1.jxl"]);
  expect(files["project.gpa"]?.slice(0, 2)).toEqual([0x50, 0x4b]);
  const meta = await project.writtenProject();
  expect(meta).toContain('"textures/t1.jxl"');
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Open Project" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Opened MockProject");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("project meta plain mode writes project.json and removes project.gpa", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { setImportCleanup(mode: string): void } } };
    root.__gnumarus?.shell?.setImportCleanup("none");
  });
  await setPencil(page, "#ff0000");
  await paintCenter(page);
  const project = await stubProjectDirectory(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  expect(Object.keys(await project.writtenBlobs()).sort()).toEqual(["project.gpa", "textures/t1.jxl"]);
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  const dialog = page.locator("gnumarus-shell dialog#settingsDialog");
  await expect(dialog.locator("select#storageProjectFile")).toHaveValue("gpa");
  await dialog.locator("select#storageProjectFile").selectOption("json");
  await dialog.getByRole("button", { name: "Close" }).click();
  const persisted = await page.evaluate(() => window.localStorage.getItem("gnumarus.settings.storage.v1"));
  expect(persisted).toContain('"projectFile": "json"');
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  expect(Object.keys(await project.writtenBlobs()).sort()).toEqual(["project.json", "textures/t1.jxl"]);
  expect(await project.writtenProject()).toContain('"textures/t1.jxl"');
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await page.locator("gnumarus-shell dialog#settingsDialog select#storageProjectFile").selectOption("gpa");
  await page.locator("gnumarus-shell dialog#settingsDialog").getByRole("button", { name: "Close" }).click();
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  expect(Object.keys(await project.writtenBlobs()).sort()).toEqual(["project.gpa", "textures/t1.jxl"]);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Open Project" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Opened MockProject");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("changing texture storage removes stale texture files", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { setImportCleanup(mode: string): void } } };
    root.__gnumarus?.shell?.setImportCleanup("none");
  });
  await setPencil(page, "#ff0000");
  await paintCenter(page);
  const project = await stubProjectDirectory(page);
  const save = async (): Promise<void> => {
    await page.getByRole("button", { name: "File" }).click();
    await page.getByRole("button", { name: "Save Project", exact: true }).click();
    await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  };
  const setFormat = async (format: string): Promise<void> => {
    await page.getByRole("button", { name: "Edit" }).click();
    await page.getByRole("button", { name: "Settings" }).click();
    await page.locator("gnumarus-shell dialog#settingsDialog select#storageFormat").selectOption(format);
    await page.locator("gnumarus-shell dialog#settingsDialog").getByRole("button", { name: "Close" }).click();
  };
  await save();
  expect(Object.keys(await project.writtenBlobs()).sort()).toEqual(["project.gpa", "textures/t1.jxl"]);
  await setFormat("png");
  await save();
  expect(Object.keys(await project.writtenBlobs()).sort()).toEqual(["project.gpa", "textures/t1.png"]);
  await setFormat("jpg");
  await save();
  expect(Object.keys(await project.writtenBlobs()).sort()).toEqual([
    "project.gpa",
    "textures/t1.alpha.jpg",
    "textures/t1.jpg",
  ]);
  await setFormat("jxl");
  await save();
  expect(Object.keys(await project.writtenBlobs()).sort()).toEqual(["project.gpa", "textures/t1.jxl"]);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Open Project" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Opened MockProject");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("corrupt project.gpa fails to open with a clear error", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell");
  const project = await stubProjectDirectory(page);
  await project.seedFile("project.gpa", [1, 2, 3, 4]);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Open Project" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Open failed: project.gpa is not a valid zip archive");
});

test("File > Export saves the current frame as lossless JXL", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintCenter(page);
  await stubSaveFilePicker(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Export" }).click();
  const dialog = page.locator("gnumarus-shell dialog#exportDialog");
  await expect(dialog).toBeVisible();
  await dialog.locator("select#exportFormat").selectOption("image/jxl");
  await expect(dialog.locator('input#exportJxlLossless')).toBeChecked();
  await dialog.locator("#exportOk").click();
  await expect(page.locator("gnumarus-shell")).toContainText("Exported");
  const file = await exportedJxlBytes(page);
  expect(file?.fileName).toContain("frame-1.jxl");
  expect(file?.type).toBe("image/jxl");
  expect(file?.bytes.slice(0, 2)).toEqual([0xff, 0x0a]);
  const decoded = await decodeJxlInPage(page, file?.bytes ?? []);
  expect(decoded?.width).toBe(64);
  expect(decoded?.height).toBe(64);
  expect(decoded?.frames).toBe(1);
  expect(decoded?.center).toEqual([0, 0, 0, 255]);
});

test("File > Export saves lossy JXL when lossless is off", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintCenter(page);
  await stubSaveFilePicker(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Export" }).click();
  const dialog = page.locator("gnumarus-shell dialog#exportDialog");
  await expect(dialog).toBeVisible();
  await dialog.locator("select#exportFormat").selectOption("image/jxl");
  await dialog.locator("#exportJxlLossless").uncheck();
  await dialog.locator("input#exportQuality").fill("50");
  await dialog.locator("#exportOk").click();
  await expect(page.locator("gnumarus-shell")).toContainText("Exported");
  const file = await exportedJxlBytes(page);
  expect(file?.type).toBe("image/jxl");
  expect(file?.bytes.slice(0, 2)).toEqual([0xff, 0x0a]);
  const decoded = await decodeJxlInPage(page, file?.bytes ?? []);
  expect(decoded?.width).toBe(64);
  expect(decoded?.center?.[3]).toBe(255);
});

test("File > Export saves all frames as a single-file JXL animation", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await addFrames(page, 1);
  await paintCenter(page);
  await stubSaveFilePicker(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Export" }).click();
  const dialog = page.locator("gnumarus-shell dialog#exportDialog");
  await expect(dialog).toBeVisible();
  await dialog.locator("select#exportAnimatedFormat").selectOption("jxl");
  await dialog.locator("#exportAnimatedOk").click();
  await expect(page.locator("gnumarus-shell")).toContainText("Exported");
  const file = await exportedJxlBytes(page);
  expect(file?.fileName).toContain("frames.jxl");
  expect(file?.type).toBe("image/jxl");
  expect(file?.bytes.slice(0, 2)).toEqual([0xff, 0x0a]);
  const decoded = await decodeJxlInPage(page, file?.bytes ?? []);
  expect(decoded?.frames).toBe(2);
  expect(decoded?.width).toBe(64);
});

test("project textures save as lossless WebP and reopen", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#ff0000");
  // Bucket-fill the whole transparent canvas so the default crop+fit import
  // cleanup keeps the 64x64 texture as is after reopening.
  await page.getByRole("button", { name: "Bucket fill" }).click();
  await paintCenter(page);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  const dialog = page.locator("gnumarus-shell dialog#settingsDialog");
  await dialog.locator("select#storageFormat").selectOption("webp");
  await expect(dialog.locator("select#storageJxlMode")).toHaveValue("lossless");
  await expect(page.locator("gnumarus-shell")).toContainText("Project textures save as lossless WebP");
  const persisted = await page.evaluate(() => window.localStorage.getItem("gnumarus.settings.storage.v1"));
  expect(persisted).toContain('"format": "webp"');
  await dialog.getByRole("button", { name: "Close" }).click();
  const project = await stubProjectDirectory(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  const meta = await project.writtenProject();
  expect(meta).toContain('"textures/t1.webp"');
  const files = await project.writtenBlobs();
  expect(Object.keys(files).sort()).toEqual(["project.gpa", "textures/t1.webp"]);
  expect(files["textures/t1.webp"]?.slice(0, 4)).toEqual([0x52, 0x49, 0x46, 0x46]);
  expect(files["textures/t1.webp"]?.slice(8, 12)).toEqual([0x57, 0x45, 0x42, 0x50]);
  const decoded = await decodeWebpInPage(page, files["textures/t1.webp"] ?? []);
  expect(decoded?.width).toBe(64);
  expect(decoded?.height).toBe(64);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Open Project" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Opened MockProject");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 0, 0)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("File > Export saves the current frame as lossless WebP", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintCenter(page);
  await stubSaveFilePicker(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Export" }).click();
  const dialog = page.locator("gnumarus-shell dialog#exportDialog");
  await expect(dialog).toBeVisible();
  await dialog.locator("select#exportFormat").selectOption("image/webp");
  await expect(dialog.locator('input#exportWebpLossless')).toBeChecked();
  await dialog.locator("#exportOk").click();
  await expect(page.locator("gnumarus-shell")).toContainText("Exported");
  const file = await exportedJxlBytes(page);
  expect(file?.fileName).toContain("frame-1.webp");
  expect(file?.type).toBe("image/webp");
  expect(file?.bytes.slice(0, 4)).toEqual([0x52, 0x49, 0x46, 0x46]);
  expect(file?.bytes.slice(8, 12)).toEqual([0x57, 0x45, 0x42, 0x50]);
  const decoded = await decodeWebpInPage(page, file?.bytes ?? []);
  expect(decoded?.width).toBe(64);
  expect(decoded?.height).toBe(64);
  expect(decoded?.frames).toBe(1);
  expect(decoded?.center).toEqual([0, 0, 0, 255]);
});

test("File > Export saves lossy WebP when lossless is off", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintCenter(page);
  await stubSaveFilePicker(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Export" }).click();
  const dialog = page.locator("gnumarus-shell dialog#exportDialog");
  await expect(dialog).toBeVisible();
  await dialog.locator("select#exportFormat").selectOption("image/webp");
  await dialog.locator("#exportWebpLossless").uncheck();
  await dialog.locator("input#exportQuality").fill("50");
  await dialog.locator("#exportOk").click();
  await expect(page.locator("gnumarus-shell")).toContainText("Exported");
  const file = await exportedJxlBytes(page);
  expect(file?.type).toBe("image/webp");
  expect(file?.bytes.slice(0, 4)).toEqual([0x52, 0x49, 0x46, 0x46]);
  const decoded = await decodeWebpInPage(page, file?.bytes ?? []);
  expect(decoded?.width).toBe(64);
  expect(decoded?.center?.[3]).toBe(255);
});

test("File > Export saves all frames as a single-file WebP animation", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await addFrames(page, 1);
  await paintCenter(page);
  await stubSaveFilePicker(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Export" }).click();
  const dialog = page.locator("gnumarus-shell dialog#exportDialog");
  await expect(dialog).toBeVisible();
  await dialog.locator("select#exportAnimatedFormat").selectOption("webp");
  await dialog.locator("#exportAnimatedOk").click();
  await expect(page.locator("gnumarus-shell")).toContainText("Exported");
  const file = await exportedJxlBytes(page);
  expect(file?.fileName).toContain("frames.webp");
  expect(file?.type).toBe("image/webp");
  expect(file?.bytes.slice(0, 4)).toEqual([0x52, 0x49, 0x46, 0x46]);
  const decoded = await decodeWebpInPage(page, file?.bytes ?? []);
  expect(decoded?.frames).toBe(2);
  expect(decoded?.width).toBe(64);
});

test("File > Export saves an animation as a WebP spritesheet", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await addFrames(page, 1);
  await addAnimation(page, "go,none,1,2");
  await page.locator('gnumarus-shell [data-testid="anim-frame"][data-frame="0"]').click();
  await paintCenter(page);
  await stubSaveFilePicker(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Export" }).click();
  const dialog = page.locator("gnumarus-shell dialog#exportDialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("checkbox", { name: "go" }).check();
  await expect(dialog.locator("select#exportSheetLayout")).toHaveValue("line");
  await dialog.locator("select#exportSheetFormat").selectOption("image/webp");
  await dialog.locator("#exportSheetOk").click();
  await expect(page.locator("gnumarus-shell")).toContainText("Exported");
  const file = await exportedJxlBytes(page);
  expect(file?.fileName).toContain("sheet.webp");
  expect(file?.type).toBe("image/webp");
  const decoded = await decodeWebpInPage(page, file?.bytes ?? []);
  expect(decoded?.width).toBe(128);
  expect(decoded?.height).toBe(64);
  const at = (x: number, y: number): number => (y * 128 + x) * 4;
  expect(decoded?.pixels.slice(at(32, 32), at(32, 32) + 4)).toEqual([0, 0, 0, 255]);
  expect(decoded?.pixels.slice(at(96, 32), at(96, 32) + 4)).toEqual([0, 0, 0, 0]);
});

test("File > Export saves an animation as a JXL spritesheet", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await addFrames(page, 1);
  await addAnimation(page, "go,none,1,2");
  await page.locator('gnumarus-shell [data-testid="anim-frame"][data-frame="0"]').click();
  await paintCenter(page);
  await stubSaveFilePicker(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Export" }).click();
  const dialog = page.locator("gnumarus-shell dialog#exportDialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("checkbox", { name: "go" }).check();
  await expect(dialog.locator("select#exportSheetLayout")).toHaveValue("line");
  await dialog.locator("select#exportSheetFormat").selectOption("image/jxl");
  await dialog.locator("#exportSheetOk").click();
  await expect(page.locator("gnumarus-shell")).toContainText("Exported");
  const file = await exportedJxlBytes(page);
  expect(file?.fileName).toContain("sheet.jxl");
  expect(file?.type).toBe("image/jxl");
  const decoded = await decodeJxlInPage(page, file?.bytes ?? []);
  expect(decoded?.width).toBe(128);
  expect(decoded?.height).toBe(64);
  const at = (x: number, y: number): number => (y * 128 + x) * 4;
  expect(decoded?.pixels.slice(at(32, 32), at(32, 32) + 4)).toEqual([0, 0, 0, 255]);
  expect(decoded?.pixels.slice(at(96, 32), at(96, 32) + 4)).toEqual([0, 0, 0, 0]);
});

async function stubExportDirectory(page: import("@playwright/test").Page): Promise<void> {
  await page.evaluate(() => {
    const root = window as unknown as {
      showDirectoryPicker?: () => Promise<unknown>;
      __gnumarusExportDirTest?: { dirName: string | null; files: Record<string, Blob> };
    };
    const state: { dirName: string | null; files: Record<string, Blob> } = {
      dirName: "exports",
      files: {},
    };
    root.__gnumarusExportDirTest = state;
    root.showDirectoryPicker = async () => ({
      name: "exports",
      getFileHandle: async (name: string) => ({
        createWritable: async () => ({
          write: async (data: string | Blob): Promise<void> => {
            state.files[name] = data instanceof Blob ? data : new Blob([data]);
          },
          close: async (): Promise<void> => {},
        }),
      }),
      getDirectoryHandle: async () => {
        throw new Error("no subdirectories in export test");
      },
    });
  });
}

async function exportedGifBytes(page: import("@playwright/test").Page): Promise<{  fileName: string | null;
  type: string;
  header: string;
  width: number;
  height: number;
  hasNetscape: boolean;
  descriptors: number;
} | null> {
  return page.evaluate(async () => {
    const root = window as unknown as {
      __gnumarusExportTest?: { fileName: string | null; blob: Blob | null };
    };
    const state = root.__gnumarusExportTest;
    if (state?.blob == null) {
      return null;
    }
    const buffer = await state.blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);
    let ascii = "";
    for (let i = 0; i < 6; i += 1) {
      ascii += String.fromCharCode(bytes[i] ?? 0);
    }
    const tag = "NETSCAPE2.0";
    let hasNetscape = false;
    for (let i = 0; i + tag.length <= bytes.length; i += 1) {
      let match = true;
      for (let j = 0; j < tag.length; j += 1) {
        if (bytes[i + j] !== tag.charCodeAt(j)) {
          match = false;
          break;
        }
      }
      if (match) {
        hasNetscape = true;
        break;
      }
    }
    // Count image descriptors, skipping color tables and sub-blocks.
    let descriptors = 0;
    let i = 13;
    const globalPacked = bytes[10] ?? 0;
    if ((globalPacked & 0x80) !== 0) {
      i += 3 * 2 ** ((globalPacked & 0x07) + 1);
    }
    while (i < bytes.length) {
      const marker = bytes[i];
      if (marker === 0x3b) {
        break;
      }
      if (marker === 0x21) {
        if (bytes[i + 1] === 0xf9) {
          i += 8;
          continue;
        }
        i += 2;
        for (;;) {
          const size = bytes[i] ?? 0;
          i += 1;
          if (size === 0) {
            break;
          }
          i += size;
        }
        continue;
      }
      if (marker === 0x2c) {
        descriptors += 1;
        const packed = bytes[i + 9] ?? 0;
        i += 10;
        if ((packed & 0x80) !== 0) {
          i += 3 * 2 ** ((packed & 0x07) + 1);
        }
        i += 1;
        for (;;) {
          const size = bytes[i] ?? 0;
          i += 1;
          if (size === 0) {
            break;
          }
          i += size;
        }
        continue;
      }
      break;
    }
    return {
      fileName: state.fileName,
      type: state.blob.type,
      header: ascii,
      width: view.getUint16(6, true),
      height: view.getUint16(8, true),
      hasNetscape,
      descriptors,
    };
  });
}

async function exportedJxlBytes(page: import("@playwright/test").Page): Promise<{
  fileName: string | null;
  type: string;
  bytes: number[];
} | null> {
  return page.evaluate(async () => {
    const root = window as unknown as {
      __gnumarusExportTest?: { fileName: string | null; blob: Blob | null };
    };
    const state = root.__gnumarusExportTest;
    if (state?.blob == null) {
      return null;
    }
    const buffer = await state.blob.arrayBuffer();
    return { fileName: state.fileName, type: state.blob.type, bytes: Array.from(new Uint8Array(buffer)) };
  });
}

interface JxlDecodedFrame {
  width: number;
  height: number;
  center: number[];
  pixels: number[];
  frames: number;
}

interface WebpDecodedFrame {
  width: number;
  height: number;
  center: number[];
  pixels: number[];
  frames: number;
}

async function decodeWebpInPage(
  page: import("@playwright/test").Page,
  bytes: number[],
): Promise<WebpDecodedFrame | null> {
  return page.evaluate(async (data: number[]) => {
    const shimUrl = "/src/codec/webp/webp_shim.js";
    const ns: unknown = await import(/* @vite-ignore */ shimUrl);
    const factory = (ns as { default: (overrides?: { wasmBinary?: Uint8Array }) => Promise<unknown> }).default;
    const wasm = new Uint8Array(await (await fetch("/src/codec/webp/webp_shim.wasm")).arrayBuffer());
    const codec = (await factory({ wasmBinary: wasm })) as {
      webp_decode_js(input: Uint8Array): { ok: boolean; width?: number; height?: number; buffer?: Uint8Array };
      webp_frame_count_js(input: Uint8Array): { ok: boolean; count?: number };
    };
    const input = new Uint8Array(data);
    const decoded = codec.webp_decode_js(input);
    if (!decoded.ok || decoded.width === undefined || decoded.height === undefined || !(decoded.buffer instanceof Uint8Array)) {
      return null;
    }
    const counted = codec.webp_frame_count_js(input);
    const at = (decoded.height >> 1) * decoded.width + (decoded.width >> 1);
    return {
      width: decoded.width,
      height: decoded.height,
      center: Array.from(decoded.buffer.subarray(at * 4, at * 4 + 4)),
      pixels: Array.from(decoded.buffer),
      frames: counted.ok === true && typeof counted.count === "number" ? counted.count : -1,
    };
  }, bytes);
}

async function decodeJxlInPage(
  page: import("@playwright/test").Page,
  bytes: number[],
): Promise<JxlDecodedFrame | null> {
  return page.evaluate(async (data: number[]) => {
    const shimUrl = "/src/codec/jxl/jxl_shim.js";
    const ns: unknown = await import(/* @vite-ignore */ shimUrl);
    const factory = (ns as { default: (overrides?: { wasmBinary?: Uint8Array }) => Promise<unknown> }).default;
    const wasm = new Uint8Array(await (await fetch("/src/codec/jxl/jxl_shim.wasm")).arrayBuffer());
    const codec = (await factory({ wasmBinary: wasm })) as {
      jxl_decode_js(input: Uint8Array): { ok: boolean; width?: number; height?: number; buffer?: Uint8Array };
      jxl_frame_count_js(input: Uint8Array): { ok: boolean; count?: number };
    };
    const input = new Uint8Array(data);
    const decoded = codec.jxl_decode_js(input);
    if (!decoded.ok || decoded.width === undefined || decoded.height === undefined || !(decoded.buffer instanceof Uint8Array)) {
      return null;
    }
    const counted = codec.jxl_frame_count_js(input);
    const at = (decoded.height >> 1) * decoded.width + (decoded.width >> 1);
    return {
      width: decoded.width,
      height: decoded.height,
      center: Array.from(decoded.buffer.subarray(at * 4, at * 4 + 4)),
      pixels: Array.from(decoded.buffer),
      frames: counted.ok === true && typeof counted.count === "number" ? counted.count : -1,
    };
  }, bytes);
}

async function exportedSequence(page: import("@playwright/test").Page): Promise<{
  names: string[];
  dirName: string | null;
  firstCenter: number[];
  secondCenter: number[];
} | null> {
  return page.evaluate(async () => {
    const root = window as unknown as {
      __gnumarusExportDirTest?: { dirName: string | null; files: Record<string, Blob> };
    };
    const state = root.__gnumarusExportDirTest;
    if (state === undefined) {
      return null;
    }
    const names = Object.keys(state.files).sort();
    async function center(name: string | undefined): Promise<number[]> {
      if (name === undefined) {
        return [];
      }
      const blob = state?.files[name];
      if (blob === undefined) {
        return [];
      }
      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d");
      if (context === null) {
        bitmap.close();
        return [];
      }
      context.drawImage(bitmap, 0, 0);
      const pixels = Array.from(context.getImageData(32, 32, 1, 1).data);
      bitmap.close();
      return pixels;
    }
    return {
      names,
      dirName: state.dirName,
      firstCenter: await center(names[0]),
      secondCenter: await center(names[1]),
    };
  });
}

test("File > Export saves all frames as a looping GIF", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await addFrames(page, 1);
  await paintCenter(page);
  await stubSaveFilePicker(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Export" }).click();
  const dialog = page.locator("gnumarus-shell dialog#exportDialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("select#exportAnimation")).toHaveValue("");
  await expect(dialog.locator("select#exportAnimatedFormat")).toHaveValue("gif");
  await dialog.locator("#exportAnimatedOk").click();
  await expect(page.locator("gnumarus-shell")).toContainText("Exported");
  const gif = await exportedGifBytes(page);
  expect(gif?.fileName).toContain("frames.gif");
  expect(gif?.type).toBe("image/gif");
  expect(gif?.header).toBe("GIF89a");
  expect(gif?.width).toBe(64);
  expect(gif?.height).toBe(64);
  expect(gif?.descriptors).toBe(2);
  expect(gif?.hasNetscape).toBe(true);
});

test("File > Export saves a play-once animation as GIF without repeat", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await addFrames(page, 1);
  await addAnimation(page, "once,none,1,2");
  await paintCenter(page);
  await stubSaveFilePicker(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Export" }).click();
  const dialog = page.locator("gnumarus-shell dialog#exportDialog");
  await expect(dialog).toBeVisible();
  await dialog.locator("select#exportAnimation").selectOption("once");
  await dialog.locator("#exportAnimatedOk").click();
  await expect(page.locator("gnumarus-shell")).toContainText("Exported");
  const gif = await exportedGifBytes(page);
  expect(gif?.fileName).toContain("once.gif");
  expect(gif?.header).toBe("GIF89a");
  expect(gif?.descriptors).toBe(2);
  expect(gif?.hasNetscape).toBe(false);
});

test("File > Export saves a named animation as a PNG sequence", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await addFrames(page, 1);
  await addAnimation(page, "go,none,1,2");
  // Frame 1 keeps a black center dot; frame 2 stays blank.
  await page.locator('gnumarus-shell [data-testid="anim-frame"][data-frame="0"]').click();
  await paintCenter(page);
  await stubExportDirectory(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Export" }).click();
  const dialog = page.locator("gnumarus-shell dialog#exportDialog");
  await expect(dialog).toBeVisible();
  await dialog.locator("select#exportAnimation").selectOption("go");
  await dialog.locator("select#exportAnimatedFormat").selectOption("image/png");
  await dialog.locator("#exportAnimatedOk").click();
  await expect(page.locator("gnumarus-shell")).toContainText("Exported 2 files");
  const sequence = await exportedSequence(page);
  expect(sequence?.names).toEqual(["Untitled-go-001.png", "Untitled-go-002.png"]);
  expect(sequence?.firstCenter).toEqual([0, 0, 0, 255]);
  expect(sequence?.secondCenter).toEqual([0, 0, 0, 0]);
});

test("File > Export saves an animation as a single-line spritesheet", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await addFrames(page, 1);
  await addAnimation(page, "go,none,1,2");
  // Frame 1 keeps a black center dot; frame 2 stays blank.
  await page.locator('gnumarus-shell [data-testid="anim-frame"][data-frame="0"]').click();
  await paintCenter(page);
  await stubSaveFilePicker(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Export" }).click();
  const dialog = page.locator("gnumarus-shell dialog#exportDialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("checkbox", { name: "go" }).check();
  await expect(dialog.locator("select#exportSheetLayout")).toHaveValue("line");
  await dialog.locator("#exportSheetOk").click();
  await expect(page.locator("gnumarus-shell")).toContainText("Exported");
  const file = await exportedFile(page);
  expect(file?.fileName).toContain("sheet.png");
  expect(file?.type).toBe("image/png");
  expect(file?.width).toBe(128);
  expect(file?.height).toBe(64);
  expect(file?.center).toEqual([0, 0, 0, 255]);
  expect(file?.corner).toEqual([0, 0, 0, 0]);
});

async function exportedSheetPixels(page: import("@playwright/test").Page): Promise<{
  width: number;
  height: number;
  cells: number[][];
} | null> {
  return page.evaluate(async () => {
    const root = window as unknown as {
      __gnumarusExportTest?: { fileName: string | null; blob: Blob | null };
    };
    const state = root.__gnumarusExportTest;
    if (state?.blob == null) {
      return null;
    }
    const bitmap = await createImageBitmap(state.blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (context === null) {
      bitmap.close();
      return null;
    }
    context.drawImage(bitmap, 0, 0);
    const cells: number[][] = [];
    for (const [x, y] of [
      [32, 32],
      [96, 32],
      [32, 96],
      [96, 96],
    ]) {
      cells.push(Array.from(context.getImageData(x, y, 1, 1).data));
    }
    const result = { width: bitmap.width, height: bitmap.height, cells };
    bitmap.close();
    return result;
  });
}

test("File > Export saves one animation per line with ragged rows", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await addFrames(page, 2);
  await addAnimation(page, "a,none,1,2");
  await addAnimation(page, "b,none,3");
  // Only frame 1 is painted; every other cell stays transparent.
  await page.locator('gnumarus-shell [data-testid="anim-frame"][data-frame="0"]').click();
  await paintCenter(page);
  await stubSaveFilePicker(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Export" }).click();
  const dialog = page.locator("gnumarus-shell dialog#exportDialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("checkbox", { name: "a", exact: true }).check();
  await dialog.getByRole("checkbox", { name: "b", exact: true }).check();
  await dialog.locator("select#exportSheetLayout").selectOption("per-line");
  await dialog.locator("#exportSheetOk").click();
  await expect(page.locator("gnumarus-shell")).toContainText("Exported");
  const sheet = await exportedSheetPixels(page);
  expect(sheet?.width).toBe(128);
  expect(sheet?.height).toBe(128);
  expect(sheet?.cells[0]).toEqual([0, 0, 0, 255]);
  expect(sheet?.cells[1]).toEqual([0, 0, 0, 0]);
  expect(sheet?.cells[2]).toEqual([0, 0, 0, 0]);
  expect(sheet?.cells[3]).toEqual([0, 0, 0, 0]);
});

test("File > Export saves a manual frame list as individual files", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await addFrames(page, 1);
  await page.locator('gnumarus-shell [data-testid="anim-frame"][data-frame="0"]').click();
  await paintCenter(page);
  await stubExportDirectory(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Export" }).click();
  const dialog = page.locator("gnumarus-shell dialog#exportDialog");
  await expect(dialog).toBeVisible();
  await dialog.locator("input#exportSheetFrames").fill("1,2");
  await dialog.locator("select#exportSheetLayout").selectOption("individual");
  await dialog.locator("#exportSheetOk").click();
  await expect(page.locator("gnumarus-shell")).toContainText("Exported 2 files");
  const sequence = await exportedSequence(page);
  expect(sequence?.names).toEqual(["Untitled-sheet-001.png", "Untitled-sheet-002.png"]);
  expect(sequence?.firstCenter).toEqual([0, 0, 0, 255]);
  expect(sequence?.secondCenter).toEqual([0, 0, 0, 0]);
});

test("File > Export spritesheet without sources fails loudly", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "File" }).click();
  await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Export" }).click();
  const dialog = page.locator("gnumarus-shell dialog#exportDialog");
  await expect(dialog).toBeVisible();
  await dialog.locator("#exportSheetOk").click();
  await expect(page.locator("gnumarus-shell")).toContainText("select an animation");
});

test("rectangular selection chains three unions", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#ff0000");
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

async function cellTextId(page: import("@playwright/test").Page, layerId: string, frame: number): Promise<string | null> {
  return page.evaluate(([layer, targetFrame]: [string, number]) => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getCellTextId(layerId: string, frame: number): string | null } };
    };
    return root.__gnumarus?.engine?.getCellTextId(layer, targetFrame) ?? null;
  }, [layerId, frame] as [string, number]);
}

async function cellTextureId(page: import("@playwright/test").Page, layerId: string, frame: number): Promise<string | null> {
  return page.evaluate(([layer, targetFrame]: [string, number]) => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getCellTextureId(layerId: string, frame: number): string | null } };
    };
    return root.__gnumarus?.engine?.getCellTextureId(layer, targetFrame) ?? null;
  }, [layerId, frame] as [string, number]);
}

async function textHtml(page: import("@playwright/test").Page, textId: string): Promise<string | null> {
  return page.evaluate((id: string) => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getTextDocument(textId: string): { html: string } | null } };
    };
    return root.__gnumarus?.engine?.getTextDocument(id)?.html ?? null;
  }, textId);
}

async function textPaintedPixels(page: import("@playwright/test").Page): Promise<number> {
  return page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { readPixel(x: number, y: number): { a: number } | null } };
    };
    const engine = root.__gnumarus?.engine;
    if (engine === undefined) {
      return -1;
    }
    let count = 0;
    for (let y = 0; y < 64; y += 4) {
      for (let x = 0; x < 64; x += 4) {
        if ((engine.readPixel(x, y)?.a ?? 0) > 0) {
          count += 1;
        }
      }
    }
    return count;
  });
}

async function createDefaultText(page: import("@playwright/test").Page): Promise<string> {
  await page.locator('gnumarus-shell [data-testid="tool-text"]').click();
  await paintCenter(page);
  const dialog = page.locator('gnumarus-shell [data-testid="text-editor-dialog"]');
  await expect(dialog).toBeVisible();
  await page.locator('gnumarus-shell [data-testid="text-ok"]').click();
  await expect(page.locator('gnumarus-shell [data-testid="text-editor-dialog"]')).toBeHidden();
  const textId = await cellTextId(page, "layer0", 0);
  expect(typeof textId).toBe("string");
  return textId as string;
}

test("text tool creates a text cell and renders it", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.locator('gnumarus-shell [data-testid="tool-text"]').click();
  await paintCenter(page);
  const dialog = page.locator('gnumarus-shell [data-testid="text-editor-dialog"]');
  await expect(dialog).toBeVisible();
  const area = page.locator('gnumarus-shell [data-testid="text-editor-area"]');
  await expect(area).toContainText("Text");
  await area.click();
  await page.keyboard.press("Control+a");
  await page.keyboard.type("Hello");
  await page.locator('gnumarus-shell [data-testid="text-ok"]').click();
  await expect(page.locator("gnumarus-shell")).toContainText("Text updated");
  const textId = await cellTextId(page, "layer0", 0);
  expect(typeof textId).toBe("string");
  expect(await textHtml(page, textId as string)).toContain("Hello");
  expect(await textPaintedPixels(page)).toBeGreaterThan(0);
});

test("text edit undo and redo restore the document", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const textId = await createDefaultText(page);
  await page.locator('gnumarus-shell [data-testid="tool-text"]').click();
  await paintCenter(page);
  const area = page.locator('gnumarus-shell [data-testid="text-editor-area"]');
  await area.click();
  await page.keyboard.press("Control+a");
  await page.keyboard.type("Abc");
  await page.locator('gnumarus-shell [data-testid="text-ok"]').click();
  await expect(page.locator("gnumarus-shell")).toContainText("Text updated");
  expect(await textHtml(page, textId)).toContain("Abc");
  await page.keyboard.press("Control+z");
  expect(await textHtml(page, textId)).toBe("<div>Text</div>");
  await page.keyboard.press("Control+y");
  expect(await textHtml(page, textId)).toContain("Abc");
});

test("text entries can be shared across cells", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const textId = await createDefaultText(page);
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  const cell = matrix.locator('[data-testid="anim-cell"][data-matrix-frame="1"]');
  await cell.click({ button: "right" });
  await page.getByRole("button", { name: "Select text" }).click();
  const grid = page.locator('gnumarus-shell [data-testid="text-picker-grid"]');
  await expect(grid).toBeVisible();
  await page.locator(`gnumarus-shell [data-testid="text-picker-item"][data-text-id="${textId}"]`).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Text associated");
  expect(await cellTextId(page, "layer0", 1)).toBe(textId);
});

test("painting a text cell toasts that rasterizing is needed", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await createDefaultText(page);
  const before = await textPaintedPixels(page);
  expect(before).toBeGreaterThan(0);
  await page.keyboard.press("b");
  await paintCenter(page);
  await expect(page.locator("gnumarus-shell")).toContainText("rasterize the text first");
  expect(await textPaintedPixels(page)).toBe(before);
});

test("rasterize text bakes a paintable texture content", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await createDefaultText(page);
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  const cell = matrix.locator('[data-testid="anim-cell"][data-matrix-frame="0"]');
  await cell.click({ button: "right" });
  await page.getByRole("button", { name: "Rasterize text", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Text rasterized");
  expect(await cellTextId(page, "layer0", 0)).toBeNull();
  expect(await cellTextureId(page, "layer0", 0)).not.toBeNull();
  await setPencil(page, "#ff0000");
  await page.keyboard.press("b");
  await paintCenter(page);
  const redCount = await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { readPixel(x: number, y: number): { r: number; g: number; b: number; a: number } | null } };
    };
    const engine = root.__gnumarus?.engine;
    if (engine === undefined) {
      return -1;
    }
    let count = 0;
    for (let y = 0; y < 256; y += 2) {
      for (let x = 0; x < 256; x += 2) {
        const pixel = engine.readPixel(x, y);
        if (pixel !== null && pixel.r === 255 && pixel.g === 0 && pixel.b === 0 && pixel.a === 255) {
          count += 1;
        }
      }
    }
    return count;
  });
  expect(redCount).toBeGreaterThan(0);
});

test("text survives save and reopen", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.locator('gnumarus-shell [data-testid="tool-text"]').click();
  await paintCenter(page);
  const area = page.locator('gnumarus-shell [data-testid="text-editor-area"]');
  await area.click();
  await page.keyboard.press("Control+a");
  await page.keyboard.type("Hello");
  await page.locator('gnumarus-shell [data-testid="text-ok"]').click();
  await expect(page.locator("gnumarus-shell")).toContainText("Text updated");
  const project = await stubProjectDirectory(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  const saved = await project.writtenProject();
  expect(saved).toContain('"texts"');
  expect(saved).toContain("Hello");
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Open Project" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Opened MockProject");
  const textId = await cellTextId(page, "layer0", 0);
  expect(typeof textId).toBe("string");
  expect(await textHtml(page, textId as string)).toContain("Hello");
  expect(await textPaintedPixels(page)).toBeGreaterThan(0);
  await stubSaveFilePicker(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Export" }).click();
  const exportDialog = page.locator("gnumarus-shell dialog#exportDialog");
  await expect(exportDialog).toBeVisible();
  await exportDialog.locator("#exportOk").click();
  await expect(page.locator("gnumarus-shell")).toContainText("Exported");
  const painted = await page.evaluate(async () => {
    const root = window as unknown as {
      __gnumarusExportTest?: { fileName: string | null; blob: Blob | null };
    };
    const blob = root.__gnumarusExportTest?.blob;
    if (blob === null || blob === undefined) {
      return -1;
    }
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (context === null) {
      bitmap.close();
      return -1;
    }
    context.drawImage(bitmap, 0, 0);
    const data = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
    let count = 0;
    for (let index = 3; index < data.length; index += 16) {
      if ((data[index] ?? 0) > 0) {
        count += 1;
      }
    }
    bitmap.close();
    return count;
  });
  expect(painted).toBeGreaterThan(0);
});

test("content picker offers new text with kind badges", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  const cell = matrix.locator('[data-testid="anim-cell"][data-matrix-frame="1"]');
  await cell.click({ button: "right" });
  await page.getByRole("button", { name: "Select content" }).click();
  await page.locator('gnumarus-shell [data-testid="content-picker-new-text"]').click();
  await expect(page.locator('gnumarus-shell [data-testid="text-editor-dialog"]')).toBeVisible();
  await page.locator('gnumarus-shell [data-testid="text-cancel"]').click();
  const textId = await cellTextId(page, "layer0", 1);
  expect(typeof textId).toBe("string");
  await cell.click({ button: "right" });
  await page.getByRole("button", { name: "Select content" }).click();
  const kinds = await page.locator('gnumarus-shell [data-testid="content-picker-kind"]').allTextContents();
  expect(kinds).toContain("Text");
  expect(kinds).toContain("Texture");
});

async function setTextStorage(page: import("@playwright/test").Page, mode: string): Promise<void> {
  await page.evaluate((which: string) => {
    const root = window as unknown as {
      __gnumarus?: {
        shell?: {
          setProjectStorage(
            lossless: boolean,
            quality: number,
            format?: string,
            pngLevel?: number,
            jpgQuality?: number,
            brushQuality?: number,
            projectFile?: string,
            textStorage?: string,
          ): void;
        };
      };
    };
    root.__gnumarus?.shell?.setProjectStorage(true, 50, "jxl", 9, 95, 90, "gpa", which);
  }, mode);
}

async function createHelloText(page: import("@playwright/test").Page): Promise<string> {
  await page.locator('gnumarus-shell [data-testid="tool-text"]').click();
  await paintCenter(page);
  const area = page.locator('gnumarus-shell [data-testid="text-editor-area"]');
  await area.click();
  await page.keyboard.press("Control+a");
  await page.keyboard.type("Hello");
  await page.locator('gnumarus-shell [data-testid="text-ok"]').click();
  await expect(page.locator("gnumarus-shell")).toContainText("Text updated");
  const textId = await cellTextId(page, "layer0", 0);
  expect(typeof textId).toBe("string");
  return textId as string;
}

test("text storage html saves raw files and reopens", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const textId = await createHelloText(page);
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  const dialog = page.locator("gnumarus-shell dialog#settingsDialog");
  await expect(dialog).toBeVisible();
  await dialog.locator("select#storageTextStorage").selectOption("html");
  await dialog.getByRole("button", { name: "Close" }).click();
  const project = await stubProjectDirectory(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  expect(Object.keys(await project.writtenBlobs()).sort()).toEqual(
    ["project.gpa", `texts/${textId}.html`, "textures/t1.jxl"].sort(),
  );
  const saved = await project.writtenProject();
  expect(saved).toContain(`"file": "texts/${textId}.html"`);
  expect(saved).not.toContain('"document"');
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Open Project" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Opened MockProject");
  expect(await cellTextId(page, "layer0", 0)).toBe(textId);
  expect(await textHtml(page, textId)).toContain("Hello");
  expect(await textPaintedPixels(page)).toBeGreaterThan(0);
});

test("text storage htmlZip saves archives and reopens", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const textId = await createHelloText(page);
  await setTextStorage(page, "htmlZip");
  const project = await stubProjectDirectory(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  expect(Object.keys(await project.writtenBlobs()).sort()).toEqual(
    ["project.gpa", `texts/${textId}.zip`, "textures/t1.jxl"].sort(),
  );
  const saved = await project.writtenProject();
  expect(saved).toContain(`"file": "texts/${textId}.zip"`);
  expect(saved).not.toContain('"document"');
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Open Project" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Opened MockProject");
  expect(await cellTextId(page, "layer0", 0)).toBe(textId);
  expect(await textHtml(page, textId)).toContain("Hello");
  expect(await textPaintedPixels(page)).toBeGreaterThan(0);
});

test("switching text storage removes stale text files", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const textId = await createHelloText(page);
  await setTextStorage(page, "html");
  const project = await stubProjectDirectory(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  expect(Object.keys(await project.writtenBlobs())).toContain(`texts/${textId}.html`);
  await setTextStorage(page, "embedded");
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  expect(Object.keys(await project.writtenBlobs())).not.toContain(`texts/${textId}.html`);
  expect(await project.writtenProject()).toContain('"document"');
  await setTextStorage(page, "htmlZip");
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  const files = Object.keys(await project.writtenBlobs());
  expect(files).toContain(`texts/${textId}.zip`);
  expect(files).not.toContain(`texts/${textId}.html`);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Open Project" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Opened MockProject");
  expect(await textHtml(page, textId)).toContain("Hello");
});

test("corrupt text archive fails to open with a clear error", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const textId = await createHelloText(page);
  await setTextStorage(page, "htmlZip");
  const project = await stubProjectDirectory(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  await project.seedFile(`texts/${textId}.zip`, [1, 2, 3, 4]);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Open Project" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText(
    `Open failed: text file is not a valid archive: texts/${textId}.zip`,
  );
});

async function stubSvgPicker(page: import("@playwright/test").Page, fileName: string, data: string | number[]): Promise<void> {
  await page.evaluate(
    ([name, payload]: [string, string | number[]]) => {
      const root = window as unknown as {
        showOpenFilePicker?: () => Promise<Array<{ getFile(): Promise<File> }>>;
      };
      const bytes = typeof payload === "string" ? new TextEncoder().encode(payload) : new Uint8Array(payload);
      root.showOpenFilePicker = async () => [
        {
          getFile: async () => new File([bytes], name, { type: "image/svg+xml" }),
        },
      ];
    },
    [fileName, data] as [string, string | number[]],
  );
}

async function setSvgStorage(page: import("@playwright/test").Page, mode: string): Promise<void> {
  await page.evaluate((which: string) => {
    const root = window as unknown as {
      __gnumarus?: { shell?: { setSvgStorage(storage: string): void } };
    };
    root.__gnumarus?.shell?.setSvgStorage(which);
  }, mode);
}

async function cellSvgId(page: import("@playwright/test").Page, layerId: string, frame: number): Promise<string | null> {
  return page.evaluate(([layer, targetFrame]: [string, number]) => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getCellSvgId(layerId: string, frame: number): string | null } };
    };
    return root.__gnumarus?.engine?.getCellSvgId(layer, targetFrame) ?? null;
  }, [layerId, frame] as [string, number]);
}

const SIMPLE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#ff0000"/></svg>';
const FILTER_SVG = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="64" height="64"><defs><filter id="b"><feGaussianBlur stdDeviation="2"/></filter><inkscape:path-effect effect="rough"/></defs><rect width="64" height="64" fill="#00ff00" filter="url(#b)"/></svg>';

test("import svg renders into an empty cell", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await stubSvgPicker(page, "red.svg", SIMPLE_SVG);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Import SVG as layer" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText('Vector graphic "red" imported');
  const svgId = await cellSvgId(page, "layer0", 0);
  expect(typeof svgId).toBe("string");
  await expect
    .poll(async () => textPaintedPixels(page), { timeout: 5000 })
    .toBeGreaterThan(0);
});

test("import svg creates a layer above when the cell is occupied @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintCenter(page);
  await stubSvgPicker(page, "red.svg", SIMPLE_SVG);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Import SVG as layer" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText('Vector graphic "red" imported');
  expect(await cellSvgId(page, "layer0", 0)).toBeNull();
  const svgId = await cellSvgId(page, "layer1", 0);
  expect(typeof svgId).toBe("string");
});

test("import svg warns about filters but still imports", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await stubSvgPicker(page, "fx.svg", FILTER_SVG);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Import SVG as layer" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("ignored: filters, path effects");
  const svgId = await cellSvgId(page, "layer0", 0);
  expect(typeof svgId).toBe("string");
  await expect
    .poll(async () => textPaintedPixels(page), { timeout: 5000 })
    .toBeGreaterThan(0);
});

test("import svg rejects invalid documents", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await stubSvgPicker(page, "bad.svg", "not xml at all <>>");
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Import SVG as layer" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("not a valid SVG document");
  expect(await cellSvgId(page, "layer0", 0)).toBeNull();
});

test("import svgz gunzips before decoding", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await stubSvgPicker(page, "zipped.svgz", Array.from(gzipSync(new TextEncoder().encode(SIMPLE_SVG))));
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Import SVG as layer" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText('Vector graphic "zipped" imported');
  expect(typeof (await cellSvgId(page, "layer0", 0))).toBe("string");
});

test("import svg rejects invalid archives", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await stubSvgPicker(page, "bad.svgz", [1, 2, 3, 4]);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Import SVG as layer" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("not a valid SVG archive");
  expect(await cellSvgId(page, "layer0", 0)).toBeNull();
});

test("vector storage compressed saves archives and reopens", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await stubSvgPicker(page, "red.svg", SIMPLE_SVG);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Import SVG as layer" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("imported");
  const svgId = await cellSvgId(page, "layer0", 0);
  expect(typeof svgId).toBe("string");
  const project = await stubProjectDirectory(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  expect(Object.keys(await project.writtenBlobs()).sort()).toEqual(
    ["project.gpa", `svgs/${svgId}.zip`].sort(),
  );
  const saved = await project.writtenProject();
  expect(saved).toContain(`"file": "svgs/${svgId}.zip"`);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Open Project" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Opened MockProject");
  expect(await cellSvgId(page, "layer0", 0)).toBe(svgId);
  await expect
    .poll(async () => textPaintedPixels(page), { timeout: 5000 })
    .toBeGreaterThan(0);
});

test("vector storage raw and embedded round-trip with stale cleanup", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await stubSvgPicker(page, "red.svg", SIMPLE_SVG);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Import SVG as layer" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("imported");
  const svgId = await cellSvgId(page, "layer0", 0);
  expect(typeof svgId).toBe("string");
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  const settingsDialog = page.locator("gnumarus-shell dialog#settingsDialog");
  await expect(settingsDialog).toBeVisible();
  await settingsDialog.locator("select#storageSvgStorage").selectOption("raw");
  await settingsDialog.getByRole("button", { name: "Close" }).click();
  const project = await stubProjectDirectory(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  expect(Object.keys(await project.writtenBlobs())).toContain(`svgs/${svgId}.svg`);
  await setSvgStorage(page, "embedded");
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  const files = Object.keys(await project.writtenBlobs());
  expect(files).not.toContain(`svgs/${svgId}.svg`);
  const saved = await project.writtenProject();
  expect(saved).not.toContain(`"file": "svgs/${svgId}.svg"`);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Open Project" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Opened MockProject");
  expect(await cellSvgId(page, "layer0", 0)).toBe(svgId);
});

test("text raster fits multi-line content without clipping", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.locator('gnumarus-shell [data-testid="tool-text"]').click();
  await paintCenter(page);
  const area = page.locator('gnumarus-shell [data-testid="text-editor-area"]');
  await area.click();
  await page.keyboard.press("Control+a");
  await page.keyboard.type("012345678");
  await page.keyboard.press("Enter");
  await page.keyboard.type("012345678");
  await page.keyboard.press("Enter");
  await page.keyboard.type("012345678");
  await page.locator('gnumarus-shell [data-testid="text-ok"]').click();
  await expect(page.locator("gnumarus-shell")).toContainText("Text updated");
  // Painted extents must exceed the old 300x150 measure-canvas clip box.
  const extents = await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { readPixel(x: number, y: number): { a: number } | null } };
    };
    const engine = root.__gnumarus?.engine;
    if (engine === undefined) {
      return null;
    }
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < 1024; y += 4) {
      for (let x = 0; x < 1024; x += 4) {
        if ((engine.readPixel(x, y)?.a ?? 0) > 0) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    return maxX < 0 ? null : { minX, minY, maxX, maxY };
  });
  expect(extents).not.toBeNull();
  expect(extents?.minX ?? 999).toBeLessThanOrEqual(8);
  expect(extents?.minY ?? 999).toBeLessThanOrEqual(40);
  expect(extents?.maxX ?? 0).toBeGreaterThan(300);
  expect(extents?.maxY ?? 0).toBeGreaterThan(180);
});

test("text raster keeps descenders below the baseline", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.locator('gnumarus-shell [data-testid="tool-text"]').click();
  await paintCenter(page);
  const area = page.locator('gnumarus-shell [data-testid="text-editor-area"]');
  await area.click();
  await page.keyboard.press("Control+a");
  await page.keyboard.type("çqpga");
  await page.locator('gnumarus-shell [data-testid="text-ok"]').click();
  await expect(page.locator("gnumarus-shell")).toContainText("Text updated");
  const result = await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { readPixel(x: number, y: number): { a: number } | null } };
    };
    const engine = root.__gnumarus?.engine;
    if (engine === undefined) {
      return null;
    }
    // Same font the engine rasterizes by default (64px = 2x supersample);
    // the engine baseline sits at the typographic ascent, so descenders
    // live strictly below it.
    const probe = document.createElement("canvas").getContext("2d");
    if (probe === null) {
      return null;
    }
    probe.font = "64px sans-serif";
    const sample = probe.measureText("çqpga");
    const ascent = sample.fontBoundingBoxAscent ?? sample.actualBoundingBoxAscent;
    const descent = sample.fontBoundingBoxDescent ?? sample.actualBoundingBoxDescent;
    if (!(ascent > 0) || !(descent > 0)) {
      return null;
    }
    const refCanvas = document.createElement("canvas");
    refCanvas.width = Math.ceil(sample.width) + 8;
    refCanvas.height = Math.ceil(ascent + descent) + 8;
    const refCtx = refCanvas.getContext("2d");
    if (refCtx === null) {
      return null;
    }
    refCtx.font = "64px sans-serif";
    refCtx.textBaseline = "alphabetic";
    const refBaseline = 4 + ascent;
    refCtx.fillText("çqpga", 4, refBaseline);
    const refData = refCtx.getImageData(0, 0, refCanvas.width, refCanvas.height).data;
    let refBelow = 0;
    let refTotal = 0;
    for (let y = 0; y < refCanvas.height; y += 1) {
      for (let x = 0; x < refCanvas.width; x += 1) {
        if ((refData[(y * refCanvas.width + x) * 4 + 3] ?? 0) > 0) {
          refTotal += 1;
          if (y > refBaseline) {
            refBelow += 1;
          }
        }
      }
    }
    const engineBaseline = ascent;
    let engBelow = 0;
    let engTotal = 0;
    for (let y = 0; y < 512; y += 2) {
      for (let x = 0; x < 1024; x += 2) {
        if ((engine.readPixel(x, y)?.a ?? 0) > 0) {
          engTotal += 1;
          if (y > engineBaseline) {
            engBelow += 1;
          }
        }
      }
    }
    return { refBelow, refTotal, engBelow: engBelow * 4, engTotal: engTotal * 4 };
  });
  expect(result).not.toBeNull();
  // Tails must exist at all, track the reference count, and match the total.
  expect(result?.engBelow ?? 0).toBeGreaterThan(50);
  expect(result?.engBelow ?? 0).toBeGreaterThan((result?.refBelow ?? 0) * 0.8);
  const ratio = (result?.engTotal ?? 0) / Math.max(1, result?.refTotal ?? 1);
  expect(ratio).toBeGreaterThan(0.9);
  expect(ratio).toBeLessThan(1.1);
});

test("text toolbar font size applies to the selection and renders", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.locator('gnumarus-shell [data-testid="tool-text"]').click();
  await paintCenter(page);
  const area = page.locator('gnumarus-shell [data-testid="text-editor-area"]');
  await area.click();
  await page.keyboard.press("Control+a");
  await page.keyboard.type("Hello");
  await area.click();
  await page.keyboard.press("Control+a");
  await page.locator('gnumarus-shell [data-testid="text-size"]').fill("64");
  await page.locator('gnumarus-shell [data-testid="text-apply-size"]').click();
  // The editor DOM shows the sized span immediately (not just on OK).
  await expect(area.locator('span[style*="font-size:64px"]')).toHaveCount(1);
  await page.locator('gnumarus-shell [data-testid="text-ok"]').click();
  await expect(page.locator("gnumarus-shell")).toContainText("Text updated");
  const html = await textHtml(page, (await cellTextId(page, "layer0", 0)) as string);
  expect(html).toContain("font-size:64px");
  const maxX = await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { readPixel(x: number, y: number): { a: number } | null } };
    };
    const engine = root.__gnumarus?.engine;
    if (engine === undefined) {
      return -1;
    }
    let found = -1;
    for (let y = 0; y < 512; y += 4) {
      for (let x = 0; x < 1024; x += 4) {
        if ((engine.readPixel(x, y)?.a ?? 0) > 0 && x > found) {
          found = x;
        }
      }
    }
    return found;
  });
  // 64px "Hello" spans well past the default 32px footprint.
  expect(maxX).toBeGreaterThan(250);
});

test("text color picker applies to the selection and renders red", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.locator('gnumarus-shell [data-testid="tool-text"]').click();
  await paintCenter(page);
  const area = page.locator('gnumarus-shell [data-testid="text-editor-area"]');
  await area.click();
  await page.keyboard.press("Control+a");
  await page.keyboard.type("Hello");
  await area.click();
  await page.keyboard.press("Control+a");
  await page.locator("gnumarus-shell #textEditorColor .swatch").click();
  await page.locator("gnumarus-shell #textEditorColor [data-testid='hex-input']").fill("#ff0000");
  // execCommand paints a legacy <font> tag live; sanitize normalizes it to a span on preview/OK.
  await expect(area.locator('font[color="#ff0000"]')).toBeVisible();
  // Dismiss the picker popup (it overlays the dialog actions), then confirm.
  await area.click();
  await page.locator('gnumarus-shell [data-testid="text-ok"]').click();
  await expect(page.locator("gnumarus-shell")).toContainText("Text updated");
  const html = await textHtml(page, (await cellTextId(page, "layer0", 0)) as string);
  expect(html).toContain("color:#ff0000ff");
  const redCount = await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { readPixel(x: number, y: number): { r: number; g: number; b: number; a: number } | null } };
    };
    const engine = root.__gnumarus?.engine;
    if (engine === undefined) {
      return -1;
    }
    let count = 0;
    for (let y = 0; y < 512; y += 2) {
      for (let x = 0; x < 1024; x += 2) {
        const pixel = engine.readPixel(x, y);
        if (pixel !== null && pixel.a > 0 && pixel.r > 200 && pixel.g < 100 && pixel.b < 100) {
          count += 1;
        }
      }
    }
    return count;
  });
  expect(redCount).toBeGreaterThan(20);
});

test("text editor dialog can be dragged by its title", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.locator('gnumarus-shell [data-testid="tool-text"]').click();
  await paintCenter(page);
  const dialog = page.locator('gnumarus-shell [data-testid="text-editor-dialog"]');
  await expect(dialog).toBeVisible();
  const title = page.locator('gnumarus-shell [data-testid="text-editor-title"]');
  const before = await dialog.boundingBox();
  expect(before).not.toBeNull();
  const center = await title.boundingBox();
  expect(center).not.toBeNull();
  await page.mouse.move(center!.x + center!.width / 2, center!.y + center!.height / 2);
  await page.mouse.down();
  await page.mouse.move(center!.x + center!.width / 2 + 80, center!.y + center!.height / 2 + 60, { steps: 5 });
  await page.mouse.up();
  const after = await dialog.boundingBox();
  expect(after).not.toBeNull();
  expect(Math.abs(after!.x - before!.x - 80)).toBeLessThan(8);
  expect(Math.abs(after!.y - before!.y - 60)).toBeLessThan(8);
  // The editor still works after the move.
  await page.locator('gnumarus-shell [data-testid="text-cancel"]').click();
  await expect(dialog).toBeHidden();
});

async function stubModelPicker(page: import("@playwright/test").Page, fileName: string, data: string | number[]): Promise<void> {
  await page.evaluate(
    ([name, payload]: [string, string | number[]]) => {
      const root = window as unknown as {
        showOpenFilePicker?: () => Promise<Array<{ getFile(): Promise<File> }>>;
      };
      const bytes = typeof payload === "string" ? new TextEncoder().encode(payload) : new Uint8Array(payload);
      root.showOpenFilePicker = async () => [
        {
          getFile: async () => new File([bytes], name, { type: "application/octet-stream" }),
        },
      ];
    },
    [fileName, data] as [string, string | number[]],
  );
}

async function cellModel3dId(page: import("@playwright/test").Page, layerId: string, frame: number): Promise<string | null> {
  return page.evaluate(([layer, targetFrame]: [string, number]) => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getCellModel3dId(layerId: string, frame: number): string | null } };
    };
    return root.__gnumarus?.engine?.getCellModel3dId(layer, targetFrame) ?? null;
  }, [layerId, frame] as [string, number]);
}

async function modelPaintedPixels(page: import("@playwright/test").Page): Promise<number> {
  return page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { readPixel(x: number, y: number): { a: number } | null } };
    };
    const engine = root.__gnumarus?.engine;
    if (engine === undefined) {
      return -1;
    }
    let count = 0;
    for (let y = 0; y < 512; y += 8) {
      for (let x = 0; x < 512; x += 8) {
        if ((engine.readPixel(x, y)?.a ?? 0) > 0) {
          count += 1;
        }
      }
    }
    return count;
  });
}

const SIMPLE_STL = `solid test
facet normal 0 0 1
outer loop
vertex 0 0 0
vertex 64 0 0
vertex 0 64 0
endloop
endfacet
endsolid test
`;

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

async function tilemapTiles(page: import("@playwright/test").Page): Promise<Array<Record<string, number | boolean>> | null> {
  return page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getTilemapEntries(): Array<{ tiles: Array<Record<string, number | boolean>> }> } };
    };
    return root.__gnumarus?.engine?.getTilemapEntries()[0]?.tiles ?? null;
  });
}

async function tileBrushState(page: import("@playwright/test").Page): Promise<Record<string, number | boolean | string | null> | null> {
  return page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getTileBrush(): Record<string, number | boolean | string | null> } };
    };
    return root.__gnumarus?.engine?.getTileBrush() ?? null;
  });
}

test("tile brush creates a tilemap and places a tile", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#ff0000");
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
  await setPencil(page, "#ff0000");
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
  await setPencil(page, "#ff0000");
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

test("tilemaps save and reopen with placements", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#ff0000");
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
  await setPencil(page, "#ff0000");
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

async function modelViewOf(page: import("@playwright/test").Page, modelId: string): Promise<Record<string, number> | null> {
  return page.evaluate((id: string) => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getModelView(modelId: string): Record<string, number> | null } };
    };
    return root.__gnumarus?.engine?.getModelView(id) ?? null;
  }, modelId);
}

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
  await setPencil(page, "#ff0000");
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

async function flyPoseOf(page: import("@playwright/test").Page): Promise<{
  yawDeg: number;
  pitchDeg: number;
  x: number;
  y: number;
  z: number;
} | null> {
  return page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: {
        engine?: {
          getFlycam(): { modelId: string; yawDeg: number; pitchDeg: number; x: number; y: number; z: number } | null;
        };
      };
    };
    const fly = root.__gnumarus?.engine?.getFlycam() ?? null;
    return fly === null ? null : { yawDeg: fly.yawDeg, pitchDeg: fly.pitchDeg, x: fly.x, y: fly.y, z: fly.z };
  });
}

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

async function stubImagePicker(page: import("@playwright/test").Page, fileName: string, bytes: number[]): Promise<void> {
  await page.evaluate(
    ([name, payload]: [string, number[]]) => {
      const root = window as unknown as {
        showOpenFilePicker?: () => Promise<Array<{ getFile(): Promise<File> }>>;
      };
      root.showOpenFilePicker = async () => [
        {
          getFile: async () => new File([new Uint8Array(payload)], name, { type: "image/png" }),
        },
      ];
    },
    [fileName, bytes] as [string, number[]],
  );
}

async function borderedPngBytes(page: import("@playwright/test").Page, size: number): Promise<number[]> {
  return page.evaluate(async (side: number) => {
    const canvas = document.createElement("canvas");
    canvas.width = side;
    canvas.height = side;
    const context = canvas.getContext("2d");
    if (context === null) {
      throw new Error("2D canvas unavailable");
    }
    context.clearRect(0, 0, side, side);
    context.fillStyle = "#ff0000";
    context.fillRect(Math.floor(side / 2), Math.floor(side / 2), 1, 1);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (blob === null) {
      throw new Error("PNG encode failed");
    }
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  }, size);
}

async function layerCount(page: import("@playwright/test").Page): Promise<number> {
  return page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { getLayers(): unknown[] } } };
    return root.__gnumarus?.engine?.getLayers().length ?? -1;
  });
}

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
  await page.keyboard.press("Control+Shift+P");
  const dialog = page.locator("gnumarus-shell dialog#actionPaletteDialog");
  await expect(dialog).toBeVisible();
  await dialog.locator('[data-testid="action-palette-input"]').fill("undo");
  await expect(dialog.locator('[data-testid="action-palette-item"]')).toHaveText(["Undo"]);
  await page.keyboard.press("Enter");
  await expect(page.locator("gnumarus-shell")).toContainText("Nothing to undo");
  await page.keyboard.press("Control+Shift+P");
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
  await setPencil(page, "#00ff00");
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
  await page.keyboard.press("Control+Shift+P");
  const dialog = page.locator("gnumarus-shell dialog#actionPaletteDialog");
  await dialog.locator('[data-testid="action-palette-input"]').fill("save project as");
  await expect(dialog.locator('[data-testid="action-palette-item"]')).toHaveText(["Save project as"]);
});

test("brush size range paints max without pressure response @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Pencil" }).click();
  await expect(page.locator('gnumarus-shell [data-testid="tool-options"]')).toContainText("Min size");
  await page.locator("gnumarus-shell input#brushSize").fill("8");
  await page.locator("gnumarus-shell input#brushSizeMin").fill("2");
  await expect(page.locator("gnumarus-shell")).toContainText("Brush size: 2 – 8");
  // Without pressure response the max always paints, even for light pen touches.
  await expect(page.locator("gnumarus-shell select#pressureResponse")).toHaveValue("none");
  const center = await canvasCenter(page);
  await stubPenPointerCapture(page);
  await penDot(page, center.x, center.y, 0.1);
  const painted = await paintedPixelCount(page);
  await page.keyboard.press("Control+z");
  await page.locator("gnumarus-shell input#brushSizeMin").fill("8");
  await expect(page.locator("gnumarus-shell")).toContainText("Brush size: 8");
  await penDot(page, center.x, center.y, 0.1);
  expect(await paintedPixelCount(page)).toBe(painted);
});

test("brush min size clamps to the max @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Pencil" }).click();
  await page.locator("gnumarus-shell input#brushSize").fill("4");
  await page.locator("gnumarus-shell input#brushSizeMin").fill("99");
  expect(await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { getBrushSizeMin?(): number } } };
    return root.__gnumarus?.engine?.getBrushSizeMin?.() ?? -1;
  })).toBe(4);
  await expect(page.locator("gnumarus-shell")).toContainText("Brush size: 4");
});

test("pixel perfect snaps min and max size to 1 @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Pencil" }).click();
  const box = page.locator('gnumarus-shell input#pencilPixelPerfect');
  await expect(box).toBeEnabled();
  await page.locator("gnumarus-shell input#brushSize").fill("4");
  await page.locator("gnumarus-shell input#brushSizeMin").fill("2");
  await expect(box).toBeEnabled();
  await box.check();
  await expect(page.locator("gnumarus-shell input#brushSize")).toHaveValue("1");
  await expect(page.locator("gnumarus-shell input#brushSizeMin")).toHaveValue("1");
  await expect(page.locator("gnumarus-shell")).toContainText("Pencil pixel perfect: on");
  await box.uncheck();
  await expect(page.locator("gnumarus-shell")).toContainText("Pencil pixel perfect: off");
});

async function dragCanvas(page: import("@playwright/test").Page, x0: number, y0: number, x1: number, y1: number): Promise<void> {
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  await page.mouse.move(box.x + x0, box.y + y0);
  await page.mouse.down();
  await page.mouse.move(box.x + x1, box.y + y1, { steps: 5 });
  await page.mouse.up();
}

async function canvasBox(page: import("@playwright/test").Page): Promise<{ x: number; y: number; width: number; height: number }> {
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  return box;
}

test("rectangle tool paints an outline and undoes @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.keyboard.press("d");
  await expect(page.locator("gnumarus-shell")).toContainText("rectangle");
  const box = await canvasBox(page);
  const cx = box.width / 2;
  const cy = box.height / 2;
  await dragCanvas(page, cx - 20, cy - 10, cx + 20, cy + 10);
  expect(await paintedPixelCount(page)).toBeGreaterThan(0);
  // Outline leaves the interior empty (transparent black).
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  await page.keyboard.press("Control+z");
  expect(await paintedPixelCount(page)).toBe(0);
});

test("rectangle tool fills the interior when enabled @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.keyboard.press("d");
  await page.locator("gnumarus-shell input#shapeFilled").click();
  const box = await canvasBox(page);
  const cx = box.width / 2;
  const cy = box.height / 2;
  await dragCanvas(page, cx - 20, cy - 10, cx + 20, cy + 10);
  expect(await paintedPixelCount(page)).toBeGreaterThan(0);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  await page.keyboard.press("Control+z");
  expect(await paintedPixelCount(page)).toBe(0);
});

test("ellipse tool paints an outline and undoes @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.keyboard.press("h");
  await expect(page.locator("gnumarus-shell")).toContainText("ellipse");
  const box = await canvasBox(page);
  const cx = box.width / 2;
  const cy = box.height / 2;
  await dragCanvas(page, cx - 20, cy - 12, cx + 20, cy + 12);
  expect(await paintedPixelCount(page)).toBeGreaterThan(0);
  await page.keyboard.press("Control+z");
  expect(await paintedPixelCount(page)).toBe(0);
});

test("polygon tool commits on Enter and cancels on Escape @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.keyboard.press("j");
  await expect(page.locator("gnumarus-shell")).toContainText("polygon");
  const box = await canvasBox(page);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.click(cx - 15, cy - 10);
  await page.mouse.click(cx + 15, cy - 10);
  await page.mouse.click(cx, cy + 12);
  await page.keyboard.press("Escape");
  expect(await paintedPixelCount(page)).toBe(0);
  await page.mouse.click(cx - 15, cy - 10);
  await page.mouse.click(cx + 15, cy - 10);
  await page.mouse.click(cx, cy + 12);
  await page.keyboard.press("Enter");
  expect(await paintedPixelCount(page)).toBeGreaterThan(0);
  await page.keyboard.press("Control+z");
  expect(await paintedPixelCount(page)).toBe(0);
});

test("gradient tool fades paint to transparent and undoes @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#ff0000");
  await page.keyboard.press("k");
  await expect(page.locator("gnumarus-shell")).toContainText("gradient");
  const box = await canvasBox(page);
  await dragCanvas(page, 0, box.height / 2, box.width, box.height / 2);
  const painted = await paintedPixelCount(page);
  expect(painted).toBeGreaterThan(0);
  // Axis runs left→right past both canvas edges, so the left corner is
  // always more opaque than the right corner regardless of pan/zoom.
  const left = await readPixel(page, 0, 32);
  const right = await readPixel(page, 63, 32);
  expect(left === null || right === null).toBe(false);
  expect((left as { a: number }).a).toBeGreaterThan((right as { a: number }).a);
  await page.keyboard.press("Control+z");
  expect(await paintedPixelCount(page)).toBe(0);
});

async function mouseDot(page: import("@playwright/test").Page, x: number, y: number): Promise<void> {
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  await page.mouse.click(box.x + x, box.y + y);
}

test("shading tool lightens pixels and undoes @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#808080");
  const box = await canvasBox(page);
  await mouseDot(page, box.width / 2, box.height / 2);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 128, g: 128, b: 128, a: 255 });
  await page.keyboard.press("s");
  await expect(page.locator("gnumarus-shell")).toContainText("shading");
  await page.locator("gnumarus-shell input#shadeAmount").fill("100");
  await mouseDot(page, box.width / 2, box.height / 2);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 255, b: 255, a: 255 });
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 128, g: 128, b: 128, a: 255 });
});

test("blur tool softens a hard dot @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#000000");
  const box = await canvasBox(page);
  await mouseDot(page, box.width / 2, box.height / 2);
  await page.keyboard.press("i");
  await expect(page.locator("gnumarus-shell")).toContainText("blur");
  await mouseDot(page, box.width / 2, box.height / 2);
  const center = await readPixel(page, 32, 32);
  expect(center === null || center.a < 255).toBe(true);
  expect(await paintedPixelCount(page)).toBeGreaterThan(1);
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
});

test("clone tool stamps from the alt-clicked source @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#ff0000");
  const box = await canvasBox(page);
  const cx = box.width / 2;
  const cy = box.height / 2;
  await mouseDot(page, cx - 10, cy);
  // Locate the painted dot in layer space (screen mapping depends on zoom/pan).
  const source = await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { readPixel(x: number, y: number): unknown } } };
    const engine = root.__gnumarus?.engine;
    if (engine === undefined) {
      return null;
    }
    for (let y = 0; y < 64; y += 1) {
      for (let x = 0; x < 64; x += 1) {
        const pixel = engine.readPixel(x, y) as { r: number; g: number; b: number; a: number } | null;
        if (pixel !== null && pixel.r === 255 && pixel.g === 0 && pixel.b === 0 && pixel.a === 255) {
          return { x, y };
        }
      }
    }
    return null;
  });
  expect(source).not.toBeNull();
  const zoom = await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { getViewState(): { zoom: number } } } };
    return root.__gnumarus?.engine?.getViewState().zoom ?? 1;
  });
  await page.keyboard.press("a");
  await expect(page.locator("gnumarus-shell")).toContainText("clone");
  await page.keyboard.down("Alt");
  await page.mouse.click(box.x + cx - 10, box.y + cy);
  await page.keyboard.up("Alt");
  await expect(page.locator('gnumarus-shell [data-testid="clone-source"]')).toBeVisible();
  // Stamp 20 layer pixels to the right of the source dot.
  await page.mouse.click(box.x + cx - 10 + 20 * zoom, box.y + cy);
  const target = await page.evaluate(([tx, ty]: number[]) => {
    const root = window as unknown as { __gnumarus?: { engine?: { readPixel(x: number, y: number): unknown } } };
    return (root.__gnumarus?.engine?.readPixel(tx, ty) ?? null) as unknown as {
      r: number;
      g: number;
      b: number;
      a: number;
    } | null;
  }, [(source as { x: number }).x + 20, (source as { y: number }).y]);
  expect(target).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  await page.keyboard.press("Control+z");
  const undone = await page.evaluate(([tx, ty]: number[]) => {
    const root = window as unknown as { __gnumarus?: { engine?: { readPixel(x: number, y: number): unknown } } };
    return (root.__gnumarus?.engine?.readPixel(tx, ty) ?? null) as unknown;
  }, [(source as { x: number }).x + 20, (source as { y: number }).y]);
  expect(undone).not.toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("recolor tool shifts similar hues toward the paint color @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#0000ff");
  const box = await canvasBox(page);
  await mouseDot(page, box.width / 2, box.height / 2);
  await setPencil(page, "#ff0000");
  await page.keyboard.press("q");
  await expect(page.locator("gnumarus-shell")).toContainText("recolor");
  await page.locator("gnumarus-shell input#recolorTolerance").fill("100");
  await mouseDot(page, box.width / 2, box.height / 2);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 255, a: 255 });
});

test("jumble tool displaces pixels @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#ff0000");
  const box = await canvasBox(page);
  const cx = box.width / 2;
  const cy = box.height / 2;
  await mouseDot(page, cx - 2, cy);
  await setPencil(page, "#0000ff");
  await mouseDot(page, cx + 2, cy);
  const before = await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { readPixel(x: number, y: number): unknown } } };
    const engine = root.__gnumarus?.engine;
    if (engine === undefined) {
      return [];
    }
    const out: unknown[] = [];
    for (let y = 28; y <= 36; y += 1) {
      for (let x = 28; x <= 36; x += 1) {
        out.push(engine.readPixel(x, y));
      }
    }
    return out;
  });
  await selectTool(page, "Jumble");
  await expect(page.locator("gnumarus-shell")).toContainText("jumble");
  await page.mouse.move(box.x + cx - 4, box.y + cy);
  await page.mouse.down();
  await page.mouse.move(box.x + cx + 4, box.y + cy, { steps: 4 });
  await page.mouse.up();
  const after = await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { readPixel(x: number, y: number): unknown } } };
    const engine = root.__gnumarus?.engine;
    if (engine === undefined) {
      return [];
    }
    const out: unknown[] = [];
    for (let y = 28; y <= 36; y += 1) {
      for (let x = 28; x <= 36; x += 1) {
        out.push(engine.readPixel(x, y));
      }
    }
    return out;
  });
  expect(JSON.stringify(after)).not.toBe(JSON.stringify(before));
  await page.keyboard.press("Control+z");
  const undone = await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { readPixel(x: number, y: number): unknown } } };
    const engine = root.__gnumarus?.engine;
    if (engine === undefined) {
      return [];
    }
    const out: unknown[] = [];
    for (let y = 28; y <= 36; y += 1) {
      for (let x = 28; x <= 36; x += 1) {
        out.push(engine.readPixel(x, y));
      }
    }
    return out;
  });
  expect(JSON.stringify(undone)).toBe(JSON.stringify(before));
});

test("crop tool crops the cell texture to the dragged box @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#ff0000");
  await paintCenter(page);
  expect(await textureDims(page)).toEqual({ width: 64, height: 64 });
  await selectTool(page, "Crop");
  await expect(page.locator("gnumarus-shell")).toContainText("crop");
  const box = await canvasBox(page);
  // Drag a small centered box (well inside the layer in any zoom/pan).
  await dragCanvas(page, (box.width * 3) / 8, (box.height * 3) / 8, (box.width * 5) / 8, (box.height * 5) / 8);
  const dims = await textureDims(page);
  expect(dims.width).toBeLessThan(64);
  expect(dims.height).toBeLessThan(64);
  expect(await page.locator("gnumarus-shell")).toContainText(`Texture cropped to ${dims.width} x ${dims.height}`);
  await page.keyboard.press("Control+z");
  expect(await textureDims(page)).toEqual({ width: 64, height: 64 });
});

test("crop tool refuses an empty cell @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await selectTool(page, "Crop");
  const box = await canvasBox(page);
  await dragCanvas(page, box.width / 4, box.height / 4, (box.width * 3) / 4, (box.height * 3) / 4);
  await expect(page.locator("gnumarus-shell")).toContainText("no texture");
  expect(await textureDims(page)).toEqual({ width: 64, height: 64 });
});

async function onionVisible(page: import("@playwright/test").Page): Promise<{ past: boolean; future: boolean }> {
  return page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { onionGhostVisible(which: string): boolean } } };
    const engine = root.__gnumarus?.engine;
    return { past: engine?.onionGhostVisible("past") ?? false, future: engine?.onionGhostVisible("future") ?? false };
  });
}

async function setOnion(page: import("@playwright/test").Page, enabled: boolean, past: number, future: number): Promise<void> {
  await page.evaluate(([on, p, f]: [boolean, number, number]) => {
    const root = window as unknown as { __gnumarus?: { shell?: { setOnionState(a: boolean, b: number, c: number, d: boolean): void } } };
    root.__gnumarus?.shell?.setOnionState(on, p, f, true);
  }, [enabled, past, future] as [boolean, number, number]);
}

test("onion skin ghosts neighbor frames per side @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#ff0000");
  await paintCenter(page);
  await setOnion(page, true, 1, 1);
  // Single frame: no neighbors, no ghosts.
  expect(await onionVisible(page)).toEqual({ past: false, future: false });
  await page.getByRole("button", { name: "Add frame", exact: true }).click();
  await setPencil(page, "#0000ff");
  await paintCenter(page);
  // Frame 0 sees only the future ghost; frame 1 only the past ghost.
  await page.locator('gnumarus-shell [data-testid="anim-frame"][data-frame="0"]').click();
  expect(await onionVisible(page)).toEqual({ past: false, future: true });
  await page.locator('gnumarus-shell [data-testid="anim-frame"][data-frame="1"]').click();
  expect(await onionVisible(page)).toEqual({ past: true, future: false });
  await setOnion(page, false, 1, 1);
  expect(await onionVisible(page)).toEqual({ past: false, future: false });
});

test("onion toggle button and settings persist @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.locator('gnumarus-shell [data-testid="onion-toggle"]').click();
  await expect(page.locator("gnumarus-shell")).toContainText("Onion skin on");
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  const dialog = page.locator("gnumarus-shell dialog#settingsDialog");
  await expect(dialog.locator("select#onionPast, input#onionPast")).toHaveCount(1);
  await expect(dialog.locator("#onionPast")).toHaveValue("1");
  await dialog.locator("#onionPast").fill("2");
  await expect(page.locator("gnumarus-shell")).toContainText("Onion skin on");
  await page.reload();
  await page.waitForSelector("gnumarus-shell canvas");
  const enabled = await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { onionEnabled?: boolean } } };
    return root.__gnumarus?.shell?.onionEnabled ?? false;
  });
  expect(enabled).toBe(true);
});

test("swatches save, apply, persist and remove @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#00ff00");
  const picker = await openPicker(page, "pencilColor");
  await picker.getByTestId("swatch-add").click();
  const swatch = picker.locator('[data-testid="palette-swatch"][data-hex="#00ff00"]');
  await expect(swatch).toBeVisible();
  await setPencil(page, "#0000ff");
  await swatch.click();
  expect(await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { colorValue: string } } };
    return root.__gnumarus?.shell?.colorValue ?? "";
  })).toBe("#00ff00");
  await page.reload();
  await page.waitForSelector("gnumarus-shell canvas");
  const picker2 = await openPicker(page, "pencilColor");
  await expect(picker2.locator('[data-testid="palette-swatch"][data-hex="#00ff00"]')).toBeVisible();
  await picker2.locator('[data-testid="palette-swatch"][data-hex="#00ff00"] [data-testid="swatch-remove"]').click();
  await expect(picker2.locator('[data-testid="palette-swatch"][data-hex="#00ff00"]')).toHaveCount(0);
});

test("recent colors track the paint color @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#ff0000");
  await setPencil(page, "#0000ff");
  const picker = await openPicker(page, "pencilColor");
  const recents = picker.getByTestId("recent-swatch");
  await expect(recents).toHaveCount(2);
  expect(await recents.first().getAttribute("data-hex")).toBe("#0000ff");
  expect(await recents.nth(1).getAttribute("data-hex")).toBe("#ff0000");
});

async function previewRgba(page: import("@playwright/test").Page, x: number, y: number): Promise<number[] | null> {
  return page.evaluate(([px, py]: number[]) => {
    const root = document.querySelector("gnumarus-shell")?.shadowRoot ?? null;
    const canvas = root?.getElementById("previewCanvas") as HTMLCanvasElement | null;
    const context = canvas?.getContext("2d") ?? null;
    if (context === null) {
      return null;
    }
    const data = context.getImageData(px, py, 1, 1).data;
    return [data[0], data[1], data[2], data[3]];
  }, [x, y] as [number, number]);
}

test("layer blend modes composite in canvas and preview @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#ff0000");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  await paintCenter(page);
  await page.keyboard.press("Insert");
  await setPencil(page, "#00ff00");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  await paintCenter(page);
  await page.getByRole("button", { name: "Final preview" }).click();
  const preview = page.locator("gnumarus-shell canvas#previewCanvas");
  await expect(preview).toBeVisible();
  await expect.poll(async () => previewRgba(page, 32, 32), { timeout: 10000 }).toEqual([0, 255, 0, 255]);
  const blend = page.locator('gnumarus-shell [data-layer-id="layer1"] select[aria-label="Blend mode"]');
  await expect(blend).toHaveValue("normal");
  await blend.selectOption("multiply");
  await expect.poll(async () => previewRgba(page, 32, 32), { timeout: 10000 }).toEqual([0, 0, 0, 255]);
  await blend.selectOption("screen");
  await expect.poll(async () => previewRgba(page, 32, 32), { timeout: 10000 }).toEqual([255, 255, 0, 255]);
});

test("layer blend mode persists through save and reopen @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#ff0000");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  await paintCenter(page);
  await page.keyboard.press("Insert");
  await page.locator('gnumarus-shell [data-layer-id="layer1"] select[aria-label="Blend mode"]').selectOption("multiply");
  const project = await stubProjectDirectory(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  expect(await project.writtenProject()).toContain('"blend": "multiply"');
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Open Project" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Opened MockProject");
  await expect(page.locator('gnumarus-shell [data-layer-id="layer1"] select[aria-label="Blend mode"]')).toHaveValue("multiply");
});

async function layerToScreen(page: import("@playwright/test").Page, x: number, y: number): Promise<{ x: number; y: number }> {
  const box = await canvasBox(page);
  const zoom = await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { getViewState(): { zoom: number } } } };
    return root.__gnumarus?.engine?.getViewState().zoom ?? 1;
  });
  return { x: box.x + box.width / 2 + (x - 32) * zoom, y: box.y + box.height / 2 + (y - 32) * zoom };
}

async function dragLayerBox(
  page: import("@playwright/test").Page,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): Promise<void> {
  const a = await layerToScreen(page, x0, y0);
  const b = await layerToScreen(page, x1, y1);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 5 });
  await page.mouse.up();
}

async function paintLayerRect(page: import("@playwright/test").Page, hex: string, x0: number, y0: number, x1: number, y1: number): Promise<void> {
  await setPencil(page, hex);
  await page.evaluate(([ax, ay, bx, by]: number[]) => {
    const root = window as unknown as { __gnumarus?: { engine?: { setShapeFilled(f: boolean): void; commitShapeRect(a: number, b: number, c: number, d: number): boolean } } };
    root.__gnumarus?.engine?.setShapeFilled(true);
    root.__gnumarus?.engine?.commitShapeRect(ax, ay, bx, by);
  }, [x0, y0, x1, y1] as [number, number, number, number]);
}

async function countRedIn(page: import("@playwright/test").Page, x0: number, y0: number, x1: number, y1: number): Promise<number> {
  return page.evaluate(([ax, ay, bx, by]: number[]) => {
    const root = window as unknown as { __gnumarus?: { engine?: { readPixel(x: number, y: number): { r: number; g: number; b: number; a: number } | null } } };
    const engine = root.__gnumarus?.engine;
    if (engine === undefined) {
      return -1;
    }
    let count = 0;
    for (let y = ay; y < by; y += 1) {
      for (let x = ax; x < bx; x += 1) {
        const pixel = engine.readPixel(x, y);
        if (pixel !== null && pixel.r === 255 && pixel.g === 0 && pixel.b === 0 && pixel.a === 255) {
          count += 1;
        }
      }
    }
    return count;
  }, [x0, y0, x1, y1] as [number, number, number, number]);
}

async function setMaskOption(page: import("@playwright/test").Page, inputId: string, value: string): Promise<void> {
  const input = page.locator(`gnumarus-shell #${inputId}`);
  await input.fill(value);
  await input.evaluate((el) => el.dispatchEvent(new Event("change", { bubbles: true })));
  // Blur the number input: engine Enter-to-merge ignores key events from
  // inside text fields, so focus must leave before Enter commits.
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
}

async function commitFloatingSelection(page: import("@playwright/test").Page): Promise<void> {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
  await page.keyboard.press("Enter");
}

test("selection feather softens the merged edge @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintLayerRect(page, "#ff0000", 24, 24, 39, 39);
  expect(await countRedIn(page, 20, 20, 44, 44)).toBe(256);
  await page.keyboard.press("r");
  await dragLayerBox(page, 24, 24, 39, 39);
  await page.keyboard.press("v");
  await setMaskOption(page, "featherRadius", "2");
  await commitFloatingSelection(page);
  const partial = await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { readPixel(x: number, y: number): { a: number } | null } } };
    const engine = root.__gnumarus?.engine;
    if (engine === undefined) {
      return -1;
    }
    let count = 0;
    for (let y = 20; y < 44; y += 1) {
      for (let x = 20; x < 44; x += 1) {
        const pixel = engine.readPixel(x, y);
        if (pixel !== null && pixel.a > 0 && pixel.a < 255) {
          count += 1;
        }
      }
    }
    return count;
  });
  expect(partial).toBeGreaterThan(0);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  await page.keyboard.press("Control+z");
  expect(await countRedIn(page, 20, 20, 44, 44)).toBe(256 - 256);
});

test("selection grow expands and shrink contracts the merged area @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintLayerRect(page, "#ff0000", 24, 24, 39, 39);
  await page.keyboard.press("r");
  await dragLayerBox(page, 26, 26, 37, 37);
  await page.keyboard.press("v");
  await setMaskOption(page, "growShrinkPx", "4");
  await page.locator("gnumarus-shell [data-testid=\"selection-grow\"]").click();
  await commitFloatingSelection(page);
  // Grown by 2px each side: the full 16x16 square is red again.
  expect(await countRedIn(page, 20, 20, 44, 44)).toBe(256);
  await page.keyboard.press("Control+z");
  // Undo restores the cut hole: only the border ring stays red.
  expect(await countRedIn(page, 20, 20, 44, 44)).toBe(256 - 144);
  // Repaint to a full square: the next cut must hold solid reds.
  await paintLayerRect(page, "#ff0000", 24, 24, 39, 39);
  expect(await countRedIn(page, 20, 20, 44, 44)).toBe(256);
  await page.keyboard.press("r");
  await dragLayerBox(page, 24, 24, 39, 39);
  await page.keyboard.press("v");
  await setMaskOption(page, "growShrinkPx", "4");
  await page.locator("gnumarus-shell [data-testid=\"selection-shrink\"]").click();
  await commitFloatingSelection(page);
  // Shrunk by 4px each side: only the center 8x8 stays red.
  expect(await countRedIn(page, 20, 20, 44, 44)).toBe(64);
  await page.keyboard.press("Control+z");
  expect(await countRedIn(page, 20, 20, 44, 44)).toBe(0);
});

test("adjust invert flips cell colors and undoes @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintLayerRect(page, "#ff0000", 24, 24, 39, 39);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { runAction(id: string): boolean } } };
    root.__gnumarus?.shell?.runAction("adjust-invert");
  });
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 255, b: 255, a: 255 });
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("adjust colors dialog applies brightness and undoes @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintLayerRect(page, "#ff0000", 24, 24, 39, 39);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { runAction(id: string): boolean } } };
    root.__gnumarus?.shell?.runAction("adjust-colors");
  });
  const dialog = page.locator('gnumarus-shell dialog#adjustColorsDialog[open]');
  await expect(dialog).toBeVisible();
  await dialog.locator("#adjustBrightness").fill("100");
  await dialog.getByRole("button", { name: "OK" }).click();
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 255, b: 255, a: 255 });
  await expect(page.locator("gnumarus-shell")).toContainText("Colors adjusted");
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

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
  await setPencil(page, "#ff0000");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  await paintCenter(page);
  // Layer above with a real texture that is still transparent at the center:
  // an empty cell renders no plane at all, so materialize with a corner dot.
  await page.keyboard.press("Insert");
  await page.getByRole("button", { name: "Pencil" }).click();
  await setPencil(page, "#000000");
  const dot = await layerToScreen(page, 8, 8);
  await page.mouse.click(dot.x, dot.y);
  const box = await canvasBox(page);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.locator('gnumarus-shell [data-layer-id="layer1"] select[aria-label="Blend mode"]').selectOption("multiply");
  await expect.poll(async () => canvasScreenPixel(page, cx, cy), { timeout: 10000 }).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  // White is invisible in multiply, black stays black (Krita parity).
  await setPencil(page, "#ffffff");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  await paintCenter(page);
  await expect.poll(async () => canvasScreenPixel(page, cx, cy), { timeout: 10000 }).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  await setPencil(page, "#000000");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  await paintCenter(page);
  await expect.poll(async () => canvasScreenPixel(page, cx, cy), { timeout: 10000 }).toEqual({ r: 0, g: 0, b: 0, a: 255 });
});

test("darken/lighten/add/screen show through unpainted texels on the GPU canvas @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#ff0000");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  await paintCenter(page);
  await page.keyboard.press("Insert");
  await page.getByRole("button", { name: "Pencil" }).click();
  await setPencil(page, "#000000");
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
  await setPencil(page, "#000000");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  await paintCenter(page);
  await expect.poll(async () => canvasScreenPixel(page, cx, cy), { timeout: 10000 }).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  await setPencil(page, "#ffffff");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  await paintCenter(page);
  await expect.poll(async () => canvasScreenPixel(page, cx, cy), { timeout: 10000 }).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  // Lighten is mirrored: white wins, black shows through.
  await blend.selectOption("lighten");
  await expect.poll(async () => canvasScreenPixel(page, cx, cy), { timeout: 10000 }).toEqual({ r: 255, g: 255, b: 255, a: 255 });
  await setPencil(page, "#000000");
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

test("Ctrl+Shift+Arrows create layers and frames @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.keyboard.press("Control+Shift+ArrowUp");
  let state = await getLayers(page);
  expect(state.layers.map((layer) => layer.id)).toEqual(["layer0", "layer1"]);
  expect(state.active).toBe("layer1");
  await page.keyboard.press("Control+Shift+ArrowDown");
  state = await getLayers(page);
  expect(state.layers.map((layer) => layer.id)).toEqual(["layer0", "layer2", "layer1"]);
  expect(state.active).toBe("layer2");
  await page.keyboard.press("Control+Shift+ArrowLeft");
  let matrix = await getMatrix(page);
  expect(matrix.frameCount).toBe(2);
  expect(matrix.currentFrame).toBe(0);
  await page.keyboard.press("Control+Shift+ArrowRight");
  matrix = await getMatrix(page);
  expect(matrix.frameCount).toBe(3);
  expect(matrix.currentFrame).toBe(1);
});

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
      // Sticky headers paint over the scrolled cells: the current cell must
      // clear the layer-name column (left) and the frame-header row (top).
      const usable = new DOMRect(
        scrollerBox.left + (cornerBox?.width ?? 0),
        scrollerBox.top + (cornerBox?.height ?? 0),
        Math.max(0, scrollerBox.width - (cornerBox?.width ?? 0)),
        Math.max(0, scrollerBox.height - (cornerBox?.height ?? 0)),
      );
      return {
        listTop: list.scrollTop,
        scrollLeft: scroller.scrollLeft,
        scrollTop: scroller.scrollTop,
        cellVisible: inView(cell.getBoundingClientRect(), usable),
        rowVisible: inView(row.getBoundingClientRect(), list.getBoundingClientRect()),
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
  await page.locator('gnumarus-shell [aria-label="Loupe"]').click({ button: "right" });
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
