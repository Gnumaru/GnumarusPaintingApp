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

**Filters** groups all 65 filters by the look they produce; every
entry is also a ``filter-<id>`` run action for the palette. With an
active floating selection, only its masked content is filtered.

Blur (8)
--------

* **Gaussian Blur** (radius) — leaves the image soft and out of focus,
  melting small details away.
* **Motion Blur** (angle, length) — smears the image as if the camera
  moved while shooting.
* **Pixelize** (size) — turns the image into big flat squares.
* **Box Blur** (radius) — leaves the image blurry with a rougher,
  harsher look.
* **Circular Motion Blur** (angle) — smears the image in circles
  around the center, like a spinning photo.
* **Zoom Motion Blur** (amount) — streaks light outward from the
  center, like rushing forward.
* **Selective Blur** (radius, maxDelta) — softens flat areas while
  keeping strong edges sharp.
* **Lens Blur** (radius, sides) — soft photo-like blur with shaped
  spots of light.

Enhance (7)
-----------

* **Unsharp Mask** (radius, amount, threshold) — makes edges and
  details look crisper.
* **Sharpen** — makes the whole image look crisper and more defined.
* **Despeckle** (radius) — wipes grainy dots away while keeping edges.
* **SNN Mean** (radius) — smooths noise while keeping edges.
* **High Pass** (radius, contrast) — keeps only fine detail on gray,
  for mixing sharpness back in.
* **Antialias** — softens jagged stair-step edges.
* **Value Propagate** (mode, radius) — spreads the brightest areas
  outward (or the darkest ones inward).

Artistic (7)
------------

* **Oil Paint** (size, levels) — makes the photo look like an oil
  painting with visible strokes.
* **Emboss** (depth, azimuth) — makes the image look carved in relief,
  lit from one side.
* **Cartoon** (amount) — darkens the outlines so the image looks
  hand-drawn.
* **Photocopy** (radius, bias) — turns the image into a black-and-white
  photocopy.
* **Soft Glow** (radius, brightness, sharpness) — lays a dreamy glow
  over the bright areas.
* **Halftone** (size) — prints the image as newspaper dots.
* **Tile Mosaic** (tileWidth, tileHeight) — rebuilds the image from
  flat rectangular tiles.

Edge detect (7)
---------------

* **Sobel Edges** (direction) — keeps only the outlines, as light
  lines on dark.
* **Neon Edges** (radius, amount) — draws glowing colored outlines
  over the image.
* **Laplace Edges** — keeps fine outlines on dark.
* **Difference of Gaussians** (radius1, radius2) — shows fine detail
  as dark lines on gray.
* **Fixed Emboss** (direction) — carved-relief look with a fixed
  light direction.
* **Height to Normal** (strength, channel) — repaints brightness as
  colorful 3D-like surface shading.
* **Image Gradient** — shows the color edges as bright color lines.

Noise (5)
---------

* **RGB Noise** (amount, mono, seed) — sprinkles random colored grain.
* **Hurl** (mode, amount, seed) — scatters random colored pixels.
* **Spread** (amount, seed) — jumbles pixels like a bad TV signal.
* **HSV Noise** (amount, seed) — sprinkles lively colorful grain.
* **LCh Noise** (amount, seed) — sprinkles soft natural-looking grain.
* Every grain filter replays identically with the same seed.

Colors (23)
-----------

* **Posterize** (levels) — flattens the image into a few flat color
  bands.
* **Threshold** (threshold, channel) — forces everything to pure
  black or pure white.
* **Invert** — flips the image into a photo negative (alpha stays).
* **Desaturate** (mode) — drains all color, leaving gray.
* **Color to Alpha** (color, threshold) — erases one chosen color,
  turning it transparent.
* **Color Balance** (range, cyanRed, magentaGreen, yellowBlue,
  preserve) — pushes the overall tint warmer/cooler or greener/more
  magenta.
* **Channel Mixer** (3x3 weights, preserve) — recolors the image by
  blending its red, green and blue channels into each other.
* **Colorize** (hue, saturation, lightness) — repaints everything in
  one chosen color family.
* **Sepia** (scale) — gives the aged brown vintage-photo tone.
* **Exposure** (black, exposure) — brightens or darkens as if changing
  the camera exposure.
* **Saturation** (scale) — makes colors vivid or fades them to gray.
* **Dodge and Burn** (mode, type, exposure) — lightens or darkens like
  darkroom retouching.
* **Auto Contrast** — stretches tones so darks go darker and lights
  go brighter.
* **Slope, Offset, Power** (per-channel sliders) — precise
  professional color grading for shadows, midtones and highlights.
* **Mono Mixer** (red, green, blue, preserve) — black-and-white with
  control over how each color turns to gray.
* **Maximize Channel** — pushes every pixel toward vivid, poster-like
  color.
* **Minimize Channel** — pushes every pixel toward deep dark tones.
* **Normalize** — stretches tones so the image spans full black to
  full white.
* **Levels** (channel, low, high, gamma) — remaps brightness with
  black/white sliders and a midtone control.
* **HSV Adjust** (hue, saturation, value, colorize) — shifts all
  colors' hue, vividness and brightness at once.
* **Palettize** (colors, dither) — reduces the image to a hand-picked
  color list, retro look included.
* **Gradient Map** (colors, dither) — repaints brightness as a color
  gradient (dark becomes one color, light another).
* **Propagate Colors** (distance) — bleeds edge colors into the
  transparent surroundings, cleaning halos around cutouts; existing
  pixels don't move.

Decor (2)
---------

* **Round Corners** (radius) — cuts the corners round and transparent.
* **Video Degradation** (pattern, strength) — adds retro VHS-style
  artifacts.

Distort (6)
-----------

* **Waves** (amplitude, period, direction) — ripples the image like
  water.
* **Wind** (direction, strength, seed) — streaks pixels sideways like
  a strong wind.
* **Whirl and Pinch** (whirl, pinch, radius) — twists the image into
  a spiral around its center.
* **Polar Coordinates** (mode, rotation) — wraps the image into a
  circle, or unwraps it back.
* **Lens Distortion** (main, edge, zoom) — bulges or pinches like a
  cheap lens.
* **Shift** (direction, amount, seed) — slides rows or columns with
  wraparound.
