Import and export
==================

Project format
--------------

A folder project is ``project.json`` (layers, transforms, locks,
cells, animations) plus one PNG or WebP/JXL texture per cell under
``cells/``. Native opens never alter stored textures; a
``.gpp`` package uploads the same content into browser storage.

Stills and sheets
-----------------

Export writes PNG, JPEG, WebP stills and spritesheets (rows/columns,
per-frame painting). Fit-all-textures and crop-all-cells batch jobs
normalize the project first; reload-all-textures restores files edited
externally, skipping new textures (undoable).

Animated files
--------------

JXL (still/lossy/animated/sheet), WebP (still/lossy/animated/sheet)
and GIF export honor frame durations; the total-duration dialog splits
evenly across the selected range.

Vectors, 3D and tilemaps
------------------------

SVG imports render into the current layer (invalid features warn, and
compressed ``.svgz`` works). 3D models (``.blend``/``.glb`` render,
packed textures included) import as layers with orbit lighting. Any
project texture becomes a tileset for the tile brush; tilemaps store
inline in ``project.json``.

Third-party projects
--------------------

**File > Import** reads Aseprite (tags become named animations),
layered PSD/XCF (blend modes preserved) and Kra/GIF, with per-file
occupancy, corruption and cancellation handling — failed imports never
touch the current project.
