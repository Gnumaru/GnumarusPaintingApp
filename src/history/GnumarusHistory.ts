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
  textureName: string;
  visible: boolean;
  opacity: number;
  width: number;
  height: number;
  transform: GnumarusLayerTransform;
  lockedChannels: GnumarusChannelLock;
  stackIndex: number;
  buffer: Uint8ClampedArray;
  /** Cells of the removed layer, so undo can re-associate its contents. */
  cells: Array<{ frame: number; content: string }>;
  /** Contents that referenced the removed texture and were detached by the merge. */
  detachedContents: string[];
}

export interface GnumarusMergeRecord {
  lowerLayerId: string;
  lowerDiff: GnumarusImageDiff | null;
  upper: GnumarusMergedLayerSnapshot;
  /** False when the merged layer was kept and only one cell was dissociated. */
  removedLayer: boolean;
  /** Present when removedLayer is false: the cell dissociated by the merge. */
  dissociatedCell: { layer: string; frame: number; content: string } | null;
  /** Lower cell associated by the merge (relink when the lower cell had no texture). */
  associatedCell: { layer: string; frame: number; content: string } | null;
  /** Lower content texture swap (relink when the lower content had no texture). */
  textureLink: { contentId: string; before: string | null; after: string | null } | null;
}

export interface GnumarusResizeRecord {
  layerId: string;
  beforeWidth: number;
  beforeHeight: number;
  beforeBuffer: Uint8ClampedArray;
  afterWidth: number;
  afterHeight: number;
  afterBuffer: Uint8ClampedArray;
}

export interface GnumarusFitTransformRecord {
  contentId: string;
  before: GnumarusLayerTransform;
  after: GnumarusLayerTransform;
}

export interface GnumarusFitRecord {
  textureId: string;
  beforeWidth: number;
  beforeHeight: number;
  beforeBuffer: Uint8ClampedArray;
  afterWidth: number;
  afterHeight: number;
  afterBuffer: Uint8ClampedArray;
  transforms: GnumarusFitTransformRecord[];
}

