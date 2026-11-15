/**
 * Pure layer-tree helpers for nested layers (`parentId`) and layer masks.
 *
 * Storage invariant (bottom -> top, index 0 is the bottom render layer):
 * every parent sits immediately above its whole subtree, so a node's block
 * is `[descendants..., node]` and sibling blocks are adjacent. Display order
 * (top -> bottom) is the reverse, i.e. parent, then children, then the next
 * root. Render order follows the storage array directly.
 *
 * Mask layers (`isMask`) never render on their own: a mask modulates the
 * alpha of its direct parent (white shows, black hides, transparent texels
 * and out-of-bounds samples are identity). Several masks on one parent
 * multiply.
 */

import {
  layerLinearMatrix,
  projectToLayerPixel,
  type GnumarusLayerTransform,
} from "./GnumarusViewportMath";

export type GnumarusLayerParentMap = Map<string, string | null>;

/** Own flag plus every ancestor must be visible (cycle-safe; missing ancestors don't hide). */
export function isEffectivelyVisible(
  id: string,
  parents: ReadonlyMap<string, string | null>,
  isVisible: (layerId: string) => boolean,
): boolean {
  if (!isVisible(id)) {
    return false;
  }
  const seen = new Set<string>([id]);
  let current = parents.get(id) ?? null;
  while (current !== null) {
    if (seen.has(current)) {
      return true;
    }
    seen.add(current);
    if (!isVisible(current)) {
      // Unknown ids (never created) don't hide; only known-hidden hides.
      // Callers pass `true` for unknown ids to get exactly this behavior.
      return false;
    }
    current = parents.get(current) ?? null;
  }
  return true;
}

/** True when any strict ancestor is in the collapsed set (cycle-safe). */
export function isHiddenByCollapse(
  id: string,
  parents: ReadonlyMap<string, string | null>,
  collapsed: ReadonlySet<string>,
): boolean {
  if (collapsed.size === 0) {
    return false;
  }
  const seen = new Set<string>([id]);
  let current = parents.get(id) ?? null;
  while (current !== null) {
    if (collapsed.has(current)) {
      return true;
    }
    if (seen.has(current)) {
      return false;
    }
    seen.add(current);
    current = parents.get(current) ?? null;
  }
  return false;
}

/** Sanitize raw parent links: unknown ids, self-links and cycles become roots. */
export function sanitizeLayerParents(
  ids: readonly string[],
  raw: ReadonlyMap<string, unknown>,
): GnumarusLayerParentMap {
  const known = new Set(ids);
  const parents: GnumarusLayerParentMap = new Map();
  for (const id of ids) {
    const value = raw.get(id);
    if (typeof value === "string" && value !== id && known.has(value)) {
      parents.set(id, value);
    } else {
      parents.set(id, null);
    }
  }
  // Break cycles by nulling the closing edge until the graph is a forest.
  for (let guard = 0; guard <= ids.length; guard += 1) {
    let broken = false;
    for (const start of ids) {
      const path: string[] = [];
      const inPath = new Set<string>();
      let current: string | null | undefined = start;
      while (typeof current === "string") {
        if (inPath.has(current)) {
          // `current` repeats: the edge from the last path node closes a cycle.
          const last = path[path.length - 1];
          if (last !== undefined) {
            parents.set(last, null);
            broken = true;
          }
          break;
        }
        inPath.add(current);
        path.push(current);
        const next = parents.get(current);
        if (next === undefined || next === null) {
          break;
        }
        current = next;
      }
      if (broken) {
        break;
      }
    }
    if (!broken) {
      return parents;
    }
  }
  // Unreachable in practice (guard exceeds node count): fall back to roots.
  for (const id of ids) {
    parents.set(id, null);
  }
  return parents;
}

/** Depth of a layer (roots are 0); unknown ids are roots. */
export function layerDepth(id: string, parents: ReadonlyMap<string, string | null>): number {
  let depth = 0;
  let current = parents.get(id) ?? null;
  const seen = new Set<string>([id]);
  while (current !== null && current !== undefined) {
    if (seen.has(current)) {
      return depth;
    }
    seen.add(current);
    depth += 1;
    current = parents.get(current) ?? null;
  }
  return depth;
}

