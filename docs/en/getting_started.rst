Getting started
===============

Requirements
------------

* A Chromium-based browser (Chrome, Edge, Opera, Brave). Folder projects
  use the File System Access API, which needs Chromium. Opening and
  saving inside browser storage works everywhere the app loads.
* A GPU with WebGL2. The app refuses to start without it and shows an
  explicit message instead of a broken canvas.

Mobile interface
----------------

* On phones (tablets keep the desktop interface), the app boots a
  touch-optimized shell: full-screen canvas and a single bottom bar
  (scrollable tools — pencil, eraser, undo, redo, color/size sheet,
  bucket, eyedropper — plus a fixed menu button holding Save and the
  Desktop version switch).
* One finger paints; two fingers pinch-zoom and pan. The mobile MVP is
  single-layer with no animation.
* **Help > Mobile version** switches the desktop interface to mobile
  and back. The choice is remembered; switching never reloads the page
  and never loses work. The mobile boot project already matches the
  screen size (viewport pixels times devicePixelRatio, long side
  capped at 4096 px).

Your first painting
-------------------

1. Open the app. A default project is already there, ready to paint.
2. Pick the **Pencil** (``B``) and a foreground color in the paint wells.
3. Drag on the canvas. ``Ctrl+Z`` undoes, ``Ctrl+Y`` redoes.
4. **File > Save Project** (``Ctrl+S``) writes the project back to its
   folder. The first save asks for a directory.

Projects
--------

* **File > New Project** creates a blank project (width, height,
  storage presets for textures, and a linked FPS / frame-time pair
  that seeds the new animation's default frame duration).
* **File > Open Project** reads a project folder back (``project.json``
  plus one PNG per layer cell).
* **File > Upload Project** imports a packaged ``.gpp`` file into
  browser storage; embedded projects can also be opened and saved from
  the same menu.
* The title bar shows the project name plus a dirty marker while there
  are unsaved changes.

Where things are
----------------

* Top: the menu bar (**File**, **Edit**, **Tools**, **Filters**,
  **Help**) and, right below it, the tool options bar for the active
  tool.
* Left: the tool drawer bar (paint, shape, retouch, selection,
  destructive, transform and 3D drawers) plus standalone tools (loupe,
  bucket, eyedropper, text, tile brush) and the color wells.
* Right: layers panel and, at the bottom, the animation matrix.
* Bottom: the status bar (tool, color, cursor pixel, canvas and layer
  sizes, zoom, rotation, project name).

Press ``Ctrl+Shift+P`` anywhere to open the action palette: every menu
item, tool and filter is invokable by name. See :doc:`interface`.
