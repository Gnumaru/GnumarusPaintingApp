# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: GnumarusShell.spec.ts >> boolean ops combine ellipse with rectangle @recent
- Location: e2e/GnumarusShell.spec.ts:6120:1

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('gnumarus-shell [data-testid="selection-flyout"]').getByRole('button', { name: 'Rectangular selection', exact: true })

```

# Page snapshot

```yaml
- generic [active] [ref=e2]:
  - generic [ref=e3]:
    - button "File" [ref=e5] [cursor=pointer]
    - button "Edit" [ref=e7] [cursor=pointer]
    - button "Help" [ref=e9] [cursor=pointer]
    - generic [ref=e10]: Gnumaru's Painting and Animation App — *modified*
  - generic "Editor options" [ref=e11]:
    - generic "Repeat textures infinitely while painting. You can paint outside the texture and it wraps around to the other side. Only the active layer shows its neighbors." [ref=e12]:
      - text: Wrap
      - combobox "Wrap" [ref=e13]:
        - option "Off" [selected]
        - option "Left-right"
        - option "Up-down"
        - option "Both"
    - generic "Mirror every stroke across the canvas axes while painting (pencil only)." [ref=e14]:
      - text: Symmetry
      - combobox "Symmetry" [ref=e15]:
        - option "Off" [selected]
        - option "Left-right"
        - option "Up-down"
        - option "Four-way"
  - generic "Pencil options" [ref=e16]:
    - generic "Apply a saved brush preset (all pencil settings) to the current brush." [ref=e17]:
      - text: Preset
      - combobox "Preset" [ref=e18]:
        - option "Pixel Hard" [selected]
        - option "Soft Round"
        - option "Chalk"
        - option "Ink"
        - option "Airbrush"
        - option "Smudge"
    - generic "Name a preset, then Save stores the current settings, Delete removes a custom preset, Export downloads it as JSON, Import loads a preset file." [ref=e19]:
      - text: Preset name
      - textbox "Preset name Save Delete Export Import" [ref=e20]
      - button "Save" [ref=e21]
      - button "Delete" [ref=e22]
      - button "Export" [ref=e23]
      - button "Import" [ref=e24]
    - generic "Brush diameter in layer pixels (0.1–64). Shift+Left-drag also resizes the active tool." [ref=e25]:
      - text: Brush size
      - spinbutton "Brush size" [ref=e26]: "1"
    - 'generic "Pixel tip footprint: full square or inscribed disk. Only used by the Pixel (hard) tip." [ref=e27]':
      - text: Brush shape
      - combobox "Brush shape" [ref=e28]:
        - option "Square"
        - option "Circle" [selected]
    - generic "Pixel paints hard aliased stamps (pixel art). Soft paints a round tip with hardness falloff. Image paints a grayscale tip as an alpha mask tinted with the paint color." [ref=e29]:
      - text: Brush tip
      - combobox "Brush tip" [ref=e30]:
        - option "Pixel (hard)" [selected]
        - option "Soft round"
        - option "Image"
    - generic "Map pen pressure to brush size, paint alpha, or both. Mice always paint at full pressure." [ref=e31]:
      - text: Pressure response
      - combobox "Pressure response" [ref=e32]:
        - option "None" [selected]
        - option "Size"
        - option "Opacity"
        - option "Size + opacity"
    - generic "Smooth stroke edges with partial-pixel coverage. Disables Pixel perfect." [ref=e33]:
      - checkbox "Anti-aliasing" [ref=e34]
      - text: Anti-aliasing
    - generic "Keeps 1px strokes exactly 1px thick. Only applies at brush size 1 without anti-aliasing and with wrap off." [ref=e35]:
      - checkbox "Pixel perfect" [ref=e36]
      - text: Pixel perfect
    - 'generic "Steady the stroke: rope leashes the tip, follow chases the cursor with smoothing." [ref=e37]':
      - text: Stabilizer
      - combobox "Stabilizer" [ref=e38]:
        - option "None" [selected]
        - option "Rope"
        - option "Follow"
    - 'generic "How paint combines with existing pixels: normal blends over, copy replaces, eraser clears alpha (E toggles)." [ref=e39]':
      - text: Blend mode
      - combobox "Blend mode" [ref=e40]:
        - option "Normal" [selected]
        - option "Copy"
        - option "Eraser"
    - generic "When on, dabs build over each other while scrubbing; when off, the stroke keeps uniform coverage." [ref=e41]:
      - checkbox "Accumulate" [checked] [ref=e42]
      - text: Accumulate
  - generic [ref=e43]:
    - generic [ref=e44]:
      - button "pencil" [ref=e46] [cursor=pointer]:
        - generic [ref=e47]: ✎
      - button "Loupe" [ref=e48] [cursor=pointer]:
        - generic [ref=e49]: ⌕
      - button "Bucket fill" [ref=e50] [cursor=pointer]
      - button "Eyedropper" [ref=e55] [cursor=pointer]
      - generic [ref=e59]:
        - button "rectangular selection" [ref=e60] [cursor=pointer]:
          - generic [ref=e61]: ▭
        - generic [ref=e62]:
          - button "rectangular selection" [ref=e63] [cursor=pointer]:
            - generic [ref=e64]: ▭
          - button "elliptical selection" [ref=e65] [cursor=pointer]:
            - generic [ref=e66]: ◯
          - button "freehand lasso" [ref=e67] [cursor=pointer]:
            - generic [ref=e68]: 〰
          - button "color selection" [ref=e69] [cursor=pointer]:
            - generic [ref=e70]: ✦
      - button "destructive selection transform" [ref=e73] [cursor=pointer]:
        - generic [ref=e74]: ✛
      - button "non-destructive cell transform" [ref=e76] [cursor=pointer]:
        - generic [ref=e77]: ⤢
      - button "Pick color" [ref=e79] [cursor=pointer]
      - button "Final preview" [ref=e81] [cursor=pointer]:
        - generic [ref=e82]: ⊞
    - complementary "Layers" [ref=e85]:
      - generic [ref=e86]:
        - generic [ref=e87]: Layers
        - button "Add layer" [ref=e88] [cursor=pointer]: +
      - generic [ref=e90] [cursor=pointer]:
        - generic [ref=e91]:
          - checkbox "Toggle layer visibility" [checked] [ref=e92]
          - generic [ref=e93]: L1
          - generic [ref=e94]: 64×64
          - button "Move layer up" [disabled] [ref=e95]: ▲
          - button "Move layer down" [disabled] [ref=e96]: ▼
          - button "Delete layer" [disabled] [ref=e97]: ×
        - generic [ref=e98]:
          - generic [ref=e99]: Opacity
          - slider "Layer opacity" [ref=e100]: "100"
        - generic [ref=e101]:
          - generic [ref=e102]: Lock
          - button "Lock red channel" [ref=e103]: R
          - button "Lock green channel" [ref=e104]: G
          - button "Lock blue channel" [ref=e105]: B
          - button "Lock alpha channel" [ref=e106]: A
        - generic [ref=e107]:
          - generic [ref=e108]: Size
          - button "Resize layer" [ref=e109]: 64×64 Resize
  - generic "Animation matrix" [ref=e110]:
    - generic [ref=e112]:
      - generic [ref=e113]:
        - button "Manage animations" [ref=e114] [cursor=pointer]: ⚙
        - button "Add frame" [ref=e115] [cursor=pointer]: +
        - button "Play animation" [ref=e116] [cursor=pointer]: ▶
        - combobox "Active animation" [ref=e117] [cursor=pointer]:
          - option "All frames" [selected]
      - 'button "Frame 1, current: F1, 0.25 seconds, in no animations" [ref=e119] [cursor=pointer]': F1
      - button "Animation layer L1" [ref=e120]: L1
      - button "Animation cell, layer L1, frame 1, C1" [ref=e121] [cursor=pointer]:
        - generic [ref=e122]: C1
  - generic [ref=e123]:
    - generic [ref=e124]: pencil
    - generic [ref=e125]: "#ff0000"
    - generic [ref=e126]: "-"
    - generic [ref=e127]: 64 x 64
    - generic [ref=e128]: L1 (1/1)
    - generic [ref=e129]: "Frame 1/1: F1"
    - generic [ref=e130]: 700%
    - generic [ref=e131]: 0°
    - generic [ref=e132]: Untitled
    - generic [ref=e133]: Ready
