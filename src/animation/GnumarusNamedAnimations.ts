/**
 * Named animations defined from strings like
 * `walk,forward,1:400,2-4,7,1`: an animation name, a loop mode, then a
 * comma-separated frame list where `A-B` spans a range and `:ms` overrides
 * the duration of one frame (or every frame of a range). Frames are
 * numbered from 1. Pure data + parsing/stepping rules (no DOM or WebGL)
 * so everything stays unit-testable; the engine owns the live list.
 */
import { clampFrameDurationMs } from "./GnumarusAnimationModel";

export type GnumarusAnimationLoop = "none" | "forward" | "ping-pong";

export const GNUMARUS_ANIMATION_LOOPS: GnumarusAnimationLoop[] = ["none", "forward", "ping-pong"];

export interface GnumarusNamedAnimationFrame {
  /** 0-based project frame index. */
  frame: number;
  /** Per-frame duration override in ms, or null for the project duration. */
  duration: number | null;
}

export interface GnumarusNamedAnimation {
  name: string;
  loop: GnumarusAnimationLoop;
  frames: GnumarusNamedAnimationFrame[];
}

export class GnumarusNamedAnimationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GnumarusNamedAnimationError";
  }
}

function parsePositiveInt(text: string, what: string): number {
  if (!/^\d+$/.test(text)) {
    throw new GnumarusNamedAnimationError(`Invalid ${what} "${text}": expected a positive frame number.`);
  }
  const value = Number.parseInt(text, 10);
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new GnumarusNamedAnimationError(`Invalid ${what} "${text}": expected a positive frame number.`);
  }
  return value;
}

/**
 * Parse `name,loop,frames...` against a project with `frameCount` frames
 * (1-based numbers must exist). Throws GnumarusNamedAnimationError with a
 * user-facing message on any problem.
 */
export function parseNamedAnimation(text: string, frameCount: number): GnumarusNamedAnimation {
  const parts = text.split(",");
  if (parts.length < 3) {
    throw new GnumarusNamedAnimationError(
      'Animation needs a name, a loop mode and at least one frame, like "walk,forward,1,2,3".',
    );
  }
  const name = (parts[0] ?? "").trim();
  if (name === "") {
    throw new GnumarusNamedAnimationError("Animation name is empty.");
  }
  const loopText = (parts[1] ?? "").trim().toLowerCase();
  if (loopText !== "none" && loopText !== "forward" && loopText !== "ping-pong") {
    throw new GnumarusNamedAnimationError(
      `Unknown loop mode "${(parts[1] ?? "").trim()}": use none, forward or ping-pong.`,
    );
  }
  const loop: GnumarusAnimationLoop = loopText;
  const frames: GnumarusNamedAnimationFrame[] = [];
  for (const rawItem of parts.slice(2)) {
    const item = rawItem.trim();
    const match = /^(\d+)(?:-(\d+))?(?::(\d+))?$/.exec(item);
    if (match === null || match[1] === undefined) {
      throw new GnumarusNamedAnimationError(
        `Invalid frame entry "${item}": use 7, 3-5 or 2:200 (ranges expand, :ms overrides each frame).`,
      );
    }
    const first = parsePositiveInt(match[1], "frame number");
    const last = match[2] === undefined ? first : parsePositiveInt(match[2], "range end");
    if (last < first) {
      throw new GnumarusNamedAnimationError(
        `Invalid range "${item}": the range end comes before its start.`,
      );
    }
    let duration: number | null = null;
    if (match[3] !== undefined) {
      const overrideMs = parsePositiveInt(match[3], "duration");
      duration = clampFrameDurationMs(overrideMs);
    }
    for (let frame = first; frame <= last; frame += 1) {
      if (frame < 1 || frame > frameCount) {
        throw new GnumarusNamedAnimationError(
          `Frame ${frame} does not exist: this project has ${frameCount} frame${frameCount === 1 ? "" : "s"}.`,
        );
      }
      frames.push({ frame: frame - 1, duration });
    }
  }
  return { name, loop, frames };
}

/**
 * Serialize back to the definition-string format, collapsing consecutive
 * frames with equal durations into ranges.
 */
export function serializeNamedAnimation(animation: GnumarusNamedAnimation): string {
  const items: string[] = [];
  let index = 0;
  const frames = animation.frames;
  while (index < frames.length) {
    const start = frames[index];
    if (start === undefined) {
      break;
    }
    let end = index;
    while (
      end + 1 < frames.length &&
      frames[end + 1]?.frame === (frames[end]?.frame ?? -2) + 1 &&
      frames[end + 1]?.duration === start.duration
    ) {
      end += 1;
    }
    const last = frames[end];
    if (last === undefined) {
      break;
    }
    let item = end > index ? `${start.frame + 1}-${last.frame + 1}` : `${start.frame + 1}`;
    if (start.duration !== null) {
      item += `:${start.duration}`;
    }
    items.push(item);
    index = end + 1;
  }
  return `${animation.name},${animation.loop},${items.join(",")}`;
}

/**
 * Next playback position from `index` (into `animation.frames`) moving in
 * `direction`. Returns null when a `none` animation reaches its end.
 * Empty animations always return null.
 */
export function nextAnimationStep(
  animation: GnumarusNamedAnimation,
  index: number,
  direction: 1 | -1,
): { index: number; direction: 1 | -1 } | null {
  const length = animation.frames.length;
  if (length === 0 || !Number.isInteger(index) || index < 0 || index >= length) {
    return null;
  }
  if (length === 1) {
    if (animation.loop === "none") {
      return null;
    }
    return { index: 0, direction: animation.loop === "ping-pong" ? ((direction * -1) as 1 | -1) : direction };
  }
  const candidate = index + direction;
  if (candidate >= 0 && candidate < length) {
    return { index: candidate, direction };
  }
  if (animation.loop === "none") {
    return null;
  }
  if (animation.loop === "forward") {
    return direction === 1 ? { index: 0, direction } : { index: length - 1, direction };
  }
  const flipped = (direction * -1) as 1 | -1;
  return { index: index + flipped, direction: flipped };
}

/**
 * Remap every referenced frame index (insert/move/remove support).
 * Entries mapping to null are dropped.
 */
export function mapNamedAnimationFrames(
  animations: GnumarusNamedAnimation[],
  map: (frame: number) => number | null,
): GnumarusNamedAnimation[] {
  return animations.map((animation) => ({
    name: animation.name,
    loop: animation.loop,
    frames: animation.frames.flatMap((entry) => {
      const mapped = map(entry.frame);
      return mapped === null ? [] : [{ frame: mapped, duration: entry.duration }];
    }),
  }));
}
