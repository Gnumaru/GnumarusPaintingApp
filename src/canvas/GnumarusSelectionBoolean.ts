/**
 * Pure rectangle + mask helpers for rectangular-selection boolean ops.
 * Rectangles use exclusive-max bounds (`minX <= x < maxX`), matching the
 * cut semantics; masks are row-major bytes (`0` = out, `255` = in).
 */

/** Exclusive-max integer rectangle. */
export interface GnumarusSelectionRect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Normalize two corners to an exclusive-max rect (unclamped). */
export function normalizeSelectionRect(x0: number, y0: number, x1: number, y1: number): GnumarusSelectionRect {
  return {
    minX: Math.min(x0, x1),
    minY: Math.min(y0, y1),
    maxX: Math.max(x0, x1) + 1,
    maxY: Math.max(y0, y1) + 1,
  };
}

/** True when the rect covers no pixels. */
export function isEmptySelectionRect(rect: GnumarusSelectionRect): boolean {
  return rect.minX >= rect.maxX || rect.minY >= rect.maxY;
}

/** Clamp a rect into `[0, width) x [0, height)`; null when nothing remains. */
export function clampSelectionRect(
  rect: GnumarusSelectionRect,
  width: number,
  height: number,
): GnumarusSelectionRect | null {
  const clamped = {
    minX: Math.max(0, rect.minX),
    minY: Math.max(0, rect.minY),
    maxX: Math.min(width, rect.maxX),
    maxY: Math.min(height, rect.maxY),
  };
  return isEmptySelectionRect(clamped) ? null : clamped;
}

/** Overlap of two rects; null when disjoint. */
export function intersectSelectionRects(
  a: GnumarusSelectionRect,
  b: GnumarusSelectionRect,
): GnumarusSelectionRect | null {
  const overlap = {
    minX: Math.max(a.minX, b.minX),
    minY: Math.max(a.minY, b.minY),
    maxX: Math.min(a.maxX, b.maxX),
    maxY: Math.min(a.maxY, b.maxY),
  };
  return isEmptySelectionRect(overlap) ? null : overlap;
}

/** Smallest rect containing both inputs. */
export function unionSelectionBox(a: GnumarusSelectionRect, b: GnumarusSelectionRect): GnumarusSelectionRect {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  };
}

/** Count set mask bytes. */
/** Box-blur a selection mask (0..255) treating everything outside as transparent (full-kernel normalization, so edges fade to zero). */
export function blurSelectionMask(mask: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  const out = new Uint8Array(mask);
  const r = Math.max(0, Math.floor(radius));
  if (r === 0 || width < 1 || height < 1 || mask.length !== width * height) {
    return out;
  }
  const kernel = (2 * r + 1) * (2 * r + 1);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      for (let oy = -r; oy <= r; oy += 1) {
        for (let ox = -r; ox <= r; ox += 1) {
          const sx = x + ox;
          const sy = y + oy;
          if (sx < 0 || sy < 0 || sx >= width || sy >= height) {
            continue;
          }
          sum += mask[sy * width + sx] as number;
        }
      }
      out[y * width + x] = Math.round(sum / kernel);
    }
  }
  return out;
}

/** Dilate set mask pixels outward by the given pixel count (square structuring). */
/**
 * Feather a mask: pad it symmetrically by `radius`, then box-blur treating
 * everything outside as transparent (full-kernel normalization, so the
 * falloff reaches ~0 at the padded border). Returns the padded mask plus
 * its new dimensions; centers are preserved by the symmetric padding.
 */
export function featherSelectionMask(
  mask: Uint8Array,
  width: number,
  height: number,
  radius: number,
): { mask: Uint8Array; width: number; height: number } {
  const r = Math.max(0, Math.floor(radius));
  if (r < 1 || width < 1 || height < 1 || mask.length !== width * height) {
    return { mask: Uint8Array.from(mask), width, height };
  }
  const paddedWidth = width + r * 2;
  const paddedHeight = height + r * 2;
  const padded = new Uint8Array(paddedWidth * paddedHeight);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      padded[(y + r) * paddedWidth + (x + r)] = mask[y * width + x] as number;
    }
  }
  const out = new Uint8Array(paddedWidth * paddedHeight);
  const kernel = (2 * r + 1) * (2 * r + 1);
  for (let y = 0; y < paddedHeight; y += 1) {
    for (let x = 0; x < paddedWidth; x += 1) {
      let sum = 0;
      for (let oy = -r; oy <= r; oy += 1) {
        for (let ox = -r; ox <= r; ox += 1) {
          const sx = x + ox;
          const sy = y + oy;
          if (sx < 0 || sy < 0 || sx >= paddedWidth || sy >= paddedHeight) {
            continue;
          }
          sum += padded[sy * paddedWidth + sx] as number;
        }
      }
      out[y * paddedWidth + x] = Math.round(sum / kernel);
    }
  }
  return { mask: out, width: paddedWidth, height: paddedHeight };
}

