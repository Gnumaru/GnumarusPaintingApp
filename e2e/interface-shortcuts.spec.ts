import { expect, test } from "@playwright/test";
import { getLayers, loadBlankProject, readPixel, setPencil } from "./e2e-helpers";

test("Tab hides and shows the interface, toast still works", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const fileButton = page.getByRole("button", { name: "File" });
  const layersPanel = page.locator('gnumarus-shell aside[aria-label="Layers"]');
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await expect(fileButton).toBeVisible();
  await expect(layersPanel).toBeVisible();
  await expect(matrix).toBeVisible();
  await expect(page.locator("gnumarus-shell")).toContainText("1920 x 1080");
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
  await loadBlankProject(page, 64);
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
  // Relink path (lower cell had no texture): the upper texture is linked into
  // the lower content, keeping its transform — the buffer stays unshifted.
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 27, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  expect((await getLayers(page)).layers[0]?.transform.x).toBe(5);
  await expect(page.locator("gnumarus-shell")).toContainText("Layers merged");
  await page.keyboard.press("Control+z");
  expect((await getLayers(page)).layers.map((layer) => layer.id)).toEqual(["layer0", "layer1"]);
});
