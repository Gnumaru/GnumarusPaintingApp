import { describe, expect, it } from "vitest";
import {
  GNUMARUS_DEFAULT_FOLLOW_STRENGTH,
  GNUMARUS_DEFAULT_ROPE_LENGTH,
  GNUMARUS_DEFAULT_STABILIZER_MODE,
  clampFollowStrength,
  clampRopeLength,
  parseStabilizerMode,
  stabilizerDistance,
  stabilizerFollowStep,
  stabilizerRopeStep,
} from "../src/canvas/GnumarusStabilizer";

describe("parseStabilizerMode", () => {
  it("accepts none, rope and follow, defaulting to none", () => {
    expect(parseStabilizerMode("none")).toBe("none");
    expect(parseStabilizerMode("rope")).toBe("rope");
    expect(parseStabilizerMode("follow")).toBe("follow");
    expect(parseStabilizerMode("ROPE")).toBe("rope");
    expect(parseStabilizerMode("unknown")).toBe("none");
    expect(parseStabilizerMode(undefined)).toBe("none");
    expect(GNUMARUS_DEFAULT_STABILIZER_MODE).toBe("none");
  });
});

describe("clampRopeLength", () => {
  it("clamps to 1..200 with default fallback", () => {
    expect(clampRopeLength(20)).toBe(20);
    expect(clampRopeLength(0)).toBe(1);
    expect(clampRopeLength(500)).toBe(200);
    expect(clampRopeLength(Number.NaN)).toBe(GNUMARUS_DEFAULT_ROPE_LENGTH);
    expect(GNUMARUS_DEFAULT_ROPE_LENGTH).toBe(20);
  });
});

describe("clampFollowStrength", () => {
  it("clamps typed 1..100 with default fallback (used as typed / 100)", () => {
    expect(clampFollowStrength(20)).toBeCloseTo(20, 10);
    expect(clampFollowStrength(0)).toBeCloseTo(1, 10);
    expect(clampFollowStrength(500)).toBeCloseTo(100, 10);
    expect(clampFollowStrength(Number.NaN)).toBeCloseTo(GNUMARUS_DEFAULT_FOLLOW_STRENGTH, 10);
  });
});

describe("stabilizerRopeStep", () => {
  it("stays put while the cursor is within the rope", () => {
    const current = { x: 10, y: 10 };
    expect(stabilizerRopeStep(current, { x: 12, y: 10 }, 20)).toEqual({ x: 10, y: 10 });
    expect(stabilizerRopeStep(current, { x: 10, y: 10 }, 20)).toEqual({ x: 10, y: 10 });
  });

  it("drags the focus so the distance stays equal to the rope", () => {
    const next = stabilizerRopeStep({ x: 0, y: 0 }, { x: 30, y: 0 }, 20);
    expect(next.x).toBeCloseTo(10, 10);
    expect(next.y).toBeCloseTo(0, 10);
    expect(stabilizerDistance(next, { x: 30, y: 0 })).toBeCloseTo(20, 10);
  });

  it("pulls diagonally preserving direction", () => {
    const next = stabilizerRopeStep({ x: 0, y: 0 }, { x: 3, y: 4 }, 0 + 1);
    // Distance 5 with rope 1 keeps 4 units of travel toward the target.
    expect(next.x).toBeCloseTo(2.4, 10);
    expect(next.y).toBeCloseTo(3.2, 10);
  });

  it("treats zero-length rope as instant snap via clamping", () => {
    const next = stabilizerRopeStep({ x: 0, y: 0 }, { x: 5, y: 0 }, 0);
    // Clamped to rope 1, so the focus stops 1px before the target.
    expect(next.x).toBeCloseTo(4, 10);
  });
});

describe("stabilizerFollowStep", () => {
  it("snaps instantly at typed 100 (= 1.0) and crawls at typed 1 (= 0.01)", () => {
    expect(stabilizerFollowStep({ x: 0, y: 0 }, { x: 10, y: 4 }, 100)).toEqual({ x: 10, y: 4 });
    const slow = stabilizerFollowStep({ x: 0, y: 0 }, { x: 10, y: 0 }, 1);
    expect(slow.x).toBeCloseTo(0.1, 10);
  });

  it("moves proportionally to strength and distance (farther is faster)", () => {
    const near = stabilizerFollowStep({ x: 0, y: 0 }, { x: 10, y: 0 }, 20);
    const far = stabilizerFollowStep({ x: 0, y: 0 }, { x: 20, y: 0 }, 20);
    expect(near.x).toBeCloseTo(2, 10);
    expect(far.x).toBeCloseTo(4, 10);
    const weak = stabilizerFollowStep({ x: 0, y: 0 }, { x: 10, y: 0 }, 10);
    expect(weak.x).toBeCloseTo(1, 10);
  });

  it("maps typed 5 to 0.05 of the gap", () => {
    const step = stabilizerFollowStep({ x: 0, y: 0 }, { x: 100, y: 0 }, 5);
    expect(step.x).toBeCloseTo(5, 10);
  });

  it("converges toward the target over repeated steps", () => {
    let pos = { x: 0, y: 0 };
    const target = { x: 100, y: 0 };
    for (let i = 0; i < 50; i += 1) {
      pos = stabilizerFollowStep(pos, target, 20);
    }
    expect(pos.x).toBeGreaterThan(99);
    expect(pos.x).toBeLessThanOrEqual(100);
  });
});
