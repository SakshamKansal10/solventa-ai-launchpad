import { expect, test } from "@playwright/test";
import { gotoApp } from "./helpers/page";

import { chooseAndBuildRoadmap, founderWithDirections } from "./helpers/flows";
import { seedDirections } from "./helpers/seed";
import { forbidRealBackends, gemini, resetStack, sql } from "./helpers/stack";

test.beforeEach(async ({ page }) => {
  forbidRealBackends(page);
  await resetStack();
});

test.describe("Opportunities", () => {
  test("is called Opportunities everywhere and separates the selected direction from alternatives", async ({
    page,
    context,
  }) => {
    await founderWithDirections(context);
    await gotoApp(page, "/dashboard/opportunities");
    await expect(page.getByTestId("page-title")).toHaveText("Opportunities");
    await expect(page.locator("h1")).toContainText("3 directions");
    await expect(
      page.getByTestId("sidebar").getByRole("link", { name: "Opportunities" }),
    ).toBeVisible();
    await expect(page.getByText(/\bIdeas\b/)).toHaveCount(0);

    // Nothing chosen yet: three alternatives.
    await expect(page.getByTestId("opp-alternative")).toHaveCount(3);
    await expect(page.getByTestId("opp-selected")).toHaveCount(0);

    await page
      .getByTestId("opp-alternative")
      .first()
      .getByRole("button", { name: "Choose" })
      .click();
    // Choosing takes the founder to the Command Center, where the next step is.
    await expect(page.getByTestId("command-center")).toHaveAttribute(
      "data-stage",
      "direction_selected",
    );
    await gotoApp(page, "/dashboard/opportunities");
    await expect(page.getByTestId("opp-selected")).toHaveCount(1);
    await expect(page.getByTestId("opp-alternative")).toHaveCount(2);
  });

  test("detail answers five questions: Overview, Customer, Money, First offer and Risks", async ({
    page,
    context,
  }) => {
    const { seeded } = await founderWithDirections(context);
    const detail = `/dashboard/opportunities/${seeded.opportunityIds[0]}`;
    await gotoApp(page, detail);
    await expect(page.getByTestId("opportunity-title")).toBeVisible();
    await expect(page.getByTestId("why-fits")).toBeVisible();
    await expect(page.getByTestId("opportunity-graphic")).toBeVisible();
    const sections = ["overview", "customer", "money", "offer", "risks"];
    for (const key of sections) await expect(page.getByTestId(`tab-${key}`)).toBeVisible();
    await expect(page.getByRole("tab")).toHaveCount(5);

    // Each section opens in place (and is linkable).
    for (const key of sections) {
      await page.getByTestId(`tab-${key}`).click();
      await expect(page.getByTestId(`section-${key}`)).toBeVisible();
      await expect(page.getByTestId(`tab-${key}`)).toHaveAttribute("aria-selected", "true");
    }
    await expect(page.getByTestId("risk-card").first()).toBeVisible();
    // Older links still land on the right section.
    await gotoApp(page, `${detail}?tab=economics`);
    await expect(page.getByTestId("section-money")).toBeVisible();
  });

  test("Founder Fit is qualitative: an overall label, four rows with reasons, each with its reason — no numbers", async ({
    page,
    context,
  }) => {
    const { seeded } = await founderWithDirections(context);
    await gotoApp(page, `/dashboard/opportunities/${seeded.opportunityIds[0]}?tab=fit`);
    await expect(page.getByTestId("founder-fit")).toBeVisible();
    await expect(page.getByTestId("fit-overall")).toHaveText(/^(Strong|Moderate|Conditional) fit$/);
    for (const row of ["capability", "resources", "access", "ambition"]) {
      await expect(page.getByTestId(`fit-row-${row}`)).toBeVisible();
    }
    const text = await page.getByTestId("founder-fit").innerText();
    expect(text).not.toMatch(/\b\d{1,3}\s?(%|\/\s?100)/);
    // Each row opens to the plain reason behind it.
    const row = page.getByTestId("fit-row-capability");
    await row.getByRole("button").first().click();
    await expect(row).toHaveAttribute("data-open", "true");
    // The page's own fit word (top of the page) agrees with the Founder Fit verdict below it.
    await expect(page.getByTestId("opportunity-fit")).toHaveText(
      await page.getByTestId("fit-overall").innerText(),
      { ignoreCase: true },
    );
  });

  test("Market never invents evidence: it starts empty, looks up real sources on request, and links to Proof", async ({
    page,
    context,
  }) => {
    const { seeded } = await founderWithDirections(context);
    await gotoApp(page, `/dashboard/opportunities/${seeded.opportunityIds[0]}?tab=market`);
    await expect(page.getByTestId("market-tab")).toContainText("No market sources yet");
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

  test("a direction chosen from its detail page becomes the current direction, with its roadmap", async ({
    page,
    context,
  }) => {
    const { seeded, user } = await founderWithDirections(context);
    await gotoApp(page, `/dashboard/opportunities/${seeded.opportunityIds[1]}`);
    // "Build my roadmap" chooses it and builds its roadmap in one step.
    await page.getByTestId("choose-direction").click();
    await expect(page.getByTestId("roadmap-page")).toBeVisible({ timeout: 90_000 });
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
    await page.getByTestId("opp-selected").getByRole("link", { name: "Open" }).first().click();
    await expect(page.getByRole("link", { name: "Open my roadmap" })).toBeVisible();
    await expect(page.getByTestId("build-roadmap")).toHaveCount(0);
    expect(seeded.opportunityIds.length).toBe(3);
  });
});
