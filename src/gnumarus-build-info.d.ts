/**
 * Commit SHA of the working tree baked into the build by `vite.config.ts`
 * (`git rev-parse HEAD` at build time, `"unknown"` when git is unavailable).
 * Read it through `typeof` so non-vite bundles without the define keep working.
 */
declare const __GNUMARUS_BUILD_SHA__: string;
