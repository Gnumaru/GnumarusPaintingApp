# FEATURES_SUMMARY — Gnumaru's Painting and Animation App (v1 MVP)

- Desktop app shell: top menu bar (File > New/Open/Save, Edit > Undo/Redo/Settings/Reset Canvas Transform), left toolbar, central canvas, right layers panel, bottom status bar.
- Pixel-art pencil: 1px solid color (including alpha), no anti-aliasing.
- Custom color picker (no browser picker): models RGB (with alpha 0..255), CMYK, HSV, HSL, OKHSL, OKHSV (Oklab-based) and ARD (angle 0..360, ratio/diagonal percent); every other axis is a percentage with one decimal. Each axis has a draggable gradient bar showing its own 0..max gradient plus an editable numeric input beside it.
- Pixel grid over the active layer, following its transform; hidden below 200 percent zoom; minimum zoom configurable 200..6400 percent, default 1000 percent, in Edit > Settings.
- Canvas background: checkerboard (default, configurable) or solid color (configurable) in Edit > Settings.
- Settings with per-setting reset arrows shown only when non-default.
- Final preview: floating resizable window with internal zoom and pan of the flattened PNG-like render.
- Layers: add, delete, reorder, rename, visibility, opacity, right-click Merge Down (undoable); independent per-layer size and transform (position/rotation/flips); Transform tool; painting targets the active layer.
- Layer resize: per-layer width/height 1..1024 via Resize button + dialog; expand fills transparent right and below, shrink crops right and below, top-left preserved; undoable.
- Channel lock: per-layer R/G/B/A lock toggles; paint, clear and Merge Down write only unlocked channels (locked channels keep old values).
- Undo/redo for image edits and layer resizes (`Ctrl+Z` / `Ctrl+Y`), region-based history tagged per layer.
- Single cell per layer for now (no animation UI yet; project format already supports cells/frames).
- WebGL2-only canvas (Three.js) with nearest-neighbor scaling, zoom, rotation + mirror view transform, and pan.
- Toolbar with pencil and loupe (zoom/rotate/flip) tools.
- Configurable transparency checkerboard: image-space or screen-space, independent width/height (default 16x16, asymmetric like 8x16 supported), two colors, persisted in the browser.
- Directory projects over File System Access API: `project.json` + `cells/*.png`.
- Status bar: tool, color, cursor pixel, canvas size, zoom, project name, dirty flag, messages.
