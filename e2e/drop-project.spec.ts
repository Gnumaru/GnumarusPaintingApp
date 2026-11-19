import { expect, test } from "@playwright/test";
import { animationFrameCount, buildAsepriteBytes, buildXcfBytes, loadBlankProject, paintLayerRect, readPixel } from "./e2e-helpers";

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

async function dropProjectDialog(page: import("@playwright/test").Page): Promise<import("@playwright/test").Locator> {
  const dialog = page.locator("gnumarus-shell dialog#projectDropDialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

test("dropping a project file asks for confirmation and cancel keeps everything @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintLayerRect(page, "#ff0000", 0, 0, 63, 63);
  const bytes = Array.from(await buildAsepriteBytes(page));
  await dropFiles(page, [{ name: "hero.ase", type: "", bytes }]);
  const dialog = await dropProjectDialog(page);
  await expect(dialog).toContainText("hero.ase");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog).toBeHidden();
  // Nothing happened: the painted pixel survives and nothing was imported.
  expect(await readPixel(page, 0, 0)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  await expect(page.locator("gnumarus-shell")).not.toContainText("Imported hero.ase");
});

test("confirming a dropped .ase imports it as a new project @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  const bytes = Array.from(await buildAsepriteBytes(page));
  await dropFiles(page, [{ name: "hero.ase", type: "", bytes }]);
  const dialog = await dropProjectDialog(page);
  await dialog.getByRole("button", { name: "Import", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator("gnumarus-shell")).toContainText("Imported hero.ase (2 layers, 2 frames)");
  expect(await readPixel(page, 0, 0)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await animationFrameCount(page)).toBe(2);
});

test("confirming a broken project drop reports failure without touching the project @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintLayerRect(page, "#ff0000", 0, 0, 63, 63);
  await dropFiles(page, [{ name: "broken.ase", type: "", bytes: [0, 1, 2, 3, 4, 5, 6, 7] }]);
  const dialog = await dropProjectDialog(page);
  await dialog.getByRole("button", { name: "Import", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator("gnumarus-shell")).toContainText("Import failed");
  expect(await readPixel(page, 0, 0)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});

test("confirming a dropped .xcf imports it as a new project @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  const bytes = Array.from(
    buildXcfBytes(4, 4, [
      { name: "Top", width: 2, height: 2, offsetX: 2, offsetY: 2, opacity: 128, rgba: [255, 0, 0, 255] },
      { name: "Bottom", width: 4, height: 4, offsetX: 0, offsetY: 0, rgba: [0, 0, 255, 255] },
    ]),
  );
  await dropFiles(page, [{ name: "art.xcf", type: "", bytes }]);
  const dialog = await dropProjectDialog(page);
  await dialog.getByRole("button", { name: "Import", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator("gnumarus-shell")).toContainText("Imported art.xcf (2 layers)");
  expect(await readPixel(page, 0, 0)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});
