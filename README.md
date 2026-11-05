# Gnumaru's Painting and Animation App

Frontend-only single page web application for digital painting, pixel art, vector art and frame-by-frame animation, accelerated with WebGL2.

## Intended use

Classic desktop-like painting app (top menu bar, central canvas, bottom status bar) in the spirit of Photoshop, Krita and GIMP. Current version supports pixel-art sketching with a 1px solid pencil and a contiguous-region bucket fill, multi-layer editing with per-layer transforms and per-channel locks, frame-by-frame animation over a layer x frame cell matrix, and directory-based projects.

## Features (v1)

- Desktop shell: File menu (New, Open, Save), Edit menu (Undo/Redo, Settings, Reset Canvas Transform), pencil/bucket/line/curve/loupe/transform toolbar with color picker, tool options bar below the menu bar, WebGL2 canvas, layers panel, status bar. `Ctrl+S` (`Cmd+S` on macOS) saves like File > Save (reuses the chosen folder, otherwise shows the OS folder picker).
- Pixel-art pencil: solid color, brush size 0.1..64 with square/circle tip plus anti-aliasing toggle in the tool options bar (integer-rounded when off, true float when on) with live mouse preview, nearest-neighbor display, wheel zoom + pan + rotation + flips. Loupe shortcut is `Z`.
- `Tab` hides/shows all interface chrome except the canvas.
- Bucket fill: click fills the contiguous region of identical color with the current solid color (4-way flood fill, channel-lock aware, undoable, shortcut `B`).
- Line tool: two clicks define a segment with width 0.1..64, square/circle ends and optional anti-aliasing (integer-rounded when off, true float when on) in the tool options bar, with mouse and rubber-band previews (shortcut `N`).
- Curve tool: press-drag-release sets start/end, then one click sets the start control point and a final click sets the end control point; live curve path, markers and handle lines while drawing; width 0.1..64, square/circle ends, anti-aliasing; undoable (shortcut `C`).
- Layers: add (`Insert` above current), delete, reorder, rename, visibility, opacity, right-click Merge Down (undoable, `Ctrl+E` on the active layer); `PageUp`/`PageDown` select above/below with wrap-around plus `pos/total: name` toast; `Delete` resets the current cell texture to transparent zeros (undoable); Transform tool edits the active cell content; painting targets the active cell at the current frame (empty cells materialize on first use).
- Pixel grid over the active layer (follows rotation/transform), hidden below 200 percent zoom; minimum zoom 200..6400 percent, default 1000 percent, in Edit > Settings.
- Canvas background: checkerboard (default) or solid color in Edit > Settings; every setting has a per-setting reset arrow when non-default.
- Final preview window (floating, resizable) with internal zoom/pan (drag with left, right or middle button) of the flattened image as a single PNG export would look.
- Custom color picker: RGB/CMYK/HSV/HSL (default)/OKHSL/OKHSV/ARD with per-axis gradient bars and editable inputs; alpha axis on every model; no browser color picker is used anywhere.
- Animation matrix above the status bar: rows are layers, columns are frames; each cell holds zero or one shareable cell content (texture plus transform). New frames start empty; cell menu creates, associates or dissociates contents and texture links.
- Frame durations and playback: each frame may carry an explicit duration in milliseconds via its header menu (Set/Clear, 1..60000 ms); frames without one use the project default (100 ms, configurable in Edit > Settings Animation section with reset arrow, stored in `project.json`); play/stop transport in the matrix corner plays from the current frame, looping until stopped.
- Layer resize: per-layer width/height 1..1024 via Resize button; expand fills transparent right and below, shrink crops right and below; undoable.
- Channel lock: per-layer R/G/B/A toggles; paint, clear and Merge Down write only unlocked channels. Example: alpha locked + paint keeps old alpha; green locked + cyan paint yields blue.
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
