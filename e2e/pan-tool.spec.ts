import { expect, test } from "@playwright/test";
import { canvasCenter, loadBlankProject, paintedPixelCount, selectTool } from "./e2e-helpers";

async function canvasPan(page: import("@playwright/test").Page): Promise<{ x: number; y: number }> {
  return page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: unknown } };
    const engine = root.__gnumarus?.engine as unknown as { panX: number; panY: number };
    return { x: engine.panX, y: engine.panY };
  });
}

async function dragCenter(
  page: import("@playwright/test").Page,
  dx: number,
  dy: number,
  button: "left" | "right" | "middle" = "left",
): Promise<void> {
  const center = await canvasCenter(page);
  await page.mouse.move(center.x, center.y);
  await page.mouse.down({ button });
  await page.mouse.move(center.x + dx, center.y + dy, { steps: 5 });
  await page.mouse.up({ button });
}

test("pan tool drags the canvas with the left button and paints nothing", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await selectTool(page, "Pan");
  await expect(page.locator("gnumarus-shell")).toContainText("pan");
  await expect(page.locator('gnumarus-shell [data-testid="tool-options"]')).toHaveAttribute("aria-label", "pan options");
  await expect(page.locator('gnumarus-shell [data-testid="tool-options"]')).toContainText("does not have any setting");
  await dragCenter(page, 40, 25);
  expect(await canvasPan(page)).toEqual({ x: 40, y: 25 });
  expect(await paintedPixelCount(page)).toBe(0);
});

test("pan tool pans with modifiers held and keeps the tool", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await selectTool(page, "Pan");
  let x = 0;
  let y = 0;
  for (const modifier of ["Shift", "Control", "Alt"] as const) {
    await page.keyboard.down(modifier);
    await dragCenter(page, 30, 20);
    await page.keyboard.up(modifier);
    x += 30;
    y += 20;
    expect(await canvasPan(page)).toEqual({ x, y });
  }
  // Ctrl must not summon the temporary eyedropper while panning.
  await expect(page.locator("gnumarus-shell")).toContainText("pan");
  expect(await paintedPixelCount(page)).toBe(0);
});

test("pan tool pans with the right and middle buttons", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await selectTool(page, "Pan");
  await dragCenter(page, 30, 20, "right");
  expect(await canvasPan(page)).toEqual({ x: 30, y: 20 });
  await dragCenter(page, -10, 15, "middle");
  expect(await canvasPan(page)).toEqual({ x: 20, y: 35 });
  expect(await paintedPixelCount(page)).toBe(0);
});

test("pan flyout button carries the hand tooltip", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await page.locator('gnumarus-shell [data-testid="view-drawer"] > button').click({ button: "right" });
  const flyout = page.locator('gnumarus-shell [data-testid="view-flyout"]');
  await expect(flyout.getByRole("button", { name: "Pan", exact: true })).toHaveAttribute("title", /^Pan \(/);
  await expect(flyout.getByRole("button", { name: "Rotate canvas", exact: true })).toHaveAttribute(
    "title",
    /^Rotate canvas \(/,
  );
});
