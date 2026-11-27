import { expect, test } from "@playwright/test";
import { loadBlankProject, paintCenter } from "./e2e-helpers";

async function dropFiles(page: import("@playwright/test").Page, files: Array<{ name: string; type: string; bytes: number[] }>): Promise<void> {
  await page.evaluate((entries: Array<{ name: string; type: string; bytes: number[] }>) => {
    const shell = document.querySelector("gnumarus-shell");
    if (shell === null) {
      throw new Error("no shell");
    }
    const transfer = new DataTransfer();
    for (const entry of entries) {
      transfer.items.add(new File([new Uint8Array(entry.bytes)], entry.name, { type: entry.type }));
    }
    shell.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: transfer }));
  }, files);
}

test("painting a vector cell toasts the cell type @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="red"/></svg>';
  await dropFiles(page, [{ name: "red.svg", type: "image/svg+xml", bytes: Array.from(new TextEncoder().encode(svg)) }]);
  await expect(page.locator("gnumarus-shell")).toContainText('Vector graphic "red" imported');
  await page.keyboard.press("b");
  await paintCenter(page);
  await expect(page.locator("gnumarus-shell")).toContainText("of type Vector");
});

test("painting a 3d model cell toasts the cell type @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  const bytes = await page.evaluate(async () => {
    const response = await fetch("/test-fixtures/blend_cube.blend");
    return Array.from(new Uint8Array(await response.arrayBuffer()));
  });
  await dropFiles(page, [{ name: "cube.blend", type: "", bytes }]);
  await expect(page.locator("gnumarus-shell")).toContainText('3D model "cube" imported');
  await page.keyboard.press("b");
  await paintCenter(page);
  await expect(page.locator("gnumarus-shell")).toContainText("of type 3D model");
});
