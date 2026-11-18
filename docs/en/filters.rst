Filters
=======

Every filter is destructive: it rewrites the current cell (or the
floating selection) and records one undo entry.

The generic dialog
------------------

Opening any filter shows the same floating dialog: named parameters
with sliders plus exact numeric fields, a reset arrow per parameter
that restores its default, a live canvas preview on release, and three
ways out — **OK** commits and closes, **Apply** commits but stays open
(re-basing the Cancel snapshot), **Cancel** (or ``Esc``) reverts to the
pre-dialog — or pre-last-Apply — pixels. Painting on the canvas bakes
the preview first.

Filters menu
------------

**Filters** groups all 65 filters by theme; every entry is also a
``filter-<id>`` run action for the palette. With an active floating
selection, only its masked content is filtered.

Blur (8)
--------

* **Gaussian Blur** (radius) — softens via a separable triple-box
  approximation.
* **Motion Blur** (angle, length) — smears along a direction.
* **Pixelize** (size) — downsamples into flat blocks.
* **Box Blur** (radius) — single-pass mean, harsher than gaussian.
* **Circular Motion Blur** (angle) — smears along arcs.
* **Zoom Motion Blur** (amount) — smears along rays from the center.
* **Selective Blur** (radius, maxDelta) — averages only close
  neighbors.
* **Lens Blur** (radius, sides) — polygonal-aperture bokeh.

Enhance (7)
-----------

* **Unsharp Mask** (radius, amount, threshold) — adds blurred detail
  back above a threshold.
* **Sharpen** — fixed 3x3 kernel.
* **Despeckle** (radius) — median filter, keeps edges.
* **SNN Mean** (radius) — symmetric nearest-neighbor smoothing.
* **High Pass** (radius, contrast) — fine detail on mid-gray.
* **Antialias** — smooths only pixels differing from neighbors.
* **Value Propagate** (mode, radius) — dilate/erode bright/dark.

Artistic (7)
------------

* **Oil Paint** (size, levels) — neighborhood dominant tone.
* **Emboss** (depth, azimuth) — directional-light relief.
* **Cartoon** (amount) — darkens edges, hand-inked look.
* **Photocopy** (radius, bias) — adaptive black-and-white.
* **Soft Glow** (radius, brightness, sharpness) — screens blurred
  highlights back.
* **Halftone** (size) — newspaper dot screen.
* **Tile Mosaic** (tileWidth, tileHeight) — rectangular averages.

Edge detect (7)
---------------

* **Sobel Edges** (direction) — edge magnitude as grayscale.
* **Neon Edges** (radius, amount) — soft edge glow.
* **Laplace Edges** — fixed 3x3 second derivative.
* **Difference of Gaussians** (radius1, radius2) — fine detail.
* **Fixed Emboss** (direction) — classic 3x3 relief.
* **Height to Normal** (strength, channel) — luminance to normal map.
* **Image Gradient** — per-channel Sobel in full color.

Noise (5)
---------

* **RGB Noise** (amount, mono, seed), **Hurl** (mode, amount, seed),
  **Spread** (amount, seed), **HSV Noise** (amount, seed),
  **LCh Noise** (amount, seed) — deterministic grain (same seed
  replays).

Colors (23)
-----------

* **Posterize** (levels), **Threshold** (threshold, channel),
  **Invert**, **Desaturate** (mode), **Color to Alpha** (color,
  threshold), **Color Balance** (range, cyan/red, magenta/green,
  yellow/blue, preserve), **Channel Mixer** (3x3 weights, preserve),
  **Colorize** (hue, saturation, lightness), **Sepia** (scale),
  **Exposure** (black, exposure), **Saturation** (scale),
  **Dodge and Burn** (mode, type, exposure), **Auto Contrast**,
  **Slope, Offset, Power** (ASC-CDL, per channel),
  **Mono Mixer** (red, green, blue, preserve),
  **Maximize/Minimize Channel**, **Normalize**,
  **Levels** (channel, low, high, gamma), **HSV Adjust** (hue,
  saturation, value, colorize), **Palettize** (colors, dither),
  **Gradient Map** (colors, dither),
  **Propagate Colors** (distance; alpha untouched).

Decor (2)
---------

* **Round Corners** (radius) — transparent rounded corners.
* **Video Degradation** (pattern, strength) — scanlines, checker or
  shifted rows.

Distort (6)
-----------

* **Waves** (amplitude, period, direction), **Wind** (direction,
  strength, seed), **Whirl and Pinch** (whirl, pinch, radius),
  **Polar Coordinates** (mode, rotation),
  **Lens Distortion** (main, edge, zoom),
  **Shift** (direction, amount, seed; wraps around).
