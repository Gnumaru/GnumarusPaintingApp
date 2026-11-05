# FEATURES_SUMMARY — Gnumaru's Painting and Animation App (v1 MVP)

- Desktop app shell: top menu bar (File > New/Open/Save), left toolbar, central canvas, bottom status bar.
- Pixel-art pencil: 1px solid color, no anti-aliasing.
- Single layer, single cell (no layers/animation UI yet; project format already supports them).
- WebGL2-only canvas (Three.js) with nearest-neighbor scaling, zoom and pan.
- Directory projects over File System Access API: `project.json` + `cells/*.png`.
- Status bar: tool, color, cursor pixel, canvas size, zoom, project name, dirty flag, messages.
