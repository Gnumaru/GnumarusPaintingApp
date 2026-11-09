/**
 * Named animations defined from strings like
 * `walk,forward,1:0.4,2-4,7,1`: an animation name, a loop mode, then a
 * comma-separated frame list where `A-B` spans a range and `:s` overrides
 * the duration in seconds of one frame (or every frame of a range). Frames
 * are numbered from 1. Pure data + parsing/stepping rules (no DOM or WebGL)
 * so everything stays unit-testable; the engine owns the live list.
 */
import { clampFrameDurationSec } from "./GnumarusAnimationModel";

export type GnumarusAnimationLoop = "none" | "forward" | "ping-pong";

export const GNUMARUS_ANIMATION_LOOPS: GnumarusAnimationLoop[] = ["none", "forward", "ping-pong"];

export interface GnumarusNamedAnimationFrame {
  /** 0-based project frame index. */
  frame: number;
  /** Per-frame duration override in seconds, or null for the project duration. */
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

/** Parse a `:s` duration override as fractional seconds (no decimal limit). */
function parsePositiveSeconds(text: string, what: string): number {
  if (!/^\d+(?:\.\d+)?$/.test(text)) {
    throw new GnumarusNamedAnimationError(
      `Invalid ${what} "${text}": expected a positive number of seconds like 0.25.`,
    );
  }
  const value = Number(text);
  if (!Number.isFinite(value) || value <= 0) {
    throw new GnumarusNamedAnimationError(
      `Invalid ${what} "${text}": expected a positive number of seconds like 0.25.`,
    );
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
    const match = /^(\d+)(?:-(\d+))?(?::(\d+(?:\.\d+)?))?$/.exec(item);
    if (match === null || match[1] === undefined) {
      throw new GnumarusNamedAnimationError(
        `Invalid frame entry "${item}": use 7, 3-5 or 2:0.2 (ranges expand, :s overrides each frame).`,
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
      const overrideSec = parsePositiveSeconds(match[3], "duration");
      duration = clampFrameDurationSec(overrideSec);
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
 * 1-based frame numbers as a compact list: runs of 3+ collapse to `A-B`,
 * shorter runs stay expanded (`"some animation": forward, 7 frames: 1,2,5-8,9`).
 */
export function formatNamedAnimationFrames(frames: readonly GnumarusNamedAnimationFrame[]): string {
  const ones = [...new Set(frames.map((entry) => entry.frame + 1))].sort((a, b) => a - b);
  const parts: string[] = [];
  let i = 0;
  while (i < ones.length) {
    let j = i;
    while (j + 1 < ones.length && ones[j + 1] === ones[j] + 1) {
      j += 1;
    }
    if (j - i + 1 >= 3) {
      parts.push(`${ones[i]}-${ones[j]}`);
    } else {
      for (let k = i; k <= j; k += 1) {
        parts.push(`${ones[k]}`);
      }
    }
    i = j + 1;
  }
  return parts.join(",");
}

/** One-line summary for the animation list: `"name": loop, N frames: ranges`. */
export function describeNamedAnimation(animation: GnumarusNamedAnimation): string {
  const count = new Set(animation.frames.map((entry) => entry.frame)).size;
  const ranges = formatNamedAnimationFrames(animation.frames);
  const noun = count === 1 ? "frame" : "frames";
  return `"${animation.name}": ${animation.loop}, ${count} ${noun}${ranges === "" ? "" : `: ${ranges}`}`;
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

export interface GnumarusExportFrame {
  /** 0-based project frame index. */
  frame: number;
  /** Per-frame duration override in seconds, or null for the project duration. */
  duration: number | null;
}

/**
 * Walk an animation from its first entry until it stops (`none`) or
 * completes one full cycle (loops), returning the playback order.
 */
export function resolveExportSequence(animation: GnumarusNamedAnimation): GnumarusExportFrame[] {  const sequence: GnumarusExportFrame[] = [];
  if (animation.frames.length === 0) {
    return sequence;
  }
  const seen = new Set<string>();
  let index = 0;
  let direction: 1 | -1 = 1;
  for (;;) {
    const key = `${index}:${direction}`;
    if (seen.has(key)) {
      break;
    }
    seen.add(key);
    const entry = animation.frames[index];
    if (entry === undefined) {
      break;
    }
    sequence.push({ frame: entry.frame, duration: entry.duration });
    const step = nextAnimationStep(animation, index, direction);
    if (step === null) {
      break;
    }
    index = step.index;
    direction = step.direction;
  }
  return sequence;
}

/**
 * Count, per 0-based frame index, how many of the given animations include
 * it. Each animation counts once per frame even when it lists the frame
 * several times; out-of-range and negative indices are ignored.
 */
export function countAnimationFrames(animations: readonly GnumarusNamedAnimation[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const animation of animations) {
    const seen = new Set<number>();
    for (const entry of animation.frames) {
      if (!Number.isInteger(entry.frame) || entry.frame < 0 || seen.has(entry.frame)) {
        continue;
      }
      seen.add(entry.frame);
      counts.set(entry.frame, (counts.get(entry.frame) ?? 0) + 1);
    }
  }
  return counts;
}

/**
 * Parse a bare frame list like `1,3-5,7` (1-based, ranges with hyphens,
 * order and repeats kept as given). Throws GnumarusNamedAnimationError.
 */
export function parseFrameList(text: string, frameCount: number): number[] {
  const items = text
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  if (items.length === 0) {
    throw new GnumarusNamedAnimationError("Frame list is empty: use 1,3-5,7.");
  }
  const frames: number[] = [];
  for (const item of items) {
    const match = /^(\d+)(?:-(\d+))?$/.exec(item);
    if (match === null || match[1] === undefined) {
      throw new GnumarusNamedAnimationError(
        `Invalid frame entry "${item}": use 7 or 3-5.`,
      );
    }
    const first = parsePositiveInt(match[1], "frame number");
    const last = match[2] === undefined ? first : parsePositiveInt(match[2], "range end");
    if (last < first) {
      throw new GnumarusNamedAnimationError(
        `Invalid range "${item}": the range end comes before its start.`,
      );
    }
    for (let frame = first; frame <= last; frame += 1) {
      if (frame < 1 || frame > frameCount) {
        throw new GnumarusNamedAnimationError(
          `Frame ${frame} does not exist: this project has ${frameCount} frame${frameCount === 1 ? "" : "s"}.`,
        );
      }
      frames.push(frame - 1);
    }
  }
  return frames;
}
