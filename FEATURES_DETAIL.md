# FEATURES_DETAIL — Gnumaru's Painting and Animation App (v1 MVP)

## 1. Desktop shell (`src/shell/GnumarusShell.ts`)

- `gnumarus-shell` Lit component: menu bar, toolbar, canvas host, status bar, New-canvas dialog.
- File menu items: New (width/height dialog, 1..1024, default 64x64), Open (directory picker), Save (writes to picked directory, reuses the handle afterwards).
- Toolbar: pencil tool (only tool, always active) and a color input.
- Status bar shows tool, hex color, cursor pixel coordinates, canvas dimensions, zoom percentage, project name, modified marker, WebGL2/FS-API messages.
- All UI strings in American English.

## 2. WebGL2 canvas engine (`src/canvas/GnumarusCanvasEngine.ts`)

- Single `THREE.WebGLRenderer` (WebGL2-only, no fallback). Throws `GnumarusWebGlError` with a user-facing message when WebGL2 is unavailable.
- One `THREE.DataTexture` (`NearestFilter`, no mipmaps) over a CPU `Uint8ClampedArray` RGBA buffer; orthographic camera; a custom `ShaderMaterial` composites the layer over a fixed screen-space transparency checker (12px squares) so the checker appears only inside the drawable area, while the scene clear color (`#333333`) fills everything outside it.
- On-demand rendering (resize, view change, stroke), DPR capped at 2.
- Zoom (wheel, 0.5x..64x, zoom-to-cursor), keyboard shortcuts `Ctrl+Alt+=` / `Ctrl+Alt++` (zoom in) and `Ctrl+Alt+-` (zoom out, main keyboard and keypad), pan (middle-drag or Space+drag).
- Pencil strokes: pointer capture, Bresenham line interpolation between events, out-of-bounds pixels ignored.

## 3. Pure logic modules (fully unit-tested)

- `src/canvas/GnumarusPixelBuffer.ts`: buffer create/clear/get/set, Bresenham line, `#rgb`/`#rrggbb` parsing.
- `src/canvas/GnumarusViewportMath.ts`: centered screen-to-pixel mapping with pan/zoom, zoom clamping.
- `src/project/GnumarusProjectFormat.ts`: `project.json` build/serialize/strict-parse, `cells/<layer>_frame<frame>.png` paths.

## 4. Project format and file access

- Directory layout: `project.json` (`{ app, version: 1, width, height, layers: [{ id, name, visible, opacity, cells: [{ frame, file }] }] }`) plus cell PNGs.
- `src/project/GnumarusFileSystem.ts`: File System Access API wrappers with feature detection and Chromium-only messaging.
- `src/project/GnumarusPngCodec.ts`: RGBA buffer <-> PNG Blob via 2D canvas (encode on save, `createImageBitmap` decode on open).
- v1 reads/writes only the first layer's first cell; multi-layer/animation fields are parsed and preserved by the format for v2.

## 5. Tests

- Vitest unit tests (`tests/`): pixel buffer, project format, viewport math — 12 tests.
- Playwright E2E (`e2e/`, Chromium): shell boot + menu, File > New dialog flow, real mouse pencil stroke verified through the engine pixel hook — 3 tests.

## 6. Build and deploy

- `vite.config.ts` uses `base: './'` so `dist/` works at any hosting path.
- `npm run deploy` rebuilds and copies `dist/` to `/var/www/html/GnumarusPaintingAndAnimationApp`.
