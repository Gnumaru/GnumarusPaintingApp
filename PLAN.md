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

## 12. Animation matrix (implemented)
- Project is a cell matrix: rows are layers, columns are animation frames, each cell is the intersection of one layer and one frame.
- Each cell references 0 or 1 cell content (empty cells render nothing); any number of cells may share the same content with no limit.
- Cell content = 0 or 1 project texture + cell settings (position, rotation, flip_x, flip_y). Project textures are the layer pixel buffers; each layer owns exactly one texture and new empty textures are created on demand.
- New frames start with all cells empty; painting or transforming an empty cell materializes content (and texture) as needed so existing single-frame behavior is unchanged.
- Animation matrix UI directly above the status bar: one row per layer, one column per frame. Cell context menu: dissociate content (empty the cell), create new content, associate an existing content; dissociate a content from its texture or associate it with another project texture. Frames can be added and removed (never the last one); clicking a cell or frame header selects layer and frame.
- Rendering, painting, transforms, history and the final preview resolve through the current frame (rendering shares texture buffers by reference, undo tags texture owners); the save format carries frames, contents, textures and cells with backward-compatible migration of legacy single-frame projects. Initial canvas fit is recomputed after the first layout so it matches later Reset Canvas Transform results.

## 13. Frame durations and playback (implemented)
- Each frame may carry an explicit duration in milliseconds, set from the frame context menu (dialog with Set/Clear); frames without one use the project default.
- Project settings gain a default frame duration (100 ms factory default), editable in Settings under an Animation section with the standard per-setting reset arrow; stored in project.json (not localStorage).
- Play/stop transport in the animation matrix corner starts playback from the currently selected frame; each frame shows for its own duration or the project default, looping until stopped; manual frame selection moves the playhead and playback continues from there.

## 14. Save shortcut Ctrl+S (implemented)
- `Ctrl+S` (plus `Cmd+S` on macOS for the same physical shortcut) triggers the same save flow as File > Save: if a project folder was already chosen it saves there without prompting, otherwise the OS directory picker is shown.
- Browser default save dialog is suppressed with `preventDefault`; shortcut works even when focus is inside inputs.

## 15. Bucket fill tool (implemented)
- New toolbar tool fills contiguous regions of identical RGBA color in the active cell texture with the current solid color (4-way flood fill, exact match on all four channels).
- Respects channel locks like the pencil (locked channels keep old values); fully-locked or same-color fills are no-ops with no history entry.
- Single click fills; undoable via the same region-diff history as strokes; empty cells materialize first; shortcut `B`.
- Bucket toolbar glyph is a monochrome geometric mark in the same style as pencil/loupe/transform (no color emoji).

## 16. Tool options bar + brush size/shape (implemented)
- A tool options bar sits immediately below the menu bar for the active tool. Tools without settings show exactly `the <tool-name> tool does not have any setting or helper button`.
- Pencil options: brush size integer 1..64 (clamped) and shape square/circle (disk mask for circle); stamping along the stroke path; same channel-lock masking; undoable.
- Bucket toolbar glyph is a monochrome geometric mark in the same style as pencil/loupe/transform (no color emoji).

## 17. Line tool + brush/line previews (implemented)
- New line tool: two clicks define start/end, draws the connecting segment with width 1..64, square/circle ends and optional anti-aliasing; undoable; shortcut `N`.
- Pencil shows a live tip preview (shape/size) following the mouse; line shows a tip preview plus a rubber-band segment preview after the first click.

## 18. Pencil anti-aliasing + Delete clears cell (implemented)
- Pencil options gain an anti-aliasing checkbox (same smoothing as the line tool); strokes blend edge pixels honoring channel locks.
- `Delete` (no modifiers, outside text fields, shadow-DOM aware via composed path) resets the current cell texture to zeros in all RGBA channels, ignoring channel locks; undoable; no-op on empty/already-empty cells.

## 19. Float brush/line widths (implemented)
- Brush size and line width accept floats 0.1..64 (number inputs min 0.1 step 0.1).
- Anti-aliasing off uses the value rounded to the nearest integer (min 1); anti-aliasing on uses the real float value, so 1.5 renders between 1 and 2.

