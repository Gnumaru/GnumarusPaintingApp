import { expect, test } from "@playwright/test";
import { createDefaultText } from "./e2e-helpers";

async function openTextEditor(page: import("@playwright/test").Page): Promise<void> {
  await page.locator('gnumarus-shell [data-testid="tool-text"]').click();
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.locator('gnumarus-shell [data-testid="text-editor-dialog"]')).toBeVisible();
}

test("text dialog drags from the title and from free areas, but not from buttons", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await createDefaultText(page);
  await openTextEditor(page);
  const dialog = page.locator('gnumarus-shell [data-testid="text-editor-dialog"]');
  const before = await dialog.boundingBox();
  if (before === null) {
    throw new Error("dialog has no bounding box");
  }
  // Drag from a free corner of the dialog frame (real mouse).
  await page.mouse.move(before.x + 3, before.y + 3);
  await page.mouse.down();
  await page.mouse.move(before.x + 53, before.y + 43, { steps: 5 });
  await page.mouse.up();
  const moved = await dialog.boundingBox();
  if (moved === null) {
    throw new Error("dialog has no bounding box after drag");
  }
  expect(moved.x).toBeGreaterThan(before.x + 30);
  expect(moved.y).toBeGreaterThan(before.y + 20);
  // Clicking a toolbar button does not move the dialog.
  await page.locator('gnumarus-shell [data-testid="text-bold"]').click();
  const afterClick = await dialog.boundingBox();
  if (afterClick === null) {
    throw new Error("dialog has no bounding box after click");
  }
  expect(afterClick.x).toBe(moved.x);
  expect(afterClick.y).toBe(moved.y);
});

test("text dialog opens above the text it edits", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await createDefaultText(page);
  await openTextEditor(page);
  const dialogBox = await page.locator('gnumarus-shell [data-testid="text-editor-dialog"]').boundingBox();
  const textRect = await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: {
        engine?: {
          getCellContentScreenRect(
            layerId: string,
            frame: number,
          ): { left: number; top: number; width: number; height: number } | null;
        };
      };
    };
    return root.__gnumarus?.engine?.getCellContentScreenRect("layer0", 0) ?? null;
  });
  if (dialogBox === null || textRect === null) {
    throw new Error("dialog or text rect missing");
  }
  // The dialog sits above the text with a gap, leaving the text visible.
  expect(dialogBox.y + dialogBox.height).toBeLessThanOrEqual(textRect.top + 1);
});

test("font size applies to the selected text after using the size input", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await createDefaultText(page);
  await openTextEditor(page);
  const area = page.locator('gnumarus-shell [data-testid="text-editor-area"]');
  await area.click();
  await page.keyboard.press("Control+a");
  // Clicking the size input steals focus; applying must still hit the selection.
  await page.locator('gnumarus-shell [data-testid="text-size"]').click();
  await page.keyboard.press("Control+a");
  await page.keyboard.type("48");
  await page.keyboard.press("Enter");
  await expect
    .poll(async () => {
      return area.evaluate((element) => (element as HTMLElement).innerHTML);
    })
    .toContain("font-size:48px\">Text<");
});

test("font size commits when the size input loses focus without Enter", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await createDefaultText(page);
  await openTextEditor(page);
  const area = page.locator('gnumarus-shell [data-testid="text-editor-area"]');
  await area.click();
  await page.keyboard.press("Control+a");
  // The reported failure: typing a size and clicking back into the editor
  // (blur-commit, no Enter, no Set button) silently discarded the value.
  await page.locator('gnumarus-shell [data-testid="text-size"]').click();
  await page.keyboard.press("Control+a");
  await page.keyboard.type("48");
  await area.click();
  await expect
    .poll(async () => {
      return area.evaluate((element) => (element as HTMLElement).innerHTML);
    })
    .toContain("font-size:48px\">Text<");
});

test("Set button applies the size exactly once, later blurs do not duplicate", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await createDefaultText(page);
  await openTextEditor(page);
  const area = page.locator('gnumarus-shell [data-testid="text-editor-area"]');
  await area.click();
  await page.keyboard.press("Control+a");
  await page.locator('gnumarus-shell [data-testid="text-size"]').click();
  await page.keyboard.press("Control+a");
  await page.keyboard.type("72");
  await page.locator('gnumarus-shell [data-testid="text-apply-size"]').click();
  await expect
    .poll(async () => {
      return area.evaluate((element) => (element as HTMLElement).innerHTML);
    })
    .toContain("font-size:72px\">Text<");
  const countSpans = async (): Promise<number> =>
    area.evaluate((element) => (element as HTMLElement).innerHTML.split("font-size:72px").length - 1);
  expect(await countSpans()).toBe(1);
  // Blurring the input afterwards (the echo of the Set commit) must not wrap again.
  await area.click();
  await page.waitForTimeout(300);
  expect(await countSpans()).toBe(1);
});

