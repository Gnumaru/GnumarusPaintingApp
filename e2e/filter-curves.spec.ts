import { expect, test } from "@playwright/test";
import { loadBlankProject, paintCenter, paintLayerRect, readPixel } from "./e2e-helpers";

async function openCurves(page: import("@playwright/test").Page): Promise<import("@playwright/test").Locator> {
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { runAction(id: string): boolean } } };
    return root.__gnumarus?.shell?.runAction("filter-curves") ?? false;
  });
  const dialog = page.locator('gnumarus-shell [data-testid="filter-window"]');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByTestId("filter-spinner")).toBeHidden();
  return dialog;
}

test("curves filter opens under Colors with an identity preview", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintCenter(page);
  const before = await readPixel(page, 32, 32);
  const dialog = await openCurves(page);
  await expect(dialog.locator('[data-testid="filter-param-curve"]')).toBeVisible();
  expect(await readPixel(page, 32, 32)).toEqual(before);
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
});

test("curve nodes and vector-style handles render as painted SVG", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintCenter(page);
  const dialog = await openCurves(page);
  // Regression: nested `html` templates created the shapes in the HTML
  // namespace (invisible, zero-size) — they must be real SVG elements.
  const shapes = await dialog.locator('[data-testid="filter-param-curve"]').evaluate((editor) => {
    const svg = editor.shadowRoot?.querySelector("svg");
    if (svg === null || svg === undefined) {
      return null;
    }
    const SVG_NS = "http://www.w3.org/2000/svg";
    const describe = (el: Element | null | undefined): string | null => {
      if (el === null || el === undefined) {
        return null;
      }
      return el.namespaceURI === SVG_NS ? getComputedStyle(el).fill : `wrong-ns:${el.namespaceURI}`;
    };
    return {
      nodes: [...svg.querySelectorAll('[data-testid="curve-node"]')].map(describe),
      handles: [...svg.querySelectorAll('[data-testid="curve-handle"]')].map(describe),
    };
  });
  expect(shapes?.nodes).toHaveLength(2);
  expect(shapes?.handles).toHaveLength(4);
  for (const fill of shapes?.nodes ?? []) {
    expect(fill).toBe("rgb(255, 255, 255)");
  }
  for (const fill of shapes?.handles ?? []) {
    expect(fill).toBe("rgb(14, 99, 156)");
  }
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
});

