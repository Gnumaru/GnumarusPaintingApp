/**
 * Rich-text layout: canonical sanitized HTML -> styled runs grouped in
 * lines, then positioned lines. Font measurement is injected so layout is
 * unit-testable without a canvas.
 */
import { sanitizeTextHtml } from "./GnumarusTextSanitize";

export interface GnumarusTextRunStyle {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  /** Always resolved (never null) after parsing. */
  fontFamily: string;
  /** Always resolved (never null) after parsing. */
  fontSize: number;
  /** Always resolved (never null) after parsing, #rrggbbaa. */
  color: string;
}

export interface GnumarusTextRun extends GnumarusTextRunStyle {
  text: string;
}

export interface GnumarusTextParagraph {
  align: "left" | "center" | "right";
  runs: GnumarusTextRun[];
}

export interface GnumarusLaidOutRun extends GnumarusTextRun {
  /** X offset inside the line, in layout px. */
  x: number;
  /** Measured width in layout px. */
  width: number;
}

export interface GnumarusLaidOutLine {
  /** Y offset of the line top, in layout px. */
  y: number;
  height: number;
  runs: GnumarusLaidOutRun[];
}

export interface GnumarusLaidOutText {
  width: number;
  height: number;
  lines: GnumarusLaidOutLine[];
}

export const GNUMARUS_TEXT_DEFAULT_FONT_FAMILY = "sans-serif";
export const GNUMARUS_TEXT_DEFAULT_FONT_SIZE = 32;
export const GNUMARUS_TEXT_DEFAULT_COLOR = "#000000ff";
export const GNUMARUS_TEXT_DEFAULT_LINE_HEIGHT = 1.2;

/** Parse canonical (or arbitrary) rich-text HTML into paragraphs of runs. */
export function parseTextDocument(html: string): GnumarusTextParagraph[] {
  const canonical = sanitizeTextHtml(html);
  const paragraphs: GnumarusTextParagraph[] = [];
  const blockPattern = /<div([^>]*)>([\s\S]*?)<\/div>|<div([^>]*)><br><\/div>/g;
  let match: RegExpExecArray | null;
  while ((match = blockPattern.exec(canonical)) !== null) {
    const full = match[0];
    const isBlank = /<br>/.test(full);
    const attrSource = match[1] ?? match[3] ?? "";
    const alignMatch = /text-align\s*:\s*(left|center|right)/i.exec(attrSource);
    const align = alignMatch?.[1]?.toLowerCase() === "center" ? "center" : alignMatch?.[1]?.toLowerCase() === "right" ? "right" : "left";
    const inner = isBlank ? "" : (match[2] ?? "");
    paragraphs.push({ align, runs: parseInlineRuns(inner) });
  }
  return paragraphs;
}