/** True when `ancestor` is a strict parent (transitively) of `descendant`. */
export function isLayerAncestor(
  ancestor: string,
  descendant: string,
  parents: ReadonlyMap<string, string | null>,
): boolean {
  if (ancestor === descendant) {
    return false;
  }
  let current = parents.get(descendant) ?? null;
  const seen = new Set<string>([descendant]);
  while (current !== null && current !== undefined) {
    if (current === ancestor) {
      return true;
    }
    if (seen.has(current)) {
      return false;
    }
    seen.add(current);
    current = parents.get(current) ?? null;
  }
  return false;
}

/** Children of `parent` (`null` = roots) in storage order (bottom -> top). */
export function layerChildren(
  order: readonly string[],
  parents: ReadonlyMap<string, string | null>,
  parent: string | null,
): string[] {
  const out: string[] = [];
  for (const id of order) {
    if ((parents.get(id) ?? null) === parent) {
      out.push(id);
    }
  }
  return out;
}

/** Siblings of `id` (including `id`) in storage order (bottom -> top). */
export function layerSiblings(
  order: readonly string[],
  parents: ReadonlyMap<string, string | null>,
  id: string,
): string[] | null {
  if (!order.includes(id)) {
    return null;
  }
  return layerChildren(order, parents, parents.get(id) ?? null);
}

/** Recursive subtree size (node + all descendants). Guards against cycles. */
export function layerSubtreeSize(
  id: string,
  order: readonly string[],
  parents: ReadonlyMap<string, string | null>,
  seen: Set<string> = new Set(),
): number {
  if (seen.has(id)) {
    return 1;
  }
  seen.add(id);
  let size = 1;
  for (const child of layerChildren(order, parents, id)) {
    size += layerSubtreeSize(child, order, parents, seen);
  }
  seen.delete(id);
  return size;
}

/**
 * Contiguous block `[start, end]` (inclusive storage indices) covering `id`
 * plus its descendants. Returns null for unknown ids. When the invariant is
 * broken (foreign order), falls back to the single entry.
 */
export function layerBlockRange(
  order: readonly string[],
  parents: ReadonlyMap<string, string | null>,
  id: string,
): { start: number; end: number } | null {
  const end = order.indexOf(id);
  if (end < 0) {
    return null;
  }
  const size = layerSubtreeSize(id, order, parents);
  const start = end - (size - 1);
  if (start < 0 || start > end) {
    return { start: end, end };
  }
  // Verify contiguity: everything below the node in the range must descend from it.
  for (let i = start; i < end; i += 1) {
    const member = order[i];
    if (member === undefined || !isLayerAncestor(id, member, parents)) {
      return { start: end, end };
    }
  }
  return { start, end };
}

/** Segment covering all sibling blocks (inclusive) or null when id is unknown. */
export function siblingSegment(
  order: readonly string[],
  parents: ReadonlyMap<string, string | null>,
  id: string,
): { start: number; end: number } | null {
  const siblings = layerSiblings(order, parents, id);
  if (siblings === null || siblings.length === 0) {
    return null;
  }
  let start = Number.POSITIVE_INFINITY;
  let end = Number.NEGATIVE_INFINITY;
  for (const sibling of siblings) {
    const range = layerBlockRange(order, parents, sibling);
    if (range === null) {
      return null;
    }
    start = Math.min(start, range.start);
    end = Math.max(end, range.end);
  }
  return { start, end };
}

function spliceBlock(order: readonly string[], start: number, end: number): { block: string[]; rest: string[] } {
  const block = order.slice(start, end + 1);
  const rest = [...order.slice(0, start), ...order.slice(end + 1)];
  return { block, rest };
}

function insertBlockAt(rest: readonly string[], block: readonly string[], at: number): string[] {
  const clamped = Math.min(Math.max(0, at), rest.length);
  return [...rest.slice(0, clamped), ...block, ...rest.slice(clamped)];
}

