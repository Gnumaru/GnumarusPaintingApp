import { describe, expect, it } from "vitest";
import { eventInTextField, isTextEditingNode, isTextInputType } from "../src/focus/GnumarusFocus";

describe("isTextInputType", () => {
  it("treats text-like inputs as editing targets (native undo wins)", () => {
    for (const type of ["text", "search", "number", "password", "email", "tel", "url", "TEXT", ""]) {
      expect(isTextInputType(type)).toBe(true);
    }
    expect(isTextInputType(null)).toBe(true);
    expect(isTextInputType(undefined)).toBe(true);
  });

  it("never blocks document undo for non-text controls", () => {
    for (const type of [
      "range",
      "checkbox",
      "radio",
      "color",
      "button",
      "submit",
      "reset",
      "file",
      "hidden",
      "image",
      "RANGE",
    ]) {
      expect(isTextInputType(type)).toBe(false);
    }
  });
});

describe("isTextEditingNode", () => {
  it("returns false for non-DOM values (Node test env has no DOM)", () => {
    expect(isTextEditingNode(null)).toBe(false);
    expect(isTextEditingNode(undefined)).toBe(false);
    expect(isTextEditingNode({})).toBe(false);
    expect(isTextEditingNode("input")).toBe(false);
  });
});

describe("eventInTextField", () => {
  it("returns false for plain events without a text target", () => {
    expect(eventInTextField(new Event("keydown"))).toBe(false);
  });
});
