# FEATURES_SUMMARY — Gnumaru's Painting and Animation App (v1 MVP)

- Desktop app shell: top menu bar (File > New/Open/Save, Edit > Settings), left toolbar, central canvas, bottom status bar.
- Pixel-art pencil: 1px solid color, no anti-aliasing.
- Single layer, single cell (no layers/animation UI yet; project format already supports them).
- WebGL2-only canvas (Three.js) with nearest-neighbor scaling, zoom (wheel + `Ctrl+Alt+=`/`Ctrl+Alt++`/`Ctrl+Alt+-`) and pan.
- Configurable transparency checkerboard: image-space or screen-space, square size (default 16), two colors, persisted in the browser.
- Directory projects over File System Access API: `project.json` + `cells/*.png`.
- Status bar: tool, color, cursor pixel, canvas size, zoom, project name, dirty flag, messages.
