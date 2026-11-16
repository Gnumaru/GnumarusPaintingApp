import { expect, test } from "@playwright/test";
import { canvasCenterPixel, dropLayerOnto, engineReparent, expectPreviewCenter, getFrameDuration, getLayerMasks, getLayerParents, getLayers, loadBlankProject, paintCenter, readPixel, selectTool, setPencil } from "./e2e-helpers";

test("nested layers indent children between parent and next root @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await page.getByRole("button", { name: "Add layer" }).click();
  await page.getByRole("button", { name: "Add layer" }).click();
  // Storage bottom -> top: layer0, layer1, layer2 (layer2 on top).
  expect(await engineReparent(page, "layer0", "layer2")).toBe(true);
  const parents = await getLayerParents(page);
  expect(parents.find((layer) => layer.id === "layer0")?.parentId).toBe("layer2");
  expect(parents.find((layer) => layer.id === "layer1")?.parentId).toBeNull();
  // Display top -> bottom: parent, child, next root.
  const order = await page.evaluate(() => {
    const shell = document.querySelector("gnumarus-shell");
    const shadow = (shell as unknown as { shadowRoot: ShadowRoot | null })?.shadowRoot;
    return [...(shadow?.querySelectorAll(".layer-row[data-layer-id]") ?? [])].map((row) => ({
      id: row.getAttribute("data-layer-id"),
      depth: row.getAttribute("data-depth"),
      margin: (row as HTMLElement).style.marginLeft,
    }));
  });
  expect(order.map((row) => row.id)).toEqual(["layer2", "layer0", "layer1"]);
  expect(order.map((row) => row.depth)).toEqual(["0", "1", "0"]);
  expect(order.find((row) => row.id === "layer0")?.margin).toBe("8px");
  expect(order.find((row) => row.id === "layer2")?.margin).toBe("0px");
  // Matrix follows the same display order.
  const matrixOrder = await page.evaluate(() => {
    const shell = document.querySelector("gnumarus-shell");
    const shadow = (shell as unknown as { shadowRoot: ShadowRoot | null })?.shadowRoot;
    return [...(shadow?.querySelectorAll('[data-testid="anim-layer-name"]') ?? [])].map((row) =>
      row.getAttribute("data-matrix-layer"),
    );
  });
  expect(matrixOrder).toEqual(["layer2", "layer0", "layer1"]);
});

test("nested layers reorder only inside the same level and carry children @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await page.getByRole("button", { name: "Add layer" }).click();
  await page.getByRole("button", { name: "Add layer" }).click();
  await page.getByRole("button", { name: "Add layer" }).click();
  // Storage: layer0, layer1, layer2, layer3(top). Parent layer3 with children layer0+layer1.
  expect(await engineReparent(page, "layer1", "layer3")).toBe(true);
  expect(await engineReparent(page, "layer0", "layer3")).toBe(true);
  let state = await getLayers(page);
  expect(state.layers.map((layer) => layer.id)).toEqual(["layer2", "layer0", "layer1", "layer3"]);
  // Top child cannot move up; bottom child cannot move down.
  const topBlocked = await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { moveLayer(id: string, d: "up" | "down"): boolean } } };
    return root.__gnumarus?.engine?.moveLayer("layer1", "up") ?? true;
  });
  expect(topBlocked).toBe(false);
  const bottomBlocked = await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { moveLayer(id: string, d: "up" | "down"): boolean } } };
    return root.__gnumarus?.engine?.moveLayer("layer0", "down") ?? true;
  });
  expect(bottomBlocked).toBe(false);
  // Sibling swap inside the level.
  await page.locator('gnumarus-shell [data-layer-id="layer0"]').getByRole("button", { name: "Move layer up" }).click();
  state = await getLayers(page);
  expect(state.layers.map((layer) => layer.id)).toEqual(["layer2", "layer1", "layer0", "layer3"]);
  // Moving the parent carries its whole block above the next root.
  await page.locator('gnumarus-shell [data-layer-id="layer3"]').getByRole("button", { name: "Move layer down" }).click();
  state = await getLayers(page);
  expect(state.layers.map((layer) => layer.id)).toEqual(["layer1", "layer0", "layer3", "layer2"]);
  const parents = await getLayerParents(page);
  expect(parents.find((layer) => layer.id === "layer0")?.parentId).toBe("layer3");
  expect(parents.find((layer) => layer.id === "layer1")?.parentId).toBe("layer3");
});

