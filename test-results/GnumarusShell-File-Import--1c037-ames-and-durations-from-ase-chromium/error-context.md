# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: GnumarusShell.spec.ts >> File > Import loads layers, frames and durations from .ase
- Location: e2e/GnumarusShell.spec.ts:7141:1

# Error details

```
Error: locator.click: Error: strict mode violation: getByRole('button', { name: 'Import' }) resolved to 2 elements:
    1) <button>Import</button> aka getByRole('button', { name: 'Import' }).first()
    2) <button>Import</button> aka getByTestId('tool-options').getByRole('button', { name: 'Import' })

Call log:
  - waiting for getByRole('button', { name: 'Import' })

```

# Page snapshot

```yaml
- generic [active] [ref=e2]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - button "File" [ref=e5] [cursor=pointer]
      - generic [ref=e6]:
        - button "New Project" [ref=e7] [cursor=pointer]
        - button "Open Project" [ref=e8] [cursor=pointer]
        - button "Save Project" [ref=e9] [cursor=pointer]
        - button "Import" [ref=e10] [cursor=pointer]
        - button "Export" [ref=e11] [cursor=pointer]
    - button "Edit" [ref=e13] [cursor=pointer]
    - button "Help" [ref=e15] [cursor=pointer]
    - generic [ref=e16]: Gnumaru's Painting and Animation App
  - generic "Editor options" [ref=e17]:
    - generic "Repeat textures infinitely while painting. You can paint outside the texture and it wraps around to the other side. Only the active layer shows its neighbors." [ref=e18]:
      - text: Wrap
      - combobox "Wrap" [ref=e19]:
        - option "Off" [selected]
        - option "Left-right"
        - option "Up-down"
        - option "Both"
    - generic "Mirror every stroke across the canvas axes while painting (pencil only)." [ref=e20]:
      - text: Symmetry
      - combobox "Symmetry" [ref=e21]:
        - option "Off" [selected]
        - option "Left-right"
        - option "Up-down"
        - option "Four-way"
  - generic "Pencil options" [ref=e22]:
    - generic "Apply a saved brush preset (all pencil settings) to the current brush." [ref=e23]:
      - text: Preset
      - combobox "Preset" [ref=e24]:
        - option "Pixel Hard" [selected]
        - option "Soft Round"
        - option "Chalk"
        - option "Ink"
        - option "Airbrush"
        - option "Smudge"
    - generic "Name a preset, then Save stores the current settings, Delete removes a custom preset, Export downloads it as JSON, Import loads a preset file." [ref=e25]:
      - text: Preset name
      - textbox "Preset name Save Delete Export Import" [ref=e26]
      - button "Save" [ref=e27]
      - button "Delete" [ref=e28]
      - button "Export" [ref=e29]
      - button "Import" [ref=e30]
    - generic "Brush diameter in layer pixels (0.1–64). Shift+Left-drag also resizes the active tool." [ref=e31]:
      - text: Brush size
      - spinbutton "Brush size" [ref=e32]: "1"
    - 'generic "Pixel tip footprint: full square or inscribed disk. Only used by the Pixel (hard) tip." [ref=e33]':
      - text: Brush shape
      - combobox "Brush shape" [ref=e34]:
        - option "Square"
        - option "Circle" [selected]
    - generic "Pixel paints hard aliased stamps (pixel art). Soft paints a round tip with hardness falloff. Image paints a grayscale tip as an alpha mask tinted with the paint color." [ref=e35]:
      - text: Brush tip
      - combobox "Brush tip" [ref=e36]:
        - option "Pixel (hard)" [selected]
        - option "Soft round"
        - option "Image"
    - generic "Map pen pressure to brush size, paint alpha, or both. Mice always paint at full pressure." [ref=e37]:
      - text: Pressure response
      - combobox "Pressure response" [ref=e38]:
        - option "None" [selected]
        - option "Size"
        - option "Opacity"
        - option "Size + opacity"
    - generic "Smooth stroke edges with partial-pixel coverage. Disables Pixel perfect." [ref=e39]:
      - checkbox "Anti-aliasing" [ref=e40]
      - text: Anti-aliasing
    - generic "Keeps 1px strokes exactly 1px thick. Only applies at brush size 1 without anti-aliasing and with wrap off." [ref=e41]:
      - checkbox "Pixel perfect" [ref=e42]
      - text: Pixel perfect
    - 'generic "Steady the stroke: rope leashes the tip, follow chases the cursor with smoothing." [ref=e43]':
      - text: Stabilizer
      - combobox "Stabilizer" [ref=e44]:
        - option "None" [selected]
        - option "Rope"
        - option "Follow"
    - 'generic "How paint combines with existing pixels: normal blends over, copy replaces, eraser clears alpha (E toggles)." [ref=e45]':
      - text: Blend mode
      - combobox "Blend mode" [ref=e46]:
        - option "Normal" [selected]
        - option "Copy"
        - option "Eraser"
    - generic "When on, dabs build over each other while scrubbing; when off, the stroke keeps uniform coverage." [ref=e47]:
      - checkbox "Accumulate" [checked] [ref=e48]
      - text: Accumulate
  - generic [ref=e49]:
    - generic [ref=e50]:
      - button "Pencil" [ref=e51] [cursor=pointer]:
        - generic [ref=e52]: ✎
      - button "Loupe" [ref=e53] [cursor=pointer]:
        - generic [ref=e54]: ⌕
      - button "Bucket fill" [ref=e55] [cursor=pointer]
      - button "Eyedropper" [ref=e60] [cursor=pointer]
      - button "Line" [ref=e64] [cursor=pointer]:
        - generic [ref=e65]: ╲
      - button "Curve" [ref=e66] [cursor=pointer]:
        - generic [ref=e67]: 〜
      - button "Rectangular selection" [ref=e68] [cursor=pointer]:
        - generic [ref=e69]: ▭
      - button "Destructive selection transform" [ref=e70] [cursor=pointer]:
        - generic [ref=e71]: ✛
      - button "Non-destructive cell transform" [ref=e72] [cursor=pointer]:
        - generic [ref=e73]: ⤢
      - button "3D rotation" [ref=e74] [cursor=pointer]:
        - generic [ref=e75]: ⟳
      - button "Destructive 3D rotation" [ref=e76] [cursor=pointer]:
        - generic [ref=e77]: ⟲
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
    - generic [ref=e125]: "#000000"
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
  7046 |         payload.raw(new Array<number>(6).fill(0));
  7047 |         payload.u8(255).u8(0).u8(0);
  7048 |         payload.u8(0);
  7049 |         payload.str(entry.name);
  7050 |       }
  7051 |       return new Writer().wrap(0x2018, payload);
  7052 |     };
  7053 |     const frameChunk = (duration: number, chunks: Writer[]): Writer => {
  7054 |       const body = new Writer();
  7055 |       for (const chunk of chunks) {
  7056 |         body.raw(chunk.bytes);
  7057 |       }
  7058 |       const out = new Writer();
  7059 |       out.u32(16 + body.bytes.length);
  7060 |       out.u16(0xf1fa).u16(chunks.length).u16(duration).u8(0).u8(0).u32(chunks.length);
  7061 |       return out.raw(body.bytes);
  7062 |     };
  7063 |     const blue = new Uint8Array(16 * 4);
  7064 |     for (let i = 0; i < 16; i += 1) {
  7065 |       blue[i * 4] = 0;
  7066 |       blue[i * 4 + 1] = 0;
  7067 |       blue[i * 4 + 2] = 255;
  7068 |       blue[i * 4 + 3] = 255;
  7069 |     }
  7070 |     const red = new Uint8Array([255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255]);
  7071 |     // Frame 0 (100ms): blue background + red 2x2 square at (1,1).
  7072 |     // Frame 1 (250ms): blue background + linked copy of the red square.
  7073 |     const frameZeroChunks = [
  7074 |       layerChunk("bg", 1 | 8),
  7075 |       layerChunk("fg", 1),
  7076 |       await imageCel(0, 0, 0, 4, 4, blue),
  7077 |       await imageCel(1, 1, 1, 2, 2, red),
  7078 |     ];
  7079 |     if (tagEntries.length > 0) {
  7080 |       frameZeroChunks.push(tagsChunk(tagEntries));
  7081 |     }
  7082 |     const frames = [
  7083 |       frameChunk(100, frameZeroChunks),
  7084 |       frameChunk(250, [await imageCel(0, 0, 0, 4, 4, blue), linkedCel(1, 1, 1, 0)]),
  7085 |     ];
  7086 |     const out = new Writer();
  7087 |     const body = new Writer();
  7088 |     for (const entry of frames) {
  7089 |       body.raw(entry.bytes);
  7090 |     }
  7091 |     out.u32(128 + body.bytes.length);
  7092 |     out.u16(0xa5e0).u16(frames.length).u16(4).u16(4).u16(32).u32(1).u16(100);
  7093 |     out.u32(0).u32(0).u8(0).u8(0).u8(0).u8(0).u16(0).u8(0).u8(0);
  7094 |     out.i16(0).i16(0).u16(0).u16(0);
  7095 |     out.raw(new Array<number>(84).fill(0));
  7096 |     out.raw(body.bytes);
  7097 |     return new Uint8Array(out.bytes);
  7098 |   }, tags ?? []);
  7099 | }
  7100 | 
  7101 | /** Stub the OS file picker to serve in-memory bytes as the picked file. */
  7102 | async function stubAsepritePicker(
  7103 |   page: import("@playwright/test").Page,
  7104 |   fileName: string,
  7105 |   bytes: Uint8Array,
  7106 | ): Promise<void> {
  7107 |   await page.evaluate(
  7108 |     ([name, data]: [string, number[]]) => {
  7109 |       const root = window as unknown as {
  7110 |         showOpenFilePicker?: () => Promise<Array<{ getFile(): Promise<File> }>>;
  7111 |       };
  7112 |       root.showOpenFilePicker = async () => [
  7113 |         {
  7114 |           getFile: async () => new File([new Uint8Array(data)], name, { type: "application/octet-stream" }),
  7115 |         },
  7116 |       ];
  7117 |     },
  7118 |     [fileName, Array.from(bytes)] as [string, number[]],
  7119 |   );
  7120 | }
  7121 | 
  7122 | async function animationFrameCount(page: import("@playwright/test").Page): Promise<number> {
  7123 |   return page.evaluate(() => {
  7124 |     const root = window as unknown as { __gnumarus?: { engine?: { getFrameCount(): number } } };
  7125 |     return root.__gnumarus?.engine?.getFrameCount() ?? -1;
  7126 |   });
  7127 | }
  7128 | 
  7129 | async function frameDuration(
  7130 |   page: import("@playwright/test").Page,
  7131 |   frame: number,
  7132 | ): Promise<number | null> {
  7133 |   return page.evaluate((target: number) => {
  7134 |     const root = window as unknown as {
  7135 |       __gnumarus?: { engine?: { getEffectiveFrameDuration(frame: number): number } };
  7136 |     };
  7137 |     return root.__gnumarus?.engine?.getEffectiveFrameDuration(target) ?? null;
  7138 |   }, frame);
  7139 | }
  7140 | 
  7141 | test("File > Import loads layers, frames and durations from .ase", async ({ page }) => {
  7142 |   await page.goto("/");
  7143 |   await page.waitForSelector("gnumarus-shell");
  7144 |   await stubAsepritePicker(page, "hero.ase", await buildAsepriteBytes(page));
  7145 |   await page.getByRole("button", { name: "File" }).click();
> 7146 |   await page.getByRole("button", { name: "Import" }).click();
       |                                                      ^ Error: locator.click: Error: strict mode violation: getByRole('button', { name: 'Import' }) resolved to 2 elements:
  7147 |   const toast = page.locator('gnumarus-shell [data-testid="toast"]');
  7148 |   await expect(toast).toBeVisible();
  7149 |   await expect(toast).toContainText("Imported hero.ase (2 layers, 2 frames)");
  7150 |   // Active layer is the top one (fg, 2x2 red texture): texture-space pixels.
  7151 |   expect(await readPixel(page, 0, 0)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  7152 |   expect(await readPixel(page, 1, 1)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  7153 |   // The 2x2 square at canvas (1,1) centers on the 4x4 canvas: offset (0,0).
  7154 |   const layers = await page.evaluate(() => {
  7155 |     const root = window as unknown as {
  7156 |       __gnumarus?: { engine?: { getLayers(): Array<{ id: string; transform: { x: number; y: number } }> } };
  7157 |     };
  7158 |     return root.__gnumarus?.engine?.getLayers() ?? [];
  7159 |   });
  7160 |   expect(layers.map((layer) => layer.id)).toEqual(["layer0", "layer1"]);
  7161 |   expect(layers[1]?.transform).toMatchObject({ x: 0, y: 0 });
  7162 |   // Switch to the background layer: solid blue 4x4.
  7163 |   await page.locator('gnumarus-shell [data-layer-id="layer0"] .layer-name').click();
  7164 |   expect(await readPixel(page, 0, 0)).toEqual({ r: 0, g: 0, b: 255, a: 255 });
  7165 |   expect(await readPixel(page, 3, 3)).toEqual({ r: 0, g: 0, b: 255, a: 255 });
  7166 |   expect(await animationFrameCount(page)).toBe(2);
  7167 |   expect(await frameDuration(page, 0)).toBe(0.1);
  7168 |   expect(await frameDuration(page, 1)).toBe(0.25);
  7169 | });
  7170 | 
  7171 | test("File > Import loads frame tags as named animations", async ({ page }) => {
  7172 |   await page.goto("/");
  7173 |   await page.waitForSelector("gnumarus-shell");
  7174 |   await stubAsepritePicker(
  7175 |     page,
  7176 |     "tagged.ase",
  7177 |     await buildAsepriteBytes(page, [{ name: "wave", from: 1, to: 1, loop: 2, repeat: 0 }]),
  7178 |   );
  7179 |   await page.getByRole("button", { name: "File" }).click();
  7180 |   await page.getByRole("button", { name: "Import" }).click();
  7181 |   const toast = page.locator('gnumarus-shell [data-testid="toast"]');
  7182 |   await expect(toast).toBeVisible();
  7183 |   await expect(toast).toContainText("Imported tagged.ase (2 layers, 2 frames, 1 animation)");
  7184 |   await expect(page.locator('gnumarus-shell [data-testid="animation-select"]')).toContainText("wave");
  7185 |   const matrix = page.locator('gnumarus-shell [data-testid="animation-matrix"]');
  7186 |   await page.locator('gnumarus-shell [data-testid="animation-select"]').selectOption("wave");
  7187 |   await expect(matrix.locator('.anim-frame-header:has([data-frame="1"])')).toHaveClass(/in-animation/);
  7188 |   await expect(matrix.locator('.anim-frame-header:has([data-frame="0"])')).not.toHaveClass(/in-animation/);
  7189 |   // Playback scopes to the tagged frame and stays there.
  7190 |   await matrix.getByRole("button", { name: "Play animation", exact: true }).click();
  7191 |   await expect.poll(async () => getMatrixFrame(page), { timeout: 5000 }).toBe(1);
  7192 |   await page.waitForTimeout(400);
  7193 |   expect(await getMatrixFrame(page)).toBe(1);
  7194 |   await matrix.getByRole("button", { name: "Stop animation", exact: true }).click();
  7195 |   await expect(matrix.getByRole("button", { name: "Play animation", exact: true })).toBeVisible();
  7196 | });
  7197 | 
  7198 | function psdU16(value: number): number[] {
  7199 |   return [(value >> 8) & 0xff, value & 0xff];
  7200 | }
  7201 | 
  7202 | function psdU32(value: number): number[] {
  7203 |   return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
  7204 | }
  7205 | 
  7206 | function psdI32(value: number): number[] {
  7207 |   return psdU32(value < 0 ? 0x100000000 + value : value);
  7208 | }
  7209 | 
  7210 | function psdI16(value: number): number[] {
  7211 |   return psdU16(value < 0 ? 0x10000 + value : value);
  7212 | }
  7213 | 
  7214 | function psdAscii(text: string): number[] {
  7215 |   return [...text].map((char) => char.charCodeAt(0) & 0xff);
  7216 | }
  7217 | 
  7218 | function psdPascal4(text: string): number[] {
  7219 |   const chars = psdAscii(text);
  7220 |   const pad = (4 - ((1 + chars.length) % 4)) % 4;
  7221 |   return [chars.length, ...chars, ...new Array<number>(pad).fill(0)];
  7222 | }
  7223 | 
  7224 | interface PsdTestPlane {
  7225 |   id: number;
  7226 |   payload: number[];
  7227 | }
  7228 | 
  7229 | interface PsdTestLayer {
  7230 |   top: number;
  7231 |   left: number;
  7232 |   bottom: number;
  7233 |   right: number;
  7234 |   opacity?: number;
  7235 |   flags?: number;
  7236 |   name?: string;
  7237 |   planes: PsdTestPlane[];
  7238 | }
  7239 | 
  7240 | function buildPsdBytes(
  7241 |   width: number,
  7242 |   height: number,
  7243 |   layers: PsdTestLayer[],
  7244 |   composite?: number[][],
  7245 | ): Uint8Array {
  7246 |   const out: number[] = [
```