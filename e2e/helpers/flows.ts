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
  // The recommended direction is reviewed, then chosen on its own page.
  await page.getByTestId("flagship-explore").click();
  await page.getByTestId("choose-direction").click();
  await expect(page.getByTestId("build-roadmap")).toBeVisible();
  await gotoApp(page, "/dashboard");
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

/** Completes every mission of the current week the way a founder does: Start (or Open) on
 * the Roadmap, Mark as done on the mission's own page, back to the week. Ends on the Roadmap. */
export async function completeAllMissions(page: Page): Promise<void> {
  const cards = page.getByTestId("mission-card");
  // count() does not wait: on a freshly loaded page the cards are still loading.
  await expect(cards.first()).toBeVisible();
  const count = await cards.count();
  for (let i = 0; i < count; i++) {
    const card = page.getByTestId("mission-card").nth(i);
    if ((await card.getAttribute("data-state")) === "completed") continue;
    await card.getByRole("link").click();
    const mission = page.getByTestId("mission-page");
    await expect(mission).toBeVisible();
    await page.getByTestId("mission-complete").click();
    await expect(mission).toHaveAttribute("data-state", "completed");
    await page.getByTestId("back-to-week").click();
    await expect(page.getByTestId("roadmap-page")).toBeVisible();
    await expect(page.getByTestId("mission-card").nth(i)).toHaveAttribute(
      "data-state",
      "completed",
    );
  }
}