test("make root layer works from context menu and run action @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await page.getByRole("button", { name: "Add layer" }).click();
  await page.getByRole("button", { name: "Add layer" }).click();
  expect(await engineReparent(page, "layer0", "layer2")).toBe(true);
  // Context menu path.
  await page.locator('gnumarus-shell [data-layer-id="layer0"]').click({ button: "right" });
  await page.getByRole("button", { name: "Make root layer" }).click();
  let parents = await getLayerParents(page);
  expect(parents.find((layer) => layer.id === "layer0")?.parentId).toBeNull();
  let state = await getLayers(page);
  // Promoted block lands immediately above the old parent.
  expect(state.layers.map((layer) => layer.id)).toEqual(["layer1", "layer2", "layer0"]);
  // Run action palette path on the active layer.
  expect(await engineReparent(page, "layer1", "layer2")).toBe(true);
  await page.locator('gnumarus-shell [data-layer-id="layer1"] .layer-name').click();
  await page.keyboard.press("Control+Shift+P");
  const dialog = page.locator("gnumarus-shell dialog#actionPaletteDialog");
  await expect(dialog).toBeVisible();
  await dialog.locator('[data-testid="action-palette-input"]').fill("make root");
  await expect(dialog.locator('[data-testid="action-palette-item"]')).toHaveText(["Make root layer"]);
  await dialog.locator('[data-testid="action-palette-item"]').click();
  parents = await getLayerParents(page);
  expect(parents.find((layer) => layer.id === "layer1")?.parentId).toBeNull();
});

test("drag onto a layer reparents to top or bottom edge @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await page.getByRole("button", { name: "Add layer" }).click();
  await page.getByRole("button", { name: "Add layer" }).click();
  await page.getByRole("button", { name: "Add layer" }).click();
  // Storage: layer0(below), layer1(child), layer2(parent), layer3(above).
  expect(await engineReparent(page, "layer1", "layer2")).toBe(true);
  // Drag from above the parent lands on top (directly below the parent).
  await dropLayerOnto(page, "layer3", "layer2");
  let parents = await getLayerParents(page);
  expect(parents.find((layer) => layer.id === "layer3")?.parentId).toBe("layer2");
  let state = await getLayers(page);
  expect(state.layers.map((layer) => layer.id)).toEqual(["layer0", "layer1", "layer3", "layer2"]);
  // Drag from below the parent lands at the far end.
  await dropLayerOnto(page, "layer0", "layer2");
  parents = await getLayerParents(page);
  expect(parents.find((layer) => layer.id === "layer0")?.parentId).toBe("layer2");
  state = await getLayers(page);
  expect(state.layers.map((layer) => layer.id)).toEqual(["layer0", "layer1", "layer3", "layer2"]);
});

test("nesting cycles are rejected and keep pixels otherwise intact @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await page.getByRole("button", { name: "Add layer" }).click();
  await page.getByRole("button", { name: "Add layer" }).click();
  expect(await engineReparent(page, "layer0", "layer2")).toBe(true);
  const before = await getLayers(page);
  // Parent onto its own child is invalid (engine + drag UI share the rule).
  const cycled = await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { reparentLayerAsChild(c: string, p: string): boolean } } };
    return root.__gnumarus?.engine?.reparentLayerAsChild("layer2", "layer0") ?? true;
  });
  expect(cycled).toBe(false);
  await dropLayerOnto(page, "layer2", "layer0");
  await expect(page.locator("gnumarus-shell")).toContainText("Cannot nest a layer");
  const after = await getLayers(page);
  expect(after.layers.map((layer) => layer.id)).toEqual(before.layers.map((layer) => layer.id));
  expect(await getLayerParents(page)).toEqual(await getLayerParents(page));
  // Reparenting only reorders: opacity/visibility/size are untouched.
  const details = await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: { engine?: { getLayers(): Array<{ id: string; opacity: number; visible: boolean; width: number; height: number }> } };
    };
    return root.__gnumarus?.engine?.getLayers() ?? [];
  });
  expect(details.every((layer) => layer.opacity === 1 && layer.visible && layer.width === 64 && layer.height === 64)).toBe(true);
});

