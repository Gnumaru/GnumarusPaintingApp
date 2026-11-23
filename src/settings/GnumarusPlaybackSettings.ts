/**
 * "Allow changes while playing" setting: when false (the default),
 * painting, cell/layer/frame edits, undo/redo and project replacement
 * are blocked while an animation is playing. When true, everything
 * behaves as before and edits land on live frames.
 */

export interface GnumarusPlaybackSettings {
  allowChangesWhilePlaying: boolean;
}

export const DEFAULT_PLAYBACK_SETTINGS: GnumarusPlaybackSettings = {
  allowChangesWhilePlaying: false,
};

export const PLAYBACK_SETTINGS_STORAGE_KEY = "gnumarus.settings.playback.v1";

export class GnumarusPlaybackSettingsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GnumarusPlaybackSettingsError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Only an explicit true enables edits; everything else stays locked. */
export function parseAllowChangesWhilePlaying(value: unknown): boolean {
  return value === true;
}

export function parsePlaybackSettings(jsonText: string): GnumarusPlaybackSettings {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText) as unknown;
  } catch {
    throw new GnumarusPlaybackSettingsError("playback settings are not valid JSON");
  }
  if (!isRecord(parsed)) {
    throw new GnumarusPlaybackSettingsError("playback settings root must be an object");
  }
  return { allowChangesWhilePlaying: parseAllowChangesWhilePlaying(parsed["allowChangesWhilePlaying"]) };
}

export function serializePlaybackSettings(settings: GnumarusPlaybackSettings): string {
  return JSON.stringify({ allowChangesWhilePlaying: parseAllowChangesWhilePlaying(settings.allowChangesWhilePlaying) });
}
