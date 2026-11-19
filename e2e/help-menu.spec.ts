import { expect, test } from "@playwright/test";
import { loadBlankProject } from "./e2e-helpers";

const PAGES_URL = "https://gnumaru.github.io/GnumarusPaintingApp/";

test("help menu offers the manual with a locale-aware link @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await page.getByRole("button", { name: "Help", exact: true }).click();
  const entry = page
    .locator("gnumarus-shell .menu .dropdown")
    .getByRole("button", { name: "Manual", exact: true });
  await expect(entry).toBeVisible();
  await expect(entry).toHaveAttribute("title", /.+/);
  const [popup] = await Promise.all([
    page.waitForEvent("popup"),
    entry.click(),
  ]);
  expect(new URL(popup.url()).pathname).toMatch(/manual\/en\/$/);
  await popup.close();
  await page.keyboard.press("Escape");
});

test("help menu offers the pages deploy with a tooltip @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await page.getByRole("button", { name: "Help", exact: true }).click();
  const entry = page
    .locator("gnumarus-shell .menu .dropdown")
    .getByRole("button", { name: "GitHub Pages deploy", exact: true });
  await expect(entry).toBeVisible();
  await expect(entry).toHaveAttribute("title", /.+/);
  await page.keyboard.press("Escape");
});

test("the deploy item opens the public build in a new tab @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await page.context().route("https://gnumaru.github.io/**", async (route) => {
    await route.fulfill({ status: 200, body: "" });
  });
  await page.getByRole("button", { name: "Help", exact: true }).click();
  const [popup] = await Promise.all([
    page.waitForEvent("popup"),
    page
      .locator("gnumarus-shell .menu .dropdown")
      .getByRole("button", { name: "GitHub Pages deploy", exact: true })
      .click(),
  ]);
  expect(popup.url()).toBe(PAGES_URL);
  await popup.close();
  // The main tab stays on the local app.
  expect(page.url()).not.toContain("gnumaru.github.io");
  await page.context().unroute("https://gnumaru.github.io/**");
});

test("the app serves an svg favicon @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const href = await page.locator('link[rel="icon"]').first().getAttribute("href");
  expect(href).toBe("./favicon.svg");
  const response = await page.request.get("/favicon.svg");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"] ?? "").toContain("svg");
  expect((await response.text()).trimStart().startsWith("<svg")).toBe(true);
});

test("help menu offers licenses with attribution texts @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await page.getByRole("button", { name: "Help", exact: true }).click();
  const entry = page
    .locator("gnumarus-shell .menu .dropdown")
    .getByRole("button", { name: "Licenses", exact: true });
  await expect(entry).toBeVisible();
  await expect(entry).toHaveAttribute("title", /.+/);
  await entry.click();
  const dialog = page.locator("gnumarus-shell dialog#licensesDialog");
  await expect(dialog).toBeVisible();
  for (const name of ["three", "lit", "gifenc", "fflate", "fast-xml-parser", "libjxl", "libwebp"]) {
    await expect(dialog).toContainText(name);
  }
  await expect(dialog).toContainText("MIT");
  await expect(dialog).toContainText("BSD-3-Clause");
  await expect(dialog).toContainText("three.js authors");
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(dialog).toBeHidden();
});

test("the Show Licenses action opens the licenses modal @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await page.keyboard.press("Control+Shift+P");
  const palette = page.locator("gnumarus-shell dialog#actionPaletteDialog");
  await expect(palette).toBeVisible();
  await palette.locator("input").fill("Show Licenses");
  await palette.locator('[data-testid="action-palette-item"][data-action-id="licenses"]').click();
  const dialog = page.locator("gnumarus-shell dialog#licensesDialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("fast-xml-parser");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});
