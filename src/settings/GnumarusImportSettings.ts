/**
 * What happens to textures right after a project is opened or a file is
 * imported: `none` imports everything as-is, `fit` removes fully
 * transparent borders (same as running fit-all-textures-to-size with alpha
 * threshold 0), `crop` crops every texture to the canvas (same as running
 * crop-all-cells-to-canvas), and `crop+fit` crops first and then fits with
 * threshold 0. Default is `crop+fit`.
 */
export type GnumarusImportCleanup = "none" | "fit" | "crop" | "crop+fit";

export const DEFAULT_IMPORT_CLEANUP: GnumarusImportCleanup = "crop+fit";

export const IMPORT_CLEANUP_STORAGE_KEY = "gnumarus.settings.importCleanup.v1";

export class GnumarusImportCleanupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GnumarusImportCleanupError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseImportCleanup(value: unknown): GnumarusImportCleanup {
  if (value === "none" || value === "fit" || value === "crop" || value === "crop+fit") {
    return value;
  }
  return DEFAULT_IMPORT_CLEANUP;
}

export function parseImportCleanupSettings(jsonText: string): GnumarusImportCleanup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText) as unknown;
  } catch {
    throw new GnumarusImportCleanupError("import cleanup settings are not valid JSON");
  }
  if (!isRecord(parsed)) {
    throw new GnumarusImportCleanupError("import cleanup settings root must be an object");
  }
  const { cleanup } = parsed;
  if (typeof cleanup !== "string") {
    throw new GnumarusImportCleanupError("import cleanup settings have invalid fields");
  }
  return parseImportCleanup(cleanup);
}

export function serializeImportCleanupSettings(cleanup: GnumarusImportCleanup): string {
  return JSON.stringify({ cleanup: parseImportCleanup(cleanup) }, null, 2);
}
