import { expect, test } from "@playwright/test";
import { addAnimation, getLayers, getMatrix, loadBlankProject, namedAnimations, paintCenter, setBrushColor, stubProjectDirectory } from "./e2e-helpers";

test("content manager dialog lists every project content @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await setBrushColor(page, "#ff0000");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  await paintCenter(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Content manager" }).click();
  const dialog = page.locator('gnumarus-shell dialog#contentManagerDialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('[data-testid="content-manager-section"]')).toHaveText(["Textures (1)", "Cell contents (1)"]);
  const textureItem = dialog.locator('[data-testid="content-manager-item"][data-kind="texture"]');
  await expect(textureItem).toHaveCount(1);
  await expect(textureItem).toContainText("64 × 64");
  const state = await getMatrix(page);
  const paintedContent = state.rows[0]?.cells[0]?.contentId ?? "";
  const paintedName = state.contents.find((entry) => entry.id === paintedContent)?.name ?? "";
  expect(paintedContent).not.toBe("");
  expect(paintedName).not.toBe("");
  await expect(textureItem).toContainText("Used by 1 contents");
  await expect(textureItem.locator('[data-testid="content-manager-content"]')).toHaveText([paintedName]);
  await expect(textureItem.locator('[data-testid="content-manager-content"]')).toHaveAttribute(
    "data-content-id",
    paintedContent,
  );
  const contentItem = dialog.locator('[data-testid="content-manager-item"][data-kind="content"]');
  await expect(contentItem).toHaveCount(1);
  await expect(contentItem).toContainText("Used in 1 cells");
});

test("content manager search filters by name similarity @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setBrushColor(page, "#ff0000");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  await paintCenter(page);
  await page.keyboard.press("Control+Shift+P");
  const palette = page.locator("gnumarus-shell dialog#actionPaletteDialog");
  await palette.locator('[data-testid="action-palette-input"]').fill("content manager");
  await palette.locator('[data-testid="action-palette-item"][data-action-id="content-manager"]').click();
  const dialog = page.locator('gnumarus-shell dialog#contentManagerDialog');
  await expect(dialog).toBeVisible();
  const search = dialog.locator('[data-testid="content-manager-search"]');
  await search.fill("zzz-nothing-matches");
  await expect(dialog.locator('[data-testid="content-manager-empty"]')).toBeVisible();
  await expect(dialog.locator('[data-testid="content-manager-item"]')).toHaveCount(0);
  const textureName = await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getContentManagerData(): { textures: Array<{ name: string }> } } };
    };
    return root.__gnumarus?.engine?.getContentManagerData()?.textures[0]?.name ?? "";
  });
  expect(textureName).not.toBe("");
  await search.fill(textureName);
  await expect(dialog.locator('[data-testid="content-manager-item"]')).toHaveCount(1);
  await expect(dialog.locator('[data-testid="content-manager-section"]')).toHaveText(["Textures (1)"]);
});

test("content manager shows on-disk sizes for saved textures @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setBrushColor(page, "#ff0000");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  await paintCenter(page);
  const project = await stubProjectDirectory(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  const blobs = await project.writtenBlobs();
  const textureFile = Object.keys(blobs).find((path) => path.startsWith("textures/"));
  expect(textureFile).toBeDefined();
  const fileBytes = blobs[textureFile ?? ""]?.length ?? 0;
  expect(fileBytes).toBeGreaterThan(0);
  // The encoded file differs from the raw RGBA buffer (64*64*4).
  expect(fileBytes).not.toBe(64 * 64 * 4);
  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    const kb = bytes / 1024;
    if (kb < 1024) {
      return `${Math.round(kb * 10) / 10} KB`;
    }
    return `${Math.round((kb / 1024) * 10) / 10} MB`;
  };
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Content manager" }).click();
  const dialog = page.locator('gnumarus-shell dialog#contentManagerDialog');
  await expect(dialog).toBeVisible();
  const item = dialog.locator('[data-testid="content-manager-item"][data-kind="texture"]');
  await expect(item).toHaveCount(1);
  await expect(item).toContainText(formatBytes(fileBytes));
});

