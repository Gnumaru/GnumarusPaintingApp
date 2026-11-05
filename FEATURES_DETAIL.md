# FEATURES_DETAIL — Gnumaru's Painting and Animation App (v1 MVP)

## 1. Desktop shell (`src/shell/GnumarusShell.ts`)

- `gnumarus-shell` Lit component: menu bar, toolbar, canvas host, animation matrix, status bar, New-canvas dialog, Resize-layer dialog, Settings dialog.
- Animation matrix directly above the status bar: one row per layer (top-first like the layers panel), one column per frame; frame headers select the current frame, cells select layer and frame; corner `+` adds a frame; frame headers have a context menu with Remove frame (disabled for the last frame); each cell has a context menu to create/dissociate/associate cell contents and to dissociate/associate content textures. Canvas and preview refresh on every change.
- File menu items: New (width/height dialog, 1..1024, default 64x64), Open (directory picker), Save (writes to picked directory, reuses the handle afterwards).
- Edit menu items: Undo/Redo (image edits and layer resizes, with disabled state), Settings (canvas background checkerboard/solid, checkerboard mode image-space/screen-space, independent square width/height 1..128 default 16x16, colors A/B, pixel grid minimum zoom 200..6400 percent default 1000 percent; every setting has a per-setting reset arrow shown only when non-default plus Reset defaults; applied live and persisted to `localStorage`) and Reset Canvas Transform (restores fit zoom, rotation, flips).
- Undo/redo: per-stroke bounding-box diffs plus resize before/after snapshots (max 100 entries), view transforms, settings and preview never recorded; shortcuts `Ctrl+Z` undo, `Ctrl+Y` or `Shift+Ctrl+Z` redo; history cleared on New/Open.
- Toolbar: pencil tool (pixel-art), loupe tool (zoom/rotate/flip) and transform tool, custom color picker popup plus a Final preview toggle; tool glyphs are scaled to fill their fixed-size buttons.
- Color: custom `gnumarus-color-picker` (`src/color/`) with models RGB, CMYK, HSV, HSL (default), OKHSL, OKHSV and ARD; every model has an alpha axis (0..255); hue axes 0..360; ARD Diagonal 0..360 and Ratio 0..255; other axes are percentages with one decimal; per-axis draggable gradient bars (own 0..max gradient, alpha bars fade) with keyboard support, editable numeric inputs, model selector and hex field; axis edits always re-render even when the output color is unchanged (no frozen sliders at zero value); no native `<input type="color">` remains; pencil, checker colors and solid background all use it; 8-digit hex carries alpha into the engine (`parseHexColor` extended).
- Status bar shows tool, rotation degrees, flip state, hex color, cursor pixel coordinates, canvas dimensions, layer, frame (`Frame i/n`), zoom percentage, project name, modified marker, WebGL2/FS-API messages.
- All UI strings in American English.

## 2. WebGL2 canvas engine (`src/canvas/GnumarusCanvasEngine.ts`)

- Single `THREE.WebGLRenderer` (WebGL2-only, no fallback). Throws `GnumarusWebGlError` with a user-facing message when WebGL2 is unavailable.
- One `THREE.DataTexture` (`NearestFilter`, no mipmaps) per layer over CPU `Uint8ClampedArray` RGBA buffers; one plane per layer plus a configurable background plane (checkerboard or solid color, default checkerboard) plus a pixel grid overlay plane for the active layer; per-layer opacity and visibility; orthographic camera. The layer shader outputs `tex.rgb` with `alpha * opacity`; the grid shader draws 1 CSS pixel white lines at pixel boundaries of the active layer using the same project-space matrix; the background shader draws either the configurable transparency checker (image-space squares that pan/zoom with the canvas, or fixed screen-space squares; independent width/height, colors editable in Edit > Settings, persisted to `localStorage`) or a solid color (color editable in Edit > Settings), while the scene clear color (`#333333`) fills everything outside the drawable area.
- Pixel grid: visible only when `zoom >= gridMinZoom` and `zoom >= 200 percent`; threshold configurable 200..6400 percent, default 1000 percent; follows active layer size, position, rotation, flips and view transform via `writePlaneMatrix`.
- Final preview (`src/preview/GnumarusFinalRender.ts` + floating window): CPU composite of visible layers bottom-to-top in project space (`compositeFinalImage`), shown in a floating resizable window with internal zoom (25..6400 percent, default 400 percent, wheel/buttons) and pan (drag with left, right or middle mouse button, plus scroll); refreshes on pixels/layers change; renders the flattened image as a single PNG export would look.
- View transform (view-only, buffer stays canonical): zoom 0.5x..64x, arbitrary rotation (clockwise-positive), horizontal/vertical mirror. The plane scale/rotation renders it; pointer mapping inverts the full transform so painting works while transformed.
- Tools: pencil (`P`, 1px solid, Bresenham, draws through the current transform and layer transform), loupe (`L`) and transform (`T`) — loupe left-drag zooms (up/right in, down/left out, anchored at drag start), right-drag rotates the canvas around the image center, middle-click flips the canvas X (Shift Y, Ctrl resets the canvas transform); transform left-drag moves the active layer, right-drag rotates it around its own center, middle-click flips the layer X (Shift Y, Ctrl resets the layer transform).
- Zoom (wheel with zoom-to-cursor even while rotated, keyboard shortcuts `Ctrl+Alt+=` / `Ctrl+Alt++` zoom in and `Ctrl+Alt+-` zooms out), pan (middle-drag or Space+drag).
- Pencil strokes: pointer capture, Bresenham line interpolation between events, out-of-bounds pixels ignored.

