import { expect, test } from "@playwright/test";
import {
  engineReparent,
  getLayers,
  getMatrix,
  loadBlankProject,
  paintCenter,
  readPixel,
} from "./e2e-helpers";

function eyeFor(page: import("@playwright/test").Page, layerId: string): import("@playwright/test").Locator {
  return page.locator(
    `gnumarus-shell [data-testid="matrix-layer-visibility"][data-visibility-for="${layerId}"]`,
  );
}

test("matrix eye toggles layer visibility like the panel checkbox @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await page.getByRole("button", { name: "Add layer" }).click();
  expect(await eyeFor(page, "layer0").getAttribute("data-visibility-state")).toBe("open");
  expect(await eyeFor(page, "layer1").getAttribute("data-visibility-state")).toBe("open");
  // Hiding through the matrix eye unchecks the panel checkbox too.
  await eyeFor(page, "layer1").click();
  expect(await eyeFor(page, "layer1").getAttribute("data-visibility-state")).toBe("closed");
  const panelRow = page.locator('gnumarus-shell [data-layer-id="layer1"]');
  await expect(panelRow.locator('input[type="checkbox"]')).not.toBeChecked();
  // Showing again restores the open eye.
  await eyeFor(page, "layer1").click();
  expect(await eyeFor(page, "layer1").getAttribute("data-visibility-state")).toBe("open");
  await expect(panelRow.locator('input[type="checkbox"]')).toBeChecked();
  const matrix = await getMatrix(page);
  expect(matrix.rows.find((row) => row.layerId === "layer1")).toMatchObject({
    visible: true,
    effectivelyVisible: true,
  });
});

test("child of a hidden parent shows a half-closed eye @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await page.getByRole("button", { name: "Add layer" }).click();
  await page.getByRole("button", { name: "Add layer" }).click();
  expect(await engineReparent(page, "layer0", "layer2")).toBe(true);
  // Hide the parent: it closes, the visible child goes half-closed.
  await eyeFor(page, "layer2").click();
  expect(await eyeFor(page, "layer2").getAttribute("data-visibility-state")).toBe("closed");
  expect(await eyeFor(page, "layer0").getAttribute("data-visibility-state")).toBe("half");
  expect(await eyeFor(page, "layer1").getAttribute("data-visibility-state")).toBe("open");
  const matrix = await getMatrix(page);
  expect(matrix.rows.find((row) => row.layerId === "layer0")).toMatchObject({
    visible: true,
    effectivelyVisible: false,
  });
  // Toggling the child itself flips its own flag (stays effectively hidden).
  await eyeFor(page, "layer0").click();
  expect(await eyeFor(page, "layer0").getAttribute("data-visibility-state")).toBe("closed");
  // Showing the parent restores the child to open.
  await eyeFor(page, "layer2").click();
  await eyeFor(page, "layer0").click();
  expect(await eyeFor(page, "layer0").getAttribute("data-visibility-state")).toBe("open");
});

test("invisible layers refuse paint and clear with a toast @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintCenter(page);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  // Hide the active layer from the matrix: painting is blocked with a toast.
  await eyeFor(page, "layer0").click();
  await paintCenter(page);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  await expect(page.locator("gnumarus-shell")).toContainText("Hidden layers cannot be edited");
  // Delete (clear cell) is blocked too.
  await page.keyboard.press("Delete");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  // The layer stays selected and can be shown again, then edits work.
  expect((await getLayers(page)).active).toBe("layer0");
  await eyeFor(page, "layer0").click();
  await page.keyboard.press("Delete");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
});

test("layers hidden by a parent refuse paint @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await page.getByRole("button", { name: "Add layer" }).click();
  await page.getByRole("button", { name: "Add layer" }).click();
  expect(await engineReparent(page, "layer0", "layer2")).toBe(true);
  // Paint on the child while everything is visible.
  const childName = page.locator('gnumarus-shell [data-layer-id="layer0"] .layer-name');
  await childName.click();
  await paintCenter(page);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  // Hide the parent: the selected child keeps selection but refuses paint.
  await eyeFor(page, "layer2").click();
  await paintCenter(page);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  await expect(page.locator("gnumarus-shell")).toContainText("Hidden layers cannot be edited");
  expect((await getLayers(page)).active).toBe("layer0");
});
