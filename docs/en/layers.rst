Layers
======

Layers panel
------------

Each row selects the layer and exposes: visibility, opacity, blend mode
(normal, multiply, add, alpha-aware variants that show through
transparent texels), R/G/B/A channel locks, rename, resize, and
per-row move/delete. Multi-select layers with ``Ctrl``/``Shift`` for
bulk delete; drag layer names to reparent under nesting masks.

Channel locks
-------------

Any combination of channels locks per layer and persists in the
project. Painting, clear and Merge Down write only unlocked channels
(locking alpha keeps old opacity; locking green turns cyan paint
blue). Locks are structural: they are not undoable themselves, but
merge restores the removed layer's locks on undo.

Resize, fit and transform
-------------------------

Per-layer resize (1…1024 per side in the dialog, larger via canvas
expand) keeps the top-left content, fills new area with transparency
and crops the excess — one undo entry. **Resize to canvas** matches the
canvas; **Fit texture to size** trims transparent borders (threshold +
default setting). The layer context menu also offers Reset transform.

Masks and merge
---------------

A layer converts to a nesting mask (and back) from its context menu;
masked regions composite through the parent. **Merge Down** (``Ctrl+E``)
composites onto the layer below, frame-aware, preserving the lower
layer's transform where possible.

Cells
-----

Every layer × frame slot is a cell: empty cells materialize a content
(and a texture when missing) on first paint. Crop empties back to
transparent; context menus unlink/relink shared cell contents.