## 3. Layers

- Layers panel (right dock): add, delete (never the last one), reorder up/down, rename (double-click, Enter/blur commits, Escape cancels), per-layer visibility checkbox, opacity slider, R/G/B/A channel lock toggles and Resize button with dialog, click to activate; right-click a row for the context menu (Merge Down, disabled on the bottom layer); status bar shows active layer name and stack position plus the current frame; each row shows its current-frame pixel dimensions.
- Layer model: `{ id, name, visible, opacity, lockedChannels: { r, g, b, a } }` with stable filename-safe ids; bottom-to-top stack order. Pixels live in texture entries owned by layers (one texture per layer, shared by reference); what a layer shows is resolved per frame (see Animation below), so panel dimensions reflect the current frame. Painting, clear, resize and undo/redo target texture data; structural ops (except resize/merge/stroke) are not undoable.
- Layer resize: `resizeLayer(id, w, h)` resizes the layer's own texture with `resizePixelBuffer` top-left preserve; expand fills transparent right and below, shrink crops right and below; 1..1024 clamped integers; same size is a no-op (views showing that texture everywhere update too); undoable via `resize` history entry tagged by texture.
- Channel lock semantics: `setPixel`, `drawPixelLine`, `clearPixelBuffer` and `compositePixelOver` write only unlocked channels. Alpha lock + paint keeps old alpha; green lock + cyan (`#00ffff`) paint yields blue; fully-locked paint is a no-op (still hit-tests in bounds, produces no history entry).
- Transform tool (`T`): left-drag moves the active cell content, right-drag rotates it around its own center, middle-click flips X (Shift+middle-click flips Y, Ctrl+middle-click resets the transform); content transforms are view-independent and not undoable; acting on an empty cell materializes a content first.
- Rendering positions every plane from the same pure project-space math used for picking, so display and editing always agree.
- Merge Down composites the upper layer over the one below in project space (nearest sampling) using the upper layer's opacity, masked by the lower layer's `lockedChannels`, and is fully undoable (restores the removed layer, its texture pixels, its cells and any detached content links); undo/redo resync panel and matrix via `onLayersChanged`.

## 4. Animation (`src/animation/GnumarusAnimationModel.ts`, engine, matrix UI)

- Data model: the project is a matrix of cells; rows are layers, columns are animation frames; each cell references zero or one cell content (empty cells render nothing, any number of cells may share one content with no limit).
- Cell content combines zero or one project texture with cell settings (position, rotation, flip_x, flipY). Textures are the layer pixel buffers (each layer owns exactly one) plus new empty project-sized textures created on demand.
- New frames start with all cells empty. Painting or transforming an empty cell materializes a content (and a new texture when missing) so single-frame workflows are unchanged; new layers associate a shared content on all existing frames.
- Canvas, picking, grid, transform tool, history and the final preview all resolve through the current frame with shared `Uint8ClampedArray` references (no copies); undo entries are tagged by texture owner so shared-cell edits undo correctly; merge and resize operate on resolved pixels and restore removed layers with their cells and detached content links.
- Matrix UI (`getAnimationMatrix`): rows top-first, columns per frame, active cell outlined, current-frame column marked. Cell menu: New content, Dissociate content, Use existing content, Dissociate texture, Use texture. Frame headers switch the current frame; Add frame appends an empty column; Remove frame drops its cells and shifts higher frames down (undoable: no, like other structural ops).
- Save writes `textures/*.png` plus `project.json` with `frames`, `currentFrame`, `textures`, `contents` and sparse `cells`; legacy `cells/<layer>_frame<frame>.png` projects open via automatic migration to a single frame.

## 5. Pure logic modules (fully unit-tested)

