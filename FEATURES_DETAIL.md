# FEATURES_DETAIL — Gnumaru's Painting and Animation App (v1 MVP)

## 1. Desktop shell (`src/shell/GnumarusShell.ts`)

- `gnumarus-shell` Lit component: menu bar, toolbar, canvas host, status bar, New-canvas dialog, Settings dialog.
- File menu items: New (width/height dialog, 1..1024, default 64x64), Open (directory picker), Save (writes to picked directory, reuses the handle afterwards).
- Edit menu items: Undo/Redo (image edits only, with disabled state), Settings (checkerboard mode image-space/screen-space, independent square width/height 1..128 default 16x16, colors A/B with Reset defaults; applied live and persisted to `localStorage`) and Reset Canvas Transform (restores fit zoom, rotation, flips).
- Undo/redo: per-stroke bounding-box diffs (max 100 entries), view transforms and settings never recorded; shortcuts `Ctrl+Z` undo, `Ctrl+Y` or `Shift+Ctrl+Z` redo; history cleared on New/Open.
- Toolbar: pencil tool (pixel-art) and loupe tool (zoom/rotate/flip) plus a color input.
- Status bar shows tool, rotation degrees, flip state, hex color, cursor pixel coordinates, canvas dimensions, zoom percentage, project name, modified marker, WebGL2/FS-API messages.
- All UI strings in American English.

## 2. WebGL2 canvas engine (`src/canvas/GnumarusCanvasEngine.ts`)

- Single `THREE.WebGLRenderer` (WebGL2-only, no fallback). Throws `GnumarusWebGlError` with a user-facing message when WebGL2 is unavailable.
- One `THREE.DataTexture` (`NearestFilter`, no mipmaps) per layer over CPU `Uint8ClampedArray` RGBA buffers; one plane per layer plus a dedicated checkerboard background plane; per-layer opacity and visibility; orthographic camera. The layer shader outputs `tex.rgb` with `alpha * opacity`; the background shader draws the configurable transparency checker (image-space squares that pan/zoom with the canvas, or fixed screen-space squares; independent width/height, colors editable in Edit > Settings, persisted to `localStorage`), while the scene clear color (`#333333`) fills everything outside the drawable area.
- View transform (view-only, buffer stays canonical): zoom 0.5x..64x, arbitrary rotation (clockwise-positive), horizontal/vertical mirror. The plane scale/rotation renders it; pointer mapping inverts the full transform so painting works while transformed.
- Tools: pencil (`P`, 1px solid, Bresenham, draws through the current transform and layer transform), loupe (`L`) and transform (`T`) — loupe left-drag zooms (up/right in, down/left out, anchored at drag start), right-drag rotates the canvas around the image center, middle-click flips the canvas X (Shift Y, Ctrl resets the canvas transform); transform left-drag moves the active layer, right-drag rotates it around its own center, middle-click flips the layer X (Shift Y, Ctrl resets the layer transform).
- Zoom (wheel with zoom-to-cursor even while rotated, keyboard shortcuts `Ctrl+Alt+=` / `Ctrl+Alt++` zoom in and `Ctrl+Alt+-` zooms out), pan (middle-drag or Space+drag).
- Pencil strokes: pointer capture, Bresenham line interpolation between events, out-of-bounds pixels ignored.

## 3. Layers

- Layers panel (right dock): add, delete (never the last one), reorder up/down, rename (double-click, Enter/blur commits, Escape cancels), per-layer visibility checkbox and opacity slider, click to activate; right-click a row for the context menu (Merge Down, disabled on the bottom layer); status bar shows active layer name and stack position; each row shows its pixel dimensions.
- Layer model: `{ id, name, visible, opacity, width, height, transform }` with stable filename-safe ids; layers may differ in size from the project (e.g. 4x4 or 128x128 on a 64x64 project); each layer stores its own position offset, rotation, and flips; bottom-to-top stack order; painting, clear and undo/redo target the active layer; structural ops are not undoable.
- Transform tool (`T`): left-drag moves the active layer, right-drag rotates it around its own center, middle-click flips X (Shift+middle-click flips Y, Ctrl+middle-click resets the layer transform); layer transforms are view-independent and not undoable.
- Rendering positions every plane from the same pure project-space math used for picking, so display and editing always agree.
- Merge Down composites the upper layer over the one below in project space (nearest sampling) using the upper layer's opacity and is fully undoable (restores the removed layer with its pixels); undo/redo resync the panel via `onLayersChanged`.
- Save writes every layer at its own size as `cells/<layerId>_frame0.png` plus dimensions and transform in `project.json`; Open loads every layer at any size and validates cell dimensions; old single-layer/size-less projects open unchanged (size defaults to project, transform to identity).

## 4. Pure logic modules (fully unit-tested)

- `src/canvas/GnumarusPixelBuffer.ts`: buffer create/clear/get/set, Bresenham line, `#rgb`/`#rrggbb` parsing.
- `src/canvas/GnumarusViewportMath.ts`: screen<->pixel mapping with pan/zoom/rotation/flip (exact inverses), zoom clamping, rotation normalization.
- `src/history/GnumarusHistory.ts`: bounding-box image diffs tagged by layer, capped undo/redo stacks.
- `src/project/GnumarusProjectFormat.ts`: `project.json` build/serialize/strict-parse, `cells/<layer>_frame<frame>.png` paths (multi-layer).
- `src/settings/GnumarusCheckerSettings.ts`: checkerboard settings parse/serialize/validate with legacy migration.

## 4. Project format and file access

- Directory layout: `project.json` (`{ app, version: 1, width, height, layers: [{ id, name, visible, opacity, cells: [{ frame, file }] }] }`) plus cell PNGs.
- `src/project/GnumarusFileSystem.ts`: File System Access API wrappers with feature detection and Chromium-only messaging.
## 5. Project format and file access

- Directory layout: `project.json` (`{ app, version: 1, width, height, layers: [{ id, name, visible, opacity, cells: [{ frame, file }] }] }`) plus cell PNGs.
- `src/project/GnumarusFileSystem.ts`: File System Access API wrappers with feature detection and Chromium-only messaging.
- `src/project/GnumarusPngCodec.ts`: RGBA buffer <-> PNG Blob via 2D canvas (encode on save, `createImageBitmap` decode on open).
- Save writes all layers; Open loads all layers (first cell each); animation fields in the format are reserved for frame-by-frame support.

## 6. Tests

- Vitest unit tests (`tests/`): pixel buffer, viewport math, project format, checker settings, layer-tagged history — 28 tests.
- Playwright E2E (`e2e/`, Chromium): shell, menus, dialogs, pencil, zoom shortcuts, checker settings, loupe gestures, P/L tools, transform reset, undo/redo, full layer management — 15 tests.

## 7. Build and deploy

- `vite.config.ts` uses `base: './'` so `dist/` works at any hosting path.
- `npm run deploy` rebuilds and copies `dist/` to `/var/www/html/GnumarusPaintingAndAnimationApp`.
