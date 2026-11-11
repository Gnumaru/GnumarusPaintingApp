import { describe, expect, it } from "vitest";
import {
  defaultTextRun,
  layoutTextDocument,
  parseTextDocument,
  textRunFont,
} from "../src/text/GnumarusTextLayout";

const measure = (text: string, _font: string): number => text.length * 10;

describe("parseTextDocument", () => {
  it("parses plain and styled runs", () => {
    const paragraphs = parseTextDocument("<div>Hello <b>bold</b> and <i>it</i></div>");
    expect(paragraphs).toHaveLength(1);
    expect(paragraphs[0]?.align).toBe("left");
    expect(paragraphs[0]?.runs.map((run) => run.text)).toEqual(["Hello ", "bold", " and ", "it"]);
    expect(paragraphs[0]?.runs[1]).toMatchObject({ bold: true });
    expect(paragraphs[0]?.runs[3]).toMatchObject({ italic: true });
  });

  it("reads span overrides and block alignment", () => {
    const paragraphs = parseTextDocument(
      '<div style="text-align:center"><span style="font-family:Georgia,serif;font-size:24px;color:#12345678">x</span></div><div><br></div>',
    );
    expect(paragraphs).toHaveLength(1);
    expect(paragraphs[0]?.align).toBe("center");
    expect(paragraphs[0]?.runs[0]).toMatchObject({ fontFamily: "georgia", fontSize: 24, color: "#12345678" });
    // A trailing blank block is dropped (invisible trailing newline).
    expect(paragraphs[1]).toBeUndefined();
    // ...but a middle blank line survives.
    expect(parseTextDocument("<div>a</div><div><br></div><div>b</div>")).toHaveLength(3);
  });

  it("handles empty and degenerate input", () => {
    expect(parseTextDocument("")).toEqual([]);
    // A blank-only document sanitizes to empty.
    expect(parseTextDocument("<div><br></div>")).toEqual([]);
  });
});

describe("layoutTextDocument", () => {
  it("lays out runs with alignment offsets", () => {
    const laidOut = layoutTextDocument(parseTextDocument("<div>ab <b>c</b></div><div>d</div>"), measure);
    expect(laidOut.lines).toHaveLength(2);
    // "ab "=30, "c"=10 -> line width 40.
    expect(laidOut.width).toBe(40);
    expect(laidOut.lines[0]?.runs.map((run) => run.x)).toEqual([0, 30]);
    expect(laidOut.lines[1]?.runs[0]?.x).toBe(0);
    expect(laidOut.height).toBeGreaterThan(0);
  });

  it("centers and right-aligns lines", () => {
    const centered = layoutTextDocument(parseTextDocument('<div style="text-align:center">ab</div><div>abcd</div>'), measure);
    expect(centered.lines[0]?.runs[0]?.x).toBe(10);
    const right = layoutTextDocument(parseTextDocument('<div style="text-align:right">ab</div><div>abcd</div>'), measure);
    expect(right.lines[0]?.runs[0]?.x).toBe(20);
  });

  it("produces an empty layout for empty documents", () => {
    const laidOut = layoutTextDocument(parseTextDocument(""), measure);
    expect(laidOut).toEqual({ width: 0, height: 0, lines: [] });
  });

  it("places the baseline at the measured ascent with room for descenders", () => {
    const metrics = (_text: string, _font: string): { ascent: number; descent: number } => ({
      ascent: 29,
      descent: 8,
    });
    const laidOut = layoutTextDocument(parseTextDocument("<div>çqpga</div>"), measure, 4096, 4096, metrics);
    expect(laidOut.lines).toHaveLength(1);
    // 29 + 8 = 37 < 32 * 1.2 = 38.4, so the default line height wins.
    expect(laidOut.lines[0]?.height).toBeCloseTo(38.4, 5);
    expect(laidOut.lines[0]?.ascent).toBe(29);
    // Baseline (29) plus descent (8) fits inside the box.
    expect((laidOut.lines[0]?.ascent ?? 0) + 8).toBeLessThanOrEqual(laidOut.lines[0]?.height ?? 0);
  });

  it("grows the line box for descenders deeper than the default height", () => {
    const metrics = (_text: string, _font: string): { ascent: number; descent: number } => ({
      ascent: 30,
      descent: 20,
    });
    const laidOut = layoutTextDocument(parseTextDocument("<div>g</div>"), measure, 4096, 4096, metrics);
    expect(laidOut.lines[0]?.height).toBe(50);
    expect(laidOut.lines[0]?.ascent).toBe(30);
  });

  it("falls back to font-size ratios without measured metrics", () => {
    const laidOut = layoutTextDocument(parseTextDocument("<div>x</div>"), measure);
    expect(laidOut.lines[0]?.ascent).toBeCloseTo(32 * 0.85, 5);
    expect(laidOut.lines[0]?.height).toBeCloseTo(32 * 1.2, 5);
  });
});

describe("text run helpers", () => {
  it("fills defaults and formats canvas fonts", () => {
    expect(defaultTextRun({ text: "x" })).toMatchObject({
      fontFamily: "sans-serif",
      fontSize: 32,
      color: "#000000ff",
    });
    expect(textRunFont({ bold: true, italic: false, fontFamily: "Times New Roman", fontSize: 12 })).toBe(
      'bold 12px "Times New Roman"',
    );
    expect(textRunFont({ bold: false, italic: true, fontFamily: "sans-serif", fontSize: 10 })).toBe("italic 10px sans-serif");
  });
});
