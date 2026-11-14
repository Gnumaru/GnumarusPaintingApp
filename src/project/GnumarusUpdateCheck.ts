/**
 * Update check: compare the running build against the newest commit on the
 * source branch, so users on a stale cached copy get a visible warning.
 *
 * The running build embeds its own commit SHA at build time (see
 * `vite.config.ts`, `__GNUMARUS_BUILD_SHA__`); the newest master SHA comes
 * from the public GitHub commits API. Polling sends the previous response
 * ETag (`If-None-Match`): `304 Not Modified` answers do not count against
 * the API rate limit, so a 10s cadence is polite. Failures (offline, rate
 * limit, bad payload) stay silent and keep the last known status.
 *
 * All functions are pure (no fetch, no DOM) and safe to unit test.
 */

/** Source repository owning the releases (owner/name). */
export const GNUMARUS_UPDATE_REPO = "Gnumaru/GnumarusPaintingApp";

/** Branch polled for the newest build. */
export const GNUMARUS_UPDATE_BRANCH = "master";

/** Polling cadence in milliseconds (304 answers are free, so this is cheap). */
export const GNUMARUS_UPDATE_CHECK_MS = 10_000;

/** Cooldown in milliseconds after a 403/429 rate-limit answer. */
export const GNUMARUS_UPDATE_COOLDOWN_MS = 10 * 60 * 1000;

/** Update status shown in the shell (banner only when outdated). */
export type GnumarusUpdateStatus = "unknown" | "current" | "outdated";

/**
 * Extract an `owner/name` slug from a GitHub repository URL such as
 * `https://github.com/Gnumaru/GnumarusPaintingApp` (trailing slash and
 * `.git` suffix tolerated). Null for anything else.
 */
export function repoSlugFromSourceUrl(url: string): string | null {
  const match = /^https?:\/\/github\.com\/([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/i.exec(url.trim());
  if (match === null) {
    return null;
  }
  return `${match[1]}/${match[2]}`;
}

/** API URL returning the newest commit object of a branch. */
export function commitsApiUrl(repo: string, branch: string): string {
  return `https://api.github.com/repos/${repo}/commits/${branch}`;
}

/** True for hostnames where the check is skipped (local development). */
export function isLocalhostHostname(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  return normalized === "" || normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
}

/** True for a full 40-hex-digit git commit SHA. */
export function isCommitSha(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{40}$/i.test(value);
}

/**
 * Extract the commit SHA from a `GET commits/{branch}` payload (single
 * commit object; a one-element array is tolerated). Null when malformed.
 */
export function parseLatestCommitSha(payload: unknown): string | null {
  const candidate = Array.isArray(payload) ? payload[0] : payload;
  if (candidate === null || typeof candidate !== "object") {
    return null;
  }
  const sha = (candidate as { sha?: unknown }).sha;
  return isCommitSha(sha) ? sha.toLowerCase() : null;
}

/** True when both SHAs are valid and differ (case-insensitive). */
export function isOutdatedBuild(localSha: string, remoteSha: string): boolean {
  if (!isCommitSha(localSha) || !isCommitSha(remoteSha)) {
    return false;
  }
  return localSha.toLowerCase() !== remoteSha.toLowerCase();
}

/**
 * Whether the update check should run: never on localhost, and never
 * without a valid embedded build SHA (dev/unknown builds have nothing to
 * compare). Pure so the shell rule stays unit-testable.
 */
export function shouldCheckForUpdates(hostname: string, localSha: string): boolean {
  return !isLocalhostHostname(hostname) && isCommitSha(localSha);
}
