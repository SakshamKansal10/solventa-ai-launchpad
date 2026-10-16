import { defineConfig } from "@playwright/test";

/**
 * Keeps the local comparison server running on http://localhost:4175 (an
 * isolated on-disk database — never the production Supabase project). Stop it by
 * creating `.e2e-tmp/compare/stop`.
 *
 *   npm run compare
 */
export default defineConfig({
  testDir: "./e2e/harness",
  testMatch: /compare\.spec\.ts/,
  timeout: 0,
  reporter: "line",
  workers: 1,
  outputDir: ".e2e-tmp/compare/results",
  globalSetup: "./e2e/harness/compare-setup.ts",
});
