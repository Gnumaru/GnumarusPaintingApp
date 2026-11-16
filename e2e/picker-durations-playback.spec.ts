import { expect, test } from "@playwright/test";
import { getDefaultFrameDuration, getFrameDuration, getMatrixFrame, loadBlankProject, openPicker, readPixel, setPencil } from "./e2e-helpers";

test("custom picker edits pencil color through models and inputs", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  const picker = await openPicker(page, "pencilColor");
  const modelSelect = picker.locator("select#modelSelect");
  await expect(modelSelect.locator("option")).toHaveCount(7);
  for (const id of ["rgb", "cmyk", "hsv", "hsl", "okhsl", "okhsv", "ard"]) {
    await expect(modelSelect.locator(`option[value="${id}"]`)).toHaveCount(1);
  }
  await modelSelect.selectOption("rgb");
  await picker.getByLabel("Red", { exact: true }).fill("255");
  await picker.getByLabel("Green", { exact: true }).fill("0");
  await picker.getByLabel("Blue", { exact: true }).fill("0");
  await picker.getByLabel("Alpha", { exact: true }).fill("255");
  await expect(page.locator("gnumarus-shell")).toContainText("#ff0000");
  await modelSelect.selectOption("cmyk");
  await expect(picker.getByLabel("Cyan", { exact: true })).toHaveValue("0.0");
  await expect(picker.getByLabel("Magenta", { exact: true })).toHaveValue("100.0");
  await picker.getByLabel("Yellow", { exact: true }).fill("0");
  await picker.getByLabel("Magenta", { exact: true }).fill("0");
  await picker.getByLabel("Cyan", { exact: true }).fill("100");
  await picker.getByLabel("Black", { exact: true }).fill("0");
  await expect(page.locator("gnumarus-shell")).toContainText("#00ffff");
  await modelSelect.selectOption("hsl");
  await expect(picker.getByLabel("Hue", { exact: true })).toHaveValue("180.0");
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  await page.keyboard.press("Escape");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 255, b: 255, a: 255 });
});

test("custom picker bars render gradients and drag to change color", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await setPencil(page, "#ff0000");
  const picker = await openPicker(page, "pencilColor");
  await picker.locator("select#modelSelect").selectOption("hsl");
  const hueBar = picker.locator('[data-testid="axis-bar-h"]');
  const style = await hueBar.getAttribute("style");
  expect(style).toContain("linear-gradient(to right");
  expect(style).toContain("rgb(255, 0, 0) 0%");
  expect(style).toContain("100%");
  const before = await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { colorValue: string } } };
    return root.__gnumarus?.shell?.colorValue ?? "";
  });
  const barBox = await hueBar.boundingBox();
  if (barBox === null) {
    throw new Error("hue bar has no bounding box");
  }
  await page.mouse.move(barBox.x + barBox.width * 0.9, barBox.y + barBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(barBox.x + barBox.width * 0.1, barBox.y + barBox.height / 2, { steps: 5 });
  await page.mouse.up();
  const after = await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { colorValue: string } } };
    return root.__gnumarus?.shell?.colorValue ?? "";
  });
  expect(after).not.toBe(before);
  await expect(picker.getByLabel("Hue", { exact: true })).not.toHaveValue("0.0");
});

test("custom picker supports alpha and clamps manual input", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  const picker = await openPicker(page, "pencilColor");
  await picker.locator("select#modelSelect").selectOption("rgb");
  await picker.getByLabel("Red", { exact: true }).fill("10");
  await picker.getByLabel("Green", { exact: true }).fill("20");
  await picker.getByLabel("Blue", { exact: true }).fill("30");
  await picker.getByLabel("Alpha", { exact: true }).fill("128");
  await expect(page.locator("gnumarus-shell")).toContainText("#0a141e80");
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  await page.keyboard.press("Escape");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 10, g: 20, b: 30, a: 128 });
  await picker.getByRole("button", { name: "Pick color" }).click();
  await picker.locator("select#modelSelect").selectOption("hsv");
  await picker.getByLabel("Saturation", { exact: true }).fill("999");
  await expect(picker.getByLabel("Saturation", { exact: true })).toHaveValue("100.0");
  const hueBefore = await picker.getByLabel("Hue", { exact: true }).inputValue();
  await picker.getByLabel("Hue", { exact: true }).fill("");
  await picker.getByLabel("Hue", { exact: true }).press("Tab");
  await expect(picker.getByLabel("Hue", { exact: true })).toHaveValue(hueBefore);
});

