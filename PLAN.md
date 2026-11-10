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

## 29. Rectangular selection + destructive transform (implemented)
- Rectangular selection tool (`rectselect`): left-drag marks a rect on the current cell; on release the rect is cut out (transparent hole, locks ignored like Delete, undoable stroke) and becomes a floating texture (private copy, no cell of its own) with a marching-ants overlay (dual white/black SMIL-animated SVG polygons following layer and view transforms).
- Destructive transform tool (`destransform`, move-only for now): drag inside the visible floating rect moves it in integer cell pixels with a live GL plane; outside clicks are ignored so work is never baked accidentally. With no selection it auto-selects the whole current-cell texture first (same as a full rect cut). Enter, Return or Esc merges the floating texture back with an exact copy paste (lossless relocation, clipped, undoable); a Commit selection helper button in its options bar does the same for mouse-only users.
- Coherence: floating state is home-attached (layer/frame/texture) and survives navigation hidden; new cuts auto-commit the previous floating; moves never touch history; undo/redo track the cut entry by stack depth (deactivate/reactivate, detached buffer discarded on new edits, eviction-adjusted); resize/merge/fit commit when home-involved, layer removal and project loads drop it, cell transforms commit when home matches.

## 46. Tool tooltip shortcut prefixes + R/V shortcuts (implemented)
- Every toolbar tool tooltip starts with its selection shortcut, then the tool name, then the explanation (`B: Pencil (...)`, `G or F: Bucket fill (...)`, `Ctrl (hold): Eyedropper (...)`, `N`/`C`/`Z`/`T` likewise).
- Rectangular selection and destructive transform gain `R` and `V` shortcuts (previously shortcut-less), listed in the Shortcuts modal.

## 47. Magenta border on the free texture edges (implemented)
- Right and bottom edges of the current cell texture (where the axis lines are not) get a plain magenta (`#ff00ff`) border, following the same transform and visibility rules as the axes.

## 48. Destructive selection transform anchors (implemented)
- Rename tool to "destructive selection transform" (display strings only, id `destransform` stays).
- Resize anchors (rectangles at corners + edge midpoints, 1px min, no mirror), rotate anchors (quarter-circle arrows, offset outward from corners), skew anchors (double arrows beyond edge midpoints, per-axis screen-proportional shear), center anchor (circular arrow, click resets to the as-cut snapshot).
- Floating placement becomes center-based floats (pos/rotation/scale/skew); render via affine plane basis, commit via inverse-map nearest resample with tie epsilon; pure math in a unit-tested module.

## 49. Opposite-edge anchored skew (implemented, revised to centered mirror)
- Bug: opposite skew anchors dragged identically (center-based shear moves both edges oppositely), so e.g. dragging the top edge right moved the top edge left.
- First fix (superseded): dragged edge followed with the opposite edge anchored. Rejected: the opposite edge must mirror instead of staying fixed.
- Final behavior: centered shear with the center fixed — the dragged edge follows the cursor along the edge axis while the opposite edge mirrors it; dragging perpendicular to the edge projects to zero and does nothing. Top/bottom shear horizontally (along the box X axis), left/right vertically (along the box Y axis); per-side signs (top/left negative, bottom/right positive); shear direction comes from the on-screen box axes (uniform under rotation/scale). Pure local-unit math replaced by screen-proportional, scale-aware interaction.
- Bug: on auto-select the floating content rendered vertically flipped and shifted up-left by half its size.
- Root cause: the floating plane matrix copied `writePlaneMatrix` element layout but fed it corner-based coords; that layout requires center-based normalized coords with flipped V.
- Fix: position the quad through the same normalized convention (center basis + V flip), mapping through the floating placement.

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

## 42. Live final preview during non-destructive transforms (implemented)
- Root cause: `setLayerTransform`/`resetLayerTransform` fired no callbacks, so the open preview only refreshed when something else (e.g. layer switch via `refreshLayers`) recomposites it.
- Fix: new optional engine callback `onTransformChanged`, fired on both success paths, wired in the shell to `refreshPreview()` only — same per-move cost class as pencil strokes, no dirty-flag change.
- E2E: transform drag with the preview open asserts pixels move mid-drag, plus menu Reset transform re-assert.

