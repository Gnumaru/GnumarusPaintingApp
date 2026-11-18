Brushes and presets
====================

Using presets
-------------

The preset select in the tool options bar applies a full brush setup at
once (19 built-ins: Pixel Hard, Pixel Spray, Pixel Dither, Palette
Shade, Soft Round, Chalk, Ink, Airbrush, Smudge, hard/soft Erasers,
Glaze, Dry Brush, Charcoal, Blender, Spray, Chisel Marker, Velocity
Ink, Tilt Pencil). Tweak anything afterwards freely.

Reset button
------------

The **Reset** button sits immediately left of the preset select, both
in the options bar and in the color-picker side panel. It re-applies
the selected preset defaults, discarding later tweaks — the way back
after experimenting.

Preset manager
--------------

**Presets** opens the manager dialog: pick a preset to apply, name the
current settings and **Save** them as a custom preset (customs persist
in localStorage), **Delete** customs, **Export** any preset as JSON or
**Import** a preset file (importing applies it immediately).

Selection brush
---------------

**Edit > Create brush from selection** (needs a floating selection)
captures it as a paintable brush and switches the pencil to it:

* **Stamp**: the whole capture is stamped per dab (the tip preview
  outlines its bounding box).
* **Origin**: the capture paints as a wrapping pattern anchored at the
  copy point — it replays the selection in place.
* **Destination**: the pattern anchors at the stroke start instead.

The current geometric tip (shape/size/angle) acts as the pattern mask,
so a line tip paints calligraphy with the texture. Locks, blend modes
and wrap apply as usual.

Dual tips and tip import
------------------------

A second image mask can multiply the primary dab (black blocks, white
passes) with its own strength/size; **Clear** removes it. **Import**
loads a PNG as the image tip (auto-fit threshold, 128 px cap) and
archives it for reuse.
