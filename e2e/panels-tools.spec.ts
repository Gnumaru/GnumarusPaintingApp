import { expect, test } from "@playwright/test";
import { layerPixelToScreen } from "../src/canvas/GnumarusViewportMath";
import { canvasBox, engineBrushSize, getViewState, layerToScreen, loadBlankProject, loadTinyLayer, openPicker, paintedPixelCount, readPixel, setBrushColor } from "./e2e-helpers";

test("menubar menus render above floating windows @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Final preview" }).click();
  const preview = page.locator("gnumarus-shell [data-testid='final-preview']");
  await expect(preview).toBeVisible();
  // Drag the window to the canvas top-left, under the File dropdown.
  const header = preview.locator(".preview-header");
  const headerBox = await header.boundingBox();
  const canvas = page.locator("gnumarus-shell canvas[data-engine]");
  const canvasBox = await canvas.boundingBox();
  if (headerBox === null || canvasBox === null) {
    throw new Error("preview header or canvas has no bounding box");
  }
  await page.mouse.move(headerBox.x + headerBox.width / 2, headerBox.y + headerBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(canvasBox.x + 40, canvasBox.y + 10, { steps: 5 });
  await page.mouse.up();
  await page.getByRole("button", { name: "File" }).click();
  const item = page.locator("gnumarus-shell").getByRole("button", { name: "Export project" });
  await expect(item).toBeVisible();
  const itemBox = await item.boundingBox();
  const previewBox = await preview.boundingBox();
  if (itemBox === null || previewBox === null) {
    throw new Error("menu item or preview has no bounding box");
  }
  const cx = itemBox.x + itemBox.width / 2;
  const cy = itemBox.y + itemBox.height / 2;
  // Guard: the geometries really overlap, or the test would pass trivially.
  expect(cx).toBeGreaterThanOrEqual(previewBox.x);
  expect(cx).toBeLessThanOrEqual(previewBox.x + previewBox.width);
  expect(cy).toBeGreaterThanOrEqual(previewBox.y);
  expect(cy).toBeLessThanOrEqual(previewBox.y + previewBox.height);
  const hit = await page.evaluate(([x, y]: [number, number]) => {
    const root = document.querySelector("gnumarus-shell")?.shadowRoot ?? null;
    const picker = root as unknown as { elementFromPoint(a: number, b: number): Element | null } | null;
    const el = picker?.elementFromPoint(x, y) as HTMLElement | null;
    if (el === null || el === undefined) {
      return "none";
    }
    return el.textContent?.trim() ?? el.tagName;
  }, [cx, cy] as [number, number]);
  expect(hit).toBe("Export project");
});

test("tool drawer flyouts render above floating windows @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Final preview" }).click();
  const preview = page.locator("gnumarus-shell [data-testid='final-preview']");
  await expect(preview).toBeVisible();
  await page.locator('gnumarus-shell [data-testid="paint-drawer"] > button').click({ button: "right" });
  const flyout = page.locator('gnumarus-shell [data-testid="paint-flyout"]');
  await expect(flyout).toBeVisible();
  const flyBox = await flyout.boundingBox();
  if (flyBox === null) {
    throw new Error("flyout has no bounding box");
  }
  // Drag the window over the flyout center (clicks land on the window, which
  // sits above the drawer blocker, so the flyout stays open).
  const header = preview.locator(".preview-header");
  const headerBox = await header.boundingBox();
  const previewBoxBefore = await preview.boundingBox();
  if (headerBox === null || previewBoxBefore === null) {
    throw new Error("preview header or window has no bounding box");
  }
  const targetX = flyBox.x + flyBox.width / 2;
  const targetY = flyBox.y + flyBox.height / 2;
  await page.mouse.move(headerBox.x + headerBox.width / 2, headerBox.y + headerBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    headerBox.x + headerBox.width / 2 + (targetX - 50 - previewBoxBefore.x),
    headerBox.y + headerBox.height / 2 + (targetY - 50 - previewBoxBefore.y),
    { steps: 5 },
  );
  await page.mouse.up();
  await expect(flyout).toBeVisible();
  const previewBox = await preview.boundingBox();
  if (previewBox === null) {
    throw new Error("preview has no bounding box");
  }
  const cx = flyBox.x + flyBox.width / 2;
  const cy = flyBox.y + flyBox.height / 2;
  // Guard: the geometries really overlap, or the test would pass trivially.
  expect(cx).toBeGreaterThanOrEqual(previewBox.x);
  expect(cx).toBeLessThanOrEqual(previewBox.x + previewBox.width);
  expect(cy).toBeGreaterThanOrEqual(previewBox.y);
  expect(cy).toBeLessThanOrEqual(previewBox.y + previewBox.height);
  const hit = await page.evaluate(([x, y]: [number, number]) => {
    const root = document.querySelector("gnumarus-shell")?.shadowRoot ?? null;
    const picker = root as unknown as { elementFromPoint(a: number, b: number): Element | null } | null;
    const el = picker?.elementFromPoint(x, y) as HTMLElement | null;
    if (el === null || el === undefined) {
      return "none";
    }
    return el.closest('[data-testid="paint-flyout"]') !== null ? "flyout" : el.tagName;
  }, [cx, cy] as [number, number]);
  expect(hit).toBe("flyout");
});

