import { expect, test } from "@playwright/test";
import { getMatrix, loadBlankProject, paintCenter } from "./e2e-helpers";

test("cells sharing content with the selection are highlighted", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintCenter(page);
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  // Frame 1 borrows frame 0's texture content: both cells use one content id.
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  let state = await getMatrix(page);
  const sharedId = state.rows[0]?.cells[0]?.contentId;
  expect(typeof sharedId).toBe("string");
  const frame1 = matrix.locator('[data-testid="anim-cell"][data-matrix-frame="1"]');
  await frame1.click({ button: "right" });
  await page.getByRole("button", { name: "Select content" }).click();
  await expect(page.locator('gnumarus-shell [data-testid="content-picker-grid"]')).toBeVisible();
  await page.locator(`gnumarus-shell [data-testid="content-picker-item"][data-content-id="${sharedId}"]`).click();
  state = await getMatrix(page);
  expect(state.rows[0]?.cells[1]?.contentId).toBe(sharedId);

  // Plain-click the shared cell: both linked cells highlight.
  await frame1.click();
  await expect(matrix.locator('[data-testid="anim-cell"].shared-content')).toHaveCount(2);

  // Selecting an unshared (empty) cell clears the highlight.
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  await matrix.locator('[data-testid="anim-cell"][data-matrix-frame="2"]').click();
  await expect(matrix.locator('[data-testid="anim-cell"].shared-content')).toHaveCount(0);
});