## 43. Matrix layer rename menu + canvas axis overlay (implemented)
- Animation matrix layer names get a right-click menu with a single `Rename layer` item, mirroring `Rename frame` (dialog, trim/maxlength guard, dirty + status, refresh).
- Main canvas shows red X (top edge) and green Y (left edge) axis lines with arrowheads over the current cell texture, transformed with the cell (WebGL lines, hidden when the cell is empty).

## 50. Flip anchors + non-destructive anchor parity (implemented)
- Destructive selection transform gains flipX/flipY booleans (in placement, snapshot and commit resample): flip-n/s anchors above/below the center reset handle toggle flipX with the horizontal double-arrow icon; flip-e/w left/right of center toggle flipY with the vertical icon. Click toggles (tap pattern like reset); drags cancel the tap.
- Non-destructive cell transform gains the full anchor set (resize/rotate/skew/flip/center-reset) over the active layer box through a shared `placeBoxHandles` helper (same SVG groups, same placement). Required extending `GnumarusLayerTransform` with scaleX/scaleY/skewX/skewY (defaults 1/1/0/0): viewport math (`layerLinearMatrix`, float inverse, crop-shift through the linear map), engine inverse map, final render resample, project parse with back-compat defaults, `setLayerTransform` clamps (scale keeps >=1px effective, skew clamps ±2). Layer gestures mirror the floating ones (opposite-anchored resize, centered mirror skew, angle rotate, tap flip/reset, body move kept with down-point semantics so existing drag distances are unchanged).

## 51. Separate 3D rotation tools with trackball gizmo (implemented)

## 52. Aseprite (.ase/.aseprite) import (implemented)
- Frame-switch performance fix (found importing a real 3-layer 59-frame file): every shell render regenerated all picker thumbnails (`toDataURL` per texture, ~77ms for 60 textures) even with the dialogs closed, dominating the ~90ms Lit update. Content/texture picker dialogs now render only while open (open flows await `updateComplete` before `showModal`); frame-switch Lit commit dropped 89ms to 6ms in-headless. Structural e2e locks the lazy behavior.
- New `src/project/GnumarusAseprite.ts`: strict bounds-checked little-endian parser written from the published ase-file-specs document (no aseprite source code copied; only the format facts). Validates magic `0xA5E0`, exact file size, dimensions, depth, frame/frame-magic/chunk accounting, chunk sizes, cel/linked-frame ranges, inflate output sizes, indexed palette coverage. Any violation throws `GnumarusAsepriteError`.
- Imported subset: canvas size, layers (image layers incl. reference layers; groups flattened away, tilemaps skipped), visibility, opacity (header-flag-gated, baked cel opacity into alpha), frames + per-frame durations (header speed fallback), raw/zlib cels in RGBA/grayscale/indexed (palette state tracked progressively across frames, transparent index honored on non-background layers), linked cels resolved transitively into shared cell contents (link position/opacity from the link chunk). Ignored: blend modes (we composite normal), z-index (last cel wins per cell), tags/slices/tilesets/user data/color profiles/cel-extra scaling.
- Shell `File > Import` uses `showOpenFilePicker` (`.ase`/`.aseprite` filter); cancel is silent, other failures `console.error` + error toast, success loads the project (dirty, project name = file base name) + success toast. Caps: canvas/cel dims 1..4096, frames 1..10000. Decompression via native `DecompressionStream` (no new dependency).

## 53. Crop texture to canvas (implemented)
- New layer/cell context-menu item "Crop to canvas": crops the cell texture to the canvas-visible region computed from the cell content transform (position, rotation, flips, scale, skew, tilt), discarding outside excess; the content transform is re-seated via `shiftTransformForCrop` so rendering is unchanged. Fully outside content refuses with a message; already-inside is a no-op message. Undoable through the existing `fit` history record. Layer menu acts on that layer's current-frame cell; cell menu acts on that cell.
- Visibility box is a pure function (`canvasVisibleTextureBox` in viewport math): inverse-mapped canvas corners, outward texel expansion, texture clamp; null when degenerate or fully outside.
- Pre-existing bug fixed along the way: `applyFitToSize` (undo/redo path shared with fit-to-size) re-synced layer renders before restoring content transforms, leaving stale render transforms after undo; it now syncs again after the restore.

