import { expect, test } from "@playwright/test";
import { blurActiveElement, buildXcfBytes, decodeJxlInPage, getLayers, layerScreenTarget, loadBlankProject, openPicker, paintCenter, paintedPixelCount, readPixel, setImportCleanup, setPaintDynamics, setPaintTip, setPencil, stubAsepritePicker, stubProjectDirectory, textureDims } from "./e2e-helpers";

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
  await loadBlankProject(page, 64);
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
  await options.getByRole("button", { name: "Presets", exact: true }).click();
  const presetDialog = page.locator('gnumarus-shell dialog#brushPresetManagerDialog');
  await expect(presetDialog).toBeVisible();
  await presetDialog.locator("input#presetNameDialog").fill("E2E Custom");
  await presetDialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Preset saved: E2E Custom");
  await presetDialog.getByRole("button", { name: "Close", exact: true }).click();
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
  await loadBlankProject(page, 64);
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

test("new built-in presets apply and erase @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  const bar = page.locator('gnumarus-shell [data-testid="tool-options"]');
  await bar.getByRole("button", { name: "Presets", exact: true }).click();
  const dialog = page.locator("gnumarus-shell dialog#brushPresetManagerDialog");
  await expect(dialog).toBeVisible();
  for (const name of [
    "Eraser Hard",
    "Eraser Soft",
    "Glaze",
    "Dry Brush",
    "Charcoal",
    "Blender",
    "Spray",
    "Chisel Marker",
    "Velocity Ink",
    "Tilt Pencil",
  ]) {
    await expect(dialog.locator("select#brushPresetDialog")).toContainText(name);
  }
  await dialog.locator("select#brushPresetDialog").selectOption("Glaze");
  await expect(page.locator("gnumarus-shell")).toContainText("Preset: Glaze");
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(dialog).toBeHidden();
  // Eraser Hard actually erases painted pixels and undoes cleanly.
  await setPencil(page, "#ff0000");
  await bar.locator("select#brushPreset").selectOption("Pixel Hard");
  await paintCenter(page);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  await bar.locator("select#brushPreset").selectOption("Eraser Hard");
  await expect(page.locator("gnumarus-shell")).toContainText("Preset: Eraser Hard");
  await paintCenter(page);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 0 });
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("pixel-art spray dither and palette shade @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const bar = page.locator('gnumarus-shell [data-testid="tool-options"]');
  const setEngine = (expression: string): Promise<void> =>
    page.evaluate((body: string) => {
      const root = window as unknown as { __gnumarus?: { engine?: Record<string, (value: number) => void> } };
      const engine = root.__gnumarus?.engine;
      if (engine === undefined) {
        throw new Error("engine unavailable");
      }
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      new Function("engine", body)(engine);
    }, expression);
  await setPencil(page, "#ff0000");
  // Pixel-art brushes lead the preset list.
  expect(await bar.locator("select#brushPreset option").allTextContents()).toEqual(
    expect.arrayContaining(["Pixel Hard", "Pixel Spray", "Pixel Dither", "Palette Shade"]),
  );
  const firstOptions = (await bar.locator("select#brushPreset option").allTextContents()).slice(0, 4);
  expect(firstOptions).toEqual(["Pixel Hard", "Pixel Spray", "Pixel Dither", "Palette Shade"]);

  // Solid reference: Pixel Hard at size 8.
  await loadBlankProject(page, 64);
  await bar.locator("select#brushPreset").selectOption("Pixel Hard");
  await setEngine("engine.setBrushSize(8)");
  await paintCenter(page);
  const solid = await paintedPixelCount(page);
  expect(solid).toBeGreaterThan(20);

  // Pixel Spray keeps a deterministic subset of the same stamp.
  await loadBlankProject(page, 64);
  await bar.locator("select#brushPreset").selectOption("Pixel Spray");
  await paintCenter(page);
  const sprayed = await paintedPixelCount(page);
  expect(sprayed).toBeGreaterThan(0);
  expect(sprayed).toBeLessThan(solid);

  // Pixel Dither with partial flow keeps only Bayer-passing pixels.
  await loadBlankProject(page, 64);
  await bar.locator("select#brushPreset").selectOption("Pixel Dither");
  await setEngine("engine.setBrushFlow(0.4)");
  await paintCenter(page);
  const dithered = await paintedPixelCount(page);
  expect(dithered).toBeGreaterThan(0);
  expect(dithered).toBeLessThan(solid);

  // Palette Shade paints one palette color per stroke, stepping each stroke.
  const distinctLayerColors = (): Promise<string[]> =>
    page.evaluate(() => {
      const root = window as unknown as {
        __gnumarus?: { engine?: { exportTextures(): Array<{ buffer: Uint8ClampedArray }> } };
      };
      const buffer = root.__gnumarus?.engine?.exportTextures()[0]?.buffer;
      const seen = new Set<string>();
      if (buffer !== undefined) {
        for (let index = 0; index < buffer.length; index += 4) {
          if ((buffer[index + 3] ?? 0) > 0) {
            seen.add(`${buffer[index]},${buffer[index + 1]},${buffer[index + 2]}`);
          }
        }
      }
      return [...seen];
    });
  const shadingAt = (at: number): Promise<{ r: number; g: number; b: number } | null> =>
    page.evaluate((index: number) => {
      const root = window as unknown as {
        __gnumarus?: { engine?: { getShadingPalette(): Array<{ r: number; g: number; b: number }> } };
      };
      return root.__gnumarus?.engine?.getShadingPalette()[index] ?? null;
    }, at);
  await loadBlankProject(page, 64);
  await bar.locator("select#brushPreset").selectOption("Palette Shade");
  await paintCenter(page);
  const firstStroke = await distinctLayerColors();
  expect(firstStroke.length).toBe(1);
  // A second stroke over the same spot paints exactly one new color: the next entry.
  await paintCenter(page);
  const secondStroke = await distinctLayerColors();
  expect(secondStroke.length).toBe(1);
  expect(secondStroke[0]).not.toBe(firstStroke[0]);
  const paletteFirst = await shadingAt(0);
  expect(paletteFirst).not.toBeNull();
  const firstIndex = await page.evaluate((hex: string | undefined) => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getShadingPalette(): Array<{ r: number; g: number; b: number }> } };
    };
    const list = root.__gnumarus?.engine?.getShadingPalette() ?? [];
    return list.findIndex(
      (entry) => `${entry.r},${entry.g},${entry.b}` === hex,
    );
  }, firstStroke[0]);
  expect(firstIndex).toBeGreaterThanOrEqual(0);
  const paletteLength = await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getShadingPalette(): Array<unknown> } };
    };
    return root.__gnumarus?.engine?.getShadingPalette().length ?? 0;
  });
  expect(paletteLength).toBeGreaterThan(1);
  const expectedNext = await shadingAt((firstIndex + 1) % paletteLength);
  expect(secondStroke[0]).toBe(
    `${expectedNext?.r},${expectedNext?.g},${expectedNext?.b}`,
  );

  // Re-sorting the palette panel reorders the shading sequence live.
  const before = await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getShadingPalette(): Array<{ r: number; g: number; b: number }> } };
    };
    return root.__gnumarus?.engine?.getShadingPalette().slice(0, 4) ?? [];
  });
  expect(before.length).toBe(4);
  const picker = await openPicker(page, "pencilColor");
  await picker.getByTestId("palette-toggle").click();
  const panel = picker.getByTestId("palette-panel");
  await expect(panel).toBeVisible();
  await panel.getByTestId("palette-sort").selectOption("brightness-desc");
  const after = await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getShadingPalette(): Array<{ r: number; g: number; b: number }> } };
    };
    return root.__gnumarus?.engine?.getShadingPalette().slice(0, 4) ?? [];
  });
  expect(after).not.toEqual(before);
  await page.keyboard.press("Escape");
});
