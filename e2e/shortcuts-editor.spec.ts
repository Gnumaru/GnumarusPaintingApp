import { expect, test } from "@playwright/test";

async function openEditor(page: import("@playwright/test").Page): Promise<import("@playwright/test").Locator> {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("button", { name: "Edit shortcuts" }).click();
  const dialog = page.locator("gnumarus-shell dialog#shortcutsDialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

function rowFor(dialog: import("@playwright/test").Locator, id: string): import("@playwright/test").Locator {
  return dialog.locator(`[data-testid="shortcut-row"][data-shortcut-id="${id}"]`);
}

test("Edit menu and run action open the same shortcuts editor", async ({ page }) => {
  const dialog = await openEditor(page);
  await expect(dialog).toContainText("Keyboard shortcuts");
  await expect(dialog.locator('[data-testid="shortcut-preset"]')).toBeVisible();
  await expect(dialog.locator('[data-testid="shortcut-search"]')).toBeVisible();
  await expect(dialog.locator('[data-testid="shortcut-reset-all"]')).toBeVisible();
  // Every row has a name, a key description and a change button.
  const pencil = rowFor(dialog, "tool-pencil");
  await expect(pencil).toContainText("Pencil");
  await expect(pencil.locator('[data-testid="shortcut-keys"]')).toContainText("B");
  await expect(pencil.locator('[data-testid="shortcut-change"]')).toBeVisible();
  // Mouse gestures describe the fixed gesture.
  const pan = rowFor(dialog, "view-pan");
  await expect(pan.locator('[data-testid="shortcut-keys"]')).toContainText("space");
  await expect(pan.locator('[data-testid="shortcut-keys"]')).toContainText("left-drag");
  // Close button, outside click and Escape all close.
  await dialog.locator('[data-testid="shortcut-close"]').click();
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("button", { name: "Edit shortcuts" }).click();
  await expect(dialog).toBeVisible();
  await page.mouse.click(5, 5);
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("button", { name: "Edit shortcuts" }).click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("search filters shortcuts by name similarity", async ({ page }) => {
  const dialog = await openEditor(page);
  const search = dialog.locator('[data-testid="shortcut-search"]');
  await search.fill("pencil");
  await expect(rowFor(dialog, "tool-pencil")).toBeVisible();
  await expect(rowFor(dialog, "tool-bucket")).toBeHidden();
  await search.fill("eyedropper");
  await expect(rowFor(dialog, "edit-temp-eyedropper")).toBeVisible();
  await search.fill("zzz-no-such-shortcut");
  await expect(dialog.locator('[data-testid="shortcut-empty"]')).toBeVisible();
});

test("change applies, cancel discards and default restores", async ({ page }) => {
  const dialog = await openEditor(page);
  await dialog.locator('[data-testid="shortcut-search"]').fill("Pencil");
  const pencil = rowFor(dialog, "tool-pencil");
  await pencil.locator('[data-testid="shortcut-change"]').click();
  const edit = page.locator("gnumarus-shell dialog#shortcutEditDialog");
  await expect(edit).toBeVisible();
  // Five modifier checkboxes plus a symbol input.
  for (const mod of ["ctrl", "alt", "shift", "super", "space"]) {
    await expect(edit.locator(`[data-testid="shortcut-mod-${mod}"]`)).toBeVisible();
  }
  const input = edit.locator('[data-testid="shortcut-key-input"]');
  await expect(input).toHaveValue("b");
  // Cancel discards.
  await input.fill("F8");
  await edit.locator('[data-testid="shortcut-edit-cancel"]').click();
  await expect(pencil.locator('[data-testid="shortcut-keys"]')).toContainText("B");
  // OK applies: pencil moves to F8 and F8 actually selects it.
  await pencil.locator('[data-testid="shortcut-change"]').click();
  await edit.locator('[data-testid="shortcut-key-input"]').fill("F8");
  await edit.locator('[data-testid="shortcut-edit-ok"]').click();
  await expect(pencil.locator('[data-testid="shortcut-keys"]')).toContainText("F8");
  await dialog.locator('[data-testid="shortcut-close"]').click();
  await expect(dialog).toBeHidden();
  await page.keyboard.press("g");
  await expect(page.locator("gnumarus-shell")).toContainText("bucket");
  await page.keyboard.press("F8");
  await expect(page.locator("gnumarus-shell")).toContainText("pencil");
  // Default restores the factory key.
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("button", { name: "Edit shortcuts" }).click();
  await expect(dialog).toBeVisible();
  await dialog.locator('[data-testid="shortcut-search"]').fill("Pencil");
  await rowFor(dialog, "tool-pencil").locator('[data-testid="shortcut-change"]').click();
  await edit.locator('[data-testid="shortcut-edit-default"]').click();
  await expect(edit.locator('[data-testid="shortcut-key-input"]')).toHaveValue("b");
  await edit.locator('[data-testid="shortcut-edit-ok"]').click();
  await expect(rowFor(dialog, "tool-pencil").locator('[data-testid="shortcut-keys"]')).toContainText("B");
});

test("conflicting shortcuts turn red and stay disabled until changed", async ({ page }) => {
  const dialog = await openEditor(page);
  await dialog.locator('[data-testid="shortcut-search"]').fill("");
  // Force bucket onto B (pencil's key).
  await rowFor(dialog, "tool-bucket").locator('[data-testid="shortcut-change"]').click();
  const edit = page.locator("gnumarus-shell dialog#shortcutEditDialog");
  await edit.locator('[data-testid="shortcut-key-input"]').fill("b");
  await edit.locator('[data-testid="shortcut-edit-ok"]').click();
  await expect(rowFor(dialog, "tool-pencil")).toHaveClass(/shortcut-conflict/);
  await expect(rowFor(dialog, "tool-bucket")).toHaveClass(/shortcut-conflict/);
  // Closing disables both: B selects neither pencil nor bucket.
  await dialog.locator('[data-testid="shortcut-close"]').click();
  await expect(dialog).toBeHidden();
  await page.keyboard.press("l");
  await expect(page.locator("gnumarus-shell")).toContainText("line");
  await page.keyboard.press("b");
  await expect(page.locator("gnumarus-shell")).not.toContainText("pencil");
  await expect(page.locator("gnumarus-shell")).not.toContainText("bucket");
  // Resolve the conflict: bucket back to G re-enables both.
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("button", { name: "Edit shortcuts" }).click();
  await expect(dialog).toBeVisible();
  await rowFor(dialog, "tool-bucket").locator('[data-testid="shortcut-change"]').click();
  await edit.locator('[data-testid="shortcut-edit-default"]').click();
  await edit.locator('[data-testid="shortcut-edit-ok"]').click();
  await expect(rowFor(dialog, "tool-pencil")).not.toHaveClass(/shortcut-conflict/);
  await dialog.locator('[data-testid="shortcut-close"]').click();
  await page.keyboard.press("b");
  await expect(page.locator("gnumarus-shell")).toContainText("pencil");
});

test("mouse gestures keep the fixed gesture and edit only the keyboard part", async ({ page }) => {
  const dialog = await openEditor(page);
  await dialog.locator('[data-testid="shortcut-search"]').fill("Pan canvas");
  const pan = rowFor(dialog, "view-pan");
  await expect(pan.locator('[data-testid="shortcut-keys"]')).toContainText("left-drag");
  await pan.locator('[data-testid="shortcut-change"]').click();
  const edit = page.locator("gnumarus-shell dialog#shortcutEditDialog");
  await expect(edit).toContainText("Mouse gesture");
  await expect(edit).toContainText("left-drag");
  // Space is a modifier checkbox, never the main symbol.
  await expect(edit.locator('[data-testid="shortcut-mod-space"]')).toBeChecked();
  await expect(edit.locator('[data-testid="shortcut-key-input"]')).toHaveValue("");
  // Add Alt to the gesture: display updates, mouse part stays.
  await edit.locator('[data-testid="shortcut-mod-alt"]').check();
  await edit.locator('[data-testid="shortcut-edit-ok"]').click();
  await expect(pan.locator('[data-testid="shortcut-keys"]')).toContainText("alt+space+left-drag");
});

test("presets list every program and reshape the bindings", async ({ page }) => {
  const dialog = await openEditor(page);
  const preset = dialog.locator('[data-testid="shortcut-preset"]');
  for (const name of [
    "Gnumaru's Paint",
    "Photoshop",
    "Krita",
    "Gimp",
    "MyPaint",
    "Aseprite",
    "Procreate",
    "MediBang Paint",
    "ibis Paint X",
    "Paint Tool SAI",
    "FireAlpaca",
  ]) {
    await expect(preset.locator(`option:has-text("${name}")`)).toHaveCount(1);
  }
  await preset.selectOption("photoshop");
  // Photoshop-style bindings apply (eyedropper on I, text on T) …
  await dialog.locator('[data-testid="shortcut-search"]').fill("");
  await expect(rowFor(dialog, "tool-eyedropper").locator('[data-testid="shortcut-keys"]')).toContainText("I");
  // … and survive a reload.
  await page.reload();
  await page.waitForSelector("gnumarus-shell canvas");
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("button", { name: "Edit shortcuts" }).click();
  const dialog2 = page.locator("gnumarus-shell dialog#shortcutsDialog");
  await expect(dialog2).toBeVisible();
  await expect(dialog2.locator('[data-testid="shortcut-preset"]')).toHaveValue("photoshop");
  await expect(rowFor(dialog2, "tool-eyedropper").locator('[data-testid="shortcut-keys"]')).toContainText("I");
  // Reset all restores the factory set.
  await dialog2.locator('[data-testid="shortcut-reset-all"]').click();
  await expect(dialog2.locator('[data-testid="shortcut-preset"]')).toHaveValue("gnumarus");
  await expect(rowFor(dialog2, "tool-bucket").locator('[data-testid="shortcut-keys"]')).toContainText("G");
});

test("reset all clears conflicts and restores defaults", async ({ page }) => {
  const dialog = await openEditor(page);
  await rowFor(dialog, "tool-bucket").locator('[data-testid="shortcut-change"]').click();
  const edit = page.locator("gnumarus-shell dialog#shortcutEditDialog");
  await edit.locator('[data-testid="shortcut-key-input"]').fill("b");
  await edit.locator('[data-testid="shortcut-edit-ok"]').click();
  await expect(rowFor(dialog, "tool-bucket")).toHaveClass(/shortcut-conflict/);
  await dialog.locator('[data-testid="shortcut-reset-all"]').click();
  await expect(rowFor(dialog, "tool-bucket")).not.toHaveClass(/shortcut-conflict/);
  await expect(rowFor(dialog, "tool-bucket").locator('[data-testid="shortcut-keys"]')).toContainText("G");
});
