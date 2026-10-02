import { existsSync, rmSync } from "node:fs";
import { test } from "@playwright/test";

const STOP_FILE = "e2e-results/stop";

test("serve the fake stack and the app until told to stop", async () => {
  rmSync(STOP_FILE, { force: true });
  console.log(`[serve] app=${process.env.E2E_APP_URL} fake=${process.env.E2E_FAKE_URL}`);
  console.log(`[serve] create ${STOP_FILE} to stop`);
  const until = Date.now() + 3 * 60 * 60_000;
  while (Date.now() < until && !existsSync(STOP_FILE)) {
    await new Promise((r) => setTimeout(r, 2000));
  }
});
