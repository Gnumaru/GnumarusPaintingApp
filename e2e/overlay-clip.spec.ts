import { expect, test } from "@playwright/test";
import { canvasBox, loadBlankProject, selectTool } from "./e2e-helpers";

/**
 * Overlay clip: the preview SVG paints selection ants and grow/crop boxes
 * in canvas-relative pixels. Anything past the canvas edge must be clipped
 * to the canvas box instead of painting over the cell matrix, the menus or
 * the sidebars. The strip below the canvas is screenshotted with the
 * pointer parked (baseline) and again mid-drag at the same pointer spot, so
 * the only possible delta is overlay spill.
 */
async function stripBelowCanvas(
  page: import("@playwright/test").Page,
): Promise<{ clip: { x: number; y: number; width: number; height: number }; anchor: { x: number; y: number }; target: { x: number; y: number } }> {
  const box = await canvasBox(page);
  const target = { x: box.x + box.width - 120, y: box.y + box.height + 80 };
  const anchor = { x: box.x + 60, y: box.y + 60 };
  const viewport = page.viewportSize() ?? { width: 1280, height: 720 };
  const height = Math.min(100, viewport.height - (box.y + box.height + 20));
  const clip = { x: Math.round(box.x), y: Math.round(box.y + box.height + 20), width: Math.round(box.width), height: Math.round(height) };
  return { clip, anchor, target };
}

async function outsideSpill(page: import("@playwright/test").Page, tool: "Rectangular selection" | "Grow or Crop"): Promise<void> {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await selectTool(page, tool);
  const { clip, anchor, target } = await stripBelowCanvas(page);
  expect(clip.height).toBeGreaterThan(40);
  // Park the pointer first: baseline already contains any hover affordance.
  await page.mouse.move(target.x, target.y);
  const calm = await page.screenshot({ clip });
  await page.mouse.move(anchor.x, anchor.y);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 8 });
  const spilled = await page.screenshot({ clip });
  await page.mouse.up();
  expect(spilled.equals(calm)).toBe(true);
}

test("selection rubber band never paints below the canvas @recent", async ({ page }) => {
  await outsideSpill(page, "Rectangular selection");
});

test("grow-or-crop box never paints below the canvas @recent", async ({ page }) => {
  await outsideSpill(page, "Grow or Crop");
});
