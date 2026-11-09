/**
 * Spritesheet export geometry and compositing. Pure module (no DOM), so
 * everything here is covered by unit tests; the shell only composites
 * per-frame pixels and saves the resulting bytes.
 *
 * Model: the caller resolves each source (named animation, all frames, or
 * a manual `1,3-5` list) into a strip of 0-based project frame indices.
 * Flat layouts (line, column, packed, fixed rows/columns) concatenate the
 * strips in order; grid layouts (per-line, per-column) keep one strip per
 * row or column, leaving unused cells transparent.
 */

export type GnumarusSheetLayout =
  | "line"
  | "column"
  | "per-line"
  | "per-column"
  | "packed"
  | "fixed-rows"
  | "fixed-cols";

export interface GnumarusSheetStrip {
  /** 0-based project frame indices in export order (repeats kept). */
  frames: number[];
}

export interface GnumarusSheetCell {
  /** Cell column in sheet frames. */
  col: number;
  /** Cell row in sheet frames. */
  row: number;
  /** 0-based project frame index shown in this cell. */
  frame: number;
}

export interface GnumarusSheetGeometry {
  /** Sheet width in frames (columns). */
  cols: number;
  /** Sheet height in frames (rows). */
  rows: number;
  /** One entry per exported frame, in export order. */
  cells: GnumarusSheetCell[];
}

export const GNUMARUS_SHEET_LAYOUTS: Array<{ value: GnumarusSheetLayout; label: string }> = [
  { value: "line", label: "Single line" },
  { value: "column", label: "Single column" },
  { value: "per-line", label: "One animation per line" },
  { value: "per-column", label: "One animation per column" },
  { value: "packed", label: "Packed" },
  { value: "fixed-rows", label: "Fixed lines" },
  { value: "fixed-cols", label: "Fixed columns" },
];

/**
 * Compute sheet geometry for non-empty strips. Throws when no strip holds
 * a frame, when the layout is unknown, or when the fixed count is < 1.
 */
export function computeSheetGeometry(
  strips: GnumarusSheetStrip[],
  layout: GnumarusSheetLayout,
  fixedCount: number,
): GnumarusSheetGeometry {
  const kept = strips.filter((strip) => strip.frames.length > 0);
  if (kept.length === 0) {
    throw new Error("Spritesheet needs at least one frame: select an animation or list frames.");
  }
  switch (layout) {
    case "line": {
      const flat = kept.flatMap((strip) => strip.frames);
      return {
        cols: flat.length,
        rows: 1,
        cells: flat.map((frame, index) => ({ col: index, row: 0, frame })),
      };
    }
    case "column": {
      const flat = kept.flatMap((strip) => strip.frames);
      return {
        cols: 1,
        rows: flat.length,
        cells: flat.map((frame, index) => ({ col: 0, row: index, frame })),
      };
    }
    case "per-line": {
      const cols = Math.max(...kept.map((strip) => strip.frames.length));
      const cells: GnumarusSheetCell[] = [];
      kept.forEach((strip, row) => {
        strip.frames.forEach((frame, col) => {
          cells.push({ col, row, frame });
        });
      });
      return { cols, rows: kept.length, cells };
    }
    case "per-column": {
      const rows = Math.max(...kept.map((strip) => strip.frames.length));
      const cells: GnumarusSheetCell[] = [];
      kept.forEach((strip, col) => {
        strip.frames.forEach((frame, row) => {
          cells.push({ col, row, frame });
        });
      });
      return { cols: kept.length, rows, cells };
    }
    case "packed": {
      const flat = kept.flatMap((strip) => strip.frames);
      // Near-square: columns from the square root, rows as many as needed.
      const cols = Math.max(1, Math.floor(Math.sqrt(flat.length)));
      const rows = Math.ceil(flat.length / cols);
      return {
        cols,
        rows,
        cells: flat.map((frame, index) => ({ col: index % cols, row: Math.floor(index / cols), frame })),
      };
    }
    case "fixed-rows": {
      if (!Number.isFinite(fixedCount) || Math.floor(fixedCount) < 1) {
        throw new Error("Fixed lines needs a line count of at least 1.");
      }
      const rows = Math.floor(fixedCount);
      const flat = kept.flatMap((strip) => strip.frames);
      const cols = Math.ceil(flat.length / rows);
      return {
        cols,
        rows,
        cells: flat.map((frame, index) => ({ col: Math.floor(index / rows), row: index % rows, frame })),
      };
    }
    case "fixed-cols": {
      if (!Number.isFinite(fixedCount) || Math.floor(fixedCount) < 1) {
        throw new Error("Fixed columns needs a column count of at least 1.");
      }
      const cols = Math.floor(fixedCount);
      const flat = kept.flatMap((strip) => strip.frames);
      const rows = Math.ceil(flat.length / cols);
      return {
        cols,
        rows,
        cells: flat.map((frame, index) => ({ col: index % cols, row: Math.floor(index / cols), frame })),
      };
    }
  }
}

/**
 * Blit composited per-frame images into the sheet buffer (transparent
 * background). Every referenced frame must map to an exact
 * `frameWidth * frameHeight * 4` buffer; anything else throws.
 */
export function composeSheet(
  framePixels: ReadonlyMap<number, Uint8ClampedArray>,
  geometry: GnumarusSheetGeometry,
  frameWidth: number,
  frameHeight: number,
): { buffer: Uint8ClampedArray; width: number; height: number } {
  const fw = Math.floor(frameWidth);
  const fh = Math.floor(frameHeight);
  if (!Number.isInteger(fw) || !Number.isInteger(fh) || fw < 1 || fh < 1) {
    throw new Error(`Invalid spritesheet frame size ${frameWidth}x${frameHeight}.`);
  }
  if (geometry.cols < 1 || geometry.rows < 1) {
    throw new Error("Invalid spritesheet geometry: needs at least one row and one column.");
  }
  const width = geometry.cols * fw;
  const height = geometry.rows * fh;
  const sheet = new Uint8ClampedArray(width * height * 4);
  for (const cell of geometry.cells) {
    const pixels = framePixels.get(cell.frame);
    if (pixels === undefined) {
      throw new Error(`Missing pixels for spritesheet frame ${cell.frame + 1}.`);
    }
    if (pixels.length !== fw * fh * 4) {
      throw new Error(`Invalid pixels for spritesheet frame ${cell.frame + 1}: expected ${fw * fh * 4} bytes.`);
    }
    const baseX = cell.col * fw;
    for (let y = 0; y < fh; y += 1) {
      const srcStart = y * fw * 4;
      const dstStart = ((cell.row * fh + y) * width + baseX) * 4;
      sheet.set(pixels.subarray(srcStart, srcStart + fw * 4), dstStart);
    }
  }
  return { buffer: sheet, width, height };
}
