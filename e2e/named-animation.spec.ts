import { expect, test } from "@playwright/test";
import { addAnimation, addFrames, animationDialog, getLayers, getMatrixFrame, loadBlankProject, loadRedProject, paintCenter, readPixel, selectAnimation } from "./e2e-helpers";

test("layer menu Resize to canvas crops excess and pads to cover", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadRedProject(page, 64, 64, -32, -32);
  await page.getByRole("button", { name: "Final preview" }).click();
  const previewCanvas = page.locator("gnumarus-shell canvas#previewCanvas");
  await expect(previewCanvas).toBeVisible();
  const previewPixel = (x: number, y: number): Promise<number[] | null> =>
    page.evaluate(([px, py]: number[]) => {
      const root = document.querySelector("gnumarus-shell")?.shadowRoot ?? null;
      const target = root?.getElementById("previewCanvas") as HTMLCanvasElement | null;
      const ctx = target?.getContext("2d") ?? null;
      if (ctx === null) {
        return null;
      }
      const data = ctx.getImageData(px, py, 1, 1).data;
      return [data[0], data[1], data[2], data[3]];
    }, [x, y]);
  expect(await previewPixel(0, 0)).toEqual([255, 0, 0, 255]);
  await page.locator('gnumarus-shell [data-layer-id="layer0"]').click({ button: "right" });
  await page.getByRole("button", { name: "Resize to canvas" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Texture resized to 64 x 64");
  const resized = (await getLayers(page)).layers[0];
  expect(resized?.width).toBe(64);
  expect(resized?.height).toBe(64);
  expect(resized?.transform.x).toBeCloseTo(0, 9);
  expect(resized?.transform.y).toBeCloseTo(0, 9);
  // Old bottom-right quadrant moved to the top-left; padding is transparent.
  expect(await readPixel(page, 0, 0)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 31, 31)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  expect(await readPixel(page, 63, 63)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  // Rendering position is preserved.
  expect(await previewPixel(0, 0)).toEqual([255, 0, 0, 255]);
  // Undo restores the full offset texture; redo resizes again.
  await page.keyboard.press("Control+z");
  const undone = (await getLayers(page)).layers[0];
  expect(undone?.width).toBe(64);
  expect(undone?.transform.x).toBeCloseTo(-32, 9);
  expect(await readPixel(page, 0, 0)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  await page.keyboard.press("Control+y");
  const redone = (await getLayers(page)).layers[0];
  expect(redone?.width).toBe(64);
  expect(redone?.transform.x).toBeCloseTo(0, 9);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
});

test("cell menu Resize to canvas pads a small texture with transparency", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadRedProject(page, 64, 32, 0, 0);
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  const cell = matrix.locator('[data-testid="anim-cell"][data-matrix-layer="layer0"][data-matrix-frame="0"]');
  await cell.click({ button: "right" });
  await page.getByRole("button", { name: "Resize to canvas" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Texture resized to 64 x 64");
  const resized = (await getLayers(page)).layers[0];
  expect(resized?.width).toBe(64);
  expect(resized?.height).toBe(64);
  expect(resized?.transform.x).toBeCloseTo(0, 9);
  expect(resized?.transform.y).toBeCloseTo(0, 9);
  // Old pixels sit centered; the new border is zeroed in all channels.
  expect(await readPixel(page, 16, 16)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 47, 47)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 0, 0)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  expect(await readPixel(page, 63, 63)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  await page.keyboard.press("Control+z");
  expect((await getLayers(page)).layers[0]?.width).toBe(32);
});

test("Ctrl+Alt+Arrow expands the current cell texture by the configured step", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintCenter(page);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  await page.keyboard.press("Control+Alt+ArrowRight");
  await expect(page.locator("gnumarus-shell")).toContainText("Texture expanded to 80 x 64");
  expect((await getLayers(page)).layers[0]?.width).toBe(80);
  // Expanding right keeps existing coordinates: the painted pixel stays put.
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  await page.keyboard.press("Control+Alt+ArrowLeft");
  await expect(page.locator("gnumarus-shell")).toContainText("Texture expanded to 96 x 64");
  expect((await getLayers(page)).layers[0]?.width).toBe(96);
  // Expanding left shifts existing pixels right by the step.
  expect(await readPixel(page, 48, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  await page.keyboard.press("Control+z");
  expect((await getLayers(page)).layers[0]?.width).toBe(80);
  // The step setting changes the growth: 8px down from 64px height.
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await page.locator("gnumarus-shell input#expandStep").fill("8");
  const persisted = await page.evaluate(() => window.localStorage.getItem("gnumarus.settings.expand.v1"));
  expect(persisted).toContain("8");
  await page.getByRole("button", { name: "Close" }).click();
  await page.keyboard.press("Control+Alt+ArrowDown");
  await expect(page.locator("gnumarus-shell")).toContainText("Texture expanded to 80 x 72");
  expect((await getLayers(page)).layers[0]?.height).toBe(72);
});

test("fit texture dialog focuses OK so Enter confirms immediately", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintCenter(page);
  await page.locator('gnumarus-shell [data-layer-id="layer0"]').click({ button: "right" });
  await page.getByRole("button", { name: "Fit texture to size" }).click();
  const dialog = page.locator("gnumarus-shell dialog#fitTextureDialog");
  await expect(dialog).toBeVisible();
  const focusedId = await page.evaluate(() => {
    const root = document.querySelector("gnumarus-shell")?.shadowRoot ?? null;
    const active = root?.activeElement;
    return active instanceof HTMLElement ? active.id : null;
  });
  expect(focusedId).toBe("fitTextureOk");
  await page.keyboard.press("Enter");
  await expect(dialog).toBeHidden();
  await expect(page.locator('gnumarus-shell [data-layer-id="layer0"]')).toContainText("1×1");
});

test("fit alpha threshold default flows into the dialog and persists", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await paintCenter(page);
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  const setting = page.locator("gnumarus-shell input#fitDefaultThreshold");
  await expect(setting).toHaveValue("0");
  await setting.fill("10");
  const persisted = await page.evaluate(() => window.localStorage.getItem("gnumarus.settings.fit.v1"));
  expect(persisted).toContain("10");
  await page.getByRole("button", { name: "Close" }).click();
  await page.locator('gnumarus-shell [data-layer-id="layer0"]').click({ button: "right" });
  await page.getByRole("button", { name: "Fit texture to size" }).click();
  await expect(page.locator("gnumarus-shell dialog#fitTextureDialog input#fitThreshold")).toHaveValue("10");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("button", { name: "Reset fit alpha threshold to default" }).click();
  await expect(page.locator("gnumarus-shell input#fitDefaultThreshold")).toHaveValue("0");
});

test("named animations reject bad definitions and list valid ones", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await addFrames(page, 2);
  const dialog = await animationDialog(page);
  await dialog.locator("input#animationInput").fill("walk,sideways,1");
  await dialog.getByRole("button", { name: "Add", exact: true }).click();
  await expect(dialog.locator('[role="alert"]')).toContainText("none, forward, ping-pong, backward or ping-pong-backward");
  await dialog.locator("input#animationInput").fill("walk,forward,1,2");
  await dialog.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Animation walk added (2 frames)");
  await expect(dialog.locator('[data-testid="animation-list"]')).toContainText('"walk": forward, 2 frames: 1,2');
  await expect(page.locator('gnumarus-shell [data-testid="animation-select"]')).toContainText("walk");
  await dialog.locator("input#animationInput").fill("walk,none,3");
  await dialog.getByRole("button", { name: "Add", exact: true }).click();
  await expect(dialog.locator('[role="alert"]')).toContainText("already exists");
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(dialog).toBeHidden();
});

test("animation delete asks for confirmation", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await addFrames(page, 1);
  await addAnimation(page, "walk,forward,1,2");
  const dialog = await animationDialog(page);
  const listItem = dialog.locator("li", { hasText: '"walk"' });
  await expect(listItem).toBeVisible();
  await listItem.getByRole("button", { name: 'Delete animation walk' }).click();
  const confirm = page.locator("gnumarus-shell dialog#animationDeleteDialog");
  await expect(confirm).toBeVisible();
  await expect(confirm).toContainText("Are you sure");
  await confirm.getByRole("button", { name: "No", exact: true }).click();
  await expect(confirm).toBeHidden();
  await expect(dialog.locator('[data-testid="animation-list"]')).toContainText('"walk"');
  await listItem.getByRole("button", { name: 'Delete animation walk' }).click();
  await expect(confirm).toBeVisible();
  await confirm.getByRole("button", { name: "Yes", exact: true }).click();
  await expect(confirm).toBeHidden();
  await expect(dialog.locator('[data-testid="animation-list"]')).not.toContainText('"walk"');
  await expect(page.locator("gnumarus-shell")).toContainText("Animation walk deleted");
});

test("selecting an animation highlights its frame columns", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await addFrames(page, 2);
  await addAnimation(page, "walk,forward,1,3");
  await page.locator('gnumarus-shell [data-testid="animation-select"]').selectOption("walk");
  await expect(page.locator("gnumarus-shell")).toContainText("Animation walk selected");
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await expect(matrix.locator('.anim-frame-header:has([data-frame="0"])')).toHaveClass(/in-animation/);
  await expect(matrix.locator('.anim-frame-header:has([data-frame="2"])')).toHaveClass(/in-animation/);
  await expect(matrix.locator('.anim-frame-header:has([data-frame="1"])')).not.toHaveClass(/in-animation/);
  await expect(
    matrix.locator('[data-testid="anim-cell"][data-matrix-frame="0"]').first(),
  ).toHaveClass(/in-animation/);
  await selectAnimation(page, "");
  await expect(matrix.locator('.anim-frame-header:has([data-frame="0"])')).not.toHaveClass(/in-animation/);
});

