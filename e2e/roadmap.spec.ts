import { expect, test } from "@playwright/test";
import { gotoApp } from "./helpers/page";

import {
  chooseAndBuildRoadmap,
  completeAllMissions,
  founderWithDirections,
  founderWithRoadmap,
} from "./helpers/flows";
import { forbidRealBackends, gemini, resetStack, sql } from "./helpers/stack";

test.beforeEach(async ({ page }) => {
  forbidRealBackends(page);
  await resetStack();
});

test.describe("building a roadmap", () => {
  test("builds the skeleton and only Week 1's detail, then opens the roadmap on this week", async ({
    page,
    context,
  }) => {
    const { user } = await founderWithDirections(context);
    await chooseAndBuildRoadmap(page);

    await expect(page.locator("h1")).toHaveText("Your 12-week roadmap");
    await expect(page.getByTestId("north-star")).toBeVisible();
    // Every phase is on the navy block (Validate → Build → Elevate), none hidden; the arc
    // has the roadmap's real length and marks week 1.
    await expect(page.getByTestId("phase-cards").getByRole("listitem")).toHaveCount(5);
    await expect(page.getByTestId("phase-1")).toHaveAttribute("aria-current", "step");
    await expect(page.getByTestId("arc-current")).toHaveAttribute("data-week", "1");
    await expect(page.getByTestId("mission-card")).toHaveCount(3);
    // Removed: the tabs, the rail and the week pager.
    for (const id of ["tab-week", "tab-plan", "tab-progress", "week-rail"])
      await expect(page.getByTestId(id)).toHaveCount(0);

    const roadmaps = await sql<{ status: string }>(
      "select status from roadmaps where user_id = $1",
      [user.id],
    );
    expect(roadmaps).toHaveLength(1);
    expect(roadmaps[0].status).toBe("active");
    const weeks = await sql<{ n: string }>(
      "select count(*)::text as n from roadmap_weeks where user_id = $1",
      [user.id],
    );
    expect(Number(weeks[0].n)).toBe(12);
    // Just-in-time: only Week 1 has tasks; the other eleven are skeleton titles.
    const tasks = await sql<{ n: string }>(
      "select count(*)::text as n from roadmap_tasks where user_id = $1",
      [user.id],
    );
    expect(Number(tasks[0].n)).toBe(3);
    expect(await gemini.countOf("ROADMAP_SKELETON")).toBe(1);
    expect(await gemini.countOf("WEEK_DETAIL")).toBe(1);
  });

  test("a failed build is reported honestly and can be retried without duplicating anything", async ({
    page,
    context,
  }) => {
    const { user } = await founderWithDirections(context);
    await gemini.failNext("ROADMAP_SKELETON", 2);
    await gotoApp(page, "/dashboard");
    // The recommended direction is reviewed, then chosen on its own page.
    await page.getByTestId("flagship-explore").click();
    await page.getByTestId("choose-direction").click();
    await expect(page.getByTestId("build-roadmap")).toBeVisible();
    await gotoApp(page, "/dashboard");
    await page.getByTestId("build-roadmap").click();

    await expect(page.getByTestId("build-failed")).toBeVisible({ timeout: 60_000 });
    await gemini.clearBehavior();
    await page.getByTestId("retry-build").click();
    await expect(page).toHaveURL(/\/dashboard\/roadmap(\?|$)/, { timeout: 60_000 });
    await expect(page.getByTestId("mission-card").first()).toBeVisible({ timeout: 30_000 });

    const roadmaps = await sql<{ status: string }>(
      "select status from roadmaps where user_id = $1",
      [user.id],
    );
    expect(roadmaps).toHaveLength(1);
    expect(roadmaps[0].status).toBe("active");
  });
});