test("new project dialog defaults to digital painting lossless @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell");
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "New Project" }).click();
  const dialog = page.locator("gnumarus-shell dialog#newDialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("select#newPreset")).toHaveValue("digital painting lossless");
  await expect(dialog.locator("input#newWidth")).toHaveValue("1920");
  await expect(dialog.locator("input#newHeight")).toHaveValue("1080");
  await expect(dialog.locator("select#newStorageFormat")).toHaveValue("jxl");
  await expect(dialog.locator("select#newStorageMode")).toHaveValue("lossless");
  await expect(dialog.locator("input#newStorageQuality")).toHaveCount(0);
});

test("brush size ceiling defaults to 512 and is configurable up to 2048 @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const maxOf = (): Promise<number> =>
    page.evaluate(() => {
      const root = window as unknown as { __gnumarus?: { engine?: { getMaxBrushSize(): number } } };
      return root.__gnumarus?.engine?.getMaxBrushSize() ?? -1;
    });
  await expect(maxOf()).resolves.toBe(512);
  await expect(page.locator("gnumarus-shell input#brushSize")).toHaveAttribute("max", "512");
  // A size above the old hardcoded 64 now sticks.
  await page.locator("gnumarus-shell input#brushSize").fill("500");
  await expect(engineBrushSize(page)).resolves.toBe(500);
  // Raise the ceiling through the Settings dialog.
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  const settings = page.locator("gnumarus-shell dialog#settingsDialog");
  await settings.locator("input#brushMaxSize").fill("1024");
  await expect(maxOf()).resolves.toBe(1024);
  await expect(page.locator("gnumarus-shell input#brushSize")).toHaveAttribute("max", "1024");
  const persisted = await page.evaluate(() => window.localStorage.getItem("gnumarus.settings.brush.v1"));
  expect(persisted).toContain('"maxBrushSize": 1024');
  await settings.locator("input#brushMaxSize").fill("9999");
  await expect(maxOf()).resolves.toBe(2048);
  await settings.locator("input#brushMaxSize").fill("64");
  await expect(maxOf()).resolves.toBe(64);
  await settings.getByRole("button", { name: "Reset maximum brush size to default" }).click();
  await expect(maxOf()).resolves.toBe(512);
  await settings.getByRole("button", { name: "Close" }).click();
  // Painting with a large brush covers far more than a 64px brush could
  // (a 64px disk paints ~3k pixels; a 500px disk paints ~200k).
  await page.locator("gnumarus-shell input#brushSize").fill("500");
  await expect(engineBrushSize(page)).resolves.toBe(500);
  await page.getByRole("button", { name: "Brush", exact: true }).click();
  const center = await canvasBox(page);
  await page.mouse.click(center.x + center.width / 2, center.y + center.height / 2);
  expect(await paintedPixelCount(page)).toBeGreaterThan(100000);
});

