import { expect } from "@playwright/test";
import { unzipSync, zipSync } from "fflate";
import { layerPixelToScreen } from "../src/canvas/GnumarusViewportMath";

export interface GnumarusPixel {
  r: number;
  g: number;
  b: number;
  a: number;
}

export async function readPixel(page: import("@playwright/test").Page, x: number, y: number): Promise<GnumarusPixel | null> {
  return page.evaluate(([px, py]: number[]) => {
    const root = window as unknown as {
      __gnumarus?: {
        engine?: { readPixel(x: number, y: number): GnumarusPixel | null };
      };
    };
    return root.__gnumarus?.engine?.readPixel(px, py) ?? null;
  }, [x, y]);
}

export async function setPencil(page: import("@playwright/test").Page, hex: string): Promise<void> {
  await page.evaluate((value: string) => {
    const root = window as unknown as {
      __gnumarus?: { shell?: { setPencilColor(hex: string): void } };
    };
    root.__gnumarus?.shell?.setPencilColor(value);
  }, hex);
}

/**
 * Fill a hue/saturation slider or its manual input, then wait until the
 * live preview settled (spinner back hidden). Pixel assertions after this
 * use expect.poll so fast and slow computes are both deterministic.
 */

export async function fillHsAndWait(
  dialog: import("@playwright/test").Locator,
  selector: string,
  value: string,
): Promise<void> {
  await dialog.locator(selector).fill(value);
  await dialog.locator(selector).evaluate((el: HTMLElement) => el.blur());
  // Wait until any running preview settled (spinner hidden at rest).
  await expect(dialog.locator('[data-testid="hs-spinner"]')).toBeHidden();
}

export async function setChecker(page: import("@playwright/test").Page, which: "A" | "B", hex: string): Promise<void> {
  await page.evaluate(
    ([side, value]: [string, string]) => {
      const root = window as unknown as {
        __gnumarus?: {
          shell?: { setCheckerColorA(hex: string): void; setCheckerColorB(hex: string): void };
        };
      };
      if (side === "A") {
        root.__gnumarus?.shell?.setCheckerColorA(value);
      } else {
        root.__gnumarus?.shell?.setCheckerColorB(value);
      }
    },
    [which, hex] as [string, string],
  );
}

export async function openPicker(page: import("@playwright/test").Page, pickerId: string): Promise<import("@playwright/test").Locator> {
  const picker = page.locator(`gnumarus-shell #${pickerId}`);
  await picker.getByRole("button", { name: "Pick color" }).click();
  await expect(picker.getByRole("dialog", { name: "Color picker" })).toBeVisible();
  return picker;
}

export interface GnumarusViewState {
  zoom: number;
  rotation: number;
  flipX: boolean;
  flipY: boolean;
}

export async function getViewState(page: import("@playwright/test").Page): Promise<GnumarusViewState> {
  return page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getViewState(): GnumarusViewState } };
    };
    const state = root.__gnumarus?.engine?.getViewState();
    if (state === undefined) {
      throw new Error("engine view state is unavailable");
    }
    return state;
  });
}

export interface GnumarusLayerState {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  width: number;
  height: number;
  transform: { x: number; y: number; rotation: number; flipX: boolean; flipY: boolean; scaleX: number; scaleY: number; skewX: number; skewY: number; rotationX: number; rotationY: number };
}

export async function getLayers(page: import("@playwright/test").Page): Promise<{
  layers: GnumarusLayerState[];
  active: string;
}> {
  return page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: {
        engine?: {
          getLayers(): GnumarusLayerState[];
          getActiveLayerId(): string;
        };
      };
    };
    return {
      layers: root.__gnumarus?.engine?.getLayers() ?? [],
      active: root.__gnumarus?.engine?.getActiveLayerId() ?? "",
    };
  });
}

export async function getGrid(page: import("@playwright/test").Page): Promise<{
  visible: boolean;
  minZoom: number;
  opacityPercent: number;
  layerId: string | null;
  width: number;
  height: number;
}> {
  return page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: {
        engine?: {
          getGridState(): {
            visible: boolean;
            minZoom: number;
            opacityPercent: number;
            layerId: string | null;
            width: number;
            height: number;
          };
        };
      };
    };
    const state = root.__gnumarus?.engine?.getGridState();
    if (state === undefined) {
      throw new Error("grid state is unavailable");
    }
    return state;
  });
}

export interface GnumarusTestMatrix {
  frameCount: number;
  currentFrame: number;
  activeLayerId: string;
  rows: Array<{
    layerId: string;
    cells: Array<{ layerId: string; frame: number; contentId: string | null; contentName: string | null }>;
  }>;
  contents: Array<{ id: string; name: string; textureId: string | null; textId?: string | null }>;
}

export async function getMatrix(page: import("@playwright/test").Page): Promise<GnumarusTestMatrix> {
  return page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getAnimationMatrix(): GnumarusTestMatrix } };
    };
    const matrix = root.__gnumarus?.engine?.getAnimationMatrix();
    if (matrix === undefined) {
      throw new Error("animation matrix is unavailable");
    }
    return matrix;
  });
}

export async function paintCenter(page: import("@playwright/test").Page): Promise<void> {
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

export async function getFrameDuration(page: import("@playwright/test").Page, frame: number): Promise<number | null> {
  return page.evaluate((target: number) => {
    const root = window as unknown as { __gnumarus?: { engine?: { getFrameDuration(f: number): number | null } } };
    return root.__gnumarus?.engine?.getFrameDuration(target) ?? null;
  }, frame);
}

export async function getDefaultFrameDuration(page: import("@playwright/test").Page): Promise<number> {
  return page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { getDefaultFrameDuration(): number } } };
    return root.__gnumarus?.engine?.getDefaultFrameDuration() ?? 0;
  });
}

export async function setPaintTip(
  page: import("@playwright/test").Page,
  kind: string,
  size: number,
  hardness: number,
  spacing: number,
): Promise<void> {
  await page.evaluate(
    ([which, brushSize, softness, gap]: [string, number, number, number]) => {
      const root = window as unknown as {
        __gnumarus?: {
          shell?: {
            setBrushTipKind(kind: string): void;
            setBrushSize(size: number): void;
            setBrushHardness(percent: number): void;
            setBrushSpacing(percent: number): void;
          };
        };
      };
      root.__gnumarus?.shell?.setBrushTipKind(which);
      root.__gnumarus?.shell?.setBrushSize(brushSize);
      root.__gnumarus?.shell?.setBrushHardness(softness);
      root.__gnumarus?.shell?.setBrushSpacing(gap);
    },
    [kind, size, hardness, spacing] as [string, number, number, number],
  );
}

export async function setPaintDynamics(
  page: import("@playwright/test").Page,
  flow: number,
  fuzzy: number,
  grain: number,
  grainScale: number,
): Promise<void> {
  await page.evaluate(
    ([flowPct, fuzzyPct, grainPct, scale]: [number, number, number, number]) => {
      const root = window as unknown as {
        __gnumarus?: {
          shell?: {
            setBrushFlow(percent: number): void;
            setPaintFuzzy(percent: number): void;
            setPaintGrain(strengthPercent: number, scalePx: number): void;
          };
        };
      };
      root.__gnumarus?.shell?.setBrushFlow(flowPct);
      root.__gnumarus?.shell?.setPaintFuzzy(fuzzyPct);
      root.__gnumarus?.shell?.setPaintGrain(grainPct, scale);
    },
    [flow, fuzzy, grain, grainScale] as [number, number, number, number],
  );
}

export async function penTiltDot(
  page: import("@playwright/test").Page,
  x: number,
  y: number,
  pressure: number,
  tiltX: number,
  tiltY: number,
): Promise<void> {
  await page.evaluate(
    ([px, py, p, tx, ty]: number[]) => {
      const root = document.querySelector("gnumarus-shell")?.shadowRoot ?? null;
      const target = root?.querySelector("canvas") as HTMLCanvasElement | null;
      if (target === null) {
        throw new Error("canvas is missing");
      }
      const base = {
        pointerId: 7,
        pointerType: "pen",
        button: 0,
        clientX: px,
        clientY: py,
        tiltX: tx,
        tiltY: ty,
        bubbles: true,
        cancelable: true,
        composed: true,
      };
      target.dispatchEvent(new PointerEvent("pointerdown", { ...base, buttons: 1, pressure: p }));
      target.dispatchEvent(new PointerEvent("pointerup", { ...base, buttons: 0, pressure: p }));
    },
    [x, y, pressure, tiltX, tiltY],
  );
}

export async function backgroundPlaneSize(page: import("@playwright/test").Page): Promise<{ width: number; height: number }> {
  return page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getBackgroundPlaneSize(): { width: number; height: number } } };
    };
    return root.__gnumarus?.engine?.getBackgroundPlaneSize() ?? { width: -1, height: -1 };
  });
}

export async function canvasScreenPixel(
  page: import("@playwright/test").Page,
  clientX: number,
  clientY: number,
): Promise<{ r: number; g: number; b: number; a: number }> {
  const shot = Array.from(await page.locator("gnumarus-shell canvas").screenshot());
  const sampled = await page.evaluate(([png, px, py]: [number[], number, number]) => {
    const target = document.querySelector("gnumarus-shell")?.shadowRoot?.querySelector("canvas") ?? null;
    const rect = target?.getBoundingClientRect();
    if (rect === undefined || rect.width <= 0) {
      throw new Error("canvas box is missing");
    }
    const blob = new Blob([new Uint8Array(png)], { type: "image/png" });
    return createImageBitmap(blob).then((bitmap) => {
      const probe = document.createElement("canvas");
      probe.width = bitmap.width;
      probe.height = bitmap.height;
      const context = probe.getContext("2d");
      if (context === null) {
        throw new Error("2D canvas unavailable");
      }
      context.drawImage(bitmap, 0, 0);
      const scale = bitmap.width / rect.width;
      const sx = Math.round((px - rect.left) * scale);
      const sy = Math.round((py - rect.top) * scale);
      const data = context.getImageData(sx, sy, 1, 1).data;
      return { rgba: [data[0] ?? -1, data[1] ?? -1, data[2] ?? -1, data[3] ?? -1], sx, sy, sw: bitmap.width, sh: bitmap.height };
    });
  }, [shot, clientX, clientY] as [number[], number, number]);
  const [r, g, b, a] = sampled.rgba;
  return { r: r ?? 0, g: g ?? 0, b: b ?? 0, a: a ?? 0 };
}

export async function readLayerPixel(page: import("@playwright/test").Page, x: number, y: number): Promise<GnumarusPixel | null> {
  return page.evaluate(([px, py]: number[]) => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { exportTextures(): Array<{ width: number; buffer: Uint8ClampedArray }> } };
    };
    const buffer = root.__gnumarus?.engine?.exportTextures()[0]?.buffer;
    const width = root.__gnumarus?.engine?.exportTextures()[0]?.width ?? 0;
    if (buffer === undefined || px < 0 || py < 0 || px >= width || py >= buffer.length / 4 / width) {
      return null;
    }
    const i = (py * width + px) * 4;
    return {
      r: buffer[i] ?? 0,
      g: buffer[i + 1] ?? 0,
      b: buffer[i + 2] ?? 0,
      a: buffer[i + 3] ?? 0,
    };
  }, [x, y]);
}

export async function outsideLayerTarget(page: import("@playwright/test").Page, x: number, y: number): Promise<{ x: number; y: number }> {
  return layerScreenTarget(page, x, y);
}

export async function textureDims(page: import("@playwright/test").Page): Promise<{ width: number; height: number }> {
  return page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { exportTextures(): Array<{ width: number; height: number }> } };
    };
    const first = root.__gnumarus?.engine?.exportTextures()[0];
    return { width: first?.width ?? -1, height: first?.height ?? -1 };
  });
}

export async function setImportCleanup(page: import("@playwright/test").Page, mode: string): Promise<void> {
  await page.evaluate((which: string) => {
    const root = window as unknown as {
      __gnumarus?: { shell?: { setImportCleanup(mode: string): void } };
    };
    root.__gnumarus?.shell?.setImportCleanup(which);
  }, mode);
}

export async function redPngBytes(page: import("@playwright/test").Page, size: number): Promise<number[]> {
  return page.evaluate(async (side: number) => {
    const canvas = document.createElement("canvas");
    canvas.width = side;
    canvas.height = side;
    const context = canvas.getContext("2d");
    if (context === null) {
      throw new Error("2D canvas unavailable");
    }
    context.fillStyle = "#ff0000";
    context.fillRect(0, 0, side, side);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (blob === null) {
      throw new Error("PNG encode failed");
    }
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  }, size);
}

