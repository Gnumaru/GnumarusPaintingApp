import { expect, test } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

const MANUAL = path.resolve(process.cwd(), "dist/manual");
const BUILT =
  fs.existsSync(path.join(MANUAL, "en", "index.html")) &&
  fs.existsSync(path.join(MANUAL, "pt_BR", "index.html"));

test.skip(!BUILT, "user manual not built; run npm run docs:build first");

test("language dropdown sits below search and switches immediately @recent", async ({ page }) => {
  await page.goto("file://" + path.join(MANUAL, "en", "index.html"));
  const select = page.locator("#manual-language");
  await expect(select).toBeVisible();
  const order = await page.evaluate(() => {
    const form = document.getElementById("rtd-search-form");
    const dropdown = document.getElementById("manual-language");
    if (form === null || dropdown === null) {
      return "missing";
    }
    return form.compareDocumentPosition(dropdown) & Node.DOCUMENT_POSITION_FOLLOWING
      ? "after"
      : "before";
  });
  expect(order).toBe("after");
  await expect(select).toHaveValue("en");
  await select.selectOption("pt_BR");
  await expect(page).toHaveURL(/manual\/pt_BR\/index\.html$/);
  await expect(page.locator("#manual-language")).toHaveValue("pt_BR");
});

test("collapsed sections show expand markers and toggle @recent", async ({ page }) => {
  await page.goto("file://" + path.join(MANUAL, "en", "getting_started.html"));
  const section = page.locator('.wy-menu-vertical li:has(> a[href="painting.html"])').first();
  const marker = section.locator("> a > button.toctree-expand");
  await expect(marker).toBeVisible();
  // Godot-style: the collapsed section hides its children until toggled.
  await expect(section.locator(":scope > ul")).toBeHidden();
  await marker.click();
  await expect(section.locator(":scope > ul")).toBeVisible();
  await expect(section.locator(':scope > ul a[href="brushes.html"]')).toBeVisible();
});
