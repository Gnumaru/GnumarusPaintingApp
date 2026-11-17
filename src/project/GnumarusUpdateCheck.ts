/**
 * Update check: compare the running build against the currently deployed
 * one, so users on a stale cached copy get a visible warning.
 *
 * No GitHub API is involved: the unauthenticated commits API is limited to
 * 60 requests/hour per IP, so a shared or busy network gets 403s and the
 * banner silently never appears. Instead, every poll re-fetches the app's
 * own `index.html` (`cache: "no-store"`) and compares its entry-script URL
 * with the script tag that booted the running app. Content-hashed asset
 * names (see `vite.config.ts`) make the entry URL unique per deploy, so a
 * mismatch unambiguously means "a newer build is deployed". Failures
 * (offline, bad payload, unparseable HTML) stay silent and keep the last
 * known status.
 *
 * All functions are pure (no fetch, no DOM) and safe to unit test.
 */

/** Polling cadence in milliseconds (same-origin, uncached, cheap). */
export const GNUMARUS_UPDATE_CHECK_MS = 10_000;

/** Update status shown in the shell (banner only when outdated). */
export type GnumarusUpdateStatus = "unknown" | "current" | "outdated";

/** True for a full 40-hex-digit git commit SHA. */
export function isCommitSha(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{40}$/i.test(value);
}

/** True for hostnames where the check is skipped (local development). */
export function isLocalhostHostname(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  return normalized === "" || normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
}

/**
 * Whether the update check should run: never on localhost, and never
 * without a valid embedded build SHA (dev/unknown builds have nothing to
 * compare). Pure so the shell rule stays unit-testable.
 */
export function shouldCheckForUpdates(hostname: string, localSha: string): boolean {
  return !isLocalhostHostname(hostname) && isCommitSha(localSha);
}

/**
 * Resolve a `<script src>` value against the document URL it was read from.
 * Null for missing/relative-unresolvable values. Pure so it stays
 * unit-testable (the shell passes the attribute; no DOM needed here).
 */
export function resolveEntryScriptUrl(src: string | null | undefined, base: string): string | null {
  if (typeof src !== "string" || src.trim() === "") {
    return null;
  }
  try {
    return new URL(src, base).href;
  } catch {
    return null;
  }
}

/**
 * Extract the first `<script src="...">` URL from a fetched `index.html`,
 * resolved against the URL it was fetched from. Null when the markup has
 * no usable script tag. Pure so it stays unit-testable.
 */
export function extractEntryScriptUrl(html: string, base: string): string | null {
  if (typeof html !== "string") {
    return null;
  }
  const match = /<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i.exec(html);
  if (match === null) {
    return null;
  }
  return resolveEntryScriptUrl(match[1], base);
}

/**
 * Query parameter carrying the reload cache-buster (see
 * `buildCacheBustedReloadUrl`).
 */
export const UPDATE_RELOAD_VERSION_PARAM = "v";

/** Extra reload tags the shell generates itself (`t<base36-timestamp>`). */
function isReloadTag(value: string): boolean {
  return /^t[0-9a-z]+$/i.test(value);
}

/**
 * Build the URL the update banner navigates to: the same document with a
 * `?v=<tag>` parameter. The tag is unique per click, so neither the
 * browser HTTP cache nor the CDN edge can answer with a stale cached
 * `index.html` (a plain `location.reload()` cannot force that bypass).
 * Falls back to the unchanged href for empty tags. Pure (no DOM) so it
 * stays unit-testable.
 */
export function buildCacheBustedReloadUrl(href: string, tag: string): string {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return href;
  }
  if (typeof tag !== "string" || tag.trim() === "") {
    return url.toString();
  }
  url.searchParams.set(UPDATE_RELOAD_VERSION_PARAM, tag);
  return url.toString();
}

/**
 * Strip our own reload cache-buster after a successful boot so copied URLs
 * stay clean. Returns the cleaned URL, or null when there is nothing to
 * strip (missing param or a foreign value — only commit SHAs and our own
 * `t...` tags are removed). Pure (no DOM).
 */
export function stripReloadCacheBuster(href: string): string | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  const value = url.searchParams.get(UPDATE_RELOAD_VERSION_PARAM);
  if (value === null || (!isCommitSha(value) && !isReloadTag(value))) {
    return null;
  }
  url.searchParams.delete(UPDATE_RELOAD_VERSION_PARAM);
  return url.toString();
}
