import { expect, test } from "@playwright/test";
import { loadBlankProject, paintLayerRect } from "./e2e-helpers";

async function dropFiles(page: import("@playwright/test").Page, entries: Array<{ name: string; type: string; bytes: number[] }>): Promise<void> {
  await page.evaluate((files: Array<{ name: string; type: string; bytes: number[] }>) => {
    const shell = document.querySelector("gnumarus-shell");
    if (shell === null) {
      throw new Error("no shell");
    }
    const transfer = new DataTransfer();
    for (const entry of files) {
      transfer.items.add(new File([new Uint8Array(entry.bytes)], entry.name, { type: entry.type }));
    }
    shell.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: transfer }));
  }, entries);
}

test("dropping an svg imports it as vector content @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="red"/></svg>';
  const bytes = Array.from(new TextEncoder().encode(svg));
  await dropFiles(page, [{ name: "red.svg", type: "image/svg+xml", bytes }]);
  await expect(page.locator("gnumarus-shell")).toContainText('Vector graphic "red" imported');
  // The vector cell now counts as occupied for later drops.
  await dropFiles(page, [{ name: "blue.svg", type: "image/svg+xml", bytes }]);
  await expect(page.locator("gnumarus-shell")).toContainText("already has content");
});

test("dropping an html file imports it as text @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  const html = "<div>hello drop</div>";
  const bytes = Array.from(new TextEncoder().encode(html));
  await dropFiles(page, [{ name: "page.html", type: "text/html", bytes }]);
  await expect(page.locator("gnumarus-shell")).toContainText('Imported text "page"');
  await dropFiles(page, [{ name: "other.html", type: "text/html", bytes }]);
  await expect(page.locator("gnumarus-shell")).toContainText("already has content");
});

test("dropping a 3d model imports it as model content @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  const bytes = await page.evaluate(async () => {
    const response = await fetch("/test-fixtures/blend_cube.blend");
    return Array.from(new Uint8Array(await response.arrayBuffer()));
  });
  await dropFiles(page, [{ name: "cube.blend", type: "", bytes }]);
  await expect(page.locator("gnumarus-shell")).toContainText('3D model "cube" imported');
});

test("dropping content onto an occupied cell is refused @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintLayerRect(page, "#ff0000", 0, 0, 63, 63);
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="red"/></svg>';
  await dropFiles(page, [{ name: "red.svg", type: "image/svg+xml", bytes: Array.from(new TextEncoder().encode(svg)) }]);
  await expect(page.locator("gnumarus-shell")).toContainText("already has content");
  await expect(page.locator("gnumarus-shell")).not.toContainText("imported");
});