export async function getMatrixFrame(page: import("@playwright/test").Page): Promise<number> {
  return page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { getCurrentFrame(): number } } };
    return root.__gnumarus?.engine?.getCurrentFrame() ?? -1;
  });
}

export async function stubPenPointerCapture(page: import("@playwright/test").Page): Promise<void> {
  // Synthetic pen PointerEvents carry no OS pointer, so capture would throw.
  await page.evaluate(() => {
    const proto = HTMLCanvasElement.prototype as unknown as { setPointerCapture(id: number): void };
    proto.setPointerCapture = () => {};
  });
}

export async function penDot(
  page: import("@playwright/test").Page,
  x: number,
  y: number,
  pressure: number,
): Promise<void> {
  await page.evaluate(
    ([px, py, p]: number[]) => {
      const root = document.querySelector("gnumarus-shell")?.shadowRoot ?? null;
      const target = root?.querySelector("canvas") as HTMLCanvasElement | null;
      if (target === null) {
        throw new Error("canvas is missing");
      }
      const base = {
        pointerId: 7,
        pointerType: "pen",
        button: 0,
        clientX: px,
        clientY: py,
        bubbles: true,
        cancelable: true,
        composed: true,
      };
      target.dispatchEvent(new PointerEvent("pointerdown", { ...base, buttons: 1, pressure: p }));
      target.dispatchEvent(new PointerEvent("pointerup", { ...base, buttons: 0, pressure: p }));
    },
    [x, y, pressure],
  );
}

export async function paintedPixelCount(page: import("@playwright/test").Page): Promise<number> {
  return page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { exportTextures(): Array<{ buffer: Uint8ClampedArray }> } };
    };
    const buffer = root.__gnumarus?.engine?.exportTextures()[0]?.buffer;
    if (buffer === undefined) {
      return 0;
    }
    let count = 0;
    for (let index = 3; index < buffer.length; index += 4) {
      if ((buffer[index] ?? 0) > 0) {
        count += 1;
      }
    }
    return count;
  });
}

export async function blurActiveElement(page: import("@playwright/test").Page): Promise<void> {
  // Shortcuts ignore key events from fields; blur first so Ctrl+Z reaches the shell.
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });
}

export async function canvasCenter(page: import("@playwright/test").Page): Promise<{ x: number; y: number }> {
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

export async function loadTinyLayer(
  page: import("@playwright/test").Page,
  size: number,
): Promise<void> {
  await page.evaluate((side: number) => {
    const root = window as unknown as {
      __gnumarus?: {
        engine?: {
          loadProject(
            width: number,
            height: number,
            inputs: Array<{
              id: string;
              name: string;
              visible: boolean;
              opacity: number;
              width: number;
              height: number;
              buffer: Uint8ClampedArray;
              transform: { x: number; y: number; rotation: number; flipX: boolean; flipY: boolean; scaleX: number; scaleY: number; skewX: number; skewY: number; rotationX: number; rotationY: number };
            }>,
          ): void;
        };
      };
    };
    root.__gnumarus?.engine?.loadProject(64, 64, [
      {
        id: "tiny",
        name: "Tiny",
        visible: true,
        opacity: 1,
        width: side,
        height: side,
        buffer: new Uint8ClampedArray(side * side * 4),
        transform: { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
      },
    ]);
  }, size);
}

export async function paintedNeighborStats(
  page: import("@playwright/test").Page,
  side: number,
): Promise<{ max: number; painted: number }> {
  return page.evaluate((dims: number) => {
    const root = window as unknown as {
      __gnumarus?: {
        engine?: { readPixel(x: number, y: number): { r: number; g: number; b: number; a: number } | null };
      };
    };
    const engine = root.__gnumarus?.engine;
    if (engine === undefined) {
      throw new Error("engine is unavailable");
    }
    const isPainted = (x: number, y: number): boolean => {
      if (x < 0 || y < 0 || x >= dims || y >= dims) {
        return false;
      }
      return (engine.readPixel(x, y)?.a ?? 0) > 0;
    };
    let max = 0;
    let painted = 0;
    for (let y = 0; y < dims; y += 1) {
      for (let x = 0; x < dims; x += 1) {
        if (!isPainted(x, y)) {
          continue;
        }
        painted += 1;
        let neighbors = 0;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            if (dx === 0 && dy === 0) {
              continue;
            }
            if (isPainted(x + dx, y + dy)) {
              neighbors += 1;
            }
          }
        }
        max = Math.max(max, neighbors);
      }
    }
    return { max, painted };
  }, side);
}

export async function stubDirectoryWithFileStore(page: import("@playwright/test").Page): Promise<void> {
  await page.evaluate(() => {
    const root = window as unknown as {
      showDirectoryPicker?: () => Promise<unknown>;
      __gnumarusDirTest?: { files: Record<string, Blob> };
    };
    const state: { files: Record<string, Blob> } = { files: {} };
    root.__gnumarusDirTest = state;
    interface MockFileHandle {
      getFile(): Promise<File>;
      createWritable(): Promise<{ write(data: string | Blob): Promise<void>; close(): Promise<void> }>;
    }
    function makeFileHandle(path: string): MockFileHandle {
      return {
        getFile: (): Promise<File> => Promise.resolve(new File([state.files[path] ?? new Blob([])], path)),
        createWritable: (): Promise<{ write(data: string | Blob): Promise<void>; close(): Promise<void> }> =>
          Promise.resolve({
            write: (data: string | Blob): Promise<void> => {
              state.files[path] = data instanceof Blob ? data : new Blob([data]);
              return Promise.resolve();
            },
            close: (): Promise<void> => Promise.resolve(),
          }),
      };
    }
    function makeDir(prefix: string): unknown {
      return {
        name: prefix === "" ? "MockDir" : prefix,
        removeEntry: (fileName: string): Promise<void> => {
          if (state.files[prefix + fileName] === undefined) {
            return Promise.reject(new DOMException("File not found", "NotFoundError"));
          }
          delete state.files[prefix + fileName];
          return Promise.resolve();
        },
        getFileHandle: (fileName: string, options?: { create?: boolean }): Promise<MockFileHandle> => {
          const path = prefix + fileName;
          if (state.files[path] === undefined && options?.create !== true) {
            return Promise.reject(new DOMException("File not found", "NotFoundError"));
          }
          return Promise.resolve(makeFileHandle(path));
        },
        getDirectoryHandle: (dirName: string): Promise<unknown> =>
          Promise.resolve(makeDir(`${prefix}${dirName}/`)),
      };
    }
    root.showDirectoryPicker = (): Promise<unknown> => Promise.resolve(makeDir(""));
  });
}

export async function runPaletteAction(page: import("@playwright/test").Page, query: string): Promise<void> {
  await page.keyboard.press("Control+Shift+P");
  const dialog = page.locator("gnumarus-shell dialog#actionPaletteDialog");
  await expect(dialog).toBeVisible();
  await dialog.locator('[data-testid="action-palette-input"]').fill(query);
  await page.keyboard.press("Enter");
  await expect(dialog).toBeHidden();
}

export async function selectionOverlayDisplay(page: import("@playwright/test").Page): Promise<string> {
  return page.evaluate(() => {
    const root = document.querySelector("gnumarus-shell")?.shadowRoot;
    const rect = root?.getElementById("canvasHost")?.querySelector('[data-testid="selection-rect"]') as SVGPolygonElement | null;
    return rect?.style.display ?? "missing";
  });
}

export async function selectionMaskDisplay(page: import("@playwright/test").Page): Promise<string> {
  return page.evaluate(() => {
    const root = document.querySelector("gnumarus-shell")?.shadowRoot;
    const path = root?.getElementById("canvasHost")?.querySelector('[data-testid="selection-mask"]') as SVGPathElement | null;
    return path?.style.display ?? "missing";
  });
}

export async function selectionMaskMoves(page: import("@playwright/test").Page): Promise<number> {
  return page.evaluate(() => {
    const root = document.querySelector("gnumarus-shell")?.shadowRoot;
    const path = root?.getElementById("canvasHost")?.querySelector('[data-testid="selection-mask"]') as SVGPathElement | null;
    const d = path?.getAttribute("d") ?? "";
    return d.split("M").length - 1;
  });
}

export async function floatingRect(page: import("@playwright/test").Page): Promise<{
  x: number;
  y: number;
  width: number;
  height: number;
} | null> {
  return page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getFloatingRect(): { x: number; y: number; width: number; height: number } | null } };
    };
    return root.__gnumarus?.engine?.getFloatingRect() ?? null;
  });
}

/** Active layer dimensions in pixels (falls back to the legacy 64 default). */

export async function layerSize(page: import("@playwright/test").Page): Promise<{ width: number; height: number }> {
  const size = await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: {
        engine?: {
          getActiveLayerId(): string | null;
          getLayers(): Array<{ id: string; width: number; height: number }>;
        };
      };
    };
    const engine = root.__gnumarus?.engine;
    const layers = engine?.getLayers() ?? [];
    const active = engine?.getActiveLayerId() ?? null;
    const found = layers.find((layer) => layer.id === active) ?? layers[0];
    if (found === undefined || !(found.width > 0) || !(found.height > 0)) {
      return null;
    }
    return { width: found.width, height: found.height };
  });
  return size ?? { width: 64, height: 64 };
}

/** Zoom so the active layer (plus anchor margin) fits inside the canvas box. */

export async function zoomToFitLayer(page: import("@playwright/test").Page): Promise<number> {
  const box = await page.locator("gnumarus-shell canvas").boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const size = await layerSize(page);
  const zoom = Math.min(box.width / (size.width + 160), box.height / (size.height + 160));
  await page.evaluate((value: number) => {
    const root = window as unknown as { __gnumarus?: { engine?: { setZoom(zoom: number): void } } };
    root.__gnumarus?.engine?.setZoom(value);
  }, zoom);
  return zoom;
}

export async function layerScreenTarget(
  page: import("@playwright/test").Page,
  lx: number,
  ly: number,
): Promise<{ x: number; y: number }> {
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const state = await getViewState(page);
  const size = await layerSize(page);
  return layerPixelToScreen(
    lx,
    ly,
    { left: box.x, top: box.y, width: box.width, height: box.height },
    size.width,
    size.height,
    { zoom: state.zoom, panX: 0, panY: 0, rotation: state.rotation, flipX: false, flipY: false },
    { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
  );
}

export interface GnumarusFloatingSelectionInfo {
  x: number;
  y: number;
  width: number;
  height: number;
  selected: number;
}

export async function getFloatingSelection(page: import("@playwright/test").Page): Promise<GnumarusFloatingSelectionInfo | null> {
  return page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getFloatingSelection(): GnumarusFloatingSelectionInfo | null } };
    };
    return root.__gnumarus?.engine?.getFloatingSelection() ?? null;
  });
}

/** Read one pixel out of the active floating selection buffer (local coordinates). */

export async function readFloatingPixel(page: import("@playwright/test").Page, x: number, y: number): Promise<GnumarusPixel | null> {
  return page.evaluate(([px, py]: number[]) => {
    const root = window as unknown as {
      __gnumarus?: {
        engine?: Record<string, unknown>;
      };
    };
    const floating = (root.__gnumarus?.engine as unknown as {
      floating?: { buffer: Uint8ClampedArray; width: number; height: number; active: boolean } | null;
    } | undefined)?.floating ?? null;
    if (floating === null || !floating.active || px < 0 || py < 0 || px >= floating.width || py >= floating.height) {
      return null;
    }
    const at = (py * floating.width + px) * 4;
    return {
      r: floating.buffer[at] as number,
      g: floating.buffer[at + 1] as number,
      b: floating.buffer[at + 2] as number,
      a: floating.buffer[at + 3] as number,
    };
  }, [x, y]);
}

export async function dragRect(
  page: import("@playwright/test").Page,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): Promise<void> {
  const from = await layerScreenTarget(page, x0, y0);
  const to = await layerScreenTarget(page, x1, y1);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 5 });
  await page.mouse.up();
}

export async function engineBrushSize(page: import("@playwright/test").Page): Promise<number> {
  return page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { getBrushSize(): number } } };
    return root.__gnumarus?.engine?.getBrushSize() ?? -1;
  });
}

export async function paintDot(
  page: import("@playwright/test").Page,
  hex: string,
  x: number,
  y: number,
): Promise<void> {
  await setPencil(page, hex);
  const target = await layerScreenTarget(page, x, y);
  await page.mouse.click(target.x, target.y);
}

