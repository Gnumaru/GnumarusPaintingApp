import { expect, test } from "@playwright/test";
import { layerPixelToScreen } from "../src/canvas/GnumarusViewportMath";
import { blurActiveElement, canvasCenter, getViewState, loadBlankProject, loadTinyLayer, paintedNeighborStats, paintedPixelCount, penDot, penTiltDot, readPixel, selectTool, setBrushColor, setPaintTip, stubPenPointerCapture } from "./e2e-helpers";

test("brush stabilizer dropdown defaults to none with conditional rope and follow settings", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Brush", exact: true }).click();
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
  await loadBlankProject(page, 64);
  await page.getByRole("button", { name: "Brush", exact: true }).click();
  await page.locator("gnumarus-shell select#stabilizerMode").selectOption("rope");
  await page.locator("gnumarus-shell input#ropeLength").fill("10");
  await setBrushColor(page, "#ff0000");
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
  await loadBlankProject(page, 64);
  await page.getByRole("button", { name: "Brush", exact: true }).click();
  await page.locator("gnumarus-shell select#stabilizerMode").selectOption("follow");
  await page.locator("gnumarus-shell input#followStrength").fill("100");
  await expect(page.locator("gnumarus-shell")).toContainText("Follow strength: 100");
  await setBrushColor(page, "#ff0000");
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
  await page.getByRole("button", { name: "Edit", exact: true }).click();
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
  await page.getByRole("button", { name: "Edit", exact: true }).click();
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
  await loadBlankProject(page, 64);
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

test("shift-drag adjusts the brush brush size live without painting", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Brush", exact: true }).click();
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
  expect(await readPixel(page, 32, 32)).toBeNull();
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

test("brush pressure size scales the stroke", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await stubPenPointerCapture(page);
  await page.getByRole("button", { name: "Brush", exact: true }).click();
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

test("brush pressure opacity scales the alpha", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await stubPenPointerCapture(page);
  await page.getByRole("button", { name: "Brush", exact: true }).click();
  await page.locator("gnumarus-shell select#pressureResponse").selectOption("opacity");
  await setBrushColor(page, "#00000080");
  const center = await canvasCenter(page);
  await penDot(page, center.x, center.y, 1);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 128 });
  await blurActiveElement(page);
  await page.keyboard.press("Control+z");
  await penDot(page, center.x, center.y, 0.5);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 64 });
});

test("brush pressure none ignores pen pressure", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await stubPenPointerCapture(page);
  await page.getByRole("button", { name: "Brush", exact: true }).click();
  await expect(page.locator("gnumarus-shell select#pressureResponse")).toHaveValue("none");
  await page.locator("gnumarus-shell input#brushSize").fill("10");
  const center = await canvasCenter(page);
  await penDot(page, center.x, center.y, 0.5);
  expect(await paintedPixelCount(page)).toBeGreaterThan(50);
  await blurActiveElement(page);
  await page.keyboard.press("Control+z");
  await setBrushColor(page, "#00000080");
  await page.locator("gnumarus-shell input#brushSize").fill("1");
  await penDot(page, center.x, center.y, 0.5);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 128 });
});

test("brush pressure size+opacity applies both", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await stubPenPointerCapture(page);
  await page.getByRole("button", { name: "Brush", exact: true }).click();
  await page.locator("gnumarus-shell input#brushSize").fill("10");
  await page.locator("gnumarus-shell select#pressureResponse").selectOption("size+opacity");
  await setBrushColor(page, "#00000080");
  const center = await canvasCenter(page);
  await penDot(page, center.x, center.y, 0.5);
  expect(await paintedPixelCount(page)).toBeLessThan(40);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 64 });
});

test("brush pixel perfect snaps size to 1 and thins tight turns @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Brush", exact: true }).click();
  const options = page.locator('gnumarus-shell [data-testid="tool-options"]');
  await expect(options).toContainText("Pixel perfect");
  const pixelPerfect = page.locator("gnumarus-shell input#brushPixelPerfect");
  await expect(pixelPerfect).toBeEnabled();
  await page.locator("gnumarus-shell input#brushSize").fill("3");
  await page.locator("gnumarus-shell input#brushSizeMin").fill("2");
  await expect(pixelPerfect).toBeEnabled();
  await pixelPerfect.check();
  await expect(page.locator("gnumarus-shell input#brushSize")).toHaveValue("1");
  await expect(page.locator("gnumarus-shell input#brushSizeMin")).toHaveValue("1");
  await page.locator("gnumarus-shell input#brushAntialias").check();
  await expect(pixelPerfect).toBeEnabled();
  await page.locator("gnumarus-shell input#brushAntialias").uncheck();
  await expect(pixelPerfect).toBeEnabled();
  await pixelPerfect.uncheck();

  await loadTinyLayer(page, 8);
  await setBrushColor(page, "#ff0000");
  await pixelPerfect.check();
  await expect(page.locator("gnumarus-shell")).toContainText("Brush pixel perfect: on");
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
  await expect(page.locator("gnumarus-shell")).toContainText("Brush pixel perfect: off");
  await dragUTurn();
  stats = await paintedNeighborStats(page, 8);
  expect(stats.painted).toBeGreaterThan(0);
  expect(stats.max).toBeGreaterThan(2);
});

test("brush pixel perfect still paints crossings and revisits", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Brush", exact: true }).click();
  await loadTinyLayer(page, 8);
  await setBrushColor(page, "#ff0000");
  await page.locator("gnumarus-shell input#brushPixelPerfect").check();
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
  await setBrushColor(page, "#ff0000");
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

test("pressure sensitivity switch makes pen paint like a mouse", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await stubPenPointerCapture(page);
  await page.getByRole("button", { name: "Brush", exact: true }).click();
  const toggle = page.locator('gnumarus-shell [data-testid="pressure-sensitivity"]');
  await expect(toggle).toBeChecked();
  await page.locator("gnumarus-shell select#pressureResponse").selectOption("opacity");
  await setBrushColor(page, "#00000080");
  const center = await canvasCenter(page);
  await penDot(page, center.x, center.y, 0.5);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 64 });
  await blurActiveElement(page);
  await page.keyboard.press("Control+z");
  // Off: pen pressure is ignored, like a mouse at full pressure.
  await toggle.uncheck();
  await expect(page.locator("gnumarus-shell")).toContainText("Pressure sensitivity: off");
  await penDot(page, center.x, center.y, 0.5);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 128 });
  await blurActiveElement(page);
  await page.keyboard.press("Control+z");
  // Back on: pressure applies again.
  await toggle.check();
  await expect(page.locator("gnumarus-shell")).toContainText("Pressure sensitivity: on");
  await penDot(page, center.x, center.y, 0.5);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 64 });
});

test("pressure sensitivity switch also gates pen tilt", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await setBrushColor(page, "#ff0000");
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
  await penTiltDot(page, center.x, center.y, 1, 60, 0);
  expect(await paintedPixelCount(page)).toBeGreaterThan(straight);
  await blurActiveElement(page);
  await page.keyboard.press("Control+z");
  // Off: tilt is ignored, so the tilted pen paints exactly like untilted.
  await page.locator('gnumarus-shell [data-testid="pressure-sensitivity"]').uncheck();
  await penTiltDot(page, center.x, center.y, 1, 60, 0);
  expect(await paintedPixelCount(page)).toBe(straight);
});
