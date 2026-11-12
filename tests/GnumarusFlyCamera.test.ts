import { describe, expect, it } from "vitest";
import {
  FLY_LOOK_DEG_PER_PX,
  FLY_MAX_PITCH_DEG,
  FLY_MOVE_STEP,
  FLY_ORBIT_STEP_DEG,
  FLY_PIVOT_DISTANCE,
  flyForward,
  flyOrbitPose,
  flyPoseFromDirection,
  flyRight,
  type GnumarusFlyPose,
} from "../src/canvas/GnumarusFlyCamera";

function closeTo(actual: readonly [number, number, number], expected: readonly [number, number, number]): void {
  expect(actual[0]).toBeCloseTo(expected[0], 3);
  expect(actual[1]).toBeCloseTo(expected[1], 3);
  expect(actual[2]).toBeCloseTo(expected[2], 3);
}

describe("GnumarusFlyCamera", () => {
  it("exposes sane tuning constants", () => {
    expect(FLY_ORBIT_STEP_DEG).toBe(5);
    expect(FLY_LOOK_DEG_PER_PX).toBe(0.2);
    expect(FLY_MOVE_STEP).toBe(0.25);
    expect(FLY_PIVOT_DISTANCE).toBe(5);
    expect(FLY_MAX_PITCH_DEG).toBe(89);
  });

  it("points forward down -Z at zero yaw and pitch", () => {
    closeTo(flyForward(0, 0), [0, 0, -1]);
    closeTo(flyForward(90, 0), [-1, 0, 0]);
    closeTo(flyForward(-90, 0), [1, 0, 0]);
    closeTo(flyForward(0, 89), [0, -Math.sin((89 * Math.PI) / 180), -Math.cos((89 * Math.PI) / 180)]);
    closeTo(flyForward(0, -89), [0, Math.sin((89 * Math.PI) / 180), -Math.cos((89 * Math.PI) / 180)]);
  });

  it("derives a horizontal right vector, with a fallback when looking straight up", () => {
    closeTo(flyRight([0, 0, -1]), [1, 0, 0]);
    closeTo(flyRight([-1, 0, 0]), [0, 0, -1]);
    closeTo(flyRight([0, -1, 0]), [1, 0, 0]);
  });

  it("round-trips the default 3/4 view through pose and back", () => {
    const az = (39.8 * Math.PI) / 180;
    const el = (24.1 * Math.PI) / 180;
    const direction: [number, number, number] = [
      Math.sin(az) * Math.cos(el),
      Math.sin(el),
      Math.cos(az) * Math.cos(el),
    ];
    const pose = flyPoseFromDirection(direction, 3.43, [0, 0, 0]);
    expect(pose.yawDeg).toBeCloseTo(39.8, 9);
    expect(pose.pitchDeg).toBeCloseTo(24.1, 9);
    expect(pose.x).toBeCloseTo(direction[0] * 3.43, 9);
    expect(pose.y).toBeCloseTo(direction[1] * 3.43, 9);
    expect(pose.z).toBeCloseTo(direction[2] * 3.43, 9);
  });

  it("orbits left and right around a point 5 units ahead", () => {
    const start: GnumarusFlyPose = { yawDeg: 39.8, pitchDeg: 24.1, x: 1, y: 1, z: 3 };
    const forward = flyForward(start.yawDeg, start.pitchDeg);
    const pivot: [number, number, number] = [
      start.x + forward[0] * 5,
      start.y + forward[1] * 5,
      start.z + forward[2] * 5,
    ];
    const left = flyOrbitPose(start, 1);
    expect(left.yawDeg).toBeCloseTo(44.8, 9);
    expect(left.pitchDeg).toBeCloseTo(start.pitchDeg, 9);
    const moved = Math.hypot(left.x - pivot[0], left.y - pivot[1], left.z - pivot[2]);
    expect(moved).toBeCloseTo(5, 6);
    const right = flyOrbitPose(start, -1);
    expect(right.yawDeg).toBeCloseTo(34.8, 9);
    const back = flyOrbitPose(right, 1);
    expect(back.yawDeg).toBeCloseTo(start.yawDeg, 9);
    expect(back.x).toBeCloseTo(start.x, 9);
    expect(back.y).toBeCloseTo(start.y, 9);
    expect(back.z).toBeCloseTo(start.z, 9);
  });
});
