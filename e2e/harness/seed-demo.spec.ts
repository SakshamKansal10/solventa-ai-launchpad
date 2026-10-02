import { expect, test } from "@playwright/test";

import { walkConsultation } from "../helpers/consultation";
import { gotoApp } from "../helpers/page";
import { appUrl, sql } from "../helpers/stack";

const DEMO_EMAIL = "demo@solventia.local";
const DEMO_PASSWORD = "Solventia-local-1";

test("seed the demo founder through the real UI", async ({ page, context }) => {
  const existing = await sql<{ n: string }>(
    "select count(*)::text as n from business_dna b join auth.users u on u.id = b.user_id where u.email = $1",
    [DEMO_EMAIL],
  );
  if (Number(existing[0].n) > 0) {
    console.log("[seed] the demo founder already has a consultation — nothing to do");
    return;
  }

  // Sign in as the demo founder exactly like a browser would (password grant against the local auth).
  const fake = process.env.E2E_FAKE_URL!;
  const res = await fetch(`${fake}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
  });
  expect(res.ok).toBe(true);
  const session = (await res.json()) as Record<string, unknown>;
  const host = new URL(fake).hostname.split(".")[0];
  await context.addCookies([
    {
      name: `sb-${host}-auth-token`,
      value: `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`,
      url: appUrl(),
    },
  ]);

  await gotoApp(page, "/consultation");
  await page.evaluate(() => window.localStorage.clear());
  await gotoApp(page, "/consultation");
  await walkConsultation(page);
  await page.getByTestId("find-directions").click();
  // A live model occasionally returns malformed JSON; the product surfaces that as a
  // retry screen (by design) — so does this script, up to three times.
  for (let attempt = 1; attempt <= 3; attempt++) {
    const outcome = await Promise.race([
      page.waitForURL(/\/dashboard$/, { timeout: 5 * 60_000 }).then(() => "done" as const),
      page
        .getByTestId("generate-error")
        .waitFor({ timeout: 5 * 60_000 })
        .then(() => "error" as const),
    ]);
    if (outcome === "done") break;
    if (attempt === 3) throw new Error("The analysis failed three times in a row");
    await page.getByRole("button", { name: /try again/i }).click();
  }
  await expect(page.locator("h1")).toHaveText("Your directions are ready", { timeout: 60_000 });

  await page.getByTestId("flagship-choose").click();
  await page.getByTestId("build-roadmap").click();
  await expect(page.getByTestId("roadmap-page")).toBeVisible({ timeout: 5 * 60_000 });

  // Start the first mission so the Command Center shows real progress.
  await page.getByTestId("mission-card").first().getByTestId("mission-state-in_progress").click();
  await expect(
    page.getByTestId("mission-card").first().getByTestId("mission-state-in_progress"),
  ).toHaveAttribute("aria-checked", "true");
  console.log(
    "[seed] demo founder is ready: consultation → direction → roadmap, mission 1 in progress",
  );
});