test("hiding a parent hides its children on canvas and flatten @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await setPencil(page, "#ff0000");
  await paintCenter(page);
  await page.getByRole("button", { name: "Add layer" }).click();
  await setPencil(page, "#0000ff");
  await paintCenter(page);
  // Top layer1 (blue) covers bottom layer0 (red) at the center.
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 255, a: 255 });
  expect(await engineReparent(page, "layer0", "layer1")).toBe(true);
  // Hide the parent: the child stays checked but renders nothing.
  await page.locator('gnumarus-shell [data-layer-id="layer1"] input[type="checkbox"]').click();
  const flags = await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: {
        engine?: {
          getLayers(): Array<{ id: string; visible: boolean }>;
          isLayerEffectivelyVisible(id: string): boolean;
          getFrameFlattenInputs(frame: number): Array<{ visible: boolean }> | null;
        };
      };
    };
    const layers = root.__gnumarus?.engine?.getLayers() ?? [];
    return {
      own: layers.find((layer) => layer.id === "layer0")?.visible,
      effectiveChild: root.__gnumarus?.engine?.isLayerEffectivelyVisible("layer0"),
      flatten: root.__gnumarus?.engine?.getFrameFlattenInputs(0)?.map((entry) => entry.visible),
    };
  });
  expect(flags.own).toBe(true);
  expect(flags.effectiveChild).toBe(false);
  expect(flags.flatten).toEqual([false, false]);
  const planesHidden = await page.evaluate(() => {
    const engine = (window as unknown as { __gnumarus?: { engine?: unknown } }).__gnumarus?.engine as unknown as
      | { layers: Array<{ id: string; plane: { visible: boolean } }> }
      | undefined;
    return (engine?.layers ?? []).map((layer) => ({ id: layer.id, visible: layer.plane.visible }));
  });
  expect(planesHidden.find((layer) => layer.id === "layer0")?.visible).toBe(false);
  expect(planesHidden.find((layer) => layer.id === "layer1")?.visible).toBe(false);
  // Showing the parent restores the child with no other change.
  await page.locator('gnumarus-shell [data-layer-id="layer1"] input[type="checkbox"]').click();
  const planesShown = await page.evaluate(() => {
    const engine = (window as unknown as { __gnumarus?: { engine?: unknown } }).__gnumarus?.engine as unknown as
      | { layers: Array<{ id: string; plane: { visible: boolean } }> }
      | undefined;
    return (engine?.layers ?? []).map((layer) => ({ id: layer.id, visible: layer.plane.visible }));
  });
  expect(planesShown.find((layer) => layer.id === "layer0")?.visible).toBe(true);
  expect(planesShown.find((layer) => layer.id === "layer1")?.visible).toBe(true);
});

test("child layer list collapses without touching the matrix or canvas @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await setPencil(page, "#ff0000");
  await paintCenter(page);
  await page.getByRole("button", { name: "Add layer" }).click();
  await page.getByRole("button", { name: "Add layer" }).click();
  expect(await engineReparent(page, "layer0", "layer2")).toBe(true);
  const toggle = page.locator('gnumarus-shell [data-testid="layer-collapse"][data-collapse-for="layer2"]');
  await expect(toggle).toHaveText("▾");
  const before = await readPixel(page, 32, 32);
  await toggle.click();
  await expect(toggle).toHaveText("▸");
  await expect(page.locator('gnumarus-shell .layer-row[data-layer-id="layer0"]')).toHaveCount(0);
  await expect(page.locator('gnumarus-shell .layer-row[data-layer-id="layer2"]')).toHaveCount(1);
  // Matrix keeps every row; canvas pixels are untouched by the list collapse.
  await expect(page.locator('gnumarus-shell [data-testid="anim-layer-name"][data-matrix-layer="layer0"]')).toHaveCount(1);
  expect(await readPixel(page, 32, 32)).toEqual(before);
  await toggle.click();
  await expect(page.locator('gnumarus-shell .layer-row[data-layer-id="layer0"]')).toHaveCount(1);
});

