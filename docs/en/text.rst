Text
====

The **text** tool drops an editable rich-text content onto the active
cell: family, size, bold/italic/underline, alignment and color, with
undo/redo for every edit. The editor has Edit and HTML tabs in its title row: the HTML tab shows the read-only source of the WYSIWYG pane and refreshes on every edit. Right-clicking the source copies it to the clipboard with a toast. The editor dialog reopens from the cell menu
(**Edit text**) for existing contents. The dialog opens just above the
text it edits (so the live preview stays visible), drags from any free
area, and the size field commits to the selected text on Enter, the Set button, or when it loses focus.

Painting over text, or choosing **Rasterize text**, bakes the laid-out
glyphs into plain pixels (still one undo entry). Text contents persist
in projects in raw or zip storage modes, survive reopen, and export
with a picker badge; corrupt archives report stale state instead of
losing the cell.
