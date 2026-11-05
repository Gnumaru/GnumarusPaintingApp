# FEATURES_SUMMARY — Gnumaru's Painting and Animation App (v1 MVP)

- Desktop app shell: top menu bar (File > New/Open/Save, Edit > Undo/Redo/Settings/Reset Canvas Transform), left toolbar, central canvas, right layers panel, bottom status bar.
- Pixel-art pencil: 1px solid color, no anti-aliasing.
- Layers: add, delete, reorder, rename, visibility, opacity, right-click Merge Down (undoable); painting targets the active layer.
- Undo/redo for image edits (`Ctrl+Z` / `Ctrl+Y`), region-based history tagged per layer.
- Single cell per layer for now (no animation UI yet; project format already supports cells/frames).
- WebGL2-only canvas (Three.js) with nearest-neighbor scaling, zoom, rotation + mirror view transform, and pan.
- Toolbar with pencil and loupe (zoom/rotate/flip) tools.
- Configurable transparency checkerboard: image-space or screen-space, independent width/height (default 16x16, asymmetric like 8x16 supported), two colors, persisted in the browser.
- Directory projects over File System Access API: `project.json` + `cells/*.png`.
- Status bar: tool, color, cursor pixel, canvas size, zoom, project name, dirty flag, messages.
