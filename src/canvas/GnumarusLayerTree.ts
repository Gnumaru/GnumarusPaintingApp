/**
 * Pure layer-tree helpers for nested layers (`parentId`).
 *
 * Storage invariant (bottom -> top, index 0 is the bottom render layer):
 * every parent sits immediately above its whole subtree, so a node's block
 * is `[descendants..., node]` and sibling blocks are adjacent. Display order
 * (top -> bottom) is the reverse, i.e. parent, then children, then the next
 * root. Render order follows the storage array directly.
 */

export type GnumarusLayerParentMap = Map<string, string | null>;

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