test("new project starts with no textures or contents @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.keyboard.press("Control+Shift+P");
  const palette = page.locator("gnumarus-shell dialog#actionPaletteDialog");
  await palette.locator('[data-testid="action-palette-input"]').fill("content manager");
  await palette.locator('[data-testid="action-palette-item"][data-action-id="content-manager"]').click();
  const dialog = page.locator('gnumarus-shell dialog#contentManagerDialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('[data-testid="content-manager-section"]')).toHaveCount(0);
  await expect(dialog.locator('[data-testid="content-manager-item"]')).toHaveCount(0);
});

test("adding layers and frames creates no textures or contents @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setBrushColor(page, "#ff0000");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  await paintCenter(page);
  await page.getByRole("button", { name: "Add layer" }).click();
  await page.getByRole("button", { name: "Add frame", exact: true }).click();
  await page.keyboard.press("Control+Shift+P");
  const palette = page.locator("gnumarus-shell dialog#actionPaletteDialog");
  await palette.locator('[data-testid="action-palette-input"]').fill("content manager");
  await palette.locator('[data-testid="action-palette-item"][data-action-id="content-manager"]').click();
  const dialog = page.locator('gnumarus-shell dialog#contentManagerDialog');
  await expect(dialog).toBeVisible();
  // Only the painted cell's texture and content exist.
  await expect(dialog.locator('[data-testid="content-manager-item"]')).toHaveCount(2);
  await expect(dialog.locator('[data-testid="content-manager-section"]')).toHaveText(["Textures (1)", "Cell contents (1)"]);
});

test("new animation dialog lists the selected frames @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await page.getByRole("button", { name: "Add frame", exact: true }).click();
  await page.getByRole("button", { name: "Add frame", exact: true }).click();
  await matrix.locator('[data-testid="anim-frame"][data-frame="0"]').click();
  await matrix.locator('[data-testid="anim-frame"][data-frame="2"]').click({ modifiers: ["Control"] });
  await matrix.locator('[data-testid="anim-frame"][data-frame="2"]').click({ button: "right" });
  await page.getByRole("button", { name: "New animation" }).click();
  const dialog = page.locator("gnumarus-shell dialog#animationCreateDialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('[data-testid="animation-create-frames"]')).toHaveText(
    "The animation will use the following frames: 1, 3",
  );
  await dialog.locator('[data-testid="animation-create-cancel"]').click();
  await expect(dialog).toBeHidden();
  // A contiguous run collapses to a hyphen range.
  await matrix.locator('[data-testid="anim-frame"][data-frame="0"]').click();
  await matrix.locator('[data-testid="anim-frame"][data-frame="2"]').click({ modifiers: ["Shift"] });
  await matrix.locator('[data-testid="anim-frame"][data-frame="2"]').click({ button: "right" });
  await page.getByRole("button", { name: "New animation" }).click();
  await expect(dialog.locator('[data-testid="animation-create-frames"]')).toHaveText(
    "The animation will use the following frames: 1-3",
  );
  await dialog.locator('[data-testid="animation-create-cancel"]').click();
});

test("new animation dialog lists the selected frames in Brazilian Portuguese @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  const settings = page.locator("gnumarus-shell dialog#settingsDialog");
  await settings.locator("select#localeSelect").selectOption("pt-BR");
  await settings.getByRole("button", { name: "Fechar" }).click();
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await page.getByRole("button", { name: "Adicionar quadro", exact: true }).click();
  await matrix.locator('[data-testid="anim-frame"][data-frame="0"]').click();
  await matrix.locator('[data-testid="anim-frame"][data-frame="1"]').click({ modifiers: ["Control"] });
  await matrix.locator('[data-testid="anim-frame"][data-frame="1"]').click({ button: "right" });
  await page.getByRole("button", { name: "Nova animação" }).click();
  const dialog = page.locator("gnumarus-shell dialog#animationCreateDialog");
  await expect(dialog.locator('[data-testid="animation-create-frames"]')).toHaveText(
    "A animação usará os seguintes quadros: 1-2",
  );
  await dialog.locator('[data-testid="animation-create-cancel"]').click();
});