/** Front buttons of each drawer, for tools hidden inside a closed flyout. */

export const DRAWER_FOR_TOOL: Record<string, string> = {
  Line: "paint",
  Curve: "paint",
  Rectangle: "shape",
  Ellipse: "shape",
  Polygon: "shape",
  Gradient: "shape",
  Shading: "retouch",
  Blur: "retouch",
  Clone: "retouch",
  Recolor: "retouch",
  Jumble: "retouch",
  Crop: "destructive",
  "Rectangular selection": "selection",
  "Elliptical selection": "selection",
  "Freehand lasso": "selection",
  "Color selection": "selection",
  "Destructive selection transform": "destructive",
  "Destructive selection 3D rotation": "destructive",
  "Non-destructive cell transform": "transform",
  "Non-destructive cell 3D rotation": "transform",
  "3D model transform": "model",
  "Fly camera": "model",
};

/** Click a toolbar tool, opening its drawer flyout when it is not the front. */

export async function selectTool(page: import("@playwright/test").Page, name: string): Promise<void> {
  const direct = page.getByRole("button", { name, exact: true });
  if ((await direct.count()) > 0) {
    await direct.first().click();
    return;
  }
  const drawer = DRAWER_FOR_TOOL[name];
  if (drawer === undefined) {
    throw new Error(`no drawer known for tool ${name}`);
  }
  await page.locator(`gnumarus-shell [data-testid="${drawer}-drawer"] > button`).click({ button: "right" });
  await page
    .locator(`gnumarus-shell [data-testid="${drawer}-flyout"]`)
    .getByRole("button", { name, exact: true })
    .click();
}

export async function getAxisOverlay(page: import("@playwright/test").Page): Promise<{
  visible: boolean;
  xAxis: { ax: number; ay: number; bx: number; by: number };
  yAxis: { ax: number; ay: number; bx: number; by: number };
  rightBorder: { ax: number; ay: number; bx: number; by: number };
  bottomBorder: { ax: number; ay: number; bx: number; by: number };
  xColor: string;
  yColor: string;
  borderColor: string;
}> {
  return page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: {
        engine?: {
          getAxisOverlayState(): {
            visible: boolean;
            xAxis: { ax: number; ay: number; bx: number; by: number };
            yAxis: { ax: number; ay: number; bx: number; by: number };
            rightBorder: { ax: number; ay: number; bx: number; by: number };
            bottomBorder: { ax: number; ay: number; bx: number; by: number };
            xColor: string;
            yColor: string;
            borderColor: string;
          };
        };
      };
    };
    const state = root.__gnumarus?.engine?.getAxisOverlayState();
    if (state === undefined) {
      throw new Error("axis overlay state is unavailable");
    }
    return state;
  });
}

export async function getFloatingTransform(page: import("@playwright/test").Page): Promise<{
  cx: number;
  cy: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  skewX: number;
  skewY: number;
  rotationX: number;
  rotationY: number;
  flipX: boolean;
  flipY: boolean;
  width: number;
  height: number;
} | null> {
  return page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: {
        engine?: {
          getFloatingTransform(): {
            cx: number;
            cy: number;
            rotation: number;
            scaleX: number;
            scaleY: number;
            skewX: number;
            skewY: number;
            rotationX: number;
            rotationY: number;
            flipX: boolean;
            flipY: boolean;
            width: number;
            height: number;
          } | null;
        };
      };
    };
    return root.__gnumarus?.engine?.getFloatingTransform() ?? null;
  });
}

export async function getSelectionHandle(
  page: import("@playwright/test").Page,
  id: string,
): Promise<{ x: number; y: number }> {
  const box = await page.locator("gnumarus-shell canvas").boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const position = await page.evaluate((handleId: string) => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getSelectionHandles(): Array<{ id: string; x: number; y: number }> } };
    };
    return root.__gnumarus?.engine?.getSelectionHandles().find((handle) => handle.id === handleId) ?? null;
  }, id);
  if (position === null) {
    throw new Error(`selection handle ${id} is missing`);
  }
  return { x: box.x + position.x, y: box.y + position.y };
}

export async function redPixelCount(
  page: import("@playwright/test").Page,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): Promise<number> {
  return page.evaluate(
    ([ax, ay, bx, by]: number[]) => {
      const root = window as unknown as {
        __gnumarus?: {
          engine?: { readPixel(x: number, y: number): { r: number; g: number; b: number; a: number } | null };
        };
      };
      const engine = root.__gnumarus?.engine;
      if (engine === undefined) {
        throw new Error("engine is unavailable");
      }
      let count = 0;
      for (let y = ay; y <= by; y += 1) {
        for (let x = ax; x <= bx; x += 1) {
          const pixel = engine.readPixel(x, y);
          if (pixel !== null && pixel.r === 255 && pixel.g === 0 && pixel.b === 0 && pixel.a === 255) {
            count += 1;
          }
        }
      }
      return count;
    },
    [x0, y0, x1, y1],
  );
}

export async function cutRedBlock(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await setPencil(page, "#ff0000");
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { setBrushSize(size: number): void } } };
    root.__gnumarus?.shell?.setBrushSize(3);
  });
  await page.locator('gnumarus-shell select#brushShape').selectOption("square");
  const center = await layerScreenTarget(page, 32, 32);
  await page.mouse.click(center.x, center.y);
  await selectTool(page, 'Rectangular selection');
  const start = await layerScreenTarget(page, 30, 30);
  const end = await layerScreenTarget(page, 34, 34);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 4 });
  await page.mouse.up();
  await selectTool(page, 'Destructive selection transform');
}

export async function cutSingleRedPixel(
  page: import("@playwright/test").Page,
  lx: number,
  ly: number,
): Promise<void> {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await setPencil(page, "#ff0000");
  await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { shell?: { setBrushSize(size: number): void } } };
    root.__gnumarus?.shell?.setBrushSize(1);
  });
  const target = await layerScreenTarget(page, lx, ly);
  await page.mouse.click(target.x, target.y);
  await selectTool(page, 'Rectangular selection');
  const start = await layerScreenTarget(page, 30, 30);
  const end = await layerScreenTarget(page, 34, 34);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 4 });
  await page.mouse.up();
  await selectTool(page, 'Destructive selection transform');
}

export async function getLayerTransform(page: import("@playwright/test").Page): Promise<{
  x: number;
  y: number;
  rotation: number;
  flipX: boolean;
  flipY: boolean;
  scaleX: number;
  scaleY: number;
  skewX: number;
  skewY: number;
  rotationX: number;
  rotationY: number;
}> {
  return page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: {
        engine?: {
          getLayers(): Array<{
            id: string;
            transform: {
              x: number;
              y: number;
              rotation: number;
              flipX: boolean;
              flipY: boolean;
              scaleX: number;
              scaleY: number;
              skewX: number;
              skewY: number;
              rotationX: number;
              rotationY: number;
            };
          }>;
        };
      };
    };
    const found = root.__gnumarus?.engine?.getLayers().find((layer) => layer.id === "layer0");
    if (found === undefined) {
      throw new Error("layer0 is missing");
    }
    return found.transform;
  });
}

export async function layerDragHandle(
  page: import("@playwright/test").Page,
  id: string,
  dxLayers: number,
  dyLayers: number,
  alt = false,
): Promise<void> {
  // Zoom out so the outer anchors sit inside the canvas.
  const zoom = await zoomToFitLayer(page);
  await selectTool(page, 'Non-destructive cell transform');
  const box = await page.locator("gnumarus-shell canvas").boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const position = await page.evaluate((handleId: string) => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getSelectionHandles(): Array<{ id: string; x: number; y: number }> } };
    };
    return root.__gnumarus?.engine?.getSelectionHandles().find((handle) => handle.id === handleId) ?? null;
  }, id);
  if (position === null) {
    throw new Error(`layer handle ${id} is missing`);
  }
  if (alt) {
    await page.keyboard.down("Alt");
  }
  await page.mouse.move(box.x + position.x, box.y + position.y);
  await page.mouse.down();
  await page.mouse.move(box.x + position.x + dxLayers * zoom, box.y + position.y + dyLayers * zoom, { steps: 4 });
  await page.mouse.up();
  if (alt) {
    await page.keyboard.up("Alt");
  }
}

export async function getPlaneMatrix(
  page: import("@playwright/test").Page,
  kind: "layer" | "floating",
): Promise<number[] | null> {
  return page.evaluate((which: string) => {
    const root = window as unknown as {
      __gnumarus?: {
        engine?: {
          getLayerPlaneMatrix(id: string): number[] | null;
          getFloatingPlaneMatrix(): number[] | null;
        };
      };
    };
    const engine = root.__gnumarus?.engine;
    if (engine === undefined) {
      throw new Error("engine is unavailable");
    }
    return which === "layer" ? engine.getLayerPlaneMatrix("layer0") : engine.getFloatingPlaneMatrix();
  }, kind);
}

export async function rot3DCenter(page: import("@playwright/test").Page): Promise<{ x: number; y: number }> {
  const box = await page.locator("gnumarus-shell canvas").boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const position = await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getSelectionHandles(): Array<{ id: string; x: number; y: number }> } };
    };
    return root.__gnumarus?.engine?.getSelectionHandles().find((handle) => handle.id === "center") ?? null;
  });
  if (position === null) {
    throw new Error("3d gizmo center is missing");
  }
  return { x: box.x + position.x, y: box.y + position.y };
}

export async function rot3DHandle(
  page: import("@playwright/test").Page,
  id: string,
): Promise<{ x: number; y: number }> {
  const box = await page.locator("gnumarus-shell canvas").boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  const position = await page.evaluate((handleId: string) => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getSelectionHandles(): Array<{ id: string; x: number; y: number }> } };
    };
    return root.__gnumarus?.engine?.getSelectionHandles().find((handle) => handle.id === handleId) ?? null;
  }, id);
  if (position === null) {
    throw new Error(`3d handle ${id} is missing`);
  }
  return { x: box.x + position.x, y: box.y + position.y };
}

