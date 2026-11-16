import { expect, test } from "@playwright/test";
import { layerPixelToScreen } from "../src/canvas/GnumarusViewportMath";
import { backgroundPlaneSize, blurActiveElement, canvasCenter, canvasScreenPixel, getViewState, layerScreenTarget, loadBlankProject, outsideLayerTarget, paintCenter, paintedPixelCount, penDot, penTiltDot, readLayerPixel, readPixel, selectTool, setPaintDynamics, setPaintTip, setPencil, stubPenPointerCapture } from "./e2e-helpers";

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
  expect(await brushOf()).toEqual({ size: 99, shape: "square" });
  await page.locator("gnumarus-shell input#brushSize").fill("9999");
  expect(await brushOf()).toEqual({ size: 512, shape: "square" });
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

test("soft brush tip paints with feathered edges", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
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
  await loadBlankProject(page, 64);
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

test("low flow paints translucent dabs", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
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
  await loadBlankProject(page, 64);
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
  await loadBlankProject(page, 64);
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
  await loadBlankProject(page, 64);
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
  await loadBlankProject(page, 64);
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
  await loadBlankProject(page, 64);
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
  await loadBlankProject(page, 64);
  await paintCenter(page);
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

test("painting outside the texture does nothing with wrap off", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await setPencil(page, "#ff0000");
  const outside = await outsideLayerTarget(page, 70, 32);
  await page.mouse.click(outside.x, outside.y);
  expect(await paintedPixelCount(page)).toBe(0);
});

test("wrap-x paints outside pixels back into the texture", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
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
  await paintCenter(page);
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
