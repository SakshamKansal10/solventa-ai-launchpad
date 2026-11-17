import { expect, test } from "@playwright/test";
import { gotoApp } from "./helpers/page";

import { seedDirections } from "./helpers/seed";
import { createUser, forbidRealBackends, gemini, resetStack, signIn, sql } from "./helpers/stack";

test.beforeEach(async ({ page }) => {
  forbidRealBackends(page);
  await resetStack();
});

test.describe("Today — directions ready, none chosen", () => {
  test("the recommended direction is the headline, with its fit summary and one way to compare — no scores", async ({
    page,
    context,
  }) => {
    const user = await createUser({ fullName: "Asha Verma" });
    await signIn(context, user);
    const seeded = await seedDirections(user.id);
    await gotoApp(page, "/dashboard");

    await expect(page.getByTestId("flagship-card")).toBeVisible();
    await expect(page.getByTestId("flagship-card")).toContainText("Recommended for you");
    // Only the recommended idea is here; the others live on the Directions page.
    await expect(page.getByTestId("alternative-card")).toHaveCount(0);
    await expect(page.getByTestId("explore-more")).toHaveText("Compare all 3");
    await expect(page.getByTestId("fit-summary")).toContainText(/\d of 5 fit clearly/);
    await expect(page.getByTestId("next-steps").locator("li[aria-current=step]")).toContainText(
      "Choose a direction",
    );
    // Exactly one primary action on the page.
    await expect(page.getByTestId("flagship-explore")).toHaveText("Explore this direction");

    // No numeric fit score, percentage or Business DNA anywhere on the screen.
    const text = await page.getByTestId("command-center").innerText();
    expect(text).not.toMatch(/\d+\s?%/);
    expect(text).not.toMatch(/Business DNA/i);
    expect(text).not.toMatch(/\b\d{2}\s*\/\s*100\b/);
    // The flagship is one of the seeded directions.
    const headline = await page.locator("h1").innerText();
    expect(seeded.titles).toContain(headline);
  });

  test("choosing a direction makes it the headline and offers to build the roadmap", async ({
    page,
    context,
  }) => {
    const user = await createUser();
    await signIn(context, user);
    await seedDirections(user.id);
    await gotoApp(page, "/dashboard");

    // The recommended direction is reviewed, then chosen on its own page.
    await page.getByTestId("flagship-explore").click();
    await page.getByTestId("choose-direction").click();
    await expect(page.getByTestId("build-roadmap")).toBeVisible();
    const chosen = await page.getByTestId("opportunity-title").innerText();
    await gotoApp(page, "/dashboard");
    await expect(page.locator("h1")).toHaveText(chosen);
    await expect(page.getByTestId("build-roadmap")).toHaveText("Build my roadmap");
    await expect(page.getByTestId("build-roadmap")).toBeEnabled();
    await expect(page.getByTestId("next-steps").locator("li[aria-current=step]")).toContainText(
      "roadmap",
    );
    // Survives a reload (it is saved, not just local state).
    await page.reload();
    await expect(page.locator("h1")).toHaveText(chosen);
  });

  test("Compare all opens the Directions page, where more directions are added through one Gemini call", async ({
    page,
    context,
  }) => {
    const user = await createUser();
    await signIn(context, user);
    await seedDirections(user.id);
    await gotoApp(page, "/dashboard");

    await page.getByTestId("explore-more").click();
    await expect(page).toHaveURL(/\/dashboard\/opportunities/, { timeout: 30_000 });
    await page.getByTestId("explore-more-generate").click();
    // The full-page generation screen (Job N), then back to the new set.
    await expect(page).toHaveURL(/\/dashboard\/directions\/finding/);
    await expect(page.getByTestId("finding")).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard\/opportunities$/, { timeout: 45_000 });
    expect(await gemini.countOf("EXPLORE_MORE")).toBe(1);
    const rows = await sql<{ n: string }>(
      "select count(*)::text as n from opportunities where user_id = $1",
      [user.id],
    );
    expect(Number(rows[0].n)).toBe(6);
    await expect(page.getByText(/variation/i).first()).toBeVisible();
  });

  test("a failing Gemini call shows an honest error and keeps the existing directions", async ({
    page,
    context,
  }) => {
    const user = await createUser();
    await signIn(context, user);
    await seedDirections(user.id);
    await gemini.failNext("EXPLORE_MORE", 3);
    await gotoApp(page, "/dashboard/opportunities");

    await page.getByTestId("explore-more-generate").click();
    await expect(page.getByTestId("finding-failed")).toContainText(
      "We couldn't find new directions",
      {
        timeout: 30_000,
      },
    );
    await expect(page.getByTestId("finding-retry")).toBeEnabled();
    await page.getByRole("link", { name: "Back to directions" }).click();
    await expect(page.getByTestId("opp-alternative")).toHaveCount(3);
    await expect(page.getByTestId("explore-more-generate")).toBeEnabled();
    await gemini.clearBehavior();
  });
});

test.describe("current-consultation rule", () => {
  test("the newest consultation is always the default; an older selection never silently replaces it", async ({
    page,
    context,
  }) => {
    const user = await createUser();
    await signIn(context, user);
    const older = await seedDirections(user.id, { createdAt: "2026-08-01T10:00:00Z" });
    // The founder chose a direction from the OLDER consultation…
    await sql(
      `update profiles set active_opportunity_id = $1, active_opportunity_set_at = $2 where id = $3`,
      [older.opportunityIds[0], "2026-08-02T10:00:00Z", user.id],
    );
    // …and later completed a NEWER consultation.
    const newer = await seedDirections(user.id, {
      createdAt: "2026-09-01T10:00:00Z",
      answers: {
        ...(await import("./helpers/seed")).STUDENT_ANSWERS,
        city: "Pune",
        state: "Maharashtra",
      },
    });

    await gotoApp(page, "/dashboard");
    await expect(page.getByTestId("flagship-card")).toBeVisible();
    expect(newer.titles).toContain(await page.locator("h1").innerText());
  });

  test("a deep link to an earlier consultation pins that view and says so", async ({
    page,
    context,
  }) => {
    const user = await createUser();
    await signIn(context, user);
    const older = await seedDirections(user.id, { createdAt: "2026-08-01T10:00:00Z" });
    await seedDirections(user.id, { createdAt: "2026-09-01T10:00:00Z" });

    await gotoApp(page, `/dashboard?consultation=${older.businessDnaId}`);
    await expect(page.getByTestId("earlier-consultation-banner")).toBeVisible();
  });
});
