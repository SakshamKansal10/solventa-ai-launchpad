import { expect, test } from "@playwright/test";

import { founderWithRoadmap } from "./helpers/flows";
import { gotoApp } from "./helpers/page";
import { forbidRealBackends, resetStack, sql } from "./helpers/stack";

test.beforeEach(async ({ page }) => {
  forbidRealBackends(page);
  await resetStack();
});

test.describe("drop-off numbers (part 4, feature 10)", () => {
  test("private to admins: counts per step and the stuck reasons, from the project's own tables", async ({
    page,
    context,
  }) => {
    const { user } = await founderWithRoadmap(page, context);

    // Not an admin: nothing but "private".
    await gotoApp(page, "/dashboard/admin");
    await expect(page.getByTestId("admin-private")).toContainText("This page is private.");
    await expect(page.getByTestId("admin-page")).toHaveCount(0);

    // The owner marks a profile admin by hand; a founder reported being stuck once.
    await sql("update profiles set is_admin = true where id = $1", [user.id]);
    await sql(
      `insert into mission_stuck_events (user_id, task_id, reason)
       select $1, id, 'time' from roadmap_tasks where user_id = $1 order by order_index limit 1`,
      [user.id],
    );
    await page.reload();
    await expect(page.getByTestId("admin-page")).toBeVisible();
    await expect(page.getByTestId("dropoff-consultation_finished-n")).toHaveText("1");
    await expect(page.getByTestId("dropoff-direction_chosen-n")).toHaveText("1");
    await expect(page.getByTestId("dropoff-roadmap_built-n")).toHaveText("1");
    await expect(page.getByTestId("dropoff-mission1_done-n")).toHaveText("0");
    await expect(page.getByTestId("stuck-time")).toContainText("1");
    await expect(page.getByTestId("stuck-cant")).toContainText("0");
  });
});
