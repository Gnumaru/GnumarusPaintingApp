import { expect, test } from "@playwright/test";
import { loadBlankProject } from "./e2e-helpers";

async function zIndex(page: import("@playwright/test").Page, testId: string): Promise<number> {
  return page.evaluate((id: string) => {
    const root = document.querySelector("gnumarus-shell")?.shadowRoot ?? null;
    const el = root?.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
    // Wrapped windows (tool options, background) carry the stacking order
    // on the outer positioning anchor; the rest on the window itself.
    const host = el?.closest(".float-anchor") ?? el;
    return Number(getComputedStyle(host as Element).zIndex ?? 0);
  }, testId);
}

async function focused(page: import("@playwright/test").Page, testId: string): Promise<boolean> {
  return page.evaluate((id: string) => {
    const root = document.querySelector("gnumarus-shell")?.shadowRoot ?? null;
    return (root?.querySelector(`[data-testid="${id}"]`) as HTMLElement | null)?.classList.contains("float-focused") ?? false;
  }, testId);
}

test("only the focused floating window closes on Escape @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  const bg = page.locator('gnumarus-shell [data-testid="background-window"]');
  const tools = page.locator('gnumarus-shell [data-testid="tool-options-float"]');
  await page.locator('gnumarus-shell [data-testid="background-button"]').click();
  await expect(bg).toBeVisible();
  await page.locator('gnumarus-shell [data-testid="editor-options"]').getByRole("button", { name: "Tool options" }).click();
  await expect(tools).toBeVisible();
  // Last opened is focused and on top.
  expect(await focused(page, "tool-options-float")).toBe(true);
  expect(await focused(page, "background-window")).toBe(false);
  expect(await zIndex(page, "tool-options-float")).toBeGreaterThan(await zIndex(page, "background-window"));
  // Clicking the background header moves focus (and z-order) to it.
  await bg.locator(".preview-header").click();
  expect(await focused(page, "background-window")).toBe(true);
  expect(await focused(page, "tool-options-float")).toBe(false);
  expect(await zIndex(page, "background-window")).toBeGreaterThan(await zIndex(page, "tool-options-float"));
  // Escape closes only the focused window; focus falls back to the other one.
  await page.keyboard.press("Escape");
  await expect(bg).toBeHidden();
  await expect(tools).toBeVisible();
  expect(await focused(page, "tool-options-float")).toBe(true);
  await page.keyboard.press("Escape");
  await expect(tools).toBeHidden();
  // Escape with no float window open is a harmless no-op.
  await page.keyboard.press("Escape");
  await expect(page.locator("gnumarus-shell canvas")).toBeVisible();
});
