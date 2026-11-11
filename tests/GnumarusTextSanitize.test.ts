import { describe, expect, it } from "vitest";
import { sanitizeTextHtml } from "../src/text/GnumarusTextSanitize";

describe("sanitizeTextHtml", () => {
  it("passes plain text through a single div", () => {
    expect(sanitizeTextHtml("Hello")).toBe("<div>Hello</div>");
    expect(sanitizeTextHtml("")).toBe("");
    expect(sanitizeTextHtml("   ")).toBe("");
  });

  it("keeps the canonical nesting order b > i > u > span", () => {
    expect(sanitizeTextHtml("<i><b>hi</b></i>")).toBe("<div><b><i>hi</i></b></div>");
    expect(sanitizeTextHtml("<span style=\"color: red\"><b>x</b></span>")).toBe(
      '<div><b><span style="color:#ff0000ff">x</span></b></div>',
    );
  });

  it("normalizes colors, sizes and families", () => {
    expect(sanitizeTextHtml('<span style="color:#f00">x</span>')).toBe(
      '<div><span style="color:#ff0000ff">x</span></div>',
    );
    expect(sanitizeTextHtml('<span style="color: rgb(0, 0, 255)">x</span>')).toBe(
      '<div><span style="color:#0000ffff">x</span></div>',
    );
    expect(sanitizeTextHtml('<span style="font-size: 12pt">x</span>')).toBe(
      '<div><span style="font-size:16px">x</span></div>',
    );
    // Unknown colors and families are dropped, keeping the text.
    expect(sanitizeTextHtml('<span style="color: whatever; font-family: Nope">x</span>')).toBe("<div>x</div>");
    expect(sanitizeTextHtml('<font color="red" face="bogus" size="5">x</font>')).toBe(
      '<div><span style="font-size:16px;color:#ff0000ff">x</span></div>',
    );
  });

  it("clamps font sizes", () => {
    expect(sanitizeTextHtml('<span style="font-size: 2000px">x</span>')).toContain("font-size:500px");
    expect(sanitizeTextHtml('<span style="font-size: 1px">x</span>')).toContain("font-size:6px");
  });

  it("drops scripts, styles and comments with their subtree", () => {
    expect(sanitizeTextHtml('a<script>evil()</script>b')).toBe("<div>ab</div>");
    expect(sanitizeTextHtml('a<style>.x{}</style>b')).toBe("<div>ab</div>");
    expect(sanitizeTextHtml("a<!-- note -->b")).toBe("<div>ab</div>");
  });

  it("unwraps unknown elements but keeps their text", () => {
    expect(sanitizeTextHtml('<a href="http://x">link</a> and <code>c</code>')).toBe("<div>link and c</div>");
  });

  it("splits blocks and keeps alignment", () => {
    expect(sanitizeTextHtml("<div>a</div><div>b</div>")).toBe("<div>a</div><div>b</div>");
    expect(sanitizeTextHtml('<div style="text-align: center">a</div>')).toBe('<div style="text-align:center">a</div>');
    expect(sanitizeTextHtml('<p align="right">a</p>')).toBe('<div style="text-align:right">a</div>');
    expect(sanitizeTextHtml("a<br>b")).toBe("<div>a</div><div>b</div>");
    expect(sanitizeTextHtml("a<br><br>b")).toBe("<div>a</div><div><br></div><div>b</div>");
    expect(sanitizeTextHtml("<div><br></div>")).toBe("");
  });

  it("collapses whitespace but preserves words", () => {
    expect(sanitizeTextHtml("a   b\tc")).toBe("<div>a b c</div>");
    expect(sanitizeTextHtml("a &amp; b &lt;x&gt;")).toBe("<div>a &amp; b &lt;x&gt;</div>");
  });

  it("is idempotent on its own output", () => {
    const samples = [
      "<div>Hello <b>bold <i>and italic</i></b></div><div><br></div><div>tail</div>",
      '<div style="text-align:center">x<span style="font-family:Georgia,serif;font-size:24px;color:#12345678">y</span></div>',
      "plain",
    ];
    for (const sample of samples) {
      const once = sanitizeTextHtml(sample);
      expect(sanitizeTextHtml(once)).toBe(once);
    }
  });

  it("neutralizes hostile markup", () => {
    expect(sanitizeTextHtml('<img src=x onerror=alert(1)>')).toBe("");
    expect(sanitizeTextHtml('<span style="color: red; position: absolute; background: url(evil)">x</span>')).toBe(
      '<div><span style="color:#ff0000ff">x</span></div>',
    );
    expect(sanitizeTextHtml("<div onclick=alert(1)>x</div>")).toBe("<div>x</div>");
  });
});
