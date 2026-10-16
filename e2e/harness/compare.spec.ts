import { existsSync, rmSync } from "node:fs";
import { test } from "@playwright/test";

const STOP_FILE = ".e2e-tmp/compare/stop";

test("serve the local comparison app until told to stop", async () => {
  rmSync(STOP_FILE, { force: true });
  console.log(
    `[compare] Claude local version → ${process.env.E2E_APP_URL}  (AI: ${process.env.COMPARE_AI_MODE})`,
  );
  console.log(
    "[compare] accounts: founder@solventia.local / demo@solventia.local  password: Solventia-local-1  (email codes: 123456)",
  );
  console.log(`[compare] create ${STOP_FILE} to stop`);
  const until = Date.now() + 12 * 60 * 60_000;
  while (Date.now() < until && !existsSync(STOP_FILE)) {
    await new Promise((r) => setTimeout(r, 2000));
  }
});
