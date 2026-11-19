import { expect, test } from "@playwright/test";
import { loadBlankProject, paintLayerRect } from "./e2e-helpers";

/** Drop files onto the app shell the way an OS drag-and-drop would. */
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

async function redPngBytes(page: import("@playwright/test").Page): Promise<number[]> {
  return page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 8;
    canvas.height = 8;
    const context = canvas.getContext("2d");
    if (context === null) {
      throw new Error("no 2d context");
    }
    context.fillStyle = "#ff0000";
    context.fillRect(0, 0, 8, 8);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (blob === null) {
      throw new Error("png encode failed");
    }
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  });
}

test("dropping an image imports it onto the empty current cell @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  const bytes = await redPngBytes(page);
  await dropFiles(page, [{ name: "red.png", type: "image/png", bytes }]);
  await expect(page.locator("gnumarus-shell")).toContainText("imported as layer");
});

test("dropping an image onto an occupied cell reports an error @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintLayerRect(page, "#ff0000", 0, 0, 63, 63);
  const bytes = await redPngBytes(page);
  await dropFiles(page, [{ name: "red.png", type: "image/png", bytes }]);
  await expect(page.locator("gnumarus-shell")).toContainText("empty cell");
  await expect(page.locator("gnumarus-shell")).not.toContainText("imported as layer");
});

test("dropping a non-image file is ignored @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  const text = Array.from(new TextEncoder().encode("hello"));
  await dropFiles(page, [{ name: "notes.txt", type: "text/plain", bytes: text }]);
  await page.waitForTimeout(500);
  await expect(page.locator("gnumarus-shell")).not.toContainText("imported as layer");
  await expect(page.locator("gnumarus-shell")).not.toContainText("empty cell");
});
