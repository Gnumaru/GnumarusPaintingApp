import { describe, expect, it } from "vitest";
import {
  parseSliderNumber,
  resolveSliderBounds,
  roundToStep,
  stepNumberValue,
} from "../src/settings/GnumarusNumberSlider";

describe("parseSliderNumber", () => {
  it("parses finite numbers and rejects the rest", () => {
    expect(parseSliderNumber("12")).toBe(12);
    expect(parseSliderNumber(" 0.5 ")).toBe(0.5);
    expect(parseSliderNumber("-3")).toBe(-3);
    expect(parseSliderNumber("")).toBeNull();
    expect(parseSliderNumber("   ")).toBeNull();
    expect(parseSliderNumber("abc")).toBeNull();
    expect(parseSliderNumber("Infinity")).toBeNull();
    expect(parseSliderNumber(null)).toBeNull();
    expect(parseSliderNumber(undefined)).toBeNull();
  });
});

describe("resolveSliderBounds", () => {
  it("uses the attributes when valid", () => {
    expect(resolveSliderBounds("1", "64", "0.1", 8)).toEqual({ min: 1, max: 64, step: 0.1 });
  });

  it("falls back around the value when attributes are missing", () => {
    expect(resolveSliderBounds(null, null, null, 8)).toEqual({ min: -92, max: 108, step: 1 });
    expect(resolveSliderBounds(null, null, null, 0.5)).toEqual({
      min: -99.5,
      max: 100.5,
      step: 2,
    });
    expect(resolveSliderBounds(null, null, null, Number.NaN)).toEqual({ min: 0, max: 100, step: 1 });
  });

  it("repairs degenerate and non-positive ranges", () => {
    expect(resolveSliderBounds("5", "5", null, 5)).toEqual({ min: 5, max: 6, step: 1 });
    expect(resolveSliderBounds("9", "2", null, 9)).toEqual({ min: 9, max: 10, step: 1 });
    expect(resolveSliderBounds("0", "10", "0", 5)).toEqual({ min: 0, max: 10, step: 1 });
    expect(resolveSliderBounds("0", "10", "-2", 5)).toEqual({ min: 0, max: 10, step: 1 });
  });
});

describe("roundToStep", () => {
  it("rounds to whole steps with step precision", () => {
    expect(roundToStep(0.25, 0.1)).toBe(0.3);
    expect(roundToStep(2.5, 1)).toBe(3);
    expect(roundToStep(2.4, 1)).toBe(2);
    expect(roundToStep(0.375, 0.125)).toBe(0.375);
    expect(roundToStep(0.4, 0.125)).toBe(0.375);
  });

  it("passes through invalid steps and non-finite values", () => {
    expect(roundToStep(1.234, 0)).toBe(1.234);
    expect(roundToStep(Number.NaN, 1)).toBe(0);
  });
});

describe("stepNumberValue", () => {
  it("steps by tens clamped to min/max", () => {
    expect(stepNumberValue("1", "1", "64", 10)).toBe("11");
    expect(stepNumberValue("60", "1", "64", 10)).toBe("64");
    expect(stepNumberValue("5", "1", "64", -10)).toBe("1");
    expect(stepNumberValue("0.5", null, null, 10)).toBe("10.5");
    expect(stepNumberValue("3", null, "10", 10)).toBe("10");
  });

  it("rejects non-numeric input", () => {
    expect(stepNumberValue("", "1", "64", 10)).toBeNull();
    expect(stepNumberValue("abc", null, null, -10)).toBeNull();
  });
});