test("frame headers show how many animations include each frame", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  const titleOf = async (frame: number): Promise<string | null> =>
    matrix.locator(`[data-testid="anim-frame"][data-frame="${frame}"]`).getAttribute("title");
  await expect.poll(() => titleOf(0)).toContain("in no animations");
  await addFrames(page, 3);
  await addAnimation(page, "walk,forward,1,3");
  await addAnimation(page, "run,forward,2,3,4");
  await expect.poll(() => titleOf(0)).toBe("Frame 1: F1 — 0.25 s, in 1 animation");
  await expect.poll(() => titleOf(1)).toBe("Frame 2: F2 — 0.25 s, in 1 animation");
  await expect.poll(() => titleOf(2)).toBe("Frame 3: F3 — 0.25 s, in 2 animations");
  await expect.poll(() => titleOf(3)).toBe("Frame 4 (current): F4 — 0.25 s, in 1 animation");
});

test("forward playback follows the animation order and skips other frames", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await addFrames(page, 2);
  await addAnimation(page, "walk,forward,3,1");
  await selectAnimation(page, "walk");
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.getByRole("button", { name: "Play animation", exact: true }).click();
  // Custom order 3,1: from frame 1 the next shown frame is 3, then 1 again.
  await expect.poll(async () => getMatrixFrame(page), { timeout: 5000 }).toBe(2);
  await expect.poll(async () => getMatrixFrame(page), { timeout: 5000 }).toBe(0);
  await matrix.getByRole("button", { name: "Stop animation", exact: true }).click();
  await expect(matrix.getByRole("button", { name: "Play animation", exact: true })).toBeVisible();
});