test("hsv triangle clamps outside picks to its edges @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const picker = await openPicker(page, "brushColor");
  const triangle = picker.getByTestId("hsv-triangle");
  const box = await triangle.boundingBox();
  if (box === null) {
    throw new Error("hsv triangle has no bounding box");
  }
  const toClient = (lx: number, ly: number): { x: number; y: number } => ({
    // The svg viewBox is 136x136 mapped 1:1 onto its CSS box.
    x: box.x + (lx / 136) * box.width,
    y: box.y + (ly / 136) * box.height,
  });
  // Click the pure-hue corner: exact red follows.
  const hue = toClient(126.89, 34);
  await page.mouse.click(hue.x, hue.y);
  expect(await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { colorValue: string } } };
    return root.__gnumarus?.shell?.colorValue ?? "";
  })).toBe("#ff0000");
  // Click far outside the triangle (bottom-right of the box): the pick must
  // land on the nearest triangle edge instead of the raw box point.
  const outside = toClient(130, 130);
  await page.mouse.click(outside.x, outside.y);
  const result = await page.evaluate(() => {
    const root = document.querySelector("gnumarus-shell")?.shadowRoot ?? null;
    const picker = root?.querySelector("#brushColor") as unknown as {
      shadowRoot: ShadowRoot | null;
    } | null;
    const inner = picker?.shadowRoot ?? null;
    const wheel = inner?.querySelector(".hsv-wheel") as HTMLElement | null;
    const thumb = inner?.querySelector('[data-testid="hsv-tri-thumb"]') as HTMLElement | null;
    if (wheel === null || thumb === null) {
      return null;
    }
    const wb = wheel.getBoundingClientRect();
    const tb = thumb.getBoundingClientRect();
    // Thumb center in triangle-local coords (triangle starts at 32,32).
    const px = tb.left + tb.width / 2 - wb.left - 32;
    const py = tb.top + tb.height / 2 - wb.top - 32;
    // Distance to the hue-black edge (126.89,34)-(68,136).
    const ax = 126.89;
    const ay = 34;
    const bx = 68;
    const by = 136;
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  });
  expect(result).not.toBeNull();
  expect(result ?? 999).toBeLessThan(1.5);
});

test("recent colors update once per picker gesture @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const picker = await openPicker(page, "brushColor");
  const triangle = picker.getByTestId("hsv-triangle");
  const box = await triangle.boundingBox();
  if (box === null) {
    throw new Error("hsv triangle has no bounding box");
  }
  // Drag across the triangle: many live colors, a single recent on release.
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.3);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.7, { steps: 10 });
  await page.mouse.up();
  const recents = picker.getByTestId("recent-swatch");
  await expect(recents).toHaveCount(1);
});

test("right-click on canvas opens the paint color picker @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const canvas = page.locator("gnumarus-shell canvas[data-engine]");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: "right" });
  const picker = page.locator("gnumarus-shell #brushColor");
  await expect(picker.getByRole("dialog", { name: "Color picker" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(picker.getByRole("dialog", { name: "Color picker" })).toBeHidden();
});

test("X swaps the foreground and background paint colors @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  const colorsOf = (): Promise<{ fg: string; bg: string; engine: number[] | null }> =>
    page.evaluate(() => {
      const root = window as unknown as {
        __gnumarus?: {
          shell?: { colorValue: string; secondaryColorValue: string };
          engine?: { readPixel(x: number, y: number): { r: number; g: number; b: number; a: number } | null };
        };
      };
      return {
        fg: root.__gnumarus?.shell?.colorValue ?? "",
        bg: root.__gnumarus?.shell?.secondaryColorValue ?? "",
        engine: null,
      };
    });
  expect(await colorsOf()).toMatchObject({ fg: "#000000", bg: "#ffffff" });
  await page.keyboard.press("x");
  expect(await colorsOf()).toMatchObject({ fg: "#ffffff", bg: "#000000" });
  // Painting uses the new foreground color.
  await setBrushColor(page, "#ff0000");
  await page.keyboard.press("x");
  expect(await colorsOf()).toMatchObject({ fg: "#000000", bg: "#ff0000" });
  const center = await layerToScreen(page, 32, 32);
  await page.mouse.click(center.x, center.y);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  // The back well edits the background instead of swapping.
  await page.locator("gnumarus-shell [data-testid='bg-well']").click();
  const paintPicker = page.locator("gnumarus-shell #brushColor");
  await expect(paintPicker.getByRole("dialog", { name: "Color picker" })).toBeVisible();
  expect(await colorsOf()).toMatchObject({ fg: "#000000", bg: "#ff0000" });
  await page.keyboard.press("Escape");
  // Only the corner arrows swap now.
  await page.locator("gnumarus-shell [data-testid='swap-colors']").click();
  expect(await colorsOf()).toMatchObject({ fg: "#ff0000", bg: "#000000" });
  // The text tool lost its letter key but still opens from the toolbar.
  await page.locator("gnumarus-shell [data-testid='tool-text']").click();
  await expect(page.locator("gnumarus-shell")).toContainText("text");
});

test("image palette panel opens with the default palette and sorts @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const picker = await openPicker(page, "brushColor");
  const toggle = picker.getByTestId("palette-toggle");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  const panel = picker.getByTestId("palette-panel");
  await expect(panel).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  const swatches = panel.getByTestId("palette-swatch");
  await expect(swatches).toHaveCount(120);
  // Default sort is custom: sheet order (grayscale ramp first).
  await expect(panel.getByTestId("palette-sort")).toHaveValue("custom");
  expect(await swatches.first().getAttribute("data-hex")).toBe("#ffffff");
  // The grid lays out 12 swatches per row.
  const tops: number[] = [];
  for (let index = 0; index < 13; index += 1) {
    const box = await swatches.nth(index).boundingBox();
    if (box === null) {
      throw new Error("palette swatch has no bounding box");
    }
    tops.push(Math.round(box.y));
  }
  expect(new Set(tops.slice(0, 12)).size).toBe(1);
  expect(tops[12]).toBeGreaterThan(tops[0]);
  const firstHue = await swatches.first().getAttribute("data-hex");
  await panel.getByTestId("palette-sort").selectOption("brightness-asc");
  const firstDark = await panel.getByTestId("palette-swatch").first().getAttribute("data-hex");
  // Black is the darkest entry, proving the sort reordered the sheet.
  expect(firstDark).toBe("#000000");
  expect(firstDark).not.toBe(firstHue);
  expect(await panel.getByTestId("palette-swatch").count()).toBe(120);
  await toggle.click();
  await expect(panel).toBeHidden();
});

