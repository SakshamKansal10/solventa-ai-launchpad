import { defineConfig } from "vitest/config";
import path from "node:path";

/** `npm run engine:compare` — the idea engine comparison on the real model (scripts/engine). */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["scripts/engine/**/*.test.ts"],
    testTimeout: 4 * 60 * 60 * 1000,
  },
});
