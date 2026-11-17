import { expect, test, type Route } from "@playwright/test";

import { gotoApp } from "./helpers/page";
import { STUDENT_ANSWERS } from "./helpers/seed";
import { createUser, forbidRealBackends, resetStack, signIn } from "./helpers/stack";

/**
 * Honest waiting (owner, 2026-11-17): the idea screen quotes "a minute or two",
 * and after two minutes says calmly it is taking a little longer and the answers are saved — never an error while the request
 * is still running.
 */
test.beforeEach(async ({ page }) => {
  forbidRealBackends(page);
  await resetStack();
});

test("idea generation: 'a minute or two', then after two minutes a calm line and no error", async ({
  page,
  context,
}) => {
  test.setTimeout(120_000);
  const user = await createUser({ fullName: "Riya Sharma" });
  await signIn(context, user);
  await page.addInitScript((answers) => {
    if (sessionStorage.getItem("seeded")) return;
    sessionStorage.setItem("seeded", "1");
    localStorage.setItem(
      "solventia-consultation-v2",
      JSON.stringify({ answers, screenKey: "submit", savedAt: Date.now() }),
    );
  }, STUDENT_ANSWERS);
  await page.clock.install();
  await gotoApp(page, "/consultation?submit=1");
  await expect(page.getByTestId("generating")).toBeVisible({ timeout: 30_000 });

  // From here the server is slow: every call waits until the test lets it go.
  const held: Route[] = [];
  await page.route("**/_serverFn/**", (route) => {
    held.push(route);
  });

  await expect(page.getByTestId("generating")).toContainText("This takes a minute or two.");
  await expect(page.getByTestId("generating")).not.toContainText("up to a minute");
  await expect(page.getByTestId("generating")).not.toContainText("usually");
  await expect(page.getByTestId("generating-long")).toHaveCount(0);

  // Not yet at one minute: "a minute or two" has not passed.
  await page.clock.fastForward(61_000);
  await expect(page.getByTestId("generating-long")).toHaveCount(0);
  await page.clock.fastForward(60_000);
  await expect(page.getByTestId("generating-long")).toHaveText(
    "Still working — this one is taking a little longer. Your answers are saved, so you can leave and come back.",
  );
  await expect(page.getByTestId("generate-error")).toHaveCount(0);
  await expect(page.getByTestId("generating")).toBeVisible();

  await page.unroute("**/_serverFn/**");
  for (const r of held) await r.continue().catch(() => {});
});