export function dilateSelectionMask(mask: Uint8Array, width: number, height: number, steps: number): Uint8Array {
  let current = Uint8Array.from(mask);
  const n = Math.max(0, Math.floor(steps));
  for (let step = 0; step < n; step += 1) {
    const next = Uint8Array.from(current);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if ((current[y * width + x] as number) !== 0) {
          continue;
        }
        let hit = false;
        for (let oy = -1; oy <= 1 && !hit; oy += 1) {
          for (let ox = -1; ox <= 1; ox += 1) {
            const sx = x + ox;
            const sy = y + oy;
            if (sx < 0 || sy < 0 || sx >= width || sy >= height) {
              continue;
            }
            if ((current[sy * width + sx] as number) !== 0) {
              hit = true;
              break;
            }
          }
        }
        if (hit) {
          next[y * width + x] = 255;
        }
      }
    }
    current = next;
  }
  return current;
}

/** Erode set mask pixels inward by the given pixel count (square structuring). */
export function erodeSelectionMask(mask: Uint8Array, width: number, height: number, steps: number): Uint8Array {
  let current = Uint8Array.from(mask);
  const n = Math.max(0, Math.floor(steps));
  for (let step = 0; step < n; step += 1) {
    const next = Uint8Array.from(current);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if ((current[y * width + x] as number) === 0) {
          continue;
        }
        let clear = false;
        for (let oy = -1; oy <= 1 && !clear; oy += 1) {
          for (let ox = -1; ox <= 1; ox += 1) {
            const sx = x + ox;
            const sy = y + oy;
            if (sx < 0 || sy < 0 || sx >= width || sy >= height) {
              // Outside the box is empty, so border pixels erode.
              clear = true;
              break;
            }
            if ((current[sy * width + sx] as number) === 0) {
              clear = true;
              break;
            }
          }
        }
        if (clear) {
          next[y * width + x] = 0;
        }
      }
    }
    current = next;
  }
  return current;
}

export function countSelectionMask(mask: Uint8Array): number {  let count = 0;
  for (let i = 0; i < mask.length; i += 1) {
    if ((mask[i] ?? 0) !== 0) {
      count += 1;
    }
  }
  return count;
}

/**
 * Mask of an inscribed ellipse over an exclusive-max box: pixel centers
 * with ((x+.5-cx)/rx)^2 + ((y+.5-cy)/ry)^2 <= 1. Always non-empty for a
 * non-empty box (a 1px box yields its single pixel).
 */
export function ellipseSelectMask(box: GnumarusSelectionRect): Uint8Array {
  const width = Math.max(0, box.maxX - box.minX);
  const height = Math.max(0, box.maxY - box.minY);
  const mask = new Uint8Array(width * height);
  if (width < 1 || height < 1) {
    return mask;
  }
  const cx = (box.minX + box.maxX) / 2;
  const cy = (box.minY + box.maxY) / 2;
  const rx = width / 2;
  const ry = height / 2;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const dx = (box.minX + x + 0.5 - cx) / rx;
      const dy = (box.minY + y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) {
        mask[y * width + x] = 255;
      }
    }
  }
  return mask;
}

/**
 * Even-odd scanline fill of a freehand polygon in layer pixels. Returns the
 * tight bbox mask or null for fewer than 3 distinct points or an empty fill.
 */
