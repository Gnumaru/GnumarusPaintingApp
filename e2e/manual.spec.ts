import { expect, test, type Page } from "@playwright/test";

// The manual is a static Sphinx build in dist/manual (no app server
// involved). Node type definitions are intentionally not a dependency,
// so file URLs are derived from import.meta instead of node:path, and
// the "is it built?" probe reads a marker from the loaded page.
const manualFile = (lang: string, file: string): string =>
  new URL(`../dist/manual/${lang}/${file}`, import.meta.url).href;

async function gotoManual(page: Page, lang: string, file: string): Promise<boolean> {
  try {
    await page.goto(manualFile(lang, file));
  } catch {
    return false;
  }
  return (await page.locator("#manual-language").count()) > 0;
}

test("language dropdown sits below search and switches immediately @recent", async ({ page }) => {
  test.skip(
    !(await gotoManual(page, "en", "index.html")),
    "user manual not built; run npm run docs:build first",
  );
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
  // Krita-style visibility: opaque light field with dark text.
  const field = await page.evaluate(() => {
    const el = document.getElementById("manual-language");
    if (el === null) {
      return null;
    }
    const style = getComputedStyle(el);
    return { background: style.backgroundColor, color: style.color };
  });
  expect(field).toEqual({ background: "rgb(252, 252, 252)", color: "rgb(64, 64, 64)" });
  await select.selectOption("pt_BR");
  await expect(page).toHaveURL(/manual\/pt_BR\/index\.html$/);
  await expect(page.locator("#manual-language")).toHaveValue("pt_BR");
});

test("collapsed sections show expand markers and toggle @recent", async ({ page }) => {
  test.skip(
    !(await gotoManual(page, "en", "getting_started.html")),
    "user manual not built; run npm run docs:build first",
  );
  const section = page.locator('.wy-menu-vertical li:has(> a[href="painting.html"])').first();
  const marker = section.locator("> a > button.toctree-expand");
  await expect(marker).toBeVisible();
  // Godot-style visibility: bright marker on the dark collapsed row.
  const markerColor = await marker.evaluate((el) => getComputedStyle(el).color);
  expect(markerColor).toBe("rgb(240, 240, 240)");
  // Godot-style: the collapsed section hides its children until toggled.
  await expect(section.locator(":scope > ul")).toBeHidden();
  await marker.click();
  await expect(section.locator(":scope > ul")).toBeVisible();
  await expect(section.locator(':scope > ul a[href="brushes.html"]')).toBeVisible();
});
