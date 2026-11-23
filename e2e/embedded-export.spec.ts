import { expect, test } from "@playwright/test";
import { unzipSync } from "fflate";
import { createHelloText, forceNoFileSystemApi, getModelBytes, getSvgSource, loadBlankProject, paintCenter, readPixel, removeEmbeddedProject, runPaletteAction, saveEmbeddedAs, setBrushColor, stubDirectoryWithFileStore, stubFsProjectDir, stubSaveFilePicker, textHtml } from "./e2e-helpers";

test("saving a project creates every content directory even when empty @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const fs = await stubFsProjectDir(page, "MockProject", {});
  await loadBlankProject(page, 64);
  await page.keyboard.press("Control+s");
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  const dirs = await fs.dirs();
  for (const expected of ["textures", "texts", "svgs", "3dmodels"]) {
    expect(dirs).toContain(expected);
  }
});

test("content manager discovers only correctly-typed files and imports them @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const redPng = [
    137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0,
    0, 144, 119, 83, 222, 0, 0, 0, 12, 73, 68, 65, 84, 120, 156, 99, 248, 207, 192, 0, 0, 3, 1, 1, 0,
    201, 254, 146, 239, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
  ];
  const packedZip = [
    80, 75, 3, 4, 20, 0, 0, 0, 8, 0, 160, 188, 110, 93, 127, 225, 81, 134, 16, 0, 0, 0, 17, 0, 0, 0,
    11, 0, 0, 0, 112, 97, 99, 107, 101, 100, 46, 104, 116, 109, 108, 179, 73, 201, 44, 179, 11, 72, 76,
    206, 78, 77, 177, 209, 7, 177, 1, 80, 75, 1, 2, 20, 3, 20, 0, 0, 0, 8, 0, 160, 188, 110, 93, 127,
    225, 81, 134, 16, 0, 0, 0, 17, 0, 0, 0, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 128, 1, 0, 0, 0, 0,
    112, 97, 99, 107, 101, 100, 46, 104, 116, 109, 108, 80, 75, 5, 6, 0, 0, 0, 0, 1, 0, 1, 0, 57, 0,
    0, 0, 57, 0, 0, 0, 0, 0,
  ];
  const fs = await stubFsProjectDir(page, "MockProject", {
    "textures/extra.png": redPng,
    "textures/notes.txt": [110, 111, 116, 101],
    "textures/x.alpha.jpg": [1, 2, 3],
    "svgs/note.png": [4, 5, 6],
    "svgs/art.svg": [
      60, 115, 118, 103, 32, 120, 109, 108, 110, 115, 61, 34, 104, 116, 116, 112, 58, 47, 47, 119, 119,
      119, 46, 119, 51, 46, 111, 114, 103, 47, 50, 48, 48, 48, 47, 115, 118, 103, 34, 32, 119, 105, 100,
      116, 104, 61, 34, 52, 34, 32, 104, 101, 105, 103, 104, 116, 61, 34, 52, 34, 62, 60, 47, 115, 118,
      103, 62,
    ],
    "texts/doc.html": [60, 100, 105, 118, 62, 68, 111, 99, 60, 47, 100, 105, 118, 62],
    "texts/packed.zip": packedZip,
    "3dmodels/part.obj": [111, 32, 112, 97, 114, 116, 10, 118, 32, 48, 32, 48, 32, 49, 10],
    "3dmodels/junk.png": [7, 8, 9],
  });
  await loadBlankProject(page, 64);
  await page.keyboard.press("Control+s");
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockProject");
  await page.getByRole("button", { name: "File" }).click();
  await page.getByRole("button", { name: "Content manager" }).click();
  const dialog = page.locator("gnumarus-shell dialog#contentManagerDialog");
  await expect(dialog).toBeVisible();
  const discovered = dialog.locator('[data-testid="content-manager-discovered-item"]');
  await expect(discovered).toHaveCount(5);
  const listed = await discovered.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-file")),
  );
  expect(listed).toEqual([
    "3dmodels/part.obj",
    "svgs/art.svg",
    "texts/doc.html",
    "texts/packed.zip",
    "textures/extra.png",
  ]);
  const managerCounts = (): Promise<{ textures: number; texts: number; svgs: number; models: number }> =>
    page.evaluate(() => {
      const engine = (window as unknown as { __gnumarus?: { engine?: unknown } }).__gnumarus?.engine as unknown as
        | { getContentManagerData(): { textures: unknown[]; texts: unknown[]; svgs: unknown[]; models: unknown[] } }
        | undefined;
      const data = engine?.getContentManagerData();
      return {
        textures: data?.textures.length ?? -1,
        texts: data?.texts.length ?? -1,
        svgs: data?.svgs.length ?? -1,
        models: data?.models.length ?? -1,
      };
    });
  await expect.poll(managerCounts).toEqual({ textures: 0, texts: 0, svgs: 0, models: 0 });
  const importFile = async (file: string): Promise<void> => {
    await dialog.locator(`[data-testid="content-manager-discovered-import"][data-file="${file}"]`).click();
  };
  await importFile("textures/extra.png");
  await expect.poll(managerCounts).toEqual({ textures: 1, texts: 0, svgs: 0, models: 0 });
  await expect(page.locator("gnumarus-shell")).toContainText('Imported "extra"');
  await importFile("texts/doc.html");
  await importFile("texts/packed.zip");
  await importFile("svgs/art.svg");
  await importFile("3dmodels/part.obj");
  await expect.poll(managerCounts).toEqual({ textures: 1, texts: 2, svgs: 1, models: 1 });
  await expect(dialog.locator('[data-testid="content-manager-discovered-item"]')).toHaveCount(0);
  expect(await fs.files()).toContain("project.gpa");
});

