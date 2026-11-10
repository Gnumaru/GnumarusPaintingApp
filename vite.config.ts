import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    sourcemap: false,
    target: "es2022",
    // Deterministic file names (no content hash): the app is served in
    // controlled environments where cache invalidation is not a concern,
    // and stable names keep deploys byte-comparable.
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name][extname]",
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
