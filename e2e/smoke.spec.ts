import { expect, test } from "@playwright/test";

import { createUser, forbidRealBackends, resetStack, signIn, sql } from "./helpers/stack";

test.beforeEach(async ({ page }) => {
  forbidRealBackends(page);
  await resetStack();
});

test("the harness is wired: a signed-in founder with no consultation sees the welcome state", async ({
  page,
  context,
}) => {
  const user = await createUser({ fullName: "Asha Verma" });
  await signIn(context, user);
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Welcome to Solventia");
  const rows = await sql<{ full_name: string }>("select full_name from profiles where id = $1", [
    user.id,
  ]);
  expect(rows[0]?.full_name).toBe("Asha Verma");
});

test("a signed-out visitor to the dashboard is sent to sign in", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).not.toHaveURL(/\/dashboard$/);
});