test("custom picker defaults to hsl and exposes alpha in every model", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const picker = await openPicker(page, "pencilColor");
  await expect(picker.locator("select#modelSelect")).toHaveValue("hsl");
  for (const id of ["rgb", "cmyk", "hsv", "hsl", "okhsl", "okhsv", "ard"]) {
    await picker.locator("select#modelSelect").selectOption(id);
    await expect(picker.getByLabel("Alpha", { exact: true })).toBeVisible();
  }
  await picker.locator("select#modelSelect").selectOption("hsv");
  await picker.getByLabel("Hue", { exact: true }).fill("0");
  await picker.getByLabel("Saturation", { exact: true }).fill("100");
  await picker.getByLabel("Value", { exact: true }).fill("100");
  await picker.getByLabel("Alpha", { exact: true }).fill("128");
  await expect(page.locator("gnumarus-shell")).toContainText("#ff000080");
});

test("custom picker ard uses diagonal 0-360 and ratio 0-255", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const picker = await openPicker(page, "pencilColor");
  await picker.locator("select#modelSelect").selectOption("ard");
  await expect(picker.getByLabel("Angle", { exact: true })).toHaveAttribute("max", "360");
  await expect(picker.getByLabel("Ratio", { exact: true })).toHaveAttribute("max", "255");
  await expect(picker.getByLabel("Diagonal", { exact: true })).toHaveAttribute("max", "360");
  await picker.getByLabel("Angle", { exact: true }).fill("30");
  await picker.getByLabel("Ratio", { exact: true }).fill("255");
  await picker.getByLabel("Diagonal", { exact: true }).fill("120");
  await expect(page.locator("gnumarus-shell")).toContainText("#ff0000");
});

test("custom picker sliders and inputs work while value is zero", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const picker = await openPicker(page, "pencilColor");
  await picker.locator("select#modelSelect").selectOption("hsv");
  await picker.getByLabel("Value", { exact: true }).fill("0");
  const hueBar = picker.locator('[data-testid="axis-bar-h"]');
  const hueBox = await hueBar.boundingBox();
  if (hueBox === null) {
    throw new Error("hue bar has no bounding box");
  }
  await page.mouse.move(hueBox.x + hueBox.width * 0.75, hueBox.y + hueBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(hueBox.x + hueBox.width * 0.25, hueBox.y + hueBox.height / 2, { steps: 5 });
  await page.mouse.up();
  await expect(picker.getByLabel("Hue", { exact: true })).not.toHaveValue("0.0");
  await picker.getByLabel("Saturation", { exact: true }).fill("50");
  await expect(picker.getByLabel("Saturation", { exact: true })).toHaveValue("50.0");
  await picker.getByLabel("Value", { exact: true }).fill("100");
  await expect(page.locator("gnumarus-shell")).not.toContainText("#000000");
});

test("frame menu sets and clears an explicit frame duration", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  expect(await getFrameDuration(page, 0)).toBeNull();
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  await matrix.locator('[data-testid="anim-frame"][data-frame="1"]').click({ button: "right" });
  await page.getByRole("button", { name: "Set frame duration…" }).click();
  await page.locator("gnumarus-shell input#frameDuration").fill("0.25");
  await page.getByRole("button", { name: "Set", exact: true }).click();
  expect(await getFrameDuration(page, 1)).toBe(0.25);
  expect(await getFrameDuration(page, 0)).toBeNull();
  await expect(page.locator("gnumarus-shell")).toContainText("Frame 2 duration: 0.25 s");
  await matrix.locator('[data-testid="anim-frame"][data-frame="1"]').click({ button: "right" });
  await page.getByRole("button", { name: "Set frame duration…" }).click();
  await expect(page.locator("gnumarus-shell input#frameDuration")).toHaveValue("0.25");
  await page.getByRole("button", { name: "Clear" }).click();
  await expect(page.locator("gnumarus-shell dialog#frameDurationDialog")).toBeHidden();
  expect(await getFrameDuration(page, 1)).toBeNull();
  await expect(page.locator("gnumarus-shell")).toContainText("uses the project default");
});

