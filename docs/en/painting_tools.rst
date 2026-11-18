Painting tools
==============

Pencil (B)
----------

The pixel brush. Size is a min–max range: pen pressure interpolates
between them through the size curve; without pressure response the
maximum always paints. Tips: ``square``, ``circle`` (disk test) or
``line`` (an Aseprite-style straight dab rotated by the brush angle,
always aliased — aimed at mouse users). Circles ignore the brush angle
(``-180…180``).

Pressure, tilt and speed
------------------------

Pressure response modes: ``none``, ``size``, ``opacity``,
``size+opacity`` (mice always read full pressure). Size and alpha curves
(``linear``/``soft``/``firm``) reshape the tablet signal; tilt
broadening and speed fade (fast strokes lose flow) modulate the dab on
top. The stabilizer (``none``/``rope`` with leash length/``follow``
with chase strength) smooths the stroke with a paint-focus dot.

Pixel dynamics
--------------

* **Pixel spray**: keeps a deterministic fraction of dabs.
* **Dither** (Bayer 4x4): a pixel paints only when its matrix threshold
  beats the effective alpha. With a pen, press lightly for sparse
  patterns; with a mouse, lower **Flow** — flow is shown for every tip
  and thins the pattern exactly like pressure would. Painted pixels
  always keep full opacity: only the pattern density varies.
* **Palette shade**: steps each painted pixel through the shading
  palette instead of laying flat color.

Soft and image tips
-------------------

**Soft round** adds hardness falloff; **image** tips stamp an imported
grayscale mask as a tintable alpha (auto-trimmed, archived as lossy JXL
under OPFS ``brushes/``). On top of any tip: dab spacing with
fractional carry, per-dab flow, anchored paper grain (scale/strength),
deterministic fuzzy jitter, tip rotation (none or following the
stroke), timed airbrush, and pickup smudge/mixer (rate + wetness).

Blend, accumulate, symmetry, wrap
---------------------------------

Paint blend modes: normal, copy, eraser (``E`` toggles eraser,
remembering the previous mode). **Accumulate** unifies overlapping
dabs; canvas symmetry (left-right/up-down/four-way, draggable axes)
mirrors pencil strokes; wrap modes repeat the texture infinitely while
painting.

Line, curve, shapes, bucket
---------------------------

**Line** (width, shape, anti-aliasing, two-click segments),
**curve** (dragged endpoints plus two Bézier controls),
**rectangle/ellipse/polygon/gradient** shapes and the **bucket** fill
(blend option, threshold, contiguous) complete the paint drawer.

Live feedback
-------------

The tip preview follows the mouse, raster shape previews match the
commit pixel-for-pixel, and ``Shift+Left-drag`` resizes the active tool
live. ``Esc`` cancels the in-progress stroke or gesture.