export async function buildAsepriteBytes(
  page: import("@playwright/test").Page,
  tags?: Array<{ name: string; from: number; to: number; loop: number; repeat: number }>,
): Promise<Uint8Array> {
  return page.evaluate(
    async (tagEntries: Array<{ name: string; from: number; to: number; loop: number; repeat: number }>) => {
    async function deflate(data: Uint8Array): Promise<Uint8Array> {
      const output = await new Response(
        new Blob([data.slice()]).stream().pipeThrough(new CompressionStream("deflate")),
      ).arrayBuffer();
      return new Uint8Array(output);
    }
    class Writer {
      readonly bytes: number[] = [];
      u8(v: number): this {
        this.bytes.push(v & 0xff);
        return this;
      }
      u16(v: number): this {
        this.bytes.push(v & 0xff, (v >>> 8) & 0xff);
        return this;
      }
      i16(v: number): this {
        return this.u16(v < 0 ? 0x10000 + v : v);
      }
      u32(v: number): this {
        this.bytes.push(v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff);
        return this;
      }
      raw(values: ArrayLike<number>): this {
        for (let i = 0; i < values.length; i += 1) {
          this.bytes.push(values[i] ?? 0);
        }
        return this;
      }
      str(text: string): this {
        const encoded = new TextEncoder().encode(text);
        this.u16(encoded.length);
        return this.raw(encoded);
      }
      wrap(type: number, payload: Writer): this {
        this.u32(6 + payload.bytes.length);
        this.u16(type);
        return this.raw(payload.bytes);
      }
    }
    const layerChunk = (name: string, flags: number): Writer => {
      const payload = new Writer();
      payload.u16(flags).u16(0).u16(0).u16(0).u16(0).u16(0);
      payload.u8(255).u8(0).u8(0).u8(0);
      payload.str(name);
      return new Writer().wrap(0x2004, payload);
    };
    const imageCel = async (
      layer: number,
      x: number,
      y: number,
      width: number,
      height: number,
      pixels: Uint8Array,
    ): Promise<Writer> => {
      const payload = new Writer();
      payload.u16(layer).i16(x).i16(y).u8(255).u16(2).i16(0);
      payload.u8(0).u8(0).u8(0).u8(0).u8(0);
      payload.u16(width).u16(height);
      payload.raw(await deflate(pixels));
      return new Writer().wrap(0x2005, payload);
    };
    const linkedCel = (layer: number, x: number, y: number, linkTo: number): Writer => {
      const payload = new Writer();
      payload.u16(layer).i16(x).i16(y).u8(255).u16(1).i16(0);
      payload.u8(0).u8(0).u8(0).u8(0).u8(0);
      payload.u16(linkTo);
      return new Writer().wrap(0x2005, payload);
    };
    const tagsChunk = (entries: Array<{ name: string; from: number; to: number; loop: number; repeat: number }>): Writer => {
      const payload = new Writer();
      payload.u16(entries.length);
      payload.raw(new Array<number>(8).fill(0));
      for (const entry of entries) {
        payload.u16(entry.from).u16(entry.to).u8(entry.loop).u16(entry.repeat);
        payload.raw(new Array<number>(6).fill(0));
        payload.u8(255).u8(0).u8(0);
        payload.u8(0);
        payload.str(entry.name);
      }
      return new Writer().wrap(0x2018, payload);
    };
    const frameChunk = (duration: number, chunks: Writer[]): Writer => {
      const body = new Writer();
      for (const chunk of chunks) {
        body.raw(chunk.bytes);
      }
      const out = new Writer();
      out.u32(16 + body.bytes.length);
      out.u16(0xf1fa).u16(chunks.length).u16(duration).u8(0).u8(0).u32(chunks.length);
      return out.raw(body.bytes);
    };
    const blue = new Uint8Array(16 * 4);
    for (let i = 0; i < 16; i += 1) {
      blue[i * 4] = 0;
      blue[i * 4 + 1] = 0;
      blue[i * 4 + 2] = 255;
      blue[i * 4 + 3] = 255;
    }
    const red = new Uint8Array([255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255]);
    // Frame 0 (100ms): blue background + red 2x2 square at (1,1).
    // Frame 1 (250ms): blue background + linked copy of the red square.
    const frameZeroChunks = [
      layerChunk("bg", 1 | 8),
      layerChunk("fg", 1),
      await imageCel(0, 0, 0, 4, 4, blue),
      await imageCel(1, 1, 1, 2, 2, red),
    ];
    if (tagEntries.length > 0) {
      frameZeroChunks.push(tagsChunk(tagEntries));
    }
    const frames = [
      frameChunk(100, frameZeroChunks),
      frameChunk(250, [await imageCel(0, 0, 0, 4, 4, blue), linkedCel(1, 1, 1, 0)]),
    ];
    const out = new Writer();
    const body = new Writer();
    for (const entry of frames) {
      body.raw(entry.bytes);
    }
    out.u32(128 + body.bytes.length);
    out.u16(0xa5e0).u16(frames.length).u16(4).u16(4).u16(32).u32(1).u16(100);
    out.u32(0).u32(0).u8(0).u8(0).u8(0).u8(0).u16(0).u8(0).u8(0);
    out.i16(0).i16(0).u16(0).u16(0);
    out.raw(new Array<number>(84).fill(0));
    out.raw(body.bytes);
    return new Uint8Array(out.bytes);
  }, tags ?? []);
}

/** Stub the OS file picker to serve in-memory bytes as the picked file. */

export async function stubAsepritePicker(
  page: import("@playwright/test").Page,
  fileName: string,
  bytes: Uint8Array,
): Promise<void> {
  await page.evaluate(
    ([name, data]: [string, number[]]) => {
      const root = window as unknown as {
        showOpenFilePicker?: () => Promise<Array<{ getFile(): Promise<File> }>>;
      };
      root.showOpenFilePicker = async () => [
        {
          getFile: async () => new File([new Uint8Array(data)], name, { type: "application/octet-stream" }),
        },
      ];
    },
    [fileName, Array.from(bytes)] as [string, number[]],
  );
}

export async function animationFrameCount(page: import("@playwright/test").Page): Promise<number> {
  return page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { getFrameCount(): number } } };
    return root.__gnumarus?.engine?.getFrameCount() ?? -1;
  });
}

export async function frameDuration(
  page: import("@playwright/test").Page,
  frame: number,
): Promise<number | null> {
  return page.evaluate((target: number) => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getEffectiveFrameDuration(frame: number): number } };
    };
    return root.__gnumarus?.engine?.getEffectiveFrameDuration(target) ?? null;
  }, frame);
}

export function psdU16(value: number): number[] {
  return [(value >> 8) & 0xff, value & 0xff];
}

export function psdU32(value: number): number[] {
  return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
}

export function psdI32(value: number): number[] {
  return psdU32(value < 0 ? 0x100000000 + value : value);
}

export function psdI16(value: number): number[] {
  return psdU16(value < 0 ? 0x10000 + value : value);
}

export function psdAscii(text: string): number[] {
  return [...text].map((char) => char.charCodeAt(0) & 0xff);
}

export function psdPascal4(text: string): number[] {
  const chars = psdAscii(text);
  const pad = (4 - ((1 + chars.length) % 4)) % 4;
  return [chars.length, ...chars, ...new Array<number>(pad).fill(0)];
}

export interface PsdTestPlane {
  id: number;
  payload: number[];
}

export interface PsdTestLayer {
  top: number;
  left: number;
  bottom: number;
  right: number;
  opacity?: number;
  flags?: number;
  name?: string;
  planes: PsdTestPlane[];
}

export function buildPsdBytes(
  width: number,
  height: number,
  layers: PsdTestLayer[],
  composite?: number[][],
): Uint8Array {
  const out: number[] = [
    ...psdAscii("8BPS"),
    ...psdU16(1),
    0, 0, 0, 0, 0, 0,
    ...psdU16(3),
    ...psdU32(height),
    ...psdU32(width),
    ...psdU16(8),
    ...psdU16(3),
    ...psdU32(0),
    ...psdU32(0),
  ];
  const records: number[] = [...psdI16(layers.length)];
  const blobs: number[] = [];
  for (const layer of layers) {
    records.push(
      ...psdI32(layer.top),
      ...psdI32(layer.left),
      ...psdI32(layer.bottom),
      ...psdI32(layer.right),
      ...psdU16(layer.planes.length),
    );
    for (const plane of layer.planes) {
      records.push(...psdI16(plane.id), ...psdU32(2 + plane.payload.length));
    }
    records.push(...psdAscii("8BIM"), ...psdAscii("norm"), layer.opacity ?? 255, 0, layer.flags ?? 8, 0);
    const extra = [...psdU32(0), ...psdU32(0), ...psdPascal4(layer.name ?? "")];
    records.push(...psdU32(extra.length), ...extra);
    for (const plane of layer.planes) {
      blobs.push(...psdU16(0), ...plane.payload);
    }
  }
  const infoPad = (records.length + blobs.length) % 2;
  const info = [...psdU32(records.length + blobs.length + infoPad), ...records, ...blobs];
  if (infoPad === 1) {
    info.push(0);
  }
  const section = [...info, ...psdU32(0)];
  out.push(...psdU32(section.length), ...section);
  if (composite !== undefined) {
    out.push(...psdU16(0));
    for (const plane of composite) {
      out.push(...plane);
    }
  }
  return new Uint8Array(out);
}

export function solidPsdPlane(width: number, height: number, value: number): number[] {
  return new Array<number>(width * height).fill(value);
}

export function xcfU32(value: number): number[] {
  return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
}

export function xcfI32(value: number): number[] {
  return xcfU32(value < 0 ? 0x100000000 + value : value);
}

export function xcfU64(value: number): number[] {
  return [...xcfU32(Math.floor(value / 4294967296)), ...xcfU32(value >>> 0)];
}

export function xcfRlePlane(samples: number[]): number[] {
  const out: number[] = [];
  let i = 0;
  while (i < samples.length) {
    let run = 1;
    while (i + run < samples.length && samples[i + run] === samples[i]) {
      run += 1;
    }
    if (run >= 3) {
      out.push(run - 1, samples[i] as number);
      i += run;
      continue;
    }
    const start = i;
    while (i < samples.length) {
      let ahead = 1;
      while (i + ahead < samples.length && samples[i + ahead] === samples[i] && ahead < 120) {
        ahead += 1;
      }
      if (ahead >= 3 || i - start >= 120) {
        break;
      }
      i += 1;
    }
    out.push(256 - (i - start), ...samples.slice(start, i));
  }
  return out;
}

export interface XcfTestLayer {
  name: string;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  opacity?: number;
  rgba: [number, number, number, number];
}

export function buildXcfBytes(width: number, height: number, layers: XcfTestLayer[]): Uint8Array {
  const out: number[] = [
    ...[... "gimp xcf v011"].map((char) => char.charCodeAt(0)),
    0,
    ...xcfI32(width),
    ...xcfI32(height),
    ...xcfI32(0),
    ...xcfI32(150),
    ...xcfU32(17),
    ...xcfU32(1),
    1,
    ...xcfU32(0),
    ...xcfU32(0),
  ];
  const patch = (at: number, value: number[]): void => {
    for (let i = 0; i < value.length; i += 1) {
      out[at + i] = value[i] as number;
    }
  };
  const reserve = (size: number): number => {
    const at = out.length;
    for (let i = 0; i < size; i += 1) {
      out.push(0);
    }
    return at;
  };
  const slots = layers.map(() => reserve(8));
  reserve(8);
  layers.forEach((layer, index) => {
    patch(slots[index] as number, xcfU64(out.length));
    out.push(...xcfI32(layer.width), ...xcfI32(layer.height), ...xcfI32(1));
    const name = [...layer.name].map((char) => char.charCodeAt(0) & 0xff);
    out.push(...xcfU32(name.length + 1), ...name, 0);
    out.push(...xcfU32(6), ...xcfU32(4), ...xcfU32(layer.opacity ?? 255));
    out.push(...xcfU32(15), ...xcfU32(8), ...xcfI32(layer.offsetX), ...xcfI32(layer.offsetY));
    out.push(...xcfU32(8), ...xcfU32(4), ...xcfU32(1));
    out.push(...xcfU32(7), ...xcfU32(4), 0, 0, 0, 28);
    out.push(...xcfU32(0), ...xcfU32(0));
    const hier = reserve(8);
    reserve(8);
    patch(hier, xcfU64(out.length));
    out.push(...xcfI32(layer.width), ...xcfI32(layer.height), ...xcfI32(4));
    const level = reserve(8);
    patch(level, xcfU64(out.length));
    out.push(...xcfI32(layer.width), ...xcfI32(layer.height));
    const tile = reserve(8);
    reserve(8);
    patch(tile, xcfU64(out.length));
    const count = layer.width * layer.height;
    const planes = [
      new Array<number>(count).fill(layer.rgba[0]),
      new Array<number>(count).fill(layer.rgba[1]),
      new Array<number>(count).fill(layer.rgba[2]),
      new Array<number>(count).fill(layer.rgba[3]),
    ];
    for (const plane of planes) {
      out.push(...xcfRlePlane(plane));
    }
  });
  return new Uint8Array(out);
}

export function kraRawTile(bgra: [number, number, number, number]): number[] {
  const pixels: number[] = [0];
  for (let i = 0; i < 64 * 64; i += 1) {
    pixels.push(bgra[0], bgra[1], bgra[2], bgra[3]);
  }
  return pixels;
}

export function kraTileStore(tiles: Array<{ x: number; y: number; bgra: [number, number, number, number] }>): Uint8Array {
  const out: number[] = [];
  const ascii = (text: string): void => {
    for (let i = 0; i < text.length; i += 1) {
      out.push(text.charCodeAt(i) & 0xff);
    }
  };
  ascii("VERSION 2\nTILEWIDTH 64\nTILEHEIGHT 64\nPIXELSIZE 4\n");
  ascii(`DATA ${tiles.length}\n`);
  for (const tile of tiles) {
    const payload = kraRawTile(tile.bgra);
    ascii(`${tile.x},${tile.y},LZF,${payload.length}\n`);
    out.push(...payload);
  }
  return new Uint8Array(out);
}

export function buildKraBytes(
  width: number,
  height: number,
  layers: Array<{ name: string; filename: string; x?: number; y?: number; tiles: Array<{ x: number; y: number; bgra: [number, number, number, number] }> }>,
): Uint8Array {
  const maindoc =
    `<?xml version="1.0" encoding="UTF-8"?>\n<DOC><IMAGE width="${width}" height="${height}" ` +
    `colorspacename="RGBA" name="art" profile="sRGB" mime="application/x-kra">` +
    `<layers>${layers.map((layer) => `<layer opacity="255" x="${layer.x ?? 0}" y="${layer.y ?? 0}" colorspacename="RGBA" visible="1" nodetype="paintlayer" name="${layer.name}" filename="${layer.filename}" channelflags=""/>`).join("")}</layers>` +
    `<animation><framerate type="value" value="10"/><range from="0" type="timerange" to="1"/><currentTime type="value" value="0"/></animation>` +
    `</IMAGE></DOC>`;
  const files: Record<string, Uint8Array> = {
    mimetype: new TextEncoder().encode("application/x-krita"),
    "maindoc.xml": new TextEncoder().encode(maindoc),
  };
  for (const layer of layers) {
    files[`art/layers/${layer.filename}`] = kraTileStore(layer.tiles);
  }
  return zipSync(files);
}