test("reload all contents reprocesses texts, vectors and models, not textures @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  const textId = await createHelloText(page);
  await page.getByRole("button", { name: "Add layer" }).click();
  await page.getByRole("button", { name: "Brush", exact: true }).click();
  await paintCenter(page);
  const svgId = await page.evaluate(() => {
    const engine = (window as unknown as { __gnumarus?: { engine?: unknown } }).__gnumarus?.engine as unknown as
      | { createSvgEntry(svg: string): string }
      | undefined;
    return engine?.createSvgEntry('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"></svg>');
  });
  expect(typeof svgId).toBe("string");
  const modelId = await page.evaluate(() => {
    const engine = (window as unknown as { __gnumarus?: { engine?: unknown } }).__gnumarus?.engine as unknown as
      | { registerModel3d(name: string, ext: string, bytes: Uint8Array): string | null }
      | undefined;
    return engine?.registerModel3d("Part", "obj", new Uint8Array([111, 32, 112, 10]));
  });
  expect(typeof modelId).toBe("string");
  await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { shell?: { setProjectStorage(l: boolean, q: number, f?: string, p?: number, j?: number, b?: number, pf?: string, t?: string, s?: string): void } };
    };
    root.__gnumarus?.shell?.setProjectStorage(true, 50, "jxl", 9, 95, 90, "gpa", "html", "raw");
  });
  await stubDirectoryWithFileStore(page);
  await page.keyboard.press("Control+s");
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to MockDir");
  // External edits: new text, new vector, new model bytes, plus garbage in a texture file.
  const savedTexture = await page.evaluate(() => {
    const root = window as unknown as { __gnumarusDirTest?: { files: Record<string, Blob> } };
    return Object.keys(root.__gnumarusDirTest?.files ?? {}).find((path) => path.startsWith("textures/")) ?? null;
  });
  expect(typeof savedTexture).toBe("string");
  await page.evaluate(
    ([textPath, svgPath, modelPath, texturePath]: string[]) => {
      const root = window as unknown as { __gnumarusDirTest?: { files: Record<string, Blob> } };
      const files = root.__gnumarusDirTest?.files;
      if (files === undefined) {
        throw new Error("mock dir is missing");
      }
      files[textPath] = new Blob(["<div>Edited</div>"], { type: "text/html" });
      files[svgPath] = new Blob(['<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8"/></svg>'], { type: "image/svg+xml" });
      files[modelPath] = new Blob([new Uint8Array([111, 32, 113, 10, 118, 32, 49, 10])]);
      files[texturePath] = new Blob([new Uint8Array([9, 9, 9])]);
    },
    [`texts/${textId}.html`, `svgs/${svgId}.svg`, `3dmodels/${modelId}.obj`, savedTexture as string] as string[],
  );
  await runPaletteAction(page, "reload all contents");
  await expect(page.locator("gnumarus-shell")).toContainText('Reloaded 3 contents');
  expect(await textHtml(page, textId as string)).toContain("Edited");
  expect(await getSvgSource(page, svgId as string)).toContain("<rect");
  expect(await getModelBytes(page, modelId as string)).toEqual([111, 32, 113, 10, 118, 32, 49, 10]);
  // The painted texture is untouched even though its file is now garbage.
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  // Deleting a file turns its entry into a skip on the next run.
  await page.evaluate((textPath: string) => {
    const root = window as unknown as { __gnumarusDirTest?: { files: Record<string, Blob> } };
    delete root.__gnumarusDirTest?.files[textPath];
  }, `texts/${textId}.html`);
  await runPaletteAction(page, "reload all contents");
  await expect(page.locator("gnumarus-shell")).toContainText("Reloaded 2 contents (1 skipped)");
});

