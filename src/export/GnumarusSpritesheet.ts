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

/** Transparent-pixel trim applied before frames are arranged on the sheet. */
export type GnumarusSheetTrim = "none" | "uniform" | "individual";

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

/** Trim option entries for the export dialog dropdown (labels translated in the shell). */
export const GNUMARUS_SHEET_TRIMS: Array<{ value: GnumarusSheetTrim }> = [
  { value: "none" },
  { value: "uniform" },
  { value: "individual" },
];

/**
 * Compute sheet geometry for non-empty strips. Throws when no strip holds
 * a frame, when the layout is unknown, or when the fixed count is < 1.
 * Packed columns come from the frame count's square root: rounded up for
 * wide packs, down for narrow packs. For the fixed layouts the count is
 * exact when `ensureFullSize` is set (short strips leave transparent
 * cells); otherwise the count is a maximum and shrinks to fit the frames.
 */
export function computeSheetGeometry(
  strips: GnumarusSheetStrip[],
  layout: GnumarusSheetLayout,
  fixedCount: number,
  widePack: boolean,
  ensureFullSize = false,
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
      // Wide packs round up (packs wider than tall); narrow packs round
      // down (packs taller than wide — one column for 1..3 frames).
      const root = Math.sqrt(flat.length);
      const cols = Math.max(1, widePack ? Math.ceil(root) : Math.floor(root));
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
      const flat = kept.flatMap((strip) => strip.frames);
      const rows = ensureFullSize ? Math.floor(fixedCount) : Math.min(Math.floor(fixedCount), flat.length);
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
      const flat = kept.flatMap((strip) => strip.frames);
      const cols = ensureFullSize ? Math.floor(fixedCount) : Math.min(Math.floor(fixedCount), flat.length);
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
 */export function composeSheet(
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

/** One exported animation for the sheet JSON: playback order with seconds. */
export interface GnumarusSheetAnimationSource {
  name: string;
  /** Playback order: 0-based project frame plus effective duration in seconds. */
  sequence: Array<{ frame: number; secs: number }>;
}

/** Serializable spritesheet sidecar: texture size, frame rects, animations. */
export interface GnumarusSheetAnimationData {
  texture: { w: number; h: number };
  /**
   * 1-based project frame number to rect in texture pixels. `ox`/`oy`
   * is the crop offset relative to the full frame's top-left corner
   * (0,0 when no trim was applied); `rotated` is true when the crop was
   * turned 90 degrees clockwise into the texture (individual trim with
   * rotation allowed) and the reader must turn it back counter-clockwise.
   * `w`/`h` are the texture (post-rotation) dimensions.
   */
  frames: Record<string, { x: number; y: number; w: number; h: number; ox: number; oy: number; rotated: boolean }>;
  animations: Record<string, { name: string; frames: Array<{ frame: number; secs: number }> }>;
}

/**
 * Build the spritesheet JSON sidecar. Frame rects come from the geometry
 * cells (first occurrence wins when a frame repeats); per-animation frame
 * numbers are 1-based in playback order with per-position durations.
 * `offsets` carries the crop offset per 1-based frame key and defaults
 * to { ox: 0, oy: 0 } everywhere (no trim).
 */
export function buildSheetAnimationData(input: {
  sheetWidth: number;
  sheetHeight: number;
  frameWidth: number;
  frameHeight: number;
  cells: GnumarusSheetCell[];
  animations: GnumarusSheetAnimationSource[];
  offsets?: Readonly<Record<string, { ox: number; oy: number }>>;
}): GnumarusSheetAnimationData {
  const fw = Math.floor(input.frameWidth);
  const fh = Math.floor(input.frameHeight);
  if (!Number.isInteger(fw) || !Number.isInteger(fh) || fw < 1 || fh < 1) {
    throw new Error(`Invalid spritesheet frame size ${input.frameWidth}x${input.frameHeight}.`);
  }
  const frames: GnumarusSheetAnimationData["frames"] = {};
  for (const cell of input.cells) {
    const key = String(cell.frame + 1);
    if (frames[key] === undefined) {
      const offset = input.offsets?.[key];
      frames[key] = {
        x: cell.col * fw,
        y: cell.row * fh,
        w: fw,
        h: fh,
        ox: offset?.ox ?? 0,
        oy: offset?.oy ?? 0,
        rotated: false,
      };
    }
  }
  const animations: GnumarusSheetAnimationData["animations"] = {};
  for (const animation of input.animations) {
    animations[animation.name] = {
      name: animation.name,
      frames: animation.sequence.map((entry) => ({ frame: entry.frame + 1, secs: entry.secs })),
    };
  }
  return {
    texture: { w: input.sheetWidth, h: input.sheetHeight },
    frames,
    animations,
  };
}

/* ------------------------------------------------------------------ */
/* Transparent-pixel trim (uniform / individual).                      */
/* ------------------------------------------------------------------ */

/** Crop window: offset from the full frame's top-left plus its size. */
export interface GnumarusSheetCropBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

function assertSheetPixels(pixels: Uint8ClampedArray, width: number, height: number, what: string): void {
  const w = Math.floor(width);
  const h = Math.floor(height);
  if (!Number.isInteger(w) || !Number.isInteger(h) || w < 1 || h < 1) {
    throw new Error(`Invalid spritesheet frame size ${width}x${height} for ${what}.`);
  }
  if (pixels.length !== w * h * 4) {
    throw new Error(`Invalid pixels for ${what}: expected ${w * h * 4} bytes.`);
  }
}

/**
 * Tightest box holding every pixel with non-zero alpha, or null when the
 * whole frame is fully transparent.
 */
export function frameContentBox(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): GnumarusSheetCropBox | null {
  assertSheetPixels(pixels, width, height, "trim scan");
  const w = Math.floor(width);
  let minX = w;
  let minY = Math.floor(height);
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < Math.floor(height); y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (pixels[(y * w + x) * 4 + 3] !== 0) {
        if (x < minX) {
          minX = x;
        }
        if (x > maxX) {
          maxX = x;
        }
        if (y < minY) {
          minY = y;
        }
        if (y > maxY) {
          maxY = y;
        }
      }
    }
  }
  if (maxX < 0 || maxY < 0) {
    return null;
  }
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/**
 * Smallest box covering every frame's content (the common denominator for
 * uniform trim). Fully transparent frames contribute nothing; when every
 * frame is empty the full frame is kept so the sheet stays valid.
 */
export function uniformCropBox(
  boxes: ReadonlyArray<GnumarusSheetCropBox | null>,
  width: number,
  height: number,
): GnumarusSheetCropBox {
  const w = Math.floor(width);
  const h = Math.floor(height);
  if (!Number.isInteger(w) || !Number.isInteger(h) || w < 1 || h < 1) {
    throw new Error(`Invalid spritesheet frame size ${width}x${height} for uniform trim.`);
  }
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (const box of boxes) {
    if (box === null) {
      continue;
    }
    minX = Math.min(minX, box.x);
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.w - 1);
    maxY = Math.max(maxY, box.y + box.h - 1);
  }
  if (maxX < 0 || maxY < 0) {
    return { x: 0, y: 0, w, h };
  }
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/** Extract the box sub-rectangle from full-frame pixels. */
export function cropPixels(
  pixels: Uint8ClampedArray,
  width: number,
  box: GnumarusSheetCropBox,
): Uint8ClampedArray {
  const w = Math.floor(width);
  if (!Number.isInteger(w) || w < 1 || pixels.length % (w * 4) !== 0) {
    throw new Error(`Invalid spritesheet pixels for trim crop: width ${width}.`);
  }
  const fullH = pixels.length / (w * 4);
  if (
    !Number.isInteger(box.x) ||
    !Number.isInteger(box.y) ||
    !Number.isInteger(box.w) ||
    !Number.isInteger(box.h) ||
    box.x < 0 ||
    box.y < 0 ||
    box.w < 1 ||
    box.h < 1 ||
    box.x + box.w > w ||
    box.y + box.h > fullH
  ) {
    throw new Error(`Invalid spritesheet crop box ${box.x},${box.y} ${box.w}x${box.h}.`);
  }
  const out = new Uint8ClampedArray(box.w * box.h * 4);
  for (let y = 0; y < box.h; y += 1) {
    const srcStart = ((box.y + y) * w + box.x) * 4;
    out.set(pixels.subarray(srcStart, srcStart + box.w * 4), y * box.w * 4);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Individual trim: MaxRects 2D packing (optional 90-degree rotation). */
/* ------------------------------------------------------------------ */

/** One cropped frame to place: unique project frame plus its crop size. */
export interface GnumarusSheetPackRect {
  /** 0-based project frame index. */
  frame: number;
  w: number;
  h: number;
}

/** Placed crop: texture position plus the crop size. */
export interface GnumarusSheetPlacement {
  /** 0-based project frame index. */
  frame: number;
  x: number;
  y: number;
  /** Width in texture pixels (post-rotation). */
  w: number;
  /** Height in texture pixels (post-rotation). */
  h: number;
  /** True when the crop was rotated 90 degrees clockwise to fit. */
  rotated: boolean;
}

/** Packed texture size with one placement per input rect. */
export interface GnumarusSheetPacking {
  width: number;
  height: number;
  placements: GnumarusSheetPlacement[];
}

type GnumarusSheetPackHeuristic = "bssf" | "blsf" | "baf" | "bl" | "cp";

interface GnumarusSheetFreeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function lessScore(left: readonly [number, number], right: readonly [number, number]): boolean {
  return left[0] < right[0] || (left[0] === right[0] && left[1] < right[1]);
}

/**
 * Placement score (lower is better) for a rect inside a free rect, or
 * null when it does not fit. `placed`/`binW`/`binH` only feed the contact
 * heuristic; the others ignore them.
 */
function scoreFreeRect(
  free: GnumarusSheetFreeRect,
  rw: number,
  rh: number,
  heuristic: GnumarusSheetPackHeuristic,
  placed: ReadonlyArray<GnumarusSheetPlacement>,
  binW: number,
  binH: number,
): [number, number] | null {
  if (free.w < rw || free.h < rh) {
    return null;
  }
  const leftoverH = free.w - rw;
  const leftoverV = free.h - rh;
  switch (heuristic) {
    case "bssf":
      return [Math.min(leftoverH, leftoverV), Math.max(leftoverH, leftoverV)];
    case "blsf":
      return [Math.max(leftoverH, leftoverV), Math.min(leftoverH, leftoverV)];
    case "baf":
      return [free.w * free.h - rw * rh, Math.min(leftoverH, leftoverV)];
    case "bl":
      return [free.y, free.x];
    case "cp": {
      const fx = free.x;
      const fy = free.y;
      let contact = 0;
      if (fx === 0) {
        contact += rh;
      }
      if (fy === 0) {
        contact += rw;
      }
      if (fx + rw === binW) {
        contact += rh;
      }
      if (fy + rh === binH) {
        contact += rw;
      }
      for (const other of placed) {
        if (other.x === fx + rw || other.x + other.w === fx) {
          const overlap = Math.min(other.y + other.h, fy + rh) - Math.max(other.y, fy);
          if (overlap > 0) {
            contact += overlap;
          }
        }
        if (other.y === fy + rh || other.y + other.h === fy) {
          const overlap = Math.min(other.x + other.w, fx + rw) - Math.max(other.x, fx);
          if (overlap > 0) {
            contact += overlap;
          }
        }
      }
      return [-contact, free.w * free.h - rw * rh];
    }
  }
}

function rectsIntersect(free: GnumarusSheetFreeRect, x: number, y: number, w: number, h: number): boolean {
  return x < free.x + free.w && x + w > free.x && y < free.y + free.h && y + h > free.y;
}

function freeContains(outer: GnumarusSheetFreeRect, inner: GnumarusSheetFreeRect): boolean {
  return (
    outer.x <= inner.x &&
    outer.y <= inner.y &&
    outer.x + outer.w >= inner.x + inner.w &&
    outer.y + outer.h >= inner.y + inner.h
  );
}

/** Drop every free rect contained in another (first index wins ties). */
function pruneFreeRects(rects: GnumarusSheetFreeRect[]): GnumarusSheetFreeRect[] {
  const kept: GnumarusSheetFreeRect[] = [];
  for (let i = 0; i < rects.length; i += 1) {
    const candidate = rects[i] as GnumarusSheetFreeRect;
    let contained = false;
    for (let j = 0; j < rects.length; j += 1) {
      if (i === j) {
        continue;
      }
      const other = rects[j] as GnumarusSheetFreeRect;
      if (candidate.w === other.w && candidate.h === other.h && candidate.x === other.x && candidate.y === other.y) {
        if (j < i) {
          contained = true;
          break;
        }
        continue;
      }
      if (freeContains(other, candidate)) {
        contained = true;
        break;
      }
    }
    if (!contained) {
      kept.push(candidate);
    }
  }
  return kept;
}

function isBetterPacking(candidate: GnumarusSheetPacking, best: GnumarusSheetPacking): boolean {
  const area = candidate.width * candidate.height;
  const bestArea = best.width * best.height;
  if (area !== bestArea) {
    return area < bestArea;
  }
  const candidateMax = Math.max(candidate.width, candidate.height);
  const bestMax = Math.max(best.width, best.height);
  if (candidateMax !== bestMax) {
    return candidateMax < bestMax;
  }
  const candidateSum = candidate.width + candidate.height;
  const bestSum = best.width + best.height;
  if (candidateSum !== bestSum) {
    return candidateSum < bestSum;
  }
  return candidate.width < best.width;
}

/** Plain shelf fallback (one column of rows): always valid, rarely best. */
function shelfPack(rects: GnumarusSheetPackRect[]): GnumarusSheetPacking {
  let width = 1;
  let y = 0;
  const placements: GnumarusSheetPlacement[] = [];
  for (const rect of rects) {
    width = Math.max(width, rect.w);
    placements.push({ frame: rect.frame, x: 0, y, w: rect.w, h: rect.h, rotated: false });
    y += rect.h;
  }
  return { width, height: Math.max(1, y), placements };
}

/** Rotate frame pixels 90 degrees clockwise (lossless transpose). */
export function rotatePixels90CW(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): { pixels: Uint8ClampedArray; width: number; height: number } {
  const w = Math.floor(width);
  const h = Math.floor(height);
  if (!Number.isInteger(w) || !Number.isInteger(h) || w < 1 || h < 1 || pixels.length !== w * h * 4) {
    throw new Error(`Invalid spritesheet pixels for rotation: ${width}x${height}.`);
  }
  const out = new Uint8ClampedArray(pixels.length);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const srcStart = (y * w + x) * 4;
      const dstStart = (x * h + (h - 1 - y)) * 4;
      out[dstStart] = pixels[srcStart] as number;
      out[dstStart + 1] = pixels[srcStart + 1] as number;
      out[dstStart + 2] = pixels[srcStart + 2] as number;
      out[dstStart + 3] = pixels[srcStart + 3] as number;
    }
  }
  return { pixels: out, width: h, height: w };
}

/**
 * One MaxRects attempt: place `order` into a growing bin. Returns null
 * when the bin hits the trivial (total width x total height) bound without
 * fitting everything (the caller falls back to the shelf layout). With
 * `allowRotation` every non-square rect is scored in both orientations and
 * placed rotated only when that scores strictly better.
 */
function tryPackPlacement(
  order: GnumarusSheetPackRect[],
  heuristic: GnumarusSheetPackHeuristic,
  preferGrowRight: boolean,
  allowRotation: boolean,
  initW: number,
  initH: number,
): GnumarusSheetPacking | null {
  // Seeds already fit every rect in some orientation; undersized bins
  // simply grow on the first failure, so only guard against degeneracy.
  let binW = Math.max(1, initW);
  let binH = Math.max(1, initH);
  let totalW = 0;
  let totalH = 0;
  for (const rect of order) {
    totalW += rect.w;
    totalH += rect.h;
  }
  for (let guard = 0; guard < 10000; guard += 1) {
    let free: GnumarusSheetFreeRect[] = [{ x: 0, y: 0, w: binW, h: binH }];
    const placed: GnumarusSheetPlacement[] = [];
    let failed: GnumarusSheetPackRect | null = null;
    for (const rect of order) {
      let bestScore: [number, number] | null = null;
      let bestFree: GnumarusSheetFreeRect | null = null;
      let bestRotated = false;
      for (const candidate of free) {
        const straight = scoreFreeRect(candidate, rect.w, rect.h, heuristic, placed, binW, binH);
        if (straight !== null && (bestScore === null || lessScore(straight, bestScore))) {
          bestScore = straight;
          bestFree = candidate;
          bestRotated = false;
        }
        // Squares gain nothing from rotation; rotated wins only when
        // strictly better, keeping output stable and unsurprising.
        if (allowRotation && rect.w !== rect.h) {
          const turned = scoreFreeRect(candidate, rect.h, rect.w, heuristic, placed, binW, binH);
          if (turned !== null && bestScore !== null && lessScore(turned, bestScore)) {
            bestScore = turned;
            bestFree = candidate;
            bestRotated = true;
          } else if (turned !== null && bestScore === null) {
            bestScore = turned;
            bestFree = candidate;
            bestRotated = true;
          }
        }
      }
      if (bestFree === null) {
        failed = rect;
        break;
      }
      const atX = bestFree.x;
      const atY = bestFree.y;
      const pw = bestRotated ? rect.h : rect.w;
      const ph = bestRotated ? rect.w : rect.h;
      placed.push({ frame: rect.frame, x: atX, y: atY, w: pw, h: ph, rotated: bestRotated });
      const next: GnumarusSheetFreeRect[] = [];
      for (const candidate of free) {
        if (!rectsIntersect(candidate, atX, atY, pw, ph)) {
          next.push(candidate);
          continue;
        }
        if (atX > candidate.x) {
          next.push({ x: candidate.x, y: candidate.y, w: atX - candidate.x, h: candidate.h });
        }
        if (atX + pw < candidate.x + candidate.w) {
          next.push({
            x: atX + pw,
            y: candidate.y,
            w: candidate.x + candidate.w - atX - pw,
            h: candidate.h,
          });
        }
        if (atY > candidate.y) {
          next.push({ x: candidate.x, y: candidate.y, w: candidate.w, h: atY - candidate.y });
        }
        if (atY + ph < candidate.y + candidate.h) {
          next.push({
            x: candidate.x,
            y: atY + ph,
            w: candidate.w,
            h: candidate.y + candidate.h - atY - ph,
          });
        }
      }
      free = pruneFreeRects(next);
    }
    if (failed === null) {
      return { width: binW, height: binH, placements: placed };
    }
    if (binW >= totalW && binH >= totalH) {
      return null;
    }
    // Grow toward the smaller area; ties alternate direction per attempt
    // so different attempts explore different bin shapes. Rotation adds
    // the turned growth options to the same comparison.
    const options = [
      { w: binW + failed.w, h: binH, right: true },
      { w: binW, h: binH + failed.h, right: false },
    ];
    if (allowRotation && failed.w !== failed.h) {
      options.push({ w: binW + failed.h, h: binH, right: true });
      options.push({ w: binW, h: binH + failed.w, right: false });
    }
    let choice = options[0] as { w: number; h: number; right: boolean };
    for (const option of options) {
      const area = option.w * option.h;
      const bestArea = choice.w * choice.h;
      if (area < bestArea || (area === bestArea && option.right === preferGrowRight && choice.right !== preferGrowRight)) {
        choice = option;
      }
    }
    if (choice.right) {
      binW = Math.min(choice.w, totalW);
    } else {
      binH = Math.min(choice.h, totalH);
    }
  }
  return null;
}

function sortPackRects(rects: GnumarusSheetPackRect[], key: "area" | "perimeter" | "max" | "width" | "height"): GnumarusSheetPackRect[] {
  const scored = rects.map((rect) => {
    switch (key) {
      case "area":
        return { rect, score: rect.w * rect.h };
      case "perimeter":
        return { rect, score: rect.w + rect.h };
      case "max":
        return { rect, score: Math.max(rect.w, rect.h) };
      case "width":
        return { rect, score: rect.w };
      case "height":
        return { rect, score: rect.h };
    }
  });
  scored.sort((left, right) => {
    if (left.score !== right.score) {
      return right.score - left.score;
    }
    return left.rect.frame - right.rect.frame;
  });
  return scored.map((entry) => entry.rect);
}

/**
 * Pack cropped frames into the smallest-area texture with MaxRects (no
 * rotation unless `allowRotation` is set, which also tries every
 * non-square rect turned 90 degrees clockwise). Every combination of
 * size ordering and placement heuristic is tried and the smallest area
 * wins (ties prefer the squarer bin); a shelf fallback guarantees a valid
 * result. `timeBudgetMs` caps the search (default 2s): attempts run in a
 * fixed quality order, so an early stop still returns the best packing
 * found so far.
 */
export function packSheetRects(
  rects: ReadonlyArray<GnumarusSheetPackRect>,
  timeBudgetMs = 2000,
  allowRotation = false,
): GnumarusSheetPacking {
  for (const rect of rects) {
    if (!Number.isInteger(rect.frame) || !Number.isInteger(rect.w) || !Number.isInteger(rect.h) || rect.w < 1 || rect.h < 1) {
      throw new Error(`Invalid spritesheet pack rect for frame ${rect.frame}: ${rect.w}x${rect.h}.`);
    }
  }
  if (rects.length === 0) {
    return { width: 0, height: 0, placements: [] };
  }
  const totalArea = rects.reduce((sum, rect) => sum + rect.w * rect.h, 0);
  let best = shelfPack([...rects]);
  if (best.width * best.height === totalArea) {
    return best;
  }
  // Bin seeds: the minimal square plus fixed-width / fixed-height strips.
  // Seeds only change where the growth starts; oversized seeds (e.g. a
  // 60x60 square for two complementary bars) would otherwise never shrink
  // to the optimum (60x20) even though every placement fits.
  let maxW = 1;
  let maxH = 1;
  let minDim = 1;
  for (const rect of rects) {
    maxW = Math.max(maxW, allowRotation ? Math.max(rect.w, rect.h) : rect.w);
    maxH = Math.max(maxH, allowRotation ? Math.max(rect.w, rect.h) : rect.h);
    minDim = Math.max(minDim, Math.min(rect.w, rect.h));
  }
  // With rotation every rect fits when the bin covers its long side on one
  // axis and its short side on the other, so strip seeds guard height (or
  // width) with the largest short side instead of the largest long side.
  const stripH = allowRotation ? Math.max(minDim, Math.ceil(totalArea / maxW)) : Math.max(maxH, Math.ceil(totalArea / maxW));
  const stripW = allowRotation ? Math.max(minDim, Math.ceil(totalArea / maxH)) : Math.max(maxW, Math.ceil(totalArea / maxH));
  const seeds = [{ w: maxW, h: maxH }, { w: maxW, h: stripH }, { w: stripW, h: maxH }].filter(
    (seed, index, all) => all.findIndex((other) => other.w === seed.w && other.h === seed.h) === index,
  );
  const orders = [
    sortPackRects([...rects], "area"),
    sortPackRects([...rects], "perimeter"),
    sortPackRects([...rects], "max"),
    sortPackRects([...rects], "width"),
    sortPackRects([...rects], "height"),
  ];
  const heuristics: GnumarusSheetPackHeuristic[] = ["bssf", "baf", "blsf", "bl", "cp"];
  const budget = Number.isFinite(timeBudgetMs) && timeBudgetMs > 0 ? timeBudgetMs : 0;
  const deadline = Date.now() + budget;
  let attempts = 0;
  for (const seed of seeds) {
    for (const order of orders) {
      for (const heuristic of heuristics) {
        if (attempts > 0 && Date.now() > deadline) {
          return best;
        }
        const result = tryPackPlacement(order, heuristic, attempts % 2 === 0, allowRotation, seed.w, seed.h);
        attempts += 1;
        if (result !== null && isBetterPacking(result, best)) {
          best = result;
          if (best.width * best.height === totalArea) {
            return best;
          }
        }
      }
    }
  }
  return best;
}

/**
 * Blit cropped per-frame pixels at their packed positions (transparent
 * background). Rotated placements are turned 90 degrees clockwise during
 * the blit. Every placement needs a matching entry: pre-rotation pixels
 * for rotated placements, exact `w * h * 4` buffers otherwise.
 */
export function composePackedSheet(
  frames: ReadonlyMap<number, { pixels: Uint8ClampedArray; w: number; h: number }>,
  packing: GnumarusSheetPacking,
): { buffer: Uint8ClampedArray; width: number; height: number } {
  const width = Math.floor(packing.width);
  const height = Math.floor(packing.height);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new Error(`Invalid packed spritesheet size ${packing.width}x${packing.height}.`);
  }
  const sheet = new Uint8ClampedArray(width * height * 4);
  for (const placement of packing.placements) {
    const entry = frames.get(placement.frame);
    if (entry === undefined) {
      throw new Error(`Missing pixels for packed spritesheet frame ${placement.frame + 1}.`);
    }
    const expectW = placement.rotated ? placement.h : placement.w;
    const expectH = placement.rotated ? placement.w : placement.h;
    if (entry.w !== expectW || entry.h !== expectH || entry.pixels.length !== expectW * expectH * 4) {
      throw new Error(`Invalid pixels for packed spritesheet frame ${placement.frame + 1}.`);
    }
    const source = placement.rotated ? rotatePixels90CW(entry.pixels, entry.w, entry.h).pixels : entry.pixels;
    if (placement.x < 0 || placement.y < 0 || placement.x + placement.w > width || placement.y + placement.h > height) {
      throw new Error(`Packed spritesheet frame ${placement.frame + 1} falls outside the texture.`);
    }
    for (let y = 0; y < placement.h; y += 1) {
      const srcStart = y * placement.w * 4;
      const dstStart = ((placement.y + y) * width + placement.x) * 4;
      sheet.set(source.subarray(srcStart, srcStart + placement.w * 4), dstStart);
    }
  }
  return { buffer: sheet, width, height };
}

