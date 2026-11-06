export interface GnumarusRotationSettings {
  /** Canvas rotation step in degrees applied by the 4/6 shortcuts. */
  stepDeg: number;
}

export const DEFAULT_ROTATION_SETTINGS: GnumarusRotationSettings = {
  stepDeg: 15,
};

export const ROTATION_SETTINGS_STORAGE_KEY = "gnumarus.settings.rotation.v1";

export const GNUMARUS_MIN_ROTATION_STEP_DEG = 1;
export const GNUMARUS_MAX_ROTATION_STEP_DEG = 90;

export class GnumarusRotationSettingsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GnumarusRotationSettingsError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function clampRotationStepDeg(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_ROTATION_SETTINGS.stepDeg;
  }
  return Math.min(
    GNUMARUS_MAX_ROTATION_STEP_DEG,
    Math.max(GNUMARUS_MIN_ROTATION_STEP_DEG, Math.floor(value)),
  );
}

export function parseRotationSettings(jsonText: string): GnumarusRotationSettings {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText) as unknown;
  } catch {
    throw new GnumarusRotationSettingsError("rotation settings are not valid JSON");
  }
  if (!isRecord(parsed)) {
    throw new GnumarusRotationSettingsError("rotation settings root must be an object");
  }
  const { stepDeg } = parsed;
  if (typeof stepDeg !== "number") {
    throw new GnumarusRotationSettingsError("rotation settings have invalid fields");
  }
  return { stepDeg: clampRotationStepDeg(stepDeg) };
}

export function serializeRotationSettings(settings: GnumarusRotationSettings): string {
  return JSON.stringify({ stepDeg: clampRotationStepDeg(settings.stepDeg) }, null, 2);
}