## 54. Fit dialog OK autofocus + default alpha threshold setting (implemented)

## 55. Resize to canvas + Ctrl+Shift+Arrow texture expand (implemented)
- Layer/cell context-menu item "Resize to canvas": crops excess AND pads transparent pixels so the texture covers the whole canvas area (union of the visible box and the canvas footprint in texture space), re-seating the transform via `shiftTransformForCrop` so rendering is pixel-identical. Refuses fully-outside/degenerate/oversize content; no-op when already exact. Undoable through the existing `fit` history record (crop body generalized to out-of-texture origins).
- Shortcuts Ctrl+Shift+Up/Down/Left/Right expand the current cell texture by a configurable integer step (new `GnumarusExpandSettings`, default 16px, 1..1024, Interface section + reset + hook + persistence); new pixels transparent black; position re-seated; undoable; listed in the Shortcuts modal.
- "Fit texture to size" dialog focuses OK on open (after `updateComplete`, `id="fitTextureOk"`), so Enter/Return confirms immediately; `openFitTextureDialog` is now async (`void` at both menu call sites) and seeds the input from the new setting.
- New `GnumarusFitSettings` (default alpha threshold 0, range 0..254 floored, localStorage `gnumarus.settings.fit.v1`, Interface section row with reset button, `setFitDefaultThreshold` test hook), mirroring the toast-settings conventions.

## 56. Named animations from definition strings (implemented)

## 57. Aseprite tag import as named animations (implemented)
- Parse the tags chunk (0x2018) in `GnumarusAseprite.ts`: direction forward/reverse/ping-pong/ping-pong-reverse, repeat count, RGB color skipped, strict bounds/length/range validation like other chunks.
- Mapping: forward→`forward` (`repeat == 1`→`none`, play-once), reverse→reversed frames + same rule, ping-pong→`ping-pong` (forward order), ping-pong-reverse→`ping-pong` (reversed order); repeat counts >1 and tag colors have no equivalent and are ignored (documented). Empty names fall back to `Tag N`, duplicate names get ` (2)` suffixes.
- Pure module `src/animation/GnumarusNamedAnimations.ts`: `name,loop,frames` strings (`none`/`forward`/`ping-pong`, 1-based frames, `A-B` ranges, `:ms` per-frame or per-range overrides), strict parse errors, serialize with range collapsing, ping-pong-safe step function, frame-index remap helper.
- Engine owns the list + active selection, remaps indices on frame insert/move/remove, persists via `project.json`.
- Matrix corner gets an animation dropdown (All frames + names) and a manage dialog (add string, inline errors, delete); selected animation columns highlight; playback scopes to it (override durations, `none` stops at the end).

