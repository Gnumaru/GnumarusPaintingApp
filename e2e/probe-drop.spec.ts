import { expect, test } from "@playwright/test";
import { loadBlankProject } from "./e2e-helpers";

/** Drop dispatched on the canvas element itself, like a real OS drag. */
async function dropOnCanvas(page: import("@playwright/test").Page, name: string, type: string, bytes: number[]): Promise<void> {
  await page.evaluate((entry: { name: string; type: string; bytes: number[] }) => {
    const shell = document.querySelector("gnumarus-shell");
    const canvas = shell?.shadowRoot?.querySelector("canvas");
    if (canvas === null || canvas === undefined) {
      throw new Error("no canvas");
    }
    const transfer = new DataTransfer();
    transfer.items.add(new File([new Uint8Array(entry.bytes)], entry.name, { type: entry.type }));
    for (const kind of ["dragenter", "dragover", "drop"] as const) {
      canvas.dispatchEvent(new DragEvent(kind, { bubbles: true, cancelable: true, composed: true, dataTransfer: transfer }));
    }
  }, { name, type, bytes });
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

test("probe: drop on canvas with empty mime imports png", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  const bytes = await redPngBytes(page);
  await dropOnCanvas(page, "red.png", "", bytes);
  await expect(page.locator("gnumarus-shell")).toContainText("imported as layer", { timeout: 8000 });
});