test("a none animation stops after its last frame", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await addFrames(page, 2);
  await addAnimation(page, "once,none,1,2");
  await selectAnimation(page, "once");
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.getByRole("button", { name: "Play animation", exact: true }).click();
  await expect.poll(async () => getMatrixFrame(page), { timeout: 5000 }).toBe(1);
  await expect(matrix.getByRole("button", { name: "Play animation", exact: true })).toBeVisible();
  await page.waitForTimeout(400);
  expect(await getMatrixFrame(page)).toBe(1);
});

test("a ping-pong animation bounces without repeating endpoints", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await addFrames(page, 2);
  await addAnimation(page, "boing,ping-pong,1,2,3");
  await selectAnimation(page, "boing");
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.getByRole("button", { name: "Play animation", exact: true }).click();
  // Dense polls: frames flip every ~250ms, so the default poll backoff
  // (100/250/500/1000ms) aliases and can miss a frame window deterministically.
  await expect.poll(async () => getMatrixFrame(page), { timeout: 10000, intervals: [50] }).toBe(1);
  await expect.poll(async () => getMatrixFrame(page), { timeout: 10000, intervals: [50] }).toBe(2);
  // Forward would wrap to frame 1 here; ping-pong bounces back to frame 2.
  await expect.poll(async () => getMatrixFrame(page), { timeout: 10000, intervals: [50] }).toBe(1);
  await matrix.getByRole("button", { name: "Stop animation", exact: true }).click();
});

