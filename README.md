# Gnumaru's Painting and Animation App

Frontend-only single page web application for digital painting, pixel art, vector art and frame-by-frame animation, accelerated with WebGL2.

## Intended use

Classic desktop-like painting app (top menu bar, central canvas, bottom status bar) in the spirit of Photoshop, Krita and GIMP. Current version supports pixel-art sketching with a solid brush pencil and additive blending, contiguous-region bucket fill, two-click lines, cubic Bezier curves, multi-layer editing with per-layer transforms and per-channel locks, frame-by-frame animation over a layer x frame cell matrix, and directory-based projects.

## Features (v1)

- Desktop shell: File menu (New, Open, Save), Edit menu (Undo/Redo, Settings, Reset Canvas Transform), Help menu (Shortcuts reference modal), pencil/bucket/eyedropper/line/curve/rectangular selection/destructive selection transform/loupe/non-destructive cell transform toolbar with color picker, tool options bar below the menu bar, WebGL2 canvas, layers panel, status bar. `Ctrl+S` (`Cmd+S` on macOS) saves like File > Save (reuses the chosen folder, otherwise shows the OS folder picker).
- Pixel-art pencil (`B`): solid color, brush size 0.1..64 with square/circle tip plus anti-aliasing toggle in the tool options bar (integer-rounded when off, true float when on) with live mouse preview, nearest-neighbor display, wheel zoom + pan + rotation + flips. Loupe shortcut is `Z`. `E` toggles the eraser blend mode remembering the previous mode. Pixel perfect checkbox (only at size 1 without anti-aliasing) keeps strokes exactly 1px thick. Stabilizer dropdown (`none` default without stabilization, `rope` leash with configurable 1..200 length, `follow` chase with typed 1..100 strength used as typed / 100) smooths strokes with a paint-focus dot plus rope-line overlay.
- `Tab` hides/shows all interface chrome except the canvas.
- Bucket fill (`G`, also `F`): click fills the contiguous region of identical color with the current solid color (4-way flood fill, channel-lock aware, undoable). Eyedropper: click a pixel to copy its color into the paint color (hold `Ctrl` for temporary access from any tool). Rectangular selection: drag to cut a rect into a floating texture; destructive selection transform edits it through anchors (resize, rotate, skew, flip, center-reset, auto-selects the whole texture when empty) and Enter/Return/Esc merges it back.
- Paint blend mode (shared by pencil/bucket/line/curve, selectable in each tool options bar): `normal` (default; straight-alpha source-over, so translucent repeats accumulate like Krita/Photoshop), `copy` (direct channel replacement), `eraser` (ignores RGB, subtracts paint alpha from pixel alpha down to 0; honors alpha locks). The Accumulate checkbox (on by default; off paints each stroke uniformly in one pass) lives in the pencil/line/curve options.
- Line tool: two clicks define a segment with width 0.1..64, square/circle ends and optional anti-aliasing (integer-rounded when off, true float when on) in the tool options bar, with mouse and rubber-band previews (shortcut `N`).
- Curve tool: press-drag-release sets start/end, then one click sets the start control point and a final click sets the end control point; live curve path, markers and handle lines while drawing; width 0.1..64, square/circle ends, anti-aliasing; Pixel perfect checkbox (only at width 1 without anti-aliasing) keeps commits exactly 1px thick; undoable (shortcut `C`).
- Layers: add (`Insert` above current, or Add above/below from the row menu, auto names `Layer 1, Layer 2, ...`), delete, reorder, rename (panel double-click or matrix layer-name menu), visibility, opacity, right-click Merge Down (undoable, `Ctrl+E` on the active layer; composites over the below texture, or links the upper content/texture when the below cell has none; removes the layer only when its other-frame cells are empty/textureless, otherwise dissociates just the current cell) and Reset transform (rotation, flips, position, scale, skew back to identity); `PageUp`/`PageDown` and ArrowUp/Down select above/below with wrap-around plus `pos/total: name` toast (clicking a layer row, frame header or matrix cell also shows the toast); Shift+Up/Down moves the active layer with wraparound; `Delete` resets the current cell texture to transparent zeros (undoable); Non-destructive cell transform tool edits the active cell content (`Alt`+middle-click resets it); painting targets the active cell at the current frame (empty cells materialize on first use). Toast display time 0.5..2.0 s, default 1.0 s, in Edit > Settings Interface section.
- Pixel grid over the active layer (follows rotation/transform), hidden below 200 percent zoom; minimum zoom 200..6400 percent, default 1000 percent, in Edit > Settings. Canvas rotation step 1..90 degrees, default 15, in the same dialog.
- View shortcuts: `4`/`6` rotate by the step, `5` resets rotation, `1` zooms 100%, `2` fits the rotated canvas on screen. Shift+Left-drag with pencil/line/curve resizes the tool live (horizontal only) with a real-time preview.
- Canvas background: checkerboard (default) or solid color in Edit > Settings; every setting has a per-setting reset arrow when non-default.
- Final preview window (floating, resizable) with internal zoom/pan (drag with left, right or middle button) of the flattened image as a single PNG export would look, painted over the same canvas background (solid color or matching checkerboard); updates live while painting and while transforming layers.
- Custom color picker: RGB/CMYK/HSV/HSL (default)/OKHSL/OKHSV/ARD with per-axis gradient bars and editable inputs; alpha axis on every model; always-visible HSV triangle (click/drag sets S/V, hue kept) inside a hue ring (click/drag sets only hue); no browser color picker is used anywhere.
- Animation matrix above the status bar: rows are layers, columns are frames (each frame has an editable name like layers, via double-click or Rename frame menu); each cell holds zero or one shareable cell content (texture plus transform). New frames and new layers start empty (painting/transforming materializes content, or assign via `Select content`); cell menu has a single `Select content` item opening a modal grid (No content, New content, alphabetically sorted contents with thumbnails); New content opens a second modal to choose a texture (No texture, New texture, alphabetically sorted textures with thumbnails). ArrowLeft/Right select frames, Shift+Left/Right moves them.
- Frame durations and playback: each frame may carry an explicit duration in milliseconds via its header menu (Set/Clear, 1..60000 ms); frames without one use the project default (100 ms, configurable in Edit > Settings Animation section with reset arrow, stored in `project.json`); play/stop transport in the matrix corner plays from the current frame, looping until stopped.
- Layer resize: per-layer width/height 1..1024 via Resize button; expand fills transparent right and below, shrink crops right and below; undoable.
- Channel lock: per-layer R/G/B/A toggles; paint, clear and Merge Down write only unlocked channels. Example: alpha locked + paint keeps old alpha; green locked + cyan paint yields blue.
- Fit texture to size: layer and cell context menus open a modal with an alpha threshold (0..254); the texture is cropped to the smallest box with alpha above the threshold while keeping its apparent position; undoable.
- Textures named `Texture 1`, `Texture 2`, ... independent of layer names.
- Directory projects via the File System Access API (Chromium derivatives): `project.json` metadata plus `textures/*.png` cell images (legacy `cells/*.png` projects open via automatic migration).
- WebGL2-only rendering with an explicit error message when unavailable. No WebGL1 fallback.

## Requirements

- A Chromium-derivative browser (File System Access API + WebGL2).
- Node.js 20+ and npm for building.

## Commands

- `npm run dev` — start the dev server.
- `npm run build` — type-check and build to `dist/`.
- `npm run test` — unit tests (Vitest).
- `npm run test:e2e` — end-to-end tests (Playwright + headless Chromium).
- `npm run deploy` — rebuild and copy `dist/` to `/var/www/html/GnumarusPaintingAndAnimationApp` (needs write access to `/var/www/html`; run with sudo if required).

## Hosting

The build uses relative asset URLs (`base: './'`), so the app works at the domain root (`http://localhost/`) and at any nested path (`http://localhost/my/web/app/path`).

## Tech stack

TypeScript (`strict`), Vite, Three.js (WebGL2 renderer), Lit (UI shell), Vitest, Playwright. All dependencies use permissive licenses (MIT / BSD / Apache-2.0). No GPL code.
