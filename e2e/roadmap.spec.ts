import { expect, test } from "@playwright/test";
import { gotoApp } from "./helpers/page";

import {
  chooseAndBuildRoadmap,
  completeAllMissions,
  founderWithDirections,
  founderWithRoadmap,
  recordLearning,
  skipRevealIntro,
} from "./helpers/flows";
import { forbidRealBackends, gemini, resetStack, sql } from "./helpers/stack";

test.beforeEach(async ({ page }) => {
  forbidRealBackends(page);
  await resetStack();
});

test.describe("building a roadmap", () => {
  test("builds the skeleton and only Week 1's detail, then opens This Week", async ({
    page,
    context,
  }) => {
    const { user } = await founderWithDirections(context);
    await chooseAndBuildRoadmap(page);

    // One page: where it goes (north star, Validate → Build → Elevate), this week's mission,
    // its missions, then the whole plan (five phases) disclosed below.
    await expect(page.getByTestId("north-star")).toBeVisible();
    await expect(page.getByTestId("roadmap-route").getByRole("listitem")).toHaveCount(3);
    await expect(page.getByTestId("current-mission-hero")).toBeVisible();
    await expect(page.getByTestId("mission-card")).toHaveCount(3);
    await expect(page.getByTestId("route-phase")).toHaveCount(5);

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
    await skipRevealIntro(page);
    await page.getByTestId("flagship-choose").click();

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

test.describe("This Week", () => {
  test("mission states change, persist, and drive the week progress", async ({ page, context }) => {
    const { user } = await founderWithRoadmap(page, context);
    const first = page.getByTestId("mission-card").first();

    // The first mission opens on its own; the others stay compact.
    await expect(first).toHaveAttribute("data-open", "true");
    await expect(page.getByTestId("mission-card").nth(1)).toHaveAttribute("data-open", "false");
    // WHY / DO / WHAT DONE LOOKS LIKE are all there on the active mission.
    await expect(first.getByTestId("mission-details")).toContainText("Why");
    await expect(first.getByTestId("mission-details")).toContainText("Do");
    await expect(first.getByTestId("mission-details")).toContainText("You're done when");

    await first.getByTestId("mission-primary").click();
    await expect(first).toHaveAttribute("data-state", "in_progress");
    await first.getByTestId("mission-complete").click();
    await expect(first).toHaveAttribute("data-state", "completed");
    await expect(first).toContainText("Completed");
    await expect(page.getByTestId("week-progress")).toContainText("1");

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

  test("a mission that asks for evidence is finished by saying what was learned — right there", async ({
    page,
    context,
  }) => {
    const { user } = await founderWithRoadmap(page, context);
    const second = page.getByTestId("mission-card").nth(1);
    await second.getByTestId("mission-toggle").click();
    // Not started: no form yet, one action.
    await expect(second.getByTestId("learning-summary")).toHaveCount(0);
    await second.getByTestId("mission-primary").click();
    await expect(second).toHaveAttribute("data-state", "in_progress");
    await expect(second.getByTestId("mission-complete")).toBeDisabled();
    await expect(second.getByTestId("mission-evidence-hint")).toBeVisible();

    // One plain question — no evidence database to manage.
    await recordLearning(second, "Six of eight said they lose walk-in customers without a site.");
    await expect(second.getByTestId("mission-learning")).toContainText("1");
    const saved = await sql<{ n: string }>(
      "select count(*)::text as n from proof_evidence e join roadmap_tasks t on t.id = e.task_id where e.user_id = $1",
      [user.id],
    );
    expect(Number(saved[0].n)).toBe(1);

    await second.getByTestId("mission-complete").click();
    await expect(second).toHaveAttribute("data-state", "completed");
  });

  test("this week shows what done looks like, help to do it, and Ask Sol in context", async ({
    page,
    context,
  }) => {
    await founderWithRoadmap(page, context);
    await expect(page.getByTestId("success-threshold")).toContainText("5 of 8");
    const help = page.getByTestId("mission-help");
    await expect(help).toContainText("What to say");
    await expect(help).toContainText("If nobody responds");
    await help.getByRole("button", { name: /what to say/i }).click();
    await help.getByRole("button", { name: /write it for me/i }).click();
    await expect(page.getByTestId("ask-sol-panel")).toBeVisible();
  });

  test("the hero's action brings this week's mission forward", async ({ page, context }) => {
    await founderWithRoadmap(page, context);
    await page.getByTestId("start-week-mission").click();
    const first = page.getByTestId("mission-card").first();
    await expect(first).toHaveAttribute("data-open", "true");
    await expect(first).toHaveAttribute("data-state", "in_progress");
    await expect(first).toBeInViewport();
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

test.describe("What comes next", () => {
  test("next week is one line, and it opens only when this week is done", async ({
    page,
    context,
  }) => {
    await founderWithRoadmap(page, context);
    const next = page.getByTestId("route-next");
    await expect(next).toContainText("Week 02");
    await expect(next).toContainText("Opens when this week is done");
  });

  test("the whole plan discloses every phase's weeks — titles only, never future missions", async ({
    page,
    context,
  }) => {
    await founderWithRoadmap(page, context);
    const phases = page.getByTestId("route-phase");
    await expect(phases.first()).toHaveAttribute("data-state", "now");
    await expect(phases.nth(2)).toHaveAttribute("data-state", "later");

    // Open a later phase: its weeks are listed, locked (nothing to open), and nothing is written.
    await phases.nth(2).getByRole("button").first().click();
    await expect(phases.nth(2)).toContainText("Build the first version: week 1");
    await expect(phases.nth(2).getByRole("button", { name: /open week/i })).toHaveCount(0);
    await expect(page.getByTestId("mission-card")).toHaveCount(3);
    expect(await gemini.countOf("WEEK_DETAIL")).toBe(1);
  });
});
