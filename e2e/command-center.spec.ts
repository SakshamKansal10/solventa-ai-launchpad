import { expect, test } from "@playwright/test";
import { gotoApp } from "./helpers/page";

import { seedDirections } from "./helpers/seed";
import { createUser, forbidRealBackends, gemini, resetStack, signIn, sql } from "./helpers/stack";

test.beforeEach(async ({ page }) => {
  forbidRealBackends(page);
  await resetStack();
});

test.describe("Command Center — state A: directions ready", () => {
  test("shows one flagship, two alternatives and a single Explore More button — no scores", async ({
    page,
    context,
  }) => {
    const user = await createUser({ fullName: "Asha Verma" });
    await signIn(context, user);
    const seeded = await seedDirections(user.id);
    await gotoApp(page, "/dashboard");

    await expect(page.locator("h1")).toHaveText("Your directions are ready");
    await expect(page.getByTestId("flagship-card")).toBeVisible();
    await expect(page.getByTestId("alternative-card")).toHaveCount(2);
    await expect(page.getByTestId("explore-more")).toHaveCount(1);

    // No numeric fit score, percentage or Business DNA anywhere on the screen.
    const text = await page.getByTestId("command-center").innerText();
    expect(text).not.toMatch(/\d+\s?%/);
    expect(text).not.toMatch(/Business DNA/i);
    expect(text).not.toMatch(/\b\d{2}\s*\/\s*100\b/);
    // The flagship is one of the seeded directions.
    const flagship = await page.getByTestId("flagship-card").innerText();
    expect(seeded.titles.some((t) => flagship.includes(t))).toBe(true);
  });

  test("choosing a direction moves to state B and offers to build the roadmap", async ({
    page,
    context,
  }) => {
    const user = await createUser();
    await signIn(context, user);
    await seedDirections(user.id);
    await gotoApp(page, "/dashboard");

    await page.getByTestId("flagship-choose").click();
    await expect(page.locator("h1")).toHaveText("Your direction is chosen");
    await expect(page.getByTestId("chosen-direction")).toBeVisible();
    await expect(page.getByTestId("build-roadmap")).toBeEnabled();
    // Survives a reload (it is saved, not just local state).
    await page.reload();
    await expect(page.locator("h1")).toHaveText("Your direction is chosen");
  });

  test("Explore More adds new directions through one Gemini call and lands on the Opportunities list", async ({
    page,
    context,
  }) => {
    const user = await createUser();
    await signIn(context, user);
    await seedDirections(user.id);
    await gotoApp(page, "/dashboard");
    await expect(page.getByTestId("alternative-card")).toHaveCount(2);

    await page.getByTestId("explore-more").click();
    await expect(page).toHaveURL(/\/dashboard\/opportunities/, { timeout: 30_000 });
    expect(await gemini.countOf("EXPLORE_MORE")).toBe(1);
    const rows = await sql<{ n: string }>(
      "select count(*)::text as n from opportunities where user_id = $1",
      [user.id],
    );
    expect(Number(rows[0].n)).toBeGreaterThan(3);
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
    await gotoApp(page, "/dashboard");

    await page.getByTestId("explore-more").click();
    await expect(page.getByText(/couldn't find more directions/i)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("alternative-card")).toHaveCount(2);
    await expect(page.getByTestId("explore-more")).toBeEnabled();
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
    await expect(page.locator("h1")).toHaveText("Your directions are ready");
    const flagship = await page.getByTestId("flagship-card").innerText();
    expect(newer.titles.some((t) => flagship.includes(t))).toBe(true);
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