## 58. Short default names + project export (in progress)
- Default names become L1/L2/…, F1/F2/…, C1/C2/…, T1/T2/… (display names only; ids like layer0/content1/tex0 unchanged; stored custom names untouched). Landed: engine/format/shell generators + counter regexes + unit/e2e fallout fixed, full suites green, deployed.
- File > Export dialog: static frame (frame picker + still format), animated image (named animation → GIF via own encoder, or frame sequence), spritesheet (animations and/or frame list, 8 layouts, still format or per-frame files).
- Batch B landed: per-frame flatten API, still formats (PNG/JPEG/WebP + probed AVIF/HEIC/HEIF/JXL), File > Export dialog with static-frame export, save-picker + download fallback flows.
- Batch C landed: animated export — `GnumarusGifExport.ts` wrapper around gifenc (per-frame palette, transparency via rgba4444+oneBitAlpha, dispose 2 on transparent frames / 1 on opaque, repeat 0 forever / -1 once) plus dialog section (animation picker, GIF vs image sequence) and directory-picker sequence save.
- Batch D landed: spritesheets — `GnumarusSpritesheet.ts` pure geometry (line, column, per-line, per-column, packed, fixed rows/cols) + blit composer, dialog section (animation checkboxes, manual frame list, layout, count, format), single-sheet and individual-files save.
- Fix landed: still-format probing requires an exact `data:<mime>` prefix (Chromium silently falls back to PNG data URLs, so the old `!== "data:,"` check listed AVIF/HEIC/HEIF/JXL bogusly) plus a `blob.type` guard in `encodeStillImage` so a mislabeled fallback blob is reported as unsupported instead of saved. Also hardened the ping-pong e2e polls to dense 50ms intervals (100ms frames vs default 100/250/500/1000ms poll backoff aliased deterministically; playback itself verified correct via transition log).
- Quality setting landed: 1-100 quality control per export section (frame, animation sequence, spritesheet) for lossy still formats, threaded through `encodeStillImage` to the canvas `quality` argument, default 92 (previous browser-default behavior); hidden for PNG and GIF.
- Durations in seconds + menubar behavior landed: frame durations are fractional seconds (double, no decimal limit; default 0.25 s; clamp 0.001..60 s) across model/engine/project.json v2 (v1 migrates ms→s)/Aseprite import/animation strings (`:0.25`)/UI/playback(ms at timer boundary)/GIF export(ms at encoder boundary); menubar closes on outside click and Esc and switches menus on hover when open.

## 59. Photoshop PSD import (landed)
- Hand-written strict big-endian parser from the Adobe spec (`src/project/GnumarusPsd.ts`, no new dependency): 8BPS signature, 8-bit RGB/grayscale/indexed (+16-bit MSB), Raw/RLE-PackBits/ZIP/ZIP-prediction channels, per-layer rect/opacity/visibility/names (Pascal, `luni` preferred), empty/channel-less group markers skipped, composite-image fallback for flattened files; blend modes/masks/clipping/PSB/CMYK+ rejected or ignored with reasons; File > Import accepts `.psd` with magic-signature dispatch; cross-validated against ImageMagick (pixels/geometry/RLE/ZIP/gray/indexed/16-bit) and GIMP (structure/names/visibility/opacity).

## 60. GIMP XCF import (implemented)
- New `src/project/GnumarusXcf.ts`: strict big-endian parser written from a self-authored format description (magic `gimp xcf ` + `file`/v000-v012, canvas dims, base type RGB/gray/indexed, 8-bit precision only, properties with size-prefixed skip, layer offset list with terminator, per-layer dims/type/name/property set, hierarchy/level/tile grid with 64px tiles, per-component planar RLE with short/long runs, uncompressed tiles, group layers flattened away by skipping PROP_GROUP_ITEM entries).
- Imported: canvas size, pixel layers (RGB/RGBA/gray/grayA/indexed/indexed-A + image colormap, layer offsets via centered transform like the PSD importer, visibility, opacity incl. float variant, alpha-lock, names with L/T/C fallback), short default names; ignored with reasons: blend modes (normal), masks, channels, guides/paths/vectors/parasites, >8-bit precision, zlib/fractal compression, group containers. No-pixel-layer files are rejected with a clear message.
- File > Import accepts `.xcf` (magic dispatch on the `gimp xcf ` signature, same flow/toasts as PSD: `Imported <name> (<n> layer(s))`), no new dependency (RLE hand-decoded).
- Fixed along the way: tile-list cursor bug (the resume position was captured before reading the next tile offset, so every multi-tile level re-read the same slot and failed; found via the 70x70 unit test).
- Unit tests with hand-crafted binaries (all layer types, indexed+colormap, offsets, integer/float opacity, visibility, alpha-lock, RLE short/extended runs, multi-tile, empty levels, v0/raw tiles, groups skipped, invalid magic/version/precision/compression/palette/truncation) cross-validated against GIMP-written files (pixels, structure, offsets); E2E import test with an in-memory XCF like the PSD one.