export async function loadBlankProject(page: import("@playwright/test").Page, canvasSize: number): Promise<void> {
  // Fresh empty project at an explicit size (same path as File > New):
  // layers carry no texture until painting materializes one.
  await page.evaluate((canvas: number) => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { newProject(width: number, height: number): void } };
    };
    root.__gnumarus?.engine?.newProject(canvas, canvas);
  }, canvasSize);
};

export async function loadRedProject(
  page: import("@playwright/test").Page,
  canvasSize: number,
  textureSize: number,
  offsetX: number,
  offsetY: number,
): Promise<void> {
  await page.evaluate(
    ([canvas, texture, dx, dy]: number[]) => {
      const root = window as unknown as {
        __gnumarus?: {
          engine?: {
            loadProject(
              width: number,
              height: number,
              inputs: Array<{
                id: string;
                name: string;
                visible: boolean;
                opacity: number;
                width: number;
                height: number;
                buffer: Uint8ClampedArray;
                transform: unknown;
                lockedChannels: { r: boolean; g: boolean; b: boolean; a: boolean };
              }>,
            ): void;
          };
        };
      };
      const red = new Uint8ClampedArray(texture * texture * 4);
      for (let i = 0; i < texture * texture; i += 1) {
        red[i * 4] = 255;
        red[i * 4 + 3] = 255;
      }
      root.__gnumarus?.engine?.loadProject(canvas, canvas, [
        {
          id: "layer0",
          name: "Layer 1",
          visible: true,
          opacity: 1,
          width: texture,
          height: texture,
          buffer: red,
          transform: {
            x: dx, y: dy, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1,
            skewX: 0, skewY: 0, rotationX: 0, rotationY: 0,
          },
          lockedChannels: { r: false, g: false, b: false, a: false },
        },
      ]);
    },
    [canvasSize, textureSize, offsetX, offsetY],
  );
}

export async function animationDialog(page: import("@playwright/test").Page): Promise<import("@playwright/test").Locator> {
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.getByRole("button", { name: "Manage animations", exact: true }).click();
  const dialog = page.locator("gnumarus-shell dialog#animationDialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

export async function addAnimation(page: import("@playwright/test").Page, text: string): Promise<void> {
  const dialog = await animationDialog(page);
  await dialog.locator("input#animationInput").fill(text);
  await dialog.getByRole("button", { name: "Add", exact: true }).click();
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(dialog).toBeHidden();
}

export async function addFrames(page: import("@playwright/test").Page, count: number): Promise<void> {
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  for (let i = 0; i < count; i += 1) {
    await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  }
}

export async function selectAnimation(page: import("@playwright/test").Page, name: string): Promise<void> {
  await page.locator('gnumarus-shell [data-testid="animation-select"]').selectOption(name);
}

export async function stubSaveFilePicker(page: import("@playwright/test").Page): Promise<void> {
  await page.evaluate(() => {
    const root = window as unknown as {
      showSaveFilePicker?: (options?: unknown) => Promise<unknown>;
      __gnumarusExportTest?: { fileName: string | null; blob: Blob | null };
    };
    const state: { fileName: string | null; blob: Blob | null } = { fileName: null, blob: null };
    root.__gnumarusExportTest = state;
    root.showSaveFilePicker = async (options?: unknown) => {
      const name =
        (options as { suggestedName?: string } | undefined)?.suggestedName ?? "export.bin";
      return {
        createWritable: async () => ({
          write: async (data: string | Blob): Promise<void> => {
            state.fileName = name;
            state.blob = data instanceof Blob ? data : new Blob([data]);
          },
          close: async (): Promise<void> => {},
        }),
      };
    };
  });
}

export async function exportedFile(page: import("@playwright/test").Page): Promise<{
  fileName: string | null;
  type: string;
  width: number;
  height: number;
  center: number[];
  corner: number[];
} | null> {
  return page.evaluate(async () => {
    const root = window as unknown as {
      __gnumarusExportTest?: { fileName: string | null; blob: Blob | null };
    };
    const state = root.__gnumarusExportTest;
    if (state?.blob == null) {
      return null;
    }
    const bitmap = await createImageBitmap(state.blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (context === null) {
      bitmap.close();
      return null;
    }
    context.drawImage(bitmap, 0, 0);
    const result = {
      fileName: state.fileName,
      type: state.blob.type,
      width: bitmap.width,
      height: bitmap.height,
      center: Array.from(context.getImageData(32, 32, 1, 1).data),
      corner: Array.from(context.getImageData(0, 0, 1, 1).data),
    };
    bitmap.close();
    return result;
  });
}

export async function stubProjectDirectory(
  page: import("@playwright/test").Page,
  dirName = "MockProject",
): Promise<{
  writtenBlobs: () => Promise<Record<string, number[]>>;
  writtenProject: () => Promise<string | null>;
  seedFile: (path: string, bytes: number[]) => Promise<void>;
}> {
  await page.evaluate((dir: string) => {
    const root = window as unknown as {
      showDirectoryPicker?: () => Promise<unknown>;
      __gnumarusProjectTest?: { files: Record<string, Blob> };
    };
    const state: { files: Record<string, Blob> } = { files: {} };
    root.__gnumarusProjectTest = state;
    root.showDirectoryPicker = async () => ({
      name: dir,
      removeEntry: async (name: string): Promise<void> => {
        if (state.files[name] === undefined) {
          throw new DOMException("File not found", "NotFoundError");
        }
        delete state.files[name];
      },
      getFileHandle: async (name: string, options?: { create?: boolean }) => {
        if (state.files[name] === undefined && options?.create !== true) {
          throw new DOMException("File not found", "NotFoundError");
        }
        return {
          getFile: async (): Promise<Blob> => {
            const found = state.files[name];
            if (found === undefined) {
              throw new DOMException("File not found", "NotFoundError");
            }
            return found;
          },
          createWritable: async () => ({
            write: async (data: string | Blob): Promise<void> => {
              state.files[name] = data instanceof Blob ? data : new Blob([data]);
            },
            close: async (): Promise<void> => {},
          }),
        };
      },
      getDirectoryHandle: async (name: string) => ({
        name,
        removeEntry: async (child: string): Promise<void> => {
          if (state.files[`${name}/${child}`] === undefined) {
            throw new DOMException("File not found", "NotFoundError");
          }
          delete state.files[`${name}/${child}`];
        },
        getFileHandle: async (child: string, options?: { create?: boolean }) => {
          if (state.files[`${name}/${child}`] === undefined && options?.create !== true) {
            throw new DOMException("File not found", "NotFoundError");
          }
          return {
            getFile: async (): Promise<Blob> => {
              const found = state.files[`${name}/${child}`];
              if (found === undefined) {
                throw new DOMException("File not found", "NotFoundError");
              }
              return found;
            },
            createWritable: async () => ({
              write: async (data: string | Blob): Promise<void> => {
                state.files[`${name}/${child}`] = data instanceof Blob ? data : new Blob([data]);
              },
              close: async (): Promise<void> => {},
            }),
          };
        },
        getDirectoryHandle: async (): Promise<never> => {
          throw new Error("no nested directories in project test");
        },
      }),
    });
  }, dirName);
  return {
    writtenBlobs: (): Promise<Record<string, number[]>> =>
      page.evaluate(async () => {
        const root = window as unknown as {
          __gnumarusProjectTest?: { files: Record<string, Blob> };
        };
        const out: Record<string, number[]> = {};
        for (const [name, blob] of Object.entries(root.__gnumarusProjectTest?.files ?? {})) {
          out[name] = Array.from(new Uint8Array(await blob.arrayBuffer()));
        }
        return out;
      }),
    writtenProject: (): Promise<string | null> =>
      page
        .evaluate(async () => {
          const root = window as unknown as {
            __gnumarusProjectTest?: { files: Record<string, Blob> };
          };
          const files = root.__gnumarusProjectTest?.files ?? {};
          const archived = files["project.gpa"];
          if (archived !== undefined) {
            return JSON.stringify(Array.from(new Uint8Array(await archived.arrayBuffer())));
          }
          const plain = files["project.json"];
          return plain === undefined ? null : plain.text();
        })
        .then((raw) => {
          if (raw === null) {
            return null;
          }
          if (raw.startsWith("[")) {
            const entries = unzipSync(new Uint8Array(JSON.parse(raw) as number[]));
            const inner = entries["project.json"];
            if (inner === undefined) {
              throw new Error("project.gpa has no project.json inside");
            }
            return new TextDecoder().decode(inner);
          }
          return raw;
        }),
    seedFile: (path: string, bytes: number[]): Promise<void> =>
      page.evaluate(
        ({ name, data }: { name: string; data: number[] }) => {
          const root = window as unknown as {
            __gnumarusProjectTest?: { files: Record<string, Blob> };
          };
          if (root.__gnumarusProjectTest !== undefined) {
            root.__gnumarusProjectTest.files[name] = new Blob([new Uint8Array(data)]);
          }
        },
        { name: path, data: bytes },
      ),
  };
}

export async function readJpegSamples(
  page: import("@playwright/test").Page,
  bytes: number[],
): Promise<{ center: number[]; corner: number[] } | null> {
  return page.evaluate(async (data: number[]) => {
    const blob = new Blob([new Uint8Array(data)], { type: "image/jpeg" });
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (context === null) {
      bitmap.close();
      return null;
    }
    context.drawImage(bitmap, 0, 0);
    const result = {
      center: Array.from(context.getImageData(32, 32, 1, 1).data),
      corner: Array.from(context.getImageData(0, 0, 1, 1).data),
    };
    bitmap.close();
    return result;
  }, bytes);
}

export async function stubExportDirectory(page: import("@playwright/test").Page): Promise<void> {
  await page.evaluate(() => {
    const root = window as unknown as {
      showDirectoryPicker?: () => Promise<unknown>;
      __gnumarusExportDirTest?: { dirName: string | null; files: Record<string, Blob> };
    };
    const state: { dirName: string | null; files: Record<string, Blob> } = {
      dirName: "exports",
      files: {},
    };
    root.__gnumarusExportDirTest = state;
    root.showDirectoryPicker = async () => ({
      name: "exports",
      getFileHandle: async (name: string) => ({
        createWritable: async () => ({
          write: async (data: string | Blob): Promise<void> => {
            state.files[name] = data instanceof Blob ? data : new Blob([data]);
          },
          close: async (): Promise<void> => {},
        }),
      }),
      getDirectoryHandle: async () => {
        throw new Error("no subdirectories in export test");
      },
    });
  });
}

export async function exportedGifBytes(page: import("@playwright/test").Page): Promise<{  fileName: string | null;
  type: string;
  header: string;
  width: number;
  height: number;
  hasNetscape: boolean;
  descriptors: number;
} | null> {
  return page.evaluate(async () => {
    const root = window as unknown as {
      __gnumarusExportTest?: { fileName: string | null; blob: Blob | null };
    };
    const state = root.__gnumarusExportTest;
    if (state?.blob == null) {
      return null;
    }
    const buffer = await state.blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);
    let ascii = "";
    for (let i = 0; i < 6; i += 1) {
      ascii += String.fromCharCode(bytes[i] ?? 0);
    }
    const tag = "NETSCAPE2.0";
    let hasNetscape = false;
    for (let i = 0; i + tag.length <= bytes.length; i += 1) {
      let match = true;
      for (let j = 0; j < tag.length; j += 1) {
        if (bytes[i + j] !== tag.charCodeAt(j)) {
          match = false;
          break;
        }
      }
      if (match) {
        hasNetscape = true;
        break;
      }
    }
    // Count image descriptors, skipping color tables and sub-blocks.
    let descriptors = 0;
    let i = 13;
    const globalPacked = bytes[10] ?? 0;
    if ((globalPacked & 0x80) !== 0) {
      i += 3 * 2 ** ((globalPacked & 0x07) + 1);
    }
    while (i < bytes.length) {
      const marker = bytes[i];
      if (marker === 0x3b) {
        break;
      }
      if (marker === 0x21) {
        if (bytes[i + 1] === 0xf9) {
          i += 8;
          continue;
        }
        i += 2;
        for (;;) {
          const size = bytes[i] ?? 0;
          i += 1;
          if (size === 0) {
            break;
          }
          i += size;
        }
        continue;
      }
      if (marker === 0x2c) {
        descriptors += 1;
        const packed = bytes[i + 9] ?? 0;
        i += 10;
        if ((packed & 0x80) !== 0) {
          i += 3 * 2 ** ((packed & 0x07) + 1);
        }
        i += 1;
        for (;;) {
          const size = bytes[i] ?? 0;
          i += 1;
          if (size === 0) {
            break;
          }
          i += size;
        }
        continue;
      }
      break;
    }
    return {
      fileName: state.fileName,
      type: state.blob.type,
      header: ascii,
      width: view.getUint16(6, true),
      height: view.getUint16(8, true),
      hasNetscape,
      descriptors,
    };
  });
}

export async function exportedJxlBytes(page: import("@playwright/test").Page): Promise<{
  fileName: string | null;
  type: string;
  bytes: number[];
} | null> {
  return page.evaluate(async () => {
    const root = window as unknown as {
      __gnumarusExportTest?: { fileName: string | null; blob: Blob | null };
    };
    const state = root.__gnumarusExportTest;
    if (state?.blob == null) {
      return null;
    }
    const buffer = await state.blob.arrayBuffer();
    return { fileName: state.fileName, type: state.blob.type, bytes: Array.from(new Uint8Array(buffer)) };
  });
}

export interface JxlDecodedFrame {
  width: number;
  height: number;
  center: number[];
  pixels: number[];
  frames: number;
}

export interface WebpDecodedFrame {
  width: number;
  height: number;
  center: number[];
  pixels: number[];
  frames: number;
}

export async function decodeWebpInPage(
  page: import("@playwright/test").Page,
  bytes: number[],
): Promise<WebpDecodedFrame | null> {
  return page.evaluate(async (data: number[]) => {
    const shimUrl = "/src/codec/webp/webp_shim.js";
    const ns: unknown = await import(/* @vite-ignore */ shimUrl);
    const factory = (ns as { default: (overrides?: { wasmBinary?: Uint8Array }) => Promise<unknown> }).default;
    const wasm = new Uint8Array(await (await fetch("/src/codec/webp/webp_shim.wasm")).arrayBuffer());
    const codec = (await factory({ wasmBinary: wasm })) as {
      webp_decode_js(input: Uint8Array): { ok: boolean; width?: number; height?: number; buffer?: Uint8Array };
      webp_frame_count_js(input: Uint8Array): { ok: boolean; count?: number };
    };
    const input = new Uint8Array(data);
    const decoded = codec.webp_decode_js(input);
    if (!decoded.ok || decoded.width === undefined || decoded.height === undefined || !(decoded.buffer instanceof Uint8Array)) {
      return null;
    }
    const counted = codec.webp_frame_count_js(input);
    const at = (decoded.height >> 1) * decoded.width + (decoded.width >> 1);
    return {
      width: decoded.width,
      height: decoded.height,
      center: Array.from(decoded.buffer.subarray(at * 4, at * 4 + 4)),
      pixels: Array.from(decoded.buffer),
      frames: counted.ok === true && typeof counted.count === "number" ? counted.count : -1,
    };
  }, bytes);
}

export async function decodeJxlInPage(
  page: import("@playwright/test").Page,
  bytes: number[],
): Promise<JxlDecodedFrame | null> {
  return page.evaluate(async (data: number[]) => {
    const shimUrl = "/src/codec/jxl/jxl_shim.js";
    const ns: unknown = await import(/* @vite-ignore */ shimUrl);
    const factory = (ns as { default: (overrides?: { wasmBinary?: Uint8Array }) => Promise<unknown> }).default;
    const wasm = new Uint8Array(await (await fetch("/src/codec/jxl/jxl_shim.wasm")).arrayBuffer());
    const codec = (await factory({ wasmBinary: wasm })) as {
      jxl_decode_js(input: Uint8Array): { ok: boolean; width?: number; height?: number; buffer?: Uint8Array };
      jxl_frame_count_js(input: Uint8Array): { ok: boolean; count?: number };
    };
    const input = new Uint8Array(data);
    const decoded = codec.jxl_decode_js(input);
    if (!decoded.ok || decoded.width === undefined || decoded.height === undefined || !(decoded.buffer instanceof Uint8Array)) {
      return null;
    }
    const counted = codec.jxl_frame_count_js(input);
    const at = (decoded.height >> 1) * decoded.width + (decoded.width >> 1);
    return {
      width: decoded.width,
      height: decoded.height,
      center: Array.from(decoded.buffer.subarray(at * 4, at * 4 + 4)),
      pixels: Array.from(decoded.buffer),
      frames: counted.ok === true && typeof counted.count === "number" ? counted.count : -1,
    };
  }, bytes);
}

export async function exportedSequence(page: import("@playwright/test").Page): Promise<{
  names: string[];
  dirName: string | null;
  firstCenter: number[];
  secondCenter: number[];
} | null> {
  return page.evaluate(async () => {
    const root = window as unknown as {
      __gnumarusExportDirTest?: { dirName: string | null; files: Record<string, Blob> };
    };
    const state = root.__gnumarusExportDirTest;
    if (state === undefined) {
      return null;
    }
    const names = Object.keys(state.files).sort();
    async function center(name: string | undefined): Promise<number[]> {
      if (name === undefined) {
        return [];
      }
      const blob = state?.files[name];
      if (blob === undefined) {
        return [];
      }
      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d");
      if (context === null) {
        bitmap.close();
        return [];
      }
      context.drawImage(bitmap, 0, 0);
      const pixels = Array.from(context.getImageData(32, 32, 1, 1).data);
      bitmap.close();
      return pixels;
    }
    return {
      names,
      dirName: state.dirName,
      firstCenter: await center(names[0]),
      secondCenter: await center(names[1]),
    };
  });
}

export async function exportedSheetPixels(page: import("@playwright/test").Page): Promise<{
  width: number;
  height: number;
  cells: number[][];
} | null> {
  return page.evaluate(async () => {
    const root = window as unknown as {
      __gnumarusExportTest?: { fileName: string | null; blob: Blob | null };
    };
    const state = root.__gnumarusExportTest;
    if (state?.blob == null) {
      return null;
    }
    const bitmap = await createImageBitmap(state.blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (context === null) {
      bitmap.close();
      return null;
    }
    context.drawImage(bitmap, 0, 0);
    const cells: number[][] = [];
    for (const [x, y] of [
      [32, 32],
      [96, 32],
      [32, 96],
      [96, 96],
    ]) {
      cells.push(Array.from(context.getImageData(x, y, 1, 1).data));
    }
    const result = { width: bitmap.width, height: bitmap.height, cells };
    bitmap.close();
    return result;
  });
}

export async function cellTextId(page: import("@playwright/test").Page, layerId: string, frame: number): Promise<string | null> {
  return page.evaluate(([layer, targetFrame]: [string, number]) => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getCellTextId(layerId: string, frame: number): string | null } };
    };
    return root.__gnumarus?.engine?.getCellTextId(layer, targetFrame) ?? null;
  }, [layerId, frame] as [string, number]);
}

