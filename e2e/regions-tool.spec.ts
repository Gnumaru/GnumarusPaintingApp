import { expect, test } from "@playwright/test";
import { layerScreenTarget, loadBlankProject, paintLayerRect, selectTool, stubProjectDirectory } from "./e2e-helpers";

async function openRegions(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintLayerRect(page, "#ff0000", 0, 0, 63, 63);
  await selectTool(page, "Regions");
}

test("regions tool draws a named box with editor @recent", async ({ page }) => {
  await openRegions(page);
  const overlay = page.locator('gnumarus-shell [data-testid="region-overlay"]');
  await expect(overlay).toBeVisible();
  await expect(page.locator('gnumarus-shell [data-testid="region-rect"]').first()).toBeHidden();
  const a = await layerScreenTarget(page, 10, 10);
  const b = await layerScreenTarget(page, 30, 30);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 8 });
  // The box already shows while the button is still held, like crop.
  await expect(page.locator('gnumarus-shell [data-testid="region-rect"]').first()).toBeVisible();
  await page.mouse.up();
  await expect(page.locator('gnumarus-shell [data-testid="region-rect"]')).toHaveCount(1);
  const input = page.locator('gnumarus-shell [data-testid="region-name-input"]');
  await expect(input).toHaveCount(1);
  await expect(input).toHaveValue("Region 1");
  await expect(input).toBeFocused();
  await input.fill("Head");
  await input.press("Enter");
  await expect(input).toHaveValue("Head");
});

test("region names stay unique @recent", async ({ page }) => {
  await openRegions(page);
  const rectOf = (x0: number, y0: number, x1: number, y1: number): Promise<void> =>
    (async () => {
      const a = await layerScreenTarget(page, x0, y0);
      const b = await layerScreenTarget(page, x1, y1);
      await page.mouse.move(a.x, a.y);
      await page.mouse.down();
      await page.mouse.move(b.x, b.y, { steps: 4 });
      await page.mouse.up();
    })();
  await rectOf(10, 10, 20, 20);
  await page.keyboard.press("Escape");
  await rectOf(30, 30, 40, 40);
  await page.keyboard.press("Escape");
  const inputs = page.locator('gnumarus-shell [data-testid="region-name-input"]');
  await expect(inputs).toHaveCount(2);
  // Second region tries to steal the first region's name: rejected with a toast.
  await inputs.nth(1).fill("Region 1");
  await inputs.nth(1).press("Enter");
  await expect(page.locator("gnumarus-shell")).toContainText("unique");
  await expect(inputs.nth(1)).toHaveValue("Region 2");
});

test("region create, rename and delete undo cleanly @recent", async ({ page }) => {
  await openRegions(page);
  const a = await layerScreenTarget(page, 9.5, 9.5);
  const b = await layerScreenTarget(page, 29.5, 29.5);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 8 });
  await page.mouse.up();
  const input = page.locator('gnumarus-shell [data-testid="region-name-input"]');
  await expect(input).toHaveValue("Region 1");
  await input.fill("Head");
  await input.press("Enter");
  // Undo twice: rename, then create.
  await page.keyboard.press("Control+z");
  await page.keyboard.press("Control+z");
  await expect(page.locator('gnumarus-shell [data-testid="region-rect"]').first()).toBeHidden();
  await page.keyboard.press("Control+y");
  await page.keyboard.press("Control+y");
  await expect(page.locator('gnumarus-shell [data-testid="region-rect"]').first()).toBeVisible();
  await expect(page.locator('gnumarus-shell [data-testid="region-name-input"]')).toHaveValue("Head");
  await page.locator('gnumarus-shell [data-testid="region-delete"]').click();
  await expect(page.locator('gnumarus-shell [data-testid="region-rect"]').first()).toBeHidden();
  await page.keyboard.press("Control+z");
  await expect(page.locator('gnumarus-shell [data-testid="region-name-input"]')).toHaveValue("Head");
});

test("regions persist through save and reopen @recent", async ({ page }) => {
  await openRegions(page);
  const a = await layerScreenTarget(page, 9.5, 9.5);
  const b = await layerScreenTarget(page, 29.5, 29.5);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 8 });
  await page.mouse.up();
  const input = page.locator('gnumarus-shell [data-testid="region-name-input"]');
  await input.fill("Head");
  await input.press("Enter");
  const project = await stubProjectDirectory(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  const meta = await project.writtenProject();
  expect(meta).toContain('"Head"');
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Open Project" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Opened MockProject");
  await selectTool(page, "Regions");
  await expect(page.locator('gnumarus-shell [data-testid="region-rect"]')).toHaveCount(1);
  await expect(page.locator('gnumarus-shell [data-testid="region-name-input"]')).toHaveValue("Head");
});