/**
 * Move a layer's whole block one step within its sibling level.
 * "up" = toward the top (higher storage index / closer to the parent).
 * Returns the new order, or null at the level edge / for unknown ids.
 */
export function moveLayerBlock(
  order: readonly string[],
  parents: ReadonlyMap<string, string | null>,
  id: string,
  direction: "up" | "down",
): string[] | null {
  const siblings = layerSiblings(order, parents, id);
  if (siblings === null) {
    return null;
  }
  const pos = siblings.indexOf(id);
  const neighborPos = direction === "up" ? pos + 1 : pos - 1;
  const neighbor = pos < 0 || neighborPos < 0 || neighborPos >= siblings.length ? undefined : siblings[neighborPos];
  if (neighbor === undefined) {
    return null;
  }
  const moving = layerBlockRange(order, parents, id);
  const other = layerBlockRange(order, parents, neighbor);
  if (moving === null || other === null) {
    return null;
  }
  const { block, rest } = spliceBlock(order, moving.start, moving.end);
  // Locate the neighbor block inside `rest` (indices shift after removal).
  const otherInRest = layerBlockRange(rest, parents, neighbor);
  if (otherInRest === null) {
    return null;
  }
  const at = direction === "up" ? otherInRest.end + 1 : otherInRest.start;
  return insertBlockAt(rest, block, at);
}

/**
 * Move a layer's block with wraparound inside its own sibling segment.
 * Returns the new order, or null for unknown / single-child levels.
 */
export function moveLayerBlockWrapping(
  order: readonly string[],
  parents: ReadonlyMap<string, string | null>,
  id: string,
  direction: "up" | "down",
): string[] | null {
  const direct = moveLayerBlock(order, parents, id, direction);
  if (direct !== null) {
    return direct;
  }
  const siblings = layerSiblings(order, parents, id);
  if (siblings === null || siblings.length <= 1 || !siblings.includes(id)) {
    return null;
  }
  const moving = layerBlockRange(order, parents, id);
  const segment = siblingSegment(order, parents, id);
  if (moving === null || segment === null) {
    return null;
  }
  const { block, rest } = spliceBlock(order, moving.start, moving.end);
  const restSegment = siblingSegment(rest, parents, siblings.find((entry) => entry !== id) ?? id);
  if (restSegment === null) {
    return null;
  }
  // Up wraps from the top edge to the bottom of the level; down wraps the reverse.
  const at = direction === "up" ? restSegment.start : restSegment.end + 1;
  return insertBlockAt(rest, block, at);
}

/**
 * Reparent `childId` under `newParentId` (`null` handling lives in
 * `makeRootLayer`). `placement` picks the edge inside the new child list:
 * "top" = directly below the new parent, "bottom" = furthest from it.
 */
export function reparentLayer(
  order: readonly string[],
  parents: ReadonlyMap<string, string | null>,
  childId: string,
  newParentId: string,
  placement: "top" | "bottom",
): { order: string[]; parents: GnumarusLayerParentMap } | null {
  if (!order.includes(childId) || !order.includes(newParentId) || childId === newParentId) {
    return null;
  }
  if (isLayerAncestor(childId, newParentId, parents)) {
    return null;
  }
  const moving = layerBlockRange(order, parents, childId);
  if (moving === null) {
    return null;
  }
  const { block, rest } = spliceBlock(order, moving.start, moving.end);
  const next = new Map(parents);
  next.set(childId, newParentId);
  const parentIndex = rest.indexOf(newParentId);
  if (parentIndex < 0) {
    return null;
  }
  let at: number;
  if (placement === "top") {
    at = parentIndex;
  } else {
    const parentRange = layerBlockRange(rest, next, newParentId);
    at = parentRange === null ? parentIndex : parentRange.start;
  }
  return { order: insertBlockAt(rest, block, at), parents: next };
}

/**
 * Promote a layer to root, keeping it near its old position: the block is
 * placed immediately above the old parent (the next root above it).
 */