test.describe("This week and the mission page", () => {
  test("Start opens the mission's own page in progress; Mark as done persists and moves the week on", async ({
    page,
    context,
  }) => {
    const { user } = await founderWithRoadmap(page, context);
    const first = page.getByTestId("mission-card").first();
    // Only the next mission has the blue Start; the others offer Open.
    await expect(page.getByTestId("mission-primary")).toHaveCount(1);
    await expect(page.getByTestId("mission-open")).toHaveCount(2);

    await first.getByTestId("mission-primary").click();
    const mission = page.getByTestId("mission-page");
    await expect(mission).toHaveAttribute("data-state", "in_progress");
    // No main navigation on a mission page; the steps and "done when" are there.
    await expect(page.getByTestId("topnav")).toHaveCount(0);
    await expect(page.getByTestId("mission-details")).toBeVisible();
    await expect(page.getByText("You are done when")).toBeVisible();

    await page.getByTestId("mission-complete").click();
    await expect(mission).toHaveAttribute("data-state", "completed");
    await page.getByTestId("back-to-week").click();
    await expect(first).toHaveAttribute("data-state", "completed");
    await expect(first).toContainText("Completed");
    await expect(page.getByTestId("week-progress")).toContainText("1 of 3");

    await expect
      .poll(
        async () =>
          (
            await sql<{ status: string }>(
              "select status from roadmap_tasks where user_id = $1 order by order_index limit 1",
              [user.id],
            )
          )[0].status,
      )
      .toBe("done");

    await page.reload();
    await expect(page.getByTestId("mission-card").first()).toHaveAttribute(
      "data-state",
      "completed",
    );
  });

  test("what the old rail held lives where it is used: the threshold on Today, things to avoid and Ask Sol on the mission page", async ({
    page,
    context,
  }) => {
    await founderWithRoadmap(page, context);
    await gotoApp(page, "/dashboard");
    await expect(page.getByTestId("success-threshold")).toContainText("5 of 8");
    await page.getByTestId("start-mission").click();
    await expect(page.getByTestId("mission-page")).toBeVisible();
    await expect(page.getByTestId("week-avoid")).toBeVisible();
    await page.getByTestId("ask-sol-launcher").click();
    await expect(page.getByTestId("ask-sol-panel")).toBeVisible();
  });

  test("finishing the week, reviewing it and preparing Week 02 creates exactly one Week 02 — even on a double click", async ({
    page,
    context,
  }) => {
    const { user } = await founderWithRoadmap(page, context);
    await completeAllMissions(page);
    await expect(page.getByTestId("ready-to-close")).toBeVisible();

    await page.getByTestId("review-week").click();
    await expect(page.getByTestId("review-week-dialog")).toBeVisible();
    // The submit button is disabled until the founder says how it went.
    await expect(page.getByTestId("prepare-next-week")).toBeDisabled();
    await page.getByTestId("outcome-stronger").click();
    await page.getByTestId("blocker-nothing").click();
    await page.getByTestId("review-note").fill("Five of eight people described the same pain.");
    const prepare = page.getByTestId("prepare-next-week");
    await expect(prepare).toBeEnabled();
    await prepare.dblclick();

    await expect(page.getByTestId("week-title")).toContainText("week 2", {
      ignoreCase: true,
      timeout: 60_000,
    });
    await expect(page.getByTestId("adaptation-note")).toContainText("went stronger");

    const detail = await sql<{ week_number: string; tasks: string; status: string }>(
      `select w.global_number::text as week_number, (select count(*)::text from roadmap_tasks t where t.week_id = w.id) as tasks, w.status
       from roadmap_weeks w where w.user_id = $1 and w.global_number in (1, 2) order by w.global_number`,
      [user.id],
    );
    expect(detail.map((d) => d.status)).toEqual(["completed", "active"]);
    expect(Number(detail[1].tasks)).toBe(3);
    // One Gemini call for Week 1 and exactly one for Week 2.
    expect(await gemini.countOf("WEEK_DETAIL")).toBe(2);
    const reflection = await sql<{ reflection_outcome: string | null }>(
      "select reflection_outcome from roadmap_weeks where user_id = $1 and global_number = 1",
      [user.id],
    );
    expect(reflection[0].reflection_outcome).toBe("stronger");
  });

  test("if Week 02 cannot be written, the week is still closed and it can be retried", async ({
    page,
    context,
  }) => {
    await founderWithRoadmap(page, context);
    await completeAllMissions(page);
    await gemini.failNext("WEEK_DETAIL", 4);
    await page.getByTestId("review-week").click();
    await page.getByTestId("outcome-as_expected").click();
    await page.getByTestId("prepare-next-week").click();

    await expect(page.getByTestId("retry-week")).toBeVisible({ timeout: 60_000 });
    await gemini.clearBehavior();
    await page.getByTestId("retry-week").click();
    await expect(page.getByTestId("mission-card").first()).toBeVisible({ timeout: 60_000 });
  });
});

test.describe("the whole roadmap", () => {
  test("every phase is shown with its weeks; later phases depend on what you learn; only this week has missions", async ({
    page,
    context,
  }) => {
    await founderWithRoadmap(page, context);
    const phases = page.getByTestId("phase-cards").getByRole("listitem");
    await expect(phases.first()).toContainText("You are here");
    await expect(phases.nth(2)).toContainText("Depends on what you learn");
    await expect(page.getByTestId("mission-card")).toHaveCount(3);
    expect(await gemini.countOf("WEEK_DETAIL")).toBe(1);
  });
});