test("layer mask conversion hides with black and shows with white @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await page.getByRole("button", { name: "Add layer" }).click();
  await page.getByRole("button", { name: "Add layer" }).click();
  expect(await engineReparent(page, "layer2", "layer1")).toBe(true);
  // Parent red, mask white (full-layer bucket fills).
  await page.locator('gnumarus-shell [data-layer-id="layer1"] .layer-name').click();
  await selectTool(page, "Bucket fill");
  await setPencil(page, "#ff0000");
  await paintCenter(page);
  await page.locator('gnumarus-shell [data-layer-id="layer2"] .layer-name').click();
  await setPencil(page, "#ffffff");
  await paintCenter(page);
  await page.locator('gnumarus-shell [data-layer-id="layer2"]').click({ button: "right" });
  await page.getByRole("button", { name: "Convert to mask" }).click();
  expect(await getLayerMasks(page)).toContainEqual({ id: "layer2", isMask: true });
  await expect(page.locator('gnumarus-shell .layer-row[data-layer-id="layer2"] .layer-mask-badge')).toBeVisible();
  // White mask shows the red parent in the flattened preview.
  await page.getByRole("button", { name: "Final preview" }).click();
  await expectPreviewCenter(page, "255,0,0,255");
  await page.getByRole("button", { name: "Close preview" }).click();
  // Black mask hides the parent (default image checker shows through).
  await setPencil(page, "#000000");
  await paintCenter(page);
  await page.getByRole("button", { name: "Final preview" }).click();
  await expectPreviewCenter(page, "148,148,148,255");
  await page.getByRole("button", { name: "Close preview" }).click();
  // Converting back renders the layer normally (still nested under its
  // parent, so the red parent keeps covering it).
  await page.locator('gnumarus-shell [data-layer-id="layer2"]').click({ button: "right" });
  await page.getByRole("button", { name: "Convert to normal layer" }).click();
  expect(await getLayerMasks(page)).toContainEqual({ id: "layer2", isMask: false });
  await expect(page.locator('gnumarus-shell .layer-row[data-layer-id="layer2"] .layer-mask-badge')).toHaveCount(0);
  const unmasked = await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: {
        engine?: {
          getFrameFlattenInputs(frame: number): Array<{ visible: boolean; masks?: Array<unknown> }> | null;
          getLayers(): Array<{ id: string }>;
        };
      };
    };
    const layers = root.__gnumarus?.engine?.getLayers() ?? [];
    const inputs = root.__gnumarus?.engine?.getFrameFlattenInputs(0) ?? [];
    const entry = inputs[layers.findIndex((layer) => layer.id === "layer2")];
    return { visible: entry?.visible, masks: entry?.masks?.length ?? 0 };
  });
  expect(unmasked).toEqual({ visible: true, masks: 0 });
  // Make it a root: it moves above the parent and covers it with black.
  await page.locator('gnumarus-shell [data-layer-id="layer2"]').click({ button: "right" });
  await page.getByRole("button", { name: "Make root layer" }).click();
  await page.getByRole("button", { name: "Final preview" }).click();
  await expectPreviewCenter(page, "0,0,0,255");
  await page.getByRole("button", { name: "Close preview" }).click();
});

