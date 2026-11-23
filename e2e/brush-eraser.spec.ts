import { expect, test } from "@playwright/test";
import { loadBlankProject } from "./e2e-helpers";

async function statusTool(page: import("@playwright/test").Page): Promise<string | null> {
  return page.evaluate(() => {
    const bar = document.querySelector("gnumarus-shell")?.shadowRoot?.querySelector(".statusbar");
    return bar?.querySelector("span")?.textContent?.trim() ?? null;
  });
}

async function eraserBadgeDisplay(page: import("@playwright/test").Page): Promise<string | null> {
  return page.evaluate(() => {
    const badge = document
      .querySelector("gnumarus-shell")
      ?.shadowRoot?.querySelector('[data-testid="brush-eraser-badge"]') as HTMLElement | null;
    return badge?.style.display ?? null;
  });
}

test("status bar reads eraser while the brush uses eraser blend", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  expect(await statusTool(page)).toBe("brush");
  await page.keyboard.press("e");
  expect(await statusTool(page)).toBe("eraser");
  await page.keyboard.press("e");
  expect(await statusTool(page)).toBe("brush");
});

test("eraser badge rides above the brush preview only in eraser blend", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  expect(await eraserBadgeDisplay(page)).toBe("none");
  await page.keyboard.press("e");
  await page.mouse.move(box.x + box.width / 2 + 5, box.y + box.height / 2 + 5);
  expect(await eraserBadgeDisplay(page)).toBe("block");
  await page.keyboard.press("e");
  await page.mouse.move(box.x + box.width / 2 + 10, box.y + box.height / 2 + 10);
  expect(await eraserBadgeDisplay(page)).toBe("none");
});
