Selections
==========

Selection tools
---------------

Five tools share the selection drawer: **rectangular** and
**elliptical** (drag; ``Shift`` adds, ``Ctrl+Shift`` intersects,
``Alt+Shift`` subtracts, pending shapes show resize handles),
**lasso**, **polygonal lasso** and **color select** (threshold plus
contiguous toggle). ``R``/``V`` jump to the selection tools.

Floating selection
------------------

Painting inside a selection, or moving it, lifts the content into a
*floating selection*: the home texture is preserved underneath until
you commit (``Enter``) or cancel (``Esc``, restoring the snapshot).
Every stroke on a floating selection is a single undo entry. The
**Deselect** state is just the absence of a floating selection.

Clipboard
---------

* ``Ctrl+C`` copies the floating selection (pixels + mask) into memory.
* ``Ctrl+Shift+C`` copies the visible composite instead.
* ``Ctrl+X`` cuts, ``Ctrl+V`` pastes memory back as a floating
  selection. Pasting alpha-blends over the layer.

Boolean and reshape operations
------------------------------

Add, intersect and subtract combine the pending shape with the current
selection; **feather** softens the merged edge, **grow/shrink** expand
or contract the masked area by pixels, and invert flips it.

Transforming selections
-----------------------

With content floating, drag anchors to move, resize, rotate, skew and
flip; the center handle resets the transform. The same gizmo drives
the non-destructive cell transform tools (plus a 3D rotation variant),
and proportional resize comes from holding ``Alt`` on any handle.
**Crop to canvas** trims the home texture to the canvas bounds.
