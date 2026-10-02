import { defineConfig } from "@playwright/test";

/**
 * Starts the fake Supabase/Gemini stack and the app and keeps them running, so
 * specs can be re-run in seconds instead of paying the ~2 minute startup each
 * time:
 *
 *   E2E_FAKE_PORT=54329 npx playwright test -c playwright.serve.config.ts   (leave running)
 *   E2E_BASE_URL=http://localhost:4173 E2E_FAKE_URL=http://127.0.0.1:54329 npx playwright test e2e/roadmap.spec.ts
 */
export default defineConfig({
  testDir: "./e2e/harness",
  testMatch: /serve\.spec\.ts/,
  timeout: 0,
  reporter: "line",
  workers: 1,
  globalSetup: "./e2e/harness/global-setup.ts",
});
