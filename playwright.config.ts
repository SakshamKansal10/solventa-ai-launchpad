import { defineConfig } from "@playwright/test";

/**
 * Browser E2E. Runs against a locally started app whose SUPABASE_URL points at
 * the in-repo fake Supabase (e2e/harness) and whose Gemini calls go to the fake
 * Gemini — it never talks to the real production database or spends real AI
 * quota. See e2e/harness/README.md and `npm run test:e2e`.
 *
 * Uses the machine's installed Chrome (`channel: "chrome"`), so no browser
 * download is required.
 */
const PORT = Number(process.env.E2E_PORT ?? 4173);

export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.spec\.ts/,
  testIgnore: /harness\//,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "e2e-report" }]],
  outputDir: "e2e-results",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`,
    channel: "chrome",
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    viewport: { width: 1440, height: 900 },
  },
  globalSetup: process.env.E2E_BASE_URL ? undefined : "./e2e/harness/global-setup.ts",
});