export function polygonSelectMask(
  points: ReadonlyArray<{ x: number; y: number }>,
  textureWidth: number,
  textureHeight: number,
): { mask: Uint8Array; minX: number; minY: number; width: number; height: number } | null {
  const distinct = points.filter(
    (point, index) =>
      index === 0 || point.x !== points[index - 1]?.x || point.y !== points[index - 1]?.y,
  );
  if (distinct.length < 3 || textureWidth < 1 || textureHeight < 1) {
    return null;
  }
  let loX = Number.POSITIVE_INFINITY;
  let loY = Number.POSITIVE_INFINITY;
  let hiX = Number.NEGATIVE_INFINITY;
  let hiY = Number.NEGATIVE_INFINITY;
  for (const point of distinct) {
    loX = Math.min(loX, point.x);
    loY = Math.min(loY, point.y);
    hiX = Math.max(hiX, point.x);
    hiY = Math.max(hiY, point.y);
  }
  const minX = Math.max(0, Math.floor(loX));
  const minY = Math.max(0, Math.floor(loY));
  const maxX = Math.min(textureWidth, Math.ceil(hiX));
  const maxY = Math.min(textureHeight, Math.ceil(hiY));
  const width = maxX - minX;
  const height = maxY - minY;
  if (width < 1 || height < 1) {
    return null;
  }
  const mask = new Uint8Array(width * height);
  const closed = [...distinct, distinct[0] as { x: number; y: number }];
  for (let y = 0; y < height; y += 1) {
    const cy = minY + y + 0.5;
    const crossings: number[] = [];
    for (let i = 0; i + 1 < closed.length; i += 1) {
      const a = closed[i] as { x: number; y: number };
      const b = closed[i + 1] as { x: number; y: number };
      if ((a.y <= cy && b.y > cy) || (b.y <= cy && a.y > cy)) {
        crossings.push(a.x + ((cy - a.y) / (b.y - a.y)) * (b.x - a.x));
      }
    }
    crossings.sort((first, second) => first - second);
    for (let i = 0; i + 1 < crossings.length; i += 2) {
      const from = Math.max(0, Math.ceil((crossings[i] as number) - 0.5 - minX));
      const to = Math.min(width, Math.ceil((crossings[i + 1] as number) - 0.5 - minX));
      for (let x = from; x < to; x += 1) {
        mask[y * width + x] = 255;
      }
    }
  }
  if (countSelectionMask(mask) === 0) {
    return null;
  }
  return { mask, minX, minY, width, height };
}

/** Euclidean distance in RGBA space (0..510). */
export function colorDistanceRGBA(
  r1: number,
  g1: number,
  b1: number,
  a1: number,
  r2: number,
  g2: number,
  b2: number,
  a2: number,
): number {
  return Math.sqrt(
    (r1 - r2) * (r1 - r2) + (g1 - g2) * (g1 - g2) + (b1 - b2) * (b1 - b2) + (a1 - a2) * (a1 - a2),
  );
}

/** Tolerance for a 0..100 similarity threshold (0 = exact match). */
export function colorSelectTolerance(threshold: number): number {  const clamped = Math.min(100, Math.max(0, threshold));
  return (clamped / 100) * 510;
}

/**
 * Flood-selected mask of pixels similar to the seed pixel (4-way,
 * tolerance-based, explicit stack like the paint flood fill).
 */
export function floodSelectMask(
  buffer: Uint8ClampedArray,
  width: number,
  height: number,
  startX: number,
  startY: number,
  tolerance: number,
): Uint8Array {
  const mask = new Uint8Array(width * height);
  if (!Number.isInteger(startX) || !Number.isInteger(startY)) {
    return mask;
  }
  if (startX < 0 || startY < 0 || startX >= width || startY >= height || width < 1 || height < 1) {
    return mask;
  }
  if (buffer.length !== width * height * 4) {
    return mask;
  }
  const seed = (startY * width + startX) * 4;
  const sr = buffer[seed] ?? 0;
  const sg = buffer[seed + 1] ?? 0;
  const sb = buffer[seed + 2] ?? 0;
  const sa = buffer[seed + 3] ?? 0;
  const similar = (index: number): boolean => {
    const at = index * 4;
    return (
      colorDistanceRGBA(
        buffer[at] ?? 0,
        buffer[at + 1] ?? 0,
        buffer[at + 2] ?? 0,
        buffer[at + 3] ?? 0,
        sr,
        sg,
        sb,
        sa,
      ) <= tolerance
    );
  };
  const visited = new Uint8Array(width * height);
  const stack: number[] = [startY * width + startX];
  visited[startY * width + startX] = 1;
  while (stack.length > 0) {
    const index = stack.pop();
    if (index === undefined) {
      break;
    }
    if (!similar(index)) {
      continue;
    }
    mask[index] = 255;
    const x = index % width;
    const y = Math.floor(index / width);
    if (x > 0 && visited[index - 1] === 0) {
      visited[index - 1] = 1;
      stack.push(index - 1);
    }
    if (x + 1 < width && visited[index + 1] === 0) {
      visited[index + 1] = 1;
      stack.push(index + 1);
    }
    if (y > 0 && visited[index - width] === 0) {
      visited[index - width] = 1;
      stack.push(index - width);
    }
    if (y + 1 < height && visited[index + width] === 0) {
      visited[index + width] = 1;
      stack.push(index + width);
    }
  }
  return mask;
}