## 61. Krita KRA/KRZ import (implemented)
- New `src/project/GnumarusKra.ts`: strict parser written from a self-authored format description (no Krita code). KRA = ZIP archive: `mimetype` (`application/x-krita`), `maindoc.xml` (`DOC/IMAGE` with width/height/colorspacename/name, nested `layers/layer` elements, `animation` with `framerate`/`range`), layer pixel files at `<imagename>/layers/<filename>` (keyframed: `<filename>.f<id>`, keyframe map in `<filename>.keyframes.xml`, per-frame `.defaultpixel`).
- Tile store layout: ASCII header (`VERSION 2`, `TILEWIDTH 64`, `TILEHEIGHT 64`, `PIXELSIZE n`, `DATA m`), then `m` tiles (`x,y,LZF,size` + size payload bytes: 1 flag byte 0 = raw interleaved / 1 = LZF of planarized data). Tiles are relative to the layer/frame offset; missing tiles read the `.defaultpixel` (transparent when absent). LZF decoded with a hand-written strict decoder (liblzf byte format: ctrl<32 literal run, else back-reference), planar data de-interleaved. RGBA tiles are B,G,R,A in file (verified against real pixels), GRAYA is Gray,Alpha; only 8-bit RGBA/GRAYA (PIXELSIZE 4/2) supported.
- Imported: canvas size, paintlayer pixels bottom-first (file is top-first) with center-relative transforms, visibility, opacity 0-255, `channellockflags` mapped to lockedChannels (BGRA bit order), group layers flattened, animation (playback `range` from..to maps to engine frames with hold semantics: each frame shows the latest content keyframe at or before its time; per-keyframe offsets become per-content transforms; static layers share one content across frames; `framerate` becomes the default frame duration in seconds), L/T/C fallback names.
- Ignored with reasons: blend modes (normal), masks (nested `mask` elements never walked), non-paint nodetypes (shape/file/clone/adjustment/generator/reference/masks), scalar keyframe channels (opacity animation), guides/assistants/palettes/profiles, >8-bit depths, other codecs. Empty layers (no tiles + transparent default) skipped; no-pixel-layer files rejected.
- File > Import accepts `.kra`/`.krz` (magic dispatch: PK zip signature + `maindoc.xml` in the ZIP central directory, no full unzip; `.krz` is Krita's archival export with the identical layout), toast `Imported <name> (<n> layer(s), <m> frame(s))`. New deps `fflate` + `fast-xml-parser` (both MIT); the Kra module is lazy-imported so the main bundle stays lean.
- Unit tests with archives built via `fflate` zipSync plus hand-written tile stores (RGBA/GRAYA, BGRA swizzle, raw/LZF flags, defaultpixel, groups, visibility/opacity/locks, keyframe hold/offsets, framerate/range, rejection battery) cross-validated against real Krita test files (pixels vs mergedimage.png); E2E import test with an in-memory .kra.
- PSD stays single-frame (checked): Photoshop timeline/frame animation lives in proprietary tagged blocks the PSD importer does not decode; out of scope for this task. "Proprietary" here means documented only partially by Adobe (timeline structures are largely reverse-engineered knowledge); community libraries (psd.js, ag-psd) have partial support and could be studied later.
- Fixed along the way: tile payload size bound used the raw tile size instead of the worst-case LZF expansion (input + input/16 + overhead), rejecting valid dense tiles; found via the first unit-test run.

## 62. Frame header tooltips show animation membership (implemented)
- Each animation-matrix column header tooltip (and aria-label) names how many defined animations include that frame (`in no animations` / `in 1 animation` / `in N animations`), computed from the named animation frame lists.
- Pure helper `countAnimationFrames` in `src/animation/GnumarusNamedAnimations.ts` with unit tests; E2E test defines animations via the Manage dialog and asserts header titles.

## 63. Composite eyedropper + grid opacity setting (implemented)
- Eyedropper samples the composited canvas (all visible layers blended with opacity/transforms, no background) instead of only the active cell: new pure `compositeLayersAt` in `src/preview/GnumarusFinalRender.ts` reusing the exact `compositeFinalImage` per-pixel math for one project pixel; engine `pickColorAt` maps the client point to a canvas pixel and composites the current frame inputs; transparent composites still pick (same as before).
- Pixel grid opacity setting: `opacityPercent` integer 0..100, default 100, in `GnumarusGridSettings` (parse/clamp/round/serialize, missing field defaults, legacy `minZoomPercent` kept); engine `gridOpacity` option + setter + `uOpacity` shader uniform multiplying the grid alpha; Settings row with number input + per-setting reset arrow + Reset-defaults support + `setGridOpacity` test hook; `getGridState` gains `opacity`.
- Unit tests for the composite sampler and grid opacity parse/clamp/serialize/shader uniform; E2E for stacked-layer picks (bottom-only region, overlap blend) and the settings input.

## 64. Action system + quick action search (implemented)
- New pure module `src/actions/GnumarusActions.ts`: actions have an id, a display name, context requirements (tool-selected, floating-selection-active; more later) and a run callback. `GnumarusActionRegistry` registers (duplicate ids throw), lists alphabetically, checks requirements, and executes (returns ok or the unmet-requirement reasons). `searchActions` does dependency-free similarity ranking (exact > prefix > substring > ordered-subsequence, then alphabetical; empty query lists everything).
- Shell owns one registry; only `reset-canvas-transform` is converted for now (Edit menu item, new `0` shortcut and the palette all call `runAction`, which toasts `Cannot run "…": requires …` when context fails).
- `Ctrl+Shift+P` (`Cmd+Shift+P` on macOS) opens a floating suggestion dialog: text field with autofocus, vertically scrolling alphabetical list, live similarity filtering, Up/Down + Enter to run, click to run, Escape to close, `No actions found` empty state. Documented in Help > Shortcuts under a new Actions section.
- Unit tests for registry/requirements/messages/search ranking; E2E for palette open/filter/navigate/execute/close plus the `0` shortcut. Requirement-failure toast E2E waits for the second gated action.

- Fixed along the way: palette query/index were declared but missing from the static `properties` block, so typing never re-rendered the list; found via the first E2E run.

## 65. libjxl via WASM for JXL read/write (implemented)
- Goal: compile libjxl (https://github.com/libjxl/libjxl, BSD-3-Clause, permissive) to WebAssembly with Emscripten and use it for JXL decoding/encoding; later: animated export beyond GIF, single-frame and spritesheet export in JXL.
- Repo: added as a git submodule at `third_party/libjxl`, pinned to the v0.12.0 tag (latest stable at the time), including its `third_party` dependency submodules (brotli, highway, etc.).
- Toolchain: Emscripten SDK installed at `~/emsdk` (outside the repo; no root needed). WASM build is single-threaded (no pthreads/SharedArrayBuffer/COOP-COEP requirement, so the app keeps working on any static host) with WASM SIMD where supported; all codec features on (lossless/lossy, alpha, animation-capable API).
- Integration: new `src/codec/GnumarusJxl.ts` wrapper (decode JXL bytes to RGBA, encode RGBA to JXL bytes) loading the Emscripten module lazily; unit round-trip tests plus E2E still-image smoke coverage. Export-dialog formats come in a follow-up batch.
- License note: libjxl is BSD-3-Clause (non-viral); nothing is copied into our source tree, it builds from the submodule.

- Fixed along the way: encoder rejected every input because `num_extra_channels` must be >= 1 when `alpha_bits` is set, and lossless requires `uses_original_profile` (modular mode); the Emscripten MODULARIZE build of this toolchain does not expose `HEAPU8` on the module, so the bridge was rewritten on embind `val` (copies across the boundary, no raw heap access from JS).

## 66. Batch texture actions: fit all + crop all to canvas (implemented)
- Two new actions runnable from the Run action palette: "Fit All Textures to Size" (same alpha-threshold dialog as the single-texture flow, applied to every project texture) and "Crop All Cells to Canvas" (no dialog, applies the cell crop logic to every cell content).
- Engine: `fitAllTexturesToSize(threshold)` over all textures in creation order; `cropAllCellsToCanvas()` groups contents by texture (insertion order) and crops sequentially, recomputing each box from current state so shared textures crop once per distinct geometry and every referencing transform is re-seated. Both share a refactored `cropTextureToBox` core with the single-texture paths (behavior unchanged) and record ONE compound `fitBatch` history entry, so a single undo reverts the whole batch.
- History: new `{ type: "fitBatch"; fits: GnumarusFitRecord[] }` entry; undo applies records in reverse with `before` state, redo in order with `after` state, reusing the existing `applyFit` callback.
- Shell: palette entries (alphabetical), `fitTextureTarget` becomes `{ kind: "single" } | { kind: "all" }`, confirm handler branches to the batch call with count toasts; crop-all reports cropped/unchanged/outside counts.
- Unit tests for the history batch entry (undo/redo order, skip-on-missing) plus E2E for both actions (palette search, dialog reuse, pixel-identical rendering after re-seat, single-undo revert, shared-texture multi-crop).

## 67. JXL export (single, spritesheet, animated) + file menu actions + animation list details (implemented)
- JXL still export for single frames, sprite sequences/sheets and single-file animations: new `src/export/GnumarusJxlExport.ts` (WASM module loading via `?url` + fetch, cached; still encode with lossless flag or 1-100 quality; animated encode of uniform RGBA frames with per-frame ms durations and loop count). The libjxl shim gains `jxl_encode_animation_js` (flat RGBA + durations + loops, tps 1000/1); WASM rebuilt. The export dialog gains a "JXL animation" single-file option plus a Lossless checkbox in all three sections whenever JXL is selected; the shell routes `image/jxl` through the codec and always lists the JXL format (browser canvas probing never detects it).
- File menu items become actions: new-project, open-project, save-project, import, export (menu labels renamed to New/Open/Save Project; Ctrl+S routes through the action). Palette list grows accordingly.
- Animation modal rows show `"name": loop, N frames: 1,2,5-8` (new pure `describeNamedAnimation`, runs collapse at 3+); deleting asks in a confirm modal ("Are you sure?", Yes/No).
- Unit tests for the summary formatter, animated shim round-trip (first-frame decode) and invalid inputs; E2E for JXL still/animated/sheet exports (signature + shim decode), menu renames, palette list, new modal display and delete confirm/cancel.

## 68. Split E2E runs: recent only by default, full on demand (implemented)
- Playwright tests for recent work carry the `@recent` tag in their titles (7 tests: 4 brush-pressure pencil responses size/opacity/none/both, plus minimum-zoom setting, matrix gear order, tiny-viewport statusbar).
- `npm run test:e2e` runs only `--grep @recent` (~25 s); `npm run test:e2e:full` runs the whole suite (~6 min, regressions, on explicit request).
- Convention: tag new E2E tests with `@recent` when they land; move the tag to the next batch when a newer one arrives (untag tests whose feature is no longer "recent").

## 69. Texture naming tN, circle default brush, JXL project storage (implemented)
- Texture display names become lowercase `t1`, `t2`, ... (counter from 1) instead of `T1`: engine `nextTextureName`, project-format defaults, all four importers, legacy `T`/`Texture N` still parsed for the counter. Texture files switch from id-based (`textures/layer0.png`) to positional `textures/t1.jxl` stems recorded in `project.json` (loader already reads the `file` field, so old projects keep loading).
- Circle becomes the default brush shape for pencil, line and curve (engine + shell inits; invalid input still parses to square).
- Project textures save as JXL instead of PNG: new `GnumarusJxlExport.encodeTextureForStorage` honoring two new global settings (Edit > Settings, new Storage section): JXL lossless toggle (default on) and lossy quality 0-100 (default 50, hidden unless lossy), persisted in localStorage with per-setting reset arrows, Reset-defaults support and test hooks. Encoding uses effort 1 (fastest) via a new shim `effort` option (decode has no speed knob; single-threaded as before). Save falls back to PNG per texture if the codec fails; loading sniffs `.jxl` vs `.png` per file, so mixed/legacy projects open.
- Unit tests for the settings module, effort plumbing and the frame-count helper; E2E for default circle shape, JXL save round-trip (lossless exact + lossy), settings UI/persistence, and texture `t1` naming.

- Fixed along the way: multi-line test expectations that assumed square brushes (thick strokes, brush preview radius, AA rounding, cutout pixel counts); explicit square selection keeps their tuned geometry while the new default is covered separately.

## 70. Reload All Textures action (landed)
- New `reload-all-textures` action (Run action palette, no requirements): re-reads `project.json` from the saved directory for the texture id-to-file map, decodes each on-disk file (JXL sniffed by extension, PNG otherwise) and swaps same-size buffers in; unsaved project shows only an error toast; memory textures without a file entry or with missing/unreadable/size-mismatched files are skipped with counts; one undoable `reloadBatch` history entry; identical buffers count as applied without history.

## 71. Project texture format setting: JXL/JPG/PNG (landed)
- Storage settings gain `format` (jxl/jpg/png, default jxl), PNG compression level int 0-9 (default 9, pure fflate encoder) and JPEG quality int 0-100 (default 95, canvas encode); JXL keeps its lossless/lossy settings; dialog rows hide per format with reset arrows.
- JPG stores alpha in a companion grayscale file (`t23.alpha.jpg`, same quality); loader/reload recombine color+alpha (missing companion means opaque).
- JPG stores alpha in a companion grayscale file (`t23.alpha.jpg`, same quality); loader/reload recombine color+alpha (missing companion means opaque); PNG level honored via fflate `zlibSync` (canvas PNG encoder replaced).

## 72. Big canvas, loupe tweaks, Space gestures (landed; pointer lock reverted)
- New projects up to 16384x16384 (dialog max + create clamp; engine needs no change; needs big GPU textures + RAM).
- Loupe zoom reacts to vertical drag only; loupe rotation pivots on the viewport center instead of the panned image center.
- Ctrl+Space+left-drag zooms like the loupe; Shift+Space+left-drag rotates like the loupe (shortcuts modal documents both).
- Minimum canvas zoom is a setting (1..100 whole percent, default 1, Canvas view section with reset arrow, persisted, live-clamps current zoom); fit honors it instead of flooring at 100%.
- Pointer lock for Shift+left-drag brush sizing was tried and reverted: the canvas lives in shadow DOM, so the lock lands on the host element, starving canvas listeners and breaking pointer capture (proven by failing shift-drag tests). Absolute positioning stays, per the request's fallback clause.
- Matrix column yields compressed space first (`flex: 0 1 auto`, scrolls internally as before) so the status bar survives tiny viewports.
## 73. Brush pressure response (none/size/opacity/size+opacity) (landed)
- Pencil tool option backed by engine state (session-only, like brush size): max pressure paints at full brush size/alpha; `size` scales effective size, `opacity` scales effective alpha, both combine; mouse reports full pressure (its 0.5 is meaningless), pen/touch use clamped pressure.
- Pure helpers in PixelBuffer (response type + parse, pressure normalize, size/alpha multipliers) with unit tests; stroke paths thread per-event pressure (down/move, stabilizer reuses last); synthetic pen PointerEvents in e2e (setPointerCapture stubbed).

## 74. Shortcut list audit, 1% zoom default, 1px texture floor (implemented)
- Shortcuts modal audited against both global key handlers (shell `onGlobalKeyDown` + engine canvas listener): Ctrl+E moved from File to Layers (it merges layers); History gains macOS variants (engine undo/redo now accept Cmd as well as Ctrl); Escape cancel entry covers line/curve/rectangular selection; View gains the implemented-but-undocumented mouse gestures (wheel zoom at cursor, middle-drag pan, Alt+middle-click reset, middle-click flip, right-drag rotate).
- Minimum zoom setting default 25% -> 1% (settings default, engine `viewMinZoom` init/option fallback + comment, unit + e2e expectations, README/PLAN/FEATURES/CHECKLIST mentions).
- Fit texture to size + fit all textures to size clamp degenerate boxes to min 1px per dimension (new pure `clampCropBoxToMin1` helper in ViewportMath with unit tests); `setTexturePixels` already rejects 0-dim buffers so nothing can go below 1x1.
