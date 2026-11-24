import { expect, test } from "@playwright/test";
import { addAnimation, addFrames, exportedFile, exportedSheetPixels, loadBlankProject, paintCenter, setEmptyCellHold, stubProjectDirectory, stubSaveFilePicker } from "./e2e-helpers";

async function openSheetTab(page: import("@playwright/test").Page): Promise<import("@playwright/test").Locator> {
  await page.getByRole("button", { name: "File" }).click();
  await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Export" }).click();
  const dialog = page.locator("gnumarus-shell dialog#exportDialog");
  await expect(dialog).toBeVisible();
  await dialog.locator('[data-testid="export-tab-sheet"]').click();
  return dialog;
}

test("spritesheet animations select through a multi-select", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await setEmptyCellHold(page, false);
  await addFrames(page, 2);
  await addAnimation(page, "a,none,1,2");
  await addAnimation(page, "b,none,3");
  await page.locator('gnumarus-shell [data-testid="anim-frame"][data-frame="0"]').click();
  await paintCenter(page);
  await stubSaveFilePicker(page);
  const dialog = await openSheetTab(page);
  const select = dialog.locator("#exportSheetAnimations");
  await expect(select).toHaveJSProperty("multiple", true);
  await expect(select.locator("option")).toHaveText(["a", "b"]);
  // The old per-animation checkbox list is gone; the all-frames checkbox stays.
  await expect(dialog.locator("#exportSheetAnimations option")).toHaveCount(2);
  await expect(dialog.locator("#exportSheetAll")).toBeVisible();
  await select.selectOption(["a", "b"]);
  await dialog.locator("select#exportSheetLayout").selectOption("per-line");
  await dialog.getByRole("checkbox", { name: "Export animation data" }).uncheck();
  await dialog.locator("#exportSheetOk").click();
  await expect(page.locator("gnumarus-shell")).toContainText("Exported");
  const sheet = await exportedSheetPixels(page);
  expect(sheet?.width).toBe(128);
  expect(sheet?.height).toBe(128);
  expect(sheet?.cells[0]).toEqual([0, 0, 0, 255]);
  expect(sheet?.cells[1]).toEqual([0, 0, 0, 0]);
  expect(sheet?.cells[2]).toEqual([0, 0, 0, 0]);
});

test("wide spritesheet packs round columns up, narrow packs down", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await addFrames(page, 2);
  await page.locator('gnumarus-shell [data-testid="anim-frame"][data-frame="0"]').click();
  await paintCenter(page);
  await stubSaveFilePicker(page);
  const exportPacked = async (): Promise<{ width?: number; height?: number } | null> => {
    await page.getByRole("button", { name: "File" }).click();
    await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Export" }).click();
    const dialog = page.locator("gnumarus-shell dialog#exportDialog");
    await expect(dialog).toBeVisible();
    await dialog.locator('[data-testid="export-tab-sheet"]').click();
    await dialog.getByRole("checkbox", { name: "All frames" }).check();
    await dialog.locator("select#exportSheetLayout").selectOption("packed");
    await dialog.getByRole("checkbox", { name: "Export animation data" }).uncheck();
    await dialog.locator("#exportSheetOk").click();
    await expect(page.locator("gnumarus-shell")).toContainText("Exported");
    return exportedFile(page);
  };
  // Wide (default): 3 frames pack into 2 columns x 2 rows.
  const wide = await exportPacked();
  expect(wide?.width).toBe(128);
  expect(wide?.height).toBe(128);
  // Let the first toast expire so the next export's completion is fresh.
  await expect(page.locator('gnumarus-shell [data-testid="toast"]')).toBeHidden();
  // Narrow: 3 frames pack into 1 column x 3 rows.
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { setWideSpritesheetPacks(v: boolean): void } } };
    root.__gnumarus?.shell?.setWideSpritesheetPacks(false);
  });
  await exportPacked();
  // Poll the file itself: the success toast also matches hidden text,
  // so only the new blob proves the second export landed.
  await expect
    .poll(async () => (await exportedFile(page))?.width, { timeout: 15000 })
    .toBe(64);
  const narrow = await exportedFile(page);
  expect(narrow?.width).toBe(64);
  expect(narrow?.height).toBe(192);
});

