/**
 * Pure fly-camera math for the 3D model flycam tool: yaw/pitch pose math in
 * degrees with y-up coordinates, matching the orbit view convention
 * (forward is -direction(yaw, pitch), so yaw 0 looks down -Z and positive
 * yaw turns left). No DOM or WebGL here so everything stays unit-testable;
 * the engine owns the live pose and feeds it to the offscreen raster.
 */

/** Degrees the camera yaws per orbit keypress. */
export const FLY_ORBIT_STEP_DEG = 5;

/** Degrees the camera turns per pixel of look drag. */
export const FLY_LOOK_DEG_PER_PX = 0.2;

/** World units traveled per fly keypress. */
export const FLY_MOVE_STEP = 0.25;

/** Distance ahead of the camera where the orbit pivot sits. */
export const FLY_PIVOT_DISTANCE = 5;

/** Hard pitch limits in degrees (matches the orbit view clamp). */
export const FLY_MAX_PITCH_DEG = 89;

/** Fly-camera pose: yaw/pitch look angles plus a world position. */
export interface GnumarusFlyPose {
  yawDeg: number;
  pitchDeg: number;
  x: number;
  y: number;
  z: number;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/** Unit forward vector for a yaw/pitch pair (y-up, yaw 0 faces -Z). */
export function flyForward(yawDeg: number, pitchDeg: number): [number, number, number] {
  const yaw = toRadians(yawDeg);
  const pitch = toRadians(pitchDeg);
  return [-Math.sin(yaw) * Math.cos(pitch), -Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)];
}

/** Unit right vector for a forward vector (horizontal, y-up). */
export function flyRight(forward: readonly [number, number, number]): [number, number, number] {
  // cross(forward, up) with up = (0, 1, 0): (-f.z, 0, f.x).
  const right: [number, number, number] = [-forward[2], 0, forward[0]];
  const length = Math.hypot(right[0], right[1], right[2]);
  if (!(length > 1e-6)) {
    return [1, 0, 0];
  }
  return [right[0] / length, right[1] / length, right[2] / length];
}

/** Build a fly pose from a camera direction, distance and look target. */
export function flyPoseFromDirection(
  direction: readonly [number, number, number],
  distance: number,
  target: readonly [number, number, number],
): GnumarusFlyPose {
  const dist = Math.max(0.5, distance);
  const x = direction[0] * dist;
  const y = direction[1] * dist;
  const z = direction[2] * dist;
  const forward: [number, number, number] = [target[0] - x, target[1] - y, target[2] - z];
  const length = Math.hypot(forward[0], forward[1], forward[2]) || 1;
  const nx = forward[0] / length;
  const ny = forward[1] / length;
  const nz = forward[2] / length;
  const pitchDeg = Math.max(-FLY_MAX_PITCH_DEG, Math.min(FLY_MAX_PITCH_DEG, toDegrees(Math.asin(-ny))));
  const yawDeg = toDegrees(Math.atan2(-nx, -nz));
  return { yawDeg, pitchDeg, x, y, z };
}

/** Orbit the pose left (+1) or right (-1) around a point ahead of the camera. */
export function flyOrbitPose(pose: GnumarusFlyPose, direction: 1 | -1): GnumarusFlyPose {
  const forward = flyForward(pose.yawDeg, pose.pitchDeg);
  const pivot: [number, number, number] = [
    pose.x + forward[0] * FLY_PIVOT_DISTANCE,
    pose.y + forward[1] * FLY_PIVOT_DISTANCE,
    pose.z + forward[2] * FLY_PIVOT_DISTANCE,
  ];
  const yawDeg = pose.yawDeg + direction * FLY_ORBIT_STEP_DEG;
  const turned = flyForward(yawDeg, pose.pitchDeg);
  return {
    yawDeg,
    pitchDeg: pose.pitchDeg,
    x: pivot[0] - turned[0] * FLY_PIVOT_DISTANCE,
    y: pivot[1] - turned[1] * FLY_PIVOT_DISTANCE,
    z: pivot[2] - turned[2] * FLY_PIVOT_DISTANCE,
  };
}