test("reload all contents without a saved project shows an error toast @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await runPaletteAction(page, "reload all contents");
  await expect(page.locator("gnumarus-shell")).toContainText("Reload contents failed: the project has not been saved yet");
});

test("embedded file menu replaces native items without File System Access API @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await forceNoFileSystemApi(page);
  await page.getByRole("button", { name: "File" }).click();
  const menu = page.locator("gnumarus-shell .dropdown");
  await expect(menu.getByRole("button", { name: "New Project" })).toBeVisible();
  await expect(menu.getByRole("button", { name: "Upload project" })).toBeVisible();
  await expect(menu.getByRole("button", { name: "Open embedded project" })).toBeVisible();
  await expect(menu.getByRole("button", { name: "Save embedded project", exact: true })).toBeVisible();
  await expect(menu.getByRole("button", { name: "Save embedded project as" })).toBeVisible();
  await expect(menu.getByRole("button", { name: "Open Project", exact: true })).toHaveCount(0);
  await expect(menu.getByRole("button", { name: "Save Project", exact: true })).toHaveCount(0);
  await expect(menu.getByRole("button", { name: "Save project as", exact: true })).toHaveCount(0);
});

test("embedded save-as, save and open round-trip pixels @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await forceNoFileSystemApi(page);
  await paintCenter(page);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  await saveEmbeddedAs(page, "RoundTrip");
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to RoundTrip");
  // Paint more, then Ctrl+S must save into the same embedded project.
  await setBrushColor(page, "#ff0000");
  await paintCenter(page);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  await page.keyboard.press("Control+s");
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to RoundTrip");
  // Fresh canvas, then reopen from OPFS: the red dot comes back.
  await loadBlankProject(page, 64);
  expect(await readPixel(page, 32, 32)).toBeNull();
  await page.keyboard.press("Control+Shift+P");
  const palette = page.locator("gnumarus-shell dialog#actionPaletteDialog");
  await expect(palette).toBeVisible();
  await palette.locator('[data-testid="action-palette-input"]').fill("open embedded project");
  await page.keyboard.press("Enter");
  await expect(palette).toBeHidden();
  const dialog = page.locator("gnumarus-shell dialog#embeddedOpenDialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("RoundTrip");
  await dialog.getByText("RoundTrip", { exact: true }).click();
  await dialog.locator('[data-testid="embedded-open-confirm"]').click();
  await expect(page.locator("gnumarus-shell")).toContainText("Opened RoundTrip");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  await removeEmbeddedProject(page, "RoundTrip");
});