/** Packed placement with the crop offset for the JSON sidecar. */
export interface GnumarusSheetPackedPlacement {
  /** 0-based project frame index. */
  frame: number;
  x: number;
  y: number;
  /** Width in texture pixels (post-rotation). */
  w: number;
  /** Height in texture pixels (post-rotation). */
  h: number;
  /** Crop offset relative to the full frame's top-left corner. */
  ox: number;
  oy: number;
  /** True when the crop was rotated 90 degrees clockwise into the texture. */
  rotated: boolean;
}

/**
 * Build the spritesheet JSON sidecar for individually trimmed frames:
 * per-frame rects come from the packing (first occurrence wins), sizes
 * may differ per frame, and every frame carries its crop offset plus
 * whether its crop was rotated 90 degrees clockwise into the texture.
 */
export function buildPackedSheetAnimationData(input: {
  sheetWidth: number;
  sheetHeight: number;
  placements: GnumarusSheetPackedPlacement[];
  animations: GnumarusSheetAnimationSource[];
}): GnumarusSheetAnimationData {
  const width = Math.floor(input.sheetWidth);
  const height = Math.floor(input.sheetHeight);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new Error(`Invalid packed spritesheet size ${input.sheetWidth}x${input.sheetHeight}.`);
  }
  const frames: GnumarusSheetAnimationData["frames"] = {};
  for (const placement of input.placements) {
    const key = String(placement.frame + 1);
    if (frames[key] === undefined) {
      frames[key] = {
        x: placement.x,
        y: placement.y,
        w: placement.w,
        h: placement.h,
        ox: placement.ox,
        oy: placement.oy,
        rotated: placement.rotated,
      };
    }
  }
  const animations: GnumarusSheetAnimationData["animations"] = {};
  for (const animation of input.animations) {
    animations[animation.name] = {
      name: animation.name,
      frames: animation.sequence.map((entry) => ({ frame: entry.frame + 1, secs: entry.secs })),
    };
  }
  return {
    texture: { w: width, h: height },
    frames,
    animations,
  };
}
