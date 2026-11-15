import { expect, test } from "@playwright/test";
import { gotoApp } from "./helpers/page";

import { chooseAndBuildRoadmap, founderWithDirections } from "./helpers/flows";
import { seedDirections } from "./helpers/seed";
import { forbidRealBackends, gemini, resetStack, sql } from "./helpers/stack";

test.beforeEach(async ({ page }) => {
  forbidRealBackends(page);
  await resetStack();
});

test.describe("Directions", () => {
  test("one card per direction, the recommended one first on navy, each with a fit bar and one Open button", async ({
    page,
    context,
  }) => {
    await founderWithDirections(context);
    await gotoApp(page, "/dashboard/opportunities");
    await expect(page.locator("h1")).toHaveText("3 directions. Choose one to test.");
    await expect(
      page.getByTestId("topnav").getByRole("link", { name: "Directions" }),
    ).toHaveAttribute("aria-current", "page");
    await expect(page.getByText(/\bIdeas\b/)).toHaveCount(0);

    // Nothing chosen yet: three cards, the recommended one first.
    const cards = page.getByTestId("opp-alternative");
    await expect(cards).toHaveCount(3);
    await expect(page.getByTestId("opp-selected")).toHaveCount(0);
    await expect(cards.first()).toHaveAttribute("data-lead", "true");
    await expect(cards.first()).toContainText("Recommended");
    await expect(page.getByTestId("fit-bar")).toHaveCount(3);
    await expect(page.getByTestId("fit-legend")).toHaveCount(1);
    // Removed: search, filters, compare table, and Choose on cards (choosing is on the detail page).
    for (const id of ["opp-search", "opp-filters", "direction-compare"])
      await expect(page.getByTestId(id)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Choose" })).toHaveCount(0);
    for (const label of await page.getByTestId("fit-label").allInnerTexts())
      expect(label).not.toMatch(/\d+\s?%/);

    await cards.first().getByTestId("open-direction").click();
    await page.getByTestId("choose-direction").click();
    await expect(page.getByTestId("build-roadmap")).toBeVisible();
    await gotoApp(page, "/dashboard/opportunities");
    await expect(page.getByTestId("opp-selected")).toHaveCount(1);
    await expect(page.getByTestId("opp-selected")).toContainText("Your direction");
    await expect(page.getByTestId("opp-alternative")).toHaveCount(2);
  });

  test("detail: headline, one primary action, fit summary, the idea in four lines, the first test, and two sub-pages", async ({
    page,
    context,
  }) => {
    const { seeded } = await founderWithDirections(context);
    await gotoApp(page, `/dashboard/opportunities/${seeded.opportunityIds[0]}`);
    await expect(page.getByTestId("opportunity-title")).toBeVisible();
    await expect(page.getByRole("tab")).toHaveCount(0);
    await expect(page.getByTestId("fit-summary")).toBeVisible();
    for (const block of ["customer", "problem", "offer", "earn"]) {
      await expect(page.getByTestId(`block-${block}`)).toBeVisible();
    }
    await expect(page.getByTestId("first-test")).toBeVisible();
    await page.getByTestId("link-fit").click();
    await expect(page).toHaveURL(/\/fit$/);
    await expect(page.getByTestId("founder-fit")).toBeVisible();
    await page.goBack();
    await page.getByTestId("link-market").click();
    await expect(page).toHaveURL(/\/market$/);
    await expect(page.getByTestId("market-tab")).toBeVisible();
    // Old tab deep links land on the sub-pages.
    await gotoApp(page, `/dashboard/opportunities/${seeded.opportunityIds[0]}?tab=fit`);
    await expect(page).toHaveURL(/\/fit$/);
  });

  test("Founder Fit is qualitative: one canonical label, five factor rows with reasons, advantages and gaps — no numbers", async ({
    page,
    context,
  }) => {
    const { seeded } = await founderWithDirections(context);
    await gotoApp(page, `/dashboard/opportunities/${seeded.opportunityIds[0]}/fit`);
    await expect(page.getByTestId("founder-fit")).toBeVisible();
    await expect(page.getByTestId("fit-overall")).toHaveText(
      /^((Strong|Moderate|Conditional|Weak) fit|Provisional — more information needed)\. /,
    );
    for (const row of ["access", "resources", "capability", "time", "goals"]) {
      await expect(page.getByTestId(`fit-row-${row}`)).toBeVisible();
    }
    const text = await page.getByTestId("founder-fit").innerText();
    expect(text).not.toMatch(/\b\d{1,3}\s?(%|\/\s?100)/);
    await expect(page.getByRole("heading", { name: /Your advantages/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Gaps to close/i })).toBeVisible();
  });

  test("Market never invents evidence: it starts empty, looks up real sources on request, and links to Proof", async ({
    page,
    context,
  }) => {
    const { seeded } = await founderWithDirections(context);
    await gotoApp(page, `/dashboard/opportunities/${seeded.opportunityIds[0]}/market`);
    await expect(page.getByTestId("market-tab")).toContainText(
      "Market evidence hasn't been collected yet.",
    );
    expect(await gemini.countOf("MARKET_GROUNDED")).toBe(0);

    await page.getByTestId("look-for-sources").click();
    await expect(page.getByRole("link", { name: /Clinic owners discuss follow-ups/ })).toBeVisible({
      timeout: 45_000,
    });
    await expect(page.getByTestId("market-tab")).toContainText("Early signal");
    expect(await gemini.countOf("MARKET_GROUNDED")).toBe(1);

    await page.getByTestId("start-validation").click();
    await expect(page).toHaveURL(/\/dashboard\/proof/);
  });

  test("a direction chosen from its detail page becomes the current direction and can build its roadmap", async ({
    page,
    context,
  }) => {
    const { seeded, user } = await founderWithDirections(context);
    await gotoApp(page, `/dashboard/opportunities/${seeded.opportunityIds[1]}`);
    await page.getByTestId("choose-direction").click();
    await expect(page.getByTestId("build-roadmap")).toBeVisible();
    const rows = await sql<{ active_opportunity_id: string }>(
      "select active_opportunity_id from profiles where id = $1",
      [user.id],
    );
    expect(rows[0].active_opportunity_id).toBe(seeded.opportunityIds[1]);
  });

  test("older consultations' directions are labelled and cannot be chosen silently", async ({
    page,
    context,
  }) => {
    const { user } = await founderWithDirections(context);
    const older = await seedDirections(user.id, { createdAt: "2026-01-05T10:00:00Z" });
    await gotoApp(page, `/dashboard/opportunities/${older.opportunityIds[0]}`);
    await expect(page.getByText("Earlier consultation").first()).toBeVisible();
    await expect(page.getByTestId("choose-direction")).toHaveCount(0);
    await expect(page.getByText(/comes from an earlier consultation/i)).toBeVisible();
  });

  test("a chosen direction with a roadmap offers Open roadmap, not Build roadmap", async ({
    page,
    context,
  }) => {
    const { seeded } = await founderWithDirections(context);
    await chooseAndBuildRoadmap(page);
    await gotoApp(page, "/dashboard/opportunities");
    await page.getByTestId("opp-selected").getByTestId("open-direction").click();
    await expect(page.getByRole("link", { name: "Open roadmap" })).toBeVisible();
    await expect(page.getByTestId("build-roadmap")).toHaveCount(0);
    expect(seeded.opportunityIds.length).toBe(3);
  });
});