test("dragging the white endpoint darkens and undo restores", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintLayerRect(page, "#ff0000", 24, 24, 39, 39);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  const dialog = await openCurves(page);
  const editor = dialog.locator('[data-testid="curve-editor"]');
  const dragEndDown = async (): Promise<void> => {
    // White endpoint node lives at the top-right corner: drag it down.
    // Re-measure every time: the spinner and reset arrow shift dialog
    // layout while previews run.
    const box = await editor.boundingBox();
    if (box === null) {
      throw new Error("curve editor has no bounding box");
    }
    await page.mouse.move(box.x + box.width - 4, box.y + 4);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 4, box.y + box.height / 2, { steps: 8 });
    await page.mouse.up();
  };
  await dragEndDown();
  await expect
    .poll(async () => (await readPixel(page, 32, 32))?.r, { timeout: 10000 })
    .toBeLessThan(200);
  const darkened = await readPixel(page, 32, 32);
  expect(darkened).toEqual({ r: darkened?.r, g: 0, b: 0, a: 255 });
  // The reset arrow restores the identity diagonal.
  await dialog.locator('[data-testid="filter-param-curve-reset"]').click();
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  // Drag again, commit with OK, undo restores the red block.
  await dragEndDown();
  await dialog.getByRole("button", { name: "OK", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect
    .poll(async () => (await readPixel(page, 32, 32))?.r, { timeout: 10000 })
    .toBeLessThan(200);
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("clicking the curve adds a node, right-click removes it", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintCenter(page);
  const dialog = await openCurves(page);
  const count = (): Promise<number> =>
    page.evaluate(() => {
      const editor = document
        .querySelector("gnumarus-shell")
        ?.shadowRoot?.querySelector("gnumarus-curve-editor") as unknown as { nodes?: Array<unknown> } | null;
      return editor?.nodes?.length ?? 0;
    });
  expect(await count()).toBe(2);
  const editor = dialog.locator('[data-testid="curve-editor"]');
  const box = await editor.boundingBox();
  if (box === null) {
    throw new Error("curve editor has no bounding box");
  }
  // Click on the diagonal away from the endpoints (mouse-based: removing
  // the node re-renders mid-gesture, which defeats locator clicks).
  const addX = box.x + box.width * 0.3;
  const addY = box.y + box.height * 0.7;
  await page.mouse.click(addX, addY);
  expect(await count()).toBe(3);
  expect(await dialog.locator('[data-testid="curve-node"]').count()).toBe(3);
  // Right-click the new middle node removes it again.
  const mid = await page.evaluate(() => {
    const host = document
      .querySelector("gnumarus-shell")
      ?.shadowRoot?.querySelector("gnumarus-curve-editor") as unknown as {
      nodes?: Array<{ x: number; y: number }>;
      shadowRoot?: ShadowRoot;
    } | null;
    const node = host?.nodes?.[1];
    const rect = host?.shadowRoot?.querySelector("svg")?.getBoundingClientRect();
    if (node === undefined || rect === undefined) {
      return null;
    }
    return { x: rect.x + node.x * rect.width, y: rect.y + (1 - node.y) * rect.height };
  });
  if (mid === null) {
    throw new Error("middle node not found");
  }
  await page.mouse.click(mid.x, mid.y, { button: "right" });
  expect(await count()).toBe(2);
});

test("filter dialog drag starts from its current position without jumping", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintCenter(page);
  const dialog = await openCurves(page);
  const header = dialog.locator(".preview-header");
  const hbox = await header.boundingBox();
  if (hbox === null) {
    throw new Error("filter header has no bounding box");
  }
  const before = await dialog.boundingBox();
  if (before === null) {
    throw new Error("filter dialog has no bounding box");
  }
  const startX = hbox.x + 40;
  const startY = hbox.y + hbox.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 60, startY + 40, { steps: 5 });
  await page.mouse.up();
  const after = await dialog.boundingBox();
  if (after === null) {
    throw new Error("filter dialog has no bounding box after drag");
  }
  expect(Math.abs(after.x - before.x - 60)).toBeLessThanOrEqual(2);
  expect(Math.abs(after.y - before.y - 40)).toBeLessThanOrEqual(2);
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
});

test("dragging a handle reshapes the curve like a vector editor", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintLayerRect(page, "#ff0000", 24, 24, 39, 39);
  const dialog = await openCurves(page);
  const editor = dialog.locator('[data-testid="curve-editor"]');
  const box = await editor.boundingBox();
  if (box === null) {
    throw new Error("curve editor has no bounding box");
  }
  // In-handle of the white endpoint: visible diamond up-left of the corner.
  const hx = box.x + box.width * (2 / 3);
  const hy = box.y + box.height * (1 / 3);
  await page.mouse.move(hx, hy);
  await page.mouse.down();
  await page.mouse.move(hx - 30, hy + 30, { steps: 5 });
  await page.mouse.up();
  const handles = await page.evaluate(() => {
    const host = document.querySelector("gnumarus-shell")?.shadowRoot?.querySelector("gnumarus-curve-editor") as unknown as {
      nodes?: Array<{ hx1: number; hy1: number }>;
    } | null;
    return host?.nodes?.[1];
  });
  expect(handles).not.toBeNull();
  // The out-handle moved away from its smooth diagonal spot.
  expect(Math.abs((handles?.hx1 ?? 0) - 2 / 3) + Math.abs((handles?.hy1 ?? 0) - 2 / 3)).toBeGreaterThan(0.05);
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
});
