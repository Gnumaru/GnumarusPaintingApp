/**
 * HTML sanitizer for rich text contents. Accepts arbitrary HTML (including
 * contenteditable/pasted markup) and returns a deterministic canonical
 * subset: <div> blocks (optional text-align), <br>, <b>/<i>/<u>, and <span>
 * with an allowlisted inline style. Everything else is unwrapped (children
 * kept) or dropped (script/style and friends, subtree included).
 *
 * Canonical guarantees: fixed tag/property order, normalized colors and
 * sizes, collapsed whitespace, no-op on already canonical input
 * (sanitize(sanitize(x)) === sanitize(x)).
 */
import { GNUMARUS_TEXT_MAX_HTML_LENGTH } from "./GnumarusText";

type InlineStyle = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  fontFamily: string | null;
  fontSize: number | null;
  color: string | null;
};

/** Font families kept verbatim (case-insensitive match); others fall back. */
const ALLOWED_FONT_FAMILIES = [
  "sans-serif",
  "serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "arial",
  "helvetica",
  "verdana",
  "tahoma",
  "trebuchet ms",
  "georgia",
  "times new roman",
  "courier new",
  "impact",
  "comic sans ms",
  "segoe ui",
];

/** Small named-color table (pasted colors); anything else must be hex/rgb(). */
const NAMED_COLORS: Record<string, string> = {
  black: "#000000ff",
  silver: "#c0c0c0ff",
  gray: "#808080ff",
  white: "#ffffffff",
  maroon: "#800000ff",
  red: "#ff0000ff",
  purple: "#800080ff",
  fuchsia: "#ff00ffff",
  green: "#008000ff",
  lime: "#00ff00ff",
  olive: "#808000ff",
  yellow: "#ffff00ff",
  navy: "#000080ff",
  blue: "#0000ffff",
  teal: "#008080ff",
  aqua: "#00ffffff",
};

const DROP_SUBTREE = new Set([
  "script",
  "style",
  "textarea",
  "title",
  "iframe",
  "object",
  "embed",
  "param",
  "form",
  "input",
  "button",
  "select",
  "option",
  "optgroup",
  "fieldset",
  "legend",
  "label",
  "link",
  "meta",
  "base",
  "basefont",
  "noscript",
  "template",
  "slot",
  "canvas",
  "svg",
  "math",
  "video",
  "audio",
  "source",
  "track",
  "picture",
  "map",
  "frame",
  "frameset",
  "noframes",
  "applet",
  "keygen",
  "output",
  "progress",
  "meter",
  "datalist",
  "dialog",
]);

/** Void elements: dropped, except br/hr which break the line. */
const VOID_TAGS = new Set([
  "br",
  "hr",
  "img",
  "area",
  "wbr",
  "col",
  "embed",
  "frame",
  "input",
  "keygen",
  "link",
  "meta",
  "param",
  "source",
  "track",
]);

const BLOCK_TAGS = new Set([
  "div",
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "blockquote",
  "section",
  "article",
  "header",
  "footer",
  "main",
  "nav",
  "aside",
  "figure",
  "figcaption",
  "dl",
  "dt",
  "dd",
  "tr",
]);


function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&#0*160;|&#x0*[aA]0;|&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_match, digits: string) => {
      const code = Number.parseInt(digits, 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_match, digits: string) => {
      const code = Number.parseInt(digits, 16);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
    })
    .replace(/&amp;/gi, "&");
}

