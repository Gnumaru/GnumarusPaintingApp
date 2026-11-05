import { describe, expect, it } from "vitest";
import {
  areAllChannelsUnlocked,
  clearPixelBuffer,
  compositeOver,
  compositePixelOver,
  createPixelBuffer,
  drawPixelLine,
  getPixel,
  parseChannelLock,
  setPixel,
} from "../src/canvas/GnumarusPixelBuffer";
import {
  createDefaultProject,
  parseProject,
  serializeProject,
} from "../src/project/GnumarusProjectFormat";

describe("GnumarusChannelLock", () => {
  it("parses locks with backward-compatible defaults", () => {
    expect(parseChannelLock(undefined)).toEqual({ r: false, g: false, b: false, a: false });
    expect(parseChannelLock(null)).toEqual({ r: false, g: false, b: false, a: false });
    expect(parseChannelLock({})).toEqual({ r: false, g: false, b: false, a: false });
    expect(parseChannelLock({ r: true, g: false, b: true, a: false })).toEqual({
      r: true,
      g: false,
      b: true,
      a: false,
    });
    expect(parseChannelLock({ r: 1, g: "yes", b: 0, a: true })).toEqual({
      r: false,
      g: false,
      b: false,
      a: true,
    });
    expect(areAllChannelsUnlocked({ r: false, g: false, b: false, a: false })).toBe(true);
    expect(areAllChannelsUnlocked({ r: true, g: false, b: false, a: false })).toBe(false);
  });

  it("locks alpha while painting normally on other channels", () => {
    const buffer = createPixelBuffer(2, 2);
    setPixel(buffer, 2, 2, 0, 0, { r: 10, g: 20, b: 30, a: 40 });
    setPixel(buffer, 2, 2, 0, 0, { r: 200, g: 210, b: 220, a: 255 }, { r: false, g: false, b: false, a: true });
    expect(getPixel(buffer, 2, 2, 0, 0)).toEqual({ r: 200, g: 210, b: 220, a: 40 });
  });

  it("locks green so cyan paint yields blue", () => {
    const buffer = createPixelBuffer(2, 2);
    setPixel(buffer, 2, 2, 0, 0, { r: 0, g: 0, b: 0, a: 0 });
    const cyan = { r: 0, g: 255, b: 255, a: 255 };
    setPixel(buffer, 2, 2, 0, 0, cyan, { r: false, g: true, b: false, a: false });
    expect(getPixel(buffer, 2, 2, 0, 0)).toEqual({ r: 0, g: 0, b: 255, a: 255 });
  });

  it("supports any combination of locked channels", () => {
    const buffer = createPixelBuffer(1, 1);
    setPixel(buffer, 1, 1, 0, 0, { r: 1, g: 2, b: 3, a: 4 });
    setPixel(
      buffer,
      1,
      1,
      0,
      0,
      { r: 100, g: 110, b: 120, a: 130 },
      { r: true, g: false, b: true, a: false },
      "copy",
    );
    expect(getPixel(buffer, 1, 1, 0, 0)).toEqual({ r: 1, g: 110, b: 3, a: 130 });

    const fullLock = createPixelBuffer(1, 1);
    setPixel(fullLock, 1, 1, 0, 0, { r: 5, g: 6, b: 7, a: 8 });
    const ok = setPixel(
      fullLock,
      1,
      1,
      0,
      0,
      { r: 255, g: 255, b: 255, a: 255 },
      { r: true, g: true, b: true, a: true },
    );
    expect(ok).toBe(true);
    expect(getPixel(fullLock, 1, 1, 0, 0)).toEqual({ r: 5, g: 6, b: 7, a: 8 });

    expect(setPixel(buffer, 1, 1, -1, 0, { r: 0, g: 0, b: 0, a: 0 }, { r: true, g: true, b: true, a: false })).toBe(
      false,
    );
  });

  it("masks Bresenham lines", () => {
    const buffer = createPixelBuffer(4, 1);
    drawPixelLine(buffer, 4, 1, 0, 0, 3, 0, { r: 255, g: 0, b: 0, a: 255 }, { r: true, g: false, b: false, a: false });
    for (let x = 0; x < 4; x += 1) {
      expect(getPixel(buffer, 4, 1, x, 0)).toEqual({ r: 0, g: 0, b: 0, a: 255 });
    }
  });

  it("masks clear", () => {
    const buffer = createPixelBuffer(1, 1);
    setPixel(buffer, 1, 1, 0, 0, { r: 10, g: 20, b: 30, a: 40 });
    clearPixelBuffer(buffer, { r: false, g: true, b: false, a: true });
    expect(getPixel(buffer, 1, 1, 0, 0)).toEqual({ r: 0, g: 20, b: 0, a: 40 });
    clearPixelBuffer(buffer);
    expect(getPixel(buffer, 1, 1, 0, 0)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  });

  it("masks merge composites on the destination lock", () => {
    const dst = createPixelBuffer(1, 1);
    setPixel(dst, 1, 1, 0, 0, { r: 0, g: 0, b: 255, a: 100 });
    const src = createPixelBuffer(1, 1);
    setPixel(src, 1, 1, 0, 0, { r: 255, g: 0, b: 0, a: 255 });
    compositePixelOver(dst, 0, src, 0, 1, { r: false, g: false, b: false, a: false });
    expect(getPixel(dst, 1, 1, 0, 0)).toEqual({ r: 255, g: 0, b: 0, a: 255 });

    const dstAlphaLock = createPixelBuffer(1, 1);
    setPixel(dstAlphaLock, 1, 1, 0, 0, { r: 0, g: 0, b: 255, a: 100 });
    compositePixelOver(dstAlphaLock, 0, src, 0, 1, { r: false, g: false, b: false, a: true });
    const alphaLocked = getPixel(dstAlphaLock, 1, 1, 0, 0);
    expect(alphaLocked).toEqual({ r: 255, g: 0, b: 0, a: 100 });

    const dstRgbLock = createPixelBuffer(1, 1);
    setPixel(dstRgbLock, 1, 1, 0, 0, { r: 10, g: 20, b: 30, a: 40 });
    compositeOver(dstRgbLock, src, 1, 1, 1, { r: true, g: true, b: true, a: false });
    const rgbLocked = getPixel(dstRgbLock, 1, 1, 0, 0);
    expect(rgbLocked?.r).toBe(10);
    expect(rgbLocked?.g).toBe(20);
    expect(rgbLocked?.b).toBe(30);
    expect(rgbLocked?.a).toBe(255);
  });

  it("round-trips locked channels in the project format", () => {
    const project = createDefaultProject(8, 8);
    project.layers[0]!.lockedChannels = { r: true, g: false, b: true, a: false };
    const parsed = parseProject(serializeProject(project));
    expect(parsed.layers[0]!.lockedChannels).toEqual({ r: true, g: false, b: true, a: false });
  });

  it("defaults legacy projects without locks to unlocked", () => {
    const parsed = parseProject(
      JSON.stringify({
        app: "GnumarusPaintingAndAnimationApp",
        version: 1,
        width: 8,
        height: 8,
        layers: [
          {
            id: "layer0",
            name: "Layer 0",
            visible: true,
            opacity: 1,
            width: 8,
            height: 8,
            transform: { x: 0, y: 0, rotation: 0, flipX: false, flipY: false },
            cells: [{ frame: 0, file: "cells/layer0_frame0.png" }],
          },
        ],
      }),
    );
    expect(parsed.layers[0]!.lockedChannels).toEqual({ r: false, g: false, b: false, a: false });
  });
});
