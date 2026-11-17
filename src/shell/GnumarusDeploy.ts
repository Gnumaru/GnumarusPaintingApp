/** Public GitHub Pages build of the app. */
export const GNUMARUS_PAGES_URL = "https://gnumaru.github.io/GnumarusPaintingApp/";

/** Host serving the public build (compared case-insensitively). */
export const GNUMARUS_PAGES_HOST = "gnumaru.github.io";

/** Path prefix of the public build (matches with or without deeper paths). */
export const GNUMARUS_PAGES_PATH = "/GnumarusPaintingApp";

/**
 * True when running on the production GitHub Pages deploy (host plus app
 * path; query strings and hashes are ignored by callers passing
 * `location.pathname`). Pure so both branches stay unit-testable.
 */
export function isGitHubPagesDeploy(hostname: string, pathname: string): boolean {
  if (hostname.trim().toLowerCase() !== GNUMARUS_PAGES_HOST) {
    return false;
  }
  const path = pathname.trim();
  return path === GNUMARUS_PAGES_PATH || path.startsWith(GNUMARUS_PAGES_PATH + "/");
}