## 20. Cubic Bezier curve tool (implemented)
- New curve tool (`C`, `〜` glyph): press-drag-release sets start/end, then one click sets the start control point and a final click sets the end control point; the cubic is then rasterized into the current cell texture.
- Live preview while drawing: curve path, control-point markers and thin handle lines (endpoint to its control); all auxiliaries destroyed after commit/cancel (`Escape` cancels).
- Curve options like line/pencil: width 0.1..64 (rounded when AA off, float when on), square/circle ends, anti-aliasing checkbox.

## 21. Shortcuts, UI hide, layer nav, insert, merge-down (implemented)
- Loupe shortcut moves from `L` to `Z` (no-modifier `z`; `Ctrl+Z` undo unaffected).
- `Tab` toggles all chrome (menu/tool-options/toolbar/layers/matrix/status) leaving only the canvas; `preventDefault` everywhere except open modal dialogs and text fields (focus-trap and focus navigation preserved).
- `PageUp`/`PageDown` select the layer above/below with wrap-around (top+Up→bottom, bottom+Down→top); a canvas-overlay toast `pos/total: name` (1 = bottom) shows even when the UI is hidden, auto-hiding after ~2s.
- `Insert` inserts a new layer immediately above the current one and selects it; `Ctrl+E` merges the active layer down exactly like the context-menu item (which already samples through the lower layer transform).

## 22. Pencil on B, blend modes normal/copy/eraser (implemented)
- Pencil shortcut moves from `P` to `B`; bucket moves from `B` to `G` (no-modifier keys; `Ctrl` combos unaffected).
- Shared paint blend mode: `normal` (default; straight-alpha source-over, so translucent black darkens progressively like Krita/Photoshop), `copy` (old direct replacement, ignores alpha blending), `eraser` (ignores RGB, subtracts paint alpha from pixel alpha down to 0; honors alpha locks), selectable in pencil/bucket/line/curve options; honored by every color-paint path including anti-aliased edge blending and flood fill.
- `E` toggles eraser on/off remembering the previous non-eraser mode; new `Accumulate` checkbox (on by default) on pencil/line/curve: off builds a union coverage mask per stroke and applies it once (uniform, Krita-like), on keeps accumulating onto the live pixels.

## 23. Always-visible HSV triangle + hue ring (implemented)
- Color picker popup gains an HSV section that is always visible regardless of the selected model: a triangle (white corner, black corner, full-saturation corner, full-area gradient) inside a hue ring.
- Dragging the triangle sets the current color to the gradient point (S = x fraction, V = 1 - y fraction, hue kept from a tracked value that survives achromatic colors); dragging the ring sets only the hue (S/V kept); alpha is always preserved; model axes/hex stay in sync.
- Keyboard support on both controls; pure geometry/color helpers unit-tested.

## 24. Brush stabilizer (implemented)
- Pencil options gain a Stabilizer dropdown: `none` (default, no stabilization), `rope` (leash), `follow` (smoothing chase).
- Rope mode: paint focus stays until the cursor exceeds the configurable rope length (1..200 layer pixels, default 20); beyond that the focus is dragged so the cursor-focus distance stays equal to the rope length.
- Follow mode: paint focus chases the cursor every pointer move plus a `requestAnimationFrame` catch-up loop while the button is held or the preview is converging; the typed Follow strength 1..100 (default 20) is used as `strength = typed / 100`, so one step is `pos + (target - pos) * (typed / 100)` and speed is proportional to strength and to distance (farther moves faster). Typed 100 (= 1.0) is nearly instant (like none); typed 5 (= 0.05) lags heavily.
- Engine stores mode/rope/strength plus float focus/target in layer-image space; stabilized strokes paint `oldFocus -> newFocus` with the same brush/AA/blend/accumulate paths (aliased segments floored to match `toImagePixel`, fixing a Bresenham non-termination with floats); hover also tracks for preview. A stabilizer dot plus rope line overlay shows the true paint focus.
- Shell shows Rope length only for rope and Follow strength only for follow, with test hooks and status messages. Pure math lives in `src/canvas/GnumarusStabilizer.ts` with unit tests; E2E covers dropdown, conditional inputs, and painting with each mode.