test("embedded save-as rejects duplicate project names @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await forceNoFileSystemApi(page);
  await saveEmbeddedAs(page, "DupName");
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to DupName");
  await saveEmbeddedAs(page, "DupName");
  const dialog = page.locator("gnumarus-shell dialog#embeddedSaveDialog");
  await expect(dialog).toContainText('Project "DupName" already exists');
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await removeEmbeddedProject(page, "DupName");
});

test("embedded upload unpacks a .gpp and opens it @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await forceNoFileSystemApi(page);
  await setBrushColor(page, "#00ff00");
  await paintCenter(page);
  await saveEmbeddedAs(page, "UpSrc");
  await expect(page.locator("gnumarus-shell")).toContainText("Saved to UpSrc");
  // Collect the saved OPFS files, repackage them as UpSrc/... and wipe the project.
  const entries = await page.evaluate(async () => {
    const out: Array<{ path: string; data: string }> = [];
    const encode = (buffer: ArrayBuffer): string => {
      const bytes = new Uint8Array(buffer);
      let text = "";
      for (let i = 0; i < bytes.length; i += 0x8000) {
        text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      }
      return btoa(text);
    };
    const walk = async (dir: FileSystemDirectoryHandle, prefix: string): Promise<void> => {
      for await (const entry of dir.values()) {
        if (entry.kind === "file") {
          const handle = await dir.getFileHandle(entry.name);
          const buffer = await (await handle.getFile()).arrayBuffer();
          out.push({ path: `${prefix}${entry.name}`, data: encode(buffer) });
        } else if (entry.kind === "directory") {
          await walk(await dir.getDirectoryHandle(entry.name), `${prefix}${entry.name}/`);
        }
      }
    };
    const root = await navigator.storage.getDirectory();
    await walk(await root.getDirectoryHandle("UpSrc"), "");
    return out;
  });
  expect(entries.length).toBeGreaterThan(0);
  expect(entries.some((entry) => entry.path === "project.gpa" || entry.path === "project.json")).toBe(true);
  const packaged = await page.evaluate((files: Array<{ path: string; data: string }>) => {
    const shell = document.querySelector("gnumarus-shell") as unknown as {
      zipTestEntries(entries: Array<{ path: string; data: string }>): string;
    } | null;
    if (shell === null) {
      throw new Error("shell is missing");
    }
    return shell.zipTestEntries(files.map((file) => ({ path: `UpSrc/${file.path}`, data: file.data })));
  }, entries);
  await removeEmbeddedProject(page, "UpSrc");
  await loadBlankProject(page, 64);
  expect(await readPixel(page, 32, 32)).toBeNull();
  // Feed the package through the real hidden file input (same path as the OS picker).
  await page.evaluate((payload: string) => {
    const shell = document.querySelector("gnumarus-shell") as unknown as HTMLElement | null;
    const input = shell?.shadowRoot?.getElementById("gppUpload") as HTMLInputElement | null;
    if (input === null || input === undefined) {
      throw new Error("upload input is missing");
    }
    const bin = atob(payload);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) {
      bytes[i] = bin.charCodeAt(i);
    }
    const file = new File([bytes as Uint8Array<ArrayBuffer>], "UpSrc.gpp", { type: "application/zip" });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, packaged);
  await expect(page.locator("gnumarus-shell")).toContainText("Opened UpSrc");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 255, b: 0, a: 255 });
  await removeEmbeddedProject(page, "UpSrc");
});

