import { expect, test } from "@playwright/test";
import { GnumarusViewState, getViewState, loadBlankProject, openPicker, paintedPixelCount, readPixel, setBrushColor } from "./e2e-helpers";

test("brush draws a solid pixel on the WebGL2 canvas", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell");
  await loadBlankProject(page, 64);
  const canvas = page.locator("gnumarus-shell canvas");
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  expect(await readPixel(page, 32, 32)).toBeNull();
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
  await loadBlankProject(page, 64);
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
  await page.getByRole("button", { name: "Edit", exact: true }).click();
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

test("brush stroke can start outside the texture and paint on entry", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await setBrushColor(page, "#ff0000");
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
  await page.getByRole("button", { name: "Edit", exact: true }).click();
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
  await page.getByRole("button", { name: "Edit", exact: true }).click();
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

test("B and Z switch between brush and loupe", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await expect(page.locator("gnumarus-shell")).toContainText("brush");
  await page.keyboard.press("z");
  await expect(page.locator("gnumarus-shell")).toContainText("loupe");
  await page.keyboard.press("b");
  await expect(page.locator("gnumarus-shell")).toContainText("brush");
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
  await page.getByRole("button", { name: "Edit", exact: true }).click();
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