## 25. Pixel perfect pencil + curve (implemented)
- Pencil and curve options gain a `Pixel perfect` checkbox, off by default. It only takes effect at exactly size/width 1 with anti-aliasing off; otherwise painting is unchanged (checkbox disabled in the UI, engine treats it as off).
- While active, pencil strokes and curve commits stay exactly 1px thick: each painted pixel has at most 2 painted 8-neighbors within that stroke. Sharp square corners are converted to diagonal corners by retroactively eating the elbow pixel (restored from the stroke base snapshot, or cleared from the union mask when Accumulate is off). Crossing/revisiting your own line always paints, so loops may exceed 2 neighbors.
- Pure stateful filter `GnumarusPixelPerfectStroke` in `src/canvas/GnumarusPixelPerfect.ts` (per-stroke painted set + paint order with tombstones, revisit-always-paints, consecutive-duplicate suppression across walk segment joints, recent-window (4) exception for crossings, Bresenham/cubic walkers mirroring the rasterizer candidate order). Engine applies it after stabilizer quantization, for accumulate on (per-pixel `setPixel`) and off (mask bits + one repaint); locks/blend/history unchanged.
- Unit tests for the filter (straights intact, corner/stair eating with `drainRemoved`, crossings, OOB, walker parity with `drawPixelLine`/`drawCubicBezier`); E2E for checkbox gating, pencil thinning + control contrast, crossings, curve thinning + undo.

## 26. View shortcuts + shift-drag tool size (implemented)
- `4`/`6` (main + numpad) rotate the canvas by a configurable step, default 15 degrees; `5` (main + numpad) resets canvas rotation only; `1` (main) sets zoom 100%; `2` (main) fits the rotated canvas bbox exactly on screen (fit zoom plus centered pan, same integer-floor rule as Reset Canvas Transform).
- New `rotationStepDeg` setting 1..90 in Settings (Canvas view section) with per-setting reset arrow, `Reset defaults` support and localStorage persistence, pushed to the engine via `setRotationStepDeg`.
- Shift+Left-drag with pencil/line/curve adjusts that tool's size live from horizontal movement only (right bigger, left smaller, 20 screen px per unit, clamped 0.1..64); the brush tip preview resizes in real time and the shell options + status follow through `onToolSizeChanged`; no painting starts.

## 27. Eyedropper, bucket shortcut, layer reset transform, alt+middleclick (implemented)
- `F` selects the bucket tool.
- Layer context menu gains `Reset transform` (rotation, flips and position back to identity via `resetLayerTransform`, undoable: no, like other transform edits; marks dirty).
- Canvas/layer transform reset gesture moved from Ctrl+middleclick to Alt+middleclick (loupe resets the view, transform resets the active layer).
- New eyedropper tool (toolbar button, monochrome drop glyph): click copies the clicked active-cell pixel RGBA into the paint color via `onEyedropperPick` + `setPencilColor`; never paints, records history or materializes empty cells. Holding Ctrl temporarily switches to eyedropper and releasing Ctrl restores the previous tool (manual tool changes cancel the temp mode; repeat keydown guarded; Ctrl combos unaffected).

## 28. Frame/layer menus plus arrow-key navigation (implemented)
- Frame menu gains Add before / Add after (`insertFrame` shifts cells and durations, selects the new empty frame).
- Layer menu gains Add above / Add below (relative to the clicked layer, selects the new layer).
- ArrowLeft/Right select the previous/next frame with wraparound; ArrowUp/Down select the layer above/below like PageUp/PageDown (toast included).
- Shift+Up/Down moves the active layer in the stack with wraparound (`moveLayerWrapping`); Shift+Left/Right moves the current frame with wraparound (`moveFrame` swap, selection follows).
- Arrow shortcuts stay out of text fields and of the color picker (ring/triangle/bars keep their own Arrow/Shift+Arrow keys); pure cell/duration remap helpers in the animation model are unit-tested.