test("image palette panel loads an image palette and picks from it @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const picker = await openPicker(page, "brushColor");
  await picker.getByTestId("palette-toggle").click();
  const panel = picker.getByTestId("palette-panel");
  await expect(panel).toBeVisible();
  // 2x2 PNG painted in-page: red/green top row, blue/white bottom row.
  await page.evaluate(() => {
    const root = window as unknown as {
      showOpenFilePicker?: () => Promise<Array<{ getFile(): Promise<File> }>>;
    };
    root.showOpenFilePicker = async () => [
      {
        getFile: async () => {
          const canvas = new OffscreenCanvas(2, 2);
          const ctx = canvas.getContext("2d");
          if (ctx === null) {
            throw new Error("no 2d context");
          }
          ctx.fillStyle = "#ff0000";
          ctx.fillRect(0, 0, 1, 1);
          ctx.fillStyle = "#00ff00";
          ctx.fillRect(1, 0, 1, 1);
          ctx.fillStyle = "#0000ff";
          ctx.fillRect(0, 1, 1, 1);
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(1, 1, 1, 1);
          const blob = await canvas.convertToBlob({ type: "image/png" });
          return new File([blob], "pal.png", { type: "image/png" });
        },
      },
    ];
  });
  await panel.getByTestId("palette-open").click();
  const swatches = panel.getByTestId("palette-swatch");
  await expect(swatches).toHaveCount(4);
  await swatches.first().click();
  expect(await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { colorValue: string } } };
    return root.__gnumarus?.shell?.colorValue ?? "";
  })).toBe(await swatches.first().getAttribute("data-hex"));
});

test("large hard brush keeps V shape instead of collapsing to endpoints @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Brush", exact: true }).click();
  await loadTinyLayer(page, 64);
  await setBrushColor(page, "#000000");
  await page.locator("gnumarus-shell input#brushSize").fill("32");
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
    layerPixelToScreen(lx, ly, rect, 64, 64, view, layer);
  const a = at(10, 10);
  const b = at(32, 50);
  const c = at(54, 10);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 12 });
  await page.mouse.move(c.x, c.y, { steps: 12 });
  await page.mouse.up();
  // Joint of the V is painted: the stroke did not collapse to a straight A->C line.
  expect(await readPixel(page, 32, 50)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 10, 10)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 54, 10)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
});

test("front well opens the picker editing the foreground @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  const colorsOf = (): Promise<{ fg: string; bg: string }> =>
    page.evaluate(() => {
      const root = window as unknown as {
        __gnumarus?: { shell?: { colorValue: string; secondaryColorValue: string } };
      };
      return {
        fg: root.__gnumarus?.shell?.colorValue ?? "",
        bg: root.__gnumarus?.shell?.secondaryColorValue ?? "",
      };
    });
  await page.locator("gnumarus-shell [data-testid='fg-well']").click();
  const picker = page.locator("gnumarus-shell #brushColor");
  await expect(picker.getByRole("dialog", { name: "Color picker" })).toBeVisible();
  await picker.locator("#hexInput").fill("#00ff00");
  expect(await colorsOf()).toMatchObject({ fg: "#00ff00", bg: "#ffffff" });
  await page.keyboard.press("Escape");
  // Painting uses the edited foreground.
  const center = await layerToScreen(page, 32, 32);
  await page.mouse.click(center.x, center.y);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 255, b: 0, a: 255 });
});