test("font size survives hostile blur timing that collapses the live caret", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await createDefaultText(page);
  await openTextEditor(page);
  const area = page.locator('gnumarus-shell [data-testid="text-editor-area"]');
  await area.click();
  await page.keyboard.press("Control+a");
  // Simulate a browser timing where leaving the field collapses the live
  // selection to a caret inside the editor (the reported failure): the
  // snapshot taken while selecting must not be clobbered by it.
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: {
        shell?: {
          saveTextSelection(): void;
          shadowRoot: ShadowRoot & { getSelection?: () => Selection | null };
        };
      };
    };
    const shell = root.__gnumarus?.shell;
    const doc = shell?.shadowRoot.getElementById("textEditorArea");
    const selection = shell?.shadowRoot.getSelection?.() ?? null;
    if (shell !== undefined && doc instanceof HTMLElement && selection !== null && selection.rangeCount > 0) {
      const caret = selection.getRangeAt(0).cloneRange();
      caret.collapse(true);
      selection.removeAllRanges();
      selection.addRange(caret);
      shell.saveTextSelection();
    }
  });
  await page.locator('gnumarus-shell [data-testid="text-size"]').click();
  await page.keyboard.press("Control+a");
  await page.keyboard.type("48");
  await page.keyboard.press("Enter");
  await expect
    .poll(async () => {
      return area.evaluate((element) => (element as HTMLElement).innerHTML);
    })
    .toContain("font-size:48px\">Text<");
});

test("text editor HTML tab shows the read-only source", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await createDefaultText(page);
  await openTextEditor(page);
  const dialog = page.locator('gnumarus-shell [data-testid="text-editor-dialog"]');
  const area = page.locator('gnumarus-shell [data-testid="text-editor-area"]');
  const source = page.locator('gnumarus-shell [data-testid="text-editor-html"]');
  await expect(dialog.getByTestId("text-tab-edit")).toHaveAttribute("aria-selected", "true");
  await expect(area).toBeVisible();
  await expect(source).toBeHidden();
  await dialog.getByTestId("text-tab-html").click();
  await expect(dialog.getByTestId("text-tab-html")).toHaveAttribute("aria-selected", "true");
  await expect(area).toBeHidden();
  await expect(source).toBeVisible();
  await expect
    .poll(async () => source.textContent())
    .toContain("<div>Text</div>");
  // Read-only: a pre element, not an editable field.
  expect(await source.evaluate((element) => element.tagName)).toBe("PRE");
  expect(await source.evaluate((element) => (element as HTMLElement).getAttribute("contenteditable"))).toBeNull();
});

test("HTML tab refreshes after styling and editing resumes on return", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await createDefaultText(page);
  await openTextEditor(page);
  const dialog = page.locator('gnumarus-shell [data-testid="text-editor-dialog"]');
  const area = page.locator('gnumarus-shell [data-testid="text-editor-area"]');
  const source = page.locator('gnumarus-shell [data-testid="text-editor-html"]');
  await area.click();
  await page.keyboard.press("Control+a");
  await dialog.getByTestId("text-bold").click();
  await dialog.getByTestId("text-tab-html").click();
  await expect.poll(async () => source.textContent()).toContain("<b>");
  await dialog.getByTestId("text-tab-edit").click();
  await expect(area).toBeVisible();
  await expect(source).toBeHidden();
  await area.click();
  await page.keyboard.press("End");
  await page.keyboard.type("!");
  await expect
    .poll(async () => {
      return area.evaluate((element) => (element as HTMLElement).innerHTML);
    })
    .toContain("!");
});

test("right-clicking the HTML source copies it with a toast", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await createDefaultText(page);
  await openTextEditor(page);
  const dialog = page.locator('gnumarus-shell [data-testid="text-editor-dialog"]');
  const source = page.locator('gnumarus-shell [data-testid="text-editor-html"]');
  await dialog.getByTestId("text-tab-html").click();
  await expect(source).toBeVisible();
  await source.click({ button: "right" });
  await expect(page.locator('gnumarus-shell [data-testid="toast"]')).toContainText(
    "copied to the clipboard",
  );
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("<div>Text</div>");
});
