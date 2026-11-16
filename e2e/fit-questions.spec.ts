import { expect, test } from "@playwright/test";

import { gotoApp } from "./helpers/page";
import { STUDENT_ANSWERS, seedDirections } from "./helpers/seed";
import { createUser, forbidRealBackends, resetStack, signIn, sql } from "./helpers/stack";

test.beforeEach(async ({ page }) => {
  forbidRealBackends(page);
  await resetStack();
});

test.describe("ask what is missing (part 4, feature 5)", () => {
  test("empty answers become a few questions on Directions, and the fit recalculates", async ({
    page,
    context,
  }) => {
    const user = await createUser({ fullName: "Asha Verma" });
    await signIn(context, user);
    await seedDirections(user.id, { answers: { ...STUDENT_ANSWERS, skills: [], access: [] } });

    await gotoApp(page, "/dashboard/opportunities");
    await expect(page.getByTestId("fit-nudge")).toBeVisible();
    await page.getByTestId("fit-nudge-open").click();
    const form = page.getByTestId("fit-questions");
    await expect(form).toBeVisible();
    // Exactly the two empty answers: who they can reach, and what they can do.
    await expect(form.locator("fieldset")).toHaveCount(2);
    await expect(page.getByTestId("ask-hours-h5_10")).toHaveCount(0);

    await page.getByTestId("ask-access-customer_network").check({ force: true });
    await form.getByTestId("ask-skill").first().check({ force: true });
    await expect(page.getByTestId("fit-questions-save")).toBeDisabled();
    await page.getByTestId("ask-skill-level").first().selectOption("working");
    await page.getByTestId("fit-questions-save").click();

    await expect(page.getByTestId("fit-questions")).toHaveCount(0);
    await expect(page.getByTestId("fit-nudge")).toHaveCount(0);
    const rows = await sql<{ access: string; skills: string }>(
      `select onboarding_answers->>'access' as access, onboarding_answers->>'skills' as skills
       from business_dna where user_id = $1`,
      [user.id],
    );
    expect(rows[0].access).toContain("customer_network");
    expect(rows[0].skills).toContain('"level": "working"');
  });

  test("answers that do not fit together are named, with a way to correct them", async ({
    page,
    context,
  }) => {
    const user = await createUser({ fullName: "Asha Verma" });
    await signIn(context, user);
    await seedDirections(user.id, { answers: { ...STUDENT_ANSWERS, age: "16" } });

    await gotoApp(page, "/dashboard/opportunities");
    const row = page.getByTestId("profile-contradiction");
    await expect(row).toBeVisible();
    await expect(row).toContainText("Age 16 and");
    await expect(row.getByRole("link")).toHaveAttribute("href", /\/dashboard\/settings/);
  });
});