test("new animation dialog offers the reverse loops and stores them @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.locator('[data-testid="anim-frame"][data-frame="0"]').click({ button: "right" });
  await page.getByRole("button", { name: "New animation" }).click();
  const dialog = page.locator('gnumarus-shell dialog#animationCreateDialog');
  await expect(dialog).toBeVisible();
  const loop = dialog.locator('[data-testid="animation-create-loop"]');
  await expect(loop.locator('option[value="backward"]')).toHaveCount(1);
  await expect(loop.locator('option[value="ping-pong-backward"]')).toHaveCount(1);
  await dialog.locator('[data-testid="animation-create-name"]').fill("Back");
  await loop.selectOption("backward");
  await dialog.locator('[data-testid="animation-create-ok"]').click();
  expect(await namedAnimations(page)).toEqual([{ name: "Back", loop: "backward", frames: [{ frame: 0, duration: null }] }]);
});

test("new animation from a string accepts the reverse loops @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Add frame", exact: true }).click();
  await page.getByRole("button", { name: "Add frame", exact: true }).click();
  await addAnimation(page, "Back,backward,3,2,1");
  await addAnimation(page, "Yo,ping-pong-backward,1,2");
  expect(await namedAnimations(page)).toEqual([
    { name: "Back", loop: "backward", frames: [{ frame: 2, duration: null }, { frame: 1, duration: null }, { frame: 0, duration: null }] },
    { name: "Yo", loop: "ping-pong-backward", frames: [{ frame: 0, duration: null }, { frame: 1, duration: null }] },
  ]);
});

test("new animation from a single frame menu @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.locator('[data-testid="anim-frame"][data-frame="0"]').click({ button: "right" });
  await page.getByRole("button", { name: "New animation" }).click();
  const dialog = page.locator('gnumarus-shell dialog#animationCreateDialog');
  await expect(dialog).toBeVisible();
  await dialog.locator('[data-testid="animation-create-name"]').fill("Walk");
  await dialog.locator('[data-testid="animation-create-loop"]').selectOption("ping-pong");
  await dialog.locator('[data-testid="animation-create-ok"]').click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('gnumarus-shell [data-testid="animation-select"]')).toHaveValue("Walk");
  await expect(page.locator("gnumarus-shell")).toContainText("Animation Walk added (1 frame)");
  expect(await namedAnimations(page)).toEqual([{ name: "Walk", loop: "ping-pong", frames: [{ frame: 0, duration: null }] }]);
});