test("export full project downloads a .gpp that re-uploads @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintCenter(page);
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  await stubSaveFilePicker(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.locator("gnumarus-shell .menubar .dropdown").getByRole("button", { name: "Export" }).click();
  const dialog = page.locator("gnumarus-shell dialog#exportDialog");
  await expect(dialog).toBeVisible();
  await dialog.locator('[data-testid="export-tab-full"]').click();
  await dialog.locator("#exportFullProjectOk").click();
  await expect(page.locator("gnumarus-shell")).toContainText("Exported Untitled.gpp");
  const packaged = await page.evaluate(() => {
    const root = window as unknown as { __gnumarusExportTest?: { fileName: string | null; blob: Blob | null } };
    const state = root.__gnumarusExportTest;
    if (state?.blob == null) {
      throw new Error("no exported blob captured");
    }
    if (state.fileName !== "Untitled.gpp") {
      throw new Error(`unexpected file name: ${state.fileName}`);
    }
    return state.blob.arrayBuffer().then((buffer) => {
      const bytes = new Uint8Array(buffer);
      let text = "";
      for (let i = 0; i < bytes.length; i += 0x8000) {
        text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      }
      return btoa(text);
    });
  });
  const bin = atob(packaged);
  const zipped = Uint8Array.from(bin, (char) => char.charCodeAt(0));
  const raw: Record<string, Uint8Array> = {};
  for (const [name, data] of Object.entries(unzipSync(zipped))) {
    raw[name] = data as Uint8Array;
  }
  const names = Object.keys(raw).filter((name) => !name.endsWith("/"));
  expect(names.length).toBeGreaterThan(0);
  const roots = new Set(names.map((name) => name.split("/")[0]));
  expect([...roots]).toEqual(["Untitled"]);
  expect(names.some((name) => name === "Untitled/project.gpa" || name === "Untitled/project.json")).toBe(true);
  expect(names.some((name) => name.startsWith("Untitled/textures/"))).toBe(true);
  // The package must import through the same path as File > Upload project.
  await loadBlankProject(page, 64);
  expect(await readPixel(page, 32, 32)).toBeNull();
  await page.evaluate((payload: string) => {
    const shell = document.querySelector("gnumarus-shell") as unknown as HTMLElement | null;
    const input = shell?.shadowRoot?.getElementById("gppUpload") as HTMLInputElement | null;
    if (input === null || input === undefined) {
      throw new Error("upload input is missing");
    }
    const bin = atob(payload);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) {
      bytes[i] = bin.charCodeAt(i);
    }
    const file = new File([bytes as Uint8Array<ArrayBuffer>], "Untitled.gpp", { type: "application/zip" });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, packaged);
  await expect(page.locator("gnumarus-shell")).toContainText("Opened Untitled");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  await removeEmbeddedProject(page, "Untitled");
});