function escapeText(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function normalizeHexColor(value: string): string | null {
  const hex = value.trim();
  const short = /^#([0-9a-fA-F]{3})$/.exec(hex);
  if (short?.[1] !== undefined) {
    const [r, g, b] = short[1];
    return `#${r}${r}${g}${g}${b}${b}ff`.toLowerCase();
  }
  const long = /^#([0-9a-fA-F]{6})([0-9a-fA-F]{2})?$/.exec(hex);
  if (long?.[1] !== undefined) {
    return `#${long[1]}${long[2] ?? "ff"}`.toLowerCase();
  }
  const rgb = /^rgba?\(\s*([^)]+)\s*\)$/i.exec(hex);
  if (rgb?.[1] !== undefined) {
    const parts = rgb[1].split(",").map((part) => part.trim());
    if (parts.length < 3 || parts.length > 4) {
      return null;
    }
    const channels: number[] = [];
    for (let i = 0; i < 3; i += 1) {
      const raw = parts[i] ?? "";
      let channel: number;
      if (raw.endsWith("%")) {
        channel = Math.round((Number.parseFloat(raw) / 100) * 255);
      } else {
        channel = Math.round(Number.parseFloat(raw));
      }
      if (!Number.isFinite(channel)) {
        return null;
      }
      channels.push(Math.min(255, Math.max(0, channel)));
    }
    let alpha = 255;
    if (parts.length === 4) {
      const raw = parts[3] ?? "";
      const parsed = raw.endsWith("%") ? (Number.parseFloat(raw) / 100) * 255 : Number.parseFloat(raw) * 255;
      if (!Number.isFinite(parsed)) {
        return null;
      }
      alpha = Math.round(Math.min(255, Math.max(0, parsed)));
    }
    const toHex = (channel: number | undefined): string => (channel ?? 0).toString(16).padStart(2, "0");
    return `#${toHex(channels[0])}${toHex(channels[1])}${toHex(channels[2])}${toHex(alpha)}`;
  }
  const named = NAMED_COLORS[hex.trim().toLowerCase()];
  return named ?? null;
}