test("deleting the selected animation restores the full timeline", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await addFrames(page, 1);
  await addAnimation(page, "walk,forward,1,2");
  await selectAnimation(page, "walk");
  const dialog = await animationDialog(page);
  await dialog.getByRole("button", { name: "Delete animation walk", exact: true }).click();
  const confirm = page.locator("gnumarus-shell dialog#animationDeleteDialog");
  await expect(confirm).toBeVisible();
  await confirm.getByRole("button", { name: "Yes", exact: true }).click();
  await expect(confirm).toBeHidden();
  await expect(page.locator("gnumarus-shell")).toContainText("Animation walk deleted");
  await expect(page.locator('gnumarus-shell [data-testid="animation-select"]')).toHaveValue("");
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await expect(matrix.locator('.anim-frame-header:has([data-frame="0"])')).not.toHaveClass(/in-animation/);
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
});

test("animation duration overrides win over the project default", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await addFrames(page, 1);
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { setDefaultFrameDuration(d: number): boolean } } };
    root.__gnumarus?.engine?.setDefaultFrameDuration(2);
  });
  await addAnimation(page, "fast,forward,1:0.1,2:0.1");
  await selectAnimation(page, "fast");
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.getByRole("button", { name: "Play animation", exact: true }).click();
  // With the 2s project default this would time out; overrides tick at 0.1s.
  await expect.poll(async () => getMatrixFrame(page), { timeout: 1500 }).toBe(1);
  await matrix.getByRole("button", { name: "Stop animation", exact: true }).click();
});

test("switching animation mid-playback restarts on the new animation", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await addFrames(page, 3);
  await addAnimation(page, "walk,forward,1,2");
  await addAnimation(page, "run,forward,3,4");
  await selectAnimation(page, "walk");
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.getByRole("button", { name: "Play animation", exact: true }).click();
  await expect(matrix.getByRole("button", { name: "Stop animation", exact: true })).toBeVisible();
  // Switch scope while playing: the old animation stops and the new one starts.
  await page.locator('gnumarus-shell [data-testid="animation-select"]').selectOption("run");
  await expect(matrix.getByRole("button", { name: "Stop animation", exact: true })).toBeVisible();
  await expect.poll(async () => getMatrixFrame(page), { timeout: 10000 }).toBe(2);
  // Back to all frames keeps playing the full timeline.
  await page.locator('gnumarus-shell [data-testid="animation-select"]').selectOption("");
  await expect(matrix.getByRole("button", { name: "Stop animation", exact: true })).toBeVisible();
  await matrix.getByRole("button", { name: "Stop animation", exact: true }).click();
  await expect(matrix.getByRole("button", { name: "Play animation", exact: true })).toBeVisible();
});

test("switching animation while stopped does not start playback", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await addFrames(page, 3);
  await addAnimation(page, "walk,forward,1,2");
  await addAnimation(page, "run,forward,3,4");
  await selectAnimation(page, "walk");
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await expect(matrix.getByRole("button", { name: "Play animation", exact: true })).toBeVisible();
  await page.locator('gnumarus-shell [data-testid="animation-select"]').selectOption("run");
  await expect(page.locator("gnumarus-shell")).toContainText("Animation run selected");
  await expect(matrix.getByRole("button", { name: "Play animation", exact: true })).toBeVisible();
});
