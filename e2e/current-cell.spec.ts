import { expect, test } from "@playwright/test";
import { addFrames, loadBlankProject, stubProjectDirectory } from "./e2e-helpers";

async function engineCell(page: import("@playwright/test").Page): Promise<{ frame: number; layer: string }> {
  return page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getCurrentFrame(): number; getActiveLayerId(): string } };
    };
    return { frame: root.__gnumarus?.engine?.getCurrentFrame() ?? -1, layer: root.__gnumarus?.engine?.getActiveLayerId() ?? "?" };
  });
}

function matrixCell(page: import("@playwright/test").Page, layer: string, frame: number): import("@playwright/test").Locator {
  return page.locator(
    `gnumarus-shell [data-testid="animation-matrix"] [data-testid="anim-cell"][data-matrix-layer="${layer}"][data-matrix-frame="${frame}"]`,
  );
}

test("reopening restores the saved cell @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await addFrames(page, 2);
  await page.getByRole("button", { name: "Add layer" }).click();
  await page.getByRole("button", { name: "Add layer" }).click();
  // Second frame, second layer (cell 2,2): a non-top layer proves the
  // restore instead of the top-layer default.
  await matrixCell(page, "layer1", 1).click();
  expect(await engineCell(page)).toEqual({ frame: 1, layer: "layer1" });
  const stub = await stubProjectDirectory(page);
  await page.keyboard.press("Control+s");
  const json = await stub.writtenProject();
  expect(json).not.toBeNull();
  const saved = JSON.parse(json ?? "{}") as { animation?: { currentFrame?: number; activeLayer?: string } };
  expect(saved.animation?.currentFrame).toBe(1);
  expect(saved.animation?.activeLayer).toBe("layer1");
  // Move away, reopen, and expect the saved cell back (engine and UI).
  await matrixCell(page, "layer0", 0).click();
  expect(await engineCell(page)).toEqual({ frame: 0, layer: "layer0" });
  await page.keyboard.press("Control+Alt+o");
  await expect(page.locator("gnumarus-shell")).toContainText("MockProject", { timeout: 15000 });
  expect(await engineCell(page)).toEqual({ frame: 1, layer: "layer1" });
  await expect(page.locator("gnumarus-shell .layer-row.active")).toHaveAttribute("data-layer-id", "layer1");
});
