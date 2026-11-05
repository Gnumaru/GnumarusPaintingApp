# CHECKLIST — Gnumaru's Painting and Animation App (MVP v1)

- [x] Lock WebGL2-only + latest permissive deps (three, lit, vite, typescript, vitest, playwright)
- [x] Scaffold: `package.json`, `vite.config.ts` (`base: './'`), `tsconfig.json` (`strict`), `index.html`, `src/`, `tests/`
- [x] Shell UI: menu bar (File > New/Open/Save), toolbar (pencil + color), central canvas host, status bar, layers panel with R/G/B/A locks
- [x] Canvas engine: Three WebGL2 renderer, `NearestFilter` multi-layer textures, zoom + pan + rotation + flips, per-layer transform
- [x] Pencil tool: 1px solid, no AA, Bresenham strokes, buffer + texture upload, masked by channel locks
- [x] Project format: `project.json` + `cells/*.png` (dir-based, multi-layer with locks, backward compatible)
- [x] File System Access API: New/Open/Save via `showDirectoryPicker()`, Chromium messaging
- [x] Unit tests (vitest): pixel buffer, channel lock, project format, mapping, checker, history — 43 passed
- [x] E2E test (Playwright): shell + menu + New + pencil + layers + merge + channel locks — 21 passed
- [x] Docs: `README.md`, `FEATURES_SUMMARY.md`, `FEATURES_DETAIL.md`, `PLAN.md` up to date
- [x] `npm run build` + `npm run test` + `npm run test:e2e` scripts green
- [ ] `npm run deploy` to `/var/www/html/GnumarusPaintingAndAnimationApp` (needs web-server dir access)
- [x] Channel lock: masked pixel ops (`setPixel`/`drawPixelLine`/`clear`/`composite`) with `GnumarusChannelLock`
- [x] Channel lock: per-layer lock state in engine + `project.json` round-trip (backward compatible)
- [x] Channel lock: layers panel R/G/B/A toggles + save/load + undo of merge restores locks
- [x] Channel lock: unit + e2e tests, `npm run build`, `npm run test`, `npm run test:e2e` green, docs updated
