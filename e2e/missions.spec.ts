import { expect, test } from "@playwright/test";

import { founderWithRoadmap } from "./helpers/flows";
import { gotoApp } from "./helpers/page";
import { forbidRealBackends, resetStack, sql } from "./helpers/stack";

test.beforeEach(async ({ page }) => {
  forbidRealBackends(page);
  await resetStack();
});

/** Opens the n-th mission of the current week on its own page. */
async function openMission(page: import("@playwright/test").Page, n: number) {
  await gotoApp(page, "/dashboard/roadmap");
  const card = page.getByTestId("mission-card").nth(n);
  await card.getByRole("link").click();
  await expect(page.getByTestId("mission-page")).toBeVisible();
}

test.describe("mission workspaces (part 4, feature 1)", () => {
  test("a generic mission keeps what you produced in a notes box that saves itself", async ({
    page,
    context,
  }) => {
    const { user } = await founderWithRoadmap(page, context);
    await openMission(page, 0);
    const ws = page.getByTestId("mission-workspace");
    await expect(ws).toHaveAttribute("data-workspace", "generic");
    await page.getByTestId("notes-text").fill("Eight questions, none of them leading.");
    await page.getByTestId("notes-text").blur();
    await expect
      .poll(
        async () =>
          (
            await sql<{ n: string }>(
              "select count(*)::text as n from mission_entries where user_id = $1 and kind = 'note'",
              [user.id],
            )
          )[0].n,
      )
      .toBe("1");
    await page.reload();
    await expect(page.getByTestId("notes-text")).toHaveValue(
      "Eight questions, none of them leading.",
    );
  });

  test("an interview mission: the first message in two languages, behaviour questions only, and a log that treats Yes and No alike", async ({
    page,
    context,
  }) => {
    const { user } = await founderWithRoadmap(page, context);
    await openMission(page, 1);
    await expect(page.getByTestId("mission-workspace")).toHaveAttribute(
      "data-workspace",
      "interviews",
    );
    await expect(page.getByTestId("first-message")).toContainText("Asha from Pune");
    await page.getByRole("button", { name: "हिन्दी" }).click();
    await expect(page.getByTestId("first-message")).toContainText("नमस्ते");
    // The generator's opinion question ("Would you use…") was dropped; behaviour questions stay.
    await expect(page.getByText("Would you use an app")).toHaveCount(0);
    await expect(page.getByText("Tell me about the last time a patient missed")).toBeVisible();

    for (const [person, answer] of [
      ["Dr Rao", "yes"],
      ["Dr Shah", "no"],
    ] as const) {
      await page.getByTestId("int-person").fill(person);
      await page.getByTestId(`int-answer-${answer}`).check({ force: true });
      await page.getByTestId("int-words").fill(`${person} described their week.`);
      await page.getByTestId("int-save").click();
      await expect(page.getByTestId("int-saved")).toHaveText(
        "Saved. A “No” is as useful as a “Yes”.",
      );
    }
    await expect(page.getByTestId("interview-entries").getByRole("listitem")).toHaveCount(2);
    const rows = await sql<{ n: string }>(
      "select count(*)::text as n from mission_entries where user_id = $1 and kind = 'interview'",
      [user.id],
    );
    expect(rows[0].n).toBe("2");
  });

  test("a list with a done rule: Mark as done waits, with the reason, until the list is long enough", async ({
    page,
    context,
  }) => {
    const { user } = await founderWithRoadmap(page, context);
    await sql(
      `update roadmap_tasks set workspace = 'list', workspace_spec = '{"target":2}'::jsonb,
       done_rule = '{"metric":"list.count","min":2}'::jsonb
       where user_id = $1 and order_index = 0`,
      [user.id],
    );
    await openMission(page, 0);
    await expect(page.getByTestId("mission-workspace")).toHaveAttribute("data-workspace", "list");
    await expect(page.getByTestId("mission-complete")).toBeDisabled();
    await expect(page.getByTestId("gate-reason")).toHaveText("Add 2 more to finish (2 in all).");

    const rows = page.getByTestId("list-row");
    await rows.nth(0).getByRole("textbox").first().fill("Sunrise Clinic");
    await rows.nth(0).getByRole("textbox").first().blur();
    await expect(page.getByTestId("list-count")).toContainText("1 of 2 added");
    await expect(page.getByTestId("gate-reason")).toHaveText("Add 1 more to finish (2 in all).");
    await rows.nth(1).getByRole("textbox").first().fill("City Dental");
    await rows.nth(1).getByRole("textbox").first().blur();
    await expect(page.getByTestId("list-count")).toContainText("2 of 2 added");
    await expect(page.getByTestId("mission-complete")).toBeEnabled();
    await expect(page.getByTestId("gate-reason")).toHaveCount(0);
  });
});
