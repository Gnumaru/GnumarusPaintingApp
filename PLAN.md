# PLAN — Gnumaru's Painting and Animation App (MVP v1)

## 1. Goal
Frontend-only single page web app for digital painting, pixel art, vector art and frame-by-frame animation, accelerated with WebGL2. MVP v1 is a classic desktop-like shell (top menu bar, central content, bottom status bar) with a single pixel-art pencil tool, single layer, and File > New/Open/Save backed by the File System Access API over a project directory.

## 2. Locked decisions
- WebGL2-only. Fail fast with explicit message when `webgl2` context is unavailable. No WebGL1 fallback.
- Most recent libraries at scaffolding time (all permissive licenses, no GPL/viral):
  - `three@0.187.0` (MIT) — single `WebGLRenderer` (WebGL2), ortho camera for raster, persp camera reserved for future 3D reference layers.
  - `lit@3.3.3` (BSD-3-Clause) — UI components (menu bar, toolbar, status bar) via Web Components. Canvas loop stays outside Lit reactivity.
  - `vite@8.3.5` (MIT) — build with `base: './'` so the app works at `/` or any nested path.
  - `typescript@7.0.2` (Apache-2.0) — `strict: true`, no `any` unless impossible.
  - `vitest@5.1.0` (MIT) — unit tests. `@playwright/test@1.64.1` (Apache-2.0) — E2E in headless Chromium.
- No `twgl.js` / `gl-matrix` / `earcut` direct deps in v1 (covered by Three). No WASM in v1. No `paper.js` / `resvg` in v1. Vector stays as future work; SVG renders natively in-browser for UI/overlay only.
- RAM conservative: one `Uint8Array` RGBA pixel buffer per layer, one `THREE.DataTexture` (`NearestFilter`) per layer, lazy `import()` of `three/addons` loaders only when 3D is added (v2).

## 3. MVP scope (v1 + layers + channel lock + layer resize)
- Shell: top menu bar (File > New, Open, Save), left toolbar (pencil + color + zoom readout), central WebGL2 canvas, right layers panel, bottom status bar (tool, color, cursor pixel, canvas size, zoom, project name, dirty flag, FS API support).
- Canvas engine (`src/canvas/GnumarusCanvasEngine.ts`): Three WebGL2 renderer, `NearestFilter`, fullscreen textured quads, integer zoom (wheel) + pan (middle-drag / space-drag), DPR-aware, per-layer transform, channel-locked painting, per-layer resize with texture realloc.
- Pencil: 1px solid color, no anti-aliasing, Bresenham line interpolation between pointer events, draws into CPU buffer then `texture.needsUpdate`, masked by `lockedChannels`.
- Channel lock: per-layer `{ r, g, b, a }`, any combination; paint/clear/merge write only unlocked channels; persisted in `project.json`; legacy defaults to unlocked.
- Layer resize: per-layer width/height 1..1024; expand right/down transparent, shrink crops right/below, top-left preserved; undoable.
- New: dialog for width/height (default 64x64, clamp 1..1024), clears buffer.
- Open/Save: `showDirectoryPicker()` (Chromium). Project directory format (forward-compatible with future animation, multi-layer with locks):
  - `project.json`: `{ app, version, width, height, layers: [{ id, name, visible, opacity, width, height, transform, lockedChannels, cells: [{ frame, file }] }] }`
  - `cells/<layerId>_frame0.png`
  - Open reads `project.json` + PNGs into buffers. Save writes `project.json` + PNGs encoded from buffers.
- Status bar reflects state after every action. All user-visible strings in American English.

## 4. Non-goals for v1
No animation/timeline, no vector editing, no 3D viewport, no filters, no WASM, no `file` single-file format.

## 5. Verification
- `npm run build` passes (tsc strict + vite, relative `./assets/` output verified for nested hosting).
- `npm run test`: 49/49 Vitest unit tests pass (pixel buffer, channel lock, layer resize, viewport, project format, checker, history).
- `npm run test:e2e`: 23/23 Playwright/Chromium tests pass (boot+menu, New dialog, real pencil stroke, layers, channel lock paint/merge/undo, layer resize dialog/undo).
- Fixed during implementation: Lit class-field shadowing (reactive fields use `declare` + constructor init), local minimal `src/three.d.ts` so no new `@types/three` dependency was needed; fixed `historyLayerFor` to use layer width (was project width) and layer-panel click bubbling so row selection works with lock toggles; layer resize recreates `DataTexture` and restores it on undo/redo.

