import { expect, test, type Page } from "@playwright/test";

import { founderWithDirections, founderWithRoadmap } from "./helpers/flows";
import { gotoApp } from "./helpers/page";
import { appUrl, forbidRealBackends, gemini, resetStack, sql } from "./helpers/stack";

/**
 * Ask Sol can refresh the founder's directions with new context (owner, 2026-11-17, Job M):
 * new facts get a short "what I understood" and ONE button; nothing changes without the tap;
 * the tap applies the facts to a new copy of the answers (history kept), generates from it on
 * the generation screen, and the new directions become the current set — the earlier ones stay
 * under History, an existing roadmap is never deleted or changed.
 */
test.beforeEach(async ({ page }) => {
  forbidRealBackends(page);
  await resetStack();
});

async function ask(page: Page, text: string) {
  await page.getByTestId("ask-sol-input").fill(text);
  await page.getByTestId("ask-sol-send").click();
}

const dnaRows = (userId: string) =>
  sql<{ id: string; city: string | null; capital: string | null }>(
    `select id, onboarding_answers->>'city' as city, onboarding_answers->>'capitalBracket' as capital
       from business_dna where user_id = $1 order by created_at`,
    [userId],
  );

test("an ordinary question gets an ordinary answer; new facts get the offer — and nothing changes until the tap", async ({
  page,
  context,
}) => {
  test.setTimeout(150_000);
  const { user } = await founderWithDirections(context);
  await gotoApp(page, "/dashboard");
  await page.getByTestId("ask-sol-launcher").click();

  await ask(page, "What should I do first this week?");
  await expect(page.getByTestId("ask-sol-panel").locator("li").last()).toContainText(
    "Here is a direct answer",
    { timeout: 30_000 },
  );
  await expect(page.getByTestId("sol-facts")).toHaveCount(0);

  await ask(page, "I now have ₹2 lakh and I moved to Delhi.");
  const offer = page.getByTestId("sol-facts");
  await expect(offer).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("ask-sol-panel")).toContainText(
    "You now have ₹2 lakh to put in, you live in Delhi.",
  );
  await expect(offer).toContainText("Want me to find new directions with this?");
  await expect(page.getByTestId("sol-find-directions")).toHaveText("Find new directions");
  // No roadmap yet: no roadmap note.
  await expect(page.getByTestId("sol-facts-roadmap")).toHaveCount(0);

  // Nothing has changed: no generation, the same single consultation, the offer is only saved.
  expect(await gemini.countOf("INITIAL_INTELLIGENCE")).toBe(0);
  expect(await dnaRows(user.id)).toHaveLength(1);
  const saved = await sql<{ applied_at: string | null; patch: unknown }>(
    "select applied_at, patch from profile_fact_updates where user_id = $1",
    [user.id],
  );
  expect(saved).toHaveLength(1);
  expect(saved[0].applied_at).toBeNull();

  // The offer is still there after a reload.
  await page.reload();
  await page.getByTestId("ask-sol-launcher").click();
  await expect(page.getByTestId("sol-find-directions")).toBeVisible({ timeout: 30_000 });

  // The tap: one generation, on the generation screen, then the new set.
  await page.getByTestId("sol-find-directions").dblclick();
  await expect(page).toHaveURL(/\/dashboard\/directions\/finding/);
  await expect(page.getByTestId("finding")).toContainText(
    "Finding new directions with what you told Sol",
  );
  await expect(page).toHaveURL(/\/dashboard\/opportunities$/, { timeout: 60_000 });
  expect(await gemini.countOf("INITIAL_INTELLIGENCE")).toBe(1);

  const rows = await dnaRows(user.id);
  expect(rows).toHaveLength(2);
  // The old answers are kept exactly; the new ones carry the facts (₹2 lakh = the ₹2–5 lakh tier).
  expect(rows[0].city).not.toBe("Delhi");
  expect(rows[1]).toMatchObject({ city: "Delhi", capital: "4" });
  const applied = await sql<{ applied_dna_id: string }>(
    "select applied_dna_id from profile_fact_updates where user_id = $1",
    [user.id],
  );
  expect(applied[0].applied_dna_id).toBe(rows[1].id);
  // Nothing is deleted: the earlier three directions are still stored, and History shows both.
  const opps = await sql<{ n: string }>(
    "select count(*)::text as n from opportunities where user_id = $1",
    [user.id],
  );
  expect(Number(opps[0].n)).toBe(6);
  await gotoApp(page, "/dashboard/history");
  await expect(page.getByTestId("event-directions")).toHaveCount(2);
});

