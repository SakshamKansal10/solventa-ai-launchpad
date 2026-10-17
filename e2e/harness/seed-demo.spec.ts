import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import { walkConsultation } from "../helpers/consultation";
import { gotoApp } from "../helpers/page";
import { appUrl, sql } from "../helpers/stack";

/**
 * Seeds the LOCAL comparison server (never a real project) through the real UI:
 *
 *   reveal@solventia.local — consultation finished, directions ready (the idea reveal)
 *   demo@solventia.local   — direction chosen, roadmap built, first mission in progress
 *
 * Both use the password Solventia-local-1. Each is seeded once; re-running is a no-op.
 */
const PASSWORD = "Solventia-local-1";

async function signInAs(context: BrowserContext, email: string) {
  // Sign in exactly like a browser would (password grant against the local auth).
  const fake = process.env.E2E_FAKE_URL!;
  const res = await fetch(`${fake}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
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
}

async function hasConsultation(email: string) {
  const rows = await sql<{ n: string }>(
    "select count(*)::text as n from business_dna b join auth.users u on u.id = b.user_id where u.email = $1",
    [email],
  );
  return Number(rows[0].n) > 0;
}

async function count(email: string, from: string) {
  const rows = await sql<{ n: string }>(
    `select count(*)::text as n from ${from} x join auth.users u on u.id = x.user_id where u.email = $1`,
    [email],
  );
  return Number(rows[0].n);
}

/** Walks the consultation and waits for the directions (the reveal) on /dashboard. */
async function consult(page: Page) {
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
}

test("seed the review founders through the real UI", async ({ browser }) => {
  // 1 — The idea reveal: a finished consultation, nothing chosen (the reveal plays for them).
  if (!(await hasConsultation("reveal@solventia.local"))) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signInAs(context, "reveal@solventia.local");
    await consult(page);
    await expect(page.getByTestId("command-center")).toHaveAttribute("data-stage", "ideas_ready", {
      timeout: 60_000,
    });
    // Leave the reveal unseen so the reviewer meets it exactly as a new founder would.
    await page.evaluate(() => {
      for (const key of Object.keys(window.localStorage))
        if (key.startsWith("solventia:reveal-seen:")) window.localStorage.removeItem(key);
    });
    await context.close();
    console.log("[seed] reveal founder is ready: directions waiting to be revealed");
  }

  // 2 — The working founder: direction chosen, roadmap built, first mission started.
  // Resumable: each step runs only if the founder has not reached it yet.
  const demo = "demo@solventia.local";
  const started = await sql<{ n: string }>(
    "select count(*)::text as n from roadmap_tasks t join auth.users u on u.id = t.user_id where u.email = $1 and t.status <> 'pending'",
    [demo],
  );
  if (Number(started[0].n) === 0) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signInAs(context, demo);
    if (!(await hasConsultation(demo))) await consult(page);
    if ((await count(demo, "roadmaps")) === 0) {
      await gotoApp(page, "/dashboard");
      await page.getByTestId("reveal-continue").click();
      await page.getByTestId("flagship-choose").click();
      await expect(page.getByTestId("roadmap-page")).toBeVisible({ timeout: 5 * 60_000 });
    } else {
      await gotoApp(page, "/dashboard/roadmap");
    }
    const first = page.getByTestId("mission-card").first();
    await first.getByTestId("mission-primary").click();
    await expect(first).toHaveAttribute("data-state", "in_progress");
    await context.close();
    console.log("[seed] demo founder is ready: direction → roadmap, mission 1 in progress");
  }
});
