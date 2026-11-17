import { defineConfig } from "vitest/config";
// @ts-ignore node builtin types would need @types/node; the import itself is standard in Vite configs.
import { execSync } from "node:child_process";

/**
 * Commit SHA of the working tree baked into the build for the update
 * checker (`__GNUMARUS_BUILD_SHA__`). Falls back to "unknown" when git is
 * unavailable so local archives still build.
 */
function buildCommitSha(): string {
  try {
    const sha = execSync("git rev-parse HEAD", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return /^[0-9a-f]{40}$/i.test(sha) ? sha.toLowerCase() : "unknown";
  } catch {
    return "unknown";
  }
}

export default defineConfig({
  base: "./",
  define: {
    __GNUMARUS_BUILD_SHA__: JSON.stringify(buildCommitSha()),
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    target: "es2022",
    // Content-hashed file names: every deploy gets unique asset URLs, so a
    // browser or CDN cached copy can never shadow the new code. The update
    // banner pairs this with a `?v=<sha>` document reload (see
    // GnumarusUpdateCheck), because hashes alone cannot refresh a stale
    // cached `index.html` that still points at the old assets.
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
  server: {
    port: 5173,
  },
  preview: {
    port: 4173,
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