test("new animation from multiple frames rejects duplicate names @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await page.getByRole("button", { name: "Add frame", exact: true }).click();
  await matrix.locator('[data-testid="anim-frame"][data-frame="0"]').click();
  await matrix.locator('[data-testid="anim-frame"][data-frame="1"]').click({ modifiers: ["Control"] });
  await matrix.locator('[data-testid="anim-frame"][data-frame="1"]').click({ button: "right" });
  await page.getByRole("button", { name: "New animation" }).click();
  const dialog = page.locator('gnumarus-shell dialog#animationCreateDialog');
  await expect(dialog).toBeVisible();
  // Cancel leaves everything untouched.
  await dialog.locator('[data-testid="animation-create-cancel"]').click();
  await expect(dialog).toBeHidden();
  expect(await namedAnimations(page)).toEqual([]);
  await matrix.locator('[data-testid="anim-frame"][data-frame="1"]').click({ button: "right" });
  await page.getByRole("button", { name: "New animation" }).click();
  await dialog.locator('[data-testid="animation-create-name"]').fill("Run");
  await dialog.locator('[data-testid="animation-create-ok"]').click();
  await expect(page.locator('gnumarus-shell [data-testid="animation-select"]')).toHaveValue("Run");
  // Same name again is refused with the dialog kept open.
  await matrix.locator('[data-testid="anim-frame"][data-frame="0"]').click({ button: "right" });
  await page.getByRole("button", { name: "New animation" }).click();
  await dialog.locator('[data-testid="animation-create-name"]').fill("Run");
  await dialog.locator('[data-testid="animation-create-ok"]').click();
  await expect(dialog.locator('[data-testid="animation-create-error"]')).toBeVisible();
  // Plain-click first to collapse onto one frame, then create under a new name.
  await dialog.locator('[data-testid="animation-create-cancel"]').click();
  await matrix.locator('[data-testid="anim-frame"][data-frame="0"]').click();
  await matrix.locator('[data-testid="anim-frame"][data-frame="0"]').click({ button: "right" });
  await page.getByRole("button", { name: "New animation" }).click();
  await dialog.locator('[data-testid="animation-create-name"]').fill("Idle");
  await dialog.locator('[data-testid="animation-create-ok"]').click();
  await expect(dialog).toBeHidden();
  expect(await namedAnimations(page)).toEqual([
    { name: "Run", loop: "forward", frames: [{ frame: 0, duration: null }, { frame: 1, duration: null }] },
    { name: "Idle", loop: "forward", frames: [{ frame: 0, duration: null }] },
  ]);
});

test("new animation from the run action palette @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await page.getByRole("button", { name: "Add frame", exact: true }).click();
  await matrix.locator('[data-testid="anim-frame"][data-frame="1"]').click();
  await page.keyboard.press("Control+Shift+P");
  const palette = page.locator("gnumarus-shell dialog#actionPaletteDialog");
  await palette.locator('[data-testid="action-palette-input"]').fill("new animation");
  await palette.locator('[data-testid="action-palette-item"][data-action-id="new-animation"]').click();
  const dialog = page.locator('gnumarus-shell dialog#animationCreateDialog');
  await expect(dialog).toBeVisible();
  await dialog.locator('[data-testid="animation-create-name"]').fill("Jump");
  await dialog.locator('[data-testid="animation-create-ok"]').click();
  await expect(page.locator('gnumarus-shell [data-testid="animation-select"]')).toHaveValue("Jump");
  expect(await namedAnimations(page)).toEqual([{ name: "Jump", loop: "forward", frames: [{ frame: 1, duration: null }] }]);
});

test("Ctrl+Shift+Arrows create layers and frames @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.keyboard.press("Control+Shift+ArrowUp");
  let state = await getLayers(page);
  expect(state.layers.map((layer) => layer.id)).toEqual(["layer0", "layer1"]);
  expect(state.active).toBe("layer1");
  await page.keyboard.press("Control+Shift+ArrowDown");
  state = await getLayers(page);
  expect(state.layers.map((layer) => layer.id)).toEqual(["layer0", "layer2", "layer1"]);
  expect(state.active).toBe("layer2");
  await page.keyboard.press("Control+Shift+ArrowLeft");
  let matrix = await getMatrix(page);
  expect(matrix.frameCount).toBe(2);
  expect(matrix.currentFrame).toBe(0);
  await page.keyboard.press("Control+Shift+ArrowRight");
  matrix = await getMatrix(page);
  expect(matrix.frameCount).toBe(3);
  expect(matrix.currentFrame).toBe(1);
});

test("first painted cell content is named C1 @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await setBrushColor(page, "#ff0000");
  await paintCenter(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Content manager" }).click();
  const dialog = page.locator("gnumarus-shell dialog#contentManagerDialog");
  await expect(dialog).toBeVisible();
  const contentItem = dialog.locator('[data-testid="content-manager-item"][data-kind="content"]');
  await expect(contentItem).toHaveCount(1);
  await expect(contentItem.locator(".picker-name")).toHaveText("C1");
});