test("export dialog tabs isolate sections with per-tab actions @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintCenter(page);
  await stubSaveFilePicker(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.locator("gnumarus-shell .menubar .dropdown").getByRole("button", { name: "Export" }).click();
  const dialog = page.locator("gnumarus-shell dialog#exportDialog");
  await expect(dialog).toBeVisible();
  const tabs = dialog.locator('[role="tab"]');
  await expect(tabs).toHaveText(["Export frame", "Export animation", "Export spritesheet", "Export full project"]);
  const panelOf = (buttonId: string): import("@playwright/test").Locator =>
    dialog.locator(`#${buttonId}`).locator("xpath=ancestor::section[1]");
  // Frame tab is active on open; other panels are hidden.
  await expect(dialog.locator("#exportFrame")).toBeVisible();
  await expect(dialog.locator("#exportAnimation")).toBeHidden();
  await expect(dialog.locator("#exportSheetLayout")).toBeHidden();
  await expect(dialog.locator("#exportFullProjectOk")).toBeHidden();
  await expect(panelOf("exportOk").getByRole("button", { name: "Cancel" })).toBeVisible();
  await expect(dialog.locator("#exportOk")).toHaveText("Export frame");
  // Animation tab.
  await dialog.locator('[data-testid="export-tab-animation"]').click();
  await expect(dialog.locator("#exportFrame")).toBeHidden();
  await expect(dialog.locator("#exportAnimation")).toBeVisible();
  await expect(panelOf("exportAnimatedOk").getByRole("button", { name: "Cancel" })).toBeVisible();
  await expect(dialog.locator("#exportAnimatedOk")).toHaveText("Export animation");
  // Spritesheet tab.
  await dialog.locator('[data-testid="export-tab-sheet"]').click();
  await expect(dialog.locator("#exportSheetLayout")).toBeVisible();
  await expect(dialog.locator("#exportAnimation")).toBeHidden();
  await expect(panelOf("exportSheetOk").getByRole("button", { name: "Cancel" })).toBeVisible();
  await expect(dialog.locator("#exportSheetOk")).toHaveText("Export spritesheet");
  // Full project tab explains the .gpp and exports from there.
  await dialog.locator('[data-testid="export-tab-full"]').click();
  await expect(dialog.locator("#exportSheetLayout")).toBeHidden();
  await expect(dialog).toContainText("re-importable via Upload project");
  await expect(panelOf("exportFullProjectOk").getByRole("button", { name: "Cancel" })).toBeVisible();
  await dialog.locator("#exportFullProjectOk").click();
  await expect(page.locator("gnumarus-shell")).toContainText("Exported Untitled.gpp");
});

test("export dialog tabs and fields all carry tooltips @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await page.getByRole("button", { name: "File" }).click();
  await page.locator("gnumarus-shell .menubar .dropdown").getByRole("button", { name: "Export" }).click();
  const dialog = page.locator("gnumarus-shell dialog#exportDialog");
  await expect(dialog).toBeVisible();
  const labelOf = (id: string): import("@playwright/test").Locator =>
    dialog.locator(`#${id}`).locator("xpath=ancestor::label[1]");
  // Tab buttons.
  await expect(dialog.locator('[data-testid="export-tab-frame"]')).toHaveAttribute("title", /.+/);
  await expect(dialog.locator('[data-testid="export-tab-animation"]')).toHaveAttribute("title", /.+/);
  await expect(dialog.locator('[data-testid="export-tab-sheet"]')).toHaveAttribute("title", /.+/);
  await expect(dialog.locator('[data-testid="export-tab-full"]')).toHaveAttribute("title", /.+/);
  await expect(dialog.locator('[data-testid="export-tab-frame"]')).toHaveAttribute("title", /single frame/);
  // Frame tab fields (defaults: PNG still, so switch formats to reveal quality/lossless).
  await expect(labelOf("exportFrame")).toHaveAttribute("title", /1-based/);
  await expect(labelOf("exportFormat")).toHaveAttribute("title", /format/);
  await dialog.locator("#exportFormat").selectOption("image/jpeg");
  await expect(labelOf("exportQuality")).toHaveAttribute("title", /1\.\.100/);
  // Animation tab fields.
  await dialog.locator('[data-testid="export-tab-animation"]').click();
  await expect(labelOf("exportAnimation")).toHaveAttribute("title", /all frames/);
  await expect(labelOf("exportAnimatedFormat")).toHaveAttribute("title", /format/);
  await dialog.locator("#exportAnimatedFormat").selectOption("image/jpeg");
  await expect(labelOf("exportAnimatedQuality")).toHaveAttribute("title", /1\.\.100/);
  await dialog.locator("#exportAnimatedFormat").selectOption("jxl");
  await expect(labelOf("exportAnimatedLossless")).toHaveAttribute("title", /loss/);
  // Spritesheet tab fields.
  await dialog.locator('[data-testid="export-tab-sheet"]').click();
  await expect(dialog.locator(".export-sheet-animations")).toHaveAttribute("title", /include/);
  await expect(labelOf("exportSheetAll")).toHaveAttribute("title", /every project frame/);
  await expect(labelOf("exportSheetFrames")).toHaveAttribute("title", /append/);
  await expect(labelOf("exportSheetLayout")).toHaveAttribute("title", /arranged/);
  await expect(labelOf("exportSheetCount")).toBeHidden();
  await dialog.locator("#exportSheetLayout").selectOption("fixed-rows");
  await expect(labelOf("exportSheetCount")).toBeVisible();
  await expect(labelOf("exportSheetCount")).toHaveAttribute("title", /grid/);
  await dialog.locator("#exportSheetLayout").selectOption("fixed-cols");
  await expect(labelOf("exportSheetCount")).toBeVisible();
  await dialog.locator("#exportSheetLayout").selectOption("line");
  await expect(labelOf("exportSheetCount")).toBeHidden();
  await expect(labelOf("exportSheetFormat")).toHaveAttribute("title", /format/);
  await dialog.locator("#exportSheetFormat").selectOption("image/jpeg");
  await expect(labelOf("exportSheetQuality")).toHaveAttribute("title", /1\.\.100/);
});