test("project default frame duration is configurable with a reset", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  expect(await getDefaultFrameDuration(page)).toBe(0.25);
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.locator("gnumarus-shell")).toContainText("Default frame duration");
  const input = page.locator("gnumarus-shell input#defaultFrameDuration");
  await expect(input).toHaveValue("0.25");
  await expect(page.getByRole("button", { name: "Reset default frame duration to default" })).toHaveCount(0);
  await input.fill("0.5");
  expect(await getDefaultFrameDuration(page)).toBe(0.5);
  await expect(page.getByRole("button", { name: "Reset default frame duration to default" })).toBeVisible();
  await expect(page.locator("gnumarus-shell")).toContainText("Default frame duration: 0.5 s");
  await page.getByRole("button", { name: "Reset default frame duration to default" }).click();
  expect(await getDefaultFrameDuration(page)).toBe(0.25);
  await expect(page.getByRole("button", { name: "Reset default frame duration to default" })).toHaveCount(0);
});

test("menubar closes on outside click and Escape", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const menubar = page.locator("gnumarus-shell .menubar");
  const fileItem = menubar.getByRole("button", { name: "New Project", exact: true });
  await page.getByRole("button", { name: "File" }).click();
  await expect(fileItem).toBeVisible();
  await page.locator("gnumarus-shell canvas").click();
  await expect(fileItem).toBeHidden();
  await page.getByRole("button", { name: "File" }).click();
  await expect(fileItem).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(fileItem).toBeHidden();
});

test("menubar switches menus on hover while open", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const menubar = page.locator("gnumarus-shell .menubar");
  const fileItem = menubar.getByRole("button", { name: "New Project", exact: true });
  const editItem = menubar.getByRole("button", { name: "Settings", exact: true });
  const helpItem = menubar.getByRole("button", { name: "Shortcuts", exact: true });
  // Hovering with no menu open opens nothing.
  await menubar.getByRole("button", { name: "Edit" }).hover();
  await expect(fileItem).toBeHidden();
  await expect(editItem).toBeHidden();
  await page.getByRole("button", { name: "File" }).click();
  await expect(fileItem).toBeVisible();
  await menubar.getByRole("button", { name: "Edit" }).hover();
  await expect(fileItem).toBeHidden();
  await expect(editItem).toBeVisible();
  await menubar.getByRole("button", { name: "Help" }).hover();
  await expect(editItem).toBeHidden();
  await expect(helpItem).toBeVisible();
});

test("playback advances frames by duration and stops on demand", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { setFrameDuration(f: number, d: number | null): boolean; setCurrentFrame(f: number): boolean } };
    };
    root.__gnumarus?.engine?.setFrameDuration(0, 0.2);
    root.__gnumarus?.engine?.setFrameDuration(2, 0.2);
    root.__gnumarus?.engine?.setCurrentFrame(1);
  });
  await expect(matrix.locator('[data-testid="anim-frame"][data-frame="1"]')).toHaveAttribute("aria-label", /current/);
  await matrix.getByRole("button", { name: "Play animation", exact: true }).click();
  await expect(matrix.getByRole("button", { name: "Stop animation", exact: true })).toBeVisible();
  await expect
    .poll(async () => getMatrixFrame(page), { timeout: 5000 })
    .toBe(2);
  await matrix.getByRole("button", { name: "Stop animation", exact: true }).click();
  const stoppedAt = await getMatrixFrame(page);
  await page.waitForTimeout(400);
  expect(await getMatrixFrame(page)).toBe(stoppedAt);
  await expect(matrix.getByRole("button", { name: "Play animation", exact: true })).toBeVisible();
});