export function makeRootLayer(
  order: readonly string[],
  parents: ReadonlyMap<string, string | null>,
  id: string,
): { order: string[]; parents: GnumarusLayerParentMap } | null {
  if (!order.includes(id) || (parents.get(id) ?? null) === null) {
    return null;
  }
  const moving = layerBlockRange(order, parents, id);
  if (moving === null) {
    return null;
  }
  const oldParent = parents.get(id) ?? null;
  const { block, rest } = spliceBlock(order, moving.start, moving.end);
  const next = new Map(parents);
  next.set(id, null);
  if (oldParent === null) {
    return null;
  }
  const parentIndex = rest.indexOf(oldParent);
  if (parentIndex < 0) {
    // Old parent vanished (should not happen): append on top as a root.
    return { order: [...rest, ...block], parents: next };
  }
  return { order: insertBlockAt(rest, block, parentIndex + 1), parents: next };
}

/**
 * Rebuild a storage order that satisfies the invariant while preserving the
 * relative order of roots and of siblings (stable repair for loaded files).
 */
export function rebuildLayerOrder(
  order: readonly string[],
  parents: ReadonlyMap<string, string | null>,
): string[] {
  const childLists = new Map<string, string[]>();
  const roots: string[] = [];
  for (const id of order) {
    const parent = parents.get(id) ?? null;
    if (parent === null) {
      roots.push(id);
    } else {
      const list = childLists.get(parent) ?? [];
      list.push(id);
      childLists.set(parent, list);
    }
  }
  // Drop dangling references (should already be sanitized, but stay safe).
  const known = new Set(order);
  for (const [parent, list] of [...childLists]) {
    const kept = list.filter((id) => known.has(id));
    if (kept.length === 0) {
      childLists.delete(parent);
    } else {
      childLists.set(parent, kept);
    }
  }
  const visit = (id: string, seen: Set<string>): string[] => {
    if (seen.has(id)) {
      return [id];
    }
    seen.add(id);
    const out: string[] = [];
    for (const child of childLists.get(id) ?? []) {
      out.push(...visit(child, seen));
    }
    out.push(id);
    seen.delete(id);
    return out;
  };
  const seen = new Set<string>();
  const rebuilt: string[] = [];
  for (const root of roots) {
    rebuilt.push(...visit(root, seen));
  }
  // Any ids missed (orphaned by bad links) keep their relative order on top.
  for (const id of order) {
    if (!rebuilt.includes(id)) {
      rebuilt.push(id);
    }
  }
  return rebuilt;
}

/** One layer-mask contribution resolved for a frame (already visibility-checked by callers). */
export interface GnumarusMaskContribution {
  width: number;
  height: number;
  buffer: Uint8ClampedArray;
  transform: GnumarusLayerTransform;
  /** Mask layer opacity (0..1): 0 disables the mask, 1 applies it fully. */
  opacity: number;
}

function isIdentityTransform(transform: GnumarusLayerTransform): boolean {
  return (
    transform.x === 0 &&
    transform.y === 0 &&
    transform.rotation === 0 &&
    transform.flipX === false &&
    transform.flipY === false &&
    transform.scaleX === 1 &&
    transform.scaleY === 1 &&
    transform.skewX === 0 &&
    transform.skewY === 0 &&
    transform.rotationX === 0 &&
    transform.rotationY === 0
  );
}

/** Precomputed per-layer sampling constants for the slow combine path. */
interface GnumarusMaskSampler {
  width: number;
  height: number;
  buffer: Uint8ClampedArray;
  opacity: number;
  /** Parent texel (x,y) maps to project (pa*x + pb*y + ptx, pc*x + pd*y + pty). */
  pa: number;
  pb: number;
  pc: number;
  pd: number;
  /** Inverse linear map for mask sampling (valid=false when degenerate). */
  ia: number;
  ib: number;
  ic: number;
  id: number;
  idet: number;
  mtx: number;
  mty: number;
  mfsx: number;
  mfsy: number;
  mhw: number;
  mhh: number;
  valid: boolean;
}

/**
 * Mask factor of a single mask texel (0..1): transparent texels are
 * identity (1, "no opinion", so fresh/empty masks show everything),
 * otherwise luminance × alpha × mask opacity. White opaque shows (1),
 * black opaque hides (0), matching Photoshop/Krita mask semantics.
 */