export type GnumarusHistoryEntry =
  | { type: "stroke"; layerId: string; diff: GnumarusImageDiff }
  | { type: "merge"; merge: GnumarusMergeRecord }
  | { type: "resize"; resize: GnumarusResizeRecord }
  | { type: "fit"; fit: GnumarusFitRecord };

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
    applyResize?: (layerId: string, width: number, height: number, buffer: Uint8ClampedArray) => boolean,
    applyFit?: (
      textureId: string,
      width: number,
      height: number,
      buffer: Uint8ClampedArray,
      transforms: Array<{ contentId: string; transform: GnumarusLayerTransform }>,
    ) => boolean,
    associateCell?: (layerId: string, frame: number, contentId: string) => boolean,
    dissociateCell?: (layerId: string, frame: number) => boolean,
    setContentTexture?: (contentId: string, textureId: string | null) => boolean,
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
      if (entry.type === "resize") {
        if (applyResize === undefined) {
          continue;
        }
        const ok = applyResize(
          entry.resize.layerId,
          entry.resize.beforeWidth,
          entry.resize.beforeHeight,
          entry.resize.beforeBuffer,
        );
        if (!ok) {
          continue;
        }
        this.redoStack.push(entry);
        return true;
      }
      if (entry.type === "fit") {
        if (applyFit === undefined) {
          continue;
        }
        const ok = applyFit(
          entry.fit.textureId,
          entry.fit.beforeWidth,
          entry.fit.beforeHeight,
          entry.fit.beforeBuffer,
          entry.fit.transforms.map((record) => ({ contentId: record.contentId, transform: { ...record.before } })),
        );
        if (!ok) {
          continue;
        }
        this.redoStack.push(entry);
        return true;
      }
      const needsAssociate = !entry.merge.removedLayer;
      if (needsAssociate && associateCell === undefined) {
        continue;
      }
      const needsDissociateUndo = entry.merge.associatedCell !== null;
      if (needsDissociateUndo && dissociateCell === undefined) {
        continue;
      }
      const needsTextureUndo = entry.merge.textureLink !== null;
      if (needsTextureUndo && setContentTexture === undefined) {
        continue;
      }
      const lower = findLayer(entry.merge.lowerLayerId);
      if (lower === null) {
        continue;
      }
      if (entry.merge.lowerDiff !== null) {
        applyImageDiff(lower.buffer, lower.width, entry.merge.lowerDiff, "before");
      }
      if (entry.merge.removedLayer) {
        restoreLayer(entry.merge.upper);
      } else {
        const cell = entry.merge.dissociatedCell;
        if (cell === null || associateCell === undefined || !associateCell(cell.layer, cell.frame, cell.content)) {
          continue;
        }
      }
      const undone = entry.merge.associatedCell;
      if (undone !== null) {
        if (dissociateCell === undefined || !dissociateCell(undone.layer, undone.frame)) {
          continue;
        }
      }
      const unlinked = entry.merge.textureLink;
      if (unlinked !== null) {
        if (setContentTexture === undefined || !setContentTexture(unlinked.contentId, unlinked.before)) {
          continue;
        }
      }
      this.redoStack.push(entry);
      return true;
    }
  }

  redo(
    findLayer: (layerId: string) => GnumarusHistoryLayer | null,
    removeLayer: (layerId: string) => void,
    applyResize?: (layerId: string, width: number, height: number, buffer: Uint8ClampedArray) => boolean,
    applyFit?: (
      textureId: string,
      width: number,
      height: number,
      buffer: Uint8ClampedArray,
      transforms: Array<{ contentId: string; transform: GnumarusLayerTransform }>,
    ) => boolean,
    dissociateCell?: (layerId: string, frame: number) => boolean,
    associateCell?: (layerId: string, frame: number, contentId: string) => boolean,
    setContentTexture?: (contentId: string, textureId: string | null) => boolean,
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
      if (entry.type === "resize") {
        if (applyResize === undefined) {
          continue;
        }
        const ok = applyResize(
          entry.resize.layerId,
          entry.resize.afterWidth,
          entry.resize.afterHeight,
          entry.resize.afterBuffer,
        );
        if (!ok) {
          continue;
        }
        this.undoStack.push(entry);
        return true;
      }
      if (entry.type === "fit") {
        if (applyFit === undefined) {
          continue;
        }
        const ok = applyFit(
          entry.fit.textureId,
          entry.fit.afterWidth,
          entry.fit.afterHeight,
          entry.fit.afterBuffer,
          entry.fit.transforms.map((record) => ({ contentId: record.contentId, transform: { ...record.after } })),
        );
        if (!ok) {
          continue;
        }
        this.undoStack.push(entry);
        return true;
      }
      const needsDissociateRedo = !entry.merge.removedLayer;
      if (needsDissociateRedo && dissociateCell === undefined) {
        continue;
      }
      const needsAssociateRedo = entry.merge.associatedCell !== null;
      if (needsAssociateRedo && associateCell === undefined) {
        continue;
      }
      const needsTextureRedo = entry.merge.textureLink !== null;
      if (needsTextureRedo && setContentTexture === undefined) {
        continue;
      }
      const lower = findLayer(entry.merge.lowerLayerId);
      if (lower === null) {
        continue;
      }
      if (entry.merge.lowerDiff !== null) {
        applyImageDiff(lower.buffer, lower.width, entry.merge.lowerDiff, "after");
      }
      if (entry.merge.removedLayer) {
        removeLayer(entry.merge.upper.id);
      } else {
        const cell = entry.merge.dissociatedCell;
        if (cell === null || dissociateCell === undefined || !dissociateCell(cell.layer, cell.frame)) {
          continue;
        }
      }
      const redone = entry.merge.associatedCell;
      if (redone !== null) {
        if (associateCell === undefined || !associateCell(redone.layer, redone.frame, redone.content)) {
          continue;
        }
      }
      const relinked = entry.merge.textureLink;
      if (relinked !== null) {
        if (setContentTexture === undefined || !setContentTexture(relinked.contentId, relinked.after)) {
          continue;
        }
      }
      this.undoStack.push(entry);
      return true;
    }
  }

  clear(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
  }
}
