import { expect, test } from "@playwright/test";
import { createDefaultText, loadBlankProject, paintCenter } from "./e2e-helpers";

function layerResize(page: import("@playwright/test").Page, layerId: string): import("@playwright/test").Locator {
  return page.locator(`gnumarus-shell [data-layer-id="${layerId}"] .layer-resize`);
}

test("layer resize row reports no cell content on an empty cell", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await expect(layerResize(page, "layer0")).toContainText("no cell content");
  await expect(layerResize(page, "layer0")).not.toContainText("×");
});

test("layer resize row reports no texture for textureless content", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.locator('[data-testid="anim-cell"][data-matrix-frame="0"]').click({ button: "right" });
  await page.getByRole("button", { name: "Select content" }).click();
  await page.locator('gnumarus-shell [data-testid="content-picker-new"]').click();
  await page.locator('gnumarus-shell [data-testid="texture-picker-none"]').click();
  await expect(layerResize(page, "layer0")).toContainText("no texture");
  await expect(layerResize(page, "layer0")).not.toContainText("×");
});

test("layer resize row shows the texture resolution once painted", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await expect(layerResize(page, "layer0")).toContainText("no cell content");
  await paintCenter(page);
  await expect(layerResize(page, "layer0")).toContainText("64×64");
  await expect(layerResize(page, "layer0")).not.toContainText("no cell content");
});

test("layer resize row reports the content kind for textureless contents", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await createDefaultText(page);
  await expect(layerResize(page, "layer0")).toContainText("text");
  await expect(layerResize(page, "layer0")).not.toContainText("no texture");
  await expect(layerResize(page, "layer0")).not.toContainText("×");
});
