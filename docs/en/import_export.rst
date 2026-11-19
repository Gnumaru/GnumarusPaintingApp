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
per-frame painting). Tick **Export background** to bake a background
under the image (same as project, a solid color, or a custom
checkerboard); unticked keeps transparency where the format supports
it. Fit-all-textures and crop-all-cells batch jobs
normalize the project first; reload-all-textures restores files edited
externally, skipping new textures (undoable).

Animated files
--------------

JXL (still/lossy/animated/sheet), WebP (still/lossy/animated/sheet), APNG
(lossless, first frame doubles as the static image) and GIF export honor
frame durations; the total-duration dialog splits evenly across the
selected range. WebM and MKV export encode VP9 video and MP4 exports
H.264 video (all through the platform encoder, with the quality slider
driving the bitrate); options whose codec the browser cannot encode are
disabled with a reason. Every video ends with an invisible 1 ms copy
of the last frame so VLC shows the true last frame.

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
touch the current project. Dropping a raster image file anywhere onto
the app imports it as the current cell texture (an occupied cell
reports an error asking for an empty cell instead of adding a layer).
Dropping a project file (.psd/.xcf/.kra/.krz/.ase/.aseprite) opens a
confirmation: canceling does nothing, importing discards the current
project and loads the file.
