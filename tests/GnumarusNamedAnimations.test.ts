import { describe, expect, it } from "vitest";
import {
  countAnimationFrames,
  mapNamedAnimationFrames,
  nextAnimationStep,
  parseFrameList,
  parseNamedAnimation,
  resolveExportSequence,
  serializeNamedAnimation,
  GnumarusNamedAnimationError,
  type GnumarusNamedAnimation,
} from "../src/animation/GnumarusNamedAnimations";

describe("GnumarusNamedAnimations", () => {
  it("parses a forward animation with a duration override and a range", () => {
    expect(parseNamedAnimation("nome-da-animacao,forward,1:0.4,2-4,7,1", 7)).toEqual({
      name: "nome-da-animacao",
      loop: "forward",
      frames: [
        { frame: 0, duration: 0.4 },
        { frame: 1, duration: null },
        { frame: 2, duration: null },
        { frame: 3, duration: null },
        { frame: 6, duration: null },
        { frame: 0, duration: null },
      ],
    });
  });

  it("parses a ping-pong animation with a ranged duration override", () => {
    expect(parseNamedAnimation("nome-da-outra,ping-pong,1,2:0.2,3", 3)).toEqual({
      name: "nome-da-outra",
      loop: "ping-pong",
      frames: [
        { frame: 0, duration: null },
        { frame: 1, duration: 0.2 },
        { frame: 2, duration: null },
      ],
    });
  });

  it("applies a range duration override to every frame of the range", () => {
    expect(parseNamedAnimation("run,forward,2-4:0.15", 5)).toEqual({
      name: "run",
      loop: "forward",
      frames: [
        { frame: 1, duration: 0.15 },
        { frame: 2, duration: 0.15 },
        { frame: 3, duration: 0.15 },
      ],
    });
  });

  it("tolerates whitespace and loop casing", () => {
    expect(parseNamedAnimation("  walk , Forward , 1 , 2-3 ", 3)).toEqual({
      name: "walk",
      loop: "forward",
      frames: [
        { frame: 0, duration: null },
        { frame: 1, duration: null },
        { frame: 2, duration: null },
      ],
    });
  });

  it("rejects malformed definitions", () => {
    expect(() => parseNamedAnimation("", 4)).toThrow(GnumarusNamedAnimationError);
    expect(() => parseNamedAnimation("walk,forward", 4)).toThrow(GnumarusNamedAnimationError);
    expect(() => parseNamedAnimation(",forward,1", 4)).toThrow(GnumarusNamedAnimationError);
    expect(() => parseNamedAnimation("walk,sidestep,1", 4)).toThrow(/none, forward or ping-pong/);
    expect(() => parseNamedAnimation("walk,forward,0", 4)).toThrow(GnumarusNamedAnimationError);
    expect(() => parseNamedAnimation("walk,forward,5", 4)).toThrow(/does not exist/);
    expect(() => parseNamedAnimation("walk,forward,4-2", 4)).toThrow(/before its start/);
    expect(() => parseNamedAnimation("walk,forward,1.5", 4)).toThrow(/Invalid frame entry/);
    expect(() => parseNamedAnimation("walk,forward,abc", 4)).toThrow(/Invalid frame entry/);
    expect(() => parseNamedAnimation("walk,forward,", 4)).toThrow(/Invalid frame entry/);
    expect(() => parseNamedAnimation("walk,forward,1:0", 4)).toThrow(GnumarusNamedAnimationError);
    expect(() => parseNamedAnimation("walk,forward,1:abc", 4)).toThrow(/Invalid frame entry/);
    expect(() => parseNamedAnimation("walk,forward,1:-2", 4)).toThrow(/Invalid frame entry/);
    expect(() => parseNamedAnimation("walk,forward,1:1.2.3", 4)).toThrow(/Invalid frame entry/);
    expect(parseNamedAnimation("walk,forward,1:2", 4).frames[0]).toEqual({ frame: 0, duration: 2 });
    expect(parseNamedAnimation("walk,forward,1:0.125", 4).frames[0]).toEqual({ frame: 0, duration: 0.125 });
  });

  it("clamps huge durations to the project maximum", () => {
    expect(parseNamedAnimation("walk,forward,1:999999", 2)).toEqual({
      name: "walk",
      loop: "forward",
      frames: [{ frame: 0, duration: 60 }],
    });
    expect(parseNamedAnimation("walk,forward,1:0.00001", 2)).toEqual({
      name: "walk",
      loop: "forward",
      frames: [{ frame: 0, duration: 0.001 }],
    });
  });

  it("serializes back with collapsed ranges", () => {
    expect(serializeNamedAnimation(parseNamedAnimation("nome-da-animacao,forward,1:0.4,2-4,7,1", 7))).toBe(
      "nome-da-animacao,forward,1:0.4,2-4,7,1",
    );
    expect(serializeNamedAnimation(parseNamedAnimation("run,ping-pong,1,2:0.2,3", 3))).toBe(
      "run,ping-pong,1,2:0.2,3",
    );
    const single: GnumarusNamedAnimation = { name: "idle", loop: "none", frames: [{ frame: 2, duration: null }] };
    expect(serializeNamedAnimation(single)).toBe("idle,none,3");
    expect(parseNamedAnimation(serializeNamedAnimation(single), 5)).toEqual(single);
  });

  it("steps forward and stops a none animation at the end", () => {
    const anim: GnumarusNamedAnimation = {
      name: "once",
      loop: "none",
      frames: [
        { frame: 0, duration: null },
        { frame: 2, duration: null },
      ],
    };
    expect(nextAnimationStep(anim, 0, 1)).toEqual({ index: 1, direction: 1 });
    expect(nextAnimationStep(anim, 1, 1)).toBeNull();
    expect(nextAnimationStep(anim, 5, 1)).toBeNull();
  });

  it("wraps a forward animation around both ends", () => {
    const anim: GnumarusNamedAnimation = {
      name: "walk",
      loop: "forward",
      frames: [
        { frame: 2, duration: null },
        { frame: 0, duration: null },
      ],
    };
    expect(nextAnimationStep(anim, 0, 1)).toEqual({ index: 1, direction: 1 });
    expect(nextAnimationStep(anim, 1, 1)).toEqual({ index: 0, direction: 1 });
    expect(nextAnimationStep(anim, 0, -1)).toEqual({ index: 1, direction: -1 });
  });

  it("bounces a ping-pong animation without repeating endpoints", () => {
    const anim: GnumarusNamedAnimation = {
      name: "boing",
      loop: "ping-pong",
      frames: [
        { frame: 0, duration: null },
        { frame: 1, duration: null },
        { frame: 2, duration: null },
      ],
    };
    expect(nextAnimationStep(anim, 0, 1)).toEqual({ index: 1, direction: 1 });
    expect(nextAnimationStep(anim, 1, 1)).toEqual({ index: 2, direction: 1 });
    expect(nextAnimationStep(anim, 2, 1)).toEqual({ index: 1, direction: -1 });
    expect(nextAnimationStep(anim, 1, -1)).toEqual({ index: 0, direction: -1 });
    expect(nextAnimationStep(anim, 0, -1)).toEqual({ index: 1, direction: 1 });
  });

  it("holds single-frame animations instead of stopping loops", () => {
    const single: GnumarusNamedAnimation = {
      name: "idle",
      loop: "forward",
      frames: [{ frame: 1, duration: null }],
    };
    expect(nextAnimationStep(single, 0, 1)).toEqual({ index: 0, direction: 1 });
    expect(nextAnimationStep({ ...single, loop: "none" }, 0, 1)).toBeNull();
    expect(nextAnimationStep({ ...single, loop: "ping-pong" }, 0, -1)).toEqual({ index: 0, direction: 1 });
    expect(nextAnimationStep({ ...single, frames: [] }, 0, 1)).toBeNull();
  });

  it("remaps referenced frames for structural edits", () => {
    const anims: GnumarusNamedAnimation[] = [
      {
        name: "walk",
        loop: "forward",
        frames: [
          { frame: 0, duration: null },
          { frame: 2, duration: 100 },
        ],
      },
    ];
    // Insert at 1: references at/after shift up.
    expect(mapNamedAnimationFrames(anims, (frame) => (frame >= 1 ? frame + 1 : frame))).toEqual([
      {
        name: "walk",
        loop: "forward",
        frames: [
          { frame: 0, duration: null },
          { frame: 3, duration: 100 },
        ],
      },
    ]);
    // Remove frame 0: its entry drops, later ones shift down.
    expect(
      mapNamedAnimationFrames(anims, (frame) => (frame === 0 ? null : frame > 0 ? frame - 1 : frame)),
    ).toEqual([
      {
        name: "walk",
        loop: "forward",
        frames: [{ frame: 1, duration: 100 }],
      },
    ]);
    // Swap frames 0 and 2.
    expect(
      mapNamedAnimationFrames(anims, (frame) => (frame === 0 ? 2 : frame === 2 ? 0 : frame)),
    ).toEqual([
      {
        name: "walk",
        loop: "forward",
        frames: [
          { frame: 2, duration: null },
          { frame: 0, duration: 100 },
        ],
      },
    ]);
  });

  it("resolves one export cycle per loop mode", () => {
    const forward: GnumarusNamedAnimation = {
      name: "walk",
      loop: "forward",
      frames: [
        { frame: 2, duration: null },
        { frame: 0, duration: 400 },
      ],
    };
    expect(resolveExportSequence(forward)).toEqual([
      { frame: 2, duration: null },
      { frame: 0, duration: 400 },
    ]);
    const once: GnumarusNamedAnimation = {
      name: "once",
      loop: "none",
      frames: [
        { frame: 0, duration: null },
        { frame: 1, duration: null },
      ],
    };
    expect(resolveExportSequence(once)).toEqual([
      { frame: 0, duration: null },
      { frame: 1, duration: null },
    ]);
    const boing: GnumarusNamedAnimation = {
      name: "boing",
      loop: "ping-pong",
      frames: [
        { frame: 0, duration: null },
        { frame: 1, duration: null },
        { frame: 2, duration: null },
      ],
    };
    expect(resolveExportSequence(boing)).toEqual([
      { frame: 0, duration: null },
      { frame: 1, duration: null },
      { frame: 2, duration: null },
      { frame: 1, duration: null },
      { frame: 0, duration: null },
    ]);
    const single: GnumarusNamedAnimation = {
      name: "idle",
      loop: "forward",
      frames: [{ frame: 1, duration: 50 }],
    };
    expect(resolveExportSequence(single)).toEqual([{ frame: 1, duration: 50 }]);
    const empty: GnumarusNamedAnimation = { name: "empty", loop: "forward", frames: [] };
    expect(resolveExportSequence(empty)).toEqual([]);
  });

  it("parses bare frame lists with ranges", () => {
    expect(parseFrameList("1,3-5,7", 7)).toEqual([0, 2, 3, 4, 6]);
    expect(parseFrameList(" 2-2 ", 3)).toEqual([1]);
    expect(parseFrameList("3,1", 3)).toEqual([2, 0]);
    expect(() => parseFrameList("", 3)).toThrow(/empty/);
    expect(parseFrameList("1,,2", 3)).toEqual([0, 1]);
    expect(() => parseFrameList("0", 3)).toThrow(GnumarusNamedAnimationError);
    expect(() => parseFrameList("4", 3)).toThrow(/does not exist/);
    expect(() => parseFrameList("3-1", 3)).toThrow(/before its start/);
    expect(() => parseFrameList("2:100", 3)).toThrow(/Invalid frame entry/);
    expect(() => parseFrameList("abc", 3)).toThrow(/Invalid frame entry/);
  });

  it("counts how many animations include each frame", () => {
    const walk: GnumarusNamedAnimation = {
      name: "walk",
      loop: "forward",
      frames: [
        { frame: 0, duration: null },
        { frame: 2, duration: null },
      ],
    };
    const run: GnumarusNamedAnimation = {
      name: "run",
      loop: "forward",
      frames: [
        { frame: 2, duration: null },
        { frame: 2, duration: null },
        { frame: 5, duration: 0.5 },
      ],
    };
    expect(countAnimationFrames([])).toEqual(new Map());
    expect(countAnimationFrames([walk, run])).toEqual(
      new Map([
        [0, 1],
        [2, 2],
        [5, 1],
      ]),
    );
  });
});
