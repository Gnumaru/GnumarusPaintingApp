/**
 * Pure vector helpers for SVG cell contents: intrinsic size parsing,
 * unsupported-feature detection (rendered best-effort with a warning),
 * script stripping, and explicit-size injection for raster decoding.
 * No DOM needed, so this stays unit-testable in Node.
 */

/** Vector graphic entry: a source SVG string rasterized on demand. */
export interface GnumarusSvgEntry {
  id: string;
  name: string;
  svg: string;
}

/** Maximum raster dimension for imported SVGs (matches text rasters). */
export const GNUMARUS_SVG_MAX_DIMENSION = 4096;

/** Fallback raster size when the SVG declares no dimensions. */
export const GNUMARUS_SVG_DEFAULT_SIZE = 256;

/** Unsupported-feature labels reported by `detectUnsupportedSvgFeatures`. */
export type GnumarusSvgUnsupportedFeature =
  | "filters"
  | "path effects"
  | "foreign objects"
  | "scripts"
  | "animations"
  | "external references";

/** Leading-float parser for SVG length attributes (units ignored). */
function parseSvgLength(value: string | null): number | null {
  if (value === null) {
    return null;
  }
  const match = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)/.exec(value.trim());
  if (match === null) {
    return null;
  }
  const parsed = Number.parseFloat(match[0]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function clampSvgDimension(value: number): number {
  return Math.min(GNUMARUS_SVG_MAX_DIMENSION, Math.max(1, Math.round(value)));
}

/** Root `<svg ...>` opening tag, or null. */
function rootSvgTag(svg: string): string | null {
  const match = /<svg(?:\s[^>]*)?>/i.exec(svg);
  return match === null ? null : match[0];
}

function rootAttribute(tag: string, name: string): string | null {
  const match = new RegExp(`${name}\\s*=\\s*("[^"]*"|'[^']*'|[^\\s>]+)`, "i").exec(tag);
  if (match?.[1] === undefined) {
    return null;
  }
  const raw = match[1].trim();
  return raw.replace(/^["']|["']$/g, "");
}

/**
 * Intrinsic raster size: width/height attributes win, otherwise the viewBox
 * size, otherwise the default square. All clamped to 1..4096. Null when
 * there is no root svg tag at all.
 */
export function parseSvgDimensions(svg: string): { width: number; height: number } | null {
  const tag = rootSvgTag(svg);
  if (tag === null) {
    return null;
  }
  const width = parseSvgLength(rootAttribute(tag, "width"));
  const height = parseSvgLength(rootAttribute(tag, "height"));
  if (width !== null && height !== null) {
    return { width: clampSvgDimension(width), height: clampSvgDimension(height) };
  }
  const viewBox = rootAttribute(tag, "viewBox");
  if (viewBox !== null) {
    const parts = viewBox.trim().split(/[\s,]+/).map((part) => Number.parseFloat(part));
    if (
      parts.length === 4 &&
      parts.every((part) => Number.isFinite(part)) &&
      (parts[2] as number) > 0 &&
      (parts[3] as number) > 0
    ) {
      return {
        width: clampSvgDimension(parts[2] as number),
        height: clampSvgDimension(parts[3] as number),
      };
    }
  }
  if (width !== null || height !== null) {
    const side = clampSvgDimension((width ?? height) as number);
    return { width: side, height: side };
  }
  return { width: GNUMARUS_SVG_DEFAULT_SIZE, height: GNUMARUS_SVG_DEFAULT_SIZE };
}

/**
 * Inject explicit width/height into the root tag when either is missing, so
 * image decoders see intrinsic dimensions. Returns the input unchanged when
 * both are present or there is no root tag.
 */
export function withSvgSize(svg: string, width: number, height: number): string {
  const tag = rootSvgTag(svg);
  if (tag === null || /\swidth\s*=/i.test(tag) || /\sheight\s*=/i.test(tag)) {
    return svg;
  }
  const sized = tag.replace(/>$/, ` width="${width}" height="${height}">`);
  return svg.replace(tag, sized);
}

/**
 * Best-effort scan for SVG content the rasterizer cannot honor (rendered
 * as-is or dropped): filters, Inkscape path effects, foreign objects,
 * scripts, SMIL animation, and external references. Sorted unique labels.
 */
export function detectUnsupportedSvgFeatures(svg: string): GnumarusSvgUnsupportedFeature[] {
  const found = new Set<GnumarusSvgUnsupportedFeature>();
  if (/<filter(?=[\s>/])/i.test(svg) || /\sfilter\s*=/i.test(svg)) {
    found.add("filters");
  }
  if (/path-effect/i.test(svg) || /inkscape:original/i.test(svg)) {
    found.add("path effects");
  }
  if (/<foreignobject(?=[\s>/])/i.test(svg)) {
    found.add("foreign objects");
  }
  if (/<script(?=[\s>/])/i.test(svg)) {
    found.add("scripts");
  }
  if (/<animate(?=[\s>/])/i.test(svg) || /<animatetransform/i.test(svg) || /<animatemotion/i.test(svg) || /<set(?=[\s>/])/i.test(svg)) {
    found.add("animations");
  }
  if (/(?:href|xlink:href)\s*=\s*["'](?:https?|ftp):/i.test(svg)) {
    found.add("external references");
  }
  return [...found].sort();
}

/**
 * Strip script blocks and inline event-handler attributes from an SVG
 * string. The rasterizer would not run them anyway; the stored document
 * stays inert.
 */
export function sanitizeSvg(svg: string): string {
  return svg
    .replace(/<script(?=[\s>/])[^>]*?(?:\/>|>[\s\S]*?<\/script\s*>)/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
}

/** True when the string looks like an SVG document (root svg tag present). */
export function looksLikeSvg(svg: string): boolean {
  return rootSvgTag(svg) !== null;
}
