import { test } from "@playwright/test";
test("dbg crop", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell");
  const bytes = await page.evaluate(() => {
    // reuse helper from spec? inline minimal: just log layers after manual import is hard; instead check default project layers
    return 0;
  });
  console.log("skip");
});