test("fixed columns shrink to content unless full size is ensured", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintCenter(page);
  await stubSaveFilePicker(page);
  const exportFixed = async (): Promise<void> => {
    const dialog = await openSheetTab(page);
    await dialog.getByRole("checkbox", { name: "All frames" }).check();
    await dialog.locator("select#exportSheetLayout").selectOption("fixed-cols");
    await dialog.locator("#exportSheetCount").fill("9");
  };
  // Default (unchecked): the fixed count is a maximum, so one frame stays 64x64.
  await exportFixed();
  const dialog = page.locator('gnumarus-shell dialog#exportDialog');
  await expect(dialog.getByRole("checkbox", { name: "Ensure full size" })).not.toBeChecked();
  await expect(dialog.getByRole("checkbox", { name: "Ensure full size" })).toBeVisible();
  await dialog.getByRole("checkbox", { name: "Export animation data" }).uncheck();
  await dialog.locator("#exportSheetOk").click();
  await expect(page.locator("gnumarus-shell")).toContainText("Exported");
  expect((await exportedFile(page))?.width).toBe(64);
  expect((await exportedFile(page))?.height).toBe(64);
  await expect(page.locator('gnumarus-shell [data-testid="toast"]')).toBeHidden();
  // Checked: the 9-column grid is kept, so one 64px frame exports as 576x64.
  await exportFixed();
  await page
    .locator('gnumarus-shell dialog#exportDialog')
    .getByRole("checkbox", { name: "Ensure full size" })
    .check();
  await dialog.getByRole("checkbox", { name: "Export animation data" }).uncheck();
  await page.locator('gnumarus-shell dialog#exportDialog').locator("#exportSheetOk").click();
  await expect
    .poll(async () => (await exportedFile(page))?.width, { timeout: 15000 })
    .toBe(576);
  expect((await exportedFile(page))?.height).toBe(64);
});

test("animation data defaults checked and hides for individual frames", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  const dialog = await openSheetTab(page);
  const box = dialog.getByRole("checkbox", { name: "Export animation data" });
  await expect(box).toBeVisible();
  await expect(box).toBeChecked();
  await dialog.locator("select#exportSheetLayout").selectOption("individual");
  await expect(box).toBeHidden();
  await dialog.locator("select#exportSheetLayout").selectOption("line");
  await expect(box).toBeVisible();
});

test("checked animation data saves the sheet plus a JSON sidecar", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await setEmptyCellHold(page, false);
  await addFrames(page, 2);
  await addAnimation(page, "walk,none,1-3");
  await page.locator('gnumarus-shell [data-testid="anim-frame"][data-frame="0"]').click();
  await paintCenter(page);
  // Explicit duration on frame 2 (1-based) exercises the override path.
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { setFrameDuration(f: number, s: number | null): boolean } } };
    root.__gnumarus?.engine?.setFrameDuration(1, 0.5);
  });
  const project = await stubProjectDirectory(page, "SheetDir");
  page.on("dialog", (dialog) => void dialog.accept("my-sheet"));
  const dialog = await openSheetTab(page);
  await expect(dialog.getByRole("checkbox", { name: "Export animation data" })).toBeChecked();
  await dialog.locator("#exportSheetAnimations").selectOption(["walk"]);
  await dialog.locator("select#exportSheetLayout").selectOption("line");
  await dialog.locator("#exportSheetOk").click();
  await expect(page.locator("gnumarus-shell")).toContainText("Exported 2 files to SheetDir");
  const written = await project.writtenBlobs();
  expect(Object.keys(written).sort()).toEqual(["my-sheet.json", "my-sheet.png"]);
  const sidecar = JSON.parse(new TextDecoder().decode(new Uint8Array(written["my-sheet.json"] ?? []))) as {
    texture: { w: number; h: number };
    frames: Record<string, { x: number; y: number; w: number; h: number; ox: number; oy: number }>;
    animations: Record<string, { name: string; frames: Array<{ frame: number; secs: number }> }>;
  };
  expect(sidecar.texture).toEqual({ w: 192, h: 64 });
  expect(sidecar.frames).toEqual({
    "1": { x: 0, y: 0, w: 64, h: 64, ox: 0, oy: 0 },
    "2": { x: 64, y: 0, w: 64, h: 64, ox: 0, oy: 0 },
    "3": { x: 128, y: 0, w: 64, h: 64, ox: 0, oy: 0 },
  });
  expect(sidecar.animations.walk).toEqual({
    name: "walk",
    frames: [
      { frame: 1, secs: 0.25 },
      { frame: 2, secs: 0.5 },
      { frame: 3, secs: 0.25 },
    ],
  });
  // The PNG went to the same directory with the prompted stem.
  expect((written["my-sheet.png"] ?? []).length).toBeGreaterThan(100);
});

