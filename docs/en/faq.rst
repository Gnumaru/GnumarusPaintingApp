FAQ and troubleshooting
=========================

The canvas is black / the app shows a WebGL2 message
----------------------------------------------------

The GPU or browser refused a WebGL2 context. Use a Chromium browser
with hardware acceleration enabled; remote-desktop and some virtual
machines need their 3D driver turned on.

Saving asks for a folder every time
-----------------------------------

Non-Chromium browsers cannot retain folder permission: use **Save
project as** into browser storage, or switch to Chromium for real
folder projects.

The Pixel Dither brush paints solid with a mouse
------------------------------------------------

Mice always read full pressure, so the Bayer pattern fills. Lower
**Flow** (visible for every tip): it thins the dither exactly like
light pen pressure.

The action palette lists tools and filters too
----------------------------------------------

Yes — every ``tool-<name>`` and ``filter-<id>`` runs from
``Ctrl+Shift+P`` by name, including the floating-selection-gated ones
(which report why they are blocked).

An import failed
----------------

Corrupt, passworded or unsupported files abort before touching the
project; the status bar names the reason. Try the import cleanup
setting (none/fit/crop) for odd-sized textures.

Where are my files?
-------------------

Folder projects store ``project.json`` + ``cells/`` textures (plus
inline tilemaps and content pools). Embedded projects live in browser
storage; export ``.gpp`` to move them between machines.