test("export lossless is one shared flag and sequences offer it too @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintCenter(page);
  await stubSaveFilePicker(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.locator("gnumarus-shell .menubar .dropdown").getByRole("button", { name: "Export" }).click();
  const dialog = page.locator("gnumarus-shell dialog#exportDialog");
  await expect(dialog).toBeVisible();
  const labelOf = (id: string): import("@playwright/test").Locator =>
    dialog.locator(`#${id}`).locator("xpath=ancestor::label[1]");
  // Frame tab: uncheck under WebP, switch to JXL -> still unchecked, quality stays.
  await dialog.locator("#exportFormat").selectOption("image/webp");
  await dialog.locator("#exportLossless").uncheck();
  await expect(labelOf("exportQuality")).toBeVisible();
  await dialog.locator("#exportFormat").selectOption("image/jxl");
  await expect(dialog.locator("#exportLossless")).not.toBeChecked();
  await expect(labelOf("exportQuality")).toBeVisible();
  await dialog.locator("#exportLossless").check();
  await expect(labelOf("exportQuality")).toBeHidden();
  // Animation tab: WebP sequence offers lossless too.
  await dialog.locator('[data-testid="export-tab-animation"]').click();
  await dialog.locator("#exportAnimatedFormat").selectOption("image/webp");
  await expect(dialog.locator("#exportAnimatedLossless")).toBeChecked();
  await expect(labelOf("exportAnimatedQuality")).toBeHidden();
  await dialog.locator("#exportAnimatedLossless").uncheck();
  await expect(labelOf("exportAnimatedQuality")).toBeVisible();
  await dialog.locator("#exportAnimatedFormat").selectOption("image/jxl");
  await expect(dialog.locator("#exportAnimatedLossless")).not.toBeChecked();
  await expect(labelOf("exportAnimatedQuality")).toBeVisible();
  // Sheet tab: same shared flag as the frame tab.
  await dialog.locator('[data-testid="export-tab-sheet"]').click();
  await dialog.locator("#exportSheetFormat").selectOption("image/webp");
  await dialog.locator("#exportSheetLossless").uncheck();
  await dialog.locator("#exportSheetFormat").selectOption("image/jxl");
  await expect(dialog.locator("#exportSheetLossless")).not.toBeChecked();
  await expect(labelOf("exportSheetQuality")).toBeVisible();
  // Lossy JXL still exports fine from the shared flag path.
  await dialog.locator('[data-testid="export-tab-frame"]').click();
  await dialog.locator("#exportFormat").selectOption("image/jxl");
  await expect(dialog.locator("#exportLossless")).toBeChecked();
  await dialog.locator("#exportOk").click();
  await expect(page.locator("gnumarus-shell")).toContainText("Exported");
});
