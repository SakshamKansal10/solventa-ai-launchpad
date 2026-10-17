import { expect, test } from "@playwright/test";
import { gotoApp } from "./helpers/page";

import { founderWithRoadmap, skipRevealIntro } from "./helpers/flows";
import { seedDirections } from "./helpers/seed";
import { createUser, forbidRealBackends, gemini, resetStack, signIn, sql } from "./helpers/stack";

test.beforeEach(async ({ page }) => {
  forbidRealBackends(page);
  await resetStack();
});

test.describe("Command Center — state A: the idea reveal", () => {
  test("opens with one line, then one flagship, two smaller alternatives and a single Explore More — no scores", async ({
    page,
    context,
  }) => {
    const user = await createUser({ fullName: "Asha Verma" });
    await signIn(context, user);
    const seeded = await seedDirections(user.id);
    await gotoApp(page, "/dashboard");

    await expect(page.getByTestId("reveal-continue")).toBeVisible();
    await skipRevealIntro(page);
    await expect(page.getByTestId("flagship")).toBeVisible();
    await expect(page.getByTestId("first-offer")).toBeVisible();
    await expect(page.getByTestId("alternative")).toHaveCount(2);
    await expect(page.getByTestId("explore-more")).toHaveCount(1);

    // No numeric fit score, percentage or Business DNA anywhere on the screen.
    const text = await page.getByTestId("command-center").innerText();
    expect(text).not.toMatch(/\d+\s?%/);
    expect(text).not.toMatch(/Business DNA/i);
    expect(text).not.toMatch(/\b\d{2}\s*\/\s*100\b/);
    // The flagship is one of the seeded directions.
    const flagship = await page.getByTestId("flagship-title").innerText();
    expect(seeded.titles.some((t) => flagship.toLowerCase() === t.toLowerCase())).toBe(true);

    // The opening line plays once per consultation.
    await page.reload();
    await expect(page.getByTestId("flagship")).toBeVisible();
    await expect(page.getByTestId("reveal-continue")).toHaveCount(0);
  });

  test("Compare all 3 puts the directions side by side in plain words", async ({
    page,
    context,
  }) => {
    const user = await createUser();
    await signIn(context, user);
    const seeded = await seedDirections(user.id);
    await gotoApp(page, "/dashboard");
    await skipRevealIntro(page);

    await page.getByTestId("compare-all").click();
    const table = page.getByTestId("compare-table");
    await expect(table).toBeVisible();
    for (const title of seeded.titles.slice(0, 3)) await expect(table).toContainText(title);
    await expect(table).not.toContainText("%");
  });

  test("Explore More adds new directions through one Gemini call and lands on the Opportunities list", async ({
    page,
    context,
  }) => {
    const user = await createUser();
    await signIn(context, user);
    await seedDirections(user.id);
    await gotoApp(page, "/dashboard");
    await skipRevealIntro(page);
    await expect(page.getByTestId("alternative")).toHaveCount(2);

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
    await skipRevealIntro(page);

    await page.getByTestId("explore-more").click();
    await expect(page.getByText(/couldn't find more directions/i)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("alternative")).toHaveCount(2);
    await expect(page.getByTestId("explore-more")).toBeEnabled();
    await gemini.clearBehavior();
  });
});

test.describe("Command Center — state B: a direction chosen, no roadmap yet", () => {
  test("offers one clear next step — build the roadmap — and survives a reload", async ({
    page,
    context,
  }) => {
    const user = await createUser();
    await signIn(context, user);
    const seeded = await seedDirections(user.id);
    // Chosen (as "Build my roadmap" chooses it), but the roadmap was never built.
    await sql(`update opportunities set status = 'selected' where id = $1`, [
      seeded.opportunityIds[0],
    ]);
    await gotoApp(page, "/dashboard");

    await expect(page.getByTestId("command-center")).toHaveAttribute(
      "data-stage",
      "direction_selected",
    );
    await expect(page.getByTestId("surface-direction")).toHaveText(seeded.titles[0], {
      ignoreCase: true,
    });
    await expect(page.getByTestId("build-roadmap")).toBeEnabled();
    await page.reload();
    await expect(page.getByTestId("build-roadmap")).toBeEnabled();
  });
});

test.describe("Command Center — state C: a roadmap is running", () => {
  test("says the next move in one line, with one action — supporting detail after it", async ({
    page,
    context,
  }) => {
    await founderWithRoadmap(page, context);
    await gotoApp(page, "/dashboard");

    await expect(page.getByTestId("greeting")).not.toBeEmpty();
    await expect(page.getByTestId("current-mission")).toHaveText("Write your interview script");
    await expect(page.getByTestId("start-mission")).toBeVisible();
    // Supporting content: the direction, at most three priorities, what changed.
    await expect(page.getByTestId("current-direction")).toBeVisible();
    await expect(page.getByTestId("command-graphic")).toBeVisible();
    await expect(page.getByTestId("this-week").getByTestId("track-node")).toHaveCount(3);
    await expect(page.getByTestId("what-changed")).toBeVisible();

    // The one action opens that mission on the roadmap.
    await page.getByTestId("start-mission").click();
    await expect(page).toHaveURL(/\/dashboard\/roadmap/);
    await expect(page.getByTestId("mission-card").first()).toHaveAttribute("data-open", "true");
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
    await skipRevealIntro(page);
    const flagship = await page.getByTestId("flagship-title").innerText();
    expect(newer.titles.some((t) => flagship.toLowerCase() === t.toLowerCase())).toBe(true);
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
