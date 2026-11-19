import { expect, test } from "@playwright/test";
import { loadBlankProject } from "./e2e-helpers";

async function activeTool(page: import("@playwright/test").Page): Promise<unknown> {
  return page.evaluate(() => (document.querySelector("gnumarus-shell") as unknown as { tool: unknown }).tool);
}

async function runAction(page: import("@playwright/test").Page, id: string): Promise<boolean> {
  return page.evaluate((actionId: string) => {
    const root = window as unknown as { __gnumarus?: { shell?: { runAction(id: string): boolean } } };
    return root.__gnumarus?.shell?.runAction(actionId) ?? false;
  }, id);
}

function toolsMenu(page: import("@playwright/test").Page): import("@playwright/test").Locator {
  return page.locator("gnumarus-shell .menu", { has: page.getByRole("button", { name: "Tools", exact: true }) });
}

test("tools menu sits right of edit with standalone items @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  const order = await page.locator("gnumarus-shell .menubar > .menu > button").allInnerTexts();
  expect(order.map((label) => label.trim())).toEqual(["File", "Edit", "Tools", "Filters", "Help"]);
  await page.getByRole("button", { name: "Tools", exact: true }).click();
  const menu = toolsMenu(page);
  for (const name of ["Bucket fill", "Eyedropper", "Text", "Tile brush"]) {
    await expect(menu.getByRole("button", { name, exact: true })).toBeVisible();
  }
  // Every dropdown entry carries a tooltip.
  const titled = await menu.locator(".dropdown button[title]").count();
  const total = await menu.locator(".dropdown button").count();
  expect(titled).toBe(total);
  expect(total).toBeGreaterThan(5);
  await page.keyboard.press("Escape");
});

test("drawer submenus list every tool with tooltips @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await page.getByRole("button", { name: "Tools", exact: true }).click();
  const menu = toolsMenu(page);
  const flyout = page.locator("gnumarus-shell .submenu-flyout");
  const expected: Array<[string, string[]]> = [
    ["Paint", ["Pencil", "Line", "Curve"]],
    ["Shapes", ["Rectangle", "Ellipse", "Polygon", "Gradient"]],
    ["Retouch", ["Shading", "Blur", "Clone", "Recolor", "Jumble"]],
    ["Selection", ["Rectangular selection", "Elliptical selection", "Freehand lasso", "Polygonal lasso", "Color selection"]],
    ["Destructive", ["Destructive selection transform", "Destructive selection 3D rotation", "Crop"]],
    ["Transform", ["Non-destructive cell transform", "Non-destructive cell 3D rotation"]],
    ["3D models", ["3D model transform", "Fly camera"]],
    ["View", ["Loupe", "Pan", "Rotate canvas"]],
  ];
  const rows = menu.locator(".submenu-row");
  await expect(rows).toHaveCount(expected.length);
  for (const [index, entry] of expected.entries()) {
    const tools = entry[1] as string[];
    await rows.nth(index).hover();
    for (const tool of tools) {
      await expect(flyout.getByRole("button", { name: tool, exact: true })).toBeVisible();
    }
    const titled = await flyout.locator("button[title]").count();
    expect(titled).toBe(tools.length);
  }
  await page.keyboard.press("Escape");
});

test("menu selection activates the tool @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  expect(await activeTool(page)).toBe("pencil");
  await page.getByRole("button", { name: "Tools", exact: true }).click();
  await toolsMenu(page).getByRole("button", { name: "Bucket fill", exact: true }).click();
  expect(await activeTool(page)).toBe("bucket");
  await page.getByRole("button", { name: "Tools", exact: true }).click();
  const menu = toolsMenu(page);
  await menu.locator(".submenu-row").nth(2).hover();
  await page.locator("gnumarus-shell .submenu-flyout").getByRole("button", { name: "Blur", exact: true }).click();
  expect(await activeTool(page)).toBe("blur");
});

test("every tool runs from the action palette @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  const cases: Array<[string, string]> = [
    ["tool-loupe", "loupe"],
    ["tool-pan", "pan"],
    ["tool-rotatecanvas", "rotatecanvas"],
    ["tool-bucket", "bucket"],
    ["tool-eyedropper", "eyedropper"],
    ["tool-text", "text"],
    ["tool-tilebrush", "tilebrush"],
    ["tool-pencil", "pencil"],
    ["tool-line", "line"],
    ["tool-curve", "curve"],
    ["tool-rectangle", "rectangle"],
    ["tool-ellipseShape", "ellipseShape"],
    ["tool-polygon", "polygon"],
    ["tool-gradient", "gradient"],
    ["tool-shading", "shading"],
    ["tool-blur", "blur"],
    ["tool-clone", "clone"],
    ["tool-recolor", "recolor"],
    ["tool-jumble", "jumble"],
    ["tool-rectselect", "rectselect"],
    ["tool-ellipse", "ellipse"],
    ["tool-lasso", "lasso"],
    ["tool-polylasso", "polylasso"],
    ["tool-colorselect", "colorselect"],
    ["tool-destransform", "destransform"],
    ["tool-crop", "crop"],
    ["tool-transform", "transform"],
    ["tool-transform3d", "transform3d"],
    ["tool-modeltransform", "modeltransform"],
  ];
  for (const [action, tool] of cases) {
    expect(await runAction(page, action)).toBe(true);
    expect(await activeTool(page)).toBe(tool);
  }
  // Flycam needs a 3D model cell: on a plain canvas it refuses cleanly.
  expect(await runAction(page, "tool-flycam")).toBe(true);
  expect(await activeTool(page)).not.toBe("flycam");
});
