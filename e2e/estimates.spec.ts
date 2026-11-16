import { expect, test } from "@playwright/test";

import { founderWithDirections } from "./helpers/flows";
import { gotoApp } from "./helpers/page";
import { forbidRealBackends, resetStack, sql } from "./helpers/stack";

test.beforeEach(async ({ page }) => {
  forbidRealBackends(page);
  await resetStack();
});

test.describe("estimates and sources (part 4, feature 6)", () => {
  test("no estimate without its tag: the direction's money, the fit's needs and unsourced market claims", async ({
    page,
    context,
  }) => {
    const { user, seeded } = await founderWithDirections(context);
    const id = seeded.opportunityIds[0];

    // The direction's revenue path quotes money: the navy block carries the tag.
    await gotoApp(page, `/dashboard/opportunities/${id}`);
    await expect(page.getByTestId("first-test").getByTestId("estimate-tag")).toContainText(
      "Estimate",
    );
    await expect(page.getByTestId("first-test").getByTestId("estimate-tag")).toContainText(
      "Your first weeks check it.",
    );

    // The fit's money row quotes the direction's estimated starting cost.
    await gotoApp(page, `/dashboard/opportunities/${id}/fit`);
    await expect(page.getByTestId("fit-row-resources").getByTestId("estimate-tag")).toBeVisible();

    // Market: the cited search's claims link to their source with the date it was checked; a
    // claim without a source is an estimate and says so.
    await gotoApp(page, `/dashboard/opportunities/${id}/market`);
    await page.getByTestId("look-for-sources").click();
    const sourced = page.getByTestId("market-claim").filter({ hasText: "Several small clinics" });
    await expect(sourced).toHaveAttribute("data-kind", "sourced", { timeout: 45_000 });
    await expect(sourced.getByRole("link")).toHaveAttribute("href", /example\.com/);
    await expect(sourced.getByTestId("source-date")).toContainText("Checked");
    await expect(sourced.getByTestId("estimate-tag")).toHaveCount(0);

    await sql(
      `insert into opportunity_evidence (opportunity_id, user_id, claim, label)
       values ($1, $2, 'Around 40,000 small clinics could use this.', 'needs_validation')`,
      [id, user.id],
    );
    const kinds = await sql<{ kind: string | null }>(
      "select kind from opportunity_evidence where opportunity_id = $1 and source_url is not null",
      [id],
    );
    expect(kinds.every((k) => k.kind === "sourced")).toBe(true);
    await page.reload();
    const estimate = page.getByTestId("market-claim").filter({ hasText: "Around 40,000" });
    await expect(estimate).toHaveAttribute("data-kind", "estimate");
    await expect(estimate.getByTestId("estimate-tag")).toBeVisible();
    await expect(estimate.getByRole("link")).toHaveCount(0);
    // The longer "how you earn" line quotes prices (₹…): tagged too.
    const earn = page.getByRole("definition").filter({ hasText: /₹\s?\d/ });
    await expect(earn.first()).toBeVisible();
    for (const dd of await earn.all()) await expect(dd.getByTestId("estimate-tag")).toBeVisible();
  });
});
