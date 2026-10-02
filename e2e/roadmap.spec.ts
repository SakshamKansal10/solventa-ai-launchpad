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
  test("builds the skeleton and only Week 1's detail, then opens This Week", async ({
    page,
    context,
  }) => {
    const { user } = await founderWithDirections(context);
    await chooseAndBuildRoadmap(page);

    await expect(page.getByTestId("tab-week")).toHaveAttribute("data-state", "active");
    await expect(page.getByTestId("north-star")).toBeVisible();
    await expect(page.getByTestId("phase-strip").getByRole("listitem")).toHaveCount(5);
    await expect(page.getByTestId("mission-card")).toHaveCount(3);

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
    await page.getByTestId("flagship-choose").click();
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

test.describe("This Week", () => {
  test("mission states change, persist, and drive the week progress", async ({ page, context }) => {
    const { user } = await founderWithRoadmap(page, context);
    const first = page.getByTestId("mission-card").first();

    // The first mission opens on its own; the others stay compact.
    await expect(first).toHaveAttribute("data-open", "true");
    await expect(page.getByTestId("mission-card").nth(1)).toHaveAttribute("data-open", "false");
    // WHY / DO / CAPTURE are all there on the active mission.
    await expect(first.getByTestId("mission-details")).toContainText("Why");
    await expect(first.getByTestId("mission-details")).toContainText("Do");
    await expect(first.getByTestId("mission-details")).toContainText("Capture");

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

  test("a mission that asks for evidence cannot be completed without it", async ({
    page,
    context,
  }) => {
    await founderWithRoadmap(page, context);
    const second = page.getByTestId("mission-card").nth(1);
    await second.getByTestId("mission-toggle").click();
    await second.getByTestId("mission-primary").click();
    await expect(second).toHaveAttribute("data-state", "in_progress");
    await expect(second.getByTestId("mission-complete")).toBeDisabled();
    await expect(second.getByTestId("mission-evidence-hint")).toBeVisible();
    await expect(second.getByTestId("mission-add-proof")).toBeVisible();
  });

  test("the right rail shows progress, the success threshold, evidence, things to avoid and Ask Sol", async ({
    page,
    context,
  }) => {
    await founderWithRoadmap(page, context);
    const rail = page.getByTestId("week-rail");
    await expect(rail).toBeVisible();
    await expect(page.getByTestId("success-threshold")).toContainText("5 of 8");
    await expect(page.getByTestId("week-evidence")).toBeVisible();
    await expect(page.getByTestId("week-avoid")).toBeVisible();
    await expect(page.getByTestId("rail-ask-sol")).toBeVisible();
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

test.describe("Plan and Progress", () => {
  test("Plan lists every phase and week but only titles and objectives — never future missions", async ({
    page,
    context,
  }) => {
    await founderWithRoadmap(page, context);
    await page.getByTestId("tab-plan").click();
    await expect(page.getByTestId("plan-tab")).toBeVisible();
    await expect(page.getByTestId("plan-phase-1")).toBeVisible();

    // Open a later phase; it shows locked weeks with no mission cards.
    await page.getByTestId("plan-phase-3").getByRole("button").first().click();
    await expect(page.getByTestId("week-row-6")).toBeVisible();
    await expect(page.getByTestId("mission-card")).toHaveCount(0);
    expect(await gemini.countOf("WEEK_DETAIL")).toBe(1);
  });

  test("selecting a future phase previews it read-only and never generates anything", async ({
    page,
    context,
  }) => {
    await founderWithRoadmap(page, context);
    await page.getByTestId("phase-4").click();
    await expect(page.getByTestId("phase-preview")).toBeVisible();
    expect(await gemini.countOf("WEEK_DETAIL")).toBe(1);
  });

  test("Progress shows an honest empty state until there is real data", async ({
    page,
    context,
  }) => {
    await founderWithRoadmap(page, context);
    await page.getByTestId("tab-progress").click();
    await expect(page.getByTestId("progress-empty")).toBeVisible();
    await expect(page.getByTestId("progress-tab")).toHaveCount(0);
  });
});