function normalizeFontFamily(value: string): string | null {
  const candidates = value
    .split(",")
    .map((part) => part.trim().replace(/^["']|["']$/g, ""))
    .filter((part) => part.length > 0);
  for (const candidate of candidates) {
    const lowered = candidate.toLowerCase();
    const match = ALLOWED_FONT_FAMILIES.find((allowed) => allowed === lowered);
    if (match !== undefined) {
      return match;
    }
  }
  return null;
}

function normalizeFontSize(value: string): number | null {
  const trimmed = value.trim().toLowerCase();
  const px = /^([0-9]+(?:\.[0-9]+)?)px$/.exec(trimmed);
  if (px?.[1] !== undefined) {
    return Math.min(500, Math.max(6, Math.round(Number.parseFloat(px[1]))));
  }
  const pt = /^([0-9]+(?:\.[0-9]+)?)pt$/.exec(trimmed);
  if (pt?.[1] !== undefined) {
    return Math.min(500, Math.max(6, Math.round((Number.parseFloat(pt[1]) * 96) / 72)));
  }
  return null;
}

function parseStyleAttribute(style: string): Partial<InlineStyle> {
  const out: Partial<InlineStyle> = {};
  for (const declaration of style.split(";")) {
    const colon = declaration.indexOf(":");
    if (colon < 0) {
      continue;
    }
    const prop = declaration.slice(0, colon).trim().toLowerCase();
    const value = declaration.slice(colon + 1).trim();
    if (value === "") {
      continue;
    }
    if (prop === "color") {
      const color = normalizeHexColor(value);
      if (color !== null) {
        out.color = color;
      }
    } else if (prop === "font-family") {
      const family = normalizeFontFamily(value);
      if (family !== null) {
        out.fontFamily = family;
      }
    } else if (prop === "font-size") {
      const size = normalizeFontSize(value);
      if (size !== null) {
        out.fontSize = size;
      }
    } else if (prop === "font-weight") {
      const lowered = value.toLowerCase();
      if (lowered === "bold" || (Number.parseFloat(lowered) >= 600 && lowered !== "normal")) {
        out.bold = true;
      }
    } else if (prop === "font-style") {
      const lowered = value.toLowerCase();
      if (lowered === "italic" || lowered === "oblique") {
        out.italic = true;
      }
    } else if (prop === "text-decoration") {
      if (value.toLowerCase().includes("underline")) {
        out.underline = true;
      }
    } else if (prop === "font") {
      for (const token of value.split(/\s+/)) {
        const lowered = token.toLowerCase();
        if (lowered === "italic" || lowered === "oblique") {
          out.italic = true;
        } else if (lowered === "bold" || (Number.parseFloat(lowered) >= 600 && lowered !== "normal")) {
          out.bold = true;
        } else if (lowered.endsWith("px") || lowered.endsWith("pt")) {
          const [sizePart] = lowered.split("/");
          const size = sizePart === undefined ? null : normalizeFontSize(sizePart);
          if (size !== null) {
            out.fontSize = size;
          }
        } else if (token.includes(",")) {
          const family = normalizeFontFamily(token);
          if (family !== null) {
            out.fontFamily = family;
          }
        }
      }
    }
  }
  return out;
}

interface ParsedTag {
  kind: "open" | "close" | "void";
  name: string;
  attrs: Record<string, string>;
}

/** Minimal tolerant tag parser; null when there is no closing `>`. */
function parseTag(input: string, start: number): { tag: ParsedTag; end: number } | null {
  if (input[start] !== "<") {
    return null;
  }
  if (input.startsWith("<!--", start)) {
    const close = input.indexOf("-->", start + 4);
    if (close < 0) {
      return null;
    }
    return { tag: { kind: "void", name: "!comment", attrs: {} }, end: close + 3 };
  }
  const end = input.indexOf(">", start + 1);
  if (end < 0) {
    return null;
  }
  let inner = input.slice(start + 1, end).trim();
  if (inner.startsWith("!") || inner.startsWith("?")) {
    return { tag: { kind: "void", name: "!markup", attrs: {} }, end: end + 1 };
  }
  let kind: "open" | "close" | "void" = "open";
  if (inner.startsWith("/")) {
    kind = "close";
    inner = inner.slice(1).trim();
  } else if (inner.endsWith("/")) {
    kind = "void";
    inner = inner.slice(0, -1).trim();
  }
  const nameMatch = /^[A-Za-z][A-Za-z0-9]*/.exec(inner);
  if (nameMatch === null) {
    return { tag: { kind: "void", name: "!bogus", attrs: {} }, end: end + 1 };
  }
  const name = nameMatch[0].toLowerCase();
  const attrs: Record<string, string> = {};
  const rest = inner.slice(name.length);
  const attrPattern = /([A-Za-z_:][A-Za-z0-9_.:-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`>=]+)))?/g;
  let match: RegExpExecArray | null;
  while ((match = attrPattern.exec(rest)) !== null) {
    const attrName = (match[1] ?? "").toLowerCase();
    const attrValue = match[2] ?? match[3] ?? match[4] ?? "";
    if (attrName !== "" && attrs[attrName] === undefined) {
      attrs[attrName] = decodeEntities(attrValue);
    }
    if (match[0] === "") {
      break;
    }
  }
  return { tag: { kind, name, attrs }, end: end + 1 };
}

type StackFrame = {
  type: "inline";
  bold: boolean;
  italic: boolean;
  underline: boolean;
  fontFamily: string | null;
  fontSize: number | null;
  color: string | null;
};

/**
 * Sanitize arbitrary HTML into the canonical rich-text subset: a sequence of
 * <div> blocks (align via style only when centered/right; blank lines are
 * `<div><br></div>`), inline styling as nested <b>/<i>/<u> plus
 * <span style="font-family:…;font-size:…;color:…">. Everything else is
 * unwrapped or dropped, so output is deterministic.
 */
export function sanitizeTextHtml(input: string): string {
  const source = input.length > GNUMARUS_TEXT_MAX_HTML_LENGTH ? input.slice(0, GNUMARUS_TEXT_MAX_HTML_LENGTH) : input;
  interface OutRun {
    text: string;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    fontFamily: string | null;
    fontSize: number | null;
    color: string | null;
  }
  interface OutBlock {
    align: "left" | "center" | "right";
    runs: OutRun[];
    /** True for blocks created by an explicit line split (<br> or newline). */
    explicit: boolean;
  }
  const blocks: OutBlock[] = [];
  let current: OutRun[] = [];
  let currentAlign: "left" | "center" | "right" = "left";
  const stack: StackFrame[] = [];
  const alignStack: Array<"left" | "center" | "right"> = [];
  let dropping = 0;

  const inlineState = (): { bold: boolean; italic: boolean; underline: boolean; fontFamily: string | null; fontSize: number | null; color: string | null } => {
    const state = { bold: false, italic: false, underline: false, fontFamily: null as string | null, fontSize: null as number | null, color: null as string | null };
    for (const frame of stack) {
      if (frame.type !== "inline") {
        continue;
      }
      state.bold = state.bold || frame.bold;
      state.italic = state.italic || frame.italic;
      state.underline = state.underline || frame.underline;
      if (frame.fontFamily !== null) {
        state.fontFamily = frame.fontFamily;
      }
      if (frame.fontSize !== null) {
        state.fontSize = frame.fontSize;
      }
      if (frame.color !== null) {
        state.color = frame.color;
      }
    }
    return state;
  };

  const pushBlock = (explicit: boolean): void => {
    blocks.push({ align: currentAlign, runs: current, explicit });
    current = [];
  };

  const flushBlock = (): void => {
    if (current.length > 0) {
      pushBlock(false);
    }
  };

  const openBlock = (align: "left" | "center" | "right" | null): void => {
    flushBlock();
    alignStack.push(currentAlign);
    if (align !== null) {
      currentAlign = align;
    }
  };

  const closeBlock = (): void => {
    flushBlock();
    const restored = alignStack.pop();
    if (restored !== undefined) {
      currentAlign = restored;
    }
  };

  const pushText = (raw: string): void => {
    const collapsed = raw.replace(/[ \t\f\v ]+/g, " ");
    if (collapsed === "") {
      return;
    }
    const state = inlineState();
    const parts = collapsed.split("\n");
    parts.forEach((part, index) => {
      if (index > 0) {
        pushBlock(true);
      }
      if (part !== "") {
        current.push({ text: part, ...state });
      }
    });
  };

  let pos = 0;
  while (pos < source.length) {
    if (dropping > 0) {
      const parsed = parseTag(source, pos);
      if (parsed === null) {
        pos += 1;
        continue;
      }
      const { tag, end } = parsed;
      if (tag.kind === "close" && DROP_SUBTREE.has(tag.name)) {
        dropping -= 1;
      } else if (tag.kind !== "close" && DROP_SUBTREE.has(tag.name)) {
        dropping += 1;
      }
      pos = end;
      continue;
    }
    if (source[pos] !== "<") {
      const next = source.indexOf("<", pos);
      pushText(decodeEntities(source.slice(pos, next < 0 ? source.length : next)));
      pos = next < 0 ? source.length : next;
      continue;
    }
    const parsed = parseTag(source, pos);
    if (parsed === null) {
      pushText(decodeEntities(source.slice(pos)));
      break;
    }
    const { tag, end } = parsed;
    pos = end;
    if (tag.name === "!comment" || tag.name === "!markup" || tag.name === "!bogus") {
      continue;
    }
    if (DROP_SUBTREE.has(tag.name)) {
      if (tag.kind !== "close") {
        dropping = 1;
      }
      continue;
    }
    if (tag.name === "br" || tag.name === "hr") {
      pushBlock(true);
      continue;
    }
    if (VOID_TAGS.has(tag.name)) {
      continue;
    }
    if (BLOCK_TAGS.has(tag.name)) {
      if (tag.kind !== "close") {
        let align: "left" | "center" | "right" | null = null;
        if (tag.name === "div" || tag.name === "p") {
          const legacy = (tag.attrs["align"] ?? "").toLowerCase();
          const styleAlign = /text-align\s*:\s*(left|center|right|justify)/i.exec(tag.attrs["style"] ?? "");
          const resolved = styleAlign?.[1]?.toLowerCase() ?? legacy;
          align = resolved === "center" ? "center" : resolved === "right" ? "right" : "left";
        }
        openBlock(align);
      } else {
        closeBlock();
      }
      continue;
    }
    if (tag.kind === "close") {
      for (let i = stack.length - 1; i >= 0; i -= 1) {
        if (stack[i]?.type === "inline") {
          stack.length = i;
          break;
        }
      }
      continue;
    }
    // Inline element: merge its styling into one frame.
    const frame: StackFrame = { type: "inline", bold: false, italic: false, underline: false, fontFamily: null, fontSize: null, color: null };
    const tagName = tag.name;
    if (tagName === "b" || tagName === "strong") {
      frame.bold = true;
    } else if (tagName === "i" || tagName === "em") {
      frame.italic = true;
    } else if (tagName === "u") {
      frame.underline = true;
    } else if (tagName === "span" || tagName === "font") {
      const parsed = parseStyleAttribute(tag.attrs["style"] ?? "");
      Object.assign(frame, parsed);
      if (tag.attrs["face"] !== undefined) {
        const family = normalizeFontFamily(tag.attrs["face"]);
        if (family !== null) {
          frame.fontFamily = family;
        }
      }
      if (tag.attrs["color"] !== undefined) {
        const color = normalizeHexColor(tag.attrs["color"]);
        if (color !== null) {
          frame.color = color;
        }
      }
      if (tag.attrs["size"] !== undefined) {
        const legacy = Number.parseInt(tag.attrs["size"], 10);
        if (Number.isFinite(legacy)) {
          frame.fontSize = Math.min(500, Math.max(6, 12 + (legacy - 3) * 2));
        }
      }
    } else {
      // Unknown inline (a, code, ...): transparent, children keep styles.
      stack.push({ type: "inline", bold: false, italic: false, underline: false, fontFamily: null, fontSize: null, color: null });
      continue;
    }
    stack.push(frame);
  }
  if (current.length > 0) {
    flushBlock();
  }
  for (const block of blocks) {
    const first = block.runs[0];
    if (first !== undefined) {
      first.text = first.text.replace(/^ +/, "");
    }
    const last = block.runs[block.runs.length - 1];
    if (last !== undefined) {
      last.text = last.text.replace(/ +$/, "");
    }
    block.runs = block.runs.filter((run) => run.text !== "");
  }
  const kept = blocks.filter((block) => block.runs.length > 0 || block.explicit);
  blocks.length = 0;
  blocks.push(...kept);
  while (blocks.length > 0 && blocks[blocks.length - 1]?.runs.length === 0) {
    blocks.pop();
  }

  const escapeAttr = (value: string): string =>
    value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const parts: string[] = [];
  for (const block of blocks) {
    const runs: string[] = [];
    for (const run of block.runs) {
      if (run.text === "") {
        continue;
      }
      let inner = escapeText(run.text);
      const style: string[] = [];
      if (run.fontFamily !== null) {
        const family = run.fontFamily.includes(" ") ? `"${run.fontFamily}"` : run.fontFamily;
        style.push(`font-family:${family}`);
      }
      if (run.fontSize !== null) {
        style.push(`font-size:${run.fontSize}px`);
      }
      if (run.color !== null) {
        style.push(`color:${run.color}`);
      }
      if (style.length > 0) {
        inner = `<span style="${escapeAttr(style.join(";"))}">${inner}</span>`;
      }
      if (run.underline) {
        inner = `<u>${inner}</u>`;
      }
      if (run.italic) {
        inner = `<i>${inner}</i>`;
      }
      if (run.bold) {
        inner = `<b>${inner}</b>`;
      }
      runs.push(inner);
    }
    if (runs.length === 0) {
      const align = block.align === "left" ? "" : ` style="text-align:${block.align}"`;
      parts.push(`<div${align}><br></div>`);
      continue;
    }
    const align = block.align === "left" ? "" : ` style="text-align:${block.align}"`;
    parts.push(`<div${align}>${runs.join("")}</div>`);
  }
  const html = parts.join("");
  return html.length > GNUMARUS_TEXT_MAX_HTML_LENGTH ? html.slice(0, GNUMARUS_TEXT_MAX_HTML_LENGTH) : html;
}
