import { expect, test } from "@playwright/test";

import { walkConsultation } from "./helpers/consultation";
import { gotoApp } from "./helpers/page";
import { STUDENT_ANSWERS } from "./helpers/seed";
import { createUser, forbidRealBackends, gemini, resetStack, signIn } from "./helpers/stack";

/**
 * Owner bug (2026-11-16): finishing the consultation as a guest and choosing "Continue with
 * Google" must show the account chooser and end on directions — never on an empty dashboard.
 */
test.beforeEach(async ({ page }) => {
  forbidRealBackends(page);
  await resetStack();
});

test.describe("finish as a guest, then Google", () => {
  test("Continue with Google asks for the account, returns to the last step and generates", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await gotoApp(page, "/consultation");
    await page.evaluate(() => window.localStorage.clear());
    await gotoApp(page, "/consultation");
    await walkConsultation(page);

    const authorize: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("/authorize")) authorize.push(r.url());
    });
    await page
      .getByTestId("account-gate")
      .getByRole("button", { name: /Continue with Google/ })
      .click();

    await expect(page).toHaveURL(/localhost:\d+\/dashboard$/, { timeout: 120_000 });
    await expect(page.getByTestId("flagship-card")).toBeVisible({ timeout: 60_000 });
    expect(await gemini.countOf("INITIAL_INTELLIGENCE")).toBe(1);
    expect(authorize.some((u) => u.includes("prompt=select_account"))).toBe(true);
  });

  test("safety net: signed in, no analysis, a finished draft — the dashboard resumes generation", async ({
    page,
    context,
  }) => {
    test.setTimeout(240_000);
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

    await gotoApp(page, "/dashboard");
    await expect(page).toHaveURL(/\/consultation\?submit=1/, { timeout: 30_000 });
    await expect(page).toHaveURL(/localhost:\d+\/dashboard$/, { timeout: 120_000 });
    await expect(page.getByTestId("flagship-card")).toBeVisible({ timeout: 60_000 });
    expect(await gemini.countOf("INITIAL_INTELLIGENCE")).toBe(1);
  });
});