test("dismissing the sheet name prompt cancels without writing", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintCenter(page);
  const project = await stubProjectDirectory(page, "SheetDir");
  page.on("dialog", (dialog) => void dialog.dismiss());
  const dialog = await openSheetTab(page);
  await dialog.getByRole("checkbox", { name: "All frames" }).check();
  await dialog.locator("#exportSheetOk").click();
  await expect(page.locator("gnumarus-shell dialog#exportDialog")).toBeHidden();
  expect(await project.writtenBlobs()).toEqual({});
});

type SheetSidecar = {
  texture: { w: number; h: number };
  frames: Record<string, { x: number; y: number; w: number; h: number; ox: number; oy: number }>;
  animations: Record<string, { name: string; frames: Array<{ frame: number; secs: number }> }>;
};

function parseSidecar(written: Record<string, number[]>, name: string): SheetSidecar {
  const bytes = written[`${name}.json`] ?? [];
  return JSON.parse(new TextDecoder().decode(new Uint8Array(bytes))) as SheetSidecar;
}

/** Sample alpha values at texture points from a written PNG blob. */
async function sampleSheetAlpha(
  page: import("@playwright/test").Page,
  written: Record<string, number[]>,
  name: string,
  points: Array<[number, number]>,
): Promise<number[]> {
  return page.evaluate(
    async ({ bytes, samplePoints }: { bytes: number[]; samplePoints: Array<[number, number]> }) => {
      const blob = new Blob([new Uint8Array(bytes)], { type: "image/png" });
      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d") as CanvasRenderingContext2D;
      context.drawImage(bitmap, 0, 0);
      const alphas = samplePoints.map(([x, y]) => context.getImageData(x, y, 1, 1).data[3] as number);
      bitmap.close();
      return alphas;
    },
    { bytes: written[`${name}.png`] ?? [], samplePoints: points },
  );
}

test("sheet trim defaults to none and hides for individual frames", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  const dialog = await openSheetTab(page);
  const trim = dialog.locator("#exportSheetTrim");
  await expect(trim).toBeVisible();
  await expect(trim).toHaveValue("none");
  await expect(trim.locator("option")).toHaveCount(3);
  expect(
    await trim.evaluate((select: HTMLSelectElement) => Array.from(select.options).map((option) => option.value)),
  ).toEqual(["none", "uniform", "individual"]);
  await dialog.locator("select#exportSheetLayout").selectOption("individual");
  await expect(trim).toBeHidden();
  await dialog.locator("select#exportSheetLayout").selectOption("line");
  await expect(trim).toBeVisible();
});

test("uniform trim crops every frame to the common box with shared offsets", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await page.locator('gnumarus-shell [data-testid="anim-frame"][data-frame="0"]').click();
  await paintCenter(page);
  const project = await stubProjectDirectory(page, "SheetDir");
  page.on("dialog", (dialog) => void dialog.accept("uniform-sheet"));
  const dialog = await openSheetTab(page);
  await dialog.getByRole("checkbox", { name: "All frames" }).check();
  await dialog.locator("#exportSheetTrim").selectOption("uniform");
  await expect(dialog.getByRole("checkbox", { name: "Export animation data" })).toBeChecked();
  await dialog.locator("#exportSheetOk").click();
  await expect(page.locator("gnumarus-shell")).toContainText("Exported 2 files to SheetDir");
  const written = await project.writtenBlobs();
  expect(Object.keys(written).sort()).toEqual(["uniform-sheet.json", "uniform-sheet.png"]);
  const sidecar = parseSidecar(written, "uniform-sheet");
  const frame = sidecar.frames["1"];
  expect(frame.x).toBe(0);
  expect(frame.y).toBe(0);
  // A single center dot crops to a box much smaller than the 64px frame.
  expect(frame.w).toBeLessThan(64);
  expect(frame.h).toBeLessThan(64);
  expect(frame.ox).toBeGreaterThan(0);
  expect(frame.oy).toBeGreaterThan(0);
  expect(sidecar.texture).toEqual({ w: frame.w, h: frame.h });
  // The cropped dot lands in the texture middle: opaque center, and the
  // texture holds far fewer pixels than the full 64x64 frame.
  const [center, opaqueCount] = await page.evaluate(
    async ({ bytes, cx, cy }: { bytes: number[]; cx: number; cy: number }) => {
      const blob = new Blob([new Uint8Array(bytes)], { type: "image/png" });
      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d") as CanvasRenderingContext2D;
      context.drawImage(bitmap, 0, 0);
      const data = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
      let opaque = 0;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] !== 0) {
          opaque += 1;
        }
      }
      const centerAlpha = context.getImageData(cx, cy, 1, 1).data[3] as number;
      bitmap.close();
      return [centerAlpha, opaque];
    },
    { bytes: written["uniform-sheet.png"] ?? [], cx: Math.floor(frame.w / 2), cy: Math.floor(frame.h / 2) },
  );
  expect(center).toBe(255);
  expect(opaqueCount).toBeGreaterThan(0);
  expect(opaqueCount).toBeLessThan(64 * 64);
});