export async function cellTextureId(page: import("@playwright/test").Page, layerId: string, frame: number): Promise<string | null> {
  return page.evaluate(([layer, targetFrame]: [string, number]) => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getCellTextureId(layerId: string, frame: number): string | null } };
    };
    return root.__gnumarus?.engine?.getCellTextureId(layer, targetFrame) ?? null;
  }, [layerId, frame] as [string, number]);
}

export async function textHtml(page: import("@playwright/test").Page, textId: string): Promise<string | null> {
  return page.evaluate((id: string) => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getTextDocument(textId: string): { html: string } | null } };
    };
    return root.__gnumarus?.engine?.getTextDocument(id)?.html ?? null;
  }, textId);
}

export async function textPaintedPixels(page: import("@playwright/test").Page): Promise<number> {
  return page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { readPixel(x: number, y: number): { a: number } | null } };
    };
    const engine = root.__gnumarus?.engine;
    if (engine === undefined) {
      return -1;
    }
    let count = 0;
    for (let y = 0; y < 64; y += 4) {
      for (let x = 0; x < 64; x += 4) {
        if ((engine.readPixel(x, y)?.a ?? 0) > 0) {
          count += 1;
        }
      }
    }
    return count;
  });
}

export async function createDefaultText(page: import("@playwright/test").Page): Promise<string> {
  await page.locator('gnumarus-shell [data-testid="tool-text"]').click();
  await paintCenter(page);
  const dialog = page.locator('gnumarus-shell [data-testid="text-editor-dialog"]');
  await expect(dialog).toBeVisible();
  await page.locator('gnumarus-shell [data-testid="text-ok"]').click();
  await expect(page.locator('gnumarus-shell [data-testid="text-editor-dialog"]')).toBeHidden();
  const textId = await cellTextId(page, "layer0", 0);
  expect(typeof textId).toBe("string");
  return textId as string;
}

export async function setTextStorage(page: import("@playwright/test").Page, mode: string): Promise<void> {
  await page.evaluate((which: string) => {
    const root = window as unknown as {
      __gnumarus?: {
        shell?: {
          setProjectStorage(
            lossless: boolean,
            quality: number,
            format?: string,
            pngLevel?: number,
            jpgQuality?: number,
            brushQuality?: number,
            projectFile?: string,
            textStorage?: string,
          ): void;
        };
      };
    };
    root.__gnumarus?.shell?.setProjectStorage(true, 50, "jxl", 9, 95, 90, "gpa", which);
  }, mode);
}

export async function createHelloText(page: import("@playwright/test").Page): Promise<string> {
  await page.locator('gnumarus-shell [data-testid="tool-text"]').click();
  await paintCenter(page);
  const area = page.locator('gnumarus-shell [data-testid="text-editor-area"]');
  await area.click();
  await page.keyboard.press("Control+a");
  await page.keyboard.type("Hello");
  await page.locator('gnumarus-shell [data-testid="text-ok"]').click();
  await expect(page.locator("gnumarus-shell")).toContainText("Text updated");
  const textId = await cellTextId(page, "layer0", 0);
  expect(typeof textId).toBe("string");
  return textId as string;
}

export async function stubSvgPicker(page: import("@playwright/test").Page, fileName: string, data: string | number[]): Promise<void> {
  await page.evaluate(
    ([name, payload]: [string, string | number[]]) => {
      const root = window as unknown as {
        showOpenFilePicker?: () => Promise<Array<{ getFile(): Promise<File> }>>;
      };
      const bytes = typeof payload === "string" ? new TextEncoder().encode(payload) : new Uint8Array(payload);
      root.showOpenFilePicker = async () => [
        {
          getFile: async () => new File([bytes], name, { type: "image/svg+xml" }),
        },
      ];
    },
    [fileName, data] as [string, string | number[]],
  );
}

export async function setSvgStorage(page: import("@playwright/test").Page, mode: string): Promise<void> {
  await page.evaluate((which: string) => {
    const root = window as unknown as {
      __gnumarus?: { shell?: { setSvgStorage(storage: string): void } };
    };
    root.__gnumarus?.shell?.setSvgStorage(which);
  }, mode);
}

export async function cellSvgId(page: import("@playwright/test").Page, layerId: string, frame: number): Promise<string | null> {
  return page.evaluate(([layer, targetFrame]: [string, number]) => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getCellSvgId(layerId: string, frame: number): string | null } };
    };
    return root.__gnumarus?.engine?.getCellSvgId(layer, targetFrame) ?? null;
  }, [layerId, frame] as [string, number]);
}

export const SIMPLE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#ff0000"/></svg>';

export const FILTER_SVG = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="64" height="64"><defs><filter id="b"><feGaussianBlur stdDeviation="2"/></filter><inkscape:path-effect effect="rough"/></defs><rect width="64" height="64" fill="#00ff00" filter="url(#b)"/></svg>';

export async function stubModelPicker(page: import("@playwright/test").Page, fileName: string, data: string | number[]): Promise<void> {
  await page.evaluate(
    ([name, payload]: [string, string | number[]]) => {
      const root = window as unknown as {
        showOpenFilePicker?: () => Promise<Array<{ getFile(): Promise<File> }>>;
      };
      const bytes = typeof payload === "string" ? new TextEncoder().encode(payload) : new Uint8Array(payload);
      root.showOpenFilePicker = async () => [
        {
          getFile: async () => new File([bytes], name, { type: "application/octet-stream" }),
        },
      ];
    },
    [fileName, data] as [string, string | number[]],
  );
}