export function maskTexelFactor(r: number, g: number, b: number, a: number, maskOpacity: number): number {
  if (!(a > 0)) {
    return 1;
  }
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const alpha = Math.min(1, Math.max(0, a / 255));
  const opacity = Math.min(1, Math.max(0, maskOpacity));
  // Mask opacity 0 disables the mask (identity); 1 applies the raw factor.
  const raw = luminance * alpha >= 1 ? 1 : luminance * alpha;
  const factor = 1 - (1 - raw) * opacity;
  return factor >= 1 ? 1 : factor;
}

/**
 * Combined mask multiplier for a parent-sized buffer (parent texture
 * space, so the canvas shader can sample it with the parent UVs).
 * Returns null when `masks` is empty. Out-of-bounds and transparent
 * samples are identity; several masks multiply. Pure and testable.
 */
export function combineMasksForParent(
  parentWidth: number,
  parentHeight: number,
  parentTransform: GnumarusLayerTransform,
  masks: readonly GnumarusMaskContribution[],
): Uint8ClampedArray | null {
  if (masks.length === 0 || !Number.isInteger(parentWidth) || !Number.isInteger(parentHeight) || parentWidth < 1 || parentHeight < 1) {
    return null;
  }
  const usable = masks.filter(
    (mask) =>
      Number.isInteger(mask.width) &&
      Number.isInteger(mask.height) &&
      mask.width >= 1 &&
      mask.height >= 1 &&
      mask.buffer.length === mask.width * mask.height * 4,
  );
  if (usable.length === 0) {
    return null;
  }
  // Fast path (the common case: same-size, untransformed layers): direct
  // 1:1 texel walk, no per-pixel calls, no allocations. Krita does the same
  // kind of fast/slow split in KisLayer::applyMasks (in-place fast path
  // when rects don't vary, temp-device slow path otherwise).
  if (
    isIdentityTransform(parentTransform) &&
    usable.every(
      (mask) =>
        mask.width === parentWidth && mask.height === parentHeight && isIdentityTransform(mask.transform),
    )
  ) {
    // Sparse-stroke fast path: strokes touch few texels, so pre-fill white
    // (identity) and only compute/store texels where some mask paints.
    const out = new Uint8ClampedArray(parentWidth * parentHeight * 4);
    out.fill(255);
    const opacities = usable.map((mask) => {
      const opacity = mask.opacity;
      return opacity >= 1 ? 1 : opacity <= 0 ? 0 : opacity;
    });
    const buffers = usable.map((mask) => mask.buffer);
    for (let i = 0, n = parentWidth * parentHeight; i < n; i += 1) {
      const o = i * 4;
      let factor = 1;
      let touched = false;
      for (let m = 0; m < buffers.length; m += 1) {
        const buffer = buffers[m] as Uint8ClampedArray;
        const a = buffer[o + 3] as number;
        if (a > 0) {
          touched = true;
          const luminance =
            (0.299 * (buffer[o] as number) + 0.587 * (buffer[o + 1] as number) + 0.114 * (buffer[o + 2] as number)) / 255;
          const alpha = a >= 255 ? 1 : a / 255;
          const raw = luminance * alpha >= 1 ? 1 : luminance * alpha;
          factor *= 1 - (1 - raw) * (opacities[m] as number);
          if (!(factor > 0)) {
            factor = 0;
            break;
          }
        }
      }
      if (touched && factor < 1) {
        const quantized = Math.round(factor * 255);
        out[o] = quantized;
        out[o + 1] = quantized;
        out[o + 2] = quantized;
      }
    }
    return out;
  }
  // Slow path: arbitrary transforms. All matrices are hoisted out of the
  // pixel loop and the sampling math is inlined (no per-pixel calls or
  // allocations), mirroring layerPixelCenterToProject/projectToLayerPixel.
  const out = new Uint8ClampedArray(parentWidth * parentHeight * 4);
  const parentMatrix = layerLinearMatrix(parentTransform);
  const pfsx = parentTransform.flipX ? -1 : 1;
  const pfsy = parentTransform.flipY ? -1 : 1;
  const phw = parentWidth / 2;
  const phh = parentHeight / 2;
  const samplers: GnumarusMaskSampler[] = [];
  for (const mask of usable) {
    const matrix = layerLinearMatrix(mask.transform);
    const determinant = matrix.a * matrix.d - matrix.b * matrix.c;
    const opacity = mask.opacity >= 1 ? 1 : mask.opacity <= 0 ? 0 : mask.opacity;
    samplers.push({
      width: mask.width,
      height: mask.height,
      buffer: mask.buffer,
      opacity,
      pa: parentMatrix.a,
      pb: parentMatrix.b,
      pc: parentMatrix.c,
      pd: parentMatrix.d,
      ia: matrix.d,
      ib: matrix.b,
      ic: matrix.c,
      id: matrix.a,
      idet: determinant,
      mtx: mask.transform.x,
      mty: mask.transform.y,
      mfsx: mask.transform.flipX ? -1 : 1,
      mfsy: mask.transform.flipY ? -1 : 1,
      mhw: mask.width / 2,
      mhh: mask.height / 2,
      valid: Math.abs(determinant) > 1e-9,
    });
  }
  // Parent translation applies in project space (added after the linear map).
  for (let y = 0; y < parentHeight; y += 1) {
    const qy = (y + 0.5 - phh) * pfsy;
    for (let x = 0; x < parentWidth; x += 1) {
      const qx = (x + 0.5 - phw) * pfsx;
      const projectX = parentMatrix.a * qx + parentMatrix.b * qy + parentTransform.x;
      const projectY = parentMatrix.c * qx + parentMatrix.d * qy + parentTransform.y;
      let factor = 1;
      for (let s = 0; s < samplers.length; s += 1) {
        const sampler = samplers[s] as GnumarusMaskSampler;
        if (!sampler.valid) {
          continue;
        }
        const rx = projectX - sampler.mtx;
        const ry = projectY - sampler.mty;
        const fqx = (sampler.id * rx - sampler.ib * ry) / sampler.idet;
        const fqy = (-sampler.ic * rx + sampler.ia * ry) / sampler.idet;
        const sx = Math.floor(fqx / sampler.mfsx + sampler.mhw);
        const sy = Math.floor(fqy / sampler.mfsy + sampler.mhh);
        if (sx < 0 || sy < 0 || sx >= sampler.width || sy >= sampler.height) {
          continue;
        }
        const o = (sy * sampler.width + sx) * 4;
        const buffer = sampler.buffer;
        const a = buffer[o + 3] as number;
        if (a > 0) {
          const luminance =
            (0.299 * (buffer[o] as number) + 0.587 * (buffer[o + 1] as number) + 0.114 * (buffer[o + 2] as number)) / 255;
          const alpha = a >= 255 ? 1 : a / 255;
          const raw = luminance * alpha >= 1 ? 1 : luminance * alpha;
          factor *= 1 - (1 - raw) * sampler.opacity;
          if (!(factor > 0)) {
            factor = 0;
            break;
          }
        }
      }
      const i = (y * parentWidth + x) * 4;
      const quantized = Math.round(factor * 255);
      out[i] = quantized;
      out[i + 1] = quantized;
      out[i + 2] = quantized;
      out[i + 3] = 255;
    }
  }
  return out;
}