test("back well opens the picker editing the background @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  const colorsOf = (): Promise<{ fg: string; bg: string }> =>
    page.evaluate(() => {
      const root = window as unknown as {
        __gnumarus?: { shell?: { colorValue: string; secondaryColorValue: string } };
      };
      return {
        fg: root.__gnumarus?.shell?.colorValue ?? "",
        bg: root.__gnumarus?.shell?.secondaryColorValue ?? "",
      };
    });
  await page.locator("gnumarus-shell [data-testid='bg-well']").click();
  const picker = page.locator("gnumarus-shell #brushColor");
  await expect(picker.getByRole("dialog", { name: "Color picker" })).toBeVisible();
  await picker.locator("#hexInput").fill("#0000ff");
  expect(await colorsOf()).toMatchObject({ fg: "#000000", bg: "#0000ff" });
  await page.keyboard.press("Escape");
  // Painting still uses the untouched foreground.
  const center = await layerToScreen(page, 32, 32);
  await page.mouse.click(center.x, center.y);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
});

test("right-click with brush shows the brush settings side panel @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const canvas = page.locator("gnumarus-shell canvas[data-engine]");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: "right" });
  const picker = page.locator("gnumarus-shell #brushColor");
  await expect(picker.getByRole("dialog", { name: "Color picker" })).toBeVisible();
  const panel = picker.locator("[data-testid='brush-side-panel']");
  await expect(panel).toBeVisible();
  // Full brush settings, minus the preset manager fields.
  await expect(panel.locator("select#brushPresetPanel")).toBeVisible();
  await expect(panel.locator("input#brushSizePanel")).toBeVisible();
  await expect(panel.getByRole("button", { name: "Presets", exact: true })).toBeVisible();
  await expect(panel.locator("input#presetNameDialog")).toHaveCount(0);
  await expect(panel.getByRole("button", { name: "Save", exact: true })).toHaveCount(0);
  await expect(panel.getByRole("button", { name: "Delete", exact: true })).toHaveCount(0);
  await expect(panel.getByRole("button", { name: "Export", exact: true })).toHaveCount(0);
  await expect(panel.getByRole("button", { name: "Import", exact: true })).toHaveCount(0);
  // Panel edits apply to the brush like the toolbar does.
  await panel.locator("input#brushSizePanel").fill("7");
  await expect(page.locator("gnumarus-shell")).toContainText("Brush size: 1 – 7");
  await expect(panel.locator("select#brushPresetPanel")).toContainText("Soft Round");
  await panel.locator("select#brushPresetPanel").selectOption("Soft Round");
  await expect(page.locator("gnumarus-shell")).toContainText("Preset: Soft Round");
  await expect(panel.locator("input#brushSizePanel")).toHaveValue("16");
  // The presets button opens the manager dialog.
  await panel.getByRole("button", { name: "Presets", exact: true }).click();
  await expect(page.locator('gnumarus-shell dialog[data-testid="brush-preset-dialog"]')).toBeVisible();
  await page.keyboard.press("Escape");
});

test("right-click without brush shows no brush side panel @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  const canvas = page.locator("gnumarus-shell canvas[data-engine]");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: "right" });
  const picker = page.locator("gnumarus-shell #brushColor");
  await expect(picker.getByRole("dialog", { name: "Color picker" })).toBeVisible();
  await expect(picker.locator("[data-testid='brush-side-panel']")).toHaveCount(0);
  await page.keyboard.press("Escape");
});

test("palette panel keeps the central picker width @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const picker = await openPicker(page, "brushColor");
  const main = picker.locator(".popup-main");
  const before = await main.boundingBox();
  if (before === null) {
    throw new Error("popup main has no bounding box");
  }
  await picker.getByTestId("palette-toggle").click();
  const panel = picker.getByTestId("palette-panel");
  await expect(panel).toBeVisible();
  const after = await main.boundingBox();
  if (after === null) {
    throw new Error("popup main has no bounding box after opening the palette");
  }
  expect(after.width).toBeCloseTo(before.width, 0);
  // The palette grid sits beside the central panel, never over the channel rows.
  const gridBox = await panel.getByTestId("palette-grid").boundingBox();
  const axisBox = await picker.locator(".axis-row").first().boundingBox();
  if (gridBox === null || axisBox === null) {
    throw new Error("palette grid or axis row has no bounding box");
  }
  expect(gridBox.x).toBeGreaterThanOrEqual(axisBox.x + axisBox.width - 1);
  await picker.getByTestId("palette-toggle").click();
  await expect(panel).toBeHidden();
  const closed = await main.boundingBox();
  if (closed === null) {
    throw new Error("popup main has no bounding box after closing the palette");
  }
  expect(closed.width).toBeCloseTo(before.width, 0);
  await page.keyboard.press("Escape");
});

