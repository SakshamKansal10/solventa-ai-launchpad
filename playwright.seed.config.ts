import { defineConfig } from "@playwright/test";

/**
 * Populates the RUNNING local comparison server (see playwright.compare.config.ts)
 * with a demo founder who has completed a consultation, chosen a direction and
 * built a roadmap — by driving the real UI. Runs against the stack that is
 * already up; it never starts one and never touches any real project.
 *
 *   E2E_BASE_URL=http://localhost:4175 E2E_FAKE_URL=http://127.0.0.1:54329 \
 *     npx playwright test -c playwright.seed.config.ts
 */
export default defineConfig({
  testDir: "./e2e/harness",
  testMatch: /seed-demo\.spec\.ts/,
  timeout: 15 * 60_000,
  reporter: "line",
  workers: 1,
  outputDir: ".e2e-tmp/compare/seed-results",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:4175",
    channel: "chrome",
    headless: true,
    viewport: { width: 1440, height: 900 },
  },
});