## 6. Channel lock (implemented)
- Goal: allow locking any combination of the 4 RGBA channels per layer.
- Semantics: painting, clear and Merge Down write only unlocked channels; locked channels keep the old pixel value. Example: alpha locked + paint keeps old alpha; green locked + cyan paint yields blue.
- Storage: `lockedChannels: { r, g, b, a }` per layer in `project.json`, backward compatible (missing defaults to all unlocked).
- UI: per-layer R/G/B/A toggles in the layers panel, persisted, marked dirty, not undoable (like other structural ops); merge snapshot restores the removed layer lock on undo.
- Tests: unit tests for masked `setPixel`/`drawPixelLine`/`clear`/`composite`, project round-trip with locks, plus Playwright e2e for toggle + paint + persistence.

## 7. Layer resize (implemented)
- Goal: allow setting new dimensions per layer. Larger expands right and down with transparent pixels. Smaller crops excess right and below.
- Semantics: top-left content preserved verbatim (all channels, locks ignored). Expand fills new right/bottom area with `(0,0,0,0)`. Shrink discards right/bottom pixels. Same dimensions is a no-op (no history).
- Validation: integer dimensions clamped to 1..1024. Invalid layer or out-of-range input rejected.
- Engine: `resizeLayer(id, w, h)` reallocates `Uint8ClampedArray`, recreates `THREE.DataTexture`, relayouts planes, marks dirty, pushes undoable history entry with before/after buffers.
- History: new `resize` entry `{ layerId, beforeWidth/Height/Buffer, afterWidth/Height/Buffer }` with apply-resize callback in undo/redo. Skips missing layers like other entries.
- UI: per-row Resize button opens a dialog with width/height inputs (prefilled), Resize/Cancel actions. Marked dirty, status message, panel refresh.
- Tests: unit tests for `resizePixelBuffer` (expand/shrink/no-op/transparent fill) and history resize undo/redo, plus Playwright e2e for dialog + expand paint + shrink crop + undo/redo.

## 8. Pixel grid (implemented)
- Goal: overlay grid over the currently edited layer, following its transform, visible only at high zoom.
- Semantics: grid lines at pixel boundaries of the active layer, same project-space math as painting so display and editing agree. Hidden when zoom is below the configured threshold. Default threshold 200 percent, never below 200 percent.
- Engine: dedicated grid plane with shader, same matrix as the active layer, z slightly above. Visibility = zoom >= gridMinZoom. Grid dimensions follow active layer size.
- Settings: `Edit > Settings` numeric input in percent, min 200, max 6400 (editor max zoom 64x). Clamped, persisted to `localStorage`, applied live. Invalid or missing storage falls back to default 200 percent.
- Tests: unit tests for grid settings parse/clamp/serialize and visibility rule, plus Playwright e2e for hidden below threshold, visible above, threshold change via Settings, and rotation following.

## 9. Pixel grid uniformity fix (implemented)
- Symptom: with pure black checkerboard at max zoom, grid lines appeared non-deterministic when zooming in/out: sometimes only horizontal, only vertical, or repeating visible/invisible pattern within the same zoom level.
- Cause: grid fragment used `mediump` precision plus fixed `0.5 / uZoom` width in layer-pixel space. At high zoom the line width in UV space approaches fragment spacing and `mediump` varying quantization skips lines depending on alignment.
- Fix: use `highp` precision with screen-space derivative (`fwidth`) anti-aliasing so lines stay 1 screen pixel wide regardless of zoom, pan or rotation. Removed `uZoom` uniform.

## 10. Settings reset, background mode and final preview (implemented)
- Change pixel grid default minimum zoom to 1000 percent.
- Every setting gets a per-setting reset to factory default: a circular arrow appears only when the value differs from default; clicking resets that setting and the arrow disappears.
- New background setting: canvas background is checkerboard (default) or solid color. Solid mode shows a color picker; checkerboard mode keeps all previous checker options.
- New final render preview: small floating resizable window with internal zoom and pan rendering the flattened image as a single PNG export would look.

## 11. Custom color picker (implemented)
- Stopped using the browser color picker; implemented a custom picker with models RGB, CMYK, HSV, HSL (default), OKHSL, OKHSV and ARD (angle/ratio/diagonal cylindrical coordinates around the RGB cube diagonal, inspired by Krita Pigment.O).
- Every model carries an alpha axis; RGBA axes span 0..255. ARD Diagonal spans 0..360 and Ratio 0..255.
- Every axis gets a draggable gradient bar plus an editable numeric input beside it. Non-RGBA, non-hue axes are percentages with one decimal; hue axes span 0..360. Each bar renders the gradient of its own axis from minimum to maximum (e.g. HSL hue bar runs red 0 through the spectrum back to red 360).
- OKHSL/OKHSV use our own Oklab-based implementation (no new dependencies). Other models preserve the current alpha.
- Fixed frozen sliders: axis edits force a re-render even when the output hex is unchanged (e.g. editing hue/saturation while value is zero), so thumbs and inputs always follow the edited values.
