import { expect, test, type BrowserContext } from "@playwright/test";

import { founderWithDirections } from "./helpers/flows";
import { gotoApp } from "./helpers/page";
import { STUDENT_ANSWERS } from "./helpers/seed";
import {
  appUrl,
  createUser,
  forbidRealBackends,
  gemini,
  resetStack,
  signIn,
  sql,
} from "./helpers/stack";

/**
 * "Find 3 more directions" (owner, 2026-11-17, Job N): prominent, a full-page generation screen
 * with real steps, and never a second generation — a double click, two tabs, or leaving and
 * coming back all show the ONE running job; "Try again" after a failure reuses that job.
 */
test.beforeEach(async ({ page }) => {
  forbidRealBackends(page);
  await resetStack();
});

const count = async (userId: string) =>
  Number(
    (
      await sql<{ n: string }>("select count(*)::text as n from opportunities where user_id = $1", [
        userId,
      ])
    )[0].n,
  );
const jobs = (userId: string) =>
  sql<{ id: string; status: string; kind: string; attempts: number }>(
    "select id, status, kind, attempts from generation_jobs where user_id = $1 order by created_at",
    [userId],
  );

async function founder(context: BrowserContext) {
  const { user } = await founderWithDirections(context);
  return user;
}

test("double click and rapid repeat clicks create exactly one generation of three", async ({
  page,
  context,
}) => {
  test.setTimeout(120_000);
  const user = await founder(context);
  await gemini.delay("EXPLORE_MORE", 3_000);
  await gotoApp(page, "/dashboard/opportunities");
  const cta = page.getByTestId("explore-more-generate");
  await expect(cta).toHaveText("Find 3 more directions");
  await expect(page.getByTestId("find-more")).toContainText("Takes a minute or two");
  await cta.dblclick();
  await expect(page).toHaveURL(/\/dashboard\/directions\/finding/);
  const finding = page.getByTestId("finding");
  await expect(finding).toContainText("Finding 3 more directions for you");
  await expect(finding).toContainText("This takes about a minute or two.");
  await expect(page.getByTestId("finding-steps").locator("li")).toHaveText([
    "Reading your answers",
    "Checking what fits",
    "Writing your directions",
  ]);
  // A second tab asking at the same moment gets the same job, never a second generation.
  const second = await context.newPage();
  forbidRealBackends(second);
  await gotoApp(second, "/dashboard/directions/finding?kind=more&start=true");
  await expect(second.getByTestId("finding")).toHaveAttribute("data-status", "running");
  await expect.poll(() => finding.getAttribute("data-job")).not.toBeNull();
  const jobId = (await finding.getAttribute("data-job"))!;
  await expect(second.getByTestId("finding")).toHaveAttribute("data-job", jobId);

  await expect(page).toHaveURL(/\/dashboard\/opportunities$/, { timeout: 45_000 });
  await expect(
    page.getByTestId("opp-alternative").or(page.getByTestId("opp-selected")),
  ).toHaveCount(3);
  expect(await gemini.countOf("EXPLORE_MORE")).toBe(1);
  expect(await count(user.id)).toBe(6);
  expect((await jobs(user.id)).map((j) => [j.kind, j.status])).toEqual([["more", "done"]]);
  // The earlier set stays under History.
  await expect(page.getByTestId("earlier-directions")).toBeVisible();
  await page.getByTestId("earlier-directions").click();
  await expect(page.getByTestId("more-set")).toHaveCount(1);
  await second.close();
  await gemini.clearBehavior();
});