## 11. Custom color picker (implemented)
- Stopped using the browser color picker; implemented a custom picker with models RGB, CMYK, HSV, HSL (default), OKHSL, OKHSV and ARD (angle/ratio/diagonal cylindrical coordinates around the RGB cube diagonal, inspired by Krita Pigment.O).
- Every model carries an alpha axis; RGBA axes span 0..255. ARD Diagonal spans 0..360 and Ratio 0..255.
- Every axis gets a draggable gradient bar plus an editable numeric input beside it. Non-RGBA, non-hue axes are percentages with one decimal; hue axes span 0..360. Each bar renders the gradient of its own axis from minimum to maximum (e.g. HSL hue bar runs red 0 through the spectrum back to red 360).
- OKHSL/OKHSV use our own Oklab-based implementation (no new dependencies). Other models preserve the current alpha.
- Fixed frozen sliders: axis edits force a re-render even when the output hex is unchanged (e.g. editing hue/saturation while value is zero), so thumbs and inputs always follow the edited values.

## 29. Toast display time setting (implemented)
- New `GnumarusToastSettings` (`src/settings/GnumarusToastSettings.ts`): `durationSec` float 0.5..2.0, default 1.0, `localStorage` persisted, clamped, `durationMs` legacy accepted.
- Settings gains an Interface section with numeric input (min 0.5 max 2.0 step 0.1) plus per-setting reset arrow and `Reset defaults` support.
- `showToast` uses `clampToastDurationSec * 1000`; test hooks `setToastDurationSec`.

## 30. Click selection also shows the toast (implemented)
- Layers panel click (`onSelectLayer`), frame header click (`onSelectFrame`) and matrix cell click (`onCellClick`) now show the same toast as the keyboard shortcuts.
- Cell clicks changing both layer and frame show a combined `pos/total: layer — Frame i/n: frame` message; single changes show the respective toast.

## 31. Automatic layer names start at 1 (implemented)
- Initial layer is `Layer 1` (`layer0` id kept for compatibility, `Layer 1 pixels` texture); `insertLayerAt` names new layers `Layer ${counter + 1}` so ids `layer0, layer1, layer2` map to names `Layer 1, Layer 2, Layer 3`.
- `createDefaultProject` and `newProject` updated; old projects load unchanged.

## 32. Named frames (implemented)
- Engine stores `frameNames: string[]` plus `frameNameCounter` for unique defaults (`Frame 1, Frame 2, ...`); pure helpers `defaultFrameName`, `normalizeFrameName` (trim 1..64), `ensureFrameNames`, `insertFrameNames`, `swapFrameNames` in `GnumarusAnimationModel`.
- `insertFrame` inserts `Frame ${counter++}`, `removeFrame` splices, `moveFrame` swaps names; `renameFrame` validates; `getFrameName(s)` accessors; matrix view carries `frameNames`; `export/loadAnimationProject` round-trips `frameNames`; `project.json` gains required `frameNames` (legacy migrates to defaults, invalid rejected).
- UI: frame headers show names (double-click inline rename, Enter commits, Escape/blur cancels, context menu `Rename frame…` plus dialog); status bar `Frame i/n: name` and toasts `Frame i/n: name`; aria labels/titles include names.

## 33. Cell content picker modal (implemented)
- Removed dynamic per-content and per-texture items from the cell context menu, leaving a single fixed `Select content` item.
- Clicking `Select content` opens a modal with a vertically scrolling grid of names plus thumbnails for every cell content, alphabetically sorted. First grid item is always `No content` (dissociates the cell), second is `New content` (creates a new empty content, assigns it to the cell, then opens the texture picker), remaining items are the project contents alphabetically sorted. Choosing an item applies it to the cell and closes the modal.
- `New content` opens a second similar modal to choose a texture: first item `No texture` (leaves the new content textureless), second `New texture` (creates a new empty project-sized texture and assigns it to the new content), remaining items are the project textures alphabetically sorted with thumbnails. Choosing applies the texture to the new content (already assigned to the cell) and closes the modal.
- Thumbnails render the texture RGBA buffers via 2D canvas `putImageData` converted to data URLs with pixelated rendering; empty contents and `No content`/`No texture` show a placeholder.

## 34. Texture naming Texture N (implemented)
- Textures named `Texture 1`, `Texture 2`, ... via unified `textureNameCounter` instead of `Layer N pixels`.
- Layer-owned textures (id `layer0`, etc.) and `texN` textures all use the same name sequence; `renameLayer` no longer renames its owned texture.
- `createDefaultProject` and legacy migration create `Texture N` names in order; load recomputes the name counter from max `Texture N` to avoid duplicates; merge undo restores the original texture name via snapshot.

