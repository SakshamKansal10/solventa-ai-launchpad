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
      await expect(page.getByTestId("int-save")).not.toHaveAttribute("aria-busy", "true");
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

test.describe("proof that updates itself (part 4, feature 2)", () => {
  test("logging interviews on the checking mission settles its assumption on Proof, with the live count", async ({
    page,
    context,
  }) => {
    const { user } = await founderWithRoadmap(page, context);
    // The interview mission asks for four conversations.
    await sql(
      `update roadmap_tasks set workspace_spec = workspace_spec || '{"target":4}'::jsonb,
       done_rule = '{"metric":"interviews.count","min":4}'::jsonb
       where user_id = $1 and order_index = 1`,
      [user.id],
    );
    // Proof writes the assumptions (and links the checking mission) on first open.
    await gotoApp(page, "/dashboard/proof");
    await expect(page.getByTestId("assumption-card").first()).toBeVisible({ timeout: 45_000 });
    const card = page
      .getByTestId("assumption-card")
      .filter({ has: page.getByTestId("rule-progress") });
    await expect(card).toHaveCount(1);
    await expect(card.getByTestId("rule-progress")).toContainText("0 of 4 interviews logged");
    await expect(card).toHaveAttribute("data-status", "not_tested");

    await openMission(page, 1);
    for (const [i, person] of ["Dr Rao", "Dr Shah", "Dr Iyer"].entries()) {
      await page.getByTestId("int-person").fill(person);
      await page.getByTestId("int-answer-yes").check({ force: true });
      await page.getByTestId("int-words").fill(`${person}: we lose patients to missed follow-ups.`);
      await page.getByTestId("int-save").click();
      await expect(page.getByTestId("interview-entries").getByRole("listitem")).toHaveCount(i + 1);
    }
    // Three logs saved within minutes: Sol asks, gently, for a detail from each.
    await expect(page.getByTestId("too-neat")).toBeVisible();

    await gotoApp(page, "/dashboard/proof");
    await expect(card.getByTestId("rule-progress")).toContainText(
      "3 of 4 interviews logged · 3 said yes",
    );
    await expect(card).toHaveAttribute("data-status", "supported");
    await expect(page.getByTestId("proof-count")).toContainText("1 / ");
  });
});
