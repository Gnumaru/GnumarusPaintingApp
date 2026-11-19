Animation
=========

The animation matrix
--------------------

Rows are layers (top-first, like the layers panel), columns are
frames. Frame headers rename inline (double-click, ``Enter`` commits,
``Esc`` blurs out), set per-frame duration, and add/remove frames;
``+`` appends a frame. Clicking selects; ``Ctrl``-click toggles
discontiguous frames, ``Shift``-click unions the range. Cells pick the
active layer × frame; empty cells materialize on first paint.

Onion skinning
--------------

Ghosts of neighboring frames flank the current one (configurable
count per side, toggle + settings persist) so in-betweens stay on
model.

Playback and duration
---------------------

Transport plays from the current frame, advancing by each frame's
duration (default duration setting + reset included). Frame headers
show tooltips naming every animation that includes the frame.

Named animations
----------------

Define ``name,loop,frames`` strings (loop is one of ``none``,
``forward``, ``ping-pong``, ``backward`` or ``ping-pong-backward``;
dropdown + highlight + scoped playback, Aseprite tag import) and delete
with confirmation. The
action palette offers frame/layer menus, arrows navigation and the
matrix context menus for bulk delete, per-range duration and total
duration (evenly split).

Export
------

**File > Export** writes stills, lossy/lossless animated files and
spritesheets (JXL still/lossy/animated/sheet, WebP, PNG, JPEG, GIF),
with fit-all and crop-all batch actions and reload-all-textures for
external edits.