export async function cellModel3dId(page: import("@playwright/test").Page, layerId: string, frame: number): Promise<string | null> {
  return page.evaluate(([layer, targetFrame]: [string, number]) => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getCellModel3dId(layerId: string, frame: number): string | null } };
    };
    return root.__gnumarus?.engine?.getCellModel3dId(layer, targetFrame) ?? null;
  }, [layerId, frame] as [string, number]);
}

export async function modelPaintedPixels(page: import("@playwright/test").Page): Promise<number> {
  return page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { readPixel(x: number, y: number): { a: number } | null } };
    };
    const engine = root.__gnumarus?.engine;
    if (engine === undefined) {
      return -1;
    }
    let count = 0;
    for (let y = 0; y < 512; y += 8) {
      for (let x = 0; x < 512; x += 8) {
        if ((engine.readPixel(x, y)?.a ?? 0) > 0) {
          count += 1;
        }
      }
    }
    return count;
  });
}

export const SIMPLE_STL = `solid test
facet normal 0 0 1
outer loop
vertex 0 0 0
vertex 64 0 0
vertex 0 64 0
endloop
endfacet
endsolid test
`;

export async function tilemapTiles(page: import("@playwright/test").Page): Promise<Array<Record<string, number | boolean>> | null> {
  return page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getTilemapEntries(): Array<{ tiles: Array<Record<string, number | boolean>> }> } };
    };
    return root.__gnumarus?.engine?.getTilemapEntries()[0]?.tiles ?? null;
  });
}

export async function tileBrushState(page: import("@playwright/test").Page): Promise<Record<string, number | boolean | string | null> | null> {
  return page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getTileBrush(): Record<string, number | boolean | string | null> } };
    };
    return root.__gnumarus?.engine?.getTileBrush() ?? null;
  });
}

export async function setupTileBrushStroke(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await setPencil(page, "#ff0000");
  await page.getByRole("button", { name: "Bucket fill" }).click();
  await paintCenter(page);
  await page.getByRole("button", { name: "Add frame", exact: true }).click();
  await page.locator('gnumarus-shell [data-testid="anim-frame"][data-frame="1"]').click();
  await page.locator('gnumarus-shell [data-testid="tool-tilebrush"]').click();
  await page.locator('gnumarus-shell [data-testid="tile-tileset"]').click();
  await page.locator('gnumarus-shell [data-testid="texture-picker-item"]').first().click();
  await paintCenter(page);
  expect(await tilemapTiles(page)).toHaveLength(1);
}

export async function tileRubberState(page: import("@playwright/test").Page): Promise<{ display: string; cells: number } | null> {
  return page.evaluate(() => {
    const root = document.querySelector("gnumarus-shell")?.shadowRoot;
    const rubber = root?.querySelector('[data-testid="tile-rubber"]');
    if (rubber === null || rubber === undefined) {
      return null;
    }
    return { display: (rubber as SVGGElement).style.display, cells: rubber.childElementCount };
  });
}

export function tileKeys(tiles: Array<Record<string, number | boolean>> | null): string[] {
  return (tiles ?? []).map((tile) => `${String(tile["x"])},${String(tile["y"])}`).sort();
}

export async function modelViewOf(page: import("@playwright/test").Page, modelId: string): Promise<Record<string, number> | null> {
  return page.evaluate((id: string) => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getModelView(modelId: string): Record<string, number> | null } };
    };
    return root.__gnumarus?.engine?.getModelView(id) ?? null;
  }, modelId);
}

export async function flyPoseOf(page: import("@playwright/test").Page): Promise<{
  yawDeg: number;
  pitchDeg: number;
  x: number;
  y: number;
  z: number;
} | null> {
  return page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: {
        engine?: {
          getFlycam(): { modelId: string; yawDeg: number; pitchDeg: number; x: number; y: number; z: number } | null;
        };
      };
    };
    const fly = root.__gnumarus?.engine?.getFlycam() ?? null;
    return fly === null ? null : { yawDeg: fly.yawDeg, pitchDeg: fly.pitchDeg, x: fly.x, y: fly.y, z: fly.z };
  });
}

export async function stubImagePicker(page: import("@playwright/test").Page, fileName: string, bytes: number[]): Promise<void> {
  await page.evaluate(
    ([name, payload]: [string, number[]]) => {
      const root = window as unknown as {
        showOpenFilePicker?: () => Promise<Array<{ getFile(): Promise<File> }>>;
      };
      root.showOpenFilePicker = async () => [
        {
          getFile: async () => new File([new Uint8Array(payload)], name, { type: "image/png" }),
        },
      ];
    },
    [fileName, bytes] as [string, number[]],
  );
}

export async function borderedPngBytes(page: import("@playwright/test").Page, size: number): Promise<number[]> {
  return page.evaluate(async (side: number) => {
    const canvas = document.createElement("canvas");
    canvas.width = side;
    canvas.height = side;
    const context = canvas.getContext("2d");
    if (context === null) {
      throw new Error("2D canvas unavailable");
    }
    context.clearRect(0, 0, side, side);
    context.fillStyle = "#ff0000";
    context.fillRect(Math.floor(side / 2), Math.floor(side / 2), 1, 1);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (blob === null) {
      throw new Error("PNG encode failed");
    }
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  }, size);
}

export async function layerCount(page: import("@playwright/test").Page): Promise<number> {
  return page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { getLayers(): unknown[] } } };
    return root.__gnumarus?.engine?.getLayers().length ?? -1;
  });
}

export async function dragCanvas(page: import("@playwright/test").Page, x0: number, y0: number, x1: number, y1: number): Promise<void> {
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  await page.mouse.move(box.x + x0, box.y + y0);
  await page.mouse.down();
  await page.mouse.move(box.x + x1, box.y + y1, { steps: 5 });
  await page.mouse.up();
}

export async function canvasBox(page: import("@playwright/test").Page): Promise<{ x: number; y: number; width: number; height: number }> {
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  return box;
}

export async function mouseDot(page: import("@playwright/test").Page, x: number, y: number): Promise<void> {
  const canvas = page.locator("gnumarus-shell canvas");
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("canvas has no bounding box");
  }
  await page.mouse.click(box.x + x, box.y + y);
}

export async function onionVisible(page: import("@playwright/test").Page): Promise<{ past: boolean; future: boolean }> {
  return page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { onionGhostVisible(which: string): boolean } } };
    const engine = root.__gnumarus?.engine;
    return { past: engine?.onionGhostVisible("past") ?? false, future: engine?.onionGhostVisible("future") ?? false };
  });
}

export async function setOnion(page: import("@playwright/test").Page, enabled: boolean, past: number, future: number): Promise<void> {
  await page.evaluate(([on, p, f]: [boolean, number, number]) => {
    const root = window as unknown as { __gnumarus?: { shell?: { setOnionState(a: boolean, b: number, c: number, d: boolean): void } } };
    root.__gnumarus?.shell?.setOnionState(on, p, f, true);
  }, [enabled, past, future] as [boolean, number, number]);
}

export async function previewRgba(page: import("@playwright/test").Page, x: number, y: number): Promise<number[] | null> {
  return page.evaluate(([px, py]: number[]) => {
    const root = document.querySelector("gnumarus-shell")?.shadowRoot ?? null;
    const canvas = root?.getElementById("previewCanvas") as HTMLCanvasElement | null;
    const context = canvas?.getContext("2d") ?? null;
    if (context === null) {
      return null;
    }
    const data = context.getImageData(px, py, 1, 1).data;
    return [data[0], data[1], data[2], data[3]];
  }, [x, y] as [number, number]);
}

export async function layerToScreen(page: import("@playwright/test").Page, x: number, y: number): Promise<{ x: number; y: number }> {
  const box = await canvasBox(page);
  const zoom = await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { getViewState(): { zoom: number } } } };
    return root.__gnumarus?.engine?.getViewState().zoom ?? 1;
  });
  const size = await layerSize(page);
  return {
    x: box.x + box.width / 2 + (x - size.width / 2) * zoom,
    y: box.y + box.height / 2 + (y - size.height / 2) * zoom,
  };
}

export async function dragLayerBox(
  page: import("@playwright/test").Page,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): Promise<void> {
  const a = await layerToScreen(page, x0, y0);
  const b = await layerToScreen(page, x1, y1);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 5 });
  await page.mouse.up();
}

export async function paintLayerRect(page: import("@playwright/test").Page, hex: string, x0: number, y0: number, x1: number, y1: number): Promise<void> {
  await setPencil(page, hex);
  await page.evaluate(([ax, ay, bx, by]: number[]) => {
    const root = window as unknown as { __gnumarus?: { engine?: { setShapeFilled(f: boolean): void; commitShapeRect(a: number, b: number, c: number, d: number): boolean } } };
    root.__gnumarus?.engine?.setShapeFilled(true);
    root.__gnumarus?.engine?.commitShapeRect(ax, ay, bx, by);
  }, [x0, y0, x1, y1] as [number, number, number, number]);
}

export async function countRedIn(page: import("@playwright/test").Page, x0: number, y0: number, x1: number, y1: number): Promise<number> {
  return page.evaluate(([ax, ay, bx, by]: number[]) => {
    const root = window as unknown as { __gnumarus?: { engine?: { readPixel(x: number, y: number): { r: number; g: number; b: number; a: number } | null } } };
    const engine = root.__gnumarus?.engine;
    if (engine === undefined) {
      return -1;
    }
    let count = 0;
    for (let y = ay; y < by; y += 1) {
      for (let x = ax; x < bx; x += 1) {
        const pixel = engine.readPixel(x, y);
        if (pixel !== null && pixel.r === 255 && pixel.g === 0 && pixel.b === 0 && pixel.a === 255) {
          count += 1;
        }
      }
    }
    return count;
  }, [x0, y0, x1, y1] as [number, number, number, number]);
}

export async function setMaskOption(page: import("@playwright/test").Page, inputId: string, value: string): Promise<void> {
  const input = page.locator(`gnumarus-shell #${inputId}`);
  await input.fill(value);
  await input.evaluate((el) => el.dispatchEvent(new Event("change", { bubbles: true })));
  // Blur the number input: engine Enter-to-merge ignores key events from
  // inside text fields, so focus must leave before Enter commits.
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
}

export async function commitFloatingSelection(page: import("@playwright/test").Page): Promise<void> {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
  await page.keyboard.press("Enter");
}

export async function onionGhostBox(
  page: import("@playwright/test").Page,
  which: "past" | "future",
): Promise<{ x: number; y: number; width: number; height: number } | null> {
  return page.evaluate((side: "past" | "future") => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getOnionGhostBox(which: "past" | "future"): { x: number; y: number; width: number; height: number } | null } };
    };
    return root.__gnumarus?.engine?.getOnionGhostBox(side) ?? null;
  }, which);
}

export async function namedAnimations(page: import("@playwright/test").Page): Promise<Array<{ name: string; loop: string; frames: Array<{ frame: number; duration: number | null }> }>> {
  return page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: {
        engine?: {
          getNamedAnimations(): Array<{ name: string; loop: string; frames: Array<{ frame: number; duration: number | null }> }>;
        };
      };
    };
    return root.__gnumarus?.engine?.getNamedAnimations() ?? [];
  });
}

export async function shapePreviewVisible(page: import("@playwright/test").Page): Promise<boolean> {
  return page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { isShapePreviewVisible(): boolean } } };
    return root.__gnumarus?.engine?.isShapePreviewVisible() ?? false;
  });
}

export async function shapePreviewPixels(page: import("@playwright/test").Page): Promise<{
  width: number;
  height: number;
  buffer: number[];
} | null> {
  return page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getShapePreviewPixels(): { width: number; height: number; buffer: number[] } | null } };
    };
    return root.__gnumarus?.engine?.getShapePreviewPixels() ?? null;
  });
}

export async function readBox(
  page: import("@playwright/test").Page,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): Promise<number[]> {
  return page.evaluate(([ax, ay, bx, by]: number[]) => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { readPixel(x: number, y: number): { r: number; g: number; b: number; a: number } | null } };
    };
    const engine = root.__gnumarus?.engine;
    if (engine === undefined) {
      throw new Error("engine is unavailable");
    }
    const out: number[] = [];
    for (let y = ay; y <= by; y += 1) {
      for (let x = ax; x <= bx; x += 1) {
        const pixel = engine.readPixel(x, y);
        out.push(pixel?.r ?? -1, pixel?.g ?? -1, pixel?.b ?? -1, pixel?.a ?? -1);
      }
    }
    return out;
  }, [x0, y0, x1, y1] as [number, number, number, number]);
}