/**
 * Combined mask factor at one project-space point (for CPU flattening).
 * Returns 1 when there is nothing to apply. Pure and testable.
 */
export function maskFactorAtProject(
  projectX: number,
  projectY: number,
  masks: readonly GnumarusMaskContribution[],
): number {
  let factor = 1;
  for (const mask of masks) {
    if (!Number.isInteger(mask.width) || !Number.isInteger(mask.height) || mask.width < 1 || mask.height < 1) {
      continue;
    }
    if (mask.buffer.length !== mask.width * mask.height * 4) {
      continue;
    }
    const sample = projectToLayerPixel(projectX, projectY, mask.width, mask.height, mask.transform);
    if (sample === null) {
      continue;
    }
    const o = (sample.y * mask.width + sample.x) * 4;
    factor *= maskTexelFactor(
      mask.buffer[o] as number,
      mask.buffer[o + 1] as number,
      mask.buffer[o + 2] as number,
      mask.buffer[o + 3] as number,
      mask.opacity,
    );
    if (!(factor > 0)) {
      return 0;
    }
  }
  return factor;
}

/**
 * Clear mask flags that cannot work: masks without a parent, masks under
 * masks, and masks with children (masks are always leaves). Mutates the
 * `isMask` map in place and returns the cleared ids. Pure and testable.
 */