function parseInlineRuns(html: string): GnumarusTextRun[] {
  interface Frame {
    tag: string;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    fontFamily: string;
    fontSize: number;
    color: string;
  }
  const base: Frame = { tag: "", bold: false, italic: false, underline: false, fontFamily: "", fontSize: 0, color: "" };
  const stack: Frame[] = [base];
  const runs: GnumarusTextRun[] = [];
  const pushText = (text: string): void => {
    if (text === "") {
      return;
    }
    const top = stack[stack.length - 1] ?? base;
    runs.push({
      text,
      bold: top.bold,
      italic: top.italic,
      underline: top.underline,
      fontFamily: top.fontFamily,
      fontSize: top.fontSize,
      color: top.color,
    });
  };
  let pos = 0;
  while (pos < html.length) {
    if (!html.startsWith("<", pos)) {
      const next = html.indexOf("<", pos);
      pushText(unescapeText(html.slice(pos, next < 0 ? html.length : next)));
      pos = next < 0 ? html.length : next;
      continue;
    }
    const end = html.indexOf(">", pos);
    if (end < 0) {
      pushText(unescapeText(html.slice(pos)));
      break;
    }
    const inner = html.slice(pos + 1, end).trim();
    pos = end + 1;
    if (inner.startsWith("/")) {
      const name = inner.slice(1).trim().toLowerCase();
      for (let i = stack.length - 1; i > 0; i -= 1) {
        if (stack[i]?.tag === name) {
          stack.length = i;
          break;
        }
      }
      continue;
    }
    const name = (/^[A-Za-z][A-Za-z0-9]*/.exec(inner)?.[0] ?? "").toLowerCase();
    const parent = stack[stack.length - 1] ?? base;
    if (name === "b" || name === "i" || name === "u") {
      stack.push({
        ...parent,
        tag: name,
        bold: parent.bold || name === "b",
        italic: parent.italic || name === "i",
        underline: parent.underline || name === "u",
      });
      continue;
    }
    if (name === "span") {
      const styleMatch = /style\s*=\s*"([^"]*)"/i.exec(inner) ?? /style\s*=\s*'([^']*)'/i.exec(inner);
      const style = styleMatch?.[1] ?? "";
      const child: Frame = { ...parent, tag: name };
      const family = /font-family\s*:\s*([^;]+)/i.exec(style)?.[1]?.trim().replace(/^["']|["']$/g, "");
      const size = /font-size\s*:\s*([0-9.]+)px/i.exec(style)?.[1];
      const color = /color\s*:\s*(#[0-9a-fA-F]{8})/.exec(style)?.[1]?.toLowerCase();
      if (family !== undefined && family !== "") {
        child.fontFamily = family;
      }
      if (size !== undefined) {
        const parsed = Math.round(Number.parseFloat(size));
        if (Number.isFinite(parsed) && parsed > 0) {
          child.fontSize = parsed;
        }
      }
      if (color !== undefined) {
        child.color = color;
      }
      stack.push(child);
      continue;
    }
    // Unknown inline: transparent container.
    stack.push({ ...parent, tag: name });
  }
  return runs;
}

function unescapeText(text: string): string {
  return text.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
}

/** Fill run defaults (sans-serif / 32px / black) for missing style fields. */
export function defaultTextRun(run: Partial<GnumarusTextRun> & { text: string }): GnumarusTextRun {
  return {
    text: run.text,
    bold: run.bold ?? false,
    italic: run.italic ?? false,
    underline: run.underline ?? false,
    fontFamily: run.fontFamily === undefined || run.fontFamily === "" ? GNUMARUS_TEXT_DEFAULT_FONT_FAMILY : run.fontFamily,
    fontSize: run.fontSize === undefined || !(run.fontSize > 0) ? GNUMARUS_TEXT_DEFAULT_FONT_SIZE : run.fontSize,
    color: run.color === undefined || run.color === "" ? GNUMARUS_TEXT_DEFAULT_COLOR : run.color,
  };
}

/** CSS font shorthand for canvas fillText. */
export function textRunFont(run: { bold: boolean; italic: boolean; fontFamily: string; fontSize: number }): string {
  const family = run.fontFamily.includes(" ") ? `"${run.fontFamily}"` : run.fontFamily;
  return `${run.italic ? "italic " : ""}${run.bold ? "bold " : ""}${run.fontSize}px ${family}`;
}

/**
 * Lay out paragraphs into lines. `measure(text, font)` returns the advance
 * width in layout px. No wrapping: each paragraph is one line (clamped to
 * `maxWidth`, default 4096).
 */
export function layoutTextDocument(
  paragraphs: GnumarusTextParagraph[],
  measure: (text: string, font: string) => number,
  maxWidth = 4096,
  maxHeight = 4096,
): GnumarusLaidOutText {
  interface LineRun extends GnumarusTextRun {
    width: number;
  }
  const lines: Array<{ align: "left" | "center" | "right"; runs: LineRun[]; width: number; height: number }> = [];
  for (const paragraph of paragraphs) {
    const runs: LineRun[] = [];
    let width = 0;
    let height = 0;
    for (const raw of paragraph.runs) {
      const run = defaultTextRun(raw);
      if (run.text === "") {
        continue;
      }
      const runWidth = Math.max(0, measure(run.text, textRunFont(run)));
      runs.push({ ...run, width: runWidth });
      width += runWidth;
      height = Math.max(height, run.fontSize * GNUMARUS_TEXT_DEFAULT_LINE_HEIGHT);
    }
    if (paragraph.runs.length === 0 || (runs.length === 0 && paragraph.runs.length > 0)) {
      height = Math.max(height, GNUMARUS_TEXT_DEFAULT_FONT_SIZE * GNUMARUS_TEXT_DEFAULT_LINE_HEIGHT);
    }
    lines.push({ align: paragraph.align, runs, width, height });
  }
  const boxWidth = Math.min(maxWidth, Math.max(0, ...lines.map((line) => line.width)));
  let y = 0;
  const laid: GnumarusLaidOutLine[] = [];
  for (const line of lines) {
    if (y >= maxHeight) {
      break;
    }
    const offset = line.align === "center" ? (boxWidth - line.width) / 2 : line.align === "right" ? boxWidth - line.width : 0;
    let x = Math.max(0, offset);
    const out: GnumarusLaidOutRun[] = line.runs.map((run) => {
      const placed = { ...run, x, width: run.width };
      x += run.width;
      return placed;
    });
    laid.push({ y, height: line.height, runs: out });
    y += line.height;
  }
  return { width: boxWidth, height: y, lines: laid };
}