## 35. Cell context menu position (implemented)
- Symptom: right-click on a matrix cell rendered the menu ~245px above the cell instead of adjacent to it.
- Cause: `openMatrixCellMenu` clamped `y` to `innerHeight - 300` even though the single-item menu is only ~40px tall; the matrix sits at the bottom of the screen so the clamp always pushed the menu far up. Same pattern affected frame/layer menus.
- Fix: store the raw cursor position and, after render (`updated()` → `fitContextMenusToViewport()`), shift the fixed-position menu left/up only by the measured overflow amount so it stays adjacent to the cursor while remaining fully inside the viewport.

## 36. New layers start with empty cells (implemented)
- `insertLayerAt` no longer creates a shared content or associates cells: every cell of a new layer starts empty (like new frames), keeping only the owned `Texture N` entry so resize/save/undo keep working.
- Painting or transforming an empty cell materializes content plus a `texN` texture on demand via `ensureCellContent`; assigning via the `Select content` modal associates existing or new content.
- Initial project, legacy load and merge-undo paths still create/restore their contents as before.

## 38. Help menu with shortcuts reference (implemented)
- New `Help` menu in the main menu bar with a `Shortcuts` item opening a scrollable modal dialog listing every keyboard shortcut in the app grouped by area (File, History, Layers, Frames, Tools, View, Interface) with what each one does.
- Content derived from the actual handlers (`onGlobalKeyDown` in the shell plus canvas key handling in the engine); E2E test opens Help > Shortcuts and checks representative entries plus dialog open/close.
## 37. Fit texture to size (implemented)
- New `Fit texture to size` item in the layer context menu (fits the layer's texture at the current frame) and in the cell context menu (fits that cell's content texture); disabled when the target has no texture.
- Clicking opens a modal with an integer field 0..254 plus `Cancel` and `OK`. On `OK` the texture is cropped on all four sides until the border rows/columns contain at least one pixel with alpha strictly greater than the parameter; fully transparent textures and already-tight textures are no-ops with a status message.
- Every cell content referencing the cropped texture has its transform shifted (`shiftTransformForCrop`, accounting for each content's own flip/rotation) so the remaining pixels keep the same apparent project position.
- Undoable via a new `fit` history entry carrying texture before/after buffers plus affected content transforms before/after; unit tests for the pure alpha bounding-box helper and the transform shift plus E2E for both menus, threshold clamping, apparent position, no-ops and undo/redo.

## 39. Frame-aware merge down (implemented)
- Merge down composites the current-frame visible transformed pixels of the active cell content over the transformed texture of the below layer's current cell content (unchanged sampling, opacity and lock masking).
- The merged (upper) layer is removed only when all of its cells in every other frame are empty or hold textureless contents; otherwise the layer is kept, only the current cell's content is dissociated (cell becomes empty) and the other frames stay untouched.
- All paths stay single-entry undoable: the history merge record carries a removed-layer flag, the dissociated cell, the associated lower cell and the texture link, with associate/dissociate/set-texture callbacks; unit tests for keep-layer and relink undo/redo plus E2E for multi-frame keep, empty-lower link and textureless-lower link (each with undo/redo).

## 40. Preview shows the canvas background (implemented)
- The final preview window renders the same background as the canvas: solid mode fills the flattened image with the solid color; checkerboard mode draws the same image-space squares (or screen-space squares in preview pixels) with the configured sizes and colors.
- `compositeFinalImage` gains an optional background argument (default keeps transparent output so existing behavior/tests are unchanged); the shell passes the engine's live checker/background settings on every preview refresh, including when those settings change while the preview is open.
- Unit tests for solid fill, checker pattern/sizes/phase and invalid input (all green); E2E for solid + checkerboard preview pixels with live settings changes while the preview stays open (green).

## 41. Rename transform tool display name (implemented)
- User-facing name of the `transform` tool is "non-destructive cell transform" (toolbar button label/title, tool options empty-state text and aria-label, status bar, shortcuts reference); internal tool id stays `transform` so engine/shell behavior and the `T` shortcut are unchanged.
- Updated the affected E2E expectations (tool options empty label, toolbar button name, status text, toolbar icon map, shortcuts modal entry); unit tests unaffected (no logic change).