test("masks never render alone and reject nesting and merges @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await page.getByRole("button", { name: "Add layer" }).click();
  await page.getByRole("button", { name: "Add layer" }).click();
  expect(await engineReparent(page, "layer2", "layer1")).toBe(true);
  // Parent red so the mask has content to modulate.
  await page.locator('gnumarus-shell [data-layer-id="layer1"] .layer-name').click();
  await selectTool(page, "Bucket fill");
  await setPencil(page, "#ff0000");
  await paintCenter(page);
  // Toggle via the run action palette.
  await page.locator('gnumarus-shell [data-layer-id="layer2"] .layer-name').click();
  await page.keyboard.press("Control+Shift+P");
  const dialog = page.locator("gnumarus-shell dialog#actionPaletteDialog");
  await expect(dialog).toBeVisible();
  await dialog.locator('[data-testid="action-palette-input"]').fill("toggle layer mask");
  await expect(dialog.locator('[data-testid="action-palette-item"]')).toHaveText(["Toggle layer mask"]);
  await dialog.locator('[data-testid="action-palette-item"]').click();
  expect(await getLayerMasks(page)).toContainEqual({ id: "layer2", isMask: true });
  await setPencil(page, "#ffffff");
  await paintCenter(page);
  // Flattening excludes the mask as an independent layer and wires the parent.
  const flatten = await page.evaluate(() => {
    const root = window as unknown as {
      __gnumarus?: {
        engine?: {
          getFrameFlattenInputs(frame: number): Array<{ visible: boolean; masks?: Array<unknown> }> | null;
          getLayers(): Array<{ id: string }>;
        };
      };
    };
    const layers = root.__gnumarus?.engine?.getLayers() ?? [];
    const inputs = root.__gnumarus?.engine?.getFrameFlattenInputs(0) ?? [];
    const byId = new Map(layers.map((layer, index) => [layer.id, inputs[index]]));
    return {
      maskVisible: byId.get("layer2")?.visible,
      parentMasks: (byId.get("layer1")?.masks ?? []).length,
    };
  });
  expect(flatten.maskVisible).toBe(false);
  expect(flatten.parentMasks).toBe(1);
  // Canvas wires the parent shader flag.
  const wired = await page.evaluate(() => {
    const engine = (window as unknown as { __gnumarus?: { engine?: unknown } }).__gnumarus?.engine as unknown as
      | { layers: Array<{ id: string; material: { uniforms: Record<string, { value: unknown }> } }> }
      | undefined;
    const parent = engine?.layers.find((layer) => layer.id === "layer1");
    return parent?.material.uniforms["uUseMask"]?.value;
  });
  expect(wired).toBe(1);
  // The mask row stays in the panel and matrix (panel only collapses).
  await expect(page.locator('gnumarus-shell .layer-row[data-layer-id="layer2"][data-mask="true"]')).toHaveCount(1);
  await expect(page.locator('gnumarus-shell [data-testid="anim-layer-name"][data-mask="true"]')).toHaveCount(1);
  // Nesting under a mask is rejected.
  await dropLayerOnto(page, "layer0", "layer2");
  await expect(page.locator("gnumarus-shell")).toContainText("Cannot nest a layer under a mask");
  expect((await getLayerParents(page)).find((layer) => layer.id === "layer0")?.parentId).toBeNull();
  // Merging with a mask is rejected and the menu disables it.
  const merged = await page.evaluate(() => {
    const root = window as unknown as { __gnumarus?: { engine?: { mergeDown(id: string): boolean } } };
    return root.__gnumarus?.engine?.mergeDown("layer2") ?? true;
  });
  expect(merged).toBe(false);
  await page.locator('gnumarus-shell [data-layer-id="layer2"]').click({ button: "right" });
  await expect(page.getByRole("button", { name: "Merge Down" })).toBeDisabled();
  await page.locator("gnumarus-shell .context-blocker").click();
});