test("individual trim packs each cropped frame with its own offset", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await setEmptyCellHold(page, false);
  await addFrames(page, 2);
  // Dots on frames 1 and 3 (1-based); frame 2 stays fully transparent
  // (empty-cell hold is off so it composites to nothing).
  await page.locator('gnumarus-shell [data-testid="anim-frame"][data-frame="0"]').click();
  await paintCenter(page);
  await page.locator('gnumarus-shell [data-testid="anim-frame"][data-frame="2"]').click();
  await paintCenter(page);
  const project = await stubProjectDirectory(page, "SheetDir");
  page.on("dialog", (dialog) => void dialog.accept("packed-sheet"));
  const dialog = await openSheetTab(page);
  await dialog.getByRole("checkbox", { name: "All frames" }).check();
  await dialog.locator("#exportSheetTrim").selectOption("individual");
  await expect(dialog.getByRole("checkbox", { name: "Export animation data" })).toBeChecked();
  await dialog.locator("#exportSheetOk").click();
  await expect(page.locator("gnumarus-shell")).toContainText("Exported 2 files to SheetDir");
  const written = await project.writtenBlobs();
  expect(Object.keys(written).sort()).toEqual(["packed-sheet.json", "packed-sheet.png"]);
  const sidecar = parseSidecar(written, "packed-sheet");
  // All three frames are listed, each with its own crop offset.
  expect(Object.keys(sidecar.frames).sort()).toEqual(["1", "2", "3"]);
  for (const key of ["1", "2", "3"]) {
    const entry = sidecar.frames[key] as { ox: number; oy: number; w: number; h: number };
    expect(Number.isInteger(entry.ox)).toBe(true);
    expect(Number.isInteger(entry.oy)).toBe(true);
    expect(entry.w).toBeGreaterThanOrEqual(1);
    expect(entry.h).toBeGreaterThanOrEqual(1);
  }
  // The untouched frame collapses to a single transparent pixel.
  expect(sidecar.frames["2"]?.w).toBe(1);
  expect(sidecar.frames["2"]?.h).toBe(1);
  // Much smaller than three full 64px frames, and every entry fits the texture.
  expect(sidecar.texture.w * sidecar.texture.h).toBeLessThan(3 * 64 * 64);
  for (const entry of Object.values(sidecar.frames)) {
    expect(entry.x + entry.w).toBeLessThanOrEqual(sidecar.texture.w);
    expect(entry.y + entry.h).toBeLessThanOrEqual(sidecar.texture.h);
  }
  // Dots survive at their packed centers; the empty frame stays transparent.
  const alphas = await sampleSheetAlpha(
    page,
    written,
    "packed-sheet",
    (["1", "3"] as const).map((key) => {
      const entry = sidecar.frames[key] as { x: number; y: number; w: number; h: number };
      return [entry.x + Math.floor(entry.w / 2), entry.y + Math.floor(entry.h / 2)] as [number, number];
    }),
  );
  expect(alphas).toEqual([255, 255]);
  const empty = sidecar.frames["2"] as { x: number; y: number };
  const [emptyAlpha] = await sampleSheetAlpha(page, written, "packed-sheet", [[empty.x, empty.y]]);
  expect(emptyAlpha).toBe(0);
});
