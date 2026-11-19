Interface
=========

Menu bar
--------

* **File**: New/Open/Save/Save-as project, upload and embedded-project
  variants, full-project import (Aseprite, PSD, XCF, Kra, GIF, GPP),
  SVG/3D-model/raster import, content manager, still/animated/sheet
  export.
* **Edit**: Undo/Redo, cut/copy/paste of the floating selection, copy
  merged, create-brush-from-selection, settings, brightness/contrast and
  hue/saturation adjustments, canvas-transform reset.
* **Tools**: every paint, shape, retouch, selection, destructive,
  transform and 3D tool, grouped in drawer submenus.
* **Filters**: all destructive filters grouped by theme (blur, enhance,
  artistic, edge, noise, colors, decor, distort).
* **Help**: this manual, the shortcuts list, the third-party licenses
  list, the source code page and a shortcut to the public GitHub
  Pages build.

Tool options bar
----------------

Directly below the menu bar, it follows the active tool: the pencil
shows brush size, shape, tip kind, dynamics, stabilizer and blend mode;
line/curve/bucket and the other tools show their own settings. Tools
with nothing to configure say so explicitly.

Left toolbar
------------

Drawer buttons group related tools (front tool paints, right-click
opens the flyout). Standalone buttons: loupe (``Z``), bucket (``F``),
eyedropper (hold ``Ctrl`` anywhere for a temporary one), text and tile
brush. Below them sit the foreground/background wells (click to edit,
``X`` swaps) and the pencil color picker, whose side panel docks the
same brush settings as the options bar.

Layers panel and animation matrix
---------------------------------

The right panel lists layers (visibility, opacity, blend mode, R/G/B/A
channel locks, rename, resize, reorder, merge, masks). Under it, the
animation matrix shows layers against frames with per-cell content
pickers, frame headers (rename, duration, add/remove) and the onion
skin, playback and content-manager controls. Right-click layer names,
frame headers and cells for context menus.

Status bar and dialogs
----------------------

The bottom bar reports the tool, color, cursor pixel, canvas and layer
sizes, zoom, rotation, flips and project state. All destructive or
structural operations run through dialogs with live preview and
``OK``/``Apply``/``Cancel`` semantics; released sliders preview on the
canvas and ``Cancel`` always reverts.

Action palette
--------------

``Ctrl+Shift+P`` (``Cmd+Shift+P`` on macOS) opens the run-action dialog.
Type a few letters — every menu item, tool (``tool-pencil`` and
friends) and filter (``filter-levels`` and friends) is listed and runs
on ``Enter``. ``0`` resets the canvas transform; ``Tab`` hides the
interface chrome.
