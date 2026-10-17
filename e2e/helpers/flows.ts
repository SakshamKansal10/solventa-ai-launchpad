import { expect, type BrowserContext, type Page } from "@playwright/test";
import { gotoApp } from "./page";

import { seedDirections, type SeededDirections } from "./seed";
import { createUser, signIn, type TestUser } from "./stack";

export interface FounderWithRoadmap {
  user: TestUser;
  seeded: SeededDirections;
}

/** A signed-in founder whose consultation is done and directions are ready. */
export async function founderWithDirections(context: BrowserContext, name = "Asha Verma") {
  const user = await createUser({ fullName: name });
  await signIn(context, user);
  const seeded = await seedDirections(user.id);
  return { user, seeded };
}

/** Moves past the idea reveal's short opening line (shown once per consultation), if it shows. */
export async function skipRevealIntro(page: Page): Promise<void> {
  const intro = page.getByTestId("reveal-continue");
  await expect(intro.or(page.getByTestId("flagship-choose"))).toBeVisible({ timeout: 30_000 });
  if (await intro.isVisible()) await intro.click();
  await expect(page.getByTestId("flagship-choose")).toBeVisible();
}

/** Chooses the flagship direction and builds its roadmap through the real UI: one action —
 * "Build my roadmap" — chooses it, shows the roadmap being made, then opens it. */
export async function chooseAndBuildRoadmap(page: Page): Promise<void> {
  await gotoApp(page, "/dashboard");
  await skipRevealIntro(page);
  await page.getByTestId("flagship-choose").click();
  await expect(page).toHaveURL(/\/dashboard\/roadmap/, { timeout: 90_000 });
  await expect(page.getByTestId("roadmap-page")).toBeVisible({ timeout: 30_000 });
}

/** Records one learning on an open, in-progress mission that asks for evidence. */
export async function recordLearning(
  card: ReturnType<Page["getByTestId"]>,
  summary = "Said the follow-ups are dropped every week.",
): Promise<void> {
  await card.getByTestId("learning-summary").fill(summary);
  await card.getByTestId("learning-save").click();
  await expect(card).not.toHaveAttribute("data-evidence", "0", { timeout: 45_000 });
}

export async function founderWithRoadmap(page: Page, context: BrowserContext) {
  const f = await founderWithDirections(context);
  await chooseAndBuildRoadmap(page);
  return f;
}

/** Starts and completes every mission of the current week the way a founder
 * does: Start, say what was learned where the mission asks for it, Mark complete. */
export async function completeAllMissions(page: Page): Promise<void> {
  const cards = page.getByTestId("mission-card");
  // count() does not wait: on a freshly loaded page the cards are still loading.
  await expect(cards.first()).toBeVisible();
  const count = await cards.count();
  for (let i = 0; i < count; i++) {
    const card = cards.nth(i);
    if ((await card.getAttribute("data-state")) === "completed") continue;
    if ((await card.getAttribute("data-open")) !== "true") {
      await card.getByTestId("mission-toggle").click();
    }
    if ((await card.getAttribute("data-state")) === "not_started") {
      await card.getByTestId("mission-primary").click();
      await expect(card).toHaveAttribute("data-state", "in_progress");
    }
    const needsEvidence =
      (await card.getByTestId("learning-summary").count()) > 0 &&
      Number(await card.getAttribute("data-evidence")) === 0;
    if (needsEvidence) await recordLearning(card);
    await card.getByTestId("mission-complete").click();
    await expect(card).toHaveAttribute("data-state", "completed");
  }
}
