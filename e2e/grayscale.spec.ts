import { expect, test } from "@playwright/test";
import {
  addFrames,
  canvasScreenPixel,
  getMatrixFrame,
  layerScreenTarget,
  loadBlankProject,
  paintDot,
  readPixel,
  setBrushColor,
} from "./e2e-helpers";

function grayscaleSelect(page: import("@playwright/test").Page): import("@playwright/test").Locator {
  return page.locator('gnumarus-shell [data-testid="editor-options"] select#grayscaleMode');
}

async function screenAt(
  page: import("@playwright/test").Page,
  x: number,
  y: number,
): Promise<{ r: number; g: number; b: number }> {
  const target = await layerScreenTarget(page, x, y);
  return canvasScreenPixel(page, target.x, target.y);
}

test("grayscale dropdown defaults to none and lists every mode", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const select = grayscaleSelect(page);
  await expect(select).toHaveValue("none");
  await expect(select.locator("option")).toHaveText(["None", "Direct luma", "Linear luminance", "CIELAB"]);
});

test("direct luma renders red as gray without touching pixels", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintDot(page, "#ff0000", 10, 10);
  expect(await readPixel(page, 10, 10)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  await grayscaleSelect(page).selectOption("luma");
  // 0.299 * 255 = 76.245 on screen, buffer untouched.
  const shown = await screenAt(page, 10, 10);
  expect(shown.r).toBe(shown.g);
  expect(shown.g).toBe(shown.b);
  expect(Math.abs(shown.r - 76)).toBeLessThanOrEqual(3);
  expect(await readPixel(page, 10, 10)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  // Back to none restores the color render.
  await grayscaleSelect(page).selectOption("none");
  const restored = await screenAt(page, 10, 10);
  expect(restored.r).toBeGreaterThan(restored.g + 100);
});

test("linear and cielab render red as mid grays", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintDot(page, "#ff0000", 10, 10);
  await grayscaleSelect(page).selectOption("linear");
  const linear = await screenAt(page, 10, 10);
  expect(linear.r).toBe(linear.g);
  expect(linear.g).toBe(linear.b);
  expect(Math.abs(linear.r - 127)).toBeLessThanOrEqual(3);
  await grayscaleSelect(page).selectOption("cielab");
  const lab = await screenAt(page, 10, 10);
  expect(lab.r).toBe(lab.g);
  expect(lab.g).toBe(lab.b);
  expect(Math.abs(lab.r - 136)).toBeLessThanOrEqual(4);
});

test("grayscale locks painting, frame switches and playback", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await addFrames(page, 1);
  await paintDot(page, "#ff0000", 10, 10);
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  // Start playback, then turn grayscale on: it stops.
  await matrix.getByRole("button", { name: "Play animation" }).click();
  await expect(matrix.getByRole("button", { name: "Stop animation" })).toBeVisible();
  await grayscaleSelect(page).selectOption("luma");
  await expect(matrix.getByRole("button", { name: "Play animation" })).toBeVisible();
  // Painting is blocked: the untouched pixel stays fully transparent.
  await setBrushColor(page, "#0000ff");
  const target = await layerScreenTarget(page, 40, 40);
  await page.mouse.click(target.x, target.y);
  expect(await readPixel(page, 40, 40)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  // Frame navigation is blocked (whatever frame the playhead reached).
  const frozen = await getMatrixFrame(page);
  await page.keyboard.press("ArrowRight");
  expect(await getMatrixFrame(page)).toBe(frozen);
  await expect(page.locator("gnumarus-shell")).toContainText("back to None");
  // Playback cannot start while grayscale is on.
  await matrix.getByRole("button", { name: "Play animation" }).click();
  await expect(matrix.getByRole("button", { name: "Play animation" })).toBeVisible();
  await expect(page.locator("gnumarus-shell")).toContainText("back to None");
  // Switching back to none unlocks everything.
  await grayscaleSelect(page).selectOption("none");
  await page.keyboard.press("ArrowRight");
  expect(await getMatrixFrame(page)).toBe((frozen + 1) % 2);
});
