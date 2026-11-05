# CHECKLIST — Gnumaru's Painting and Animation App (MVP v1)

- [x] Lock WebGL2-only + latest permissive deps (three, lit, vite, typescript, vitest, playwright)
- [x] Scaffold: `package.json`, `vite.config.ts` (`base: './'`), `tsconfig.json` (`strict`), `index.html`, `src/`, `tests/`
- [x] Shell UI: menu bar (File > New/Open/Save), toolbar (pencil + color), central canvas host, status bar
- [x] Canvas engine: Three WebGL2 renderer, `NearestFilter` single-layer texture, zoom + pan
- [x] Pencil tool: 1px solid, no AA, Bresenham strokes, buffer + texture upload
- [x] Project format: `project.json` + `cells/layer0_frame0.png` (dir-based, future-proof)
- [x] File System Access API: New/Open/Save via `showDirectoryPicker()`, Chromium messaging
- [x] Unit tests (vitest): project format, pixel buffer, mapping, color — 12 passed
- [x] E2E test (Playwright): shell + menu + New + real pencil stroke — 3 passed
- [x] Docs: `README.md`, `FEATURES_SUMMARY.md`, `FEATURES_DETAIL.md` up to date
- [x] `npm run build` + `npm run test` (+ e2e) scripts working
- [ ] `npm run deploy` to `/var/www/html/GnumarusPaintingAndAnimationApp` (needs web-server dir access)
