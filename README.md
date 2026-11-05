# Gnumaru's Painting and Animation App

Frontend-only single page web application for digital painting, pixel art, vector art and frame-by-frame animation, accelerated with WebGL2.

## Intended use

Classic desktop-like painting app (top menu bar, central canvas, bottom status bar) in the spirit of Photoshop, Krita and GIMP. This initial version (v1 MVP) targets pixel-art sketching with a single 1px solid pencil, single layer, and directory-based projects.

## Features (v1)

- Desktop shell: File menu (New, Open, Save), pencil toolbar with color picker, WebGL2 canvas, status bar.
- Pixel-art pencil: 1px solid color, no anti-aliasing, Bresenham strokes, nearest-neighbor display, wheel zoom + pan.
- Directory projects via the File System Access API (Chromium derivatives): `project.json` metadata plus `cells/<layer>_frame<frame>.png` cell images (format already supports future layers/animation, v1 writes a single layer with a single cell).
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
