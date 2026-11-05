import type { GnumarusChannelLock } from "../canvas/GnumarusPixelBuffer";
import type { GnumarusLayerTransform } from "../canvas/GnumarusViewportMath";

export interface GnumarusImageDiff {
  x: number;
  y: number;
  w: number;
  h: number;
  before: Uint8ClampedArray;
  after: Uint8ClampedArray;
}

/**
 * Compute the bounding-box diff between two same-size buffers.
 * Returns null when nothing changed. Only the changed region is
 * copied, keeping undo history RAM proportional to stroke size.
 */
export function computeImageDiff(
  before: Uint8ClampedArray,
  after: Uint8ClampedArray,
  width: number,
  height: number,
): GnumarusImageDiff | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      if (
        before[i] !== after[i] ||
        before[i + 1] !== after[i + 1] ||
        before[i + 2] !== after[i + 2] ||
        before[i + 3] !== after[i + 3]
      ) {
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
  if (maxX < 0) {
    return null;
  }
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const beforeRegion = new Uint8ClampedArray(w * h * 4);
  const afterRegion = new Uint8ClampedArray(w * h * 4);
  for (let row = 0; row < h; row += 1) {
    const src = ((minY + row) * width + minX) * 4;
    beforeRegion.set(before.subarray(src, src + w * 4), row * w * 4);
    afterRegion.set(after.subarray(src, src + w * 4), row * w * 4);
  }
  return { x: minX, y: minY, w, h, before: beforeRegion, after: afterRegion };
}

export function applyImageDiff(
  buffer: Uint8ClampedArray,
  width: number,
  diff: GnumarusImageDiff,
  side: "before" | "after",
): void {
  const data = side === "before" ? diff.before : diff.after;
  for (let row = 0; row < diff.h; row += 1) {
    const dst = ((diff.y + row) * width + diff.x) * 4;
    buffer.set(data.subarray(row * diff.w * 4, (row + 1) * diff.w * 4), dst);
  }
}

export interface GnumarusMergedLayerSnapshot {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  width: number;
  height: number;
  transform: GnumarusLayerTransform;
  lockedChannels: GnumarusChannelLock;
  stackIndex: number;
  buffer: Uint8ClampedArray;
}

export interface GnumarusMergeRecord {
  lowerLayerId: string;
  lowerDiff: GnumarusImageDiff | null;
  upper: GnumarusMergedLayerSnapshot;
}

export type GnumarusHistoryEntry =
  | { type: "stroke"; layerId: string; diff: GnumarusImageDiff }
  | { type: "merge"; merge: GnumarusMergeRecord };

export interface GnumarusHistoryLayer {
  buffer: Uint8ClampedArray;
  width: number;
}

export class GnumarusHistory {
  private readonly undoStack: GnumarusHistoryEntry[] = [];
  private readonly redoStack: GnumarusHistoryEntry[] = [];
  private readonly maxEntries: number;

  constructor(maxEntries = 100) {
    this.maxEntries = Math.max(1, Math.floor(maxEntries));
  }

  push(entry: GnumarusHistoryEntry): void {
    this.undoStack.push(entry);
    while (this.undoStack.length > this.maxEntries) {
      this.undoStack.shift();
    }
    this.redoStack.length = 0;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  undo(
    findLayer: (layerId: string) => GnumarusHistoryLayer | null,
    restoreLayer: (snapshot: GnumarusMergedLayerSnapshot) => void,
  ): boolean {
    for (;;) {
      const entry = this.undoStack.pop();
      if (entry === undefined) {
        return false;
      }
      if (entry.type === "stroke") {
        const layer = findLayer(entry.layerId);
        if (layer === null) {
          continue;
        }
        applyImageDiff(layer.buffer, layer.width, entry.diff, "before");
        this.redoStack.push(entry);
        return true;
      }
      const lower = findLayer(entry.merge.lowerLayerId);
      if (lower === null) {
        continue;
      }
      if (entry.merge.lowerDiff !== null) {
        applyImageDiff(lower.buffer, lower.width, entry.merge.lowerDiff, "before");
      }
      restoreLayer(entry.merge.upper);
      this.redoStack.push(entry);
      return true;
    }
  }

  redo(
    findLayer: (layerId: string) => GnumarusHistoryLayer | null,
    removeLayer: (layerId: string) => void,
  ): boolean {
    for (;;) {
      const entry = this.redoStack.pop();
      if (entry === undefined) {
        return false;
      }
      if (entry.type === "stroke") {
        const layer = findLayer(entry.layerId);
        if (layer === null) {
          continue;
        }
        applyImageDiff(layer.buffer, layer.width, entry.diff, "after");
        this.undoStack.push(entry);
        return true;
      }
      const lower = findLayer(entry.merge.lowerLayerId);
      if (lower === null) {
        continue;
      }
      if (entry.merge.lowerDiff !== null) {
        applyImageDiff(lower.buffer, lower.width, entry.merge.lowerDiff, "after");
      }
      removeLayer(entry.merge.upper.id);
      this.undoStack.push(entry);
      return true;
    }
  }

  clear(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
  }
}
