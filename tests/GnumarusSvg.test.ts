import { describe, expect, it } from "vitest";
import {
  detectUnsupportedSvgFeatures,
  looksLikeSvg,
  parseSvgDimensions,
  sanitizeSvg,
  withSvgSize,
} from "../src/vector/GnumarusSvg";

describe("GnumarusSvg", () => {
  it("parses intrinsic dimensions from attributes, viewBox or defaults", () => {
    expect(parseSvgDimensions('<svg width="100" height="50"></svg>')).toEqual({ width: 100, height: 50 });
    expect(parseSvgDimensions('<svg width="100px" height="50pt"></svg>')).toEqual({ width: 100, height: 50 });
    expect(parseSvgDimensions('<svg viewBox="0 0 200 100"></svg>')).toEqual({ width: 200, height: 100 });
    expect(parseSvgDimensions('<svg viewBox="10,20,300,150"></svg>')).toEqual({ width: 300, height: 150 });
    expect(parseSvgDimensions('<svg width="64"></svg>')).toEqual({ width: 64, height: 64 });
    expect(parseSvgDimensions("<svg></svg>")).toEqual({ width: 256, height: 256 });
    expect(parseSvgDimensions("<svg width=\"10000\" height=\"10000\"></svg>")).toEqual({
      width: 4096,
      height: 4096,
    });
    expect(parseSvgDimensions("not svg")).toBeNull();
    expect(parseSvgDimensions('<svg width="0" height="-5"></svg>')).toEqual({ width: 256, height: 256 });
  });

  it("injects an explicit size only when missing", () => {
    expect(withSvgSize("<svg></svg>", 100, 50)).toBe('<svg width="100" height="50"></svg>');
    expect(withSvgSize('<svg width="10" height="10"></svg>', 100, 50)).toBe(
      '<svg width="10" height="10"></svg>',
    );
    expect(withSvgSize("nope", 100, 50)).toBe("nope");
  });

  it("detects unsupported features", () => {
    expect(detectUnsupportedSvgFeatures("<svg><rect/></svg>")).toEqual([]);
    expect(
      detectUnsupportedSvgFeatures('<svg><filter id="f"/><rect filter="url(#f)"/></svg>'),
    ).toEqual(["filters"]);
    expect(
      detectUnsupportedSvgFeatures('<svg><path inkscape:original-d="M0 0"/><inkscape:path-effect/></svg>'),
    ).toEqual(["path effects"]);
    expect(detectUnsupportedSvgFeatures("<svg><foreignObject/></svg>")).toEqual(["foreign objects"]);
    expect(detectUnsupportedSvgFeatures('<svg><script>alert(1)</script></svg>')).toEqual(["scripts"]);
    expect(detectUnsupportedSvgFeatures('<svg><circle><animate attributeName="r"/></circle></svg>')).toEqual([
      "animations",
    ]);
    expect(detectUnsupportedSvgFeatures('<svg><image href="https://x/y.png"/></svg>')).toEqual([
      "external references",
    ]);
    expect(detectUnsupportedSvgFeatures('<svg><image href="data:image/png;base64,x"/></svg>')).toEqual([]);
    expect(
      detectUnsupportedSvgFeatures(
        '<svg><filter/><foreignObject/><script>x</script><animate/></svg>',
      ),
    ).toEqual(["animations", "filters", "foreign objects", "scripts"]);
  });

  it("strips scripts and event handlers", () => {
    expect(sanitizeSvg('<svg><script>alert(1)</script><rect onclick="x"/></svg>')).toBe(
      "<svg><rect/></svg>",
    );
    expect(sanitizeSvg("<svg><SCRIPT SRC=x /></svg>")).toBe("<svg></svg>");
  });

  it("recognizes svg documents", () => {
    expect(looksLikeSvg('<svg xmlns="http://www.w3.org/2000/svg"></svg>')).toBe(true);
    expect(looksLikeSvg("<html></html>")).toBe(false);
  });
});