export function sliceBox(
  buffer: number[],
  width: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): number[] {
  const out: number[] = [];
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const at = (y * width + x) * 4;
      out.push(buffer[at] ?? -1, buffer[at + 1] ?? -1, buffer[at + 2] ?? -1, buffer[at + 3] ?? -1);
    }
  }
  return out;
}

export async function getLayerParents(page: import("@playwright/test").Page): Promise<Array<{ id: string; parentId: string | null }>> {
  return page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getLayers(): Array<{ id: string; parentId: string | null }> } };
    };
    return root.__gnumarus?.engine?.getLayers().map((layer) => ({ id: layer.id, parentId: layer.parentId })) ?? [];
  });
}

export async function engineReparent(page: import("@playwright/test").Page, childId: string, parentId: string): Promise<boolean> {
  return page.evaluate(([child, parent]: string[]) => {
    const root = window as unknown as {
      __gnumarus?: { shell?: { refreshLayers(): void }; engine?: { reparentLayerAsChild(c: string, p: string): boolean } };
    };
    const ok = root.__gnumarus?.engine?.reparentLayerAsChild(child, parent) ?? false;
    root.__gnumarus?.shell?.refreshLayers?.();
    return ok;
  }, [childId, parentId] as string[]);
}

export async function setEmptyCellHold(page: import("@playwright/test").Page, hold: boolean): Promise<void> {
  await page.evaluate((value: boolean) => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { setEmptyCellHold(hold: boolean): void } };
    };
    root.__gnumarus?.engine?.setEmptyCellHold(value);
  }, hold);
}

export async function dropLayerOnto(page: import("@playwright/test").Page, childId: string, parentId: string): Promise<void> {
  await page.evaluate(([child, parent]: string[]) => {
    const shell = document.querySelector("gnumarus-shell");
    const shadow = (shell as unknown as { shadowRoot: ShadowRoot | null })?.shadowRoot;
    const src = shadow?.querySelector(`[data-layer-id="${child}"]`);
    const dst = shadow?.querySelector(`[data-layer-id="${parent}"]`);
    if (src === undefined || src === null || dst === undefined || dst === null) {
      throw new Error(`missing layer rows for drag ${child} -> ${parent}`);
    }
    src.dispatchEvent(new DragEvent("dragstart", { bubbles: true, cancelable: true }));
    dst.dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true }));
    dst.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true }));
    src.dispatchEvent(new DragEvent("dragend", { bubbles: true, cancelable: true }));
  }, [childId, parentId] as string[]);
}

export async function getLayerMasks(page: import("@playwright/test").Page): Promise<Array<{ id: string; isMask: boolean }>> {
  return page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getLayers(): Array<{ id: string; isMask: boolean }> } };
    };
    return root.__gnumarus?.engine?.getLayers().map((layer) => ({ id: layer.id, isMask: layer.isMask })) ?? [];
  });
}

export async function expectPreviewCenter(page: import("@playwright/test").Page, expected: string): Promise<void> {
  const preview = page.locator('gnumarus-shell [data-testid="final-preview"]');
  await expect(preview).toBeVisible();
  const canvas = page.locator("gnumarus-shell canvas#previewCanvas");
  await expect(canvas).toBeVisible();
  await expect
    .poll(
      async () => {
        const value: unknown = await canvas.evaluate((element: HTMLCanvasElement) => {
          const context = element.getContext("2d");
          if (context === null) {
            return null;
          }
          const data = context.getImageData(32, 32, 1, 1).data;
          return `${data[0]},${data[1]},${data[2]},${data[3]}`;
        });
        return value;
      },
      { timeout: 10000 },
    )
    .toBe(expected);
}

export async function canvasCenterPixel(page: import("@playwright/test").Page): Promise<string> {
  const value: unknown = await page.evaluate(() => {
    const shell = document.querySelector("gnumarus-shell");
    const canvas = shell?.shadowRoot?.querySelector("canvas") as HTMLCanvasElement | null;
    const engine = (window as unknown as { __gnumarus?: { engine?: unknown } }).__gnumarus?.engine as unknown as
      | { render(): void }
      | undefined;
    if (canvas === null || canvas === undefined || engine === undefined) {
      return null;
    }
    // Same-task render + readback: valid without preserveDrawingBuffer.
    engine.render();
    const gl = canvas.getContext("webgl2");
    if (gl === null) {
      return null;
    }
    const pixel = new Uint8Array(4);
    gl.readPixels(
      Math.floor(canvas.width / 2),
      Math.floor(canvas.height / 2),
      1,
      1,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      pixel,
    );
    return `${pixel[0]},${pixel[1]},${pixel[2]},${pixel[3]}`;
  });
  if (typeof value !== "string") {
    throw new Error("canvas pixel is missing");
  }
  return value;
}

export async function stubFsProjectDir(
  page: import("@playwright/test").Page,
  dirName: string,
  seed: Record<string, number[]>,
): Promise<{
  dirs: () => Promise<string[]>;
  files: () => Promise<string[]>;
  seedFile: (path: string, bytes: number[]) => Promise<void>;
}> {
  await page.evaluate(
    ({ dir, seedFiles }: { dir: string; seedFiles: Record<string, number[]> }) => {
      const files = new Map<string, Blob>();
      for (const [path, bytes] of Object.entries(seedFiles)) {
        files.set(path, new Blob([new Uint8Array(bytes)]));
      }
      const knownDirs = new Set<string>();
      const makeFileHandle = (path: string): unknown => ({
        getFile: async (): Promise<Blob> => {
          const found = files.get(path);
          if (found === undefined) {
            throw new DOMException("File not found", "NotFoundError");
          }
          return found;
        },
        createWritable: async () => ({
          write: async (data: string | Blob): Promise<void> => {
            files.set(path, data instanceof Blob ? data : new Blob([data]));
          },
          close: async (): Promise<void> => {},
        }),
      });
      const makeDir = (prefix: string): unknown => ({
        name: prefix === "" ? dir : prefix.split("/").pop(),
        getFileHandle: async (name: string, options?: { create?: boolean }): Promise<unknown> => {
          const path = prefix === "" ? name : `${prefix}/${name}`;
          if (!files.has(path)) {
            if (options?.create !== true) {
              throw new DOMException("File not found", "NotFoundError");
            }
            files.set(path, new Blob([]));
          }
          return makeFileHandle(path);
        },
        getDirectoryHandle: async (name: string, options?: { create?: boolean }): Promise<unknown> => {
          const path = prefix === "" ? name : `${prefix}/${name}`;
          const has = [...files.keys()].some((key) => key === path || key.startsWith(`${path}/`));
          if (!has && !knownDirs.has(path)) {
            if (options?.create !== true) {
              throw new DOMException("File not found", "NotFoundError");
            }
            knownDirs.add(path);
          } else {
            knownDirs.add(path);
          }
          return makeDir(path);
        },
        removeEntry: async (name: string): Promise<void> => {
          const path = prefix === "" ? name : `${prefix}/${name}`;
          let removed = files.delete(path);
          for (const key of [...files.keys()]) {
            if (key === path || key.startsWith(`${path}/`)) {
              files.delete(key);
              removed = true;
            }
          }
          if (!removed) {
            throw new DOMException("File not found", "NotFoundError");
          }
        },
        values: async function* (): AsyncIterable<{ kind: string; name: string }> {
          const seen = new Set<string>();
          for (const key of files.keys()) {
            const leaf = prefix === "" ? key : key.startsWith(`${prefix}/`) ? key.slice(prefix.length + 1) : null;
            if (leaf === null || leaf.includes("/")) {
              continue;
            }
            if (!seen.has(leaf)) {
              seen.add(leaf);
              yield { kind: "file", name: leaf };
            }
          }
          const subs = new Set<string>();
          const collect = (key: string): void => {
            const rest = prefix === "" ? key : key.slice(prefix.length + 1);
            const slash = rest.indexOf("/");
            if (slash >= 0) {
              subs.add(rest.slice(0, slash));
            }
          };
          for (const key of files.keys()) {
            if (prefix === "" || key.startsWith(`${prefix}/`)) {
              collect(key);
            }
          }
          for (const known of knownDirs) {
            if (prefix === "") {
              if (!known.includes("/")) {
                subs.add(known);
              }
            } else if (known.startsWith(`${prefix}/`)) {
              const rest = known.slice(prefix.length + 1);
              if (rest !== "" && !rest.includes("/")) {
                subs.add(rest);
              }
            }
          }
          for (const name of subs) {
            yield { kind: "directory", name };
          }
        },
      });
      const root = window as unknown as {
        showDirectoryPicker?: () => Promise<unknown>;
        __gnumarusFsDiscoveryTest?: { files: Map<string, Blob>; knownDirs: Set<string> };
      };
      root.showDirectoryPicker = async (): Promise<unknown> => makeDir("");
      root.__gnumarusFsDiscoveryTest = { files, knownDirs };
    },
    { dir: dirName, seedFiles: seed },
  );
  return {
    dirs: (): Promise<string[]> =>
      page.evaluate(() => {
        const root = window as unknown as { __gnumarusFsDiscoveryTest?: { knownDirs: Set<string> } };
        return [...(root.__gnumarusFsDiscoveryTest?.knownDirs ?? [])];
      }),
    files: (): Promise<string[]> =>
      page.evaluate(() => {
        const root = window as unknown as { __gnumarusFsDiscoveryTest?: { files: Map<string, Blob> } };
        return [...(root.__gnumarusFsDiscoveryTest?.files.keys() ?? [])].sort();
      }),
    seedFile: (path: string, bytes: number[]): Promise<void> =>
      page.evaluate(
        ([filePath, content]: [string, number[]]) => {
          const root = window as unknown as { __gnumarusFsDiscoveryTest?: { files: Map<string, Blob> } };
          root.__gnumarusFsDiscoveryTest?.files.set(filePath, new Blob([new Uint8Array(content)]));
        },
        [path, bytes] as [string, number[]],
      ),
  };
}

export async function getSvgSource(page: import("@playwright/test").Page, svgId: string): Promise<string | null> {
  return page.evaluate((id: string) => {
    const engine = (window as unknown as { __gnumarus?: { engine?: unknown } }).__gnumarus?.engine as unknown as
      | { svgs: Map<string, { svg: string }> }
      | undefined;
    return engine?.svgs.get(id)?.svg ?? null;
  }, svgId);
}

export async function getModelBytes(page: import("@playwright/test").Page, modelId: string): Promise<number[] | null> {
  return page.evaluate((id: string) => {
    const engine = (window as unknown as { __gnumarus?: { engine?: unknown } }).__gnumarus?.engine as unknown as
      | { models3d: Map<string, { bytes: Uint8Array }> }
      | undefined;
    const bytes = engine?.models3d.get(id)?.bytes;
    return bytes === undefined ? null : Array.from(bytes);
  }, modelId);
}

export async function forceNoFileSystemApi(page: import("@playwright/test").Page): Promise<void> {
  await page.evaluate(() => {
    const shell = document.querySelector("gnumarus-shell") as unknown as {
      fsSupported: boolean;
    } | null;
    if (shell === null) {
      throw new Error("shell is missing");
    }
    shell.fsSupported = false;
  });
}

export async function removeEmbeddedProject(page: import("@playwright/test").Page, name: string): Promise<void> {
  await page.evaluate(async (project: string) => {
    const root = await navigator.storage.getDirectory();
    await root.removeEntry(project, { recursive: true });
  }, name);
}

export async function saveEmbeddedAs(page: import("@playwright/test").Page, name: string): Promise<void> {
  await page.keyboard.press("Control+Shift+P");
  const palette = page.locator("gnumarus-shell dialog#actionPaletteDialog");
  await expect(palette).toBeVisible();
  await palette.locator('[data-testid="action-palette-input"]').fill("save embedded project as");
  await page.keyboard.press("Enter");
  await expect(palette).toBeHidden();
  const dialog = page.locator("gnumarus-shell dialog#embeddedSaveDialog");
  await expect(dialog).toBeVisible();
  await dialog.locator("#embeddedSaveName").fill(name);
  await dialog.locator('[data-testid="embedded-save-confirm"]').click();
}
