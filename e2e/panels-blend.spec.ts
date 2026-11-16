import { expect, test } from "@playwright/test";
import { onionVisible, openPicker, paintCenter, previewRgba, setOnion, setPencil, stubProjectDirectory } from "./e2e-helpers";

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
