import { expect, test } from "@playwright/test";
import { loadBlankProject, paintCenter, readPixel } from "./e2e-helpers";

async function historyRows(page: import("@playwright/test").Page): Promise<string[]> {
  return page.locator('gnumarus-shell [data-testid="history-window"] .history-row').evaluateAll((elements) =>
    elements.map((el) => (el.textContent ?? "").trim()),
  );
}

test("undo history lists states and jumps on click @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await page.getByRole("button", { name: "View", exact: true }).click();
  await page.getByRole("button", { name: "Undo history", exact: true }).click();
  const window = page.locator('gnumarus-shell [data-testid="history-window"]');
  await expect(window).toBeVisible();
  expect(await historyRows(page)).toEqual(["Initial state"]);
  // One stroke materializes the cell: creation entry below the stroke.
  // (Clicking the window focuses it, which re-renders the row list.)
  await paintCenter(page);
  await window.locator(".preview-header").click();
  expect(await historyRows(page)).toEqual(["Initial state", "Create cell content", "Paint stroke"]);
  // Clicking an older state undoes everything above it (creation included,
  // so the cell is gone and the pixel reads back null).
  await window.getByRole("button", { name: "Initial state" }).click();
  expect(await readPixel(page, 32, 32)).toBeNull();
  expect(await historyRows(page)).toEqual(["Initial state", "Create cell content", "Paint stroke"]);
  await expect(window.locator('[data-testid="history-redo-0"]')).toHaveClass(/redo/);
  await expect(window.locator('[data-testid="history-redo-1"]')).toHaveClass(/redo/);
  // Clicking the top state redoes everything below it.
  await window.getByRole("button", { name: "Paint stroke", exact: true }).click();
  expect(await readPixel(page, 32, 32)).not.toEqual({ r: 0, g: 0, b: 0, a: 0 });
  // Escape closes the focused history window.
  await page.keyboard.press("Escape");
  await expect(window).toBeHidden();
});