test("leaving and coming back shows the same running job, never a new one", async ({
  page,
  context,
}) => {
  test.setTimeout(120_000);
  const user = await founder(context);
  await gemini.delay("EXPLORE_MORE", 8_000);
  await gotoApp(page, "/dashboard/opportunities");
  await page.getByTestId("explore-more-generate").click();
  const finding = page.getByTestId("finding");
  await expect(finding).toHaveAttribute("data-status", "running");
  await expect.poll(() => finding.getAttribute("data-job")).not.toBeNull();
  const jobId = await finding.getAttribute("data-job");

  // Leave, come back: the Directions page offers the running job's progress, not a new search.
  await gotoApp(page, "/dashboard");
  await gotoApp(page, "/dashboard/opportunities");
  await expect(page.getByTestId("explore-more-generate")).toHaveCount(0);
  await page.getByTestId("find-more-running").click();
  await expect(finding).toHaveAttribute("data-job", jobId ?? "");
  await expect(finding).toHaveAttribute("data-status", "running");
  await expect(page).toHaveURL(/\/dashboard\/opportunities$/, { timeout: 45_000 });
  expect(await gemini.countOf("EXPLORE_MORE")).toBe(1);
  expect((await jobs(user.id)).length).toBe(1);
  await gemini.clearBehavior();
});

test("a failure shows a plain error; Try again reuses the same job", async ({ page, context }) => {
  test.setTimeout(120_000);
  const user = await founder(context);
  await gemini.failNext("EXPLORE_MORE", 3);
  await gotoApp(page, "/dashboard/opportunities");
  await page.getByTestId("explore-more-generate").click();
  const failed = page.getByTestId("finding-failed");
  await expect(failed).toContainText("We couldn't find new directions", { timeout: 30_000 });
  await expect(failed).toContainText("Nothing was lost");
  const [first] = await jobs(user.id);
  expect(first.status).toBe("failed");

  await gemini.clearBehavior();
  await page.getByTestId("finding-retry").click();
  await expect(page).toHaveURL(/\/dashboard\/opportunities$/, { timeout: 45_000 });
  const after = await jobs(user.id);
  expect(after).toHaveLength(1);
  expect(after[0]).toMatchObject({ id: first.id, status: "done", attempts: 2 });
  expect(await count(user.id)).toBe(6);
});

test("Hindi: the button, the screen and its steps", async ({ page, context }) => {
  test.setTimeout(120_000);
  await founder(context);
  await gemini.delay("EXPLORE_MORE", 2_000);
  await context.addCookies([{ name: "solventia-locale", value: "hi", url: appUrl() }]);
  await gotoApp(page, "/dashboard/opportunities");
  await expect(page.getByTestId("explore-more-generate")).toHaveText("3 और दिशाएं खोजें");
  await page.getByTestId("explore-more-generate").click();
  await expect(page.getByTestId("finding")).toContainText("आपके लिए 3 और दिशाएं खोज रहे हैं");
  await expect(page.getByTestId("finding-steps")).toContainText("आपके जवाब पढ़ रहे हैं");
  await expect(page).toHaveURL(/\/dashboard\/opportunities$/, { timeout: 45_000 });
  await gemini.clearBehavior();
});

test("the first consultation submitted twice at once generates once", async ({ browser }) => {
  test.setTimeout(150_000);
  const user = await createUser({ fullName: "Riya Sharma" });
  const context = await browser.newContext();
  await signIn(context, user);
  await context.addInitScript((answers) => {
    localStorage.setItem(
      "solventia-consultation-v2",
      JSON.stringify({ answers, screenKey: "submit", savedAt: Date.now() }),
    );
  }, STUDENT_ANSWERS);
  await gemini.delay("INITIAL_INTELLIGENCE", 3_000);
  const a = await context.newPage();
  const b = await context.newPage();
  forbidRealBackends(a);
  forbidRealBackends(b);
  await Promise.all([gotoApp(a, "/consultation?submit=1"), gotoApp(b, "/consultation?submit=1")]);
  await expect(a).toHaveURL(/\/dashboard/, { timeout: 60_000 });
  await expect(b).toHaveURL(/\/dashboard/, { timeout: 60_000 });
  expect(await gemini.countOf("INITIAL_INTELLIGENCE")).toBe(1);
  expect(await count(user.id)).toBe(3);
  await context.close();
  await gemini.clearBehavior();
});