export function sanitizeLayerMasks(
  order: readonly string[],
  parents: ReadonlyMap<string, string | null>,
  isMask: Map<string, boolean>,
): string[] {
  const cleared: string[] = [];
  const childrenOf = new Map<string, string[]>();
  for (const id of order) {
    const parent = parents.get(id) ?? null;
    if (parent !== null) {
      const list = childrenOf.get(parent) ?? [];
      list.push(id);
      childrenOf.set(parent, list);
    }
  }
  const isMaskOf = (id: string): boolean => isMask.get(id) === true;
  // Snapshot original flags so the result doesn't depend on visit order.
  const original = new Map<string, boolean>();
  for (const id of order) {
    original.set(id, isMaskOf(id));
  }
  for (const id of order) {
    if (original.get(id) !== true) {
      continue;
    }
    const parent = parents.get(id) ?? null;
    if (parent === null || !order.includes(parent) || original.get(parent) === true || (childrenOf.get(id)?.length ?? 0) > 0) {
      isMask.set(id, false);
      cleared.push(id);
    }
  }
  return cleared;
}

/**
 * Outdent: `id` leaves its parent and becomes a sibling right below the old
 * parent's whole block (display: immediately below the ex-parent). The new
 * parent is the ex-parent's parent (possibly null = root). Pure and testable.
 */
export function outdentLayer(
  order: readonly string[],
  parents: ReadonlyMap<string, string | null>,
  id: string,
): { order: string[]; parents: GnumarusLayerParentMap } | null {
  if (!order.includes(id)) {
    return null;
  }
  const oldParent = parents.get(id) ?? null;
  if (oldParent === null || !order.includes(oldParent)) {
    return null;
  }
  const moving = layerBlockRange(order, parents, id);
  if (moving === null) {
    return null;
  }
  const { block, rest } = spliceBlock(order, moving.start, moving.end);
  const parentRange = layerBlockRange(rest, parents, oldParent);
  if (parentRange === null) {
    return null;
  }
  const next = new Map(parents);
  next.set(id, parents.get(oldParent) ?? null);
  return { order: insertBlockAt(rest, block, parentRange.start), parents: next };
}

/**
 * Indent: `id` nests into the sibling directly above it (display order =
 * storage order reversed) as the last (bottom-most) child. Rejects missing
 * above-siblings and mask targets. Pure and testable; callers keep `isMask`.
 */
export function indentLayerIntoAbove(
  order: readonly string[],
  parents: ReadonlyMap<string, string | null>,
  id: string,
  isMaskTarget: (layerId: string) => boolean,
): { order: string[]; parents: GnumarusLayerParentMap } | null {
  const siblings = layerSiblings(order, parents, id);
  if (siblings === null) {
    return null;
  }
  const pos = siblings.indexOf(id);
  const target = pos < 0 || pos + 1 >= siblings.length ? undefined : siblings[pos + 1];
  if (target === undefined || isMaskTarget(target) || target === id) {
    return null;
  }
  if (isLayerAncestor(id, target, parents)) {
    return null;
  }
  const moving = layerBlockRange(order, parents, id);
  if (moving === null) {
    return null;
  }
  const { block, rest } = spliceBlock(order, moving.start, moving.end);
  const targetRange = layerBlockRange(rest, parents, target);
  if (targetRange === null) {
    return null;
  }
  const next = new Map(parents);
  next.set(id, target);
  // Bottom of the new child list = start of the target's block.
  return { order: insertBlockAt(rest, block, targetRange.start), parents: next };
}