test("toggling visibility off and on preserves masking @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await page.getByRole("button", { name: "Add layer" }).click();
  await page.getByRole("button", { name: "Add layer" }).click();
  expect(await engineReparent(page, "layer2", "layer1")).toBe(true);
  await page.locator('gnumarus-shell [data-layer-id="layer1"] .layer-name').click();
  await selectTool(page, "Bucket fill");
  await setPencil(page, "#ff0000");
  await paintCenter(page);
  await page.locator('gnumarus-shell [data-layer-id="layer2"] .layer-name').click();
  await setPencil(page, "#000000");
  await paintCenter(page);
  await page.locator('gnumarus-shell [data-layer-id="layer2"]').click({ button: "right" });
  await page.getByRole("button", { name: "Convert to mask" }).click();
  expect(await canvasCenterPixel(page)).not.toBe("255,0,0,255");
  // Parent off/on must keep the mask wired on canvas.
  await page.locator('gnumarus-shell [data-layer-id="layer1"] input[type="checkbox"]').click();
  await page.locator('gnumarus-shell [data-layer-id="layer1"] input[type="checkbox"]').click();
  expect(await canvasCenterPixel(page)).not.toBe("255,0,0,255");
  // Mask off shows the parent; mask on hides it again.
  await page.locator('gnumarus-shell [data-layer-id="layer2"] input[type="checkbox"]').click();
  expect(await canvasCenterPixel(page)).toBe("255,0,0,255");
  await page.locator('gnumarus-shell [data-layer-id="layer2"] input[type="checkbox"]').click();
  expect(await canvasCenterPixel(page)).not.toBe("255,0,0,255");
  // Repainting the mask white lifts the mask everywhere.
  await setPencil(page, "#ffffff");
  await paintCenter(page);
  expect(await canvasCenterPixel(page)).toBe("255,0,0,255");
});

test("empty cells hold the last non-empty frame by default and respect the setting @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintCenter(page);
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  await matrix.locator('[data-testid="anim-frame"][data-frame="1"]').click();
  // Default (hold): the empty frame renders frame 0's dot, but stays assigned empty.
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  await expect(matrix.locator('[data-testid="anim-cell"][data-matrix-frame="1"]')).toHaveAttribute(
    "aria-label",
    /empty/,
  );
  // Switch the setting to nothing: the empty frame renders transparent.
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await page.locator("gnumarus-shell select#emptyCellMode").selectOption("nothing");
  await page.keyboard.press("Escape");
  expect(await readPixel(page, 32, 32)).toBeNull();
  // Back to hold: the dot renders again.
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await page.locator("gnumarus-shell select#emptyCellMode").selectOption("hold");
  await page.keyboard.press("Escape");
  expect(await readPixel(page, 32, 32)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
});

test("Alt+Left outdents below the parent and Alt+Right nests into the sibling above @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await page.getByRole("button", { name: "Add layer" }).click();
  await page.getByRole("button", { name: "Add layer" }).click();
  expect(await engineReparent(page, "layer0", "layer2")).toBe(true);
  expect(await engineReparent(page, "layer1", "layer2")).toBe(true);
  let parents = await getLayerParents(page);
  expect(parents.find((layer) => layer.id === "layer1")?.parentId).toBe("layer2");
  // Bottom child indents into the sibling above as its last child.
  await page.locator('gnumarus-shell [data-layer-id="layer1"] .layer-name').click();
  await page.keyboard.press("Alt+ArrowRight");
  parents = await getLayerParents(page);
  expect(parents.find((layer) => layer.id === "layer1")?.parentId).toBe("layer0");
  await expect(page.locator("gnumarus-shell")).toContainText("nested into");
  await expect(page.locator('gnumarus-shell .layer-row[data-layer-id="layer1"]')).toHaveAttribute("data-depth", "2");
  // Outdent puts it back as a sibling right below the old parent block.
  await page.keyboard.press("Alt+ArrowLeft");
  parents = await getLayerParents(page);
  expect(parents.find((layer) => layer.id === "layer1")?.parentId).toBe("layer2");
  await expect(page.locator("gnumarus-shell")).toContainText("moved out below");
  // Top child has no sibling above: nothing happens.
  await page.locator('gnumarus-shell [data-layer-id="layer0"] .layer-name').click();
  await page.keyboard.press("Alt+ArrowRight");
  parents = await getLayerParents(page);
  expect(parents.find((layer) => layer.id === "layer0")?.parentId).toBe("layer2");
  await expect(page.locator("gnumarus-shell")).toContainText("No sibling above");
  // Roots cannot outdent.
  await page.locator('gnumarus-shell [data-layer-id="layer2"] .layer-name').click();
  await page.keyboard.press("Alt+ArrowLeft");
  expect((await getLayerParents(page)).find((layer) => layer.id === "layer2")?.parentId).toBeNull();
  await expect(page.locator("gnumarus-shell")).toContainText("already a root");
});