test("with a roadmap: warned first, and the roadmap is never deleted or changed", async ({
  page,
  context,
}) => {
  test.setTimeout(180_000);
  const { user } = await founderWithRoadmap(page, context);
  const before = await sql<{ id: string; status: string; updated_at: string }>(
    "select id, status, updated_at::text from roadmaps where user_id = $1",
    [user.id],
  );
  const tasksBefore = await sql<{ n: string }>(
    "select count(*)::text as n from roadmap_tasks where user_id = $1",
    [user.id],
  );
  await gotoApp(page, "/dashboard");
  await page.getByTestId("ask-sol-launcher").click();
  await ask(page, "My partner is a chef, so we could cook together.");
  await expect(page.getByTestId("sol-facts-roadmap")).toHaveText(
    "Your current roadmap stays. These are new options to compare.",
    { timeout: 30_000 },
  );
  await page.getByTestId("sol-find-directions").click();
  await expect(page).toHaveURL(/\/dashboard\/opportunities$/, { timeout: 60_000 });
  const after = await sql<{ id: string; status: string; updated_at: string }>(
    "select id, status, updated_at::text from roadmaps where user_id = $1",
    [user.id],
  );
  expect(after).toEqual(before);
  const tasksAfter = await sql<{ n: string }>(
    "select count(*)::text as n from roadmap_tasks where user_id = $1",
    [user.id],
  );
  expect(tasksAfter).toEqual(tasksBefore);
  // The partner fact reached the new answers in the founder's words.
  const notes = await sql<{ other: string }>(
    `select onboarding_answers->>'constraintsOther' as other from business_dna
       where user_id = $1 order by created_at desc limit 1`,
    [user.id],
  );
  expect(notes[0].other).toContain("My partner is a chef");
});

test("at the daily limit: a plain message, the facts stay saved, no generation", async ({
  page,
  context,
}) => {
  test.setTimeout(150_000);
  const { user } = await founderWithDirections(context);
  // Two more consultations today reach the limit of three.
  for (const n of [1, 2])
    await sql(
      `insert into business_dna (user_id, onboarding_answers, normalized_signals, founder_analysis, ai_model, profile_hash)
         select user_id, onboarding_answers, normalized_signals, founder_analysis, ai_model, profile_hash || '-${n}'
           from business_dna where user_id = $1 order by created_at limit 1`,
      [user.id],
    );
  await gotoApp(page, "/dashboard");
  await page.getByTestId("ask-sol-launcher").click();
  await ask(page, "I moved to Pune.");
  await page.getByTestId("sol-find-directions").click({ timeout: 30_000 });
  await expect(page.getByTestId("finding-failed")).toContainText(
    "You've used today's direction searches",
    { timeout: 30_000 },
  );
  await expect(page.getByTestId("finding-retry")).toHaveCount(0);
  expect(await gemini.countOf("INITIAL_INTELLIGENCE")).toBe(0);
  const saved = await sql<{ n: string }>(
    "select count(*)::text as n from profile_fact_updates where user_id = $1",
    [user.id],
  );
  expect(Number(saved[0].n)).toBe(1);
});

test("Hindi: the offer and its button", async ({ page, context }) => {
  test.setTimeout(150_000);
  await founderWithDirections(context);
  await context.addCookies([{ name: "solventia-locale", value: "hi", url: appUrl() }]);
  await gotoApp(page, "/dashboard");
  await page.getByTestId("ask-sol-launcher").click();
  await ask(page, "I now have ₹3 lakh.");
  await expect(page.getByTestId("sol-facts")).toContainText("क्या मैं इसके साथ नई दिशाएं खोजूं?", {
    timeout: 30_000,
  });
  await expect(page.getByTestId("sol-find-directions")).toHaveText("नई दिशाएं खोजें");
});