test("palette swatches reorder by drag and drop, switching sort to custom @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  // Shading follows the displayed order, so the engine echoes the new order.
  const bar = page.locator('gnumarus-shell [data-testid="tool-options"]');
  await bar.locator("select#brushColorMode").selectOption("palette");
  const picker = await openPicker(page, "brushColor");
  await picker.getByTestId("palette-toggle").click();
  const panel = picker.getByTestId("palette-panel");
  await expect(panel).toBeVisible();
  const swatches = panel.getByTestId("palette-swatch");
  const orderOf = (): Promise<string[]> =>
    swatches.evaluateAll((elements) => elements.map((element) => element.getAttribute("data-hex") ?? ""));
  const before = await orderOf();
  expect(before.length).toBeGreaterThan(3);
  const firstBox = await swatches.nth(0).boundingBox();
  const thirdBox = await swatches.nth(2).boundingBox();
  if (firstBox === null || thirdBox === null) {
    throw new Error("palette swatch has no bounding box");
  }
  await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(thirdBox.x + thirdBox.width / 2, thirdBox.y + thirdBox.height / 2, { steps: 12 });
  await page.mouse.up();
  await expect(panel.getByTestId("palette-sort")).toHaveValue("custom");
  const after = await orderOf();
  expect(after[2]).toBe(before[0]);
  expect(after[0]).toBe(before[1]);
  expect(after[1]).toBe(before[2]);
  // A plain click still picks a color (the drag did not swallow it permanently).
  await swatches.nth(0).click();
  // The engine shading sequence tracks the displayed order.
  const engineOrder = await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getShadingPalette(): Array<{ r: number; g: number; b: number }> } };
    };
    const toHex = (entry: { r: number; g: number; b: number }): string =>
      `#${entry.r.toString(16).padStart(2, "0")}${entry.g.toString(16).padStart(2, "0")}${entry.b.toString(16).padStart(2, "0")}`;
    return (root.__gnumarus?.engine?.getShadingPalette() ?? []).slice(0, 3).map(toHex);
  });
  expect(engineOrder).toEqual(after.slice(0, 3));
  await page.keyboard.press("Escape");
});

test("brush settings side panel collapses and expands with the top-left arrow @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const canvas = page.locator("gnumarus-shell canvas[data-engine]");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: "right" });
  const picker = page.locator("gnumarus-shell #brushColor");
  await expect(picker.getByRole("dialog", { name: "Color picker" })).toBeVisible();
  const panel = picker.locator("[data-testid='brush-side-panel']");
  await expect(panel).toBeVisible();
  const toggle = picker.getByTestId("brush-toggle");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await toggle.click();
  await expect(panel).toBeHidden();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await expect(panel).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  // Brush settings still apply after re-expanding.
  await panel.locator("select#brushColorModePanel").selectOption("palette");
  const colorMode = await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getBrushColorMode(): string } };
    };
    return root.__gnumarus?.engine?.getBrushColorMode() ?? "";
  });
  expect(colorMode).toBe("palette");
  await page.keyboard.press("Escape");
});

test("brush collapse arrow never overlaps the first brush field @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const canvas = page.locator("gnumarus-shell canvas[data-engine]");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: "right" });
  const picker = page.locator("gnumarus-shell #brushColor");
  await expect(picker.getByRole("dialog", { name: "Color picker" })).toBeVisible();
  const toggleBox = await picker.getByTestId("brush-toggle").boundingBox();
  const labelBox = await picker.locator("[data-testid='brush-side-panel'] label").first().boundingBox();
  if (toggleBox === null || labelBox === null) {
    throw new Error("brush toggle or first field has no bounding box");
  }
  const intersects =
    toggleBox.x < labelBox.x + labelBox.width &&
    toggleBox.x + toggleBox.width > labelBox.x &&
    toggleBox.y < labelBox.y + labelBox.height &&
    toggleBox.y + toggleBox.height > labelBox.y;
  expect(intersects).toBe(false);
  await page.keyboard.press("Escape");
});
