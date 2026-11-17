import { expect, test } from "@playwright/test";
import { loadBlankProject } from "./e2e-helpers";

const PAGES_URL = "https://gnumaru.github.io/GnumarusPaintingApp/";

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

test("the deploy item navigates to the public build @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await page.route("https://gnumaru.github.io/**", async (route) => {
    await route.abort();
  });
  await page.getByRole("button", { name: "Help", exact: true }).click();
  const navigation = page.waitForRequest("https://gnumaru.github.io/**");
  await page
    .locator("gnumarus-shell .menu .dropdown")
    .getByRole("button", { name: "GitHub Pages deploy", exact: true })
    .click();
  expect((await navigation).url()).toBe(PAGES_URL);
  // The aborted navigation leaves the local app in place.
  expect(page.url()).not.toContain("gnumaru.github.io");
  await page.unroute("https://gnumaru.github.io/**");
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