/** Mask of every pixel in the texture similar to the seed pixel. */
export function globalSelectMask(
  buffer: Uint8ClampedArray,
  width: number,
  height: number,
  startX: number,
  startY: number,
  tolerance: number,
): Uint8Array {
  const mask = new Uint8Array(width * height);
  if (!Number.isInteger(startX) || !Number.isInteger(startY)) {
    return mask;
  }
  if (startX < 0 || startY < 0 || startX >= width || startY >= height || width < 1 || height < 1) {
    return mask;
  }
  if (buffer.length !== width * height * 4) {
    return mask;
  }
  const seed = (startY * width + startX) * 4;
  const sr = buffer[seed] ?? 0;
  const sg = buffer[seed + 1] ?? 0;
  const sb = buffer[seed + 2] ?? 0;
  const sa = buffer[seed + 3] ?? 0;
  for (let i = 0; i < width * height; i += 1) {
    const at = i * 4;
    if (
      colorDistanceRGBA(
        buffer[at] ?? 0,
        buffer[at + 1] ?? 0,
        buffer[at + 2] ?? 0,
        buffer[at + 3] ?? 0,
        sr,
        sg,
        sb,
        sa,
      ) <= tolerance
    ) {
      mask[i] = 255;
    }
  }
  return mask;
}

/**
 * Tight exclusive-max box around the set mask bits, in mask-local coords;
 * null when no bit is set.
 */
export function selectionMaskBox(mask: Uint8Array, width: number, height: number): GnumarusSelectionRect | null {
  if (mask.length !== width * height) {
    return null;
  }
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if ((mask[y * width + x] ?? 0) === 0) {
        continue;
      }
      if (x < minX) {
        minX = x;
      }
      if (y < minY) {
        minY = y;
      }
      if (x + 1 > maxX) {
        maxX = x + 1;
      }
      if (y + 1 > maxY) {
        maxY = y + 1;
      }
    }
  }
  const box = { minX, minY, maxX, maxY };
  return isEmptySelectionRect(box) ? null : box;
}

/** One axis-aligned boundary run in buffer-local pixel coords. */
export interface GnumarusSelectionBoundaryRun {
  ax: number;
  ay: number;
  bx: number;
  by: number;
}

/**
 * Boundary runs of a selection mask in buffer-local pixel coords: for every
 * set pixel, the sides facing unset pixels (or the mask edge), merged into
 * maximal horizontal/vertical runs. Donut holes produce their own runs;
 * disjoint regions stay disjoint.
 */
export function selectionMaskBoundaryRuns(
  mask: Uint8Array,
  width: number,
  height: number,
): GnumarusSelectionBoundaryRun[] {
  const runs: GnumarusSelectionBoundaryRun[] = [];
  if (mask.length !== width * height || width < 1 || height < 1) {
    return runs;
  }
  const set = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x >= width || y >= height) {
      return false;
    }
    return (mask[y * width + x] ?? 0) !== 0;
  };
  // Horizontal edges: one run per grid line segment run.
  for (let y = 0; y <= height; y += 1) {
    let runX0 = -1;
    const flush = (x: number): void => {
      if (runX0 >= 0) {
        runs.push({ ax: runX0, ay: y, bx: x, by: y });
        runX0 = -1;
      }
    };
    for (let x = 0; x <= width; x += 1) {
      // Edge between row y-1 and row y at column x.
      if (set(x, y - 1) !== set(x, y)) {
        if (runX0 < 0) {
          runX0 = x;
        }
      } else {
        flush(x);
      }
    }
    flush(width + 1);
  }
  // Vertical edges.
  for (let x = 0; x <= width; x += 1) {
    let runY0 = -1;
    const flush = (y: number): void => {
      if (runY0 >= 0) {
        runs.push({ ax: x, ay: runY0, bx: x, by: y });
        runY0 = -1;
      }
    };
    for (let y = 0; y <= height; y += 1) {
      // Edge between column x-1 and column x at row y.
      if (set(x - 1, y) !== set(x, y)) {
        if (runY0 < 0) {
          runY0 = y;
        }
      } else {
        flush(y);
      }
    }
    flush(height + 1);
  }
  return runs;
}

/**
 * Boundary runs formatted as an SVG path (`M..L..` subpaths, buffer-local
 * pixel coords).
 */
export function selectionMaskBoundaryPath(mask: Uint8Array, width: number, height: number): string {
  return selectionMaskBoundaryRuns(mask, width, height)
    .map((run) => `M${run.ax},${run.ay}L${run.bx},${run.by}`)
    .join(" ");
}

/** Clamp a color similarity threshold to an integer 0..100. */
export function clampColorThreshold(value: number): number {
  if (!Number.isFinite(value)) {
    return 10;
  }
  return Math.min(100, Math.max(0, Math.floor(value)));
}