- `src/canvas/GnumarusPixelBuffer.ts`: buffer create/clear/get/set, Bresenham line, `#rgb`/`#rrggbb` parsing, `GnumarusChannelLock` (`{ r, g, b, a }`), `parseChannelLock`, masked `setPixel`/`drawPixelLine`/`clearPixelBuffer`/`compositePixelOver`, `clampLayerDim` + `resizePixelBuffer` (top-left preserve, transparent expand, crop).
- `src/canvas/GnumarusCanvasEngine.ts`: exported `GRID_FRAGMENT_SHADER` uses `highp` + `fwidth` for uniform 1 screen pixel grid lines (no `uZoom` fixed-width logic).
- `src/canvas/GnumarusViewportMath.ts`: screen<->pixel mapping with pan/zoom/rotation/flip (exact inverses), zoom clamping, rotation normalization.
- `src/history/GnumarusHistory.ts`: bounding-box image diffs tagged by texture owner plus `resize` before/after snapshots, capped undo/redo stacks; merge snapshot carries `lockedChannels`, removed cells and detached content links.
- `src/animation/GnumarusAnimationModel.ts`: cell key plus pure per-frame resolution over layers/textures/contents/cells (shared buffer refs, no copies).
- `src/project/GnumarusProjectFormat.ts`: `project.json` build/serialize/strict-parse with `frames`, `currentFrame`, `textures`, `contents` and sparse `cells` (plus automatic migration of legacy `cells/<layer>_frame<frame>.png` projects to one frame).
- `src/settings/GnumarusCheckerSettings.ts`: checkerboard settings parse/serialize/validate with legacy migration.
- `src/settings/GnumarusGridSettings.ts`: pixel grid minimum zoom parse/serialize/validate, clamp 200..6400 percent, default 1000 percent, `shouldShowPixelGrid` (never below 200 percent).
- `src/settings/GnumarusBackgroundSettings.ts`: canvas background mode checkerboard/solid plus solid color parse/serialize/validate, default checkerboard `#808080`.
- `src/color/GnumarusColorModels.ts`: RGB/CMYK/HSV/HSL/OKHSL/OKHSV/ARD conversions, axis metadata, gradient CSS, hex with alpha.
- `src/color/GnumarusColorPicker.ts`: `gnumarus-color-picker` Lit component (swatch + popup, model select, gradient bars with keyboard support, numeric + hex inputs, `gnumarus-color-change` event).
- `src/preview/GnumarusFinalRender.ts`: `compositeFinalImage` flattening visible layers with opacity and transform (precomputed trig), transparent background.

## 6. Project format and file access

- Directory layout: `project.json` (`{ app, version: 1, width, height, layers: [{ id, name, visible, opacity, lockedChannels }], animation: { frames, currentFrame, textures: [{ id, name, width, height, file }], contents: [{ id, name, textureId, transform }], cells: [{ layer, frame, content }] } }`) plus `textures/*.png`.
- `src/project/GnumarusFileSystem.ts`: File System Access API wrappers with feature detection and Chromium-only messaging.
- `src/project/GnumarusPngCodec.ts`: RGBA buffer <-> PNG Blob via 2D canvas (encode on save, `createImageBitmap` decode on open).
- Save writes all textures plus metadata; Open validates dimensions and references and rejects corrupt files; legacy single-frame `cells/<layer>_frame<frame>.png` projects migrate automatically.

## 7. Tests

- Vitest unit tests (`tests/`): pixel buffer (incl. 8-digit hex), color models, animation model (shared/dangling/empty cells, multi-frame isolation), channel locks, layer resize, grid settings, pixel grid shader, background settings, final render, viewport math, project format (new round-trip, legacy migration, invalid animation), checker settings, layer-tagged history (incl. animation merge metadata) — 91 tests.
- Playwright E2E (`e2e/`, Chromium): shell, menus, dialogs, pencil, zoom shortcuts, checker settings (via custom picker), loupe gestures, P/L tools, transform reset, undo/redo, full layer management, channel lock toggles + masked paint + merge/undo, layer resize dialog + undo, pixel grid visibility + threshold + rotation + max zoom cycle, settings reset arrows, background mode (via custom picker), final preview zoom + any-button drag pan + scroll limits on all four edges, toolbar icon fill without button growth, custom picker, animation matrix (rows/columns, empty new frames, per-frame painting, shared/dissociated contents, texture dissociate/associate, add/remove frames, per-content transforms) — 45 tests.

## 8. Build and deploy

- `vite.config.ts` uses `base: './'` so `dist/` works at any hosting path.
- `npm run deploy` rebuilds and copies `dist/` to `/var/www/html/GnumarusPaintingAndAnimationApp`.
