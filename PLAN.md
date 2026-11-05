# PLAN — Gnumaru's Painting and Animation App (MVP v1)

## 1. Goal
Frontend-only single page web app for digital painting, pixel art, vector art and frame-by-frame animation, accelerated with WebGL2. MVP v1 is a classic desktop-like shell (top menu bar, central content, bottom status bar) with a single pixel-art pencil tool, single layer, and File > New/Open/Save backed by the File System Access API over a project directory.

## 2. Locked decisions
- WebGL2-only. Fail fast with explicit message when `webgl2` context is unavailable. No WebGL1 fallback.
- Most recent libraries at scaffolding time (all permissive licenses, no GPL/viral):
  - `three@0.187.0` (MIT) — single `WebGLRenderer` (WebGL2), ortho camera for raster, persp camera reserved for future 3D reference layers.
  - `lit@3.3.3` (BSD-3-Clause) — UI components (menu bar, toolbar, status bar) via Web Components. Canvas loop stays outside Lit reactivity.
  - `vite@8.3.5` (MIT) — build with `base: './'` so the app works at `/` or any nested path.
  - `typescript@7.0.2` (Apache-2.0) — `strict: true`, no `any` unless impossible.
  - `vitest@5.1.0` (MIT) — unit tests. `@playwright/test@1.64.1` (Apache-2.0) — E2E in headless Chromium.
- No `twgl.js` / `gl-matrix` / `earcut` direct deps in v1 (covered by Three). No WASM in v1. No `paper.js` / `resvg` in v1. Vector stays as future work; SVG renders natively in-browser for UI/overlay only.
- RAM conservative: one `Uint8Array` RGBA pixel buffer for the single layer, one `THREE.DataTexture` (`NearestFilter`), lazy `import()` of `three/addons` loaders only when 3D is added (v2).

## 3. MVP scope (v1)
- Shell: top menu bar (File > New, Open, Save), left toolbar (pencil + color + zoom readout), central WebGL2 canvas, bottom status bar (tool, color, cursor pixel, canvas size, zoom, project name, dirty flag, FS API support).
- Canvas engine (`src/canvas/GnumarusCanvasEngine.ts`): Three WebGL2 renderer, `NearestFilter`, fullscreen textured quad, integer zoom (wheel) + pan (middle-drag / space-drag), DPR-aware.
- Pencil: 1px solid color, no anti-aliasing, Bresenham line interpolation between pointer events, draws into CPU buffer then `texture.needsUpdate`.
- New: dialog for width/height (default 64x64, clamp 1..1024), clears buffer.
- Open/Save: `showDirectoryPicker()` (Chromium). Project directory format (forward-compatible with future layers/animation, v1 writes single layer single cell):
  - `project.json`: `{ app, version, width, height, layers: [{ id, name, visible, opacity, cells: [{ frame, file }] }] }`
  - `cells/layer0_frame0.png`
  - Open reads `project.json` + PNG into buffer. Save writes `project.json` + PNG encoded from buffer.
- Status bar reflects state after every action. All user-visible strings in American English.

## 4. Non-goals for v1
No multi-layer, no animation/timeline, no vector editing, no 3D viewport, no filters, no WASM, no `file` single-file format.

## 5. Verification
- `npm run build` passes (tsc strict + vite, relative `./assets/` output verified for nested hosting).
- `npm run test`: 12/12 Vitest unit tests pass.
- `npm run test:e2e`: 3/3 Playwright/Chromium tests pass (boot+menu, New dialog flow, real pencil stroke via mouse).
- Fixed during implementation: Lit class-field shadowing (reactive fields use `declare` + constructor init), local minimal `src/three.d.ts` so no new `@types/three` dependency was needed.
- `npm run deploy` = `rm -rf /var/www/html/GnumarusPaintingAndAnimationApp; npm run build; cp -r dist /var/www/html/GnumarusPaintingAndAnimationApp` (pending: needs write access to `/var/www/html`).
