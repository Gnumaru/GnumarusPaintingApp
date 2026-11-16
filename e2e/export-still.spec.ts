import { expect, test } from "@playwright/test";
import { exportedFile, loadBlankProject, paintCenter, stubSaveFilePicker } from "./e2e-helpers";

test("File > Export saves the current frame as PNG with exact pixels", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintCenter(page);
  await stubSaveFilePicker(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Export" }).click();
  const dialog = page.locator("gnumarus-shell dialog#exportDialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("input#exportFrame")).toHaveValue("1");
  const options = await dialog.locator("select#exportFormat option").allTextContents();
  expect(options).toEqual(expect.arrayContaining(["PNG", "JPEG", "WebP"]));
  await dialog.locator("#exportOk").click();
  await expect(page.locator("gnumarus-shell")).toContainText("Exported");
  const file = await exportedFile(page);
  expect(file?.fileName).toContain("frame-1.png");
  expect(file?.type).toBe("image/png");
  expect(file?.width).toBe(64);
  expect(file?.height).toBe(64);
  expect(file?.center).toEqual([0, 0, 0, 255]);
  expect(file?.corner).toEqual([0, 0, 0, 0]);
});

test("File > Export flattens JPEG without alpha", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintCenter(page);
  await stubSaveFilePicker(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Export" }).click();
  const dialog = page.locator("gnumarus-shell dialog#exportDialog");
  await expect(dialog).toBeVisible();
  await dialog.locator("select#exportFormat").selectOption("image/jpeg");
  await dialog.locator("#exportOk").click();
  await expect(page.locator("gnumarus-shell")).toContainText("Exported");
  const file = await exportedFile(page);
  expect(file?.type).toBe("image/jpeg");
  expect(file?.width).toBe(64);
  // JPEG has no alpha: every decoded pixel is opaque.
  expect(file?.corner?.[3]).toBe(255);
});

test("File > Export cancellation stays silent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell");
  await page.evaluate(() => {
    const root = window as unknown as { showSaveFilePicker?: () => Promise<never> };
    root.showSaveFilePicker = async () => {
      throw new DOMException("User cancelled", "AbortError");
    };
  });
  await page.getByRole("button", { name: "File" }).click();
  await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Export" }).click();
  const dialog = page.locator("gnumarus-shell dialog#exportDialog");
  await expect(dialog).toBeVisible();
  await dialog.locator("#exportOk").click();
  await expect(page.locator('gnumarus-shell [data-testid="toast"]')).toBeHidden();
});

test("File > Export lists only formats the browser truly encodes", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintCenter(page);
  await stubSaveFilePicker(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Export" }).click();
  const dialog = page.locator("gnumarus-shell dialog#exportDialog");
  await expect(dialog).toBeVisible();
  const values = await dialog.locator("select#exportFormat option").evaluateAll((options) =>
    options.map((option) => (option as HTMLOptionElement).value),
  );
  expect(values).toEqual(expect.arrayContaining(["image/png", "image/jpeg", "image/webp"]));
  // Chromium has no canvas encoder for these (it used to fall back to PNG bytes).
  for (const mime of ["image/heic", "image/heif"]) {
    expect(values).not.toContain(mime);
  }
  // JPEG XL is always offered through the bundled WASM codec.
  expect(values).toContain("image/jxl");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  // Every listed format must round-trip to a blob of the claimed type.
  let prev: string | null = null;
  for (const mime of values) {
    await page.getByRole("button", { name: "File" }).click();
    await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Export project", exact: true }).click();
    await expect(dialog).toBeVisible();
    await dialog.locator("select#exportFormat").selectOption(mime);
    await dialog.locator("#exportOk").click();
    await page.waitForFunction(
      (previous: string | null) => {
        const root = window as unknown as {
          __gnumarusExportTest?: { fileName: string | null; blob: Blob | null };
        };
        const state = root.__gnumarusExportTest;
        return state?.fileName !== null && state?.fileName !== undefined && state.fileName !== previous;
      },
      prev,
    );
    const saved = await page.evaluate(() => {
      const root = window as unknown as {
        __gnumarusExportTest?: { fileName: string | null; blob: Blob | null };
      };
      return {
        fileName: root.__gnumarusExportTest?.fileName ?? null,
        type: root.__gnumarusExportTest?.blob?.type ?? null,
      };
    });
    expect(saved.type).toBe(mime);
    prev = saved.fileName;
  }
});

test("File > Export JPEG quality changes the file size", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintCenter(page);
  await stubSaveFilePicker(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Export" }).click();
  const dialog = page.locator("gnumarus-shell dialog#exportDialog");
  await expect(dialog).toBeVisible();
  // The lossless default offers no quality control.
  await expect(dialog.locator("input#exportQuality")).toHaveCount(0);
  await dialog.locator("select#exportFormat").selectOption("image/jpeg");
  await expect(dialog.locator("input#exportQuality")).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();

  async function exportJpegSize(quality: string): Promise<number> {
    await page.getByRole("button", { name: "File" }).click();
    await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Export project", exact: true }).click();
    await expect(dialog).toBeVisible();
    await dialog.locator("input#exportQuality").fill(quality);
    await page.evaluate(() => {
      const root = window as unknown as { __gnumarusExportTest?: { blob: Blob | null } };
      if (root.__gnumarusExportTest !== undefined) {
        root.__gnumarusExportTest.blob = null;
      }
    });
    await dialog.locator("#exportOk").click();
    await page.waitForFunction(() => {
      const root = window as unknown as { __gnumarusExportTest?: { blob: Blob | null } };
      return root.__gnumarusExportTest?.blob instanceof Blob;
    });
    return page.evaluate(() => {
      const root = window as unknown as { __gnumarusExportTest?: { blob: Blob | null } };
      return root.__gnumarusExportTest?.blob?.size ?? -1;
    });
  }

  const small = await exportJpegSize("10");
  const big = await exportJpegSize("100");
  expect(small).toBeGreaterThan(0);
  expect(big).toBeGreaterThan(small);
});
