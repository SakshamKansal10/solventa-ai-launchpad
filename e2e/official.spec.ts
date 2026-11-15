import { expect, test } from "@playwright/test";

import { founderWithRoadmap } from "./helpers/flows";
import { gotoApp } from "./helpers/page";
import { STUDENT_ANSWERS, seedDirections } from "./helpers/seed";
import { createUser, forbidRealBackends, resetStack, signIn, sql } from "./helpers/stack";

test.beforeEach(async ({ page }) => {
  forbidRealBackends(page);
  await resetStack();
});

test.describe("Make it official (part 4, feature 7)", () => {
  test("open from the Roadmap; every step visible, not needed yet, and held back until reviewed", async ({
    page,
    context,
  }) => {
    const { user } = await founderWithRoadmap(page, context);
    const row = page.getByTestId("make-official");
    await expect(row).toContainText("Not needed yet");
    await row.click();
    await expect(page).toHaveURL(/\/dashboard\/roadmap\/official/);

    const steps = page.locator("[data-testid^='official-step-']");
    await expect(steps).toHaveCount(4);
    for (const id of ["structure", "udyam", "bank", "gst"]) {
      const step = page.getByTestId(`official-step-${id}`);
      await expect(step).toHaveAttribute("data-needed", "false");
      // Unreviewed content never shows: no rule, no document list, no link — "Being reviewed".
      await expect(step).toHaveAttribute("data-reviewed", "false");
      await expect(step).toContainText("Being reviewed");
      await expect(step.getByRole("link")).toHaveCount(0);
    }
    await expect(page.getByTestId("official-footer")).toHaveText(
      "General guidance, not legal or tax advice. Confirm with a CA before you register.",
    );
    await expect(page.getByTestId("official-minor")).toHaveCount(0);

    // The roadmap reaches its Build phase: the first three steps are needed now, GST later.
    await sql(
      `update roadmap_phases set key = 'build'
       where user_id = $1 and order_index = (select min(order_index) from roadmap_phases where user_id = $1)`,
      [user.id],
    );
    await page.reload();
    await expect(page.getByTestId("official-step-udyam")).toHaveAttribute("data-needed", "true");
    await expect(page.getByTestId("official-step-udyam")).toContainText("Needed now");
    await expect(page.getByTestId("official-step-gst")).toHaveAttribute("data-needed", "false");
  });

  test("a founder under 18 sees the note about doing it with a parent or guardian", async ({
    page,
    context,
  }) => {
    const user = await createUser({ fullName: "Riya Sharma" });
    await signIn(context, user);
    await seedDirections(user.id, {
      answers: { ...STUDENT_ANSWERS, age: "16", status: "school_student", education: "tenth" },
    });
    await gotoApp(page, "/dashboard/roadmap/official");
    await expect(page.getByTestId("official-minor")).toContainText("parent or guardian");
  });
});
