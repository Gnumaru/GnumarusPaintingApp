/**
 * Pure content-manager helpers: byte formatting, SVG element counting and
 * usage aggregation over plain project snapshots (unit-testable without a
 * canvas or the engine). The engine only wires its live maps into these.
 */

import { similarityScore } from "../actions/GnumarusActions";

/** One cell reference in layer/frame coordinates with its layer name. */
export interface GnumarusManagedUsageCell {
  layerId: string;
  layerName: string;
  frame: number;
}

/** Usage roll-up for one managed payload: every cell it appears in. */
export interface GnumarusManagedUsage {
  count: number;
  cells: GnumarusManagedUsageCell[];
}

/** One row of the content-manager dialog (thumbnails resolve in the shell). */
export interface GnumarusManagedItem {
  kind: "texture" | "content" | "text" | "svg" | "model3d" | "tilemap";
  id: string;
  name: string;
  sizeBytes: number;
  /** Type-specific metadata line (resolution, vertices, tiles, ...). */
  meta: string;
  usage: GnumarusManagedUsage;
  /** Cell contents referencing this payload (empty for content rows). */
  contents: Array<{ id: string; name: string }>;
}

/** Whole-project snapshot feeding the dialog. */
export interface GnumarusContentSnapshot {
  textures: Array<{ id: string; name: string; width: number; height: number; sizeBytes: number }>;
  contents: Array<{ id: string; name: string; kindLabel: string; refId: string | null; sizeBytes: number }>;
  texts: Array<{ id: string; name: string; sizeBytes: number; charCount: number }>;
  svgs: Array<{ id: string; name: string; sizeBytes: number; elementCount: number }>;
  models: Array<{ id: string; name: string; ext: string; sizeBytes: number }>;
  tilemaps: Array<{
    id: string;
    name: string;
    tilesetId: string;
    tileWidth: number;
    tileHeight: number;
    tileCount: number;
    sizeBytes: number;
  }>;
  usage: {
    textures: Record<string, GnumarusManagedUsageCell[]>;
    contents: Record<string, GnumarusManagedUsageCell[]>;
    texts: Record<string, GnumarusManagedUsageCell[]>;
    svgs: Record<string, GnumarusManagedUsageCell[]>;
    models: Record<string, GnumarusManagedUsageCell[]>;
    tilemaps: Record<string, GnumarusManagedUsageCell[]>;
  };
  /** Payload id -> ids of the cell contents referencing it. */
  refs: {
    textures: Record<string, string[]>;
    texts: Record<string, string[]>;
    svgs: Record<string, string[]>;
    models: Record<string, string[]>;
    tilemaps: Record<string, string[]>;
  };
}

/** Human byte count: B, KB (1024) or MB with one decimal. */
export function formatContentBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "0 B";
  }
  if (bytes < 1024) {
    return `${Math.floor(bytes)} B`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    const rounded = Math.round(kb * 10) / 10;
    return `${rounded} KB`;
  }
  const mb = kb / 1024;
  return `${Math.round(mb * 10) / 10} MB`;
}

/** Graphic elements in an SVG source (paths and basic shapes). */
export function countSvgElements(svg: string): number {
  const matches = svg.match(/<(?:path|rect|circle|ellipse|line|polyline|polygon|use|text|image)\b/gi);
  return matches === null ? 0 : matches.length;
}

/** Metadata line builders (locale-neutral formatting only). */
export function textureMeta(width: number, height: number): string {
  return `${width} × ${height}`;
}

export function modelMeta(ext: string): string {
  return ext.startsWith(".") ? ext : `.${ext}`;
}

/**
 * Rank managed items by name similarity like the run-action palette: empty
 * queries keep everything in name order, non-matching names are dropped.
 */
export function searchManagedItems(items: readonly GnumarusManagedItem[], query: string): GnumarusManagedItem[] {
  const trimmed = query.trim();
  if (trimmed === "") {
    return [...items].sort((left, right) => left.name.localeCompare(right.name));
  }
  return items
    .map((item) => ({ item, score: similarityScore(trimmed, item.name) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.item.name.localeCompare(right.item.name))
    .map((entry) => entry.item);
}