```

# Test source

```ts
  5865 |       __gnumarus?: { engine?: { getFloatingRect(): { x: number; y: number; width: number; height: number } | null } };
  5866 |     };
  5867 |     return root.__gnumarus?.engine?.getFloatingRect() ?? null;
  5868 |   });
  5869 | }
  5870 | 
  5871 | async function layerScreenTarget(
  5872 |   page: import("@playwright/test").Page,
  5873 |   lx: number,
  5874 |   ly: number,
  5875 | ): Promise<{ x: number; y: number }> {
  5876 |   const canvas = page.locator("gnumarus-shell canvas");
  5877 |   const box = await canvas.boundingBox();
  5878 |   if (box === null) {
  5879 |     throw new Error("canvas has no bounding box");
  5880 |   }
  5881 |   const state = await getViewState(page);
  5882 |   return layerPixelToScreen(
  5883 |     lx,
  5884 |     ly,
  5885 |     { left: box.x, top: box.y, width: box.width, height: box.height },
  5886 |     64,
  5887 |     64,
  5888 |     { zoom: state.zoom, panX: 0, panY: 0, rotation: state.rotation, flipX: false, flipY: false },
  5889 |     { x: 0, y: 0, rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotationX: 0, rotationY: 0 },
  5890 |   );
  5891 | }
  5892 | 
  5893 | interface GnumarusFloatingSelectionInfo {
  5894 |   x: number;
  5895 |   y: number;
  5896 |   width: number;
  5897 |   height: number;
  5898 |   selected: number;
  5899 | }
  5900 | 
  5901 | async function getFloatingSelection(page: import("@playwright/test").Page): Promise<GnumarusFloatingSelectionInfo | null> {
  5902 |   return page.evaluate(() => {
  5903 |     const root = window as unknown as {
  5904 |       __gnumarus?: { engine?: { getFloatingSelection(): GnumarusFloatingSelectionInfo | null } };
  5905 |     };
  5906 |     return root.__gnumarus?.engine?.getFloatingSelection() ?? null;
  5907 |   });
  5908 | }
  5909 | 
  5910 | async function dragRect(
  5911 |   page: import("@playwright/test").Page,
  5912 |   x0: number,
  5913 |   y0: number,
  5914 |   x1: number,
  5915 |   y1: number,
  5916 | ): Promise<void> {
  5917 |   const from = await layerScreenTarget(page, x0, y0);
  5918 |   const to = await layerScreenTarget(page, x1, y1);
  5919 |   await page.mouse.move(from.x, from.y);
  5920 |   await page.mouse.down();
  5921 |   await page.mouse.move(to.x, to.y, { steps: 5 });
  5922 |   await page.mouse.up();
  5923 | }
  5924 | 
  5925 | async function paintDot(
  5926 |   page: import("@playwright/test").Page,
  5927 |   hex: string,
  5928 |   x: number,
  5929 |   y: number,
  5930 | ): Promise<void> {
  5931 |   await setPencil(page, hex);
  5932 |   const target = await layerScreenTarget(page, x, y);
  5933 |   await page.mouse.click(target.x, target.y);
  5934 | }
  5935 | 
  5936 | /** Front buttons of each drawer, for tools hidden inside a closed flyout. */
  5937 | const DRAWER_FOR_TOOL: Record<string, string> = {
  5938 |   Line: "paint",
  5939 |   Curve: "paint",
  5940 |   "Rectangular selection": "selection",
  5941 |   "Elliptical selection": "selection",
  5942 |   "Freehand lasso": "selection",
  5943 |   "Color selection": "selection",
  5944 |   "Destructive selection transform": "destructive",
  5945 |   "Destructive 3D rotation": "destructive",
  5946 |   "Non-destructive cell transform": "transform",
  5947 |   "3D rotation": "transform",
  5948 | };
  5949 | 
  5950 | /** Click a toolbar tool, opening its drawer flyout when it is not the front. */
  5951 | async function selectTool(page: import("@playwright/test").Page, name: string): Promise<void> {
  5952 |   const direct = page.getByRole("button", { name, exact: true });
  5953 |   if ((await direct.count()) > 0) {
  5954 |     await direct.first().click();
  5955 |     return;
  5956 |   }
  5957 |   const drawer = DRAWER_FOR_TOOL[name];
  5958 |   if (drawer === undefined) {
  5959 |     throw new Error(`no drawer known for tool ${name}`);
  5960 |   }
  5961 |   await page.locator(`gnumarus-shell [data-testid="${drawer}-drawer"] > button`).click({ button: "right" });
  5962 |   await page
  5963 |     .locator(`gnumarus-shell [data-testid="${drawer}-flyout"]`)
  5964 |     .getByRole("button", { name, exact: true })
> 5965 |     .click();
       |      ^ Error: locator.click: Test timeout of 60000ms exceeded.
  5966 | }
  5967 | 
  5968 | test("selection drawer swaps the front tool on flyout pick @recent", async ({ page }) => {
  5969 |   await page.goto("/");
  5970 |   await page.waitForSelector("gnumarus-shell canvas");
  5971 |   const drawer = page.locator('gnumarus-shell [data-testid="selection-drawer"]');
  5972 |   await expect(drawer.getByRole("button", { name: "Rectangular selection" })).toBeVisible();
  5973 |   await drawer.getByRole("button", { name: "Rectangular selection" }).click({ button: "right" });
  5974 |   await expect(page.locator('gnumarus-shell [data-testid="selection-flyout"]')).toBeVisible();
  5975 |   await page.locator('gnumarus-shell [data-testid="selection-flyout"]').getByRole("button", { name: "Elliptical selection" }).click();
  5976 |   await expect(page.locator('gnumarus-shell [data-testid="selection-flyout"]')).toBeHidden();
  5977 |   await expect(drawer.getByRole("button", { name: "Elliptical selection" })).toBeVisible();
  5978 |   await expect(page.locator("gnumarus-shell")).toContainText("Elliptical selection");
  5979 |   await page.keyboard.press("r");
  5980 |   await expect(drawer.getByRole("button", { name: "Rectangular selection" })).toBeVisible();
  5981 | });
  5982 | 
  5983 | test("paint drawer swaps line and curve through the flyout @recent", async ({ page }) => {
  5984 |   await page.goto("/");
  5985 |   await page.waitForSelector("gnumarus-shell canvas");
  5986 |   const drawer = page.locator('gnumarus-shell [data-testid="paint-drawer"]');
  5987 |   await expect(drawer.getByRole("button", { name: "Pencil" })).toBeVisible();
  5988 |   await drawer.getByRole("button", { name: "Pencil" }).click({ button: "right" });
  5989 |   await expect(page.locator('gnumarus-shell [data-testid="paint-flyout"]')).toBeVisible();
  5990 |   await page.locator('gnumarus-shell [data-testid="paint-flyout"]').getByRole("button", { name: "Curve" }).click();
  5991 |   await expect(page.locator('gnumarus-shell [data-testid="paint-flyout"]')).toBeHidden();
  5992 |   await expect(drawer.getByRole("button", { name: "Curve" })).toBeVisible();
  5993 |   await expect(page.locator("gnumarus-shell")).toContainText("Curve tool");
  5994 |   await drawer.getByRole("button", { name: "Curve" }).click();
  5995 |   await expect(page.locator("gnumarus-shell")).toContainText("Curve tool");
  5996 | });
  5997 | 
  5998 | test("destructive and transform drawers swap their front tools @recent", async ({ page }) => {
  5999 |   await page.goto("/");
  6000 |   await page.waitForSelector("gnumarus-shell canvas");
  6001 |   const destructive = page.locator('gnumarus-shell [data-testid="destructive-drawer"]');
  6002 |   await destructive.getByRole("button", { name: "Destructive selection transform" }).click({ button: "right" });
  6003 |   await page
  6004 |     .locator('gnumarus-shell [data-testid="destructive-flyout"]')
  6005 |     .getByRole("button", { name: "Destructive 3D rotation" })
  6006 |     .click();
  6007 |   await expect(destructive.getByRole("button", { name: "Destructive 3D rotation" })).toBeVisible();
  6008 |   const transform = page.locator('gnumarus-shell [data-testid="transform-drawer"]');
  6009 |   await transform.getByRole("button", { name: "Non-destructive cell transform" }).click({ button: "right" });
  6010 |   await page.locator('gnumarus-shell [data-testid="transform-flyout"]').getByRole("button", { name: "3D rotation" }).click();
  6011 |   await expect(transform.getByRole("button", { name: "3D rotation" })).toBeVisible();
  6012 |   await expect(page.locator("gnumarus-shell")).toContainText("3D rotation tool");
  6013 | });
  6014 | 
  6015 | test("elliptical selection cuts an ellipse @recent", async ({ page }) => {
  6016 |   await page.goto("/");
  6017 |   await page.waitForSelector("gnumarus-shell canvas");
  6018 |   await setPencil(page, "#ff0000");
  6019 |   await page.getByRole("button", { name: "Bucket fill" }).click();
  6020 |   const corner = await layerScreenTarget(page, 0, 0);
  6021 |   await page.mouse.click(corner.x, corner.y);
  6022 |   await page.keyboard.press("o");
  6023 |   await dragRect(page, 10, 10, 20, 20);
  6024 |   const selection = await getFloatingSelection(page);
  6025 |   expect(selection).not.toBeNull();
  6026 |   expect(selection?.x).toBe(10);
  6027 |   expect(selection?.y).toBe(10);
  6028 |   expect(selection?.width).toBe(11);
  6029 |   expect(selection?.height).toBe(11);
  6030 |   expect(selection?.selected ?? 0).toBeGreaterThan(0);
  6031 |   expect(selection?.selected ?? 121).toBeLessThan(121);
  6032 |   // Center cut out, bbox corner left intact.
  6033 |   expect(await readPixel(page, 15, 15)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  6034 |   expect(await readPixel(page, 10, 10)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  6035 | });
  6036 | 
  6037 | test("lasso selection cuts a freehand shape @recent", async ({ page }) => {
  6038 |   await page.goto("/");
  6039 |   await page.waitForSelector("gnumarus-shell canvas");
  6040 |   await setPencil(page, "#ff0000");
  6041 |   await page.getByRole("button", { name: "Bucket fill" }).click();
  6042 |   const corner = await layerScreenTarget(page, 0, 0);
  6043 |   await page.mouse.click(corner.x, corner.y);
  6044 |   await page.keyboard.press("l");
  6045 |   const corners = [
  6046 |     await layerScreenTarget(page, 10, 10),
  6047 |     await layerScreenTarget(page, 30, 10),
  6048 |     await layerScreenTarget(page, 10, 30),
  6049 |   ];
  6050 |   const first = corners[0];
  6051 |   if (first === undefined) {
  6052 |     throw new Error("lasso start has no screen target");
  6053 |   }
  6054 |   await page.mouse.move(first.x, first.y);
  6055 |   await page.mouse.down();
  6056 |   for (const corner of corners.slice(1)) {
  6057 |     await page.mouse.move(corner.x, corner.y, { steps: 5 });
  6058 |   }
  6059 |   await page.mouse.move(first.x, first.y, { steps: 5 });
  6060 |   await page.mouse.up();
  6061 |   const selection = await getFloatingSelection(page);
  6062 |   expect(selection).not.toBeNull();
  6063 |   expect(selection?.selected ?? 0).toBeGreaterThan(100);
  6064 |   expect(await readPixel(page, 12, 12)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  6065 |   expect(await readPixel(page, 28, 28)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
```