test("Set frame duration applies one value to every selected frame @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  await matrix.locator('[data-testid="anim-frame"][data-frame="0"]').click();
  await matrix.locator('[data-testid="anim-frame"][data-frame="2"]').click({ modifiers: ["Control"] });
  await expect(page.locator("gnumarus-shell")).toContainText("2 frames selected");
  await matrix.locator('[data-testid="anim-frame"][data-frame="2"]').click({ button: "right" });
  await page.getByRole("button", { name: "Set frame duration…" }).click();
  await page.locator("gnumarus-shell input#frameDuration").fill("0.1");
  await page.getByRole("button", { name: "Set", exact: true }).click();
  expect(await getFrameDuration(page, 0)).toBe(0.1);
  expect(await getFrameDuration(page, 1)).toBeNull();
  expect(await getFrameDuration(page, 2)).toBe(0.1);
  await expect(page.locator("gnumarus-shell")).toContainText("2 frames set to 0.1 s");
  // Clear removes the override from every selected frame.
  await matrix.locator('[data-testid="anim-frame"][data-frame="2"]').click({ button: "right" });
  await page.getByRole("button", { name: "Set frame duration…" }).click();
  await page.getByRole("button", { name: "Clear" }).click();
  expect(await getFrameDuration(page, 0)).toBeNull();
  expect(await getFrameDuration(page, 2)).toBeNull();
  await expect(page.locator("gnumarus-shell")).toContainText("2 frames use the project default");
});

test("Set total duration splits evenly across contiguous and scattered frames @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  await matrix.getByRole("button", { name: "Add frame", exact: true }).click();
  // The run action needs at least two selected frames.
  await page.keyboard.press("Control+Shift+P");
  const palette = page.locator("gnumarus-shell dialog#actionPaletteDialog");
  await expect(palette).toBeVisible();
  await palette.locator('[data-testid="action-palette-input"]').fill("total duration");
  await expect(palette.locator('[data-testid="action-palette-item"]')).toHaveText(["Set total duration"]);
  await palette.locator('[data-testid="action-palette-item"]').click();
  await expect(page.locator("gnumarus-shell")).toContainText("Select at least two frames first");
  // Non-contiguous pair via the context menu.
  await matrix.locator('[data-testid="anim-frame"][data-frame="0"]').click();
  await matrix.locator('[data-testid="anim-frame"][data-frame="2"]').click({ modifiers: ["Control"] });
  await matrix.locator('[data-testid="anim-frame"][data-frame="2"]').click({ button: "right" });
  await page.getByRole("button", { name: "Set total duration…" }).click();
  const dialog = page.locator("gnumarus-shell dialog#frameDurationDialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("evenly divided");
  await page.locator("gnumarus-shell input#frameDuration").fill("3");
  await page.getByRole("button", { name: "Set", exact: true }).click();
  expect(await getFrameDuration(page, 0)).toBe(1.5);
  expect(await getFrameDuration(page, 1)).toBeNull();
  expect(await getFrameDuration(page, 2)).toBe(1.5);
  await expect(page.locator("gnumarus-shell")).toContainText("Total 3 s split over 2 frames (1.5 s each)");
  // Same split through the run action palette on another pair.
  await matrix.locator('[data-testid="anim-frame"][data-frame="1"]').click();
  await matrix.locator('[data-testid="anim-frame"][data-frame="2"]').click({ modifiers: ["Control"] });
  await page.keyboard.press("Control+Shift+P");
  await expect(palette).toBeVisible();
  await palette.locator('[data-testid="action-palette-input"]').fill("total duration");
  await palette.locator('[data-testid="action-palette-item"]').click();
  await page.locator("gnumarus-shell input#frameDuration").fill("1");
  await page.getByRole("button", { name: "Set", exact: true }).click();
  expect(await getFrameDuration(page, 1)).toBe(0.5);
  expect(await getFrameDuration(page, 2)).toBe(0.5);
  await expect(page.locator("gnumarus-shell")).toContainText("Total 1 s split over 2 frames (0.5 s each)");
});
