import { expect, test } from "@playwright/test";
import { gzipSync } from "fflate";
import { FILTER_SVG, SIMPLE_SVG, cellSvgId, cellTextId, paintCenter, setSvgStorage, stubProjectDirectory, stubSvgPicker, textHtml, textPaintedPixels } from "./e2e-helpers";

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
