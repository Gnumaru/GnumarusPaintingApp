import { expect, test } from "@playwright/test";
import { canvasCenter, getViewState, loadBlankProject, paintedPixelCount, selectTool } from "./e2e-helpers";

test("rotate canvas tool turns the view with the left button and paints nothing", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await selectTool(page, "Rotate canvas");
  await expect(page.locator("gnumarus-shell")).toContainText("rotate canvas");
  await expect(page.locator('gnumarus-shell [data-testid="tool-options"]')).toHaveAttribute("aria-label", "rotate canvas options");
  await expect(page.locator('gnumarus-shell [data-testid="tool-options"]')).toContainText("does not have any setting");
  expect(await getViewState(page)).toMatchObject({ rotation: 0 });
  const center = await canvasCenter(page);
  // Drag from east to south around the viewport center: quarter turn.
  await page.mouse.move(center.x + 60, center.y);
  await page.mouse.down();
  await page.mouse.move(center.x, center.y + 60, { steps: 5 });
  await page.mouse.up();
  expect((await getViewState(page)).rotation).toBeCloseTo(Math.PI / 2, 1);
  expect(await paintedPixelCount(page)).toBe(0);
});

test("rotate canvas tool turns with modifiers held and keeps the tool", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await selectTool(page, "Rotate canvas");
  const center = await canvasCenter(page);
  for (const modifier of ["Shift", "Control", "Alt"] as const) {
    await page.keyboard.down(modifier);
    await page.mouse.move(center.x + 60, center.y);
    await page.mouse.down();
    await page.mouse.move(center.x, center.y + 60, { steps: 5 });
    await page.mouse.up();
    await page.keyboard.up(modifier);
  }
  // Three quarter-turns accumulate: -3π/2 ≡ +π/2 (mod 2π).
  expect(Math.abs((await getViewState(page)).rotation)).toBeGreaterThan(0.01);
  // Ctrl must not summon the temporary eyedropper while rotating.
  await expect(page.locator("gnumarus-shell")).toContainText("rotate canvas");
  expect(await paintedPixelCount(page)).toBe(0);
});

test("rotate canvas tool turns with the right and middle buttons", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await selectTool(page, "Rotate canvas");
  const center = await canvasCenter(page);
  await page.mouse.move(center.x + 60, center.y);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(center.x, center.y + 60, { steps: 5 });
  await page.mouse.up({ button: "right" });
  const afterRight = (await getViewState(page)).rotation;
  expect(Math.abs(afterRight)).toBeGreaterThan(0.01);
  await page.mouse.move(center.x + 60, center.y);
  await page.mouse.down({ button: "middle" });
  await page.mouse.move(center.x, center.y + 60, { steps: 5 });
  await page.mouse.up({ button: "middle" });
  expect(Math.abs((await getViewState(page)).rotation)).toBeGreaterThan(Math.abs(afterRight));
  expect(await paintedPixelCount(page)).toBe(0);
});
