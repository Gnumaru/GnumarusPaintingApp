import { expect, test } from "@playwright/test";
import { loadBlankProject, paintCenter, readPixel, setPencil } from "./e2e-helpers";

async function setBrush(page: import("@playwright/test").Page, shape: string, angle: number, size: number): Promise<void> {
  await page.evaluate(
    ([shapeName, angleValue, sizeValue]: [string, number, number]) => {
      const root = window as unknown as {
        __gnumarus?: {
          shell?: {
            runAction(id: string): boolean;
            setBrushShape(shape: string): void;
            setBrushAngle(degrees: number): void;
            setBrushSize(size: number): void;
          };
        };
      };
      const shell = root.__gnumarus?.shell;
      shell?.runAction("tool-pencil");
      shell?.setBrushShape(shapeName);
      shell?.setBrushAngle(angleValue);
      shell?.setBrushSize(sizeValue);
    },
    [shape, angle, size] as [string, number, number],
  );
}

test("line brush paints a straight horizontal dab at angle 0 @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await setPencil(page, "#ff0000");
  await setBrush(page, "line", 0, 5);
  await paintCenter(page);
  // Length-5 horizontal line through the center pixel.
  for (const x of [30, 31, 32, 33, 34]) {
    expect(await readPixel(page, x, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  }
  expect(await readPixel(page, 29, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  expect(await readPixel(page, 35, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  expect(await readPixel(page, 32, 31)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  expect(await readPixel(page, 32, 33)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
});

test("line brush rotates to vertical at 90 degrees @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await setPencil(page, "#ff0000");
  await setBrush(page, "line", 90, 5);
  await paintCenter(page);
  for (const y of [30, 31, 32, 33, 34]) {
    expect(await readPixel(page, 32, y)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  }
  expect(await readPixel(page, 31, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  expect(await readPixel(page, 33, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  await page.keyboard.press("Control+z");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
});

test("brush options expose the line shape and angle control @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  const shape = page.locator("gnumarus-shell #brushShape").first();
  await expect(shape).toBeVisible();
  await shape.selectOption("line");
  await expect(shape).toHaveValue("line");
  const angle = page.locator("gnumarus-shell #brushAngle").first();
  await expect(angle).toBeVisible();
  await angle.fill("90");
  expect(await angle.inputValue()).toBe("90");
  // The dialog selection drove the engine: painting draws a vertical line.
  await setPencil(page, "#ff0000");
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { setBrushSize(size: number): void } } };
    root.__gnumarus?.shell?.setBrushSize(5);
  });
  await paintCenter(page);
  expect(await readPixel(page, 32, 30)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 32, 34)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  expect(await readPixel(page, 30, 32)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
});
