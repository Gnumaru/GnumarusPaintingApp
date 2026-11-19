Transforms and utility tools
==============================

Cell transform (T)
-------------------

The non-destructive cell transform moves, resizes, rotates, skews and
flips the active cell around draggable anchors (center resets);
holding ``Alt`` on a handle resizes proportionally. Committing merges
the result; growing rotations expand the home texture to fit.

3D cell rotation (Y) and selection 3D (U)
-----------------------------------------

Tilt the layer with a trackball gizmo (rings rotate one axis); the
destructive selection variants transform the floating content instead.
``Esc`` cancels, ``Enter`` commits.

Loupe (Z), pan tool, eyedropper, tile brush
-------------------------------------------

The loupe pans (any-button drag), zooms (wheel), rotates and flips the
view without touching pixels. The pan tool only pans: dragging with
any mouse button moves the canvas even with ``Ctrl``, ``Alt``,
``Shift`` or the space bar held (holding ``Ctrl`` never summons the
temporary eyedropper while it is active). The eyedropper picks the
composited color; holding ``Ctrl`` makes any other tool a temporary
eyedropper.
The tile brush paints tilemap cells from any project texture as
tileset (rectangular tiles, per-tile flip and 90° rotations,
``Shift``-click lines, ``Ctrl+Shift``-click rectangles, right-click
erases).
