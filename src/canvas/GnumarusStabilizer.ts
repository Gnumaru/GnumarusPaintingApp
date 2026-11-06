export type GnumarusStabilizerMode = "none" | "rope" | "follow";

export interface GnumarusStabilizerPoint {
  x: number;
  y: number;
}

export const GNUMARUS_DEFAULT_STABILIZER_MODE: GnumarusStabilizerMode = "none";
export const GNUMARUS_DEFAULT_ROPE_LENGTH = 20;
export const GNUMARUS_MIN_ROPE_LENGTH = 1;
export const GNUMARUS_MAX_ROPE_LENGTH = 200;
export const GNUMARUS_DEFAULT_FOLLOW_STRENGTH = 0.2;
export const GNUMARUS_MIN_FOLLOW_STRENGTH = 0.01;
export const GNUMARUS_MAX_FOLLOW_STRENGTH = 1;

export function parseStabilizerMode(value: unknown): GnumarusStabilizerMode {
  if (value === "rope" || value === "follow" || value === "none") {
    return value;
  }
  if (typeof value === "string") {
    const lowered = value.trim().toLowerCase();
    if (lowered === "rope" || lowered === "follow" || lowered === "none") {
      return lowered;
    }
  }
  return GNUMARUS_DEFAULT_STABILIZER_MODE;
}

export function clampRopeLength(value: number): number {
  if (!Number.isFinite(value)) {
    return GNUMARUS_DEFAULT_ROPE_LENGTH;
  }
  return Math.min(GNUMARUS_MAX_ROPE_LENGTH, Math.max(GNUMARUS_MIN_ROPE_LENGTH, value));
}

export function clampFollowStrength(value: number): number {
  if (!Number.isFinite(value)) {
    return GNUMARUS_DEFAULT_FOLLOW_STRENGTH;
  }
  return Math.min(GNUMARUS_MAX_FOLLOW_STRENGTH, Math.max(GNUMARUS_MIN_FOLLOW_STRENGTH, value));
}

export function stabilizerDistance(a: GnumarusStabilizerPoint, b: GnumarusStabilizerPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * One rope (leash) step in layer-image space.
 * The paint focus stays put while the cursor is within the rope length.
 * Once the cursor pulls beyond the rope, the focus is dragged so the
 * cursor-focus distance stays exactly equal to the rope length.
 */
export function stabilizerRopeStep(
  current: GnumarusStabilizerPoint,
  target: GnumarusStabilizerPoint,
  ropeLength: number,
): GnumarusStabilizerPoint {
  const rope = clampRopeLength(ropeLength);
  const dx = target.x - current.x;
  const dy = target.y - current.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (!(dist > 0) || dist <= rope) {
    return { x: current.x, y: current.y };
  }
  const keep = 1 - rope / dist;
  return { x: current.x + dx * keep, y: current.y + dy * keep };
}

/**
 * One follow (smoothing chase) step in layer-image space.
 * The focus moves toward the cursor by `strength` of the remaining gap,
 * so its speed is proportional to the strength and to the distance:
 * the farther the cursor, the faster the focus travels. A strength of 1
 * snaps instantly (nearly no stabilization); lower values lag behind.
 */
export function stabilizerFollowStep(
  current: GnumarusStabilizerPoint,
  target: GnumarusStabilizerPoint,
  strength: number,
): GnumarusStabilizerPoint {
  const clamped = clampFollowStrength(strength);
  const dx = target.x - current.x;
  const dy = target.y - current.y;
  if (!(Math.abs(dx) > 1e-12 || Math.abs(dy) > 1e-12)) {
    return { x: current.x, y: current.y };
  }
  return { x: current.x + dx * clamped, y: current.y + dy * clamped };
}
