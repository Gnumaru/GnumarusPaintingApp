import { expect, test } from "@playwright/test";
import { addFrames, loadBlankProject, paintLayerRect, stubSaveFilePicker } from "./e2e-helpers";

async function exportApng(page: import("@playwright/test").Page): Promise<{ fileName: string | null; type: string; bytes: number[] }> {
  await stubSaveFilePicker(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Export" }).click();
  const dialog = page.locator("gnumarus-shell dialog#exportDialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("tab", { name: "Export animation" }).click();
  await dialog.locator("select#exportAnimatedFormat").selectOption("apng");
  await dialog.locator("#exportAnimatedOk").click();
  await expect(page.locator("gnumarus-shell")).toContainText("Exported");
  const result = await page.evaluate(() => {
    const root = window as unknown as { __gnumarusExportTest?: { fileName: string | null; blob: Blob | null } };
    const state = root.__gnumarusExportTest;
    if (state?.blob == null) {
      return null;
    }
    return state.blob.arrayBuffer().then((buffer) => ({
      fileName: state.fileName,
      type: state.blob?.type ?? "",
      bytes: Array.from(new Uint8Array(buffer)),
    }));
  });
  expect(result).not.toBeNull();
  return result as { fileName: string | null; type: string; bytes: number[] };
}

test("animated export dialog lists APNG @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await stubSaveFilePicker(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Export" }).click();
  const dialog = page.locator("gnumarus-shell dialog#exportDialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("tab", { name: "Export animation" }).click();
  await expect(dialog.locator('select#exportAnimatedFormat option[value="apng"]')).toHaveText("APNG animation");
});

test("apng animation exports sequenced frames with the right pixels @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintLayerRect(page, "#ff0000", 0, 0, 63, 63);
  await addFrames(page, 1);
  await page.locator('gnumarus-shell [data-testid="anim-frame"][data-frame="1"]').click();
  await paintLayerRect(page, "#0000ff", 0, 0, 63, 63);
  const apng = await exportApng(page);
  expect(apng.fileName).toMatch(/\.png$/);
  expect(apng.type).toBe("image/apng");
  // PNG signature.
  expect(apng.bytes.slice(0, 8)).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  // Chunk walk: acTL claims 2 frames; first frame in IDAT, second in fdAT.
  const view = new DataView(new Uint8Array(apng.bytes).buffer);
  const types: string[] = [];
  let at = 8;
  let frameCount = -1;
  let idat = 0;
  let fdat = 0;
  while (at + 12 <= apng.bytes.length) {
    const size = view.getUint32(at);
    if (size > apng.bytes.length || at + 12 + size > apng.bytes.length) {
      break;
    }
    const type = String.fromCharCode(apng.bytes[at + 4] as number, apng.bytes[at + 5] as number, apng.bytes[at + 6] as number, apng.bytes[at + 7] as number);
    types.push(type);
    if (type === "acTL") {
      frameCount = view.getUint32(at + 8);
    }
    if (type === "IDAT") {
      idat += 1;
    }
    if (type === "fdAT") {
      fdat += 1;
    }
    at += 12 + size;
  }
  expect(at).toBe(apng.bytes.length);
  expect(frameCount).toBe(2);
  expect(idat).toBe(1);
  expect(fdat).toBe(1);
  expect(types[types.length - 1]).toBe("IEND");
  // The browser decodes the first (red) frame.
  const [r, g, b] = await page.evaluate(async (data: number[]) => {
    const bitmap = await createImageBitmap(new Blob([new Uint8Array(data)], { type: "image/apng" }));
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext("2d");
    if (context === null) {
      throw new Error("no 2d context");
    }
    context.drawImage(bitmap, 0, 0, 1, 1);
    bitmap.close();
    const pixel = context.getImageData(0, 0, 1, 1).data;
    return [pixel[0] as number, pixel[1] as number, pixel[2] as number];
  }, apng.bytes);
  expect(r).toBeGreaterThan(150);
  expect(g).toBeLessThan(120);
  expect(b).toBeLessThan(120);
});
