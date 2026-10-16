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

/** Chooses the flagship direction and builds its roadmap through the real UI. */
export async function chooseAndBuildRoadmap(page: Page): Promise<void> {
  await gotoApp(page, "/dashboard");
  await page.getByTestId("flagship-choose").click();
  await expect(page.getByTestId("build-roadmap")).toBeEnabled();
  await page.getByTestId("build-roadmap").click();
  await expect(page).toHaveURL(/\/dashboard\/roadmap/, { timeout: 60_000 });
  await expect(page.getByTestId("roadmap-page")).toBeVisible({ timeout: 30_000 });
}

export async function founderWithRoadmap(page: Page, context: BrowserContext) {
  const f = await founderWithDirections(context);
  await chooseAndBuildRoadmap(page);
  return f;
}

/** Starts and completes every mission of the current week the way a founder
 * does: Start, capture evidence where the mission asks for it, Mark complete. */
export async function completeAllMissions(page: Page): Promise<void> {
  const cards = page.getByTestId("mission-card");
  // count() does not wait: on a freshly loaded page the cards are still loading.
  await expect(cards.first()).toBeVisible();
  const count = await cards.count();
  for (let i = 0; i < count; i++) {
    let card = cards.nth(i);
    if ((await card.getAttribute("data-state")) === "completed") continue;
    if ((await card.getAttribute("data-open")) !== "true") {
      await card.getByTestId("mission-toggle").click();
    }
    if ((await card.getAttribute("data-state")) === "not_started") {
      await card.getByTestId("mission-primary").click();
      await expect(card).toHaveAttribute("data-state", "in_progress");
    }
    const needsEvidence =
      (await card.getByTestId("mission-add-proof").count()) > 0 &&
      Number(await card.getAttribute("data-evidence")) === 0;
    if (needsEvidence) {
      await card.getByTestId("mission-add-proof").click();
      await expect(page.getByTestId("evidence-dialog")).toBeVisible({ timeout: 45_000 });
      await page.getByTestId("ev-person").fill("Customer");
      await page.getByTestId("ev-summary").fill("Said the follow-ups are dropped every week.");
      await page.getByTestId("ev-save").click();
      await expect(page.getByTestId("evidence-dialog")).toBeHidden();
      await gotoApp(page, "/dashboard/roadmap");
      card = page.getByTestId("mission-card").nth(i);
      await expect(card).toBeVisible();
      if ((await card.getAttribute("data-open")) !== "true") {
        await card.getByTestId("mission-toggle").click();
      }
    }
    await card.getByTestId("mission-complete").click();
    await expect(card).toHaveAttribute("data-state", "completed");
  }
}
