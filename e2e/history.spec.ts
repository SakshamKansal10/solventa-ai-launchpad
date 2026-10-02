import { expect, test } from "@playwright/test";
import { gotoApp } from "./helpers/page";

import { chooseAndBuildRoadmap } from "./helpers/flows";
import { seedDirections } from "./helpers/seed";
import { createUser, forbidRealBackends, resetStack, signIn, sql } from "./helpers/stack";

test.beforeEach(async ({ page }) => {
  forbidRealBackends(page);
  await resetStack();
});

/** An older consultation with a chosen direction and a live roadmap, then a NEWER
 * consultation whose directions have not been chosen yet. */
async function olderWithRoadmapThenNewer(
  page: import("@playwright/test").Page,
  context: import("@playwright/test").BrowserContext,
) {
  const user = await createUser({ fullName: "Asha Verma" });
  await signIn(context, user);
  const older = await seedDirections(user.id, { createdAt: "2026-08-01T10:00:00Z" });
  await chooseAndBuildRoadmap(page);
  // Completed AFTER the choice above, so it is genuinely the newest consultation.
  const newer = await seedDirections(user.id);
  return { user, older, newer };
}

test.describe("History", () => {
  test("lists every consultation with its date, profile summary, directions, choice and roadmap status", async ({
    page,
    context,
  }) => {
    const { older, newer } = await olderWithRoadmapThenNewer(page, context);
    await gotoApp(page, "/dashboard/history");
    const entries = page.getByTestId("history-entry");
    await expect(entries).toHaveCount(2);

    // Newest first, and only the newest is marked Current.
    await expect(entries.nth(0)).toHaveAttribute("data-current", "true");
    await expect(entries.nth(0)).toContainText("Current");
    await expect(entries.nth(1)).toHaveAttribute("data-current", "false");

    const oldEntry = entries.nth(1);
    await expect(oldEntry).toContainText("1 Aug 2026");
    await expect(oldEntry.getByTestId("history-profile")).toContainText("Haryana");
    await expect(oldEntry).toContainText("3 directions found");
    for (const title of older.titles) await expect(oldEntry).toContainText(title);
    await expect(oldEntry).toContainText("You chose");
    await expect(oldEntry).toContainText("Active"); // its roadmap
    // The newer consultation has nothing chosen yet.
    await expect(entries.nth(0)).toContainText("No direction chosen");
    for (const title of newer.titles) await expect(entries.nth(0)).toContainText(title);
    // Only an older consultation with a chosen direction can be restored.
    await expect(entries.nth(0).getByTestId("history-restore")).toHaveCount(0);
    await expect(oldEntry.getByTestId("history-restore")).toBeVisible();
  });

  test("Review opens that consultation without making it current", async ({ page, context }) => {
    const { older } = await olderWithRoadmapThenNewer(page, context);
    await gotoApp(page, "/dashboard/history");
    await page.getByTestId("history-entry").nth(1).getByTestId("history-review").click();
    await expect(page).toHaveURL(new RegExp(`consultation=${older.businessDnaId}`));
    await expect(page.getByTestId("earlier-consultation-banner")).toBeVisible();

    await gotoApp(page, "/dashboard");
    await expect(page.locator("h1")).toHaveText("Your directions are ready"); // still the newest
  });

  test("Restore Direction asks first; Cancel changes nothing; Confirm makes the older direction current and keeps its roadmap", async ({
    page,
    context,
  }) => {
    const { user, older } = await olderWithRoadmapThenNewer(page, context);
    await gotoApp(page, "/dashboard/history");
    const restore = page.getByTestId("history-entry").nth(1).getByTestId("history-restore");

    await restore.click();
    await expect(page.getByTestId("restore-dialog")).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByTestId("restore-dialog")).toBeHidden();
    await gotoApp(page, "/dashboard");
    await expect(page.locator("h1")).toHaveText("Your directions are ready");

    await gotoApp(page, "/dashboard/history");
    await page.getByTestId("history-entry").nth(1).getByTestId("history-restore").click();
    await page.getByTestId("confirm-restore").click();
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 30_000 });
    await expect(page.locator("h1")).toHaveText("Your next move is clear.", { timeout: 30_000 });

    const profile = await sql<{ active_opportunity_id: string | null }>(
      "select active_opportunity_id from profiles where id = $1",
      [user.id],
    );
    expect(older.opportunityIds).toContain(profile[0].active_opportunity_id);
    // Nothing was deleted: both consultations and their directions still exist.
    const counts = await sql<{ dna: string; opps: string }>(
      "select (select count(*)::text from business_dna where user_id = $1) as dna, (select count(*)::text from opportunities where user_id = $1) as opps",
      [user.id],
    );
    expect(counts[0]).toEqual({ dna: "2", opps: "6" });
  });

  test("a newer consultation is never displaced by an earlier restore: completing another one makes it the default again", async ({
    page,
    context,
  }) => {
    const { user } = await olderWithRoadmapThenNewer(page, context);
    await gotoApp(page, "/dashboard/history");
    await page.getByTestId("history-entry").nth(1).getByTestId("history-restore").click();
    await page.getByTestId("confirm-restore").click();
    await expect(page.locator("h1")).toHaveText("Your next move is clear.", { timeout: 30_000 });

    // A brand-new consultation completes AFTER the restore.
    await seedDirections(user.id);
    await gotoApp(page, "/dashboard");
    await expect(page.locator("h1")).toHaveText("Your directions are ready", { timeout: 30_000 });
  });

  test("an empty account shows an honest empty state", async ({ page, context }) => {
    const user = await createUser();
    await signIn(context, user);
    await gotoApp(page, "/dashboard/history");
    await expect(page.getByText("No history yet")).toBeVisible();
    await expect(page.getByRole("link", { name: "Find My Business Idea" })).toBeVisible();
  });
});
